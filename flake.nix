{
  description = ''
    <p>l7v - Capability-First NixOS Platform Architecture</p>
    
    <p>Bu flake, sunucu ve workstation yapilandirmalari icin merkezi yonetim noktasidir. 
    Rol-tabanli yetenek (capability) atamasi ile olceklenebilir sistem konfigrasyonu saglar.</p>
    
    <ul>
      <li><strong>Sunucu Yonetimi:</strong> Stable channel uzerinde LTS kernel ve systemd tabanli servisler</li>
      <li><strong>Workstation Yonetimi:</strong> Unstable channel uzerinde Zen kernel, Niri WM ve Noctalia DE</li>
      <li><strong>Deployment:</strong> Colmena ile coklu sunucu dagitimi ve SSH tabanli yonetim</li>
      <li><strong>Secrets Management:</strong> SOPS-nix ile age sifreleme ve merkezi anahtar yonetimi</li>
    </ul>
    
    <p><strong>Kullanim Ornekleri:</strong></p>
    <pre><code class="language-bash">
    # Workstation build
    nixos-rebuild switch --flake .#L7V
    
    # Server deployment
    colmena apply --on @production
    colmena apply --on server
    
    # Build all configurations
    colmena build
    </code></pre>
    
    <p>{@link https://nixos.org/manual/nixos/stable/ NixOS Manual}</p>
    <p>{@link https://github.com/zhaofengli/colmena Colmena Documentation}</p>
  '';
  
  # ============================================================================
  # NIX CACHE CONFIGURATION
  # ============================================================================
  # Binary cache substituters for faster build times. Order matters: earlier
  # caches are queried first. All cache public keys must be trusted explicitly.
  # 
  # SECURITY NOTE: Only add caches from trusted sources. Malicious caches
  # could inject compromised binaries into your system.
  # ============================================================================
  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
      "https://niri.cachix.org"
      "https://noctalia.cachix.org"
      # Numtide binary cache — pre-built AI CLI tools from llm-agents.nix
      "https://cache.numtide.com"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X430o0NTRsrVMVZm7aWcSrq3LcpPo8gvLu8="
      "nix-community.cachix.org-1:mB9FSh9qf2QlZceEZWgjwkngzBLckc0Vc8t9aXXj4mQ="
      "niri.cachix.org-1:Wv0m4ydO/mub0AXv9+66Cg94SgB9nCsc3LymnscbAt8="
      "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
      "niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g="
    ];
  };
  
  # ============================================================================
  # FLAKE INPUTS DEFINITION
  # ============================================================================
  # External dependencies managed by flake inputs. Each input is pinned to a
  # specific branch/tag for reproducibility. The 'follows' mechanism ensures
  # consistent nixpkgs versions across dependent flakes.
  #
  # CHANNEL STRATEGY:
  # - nixpkgs (unstable): Workstations bleeding-edge packages
  # - nixpkgs-stable (25.05): Servers LTS stability guarantee
  # - home-manager: Matches respective nixpkgs channel
  # ============================================================================
  inputs = {
    # Primary nixpkgs channel (unstable) - workstations use this
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # Stable LTS channel for servers - critical for production stability
    # Follows NixOS 25.05 release branch with backported security patches
    nixpkgs-stable.url = "github:NixOS/nixpkgs/nixos-25.05";

    # Home Manager - user environment management
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    
    # Home Manager stable branch for server environments
    home-manager-stable = {
      url = "github:nix-community/home-manager/release-25.05";
      inputs.nixpkgs.follows = "nixpkgs-stable";
    };
    
    # SOPS-Nix - secrets management with age encryption
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    
    # Niri - scrollable tiling Wayland compositor
    niri-flake = {
      url = "github:sodiboo/niri-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    
    # Noctalia - desktop environment customization layer
    noctalia = {
      url = "github:noctalia-dev/noctalia";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # Zen Browser - privacy-focused Firefox fork
    zen-browser.url = "github:0xc000022070/zen-browser-flake";

    # AI coding agent CLI tools — auto-updated daily, pre-built via Numtide cache.
    # Intentionally NOT following our nixpkgs to guarantee cache hits and ensure
    # we get the exact combination tested in CI (see README: "Omitting follows
    # costs you a second nixpkgs evaluation but guarantees pre-built binaries").
    # Provides: gemini-cli, codex, opencode, copilot-cli, qoder-cli, and 100+ more.
    llm-agents = {
      url = "github:numtide/llm-agents.nix";
    };
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
      inherit (nixpkgs) lib;

      # ==========================================================================
      # SERVER TOPOLOGY DEFINITION
      # ==========================================================================
      # Single source of truth for both nixosConfigurations and colmena deployment.
      # Adding a new node here automatically creates both the NixOS configuration
      # and deployment target. Each node specifies:
      # - targetHost: SSH address for deployment
      # - roles: List of capabilities to enable (web, db, observe, git, ci, cache, backup)
      # - tags: Deployment group identifiers for colmena filtering
      # ==========================================================================
      servers = {
        # Main production server - web, database, monitoring, git services
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
        # CI/CD builder - continuous integration and binary cache
        builder = {
          targetHost = "builder.l7v.dev";
          roles = [
            "ci"
            "cache"
          ];
          tags = [ "builder" ];
        };
        # Backup server - centralized backup storage
        backup = {
          targetHost = "backup.l7v.dev";
          roles = [ "backup" ];
          tags = [ "backup" ];
        };
      };

      mkWorkstation = import ./lib/mkWorkstation.nix;
      mkServer = import ./lib/mkServer.nix;

      # Common arguments shared across all system configurations
      commonArgs = {
        inherit lib inputs;
        pkgs = nixpkgs;
        homeManager = home-manager.nixosModules.home-manager;
        sops = sops-nix.nixosModules.sops;
        user = "l7v";
        system = "x86_64-linux";
      };

      # Server-specific arguments using stable channel
      serverArgs = commonArgs // {
        inherit (nixpkgs-stable) lib;
        pkgs = nixpkgs-stable;
        homeManager = home-manager-stable.nixosModules.home-manager;
      };
    in
    {
      # ==========================================================================
      # NIXOS CONFIGURATIONS
      # ==========================================================================
      # L7V: Primary workstation using unstable channel + Niri WM
      # Servers: Role-based configurations mapped from topology definition
      # ==========================================================================
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

      # Colmena deployment hive configuration
      colmena = import ./colmena.nix { inherit inputs servers; };

      # Expose builder functions as library for external consumption
      lib.l7v = { inherit mkWorkstation mkServer; };
    };
}
