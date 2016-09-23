var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var states = require('./state.js');

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

findOneTodoForCurrentUser = function(req, callback) {
  ToDo.findOne({
    users: {
      $elemMatch: {
        userId: req.decoded._id
      }
    },
    _id: req.body.todoId
  }, function(err, todoDeleted) {
    if (err) {
      console.log(err);
      //An error can occur if the provided todoId is not an ObjectId.
      //So we return bad request
      if (err.name === 'CastError' && err.kind === 'ObjectId') {
        callback(err, 400, null);
      } else {
        callback(err, 500, null);
      }
    } else if (todoDeleted === undefined || todoDeleted === null) {
      // could not found a todo for current user with provided _id
      callback(err = new Error({
        'message': 'No todo found with given _id: ' +
          req.decoded._id + ' and todoId: ' + req.body.todoId
      }), 404, null);
    } else {
      callback(null, 200, todoDeleted);
    }
  });
};

getNextState = function(todo, direction) {
  var state = states.STATE[todo.state];
  if (state === null || state === undefined) {
    return null;
  }

  if (direction === 'left') {
    return state.left;
  }
  return state.right;
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


/*
 Router for creating managing and deleting todo entries
 All operations have to be done by a valid logged in user.
*/
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
      'state': states.STATE.open.name,
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
  a 400 return code is sent. For containers please use the container endpoints
  A 400 return code is also sent for requests omitting the todoId in the body.
  The deleted todo is sent back with a state === 'deleted'
*/
.delete(function(req, res, next) {

  // start to search for a todo containing the given user and the
  // provided id. findOne finds null for an empty result
  findOneTodoForCurrentUser(req, function(err, code, todoDeleted) {
    if (err) {
      return res.status(code).json({
        err: err
      });
    }

    /*
    ToDo.findOne({
        users: {
          $elemMatch: {
            userId: req.decoded._id
          }
        },
        _id: req.body.todoId
      }, function(err, todoDeleted) {
        if (err) {
          console.log(err);
          //An error can occur if the provided todoId is not an ObjectId.
          //So we return bad request
          if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({
              err: err
            });
          } else {
            return res.status(500).json({
              err: err
            });
          }
        }
        if (todoDeleted === undefined || todoDeleted === null) {
          // could not found a todo for current user with provided _id
          return res.status(404).json({
            'message': 'No todo found with given _id: ' +
              req.decoded._id + ' and todoId: ' + req.body.todoId
          });
        }

    */

    // We found a todo with user==logged in user and the given _id. 
    // so remove it if it is not a container
    if (todoDeleted.isContainer === true) {
      return res.status(400).
      json({
        'messsage': 'Containers can not be deleted with this endpoint'
      });
    }

    // Found a non container todo that matches the user and the given id
    // just remove the todo with the given _id (which is unique)
    ToDo.findOneAndRemove({
      '_id': req.body.todoId
    }, function(err, removed) {
      if (err) return res.status(500).json({
        err: err
      });

      // The todo is deleted. The client will get the 
      // removed item with a state of deleted
      removed.state = states.STATE.deleted.name;
      return res.status(200).json(removed);
    });
  });
});




/*
According to the direction [left, right] a tasks state can be set regarding its actual state.
So the user just has to give the Id of the task and the transition direction
to the server which calculates the next state according to the implemented state machine.
*/
isUndefined = function(toCheck) {
  return (toCheck === undefined || toCheck === null);
}
router.route('/transition')
  .all(Verify.verifyOrdinaryUser)
  .put(function(req, res, next) {
    // start to search for a todo containing the given user and the
    // provided id. findOne finds null for an empty result
    findOneTodoForCurrentUser(req, function(err, code, todo) {
      if (err) {
        return res.status(code).json({
          err: err
        });
      }

      var nextState = getNextState(todo, req.body.direction);


      // if the client sents an invalid direction or todo as an invalid state already
      // nextState will be undefined.
      if (isUndefined(nextState)) {
        return res.status(400).json({
          'message': 'Could not define next state for ' +
            req.body.direction + ' and state: ' + todo.states
        });
      }


      // OK Todo is valid and next state could be calculated so lets save and return it
      ToDo.findOneAndUpdate({
        _id: todo._id
      }, {
        $set: {
          state: nextState
        }
      }, {
        new: true
      }, function(err, updatedTodo) {
        if (err) {
          return res.status(500).json({
            err: err
          });
        }

        return res.status(200).json(updatedTodo);
      });
    });
  });






module.exports = router;