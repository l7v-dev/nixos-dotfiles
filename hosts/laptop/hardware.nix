# Host: laptop hardware config — btrfs subvolume layout
# UUID: af7c7689-eced-4e46-a4ca-0b914d0f6bbe (btrfs), 49D8-F9C0 (EFI)
{ config, lib, pkgs, modulesPath, ... }:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  boot.initrd.availableKernelModules = [ "nvme" "xhci_pci" "sdhci_pci" ];
  boot.initrd.kernelModules          = [ ];
  boot.kernelModules                 = [ "kvm-amd" ];
  boot.extraModulePackages           = [ ];

  fileSystems."/" = {
    device  = "/dev/disk/by-uuid/af7c7689-eced-4e46-a4ca-0b914d0f6bbe";
    fsType  = "btrfs";
    options = [ "noatime" "compress=zstd" ];
  };

  fileSystems."/nix" = {
    device  = "/dev/disk/by-uuid/af7c7689-eced-4e46-a4ca-0b914d0f6bbe";
    fsType  = "btrfs";
    options = [ "subvol=nix" "noatime" "compress=zstd" ];
    neededForBoot = true;
  };

  fileSystems."/home" = {
    device  = "/dev/disk/by-uuid/af7c7689-eced-4e46-a4ca-0b914d0f6bbe";
    fsType  = "btrfs";
    options = [ "subvol=home" "noatime" "compress=zstd" ];
  };

  fileSystems."/tmp" = {
    device  = "/dev/disk/by-uuid/af7c7689-eced-4e46-a4ca-0b914d0f6bbe";
    fsType  = "btrfs";
    options = [ "subvol=tmp" "noatime" "compress=zstd" ];
  };

  fileSystems."/srv" = {
    device  = "/dev/disk/by-uuid/af7c7689-eced-4e46-a4ca-0b914d0f6bbe";
    fsType  = "btrfs";
    options = [ "subvol=srv" "noatime" "compress=zstd" ];
  };

  fileSystems."/boot" = {
    device  = "/dev/disk/by-uuid/49D8-F9C0";
    fsType  = "vfat";
    options = [ "fmask=0077" "dmask=0077" ];
  };

  swapDevices = [ ];

  hardware.cpu.amd.updateMicrocode =
    lib.mkDefault config.hardware.enableRedistributableFirmware;

  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";
}
