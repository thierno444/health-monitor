const mongoose = require('mongoose');

// Schéma utilisateur
const SchemaUtilisateur = new mongoose.Schema({
  // Informations personnelles
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true, // Doit être unique dans la base
    lowercase: true, // Convertit en minuscules
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Format email invalide']
  },
  
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas retourner le mot de passe dans les requêtes par défaut
  },
  
  // Informations de santé
  dateDeNaissance: {
    type: Date,
    required: false // Optionnel
  },
  
  genre: {
    type: String,
    enum: ['homme', 'femme', 'autre'], // Valeurs autorisées
    required: false
  },

  // Photo de profil (URL)
  photoProfil: {
    type: String,
    required: false,
    default: 'https://ui-avatars.com/api/?background=random&name=' // Avatar par défaut
  },
  
  // ID du dispositif ESP32 associé à cet utilisateur
  idDispositif: {
    type: String,
    unique: true, // Un dispositif = un utilisateur
    sparse: true, // Permet plusieurs valeurs null
    trim: true
  },
  
  // Paramètres d'alertes personnalisés par l'utilisateur
  parametresAlertes: {
    bpmMin: {
      type: Number,
      default: 60 // Valeur par défaut
    },
    bpmMax: {
      type: Number,
      default: 100
    },
    spo2Min: {
      type: Number,
      default: 95
    },
    notificationsEmail: {
      type: Boolean,
      default: true // Activé par défaut
    },
    alertesSonores: {
      type: Boolean,
      default: true
    }
  },
  
  // Rôle de l'utilisateur dans le système
  role: {
    type: String,
    enum: ['patient', 'medecin', 'admin'], // 3 rôles possibles
    default: 'patient'
  },
  
  // Compte actif ou désactivé
  estActif: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true // Ajoute automatiquement dateCreation et dateModification
});

// Propriété virtuelle : nom complet (ne sera pas sauvegardée en DB)
SchemaUtilisateur.virtual('nomComplet').get(function() {
  return `${this.prenom} ${this.nom}`;
});

// Export du modèle
module.exports = mongoose.model('Utilisateur', SchemaUtilisateur);