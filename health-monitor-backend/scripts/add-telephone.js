const mongoose = require('mongoose');
const path = require('path');

// Charger .env depuis le dossier parent
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 Vérification MONGODB_URI:', process.env.MONGODB_URI ? '✅ Trouvé' : '❌ Manquant');

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI non défini dans .env');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI) // ← MONGODB_URI au lieu de MONGO_URI
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  });

const User = require('../models/User');

async function addTelephone() {
  try {
    console.log('🔄 Mise à jour des utilisateurs sans téléphone...');
    
    // Trouver les utilisateurs sans téléphone
    const usersWithoutPhone = await User.find({ 
      $or: [
        { telephone: { $exists: false } },
        { telephone: null }
      ]
    });
    
    console.log(`📋 ${usersWithoutPhone.length} utilisateurs sans téléphone trouvés`);
    
    // Mettre à jour chaque utilisateur
    for (const user of usersWithoutPhone) {
      user.telephone = null;
      await user.save({ validateBeforeSave: false }); // Sauvegarder sans validation
      console.log(`✅ ${user.prenom} ${user.nom} - téléphone mis à jour`);
    }
    
    // Afficher tous les utilisateurs
    const users = await User.find({}, 'prenom nom email telephone role');
    console.log('\n📋 Liste de tous les utilisateurs:');
    users.forEach(u => {
      console.log(`- ${u.prenom} ${u.nom} (${u.role}): ${u.telephone || '❌ Pas de téléphone'}`);
    });
    
    console.log('\n✅ Migration terminée !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Attendre que MongoDB soit connecté
setTimeout(() => {
  addTelephone();
}, 1000);