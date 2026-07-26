{ ... }:
let
  defaultKey = "~/.ssh/id_ed25519";

  l7vHost = hostname: {
    inherit hostname;
    user = "root";
    identityFile = defaultKey;
    extraOptions.StrictHostKeyChecking = "accept-new";
  };
in
{
  programs.ssh = {
    enable = true;
    addKeysToAgent = "yes";
    serverAliveInterval = 60;
    serverAliveCountMax = 3;

    matchBlocks = {
      # L7V Sunucuları ve Takma Adlar
      "server.l7v.dev l7v-server" = l7vHost "server.l7v.dev";
      "builder.l7v.dev l7v-builder" = l7vHost "builder.l7v.dev";
      "backup.l7v.dev" = l7vHost "backup.l7v.dev";

      # Git Sunucuları
      "github.com git.l7v.dev" = {
        user = "git";
        identityFile = defaultKey;
      };
    };
  };
}