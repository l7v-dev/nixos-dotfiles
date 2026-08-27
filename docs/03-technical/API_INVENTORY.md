# Historical API Inventory & Endpoint Catalog (Panel-Agent)

> [!CAUTION]
> **HISTORICAL / DEPRECATED DOCUMENTATION:** The `panel-agent` Go daemon and its `/api/v1/*` endpoint suite were removed in commit `d07dbe8` (`chore: remove panel references and standalone panel folder`).
>
> For active system interfaces, HTTP listeners (Nginx, Forgejo, Vaultwarden, Grafana, Exporters) and CLI operational utilities, please refer to **[API_OPERATIONS.md](file:///home/l7v/dev/projects/company/active/nixos/docs/03-technical/API_OPERATIONS.md)**.

---

## 📡 Complete REST & Streaming Endpoint Matrix

### 1. System Health & Core Metrics
| Method | Endpoint | Description | Protocol |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Agent health, version, uptime, and D-Bus connectivity | JSON |
| `GET` | `/api/v1/metrics` | Real-time CPU, RAM, Disk, Load, Network from procfs | JSON |
| `GET` | `/api/v1/metrics/query` | Prometheus proxy instant vector query (`/api/v1/query`) | JSON Proxy |
| `GET` | `/api/v1/metrics/query_range` | Prometheus proxy range query (`/api/v1/query_range`) | JSON Proxy |
| `GET` | `/metrics` | Prometheus format metrics exposed by the agent itself | Plaintext |

### 2. Systemd Service Control (D-Bus)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/services` | List all systemd units with load, active, and sub states |
| `POST` | `/api/v1/services/{unit}/start` | Start a specified systemd service unit |
| `POST` | `/api/v1/services/{unit}/stop` | Stop a specified systemd service unit |
| `POST` | `/api/v1/services/{unit}/restart` | Restart a specified systemd service unit |
| `POST` | `/api/v1/services/{unit}/enable` | Enable unit to start on system boot |
| `POST` | `/api/v1/services/{unit}/disable` | Disable unit from starting on boot |

### 3. Application Lifecycle Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/apps` | List all detected ecosystem applications |
| `GET` | `/api/v1/apps/summary` | Summary of running, stopped, and failed applications |
| `GET` | `/api/v1/apps/dependencies` | Cross-service dependency and socket map |
| `GET` | `/api/v1/apps/audit` | Application configuration and security health audit |
| `GET` | `/api/v1/apps/{id}` | Detailed status of a specific application |
| `POST` | `/api/v1/apps/{id}/action` | Trigger lifecycle action (`start`, `stop`, `restart`) |
| `GET` | `/api/v1/apps/{id}/logs` | Stream live application stdout/stderr logs (SSE) |

### 4. Container Management (Podman / Docker)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/containers` | List all containers (running and exited) |
| `GET` | `/api/v1/containers/summary` | Container engine overview and capacity metrics |
| `POST` | `/api/v1/containers` | Create and run a new container from an image |
| `POST` | `/api/v1/containers/bulk-action` | Perform bulk operations (`start`, `stop`, `delete`) |
| `GET` | `/api/v1/containers/stacks` | List Compose / Podman multi-container stacks |
| `GET` | `/api/v1/containers/images` | List cached OCI container images |
| `POST` | `/api/v1/containers/images/pull` | Pull image from remote registry |
| `POST` | `/api/v1/containers/images/prune` | Remove unused/dangling container images |
| `DELETE`| `/api/v1/containers/images/{id}` | Delete a specific container image |
| `GET` | `/api/v1/containers/volumes` | List all container storage volumes |
| `POST` | `/api/v1/containers/volumes` | Create a new named volume |
| `POST` | `/api/v1/containers/volumes/prune` | Prune orphaned container volumes |
| `DELETE`| `/api/v1/containers/volumes/{name}` | Delete a named storage volume |
| `GET` | `/api/v1/containers/networks` | List container bridge and overlay networks |
| `POST` | `/api/v1/containers/networks` | Create a new container network |
| `DELETE`| `/api/v1/containers/networks/{id}` | Remove a container network |
| `GET` | `/api/v1/containers/{id}` | Inspect full container inspect JSON metadata |
| `POST` | `/api/v1/containers/{id}/start` | Start container instance |
| `POST` | `/api/v1/containers/{id}/stop` | Gracefully stop container instance |
| `POST` | `/api/v1/containers/{id}/restart` | Restart container instance |
| `POST` | `/api/v1/containers/{id}/pause` | Freeze container processes (cgroup freeze) |
| `POST` | `/api/v1/containers/{id}/unpause` | Unfreeze container processes |
| `POST` | `/api/v1/containers/{id}/kill` | Forcefully terminate container (SIGKILL) |
| `DELETE`| `/api/v1/containers/{id}` | Remove container instance |
| `GET` | `/api/v1/containers/{id}/stats` | Stream real-time CPU, RAM, I/O stats (SSE) |
| `GET` | `/api/v1/containers/{id}/logs` | Stream real-time container logs (SSE) |
| `POST` | `/api/v1/containers/{id}/exec` | Initialize an exec session inside container |
| `GET` | `/api/v1/containers/exec/{id}/ws` | Interactive terminal exec session (WebSocket) |

### 5. Interactive Terminal & PTY Manager
| Method | Endpoint | Description | Protocol |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/terminal/sessions` | List active PTY shell sessions | JSON |
| `POST` | `/api/v1/terminal/sessions` | Spawn a new PTY session (size, command, env) | JSON |
| `GET` | `/api/v1/terminal/sessions/{id}` | Inspect specific session metadata | JSON |
| `DELETE`| `/api/v1/terminal/sessions/{id}` | Terminate and kill a PTY session | JSON |
| `GET` | `/api/v1/terminal/ws/{id}` | Full-duplex character stream to session | WebSocket |
| `GET` | `/api/v1/terminal/ws` | Attach to or spawn default terminal session | WebSocket |
| `GET` | `/api/v1/terminal/snippets` | Retrieve predefined operational command snippets | JSON |

### 6. NixOS Maintenance & Live Rebuild Engine
| Method | Endpoint | Description | Protocol |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/nixos/status` | System hostname, current generation, kernel version | JSON |
| `POST` | `/api/v1/nixos/gc` | Trigger Nix store garbage collection | JSON |
| `POST` | `/api/v1/nixos/optimise` | Hard-link identical files in the Nix store | JSON |
| `GET` | `/api/v1/nixos/generations` | List all historical boot generations | JSON |
| `GET` | `/api/v1/nixos/generations/diff`| Package diff comparison between two generations | JSON |
| `POST` | `/api/v1/nixos/generations/switch`| Activate a specific prior generation | JSON |
| `POST` | `/api/v1/nixos/generations/rollback`| Immediately rollback to the previous generation | JSON |
| `GET` | `/api/v1/nixos/flake` | Inspect Flake inputs, git revision, and lock status | JSON |
| `POST` | `/api/v1/nixos/rebuild` | Start background NixOS rebuild (`nh os switch`) | JSON |
| `GET` | `/api/v1/nixos/rebuild/jobs` | List active and historical rebuild jobs | JSON |
| `GET` | `/api/v1/nixos/rebuild/jobs/{id}`| Inspect status and exit code of a rebuild job | JSON |
| `POST` | `/api/v1/nixos/rebuild/jobs/{id}/cancel`| Cancel an in-progress rebuild job | JSON |
| `GET` | `/api/v1/nixos/rebuild/stream` | Stream live compilation stdout/stderr (SSE) | SSE |

### 7. File Explorer & Filesystem Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/fs/list` | List directory contents with metadata and permissions |
| `GET` | `/api/v1/fs/stat` | Get stat details of a file or directory |
| `GET` | `/api/v1/fs/read` | Read text file contents |
| `GET` | `/api/v1/fs/download` | Download binary or text file as attachment |
| `POST` | `/api/v1/fs/write` | Save updated content to an existing or new file |
| `POST` | `/api/v1/fs/upload` | Multipart file upload |
| `POST` | `/api/v1/fs/mkdir` | Create new directory hierarchy |
| `POST` | `/api/v1/fs/delete` | Delete file or directory recursively |
| `POST` | `/api/v1/fs/rename` | Move or rename file or directory |
| `POST` | `/api/v1/fs/copy` | Copy file or directory recursively |
| `POST` | `/api/v1/fs/chmod` | Update POSIX file permission bits |
| `POST` | `/api/v1/fs/archive` | Create `.zip` or `.tar.gz` archive from directory |
| `POST` | `/api/v1/fs/extract` | Extract `.zip` or `.tar.gz` archive |
| `GET` | `/api/v1/fs/search` | Search files by name or pattern |
| `GET` | `/api/v1/fs/git` | Inspect git status of repository directories |

### 8. Multi-Host Fleet & Colmena Orchestration
| Method | Endpoint | Description | Protocol |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fleet/nodes` | List all nodes in fleet topology with roles and tags | JSON |
| `GET` | `/api/v1/fleet/status` | Live ping and reachability status for all fleet nodes | JSON |
| `POST` | `/api/v1/fleet/deploy` | Trigger remote deployment (`colmena apply`) | JSON |
| `GET` | `/api/v1/fleet/deploy/jobs` | List fleet deployment jobs | JSON |
| `GET` | `/api/v1/fleet/deploy/jobs/{id}`| Inspect status of a deployment job | JSON |
| `POST` | `/api/v1/fleet/deploy/jobs/{id}/cancel`| Abort in-progress fleet deployment | JSON |
| `GET` | `/api/v1/fleet/deploy/stream`| Stream live Colmena deployment output (SSE) | SSE |

### 9. Logging & Journald Inspection
| Method | Endpoint | Description | Protocol |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/logs/stream` | Stream live systemd journal entries in real time | SSE |
| `GET` | `/api/v1/logs/query` | Query historical logs with unit, priority, and text filter | JSON |
| `GET` | `/api/v1/logs/units` | List all systemd units that have emitted log lines | JSON |
| `GET` | `/api/v1/logs/stats` | Aggregate error, warning, and info count statistics | JSON |
| `GET` | `/api/v1/logs/export` | Export filtered journal logs as JSON or text | File |

### 10. AI Agents & MicroVM Sandboxes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/ai/tasks` | List autonomous agent loop tasks |
| `POST` | `/api/v1/ai/tasks` | Launch new autonomous agent task (`claude-autonomous.sh`) |
| `GET` | `/api/v1/ai/tasks/{id}` | Inspect progress and iterations of an agent task |
| `POST` | `/api/v1/ai/tasks/{id}/cancel` | Abort running agent session |
| `GET` | `/api/v1/ai/tasks/{id}/stream` | Stream live agent thought process & tool output (SSE) |
| `GET` | `/api/v1/ai/tools` | List all available installed AI coding tools |
| `GET` | `/api/v1/ai/microvms` | List microVM agent sandbox definitions |
| `GET` | `/api/v1/ai/microvms/host-status` | Check KVM and virtiofsd host virtualization readiness |
| `POST` | `/api/v1/ai/microvms/{name}/start` | Start isolated microVM sandbox |
| `POST` | `/api/v1/ai/microvms/{name}/stop` | Stop isolated microVM sandbox |
| `POST` | `/api/v1/ai/microvms/{name}/restart`| Restart microVM sandbox |

### 11. Storage, Snapper & Restic Backups
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/storage/removable` | List attached USB drives and block devices |
| `POST` | `/api/v1/storage/unmount` | Safely unmount a block device |
| `GET` | `/api/v1/storage/snapshots` | List Snapper btrfs subvolume snapshots |
| `POST` | `/api/v1/storage/snapshots` | Create manual btrfs snapshot |
| `DELETE`| `/api/v1/storage/snapshots/{config}/{id}` | Delete a btrfs snapshot |
| `GET` | `/api/v1/storage/restic/status` | Restic repository status, size, and last backup timestamp |
| `GET` | `/api/v1/storage/restic/snapshots` | List historical Restic snapshots |
| `POST` | `/api/v1/storage/restic/backup` | Manually trigger offsite backup job |

### 12. Security, SOPS Audit & Fail2ban
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/security/status` | Overall firewall, SSH, fail2ban, and SOPS status |
| `GET` | `/api/v1/security/audit` | Comprehensive security configuration audit |
| `GET` | `/api/v1/security/sops` | SOPS file presence and Age key status |
| `POST` | `/api/v1/security/sops/verify` | Test decrypting `secrets.yaml` with local key |
| `GET` | `/api/v1/security/fail2ban` | List active fail2ban jails and banned IP addresses |
| `POST` | `/api/v1/security/fail2ban/unban` | Unban a specific IP address |
| `POST` | `/api/v1/security/vpn/toggle` | Toggle Tailscale or WireGuard VPN connection |

### 13. Power Management & Wake-on-LAN (D-Bus Logind)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/power/capabilities` | Check if shutdown, reboot, sleep, hibernate are permitted |
| `GET` | `/api/v1/power/status` | Current battery level, charging status, AC power presence |
| `POST` | `/api/v1/power/shutdown` | Power off machine |
| `POST` | `/api/v1/power/reboot` | Reboot machine |
| `POST` | `/api/v1/power/sleep` | Suspend system to RAM |
| `POST` | `/api/v1/power/hibernate` | Hibernate system to disk |
| `POST` | `/api/v1/power/hybrid-sleep` | Hybrid sleep (RAM + disk) |
| `POST` | `/api/v1/power/wol` | Send Magic Packet to wake a remote host |
| `GET` | `/api/v1/power/wol/hosts` | List configured Wake-on-LAN host mappings |
| `GET` | `/api/v1/power/schedule` | Check for scheduled shutdowns |
| `POST` | `/api/v1/power/schedule` | Schedule shutdown or reboot after $N minutes |
| `DELETE`| `/api/v1/power/schedule` | Cancel scheduled shutdown |
