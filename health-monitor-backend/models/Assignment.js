const mongoose = require('mongoose');

// ==================== SCHÉMA ASSIGNATION ====================
const assignmentSchema = new mongoose.Schema({
  // ID du médecin
  medecinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // ID du patient
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // Date d'assignation
  dateAssignation: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Statut de l'assignation
  actif: {
    type: Boolean,
    default: true
  },
  
  // Notes du médecin lors de l'assignation
  notesAssignation: {
    type: String,
    required: false
  },
  
  // Date de fin (si l'assignation est terminée)
  dateFin: {
    type: Date,
    required: false
  },
  
  // Priorité du suivi (basse, moyenne, haute)
  // Priorité du suivi (basse, moyenne, haute, urgente)
  priorite: {
    type: String,
    enum: ['basse', 'moyenne', 'haute', 'urgente'],
    default: 'moyenne'
  }
}, {
  timestamps: true // createdAt, updatedAt automatiques
});

// Index composé pour recherches rapides
assignmentSchema.index({ medecinId: 1, patientId: 1 });
assignmentSchema.index({ actif: 1 });

// ==================== MÉTHODES ====================

// Méthode pour terminer une assignation
assignmentSchema.methods.terminer = function(raison) {
  this.actif = false;
  this.dateFin = new Date();
  if (raison) {
    this.notesAssignation += `\n[FIN] ${raison}`;
  }
  return this.save();
};

// Méthode statique : Trouver les patients d'un médecin
assignmentSchema.statics.findPatientsForMedecin = function(medecinId) {
  return this.find({ medecinId: medecinId, actif: true })
    .populate('patientId', 'prenom nom email photoProfil idDispositif');
};

// Méthode statique : Trouver les médecins d'un patient
assignmentSchema.statics.findMedecinsForPatient = function(patientId) {
  return this.find({ patientId: patientId, actif: true })
    .populate('medecinId', 'prenom nom email photoProfil');
};

// ==================== EXPORT ====================
module.exports = mongoose.model('Assignment', assignmentSchema);