# The Woolies Chatbot demo
This repository contains the demo scripts used for the chatbot demonstration during APEX 2025 in Chicago.
This is a short demonstration of a RAG architecture built with Elastic.
The core of the demo is a [Userscript](https://en.wikipedia.org/wiki/Userscript) module, which lets you manipulate the page's DOM, capture user events, and inject JavaScript snippets.

| Info         | Description                                                                     |
|--------------|---------------------------------------------------------------------------------|
| __Title__    | Hybrid search and RAG for Ecommerce platform                                    |
| __Duration__ | 10 minutes max                                                                  |
| __Audience__ | Technical and non-technical                                                     |
| __Personas__ |                                                                                 |
| __Products__ | Search and GenAI capabilities                                                   |
| __Features__ | Hybrid search, vectorization, LLM integration                                   |

<picture>
  <source srcset="/assets/screenshot.png" media="(max-width:100px)" />
  <img alt="Screenshot of Woolies chatbot" src="/assets/screenshot.png" width="80%">
</picture>

## Demo flow

1. Browse the [Woolworths website](https://www.woolworths.com.au) and add at least three products to your shopping cart.
2. After adding the third item, the script prompts the customer for additional preferences (e.g., “I have a preference for gluten‑free recipes”).
3. A hybrid search is triggered, combining your preference (via vector embedding) and the shopping cart contents (via lexical matching).
4. Elastic returns a list of three recipes, which are displayed to the customer.
5. Once the customer selects a recipe, both the recipe details and the shopping cart contents are sent to an LLM.
6. The LLM then provides guidance and additional suggestions (e.g., “You’re missing key ingredients,” “Swap this product for a healthier option,” etc.).

![Demo flow](/assets/demo-flow.svg)

## Pre-requisites
- The Violentmonkey (or Tempermonkey, Greasemonkey) extension installed (tested on Chrome).
- An Elastic Serverless account.
- An Azure OpenAI inference endpoint configured for completion.

## Installing the demo
The following steps describe how to build and deploy the demo in your envrionment.

### Create the indice
The indice must have a spcific mapping that include keyword and semantic fields. The definition of the mapping is included in the ./data folder.

### Load the data
You’ll first need to load the recipes into a new index. A Python loader script is included in this repository.

#### Loader dependencies
You need to install the dependencies for the loader script. It is recommended to use a virtual environment.
```sh
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
python -m pip install ingredient-parser-nlp
python -m pip install elasticsearch==8.19.1  
```

#### Execute the loader

```sh
python ./python/loader.py --index cooking-recipes ./data/cooking-recipes.json
```

### Configure the script
You need to edit the Userscript module and configure the following variables at the top of the script.
```js
const MIN_CART_RESULTS = 3; // Minimum number of items in the cart to trigger the prompt
const ELASTIC_RECIPES_SEARCH_URL = "https://xxxxx.es.us-east-1.aws.elastic.cloud/cooking-recipes/_search"; // Search endpoint for the cooking-recipes indice
const COMPLETION_ENDPOINT_URL = "https://xxxxx.es.us-east-1.aws.elastic.cloud/_inference/completion/azureopenai-completion-63bknfmstid"; // Inference endpoint for the completion task
const ELASTIC_API_TOKEN = ""; // Elastic API token
const SEARCH_TOTAL_RESULTS = 3; // Number of recipes the search will return
const SEARCH_INGREDIENT_MATCHES = 2; // Number of ingredients from the cart to include in the search query
 ```

### Install the script in Violentmonkey
You can create a new script in Violentmonkey and paste the content of the `woolies-agent.user.js` file. If you need more details refer to the Violentmonkey [documentation](https://violentmonkey.github.io).
 
## Limitations
The current search query is basic and can definitely be improved to increase the relevancy of the results.

Currently, this script only works with the [Woolworths website](https://www.woolworths.com.au). However, it can be adapted for other e‑commerce grocery websites by making a few adjustments:
- Updating the DOM selectors for various elements (e.g., the “Add to Cart” button, product names, etc.)
- Identifying the API endpoint that returns the current contents of the shopping cart

If you're not comfortable diving deep into JavaScript, you can still update the script using GitHub Copilot and well-crafted prompts.