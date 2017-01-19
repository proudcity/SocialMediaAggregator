var _ = require('lodash'),
    path = require('path'),
    fs = require('fs');

// Load ENV, if available
var path = './.env';
if(fs.existsSync(path)) {
  require('dotenv').config({path: path});
}

// Get Mongo connection info
var mongo_db =  process.env.DB_CONNECTION ? process.env.DB_CONNECTION : '';
if(!mongo_db) {
  mongo_db = process.env.MONGO_PORT_27017_TCP_ADDR
        ? "mongodb://" + process.env.MONGO_PORT_27017_TCP_ADDR + ":" + process.env.MONGO_PORT_27017_TCP_PORT + "/socialmediaaggregator"
        : "mongodb://localhost:27017/socialmediaaggregator";
}

module.exports = {
    "port": process.env.PORT ? process.env.PORT : 80,
    "https_port": process.env.HTTPS_PORT ? process.env.HTTPS_PORT : 443,
    "db": mongo_db,
    "app": {
        "frequency": 3600,
        "postsLimit": 10,
        "feedLimit": 5,
        "logging_level": "debug"
    },
    "apps": {
        "twitter": {
            "key": "zm1Xhonwx2cy7Uv4TAp7WwsAB"
        },
        "facebook": {
            "key": "1020627834636909",
        },
        "instagram": {
            "key": "2f086e0ff067457d8436487aa3687808",
            "redirectUri": "/instagram/authcallback"
        },
        "foursquare" : {
            "key": "1CAZ5UW5UDQ2F1EDEHFOULURU4K3RBWWITBOONJ2XLXPD52V"
        },
        "yelp" : {
            "consumer_key": "DQ1s8oBXcE3sjYLBB6BX9w",
            "token": "rVH7LgayRFrGQf-p43lT71d9wzswQrXJ"
        }
    }
}