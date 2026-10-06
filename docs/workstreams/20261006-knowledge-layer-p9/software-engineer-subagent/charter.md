# Charter: software-engineer

Task: 20261006-knowledge-layer-p9. The owner asked to implement the plan.

`POST /approvals` accepts `requested`, `approved`, and `rejected`. A missing decision still inserts `approved`. `requested` inserts `pending`. Approve and reject update one matching pending row in the caller tenant. An agent cannot decide. Reject with no pending row is 404. Extra keys, including a path, are rejected. Do not add a store-upload route. Do not add a Rust crate under `apps/mobile`.

The lead executes this charter. Do not start KL-P10.
