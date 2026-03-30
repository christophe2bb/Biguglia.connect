'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, AlertCircle, Copy, Check, Database, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── SQL de migration thèmes (copie fidèle de migration_themes.sql) ────────────
const MIGRATION_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Migration thèmes locaux
-- Promenades · Collectionneurs · Événements
-- ============================================================

-- THÈME 1 — PROMENADES
CREATE TABLE IF NOT EXISTS promenades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT NOT NULL,
  distance_km NUMERIC(5,2), duration_min INT,
  difficulty TEXT NOT NULL DEFAULT 'facile' CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  type TEXT NOT NULL DEFAULT 'balade' CHECK (type IN ('balade', 'randonnee', 'velo', 'plage', 'nature')),
  tags TEXT[] DEFAULT '{}', start_point TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promenade_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promenade_id UUID REFERENCES promenades(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL, display_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promenade_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promenade_id UUID REFERENCES promenades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(promenade_id, user_id)
);
CREATE TABLE IF NOT EXISTS group_outings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  promenade_id UUID REFERENCES promenades(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT,
  outing_date DATE NOT NULL, outing_time TEXT NOT NULL DEFAULT '09:00',
  max_participants INT NOT NULL DEFAULT 10, meeting_point TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outing_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(outing_id, user_id)
);
ALTER TABLE promenades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenades' AND policyname='promenades_select') THEN
    CREATE POLICY "promenades_select" ON promenades FOR SELECT USING (status = 'active');
    CREATE POLICY "promenades_insert" ON promenades FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "promenades_update" ON promenades FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "promenades_delete" ON promenades FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE promenade_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenade_photos' AND policyname='promenade_photos_select') THEN
    CREATE POLICY "promenade_photos_select" ON promenade_photos FOR SELECT USING (true);
    CREATE POLICY "promenade_photos_insert" ON promenade_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM promenades WHERE id = promenade_id AND author_id = auth.uid()));
  END IF;
END $$;
ALTER TABLE promenade_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenade_likes' AND policyname='promenade_likes_select') THEN
    CREATE POLICY "promenade_likes_select" ON promenade_likes FOR SELECT USING (true);
    CREATE POLICY "promenade_likes_insert" ON promenade_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "promenade_likes_delete" ON promenade_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
ALTER TABLE group_outings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_outings' AND policyname='group_outings_select') THEN
    CREATE POLICY "group_outings_select" ON group_outings FOR SELECT USING (true);
    CREATE POLICY "group_outings_insert" ON group_outings FOR INSERT WITH CHECK (auth.uid() = organizer_id);
    CREATE POLICY "group_outings_update" ON group_outings FOR UPDATE USING (auth.uid() = organizer_id);
  END IF;
END $$;
ALTER TABLE outing_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_participants' AND policyname='outing_participants_select') THEN
    CREATE POLICY "outing_participants_select" ON outing_participants FOR SELECT USING (true);
    CREATE POLICY "outing_participants_insert" ON outing_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "outing_participants_delete" ON outing_participants FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- THÈME 2 — COLLECTIONNEURS
CREATE TABLE IF NOT EXISTS collection_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦', color TEXT NOT NULL DEFAULT 'gray',
  display_order INT NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);
INSERT INTO collection_categories (name, slug, icon, color, display_order) VALUES
  ('Timbres & philatélie','timbres','📮','blue',1),
  ('Monnaies & numismatique','monnaies','🪙','amber',2),
  ('Vinyles & musique','vinyles','🎵','purple',3),
  ('Livres anciens','livres','📚','emerald',4),
  ('Figurines & jouets','figurines','🎮','rose',5),
  ('Cartes postales','cartes','🗺️','sky',6),
  ('Art & tableaux','art','🎨','pink',7),
  ('Vintage & mode','vintage','👗','orange',8),
  ('Minéraux & fossiles','mineraux','🪨','teal',9),
  ('Miniatures & maquettes','miniatures','🏗️','indigo',10),
  ('Automobilia','automobilia','🚗','red',11),
  ('Nature & botanique','nature-col','🌿','green',12)
ON CONFLICT (slug) DO NOTHING;
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES collection_categories(id),
  title TEXT NOT NULL, description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'vente' CHECK (item_type IN ('vente','troc','don','recherche')),
  price NUMERIC(10,2),
  condition TEXT NOT NULL DEFAULT 'bon' CHECK (condition IN ('neuf','excellent','bon','passable')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','archived')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collection_item_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL, display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE collection_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_categories' AND policyname='collection_categories_select') THEN
    CREATE POLICY "collection_categories_select" ON collection_categories FOR SELECT USING (true);
    CREATE POLICY "collection_categories_insert" ON collection_categories FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "collection_categories_delete" ON collection_categories FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_items' AND policyname='collection_items_select') THEN
    CREATE POLICY "collection_items_select" ON collection_items FOR SELECT USING (status = 'active');
    CREATE POLICY "collection_items_insert" ON collection_items FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "collection_items_update" ON collection_items FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "collection_items_delete" ON collection_items FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE collection_item_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_item_photos' AND policyname='collection_item_photos_select') THEN
    CREATE POLICY "collection_item_photos_select" ON collection_item_photos FOR SELECT USING (true);
    CREATE POLICY "collection_item_photos_insert" ON collection_item_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid()));
  END IF;
END $$;

