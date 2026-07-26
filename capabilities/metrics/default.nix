# Metrics capability: Prometheus + exporters
{ lib, config, ... }:
{
  options.l7v.metrics = {
    enable = lib.mkEnableOption "prometheus metrics capability";
  };

  config = lib.mkIf config.l7v.metrics.enable {
    services.prometheus = {
      enable        = true;
      port          = 9090;
      retentionTime = "30d";

      exporters = {
        node = {
          enable             = true;
          port               = 9100;
          enabledCollectors  = [ "systemd" "cpu" "diskstats" "filesystem" "meminfo" "netdev" "thermal_zone" ];
        };
        nginx = {
          enable = config.l7v.reverseProxy.enable;
          port   = 9113;
        };
        postgres = {
          enable = config.l7v.database.enable;
          port   = 9187;
        };
        systemd = {
          enable = true;
        };
      };

      scrapeConfigs = [
        {
          job_name = "prometheus";
          static_configs = [{ targets = [ "localhost:9090" ]; }];
        }
        {
          job_name = "node";
          static_configs = [{ targets = [ "localhost:9100" ]; }];
        }
        {
          job_name       = "nginx";
          static_configs = [{ targets = [ "localhost:9113" ]; }];
        }
        {
          job_name       = "postgres";
          static_configs = [{ targets = [ "localhost:9187" ]; }];
        }
        {
          job_name       = "systemd";
          static_configs = [{ targets = [ "localhost:9558" ]; }];
        }
      ];
    };
  };
}
