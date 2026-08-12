# Database capability: PostgreSQL 16 + PgBouncer connection pooler.
#
# PgBouncer uses a userlist.txt file for authentication. The sops secret
# "database/pgbouncer_userlist" must contain a valid userlist.txt:
#
#   "username" "md5<hash>"
#
# Generate the hash with:
#   echo -n "password<username>" | md5sum | awk '{print "md5" $1}'
#
# PgBouncer is configured in session pooling mode and listens on the loopback
# interface only; applications connect via 127.0.0.1:5432 (pgbouncer) which
# proxies to the PostgreSQL socket.
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
      description = "Address PostgreSQL binds to. Keep on loopback for single-host deployments.";
    };
  };

  config = lib.mkIf config.l7v.database.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.database requires l7v.secrets.enable = true";
      }
    ];

    # userlist.txt content — format: "user" "md5<hash>" or "user" ""
    sops.secrets."database/pgbouncer_userlist" = {
      owner = "pgbouncer";
      group = "pgbouncer";
      mode = "0640";
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
      settings = {
        pgbouncer = {
          listen_addr = config.l7v.database.listenAddress;
          listen_port = 6432;
          auth_type = "md5";
          auth_file = config.sops.secrets."database/pgbouncer_userlist".path;
          pool_mode = "session";
          max_client_conn = 200;
          default_pool_size = 20;
          log_connections = 0;
          log_disconnections = 0;
        };
        # Map all database names to the PostgreSQL Unix socket.
        # PgBouncer ini format: the value is a connection string, not an attrset.
        databases = {
          "*" = "host=/run/postgresql";
        };
      };
    };
  };
}
