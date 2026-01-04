const Utilisateur = require('../models/User');
const Mesure = require('../models/Measurement');
const LogArchivage = require('../models/LogArchivage');
const Log = require('../models/Log');

class ArchivageService {
  
  // ========== ARCHIVER UN UTILISATEUR ==========
  async archiverUtilisateur(cibleId, archivePar, raison, commentaire = '') {
    try {
      const utilisateur = await Utilisateur.findById(cibleId);
      
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (utilisateur.estArchive) {
        throw new Error('Utilisateur déjà archivé');
      }
      
      // Récupérer l'admin
      const admin = await Utilisateur.findById(archivePar);
      if (!admin) {
        throw new Error('Admin non trouvé');
      }
      
      // Snapshot des données
      const snapshot = {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        dateArchivage: new Date(),
        nombreMesures: await Mesure.countDocuments({ idUtilisateur: cibleId })
      };
      
      // Date de suppression RGPD (6 mois)
      const dateSuppression = new Date();
      dateSuppression.setMonth(dateSuppression.getMonth() + 6);
      
      // Mettre à jour l'utilisateur
      utilisateur.estArchive = true;
      utilisateur.dateArchivage = new Date();
      utilisateur.suppressionPrevue = dateSuppression;
      utilisateur.archivage = {
        raison,
        commentaire,
        dateArchivage: new Date(),
        archivePar: admin.email
      };
      
      await utilisateur.save();
      
      // Logger l'action dans LogArchivage
      await LogArchivage.create({
        utilisateurId: archivePar,
        cibleId: cibleId,
        action: 'archivage',
        raison: raison,
        commentaire: commentaire,
        metadata: {
          role: utilisateur.role,
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom
        }
      });
      
      // Logger dans Log admin
      await Log.create({
        type: 'user_archive',
        adminId: archivePar,
        adminEmail: admin.email,
        targetType: 'user',
        targetId: cibleId,
        targetName: `${utilisateur.prenom} ${utilisateur.nom}`,
        action: `Archivage utilisateur - Raison: ${raison}`,
        details: { raison, commentaire },
        status: 'success'
      });
      
      // ✅ GÉNÉRER LE CSV (AJOUTÉ ICI)
      const exportData = this.generateUserCSV([utilisateur]);
      
      console.log(`✅ Utilisateur ${utilisateur.email} archivé par ${admin.email}`);
      
      return {
        success: true,
        utilisateur,
        suppressionPrevue: dateSuppression,
        exportData  // ← Maintenant défini
      };
      
    } catch (error) {
      console.error('❌ Erreur archivage:', error);
      throw error;
    }
  }
  
  // ========== DÉSARCHIVER UN UTILISATEUR ==========
  async desarchiverUtilisateur(cibleId, archivePar, raison = '') {
    try {
      const utilisateur = await Utilisateur.findById(cibleId);
      
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (!utilisateur.estArchive) {
        throw new Error('Utilisateur non archivé');
      }
      
      const admin = await Utilisateur.findById(archivePar);
      
      // Conserver l'historique mais désarchiver
      utilisateur.estArchive = false;
      utilisateur.dateArchivage = null;
      utilisateur.suppressionPrevue = null;
      
      if (utilisateur.archivage) {
        utilisateur.archivage.dateDesarchivage = new Date();
        utilisateur.archivage.desarchivePar = admin.email;
        utilisateur.archivage.raisonDesarchivage = raison;
      }
      
      await utilisateur.save();
      
      // Logger dans LogArchivage
      await LogArchivage.create({
        utilisateurId: archivePar,
        cibleId: cibleId,
        action: 'desarchivage',
        raison: raison,
        metadata: {
          role: utilisateur.role,
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom
        }
      });
      
      // Logger dans Log admin
      await Log.create({
        type: 'user_unarchive',
        adminId: archivePar,
        adminEmail: admin.email,
        targetType: 'user',
        targetId: cibleId,
        targetName: `${utilisateur.prenom} ${utilisateur.nom}`,
        action: `Désarchivage utilisateur - Raison: ${raison}`,
        details: { raison },
        status: 'success'
      });
      
      console.log(`✅ Utilisateur ${utilisateur.email} désarchivé par ${admin.email}`);
      
      return { success: true, utilisateur };
      
    } catch (error) {
      console.error('❌ Erreur désarchivage:', error);
      throw error;
    }
  }
  
