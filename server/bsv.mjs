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

export async function fetchAddressUtxos(address) {
  if (!/^[a-zA-Z0-9]{20,80}$/.test(address ?? "")) return { ok: false, reason: "valid_address_required" };
  const response = await fetch(`${WOC_BASE}/address/${address}/unspent`);
  if (!response.ok) return { ok: false, reason: `indexer_http_${response.status}` };
  const data = await response.json();
  return {
    ok: true,
    address,
    indexer: "WhatsOnChain",
    utxos: Array.isArray(data)
      ? data.map((utxo) => ({
          txid: utxo.tx_hash ?? utxo.txid,
          vout: utxo.tx_pos ?? utxo.vout,
          satoshis: utxo.value ?? utxo.satoshis,
          height: utxo.height,
        }))
      : [],
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
