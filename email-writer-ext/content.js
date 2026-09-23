// STEP 1: Check that the extension content script has loaded
console.log("MailMind compact analysis UI v1.1.0 loaded");


// =========================================================
// BACKEND CONFIGURATION
// =========================================================

const BACKEND_BASE_URL = 'https://mailmind-backend-hr9p.onrender.com';

const REQUEST_TIMEOUT_MS = 120000;


// =========================================================
// FETCH WITH TIMEOUT
// =========================================================

async function fetchWithTimeout(url, options, timeoutMs) {

    const controller = new AbortController();

    const timeoutId = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {

        return await fetch(url, {
            ...options,
            signal: controller.signal
        });

    } finally {

        clearTimeout(timeoutId);
    }
}


// =========================================================
// FRIENDLY ERROR MESSAGE
// =========================================================

function getFriendlyErrorMessage(error) {

    if (error && error.name === 'AbortError') {

        return 'The request took too long to respond. Please try again.';
    }


    if (error instanceof TypeError) {

        return 'Could not reach the MailMind backend. Please make sure it is running.';
    }


    if (error && error.code === 'EMPTY_RESPONSE') {

        return 'MailMind did not return a valid response. Please try again.';
    }


    if (error && error.code === 'BACKEND_ERROR') {

        return 'MailMind could not process this email right now. Please try again shortly.';
    }


    if (error && error.code === 'COMPOSE_BOX_NOT_FOUND') {

        return 'Could not find the Gmail reply box. Please open the reply box and try again.';
    }


    if (error && error.code === 'INSERT_FAILED') {

        return 'AI generated the reply, but Gmail did not accept it. Please click inside the reply box and try again.';
    }


    return 'Something went wrong. Please try again.';
}


// =========================================================
// AI REPLY BUTTON
// =========================================================

function createAIButton() {

    const button = document.createElement('div');

    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';

    button.style.marginRight = '8px';

    button.innerHTML = 'AI Reply';

    button.setAttribute('role', 'button');

    button.setAttribute(
        'data-tooltip',
        'Generate AI Reply'
    );

    return button;
}


// =========================================================
// AI ANALYZE BUTTON
// =========================================================

function createAnalyzeButton() {

    const button = document.createElement('div');

    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';

    button.style.marginRight = '8px';

    button.innerHTML = 'AI Analyze';

    button.setAttribute('role', 'button');

    button.setAttribute(
        'data-tooltip',
        'Analyze Email'
    );

    return button;
}


// =========================================================
// GET EMAIL CONTENT
// =========================================================

function getEmailContent() {

    const selectors = [
        '.h7',
        '.a3s.aiL',
        '.gmail_quote'
    ];


    for (const selector of selectors) {

        const matches =
            document.querySelectorAll(selector);


        for (
            let i = matches.length - 1;
            i >= 0;
            i--
        ) {

            const element = matches[i];

            const isVisible =
                element.offsetParent !== null;


            if (!isVisible) {
                continue;
            }


            const text =
                element.innerText.trim();


            if (text) {

                return text;
            }
        }
    }


    return '';
}


// =========================================================
// FIND COMPOSE TOOLBAR
// =========================================================

function findComposeToolbar(scope) {

    const searchRoot =
        scope || document;


    const selectors = [
        '.btC',
        '.aDh',
        '[role="toolbar"]',
        '.gU.Up'
    ];


    for (const selector of selectors) {

        const toolbar =
            searchRoot.querySelector(selector);


        if (toolbar) {

            return toolbar;
        }
    }


    return null;
}


// =========================================================
// FIND GMAIL COMPOSE BOX
// =========================================================

function findComposeBox(scope) {

    const roots = [];


    if (scope) {

        roots.push(scope);

        let parent =
            scope.parentElement;


        for (
            let i = 0;
            i < 6 && parent;
            i++
        ) {

            roots.push(parent);

            parent =
                parent.parentElement;
        }
    }


    roots.push(document);


    const selectors = [

        '[contenteditable="true"][role="textbox"]',

        '[contenteditable="true"][g_editable="true"]',

        '[role="textbox"][g_editable="true"]',

        'div[contenteditable="true"]'
    ];


    for (const root of roots) {

        for (const selector of selectors) {

            const candidates =
                root.querySelectorAll(selector);


            for (
                let i = candidates.length - 1;
                i >= 0;
                i--
            ) {

                const element =
                    candidates[i];


                if (
                    element &&
                    element.offsetParent !== null
                ) {

                    return element;
                }
            }
        }
    }


    return null;
}


