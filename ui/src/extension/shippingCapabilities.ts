import type { CedrosExtensionAiCapability } from './types';

export const cedrosPayShippingCapabilities: CedrosExtensionAiCapability[] = [
  {
    "id": "cedros-pay:shipping-setup-query",
    "name": "Inspect Shipping Setup",
    "description": "Discover exact shipping profile IDs and revisions, optional rate pages, and missing/inactive/rates-required setup state. This is read-only and performs no carrier or payment calls.",
    "kind": "tool",
    "tags": [
      "physical-goods",
      "shipping",
      "setup"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/shipping/query"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "profileId": {
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
        },
        "rateOffset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10000
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "missing",
            "choose_profile",
            "inactive",
            "rates_required",
            "configured"
          ]
        },
        "profiles": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object"
          }
        },
        "rates": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object"
          }
        },
        "total": {
          "type": "integer",
          "minimum": 0
        },
        "ratesTotal": {
          "type": "integer",
          "minimum": 0
        },
        "hasMore": {
          "type": "boolean"
        },
        "hasMoreRates": {
          "type": "boolean"
        },
        "canCreatePhysicalProduct": {
          "type": "boolean"
        },
        "hasActiveFlatRates": {
          "type": "boolean"
        },
        "nextAction": {
          "type": "string"
        }
      },
      "additionalProperties": false,
      "required": [
        "status",
        "profiles",
        "nextAction"
      ]
    }
  },
  {
    "id": "cedros-pay:shipping-profile-save",
    "name": "Save Shipping Profile",
    "description": "Create or revise an approved physical shipping profile using the existing normalized shipping service. expectedVersion must be null for creation or the exact discovered version for update. No carrier purchase or financial transfer.",
    "kind": "action",
    "tags": [
      "physical-goods",
      "shipping",
      "setup"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/shipping/profile"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "expectedVersion": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ]
        },
        "profile": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120,
              "pattern": "^[A-Za-z0-9._-]+$"
            },
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            "description": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 2000
            },
            "countries": {
              "type": "array",
              "minItems": 1,
              "maxItems": 250,
              "uniqueItems": true,
              "items": {
                "type": "string",
                "pattern": "^[A-Za-z]{2}$"
              }
            },
            "active": {
              "type": "boolean"
            }
          },
          "additionalProperties": false,
          "required": [
            "id",
            "name",
            "countries",
            "active"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "expectedVersion",
        "profile"
      ]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "created": {
          "type": "boolean"
        },
        "profile": {
          "type": "object"
        }
      },
      "additionalProperties": false,
      "required": [
        "created",
        "profile"
      ]
    }
  },
  {
    "id": "cedros-pay:shipping-rate-save",
    "name": "Save Flat Shipping Rate",
    "description": "Configure an approved fiat flat shipping rate for an existing active profile. Exact profile and rate versions are checked atomically; unavailable weight/price basis, crypto currencies and cross-profile reassignment are rejected.",
    "kind": "action",
    "tags": [
      "physical-goods",
      "shipping",
      "setup"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/assistant/shipping/rate"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "profileId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[A-Za-z0-9._-]+$"
        },
        "expectedProfileVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "expectedVersion": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ]
        },
        "rate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120,
              "pattern": "^[A-Za-z0-9._-]+$"
            },
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            "rateType": {
              "type": "string",
              "const": "flat"
            },
            "amountCents": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000
            },
            "currency": {
              "type": "string",
              "enum": [
                "USD",
                "EUR",
                "GBP",
                "AUD",
                "CAD",
                "NZD",
                "CHF",
                "SGD",
                "HKD"
              ]
            },
            "minSubtotal": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 100000000
            },
            "maxSubtotal": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 100000000
            },
            "active": {
              "type": "boolean"
            }
          },
          "additionalProperties": false,
          "required": [
            "id",
            "name",
            "rateType",
            "amountCents",
            "currency",
            "active"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "profileId",
        "expectedProfileVersion",
        "expectedVersion",
        "rate"
      ]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "created": {
          "type": "boolean"
        },
        "rate": {
          "type": "object"
        }
      },
      "additionalProperties": false,
      "required": [
        "created",
        "rate"
      ]
    }
  }
];
