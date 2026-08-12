# Platform Documentation Module
# Installs operational runbooks under /etc/l7v/runbooks and adds CLI utilities.
{
  lib,
  config,
  pkgs,
  ...
}:
{
  options.l7v.platform.documentation = {
    enable = lib.mkEnableOption "operational runbooks and docs";
  };

  config = lib.mkIf config.l7v.platform.documentation.enable {
    environment.systemPackages = with pkgs; [
      man-pages
      man-pages-posix
      tldr
      jq
      yq-go
    ];

    # Runbook files deployed to /etc/l7v/runbooks
    environment.etc = {
      "l7v/runbooks/deploy-guide.md".text = builtins.readFile ./../../docs/runbooks/deploy-guide.md;
      "l7v/runbooks/secrets-management.md".text =
        builtins.readFile ./../../docs/runbooks/secrets-management.md;
      "l7v/runbooks/disaster-recovery.md".text =
        builtins.readFile ./../../docs/runbooks/disaster-recovery.md;
      "l7v/runbooks/service-operations.md".text =
        builtins.readFile ./../../docs/runbooks/service-operations.md;
      "l7v/runbooks/developer-workflows.md".text =
        builtins.readFile ./../../docs/runbooks/developer-workflows.md;
      "l7v/runbooks/agent-operations.md".text =
        builtins.readFile ./../../docs/runbooks/agent-operations.md;
    };
  };
}
