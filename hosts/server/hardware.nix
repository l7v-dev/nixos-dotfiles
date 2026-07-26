# Host: server hardware
# UUID'leri doldurmak için: blkid /dev/sdXY
# Kurulum sonrası bu dosyayı gerçek değerlerle güncelle.
{ config, lib, modulesPath, ... }:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";

  boot.initrd.availableKernelModules = [ "ahci" "xhci_pci" "usbhid" "usb_storage" "sd_mod" ];
  boot.initrd.kernelModules          = [ ];
  boot.kernelModules                 = [ "kvm-intel" ];  # Intel server CPU varsayımı
  boot.extraModulePackages           = [ ];

  # TODO: aşağıdaki UUID'leri gerçek disklerle değiştir (blkid ile al)
  fileSystems."/" = {
    device  = "/dev/disk/by-uuid/TODO-ROOT-UUID";
    fsType  = "btrfs";
    options = [ "subvol=root" "noatime" "compress=zstd" ];
  };

  fileSystems."/nix" = {
    device  = "/dev/disk/by-uuid/TODO-ROOT-UUID";
    fsType  = "btrfs";
    options = [ "subvol=nix" "noatime" "compress=zstd" ];
    neededForBoot = true;
  };

  fileSystems."/home" = {
    device  = "/dev/disk/by-uuid/TODO-ROOT-UUID";
    fsType  = "btrfs";
    options = [ "subvol=home" "noatime" "compress=zstd" ];
  };

  fileSystems."/srv" = {
    device  = "/dev/disk/by-uuid/TODO-ROOT-UUID";
    fsType  = "btrfs";
    options = [ "subvol=srv" "noatime" "compress=zstd" ];
  };

  fileSystems."/boot" = {
    device  = "/dev/disk/by-uuid/TODO-EFI-UUID";
    fsType  = "vfat";
    options = [ "fmask=0077" "dmask=0077" ];
  };

  swapDevices = [ ];
}
