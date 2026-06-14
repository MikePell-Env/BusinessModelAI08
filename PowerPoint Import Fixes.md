# PowerPoint Import Fixes

## Current State

### What works
- **Client-side .pptx parsing** — `client/src/utils/powerpointParser.ts` (1,677 lines) uses JSZip to parse uploaded .pptx files in the browser. This correctly populates BMC sections and year navigation.
- **File upload UI** — `client/src/components/PowerPointImporter.tsx` lets users pick a local .pptx file and passes it to the client-side parser.
- **Microsoft credentials** — `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID` are all configured in environment secrets.

### What is fake or broken

| Component | Location | Problem |
|---|---|---|
| Server upload route | `server/routes.ts` line 274 | Returns **hardcoded** 2025/2026/2027 financial values — never reads the actual uploaded file |
| Graph API extraction | `server/services/powerpointImporter.ts` line 136 | Throws `"not fully implemented"` immediately — complete stub |
| File upload (server) | `server/services/powerpointImporter.ts` line 96 | Throws `"not implemented yet"` — another stub |

---

## Fix 1 — Make the server upload actually parse the file (~30 lines)

**File:** `server/routes.ts` — the `/api/powerpoint/parse-upload` route (line 274)

**Problem:** The route receives the uploaded `.pptx` file as bytes via multer but ignores them entirely. It returns hardcoded financial data:
```ts
// CURRENT (fake)
const incomeStatementData = {
  years: [
    { year: 2025, revenue: 100, expenses: 250, profit: 0, loss: 150 },
    { year: 2026, revenue: 1000, expenses: 800, profit: 200, loss: 0 },
    { year: 2027, revenue: 2660, expenses: 920, profit: 1740, loss: 0 }
  ],
  ...
};
```

**Fix:** Replace with real JSZip parsing of `reqWithFile.file.buffer` (the uploaded bytes). The server already has the bytes from multer — it just needs to unzip and parse them the same way the client-side parser does.

**Key parsing targets in the .pptx XML:**
- Financials slide: look for revenue/expenses/profit numbers in `ppt/slides/slide*.xml`
- BMC slide: look for section headers (Key Partners, Value Propositions, etc.) and bullet content

**Note on coordination:** The client-side parser and the server route are currently independent paths. The client-side parser (`powerpointParser.ts`) handles BMC data. The server route handles financial data only. This split should be preserved — just replace the hardcoded values with real parsing.

---

## Fix 2 — Add OneDrive/SharePoint import (~50 lines)

**Problem:** The Graph API import path (`/api/import/powerpoint`) calls `extractSlidesFromGraph()` which immediately throws.

**Fix:** Replace the stub with a real file download using the Graph API client:

```ts
// REAL implementation
private async extractSlidesFromGraph(graphClient: any, fileUrl: string): Promise<Buffer> {
  // Download raw file bytes from Graph API
  const response = await graphClient.api(`${fileUrl}/content`).getStream();
  // Convert stream to buffer
  // Pass buffer to JSZip parser (same logic as server upload fix above)
}
```

**New server endpoint needed:** `GET /api/powerpoint/graph-download?fileId=xxx`
- Accepts a OneDrive file ID or a sharing URL
- Downloads the file using the configured app credentials
- Returns the parsed canvas/financial data

**New UI needed:** A text input in `PowerPointImporter.tsx` where the user pastes a OneDrive sharing link. The component calls the new endpoint instead of uploading a local file.

**Auth note — important:** The configured credentials use `ClientSecretCredential` (app-only auth). This means:
- **SharePoint/Teams files** → works if the Azure app has `Sites.Read.All` permission granted
- **Personal OneDrive files** → requires delegated auth (user signs in via MSAL browser flow) — more work

Ask Mike: where does the PowerPoint live — personal OneDrive or a SharePoint/Teams site? This determines whether the current credentials are sufficient.

---

## Implementation Order

1. **Fix 1 first** — replaces fake data with real parsing, immediate value, no auth changes needed
2. **Fix 2 second** — adds OneDrive/SharePoint import once Fix 1 confirms parsing is solid

## Files to Change

| File | Change |
|---|---|
| `server/routes.ts` | Replace hardcoded financial data with real JSZip parsing (Fix 1) |
| `server/services/powerpointImporter.ts` | Replace `extractSlidesFromGraph()` stub with real Graph download (Fix 2) |
| `client/src/components/PowerPointImporter.tsx` | Add OneDrive URL input option (Fix 2) |

## Files NOT to change
- `client/src/utils/powerpointParser.ts` — already works, leave alone
- `server/services/microsoftAuth.ts` — already works, leave alone
- `client/src/components/Canvas3DBabylon.tsx` — already wired up correctly
