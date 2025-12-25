const Log = require('../models/Log');

/**
 * Créer un log d'action admin
 */
async function createLog({
  type,
  adminId,
  adminEmail,
  action,
  targetType = null,
  targetId = null,
  targetName = null,
  details = {},
  ipAddress = null,
  status = 'success',
  errorMessage = null
}) {
  try {
    await Log.create({
      type,
      adminId,
      adminEmail,
      targetType,
      targetId,
      targetName,
      action,
      details,
      ipAddress,
      status,
      errorMessage
    });
  } catch (error) {
    console.error('❌ Erreur création log:', error.message);
    // On ne bloque pas l'action si le log échoue
  }
}

module.exports = { createLog };