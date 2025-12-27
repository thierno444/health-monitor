const { envoyerEmailBienvenue } = require('./services/emailService');

const utilisateurTest = {
  prenom: 'Test',
  nom: 'Brevo',
  email: 'tngom1010@gmail.com'
};

console.log('🧪 Test envoi email Brevo API...');

envoyerEmailBienvenue(utilisateurTest)
  .then(result => {
    if (result.success) {
      console.log('✅ Email envoyé avec succès !');
      console.log('📧 Vérifie ta boîte mail !');
    } else {
      console.log('❌ Erreur:', result.error);
    }
  })
  .catch(error => {
    console.error('❌ Exception:', error);
  });