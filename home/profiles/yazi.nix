{ ... }:

# Yazi file manager options and keymaps.
{
  home.file.".config/yazi/yazi.toml".text = ''
    [manager]
    ratio = [1, 3, 4]
    sort_by = "natural"
    sort_sensitive = false
    sort_reverse = false
    sort_dir_first = true
    linemode = "size"
    show_hidden = false

    [preview]
    tab_size = 2
    max_width = 600
    max_height = 900

    [opener]
    edit = [{ run = 'nvim "$@"', block = true }]
    open = [{ run = 'xdg-open "$@"', desc = "Open" }]

    [plugin]
    preload = ["image", "pdf", "archive", "video"]
  '';

  home.file.".config/yazi/keymap.toml".text = ''
    [[manager.prepend_keymap]]
    on = ["g", "p"]
    run = "cd ~/dev"
    desc = "Go to Dev"

    [[manager.prepend_keymap]]
    on = ["g", "l"]
    run = "cd ~/dev/projects/personal"
    desc = "Go to Personal Projects"

    [[manager.prepend_keymap]]
    on = ["g", "h"]
    run = "cd ~"
    desc = "Go to Home"
  '';
}
