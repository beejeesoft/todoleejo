var frisby = require('frisby');
var gc = require('./testConfig');



var TEST_USER = gc.TEST_USER_TODO;
var TEST_PASSW = gc.TEST_PASSW;


var CREATE_URL = gc.TODO_URL;

var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;

describe('Create a todo ', function() {


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

          frisby.create('Creating new entry')
            .post(CREATE_URL, {
              'summary': 'A summary',
              'description': 'a discription'

            })
            .expectStatus(200)
            .afterJSON(function(todo) {
              //console.log(todo);
              expect(todo).not.toBe(null);
              expect(todo.isContainer).toBe(false);
              expect(todo.parents.length).toBe(1);
              expect(todo.users.length).toBe(1);
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


          frisby.create('Creating and Delete entry')
            .post(CREATE_URL, {
              'summary': 'To Delete',
              'description': 'a discription'
            })
            .expectStatus(200)
            .afterJSON(function(todo) {

              frisby.create('Delete with a non objectId 400')
                .delete(CREATE_URL, {
                  todoId: 'notObjectId123456678888'
                })
                .expectStatus(400)
                .after(function() {


                  frisby.create('Delete with a non existing objectId')
                    .delete(CREATE_URL, {
                      todoId: "57e4377987348e1cc98986f0"
                    })
                    .expectStatus(404)
                    .after(function() {


                      frisby.create('Delete the todo')
                        .delete(CREATE_URL, {
                          todoId: todo._id
                        })
                        .expectStatus(200)
                        .afterJSON(function(tododeleted) {
                          expect(tododeleted).not.toBe(null);
                          expect(tododeleted._id).toBe(json._id);
                          expect(tododeleted.state).toBe('deleted');
                        }).toss();
                    }).toss();
                }).toss();
            }).toss();


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