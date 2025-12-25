const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Utilisateur = require('../models/User');
const Notification = require('../models/Notification');
const verifierToken = require('../middleware/auth');



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
    
    // AJOUTER LES NOTIFICATIONS ICI ↓    
    try {
      // Notification pour le médecin
      await Notification.create({
        utilisateurId: medecinId,
        titre: '👨‍⚕️ Nouveau patient assigné',
        message: `Le patient ${patient.prenom} ${patient.nom} vous a été assigné`,
        type: 'assignation',
        lien: null, // ← CHANGER EN null (ou supprimer la ligne)
        donnees: {
          patientId: patientId,
          patientNom: `${patient.prenom} ${patient.nom}`,
          priorite: nouvelleAssignation.priorite,
          assignationId: nouvelleAssignation._id
        }
      });
      
      // Notification pour le patient
      await Notification.create({
        utilisateurId: patientId,
        titre: '🩺 Médecin assigné',
        message: `Le Dr. ${medecin.prenom} ${medecin.nom} est maintenant votre médecin référent`,
        type: 'assignation',
        lien: null, // ← CHANGER EN null (ou supprimer la ligne)
        donnees: {  
          medecinId: medecinId,
          medecinNom: `Dr. ${medecin.prenom} ${medecin.nom}`,
          priorite: nouvelleAssignation.priorite,
          assignationId: nouvelleAssignation._id
        }
      });
      
      console.log('✅ Notifications envoyées au médecin et au patient');
    } catch (notifError) {
      console.error('⚠️ Erreur notifications:', notifError.message);
    }


    const { createLog } = require('../utils/logger');
    try {
      await createLog({
        type: 'assign_patient',
        adminId: req.body.adminId || medecin._id, // Si pas d'admin ID, utiliser le médecin
        adminEmail: req.body.adminEmail || medecin.email,
        action: `Assignation: Patient ${patient.prenom} ${patient.nom} assigné au Dr. ${medecin.prenom} ${medecin.nom}`,
        targetType: 'user',
        targetId: patient._id.toString(),
        targetName: `${patient.prenom} ${patient.nom}`,
        details: {
          medecinId: medecin._id,
          medecinNom: `${medecin.prenom} ${medecin.nom}`,
          patientId: patient._id,
          patientNom: `${patient.prenom} ${patient.nom}`,
          priorite: nouvelleAssignation.priorite
        }
      });
    } catch (logError) {
      console.error('⚠️ Erreur log:', logError.message);
    }
    
    console.log(`✅ Patient ${patient.prenom} ${patient.nom} assigné au Dr. ${medecin.prenom} ${medecin.nom}`);
    
    res.status(201).json({
      success: true,
      message: '✅ Assignation créée avec succès',
      data: {
        id: nouvelleAssignation._id,
        medecin: `${medecin.prenom} ${medecin.nom}`,
        patient: `${patient.prenom} ${patient.nom}`,
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

// GET /api/assignments/patient/:patientId - Récupérer les assignations d'un patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    console.log('\n📋 Récupération assignations patient:', patientId);
    
    // Récupérer les assignations ACTIVES
    const assignmentsActives = await Assignment.find({
      patientId: patientId,
      actif: true
    })
    .populate('medecinId', 'prenom nom email photoProfil')
    .populate('patientId', 'prenom nom email photoProfil');
    
    console.log(`✅ ${assignmentsActives.length} assignation(s) ACTIVE(s) trouvée(s)`);
    
    // Afficher les détails
    if (assignmentsActives.length > 0) {
      assignmentsActives.forEach((a, index) => {
        console.log(`  ${index + 1}. Médecin: Dr. ${a.medecinId?.prenom || 'N/A'} ${a.medecinId?.nom || 'N/A'} | Actif: ${a.actif}`);
      });
    }
    
    res.json({
      success: true,
      assignments: assignmentsActives,
      total: assignmentsActives.length
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération assignations:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// DELETE /api/assignments/patient/:patientId - Désassigner un patient (désactive toutes ses assignations actives)
router.delete('/patient/:patientId', verifierToken, async (req, res) => {
  try {
    console.log('\n🔓 Désassignation patient:', req.params.patientId);
    
    // Récupérer les assignations actives
    const assignments = await Assignment.find({
      patientId: req.params.patientId,
      actif: true
    }).populate('medecinId', 'prenom nom').populate('patientId', 'prenom nom');
    
    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '❌ Aucune assignation active trouvée'
      });
    }
    
    // Désactiver toutes les assignations
    const result = await Assignment.updateMany(
      { patientId: req.params.patientId, actif: true },
      { $set: { actif: false, dateDesassignation: new Date() } }
    );
    
    // Envoyer notifications
    const Notification = require('../models/Notification');
    
    for (const assignment of assignments) {
      try {
        // Notification pour le médecin
        await Notification.create({
          utilisateurId: assignment.medecinId._id,
          titre: '🔓 Patient désassigné',
          message: `Le patient ${assignment.patientId.prenom} ${assignment.patientId.nom} n'est plus sous votre suivi`,
          type: 'assignation',
          donnees: {
            patientId: assignment.patientId._id,
            patientNom: `${assignment.patientId.prenom} ${assignment.patientId.nom}`,
            assignationId: assignment._id
          }
        });
        
        // Notification pour le patient
        await Notification.create({
          utilisateurId: assignment.patientId._id,
          titre: '🔓 Fin de suivi médical',
          message: `Votre suivi avec le Dr. ${assignment.medecinId.prenom} ${assignment.medecinId.nom} est terminé`,
          type: 'assignation',
          donnees: {
            medecinId: assignment.medecinId._id,
            medecinNom: `Dr. ${assignment.medecinId.prenom} ${assignment.medecinId.nom}`,
            assignationId: assignment._id
          }
        });
      } catch (notifError) {
        console.error('⚠️ Erreur notifications:', notifError.message);
      }
    }
    
    console.log(`✅ ${result.modifiedCount} assignation(s) désactivée(s)`);

    // AJOUTER LE LOG ICI ↓
    const { createLog } = require('../utils/logger');

    // Récupérer l'admin depuis le token (si disponible)
    let adminId, adminEmail;
    if (req.utilisateur) {
      adminId = req.utilisateur.id;
      adminEmail = req.utilisateur.email;
    } else {
      adminId = assignments[0].medecinId._id;
      adminEmail = assignments[0].medecinId.email;
    }

    try {
      await createLog({
        type: 'unassign_patient',
        adminId: req.body.adminId || assignments[0].medecinId._id,
        adminEmail: req.body.adminEmail || assignments[0].medecinId.email,
        action: `Désassignation: Patient ${assignments[0].patientId.prenom} ${assignments[0].patientId.nom} désassigné`,
        targetType: 'user',
        targetId: assignments[0].patientId._id.toString(),
        targetName: `${assignments[0].patientId.prenom} ${assignments[0].patientId.nom}`,
        details: {
          count: result.modifiedCount,
          medecins: assignments.map(a => `${a.medecinId.prenom} ${a.medecinId.nom}`)
        }
      });
    } catch (logError) {
      console.error('⚠️ Erreur log:', logError.message);
    }
    
    res.json({
      success: true,
      message: `✅ Patient désassigné avec succès`,
      count: result.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Erreur désassignation:', error.message);
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



// DELETE /api/assignments/:assignmentId - Désassigner une assignation spécifique
router.delete('/:id', verifierToken, async (req, res) => {
  try {
    console.log('\n🔓 Désassignation assignation:', req.params.id);  // ✅
    
    const assignment = await Assignment.findById(req.params.id)  // ✅
      .populate('medecinId', 'prenom nom')
      .populate('patientId', 'prenom nom');
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '❌ Assignation non trouvée'
      });
    }
    
    if (!assignment.actif) {
      return res.status(400).json({
        success: false,
        message: '❌ Cette assignation est déjà désactivée'
      });
    }
    
    assignment.actif = false;
    assignment.dateDesassignation = new Date();
    await assignment.save();
    
    // Envoyer notifications
    const Notification = require('../models/Notification');
    
    try {
      // Notification pour le médecin
      await Notification.create({
        utilisateurId: assignment.medecinId._id,
        titre: '🔓 Patient désassigné',
        message: `Le patient ${assignment.patientId.prenom} ${assignment.patientId.nom} n'est plus sous votre suivi`,
        type: 'assignation',
        donnees: {
          patientId: assignment.patientId._id,
          patientNom: `${assignment.patientId.prenom} ${assignment.patientId.nom}`,
          assignationId: assignment._id
        }
      });
      
      // Notification pour le patient
      await Notification.create({
        utilisateurId: assignment.patientId._id,
        titre: '🔓 Fin de suivi médical',
        message: `Votre suivi avec le Dr. ${assignment.medecinId.prenom} ${assignment.medecinId.nom} est terminé`,
        type: 'assignation',
        donnees: {
          medecinId: assignment.medecinId._id,
          medecinNom: `Dr. ${assignment.medecinId.prenom} ${assignment.medecinId.nom}`,
          assignationId: assignment._id
        }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notifications:', notifError.message);
    }
    
    // Logger l'action
    const { createLog } = require('../utils/logger');
    
    let adminId, adminEmail;
    if (req.utilisateur) {
      adminId = req.utilisateur.id;
      adminEmail = req.utilisateur.email;
    } else {
      adminId = assignment.medecinId._id;
      adminEmail = assignment.medecinId.email;
    }
    
    try {
      await createLog({
        type: 'unassign_patient',
        adminId: adminId,
        adminEmail: adminEmail,
        action: `Désassignation: Patient ${assignment.patientId.prenom} ${assignment.patientId.nom} désassigné du Dr. ${assignment.medecinId.prenom} ${assignment.medecinId.nom}`,
        targetType: 'user',
        targetId: assignment.patientId._id.toString(),
        targetName: `${assignment.patientId.prenom} ${assignment.patientId.nom}`,
        details: {
          medecinId: assignment.medecinId._id,
          medecinNom: `${assignment.medecinId.prenom} ${assignment.medecinId.nom}`,
          assignationId: assignment._id
        }
      });
    } catch (logError) {
      console.error('⚠️ Erreur log:', logError.message);
    }
    
    console.log('✅ Assignation désactivée');
    
    res.json({
      success: true,
      message: '✅ Assignation désactivée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur désassignation:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;