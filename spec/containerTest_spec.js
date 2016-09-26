var frisby = require('frisby');
var gc = require('./testConfig');



var TEST_USER = gc.TEST_USER_CONTAINER;
var TEST_PASSW = gc.TEST_PASSW;


var TEST_URL = gc.CONTAINER_URL;
var TODO_URL = gc.TODO_URL;
var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;


var createManyToDos = function(arrayOfSummaries, callback) {
  var result = [];
  var calls = 0;
  var inner = function(res) {
    result.push(res);
    if (++calls == arrayOfSummaries.length) {
      callback(result);
    }
  };
  for (var i = 0; i < arrayOfSummaries.length; i++) {
    createToDo(arrayOfSummaries[i], inner);
  }
};

var createToDo = function(summary, callback) {
  frisby.create('Prepare')
    .post(TODO_URL, {
      'summary': summary
    }, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};

var findTodoBySummary = function(summary, array) {
  var inner = function(elem) {
    return elem.summary === summary;
  };

  return array.find(inner);
};


var convertMany = function(arrayOfTodos, callback) {
  var result = [];
  var calls = 0;
  var innerCallback = function(res) {
    result.push(res);
    if (++calls === arrayOfTodos.length) {
      callback(result);
    }
  };
  for (var i = 0; i < arrayOfTodos.length; i++) {
    convert(arrayOfTodos[i], innerCallback);
  }
};

var convert = function(todo, callback) {
  frisby.create('Convert ' + todo.summary)
    .post(TEST_URL, {
      todoId: todo._id
    }, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      expect(json.isContainer).toBe(true);
      expect(json.parents.length).toBe(0);
      callback(json);
    }).toss();
};

var addToContainer = function(todo, container, callback) {
  todo.parents.push({
    parentId: container._id
  });
  frisby.create('Add Todo: ' + todo.summaryj + ' To Container ' + container.summary)
    .put(TODO_URL, todo, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(function(json) {
      callback(json);
    }).toss();
};


var checkGetterCountTodo = function(param, expectedCount, callback) {
  frisby.create('CheckGetter')
    .get(TODO_URL + param)
    .expectStatus(200)
    .afterJSON(function(todos) {
      // we expect all todos in the default
      expect(todos.length).toBe(expectedCount);
      callback(todos);
    }).toss();
};

var prepareSetupFor4 = function(callback) {

  createManyToDos(['Test1',
    'Test2',
    'Test3', 'Test4', 'Container1', 'Container2',
    'Container3', 'Container4'
  ], function(todos) {

    var todo1 = findTodoBySummary('Test1', todos);
    var todo2 = findTodoBySummary('Test2', todos);
    var todo3 = findTodoBySummary('Test3', todos);
    var todo4 = findTodoBySummary('Test4', todos);
    var cont1 = findTodoBySummary('Container1', todos);
    var cont2 = findTodoBySummary('Container2', todos);
    var cont3 = findTodoBySummary('Container3', todos);
    var cont4 = findTodoBySummary('Container4', todos);

    // convert the todos with the container names into containers
    convertMany([cont1, cont2, cont3, cont4], function(convs) {
      cont1 = findTodoBySummary('Container1', todos);
      cont2 = findTodoBySummary('Container2', todos);
      cont3 = findTodoBySummary('Container3', todos);
      cont4 = findTodoBySummary('Container4', todos);

      addToContainer(todo1, cont1, function(todo11) {
        addToContainer(todo2, cont2, function(todo21) {
          addToContainer(todo3, cont3, function(todo31) {
            addToContainer(todo4, cont4, function(todo41) {

              // Now check getters from todo
              frisby.create('CheckGetter')
                .get(TODO_URL, {}, {
                  json: true
                })
                .expectStatus(200)
                .afterJSON(function(todosDefault) {
                  // we expect all todos in the default
                  expect(todosDefault.length).toBe(4);
                  expect(findTodoBySummary('Test1', todosDefault).parents.length).toBe(2);
                  expect(findTodoBySummary('Test2', todosDefault).parents.length).toBe(2);
                  expect(findTodoBySummary('Test3', todosDefault).parents.length).toBe(2);
                  expect(findTodoBySummary('Test4', todosDefault).parents.length).toBe(2);


                  callback(todo11, todo21, todo31, todo41, cont1, cont2, cont3, cont4);

                }).toss();
              // Now check getters for each container
              checkGetterCountTodo('?containerId=' + cont1._id, 1, function(found) {

              });
              checkGetterCountTodo('?containerId=' + cont2._id, 1, function(found) {

              });
              checkGetterCountTodo('?containerId=' + cont3._id, 1, function(found) {

              });
              checkGetterCountTodo('?containerId=' + cont4._id, 1, function(found) {

              });

            });
          });
        });
      });
    });
  });



};




describe('Container TestSuite ', function() {


  frisby.create('First register container user for all')
    .post(REGISTER_URL, {
      'username': TEST_USER,
      'password': TEST_PASSW
    })
    .expectStatus(200)
    .after(function(err, res, body) {

      frisby.create('Login the user for all tests')
        .post(LOGIN_URL, {
          'username': TEST_USER,
          'password': TEST_PASSW
        })
        .expectStatus(200)
        .afterJSON(function(jsonLogin) {

          // globalSetup is for ALL following requests
          frisby.globalSetup({
            request: {
              headers: {
                'x-access-token': jsonLogin.token
              }
            }
          });

          /**
           * Converting ToDos
           */
          prepareSetupFor4(function(t1, t2, t3, t4, c1, c2, c3, c4) {



          });


        }).toss();
    }).toss();
});