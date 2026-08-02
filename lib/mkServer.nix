# Builds a server nixosSystem on the stable channel.
#
# Role-to-capability resolution and the module list live in lib/serverModules.nix,
# shared with colmena.nix.
{
  pkgs,
  homeManager,
  sops,
  host,
  user,
  roles ? [ ],
  tags ? [ ],
  system ? "x86_64-linux",
  inputs,
  lib ? pkgs.lib,
}:
lib.nixosSystem {
  inherit system;
  specialArgs = {
    inherit
      user
      inputs
      host
      roles
      tags
      ;
  };
  modules =
    import ./serverModules.nix {
      inherit
        lib
        sops
        homeManager
        host
        user
        roles
        tags
        ;
    }
    ++ [
      {
        nixpkgs.pkgs = import pkgs {
          inherit system;
          config.allowUnfree = true;
        };
      }
    ];
}
