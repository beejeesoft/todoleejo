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
  return (isUndefined(req) === false &&
    isUndefined(req.body) === false &&
    isUndefined(req.body.containerId === false));
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
  little helper to made the code more readable
*/
var copyParentIdsToQuery = function(req, parents) {
  var query = {
    '_id': req.decoded._id,
    'todoIds': []
  };

  for (var id = 0; id < parents.length; id++) {
    query.todoIds.push(parents[id].parentId);
  }
  return query;
};

/*
  copy only those todo._id s that are containers and are contained in requested list.
*/
var copyOnlyContainers = function(req, todoList) {
  var newParents = [];

  for (var i = 0; i < todoList.length; i++) {
    if (todoList[i].isContainer === true)
      newParents.push(todoList[i]._id);
  }

  // if the array is still empty we put the defaultContainer ref for this user in
  if (newParents.length === 0) {
    newParents.push(req.decoded.defaultContainer);
  }

  return newParents;
};

var prepareParentsForUpdate = function(req, todo, callback) {
  // parents are not allowed to be empty
  // if so we set the defaultContainer for this user
  if (isUndefined(todo.parents) || todo.parents.length === 0) {
    todo.parents = [{
      parentId: req.decoded.defaultContainer
    }];
    callback(null, 200, todo);
    return;
  }

  // parents are provided.
  // We have to check that they all belong to the current user

  var query = copyParentIdsToQuery(req, todo.parents);


  if (query.todoIds.length === 0) {
    callback({
      'message': 'No valid parent id array'
    }, 500, null);
    return;
  }

  // at least one parentId is provided.
  // now we want to check if the id belongs to the user
  findTodosForCurrentUser(query, function(err, code, todos) {
    if (err) {
      callback(err, code, null);
      return;
    }

    // so at least there are some parents found that belong to the user
    // now check if they are container and if not remove them from the given list
    // in fact we build a new list with the real containers belonging to that user
    var newParents = copyOnlyContainers(req, todos);

    // Now replace the requested array with the filtered one
    todo.parents = [];
    for (var id = 0; id < newParents.length; id++) {
      todo.parents.push({
        parentId: newParents[id]
      });
    }

    // todo is now prepared and checked regarding the parentId references
    callback(null, 200, todo);
  });
};


