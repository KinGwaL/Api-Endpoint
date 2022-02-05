var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());


//CPQ_PROCESSORDER
app.post('/vorder/v1/orders', function(request, response) {
    var jsonContent = {}; //returns empty body
    response.send(JSON.parse(JSON.stringify(jsonContent))); 
});

//CPQ_PROCESSORDER_V2
app.post('/vorder/v2/orders', function(request, response) {
    var jsonContent = {}; //returns empty body
    response.send(JSON.parse(JSON.stringify(jsonContent))); 
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
