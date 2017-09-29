import PropTypes from 'prop-types';
import { Component } from 'react';

import { hideDialog } from '../actions';
import { DIALOG_PROP_TYPES } from '../constants';

/**
 * An abstract implementation of a dialog on Web/React and mobile/react-native.
 */
export default class AbstractDialog extends Component {
    /**
     * <tt>AbstractDialog</tt> React <tt>Component</tt>'s prop types.
     *
     * @static
     */
    static propTypes = {
        ...DIALOG_PROP_TYPES,

        /**
         * The React <tt>Component</tt> children of <tt>AbstractDialog</tt>
         * which represents the dialog's body.
         */
        children: PropTypes.node,

        /**
         * Used to show/hide the dialog on cancel.
         */
        dispatch: PropTypes.func
    };

    /**
     * Initializes a new <tt>AbstractDialog</tt> instance.
     *
     * @param {Object} props - The read-only React <tt>Component</tt> props with
     * which the new instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
        };

        this._onCancel = this._onCancel.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._onSubmitFulfilled = this._onSubmitFulfilled.bind(this);
        this._onSubmitRejected = this._onSubmitRejected.bind(this);
    }

    /**
     * Implements React's {@link Component#componentWillMount()}. Invoked
     * immediately before mounting occurs.
     *
     * @inheritdoc
     */
    componentWillMount() {
        this._mounted = true;
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}. Invoked
     * immediately before this component is unmounted and destroyed.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._mounted = false;
    }

    /**
     * Dispatches a redux action to hide this dialog when it's canceled.
     *
     * @protected
     * @returns {void}
     */
    _onCancel() {
        const { cancelDisabled, onCancel } = this.props;

        if ((typeof cancelDisabled === 'undefined' || !cancelDisabled)
                && (!onCancel || onCancel())) {
            this.props.dispatch(hideDialog());
        }
    }

    /**
     * Submits this dialog. If the React <tt>Component</tt> prop
     * <tt>onSubmit</tt> is defined, the function that is the value of the prop
     * is invoked. If the function returns a <tt>thenable</tt>, then the
     * resolution of the <tt>thenable</tt> is awaited. If the submission
     * completes successfully, a redux action will be dispatched to hide this
     * dialog.
     *
     * @private
     * @param {string} value - The submitted value if any.
     * @returns {void}
     */
    _onSubmit(value) {
        const { okDisabled, onSubmit } = this.props;

        if (typeof okDisabled === 'undefined' || !okDisabled) {
            this.setState({ submitting: true });

            // Invoke the React Compnent prop onSubmit if any.
            const r = !onSubmit || onSubmit(value);

            // If the invocation returns a thenable, await its resolution;
            // otherwise, treat the return value as a boolean indicating whether
            // the submission has completed successfully.
            let then;

            if (r) {
                switch (typeof r) {
                case 'function':
                case 'object':
                    then = r.then;
                    break;
                }
            }
            if (typeof then === 'function' && then.length === 2) {
                then.call(r, this._onSubmitFulfilled, this._onSubmitRejected);
            } else if (r) {
                this._onSubmitFulfilled();
            } else {
                this._onSubmitRejected();
            }
        }
    }

    /**
     * Notifies this <tt>AbstractDialog</tt> that it has been submitted
     * successfully. Dispatches a redux action to hide this dialog after it has
     * been submitted.
     *
     * @private
     * @returns {void}
     */
    _onSubmitFulfilled() {
        this._mounted && this.setState({ submitting: false });

        this.props.dispatch(hideDialog());
    }

    /**
     * Notifies this <tt>AbstractDialog</tt> that its submission has failed.
     *
     * @private
     * @returns {void}
     */
    _onSubmitRejected() {
        this._mounted && this.setState({ submitting: false });
    }
}
