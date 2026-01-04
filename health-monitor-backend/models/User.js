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
  telephone: {  
    type: String,
    required: [false, 'Le téléphone est requis'],
    trim: true,
    default: null,
    validate: {
      validator: function(v) {
        // Si vide, accepter
        if (!v) return true;
        // Sinon, valider le format
        return /^(\+?221|0)?[0-9]{9}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Numéro de téléphone invalide (format: +221XXXXXXXXX ou 0XXXXXXXXX)'
    }
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

  resetPasswordToken: {
    type: String,
    default: undefined
  },
  
  resetPasswordExpire: {
    type: Date,
    default: undefined
  },
  
  estActif: {
    type: Boolean,
    default: true
  },
  
  // ID du dispositif ESP32 associé à cet utilisateur
  idDispositif: {
    type: String,
    unique: true, // Un dispositif = un utilisateur
    sparse: true, // Permet plusieurs valeurs null
    required: false,
    index: true
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
  },

  // Réinitialisation mot de passe
  resetPasswordToken: {
    type: String,
    required: false
  },
  
  resetPasswordExpire: {
    type: Date,
    required: false
  },

  // Système d'archivage (pour patients et utilisateurs)
  // Système d'archivage AMÉLIORÉ
  estArchive: {
    type: Boolean,
    default: false,
    index: true
  },
  
  dateArchivage: {
    type: Date,
    default: null
  },
  
  archivage: {
    raison: {
      type: String,
      enum: [
        'gueri',
        'transfere',
        'decede',
        'traitement_termine',
        'inactif',
        'demission',
        'test',
        'rgpd',
        'autre'
      ]
    },
    commentaire: {
      type: String,
      maxlength: 500
    },
    dateArchivage: Date,
    archivePar: String, // Email de l'admin
    dateDesarchivage: Date,
    desarchivePar: String,
    raisonDesarchivage: String
  },
  
  // Pour suppression RGPD (6 mois après archivage)
  suppressionPrevue: {
    type: Date,
    required: false
  },
  
  archivePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false
  },
  
  
  // Snapshot des données avant archivage (pour admin)
  dataArchivee: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

// Propriété virtuelle : nom complet (ne sera pas sauvegardée en DB)
SchemaUtilisateur.virtual('nomComplet').get(function() {
  return `${this.prenom} ${this.nom}`;
});

// Export du modèle
module.exports = mongoose.model('Utilisateur', SchemaUtilisateur);