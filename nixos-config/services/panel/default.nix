{ config, lib, pkgs, ... }:

let
  cfg = config.l7v.services.panel;
in
{
  options.l7v.services.panel = {
    enable = lib.mkEnableOption "L7V Panel service";
    frontend.enable = lib.mkEnableOption "Panel frontend (Next.js)";
    agent.enable = lib.mkEnableOption "Panel agent (Go binary)";
    hostName = lib.mkOption {
      type = lib.types.str;
      default = config.networking.hostName;
      description = "Host name for agent socket";
    };
  };

  config = lib.mkMerge [
    (lib.mkIf cfg.enable {
      systemd.packages = [ pkgs.panel-agent ];
    })

    (lib.mkIf cfg.frontend.enable {
      services.nginx = {
        enable = true;
        virtualHosts."panel.l7v.dev" = {
          forceSSL = true;
          enableACME = true;
          locations."/" = {
            proxyPass = "http://127.0.0.1:3002";
            proxyWebsockets = true;
          };
          locations."/api/agent/" = {
            proxyPass = "http://127.0.0.1:3002/api/agent/";
            proxyWebsockets = true;
          };
          locations."/grafana/" = {
            proxyPass = "http://127.0.0.1:3001/";
            proxyWebsockets = true;
          };
        };
      };

      systemd.services.panel-frontend = {
        description = "L7V Panel Frontend";
        after = [ "network.target" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${pkgs.panel-frontend}/bin/panel-frontend";
          WorkingDirectory = "/var/lib/panel-frontend";
          Restart = "always";
          User = "panel";
          Group = "panel";
        };
      };

      users.users.panel = {
        isSystemUser = true;
        group = "panel";
      };
      users.groups.panel = {};
    })

    (lib.mkIf cfg.agent.enable {
      systemd.services.panel-agent = {
        description = "L7V Panel Agent";
        after = [ "dbus.service" "systemd-user-sessions.service" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${pkgs.panel-agent}/bin/panel-agent --socket /run/panel-agent/${cfg.hostName}.sock";
          RuntimeDirectory = "panel-agent";
          Restart = "always";
          User = "root";
          Group = "root";
        };
      };

      environment.systemPackages = [ pkgs.panel-agent ];
    })
  ];
}
