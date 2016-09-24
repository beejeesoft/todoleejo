/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();
app.enable('trust proxy');

// Secure traffic only
/*
app.all('*', function (req, res, next) {
  console.log('req start: ', req.secure, req.hostname, req.url, app.get('port'));
  if (req.secure) {
    return next();
  }
  res.redirect('https://' + req.headers.host + req.url);

  //res.redirect('https://' + req.hostname + ':' + app.get('secPort') + req.url);
});
*/

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// passport config
var User = require('./models/user');
app.use(passport.initialize());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var routes = require('./routes/index');
var users = require('./routes/users');
var todos = require('./routes/todos');

app.use('/', routes);
app.use('/users', users);
app.use('/todos', todos);


// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Read the config
var config = require('./config');

// Connect to mongodb according to config.js
var mongoose = require('mongoose');

var mongoUrl = config.getMongoConnection();
mongoose.connect(mongoUrl);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: ' + mongoUrl));
db.once('open', function () {
  // we're connected!
  console.log("Connected correctly to database server: " + mongoUrl);
});

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
