import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDataClient } from "../src/integrations/mysql/query";
import { executeQuery } from "../src/integrations/mysql/query.server";
import { getPool } from "../src/integrations/mysql/pool.server";

test(
  "MySQL: CRUD, dates, money, JSON, ownership, joins, upserts and history protection",
  { skip: !process.env["MYSQL_TEST_URL"] },
  async () => {
    const url = new URL(process.env["MYSQL_TEST_URL"]!);
    assert.match(
      url.pathname,
      /^\/ddp_test_[a-z0-9_]+$/i,
      "Integration tests require a dedicated ddp_test_* database.",
    );
    process.env["MYSQL_URL"] = url.toString();
    const admin = createDataClient((q) =>
      executeQuery(q, { userId: randomUUID(), admin: true, visitorHash: null }),
    );
    const visitor = createDataClient((q) =>
      executeQuery(q, { userId: null, admin: false, visitorHash: "a".repeat(64) }),
    );
    const other = createDataClient((q) =>
      executeQuery(q, { userId: null, admin: false, visitorHash: "b".repeat(64) }),
    );
    const patientIds: string[] = [];
    let conversationId = "";
    const slug = `test-${randomUUID()}`;
    try {
      const patient = (
        await admin
          .from("patients")
          .insert({ name: "Paciente de teste 🦷", email: "test@example.invalid" })
          .select()
          .single()
      ).data!;
      patientIds.push(patient.id);
      assert.equal(patient.name, "Paciente de teste 🦷");
      const scheduled = "2026-10-01T14:30:00.000Z";
      const appointment = (
        await admin
          .from("appointments")
          .insert({ patient_id: patient.id, treatment: "Limpeza", scheduled_at: scheduled })
          .select("id, scheduled_at, patients(name)")
          .single()
      ).data!;
      assert.equal(appointment.scheduled_at, scheduled);
      assert.equal(appointment.patients?.name, patient.name);
      const payment = (
        await admin
          .from("payments")
          .insert({ patient_id: patient.id, appointment_id: appointment.id, amount: 123.45 })
          .select()
          .single()
      ).data!;
      assert.equal(payment.amount, 123.45);
      await assert.rejects(async () => {
        await admin.from("payments").insert({ amount: -1 });
      });
      await admin.from("patient_anamnesis").upsert({ patient_id: patient.id, has_diabetes: true });
      assert.equal(
        (await admin.from("patient_anamnesis").select().eq("patient_id", patient.id).single()).data
          ?.has_diabetes,
        true,
      );
      await admin
        .from("tooth_records")
        .upsert(
          { patient_id: patient.id, tooth_number: 11, condition: "carie" },
          { onConflict: "patient_id,tooth_number" },
        );
      await admin
        .from("tooth_records")
        .upsert(
          { patient_id: patient.id, tooth_number: 11, condition: "restaurado" },
          { onConflict: "patient_id,tooth_number" },
        );
      const teeth = await admin.from("tooth_records").select().eq("patient_id", patient.id);
      assert.equal(teeth.data?.length, 1);
      assert.equal(teeth.data?.[0]?.condition, "restaurado");
      await admin.from("clinic_settings").upsert({ id: "test", disabled_modules: ["crm", "blog"] });
      assert.deepEqual(
        (await admin.from("clinic_settings").select().eq("id", "test").single()).data
          ?.disabled_modules,
        ["crm", "blog"],
      );
      await assert.rejects(async () => {
        await admin.from("patients").delete().eq("id", patient.id);
      }, /foreign key constraint/i);
      conversationId = (
        await visitor
          .from("conversations")
          .insert({ visitor_name: "Visitante" })
          .select("id")
          .single()
      ).data!.id;
      await visitor
        .from("messages")
        .insert({ conversation_id: conversationId, sender: "visitor", content: "Olá" });
      assert.equal(
        (await other.from("messages").select().eq("conversation_id", conversationId)).data?.length,
        0,
      );
      assert.equal(
        (await other.from("conversations").select().eq("id", conversationId)).data?.length,
        0,
      );
      await assert.rejects(async () => {
        await other
          .from("messages")
          .insert({ conversation_id: conversationId, sender: "visitor", content: "Invasão" });
      }, /Conversa não encontrada/);
      await admin
        .from("messages")
        .insert({ conversation_id: conversationId, sender: "admin", content: "Bem-vindo" });
      assert.equal(
        (await visitor.from("messages").select().eq("conversation_id", conversationId)).data
          ?.length,
        2,
      );
      assert.equal(
        (
          await admin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conversationId)
        ).count,
        2,
      );
      assert.equal(
        (
          await admin
            .from("messages")
            .select()
            .eq("conversation_id", conversationId)
            .in("sender", ["admin"])
            .limit(1)
        ).data?.[0]?.content,
        "Bem-vindo",
      );
      await admin.from("blog_posts").insert({ title: "Rascunho", slug, content: "Privado" });
      assert.equal((await visitor.from("blog_posts").select().eq("slug", slug)).data?.length, 0);
      await admin.from("blog_posts").update({ status: "publicado" }).eq("slug", slug);
      assert.equal((await visitor.from("blog_posts").select().eq("slug", slug)).data?.length, 1);
    } finally {
      if (conversationId) await admin.from("conversations").delete().eq("id", conversationId);
      await admin.from("blog_posts").delete().eq("slug", slug);
      await admin.from("clinic_settings").delete().eq("id", "test");
      for (const id of patientIds) {
        for (const table of [
          "payments",
          "appointments",
          "patient_anamnesis",
          "tooth_records",
        ] as const)
          await admin.from(table).delete().eq("patient_id", id);
        await admin.from("patients").delete().eq("id", id);
      }
      await getPool().end();
    }
  },
);
