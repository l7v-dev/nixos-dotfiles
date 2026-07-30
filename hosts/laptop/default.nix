# Host: laptop (L7V)
{ lib, host, user, pkgs, ... }:
{
  networking.hostName = "L7V";
  system.stateVersion = "25.05";

  services = {
    # Touchpad (libinput) - geliştirilmiş laptop deneyimi
    libinput = {
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

    # Keyboard
    xserver.xkb.layout = "tr";

    # FHS dizin uyumluluğu (/bin/bash, /usr/bin/env gibi yolların otomatik eşleşmesi)
    envfs.enable = true;

    # Not: l7v.database capability'si server içindir (pgbouncer + secrets gerektirir).
    # Laptop için direkt NixOS modülleri kullanıyoruz — daha basit.
    redis.servers."".enable = true;

    postgresql = {
      enable  = true;
      package = pkgs.postgresql_16;
    };

    flatpak.enable = true;

    # auto-cpufreq: Maksimum Performans Odaklı Ayar (Hiçbir Performans Kısıtlaması Yok)
    # power-profiles-daemon ile çakışmaması için kapalı tutulur.
    power-profiles-daemon.enable = lib.mkForce false;
    auto-cpufreq = {
      enable = true;
      settings = {
        battery = {
          governor = "performance";
          energy_performance_preference = "performance";
          turbo = "always";
        };
        charger = {
          governor = "performance";
          energy_performance_preference = "performance";
          turbo = "always";
        };
      };
    };
    thermald.enable = true;  # Termal aşırı ısınma koruması

    # Lid kapatma ve güç tuşu davranışı (modern ayar)
    logind.settings.Login = {
      HandleLidSwitch = "suspend";
      HandleLidSwitchExternalPower = "ignore";
      HandlePowerKey = "suspend";
      IdleAction = "suspend";
      IdleActionSec = "30min";
    };
  };

  l7v = {
    # Experience capabilities
    experience = {
      bluetooth     = true;  # Bluetooth
      notifications = true;  # mako + libnotify
      clipboard     = true;  # wl-clipboard + cliphist + xsel
      screencast    = true;  # xdg-portal + pipewire screen + obs + wf-recorder
    };

    virtualisation.enable = true;

    # /etc/age/key ile secrets.yaml decrypt edilir
    # age public key: age100fgm3zj79kwsw962f9ehw8s43llfk7z2tpsh2juy3platc99qcs7lj0yw
    secrets.enable = true;

    platform = {
      deploy.enable        = true;
      inventory.enable     = true;
      documentation.enable = true;
      recovery.enable      = true;  # snapper btrfs + kurtarma araçları
    };
  };

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

  console.keyMap = "trq";

  # Sudo passwordless for wheel
  security.sudo.wheelNeedsPassword = false;

  # Docker
  virtualisation.docker.enable = true;
  # Not: docker grubu identity/default.nix'te zaten ekleniyor, burada tekrar eklemiyoruz

  # nix-ld — distrobox-export ve .deb / ikili dosyaların doğrudan çalışabilmesi için
  # NixOS'un standart dynamic linker yolunu sağlamak ve gerekli GUI/CLI kütüphanelerini sunmak için.
  programs.nix-ld = {
    enable = true;
    libraries = with pkgs; [
      stdenv.cc.cc
      zlib
      fuse3
      alsa-lib
      at-spi2-atk
      at-spi2-core
      cairo
      cups
      dbus
      expat
      fontconfig
      freetype
      gdk-pixbuf
      glib
      gtk3
      gtk4
      nspr
      nss
      openssl
      pango
      systemd
      curl
      icu
      libxml2
      libpng
      libjpeg
      libwebp
      libvpx
      libevdev
      udev
      mesa
      vulkan-loader
      xorg.libX11
      xorg.libXcomposite
      xorg.libXcursor
      xorg.libXdamage
      xorg.libXext
      xorg.libXfixes
      xorg.libXi
      xorg.libXrandr
      xorg.libXrender
      xorg.libXtst
      xorg.libxcb
      xorg.libxkbfile
      xorg.libXinerama
      xorg.libxshmfence
    ];
  };

  # Laptop UX iyileştirmeleri
  programs.dconf.enable = true; # GTK uygulamaları için ayar depolama

  # Nix için güçlü eklentiler (AI agent + prebuilt binary'ler için)
  # Ek güçlü Nix araçları ve geliştirme ortamları
  environment.systemPackages = with pkgs; [
    manix          # nixpkgs içinde man sayfası / docs arama
    dpkg           # .deb dosyalarını ayıklamak (dpkg-deb -x)
    steam-run      # İzolasyonlu FHS ortamında binary çalıştırmak
    patchelf       # ELF dosyalarının rpath ve interpreter ayarlarını düzenlemek
    jetbrains.clion# JetBrains CLion IDE (C/C++)
    qtcreator      # Qt Creator IDE
    wezterm        # GPU-accelerated terminal emulator
  ];

  # AMD CPU P-State & Maksimum Performans Kernel Parametreleri
  boot.kernelParams = [ "amd_pstate=active" ];
}
