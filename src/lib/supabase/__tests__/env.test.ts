/**
 * Tests unitaires — src/lib/supabase/env.ts
 *
 * Couverture :
 *
 *  cleanEnv()
 *    - Variable absente (undefined) → Error avec nom de variable
 *    - Variable vide ('') → Error
 *    - Variable whitespace only → Error
 *    - Variable avec \n final → nettoyée + console.warn
 *    - Variable avec espaces en tête/fin → nettoyée + console.warn
 *    - Variable propre → retournée telle quelle, pas de warn
 *    - Option mustStartWith : valeur invalide → Error avec contexte
 *    - Option minLength : valeur trop courte → Error
 *    - Option context : préfixe personnalisé dans le message d'erreur
 *    - Combinaison mustStartWith + minLength
 *
 *  getSupabaseEnv()
 *    - Env valide → retourne { url, anonKey }
 *    - URL manquante → Error mentionnant NEXT_PUBLIC_SUPABASE_URL
 *    - Anon key manquante → Error mentionnant NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    - URL sans https:// → Error (mustStartWith)
 *    - Anon key trop courte → Error (minLength)
 *    - URL avec \n → nettoyée sans erreur
 *
 *  getSupabaseAdminEnv()
 *    - Env valide → retourne { url, serviceRoleKey }
 *    - Service role key manquante → Error mentionnant SUPABASE_SERVICE_ROLE_KEY
 *    - URL invalide → Error
 *
 *  getSupabaseEnvSafe()
 *    - Env valide → retourne { url, anonKey } nettoyés
 *    - Env manquante → retourne { url: '', anonKey: '' } + console.error
 *    - Env avec \n → nettoyée (trim)
 *    - Ne lève JAMAIS d'exception
 *
 *  getSupabaseProjectRef()
 *    - URL Cloud Supabase valide → retourne le project ref (segment avant .supabase.co)
 *    - URL self-hosted (domaine custom) → retourne le hostname complet
 *    - Sans argument → lit process.env.NEXT_PUBLIC_SUPABASE_URL
 *    - URL vide → retourne ''
 *    - URL malformée → retourne '' + console.warn (pas de throw)
 *    - URL avec chemin/query → seul le hostname est utilisé
 *    - Cohérence : le nom de cookie sb-<ref>-auth-token est bien formé
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cleanEnv,
  getSupabaseEnv,
  getSupabaseAdminEnv,
  getSupabaseEnvSafe,
  getSupabaseProjectRef,
  validateSupabaseClientEnv,
  assertSupabaseClientEnv,
} from '../env';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_URL     = 'https://qmrkacrpncdkhofiqlrg.supabase.co';
const VALID_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbm9uS2V5Ijoi'; // pragma: allowlist secret  gitleaks:allow
const VALID_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlUm9sZSI6'; // pragma: allowlist secret  gitleaks:allow

/** Sauvegarde et restaure les variables d'environnement entre les tests */
let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:     process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL      = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY     = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  vi.restoreAllMocks();
});

// ─── cleanEnv() ───────────────────────────────────────────────────────────────

