# Platform inventory: centralised host metadata written to /etc/l7v/inventory.json.
# The `l7v-inventory` CLI reads and formats this file.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  inventoryJson = pkgs.writeText "inventory.json" (
    builtins.toJSON config.l7v.platform.inventory.hosts
  );
in
{
  options.l7v.platform.inventory = {
    enable = lib.mkEnableOption "host inventory";

    hosts = lib.mkOption {
      description = "Hardware and role inventory for all managed hosts.";
      type = lib.types.attrsOf (lib.types.attrsOf lib.types.anything);
      default = {
        laptop = {
          role = "workstation";
          cpu = "AMD Ryzen";
          disk = "476G NVMe btrfs";
          os = "NixOS unstable";
          purpose = "L7V primary development machine";
        };
        server = {
          role = "server";
          cpu = "TODO";
          disk = "TODO btrfs";
          os = "NixOS stable 25.05";
          purpose = "web + db + git + observe";
          services = [
            "forgejo"
            "grafana"
            "vaultwarden"
            "prometheus"
            "loki"
            "nginx"
            "postgresql"
          ];
        };
        builder = {
          role = "server";
          cpu = "TODO";
          disk = "TODO btrfs";
          os = "NixOS stable 25.05";
          purpose = "CI runner + binary cache";
          services = [
            "gitea-actions-runner"
            "nix-serve"
          ];
        };
        backup = {
          role = "server";
          cpu = "TODO";
          disk = "TODO btrfs + data disk";
          os = "NixOS stable 25.05";
          purpose = "Restic SFTP backup target";
          services = [
            "openssh"
            "restic"
          ];
        };
      };
    };
  };

  config = lib.mkIf config.l7v.platform.inventory.enable {
    environment.etc."l7v/inventory.json".source = inventoryJson;

    environment.systemPackages = [
      (pkgs.writeShellScriptBin "l7v-inventory" ''
        ${pkgs.jq}/bin/jq -r '
          to_entries[] |
          "  \(.key)\t[\(.value.role)]\t\(.value.purpose)"
        ' /etc/l7v/inventory.json
      '')
    ];
  };
}
