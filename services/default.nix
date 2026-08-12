# Services: user-facing application services built on top of capabilities.
{ ... }:
{
  imports = [
    ./forgejo
    ./grafana
    ./vaultwarden
    ./attic
    ./panel
  ];
}
