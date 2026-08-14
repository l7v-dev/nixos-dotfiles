# Service: Grafana (observability dashboard — grafana.l7v.dev)
# Requires: metrics + reverseProxy + secrets (server mode); none (local mode)
# Port: 3001 (Forgejo occupies 3000)
{ lib, config, ... }:
let
  cfg = config.l7v.services.grafana;

  # Settings valid in both server mode and local mode.
  commonConfig = {
    services.grafana.enable = true;
    services.grafana.settings = {
      # SQLite is sufficient for a single-node dashboard; no PostgreSQL needed.
      database.type = "sqlite3";
      users.allow_sign_up = false;
      analytics = {
        reporting_enabled = false;
        check_for_updates = false;
      };
    };
  };

  # Server-mode settings (localMode = false). Active when using the default server deployment.
  serverConfig = {
    assertions = [
      {
        assertion = config.l7v.metrics.enable;
        message = "l7v.services.grafana requires l7v.metrics.enable = true";
      }
      {
        assertion = config.l7v.reverseProxy.enable;
        message = "l7v.services.grafana requires l7v.reverseProxy.enable = true";
      }
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.services.grafana requires l7v.secrets.enable = true";
      }
    ];

    sops.secrets."grafana/admin_password" = {
      owner = "grafana";
    };

    services = {
      grafana = {
        settings = {
          server = {
            domain = lib.mkDefault cfg.domain;
            root_url = lib.mkDefault "https://${cfg.domain}";
            http_addr = "127.0.0.1";
            http_port = 3001;
          };
          security = {
            admin_user = "admin";
            admin_password = "$__file{${config.sops.secrets."grafana/admin_password".path}}";
            disable_gravatar = true;
            cookie_secure = true;
          };
        };
        provision = {
          enable = true;
          datasources.settings.datasources = [
            {
              name = "Prometheus";
              type = "prometheus";
              url = "http://127.0.0.1:9090";
              isDefault = true;
            }
          ];
        };
      };
      nginx.virtualHosts.${cfg.domain} = {
        forceSSL = true;
        enableACME = true;
        locations."/" = {
          proxyPass = "http://127.0.0.1:3001";
          proxyWebsockets = true;
          extraConfig = ''
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
          '';
        };
      };
    };
  };

  # Local-mode settings (localMode = true). Plain HTTP on localhost, no nginx, no SOPS.
  localConfig = {
    # Warn when local mode is accidentally enabled on a server host.
    assertions = [
      {
        assertion = !config.l7v.infrastructure.isServer;
        message = "l7v.services.grafana.localMode = true is intended for workstation hosts. Consider localMode = false for servers.";
      }
    ];

    # Provision datasources conditionally — empty list when metrics are disabled.
    services.grafana = {
      settings = {
        server = {
          http_addr = "127.0.0.1";
          http_port = 3001;
          root_url = "http://127.0.0.1:3001";
          protocol = "http";
        };
        security = {
          admin_user = "admin";
          admin_password = cfg.adminPassword;
          # Local-mode only: a static secret key is acceptable because no
          # production secrets are stored in the Grafana database on a workstation.
          secret_key = "local-workstation-key-not-for-production";
          cookie_secure = false;
          cookie_samesite = "disabled";
          allow_embedding = true;
          disable_gravatar = true;
        };
      };
      provision = {
        enable = true;
        datasources.settings.datasources = lib.optional config.l7v.metrics.enable {
          name = "Prometheus";
          type = "prometheus";
          url = "http://127.0.0.1:9090";
          isDefault = true;
        };
      };
    };

    # No nginx virtualHost — Grafana binds directly on plain HTTP.
  };
in
{
  options.l7v.services.grafana = {
    enable = lib.mkEnableOption "grafana dashboard service";

    localMode = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Enable workstation-compatible mode. When true, the SOPS secret,
        nginx reverse proxy, and Prometheus assertions are removed; Grafana
        listens on 127.0.0.1:3001 over plain HTTP instead.
      '';
    };

    adminPassword = lib.mkOption {
      type = lib.types.str;
      default = "admin";
      description = ''
        Plain-text admin password used in local mode. Ignored when
        localMode = false — the SOPS secret file reference is used instead.
      '';
    };

    domain = lib.mkOption {
      type = lib.types.str;
      default = "grafana.l7v.dev";
      description = "Public FQDN for the Grafana instance.";
    };

    adminEmail = lib.mkOption {
      type = lib.types.str;
      default = "admin@l7v.dev";
      description = "Admin contact address.";
    };
  };

  config = lib.mkIf cfg.enable (
    lib.mkMerge [
      # Common settings valid in both modes.
      commonConfig

      # Server-mode settings — assertions, SOPS secret, nginx vhost (task 2.2).
      (lib.mkIf (!cfg.localMode) serverConfig)

      # Local-mode settings — plain HTTP, plain-text password (task 2.3).
      (lib.mkIf cfg.localMode localConfig)
    ]
  );
}
