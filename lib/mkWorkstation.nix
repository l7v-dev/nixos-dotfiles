# mkWorkstation: builds a workstation NixOS system on nixos-unstable.
# Pulls in Niri, Noctalia, home-manager with all workstation profiles.
{
  pkgs,
  lib ? pkgs.lib,
  inputs,
  homeManager,
  sops,
  host,
  user,
  system ? "x86_64-linux",
}:
let
  # Resolve host-specific configuration directory path
  hostDir = ./../hosts/${host};
  
  # Resolve home-manager profiles directory path
  homeDir = ./../home;
in
lib.nixosSystem {
  inherit system;
  
  # Arguments propagated to all NixOS modules in the stack
  specialArgs = { inherit user inputs host; };
  
  # Ordered module composition list
  modules = [
    # ==========================================================================
    # CORE INFRASTRUCTURE MODULES
    # ==========================================================================
    
    # SOPS-Nix: Age-encrypted secrets management
    # Provides secure storage for SSH keys, API tokens, certificates
    sops
    
    # Home Manager: User environment orchestration
    # Manages dotfiles, shell configs, application settings
    homeManager
    
    # Niri Compositor: Scrollable tiling Wayland window manager
    # Modern alternative to traditional tiling WMs
    inputs.niri-flake.nixosModules.niri
    
    # ==========================================================================
    # PLATFORM LAYERS (imported as module sets)
    # ==========================================================================
    
    # Infrastructure: Boot loader, kernel, network, security hardening
    ../infrastructure
    
    # Experience: Desktop environments (Niri/Hyprland), audio, power management
    ../experience
    
    # Capabilities: Database, metrics, logging, reverse proxy, backup
    ../capabilities
    
    # Services: Forgejo, Grafana, Vaultwarden, Attic
    ../services
    
    # Platform: CI/CD, deployment, recovery, documentation tooling
    ../platform
    
    # ==========================================================================
    # HOST-SPECIFIC CONFIGURATION
    # ==========================================================================
    
    # Host network topology and device-specific settings
    (hostDir + "/default.nix")
    
    # Hardware detection and disk partitioning schema
    (hostDir + "/hardware.nix")
    
    # ==========================================================================
    # PACKAGE CONFIGURATION OVERRIDES
    # ==========================================================================
    
    {
      nixpkgs.pkgs = import pkgs {
        inherit system;
<<<<<<< HEAD
        
        # Enable non-free software (firmware, proprietary drivers)
        config.allowUnfree = true;
        
        # SECURITY NOTE: Only include legacy packages when absolutely necessary
        # These packages have known vulnerabilities and should be isolated
        config.permittedInsecurePackages = [
          "librewolf-151.0.2-1"
          "librewolf-unwrapped-151.0.2-1"
        ];
||||||| parent of 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
        config = {
          allowUnfree = true;
          permittedInsecurePackages = [
            "librewolf-151.0.2-1"
            "librewolf-unwrapped-151.0.2-1"
          ];
        };
=======
        config.allowUnfree = true;
>>>>>>> 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
      };
    }
    
    # ==========================================================================
    # HOME-MANAGER WORKSTATION PROFILE
    # ==========================================================================
    
    (_: {
      # Set primary user identity for l7v namespace
      l7v.identity.user = user;
      
      # Flag indicating this is a workstation (not server) deployment
      l7v.infrastructure.isServer = false;
      
      # Home-manager configuration block
      home-manager = {
        # Use system-wide nixpkgs for package consistency
        useGlobalPkgs = true;
        
        # Enable per-user package installation via home.packages
        useUserPackages = true;
<<<<<<< HEAD
        
        # CRITICAL: Timestamped backups prevent data loss during updates
        # Avoids overwriting existing .bak files from previous rollbacks
||||||| parent of 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
        # Timestamped backups to avoid clobbering existing .*-bak files
=======
        # Timestamped backups so repeated switches never clobber existing .*-bak files.
>>>>>>> 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
        backupCommand = ''
          mv "$1" "$1.bak-$(date +%Y%m%d-%H%M%S)"
        '';
        
        # Propagate user and inputs to home-manager module context
        extraSpecialArgs = { inherit user inputs; };
        
        # Primary user home configuration
        users.${user} = {
          # Import ordered profile stack for workstation environment
          imports = [
            # Base workstation packages and directory structure
            (homeDir + "/workstation/default.nix")
            
            # Development environment tooling
            (homeDir + "/profiles/shell.nix")
            (homeDir + "/profiles/git.nix")
            (homeDir + "/profiles/ssh.nix")
            (homeDir + "/profiles/dev.nix")
<<<<<<< HEAD
            
            # Desktop environment - Niri WM (primary)
            (homeDir + "/profiles/niri")
            # Alternative WM (disabled): (homeDir + "/profiles/hyprland.nix")
            
            # Productivity applications
            (homeDir + "/profiles/yazi.nix")
||||||| parent of 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
=======
            (homeDir + "/profiles/ai-tools.nix")
>>>>>>> 7ba3b81 (feat: declarative AI tooling + comprehensive audit fixes)
            (homeDir + "/profiles/noctalia.nix")
            (homeDir + "/profiles/theme.nix")
            
            # IDE and editor configurations
            (homeDir + "/profiles/vscode.nix")
            (homeDir + "/profiles/cursor.nix")
            (homeDir + "/profiles/kiro-ide.nix")
            (homeDir + "/profiles/kiro-crew.nix")
            (homeDir + "/profiles/antigravity.nix")
          ];
        };
      };
    })
  ];
}