// =========================================================
// GET EDITOR TEXT
// =========================================================

function getEditorText(editor) {

    if (!editor) {
        return '';
    }


    return (
        editor.innerText ||
        editor.textContent ||
        ''
    ).trim();
}


// =========================================================
// CHECK WHETHER TEXT WAS INSERTED
// =========================================================

function editorContainsText(editor, text) {

    if (!editor || !text) {

        return false;
    }


    const editorText =
        getEditorText(editor);


    const targetText =
        String(text).trim();


    if (!editorText || !targetText) {

        return false;
    }


    return editorText.includes(
        targetText
    );
}


// =========================================================
// DISPATCH GMAIL INPUT EVENTS
// =========================================================

function dispatchEditorInputEvents(
    editor,
    text = ''
) {

    if (!editor) {
        return;
    }


    try {

        editor.dispatchEvent(
            new InputEvent(
                'beforeinput',
                {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: text || null
                }
            )
        );

    } catch (error) {

        console.log(
            'beforeinput event fallback'
        );
    }


    try {

        editor.dispatchEvent(
            new InputEvent(
                'input',
                {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: text || null
                }
            )
        );

    } catch (error) {

        editor.dispatchEvent(
            new Event(
                'input',
                {
                    bubbles: true,
                    cancelable: true
                }
            )
        );
    }


    editor.dispatchEvent(
        new Event(
            'change',
            {
                bubbles: true
            }
        )
    );
}


// =========================================================
// PLACE CURSOR AT END
// =========================================================

function placeCursorAtEnd(editor) {

    if (!editor) {
        return false;
    }


    try {

        editor.focus();


        const selection =
            window.getSelection();


        const range =
            document.createRange();


        range.selectNodeContents(
            editor
        );


        range.collapse(false);


        if (selection) {

            selection.removeAllRanges();

            selection.addRange(
                range
            );
        }


        return true;

    } catch (error) {

        console.error(
            'Could not place cursor:',
            error
        );

        return false;
    }
}


// =========================================================
// INSERT USING EXEC COMMAND
// =========================================================

function insertUsingExecCommand(
    editor,
    text
) {

    if (!editor || !text) {

        return false;
    }


    try {

        placeCursorAtEnd(
            editor
        );


        if (
            typeof document.execCommand ===
            'function'
        ) {

            const worked =
                document.execCommand(
                    'insertText',
                    false,
                    text
                );


            dispatchEditorInputEvents(
                editor,
                text
            );


            if (
                worked &&
                editorContainsText(
                    editor,
                    text
                )
            ) {

                return true;
            }


            /*
             * Gmail may accept the command but update
             * the contenteditable DOM slightly later.
             *
             * The caller performs delayed verification.
             */

            return worked;

        }

    } catch (error) {

        console.error(
            'execCommand insertion error:',
            error
        );
    }


    return false;
}


// =========================================================
// INSERT USING RANGE
// =========================================================

function insertUsingRange(
    editor,
    text
) {

    if (!editor || !text) {

        return false;
    }


    try {

        editor.focus();


        const selection =
            window.getSelection();


        const range =
            document.createRange();


        range.selectNodeContents(
            editor
        );


        range.collapse(false);


        if (selection) {

            selection.removeAllRanges();

            selection.addRange(
                range
            );
        }


        range.deleteContents();


        const fragment =
            document.createDocumentFragment();


        const lines =
            String(text).split('\n');


        lines.forEach(
            (line, index) => {

                if (index > 0) {

                    fragment.appendChild(
                        document.createElement(
                            'br'
                        )
                    );
                }


                fragment.appendChild(
                    document.createTextNode(
                        line
                    )
                );
            }
        );


        range.insertNode(
            fragment
        );


        range.collapse(false);


        if (selection) {

            selection.removeAllRanges();

            selection.addRange(
                range
            );
        }


        dispatchEditorInputEvents(
            editor,
            text
        );


        return editorContainsText(
            editor,
            text
        );

    } catch (error) {

        console.error(
            'Range insertion error:',
            error
        );
    }


    return false;
}


