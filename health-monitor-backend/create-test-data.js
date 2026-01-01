require('dotenv').config();
const mongoose = require('mongoose');
const Alerte = require('./models/Alerte');
const Utilisateur = require('./models/Utilisateur');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté');
    
    const patient = await Utilisateur.findOne({ role: 'patient' });
    if (!patient) {
      console.log('❌ Aucun patient');
      process.exit(0);
    }
    
    // Créer 3 alertes
    await Alerte.create([
      {
        idUtilisateur: patient._id,
        type: 'critique',
        parametre: 'bpm',
        valeur: 150,
        seuil: 120,
        message: 'BPM critique',
        estAcquittee: false
      },
      {
        idUtilisateur: patient._id,
        type: 'danger',
        parametre: 'spo2',
        valeur: 88,
        seuil: 90,
        message: 'SpO2 bas',
        estAcquittee: false
      },
      {
        idUtilisateur: patient._id,
        type: 'avertissement',
        parametre: 'bpm',
        valeur: 105,
        seuil: 100,
        message: 'BPM élevé',
        estAcquittee: false
      }
    ]);
    
    console.log('✅ 3 alertes créées');
    process.exit(0);
  });
