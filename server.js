var express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios').default;
const logger = require('pino')();
const fs = require('fs');
const querystring = require('querystring');
const moment = require('moment');
const jwt = require('jsonwebtoken');
var path = require("path");
var jsforce = require("jsforce");


//setup the server
var app = express();
app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

//prepare jwt
const ORG_CONFIG = {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    webservicesPath: process.env.WEBSERVICES_BASE_URL,
    basePath: 'https://test.salesforce.com'
};

var sfdc_access_token;
var sfdc_instance_url;

var privatekey = fs.readFileSync(path.resolve(__dirname, 'key.pem'));
var jwtparams = {
    iss: ORG_CONFIG.consumerKey,
    prn: ORG_CONFIG.username,
    aud: ORG_CONFIG.basePath,
    exp: parseInt(moment().add(2, 'minutes').format('X'))
};
var jwtToken = jwt.sign(jwtparams, privatekey, {
    algorithm: 'RS256'
});

var params = {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwtToken
};

var token_url = new URL('/services/oauth2/token', ORG_CONFIG.basePath).toString();



//CONFIGURE ROUTES


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

    executeQuoteCompletionCallouts(vOrderIds);
});

//CPQ_PROCESSORDER_V2
app.post('/vorder/v2/orders', function (request, response) {
    var jsonContent = {}; //returns empty body
    response.send(JSON.parse(JSON.stringify(jsonContent)));
});




//SERVER LISTENER


app.listen(app.get('port'), function () {
    console.log('attempting to get sfdc access token');
    //get our token
    axios.post(token_url, querystring.stringify(params))
        .then(function (res) {

            sfdc_access_token = res.data.access_token;
            sfdc_instance_url = res.data.instance_url;
            console.log('Express server listening on port ' + app.get('port'));
            console.log(' sfdc access token ' + sfdc_access_token);

        }).catch(function (error) {
            console.log(error.toJSON());
        });;


});


//API IMPLEMENTATIONS


async function executeQuoteCompletionCallouts(vOrderIds) {

    if (sfdc_access_token) {

        for (key in vOrderIds) {
            //TODO, incrementing accountnumbers... use simple mongodb table or query the org..
            var requestBody = {
                "ShadowQuoteId": vOrderIds[key],
                "HDAPAccountId": "900001"
            };
            var uri = '/VonShadowQuoteServices/';
            var conn = new jsforce.Connection({
                instanceUrl: sfdc_instance_url,
                accessToken: sfdc_access_token
            });

            conn.apex.post(uri, requestBody, function (err, res) {
                if (err) {
                    return console.error(err);
                }
                console.log('VonShadowQuoteServices, ' + vOrderIds[key] + ' : set hdapid response: ', res);
            });

            //pause
            await sleep(1000);
            //then
            //make the new Zuora Account Id call to sfdc
            //TODO, incrementing zuoraccountids?... use guid generator?
            requestBody = {
                "ShadowQuoteId": vOrderIds[key],
                "ZuoraAccountId": "8ad084a67ebdc958017ec48a491c71a7"
            };
            conn.apex.post(uri, requestBody, function (err, res) {
                if (err) {
                    return console.error(err);
                }
                console.log('VonShadowQuoteServices, ' + vOrderIds[key] + ' : set zAccountId response: ', res);;
            });

            //pause,
            await sleep(1000);
            //then
            //make the updateSQStatus call to sfdc
            requestBody = {
                "ShadowQuoteId": vOrderIds[key],
                "Status": "Complete"
            };
            conn.apex.post(uri, requestBody, function (err, res) {
                if (err) {
                    return console.error(err);
                }
                console.log('VonShadowQuoteServices, ' + vOrderIds[key] + ' : set status complete response: ', res);;
            });

            //pause
            await sleep(1000);
            //then repeat
        }



    } else {
        console.log('process order completion calls - we dont have sfdc accessToken');
    }

}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }