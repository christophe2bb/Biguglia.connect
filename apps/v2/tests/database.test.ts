// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL engine, disposable fixtures, no production data or credentials.
// This verifies the migration's authorization and idempotency contract. Supabase
// REST, Auth delivery and the existing application's other triggers remain a
// separate hosted integration check.
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const c = "00000000-0000-4000-8000-000000000003";
const admin = "00000000-0000-4000-8000-000000000004";
const listing = "00000000-0000-4000-8000-000000000010";
const artisan = "00000000-0000-4000-8000-000000000020";
const quote = "00000000-0000-4000-8000-000000000030";
const message = "00000000-0000-4000-8000-000000000040";
let db: PGlite;
const call = (
  recipient = b,
  type = "listing",
  record: string | null = listing,
  content = "Bonjour, ce projet m’intéresse.",
  mid = message,
) =>
  db.query<{ id: string }>(
    "select public.bc_v2_start_conversation($1,$2,$3,$4,$5,$6) as id",
    [recipient, type, record, "Publication de test", content, mid],
  );
async function actor(id: string) {
  await db.exec(
    `set local role authenticated; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, role: "authenticated" })}',true);`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;create role authenticated;
    create schema auth;create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
  `);
  await db.exec(`
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
    grant usage on schema auth to anon,authenticated;grant execute on all functions in schema auth to anon,authenticated;
    create type public.related_type as enum('service_request','listing','equipment','general','help_request','lost_found','association','outing','collection_item','event','artisan','community');
    create table public.profiles(id uuid primary key,email text,full_name text,role text default 'resident',status text default 'active',is_active boolean default true);
    create table public.artisan_profiles(id uuid primary key,user_id uuid,business_name text,is_verified boolean);
    create table public.service_requests(id uuid primary key,resident_id uuid,artisan_id uuid,status text);
    create table public.listings(id uuid primary key,user_id uuid,status text);
    create table public.equipment_items(id uuid primary key,owner_id uuid,status text);
    create table public.help_requests(id uuid primary key,author_id uuid);
    create table public.associations(id uuid primary key,author_id uuid,status text);
    create table public.collection_items(id uuid primary key,author_id uuid,status text);
    create table public.group_outings(id uuid primary key,organizer_id uuid,status text);
    create table public.events(id uuid primary key,author_id uuid,status text);
    create table public.lost_found_items(id uuid primary key,author_id uuid);
    create table public.user_blocks(id uuid primary key default gen_random_uuid(),user_id uuid,target_user_id uuid);
    create table public.conversations(id uuid primary key default gen_random_uuid(),subject text,related_type public.related_type,related_id uuid,created_by uuid,owner_id uuid,source_title text,created_at timestamptz default now());
    create table public.conversation_participants(id uuid primary key default gen_random_uuid(),conversation_id uuid,user_id uuid,last_read_at timestamptz,unique(conversation_id,user_id));
    create table public.messages(id uuid primary key,conversation_id uuid,sender_id uuid,content text);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;grant execute on function storage.foldername(text) to authenticated;
    grant select,insert,update,delete on all tables in schema public to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
    alter table public.profiles enable row level security;
    create policy fixture_profiles_self on public.profiles for all to authenticated using (id=auth.uid()) with check(id=auth.uid());
    alter table public.conversations enable row level security;
    alter table public.conversation_participants enable row level security;
    create policy fixture_participant_self on public.conversation_participants for select to authenticated using(user_id=auth.uid());
    create policy fixture_conversation_members on public.conversations for select to authenticated using(exists(select 1 from public.conversation_participants cp where cp.conversation_id=conversations.id and cp.user_id=auth.uid()));
    alter table public.messages enable row level security;
    create policy fixture_messages_member on public.messages for all to authenticated using(exists(select 1 from public.conversation_participants cp where cp.conversation_id=messages.conversation_id and cp.user_id=auth.uid())) with check(sender_id=auth.uid());
    insert into public.profiles(id,email,full_name,role) values('${a}','a@example.invalid','Fixture A','resident'),('${b}','b@example.invalid','Fixture B','resident'),('${c}','c@example.invalid','Fixture C','resident'),('${admin}','admin@example.invalid','Fixture admin','admin');
    insert into public.artisan_profiles values('${artisan}','${b}','Fixture artisan',true);
    insert into public.service_requests values('${quote}','${a}','${artisan}','submitted');
    insert into public.listings values('${listing}','${b}','active');
  `);
  await db.exec(
    await readFile(
      new URL(
        "../../../supabase/migrations/20261111162735_v2_secure_client_contract.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  await actor(a);
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db.close();
});

describe("database authorization and message integrity", () => {
  it("creates one conversation and one initial message on retry", async () => {
    const first = await call();
    const again = await call();
    expect(again.rows[0].id).toBe(first.rows[0].id);
    expect(
      (await db.query("select id from public.messages")).rows,
    ).toHaveLength(1);
  });
  it("sends a new message into an existing conversation", async () => {
    const first = await call();
    const second = await call(
      b,
      "listing",
      listing,
      "Un second message.",
      "00000000-0000-4000-8000-000000000041",
    );
    expect(second.rows[0].id).toBe(first.rows[0].id);
    expect(
      (await db.query("select id from public.messages")).rows,
    ).toHaveLength(2);
  });
  it("isolates conversations from different contexts", async () => {
    const one = await call();
    const two = await call(
      b,
      "general",
      null,
      "Bonjour ailleurs.",
      "00000000-0000-4000-8000-000000000042",
    );
    expect(two.rows[0].id).not.toBe(one.rows[0].id);
  });
  it("rejects a recipient who does not own the publication", async () => {
    await expect(call(c)).rejects.toThrow("Publication indisponible");
  });
  it("rejects self-contact", async () => {
    await expect(call(a)).rejects.toThrow("destinataire invalide");
  });
  it("prevents an account from assigning itself admin", async () => {
    await expect(
      db.query("update public.profiles set role=$1 where id=$2", ["admin", a]),
    ).rejects.toThrow("réservée");
  });
  it("allows normal profile edits", async () => {
    await db.query("update public.profiles set full_name=$1 where id=$2", [
      "Mon nom modifié",
      a,
    ]);
    expect(
      (
        await db.query<{ full_name: string }>(
          "select full_name from public.profiles where id=$1",
          [a],
        )
      ).rows[0].full_name,
    ).toBe("Mon nom modifié");
  });
  it("prevents reactivating a suspended account through a direct request", async () => {
    await db.exec(
      "reset role;select set_config('request.jwt.claims','{}',true)",
    );
    await db.query("update public.profiles set status=$1 where id=$2", [
      "suspended",
      a,
    ]);
    await actor(a);
    await expect(call()).rejects.toThrow("Ce compte");
  });
  it("honors blocks in both directions", async () => {
    await actor(b);
    await db.query(
      "insert into public.user_blocks(user_id,target_user_id) values($1,$2)",
      [b, a],
    );
    await actor(a);
    await expect(call()).rejects.toThrow("pas disponible");
  });
  it("rejects reuse of a message ID for a different body", async () => {
    await call();
    await expect(
      call(b, "listing", listing, "Contenu modifié."),
    ).rejects.toThrow("déjà utilisé");
  });
  it("does not allow an unrelated person to view private quote photos", async () => {
    await actor(c);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select bc_v2_private.can_access_quote($1,false) as allowed",
          [`requests/${quote}/photo.jpg`],
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
  it("allows only the resident to upload into a private quote", async () => {
    await actor(b);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select bc_v2_private.can_access_quote($1,true) as allowed",
          [`requests/${quote}/photo.jpg`],
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
  it("keeps a third person outside a private conversation", async () => {
    await call();
    await actor(c);
    expect(
      (await db.query("select id from public.messages")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select id from public.conversations")).rows,
    ).toHaveLength(0);
  });
  it("prevents changing participants through the read-receipt endpoint", async () => {
    const conversation = (await call()).rows[0].id;
    await expect(
      db.query(
        "update public.conversation_participants set user_id=$1 where conversation_id=$2",
        [c, conversation],
      ),
    ).rejects.toThrow("permission denied");
  });
});
