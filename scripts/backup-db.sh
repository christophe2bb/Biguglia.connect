#!/bin/bash
# ============================================================
# Backup manuel de la base de données Biguglia Connect
# Plan Supabase FREE — pas de backup automatique inclus
#
# Usage :
#   ./scripts/backup-db.sh
#   ./scripts/backup-db.sh --dir /chemin/vers/backups
#   ./scripts/backup-db.sh --upload-gdrive   (nécessite rclone)
#
# Prérequis :
#   - pg_dump installé  : sudo apt install postgresql-client
#   - Variables d'env dans .env.local ou exportées :
#       SUPABASE_DB_PASSWORD   (Dashboard → Settings → Database → Database password)
#       SUPABASE_PROJECT_REF   (= qmrkacrpncdkhofiqlrg)
#
# Fréquence recommandée (plan Free) :
#   - Avant chaque déploiement en production
#   - Avant chaque migration SQL
#   - Au minimum 1×/semaine via cron
#
# Cron exemple (chaque dimanche à 02h00) :
#   0 2 * * 0 /chemin/vers/biguglia/scripts/backup-db.sh >> /var/log/biguglia-backup.log 2>&1
# ============================================================

set -euo pipefail

# ── Couleurs ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Configuration ──────────────────────────────────────────
PROJECT_REF="${SUPABASE_PROJECT_REF:-qmrkacrpncdkhofiqlrg}"
DB_REGION="aws-0-eu-west-3"   # région du projet Supabase (voir Dashboard → Settings → Database)
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_HOST_POOLER="${PROJECT_REF}.${DB_REGION}.pooler.supabase.com"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

BACKUP_DIR="${1:-./backups/db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/biguglia_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

RETENTION_DAYS=30   # supprimer les backups > 30 jours

# ── Charger .env.local si présent ─────────────────────────
if [ -f ".env.local" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.local | grep 'SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF' | xargs) 2>/dev/null || true
fi

# ── Parsing des arguments ──────────────────────────────────
UPLOAD_GDRIVE=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --dir)        BACKUP_DIR="$2"; shift 2 ;;
    --upload-gdrive) UPLOAD_GDRIVE=true; shift ;;
    *) shift ;;
  esac
done

