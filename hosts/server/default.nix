# Host: server — web, db, observe and git roles.
{ ... }:
{
  networking.hostName = "server";
  system.stateVersion = "25.05";

  l7v.reverseProxy.acmeEmail = "admin@l7v.dev";

  l7v.services.forgejo.enable = true;
  l7v.services.grafana.enable = true;
  l7v.services.vaultwarden.enable = true;

  # Local snapshots and restic repository verification. Root is mounted from the
  # "root" subvolume, which snapper requires.
  l7v.platform.recovery.enable = true;

  # Populated by scripts/bootstrap.sh once the management key exists.
  l7v.identity.sshKeys = [ ];
}
