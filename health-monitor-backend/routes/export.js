const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Mesure = require('../models/Measurement');
const Utilisateur = require('../models/User');

// ==================== ROUTES EXPORT ====================

// 📄 GET /api/export/pdf/:userId - Export PDF des mesures
router.get('/pdf/:userId', async (req, res) => {
  try {
    console.log('\n📄 Export PDF demandé');
    
    const { userId } = req.params;
    const { limit = 100 } = req.query;
    
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: '❌ Utilisateur non trouvé'
      });
    }
    
    // Récupérer les mesures
    const mesures = await Mesure.find({ idUtilisateur: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    if (mesures.length === 0) {
      return res.status(404).json({
        success: false,
        message: '❌ Aucune mesure trouvée'
      });
    }
    
    console.log(`📊 ${mesures.length} mesure(s) à exporter`);
    
    // Créer le PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Headers HTTP
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=mesures_${utilisateur.nom}_${Date.now()}.pdf`);
    
    // Pipe le PDF vers la réponse
    doc.pipe(res);
    
    // ==================== CONTENU DU PDF ====================
    
    // En-tête
    doc.fontSize(20)
       .fillColor('#0D8ABC')
       .text('🏥 Health Monitor', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(16)
       .fillColor('#333')
       .text('Rapport Médical', { align: 'center' })
       .moveDown(1);
    
    // Ligne de séparation
    doc.moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke('#0D8ABC')
       .moveDown(1);
    
    // Informations patient
    doc.fontSize(12)
       .fillColor('#333')
       .text(`Patient: ${utilisateur.nomComplet}`, { bold: true })
       .text(`Email: ${utilisateur.email}`)
       .text(`ID Dispositif: ${utilisateur.idDispositif || 'N/A'}`)
       .text(`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`)
       .moveDown(1);
    
    // Statistiques globales
    const bpmValues = mesures.map(m => m.bpm);
    const spo2Values = mesures.map(m => m.spo2);
    
    doc.fontSize(14)
       .fillColor('#0D8ABC')
       .text('📊 Statistiques Globales', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(11)
       .fillColor('#333')
       .text(`Nombre de mesures: ${mesures.length}`)
       .text(`BPM moyen: ${Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length)} bpm`)
       .text(`BPM min/max: ${Math.min(...bpmValues)} / ${Math.max(...bpmValues)} bpm`)
       .text(`SpO2 moyen: ${Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length)}%`)
       .text(`SpO2 min/max: ${Math.min(...spo2Values)} / ${Math.max(...spo2Values)}%`)
       .moveDown(1);
    
    // Répartition des statuts
    const statuts = {
      NORMAL: mesures.filter(m => m.statut === 'NORMAL').length,
      ATTENTION: mesures.filter(m => m.statut === 'ATTENTION').length,
      DANGER: mesures.filter(m => m.statut === 'DANGER').length
    };
    
    doc.text(`Statuts: Normal (${statuts.NORMAL}), Attention (${statuts.ATTENTION}), Danger (${statuts.DANGER})`)
       .moveDown(1.5);
    
    // Tableau des mesures récentes
    doc.fontSize(14)
       .fillColor('#0D8ABC')
       .text('📋 Dernières Mesures', { underline: true })
       .moveDown(0.5);
    
    // En-tête du tableau
    doc.fontSize(9)
       .fillColor('#666');
    
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 150;
    const col3 = 230;
    const col4 = 310;
    const col5 = 390;
    const col6 = 470;
    
    doc.text('Date', col1, tableTop)
       .text('BPM', col2, tableTop)
       .text('SpO2', col3, tableTop)
       .text('Statut', col4, tableTop)
       .text('Qualité', col5, tableTop)
       .text('Batterie', col6, tableTop);
    
    doc.moveTo(50, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke('#ccc');
    
    // Lignes du tableau
    let y = tableTop + 25;
    const maxMesures = Math.min(mesures.length, 30); // Max 30 mesures pour ne pas dépasser la page
    
    doc.fontSize(8).fillColor('#333');
    
    for (let i = 0; i < maxMesures; i++) {
      const m = mesures[i];
      
      // Nouvelle page si nécessaire
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      const date = new Date(m.createdAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.text(date, col1, y)
         .text(m.bpm.toString(), col2, y)
         .text(`${m.spo2}%`, col3, y)
         .text(m.statut, col4, y)
         .text(m.qualite, col5, y)
         .text(m.niveauBatterie ? `${m.niveauBatterie}%` : 'N/A', col6, y);
      
      y += 20;
    }
    
    // Footer
    doc.fontSize(8)
       .fillColor('#999')
       .text(
         `Rapport généré par Health Monitor - ${new Date().toLocaleString('fr-FR')}`,
         50,
         750,
         { align: 'center' }
       );
    
    // Finaliser le PDF
    doc.end();
    
    console.log('✅ PDF généré et envoyé');
    
  } catch (error) {
    console.error('❌ Erreur export PDF:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📊 GET /api/export/csv/:userId - Export CSV des mesures
router.get('/csv/:userId', async (req, res) => {
  try {
    console.log('\n📊 Export CSV demandé');
    
    const { userId } = req.params;
    const { limit = 1000 } = req.query;
    
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: '❌ Utilisateur non trouvé'
      });
    }
    
    // Récupérer les mesures
    const mesures = await Mesure.find({ idUtilisateur: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    if (mesures.length === 0) {
      return res.status(404).json({
        success: false,
        message: '❌ Aucune mesure trouvée'
      });
    }
    
    console.log(`📊 ${mesures.length} mesure(s) à exporter`);
    
    // Formater les données pour CSV
    const data = mesures.map(m => ({
      'Date': new Date(m.createdAt).toLocaleString('fr-FR'),
      'BPM': m.bpm,
      'SpO2 (%)': m.spo2,
      'Statut': m.statut,
      'Qualité': m.qualite,
      'Batterie (%)': m.niveauBatterie || 'N/A',
      'Température (°C)': m.temperature || 'N/A',
      'ID Dispositif': m.idDispositif,
      'Patient': utilisateur.nomComplet
    }));
    
    // Créer le CSV
    const parser = new Parser({
      fields: [
        'Date',
        'BPM',
        'SpO2 (%)',
        'Statut',
        'Qualité',
        'Batterie (%)',
        'Température (°C)',
        'ID Dispositif',
        'Patient'
      ],
      delimiter: ';', // Pour Excel français
      withBOM: true // Pour les accents
    });
    
    const csv = parser.parse(data);
    
    // Headers HTTP
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=mesures_${utilisateur.nom}_${Date.now()}.csv`);
    
    // Envoyer le CSV
    res.send(csv);
    
    console.log('✅ CSV généré et envoyé');
    
  } catch (error) {
    console.error('❌ Erreur export CSV:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

// 📈 GET /api/export/stats/:userId - Export statistiques détaillées
router.get('/stats/:userId', async (req, res) => {
  try {
    console.log('\n📈 Export statistiques');
    
    const { userId } = req.params;
    
    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: '❌ Utilisateur non trouvé'
      });
    }
    
    const mesures = await Mesure.find({ idUtilisateur: userId }).sort({ createdAt: -1 });
    
    if (mesures.length === 0) {
      return res.status(404).json({
        success: false,
        message: '❌ Aucune mesure trouvée'
      });
    }
    
    // Calculer les statistiques
    const bpmValues = mesures.map(m => m.bpm);
    const spo2Values = mesures.map(m => m.spo2);
    
    const stats = {
      utilisateur: {
        nom: utilisateur.nomComplet,
        email: utilisateur.email,
        idDispositif: utilisateur.idDispositif
      },
      periode: {
        debut: mesures[mesures.length - 1].createdAt,
        fin: mesures[0].createdAt,
        nombreMesures: mesures.length
      },
      bpm: {
        moyenne: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length),
        min: Math.min(...bpmValues),
        max: Math.max(...bpmValues),
        ecartType: Math.round(Math.sqrt(bpmValues.map(x => Math.pow(x - bpmValues.reduce((a, b) => a + b) / bpmValues.length, 2)).reduce((a, b) => a + b) / bpmValues.length))
      },
      spo2: {
        moyenne: Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length),
        min: Math.min(...spo2Values),
        max: Math.max(...spo2Values),
        ecartType: Math.round(Math.sqrt(spo2Values.map(x => Math.pow(x - spo2Values.reduce((a, b) => a + b) / spo2Values.length, 2)).reduce((a, b) => a + b) / spo2Values.length))
      },
      statuts: {
        normal: mesures.filter(m => m.statut === 'NORMAL').length,
        attention: mesures.filter(m => m.statut === 'ATTENTION').length,
        danger: mesures.filter(m => m.statut === 'DANGER').length
      },
      qualite: {
        bonne: mesures.filter(m => m.qualite === 'bonne').length,
        moyenne: mesures.filter(m => m.qualite === 'moyenne').length,
        mauvaise: mesures.filter(m => m.qualite === 'mauvaise').length
      }
    };
    
    console.log('✅ Statistiques calculées');
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Erreur export stats:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;