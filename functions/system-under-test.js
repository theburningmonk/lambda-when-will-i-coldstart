'use strict';

const co         = require('co');
const Promise    = require('bluebird');
const AWS        = require('aws-sdk');
const cloudwatch = Promise.promisifyAll(new AWS.CloudWatch());

let isColdstart = false;

let trackColdstart = co.wrap(function* (funcName) {
  let req = {
    MetricData: [
      {
        MetricName: `coldstart`,
        Dimensions: [ { Name: "functionName", Value: funcName } ],
        Timestamp: new Date(),
        Unit: 'Count',
        Value: 1
      }
    ],
    Namespace: "theburningmonk.com"
  };
  yield cloudwatch.putMetricDataAsync(req);
});

module.exports.handler = co.wrap(function* (event, context, callback) {
  if (!isColdstart) {
    isColdstart = true;
    console.log("this is a coldstart");
    yield trackColdstart(context.functionName);
    callback(null, "true");
  }

  callback(null, "false");
});