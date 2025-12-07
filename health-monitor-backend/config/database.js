const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    
    // Version moderne sans options dépréciées
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB connecté !');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.name}\n`);
    
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    console.error('💡 Vérifiez :');
    console.error('   - Le username/password dans .env');
    console.error('   - L\'adresse IP autorisée sur MongoDB Atlas');
    console.error('   - La connexion internet\n');
    process.exit(1);
  }
};

module.exports = connectDB;