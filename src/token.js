var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tokenSchema = new Schema({
    username: {type: String, unique: true},
    token: {type: String, unique: true},
    expiry: Date
});

module.exports = mongoose.model("Token", tokenSchema);