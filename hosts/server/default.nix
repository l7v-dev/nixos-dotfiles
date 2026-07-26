# Host: server — web + db + observe + git rolleri
{ lib, host, user, roles, tags, ... }:
{
  networking.hostName = "server";
  system.stateVersion = "25.05";

  l7v.reverseProxy.acmeEmail = "admin@l7v.dev";

  l7v.services.forgejo.enable    = true;
  l7v.services.grafana.enable    = true;
  l7v.services.vaultwarden.enable = true;

  l7v.identity.sshKeys = [
    # TODO: yönetim SSH public key'ini ekle (bootstrap.sh ile)
    # "ssh-ed25519 AAAA... admin@l7v"
  ];
}
