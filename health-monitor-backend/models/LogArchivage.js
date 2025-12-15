const mongoose = require('mongoose');

const SchemaLogArchivage = new mongoose.Schema({
  // Qui a fait l'action
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },
  
  // Sur qui/quoi
  cibleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },
  
  // Type d'action
  action: {
    type: String,
    enum: ['archivage', 'desarchivage', 'suppression'],
    required: true
  },
  
  // Raison
  raison: {
    type: String,
    required: false
  },
  
  commentaire: {
    type: String,
    maxlength: 500,
    required: false
  },
  
  // Métadonnées
  metadata: {
    role: String, // Role de la personne archivée
    email: String,
    nom: String,
    prenom: String
  }
  
}, {
  timestamps: true
});

// Index pour recherche rapide
SchemaLogArchivage.index({ utilisateurId: 1, createdAt: -1 });
SchemaLogArchivage.index({ cibleId: 1 });
SchemaLogArchivage.index({ action: 1 });

module.exports = mongoose.model('LogArchivage', SchemaLogArchivage);