# Bluetooth: hardware support + blueman manager
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.experience.bluetooth = lib.mkEnableOption "bluetooth support";

  config = lib.mkIf config.l7v.experience.bluetooth {
    hardware.bluetooth = {
      enable = true;
      powerOnBoot = true;
    };

    services.blueman.enable = true;

    environment.systemPackages = with pkgs; [
      bluez
      bluez-tools
    ];
  };
}