describe('cleanEnv()', () => {

  describe('validation de présence', () => {
    it('lève une Error si la variable est undefined', () => {
      expect(() => cleanEnv(undefined, 'MY_VAR')).toThrow('MY_VAR');
    });

    it('lève une Error si la variable est une chaîne vide', () => {
      expect(() => cleanEnv('', 'MY_VAR')).toThrow('MY_VAR');
    });

    it('lève une Error si la variable ne contient que des espaces', () => {
      expect(() => cleanEnv('   ', 'MY_VAR')).toThrow('MY_VAR');
    });

    it('lève une Error si la variable ne contient que des sauts de ligne', () => {
      expect(() => cleanEnv('\n\n', 'MY_VAR')).toThrow('MY_VAR');
    });

    it('le message d\'erreur mentionne le nom de la variable', () => {
      expect(() => cleanEnv(undefined, 'NEXT_PUBLIC_SUPABASE_URL'))
        .toThrow('NEXT_PUBLIC_SUPABASE_URL');
    });
  });

  describe('nettoyage de valeur', () => {
    it('variable propre → retournée telle quelle, pas de console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = cleanEnv('valeur_propre', 'MY_VAR');
      expect(result).toBe('valeur_propre');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('variable avec \\n final → trimée + console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = cleanEnv('valeur_propre\n', 'MY_VAR');
      expect(result).toBe('valeur_propre');
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toContain('MY_VAR');
    });

    it('variable avec espaces en tête → trimée + console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = cleanEnv('  valeur_propre', 'MY_VAR');
      expect(result).toBe('valeur_propre');
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('variable avec \\r\\n (Windows) → trimée + console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = cleanEnv('valeur\r\n', 'MY_VAR');
      expect(result).toBe('valeur');
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('variable avec espaces en tête ET en fin → trimée des deux côtés', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = cleanEnv('  valeur  ', 'MY_VAR');
      expect(result).toBe('valeur');
      expect(warnSpy).toHaveBeenCalledOnce();
    });
  });

  describe('option mustStartWith', () => {
    it('valeur commençant par le préfixe → OK', () => {
      const result = cleanEnv('https://supabase.co', 'MY_URL', { mustStartWith: 'https://' });
      expect(result).toBe('https://supabase.co');
    });

    it('valeur sans le préfixe → Error mentionnant le préfixe attendu', () => {
      expect(() =>
        cleanEnv('http://supabase.co', 'MY_URL', { mustStartWith: 'https://' })
      ).toThrow('https://');
    });

    it('valeur "localhost" sans https:// → Error', () => {
      expect(() =>
        cleanEnv('localhost:54321', 'MY_URL', { mustStartWith: 'https://' })
      ).toThrow();
    });
  });

  describe('option minLength', () => {
    it('valeur ≥ minLength → OK', () => {
      const result = cleanEnv('abcdefghij', 'MY_KEY', { minLength: 10 });
      expect(result).toBe('abcdefghij');
    });

    it('valeur exactement minLength → OK', () => {
      const result = cleanEnv('1234567890', 'MY_KEY', { minLength: 10 });
      expect(result).toBe('1234567890');
    });

    it('valeur < minLength → Error mentionnant la longueur', () => {
      expect(() =>
        cleanEnv('court', 'MY_KEY', { minLength: 20 })
      ).toThrow('MY_KEY');
    });
  });

  describe('option context', () => {
    it('contexte par défaut → "[Supabase]" dans le message', () => {
      let msg = '';
      try { cleanEnv(undefined, 'MY_VAR'); } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('[Supabase]');
    });

    it('contexte personnalisé → présent dans le message d\'erreur', () => {
      let msg = '';
      try {
        cleanEnv(undefined, 'MY_VAR', { context: '[MonContexte]' });
      } catch (e) { msg = (e as Error).message; }
      expect(msg).toContain('[MonContexte]');
    });
  });

  describe('combinaisons', () => {
    it('mustStartWith + minLength valides → OK', () => {
      const val = 'https://supabase.co/valid';
      const result = cleanEnv(val, 'MY_URL', {
        mustStartWith: 'https://',
        minLength: 10,
      });
      expect(result).toBe(val);
    });

    it('mustStartWith OK mais minLength KO → Error', () => {
      expect(() =>
        cleanEnv('https://', 'MY_URL', { mustStartWith: 'https://', minLength: 30 })
      ).toThrow();
    });

    it('mustStartWith KO → Error avant même de vérifier minLength', () => {
      expect(() =>
        cleanEnv('ftp://host', 'MY_URL', { mustStartWith: 'https://', minLength: 5 })
      ).toThrow('https://');
    });
  });
});

// ─── getSupabaseEnv() ─────────────────────────────────────────────────────────

describe('getSupabaseEnv()', () => {
  it('env valide → retourne { url, anonKey } corrects', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getSupabaseEnv();
    expect(result.url).toBe(VALID_URL);
    expect(result.anonKey).toBe(VALID_ANON);
  });

  it('URL manquante → Error mentionnant NEXT_PUBLIC_SUPABASE_URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    expect(() => getSupabaseEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('Anon key manquante → Error mentionnant NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getSupabaseEnv()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('URL sans "https://" → Error (mustStartWith)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = 'http://supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    expect(() => getSupabaseEnv()).toThrow('https://');
  });

  it('URL commençant par "https://" → OK', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => getSupabaseEnv()).not.toThrow();
  });

  it('Anon key trop courte (< 20 chars) → Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'courte';

    expect(() => getSupabaseEnv()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('URL avec \\n final → nettoyée, pas d\'Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL + '\n';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getSupabaseEnv();
    expect(result.url).toBe(VALID_URL);
    expect(result.url).not.toContain('\n');
  });

  it('Anon key avec espaces → nettoyée, pas d\'Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  ' + VALID_ANON + '  ';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getSupabaseEnv();
    expect(result.anonKey).toBe(VALID_ANON);
  });

  it('URL vide → Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    expect(() => getSupabaseEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });
});

