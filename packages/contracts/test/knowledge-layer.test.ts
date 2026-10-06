import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AgentProfileSchema,
  ApprovalListRowSchema,
  AuditListRowSchema,
  ContextGraphSummarySchema,
  ContextPlanSchema,
  ContextSignalsSchema,
  KnowledgeIndexSchema,
  LocalFileSchema,
  ApprovalDecisionSchema,
  RegistryMaterialSchema,
  ContextRelationshipSchema,
  ContextSourceSchema,
  ContextVersionSchema,
  KnowledgeObjectSummarySchema,
} from "../src/entities.ts";

test("workspace foundation summaries accept nullable context and omit bodies", () => {
  const agent = AgentProfileSchema.parse({
    principal_id: "principal-agent",
    kind: "agent",
    display_name: "principal-agent",
    purpose: "",
    status: "active",
    context_plan_id: null,
    grants: [],
    task: null,
    unavailable: ["trust", "impact", "cost", "missing"],
  });
  assert.equal(agent.context_plan_id, null);
  const knowledge = KnowledgeObjectSummarySchema.parse({
    id: "mem-1",
    kind: "project",
    class: "approved",
    version: 1,
    title: "mem-1",
    source: "seed",
    owner_principal_id: null,
    parent_id: null,
  });
  assert.equal("content" in knowledge, false);
  ApprovalListRowSchema.parse({
    id: "approval-1",
    approval_class: "approval.release",
    requester_id: "principal-agent",
    target_id: "work-1",
    target_version: "1",
    status: "approved",
  });
  AuditListRowSchema.parse({
    actor_id: "principal-founder",
    action: "memory.read",
    target_type: "memory",
    target_id: "mem-1",
    created_at: "2026-10-06T00:00:00Z",
  });
});

test("context graph records are metadata and a fixed relationship vocabulary", () => {
  const hex = "a".repeat(64);
  const summary = ContextGraphSummarySchema.parse({
    id: hex,
    kind: "project",
    class: "approved",
    version: 1,
    version_id: hex,
    title: "mem-1",
    source: "seed",
    source_kind: "memory",
    source_id: "mem-1",
    owner_principal_id: null,
    relationship_count: 0,
  });
  assert.equal("content" in summary, false);
  assert.throws(() => ContextGraphSummarySchema.parse({ ...summary, content: "secret-body" }));
  ContextVersionSchema.parse({
    id: hex,
    version_number: 1,
    parent_version_id: null,
    digest: hex,
    class: "source",
    created_at: "2026-10-06T00:00:00Z",
  });
  ContextRelationshipSchema.parse({
    id: hex,
    from_object_id: hex,
    to_object_id: "b".repeat(64),
    relationship: "derived_from",
    from_version_id: null,
    to_version_id: null,
  });
  assert.throws(() => ContextRelationshipSchema.parse({
    id: hex,
    from_object_id: hex,
    to_object_id: hex,
    relationship: "trusts",
    from_version_id: null,
    to_version_id: null,
  }));
  ContextSourceSchema.parse({ locator: "mem-1", retrieved_at: "2026-10-06T00:00:00Z" });
  const material = RegistryMaterialSchema.parse({
    id: hex,
    title: "Education records (demo)",
    kind: "pack",
    class: "inferred",
    locator: "education-demo",
    object_id: hex,
    economic_model: null,
    list_usd: null,
  });
  assert.equal("content" in material, false);
  assert.throws(() => RegistryMaterialSchema.parse({ ...material, price: "10" }));
  const plan = ContextPlanSchema.parse({
    id: "plan-1",
    agent_principal_id: "principal-agent",
    work_item_id: "work-1",
    gap: null,
    citations: [{ object_id: hex, version_id: hex }],
  });
  assert.equal("trust" in plan, false);
  ContextPlanSchema.parse({
    id: "plan-empty",
    agent_principal_id: "principal-agent",
    work_item_id: "work-1",
    gap: "No visible context is attached to this agent and task.",
    citations: [],
  });
  const signals = ContextSignalsSchema.parse({
    plan_id: "plan-1",
    signals: [{ version_id: hex, trust: { verdict: "accepted", source: "assessment" }, impact: "helped" }],
  });
  assert.equal("score" in signals, false);
  ContextSignalsSchema.parse({
    plan_id: "plan-1",
    signals: [{ version_id: hex, trust: { verdict: "pending", source: "pack_review" }, impact: null }],
  });
  assert.throws(() => ContextSignalsSchema.parse({
    plan_id: "plan-1",
    signals: [{ version_id: hex, trust: null, impact: "helped", content: "secret" }],
  }));
  const index = KnowledgeIndexSchema.parse({
    resources: [{ name: "signals", method: "GET", path: "/knowledge/plans/{plan_id}/signals", human_writer: false }],
  });
  assert.equal("score" in index, false);
  assert.throws(() => KnowledgeIndexSchema.parse({
    resources: [{ name: "objects", method: "GET", path: "/knowledge/objects", human_writer: false, title: "mem-1" }],
  }));
  const localFile = LocalFileSchema.parse({
    id: hex,
    title: "notes.txt",
    digest: hex,
    byte_size: 4,
    version_id: hex,
  });
  assert.equal("path" in localFile, false);
  assert.throws(() => LocalFileSchema.parse({
    id: hex,
    title: "notes.txt",
    digest: hex,
    byte_size: 4,
    version_id: hex,
    content: "nope",
  }));
  const decision = ApprovalDecisionSchema.parse({ id: "appr-1", status: "rejected" });
  assert.equal("path" in decision, false);
  assert.throws(() => ApprovalDecisionSchema.parse({ id: "appr-1", status: "voided" }));
});
