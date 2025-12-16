const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const Alerte = require('../models/Alert');
const User = require('../models/User');
const Mesure = require('../models/Measurement');

// Middleware médecin
const verifierMedecin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès médecin requis' });
  }
  next();
};

// Liste des alertes actives (non acquittées)
router.get('/actives', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const alertes = await Alerte.find({ estAcquittee: false })
      .populate('idUtilisateur', 'prenom nom email photoProfil')
      .populate('idMesure')
      .populate('acquitteePar', 'prenom nom')
      .sort({ type: 1, horodatage: -1 }) // critique > danger > avertissement
      .limit(100);
    
    // Trier par gravité
    const alertesTriees = alertes.sort((a, b) => {
      const ordre = { 'critique': 1, 'danger': 2, 'avertissement': 3 };
      return ordre[a.type] - ordre[b.type];
    });
    
    console.log(`⚠️  ${alertesTriees.length} alertes actives`);
    
    res.json({
      success: true,
      alertes: alertesTriees,
      total: alertesTriees.length
    });
  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Toutes les alertes (avec filtres)
router.get('/', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { statut, type, patientId } = req.query;
    
    const filter = {};
    
    if (statut === 'acquittees') {
      filter.estAcquittee = true;
    } else if (statut === 'actives') {
      filter.estAcquittee = false;
    }
    
    if (type) filter.type = type; // critique, danger, avertissement
    if (patientId) filter.idUtilisateur = patientId;
    
    const alertes = await Alerte.find(filter)
      .populate('idUtilisateur', 'prenom nom email photoProfil')
      .populate('acquitteePar', 'prenom nom')
      .sort({ horodatage: -1 })
      .limit(200);
    
    res.json({
      success: true,
      alertes,
      total: alertes.length
    });
  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Acquitter une alerte
router.put('/:alerteId/acquitter', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const alerte = await Alerte.findById(req.params.alerteId);
    if (!alerte) {
      return res.status(404).json({ success: false, message: 'Alerte non trouvée' });
    }
    
    alerte.estAcquittee = true;
    alerte.acquitteePar = req.utilisateur.id;
    alerte.dateAcquittement = new Date();
    
    await alerte.save();
    
    const alertePopulee = await Alerte.findById(alerte._id)
      .populate('idUtilisateur', 'prenom nom')
      .populate('acquitteePar', 'prenom nom');
    
    console.log(`✅ Alerte ${alerte._id} acquittée par Dr. ${req.utilisateur.id}`);
    
    res.json({
      success: true,
      message: 'Alerte acquittée',
      alerte: alertePopulee
    });
  } catch (error) {
    console.error('Erreur acquittement alerte:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Acquitter plusieurs alertes en masse
router.put('/acquitter-masse', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { alerteIds } = req.body;
    
    if (!alerteIds || !Array.isArray(alerteIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Liste d\'alertes requise' 
      });
    }
    
    const result = await Alerte.updateMany(
      { _id: { $in: alerteIds } },
      { 
        estAcquittee: true,
        acquitteePar: req.utilisateur.id,
        dateAcquittement: new Date()
      }
    );
    
    console.log(`✅ ${result.modifiedCount} alertes acquittées en masse`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} alertes acquittées`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur acquittement masse:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Statistiques alertes
router.get('/statistiques', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const stats = {
      total: await Alerte.countDocuments(),
      actives: await Alerte.countDocuments({ estAcquittee: false }),
      acquittees: await Alerte.countDocuments({ estAcquittee: true }),
      critiques: await Alerte.countDocuments({ type: 'critique', estAcquittee: false }),
      danger: await Alerte.countDocuments({ type: 'danger', estAcquittee: false }),
      avertissement: await Alerte.countDocuments({ type: 'avertissement', estAcquittee: false })
    };
    
    res.json({
      success: true,
      statistiques: stats
    });
  } catch (error) {
    console.error('Erreur stats alertes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Alertes d'un patient spécifique
router.get('/patient/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const alertes = await Alerte.find({ idUtilisateur: req.params.patientId })
      .populate('acquitteePar', 'prenom nom')
      .sort({ horodatage: -1 })
      .limit(50);
    
    res.json({
      success: true,
      alertes,
      total: alertes.length
    });
  } catch (error) {
    console.error('Erreur alertes patient:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;