// ─── getSupabaseAdminEnv() ────────────────────────────────────────────────────

describe('getSupabaseAdminEnv()', () => {
  it('env valide → retourne { url, serviceRoleKey } corrects', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL  = VALID_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getSupabaseAdminEnv();
    expect(result.url).toBe(VALID_URL);
    expect(result.serviceRoleKey).toBe(VALID_SERVICE);
  });

  it('service role key manquante → Error mentionnant SUPABASE_SERVICE_ROLE_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL  = VALID_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseAdminEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('service role key vide → Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL  = VALID_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';

    expect(() => getSupabaseAdminEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('URL manquante → Error mentionnant NEXT_PUBLIC_SUPABASE_URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE;

    expect(() => getSupabaseAdminEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('service role key avec \\n → nettoyée, pas d\'Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL  = VALID_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE + '\n';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getSupabaseAdminEnv();
    expect(result.serviceRoleKey).toBe(VALID_SERVICE);
    expect(result.serviceRoleKey).not.toContain('\n');
  });

  it('URL sans https:// → Error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL  = 'postgres://host/db';
    process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE;

    expect(() => getSupabaseAdminEnv()).toThrow('https://');
  });

  it('context "[Supabase/admin]" dans le message d\'erreur', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE;

    let msg = '';
    try { getSupabaseAdminEnv(); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain('[Supabase/admin]');
  });
});

// ─── getSupabaseEnvSafe() ─────────────────────────────────────────────────────

describe('getSupabaseEnvSafe()', () => {
  it('env valide → retourne { url, anonKey } nettoyés', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = getSupabaseEnvSafe();
    expect(result.url).toBe(VALID_URL);
    expect(result.anonKey).toBe(VALID_ANON);
  });

  it('URL manquante → retourne url="", JAMAIS d\'exception', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => getSupabaseEnvSafe()).not.toThrow();
    const result = getSupabaseEnvSafe();
    expect(result.url).toBe('');
  });

  it('Anon key manquante → retourne anonKey="", JAMAIS d\'exception', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => getSupabaseEnvSafe()).not.toThrow();
    const result = getSupabaseEnvSafe();
    expect(result.anonKey).toBe('');
  });

  it('les deux manquantes → retourne { url:"", anonKey:"" } + console.error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = getSupabaseEnvSafe();
    expect(result.url).toBe('');
    expect(result.anonKey).toBe('');
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('URL avec \\n → nettoyée (trim)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL + '\n';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = getSupabaseEnvSafe();
    expect(result.url).toBe(VALID_URL);
    expect(result.url).not.toContain('\n');
  });

  it('Anon key avec \\r\\n → nettoyée (trim)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON + '\r\n';

    const result = getSupabaseEnvSafe();
    expect(result.anonKey).toBe(VALID_ANON);
    expect(result.anonKey).not.toContain('\r');
  });

  it('ne lève JAMAIS d\'exception (même avec des valeurs bizarres)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '\n\n\n';
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => getSupabaseEnvSafe()).not.toThrow();
  });

  it('env valide → pas de console.error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    getSupabaseEnvSafe();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('structure de retour correcte dans tous les cas', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = getSupabaseEnvSafe();
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('anonKey');
    expect(typeof result.url).toBe('string');
    expect(typeof result.anonKey).toBe('string');
  });
});

