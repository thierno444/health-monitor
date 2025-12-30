const fs = require('fs');
const path = require('path');

console.log('🔄 Remplacement des URLs localhost par Render...');

const distPath = path.join(__dirname, 'dist');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(/http:\/\/localhost:5000/g, 'https://health-monitor-api-d323.onrender.com');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  let replacedCount = 0;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      replacedCount += walkDir(filePath);
    } else if (file.endsWith('.js')) {
      if (replaceInFile(filePath)) {
        replacedCount++;
      }
    }
  });
  
  return replacedCount;
}

try {
  const count = walkDir(distPath);
  console.log(`✅ Remplacement réussi dans ${count} fichier(s) !`);
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}
