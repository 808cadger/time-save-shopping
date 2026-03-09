import os
import json
import httpx
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

load_dotenv()

app = FastAPI(title="time~save~shopping AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
GOOGLE_PLACES_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

# ── Store chain registry ───────────────────────────────────────────────────────

STORE_CHAINS: dict[str, dict] = {
    "walmart": {
        "display_name": "Walmart",
        "website": "https://www.walmart.com",
        "search_url": "https://www.walmart.com/search?q={item}",
        "order_url": "https://www.walmart.com/search?q={item}",
        "logo_emoji": "🟦",
        "color": "#0071DC",
        "has_online_order": True,
        "app_scheme": "walmart://",
    },
    "kroger": {
        "display_name": "Kroger",
        "website": "https://www.kroger.com",
        "search_url": "https://www.kroger.com/search?query={item}",
        "order_url": "https://www.kroger.com/search?query={item}&searchType=default_search",
        "logo_emoji": "🔵",
        "color": "#003087",
        "has_online_order": True,
        "app_scheme": "kroger://",
    },
    "safeway": {
        "display_name": "Safeway",
        "website": "https://www.safeway.com",
        "search_url": "https://www.safeway.com/shop/search-results.html?q={item}",
        "order_url": "https://www.safeway.com/shop/search-results.html?q={item}",
        "logo_emoji": "🔴",
        "color": "#CC0000",
        "has_online_order": True,
        "app_scheme": "safeway://",
    },
    "whole foods": {
        "display_name": "Whole Foods Market",
        "website": "https://www.wholefoodsmarket.com",
        "search_url": "https://www.wholefoodsmarket.com/search?text={item}",
        "order_url": "https://www.amazon.com/s?k={item}&rh=n%3A16310101",
        "logo_emoji": "🟢",
        "color": "#00674B",
        "has_online_order": True,
        "app_scheme": "wholefoods://",
    },
    "target": {
        "display_name": "Target",
        "website": "https://www.target.com",
        "search_url": "https://www.target.com/s?searchTerm={item}",
        "order_url": "https://www.target.com/s?searchTerm={item}&category=grocery",
        "logo_emoji": "🎯",
        "color": "#CC0000",
        "has_online_order": True,
        "app_scheme": "target://",
    },
    "publix": {
        "display_name": "Publix",
        "website": "https://www.publix.com",
        "search_url": "https://www.publix.com/shop/search?query={item}",
        "order_url": "https://www.instacart.com/publix/search/{item}",
        "logo_emoji": "🟩",
        "color": "#007E33",
        "has_online_order": True,
        "app_scheme": "publix://",
    },
    "costco": {
        "display_name": "Costco",
        "website": "https://www.costco.com",
        "search_url": "https://www.costco.com/CatalogSearch?keyword={item}",
        "order_url": "https://www.costco.com/CatalogSearch?keyword={item}",
        "logo_emoji": "🔵",
        "color": "#005DAA",
        "has_online_order": True,
        "app_scheme": "costco://",
    },
    "aldi": {
        "display_name": "ALDI",
        "website": "https://www.aldi.us",
        "search_url": "https://www.aldi.us/en/grocery-finds/?q={item}",
        "order_url": "https://www.aldi.us/en/grocery-finds/?q={item}",
        "logo_emoji": "🟦",
        "color": "#00599A",
        "has_online_order": False,
        "app_scheme": None,
    },
    "heb": {
        "display_name": "H-E-B",
        "website": "https://www.heb.com",
        "search_url": "https://www.heb.com/search/?q={item}",
        "order_url": "https://www.heb.com/search/?q={item}",
        "logo_emoji": "🔴",
        "color": "#CC0000",
        "has_online_order": True,
        "app_scheme": "heb://",
    },
    "trader joe's": {
        "display_name": "Trader Joe's",
        "website": "https://www.traderjoes.com",
        "search_url": "https://www.traderjoes.com/home/products/pdp/{item}",
        "order_url": "https://www.traderjoes.com/home/products",
        "logo_emoji": "🌺",
        "color": "#CC0000",
        "has_online_order": False,
        "app_scheme": None,
        "note": "Trader Joe's does not offer online ordering. Items available in-store only.",
    },
    "food lion": {
        "display_name": "Food Lion",
        "website": "https://www.foodlion.com",
        "search_url": "https://www.foodlion.com/search/?q={item}",
        "order_url": "https://shop.foodlion.com/search?q={item}",
        "logo_emoji": "🦁",
        "color": "#C8102E",
        "has_online_order": True,
        "app_scheme": None,
    },
    "meijer": {
        "display_name": "Meijer",
        "website": "https://www.meijer.com",
        "search_url": "https://www.meijer.com/shopping/search.html?text={item}",
        "order_url": "https://www.meijer.com/shopping/search.html?text={item}",
        "logo_emoji": "🟡",
        "color": "#E31837",
        "has_online_order": True,
        "app_scheme": None,
    },
    "instacart": {
        "display_name": "Instacart (any store)",
        "website": "https://www.instacart.com",
        "search_url": "https://www.instacart.com/products/search/{item}",
        "order_url": "https://www.instacart.com/products/search/{item}",
        "logo_emoji": "🛒",
        "color": "#43B02A",
        "has_online_order": True,
        "app_scheme": "instacart://",
    },
}

CHAIN_KEYWORDS = {
    "walmart": "walmart",
    "kroger": "kroger",
    "safeway": "safeway",
    "whole foods": "whole foods",
    "target": "target",
    "publix": "publix",
    "costco": "costco",
    "aldi": "aldi",
    "h-e-b": "heb",
    "heb": "heb",
    "trader joe": "trader joe's",
    "food lion": "food lion",
    "meijer": "meijer",
}

# ── Mock in-store inventory (used when inside a detected store) ────────────────

STORE_INVENTORY = {
    "apples":       {"aisle": "2",  "section": "Produce",       "in_stock": True,  "price": 1.29},
    "bananas":      {"aisle": "2",  "section": "Produce",       "in_stock": True,  "price": 0.59},
    "milk":         {"aisle": "5",  "section": "Dairy",         "in_stock": True,  "price": 3.49},
    "eggs":         {"aisle": "5",  "section": "Dairy",         "in_stock": True,  "price": 4.99},
    "bread":        {"aisle": "7",  "section": "Bakery",        "in_stock": True,  "price": 2.99},
    "butter":       {"aisle": "5",  "section": "Dairy",         "in_stock": False, "price": 4.49},
    "chicken":      {"aisle": "3",  "section": "Meat",          "in_stock": True,  "price": 8.99},
    "pasta":        {"aisle": "8",  "section": "Dry Goods",     "in_stock": True,  "price": 1.79},
    "tomato sauce": {"aisle": "8",  "section": "Dry Goods",     "in_stock": True,  "price": 2.29},
    "orange juice": {"aisle": "6",  "section": "Beverages",     "in_stock": True,  "price": 4.99},
    "coffee":       {"aisle": "6",  "section": "Beverages",     "in_stock": False, "price": 9.99},
    "yogurt":       {"aisle": "5",  "section": "Dairy",         "in_stock": True,  "price": 1.49},
    "cheese":       {"aisle": "5",  "section": "Dairy",         "in_stock": True,  "price": 5.99},
    "spinach":      {"aisle": "2",  "section": "Produce",       "in_stock": True,  "price": 3.49},
    "cereal":       {"aisle": "9",  "section": "Dry Goods",     "in_stock": True,  "price": 4.29},
    "soap":         {"aisle": "12", "section": "Personal Care", "in_stock": True,  "price": 2.99},
    "shampoo":      {"aisle": "12", "section": "Personal Care", "in_stock": True,  "price": 5.99},
    "toilet paper": {"aisle": "11", "section": "Household",     "in_stock": True,  "price": 8.99},
}

NEARBY_STORES = [
    {"name": "FreshMart Downtown",   "distance": "0.8 miles", "address": "123 Main St"},
    {"name": "Value Grocers",        "distance": "1.2 miles", "address": "456 Oak Ave"},
    {"name": "Super Savings Market", "distance": "2.1 miles", "address": "789 Elm Blvd"},
]

AISLE_MAP = {
    "1": "Entrance / Floral",   "2": "Produce",
    "3": "Meat & Seafood",      "4": "Deli",
    "5": "Dairy & Eggs",        "6": "Beverages",
    "7": "Bakery",              "8": "Dry Goods / Canned",
    "9": "Cereal & Breakfast",  "10": "Frozen Foods",
    "11": "Household Supplies", "12": "Personal Care",
}

# ── Google Places store identification ────────────────────────────────────────

async def identify_store_from_gps(lat: float, lng: float) -> dict | None:
    """Query Google Places API to find the grocery store at given coordinates."""
    if not GOOGLE_PLACES_KEY:
        return None

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": 100,
        "type": "grocery_or_supermarket|supermarket|food",
        "key": GOOGLE_PLACES_KEY,
    }

    async with httpx.AsyncClient(timeout=8.0) as http:
        try:
            resp = await http.get(url, params=params)
            data = resp.json()
        except Exception:
            return None

    if not data.get("results"):
        # Widen radius if nothing found close by
        params["radius"] = 500
        async with httpx.AsyncClient(timeout=8.0) as http:
            try:
                resp = await http.get(url, params=params)
                data = resp.json()
            except Exception:
                return None

    for place in data.get("results", []):
        name_lower = place.get("name", "").lower()
        for keyword, chain_key in CHAIN_KEYWORDS.items():
            if keyword in name_lower:
                chain = STORE_CHAINS.get(chain_key)
                if chain:
                    return {
                        "chain_key": chain_key,
                        "place_name": place.get("name"),
                        "place_id": place.get("place_id"),
                        "address": place.get("vicinity", ""),
                        "rating": place.get("rating"),
                        **chain,
                    }
        # Return unrecognized chain as generic
        return {
            "chain_key": "unknown",
            "place_name": place.get("name"),
            "place_id": place.get("place_id"),
            "address": place.get("vicinity", ""),
            "display_name": place.get("name"),
            "website": None,
            "search_url": "https://www.instacart.com/products/search/{item}",
            "order_url": "https://www.instacart.com/products/search/{item}",
            "logo_emoji": "🏪",
            "color": "#64748b",
            "has_online_order": True,
        }

    return None

