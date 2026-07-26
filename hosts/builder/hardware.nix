# Host: builder hardware
# CI + binary cache node. Büyük /nix/store için btrfs önerilir.
# UUID'leri doldurmak için: blkid /dev/sdXY
{ config, lib, modulesPath, ... }:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";

  boot.initrd.availableKernelModules = [ "ahci" "xhci_pci" "usbhid" "usb_storage" "sd_mod" ];
  boot.initrd.kernelModules          = [ ];
  boot.kernelModules                 = [ "kvm-intel" ];
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
    # /nix/store builder'da büyür — ayrı subvolume kolayca snapshotlanır
    options = [ "subvol=nix" "noatime" "compress=zstd" ];
    neededForBoot = true;
  };

  fileSystems."/home" = {
    device  = "/dev/disk/by-uuid/TODO-ROOT-UUID";
    fsType  = "btrfs";
    options = [ "subvol=home" "noatime" "compress=zstd" ];
  };

  fileSystems."/boot" = {
    device  = "/dev/disk/by-uuid/TODO-EFI-UUID";
    fsType  = "vfat";
    options = [ "fmask=0077" "dmask=0077" ];
  };

  swapDevices = [ ];
}
