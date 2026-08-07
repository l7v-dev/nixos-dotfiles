# ==============================================================================
# mkServer: Stable Channel Server Builder Module
# ==============================================================================
# Builds a NixOS system configuration optimized for production servers
# with LTS packages, stable kernel, and role-based capability resolution.
#
# ARCHITECTURE OVERVIEW:
# <ul>
#   <li><strong>Channel Strategy:</strong> nixos-25.05 (LTS with security patches)</li>
#   <li><strong>Kernel:</strong> LTS kernel (maximum stability, proven reliability)</li>
#   <li><strong>Init System:</strong> systemd-networkd for network management</li>
#   <li><strong>Role Resolution:</strong> Dynamic capability mapping from roles</li>
#   <li><strong>Deployment:</strong> Colmena-compatible module structure</li>
# </ul>
#
# ROLE-TO-CAPABILITY MAPPING:
# <p>Roles defined in flake.nix topology are resolved to capabilities by
# lib/serverModules.nix. This enables modular service composition:</p>
# <ul>
#   <li>web -> secrets, reverse-proxy, metrics, logging</li>
#   <li>db -> secrets, database, metrics, logging, backup</li>
#   <li>observe -> secrets, metrics, logging</li>
#   <li>git -> secrets, reverse-proxy, database, backup</li>
#   <li>ci -> secrets, metrics, logging</li>
#   <li>cache -> secrets, cache</li>
#   <li>backup -> secrets, backup</li>
#   <li>messaging -> secrets, reverse-proxy, database, messaging</li>
# </ul>
#
# @param pkgs [Nixpkgs] Stable nixpkgs instance (nixos-25.05)
# @param homeManager [Module] Home-manager NixOS module (stable branch)
# @param sops [Module] SOPS-nix secrets management module
# @param host [String] Hostname for hardware configuration lookup
# @param user [String] Primary username for system access
# @param roles [Array<String>] Server role list (web, db, observe, git, ci, cache, backup)
# @param tags [Array<String>] Deployment tags for colmena filtering
# @param system [String] Target architecture (default: "x86_64-linux")
# @param inputs [Attrs] Flake inputs for external dependencies
# @param lib [Lib] Nix library functions (defaults to pkgs.lib)
#
# @return [NixOS System] Complete server configuration with role-based services
#
# @example Usage in flake.nix
#   mkServer = import ./lib/mkServer.nix;
#   server = mkServer (serverArgs // { 
#     host = "server"; 
#     roles = [ "web" "db" "observe" "git" ];
#     tags = [ "production" ];
#   });
#
# @example Colmena deployment
#   colmena apply --on @production  # Deploys all nodes with "production" tag
#   colmena apply --on server       # Deploys specific node
#
# @see ./mkWorkstation.nix Workstation builder using unstable channel
# @see ./serverModules.nix Role-to-capability resolution logic
# @see ../flake.nix Server topology definition
# @see https://github.com/zhaofengli/colmena Colmena deployment tool
# @see https://nixos.org/manual/nixos/stable/ NixOS Stable Manual
# ==============================================================================
{
  pkgs,
  homeManager,
  sops,
  host,
  user,
  roles ? [],
  tags ? [],
  system ? "x86_64-linux",
  inputs,
  lib ? pkgs.lib,
}:
lib.nixosSystem {
  inherit system;
  
  # Arguments propagated to all modules for role/tag awareness
  specialArgs = {
    inherit
      user
      inputs
      host
      roles
      tags
      ;
  };
  
  # Module stack with dynamic role-based capability injection
  modules =
    # Import serverModules.nix with context for role resolution
    import ./serverModules.nix {
      inherit
        lib
        sops
        homeManager
        host
        user
        roles
        tags
        ;
    }
    ++ [
      # ==========================================================================
      # PACKAGE CONFIGURATION
      # ==========================================================================
      
      {
        nixpkgs.pkgs = import pkgs {
          inherit system;
          
          # CRITICAL FOR SERVERS: Enable proprietary firmware/drivers
          # Required for hardware compatibility (RAID controllers, NICs, GPU)
          config.allowUnfree = true;
        };
      }
    ];
}
