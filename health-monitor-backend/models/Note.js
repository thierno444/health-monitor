const mongoose = require('mongoose');

// ==================== SCHÉMA NOTE MÉDICALE ====================
const noteSchema = new mongoose.Schema({
  // ID du patient concerné
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // ID du médecin qui écrit la note
  medecinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  // Contenu de la note
  contenu: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 5000
  },
  
  // Type de note
  type: {
    type: String,
    enum: ['observation', 'diagnostic', 'prescription', 'conseil', 'suivi', 'autre'],
    default: 'observation'
  },
  
  // Visibilité de la note
  visible: {
    type: Boolean,
    default: true // Si false, note archivée/supprimée
  },
  
  // Note privée (visible uniquement au médecin)
  prive: {
    type: Boolean,
    default: false
  },

  // Note lue par le patient
  lue: {
    type: Boolean,
    default: false
  },
  
  // Priorité
  priorite: {
    type: String,
    enum: ['basse', 'normale', 'haute', 'urgente'],
    default: 'normale'
  },
  
  // Tags/mots-clés
  tags: {
    type: [String],
    default: []
  },
  
  // Pièces jointes (URLs)
  pieceJointes: {
    type: [String],
    default: []
  }
}, {
  timestamps: true // createdAt, updatedAt automatiques
});

// Index composés pour recherches rapides
noteSchema.index({ patientId: 1, createdAt: -1 });
noteSchema.index({ medecinId: 1, createdAt: -1 });
noteSchema.index({ patientId: 1, medecinId: 1 });

// ==================== MÉTHODES ====================

// Méthode pour archiver une note
noteSchema.methods.archiver = function() {
  this.visible = false;
  return this.save();
};

// Méthode statique : Récupérer toutes les notes d'un patient
noteSchema.statics.findByPatient = function(patientId, includePrivate = false) {
  const query = { 
    patientId: patientId,
    visible: true
  };
  
  if (!includePrivate) {
    query.prive = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('medecinId', 'prenom nom photoProfil');
};

// Méthode statique : Récupérer toutes les notes d'un médecin
noteSchema.statics.findByMedecin = function(medecinId) {
  return this.find({ 
    medecinId: medecinId,
    visible: true
  })
    .sort({ createdAt: -1 })
    .populate('patientId', 'prenom nom photoProfil');
};

// Virtual : Résumé court de la note
noteSchema.virtual('resume').get(function() {
  if (this.contenu.length <= 100) {
    return this.contenu;
  }
  return this.contenu.substring(0, 100) + '...';
});

// Inclure les virtuals dans JSON
noteSchema.set('toJSON', { virtuals: true });
noteSchema.set('toObject', { virtuals: true });

// ==================== EXPORT ====================
module.exports = mongoose.model('Note', noteSchema);