var express = require('express'),
    request = require('request'),
    User    = require('../../model/User'),
    Post    = require('../../model/Post'),
    config  = require('../../config/config.js'),
    async   = require('async'),
    fs      = require('fs'),
    _       = require('lodash'), 
    router = express.Router();


router.route('/info')
    .get(function(req, res) {
        // Check if user already exists
        User.allUsers(function(findErr, users) {
            if(findErr) {
                res.status(500).json(findErr);
            }
            else {
                res.json(users);
            }
        });
    });

router.route('/:user/info')
    .get(function(req, res) {
        // Check if user already exists
        User.findUser(_.get(req, 'params.user'), function(findErr, user) {
            if(findErr) {
                res.status(500).json(findErr);
            }
            else {
                res.json(user);
            }
        });
    });

// Limits results to results per service
var limitReturn = function(postsList, limit, callback) {
    // First trim empty
    postsList = _.transform(postsList, function(result, posts) {
        if(posts && _.isArray(posts) && posts.length) {
            result.push(posts);
        }
    }, []);
    // empty?
    if(!postsList.length) {
        return callback(null, []);
    }
    // Then limit per post count
    var partLimit = Math.ceil(limit/postsList.length);
    postsList = _.transform(postsList, function(result, posts) {
        result.push(_.take(posts, partLimit));
    }, []);
    // Then flatten array, take limit
    callback( null, _.take( _.flatten(postsList), limit) );
}

// Returns array
var getPostsFromUserAsync = function(userName, agencyName, limit, services, postsList) {
    services = services || ['facebook', 'twitter', 'instagram', 'youtube'];
    var asyncTasks = [];
    _.forEach(services, function(service) {
        var criteria = {
            service: service,
            userName: userName
        }
        if(agencyName) {
            criteria['agencyName'] = agencyName;
        }
        asyncTasks.push(function(callback){ 
            Post.getLatest(criteria, limit, function(posts){
                postsList.push(posts);
                callback();
            })
        });
    });
    return asyncTasks;
};

router.route('/:user/feed')
    .get(function(req, res) {
        var limit       = _.get(req, 'query.limit') || 10,
            userName    = _.get(req, 'params.user'),
            agencyName  = _.get(req, 'query.agency'),
            services    = _.get(req, 'query.services');

        if(userName!=undefined) {
            // Alter services if necessary
            if (services!=undefined && !_.isArray(services)){
                services = services.split(",");
            }
            // Prep async
            var postsList  = [],
                asyncTasks = getPostsFromUserAsync(
                    userName, agencyName, limit, services, postsList
                );
            // Run async
            async.parallel(asyncTasks, function(){
                // Process results
                limitReturn(postsList, limit, function(limitError, posts) {
                    if(limitError) {
                        res.status(500).json({ error: 'message' });
                    }
                    else {
                        res.json(posts);
                    }
                }) 
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });

// Returns array
var getPostsFromAccountsAsync = function(userName, limit, accounts, postsList) {
    var asyncTasks = [];
    _.forEach(accounts, function(account) {
        var colon   = account.indexOf(':'), 
            service = account.substring(0, colon), 
            name    = account.substring(colon + 1),
            criteria = {
                service: service,
                account: name,
                userName: userName
            };
        asyncTasks.push(function(callback){ 
            Post.getLatest(criteria, limit, function(posts){
                postsList.push(posts);
                callback();
            })
        });
    });
    return asyncTasks;
};

router.route('/:user/feed/accounts/:accounts')
    .get(function(req, res) {
        var limit     = _.get(req, 'query.limit') || 10,
            userName  = _.get(req, 'params.user'),
            accounts  = _.get(req, 'params.accounts');
        if(accounts!=undefined) {
            if(!_.isArray(accounts)) {
                accounts = accounts.split(",");
            }
            // Prep async
            var postsList  = [],
                asyncTasks = getPostsFromAccountsAsync(
                    userName, limit, accounts, postsList
                );
            // Run async
            async.parallel(asyncTasks, function(){
                // Process results
                limitReturn(postsList, limit, function(limitError, posts) {
                    if(limitError) {
                        res.status(500).json({ error: 'message' });
                    }
                    else {
                        res.json(posts);
                    }
                }) 
            });        }
        else {
            res.status(500).json({ error: 'Sorry, that query returned no results' });
        }
    });
    

module.exports = router;