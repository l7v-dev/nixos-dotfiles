# Platform deploy: Colmena deployment tooling and SSH host configuration.
#
# The deployment topology is defined in /colmena.nix (flake root).
#
#   colmena apply --on @production
#   colmena apply --on server
#   colmena build
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.platform.deploy = {
    enable = lib.mkEnableOption "colmena deploy tooling";
  };

  config = lib.mkIf config.l7v.platform.deploy.enable {
    environment.systemPackages = with pkgs; [
      colmena
      rage # age encryption CLI
      ssh-to-age # convert SSH keys to age format
      sops # secret file editor
    ];

    # SSH client config for root access to managed nodes.
    programs.ssh.extraConfig = ''
      Host server.l7v.dev
        User root
        IdentityFile ~/.ssh/id_ed25519
        StrictHostKeyChecking accept-new

      Host builder.l7v.dev
        User root
        IdentityFile ~/.ssh/id_ed25519
        StrictHostKeyChecking accept-new

      Host backup.l7v.dev
        User root
        IdentityFile ~/.ssh/id_ed25519
        StrictHostKeyChecking accept-new
    '';
  };
}
