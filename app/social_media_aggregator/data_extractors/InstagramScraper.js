var request = require('request');
var path    = require('path');
var qs      = require('querystring');
var url     = require('url');
var config = require(__base + 'config/config');
var logger = require(__base + 'config/logger');

module.exports = function(username, minId, callback) {
  return new Scraper(username).crawl(minId, callback);
};

function Scraper(token) {
  this.token = token;
  this.baseUrl = 'https://api.instagram.com/v1/users/self/media/recent/?access_token=' + token;
}

Scraper.prototype.crawl = function(minId, callback) {
  var url  = this.baseUrl;
  if(minId) {
    url += '&' + qs.stringify({min_id: minId});
  }
  logger.log('info', 'Instagram crawler url: %s', url);
  if (this.baseUrl.indexOf('access_token=undefined') !== -1) {
    return logger.log('info', 'Instagram missing access token, skipping: %s', url);
  }
  request({
      url: url,
      method: 'GET'
  }, function(error, response, body) {
      if(error) {
        return callback(error);
      } else if(!body) {
        return callback('No body');
      } else if(!response) {
        return callback('No response');
      } else {
        try {
           body = JSON.parse(body);
        }
        catch (e) {
          // statements to handle any exceptions
          logger.log('error', 'Instragram scraping malformed json: %s', url, e );
        }
        return body.data!=undefined && body.data.length!=0 ? callback(null, body.data) : callback('No items');
      }
  });
}