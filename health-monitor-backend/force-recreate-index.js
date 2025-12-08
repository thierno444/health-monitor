const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔨 Recréation FORCÉE de l\'index idDispositif\n');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB\n');
    
    const collection = mongoose.connection.db.collection('utilisateurs');
    
    // 1. Lister TOUS les index
    console.log('📋 Index actuels:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      const sparse = idx.sparse ? '✅ sparse' : '❌ PAS sparse';
      const unique = idx.unique ? '🔒 unique' : '';
      console.log(`   ${idx.name}: ${JSON.stringify(idx.key)} ${unique} ${sparse}`);
    });
    
    // 2. Supprimer L'INDEX idDispositif_1 s'il existe
    console.log('\n🗑️  Suppression FORCÉE de idDispositif_1...');
    try {
      await collection.dropIndex('idDispositif_1');
      console.log('✅ Index supprimé');
    } catch (err) {
      if (err.code === 27) {
        console.log('⚠️  Index déjà inexistant');
      } else {
        throw err;
      }
    }
    
    // 3. Attendre 2 secondes (important!)
    console.log('\n⏳ Attente 2 secondes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Créer le NOUVEL index avec sparse
    console.log('🔨 Création du nouvel index SPARSE...');
    await collection.createIndex(
      { idDispositif: 1 },
      {
        name: 'idDispositif_1',
        unique: true,
        sparse: true  // ← LE PLUS IMPORTANT !
      }
    );
    console.log('✅ Nouvel index créé avec sparse:true');
    
    // 5. Vérifier le résultat
    console.log('\n📋 Index APRÈS recréation:');
    const newIndexes = await collection.indexes();
    const idDispositifIndex = newIndexes.find(idx => idx.name === 'idDispositif_1');
    
    if (idDispositifIndex) {
      console.log('\n✅ INDEX TROUVÉ:');
      console.log('   Name:', idDispositifIndex.name);
      console.log('   Key:', JSON.stringify(idDispositifIndex.key));
      console.log('   Unique:', idDispositifIndex.unique ? '✅ OUI' : '❌ NON');
      console.log('   Sparse:', idDispositifIndex.sparse ? '✅ OUI' : '❌ NON');
      
      if (idDispositifIndex.unique && idDispositifIndex.sparse) {
        console.log('\n🎉🎉🎉 INDEX PARFAIT ! SPARSE ET UNIQUE ! 🎉🎉🎉');
        console.log('💡 Tu peux maintenant créer autant de médecins que tu veux !\n');
      } else {
        console.log('\n❌ PROBLÈME : Index pas correctement configuré !');
        console.log('⚠️  Essaie de supprimer l\'index manuellement dans MongoDB Atlas\n');
      }
    } else {
      console.log('\n❌ Index idDispositif_1 introuvable après création !');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ ERREUR:', err.message);
    console.error(err);
    process.exit(1);
  });
