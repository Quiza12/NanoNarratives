import graph from 'fbgraph';
import Twitter from 'twitter';
import './env.js';

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
    });
}

function publishInstagram() {
  console.log("Publishing on Instagram...");
  setupFbGraph();
  createMediaContainer();
}

function publishTwitter() {
  console.log("Publishing on Twitter...");
  client.post('statuses/update', { status: status },  function(error, tweet, response) {
    if(error) throw error;
    console.log("Tweeted!");
  });
}

console.log("--Nano Narratives Poster--");
console.log("");
getDate();
publishInstagram();
publishTwitter();
