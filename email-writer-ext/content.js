// STEP 1: Check that the extension content script has loaded
console.log("Email Writer Extension - Content Script Loaded");


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

    // Gmail can use different HTML elements for email content
    const selectors = [
        '.h7',
        '.a3s.aiL',
        '.gmail_quote',
        '[role="presentation"]'
    ];

    // Try each selector one by one
    for (const selector of selectors) {

        // Find an element using the current selector
        const content = document.querySelector(selector);

        // If we find the email content, return it
        if (content) {
            return content.innerText.trim();
        }
    }

    // If no selector finds the email, return an empty string
    return '';
}


// STEP 4: Find Gmail's compose toolbar
function findComposeToolbar() {

    // Gmail can use different elements for the compose toolbar
    const selectors = [
        '.btC',
        '.aDh',
        '[role="toolbar"]',
        '.gU.Up'
    ];

    // Try each selector one by one
    for (const selector of selectors) {

        // Find the toolbar using the current selector
        const toolbar = document.querySelector(selector);

        // If toolbar is found, return it
        if (toolbar) {
            return toolbar;
        }
    }

    // If toolbar is not found, return null
    return null;
}


// NEW: Create the analysis box
function createAnalysisBox(analysis) {

    // Remove old analysis box if it already exists
    const oldBox = document.querySelector('.ai-analysis-box');

    if (oldBox) {
        oldBox.remove();
    }

    // Create a new HTML div element
    const box = document.createElement('div');

    // Add our own class to identify the box
    box.className = 'ai-analysis-box';

    // Add styling to make the analysis look like a clean card
    box.style.background = '#ffffff';
    box.style.border = '1px solid #dadce0';
    box.style.borderRadius = '10px';
    box.style.padding = '16px';
    box.style.margin = '10px 8px';
    box.style.fontFamily = 'Arial, sans-serif';
    box.style.fontSize = '14px';
    box.style.lineHeight = '1.5';
    box.style.maxWidth = '620px';
    box.style.boxShadow = '0 1px 3px rgba(60,64,67,0.15)';

    // Get the priority value
    const priority = analysis.priority || 'LOW';

    // Get the category value
    const category = analysis.category || 'OTHER';

    // Decide the style for the priority badge
    let priorityBackground = '#f1f3f4';
    let priorityText = '#3c4043';

    if (priority === 'HIGH') {
        priorityBackground = '#fce8e6';
        priorityText = '#c5221f';
    } else if (priority === 'MEDIUM') {
        priorityBackground = '#fef7e0';
        priorityText = '#b06000';
    }

    // Decide the style for the category badge
    const categoryBackground = '#e8f0fe';
    const categoryText = '#1967d2';

    // Display the AI analysis
    box.innerHTML = `
        <div style="
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 14px;
            color: #202124;
        ">
            ✨ AI Email Analysis
        </div>

        <div style="
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        ">

            <span style="
                background: ${categoryBackground};
                color: ${categoryText};
                padding: 5px 10px;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 600;
            ">
                ${category}
            </span>

            <span style="
                background: ${priorityBackground};
                color: ${priorityText};
                padding: 5px 10px;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 600;
            ">
                ${priority} PRIORITY
            </span>

        </div>


        <div style="
            margin-bottom: 14px;
        ">
            <div style="
                font-weight: 600;
                color: #202124;
                margin-bottom: 4px;
            ">
                Summary
            </div>

            <div style="color: #5f6368;">
                ${analysis.summary || 'No summary available'}
            </div>
        </div>


        <div style="
            border-top: 1px solid #e8eaed;
            padding-top: 12px;
            margin-bottom: 14px;
        ">
            <div style="
                font-weight: 600;
                color: #202124;
                margin-bottom: 4px;
            ">
                Action
            </div>

            <div style="color: #5f6368;">
                ${analysis.actionRequired
                    ? '✓ ' + (analysis.action || 'Action required')
                    : '✓ No action required'}
            </div>
        </div>


        <div style="
            border-top: 1px solid #e8eaed;
            padding-top: 12px;
            margin-bottom: 14px;
        ">
            <div style="
                font-weight: 600;
                color: #202124;
                margin-bottom: 4px;
            ">
                Deadline
            </div>

            <div style="color: #5f6368;">
                ${analysis.deadline || 'No deadline'}
            </div>
        </div>


        <div style="
            border-top: 1px solid #e8eaed;
            padding-top: 12px;
        ">
            <div style="
                font-weight: 600;
                color: #202124;
                margin-bottom: 6px;
            ">
                Suggested Reply
            </div>

            <div style="
                background: #f8f9fa;
                border: 1px solid #e8eaed;
                border-radius: 6px;
                padding: 10px;
                color: #3c4043;
            ">
                ${analysis.reply || 'No reply generated'}
            </div>
        </div>
    `;

    return box;
}


