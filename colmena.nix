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
  lib = nixpkgsStable.lib;

  system = "x86_64-linux";
  user = "l7v";

  serverModules = import ./lib/serverModules.nix;

  mkNode = host: cfg: {
    deployment = {
      targetHost = cfg.targetHost;
      targetUser = "root";
      # Build locally and push closures; targets are not sized for compilation.
      buildOnTarget = false;
      tags = cfg.tags;
    };

    imports = serverModules {
      inherit lib host user;
      inherit (cfg) roles tags;
      sops = inputs.sops-nix.nixosModules.sops;
      homeManager = inputs.home-manager-stable.nixosModules.home-manager;
    };
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
    }) servers;
  };
}
// lib.mapAttrs mkNode servers