// =========================================================
// WAIT HELPER
// =========================================================

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


// =========================================================
// ROBUST GMAIL INSERTION
// =========================================================

async function insertTextIntoGmailEditor(
    editor,
    text
) {

    if (!editor || !text) {

        return false;
    }


    const cleanText =
        String(text).trim();


    if (!cleanText) {

        return false;
    }


    console.log(
        'Starting Gmail reply insertion...'
    );


    /*
     * -----------------------------------------------------
     * ATTEMPT 1
     * -----------------------------------------------------
     *
     * Use Gmail's contenteditable editor normally.
     */

    try {

        editor.focus();

        placeCursorAtEnd(
            editor
        );


        const execResult =
            insertUsingExecCommand(
                editor,
                cleanText
            );


        /*
         * IMPORTANT:
         *
         * Do NOT immediately declare failure.
         *
         * Gmail may update its editor asynchronously.
         */

        await wait(150);


        if (
            editorContainsText(
                editor,
                cleanText
            )
        ) {

            console.log(
                'AI Reply inserted successfully on attempt 1'
            );

            return true;
        }


        await wait(350);


        if (
            editorContainsText(
                editor,
                cleanText
            )
        ) {

            console.log(
                'AI Reply inserted successfully after delayed Gmail update'
            );

            return true;
        }


        console.log(
            'Attempt 1 did not verify insertion.',
            execResult
        );

    } catch (error) {

        console.error(
            'Attempt 1 failed:',
            error
        );
    }


    /*
     * -----------------------------------------------------
     * ATTEMPT 2
     * -----------------------------------------------------
     *
     * Re-find the editor because Gmail can replace the
     * contenteditable element internally.
     */

    try {

        const freshEditor =
            findComposeBox(
                editor.closest(
                    '[role="dialog"]'
                ) ||
                editor.parentElement
            ) || editor;


        freshEditor.focus();


        placeCursorAtEnd(
            freshEditor
        );


        const rangeResult =
            insertUsingRange(
                freshEditor,
                cleanText
            );


        await wait(200);


        if (
            editorContainsText(
                freshEditor,
                cleanText
            )
        ) {

            console.log(
                'AI Reply inserted successfully on attempt 2'
            );

            return true;
        }


        if (rangeResult) {

            return true;
        }

    } catch (error) {

        console.error(
            'Attempt 2 failed:',
            error
        );
    }


    /*
     * -----------------------------------------------------
     * ATTEMPT 3
     * -----------------------------------------------------
     *
     * Gmail sometimes replaces the editor after the first
     * mutation. Re-query the DOM again and try execCommand.
     */

    try {

        await wait(300);


        const latestEditor =
            findComposeBox(
                document
            );


        if (!latestEditor) {

            console.log(
                'Could not find Gmail editor during attempt 3'
            );

            return false;
        }


        latestEditor.focus();


        placeCursorAtEnd(
            latestEditor
        );


        try {

            document.execCommand(
                'insertText',
                false,
                cleanText
            );

        } catch (error) {

            console.error(
                'Attempt 3 execCommand error:',
                error
            );
        }


        dispatchEditorInputEvents(
            latestEditor,
            cleanText
        );


        await wait(250);


        if (
            editorContainsText(
                latestEditor,
                cleanText
            )
        ) {

            console.log(
                'AI Reply inserted successfully on attempt 3'
            );

            return true;
        }

    } catch (error) {

        console.error(
            'Attempt 3 failed:',
            error
        );
    }


    /*
     * -----------------------------------------------------
     * FINAL VERIFICATION
     * -----------------------------------------------------
     */

    await wait(500);


    const finalEditor =
        findComposeBox(
            document
        );


    if (
        finalEditor &&
        editorContainsText(
            finalEditor,
            cleanText
        )
    ) {

        console.log(
            'AI Reply detected in Gmail after final delayed verification'
        );

        return true;
    }


    console.error(
        'AI Reply could not be inserted after all attempts.'
    );


    return false;
}


