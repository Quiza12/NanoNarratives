import nodemailer from 'nodemailer';
import './env.js';

let transporter = nodemailer.createTransport({
       host: 'smtp-mail.outlook.com',
       port: 587,
       auth: {
           user: process.env.E_USERNAME,
           pass: process.env.E_PASSWORD
       }
})

let instagramSuccessful = true;
let twitterSuccessful = true;
let mediumSuccessful = true;
let redditSuccessful = true;
let facebookSuccessful = true;
let emailSuccessful = false;

let date = "28/06/2023";
let nanoNarrative = "She was an everyday romantic; she purchased flowers at random intervals, lit candles in the bedroom in the middle of the week, and stashed love letters in her girlfriend's handbag before she left for work in the morning.";

let body = 
`
<p style="text-align: center; font-size: 16px;">${nanoNarrative}</p>
<br />
<p style="text-align: center;">${instagramSuccessful ? '✅' : '❌'} Instagram</p>
<p style="text-align: center;">${twitterSuccessful ? '✅' : '❌'} Twitter</p>
<p style="text-align: center;">${mediumSuccessful ? '✅' : '❌'} Medium</p>
<p style="text-align: center;">${redditSuccessful ? '✅' : '❌'} Reddit</p>
<p style="text-align: center;">${facebookSuccessful ? '✅' : '❌'} Facebook</p>
`;

let message = {
  from: "Quiza12@live.com",
  // bcc: "Quiza12@live.com",
  bcc: "Quiza12@live.com;querzolix5@gmail.com;david@qloans.net.au",
  subject: "Nano Narrative - " + date,
  html: body 
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})