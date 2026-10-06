# Charter: software-engineer

Task: 20261006-knowledge-layer-p8. The owner asked to finish the plan and implement it.

Register `POST /knowledge/local-files` and read `GET /knowledge/local-files/{object_id}`. The body is title, sha256 digest, and byte size. Extra keys are rejected. The size is a decimal locator. The path and the bytes are not stored. The owner can read the pointer. Another principal, including `org.admin` in the same tenant, and another organisation, receive 404. The knowledge list omits `local_file` rows for everyone except the owner.

The Rust command opens the file dialog inside Rust, hashes the bytes, and returns title, digest, and size. JavaScript does not pass a path. The path stays in the app-data map. Do not grant a recursive home read. Do not grant `dialog:allow-open` to the webview, because that plugin command returns a path. Keep the keychain commands. Do not widen `shell:allow-open`.

The lead executes this charter. Do not start KL-P9.
