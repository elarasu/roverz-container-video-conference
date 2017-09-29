import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Prompt from 'react-native-prompt';
import { connect } from 'react-redux';

import { translate } from '../../i18n';
import { LoadingIndicator } from '../../react';
import { set } from '../../redux';

import AbstractDialog from './AbstractDialog';
import styles from './styles';

/**
 * The value of the style property {@link _TAG_KEY} which identifies the
 * OK/submit button of <tt>Prompt</tt>.
 */
const _SUBMIT_TEXT_TAG_VALUE = '_SUBMIT_TEXT_TAG_VALUE';

/**
 * The name of the style property which identifies ancestors of <tt>Prompt</tt>
 * such as its OK/submit button for the purposes of workarounds implemented by
 * <tt>Dialog</tt>.
 *
 * XXX The value may trigger a react-native warning in the Debug configuration
 * but, unfortunately, I couldn't find a value that wouldn't.
 */
const _TAG_KEY = '_TAG_KEY';

/**
 * Implements <tt>AbstractDialog</tt> on react-native using <tt>Prompt</tt>.
 */
class Dialog extends AbstractDialog {
    /**
     * <tt>AbstractDialog</tt>'s React <tt>Component</tt> prop types.
     *
     * @static
     */
    static propTypes = {
        ...AbstractDialog.propTypes,

        /**
         * I18n key to put as body title.
         */
        bodyKey: PropTypes.string
    };

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            bodyKey,
            cancelDisabled,
            cancelTitleKey = 'dialog.Cancel',
            okDisabled,
            okTitleKey = 'dialog.Ok',
            t,
            titleKey,
            titleString
        } = this.props;

        const cancelButtonTextStyle
            = cancelDisabled ? styles.disabledButtonText : styles.buttonText;
        let submitButtonTextStyle
            = okDisabled ? styles.disabledButtonText : styles.buttonText;

        submitButtonTextStyle = {
            ...submitButtonTextStyle,
            [_TAG_KEY]: _SUBMIT_TEXT_TAG_VALUE
        };

        // eslint-disable-next-line no-extra-parens
        let element = (
            <Prompt
                cancelButtonTextStyle = { cancelButtonTextStyle }
                cancelText = { t(cancelTitleKey) }
                onCancel = { this._onCancel }
                onSubmit = { this._onSubmit }
                placeholder = { t(bodyKey) }
                submitButtonTextStyle = { submitButtonTextStyle }
                submitText = { t(okTitleKey) }
                title = { titleString || t(titleKey) }
                visible = { true } />
        );

        // XXX The following implements workarounds with knowledge of
        // react-native-prompt/Prompt's implementation.

        // eslint-disable-next-line no-extra-parens, new-cap
        element = (new (element.type)(element.props)).render();

        let { children } = this.props;

        children = React.Children.count(children) ? children : undefined;

        // eslint-disable-next-line no-shadow
        element = this._mapReactElement(element, element => {
            // * If this Dialog has children, they are to be rendered instead of
            //   Prompt's TextInput.
            if (element.type === TextInput) {
                if (children) {
                    element = children; // eslint-disable-line no-param-reassign
                    children = undefined;
                }
            } else {
                let { style } = element.props;

                if (style
                        && (style = StyleSheet.flatten(style))
                        && _TAG_KEY in style) {
                    switch (style[_TAG_KEY]) {
                    case _SUBMIT_TEXT_TAG_VALUE:
                        if (this.state.submitting) {
                            // * If this Dialog is submitting, render a
                            //   LoadingIndicator.
                            return (
                                <LoadingIndicator
                                    color = { submitButtonTextStyle.color }
                                    size = { 'small' } />
                            );
                        }
                        break;
                    }

                    // eslint-disable-next-line no-param-reassign
                    element
                        = React.cloneElement(
                            element,
                            /* props */ {
                                style: set(style, _TAG_KEY, undefined)
                            },
                            ...React.Children.toArray(element.props.children));
                }
            }

            return element;
        });

        return element;
    }

    /**
     * Creates a deep clone of a specific <tt>ReactElement</tt> with the results
     * of calling a specific function on every node of a specific
     * <tt>ReactElement</tt> tree.
     *
     * @param {ReactElement} element - The <tt>ReactElement</tt> to clone and
     * call the specified <tt>f</tt> on.
     * @param {Function} f - The function to call on every node of the
     * <tt>ReactElement</tt> tree represented by the specified <tt>element</tt>.
     * @private
     * @returns {ReactElement}
     */
    _mapReactElement(element, f) {
        if (!element || !element.props || !element.type) {
            return element;
        }

        let mapped = f(element);

        if (mapped === element) {
            mapped
                = React.cloneElement(
                    element,
                    /* props */ undefined,
                    ...React.Children.toArray(React.Children.map(
                        element.props.children,
                        function(element) { // eslint-disable-line no-shadow
                            // eslint-disable-next-line no-invalid-this
                            return this._mapReactElement(element, f);
                        },
                        this)));
        }

        return mapped;
    }
}

export default translate(connect()(Dialog));
