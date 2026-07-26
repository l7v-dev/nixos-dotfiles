# Home profile: Cursor IDE — AI-first Code Editor
{ pkgs, ... }:
{
  home.packages = with pkgs; [
    code-cursor
  ];
}
