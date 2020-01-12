var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var greenscore = new Schema({
    method: {type: String, unique: true},
    duration: String,
    distance: String,
    
});

module.exports = mongoose.model("User", userSchema);