# Guide de déploiement — Biguglia Connect

## 🚀 Déploiement en 3 étapes

### Étape 1 : Créer les tables Supabase

1. Allez sur https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg/sql/new
2. Copiez le contenu du fichier `supabase-schema.sql` 
3. Collez dans l'éditeur SQL et cliquez **"Run"**
4. ✅ Vous devriez voir "Success. No rows returned."

### Étape 2 : Configurer Supabase Auth

1. Allez dans **Settings > Auth**
2. **Site URL** : `https://biguglia-connect.vercel.app`
3. **Redirect URLs** : Ajoutez `https://biguglia-connect.vercel.app/**`
4. **Email Confirmation** : Activé (recommandé)

### Étape 3 : Déployer sur Vercel

#### Option A — Interface Vercel (recommandé)

1. Créez un compte sur https://vercel.com
2. Cliquez **"New Project"**
3. Importez depuis GitHub (connectez ce repo)
4. Configurez les variables d'environnement :

```
NEXT_PUBLIC_SUPABASE_URL = https://qmrkacrpncdkhofiqlrg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_vOLmZkB7R5pWHEsPeCcBkg_Hvy_Xc73
NEXT_PUBLIC_SITE_URL = https://biguglia-connect.vercel.app
NEXT_PUBLIC_ADMIN_EMAIL = votre@email.fr
```

5. Cliquez **"Deploy"**

#### Option B — CLI Vercel

```bash
vercel login
vercel --name biguglia-connect
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add NEXT_PUBLIC_ADMIN_EMAIL
vercel --prod
```

### Étape 4 : Créer le compte administrateur

1. Allez sur https://biguglia-connect.vercel.app/inscription
2. Créez un compte avec votre email
3. Dans Supabase SQL Editor, exécutez :

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.fr';
```

4. ✅ Vous avez maintenant accès au panel admin : `/admin`

---

## 📁 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | `sb_publishable_...` |
| `NEXT_PUBLIC_SITE_URL` | URL du site déployé | `https://biguglia-connect.vercel.app` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Email de l'admin | `admin@example.fr` |

---

## 🗄️ Configuration Storage Supabase

Dans **Storage**, créez deux buckets :

1. **photos** (public)
   - Taille max : 5 MB
   - Types : image/jpeg, image/png, image/webp

2. **documents** (privé)
   - Taille max : 10 MB  
   - Types : application/pdf, image/*

---

## ⚡ Activer le Realtime

Dans **Database > Replication**, activez ces tables :
- `messages`
- `notifications`
- `conversation_participants`

---

## 🔐 Votre compte admin

Après inscription + UPDATE SQL :
- URL admin : https://biguglia-connect.vercel.app/admin
- Fonctions : Valider les artisans, modérer le contenu, voir les stats