/*
  Statemachine managing the state of a todo and a swipe direction
*/
var getNextState = function(todo, direction) {
  var state = states.STATE[todo.state];
  if (state === null || state === undefined) {
    return null;
  }


  if (direction === 'left') {
    return state.left;
  } else if (direction === 'right')
    return state.right;
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

var haveSameParentIDs = function(parents1, parents2) {
  if (isUndefined(parents1) && isUndefined(parents2)) {
    return true;
  }
  if (parents1.length !== parents2.length) {
    return false;
  }

  for (var i = 0; i < parents1.length; i++) {
    var match = false;
    for (var j = 0; j < parents2.length; j++) {
      if (JSON.stringify(parents2[j].parentId) === JSON.stringify(parents1[i].parentId)) {
        match = true;
        break;
      }
    }
    if (match === false) {
      return false;
    }
  }
  return true;
};


/*
 Router for creating managing and deleting todo entries
 All operations have to be done by a valid logged in user.
*/
router.route('/')
  .all(Verify.verifyOrdinaryUser)


/**
 * Getting todos for a specific container
 * If not container id was given the defaultContainer for the user is used.
 */

.get(function(req, res, next) {

  if (isUndefined(req) || isUndefined(req.query) || isUndefined(req.query.containerId)) {
    searchId = req.decoded.defaultContainer;
  } else {
    searchId = req.query.containerId;
  }


  ToDo.find({
    users: {
      $elemMatch: {
        userId: req.decoded._id
      }
    },
    parents: {
      $elemMatch: {
        parentId: searchId
      }
    }
  }, function(err, todos) {

    var code = 200;
    var result = todos;

    if (err) {
      result = {
        err: err
      };
      code = 500;
      if (err.name === 'CastError' && err.kind === 'ObjectId') {
        //An error can occur if the provided todoId is not an ObjectId.
        //So we return bad request
        code = 400;
      }
    }


    return res.status(code).json(result);

  });
})

/*
Changes attributes of an existing task that are manageable by the user.
Updateable attributes are summary, description, color and container associations.
For other updates like transitions or converting into an container use the specified methods
*/
.put(function(req, res, next) {

  // check an updateable todo is present
  if (isUndefined(req) || isUndefined(req.body)) {
    return res.status(400).json({
      'message': 'The todo to be updated is not provided.'
    });
  }

  // shortcut
  var todo = req.body;


  //find the todo to update in database
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

    var toUpdate = todos[0];

    // found the requested todo.
    // now we have to perform some checks and clean ups for
    // the container associations
    // a) check that the requested parents are containers
    // b) check that the requested parents belong to the user logged in
    // c) check that the container associations are not empty (else use default container)
    prepareParentsForUpdate(req, todo, function(err, code, preparedTodo) {
      if (err) {
        return res.status(code).json({
          err: err
        });
      }



      // Now after preperation check if we have to update something
      if (toUpdate.color === preparedTodo.color) {
        if (toUpdate.summary === preparedTodo.summary) {
          if (toUpdate.description === preparedTodo.description) {
            if (haveSameParentIDs(toUpdate.parents, preparedTodo.parents) === true) {
              return res.status(200).json(toUpdate);
            }
          }
        }
      }

      // Now just copy to database and return the new entry to the client
      ToDo.findOneAndUpdate({
        _id: preparedTodo._id
      }, {
        $set: {
          color: preparedTodo.color,
          summary: preparedTodo.summary,
          description: preparedTodo.description,
          parents: preparedTodo.parents
        }
      }, {
        new: true,
        runValidators: true
      }, function(err, updatedTodo) {
        if (err) {

          return res.status(500).json({
            err: err
          });
        }

        // everything was updated
        return res.status(200).json(updatedTodo);

      });
    });
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
      'isStandard': false,
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
          return res.status(500).json({
            err: err
          });
        }
      }

      res.status(200).json(todo);
    });
})


/*
  Deletes an existing todo according the id given in the query of the request.

  If the id does not exists or the todo does not belong to the logged in user
  a 404 is thrown. If the id belongs to a container
  a 400 return code is sent. For containers please use the container endpoints
  A 400 return code is also sent for requests omitting the todoId in the body.
  The deleted todo is sent back with a state === 'deleted'

  Unfortunately angular does not respect the body element for delete requests.
  So I was forced to use query parameters instead.

*/
.delete(function(req, res, next) {

  if (isUndefined(req) || isUndefined(req.query) || isUndefined(req.query.todoId)) {
    return res.status(400).json({
      'message': 'The container to delete is not provided.'
    });
  }
  // start to search for a todo containing the given user and the
  // provided id. findOne finds null for an empty result
  var query = {
    _id: req.decoded._id,
    todoIds: [req.query.todoId]
  };
  findTodosForCurrentUser(query, function(err, code, todos) {
    if (err) {
      return res.status(code).json({
        err: err
      });
    }

    var todoDeleted = todos[0];
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
      '_id': req.query.todoId
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
router.route('/transition')
  .all(Verify.verifyOrdinaryUser)
  .put(function(req, res, next) {
    // start to search for a todo containing the given user and the
    // provided id. findOne finds null for an empty result
    var query = {
      '_id': req.decoded._id,
      'todoIds': [req.body.todoId]
    };
    findTodosForCurrentUser(query, function(err, code, todos) {
      if (err) {
        return res.status(code).json({
          err: err
        });
      }
      var todo = todos[0];
      var nextState = getNextState(todo, req.body.direction);


      // if the client sents an invalid direction or todo has an invalid state already
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
