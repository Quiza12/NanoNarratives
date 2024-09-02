import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';
import fetch from 'node-fetch';
import snoowrap from 'snoowrap';
import nodemailer from 'nodemailer';

var postToInstagram = false;
var postToTwitter = false;
var postToMedium = false;
var postToReddit = false;
var postToFacebook = false;
var postToEmail = true;

let instagramSuccessful = true;
let twitterSuccessful = true;
let mediumSuccessful = true;
let redditSuccessful = true;
let facebookSuccessful = true;

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
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
var redditConfig = {
  username: process.env.R_USERNAME,
  password: process.env.R_PASSWORD,
  clientId: process.env.R_CLIENT,
  clientSecret: process.env.R_SECRET,
}

// Instagram ---------------------------->

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
  // caption = '29/12/2023';
  // uniqueImageName = '29122023';

  console.log("Posting for " + caption);
  console.log("");

  publishInstagram();
}

function setupFbGraphForInstagram() {
  console.log("  Setting user access token...");
  graph.setAccessToken(process.env.IG_UAT);
}

function createMediaContainer() {
  console.log("  Creating media container...");
  var url = process.env.IG_USER_ID + '/media?image_url=' + imageLink + uniqueImageName + '.jpg' + '&caption=' + caption;
  if (postToInstagram) {
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
  } else {
    console.log("Skipping posting on Instagram...");
    postInstagram();
  }
}

function postInstagram() {
  console.log("  Publishing...");
  var url = process.env.IG_USER_ID + '/media_publish?creation_id=' + mediaContainerId;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      console.log("  Published!");
      instagramSuccessful = true;
      publishTwitter();
    });
}

function publishInstagram() {
  console.log("Publishing on Instagram...");
  setupFbGraphForInstagram();
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
  if (postToTwitter) {
    client.post('statuses/update', { status: daysNanoNarrative },  function(error, tweet, response) {
      if(error) throw error;
      console.log("  Tweeted!");
      twitterSuccessful = true;
      publishMedium();
    });
  } else {
    publishMedium();
  }
}

function publishTwitter() {
  console.log("Publishing on Twitter...");
  findDaysNarrative();
}

// Medium ---------------------------->

function postMedium(mediumUserId, publicationId) {
  console.log("  Publishing...");

  if (postToMedium) {
    fetch('https://api.medium.com/v1/publications/' + publicationId + '/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
      cookie: 'clientId=mq'
    },
    body: JSON.stringify({
      contentFormat: 'markdown',
      content: '# Nano Narrative - ' + caption + ' \n ' + daysNanoNarrative,
      tags: ['Writing', 'Nano Narratives', 'Flash Fiction', 'Humor'],
      publishStatus: 'public',
      notifyFollowers: true
    }),
  })
    .then(res => res.json())
    .then(res => {
      console.log("  Published!");
      mediumSuccessful = true;
      publishReddit();
    });
  } else {
    publishReddit();
  }
  
}

function getPublication(mediumUserId) {
  console.log("  Getting publication ID...");

  console.log("  Medium userId: " + mediumUserId);

  fetch('https://api.medium.com/v1/users/' + mediumUserId  + '/publications', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
      cookie: 'clientId=mq'
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

  if (postToMedium) {
    console.log("  Getting user ID...");

    try {
      fetch('https://api.medium.com/v1/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.M_INTEGRATION_TOKEN,
        },
      })
        .then(res => res.json())
        .then(res => getPublication(res.data.id));
    } catch(error) {
        console.log("  Not published to Medium: " + error);
        mediumSuccessful = false;
        publishReddit();
    }
  } else {
    console.log("Skipping publishing on Medium...");
    publishReddit();
  }
  
}

// Reddit ---------------------------->

function publishReddit() {
  if (postToReddit) {
    console.log("Publishing on Reddit...");
    const r = new snoowrap({
      userAgent: 'fd547db4-3227-429c-9ca5-34c23e07a60f',
      clientId: redditConfig.clientId,
      clientSecret: redditConfig.clientSecret,
      username: redditConfig.username,
      password: redditConfig.password,
    })
    r.getSubreddit("NanoNarratives").submitSelfpost({
      title: caption,
      text: daysNanoNarrative,
    })
    publishFacebook();
    redditSuccessful = true;
  } else {
    console.log("Skipping publishing on Reddit...");
    publishFacebook();
  }
}

// Facebook ---------------------------->

function setupFbGraphForFacebook() {
  console.log("  Setting page access token...");
  graph.setAccessToken(process.env.FB_PAT);
}

function postFacebook() {
  console.log("  Publishing...");
  var url = process.env.FB_PAGE_ID + '/photos?url=' + imageLink + uniqueImageName + '.jpg' + '&message=' + caption;
  if (postToFacebook) {
    graph
    .setOptions(options)
    .post(url, function(err, res) {
      console.log("  Published!");
      facebookSuccessful = true;
      sendEmail();
    });
  } else {
    console.log("Skipping publishing on Facebook...");
    sendEmail();
  }
}

function publishFacebook() {
  console.log("Publishing on Facebook...");
  setupFbGraphForFacebook();
  postFacebook();
}

// Emails ---------------------------->

function sendEmail() {
  if (postToEmail) {
    console.log("");
    console.log("Sending email to Mum and Dad...");
  
    let transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      auth: {
          user: process.env.E_USERNAME,
          pass: process.env.E_PASSWORD
      }
    })
  
    let message = {
      from: "Quiza12@live.com",
      bcc: "Quiza12@live.com;querzolix5@gmail.com;david@qloans.net.au",
      subject: "Nano Narrative - " + caption,
      html: 
        `
        <p style="text-align: center; font-size: 16px;">${daysNanoNarrative}</p>
        <br />
        <p style="text-align: center;">${instagramSuccessful ? '✅' : '❌'} Instagram</p>
        <p style="text-align: center;">${redditSuccessful ? '✅' : '❌'} Reddit</p>
        <p style="text-align: center;">${facebookSuccessful ? '✅' : '❌'} Facebook</p>
        <p style="text-align: center;">Posted manually on Medium and Threads</p>
        `
    }
  
    transporter.sendMail(message, function(err, info) {
      console.log("  Sending...");
      if (err) {
        console.log("  Email not sent: " + err)
      } else {
        console.log("  Sent!");
      }
    })
  }
}

// Start ---------------------------->

function post() {
  getDate();
}

console.log("");
console.log("--Nano Narratives Poster--");
console.log("");
post();
