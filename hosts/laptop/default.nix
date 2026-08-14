# Host: laptop (L7V workstation)
{
  lib,
  user,
  pkgs,
  ...
}:
{
  networking.hostName = "L7V";
  system.stateVersion = "25.05";

  services = {
    # Touchpad (libinput) — enhanced laptop experience
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

    # Keyboard layout
    xserver.xkb.layout = "tr";

    # FHS path compatibility (/bin/bash, /usr/bin/env etc.)
    envfs.enable = true;

    # Local Redis and PostgreSQL for development.
    # Note: l7v.database capability is server-only (requires pgbouncer + secrets).
    # On the laptop we use the NixOS modules directly — simpler and no secrets needed.
    redis.servers."".enable = true;

    postgresql = {
      enable = true;
      package = pkgs.postgresql_16;
    };

    flatpak.enable = true;

    # auto-cpufreq: adaptive CPU frequency management.
    # power-profiles-daemon is disabled to avoid conflicts with auto-cpufreq.
    # thermald is intentionally absent — it is Intel-only and exits immediately on AMD.
    power-profiles-daemon.enable = lib.mkDefault false;
    auto-cpufreq = {
      enable = true;
      settings = {
        # On battery: save power, let turbo kick in only when needed.
        battery = {
          governor = "powersave";
          energy_performance_preference = "power";
          turbo = "auto"; # boost only under load
        };
        # On charger: maximize responsiveness, still let auto-cpufreq manage turbo.
        charger = {
          governor = "performance";
          energy_performance_preference = "performance";
          turbo = "auto"; # auto vs always: avoids unnecessary heat when idle
        };
      };
    };

    # Lid and power-button behaviour
    logind.settings.Login = {
      HandleLidSwitch = "suspend";
      HandleLidSwitchExternalPower = "ignore";
      HandlePowerKey = "suspend";
      IdleAction = "suspend";
      IdleActionSec = "30min";
    };
  };

  l7v = {
    experience = {
      bluetooth = true;
      notifications = true;
      clipboard = true;
      screencast = true;
      power = true;
    };

    virtualisation.enable = true;

    # Secrets decrypted via /etc/age/key.
    # age public key: age100fgm3zj79kwsw962f9ehw8s43llfk7z2tpsh2juy3platc99qcs7lj0yw
    secrets.enable = true;

    # panel-agent: runs on the laptop and exposes the REST/SSE API
    # to the panel-frontend on the server via nginx reverse proxy.
    services.panel.agent.enable = true;

    # Grafana: local mode — HTTP-only on 127.0.0.1:3001, no nginx, no SOPS required.
    # adminPassword defaults to "admin"; override here if needed.
    services.grafana = {
      enable = true;
      localMode = true;
    };

    platform = {
      deploy.enable = true;
      inventory.enable = true;
      documentation.enable = true;
      recovery.enable = true;
    };
  };

  # AMD GPU
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
    # Explicit Mesa drivers prevent fallback to software rendering under Wayland/Niri.
    # libva + mesa.drivers enable VA-API hardware video decode (Firefox/mpv/vlc).
    extraPackages = with pkgs; [
      mesa # includes radeonsi_drv_video.so — VA-API decode for AMD
      libva # Video Acceleration API runtime
      libva-utils # vainfo — debug VA-API support
      vulkan-loader
      vulkan-tools
    ];
    extraPackages32 = with pkgs.pkgsi686Linux; [
      mesa
      vulkan-loader
    ];
  };
  hardware.amdgpu.initrd.enable = true;

  # Firefox: enable VA-API hardware video decode (AMD GPU).
  # Reduces CPU usage during video playback (YouTube etc.) by offloading to GPU.
  # nix-ld: provides a compatible dynamic linker for prebuilt binaries,
  # distrobox-exported apps, and .deb extracts.
  # GTK app settings storage
  programs = {
    firefox.preferences = {
      "media.ffmpeg.vaapi.enabled" = true;
      "media.hardware-video-decoding.force-enabled" = true;
    };

    nix-ld = {
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
        libx11
        libxcomposite
        libxcursor
        libxdamage
        libxext
        libxfixes
        libxi
        libxrandr
        libxrender
        libxtst
        libxcb
        libxkbfile
        libxinerama
        libxshmfence
      ];
    };

    dconf.enable = true;
  };

  # Laptop-specific session variables only.
  # Wayland backend vars (NIXOS_OZONE_WL, MOZ_ENABLE_WAYLAND, QT_QPA_PLATFORM,
  # GDK_BACKEND, XDG_SESSION_TYPE, AMD_VULKAN_ICD) are declared in
  # experience/desktop/common/default.nix to avoid duplication.
  environment.sessionVariables = { };

  # Nix settings — developer workstation best practices
  nix = {
    settings = {
      experimental-features = [
        "nix-command"
        "flakes"
        "ca-derivations"
      ];
      trusted-users = [
        "root"
        user
      ];
      auto-optimise-store = true;
      substituters = [
        "https://cache.nixos.org"
        "https://nix-community.cachix.org"
        "https://niri.cachix.org"
        "https://noctalia.cachix.org"
        # Numtide cache: pre-built AI CLI tools from llm-agents.nix
        "https://cache.numtide.com"
      ];
      trusted-public-keys = [
        "cache.nixos.org-1:6NCHdD59X430o0NTRsrVMVZm7aWcSrq3LcpPo8gvLu8="
        "nix-community.cachix.org-1:mB9FSh9qf2QlZceEZWgjwkngzBLckc0Vc8t9aXXj4mQ="
        "niri.cachix.org-1:Wv0m4ydO/mub0AXv9+66Cg94SgB9nCsc3LymnscbAt8="
        "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4="
        "niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g="
      ];
      keep-outputs = true;
      keep-derivations = true;
      download-buffer-size = "128M";
    };

    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };
  };

  console.keyMap = "trq";

  # Passwordless sudo for wheel group (developer workstation convenience)
  security.sudo.wheelNeedsPassword = false;

  # Docker
  virtualisation.docker.enable = true;
  # Note: the docker group is already added in infrastructure/identity/default.nix

  environment.systemPackages = with pkgs; [
    manix # nixpkgs documentation search
    dpkg # extract .deb archives (dpkg-deb -x)
    steam-run # run binaries in an isolated FHS environment
    patchelf # patch ELF rpath / interpreter
    jetbrains.clion # JetBrains CLion IDE (C/C++)
    qtcreator # Qt Creator IDE
    wezterm # GPU-accelerated terminal emulator
  ];

  # AMD CPU P-State for maximum responsiveness
  boot.kernelParams = [ "amd_pstate=active" ];
}
