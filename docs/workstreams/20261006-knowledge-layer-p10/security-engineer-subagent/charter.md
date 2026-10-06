# Charter: security-engineer

Task: 20261006-knowledge-layer-p10. Read-only review after implementation.

Confirm the stage event cites version ids only, that another tenant's plan is not cited, and that the new lookup does not call Hermes or read `schedules` or `strategy_records`. Confirm the change does not copy artifact markdown, memory content, a local path, or a file. Confirm charges, usage emission, the marketing site, and test hooks are untouched.

Do not edit product code. Do not start KL-P11. Verdict BLOCKED only if a foreign plan is cited, a body or path is added to the citation, or the lookup calls an external tool.
