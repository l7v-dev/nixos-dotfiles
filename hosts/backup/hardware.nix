# Host: backup hardware
# Backup node: OS diski + büyük veri diski (/srv/backup).
# UUID'leri doldurmak için: blkid /dev/sdXY
{
  lib,
  modulesPath,
  ...
}:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";

  boot = {
    initrd.availableKernelModules = [
      "ahci"
      "xhci_pci"
      "usbhid"
      "usb_storage"
      "sd_mod"
    ];
    initrd.kernelModules = [ ];
    kernelModules = [ ];
    extraModulePackages = [ ];
  };

  # TODO: aşağıdaki UUID'leri gerçek disklerle değiştir (blkid ile al)

  fileSystems = {
    # OS diski (SSD/küçük disk)
    "/" = {
      device = "/dev/disk/by-uuid/TODO-OS-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=root"
        "noatime"
        "compress=zstd"
      ];
    };

    "/nix" = {
      device = "/dev/disk/by-uuid/TODO-OS-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=nix"
        "noatime"
        "compress=zstd"
      ];
      neededForBoot = true;
    };

    "/home" = {
      device = "/dev/disk/by-uuid/TODO-OS-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=home"
        "noatime"
        "compress=zstd"
      ];
    };

    "/boot" = {
      device = "/dev/disk/by-uuid/TODO-EFI-UUID";
      fsType = "vfat";
      options = [
        "fmask=0077"
        "dmask=0077"
      ];
    };

    # Veri diski (büyük HDD — restic repository)
    "/srv/backup" = {
      device = "/dev/disk/by-uuid/TODO-DATA-UUID";
      fsType = "btrfs";
      options = [
        "noatime"
        "compress=zstd"
      ];
    };
  };

  swapDevices = [ ];
}
