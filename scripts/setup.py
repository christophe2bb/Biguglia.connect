#!/usr/bin/env python3
"""
Script de configuration automatique de Biguglia Connect
Usage: python3 scripts/setup.py --service-key=eyJ... [--admin-email=admin@...] [--admin-password=...]
"""

import sys
import os
import json
import urllib.request
import urllib.error
import argparse

SUPABASE_URL = "https://qmrkacrpncdkhofiqlrg.supabase.co"
PROJECT_ID = "qmrkacrpncdkhofiqlrg"
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), '..', 'supabase-schema.sql')


def api_request(url, method='GET', headers=None, data=None):
    """Effectuer une requête API"""
    req = urllib.request.Request(url, method=method)
    if headers:
        for key, value in headers.items():
            req.add_header(key, value)
    if data:
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            req.add_header('Content-Type', 'application/json')
        elif isinstance(data, str):
            data = data.encode()
    
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, {'error': str(e)}


def test_connection(service_key):
    """Tester la connexion Supabase"""
    print("🔍 Test de connexion Supabase...")
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    status, response = api_request(f"{SUPABASE_URL}/rest/v1/", headers=headers)
    return status not in [0, 401, 403]


def tables_exist(service_key):
    """Vérifier si les tables existent"""
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    status, response = api_request(
        f"{SUPABASE_URL}/rest/v1/profiles?select=count&limit=0", 
        headers=headers
    )
    return status == 200


def create_storage_buckets(service_key):
    """Créer les buckets de stockage"""
    print("📁 Création des buckets Storage...")
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    buckets = [
        {
            "id": "photos",
            "name": "photos",
            "public": True,
            "file_size_limit": 5242880,
            "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"]
        },
        {
            "id": "documents",
            "name": "documents",
            "public": False,
            "file_size_limit": 10485760,
            "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png"]
        }
    ]
    
    for bucket in buckets:
        status, response = api_request(
            f"{SUPABASE_URL}/storage/v1/bucket",
            method='POST',
            headers=headers,
            data=bucket
        )
        if status in [200, 201]:
            print(f"  ✅ Bucket '{bucket['id']}' créé")
        elif status == 409:
            print(f"  ℹ️  Bucket '{bucket['id']}' existe déjà")
        else:
            print(f"  ⚠️  Bucket '{bucket['id']}': {response}")


def create_admin_user(service_key, admin_email, admin_password):
    """Créer le compte administrateur"""
    print(f"👤 Création du compte admin: {admin_email}...")
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    # Créer l'utilisateur auth
    user_data = {
        "email": admin_email,
        "password": admin_password,
        "email_confirm": True,
        "user_metadata": {
            "full_name": "Administrateur Biguglia Connect",
            "role": "admin",
            "legal_consent": True
        }
    }
    
    status, response = api_request(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        method='POST',
        headers=headers,
        data=user_data
    )
    
    if status in [200, 201]:
        user_id = response.get('id')
        print(f"  ✅ Utilisateur créé: {user_id}")
        
        # Mettre à jour le rôle en admin
        update_data = [{"role": "admin"}]
        status2, response2 = api_request(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            method='PATCH',
            headers={**headers, 'Prefer': 'return=minimal'},
            data={"role": "admin"}
        )
        if status2 in [200, 204]:
            print(f"  ✅ Rôle admin assigné")
        else:
            print(f"  ⚠️  Mise à jour du rôle: {response2}")
    elif status == 422 and 'already been registered' in str(response):
        print(f"  ℹ️  L'utilisateur {admin_email} existe déjà")
        # Mettre à jour son rôle
        headers_rest = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        status3, response3 = api_request(
            f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{admin_email}",
            method='PATCH',
            headers=headers_rest,
            data={"role": "admin"}
        )
        if status3 in [200, 204]:
            print(f"  ✅ Rôle admin assigné à l'utilisateur existant")
    else:
        print(f"  ❌ Erreur création admin: {status} - {response}")


def configure_auth_settings(service_key):
    """Configurer les paramètres d'authentification"""
    print("⚙️  Configuration Auth...")
    # Les paramètres Auth se configurent via le dashboard Supabase
    # ou via l'API Management (nécessite un personal access token)
    print("  ℹ️  Paramètres Auth à configurer dans le dashboard Supabase:")
    print("     Settings > Auth > Email Settings > Enable email confirmation: OUI")
    print("     Settings > Auth > Site URL: https://biguglia-connect.vercel.app")
    print("     Settings > Auth > Redirect URLs: https://biguglia-connect.vercel.app/**")


def main():
    parser = argparse.ArgumentParser(description='Configure Biguglia Connect')
    parser.add_argument('--service-key', required=True, help='Supabase Service Role Key')
    parser.add_argument('--admin-email', default='christophe@biguglia-connect.fr', 
                       help='Email administrateur')
    parser.add_argument('--admin-password', default=None, help='Mot de passe admin (min 8 caractères)')
    parser.add_argument('--skip-admin', action='store_true', help='Ne pas créer le compte admin')
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌟 BIGUGLIA CONNECT — Configuration automatique")
    print("=" * 60)
    print(f"📍 Projet: {SUPABASE_URL}")
    print()
    
    service_key = args.service_key
    
    # Test connexion
    if not test_connection(service_key):
        print("❌ Connexion impossible. Vérifiez votre Service Role Key.")
        sys.exit(1)
    print("✅ Connexion Supabase OK!")
    print()
    
    # Vérifier si les tables existent
    if tables_exist(service_key):
        print("✅ Tables déjà créées!")
    else:
        print("📊 Tables non trouvées.")
        print()
        print("⚠️  Action requise:")
        print("   1. Allez sur: https://supabase.com/dashboard/project/qmrkacrpncdkhofiqlrg/sql/new")
        print("   2. Copiez-collez le contenu de: supabase-schema.sql")
        print("   3. Cliquez 'Run'")
        print("   4. Relancez ce script")
        print()
    
    # Créer les buckets Storage
    create_storage_buckets(service_key)
    print()
    
    # Créer le compte admin
    if not args.skip_admin and tables_exist(service_key):
        if args.admin_password:
            create_admin_user(service_key, args.admin_email, args.admin_password)
        else:
            print("👤 Pour créer le compte admin, ajoutez: --admin-password=VotreMotDePasse")
        print()
    
    # Instructions Auth
    configure_auth_settings(service_key)
    print()
    
    print("=" * 60)
    print("✅ Configuration terminée!")
    print()
    print("📋 Prochaines étapes:")
    print("   1. Déployez sur Vercel: vercel deploy --prod")
    print("   2. Configurez les variables d'environnement dans Vercel")
    print("   3. Accédez à https://biguglia-connect.vercel.app")
    print("   4. Connectez-vous avec votre compte admin")
    print("=" * 60)


if __name__ == '__main__':
    main()
