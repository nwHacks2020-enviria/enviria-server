var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: {type: String, index: true, unique: true},
    email : String,
    password: String,
    total_greenscore: {type: Number, default: 0}
});

module.exports = mongoose.model("User", userSchema);