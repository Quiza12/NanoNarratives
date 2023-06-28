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
  subject: "Daily Nano Narrative - 26/06/2023",
  text: "It surprised Gail that her daughter had gotten a tattoo; even as a child, any act that erred on the side of permanence was vehemently rejected."
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})