# ── Tool definitions ───────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "find_item_in_store",
        "description": "Find where an item is located inside the current store. Returns aisle, section, stock status and price.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string", "description": "The grocery item to find (e.g. 'milk', 'apples')"}
            },
            "required": ["item_name"]
        }
    },
    {
        "name": "get_store_directions",
        "description": "Get efficient step-by-step in-store directions for a list of items, sorted by aisle.",
        "input_schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of item names to route through"
                }
            },
            "required": ["items"]
        }
    },
    {
        "name": "get_online_order_link",
        "description": "Generate a direct link to order an item online at the current store's website. Use this for every item the customer asks about.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string", "description": "The item to order online"},
                "store_chain_key": {"type": "string", "description": "The chain key from the current store (e.g. 'walmart', 'kroger')"}
            },
            "required": ["item_name", "store_chain_key"]
        }
    },
    {
        "name": "check_nearby_stores",
        "description": "When an item is out of stock, find which nearby stores carry it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string"}
            },
            "required": ["item_name"]
        }
    },
    {
        "name": "get_store_map",
        "description": "Get the full store layout showing all aisles and sections.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "search_item_on_store_website",
        "description": "Search for a specific item on the store's website and return the most relevant product link. Uses web search.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string", "description": "The item to search for"},
                "store_name": {"type": "string", "description": "The store chain name (e.g. 'Walmart', 'Kroger')"},
                "store_website": {"type": "string", "description": "The store's website domain (e.g. 'walmart.com')"}
            },
            "required": ["item_name", "store_name", "store_website"]
        }
    }
]

