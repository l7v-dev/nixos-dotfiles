# Colmena deployment topology.
#
# Node module lists come from lib/serverModules.nix, so deployments and
# flake nixosConfigurations resolve roles to capabilities identically.
# The `servers` argument is the single topology definition held in flake.nix.
#
#   colmena apply --on @production
#   colmena apply --on server
#   colmena build
#
# Requires root SSH access per target; client-side host entries are declared in
# platform/deploy/default.nix.
{ inputs, servers }:
let
  nixpkgsStable = inputs.nixpkgs-stable;
  inherit (nixpkgsStable) lib;

  system = "x86_64-linux";
  user = "l7v";

  serverModules = import ./lib/serverModules.nix;

  mkNode = host: cfg: {
    deployment = {
      inherit (cfg) targetHost tags;
      targetUser = "root";
      # Build locally and push closures; targets are not sized for compilation.
      buildOnTarget = false;
    };

    imports =
      serverModules {
        inherit lib host user;
        inherit (cfg) roles tags;
        sops = inputs.sops-nix.nixosModules.sops;
        homeManager = inputs.home-manager-stable.nixosModules.home-manager;
      }
      # microvm NixOS module must be present so that capabilities/virtualisation
      # can reference microvm.* options without errors. No-op on servers since
      # l7v.virtualisation.enable is never set true for server nodes.
      ++ [
        inputs.microvm.nixosModules.host
        # Explicitly disabled on servers — workstations enable this via
        # l7v.virtualisation.microvm.enable in hosts/laptop/default.nix.
        { microvm.host.enable = false; }
      ];
  };
in
{
  meta = {
    nixpkgs = import nixpkgsStable {
      inherit system;
      config.allowUnfree = true;
    };

    nodeSpecialArgs = lib.mapAttrs (host: cfg: {
      inherit user inputs host;
      inherit (cfg) roles tags;
      # Unstable pkgs (with gomod2nix overlay) for modules that require
      # unstable-only features (e.g. fetchPnpmDeps in panel-frontend).
      unstablePkgs = import inputs.nixpkgs {
        inherit system;
        config.allowUnfree = true;
        overlays = [ inputs.gomod2nix.overlays.default ];
      };
    }) servers;
  };
}
// lib.mapAttrs mkNode servers
