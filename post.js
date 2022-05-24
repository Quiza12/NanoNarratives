import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';

const nnMap = new Map();
var daysNanoNarrative = '';
var status = 'The bin wasn\'t going to take itself out, but try telling that to the three hungover housemates.';
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
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
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
  graph.setAccessToken(process.env.IG_UAT);
}

function createMediaContainer() {
  console.log("  Creating media container...");
  var url = process.env.IG_USER_ID + '/media?image_url=' + imageLink + uniqueImageName + '.jpg' + '&caption=' + caption;
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
  var url = process.env.IG_USER_ID + '/media_publish?creation_id=' + mediaContainerId;
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
      })
      .on('end',function() {
        for (let [key, value] of nnMap.entries()) {
          if (key === caption)
            daysNanoNarrative = value;
        }
      });
}

function postTwitter() {
  console.log("  Tweeting...");
  client.post('statuses/update', { status: status },  function(error, tweet, response) {
    if(error) throw error;
    console.log("  Tweeted!");
  });
}

function publishTwitter() {
  console.log("Publishing on Twitter...");
  findDaysNarrative();
  postTwitter();
}

function post() {
  getDate();
  publishInstagram();
}

console.log("");
console.log("--Nano Narratives Poster--");
console.log("");
post();
