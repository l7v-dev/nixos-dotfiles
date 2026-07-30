{ ... }:
let
  defaultKey = "~/.ssh/id_ed25519";

  l7vHost = hostname: {
    inherit hostname;
    user = "root";
    identityFile = defaultKey;
    StrictHostKeyChecking = "accept-new";
  };
in
{
  programs.ssh = {
    enable = true;
    enableDefaultConfig = false;

    settings = {
      "*" = {
        addKeysToAgent = "yes";
        serverAliveInterval = 60;
        serverAliveCountMax = 3;
      };

      "server.l7v.dev l7v-server" = l7vHost "server.l7v.dev";
      "builder.l7v.dev l7v-builder" = l7vHost "builder.l7v.dev";
      "backup.l7v.dev" = l7vHost "backup.l7v.dev";

      "github.com git.l7v.dev" = {
        user = "git";
        identityFile = defaultKey;
      };
    };
  };
}
