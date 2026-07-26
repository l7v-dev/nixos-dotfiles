# Logging capability: Loki + Promtail
{ lib, config, ... }:
{
  options.l7v.logging = {
    enable = lib.mkEnableOption "loki+promtail logging capability";
  };

  config = lib.mkIf config.l7v.logging.enable {
    services.loki = {
      enable      = true;
      configuration = {
        server.http_listen_port = 3100;
        common.instance_addr = "127.0.0.1";
        storage_config.boltdb_shipper.active_index_directory = "/var/lib/loki/boltdb-shipper-active";
        storage_config.boltdb_shipper.cache_location = "/var/lib/loki/boltdb-shipper-cache";
        storage_config.filesystem.directory = "/var/lib/loki/chunks";
        schema_config.configs = [{
          from = "2024-01-01";
          store = "boltdb-shipper";
          object_store = "filesystem";
          schema = "v11";
        }];
      };
    };

    services.fluent-bit = {
      enable = true;
      settings = {
        service = {
          flush = 1;
          daemon = false;
          log_level = "info";
        };
        pipeline = {
          inputs = [
            {
              name = "systemd";
              systemd_filter = "_SYSTEMD_UNIT=fluent-bit.service";
            }
          ];
          outputs = [
            {
              name = "loki";
              match = "*";
              host = "127.0.0.1";
              port = 3100;
              labels = {
                job = "system";
                host = config.networking.hostName;
              };
            }
          ];
        };
      };
    };
  };
}
