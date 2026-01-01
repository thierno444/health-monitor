const { envoyerEmailBienvenue } = require('../services/emailService');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ← SEULEMENT User
const verifierToken = require('../middleware/auth'); 

const JWT_SECRET = process.env.JWT_SECRET || 'cle_secrete_temporaire_a_changer';

// ==================== ROUTES AUTHENTIFICATION ====================

// 📝 POST /api/auth/inscription
router.post('/inscription', async (req, res) => {
  try {
    console.log('\n📝 Nouvelle inscription');
    
    const { prenom, nom, email, telephone, motDePasse, dateDeNaissance, genre, idDispositif, photoProfil } = req.body;
    
    if (!prenom || !nom || !email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: '❌ Données manquantes (prenom, nom, email, motDePasse requis)'
      });
    }

     if (dateDeNaissance) {
      const dateSaisie = new Date(dateDeNaissance);
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      if (dateSaisie > aujourdhui) {
        return res.status(400).json({
          success: false,
          message: '❌ La date de naissance ne peut pas être dans le futur'
        });
      }
      
      // Vérifier âge minimum (13 ans)
      const age = aujourdhui.getFullYear() - dateSaisie.getFullYear();
      const mois = aujourdhui.getMonth() - dateSaisie.getMonth();
      const ageReel = (mois < 0 || (mois === 0 && aujourdhui.getDate() < dateSaisie.getDate())) ? age - 1 : age;
      
      if (ageReel < 13) {
        return res.status(400).json({
          success: false,
          message: '❌ Vous devez avoir au moins 13 ans pour créer un compte'
        });
      }
    }
    
    const utilisateurExistant = await User.findOne({ email: email.toLowerCase() });
    
    if (utilisateurExistant) {
      return res.status(400).json({
        success: false,
        message: '❌ Cet email est déjà utilisé'
      });
    }
    
    if (idDispositif) {
      const dispositifExistant = await User.findOne({ idDispositif: idDispositif });
      
      if (dispositifExistant) {
        return res.status(400).json({
          success: false,
          message: '❌ Ce dispositif est déjà associé à un autre utilisateur'
        });
      }
    }
    
    const salt = await bcrypt.genSalt(10);
    const motDePasseHache = await bcrypt.hash(motDePasse, salt);
    
    let deviceId = idDispositif;

    if (!deviceId) {
      const roleUser = req.body.role || 'patient';
      
      if (roleUser === 'medecin') {
        deviceId = `MEDECIN_${Date.now()}`;
      } else if (roleUser === 'admin') {
        deviceId = `ADMIN_${Date.now()}`;
      }
    }

    const nouvelUtilisateur = new User({
      prenom: prenom,
      nom: nom,
      email: email.toLowerCase(),
      telephone: telephone || null,
      motDePasse: motDePasseHache,
      dateDeNaissance: dateDeNaissance || null,
      genre: genre || null,
      photoProfil: photoProfil || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${prenom}+${nom}`,
      idDispositif: deviceId,
      role: req.body.role || 'patient',
      estActif: true
    });
    
    await nouvelUtilisateur.save();
    
    const motDePasseTemporaire = req.body.sendEmail ? req.body.motDePasse : null;
    envoyerEmailBienvenue(nouvelUtilisateur, motDePasseTemporaire).catch(err => {
      console.error('⚠️ Email non envoyé:', err.message);
    });

    const token = jwt.sign(
      { 
        id: nouvelUtilisateur._id,
        email: nouvelUtilisateur.email,
        telephone: nouvelUtilisateur.telephone, 
        role: nouvelUtilisateur.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Utilisateur créé:', email);
    
    res.status(201).json({
      success: true,
      message: '✅ Compte créé avec succès',
      token: token,
      utilisateur: {
        id: nouvelUtilisateur._id,
        prenom: nouvelUtilisateur.prenom,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
        telephone: nouvelUtilisateur.telephone, 
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

// 🔐 POST /api/auth/connexion
// 🔐 POST /api/auth/connexion
router.post('/connexion', async (req, res) => {
  try {
    console.log('\n🔐 Tentative de connexion');
    
    const { email, motDePasse } = req.body;
    
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: '❌ Email et mot de passe requis',
        field: 'general'
      });
    }
    
    const utilisateur = await User.findOne({ email: email.toLowerCase() }).select('+motDePasse');
    
    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Aucun compte avec cet email',
        field: 'email'  // ← Indique que c'est l'email le problème
      });
    }
    
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    
    if (!motDePasseValide) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect',
        field: 'password'  // ← Indique que c'est le mot de passe le problème
      });
    }
    
    if (!utilisateur.estActif) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez un administrateur.',
        field: 'general'
      });
    }
    
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
    
    res.json({
      success: true,
      message: '✅ Connexion réussie',
      token: token,
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
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
      field: 'general',
      error: error.message
    });
  }
});
// GET /api/auth/profil
router.get('/profil', verifierToken, async (req, res) => {
  try {
    const utilisateur = await User.findById(req.utilisateur.id).select('-motDePasse');
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    console.log('👤 Profil récupéré:', utilisateur.email);
    
    res.json({
      success: true,
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        photoProfil: utilisateur.photoProfil,
        idDispositif: utilisateur.idDispositif,
        role: utilisateur.role,
        createdAt: utilisateur.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /api/auth/patients
router.get('/patients', verifierToken, async (req, res) => {
  try {
    if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux médecins'
      });
    }

    const patients = await User.find({ role: 'patient' })
      .select('-motDePasse')
      .sort({ createdAt: -1 });

    console.log(`📋 ${patients.length} patients trouvés`);

    res.json({
      success: true,
      patients: patients.map(p => ({
        _id: p._id,
        prenom: p.prenom,
        nom: p.nom,
        email: p.email,
        telephone: p.telephone,
        photoProfil: p.photoProfil,
        idDispositif: p.idDispositif,
        createdAt: p.createdAt,
        role: p.role
      })),
      total: patients.length
    });
  } catch (error) {
    console.error('Erreur récupération patients:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/auth/patients/:patientId
router.get('/patients/:patientId', verifierToken, async (req, res) => {
  try {
    if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux médecins'
      });
    }

    const patient = await User.findById(req.params.patientId).select('-motDePasse');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    res.json({
      success: true,
      patient: {
        _id: patient._id,
        prenom: patient.prenom,
        nom: patient.nom,
        email: patient.email,
        telephone: patient.telephone,
        photoProfil: patient.photoProfil,
        idDispositif: patient.idDispositif,
        createdAt: patient.createdAt,
        role: patient.role
      }
    });
  } catch (error) {
    console.error('Erreur récupération patient:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/auth/utilisateurs/:userId
router.put('/utilisateurs/:userId', verifierToken, async (req, res) => {
  try {
      const { prenom, nom, email, telephone, genre, dateDeNaissance, role, idDispositif } = req.body;
    
    console.log('📝 Mise à jour utilisateur:', req.params.userId);
    
    const utilisateur = await User.findById(req.params.userId);
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (req.utilisateur.id !== req.params.userId && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Vous ne pouvez modifier que votre propre profil' 
      });
    }

    if (prenom !== undefined) utilisateur.prenom = prenom;
    if (nom !== undefined) utilisateur.nom = nom;
    if (email !== undefined) utilisateur.email = email;
    if (telephone !== undefined) utilisateur.telephone = telephone || null;
    if (genre !== undefined) utilisateur.genre = genre;  // ← AJOUT
    if (dateDeNaissance !== undefined) {  // ← AJOUT AVEC VALIDATION
      // Valider si date fournie
      if (dateDeNaissance) {
        const dateSaisie = new Date(dateDeNaissance);
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        
        if (dateSaisie > aujourdhui) {
          return res.status(400).json({
            success: false,
            message: '❌ La date de naissance ne peut pas être dans le futur'
          });
        }
      }
      utilisateur.dateDeNaissance = dateDeNaissance || null;
    }
    if (role !== undefined && req.utilisateur.role === 'admin') utilisateur.role = role;
    if (idDispositif !== undefined) utilisateur.idDispositif = idDispositif;

    await utilisateur.save({ validateModifiedOnly: true });
    
    console.log('✅ Utilisateur mis à jour');

    res.json({
      success: true,
      message: 'Profil mis à jour',
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        role: utilisateur.role,
        photoProfil: utilisateur.photoProfil,
        idDispositif: utilisateur.idDispositif
      }
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

// PUT /api/auth/utilisateurs/:userId/password
router.put('/utilisateurs/:userId/password', verifierToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const utilisateur = await User.findById(req.params.userId).select('+motDePasse');
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!utilisateur.motDePasse) {
      return res.status(500).json({
        success: false,
        message: 'Mot de passe non défini'
      });
    }

    const estValide = await bcrypt.compare(currentPassword, utilisateur.motDePasse);

    if (!estValide) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    utilisateur.motDePasse = await bcrypt.hash(newPassword, 10);
    await utilisateur.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message
    });
  }
});

// POST /api/auth/utilisateurs/:userId/photo
router.post('/utilisateurs/:userId/photo', verifierToken, async (req, res) => {
  try {
    const { photo } = req.body;
    
    console.log('📸 Upload photo pour:', req.params.userId);
    
    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'Photo requise'
      });
    }
    
    if (req.utilisateur.id !== req.params.userId && req.utilisateur.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission refusée'
      });
    }

    const utilisateur = await User.findById(req.params.userId);
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    utilisateur.photoProfil = photo;
    await utilisateur.save();

    console.log('✅ Photo mise à jour');

    res.json({
      success: true,
      message: 'Photo mise à jour avec succès',
      utilisateur: {
        id: utilisateur._id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        photoProfil: utilisateur.photoProfil,
        role: utilisateur.role,
        idDispositif: utilisateur.idDispositif
      }
    });

  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur upload',
      error: error.message
    });
  }
});

// ==================== RÉINITIALISATION MOT DE PASSE ====================

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔐 Demande réinitialisation pour:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }
    
    const utilisateur = await User.findOne({ email: email.toLowerCase() });
    
    if (!utilisateur) {
      // Ne pas révéler que l'email n'existe pas (sécurité)
      return res.json({
        success: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
      });
    }
    
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    utilisateur.resetPasswordToken = resetTokenHash;
    utilisateur.resetPasswordExpire = Date.now() + 3600000; // 1 heure
    await utilisateur.save();
    
    const { envoyerEmailResetPassword } = require('../services/emailService');
    
    try {
      await envoyerEmailResetPassword(utilisateur, resetToken);
      console.log('📧 Email de réinitialisation envoyé à:', email);
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email:', emailError.message);
    }
    
    res.json({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
    });
    
  } catch (error) {
    console.error('❌ Erreur forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('🔑 Réinitialisation mot de passe avec token');
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }
    
    const crypto = require('crypto');
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const utilisateur = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    utilisateur.motDePasse = await bcrypt.hash(password, salt);
    
    utilisateur.resetPasswordToken = undefined;
    utilisateur.resetPasswordExpire = undefined;
    
    await utilisateur.save();
    
    console.log('✅ Mot de passe réinitialisé pour:', utilisateur.email);
    
    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});



module.exports = router;