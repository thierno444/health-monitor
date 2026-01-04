const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const archivageService = require('../services/archivageService');
const Utilisateur = require('../models/User');


// Middleware : vérifier rôle médecin ou admin
const verifierMedecinOuAdmin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  }
  next();
};

// Archiver un utilisateur (médecin ou admin)
router.put('/:userId/archiver', verifierToken, verifierMedecinOuAdmin, async (req, res) => {
  try {
    const { raison, commentaire, exportData } = req.body;  
    
    const result = await archivageService.archiverUtilisateur(
      req.params.userId,
      req.utilisateur.id,
      raison,
      commentaire
    );
    
    // Si exportData demandé, on l'a déjà dans result.exportData
    res.json(result);
    
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Désarchiver un utilisateur
router.put('/:userId/desarchiver', verifierToken, verifierMedecinOuAdmin, async (req, res) => {
  try {
    const { raison } = req.body;
    
    const result = await archivageService.desarchiverUtilisateur(
      req.params.userId,
      req.utilisateur.id,
      raison
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Archivage en masse (admin uniquement)
router.post('/masse/archiver', verifierToken, async (req, res) => {
  try {
    if (req.utilisateur.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    
    const { utilisateurIds, raison, commentaire } = req.body;
    
    const result = await archivageService.archiverEnMasse(
      utilisateurIds,
      req.utilisateur.id,
      raison,
      commentaire
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Supprimer définitivement (admin uniquement)
router.delete('/:userId/supprimer', verifierToken, async (req, res) => {
  try {
    if (req.utilisateur.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    
    const result = await archivageService.supprimerDefinitivement(
      req.params.userId,
      req.utilisateur.id
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Statistiques (admin uniquement)
router.get('/statistiques', verifierToken, async (req, res) => {
  try {
    if (req.utilisateur.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    
    const stats = await archivageService.getStatistiques();
    res.json({ success: true, statistiques: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ajouter APRÈS la route /statistiques

// ========== ARCHIVER AVEC EXPORT ==========
router.patch('/:userId/archiver-export', verifierToken, verifierMedecinOuAdmin, async (req, res) => {
  try {
    const { raison, commentaire } = req.body;
    
    const result = await archivageService.archiverUtilisateur(
      req.params.userId,
      req.utilisateur.id,
      raison,
      commentaire
    );
    
    // Générer CSV
    const user = result.utilisateur;
    const csv = [
      ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Date archivage', 'Raison'],
      [user.prenom, user.nom, user.email, user.telephone || '', user.role, 
       new Date(user.dateArchivage).toLocaleDateString('fr-FR'), raison]
    ].map(row => row.join(';')).join('\n');
    
    res.json({
      ...result,
      exportData: csv
    });
    
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;