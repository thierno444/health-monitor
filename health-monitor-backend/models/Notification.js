const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  
  titre: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  type: {
    type: String,
    enum: ['alerte', 'info', 'assignation', 'mesure', 'systeme'],
    default: 'info'
  },
  
  lue: {
    type: Boolean,
    default: false
  },
  
  lien: {
    type: String,
    default: null
  },
  
  donnees: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
NotificationSchema.index({ utilisateurId: 1, lue: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);