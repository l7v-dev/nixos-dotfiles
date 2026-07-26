# Services: capability üzerine inşa edilen uygulama servisleri
{ lib, ... }:
{
  imports = [
    ./forgejo
    ./grafana
    ./vaultwarden
    ./attic
  ];
}
