# CapUTXO Control Center

An interactive product dashboard for CapUTXO: transferable cryptographic access rights where the encrypted asset remains fixed while the UTXO capability and managed future access move to the new owner.

## Features

- Control-center UI for current capability, managed transfer, access verification, policy modes, receipts, and fixed encrypted asset state.
- Interactive transfer stage selector and policy mode selector.
- Responsive layout for desktop and mobile sharing.
- Vite + React + TypeScript build ready for Vercel.

## Run Locally

```bash
npm install
npm run dev
```

For the API-backed prototype, run the gateway and the web app in separate terminals:

```bash
npm run dev:api
npm run dev
```

The gateway exposes:

- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`
- `POST /api/reset`

Local API state is stored in `data/caputxo-state.json` and is intentionally ignored by git. If the gateway is not running, the app falls back to browser-local persistence.

## Production Build

```bash
npm run lint
npm run build
```

## Product Claim

The encrypted asset stays fixed. The on-chain capability moves. The epoch advances. The controller stops issuing managed grants to the old owner and starts issuing managed grants to the new owner.
