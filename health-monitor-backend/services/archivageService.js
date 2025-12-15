const Utilisateur = require('../models/User');
const Mesure = require('../models/Measurement');
const LogArchivage = require('../models/LogArchivage');

class ArchivageService {
  
  // Archiver un utilisateur (patient ou autre)
  async archiverUtilisateur(cibleId, archivePar, raison, commentaire = '') {
    try {
      const utilisateur = await Utilisateur.findById(cibleId);
      
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (utilisateur.estArchive) {
        throw new Error('Utilisateur déjà archivé');
      }
      
      // Snapshot des données (pour admin)
      const snapshot = {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        dateArchivage: new Date(),
        nombreMesures: await Mesure.countDocuments({ idUtilisateur: cibleId })
      };
      
      // Mettre à jour l'utilisateur
      utilisateur.estArchive = true;
      utilisateur.dateArchivage = new Date();
      utilisateur.raisonArchivage = raison;
      utilisateur.commentaireArchivage = commentaire;
      utilisateur.archivePar = archivePar;
      utilisateur.dataArchivee = snapshot;
      
      // Calculer date de suppression RGPD (6 mois)
      const dateSuppression = new Date();
      dateSuppression.setMonth(dateSuppression.getMonth() + 6);
      utilisateur.suppressionPrevue = dateSuppression;
      
      await utilisateur.save();
      
      // Logger l'action
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
      
      console.log(`✅ Utilisateur ${utilisateur.email} archivé par ${archivePar}`);
      
      return {
        success: true,
        utilisateur: snapshot,
        suppressionPrevue: dateSuppression
      };
      
    } catch (error) {
      console.error('❌ Erreur archivage:', error);
      throw error;
    }
  }
  
  // Désarchiver un utilisateur
  async desarchiverUtilisateur(cibleId, archivePar, raison = '') {
    try {
      const utilisateur = await Utilisateur.findById(cibleId);
      
      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (!utilisateur.estArchive) {
        throw new Error('Utilisateur non archivé');
      }
      
      // Réactiver
      utilisateur.estArchive = false;
      utilisateur.dateArchivage = null;
      utilisateur.raisonArchivage = null;
      utilisateur.commentaireArchivage = null;
      utilisateur.suppressionPrevue = null;
      
      await utilisateur.save();
      
      // Logger
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
      
      console.log(`✅ Utilisateur ${utilisateur.email} désarchivé par ${archivePar}`);
      
      return { success: true, utilisateur };
      
    } catch (error) {
      console.error('❌ Erreur désarchivage:', error);
      throw error;
    }
  }
  
  // Archivage en masse (admin)
  async archiverEnMasse(utilisateurIds, archivePar, raison, commentaire = '') {
    const resultats = {
      reussis: [],
      echecs: []
    };
    
    for (const id of utilisateurIds) {
      try {
        const result = await this.archiverUtilisateur(id, archivePar, raison, commentaire);
        resultats.reussis.push({ id, ...result });
      } catch (error) {
        resultats.echecs.push({ id, error: error.message });
      }
    }
    
    return resultats;
  }
  
  // Supprimer définitivement (RGPD)
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
      const maintenant = new Date();
      if (utilisateur.suppressionPrevue && utilisateur.suppressionPrevue > maintenant) {
        throw new Error(`Suppression possible à partir du ${utilisateur.suppressionPrevue.toLocaleDateString()}`);
      }
      
      // Logger avant suppression
      await LogArchivage.create({
        utilisateurId: archivePar,
        cibleId: cibleId,
        action: 'suppression',
        metadata: utilisateur.dataArchivee || {
          role: utilisateur.role,
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom
        }
      });
      
      // Supprimer les mesures
      await Mesure.deleteMany({ idUtilisateur: cibleId });
      
      // Supprimer l'utilisateur
      await Utilisateur.findByIdAndDelete(cibleId);
      
      console.log(`🗑️ Utilisateur ${cibleId} supprimé définitivement`);
      
      return { success: true, message: 'Utilisateur supprimé définitivement' };
      
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }
  
  // Statistiques d'archivage
  async getStatistiques() {
    const stats = {
      total: await Utilisateur.countDocuments(),
      actifs: await Utilisateur.countDocuments({ estArchive: false }),
      archives: await Utilisateur.countDocuments({ estArchive: true }),
      aSupprimer: await Utilisateur.countDocuments({
        estArchive: true,
        suppressionPrevue: { $lte: new Date() }
      }),
      parRole: {
        patients: await Utilisateur.countDocuments({ role: 'patient', estArchive: false }),
        medecins: await Utilisateur.countDocuments({ role: 'medecin', estArchive: false }),
        admins: await Utilisateur.countDocuments({ role: 'admin', estArchive: false })
      },
      archivesParRaison: await Utilisateur.aggregate([
        { $match: { estArchive: true } },
        { $group: { _id: '$raisonArchivage', count: { $sum: 1 } } }
      ])
    };
    
    return stats;
  }
}

module.exports = new ArchivageService();
