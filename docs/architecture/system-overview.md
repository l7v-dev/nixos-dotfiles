# NixOS Infrastructure & Platform Architecture

> [!NOTE]
> Architectural overview of the NixOS declarative workstation and server infrastructure.

---

## Workspace Directory Mapping

```text
/home/l7v/dev/projects/company/active/nixos/
├── docs/                         # Technical documentation tree
│   ├── runbooks/                 # Operational deployment and service guides
│   ├── skills/                   # Developer skill protocols
│   └── architecture/             # Infrastructure system architecture
├── templates/                    # Project templates (AFT)
├── scripts/                      # System administration and initializer scripts
├── hosts/                        # Machine configurations (L7V, server, builder)
├── platform/                     # System platform modules
├── services/                     # Managed NixOS services
└── secrets/                      # SOPS encrypted secrets
```
