# Service: Grafana (observability dashboard — grafana.l7v.dev)
# Requires: metrics + reverseProxy + secrets
# Port: 3001 (Forgejo occupies 3000)
{ lib, config, ... }:
{
  options.l7v.services.grafana = {
    enable = lib.mkEnableOption "grafana dashboard service";

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

  config = lib.mkIf config.l7v.services.grafana.enable {
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

    services.grafana = {
      enable = true;
      settings = {
        server = {
          domain = config.l7v.services.grafana.domain;
          root_url = "https://${config.l7v.services.grafana.domain}";
          http_addr = "127.0.0.1";
          http_port = 3001;
        };
        # SQLite is sufficient for a single-node dashboard; no PostgreSQL needed.
        database.type = "sqlite3";
        security = {
          admin_user = "admin";
          admin_password = "$__file{${config.sops.secrets."grafana/admin_password".path}}";
          disable_gravatar = true;
          cookie_secure = true;
        };
        users.allow_sign_up = false;
        analytics = {
          reporting_enabled = false;
          check_for_updates = false;
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

    services.nginx.virtualHosts.${config.l7v.services.grafana.domain} = {
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
}
