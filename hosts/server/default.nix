# Host: server — web, db, observe and git roles.
_: {
  networking.hostName = "server";
  system.stateVersion = "25.05";

  l7v = {
    reverseProxy.acmeEmail = "admin@l7v.dev";

    services = {
      forgejo.enable = true;
      grafana.enable = true;
      vaultwarden.enable = true;

      # panel-frontend: serves the web UI and proxies to panel-agent on laptop.
      panel.frontend = {
        enable = true;
        # Restrict access to private network ranges only.
        # Update allowedCIDRs to match your home/VPN network.
        allowedCIDRs = [
          "127.0.0.1/32"
          "10.0.0.0/8"
          "192.168.0.0/16"
        ];
      };
    };

    # Local snapshots and restic repository verification. Root is mounted from the
    # "root" subvolume, which snapper requires.
    platform.recovery.enable = true;

    # Populated by scripts/bootstrap.sh once the management key exists.
    identity.sshKeys = [ ];
  };
}
