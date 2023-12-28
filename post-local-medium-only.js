import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';
import fetch from 'node-fetch';

const nnMap = new Map();
var daysNanoNarrative = '';
var caption = '';
var uniqueImageName = '';
let mediumSuccessful = false;

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
        publishMedium();
      });
}

// Medium ---------------------------->

function postMedium(mediumUserId, publicationId) {
  console.log("  Publishing...");
  
  let json = JSON.stringify({
    contentFormat: 'markdown',
    content: '# TEST: Nano Narrative - ' + caption + ' \n ' + daysNanoNarrative,
    tags: ['Writing', 'Nano Narratives', 'Flash Fiction'],
    publishStatus: 'publicv',
    notifyFollowers: 'true'
  });
  console.log(json);

  try {
    fetch('https://api.medium.com/v1/publications/' + publicationId + '/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
    },
    body: json,
  })
    .then(res => res.json())
    .then(res => {
      if (!res.data) {
        console.log("  Not published to Medium: " + res.errors[0].message);
        mediumSuccessful = false;
      } else {
        console.log("  Published!");
        mediumSuccessful = true;
      }
    });
  } catch(e) {
    console.log("  Not published to Medium: " + e);
    mediumSuccessful = false;
  }
  
}

function getPublication(mediumUserId) {
  console.log("  Getting publication ID...");

  fetch('https://api.medium.com/v1/users/' + mediumUserId  + '/publications', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
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
      Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
    },
  })
    .then(res => res.json())
    .then(res => getPublication(res.data.id));
}

function post() {
  getDate();
}

console.log("");
console.log("--Nano Narratives Poster - Medium Only--");
console.log("");
post();
