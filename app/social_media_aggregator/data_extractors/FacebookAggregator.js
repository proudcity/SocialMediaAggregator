"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    FB = require('fb'),
    Aggregator = require('../AggregatorController'),
    Post = require(__base + 'model/Post');

var session = {};
var searchCriteria = {};

var extractedPosts = [];
var bufferedPages = [];
var bufferedPagesInExec = [];

exports.aggregateData = function(userName, agency) {
    var $that = this;

   Aggregator.gatherSearchCriteria(userName, agency.name, agency.facebook, 'facebook', function(criteria){
        searchCriteria = criteria;

        $that.extractData(userName, agency.name, criteria);
    });
}

exports.authenticate = function(callback){
    FB.api('oauth/access_token', {
        client_id: config.apps.facebook.key,
        client_secret: process.env.FACEBOOK_SECRET,
        grant_type: 'client_credentials'
    }, function (res) {
        logger.log('info',"Authentication to Facebook was successful!");

        session.access_token    = res.access_token;
        session.expires         = new Date().getTime() + (res.expires || 0) * 1000;

        return callback();
    });

}

exports.ensureAuthenticated = function(callback){
    var $that = this;
    this.isSessionValid(function(sessionValid){
        if(sessionValid){
            return callback();
        } else {
            logger.log('info',"Facebook session not valid");
            $that.authenticate(function(){
                return callback();
            });
        }
    });
}

exports.isSessionValid = function(callback){
    var $that = this;
    var accessTokenNotExpired = session.access_token!=null && new Date().getTime() - session.expires > 0;
    if(accessTokenNotExpired){
        FB.api('facebook?access_token=' + session.access_token, function (res) {
            if(!res || res.error) {
                return callback(false);
            }

            return callback(true);
        });
    } else {
        return callback(false);
    }
}

exports.extractData = function(userName, agencyName, criteria){
    var $that = this;

    criteria.accounts.forEach(function(account){
        Aggregator.runWithWatcher(userName, agencyName, '@' + account.name, 'facebook', account.frequency, null, function(){
            $that.ensureAuthenticated(function(){
                $that.extractProfilePosts(userName, agencyName, account.name, function(){});
            })
        });
    });
}

exports.extractProfilePosts = function(userName, agencyName, profile, callback){
    logger.log('info',"Extracting data from Facebook profile %s", profile);

    var $that = this;

    $that.getLastPostTime('@' + profile, function(lastPostTime){

        $that.extractPostsInfo(userName, agencyName, profile, lastPostTime, function(){

            var asyncTasks = [];

            extractedPosts.forEach(function(post){

                asyncTasks.push(function(callback){

                    $that.extractPostsLikes(post, function(post){

                        $that.extractPostLocation(post, function(post){

                            $that.savePost(post, callback);

                        });

                    });
                });
            });

            async.parallel(asyncTasks, function(){
                callback();
            });
        });
    });
}

// will query the db to get the laast post datetime for a profile
exports.getLastPostTime = function(match, callback){
    Post.getLastPostTime('facebook', match, function(lastPostTime){
        return callback(lastPostTime);
    });
}

// extracts id, message, creted_time, icon, link
exports.extractPostsInfo = function(userName, agencyName, profile, lastPostTime, callback){
    var $that = this;
    var url = profile + '/posts?fields=id,message,picture,full_picture,created_time,icon,link';
    url += '&access_token=' + session.access_token;
    url += lastPostTime!=undefined ? "&since=" + lastPostTime : "";
    url += "&limit=" + config.app.postsLimit;

    FB.api(url, function (res) {
        if(!res || res.error) {
            $that.handleError(res.error.code, res.error.message, function(){
                return $that.extractPostsInfo(userName, agencyName, profile, lastPostTime, callback);
            });
        }

        if(res!=undefined && res.data!=undefined && res.data.length!=0){
            for(var i in res.data){
                var entry = res.data[i];

                entry.service = "facebook";
                entry.profile = profile;
                entry.match = "@" + profile;
                entry.userName = userName;
                entry.agencyName = agencyName;

                extractedPosts.push(entry);
            }

            if(res.paging!=undefined && res.paging.next!=undefined){
                bufferedPages.push({
                    profile: profile,
                    userName: userName,
                    agencyName: agencyName,
                    url: res.paging.next
                });
            }

            return callback();
        }

        return;

    });
}

