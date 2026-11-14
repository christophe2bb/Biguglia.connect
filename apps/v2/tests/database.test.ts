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
    create type public.user_role as enum('resident','artisan_pending','artisan_verified','moderator','admin');
    create type public.account_status as enum('active','pending','rejected','suspended');
    create type public.appointment_status as enum('pending','accepted','declined','rescheduled','completed','cancelled');
    create table public.profiles(id uuid primary key,email text,full_name text,role public.user_role default 'resident',status public.account_status default 'active',is_active boolean default true);
    create table public.artisan_profiles(id uuid primary key,user_id uuid,business_name text,is_verified boolean,rejection_reason text);
    create table public.admin_action_logs(id uuid primary key default gen_random_uuid(),actor_id uuid,actor_role text,action text,target_table text,target_id text,reason text,meta jsonb default '{}',created_at timestamptz default now());
    create table public.service_requests(id uuid primary key,resident_id uuid,artisan_id uuid,status text,title text default 'Devis de recette',updated_at timestamptz default now());
    create table public.appointments(id uuid primary key,request_id uuid,resident_id uuid not null,artisan_id uuid not null,proposed_date date not null,proposed_time time not null,notes text,status public.appointment_status default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
    create table public.listings(id uuid primary key,user_id uuid,status text);
    create table public.equipment_items(id uuid primary key,owner_id uuid,status text,title text,is_available boolean default true,updated_at timestamptz,status_changed_at timestamptz);
    create table public.equipment_requests(id uuid primary key,equipment_id uuid,requester_id uuid,status text default 'en_attente',requested_start_date date,requested_end_date date,updated_at timestamptz);
    create table public.equipment_loans(id uuid primary key default gen_random_uuid(),equipment_id uuid,owner_id uuid,borrower_id uuid,request_id uuid,status text,reserved_at timestamptz default now(),loan_started_at timestamptz,returned_at timestamptz,created_at timestamptz default now(),updated_at timestamptz);
    create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid,type text,title text,message text,link text);
    create table public.trust_interactions(id uuid primary key default gen_random_uuid(),source_type text,source_id uuid,requester_id uuid,receiver_id uuid,interaction_type text,status text,review_unlocked boolean,review_requester_done boolean default false,review_receiver_done boolean default false,completed_at timestamptz,updated_at timestamptz,unique(source_type,source_id,requester_id));
    create table public.reviews(id uuid primary key,artisan_id uuid not null,reviewer_id uuid not null,author_id uuid,target_user_id uuid,interaction_id uuid,source_type text,source_id uuid,rating integer check(rating between 1 and 5),comment text,moderation_status text default 'visible',moderation_note text,moderated_by uuid,moderated_at timestamptz,updated_at timestamptz,created_at timestamptz default now(),dim_communication integer,dim_reliability integer,dim_punctuality integer,dim_quality integer,would_recommend boolean,unique(artisan_id,reviewer_id),unique(interaction_id,author_id));
    create table public.trust_profile_stats(profile_id uuid primary key,reviews_received integer not null default 0,avg_rating numeric not null default 0,avg_communication numeric,avg_reliability numeric,avg_punctuality numeric,avg_quality numeric,recommend_pct integer,dist_1 integer not null default 0,dist_2 integer not null default 0,dist_3 integer not null default 0,dist_4 integer not null default 0,dist_5 integer not null default 0,trust_score integer not null default 0,last_computed_at timestamptz not null default now(),updated_at timestamptz not null default now());
    create function public.recalc_trust_stats() returns trigger language plpgsql as $$begin return new;end$$;
    create function public.is_moderator_or_admin() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role::text in ('admin','moderator'))$$;
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
    revoke update on public.profiles from authenticated;
    grant update(full_name) on public.profiles to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
    alter table public.profiles enable row level security;
    create policy fixture_profiles_self on public.profiles for all to authenticated using (id=auth.uid()) with check(id=auth.uid());
    alter table public.reviews enable row level security;
    create policy fixture_reviews_read on public.reviews for select to anon,authenticated using(true);
    create policy fixture_reviews_write on public.reviews for all to authenticated using(reviewer_id=auth.uid()) with check(reviewer_id=auth.uid());
    create policy fixture_reviews_staff on public.reviews for all to authenticated using(public.is_moderator_or_admin()) with check(public.is_moderator_or_admin());
    alter table public.trust_profile_stats enable row level security;
    create policy fixture_stats_read on public.trust_profile_stats for select to authenticated using(true);
    alter table public.appointments enable row level security;
    create policy fixture_appointments_parties on public.appointments for select to authenticated using(resident_id=auth.uid() or exists(select 1 from public.artisan_profiles a where a.id=appointments.artisan_id and a.user_id=auth.uid()));
    alter table public.conversations enable row level security;
    alter table public.conversation_participants enable row level security;
    create policy fixture_participant_self on public.conversation_participants for select to authenticated using(user_id=auth.uid());
    create policy fixture_conversation_members on public.conversations for select to authenticated using(exists(select 1 from public.conversation_participants cp where cp.conversation_id=conversations.id and cp.user_id=auth.uid()));
    alter table public.messages enable row level security;
    create policy fixture_messages_member on public.messages for all to authenticated using(exists(select 1 from public.conversation_participants cp where cp.conversation_id=messages.conversation_id and cp.user_id=auth.uid())) with check(sender_id=auth.uid());
    insert into public.profiles(id,email,full_name,role) values('${a}','a@example.invalid','Fixture A','resident'),('${b}','b@example.invalid','Fixture B','resident'),('${c}','c@example.invalid','Fixture C','resident'),('${admin}','admin@example.invalid','Fixture admin','admin');
    insert into public.artisan_profiles(id,user_id,business_name,is_verified) values('${artisan}','${b}','Fixture artisan',true);
    insert into public.service_requests(id,resident_id,artisan_id,status) values('${quote}','${a}','${artisan}','submitted');
    insert into public.listings values('${listing}','${b}','active');
  `);
  for (const migration of [
    "20261111173446_v2_secure_client_contract.sql",
    "20261112031348_v2_transactional_workflows.sql",
    "20261112040922_v2_service_appointments.sql",
    "20261112042137_v2_verified_service_reviews.sql",
    "20261114041938_v2_review_stats_permissions.sql",
    "20261114043322_v2_bidirectional_quote_contact.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL("../../../supabase/migrations/" + migration, import.meta.url),
        "utf8",
      ),
    );
  }
  await db.exec(
    await readFile(
      new URL("./fixtures/service-status-trigger.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  await actor(a);
});

describe("audited administrative decisions", () => {
  const decision = (
    target: string,
    action: string,
    reason = "Décision administrative de test.",
  ) =>
    db.query("select public.bc_v2_admin_decision($1,$2,$3)", [
      target,
      action,
      reason,
    ]);
  it("rejects decisions by an ordinary resident", async () => {
    await expect(decision(b, "suspend")).rejects.toThrow(
      "administrateur actif",
    );
  });
  it("rejects a moderator who tries to change protected account state", async () => {
    await db.exec(
      "reset role;select set_config('request.jwt.claims','{}',true)",
    );
    await db.query("update public.profiles set role='moderator' where id=$1", [
      c,
    ]);
    await actor(c);
    await expect(decision(b, "suspend")).rejects.toThrow(
      "administrateur actif",
    );
  });
  it("suspends a member atomically and records one decision on retry", async () => {
    await actor(admin);
    await decision(b, "suspend");
    await decision(b, "suspend");
    await db.exec("reset role");
    expect(
      (
        await db.query(
          "select status,is_active from public.profiles where id=$1",
          [b],
        )
      ).rows[0],
    ).toEqual({ status: "suspended", is_active: false });
    expect(
      (await db.query("select id from public.admin_action_logs")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(1);
  });
  it("does not let an administrator suspend their own account", async () => {
    await actor(admin);
    await expect(decision(admin, "suspend")).rejects.toThrow(
      "ne peut pas être modifié",
    );
  });
  it("rejects a decision without an explanatory reason", async () => {
    await actor(admin);
    await expect(decision(b, "suspend", "")).rejects.toThrow("10 et 500");
  });
  it("updates both the artisan verification and the account role", async () => {
    await actor(admin);
    await decision(b, "approve_artisan");
    await decision(b, "approve_artisan");
    await db.exec("reset role");
    expect(
      (await db.query("select role from public.profiles where id=$1", [b]))
        .rows[0],
    ).toEqual({ role: "artisan_verified" });
    expect(
      (
        await db.query(
          "select is_verified from public.artisan_profiles where user_id=$1",
          [b],
        )
      ).rows[0],
    ).toEqual({ is_verified: true });
    expect(
      (await db.query("select id from public.admin_action_logs")).rows,
    ).toHaveLength(1);
  });
  it("rolls back a suspension if writing its audit record fails", async () => {
    await db.exec(
      "reset role;alter table public.admin_action_logs add constraint fixture_audit_failure check(action<>'suspend')",
    );
    await actor(admin);
    await db.exec("savepoint decision");
    await expect(decision(b, "suspend")).rejects.toThrow(
      "fixture_audit_failure",
    );
    await db.exec("rollback to savepoint decision;reset role");
    expect(
      (
        await db.query(
          "select status,is_active from public.profiles where id=$1",
          [b],
        )
      ).rows[0],
    ).toEqual({ status: "active", is_active: true });
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(0);
  });
  it("does not expose the decision journal to residents", async () => {
    await expect(
      db.query("select * from public.bc_v2_admin_history()"),
    ).rejects.toThrow("réservé");
  });
});

describe("service appointments", () => {
  const appointment = "00000000-0000-4000-8000-000000000060";
  const second = "00000000-0000-4000-8000-000000000061";
  const otherQuote = "00000000-0000-4000-8000-000000000062";
  const day = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const propose = (
    id = appointment,
    request = quote,
    time = "10:00",
    duration = 60,
    date = day,
  ) =>
    db.query("select public.bc_v2_propose_appointment($1,$2,$3,$4,$5,$6)", [
      id,
      request,
      date,
      time,
      duration,
      "Proposition de recette.",
    ]);
  const decide = (action: string, id = appointment) =>
    db.query("select public.bc_v2_appointment_action($1,$2)", [id, action]);
  const addQuote = () =>
    db.query(
      "insert into public.service_requests(id,resident_id,artisan_id,status) values($1,$2,$3,'submitted')",
      [otherQuote, a, artisan],
    );
  beforeEach(async () => {
    await db.exec(
      "reset role;select set_config('request.jwt.claims','{}',true)",
    );
    await db.query(
      "update public.profiles set role='artisan_verified' where id=$1",
      [b],
    );
    await actor(a);
  });
  it("saves one proposal and one notification when retried", async () => {
    await propose();
    await propose();
    expect(
      (await db.query("select proposed_by,status from public.appointments"))
        .rows,
    ).toEqual([{ proposed_by: a, status: "pending" }]);
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(1);
  });
  it("rejects a third party proposing a date for a private quote", async () => {
    await actor(c);
    await expect(propose()).rejects.toThrow("ne participez pas");
  });
  it("allows a resident to accept a proposal from the artisan", async () => {
    await actor(b);
    await propose();
    await actor(a);
    await decide("accept");
    expect(
      (await db.query("select status from public.appointments")).rows[0],
    ).toEqual({ status: "accepted" });
  });
  it("prevents the proposer from confirming their own proposal", async () => {
    await propose();
    await expect(decide("accept")).rejects.toThrow("destinataire");
  });
  it("schedules the quote and keeps acceptance retries harmless", async () => {
    await propose();
    await actor(b);
    await decide("accept");
    await decide("accept");
    expect(
      (
        await db.query(
          "select status from public.service_requests where id=$1",
          [quote],
        )
      ).rows[0],
    ).toEqual({ status: "scheduled" });
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(2);
  });
  it("keeps a declined proposal out of the confirmed calendar", async () => {
    await propose();
    await actor(b);
    await decide("decline");
    await decide("decline");
    expect(
      (await db.query("select status from public.appointments")).rows[0],
    ).toEqual({ status: "declined" });
  });
  it("cancels a confirmed appointment and reopens scheduling", async () => {
    await propose();
    await actor(b);
    await decide("accept");
    await actor(a);
    await decide("cancel");
    await decide("cancel");
    expect(
      (
        await db.query(
          "select status from public.service_requests where id=$1",
          [quote],
        )
      ).rows[0],
    ).toEqual({ status: "replied" });
    await propose(second);
    await actor(b);
    await decide("accept", second);
    expect(
      (
        await db.query(
          "select id from public.appointments where status='accepted'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("allows only the resident to confirm completion", async () => {
    await propose();
    await actor(b);
    await decide("accept");
    await expect(decide("complete")).rejects.toThrow("Seul le résident");
  });
  it("completes the appointment and quote, and unlocks the existing review once", async () => {
    await propose();
    await actor(b);
    await decide("accept");
    await actor(a);
    await decide("complete");
    await decide("complete");
    expect(
      (await db.query("select status from public.appointments")).rows[0],
    ).toEqual({ status: "completed" });
    expect(
      (
        await db.query(
          "select status,review_unlocked from public.trust_interactions",
        )
      ).rows[0],
    ).toEqual({ status: "done", review_unlocked: true });
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(4);
  });
  it("closes calendar entries when the resident cancels the quote from its normal form", async () => {
    await propose();
    await actor(b);
    await decide("accept");
    await actor(a);
    await db.query(
      "update public.service_requests set status='cancelled' where id=$1",
      [quote],
    );
    expect(
      (await db.query("select status from public.appointments")).rows[0],
    ).toEqual({ status: "cancelled" });
  });
  it("rechecks overlapping appointments when accepting two pending proposals", async () => {
    await addQuote();
    await propose();
    await propose(second, otherQuote, "10:30");
    await actor(b);
    await decide("accept");
    await expect(decide("accept", second)).rejects.toThrow(
      "vient d’être réservé",
    );
  });
  it("allows adjacent appointments", async () => {
    await addQuote();
    await propose();
    await propose(second, otherQuote, "11:00");
    await actor(b);
    await decide("accept");
    await decide("accept", second);
    expect(
      (
        await db.query(
          "select id from public.appointments where status='accepted'",
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("rejects a date in the past", async () => {
    await expect(
      propose(appointment, quote, "10:00", 60, "2000-01-01"),
    ).rejects.toThrow("heure future");
  });
  it("rejects a nonexistent local time at the spring daylight-saving change", async () => {
    const lastMarchDay = new Date(
      Date.UTC(new Date().getUTCFullYear() + 1, 3, 0),
    );
    lastMarchDay.setUTCDate(
      lastMarchDay.getUTCDate() - lastMarchDay.getUTCDay(),
    );
    await expect(
      propose(
        appointment,
        quote,
        "02:30",
        60,
        lastMarchDay.toISOString().slice(0, 10),
      ),
    ).rejects.toThrow("heure future valide");
  });
  it("rejects an excessive duration", async () => {
    await expect(propose(appointment, quote, "10:00", 481)).rejects.toThrow(
      "invalide",
    );
  });
  it("prevents bypassing the contract with a direct table insert", async () => {
    await expect(
      db.query(
        "insert into public.appointments(id,request_id,resident_id,artisan_id,proposed_date,proposed_time,status) values($1,$2,$3,$4,$5,'10:00','accepted')",
        [appointment, quote, a, artisan, day],
      ),
    ).rejects.toThrow("permission denied");
  });
  it("keeps appointment details private to their participants", async () => {
    await propose();
    await actor(c);
    expect(
      (await db.query("select id from public.appointments")).rows,
    ).toHaveLength(0);
  });
  it("honors a block when proposing an appointment", async () => {
    await db.query(
      "insert into public.user_blocks(user_id,target_user_id) values($1,$2)",
      [a, b],
    );
    await expect(propose()).rejects.toThrow("pas disponible");
  });
  it("rolls back the proposal if its notification cannot be persisted", async () => {
    await db.exec(
      "reset role;alter table public.notifications add constraint fixture_appointment_notification check(type<>'appointment_proposed')",
    );
    await actor(a);
    await db.exec("savepoint proposal");
    await expect(propose()).rejects.toThrow("fixture_appointment_notification");
    await db.exec("rollback to savepoint proposal");
    expect(
      (await db.query("select id from public.appointments")).rows,
    ).toHaveLength(0);
  });
});

describe("verified service reviews", () => {
  const review = "00000000-0000-4000-8000-000000000080";
  const submit = (
    id = review,
    score = 5,
    text = "Intervention soignée et ponctuelle.",
  ) =>
    db.query("select public.bc_v2_submit_service_review($1,$2,$3,$4)", [
      id,
      quote,
      score,
      text,
    ]);
  const complete = async () => {
    await db.exec("reset role");
    await db.query(
      "update public.service_requests set status='completed' where id=$1",
      [quote],
    );
    await actor(a);
  };
  it("requires a completed quote before creating a review", async () => {
    await expect(submit()).rejects.toThrow("Preuve d’intervention");
  });
  it("records the review, proof flag and notification once on retry", async () => {
    await complete();
    await submit();
    await submit();
    expect(
      (
        await db.query(
          "select id,reviewer_id,target_user_id from public.reviews",
        )
      ).rows,
    ).toEqual([{ id: review, reviewer_id: a, target_user_id: b }]);
    expect(
      (
        await db.query(
          "select review_requester_done from public.trust_interactions",
        )
      ).rows[0],
    ).toEqual({ review_requester_done: true });
    expect(
      (
        await db.query(
          "select id from public.notifications where type='new_review'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("computes visible review statistics without giving the client aggregate writes", async () => {
    await complete();
    await submit();
    expect(
      (
        await db.query(
          "select reviews_received,avg_rating,dist_5 from public.trust_profile_stats",
        )
      ).rows[0],
    ).toEqual({ reviews_received: 1, avg_rating: "5.00", dist_5: 1 });
    expect(
      (
        await db.query(
          "update public.trust_profile_stats set reviews_received=200",
        )
      ).affectedRows,
    ).toBe(0);
    expect(
      (
        await db.query(
          "select reviews_received from public.trust_profile_stats",
        )
      ).rows[0],
    ).toEqual({ reviews_received: 1 });
  });
  it("rejects an outsider’s review", async () => {
    await complete();
    await actor(c);
    await expect(submit()).rejects.toThrow("évaluer cette intervention");
  });
  it("does not let the artisan rate their own intervention", async () => {
    await complete();
    await actor(b);
    await expect(submit()).rejects.toThrow("évaluer cette intervention");
  });
  it("enforces the 30-day review period", async () => {
    await complete();
    await db.exec(
      "reset role;update public.trust_interactions set completed_at=now()-interval '31 days'",
    );
    await actor(a);
    await expect(submit()).rejects.toThrow("pendant 30 jours");
  });
  it("refuses an out-of-range score", async () => {
    await complete();
    await expect(submit(review, 6)).rejects.toThrow("une note de 1 à 5");
  });
  it("refuses an empty comment", async () => {
    await complete();
    await expect(submit(review, 5, " ")).rejects.toThrow("10 à 2000");
  });
  it("rejects a second identifier for an already reviewed artisan", async () => {
    await complete();
    await submit();
    await expect(
      submit("00000000-0000-4000-8000-000000000081"),
    ).rejects.toThrow("déjà donné");
  });
  it("prevents direct insertion with forged target identity", async () => {
    await complete();
    await expect(
      db.query(
        "insert into public.reviews(id,artisan_id,reviewer_id,author_id,target_user_id,interaction_id,source_type,source_id,rating,comment) select $1,$2,$3,$3,$4,id,'service_request',$5,5,'Avis forgé de recette.' from public.trust_interactions",
        [review, artisan, a, c, quote],
      ),
    ).rejects.toThrow("devis terminé et vérifié");
  });
  it("keeps review proof immutable after submission", async () => {
    await complete();
    await submit();
    await expect(
      db.query(
        "update public.reviews set source_type=null,interaction_id=null where id=$1",
        [review],
      ),
    ).rejects.toThrow("réattribué ou réécrit");
  });
  it("hides moderated reviews from outsiders despite legacy permissive policies", async () => {
    await complete();
    await submit();
    await actor(admin);
    await db.query(
      "update public.reviews set moderation_status='hidden' where id=$1",
      [review],
    );
    expect(
      (
        await db.query(
          "select reviews_received,avg_rating,dist_5 from public.trust_profile_stats",
        )
      ).rows[0],
    ).toEqual({ reviews_received: 0, avg_rating: "0", dist_5: 0 });
    await actor(c);
    expect((await db.query("select id from public.reviews")).rows).toHaveLength(
      0,
    );
    await actor(a);
    expect((await db.query("select id from public.reviews")).rows).toHaveLength(
      1,
    );
    await actor(b);
    expect((await db.query("select id from public.reviews")).rows).toHaveLength(
      1,
    );
  });
  it("rolls back review and proof flag if notifying fails", async () => {
    await complete();
    await db.exec(
      "reset role;alter table public.notifications add constraint fixture_review_notification check(type<>'new_review')",
    );
    await actor(a);
    await db.exec("savepoint review_submission");
    await expect(submit()).rejects.toThrow("fixture_review_notification");
    await db.exec("rollback to savepoint review_submission");
    expect((await db.query("select id from public.reviews")).rows).toHaveLength(
      0,
    );
    expect(
      (
        await db.query(
          "select review_requester_done from public.trust_interactions",
        )
      ).rows[0],
    ).toEqual({ review_requester_done: false });
  });
});

describe("atomic equipment lifecycle", () => {
  const item = "00000000-0000-4000-8000-000000000050";
  const req = "00000000-0000-4000-8000-000000000051";
  const second = "00000000-0000-4000-8000-000000000052";
  const action = (name: string, id = req) =>
    db.query("select public.bc_v2_equipment_action($1,$2)", [id, name]);
  beforeEach(async () => {
    await db.query(
      "insert into public.equipment_items(id,owner_id,title,status) values($1,$2,'Échelle de test','disponible')",
      [item, b],
    );
    await db.query(
      "insert into public.equipment_requests(id,equipment_id,requester_id,requested_start_date,requested_end_date) values($1,$2,$3,'2026-12-01','2026-12-03')",
      [req, item, a],
    );
  });
  it("reserves once and notifies once on a repeated acceptance", async () => {
    await actor(b);
    await action("accept");
    await action("accept");
    expect(
      (await db.query("select status,is_available from public.equipment_items"))
        .rows[0],
    ).toEqual({ status: "reserve", is_available: false });
    expect(
      (await db.query("select id from public.equipment_loans")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(1);
  });
  it("rejects acceptance by the borrower", async () => {
    await expect(action("accept")).rejects.toThrow("réservée");
  });
  it("rejects an administrator acting instead of the owner", async () => {
    await actor(admin);
    await expect(action("accept")).rejects.toThrow("réservée");
  });
  it("allows a borrower to cancel only their pending request", async () => {
    await action("cancel");
    await action("cancel");
    expect(
      (await db.query("select status from public.equipment_requests")).rows[0],
    ).toEqual({ status: "annulee" });
    expect(
      (await db.query("select id from public.equipment_loans")).rows,
    ).toHaveLength(0);
  });
  it("rejects cancellation by an unrelated member", async () => {
    await actor(c);
    await expect(action("cancel")).rejects.toThrow("réservée");
  });
  it("requires physical handover before a return can be recorded", async () => {
    await actor(b);
    await action("accept");
    await expect(action("return")).rejects.toThrow("Prêt en cours requis");
  });
  it("completes the request, releases equipment and unlocks reviews together", async () => {
    await actor(b);
    await action("accept");
    await action("handover");
    await action("handover");
    await action("return");
    await action("return");
    expect(
      (await db.query("select status,is_available from public.equipment_items"))
        .rows[0],
    ).toEqual({ status: "disponible", is_available: true });
    expect(
      (await db.query("select status from public.equipment_requests")).rows[0],
    ).toEqual({ status: "terminee" });
    expect(
      (await db.query("select status from public.equipment_loans")).rows[0],
    ).toEqual({ status: "retourne" });
    expect(
      (await db.query("select review_unlocked from public.trust_interactions"))
        .rows[0],
    ).toEqual({ review_unlocked: true });
    expect(
      (await db.query("select id from public.notifications")).rows,
    ).toHaveLength(3);
  });
  it("refuses a second reservation while the equipment is held", async () => {
    await db.query(
      "insert into public.equipment_requests(id,equipment_id,requester_id,requested_start_date,requested_end_date) values($1,$2,$3,'2026-12-04','2026-12-05')",
      [second, item, c],
    );
    await actor(b);
    await action("accept");
    await expect(action("accept", second)).rejects.toThrow("déjà réservé");
  });
  it("rolls back the entire acceptance when notification persistence fails", async () => {
    await db.exec(
      "reset role;alter table public.notifications add constraint fixture_notification_failure check(title<>'Demande de matériel acceptée')",
    );
    await actor(b);
    await db.exec("savepoint acceptance");
    await expect(action("accept")).rejects.toThrow(
      "fixture_notification_failure",
    );
    await db.exec("rollback to savepoint acceptance");
    expect(
      (await db.query("select status from public.equipment_requests")).rows[0],
    ).toEqual({ status: "en_attente" });
    expect(
      (await db.query("select status from public.equipment_items")).rows[0],
    ).toEqual({ status: "disponible" });
    expect(
      (await db.query("select id from public.equipment_loans")).rows,
    ).toHaveLength(0);
  });
  it("rejects a reservation between blocked members", async () => {
    await db.query(
      "insert into public.user_blocks(user_id,target_user_id) values($1,$2)",
      [a, b],
    );
    await actor(b);
    await expect(action("accept")).rejects.toThrow("pas disponible");
  });
  it("rejects a loan whose recorded parties do not match its request", async () => {
    await db.query(
      "insert into public.equipment_loans(equipment_id,owner_id,borrower_id,request_id,status) values($1,$2,$3,$4,'reserve')",
      [item, c, a, req],
    );
    await actor(b);
    await expect(action("handover")).rejects.toThrow("ne correspond pas");
  });
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db.close();
});

describe("database authorization and message integrity", () => {
  it("lets the resident initiate a private quote conversation with the assigned artisan", async () => {
    await call(b, "service_request", quote);
    expect(
      (
        await db.query(
          "select related_id,owner_id,created_by from public.conversations",
        )
      ).rows[0],
    ).toEqual({ related_id: quote, owner_id: a, created_by: a });
  });
  it("reuses the same private conversation in the reverse direction", async () => {
    const initial = await call(b, "service_request", quote);
    await actor(b);
    const reverse = await call(
      a,
      "service_request",
      quote,
      "Réponse de l’artisan.",
      "00000000-0000-4000-8000-000000000043",
    );
    expect(reverse.rows[0].id).toBe(initial.rows[0].id);
    expect(
      (await db.query("select id from public.conversations")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.messages")).rows,
    ).toHaveLength(2);
  });
  it("rejects an unrelated member contacting a private quote owner", async () => {
    await actor(c);
    await expect(call(a, "service_request", quote)).rejects.toThrow(
      "Publication indisponible",
    );
  });
  it("rejects the resident choosing an unrelated recipient for a private quote", async () => {
    await expect(call(c, "service_request", quote)).rejects.toThrow(
      "Publication indisponible",
    );
  });
  it("does not start a new conversation for a closed quote", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.service_requests set status='completed' where id=$1",
      [quote],
    );
    await actor(a);
    await expect(call(b, "service_request", quote)).rejects.toThrow(
      "Publication indisponible",
    );
  });
  it("preserves public request contact with its resident author", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.service_requests set artisan_id=null where id=$1",
      [quote],
    );
    await actor(c);
    await call(a, "service_request", quote);
    expect(
      (await db.query("select owner_id from public.conversations")).rows[0],
    ).toEqual({ owner_id: a });
  });
  it("prevents deleting an artisan profile from turning private quotes public", async () => {
    await db.exec("reset role");
    await expect(
      db.query("delete from public.artisan_profiles where id=$1", [artisan]),
    ).rejects.toThrow("devis privés");
  });
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
    ).rejects.toThrow(/réservée|permission denied/);
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
