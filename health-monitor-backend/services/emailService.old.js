const nodemailer = require('nodemailer');

// ==================== CONFIGURATION TRANSPORTER ====================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Vérifier la connexion au démarrage
// Vérifier la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erreur configuration email:', error.message);
    console.log('📧 Détails:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
    });
  } else {
    console.log('✅ Service email prêt');
    console.log('📧 Serveur:', process.env.EMAIL_HOST);
  }
});

// ==================== FONCTIONS EMAIL ====================

// 1. Email de bienvenue (inscription)
const envoyerEmailBienvenue = async (utilisateur, motDePasseTemporaire = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: utilisateur.email,
      subject: '🏥 Bienvenue sur Health Monitor',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0D8ABC 0%, #0a6a96 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #0D8ABC; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #0D8ABC; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
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
              
              <div class="credentials">
                <h3>📋 Vos identifiants de connexion :</h3>
                <p><strong>Email :</strong> ${utilisateur.email}</p>
                ${motDePasseTemporaire ? `<p><strong>Mot de passe temporaire :</strong> ${motDePasseTemporaire}</p>
                <p><em>⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</em></p>` : ''}
                ${utilisateur.idDispositif ? `<p><strong>ID Dispositif :</strong> ${utilisateur.idDispositif}</p>` : ''}
              </div>
              
              <p>Vous pouvez dès maintenant accéder à votre tableau de bord pour :</p>
              <ul>
                <li>📊 Consulter vos mesures en temps réel</li>
                <li>📈 Voir vos statistiques de santé</li>
                <li>🔔 Configurer vos alertes personnalisées</li>
                <li>💾 Télécharger vos rapports médicaux</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/login" class="button">
                  🚀 Accéder à mon compte
                </a>
              </center>
              
              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              
              <p>Cordialement,<br>L'équipe Health Monitor</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              <p>© 2024 Health Monitor - Tous droits réservés</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de bienvenue envoyé:', utilisateur.email);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email bienvenue:', error.message);
    return { success: false, error: error.message };
  }
};

// 2. Email d'alerte santé
const envoyerEmailAlerte = async (utilisateur, mesure) => {
  try {
    const emoji = mesure.statut === 'DANGER' ? '🚨' : '⚠️';
    const color = mesure.statut === 'DANGER' ? '#dc3545' : '#ffc107';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: utilisateur.email,
      subject: `${emoji} Alerte Santé - ${mesure.statut}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: white; padding: 20px; border-left: 4px solid ${color}; margin: 20px 0; }
            .metric { display: inline-block; margin: 10px 20px; text-align: center; }
            .metric-value { font-size: 36px; font-weight: bold; color: ${color}; }
            .metric-label { font-size: 14px; color: #666; }
            .button { display: inline-block; background: #0D8ABC; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emoji} ALERTE SANTÉ</h1>
              <p>Statut : ${mesure.statut}</p>
            </div>
            <div class="content">
              <h2>Bonjour ${utilisateur.prenom},</h2>
              
              <p>Une mesure anormale a été détectée sur votre dispositif Health Monitor.</p>
              
              <div class="alert-box">
                <center>
                  <div class="metric">
                    <div class="metric-value">❤️ ${mesure.bpm}</div>
                    <div class="metric-label">BPM</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">🫁 ${mesure.spo2}%</div>
                    <div class="metric-label">SpO2</div>
                  </div>
                </center>
                
                <p><strong>Date :</strong> ${new Date(mesure.horodatageMesure).toLocaleString('fr-FR')}</p>
                <p><strong>Dispositif :</strong> ${mesure.idDispositif}</p>
              </div>
              
              <h3>Recommandations :</h3>
              ${mesure.statut === 'DANGER' ? `
                <ul>
                  <li>🚨 <strong>Contactez immédiatement votre médecin</strong></li>
                  <li>📞 En cas d'urgence, appelez le 15</li>
                  <li>🛋️ Restez au repos</li>
                  <li>💊 Prenez votre traitement si prescrit</li>
                </ul>
              ` : `
                <ul>
                  <li>⚠️ Surveillez votre état de santé</li>
                  <li>📊 Prenez une nouvelle mesure dans 15 minutes</li>
                  <li>💧 Hydratez-vous</li>
                  <li>🛋️ Évitez les efforts intenses</li>
                </ul>
              `}
              
              <center>
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
                  📊 Voir mes mesures
                </a>
              </center>
              
              <p><em>⚠️ Cet email est envoyé automatiquement. En cas de doute, consultez un professionnel de santé.</em></p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email d\'alerte envoyé:', utilisateur.email);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email alerte:', error.message);
    return { success: false, error: error.message };
  }
};

// 3. Email de réinitialisation de mot de passe
const envoyerEmailResetPassword = async (utilisateur, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: utilisateur.email,
      subject: '🔐 Réinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0D8ABC 0%, #0a6a96 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #0D8ABC; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${utilisateur.prenom},</h2>
              
              <p>Vous avez demandé la réinitialisation de votre mot de passe Health Monitor.</p>
              
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <center>
                <a href="${resetUrl}" class="button">
                  🔑 Réinitialiser mon mot de passe
                </a>
              </center>
              
              <div class="warning">
                <p><strong>⚠️ Important :</strong></p>
                <ul>
                  <li>Ce lien est valide pendant <strong>1 heure</strong></li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                  <li>Ne partagez jamais ce lien avec personne</li>
                </ul>
              </div>
              
              <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #0D8ABC;">${resetUrl}</p>
              
              <p>Cordialement,<br>L'équipe Health Monitor</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email reset password envoyé:', utilisateur.email);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email reset:', error.message);
    return { success: false, error: error.message };
  }
};


// ==================== EXPORT ====================
module.exports = {
  sendWelcomeEmail: envoyerEmailBienvenue,
  sendAlertEmail: envoyerEmailAlerte,
  sendPasswordResetEmail: envoyerEmailResetPassword,
  // Garder aussi les anciens noms pour compatibilité
  envoyerEmailBienvenue,
  envoyerEmailAlerte,
  envoyerEmailResetPassword
};