exports.extractPostsFromBufferedPages = function(){
    var $that = this;

    if(bufferedPages.length!=0){
        bufferedPagesInExec = [];
        extractedPosts = [];

        var bufferedPagesTasks = [];

        bufferedPages.forEach(function(bufferedPage){
            bufferedPagesTasks.push(function(callback){

                $that.extractNextInfo(bufferedPage, function(){
                    var asyncTasks = [];

                    extractedPosts.forEach(function(post){

                        asyncTasks.push(function(callback){

                            $that.extractPostsLikes(post, function(post){

                                $that.savePost(userName, agencyName, post, callback);

                            });

                        });
                    });

                    async.parallel(asyncTasks, function(){
                        callback();
                    });

                });

            });
        });

        async.parallel(bufferedPagesTasks, function(){

            bufferedPages = [];
            $that.extractPostsFromBufferedPages();

        });
    }
}

exports.extractNextInfo = function(bufferedPage, callback){
    var $that = this;

    request({
        uri: bufferedPage.url,
        method: "GET"
    }, function(error, response, body) {
        if(error) {
            $that.handleError(error.code, error.message, function(){
                return $that.extractNextInfo(bufferedPage, callback);
            });
        }

        if(body) {
            body = JSON.parse(body);

            if(body!=undefined && body.data!=undefined && body.data.length!=0){
                for(var i in body.data){
                    var entry = body.data[i];

                    entry.service = "facebook";
                    entry.profile = bufferedPage.profile;
                    entry.match = "@" + bufferedPage.profile;
                    entry.userName = bufferedPage.userName;
                    entry.agencyName = bufferedPage.agencyName;
                    extractedPosts.push(entry);
                }

                if(body.paging!=undefined && body.paging.next!=undefined){
                    bufferedPagesInExec.push({
                        profile: bufferedPage.profile,
                        userName: bufferedPage.userName,
                        agencyName: bufferedPage.agencyName,
                        url: body.paging.next
                    });
                }

                return callback();
            }
        }

        return;
    });
}

// extracts likes
exports.extractPostsLikes = function(post, cb){
    var $that = this;

    FB.api(post.id + '/likes?summary=true&access_token=' + session.access_token, function (res) {

        if(!res || res.error) {
            $that.handleError(res.error.code, res.error.message, function(){
                return $that.extractPostsLikes(post, cb);
            });
        }

        if(res!=undefined && res.summary!=undefined){
            post.likes = res.summary.total_count;
        }

        return cb(post);
    });
}

// extracts location
exports.extractPostLocation = function(post, cb){
    var $that = this;

    FB.api(post.id + '?summary=true&fields=place&access_token=' + session.access_token, function (res) {

        if(!res || res.error) {
            $that.handleError(res.error.code, res.error.message, function(){
                return $that.extractPostLocation(post, cb);
            });
        }

        if(res!=undefined && res.place!=undefined  && res.place.id!=undefined){

            FB.api(res.place.id + '?summary=true&fields=location&access_token=' + session.access_token, function (res) {
                if(res!=undefined && res.location!=undefined){

                    post.loc = {
                        type: 'Point',
                        coordinates: [res.location.longitude, res.location.latitude],
                        address: extractAddress(res.location)
                    }
                }

                return cb(post);
            });
        } else {
            return cb(post);
        }

    });
}

var extractAddress = function(position){
    var addr = "";
    addr += "street: " + position.street + ", ";
    addr += "state: " + position.state + ", ";
    addr += "zip: " + position.zip + ", ";
    addr += "region: " + position.region + ", ";
    addr += "city: " + position.city + ", ";
    addr += "country: " + position.country;

    return addr;
}

// saves the post into the db
exports.savePost = function(postInfo, callback) {
    var post = {};
    post.userName = postInfo.userName;
    post.agencyName = postInfo.agencyName;
    post.id = postInfo.id;
    post.date = new Date(postInfo.created_time);
    post.date_extracted = new Date();
    post.service = postInfo.service;
    post.account = postInfo.profile;
    post.match = postInfo.match;
    post.icon = postInfo.icon;
    post.url = postInfo.link;
    post.text = postInfo.message;
    post.likes = postInfo.likes;
    post.image = postInfo.full_picture || postInfo.picture;

    Aggregator.savePost(post, callback);
}

exports.handleError = function(errCode, errMessage, nextAction){
    var $that = this;
    switch (errCode) {
        // access_token expired
        case 102:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // access_token expired
        case 104:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // access_token expired
        case 190:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // access_token expired
        case 463:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // access_token expired
        case 467:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // OAuthException
        case 190:
            $that.errorHandlers.handleExpiredToken(errCode, nextAction);
            break;
       

        // OAuthException
        case 191:
            logger.log('error',"Error %s occurred: %s",errCode, errMessage);
            break;
       

        // Bad search key
        case 803:
            logger.log('error', errMessage);
            break;
       

        default:
            logger.log('error',"Failed to handle error %s: %s", errCode, errMessage);
    }
}


var $that = this;

exports.errorHandlers = {
    handleExpiredToken: function(errCode, nextAction){
        logger.log('info',"%s: handling expired access_token", errCode);
        $that.authenticate(nextAction);
    }
}