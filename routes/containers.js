var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var states = require('./state.js');

var ToDo = require('../models/todo');
var Verify = require('./verify.js');

var router = express.Router();
router.use(bodyParser.json());


var isUndefined = function(toCheck) {
  return (toCheck === undefined || toCheck === null);
};


var isDefinedBodyContainerId = function(req) {
  return (!isUndefined(req) &&
    !isUndefined(req.body) &&
    !isUndefined(req.body.containerId) &&
    req.body.containerId.length > 0);
};

/*
  Simplify: this method searches for todos that belong to the userId given
  and are in a set of todoIds.
  With this method we solve the problem that certain requests are only allowed
  on todos that belong to the logged in user (the one that made the request).
  For instance: if one wants to delete a todo we first check if there is todo
  with the given todoId and belongs to the current user. If not this method
  returns null in the callback.

  The method returns the todos found as an array.
  Not finding anything is handled as an error.
  The method is assumed to find as much entries as todoIds given in the query list of todoIds.

  Bad requests are handeled.
*/
var findTodosForCurrentUser = function(query, callback) {
  ToDo.find({
    users: {
      $elemMatch: {
        userId: query._id
      }
    },
    _id: {
      $in: query.todoIds
    }
  }, function(err, todos) {
    if (err) {
      //An error can occur if the provided todoId is not an ObjectId.
      //So we return bad request
      if (err.name === 'CastError' && err.kind === 'ObjectId') {
        callback(err, 400, null);
      } else {
        callback(err, 500, null);
      }
    } else if (isUndefined(todos) || todos.length === 0) {
      // could not found a todo for current user with provided _id
      callback({
        'message': 'No todo found with given _id: ',
        'query.id': query._id,
        'todoIds': query.todoIds
      }, 404, null);
    } else {
      callback(null, 200, todos);
    }
  });
};








/*
We need to know whether we have to use the given containerId
or if we just have to use the standard containerId
This function checks whether there is a containerId in the request
and returns it if so. Returns the standard container id for this user if not.
*/
var getContainerIdOrDefault = function(req) {
  if (isDefinedBodyContainerId(req) === true) {
    return req.body.containerId;
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


  ToDo.find({
    users: {
      $elemMatch: {
        userId: req.decoded._id
      }
    },
    isContainer: true
  }, function(err, containers) {

    if (err) {
      return res.status(500).json({
        err: err
      });
    }
    return res.status(200).json(containers);

  });
})

/**
 * Getting all containers for the current user.
 */


/**
 * Changes attributes of an existing container that are manageable by the user.
 * Updateable attributes are summary, description and color.
 */
.put(function(req, res, next) {

  // check an updateable todo is present
  if (isUndefined(req) || isUndefined(req.body)) {
    return res.status(400).json({
      'message': 'The container to be updated is not provided.'
    });
  }

  // shortcut
  var todo = req.body;


  //find the container to update in database
  var query = {
    '_id': req.decoded._id,
    'todoIds': [todo._id]
  };

  findTodosForCurrentUser(query, function(err, code, todos) {
    if (err) {
      return res.status(code).json({
        err: err
      });
    }

    // it is the first one because we are searching with the todo._id
    var toUpdate = todos[0];


    // Now check if we have to update something
    if (toUpdate.color === todo.color) {
      if (toUpdate.summary === todo.summary) {
        if (toUpdate.description === todo.description) {
          return res.status(200).json(toUpdate);
        }
      }
    }

    // Now just copy to database and return the new entry to the client
    ToDo.findOneAndUpdate({
      _id: toUpdate._id
    }, {
      $set: {
        color: todo.color,
        summary: todo.summary,
        description: todo.description,
        state: states.STATE.open.name,
        parents: []
      }
    }, {
      new: true,
      runValidators: true
    }, function(err, updated) {
      if (err) {

        return res.status(500).json({
          err: err
        });
      }

      // everything was updated
      return res.status(200).json(updated);

    });
  });
})

/**
 * Converts a todo to a container.
 * Associations to other containers are deleted by this conversion.
 * Returns the new container
 */
.post(function(req, res, next) {

  if (isUndefined(req) || isUndefined(req.body) || isUndefined(req.body.todoId)) {
    return res.status(400).json({
      'message': 'The todo to be converted is not provided.'
    });
  }

  // Search for the todo to check if it belongs to the user
  findTodosForCurrentUser({
    _id: req.decoded._id,
    todoIds: [req.body.todoId]
  }, function(err, code, todos) {

    if (err) {
      return res.status(code).json({
        err: err
      });
    }

    // shortcut
    var todo = todos[0];

    // run the update on the found todo
    ToDo.findOneAndUpdate({
        _id: todo._id
      }, {
        $set: {
          isContainer: true,
          isStandard: false,
          parents: []
        }
      }, {
        new: true
      },
      function(err, updatedToDo) {

        if (err) {
          return res.status(500).json({
            err: err
          });
        }


        return res.status(200).json(updatedToDo);

      });
  });
})

/**
 * Deletes an existing container and all Todos that references it if wished.
 * If the body parameter cascade===true all todos that references this container
 * are deleted.
 */
.delete(function(req, res, next) {
  if (isUndefined(req) || isUndefined(req.query) || isUndefined(req.query.containerId)) {
    return res.status(400).json({
      'message': 'The container to delete is not provided.'
    });
  }

  if (req.query.containerId === req.decoded.defaultContainer) {
    return res.status(400).json({
      message: 'Standard container can not be deleted'
    });
  }

  // start to search for the container
  var query = {
    _id: req.decoded._id,
    todoIds: [req.query.containerId]
  };
  findTodosForCurrentUser(query, function(err, code, containers) {
    if (err) {
      return res.status(code).json({
        err: err
      });
    }

    var deletable = containers[0];

    // We found a todo with user==logged in user and the given _id.
    // so remove it if it is not a container
    if (deletable.isContainer === false) {
      return res.status(400).
      json({
        'messsage': 'ToDos can not be deleted with this endpoint'
      });
    }

    if(deletable.isStandard === true){
      return res.status(400).
      json({
        'messsage': 'The Standard Container can not be deleted'
      });
    }


    var cascadeDelete = false;
    if (req.query.cascade === true) {
      cascadeDelete = true;
    }

    // Found a container that matches the user and the given id
    // just remove the todo with the given _id (which is unique)
    // And do a cascade
    var query = {
      _id: deletable._id
    };

    if (cascadeDelete === true) {
      query = {
        $or: [{
          _id: deletable._id
        }, {
          parents: {
            $elemMatch: {
              parentId: deletable._id
            }
          }
        }]
      };
    }




    ToDo.remove({
      $or: [{
        _id: deletable._id
      }, {
        parents: {
          $elemMatch: {
            parentId: deletable._id
          }
        }
      }]
    }, function(err, allRemoved) {
      if (err) return res.status(500).json({
        err: err
      });

      for (var i = 0; i < allRemoved.length; i++) {
        allRemoved[i].state = states.STATE.deleted.name;
      }

      // The todo is deleted. The client will get the
      // removed item with a state of deleted
      return res.status(200).json(allRemoved);
    });
  });
});






module.exports = router;