// =========================================================
// HTML ESCAPING
// =========================================================

function escapeHtml(value) {

    return String(value ?? '')
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        );
}


// =========================================================
// TEXT TRUNCATION
// =========================================================

function truncateText(
    value,
    maxLength
) {

    const text =
        (value || '').trim();


    if (!text) {

        return '';
    }


    if (
        text.length <= maxLength
    ) {

        return text;
    }


    return (
        text
            .slice(
                0,
                maxLength
            )
            .trim()
        + '…'
    );
}


// =========================================================
// CREATE ANALYSIS BOX
// =========================================================

function createAnalysisBox(
    analysis,
    scope
) {

    const searchRoot =
        scope || document;


    const oldBox =
        searchRoot.querySelector(
            '.ai-analysis-box'
        );


    if (oldBox) {

        oldBox.remove();
    }


    const box =
        document.createElement(
            'div'
        );


    box.className =
        'ai-analysis-box mailmind-compact-result';


    box.style.background =
        '#f8fafc';

    box.style.border =
        '1px solid #e2e8f0';

    box.style.borderRadius =
        '8px';

    box.style.padding =
        '8px 10px';

    box.style.margin =
        '6px 8px';

    box.style.fontFamily =
        'Google Sans, Roboto, Arial, sans-serif';

    box.style.fontSize =
        '12px';

    box.style.lineHeight =
        '1.35';

    box.style.maxWidth =
        '460px';

    box.style.display =
        'flex';

    box.style.alignItems =
        'center';

    box.style.justifyContent =
        'space-between';

    box.style.gap =
        '10px';

    box.style.boxShadow =
        'none';


    const priority =
        analysis.priority ||
        'LOW';


    const actionText =
        analysis.actionRequired
            ? truncateText(
                analysis.action ||
                'Action required',
                42
            )
            : 'No action';


    const deadlineText =
        truncateText(
            analysis.deadline ||
            'No deadline',
            28
        );


    let priorityBackground =
        '#e8f5e9';


    let priorityText =
        '#1b5e20';


    if (
        priority === 'HIGH'
    ) {

        priorityBackground =
            '#fce8e6';

        priorityText =
            '#c5221f';

    } else if (
        priority === 'MEDIUM'
    ) {

        priorityBackground =
            '#fef7e0';

        priorityText =
            '#b06000';
    }


    box.innerHTML = `

        <div style="
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            min-width: 0;
            flex: 1;
        ">

            <span style="
                color: #0f9d58;
                font-weight: 600;
                white-space: nowrap;
            ">
                Analyzed
            </span>

            <span style="
                background: ${priorityBackground};
                color: ${priorityText};
                padding: 2px 7px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            ">
                ${escapeHtml(priority)}
            </span>

            <span style="
                color: #5f6368;
                white-space: nowrap;
            ">
                ${escapeHtml(deadlineText)}
            </span>

            <span style="
                color: #3c4043;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 180px;
            ">
                ${escapeHtml(actionText)}
            </span>

        </div>

        <a
            href="https://ai-email-intelligence-assistant.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style="
                flex-shrink: 0;
                background: #1a73e8;
                color: #ffffff;
                text-decoration: none;
                padding: 5px 9px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            "
        >
            View in MailMind
        </a>
    `;


    return box;
}


// =========================================================
// SHOW ANALYSIS BOX
// =========================================================

function showAnalysisBox(
    analysis,
    scope
) {

    const toolbar =
        findComposeToolbar(
            scope
        );


    if (!toolbar) {

        console.log(
            "Toolbar not found for analysis"
        );

        return;
    }


    const box =
        createAnalysisBox(
            analysis,
            scope
        );


    toolbar.parentElement.insertBefore(
        box,
        toolbar
    );
}


// =========================================================
// INJECT BUTTONS
// =========================================================

