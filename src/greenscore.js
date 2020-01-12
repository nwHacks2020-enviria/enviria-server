var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// vehicleFuelEconomy = {
//     "Nissan Sentra": 7.35,
//     "Jeep Cheroke": 9.41,
//     "Nissan Ultima": 7.59,
//     "Jeep Wrangler": 13.07,
//     "GMC Sierra": 13.84,
//     "Toyota Highlander": 11.76,
//     "Ford Escape": 9.41,
//     "Jeep Grand Cheroke": 15.68,
//     "Toyota Tacoma": 13.84,
//     "Honda Accord": 9.80,
//     "Toyota Corolla": 7.84,
//     "Honda Civic": 7.35,
//     "Toyota Camry": 9.41,
//     "Chevy Equinox": 10.23,
//     "Nissan Rogue": 8.71,
//     "Honda CR-V": 8.40,
//     "Toyota RAV4": 9.41,
//     "Chevorlet Silverado": 13.07,
//     "Dodge Ram": 12.38,
//     "Ford F150": 11.76
// }

var greenscoreSchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: String,
    score: Number,
    current_score: Number,
    createdAt: { type: Date, default: Date.now },
    additionalData: {type: Map, of: String}
});

module.exports = mongoose.model("GreenScore", greenscoreSchema);

// var GreenScore = require('./greenscore');

// app.post('/api/greenscore', function (req, res) {
//     var greenscore = new GreenScore(req.body);
//     var result = await greenscore.save();
//     response.send(result);

//     User.findOne({username: req.body.username}, function(err, user){            
//         if(user){
//             user.score += req.body.score
//             user.save(function(err) {
//                 // if (err) // do something
//             });
//         }else{
//             console.log(err);
//         }
//     });
// })