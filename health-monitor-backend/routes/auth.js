const { envoyerEmailBienvenue } = require('../services/emailService');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/User');

// Clé secrète JWT (sera dans .env plus tard)
const JWT_SECRET = process.env.JWT_SECRET || 'cle_secrete_temporaire_a_changer';

// ==================== ROUTES AUTHENTIFICATION ====================

// 📝 POST /api/auth/inscription - Créer un nouveau compte
router.post('/inscription', async (req, res) => {
  try {
    console.log('\n📝 Nouvelle inscription');
    
    const { prenom, nom, email, motDePasse, dateDeNaissance, genre, idDispositif, photoProfil } = req.body;
    
    // Validation des données obligatoires
    if (!prenom || !nom || !email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: '❌ Données manquantes (prenom, nom, email, motDePasse requis)'
      });
    }
    
    // Vérifier si l'email existe déjà
    const utilisateurExistant = await Utilisateur.findOne({ email: email.toLowerCase() });
    
    if (utilisateurExistant) {
      return res.status(400).json({
        success: false,
        message: '❌ Cet email est déjà utilisé'
      });
    }
    
    // Vérifier si le deviceId existe déjà (si fourni)
    if (idDispositif) {
      const dispositifExistant = await Utilisateur.findOne({ idDispositif: idDispositif });
      
      if (dispositifExistant) {
        return res.status(400).json({
          success: false,
          message: '❌ Ce dispositif est déjà associé à un autre utilisateur'
        });
      }
    }
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const motDePasseHache = await bcrypt.hash(motDePasse, salt);
    
    // Créer le nouvel utilisateur
    // Générer un idDispositif automatique pour les non-patients
let deviceId = idDispositif;

if (!deviceId) {
  const roleUser = req.body.role || 'patient';
  
  if (roleUser === 'medecin') {
    // Médecins : MEDECIN_[timestamp]
    deviceId = `MEDECIN_${Date.now()}`;
  } else if (roleUser === 'admin') {
    // Admins : ADMIN_[timestamp]
    deviceId = `ADMIN_${Date.now()}`;
  }
  // Patients sans deviceId : null (ils doivent en fournir un)
}

const nouvelUtilisateur = new Utilisateur({
  prenom: prenom,
  nom: nom,
  email: email.toLowerCase(),
  motDePasse: motDePasseHache,
  dateDeNaissance: dateDeNaissance || null,
  genre: genre || null,
  photoProfil: photoProfil || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${prenom}+${nom}`,
  idDispositif: deviceId,
  role: req.body.role || 'patient',
  estActif: true
});
    
    // Sauvegarder en base
    await nouvelUtilisateur.save();
    
    // Envoyer l'email de bienvenue
    const motDePasseTemporaire = req.body.sendEmail ? req.body.motDePasse : null;
    envoyerEmailBienvenue(nouvelUtilisateur, motDePasseTemporaire).catch(err => {
      console.error('⚠️ Email non envoyé:', err.message);
      // On ne bloque pas l'inscription si l'email échoue
    });

    // Créer le token JWT
    const token = jwt.sign(
      { 
        id: nouvelUtilisateur._id,
        email: nouvelUtilisateur.email,
        role: nouvelUtilisateur.role
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Token valide 7 jours
    );
    
    console.log('✅ Utilisateur créé:', email);
    console.log(`   ID: ${nouvelUtilisateur._id}\n`);
    
    res.status(201).json({
      success: true,
      message: '✅ Compte créé avec succès',
      token: token,
      utilisateur: {
        id: nouvelUtilisateur._id,
        prenom: nouvelUtilisateur.prenom,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
        photoProfil: nouvelUtilisateur.photoProfil,
        role: nouvelUtilisateur.role,
        idDispositif: nouvelUtilisateur.idDispositif
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur inscription:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 🔐 POST /api/auth/connexion - Se connecter
router.post('/connexion', async (req, res) => {
  try {
    console.log('\n🔐 Tentative de connexion');
    
    const { email, motDePasse } = req.body;
    
    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: '❌ Email et mot de passe requis'
      });
    }
    
    // Trouver l'utilisateur (avec le mot de passe cette fois)
    const utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() }).select('+motDePasse');
    
    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: '❌ Email ou mot de passe incorrect'
      });
    }
    
    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    
    if (!motDePasseValide) {
      return res.status(401).json({
        success: false,
        message: '❌ Email ou mot de passe incorrect'
      });
    }
    
    // Vérifier si le compte est actif
    if (!utilisateur.estActif) {
      return res.status(403).json({
        success: false,
        message: '❌ Compte désactivé. Contactez un administrateur.'
      });
    }
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        id: utilisateur._id,
        email: utilisateur.email,
        role: utilisateur.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Connexion réussie:', email);
    console.log(`   User: ${utilisateur.prenom} ${utilisateur.nom}\n`);
    
    res.json({
      success: true,
      message: '✅ Connexion réussie',
      token: token,
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        photoProfil: utilisateur.photoProfil,
        role: utilisateur.role,
        idDispositif: utilisateur.idDispositif,
        parametresAlertes: utilisateur.parametresAlertes
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur connexion:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 👤 GET /api/auth/profil - Récupérer le profil (nécessite token)
router.get('/profil', async (req, res) => {
  try {
    // Récupérer le token depuis les headers
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '❌ Token manquant. Connectez-vous d\'abord.'
      });
    }
    
    // Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findById(decoded.id);
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: '❌ Utilisateur non trouvé'
      });
    }
    
    console.log('👤 Profil récupéré:', utilisateur.email);
    
    res.json({
      success: true,
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        nomComplet: utilisateur.nomComplet,
        email: utilisateur.email,
        photoProfil: utilisateur.photoProfil,
        dateDeNaissance: utilisateur.dateDeNaissance,
        genre: utilisateur.genre,
        idDispositif: utilisateur.idDispositif,
        role: utilisateur.role,
        parametresAlertes: utilisateur.parametresAlertes,
        dateCreation: utilisateur.createdAt
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '❌ Token invalide'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '❌ Token expiré. Reconnectez-vous.'
      });
    }
    
    console.error('❌ Erreur profil:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});


// Mettre à jour le profil utilisateur
// Mettre à jour le profil utilisateur
router.put('/utilisateurs/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { prenom, nom, email, photoProfil } = req.body;

    console.log('📝 Mise à jour profil pour:', userId);
    console.log('Données reçues:', { 
      prenom, 
      nom, 
      email, 
      photoProfil: photoProfil ? 'oui (longueur: ' + photoProfil.length + ')' : 'non' 
    });

    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour UNIQUEMENT les champs fournis
    if (prenom !== undefined) utilisateur.prenom = prenom;
    if (nom !== undefined) utilisateur.nom = nom;
    if (email !== undefined) utilisateur.email = email;
    
    // Ne mettre à jour la photo QUE si elle est fournie
    if (photoProfil !== undefined) {
      utilisateur.photoProfil = photoProfil;
      console.log('✅ Photo mise à jour, taille:', photoProfil.length);
    }

    await utilisateur.save();

    console.log('✅ Profil mis à jour');

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        photoProfil: utilisateur.photoProfil,
        idDispositif: utilisateur.idDispositif
      }
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Changer le mot de passe
// Changer le mot de passe
router.put('/utilisateurs/:userId/password', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Changement mot de passe pour:', userId);
    console.log('Données reçues:', { currentPassword: '***', newPassword: '***' });

    // IMPORTANT: Récupérer l'utilisateur AVEC le mot de passe (select: false par défaut)
    const utilisateur = await Utilisateur.findById(userId).select('+motDePasse');
    
    if (!utilisateur) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    console.log('✅ Utilisateur trouvé:', utilisateur.email);
    console.log('Hash mot de passe existe ?', !!utilisateur.motDePasse);
    console.log('Longueur du hash:', utilisateur.motDePasse?.length);

    // Vérifier que le mot de passe existe
    if (!utilisateur.motDePasse) {
      console.log('❌ Pas de mot de passe dans la DB !');
      return res.status(500).json({
        success: false,
        message: 'Mot de passe non défini dans la base de données. Contactez un administrateur.'
      });
    }

    // Vérifier le mot de passe actuel
    console.log('Comparaison avec bcrypt...');
    const estValide = await bcrypt.compare(currentPassword, utilisateur.motDePasse);
    console.log('Résultat comparaison:', estValide);

    if (!estValide) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    console.log('Création du nouveau hash...');
    const nouveauHash = await bcrypt.hash(newPassword, 10);
    console.log('Nouveau hash créé, longueur:', nouveauHash.length);
    
    utilisateur.motDePasse = nouveauHash;
    await utilisateur.save();

    console.log('✅ Mot de passe modifié avec succès');

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message
    });
  }
});

// Upload photo de profil
router.post('/utilisateurs/:userId/photo', async (req, res) => {
  try {
    const userId = req.params.userId;
    // TODO: Implémenter l'upload réel avec multer + cloudinary
    
    res.json({
      success: true,
      message: 'Photo mise à jour avec succès',
      photoUrl: 'https://ui-avatars.com/api/?name=Updated&size=200'
    });

  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de la photo'
    });
  }
});

module.exports = router;