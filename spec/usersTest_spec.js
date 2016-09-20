var frisby = require('frisby');
var cleanMongo = require('clean-mongo');
var mongoose = require('mongoose');
var config = require('../config');
var User = require('../models/user');

var TEST_USER = 'testregister';
var TEST_PASSW = 'abcd';
var BASE_URL = 'http://localhost:6001/';
var REGISTER_URL = BASE_URL + 'users/register';
var LOGIN_URL = BASE_URL + 'users/login';

mongoose.connect('mongodb://localhost:27017/todoleejo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function () {
        console.log("OPEN");
        User.remove({ 'username': TEST_USER }, function (err, user) { });
        db.close();

});


describe('Register and Login ', function () {

        frisby.create('Register a user')
                .post(REGISTER_URL, {
                        'username': TEST_USER,
                        'password': TEST_PASSW
                })
                .expectStatus(200)
                .after(function (err, res, body) {
                        frisby.create('Register the same user twice should fail')
                                .post(REGISTER_URL, {
                                        'username': TEST_USER,
                                        'password': TEST_PASSW
                                })
                                .expectStatus(403)
                                .after(function (err, res, body) {
                                        frisby.create('After register a login is possible')
                                                .post(LOGIN_URL, {
                                                        'username': TEST_USER,
                                                        'password': TEST_PASSW
                                                })
                                                .expectStatus(200)
                                                .afterJSON(function (json) {
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


