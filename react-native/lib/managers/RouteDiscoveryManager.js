"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteDiscoveryManager = void 0;
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const logger_1 = require("../utils/logger");
const route_discovery_core_1 = require("../shared/route-discovery-core");
class RouteDiscoveryManager extends route_discovery_core_1.RouteDiscoveryManagerCore {
    constructor(serverUrl) {
        super(serverUrl, { getLogger: logger_1.getLogger, fetchWithTimeout: fetchWithTimeout_1.fetchWithTimeout });
    }
}
exports.RouteDiscoveryManager = RouteDiscoveryManager;
//# sourceMappingURL=RouteDiscoveryManager.js.map