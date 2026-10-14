import type { CedrosExtensionAiCapability } from './types';

export const capacityAdminCapabilities: CedrosExtensionAiCapability[] = [
  {
    "id": "cedros-pay:capacity-read",
    "name": "Read Capacity Billing Bindings",
    "description": "Read billing configuration, revision, an optional organization binding, and redacted entered-coupon eligibility without credentials.",
    "kind": "tool",
    "tags": [
      "capacity",
      "billing"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/capacity/read"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "required": [],
      "properties": {
        "organizationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "couponCode": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "pattern": "^[A-Za-z0-9]+$"
        },
        "couponPercentOff": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 100
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "config",
        "binding",
        "committedRevision"
      ],
      "properties": {
        "config": {
          "type": [
            "object",
            "null"
          ]
        },
        "binding": {
          "type": [
            "object",
            "null"
          ]
        },
        "committedRevision": {
          "type": [
            "string",
            "null"
          ]
        },
        "couponInspection": {
          "type": "object"
        }
      },
      "additionalProperties": false
    }
  },
  {
    "id": "cedros-pay:capacity-configure",
    "name": "Configure Capacity Billing",
    "description": "Configure installation identity and cancellation portal using atomic configuration revision checks. Preserves organizations and sales gates.",
    "kind": "action",
    "tags": [
      "capacity",
      "billing"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/capacity/configure"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "required": [
        "mutationId",
        "expectedRevision",
        "payInstallationId",
        "portalOrigin",
        "recoveryPath"
      ],
      "properties": {
        "mutationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[A-Za-z0-9._:-]+$"
        },
        "expectedRevision": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 100
        },
        "description": {
          "type": "string",
          "maxLength": 500
        },
        "payInstallationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "portalOrigin": {
          "type": "string",
          "maxLength": 250
        },
        "recoveryPath": {
          "type": "string",
          "maxLength": 200
        },
        "stripePortalConfigurationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "committedRevision",
        "updated"
      ],
      "properties": {
        "committedRevision": {
          "type": [
            "string",
            "null"
          ]
        },
        "updated": {
          "type": "boolean"
        }
      },
      "additionalProperties": false
    }
  },
  {
    "id": "cedros-pay:capacity-enroll",
    "name": "Enroll Capacity Billing Organization",
    "description": "Verify an existing paid base subscription with Stripe and derive included sites from its catalog entitlement. No editable site quota. Enrollment requires subsequent joint acceptance.",
    "kind": "action",
    "tags": [
      "capacity",
      "billing"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/capacity/enroll"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "required": [
        "mutationId",
        "expectedRevision",
        "organizationId",
        "customerRef",
        "baseSubscriptionIds",
        "canonicalSiteIds",
        "commercialApprovalId"
      ],
      "properties": {
        "mutationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[A-Za-z0-9._:-]+$"
        },
        "expectedRevision": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 100
        },
        "description": {
          "type": "string",
          "maxLength": 500
        },
        "organizationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "customerRef": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "baseSubscriptionIds": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "minItems": 1,
          "maxItems": 1000,
          "uniqueItems": true
        },
        "canonicalSiteIds": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "maxItems": 1000,
          "uniqueItems": true
        },
        "commercialApprovalId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "committedRevision",
        "updated"
      ],
      "properties": {
        "committedRevision": {
          "type": [
            "string",
            "null"
          ]
        },
        "updated": {
          "type": "boolean"
        }
      },
      "additionalProperties": false
    }
  },
  {
    "id": "cedros-pay:capacity-activate",
    "name": "Activate Capacity Billing Organization",
    "description": "Enable or disable an enrolled organization after operator-attested joint host and Portal acceptance. Verifies catalog, Stripe price, customer, and base binding before enabling.",
    "kind": "action",
    "tags": [
      "capacity",
      "billing"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/capacity/activate"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "required": [
        "mutationId",
        "expectedRevision",
        "organizationId",
        "acceptanceReference",
        "enabled"
      ],
      "properties": {
        "mutationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[A-Za-z0-9._:-]+$"
        },
        "expectedRevision": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 100
        },
        "description": {
          "type": "string",
          "maxLength": 500
        },
        "organizationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "acceptanceReference": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "enabled": {
          "type": "boolean"
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "committedRevision",
        "updated"
      ],
      "properties": {
        "committedRevision": {
          "type": [
            "string",
            "null"
          ]
        },
        "updated": {
          "type": "boolean"
        }
      },
      "additionalProperties": false
    }
  },
  {
    "id": "cedros-pay:capacity-coupon-ensure",
    "name": "Ensure Extra Site Stripe Coupon",
    "description": "Create or verify a customer-scoped, site-product-scoped forever Stripe promotion code. It must be entered separately at add-on checkout.",
    "kind": "action",
    "tags": [
      "capacity",
      "billing"
    ],
    "visibility": "admin",
    "endpoint": {
      "method": "POST",
      "path": "/extensions/cedros-pay/admin/capacity/coupon-ensure"
    },
    "auth": {
      "schemes": [
        "bearer-token"
      ]
    },
    "inputSchema": {
      "type": "object",
      "required": [
        "organizationId",
        "code",
        "percentOff"
      ],
      "properties": {
        "organizationId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "code": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64,
          "pattern": "^[A-Za-z0-9]+$"
        },
        "percentOff": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      },
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "required": [
        "created",
        "promotionCodeId",
        "code",
        "couponId",
        "percentOff",
        "duration",
        "customerId",
        "productIds"
      ],
      "properties": {
        "created": {
          "type": "boolean"
        },
        "promotionCodeId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "code": {
          "type": "string"
        },
        "couponId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "percentOff": {
          "type": "number"
        },
        "duration": {
          "type": "string",
          "const": "forever"
        },
        "customerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "productIds": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          }
        }
      },
      "additionalProperties": false
    }
  }
];
