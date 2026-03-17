# Cedros Pay Server - Collections & Asset Tokenization (Token-22)

Complete specification for collection grouping, asset class configuration, Token-22 mint operations, and asset fulfillment.

---

## Collections

Collections group products and optionally carry a `TokenizationConfig` to make them "asset classes".

### Collection Model

```
id:                   String (UUID)
tenant_id:            String
name:                 String
description:          Option<String>
product_ids:          Vec<String>
active:               bool
tokenization_config:  Option<TokenizationConfig>
created_at:           DateTime
updated_at:           DateTime
```

### CollectionInfo (public response)

Strips `tokenization_config` before returning to callers.

```
id:           String
name:         String
description:  Option<String>
product_ids:  Vec<String>
```

---

## HTTP Endpoints

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/admin/collections | List all collections |
| GET    | /api/admin/collections/:id | Get single collection |
| POST   | /api/admin/collections | Create collection |
| PUT    | /api/admin/collections/:id | Update collection |
| DELETE | /api/admin/collections/:id | Delete collection |

Admin endpoints return the full `Collection` including `tokenization_config`.

### Public Endpoints

| Method | Path | Response | Cache |
|--------|------|----------|-------|
| GET    | /paywall/v1/collections | `Vec<CollectionInfo>` | Yes |
| GET    | /paywall/v1/collections/:id | `CollectionInfo` | Yes |

Public endpoints include standard cache headers and strip `tokenization_config`.

---

## Storage Methods

| Method | Description |
|--------|-------------|
| `store.list_collections(tenant_id)` | List all collections for tenant |
| `store.get_collection(tenant_id, id)` | Fetch single collection by ID |
| `store.create_collection(tenant_id, input)` | Insert new collection |
| `store.update_collection(tenant_id, id, input)` | Update existing collection |
| `store.delete_collection(tenant_id, id)` | Remove collection |

All methods require `tenant_id`.

---

## Asset Tokenization

### AssetClass Enum

| Variant | Token Type | Regulator |
|---------|-----------|-----------|
| `Securities` | Fungible Token-22 mint | SEC |
| `Commodities` | Fungible Token-22 mint | CFTC |
| `Property` | Non-fungible Token-22 NFT (supply = 1) | State / local |
| `Collectibles` | Non-fungible Token-22 NFT (supply = 1) | Varies by jurisdiction |

`is_fungible()` returns `true` for `Securities` and `Commodities`.

---

### TokenizationConfig (on Collection)

Attached to a Collection to declare it an asset class.

```
asset_class:               AssetClass
mint_address:              Option<String>   // fungible classes only
token_symbol:              Option<String>
token_decimals:            i16              // default 2
transfer_fee_bps:          i32              // default 0
max_transfer_fee:          i64              // default 0
treasury_address:          Option<String>
liquidity_pool_address:    Option<String>
custody_proof_url:         Option<String>
redemption_config:         Option<RedemptionConfig>
allowed_jurisdictions:     Vec<String>      // ISO 3166-1 alpha-2
regulatory_notice:         Option<String>
compliance_requirements:   Option<ComplianceRequirements>
```

---

### TokenizedAssetConfig (on Product)

Attached to a Product to link it to an asset class collection.

```
asset_class_collection_id:  String
asset_class:                Option<String>   // denormalized from collection
asset_identifier:           Option<String>
backing_value_cents:        i64
backing_currency:           String           // default "usd"
tokens_per_unit:            i64              // default 1
custody_proof_url:          Option<String>
nft_mint_address:           Option<String>   // set after minting
regulatory_notice:          Option<String>
```

---

### TenantToken22Mint

Tracks a Token-22 mint associated with a tenant, optionally scoped to a collection.

```
tenant_id:          String
collection_id:      Option<String>   // None = gift card mint, Some = asset class
mint_address:       String
mint_authority:     String
transfer_fee_bps:   i32
max_transfer_fee:   i64
treasury_address:   Option<String>
token_symbol:       Option<String>
token_decimals:     i16
created_at:         DateTime
updated_at:         DateTime
```

---

## Token-22 Service

Program ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

Built from `X402Config` when `rpc_url` is non-empty. Uses the first server wallet (`X402_SERVER_WALLET_1`) as the mint/freeze authority.

---

### Fungible Operations (`operations.rs`)

#### `create_mint_with_transfer_fee(service, decimals, fee_bps, max_fee) -> MintCreationResult`

Creates a new fungible Token-22 mint with transfer fee extension.

Instructions (in order):
1. `CreateAccount` — allocate mint account
2. `InitializeTransferFeeConfig` (disc 26, sub 0) — configure fee basis points and max fee
3. `InitializeMint2` (disc 20) — set decimals and server as mint + freeze authority

