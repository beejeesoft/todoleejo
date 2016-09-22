var frisby = require('frisby');
var gc = require('./testConfig');


var TEST_USER = gc.TEST_USER_REGISTER;
var TEST_USER_LOGIN = gc.TEST_USER_LOGIN;
var TEST_PASSW = gc.TEST_PASSW;

var REGISTER_URL = gc.REGISTER_URL;
var LOGIN_URL = gc.LOGIN_URL;
var LOGOUT_URL = gc.LOGOUT_URL;


describe('Register and Login ', function() {


  frisby.create('Register a user')
    .post(REGISTER_URL, {
      'username': TEST_USER,
      'password': TEST_PASSW
    })
    .expectStatus(200)
    .after(function(err, res, body) {
      frisby.create('Register the same user twice should fail')
        .post(REGISTER_URL, {
          'username': TEST_USER,
          'password': TEST_PASSW
        })
        .expectStatus(403)
        .after(function(err, res, body) {
          frisby.create('After register a login is possible')
            .post(LOGIN_URL, {
              'username': TEST_USER,
              'password': TEST_PASSW
            })
            .expectStatus(200)
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


describe('Login tests', function() {

      frisby.create('Register as prepare the tests')
        .post(REGISTER_URL, {
          'username': TEST_USER_LOGIN,
          'password': TEST_PASSW
        })
        .expectStatus(200)
        .after(function() {
   
          frisby.create('Login without passwd').post(LOGIN_URL, {
              'username': TEST_USER_LOGIN
            })
            .expectStatus(401)
            .toss();

          frisby.create('Login without user and password')
            .post(LOGIN_URL, {})
            .expectStatus(401)
            .toss();

          frisby.create('Login with wrong Passwd')
            .post(LOGIN_URL, {
              'username': TEST_USER_LOGIN,
              'password': TEST_PASSW + 'x'
            })
            .expectStatus(401)
            .toss();

          frisby.create('Login without user and wrong Passwd')
            .post(LOGIN_URL, {
              'username': '',
              'password': TEST_PASSW + 'x'
            })
            .expectStatus(401)
            .toss();

          frisby.create('Login with correct password')
            .post(LOGIN_URL, {
              'username': TEST_USER_LOGIN,
              'password': TEST_PASSW
            })
            .expectStatus(200)
            .toss();
        })
        .toss();
});

describe('Logout test', function(){
        frisby.create('Check if logout sends 200')
        .get(LOGOUT_URL)
        .expectStatus(200)
        .toss();
});
