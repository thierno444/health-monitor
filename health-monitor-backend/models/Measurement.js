const mongoose = require('mongoose');

// Schéma pour une mesure de santé
const SchemaMesure = new mongoose.Schema({
  // Référence vers l'utilisateur (clé étrangère)
  idUtilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur', // Lien vers le modèle Utilisateur
    required: [true, 'L\'ID utilisateur est obligatoire']
  },
  
  // ID du dispositif ESP32 qui a envoyé les données
  idDispositif: {
    type: String,
    required: [true, 'L\'ID du dispositif est obligatoire'],
    trim: true
  },
  
  // Données biométriques mesurées
  bpm: {
    type: Number,
    required: [true, 'Le BPM (battements par minute) est obligatoire'],
    min: [0, 'Le BPM ne peut pas être négatif'],
    max: [300, 'Le BPM ne peut pas dépasser 300']
  },
  
  spo2: {
    type: Number,
    required: [true, 'Le SpO2 (saturation oxygène) est obligatoire'],
    min: [0, 'Le SpO2 ne peut pas être négatif'],
    max: [100, 'Le SpO2 ne peut pas dépasser 100%']
  },
  
  // Température corporelle (optionnel, pour évolution future)
  temperature: {
    type: Number,
    required: false,
    min: [30, 'Température trop basse'],
    max: [45, 'Température trop élevée']
  },
  
  // Qualité du signal mesuré
  qualite: {
    type: String,
    enum: ['bonne', 'moyenne', 'mauvaise'], // 3 niveaux
    default: 'bonne'
  },
  
  // Niveau de batterie du dispositif ESP32 (en %)
  niveauBatterie: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  
  // Statut de santé calculé automatiquement
  statut: {
    type: String,
    enum: ['NORMAL', 'ATTENTION', 'DANGER', 'LECTURE'],
    required: true
  },
  
  // Date et heure de la mesure (timestamp du dispositif)
  horodatageMesure: {
    type: Date,
    default: Date.now // Utilise l'heure actuelle par défaut
  }
  
}, {
  timestamps: true // Ajoute dateCreation et dateModification
});

// Index pour accélérer les recherches
// Index 1 : Rechercher les mesures d'un utilisateur, triées par date
SchemaMesure.index({ idUtilisateur: 1, createdAt: -1 });

// Index 2 : Rechercher les mesures d'un dispositif, triées par date
SchemaMesure.index({ idDispositif: 1, createdAt: -1 });

// Index 3 : Rechercher par statut (ex: toutes les alertes DANGER)
SchemaMesure.index({ statut: 1 });

// Export du modèle
module.exports = mongoose.model('Mesure', SchemaMesure);