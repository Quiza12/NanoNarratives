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

let date = "10/01/2023";
let nanoNarrative = "The third time her running shoes got soaked, Nadia forwent them altogether for a while. The lady who next gave her a pedicure got more than she bargained for with the strength of her soles.";

let body = 
`
<h3 style="text-align: center;"><em>${nanoNarrative}</em></h3>
<br />
<p style="text-align: center;">${instagramSuccessful ? '✅' : '❌'} Instagram</p>
<p style="text-align: center;">${twitterSuccessful ? '✅' : '❌'} Twitter</p>
<p style="text-align: center;">${mediumSuccessful ? '✅' : '❌'} Medium</p>
<p style="text-align: center;">${redditSuccessful ? '✅' : '❌'} Reddit</p>
<p style="text-align: center;">${facebookSuccessful ? '✅' : '❌'} Facebook</p>
`;

let message = {
  from: "Quiza12@live.com",
  bcc: "Quiza12@live.com",
  // bcc: "Quiza12@live.com;querzolix5@gmail.com;david@qloans.net.au",
  subject: "Nano Narrative - TEST",
  html: body 
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})