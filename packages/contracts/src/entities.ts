import { z } from "zod";

const Id = z.string().min(1);
const Timestamp = z.string().min(1);

export const OrganisationSchema = z.object({
  id: Id,
  tenant_id: Id,
  name: z.string().min(1),
  created_at: Timestamp,
});

export const LegalEntitySchema = z.object({
  id: Id,
  organisation_id: Id,
  name: z.string().min(1),
  created_at: Timestamp,
});

export const DepartmentSchema = z.object({
  id: Id,
  organisation_id: Id,
  name: z.string().min(1),
  created_at: Timestamp,
});

export const TeamSchema = z.object({
  id: Id,
  department_id: Id.optional(),
  organisation_id: Id,
  name: z.string().min(1),
  created_at: Timestamp,
});

export const LocationSchema = z.object({
  id: Id,
  organisation_id: Id,
  name: z.string().min(1),
  created_at: Timestamp,
});

export const ProjectSchema = z.object({
  id: Id,
  organisation_id: Id,
  name: z.string().min(1),
  status: z.string().min(1),
  created_at: Timestamp,
});

export const TaskSchema = z.object({
  id: Id,
  project_id: Id.optional(),
  organisation_id: Id,
  title: z.string().min(1),
  status: z.string().min(1),
  created_at: Timestamp,
});

export const ProviderAccountSchema = z.object({
  id: Id,
  organisation_id: Id,
  provider: z.string().min(1),
  installation_pointer: z.string().min(1),
  created_at: Timestamp,
});

export const PrincipalKindSchema = z.enum(["human", "agent"]);

export const PrincipalSchema = z.object({
  id: Id,
  tenant_id: Id,
  kind: PrincipalKindSchema,
  seat_id: Id.optional(),
  grant_version: z.number().int().nonnegative(),
  created_at: Timestamp,
});

export const SeatTemplateIdSchema = z.enum(["founder", "project_lead", "operator"]);

export const SeatTemplateSchema = z.object({
  id: SeatTemplateIdSchema,
  label: z.string().min(1),
  default_grants: z.array(z.string()),
});

export const ApprovalClassSchema = z
  .string()
  .regex(/^approval\.[a-z][a-z0-9_.]*$/, "approval class must be approval.<class>");

export const GrantClassSchema = z.union([
  z.enum([
    "org.admin",
    "ledger.read",
    "ledger.write",
    "run.start",
    "run.cancel",
    "registry.read",
    "memory.read",
    "memory.write",
    "usage.read",
    "records.read",
    "search.read",
    "aggregates.read",
    "attachments.read",
    "attachments.write",
    "notifications.read",
    "repo.branch",
    "repo.change",
    "repo.check",
    "repo.release",
    "billing.admin",
    "data.export",
    "data.erase",
    "connector.admin",
  ]),
  ApprovalClassSchema,
]);

export const GrantSchema = z.object({
  id: Id,
  principal_id: Id,
  tenant_id: Id,
  grant_class: GrantClassSchema,
  scope: z.string().min(1),
  created_at: Timestamp,
});

export const PrioritySchema = z.object({
  id: Id,
  tenant_id: Id,
  title: z.string().min(1),
  owner_principal_id: Id,
  created_at: Timestamp,
  updated_at: Timestamp,
});

export const PlanSchema = z.object({
  id: Id,
  tenant_id: Id,
  title: z.string().min(1),
  priority_id: Id.optional(),
  created_at: Timestamp,
  updated_at: Timestamp,
});

export const WorkItemSchema = z.object({
  id: Id,
  tenant_id: Id,
  title: z.string().min(1),
  plan_id: Id.optional(),
  stage: z.string().min(1),
  stage_changed_at: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp,
});

export const AssignmentSchema = z.object({
  id: Id,
  tenant_id: Id,
  work_item_id: Id,
  principal_id: Id,
  created_at: Timestamp,
});

export const DependencySchema = z.object({
  id: Id,
  tenant_id: Id,
  from_work_item_id: Id,
  to_work_item_id: Id,
  created_at: Timestamp,
});

export const SourceReferenceSchema = z.object({
  id: Id,
  tenant_id: Id,
  work_item_id: Id.optional(),
  provider: z.string().min(1),
  installation_pointer: z.string().min(1),
  created_at: Timestamp,
});

export const JobStatusSchema = z.enum([
  "queued",
  "running",
  "cancelled",
  "completed",
  "failed",
]);

export const JobSchema = z.object({
  id: Id,
  tenant_id: Id,
  status: JobStatusSchema,
  purpose: z.string().min(1),
  created_at: Timestamp,
  updated_at: Timestamp,
});

export const JobEventSchema = z.object({
  id: z.number().int().positive(),
  job_id: Id,
  tenant_id: Id,
  type: z.string().min(1),
  payload: z.record(z.unknown()),
  created_at: Timestamp,
});

/** Nine PRD-E.2 fields — all required. Phase 1 model_configuration is "none". */
export const RunSchema = z.object({
  id: Id,
  job_id: Id,
  tenant_id: Id,
  sponsor: Id,
  acting_identity: Id,
  purpose: z.string().min(1),
  scope: z.string().min(1),
  policy_version: z.string().min(1),
  model_configuration: z.literal("none"),
  budget: z.string().min(1),
  deadline: Timestamp,
  accountable_owner: Id,
  created_at: Timestamp,
});

export const ReceiptSchema = z.object({
  id: Id,
  job_id: Id,
  tenant_id: Id,
  step_name: z.string().min(1),
  idempotency_key: z.string().min(1),
  created_at: Timestamp,
});

export const AuditRecordSchema = z.object({
  id: Id,
  tenant_id: Id,
  actor_principal_id: Id,
  action: z.string().min(1),
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  created_at: Timestamp,
});

