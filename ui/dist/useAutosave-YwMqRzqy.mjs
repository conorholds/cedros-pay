import { useState as g, useRef as n, useCallback as o, useEffect as p } from "react";
function h({
  data: c,
  onSave: i,
  debounceMs: a = 1500,
  savedDurationMs: l = 2e3,
  enabled: f = !0,
  skipInitial: m = !0
}) {
  const [w, e] = g("idle"), [y, s] = g(null), T = n(!0), r = n(null), t = n(null), v = n(c);
  v.current = c;
  const u = o(async () => {
    e("saving"), s(null);
    try {
      await i(v.current), e("saved"), t.current = setTimeout(() => {
        e("idle");
      }, l);
    } catch (d) {
      e("error"), s(d instanceof Error ? d.message : "Save failed");
    }
  }, [i, l]), E = o(async () => {
    r.current && (clearTimeout(r.current), r.current = null), await u();
  }, [u]), S = o(() => {
    e("idle"), s(null);
  }, []);
  return p(() => {
    if (f) {
      if (m && T.current) {
        T.current = !1;
        return;
      }
      return r.current && clearTimeout(r.current), t.current && clearTimeout(t.current), e("pending"), r.current = setTimeout(() => {
        u();
      }, a), () => {
        r.current && clearTimeout(r.current);
      };
    }
  }, [c, f, m, a, u]), p(() => () => {
    r.current && clearTimeout(r.current), t.current && clearTimeout(t.current);
  }, []), { status: w, error: y, saveNow: E, reset: S };
}
export {
  h as u
};
