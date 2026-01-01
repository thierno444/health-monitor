const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const verifierToken = require('../middleware/auth');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Device = require('../models/Device');
const { createLog } = require('../utils/logger');
const Log = require('../models/Log');
const Notification = require('../models/Notification');



// Middleware admin
const verifierAdmin = (req, res, next) => {
  if (req.utilisateur.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès réservé aux administrateurs' 
    });
  }
  next();
};

// ==================== STATISTIQUES GLOBALES ====================

// GET /api/admin/stats - Statistiques globales
router.get('/stats', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('📊 Récupération statistiques globales');

    // Compter utilisateurs par rôle
    const totalPatients = await User.countDocuments({ role: 'patient', estArchive: false });
    const totalMedecins = await User.countDocuments({ role: 'medecin', estArchive: false });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalArchives = await User.countDocuments({ estArchive: true });
    const totalUtilisateurs = totalPatients + totalMedecins + totalAdmins;

    // Dispositifs
    const dispositifsAssignes = await User.countDocuments({ 
      idDispositif: { $ne: null, $exists: true },
      role: 'patient' 
    });

    res.json({
      success: true,
      stats: {
        utilisateurs: {
          total: totalUtilisateurs,
          patients: totalPatients,
          medecins: totalMedecins,
          admins: totalAdmins,
          archives: totalArchives
        },
        dispositifs: {
          assignes: dispositifsAssignes,
          disponibles: totalPatients - dispositifsAssignes
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/charts - Données pour graphiques
router.get('/charts', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('📊 Récupération données graphiques');

    // 1. Répartition par rôle
    const repartitionRoles = await User.aggregate([
      { $match: { estArchive: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // 2. Évolution utilisateurs (30 derniers jours)
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 30);

    const evolutionUtilisateurs = await User.aggregate([
      { $match: { createdAt: { $gte: dateDebut } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Activité globale (si tu as un modèle Measurement)
    // 3. Activité globale - Logs admin des 30 derniers jours
    let activiteGlobale = [];
    try {
      const Log = require('../models/Log');
      activiteGlobale = await Log.aggregate([
        { $match: { createdAt: { $gte: dateDebut } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Renommer _id en date
      activiteGlobale = activiteGlobale.map(item => ({
        date: item._id,
        count: item.count
      }));
      
        console.log('📊 Activité globale:', activiteGlobale.length, 'jours');
      } catch (err) {
        console.warn('⚠️ Pas de logs disponibles:', err.message);
      }

    // 4. Top alertes (si tu as un modèle Alerte)
    // 4. Top alertes (30 derniers jours)
    let topAlertes = [];
    try {
      const Alert = require('../models/Alert');  // ✅ BON NOM
      topAlertes = await Alerte.aggregate([
        { 
          $match: { 
            createdAt: { $gte: dateDebut },
            estAcquittee: false // Seulement les alertes non traitées
          } 
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      // Renommer _id en type
      topAlertes = topAlertes.map(item => ({
        type: item._id,
        count: item.count
      }));
      
      console.log('⚠️ Top alertes:', topAlertes.length, 'types');
    } catch (err) {
      console.warn('⚠️ Pas d\'alertes disponibles:', err.message);
    }

    res.json({
      success: true,
      charts: {
        repartitionRoles: repartitionRoles.map(r => ({ role: r._id, count: r.count })),
        evolutionUtilisateurs: evolutionUtilisateurs.map(e => ({ date: e._id, count: e.count })),
        activiteGlobale: activiteGlobale,
        topAlertes: topAlertes
      }
    });
  } catch (error) {
    console.error('❌ Erreur graphiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ==================== GESTION UTILISATEURS ====================

// GET /api/admin/users - Liste TOUS les utilisateurs
router.get('/users', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { role, search, includeArchived } = req.query;

    console.log('🔍 Liste utilisateurs - Filtres:', { role, search, includeArchived });

    let query = {};

    // Filtre par rôle SEULEMENT si spécifié et différent de "tous"
    if (role && role !== 'tous' && role !== '') {
      query.role = role;
      console.log('  → Filtre rôle appliqué:', role);
    } else {
      console.log('  → Aucun filtre rôle (tous les utilisateurs)');
    }

    // Filtre archives (par défaut: masquer les archivés)
    if (includeArchived !== 'true') {
      query.estArchive = false;
    }

    // Recherche
    if (search && search.trim() !== '') {
      query.$or = [
        { prenom: { $regex: search, $options: 'i' } },
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-motDePasse')
      .sort({ createdAt: -1 });

    console.log(`✅ ${users.length} utilisateurs trouvés`);

    // ← AJOUTE CE LOG DÉTAILLÉ
    const stats = {
      total: users.length,
      patients: users.filter(u => u.role === 'patient').length,
      medecins: users.filter(u => u.role === 'medecin').length,
      admins: users.filter(u => u.role === 'admin').length
    };
    console.log('📊 Statistiques chargées:', stats);

    if (stats.medecins === 0) {
      console.warn('⚠️ AUCUN MÉDECIN TROUVÉ dans les résultats !');
    }

    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    console.error('❌ Erreur liste users:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// POST /api/admin/users - Créer un utilisateur
router.post('/users', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, telephone, motDePasse, role, idDispositif } = req.body;

    console.log('➕ Création utilisateur:', email, role);

    if (!prenom || !nom || !email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: 'Prénom, nom, email et mot de passe requis'
      });
    }

    // Vérifier email unique
    const existant = await User.findOne({ email: email.toLowerCase() });
    if (existant) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hasher mot de passe
    const salt = await bcrypt.genSalt(10);
    const motDePasseHash = await bcrypt.hash(motDePasse, salt);

    // Préparer les données utilisateur
    const userData = {
      prenom,
      nom,
      email: email.toLowerCase(),
      telephone: telephone || null,
      motDePasse: motDePasseHash,
      role: role || 'patient',
      photoProfil: `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${prenom}+${nom}`,
      estActif: true
    };

    // SEULEMENT ajouter idDispositif si c'est un patient
    if (role === 'patient') {
      userData.idDispositif = idDispositif || null;
    }

    const user = await User.create(userData);

    // Logger l'action
    await createLog({
      type: 'user_create',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Création utilisateur: ${user.prenom} ${user.nom} (${user.email})`,
      targetType: 'user',
      targetId: user._id.toString(),
      targetName: `${user.prenom} ${user.nom}`,
      details: { role: user.role, email: user.email }
    });

    // AJOUTER NOTIFICATION ADMIN ↓
    try {
      await Notification.create({
        utilisateurId: req.utilisateur.id,
        titre: '✅ Utilisateur créé',
        message: `${user.prenom} ${user.nom} (${user.role}) a été créé avec succès`,
        type: 'info',
        donnees: { userId: user._id, role: user.role }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notification admin:', notifError.message);
    }

    console.log('✅ Utilisateur créé:', user._id);

    // AJOUTER L'ENVOI D'EMAIL DE BIENVENUE ↓
    try {
      const { envoyerEmailBienvenue } = require('../services/emailService');
      
      // Envoyer l'email avec le mot de passe temporaire (en clair, avant le hash)
      await envoyerEmailBienvenue(user, motDePasse);
      
      console.log(`📧 Email de bienvenue envoyé à ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email bienvenue:', emailError.message);
      // Ne pas bloquer la création si l'email échoue
    }


    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        idDispositif: user.idDispositif,
        photoProfil: user.photoProfil
      }
    });
  } catch (error) {
    console.error('❌ Erreur création user:', error);
    
    // Gérer les erreurs MongoDB spécifiques
    let message = 'Erreur serveur';
    let statusCode = 500;
    
    if (error.code === 11000) {
      // Erreur de duplication
      if (error.keyPattern && error.keyPattern.email) {
        message = 'Cet email est déjà utilisé';
        statusCode = 400;
      } else if (error.keyPattern && error.keyPattern.idDispositif) {
        if (error.keyValue && error.keyValue.idDispositif === null) {
          message = 'Erreur technique : Conflit d\'index. Contactez l\'administrateur.';
          statusCode = 500;
        } else {
          message = `L'ID dispositif ${error.keyValue.idDispositif} est déjà utilisé`;
          statusCode = 400;
        }
      }
    } else if (error.name === 'ValidationError') {
      message = 'Données invalides : ' + Object.values(error.errors).map(e => e.message).join(', ');
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message,
      error: error.message 
    });
  }
});


// PUT /api/admin/users/:userId - Modifier un utilisateur
router.put('/users/:userId', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, telephone, role, idDispositif, estActif } = req.body;

    console.log('✏️ Modification utilisateur:', req.params.userId);

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Mise à jour
    if (prenom) user.prenom = prenom;
    if (nom) user.nom = nom;
    if (email) user.email = email.toLowerCase();
    if (telephone !== undefined) user.telephone = telephone || null;
    if (role) user.role = role;
    if (estActif !== undefined) user.estActif = estActif;
    
    // SEULEMENT mettre à jour idDispositif si c'est un patient
    if (role === 'patient' || user.role === 'patient') {
      if (idDispositif !== undefined) {
        user.idDispositif = idDispositif || null;
      }
    } else {
      // Si on change en médecin/admin, supprimer le dispositif
      if (role && (role === 'medecin' || role === 'admin')) {
        user.idDispositif = undefined;
      }
    }

    await user.save({ validateModifiedOnly: true });

    // Logger l'action
    await createLog({
      type: 'user_update',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Modification utilisateur: ${user.prenom} ${user.nom}`,
      targetType: 'user',
      targetId: user._id.toString(),
      targetName: `${user.prenom} ${user.nom}`,
      details: { role: user.role }
    });

    console.log('✅ Utilisateur modifié:', user._id);

    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user: {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        idDispositif: user.idDispositif,
        estActif: user.estActif,
        photoProfil: user.photoProfil
      }
    });
  } catch (error) {
    console.error('❌ Erreur modification user:', error);
    
    let message = 'Erreur serveur';
    let statusCode = 500;
    
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.email) {
        message = 'Cet email est déjà utilisé';
        statusCode = 400;
      } else if (error.keyPattern && error.keyPattern.idDispositif) {
        message = 'Cet ID dispositif est déjà utilisé';
        statusCode = 400;
      }
    }
    
    res.status(statusCode).json({ success: false, message });
  }
});

// POST /api/admin/users/bulk-delete - Suppression multiple
router.post('/users/bulk-delete', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    console.log('🗑️ Suppression multiple:', userIds?.length || 0, 'utilisateurs');

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liste d\'utilisateurs requise'
      });
    }

    // Récupérer les infos AVANT suppression
    const users = await User.find({ _id: { $in: userIds } });
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé'
      });
    }

    const userNames = users.map(u => `${u.prenom} ${u.nom}`).join(', ');

    // Vérifier qu'on ne supprime pas tous les admins
    const adminsToDelete = users.filter(u => u.role === 'admin');
    if (adminsToDelete.length > 0) {
      const totalAdmins = await User.countDocuments({ role: 'admin' });
      if (totalAdmins - adminsToDelete.length < 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer tous les administrateurs'
        });
      }
    }

    // Libérer les dispositifs
    const devicesIds = users.filter(u => u.idDispositif).map(u => u.idDispositif);
    if (devicesIds.length > 0) {
      await Device.updateMany(
        { idDispositif: { $in: devicesIds } },
        { $set: { patientId: null, statut: 'disponible' } }
      );
    }

    // Supprimer
    const result = await User.deleteMany({ _id: { $in: userIds } });

    // Logger
    await createLog({
      type: 'user_delete',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Suppression multiple: ${result.deletedCount} utilisateur(s)`,
      targetType: 'user',
      details: { 
        deletedCount: result.deletedCount, 
        userNames: userNames.length > 100 ? userNames.substring(0, 100) + '...' : userNames
      }
    });

    // AJOUTER NOTIFICATION ADMIN ↓
    try {
      await Notification.create({
        utilisateurId: req.utilisateur.id,
        titre: '🗑️ Utilisateur supprimé',
        message: `${userName} (${userEmail}) a été supprimé`,
        type: 'info',
        donnees: { userName, userEmail, userRole }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notification admin:', notifError.message);
    }

    console.log('✅', result.deletedCount, 'utilisateurs supprimés');

    res.json({
      success: true,
      message: `${result.deletedCount} utilisateur(s) supprimé(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Erreur suppression multiple:', error);
    
    await createLog({
      type: 'user_delete',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Tentative de suppression multiple échouée`,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/users/:userId - Supprimer un utilisateur
router.delete('/users/:userId', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('🗑️ Suppression utilisateur:', req.params.userId);

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression du dernier admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le dernier administrateur'
        });
      }
    }

    // SAUVEGARDER LES INFOS AVANT LA SUPPRESSION ↓
    const userName = `${user.prenom} ${user.nom}`;
    const userEmail = user.email;
    const userRole = user.role;
    const userId = user._id.toString();

    // Si l'utilisateur a un dispositif, le libérer
    if (user.idDispositif) {
      await Device.updateOne(
        { idDispositif: user.idDispositif },
        { $set: { patientId: null, statut: 'disponible' } }
      );
    }

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(req.params.userId);

    // Logger l'action (APRÈS la suppression)
    await createLog({
      type: 'user_delete',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Suppression utilisateur: ${userName} (${userEmail})`,
      targetType: 'user',
      targetId: userId,
      targetName: userName,
      details: { role: userRole, email: userEmail }
    });

    console.log('✅ Utilisateur supprimé:', userId);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression user:', error);
    
    // Log de l'erreur
    await createLog({
      type: 'user_delete',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Tentative de suppression utilisateur échouée`,
      targetType: 'user',
      targetId: req.params.userId,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// POST /api/admin/users/import-csv - Import CSV
router.post('/users/import-csv', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { csvData } = req.body;

    console.log('📤 Import CSV démarré');

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'Données CSV requises'
      });
    }

    const results = [];
    const errors = [];
    const users = [];

    // Parser CSV
    const stream = Readable.from([csvData]);
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        users.push(row);
      })
      .on('end', async () => {
        console.log(`📋 ${users.length} utilisateurs à importer`);

        for (const [index, userData] of users.entries()) {
          try {
            const { prenom, nom, email, telephone, role, idDispositif, motDePasse } = userData;

            // Validation de base
            if (!prenom || !nom || !email || !motDePasse) {
              errors.push({
                ligne: index + 2,
                email: email || 'N/A',
                erreur: 'Données manquantes (prenom, nom, email, motDePasse requis)'
              });
              continue;
            }

            // Validation idDispositif pour patients
            if (role === 'patient' || !role) {
              if (!idDispositif) {
                errors.push({
                  ligne: index + 2,
                  email,
                  erreur: 'ID Dispositif requis pour les patients'
                });
                continue;
              }
              
              if (!/^ESP32_[A-Z0-9]+$/i.test(idDispositif)) {
                errors.push({
                  ligne: index + 2,
                  email,
                  erreur: 'Format ID Dispositif invalide (ESP32_XXX)'
                });
                continue;
              }
            }

            // Validation email
            if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
              errors.push({
                ligne: index + 2,
                email,
                erreur: 'Format email invalide'
              });
              continue;
            }

            // Validation téléphone (optionnel)
            if (telephone && !/^(\+?221|0)?[0-9]{9}$/.test(telephone.replace(/\s/g, ''))) {
              errors.push({
                ligne: index + 2,
                email,
                erreur: 'Format téléphone invalide'
              });
              continue;
            }

            // Vérifier email unique
            const existant = await User.findOne({ email: email.toLowerCase() });
            if (existant) {
              errors.push({
                ligne: index + 2,
                email,
                erreur: 'Email déjà utilisé'
              });
              continue;
            }

            // Vérifier idDispositif unique (si patient)
            if (idDispositif) {
              const dispositifExistant = await User.findOne({ idDispositif });
              if (dispositifExistant) {
                errors.push({
                  ligne: index + 2,
                  email,
                  erreur: `ID Dispositif ${idDispositif} déjà utilisé`
                });
                continue;
              }
            }

            // Hasher mot de passe
            const salt = await bcrypt.genSalt(10);
            const motDePasseHash = await bcrypt.hash(motDePasse, salt);

            const user = await User.create({
              prenom,
              nom,
              email: email.toLowerCase(),
              telephone: telephone || null,
              motDePasse: motDePasseHash,
              role: role || 'patient',
              idDispositif: (role === 'patient' || !role) ? idDispositif : null,
              photoProfil: `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${prenom}+${nom}`,
              estActif: true
            });

            results.push({
              ligne: index + 2,
              email: user.email,
              nom: `${user.prenom} ${user.nom}`
            });

          } catch (err) {
            errors.push({
              ligne: index + 2,
              email: userData.email || 'N/A',
              erreur: err.message
            });
          }
        }

        // Logger l'action
        await createLog({
          type: 'import_csv',
          adminId: req.utilisateur.id,
          adminEmail: req.utilisateur.email,
          action: `Import CSV: ${utilisateurs.length} utilisateur(s)`,
          targetType: 'system',
          details: { 
            totalImported: utilisateurs.length,
            roles: utilisateurs.reduce((acc, u) => {
              acc[u.role] = (acc[u.role] || 0) + 1;
              return acc;
            }, {})
          }
        });

        try {
          await Notification.create({
            utilisateurId: req.utilisateur.id,
            titre: '📤 Import CSV terminé',
            message: `${results.length} utilisateur(s) importé(s) avec succès${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`,
            type: 'info',
            donnees: { imported: results.length, errors: errors.length }
          });
        } catch (notifError) {
          console.error('⚠️ Erreur notification admin:', notifError.message);
        }

        console.log(`✅ Import terminé: ${results.length} créés, ${errors.length} erreurs`);

        res.json({
          success: true,
          message: `${results.length} utilisateur(s) importé(s)`,
          imported: results.length,
          errors: errors.length,
          results,
          errors
        });
      });

  } catch (error) {
    console.error('❌ Erreur import CSV:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ==================== GESTION DISPOSITIFS ====================


// GET /api/admin/devices - Liste tous les dispositifs
router.get('/devices', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('📟 Liste dispositifs');

    const devices = await Device.find()
      .populate('patientId', 'prenom nom email')
      .sort({ createdAt: -1 });

    console.log(`✅ ${devices.length} dispositifs trouvés`);

    res.json({
      success: true,
      devices,
      total: devices.length
    });
  } catch (error) {
    console.error('❌ Erreur liste devices:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/devices - Créer un dispositif
router.post('/devices', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { idDispositif, nom, notes } = req.body;

    console.log('➕ Création dispositif:', idDispositif);

    if (!idDispositif) {
      return res.status(400).json({
        success: false,
        message: 'ID Dispositif requis'
      });
    }

    // Vérifier format
    if (!/^ESP32_[A-Z0-9]+$/i.test(idDispositif)) {
      return res.status(400).json({
        success: false,
        message: 'Format invalide (ESP32_XXX)'
      });
    }

    // Vérifier unicité
    const existant = await Device.findOne({ idDispositif });
    if (existant) {
      return res.status(400).json({
        success: false,
        message: 'Ce dispositif existe déjà'
      });
    }

    const device = await Device.create({
      idDispositif,
      nom: nom || idDispositif,
      notes,
      statut: 'disponible'
    });

     // Logger l'action
    await createLog({
      type: 'device_create',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Création dispositif: ${device.idDispositif}`,
      targetType: 'device',
      targetId: device._id.toString(),
      targetName: device.idDispositif,
      details: { nom: device.nom }
    });

    console.log('✅ Dispositif créé:', device._id);

    res.status(201).json({
      success: true,
      message: 'Dispositif créé avec succès',
      device
    });
  } catch (error) {
    console.error('❌ Erreur création device:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/devices/:deviceId/assign - Assigner à un patient
router.put('/devices/:deviceId/assign', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { patientId } = req.body;

    console.log('📌 Assignation dispositif:', req.params.deviceId, '→', patientId);

    const device = await Device.findById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Dispositif non trouvé' });
    }

    if (patientId) {
      // Vérifier que le patient existe
      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        return res.status(400).json({ success: false, message: 'Patient invalide' });
      }

      // Désassigner l'ancien dispositif du patient (si existe)
      await Device.updateMany(
        { patientId: patientId },
        { $set: { patientId: null, statut: 'disponible' } }
      );

      // Mettre à jour l'utilisateur
      patient.idDispositif = device.idDispositif;
      await patient.save();

      device.patientId = patientId;
      device.statut = 'assigne';
    } else {
      // Désassigner
      if (device.patientId) {
        const patient = await User.findById(device.patientId);
        if (patient) {
          // Utiliser $unset au lieu de mettre null
          await User.updateOne(
            { _id: patient._id },
            { $unset: { idDispositif: "" } }
          );
        }
      }

      device.patientId = null;
      device.statut = 'disponible';
    }

    await device.save();

    const devicePopulated = await Device.findById(device._id).populate('patientId', 'prenom nom email');

    // Logger l'action
    await createLog({
      type: 'device_assign',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: patientId 
        ? `Assignation dispositif ${device.idDispositif} à ${patient.prenom} ${patient.nom}`
        : `Désassignation dispositif ${device.idDispositif}`,
      targetType: 'device',
      targetId: device._id.toString(),
      targetName: device.idDispositif,
      details: { 
        patientId: patientId || null,
        patientName: patientId ? `${patient.prenom} ${patient.nom}` : null
      }
    });

    console.log('✅ Dispositif assigné');

    res.json({
      success: true,
      message: patientId ? 'Dispositif assigné' : 'Dispositif désassigné',
      device: devicePopulated
    });
  } catch (error) {
    console.error('❌ Erreur assignation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/devices/:deviceId - Supprimer un dispositif
router.delete('/devices/:deviceId', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('🗑️ Suppression dispositif:', req.params.deviceId);

    const device = await Device.findById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Dispositif non trouvé' });
    }

    // Si assigné, désassigner d'abord
    if (device.patientId) {
      const patient = await User.findById(device.patientId);
      if (patient) {
        patient.idDispositif = null;
        await patient.save();
      }
    }

    await Device.findByIdAndDelete(req.params.deviceId);

    // Logger l'action
    await createLog({
      type: 'device_delete',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Suppression dispositif: ${device.idDispositif}`,
      targetType: 'device',
      targetId: req.params.deviceId,
      targetName: device.idDispositif,
      details: { nom: device.nom }
    });

    console.log('✅ Dispositif supprimé');

    res.json({
      success: true,
      message: 'Dispositif supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression device:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/devices/sync - Synchroniser avec les utilisateurs
router.post('/devices/sync', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('🔄 Synchronisation dispositifs');

    // Récupérer tous les patients avec idDispositif
    const patients = await User.find({ 
      role: 'patient',
      idDispositif: { $ne: null, $exists: true }
    });

    let created = 0;
    let updated = 0;

    for (const patient of patients) {
      let device = await Device.findOne({ idDispositif: patient.idDispositif });
      
      if (!device) {
        // Créer le dispositif
        device = await Device.create({
          idDispositif: patient.idDispositif,
          patientId: patient._id,
          statut: 'assigne'
        });
        created++;
      } else if (device.patientId?.toString() !== patient._id.toString()) {
        // Mettre à jour
        device.patientId = patient._id;
        device.statut = 'assigne';
        await device.save();
        updated++;
      }
    }

    await createLog({
      type: 'sync_devices',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Synchronisation des dispositifs: ${created} créés, ${updated} mis à jour`,
      targetType: 'system',
      details: { created, updated, totalPatients: patients.length }
    });

    // AJOUTER NOTIFICATION ADMIN ↓
    try {
      await Notification.create({
        utilisateurId: req.utilisateur.id,
        titre: '🔄 Synchronisation terminée',
        message: `${created} dispositif(s) créé(s), ${updated} mis à jour`,
        type: 'info',
        donnees: { created, updated }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notification admin:', notifError.message);
    }

    console.log(`✅ Sync terminée: ${created} créés, ${updated} mis à jour`);

    res.json({
      success: true,
      message: `Synchronisation terminée: ${created} créés, ${updated} mis à jour`,
      created,
      updated
    });
  } catch (error) {
    console.error('❌ Erreur sync:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ==================== LOGS ====================

// GET /api/admin/logs - Liste des logs
router.get('/logs', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { type, adminId, startDate, endDate, limit = 50 } = req.query;

    console.log('📜 Récupération logs');

    let query = {};

    // Filtre par type
    if (type && type !== 'tous') {
      query.type = type;
    }

    // Filtre par admin
    if (adminId) {
      query.adminId = adminId;
    }

    // Filtre par date
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await Log.find(query)
      .populate('adminId', 'prenom nom email photoProfil')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    console.log(`✅ ${logs.length} logs trouvés`);

    res.json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error('❌ Erreur logs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/logs/stats - Statistiques des logs
router.get('/logs/stats', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('📊 Stats logs');

    const totalLogs = await Log.countDocuments();
    
    const logsByType = await Log.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentErrors = await Log.countDocuments({
      status: 'error',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: {
        totalLogs,
        logsByType,
        recentErrors
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats logs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/logs/clear - Effacer les anciens logs
router.delete('/logs/clear', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    console.log(`🗑️ Suppression logs > ${days} jours`);

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));

    const result = await Log.deleteMany({
      createdAt: { $lt: dateLimit }
    });

    // Logger cette action
    await createLog({
      type: 'other',
      adminId: req.utilisateur.id,
      adminEmail: req.utilisateur.email,
      action: `Suppression des logs de plus de ${days} jours`,
      details: { deletedCount: result.deletedCount }
    });

    console.log(`✅ ${result.deletedCount} logs supprimés`);

    res.json({
      success: true,
      message: `${result.deletedCount} log(s) supprimé(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Erreur clear logs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ==================== LISTE ASSIGNATIONS ====================

// GET /api/admin/assignations - Liste toutes les assignations
router.get('/assignations', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { actif, medecinId, patientId } = req.query;
    
    console.log('📋 Liste assignations');
    
    let filter = {};
    
    // Filtre par statut
    if (actif !== undefined) {
      filter.actif = actif === 'true';
    }
    
    // Filtre par médecin
    if (medecinId) {
      filter.medecinId = medecinId;
    }
    
    // Filtre par patient
    if (patientId) {
      filter.patientId = patientId;
    }
    
    const Assignment = require('../models/Assignment');
    const assignations = await Assignment.find(filter)
      .populate('medecinId', 'prenom nom email photoProfil')
      .populate('patientId', 'prenom nom email photoProfil idDispositif')
      .sort({ dateAssignation: -1 });
    
    console.log(`✅ ${assignations.length} assignation(s) trouvée(s)`);
    
    // Statistiques
    const stats = {
      total: assignations.length,
      actives: assignations.filter(a => a.actif).length,
      inactives: assignations.filter(a => !a.actif).length,
      parPriorite: {
        urgente: assignations.filter(a => a.actif && a.priorite === 'urgente').length,
        haute: assignations.filter(a => a.actif && a.priorite === 'haute').length,
        moyenne: assignations.filter(a => a.actif && a.priorite === 'moyenne').length,
        basse: assignations.filter(a => a.actif && a.priorite === 'basse').length
      }
    };
    
    res.json({
      success: true,
      assignations,
      stats,
      total: assignations.length
    });
  } catch (error) {
    console.error('❌ Erreur liste assignations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/admin/assignations/export-csv - Export CSV des assignations
router.get('/assignations/export-csv', verifierToken, verifierAdmin, async (req, res) => {
  try {
    console.log('📊 Export CSV assignations');
    
    const Assignment = require('../models/Assignment');
    const assignations = await Assignment.find()
      .populate('medecinId', 'prenom nom email')
      .populate('patientId', 'prenom nom email idDispositif')
      .sort({ dateAssignation: -1 });
    
    // Créer CSV
    let csv = '# Export Assignations Médecin-Patient\n';
    csv += `# Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    csv += `# Nombre d'assignations: ${assignations.length}\n`;
    csv += '\n';
    csv += 'Patient;Email Patient;Dispositif;Médecin;Email Médecin;Priorité;Date Assignation;Statut;Date Désassignation;Notes\n';
    
    assignations.forEach(a => {
      const patient = a.patientId ? `${a.patientId.prenom} ${a.patientId.nom}` : 'N/A';
      const patientEmail = a.patientId?.email || 'N/A';
      const dispositif = a.patientId?.idDispositif || 'N/A';
      const medecin = a.medecinId ? `Dr. ${a.medecinId.prenom} ${a.medecinId.nom}` : 'N/A';
      const medecinEmail = a.medecinId?.email || 'N/A';
      const dateAssignation = new Date(a.dateAssignation).toLocaleDateString('fr-FR');
      const statut = a.actif ? 'Active' : 'Inactive';
      const dateDesassignation = a.dateDesassignation ? new Date(a.dateDesassignation).toLocaleDateString('fr-FR') : 'N/A';
      const notes = (a.notesAssignation || '').replace(/;/g, ',').replace(/\n/g, ' ');
      
      csv += `${patient};${patientEmail};${dispositif};${medecin};${medecinEmail};${a.priorite};${dateAssignation};${statut};${dateDesassignation};${notes}\n`;
    });
    
    // Headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=assignations-${Date.now()}.csv`);
    
    // BOM UTF-8
    const BOM = '\uFEFF';
    res.send(BOM + csv);
    
    console.log('✅ Export CSV généré:', assignations.length, 'assignations');
    
  } catch (error) {
    console.error('❌ Erreur export CSV:', error);
    res.status(500).json({ success: false, message: 'Erreur export CSV' });
  }
}); 

module.exports = router;