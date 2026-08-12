# Named workspace declarations and compositor misc settings for Niri.
''
  // Named workspace declarations.
  workspace "terminal" {}
  workspace "browser" {}
  workspace "code" {}
  workspace "media" {}
  workspace "ai" {}
  workspace "notes" {}

  xwayland-satellite {}

  hotkey-overlay {
    skip-at-startup
  }

  // Enable window activation compatibility required by Noctalia IPC.
  debug {
    honor-xdg-activation-with-invalid-serial
  }
''
