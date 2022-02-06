var express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios').default;
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
    console.log('Express server listening on port ' + app.get('port'));
});

async function executeCompletionCallouts(vOrderIds) {

    //authenticate if needed
    authenticateToSFDC();
    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic "+accessToken
      };
    var uri = ORG_CONFIG.webservicesPath + '/VonShadowQuoteServices';
    var requestBody = {"ShadowQuoteId":vOrderIds[0],"HDAPAccountId":"900001"};
   
    //make the new HDAP Account Id call to sfdc
    // request.post(uri, function (error, response, body) {
    //     if (!error && response.statusCode == 200) {
    //         logger.info(body) // Print the google web page.
    //     }
    // })

    //pause, then
    //make the new Zuora Account Id call to sfdc

    //pause, then
    //make the updateSQStatus call to sfdc
}


// OAuth1.0 - 3-legged server side flow
function authenticateToSFDC() {

    logger.info('got path config? => ' + ORG_CONFIG.webservicesPath);
    logger.info('got key config? => ' + ORG_CONFIG.consumerKey);

    if (!accessToken) {
        // step 1
        // const qs = require('querystring'),
        //     oauth = {
        //         callback: 'https://vservices-mock-1.herokuapp.com',
        //         username: ORG_CONFIG.username,
        //         password: ORG_CONFIG.password,
        //         grant_type: 'password',
        //         client_id: ORG_CONFIG.consumerKey,
        //         client_secret: ORG_CONFIG.consumerSecret
        //     },
        //     url = 'https://test.salesforce.com/services/oauth2/token';

        // request.post({
        //     url: url,
        //     oauth: oauth
        // }, function (e, r, body) {
        //     // Ideally, you would take the body in the response
        //     // and construct a URL that a user clicks on (like a sign in button).
        //     // The verifier is only available in the response after a user has
        //     // verified with twitter that they are authorizing your app.

        //     // step 2
        //     const req_data = qs.parse(body)
        //     //const uri = 'https://api.twitter.com/oauth/authenticate' +
        //     //    '?' + qs.stringify({
        //     accessToken = req_data.access_token
        //     logger.info('got access token => '+accessToken)
        //     //    })
        //     // redirect the user to the authorize uri

        //     // step 3
        //     // after the user is redirected back to your server
        //     // const auth_data = qs.parse(body),
        //     //     oauth = {
        //     //         consumer_key: CONSUMER_KEY,
        //     //         consumer_secret: CONSUMER_SECRET,
        //     //         token: auth_data.oauth_token,
        //     //         token_secret: req_data.oauth_token_secret,
        //     //         verifier: auth_data.oauth_verifier
        //     //     },
        //     //     url = 'https://api.twitter.com/oauth/access_token';
        //     // request.post({
        //     //     url: url,
        //     //     oauth: oauth
        //     // }, function (e, r, body) {
        //     //     // ready to make signed requests on behalf of the user
        //     //     const perm_data = qs.parse(body),
        //     //         oauth = {
        //     //             consumer_key: CONSUMER_KEY,
        //     //             consumer_secret: CONSUMER_SECRET,
        //     //             token: perm_data.oauth_token,
        //     //             token_secret: perm_data.oauth_token_secret
        //     //         },
        //     //         url = 'https://api.twitter.com/1.1/users/show.json',
        //     //         qs = {
        //     //             screen_name: perm_data.screen_name,
        //     //             user_id: perm_data.user_id
        //     //         };
        //     //     request.get({
        //     //         url: url,
        //     //         oauth: oauth,
        //     //         qs: qs,
        //     //         json: true
        //     //     }, function (e, r, user) {
        //     //         console.log(user)
        //     //     })
        //     // })
        // })
    }


}