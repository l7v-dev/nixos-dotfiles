# Cache capability: nix-serve (signed binary cache)
# atticd yerine nix-serve — stabil NixOS modülü (26.11'de mevcut).
{ lib, config, ... }:
{
  options.l7v.cache = {
    enable = lib.mkEnableOption "nix binary cache capability";
    port = lib.mkOption {
      type = lib.types.port;
      default = 5000;
    };
  };

  config = lib.mkIf config.l7v.cache.enable {
    services.nix-serve = {
      enable = true;
      port = config.l7v.cache.port;
      secretKeyFile = config.sops.secrets."cache/signing_key".path or "/etc/nix/signing-key";
    };

    sops.secrets."cache/signing_key" = { };

    networking.firewall.allowedTCPPorts = [ config.l7v.cache.port ];
  };
}
