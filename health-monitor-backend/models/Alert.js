const mongoose = require('mongoose');

// Schéma pour une alerte
const SchemaAlerte = new mongoose.Schema({
  // Référence vers l'utilisateur concerné
  idUtilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur', // Lien vers le modèle Utilisateur
    required: [true, 'L\'ID utilisateur est obligatoire']
  },
  
  // Référence vers la mesure qui a déclenché l'alerte
  idMesure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mesure', // Lien vers le modèle Mesure
    required: false // Optionnel
  },
  
  // Type/Gravité de l'alerte
  type: {
    type: String,
    enum: ['avertissement', 'danger', 'critique'],
    required: [true, 'Le type d\'alerte est obligatoire']
  },
  
  // Paramètre qui a déclenché l'alerte
  parametre: {
    type: String,
    enum: ['bpm', 'spo2', 'temperature', 'batterie', 'dispositif'],
    required: [true, 'Le paramètre est obligatoire']
  },
  
  // Valeur mesurée qui a déclenché l'alerte
  valeur: {
    type: Number,
    required: [true, 'La valeur est obligatoire']
  },
  
  // Seuil qui a été dépassé
  seuil: {
    type: Number,
    required: [true, 'Le seuil est obligatoire']
  },
  
  // Message descriptif de l'alerte
  message: {
    type: String,
    required: [true, 'Le message est obligatoire'],
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères']
  },
  
  // Alerte vue/traitée par un utilisateur ou non
  estAcquittee: {
    type: Boolean,
    default: false // Non acquittée par défaut
  },
  
  // Date à laquelle l'alerte a été acquittée
  dateAcquittement: {
    type: Date,
    required: false
  },
  
  // ID de la personne qui a acquitté l'alerte (médecin/admin)
  acquitteePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false
  },
  
  // Date et heure de l'alerte
  horodatage: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true // Ajoute dateCreation et dateModification
});

// Index pour recherches rapides
// Index 1 : Alertes non acquittées d'un utilisateur, triées par date
SchemaAlerte.index({ idUtilisateur: 1, estAcquittee: 1, createdAt: -1 });

// Index 2 : Alertes par type et statut d'acquittement
SchemaAlerte.index({ type: 1, estAcquittee: 1 });

// Export du modèle
module.exports = mongoose.model('Alerte', SchemaAlerte);