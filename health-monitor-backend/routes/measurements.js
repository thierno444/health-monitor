const express = require('express');
const router = express.Router();
const Mesure = require('../models/Measurement');
const Utilisateur = require('../models/User');

// ==================== ROUTES MESURES ====================

// 📥 POST /api/measurements - Recevoir une nouvelle mesure de l'ESP32
router.post('/', async (req, res) => {
  try {
    console.log('\n📥 Nouvelle mesure reçue de l\'ESP32');
    console.log('Données:', req.body);
    
    const { deviceId, bpm, spo2, status, battery, temperature } = req.body;
    
    // Validation des données obligatoires
    if (!deviceId || !bpm || !spo2 || !status) {
      return res.status(400).json({
        success: false,
        message: '❌ Données manquantes (deviceId, bpm, spo2, status requis)'
      });
    }
    
    // Trouver l'utilisateur associé à ce dispositif
    const utilisateur = await Utilisateur.findOne({ idDispositif: deviceId });
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: `❌ Aucun utilisateur trouvé pour le dispositif ${deviceId}`,
        note: 'Créez d\'abord un utilisateur et associez-le à ce deviceId'
      });
    }
    
    // Créer la nouvelle mesure
    const nouvelleMesure = new Mesure({
      idUtilisateur: utilisateur._id,
      idDispositif: deviceId,
      bpm: bpm,
      spo2: spo2,
      statut: status,
      niveauBatterie: battery || null,
      temperature: temperature || null,
      qualite: 'bonne', // Par défaut
      horodatageMesure: new Date()
    });
    
    // Sauvegarder en base de données
    await nouvelleMesure.save();
    
    // ⚡ ÉMETTRE UN ÉVÉNEMENT SOCKET.IO
    const io = req.app.get('io');
    
    // Envoyer à tous les clients abonnés à cet utilisateur
    io.to(`user-${utilisateur._id}`).emit('nouvelle-mesure', {
      id: nouvelleMesure._id,
      utilisateur: {
        id: utilisateur._id,
        nom: `${utilisateur.prenom} ${utilisateur.nom}`,
        photoProfil: utilisateur.photoProfil
      },
      bpm: bpm,
      spo2: spo2,
      statut: status,
      niveauBatterie: battery,
      horodatage: nouvelleMesure.horodatageMesure
    });
    
    console.log(`⚡ Événement Socket.IO émis pour l'utilisateur ${utilisateur._id}`);
    
    
    console.log('✅ Mesure sauvegardée en DB');
    console.log(`   User: ${utilisateur.prenom} ${utilisateur.nom}`);
    console.log(`   BPM: ${bpm} | SpO2: ${spo2}% | Statut: ${status}\n`);
    
    res.status(201).json({
      success: true,
      message: '✅ Mesure enregistrée avec succès',
      data: {
        id: nouvelleMesure._id,
        utilisateur: `${utilisateur.prenom} ${utilisateur.nom}`,
        bpm: bpm,
        spo2: spo2,
        statut: status,
        horodatage: nouvelleMesure.horodatageMesure
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement de la mesure:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📊 GET /api/measurements - Récupérer les mesures d'un utilisateur
router.get('/', async (req, res) => {
  try {
    const { userId, deviceId, limit = 50, status } = req.query;
    
    // Construire le filtre de recherche
    let filtre = {};
    
    if (userId) {
      filtre.idUtilisateur = userId;
    }
    
    if (deviceId) {
      filtre.idDispositif = deviceId;
    }
    
    if (status) {
      filtre.statut = status;
    }
    
    // Récupérer les mesures (les plus récentes en premier)
    const mesures = await Mesure.find(filtre)
      .sort({ createdAt: -1 }) // Trier par date décroissante
      .limit(parseInt(limit))
      .populate('idUtilisateur', 'prenom nom email'); // Joindre les infos utilisateur
    
    console.log(`📊 ${mesures.length} mesure(s) récupérée(s)`);
    
    res.json({
      success: true,
      count: mesures.length,
      data: mesures
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération mesures:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📈 GET /api/measurements/stats - Statistiques des mesures
router.get('/stats', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;
    
    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '❌ userId ou deviceId requis'
      });
    }
    
    let filtre = {};
    if (userId) filtre.idUtilisateur = userId;
    if (deviceId) filtre.idDispositif = deviceId;
    
    // Calculer les statistiques
    const mesures = await Mesure.find(filtre);
    
    if (mesures.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune mesure trouvée',
        stats: null
      });
    }
    
    // Calculs
    const bpmValues = mesures.map(m => m.bpm);
    const spo2Values = mesures.map(m => m.spo2);
    
    const stats = {
      nombreMesures: mesures.length,
      bpm: {
        moyenne: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length),
        min: Math.min(...bpmValues),
        max: Math.max(...bpmValues)
      },
      spo2: {
        moyenne: Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length),
        min: Math.min(...spo2Values),
        max: Math.max(...spo2Values)
      },
      statuts: {
        normal: mesures.filter(m => m.statut === 'NORMAL').length,
        attention: mesures.filter(m => m.statut === 'ATTENTION').length,
        danger: mesures.filter(m => m.statut === 'DANGER').length
      },
      derniereMesure: mesures[0].createdAt
    };
    
    console.log('📈 Statistiques calculées');
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Erreur calcul stats:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/measurements/:id - Supprimer une mesure
router.delete('/:id', async (req, res) => {
  try {
    const mesure = await Mesure.findByIdAndDelete(req.params.id);
    
    if (!mesure) {
      return res.status(404).json({
        success: false,
        message: '❌ Mesure non trouvée'
      });
    }
    
    console.log(`🗑️ Mesure ${req.params.id} supprimée`);
    
    res.json({
      success: true,
      message: '✅ Mesure supprimée'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;


// ✅ POST /api/measurements → Ajouter une mesure (ESP32)
// ✅ GET /api/measurements → Lister les mesures
// ✅ GET /api/measurements/stats → Statistiques
// ✅ DELETE /api/measurements/:id → Supprimer