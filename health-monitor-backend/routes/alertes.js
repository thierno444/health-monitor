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

// FONCTION HELPER : Récupérer les IDs des patients assignés au médecin
async function getPatientsAssignesMedecin(medecinId) {
  try {
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find({
      medecinId: medecinId,
      actif: true
    });
    return assignments.map(a => a.patientId);
  } catch (error) {
    console.error('Erreur récupération patients assignés:', error);
    return [];
  }
}

// Liste des alertes actives (non acquittées) - FILTRÉES PAR MÉDECIN
router.get('/actives', verifierToken, verifierMedecin, async (req, res) => {
  try {
    let filter = { estAcquittee: false };
    
    // SI MÉDECIN : Filtrer par patients assignés
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      
      if (patientIds.length === 0) {
        return res.json({
          success: true,
          alertes: [],
          total: 0
        });
      }
      
      filter.idUtilisateur = { $in: patientIds };
    }
    
    const alertes = await Alerte.find(filter)
      .populate('idUtilisateur', 'prenom nom email photoProfil')
      .populate('idMesure')
      .populate('acquitteePar', 'prenom nom')
      .sort({ type: 1, horodatage: -1 })
      .limit(100);
    
    // Trier par gravité
    const alertesTriees = alertes.sort((a, b) => {
      const ordre = { 'critique': 1, 'danger': 2, 'avertissement': 3 };
      return ordre[a.type] - ordre[b.type];
    });
    
    console.log(`⚠️  ${alertesTriees.length} alertes actives pour ${req.utilisateur.role}`);
    
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

// Toutes les alertes (avec filtres) - FILTRÉES PAR MÉDECIN
router.get('/', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { statut, type, patientId } = req.query;
    
    let filter = {};
    
    // SI MÉDECIN : Filtrer par patients assignés
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      
      if (patientIds.length === 0) {
        return res.json({
          success: true,
          alertes: [],
          total: 0
        });
      }
      
      filter.idUtilisateur = { $in: patientIds };
    }
    
    // Filtres supplémentaires
    if (statut === 'acquittees') {
      filter.estAcquittee = true;
    } else if (statut === 'actives') {
      filter.estAcquittee = false;
    }
    
    if (type) filter.type = type;
    if (patientId) filter.idUtilisateur = patientId;
    
    const alertes = await Alerte.find(filter)
      .populate('idUtilisateur', 'prenom nom email photoProfil')
      .populate('acquitteePar', 'prenom nom')
      .sort({ horodatage: -1 })
      .limit(200);
    
    console.log(`⚠️  ${alertes.length} alertes trouvées pour ${req.utilisateur.role}`);
    
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

// Statistiques alertes - FILTRÉES PAR MÉDECIN
router.get('/statistiques', verifierToken, verifierMedecin, async (req, res) => {
  try {
    let filter = {};
    
    // SI MÉDECIN : Filtrer par patients assignés
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      
      if (patientIds.length === 0) {
        return res.json({
          success: true,
          statistiques: {
            total: 0,
            actives: 0,
            acquittees: 0,
            critiques: 0,
            danger: 0,
            avertissement: 0
          }
        });
      }
      
      filter.idUtilisateur = { $in: patientIds };
    }
    
    const stats = {
      total: await Alerte.countDocuments(filter),
      actives: await Alerte.countDocuments({ ...filter, estAcquittee: false }),
      acquittees: await Alerte.countDocuments({ ...filter, estAcquittee: true }),
      critiques: await Alerte.countDocuments({ ...filter, type: 'critique', estAcquittee: false }),
      danger: await Alerte.countDocuments({ ...filter, type: 'danger', estAcquittee: false }),
      avertissement: await Alerte.countDocuments({ ...filter, type: 'avertissement', estAcquittee: false })
    };
    
    console.log(`📊 Stats alertes pour ${req.utilisateur.role}:`, stats);
    
    res.json({
      success: true,
      statistiques: stats
    });
  } catch (error) {
    console.error('Erreur stats alertes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Alertes d'un patient spécifique - VÉRIFIER ASSIGNATION
router.get('/patient/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    // Vérifier que le patient est assigné au médecin (sauf admin)
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      
      if (!patientIds.some(id => id.toString() === req.params.patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Ce patient ne vous est pas assigné'
        });
      }
    }
    
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

// Acquitter une alerte - VÉRIFIER ASSIGNATION
router.put('/:alerteId/acquitter', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const alerte = await Alerte.findById(req.params.alerteId);
    if (!alerte) {
      return res.status(404).json({ success: false, message: 'Alerte non trouvée' });
    }
    
    // Vérifier que le patient est assigné au médecin (sauf admin)
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      
      if (!patientIds.some(id => id.toString() === alerte.idUtilisateur.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas acquitter cette alerte'
        });
      }
    }
    
    alerte.estAcquittee = true;
    alerte.acquitteePar = req.utilisateur.id;
    alerte.dateAcquittement = new Date();
    
    await alerte.save();
    
    const alertePopulee = await Alerte.findById(alerte._id)
      .populate('idUtilisateur', 'prenom nom')
      .populate('acquitteePar', 'prenom nom');
    
    console.log(`✅ Alerte ${alerte._id} acquittée par ${req.utilisateur.prenom}`);
    
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

// Acquitter plusieurs alertes en masse - VÉRIFIER ASSIGNATION
router.put('/acquitter-masse', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { alerteIds } = req.body;
    
    if (!alerteIds || !Array.isArray(alerteIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Liste d\'alertes requise' 
      });
    }
    
    let filter = { _id: { $in: alerteIds } };
    
    // Si médecin, vérifier que toutes les alertes concernent ses patients
    if (req.utilisateur.role === 'medecin') {
      const patientIds = await getPatientsAssignesMedecin(req.utilisateur.id);
      filter.idUtilisateur = { $in: patientIds };
    }
    
    const result = await Alerte.updateMany(
      filter,
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

module.exports = router;