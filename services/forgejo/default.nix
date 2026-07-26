# Service: Forgejo (git forge)
# Requires: database + reverseProxy + secrets
{ lib, config, ... }:
{
  options.l7v.services.forgejo = {
    enable = lib.mkEnableOption "forgejo git forge service";
    domain = lib.mkOption {
      type    = lib.types.str;
      default = "git.l7v.dev";
    };
    adminEmail = lib.mkOption {
      type    = lib.types.str;
      default = "admin@l7v.dev";
    };
  };

  config = lib.mkIf config.l7v.services.forgejo.enable {
    assertions = [
      {
        assertion = config.l7v.database.enable;
        message   = "l7v.services.forgejo requires l7v.database.enable = true";
      }
      {
        assertion = config.l7v.reverseProxy.enable;
        message   = "l7v.services.forgejo requires l7v.reverseProxy.enable = true";
      }
      {
        assertion = config.l7v.secrets.enable;
        message   = "l7v.services.forgejo requires l7v.secrets.enable = true";
      }
    ];

    sops.secrets."forgejo/admin_password" = {
      owner = "forgejo";
    };

    services.postgresql.ensureDatabases = [ "forgejo" ];
    services.postgresql.ensureUsers = [{
      name = "forgejo";
      ensureDBOwnership = true;
    }];

    services.forgejo = {
      enable   = true;
      database = {
        type = "postgres";
        user = "forgejo";
        name = "forgejo";
        # socket auth — şifre gerekmez
        socket = "/run/postgresql";
      };
      settings = {
        server = {
          DOMAIN    = config.l7v.services.forgejo.domain;
          ROOT_URL  = "https://${config.l7v.services.forgejo.domain}";
          HTTP_PORT = 3000;
          HTTP_ADDR = "127.0.0.1";
        };
        service = {
          DISABLE_REGISTRATION        = true;
          REQUIRE_SIGNIN_VIEW         = false;
          DEFAULT_KEEP_EMAIL_PRIVATE  = true;
        };
        mailer = {
          ENABLED = false;
        };
        security = {
          INSTALL_LOCK = true;
        };
        log = {
          LEVEL = "Warn";
        };
      };
    };

    services.nginx.virtualHosts.${config.l7v.services.forgejo.domain} = {
      forceSSL    = true;
      enableACME  = true;
      locations."/" = {
        proxyPass       = "http://127.0.0.1:3000";
        proxyWebsockets = true;
        extraConfig = ''
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          client_max_body_size 512m;
        '';
      };
    };

  };
}
