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

let message = {
  from: "me@matthewquerzoli.com",
  to: "Quiza12@live.com",
  bcc: "Quiza12@live.com",
  subject: "Daily Nano Narrative - TEST",
  text: "It surprised Gail that her daughter had gotten a tattoo; even as a child, any act that erred on the side of permanence was vehemently rejected."
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})