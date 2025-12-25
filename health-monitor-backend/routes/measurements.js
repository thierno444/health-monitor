const { envoyerEmailAlerte } = require('../services/emailService');
const express = require('express');
const router = express.Router();
const Mesure = require('../models/Measurement');
const Utilisateur = require('../models/User');
const verifierToken = require('../middleware/auth'); 

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

    // Envoyer email si statut ATTENTION ou DANGER
    if (status === 'ATTENTION' || status === 'DANGER') {
      console.log('🔔 Tentative d\'envoi email d\'alerte...');
      
      try {
        await envoyerEmailAlerte(utilisateur, {
          bpm: bpm,
          spo2: spo2,
          statut: status,
          idDispositif: deviceId,
          horodatageMesure: nouvelleMesure.horodatageMesure
        });
        
        console.log(`📧 Email d'alerte envoyé à ${utilisateur.email}`);
      } catch (emailError) {
        console.error('⚠️ Email alerte non envoyé:', emailError.message);
        console.error('Stack:', emailError.stack);
      }
    }

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
router.get('/', verifierToken, async (req, res) => {
  try {
    const utilisateurConnecte = req.utilisateur;
    
    console.log('📊 Récupération mesures pour:', utilisateurConnecte.email, '(', utilisateurConnecte.role, ')');
    
    let filtre = {};
    
    // SI PATIENT : Ne peut voir QUE ses propres mesures
    if (utilisateurConnecte.role === 'patient') {
      const mongoose = require('mongoose');
      filtre.idUtilisateur = new mongoose.Types.ObjectId(utilisateurConnecte.id);  // ← CONVERTIR EN ObjectId !
      console.log('👤 Patient - Filtre par userId:', filtre.idUtilisateur);
    }
    
    // SI MÉDECIN : Ne peut voir QUE les mesures de ses patients assignés
    else if (utilisateurConnecte.role === 'medecin') {
      // Récupérer les IDs des patients assignés
      const Assignment = require('../models/Assignment');
      const assignments = await Assignment.find({
        medecinId: utilisateurConnecte.id,
        actif: true
      });
      
      const patientIds = assignments.map(a => a.patientId);
      
      if (patientIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: [],
          message: 'Aucun patient assigné'
        });
      }
      
      filtre.idUtilisateur = { $in: patientIds };
      console.log('👨‍⚕️ Médecin - Filtre par', patientIds.length, 'patient(s) assigné(s)');
    }
    
   // SI ADMIN : Peut filtrer par userId si fourni, sinon voit tout
    else if (utilisateurConnecte.role === 'admin') {
      if (req.query.userId) {
        const mongoose = require('mongoose');
        filtre.idUtilisateur = new mongoose.Types.ObjectId(req.query.userId);  // ← CONVERTIR EN ObjectId !
        console.log('👑 Admin - Filtre par userId:', filtre.idUtilisateur);
      } else {
        console.log('👑 Admin - Toutes les mesures');
      }
    }
    
    // Filtres supplémentaires (optionnels)
    if (req.query.deviceId) {
      filtre.idDispositif = req.query.deviceId;
    }
    
    if (req.query.status) {
      filtre.statut = req.query.status;
    }
    
    const limit = parseInt(req.query.limit) || 50;
    
    // Récupérer les mesures (les plus récentes en premier)
    const mesures = await Mesure.find(filtre)
      .sort({ horodatageMesure: -1 }) // ← UTILISE horodatageMesure, pas createdAt
      .limit(limit)
      .populate('idUtilisateur', 'prenom nom email photoProfil');
    
    console.log(`✅ ${mesures.length} mesure(s) trouvée(s)`);
    
    res.json({
      success: true,
      count: mesures.length,
      mesures: mesures, // ← UTILISE "mesures" pour cohérence avec le frontend
      total: mesures.length
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

// Export PDF
router.get('/export/pdf/:userId', verifierToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Vérifier que l'utilisateur peut accéder à ces données
    if (req.utilisateur.id !== userId && req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const mesures = await Mesure.find({ idUtilisateur: userId })
      .sort({ horodatageMesure: -1 })
      .limit(100);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    // Headers pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=health-report-${Date.now()}.pdf`);

    doc.pipe(res);

    // Titre
    doc.fontSize(20).text('Rapport de Santé', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);

    // Statistiques
    const bpmValues = mesures.map(m => m.bpm);
    const spo2Values = mesures.map(m => m.spo2);
    
    doc.fontSize(16).text('Statistiques Globales', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Nombre de mesures: ${mesures.length}`);
    doc.text(`BPM Moyen: ${(bpmValues.reduce((a,b) => a+b, 0) / bpmValues.length).toFixed(1)}`);
    doc.text(`BPM Min: ${Math.min(...bpmValues)}`);
    doc.text(`BPM Max: ${Math.max(...bpmValues)}`);
    doc.moveDown();
    doc.text(`SpO2 Moyen: ${(spo2Values.reduce((a,b) => a+b, 0) / spo2Values.length).toFixed(1)}%`);
    doc.text(`SpO2 Min: ${Math.min(...spo2Values)}%`);
    doc.text(`SpO2 Max: ${Math.max(...spo2Values)}%`);
    doc.moveDown(2);

    // Tableau des mesures récentes
    doc.fontSize(16).text('Mesures Récentes (20 dernières)', { underline: true });
    doc.moveDown();
    doc.fontSize(10);

    mesures.slice(0, 20).forEach((mesure, index) => {
      const date = new Date(mesure.horodatageMesure).toLocaleString('fr-FR');
      doc.text(`${index + 1}. ${date} | BPM: ${mesure.bpm} | SpO2: ${mesure.spo2}% | Status: ${mesure.statut}`);
    });

    doc.end();

  } catch (error) {
    console.error('Erreur export PDF:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
});

// Export CSV
router.get('/export/csv/:userId', verifierToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Vérifier que l'utilisateur peut accéder à ces données
    if (req.utilisateur.id !== userId && req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const mesures = await Mesure.find({ idUtilisateur: userId })
      .sort({ horodatageMesure: -1 });

    // Créer le CSV avec point-virgule (format européen pour LibreOffice)
    // En-tête avec métadonnées
    let csv = '# Rapport de santé - Health Monitor\n';
    csv += `# Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    csv += `# Nombre de mesures: ${mesures.length}\n`;
    csv += '\n';
    csv += 'Date;Heure;BPM;SpO2;Statut;Batterie;Qualité Signal;Dispositif\n';
    
    mesures.forEach(mesure => {
      const date = new Date(mesure.horodatageMesure);
      const dateStr = date.toLocaleDateString('fr-FR');
      const timeStr = date.toLocaleTimeString('fr-FR');
      csv += `${dateStr};${timeStr};${mesure.bpm};${mesure.spo2};${mesure.statut};${mesure.niveauBatterie || 'N/A'};${mesure.qualite || 'N/A'};${mesure.idDispositif}\n`;
    });

    // Headers pour le téléchargement avec encoding UTF-8 avec BOM
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=health-data-${Date.now()}.csv`);
    
    // Ajouter BOM UTF-8 pour LibreOffice
    const BOM = '\uFEFF';
    res.send(BOM + csv);

  } catch (error) {
    console.error('Erreur export CSV:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du CSV' });
  }
});

module.exports = router;


// ✅ POST /api/measurements → Ajouter une mesure (ESP32)
// ✅ GET /api/measurements → Lister les mesures
// ✅ GET /api/measurements/stats → Statistiques
// ✅ DELETE /api/measurements/:id → Supprimer