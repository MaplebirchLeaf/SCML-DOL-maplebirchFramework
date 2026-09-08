# Mod Encryption

The framework itself is not encrypted. This capability exists for **encrypted distribution of other mods that depend on maplebirch**: the real mod is packed into an encrypted shell `.modpack`, which asks the framework for authorization during ModLoader's `earlyload` phase and only then decrypts and lazy-loads the real mod.

## Player-side flow

1. Load the `.modpack` into ModLoader in-game. The shell exposes only the shell `boot.json`, the earlyload decryptor, and `.crypt` shards; the original `boot.json`, `auth.json`, scripts, and assets all live inside the encrypted payload.
2. On first load the framework shows an authorization prompt: paste an authorization credential issued by the companion tool (shape `maplebirch-auth.<payload>.<signature>`), or the matching authorization password.
3. The framework verifies the signature against the public key embedded in the shell and checks that `subject`/`key` match, then validates the issuance window configured in `auth.json`.
4. On success → it decrypts the real mod and hands it to ModLoader for lazy loading; the credential is stored encrypted (keyed by `subject:key` in the local IndexedDB `credentials` store), so later loads do not ask again.
5. Closing the prompt or failing verification → the framework **disables that encrypted mod** (to avoid half-loaded state); stale remembered credentials are cleared automatically and the prompt is shown again.

## Author-side: generating the shell and credentials

The encrypted shell and authorization credentials are produced by the **companion tool**:

- [DOL Mod Protection Tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools) (its README is authoritative for full configuration)

Minimal `auth.json`:

```json
{
  "key": "main",
  "publicKey": "BASE64_SPKI_PUBLIC_KEY"
}
```

Optional fields: `subject`, `name`, `prompt` (dialog copy) and `date`. `date` supports validation by `period: "day" | "month"`, `timezone`, and `graceDays`. After conversion, `auth.json` is not kept in plain text in the shell package.

## Validity and invalidation

- The framework validates the credential issuance time against the window declared by `date` in `auth.json` (day/month, timezone, grace days); credentials outside the window are treated as invalid.
- When a credential expires or is replaced, the framework clears the locally remembered one and returns to the prompt flow.
- Failed/cancelled verification disables the mod; re-verifying successfully restores normal loading.
