import './env.js';
import graph from 'fbgraph';

const nnMap = new Map();
var caption = '';
var imageLink = 'https://raw.githubusercontent.com/Quiza12/NanoNarratives/master/images/';
var uniqueImageName = '';
var caption = '';
var uniqueImageName = '';

var options = {
  timeout:  30000,
  pool:     { maxSockets:  Infinity },
  headers:  { connection:  "keep-alive" }
};

// General ---------------------------->

function getDate() {
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = today.getMonth() + 1; //months start at 0
  var dd = today.getDate();

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;

  caption = dd + '/' + mm + '/' + yyyy;
  uniqueImageName = dd + '' + mm + '' + yyyy;
  console.log("Posting for " + caption);
  console.log("");

  publishFacebook();
}

// Facebook ---------------------------->

function setupFbGraph() {
  console.log("  Setting page access token...");
  graph.setAccessToken(process.env.FB_PAT);
}

function postFacebook() {
  console.log("  Publishing...");
  var url = process.env.FB_PAGE_ID + '/photos?url=' + imageLink + uniqueImageName + '.jpg' + '&message=' + caption;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      console.log("  Published!");
    });
}

function publishFacebook() {
  console.log("Publishing on Facebook...");
  setupFbGraph();
  postFacebook();
}

function post() {
  getDate();
}

console.log("");
console.log("--Nano Narratives Poster - Facebook Only--");
console.log("");
post();
