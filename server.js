var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

// https://your-heroku-app-name.herokuapp.com/api-endpoint
app.get('/api-endpoint', function(request, response) {
    
      var jsonContent = { 
            title: "title",
            imageUrl: "https://image.flaticon.com/icons/png/512/61/61456.png",
            contact: [ {id: 12345, name: "King Lai"},{id: 12346, name: "King Lai"}],
            show: true 
        };
    
    response.send(JSON.parse(JSON.stringify(jsonContent)));
});

//https://your-heroku-app-name.herokuapp.com/api-endpoint-parameter?tite=ABCDE
app.get('/api-endpoint-parameter', function(request, response) {
    var titleRequest = request.query.title; // Change .title / .name or any text based on your parameter name
    
      var jsonContent = { 
            title: titleRequest,
            imageUrl: "https://image.flaticon.com/icons/png/512/61/61456.png",
            contact: [ {id: 12345, name: "King Lai"},{id: 12346, name: "King King Lai"}],
            show: true 
        };

    response.send(JSON.parse(JSON.stringify(jsonContent)));
    
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