# ── Vérifications ──────────────────────────────────────────
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Backup DB Biguglia Connect — Plan Free         ${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo ""

# pg_dump doit être installé
if ! command -v pg_dump &> /dev/null; then
  echo -e "${RED}❌ pg_dump introuvable.${NC}"
  echo "   Installer avec : sudo apt install postgresql-client"
  echo "   Ou sur macOS   : brew install libpq && brew link --force libpq"
  exit 1
fi

# Mot de passe DB obligatoire
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo -e "${RED}❌ SUPABASE_DB_PASSWORD non défini.${NC}"
  echo ""
  echo "   Trouver le mot de passe :"
  echo "   → https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
  echo "   → Section 'Database password'"
  echo ""
  echo "   Puis exporter :"
  echo "   export SUPABASE_DB_PASSWORD='votre_mot_de_passe'"
  echo "   ./scripts/backup-db.sh"
  exit 1
fi

# ── Créer le dossier de backup ─────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── Lancer le backup ───────────────────────────────────────
echo -e "${YELLOW}⏳ Connexion à ${DB_HOST}...${NC}"
echo -e "   Fichier cible : ${BACKUP_FILE_GZ}"
echo ""

export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

# Tentative 1 : connexion directe au host DB
if pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-acl \
    --no-owner \
    --no-privileges \
    --format=plain \
    --verbose 2>/tmp/pgdump_stderr.txt | gzip > "${BACKUP_FILE_GZ}"; then

  BACKUP_SIZE=$(du -sh "${BACKUP_FILE_GZ}" | cut -f1)
  echo ""
  echo -e "${GREEN}✅ Backup réussi !${NC}"
  echo -e "   Fichier  : ${BACKUP_FILE_GZ}"
  echo -e "   Taille   : ${BACKUP_SIZE}"
  echo -e "   Timestamp: ${TIMESTAMP}"

else
  # Tentative 2 : via le pooler (connexion de secours)
  echo -e "${YELLOW}⚠️  Connexion directe échouée, tentative via pooler...${NC}"
  unset PGPASSWORD
  export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

  if pg_dump \
      "postgresql://${DB_USER}.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@${DB_HOST_POOLER}:6543/${DB_NAME}" \
      --no-acl \
      --no-owner \
      --no-privileges \
      --format=plain \
      --verbose 2>/tmp/pgdump_stderr.txt | gzip > "${BACKUP_FILE_GZ}"; then

    BACKUP_SIZE=$(du -sh "${BACKUP_FILE_GZ}" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Backup réussi (via pooler) !${NC}"
    echo -e "   Fichier  : ${BACKUP_FILE_GZ}"
    echo -e "   Taille   : ${BACKUP_SIZE}"

  else
    echo ""
    echo -e "${RED}❌ Backup échoué.${NC}"
    echo "   Logs pg_dump :"
    cat /tmp/pgdump_stderr.txt
    rm -f "${BACKUP_FILE_GZ}"
    exit 1
  fi
fi

unset PGPASSWORD

# ── Vérification minimale du backup ───────────────────────
LINES=$(zcat "${BACKUP_FILE_GZ}" | wc -l)
if [ "${LINES}" -lt 50 ]; then
  echo -e "${RED}⚠️  Le backup semble vide ou trop petit (${LINES} lignes).${NC}"
  echo "   Vérifier les droits et la connexion."
  exit 1
fi
echo -e "   Lignes SQL : ~${LINES}"

# ── Upload Google Drive / rclone (optionnel) ───────────────
if [ "${UPLOAD_GDRIVE}" = true ]; then
  if command -v rclone &> /dev/null; then
    echo ""
    echo -e "${YELLOW}⏳ Upload vers Google Drive (rclone gdrive:biguglia-backups/)...${NC}"
    rclone copy "${BACKUP_FILE_GZ}" "gdrive:biguglia-backups/" --progress
    echo -e "${GREEN}✅ Backup uploadé sur Google Drive.${NC}"
  else
    echo -e "${YELLOW}⚠️  rclone non installé — upload Google Drive ignoré.${NC}"
    echo "   Installer : https://rclone.org/install/"
    echo "   Configurer: rclone config  (choisir Google Drive)"
  fi
fi

# ── Nettoyage des anciens backups ──────────────────────────
echo ""
OLD_COUNT=$(find "${BACKUP_DIR}" -name "biguglia_backup_*.sql.gz" -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)
if [ "${OLD_COUNT}" -gt 0 ]; then
  echo -e "${YELLOW}🧹 Suppression de ${OLD_COUNT} backup(s) de plus de ${RETENTION_DAYS} jours...${NC}"
  find "${BACKUP_DIR}" -name "biguglia_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
fi

# ── Liste des backups disponibles ─────────────────────────
echo ""
echo -e "${BLUE}📦 Backups disponibles dans ${BACKUP_DIR} :${NC}"
ls -lh "${BACKUP_DIR}"/biguglia_backup_*.sql.gz 2>/dev/null | awk '{print "   " $NF " (" $5 ")"}'

# ── Instructions de restauration ──────────────────────────
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 Pour restaurer ce backup :${NC}"
echo ""
echo "   # 1. Décompresser"
echo "   gunzip -k ${BACKUP_FILE_GZ}"
echo ""
echo "   # 2. Restaurer (⚠️ ÉCRASE la base cible)"
echo "   export PGPASSWORD='votre_mot_de_passe'"
echo "   psql \\"
echo "     --host=${DB_HOST} \\"
echo "     --port=${DB_PORT} \\"
echo "     --username=${DB_USER} \\"
echo "     --dbname=${DB_NAME} \\"
echo "     -f ${BACKUP_FILE}"
echo ""
echo "   # 3. Vérifier"
echo "   curl https://biguglia-connect.vercel.app/api/health"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
