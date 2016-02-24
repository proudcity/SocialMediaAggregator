var mongoose = require('mongoose'),
    config = require('../config/config.js');

var ObjectId = mongoose.Schema.ObjectId;

var WatcherSchema = new mongoose.Schema({
    frequency: Number,
    userName: String,
    service: String,
    match: String,
    intervalID: {type: Number, unique : true}
}, {
    collection: 'sma_watchers'
});

WatcherSchema.static('getWatcher', function(criteria, callback){
    this.findOne(criteria).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        return watcher ? callback(undefined, watcher) : callback(undefined, undefined);
    });
});

WatcherSchema.static('addInterval', function(userName, match, service, intervalID, callback){
    this.getWatcher( { '_id': id } ).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        watcher.intervalID = intervalID;
        watcher.save(function (saveErr) {
            if(saveErr) {
                return callback('Save error');
            }
            else {
                return callback(undefined, watcher);
            }
        });
    });
});

WatcherSchema.static('reset', function(criteria, callback){
    this.find().remove().exec(function(err) {
        if(err) {
            return callback(err);
        }
        return callback(undefined);
    });
});