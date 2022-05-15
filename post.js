var graph = require('fbgraph');
var userAccessToken = 'EAAJx88LKyAEBAJyHQ9RAqvu6Gvt91b1ZBIUCnB7BujcO4TAi05b0ArgZCw1mlaza8vJoirgXmGyGdHKlc3cifr8FoMzYjtUWQC25GexzZAQfxmkUQ1Pr3ZAt0TTUaDrxLdeHEdwv2ZCZBr3CMVkhDGjTI24VxzJDTal795OOZAz0cetqr2ED2eQUS8ZCVQzi4Ucm6iasdofQKjoTwzXLnX6Ca1Tt89PDQB0ZD';
var igUserId = '17841424110463537';
var caption = '';
var mediaContainerId = '';
var imageLink = 'https://raw.githubusercontent.com/Quiza12/pathtopeace/master/images/just-breathe.jpg';
var options = {
    timeout:  30000,
    pool:     { maxSockets:  Infinity },
    headers:  { connection:  "keep-alive" }
};

function captureArguments() {
  var arguments = process.argv.slice(2);
  caption = arguments[0];
}

function setupFbGraph() {
  console.log("Setting user access token...");
  graph.setAccessToken(userAccessToken);
}

function createMediaContainer() {
  console.log("Creating media container...");
  var url = igUserId + '/media?image_url=' + imageLink + '&caption=' + caption;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      if (err) {
        console.log(err);
      } else {
        mediaContainerId = res.id;
        publish();
      }
    });
}

function publish() {
  console.log("Publishing...");
  var url = igUserId + '/media_publish?creation_id=' + mediaContainerId;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      console.log("Published!");
    });
}

captureArguments();
setupFbGraph();
createMediaContainer();
