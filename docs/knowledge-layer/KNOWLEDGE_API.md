# Knowledge API

The Workspace and an external agent call these routes. This list does not copy their records. Zod schemas in `packages/contracts` are the response contract: `KnowledgeIndexSchema`, `KnowledgeObjectSummarySchema`, `ContextGraphSummarySchema`, `ContextPlanSchema`, `ContextSignalsSchema`, and `RegistryMaterialSchema`.

An agent principal with `memory.read` or `org.admin` may call the reads. `POST /knowledge/trust` and `POST /knowledge/impact` stay limited to a human principal with `memory.write` or `org.admin`. `POST /knowledge/local-files` stores a title, digest, and size for the registering owner. The path and the bytes are not fields.

GET /knowledge
GET /knowledge/objects
GET /knowledge/objects/{object_id}
POST /knowledge/objects/{object_id}/versions
POST /knowledge/relationships
GET /registry/materials
POST /registry/materials/{object_id}/economics
POST /knowledge/plans
GET /knowledge/plans/{plan_id}
GET /knowledge/plans/{plan_id}/signals
POST /knowledge/trust
POST /knowledge/impact
POST /knowledge/local-files
GET /knowledge/local-files/{object_id}
