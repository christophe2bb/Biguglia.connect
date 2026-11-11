import { describe, expect, it } from "vitest";
import {
  MODULES,
  buildPayload,
  contentType,
  moduleBySlug,
} from "../src/lib/modules";
import snapshot from "../docs/database-contract.json";
import constraints from "../docs/constraints.snapshot.json";

const resident = "00000000-0000-4000-8000-000000000001";
const listing = moduleBySlug("annonces")!;
const valid = {
  title: "Table de jardin",
  description: "Une table solide en bon état à récupérer à Biguglia.",
  category_id: "00000000-0000-4000-8000-000000000002",
  listing_type: "sale",
  condition: "bon",
  location: "Casatorra",
  price: "30",
};
describe("publication contract", () => {
  it("writes only owned fields and ignores forged privilege fields", () => {
    const row = buildPayload(
      listing,
      {
        ...valid,
        user_id: "other",
        is_featured: true,
        status: "sold",
        role: "admin",
      },
      resident,
      false,
    );
    expect(row.user_id).toBe(resident);
    expect(row.status).toBe("active");
    expect(row).not.toHaveProperty("role");
    expect(row).not.toHaveProperty("is_featured");
  });
  it("does not change authorship or status while editing", () => {
    const row = buildPayload(listing, valid, resident, true);
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("status");
  });
  it("normalizes a free listing to a zero price", () =>
    expect(
      buildPayload(
        listing,
        { ...valid, listing_type: "free", price: "42" },
        resident,
        false,
      ).price,
    ).toBe(0));
  it.each([-1, Infinity, NaN, 1000001])("rejects invalid price %s", (value) =>
    expect(() =>
      buildPayload(listing, { ...valid, price: value }, resident, false),
    ).toThrow(),
  );
  it("rejects invalid enum values rather than sending them to Postgres", () =>
    expect(() =>
      buildPayload(
        listing,
        { ...valid, listing_type: "secret" },
        resident,
        false,
      ),
    ).toThrow());
  it("requires descriptions with enough information", () =>
    expect(() =>
      buildPayload(listing, { ...valid, description: "abc" }, resident, false),
    ).toThrow());
  it("validates the selected sector", () =>
    expect(() =>
      buildPayload(
        listing,
        { ...valid, sector_id: "unknown" },
        resident,
        false,
      ),
    ).toThrow());
  it("keeps identity separate from a user-selected artisan type", () => {
    const m = moduleBySlug("artisans")!;
    const row = buildPayload(
      m,
      {
        business_name: "Atelier",
        trade_category_id: valid.category_id,
        description: valid.description,
        artisan_type: "particulier",
        service_area: "Biguglia",
        is_verified: true,
      },
      resident,
      false,
    );
    expect(row).not.toHaveProperty("is_verified");
  });
  it("has a unique route and resource for each inventory module", () => {
    expect(new Set(MODULES.map((m) => m.slug)).size).toBe(MODULES.length);
    expect(MODULES).toHaveLength(14);
  });
  it("selects only columns observed in the existing database", () => {
    const tables = snapshot.tables as Record<string, string[]>;
    for (const m of MODULES) {
      if (!tables[m.table]) continue;
      for (const col of m.select.split(","))
        expect(tables[m.table], m.table + "." + col).toContain(col);
      for (const f of m.fields)
        expect(tables[m.table], m.table + "." + f.name).toContain(f.name);
      if (m.photo)
        expect(tables[m.photo.table], m.photo.table).toContain(m.photo.fk);
      if (m.comment)
        expect(tables[m.comment.table], m.comment.table).toContain(
          m.comment.fk,
        );
    }
  });
  it("isolates favorites for all content types", () =>
    expect(new Set(MODULES.map(contentType)).size).toBe(MODULES.length));
  it("uses lifecycle statuses accepted by the live schema", () => {
    for (const m of MODULES) {
      const check = constraints.checks.find(
        (c) => c.table === m.table && /\bstatus\s*=/.test(c.definition),
      );
      const allowed = check
        ? [...check.definition.matchAll(/'([^']+)'::text/g)].map((x) => x[1])
        : undefined;
      if (allowed)
        for (const status of m.statuses ?? [])
          expect(allowed, m.table + "." + status.value).toContain(status.value);
    }
  });
});
