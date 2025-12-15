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
        prenom: 'Alice',
        nom: 'Durand',
        email: 'alice.durand@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Alice+Durand&background=0D8ABC&color=fff&size=200',
        idDispositif: 'ESP32_TEST_004',
        dateDeNaissance: new Date('1995-02-10'),
        genre: 'femme',
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
        prenom: 'François',
        nom: 'Moreau',
        email: 'francois.moreau@example.com',
        motDePasse: passwordHash,
        role: 'medecin',
        photoProfil: 'https://ui-avatars.com/api/?name=François+Moreau&background=10B981&color=fff&size=200',
        dateDeNaissance: new Date('1975-04-25'),
        genre: 'homme',
        estActif: true
      },
      {
        prenom: 'Lucie',
        nom: 'Lefèvre',
        email: 'lucie.lefevre@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Lucie+Lefèvre&background=F59E0B&color=fff&size=200',
        idDispositif: 'ESP32_TEST_005',
        dateDeNaissance: new Date('1998-07-30'),
        genre: 'femme',
        parametresAlertes: {
          bpmMin: 55,
          bpmMax: 105,
          spo2Min: 93,
          notificationsEmail: true,
          alertesSonores: false
        },
        estActif: true
      },
      {
        prenom: 'Marc',
        nom: 'Simon',
        email: 'marc.simon@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Marc+Simon&background=8B5CF6&color=fff&size=200',
        idDispositif: 'ESP32_TEST_006',
        dateDeNaissance: new Date('1989-09-12'),
        genre: 'homme',
        parametresAlertes: {
          bpmMin: 58,
          bpmMax: 110,
          spo2Min: 94,
          notificationsEmail: false,
          alertesSonores: true
        },
        estActif: true
      },
      {
        prenom: 'Emma',
        nom: 'Bourgoin',
        email: 'emma.bourgoin@example.com',
        motDePasse: passwordHash,
        role: 'patient',
        photoProfil: 'https://ui-avatars.com/api/?name=Emma+Bourgoin&background=EF4444&color=fff&size=200',
        idDispositif: 'ESP32_TEST_007',
        dateDeNaissance: new Date('1993-12-19'),
        genre: 'femme',
        parametresAlertes: {
          bpmMin: 62,
          bpmMax: 102,
          spo2Min: 92,
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

    // Afficher les utilisateurs créés
    users.forEach(user => {
      console.log(`👤 ${user.role === 'patient' ? 'Patient' : user.role === 'medecin' ? 'Médecin' : 'Admin'}:`);
      console.log(`   Nom: ${user.prenom} ${user.nom}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mot de passe: password123`);
      console.log(`   Dispositif: ${user.idDispositif}`);
      console.log('');
    });

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