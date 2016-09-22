var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var ToDo = require('../models/todo');
var Verify = require('./verify.js');

var router = express.Router();
router.use(bodyParser.json());


isDefinedParamContainerId = function(req) {
  return (req !== undefined &&
    req !== null &&
    req.params.containerId !== undefined &&
    req.params.containerId !== null &&
    req.params.containerId.length > 0);
};

/*
We need to know whether we have to use the given containerId
or if we just have to use the standard containerId
This function checks whether there is a containerId in the request
and returns it if so. Returns the standard container id for this user if not.
*/
getContainerIdOrDefault = function(req) {
  if (isDefinedParamContainerId(req) === true) {
    return req.params.containerId;
  }
  return req.decoded.defaultContainer;
};

router.route('/')
  .all(Verify.verifyOrdinaryUser)

.get(function(req, res, next) {
  console.log("In ToDo get");
  var searchId;
  if (isDefinedParamContainerId(req) === true)
    searchId = req.param.containerId;

  else
    searchId = req.decoded.containerId;
  ToDo.find({
      'users': req.decoded._id,
      'parents': searchId
    })
    //.populate('comments.postedBy')
    .exec(function(err, todos) {
      if (err) return next(err);
      res.json(todos);
    });
})

/*
Creates a new task from the given ToDo specification. 
Note that ToDoLeeJo only respects the parameters 
summary, description and color of the ToDo body parameter.
The task is assigned to the container represented by the given container id.
Omitting the container id let ToDoLeeJo creating the task in the standard container.
*/
.post(function(req, res, next) {
  var containerId = getContainerIdOrDefault(req);
  ToDo.create({
      'users': [{
        userId: req.decoded._id
      }],
      'parents': [{
        parentId: containerId
      }],
      'summary': req.body.summary,
      'state': 'open',
      'isContainer': false,
      'description': req.body.description,
      'color': req.body.color
    },
    function(err, todo) {
      if (err) {
        if (err.name === 'ValidationError') {
          return res.status(422).json({
            err: err
          });
        } else {
          console.log(err);
          return res.status(500).json({
            err: err
          });
        }
      }

      res.status(200).json(todo);
    });
})

/*
  Deletes an existing todo according the id given in the body of the request.
  If the id does not exists or the todo does not belong to the logged in user
  a 404 is thrown. If the id belongs to a container 
  a 400 return code is send. For containers please use the container endpoints
  A 400 return code is also send for requests omitting the todoId in the body.
  The deleted todo is send back with a status = 'deleted'
*/
.delete(function(req, res, next) {
  ToDo.find({
    users: {
      $elemMatch: {
        userId: req.decoded._id
      }
    },
    _id: req.body.todoId
  }, function(err, todoDeleted) {
    if (err) {
      return res.status(404).json({
        err: err
      });
    }

    // Wie found a todo with user==logged in user and the given _id. 
    // and removed it already
    if (todoDeleted.isContainer === true) {
      return res.status(400).
      json({
        'code': 400,
        'messsage': 'Containers can not be deleted with this endpoint'
      });
    }

    // Found a non container todo that matches the user and the given id
    ToDo.findOneAndRemove({
      '_id': req.body.todoId
    }, function(err, removed) {
      if (err) return res.status(500).json({
        err: err
      });

      removed.status = 'deleted';
      return res.status(200).json(removed);
    });

  });
});

module.exports = router;