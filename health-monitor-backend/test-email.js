const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'tngom1010@gmail.com',
    pass: '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'
  }
});

console.log('🧪 Test envoi email Brevo...');

transporter.sendMail({
  from: '"Health Monitor" <tngom1010@gmail.com>',
  to: 'tngom1010@gmail.com',
  subject: 'Test Brevo',
  text: 'Ceci est un test !'
}, (error, info) => {
  if (error) {
    console.log('❌ Erreur:', error);
  } else {
    console.log('✅ Email envoyé !', info.messageId);
  }
});