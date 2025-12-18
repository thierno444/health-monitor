const mongoose = require('mongoose');

const SchemaQuestionNote = new mongoose.Schema({
  // Note concernée
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
    index: true
  },
  
  // Patient qui pose la question
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // Médecin concerné
  medecinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // Question du patient
  question: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Réponse du médecin
  reponse: {
    type: String,
    maxlength: 1000,
    default: null
  },
  
  // Statut
  statut: {
    type: String,
    enum: ['en_attente', 'repondu'],
    default: 'en_attente',
    index: true
  },
  
  // Date de réponse
  dateReponse: {
    type: Date,
    default: null
  }
  
}, {
  timestamps: true
});

// Index composé
SchemaQuestionNote.index({ noteId: 1, createdAt: -1 });
SchemaQuestionNote.index({ patientId: 1, statut: 1 });
SchemaQuestionNote.index({ medecinId: 1, statut: 1 });

module.exports = mongoose.model('QuestionNote', SchemaQuestionNote);