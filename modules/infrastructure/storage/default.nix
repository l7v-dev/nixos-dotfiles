# Storage: btrfs mount optimisation, zram swap, journald limits, smartd, LUKS.
#
# The btrfs subvolume layout (root, nix, home, tmp, srv) is declared in each
# host's hardware.nix. This module only applies global mount options and
# auxiliary storage services.
{ lib, config, ... }:
{
  options.l7v.storage.luks = {
    enable = lib.mkEnableOption "LUKS full-disk encryption with initrd unlock";

    devices = lib.mkOption {
      type = lib.types.attrsOf (
        lib.types.submodule {
          options = {
            device = lib.mkOption {
              type = lib.types.str;
              description = "Encrypted block device path (e.g. /dev/disk/by-uuid/...).";
            };
            allowDiscards = lib.mkOption {
              type = lib.types.bool;
              default = true;
              description = "Pass discard/TRIM commands through to the underlying SSD/NVMe.";
            };
            keyFile = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Optional keyfile path inside the initrd.";
            };
            preLVM = lib.mkOption {
              type = lib.types.bool;
              default = true;
              description = "Unlock the device before LVM scanning.";
            };
          };
        }
      );
      default = { };
      description = "LUKS device mappings added to boot.initrd.luks.devices.";
    };
  };

  config = {
    boot.initrd.luks.devices = lib.mkIf config.l7v.storage.luks.enable (
      lib.mapAttrs (_: cfg: {
        inherit (cfg) device;
        inherit (cfg) allowDiscards;
        inherit (cfg) keyFile;
        inherit (cfg) preLVM;
      }) config.l7v.storage.luks.devices
    );

    # Cryptographic kernel modules required when LUKS is active.
    boot.initrd.availableKernelModules = lib.optionals config.l7v.storage.luks.enable [
      "dm_mod"
      "dm_crypt"
      "cryptd"
      "input_leds"
      "aesni_intel"
    ];

    # Global btrfs mount optimisation. Subvolume layout is in hardware.nix.
    fileSystems."/".options = [
      "noatime"
      "compress=zstd"
    ];

    # Zram swap — useful on workstations; servers have predictable memory loads.
    zramSwap = {
      enable = !config.l7v.infrastructure.isServer;
      memoryPercent = 50;
    };

    # Storage services
    services = {
      journald.extraConfig = ''
        Storage=persistent
        SystemMaxUse=2G
        MaxRetentionSec=2week
      '';

      smartd = {
        enable = true;
        autodetect = true;
      };

      # Periodic TRIM for NVMe and SSD storage drives
      fstrim.enable = true;
    };
  };
}
