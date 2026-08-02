# Host: server hardware
# UUID'leri doldurmak için: blkid /dev/sdXY
# Kurulum sonrası bu dosyayı gerçek değerlerle güncelle.
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
    kernelModules = [ "kvm-intel" ]; # Intel server CPU varsayımı
    extraModulePackages = [ ];
  };

  # TODO: aşağıdaki UUID'leri gerçek disklerle değiştir (blkid ile al)
  fileSystems = {
    "/" = {
      device = "/dev/disk/by-uuid/TODO-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=root"
        "noatime"
        "compress=zstd"
      ];
    };

    "/nix" = {
      device = "/dev/disk/by-uuid/TODO-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=nix"
        "noatime"
        "compress=zstd"
      ];
      neededForBoot = true;
    };

    "/home" = {
      device = "/dev/disk/by-uuid/TODO-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=home"
        "noatime"
        "compress=zstd"
      ];
    };

    "/srv" = {
      device = "/dev/disk/by-uuid/TODO-ROOT-UUID";
      fsType = "btrfs";
      options = [
        "subvol=srv"
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
  };

  swapDevices = [ ];
}