function injectButton(scope) {

    const searchRoot =
        scope || document;


    // -----------------------------------------------------
    // Remove existing AI Reply button
    // -----------------------------------------------------

    const existingButton =
        searchRoot.querySelector(
            '.ai-reply-button'
        );


    if (existingButton) {

        existingButton.remove();
    }


    // -----------------------------------------------------
    // Remove existing AI Analyze button
    // -----------------------------------------------------

    const existingAnalyzeButton =
        searchRoot.querySelector(
            '.ai-analyze-button'
        );


    if (existingAnalyzeButton) {

        existingAnalyzeButton.remove();
    }


    // -----------------------------------------------------
    // Find toolbar
    // -----------------------------------------------------

    const toolbar =
        findComposeToolbar(
            searchRoot
        );


    if (!toolbar) {

        console.log(
            "Toolbar not found"
        );

        return;
    }


    console.log(
        "Toolbar found, creating AI button"
    );


    // =====================================================
    // AI REPLY
    // =====================================================

    const button =
        createAIButton();


    button.classList.add(
        'ai-reply-button'
    );


    let isReplyInProgress =
        false;


    button.addEventListener(
        'click',
        async () => {

            if (isReplyInProgress) {

                return;
            }


            isReplyInProgress =
                true;


            try {

                // -------------------------------------------------
                // Show loading state
                // -------------------------------------------------

                button.innerHTML =
                    'Generating...';


                // -------------------------------------------------
                // Get email
                // -------------------------------------------------

                const emailContent =
                    getEmailContent();


                if (!emailContent) {

                    alert(
                        'Could not find email content'
                    );

                    return;
                }


                // -------------------------------------------------
                // Backend request
                // -------------------------------------------------

                const response =
                    await fetchWithTimeout(
                        `${BACKEND_BASE_URL}/api/email/generate`,
                        {
                            method: 'POST',

                            credentials: 'include',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body: JSON.stringify({
                                emailContent:
                                    emailContent,

                                tone:
                                    "professional"
                            })
                        },
                        REQUEST_TIMEOUT_MS
                    );


                // -------------------------------------------------
                // Check backend response
                // -------------------------------------------------

                if (!response.ok) {

                    const errorText =
                        await response
                            .text()
                            .catch(
                                () => ''
                            );


                    console.error(
                        'Reply API Error:',
                        response.status,
                        errorText
                    );


                    const requestError =
                        new Error(
                            'Backend returned an error'
                        );


                    requestError.code =
                        'BACKEND_ERROR';


                    throw requestError;
                }


                // -------------------------------------------------
                // Get generated reply
                // -------------------------------------------------

                const generatedReply =
                    await response.text();


                if (
                    !generatedReply ||
                    !generatedReply.trim()
                ) {

                    const emptyResponseError =
                        new Error(
                            'Empty response from server'
                        );


                    emptyResponseError.code =
                        'EMPTY_RESPONSE';


                    throw emptyResponseError;
                }


                console.log(
                    'AI Reply received from backend:',
                    generatedReply.length,
                    'characters'
                );


                // =================================================
                // IMPORTANT:
                // Re-find Gmail editor AFTER Gemini response.
                //
                // Gmail can replace the editor DOM while the
                // backend request is running.
                // =================================================

                let composeBox =
                    findComposeBox(
                        searchRoot
                    );


                if (!composeBox) {

                    composeBox =
                        findComposeBox(
                            document
                        );
                }


                if (!composeBox) {

                    const composeError =
                        new Error(
                            'Could not find Gmail reply editor'
                        );


                    composeError.code =
                        'COMPOSE_BOX_NOT_FOUND';


                    throw composeError;
                }


                // -------------------------------------------------
                // Insert reply
                // -------------------------------------------------

                const inserted =
                    await insertTextIntoGmailEditor(
                        composeBox,
                        generatedReply
                    );


                if (!inserted) {

                    const insertError =
                        new Error(
                            'Could not insert the AI reply into Gmail'
                        );


                    insertError.code =
                        'INSERT_FAILED';


                    throw insertError;
                }


                console.log(
                    'AI Reply inserted into Gmail successfully'
                );


            } catch (error) {

                console.error(
                    'AI Reply error:',
                    error
                );


                alert(
                    getFriendlyErrorMessage(
                        error
                    )
                );


            } finally {

                button.innerHTML =
                    'AI Reply';


                isReplyInProgress =
                    false;
            }
        }
    );


    // =====================================================
    // AI ANALYZE
    // =====================================================

    const analyzeButton =
        createAnalyzeButton();


    analyzeButton.classList.add(
        'ai-analyze-button'
    );


    let isAnalyzeInProgress =
        false;


    analyzeButton.addEventListener(
        'click',
        async () => {

            if (isAnalyzeInProgress) {

                return;
            }


            isAnalyzeInProgress =
                true;


            try {

                analyzeButton.innerHTML =
                    'Analyzing...';


                // -------------------------------------------------
                // Get email
                // -------------------------------------------------

                const emailContent =
                    getEmailContent();


                if (!emailContent) {

                    alert(
                        'Could not find email content'
                    );

                    return;
                }


                // -------------------------------------------------
                // Backend analysis request
                // -------------------------------------------------

                const response =
                    await fetchWithTimeout(
                        `${BACKEND_BASE_URL}/api/email/analyze`,
                        {
                            method: 'POST',

                            credentials: 'include',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body: JSON.stringify({
                                emailContent:
                                    emailContent,

                                tone:
                                    "professional"
                            })
                        },
                        REQUEST_TIMEOUT_MS
                    );


                // -------------------------------------------------
                // Check backend response
                // -------------------------------------------------

                if (!response.ok) {

                    const errorText =
                        await response
                            .text()
                            .catch(
                                () => ''
                            );


                    console.error(
                        'Analysis API Error:',
                        response.status,
                        errorText
                    );


                    const requestError =
                        new Error(
                            'Backend returned an error'
                        );


                    requestError.code =
                        'BACKEND_ERROR';


                    throw requestError;
                }


                // -------------------------------------------------
                // Parse analysis
                // -------------------------------------------------

                const analysis =
                    await response.json();


                if (
                    !analysis ||
                    typeof analysis !== 'object'
                ) {

                    const emptyResponseError =
                        new Error(
                            'Invalid response from server'
                        );


                    emptyResponseError.code =
                        'EMPTY_RESPONSE';


                    throw emptyResponseError;
                }


                // -------------------------------------------------
                // Show analysis
                // -------------------------------------------------

                showAnalysisBox(
                    analysis,
                    searchRoot
                );


            } catch (error) {

                console.error(
                    'AI Analyze error:',
                    error
                );


                alert(
                    getFriendlyErrorMessage(
                        error
                    )
                );


            } finally {

                analyzeButton.innerHTML =
                    'AI Analyze';


                isAnalyzeInProgress =
                    false;
            }
        }
    );


    // =====================================================
    // ADD BUTTONS TO TOOLBAR
    // =====================================================

    toolbar.insertBefore(
        button,
        toolbar.firstChild
    );


    toolbar.insertBefore(
        analyzeButton,
        button.nextSibling
    );
}


