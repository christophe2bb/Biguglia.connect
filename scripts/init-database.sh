#!/bin/bash
# ============================================================
# Script d'initialisation de la base de données Biguglia Connect
# Usage: ./scripts/init-database.sh SERVICE_ROLE_KEY
# ============================================================

SERVICE_ROLE_KEY=${1:-$SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_URL="https://qmrkacrpncdkhofiqlrg.supabase.co"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Erreur: Service Role Key manquant"
  echo "Usage: ./scripts/init-database.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

echo "🚀 Initialisation de la base de données Biguglia Connect..."
echo "📍 Projet: $SUPABASE_URL"

# Appliquer le schéma SQL via l'API REST de Supabase
apply_sql() {
  local sql="$1"
  curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$sql" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"
}

# Tester la connexion
echo "🔍 Test de connexion..."
RESPONSE=$(curl -s "$SUPABASE_URL/rest/v1/profiles?select=count&limit=0" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY")

if echo "$RESPONSE" | grep -q "PGRST205"; then
  echo "📊 Tables non trouvées, application du schéma..."
  
  # Lire et appliquer le schéma
  SQL_SCHEMA=$(cat "$(dirname "$0")/../supabase-schema.sql")
  
  # Utiliser psql si disponible
  if command -v psql &> /dev/null; then
    echo "📦 Utilisation de psql..."
    psql "$SUPABASE_DB_URL" -f "$(dirname "$0")/../supabase-schema.sql"
  else
    echo "⚠️  psql non disponible. Veuillez appliquer le schéma manuellement."
    echo "👉 https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg/sql/new"
  fi
else
  echo "✅ Base de données déjà configurée!"
fi

# Créer les buckets Storage
echo "📁 Configuration du Storage..."
curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "photos", "name": "photos", "public": true, "file_size_limit": 5242880, "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]}' 2>/dev/null

curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "documents", "name": "documents", "public": false, "file_size_limit": 10485760}' 2>/dev/null

echo "✅ Configuration terminée!"
echo ""
echo "📧 Étape suivante: Configurer l'email admin"
echo "   1. Inscrivez-vous sur: https://biguglia-connect.vercel.app/inscription"
echo "   2. Utilisez l'email: admin@biguglia-connect.fr"
echo "   3. Dans Supabase SQL Editor, exécutez:"
echo "      UPDATE profiles SET role = 'admin' WHERE email = 'admin@biguglia-connect.fr';"
