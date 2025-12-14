require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Utilisateur = require('../models/User');
const Mesure = require('../models/Measurement');

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  }
};

// Créer les utilisateurs de test
const seedUsers = async () => {
  try {
    // Supprimer les utilisateurs existants
    await Utilisateur.deleteMany({});
    console.log('🗑️  Utilisateurs supprimés');

    // Hash des mots de passe
    const passwordHash = await bcrypt.hash('password123', 10);

    // Créer les utilisateurs
    const users = [
      {
        prenom: 'Test',
        nom: 'Patient',
        email: 'test.patient@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Test+Patient&background=0D8ABC&color=fff&size=200',
        idDispositif: 'ESP32_TEST_001',
        dateDeNaissance: new Date('1990-01-15'),
        genre: 'homme',
        parametresAlertes: {
          bpmMin: 60,
          bpmMax: 100,
          spo2Min: 95,
          notificationsEmail: true,
          alertesSonores: true
        },
        estActif: true
      },
      {
        prenom: 'Dr. Marie',
        nom: 'Dupont',
        email: 'dr.dupont@example.com',
        motDePasse: passwordHash,
        role: 'medecin',
        photoProfil: 'https://ui-avatars.com/api/?name=Dr+Marie+Dupont&background=10B981&color=fff&size=200',
        dateDeNaissance: new Date('1980-05-20'),
        genre: 'femme',
        estActif: true
      },
      {
        prenom: 'Admin',
        nom: 'Système',
        email: 'admin@example.com',
        motDePasse: passwordHash,
        role: 'admin',
        photoProfil: 'https://ui-avatars.com/api/?name=Admin+Systeme&background=EF4444&color=fff&size=200',
        genre: 'homme',
        estActif: true
      },
      {
        prenom: 'Jean',
        nom: 'Martin',
        email: 'jean.martin@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Jean+Martin&background=8B5CF6&color=fff&size=200',
        idDispositif: 'ESP32_TEST_002',
        dateDeNaissance: new Date('1985-08-10'),
        genre: 'homme',
        parametresAlertes: {
          bpmMin: 55,
          bpmMax: 110,
          spo2Min: 94,
          notificationsEmail: true,
          alertesSonores: false
        },
        estActif: true
      },
      {
        prenom: 'Sophie',
        nom: 'Bernard',
        email: 'sophie.bernard@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Sophie+Bernard&background=F59E0B&color=fff&size=200',
        idDispositif: 'ESP32_TEST_003',
        dateDeNaissance: new Date('1992-03-25'),
        genre: 'femme',
        parametresAlertes: {
          bpmMin: 60,
          bpmMax: 100,
          spo2Min: 95,
          notificationsEmail: true,
          alertesSonores: true
        },
        estActif: true
      }
    ];

    const createdUsers = await Utilisateur.insertMany(users);
    console.log(`✅ ${createdUsers.length} utilisateurs créés`);

    return createdUsers;
  } catch (error) {
    console.error('❌ Erreur création utilisateurs:', error);
    throw error;
  }
};

// Créer des mesures de test
const seedMeasurements = async (users) => {
  try {
    // Supprimer les mesures existantes
    await Mesure.deleteMany({});
    console.log('🗑️  Mesures supprimées');

    const measurements = [];
    const patients = users.filter(u => u.role === 'patient');

    // Créer 30 mesures pour chaque patient
    for (const patient of patients) {
      for (let i = 0; i < 30; i++) {
        const now = new Date();
        const horodatageMesure = new Date(now.getTime() - (i * 3600000)); // Espacées d'1h

        // Générer des valeurs réalistes
        let bpm, spo2, statut, qualite;
        const random = Math.random();

        if (random < 0.7) {
          // 70% de mesures normales
          bpm = 60 + Math.floor(Math.random() * 40); // 60-100
          spo2 = 95 + Math.floor(Math.random() * 5); // 95-100
          statut = 'NORMAL';
          qualite = 'bonne';
        } else if (random < 0.9) {
          // 20% attention
          bpm = 100 + Math.floor(Math.random() * 20); // 100-120
          spo2 = 90 + Math.floor(Math.random() * 5); // 90-95
          statut = 'ATTENTION';
          qualite = Math.random() < 0.5 ? 'bonne' : 'moyenne';
        } else {
          // 10% danger
          bpm = 120 + Math.floor(Math.random() * 30); // 120-150
          spo2 = 85 + Math.floor(Math.random() * 5); // 85-90
          statut = 'DANGER';
          qualite = Math.random() < 0.3 ? 'moyenne' : 'mauvaise';
        }

        measurements.push({
          idUtilisateur: patient._id,
          idDispositif: patient.idDispositif,
          bpm,
          spo2,
          statut,
          niveauBatterie: 50 + Math.floor(Math.random() * 50), // 50-100%
          qualite, // Utilise les valeurs: 'bonne', 'moyenne', 'mauvaise'
          horodatageMesure,
          temperature: 36 + Math.random() * 2 // 36-38°C (optionnel)
        });
      }
    }

    const createdMeasurements = await Mesure.insertMany(measurements);
    console.log(`✅ ${createdMeasurements.length} mesures créées`);

    return createdMeasurements;
  } catch (error) {
    console.error('❌ Erreur création mesures:', error);
    throw error;
  }
};

// Fonction principale
const seedDatabase = async () => {
  try {
    console.log('🌱 Démarrage du seed de la base de données...\n');

    await connectDB();

    const users = await seedUsers();
    await seedMeasurements(users);

    console.log('\n✅ Seed terminé avec succès !');
    console.log('\n📋 Utilisateurs créés :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Patient 1:');
    console.log('   Nom: Test Patient');
    console.log('   Email: test.patient@example.com');
    console.log('   Mot de passe: password123');
    console.log('   Dispositif: ESP32_TEST_001');
    console.log('');
    console.log('👤 Patient 2:');
    console.log('   Nom: Jean Martin');
    console.log('   Email: jean.martin@example.com');
    console.log('   Mot de passe: password123');
    console.log('   Dispositif: ESP32_TEST_002');
    console.log('');
    console.log('👤 Patient 3:');
    console.log('   Nom: Sophie Bernard');
    console.log('   Email: sophie.bernard@example.com');
    console.log('   Mot de passe: password123');
    console.log('   Dispositif: ESP32_TEST_003');
    console.log('');
    console.log('👨‍⚕️ Médecin:');
    console.log('   Nom: Dr. Marie Dupont');
    console.log('   Email: dr.dupont@example.com');
    console.log('   Mot de passe: password123');
    console.log('');
    console.log('⚙️  Admin:');
    console.log('   Nom: Admin Système');
    console.log('   Email: admin@example.com');
    console.log('   Mot de passe: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Utilisez ces identifiants pour vous connecter !');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
};

// Exécuter le seed
seedDatabase();