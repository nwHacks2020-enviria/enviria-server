const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const Bcrypt = require('bcryptjs');
const moment = require('moment')

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

const addAuthToken = async (username: String, token: String) => {
    var newToken = new Token({username, token, expiry: moment.utc().add(1, "M").toDate() });
    var result = await user.save();
    console.log('Token added: ', result)
    console.log('Token value: ', newToken.token)
}

app.get('/', (req, res) => {
    res.send('Hello')
})

app.post('/authenticateUsingToken', async (req, res) => {
    try {
        let result = await Token.find({token: req.body.token}).toArray()[0]
        if (result) {
            if (moment.utc(result.expiry).isAfter(moment.utc())) {
                res.send({
                    code: 200,
                    data: {
                        token: result.token,
                        expiry: moment.utc(result.expiry).format('YYYY/MM/DD HH:mm:ss')
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
        } else {

        }
    } catch (error) {
        res.send({
            code: 301,
            message: "Token not valid, please login."
        })
    }
})

app.post("/authenticate", async (req, res) => {
    console.log("authenticating...");
    let hashed_password = await User.findOne({username: req.body.username}).password
    if (req.body.password !== undefined) {
        let result = await bcrypt.compare(req.body.password, hashed_password)
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
        };
    } else {
        res.send({ code: 301, message: "Please send password in body" })
    }
});

app.post('/register', async (req, res) => {
    try {
        req.body.password = Bcrypt.hashSync(req.body.password, 10);
        var user = new User(req.body);
        var result = await user.save();
        res.send(result);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.listen(3000, () => {
    console.log('Server port 3000 opened')
})


