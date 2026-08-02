# Layer rules and window rules for Niri.
''
// Layer rules for Noctalia shell components.
layer-rule {
  match namespace=r#"^noctalia-backdrop"#
  place-within-backdrop true
}

layer-rule {
  match namespace=r#"^noctalia-(bar|notification|dock|panel|attached-panel|osd)"#
  background-effect {
    xray false
  }
}

// Window behaviors and workspace assignment rules.
window-rule {
  match app-id=r#"^dev\.noctalia\.Noctalia\.Settings$"#
  open-floating true
  default-column-width { fixed 1080; }
  default-window-height { fixed 920; }
}

window-rule {
  geometry-corner-radius 12
  clip-to-geometry true
  background-effect {
    blur true
    xray false
  }
}

window-rule {
  match app-id=r#"zen$"#
  open-on-workspace "browser"
  open-maximized true
}

window-rule {
  match app-id=r#"^(code-cursor|cursor|code|zed)$"#
  open-on-workspace "code"
  open-maximized true
}

window-rule {
  match app-id=r#"^obsidian$"#
  open-on-workspace "notes"
  open-maximized true
}

window-rule {
  match title=r#"(?i)(aider|claude|gemini)"#
  open-on-workspace "ai"
}

window-rule {
  match app-id=r#"^yazi$"#
  default-column-width { proportion 0.6; }
}

window-rule {
  match app-id=r#"firefox$"# title=r#"^Picture-in-Picture$"#
  open-floating true
}

window-rule {
  match app-id=r#"^(pavucontrol|nm-connection-editor|blueman-manager)$"#
  open-floating true
}
''
