// modules/logger.js
// simple logger module I made so I don't have to write console.log everywhere

function log(message) {
  var time = new Date().toLocaleTimeString();
  console.log("[" + time + "] " + message);
}

module.exports = log;
