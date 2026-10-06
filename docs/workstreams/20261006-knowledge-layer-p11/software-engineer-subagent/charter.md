# Charter: software-engineer

Task: 20261006-knowledge-layer-p11. The owner asked to implement the plan.

`POST /registry/materials/{object_id}/economics` lets a human with `memory.write` or `org.admin` set `free`, `listed`, or `unavailable` on a material in the caller tenant. `listed` stores `list_usd`. The other models store no amount. An agent is 403. Another tenant or a non-material is 404. Extra keys are 422. The materials list returns the two fields. `human_writer` stays false. Charges stay off. The lookup does not write an allowance.

The lead executes this charter. Do not start KL-P12.