export const EntitlementSchema = z.object({
  id: Id,
  tenant_id: Id,
  principal_id: Id,
  feature: z.string().min(1),
  created_at: Timestamp,
});

export const AgentProfileSchema = z.object({
  principal_id: Id,
  kind: PrincipalKindSchema,
  display_name: z.string().min(1),
  purpose: z.string(),
  status: z.string().min(1),
  context_plan_id: z.string().min(1).nullable(),
  grants: z.array(z.string()),
  task: z
    .object({
      id: Id,
      purpose: z.string(),
      created_at: Timestamp,
    })
    .nullable(),
  unavailable: z.array(z.enum(["trust", "impact", "cost", "missing"])),
});

export const KnowledgeObjectSummarySchema = z.object({
  id: Id,
  kind: z.string().min(1),
  class: z.string().min(1),
  version: z.number().int(),
  title: z.string(),
  source: z.string(),
  owner_principal_id: z.string().nullable(),
  parent_id: z.string().nullable(),
});

const ContextClassSchema = z.enum(["source", "approved", "inferred"]);
const VersionIdSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const ContextGraphSummarySchema = z.object({
  id: VersionIdSchema,
  kind: z.string().min(1),
  class: ContextClassSchema,
  version: z.number().int().positive(),
  version_id: VersionIdSchema,
  title: z.string(),
  source: z.string(),
  source_kind: z.enum(["memory", "artifact", "attachment", "connection", "registry", "pack"]),
  source_id: z.string().min(1),
  owner_principal_id: z.string().nullable(),
  relationship_count: z.number().int().nonnegative(),
}).strict();

export const ContextVersionSchema = z.object({
  id: VersionIdSchema,
  version_number: z.number().int().positive(),
  parent_version_id: VersionIdSchema.nullable(),
  digest: VersionIdSchema,
  class: ContextClassSchema,
  created_at: Timestamp,
});

export const ContextRelationshipSchema = z.object({
  id: VersionIdSchema,
  from_object_id: VersionIdSchema,
  to_object_id: VersionIdSchema,
  relationship: z.enum([
    "requires",
    "recommends",
    "conflicts_with",
    "supersedes",
    "derived_from",
    "validated_by",
    "used_with",
    "compatible_with",
    "scoped_to",
    "owned_by",
    "published_by",
    "retrieved_from",
    "invalidated_by",
    "improved",
    "degraded",
  ]),
  from_version_id: VersionIdSchema.nullable(),
  to_version_id: VersionIdSchema.nullable(),
});

export const ContextSourceSchema = z.object({
  locator: z.string().min(1),
  retrieved_at: Timestamp,
});

export const ContextPlanCitationSchema = z.object({
  object_id: VersionIdSchema,
  version_id: VersionIdSchema,
}).strict();

export const ContextPlanSchema = z.object({
  id: z.string().min(1),
  agent_principal_id: z.string().min(1),
  work_item_id: z.string().min(1),
  gap: z.string().nullable(),
  citations: z.array(ContextPlanCitationSchema),
}).strict();

export const ContextSignalTrustSchema = z.object({
  verdict: z.enum(["accepted", "refused", "none", "pending"]),
  source: z.enum(["assessment", "pack_review"]),
}).strict();

export const ContextSignalSchema = z.object({
  version_id: VersionIdSchema,
  trust: ContextSignalTrustSchema.nullable(),
  impact: z.enum(["helped", "harmed", "unknown"]).nullable(),
}).strict();

export const ContextSignalsSchema = z.object({
  plan_id: z.string().min(1),
  signals: z.array(ContextSignalSchema),
}).strict();

export const KnowledgeResourceSchema = z.object({
  name: z.string().min(1),
  method: z.enum(["GET", "POST"]),
  path: z.string().min(1),
  human_writer: z.boolean(),
}).strict();

export const KnowledgeIndexSchema = z.object({
  resources: z.array(KnowledgeResourceSchema),
}).strict();

export const LocalFileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  byte_size: z.number().int().nonnegative(),
  version_id: z.string().min(1),
}).strict();

export const RegistryMaterialSchema = z.object({
  id: VersionIdSchema,
  title: z.string(),
  kind: z.string().min(1),
  class: ContextClassSchema,
  locator: z.string().min(1),
  object_id: VersionIdSchema,
  economic_model: z.enum(["free", "listed", "unavailable"]).nullable(),
  list_usd: z.number().int().nonnegative().nullable(),
}).strict();

export const ApprovalListRowSchema = z.object({
  id: Id,
  approval_class: z.string().min(1),
  requester_id: Id,
  target_id: Id,
  target_version: z.string().min(1),
  status: z.string().min(1),
});

export const ApprovalDecisionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
}).strict();

export const AuditListRowSchema = z.object({
  actor_id: Id,
  action: z.string().min(1),
  target_type: z.string().min(1),
  target_id: Id,
  created_at: Timestamp,
});

export const ENTITY_SCHEMAS = {
  organisation: OrganisationSchema,
  legal_entity: LegalEntitySchema,
  department: DepartmentSchema,
  team: TeamSchema,
  location: LocationSchema,
  project: ProjectSchema,
  task: TaskSchema,
  provider_account: ProviderAccountSchema,
  principal: PrincipalSchema,
  seat_template: SeatTemplateSchema,
  grant: GrantSchema,
  priority: PrioritySchema,
  plan: PlanSchema,
  work_item: WorkItemSchema,
  assignment: AssignmentSchema,
  dependency: DependencySchema,
  source_reference: SourceReferenceSchema,
  job: JobSchema,
  job_event: JobEventSchema,
  run: RunSchema,
  receipt: ReceiptSchema,
  audit_record: AuditRecordSchema,
} as const;
