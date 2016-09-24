var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var parentSchema = new Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToDo'
  }
});

var userSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});


var ToDo = new Schema({
  summary: {
    type: String,
    required: true
  },

  description: String,

  state: {
    type: String,
    required: true,
    default: 'open',
    enum: ['open', 'inProgress', 'done', 'deleted']
  },

  color: {
    type: String,
    default: 'black'
  },

  isContainer: {
    type: Boolean,
    default: false
  },

  users: [userSchema],

  parents: [parentSchema]

}, {
  timestamps: true
});


module.exports = mongoose.model('ToDo', ToDo);