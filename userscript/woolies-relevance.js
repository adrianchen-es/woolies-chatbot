// ==UserScript==
// @name         Woolies Relevance Tweak
// @namespace    http://tampermonkey.net/
// @version      2025-09-17
// @description  This is a small script to demonstrate what it could look like when previous purchases are promoted
// @author       You
// @match        https://www.woolworths.com.au/shop/search*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=woolworths.com.au
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Global counter to track labels added per page session
    let globalAddedCount = 0;
    const maxLabelsPerPage = 4; // Only label the first 3-4 items per page

    // Track which products have been modified to avoid double-labeling
    let modifiedProducts = new Set();

    // Reset counter when page changes (detect URL changes)
    let currentURL = window.location.href;
    function checkForURLChange() {
        if (window.location.href !== currentURL) {
            currentURL = window.location.href;
            globalAddedCount = 0; // Reset counter for new page
            modifiedProducts.clear(); // Reset product tracking
            console.log('Woolies Relevance: URL changed, reset label counter and product tracking');
        }
    }

    // Function to add "Purchased Before" text to products with roundel images
    function addPurchasedBeforeText() {
        try {
            // Check if document and body exist before proceeding
            if (!document || !document.body) {
                return 0;
            }

            // Check for URL changes and reset counter if needed
            checkForURLChange();

            // If we've already reached the maximum labels for this page, don't add more
            if (globalAddedCount >= maxLabelsPerPage) {
                return 0;
            }

            let localAddedCount = 0;

            // Primary approach: Get all product tile containers that might have shadow DOM
            const productContainers = document.querySelectorAll("#search-content > div > div > wow-product-search-container > shared-grid > div > div > shared-product-tile > shared-web-component-wrapper > wc-product-tile");

            productContainers.forEach(container => {
                try {
                    if (container && container.shadowRoot) {
                        // Generate a unique identifier for this product container using available attributes
                        let productId = '';

                        // Try to find a product URL, SKU, or other unique identifier
                        const productLink = container.shadowRoot.querySelector('a[href*="/product/"]');
                        if (productLink && productLink.href) {
                            productId = productLink.href; // Use product URL as unique ID
                        } else {
                            // Fallback: Use container position in the list
                            const containerIndex = Array.from(productContainers).indexOf(container);
                            productId = `shadow-container-${containerIndex}`;
                        }

                        // Skip if this product has already been modified by promoted text update
                        if (modifiedProducts.has(productId)) {
                            return;
                        }

                        // Look for roundel images within the shadow DOM
                        const roundelElements = container.shadowRoot.querySelectorAll('div.roundel-image, .product-tile-group.left .roundel-image, [class*="roundel"]');

                        roundelElements.forEach(roundelElement => {
                            try {
                                // Stop if we've already added enough labels globally
                                if (globalAddedCount >= maxLabelsPerPage) {
                                    return;
                                }

                                // Check if roundel element exists and has appropriate roundel content
                                if (roundelElement && !roundelElement.hasAttribute('purchased-before-added')) {
                                    // Look for title container within the same shadow DOM
                                    const titleContainer = container.shadowRoot.querySelector('.product-title-container, .product-title, [class*="title"]');

                                    if (titleContainer && !titleContainer.querySelector('.purchased-before-indicator')) {
                                        // Create the purchased before indicator
                                        const purchasedIndicator = document.createElement('div');
                                        purchasedIndicator.className = 'purchased-before-indicator';
                                        purchasedIndicator.innerHTML = '<strong>Purchased before</strong>';
                                        purchasedIndicator.style.cssText = 'color: #0c7c3c; font-size: 12px; font-weight: bold; margin-top: 4px;';

                                        // Add the indicator to the title container
                                        titleContainer.appendChild(purchasedIndicator);
                                        roundelElement.setAttribute('purchased-before-added', 'true');
                                        modifiedProducts.add(productId); // Mark this product as modified
                                        localAddedCount++;
                                        globalAddedCount++;
                                        console.log('Added "Purchased Before" text to product with roundel (shadow DOM):', roundelElement);
                                    }
                                }
                            } catch (roundelError) {
                                console.debug('Woolies Relevance: Individual roundel processing error (non-critical):', roundelError.message);
                            }
                        });
                    }
                } catch (containerError) {
                    console.debug('Woolies Relevance: Container processing error (non-critical):', containerError.message);
                }
            });

            // Fallback: Also check for roundel elements in regular DOM (non-shadow DOM products)
            const regularRoundelElements = document.querySelectorAll('section > div > div.product-tile-group.left > div.roundel-image');

            regularRoundelElements.forEach((roundelElement, index) => {
                try {
                    // Stop if we've already added enough labels globally
                    if (globalAddedCount >= maxLabelsPerPage) {
                        return;
                    }

                    // Generate a unique identifier for this product using available attributes
                    let productId = '';
                    const productTile = roundelElement.closest('section');

                    if (productTile) {
                        // Try to find a product URL or unique identifier
                        const productLink = productTile.querySelector('a[href*="/product/"]');
                        if (productLink && productLink.href) {
                            productId = productLink.href; // Use product URL as unique ID
                        } else {
                            // Fallback: Use element position in the list
                            productId = `regular-roundel-${index}`;
                        }
                    } else {
                        productId = `roundel-only-${index}`;
                    }

                    // Skip if this product has already been modified by promoted text update
                    if (modifiedProducts.has(productId)) {
                        return;
                    }

                    // Check if roundel element exists and has a div.product-tile-roundel-image child
                    if (roundelElement) {
                        const roundelImageDiv = roundelElement.querySelector('div.product-tile-roundel-image');

                        if (roundelImageDiv && !roundelElement.hasAttribute('purchased-before-added')) {
                            // Find the product tile container to add the "Purchased Before" text
                            if (productTile) {
                                // Look for a suitable location to add the text (near the title area)
                                const titleContainer = productTile.querySelector('div.product-title-container');

                                if (titleContainer && !titleContainer.querySelector('.purchased-before-indicator')) {
                                    // Create the purchased before indicator
                                    const purchasedIndicator = document.createElement('div');
                                    purchasedIndicator.className = 'purchased-before-indicator';
                                    purchasedIndicator.innerHTML = '<strong>Purchased before</strong>';
                                    purchasedIndicator.style.cssText = 'color: #0c7c3c; font-size: 12px; font-weight: bold; margin-top: 4px;';

                                    // Add the indicator to the title container
                                    titleContainer.appendChild(purchasedIndicator);
                                    roundelElement.setAttribute('purchased-before-added', 'true');
                                    modifiedProducts.add(productId); // Mark this product as modified
                                    localAddedCount++;
                                    globalAddedCount++;
                                    console.log('Added "Purchased Before" text to product with roundel (regular DOM):', roundelElement);
                                }
                            }
                        }
                    }
                } catch (elementError) {
                    // Silently handle individual element errors to prevent console spam
                    console.debug('Woolies Relevance: Regular roundel element processing error (non-critical):', elementError.message);
                }
            });

            if (localAddedCount > 0) {
                console.log(`Added "Purchased Before" text to ${localAddedCount} products with roundel images (Total: ${globalAddedCount})`);
            }

            return localAddedCount;
        } catch (error) {
            // Silently handle errors to prevent console spam during page load
            console.debug('Woolies Relevance: addPurchasedBeforeText error (non-critical):', error.message);
            return 0;
        }
    }

    // Combined function to update promoted text and add purchased before indicators
    function updateAllPurchaseIndicators() {
        try {
            addPurchasedBeforeText();
        } catch (error) {
            console.debug('Woolies Relevance: updateAllPurchaseIndicators error (non-critical):', error.message);
        }
    }

    // Wait for DOM to be ready
    function waitForDOM() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initScript);
        } else {
            initScript();
        }
    }

    function initScript() {
        console.log('Woolies Relevance Tweak: Initializing...');

        // Ensure document.body exists before proceeding
        if (!document.body) {
            console.debug('Woolies Relevance: Document body not ready, retrying...');
            setTimeout(initScript, 100);
            return;
        }

        // Initial check after a delay for lazy content
        setTimeout(() => {
            updateAllPurchaseIndicators();
        }, 2000);

        // Set up MutationObserver to watch for new content
        const observer = new MutationObserver(function(mutations) {
            try {
                let shouldUpdate = false;

                mutations.forEach(function(mutation) {
                    try {
                        // Check if new nodes were added
                        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(function(node) {
                                try {
                                    // Check if it's an element and contains product-related classes or promoted text
                                    if (node && node.nodeType === Node.ELEMENT_NODE) {
                                        if (node.querySelector && (
                                            node.classList && node.classList.contains('product-tile') ||
                                            node.querySelector('[class*="product"]') ||
                                            node.querySelector('[class*="tile"]') ||
                                            (node.textContent && node.textContent.includes('Promoted'))
                                        )) {
                                            shouldUpdate = true;
                                        }
                                    }
                                } catch (nodeError) {
                                    // Silently handle node processing errors
                                    console.debug('Woolies Relevance: Node processing error (non-critical):', nodeError.message);
                                }
                            });
                        }
                    } catch (mutationError) {
                        // Silently handle mutation processing errors
                        console.debug('Woolies Relevance: Mutation processing error (non-critical):', mutationError.message);
                    }
                });

                if (shouldUpdate) {
                    console.log('New content detected, updating purchase indicators...');
                    // Small delay to ensure content is fully rendered
                    setTimeout(updateAllPurchaseIndicators, 100);
                }
            } catch (observerError) {
                // Silently handle observer errors
                console.debug('Woolies Relevance: Observer error (non-critical):', observerError.message);
            }
        });

        try {
            // Start observing with comprehensive options for lazy loading
            observer.observe(document.body, {
                childList: true,      // Watch for added/removed children
                subtree: true,        // Watch entire subtree
                attributes: false,    // Don't watch attribute changes
                attributeOldValue: false,
                characterData: false,
                characterDataOldValue: false
            });
        } catch (observeError) {
            console.debug('Woolies Relevance: Failed to start observer (non-critical):', observeError.message);
        }

        // Backup periodic check every 10 seconds for any missed updates
        setInterval(() => {
            updateAllPurchaseIndicators();
        }, 10000);

        // Watch for scroll events (common trigger for lazy loading)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                updateAllPurchaseIndicators();
            }, 500);
        }, { passive: true });

        // Watch for page visibility changes (tab switching can trigger lazy loading)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                setTimeout(updateAllPurchaseIndicators, 1000);
            }
        });

        console.log('Woolies Relevance Tweak: Initialization complete');
    }

    // Start the script
    waitForDOM();
})();