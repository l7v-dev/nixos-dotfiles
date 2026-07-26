# Skill: Project Initialization & Repository Adoption

> **For AI Agents:** Use these instructions when the user requests creating a new project or converting a GitHub repository.

---

## 1. Full-Stack Next.js 16 AI Project Creation (AFT)
```bash
./scripts/aft-init.sh <project-name> [target-dir]
```
- Source template: `templates/aft`
- Configures Next.js 16, React 19, Tailwind v4, Prisma, and `.agents/` context.

---

## 2. Base Polyglot Project Creation (BPT)
```bash
./scripts/bpt-init.sh <project-name> [python|node|rust|go|java|minimal]
```
- Configures declarative language environment and `AGENTS.md`.

---

## 3. GitHub Repository Adoption (ADOPT)
```bash
./scripts/adopt-repo.sh <github-url-or-slug>
```
- Converts external repository into `/sandboxes/playgrounds/`.
- Scans secrets, detects language, generates `devenv.nix` and `AGENTS.md`.
