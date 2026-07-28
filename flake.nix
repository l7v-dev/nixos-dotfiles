{
  description = "l7v — capability-first NixOS platform";

  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
      "https://niri.cachix.org"
      "https://noctalia.cachix.org"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X430o0NTRsrVMVZm7aWcSrq3LcpPo8gvLu8="
      "nix-community.cachix.org-1:mB9FSh9qf2QlZceEZWgjwkngzBLckc0Vc8t9aXXj4mQ="
      "niri.cachix.org-1:Wv0m4ydO/mub0AXv9+66Cg94SgB9nCsc3LymnscbAt8="
      "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
    ];
  };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # Servers pin the stable channel; workstations track unstable.
    nixpkgs-stable.url = "github:NixOS/nixpkgs/nixos-25.05";

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    home-manager-stable = {
      url = "github:nix-community/home-manager/release-25.05";
      inputs.nixpkgs.follows = "nixpkgs-stable";
    };
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    niri-flake = {
      url = "github:sodiboo/niri-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    noctalia = {
      url = "github:noctalia-dev/noctalia";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    zen-browser.url = "github:0xc000022070/zen-browser-flake";
  };

  outputs =
    {
      nixpkgs,
      nixpkgs-stable,
      home-manager,
      home-manager-stable,
      sops-nix,
      ...
    }@inputs:
    let
      lib = nixpkgs.lib;

      # Server topology. Single source of truth for both nixosConfigurations and
      # the colmena deployment hive; adding a node here is sufficient.
      servers = {
        server = {
          targetHost = "server.l7v.dev";
          roles = [
            "web"
            "db"
            "observe"
            "git"
          ];
          tags = [ "production" ];
        };
        builder = {
          targetHost = "builder.l7v.dev";
          roles = [
            "ci"
            "cache"
          ];
          tags = [ "builder" ];
        };
        backup = {
          targetHost = "backup.l7v.dev";
          roles = [ "backup" ];
          tags = [ "backup" ];
        };
      };

      mkWorkstation = import ./lib/mkWorkstation.nix;
      mkServer = import ./lib/mkServer.nix;

      commonArgs = {
        inherit lib inputs;
        pkgs = nixpkgs;
        homeManager = home-manager.nixosModules.home-manager;
        sops = sops-nix.nixosModules.sops;
        user = "l7v";
        system = "x86_64-linux";
      };

      serverArgs = commonArgs // {
        lib = nixpkgs-stable.lib;
        pkgs = nixpkgs-stable;
        homeManager = home-manager-stable.nixosModules.home-manager;
      };
    in
    {
      nixosConfigurations = {
        L7V = mkWorkstation (commonArgs // { host = "laptop"; });
      }
      // lib.mapAttrs (
        host: cfg:
        mkServer (
          serverArgs
          // {
            inherit host;
            inherit (cfg) roles tags;
          }
        )
      ) servers;

      colmena = import ./colmena.nix { inherit inputs servers; };

      lib.l7v = { inherit mkWorkstation mkServer; };
    };
}
