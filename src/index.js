const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const bcrypt = require('bcryptjs')
const moment = require('moment')
const crypto = require('crypto')

var User = require('./user')
var Token = require('./token')
var GreenScore = require('./greenscore');

const app = express()

var mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/enviriadb', {useNewUrlParser: true, useUnifiedTopology: true })
var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function() {
  console.log('Database Connection Established.')
})

app.use(helmet())

app.use(bodyParser.json())

app.use(cors())

app.use(morgan('combined'))

const addUpdateAuthToken = async (username, token) => {
    await Token.findOne({username: username}, async function(err, oldToken){
        if (oldToken){
            oldToken.token = token
            oldToken.save()
            console.log('Token value updated: ', oldToken.token)
        } else {
            var newToken = new Token({username, token, expiry: moment.utc().add(1, "M").toDate() })
            var result = await newToken.save()
            console.log('Token added: ', result)
            console.log('Token value: ', newToken.token)
        }
    })
}

app.get('/', (req, res) => {
    res.send('Hello')
})

app.post('/register', async (req, res) => {
    try {
        req.body.password = bcrypt.hashSync(req.body.password, 10)
        var user = new User(req.body)
        var result = await user.save()
        res.send({
            code: 200,
            data: {
                username: result.username,
                email: result.email,
                friends: result.friends,
                total_greenscore: result.total_greenscore
            }
        })
    } catch (error) {
        res.status(500).send(error)
    }
})

app.post("/authenticate", async (req, res) => {
    console.log("authenticating...")
    if (req.body.password == undefined) {
        res.send({ code: 500, message: "Please send password in body" })
    }
    await User.findOne({username: req.body.username}, async function(err, user){
        if (user) {
            let hashed_password = user.password
            try {
                result = await bcrypt.compare(req.body.password, hashed_password)
                if (result) {
                    console.log("authenticated!")
                    let newAuthToken = crypto.randomBytes(64).toString('hex')
                    addUpdateAuthToken(req.body.username, newAuthToken)
                    res.send({
                        code: 200,
                        token: newAuthToken
                    })
                } else {
                    console.log("authentication failed.")
                    res.send({ code: 500, message: "Not Authorized" })
                }
            } catch (error) {
                console.log(error)
            }
        }
    })
})

// Middleware
app.use(function(req, res, next){
    console.log("Secure resource " + Date.now())

    if (req.query.token == undefined) {
        res.send({
            code: 500,
            message: "Token not detected"
        })
        return
    }
    Token.findOne({token: req.query.token}, async function(err, token){
        if (!token){
            res.send({
                code: 500,
                message: "Token not detected"
            })
        } else {
            next()
        }
    })
 })

