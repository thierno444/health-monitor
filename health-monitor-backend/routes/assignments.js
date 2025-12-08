const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Utilisateur = require('../models/User');

// ==================== ROUTES ASSIGNATIONS ====================

// 👨‍⚕️ POST /api/assignments - Assigner un patient à un médecin
router.post('/', async (req, res) => {
  try {
    console.log('\n👨‍⚕️ Nouvelle assignation médecin-patient');
    
    const { medecinId, patientId, priorite, notesAssignation } = req.body;
    
    // Validation
    if (!medecinId || !patientId) {
      return res.status(400).json({
        success: false,
        message: '❌ medecinId et patientId requis'
      });
    }
    
    // Vérifier que le médecin existe et a le bon rôle
    const medecin = await Utilisateur.findById(medecinId);
    if (!medecin) {
      return res.status(404).json({
        success: false,
        message: '❌ Médecin non trouvé'
      });
    }
    
    if (medecin.role !== 'medecin' && medecin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '❌ Cet utilisateur n\'est pas médecin'
      });
    }
    
    // Vérifier que le patient existe
    const patient = await Utilisateur.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: '❌ Patient non trouvé'
      });
    }
    
    // Vérifier qu'il n'y a pas déjà une assignation active
    const assignationExistante = await Assignment.findOne({
      medecinId: medecinId,
      patientId: patientId,
      actif: true
    });
    
    if (assignationExistante) {
      return res.status(400).json({
        success: false,
        message: '❌ Ce patient est déjà assigné à ce médecin',
        assignation: assignationExistante
      });
    }
    
    // Créer l'assignation
    const nouvelleAssignation = new Assignment({
      medecinId: medecinId,
      patientId: patientId,
      priorite: priorite || 'moyenne',
      notesAssignation: notesAssignation || ''
    });
    
    await nouvelleAssignation.save();
    
    console.log(`✅ Patient ${patient.nomComplet} assigné au Dr. ${medecin.nomComplet}`);
    
    res.status(201).json({
      success: true,
      message: '✅ Assignation créée avec succès',
      data: {
        id: nouvelleAssignation._id,
        medecin: medecin.nomComplet,
        patient: patient.nomComplet,
        priorite: nouvelleAssignation.priorite,
        dateAssignation: nouvelleAssignation.dateAssignation
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur assignation:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📋 GET /api/assignments/medecin/:medecinId - Lister les patients d'un médecin
router.get('/medecin/:medecinId', async (req, res) => {
  try {
    const { medecinId } = req.params;
    
    const assignations = await Assignment.findPatientsForMedecin(medecinId);
    
    console.log(`📋 ${assignations.length} patient(s) trouvé(s) pour le médecin ${medecinId}`);
    
    res.json({
      success: true,
      count: assignations.length,
      patients: assignations.map(a => ({
        assignationId: a._id,
        patient: a.patientId,
        priorite: a.priorite,
        dateAssignation: a.dateAssignation,
        notes: a.notesAssignation
      }))
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération patients:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📋 GET /api/assignments/patient/:patientId - Lister les médecins d'un patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const assignations = await Assignment.findMedecinsForPatient(patientId);
    
    console.log(`📋 ${assignations.length} médecin(s) trouvé(s) pour le patient ${patientId}`);
    
    res.json({
      success: true,
      count: assignations.length,
      medecins: assignations.map(a => ({
        assignationId: a._id,
        medecin: a.medecinId,
        priorite: a.priorite,
        dateAssignation: a.dateAssignation
      }))
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération médecins:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// ✏️ PUT /api/assignments/:id - Modifier une assignation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { priorite, notesAssignation } = req.body;
    
    const assignation = await Assignment.findById(id);
    
    if (!assignation) {
      return res.status(404).json({
        success: false,
        message: '❌ Assignation non trouvée'
      });
    }
    
    if (priorite) assignation.priorite = priorite;
    if (notesAssignation) assignation.notesAssignation = notesAssignation;
    
    await assignation.save();
    
    console.log(`✏️ Assignation ${id} modifiée`);
    
    res.json({
      success: true,
      message: '✅ Assignation mise à jour',
      data: assignation
    });
    
  } catch (error) {
    console.error('❌ Erreur modification:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// ❌ DELETE /api/assignments/:id - Terminer une assignation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;
    
    const assignation = await Assignment.findById(id);
    
    if (!assignation) {
      return res.status(404).json({
        success: false,
        message: '❌ Assignation non trouvée'
      });
    }
    
    await assignation.terminer(raison);
    
    console.log(`❌ Assignation ${id} terminée`);
    
    res.json({
      success: true,
      message: '✅ Assignation terminée',
      data: assignation
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;