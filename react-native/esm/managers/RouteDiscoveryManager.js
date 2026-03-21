import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { getLogger } from '../utils/logger';
import { RouteDiscoveryManagerCore, } from '../shared/route-discovery-core';
export class RouteDiscoveryManager extends RouteDiscoveryManagerCore {
    constructor(serverUrl) {
        super(serverUrl, { getLogger, fetchWithTimeout });
    }
}
//# sourceMappingURL=RouteDiscoveryManager.js.map