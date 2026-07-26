# MCP (Model Context Protocol) Management & Troubleshooting Guide

This guide details how MCP (Model Context Protocol) servers are configured, managed, and debugged within the NixOS workspace environment.

---

## 📌 Architecture Overview

Antigravity IDE relies on MCP servers to extend capabilities with external tools (e.g., local filesystem, chrome devtools, database proxies, GCP remote endpoints).

In this NixOS infrastructure:
1. **Declarative Runtime Ecosystem:** Node.js (`nodejs_22`), Chromium, Python 3 + IPyKernel, Graphviz, and Clickhouse CLI are declared in [`home/profiles/antigravity.nix`](file:///home/l7v/dev/projects/company/active/nixos/home/profiles/antigravity.nix).
2. **Environment Variables:** `CHROME_PATH`, `PUPPETEER_EXECUTABLE_PATH`, and `PLAYWRIGHT_BROWSERS_PATH` are auto-configured in `antigravity.nix` to point to Nix store patched binaries.
3. **Workspace Configuration:** Workspace-level MCP servers are configured in [`.mcp.json`](file:///home/l7v/dev/projects/company/active/nixos/.mcp.json).

---

## 🛠️ MCP Tool Dependency Matrix

| MCP Server | Executable | External Runtime & Env Vars |
| :--- | :--- | :--- |
| `chrome-devtools-mcp` | `npx` | `chromium`, `CHROME_PATH`, `PUPPETEER_EXECUTABLE_PATH` |
| `notebooks` | `node` | `python311`, `python311Packages.ipykernel` |
| `visualization` | `node` | `graphviz` |
| `clickhouse` | `npx` | `clickhouse` |
| `postman-mcp-server` | `npx` | `nodejs_22` |

---

## 🛠️ Common MCP Errors & Resolutions

### 1. `exec: "npx" / "node": executable file not found in $PATH`

- **Symptom:** MCP server fails to launch with a missing executable error.
- **Cause:** `node` or `npx` binary is not present in default `$PATH`.
- **Solution:** Re-build home profile with `nh home switch` or ensure `antigravity.nix` profile includes `pkgs.nodejs_22`.

### 2. GCP Remote Credential Forwarding Violations

- **Symptom:** `security violation: blocking GCP credential forwarding to untrusted domain: https://alloydb.${REGION}.rep.googleapis.com/mcp`
- **Cause:** Template placeholders like `${REGION}` are unresolved or the remote domain is not explicitly whitelisted for OAuth token forwarding.
- **Solution:**
  1. Replace `${REGION}` with the explicit target region (e.g., `europe-west1`).
  2. Use local ADC (Application Default Credentials) via `gcloud auth application-default login` when executing GCP commands locally.
  3. Ensure domain permissions are properly defined in your IDE configuration.

---

## ⚙️ Adding New MCP Servers to `.mcp.json`

To declare a new stdio-based MCP server in `.mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/l7v/dev/projects/company/active/nixos"
      ]
    }
  }
}
```

---

## 🔍 Validation & Verification

Run the validation script to verify your workspace syntax and NixOS expressions:

```bash
./scripts/validate.sh L7V
```
