# Charter: security-engineer

Task: 20261006-knowledge-layer-p8. Read-only review after implementation.

Confirm the absolute path and the file bytes do not reach the API or SQLite. Confirm JavaScript cannot supply the path. Confirm a non-owner cannot read or list the pointer, including another principal with `org.admin` in the same tenant. Confirm capabilities do not grant a recursive home read and do not let the webview receive a picked path through `dialog:allow-open`.

BLOCKED only if a path comes from the webview, bytes or a path reach the API, a non-owner can read or list the pointer, a recursive home grant is added, or the marketing site, charges, test hooks, or a store on Vercel are touched.

DNS residual OT-89 and KL-SEC-01 / KL-SEC-02 are not new BLOCKED findings. Do not edit product files. Do not write the handoff file; the lead records the verdict.
