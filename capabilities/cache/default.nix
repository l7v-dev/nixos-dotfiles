# Cache capability: nix-serve signed binary cache.
#
# Serves the local Nix store as a binary cache over HTTP. The signing key is
# provisioned by sops-nix and referenced directly — no "or" fallback needed
# because secrets.enable is asserted before this config block runs.
#
# After bootstrap, generate the signing key:
#   nix-store --generate-binary-cache-key cache.l7v.dev \
#     /etc/sops/secrets/cache/signing_key \
#     /etc/nix/cache-pub-key.pub
#
# Add the public key to flake.nix nixConfig.extra-trusted-public-keys.
{ lib, config, ... }:
{
  options.l7v.cache = {
    enable = lib.mkEnableOption "nix binary cache capability";

    port = lib.mkOption {
      type = lib.types.port;
      default = 5000;
      description = "Port nix-serve listens on.";
    };
  };

  config = lib.mkIf config.l7v.cache.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.cache requires l7v.secrets.enable = true";
      }
    ];

    sops.secrets."cache/signing_key" = {
      owner = "root";
      group = "root";
      mode = "0400";
    };

    services.nix-serve = {
      enable = true;
      port = config.l7v.cache.port;
      # Direct attribute access — safe because the assertion above guarantees
      # sops-nix is active and the secret is declared in this same module.
      secretKeyFile = config.sops.secrets."cache/signing_key".path;
    };

    networking.firewall.allowedTCPPorts = [ config.l7v.cache.port ];
  };
}
