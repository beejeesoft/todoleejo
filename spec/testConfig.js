var BASE_URL = 'http://localhost:6001/';
var REGISTER_URL = BASE_URL + 'users/register';

var LOGIN_URL = BASE_URL + 'users/login';
var TODO_URL = BASE_URL + 'todos';
var LOGOUT_URL = BASE_URL + 'users/logout';
var MONGO_BASE = 'mongodb://localhost:27017';
var TEST_USER_REGISTER = 'testregister';
var TEST_USER_LOGIN = 'testlogin';
var TEST_PASSW = 'abcd';
var TEST_USER_TODO = 'testtodouser';

var USER_TO_DELETE = [TEST_USER_TODO,TEST_USER_LOGIN, TEST_USER_REGISTER];

exports.USER_TO_DELETE = USER_TO_DELETE;
exports.REGISTER_URL = REGISTER_URL;
exports.LOGIN_URL = LOGIN_URL;
exports.LOGOUT_URL = LOGOUT_URL;
exports.TODO_URL = TODO_URL;
exports.REGISTER_URL = REGISTER_URL;
exports.TEST_USER_LOGIN = TEST_USER_LOGIN;
exports.TEST_PASSW = TEST_PASSW;
exports.TEST_USER_TODO = TEST_USER_TODO;
exports.TEST_USER_REGISTER = TEST_USER_REGISTER;
exports.BASE_URL = BASE_URL;
exports.MONGO_BASE = MONGO_BASE;