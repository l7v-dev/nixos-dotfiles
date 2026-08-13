# Service: Vaultwarden — Bitwarden-compatible password manager (vault.l7v.dev)
#
# ADMIN_TOKEN delivery:
#   sops-nix decrypts the token to /run/secrets/vaultwarden/admin_token at
#   activation time. A tmpfiles.d rule writes /run/vaultwarden-env from the
#   decrypted file; the vaultwarden service reads it via EnvironmentFile.
#
#   Using systemd-tmpfiles (Type=f with content derived at runtime via ExecStart
#   rewrite) is not viable because the secret is only available after activation.
#   Instead we hook into the sops-nix "setupSecrets" activation barrier via
#   system.activationScripts with the correct deps declaration, which sops-nix
#   registers as an activation step named "setupSecrets".
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.l7v.services.vaultwarden;
  inherit (cfg) port;
in
{
  options.l7v.services.vaultwarden = {
    enable = lib.mkEnableOption "Vaultwarden password manager (vault.l7v.dev)";

    domain = lib.mkOption {
      type = lib.types.str;
      default = "vault.l7v.dev";
      description = "Public FQDN for Vaultwarden.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 8222;
      description = "Internal Rocket listener port.";
    };

    backupDir = lib.mkOption {
      type = lib.types.str;
      default = "/var/backup/vaultwarden";
      description = "SQLite backup destination (restic picks this up).";
    };

    signupsAllowed = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Allow public registration. Keep false in production.";
    };
  };

  config = lib.mkIf cfg.enable {

    assertions = [
      {
        assertion = config.l7v.reverseProxy.enable;
        message = "l7v.services.vaultwarden requires l7v.reverseProxy.enable = true (nginx + ACME).";
      }
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.services.vaultwarden requires l7v.secrets.enable = true.";
      }
    ];

    sops.secrets."vaultwarden/admin_token" = {
      owner = "vaultwarden";
      group = "vaultwarden";
      mode = "0400";
    };

    # Write the EnvironmentFile from the sops-decrypted secret.
    # The "setupSecrets" name is the activation step registered by sops-nix;
    # declaring it as a dep ensures the secret file exists before this runs.
    system.activationScripts.vaultwardenEnv = {
      deps = [ "setupSecrets" ];
      text = ''
        umask 077
        install -m 400 /dev/null /run/vaultwarden-env
        printf 'ADMIN_TOKEN=%s\n' \
          "$(cat ${config.sops.secrets."vaultwarden/admin_token".path})" \
          > /run/vaultwarden-env
        ${pkgs.coreutils}/bin/chown vaultwarden:vaultwarden /run/vaultwarden-env 2>/dev/null || true
      '';
    };

    systemd.services.vaultwarden = {
      after = [ "activate.service" ];
      serviceConfig.EnvironmentFile = "/run/vaultwarden-env";
    };

    services.vaultwarden = {
      enable = true;
      inherit (cfg) backupDir;

      config = {
        DOMAIN = "https://${cfg.domain}";
        ROCKET_ADDRESS = "127.0.0.1";
        ROCKET_PORT = port;
        ROCKET_LOG = "critical";

        SIGNUPS_ALLOWED = cfg.signupsAllowed;
        INVITATIONS_ALLOWED = true;

        DISABLE_ADMIN_TOKEN = false;

        WEB_VAULT_ENABLED = true;
        SENDS_ALLOWED = true;
        EMERGENCY_ACCESS_ALLOWED = true;

        LOG_LEVEL = "warn";
        EXTENDED_LOGGING = true;

        IP_HEADER = "X-Real-IP";

        SMTP_HOST = lib.mkIf config.l7v.messaging.enable "localhost";
        SMTP_PORT = lib.mkIf config.l7v.messaging.enable 25;
        SMTP_SECURITY = lib.mkIf config.l7v.messaging.enable "off";
        SMTP_FROM = lib.mkIf config.l7v.messaging.enable "vault@${cfg.domain}";
        SMTP_FROM_NAME = lib.mkIf config.l7v.messaging.enable "L7V Vault";
      };
    };

    services.nginx.virtualHosts.${cfg.domain} = {
      enableACME = true;
      forceSSL = true;

      locations."/" = {
        proxyPass = "http://127.0.0.1:${toString port}";
        proxyWebsockets = true;
        extraConfig = ''
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_read_timeout 90;
          proxy_connect_timeout 90;
          proxy_send_timeout 90;
          client_max_body_size 128m;
        '';
      };
    };
  };
}
