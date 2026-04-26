import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedState } from "./seed.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataFile = join(root, "data", "caputxo-state.json");
const port = Number(process.env.PORT ?? 8787);

async function readState() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    await writeState(seedState);
    return seedState;
  }
}

async function writeState(state) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.url === "/api/health" && req.method === "GET") {
      return send(res, 200, { ok: true, storage: "json", dataFile });
    }
    if (req.url === "/api/state" && req.method === "GET") {
      return send(res, 200, await readState());
    }
    if (req.url === "/api/state" && req.method === "PUT") {
      const state = await readBody(req);
      await writeState(state);
      return send(res, 200, { ok: true });
    }
    if (req.url === "/api/reset" && req.method === "POST") {
      await writeState(seedState);
      return send(res, 200, seedState);
    }
    return send(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
}).listen(port, () => {
  console.log(`CapUTXO gateway listening on http://localhost:${port}`);
});
