# Cloud Save

Cloud save syncs **DoL's native local saves** (IndexedDB slots) to **your own cloud storage**. The server side is not hosted by the framework: bring your own Cloudflare Worker + R2 bucket, protected by an access token.

## How it works

An extra **"Cloud Save"** tab is added to the in-game settings. The panel uploads local slots to the Worker as JSON records; after checking `Authorization: Bearer <token>`, the Worker stores them in R2:

- Slot saves: `slots/<slot>.json`
- Export code: `save-code.json`

Uploaded records contain `slot`/`details`/`save`/`exportedAt`/`gameId` and are **plain JSON** — there is no application-level encryption. Use HTTPS, a strong random token, and keep the R2 bucket private; implement end-to-end encryption in the Worker yourself if needed.

## Deploying your own Worker (once)

The `cloudflare/` directory at the repo root ships a deployable Worker (`worker.ts` + `wrangler.jsonc`):

1. Install and log in to wrangler:
   ```bash
   bunx wrangler login
   ```
2. Inside `cloudflare/`, create the R2 bucket (`wrangler.jsonc` already declares the `SAVE_BUCKET` binding → bucket name `maplebirch-save`; edit if needed):
   ```bash
   bunx wrangler r2 bucket create maplebirch-save
   ```
3. Set the access token (required secret `MAPLEBIRCH_TOKEN`; use a long random string):
   ```bash
   bunx wrangler secret put MAPLEBIRCH_TOKEN
   ```
4. Deploy:
   ```bash
   bunx wrangler deploy
   ```

After deployment, `https://<worker-name>.<your-subdomain>.workers.dev/health` should return `{ "ok": true }`.

### Worker endpoints

All endpoints except `/health` require the `Authorization: Bearer <MAPLEBIRCH_TOKEN>` header:

| Endpoint | Methods | Description |
| :--- | :--- | :--- |
| `/health` | GET | Health check |
| `/saves` | GET | List remote slots |
| `/saves/:slot` | PUT / GET / DELETE | Upload / download / delete a slot |
| `/save-code` | GET / PUT | Read / write the export code |

## Using it in-game

1. Open the in-game settings → the **Cloud Save** tab.
2. Fill in:
   - **Address**: your Worker URL, e.g. `https://maplebirch-cloud-save.<your-subdomain>.workers.dev`
   - **Access token**: must match `MAPLEBIRCH_TOKEN`
3. Click **Connect** to verify (the remote list refreshes), then you can:
   - **Slots**: pick a local slot and upload; download / delete remote slots (slot 0 is Autosave, 1–10 are manual slots)
   - **Export code**: generate an export code for the current save or a chosen slot and upload it; or download the cloud code and import it by pasting

## Notes

- Deleting a remote slot **cannot be undone**.
- The token applies for the current session (fill in / connect each time you open the panel). Keep it safe — anyone who has it can read and write your cloud saves.
