# Home-manager workstation profili
# Tüm workstation home modülleri buradan koordine edilir.
{
  lib,
  config,
  pkgs,
  user,
  inputs,
  ...
}:
{
  # Shell: Noctalia v5 — home/profiles/noctalia.nix üzerinden home-manager modülü ile yönetilir.

  options.l7v.home.workstation.enable = lib.mkOption {
    type = lib.types.bool;
    default = true;
  };

  config = lib.mkIf config.l7v.home.workstation.enable {
    home = {
      username = user;
      homeDirectory = "/home/${user}";
      stateVersion = "25.05";
    };

    # --- Developer klasör yapısı (standartlaştırma) ----------------------
    home.activation.createDevDirs = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
      mkdir -p ~/dev/{learning/{books,courses,tutorials},projects/{company/{active,archived},personal,oss},sandboxes/{labs,playgrounds},tools/{bin,configs,scripts},workspaces}
    '';

    home.packages = with pkgs; [
      mpv
      vlc
      ffmpeg

      brave
      firefox
      google-chrome
      vivaldi
      inputs.zen-browser.packages.${pkgs.stdenv.hostPlatform.system}.default # Zen Browser (native, firefox tabanlı, güzel)
      librewolf
      ungoogled-chromium
      mullvad-browser # privacy odaklı (Mullvad)
      # Tor Browser istersen: tor-browser (ağır)

      obsidian
      discord
      telegram-desktop
      qbittorrent

      nautilus
      thunar
      gvfs
      file-roller
      zoxide

      # Nautilus zenginleştirme (görsel + yetenek)
      sushi # hızlı önizleme (space tuşu)
      nautilus-python
      gnome-tweaks

      # Daha zengin ikon ve tema
      papirus-icon-theme
      adwaita-icon-theme
      gnome-themes-extra

      # Terminal dosya yöneticisi (ana silah) - Yazi çok güçlü
      yazi
      chafa # terminalde görsel önizleme
      exiftool
      poppler-utils # pdf önizleme
      mediainfo
      jq
      ripgrep
      fd

      btop
      htop
      fastfetch
      inxi
      powertop

      btrfs-progs
      e2fsprogs
      exfatprogs
      ntfs3g
      nfs-utils

      p7zip
      unrar
      zip
      unzip
      xz
      zstd

      nmap
      nettools
      iproute2
      wget
      curl
      ethtool
      whois
      bind
      sshfs
      rsync

      vscode # vscodeum kaldırıldı
      micro # terminal editörü — nano alternatifi
      git
      gcc
      gnumake
      pkg-config
      perl

      jetbrains.idea
      zed-editor

      noto-fonts
      noto-fonts-color-emoji
      dejavu_fonts
      fira-code

      sqlmap
      nikto
      hydra
      john
      aircrack-ng
      wireshark-cli
      tcpdump
      masscan
      gobuster
      hashcat

      dbeaver-bin

      # AI & Model CLI Tools
      python3Packages.huggingface-hub
    ];
  };
}
