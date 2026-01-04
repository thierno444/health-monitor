#!/bin/bash

FILE="src/app/features/dashboard/admin-dashboard/admin-dashboard.component.ts"

echo "🔧 Correction des doublons dans $FILE..."

# Créer une sauvegarde
cp "$FILE" "${FILE}.backup"

# La correction sera manuelle car les doublons sont complexes
echo "✅ Sauvegarde créée : ${FILE}.backup"
echo ""
echo "⚠️  Vous devez supprimer MANUELLEMENT les doublons suivants :"
echo ""
echo "1. Recherchez 'openBulkArchiveModal' - Supprimez la PREMIÈRE occurrence"
echo "2. Recherchez 'closeBulkArchiveModal' - Supprimez la PREMIÈRE occurrence"
echo "3. Recherchez 'openArchiveStatsModal' - Supprimez la PREMIÈRE occurrence"
echo "4. Recherchez 'closeArchiveStatsModal' - Supprimez la PREMIÈRE occurrence"
echo "5. Recherchez 'loadArchiveStats' - Supprimez la PREMIÈRE occurrence"
