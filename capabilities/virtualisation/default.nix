# Virtualisation capability: libvirt + virt-manager (KVM/QEMU).
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.virtualisation = {
    enable = lib.mkEnableOption "libvirt virtualisation capability";
  };

  config = lib.mkIf config.l7v.virtualisation.enable {
    virtualisation.libvirtd.enable = true;

    users.users.${config.l7v.identity.user}.extraGroups = [ "libvirtd" ];

    environment.systemPackages = with pkgs; [
      virt-manager
      virt-viewer
    ];
  };
}
