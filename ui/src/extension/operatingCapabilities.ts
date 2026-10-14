import { cedrosPayShippingCapabilities } from './shippingCapabilities';
import type { CedrosExtensionAiCapability } from './types';
import { physicalProductSchema, physicalProductPatchSchema } from './operatingSchemas';

export const cedrosPayOperatingCapabilities: CedrosExtensionAiCapability[] = [
  {
    "id": "cedros-pay:storefront-products-query",
    "name": "Query Storefront Catalog",
    "description": "Read bounded product catalog pages with current revisions and safe public fields, including inactive records; does not expose metadata or purchase actions.",
    "kind": "tool",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/products/query"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "productId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10000
        }
      }
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "products": {
          "type": "array",
          "items": {
            "type": "object"
          }
        },
        "total": {
          "type": "integer",
          "minimum": 0
        },
        "hasMore": {
          "type": "boolean"
        }
      },
      "required": [
        "products",
        "total",
        "hasMore"
      ]
    }
  },
  {
    "id": "cedros-pay:physical-product-create",
    "name": "Create Physical Product",
    "description": "Create a standard physical good using an existing active shipping profile, bounded public catalog fields and fiat prices. No digital offers, subscriptions, crypto, checkout or payment execution.",
    "kind": "action",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/products/create"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "physicalGoods": {
          "type": "boolean",
          "const": true
        },
        "shippingProfileId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "product": physicalProductSchema
      },
      "required": [
        "physicalGoods",
        "shippingProfileId",
        "product"
      ]
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "created": {
          "type": "boolean",
          "const": true
        },
        "product": {
          "type": "object"
        }
      },
      "required": [
        "created",
        "product"
      ]
    }
  },
  {
    "id": "cedros-pay:physical-product-update",
    "name": "Update Physical Product",
    "description": "Apply a revision-guarded public-field patch to a verified standard physical good with an active shipping profile. Private metadata, inventory and provider settings are preserved.",
    "kind": "action",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/products/update"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "productId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "expectedVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "patch": physicalProductPatchSchema
      },
      "required": [
        "productId",
        "expectedVersion",
        "patch"
      ]
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "updated": {
          "type": "boolean",
          "const": true
        },
        "product": {
          "type": "object"
        }
      },
      "required": [
        "updated",
        "product"
      ]
    }
  },
  {
    "id": "cedros-pay:physical-product-delete",
    "name": "Delete Physical Product",
    "description": "Delete a verified physical product after explicit confirmation and exact catalog-version review. Authoritative stock prevents deletion. This does not cancel orders or refund payments.",
    "kind": "action",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/products/delete"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "productId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "expectedVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "confirmed": {
          "type": "boolean",
          "const": true
        }
      },
      "required": [
        "productId",
        "expectedVersion",
        "confirmed"
      ]
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "productId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "deleted": {
          "type": "boolean"
        }
      },
      "required": [
        "productId",
        "deleted"
      ]
    }
  },
  {
    "id": "cedros-pay:orders-query",
    "name": "Query Orders",
    "description": "Read a bounded keyset page of durable orders and independent payment/fulfillment status without exposing payment references, buyer credentials or wallet data.",
    "kind": "tool",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/orders/query"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "after": {
          "type": "string",
          "pattern": "^order_[a-f0-9]{64}$"
        }
      }
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "items": {
          "type": "array",
          "maxItems": 25,
          "items": {
            "type": "object"
          }
        },
        "nextAfter": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^order_[a-f0-9]{64}$"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "items",
        "nextAfter"
      ]
    }
  },
  {
    "id": "cedros-pay:order-get",
    "name": "Read Order",
    "description": "Read one durable order with safe line details, exact fulfillment version and delivered quantities. Viewing never reconciles payments or writes.",
    "kind": "tool",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/orders/get"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "orderId": {
          "type": "string",
          "pattern": "^order_[a-f0-9]{64}$"
        }
      },
      "required": [
        "orderId"
      ]
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "item": {
          "type": "object"
        },
        "version": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "cancelled": {
          "type": "boolean"
        },
        "lines": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object"
          }
        }
      },
      "required": [
        "item",
        "version",
        "cancelled",
        "lines"
      ]
    }
  },
  {
    "id": "cedros-pay:physical-order-fulfillment",
    "name": "Update Physical Order Fulfillment",
    "description": "Update cumulative delivered quantities or cancel physical order fulfillment using exact revision and durable actor-bound idempotency. Does not charge, refund, transfer money, purchase shipping or fulfill digital orders.",
    "kind": "action",
    "tags": [
      "catalog",
      "orders",
      "physical-goods"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/orders/fulfillment"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "orderId": {
          "type": "string",
          "pattern": "^order_[a-f0-9]{64}$"
        },
        "expectedVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "delivered": {
          "type": "array",
          "minItems": 1,
          "maxItems": 100,
          "items": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          }
        },
        "cancelled": {
          "type": "boolean"
        }
      },
      "required": [
        "orderId",
        "expectedVersion",
        "delivered",
        "cancelled"
      ]
    },
    "outputSchema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "orderId": {
          "type": "string",
          "pattern": "^order_[a-f0-9]{64}$"
        },
        "cancelled": {
          "type": "boolean"
        },
        "lines": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object"
          }
        }
      },
      "required": [
        "orderId",
        "cancelled",
        "lines"
      ]
    }
  },
  ...cedrosPayShippingCapabilities,
];
