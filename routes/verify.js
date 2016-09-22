var User = require('../models/user');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('../config.js');

exports.getToken = function (user) {
  return jwt.sign(user, config.secretKey, {
    expiresIn: 3600
  });
};

exports.verifyOrdinaryUser = function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  console.log('READ TOKEN: ' + token);
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, config.secretKey, function (err, decoded) {
      if (err) {
        console.log('ERRIR: ' + err);
        err = new Error('You are not authenticated!');
        err.status = 401;
        return next(err);
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  } else {
    // if there is no token
    // return an error
    console.log('NO TOKEN PROVIDED');
    var err = new Error('No token provided!');
    err.status = 403;
    return next(err);
  }
};

exports.verifyAdmin = function (req, res, next) {
  if (req.decoded && req.decoded.admin) {
    console.log("Has admin rights");
    next();
  } else {
    var err = new Error('You must have admin rights in order to do this!');
    err.status = 403;
    return next(err);
  }
};
