#!/usr/bin/env bash
# Sets up a contributor's Mac so her Claude Code can only propose changes.
# Run by Ben, on her Mac, from the root of her clone:
#
#   pbcopy <<< '<hosted anon key>'      # the PUBLIC anon key, nothing else
#   tools/contributor/install.sh
#
# Asks for the admin password once: the guard is copied root-owned into
# /Library/Application Support/ClaudeCode/, which is what stops her own
# Claude session (running as her user) from editing it. Safe to run again.
set -euo pipefail

HOSTED_URL='https://xliwtiiopwyfunxkdmxh.supabase.co'
MANAGED='/Library/Application Support/ClaudeCode'
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

fail() { echo "✗ $*" >&2; exit 1; }
ok() { echo "✓ $*"; }

# ── tools ────────────────────────────────────────────────────────────────────
command -v git >/dev/null || fail 'git missing: xcode-select --install'
command -v node >/dev/null || fail 'node missing: brew install node@22'
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]] || fail "Node 22 required, found $(node -v)"
command -v pnpm >/dev/null || fail 'pnpm missing: corepack enable'
command -v gh >/dev/null || fail 'gh missing: brew install gh'
gh auth status >/dev/null 2>&1 || fail 'gh not signed in: gh auth login (as HER GitHub account)'
[[ "$(gh api user --jq .login)" != product-ben ]] || fail "gh is signed in as product-ben — the ruleset only holds against her own account"
ok "tools: git, node $(node -v), pnpm, gh as $(gh api user --jq .login)"

# ── the guard, root-owned ────────────────────────────────────────────────────
sudo mkdir -p "$MANAGED"
if [[ -f "$MANAGED/managed-settings.json" ]] && ! cmp -s "$MANAGED/managed-settings.json" "$HERE/managed-settings.json"; then
  sudo cp "$MANAGED/managed-settings.json" "$MANAGED/managed-settings.json.bak.$(date +%s)"
  echo '  (kept a backup of the managed settings that were there)'
fi
sudo install -o root -g wheel -m 644 "$HERE/managed-settings.json" "$MANAGED/managed-settings.json"
sudo install -o root -g wheel -m 644 "$HERE/musie-guard.mjs" "$MANAGED/musie-guard.mjs"
ok "guard installed in $MANAGED"

# ── her instructions ─────────────────────────────────────────────────────────
mkdir -p "$HOME/.claude"
if [[ -f "$HOME/.claude/CLAUDE.md" ]] && ! cmp -s "$HOME/.claude/CLAUDE.md" "$HERE/CLAUDE.md"; then
  cp "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.bak.$(date +%s)"
  echo '  (kept a backup of the CLAUDE.md that was there)'
fi
cp "$HERE/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
ok '~/.claude/CLAUDE.md'

# ── the app, against hosted ──────────────────────────────────────────────────
ENV="$ROOT/apps/web/.env.local"
if [[ -f "$ENV" ]] && grep -q "^VITE_SUPABASE_URL=$HOSTED_URL" "$ENV"; then
  ok 'apps/web/.env.local already points at hosted'
else
  KEY="$(pbpaste | tr -d '[:space:]')"
  [[ -n "$KEY" ]] || fail 'clipboard is empty: pbcopy the hosted ANON key first'
  [[ "$KEY" != sb_secret_* ]] || fail 'that is a SECRET key. The anon / publishable key only'
  if [[ "$KEY" == eyJ* ]]; then
    ROLE="$(node -e 'const p=process.argv[1].split(".")[1];console.log(JSON.parse(Buffer.from(p,"base64url")).role)' "$KEY")"
    [[ "$ROLE" == anon ]] || fail "that key's role is '$ROLE'. The anon key only"
  elif [[ "$KEY" != sb_publishable_* ]]; then
    fail 'the clipboard does not hold a Supabase key'
  fi
  [[ ! -f "$ENV" ]] || cp "$ENV" "$ENV.bak.$(date +%s)"
  printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\n' "$HOSTED_URL" "$KEY" > "$ENV"
  printf '' | pbcopy
  ok 'apps/web/.env.local → hosted, anon key (clipboard cleared)'
fi

# ── dependencies ─────────────────────────────────────────────────────────────
(cd "$ROOT" && pnpm install --silent)
ok 'pnpm install'

cat <<'EOF'

Done. Now, with her:
  1. Open the Claude app (Code tab) or VS Code on this folder and sign in.
  2. Ask Claude: "push to main" — the guard must refuse.
  3. /neu with a harmless idea (one German string), then /vorschlagen.
EOF
