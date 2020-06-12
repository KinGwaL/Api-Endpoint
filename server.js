var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/api-endpoint', function(request, response) {
    var name = request.query.name;
    
      var options = { 
            title: 'Title',
            imageUrl: 'https://api.sendgrid.com/v3/marketing/contacts',
            Contact: [ {id: 12345, name: 'King Lai'},{id: 12346, name: 'King King Lai'}],
            show: true 
        };
    
    response.send(JSON.stringify(options));
    
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
