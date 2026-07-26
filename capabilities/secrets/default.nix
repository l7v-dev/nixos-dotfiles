# Secrets capability: sops-nix + age keys + cross-host sync
{ lib, config, pkgs, ... }:
{
  options.l7v.secrets = {
    enable = lib.mkEnableOption "sops-nix secrets capability";

    # Cross-host sync: hangi hostların key'leri burada tanımlı
    hosts = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = {};
      description = "hostname → age public key eşlemesi";
      example = {
        server  = "age1abc...";
        builder = "age1def...";
        backup  = "age1ghi...";
      };
    };
  };

  config = lib.mkIf config.l7v.secrets.enable {
    sops = {
      defaultSopsFile = ../../secrets/sops/secrets.yaml;
      age = {
        keyFile     = "/etc/age/key";
        generateKey = false;
      };
    };

    # age key dizini
    system.activationScripts.ageKeyDir = ''
      mkdir -p /etc/age
      chmod 700 /etc/age
    '';

    environment.systemPackages = with pkgs; [
      age
      sops
      ssh-to-age  # SSH key → age key
    ];
  };
}
