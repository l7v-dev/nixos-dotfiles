# Infrastructure katmanı: boot + network + security + identity + storage
{ lib, ... }:
{
  imports = [
    ./boot
    ./network
    ./security
    ./identity
    ./storage
  ];

  options.l7v.infrastructure = {
    isServer = lib.mkOption {
      type    = lib.types.bool;
      default = false;
      description = "true ise sunucu davranışı (LTS kernel, systemd-networkd, vb.)";
    };
  };

  options.l7v.server = {
    roles = lib.mkOption {
      type    = lib.types.listOf lib.types.str;
      default = [];
      description = "Server rol listesi (web, db, observe, git, ci, cache, backup)";
    };
    tags = lib.mkOption {
      type    = lib.types.listOf lib.types.str;
      default = [];
      description = "Server tag listesi (örn. production, builder)";
    };
  };
}
