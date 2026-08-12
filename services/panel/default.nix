# Service: l7v-panel — NixOS control center (agent + frontend).
#
# Usage:
#   On the laptop host: l7v.services.panel.agent.enable = true
#   On the server host: l7v.services.panel.frontend.enable = true
#
# Phase 2 (planned): JWT RS256 authentication via SOPS-managed keys.
# The agent.socketPath option and the nginx upstream are already designed to
# support this extension without breaking the Phase 1 configuration.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  agentCfg = config.l7v.services.panel.agent;
  frontendCfg = config.l7v.services.panel.frontend;

  panelAgentPkg = pkgs.callPackage ../../platform/pkgs/panel-agent { };
  panelFrontendPkg = pkgs.callPackage ../../platform/pkgs/panel-frontend { };
in
{
  # ── Options ────────────────────────────────────────────────────────────────

  options.l7v.services.panel = {
    agent = {
      enable = lib.mkEnableOption "panel-agent systemd socket-activated service";

      socketPath = lib.mkOption {
        type = lib.types.str;
        default = "/run/panel-agent/panel-agent.sock";
        description = "Unix socket path the agent listens on.";
      };

      managedHosts = lib.mkOption {
        type = lib.types.attrsOf lib.types.str;
        default = { };
        example = {
          laptop = "/run/panel-agent/panel-agent.sock";
        };
        description = "Map of logical host names to their agent Unix socket paths.";
      };

      prometheusWidget = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable the /api/v1/metrics/query Prometheus proxy endpoint.";
      };

      metricsThresholds = {
        cpuWarnPct = lib.mkOption {
          type = lib.types.int;
          default = 70;
          description = "CPU utilisation warn threshold (%).";
        };
        cpuCritPct = lib.mkOption {
          type = lib.types.int;
          default = 90;
          description = "CPU utilisation critical threshold (%).";
        };
        ramWarnPct = lib.mkOption {
          type = lib.types.int;
          default = 80;
          description = "RAM utilisation warn threshold (%).";
        };
        ramCritPct = lib.mkOption {
          type = lib.types.int;
          default = 95;
          description = "RAM utilisation critical threshold (%).";
        };
        diskWarnPct = lib.mkOption {
          type = lib.types.int;
          default = 80;
          description = "Disk utilisation warn threshold (%).";
        };
        diskCritPct = lib.mkOption {
          type = lib.types.int;
          default = 90;
          description = "Disk utilisation critical threshold (%).";
        };
      };
    };

    frontend = {
      enable = lib.mkEnableOption "panel-frontend Next.js service and nginx virtual host";

      domain = lib.mkOption {
        type = lib.types.str;
        default = "panel.l7v.dev";
        description = "Public FQDN for the panel web interface.";
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 3002;
        description = "Local TCP port the Next.js server listens on.";
      };

      allowedCIDRs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ "127.0.0.1/32" ];
        example = [
          "10.0.0.0/8"
          "192.168.1.0/24"
        ];
        description = "CIDR ranges permitted to access panel.l7v.dev (nginx allow/deny).";
      };
    };
  };

  # ── Assertions ─────────────────────────────────────────────────────────────

  config = lib.mkMerge [
    # Agent config (managed host — initially the laptop).
    (lib.mkIf agentCfg.enable {
      assertions = [
        {
          assertion = agentCfg.metricsThresholds.cpuWarnPct < agentCfg.metricsThresholds.cpuCritPct;
          message = "l7v.services.panel.agent.metricsThresholds: cpuWarnPct must be less than cpuCritPct";
        }
        {
          assertion = agentCfg.metricsThresholds.ramWarnPct < agentCfg.metricsThresholds.ramCritPct;
          message = "l7v.services.panel.agent.metricsThresholds: ramWarnPct must be less than ramCritPct";
        }
        {
          assertion = agentCfg.metricsThresholds.diskWarnPct < agentCfg.metricsThresholds.diskCritPct;
          message = "l7v.services.panel.agent.metricsThresholds: diskWarnPct must be less than diskCritPct";
        }
      ];

      # System user for the agent service.
      users.users.panel-agent = {
        isSystemUser = true;
        group = "panel-agent";
        description = "panel-agent service account";
        extraGroups = [ "systemd-journal" ]; # journal read access for log streaming
      };
      users.groups.panel-agent = { };

      # Polkit rules: grant panel-agent D-Bus access for service management and power control.
      # Phase 2 will add scope restrictions per-action.
      security.polkit.extraConfig = ''
        // panel-agent: service control and power management
        polkit.addRule(function(action, subject) {
          var allowed = [
            "org.freedesktop.systemd1.manage-units",
            "org.freedesktop.login1.power-off",
            "org.freedesktop.login1.power-off-multiple-sessions",
            "org.freedesktop.login1.reboot",
            "org.freedesktop.login1.reboot-multiple-sessions",
            "org.freedesktop.login1.suspend",
            "org.freedesktop.login1.suspend-multiple-sessions",
          ];
          if (allowed.indexOf(action.id) >= 0 && subject.user === "panel-agent") {
            return polkit.Result.YES;
          }
        });
      '';

      # Ensure the socket directory exists with correct permissions.
      systemd.tmpfiles.rules = [
        "d /run/panel-agent 0750 panel-agent panel-agent -"
      ];

      # Systemd socket unit — activates the service on first connection.
      systemd.sockets.panel-agent = {
        description = "panel-agent Unix socket";
        wantedBy = [ "sockets.target" ];
        socketConfig = {
          ListenStream = agentCfg.socketPath;
          SocketUser = "panel-agent";
          SocketGroup = "panel-agent";
          SocketMode = "0600";
        };
      };

      # Systemd service unit — socket-activated, hardened.
      systemd.services.panel-agent = {
        description = "panel-agent REST/SSE API for l7v-panel";
        after = [
          "network.target"
          "dbus.service"
        ];
        requires = [ "panel-agent.socket" ];
        serviceConfig = {
          Type = "simple";
          ExecStart = "${panelAgentPkg}/bin/panel-agent";
          User = "panel-agent";
          Group = "panel-agent";
          Restart = "on-failure";
          RestartSec = 5;
          StandardOutput = "journal";
          StandardError = "journal";

          # Systemd hardening — minimal attack surface.
          NoNewPrivileges = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          PrivateTmp = true;
          ReadWritePaths = [ "/run/panel-agent" ];

          # Threshold values injected from NixOS module options.
          Environment = [
            "PANEL_CPU_WARN=${toString agentCfg.metricsThresholds.cpuWarnPct}"
            "PANEL_CPU_CRIT=${toString agentCfg.metricsThresholds.cpuCritPct}"
            "PANEL_RAM_WARN=${toString agentCfg.metricsThresholds.ramWarnPct}"
            "PANEL_RAM_CRIT=${toString agentCfg.metricsThresholds.ramCritPct}"
            "PANEL_DISK_WARN=${toString agentCfg.metricsThresholds.diskWarnPct}"
            "PANEL_DISK_CRIT=${toString agentCfg.metricsThresholds.diskCritPct}"
            "PANEL_PROMETHEUS_WIDGET=${if agentCfg.prometheusWidget then "1" else "0"}"
          ];
        };
      };
    })

    # Frontend config (server host).
    (lib.mkIf frontendCfg.enable {
      assertions = [
        {
          assertion = config.l7v.reverseProxy.enable;
          message = "l7v.services.panel.frontend requires l7v.reverseProxy.enable = true";
        }
      ];

      # Apply allow_embedding to Grafana when both services are enabled on the same host.
      services.grafana.settings.security.allow_embedding = lib.mkIf config.l7v.services.grafana.enable true;

      # Next.js frontend systemd service.
      systemd.services.panel-frontend = {
        description = "panel-frontend Next.js web server";
        wantedBy = [ "multi-user.target" ];
        after = [ "network.target" ];
        environment = {
          NODE_ENV = "production";
          PORT = toString frontendCfg.port;
          # The agent proxy route uses this to reach the panel-agent Unix socket.
          # Phase 2: per-host socket map will be injected here.
          AGENT_BASE_URL = "http+unix://%2Frun%2Fpanel-agent%2Fpanel-agent.sock/";
        };
        serviceConfig = {
          Type = "simple";
          ExecStart = "${pkgs.nodejs_22}/bin/node ${panelFrontendPkg}/server.js";
          WorkingDirectory = "${panelFrontendPkg}";
          Restart = "on-failure";
          RestartSec = 5;
          StandardOutput = "journal";
          StandardError = "journal";
        };
      };

      # nginx virtual host for panel.l7v.dev.
      services.nginx.virtualHosts.${frontendCfg.domain} = {
        forceSSL = true;
        enableACME = true;

        # IP allowlist — a final `deny all` follows the allow directives.
        # Phase 2: JWT RS256 authentication will be added here via auth_request.
        extraConfig = lib.concatMapStringsSep "\n" (cidr: "allow ${cidr};") frontendCfg.allowedCIDRs
          + "\ndeny all;";

        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString frontendCfg.port}";
          extraConfig = ''
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            # Security headers
            add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header Referrer-Policy "strict-origin-when-cross-origin" always;
          '';
        };

        # Agent proxy — Unix socket upstream with SSE-compatible settings.
        locations."/api/agent/" = {
          extraConfig = ''
            proxy_pass http://unix:${agentCfg.socketPath}:/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            # SSE requires no buffering and a long read timeout.
            proxy_read_timeout 60s;
            proxy_buffering off;
          '';
        };

        # Grafana embed proxy — shares the same IP allowlist as the parent vhost.
        locations."/grafana/" = {
          proxyPass = "http://127.0.0.1:3001/";
          extraConfig = ''
            proxy_set_header Host grafana.l7v.dev;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
          '';
        };
      };
    })
  ];
}
