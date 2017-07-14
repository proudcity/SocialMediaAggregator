"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    Post = require(__base + 'model/Post'),
    Aggregator = require('../AggregatorController'),
    _ = require('lodash'),
    fs = require('fs');

exports.aggregateData = function(userName, agency) {
    var $that = this;

   Aggregator.runWithWatcher(user.name, agency.name, agency.name, 'socrata', agency.socrata.frequency, null, function(){
        $that.extractData(userName, agency.name, agency.socrata['feeds']);
    });
}

exports.extractData = function(userName, agencyName, criteria){
    var urlTasks = [];
    var $that = this;

    criteria.forEach(function(query){
        urlTasks.push(function(callback){

            $that.getLastPostDate(query.type, function(lastPostDate){
                $that.extractUrlPosts(query.query, lastPostDate, function(posts){
                    $that.savePosts(userName, agencyName, query.type, posts, callback);
                });
            });

        });
    });

    async.parallel(urlTasks, function(){
    });
}

exports.getLastPostDate = function(match, callback){
    Post.find({
        service: 'socrata',
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        return posts.length!=0 ? callback(posts[0].date) : callback(undefined);
    });
}

exports.extractUrlPosts = function(url, lastPostDate, callback){
    url += lastPostDate!=undefined ? "?$where=datetime > " + lastPostDate.toISOString() : "?$limit=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return callback(body);
        }
    });
}

exports.savePosts = function(userName, agencyName, match, posts, callback){

    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        _.forEach(posts, function(postInfo){
            postsTasks.push(function(callback){
                var post = {};

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo.casenumber;
                post.date = new Date(postInfo.datetime);
                post.date_extracted = new Date();
                post.service = 'socrata';
                post.account = '';
                post.match = match;
                post.image = '';
                post.text = postInfo.description;
                post.likes = 0;

                if(postInfo.location_1!=undefined){
                    post.loc = {
                        type : "Point",
                        coordinates : [parseFloat(postInfo.location_1.longitude), parseFloat(postInfo.location_1.latitude)],
                        address: postInfo.location_1.human_address
                    }
                } else {
                    post.loc = {};
                }

                post.url = "";
                post.icon = "";
                 Aggregator.savePost(post, callback);
            });
        });

        async.parallel(postsTasks, function(){
            callback();
        });

    } else {

        callback();

    }

}