// ─── validateSupabaseClientEnv() ─────────────────────────────────────────────

describe('validateSupabaseClientEnv()', () => {
  it('env valide → ok=true, errors=[], env non-null', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.env).not.toBeNull();
    expect(result.env?.url).toBe(VALID_URL);
    expect(result.env?.anonKey).toBe(VALID_ANON);
  });

  it('URL manquante → ok=false, errors contient un message sur NEXT_PUBLIC_SUPABASE_URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(false);
    expect(result.env).toBeNull();
    expect(result.errors.some(e => e.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true);
  });

  it('Anon key manquante → ok=false, errors contient un message sur NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(false);
    expect(result.env).toBeNull();
    expect(result.errors.some(e => e.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))).toBe(true);
  });

  it('les deux manquantes → ok=false, 2 erreurs collectées', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.env).toBeNull();
  });

  it('URL sans https:// → ok=false, erreur sur le préfixe', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = 'http://supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('https://'))).toBe(true);
  });

  it('Anon key trop courte → ok=false, erreur sur la longueur', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'trop_court';

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))).toBe(true);
  });

  it('URL avec \\n → warnings non vide, ok=true, url nettoyée', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL + '\n';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.env?.url).toBe(VALID_URL);
    expect(result.env?.url).not.toContain('\n');
  });

  it('Anon key avec espaces → warnings non vide, ok=true, key nettoyée', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  ' + VALID_ANON + '  ';

    const result = validateSupabaseClientEnv();
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.env?.anonKey).toBe(VALID_ANON);
  });

  it('env propre → warnings vide', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = validateSupabaseClientEnv();
    expect(result.warnings).toHaveLength(0);
  });

  it('ne lève JAMAIS d\'exception (collect-all errors)', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => validateSupabaseClientEnv()).not.toThrow();
  });

  it('structure de retour : ok, errors, warnings, env', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;

    const result = validateSupabaseClientEnv();
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('env');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─── assertSupabaseClientEnv() ────────────────────────────────────────────────

describe('assertSupabaseClientEnv()', () => {
  it('env valide → retourne { url, anonKey } nettoyés sans exception', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const env = assertSupabaseClientEnv();
    expect(env.url).toBe(VALID_URL);
    expect(env.anonKey).toBe(VALID_ANON);
  });

  it('URL manquante → lève Error mentionnant NEXT_PUBLIC_SUPABASE_URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertSupabaseClientEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('Anon key manquante → lève Error mentionnant NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertSupabaseClientEnv()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('les deux manquantes → lève Error et appelle console.error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertSupabaseClientEnv()).toThrow();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('URL avec \\n → console.warn appelé, pas d\'Error, url nettoyée', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL + '\n';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    const warnSpy  = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const env = assertSupabaseClientEnv();
    expect(env.url).toBe(VALID_URL);
    expect(env.url).not.toContain('\n');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('Anon key avec \\r\\n → console.warn appelé, key nettoyée', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON + '\r\n';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const env = assertSupabaseClientEnv();
    expect(env.anonKey).toBe(VALID_ANON);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('URL sans https:// → lève Error mentionnant https://', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = 'http://supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertSupabaseClientEnv()).toThrow('https://');
  });

  it('console.error appelé une fois exactement sur env invalide', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try { assertSupabaseClientEnv(); } catch { /* attendu */ }
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('env valide → pas de console.error, pas de console.warn', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON;
    const warnSpy  = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    assertSupabaseClientEnv();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('Anon key trop courte → lève Error (< 20 chars)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL      = VALID_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(19);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertSupabaseClientEnv()).toThrow();
  });

  it('message d\'erreur contient le nombre d\'erreurs détectées', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    let msg = '';
    try { assertSupabaseClientEnv(); } catch (e) { msg = (e as Error).message; }
    // Le message doit mentionner "2 erreur(s)" (deux variables manquantes)
    expect(msg).toMatch(/2.+erreur/i);
  });
});

// ─── getSupabaseProjectRef() ──────────────────────────────────────────────────

describe('getSupabaseProjectRef()', () => {

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Supabase Cloud ──────────────────────────────────────────────────────────

  it('URL Cloud standard → retourne le project ref', () => {
    expect(getSupabaseProjectRef('https://qmrkacrpncdkhofiqlrg.supabase.co'))
      .toBe('qmrkacrpncdkhofiqlrg');
  });

  it('URL Cloud avec un ref différent → retourne le bon ref', () => {
    expect(getSupabaseProjectRef('https://abcdefghijklmnop.supabase.co'))
      .toBe('abcdefghijklmnop');
  });

  it('URL Cloud avec trailing slash → ref correct', () => {
    expect(getSupabaseProjectRef('https://qmrkacrpncdkhofiqlrg.supabase.co/'))
      .toBe('qmrkacrpncdkhofiqlrg');
  });

  it('URL Cloud avec chemin et query string → seul le hostname est utilisé', () => {
    expect(getSupabaseProjectRef('https://qmrkacrpncdkhofiqlrg.supabase.co/rest/v1?apikey=xxx'))
      .toBe('qmrkacrpncdkhofiqlrg');
  });

  // ── Self-hosted ─────────────────────────────────────────────────────────────

  it('URL self-hosted (domaine custom sans .supabase.co) → hostname complet', () => {
    expect(getSupabaseProjectRef('https://supabase.mon-domaine.fr'))
      .toBe('supabase.mon-domaine.fr');
  });

  it('URL self-hosted avec sous-domaine → hostname complet retourné', () => {
    expect(getSupabaseProjectRef('https://db.staging.exemple.com'))
      .toBe('db.staging.exemple.com');
  });

  // ── Lecture depuis process.env ──────────────────────────────────────────────

  it('sans argument → lit NEXT_PUBLIC_SUPABASE_URL depuis process.env', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qmrkacrpncdkhofiqlrg.supabase.co';
    expect(getSupabaseProjectRef()).toBe('qmrkacrpncdkhofiqlrg');
  });

  it('NEXT_PUBLIC_SUPABASE_URL non définie → retourne \'\'', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(getSupabaseProjectRef()).toBe('');
  });

  // ── Cas limites ─────────────────────────────────────────────────────────────

  it("URL vide ''  → retourne '' (sans throw)", () => {
    expect(getSupabaseProjectRef('')).toBe('');
  });

  it("URL malformée → retourne '' + console.warn", () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getSupabaseProjectRef('pas-une-url-valide')).toBe('');
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("URL malformée ne lève PAS d'exception", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => getSupabaseProjectRef(':::broken:::')).not.toThrow();
  });

  // ── Cohérence avec le nom de cookie ────────────────────────────────────────

  it('nom de cookie construit depuis le ref = sb-<ref>-auth-token', () => {
    const ref        = getSupabaseProjectRef('https://qmrkacrpncdkhofiqlrg.supabase.co');
    const cookieName = `sb-${ref}-auth-token`;
    expect(cookieName).toBe('sb-qmrkacrpncdkhofiqlrg-auth-token');
  });

  it('ref self-hosted → cookie name inclut le hostname complet', () => {
    const ref        = getSupabaseProjectRef('https://supabase.mon-domaine.fr');
    const cookieName = `sb-${ref}-auth-token`;
    expect(cookieName).toBe('sb-supabase.mon-domaine.fr-auth-token');
  });
});
