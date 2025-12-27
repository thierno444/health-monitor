const brevo = require('@getbrevo/brevo');

// Configuration API Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY || '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';

// ==================== FONCTIONS EMAIL ====================

// 1. Email de bienvenue
async function envoyerEmailBienvenue(utilisateur, motDePasseTemporaire = null) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = '🏥 Bienvenue sur Health Monitor';
    sendSmtpEmail.to = [{ email: utilisateur.email, name: `${utilisateur.prenom} ${utilisateur.nom}` }];
    sendSmtpEmail.sender = { name: 'Health Monitor', email: 'tngom1010@gmail.com' };
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0D8ABC 0%, #0a6a96 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #0D8ABC; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Health Monitor</h1>
            <p>Bienvenue dans votre espace santé !</p>
          </div>
          <div class="content">
            <h2>Bonjour ${utilisateur.prenom} ${utilisateur.nom},</h2>
            <p>Votre compte Health Monitor a été créé avec succès ! 🎉</p>
            ${motDePasseTemporaire ? `<p><strong>Mot de passe temporaire :</strong> ${motDePasseTemporaire}</p>` : ''}
            <center>
              <a href="${process.env.FRONTEND_URL}/login" class="button">🚀 Accéder à mon compte</a>
            </center>
            <p>Cordialement,<br>L'équipe Health Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email de bienvenue envoyé via Brevo:', utilisateur.email);
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email Brevo:', error.message);
    return { success: false, error: error.message };
  }
}

// 2. Email d'alerte
async function envoyerEmailAlerte(utilisateur, mesure) {
  try {
    const emoji = mesure.statut === 'DANGER' ? '🚨' : '⚠️';
    const color = mesure.statut === 'DANGER' ? '#dc3545' : '#ffc107';
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `${emoji} Alerte Santé - ${mesure.statut}`;
    sendSmtpEmail.to = [{ email: utilisateur.email, name: `${utilisateur.prenom} ${utilisateur.nom}` }];
    sendSmtpEmail.sender = { name: 'Health Monitor', email: 'tngom1010@gmail.com' };
    sendSmtpEmail.htmlContent = `
      <h1>${emoji} ALERTE SANTÉ</h1>
      <p>Bonjour ${utilisateur.prenom},</p>
      <p>Mesure anormale détectée :</p>
      <p>❤️ BPM: ${mesure.bpm} | 🫁 SpO2: ${mesure.spo2}%</p>
      <p>Statut: <strong style="color: ${color}">${mesure.statut}</strong></p>
    `;
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email d\'alerte envoyé via Brevo');
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error('❌ Erreur email alerte:', error.message);
    return { success: false, error: error.message };
  }
}

// 3. Email reset password
async function envoyerEmailResetPassword(utilisateur, resetToken) {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = '🔐 Réinitialisation de votre mot de passe';
    sendSmtpEmail.to = [{ email: utilisateur.email, name: `${utilisateur.prenom} ${utilisateur.nom}` }];
    sendSmtpEmail.sender = { name: 'Health Monitor', email: 'tngom1010@gmail.com' };
    sendSmtpEmail.htmlContent = `
      <h1>🔐 Réinitialisation de mot de passe</h1>
      <p>Bonjour ${utilisateur.prenom},</p>
      <p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p>
      <a href="${resetUrl}" style="background: #0D8ABC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
        🔑 Réinitialiser mon mot de passe
      </a>
      <p>Ce lien est valide pendant 1 heure.</p>
    `;
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email reset password envoyé via Brevo');
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error('❌ Erreur email reset:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  envoyerEmailBienvenue,
  envoyerEmailAlerte,
  envoyerEmailResetPassword
};