#!/bin/bash

echo "🔄 Remplacement des URLs localhost par Render..."

# Compter combien de fichiers contiennent localhost
BEFORE=$(grep -r "localhost:5000" dist/ 2>/dev/null | wc -l)
echo "📊 Avant: $BEFORE occurrences de localhost:5000"

# Remplacer dans tous les fichiers JS
find dist/ -type f -name "*.js" -exec sed -i 's|http://localhost:5000|https://health-monitor-api-d323.onrender.com|g' {} +

# Vérifier après
AFTER=$(grep -r "localhost:5000" dist/ 2>/dev/null | wc -l)
echo "📊 Après: $AFTER occurrences de localhost:5000"

if [ "$AFTER" -eq 0 ]; then
  echo "✅ Remplacement réussi ! Aucun localhost:5000 restant."
  exit 0
else
  echo "⚠️  Il reste encore $AFTER occurrences de localhost:5000"
  exit 1
fi
