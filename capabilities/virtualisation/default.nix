# Virtualisation capability: libvirt + virt-manager (KVM/QEMU) + microvm host.
#
# microvm.host.enable wires up the virtiofsd socket and the microvm@.service
# unit. Individual VM definitions live in hosts/<host>/microvms/.
# Workstation-only: servers never set l7v.virtualisation.enable.
{
  lib,
  config,
  pkgs,
  inputs,
  ...
}:
{
  options.l7v.virtualisation = {
    enable = lib.mkEnableOption "libvirt virtualisation capability";

    microvm = {
      enable = lib.mkEnableOption "microvm host support (ephemeral agent VMs)";
    };
  };

  config = lib.mkIf config.l7v.virtualisation.enable (
    lib.mkMerge [
      # ── libvirt / KVM ────────────────────────────────────────────────────
      {
        virtualisation.libvirtd.enable = true;

        users.users.${config.l7v.identity.user}.extraGroups = [ "libvirtd" ];

        environment.systemPackages = with pkgs; [
          virt-manager
          virt-viewer
        ];
      }

      # ── microvm host ─────────────────────────────────────────────────────
      (lib.mkIf config.l7v.virtualisation.microvm.enable {
        microvm.host.enable = true;

        # virtiofsd requires these kernel modules
        boot.kernelModules = [
          "kvm-amd"
          "kvm-intel"
          "vhost_vsock"
        ];

        environment.systemPackages = [
          inputs.microvm.packages.${pkgs.stdenv.hostPlatform.system}.microvm
        ];
      })
    ]
  );
}
