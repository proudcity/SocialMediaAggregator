var mongoose = require('mongoose'),
    _        = require('lodash'),
    config   = require('../config/config.js');

var ObjectId = mongoose.Schema.ObjectId,
    Mixed    = mongoose.Schema.Types.Mixed;

var WatcherSchema = new mongoose.Schema({
    userName: String,
    agency: String,
    service: String,
    match: String,
    intervalID: {type: Mixed}
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

WatcherSchema.static('addInterval', function(watcher, criteria, intervalID, callback){
    var saveWatcher = function() {
        watcher.intervalID = _.omit(intervalID, ['_idlePrev', '_idleNext']);
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
        return callback(undefined);
    });
});

module.exports = mongoose.model('Watcher', WatcherSchema);