-- THÈME 3 — ÉVÉNEMENTS
CREATE TABLE IF NOT EXISTS local_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT NOT NULL,
  event_date DATE NOT NULL, event_time TEXT NOT NULL DEFAULT '18:00',
  location TEXT NOT NULL DEFAULT 'Biguglia',
  category TEXT NOT NULL DEFAULT 'social' CHECK (category IN ('sport','culture','musique','repas','nature','famille','social','conference')),
  organizer_name TEXT, max_participants INT,
  is_free BOOLEAN NOT NULL DEFAULT true, price NUMERIC(10,2),
  tags TEXT[] DEFAULT '{}', is_official BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS event_participations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES local_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(event_id, user_id)
);
ALTER TABLE local_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='local_events' AND policyname='local_events_select') THEN
    CREATE POLICY "local_events_select" ON local_events FOR SELECT USING (status = 'active');
    CREATE POLICY "local_events_insert" ON local_events FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "local_events_update" ON local_events FOR UPDATE USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
    CREATE POLICY "local_events_delete" ON local_events FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_participations' AND policyname='event_participations_select') THEN
    CREATE POLICY "event_participations_select" ON event_participations FOR SELECT USING (true);
    CREATE POLICY "event_participations_insert" ON event_participations FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "event_participations_delete" ON event_participations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Catégories forum pour les 3 thèmes
INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('🌿 Promenades & Nature', 'promenades', 'Itinéraires, sorties, balades et nature à Biguglia', '🌿', 8),
  ('🏆 Collectionneurs', 'collectionneurs', 'Échanges, expertises et rencontres de collectionneurs', '🏆', 9),
  ('🎉 Événements locaux', 'evenements', 'Discussions autour des événements de Biguglia', '🎉', 10)
ON CONFLICT (slug) DO NOTHING;`;

// ─── Tables à vérifier ────────────────────────────────────────────────────────
const TABLES_TO_CHECK = [
  { name: 'collection_categories', label: 'Catégories collections', theme: 'Collectionneurs' },
  { name: 'collection_items',      label: 'Annonces collections',   theme: 'Collectionneurs' },
  { name: 'promenades',            label: 'Promenades',             theme: 'Promenades' },
  { name: 'group_outings',         label: 'Sorties groupées',       theme: 'Promenades' },
  { name: 'local_events',          label: 'Événements locaux',      theme: 'Événements' },
  { name: 'event_participations',  label: 'Participations',         theme: 'Événements' },
];

type TableStatus = { name: string; exists: boolean | null };

export default function MigrationPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    if (profile.role !== 'admin') { router.push('/'); return; }
    checkTables();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const checkTables = async () => {
    setChecking(true);
    const results: TableStatus[] = [];
    for (const t of TABLES_TO_CHECK) {
      const { error } = await supabase.from(t.name).select('id').limit(1);
      results.push({ name: t.name, exists: !error || error.code !== '42P01' });
    }
    setTables(results);
    setChecking(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setCopied(true);
      toast.success('SQL copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const allOk = tables.length > 0 && tables.every(t => t.exists);
  const missingCount = tables.filter(t => t.exists === false).length;

  const getTableInfo = (name: string) => TABLES_TO_CHECK.find(t => t.name === name);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Database className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Migration base de données</h1>
          <p className="text-gray-500 text-sm">Vérification et installation des tables thèmes</p>
        </div>
      </div>

      {/* Status global */}
      {checking ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-gray-500">Vérification des tables...</span>
        </div>
      ) : allOk ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3 mb-6">
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">✅ Toutes les tables sont présentes</p>
            <p className="text-emerald-700 text-sm">La migration a déjà été exécutée. Les 3 thèmes fonctionnent.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3 mb-6">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800">{missingCount} table{missingCount > 1 ? 's' : ''} manquante{missingCount > 1 ? 's' : ''}</p>
            <p className="text-red-700 text-sm">Copiez le SQL ci-dessous et exécutez-le dans Supabase SQL Editor.</p>
          </div>
        </div>
      )}

      {/* Tableau des tables */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">État des tables</h2>
          <button onClick={checkTables} disabled={checking}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {TABLES_TO_CHECK.map(t => {
            const status = tables.find(s => s.name === t.name);
            const exists = status?.exists;
            return (
              <div key={t.name} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <span className="font-mono text-sm text-gray-700">{t.name}</span>
                  <span className="ml-3 text-xs text-gray-400">{t.label}</span>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.theme === 'Collectionneurs' ? 'bg-amber-100 text-amber-700' :
                    t.theme === 'Promenades' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{t.theme}</span>
                </div>
                {checking || exists === null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                ) : exists ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" /> OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                    <XCircle className="w-4 h-4" /> Manquante
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SQL à copier */}
      {!allOk && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800">SQL à exécuter dans Supabase</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Supabase → SQL Editor → New query → Coller → Run
              </p>
            </div>
            <button onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}>
              {copied ? <><Check className="w-4 h-4" /> Copié !</> : <><Copy className="w-4 h-4" /> Copier le SQL</>}
            </button>
          </div>
          <div className="p-4 bg-gray-950 overflow-auto max-h-[500px]">
            <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">{MIGRATION_SQL}</pre>
          </div>
          <div className="px-5 py-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <strong>Instructions :</strong> Copiez ce SQL → ouvrez{' '}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
                className="underline font-semibold">supabase.com</a>
              {' '}→ votre projet → <strong>SQL Editor</strong> → <strong>New query</strong> → collez → cliquez <strong>Run</strong>.
              Revenez ensuite sur cette page et cliquez &quot;Actualiser&quot;.
            </div>
          </div>
        </div>
      )}

      {allOk && (
        <div className="text-center py-6 text-gray-500 text-sm">
          Aucune action requise. Revenez ici si vous ajoutez de nouvelles tables.
        </div>
      )}
    </div>
  );
}
