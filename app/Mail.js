

var nodemailer = require("nodemailer");

import smtpTransport from 'nodemailer-smtp-transport';

class Mail {


  constructor(recipiants, tranporterAuth, files) {

              this.transporter = {};

              var nodemailer = require("nodemailer");

              this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                auth: tranporterAuth
              });

            //this.transporter = nodemailer.createTransport({
              //  host: 'smtp.ethereal.email',
              //  port: 587,
              //  auth: tranporterAuth
            //  });

              this.tranporterAuth = tranporterAuth;
              this.files = files;
              this.recipiants = recipiants

            }


inputMail(i, o){
  ///////Email
  const from = this.tranporterAuth.user;
  const to  = i;
  const subject  = "Fragment Comparison Summary";
  const text = "test";
  const html = o.html;
  var mailOption = {
         from: from,
         to:  to,
         subject: subject,
         text: text,
         html: html,
         attachments:this.files
     }
    return mailOption;

}

send(obj){

console.log("SEND IT OUT");

  for(var i in this.recipiants){
    this.transporter.sendMail(this.inputMail(this.recipiants[i], obj),function(err,success){
                if(err){
                  //  events.emit('error', err);
                }
                if(success){
                  //  events.emit('success', success);
                }
                });

  }

}

}

module.exports = Mail;
