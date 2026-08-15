# Capabilities: cross-cutting infrastructure capabilities.
# Each capability only emits config when enable = true.
{ ... }:
{
  imports = [
    ./secrets
    ./database
    ./metrics
    ./logging
    ./reverse-proxy
    ./backup
    ./cache
    ./messaging
    ./virtualisation
    ./mesh
  ];
}
