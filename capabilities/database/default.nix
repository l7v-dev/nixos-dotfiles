# Database capability: PostgreSQL 16 + pgbouncer
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.database = {
    enable = lib.mkEnableOption "postgresql database capability";
    listenAddress = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
    };
  };

  config = lib.mkIf config.l7v.database.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.database requires l7v.secrets.enable = true";
      }
    ];

    # postgres_password — pgbouncer userlist için kullanılıyor
    sops.secrets."database/postgres_password" = {
      owner = "pgbouncer";
    };

    services.postgresql = {
      enable = true;
      package = pkgs.postgresql_16;
      settings = lib.mkDefault {
        listen_addresses = config.l7v.database.listenAddress;
        max_connections = 200;
        shared_buffers = "256MB";
      };
    };

    services.pgbouncer = {
      enable = true;
      listenAddress = config.l7v.database.listenAddress;
      # pgbouncer auth: sops secret'tan okunan postgres şifresiyle userlist
      authFile = config.sops.secrets."database/postgres_password".path;
    };
  };
}