# Claude also gets web_search so it can look up live product pages
WEB_TOOLS = [
    {"type": "web_search_20260209", "name": "web_search"},
]

# ── Tool executors ─────────────────────────────────────────────────────────────

def execute_tool(name: str, inputs: dict) -> str:
    if name == "find_item_in_store":
        item = inputs["item_name"].lower().strip()
        info = STORE_INVENTORY.get(item)
        if not info:
            matches = [k for k in STORE_INVENTORY if item in k or k in item]
            if matches:
                item, info = matches[0], STORE_INVENTORY[matches[0]]
            else:
                return json.dumps({"found": False, "message": f"'{inputs['item_name']}' not found in this store's system."})
        return json.dumps({
            "found": True, "item": item,
            "aisle": info["aisle"], "section": info["section"],
            "in_stock": info["in_stock"], "price": f"${info['price']:.2f}"
        })

    elif name == "get_store_directions":
        found, not_found = [], []
        for item_name in inputs["items"]:
            item = item_name.lower().strip()
            info = STORE_INVENTORY.get(item)
            if not info:
                matches = [k for k in STORE_INVENTORY if item in k or k in item]
                if matches:
                    item, info = matches[0], STORE_INVENTORY[matches[0]]
                else:
                    not_found.append(item_name)
                    continue
            found.append((item, info))

        found.sort(key=lambda x: int(x[1]["aisle"]))
        route = [
            {
                "step": i + 1, "item": item,
                "aisle": info["aisle"], "section": info["section"],
                "status": "✓ In Stock" if info["in_stock"] else "✗ Out of Stock",
                "price": f"${info['price']:.2f}"
            }
            for i, (item, info) in enumerate(found)
        ]
        return json.dumps({"route": route, "not_found": not_found, "total_stops": len(route)})

    elif name == "get_online_order_link":
        item = inputs["item_name"]
        chain_key = inputs.get("store_chain_key", "walmart").lower()
        chain = STORE_CHAINS.get(chain_key, STORE_CHAINS["walmart"])
        encoded_item = item.replace(" ", "+")
        order_url = chain["order_url"].replace("{item}", encoded_item)
        search_url = chain["search_url"].replace("{item}", encoded_item)
        return json.dumps({
            "item": item,
            "store": chain["display_name"],
            "order_url": order_url,
            "search_url": search_url,
            "has_online_order": chain["has_online_order"],
            "note": chain.get("note", f"Order {item} directly from {chain['display_name']}'s website."),
            "link_type": "order"
        })

    elif name == "check_nearby_stores":
        item = inputs["item_name"]
        return json.dumps({
            "item": item,
            "nearby_stores": NEARBY_STORES,
            "tip": f"Call ahead to confirm {item} availability before heading over."
        })

    elif name == "get_store_map":
        return json.dumps({"aisles": AISLE_MAP})

    elif name == "search_item_on_store_website":
        # This signals Claude to use web_search internally
        item = inputs["item_name"]
        store = inputs["store_name"]
        website = inputs.get("store_website", "")
        return json.dumps({
            "search_query": f"{item} {store} buy online",
            "site_search": f"site:{website} {item}",
            "instruction": "Use web_search to find this item on the store website and return the direct product URL."
        })

    return json.dumps({"error": f"Unknown tool: {name}"})

