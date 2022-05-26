import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';

const args = process.argv.slice(2);
const nnMap = new Map();
var daysNanoNarrative = '';
var caption = '';
var mediaContainerId = '';
var imageLink = 'https://raw.githubusercontent.com/Quiza12/NanoNarratives/master/images/';
var uniqueImageName = '';
var options = {
    timeout:  30000,
    pool:     { maxSockets:  Infinity },
    headers:  { connection:  "keep-alive" }
};
var client = new Twitter({
  consumer_key: args[0],
  consumer_secret: args[1],
  access_token_key: args[2],
  access_token_secret: args[3]
});

// Instagram ---------------------------->

function getDate() {
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = today.getMonth() + 1; //months start at 0
  var dd = today.getDate();

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;

  caption = dd + '/' + mm + '/' + yyyy;
  uniqueImageName = dd + mm + yyyy;
  console.log("Posting for " + caption);
  console.log("");
}

function setupFbGraph() {
  console.log("  Setting user access token...");
  graph.setAccessToken(args[4]);
}

function createMediaContainer() {
  console.log("  Creating media container...");
  var url = args[5] + '/media?image_url=' + imageLink + uniqueImageName + '.jpg' + '&caption=' + caption;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      if (err) {
        console.log(err);
      } else {
        mediaContainerId = res.id;
        postInstagram();
      }
    });
}

function postInstagram() {
  console.log("  Publishing...");
  var url = args[5] + '/media_publish?creation_id=' + mediaContainerId;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      console.log("  Published!");
      publishTwitter();
    });
}

function publishInstagram() {
  console.log("Publishing on Instagram...");
  setupFbGraph();
  createMediaContainer();
}

// Twitter ---------------------------->

function findDaysNarrative() {
  console.log("  Finding day's Nano Narrative...");
  fs.createReadStream('./nn.csv')
      .pipe(parse({delimiter: ','}))
      .on('data', function(csvrow) {
          nnMap.set(csvrow[0], csvrow[1]);
          if (csvrow[0] == caption) {
            daysNanoNarrative = csvrow[1];
          }
      })
      .on('end',function() {
        postTwitter();
      });
}

function postTwitter() {
  console.log("  Tweeting...");
  client.post('statuses/update', { status: daysNanoNarrative },  function(error, tweet, response) {
    if(error) throw error;
    console.log("  Tweeted!");
  });
}

function publishTwitter() {
  console.log("Publishing on Twitter...");
  findDaysNarrative();
}

function post() {
  getDate();
  publishInstagram();
}

console.log("");
console.log("--Nano Narratives Poster--");
console.log("");
post();
