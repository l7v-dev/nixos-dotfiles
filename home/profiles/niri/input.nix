# Keyboard, touchpad, mouse, and pointer input configuration for Niri.
''
// Keyboard and pointer input configuration.
input {
  keyboard {
    xkb {
      layout "tr"
    }
    repeat-delay 300
    repeat-rate 50
    numlock
  }

  touchpad {
    tap
    tap-button-map "left-right-middle"
    drag true
    natural-scroll
    scroll-method "two-finger"
    accel-speed 0.2
    accel-profile "adaptive"
    dwt
    disabled-on-external-mouse
  }

  mouse {
    accel-profile "flat"
  }

  warp-mouse-to-focus
  focus-follows-mouse max-scroll-amount="0%"
}
''
