# Network: NetworkManager for workstations, systemd-networkd for servers.
{ lib, config, ... }:
{
  config = {
    networking = {
      networkmanager.enable = !config.l7v.infrastructure.isServer;
      useNetworkd = config.l7v.infrastructure.isServer;
      useDHCP = lib.mkDefault (!config.l7v.infrastructure.isServer);
      firewall = {
        enable = true;
        allowedTCPPorts = [
          22 # SSH
        ];
      };
    };
  };
}
