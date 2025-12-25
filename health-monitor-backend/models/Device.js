const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  idDispositif: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^ESP32_[A-Z0-9_]+$/i  // ← PERMET LES UNDERSCORES
  },
  
  nom: {
    type: String,
    default: function() {
      return this.idDispositif;
    }
  },
  
  // Patient assigné (référence)
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    default: null
  },
  
  // Statut
  statut: {
    type: String,
    enum: ['disponible', 'assigne', 'inactif'],
    default: 'disponible'
  },
  
  // Dernière connexion
  derniereConnexion: {
    type: Date,
    default: null
  },
  
  // Version firmware
  versionFirmware: {
    type: String,
    default: '1.0.0'
  },
  
  // Notes
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', DeviceSchema);