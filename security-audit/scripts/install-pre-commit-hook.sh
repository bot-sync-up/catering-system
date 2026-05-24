#!/usr/bin/env bash
# install-pre-commit-hook.sh — Install gitleaks pre-commit hook
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

if ! command -v gitleaks >/dev/null 2>&1; then
    echo "Installing gitleaks..."
    if [[ "$(uname -s)" == "Darwin" ]]; then
        brew install gitleaks
    elif [[ "$(uname -s)" == "Linux" ]]; then
        curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | sh -s -- -b /usr/local/bin
    else
        echo "Install gitleaks manually: https://github.com/gitleaks/gitleaks"
        exit 1
    fi
fi

cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# Auto-installed pre-commit hook: secrets scan + lint
set -e

echo "[pre-commit] gitleaks staged scan..."
gitleaks protect --staged \
    --config security-audit/.gitleaks.toml \
    --redact --verbose \
    || { echo "BLOCKED: secrets detected. Remove and retry."; exit 1; }

# Optional: semgrep on staged files
if command -v semgrep >/dev/null 2>&1; then
    echo "[pre-commit] semgrep on staged files..."
    STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|tsx|jsx|py)$' || true)
    if [[ -n "$STAGED" ]]; then
        echo "$STAGED" | xargs semgrep --config security-audit/configs/semgrep.yml --error --quiet \
            || { echo "BLOCKED: semgrep findings."; exit 1; }
    fi
fi

echo "[pre-commit] OK"
EOF

chmod +x "$HOOK_FILE"
echo "Installed pre-commit hook -> $HOOK_FILE"
