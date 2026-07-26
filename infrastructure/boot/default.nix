# Boot: systemd-boot. Workstation'da zen kernel, sunucu'da LTS kernel (mkServer'da)
# Initrd modülleri donanım desteği için
{ lib, pkgs, config, ... }:
{
  config = {
    boot.loader.systemd-boot.enable      = true;
    boot.loader.efi.canTouchEfiVariables = true;

    # Workstation için zen kernel (isteğe bağlı, isServer flag'ine göre override edilebilir)
    boot.kernelPackages = lib.mkDefault pkgs.linuxPackages_zen;

    # Ortak initrd modülleri (NVMe, USB, SATA, Ethernet)
    boot.initrd.availableKernelModules = [
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
}
