"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    Aggregator = require('../AggregatorController'),
    Post = require(__base + 'model/Post'),
    _ = require('lodash'),
    fs = require('fs');

exports.aggregateData = function(user, agency) {
    var $that = this;

   Aggregator.runWithWatcher(user.name, agency.name, agency.name, 'foursquare', agency.foursquare.frequency, null, function(){
        $that.extractData(user, agency.name, agency.foursquare['feeds']);
    });
}

exports.extractData = function(user, agencyName, criteria){
    var urlTasks = [];
    var $that = this;

    criteria.forEach(function(query){
        urlTasks.push(function(callback){

            $that.extractFsquarePosts(user.lat, user.lng, query.query, function(posts){

                $that.queryPlaceDetails(user.lat, user.lng, query.query, posts, function(posts){

                    $that.getPlaceDetails(posts, function(posts){

                        $that.savePosts(user.name, agencyName, query.query, posts, callback);

                    });

                });

            });

        });
    });

    async.parallel(urlTasks, function(){
    });
}

exports.deletePreviousResults = function(username, match){
    Post.deleteByUserAndPlatformAndAccount(username, 'foursquare', match);
}

exports.extractFsquarePosts = function(lat, lng, query, callback){
    var url = "https://api.foursquare.com/v2/venues/explore?ll=" + lat + "," + lng + "&query=" + query;
    url += "&limit=" + config.app.postsLimit;
    url += "&radius=5000";
    url += "&venuePhotos=1";
    url += "&client_id=" + config.apps.foursquare.key + "&client_secret=" + process.env.FOURSQUARE_SECRET;
    url += "&v=20141020";

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);
            var posts = undefined;

            if(body!=null && body.response!=null && body.response.groups!=null){
                _.forEach(body.response.groups, function(group){
                    if(group.type == 'Recommended Places'){
                        posts = group.items;
                    }
                });
            }

            return callback(posts);
        }
    });
}

exports.queryPlaceDetails = function(lat, lng, type, posts, callback){
    var postsTasks = [];
    var updatedPosts = [];

    _.forEach(posts, function(post){
        postsTasks.push(function(callback){
            var url = "https://maps.googleapis.com/maps/api/place/textsearch/json?";

            url += "location=" + lat + "," + lng;
            url += "&radius=250";
            url += "&key=" + process.env.GOOGLE_SECRET;
            url += "&types=" + type;
            url += "&query=" + post.venue.name;

            request({
                url: url,
                method: 'GET'
            }, function(error, response, body) {
                if(error || !body || !response) {
                    callback();
                } else {
                    body = JSON.parse(body);
                    if(body.results.length!=0){
                        post.place_id = body.results[0].place_id;
                    }

                    updatedPosts.push(post);
                    callback();
                }
            });

        });
    });

    async.parallel(postsTasks, function(){
        callback(updatedPosts);
    });
}

exports.getPlaceDetails = function(posts, callback){
    var postsTasks = [];
    var updatedPosts = [];

    _.forEach(posts, function(post){
        postsTasks.push(function(callback){

            if(post.place_id!=undefined){
                var url = "https://maps.googleapis.com/maps/api/place/details/json?";

                url += "placeid=" + post.place_id;
                url += "&key=" + process.env.GOOGLE_SECRET;

                request({
                    url: url,
                    method: 'GET'
                }, function(error, response, body) {
                    if(error || !body || !response) {
                        callback();
                    } else {
                        body = JSON.parse(body);

                        if(body.status == 'OK' && body.result!=undefined){
                            post.website = body.result.website;
                            post.googleLocalHours  = body.result.opening_hours != undefined ? body.result.opening_hours.weekday_text.join('<br/>') : false;
                        }

                        updatedPosts.push(post);
                        callback();
                    }
                });
            }
        });
    });

    async.parallel(postsTasks, function(){
        callback(updatedPosts);
    });
}

exports.savePosts = function(userName, agencyName, match, posts, callback){
    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        posts.forEach(function(postInfo){
            postsTasks.push(function(callback){
                var post = {};

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo.venue!=undefined ? postInfo.venue.id : "";
                post.date = "";
                post.date_extracted = new Date();
                post.service = 'foursquare';
                post.account = '';
                post.match = '#' + match;
                post.website = postInfo.website;
                post.googleLocalHours = postInfo.googleLocalHours;

                if(postInfo.venue!=undefined && postInfo.venue.photos!=undefined && postInfo.venue.photos.groups!=undefined){
                    var photoGroup = postInfo.venue.photos.groups[0];
                    photoGroup = photoGroup!=undefined && photoGroup.items!=undefined && photoGroup.items.length!=0
                        ? photoGroup.items[0]
                        : undefined;

                    post.image = photoGroup!=undefined && photoGroup.suffix!=undefined && photoGroup.prefix!=0
                        ? photoGroup.prefix + '300x300' + photoGroup.suffix
                        : '';
                } else {
                    post.image = '';
                }


                post.text = postInfo.venue!=undefined & postInfo.venue.name!=undefined ? postInfo.venue.name : '';
                post.likes = postInfo.venue!=undefined && postInfo.venue.rating!=undefined ? postInfo.venue.rating : 0;

                if(postInfo.venue!=undefined && postInfo.venue.location!=undefined){
                    post.loc = {
                        type : "Point",
                        coordinates : [parseFloat(postInfo.venue.location.lng), parseFloat(postInfo.venue.location.lat)],
                        address: postInfo.venue.location.formattedAddress!=null && postInfo.venue.location.formattedAddress.length!=0
                            ? postInfo.venue.location.formattedAddress[0]
                            : ''
                    }
                } else {
                    post.loc = {};
                }


                post.url = 'https://foursquare.com/v/' + post.id;
                post.icon = '';

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