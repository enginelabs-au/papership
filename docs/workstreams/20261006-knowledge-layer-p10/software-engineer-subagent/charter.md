# Charter: software-engineer

Task: 20261006-knowledge-layer-p10. The owner asked to implement the plan.

`loop.stage.artifact` carries `context_plan_id` and `version_ids` from the work item's own tenant. No plan, or a plan owned by another tenant, records null and an empty list. At most 40 version ids. The new fields do not include content, a body, or a path. The lookup does not read `schedules` or `strategy_records` and does not call Hermes. The artifact response the Workspace already reads carries the same two fields.

The lead executes this charter. Do not start KL-P11.
