var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var greenscoreSchema = new Schema({
    username: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    score: Number,
    createdAt: { type: Date, default: Date.now },
    additionalData: {type: Map, of: String}
});

module.exports = mongoose.model("GreenScore", greenscoreSchema);

var GreenScore = require('./greenscor');

app.post('/api/greenscore', function (req, res) {
    var greenscore = new GreenScore(req.body);
    var result = await greenscore.save();
    response.send(result);

    User.findOne({username: req.body.username}, function(err, user){            
        if(user){
            user.score += req.body.score
            user.save(function(err) {
                // if (err) // do something
            });
        }else{
            console.log(err);
        }
    });
})
  
app.get()