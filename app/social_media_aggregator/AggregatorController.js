"use strict";

var _ = require('lodash'),
  config = require(__base + 'config/config'),
  logger = require(__base + 'config/logger'),
  FacebookAggregator = require('./data_extractors/FacebookAggregator'),
  TwitterAggregator = require('./data_extractors/TwitterAggregator'),
  InstagramAggregator = require('./data_extractors/InstagramAggregator'),
  YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
  SocrataAggregator = require('./data_extractors/SocrataAggregator'),
  FoursquareAggregator = require('./data_extractors/FoursquareAggregator'),
  SeeClickFixAggregator = require('./data_extractors/SeeClickFixAggregator'),
  RSSAggregator = require('./data_extractors/RSSAggregator'),
  ICalendarAggregator = require('./data_extractors/ICalendarAggregator'),
  YelpAggregator = require('./data_extractors/YelpAggregator'),
  GtfsAggregator = require('./data_extractors/GtfsAggregator'),
  ElectionPollingAggregator = require('./data_extractors/ElectionPollingAggregator'),
  User = require(__base + 'model/User'),
  Post = require(__base + 'model/Post'),
  Watcher = require(__base + 'model/Watcher');

var CRITERIA_TYPE = {
  HASHTAG: 'hashtag',
  ACCOUNT: 'account'
}

const TIMEOUT_VAL = 300000;

// Tracks currently staggered services
// internal = count (number of that service) and values (offset in ms)
var staggering = {
  // looks like
  // facebook: {
  //   value: x in ms,
  //   count: x as int
  // }
};

/**
 * Updates our staggering counts for interval spacing
 * 
 * @param model/User user 
 */
function updateStaggering(user) {
  _.forEach(user.agencies, function (agency) {
    for (let key in agency) {
      if (agency[key] && agency[key].feeds && agency[key].feeds.length) {
        staggering[key] = staggering[key] || {
          value: 0,
          count: 0
        };

        // @TODO theres an bug where updating a social agg will increase the count
        // unnecessarily by the ageny count
        staggering[key].count = staggering[key].count + agency[key].feeds.length;
      }
    }
  });
}

/**
 * Resets staggering to values 0 across the board when the initial queueing is complete
 */
function resetStaggering() {
  Object.keys(staggering).forEach(function (key) {
    staggering[key].value = 0;
  });
}

/**
 * Kicks off everything
 */
exports.startExecution = function () {
  var $that = this;
  // Reset watcher list on run
  Watcher.resetAll(function () {
    $that.extractData();
  });
}

/**
 * Runs execution on a interval
 * 
 * @param int timeout 
 * @param string platform 
 * @param func run 
 */
exports.runWithInterval = function (timeout, platform, run) {
  // Timeout
  timeout = staggering[platform].count * timeout;

  // Deal with artbitrary node timeout limit
  if (timeout > 2000000000) {
    timeout = 2000000000;
  }

  run(timeout, true);

  // Set interval
  return setInterval(function () {
    run(timeout);
  }, timeout);
}

/**
 * Runs execution based on watcher object in database
 * Will not run again if already running
 * 
 * @param string userName 
 * @param string agencyName 
 * @param string match 
 * @param string platform 
 * @param int timeout 
 * @param func authenticate 
 * @param func execute 
 */
