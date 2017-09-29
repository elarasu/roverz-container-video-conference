import { appNavigate } from '../app';
import {
    CONFERENCE_FAILED,
    CONFERENCE_JOINED,
    CONFERENCE_LEFT
} from '../base/conference';
import { CONNECTION_ESTABLISHED, CONNECTION_FAILED } from '../base/connection';
import { hideDialog, isDialogOpen } from '../base/dialog';
import {
    JitsiConferenceErrors,
    JitsiConnectionErrors
} from '../base/lib-jitsi-meet';
import { MiddlewareRegistry } from '../base/redux';

import {
    _openLoginDialog,
    _openWaitForOwnerDialog,
    stopWaitForOwner,
    waitForOwner
} from './actions';
import {
    CANCEL_LOGIN,
    CANCEL_WAIT_FOR_OWNER,
    STOP_WAIT_FOR_OWNER,
    WAIT_FOR_OWNER
} from './actionTypes';
import { LoginDialog, WaitForOwnerDialog } from './components';

/**
 * Middleware that captures connection or conference failed errors and controls
 * {@link WaitForOwnerDialog} and {@link LoginDialog}.
 *
 * FIXME Some of the complexity was introduced by the lack of dialog stacking.
 *
 * @param {Store} store - Redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case CANCEL_LOGIN: {
        const { upgradeRoleInProgress }
            = store.getState()['features/authentication'];

        upgradeRoleInProgress && upgradeRoleInProgress.cancel();

        // The LoginDialog can be opened on top of "wait for owner". The app
        // should navigate only if LoginDialog was open without the
        // WaitForOwnerDialog.
        if (!isDialogOpen(store, WaitForOwnerDialog)) {
            if (_isWaitingForOwner(store)) {
                // Instead of hiding show the new one.
                const result = next(action);

                store.dispatch(_openWaitForOwnerDialog());

                return result;
            }

            // Go back to the app's entry point.
            _hideLoginDialog(store);
            store.dispatch(appNavigate(undefined));
        }
        break;
    }

    case CANCEL_WAIT_FOR_OWNER: {
        const result = next(action);

        store.dispatch(stopWaitForOwner());
        store.dispatch(appNavigate(undefined));

        return result;
    }

    case CONFERENCE_FAILED:
        if (action.error === JitsiConferenceErrors.AUTHENTICATION_REQUIRED) {
            store.dispatch(waitForOwner());
        } else {
            store.dispatch(stopWaitForOwner());
        }
        break;

    case CONFERENCE_JOINED:
        if (_isWaitingForOwner(store)) {
            store.dispatch(stopWaitForOwner());
        }
        _hideLoginDialog(store);
        break;

    case CONFERENCE_LEFT:
        store.dispatch(stopWaitForOwner());
        break;

    case CONNECTION_ESTABLISHED:
        _hideLoginDialog(store);
        break;

    case CONNECTION_FAILED:
        action.error === JitsiConnectionErrors.PASSWORD_REQUIRED
            && store.dispatch(_openLoginDialog());
        break;

    case STOP_WAIT_FOR_OWNER:
        _clearExistingWaitForOwnerTimeout(store);
        store.dispatch(hideDialog(WaitForOwnerDialog));
        break;

    case WAIT_FOR_OWNER: {
        _clearExistingWaitForOwnerTimeout(store);

        const { handler, timeoutMs } = action;

        action.waitForOwnerTimeoutID = setTimeout(handler, timeoutMs);

        // The WAIT_FOR_OWNER action is cyclic and we don't want to hide the
        // login dialog every few seconds...
        isDialogOpen(store, LoginDialog)
            || store.dispatch(_openWaitForOwnerDialog());
        break;
    }
    }

    return next(action);
});

/**
 * Will clear the wait for conference owner timeout handler if any is currently
 * set.
 *
 * @param {Object} store - The redux store.
 * @returns {void}
 */
function _clearExistingWaitForOwnerTimeout({ getState }) {
    const { waitForOwnerTimeoutID } = getState()['features/authentication'];

    waitForOwnerTimeoutID && clearTimeout(waitForOwnerTimeoutID);
}

/**
 * Hides {@link LoginDialog} if it's currently displayed.
 *
 * @param {Object} store - The redux store.
 * @returns {void}
 */
function _hideLoginDialog({ dispatch }) {
    dispatch(hideDialog(LoginDialog));
}

/**
 * Checks if the cyclic "wait for conference owner" task is currently scheduled.
 *
 * @param {Object} store - The redux store.
 * @returns {boolean}
 */
function _isWaitingForOwner({ getState }) {
    return Boolean(getState()['features/authentication'].waitForOwnerTimeoutID);
}
