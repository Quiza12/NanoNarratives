import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { parse } from 'csv-parse';
import './env.js';
import fetch from 'node-fetch';
import snoowrap from 'snoowrap';
import nodemailer from 'nodemailer';

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
var twitterClient = new Twitter({
  consumer_key: args[0],
  consumer_secret: args[1],
  access_token_key: args[2],
  access_token_secret: args[3]
});
var redditConfig = {
  username: args[7],
  password: args[8],
  clientId: args[9],
  clientSecret: args[10],
}
let instagramSuccessful = false;
let twitterSuccessful = false;
let mediumSuccessful = false;
let redditSuccessful = false;
let facebookSuccessful = false;

let postToMedium = false;

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

  publishInstagram();
}

// Instagram ---------------------------->

function setupFbGraphForInstagram() {
  console.log("  Setting user access token...");
  graph.setAccessToken(args[4]);
}

function createMediaContainer() {
  console.log("  Creating media container...");
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
      if (err) {
        console.log("  Not published to Instagram: " + err.message);
        instagramSuccessful = false;
      } else {
        console.log("  Published!");
        instagramSuccessful = true;
      }
      publishTwitter();
    });
}

function publishInstagram() {
  console.log("");
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
  if (daysNanoNarrative.length <= 280) {
    twitterClient.post('statuses/update', { status: daysNanoNarrative },  function(error, tweet, response) {
      if (error) {
        console.log("  Not published to Twitter: " + error.detail);
        twitterSuccessful = false;
      } else {
        console.log("  Tweeted!");
        twitterSuccessful = true;
      }
      publishMedium();
    });
  } else {
    twitterSuccessful = false;
    console.log("  Not published to Twitter - Tweet too long, need to manually post twice.");
    publishMedium();
  }
}

function publishTwitter() {
  console.log("");
  console.log("Publishing on Twitter...");
  findDaysNarrative();
}

// Medium ---------------------------->

function postMedium(mediumUserId, publicationId) {
  console.log("  Publishing...");

  try {
    fetch('https://api.medium.com/v1/publications/' + publicationId + '/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + args[6],
        cookie: 'clientId=mq'
      },
      body: JSON.stringify({
        contentFormat: 'markdown',
        content: '# Nano Narrative - ' + caption + ' \n ' + daysNanoNarrative,
        tags: ['Writing', 'Nano Narratives', 'Flash Fiction'],
        publishStatus: 'public',
        notifyFollowers: true
      }),
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
        publishReddit();
      });
  } catch(error) {
    console.log("  Not published to Medium: " + error);
    mediumSuccessful = false;
    publishReddit();
  }
  
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
  if (postToMedium) {
    console.log("");
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
  } else {
    console.log("");
    console.log("Skipping publishing on Medium...");
    publishReddit();
  }
  
}

// Reddit ---------------------------->

function publishReddit() {
  console.log("");
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
}

// Facebook ---------------------------->

function setupFbGraphForFacebook() {
  console.log("  Setting page access token...");
  graph.setAccessToken(args[11]);
}

function postFacebook() {
  console.log("  Publishing...");
  var url = args[12] + '/photos?url=' + imageLink + uniqueImageName + '.jpg' + '&message=' + caption;
  graph
    .setOptions(options)
    .post(url, function(err, res) {
      if (err) {
        console.log("  Not published to Facebook: " + err.message);
        facebookSuccessful = false;
      } else {
        console.log("  Published!");
        facebookSuccessful = true;
      }
      sendEmail();
    });
}

function publishFacebook() {
  console.log("");
  console.log("Publishing on Facebook...");
  setupFbGraphForFacebook();
  postFacebook();
}

// Emails ---------------------------->

function sendEmail() {
  console.log("");
  console.log("Sending email to Mum and Dad...");

  let transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    auth: {
        user: args[13],
        pass: args[14]
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
      <p style="text-align: center;">${mediumSuccessful ? '✅' : '❌'} Medium</p>
      <p style="text-align: center;">${redditSuccessful ? '✅' : '❌'} Reddit</p>
      <p style="text-align: center;">${facebookSuccessful ? '✅' : '❌'} Facebook</p>
      `
  }
  //<p style="text-align: center;">${twitterSuccessful ? '✅' : '❌'} Twitter</p>

  transporter.sendMail(message, function(err, info) {
    console.log("  Sending...");
    if (err) {
      console.log("  Email not sent: " + err)
    } else {
      console.log("  Sent!");
    }
  })
}

// Start ---------------------------->

function post() {
  getDate();
}

console.log("");
console.log("--Nano Narratives Poster--");
console.log("");
post();