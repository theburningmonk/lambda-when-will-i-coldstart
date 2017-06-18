'use strict';

const co      = require('co');
const Promise = require('bluebird');
const AWS     = require('aws-sdk');
const cloudwatchevents = Promise.promisifyAll(new AWS.CloudWatchEvents());
const lambda  = new AWS.Lambda();

let getCurrInterval = co.wrap(function* (rule) {
  var req = {
    Limit: 1,
    NamePrefix: rule
  };
  let res = yield cloudwatchevents.listRulesAsync(req);
  res.Rules.forEach(console.log);

  let scheduleExpr = res.Rules[0].ScheduleExpression;
  let regexRes = /rate\((\d+\d*) minutes\)/i.exec(scheduleExpr);
  console.log(regexRes); // eg. [ 'rate(10 minutes)', '10', index: 0, input: 'rate(10 minutes)' ]
  return parseInt(regexRes[1]);
});

let disableRule = co.wrap(function* (rule) {
  let req = { Name: rule };
  yield cloudwatchevents.disableRuleAsync(req);
});

let extendRule = co.wrap(function* (rule, newInterval) {
  var req = {
    Name: rule,
    ScheduleExpression: `rate(${newInterval} minutes)`
  };
  yield cloudwatchevents.putRuleAsync(req);
});

let invokeTarget = co.wrap(function* (target) {
  let req = {
    FunctionName: target,
    InvocationType: "RequestResponse",
  };
  let res = yield lambda.invoke(req).promise();
  let resBody = res.Payload;
  return resBody;
});

module.exports.handler = co.wrap(function* (event, context, callback) {
  console.log(event);
  let ruleArn = event.resources[0];
  let ruleName = ruleArn.substr(ruleArn.indexOf("/")+1);

  let currInterval = yield getCurrInterval(ruleName);
  console.log(`current interval is [${currInterval}] minutes`);
  
  let targetName = process.env.TARGET_NAME;
  let isColdstart = yield invokeTarget(targetName);
  if (isColdstart === "true") {
    console.log("triggered coldstart");
  } else {
    console.log("not a coldstart, extending interval by 5 mins");
    let newInterval = currInterval + 5;
    yield extendRule(ruleName, newInterval);
    console.log(`extended [${ruleName}] to ${newInterval} minutes`);
  }

  callback(null);
});