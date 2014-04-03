var editor = (function() {

    // Editor elements
    var contentField, lastType, currentNodeList;

    // Editor Bubble elements
    var textOptions, optionsBox, boldButton, italicButton, quoteButton, urlButton, urlInput;


    function init() {

        lastRange = 0;
        composing = false;
        bindElements();

        // Set cursor position
        var range = document.createRange();
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        createEventBindings();
    }

    function createEventBindings( on ) {

        // Key up bindings
        document.onkeyup = checkTextHighlighting;

        // Mouse bindings
        document.onmousedown = checkTextHighlighting;
        document.onmouseup = function( event ) {

            setTimeout( function() {
                checkTextHighlighting( event );
            }, 1);
        };

        // Window bindings
        window.addEventListener( 'resize', function( event ) {
            updateBubblePosition();
        });

        // Scroll bindings. We limit the events, to free the ui
        // thread and prevent stuttering. See:
        // http://ejohn.org/blog/learning-from-twitter
        var scrollEnabled = true;
        document.body.addEventListener( 'scroll', function() {

            if ( !scrollEnabled ) {
                return;
            }

            scrollEnabled = true;

            updateBubblePosition();

            return setTimeout((function() {
                scrollEnabled = true;
            }), 250);
        });

        // Composition bindings. We need them to distinguish
        // IME composition from text selection
        document.addEventListener( 'compositionstart', onCompositionStart );
        document.addEventListener( 'compositionend', onCompositionEnd );
    }

    function bindElements() {

        contentField = document.querySelector( '.laraphrase_editable_mode_on' );
        textOptions = document.querySelector( '.laraphrase-text-options ' );

        optionsBox = textOptions.querySelector( '.options' );

        boldButton = textOptions.querySelector( '.bold' );
        boldButton.onclick = onBoldClick;

        italicButton = textOptions.querySelector( '.italic' );
        italicButton.onclick = onItalicClick;

        quoteButton = textOptions.querySelector( '.quote' );
        quoteButton.onclick = onQuoteClick;

        urlButton = textOptions.querySelector( '.url' );
        urlButton.onmousedown = onUrlClick;

        urlInput = textOptions.querySelector( '.url-input' );
        urlInput.onblur = onUrlInputBlur;
        urlInput.onkeydown = onUrlInputKeyDown;
    }

    function checkTextHighlighting( event ) {

        var selection = window.getSelection();

        if ( (event.target.className === "url-input" ||
            (typeof event.target.classList !== 'undefined' &&
            event.target.classList.contains( "url" )) ||
            (typeof event.target.parentNode.classList !== 'undefined' &&
            event.target.parentNode.classList.contains( "ui-inputs"))) ) {

            currentNodeList = findNodes( selection.focusNode );
            updateBubbleStates();
            return;
        }

        // Check selections exist
        if ( selection.isCollapsed === true && lastType === false ) {

            onSelectorBlur();
        }

        // Text is selected
        if ( selection.isCollapsed === false && composing === false ) {

            currentNodeList = findNodes( selection.focusNode );

            // Find if highlighting is in the editable area
            if ( hasNode( currentNodeList, "SPAN") ) {

                // Show the ui bubble

                if ( typeof selection.focusNode.parentNode.classList !== 'undefined' &&
                    selection.focusNode.parentNode.classList.contains( "laraphrase_editable_mode_on" )
                   ) {
                    updateBubbleStates();
                    updateBubblePosition();
                    textOptions.className = "laraphrase-text-options active";
                }
            }
        }

        lastType = selection.isCollapsed;
    }

    function updateBubblePosition() {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var boundary = range.getBoundingClientRect();

        textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
        textOptions.style.left = (boundary.left + boundary.right)/2 + "px";
    }

    function updateBubbleStates() {

        // It would be possible to use classList here, but I feel that the
        // browser support isn't quite there, and this functionality doesn't
        // warrent a shim.

        if ( hasNode( currentNodeList, 'B') ) {
            boldButton.className = "bold active"
        } else {
            boldButton.className = "bold"
        }

        if ( hasNode( currentNodeList, 'I') ) {
            italicButton.className = "italic active"
        } else {
            italicButton.className = "italic"
        }

        if ( hasNode( currentNodeList, 'BLOCKQUOTE') ) {
            quoteButton.className = "quote active"
        } else {
            quoteButton.className = "quote"
        }

        if ( hasNode( currentNodeList, 'A') ) {
            urlButton.className = "url useicons active"
        } else {
            urlButton.className = "url useicons"
        }
    }

    function onSelectorBlur() {

        textOptions.className = "laraphrase-text-options fade";
        setTimeout( function() {

            if (textOptions.className == "laraphrase-text-options fade") {

                textOptions.className = "laraphrase-text-options";
                textOptions.style.top = '-999px';
                textOptions.style.left = '-999px';
            }
        }, 260 )
    }

    function findNodes( element ) {

        var nodeNames = {};

        while ( element.parentNode ) {

            nodeNames[element.nodeName] = true;
            element = element.parentNode;

            if ( element.nodeName === 'A' ) {
                nodeNames.url = element.href;
            }
        }

        return nodeNames;
    }

    function hasNode( nodeList, name ) {

        return !!nodeList[ name ];
    }

    function onBoldClick() {
        document.execCommand( 'bold', false );
    }

    function onItalicClick() {
        document.execCommand( 'italic', false );
    }

    function onQuoteClick() {

        var nodeNames = findNodes( window.getSelection().focusNode );

        if ( hasNode( nodeNames, 'BLOCKQUOTE' ) ) {
            document.execCommand( 'formatBlock', false, 'p' );
            document.execCommand( 'outdent' );
        } else {
            document.execCommand( 'formatBlock', false, 'blockquote' );
        }
    }

    function onUrlClick() {

        if ( optionsBox.className == 'options' ) {

            optionsBox.className = 'options url-mode';

            // Set timeout here to debounce the focus action
            setTimeout( function() {

                var nodeNames = findNodes( window.getSelection().focusNode );

                if ( hasNode( nodeNames , "A" ) ) {
                    urlInput.value = nodeNames.url;
                } else {
                    // Symbolize text turning into a link, which is temporary, and will never be seen.
                    document.execCommand( 'createLink', false, '/' );
                }

                // Since typing in the input box kills the highlighted text we need
                // to save this selection, to add the url link if it is provided.
                lastSelection = window.getSelection().getRangeAt(0);
                lastType = false;

                urlInput.focus();

            }, 100);

        } else {

            optionsBox.className = 'options';
        }
    }

    function onUrlInputKeyDown( event ) {

        if ( event.keyCode === 13 ) {
            event.preventDefault();
            applyURL( urlInput.value );
            urlInput.blur();
        }
    }

    function onUrlInputBlur( event ) {

        optionsBox.className = 'options';
        applyURL( urlInput.value );
        urlInput.value = '';

        currentNodeList = findNodes( window.getSelection().focusNode );
        updateBubbleStates();
    }

    function applyURL( url ) {

        rehighlightLastSelection();

        // Unlink any current links
        document.execCommand( 'unlink', false );

        if (url !== "") {

            // Insert HTTP if it doesn't exist.
            if ( !url.match("^(http|https)://") ) {

                url = "http://" + url;
            }

            document.execCommand( 'createLink', false, url );
        }
    }

    function rehighlightLastSelection() {

        window.getSelection().addRange( lastSelection );
    }

    function onCompositionStart ( event ) {
        composing = true;
    }

    function onCompositionEnd (event) {
        composing = false;
    }

    return {
        init: init
    }

})();