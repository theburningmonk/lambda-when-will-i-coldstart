'use strict';

const co         = require('co');
const Promise    = require('bluebird');
const AWS        = require('aws-sdk');
const cloudwatch = Promise.promisifyAll(new AWS.CloudWatch());

let isColdstart = false;

module.exports.handler = (event, context, callback) => {
  if (!isColdstart) {
    isColdstart = true;
    console.log("this is a coldstart");

    callback(null, { isColdstart : true });
  }

  callback(null, { isColdstart : false });
};