  // ========== ARCHIVAGE EN MASSE ==========
  async archiverEnMasse(utilisateurIds, archivePar, raison, commentaire = '') {
    const admin = await Utilisateur.findById(archivePar);
    const dateSuppression = new Date();
    dateSuppression.setMonth(dateSuppression.getMonth() + 6);
    
    const resultats = {
      reussis: [],
      echecs: [],
      count: 0
    };
    
    for (const id of utilisateurIds) {
      try {
        const utilisateur = await Utilisateur.findById(id);
        
        if (!utilisateur || utilisateur.estArchive) {
          resultats.echecs.push({ id, error: 'Non trouvé ou déjà archivé' });
          continue;
        }
        
        utilisateur.estArchive = true;
        utilisateur.dateArchivage = new Date();
        utilisateur.suppressionPrevue = dateSuppression;
        utilisateur.archivage = {
          raison,
          commentaire,
          dateArchivage: new Date(),
          archivePar: admin.email
        };
        
        await utilisateur.save();
        
        // Logger individuellement
        await LogArchivage.create({
          utilisateurId: archivePar,
          cibleId: id,
          action: 'archivage',
          raison,
          commentaire,
          metadata: {
            role: utilisateur.role,
            email: utilisateur.email,
            nom: utilisateur.nom,
            prenom: utilisateur.prenom
          }
        });
        
        resultats.reussis.push({ id, email: utilisateur.email });
        resultats.count++;
        
      } catch (error) {
        resultats.echecs.push({ id, error: error.message });
      }
    }
    
    // Log global
    await Log.create({
      type: 'user_bulk_archive',
      adminId: archivePar,
      adminEmail: admin.email,
      action: `Archivage en masse de ${resultats.count} utilisateurs`,
      details: { count: resultats.count, raison, commentaire },
      status: 'success'
    });
    
    return {
      success: true,
      archived: resultats.count,
      message: `${resultats.count} utilisateur(s) archivé(s)`,
      details: resultats
    };
  }
  
  // ========== SUPPRESSION DÉFINITIVE (RGPD) ==========
  async supprimerDefinitivement(cibleId, archivePar) {
    try {
      const utilisateur = await Utilisateur.findById(cibleId);
      
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (!utilisateur.estArchive) {
        throw new Error('Utilisateur doit être archivé avant suppression');
      }
      
      // Vérifier délai RGPD (6 mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (utilisateur.dateArchivage && utilisateur.dateArchivage > sixMonthsAgo) {
        throw new Error('Délai de 6 mois non respecté (RGPD)');
      }
      
      const admin = await Utilisateur.findById(archivePar);
      
      // Logger AVANT suppression
      await LogArchivage.create({
        utilisateurId: archivePar,
        cibleId: cibleId,
        action: 'suppression',
        metadata: {
          role: utilisateur.role,
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom
        }
      });
      
      await Log.create({
        type: 'user_permanent_delete',
        adminId: archivePar,
        adminEmail: admin.email,
        targetType: 'user',
        targetName: `${utilisateur.prenom} ${utilisateur.nom}`,
        action: 'Suppression définitive utilisateur',
        details: { 
          raison: utilisateur.archivage?.raison,
          dateArchivage: utilisateur.dateArchivage 
        },
        status: 'success'
      });
      
      // Supprimer les mesures
      await Mesure.deleteMany({ idUtilisateur: cibleId });
      
      // Supprimer l'utilisateur
      await Utilisateur.findByIdAndDelete(cibleId);
      
      console.log(`🗑️ Utilisateur ${cibleId} supprimé définitivement`);
      
      return { 
        success: true, 
        message: 'Utilisateur supprimé définitivement' 
      };
      
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }
  
  // ========== STATISTIQUES ==========
  async getStatistiques() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [total, ceMois, cetteAnnee, parRaison, parRole] = await Promise.all([
      Utilisateur.countDocuments({ estArchive: true }),
      
      Utilisateur.countDocuments({ 
        estArchive: true,
        dateArchivage: { $gte: startOfMonth }
      }),
      
      Utilisateur.countDocuments({ 
        estArchive: true,
        dateArchivage: { $gte: startOfYear }
      }),
      
      Utilisateur.aggregate([
        { $match: { estArchive: true } },
        { $group: { 
          _id: '$archivage.raison', 
          count: { $sum: 1 } 
        }},
        { $sort: { count: -1 } }
      ]),
      
      Utilisateur.aggregate([
        { $match: { estArchive: true } },
        { $group: { 
          _id: '$role', 
          count: { $sum: 1 } 
        }},
        { $sort: { count: -1 } }
      ])
    ]);
    
    return {
      total,
      ceMois,
      cetteAnnee,
      parRaison,
      parRole,
      aSupprimer: await Utilisateur.countDocuments({
        estArchive: true,
        suppressionPrevue: { $lte: new Date() }
      })
    };
  }
  
  // ========== HELPER : Générer CSV ==========
  generateUserCSV(users) {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Dispositif', 'Date archivage', 'Raison'];
    
    const rows = users.map(u => [
      u.prenom,
      u.nom,
      u.email,
      u.telephone || '',
      u.role,
      u.idDispositif || '',
      u.dateArchivage ? new Date(u.dateArchivage).toLocaleDateString('fr-FR') : '',
      u.archivage?.raison || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
  }
}

module.exports = new ArchivageService();