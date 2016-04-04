var mongoose = require('mongoose'),
    _        = require('lodash'),
    config   = require('../config/config.js');

var ObjectId = mongoose.Schema.ObjectId;

var WatcherSchema = new mongoose.Schema({
    userName: String,
    agencyName: String,
    service: String,
    match: String
}, {
    collection: 'sma_procwatcher'
});

WatcherSchema.static('getWatcher', function(criteria, callback){
    this.findOne(criteria).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        return watcher ? callback(undefined, watcher) : callback(undefined, undefined);
    });
});

WatcherSchema.static('getWatcherSet', function(criteria, callback){
    this.find(criteria).exec(function (err, watchers) {
        if(err) {
            return callback(err);
        }
        return watchers ? callback(undefined, watchers) : callback(undefined, undefined);
    });
});

WatcherSchema.static('addInterval', function(watcher, criteria, callback){
    var saveWatcher = function() {
        watcher.save(function (saveErr) {
            if(saveErr) {
                return callback(saveErr);
            }
            else {
                return callback(undefined, watcher);
            }
        });
    }
    if(watcher && _.isObject(watcher)) {
        return saveWatcher();
    }
    this.getWatcher( criteria ).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        return saveWatcher();
    });
});

WatcherSchema.static('resetAll', function(callback){
    this.find().remove().exec(function(err) {
        if(err) {
            return callback(err);
        }
        console.log('deleted');
        return callback(undefined);
    });
});

WatcherSchema.static('resetAll', function(callback){
    this.find().remove().exec(function(err) {
        if(err) {
            return callback(err);
        }
        console.log('deleted');
        return callback(undefined);
    });
});

module.exports = mongoose.model('Watcher', WatcherSchema);