# Platform CI: Forgejo Actions runner.
# Enabled on hosts with the "ci" role (builder host).
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
      description = "Forgejo instance URL the runner registers against.";
    };

    labels = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "ubuntu-latest:docker://node:20-bullseye"
        "nix:host"
      ];
      description = "Runner labels exposed to Forgejo Actions workflows.";
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

    # The runner spawns Docker containers for workflow jobs.
    virtualisation.docker.enable = lib.mkDefault true;

    environment.systemPackages = with pkgs; [
      act # run Forgejo/GitHub Actions workflows locally
    ];
  };
}
