# Charter: software-engineer

Task: 20261006-knowledge-layer-p12. The owner asked to implement the plan.

`POST /knowledge/plans` stores a `band` on each citation. Organisation context (`source` or `approved`, and not a pack) is written before packs. Inferred context and every pack stay `pack`, including a pack with an accepted review. The cap of 40 drops packs before organisation context. A missing band is returned as `pack`. Local files are not cited. Another tenant's object is absent. No new route. Grants are unchanged.

The lead executes this charter. Do not start KL-P13.
