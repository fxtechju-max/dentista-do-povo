import test from "node:test";
import assert from "node:assert/strict";
import { authorize, querySchema, type Actor } from "../src/integrations/supabase/protocol";
import { projection } from "../src/integrations/supabase/query.server";
import { createDataClient } from "../src/integrations/supabase/query";

const guest: Actor = { userId: null, admin: false, visitorHash: null };
const member: Actor = { ...guest, userId: "9b214b96-6c6a-468c-9fd9-b8cf99f41566" };
const admin: Actor = { ...member, admin: true };
const query = (table: string, action = "select", extra = {}) =>
  querySchema.parse({ table, action, ...extra });

test("guests and ordinary users cannot read or write clinical data", () => {
  for (const actor of [guest, member]) {
    for (const table of [
      "patients",
      "appointments",
      "payments",
      "budgets",
      "patient_anamnesis",
      "tooth_records",
      "clinical_notes",
      "prescriptions",
      "documents",
      "leads",
    ]) {
      for (const action of ["select", "insert", "update", "delete", "upsert"])
        assert.throws(() => authorize(query(table, action), actor));
    }
  }
});
test("public content is filtered on the server even if a visitor asks for drafts", () => {
  const result = authorize(
    query("blog_posts", "select", { filters: [{ column: "status", op: "eq", value: "rascunho" }] }),
    guest,
  );
  assert.deepEqual(result.filters.at(-1), { column: "status", op: "eq", value: "publicado" });
  assert.equal(
    authorize(query("clinic_settings"), guest).columns,
    "id, clinic_name, phone, address, instagram_url, facebook_url, whatsapp_number",
  );
});
test("invalid identifiers cannot enter SQL, including admin requests", () => {
  assert.throws(() => query("patients; DROP TABLE users"));
  assert.throws(() =>
    authorize(
      query("patients", "select", { filters: [{ column: "id OR 1=1", op: "eq", value: "x" }] }),
      admin,
    ),
  );
  assert.throws(() =>
    authorize(query("patients", "insert", { values: { password_hash: "x" } }), admin),
  );
  assert.throws(() =>
    projection(query("conversations", "select", { columns: "visitor_token_hash" })),
  );
  assert.throws(() =>
    projection(query("patients", "select", { columns: "(SELECT password_hash FROM users)" })),
  );
});
test("visitor cannot forge sender, timestamps, IDs or update another conversation", () => {
  const visitor = { ...guest, visitorHash: "token" };
  assert.throws(() =>
    authorize(query("messages", "insert", { values: { sender: "admin", content: "x" } }), visitor),
  );
  assert.throws(() =>
    authorize(
      query("conversations", "insert", { values: { visitor_name: "x", id: "chosen-id" } }),
      visitor,
    ),
  );
  assert.throws(() =>
    authorize(
      query("conversations", "update", {
        filters: [{ column: "id", op: "eq", value: "id" }],
        values: { visitor_name: "x" },
      }),
      visitor,
    ),
  );
});
test("profile identity is forced to the authenticated user", () => {
  const result = authorize(
    query("profiles", "upsert", { values: { id: "another-user", display_name: "Test" } }),
    member,
  );
  assert.equal(result.values?.["id"], member.userId);
  assert.equal(result.filters.at(-1)?.value, member.userId);
});
test("updates and deletes require a filter even for administrators", () => {
  assert.throws(() => authorize(query("patients", "delete"), admin));
  assert.throws(() => authorize(query("patients", "update", { values: { name: "x" } }), admin));
});
test("query builder retains filters, projection and mutation return semantics", async () => {
  let seen;
  const db = createDataClient(async (q) => {
    seen = q;
    return { data: { id: "created" }, error: null, count: null };
  });
  const result = await db
    .from("conversations")
    .insert({ visitor_name: "Visitor" })
    .select("id")
    .single();
  assert.equal(result.data?.id, "created");
  assert.equal(seen?.action, "insert");
  assert.equal(seen?.returning, true);
  assert.equal(seen?.single, "one");
});
