// SPDX-License-Identifier: GPL-2.0-or-later
// Workaround for GNOME Shell 51.1: rejected initial mechanism selection may
// restore an undefined mechanism and throw in AuthMenuButton._findItems().
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as UnlockDialog from 'resource:///org/gnome/shell/ui/unlockDialog.js';

export default class UnlockPromptFixExtension extends Extension {
    enable() {
        this._pendingResets = new Map();
        const owner = this;
        const proto = UnlockDialog.UnlockDialog.prototype;
        this._original = proto._selectAuthMechanism;
        const original = this._original;

        this._override = function (authMechanism) {
            if (this._selectedAuthMechanism || !authMechanism)
                return original.call(this, authMechanism);

            if (this._authPrompt.selectMechanism(authMechanism)) {
                this._selectedAuthMechanism = authMechanism;
                this._clock.selectAuthHint(authMechanism.hint);
                return;
            }

            // The first selection was rejected. Retry from a clean prompt
            // after the current signal emission, rather than selecting undefined.
            owner._scheduleReset(this);
        };
        proto._selectAuthMechanism = this._override;
    }

    _scheduleReset(dialog) {
        if (this._pendingResets.has(dialog))
            return;

        const destroyId = dialog.connect('destroy', () => {
            this._cancelReset(dialog);
        });
        const sourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._pendingResets.delete(dialog);
            dialog.disconnect(destroyId);
            if (dialog._authPrompt && !dialog._selectedAuthMechanism)
                dialog._authPrompt.reset();
            return GLib.SOURCE_REMOVE;
        });
        this._pendingResets.set(dialog, {sourceId, destroyId});
    }

    _cancelReset(dialog) {
        const pending = this._pendingResets.get(dialog);
        if (!pending)
            return;
        this._pendingResets.delete(dialog);
        GLib.Source.remove(pending.sourceId);
        dialog.disconnect(pending.destroyId);
    }

    disable() {
        // unlock-dialog is required because this workaround repairs the lock
        // screen's authentication prompt. No keyboard events are intercepted.
        const proto = UnlockDialog.UnlockDialog.prototype;
        if (proto._selectAuthMechanism === this._override)
            proto._selectAuthMechanism = this._original;
        for (const dialog of this._pendingResets.keys())
            this._cancelReset(dialog);
        this._pendingResets.clear();
        this._pendingResets = null;
        this._original = null;
        this._override = null;
    }
}
