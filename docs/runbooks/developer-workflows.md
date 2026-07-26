# Developer Workflows & Project Management Guide

> [!NOTE]
> Standardized workflows for creating isolated projects and integrating external GitHub repositories into NixOS environment.

---

## 1. Directory Structure Standards

| Workspace Category | Path |
| :--- | :--- |
| **Enterprise Active Projects** | `/home/l7v/dev/projects/company/active/` |
| **Playground / GitHub Testing Repos** | `/home/l7v/dev/sandboxes/playgrounds/` |
| **NixOS Config & Infrastructure** | `/home/l7v/dev/projects/company/active/nixos/` |

---

## 2. Project Initializer Tools

### Full-Stack Agentic Framework Template (AFT)
Next.js 16 + React 19 + TypeScript + TailwindCSS v4 + AI Agent Governance:
```bash
./scripts/aft-init.sh <project-name> [target-directory]
```

### Base Polyglot Template (BPT)
Python, Node.js, Rust, Go, Java, or Minimal environment:
```bash
./scripts/bpt-init.sh <project-name> [python|node|rust|go|java|minimal]
```

### Repository Adoption (ADOPT)
Automated GitHub repo cloning, secret scanning, language detection, and Nix/Devenv isolation:
```bash
./scripts/adopt-repo.sh <github-url-or-slug-or-directory>
```

---

## 3. Troubleshooting

### `nodePackages.typescript-language-server` evaluation error
- **Solution:** Use top-level `pkgs.typescript-language-server` in `devenv.nix` or `flake.nix`.

### `direnv: error .envrc is blocked`
- **Solution:** Run `direnv allow` inside the project directory.