// NEW: Show the analysis box inside Gmail
function showAnalysisBox(analysis) {

    // Find the Gmail compose toolbar
    const toolbar = findComposeToolbar();

    // If toolbar is not found, stop here
    if (!toolbar) {
        console.log("Toolbar not found for analysis");
        return;
    }

    // Create the analysis box
    const box = createAnalysisBox(analysis);

    // Add the analysis box before the toolbar
    toolbar.parentElement.insertBefore(box, toolbar);
}


// STEP 5: Add the AI button to Gmail
function injectButton() {

    // Check whether our AI button already exists
    const existingButton = document.querySelector('.ai-reply-button');

    // Remove the old button to prevent duplicate buttons
    if (existingButton) {
        existingButton.remove();
    }

    // Remove old analyze button to prevent duplicate buttons
    const existingAnalyzeButton = document.querySelector('.ai-analyze-button');

    if (existingAnalyzeButton) {
        existingAnalyzeButton.remove();
    }


    // Find Gmail's compose toolbar
    const toolbar = findComposeToolbar();

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


    // STEP 6: Decide what happens when AI Reply is clicked
    button.addEventListener('click', async () => {

        try {

            // Show that AI is generating the reply
            button.innerHTML = 'Generating...';

            // Disable the button while request is running
            button.disabled = true;


            // STEP 7: Get the email content from Gmail
            const emailContent = getEmailContent();


            // STEP 8: Send the email to our Spring Boot backend
            const response = await fetch(
                'http://localhost:8080/api/email/generate',
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
                }
            );


            // STEP 9: Check if the backend request was successful
            if (!response.ok) {
                throw new Error('API Request Failed');
            }


            // STEP 10: Get the AI-generated reply from the backend
            const generatedReply = await response.text();


            // STEP 11: Find Gmail's reply/compose text box
            const composeBox = document.querySelector(
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

            // Show an error message to the user
            alert('Failed to generate reply');

        } finally {

            // STEP 14: Reset the button after the request finishes
            button.innerHTML = 'AI Reply';

            // Enable the button again
            button.disabled = false;
        }
    });


    // NEW: Create the AI Analyze button
    const analyzeButton = createAnalyzeButton();

    // Add our own class to identify the button
    analyzeButton.classList.add('ai-analyze-button');


    // NEW: Decide what happens when AI Analyze is clicked
    analyzeButton.addEventListener('click', async () => {

        try {

            // Show that AI is analyzing the email
            analyzeButton.innerHTML = 'Analyzing...';

            // Disable the button while request is running
            analyzeButton.disabled = true;


            // Get the email content from Gmail
            const emailContent = getEmailContent();

            // Check if email content was found
            if (!emailContent) {
                alert('Could not find email content');
                return;
            }


            // Send the email to our Spring Boot analysis endpoint
            const response = await fetch(
                'http://localhost:8080/api/email/analyze',
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
                }
            );


            // Check if the backend request was successful
            if (!response.ok) {

                // Get the error message from the backend
                const errorText = await response.text();

                // Show the actual error in the console
                console.error(
                    'Analysis API Error:',
                    response.status,
                    errorText
                );

                throw new Error(
                    `Analysis API Request Failed: ${response.status}`
                );
            }


            // Get the analysis response as JSON
            const analysis = await response.json();

            // Show the analysis inside Gmail
            showAnalysisBox(analysis);


        } catch (error) {

            // Handle any error
            console.error(error);

            // Show an error message to the user
            alert('Failed to analyze email');

        } finally {

            // Reset the button after the request finishes
            analyzeButton.innerHTML = 'AI Analyze';

            // Enable the button again
            analyzeButton.disabled = false;
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
const observer = new MutationObserver((mutations) => {

    // Check every change detected on the Gmail page
    for (const mutation of mutations) {

        // Get the elements that were newly added
        const addedNodes = Array.from(mutation.addedNodes);


        // Check whether a compose-related element was added
        const hasComposeElements = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (
                node.matches('.aDh, .btC, [role="dialog"]') ||
                node.querySelector(
                    '.aDh, .btC, [role="dialog"]'
                )
            )
        );


        // If a compose window is detected
        if (hasComposeElements) {

            console.log("Compose Window Detected");

            // Wait 500ms and then add our AI button
            setTimeout(injectButton, 500);
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