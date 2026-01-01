require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('./models/Alert');

const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // ⚠️ REMPLACE PAR UN VRAI ID PATIENT
    const patientId = '6956aa27e82a63b68ada8a8c';
    
    // Créer 5 alertes
    const alertes = await Alert.create([
      {
        idUtilisateur: patientId,
        type: 'critique',
        parametre: 'bpm',
        valeur: 150,
        seuil: 120,
        message: 'Battements cardiaques critiques détectés',
        estAcquittee: false
      },
      {
        idUtilisateur: patientId,
        type: 'critique',
        parametre: 'spo2',
        valeur: 85,
        seuil: 90,
        message: 'SpO2 dangereusement bas',
        estAcquittee: false
      },
      {
        idUtilisateur: patientId,
        type: 'danger',
        parametre: 'bpm',
        valeur: 130,
        seuil: 120,
        message: 'BPM élevé',
        estAcquittee: false
      },
      {
        idUtilisateur: patientId,
        type: 'danger',
        parametre: 'spo2',
        valeur: 88,
        seuil: 90,
        message: 'SpO2 bas',
        estAcquittee: false
      },
      {
        idUtilisateur: patientId,
        type: 'avertissement',
        parametre: 'bpm',
        valeur: 105,
        seuil: 100,
        message: 'BPM légèrement élevé',
        estAcquittee: false
      }
    ]);
    
    console.log('✅', alertes.length, 'alertes créées !');
    
    // Compter les alertes
    const count = await Alert.countDocuments({ estAcquittee: false });
    console.log('📊 Total alertes non acquittées:', count);
    
    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
})();
