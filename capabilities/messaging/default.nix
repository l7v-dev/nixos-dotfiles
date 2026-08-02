# Messaging capability: SMTP relay + Matrix/Synapse + Ntfy
# Requires: reverseProxy + secrets + database
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.messaging = {
    enable = lib.mkEnableOption "messaging capability";

    domain = lib.mkOption {
      type = lib.types.str;
      default = "l7v.dev";
    };

    smtp = {
      enable = lib.mkEnableOption "SMTP relay (Postfix)" // {
        default = true;
      };
      relayHost = lib.mkOption {
        type = lib.types.str;
        default = "smtp.l7v.dev";
      };
    };

    matrix = {
      enable = lib.mkEnableOption "Matrix/Synapse homeserver";
      domain = lib.mkOption {
        type = lib.types.str;
        default = "matrix.l7v.dev";
      };
    };

    ntfy = {
      enable = lib.mkEnableOption "ntfy push notification server";
      domain = lib.mkOption {
        type = lib.types.str;
        default = "ntfy.l7v.dev";
      };
    };
  };

  config = lib.mkIf config.l7v.messaging.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.messaging requires l7v.secrets.enable = true";
      }
      {
        assertion = !config.l7v.messaging.matrix.enable || config.l7v.database.enable;
        message = "l7v.messaging.matrix requires l7v.database.enable = true";
      }
      {
        assertion = !config.l7v.messaging.matrix.enable || config.l7v.reverseProxy.enable;
        message = "l7v.messaging.matrix requires l7v.reverseProxy.enable = true";
      }
      {
        assertion = !config.l7v.messaging.ntfy.enable || config.l7v.reverseProxy.enable;
        message = "l7v.messaging.ntfy requires l7v.reverseProxy.enable = true";
      }
    ];

    sops.secrets = lib.mkMerge [
      (lib.mkIf config.l7v.messaging.matrix.enable {
        "matrix/registration_secret".owner = "matrix-synapse";
      })
      (lib.mkIf config.l7v.messaging.ntfy.enable {
        "ntfy/auth_file".owner = "ntfy-sh";
      })
    ];

    services = {
      postfix = lib.mkIf config.l7v.messaging.smtp.enable {
        enable = true;
        domain = config.l7v.messaging.domain;
        hostname = config.l7v.messaging.smtp.relayHost;
        origin = config.l7v.messaging.domain;
        config = {
          inet_interfaces = "loopback-only";
          mydestination = "";
          smtp_use_tls = "yes";
          smtp_tls_security_level = "may";
        };
      };

      postgresql = {
        ensureDatabases = lib.optionals config.l7v.messaging.matrix.enable [
          "matrix-synapse"
        ];
        ensureUsers = lib.optionals config.l7v.messaging.matrix.enable [
          {
            name = "matrix-synapse";
            ensureDBOwnership = true;
          }
        ];
      };

      matrix-synapse = lib.mkIf config.l7v.messaging.matrix.enable {
        enable = true;
        settings = {
          server_name = config.l7v.messaging.domain;
          public_baseurl = "https://${config.l7v.messaging.matrix.domain}";
          listeners = [
            {
              port = 8008;
              bind_addresses = [ "127.0.0.1" ];
              type = "http";
              tls = false;
              x_forwarded = true;
              resources = [
                {
                  names = [
                    "client"
                    "federation"
                  ];
                  compress = false;
                }
              ];
            }
          ];
          database = {
            name = "psycopg2";
            args = {
              user = "matrix-synapse";
              database = "matrix-synapse";
              host = "/run/postgresql";
            };
          };
          registration_shared_secret_path = config.sops.secrets."matrix/registration_secret".path;
          enable_registration = false;
        };
      };

      ntfy-sh = lib.mkIf config.l7v.messaging.ntfy.enable {
        enable = true;
        settings = {
          base-url = "https://${config.l7v.messaging.ntfy.domain}";
          listen-http = "127.0.0.1:2586";
          auth-file = config.sops.secrets."ntfy/auth_file".path;
          auth-default-access = "deny-all";
          behind-proxy = true;
          cache-file = "/var/lib/ntfy-sh/cache.db";
        };
      };

      nginx.virtualHosts = lib.mkMerge [
        (lib.mkIf config.l7v.messaging.matrix.enable {
          ${config.l7v.messaging.matrix.domain} = {
            forceSSL = true;
            enableACME = true;
            locations."/" = {
              proxyPass = "http://127.0.0.1:8008";
              extraConfig = ''
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-Proto $scheme;
                client_max_body_size 100m;
              '';
            };
          };
        })
        (lib.mkIf config.l7v.messaging.ntfy.enable {
          ${config.l7v.messaging.ntfy.domain} = {
            forceSSL = true;
            enableACME = true;
            locations."/" = {
              proxyPass = "http://127.0.0.1:2586";
              proxyWebsockets = true;
              extraConfig = ''
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-Proto $scheme;
              '';
            };
          };
        })
      ];
    };

    environment.systemPackages = with pkgs; [
      ntfy-sh
    ];
  };
}
