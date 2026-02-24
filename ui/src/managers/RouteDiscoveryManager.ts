import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { getLogger } from '../utils/logger';
import {
  RouteDiscoveryManagerCore,
  type IRouteDiscoveryManager,
} from '../../shared/route-discovery-core';

export type { IRouteDiscoveryManager };

export class RouteDiscoveryManager
  extends RouteDiscoveryManagerCore
  implements IRouteDiscoveryManager
{
  constructor(serverUrl: string) {
    super(serverUrl, { getLogger, fetchWithTimeout });
  }
}
