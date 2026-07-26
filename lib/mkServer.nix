# mkServer: rol→capability resolver (stable channel)
{ pkgs
, homeManager
, sops
, host
, user
, roles ? []
, tags  ? []
, system ? "x86_64-linux"
, inputs
, lib ? pkgs.lib
}:
let
  hostDir = ./../hosts/${host};
  homeDir = ./../home;

  roleToCapability = role: {
    "web"     = [ "secrets" "reverse-proxy" "metrics" "logging" ];
    "db"      = [ "secrets" "database" "metrics" "logging" "backup" ];
    "observe" = [ "secrets" "metrics" "logging" ];
    "git"     = [ "secrets" "reverse-proxy" "database" "backup" ];
    "ci"      = [ "secrets" "metrics" "logging" ];
    "cache"   = [ "secrets" "cache" ];
    "backup"  = [ "secrets" "backup" ];
  }."${role}" or [ "secrets" ];

  capabilities = lib.unique (lib.concatMap roleToCapability roles);
in
lib.nixosSystem {
  inherit system;
  specialArgs = { inherit user inputs host roles tags; };
  modules = [
    sops
    homeManager
    ../infrastructure
    ../capabilities
    ../services
    ../platform
    (hostDir + "/default.nix")
    (hostDir + "/hardware.nix")
    { nixpkgs.pkgs = import pkgs { inherit system; config.allowUnfree = true; }; }
    ({ config, pkgs, lib, ... }: {
      l7v.identity.user           = user;
      l7v.infrastructure.isServer = true;
      l7v.server.roles            = roles;
      l7v.server.tags             = tags;

      l7v.secrets.enable      = lib.elem "secrets"       capabilities;
      l7v.database.enable     = lib.elem "database"      capabilities;
      l7v.metrics.enable      = lib.elem "metrics"       capabilities;
      l7v.logging.enable      = lib.elem "logging"       capabilities;
      l7v.reverseProxy.enable = lib.elem "reverse-proxy" capabilities;
      l7v.backup.enable       = lib.elem "backup"        capabilities;
      l7v.cache.enable        = lib.elem "cache"         capabilities;

      home-manager = {
        useGlobalPkgs       = true;
        useUserPackages     = true;
        backupFileExtension = "bak";
        extraSpecialArgs    = { inherit user inputs; };
        users.${user} = { imports = [
          (homeDir + "/minimal/default.nix")
        ]; };
      };
    })
  ];
}
