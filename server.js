var express = require('express');
var bodyParser = require('body-parser');
var app = express();
import got from 'got'; //use got for callouts
var logger = require('pino');

logger.info('this is a test of logging...');


app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

const ENDPOINT_BASE_URL = 'https://vonage--turkey.my.salesforce.com/services/apexrest';


//CPQ_PROCESSORDER
app.post('/vorder/v1/orders', function (request, response) {
    logger.info('/vorder/v1/orders called');
    logger.info('request body: '+request.body);
    /***
     * example request
     * 
     * [{"vOrderId":"a127b0df-4a83-4efc-aeae-3d540998be4e","vonageMRR":"57.97","salesContact":{"emailAddress":"q2cprodmail@gmail.com"},"paymentTerms":"Due on receipt","paymentMethodType":"CreditCard","paymentMethodId":"8ad098317e33d259017e44f019270255","orderType":"add-location","orderCorrelationId":"aDY02000000LP7EGAW","configuration":null,"callbackUrl":"Vbc_Process_Order_Complete__e","billingLocation":{"contact":{"phoneNumber":"7324444728","lastName":"Testposlt1","firstName":"Testposlt1","emailAddress":"sfdcvon@gmail.com"},"address":{"province":"CA","postalCode":"95695","jurisdictionCode":"424100","countryCode":"US","city":"WOODLAND","addressLine2":null,"addressLine1":"23 W MAIN ST"}},"apiSource":"SFDC","account":{"vParentAccountId":null,"vAccountId":null,"users":[{"thirdPartyIdentity":{"username":null,"providerIdentityId":null,"provider":null},"role":"ACCOUNT_SUPER_USER","receiveAlerts":null,"phoneNumber":null,"mobileNumber":null,"loginName":"Testposlt1","lastName":"Testposlt1","homeNumber":null,"firstName":"Testposlt1","faxNumber":null,"emailAddress":"sfdcvon@gmail.com","allowSetCallerId":null,"allowLogin":null}],"trial":null,"timezone":null,"status":"Pending","primaryLocation":false,"poNumber":"poslt1","parentAccountType":"Direct","parentAccountName":"VBS","leadId":null,"isTrial":null,"demoAccount":false,"crmAccountId":"0010200000EroCKAAZ","createDate":"2022-01-10","contract":{"startDate":"2022-01-24","endDate":"2023-01-23","contractTerm":12},"activationDate":"2022-01-24","accountType":"End-Customer","accountName":"testposlt1:Woodland"}}]
     */
    var resBody = {};
    // if(request.body){
    //     var orderData = JSON.parse(request.body);
 
    //     var vOrderIds = [];
    //     for( key in orderData){
    //         vOrderIds.push(orderData[key].vOrderId);
    //     }
    //     resBody = {
    //         message: 'mock process order response, for orderCorrelationId: '+orderCorrelationId+' extracted these vOrderIds : '+vOrderIds
    //     };
    //     response.send(JSON.parse(JSON.stringify(resBody)));
    // }else{
        resBody = {
            message: 'mock process order response'
        };
        response.send(JSON.parse(JSON.stringify(resBody)));
    // }

    //executeCompletionCallouts( vOrderIds );
});

//CPQ_PROCESSORDER_V2
app.post('/vorder/v2/orders', function (request, response) {
    var jsonContent = {}; //returns empty body
    response.send(JSON.parse(JSON.stringify(jsonContent)));
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

async function executeCompletionCallouts(  vOrderIds ) {

    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic NGEwMGZmMjItY2NkNy0xMWUzLTk5ZDUtMDAwYzI5NDBlNjJj"
      };
    var body = {"ShadowQuoteId":vOrderIds[0],"HDAPAccountId":"900001"};
    var calloutOptions = {
        url: ENDPOINT_BASE_URL + '/VonShadowQuoteServices',
        headers: headers
    }
    //make the new HDAP Account Id call to sfdc
    const {
        callResponseBody,
        statusCode
    } = await got( calloutOptions );
    if (statusCode !== 200 || callResponseBody.error) {
        throw new Error(callResponseBody.error || 'error calling sfdc with new hdap account id');
    }

    //pause, then
    //make the new Zuora Account Id call to sfdc

    //pause, then
    //make the updateSQStatus call to sfdc
}