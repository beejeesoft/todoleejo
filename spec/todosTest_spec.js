var frisby = require('frisby');
var gc = require('./testConfig');



var TEST_USER = gc.TEST_USER_TODO;
var TEST_PASSW = gc.TEST_PASSW;


var CREATE_URL = gc.TODO_URL;

var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;

describe('Create a todo ', function() {


  frisby.create('Todo Tests register a user')
    .post(REGISTER_URL, {
      'username': TEST_USER,
      'password': TEST_PASSW
    })
    .expectStatus(200)
    .after(function(err, res, body) {

      frisby.create('Todo Tests Login')
        .post(LOGIN_URL, {
          'username': TEST_USER,
          'password': TEST_PASSW
        })
        .expectStatus(200)
        .afterJSON(function(jsonLogin) {
          console.log('CreateURL:' + CREATE_URL);
          console.log("token: " + jsonLogin.token);

          frisby.globalSetup({ // globalSetup is for ALL requests
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
              console.log(todo);
              expect(todo).not.toBe(null);
              expect(todo.isContainer).toBe(false);
              expect(todo.parents.length).toBe(1);
              expect(todo.users.length).toBe(1);
            })
            .toss();

          frisby.create('Createing new entry without summary throws a ValidationError')
          .post(CREATE_URL, {'description':'Bad Idea'})
          .expectStatus(422)
          .afterJSON(function(json){
            console.log(json);
          })
          .toss();



        })
        .toss();
    })
    .toss();
});

/*   
            .afterJSON(function(json) {
              expect(json.status).toBe('Login successful!');
              expect(json.success).toBe(true);
              expect(json.token).toBeDefined();
              expect(json.token).not.toBe(null);
              expect(json.token.length).toBeGreaterThan(0);
            })
            .toss();
        })
        .toss();
    })
    .toss();

});

*/