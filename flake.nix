{
  description = "l7v — capability-first NixOS platform";
  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
      "https://niri.cachix.org"
      "https://noctalia.cachix.org"  # Noctalia binary cache — derleme süresini kısaltır
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X430o0NTRsrVMVZm7aWcSrq3LcpPo8gvLu8="
      "nix-community.cachix.org-1:mB9FSh9qf2QlZceEZWgjwkngzBLckc0Vc8t9aXXj4mQ="
      "niri.cachix.org-1:Wv0m4ydO/mub0AXv9+66Cg94SgB9nCsc3LymnscbAt8="
      "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
    ];
  };
  inputs = {
    nixpkgs.url          = "github:NixOS/nixpkgs/nixos-unstable";
    nixpkgs-stable.url   = "github:NixOS/nixpkgs/nixos-25.05";  # server: kararlılık, workstation unstable kullanır
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
    kiro-ide = {
      url = "github:l7v-dev/ide.kiro.flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    sddm-sugar-candy-nix = {
      url = "github:Zhaith-Izaliel/sddm-sugar-candy-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = { self, nixpkgs, nixpkgs-stable, home-manager, home-manager-stable, sops-nix, niri-flake, noctalia, zen-browser, kiro-ide, sddm-sugar-candy-nix, ... } @ inputs:
    let
      lib       = nixpkgs.lib;
      pkgs      = nixpkgs;
      pkgsStable = nixpkgs-stable;
      mkW  = import ./lib/mkWorkstation.nix;
      mkS  = import ./lib/mkServer.nix;
      # Ortak argümanlar
      commonArgs = {
        inherit lib pkgs inputs;
        homeManager = home-manager.nixosModules.home-manager;
        sops        = sops-nix.nixosModules.sops;
        user        = "l7v";
        system      = "x86_64-linux";
      };
      # Server'a özgü argümanlar — stable channel
      serverArgs = commonArgs // {
        lib         = pkgsStable.lib;
        pkgs        = pkgsStable;
        homeManager = home-manager-stable.nixosModules.home-manager;
      };
    in {
      nixosConfigurations.L7V = mkW (commonArgs // {
        host = "laptop";
      });
      nixosConfigurations.server = mkS (serverArgs // {
        host  = "server";
        roles = [ "web" "db" "observe" "git" ];
        tags  = [ "production" ];
      });
      nixosConfigurations.builder = mkS (serverArgs // {
        host  = "builder";
        roles = [ "ci" "cache" ];
        tags  = [ "builder" ];
      });
      nixosConfigurations.backup = mkS (serverArgs // {
        host  = "backup";
        roles = [ "backup" ];
        tags  = [ "backup" ];
      });
      lib.l7v = {
        mkWorkstation = mkW;
        mkServer      = mkS;
      };
    };
}