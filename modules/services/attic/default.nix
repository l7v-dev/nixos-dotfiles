# Service: Attic (Nix binary cache) — phase 4 placeholder.
#
# services.atticd is not yet stable in NixOS 25.05. The cache capability uses
# nix-serve in the meantime. This module will be implemented when atticd reaches
# production quality in a future stable channel.
{ lib, config, ... }:
{
  options.l7v.services.attic = {
    enable = lib.mkEnableOption "attic nix cache service (phase 4)";

    domain = lib.mkOption {
      type = lib.types.str;
      default = "cache.l7v.dev";
      description = "Public FQDN for the Attic binary cache.";
    };
  };

  # Phase 4 implementation pending. Emit a warning so the operator knows
  # enable = true is a no-op until this module is implemented.
  config = lib.mkIf config.l7v.services.attic.enable {
    warnings = [
      "l7v.services.attic is a phase-4 stub and has no effect. Use l7v.cache (nix-serve) for binary caching."
    ];
  };
}
