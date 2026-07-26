# Desktop capability: Noctalia Shell v5 (NixOS system katmanı)
# https://github.com/noctalia-dev/noctalia
#
# NixOS gereksinimleri (docs.noctalia.dev/v5/getting-started/nixos/):
#   - networking.networkmanager.enable  → infrastructure/network/default.nix'te (workstation'da true)
#   - hardware.bluetooth.enable         → experience/capabilities/bluetooth/default.nix'te
#   - services.upower.enable            → experience/capabilities/power/default.nix'te
#   - services.power-profiles-daemon.enable → laptop/default.nix'te mkForce false — SORUN!
#     Noctalia'nın power profile widget'ı çalışmaz. tuned alternatif olarak kullanılabilir.
#
# Binary cache notu:
#   inputs.nixpkgs.follows ile cache miss oluyor.
#   flake.nix'te noctalia input'una cachix branch pin edilmesi önerilir:
#   noctalia.url = "github:noctalia-dev/noctalia/cachix";
#   Ve nixConfig'e eklenmeli:
#   extra-substituters = [ "https://noctalia.cachix.org" ];
#   extra-trusted-public-keys = [ "noctalia.cachix.org-1:pCOR47nnMEo5thcxNDtzWpOxNFQsBRglJzxWPp3dkU4=" ];

{ inputs, lib, ... }:
{
  imports = [
    inputs.noctalia.nixosModules.default
  ];

  # NixOS modülü: system PATH'e paketi ekler, systemd user service altyapısını hazırlar.
  # Asıl enable + config home-manager tarafından (home/profiles/noctalia.nix) yönetilir.
  programs.noctalia = {
    enable         = lib.mkDefault false;  # home-manager'dan override edilir
    systemd.enable = lib.mkDefault false;

    # Noctalia'nın wifi/bluetooth/upower/power-profile servislerini başlatır.
    # power-profiles-daemon laptop'ta kapalı olduğu için power profile widget çalışmaz.
    recommendedServices.enable = lib.mkDefault true;
  };

  # upower — Noctalia'nın batarya widget'ı için gerekli
  services.upower.enable = true;
}
