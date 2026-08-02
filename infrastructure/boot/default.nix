# Boot: systemd-boot. Workstation'da zen kernel, sunucu'da LTS kernel (mkServer'da)
# Initrd modülleri donanım desteği için
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

      # Workstation için zen kernel (isteğe bağlı, isServer flag'ine göre override edilebilir)
      kernelPackages = lib.mkDefault pkgs.linuxPackages_zen;

      # Ortak initrd modülleri (NVMe, USB, SATA, Ethernet)
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