app.post('/authenticateUsingToken', async (req, res) => {
    try {
        await Token.findOne({token: req.query.token}, async function(err, token){
            if (!token){
                res.send({
                    code: 500,
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
                    let username = await Token.findOne({ token: req.query.token }).username
                    await Token.deleteOne({ token: req.query.token })
                    let newAuthToken = crypto.randomBytes(64).toString('hex')
                    addUpdateAuthToken(username, newAuthToken)
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

async function getUserIDFromToken(token){
    var username = null;
    var user_id = null;
    try {
        await Token.findOne({token: token}, async function (err, db_token) {
            if (db_token.username) {
                username = db_token.username
            }
        })
        await User.findOne({username: username}, function (err, user) {
            user_id = user._id
        })
    } catch (err) {
        console.error(err)
    }

    return user_id
}

actionScores = {
    "biking": 300,
    "driving": -600,
    "transit": 150,
    "recycling": 150,
    "composting": 250
}

app.post('/api/greenscore', async function (req, res) {
    var token = req.query.token
    var user_id = await getUserIDFromToken(token)
    var score = 0
    var totgreenscore = 0

    console.log(req.body.action)
    if (actionScores[req.body.action] == undefined){
        res.send({ code: 500, message: "action not found" })
        return
    }
    await User.findOne({_id: user_id}, async function(err, user){   
        if(user){
            user.total_greenscore += actionScores[req.body.action]
            if (user.total_greenscore > 10000)
                user.total_greenscore = 10000;
            else if (user.total_greenscore < 0)
                user.total_greenscore = 0;

            totgreenscore = user.total_greenscore
            
            console.log(user.username + '\'s current greenscore:', user.total_greenscore)
            await user.save();
        }else{
            console.log(err);
        }
    })

    var greenscore = new GreenScore ({
        user_id: user_id,
        action: req.body.action,
        score: actionScores[req.body.action],
        current_score: totgreenscore,
        additionalData: {}
    });

    var result = await greenscore.save();

    res.send({
        code: 200,
        data: result
    });
})

app.get('/api/greenscore', async function(req, res) {
    var token = req.query.token
    var user_id = await getUserIDFromToken(token)
    var result = []

    const agg = GreenScore.aggregate([{ $match: { user_id: user_id}}])
    for await (const gs of agg) {
        result.push(gs)
    }
    res.send({
        code: 200,
        data: result
    })
})  

app.post('/api/friends', async function(req, res) {
    var token = req.query.token
    var friend = req.body.friend_username
    var friend_id = null
    var user_id = await getUserIDFromToken(token)
    var result = null
    try {
        await User.findOne({username: friend}, async function (err, user){
            friend_id = user._id
        })
        await User.findOne({_id: user_id}, async function(err, user){
            if (!friend_id || user_id.toString() == friend_id.toString()){
                res.send({ code: 500, message: "Friend error" })
                return
            }
            user.friends.addToSet(friend_id)
            await user.save()
            res.send({
                code: 200,
                message: "Friend added"
            })
        })
    } catch (error) {
        console.error(error)
    }
})

app.get('/api/friends', async function (req, res) {
    var token = req.query.token
    var user_id = await getUserIDFromToken(token)
    var friends = null
    var result = []
    try {
        await User.findOne({'_id': user_id}, function(err, user) {
            if (user) {
                friends = user.friends;
            }
        })
        await User.find({
            '_id': { $in: friends}
        }, function(err, users){
            users.forEach(function (item, index) {
                let clean_user = {"username": item.username, "greenscore": item.total_greenscore}
                result.push(clean_user) 
            })
        })
    } catch (error) {
        console.error(error)
    }

    res.send({
        code: 200,
        data: {
            friends: result
        }
    })

})

app.delete('/api/friends', async function (req, res) {
    var token = req.query.token
    var friend = req.body.friend_username
    var user_id = await getUserIDFromToken(token)
    var friend_id = null
    try {
        await User.findOne({'username': friend}, function(err, user) {
            if (user) {
                friend_id = user._id
            }
        })
        await User.findOne({'_id': user_id}, function(err, user) {
            if (user) {
                var index = user.friends.indexOf(friend_id)
                if (index != -1) {
                    user.friends.splice(index, 1)
                    user.save()
                }
            }
            res.send({
                code: 200,
                message: "Friend deleted"
            })
        })
    } catch (error) {
        console.error(error)
    }
})

app.get('/api/leaderboard', async function (req, res) {
    var top_users = []
    try {
        User.find({}).sort({total_greenscore: 'desc'}).limit(10).exec(function(err, docs){
            docs.forEach(function(result, index){
                // console.log(result)
                top_users.push({
                    username: result.username,
                    email: result.email,
                    friends: result.friends,
                    total_greenscore: result.total_greenscore
                })
            })
            res.send({
                code: 200,
                data: {
                    top_users: top_users
                }
            })
        })
    } catch (error) {
        console.error(error)
    }
    
})

app.post('/api/greenscoreAggregation', async function (req, res) {
    var token = req.query.token
    var user_id = await getUserIDFromToken(token)
    var fromTime = new Date(req.body.fromTime)
    var toTime = new Date(req.body.toTime)

    console.log(fromTime)
    console.log(toTime)
    var result = 0

    try {
        const agg = GreenScore.aggregate([{ $match: { user_id: user_id}}])
        for await (const gs of agg) {
            if (gs.createdAt >= fromTime && gs.createdAt <= toTime) {
                result += gs.score
            }
        }
        console.log(result)
        res.send({
            code: 200,
            data: {
                result: result
            }
        })
    } catch (error) {
        console.error(error)
        res.send({
            code: 500,
            data: {
                description: error
            }
        })
    }
})

app.post('/api/greenscoreByDay', async function(req, res) {
    var token = req.query.token
    var user_id = await getUserIDFromToken(token)
    var fromTime = new Date(req.body.fromTime)
    var toTime = new Date(req.body.toTime)

    console.log(fromTime)
    console.log(toTime)
    var result = []

    try {
        const agg = GreenScore.aggregate([{ $match: { user_id: user_id}}])
        for await (const gs of agg) {
            if (gs.createdAt >= fromTime && gs.createdAt <= toTime) {
                result.push(gs)
            }
        }
        console.log(result)
        res.send({
            code: 200,
            data: {
                result: result
            }
        })
    } catch (error) {
        console.error(error)
        res.send({
            code: 500,
            data: {
                description: error
            }
        })
    }
})

app.listen(3000, () => {
    console.log('Server port 3000 opened')
})