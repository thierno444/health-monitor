const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔧 Script de correction des index MongoDB\n');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB Atlas');
    console.log(`📊 Base de données: ${mongoose.connection.db.databaseName}\n`);
    
    const collection = mongoose.connection.db.collection('utilisateurs');
    
    // 1. Lister les index actuels
    console.log('📋 Index actuels:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });
    
    // 2. Vérifier si idDispositif_1 existe
    const hasOldIndex = indexes.some(idx => idx.name === 'idDispositif_1');
    
    if (hasOldIndex) {
      console.log('\n🗑️  Suppression de l\'ancien index idDispositif_1...');
      await collection.dropIndex('idDispositif_1');
      console.log('✅ Ancien index supprimé');
    } else {
      console.log('\n⚠️  Index idDispositif_1 déjà supprimé ou inexistant');
    }
    
    // 3. Créer le nouvel index avec sparse
    console.log('\n🔨 Création du nouvel index avec sparse:true...');
    await collection.createIndex(
      { idDispositif: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'idDispositif_1'
      }
    );
    console.log('✅ Nouvel index créé avec succès');
    
    // 4. Vérifier le résultat
    console.log('\n📋 Index finaux:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key), idx.sparse ? '(sparse)' : '');
    });
    
    console.log('\n🎉 Correction terminée avec succès !');
    console.log('💡 Les médecins peuvent maintenant s\'inscrire sans idDispositif\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });