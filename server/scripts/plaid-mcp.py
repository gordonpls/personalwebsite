#!/usr/bin/env python3
"""
Plaid Dashboard MCP query tool.

Lets you ask Claude questions about your Plaid account with the Plaid Dashboard
MCP server attached as a live tool. Useful for investigating Item state,
trial-plan accounting, and whatever workarounds Plaid exposes that aren't in
the public docs.

Prereqs:
    pip install anthropic requests

Env:
    server/.env must have PLAID_CLIENT_ID + PLAID_SECRET_PRODUCTION (or
    PLAID_SECRET_SANDBOX if PLAID_ENV=sandbox).
    ANTHROPIC_API_KEY must be set in the shell env.

Usage:
    cd server
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 scripts/plaid-mcp.py "What is the Trial Plan Item-Add limit and how is it counted?"

Notes:
    - Each invocation mints a fresh short-lived Plaid OAuth token with the
      mcp:dashboard scope; the token never persists to disk.
    - Claude's responses + tool calls + tool results are printed in order so
      you can see exactly what the MCP server returned.
    - Tool results may include item_ids, institution metadata, etc. — DO NOT
      paste outputs into chat or commit them; treat them like access_tokens.
"""

import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing requests. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("Missing anthropic. Install with: pip install anthropic", file=sys.stderr)
    sys.exit(1)


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
PLAID_MCP_URL = "https://api.dashboard.plaid.com/mcp"
MODEL = "claude-sonnet-4-6"
BETAS = ["mcp-client-2025-11-20"]


def load_env_file(path: Path) -> dict:
    env: dict = {}
    if not path.exists():
        return env
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def plaid_oauth_url(env_name: str) -> str:
    # Same base hosts as the data API.
    if env_name == "sandbox":
        return "https://sandbox.plaid.com/oauth/token"
    return "https://production.plaid.com/oauth/token"


def fetch_dashboard_token(client_id: str, secret: str, env_name: str) -> str:
    url = plaid_oauth_url(env_name)
    resp = requests.post(
        url,
        json={
            "client_id": client_id,
            "secret": secret,
            "grant_type": "client_credentials",
            "scope": "mcp:dashboard",
        },
        timeout=15,
    )
    if not resp.ok:
        sys.exit(
            f"Plaid OAuth failed ({resp.status_code}): {resp.text}\n"
            f"Check PLAID_CLIENT_ID / PLAID_SECRET_PRODUCTION in server/.env."
        )
    body = resp.json()
    token = body.get("access_token")
    if not token:
        sys.exit(f"OAuth response missing access_token: {body}")
    return token


def ask(prompt: str) -> None:
    file_env = load_env_file(ENV_PATH)
    env_name = (file_env.get("PLAID_ENV") or os.environ.get("PLAID_ENV") or "production").lower()
    client_id = file_env.get("PLAID_CLIENT_ID") or os.environ.get("PLAID_CLIENT_ID")
    secret_key = "PLAID_SECRET_SANDBOX" if env_name == "sandbox" else "PLAID_SECRET_PRODUCTION"
    secret = file_env.get(secret_key) or os.environ.get(secret_key)
    anth_key = os.environ.get("ANTHROPIC_API_KEY")

    if not client_id or not secret:
        sys.exit(f"Missing PLAID_CLIENT_ID or {secret_key} in server/.env or shell env.")
    if not anth_key:
        sys.exit("Missing ANTHROPIC_API_KEY. Export it before running.")

    print(f"→ Plaid env: {env_name}", file=sys.stderr)
    print("→ Minting short-lived MCP dashboard token...", file=sys.stderr)
    dashboard_token = fetch_dashboard_token(client_id, secret, env_name)

    short_prompt = prompt if len(prompt) <= 100 else prompt[:97] + "..."
    print(f"→ Asking Claude (+ Plaid MCP): {short_prompt}\n", file=sys.stderr)

    client = anthropic.Anthropic(api_key=anth_key)
    response = client.beta.messages.create(
        betas=BETAS,
        model=MODEL,
        max_tokens=4096,
        mcp_servers=[
            {
                "type": "url",
                "url": PLAID_MCP_URL,
                "name": "Plaid Dashboard Server",
                "authorization_token": dashboard_token,
            }
        ],
        tools=[{"type": "mcp_toolset", "mcp_server_name": "Plaid Dashboard Server"}],
        messages=[{"role": "user", "content": prompt}],
    )

    # Pretty-print the interleaved text + tool calls + tool results.
    print("=" * 80)
    if not response.content:
        print("(empty response)")
        return
    for block in response.content:
        if block.type == "text" and block.text:
            print(block.text)
            print("-" * 80)
        elif block.type == "mcp_tool_use":
            print(f"\n>>> TOOL CALL: {block.name}")
            print(json.dumps(block.input, indent=2))
            print("-" * 80)
        elif block.type == "mcp_tool_result":
            if block.is_error:
                print("\n!!! TOOL ERROR")
            else:
                print("\n<<< TOOL RESULT")
                for item in (block.content or []):
                    if item.type == "text":
                        print(item.text)
            print("-" * 80)

    # Token accounting so you know what each query cost.
    if hasattr(response, "usage"):
        u = response.usage
        print(
            f"\n[usage] input_tokens={u.input_tokens} output_tokens={u.output_tokens}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(
            "Usage: python3 scripts/plaid-mcp.py \"<question>\"\n\n"
            "Starter prompts:\n"
            "  scripts/plaid-mcp.py \"List every Item on my account, including item_id, "
            "institution, created_at, and current status.\"\n"
            "  scripts/plaid-mcp.py \"How is the Trial Plan 'Item Adds' counter computed? "
            "Does removing an Item decrement it? Are there ways to reset it?\"\n"
            "  scripts/plaid-mcp.py \"I have 9/10 trial Item adds used. I only need 2 active "
            "Items for personal use. What strategies exist to stay free without hitting the cap?\"\n"
        )
    ask(sys.argv[1])
