"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCedrosPayCheckout = useCedrosPayCheckout;
const react_1 = require("react");
const client_1 = require("./client");
function useCedrosPayCheckout(clientOverride) {
    const client = (0, react_1.useMemo)(() => clientOverride ?? new client_1.CedrosPayCheckout(), [clientOverride]);
    const [state, setState] = (0, react_1.useState)('idle');
    const [outcome, setOutcome] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const sequence = (0, react_1.useRef)(0);
    const mounted = (0, react_1.useRef)(true);
    const active = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => () => { mounted.current = false; active.current?.abort('unmount'); }, []);
    const run = (0, react_1.useCallback)(async (operation) => {
        active.current?.abort('superseded');
        const controller = new AbortController();
        active.current = controller;
        const current = ++sequence.current;
        setState('loading');
        setError(null);
        try {
            const result = await operation(controller.signal);
            if (mounted.current && sequence.current === current) {
                setOutcome(result);
                setState(result.status);
            }
            return result;
        }
        catch (cause) {
            const nextError = cause instanceof Error ? cause : new Error('Checkout request failed');
            if (mounted.current && sequence.current === current && !controller.signal.aborted) {
                setError(nextError);
                setState('error');
            }
            throw nextError;
        }
        finally {
            if (active.current === controller)
                active.current = null;
        }
    }, []);
    const quote = (0, react_1.useCallback)((request) => run((signal) => client.quote(request, { signal })), [client, run]);
    const checkout = (0, react_1.useCallback)((request) => run((signal) => client.checkout(request, { signal })), [client, run]);
    const status = (0, react_1.useCallback)((request) => client.status(request), [client]);
    const verifyReturn = (0, react_1.useCallback)((request) => client.verifyReturn(request), [client]);
    const descriptor = (0, react_1.useCallback)(() => client.descriptor(), [client]);
    const reset = (0, react_1.useCallback)(() => {
        active.current?.abort('reset');
        sequence.current += 1;
        setState('idle');
        setOutcome(null);
        setError(null);
    }, []);
    return { client, state, outcome, error, descriptor, quote, checkout, status, verifyReturn, reset };
}
//# sourceMappingURL=useCedrosPayCheckout.js.map