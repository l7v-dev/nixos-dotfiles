# Mesh network capability: declarative Tailscale / WireGuard mesh networking.
#
# Connects laptop, server, builder, and backup nodes into an encrypted overlay
# network without exposing open public ports.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  cfg = config.l7v.mesh;
in
{
  options.l7v.mesh = {
    enable = lib.mkEnableOption "declarative mesh networking (Tailscale / WireGuard)";

    backend = lib.mkOption {
      type = lib.types.enum [
        "tailscale"
        "wireguard"
      ];
      default = "tailscale";
      description = "Mesh overlay technology (Tailscale or native WireGuard).";
    };

    tailscale = {
      port = lib.mkOption {
        type = lib.types.port;
        default = 41641;
        description = "UDP port for Tailscale peer-to-peer traffic.";
      };

      authKeyFile = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "/run/secrets/tailscale_auth_key";
        description = "Optional path to a SOPS-managed Tailscale auth key file for automated joining.";
      };

      extraUpArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [
          "--ssh"
          "--accept-routes"
        ];
        description = "Extra arguments passed to tailscale up.";
      };

      useRoutingFeatures = lib.mkOption {
        type = lib.types.enum [
          "none"
          "client"
          "server"
          "both"
        ];
        default = "both";
        description = "Tailscale routing features enabled (subnets, exit nodes).";
      };
    };

    nodes = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = {
        laptop = "100.64.0.1";
        server = "100.64.0.2";
        builder = "100.64.0.3";
        backup = "100.64.0.4";
      };
      description = "Map of fleet host names to static mesh overlay IP addresses for local DNS.";
    };
  };

  config = lib.mkIf cfg.enable {
    # ── Tailscale Backend ──────────────────────────────────────────────────────
    services.tailscale = lib.mkIf (cfg.backend == "tailscale") {
      enable = true;
      port = cfg.tailscale.port;
      authKeyFile = cfg.tailscale.authKeyFile;
      extraUpArgs = cfg.tailscale.extraUpArgs;
      useRoutingFeatures = cfg.tailscale.useRoutingFeatures;
    };

    # ── Firewall Rules ─────────────────────────────────────────────────────────
    networking.firewall = {
      # Trust the tailscale0 interface
      trustedInterfaces = lib.mkIf (cfg.backend == "tailscale") [ "tailscale0" ];

      # Allow Tailscale communication port
      allowedUDPPorts = lib.mkIf (cfg.backend == "tailscale") [
        cfg.tailscale.port
      ];
    };

    # ── Mesh Hosts DNS Mapping ─────────────────────────────────────────────────
    # Local /etc/hosts entries for fast resolving within the mesh network
    networking.hosts = lib.mkMerge (
      lib.mapAttrsToList (name: ip: {
        "${ip}" = [
          "${name}.mesh"
          "${name}.l7v.internal"
        ];
      }) cfg.nodes
    );

    # Packages
    environment.systemPackages = with pkgs; [
      wireguard-tools
      (lib.mkIf (cfg.backend == "tailscale") tailscale)
    ];
  };
}
