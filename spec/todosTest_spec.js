var frisby = require('frisby');
var gc = require('./testConfig');



var TEST_USER = gc.TEST_USER_TODO;
var TEST_PASSW = gc.TEST_PASSW;


var CREATE_URL = gc.TODO_URL;

var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;

describe('ToDo TestSuite ', function() {


  frisby.create('Todo Tests first register a user for all')
    .post(REGISTER_URL, {
      'username': TEST_USER,
      'password': TEST_PASSW
    })
    .expectStatus(200)
    .after(function(err, res, body) {

      frisby.create('Todo Tests Login the user for all tests')
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
           * Creating ToDos
           */


          frisby.create('Creating new entry')
            .post(CREATE_URL, {
              'summary': 'A summary',
              'description': 'a discription'

            })
            .expectStatus(200)
            .afterJSON(function(todo) {
              expect(todo).not.toBe(null);
              expect(todo.isContainer).toBe(false);
              expect(todo.parents.length).toBe(1);
              expect(todo.users.length).toBe(1);
              expect(todo.color).toBe('black');
            })
            .toss();

          frisby.create('Createing new entry without summary throws a ValidationError')
            .post(CREATE_URL, {
              'description': 'Bad Idea'
            })
            .expectStatus(422)
            .afterJSON(function(json) {
              expect(json.err.name).toBe('ValidationError');
            })
            .toss();


          /**
           * Getting existing todos with id
           */
          frisby.create('Getting created todos')
            .post(CREATE_URL, {
              'summary': 'Getting tests 1x34'
            })
            .expectStatus(200)
            .afterJSON(function(todo) {

              // We now get the list for the default container
              // and assuming this todo is part of it
              var expectedId = todo._id;
              var expectedSummary = todo.summary;

              frisby.create('just getting the default container')
                .get(CREATE_URL)
                .expectStatus(200)
                .afterJSON(function(todos) {
                  expect(todos.length > 0).toBe(true);

                  expect(todos.find(
                      function(elem) {
                        return (elem._id === expectedId);
                      })
                    .summary).toBe(expectedSummary);
                })
                .toss();

            })
            .toss();

          /**
           * Delete and check some wrong input cases 
           */

          frisby.create('Creating and Delete entry')
            .post(CREATE_URL, {
              'summary': 'To Delete',
              'description': 'a discription'
            })
            .expectStatus(200)
            .afterJSON(function(todo) {

              frisby.create('Delete with a non objectId returns 400')
                .delete(CREATE_URL + '/?todoId=notObjectId123456678888')
                .expectStatus(400)
                .after(function() {


                  frisby.create('Delete with a non existing objectId')
                    .delete(CREATE_URL + '/?todoId=57e4377989248e1cc98986f0')
                    .expectStatus(404)
                    .after(function() {


                      frisby.create('Delete the todo')
                        .delete(CREATE_URL + '/?todoId=' + todo._id)
                        .expectStatus(200)
                        .afterJSON(function(tododeleted) {
                          expect(tododeleted).not.toBe(null);
                          expect(tododeleted._id).toBe(json._id);
                          expect(tododeleted.state).toBe('deleted');
                        }).toss();
                    }).toss();
                }).toss();
            }).toss();



          /**
           * Update a todo
           */


          frisby.create('Put values')
            .post(CREATE_URL, {
              'summary': 'Put Values Test'
            })
            .expectStatus(200)
            .afterJSON(function(todo1) {

              // After create the todo update it
              // The empty parent array should be fixed to
              // include the default container.

              todo1.description = 'Update Description';
              todo1.color = 'orange';
              todo1.summary = 'Update Summary';
              todo1.parents = [];

              frisby.create('Updated Todos are returned')
                .put(CREATE_URL, todo1, {
                  json: true
                })
                .expectStatus(200)
                .afterJSON(function(todo2) {

                  // returned todo should equal given one
                  // The parent should be set back to
                  // default container
                  expect(todo2.summary).toBe(todo1.summary);
                  expect(todo2._id).toBe(todo1._id);
                  expect(todo2.parents.length).toBe(1);
                  expect(todo2.color).toBe('orange');
                  expect(todo2.description).toBe('Update Description');

                  // Now we have set the parent to a todo 
                  // which is not allowed because it is not a container
                  // and assume it will be resetted to the 
                  // default container
                  todo1.parents = [{
                    parentId: todo2._id
                  }];
                  todo1.color = 'red';

                  frisby.create('Wrong container type leads to default')
                    .put(CREATE_URL, todo1, {
                      json: true
                    })
                    .expectStatus(200)
                    .afterJSON(function(todo3) {
                      expect(todo3.summary).toBe(todo1.summary);
                      expect(todo3._id).toBe(todo1._id);
                      expect(todo3.parents.length).toBe(1);
                      expect(todo3.parents[0].parentId).toBe(todo2.parents[0].parentId);
                      expect(todo3.color).toBe('red');
                      expect(todo3.description).toBe('Update Description');
                      expect(todo3.users[0].userId).toBe(todo1.users[0].userId);

                      // Updateing the same valid todo3 
                      // should do no harm
                      frisby.create('Sending again is ok')
                        .put(CREATE_URL, todo3, {
                          json: true
                        })
                        .expectStatus(200)
                        .afterJSON(function(todo4) {
                          expect(todo4.summary).toBe(todo1.summary);
                          expect(todo4._id).toBe(todo1._id);
                          expect(todo4.parents.length).toBe(1);
                          expect(todo4.parents[0].parentId).toBe(todo2.parents[0].parentId);
                          expect(todo4.color).toBe('red');
                          expect(todo4.description).toBe('Update Description');
                          expect(todo4.users[0].userId).toBe(todo1.users[0].userId);

                          // Now we add some non schema valid informations
                          // and expect the server not to crash

                          todo4._id = 'not a valid id';

                          frisby.create('Wrong id leads to 400')
                            .put(CREATE_URL, todo4, {
                              json: true
                            })
                            .expectStatus(400)
                            .after(function() {

                              // we assume a provided state change
                              // will not be reflected (because it is
                              // not a respected field for this operation)
                              var tmpState = todo3.state;
                              todo3.state = 'deleted';
                              frisby.create('State information will not be processed')
                                .put(CREATE_URL, todo3, {
                                  json: true
                                })
                                .expectStatus(200)
                                .afterJSON(function(todo5) {
                                  todo3.state = tmpState;
                                  expect(JSON.stringify(todo3)).toBe(JSON.stringify(todo5));
                                }).toss();
                            })
                            .toss();
                        }).toss();
                    }).toss();
                }).toss();

            })
            .toss();



          /**
           * Checking transitions
           */

          frisby.create('Transition forth and back')
            .post(CREATE_URL, {
              'summary': 'Transition test',

            })
            .expectStatus(200)
            .afterJSON(function(todo) {
              expect(todo.state).toBe('open');

              frisby.create('Check Open right')
                .put(CREATE_URL + '/transition', {
                  todoId: todo._id,
                  direction: 'right'
                })
                .expectStatus(200)
                .afterJSON(function(todo) {
                  expect(todo.state).toBe('inProgress');

                  frisby.create('Check InProgress right')
                    .put(CREATE_URL + '/transition', {
                      todoId: todo._id,
                      direction: 'right'
                    })
                    .expectStatus(200)
                    .afterJSON(function(todo) {
                      expect(todo.state).toBe('done');

                      frisby.create('Check done right')
                        .put(CREATE_URL + '/transition', {
                          todoId: todo._id,
                          direction: 'right'
                        })
                        .expectStatus(200)
                        .afterJSON(function(todo) {
                          expect(todo.state).toBe('done');

                          frisby.create('Check done left')
                            .put(CREATE_URL + '/transition', {
                              todoId: todo._id,
                              direction: 'left'
                            })
                            .expectStatus(200)
                            .afterJSON(function(todo) {
                              expect(todo.state).toBe('inProgress');

                              frisby.create('Check inProgress left')
                                .put(CREATE_URL + '/transition', {
                                  todoId: todo._id,
                                  direction: 'left'
                                })
                                .expectStatus(200)
                                .afterJSON(function(todo) {
                                  expect(todo.state).toBe('open');

                                  frisby.create('Check open left')
                                    .put(CREATE_URL + '/transition', {
                                      todoId: todo._id,
                                      direction: 'left'
                                    })
                                    .expectStatus(200)
                                    .afterJSON(function(todo) {
                                      expect(todo.state).toBe('deleted');
                                    }).toss();
                                }).toss();
                            }).toss();
                        }).toss();
                    }).toss();
                }).toss();
            }).toss();
        }).toss();
    }).toss();
});