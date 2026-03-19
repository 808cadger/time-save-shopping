// Change this to your backend IP when testing on a physical device
// Android emulator: http://10.0.2.2:8000
// iOS simulator:    http://localhost:8000
// Physical device:  http://YOUR_COMPUTER_LOCAL_IP:8000
export const API_BASE_URL = "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StoreInfo {
  chain_key: string;
  display_name: string;
  place_name?: string;
  address?: string;
  website?: string;
  search_url?: string;
  order_url?: string;
  logo_emoji?: string;
  color?: string;
  has_online_order?: boolean;
  note?: string;
}

export interface StreamChunk {
  type: "text" | "tool_call" | "order_link" | "done";
  content?: string;       // text delta
  tool?: string;          // tool name
  label?: string;         // human-readable tool label
  item?: string;          // order_link: item name
  url?: string;           // order_link: order URL
  store?: string;         // order_link: store display name
  has_online_order?: boolean;
}

export async function* streamChat(
  messages: ChatMessage[],
  storeEntered = false,
  storeInfo: StoreInfo | null = null
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      store_entered: storeEntered,
      store_info: storeInfo,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6)) as StreamChunk;
        } catch {
          // skip malformed
        }
      }
    }
  }
}

export async function identifyStore(lat: number, lng: number): Promise<StoreInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/store/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.found ? data.store : null;
  } catch {
    return null;
  }
}

export async function getStoreChains(): Promise<Record<string, StoreInfo>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/store/chains`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.chains ?? {};
  } catch {
    return {};
  }
}

export async function getInventory() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/store/inventory`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
