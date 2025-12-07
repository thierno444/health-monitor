// ==================== IMPORTS ====================
const express = require('express');
const cors = require('cors');
const http = require('http');        
const { Server } = require('socket.io'); 
require('dotenv').config();
const connectDB = require('./config/database');

// Modèles (après dotenv et connectDB)
const Utilisateur = require('./models/User');
const Mesure = require('./models/Measurement');
const Alerte = require('./models/Alert');

// ==================== INITIALISATION ====================
const app = express();
const PORT = process.env.PORT || 5000;

// Créer le serveur HTTP (nécessaire pour Socket.IO)
const serveurHttp = http.createServer(app);

// Initialiser Socket.IO
const io = new Server(serveurHttp, {
  cors: {
    origin: "*", // Accepter toutes les origines (à sécuriser en production)
    methods: ["GET", "POST"]
  }
});

// Rendre 'io' accessible dans toutes les routes
app.set('io', io);

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== IMPORT DES ROUTES ====================
const routeMesures = require('./routes/measurements');
const routeAuth = require('./routes/auth');


// ==================== UTILISATION DES ROUTES ====================
app.use('/api/measurements', routeMesures);
app.use('/api/auth', routeAuth);


// ==================== ROUTES DE TEST ====================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Health Monitor API v1.0',
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  console.log('📥 Données reçues:', req.body);
  res.json({
    success: true,
    message: 'Données reçues avec succès',
    received: req.body
  });
});

// Route de test des modèles MongoDB
app.get('/api/test/modeles', async (req, res) => {
  try {
    console.log('🧪 Test des modèles MongoDB...');
    
    // Compter les documents dans chaque collection
    const nombreUtilisateurs = await Utilisateur.countDocuments();
    const nombreMesures = await Mesure.countDocuments();
    const nombreAlertes = await Alerte.countDocuments();
    
    console.log('✅ Modèles testés avec succès !');
    
    res.json({
      success: true,
      message: '✅ Tous les modèles MongoDB fonctionnent !',
      collections: {
        utilisateurs: {
          nombre: nombreUtilisateurs,
          modele: 'Utilisateur',
          statut: '✅ OK'
        },
        mesures: {
          nombre: nombreMesures,
          modele: 'Mesure',
          statut: '✅ OK'
        },
        alertes: {  
          nombre: nombreAlertes,
          modele: 'Alerte',
          statut: '✅ OK'
        }
      },
      database: 'healthmonitor',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur test modèles:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur lors du test des modèles',
      error: error.message
    });
  }
});

// ==================== GESTION SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log(`⚡ Nouveau client connecté: ${socket.id}`);
  
  // Envoyer un message de bienvenue
  socket.emit('bienvenue', {
    message: '👋 Connecté au serveur Health Monitor !',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Quand un client se déconnecte
  socket.on('disconnect', () => {
    console.log(`❌ Client déconnecté: ${socket.id}`);
  });
  
  // Écouter les demandes d'abonnement à un utilisateur
  socket.on('abonner-utilisateur', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`📻 Client ${socket.id} abonné aux mesures de l'utilisateur ${userId}`);
    
    socket.emit('abonnement-confirme', {
      message: `✅ Abonné aux mises à jour de l'utilisateur ${userId}`,
      userId: userId
    });
  });
});

// ==================== CONNEXION DB + DÉMARRAGE ====================
// Fonction asynchrone pour démarrer le serveur
const demarrerServeur = async () => {
  try {
    // 1. Connecter à MongoDB d'abord
    await connectDB();
    
    // 2. Démarrer le serveur Express ensuite
    serveurHttp.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   🏥 HEALTH MONITOR API SERVER       ║');
      console.log('╚════════════════════════════════════════╝');
      console.log(`\n✅ Serveur HTTP démarré sur le port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}\n`);
      console.log(`⚡ Socket.IO activé et prêt !\n`);
      console.log('📡 En attente de requêtes...\n');
    });
    
  } catch (error) {
    console.error('❌ Impossible de démarrer le serveur:', error.message);
    process.exit(1);
  }
};

// Lancer le serveur
demarrerServeur();