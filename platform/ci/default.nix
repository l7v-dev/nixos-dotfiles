# Platform CI: Forgejo Actions runner
# CI rolüne sahip hostlarda enable edilir (builder host)
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.platform.ci = {
    enable = lib.mkEnableOption "Forgejo Actions runner";
    forgejoUrl = lib.mkOption {
      type = lib.types.str;
      default = "https://git.l7v.dev";
    };
    labels = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "ubuntu-latest:docker://node:20-bullseye"
        "nix:host"
      ];
    };
  };

  config = lib.mkIf config.l7v.platform.ci.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.platform.ci requires l7v.secrets.enable = true";
      }
    ];

    sops.secrets."ci/runner_token" = { };

    services.gitea-actions-runner.instances."l7v" = {
      enable = true;
      name = "l7v";
      url = config.l7v.platform.ci.forgejoUrl;
      tokenFile = config.sops.secrets."ci/runner_token".path;
      labels = config.l7v.platform.ci.labels;
    };

    # Docker socket erişimi runner için
    virtualisation.docker.enable = lib.mkDefault true;

    environment.systemPackages = with pkgs; [
      act # local CI test
    ];
  };
}
