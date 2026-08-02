# Storage: btrfs noatime, zram (workstation), journald, smartd, LUKS disk şifreleme
{ lib, config, ... }:
{
  options.l7v.storage.luks = {
    enable = lib.mkEnableOption "LUKS disk şifreleme ve initrd kilit açma desteği";
    devices = lib.mkOption {
      type = lib.types.attrsOf (
        lib.types.submodule {
          options = {
            device = lib.mkOption {
              type = lib.types.str;
              description = "Şifreli blok cihazı (ör. /dev/disk/by-uuid/...)";
            };
            allowDiscards = lib.mkOption {
              type = lib.types.bool;
              default = true;
              description = "SSD/NVMe disklere TRIM komut izni verir";
            };
            keyFile = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Initrd içerisindeki opsiyonel keyfile yolu";
            };
            preLVM = lib.mkOption {
              type = lib.types.bool;
              default = true;
              description = "LUKS kilit açma işleminin LVM taramasından önce yapılmasını sağlar";
            };
          };
        }
      );
      default = { };
      description = "boot.initrd.luks.devices altında yapılandırılacak şifreli cihaz eşlemeleri";
    };
  };

  config = {
    # LUKS Disk Şifreleme initrd Yapılandırması
    boot.initrd.luks.devices = lib.mkIf config.l7v.storage.luks.enable (
      lib.mapAttrs (_: cfg: {
        inherit (cfg) device;
        inherit (cfg) allowDiscards;
        inherit (cfg) keyFile;
        inherit (cfg) preLVM;
      }) config.l7v.storage.luks.devices
    );

    # LUKS etkinleştiğinde initrd için gerekli kriptografik modüller
    boot.initrd.availableKernelModules = lib.optionals config.l7v.storage.luks.enable [
      "dm_mod"
      "dm_crypt"
      "cryptd"
      "input_leds"
      "aesni_intel"
    ];

    # btrfs mount noatime — btrfs subvol yapısı hosts/<host>/hardware.nix'te
    # Burada sadece default mount optimizasyonu
    fileSystems."/".options = [
      "noatime"
      "compress=zstd"
    ];

    # Zram (workstation'da; server'da memory pressure daha az)
    zramSwap = {
      enable = !config.l7v.infrastructure.isServer;
      memoryPercent = 50;
    };

    # Journald: persistent + bounded
    services.journald.extraConfig = ''
      Storage=persistent
      SystemMaxUse=2G
      MaxRetentionSec=2week
    '';

    # smartd
    services.smartd = {
      enable = true;
      autodetect = true;
    };
  };
}
