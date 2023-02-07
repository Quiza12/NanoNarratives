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

let message = {
  from: "Quiza12@live.com",
  bcc: "Quiza12@live.com;querzolix5@gmail.com;david@qloans.net.au",
  subject: "Daily Nano Narrative - 05/02/2023",
  text: "The band, though successful, had hit a major rut in creativity. So they moved their band sessions back into the lead singer's parents' garage, to try and find the spark again, just like had when they were stroppy, pimply teenagers with nothing but dreams and a torrent of hormones."
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})