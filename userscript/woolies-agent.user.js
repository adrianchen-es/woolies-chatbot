// ==UserScript==
// @name         Woolies Elastic Agent
// @namespace    http://tampermonkey.net/
// @version      2025-09-18
// @description  This is a small agent that demontrates how to use ElasticSearch as a RAG plaform.
// @author       You
// @match        https://www.woolworths.com.au/*
// @match        https://woolworths.com.au/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=woolworths.com.au
// @grant        GM_xmlhttpRequest
// @require      https://unpkg.com/parse-ingredient
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Configuration constants (UPPERCASE_UNDERSCORE)
    const AGENT_NAME = "Elastic AI Agent";
    const MIN_CART_RESULTS = 3;
    const WELCOME_MESSAGE = `Hello I'm your cooking assistant made by Elastic for Woolies.\n I can make suggestions once you have more than ${MIN_CART_RESULTS} items in your cart.`;
    const WOOLIES_GET_CART_URL = "https://www.woolworths.com.au/apis/ui/Trolley";
    const ELASTIC_RECIPES_SEARCH_URL = "https://sandbox-search-genai-e76ccd.es.us-east-1.aws.elastic.cloud/cooking-recipes/_search";
    const COMPLETION_ENDPOINT_URL = "https://sandbox-search-genai-e76ccd.es.us-east-1.aws.elastic.cloud/_inference/completion/azureopenai-completion-63bknfmstid";
    const ELASTIC_API_TOKEN = ""; // <-- ADD YOUR ELASTIC API KEY HERE
    const SEARCH_TOTAL_RESULTS = 3;
    const SEARCH_INGREDIENT_MATCHES = 2;
    const SAVED_CHAT_KEY = 'woolies-chatbot-messages';
    const ENABLE_AGENT_LOGGING = true;
    const MAX_RETRY_ATTEMPTS = 3;
    const RETRY_DELAY_BASE_MS = 1000;

    // CSS for all elements of the Elastic Agent Window
    const elasticAgentCSS = `
        /* Main window */
        #elastic-agent-window {
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            bottom: 0;
            width: 400px;
            height: 600px;
            z-index: 10000;
            overflow: hidden;

            background: #fff;
            border-right: 1px solid #018447;
            border-bottom: none;
            border-left: none;
            border-top-right-radius: 8px;
            box-shadow: 15px 15px rgba(0,0,0,0.3);

            font-family: Roboto, Arial, sans-serif;
            font-size: 15px;
            color: #FFFFFF;
        }

        /* Links */
        #elastic-agent-window a {
            color: #FFFFFF !important;
            font-family: Roboto, Arial, sans-serif;
            font-weight: bold;
            text-decoration: underline !important;
        }

        /* List items */
        #elastic-agent-window li {
            margin-bottom: 8px;
            list-style: none;
            position: relative;
            padding-left: 26px;
            min-height: 20px;
        }

        #elastic-agent-window li::before {
            content: "";
            position: absolute;
            left: 0;
            top: 2px;
            width: 20px;
            height: 20px;
            background-image: url('https://www.google.com/s2/favicons?sz=64&domain=woolworths.com.au');
            background-size: 20px 20px;
            background-repeat: no-repeat;
            display: inline-block;
        }

        /* Header */
        #elastic-agent-window .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;

            background: #018447;
            color: #fff;
            border-top-right-radius: 8px;
            padding: 10px;

            font-weight: bold;
        }

        #elastic-agent-window .header-title {
            flex: 1 1 auto;
        }

        /* Header Buttons */
        #elastic-agent-window .clear-btn,
        #elastic-agent-window .minmax-btn {
            margin-left: auto;
            border-radius: 6px;
            padding: 2px 10px;
            cursor: pointer;
            font-weight: bold;
            background: #fff;
            color: #018447;
            border: 1px solid #018447;
        }

        #elastic-agent-window .minmax-btn {
            margin-left: 8px;
            font-size: 18px;
            display: flex;
            align-items: center;
        }

        /* Content container */
        #elastic-agent-window .content-container {
            padding: 10px;
            flex: 1 1 auto;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        /* Message box */
        #elastic-agent-window .message-box {
            width: 90%;
            margin: 10px auto;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);

            background: #fd6501;

            word-break: break-word;
            font-family: Roboto, Arial, sans-serif;
        }

        /* Error box */
        #elastic-agent-window .error-box {
            width: 90%;
            margin: 10px auto;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);

            background: #fd6501;

            word-break: break-word;
            font-family: Roboto, Arial, sans-serif;
        }

        /* Log content box (for both images and iframes) */
        #elastic-agent-log-content-modal {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;

            background: rgba(0,0,0,0.6);
        }

        #elastic-agent-log-content-modal img,
        #elastic-agent-log-content-modal iframe {
            width: 90vw;
            height: 90vh;
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 4px 32px rgba(0,0,0,0.5);

            background: #fff;
            padding: 16px;
        }

        /* Log message box */
        #elastic-agent-window .log-message-box {
            width: 90%;
            margin: 10px auto;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);

            background: #24bbb1;

            color: #36454F;
            font-family: Roboto, Arial, sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
            word-break: break-word;
        }

        /* Footer */
        #elastic-agent-window .footer {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #018447;
            color: #fff;
            border-bottom-right-radius: 8px;
            padding: 10px;
        }
        #elastic-agent-window .footer-input {
            flex: 1 1 auto;
            border-radius: 6px;
            border: 1px solid #018447;
            padding: 6px 10px;
            font-size: 15px;
            font-family: Roboto, Arial, sans-serif;
        }

        /* Loading indicator styles */
        #elastic-agent-window .loading-box {
            width: 90%;
            margin: 10px auto;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);

            background: #24bbb1;
            color: #36454F;

            font-family: Roboto, Arial, sans-serif;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* Loading spinner */
        #elastic-agent-window .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #36454F;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: elastic-spinner 1s linear infinite;
        }

        @keyframes elastic-spinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Disabled state for input during loading */
        #elastic-agent-window .footer-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #elastic-agent-window .clear-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: #ccc;
            color: #666;
        }
    `;

    // Global variables
    let cartProductNames = [];
    let lastRecipes = [];
    let arrItemsListKeywords;
    let contentContainer;
    let isWindowMinimized = false;
    let welcomeBox;
    let sendBtn;
    let input;

    // --- Helper Functions ---

    // Append a message to the chat window
    function appendMessage(text, className = 'message-box', isHTML = false) {
        const div = document.createElement('div');
        div.className = className;
        if (isHTML) {
            div.innerHTML = text;
        } else {
            div.textContent = text;
        }
        contentContainer.appendChild(div);
        contentContainer.scrollTop = contentContainer.scrollHeight;
        saveChat();
    }

    // Clear all messages and show welcome
    function clearMessages() {
        Array.from(contentContainer.children).forEach(child => contentContainer.removeChild(child));
        contentContainer.appendChild(welcomeBox);
        saveChat();
    }

    // Restore chat from localStorage
    function restoreChat() {
        if (localStorage.getItem(SAVED_CHAT_KEY)) {
            contentContainer.innerHTML = localStorage.getItem(SAVED_CHAT_KEY);
            if (!contentContainer.querySelector('.message-box')) {
                contentContainer.insertBefore(welcomeBox, contentContainer.firstChild);
            }
        }
    }

    // Save chat to localStorage
    function saveChat() {
        if (contentContainer) {
            // Clone the content and remove loading indicators before saving
            const contentClone = contentContainer.cloneNode(true);
            const loadingBoxes = contentClone.querySelectorAll('.loading-box');
            loadingBoxes.forEach(box => box.remove());
            localStorage.setItem(SAVED_CHAT_KEY, contentClone.innerHTML);
        }
    }

    // Retry function for handling failed API calls
    function retryWithBackoff(fn, maxAttempts = MAX_RETRY_ATTEMPTS, baseDelay = RETRY_DELAY_BASE_MS) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            function attempt() {
                attempts++;
                fn()
                    .then(resolve)
                    .catch(error => {
                        if (attempts >= maxAttempts) {
                            reject(error);
                            return;
                        }
                        
                        // Check if it's a retryable error (400, 408 status codes or timeout-related errors)
                        const isRetryable = error.status === 400 || 
                                          error.status === 408 || // Request Timeout
                                          (error.responseText && error.responseText.includes('timeout')) ||
                                          (error.responseText && error.responseText.includes('model'));
                        
                        if (!isRetryable) {
                            reject(error);
                            return;
                        }
                        
                        const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff
                        console.log(`Elastic AI Agent - Retry attempt ${attempts}/${maxAttempts} after ${delay}ms delay`);
                        
                        // Provide specific user feedback based on error type
                        let retryMessage = `Retrying... (${attempts}/${maxAttempts})`;
                        if (error.status === 408) {
                            retryMessage = `Request timed out, retrying... (${attempts}/${maxAttempts})`;
                        } else if (error.status === 400) {
                            retryMessage = `Server busy, retrying... (${attempts}/${maxAttempts})`;
                        }
                        
                        updateLoadingMessage(retryMessage);
                        setTimeout(attempt, delay);
                    });
            }
            
            attempt();
        });
    }

    // Loading indicator functions
    let currentLoadingBox = null;

    function showLoadingIndicator(message = "Loading...") {
        // Remove any existing loading indicator
        hideLoadingIndicator();
        
        // Create loading box
        currentLoadingBox = document.createElement('div');
        currentLoadingBox.className = 'loading-box';
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        // Create message
        const messageText = document.createElement('span');
        messageText.textContent = message;
        
        currentLoadingBox.appendChild(spinner);
        currentLoadingBox.appendChild(messageText);
        
        contentContainer.appendChild(currentLoadingBox);
        contentContainer.scrollTop = contentContainer.scrollHeight;
        
        // Disable input and send button during loading
        if (input) input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        
        return currentLoadingBox;
    }

    function hideLoadingIndicator() {
        if (currentLoadingBox) {
            if (currentLoadingBox.parentNode) {
                currentLoadingBox.parentNode.removeChild(currentLoadingBox);
            }
            currentLoadingBox = null;
        }
        
        // Re-enable input and send button
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    }

    function updateLoadingMessage(message) {
        if (currentLoadingBox) {
            const messageSpan = currentLoadingBox.querySelector('span');
            if (messageSpan) {
                messageSpan.textContent = message;
            }
        }
    }

    // --- API and Business Logic ---

    function buildCartStandardizationPrompt(shoppingCartItems) {
        const joinedCartItems = shoppingCartItems.map(item => item).join('\n- ');
        //console.log(joinedCartItems);
        return `You are provided with a list of grocery items from a customer's shopping cart. Your task is to process this list by performing the following steps:
        - Standardize Item Names: Convert each item name into its generic ingredient name.
        - Remove Specific Details: Eliminate any unnecessary information such as brand names, weights, quantities, or packaging details.
        - Maintain Clarity: Ensure the generic name remains as close as possible to the original item name for clarity.
        - Format Output: Present the cleaned list as a single line of text, with all ingredient names in lowercase and separated by spaces
        - Respond only with the cleaned list, without any additional commentary or formatting.

        The list of items:
        - ${joinedCartItems}
        `;
    }

    function buildCookingAssistantPrompt(recipeIngredients, shoppingCartItems) {
        return `You are a cooking assistant specializing in analyzing recipes and shopping carts to identify missing ingredients.
            Instructions for structuring your answer:
            - When you suggest an ingredient as a replacement or a complement, you always highlight it as a hyperlink (<a> tag with the attribue target="_self") with the following URL attached to the link: https://www.woolworths.com.au/shop/search/products?searchTerm=<ingredient> (replace <ingredient> with the name of the ingredient you just listed).
            - When you suggest an ingredient as a replacement or a complement, also provide a dummy button to add recommended item to the cart. 
            - Do not respond in markdown. Your response must be in HTML format. The response will be inserted in an existing <div> element.
            - Make sure you had new lines (tag <br \>) when it's necessary.
            - The first part of your answer is a mention in bold (use the HTML tag <strong>), to congratulate the customer on selecting a delicious recipe. Keep a casual and funny tone.
            - Try to maximise the usage of the items in the cart.
            - In the first part of your answer, include a note indicating if the recipe is suited to a particular diet (e.g., gluten‑free, vegan, or vegetarian).
            - The second part is a list of all missing ingredients. You can rename the ingredients into something more generic. Keep it short and simple.
            - You'll list only the core ingredients of the recipe. Regroup the basic ingredients (e.g., salt, pepper, etc.) into categories.
            - In the last section of your answer, you'll suggest improvements regarding items that have been selected by the customers.
            - This last section must contains no more than 80 word.

            You will receive for context:
            - A recipe, including its ingredients and preparation steps.
            - A user's shopping cart list.

            Task:
            Compare the shopping cart with the recipe's ingredients and instructions. Provide a clear list of essential missing ingredients that the user needs to purchase to complete the recipe. Acknowledge the ingredients in the cart that can be reused and acknowledge any excess ingredients and suggest alternatives for them.

            Recipe Ingredients:
            ${recipeIngredients.map(ing => `- ${ing}`).join('\n')}

            Shopping Cart Items:
            ${shoppingCartItems.map(item => `- ${item}`).join('\n')}`;
    }

    // Show a log message box (for links, docs, etc.)
    function logMessageBox(message, contentUrl) {
        if (!ENABLE_AGENT_LOGGING || !contentContainer) return;
        const logBox = document.createElement('div');
        logBox.className = 'log-message-box';
        logBox.textContent = `${message}`;
        if (contentUrl) {
            logBox.style.cursor = 'pointer';
            logBox.onclick = function () {
                const oldModal = document.getElementById('elastic-agent-log-content-modal');
                if (oldModal) oldModal.remove();
                const modal = document.createElement('div');
                modal.id = 'elastic-agent-log-content-modal';
                modal.onclick = function () { modal.remove(); };
                if (/\.(jpeg|jpg|gif|png|webp|svg)$/i.test(contentUrl)) {
                    const img = document.createElement('img');
                    img.src = contentUrl;
                    modal.appendChild(img);
                } else {
                    const iframe = document.createElement('iframe');
                    iframe.src = contentUrl;
                    modal.appendChild(iframe);
                }
                document.body.appendChild(modal);
            };
        }
        contentContainer.appendChild(logBox);
        contentContainer.scrollTop = contentContainer.scrollHeight;
        saveChat();
    }

    // --- UI Event Handlers ---

    function handleSendMessage() {
        const message = input.value.trim();
        if (message) {
            appendMessage(message);
            input.value = '';
        }
    }

    function handlePreferenceSend() {
        const preference = input.value.trim();
        if (!preference) return;
        appendMessage(preference);
        input.value = '';
        sendBtn.disabled = true;
        triggerRecipeSearch(preference);
        // Restore default send handler after search
        sendBtn.onclick = handleSendMessage;
        input.onkeydown = function (e) {
            if (e.key === 'Enter') handleSendMessage();
        };
    }

    function triggerRecipeSearch(preference) {
        if (cartProductNames.length >= MIN_CART_RESULTS) {
            // Show loading indicator
            showLoadingIndicator("Searching for recipes...");
            
            let itemListTerms = [];
            arrItemsListKeywords.split(' ').forEach(term => {
                itemListTerms.push(term.trim().toLowerCase());
            });
            itemListTerms = Array.from(new Set(itemListTerms)); // Unique terms
            console.log(`Item List Terms: ${itemListTerms}`);

            // Properly construct the query object
            const query = {
                retriever: {
                    rrf: {
                        retrievers: [
                            {
                                standard: {
                                    query: {
                                        terms_set: {
                                            ingredients_keywords: {
                                                terms: itemListTerms,
                                                minimum_should_match: SEARCH_INGREDIENT_MATCHES
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                standard: {
                                    query: {
                                        semantic: {
                                            field: "chief_review",
                                            query: preference
                                        }
                                    },
                                    _name: "preferences"
                                }
                            }
                        ]
                    }
                },
                size: SEARCH_TOTAL_RESULTS
            };
            console.log(`Query object:`, query);
            
            // Wrap the GM_xmlhttpRequest in a Promise for retry functionality
            const performSearch = () => {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: ELASTIC_RECIPES_SEARCH_URL,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `ApiKey ${ELASTIC_API_TOKEN}`
                        },
                        data: JSON.stringify(query),
                        onload: function (response) {
                            if (response.status === 400 || response.status === 408) {
                                // Reject with status for retry logic
                                reject({ status: response.status, responseText: response.responseText });
                                return;
                            }
                            
                            try {
                                const data = JSON.parse(response.responseText);
                                //logMessageBox('Learn more about Semantic Search', 'https://docs.google.com/presentation/d/e/2PACX-1vQWjI-O0PAAp3eb6mia0lP8dOni6LO5zCQVQGz0HMX7XfoQu5H-OdLeKNt0945XY9yHQkkSU5EX-4sW/pubembed?slide=id.g36e6b177a49_0_264#slide=id.g36e6b177a49_0_264');
                                let recipes = [];
                                if (data.hits && data.hits.hits) {
                                    recipes = data.hits.hits.map((hit, idx) => ({
                                        name: hit._source && hit._source.name ? hit._source.name : "No title",
                                        url: hit._source && hit._source.url ? hit._source.url : "#",
                                        idx,
                                        full: hit._source
                                    }));
                                }
                                resolve({ recipes, data });
                            } catch (e) {
                                reject(e);
                            }
                        },
                        onerror: function (error) {
                            reject(error);
                        }
                    });
                });
            };
            
            // Use retry mechanism for the search
            retryWithBackoff(performSearch)
                .then(({ recipes, data }) => {
                    hideLoadingIndicator();
                    lastRecipes = recipes;
                    const messageBox = document.createElement('div');
                    messageBox.className = 'message-box';
                    if (recipes.length) {
                        messageBox.innerHTML = `The content of your cart looks great! Our top recipes that match your selection:<br><br><ul>` +
                            recipes.map(recipe =>
                                `<li>
                                    <a href="${recipe.url}" class="recipe-link" data-recipe-idx="${recipe.idx}">
                                        ${recipe.name}
                                    </a>
                                </li>`
                            ).join('') +
                            `</ul>`;
                    } else {
                        messageBox.textContent = "No recipes found.";
                        console.log(data);
                    }
                    contentContainer.appendChild(messageBox);
                    contentContainer.scrollTop = contentContainer.scrollHeight;
                    saveChat();
                })
                .catch(error => {
                    hideLoadingIndicator();
                    console.error('Elastic AI Agent - Error after retries:', error);
                    const errorBox = document.createElement('div');
                    errorBox.className = 'error-box';
                    
                    // Provide specific error message based on error type
                    let errorMessage = "Sorry, we're experiencing some technical difficulties. Please try again later.";
                    if (error.status === 408) {
                        errorMessage = "The search request timed out. Please check your connection and try again.";
                    } else if (error.status === 400) {
                        errorMessage = "The search service is currently busy. Please try again in a few moments.";
                    }
                    
                    errorBox.textContent = errorMessage;
                    contentContainer.appendChild(errorBox);
                    contentContainer.scrollTop = contentContainer.scrollHeight;
                    saveChat();
                });
        }
    }

    function updateCartProductNames(itemsWooliesCart) {
        cartProductNames.length = 0;
        cartProductNames.push(...itemsWooliesCart);

        // Only proceed if cart has 3 or more items
        if (cartProductNames.length < 3) {
            return;
        }

        // Show loading indicator for cart processing
        showLoadingIndicator("Processing your cart items...");

        const payload = {
            input: buildCartStandardizationPrompt(cartProductNames)
        };

        // Wrap the cart standardization request in retry logic
        const performCartStandardization = () => {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: COMPLETION_ENDPOINT_URL,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `ApiKey ${ELASTIC_API_TOKEN}`
                    },
                    data: JSON.stringify(payload),
                    onload: function (response) {
                        if (response.status === 400 || response.status === 408) {
                            // Reject with status for retry logic
                            reject({ status: response.status, responseText: response.responseText });
                            return;
                        }
                        
                        try {
                            let outer = JSON.parse(response.responseText);
                            if (typeof outer === 'string') {
                                outer = JSON.parse(outer);
                            }
                            resolve(outer);
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror: function (e) {
                        reject(e);
                    }
                });
            });
        };

        // Use retry mechanism for cart standardization
        retryWithBackoff(performCartStandardization)
            .then(outer => {
                hideLoadingIndicator();
                arrItemsListKeywords = outer?.completion?.[0]?.result;
                if (arrItemsListKeywords) {
                    // Ask for user preference before searching, only if not already shown
                    // Optionally, you can add a flag to avoid showing multiple times in a session
                    console.log(`Array Items: ${arrItemsListKeywords}`)
                    appendMessage("We'd like to recommend you some recipes based on the content of your shopping cart, anything else we should know?");
                    sendBtn.disabled = false;
                    // Temporarily override send button and input for preference
                    sendBtn.onclick = handlePreferenceSend;
                    input.onkeydown = function (e) {
                        if (e.key === 'Enter') handlePreferenceSend();
                    };
                } else {
                    console.warn("Elastic AI Agent - No result found in the cart standardization response.");
                    appendMessage("Sorry, we couldn't process your cart items. Please try adding more items.", 'error-box');
                }
            })
            .catch(e => {
                hideLoadingIndicator();
                console.error('Elastic AI Agent - Error after retries (cart standardization):', e);
                
                // Provide specific error message based on error type
                let errorMessage = "Sorry, there was an error processing your cart. Please try again.";
                if (e.status === 408) {
                    errorMessage = "Cart processing timed out. Please check your connection and try again.";
                } else if (e.status === 400) {
                    errorMessage = "The processing service is currently busy. Please try again in a few moments.";
                }
                
                appendMessage(errorMessage, 'error-box');
            });
    }

    // --- UI Setup ---

    window.addEventListener('load', () => {
        // Inject CSS
        const style = document.createElement('style');
        style.textContent = elasticAgentCSS;
        document.head.appendChild(style);

        // Create Elastic Agent window
        const floatingWindow = document.createElement('div');
        floatingWindow.id = 'elastic-agent-window';

        // Header
        const header = document.createElement('div');
        header.className = 'header';
        const headerTitle = document.createElement('span');
        headerTitle.className = 'header-title';
        headerTitle.textContent = AGENT_NAME;
        header.appendChild(headerTitle);

        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.className = 'clear-btn';
        header.appendChild(clearBtn);

        // Minimize/maximize button
        const minMaxBtn = document.createElement('button');
        minMaxBtn.className = 'minmax-btn';
        minMaxBtn.title = 'Minimize';
        minMaxBtn.innerHTML = '▼';
        header.appendChild(minMaxBtn);

        // Content container
        contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';

        // Footer
        const footer = document.createElement('div');
        footer.className = 'footer';
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'footer-input';
        input.placeholder = 'Type your message...';
        sendBtn = document.createElement('button');
        sendBtn.className = 'clear-btn';
        sendBtn.textContent = 'Send';
        footer.appendChild(input);
        footer.appendChild(sendBtn);

        // Assemble window
        floatingWindow.appendChild(header);
        floatingWindow.appendChild(contentContainer);
        floatingWindow.appendChild(footer);
        document.body.appendChild(floatingWindow);

        // Welcome message
        welcomeBox = document.createElement('div');
        welcomeBox.className = 'message-box';
        welcomeBox.textContent = WELCOME_MESSAGE;
        contentContainer.appendChild(welcomeBox);

        // Restore chat
        restoreChat();

        // Shadow DOM listeners
        function addShadowListeners() {
            document.querySelectorAll('wc-product-tile').forEach(tile => {
                if (tile.shadowRoot && !tile.hasAttribute('shadow-listener-added')) {
                    tile.shadowRoot.addEventListener('click', function (event) {
                        if (event.target.tagName === 'WC-ADD-TO-CART' && event.target.classList.contains('add-to-cart-button')) {
                            setTimeout(() => {
                                fetch(WOOLIES_GET_CART_URL, {
                                    method: 'GET',
                                    headers: { 'Content-Type': 'application/json' }
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.AvailableItems && Array.isArray(data.AvailableItems)) {
                                            let newCartItem = data.AvailableItems.map(item => item.Name)
                                            updateCartProductNames(newCartItem);
                                        }
                                    })
                                    .catch(error => console.error('Elastic AI Agent - Error calling the Woolworths Trolley API::', error));
                            }, 1000);
                        }
                    });
                    tile.setAttribute('shadow-listener-added', 'true');
                }
            });
        }
        addShadowListeners();
        setInterval(addShadowListeners, 1000);

        // Recipe link click handler
        contentContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('recipe-link')) {
                e.preventDefault();
                
                // Show loading indicator for recipe analysis
                showLoadingIndicator("Analyzing recipe and your cart...");
                
                const idx = e.target.getAttribute('data-recipe-idx');
                const recipe = lastRecipes.find(r => r.idx == idx);
                if (recipe && recipe.full) {
                    const payload = {
                        input: buildCookingAssistantPrompt(
                            recipe.full.ingredients || [],
                            cartProductNames
                        )
                    };
                    //logMessageBox('Learn more about RAG architecture', 'https://docs.google.com/presentation/d/e/2PACX-1vQWjI-O0PAAp3eb6mia0lP8dOni6LO5zCQVQGz0HMX7XfoQu5H-OdLeKNt0945XY9yHQkkSU5EX-4sW/pubembed');
                    
                    // Wrap the recipe analysis request in retry logic
                    const performRecipeAnalysis = () => {
                        return new Promise((resolve, reject) => {
                            GM_xmlhttpRequest({
                                method: 'POST',
                                url: COMPLETION_ENDPOINT_URL,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `ApiKey ${ELASTIC_API_TOKEN}`
                                },
                                data: JSON.stringify(payload),
                                onload: function (response) {
                                    if (response.status === 400 || response.status === 408) {
                                        // Reject with status for retry logic
                                        reject({ status: response.status, responseText: response.responseText });
                                        return;
                                    }
                                    
                                    try {
                                        let outer = JSON.parse(response.responseText);
                                        if (typeof outer === 'string') {
                                            outer = JSON.parse(outer);
                                        }
                                        resolve(outer);
                                    } catch (e) {
                                        reject(e);
                                    }
                                },
                                onerror: function (e) {
                                    reject(e);
                                }
                            });
                        });
                    };
                    
                    // Use retry mechanism for recipe analysis
                    retryWithBackoff(performRecipeAnalysis)
                        .then(outer => {
                            hideLoadingIndicator();
                            const resultText = outer?.completion?.[0]?.result;
                            if (resultText) {
                                appendMessage(resultText, 'message-box', true);
                            } else {
                                appendMessage("No result found in the response.", 'error-box');
                            }
                            saveChat();
                        })
                        .catch(e => {
                            hideLoadingIndicator();
                            console.error('Elastic AI Agent - Error after retries (recipe analysis):', e);
                            
                            // Provide specific error message based on error type
                            let errorMessage = "Sorry, there was an error processing the recipe analysis.";
                            if (e.status === 408) {
                                errorMessage = "Recipe analysis timed out. Please check your connection and try again.";
                            } else if (e.status === 400) {
                                errorMessage = "The analysis service is currently busy. Please try again in a few moments.";
                            }
                            
                            appendMessage(errorMessage, 'error-box');
                            saveChat();
                        });
                } else {
                    hideLoadingIndicator();
                    appendMessage("Recipe information not available.", 'error-box');
                    saveChat();
                }
            }
        });

        // Send message handler
        sendBtn.onclick = handleSendMessage;
        input.onkeydown = function (e) {
            if (e.key === 'Enter') handleSendMessage();
        };

        // Clear button handler
        clearBtn.onclick = clearMessages;

        // Minimize/maximize handler
        minMaxBtn.onclick = function () {
            isWindowMinimized = !isWindowMinimized;
            if (isWindowMinimized) {
                contentContainer.style.display = 'none';
                footer.style.display = 'none';
                minMaxBtn.title = 'Maximize';
                minMaxBtn.innerHTML = '▲';
                floatingWindow.style.height = 'auto';
            } else {
                contentContainer.style.display = '';
                footer.style.display = '';
                minMaxBtn.title = 'Minimize';
                minMaxBtn.innerHTML = '▼';
                floatingWindow.style.height = '';
            }
        };

        // On load, make sure footer is visible
        footer.style.display = '';
    });
})();
