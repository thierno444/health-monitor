const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const QuestionNote = require('../models/QuestionNote');
const Note = require('../models/Note');

// ========== ROUTES PATIENT ==========

// Poser une question sur une note
router.post('/', verifierToken, async (req, res) => {
  try {
    const { noteId, question } = req.body;
    
    if (!noteId || !question || !question.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Note et question requises' 
      });
    }
    
    // Vérifier que la note existe et appartient bien au patient
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note non trouvée' });
    }
    
    if (note.patientId.toString() !== req.utilisateur.id) {
      return res.status(403).json({ success: false, message: 'Cette note ne vous appartient pas' });
    }
    
    // Créer la question
    const questionNote = await QuestionNote.create({
      noteId,
      patientId: req.utilisateur.id,
      medecinId: note.medecinId,
      question: question.trim()
    });
    
    const questionPopulee = await QuestionNote.findById(questionNote._id)
      .populate('patientId', 'prenom nom')
      .populate('medecinId', 'prenom nom')
      .populate('noteId');
    
    console.log('✅ Question créée:', questionNote._id);
    
    res.json({
      success: true,
      message: 'Question envoyée au médecin',
      question: questionPopulee
    });
  } catch (error) {
    console.error('❌ Erreur création question:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Récupérer les questions d'une note (patient)
router.get('/note/:noteId', verifierToken, async (req, res) => {
  try {
    const questions = await QuestionNote.find({ 
      noteId: req.params.noteId,
      patientId: req.utilisateur.id
    })
      .populate('medecinId', 'prenom nom')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération questions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Mes questions (patient)
router.get('/mes-questions', verifierToken, async (req, res) => {
  try {
    const questions = await QuestionNote.find({ patientId: req.utilisateur.id })
      .populate('medecinId', 'prenom nom')
      .populate('noteId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération questions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== ROUTES MÉDECIN ==========

// Middleware médecin
const verifierMedecin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès médecin requis' });
  }
  next();
};

// Questions reçues (médecin)
router.get('/medecin/questions-recues', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const questions = await QuestionNote.find({ medecinId: req.utilisateur.id })
      .populate('patientId', 'prenom nom email photoProfil')
      .populate('noteId')
      .sort({ statut: 1, createdAt: -1 }); // En attente d'abord
    
    res.json({
      success: true,
      questions,
      total: questions.length,
      enAttente: questions.filter(q => q.statut === 'en_attente').length
    });
  } catch (error) {
    console.error('❌ Erreur récupération questions médecin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Répondre à une question (médecin)
router.put('/:questionId/repondre', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { reponse } = req.body;
    
    if (!reponse || !reponse.trim()) {
      return res.status(400).json({ success: false, message: 'Réponse requise' });
    }
    
    const question = await QuestionNote.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question non trouvée' });
    }
    
    if (question.medecinId.toString() !== req.utilisateur.id) {
      return res.status(403).json({ success: false, message: 'Cette question ne vous est pas adressée' });
    }
    
    question.reponse = reponse.trim();
    question.statut = 'repondu';
    question.dateReponse = new Date();
    
    await question.save();
    
    const questionPopulee = await QuestionNote.findById(question._id)
      .populate('patientId', 'prenom nom')
      .populate('noteId');
    
    console.log('✅ Réponse ajoutée à question:', question._id);
    
    res.json({
      success: true,
      message: 'Réponse envoyée',
      question: questionPopulee
    });
  } catch (error) {
    console.error('❌ Erreur réponse question:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;