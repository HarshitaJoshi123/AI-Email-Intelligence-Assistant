// STEP 1: Check that the extension content script has loaded
console.log("MailMind compact analysis UI v1.1.0 loaded");


// Single source of truth for the backend URL, so it only
// needs to change in one place if it's ever moved.
const BACKEND_BASE_URL = 'https://mailmind-backend-hr9p.onrender.com';

// How long to wait for the backend before giving up.
const REQUEST_TIMEOUT_MS = 120000;


// Wraps fetch() with an AbortController-based timeout so a
// slow/unreachable backend can't leave a button stuck loading.
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


// Turns technical errors into a clear, user-friendly message
// without exposing internal details to the user.
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

    return 'Something went wrong. Please try again.';
}


// STEP 2: Create the AI Reply button
function createAIButton() {

    // Create a new HTML div element
    const button = document.createElement('div');

    // Use Gmail's button styling
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';

    // Add some space between this button and other buttons
    button.style.marginRight = '8px';

    // Text displayed on the button
    button.innerHTML = 'AI Reply';

    // Tell the browser that this element works like a button
    button.setAttribute('role', 'button');

    // Text shown when we hover over the button
    button.setAttribute('data-tooltip', 'Generate AI Reply');

    return button;
}


// NEW: Create the AI Analyze button
function createAnalyzeButton() {

    // Create a new HTML div element
    const button = document.createElement('div');

    // Use Gmail's button styling
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';

    // Add some space between this button and other buttons
    button.style.marginRight = '8px';

    // Text displayed on the button
    button.innerHTML = 'AI Analyze';

    // Tell the browser that this element works like a button
    button.setAttribute('role', 'button');

    // Text shown when we hover over the button
    button.setAttribute('data-tooltip', 'Analyze Email');

    return button;
}


// STEP 3: Find and get the email content from Gmail
function getEmailContent() {

    // Gmail can use different HTML elements for email content.
    // [role="presentation"] was removed because Gmail applies it
    // to many layout elements, not just message bodies.
    const selectors = [
        '.h7',
        '.a3s.aiL',
        '.gmail_quote'
    ];

    // Try each selector one by one
    for (const selector of selectors) {

        // Gmail can render several messages in a thread at once,
        // so check every match for this selector.
        const matches = document.querySelectorAll(selector);

        // Gmail lists thread messages oldest to newest, so walk
        // backwards: the last *visible* match is the message that
        // is currently open / being replied to, not just whichever
        // element happens to appear first in the document.
        for (let i = matches.length - 1; i >= 0; i--) {

            const element = matches[i];

            // Skip elements that are hidden/collapsed in the DOM
            const isVisible = element.offsetParent !== null;

            if (!isVisible) {
                continue;
            }

            const text = element.innerText.trim();

            if (text) {
                return text;
            }
        }
    }

    // If no selector finds visible email content, return an empty string
    return '';
}


// STEP 4: Find Gmail's compose toolbar
function findComposeToolbar(scope) {

    // Default to the whole document when no specific compose
    // window is known (keeps this function safe to call directly).
    const searchRoot = scope || document;

    // Gmail can use different elements for the compose toolbar
    const selectors = [
        '.btC',
        '.aDh',
        '[role="toolbar"]',
        '.gU.Up'
    ];

    // Try each selector one by one
    for (const selector of selectors) {

        // Find the toolbar using the current selector, scoped to
        // the relevant compose window when one is provided
        const toolbar = searchRoot.querySelector(selector);

        // If toolbar is found, return it
        if (toolbar) {
            return toolbar;
        }
    }

    // If toolbar is not found, return null
    return null;
}


function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function truncateText(value, maxLength) {
    const text = (value || '').trim();
    if (!text) {
        return '';
    }
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength).trim() + '…';
}


