const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Utilisateur = require('../models/User');
const Assignment = require('../models/Assignment');

// ==================== ROUTES NOTES MÉDICALES ====================

// 📝 POST /api/notes - Créer une nouvelle note
router.post('/', async (req, res) => {
  try {
    console.log('\n📝 Nouvelle note médicale');
    
    const { patientId, medecinId, contenu, type, prive, priorite, tags } = req.body;
    
    // Validation
    if (!patientId || !medecinId || !contenu) {
      return res.status(400).json({
        success: false,
        message: '❌ patientId, medecinId et contenu requis'
      });
    }
    
    // Vérifier que le médecin existe
    const medecin = await Utilisateur.findById(medecinId);
    if (!medecin || (medecin.role !== 'medecin' && medecin.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '❌ Seuls les médecins peuvent créer des notes'
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
    
    // Vérifier que le médecin est assigné au patient
    const assignation = await Assignment.findOne({
      medecinId: medecinId,
      patientId: patientId,
      actif: true
    });
    
    if (!assignation && medecin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '❌ Vous devez être assigné à ce patient pour ajouter une note'
      });
    }
    
    // Créer la note
    const nouvelleNote = new Note({
      patientId: patientId,
      medecinId: medecinId,
      contenu: contenu,
      type: type || 'observation',
      prive: prive || false,
      priorite: priorite || 'normale',
      tags: tags || []
    });
    
    await nouvelleNote.save();
    
    // Peupler les références
    await nouvelleNote.populate('medecinId', 'prenom nom photoProfil');
    await nouvelleNote.populate('patientId', 'prenom nom photoProfil');
    
    console.log(`✅ Note créée par Dr. ${medecin.nomComplet} pour ${patient.nomComplet}`);
    
    res.status(201).json({
      success: true,
      message: '✅ Note médicale créée avec succès',
      data: nouvelleNote
    });
    
  } catch (error) {
    console.error('❌ Erreur création note:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📋 GET /api/notes/patient/:patientId - Récupérer les notes d'un patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { includePrivate } = req.query;
    
    const notes = await Note.findByPatient(patientId, includePrivate === 'true');
    
    console.log(`📋 ${notes.length} note(s) récupérée(s) pour le patient ${patientId}`);
    
    res.json({
      success: true,
      count: notes.length,
      notes: notes
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notes:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📋 GET /api/notes/medecin/:medecinId - Récupérer les notes d'un médecin
router.get('/medecin/:medecinId', async (req, res) => {
  try {
    const { medecinId } = req.params;
    
    const notes = await Note.findByMedecin(medecinId);
    
    console.log(`📋 ${notes.length} note(s) récupérée(s) du médecin ${medecinId}`);
    
    res.json({
      success: true,
      count: notes.length,
      notes: notes
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notes:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// ✏️ PUT /api/notes/:id - Modifier une note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { contenu, type, priorite, tags, prive } = req.body;
    
    const note = await Note.findById(id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: '❌ Note non trouvée'
      });
    }
    
    // Mise à jour
    if (contenu) note.contenu = contenu;
    if (type) note.type = type;
    if (priorite) note.priorite = priorite;
    if (tags) note.tags = tags;
    if (typeof prive !== 'undefined') note.prive = prive;
    
    await note.save();
    
    console.log(`✏️ Note ${id} modifiée`);
    
    res.json({
      success: true,
      message: '✅ Note mise à jour',
      data: note
    });
    
  } catch (error) {
    console.error('❌ Erreur modification note:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/notes/:id - Archiver une note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findById(id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: '❌ Note non trouvée'
      });
    }
    
    await note.archiver();
    
    console.log(`🗑️ Note ${id} archivée`);
    
    res.json({
      success: true,
      message: '✅ Note archivée'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression note:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;