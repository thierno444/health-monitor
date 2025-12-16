require('dotenv').config();
const mongoose = require('mongoose');
const Alerte = require('../models/Alert');
const User = require('../models/User');
const Mesure = require('../models/Measurement');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    process.exit(1);
  }
};

const seedAlertes = async () => {
  try {
    console.log('🚨 Génération d\'alertes de test...\n');

    // Récupérer les patients
    const patients = await User.find({ role: 'patient' });
    
    if (patients.length === 0) {
      console.log('❌ Aucun patient trouvé. Exécutez d\'abord seedDatabase.js');
      process.exit(1);
    }

    // Supprimer les anciennes alertes
    await Alerte.deleteMany({});
    console.log('🗑️  Anciennes alertes supprimées');

    const alertes = [];
    const maintenant = new Date();

    // Pour chaque patient, créer quelques alertes
    for (const patient of patients) {
      // Récupérer une mesure du patient
      const mesure = await Mesure.findOne({ idUtilisateur: patient._id }).sort({ horodatageMesure: -1 });
      
      if (!mesure) continue;

      // Alerte CRITIQUE
      alertes.push({
        idUtilisateur: patient._id,
        idMesure: mesure._id,
        type: 'critique',
        parametre: 'bpm',
        valeur: 165,
        seuil: 140,
        message: `⚠️ BPM CRITIQUE : 165 bpm détecté (seuil: 140 bpm) - Intervention urgente requise`,
        estAcquittee: false,
        horodatage: new Date(maintenant.getTime() - 2 * 60 * 60 * 1000) // Il y a 2h
      });

      // Alerte DANGER
      alertes.push({
        idUtilisateur: patient._id,
        idMesure: mesure._id,
        type: 'danger',
        parametre: 'spo2',
        valeur: 88,
        seuil: 90,
        message: `⚠️ SpO2 DANGER : 88% détecté (seuil: 90%) - Surveillance rapprochée nécessaire`,
        estAcquittee: false,
        horodatage: new Date(maintenant.getTime() - 1 * 60 * 60 * 1000) // Il y a 1h
      });

      // Alerte AVERTISSEMENT
      alertes.push({
        idUtilisateur: patient._id,
        idMesure: mesure._id,
        type: 'avertissement',
        parametre: 'bpm',
        valeur: 105,
        seuil: 100,
        message: `ℹ️ BPM ÉLEVÉ : 105 bpm détecté (seuil: 100 bpm) - Surveillance recommandée`,
        estAcquittee: false,
        horodatage: new Date(maintenant.getTime() - 30 * 60 * 1000) // Il y a 30 min
      });

      // Alerte ACQUITTÉE (exemple historique)
      alertes.push({
        idUtilisateur: patient._id,
        idMesure: mesure._id,
        type: 'danger',
        parametre: 'spo2',
        valeur: 92,
        seuil: 95,
        message: `⚠️ SpO2 BAS : 92% détecté (seuil: 95%)`,
        estAcquittee: true,
        dateAcquittement: new Date(maintenant.getTime() - 12 * 60 * 60 * 1000), // Il y a 12h
        horodatage: new Date(maintenant.getTime() - 13 * 60 * 60 * 1000) // Il y a 13h
      });
    }

    // Insérer les alertes
    const created = await Alerte.insertMany(alertes);
    
    console.log(`✅ ${created.length} alertes créées\n`);
    
    console.log('📊 Répartition :');
    console.log(`   🔴 Critiques : ${alertes.filter(a => a.type === 'critique' && !a.estAcquittee).length}`);
    console.log(`   🟠 Danger : ${alertes.filter(a => a.type === 'danger' && !a.estAcquittee).length}`);
    console.log(`   🟡 Avertissement : ${alertes.filter(a => a.type === 'avertissement' && !a.estAcquittee).length}`);
    console.log(`   ✅ Acquittées : ${alertes.filter(a => a.estAcquittee).length}`);
    
    console.log('\n🎉 Seed terminé ! Actualisez le dashboard médecin.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

connectDB().then(seedAlertes);
