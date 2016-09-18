var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var ToDo = require('../models/todo');
var Verify = require('./verify');

/* GET users listing. */
router.get('/', function (req, res, next) {
  console.log('IN users get');
  User.find({}, function (err, users) {
    if (err) next(err);
    res.json(users);
  });
});


router.post('/register', function (req, res) {
  console.log('HI in register');
  User.register(new User({
    username: req.body.username
  }),
    req.body.password,
    function (err, user) {
      if (err) {
        return res.status(500).json({
          err: err
        });
      }

      // Add a default standard container
      console.log('Create new StandardContainer for user: ' + user._id);
      ToDo.create({
        'users': [user._id],
        'summary': 'Standard',
        'isContainer': 'true'
      },
        function (err, todo) {
          if (err) {
            return res.status(500).json({ err: err });
          }
          console.log('StandardContainer created: ' + todo);
          console.log('Now setting the defaultContainer ' + todo._id);
          user.defaultContainer = todo._id;

          user.save(function (err, user) {
            console.log('Saved user: ' + user);
            passport.authenticate('local')(req, res, function () {
              return res.status(200).json({
                status: 'Registration Successful!'
              });
            });
          });
        });
    });
});

router.post('/login', function (req, res, next) {
  console.log('HI in login');
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        err: info
      });
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.status(500).json({
          err: 'Could not log in user'
        });
      }

      var token = Verify.getToken({ 'username': user.username, '_id': user._id, 'admin': user.admin });
      res.status(200).json({
        status: 'Login successful!',
        success: true,
        token: token
      });
    });
  })(req, res, next);
});

router.get('/logout', function (req, res) {
  req.logout();
  res.status(200).json({
    status: 'Bye!'
  });
});

module.exports = router;