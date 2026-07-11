import { jsxs as M, jsx as p } from "react/jsx-runtime";
import { useMemo as F, createContext as ee, useContext as ne, useState as I, useCallback as S, useEffect as D, useRef as s } from "react";
const re = {
  idle: "",
  dirty: "Unsaved changes",
  debouncing: "Unsaved changes",
  queued: "Unsaved changes",
  saving: "Saving...",
  saved: "Saved just now",
  retrying: "Saving...",
  offline: "Offline - changes will sync",
  conflict: "Conflict - review changes",
  failed: "Save failed - retry"
};
function te(e) {
  return re[e];
}
function Ke({
  className: e,
  status: r
}) {
  return r === "idle" ? null : /* @__PURE__ */ p(
    "span",
    {
      className: e,
      role: "status",
      "aria-atomic": "true",
      "aria-live": ie(r),
      children: te(r)
    }
  );
}
function ze({
  error: e,
  onRetry: r,
  status: n
}) {
  if (n !== "failed") return null;
  const t = e instanceof Error ? e.message : "Your changes were not saved.";
  return /* @__PURE__ */ M("div", { className: "cedros-autosave-retry", role: "alert", children: [
    /* @__PURE__ */ p("span", { children: t }),
    /* @__PURE__ */ p("button", { type: "button", onClick: r, children: "Retry" })
  ] });
}
function $e({
  children: e,
  onDiscard: r,
  onReview: n,
  open: t,
  title: i = "Conflict - review changes"
}) {
  return t ? /* @__PURE__ */ M(
    "div",
    {
      className: "cedros-autosave-conflict",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "cedros-autosave-conflict-title",
      children: [
        /* @__PURE__ */ p("h2", { id: "cedros-autosave-conflict-title", children: i }),
        e,
        /* @__PURE__ */ M("div", { children: [
          /* @__PURE__ */ p("button", { type: "button", onClick: n, children: "Review changes" }),
          /* @__PURE__ */ p("button", { type: "button", onClick: r, children: "Discard local changes" })
        ] })
      ]
    }
  ) : null;
}
function ie(e) {
  return e === "debouncing" || e === "dirty" ? "off" : "polite";
}
const ue = "cedros-autosave", C = "drafts", oe = 1;
function W(e = "cedros:autosave") {
  return ae(e);
}
function ae(e = "cedros:autosave") {
  const r = Y(e);
  let n = null;
  async function t() {
    return n ??= ce().catch(() => null), n;
  }
  return {
    async load(i) {
      const u = await t();
      return u ? se(u, g(e, i)) : r.load(i);
    },
    async save(i, u) {
      const o = await t();
      if (!o) return r.save(i, u);
      await de(o, g(e, i), u);
    },
    async remove(i) {
      const u = await t();
      if (!u) return r.remove(i);
      await le(u, g(e, i));
    }
  };
}
function Je(e = "cedros:autosave") {
  const r = Y(e);
  return {
    async load(n) {
      const t = _();
      if (!t) return r.load(n);
      const i = t.getItem(g(e, n));
      if (!i) return null;
      try {
        return JSON.parse(i);
      } catch {
        return t.removeItem(g(e, n)), null;
      }
    },
    async save(n, t) {
      const i = _();
      if (!i) return r.save(n, t);
      i.setItem(g(e, n), JSON.stringify(t));
    },
    async remove(n) {
      const t = _();
      if (!t) return r.remove(n);
      t.removeItem(g(e, n));
    }
  };
}
function Y(e = "cedros:autosave") {
  const r = /* @__PURE__ */ new Map();
  return {
    async load(n) {
      return r.get(g(e, n)) ?? null;
    },
    async save(n, t) {
      r.set(g(e, n), t);
    },
    async remove(n) {
      r.delete(g(e, n));
    }
  };
}
function ce() {
  return typeof indexedDB > "u" ? Promise.resolve(null) : new Promise((e, r) => {
    const n = indexedDB.open(ue, oe);
    n.onerror = () => r(n.error), n.onsuccess = () => e(n.result), n.onupgradeneeded = () => {
      const t = n.result;
      t.objectStoreNames.contains(C) || t.createObjectStore(C, { keyPath: "key" });
    };
  });
}
function se(e, r) {
  return q(e, "readonly", (n) => n.get(r)).then(
    (n) => n ? n.draft ?? null : null
  );
}
function de(e, r, n) {
  return q(
    e,
    "readwrite",
    (t) => t.put({ key: r, draft: n, updatedAt: n.updatedAt })
  ).then(() => {
  });
}
function le(e, r) {
  return q(e, "readwrite", (n) => n.delete(r)).then(
    () => {
    }
  );
}
function q(e, r, n) {
  return new Promise((t, i) => {
    const u = e.transaction(C, r), o = n(u.objectStore(C));
    let d;
    o.onerror = () => i(o.error), o.onsuccess = () => {
      d = o.result;
    }, u.onerror = () => i(u.error), u.oncomplete = () => t(d);
  });
}
function g(e, r) {
  return `${e}:${r}`;
}
function _() {
  if (typeof window > "u") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const G = {
  text: 800,
  longDraft: 1200,
  selectToggle: 150,
  background: 2e3,
  control: 150,
  none: 0
}, X = ee({
  debounceProfiles: G,
  editingSessionId: L(),
  persistence: W(),
  createId: L
});
function L() {
  return typeof crypto < "u" && "randomUUID" in crypto ? crypto.randomUUID() : `autosave_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
function Qe({
  children: e,
  debounceProfiles: r,
  editingSessionId: n,
  persistence: t,
  telemetry: i
}) {
  const u = F(
    () => ({
      debounceProfiles: {
        ...G,
        ...r
      },
      editingSessionId: n ?? L(),
      persistence: t ?? W(),
      telemetry: i,
      createId: L
    }),
    [r, n, t, i]
  );
  return /* @__PURE__ */ p(X.Provider, { value: u, children: e });
}
function fe(e, r, n) {
  return Z(e.makePatch(r.confirmed.current, n));
}
function Z(e) {
  return e == null ? !1 : Array.isArray(e) ? e.length > 0 : typeof e == "object" ? Object.keys(e).length > 0 : !0;
}
async function ve(e, r) {
  const n = await e.validatePatch?.(r);
  return n ? typeof n == "string" ? n : "ok" in n ? n.ok ? null : n.message : n.valid ? null : n.reason ?? "Autosave patch is invalid" : null;
}
function ye(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.keys(e);
}
function ge(e, r) {
  const n = e.debounceProfile ?? "text";
  return n === "control" ? r.selectToggle : typeof n == "number" ? n : r[n];
}
function me(e, r, n) {
  if (T() === "offline") return !1;
  const t = e.maxRetries ?? 2;
  return n >= t ? !1 : e.isRetryableError?.(r) ?? Ee(B(r));
}
function be(e) {
  const r = B(e);
  return r === 409 || r === 412;
}
function B(e) {
  if (!e || typeof e != "object" || !("status" in e)) return null;
  const r = e.status;
  return typeof r == "number" ? r : null;
}
function E(e, r) {
  U(e), e.confirmed.current = r, e.pendingDraft.current = null;
}
function we(e) {
  U(e), e.abort.current?.abort();
}
function U(e) {
  w(e.debounceTimer), w(e.retryTimer), w(e.savedTimer);
}
function w(e) {
  e.current && clearTimeout(e.current), e.current = null;
}
async function he(e, r, n, t) {
  const i = r.persistenceKey;
  if (!i || !e.persistence) return;
  const u = {
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    extensionId: r.extensionId,
    draft: t,
    baseRevision: n.baseRevision.current,
    etag: n.etag.current,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await e.persistence.save(i, u);
}
function Se(e, r, n) {
  if (!r.persistenceKey || !e.persistence) return;
  let t = !1;
  return e.persistence.load(r.persistenceKey).then((i) => {
    t || !i || (n(i.draft), r.onRestore?.(i.draft), x(e, r, "autosave_local_restore", "dirty", 1));
  }), () => {
    t = !0;
  };
}
function pe(e, r, n) {
  if (typeof window > "u") return;
  const t = () => {
    e.pendingDraft.current !== null && (r("queued", { event: "autosave_resumed" }), n());
  }, i = () => {
    (e.pendingDraft.current !== null || e.inFlight.current) && r("offline");
  };
  return window.addEventListener("online", t), window.addEventListener("offline", i), () => {
    window.removeEventListener("online", t), window.removeEventListener("offline", i);
  };
}
function De(e, r, {
  flushOnBlur: n = !0,
  flushOnPageLifecycle: t = !0,
  warnOnUnload: i = !0
}) {
  if (typeof window > "u" || typeof document > "u") return;
  const u = () => {
    H(e) && r();
  }, o = () => {
    document.visibilityState === "hidden" && u();
  }, d = (c) => {
    H(e) && (c.preventDefault(), c.returnValue = "");
  };
  return n && document.addEventListener("focusout", u), t && (document.addEventListener("visibilitychange", o), window.addEventListener("pagehide", u)), i && window.addEventListener("beforeunload", d), () => {
    document.removeEventListener("focusout", u), document.removeEventListener("visibilitychange", o), window.removeEventListener("pagehide", u), window.removeEventListener("beforeunload", d);
  };
}
function Pe(e, r, n, t, i = {}) {
  x(
    e,
    r,
    i.event ?? Ae(t),
    t,
    V(n),
    n,
    i
  );
}
function Ie(e, r, n) {
  x(
    e,
    r,
    "autosave_manual_flush",
    n.status.current,
    V(n),
    n
  );
}
function x(e, r, n, t, i, u, o = {}) {
  e.telemetry?.({
    event: n,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    extensionId: r.extensionId,
    status: t,
    retryCount: u?.retryCount.current ?? 0,
    queueDepth: i,
    networkState: T(),
    ...o
  });
}
function Te(e) {
  const r = JSON.stringify(e).length;
  return r <= 1024 ? "0-1kb" : r <= 10 * 1024 ? "1-10kb" : r <= 100 * 1024 ? "10-100kb" : "100kb+";
}
function T() {
  return typeof navigator > "u" ? "unknown" : navigator.onLine ? "online" : "offline";
}
function Re(e) {
  return !["idle", "saved"].includes(e);
}
function H(e) {
  return e.pendingDraft.current !== null || e.inFlight.current || ["dirty", "debouncing", "queued", "saving", "retrying", "offline", "conflict", "failed"].includes(e.status.current);
}
function k() {
  return typeof performance > "u" ? Date.now() : performance.now();
}
function N(e) {
  return `${e.resourceType}:${e.resourceId}`;
}
function Ee(e) {
  return e === 408 || e === 429 || e !== null && e >= 500;
}
function Ae(e) {
  return e === "saving" ? "autosave_started" : e === "saved" ? "autosave_succeeded" : e === "failed" ? "autosave_failed" : e === "retrying" ? "autosave_retrying" : e === "conflict" ? "autosave_conflict" : e === "offline" ? "autosave_offline_paused" : e === "queued" ? "autosave_queued" : "autosave_dirty";
}
function V(e) {
  return e.pendingDraft.current === null ? 0 : 1;
}
const A = /* @__PURE__ */ new Map();
async function Ce({
  context: e,
  draft: r,
  drainQueue: n,
  options: t,
  refs: i,
  setLastError: u,
  setLastSavedAt: o,
  setRetryCount: d,
  transition: c
}) {
  const m = N(t), v = await Le(m, i, r, c);
  if (v === null) return;
  let y;
  try {
    y = await Oe(t, e, i, v);
  } catch (h) {
    i.pendingDraft.current = v, i.inFlight.current = !1, u(h), t.onPermanentFailure?.(h, v), c("failed", { payloadSizeBucket: "unknown" });
    return;
  }
  if (!y) {
    E(i, v), c("idle");
    return;
  }
  i.pendingDraft.current = null, i.inFlight.current = !0, c(i.retryCount.current > 0 ? "retrying" : "saving", {
    payloadSizeBucket: y.payloadSizeBucket
  });
  const b = _e(y, v, {
    context: e,
    drainQueue: n,
    options: t,
    refs: i,
    setLastError: u,
    setLastSavedAt: o,
    setRetryCount: d,
    transition: c
  });
  i.activeSave.current = b, ke(m, b), await b, i.activeSave.current = null;
}
async function Le(e, r, n, t) {
  const i = A.get(e);
  return i ? (t("queued"), await i.catch(() => {
  }), r.pendingDraft.current ?? n) : n;
}
function ke(e, r) {
  const n = r.finally(() => {
    A.get(e) === n && A.delete(e);
  });
  A.set(e, n);
}
async function Oe(e, r, n, t) {
  const i = e.makePatch(n.confirmed.current, t);
  if (!Z(i)) return null;
  const u = e.getUpdateMask?.(i) ?? ye(i), o = u.find((m) => e.blockedFields?.includes(m));
  if (o) throw new Error(`Autosave blocked field: ${o}`);
  const d = await ve(e, i);
  if (d) throw new Error(d);
  const c = new AbortController();
  return n.abort.current = c, {
    patch: i,
    metadata: Be(e, r, n, u, c.signal),
    payloadSizeBucket: Te(i)
  };
}
async function _e(e, r, n) {
  const t = k();
  try {
    const i = await n.options.save(e.patch, e.metadata);
    Me(n, r, i, t);
  } catch (i) {
    Fe(n, r, i, e.payloadSizeBucket, t);
  }
}
function Me(e, r, n, t) {
  const i = n.savedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  e.refs.inFlight.current = !1, n.revision !== void 0 && (e.refs.baseRevision.current = n.revision), n.etag !== void 0 && (e.refs.etag.current = n.etag), e.refs.retryCount.current = 0, e.setRetryCount(0), e.setLastError(null), e.setLastSavedAt(i);
  const u = n.canonicalPatchOrResource ?? r;
  if (e.refs.confirmed.current = u, e.options.onSaved?.({ ...n, savedAt: i }, u), e.refs.pendingDraft.current !== null) {
    e.transition("queued"), e.drainQueue();
    return;
  }
  e.context.persistence?.remove(
    e.options.persistenceKey ?? N(e.options)
  ), e.transition("saved", { durationMs: k() - t, traceId: n.traceId }), w(e.refs.savedTimer), e.refs.savedTimer.current = setTimeout(() => e.transition("idle"), 1500);
}
function Fe(e, r, n, t, i) {
  if (e.refs.inFlight.current = !1, e.refs.pendingDraft.current ??= r, e.setLastError(n), T() === "offline") {
    e.transition("offline", {
      durationMs: k() - i,
      payloadSizeBucket: t
    });
    return;
  }
  if (be(n)) {
    e.options.onConflict?.(n, r), e.transition("conflict", {
      conflictType: String(B(n)),
      payloadSizeBucket: t
    });
    return;
  }
  if (me(e.options, n, e.refs.retryCount.current)) {
    e.refs.retryCount.current += 1, e.setRetryCount(e.refs.retryCount.current), qe(e, t);
    return;
  }
  e.options.onPermanentFailure?.(n, r), e.transition("failed", {
    durationMs: k() - i,
    payloadSizeBucket: t
  });
}
function qe(e, r) {
  const n = e.options.retryDelayMs ?? 1e3;
  e.transition("retrying", { payloadSizeBucket: r }), w(e.refs.retryTimer), e.refs.retryTimer.current = setTimeout(() => {
    e.transition("queued", { payloadSizeBucket: r }), e.drainQueue();
  }, n);
}
function Be(e, r, n, t, i) {
  return n.seq.current += 1, {
    autosave: !0,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    extensionId: e.extensionId,
    baseRevision: n.baseRevision.current,
    etag: n.etag.current,
    clientMutationId: r.createId(),
    editingSessionId: r.editingSessionId,
    clientSeq: n.seq.current,
    updateMask: t,
    idempotencyKey: r.createId(),
    signal: i
  };
}
function He(e) {
  const r = ne(X), n = Ue(e), t = xe(e), [i, u] = I("idle"), [o, d] = I(0), [c, m] = I(null), [v, y] = I(null), [b, h] = I(null), a = S(
    (l, O) => {
      t.status.current = l, u(l), n.current.onStatusChange?.(l), Pe(r, n.current, t, l, O);
    },
    [r, n, t]
  ), P = S(
    (l) => (t.pendingDraft.current = l, he(r, n.current, t, l)),
    [r, n, t]
  ), f = S(async () => {
    if (t.inFlight.current) {
      a("queued");
      return;
    }
    if (t.pendingPersistence.current && !await t.pendingPersistence.current)
      return;
    const l = t.pendingDraft.current;
    if (l !== null) {
      if (T() === "offline") {
        a("offline");
        return;
      }
      await Ce({
        context: r,
        draft: l,
        drainQueue: f,
        options: n.current,
        refs: t,
        setLastError: y,
        setLastSavedAt: m,
        setRetryCount: d,
        transition: a
      });
    }
  }, [r, n, t, a]), j = S(
    (l) => {
      w(t.savedTimer), w(t.debounceTimer);
      const $ = P(l).then(
        () => !0,
        (Q) => (y(Q), n.current.onPermanentFailure?.(Q, l), a("failed"), !1)
      ).finally(() => {
        t.pendingPersistence.current === $ && (t.pendingPersistence.current = null);
      });
      if (t.pendingPersistence.current = $, T() === "offline") {
        a("offline");
        return;
      }
      const J = ge(n.current, r.debounceProfiles);
      a(J > 0 ? "debouncing" : "queued"), t.debounceTimer.current = setTimeout(() => {
        f();
      }, J);
    },
    [r.debounceProfiles, f, n, P, t, a]
  );
  D(() => {
    if (t.draft.current = e.draft, !(e.enabled !== !1)) {
      t.wasEnabled.current = !1, E(t, e.draft);
      return;
    }
    if (!t.wasEnabled.current) {
      t.wasEnabled.current = !0, E(t, e.draft), a("idle");
      return;
    }
    if (!fe(n.current, t, e.draft)) {
      E(t, e.draft), a("idle");
      return;
    }
    j(e.draft);
  }, [e.draft, e.enabled, e.resourceId, e.resourceType, n, t, j, a]), D(() => {
    e.baseRevision !== void 0 && (t.baseRevision.current = e.baseRevision), e.etag !== void 0 && (t.etag.current = e.etag);
  }, [e.baseRevision, e.etag, t]), D(() => Se(r, n.current, h), [r, n]), D(() => pe(t, a, f), [f, t, a]), D(() => () => we(t), [t]);
  const R = S(async () => {
    w(t.debounceTimer), Ie(r, n.current, t), await f(), await t.activeSave.current, await f();
  }, [r, f, n, t]);
  D(
    () => De(t, R, {
      flushOnBlur: e.flushOnBlur,
      flushOnPageLifecycle: e.flushOnPageLifecycle,
      warnOnUnload: e.warnOnUnload
    }),
    [
      R,
      e.flushOnBlur,
      e.flushOnPageLifecycle,
      e.warnOnUnload,
      t
    ]
  );
  const K = S(async () => {
    w(t.retryTimer), a("queued"), await f();
  }, [f, t, a]), z = S(async () => {
    U(t), t.pendingDraft.current = null, t.confirmed.current = t.draft.current, await r.persistence?.remove(n.current.persistenceKey ?? N(n.current)), a("idle", { event: "autosave_discarded", queueDepth: 0 });
  }, [r.persistence, n, t, a]);
  return F(
    () => ({
      status: i,
      retryCount: o,
      isDirty: Re(i),
      lastSavedAt: c,
      lastError: v,
      restoredDraft: b,
      flush: R,
      retry: K,
      discard: z
    }),
    [z, R, v, c, b, K, o, i]
  );
}
function Ue(e) {
  const r = s(e);
  return r.current = e, r;
}
function xe(e) {
  const r = s(null), n = s(null), t = s(e.baseRevision), i = s(e.draft), u = s(null), o = s(e.draft), d = s(e.etag), c = s(!1), m = s(null), v = s(null), y = s(0), b = s(null), h = s(null), a = s(0), P = s("idle"), f = s(e.enabled !== !1);
  return F(
    () => ({
      activeSave: r,
      abort: n,
      baseRevision: t,
      confirmed: i,
      debounceTimer: u,
      draft: o,
      etag: d,
      inFlight: c,
      pendingDraft: m,
      pendingPersistence: v,
      retryCount: y,
      retryTimer: b,
      savedTimer: h,
      seq: a,
      status: P,
      wasEnabled: f
    }),
    [
      n,
      r,
      t,
      i,
      u,
      o,
      d,
      c,
      m,
      v,
      y,
      b,
      h,
      a,
      P,
      f
    ]
  );
}
export {
  $e as A,
  Qe as C,
  G as D,
  ze as a,
  Ke as b,
  te as c,
  L as d,
  W as e,
  ae as f,
  Je as g,
  Y as h,
  He as u
};
