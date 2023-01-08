import nodemailer from 'nodemailer';
let transporter = nodemailer.createTransport({
       host: 'smtp-mail.outlook.com',
       port: 587,
       auth: {
           user: "Quiza12@live.com",
           pass: "Th3yK33pD3athStaringM3DownImAlright!@#"
       }
})

let message = {
  from: "Quiza12@live.com",
  bcc: "Quiza12@live.com;querzolix5@gmail.com;david@qloans.net.au",
  subject: "Daily Nano Narrative - 08/01/2023",
  text: "The third time her running shoes got soaked, Nadia forwent them altogether for a while. The lady who next gave her a pedicure got more than she bargained for with the strength of her soles."
}
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err)
  } else {
    console.log(info);
  }
})