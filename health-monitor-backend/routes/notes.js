const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const Note = require('../models/Note');
const User = require('../models/User');

// Middleware médecin
const verifierMedecin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès médecin requis' });
  }
  next();
};

// Liste notes d'un patient
router.get('/patient/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const notes = await Note.findByPatient(req.params.patientId, true)
      .populate('medecinId', 'prenom nom photoProfil');
    
    console.log(`📝 ${notes.length} notes pour patient ${req.params.patientId}`);
    
    res.json({
      success: true,
      notes,
      total: notes.length
    });
  } catch (error) {
    console.error('Erreur récupération notes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Toutes les notes du médecin
router.get('/medecin', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const notes = await Note.findByMedecin(req.utilisateur.id);
    
    res.json({
      success: true,
      notes,
      total: notes.length
    });
  } catch (error) {
    console.error('Erreur récupération notes médecin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Créer une note
router.post('/', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { patientId, contenu, type, priorite, prive, tags } = req.body;
    
    if (!patientId || !contenu) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient et contenu requis' 
      });
    }
    
    const note = await Note.create({
      patientId,
      medecinId: req.utilisateur.id,
      contenu,
      type: type || 'observation',
      priorite: priorite || 'normale',
      prive: prive || false,
      tags: tags || [],
      visible: true
    });
    
    const notePopulee = await Note.findById(note._id)
      .populate('medecinId', 'prenom nom photoProfil')
      .populate('patientId', 'prenom nom');
    
    console.log(`✅ Note créée pour patient ${patientId} par Dr. ${req.utilisateur.id}`);
    
    res.json({
      success: true,
      message: 'Note créée',
      note: notePopulee
    });
  } catch (error) {
    console.error('Erreur création note:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Modifier une note
router.put('/:noteId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { contenu, type, priorite, prive, tags } = req.body;
    
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note non trouvée' });
    }
    
    // Vérifier que c'est le médecin auteur
    if (note.medecinId.toString() !== req.utilisateur.id && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Vous ne pouvez modifier que vos propres notes' 
      });
    }
    
    if (contenu) note.contenu = contenu;
    if (type) note.type = type;
    if (priorite) note.priorite = priorite;
    if (prive !== undefined) note.prive = prive;
    if (tags) note.tags = tags;
    
    await note.save();
    
    const notePopulee = await Note.findById(note._id)
      .populate('medecinId', 'prenom nom photoProfil');
    
    res.json({
      success: true,
      message: 'Note modifiée',
      note: notePopulee
    });
  } catch (error) {
    console.error('Erreur modification note:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Supprimer/Archiver une note
router.delete('/:noteId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note non trouvée' });
    }
    
    // Vérifier que c'est le médecin auteur
    if (note.medecinId.toString() !== req.utilisateur.id && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Vous ne pouvez supprimer que vos propres notes' 
      });
    }
    
    // Archiver au lieu de supprimer
    await note.archiver();
    
    res.json({
      success: true,
      message: 'Note archivée'
    });
  } catch (error) {
    console.error('Erreur suppression note:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;