const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/notifications - Liste des notifications de l'utilisateur
router.get('/', verifierToken, async (req, res) => {
  try {
    console.log('🔔 Récupération notifications pour:', req.utilisateur.id);

    const notifications = await Notification.find({
      utilisateurId: req.utilisateur.id
    })
    .sort({ createdAt: -1 })
    .limit(50);

    console.log(`✅ ${notifications.length} notification(s) trouvée(s)`);

    res.json({
      success: true,
      notifications,
      total: notifications.length
    });
  } catch (error) {
    console.error('❌ Erreur notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/notifications/unread-count - Nombre de notifications non lues
router.get('/unread-count', verifierToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      utilisateurId: req.utilisateur.id,
      lue: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('❌ Erreur count notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/notifications/:notificationId/read - Marquer comme lue
router.put('/:notificationId/read', verifierToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        utilisateurId: req.utilisateur.id
      },
      { lue: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('❌ Erreur mark as read:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/notifications/:notificationId - Supprimer une notification
router.delete('/:notificationId', verifierToken, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      utilisateurId: req.utilisateur.id
    });

    res.json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;