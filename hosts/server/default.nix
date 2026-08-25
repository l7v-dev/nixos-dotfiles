# Host: server — web, db, observe and git roles.
_: {
  networking.hostName = "server";
  system.stateVersion = "25.05";

  l7v = {
    reverseProxy.acmeEmail = "admin@l7v.dev";

    services = {
      forgejo.enable = true;
      vaultwarden.enable = true;    };

    # Local snapshots and restic repository verification. Root is mounted from the
    # "root" subvolume, which snapper requires.
    platform.recovery.enable = true;

    # Populated by scripts/bootstrap.sh once the management key exists.
    identity.sshKeys = [ ];
  };
}
