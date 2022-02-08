var express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios').default;
const fs = require('fs');
const querystring = require('querystring');
const moment = require('moment');
const jwt = require('jsonwebtoken');
var path = require("path");
var jsforce = require("jsforce");
const uuidv4 = require('uuid');


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

//var privatekey = fs.readFileSync(path.resolve(__dirname, 'key.pem'));
var privatekey = process.env.PRIVATE_KEY;
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



//INTERFACE


//CPQ_PROCESSORDER
app.post('/vorder/v1/orders', function (request, response) {
    console.log('/vorder/v1/orders called');
    console.log(request.body);
    doCPQProcessOrder(true, request, response);
});

//CPQ_PROCESSORDER_V2_NEW
app.post('/vorder/v2/orders', function (request, response) {
    console.log('/vorder/v2/orders called');
    console.log(request.body);
    doCPQProcessOrder(true, request, response);
});

//CPQ_AAT_PROCESSORDER
app.post('/vorder/{hdapAccountId}/v1/orders', function (request, response) {
    console.log('CPQ_AAT_PROCESSORDER - /vorder/{hdapAccountId}/v1/orders called');
    console.log(request.body);
    doCPQProcessOrder(false, request, response);
});

//CPQ_PROCESSORDER_V2_EXISTING
app.post('/vorder/account/{vAccountId}/v2/orders', function (request, response) {
    console.log('//CPQ_PROCESSORDER_V2_EXISTING - /vorder/account/{vAccountId}/v2/orders called');
    console.log(request.body);
    doCPQProcessOrder(false, request, response);
});


//LISTENER


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
        });
});


//IMPLEMENTATIONS

function doCPQProcessOrder(isNewLogo, request, response) {
    var resBody = {};
    if (request.body) {
        var orderData = request.body;
        orderData.sort(function(x, y) {
            // true values first
            return (x.account.primaryLocation === y.account.primaryLocation)? 0 : x.account.primaryLocation? -1 : 1;
        });
        console.log('first order record, is primary location? : '+orderData[0].account.primaryLocation);
        
        var resMessage = 'mock process order response, working these vOrderIds : \n';
        for (key in orderData) {
            resMessage = resMessage + orderData[key].vOrderId + '\n';
        }
        resBody = {
            message: resMessage
        };
        response.send(JSON.parse(JSON.stringify(resBody)));
    } else {
        response.status(400).send('Bad Request');
    }

    executeQuoteCompletionCallouts(isNewLogo, orderData);
}

async function executeQuoteCompletionCallouts(isNewLogo, orderData) {
    if (sfdc_access_token) {
        var conn = new jsforce.Connection({
            instanceUrl: sfdc_instance_url,
            accessToken: sfdc_access_token
        });


        if (isNewLogo) {
            //get accountNumber watermark
            var accountNumber = 900000;
            conn.query("SELECT count(Id) FROM Account", function (err, result) {
                if (err) {
                    return console.error(err);
                }
                console.log(result);
                if(result.records[0].expr0){
                    accountNumber = accountNumber + result.records[0].expr0;
                }
                console.log("fetched our account number watermark? : " + accountNumber);

                for (key in orderData) {

                    accountNumber = accountNumber + 1; //next accountNumber
                    console.log('iterating orderData, for '+orderData[key].account.accountName+' we\'ll create this new accountnumber : ' + accountNumber);
                    console.log('this account is primary? : '+orderData[key].account.primaryLocation);

                    var requestBody = {
                        "ShadowQuoteId": orderData[key].vOrderId,
                        "HDAPAccountId": accountNumber
                    };
                    var uri = '/VonShadowQuoteServices/';
                    //send account number to sfdc
                    conn.apex.post(uri, requestBody, function (err, res) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log('VonShadowQuoteServices has responded, ' + orderData[key].account.accountName + ' : set HDAP account Number to '+accountNumber+': ', res);

                        //then
                        //make the new Zuora Account Id call to sfdc
                        /*** ALTHOUGH SFDC DOES ABSOLUTELY NOTHING WITH IT! JUST RETURNS A 200 OK LOL */
                        var zuoraId = uuidv4();
                        requestBody = {
                            "ShadowQuoteId": orderData[key].vOrderId,
                            "ZuoraAccountId": zuoraId
                        };
                        conn.apex.post(uri, requestBody, function (err, res) {
                            if (err) {
                                return console.error(err);
                            }
                            console.log('VonShadowQuoteServices has responded, ' + orderData[key].account.accountName + ' : set Zuora account Number to '+zuoraId+': ', res);
                        }.bind(this));
                    }.bind(this));

                    sleep(2000).then(); //2 secs between location calls
                }
            });
        }

        //delay 10s for final complete calls
        sleep(10000);
        //make the updateSQStatus calls to sfdc
        for (key in orderData) {
            requestBody = {
                "ShadowQuoteId": orderData[key].vOrderId,
                "Status": "Complete"
            };
            uri = '/VonUpdateSQStatus/';
            conn.apex.post(uri, requestBody, function (err, res) {
                if (err) {
                    return console.error(err);
                }
                console.log('/VonUpdateSQStatus/ has responded, ' + orderData[key].account.accountName + ' location marked complete: ', res);
            });

            //send 1 call per 2 seconds
            sleep(2000);
        }

    } else {
        console.log('process order completion calls - we dont have sfdc accessToken');
    }

}

async function sleep(ms) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}