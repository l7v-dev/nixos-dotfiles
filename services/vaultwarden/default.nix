# Vaultwarden — Bitwarden-uyumlu parola yöneticisi (vault.l7v.dev)
{
  config,
  lib,
  ...
}:

let
  cfg = config.l7v.services.vaultwarden;
  port = 8222;
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
      default = port;
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

    # Sanity checks — hard fail if deps missing
    assertions = [
      {
        assertion = config.l7v.reverseProxy.enable;
        message = "[vaultwarden] l7v.reverseProxy.enable gerekli (nginx + ACME).";
      }
    ];

    # secrets.yaml'daki "vaultwarden/admin_token" key'ini runtime'da
    # /run/secrets/vaultwarden/admin_token'a açar.
    sops.secrets."vaultwarden/admin_token" = {
      owner = "vaultwarden";
      group = "vaultwarden";
    };

    # Vaultwarden ADMIN_TOKEN'ı env var olarak bekler.
    # sops secrets direkt env var olamaz — bir wrapper dosyası üretiriz.
    systemd.services.vaultwarden = {
      serviceConfig = {
        # sops'un açtığı token'ı EnvironmentFile formatında sarmalayan dosya
        # Nix activation script'i bu dosyayı oluşturur.
        EnvironmentFile = "/run/vaultwarden-env";
      };
    };

    # Activation script: sops secret hazır olduktan sonra env dosyasını yaz
    system.activationScripts.vaultwardenEnv = {
      deps = [ "setupSecrets" ];
      text = ''
        TOKEN=$(cat ${config.sops.secrets."vaultwarden/admin_token".path})
        printf 'ADMIN_TOKEN=%s\n' "$TOKEN" > /run/vaultwarden-env
        chmod 400 /run/vaultwarden-env
        chown vaultwarden:vaultwarden /run/vaultwarden-env 2>/dev/null || true
      '';
    };

    services.vaultwarden = {
      enable = true;
      inherit (cfg) backupDir;

      config = {
        DOMAIN = "https://${cfg.domain}";
        ROCKET_ADDRESS = "127.0.0.1";
        ROCKET_PORT = cfg.port;
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

        # SMTP — l7v.messaging.enable ve messaging.smtp.enable aktifse otomatik açılır
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
        proxyPass = "http://127.0.0.1:${toString cfg.port}";
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

    # 8222 sadece localhost — nginx 443 zaten reverseProxy modülünde açık.
  };
}
