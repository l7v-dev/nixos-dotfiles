# ==============================================================================
# mkWorkstation: Unstable Channel Workstation Builder Module
# ==============================================================================
# Builds a NixOS system configuration optimized for developer workstations
# with bleeding-edge packages, Zen kernel, and modern Wayland compositor.
#
# ARCHITECTURE OVERVIEW:
# <ul>
#   <li><strong>Channel Strategy:</strong> nixos-unstable for latest packages</li>
#   <li><strong>Kernel:</strong> Zen kernel (low-latency, desktop optimized)</li>
#   <li><strong>Compositor:</strong> Niri scrollable tiling Wayland WM</li>
#   <li><strong>Desktop:</strong> Noctalia customization layer</li>
#   <li><strong>User Management:</strong> Home-manager for dotfiles and apps</li>
# </ul>
#
# MODULE STACK COMPOSITION:
# <ol>
#   <li>SOPS - Secrets management with age encryption</li>
#   <li>Home Manager - User environment orchestration</li>
#   <li>Niri Flakes - Wayland compositor module</li>
#   <li>Infrastructure - Boot, network, security, identity, storage</li>
#   <li>Experience - Desktop environments and user capabilities</li>
#   <li>Capabilities - Cross-cutting infrastructure features</li>
#   <li>Services - Application-level services (Forgejo, Grafana, etc.)</li>
#   <li>Platform - CI/CD, deployment, recovery tooling</li>
#   <li>Host Config - Hardware-specific overrides</li>
# </ol>
#
# @param pkgs [Nixpkgs] Primary nixpkgs instance (unstable channel)
# @param lib [Lib] Nix library functions (defaults to pkgs.lib)
# @param inputs [Attrs] Flake inputs containing external dependencies
# @param homeManager [Module] Home-manager NixOS module
# @param sops [Module] SOPS-nix secrets management module
# @param host [String] Hostname for hardware configuration lookup
# @param user [String] Primary username for system and home-manager
# @param system [String] Target architecture (default: "x86_64-linux")
#
# @return [NixOS System] Complete NixOS configuration with home-manager
#
# @example Usage in flake.nix
#   mkWorkstation = import ./lib/mkWorkstation.nix;
#   L7V = mkWorkstation (commonArgs // { host = "laptop"; });
#
# @see ./mkServer.nix Server builder using stable channel
# @see ../flake.nix Main flake entry point
# @see https://nixos.org/manual/nixos/stable/ NixOS Manual
# ==============================================================================
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
        
        # Enable non-free software (firmware, proprietary drivers)
        config.allowUnfree = true;
        
        # SECURITY NOTE: Only include legacy packages when absolutely necessary
        # These packages have known vulnerabilities and should be isolated
        config.permittedInsecurePackages = [
          "librewolf-151.0.2-1"
          "librewolf-unwrapped-151.0.2-1"
        ];
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
        
        # CRITICAL: Timestamped backups prevent data loss during updates
        # Avoids overwriting existing .bak files from previous rollbacks
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
            
            # Desktop environment - Niri WM (primary)
            (homeDir + "/profiles/niri")
            # Alternative WM (disabled): (homeDir + "/profiles/hyprland.nix")
            
            # Productivity applications
            (homeDir + "/profiles/yazi.nix")
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
