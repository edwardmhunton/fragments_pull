import smtpTransport from 'nodemailer-smtp-transport';

var nodemailer = require('node-mailer');

class Mail {


  constructor(recipiants, tranporterAuth, files) {

        this.transporter = {};

              var nodemailer = require('node-mailer');

              this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: tranporterAuth
              });

              this.tranporterAuth = tranporterAuth;
              this.files = files;
              this.recipiants = recipiants

            }


inputMail(i, o){
  ///////Email
  const from = this.tranporterAuth.user;
  const to  = i;
  const subject  = "Fragment Comparison";
  const text = o.testStream+" : "+o.testDate;
  const html = '<b>Test Performed</b>';
  var mailOption = {
         from: from,
         to:  to,
         subject: subject,
         text: text,
         html: html,
         attachments:files
     }
    return mailOption;

}

send(obj){
  for(var i in this.recipiants){
    this.transporter.sendMail(this.inputmail(this.recipiants[i], obj),function(err,success){
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
