# Logging capability: Loki + Promtail (via fluent-bit).
#
# Storage backend: TSDB (recommended since Loki v2.8, replaces boltdb-shipper).
# Schema v13 with TSDB is the current production-recommended configuration.
# See: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
#
# fluent-bit collects all systemd journal entries and ships them to Loki.
{ lib, config, ... }:
{
  options.l7v.logging = {
    enable = lib.mkEnableOption "loki + fluent-bit logging capability";
  };

  config = lib.mkIf config.l7v.logging.enable {
    services.loki = {
      enable = true;
      configuration = {
        server.http_listen_port = 3100;
        common = {
          instance_addr = "127.0.0.1";
          path_prefix = "/var/lib/loki";
          storage = {
            filesystem = {
              chunks_directory = "/var/lib/loki/chunks";
              rules_directory = "/var/lib/loki/rules";
            };
          };
          replication_factor = 1;
          ring.kvstore.store = "inmemory";
        };

        # TSDB index — replaces deprecated boltdb-shipper (v11).
        # Schema v13 is the current recommended version.
        schema_config.configs = [
          {
            from = "2025-01-01";
            store = "tsdb";
            object_store = "filesystem";
            schema = "v13";
            index = {
              prefix = "index_";
              period = "24h";
            };
          }
        ];

        limits_config = {
          reject_old_samples = true;
          reject_old_samples_max_age = "168h";
          ingestion_rate_mb = 16;
          ingestion_burst_size_mb = 32;
        };

        compactor = {
          working_directory = "/var/lib/loki/compactor";
          compaction_interval = "10m";
          retention_enabled = true;
          retention_delete_delay = "2h";
          retention_delete_worker_count = 150;
          delete_request_store = "filesystem";
        };

        query_scheduler.max_outstanding_requests_per_tenant = 2048;
        frontend.max_outstanding_per_tenant = 2048;
      };
    };

    services.fluent-bit = {
      enable = true;
      settings = {
        service = {
          flush = 1;
          daemon = false;
          log_level = "warn";
        };
        pipeline = {
          inputs = [
            {
              name = "systemd";
              # Collect all systemd journal entries, not just a single unit.
              # Omitting systemd_filter means all units are captured.
              tag = "systemd.*";
              read_from_tail = "on";
              strip_underscores = "on";
            }
          ];
          filters = [
            {
              name = "modify";
              match = "systemd.*";
              # Normalise field names for Loki label compatibility.
              rename = "_SYSTEMD_UNIT unit";
            }
          ];
          outputs = [
            {
              name = "loki";
              match = "systemd.*";
              host = "127.0.0.1";
              port = 3100;
              labels = "job=systemd,host=${config.networking.hostName}";
              label_keys = "$unit";
              line_format = "json";
            }
          ];
        };
      };
    };
  };
}
