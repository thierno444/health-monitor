const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  // Type d'action
  type: {
    type: String,
    enum: [
      'user_create',
      'user_update',
      'user_delete',
      'user_archive',         
      'user_unarchive',       
      'user_bulk_archive',   
      'user_permanent_delete',  
      'user_rgpd_delete',     
      'device_create',
      'device_assign',
      'device_delete',
      'import_csv',
      'sync_devices',
      'assign_patient',     
      'unassign_patient',   
      'login',
      'logout',
      'other'
    ],
    required: true
  },
  
  // Qui a fait l'action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },
  
  adminEmail: {
    type: String,
    required: true
  },
  
  // Cible de l'action (optionnel)
  targetType: {
    type: String,
    enum: ['user', 'device', 'system', null],
    default: null
  },
  
  targetId: {
    type: String,
    default: null
  },
  
  targetName: {
    type: String,
    default: null
  },
  
  // Description
  action: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Détails supplémentaires
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP de l'admin
  ipAddress: {
    type: String,
    default: null
  },
  
  // Succès ou échec
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
LogSchema.index({ type: 1, createdAt: -1 });
LogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('Log', LogSchema);