// Compact Gmail result: status, priority, deadline, action + dashboard link
function createAnalysisBox(analysis, scope) {

    const searchRoot = scope || document;

    const oldBox = searchRoot.querySelector('.ai-analysis-box');

    if (oldBox) {
        oldBox.remove();
    }

    const box = document.createElement('div');
    box.className = 'ai-analysis-box mailmind-compact-result';

    box.style.background = '#f8fafc';
    box.style.border = '1px solid #e2e8f0';
    box.style.borderRadius = '8px';
    box.style.padding = '8px 10px';
    box.style.margin = '6px 8px';
    box.style.fontFamily = 'Google Sans, Roboto, Arial, sans-serif';
    box.style.fontSize = '12px';
    box.style.lineHeight = '1.35';
    box.style.maxWidth = '460px';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'space-between';
    box.style.gap = '10px';
    box.style.boxShadow = 'none';

    const priority = analysis.priority || 'LOW';
    const actionText = analysis.actionRequired
        ? truncateText(analysis.action || 'Action required', 42)
        : 'No action';
    const deadlineText = truncateText(analysis.deadline || 'No deadline', 28);

    let priorityBackground = '#e8f5e9';
    let priorityText = '#1b5e20';

    if (priority === 'HIGH') {
        priorityBackground = '#fce8e6';
        priorityText = '#c5221f';
    } else if (priority === 'MEDIUM') {
        priorityBackground = '#fef7e0';
        priorityText = '#b06000';
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
            ">Analyzed</span>
            <span style="
                background: ${priorityBackground};
                color: ${priorityText};
                padding: 2px 7px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            ">${escapeHtml(priority)}</span>
            <span style="color: #5f6368; white-space: nowrap;">
                ${escapeHtml(deadlineText)}
            </span>
            <span style="
                color: #3c4043;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 180px;
            ">${escapeHtml(actionText)}</span>
        </div>
        <a
            href="http://localhost:5173/"
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
        >View in MailMind</a>
    `;

    return box;
}


// NEW: Show the analysis box inside Gmail
function showAnalysisBox(analysis, scope) {

    // Find the Gmail compose toolbar for this specific compose window
    const toolbar = findComposeToolbar(scope);

    // If toolbar is not found, stop here
    if (!toolbar) {
        console.log("Toolbar not found for analysis");
        return;
    }

    // Create the analysis box
    const box = createAnalysisBox(analysis, scope);

    // Add the analysis box before the toolbar
    toolbar.parentElement.insertBefore(box, toolbar);
}


// STEP 5: Add the AI button to Gmail
function injectButton(scope) {

    // Default to the whole document when no specific compose
    // window is known (keeps this function safe to call directly).
    const searchRoot = scope || document;

    // Check whether our AI button already exists in this
    // specific compose window
    const existingButton = searchRoot.querySelector('.ai-reply-button');

    // Remove the old button to prevent duplicate buttons
    if (existingButton) {
        existingButton.remove();
    }

    // Remove old analyze button to prevent duplicate buttons
    const existingAnalyzeButton = searchRoot.querySelector('.ai-analyze-button');

    if (existingAnalyzeButton) {
        existingAnalyzeButton.remove();
    }


    // Find Gmail's compose toolbar for this compose window
    const toolbar = findComposeToolbar(searchRoot);

    // If toolbar is not found, stop here
    if (!toolbar) {
        console.log("Toolbar not found");
        return;
    }

    console.log("Toolbar found, creating AI button");


    // Create the AI Reply button
    const button = createAIButton();

    // Add our own class to identify the button
    button.classList.add('ai-reply-button');

    // Tracks whether a Reply request is already in progress for
    // this button, since setting .disabled on a <div> has no
    // effect and would otherwise allow duplicate clicks.
    let isReplyInProgress = false;


    // STEP 6: Decide what happens when AI Reply is clicked
    button.addEventListener('click', async () => {

        if (isReplyInProgress) {
            return;
        }

        isReplyInProgress = true;

        try {

            // Show that AI is generating the reply
            button.innerHTML = 'Generating...';


            // STEP 7: Get the email content from Gmail
            const emailContent = getEmailContent();

            // Check if email content was found
            if (!emailContent) {
                alert('Could not find email content');
                return;
            }


            // STEP 8: Send the email to our Spring Boot backend
            const response = await fetchWithTimeout(
                `${BACKEND_BASE_URL}/api/email/generate`,
                {
                    // We are sending data using POST
                    method: 'POST',

                    // Tell the backend that we are sending JSON
                    headers: {
                        'Content-Type': 'application/json',
                    },

                    // Convert our data into JSON format
                    body: JSON.stringify({
                        emailContent: emailContent,
                        tone: "professional"
                    })
                },
                REQUEST_TIMEOUT_MS
            );


            // STEP 9: Check if the backend request was successful
            if (!response.ok) {

                const errorText = await response.text().catch(() => '');

                console.error(
                    'Reply API Error:',
                    response.status,
                    errorText
                );

                const requestError = new Error('Backend returned an error');
                requestError.code = 'BACKEND_ERROR';
                throw requestError;
            }


            // STEP 10: Get the AI-generated reply from the backend
            const generatedReply = await response.text();

            if (!generatedReply || !generatedReply.trim()) {

                const emptyResponseError = new Error('Empty response from server');
                emptyResponseError.code = 'EMPTY_RESPONSE';
                throw emptyResponseError;
            }


            // STEP 11: Find Gmail's reply/compose text box for
            // this specific compose window
            const composeBox = searchRoot.querySelector(
                '[role="textbox"][g_editable="true"]'
            );


            // STEP 12: Put the generated reply inside Gmail
            if (composeBox) {

                // Focus on the reply box
                composeBox.focus();

                // Insert the generated reply
                document.execCommand(
                    'insertText',
                    false,
                    generatedReply
                );

            } else {

                // Show an error if the reply box was not found
                console.error('Compose box was not found');
            }


        } catch (error) {

            // STEP 13: Handle any error
            console.error(error);

            // Show a clear, user-friendly error message
            alert(getFriendlyErrorMessage(error));

        } finally {

            // STEP 14: Reset the button after the request finishes
            button.innerHTML = 'AI Reply';

            isReplyInProgress = false;
        }
    });


    // NEW: Create the AI Analyze button
    const analyzeButton = createAnalyzeButton();

    // Add our own class to identify the button
    analyzeButton.classList.add('ai-analyze-button');

    // Tracks whether an Analyze request is already in progress
    // for this button, for the same reason as isReplyInProgress.
    let isAnalyzeInProgress = false;


    // NEW: Decide what happens when AI Analyze is clicked
    analyzeButton.addEventListener('click', async () => {

        if (isAnalyzeInProgress) {
            return;
        }

        isAnalyzeInProgress = true;

        try {

            // Show that AI is analyzing the email
            analyzeButton.innerHTML = 'Analyzing...';


            // Get the email content from Gmail
            const emailContent = getEmailContent();

            // Check if email content was found
            if (!emailContent) {
                alert('Could not find email content');
                return;
            }


            // Send the email to our Spring Boot analysis endpoint
            const response = await fetchWithTimeout(
                `${BACKEND_BASE_URL}/api/email/analyze`,
                {
                    // We are sending data using POST
                    method: 'POST',

                    // Tell the backend that we are sending JSON
                    headers: {
                        'Content-Type': 'application/json',
                    },

                    // Convert our data into JSON format
                    body: JSON.stringify({
                        emailContent: emailContent,
                        tone: "professional"
                    })
                },
                REQUEST_TIMEOUT_MS
            );


            // Check if the backend request was successful
            if (!response.ok) {

                // Get the error message from the backend
                const errorText = await response.text().catch(() => '');

                // Show the actual error in the console
                console.error(
                    'Analysis API Error:',
                    response.status,
                    errorText
                );

                const requestError = new Error('Backend returned an error');
                requestError.code = 'BACKEND_ERROR';
                throw requestError;
            }


            // Get the analysis response as JSON
            const analysis = await response.json();

            // Make sure the backend actually returned a usable
            // analysis object before trying to display it
            if (!analysis || typeof analysis !== 'object') {

                const emptyResponseError = new Error('Invalid response from server');
                emptyResponseError.code = 'EMPTY_RESPONSE';
                throw emptyResponseError;
            }

            // Show the analysis inside Gmail, in this compose window
            showAnalysisBox(analysis, searchRoot);


        } catch (error) {

            // Handle any error
            console.error(error);

            // Show a clear, user-friendly error message
            alert(getFriendlyErrorMessage(error));

        } finally {

            // Reset the button after the request finishes
            analyzeButton.innerHTML = 'AI Analyze';

            isAnalyzeInProgress = false;
        }
    });


    // STEP 15: Add the AI button to the Gmail toolbar
    toolbar.insertBefore(button, toolbar.firstChild);

    // Add the AI Analyze button next to AI Reply
    toolbar.insertBefore(analyzeButton, button.nextSibling);
}


// STEP 16: Watch Gmail for changes
// Gmail creates compose windows dynamically,
// so we need to detect when a new compose window appears.

// Tracks compose containers that already have an injection
// scheduled, so rapid repeated mutations for the same compose
// window (common while Gmail animates it open) don't trigger
// redundant work. injectButton() is idempotent on its own, but
// this avoids doing the work multiple times in the first place.
const scheduledContainers = new WeakSet();

const observer = new MutationObserver((mutations) => {

    // Check every change detected on the Gmail page
    for (const mutation of mutations) {

        // Get the elements that were newly added
        const addedNodes = Array.from(mutation.addedNodes);

        for (const node of addedNodes) {

            if (node.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            // Identify the specific compose window that was
            // added, so buttons can be attached to the correct
            // one instead of always searching the whole document.
            const composeContainer = node.matches(
                '.aDh, .btC, [role="dialog"]'
            )
                ? node
                : node.querySelector('.aDh, .btC, [role="dialog"]');

            if (!composeContainer) {
                continue;
            }

            if (scheduledContainers.has(composeContainer)) {
                continue;
            }

            scheduledContainers.add(composeContainer);

            console.log("Compose Window Detected");

            // Wait 500ms and then add our AI button to this
            // specific compose window
            setTimeout(() => {
                scheduledContainers.delete(composeContainer);
                injectButton(composeContainer);
            }, 500);
        }
    }
});


// STEP 17: Start watching the Gmail page
observer.observe(document.body, {

    // Watch for new elements being added
    childList: true,

    // Also watch elements inside other elements
    subtree: true
});