exports.runWithWatcher = function (userName, agencyName, match, platform, timeout, authenticate = null, execute) {
  var $that = this;

  // Override timeout to just be evenly spaced
  timeout = TIMEOUT_VAL;
  staggering[platform].value = staggering[platform].value + timeout;

  setTimeout(function () {

    var addCriteria = function (criteria) {
      criteria = criteria || {};
      criteria['userName'] = userName;
      criteria['agencyName'] = agencyName;
      criteria['match'] = match;
      criteria['service'] = platform;
      return criteria
    }

    var criteria = addCriteria();

    // Get running, or create new
    Watcher.getWatcher(criteria, function (err, watcher) {
      if (err) {
        return logger.log('error', 'Error running watcher for account: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
      }
      // No watcher, so create one
      else if (!watcher || !_.isObject(watcher)) {
        watcher = new Watcher();
        watcher = addCriteria(watcher);
      }
      // Not running yet, so run
      if (!Watcher.isRunning(watcher)) {
        var interval = $that.runWithInterval(timeout, platform, function watcherRunner(intervalTime, immediate = false) {

          // Attempt to update watcher values
          const now = new Date();
          const next = new Date(now.getTime() + intervalTime);

          watcher.lastRun = now;
          watcher.nextRun = next

          // If not immediate callback from runWithInterval
          if (!immediate) {
            try {
              watcher.save();
            } catch (watcherSaveError) { 
              logger.log('failed to update watcher %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
            }
          }

          // Function to run
          var executeQuery = function () {
            if (authenticate != null) {
              authenticate(function () {
                logger.log('authenticate: execute %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
                execute();
              });
            } else {
              logger.log('NO authenticate: execute: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
              execute();
            }
          };

          executeQuery();
        });

        Watcher.addInterval(watcher, interval, null, function (addErr, watcher) {
          if (addErr) {
            return logger.log('error', 'Error running watcher for account: %s, user: %s, agency: %s, service: %s --', match, userName, agencyName, platform, addErr.message);
          }
          logger.log('info', 'Success running watcher for account: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
        });
      }
    });
  }, staggering[platform].value);
}

/**
 * Extracts data for user feeds
 * 
 * @param model/User user 
 */
var extractDataForUser = function (user) {
  _.forEach(user.agencies, function (agency) {
    if (agency.facebook["feeds"].length) {
      FacebookAggregator.aggregateData(user.name, agency);
    }

    if (agency.twitter["feeds"].length) {
      TwitterAggregator.aggregateData(user.name, agency);
    }

    // @TODO Instagram not currently working
    // 1-30-19
    // if (agency.instagram['feeds'].length) {
    //   InstagramAggregator.aggregateData(user.name, agency);
    // }

    if (agency.youtube['feeds'].length) {
      YoutubeAggregator.aggregateData(user.name, agency);
    }

    if (agency.socrata['feeds'].length) {
      SocrataAggregator.aggregateData(user.name, agency);
    }

    if (agency.foursquare['feeds'].length) {
      FoursquareAggregator.aggregateData(user, agency);
    }

    if (agency.seeclickfix['feeds'].length) {
      SeeClickFixAggregator.aggregateData(user, agency);
    }

    if (agency.rss['feeds'].length) {
      RSSAggregator.aggregateData(user, agency);
    }

    if (agency.ical['feeds'].length) {
      ICalendarAggregator.aggregateData(user, agency);
    }

    if (agency.yelp['feeds'].length) {
      YelpAggregator.aggregateData(user, agency);
    }

    if (agency.gtfs['feeds'].length) {
      GtfsAggregator.aggregateData(user, agency);
    }

    if (agency.election['feeds'].length) {
      ElectionPollingAggregator.aggregateData(user, agency);
    }

  });
};


/**
 * Runs extract data for either single user or all users
 * 
 * @param model/User user 
 */
exports.extractData = function (user = null, callback) {
  logger.log('info', 'Running data aggregators');
  callback = callback || function () { };
  // Aggregate for 1
  if (user) {
    updateStaggering(user);
    extractDataForUser(user);
    callback();
  }
  // Do them all
  else {
    User.allUsers(function (err, users) {
      // First update staggering
      _.forEach(users, function (user) {
        updateStaggering(user);
      });
      // Start aggregation
      _.forEach(users, function (user) {
        logger.log('info', 'extracting for:', user.name);
        extractDataForUser(user);
      });
      resetStaggering();
      callback();
    });
  }
}

/**
 * Helper gets search criteria for children aggregators
 * 
 * @param string userName 
 * @param string agencyName 
 * @param object queryList 
 * @param string platform 
 * @param func callback 
 */
exports.gatherSearchCriteria = function (userName, agencyName, queryList, platform, callback) {
  var criteriaList = queryList["feeds"] || [];
  if (criteriaList.length && _.isArray(criteriaList)) {
    var searchCriteria = {
      tags: [],
      accounts: [],
      url: []
    };

    _.map(criteriaList, function (criteria) {
      var criteriaType = criteria.type;

      if (criteriaType === CRITERIA_TYPE.HASHTAG) {
        searchCriteria.tags.push({
          "name": criteria.query,
          "frequency": criteria.frequency != undefined && criteria.frequency != "" ? criteria.frequency : queryList.frequency
        });
      } else if (criteriaType === CRITERIA_TYPE.ACCOUNT) {
        searchCriteria.accounts.push({
          "name": criteria.query,
          "frequency": criteria.frequency != undefined && criteria.frequency != "" ? criteria.frequency : queryList.frequency
        });
      }
    });

    logger.log('info', 'Gathered search criteria for user: %s, agency: %s, service: %s', userName, agencyName, platform);
    return callback(searchCriteria);
  }
}

/**
 * Helpers saves a post
 * 
 * @param object post 
 * @param func callback 
 */
exports.savePost = function (post, callback) {
  let toSave = _.assignIn(new Post(), post);
  toSave.save().then(
    (newPost) => {
      // logger.log(
      //     'info', 
      //     'Saved _id: %s, name: %s, agency: %s, service: %s', 
      //     newPost._id, post.userName, post.agencyName, post.service
      // );
      callback();
    }
  )
    .catch(
      (reason) => {
        logger.log('error', reason.errmsg);
        callback();
      }
    );
}