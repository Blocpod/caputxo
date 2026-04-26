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

## Production Build

```bash
npm run lint
npm run build
```

## Product Claim

The encrypted asset stays fixed. The on-chain capability moves. The epoch advances. The controller stops issuing managed grants to the old owner and starts issuing managed grants to the new owner.
