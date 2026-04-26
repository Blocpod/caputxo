const WOC_BASE = process.env.WOC_BASE ?? "https://api.whatsonchain.com/v1/bsv/test";

export async function fetchUtxoCurrentness({ txid, vout }) {
  if (!txid || !Number.isInteger(vout)) return { ok: false, reason: "txid_and_vout_required" };
  const response = await fetch(`${WOC_BASE}/tx/${txid}/out/${vout}/spent`);
  if (!response.ok) return { ok: false, reason: `indexer_http_${response.status}` };
  const data = await response.json();
  return {
    ok: true,
    current: data.spent === false || data.isSpent === false,
    indexer: "WhatsOnChain",
    raw: data,
  };
}

export async function broadcastRawTransaction(rawTx) {
  if (!/^[0-9a-fA-F]+$/.test(rawTx ?? "")) return { ok: false, reason: "raw_hex_required" };
  const response = await fetch(`${WOC_BASE}/tx/raw`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txhex: rawTx }),
  });
  const body = await response.text();
  if (!response.ok) return { ok: false, reason: `broadcast_http_${response.status}`, body };
  return { ok: true, txid: body.replaceAll('"', "").trim(), indexer: "WhatsOnChain" };
}
