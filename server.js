var express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios').default;
const FormData = require('form-data');
const logger = require('pino')()

var app = express();
app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

const ORG_CONFIG = {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    webservicesPath: process.env.WEBSERVICES_BASE_URL
};
var accessToken;
var lastGrantDateTime;




//CPQ_PROCESSORDER
app.post('/vorder/v1/orders', function (request, response) {
    logger.info('/vorder/v1/orders called');
    logger.info(request.body);
    /***
     * example request
     * 
     * [{"vOrderId":"a127b0df-4a83-4efc-aeae-3d540998be4e","vonageMRR":"57.97","salesContact":{"emailAddress":"q2cprodmail@gmail.com"},"paymentTerms":"Due on receipt","paymentMethodType":"CreditCard","paymentMethodId":"8ad098317e33d259017e44f019270255","orderType":"add-location","orderCorrelationId":"aDY02000000LP7EGAW","configuration":null,"callbackUrl":"Vbc_Process_Order_Complete__e","billingLocation":{"contact":{"phoneNumber":"7324444728","lastName":"Testposlt1","firstName":"Testposlt1","emailAddress":"sfdcvon@gmail.com"},"address":{"province":"CA","postalCode":"95695","jurisdictionCode":"424100","countryCode":"US","city":"WOODLAND","addressLine2":null,"addressLine1":"23 W MAIN ST"}},"apiSource":"SFDC","account":{"vParentAccountId":null,"vAccountId":null,"users":[{"thirdPartyIdentity":{"username":null,"providerIdentityId":null,"provider":null},"role":"ACCOUNT_SUPER_USER","receiveAlerts":null,"phoneNumber":null,"mobileNumber":null,"loginName":"Testposlt1","lastName":"Testposlt1","homeNumber":null,"firstName":"Testposlt1","faxNumber":null,"emailAddress":"sfdcvon@gmail.com","allowSetCallerId":null,"allowLogin":null}],"trial":null,"timezone":null,"status":"Pending","primaryLocation":false,"poNumber":"poslt1","parentAccountType":"Direct","parentAccountName":"VBS","leadId":null,"isTrial":null,"demoAccount":false,"crmAccountId":"0010200000EroCKAAZ","createDate":"2022-01-10","contract":{"startDate":"2022-01-24","endDate":"2023-01-23","contractTerm":12},"activationDate":"2022-01-24","accountType":"End-Customer","accountName":"testposlt1:Woodland"}}]
     */
    var resBody = {};
    if (request.body) {
        var orderData = request.body;

        var vOrderIds = [];
        for (key in orderData) {
            vOrderIds.push(orderData[key].vOrderId);
        }
        resBody = {
            message: 'mock process order response, extracted these vOrderIds : ' + vOrderIds
        };
        response.send(JSON.parse(JSON.stringify(resBody)));
    } else {
        resBody = {
            message: 'mock process order response'
        };
        response.send(JSON.parse(JSON.stringify(resBody)));
    }

    executeCompletionCallouts(vOrderIds);
});

//CPQ_PROCESSORDER_V2
app.post('/vorder/v2/orders', function (request, response) {
    var jsonContent = {}; //returns empty body
    response.send(JSON.parse(JSON.stringify(jsonContent)));
});

app.listen(app.get('port'), function () {
    console.log('attempting to get sfdc access token');
    //get token
    //TODO - get this every 24hrs while app is running?
    authenticateToSFDC();
    
});

async function executeCompletionCallouts(vOrderIds) {

    
    if(accessToken){
        var uri = ORG_CONFIG.webservicesPath + '/VonShadowQuoteServices';
        var requestBody = {"ShadowQuoteId":vOrderIds[0],"HDAPAccountId":"900001"};
       
        axios({
            headers: {
                'Content-Type': "application/json; charset=utf-8",
                'Authorization': "Basic "+accessToken
            },
            method: 'post',
            url: uri,
            data: requestBody
          }).then(function (response) {
                logger.info(response);
                logger.info('sfdc VonShadowQuoteServices returned response');
              })
              .catch(function (error) {
                logger.info(error);
                logger.info('sfdc VonShadowQuoteServices returned error');
              });
    
        //pause, then
        //make the new Zuora Account Id call to sfdc
    
        //pause, then
        //make the updateSQStatus call to sfdc
    }else{
        console.log(' we dont have sfdc accessToken');
    }
    
}



async function authenticateToSFDC() {

    logger.info('got path config? => ' + ORG_CONFIG.webservicesPath);
    logger.info('got key config? => ' + ORG_CONFIG.consumerKey);
//TODO set and check datetime of last grant - session is max 2hours
    if (!accessToken) {
    
        var uri = 'https://test.salesforce.com/services/oauth2/token';

        const formData = new FormData();

        formData.append('callback', 'https://vservices-mock-1.herokuapp.com');
        formData.append('username', ORG_CONFIG.username);
        formData.append('password', ORG_CONFIG.password);
        formData.append('grant_type', 'password');
        formData.append('client_id', ORG_CONFIG.consumerKey);
        formData.append('client_secret', ORG_CONFIG.consumerSecret);

    const contentLength = await formData.getLength();
   
    await axios({
        headers: {
            ...formData.getHeaders(),
            'content-length': contentLength
        },
        method: 'post',
        url: uri,
        data: formData
      }).then(function (response) {
            logger.info(response);
            accessToken = JSON.parse(response).access_token;
            logger.info('got access token => '+accessToken);
            console.log('Express server listening on port ' + app.get('port'));
          })
          .catch(function (error) {
            logger.info(error);
            throw new Error(error);
          });
    }
}