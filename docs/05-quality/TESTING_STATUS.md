# Quality Assurance & Testing Status

> **Scope:** Test suites, property-based testing, static code analysis, and linters across Nix, Go, and TypeScript.

---

## 🧪 Test Matrix by Subsystem

```text
┌───────────────────────────┬──────────────────────┬─────────────┬──────────────────────────┐
│ Component                 │ Test Framework       │ Test Count  │ Status                   │
├───────────────────────────┼──────────────────────┼─────────────┼──────────────────────────┤
│ 1. Panel Go Agent API     │ Go testing package   │ 25+ tests   │ 🟢 PASS (Unit & Property) │
│ 2. Panel Procfs Parser    │ testing/quick        │ Property    │ 🟢 PASS                  │
│ 3. Panel Journal SSE      │ testing/quick        │ Property    │ 🟢 PASS                  │
│ 4. Panel PTY Sessions     │ Go testing package   │ Unit        │ 🟢 PASS                  │
│ 5. Panel Storage/Restic   │ Go testing package   │ Unit        │ 🟢 PASS                  │
│ 6. Panel Web Frontend     │ Vitest + TestingLib  │ 15+ tests   │ 🟢 PASS                  │
│ 7. Nix Format (nixfmt)    │ nixfmt-rfc-style     │ All *.nix   │ 🟢 PASS                  │
│ 8. Nix Linter (statix)    │ statix check         │ Whole Repo  │ 🟢 PASS                  │
│ 9. Dead Code (deadnix)    │ deadnix --fail       │ Whole Repo  │ 🟢 PASS                  │
│ 10. Shell Scripts         │ shellcheck           │ 10 scripts  │ 🟢 PASS                  │
│ 11. MCP Schema            │ jq syntax check      │ .mcp.json   │ 🟢 PASS                  │
│ 12. NixOS Module System   │ nix eval (L7V)       │ Core Attrs  │ 🟢 PASS                  │
└───────────────────────────┴──────────────────────┴─────────────┴──────────────────────────┘
```

---

## 🏃 Running Test Suites

### 1. Repository-Wide Code Quality (`validate.sh`)
```bash
./scripts/validate.sh L7V
```

### 2. Panel Go Agent Tests
```bash
cd panel/apps/agent
go test -v -race ./...
```

### 3. Panel Web Frontend Tests
```bash
cd panel/apps/web
pnpm test
```