#### `mint_tokens(service, mint, recipient, amount) -> String`

Creates associated token account (idempotent) then issues `MintTo`. Returns transaction signature.

#### `burn_tokens(service, mint, owner, amount) -> String`

Issues `Burn` (disc 8) against the owner's ATA. Returns transaction signature.

#### `freeze_account(service, mint, owner) -> String`

Issues `FreezeAccount` (disc 10). Returns transaction signature.

#### `thaw_account(service, mint, owner) -> String`

Issues `ThawAccount` (disc 11). Returns transaction signature.

#### `harvest_fees(service, mint, treasury, source_accounts) -> String`

Issues `WithdrawWithheldTokensFromAccounts` (disc 26, sub 3) to sweep withheld transfer fees into the treasury. Returns transaction signature.

#### `get_associated_token_address_2022(owner, mint) -> Pubkey`

Derives the ATA PDA using the Token-22 program ID.

---

### NFT Operations (`nft.rs`)

#### `create_nft_mint(service, owner, name, symbol, uri, transfer_fee?) -> NftMintResult`

Creates a non-fungible Token-22 mint with metadata in a single transaction.

**Instructions (9–10, in order):**

| # | Instruction | Discriminator | Notes |
|---|-------------|---------------|-------|
| 1 | `CreateAccount` | — | Allocate space for mint + all extensions + metadata |
| 2 | `InitializeMetadataPointer` | disc 39, sub 0 | Self-referencing pointer |
| 3 | `InitializePermanentDelegate` | disc 35 | Server authority |
| 4 | `InitializeMintCloseAuthority` | disc 25 | Server authority |
| 5 | `InitializeTransferFeeConfig` | disc 26, sub 0 | Optional; included when `transfer_fee` provided |
| 6 | `InitializeMint2` | disc 20 | 0 decimals, server as mint + freeze authority |
| 7 | `TokenMetadata::Initialize` | `sha256("spl_token_metadata_interface:initialize_account")[0..8]` | Embed name/symbol/URI |
| 8 | `CreateAssociatedTokenAccountIdempotent` | — | Create owner's ATA |
| 9 | `MintTo` | — | Issue 1 token |
| 10 | `SetAuthority` | disc 6 | Remove mint authority — supply locked at 1 |

**Account space allocation:**

```
82   (mint base)
+  1   (account type)
+ 68   (MetadataPointer extension)
+ 36   (PermanentDelegate extension)
+ 36   (MintCloseAuthority extension)
+112   (TransferFeeConfig extension — when present)
+ 84   (TokenMetadata base)
+ len(name) + len(symbol) + len(uri)
+ 64   (padding)
```

**Returns:** `NftMintResult { mint_address, signature }`

#### `burn_nft(service, mint, owner) -> String`

Burns an NFT and closes the mint account.

Instructions:
1. `Burn(1)` — executed via PermanentDelegate authority
2. `CloseAccount` (disc 9) — close the mint account, reclaim rent

---

### Admin Token-22 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/token22/initialize | Create new mint with transfer fee config |
| GET  | /api/admin/token22/status | Return mint info for tenant |
| POST | /api/admin/token22/harvest-fees | Sweep withheld transfer fees to treasury |

---

## AssetFulfillmentService

Mints tokens on purchase and burns them on redemption completion.

### `fulfill_tokenized_asset(tenant_id, order_id, product, user_id, quantity)`

Called after a successful purchase of a tokenized product.

**Steps:**
1. Look up the product's collection and read `TokenizationConfig`.
2. If `asset_class.is_fungible()`: mint `tokens_per_unit * quantity` tokens from the collection's Token-22 mint to the user's ATA.
3. If non-fungible: call `create_nft_mint` with metadata URI `/paywall/v1/products/{product_id}/nft-metadata`.
4. Record an `AssetRedemption` row with status `pending_info`.

### `burn_redemption_tokens(tenant_id, collection_id, product_id, user_id, amount)`

Called when a redemption is marked complete.

**Logic:**
- If the product has `nft_mint_address` set: burn the NFT (user's ATA is derived from `user_id`).
- Otherwise: burn `amount` fungible tokens from the user's ATA for the collection mint.

---

## Configuration

| Requirement | Source |
|-------------|--------|
| Token-22 RPC connection | `x402.rpc_url` (non-empty required) |
| Mint/freeze authority | `X402_SERVER_WALLET_1` (first server wallet) |
| NFT metadata base URL | `server.public_url` |

The `Token22Service` is only constructed when `x402.rpc_url` is non-empty. Calls to `AssetFulfillmentService` methods will return an error if the service is not configured.
