# Boot: systemd-boot EFI loader.
# Workstations default to the Zen kernel; servers override to linuxPackages_lts
# inside lib/serverModules.nix via the isServer flag.
{
  lib,
  pkgs,
  ...
}:
{
  config = {
    boot = {
      loader = {
        systemd-boot.enable = true;
        efi.canTouchEfiVariables = true;
      };

      # Zen kernel as the workstation default; overridable per-host.
      kernelPackages = lib.mkDefault pkgs.linuxPackages_zen;

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
