import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';
import fetch from 'node-fetch';

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

  publishInstagram();
}

function setupFbGraph() {
  console.log("  Setting user access token...");
  graph.setAccessToken(args[4]);
}

function createMediaContainer() {
  console.log("  Creating media container...");
  console.log("  uniqueImageName..." + uniqueImageName);
  var url = args[5] + "/media?image_url=" + imageLink + uniqueImageName + ".jpg&caption=" + caption;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      if (err) {
        throw err;
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
    publishMedium();
  });
}

function publishTwitter() {
  console.log("Publishing on Twitter...");
  findDaysNarrative();
}

function postMedium(mediumUserId, publicationId) {
  console.log("  Publishing...");

  fetch('https://api.medium.com/v1/publications/' + publicationId + '/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + args[6],
    },
    body: JSON.stringify({
      contentFormat: 'markdown',
      content: '# Nano Narrative \n ## ' + caption + ' \n ' + daysNanoNarrative,
      tags: ['Writing', 'Nano Narratives', 'Flash Fiction', 'Humor'],
      publishStatus: 'public',
    }),
  })
    .then(res => res.json())
    .then(res => console.log("  Published!"));
}

function getPublication(mediumUserId) {
  console.log("  Getting publication ID...");

  fetch('https://api.medium.com/v1/users/' + mediumUserId  + '/publications', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + args[6],
    },
  })
    .then(res => res.json())
    .then(res => postMedium(mediumUserId, getPublicationFromList(res.data)));
}

function getPublicationFromList(data) {
  for (var i = 0; i < data.length; i++) {
    if (data[i].name === 'The Quintessential Q') return data[i].id;
  }
}

function publishMedium() {
  console.log("Publishing on Medium...");
  console.log("  Getting user ID...");


  fetch('https://api.medium.com/v1/me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + args[6],
    },
  })
    .then(res => res.json())
    .then(res => getPublication(res.data.id));
}

function post() {
  getDate();
}

console.log("");
console.log("--Nano Narratives Poster--");
console.log("");
post();
