var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var parentSchema = new Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToDo'
  }
}, {
  timestamps: true
});

var userSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});


var ToDo = new Schema({
  summary: {
    type: String,
    required: true
  },

  description: String,

  state:{
    type: String,
    required: true,
    default: 'open',
    enum: ['open', 'inProgress', 'done', 'deleted']
  },

  color: String,
  
  isContainer: {
    type: Boolean,
    default: false
  },

  users : [userSchema],
  
  parents: [parentSchema]

});


module.exports = mongoose.model('ToDo', ToDo);