//! Full OpenAPI 3.0.3 specification as a static string constant.
//!
//! Extracted from `discovery.rs` to keep file sizes under budget.

// NOTE: Uses r##"..."## because JSON $ref values contain "#" which terminates r#"..."#.
pub const OPENAPI_SPEC: &str = r##"{
  "openapi": "3.0.3",
  "info": {
    "title": "Cedros Pay API",
    "version": "1.0.0",
    "description": "Unified payment gateway supporting Stripe, x402 crypto (USDC on Solana), and credits. Features products, cart, checkout, subscriptions, gift cards, asset redemptions, AI chat, and compliance."
  },
  "servers": [{ "url": "/", "description": "Current server" }],
  "security": [],
  "components": {
    "securitySchemes": {
      "bearerAuth": { "type": "http", "scheme": "bearer", "description": "JWT or API key" },
      "x402": { "type": "apiKey", "in": "header", "name": "X-Payment", "description": "x402 crypto payment header" }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "code": { "type": "string" }, "message": { "type": "string" }, "details": { "type": "object" }
        }
      },
      "Product": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" },
          "slug": { "type": "string" }, "priceCents": { "type": "integer" },
          "images": { "type": "array", "items": { "type": "object" } },
          "variants": { "type": "array", "items": { "type": "object" } }, "active": { "type": "boolean" }
        }
      },
      "CartQuoteRequest": {
        "type": "object", "required": ["items"],
        "properties": {
          "items": { "type": "array", "items": { "type": "object", "properties": {
            "productId": { "type": "string" }, "variantId": { "type": "string" }, "quantity": { "type": "integer" }
          }}},
          "couponCode": { "type": "string" }
        }
      },
      "CartQuoteResponse": {
        "type": "object",
        "properties": {
          "cartId": { "type": "string" }, "items": { "type": "array", "items": { "type": "object" } },
          "subtotal": { "type": "integer" }, "total": { "type": "integer" }, "payment": { "type": "object" }
        }
      },
      "ChatMessage": {
        "type": "object", "required": ["message"],
        "properties": { "sessionId": { "type": "string" }, "message": { "type": "string" } }
      },
      "ChatResponse": {
        "type": "object",
        "properties": {
          "sessionId": { "type": "string" }, "message": { "type": "string" },
          "products": { "type": "array", "items": { "$ref": "#/components/schemas/Product" } },
          "faqs": { "type": "array", "items": { "type": "object" } }
        }
      }
    }
  },
  "tags": [
    { "name": "Products", "description": "Product catalog" },
    { "name": "Collections", "description": "Product collections" },
    { "name": "FAQs", "description": "Frequently asked questions" },
    { "name": "Cart", "description": "Shopping cart operations" },
    { "name": "Payment", "description": "Single-resource payment (quote/verify)" },
    { "name": "Credits", "description": "Credits balance and authorization" },
    { "name": "Subscriptions", "description": "Recurring subscriptions" },
    { "name": "Chat", "description": "AI shopping assistant" },
    { "name": "GiftCards", "description": "Gift card claiming and balance" },
    { "name": "AssetRedemptions", "description": "Token-gated asset redemption" },
    { "name": "Refunds", "description": "Refund requests and status" },
    { "name": "Compliance", "description": "Compliance check" },
    { "name": "Storefront", "description": "Shop configuration" },
    { "name": "Health", "description": "Server health" }
  ],
  "paths": {
    "/cedros-health": {
      "get": { "tags": ["Health"], "operationId": "healthCheck", "summary": "Health check",
        "responses": { "200": { "description": "Server is healthy" } } }
    },
    "/paywall/v1/products": {
      "get": { "tags": ["Products"], "operationId": "listProducts", "summary": "List products (paginated)",
        "parameters": [
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 20 } },
          { "name": "offset", "in": "query", "schema": { "type": "integer", "default": 0 } },
          { "name": "collection", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "Product list" } } }
    },
    "/paywall/v1/products/{id}": {
      "get": { "tags": ["Products"], "operationId": "getProduct", "summary": "Get product by ID",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Product details" } } }
    },
    "/paywall/v1/products/by-slug/{slug}": {
      "get": { "tags": ["Products"], "operationId": "getProductBySlug", "summary": "Get product by slug",
        "parameters": [{ "name": "slug", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Product details" } } }
    },
    "/paywall/v1/products/{id}/nft-metadata": {
      "get": { "tags": ["Products"], "operationId": "getProductNftMetadata", "summary": "Get NFT metadata",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "NFT metadata JSON" } } }
    },
    "/paywall/v1/products.txt": {
      "get": { "tags": ["Products"], "operationId": "listProductsText", "summary": "List products as plain text",
        "responses": { "200": { "description": "Plain-text product listing" } } }
    },
    "/paywall/v1/collections": {
      "get": { "tags": ["Collections"], "operationId": "listCollections", "summary": "List collections",
        "responses": { "200": { "description": "Collection list" } } }
    },
    "/paywall/v1/collections/{id}": {
      "get": { "tags": ["Collections"], "operationId": "getCollection", "summary": "Get collection by ID",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Collection details" } } }
    },
    "/paywall/v1/faqs": {
      "get": { "tags": ["FAQs"], "operationId": "listFaqs", "summary": "List public FAQs",
        "responses": { "200": { "description": "FAQ list" } } }
    },
    "/paywall/v1/coupons/validate": {
      "post": { "tags": ["Cart"], "operationId": "validateCoupon", "summary": "Validate a coupon code",
        "responses": { "200": { "description": "Coupon validity result" } } }
    },
    "/paywall/v1/cart/quote": {
      "post": { "tags": ["Cart"], "operationId": "cartQuote", "summary": "Create cart and get payment quote",
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CartQuoteRequest" } } } },
        "responses": { "200": { "description": "Cart quote with payment options" } } }
    },
    "/paywall/v1/cart/checkout": {
      "post": { "tags": ["Cart"], "operationId": "cartCheckout", "summary": "Checkout cart via Stripe",
        "responses": { "200": { "description": "Stripe checkout session URL" } } }
    },
    "/paywall/v1/cart/{cartId}": {
      "get": { "tags": ["Cart"], "operationId": "getCart", "summary": "Get cart details",
        "parameters": [{ "name": "cartId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Cart details" } } }
    },
    "/paywall/v1/cart/{cartId}/verify": {
      "post": { "tags": ["Cart"], "operationId": "cartVerify", "summary": "Verify x402 cart payment",
        "parameters": [{ "name": "cartId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Payment verified" } } }
    },
    "/paywall/v1/cart/{cartId}/inventory-status": {
      "get": { "tags": ["Cart"], "operationId": "cartInventoryStatus", "summary": "Check cart inventory",
        "parameters": [{ "name": "cartId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Inventory status per item" } } }
    },
    "/paywall/v1/cart/{cartId}/credits/authorize": {
      "post": { "tags": ["Cart"], "operationId": "cartCreditsAuthorize", "summary": "Pay cart with credits",
        "security": [{ "bearerAuth": [] }],
        "parameters": [{ "name": "cartId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Credits authorized" } } }
    },
    "/paywall/v1/cart/{cartId}/credits/hold": {
      "post": { "tags": ["Cart"], "operationId": "cartCreditsHold", "summary": "Place credits hold on cart",
        "security": [{ "bearerAuth": [] }],
        "parameters": [{ "name": "cartId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Credits hold placed" } } }
    },
    "/paywall/v1/quote": {
      "post": { "tags": ["Payment"], "operationId": "quote", "summary": "Get single-resource payment quote (HTTP 402)",
        "responses": { "402": { "description": "Payment required with x402 quote" } } },
      "get": { "tags": ["Payment"], "operationId": "quoteGet", "summary": "Get quote options",
        "responses": { "200": { "description": "Quote options" } } }
    },
    "/paywall/v1/verify": {
      "post": { "tags": ["Payment"], "operationId": "verify", "summary": "Verify x402 payment and deliver resource",
        "responses": { "200": { "description": "Payment verified, resource delivered" } } }
    },
    "/paywall/v1/stripe-session": {
      "post": { "tags": ["Payment"], "operationId": "stripeSession", "summary": "Create Stripe checkout session",
        "responses": { "200": { "description": "Stripe session URL" } } }
    },
    "/paywall/v1/stripe-session/verify": {
      "get": { "tags": ["Payment"], "operationId": "stripeSessionVerify", "summary": "Verify Stripe session",
        "responses": { "200": { "description": "Session verification result" } } }
    },
    "/paywall/v1/x402-transaction/verify": {
      "get": { "tags": ["Payment"], "operationId": "x402TransactionVerify", "summary": "Verify x402 tx on-chain",
        "responses": { "200": { "description": "Transaction verification result" } } }
    },
    "/paywall/v1/compliance-check": {
      "post": { "tags": ["Compliance"], "operationId": "complianceCheck", "summary": "Check wallet compliance",
        "responses": { "200": { "description": "Compliance status" } } }
    },
    "/paywall/v1/credits/balance": {
      "get": { "tags": ["Credits"], "operationId": "creditsBalance", "summary": "Get credits balance",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Credits balance" } } }
    },
    "/paywall/v1/credits/authorize": {
      "post": { "tags": ["Credits"], "operationId": "creditsAuthorize", "summary": "Authorize credits payment",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Credits authorized" } } }
    },
    "/paywall/v1/credits/hold": {
      "post": { "tags": ["Credits"], "operationId": "creditsHold", "summary": "Place credits hold",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Hold created" } } }
    },
    "/paywall/v1/credits/hold/{holdId}/release": {
      "post": { "tags": ["Credits"], "operationId": "creditsHoldRelease", "summary": "Release credits hold",
        "security": [{ "bearerAuth": [] }],
        "parameters": [{ "name": "holdId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Hold released" } } }
    },
    "/paywall/v1/purchases": {
      "get": { "tags": ["Refunds"], "operationId": "listPurchases", "summary": "List user purchases",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Purchase list" } } }
    },
    "/paywall/v1/refunds/request": {
      "post": { "tags": ["Refunds"], "operationId": "requestRefund", "summary": "Request a refund",
        "responses": { "200": { "description": "Refund request created" } } }
    },
    "/paywall/v1/refunds/approve": {
      "post": { "tags": ["Refunds"], "operationId": "approveRefund", "summary": "Approve a refund",
        "responses": { "200": { "description": "Refund approved" } } }
    },
    "/paywall/v1/refunds/deny": {
      "post": { "tags": ["Refunds"], "operationId": "denyRefund", "summary": "Deny a refund",
        "responses": { "200": { "description": "Refund denied" } } }
    },
    "/paywall/v1/refunds/pending": {
      "post": { "tags": ["Refunds"], "operationId": "listPendingRefunds", "summary": "List pending refunds",
        "responses": { "200": { "description": "Pending refunds" } } }
    },
    "/paywall/v1/refunds/{refundId}": {
      "get": { "tags": ["Refunds"], "operationId": "getRefund", "summary": "Get refund details",
        "parameters": [{ "name": "refundId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Refund details" } } }
    },
    "/paywall/v1/nonce": {
      "post": { "tags": ["Refunds"], "operationId": "createNonce", "summary": "Create refund nonce",
        "responses": { "200": { "description": "Nonce created" } } }
    },
    "/paywall/v1/subscription/status": {
      "get": { "tags": ["Subscriptions"], "operationId": "subscriptionStatus", "summary": "Get subscription status",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Subscription status" } } }
    },
    "/paywall/v1/subscription/details": {
      "get": { "tags": ["Subscriptions"], "operationId": "subscriptionDetails", "summary": "Get subscription details",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Subscription details" } } }
    },
    "/paywall/v1/subscription/stripe-session": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionStripeSession", "summary": "Create Stripe subscription session",
        "responses": { "200": { "description": "Stripe session URL" } } }
    },
    "/paywall/v1/subscription/quote": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionQuote", "summary": "Get subscription x402 quote",
        "responses": { "402": { "description": "Payment required with quote" } } }
    },
    "/paywall/v1/subscription/x402/activate": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionX402Activate", "summary": "Activate via x402",
        "responses": { "200": { "description": "Subscription activated" } } }
    },
    "/paywall/v1/subscription/credits/activate": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionCreditsActivate", "summary": "Activate via credits",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Subscription activated" } } }
    },
    "/paywall/v1/subscription/cancel": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionCancel", "summary": "Cancel subscription",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Subscription cancelled" } } }
    },
    "/paywall/v1/subscription/portal": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionPortal", "summary": "Get billing portal URL",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Portal URL" } } }
    },
    "/paywall/v1/subscription/change/preview": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionChangePreview", "summary": "Preview plan change",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Prorated change preview" } } }
    },
    "/paywall/v1/subscription/change": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionChange", "summary": "Change plan",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Plan changed" } } }
    },
    "/paywall/v1/subscription/reactivate": {
      "post": { "tags": ["Subscriptions"], "operationId": "subscriptionReactivate", "summary": "Reactivate subscription",
        "security": [{ "bearerAuth": [] }],
        "responses": { "200": { "description": "Subscription reactivated" } } }
    },
    "/paywall/v1/chat": {
      "post": { "tags": ["Chat"], "operationId": "chat", "summary": "Send message to AI shopping assistant",
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ChatMessage" } } } },
        "responses": { "200": { "description": "Chat response with products and FAQs",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ChatResponse" } } } } } }
    },
    "/paywall/v1/gift-card/claim/{token}": {
      "get": { "tags": ["GiftCards"], "operationId": "getGiftCardClaim", "summary": "Get gift card claim info",
        "parameters": [{ "name": "token", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Gift card claim details" } } },
      "post": { "tags": ["GiftCards"], "operationId": "claimGiftCard", "summary": "Claim a gift card",
        "parameters": [{ "name": "token", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Gift card claimed" } } }
    },
    "/paywall/v1/gift-card/balance/{code}": {
      "get": { "tags": ["GiftCards"], "operationId": "giftCardBalance", "summary": "Check gift card balance",
        "parameters": [{ "name": "code", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Gift card balance" } } }
    },
    "/paywall/v1/asset-redemption/{productId}/form": {
      "get": { "tags": ["AssetRedemptions"], "operationId": "getRedemptionForm", "summary": "Get redemption form",
        "parameters": [{ "name": "productId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Redemption form schema" } } }
    },
    "/paywall/v1/asset-redemption/{productId}/submit": {
      "post": { "tags": ["AssetRedemptions"], "operationId": "submitRedemption", "summary": "Submit redemption",
        "parameters": [{ "name": "productId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Redemption submitted" } } }
    },
    "/paywall/v1/asset-redemption/{productId}/status": {
      "get": { "tags": ["AssetRedemptions"], "operationId": "getRedemptionStatus", "summary": "Get redemption status",
        "parameters": [{ "name": "productId", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "200": { "description": "Redemption status" } } }
    },
    "/paywall/v1/shop": {
      "get": { "tags": ["Storefront"], "operationId": "getShop", "summary": "Get shop configuration",
        "responses": { "200": { "description": "Shop config" } } }
    },
    "/paywall/v1/storefront": {
      "get": { "tags": ["Storefront"], "operationId": "getStorefront", "summary": "Get storefront configuration",
        "responses": { "200": { "description": "Storefront config" } } }
    },
    "/paywall/v1/gasless-transaction": {
      "post": { "tags": ["Payment"], "operationId": "gaslessTransaction", "summary": "Build gasless Solana transaction",
        "responses": { "200": { "description": "Serialized transaction" } } }
    },
    "/paywall/v1/derive-token-account": {
      "post": { "tags": ["Payment"], "operationId": "deriveTokenAccount", "summary": "Derive token account address",
        "responses": { "200": { "description": "Token account address" } } }
    },
    "/paywall/v1/blockhash": {
      "get": { "tags": ["Payment"], "operationId": "getBlockhash", "summary": "Get current Solana blockhash",
        "responses": { "200": { "description": "Recent blockhash" } } }
    }
  }
}"##;
