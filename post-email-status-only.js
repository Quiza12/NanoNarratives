import nodemailer from 'nodemailer';
import './env.js';

let transporter = nodemailer.createTransport({
  host: 'smtp.purelymail.com',
  port: 465,
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

let date = "24/10/2023";
let nanoNarrative = "The Priceline chemist slowly transitioned from pills to pamper; their imperceptible change into a full-blown Mecca Cosmetica came as a shock to a headache-addled customer one day.";

let body = 
`
<p style="text-align: center; font-size: 16px;">${nanoNarrative}</p>
<br />
<p style="text-align: center;">${instagramSuccessful ? '✅' : '❌'} Instagram</p>
<p style="text-align: center;">${redditSuccessful ? '✅' : '❌'} Reddit</p>
<p style="text-align: center;">${facebookSuccessful ? '✅' : '❌'} Facebook</p>
<p style="text-align: center;">Posted manually on Medium and Threads</p>
`;

let message = {
  from: "me@matthewquerzoli.com",
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