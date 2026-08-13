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
  extraOverlays ? [ ],
  # Unstable nixpkgs instance passed as specialArgs so modules that require
  # features not yet in stable (e.g. fetchPnpmDeps for panel-frontend) can
  # reference it explicitly. Defaults to pkgs when omitted (workstation path).
  unstablePkgs ? pkgs,
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
      unstablePkgs
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
      # microvm NixOS module must be present on all hosts so that
      # capabilities/virtualisation/default.nix can reference microvm.*
      # options without evaluation errors. Explicitly disabled on servers.
      inputs.microvm.nixosModules.host
      { microvm.host.enable = false; }
      {
        nixpkgs.pkgs = import pkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = extraOverlays;
        };
      }
    ];
}
