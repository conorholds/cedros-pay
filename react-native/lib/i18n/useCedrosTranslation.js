"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCedrosTranslation = useCedrosTranslation;
const context_1 = require("../context");
const useTranslation_1 = require("./useTranslation");
/**
 * Reads the locale override from CedrosProvider before falling back to device
 * locale detection.
 */
function useCedrosTranslation() {
    const context = (0, context_1.useCedrosContext)();
    return (0, useTranslation_1.useTranslation)(context.config?.locale);
}
//# sourceMappingURL=useCedrosTranslation.js.map