# ── System prompt ──────────────────────────────────────────────────────────────

def build_system_prompt(store_info: dict | None) -> str:
    if store_info and store_info.get("chain_key") != "unknown":
        store_context = f"""
CURRENT STORE: {store_info.get('display_name', 'Unknown')}
Store Address: {store_info.get('address', 'N/A')}
Store Website: {store_info.get('website', 'N/A')}
Chain Key: {store_info.get('chain_key', 'unknown')}
Online Ordering: {'Available ✓' if store_info.get('has_online_order') else 'Not available (in-store only)'}
"""
    else:
        store_context = "CURRENT STORE: Not yet identified (ask the user which store they are in, or use GPS)."

    return f"""You are the AI assistant for time~save~shopping, helping customers save time grocery shopping.
{store_context}

YOUR CAPABILITIES:
1. Find items in the store (use find_item_in_store) — give aisle and section
2. Plan efficient routes through the store (use get_store_directions)
3. For EVERY item mentioned, ALWAYS also call get_online_order_link to provide an online ordering option
4. When items are out of stock, suggest nearby stores (use check_nearby_stores)
5. Search for specific products on the store website (use search_item_on_store_website + web_search)
6. Show the store map (use get_store_map)

IMPORTANT RULES:
- Whenever a customer asks about a specific item, ALWAYS call both find_item_in_store AND get_online_order_link for that item
- Always use the store's chain_key when calling get_online_order_link
- If online ordering is not available for this chain, mention it clearly and suggest Instacart as an alternative
- Format online order links clearly: "🛒 Order online: [link text](url)"
- If the customer hasn't selected a store yet, help them pick the right one

Be warm, concise, and efficient. Use emojis sparingly (🛒 🍎 📍)."""

