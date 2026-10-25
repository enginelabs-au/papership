# First-party seed packages

Engine Labs publishes the first Agent Materials itself (D-39). These manifests point at folders that already exist in this repository, so the repository stays the source of truth (KL-D8) and nothing is copied.

Seeds are `private` to the publishing organisation. Flip a manifest to `"visibility": "public"` deliberately before sharing; public cannot be reversed (yank instead).

```bash
export PAPERSHIP_API_URL=http://127.0.0.1:8000   # your API
export PAPERSHIP_TOKEN=...                       # a principal with memory.write
python3 scripts/papership.py publish .cursor/skills/vercel-deploy-workflow --manifest registry/seed/engine-labs-vercel-deploy-workflow.json
python3 scripts/papership.py publish .cursor/skills/supabase-linked-migrations --manifest registry/seed/engine-labs-supabase-linked-migrations.json
python3 scripts/papership.py publish docs/knowledge-layer --manifest registry/seed/engine-labs-papership-knowledge-layer.json
```

Publishing is idempotent: identical content reports "already published". A content change needs a new version in the manifest.
