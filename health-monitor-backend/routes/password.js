const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Utilisateur = require('../models/User');
const { envoyerEmailResetPassword } = require('../services/emailService');

// ==================== ROUTES RÉINITIALISATION MOT DE PASSE ====================

// 📧 POST /api/password/forgot - Demander réinitialisation
router.post('/forgot', async (req, res) => {
  try {
    console.log('\n📧 Demande réinitialisation mot de passe');
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '❌ Email requis'
      });
    }
    
    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() });
    
    if (!utilisateur) {
      // Pour la sécurité, on renvoie toujours le même message
      return res.json({
        success: true,
        message: '✅ Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }
    
    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hasher le token avant de le stocker
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Sauvegarder dans la DB (valide 1 heure)
    utilisateur.resetPasswordToken = hashedToken;
    utilisateur.resetPasswordExpire = Date.now() + 3600000; // 1 heure
    
    await utilisateur.save();
    
    // Envoyer l'email
    const emailResult = await envoyerEmailResetPassword(utilisateur, resetToken);
    
    if (!emailResult.success) {
      console.error('❌ Erreur envoi email:', emailResult.error);
      // Même si l'email échoue, on ne révèle pas l'existence du compte
    }
    
    console.log(`✅ Token reset généré pour: ${email}`);
    
    res.json({
      success: true,
      message: '✅ Si cet email existe, un lien de réinitialisation a été envoyé'
    });
    
  } catch (error) {
    console.error('❌ Erreur forgot password:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 🔑 POST /api/password/reset/:token - Réinitialiser le mot de passe
router.post('/reset/:token', async (req, res) => {
  try {
    console.log('\n🔑 Réinitialisation mot de passe');
    
    const { token } = req.params;
    const { nouveauMotDePasse } = req.body;
    
    if (!nouveauMotDePasse) {
      return res.status(400).json({
        success: false,
        message: '❌ Nouveau mot de passe requis'
      });
    }
    
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({
        success: false,
        message: '❌ Le mot de passe doit contenir au moins 6 caractères'
      });
    }
    
    // Hasher le token reçu
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Trouver l'utilisateur avec ce token valide
    const utilisateur = await Utilisateur.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() } // Token pas expiré
    });
    
    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        message: '❌ Token invalide ou expiré'
      });
    }
    
    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    utilisateur.motDePasse = await bcrypt.hash(nouveauMotDePasse, salt);
    
    // Supprimer le token
    utilisateur.resetPasswordToken = undefined;
    utilisateur.resetPasswordExpire = undefined;
    
    await utilisateur.save();
    
    console.log(`✅ Mot de passe réinitialisé pour: ${utilisateur.email}`);
    
    res.json({
      success: true,
      message: '✅ Mot de passe réinitialisé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur reset password:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// ✅ GET /api/password/verify/:token - Vérifier si le token est valide
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const utilisateur = await Utilisateur.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        message: '❌ Token invalide ou expiré'
      });
    }
    
    res.json({
      success: true,
      message: '✅ Token valide',
      email: utilisateur.email
    });
    
  } catch (error) {
    console.error('❌ Erreur verify token:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;