# Host: laptop (L7V)
{ lib, host, user, pkgs, ... }:
{
  networking.hostName = "L7V";
  system.stateVersion = "25.05";

  # Touchpad (libinput) - geliştirilmiş laptop deneyimi
  services.libinput = {
    enable = true;
    touchpad = {
      tapping = true;
      naturalScrolling = true;
      accelProfile = "adaptive";
      accelSpeed = "0.2";
      scrollMethod = "twofinger";
      disableWhileTyping = true;
      clickMethod = "clickfinger";
    };
  };

  # Bluetooth
  l7v.experience.bluetooth     = true;

  # Experience capabilities
  l7v.experience.notifications = true;  # mako + libnotify
  l7v.experience.clipboard     = true;  # wl-clipboard + cliphist + xsel
  l7v.experience.screencast    = true;  # xdg-portal + pipewire screen + obs + wf-recorder

  # AMD GPU
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
    # Wayland/Niri ve Vulkan uygulamalarında yazılımsal render'a düşmemesi için
    # AMD'nin Mesa sürücülerini açıkça etkinleştir.
    extraPackages = with pkgs; [
      mesa
      vulkan-loader
      vulkan-tools
    ];
    extraPackages32 = with pkgs.pkgsi686Linux; [
      mesa
      vulkan-loader
    ];
  };
  hardware.amdgpu.initrd.enable = true;

  # Wayland + Electron / uygulama uyumluluğu + AMD
  # NOT: XDG_SESSION_TYPE, AMD_VULKAN_ICD vb. experience/desktop/niri/default.nix'te tanımlı.
  # Burada sadece laptop'a özgü olanlar:
  environment.sessionVariables = {
    NIXOS_OZONE_WL     = "1";           # Electron/Chromium Wayland
    MOZ_ENABLE_WAYLAND = "1";           # Firefox Wayland
    QT_QPA_PLATFORM    = "wayland;xcb"; # Qt Wayland fallback
    GDK_BACKEND        = "wayland,x11"; # GTK
  };

  # Nix settings (best practices for developer workstation)
  nix = {
    settings = {
      experimental-features = [ "nix-command" "flakes" "ca-derivations" ];
      trusted-users = [ "root" user ];
      auto-optimise-store = true;
      substituters = [
        "https://cache.nixos.org"
        "https://nix-community.cachix.org"
        "https://niri.cachix.org"
        "https://noctalia.cachix.org"
      ];
      trusted-public-keys = [
        "cache.nixos.org-1:6NCHdD59X430o0NTRsrVMVZm7aWcSrq3LcpPo8gvLu8="
        "nix-community.cachix.org-1:mB9FSh9qf2QlZceEZWgjwkngzBLckc0Vc8t9aXXj4mQ="
        "niri.cachix.org-1:Wv0m4ydO/mub0AXv9+66Cg94SgB9nCsc3LymnscbAt8="
        "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
      ];
      keep-outputs = true; # useful for dev (devShell'lar için)
      keep-derivations = true;
      download-buffer-size = "128M";  # büyük flake'ler için
    };

    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };
  };

  # Keyboard
  services.xserver.xkb.layout = "tr";
  console.keyMap = "trq";

  # Sudo passwordless for wheel
  security.sudo.wheelNeedsPassword = false;

  # Docker
  virtualisation.docker.enable = true;
  l7v.virtualisation.enable = true;
  # Not: docker grubu identity/default.nix'te zaten ekleniyor, burada tekrar eklemiyoruz

  # nix-ld — distrobox-export ile host'a çıkarılan dinamik linkli binary'ler
  # NixOS'un standart linker yolunu bulamadığı için bu olmadan çalışmaz.
  programs.nix-ld = {
    enable = true;
    libraries = with pkgs; [
      stdenv.cc.cc
      zlib
      openssl
      curl
      icu
      libxml2
    ];
  };

  # Not: l7v.database capability'si server içindir (pgbouncer + secrets gerektirir).
  # Laptop için direkt NixOS modülleri kullanıyoruz — daha basit.
  services.redis.servers."".enable = true;

  services.postgresql = {
    enable  = true;
    package = pkgs.postgresql_16;
  };

  # Laptop UX iyileştirmeleri
  programs.dconf.enable = true; # GTK uygulamaları için ayar depolama
  services.flatpak.enable = true;

  # Nix için güçlü eklentiler (AI agent + prebuilt binary'ler için)
  # Ek güçlü Nix araçları
  environment.systemPackages = with pkgs; [
    manix          # nixpkgs içinde man sayfası / docs arama
  ];

  # auto-cpufreq: AMD laptop için CPU frekans/voltaj optimizasyonu (daha iyi batarya)
  # power-profiles-daemon: Noctalia'nın power widget'ı için gerekli
  # İkisi çakışır — auto-cpufreq tercih ediliyor, Noctalia power widget devre dışı.
  services.power-profiles-daemon.enable = lib.mkForce false;
  services.auto-cpufreq = {
    enable = true;
    settings = {
      battery = {
        governor   = "powersave";
        turbo      = "never";        # batarya ömrünü uzatır
        scaling_min_freq = 400000;   # 400 MHz min
      };
      charger = {
        governor   = "performance";
        turbo      = "auto";
      };
    };
  };
  services.thermald.enable = true;  # AMD için termal koruma

  # Lid kapatma ve güç tuşu davranışı (modern ayar)
  services.logind.settings.Login = {
    HandleLidSwitch = "suspend";
    HandleLidSwitchExternalPower = "ignore";
    HandlePowerKey = "suspend";
    IdleAction = "suspend";
    IdleActionSec = "30min";
  };

  # /etc/age/key ile secrets.yaml decrypt edilir
  # age public key: age100fgm3zj79kwsw962f9ehw8s43llfk7z2tpsh2juy3platc99qcs7lj0yw
  l7v.secrets.enable = true;

  l7v.platform.deploy.enable       = true;
  l7v.platform.inventory.enable    = true;
  l7v.platform.documentation.enable = true;
  l7v.platform.recovery.enable     = true;  # snapper btrfs + kurtarma araçları
}
