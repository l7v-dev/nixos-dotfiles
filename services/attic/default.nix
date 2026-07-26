# Service: Attic (nix binary cache) — placeholder
# services.atticd API'si NixOS 26.11'de stabil değil; phase 4'te
# nix-serve yerine atticd implementasyonu eklenecek.
{ lib, ... }:
{
  options.l7v.services.attic = {
    enable = lib.mkEnableOption "attic nix cache service (phase 4)";
    domain = lib.mkOption {
      type    = lib.types.str;
      default = "cache.l7v.dev";
    };
  };

  config = { };  # phase 4 implementasyonu
}
