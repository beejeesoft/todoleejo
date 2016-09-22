var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
  username: String,
  password: String,
  admin:{
    type: Boolean,
    default: false
  },
  defaultContainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToDo'
  }
});


User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);