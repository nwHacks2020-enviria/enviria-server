const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const bcrypt = require('bcryptjs');
const moment = require('moment')
const crypto = require('crypto')

var User = require('./user');
var Token = require('./token')

const app = express();

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/enviriadb', {useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database Connection Established.');
});

app.use(helmet())

app.use(bodyParser.json())

app.use(cors())

app.use(morgan('combined'))

const addAuthToken = async (username, token) => {
    var newToken = new Token({username, token, expiry: moment.utc().add(1, "M").toDate() });
    var result = await newToken.save();
    console.log('Token added: ', result)
    console.log('Token value: ', newToken.token)
}

// app.get('/', (req, res) => {
//     res.send('Hello')
// })

app.post("/authenticate", async (req, res) => {
    console.log("authenticating...");
    if (req.body.password == undefined) {
        res.send({ code: 301, message: "Please send password in body" })
    }
    await User.findOne({username: req.body.username}, async function(err, user){
        if (user) {
            let hashed_password = user.password
            try {
                result = await bcrypt.compare(req.body.password, hashed_password)
                if (result) {
                    console.log("authenticated!");
                    let newAuthToken = crypto.randomBytes(64).toString('hex');
                    addAuthToken(req.body.username, newAuthToken);
                    res.send({
                        token: newAuthToken
                    })
                } else {
                    console.log("authentication failed.");
                    res.send({ code: 301, message: "Not Authorized" });
                }
            } catch (error) {
                console.log(error)
            }
        }
    })
});

app.post('/register', async (req, res) => {
    try {
        req.body.password = bcrypt.hashSync(req.body.password, 10);
        var user = new User(req.body);
        var result = await user.save();
        res.send(result);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.use(function(req, res, next){
    console.log("Secure resource " + Date.now());

    if (req.body.token == undefined) {
        res.send({
            code: 301,
            message: "Token not detected"
        })
        return
    }
    Token.findOne({token: req.body.token}, async function(err, token){
        if (!token){
            res.send({
                code: 301,
                message: "Token not detected"
            })
        } else {
            next()
        }
    })
 })

app.post('/authenticateUsingToken', async (req, res) => {
    try {
        await Token.findOne({token: req.body.token}, async function(err, token){
            if (!token){
                res.send({
                    code: 301,
                    message: "Token not valid, please login."
                })
            } else {
                if (moment.utc(token.expiry).isAfter(moment.utc())) {
                    res.send({
                        code: 200,
                        data: {
                            token: token.token,
                            expiry: moment.utc(token.expiry).format('YYYY/MM/DD HH:mm:ss')
                        }
                    })
                } else {
                    let username = await Token.findOne({ token: req.body.token }).username
                    await Token.deleteOne({ token: req.body.token })
                    let newAuthToken = crypto.randomBytes(64).toString('hex')
                    addAuthToken(username, newAuthToken)
                    res.send({
                        code: 200,
                        data: {
                            token: newAuthToken,
                            expiry: moment.utc().add(1, "M").format('YYYY/MM/DD HH:mm:ss'),
                        }
                    })
                }
            }
        })
    } catch (error) {
        console.log(error)
    }
})

app.listen(3000, () => {
    console.log('Server port 3000 opened')
})