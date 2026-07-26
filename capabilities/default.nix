# Capabilities: cross-cutting infrastructure capabilities
# Her bir capability sadece enable=true olduğunda somut config üretir.
{ lib, ... }:
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
    ./virtualisation  # BUG-003: duplicate import kaldırıldı
  ];
}
