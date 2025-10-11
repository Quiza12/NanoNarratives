import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';
import graph from 'fbgraph';
import fetch from 'node-fetch';

var postToInstagram = false;
let instagramSuccessful = true;

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

  //overrides
  caption = 'TEST';
  uniqueImageName = 'TEST';

  console.log("Posting for " + caption);
  console.log("");

  findDaysNarrative();
}

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
        publishInstagram();
      });
}

// Instagram ---------------------------->

function publishInstagram() {
  console.log("");
  console.log("Publishing on Instagram...");
  setupFbGraphForInstagram();
  createMediaContainer();
}

function setupFbGraphForInstagram() {
  console.log("  Setting user access token...");
  graph.setAccessToken(process.env.IG_UAT);
}

// function createMediaContainer() {
//   console.log("  Creating media container...");
//   var url = process.env.IG_USER_ID + "/media?image_url=" + imageLink + uniqueImageName + ".jpg&caption=" + caption;
//   graph
//     .setOptions(options)
//     .post(url, function(err, res) {
//       if (err) {
//         throw err;
//       } else {
//         console.log('  Media container ID: ' + res.id);
//         mediaContainerId = res.id;
//         postInstagram();
//       }
//     });
// }

async function createMediaContainer() {
  console.log("  Creating media container...");

  const url = `${process.env.IG_USER_ID}/media?image_url=${imageLink}${uniqueImageName}.jpg&caption=${caption}`;
  const maxRetries = 10;
  const delayMs = 2000;

  try {
    const postResponse = await new Promise((resolve, reject) => {
      graph.setOptions(options).post(url, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    if (postResponse.id) {
      console.log("  Media container ID:", postResponse.id);
      mediaContainerId = postResponse.id;
      return postInstagram();
    }

    // Poll until ID is available
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  Polling attempt ${attempt}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const pollResponse = await new Promise((resolve, reject) => {
        graph.setOptions(options).get(url, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (pollResponse.id) {
        console.log("  Media container ID:", pollResponse.id);
        mediaContainerId = pollResponse.id;
        return postInstagram();
      }
    }

    throw new Error("  Media container ID not received after polling.");
  } catch (err) {
    console.error("  Error creating media container:", err.message);
  }
}

function postInstagram() {
  console.log("  Publishing...");
  var url = process.env.IG_USER_ID + '/media_publish?creation_id=' + mediaContainerId;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      if (err) {
        console.log("  Not published to Instagram: " + err.message);
        instagramSuccessful = false;
      } else {
        console.log("  Published!");
        instagramSuccessful = true;
      }
    });
}

function post() {
  getDate();
}

console.log("");
console.log("-- Nano Narratives Poster - Instagram Only --");
console.log("");
post();
