"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDistributionChannel = detectDistributionChannel;
const react_native_1 = require("react-native");
/**
 * Safe auto-detection helper.
 *
 * We intentionally avoid mapping iOS -> Apple App Store or Android -> Google
 * Play because that is not a reliable store policy signal.
 */
function detectDistributionChannel() {
    if (react_native_1.Platform.OS === 'web') {
        return 'web';
    }
    return 'unknown';
}
//# sourceMappingURL=detectDistributionChannel.js.map