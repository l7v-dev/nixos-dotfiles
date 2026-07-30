# Shared NixOS module list for server hosts.
#
# Consumed by lib/mkServer.nix (flake nixosConfigurations) and colmena.nix
# (deployment nodes) so both paths resolve roles to capabilities identically.
# Callers supply the nixpkgs instance themselves: mkServer via nixpkgs.pkgs,
# colmena via meta.nixpkgs.
{
  lib,
  sops,
  homeManager,
  host,
  user,
  roles,
  tags,
}:
let
  roleCapabilities = {
    web = [
      "secrets"
      "reverse-proxy"
      "metrics"
      "logging"
    ];
    db = [
      "secrets"
      "database"
      "metrics"
      "logging"
      "backup"
    ];
    observe = [
      "secrets"
      "metrics"
      "logging"
    ];
    git = [
      "secrets"
      "reverse-proxy"
      "database"
      "backup"
    ];
    ci = [
      "secrets"
      "metrics"
      "logging"
    ];
    cache = [
      "secrets"
      "cache"
    ];
    backup = [
      "secrets"
      "backup"
    ];
    messaging = [
      "secrets"
      "reverse-proxy"
      "database"
      "messaging"
    ];
  };

  # Unknown roles resolve to secrets only, keeping sops available for host-local
  # secret declarations rather than failing evaluation.
  capabilities = lib.unique (
    lib.concatMap (role: roleCapabilities.${role} or [ "secrets" ]) roles
  );

  hostDir = ../hosts/${host};
in
[
  sops
  homeManager
  ../infrastructure
  ../capabilities
  ../services
  ../platform
  (hostDir + "/default.nix")
  (hostDir + "/hardware.nix")
  {
    l7v = {
      identity.user = user;
      infrastructure.isServer = true;
      server = { inherit roles tags; };

      secrets.enable = lib.elem "secrets" capabilities;
      database.enable = lib.elem "database" capabilities;
      metrics.enable = lib.elem "metrics" capabilities;
      logging.enable = lib.elem "logging" capabilities;
      reverseProxy.enable = lib.elem "reverse-proxy" capabilities;
      backup.enable = lib.elem "backup" capabilities;
      cache.enable = lib.elem "cache" capabilities;
      messaging.enable = lib.elem "messaging" capabilities;
    };

    home-manager = {
      useGlobalPkgs = true;
      useUserPackages = true;
      backupFileExtension = "bak";
      extraSpecialArgs = { inherit user; };
      users.${user}.imports = [ ../home/minimal/default.nix ];
    };
  }
]
