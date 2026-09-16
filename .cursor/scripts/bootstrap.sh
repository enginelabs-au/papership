#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
AGENT_CONFIG_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(CDPATH= cd -- "$AGENT_CONFIG_DIR/.." && pwd)

mkdir -p \
  "$REPO_ROOT/docs/blueprints" \
  "$REPO_ROOT/docs/plans" \
  "$REPO_ROOT/docs/decisions" \
  "$REPO_ROOT/docs/handover" \
  "$REPO_ROOT/docs/workstreams" \
  "$AGENT_CONFIG_DIR/agents" \
  "$AGENT_CONFIG_DIR/config" \
  "$AGENT_CONFIG_DIR/hooks" \
  "$AGENT_CONFIG_DIR/instructions" \
  "$AGENT_CONFIG_DIR/memory/memories" \
  "$AGENT_CONFIG_DIR/memory/blockers" \
  "$AGENT_CONFIG_DIR/memory/blockers-fixed" \
  "$AGENT_CONFIG_DIR/memory/runbooks" \
  "$AGENT_CONFIG_DIR/rules" \
  "$AGENT_CONFIG_DIR/scripts" \
  "$AGENT_CONFIG_DIR/skills" \
  "$AGENT_CONFIG_DIR/templates"

copy_if_missing() {
  src=$1
  dst=$2
  if [ ! -e "$dst" ]; then
    cp "$src" "$dst"
  fi
}

copy_if_missing "$AGENT_CONFIG_DIR/templates/docs-readme.md" "$REPO_ROOT/docs/README.md"
copy_if_missing "$AGENT_CONFIG_DIR/templates/plans-readme.md" "$REPO_ROOT/docs/plans/README.md"
copy_if_missing "$AGENT_CONFIG_DIR/templates/workstreams-readme.md" "$REPO_ROOT/docs/workstreams/README.md"

for dir in \
  "$AGENT_CONFIG_DIR/memory/memories" \
  "$AGENT_CONFIG_DIR/memory/blockers" \
  "$AGENT_CONFIG_DIR/memory/blockers-fixed"; do
  if [ -z "$(find "$dir" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -print -quit 2>/dev/null)" ]; then
    : > "$dir/.gitkeep"
  fi
done

SETTINGS_LINK="$AGENT_CONFIG_DIR/settings.json"
SETTINGS_TARGET="config/settings.json"

if [ -f "$AGENT_CONFIG_DIR/config/settings.json" ]; then
  if [ -L "$SETTINGS_LINK" ]; then
    current_target=$(readlink "$SETTINGS_LINK" || true)
    if [ "$current_target" != "$SETTINGS_TARGET" ]; then
      rm "$SETTINGS_LINK"
      ln -s "$SETTINGS_TARGET" "$SETTINGS_LINK"
    fi
  elif [ ! -e "$SETTINGS_LINK" ]; then
    ln -s "$SETTINGS_TARGET" "$SETTINGS_LINK"
  elif [ -f "$SETTINGS_LINK" ]; then
    compact=$(tr -d '[:space:]' < "$SETTINGS_LINK")
    if [ "$compact" = "$SETTINGS_TARGET" ] || [ "$compact" = 'config/settings.json' ]; then
      rm "$SETTINGS_LINK"
      ln -s "$SETTINGS_TARGET" "$SETTINGS_LINK"
    fi
  fi
fi

required_files="
$REPO_ROOT/AGENTS.md
$REPO_ROOT/.cursorignore
$REPO_ROOT/docs/handover/agent-governance-operator-setup.md
$REPO_ROOT/.github/workflows/agent-governance.yml
$AGENT_CONFIG_DIR/AGENTS.md
$AGENT_CONFIG_DIR/BOOTSTRAP.md
$AGENT_CONFIG_DIR/INSTRUCTIONS.md
$AGENT_CONFIG_DIR/USER.md
$AGENT_CONFIG_DIR/STATE.md
$AGENT_CONFIG_DIR/SKILLS.md
$AGENT_CONFIG_DIR/TOOLS.md
$AGENT_CONFIG_DIR/memory/MEMORY.md
$AGENT_CONFIG_DIR/instructions/PROJECT_PLANNING.md
$AGENT_CONFIG_DIR/instructions/STRATEGY.md
$AGENT_CONFIG_DIR/instructions/SUBAGENTS.md
$AGENT_CONFIG_DIR/instructions/ROLES.md
$AGENT_CONFIG_DIR/agents/product-manager-subagent.md
$AGENT_CONFIG_DIR/agents/ui-ux-developer-subagent.md
$AGENT_CONFIG_DIR/agents/software-engineer-subagent.md
$AGENT_CONFIG_DIR/agents/security-engineer-subagent.md
$AGENT_CONFIG_DIR/agents/growth-marketing-subagent.md
$AGENT_CONFIG_DIR/agents/project-lead-subagent.md
$AGENT_CONFIG_DIR/hooks.json
$AGENT_CONFIG_DIR/hooks/policy.mjs
$AGENT_CONFIG_DIR/hooks/policy.test.mjs
$AGENT_CONFIG_DIR/cli.json
$AGENT_CONFIG_DIR/sandbox.json
$AGENT_CONFIG_DIR/permissions.json
$AGENT_CONFIG_DIR/scripts/validate-agent-config.mjs
$AGENT_CONFIG_DIR/templates/workstreams-readme.md
$AGENT_CONFIG_DIR/templates/workstream-manifest-template.md
$AGENT_CONFIG_DIR/templates/role-charter-template.md
$AGENT_CONFIG_DIR/templates/role-plan-template.md
$AGENT_CONFIG_DIR/templates/role-evidence-template.md
$AGENT_CONFIG_DIR/templates/role-handoff-template.md
$AGENT_CONFIG_DIR/templates/owner-handoff-template.md
$AGENT_CONFIG_DIR/instructions/LAUNCH.md
$AGENT_CONFIG_DIR/skills/launch-pipeline/SKILL.md
$AGENT_CONFIG_DIR/skills/launch-pipeline/scripts/preflight.mjs
$AGENT_CONFIG_DIR/skills/launch-pipeline/scripts/validate-launch.mjs
"

printf '%s\n' "$required_files" | while IFS= read -r path; do
  [ -z "$path" ] && continue
  if [ ! -s "$path" ]; then
    printf 'bootstrap error: missing or empty required file: %s\n' "$path" >&2
    exit 1
  fi
done

if ! command -v node >/dev/null 2>&1; then
  printf 'bootstrap error: node is required for fail-closed policy validation\n' >&2
  exit 1
fi

node "$AGENT_CONFIG_DIR/scripts/validate-agent-config.mjs"
node "$AGENT_CONFIG_DIR/skills/launch-pipeline/scripts/validate-launch.mjs"

printf 'bootstrap complete: %s\n' "$REPO_ROOT"
