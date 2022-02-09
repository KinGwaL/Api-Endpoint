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
        orderData.sort(function (x, y) {
            // true values first
            return (x.account.primaryLocation === y.account.primaryLocation) ? 0 : x.account.primaryLocation ? -1 : 1;
        });
        console.log('first order record, is primary location? : ' + orderData[0].account.primaryLocation);

        var resMessage = 'mock process order response, working these vOrderIds : ';
        for (key in orderData) {
            resMessage = resMessage + orderData[key].vOrderId + '  --  ';
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
            var accountNumber = await getAccountNumber(conn).catch(function (error) {
                throw new Error('Get account number watermark failed: ' + error);
            });
            console.log("account number watermark : " + accountNumber);

            for (key in orderData) {
                console.log('new account iteration starting, any wait has finished');
                accountNumber = accountNumber + 1; //next accountNumber
                console.log('for ' + orderData[key].account.accountName + ' we\'ll create this new accountnumber : ' + accountNumber);
                console.log('this account is primary? : ' + orderData[key].account.primaryLocation);

                await makeHDAPIdCallout(conn, orderData[key], accountNumber).then(function (result) {
                    console.log('VonShadowQuoteServices has responded : ', result);
                }).catch(function (error) {
                    console.log('VonShadowQuoteServices has responded : ', error);
                });


                //then
                //make the new Zuora Account Id call to sfdc
                /*** ALTHOUGH SFDC DOES ABSOLUTELY NOTHING WITH IT! JUST RETURNS A 200 OK LOL */
                var zuoraId = uuidv4();
                console.log('for ' + orderData[key].account.accountName + ' we\'ll create this new zuora account Id : ' + zuoraId);
                await makeZIdCallout(conn, orderData[key], zuoraId).then(function (result) {
                    console.log('VonShadowQuoteServices has responded : ', result);
                }).catch(function (error) {
                    console.log('VonShadowQuoteServices has responded : ', error);
                });
                var billingAccount = await insertSFDCBillingAccount(conn, orderData[key], zuoraId).catch(function (error) {
                    console.log('insert zBilling Account fake 360 result : ', error);
                });
                
                if(billingAccount == undefined){
                    console.log('insert zBilling Account fake 360 result : FAILED');
                }else{
                    console.log('insert zBilling Account fake 360 result : ', billingAccount.Id);
                    await insertSFDCDefaultPM(conn, orderData[key], zuoraId, billingAccount.Id).then(function (result) {
                        console.log('inserted default payment method record : ', result);
                    }).catch(function (error) {
                        console.log('failed to insert default payment method record : ', error);
                    });
                }
                

                console.log('new account iteration ending, will wait 5s');
                await sleep(2000); //2 secs between location calls
                console.log('new account iteration ending, wait finished');
            }
        }

        //make the updateSQStatus calls to sfdc
        for (key in orderData) {
            requestBody = {
                "ShadowQuoteId": orderData[key].vOrderId,
                "Status": "Complete"
            };
            uri = '/VonUpdateSQStatus/';
            conn.apex.post(uri, requestBody, function (err, res) {
                if (err) {
                    console.error('/VonUpdateSQStatus/ has responded, ' + orderData[key].account.accountName + ' location complete FAILED: ', err);
                }
                console.log('/VonUpdateSQStatus/ has responded, ' + orderData[key].account.accountName + ' location marked complete: ', res);
            });

            //send 1 call per 20 seconds
            await sleep(20000);
        }

    } else {
        console.log('process order completion calls - we dont have sfdc accessToken');
    }
}

function getAccountNumber(conn) {
    console.log('get account number watermark is called');
    var accountNumber = 900000;
    return new Promise((resolve, reject) => {
        conn.query("SELECT count(Id) FROM Account", function (err, result) {
            if (err) {
                reject(accountNumber);
            }
            if (result.records[0].expr0) {
                accountNumber = accountNumber + result.records[0].expr0;
            }
            resolve(accountNumber);
        });
    });
}

function makeHDAPIdCallout(conn, order, accountNumber) {
    var requestBody = {
        "ShadowQuoteId": order.vOrderId,
        "HDAPAccountId": accountNumber
    };
    var uri = '/VonShadowQuoteServices/';
    //send account number to sfdc
    return new Promise((resolve, reject) => {
        conn.apex.post(uri, requestBody, function (err, res) {
            if (err) {
                reject(err);
            }
            resolve(res);
        });
    });
}

function makeZIdCallout(conn, order, zuoraId) {
    var requestBody = {
        "ShadowQuoteId": order.vOrderId,
        "ZuoraAccountId": zuoraId
    };
    var uri = '/VonShadowQuoteServices/';
    return new Promise((resolve, reject) => {
        conn.apex.post(uri, requestBody, function (err, res) {
            if (err) {
                reject(err);
            }
            resolve(res);
        });
    });
}

function insertSFDCBillingAccount(conn, order, zuoraId) {

    console.log('insertSFDCBillingAccount is called for zId: ' + zuoraId);
    const newBillingAccount = {
        Name: order.account.accountName,
        Zuora__Zuora_Id__c: zuoraId,
        Zuora__Account__c: order.account.crmAccountId
    };
    return new Promise((resolve, reject) => {
        conn.sobject("Zuora__CustomerAccount__c").create(newBillingAccount, function (err, ret) {
            if (err || !ret.success) {
                reject(err);
            }
            resolve(ret);
        });
    });
}

function insertSFDCDefaultPM(conn, order, zuoraId, billingAccountId) {

    console.log('insertSFDCDefaultPM is called for account: ' + order.account.accountName);
    var newPM = {
        Name: zuoraId,
        Zuora__BillingAccount__c: billingAccountId,
        Zuora__DefaultPaymentMethod__c: true,
        Zuora__UseDefaultRetryRule__c: true,
        Zuora__PaymentMethodStatus__c: 'Active',
        Zuora__Email__c: order.salesContact.emailAddress,
    };
    if (order.paymentMethodType === 'CreditCard') {
        newPM["Zuora__Type__c"] = 'CreditCard';
        newPM["Zuora__CreditCardType__c"] = 'Visa';
        newPM["Zuora__CreditCardCountry__c"] = order.billingLocation.address.countryCode;
        newPM["Zuora__CreditCardState__c"] = order.billingLocation.address.province;
        newPM["Zuora__LastTransactionStatus__c"] = 'Approved';
        newPM["Zuora__CreditCardHolderName__c"] = order.billingLocation.contact.firstName+' '+order.billingLocation.contact.lastName;
        newPM["Zuora__BankIdentificationNumber__c"] = 444444;
        newPM["Zuora__CreditCardExpirationMonth__c"] = 4;
        newPM["Zuora__CreditCardAddress1__c"] = order.billingLocation.address.addressLine1;
        newPM["Zuora__CreditCardExpirationYear__c"] = 2024;
        newPM["Zuora__CreditCardPostalCode__c"] = order.billingLocation.address.postalCode;
        newPM["Zuora__CreditCardMaskNumber__c"] = '************4448';
        newPM["Zuora__CreditCardCity__c"] = order.billingLocation.address.city;
    } else if(order.paymentMethodType === 'Check') {
        newPM["Zuora__Type__c"] = 'Check';
    }
    return new Promise((resolve, reject) => {
        conn.sobject("	Zuora__PaymentMethod__c").create(newPM, function (err, ret) {
            if (err || !ret.success) {
                reject(err, ret);
            }
            resolve(ret.id);
        });
    });
}



function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}