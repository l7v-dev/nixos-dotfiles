# Platform: cross-cutting platform seviyesi konfig
{ ... }:
{
  imports = [
    ./ci
    ./deploy
    ./recovery
    ./documentation
    ./inventory
  ];
}
