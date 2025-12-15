const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const User = require('../models/User');
const Mesure = require('../models/Measurement');

// Middleware : vérifier rôle médecin
const verifierMedecin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès médecin requis' });
  }
  next();
};

// Liste des patients
router.get('/patients', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const includeArchived = req.query.archives === 'true';
    
    const filter = { role: 'patient' };
    if (!includeArchived) {
      filter.estArchive = false;
    }
    
    const patients = await User.find(filter)
      .select('-motDePasse -resetPasswordToken')
      .sort({ createdAt: -1 });
    
    // Enrichir avec dernière mesure et statut
    const patientsEnrichis = await Promise.all(
      patients.map(async (patient) => {
        const derniereMesure = await Mesure.findOne({ idUtilisateur: patient._id })
          .sort({ horodatageMesure: -1 });
        
        const nombreMesures = await Mesure.countDocuments({ idUtilisateur: patient._id });
        
        return {
          id: patient._id,
          prenom: patient.prenom,
          nom: patient.nom,
          email: patient.email,
          dateDeNaissance: patient.dateDeNaissance,
          genre: patient.genre,
          photoProfil: patient.photoProfil,
          idDispositif: patient.idDispositif,
          estArchive: patient.estArchive,
          dateArchivage: patient.dateArchivage,
          raisonArchivage: patient.raisonArchivage,
          commentaireArchivage: patient.commentaireArchivage,
          nombreMesures,
          derniereMesure: derniereMesure ? {
            bpm: derniereMesure.bpm,
            spo2: derniereMesure.spo2,
            statut: derniereMesure.statut,
            horodatageMesure: derniereMesure.horodatageMesure
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      patients: patientsEnrichis,
      total: patientsEnrichis.length
    });
    
  } catch (error) {
    console.error('Erreur récupération patients:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Détails d'un patient
router.get('/patients/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId)
      .select('-motDePasse -resetPasswordToken');
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }
    
    const mesures = await Mesure.find({ idUtilisateur: patient._id })
      .sort({ horodatageMesure: -1 })
      .limit(100);
    
    const stats = {
      total: mesures.length,
      normal: mesures.filter(m => m.statut === 'NORMAL').length,
      attention: mesures.filter(m => m.statut === 'ATTENTION').length,
      danger: mesures.filter(m => m.statut === 'DANGER').length
    };
    
    res.json({
      success: true,
      patient: {
        ...patient.toObject(),
        id: patient._id
      },
      mesures,
      statistiques: stats
    });
    
  } catch (error) {
    console.error('Erreur détails patient:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Statistiques globales médecin
router.get('/statistiques', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const patientsActifs = await User.countDocuments({ role: 'patient', estArchive: false });
    const patientsArchives = await User.countDocuments({ role: 'patient', estArchive: true });
    
    // Patients avec mesures DANGER récentes (dernières 24h)
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const mesuresDanger = await Mesure.find({
      statut: 'DANGER',
      horodatageMesure: { $gte: hier }
    }).distinct('idUtilisateur');
    
    const patientsARisque = mesuresDanger.length;
    
    // Alertes actives
    const alertesActives = await Mesure.countDocuments({
      statut: { $in: ['DANGER', 'ATTENTION'] },
      horodatageMesure: { $gte: hier }
    });
    
    res.json({
      success: true,
      statistiques: {
        totalPatients,
        patientsActifs,
        patientsArchives,
        patientsARisque,
        alertesActives
      }
    });
    
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Recherche patients
router.get('/patients/search', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const query = req.query.q || '';
    const includeArchived = req.query.archives === 'true';
    
    const filter = {
      role: 'patient',
      $or: [
        { prenom: { $regex: query, $options: 'i' } },
        { nom: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (!includeArchived) {
      filter.estArchive = false;
    }
    
    const patients = await User.find(filter)
      .select('-motDePasse')
      .limit(20);
    
    res.json({
      success: true,
      patients
    });
    
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;