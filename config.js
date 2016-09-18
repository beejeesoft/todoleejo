
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv

var local_mongo_conn_str = 'mongodb://localhost:27017/todoleejo';

var cfenv = require('cfenv');

exports.getMongoConnection = function (req, res, next) {

    var mongo = process.env.VCAP_SERVICES;
    var port = process.env.PORT || 3030;
    
    if (mongo) {
        var env = JSON.parse(mongo);
        if (env['mongodb']) {
            mongo = env['mongodb'][0]['credentials'];
            if (mongo.url) {
                console.log("Found mongodb: " + mongo.url);
                return mongo.url;
            } else {
                console.log("No mongo Url specified. Check service on bluemix");
            }
        }
    }

    console.log("connect to default local mongodb: " + local_mongo_conn_str);
    return local_mongo_conn_str;
};