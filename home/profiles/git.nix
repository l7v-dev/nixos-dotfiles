# Home profile: git + delta pager
_:
{
  programs.git = {
    enable = true;
    userName = "l7v-dev";
    userEmail = "l7v.dev@kuazon.com";

    aliases = {
      st = "status -sb";
      lg = "log --oneline --graph --decorate --all";
      undo = "reset HEAD~1 --mixed";
      wip = "commit -am 'wip'";
    };

    ignores = [
      ".direnv"
      ".env"
      ".env.local"
      "*.swp"
      "*.swo"
      ".DS_Store"
      "result"
      "result-*"
    ];

    extraConfig = {
      init.defaultBranch = "main";
      pull.rebase = true;
      push.autoSetupRemote = true;
      rebase.autoStash = true;
      diff.colorMoved = "default";
      merge.conflictstyle = "zdiff3";
      core.autocrlf = "input";
      core.editor = "nvim";

      # Forgejo self-hosted
      url."https://git.l7v.dev/".insteadOf = "gl7v:";

      # GitHub shorthand
      url."https://github.com/".insteadOf = "gh:";
    };
  };

  programs.delta = {
    enable = true;
    enableGitIntegration = true;
    options = {
      navigate = true;
      light = false;
      line-numbers = true;
      decorations = {
        commit-decoration-style = "bold yellow box ul";
        file-style = "bold yellow";
        file-decoration-style = "none";
      };
    };
  };
}