// =========================================================
// GMAIL MUTATION OBSERVER
// =========================================================

const scheduledContainers =
    new WeakSet();


const observer =
    new MutationObserver(
        (mutations) => {

            for (const mutation of mutations) {

                const addedNodes =
                    Array.from(
                        mutation.addedNodes
                    );


                for (const node of addedNodes) {

                    if (
                        node.nodeType !==
                        Node.ELEMENT_NODE
                    ) {

                        continue;
                    }


                    const composeContainer =
                        node.matches(
                            '.aDh, .btC, [role="dialog"]'
                        )
                            ? node
                            : node.querySelector(
                                '.aDh, .btC, [role="dialog"]'
                            );


                    if (!composeContainer) {

                        continue;
                    }


                    if (
                        scheduledContainers.has(
                            composeContainer
                        )
                    ) {

                        continue;
                    }


                    scheduledContainers.add(
                        composeContainer
                    );


                    console.log(
                        "Compose Window Detected"
                    );


                    setTimeout(
                        () => {

                            scheduledContainers.delete(
                                composeContainer
                            );


                            injectButton(
                                composeContainer
                            );

                        },
                        500
                    );
                }
            }
        }
    );


// =========================================================
// START OBSERVER
// =========================================================

observer.observe(
    document.body,
    {
        childList: true,
        subtree: true
    }
);