var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/insert', function(req, res) {
    pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
        // watch for any connect issues
        if (err) console.log(err);
        conn.query(
            'INSERT INTO salesforce.Ruby_Survey__c (Full_Name__c, Position__c, Rating__c, Learnt_1__c, Learnt_2__c, Learnt_3__c, Suggestion_1__c, Suggestion_2__c, Suggestion_3__c) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [req.body.name.trim(), req.body.position.trim(), req.body.rating.trim(), req.body.learnt1.trim(), req.body.learnt2.trim(), req.body.learnt3.trim(), req.body.suggest1.trim(), req.body.suggest2.trim(), req.body.suggest3.trim()],
            function(err, result) {
                done();
                if (err) {
                    res.status(400).json({error: err.message});
                }
                else {
                    res.json(result);
                }
            }
        );
    });
});

app.get('/all-servey', function(req, res) {
    
    pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
        if (err) console.log(err);
        conn.query(
            'SELECT * FROM salesforce.Ruby_Survey__c ORDER BY CreatedDate DESC',
            function(err, result) {
                done();
                if (err) {
                    res.status(400).json({error: err.message});
                }
                else {
                    //res.json(result);
                    res.send(res.json(result));
                }
            }
        );
    });
    
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
