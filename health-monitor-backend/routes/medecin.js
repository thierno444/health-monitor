const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const User = require('../models/User');
const Mesure = require('../models/Measurement');

// Middleware : vérifier rôle médecin
const verifierMedecin = (req, res, next) => {
  if (req.utilisateur.role !== 'medecin' && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès médecin requis' });
  }
  next();
};

// Liste des patients ASSIGNÉS au médecin
router.get('/patients', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const includeArchived = req.query.archives === 'true';
    
    console.log('👨‍⚕️ Récupération patients du médecin:', req.utilisateur.id);
    
    // MODIFICATION ICI ↓ Récupérer les assignations actives du médecin
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find({
      medecinId: req.utilisateur.id,
      actif: true
    });
    
    // Extraire les IDs des patients assignés
    const patientIds = assignments.map(a => a.patientId);
    
    console.log(`📋 ${patientIds.length} patient(s) assigné(s)`);
    
    // Si aucun patient assigné, retourner tableau vide
    if (patientIds.length === 0) {
      return res.json({
        success: true,
        patients: [],
        total: 0
      });
    }
    
    // Filtrer seulement les patients assignés
    const filter = { 
      _id: { $in: patientIds },
      role: 'patient'
    };
    
    if (!includeArchived) {
      filter.estArchive = false;
    }
    
    const patients = await User.find(filter)
      .select('-motDePasse -resetPasswordToken')
      .sort({ createdAt: -1 });
    
    // Enrichir avec dernière mesure et statut
    const patientsEnrichis = await Promise.all(
      patients.map(async (patient) => {
        const derniereMesure = await Mesure.findOne({ idUtilisateur: patient._id })
          .sort({ horodatageMesure: -1 });
        
        const nombreMesures = await Mesure.countDocuments({ idUtilisateur: patient._id });
        
        // Trouver l'assignation pour ce patient
        const assignment = assignments.find(a => a.patientId.toString() === patient._id.toString());
        
        return {
          id: patient._id,
          prenom: patient.prenom,
          nom: patient.nom,
          email: patient.email,
          telephone: patient.telephone,
          dateDeNaissance: patient.dateDeNaissance,
          genre: patient.genre,
          photoProfil: patient.photoProfil,
          idDispositif: patient.idDispositif,
          estArchive: patient.estArchive,
          dateArchivage: patient.dateArchivage,
          raisonArchivage: patient.raisonArchivage,
          commentaireArchivage: patient.commentaireArchivage,
          nombreMesures,
          derniereMesure: derniereMesure ? {
            bpm: derniereMesure.bpm,
            spo2: derniereMesure.spo2,
            statut: derniereMesure.statut,
            horodatageMesure: derniereMesure.horodatageMesure
          } : null,
          // Ajouter infos d'assignation
          assignation: {
            priorite: assignment?.priorite,
            dateAssignation: assignment?.dateAssignation,
            notesAssignation: assignment?.notesAssignation
          }
        };
      })
    );
    
    res.json({
      success: true,
      patients: patientsEnrichis,
      total: patientsEnrichis.length
    });
    
  } catch (error) {
    console.error('Erreur récupération patients:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Détails d'un patient ASSIGNÉ
router.get('/patients/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    console.log('👨‍⚕️ Détails patient:', req.params.patientId);
    
    // VÉRIFIER QUE LE PATIENT EST ASSIGNÉ AU MÉDECIN ↓
    const Assignment = require('../models/Assignment');
    const assignment = await Assignment.findOne({
      medecinId: req.utilisateur.id,
      patientId: req.params.patientId,
      actif: true
    });
    
    // Si pas d'assignation et que c'est pas un admin, refuser l'accès
    if (!assignment && req.utilisateur.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Ce patient ne vous est pas assigné'
      });
    }
    
    const patient = await User.findById(req.params.patientId)
      .select('-motDePasse -resetPasswordToken');
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }
    
    const mesures = await Mesure.find({ idUtilisateur: patient._id })
      .sort({ horodatageMesure: -1 })
      .limit(100);
    
    const stats = {
      total: mesures.length,
      normal: mesures.filter(m => m.statut === 'NORMAL').length,
      attention: mesures.filter(m => m.statut === 'ATTENTION').length,
      danger: mesures.filter(m => m.statut === 'DANGER').length
    };
    
    res.json({
      success: true,
      patient: {
        ...patient.toObject(),
        id: patient._id
      },
      mesures,
      statistiques: stats,
      assignation: assignment ? {
        priorite: assignment.priorite,
        dateAssignation: assignment.dateAssignation,
        notesAssignation: assignment.notesAssignation
      } : null
    });
    
  } catch (error) {
    console.error('Erreur détails patient:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// Statistiques globales médecin (SEULEMENT SES PATIENTS ASSIGNÉS)
router.get('/statistiques', verifierToken, verifierMedecin, async (req, res) => {
  try {
    console.log('📊 Statistiques médecin:', req.utilisateur.id);
    
    // MODIFICATION ICI ↓ Récupérer les assignations actives du médecin
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find({
      medecinId: req.utilisateur.id,
      actif: true
    });
    
    // Extraire les IDs des patients assignés
    const patientIds = assignments.map(a => a.patientId);
    
    // Statistiques SEULEMENT pour les patients assignés
    const totalPatients = patientIds.length;
    
    const patientsActifs = await User.countDocuments({ 
      _id: { $in: patientIds },
      role: 'patient', 
      estArchive: false 
    });
    
    const patientsArchives = await User.countDocuments({ 
      _id: { $in: patientIds },
      role: 'patient', 
      estArchive: true 
    });
    
    // Patients à risque (avec mesures DANGER récentes - dernières 24h)
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const mesuresDanger = await Mesure.find({
      idUtilisateur: { $in: patientIds },
      statut: 'DANGER',
      horodatageMesure: { $gte: hier }
    }).distinct('idUtilisateur');
    
    const patientsARisque = mesuresDanger.length;
    
    // Alertes actives (SEULEMENT pour les patients assignés)
    const alertesActives = await Mesure.countDocuments({
      idUtilisateur: { $in: patientIds },
      statut: { $in: ['DANGER', 'ATTENTION'] },
      horodatageMesure: { $gte: hier }
    });
    
    console.log(`✅ Stats: ${totalPatients} patients, ${patientsARisque} à risque, ${alertesActives} alertes`);
    
    res.json({
      success: true,
      statistiques: {
        totalPatients,
        patientsActifs,
        patientsArchives,
        patientsARisque,
        alertesActives
      }
    });
    
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Alertes (SEULEMENT pour les patients assignés)
router.get('/alertes', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { statut, limite = 50 } = req.query;
    
    console.log('🚨 Récupération alertes médecin:', req.utilisateur.id);
    
    // Récupérer les assignations actives
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find({
      medecinId: req.utilisateur.id,
      actif: true
    });
    
    // Extraire les IDs des patients assignés
    const patientIds = assignments.map(a => a.patientId);
    
    if (patientIds.length === 0) {
      return res.json({
        success: true,
        alertes: [],
        total: 0
      });
    }
    
    // Construire le filtre
    let filter = {
      idUtilisateur: { $in: patientIds }
    };
    
    // Filtrer par statut si spécifié
    if (statut && statut !== 'toutes') {
      if (statut === 'critiques') {
        filter.statut = 'DANGER';
      } else if (statut === 'danger') {
        filter.statut = { $in: ['DANGER', 'ATTENTION'] };
      } else if (statut === 'acquittees') {
        filter.acquittee = true;
      } else {
        filter.statut = statut.toUpperCase();
      }
    }
    
    // Récupérer les mesures
    const mesures = await Mesure.find(filter)
      .populate('idUtilisateur', 'prenom nom email photoProfil idDispositif')
      .sort({ horodatageMesure: -1 })
      .limit(parseInt(limite));
    
    // Statistiques
    const stats = {
      total: mesures.length,
      critiques: await Mesure.countDocuments({
        idUtilisateur: { $in: patientIds },
        statut: 'DANGER',
        acquittee: { $ne: true }
      }),
      danger: await Mesure.countDocuments({
        idUtilisateur: { $in: patientIds },
        statut: { $in: ['DANGER', 'ATTENTION'] },
        acquittee: { $ne: true }
      }),
      acquittees: await Mesure.countDocuments({
        idUtilisateur: { $in: patientIds },
        acquittee: true
      })
    };
    
    console.log(`✅ ${mesures.length} alerte(s) trouvée(s)`);
    
    res.json({
      success: true,
      alertes: mesures,
      total: mesures.length,
      stats
    });
    
  } catch (error) {
    console.error('❌ Erreur alertes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Recherche patients
router.get('/patients/search', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const query = req.query.q || '';
    const includeArchived = req.query.archives === 'true';
    
    const filter = {
      role: 'patient',
      $or: [
        { prenom: { $regex: query, $options: 'i' } },
        { nom: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (!includeArchived) {
      filter.estArchive = false;
    }
    
    const patients = await User.find(filter)
      .select('-motDePasse')
      .limit(20);
    
    res.json({
      success: true,
      patients
    });
    
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== RAPPORTS ET EXPORTS ==========

// Rapport PDF patient
router.get('/rapport-patient/:patientId', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    console.log('📄 Génération rapport PDF pour patient:', patientId);
    
    // Récupérer les données
    const patient = await User.findById(patientId).select('-motDePasse');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }
    
    const mesures = await Mesure.find({ idUtilisateur: patientId })
      .sort({ horodatageMesure: -1 })
      .limit(100);
    
    const Note = require('../models/Note');
    const notes = await Note.find({ patientId, visible: true })
      .populate('medecinId', 'prenom nom')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Statistiques
    const stats = {
      total: mesures.length,
      normal: mesures.filter(m => m.statut === 'NORMAL').length,
      attention: mesures.filter(m => m.statut === 'ATTENTION').length,
      danger: mesures.filter(m => m.statut === 'DANGER').length,
      bpmMoyen: mesures.length > 0 ? Math.round(mesures.reduce((acc, m) => acc + m.bpm, 0) / mesures.length) : 0,
      spo2Moyen: mesures.length > 0 ? Math.round(mesures.reduce((acc, m) => acc + m.spo2, 0) / mesures.length) : 0
    };
    
    // Générer PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${patient.prenom}-${patient.nom}-${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // En-tête
    doc.fontSize(24).fillColor('#2563eb').text('RAPPORT MÉDICAL', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#6b7280').text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Informations patient
    doc.fontSize(16).fillColor('#1f2937').text('INFORMATIONS PATIENT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Nom : ${patient.prenom} ${patient.nom}`);
    doc.text(`Email : ${patient.email}`);
    doc.text(`Genre : ${patient.genre === 'homme' ? 'Homme' : patient.genre === 'femme' ? 'Femme' : 'Autre'}`);
    if (patient.dateDeNaissance) {
      doc.text(`Date de naissance : ${new Date(patient.dateDeNaissance).toLocaleDateString('fr-FR')}`);
    }
    if (patient.idDispositif) {
      doc.text(`Dispositif : ${patient.idDispositif}`);
    }
    doc.moveDown(2);
    
    // Statistiques
    doc.fontSize(16).fillColor('#1f2937').text('STATISTIQUES GLOBALES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Nombre total de mesures : ${stats.total}`);
    doc.text(`BPM moyen : ${stats.bpmMoyen} bpm`);
    doc.text(`SpO2 moyen : ${stats.spo2Moyen}%`);
    doc.moveDown();
    doc.text('Répartition par statut :');
    doc.fillColor('#10b981').text(`  • Normal : ${stats.normal} (${Math.round(stats.normal / stats.total * 100)}%)`);
    doc.fillColor('#f59e0b').text(`  • Attention : ${stats.attention} (${Math.round(stats.attention / stats.total * 100)}%)`);
    doc.fillColor('#ef4444').text(`  • Danger : ${stats.danger} (${Math.round(stats.danger / stats.total * 100)}%)`);
    doc.fillColor('#1f2937');
    doc.moveDown(2);
    
    // Mesures récentes
    doc.fontSize(16).text('MESURES RÉCENTES (20 dernières)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    mesures.slice(0, 20).forEach((mesure, index) => {
      const date = new Date(mesure.horodatageMesure);
      const dateStr = `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}`;
      doc.text(`${index + 1}. ${dateStr} | BPM: ${mesure.bpm} | SpO2: ${mesure.spo2}% | ${mesure.statut}`);
    });
    
    doc.moveDown(2);
    
    // Notes médicales
    if (notes.length > 0) {
      doc.addPage();
      doc.fontSize(16).fillColor('#1f2937').text('NOTES MÉDICALES', { underline: true });
      doc.moveDown(0.5);
      
      notes.forEach((note, index) => {
        doc.fontSize(12).fillColor('#2563eb').text(`Note ${index + 1} - ${note.type.toUpperCase()}`, { underline: true });
        doc.fontSize(10).fillColor('#6b7280').text(`Par Dr. ${note.medecinId.prenom} ${note.medecinId.nom} le ${new Date(note.createdAt).toLocaleDateString('fr-FR')}`);
        doc.fontSize(11).fillColor('#1f2937').text(note.contenu, { width: 500 });
        doc.moveDown();
      });
    }
    
    // Footer
    doc.fontSize(8).fillColor('#9ca3af').text(
      'Ce document est confidentiel et destiné uniquement à un usage médical.',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    doc.end();
    
    console.log('✅ Rapport PDF généré');
    
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({ success: false, message: 'Erreur génération rapport' });
  }
});

// Export CSV global (SEULEMENT PATIENTS ASSIGNÉS)
router.get('/export-csv-global', verifierToken, verifierMedecin, async (req, res) => {
  try {
    console.log('📊 Export CSV médecin:', req.utilisateur.id);
    
    // MODIFICATION ICI ↓ Récupérer les assignations actives
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find({
      medecinId: req.utilisateur.id,
      actif: true
    });
    
    // Extraire les IDs des patients assignés
    const patientIds = assignments.map(a => a.patientId);
    
    if (patientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun patient assigné'
      });
    }
    
    // Récupérer SEULEMENT les mesures des patients assignés
    const mesures = await Mesure.find({
      idUtilisateur: { $in: patientIds }
    })
      .populate('idUtilisateur', 'prenom nom email idDispositif')
      .sort({ horodatageMesure: -1 })
      .limit(5000);
    
    // Créer CSV
    let csv = '# Export Health Monitor - Dr. ' + req.utilisateur.prenom + ' ' + req.utilisateur.nom + '\n';
    csv += `# Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    csv += `# Nombre de patients: ${patientIds.length}\n`;
    csv += `# Nombre de mesures: ${mesures.length}\n`;
    csv += '\n';
    csv += 'Patient;Email;Dispositif;Date;Heure;BPM;SpO2;Statut;Batterie\n';
    
    mesures.forEach(mesure => {
      if (!mesure.idUtilisateur) return;
      
      const date = new Date(mesure.horodatageMesure);
      const dateStr = date.toLocaleDateString('fr-FR');
      const timeStr = date.toLocaleTimeString('fr-FR');
      const patient = `${mesure.idUtilisateur.prenom} ${mesure.idUtilisateur.nom}`;
      
      csv += `${patient};${mesure.idUtilisateur.email};${mesure.idDispositif};${dateStr};${timeStr};${mesure.bpm};${mesure.spo2};${mesure.statut};${mesure.niveauBatterie || 'N/A'}\n`;
    });
    
    // Headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=export-patients-${Date.now()}.csv`);
    
    // BOM UTF-8
    const BOM = '\uFEFF';
    res.send(BOM + csv);
    
    console.log('✅ Export CSV généré:', mesures.length, 'mesures');
    
  } catch (error) {
    console.error('❌ Erreur export CSV:', error);
    res.status(500).json({ success: false, message: 'Erreur export CSV' });
  }
});

// Comparaison multi-patients
router.post('/comparaison', verifierToken, verifierMedecin, async (req, res) => {
  try {
    const { patientIds } = req.body;
    
    if (!patientIds || !Array.isArray(patientIds) || patientIds.length < 2 || patientIds.length > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fournissez entre 2 et 5 IDs de patients' 
      });
    }
    
    console.log('📊 Comparaison de', patientIds.length, 'patients');
    
    // Récupérer les patients
    const patients = await User.find({ _id: { $in: patientIds } })
      .select('prenom nom email photoProfil idDispositif dateDeNaissance genre');
    
    // Récupérer les mesures des 30 derniers jours pour chaque patient
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 30);
    
    const mesures = await Mesure.find({
      idUtilisateur: { $in: patientIds },
      horodatageMesure: { $gte: dateLimite }
    }).sort({ horodatageMesure: 1 });
    
    // Calculer statistiques pour chaque patient
    const statistiques = {};
    
    for (const patientId of patientIds) {
      const mesuresPatient = mesures.filter(m => m.idUtilisateur.toString() === patientId);
      
      if (mesuresPatient.length > 0) {
        const bpmValues = mesuresPatient.map(m => m.bpm);
        const spo2Values = mesuresPatient.map(m => m.spo2);
        
        statistiques[patientId] = {
          total: mesuresPatient.length,
          bpmMoyen: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length),
          bpmMin: Math.min(...bpmValues),
          bpmMax: Math.max(...bpmValues),
          spo2Moyen: Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length),
          spo2Min: Math.min(...spo2Values),
          spo2Max: Math.max(...spo2Values),
          normal: mesuresPatient.filter(m => m.statut === 'NORMAL').length,
          attention: mesuresPatient.filter(m => m.statut === 'ATTENTION').length,
          danger: mesuresPatient.filter(m => m.statut === 'DANGER').length
        };
      } else {
        statistiques[patientId] = {
          total: 0,
          bpmMoyen: 0,
          bpmMin: 0,
          bpmMax: 0,
          spo2Moyen: 0,
          spo2Min: 0,
          spo2Max: 0,
          normal: 0,
          attention: 0,
          danger: 0
        };
      }
    }
    
    res.json({
      success: true,
      patients,
      mesures,
      statistiques
    });
    
  } catch (error) {
    console.error('❌ Erreur comparaison:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;

