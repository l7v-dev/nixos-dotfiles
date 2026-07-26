# Platform Deploy: colmena araçları + SSH config
# Topoloji tanımı: /colmena.nix (flake root'unda)
#
# Kullanım:
#   colmena apply --on @production
#   colmena apply --on server
#   colmena build
{ lib, config, pkgs, ... }:
{
  options.l7v.platform.deploy = {
    enable = lib.mkEnableOption "colmena deploy tooling";
  };

  config = lib.mkIf config.l7v.platform.deploy.enable {
    environment.systemPackages = with pkgs; [
      colmena
      rage        # age şifreleme CLI
      ssh-to-age  # SSH key → age key dönüşümü
      sops        # secret düzenleme
    ];

    # Server'lara SSH erişimi için config
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