# ── Request/Response models ────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class StoreLocation(BaseModel):
    lat: float
    lng: float

class ChatRequest(BaseModel):
    messages: list[Message]
    store_entered: bool = False
    store_info: dict | None = None

# ── Chat endpoint ──────────────────────────────────────────────────────────────

async def stream_chat(
    messages: list[dict],
    store_entered: bool,
    store_info: dict | None
) -> AsyncGenerator[str, None]:

    system = build_system_prompt(store_info)
    api_messages = list(messages)
    all_tools = TOOLS + WEB_TOOLS

    if store_entered and len(messages) == 1:
        api_messages[0]["content"] = "A customer just walked into the store. " + api_messages[0]["content"]

    while True:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=system,
            tools=all_tools,
            messages=api_messages,
            thinking={"type": "adaptive"},
        )

        for block in response.content:
            if block.type == "text":
                # Parse text for order link patterns to emit structured events
                text = block.text
                words = text.split(" ")
                for word in words:
                    yield f"data: {json.dumps({'type': 'text', 'content': word + ' '})}\n\n"

        if response.stop_reason != "tool_use":
            break

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                tool_label = {
                    "find_item_in_store":        "🔍 Checking store inventory...",
                    "get_store_directions":      "🗺️  Planning your route...",
                    "get_online_order_link":     "🛒 Generating order link...",
                    "check_nearby_stores":       "📍 Checking nearby stores...",
                    "search_item_on_store_website": "🌐 Searching store website...",
                    "web_search":                "🔎 Searching the web...",
                    "get_store_map":             "🏪 Loading store map...",
                }.get(block.name, "⚙️ Working...")

                yield f"data: {json.dumps({'type': 'tool_call', 'tool': block.name, 'label': tool_label})}\n\n"

                result_str = execute_tool(block.name, block.input)
                result_data = json.loads(result_str)

                # Emit structured order_link events for the frontend to render as buttons
                if block.name == "get_online_order_link" and result_data.get("order_url"):
                    yield f"data: {json.dumps({'type': 'order_link', 'item': result_data['item'], 'url': result_data['order_url'], 'store': result_data['store'], 'has_online_order': result_data.get('has_online_order', True)})}\n\n"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_str,
                })

        api_messages.append({"role": "assistant", "content": response.content})
        api_messages.append({"role": "user", "content": tool_results})

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@app.post("/api/chat")
async def chat(request: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    return StreamingResponse(
        stream_chat(messages, request.store_entered, request.store_info),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/store/identify")
async def identify_store(location: StoreLocation):
    store = await identify_store_from_gps(location.lat, location.lng)
    if store:
        return {"found": True, "store": store}
    return {"found": False, "store": None, "message": "No recognized store found at this location."}


@app.get("/api/store/chains")
async def get_chains():
    return {"chains": STORE_CHAINS}


@app.get("/api/store/inventory")
async def get_inventory():
    return {"inventory": STORE_INVENTORY, "aisle_map": AISLE_MAP}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
