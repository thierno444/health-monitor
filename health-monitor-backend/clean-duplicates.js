const mongoose = require('mongoose');
require('dotenv').config();

console.log('🧹 Nettoyage des utilisateurs en doublon\n');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const collection = mongoose.connection.db.collection('utilisateurs');
    
    // Trouver tous les utilisateurs avec idDispositif: null
    const usersWithNull = await collection.find({ idDispositif: null }).toArray();
    
    console.log(`📊 ${usersWithNull.length} utilisateur(s) avec idDispositif: null\n`);
    
    if (usersWithNull.length <= 1) {
      console.log('✅ Aucun doublon détecté !');
      process.exit(0);
    }
    
    // Afficher tous les utilisateurs
    console.log('👥 Liste des utilisateurs:');
    usersWithNull.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.email}) - Role: ${user.role}`);
    });
    
    // Garder le PREMIER, supprimer les AUTRES
    const toKeep = usersWithNull[0];
    const toDelete = usersWithNull.slice(1);
    
    console.log(`\n✅ GARDE: ${toKeep.prenom} ${toKeep.nom} (${toKeep.email})`);
    console.log(`🗑️  SUPPRIME: ${toDelete.length} utilisateur(s)\n`);
    
    // Supprimer les doublons
    for (const user of toDelete) {
      await collection.deleteOne({ _id: user._id });
      console.log(`   ❌ Supprimé: ${user.prenom} ${user.nom} (${user.email})`);
    }
    
    console.log('\n�� Nettoyage terminé !');
    console.log('💡 Tu peux maintenant créer autant de médecins que tu veux !\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
