export const physicalProductSchema = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[A-Za-z0-9._-]+$"
    },
    "slug": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "price": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "amountCents": {
          "type": "integer",
          "minimum": 1,
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
        }
      },
      "required": [
        "amountCents",
        "currency"
      ]
    },
    "productType": {
      "const": "standard"
    },
    "active": {
      "type": "boolean"
    },
    "public": {
      "type": "boolean"
    },
    "featured": {
      "type": "boolean"
    },
    "description": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 5000
    },
    "shortDescription": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500
    },
    "seoTitle": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "seoDescription": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500
    },
    "brand": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "sku": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "gtin": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "mpn": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "imageAlt": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "inventoryStatus": {
      "type": "string",
      "enum": [
        "in_stock",
        "out_of_stock",
        "backorder",
        "preorder",
        "unknown"
      ]
    },
    "condition": {
      "type": "string",
      "enum": [
        "new",
        "used",
        "refurbished"
      ]
    },
    "tags": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "string",
        "maxLength": 50
      }
    },
    "categoryIds": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "string",
        "maxLength": 80
      }
    },
    "imageUrls": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "string",
        "maxLength": 2048
      }
    },
    "imageWidth": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 1,
      "maximum": 100000
    },
    "imageHeight": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 1,
      "maximum": 100000
    },
    "categories": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
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
          "slug": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "parentId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 120
          },
          "bannerImageUrl": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 2048
          }
        },
        "required": [
          "id",
          "name",
          "slug"
        ]
      }
    }
  },
  "required": [
    "id",
    "slug",
    "title",
    "price",
    "productType",
    "active",
    "public"
  ]
};

export const physicalProductPatchSchema = { ...physicalProductSchema, required: [], minProperties: 1, properties: Object.fromEntries(Object.entries(physicalProductSchema.properties).filter(([key])=>key!=='id')) };
