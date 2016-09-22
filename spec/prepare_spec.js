var mongoose = require('mongoose');
var User = require('../models/user');
var gc = require('./testConfig');


var MONGO_BASE = gc.MONGO_BASE;


mongoose.connect(MONGO_BASE + '/todoleejo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
  User.remove({
    'username': {
      $in: gc.USER_TO_DELETE
    }
  }, function(err, user) {});
  db.close();


});