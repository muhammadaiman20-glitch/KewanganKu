# Receipt OCR on Cloudflare

Production `/api/scan-receipt` is implemented by `public/_worker.js`, copied into the Pages output during Vite build. It calls `env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', ...)` with the actual image and JSON extraction instructions. No Gemini key or local PC is required.

Configure production Pages bindings/settings:
- Workers AI binding: `AI`.
- `ACCESS_AUD`: audience of the KewanganKu Access application.
- `ACCESS_TEAM_DOMAIN`: the Cloudflare Access team hostname (without https).
- `OWNER_EMAIL`: the one owner allowed to invoke OCR.

The OCR endpoint validates the signed Access JWT (issuer, audience, email, expiry and RSA signature). Preview URLs without a valid login cannot invoke AI. Do not remove Access or publish JWTs/API tokens in frontend code. Production Access configuration and Pages bindings are managed on Cloudflare; Git integration is currently disconnected, so deployments use direct upload.

Receipts are processed as images, with JPEG/PNG/WebP validation, bounded request size, and browser preprocessing at a maximum long edge of 2200 pixels. No receipt image or full OCR result is logged or written to server storage by this app. Workers AI/provider processing still applies.

The model returns readable text, the printed total label, date, merchant and optional fuel/subscription/debt fields. The server checks JSON shape, calendar dates, amount evidence and fuel arithmetic. Unknown values stay null; blank receipts fail. AI can still misread a real photo. Users must review and explicitly confirm before saving.

Fuel requires the actual vehicle and odometer; missing litres/grade are not guessed. Debt payments require an explicit existing debt and preserve the receipt transaction date. General purchases and paid bills can be saved as daily expenses. A subscription renewal date must be supplied separately if it is not printed. Records use browser localStorage and automatic Cloudflare D1 sync, with JSON/CSV backups.

`npm run dev` provides local UI development and an explicit 503 for OCR: the Express server does not emulate Workers AI and returns no simulated data. Use the deployed authenticated Pages site for real inference.

Validation:
- `npm test`: parser/storage tests plus receipt validation, blank-result rejection, image checks and Access JWT verification.
- `npm run lint` and `npm run build`.
- Live Workers AI tests on synthetic fuel and meal receipts: RM65 total/31.7 L, and RM15.90 total respectively; cash/change excluded. Blank image returned null fields.
- Chromium UI test with normalized live-model output: upload, review, explicit fuel details, save once and unreadable-result error; mobile/desktop screenshots reviewed.

## Camera interface

Imbas uses a full-screen camera layout based on the Ronda camera surface: top controls, receipt framing guides, a central shutter, gallery picker and receipt preview. Camera access starts only after the user presses Open Camera/shutter; front/back switching is available during capture. The scan uses the complete camera frame (guides are visual assistance, not automatic cropping). Receipt results appear in a separate review sheet; closing it keeps the current draft. Native dialogs isolate keyboard focus and Escape closes the review before leaving the scanner. Exiting the scanner stops media tracks and aborts outstanding OCR requests. Camera hardware still depends on the user's device and browser permissions.
