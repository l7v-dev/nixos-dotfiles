# NixOS Infrastructure & Platform Architecture

> [!NOTE]
> Architectural overview of the NixOS declarative workstation and server infrastructure.

---

## Workspace Directory Mapping

```text
/home/l7v/dev/projects/company/active/nixos/
├── docs/                         # Google-style technical documentation tree
│   ├── runbooks/                 # Operational deployment and service guides
│   ├── skills/                   # Developer and AI agent skill protocols
│   └── architecture/             # Infrastructure system architecture
├── templates/                    # Enterprise project templates (AFT)
├── scripts/                      # System administration and initializer scripts
├── hosts/                        # Machine configurations (L7V, server, builder)
├── platform/                     # System platform modules (documentation, security)
├── services/                     # Managed NixOS services (Forgejo, Grafana, Vaultwarden)
└── secrets/                      # SOPS encrypted secrets
```
