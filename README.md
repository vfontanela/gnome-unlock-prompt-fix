# Unlock Prompt Fix

A temporary workaround for GNOME Shell 51.1 on Fedora 45: the lock screen responds and shows the clock, but the password prompt intermittently fails to appear.

Upstream report: [GNOME Shell #9505](https://gitlab.gnome.org/GNOME/gnome-shell/-/work_items/9505).

## What it does

When the first authentication mechanism selection is rejected and no mechanism is selected, the extension schedules an authentication prompt reset instead of following the path that may call `setActiveItem(undefined)`. This addresses the observed `TypeError: can't convert undefined to object` in `authMenuButton.js:231`.

It does not authenticate the user or bypass the password check. It operates in both `user` and `unlock-dialog` modes because the affected code runs on the lock screen. It does not intercept keyboard input, store passwords, or make network requests.

## Status

The original workaround was tested successfully by the reporter on Fedora 45 / GNOME Shell 51.1. This publication candidate adds cancellation of pending idle callbacks and disconnects signals when disabled or when the dialog is destroyed. Those lifecycle changes require another real lock/unlock test before claiming equivalent runtime validation. Compatibility is declared for GNOME 51 only; other 51.x versions have not been confirmed.

The source was developed with AI assistance. The suspected upstream cause remains a hypothesis. Related issue [#9495](https://gitlab.gnome.org/GNOME/gnome-shell/-/work_items/9495) describes a different symptom; it is not a confirmed duplicate.

## Install from source

Run these commands from the repository directory:

```sh
gnome-extensions pack --force --extra-source=LICENSE --out-dir . .
gnome-extensions install --force unlock-prompt-fix@vfontanela.shell-extension.zip
```

Log out and back in, then enable:

```sh
gnome-extensions enable unlock-prompt-fix@vfontanela
```

Lock the session and verify that the password prompt appears. Inspect new journal entries after starting the test; old errors in the same boot do not demonstrate a new failure.

## Disable or remove

```sh
gnome-extensions disable unlock-prompt-fix@vfontanela
gnome-extensions uninstall unlock-prompt-fix@vfontanela
```

Disable the workaround once an upstream fix is installed. The extension overrides a private Shell method and may conflict with other extensions modifying that method.

## License

GPL-2.0-or-later. See LICENSE.
