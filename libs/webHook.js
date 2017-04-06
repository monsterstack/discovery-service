'use strict';
const needle = require('needle');
const debug = require('debug')('discovery-web-hook');
const Promise = require('promise');

/**
 * WebHook
 */
class WebHook {
  constructor(options) {
    this.url = options.url;
  }

  emit(title, data) {
    let p = new Promise((resolve, reject) => {
      needle.post(this.url, this.asText(title, data), {}, (error, response) => {
        if (error) {
          debug(error);
          reject(error);
        } else {
          debug(response.body);
          resolve(response.body);
        }
      });
    });

    return p;

  }

  asText(title, data) {
    let text = `<b>${title}</b><br/><span>Service name: ${data.endpoint}&nbsp;`
      + `Status: ${data.status}</span>`;
    return text;
  }
}

// Public
module.exports = WebHook;
