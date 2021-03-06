var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var ToDo = require('../models/todo');
var Verify = require('./verify');

/* GET users listing. */
router.get('/', function(req, res, next) {
  User.find({}, function(err, users) {
    if (err) next(err);
    res.json(users);
  });
});


router.post('/register', function(req, res) {
  User.register(new User({
      username: req.body.username
    }),
    req.body.password,
    function(err, user) {
      if (err) {
        if (err.name !== null && err.name === 'UserExistsError')
          return res.status(403).json({
            err: err
          });
        else
          return res.status(500).json({
            err: err
          });
      }

      // Add a default standard container
      ToDo.create({
          'users': [{userId:user._id}],
          'summary': 'Standard',
          'isContainer': 'true',
          'isStandard':'true'
        },
        function(err, todo) {
          if (err) {
            console.log(err);
            return res.status(500).json({
              err: err
            });
          }
          user.defaultContainer = todo._id;
          user.save(function(err, user) {
            passport.authenticate('local')(req, res, function() {
              return res.status(200).json({
                status: 'Registration Successful!'
              });
            });
          });
        });
    });
});

router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        err: info
      });
    }
    req.logIn(user, function(err) {
      if (err) {
        return res.status(500).json({
          err: 'Could not log in user'
        });
      }


     // console.log('Create token with: ' +
     //   'username: ' + user.username +' _id: ' + user._id +' admin: ' + user.admin +' containerId: ' + user.defaultContainer);
      var token = Verify.getToken({
        'username': user.username,
        '_id': user._id,
        'admin': user.admin,
        'defaultContainer': user.defaultContainer
      });
      res.status(200).json({
        status: 'Login successful!',
        success: true,
        token: token
      });
    });
  })(req, res, next);
});

router.get('/logout', function(req, res) {
  req.logout();
  res.status(200).json({
    status: 'Bye!'
  });
});

module.exports = router;
