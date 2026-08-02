# Output, layout geometry, blur, cursor, overview, and gesture settings for Niri.
''
output "eDP-1" {
  scale 1.0
}

// Desktop layout, column defaults, gaps, and window borders.
layout {
  gaps 12
  center-focused-column "never"
  background-color "transparent"

  preset-column-widths {
    proportion 0.25
    proportion 0.33333
    proportion 0.5
    proportion 0.66667
    proportion 0.8
  }

  default-column-width { proportion 0.5; }

  focus-ring {
    width 3
    active-gradient from="#f38ba8" to="#fab387" angle=45
    inactive-gradient from="#313244" to="#45475a" angle=45 relative-to="workspace-view"
  }

  border {
    off
    width 2
    active-color "#cba6f7"
    inactive-color "#313244"
  }

  shadow {
    on
    softness 30
    spread 5
    offset x=0 y=5
    color "#0007"
  }
}

prefer-no-csd
screenshot-path "~/Pictures/Screenshots/Screenshot from %Y-%m-%d %H-%M-%S.png"

blur {
  passes 2
  offset 3.0
  noise 0.03
  saturation 1.0
}

cursor {
  hide-when-typing
  hide-after-inactive-ms 10000
}

overview {
  workspace-shadow {
    off
  }
}

gestures {
  hot-corners {
    off
  }
}
''
