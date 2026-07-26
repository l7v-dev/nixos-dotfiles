# Colmena deploy topolojisi
# Kullanım:
#   colmena apply --on @production   # tüm production host'ları
#   colmena apply --on server        # tek host
#   colmena build                    # deploy etmeden sadece build
#
# Gereksinim: her host'ta SSH erişimi (root veya sudo yetkisi)
#   ~/.ssh/config'de Host tanımları platform/deploy/default.nix'te

{ inputs, ... }:
let
  nixpkgs-stable      = inputs.nixpkgs-stable;
  home-manager-stable = inputs.home-manager-stable;
  sops-nix            = inputs.sops-nix;

  mkS = import ./lib/mkServer.nix;

  commonServerMeta = {
    targetUser = "root";
    buildOnTarget = false;  # local build, sonra push
  };

  serverArgs = {
    inherit inputs;
    lib         = nixpkgs-stable.lib;
    pkgs        = nixpkgs-stable;
    homeManager = home-manager-stable.nixosModules.home-manager;
    sops        = sops-nix.nixosModules.sops;
    user        = "l7v";
    system      = "x86_64-linux";
  };
in
{
  meta = {
    nixpkgs = nixpkgs-stable.legacyPackages.x86_64-linux;

    # Her host için özelleştirilebilir nixpkgs
    nodeNixpkgs = { };
  };

  server = commonServerMeta // {
    deployment.targetHost = "server.l7v.dev";  # TODO: EC2 public IP veya Route53 A kaydı
    deployment.tags       = [ "production" "web" "db" ];

    imports = (mkS (serverArgs // {
      host  = "server";
      roles = [ "web" "db" "observe" "git" ];
      tags  = [ "production" ];
    })).config._module.args or [ ];

    # Colmena modül olarak server config'i kullanır
    nixpkgs.hostPlatform = "x86_64-linux";
    imports = [
      ./hosts/server/default.nix
      ./hosts/server/hardware.nix
      ./infrastructure
      ./capabilities
      ./services
      ./platform
      sops-nix.nixosModules.sops
      home-manager-stable.nixosModules.home-manager
    ];
  };

  builder = commonServerMeta // {
    deployment.targetHost = "builder.l7v.dev";  # TODO: EC2 public IP veya Route53 A kaydı
    deployment.tags       = [ "builder" "ci" ];

    nixpkgs.hostPlatform = "x86_64-linux";
    imports = [
      ./hosts/builder/default.nix
      ./hosts/builder/hardware.nix
      ./infrastructure
      ./capabilities
      ./services
      ./platform
      sops-nix.nixosModules.sops
      home-manager-stable.nixosModules.home-manager
    ];
  };

  backup = commonServerMeta // {
    deployment.targetHost = "backup.l7v.dev";  # TODO: EC2 public IP veya Route53 A kaydı — S3 kullanılıyorsa bu host opsiyonel
    deployment.tags       = [ "backup" ];

    nixpkgs.hostPlatform = "x86_64-linux";
    imports = [
      ./hosts/backup/default.nix
      ./hosts/backup/hardware.nix
      ./infrastructure
      ./capabilities
      ./services
      ./platform
      sops-nix.nixosModules.sops
      home-manager-stable.nixosModules.home-manager
    ];
  };
}
