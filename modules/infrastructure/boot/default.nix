# Boot: systemd-boot EFI loader.
# Workstations default to the Zen kernel; servers use the LTS kernel via
# lib.mkIf isServer in infrastructure/boot/default.nix for stability.
{
  lib,
  pkgs,
  config,
  ...
}:
{
  config = {
    boot = {
      loader = {
        systemd-boot.enable = true;
        efi.canTouchEfiVariables = true;
      };

      # Zen kernel for workstations: better latency, gaming, and desktop responsiveness.
      # 6.6 LTS kernel for servers: long-term stable ABI, predictable security backports.
      # Note: nixos-25.05 ships linuxPackages_6_6 as the LTS kernel (linuxPackages_lts removed).
      kernelPackages = lib.mkDefault (
        if config.l7v.infrastructure.isServer then pkgs.linuxPackages_6_6 else pkgs.linuxPackages_zen
      );

      # Common initrd modules: NVMe, USB, SATA, Ethernet
      initrd.availableKernelModules = [
        "xhci_pci"
        "ahci"
        "nvme"
        "usb_storage"
        "sd_mod"
        "sr_mod"
        "ata_piix"
        "usbhid"
        "hid_generic"
      ];
    };
  };
}
