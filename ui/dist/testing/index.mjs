import { jsx as Cc, Fragment as zu } from "react/jsx-runtime";
import { C as Wu } from "../CedrosContext-DUT3cLZg.mjs";
var $s = {
  reset: [0, 0],
  bold: [1, 22, "\x1B[22m\x1B[1m"],
  dim: [2, 22, "\x1B[22m\x1B[2m"],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  blackBright: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
  bgBlackBright: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhiteBright: [107, 49]
};
function go(e) {
  return String(e);
}
go.open = "";
go.close = "";
function Vu() {
  let e = typeof process < "u" ? process : void 0, t = e?.env || {}, n = t.FORCE_TTY !== "false", r = e?.argv || [];
  return !("NO_COLOR" in t || r.includes("--no-color")) && ("FORCE_COLOR" in t || r.includes("--color") || e?.platform === "win32" || n && t.TERM !== "dumb" || "CI" in t) || typeof window < "u" && !!window.chrome;
}
function Uu() {
  let e = Vu(), t = (s, i, a, u) => {
    let c = "", l = 0;
    do
      c += s.substring(l, u) + a, l = u + i.length, u = s.indexOf(i, l);
    while (~u);
    return c + s.substring(l);
  }, n = (s, i, a = s) => {
    let u = (c) => {
      let l = String(c), f = l.indexOf(i, s.length);
      return ~f ? s + t(l, i, a, f) + i : s + l + i;
    };
    return u.open = s, u.close = i, u;
  }, r = {
    isColorSupported: e
  }, o = (s) => `\x1B[${s}m`;
  for (let s in $s) {
    let i = $s[s];
    r[s] = e ? n(
      o(i[0]),
      o(i[1]),
      i[2]
    ) : go;
  }
  return r;
}
var ce = Uu();
function Ic(e, t) {
  return t.forEach(function(n) {
    n && typeof n != "string" && !Array.isArray(n) && Object.keys(n).forEach(function(r) {
      if (r !== "default" && !(r in e)) {
        var o = Object.getOwnPropertyDescriptor(n, r);
        Object.defineProperty(e, r, o.get ? o : {
          enumerable: !0,
          get: function() {
            return n[r];
          }
        });
      }
    });
  }), Object.freeze(e);
}
function Ku(e, t) {
  const n = Object.keys(e), r = t === null ? n : n.sort(t);
  if (Object.getOwnPropertySymbols)
    for (const o of Object.getOwnPropertySymbols(e))
      Object.getOwnPropertyDescriptor(e, o).enumerable && r.push(o);
  return r;
}
function rn(e, t, n, r, o, s, i = ": ") {
  let a = "", u = 0, c = e.next();
  if (!c.done) {
    a += t.spacingOuter;
    const l = n + t.indent;
    for (; !c.done; ) {
      if (a += l, u++ === t.maxWidth) {
        a += "…";
        break;
      }
      const f = s(c.value[0], t, l, r, o), h = s(c.value[1], t, l, r, o);
      a += f + i + h, c = e.next(), c.done ? t.min || (a += ",") : a += `,${t.spacingInner}`;
    }
    a += t.spacingOuter + n;
  }
  return a;
}
function yo(e, t, n, r, o, s) {
  let i = "", a = 0, u = e.next();
  if (!u.done) {
    i += t.spacingOuter;
    const c = n + t.indent;
    for (; !u.done; ) {
      if (i += c, a++ === t.maxWidth) {
        i += "…";
        break;
      }
      i += s(u.value, t, c, r, o), u = e.next(), u.done ? t.min || (i += ",") : i += `,${t.spacingInner}`;
    }
    i += t.spacingOuter + n;
  }
  return i;
}
function $n(e, t, n, r, o, s) {
  let i = "";
  e = e instanceof ArrayBuffer ? new DataView(e) : e;
  const a = (c) => c instanceof DataView, u = a(e) ? e.byteLength : e.length;
  if (u > 0) {
    i += t.spacingOuter;
    const c = n + t.indent;
    for (let l = 0; l < u; l++) {
      if (i += c, l === t.maxWidth) {
        i += "…";
        break;
      }
      (a(e) || l in e) && (i += s(a(e) ? e.getInt8(l) : e[l], t, c, r, o)), l < u - 1 ? i += `,${t.spacingInner}` : t.min || (i += ",");
    }
    i += t.spacingOuter + n;
  }
  return i;
}
function bo(e, t, n, r, o, s) {
  let i = "";
  const a = Ku(e, t.compareKeys);
  if (a.length > 0) {
    i += t.spacingOuter;
    const u = n + t.indent;
    for (let c = 0; c < a.length; c++) {
      const l = a[c], f = s(l, t, u, r, o), h = s(e[l], t, u, r, o);
      i += `${u + f}: ${h}`, c < a.length - 1 ? i += `,${t.spacingInner}` : t.min || (i += ",");
    }
    i += t.spacingOuter + n;
  }
  return i;
}
const Gu = typeof Symbol == "function" && Symbol.for ? Symbol.for("jest.asymmetricMatcher") : 1267621, fn = " ", Yu = (e, t, n, r, o, s) => {
  const i = e.toString();
  if (i === "ArrayContaining" || i === "ArrayNotContaining")
    return ++r > t.maxDepth ? `[${i}]` : `${i + fn}[${$n(e.sample, t, n, r, o, s)}]`;
  if (i === "ObjectContaining" || i === "ObjectNotContaining")
    return ++r > t.maxDepth ? `[${i}]` : `${i + fn}{${bo(e.sample, t, n, r, o, s)}}`;
  if (i === "StringMatching" || i === "StringNotMatching" || i === "StringContaining" || i === "StringNotContaining")
    return i + fn + s(e.sample, t, n, r, o);
  if (typeof e.toAsymmetricMatcher != "function")
    throw new TypeError(`Asymmetric matcher ${e.constructor.name} does not implement toAsymmetricMatcher()`);
  return e.toAsymmetricMatcher();
}, Ju = (e) => e && e.$$typeof === Gu, Xu = {
  serialize: Yu,
  test: Ju
}, Hu = " ", Pc = /* @__PURE__ */ new Set(["DOMStringMap", "NamedNodeMap"]), Zu = /^(?:HTML\w*Collection|NodeList)$/;
function Qu(e) {
  return Pc.has(e) || Zu.test(e);
}
const el = (e) => e && e.constructor && !!e.constructor.name && Qu(e.constructor.name);
function tl(e) {
  return e.constructor.name === "NamedNodeMap";
}
const nl = (e, t, n, r, o, s) => {
  const i = e.constructor.name;
  return ++r > t.maxDepth ? `[${i}]` : (t.min ? "" : i + Hu) + (Pc.has(i) ? `{${bo(tl(e) ? [...e].reduce((a, u) => (a[u.name] = u.value, a), {}) : { ...e }, t, n, r, o, s)}}` : `[${$n([...e], t, n, r, o, s)}]`);
}, rl = {
  serialize: nl,
  test: el
};
function Nc(e) {
  return e.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function wo(e, t, n, r, o, s, i) {
  const a = r + n.indent, u = n.colors;
  return e.map((c) => {
    const l = t[c];
    let f = i(l, n, a, o, s);
    return typeof l != "string" && (f.includes(`
`) && (f = n.spacingOuter + a + f + n.spacingOuter + r), f = `{${f}}`), `${n.spacingInner + r + u.prop.open + c + u.prop.close}=${u.value.open}${f}${u.value.close}`;
  }).join("");
}
function Rn(e, t, n, r, o, s) {
  return e.map((i) => t.spacingOuter + n + (typeof i == "string" ? jc(i, t) : s(i, t, n, r, o))).join("");
}
function ol(e, t, n, r, o, s) {
  return t.printShadowRoot === !1 ? "" : [`${t.spacingOuter + n}#shadow-root`, Rn(e, t, n + t.indent, r, o, s)].join("");
}
function jc(e, t) {
  const n = t.colors.content;
  return n.open + Nc(e) + n.close;
}
function sl(e, t) {
  const n = t.colors.comment;
  return `${n.open}<!--${Nc(e)}-->${n.close}`;
}
function To(e, t, n, r, o) {
  const s = r.colors.tag;
  return `${s.open}<${e}${t && s.close + t + r.spacingOuter + o + s.open}${n ? `>${s.close}${n}${r.spacingOuter}${o}${s.open}</${e}` : `${t && !r.min ? "" : " "}/`}>${s.close}`;
}
function So(e, t) {
  const n = t.colors.tag;
  return `${n.open}<${e}${n.close} …${n.open} />${n.close}`;
}
const il = 1, Rc = 3, Dc = 8, Fc = 11, cl = /^(?:(?:HTML|SVG)\w*)?Element$/;
function al(e) {
  try {
    return typeof e.hasAttribute == "function" && e.hasAttribute("is");
  } catch {
    return !1;
  }
}
function ul(e) {
  const t = e.constructor.name, { nodeType: n, tagName: r } = e, o = typeof r == "string" && r.includes("-") || al(e);
  return n === il && (cl.test(t) || o) || n === Rc && t === "Text" || n === Dc && t === "Comment" || n === Fc && t === "DocumentFragment";
}
const ll = (e) => e?.constructor?.name && ul(e);
function fl(e) {
  return e.nodeType === Rc;
}
function hl(e) {
  return e.nodeType === Dc;
}
function hn(e) {
  return e.nodeType === Fc;
}
const pl = (e, t, n, r, o, s) => {
  if (fl(e))
    return jc(e.data, t);
  if (hl(e))
    return sl(e.data, t);
  const i = hn(e) ? "DocumentFragment" : e.tagName.toLowerCase();
  return ++r > t.maxDepth ? So(i, t) : To(i, wo(hn(e) ? [] : Array.from(e.attributes, (a) => a.name).sort(), hn(e) ? {} : [...e.attributes].reduce((a, u) => (a[u.name] = u.value, a), {}), t, n + t.indent, r, o, s), (hn(e) || !e.shadowRoot ? "" : ol(Array.prototype.slice.call(e.shadowRoot.children), t, n + t.indent, r, o, s)) + Rn(Array.prototype.slice.call(e.childNodes || e.children), t, n + t.indent, r, o, s), t, n);
}, dl = {
  serialize: pl,
  test: ll
}, ml = "@@__IMMUTABLE_ITERABLE__@@", gl = "@@__IMMUTABLE_LIST__@@", yl = "@@__IMMUTABLE_KEYED__@@", bl = "@@__IMMUTABLE_MAP__@@", xs = "@@__IMMUTABLE_ORDERED__@@", wl = "@@__IMMUTABLE_RECORD__@@", Tl = "@@__IMMUTABLE_SEQ__@@", Sl = "@@__IMMUTABLE_SET__@@", El = "@@__IMMUTABLE_STACK__@@", kt = (e) => `Immutable.${e}`, Dn = (e) => `[${e}]`, Qt = " ", _s = "…";
function vl(e, t, n, r, o, s, i) {
  return ++r > t.maxDepth ? Dn(kt(i)) : `${kt(i) + Qt}{${rn(e.entries(), t, n, r, o, s)}}`;
}
function $l(e) {
  let t = 0;
  return { next() {
    if (t < e._keys.length) {
      const n = e._keys[t++];
      return {
        done: !1,
        value: [n, e.get(n)]
      };
    }
    return {
      done: !0,
      value: void 0
    };
  } };
}
function xl(e, t, n, r, o, s) {
  const i = kt(e._name || "Record");
  return ++r > t.maxDepth ? Dn(i) : `${i + Qt}{${rn($l(e), t, n, r, o, s)}}`;
}
function _l(e, t, n, r, o, s) {
  const i = kt("Seq");
  return ++r > t.maxDepth ? Dn(i) : e[yl] ? `${i + Qt}{${e._iter || e._object ? rn(e.entries(), t, n, r, o, s) : _s}}` : `${i + Qt}[${e._iter || e._array || e._collection || e._iterable ? yo(e.values(), t, n, r, o, s) : _s}]`;
}
function sr(e, t, n, r, o, s, i) {
  return ++r > t.maxDepth ? Dn(kt(i)) : `${kt(i) + Qt}[${yo(e.values(), t, n, r, o, s)}]`;
}
const Ml = (e, t, n, r, o, s) => e[bl] ? vl(e, t, n, r, o, s, e[xs] ? "OrderedMap" : "Map") : e[gl] ? sr(e, t, n, r, o, s, "List") : e[Sl] ? sr(e, t, n, r, o, s, e[xs] ? "OrderedSet" : "Set") : e[El] ? sr(e, t, n, r, o, s, "Stack") : e[Tl] ? _l(e, t, n, r, o, s) : xl(e, t, n, r, o, s), Ol = (e) => e && (e[ml] === !0 || e[wl] === !0), Al = {
  serialize: Ml,
  test: Ol
};
function Lc(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var ir = { exports: {} }, Z = {};
var Ms;
function kl() {
  if (Ms) return Z;
  Ms = 1;
  var e = Symbol.for("react.transitional.element"), t = Symbol.for("react.portal"), n = Symbol.for("react.fragment"), r = Symbol.for("react.strict_mode"), o = Symbol.for("react.profiler"), s = Symbol.for("react.consumer"), i = Symbol.for("react.context"), a = Symbol.for("react.forward_ref"), u = Symbol.for("react.suspense"), c = Symbol.for("react.suspense_list"), l = Symbol.for("react.memo"), f = Symbol.for("react.lazy"), h = Symbol.for("react.view_transition"), p = Symbol.for("react.client.reference");
  function d(g) {
    if (typeof g == "object" && g !== null) {
      var w = g.$$typeof;
      switch (w) {
        case e:
          switch (g = g.type, g) {
            case n:
            case o:
            case r:
            case u:
            case c:
            case h:
              return g;
            default:
              switch (g = g && g.$$typeof, g) {
                case i:
                case a:
                case f:
                case l:
                  return g;
                case s:
                  return g;
                default:
                  return w;
              }
          }
        case t:
          return w;
      }
    }
  }
  return Z.ContextConsumer = s, Z.ContextProvider = i, Z.Element = e, Z.ForwardRef = a, Z.Fragment = n, Z.Lazy = f, Z.Memo = l, Z.Portal = t, Z.Profiler = o, Z.StrictMode = r, Z.Suspense = u, Z.SuspenseList = c, Z.isContextConsumer = function(g) {
    return d(g) === s;
  }, Z.isContextProvider = function(g) {
    return d(g) === i;
  }, Z.isElement = function(g) {
    return typeof g == "object" && g !== null && g.$$typeof === e;
  }, Z.isForwardRef = function(g) {
    return d(g) === a;
  }, Z.isFragment = function(g) {
    return d(g) === n;
  }, Z.isLazy = function(g) {
    return d(g) === f;
  }, Z.isMemo = function(g) {
    return d(g) === l;
  }, Z.isPortal = function(g) {
    return d(g) === t;
  }, Z.isProfiler = function(g) {
    return d(g) === o;
  }, Z.isStrictMode = function(g) {
    return d(g) === r;
  }, Z.isSuspense = function(g) {
    return d(g) === u;
  }, Z.isSuspenseList = function(g) {
    return d(g) === c;
  }, Z.isValidElementType = function(g) {
    return typeof g == "string" || typeof g == "function" || g === n || g === o || g === r || g === u || g === c || typeof g == "object" && g !== null && (g.$$typeof === f || g.$$typeof === l || g.$$typeof === i || g.$$typeof === s || g.$$typeof === a || g.$$typeof === p || g.getModuleId !== void 0);
  }, Z.typeOf = d, Z;
}
var Os;
function Cl() {
  return Os || (Os = 1, ir.exports = kl()), ir.exports;
}
var qc = Cl(), Il = /* @__PURE__ */ Lc(qc), Pl = /* @__PURE__ */ Ic({
  __proto__: null,
  default: Il
}, [qc]), cr = { exports: {} }, J = {};
var As;
function Nl() {
  if (As) return J;
  As = 1;
  var e = Symbol.for("react.element"), t = Symbol.for("react.portal"), n = Symbol.for("react.fragment"), r = Symbol.for("react.strict_mode"), o = Symbol.for("react.profiler"), s = Symbol.for("react.provider"), i = Symbol.for("react.context"), a = Symbol.for("react.server_context"), u = Symbol.for("react.forward_ref"), c = Symbol.for("react.suspense"), l = Symbol.for("react.suspense_list"), f = Symbol.for("react.memo"), h = Symbol.for("react.lazy"), p = Symbol.for("react.offscreen"), d;
  d = Symbol.for("react.module.reference");
  function g(w) {
    if (typeof w == "object" && w !== null) {
      var T = w.$$typeof;
      switch (T) {
        case e:
          switch (w = w.type, w) {
            case n:
            case o:
            case r:
            case c:
            case l:
              return w;
            default:
              switch (w = w && w.$$typeof, w) {
                case a:
                case i:
                case u:
                case h:
                case f:
                case s:
                  return w;
                default:
                  return T;
              }
          }
        case t:
          return T;
      }
    }
  }
  return J.ContextConsumer = i, J.ContextProvider = s, J.Element = e, J.ForwardRef = u, J.Fragment = n, J.Lazy = h, J.Memo = f, J.Portal = t, J.Profiler = o, J.StrictMode = r, J.Suspense = c, J.SuspenseList = l, J.isAsyncMode = function() {
    return !1;
  }, J.isConcurrentMode = function() {
    return !1;
  }, J.isContextConsumer = function(w) {
    return g(w) === i;
  }, J.isContextProvider = function(w) {
    return g(w) === s;
  }, J.isElement = function(w) {
    return typeof w == "object" && w !== null && w.$$typeof === e;
  }, J.isForwardRef = function(w) {
    return g(w) === u;
  }, J.isFragment = function(w) {
    return g(w) === n;
  }, J.isLazy = function(w) {
    return g(w) === h;
  }, J.isMemo = function(w) {
    return g(w) === f;
  }, J.isPortal = function(w) {
    return g(w) === t;
  }, J.isProfiler = function(w) {
    return g(w) === o;
  }, J.isStrictMode = function(w) {
    return g(w) === r;
  }, J.isSuspense = function(w) {
    return g(w) === c;
  }, J.isSuspenseList = function(w) {
    return g(w) === l;
  }, J.isValidElementType = function(w) {
    return typeof w == "string" || typeof w == "function" || w === n || w === o || w === r || w === c || w === l || w === p || typeof w == "object" && w !== null && (w.$$typeof === h || w.$$typeof === f || w.$$typeof === s || w.$$typeof === i || w.$$typeof === u || w.$$typeof === d || w.getModuleId !== void 0);
  }, J.typeOf = g, J;
}
var ks;
function jl() {
  return ks || (ks = 1, cr.exports = Nl()), cr.exports;
}
var Bc = jl(), Rl = /* @__PURE__ */ Lc(Bc), Dl = /* @__PURE__ */ Ic({
  __proto__: null,
  default: Rl
}, [Bc]);
const Fl = [
  "isAsyncMode",
  "isConcurrentMode",
  "isContextConsumer",
  "isContextProvider",
  "isElement",
  "isForwardRef",
  "isFragment",
  "isLazy",
  "isMemo",
  "isPortal",
  "isProfiler",
  "isStrictMode",
  "isSuspense",
  "isSuspenseList",
  "isValidElementType"
], ut = Object.fromEntries(Fl.map((e) => [e, (t) => Dl[e](t) || Pl[e](t)]));
function zc(e, t = []) {
  if (Array.isArray(e))
    for (const n of e)
      zc(n, t);
  else e != null && e !== !1 && e !== "" && t.push(e);
  return t;
}
function Cs(e) {
  const t = e.type;
  if (typeof t == "string")
    return t;
  if (typeof t == "function")
    return t.displayName || t.name || "Unknown";
  if (ut.isFragment(e))
    return "React.Fragment";
  if (ut.isSuspense(e))
    return "React.Suspense";
  if (typeof t == "object" && t !== null) {
    if (ut.isContextProvider(e))
      return "Context.Provider";
    if (ut.isContextConsumer(e))
      return "Context.Consumer";
    if (ut.isForwardRef(e)) {
      if (t.displayName)
        return t.displayName;
      const n = t.render.displayName || t.render.name || "";
      return n === "" ? "ForwardRef" : `ForwardRef(${n})`;
    }
    if (ut.isMemo(e)) {
      const n = t.displayName || t.type.displayName || t.type.name || "";
      return n === "" ? "Memo" : `Memo(${n})`;
    }
  }
  return "UNDEFINED";
}
function Ll(e) {
  const { props: t } = e;
  return Object.keys(t).filter((n) => n !== "children" && t[n] !== void 0).sort();
}
const ql = (e, t, n, r, o, s) => ++r > t.maxDepth ? So(Cs(e), t) : To(Cs(e), wo(Ll(e), e.props, t, n + t.indent, r, o, s), Rn(zc(e.props.children), t, n + t.indent, r, o, s), t, n), Bl = (e) => e != null && ut.isElement(e), zl = {
  serialize: ql,
  test: Bl
}, Wl = typeof Symbol == "function" && Symbol.for ? Symbol.for("react.test.json") : 245830487;
function Vl(e) {
  const { props: t } = e;
  return t ? Object.keys(t).filter((n) => t[n] !== void 0).sort() : [];
}
const Ul = (e, t, n, r, o, s) => ++r > t.maxDepth ? So(e.type, t) : To(e.type, e.props ? wo(Vl(e), e.props, t, n + t.indent, r, o, s) : "", e.children ? Rn(e.children, t, n + t.indent, r, o, s) : "", t, n), Kl = (e) => e && e.$$typeof === Wl, Gl = {
  serialize: Ul,
  test: Kl
}, Wc = Object.prototype.toString, Yl = Date.prototype.toISOString, Jl = Error.prototype.toString, Is = RegExp.prototype.toString;
function bn(e) {
  return typeof e.constructor == "function" && e.constructor.name || "Object";
}
function Xl(e) {
  return typeof window < "u" && e === window;
}
const Hl = /^Symbol\((.*)\)(.*)$/, Zl = /\n/g;
class Vc extends Error {
  constructor(t, n) {
    super(t), this.stack = n, this.name = this.constructor.name;
  }
}
function Ql(e) {
  return e === "[object Array]" || e === "[object ArrayBuffer]" || e === "[object DataView]" || e === "[object Float32Array]" || e === "[object Float64Array]" || e === "[object Int8Array]" || e === "[object Int16Array]" || e === "[object Int32Array]" || e === "[object Uint8Array]" || e === "[object Uint8ClampedArray]" || e === "[object Uint16Array]" || e === "[object Uint32Array]";
}
function ef(e) {
  return Object.is(e, -0) ? "-0" : String(e);
}
function tf(e) {
  return `${e}n`;
}
function Ps(e, t) {
  return t ? `[Function ${e.name || "anonymous"}]` : "[Function]";
}
function Ns(e) {
  return String(e).replace(Hl, "Symbol($1)");
}
function js(e) {
  return `[${Jl.call(e)}]`;
}
function Uc(e, t, n, r) {
  if (e === !0 || e === !1)
    return `${e}`;
  if (e === void 0)
    return "undefined";
  if (e === null)
    return "null";
  const o = typeof e;
  if (o === "number")
    return ef(e);
  if (o === "bigint")
    return tf(e);
  if (o === "string")
    return r ? `"${e.replaceAll(/"|\\/g, "\\$&")}"` : `"${e}"`;
  if (o === "function")
    return Ps(e, t);
  if (o === "symbol")
    return Ns(e);
  const s = Wc.call(e);
  return s === "[object WeakMap]" ? "WeakMap {}" : s === "[object WeakSet]" ? "WeakSet {}" : s === "[object Function]" || s === "[object GeneratorFunction]" ? Ps(e, t) : s === "[object Symbol]" ? Ns(e) : s === "[object Date]" ? Number.isNaN(+e) ? "Date { NaN }" : Yl.call(e) : s === "[object Error]" ? js(e) : s === "[object RegExp]" ? n ? Is.call(e).replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&") : Is.call(e) : e instanceof Error ? js(e) : null;
}
function Kc(e, t, n, r, o, s) {
  if (o.includes(e))
    return "[Circular]";
  o = [...o], o.push(e);
  const i = ++r > t.maxDepth, a = t.min;
  if (t.callToJSON && !i && e.toJSON && typeof e.toJSON == "function" && !s)
    return tt(e.toJSON(), t, n, r, o, !0);
  const u = Wc.call(e);
  return u === "[object Arguments]" ? i ? "[Arguments]" : `${a ? "" : "Arguments "}[${$n(e, t, n, r, o, tt)}]` : Ql(u) ? i ? `[${e.constructor.name}]` : `${a || !t.printBasicPrototype && e.constructor.name === "Array" ? "" : `${e.constructor.name} `}[${$n(e, t, n, r, o, tt)}]` : u === "[object Map]" ? i ? "[Map]" : `Map {${rn(e.entries(), t, n, r, o, tt, " => ")}}` : u === "[object Set]" ? i ? "[Set]" : `Set {${yo(e.values(), t, n, r, o, tt)}}` : i || Xl(e) ? `[${bn(e)}]` : `${a || !t.printBasicPrototype && bn(e) === "Object" ? "" : `${bn(e)} `}{${bo(e, t, n, r, o, tt)}}`;
}
const nf = {
  test: (e) => e && e instanceof Error,
  serialize(e, t, n, r, o, s) {
    if (o.includes(e))
      return "[Circular]";
    o = [...o, e];
    const i = ++r > t.maxDepth, { message: a, cause: u, ...c } = e, l = {
      message: a,
      ...typeof u < "u" ? { cause: u } : {},
      ...e instanceof AggregateError ? { errors: e.errors } : {},
      ...c
    }, f = e.name !== "Error" ? e.name : bn(e);
    return i ? `[${f}]` : `${f} {${rn(Object.entries(l).values(), t, n, r, o, s)}}`;
  }
};
function rf(e) {
  return e.serialize != null;
}
function Gc(e, t, n, r, o, s) {
  let i;
  try {
    i = rf(e) ? e.serialize(t, n, r, o, s, tt) : e.print(t, (a) => tt(a, n, r, o, s), (a) => {
      const u = r + n.indent;
      return u + a.replaceAll(Zl, `
${u}`);
    }, {
      edgeSpacing: n.spacingOuter,
      min: n.min,
      spacing: n.spacingInner
    }, n.colors);
  } catch (a) {
    throw new Vc(a.message, a.stack);
  }
  if (typeof i != "string")
    throw new TypeError(`pretty-format: Plugin must return type "string" but instead returned "${typeof i}".`);
  return i;
}
function Yc(e, t) {
  for (const n of e)
    try {
      if (n.test(t))
        return n;
    } catch (r) {
      throw new Vc(r.message, r.stack);
    }
  return null;
}
function tt(e, t, n, r, o, s) {
  const i = Yc(t.plugins, e);
  if (i !== null)
    return Gc(i, e, t, n, r, o);
  const a = Uc(e, t.printFunctionName, t.escapeRegex, t.escapeString);
  return a !== null ? a : Kc(e, t, n, r, o, s);
}
const Eo = {
  comment: "gray",
  content: "reset",
  prop: "yellow",
  tag: "cyan",
  value: "green"
}, Jc = Object.keys(Eo), De = {
  callToJSON: !0,
  compareKeys: void 0,
  escapeRegex: !1,
  escapeString: !0,
  highlight: !1,
  indent: 2,
  maxDepth: Number.POSITIVE_INFINITY,
  maxWidth: Number.POSITIVE_INFINITY,
  min: !1,
  plugins: [],
  printBasicPrototype: !0,
  printFunctionName: !0,
  printShadowRoot: !0,
  theme: Eo
};
function of(e) {
  for (const t of Object.keys(e))
    if (!Object.hasOwn(De, t))
      throw new Error(`pretty-format: Unknown option "${t}".`);
  if (e.min && e.indent !== void 0 && e.indent !== 0)
    throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
}
function sf() {
  return Jc.reduce((e, t) => {
    const n = Eo[t], r = n && ce[n];
    if (r && typeof r.close == "string" && typeof r.open == "string")
      e[t] = r;
    else
      throw new Error(`pretty-format: Option "theme" has a key "${t}" whose value "${n}" is undefined in ansi-styles.`);
    return e;
  }, /* @__PURE__ */ Object.create(null));
}
function cf() {
  return Jc.reduce((e, t) => (e[t] = {
    close: "",
    open: ""
  }, e), /* @__PURE__ */ Object.create(null));
}
function Xc(e) {
  return e?.printFunctionName ?? De.printFunctionName;
}
function Hc(e) {
  return e?.escapeRegex ?? De.escapeRegex;
}
function Zc(e) {
  return e?.escapeString ?? De.escapeString;
}
function Rs(e) {
  return {
    callToJSON: e?.callToJSON ?? De.callToJSON,
    colors: e?.highlight ? sf() : cf(),
    compareKeys: typeof e?.compareKeys == "function" || e?.compareKeys === null ? e.compareKeys : De.compareKeys,
    escapeRegex: Hc(e),
    escapeString: Zc(e),
    indent: e?.min ? "" : af(e?.indent ?? De.indent),
    maxDepth: e?.maxDepth ?? De.maxDepth,
    maxWidth: e?.maxWidth ?? De.maxWidth,
    min: e?.min ?? De.min,
    plugins: e?.plugins ?? De.plugins,
    printBasicPrototype: e?.printBasicPrototype ?? !0,
    printFunctionName: Xc(e),
    printShadowRoot: e?.printShadowRoot ?? !0,
    spacingInner: e?.min ? " " : `
`,
    spacingOuter: e?.min ? "" : `
`
  };
}
function af(e) {
  return Array.from({ length: e + 1 }).join(" ");
}
function Le(e, t) {
  if (t && (of(t), t.plugins)) {
    const r = Yc(t.plugins, e);
    if (r !== null)
      return Gc(r, e, Rs(t), "", 0, []);
  }
  const n = Uc(e, Xc(t), Hc(t), Zc(t));
  return n !== null ? n : Kc(e, Rs(t), "", 0, []);
}
const Fn = {
  AsymmetricMatcher: Xu,
  DOMCollection: rl,
  DOMElement: dl,
  Immutable: Al,
  ReactElement: zl,
  ReactTestComponent: Gl,
  Error: nf
}, Ds = {
  bold: ["1", "22"],
  dim: ["2", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  // 5 & 6 are blinking
  inverse: ["7", "27"],
  hidden: ["8", "28"],
  strike: ["9", "29"],
  // 10-20 are fonts
  // 21-29 are resets for 1-9
  black: ["30", "39"],
  red: ["31", "39"],
  green: ["32", "39"],
  yellow: ["33", "39"],
  blue: ["34", "39"],
  magenta: ["35", "39"],
  cyan: ["36", "39"],
  white: ["37", "39"],
  brightblack: ["30;1", "39"],
  brightred: ["31;1", "39"],
  brightgreen: ["32;1", "39"],
  brightyellow: ["33;1", "39"],
  brightblue: ["34;1", "39"],
  brightmagenta: ["35;1", "39"],
  brightcyan: ["36;1", "39"],
  brightwhite: ["37;1", "39"],
  grey: ["90", "39"]
}, uf = {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  regexp: "red"
}, Ct = "…";
function lf(e, t) {
  const n = Ds[uf[t]] || Ds[t] || "";
  return n ? `\x1B[${n[0]}m${String(e)}\x1B[${n[1]}m` : String(e);
}
function ff({
  showHidden: e = !1,
  depth: t = 2,
  colors: n = !1,
  customInspect: r = !0,
  showProxy: o = !1,
  maxArrayLength: s = 1 / 0,
  breakLength: i = 1 / 0,
  seen: a = [],
  // eslint-disable-next-line no-shadow
  truncate: u = 1 / 0,
  stylize: c = String
} = {}, l) {
  const f = {
    showHidden: !!e,
    depth: Number(t),
    colors: !!n,
    customInspect: !!r,
    showProxy: !!o,
    maxArrayLength: Number(s),
    breakLength: Number(i),
    truncate: Number(u),
    seen: a,
    inspect: l,
    stylize: c
  };
  return f.colors && (f.stylize = lf), f;
}
function hf(e) {
  return e >= "\uD800" && e <= "\uDBFF";
}
function ct(e, t, n = Ct) {
  e = String(e);
  const r = n.length, o = e.length;
  if (r > t && o > r)
    return n;
  if (o > t && o > r) {
    let s = t - r;
    return s > 0 && hf(e[s - 1]) && (s = s - 1), `${e.slice(0, s)}${n}`;
  }
  return e;
}
function Be(e, t, n, r = ", ") {
  n = n || t.inspect;
  const o = e.length;
  if (o === 0)
    return "";
  const s = t.truncate;
  let i = "", a = "", u = "";
  for (let c = 0; c < o; c += 1) {
    const l = c + 1 === e.length, f = c + 2 === e.length;
    u = `${Ct}(${e.length - c})`;
    const h = e[c];
    t.truncate = s - i.length - (l ? 0 : r.length);
    const p = a || n(h, t) + (l ? "" : r), d = i.length + p.length, g = d + u.length;
    if (l && d > s && i.length + u.length <= s || !l && !f && g > s || (a = l ? "" : n(e[c + 1], t) + (f ? "" : r), !l && f && g > s && d + a.length > s))
      break;
    if (i += p, !l && !f && d + a.length >= s) {
      u = `${Ct}(${e.length - c - 1})`;
      break;
    }
    u = "";
  }
  return `${i}${u}`;
}
function pf(e) {
  return e.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) ? e : JSON.stringify(e).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
function en([e, t], n) {
  return n.truncate -= 2, typeof e == "string" ? e = pf(e) : typeof e != "number" && (e = `[${n.inspect(e, n)}]`), n.truncate -= e.length, t = n.inspect(t, n), `${e}: ${t}`;
}
function df(e, t) {
  const n = Object.keys(e).slice(e.length);
  if (!e.length && !n.length)
    return "[]";
  t.truncate -= 4;
  const r = Be(e, t);
  t.truncate -= r.length;
  let o = "";
  return n.length && (o = Be(n.map((s) => [s, e[s]]), t, en)), `[ ${r}${o ? `, ${o}` : ""} ]`;
}
const mf = (e) => typeof Buffer == "function" && e instanceof Buffer ? "Buffer" : e[Symbol.toStringTag] ? e[Symbol.toStringTag] : e.constructor.name;
function He(e, t) {
  const n = mf(e);
  t.truncate -= n.length + 4;
  const r = Object.keys(e).slice(e.length);
  if (!e.length && !r.length)
    return `${n}[]`;
  let o = "";
  for (let i = 0; i < e.length; i++) {
    const a = `${t.stylize(ct(e[i], t.truncate), "number")}${i === e.length - 1 ? "" : ", "}`;
    if (t.truncate -= a.length, e[i] !== e.length && t.truncate <= 3) {
      o += `${Ct}(${e.length - e[i] + 1})`;
      break;
    }
    o += a;
  }
  let s = "";
  return r.length && (s = Be(r.map((i) => [i, e[i]]), t, en)), `${n}[ ${o}${s ? `, ${s}` : ""} ]`;
}
function gf(e, t) {
  const n = e.toJSON();
  if (n === null)
    return "Invalid Date";
  const r = n.split("T"), o = r[0];
  return t.stylize(`${o}T${ct(r[1], t.truncate - o.length - 1)}`, "date");
}
function Fs(e, t) {
  const n = e[Symbol.toStringTag] || "Function", r = e.name;
  return r ? t.stylize(`[${n} ${ct(r, t.truncate - 11)}]`, "special") : t.stylize(`[${n}]`, "special");
}
function yf([e, t], n) {
  return n.truncate -= 4, e = n.inspect(e, n), n.truncate -= e.length, t = n.inspect(t, n), `${e} => ${t}`;
}
function bf(e) {
  const t = [];
  return e.forEach((n, r) => {
    t.push([r, n]);
  }), t;
}
function wf(e, t) {
  return e.size === 0 ? "Map{}" : (t.truncate -= 7, `Map{ ${Be(bf(e), t, yf)} }`);
}
const Tf = Number.isNaN || ((e) => e !== e);
function Ls(e, t) {
  return Tf(e) ? t.stylize("NaN", "number") : e === 1 / 0 ? t.stylize("Infinity", "number") : e === -1 / 0 ? t.stylize("-Infinity", "number") : e === 0 ? t.stylize(1 / e === 1 / 0 ? "+0" : "-0", "number") : t.stylize(ct(String(e), t.truncate), "number");
}
function qs(e, t) {
  let n = ct(e.toString(), t.truncate - 1);
  return n !== Ct && (n += "n"), t.stylize(n, "bigint");
}
function Sf(e, t) {
  const n = e.toString().split("/")[2], r = t.truncate - (2 + n.length), o = e.source;
  return t.stylize(`/${ct(o, r)}/${n}`, "regexp");
}
function Ef(e) {
  const t = [];
  return e.forEach((n) => {
    t.push(n);
  }), t;
}
function vf(e, t) {
  return e.size === 0 ? "Set{}" : (t.truncate -= 7, `Set{ ${Be(Ef(e), t)} }`);
}
const Bs = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g"), $f = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
}, xf = 16;
function _f(e) {
  return $f[e] || `\\u${`0000${e.charCodeAt(0).toString(xf)}`.slice(-4)}`;
}
function zs(e, t) {
  return Bs.test(e) && (e = e.replace(Bs, _f)), t.stylize(`'${ct(e, t.truncate - 2)}'`, "string");
}
function Ws(e) {
  return "description" in Symbol.prototype ? e.description ? `Symbol(${e.description})` : "Symbol()" : e.toString();
}
const Mf = () => "Promise{…}";
function wn(e, t) {
  const n = Object.getOwnPropertyNames(e), r = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(e) : [];
  if (n.length === 0 && r.length === 0)
    return "{}";
  if (t.truncate -= 4, t.seen = t.seen || [], t.seen.includes(e))
    return "[Circular]";
  t.seen.push(e);
  const o = Be(n.map((a) => [a, e[a]]), t, en), s = Be(r.map((a) => [a, e[a]]), t, en);
  t.seen.pop();
  let i = "";
  return o && s && (i = ", "), `{ ${o}${i}${s} }`;
}
const ar = typeof Symbol < "u" && Symbol.toStringTag ? Symbol.toStringTag : !1;
function Of(e, t) {
  let n = "";
  return ar && ar in e && (n = e[ar]), n = n || e.constructor.name, (!n || n === "_class") && (n = "<Anonymous Class>"), t.truncate -= n.length, `${n}${wn(e, t)}`;
}
function Af(e, t) {
  return e.length === 0 ? "Arguments[]" : (t.truncate -= 13, `Arguments[ ${Be(e, t)} ]`);
}
const kf = [
  "stack",
  "line",
  "column",
  "name",
  "message",
  "fileName",
  "lineNumber",
  "columnNumber",
  "number",
  "description",
  "cause"
];
function Cf(e, t) {
  const n = Object.getOwnPropertyNames(e).filter((i) => kf.indexOf(i) === -1), r = e.name;
  t.truncate -= r.length;
  let o = "";
  if (typeof e.message == "string" ? o = ct(e.message, t.truncate) : n.unshift("message"), o = o ? `: ${o}` : "", t.truncate -= o.length + 5, t.seen = t.seen || [], t.seen.includes(e))
    return "[Circular]";
  t.seen.push(e);
  const s = Be(n.map((i) => [i, e[i]]), t, en);
  return `${r}${o}${s ? ` { ${s} }` : ""}`;
}
function If([e, t], n) {
  return n.truncate -= 3, t ? `${n.stylize(String(e), "yellow")}=${n.stylize(`"${t}"`, "string")}` : `${n.stylize(String(e), "yellow")}`;
}
function Wr(e, t) {
  return Be(e, t, Pf, `
`);
}
function Pf(e, t) {
  switch (e.nodeType) {
    case 1:
      return Qc(e, t);
    case 3:
      return t.inspect(e.data, t);
    default:
      return t.inspect(e, t);
  }
}
function Qc(e, t) {
  const n = e.getAttributeNames(), r = e.tagName.toLowerCase(), o = t.stylize(`<${r}`, "special"), s = t.stylize(">", "special"), i = t.stylize(`</${r}>`, "special");
  t.truncate -= r.length * 2 + 5;
  let a = "";
  n.length > 0 && (a += " ", a += Be(n.map((l) => [l, e.getAttribute(l)]), t, If, " ")), t.truncate -= a.length;
  const u = t.truncate;
  let c = Wr(e.children, t);
  return c && c.length > u && (c = `${Ct}(${e.children.length})`), `${o}${a}${s}${c}${i}`;
}
const Nf = typeof Symbol == "function" && typeof Symbol.for == "function", ur = Nf ? Symbol.for("chai/inspect") : "@@chai/inspect", lr = Symbol.for("nodejs.util.inspect.custom"), Vs = /* @__PURE__ */ new WeakMap(), Us = {}, Ks = {
  undefined: (e, t) => t.stylize("undefined", "undefined"),
  null: (e, t) => t.stylize("null", "null"),
  boolean: (e, t) => t.stylize(String(e), "boolean"),
  Boolean: (e, t) => t.stylize(String(e), "boolean"),
  number: Ls,
  Number: Ls,
  bigint: qs,
  BigInt: qs,
  string: zs,
  String: zs,
  function: Fs,
  Function: Fs,
  symbol: Ws,
  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
  Symbol: Ws,
  Array: df,
  Date: gf,
  Map: wf,
  Set: vf,
  RegExp: Sf,
  Promise: Mf,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: (e, t) => t.stylize("WeakSet{…}", "special"),
  WeakMap: (e, t) => t.stylize("WeakMap{…}", "special"),
  Arguments: Af,
  Int8Array: He,
  Uint8Array: He,
  Uint8ClampedArray: He,
  Int16Array: He,
  Uint16Array: He,
  Int32Array: He,
  Uint32Array: He,
  Float32Array: He,
  Float64Array: He,
  Generator: () => "",
  DataView: () => "",
  ArrayBuffer: () => "",
  Error: Cf,
  HTMLCollection: Wr,
  NodeList: Wr
}, jf = (e, t, n, r) => ur in e && typeof e[ur] == "function" ? e[ur](t) : lr in e && typeof e[lr] == "function" ? e[lr](t.depth, t, r) : "inspect" in e && typeof e.inspect == "function" ? e.inspect(t.depth, t) : "constructor" in e && Vs.has(e.constructor) ? Vs.get(e.constructor)(e, t) : Us[n] ? Us[n](e, t) : "", Rf = Object.prototype.toString;
function Tn(e, t = {}) {
  const n = ff(t, Tn), { customInspect: r } = n;
  let o = e === null ? "null" : typeof e;
  if (o === "object" && (o = Rf.call(e).slice(8, -1)), o in Ks)
    return Ks[o](e, n);
  if (r && e) {
    const i = jf(e, n, o, Tn);
    if (i)
      return typeof i == "string" ? i : Tn(i, n);
  }
  const s = e ? Object.getPrototypeOf(e) : !1;
  return s === Object.prototype || s === null ? wn(e, n) : e && typeof HTMLElement == "function" && e instanceof HTMLElement ? Qc(e, n) : "constructor" in e ? e.constructor !== Object ? Of(e, n) : wn(e, n) : e === Object(e) ? wn(e, n) : n.stylize(String(e), o);
}
const { AsymmetricMatcher: Df, DOMCollection: Ff, DOMElement: Lf, Immutable: qf, ReactElement: Bf, ReactTestComponent: zf } = Fn, Gs = [
  zf,
  Bf,
  Lf,
  Ff,
  qf,
  Df
];
function Ae(e, t = 10, { maxLength: n, ...r } = {}) {
  const o = n ?? 1e4;
  let s;
  try {
    s = Le(e, {
      maxDepth: t,
      escapeString: !1,
      plugins: Gs,
      ...r
    });
  } catch {
    s = Le(e, {
      callToJSON: !1,
      maxDepth: t,
      escapeString: !1,
      plugins: Gs,
      ...r
    });
  }
  return s.length >= o && t > 1 ? Ae(e, Math.floor(Math.min(t, Number.MAX_SAFE_INTEGER) / 2), {
    maxLength: n,
    ...r
  }) : s;
}
const ea = /%[sdjifoOc%]/g;
function Wf(...e) {
  if (typeof e[0] != "string") {
    const s = [];
    for (let i = 0; i < e.length; i++)
      s.push(vt(e[i], {
        depth: 0,
        colors: !1
      }));
    return s.join(" ");
  }
  const t = e.length;
  let n = 1;
  const r = e[0];
  let o = String(r).replace(ea, (s) => {
    if (s === "%%")
      return "%";
    if (n >= t)
      return s;
    switch (s) {
      case "%s": {
        const i = e[n++];
        return typeof i == "bigint" ? `${i.toString()}n` : typeof i == "number" && i === 0 && 1 / i < 0 ? "-0" : typeof i == "object" && i !== null ? typeof i.toString == "function" && i.toString !== Object.prototype.toString ? i.toString() : vt(i, {
          depth: 0,
          colors: !1
        }) : String(i);
      }
      case "%d": {
        const i = e[n++];
        return typeof i == "bigint" ? `${i.toString()}n` : Number(i).toString();
      }
      case "%i": {
        const i = e[n++];
        return typeof i == "bigint" ? `${i.toString()}n` : Number.parseInt(String(i)).toString();
      }
      case "%f":
        return Number.parseFloat(String(e[n++])).toString();
      case "%o":
        return vt(e[n++], {
          showHidden: !0,
          showProxy: !0
        });
      case "%O":
        return vt(e[n++]);
      case "%c":
        return n++, "";
      case "%j":
        try {
          return JSON.stringify(e[n++]);
        } catch (i) {
          const a = i.message;
          if (a.includes("circular structure") || a.includes("cyclic structures") || a.includes("cyclic object"))
            return "[Circular]";
          throw i;
        }
      default:
        return s;
    }
  });
  for (let s = e[n]; n < t; s = e[++n])
    s === null || typeof s != "object" ? o += ` ${s}` : o += ` ${vt(s)}`;
  return o;
}
function vt(e, t = {}) {
  return t.truncate === 0 && (t.truncate = Number.POSITIVE_INFINITY), Tn(e, t);
}
function Vf(e, t = {}) {
  typeof t.truncate > "u" && (t.truncate = 40);
  const n = vt(e, t), r = Object.prototype.toString.call(e);
  if (t.truncate && n.length >= t.truncate)
    if (r === "[object Function]") {
      const o = e;
      return o.name ? `[Function: ${o.name}]` : "[Function]";
    } else {
      if (r === "[object Array]")
        return `[ Array(${e.length}) ]`;
      if (r === "[object Object]") {
        const o = Object.keys(e);
        return `{ Object (${o.length > 2 ? `${o.splice(0, 2).join(", ")}, ...` : o.join(", ")}) }`;
      } else
        return n;
    }
  return n;
}
function Uf(e) {
  const { message: t = "$$stack trace error", stackTraceLimit: n = 1 } = e || {}, r = Error.stackTraceLimit, o = Error.prepareStackTrace;
  Error.stackTraceLimit = n, Error.prepareStackTrace = (a) => a.stack;
  const i = new Error(t).stack || "";
  return Error.prepareStackTrace = o, Error.stackTraceLimit = r, i;
}
function ve(e, t, n) {
  const r = typeof e;
  if (!n.includes(r))
    throw new TypeError(`${t} value must be ${n.join(" or ")}, received "${r}"`);
}
function ta(e) {
  return e == null && (e = []), Array.isArray(e) ? e : [e];
}
function xt(e) {
  return e != null && typeof e == "object" && !Array.isArray(e);
}
function Kf(e) {
  return e === Object.prototype || e === Function.prototype || e === RegExp.prototype;
}
function tn(e) {
  return Object.prototype.toString.apply(e).slice(8, -1);
}
function Gf(e, t) {
  const n = typeof t == "function" ? t : (r) => t.add(r);
  Object.getOwnPropertyNames(e).forEach(n), Object.getOwnPropertySymbols(e).forEach(n);
}
function na(e) {
  const t = /* @__PURE__ */ new Set();
  return Kf(e) ? [] : (Gf(e, t), Array.from(t));
}
const ra = { forceWritable: !1 };
function Ys(e, t = ra) {
  return Vr(e, /* @__PURE__ */ new WeakMap(), t);
}
function Vr(e, t, n = ra) {
  let r, o;
  if (t.has(e))
    return t.get(e);
  if (Array.isArray(e)) {
    for (o = Array.from({ length: r = e.length }), t.set(e, o); r--; )
      o[r] = Vr(e[r], t, n);
    return o;
  }
  if (Object.prototype.toString.call(e) === "[object Object]") {
    o = Object.create(Object.getPrototypeOf(e)), t.set(e, o);
    const s = na(e);
    for (const i of s) {
      const a = Object.getOwnPropertyDescriptor(e, i);
      if (!a)
        continue;
      const u = Vr(e[i], t, n);
      n.forceWritable ? Object.defineProperty(o, i, {
        enumerable: a.enumerable,
        configurable: !0,
        writable: !0,
        value: u
      }) : "get" in a ? Object.defineProperty(o, i, {
        ...a,
        get() {
          return u;
        }
      }) : Object.defineProperty(o, i, {
        ...a,
        value: u
      });
    }
    return o;
  }
  return e;
}
function Yf() {
}
function Js(e, t, n = void 0) {
  const r = t.replace(/\[(\d+)\]/g, ".$1").split(".");
  let o = e;
  for (const s of r)
    if (o = new Object(o)[s], o === void 0)
      return n;
  return o;
}
function Xs() {
  let e = null, t = null;
  const n = new Promise((r, o) => {
    e = r, t = o;
  });
  return n.resolve = e, n.reject = t, n;
}
function Jf(e) {
  if (!Number.isNaN(e))
    return !1;
  const t = new Float64Array(1);
  return t[0] = e, new Uint32Array(t.buffer)[1] >>> 31 === 1;
}
function Xf(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
const ye = -1, de = 1, ie = 0;
class se {
  0;
  1;
  constructor(t, n) {
    this[0] = t, this[1] = n;
  }
}
function Hf(e, t) {
  if (!e || !t || e.charAt(0) !== t.charAt(0))
    return 0;
  let n = 0, r = Math.min(e.length, t.length), o = r, s = 0;
  for (; n < o; )
    e.substring(s, o) === t.substring(s, o) ? (n = o, s = n) : r = o, o = Math.floor((r - n) / 2 + n);
  return o;
}
function oa(e, t) {
  if (!e || !t || e.charAt(e.length - 1) !== t.charAt(t.length - 1))
    return 0;
  let n = 0, r = Math.min(e.length, t.length), o = r, s = 0;
  for (; n < o; )
    e.substring(e.length - o, e.length - s) === t.substring(t.length - o, t.length - s) ? (n = o, s = n) : r = o, o = Math.floor((r - n) / 2 + n);
  return o;
}
function Hs(e, t) {
  const n = e.length, r = t.length;
  if (n === 0 || r === 0)
    return 0;
  n > r ? e = e.substring(n - r) : n < r && (t = t.substring(0, n));
  const o = Math.min(n, r);
  if (e === t)
    return o;
  let s = 0, i = 1;
  for (; ; ) {
    const a = e.substring(o - i), u = t.indexOf(a);
    if (u === -1)
      return s;
    i += u, (u === 0 || e.substring(o - i) === t.substring(0, i)) && (s = i, i++);
  }
}
function Zf(e) {
  let t = !1;
  const n = [];
  let r = 0, o = null, s = 0, i = 0, a = 0, u = 0, c = 0;
  for (; s < e.length; )
    e[s][0] === ie ? (n[r++] = s, i = u, a = c, u = 0, c = 0, o = e[s][1]) : (e[s][0] === de ? u += e[s][1].length : c += e[s][1].length, o && o.length <= Math.max(i, a) && o.length <= Math.max(u, c) && (e.splice(n[r - 1], 0, new se(ye, o)), e[n[r - 1] + 1][0] = de, r--, r--, s = r > 0 ? n[r - 1] : -1, i = 0, a = 0, u = 0, c = 0, o = null, t = !0)), s++;
  for (t && sa(e), th(e), s = 1; s < e.length; ) {
    if (e[s - 1][0] === ye && e[s][0] === de) {
      const l = e[s - 1][1], f = e[s][1], h = Hs(l, f), p = Hs(f, l);
      h >= p ? (h >= l.length / 2 || h >= f.length / 2) && (e.splice(s, 0, new se(ie, f.substring(0, h))), e[s - 1][1] = l.substring(0, l.length - h), e[s + 1][1] = f.substring(h), s++) : (p >= l.length / 2 || p >= f.length / 2) && (e.splice(s, 0, new se(ie, l.substring(0, p))), e[s - 1][0] = de, e[s - 1][1] = f.substring(0, f.length - p), e[s + 1][0] = ye, e[s + 1][1] = l.substring(p), s++), s++;
    }
    s++;
  }
}
const Zs = /[^a-z0-9]/i, Qs = /\s/, ei = /[\r\n]/, Qf = /\n\r?\n$/, eh = /^\r?\n\r?\n/;
function th(e) {
  let t = 1;
  for (; t < e.length - 1; ) {
    if (e[t - 1][0] === ie && e[t + 1][0] === ie) {
      let n = e[t - 1][1], r = e[t][1], o = e[t + 1][1];
      const s = oa(n, r);
      if (s) {
        const l = r.substring(r.length - s);
        n = n.substring(0, n.length - s), r = l + r.substring(0, r.length - s), o = l + o;
      }
      let i = n, a = r, u = o, c = pn(n, r) + pn(r, o);
      for (; r.charAt(0) === o.charAt(0); ) {
        n += r.charAt(0), r = r.substring(1) + o.charAt(0), o = o.substring(1);
        const l = pn(n, r) + pn(r, o);
        l >= c && (c = l, i = n, a = r, u = o);
      }
      e[t - 1][1] !== i && (i ? e[t - 1][1] = i : (e.splice(t - 1, 1), t--), e[t][1] = a, u ? e[t + 1][1] = u : (e.splice(t + 1, 1), t--));
    }
    t++;
  }
}
function sa(e) {
  var t;
  e.push(new se(ie, ""));
  let n = 0, r = 0, o = 0, s = "", i = "", a;
  for (; n < e.length; )
    switch (e[n][0]) {
      case de:
        o++, i += e[n][1], n++;
        break;
      case ye:
        r++, s += e[n][1], n++;
        break;
      case ie:
        r + o > 1 ? (r !== 0 && o !== 0 && (a = Hf(i, s), a !== 0 && (n - r - o > 0 && e[n - r - o - 1][0] === ie ? e[n - r - o - 1][1] += i.substring(0, a) : (e.splice(0, 0, new se(ie, i.substring(0, a))), n++), i = i.substring(a), s = s.substring(a)), a = oa(i, s), a !== 0 && (e[n][1] = i.substring(i.length - a) + e[n][1], i = i.substring(0, i.length - a), s = s.substring(0, s.length - a))), n -= r + o, e.splice(n, r + o), s.length && (e.splice(n, 0, new se(ye, s)), n++), i.length && (e.splice(n, 0, new se(de, i)), n++), n++) : n !== 0 && e[n - 1][0] === ie ? (e[n - 1][1] += e[n][1], e.splice(n, 1)) : n++, o = 0, r = 0, s = "", i = "";
        break;
    }
  ((t = e.at(-1)) === null || t === void 0 ? void 0 : t[1]) === "" && e.pop();
  let u = !1;
  for (n = 1; n < e.length - 1; )
    e[n - 1][0] === ie && e[n + 1][0] === ie && (e[n][1].substring(e[n][1].length - e[n - 1][1].length) === e[n - 1][1] ? (e[n][1] = e[n - 1][1] + e[n][1].substring(0, e[n][1].length - e[n - 1][1].length), e[n + 1][1] = e[n - 1][1] + e[n + 1][1], e.splice(n - 1, 1), u = !0) : e[n][1].substring(0, e[n + 1][1].length) === e[n + 1][1] && (e[n - 1][1] += e[n + 1][1], e[n][1] = e[n][1].substring(e[n + 1][1].length) + e[n + 1][1], e.splice(n + 1, 1), u = !0)), n++;
  u && sa(e);
}
function pn(e, t) {
  if (!e || !t)
    return 6;
  const n = e.charAt(e.length - 1), r = t.charAt(0), o = n.match(Zs), s = r.match(Zs), i = o && n.match(Qs), a = s && r.match(Qs), u = i && n.match(ei), c = a && r.match(ei), l = u && e.match(Qf), f = c && t.match(eh);
  return l || f ? 5 : u || c ? 4 : o && !i && a ? 3 : i || a ? 2 : o || s ? 1 : 0;
}
const ia = "Compared values have no visual difference.", nh = "Compared values serialize to the same structure.\nPrinting internal object structure without calling `toJSON` instead.";
var dn = {}, ti;
function rh() {
  if (ti) return dn;
  ti = 1, Object.defineProperty(dn, "__esModule", {
    value: !0
  }), dn.default = h;
  const e = "diff-sequences", t = 0, n = (p, d, g, w, T) => {
    let $ = 0;
    for (; p < d && g < w && T(p, g); )
      p += 1, g += 1, $ += 1;
    return $;
  }, r = (p, d, g, w, T) => {
    let $ = 0;
    for (; p <= d && g <= w && T(d, w); )
      d -= 1, w -= 1, $ += 1;
    return $;
  }, o = (p, d, g, w, T, $, k) => {
    let _ = 0, O = -p, I = $[_], M = I;
    $[_] += n(
      I + 1,
      d,
      w + I - O + 1,
      g,
      T
    );
    const L = p < k ? p : k;
    for (_ += 1, O += 2; _ <= L; _ += 1, O += 2) {
      if (_ !== p && M < $[_])
        I = $[_];
      else if (I = M + 1, d <= I)
        return _ - 1;
      M = $[_], $[_] = I + n(I + 1, d, w + I - O + 1, g, T);
    }
    return k;
  }, s = (p, d, g, w, T, $, k) => {
    let _ = 0, O = p, I = $[_], M = I;
    $[_] -= r(
      d,
      I - 1,
      g,
      w + I - O - 1,
      T
    );
    const L = p < k ? p : k;
    for (_ += 1, O -= 2; _ <= L; _ += 1, O -= 2) {
      if (_ !== p && $[_] < M)
        I = $[_];
      else if (I = M - 1, I < d)
        return _ - 1;
      M = $[_], $[_] = I - r(
        d,
        I - 1,
        g,
        w + I - O - 1,
        T
      );
    }
    return k;
  }, i = (p, d, g, w, T, $, k, _, O, I, M) => {
    const L = w - d, ee = g - d, G = T - w - ee, H = -G - (p - 1), ae = -G + (p - 1);
    let ue = t;
    const re = p < _ ? p : _;
    for (let Y = 0, te = -p; Y <= re; Y += 1, te += 2) {
      const $e = Y === 0 || Y !== p && ue < k[Y], le = $e ? k[Y] : ue, me = $e ? le : le + 1, Pe = L + me - te, be = n(
        me + 1,
        g,
        Pe + 1,
        T,
        $
      ), Te = me + be;
      if (ue = k[Y], k[Y] = Te, H <= te && te <= ae) {
        const Ye = (p - 1 - (te + G)) / 2;
        if (Ye <= I && O[Ye] - 1 <= Te) {
          const ke = L + le - ($e ? te + 1 : te - 1), Se = r(
            d,
            le,
            w,
            ke,
            $
          ), Ee = le - Se, Tt = ke - Se, We = Ee + 1, Lt = Tt + 1;
          M.nChangePreceding = p - 1, p - 1 === We + Lt - d - w ? (M.aEndPreceding = d, M.bEndPreceding = w) : (M.aEndPreceding = We, M.bEndPreceding = Lt), M.nCommonPreceding = Se, Se !== 0 && (M.aCommonPreceding = We, M.bCommonPreceding = Lt), M.nCommonFollowing = be, be !== 0 && (M.aCommonFollowing = me + 1, M.bCommonFollowing = Pe + 1);
          const ge = Te + 1, Je = Pe + be + 1;
          return M.nChangeFollowing = p - 1, p - 1 === g + T - ge - Je ? (M.aStartFollowing = g, M.bStartFollowing = T) : (M.aStartFollowing = ge, M.bStartFollowing = Je), !0;
        }
      }
    }
    return !1;
  }, a = (p, d, g, w, T, $, k, _, O, I, M) => {
    const L = T - g, ee = g - d, G = T - w - ee, H = G - p, ae = G + p;
    let ue = t;
    const re = p < I ? p : I;
    for (let Y = 0, te = p; Y <= re; Y += 1, te -= 2) {
      const $e = Y === 0 || Y !== p && O[Y] < ue, le = $e ? O[Y] : ue, me = $e ? le : le - 1, Pe = L + me - te, be = r(
        d,
        me - 1,
        w,
        Pe - 1,
        $
      ), Te = me - be;
      if (ue = O[Y], O[Y] = Te, H <= te && te <= ae) {
        const Ye = (p + (te - G)) / 2;
        if (Ye <= _ && Te - 1 <= k[Ye]) {
          const ke = Pe - be;
          if (M.nChangePreceding = p, p === Te + ke - d - w ? (M.aEndPreceding = d, M.bEndPreceding = w) : (M.aEndPreceding = Te, M.bEndPreceding = ke), M.nCommonPreceding = be, be !== 0 && (M.aCommonPreceding = Te, M.bCommonPreceding = ke), M.nChangeFollowing = p - 1, p === 1)
            M.nCommonFollowing = 0, M.aStartFollowing = g, M.bStartFollowing = T;
          else {
            const Se = L + le - ($e ? te - 1 : te + 1), Ee = n(
              le,
              g,
              Se,
              T,
              $
            );
            M.nCommonFollowing = Ee, Ee !== 0 && (M.aCommonFollowing = le, M.bCommonFollowing = Se);
            const Tt = le + Ee, We = Se + Ee;
            p - 1 === g + T - Tt - We ? (M.aStartFollowing = g, M.bStartFollowing = T) : (M.aStartFollowing = Tt, M.bStartFollowing = We);
          }
          return !0;
        }
      }
    }
    return !1;
  }, u = (p, d, g, w, T, $, k, _, O) => {
    const I = w - d, M = T - g, L = g - d, ee = T - w, j = ee - L;
    let G = L, H = L;
    if (k[0] = d - 1, _[0] = g, j % 2 === 0) {
      const ae = (p || j) / 2, ue = (L + ee) / 2;
      for (let re = 1; re <= ue; re += 1)
        if (G = o(re, g, T, I, $, k, G), re < ae)
          H = s(re, d, w, M, $, _, H);
        else if (
          // If a reverse path overlaps a forward path in the same diagonal,
          // return a division of the index intervals at the middle change.
          a(
            re,
            d,
            g,
            w,
            T,
            $,
            k,
            G,
            _,
            H,
            O
          )
        )
          return;
    } else {
      const ae = ((p || j) + 1) / 2, ue = (L + ee + 1) / 2;
      let re = 1;
      for (G = o(re, g, T, I, $, k, G), re += 1; re <= ue; re += 1)
        if (H = s(
          re - 1,
          d,
          w,
          M,
          $,
          _,
          H
        ), re < ae)
          G = o(re, g, T, I, $, k, G);
        else if (
          // If a forward path overlaps a reverse path in the same diagonal,
          // return a division of the index intervals at the middle change.
          i(
            re,
            d,
            g,
            w,
            T,
            $,
            k,
            G,
            _,
            H,
            O
          )
        )
          return;
    }
    throw new Error(
      `${e}: no overlap aStart=${d} aEnd=${g} bStart=${w} bEnd=${T}`
    );
  }, c = (p, d, g, w, T, $, k, _, O, I) => {
    if (T - w < g - d) {
      if ($ = !$, $ && k.length === 1) {
        const { foundSubsequence: Te, isCommon: Ye } = k[0];
        k[1] = {
          foundSubsequence: (ke, Se, Ee) => {
            Te(ke, Ee, Se);
          },
          isCommon: (ke, Se) => Ye(Se, ke)
        };
      }
      const Pe = d, be = g;
      d = w, g = T, w = Pe, T = be;
    }
    const { foundSubsequence: M, isCommon: L } = k[$ ? 1 : 0];
    u(
      p,
      d,
      g,
      w,
      T,
      L,
      _,
      O,
      I
    );
    const {
      nChangePreceding: ee,
      aEndPreceding: j,
      bEndPreceding: G,
      nCommonPreceding: H,
      aCommonPreceding: ae,
      bCommonPreceding: ue,
      nCommonFollowing: re,
      aCommonFollowing: Y,
      bCommonFollowing: te,
      nChangeFollowing: $e,
      aStartFollowing: le,
      bStartFollowing: me
    } = I;
    d < j && w < G && c(
      ee,
      d,
      j,
      w,
      G,
      $,
      k,
      _,
      O,
      I
    ), H !== 0 && M(H, ae, ue), re !== 0 && M(re, Y, te), le < g && me < T && c(
      $e,
      le,
      g,
      me,
      T,
      $,
      k,
      _,
      O,
      I
    );
  }, l = (p, d) => {
    if (typeof d != "number")
      throw new TypeError(`${e}: ${p} typeof ${typeof d} is not a number`);
    if (!Number.isSafeInteger(d))
      throw new RangeError(`${e}: ${p} value ${d} is not a safe integer`);
    if (d < 0)
      throw new RangeError(`${e}: ${p} value ${d} is a negative integer`);
  }, f = (p, d) => {
    const g = typeof d;
    if (g !== "function")
      throw new TypeError(`${e}: ${p} typeof ${g} is not a function`);
  };
  function h(p, d, g, w) {
    l("aLength", p), l("bLength", d), f("isCommon", g), f("foundSubsequence", w);
    const T = n(0, p, 0, d, g);
    if (T !== 0 && w(T, 0, 0), p !== T || d !== T) {
      const $ = T, k = T, _ = r(
        $,
        p - 1,
        k,
        d - 1,
        g
      ), O = p - _, I = d - _, M = T + _;
      p !== M && d !== M && c(
        0,
        $,
        O,
        k,
        I,
        !1,
        [
          {
            foundSubsequence: w,
            isCommon: g
          }
        ],
        [t],
        [t],
        {
          aCommonFollowing: t,
          aCommonPreceding: t,
          aEndPreceding: t,
          aStartFollowing: t,
          bCommonFollowing: t,
          bCommonPreceding: t,
          bEndPreceding: t,
          bStartFollowing: t,
          nChangeFollowing: t,
          nChangePreceding: t,
          nCommonFollowing: t,
          nCommonPreceding: t
        }
      ), _ !== 0 && w(_, O, I);
    }
  }
  return dn;
}
var oh = /* @__PURE__ */ rh(), ca = /* @__PURE__ */ Xf(oh);
function sh(e, t) {
  return e.replace(/\s+$/, (n) => t(n));
}
function vo(e, t, n, r, o, s) {
  return e.length !== 0 ? n(`${r} ${sh(e, o)}`) : r !== " " ? n(r) : t && s.length !== 0 ? n(`${r} ${s}`) : "";
}
function aa(e, t, { aColor: n, aIndicator: r, changeLineTrailingSpaceColor: o, emptyFirstOrLastLinePlaceholder: s }) {
  return vo(e, t, n, r, o, s);
}
function ua(e, t, { bColor: n, bIndicator: r, changeLineTrailingSpaceColor: o, emptyFirstOrLastLinePlaceholder: s }) {
  return vo(e, t, n, r, o, s);
}
function la(e, t, { commonColor: n, commonIndicator: r, commonLineTrailingSpaceColor: o, emptyFirstOrLastLinePlaceholder: s }) {
  return vo(e, t, n, r, o, s);
}
function ni(e, t, n, r, { patchColor: o }) {
  return o(`@@ -${e + 1},${t - e} +${n + 1},${r - n} @@`);
}
function ih(e, t) {
  const n = e.length, r = t.contextLines, o = r + r;
  let s = n, i = !1, a = 0, u = 0;
  for (; u !== n; ) {
    const _ = u;
    for (; u !== n && e[u][0] === ie; )
      u += 1;
    if (_ !== u)
      if (_ === 0)
        u > r && (s -= u - r, i = !0);
      else if (u === n) {
        const O = u - _;
        O > r && (s -= O - r, i = !0);
      } else {
        const O = u - _;
        O > o && (s -= O - o, a += 1);
      }
    for (; u !== n && e[u][0] !== ie; )
      u += 1;
  }
  const c = a !== 0 || i;
  a !== 0 ? s += a + 1 : i && (s += 1);
  const l = s - 1, f = [];
  let h = 0;
  c && f.push("");
  let p = 0, d = 0, g = 0, w = 0;
  const T = (_) => {
    const O = f.length;
    f.push(la(_, O === 0 || O === l, t)), g += 1, w += 1;
  }, $ = (_) => {
    const O = f.length;
    f.push(aa(_, O === 0 || O === l, t)), g += 1;
  }, k = (_) => {
    const O = f.length;
    f.push(ua(_, O === 0 || O === l, t)), w += 1;
  };
  for (u = 0; u !== n; ) {
    let _ = u;
    for (; u !== n && e[u][0] === ie; )
      u += 1;
    if (_ !== u)
      if (_ === 0) {
        u > r && (_ = u - r, p = _, d = _, g = p, w = d);
        for (let O = _; O !== u; O += 1)
          T(e[O][1]);
      } else if (u === n) {
        const O = u - _ > r ? _ + r : u;
        for (let I = _; I !== O; I += 1)
          T(e[I][1]);
      } else {
        const O = u - _;
        if (O > o) {
          const I = _ + r;
          for (let L = _; L !== I; L += 1)
            T(e[L][1]);
          f[h] = ni(p, g, d, w, t), h = f.length, f.push("");
          const M = O - o;
          p = g + M, d = w + M, g = p, w = d;
          for (let L = u - r; L !== u; L += 1)
            T(e[L][1]);
        } else
          for (let I = _; I !== u; I += 1)
            T(e[I][1]);
      }
    for (; u !== n && e[u][0] === ye; )
      $(e[u][1]), u += 1;
    for (; u !== n && e[u][0] === de; )
      k(e[u][1]), u += 1;
  }
  return c && (f[h] = ni(p, g, d, w, t)), f.join(`
`);
}
function ch(e, t) {
  return e.map((n, r, o) => {
    const s = n[1], i = r === 0 || r === o.length - 1;
    switch (n[0]) {
      case ye:
        return aa(s, i, t);
      case de:
        return ua(s, i, t);
      default:
        return la(s, i, t);
    }
  }).join(`
`);
}
const fr = (e) => e, fa = 5, ah = 0;
function uh() {
  return {
    aAnnotation: "Expected",
    aColor: ce.green,
    aIndicator: "-",
    bAnnotation: "Received",
    bColor: ce.red,
    bIndicator: "+",
    changeColor: ce.inverse,
    changeLineTrailingSpaceColor: fr,
    commonColor: ce.dim,
    commonIndicator: " ",
    commonLineTrailingSpaceColor: fr,
    compareKeys: void 0,
    contextLines: fa,
    emptyFirstOrLastLinePlaceholder: "",
    expand: !1,
    includeChangeCounts: !1,
    omitAnnotationLines: !1,
    patchColor: ce.yellow,
    printBasicPrototype: !1,
    truncateThreshold: ah,
    truncateAnnotation: "... Diff result is truncated",
    truncateAnnotationColor: fr
  };
}
function lh(e) {
  return e && typeof e == "function" ? e : void 0;
}
function fh(e) {
  return typeof e == "number" && Number.isSafeInteger(e) && e >= 0 ? e : fa;
}
function bt(e = {}) {
  return {
    ...uh(),
    ...e,
    compareKeys: lh(e.compareKeys),
    contextLines: fh(e.contextLines)
  };
}
function $t(e) {
  return e.length === 1 && e[0].length === 0;
}
function hh(e) {
  let t = 0, n = 0;
  return e.forEach((r) => {
    switch (r[0]) {
      case ye:
        t += 1;
        break;
      case de:
        n += 1;
        break;
    }
  }), {
    a: t,
    b: n
  };
}
function ph({ aAnnotation: e, aColor: t, aIndicator: n, bAnnotation: r, bColor: o, bIndicator: s, includeChangeCounts: i, omitAnnotationLines: a }, u) {
  if (a)
    return "";
  let c = "", l = "";
  if (i) {
    const p = String(u.a), d = String(u.b), g = r.length - e.length, w = " ".repeat(Math.max(0, g)), T = " ".repeat(Math.max(0, -g)), $ = d.length - p.length, k = " ".repeat(Math.max(0, $)), _ = " ".repeat(Math.max(0, -$));
    c = `${w}  ${n} ${k}${p}`, l = `${T}  ${s} ${_}${d}`;
  }
  const f = `${n} ${e}${c}`, h = `${s} ${r}${l}`;
  return `${t(f)}
${o(h)}

`;
}
function $o(e, t, n) {
  return ph(n, hh(e)) + (n.expand ? ch(e, n) : ih(e, n)) + (t ? n.truncateAnnotationColor(`
${n.truncateAnnotation}`) : "");
}
function Ln(e, t, n) {
  const r = bt(n), [o, s] = ha($t(e) ? [] : e, $t(t) ? [] : t, r);
  return $o(o, s, r);
}
function dh(e, t, n, r, o) {
  if ($t(e) && $t(n) && (e = [], n = []), $t(t) && $t(r) && (t = [], r = []), e.length !== n.length || t.length !== r.length)
    return Ln(e, t, o);
  const [s, i] = ha(n, r, o);
  let a = 0, u = 0;
  return s.forEach((c) => {
    switch (c[0]) {
      case ye:
        c[1] = e[a], a += 1;
        break;
      case de:
        c[1] = t[u], u += 1;
        break;
      default:
        c[1] = t[u], a += 1, u += 1;
    }
  }), $o(s, i, bt(o));
}
function ha(e, t, n) {
  const r = n?.truncateThreshold ?? !1, o = Math.max(Math.floor(n?.truncateThreshold ?? 0), 0), s = r ? Math.min(e.length, o) : e.length, i = r ? Math.min(t.length, o) : t.length, a = s !== e.length || i !== t.length, u = (p, d) => e[p] === t[d], c = [];
  let l = 0, f = 0;
  for (ca(s, i, u, (p, d, g) => {
    for (; l !== d; l += 1)
      c.push(new se(ye, e[l]));
    for (; f !== g; f += 1)
      c.push(new se(de, t[f]));
    for (; p !== 0; p -= 1, l += 1, f += 1)
      c.push(new se(ie, t[f]));
  }); l !== s; l += 1)
    c.push(new se(ye, e[l]));
  for (; f !== i; f += 1)
    c.push(new se(de, t[f]));
  return [c, a];
}
function ri(e) {
  if (e === void 0)
    return "undefined";
  if (e === null)
    return "null";
  if (Array.isArray(e))
    return "array";
  if (typeof e == "boolean")
    return "boolean";
  if (typeof e == "function")
    return "function";
  if (typeof e == "number")
    return "number";
  if (typeof e == "string")
    return "string";
  if (typeof e == "bigint")
    return "bigint";
  if (typeof e == "object") {
    if (e != null) {
      if (e.constructor === RegExp)
        return "regexp";
      if (e.constructor === Map)
        return "map";
      if (e.constructor === Set)
        return "set";
      if (e.constructor === Date)
        return "date";
    }
    return "object";
  } else if (typeof e == "symbol")
    return "symbol";
  throw new Error(`value of unknown type: ${e}`);
}
function oi(e) {
  return e.includes(`\r
`) ? `\r
` : `
`;
}
function mh(e, t, n) {
  const r = n?.truncateThreshold ?? !1, o = Math.max(Math.floor(n?.truncateThreshold ?? 0), 0);
  let s = e.length, i = t.length;
  if (r) {
    const p = e.includes(`
`), d = t.includes(`
`), g = oi(e), w = oi(t), T = p ? `${e.split(g, o).join(g)}
` : e, $ = d ? `${t.split(w, o).join(w)}
` : t;
    s = T.length, i = $.length;
  }
  const a = s !== e.length || i !== t.length, u = (p, d) => e[p] === t[d];
  let c = 0, l = 0;
  const f = [];
  return ca(s, i, u, (p, d, g) => {
    c !== d && f.push(new se(ye, e.slice(c, d))), l !== g && f.push(new se(de, t.slice(l, g))), c = d + p, l = g + p, f.push(new se(ie, t.slice(g, l)));
  }), c !== s && f.push(new se(ye, e.slice(c))), l !== i && f.push(new se(de, t.slice(l))), [f, a];
}
function gh(e, t, n) {
  return t.reduce((r, o) => r + (o[0] === ie ? o[1] : o[0] === e && o[1].length !== 0 ? n(o[1]) : ""), "");
}
class si {
  op;
  line;
  lines;
  changeColor;
  constructor(t, n) {
    this.op = t, this.line = [], this.lines = [], this.changeColor = n;
  }
  pushSubstring(t) {
    this.pushDiff(new se(this.op, t));
  }
  pushLine() {
    this.lines.push(this.line.length !== 1 ? new se(this.op, gh(this.op, this.line, this.changeColor)) : this.line[0][0] === this.op ? this.line[0] : new se(this.op, this.line[0][1])), this.line.length = 0;
  }
  isLineEmpty() {
    return this.line.length === 0;
  }
  // Minor input to buffer.
  pushDiff(t) {
    this.line.push(t);
  }
  // Main input to buffer.
  align(t) {
    const n = t[1];
    if (n.includes(`
`)) {
      const r = n.split(`
`), o = r.length - 1;
      r.forEach((s, i) => {
        i < o ? (this.pushSubstring(s), this.pushLine()) : s.length !== 0 && this.pushSubstring(s);
      });
    } else
      this.pushDiff(t);
  }
  // Output from buffer.
  moveLinesTo(t) {
    this.isLineEmpty() || this.pushLine(), t.push(...this.lines), this.lines.length = 0;
  }
}
class yh {
  deleteBuffer;
  insertBuffer;
  lines;
  constructor(t, n) {
    this.deleteBuffer = t, this.insertBuffer = n, this.lines = [];
  }
  pushDiffCommonLine(t) {
    this.lines.push(t);
  }
  pushDiffChangeLines(t) {
    const n = t[1].length === 0;
    (!n || this.deleteBuffer.isLineEmpty()) && this.deleteBuffer.pushDiff(t), (!n || this.insertBuffer.isLineEmpty()) && this.insertBuffer.pushDiff(t);
  }
  flushChangeLines() {
    this.deleteBuffer.moveLinesTo(this.lines), this.insertBuffer.moveLinesTo(this.lines);
  }
  // Input to buffer.
  align(t) {
    const n = t[0], r = t[1];
    if (r.includes(`
`)) {
      const o = r.split(`
`), s = o.length - 1;
      o.forEach((i, a) => {
        if (a === 0) {
          const u = new se(n, i);
          this.deleteBuffer.isLineEmpty() && this.insertBuffer.isLineEmpty() ? (this.flushChangeLines(), this.pushDiffCommonLine(u)) : (this.pushDiffChangeLines(u), this.flushChangeLines());
        } else a < s ? this.pushDiffCommonLine(new se(n, i)) : i.length !== 0 && this.pushDiffChangeLines(new se(n, i));
      });
    } else
      this.pushDiffChangeLines(t);
  }
  // Output from buffer.
  getLines() {
    return this.flushChangeLines(), this.lines;
  }
}
function bh(e, t) {
  const n = new si(ye, t), r = new si(de, t), o = new yh(n, r);
  return e.forEach((s) => {
    switch (s[0]) {
      case ye:
        n.align(s);
        break;
      case de:
        r.align(s);
        break;
      default:
        o.align(s);
    }
  }), o.getLines();
}
function wh(e, t) {
  if (t) {
    const n = e.length - 1;
    return e.some((r, o) => r[0] === ie && (o !== n || r[1] !== `
`));
  }
  return e.some((n) => n[0] === ie);
}
function Th(e, t, n) {
  if (e !== t && e.length !== 0 && t.length !== 0) {
    const r = e.includes(`
`) || t.includes(`
`), [o, s] = pa(r ? `${e}
` : e, r ? `${t}
` : t, !0, n);
    if (wh(o, r)) {
      const i = bt(n), a = bh(o, i.changeColor);
      return $o(a, s, i);
    }
  }
  return Ln(e.split(`
`), t.split(`
`), n);
}
function pa(e, t, n, r) {
  const [o, s] = mh(e, t, r);
  return Zf(o), [o, s];
}
function Ur(e, t) {
  const { commonColor: n } = bt(t);
  return n(e);
}
const { AsymmetricMatcher: Sh, DOMCollection: Eh, DOMElement: vh, Immutable: $h, ReactElement: xh, ReactTestComponent: _h } = Fn, da = [
  _h,
  xh,
  vh,
  Eh,
  $h,
  Sh,
  Fn.Error
], Kr = {
  maxDepth: 20,
  plugins: da
}, ma = {
  callToJSON: !1,
  maxDepth: 8,
  plugins: da
};
function Nt(e, t, n) {
  if (Object.is(e, t))
    return "";
  const r = ri(e);
  let o = r, s = !1;
  if (r === "object" && typeof e.asymmetricMatch == "function") {
    if (e.$$typeof !== Symbol.for("jest.asymmetricMatcher") || typeof e.getExpectedType != "function")
      return;
    o = e.getExpectedType(), s = o === "string";
  }
  if (o !== ri(t)) {
    let w = function(k) {
      return k.length <= g ? k : `${k.slice(0, g)}...`;
    };
    const { aAnnotation: i, aColor: a, aIndicator: u, bAnnotation: c, bColor: l, bIndicator: f } = bt(n), h = Gr(ma, n);
    let p = Le(e, h), d = Le(t, h);
    const g = 1e5;
    p = w(p), d = w(d);
    const T = `${a(`${u} ${i}:`)} 
${p}`, $ = `${l(`${f} ${c}:`)} 
${d}`;
    return `${T}

${$}`;
  }
  if (!s)
    switch (r) {
      case "string":
        return Ln(e.split(`
`), t.split(`
`), n);
      case "boolean":
      case "number":
        return Mh(e, t, n);
      case "map":
        return hr(ii(e), ii(t), n);
      case "set":
        return hr(ci(e), ci(t), n);
      default:
        return hr(e, t, n);
    }
}
function Mh(e, t, n) {
  const r = Le(e, Kr), o = Le(t, Kr);
  return r === o ? "" : Ln(r.split(`
`), o.split(`
`), n);
}
function ii(e) {
  return new Map(Array.from(e.entries()).sort());
}
function ci(e) {
  return new Set(Array.from(e.values()).sort());
}
function hr(e, t, n) {
  let r, o = !1;
  try {
    const i = Gr(Kr, n);
    r = ai(e, t, i, n);
  } catch {
    o = !0;
  }
  const s = Ur(ia, n);
  if (r === void 0 || r === s) {
    const i = Gr(ma, n);
    r = ai(e, t, i, n), r !== s && !o && (r = `${Ur(nh, n)}

${r}`);
  }
  return r;
}
function Gr(e, t) {
  const { compareKeys: n, printBasicPrototype: r, maxDepth: o } = bt(t);
  return {
    ...e,
    compareKeys: n,
    printBasicPrototype: r,
    maxDepth: o ?? e.maxDepth
  };
}
function ai(e, t, n, r) {
  const o = {
    ...n,
    indent: 0
  }, s = Le(e, o), i = Le(t, o);
  if (s === i)
    return Ur(ia, r);
  {
    const a = Le(e, n), u = Le(t, n);
    return dh(a.split(`
`), u.split(`
`), s.split(`
`), i.split(`
`), r);
  }
}
const ui = 2e4;
function li(e) {
  return tn(e) === "Object" && typeof e.asymmetricMatch == "function";
}
function fi(e, t) {
  const n = tn(e), r = tn(t);
  return n === r && (n === "Object" || n === "Array");
}
function ga(e, t, n) {
  const { aAnnotation: r, bAnnotation: o } = bt(n);
  if (typeof t == "string" && typeof e == "string" && t.length > 0 && e.length > 0 && t.length <= ui && e.length <= ui && t !== e) {
    if (t.includes(`
`) || e.includes(`
`))
      return Th(t, e, n);
    const [l] = pa(t, e), f = l.some((g) => g[0] === ie), h = Oh(r, o), p = h(r) + Ch(hi(l, ye, f)), d = h(o) + kh(hi(l, de, f));
    return `${p}
${d}`;
  }
  const s = Ys(t, { forceWritable: !0 }), i = Ys(e, { forceWritable: !0 }), { replacedExpected: a, replacedActual: u } = ya(i, s);
  return Nt(a, u, n);
}
function ya(e, t, n = /* @__PURE__ */ new WeakSet(), r = /* @__PURE__ */ new WeakSet()) {
  return e instanceof Error && t instanceof Error && typeof e.cause < "u" && typeof t.cause > "u" ? (delete e.cause, {
    replacedActual: e,
    replacedExpected: t
  }) : fi(e, t) ? n.has(e) || r.has(t) ? {
    replacedActual: e,
    replacedExpected: t
  } : (n.add(e), r.add(t), na(t).forEach((o) => {
    const s = t[o], i = e[o];
    if (li(s))
      s.asymmetricMatch(i) && (e[o] = s);
    else if (li(i))
      i.asymmetricMatch(s) && (t[o] = i);
    else if (fi(i, s)) {
      const a = ya(i, s, n, r);
      e[o] = a.replacedActual, t[o] = a.replacedExpected;
    }
  }), {
    replacedActual: e,
    replacedExpected: t
  }) : {
    replacedActual: e,
    replacedExpected: t
  };
}
function Oh(...e) {
  const t = e.reduce((n, r) => r.length > n ? r.length : n, 0);
  return (n) => `${n}: ${" ".repeat(t - n.length)}`;
}
const Ah = "·";
function ba(e) {
  return e.replace(/\s+$/gm, (t) => Ah.repeat(t.length));
}
function kh(e) {
  return ce.red(ba(Ae(e)));
}
function Ch(e) {
  return ce.green(ba(Ae(e)));
}
function hi(e, t, n) {
  return e.reduce((r, o) => r + (o[0] === ie ? o[1] : o[0] === t ? n ? ce.inverse(o[1]) : o[1] : ""), "");
}
function lt(e) {
  return typeof e == "function" && "_isMockFunction" in e && e._isMockFunction === !0;
}
const Yr = /* @__PURE__ */ new Set(), xo = /* @__PURE__ */ new Set(), wa = /* @__PURE__ */ new WeakMap();
function _o(e = {}) {
  var t;
  const { originalImplementation: n, restore: r, mockImplementation: o, resetToMockImplementation: s, resetToMockName: i } = e;
  r && Yr.add(r);
  const a = Uh(n), u = Kh(), c = jh({
    config: a,
    state: u,
    ...e
  }), l = ((t = o || n) === null || t === void 0 ? void 0 : t.length) ?? 0;
  return Object.defineProperty(c, "length", {
    writable: !0,
    enumerable: !1,
    value: l,
    configurable: !0
  }), i && (a.mockName = c.name || "vi.fn()"), wa.set(c, a), xo.add(c), c._isMockFunction = !0, c.getMockImplementation = () => a.onceMockImplementations[0] || a.mockImplementation, Object.defineProperty(c, "mock", {
    configurable: !1,
    enumerable: !0,
    writable: !1,
    value: u
  }), c.mockImplementation = function(h) {
    return a.mockImplementation = h, c;
  }, c.mockImplementationOnce = function(h) {
    return a.onceMockImplementations.push(h), c;
  }, c.withImplementation = function(h, p) {
    const d = a.mockImplementation, g = a.onceMockImplementations, w = () => {
      a.mockImplementation = d, a.onceMockImplementations = g;
    };
    a.mockImplementation = h, a.onceMockImplementations = [];
    const T = p();
    return typeof T == "object" && typeof T?.then == "function" ? T.then(() => (w(), c)) : (w(), c);
  }, c.mockReturnThis = function() {
    return c.mockImplementation(function() {
      return this;
    });
  }, c.mockReturnValue = function(h) {
    return c.mockImplementation(() => h);
  }, c.mockReturnValueOnce = function(h) {
    return c.mockImplementationOnce(() => h);
  }, c.mockResolvedValue = function(h) {
    return c.mockImplementation(() => Promise.resolve(h));
  }, c.mockResolvedValueOnce = function(h) {
    return c.mockImplementationOnce(() => Promise.resolve(h));
  }, c.mockRejectedValue = function(h) {
    return c.mockImplementation(() => Promise.reject(h));
  }, c.mockRejectedValueOnce = function(h) {
    return c.mockImplementationOnce(() => Promise.reject(h));
  }, c.mockClear = function() {
    return u.calls = [], u.contexts = [], u.instances = [], u.invocationCallOrder = [], u.results = [], u.settledResults = [], c;
  }, c.mockReset = function() {
    return c.mockClear(), a.mockImplementation = s ? o : void 0, a.mockName = i && c.name || "vi.fn()", a.onceMockImplementations = [], c;
  }, c.mockRestore = function() {
    return c.mockReset(), r?.();
  }, c.mockName = function(h) {
    return typeof h == "string" && (a.mockName = h), c;
  }, c.getMockName = function() {
    return a.mockName || "vi.fn()";
  }, Symbol.dispose && (c[Symbol.dispose] = () => c.mockRestore()), o && c.mockImplementation(o), c;
}
function Ih(e) {
  return e != null && lt(e) ? e : _o({
    mockImplementation: e,
    resetToMockImplementation: !0
  });
}
function Ph(e, t, n) {
  mn(e != null, "The vi.spyOn() function could not find an object to spy upon. The first argument must be defined."), mn(typeof e == "object" || typeof e == "function", "Vitest cannot spy on a primitive value.");
  const [r, o] = Ta(e, t) || [];
  mn(o || t in e, `The property "${String(t)}" is not defined on the ${typeof e}.`);
  let s = n || "value", i = !1;
  s === "value" && o && o.value == null && o.get && (s = "get", i = !0);
  let a;
  o ? a = o[s] : s !== "value" ? a = () => e[t] : a = e[t];
  const u = i && a ? a() : a, c = typeof u;
  if (mn(
    // allow only functions
    c === "function" || s !== "value" && a == null,
    `vi.spyOn() can only spy on a function. Received ${c}.`
  ), lt(u))
    return u;
  const l = (p) => {
    const { value: d, ...g } = o || {
      configurable: !0,
      writable: !0
    };
    s !== "value" && delete g.writable, g[s] = p, Object.defineProperty(e, t, g);
  }, h = _o({
    restore: () => {
      r !== e ? Reflect.deleteProperty(e, t) : o && !a ? Object.defineProperty(e, t, o) : l(a);
    },
    originalImplementation: u,
    resetToMockName: !0
  });
  try {
    l(i ? () => h : h);
  } catch (p) {
    throw p instanceof TypeError && Symbol.toStringTag && e[Symbol.toStringTag] === "Module" && (p.message.includes("Cannot redefine property") || p.message.includes("Cannot replace module namespace") || p.message.includes("can't redefine non-configurable property")) ? new TypeError(`Cannot spy on export "${String(t)}". Module namespace is not configurable in ESM. See: https://vitest.dev/guide/browser/#limitations`, { cause: p }) : p;
  }
  return h;
}
function Ta(e, t) {
  const n = Object.getOwnPropertyDescriptor(e, t);
  if (n)
    return [e, n];
  let r = Object.getPrototypeOf(e);
  for (; r !== null; ) {
    const o = Object.getOwnPropertyDescriptor(r, t);
    if (o)
      return [r, o];
    r = Object.getPrototypeOf(r);
  }
}
function mn(e, t) {
  if (!e)
    throw new Error(t);
}
let Nh = 1;
function jh({ state: e, config: t, name: n, prototypeState: r, prototypeConfig: o, keepMembersImplementation: s, mockImplementation: i, prototypeMembers: a = [] }) {
  const u = t.mockOriginal, c = i, l = n || u?.name || "Mock", f = { [l]: (function(...d) {
    Rh(d, e, r), Dh(Nh++, e, r);
    const g = {
      type: "incomplete",
      value: void 0
    }, w = {
      type: "incomplete",
      value: void 0
    };
    Fh(g, e, r), Lh(w, e, r);
    const T = new.target ? void 0 : this, [$, k] = qh(T, e, r), [_, O] = Bh(T, e, r), I = t.onceMockImplementations.shift() || t.mockImplementation || o?.onceMockImplementations.shift() || o?.mockImplementation || u || function() {
    };
    let M, L, ee = !1;
    try {
      if (new.target) {
        M = Reflect.construct(I, d, new.target);
        for (const j of a) {
          const G = M[j], H = lt(G), ae = H ? G.mock : void 0, ue = H ? wa.get(G) : void 0;
          M[j] = _o({
            originalImplementation: s ? ue?.mockOriginal : void 0,
            prototypeState: ae,
            prototypeConfig: ue,
            keepMembersImplementation: s
          });
        }
      } else
        M = I.apply(this, d);
    } catch (j) {
      throw L = j, ee = !0, j instanceof TypeError && j.message.includes("is not a constructor") && console.warn(`[vitest] The ${f[l].getMockName()} mock did not use 'function' or 'class' in its implementation, see https://vitest.dev/api/vi#vi-spyon for examples.`), j;
    } finally {
      ee ? (g.type = "throw", g.value = L, w.type = "rejected", w.value = L) : (g.type = "return", g.value = M, new.target && (e.contexts[_ - 1] = M, e.instances[$ - 1] = M, O != null && r && (r.contexts[O - 1] = M), k != null && r && (r.instances[k - 1] = M)), M instanceof Promise ? M.then((j) => {
        w.type = "fulfilled", w.value = j;
      }, (j) => {
        w.type = "rejected", w.value = j;
      }) : (w.type = "fulfilled", w.value = M));
    }
    return M;
  }) }, h = f[l], p = u || c;
  return p && zh(h, p), h;
}
function Rh(e, t, n) {
  t.calls.push(e), n?.calls.push(e);
}
function Dh(e, t, n) {
  t.invocationCallOrder.push(e), n?.invocationCallOrder.push(e);
}
function Fh(e, t, n) {
  t.results.push(e), n?.results.push(e);
}
function Lh(e, t, n) {
  t.settledResults.push(e), n?.settledResults.push(e);
}
function qh(e, t, n) {
  const r = t.instances.push(e), o = n?.instances.push(e);
  return [r, o];
}
function Bh(e, t, n) {
  const r = t.contexts.push(e), o = n?.contexts.push(e);
  return [r, o];
}
function zh(e, t) {
  const { properties: n, descriptors: r } = Vh(t);
  for (const o of n) {
    const s = r[o];
    Ta(e, o) || Object.defineProperty(e, o, s);
  }
}
const Wh = /* @__PURE__ */ new Set([
  "length",
  "name",
  "prototype",
  Symbol.for("nodejs.util.promisify.custom")
]);
function Vh(e) {
  const t = /* @__PURE__ */ new Set(), n = {};
  for (; e && e !== Object.prototype && e !== Function.prototype; ) {
    const r = [...Object.getOwnPropertyNames(e), ...Object.getOwnPropertySymbols(e)];
    for (const o of r)
      n[o] || Wh.has(o) || (t.add(o), n[o] = Object.getOwnPropertyDescriptor(e, o));
    e = Object.getPrototypeOf(e);
  }
  return {
    properties: t,
    descriptors: n
  };
}
function Uh(e) {
  return {
    mockImplementation: void 0,
    mockOriginal: e,
    mockName: "vi.fn()",
    onceMockImplementations: []
  };
}
function Kh() {
  const e = {
    calls: [],
    contexts: [],
    instances: [],
    invocationCallOrder: [],
    settledResults: [],
    results: [],
    get lastCall() {
      return e.calls.at(-1);
    }
  };
  return e;
}
function Gh() {
  for (const e of Yr)
    e();
  Yr.clear();
}
function Yh() {
  xo.forEach((e) => e.mockClear());
}
function Jh() {
  xo.forEach((e) => e.mockReset());
}
const Xh = "@@__IMMUTABLE_RECORD__@@", Hh = "@@__IMMUTABLE_ITERABLE__@@";
function Zh(e) {
  return e && (e[Hh] || e[Xh]);
}
const Qh = Object.getPrototypeOf({});
function pi(e) {
  return e instanceof Error ? `<unserializable>: ${e.message}` : typeof e == "string" ? `<unserializable>: ${e}` : "<unserializable>";
}
function nt(e, t = /* @__PURE__ */ new WeakMap()) {
  if (!e || typeof e == "string")
    return e;
  if (e instanceof Error && "toJSON" in e && typeof e.toJSON == "function") {
    const n = e.toJSON();
    return n && n !== e && typeof n == "object" && (typeof e.message == "string" && Bt(() => n.message ?? (n.message = di(e.message))), typeof e.stack == "string" && Bt(() => n.stack ?? (n.stack = e.stack)), typeof e.name == "string" && Bt(() => n.name ?? (n.name = e.name)), e.cause != null && Bt(() => n.cause ?? (n.cause = nt(e.cause, t)))), nt(n, t);
  }
  if (typeof e == "function")
    return `Function<${e.name || "anonymous"}>`;
  if (typeof e == "symbol")
    return e.toString();
  if (typeof e != "object")
    return e;
  if (typeof Buffer < "u" && e instanceof Buffer)
    return `<Buffer(${e.length}) ...>`;
  if (typeof Uint8Array < "u" && e instanceof Uint8Array)
    return `<Uint8Array(${e.length}) ...>`;
  if (Zh(e))
    return nt(e.toJSON(), t);
  if (e instanceof Promise || e.constructor && e.constructor.prototype === "AsyncFunction")
    return "Promise";
  if (typeof Element < "u" && e instanceof Element)
    return e.tagName;
  if (typeof e.toJSON == "function")
    return nt(e.toJSON(), t);
  if (t.has(e))
    return t.get(e);
  if (Array.isArray(e)) {
    const n = new Array(e.length);
    return t.set(e, n), e.forEach((r, o) => {
      try {
        n[o] = nt(r, t);
      } catch (s) {
        n[o] = pi(s);
      }
    }), n;
  } else {
    const n = /* @__PURE__ */ Object.create(null);
    t.set(e, n);
    let r = e;
    for (; r && r !== Qh; )
      Object.getOwnPropertyNames(r).forEach((o) => {
        if (!(o in n))
          try {
            n[o] = nt(e[o], t);
          } catch (s) {
            delete n[o], n[o] = pi(s);
          }
      }), r = Object.getPrototypeOf(r);
    return e instanceof Error && Bt(() => e.message = di(e.message)), n;
  }
}
function Bt(e) {
  try {
    return e();
  } catch {
  }
}
function di(e) {
  return e.replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "");
}
function Sa(e, t, n = /* @__PURE__ */ new WeakSet()) {
  if (!e || typeof e != "object")
    return { message: String(e) };
  const r = e;
  (r.showDiff || r.showDiff === void 0 && r.expected !== void 0 && r.actual !== void 0) && (r.diff = ga(r.actual, r.expected, {
    ...t,
    ...r.diffOptions
  })), "expected" in r && typeof r.expected != "string" && (r.expected = Ae(r.expected, 10)), "actual" in r && typeof r.actual != "string" && (r.actual = Ae(r.actual, 10));
  try {
    !n.has(r) && typeof r.cause == "object" && (n.add(r), r.cause = Sa(r.cause, t, n));
  } catch {
  }
  try {
    return nt(r);
  } catch (o) {
    return nt(new Error(`Failed to fully serialize error: ${o?.message}
Inner error message: ${r?.message}`));
  }
}
var Ea = Object.defineProperty, v = (e, t) => Ea(e, "name", { value: t, configurable: !0 }), Mo = (e, t) => {
  for (var n in t)
    Ea(e, n, { get: t[n], enumerable: !0 });
}, he = {};
Mo(he, {
  addChainableMethod: () => qo,
  addLengthGuard: () => cn,
  addMethod: () => Do,
  addProperty: () => Ro,
  checkError: () => _e,
  compareByInspect: () => Mn,
  eql: () => Ja,
  events: () => Wn,
  expectTypes: () => Aa,
  flag: () => q,
  getActual: () => Bn,
  getMessage: () => ko,
  getName: () => Vn,
  getOperator: () => Vo,
  getOwnEnumerableProperties: () => Wo,
  getOwnEnumerablePropertySymbols: () => zo,
  getPathInfo: () => No,
  hasProperty: () => zn,
  inspect: () => W,
  isNaN: () => On,
  isNumeric: () => pe,
  isProxyEnabled: () => sn,
  isRegExp: () => An,
  objDisplay: () => ft,
  overwriteChainableMethod: () => Bo,
  overwriteMethod: () => Lo,
  overwriteProperty: () => Fo,
  proxify: () => jt,
  test: () => Oo,
  transferFlags: () => ze,
  type: () => Q
});
var _e = {};
Mo(_e, {
  compatibleConstructor: () => xa,
  compatibleInstance: () => $a,
  compatibleMessage: () => _a,
  getConstructorName: () => Ma,
  getMessage: () => Oa
});
function qn(e) {
  return e instanceof Error || Object.prototype.toString.call(e) === "[object Error]";
}
v(qn, "isErrorInstance");
function va(e) {
  return Object.prototype.toString.call(e) === "[object RegExp]";
}
v(va, "isRegExp");
function $a(e, t) {
  return qn(t) && e === t;
}
v($a, "compatibleInstance");
function xa(e, t) {
  return qn(t) ? e.constructor === t.constructor || e instanceof t.constructor : (typeof t == "object" || typeof t == "function") && t.prototype ? e.constructor === t || e instanceof t : !1;
}
v(xa, "compatibleConstructor");
function _a(e, t) {
  const n = typeof e == "string" ? e : e.message;
  return va(t) ? t.test(n) : typeof t == "string" ? n.indexOf(t) !== -1 : !1;
}
v(_a, "compatibleMessage");
function Ma(e) {
  let t = e;
  return qn(e) ? t = e.constructor.name : typeof e == "function" && (t = e.name, t === "" && (t = new e().name || t)), t;
}
v(Ma, "getConstructorName");
function Oa(e) {
  let t = "";
  return e && e.message ? t = e.message : typeof e == "string" && (t = e), t;
}
v(Oa, "getMessage");
function q(e, t, n) {
  let r = e.__flags || (e.__flags = /* @__PURE__ */ Object.create(null));
  if (arguments.length === 3)
    r[t] = n;
  else
    return r[t];
}
v(q, "flag");
function Oo(e, t) {
  let n = q(e, "negate"), r = t[0];
  return n ? !r : r;
}
v(Oo, "test");
function Q(e) {
  if (typeof e > "u")
    return "undefined";
  if (e === null)
    return "null";
  const t = e[Symbol.toStringTag];
  return typeof t == "string" ? t : Object.prototype.toString.call(e).slice(8, -1);
}
v(Q, "type");
var ep = "captureStackTrace" in Error, pt, K = (pt = class extends Error {
  message;
  get name() {
    return "AssertionError";
  }
  get ok() {
    return !1;
  }
  constructor(t = "Unspecified AssertionError", n, r) {
    super(t), this.message = t, ep && Error.captureStackTrace(this, r || pt);
    for (const o in n)
      o in this || (this[o] = n[o]);
  }
  toJSON(t) {
    return {
      ...this,
      name: this.name,
      message: this.message,
      ok: !1,
      stack: t !== !1 ? this.stack : void 0
    };
  }
}, v(pt, "AssertionError"), pt);
function Aa(e, t) {
  let n = q(e, "message"), r = q(e, "ssfi");
  n = n ? n + ": " : "", e = q(e, "object"), t = t.map(function(i) {
    return i.toLowerCase();
  }), t.sort();
  let o = t.map(function(i, a) {
    let u = ~["a", "e", "i", "o", "u"].indexOf(i.charAt(0)) ? "an" : "a";
    return (t.length > 1 && a === t.length - 1 ? "or " : "") + u + " " + i;
  }).join(", "), s = Q(e).toLowerCase();
  if (!t.some(function(i) {
    return s === i;
  }))
    throw new K(
      n + "object tested must be " + o + ", but " + s + " given",
      void 0,
      r
    );
}
v(Aa, "expectTypes");
function Bn(e, t) {
  return t.length > 4 ? t[4] : e._obj;
}
v(Bn, "getActual");
var mi = {
  bold: ["1", "22"],
  dim: ["2", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  // 5 & 6 are blinking
  inverse: ["7", "27"],
  hidden: ["8", "28"],
  strike: ["9", "29"],
  // 10-20 are fonts
  // 21-29 are resets for 1-9
  black: ["30", "39"],
  red: ["31", "39"],
  green: ["32", "39"],
  yellow: ["33", "39"],
  blue: ["34", "39"],
  magenta: ["35", "39"],
  cyan: ["36", "39"],
  white: ["37", "39"],
  brightblack: ["30;1", "39"],
  brightred: ["31;1", "39"],
  brightgreen: ["32;1", "39"],
  brightyellow: ["33;1", "39"],
  brightblue: ["34;1", "39"],
  brightmagenta: ["35;1", "39"],
  brightcyan: ["36;1", "39"],
  brightwhite: ["37;1", "39"],
  grey: ["90", "39"]
}, tp = {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  regexp: "red"
}, It = "…";
function ka(e, t) {
  const n = mi[tp[t]] || mi[t] || "";
  return n ? `\x1B[${n[0]}m${String(e)}\x1B[${n[1]}m` : String(e);
}
v(ka, "colorise");
function Ca({
  showHidden: e = !1,
  depth: t = 2,
  colors: n = !1,
  customInspect: r = !0,
  showProxy: o = !1,
  maxArrayLength: s = 1 / 0,
  breakLength: i = 1 / 0,
  seen: a = [],
  // eslint-disable-next-line no-shadow
  truncate: u = 1 / 0,
  stylize: c = String
} = {}, l) {
  const f = {
    showHidden: !!e,
    depth: Number(t),
    colors: !!n,
    customInspect: !!r,
    showProxy: !!o,
    maxArrayLength: Number(s),
    breakLength: Number(i),
    truncate: Number(u),
    seen: a,
    inspect: l,
    stylize: c
  };
  return f.colors && (f.stylize = ka), f;
}
v(Ca, "normaliseOptions");
function Ia(e) {
  return e >= "\uD800" && e <= "\uDBFF";
}
v(Ia, "isHighSurrogate");
function Ze(e, t, n = It) {
  e = String(e);
  const r = n.length, o = e.length;
  if (r > t && o > r)
    return n;
  if (o > t && o > r) {
    let s = t - r;
    return s > 0 && Ia(e[s - 1]) && (s = s - 1), `${e.slice(0, s)}${n}`;
  }
  return e;
}
v(Ze, "truncate");
function Ie(e, t, n, r = ", ") {
  n = n || t.inspect;
  const o = e.length;
  if (o === 0)
    return "";
  const s = t.truncate;
  let i = "", a = "", u = "";
  for (let c = 0; c < o; c += 1) {
    const l = c + 1 === e.length, f = c + 2 === e.length;
    u = `${It}(${e.length - c})`;
    const h = e[c];
    t.truncate = s - i.length - (l ? 0 : r.length);
    const p = a || n(h, t) + (l ? "" : r), d = i.length + p.length, g = d + u.length;
    if (l && d > s && i.length + u.length <= s || !l && !f && g > s || (a = l ? "" : n(e[c + 1], t) + (f ? "" : r), !l && f && g > s && d + a.length > s))
      break;
    if (i += p, !l && !f && d + a.length >= s) {
      u = `${It}(${e.length - c - 1})`;
      break;
    }
    u = "";
  }
  return `${i}${u}`;
}
v(Ie, "inspectList");
function Pa(e) {
  return e.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) ? e : JSON.stringify(e).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
v(Pa, "quoteComplexKey");
function Pt([e, t], n) {
  return n.truncate -= 2, typeof e == "string" ? e = Pa(e) : typeof e != "number" && (e = `[${n.inspect(e, n)}]`), n.truncate -= e.length, t = n.inspect(t, n), `${e}: ${t}`;
}
v(Pt, "inspectProperty");
function Na(e, t) {
  const n = Object.keys(e).slice(e.length);
  if (!e.length && !n.length)
    return "[]";
  t.truncate -= 4;
  const r = Ie(e, t);
  t.truncate -= r.length;
  let o = "";
  return n.length && (o = Ie(n.map((s) => [s, e[s]]), t, Pt)), `[ ${r}${o ? `, ${o}` : ""} ]`;
}
v(Na, "inspectArray");
var np = /* @__PURE__ */ v((e) => typeof Buffer == "function" && e instanceof Buffer ? "Buffer" : e[Symbol.toStringTag] ? e[Symbol.toStringTag] : e.constructor.name, "getArrayName");
function Ve(e, t) {
  const n = np(e);
  t.truncate -= n.length + 4;
  const r = Object.keys(e).slice(e.length);
  if (!e.length && !r.length)
    return `${n}[]`;
  let o = "";
  for (let i = 0; i < e.length; i++) {
    const a = `${t.stylize(Ze(e[i], t.truncate), "number")}${i === e.length - 1 ? "" : ", "}`;
    if (t.truncate -= a.length, e[i] !== e.length && t.truncate <= 3) {
      o += `${It}(${e.length - e[i] + 1})`;
      break;
    }
    o += a;
  }
  let s = "";
  return r.length && (s = Ie(r.map((i) => [i, e[i]]), t, Pt)), `${n}[ ${o}${s ? `, ${s}` : ""} ]`;
}
v(Ve, "inspectTypedArray");
function ja(e, t) {
  const n = e.toJSON();
  if (n === null)
    return "Invalid Date";
  const r = n.split("T"), o = r[0];
  return t.stylize(`${o}T${Ze(r[1], t.truncate - o.length - 1)}`, "date");
}
v(ja, "inspectDate");
function Jr(e, t) {
  const n = e[Symbol.toStringTag] || "Function", r = e.name;
  return r ? t.stylize(`[${n} ${Ze(r, t.truncate - 11)}]`, "special") : t.stylize(`[${n}]`, "special");
}
v(Jr, "inspectFunction");
function Ra([e, t], n) {
  return n.truncate -= 4, e = n.inspect(e, n), n.truncate -= e.length, t = n.inspect(t, n), `${e} => ${t}`;
}
v(Ra, "inspectMapEntry");
function Da(e) {
  const t = [];
  return e.forEach((n, r) => {
    t.push([r, n]);
  }), t;
}
v(Da, "mapToEntries");
function Fa(e, t) {
  return e.size === 0 ? "Map{}" : (t.truncate -= 7, `Map{ ${Ie(Da(e), t, Ra)} }`);
}
v(Fa, "inspectMap");
var rp = Number.isNaN || ((e) => e !== e);
function Xr(e, t) {
  return rp(e) ? t.stylize("NaN", "number") : e === 1 / 0 ? t.stylize("Infinity", "number") : e === -1 / 0 ? t.stylize("-Infinity", "number") : e === 0 ? t.stylize(1 / e === 1 / 0 ? "+0" : "-0", "number") : t.stylize(Ze(String(e), t.truncate), "number");
}
v(Xr, "inspectNumber");
function Hr(e, t) {
  let n = Ze(e.toString(), t.truncate - 1);
  return n !== It && (n += "n"), t.stylize(n, "bigint");
}
v(Hr, "inspectBigInt");
function La(e, t) {
  const n = e.toString().split("/")[2], r = t.truncate - (2 + n.length), o = e.source;
  return t.stylize(`/${Ze(o, r)}/${n}`, "regexp");
}
v(La, "inspectRegExp");
function qa(e) {
  const t = [];
  return e.forEach((n) => {
    t.push(n);
  }), t;
}
v(qa, "arrayFromSet");
function Ba(e, t) {
  return e.size === 0 ? "Set{}" : (t.truncate -= 7, `Set{ ${Ie(qa(e), t)} }`);
}
v(Ba, "inspectSet");
var gi = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g"), op = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
}, sp = 16;
function za(e) {
  return op[e] || `\\u${`0000${e.charCodeAt(0).toString(sp)}`.slice(-4)}`;
}
v(za, "escape");
function Zr(e, t) {
  return gi.test(e) && (e = e.replace(gi, za)), t.stylize(`'${Ze(e, t.truncate - 2)}'`, "string");
}
v(Zr, "inspectString");
function Qr(e) {
  return "description" in Symbol.prototype ? e.description ? `Symbol(${e.description})` : "Symbol()" : e.toString();
}
v(Qr, "inspectSymbol");
var ip = /* @__PURE__ */ v(() => "Promise{…}", "getPromiseValue"), cp = ip;
function Yt(e, t) {
  const n = Object.getOwnPropertyNames(e), r = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(e) : [];
  if (n.length === 0 && r.length === 0)
    return "{}";
  if (t.truncate -= 4, t.seen = t.seen || [], t.seen.includes(e))
    return "[Circular]";
  t.seen.push(e);
  const o = Ie(n.map((a) => [a, e[a]]), t, Pt), s = Ie(r.map((a) => [a, e[a]]), t, Pt);
  t.seen.pop();
  let i = "";
  return o && s && (i = ", "), `{ ${o}${i}${s} }`;
}
v(Yt, "inspectObject");
var pr = typeof Symbol < "u" && Symbol.toStringTag ? Symbol.toStringTag : !1;
function Wa(e, t) {
  let n = "";
  return pr && pr in e && (n = e[pr]), n = n || e.constructor.name, (!n || n === "_class") && (n = "<Anonymous Class>"), t.truncate -= n.length, `${n}${Yt(e, t)}`;
}
v(Wa, "inspectClass");
function Va(e, t) {
  return e.length === 0 ? "Arguments[]" : (t.truncate -= 13, `Arguments[ ${Ie(e, t)} ]`);
}
v(Va, "inspectArguments");
var ap = [
  "stack",
  "line",
  "column",
  "name",
  "message",
  "fileName",
  "lineNumber",
  "columnNumber",
  "number",
  "description",
  "cause"
];
function Ua(e, t) {
  const n = Object.getOwnPropertyNames(e).filter((i) => ap.indexOf(i) === -1), r = e.name;
  t.truncate -= r.length;
  let o = "";
  if (typeof e.message == "string" ? o = Ze(e.message, t.truncate) : n.unshift("message"), o = o ? `: ${o}` : "", t.truncate -= o.length + 5, t.seen = t.seen || [], t.seen.includes(e))
    return "[Circular]";
  t.seen.push(e);
  const s = Ie(n.map((i) => [i, e[i]]), t, Pt);
  return `${r}${o}${s ? ` { ${s} }` : ""}`;
}
v(Ua, "inspectObject");
function Ka([e, t], n) {
  return n.truncate -= 3, t ? `${n.stylize(String(e), "yellow")}=${n.stylize(`"${t}"`, "string")}` : `${n.stylize(String(e), "yellow")}`;
}
v(Ka, "inspectAttribute");
function xn(e, t) {
  return Ie(e, t, Ga, `
`);
}
v(xn, "inspectNodeCollection");
function Ga(e, t) {
  switch (e.nodeType) {
    case 1:
      return Ao(e, t);
    case 3:
      return t.inspect(e.data, t);
    default:
      return t.inspect(e, t);
  }
}
v(Ga, "inspectNode");
function Ao(e, t) {
  const n = e.getAttributeNames(), r = e.tagName.toLowerCase(), o = t.stylize(`<${r}`, "special"), s = t.stylize(">", "special"), i = t.stylize(`</${r}>`, "special");
  t.truncate -= r.length * 2 + 5;
  let a = "";
  n.length > 0 && (a += " ", a += Ie(n.map((l) => [l, e.getAttribute(l)]), t, Ka, " ")), t.truncate -= a.length;
  const u = t.truncate;
  let c = xn(e.children, t);
  return c && c.length > u && (c = `${It}(${e.children.length})`), `${o}${a}${s}${c}${i}`;
}
v(Ao, "inspectHTML");
var up = typeof Symbol == "function" && typeof Symbol.for == "function", dr = up ? Symbol.for("chai/inspect") : "@@chai/inspect", mr = Symbol.for("nodejs.util.inspect.custom"), yi = /* @__PURE__ */ new WeakMap(), bi = {}, wi = {
  undefined: /* @__PURE__ */ v((e, t) => t.stylize("undefined", "undefined"), "undefined"),
  null: /* @__PURE__ */ v((e, t) => t.stylize("null", "null"), "null"),
  boolean: /* @__PURE__ */ v((e, t) => t.stylize(String(e), "boolean"), "boolean"),
  Boolean: /* @__PURE__ */ v((e, t) => t.stylize(String(e), "boolean"), "Boolean"),
  number: Xr,
  Number: Xr,
  bigint: Hr,
  BigInt: Hr,
  string: Zr,
  String: Zr,
  function: Jr,
  Function: Jr,
  symbol: Qr,
  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
  Symbol: Qr,
  Array: Na,
  Date: ja,
  Map: Fa,
  Set: Ba,
  RegExp: La,
  Promise: cp,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: /* @__PURE__ */ v((e, t) => t.stylize("WeakSet{…}", "special"), "WeakSet"),
  WeakMap: /* @__PURE__ */ v((e, t) => t.stylize("WeakMap{…}", "special"), "WeakMap"),
  Arguments: Va,
  Int8Array: Ve,
  Uint8Array: Ve,
  Uint8ClampedArray: Ve,
  Int16Array: Ve,
  Uint16Array: Ve,
  Int32Array: Ve,
  Uint32Array: Ve,
  Float32Array: Ve,
  Float64Array: Ve,
  Generator: /* @__PURE__ */ v(() => "", "Generator"),
  DataView: /* @__PURE__ */ v(() => "", "DataView"),
  ArrayBuffer: /* @__PURE__ */ v(() => "", "ArrayBuffer"),
  Error: Ua,
  HTMLCollection: xn,
  NodeList: xn
}, lp = /* @__PURE__ */ v((e, t, n, r) => dr in e && typeof e[dr] == "function" ? e[dr](t) : mr in e && typeof e[mr] == "function" ? e[mr](t.depth, t, r) : "inspect" in e && typeof e.inspect == "function" ? e.inspect(t.depth, t) : "constructor" in e && yi.has(e.constructor) ? yi.get(e.constructor)(e, t) : bi[n] ? bi[n](e, t) : "", "inspectCustom"), fp = Object.prototype.toString;
function Jt(e, t = {}) {
  const n = Ca(t, Jt), { customInspect: r } = n;
  let o = e === null ? "null" : typeof e;
  if (o === "object" && (o = fp.call(e).slice(8, -1)), o in wi)
    return wi[o](e, n);
  if (r && e) {
    const i = lp(e, n, o, Jt);
    if (i)
      return typeof i == "string" ? i : Jt(i, n);
  }
  const s = e ? Object.getPrototypeOf(e) : !1;
  return s === Object.prototype || s === null ? Yt(e, n) : e && typeof HTMLElement == "function" && e instanceof HTMLElement ? Ao(e, n) : "constructor" in e ? e.constructor !== Object ? Wa(e, n) : Yt(e, n) : e === Object(e) ? Yt(e, n) : n.stylize(String(e), o);
}
v(Jt, "inspect");
var we = {
  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {boolean}
   * @public
   */
  includeStack: !1,
  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {boolean}
   * @public
   */
  showDiff: !0,
  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded, for
   * example for large data structures, the value is replaced with something
   * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   * This is especially userful when doing assertions on arrays: having this
   * set to a reasonable large value makes the failure messages readily
   * inspectable.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {number}
   * @public
   */
  truncateThreshold: 40,
  /**
   * ### config.useProxy
   *
   * User configurable property, defines if chai will use a Proxy to throw
   * an error when a non-existent property is read, which protects users
   * from typos when using property-based assertions.
   *
   * Set it to false if you want to disable this feature.
   *
   *     chai.config.useProxy = false;  // disable use of Proxy
   *
   * This feature is automatically disabled regardless of this config value
   * in environments that don't support proxies.
   *
   * @param {boolean}
   * @public
   */
  useProxy: !0,
  /**
   * ### config.proxyExcludedKeys
   *
   * User configurable property, defines which properties should be ignored
   * instead of throwing an error if they do not exist on the assertion.
   * This is only applied if the environment Chai is running in supports proxies and
   * if the `useProxy` configuration setting is enabled.
   * By default, `then` and `inspect` will not throw an error if they do not exist on the
   * assertion object because the `.inspect` property is read by `util.inspect` (for example, when
   * using `console.log` on the assertion object) and `.then` is necessary for promise type-checking.
   *
   *     // By default these keys will not throw an error if they do not exist on the assertion object
   *     chai.config.proxyExcludedKeys = ['then', 'inspect'];
   *
   * @param {Array}
   * @public
   */
  proxyExcludedKeys: ["then", "catch", "inspect", "toJSON"],
  /**
   * ### config.deepEqual
   *
   * User configurable property, defines which a custom function to use for deepEqual
   * comparisons.
   * By default, the function used is the one from the `deep-eql` package without custom comparator.
   *
   *     // use a custom comparator
   *     chai.config.deepEqual = (expected, actual) => {
   *         return chai.util.eql(expected, actual, {
   *             comparator: (expected, actual) => {
   *                 // for non number comparison, use the default behavior
   *                 if(typeof expected !== 'number') return null;
   *                 // allow a difference of 10 between compared numbers
   *                 return typeof actual === 'number' && Math.abs(actual - expected) < 10
   *             }
   *         })
   *     };
   *
   * @param {Function}
   * @public
   */
  deepEqual: null
};
function W(e, t, n, r) {
  let o = {
    colors: r,
    depth: typeof n > "u" ? 2 : n,
    showHidden: t,
    truncate: we.truncateThreshold ? we.truncateThreshold : 1 / 0
  };
  return Jt(e, o);
}
v(W, "inspect");
function ft(e) {
  let t = W(e), n = Object.prototype.toString.call(e);
  if (we.truncateThreshold && t.length >= we.truncateThreshold) {
    if (n === "[object Function]")
      return !e.name || e.name === "" ? "[Function]" : "[Function: " + e.name + "]";
    if (n === "[object Array]")
      return "[ Array(" + e.length + ") ]";
    if (n === "[object Object]") {
      let r = Object.keys(e);
      return "{ Object (" + (r.length > 2 ? r.splice(0, 2).join(", ") + ", ..." : r.join(", ")) + ") }";
    } else
      return t;
  } else
    return t;
}
v(ft, "objDisplay");
function ko(e, t) {
  let n = q(e, "negate"), r = q(e, "object"), o = t[3], s = Bn(e, t), i = n ? t[2] : t[1], a = q(e, "message");
  return typeof i == "function" && (i = i()), i = i || "", i = i.replace(/#\{this\}/g, function() {
    return ft(r);
  }).replace(/#\{act\}/g, function() {
    return ft(s);
  }).replace(/#\{exp\}/g, function() {
    return ft(o);
  }), a ? a + ": " + i : i;
}
v(ko, "getMessage");
function ze(e, t, n) {
  let r = e.__flags || (e.__flags = /* @__PURE__ */ Object.create(null));
  t.__flags || (t.__flags = /* @__PURE__ */ Object.create(null)), n = arguments.length === 3 ? n : !0;
  for (let o in r)
    (n || o !== "object" && o !== "ssfi" && o !== "lockSsfi" && o != "message") && (t.__flags[o] = r[o]);
}
v(ze, "transferFlags");
function eo(e) {
  if (typeof e > "u")
    return "undefined";
  if (e === null)
    return "null";
  const t = e[Symbol.toStringTag];
  return typeof t == "string" ? t : Object.prototype.toString.call(e).slice(8, -1);
}
v(eo, "type");
function Co() {
  this._key = "chai/deep-eql__" + Math.random() + Date.now();
}
v(Co, "FakeMap");
Co.prototype = {
  get: /* @__PURE__ */ v(function(t) {
    return t[this._key];
  }, "get"),
  set: /* @__PURE__ */ v(function(t, n) {
    Object.isExtensible(t) && Object.defineProperty(t, this._key, {
      value: n,
      configurable: !0
    });
  }, "set")
};
var Ya = typeof WeakMap == "function" ? WeakMap : Co;
function to(e, t, n) {
  if (!n || mt(e) || mt(t))
    return null;
  var r = n.get(e);
  if (r) {
    var o = r.get(t);
    if (typeof o == "boolean")
      return o;
  }
  return null;
}
v(to, "memoizeCompare");
function Gt(e, t, n, r) {
  if (!(!n || mt(e) || mt(t))) {
    var o = n.get(e);
    o ? o.set(t, r) : (o = new Ya(), o.set(t, r), n.set(e, o));
  }
}
v(Gt, "memoizeSet");
var Ja = on;
function on(e, t, n) {
  if (n && n.comparator)
    return no(e, t, n);
  var r = Io(e, t);
  return r !== null ? r : no(e, t, n);
}
v(on, "deepEqual");
function Io(e, t) {
  return e === t ? e !== 0 || 1 / e === 1 / t : e !== e && // eslint-disable-line no-self-compare
  t !== t ? !0 : mt(e) || mt(t) ? !1 : null;
}
v(Io, "simpleEqual");
function no(e, t, n) {
  n = n || {}, n.memoize = n.memoize === !1 ? !1 : n.memoize || new Ya();
  var r = n && n.comparator, o = to(e, t, n.memoize);
  if (o !== null)
    return o;
  var s = to(t, e, n.memoize);
  if (s !== null)
    return s;
  if (r) {
    var i = r(e, t);
    if (i === !1 || i === !0)
      return Gt(e, t, n.memoize, i), i;
    var a = Io(e, t);
    if (a !== null)
      return a;
  }
  var u = eo(e);
  if (u !== eo(t))
    return Gt(e, t, n.memoize, !1), !1;
  Gt(e, t, n.memoize, !0);
  var c = Xa(e, t, u, n);
  return Gt(e, t, n.memoize, c), c;
}
v(no, "extensiveDeepEqual");
function Xa(e, t, n, r) {
  switch (n) {
    case "String":
    case "Number":
    case "Boolean":
    case "Date":
      return on(e.valueOf(), t.valueOf());
    case "Promise":
    case "Symbol":
    case "function":
    case "WeakMap":
    case "WeakSet":
      return e === t;
    case "Error":
      return Po(e, t, ["name", "message", "code"], r);
    case "Arguments":
    case "Int8Array":
    case "Uint8Array":
    case "Uint8ClampedArray":
    case "Int16Array":
    case "Uint16Array":
    case "Int32Array":
    case "Uint32Array":
    case "Float32Array":
    case "Float64Array":
    case "Array":
      return rt(e, t, r);
    case "RegExp":
      return Ha(e, t);
    case "Generator":
      return Za(e, t, r);
    case "DataView":
      return rt(new Uint8Array(e.buffer), new Uint8Array(t.buffer), r);
    case "ArrayBuffer":
      return rt(new Uint8Array(e), new Uint8Array(t), r);
    case "Set":
      return ro(e, t, r);
    case "Map":
      return ro(e, t, r);
    case "Temporal.PlainDate":
    case "Temporal.PlainTime":
    case "Temporal.PlainDateTime":
    case "Temporal.Instant":
    case "Temporal.ZonedDateTime":
    case "Temporal.PlainYearMonth":
    case "Temporal.PlainMonthDay":
      return e.equals(t);
    case "Temporal.Duration":
      return e.total("nanoseconds") === t.total("nanoseconds");
    case "Temporal.TimeZone":
    case "Temporal.Calendar":
      return e.toString() === t.toString();
    default:
      return eu(e, t, r);
  }
}
v(Xa, "extensiveDeepEqualByType");
function Ha(e, t) {
  return e.toString() === t.toString();
}
v(Ha, "regexpEqual");
function ro(e, t, n) {
  try {
    if (e.size !== t.size)
      return !1;
    if (e.size === 0)
      return !0;
  } catch {
    return !1;
  }
  var r = [], o = [];
  return e.forEach(/* @__PURE__ */ v(function(i, a) {
    r.push([i, a]);
  }, "gatherEntries")), t.forEach(/* @__PURE__ */ v(function(i, a) {
    o.push([i, a]);
  }, "gatherEntries")), rt(r.sort(), o.sort(), n);
}
v(ro, "entriesEqual");
function rt(e, t, n) {
  var r = e.length;
  if (r !== t.length)
    return !1;
  if (r === 0)
    return !0;
  for (var o = -1; ++o < r; )
    if (on(e[o], t[o], n) === !1)
      return !1;
  return !0;
}
v(rt, "iterableEqual");
function Za(e, t, n) {
  return rt(_n(e), _n(t), n);
}
v(Za, "generatorEqual");
function Qa(e) {
  return typeof Symbol < "u" && typeof e == "object" && typeof Symbol.iterator < "u" && typeof e[Symbol.iterator] == "function";
}
v(Qa, "hasIteratorFunction");
function oo(e) {
  if (Qa(e))
    try {
      return _n(e[Symbol.iterator]());
    } catch {
      return [];
    }
  return [];
}
v(oo, "getIteratorEntries");
function _n(e) {
  for (var t = e.next(), n = [t.value]; t.done === !1; )
    t = e.next(), n.push(t.value);
  return n;
}
v(_n, "getGeneratorEntries");
function so(e) {
  var t = [];
  for (var n in e)
    t.push(n);
  return t;
}
v(so, "getEnumerableKeys");
function io(e) {
  for (var t = [], n = Object.getOwnPropertySymbols(e), r = 0; r < n.length; r += 1) {
    var o = n[r];
    Object.getOwnPropertyDescriptor(e, o).enumerable && t.push(o);
  }
  return t;
}
v(io, "getEnumerableSymbols");
function Po(e, t, n, r) {
  var o = n.length;
  if (o === 0)
    return !0;
  for (var s = 0; s < o; s += 1)
    if (on(e[n[s]], t[n[s]], r) === !1)
      return !1;
  return !0;
}
v(Po, "keysEqual");
function eu(e, t, n) {
  var r = so(e), o = so(t), s = io(e), i = io(t);
  if (r = r.concat(s), o = o.concat(i), r.length && r.length === o.length)
    return rt(co(r).sort(), co(o).sort()) === !1 ? !1 : Po(e, t, r, n);
  var a = oo(e), u = oo(t);
  return a.length && a.length === u.length ? (a.sort(), u.sort(), rt(a, u, n)) : r.length === 0 && a.length === 0 && o.length === 0 && u.length === 0;
}
v(eu, "objectEqual");
function mt(e) {
  return e === null || typeof e != "object";
}
v(mt, "isPrimitive");
function co(e) {
  return e.map(/* @__PURE__ */ v(function(n) {
    return typeof n == "symbol" ? n.toString() : n;
  }, "mapSymbol"));
}
v(co, "mapSymbols");
function zn(e, t) {
  return typeof e > "u" || e === null ? !1 : t in Object(e);
}
v(zn, "hasProperty");
function tu(e) {
  return e.replace(/([^\\])\[/g, "$1.[").match(/(\\\.|[^.]+?)+/g).map((r) => {
    if (r === "constructor" || r === "__proto__" || r === "prototype")
      return {};
    const s = /^\[(\d+)\]$/.exec(r);
    let i = null;
    return s ? i = { i: parseFloat(s[1]) } : i = { p: r.replace(/\\([.[\]])/g, "$1") }, i;
  });
}
v(tu, "parsePath");
function ao(e, t, n) {
  let r = e, o = null;
  n = typeof n > "u" ? t.length : n;
  for (let s = 0; s < n; s++) {
    const i = t[s];
    r && (typeof i.p > "u" ? r = r[i.i] : r = r[i.p], s === n - 1 && (o = r));
  }
  return o;
}
v(ao, "internalGetPathValue");
function No(e, t) {
  const n = tu(t), r = n[n.length - 1], o = {
    parent: n.length > 1 ? ao(e, n, n.length - 1) : e,
    name: r.p || r.i,
    value: ao(e, n)
  };
  return o.exists = zn(o.parent, o.name), o;
}
v(No, "getPathInfo");
var dt, y = (dt = class {
  /** @type {{}} */
  __flags = {};
  /**
   * Creates object for chaining.
   * `Assertion` objects contain metadata in the form of flags. Three flags can
   * be assigned during instantiation by passing arguments to this constructor:
   *
   * - `object`: This flag contains the target of the assertion. For example, in
   * the assertion `expect(numKittens).to.equal(7);`, the `object` flag will
   * contain `numKittens` so that the `equal` assertion can reference it when
   * needed.
   *
   * - `message`: This flag contains an optional custom error message to be
   * prepended to the error message that's generated by the assertion when it
   * fails.
   *
   * - `ssfi`: This flag stands for "start stack function indicator". It
   * contains a function reference that serves as the starting point for
   * removing frames from the stack trace of the error that's created by the
   * assertion when it fails. The goal is to provide a cleaner stack trace to
   * end users by removing Chai's internal functions. Note that it only works
   * in environments that support `Error.captureStackTrace`, and only when
   * `Chai.config.includeStack` hasn't been set to `false`.
   *
   * - `lockSsfi`: This flag controls whether or not the given `ssfi` flag
   * should retain its current value, even as assertions are chained off of
   * this object. This is usually set to `true` when creating a new assertion
   * from within another assertion. It's also temporarily set to `true` before
   * an overwritten assertion gets called by the overwriting assertion.
   *
   * - `eql`: This flag contains the deepEqual function to be used by the assertion.
   *
   * @param {unknown} obj target of the assertion
   * @param {string} [msg] (optional) custom error message
   * @param {Function} [ssfi] (optional) starting point for removing stack frames
   * @param {boolean} [lockSsfi] (optional) whether or not the ssfi flag is locked
   */
  constructor(t, n, r, o) {
    return q(this, "ssfi", r || dt), q(this, "lockSsfi", o), q(this, "object", t), q(this, "message", n), q(this, "eql", we.deepEqual || Ja), jt(this);
  }
  /** @returns {boolean} */
  static get includeStack() {
    return console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    ), we.includeStack;
  }
  /** @param {boolean} value */
  static set includeStack(t) {
    console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    ), we.includeStack = t;
  }
  /** @returns {boolean} */
  static get showDiff() {
    return console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    ), we.showDiff;
  }
  /** @param {boolean} value */
  static set showDiff(t) {
    console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    ), we.showDiff = t;
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addProperty(t, n) {
    Ro(this.prototype, t, n);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addMethod(t, n) {
    Do(this.prototype, t, n);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static addChainableMethod(t, n, r) {
    qo(this.prototype, t, n, r);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteProperty(t, n) {
    Fo(this.prototype, t, n);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteMethod(t, n) {
    Lo(this.prototype, t, n);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static overwriteChainableMethod(t, n, r) {
    Bo(this.prototype, t, n, r);
  }
  /**
   * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {unknown} _expr to be tested
   * @param {string | Function} msg or function that returns message to display if expression fails
   * @param {string | Function} _negateMsg or function that returns negatedMessage to display if negated expression fails
   * @param {unknown} expected value (remember to check for negation)
   * @param {unknown} _actual (optional) will default to `this.obj`
   * @param {boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
   * @returns {void}
   */
  assert(t, n, r, o, s, i) {
    const a = Oo(this, arguments);
    if (i !== !1 && (i = !0), o === void 0 && s === void 0 && (i = !1), we.showDiff !== !0 && (i = !1), !a) {
      n = ko(this, arguments);
      const c = {
        actual: Bn(this, arguments),
        expected: o,
        showDiff: i
      }, l = Vo(this, arguments);
      throw l && (c.operator = l), new K(
        n,
        c,
        // @ts-expect-error Not sure what to do about these types yet
        we.includeStack ? this.assert : q(this, "ssfi")
      );
    }
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @returns {unknown}
   */
  get _obj() {
    return q(this, "object");
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @param {unknown} val
   */
  set _obj(t) {
    q(this, "object", t);
  }
}, v(dt, "Assertion"), dt), Wn = new EventTarget(), Ot, jo = (Ot = class extends Event {
  constructor(t, n, r) {
    super(t), this.name = String(n), this.fn = r;
  }
}, v(Ot, "PluginEvent"), Ot);
function sn() {
  return we.useProxy && typeof Proxy < "u" && typeof Reflect < "u";
}
v(sn, "isProxyEnabled");
function Ro(e, t, n) {
  n = n === void 0 ? function() {
  } : n, Object.defineProperty(e, t, {
    get: /* @__PURE__ */ v(function r() {
      !sn() && !q(this, "lockSsfi") && q(this, "ssfi", r);
      let o = n.call(this);
      if (o !== void 0) return o;
      let s = new y();
      return ze(this, s), s;
    }, "propertyGetter"),
    configurable: !0
  }), Wn.dispatchEvent(new jo("addProperty", t, n));
}
v(Ro, "addProperty");
var hp = Object.getOwnPropertyDescriptor(function() {
}, "length");
function cn(e, t, n) {
  return hp.configurable && Object.defineProperty(e, "length", {
    get: /* @__PURE__ */ v(function() {
      throw Error(
        n ? "Invalid Chai property: " + t + '.length. Due to a compatibility issue, "length" cannot directly follow "' + t + '". Use "' + t + '.lengthOf" instead.' : "Invalid Chai property: " + t + '.length. See docs for proper usage of "' + t + '".'
      );
    }, "get")
  }), e;
}
v(cn, "addLengthGuard");
function nu(e) {
  let t = Object.getOwnPropertyNames(e);
  function n(o) {
    t.indexOf(o) === -1 && t.push(o);
  }
  v(n, "addProperty");
  let r = Object.getPrototypeOf(e);
  for (; r !== null; )
    Object.getOwnPropertyNames(r).forEach(n), r = Object.getPrototypeOf(r);
  return t;
}
v(nu, "getProperties");
var Ti = ["__flags", "__methods", "_obj", "assert"];
function jt(e, t) {
  return sn() ? new Proxy(e, {
    get: /* @__PURE__ */ v(function n(r, o) {
      if (typeof o == "string" && we.proxyExcludedKeys.indexOf(o) === -1 && !Reflect.has(r, o)) {
        if (t)
          throw Error(
            "Invalid Chai property: " + t + "." + o + '. See docs for proper usage of "' + t + '".'
          );
        let s = null, i = 4;
        throw nu(r).forEach(function(a) {
          if (
            // we actually mean to check `Object.prototype` here
            // eslint-disable-next-line no-prototype-builtins
            !Object.prototype.hasOwnProperty(a) && Ti.indexOf(a) === -1
          ) {
            let u = ru(o, a, i);
            u < i && (s = a, i = u);
          }
        }), Error(
          s !== null ? "Invalid Chai property: " + o + '. Did you mean "' + s + '"?' : "Invalid Chai property: " + o
        );
      }
      return Ti.indexOf(o) === -1 && !q(r, "lockSsfi") && q(r, "ssfi", n), Reflect.get(r, o);
    }, "proxyGetter")
  }) : e;
}
v(jt, "proxify");
function ru(e, t, n) {
  if (Math.abs(e.length - t.length) >= n)
    return n;
  let r = [];
  for (let o = 0; o <= e.length; o++)
    r[o] = Array(t.length + 1).fill(0), r[o][0] = o;
  for (let o = 0; o < t.length; o++)
    r[0][o] = o;
  for (let o = 1; o <= e.length; o++) {
    let s = e.charCodeAt(o - 1);
    for (let i = 1; i <= t.length; i++) {
      if (Math.abs(o - i) >= n) {
        r[o][i] = n;
        continue;
      }
      r[o][i] = Math.min(
        r[o - 1][i] + 1,
        r[o][i - 1] + 1,
        r[o - 1][i - 1] + (s === t.charCodeAt(i - 1) ? 0 : 1)
      );
    }
  }
  return r[e.length][t.length];
}
v(ru, "stringDistanceCapped");
function Do(e, t, n) {
  let r = /* @__PURE__ */ v(function() {
    q(this, "lockSsfi") || q(this, "ssfi", r);
    let o = n.apply(this, arguments);
    if (o !== void 0) return o;
    let s = new y();
    return ze(this, s), s;
  }, "methodWrapper");
  cn(r, t, !1), e[t] = jt(r, t), Wn.dispatchEvent(new jo("addMethod", t, n));
}
v(Do, "addMethod");
function Fo(e, t, n) {
  let r = Object.getOwnPropertyDescriptor(e, t), o = /* @__PURE__ */ v(function() {
  }, "_super");
  r && typeof r.get == "function" && (o = r.get), Object.defineProperty(e, t, {
    get: /* @__PURE__ */ v(function s() {
      !sn() && !q(this, "lockSsfi") && q(this, "ssfi", s);
      let i = q(this, "lockSsfi");
      q(this, "lockSsfi", !0);
      let a = n(o).call(this);
      if (q(this, "lockSsfi", i), a !== void 0)
        return a;
      let u = new y();
      return ze(this, u), u;
    }, "overwritingPropertyGetter"),
    configurable: !0
  });
}
v(Fo, "overwriteProperty");
function Lo(e, t, n) {
  let r = e[t], o = /* @__PURE__ */ v(function() {
    throw new Error(t + " is not a function");
  }, "_super");
  r && typeof r == "function" && (o = r);
  let s = /* @__PURE__ */ v(function() {
    q(this, "lockSsfi") || q(this, "ssfi", s);
    let i = q(this, "lockSsfi");
    q(this, "lockSsfi", !0);
    let a = n(o).apply(this, arguments);
    if (q(this, "lockSsfi", i), a !== void 0)
      return a;
    let u = new y();
    return ze(this, u), u;
  }, "overwritingMethodWrapper");
  cn(s, t, !1), e[t] = jt(s, t);
}
v(Lo, "overwriteMethod");
var pp = typeof Object.setPrototypeOf == "function", Si = /* @__PURE__ */ v(function() {
}, "testFn"), dp = Object.getOwnPropertyNames(Si).filter(function(e) {
  let t = Object.getOwnPropertyDescriptor(Si, e);
  return typeof t != "object" ? !0 : !t.configurable;
}), mp = Function.prototype.call, gp = Function.prototype.apply, At, yp = (At = class extends jo {
  constructor(t, n, r, o) {
    super(t, n, r), this.chainingBehavior = o;
  }
}, v(At, "PluginAddChainableMethodEvent"), At);
function qo(e, t, n, r) {
  typeof r != "function" && (r = /* @__PURE__ */ v(function() {
  }, "chainingBehavior"));
  let o = {
    method: n,
    chainingBehavior: r
  };
  e.__methods || (e.__methods = {}), e.__methods[t] = o, Object.defineProperty(e, t, {
    get: /* @__PURE__ */ v(function() {
      o.chainingBehavior.call(this);
      let i = /* @__PURE__ */ v(function() {
        q(this, "lockSsfi") || q(this, "ssfi", i);
        let a = o.method.apply(this, arguments);
        if (a !== void 0)
          return a;
        let u = new y();
        return ze(this, u), u;
      }, "chainableMethodWrapper");
      if (cn(i, t, !0), pp) {
        let a = Object.create(this);
        a.call = mp, a.apply = gp, Object.setPrototypeOf(i, a);
      } else
        Object.getOwnPropertyNames(e).forEach(function(u) {
          if (dp.indexOf(u) !== -1)
            return;
          let c = Object.getOwnPropertyDescriptor(e, u);
          Object.defineProperty(i, u, c);
        });
      return ze(this, i), jt(i);
    }, "chainableMethodGetter"),
    configurable: !0
  }), Wn.dispatchEvent(
    new yp(
      "addChainableMethod",
      t,
      n,
      r
    )
  );
}
v(qo, "addChainableMethod");
function Bo(e, t, n, r) {
  let o = e.__methods[t], s = o.chainingBehavior;
  o.chainingBehavior = /* @__PURE__ */ v(function() {
    let u = r(s).call(this);
    if (u !== void 0)
      return u;
    let c = new y();
    return ze(this, c), c;
  }, "overwritingChainableMethodGetter");
  let i = o.method;
  o.method = /* @__PURE__ */ v(function() {
    let u = n(i).apply(this, arguments);
    if (u !== void 0)
      return u;
    let c = new y();
    return ze(this, c), c;
  }, "overwritingChainableMethodWrapper");
}
v(Bo, "overwriteChainableMethod");
function Mn(e, t) {
  return W(e) < W(t) ? -1 : 1;
}
v(Mn, "compareByInspect");
function zo(e) {
  return typeof Object.getOwnPropertySymbols != "function" ? [] : Object.getOwnPropertySymbols(e).filter(function(t) {
    return Object.getOwnPropertyDescriptor(e, t).enumerable;
  });
}
v(zo, "getOwnEnumerablePropertySymbols");
function Wo(e) {
  return Object.keys(e).concat(zo(e));
}
v(Wo, "getOwnEnumerableProperties");
var On = Number.isNaN;
function ou(e) {
  let t = Q(e);
  return ["Array", "Object", "Function"].indexOf(t) !== -1;
}
v(ou, "isObjectType");
function Vo(e, t) {
  let n = q(e, "operator"), r = q(e, "negate"), o = t[3], s = r ? t[2] : t[1];
  if (n)
    return n;
  if (typeof s == "function" && (s = s()), s = s || "", !s || /\shave\s/.test(s))
    return;
  let i = ou(o);
  return /\snot\s/.test(s) ? i ? "notDeepStrictEqual" : "notStrictEqual" : i ? "deepStrictEqual" : "strictEqual";
}
v(Vo, "getOperator");
function Vn(e) {
  return e.name;
}
v(Vn, "getName");
function An(e) {
  return Object.prototype.toString.call(e) === "[object RegExp]";
}
v(An, "isRegExp");
function pe(e) {
  return ["Number", "BigInt"].includes(Q(e));
}
v(pe, "isNumeric");
var { flag: S } = he;
[
  "to",
  "be",
  "been",
  "is",
  "and",
  "has",
  "have",
  "with",
  "that",
  "which",
  "at",
  "of",
  "same",
  "but",
  "does",
  "still",
  "also"
].forEach(function(e) {
  y.addProperty(e);
});
y.addProperty("not", function() {
  S(this, "negate", !0);
});
y.addProperty("deep", function() {
  S(this, "deep", !0);
});
y.addProperty("nested", function() {
  S(this, "nested", !0);
});
y.addProperty("own", function() {
  S(this, "own", !0);
});
y.addProperty("ordered", function() {
  S(this, "ordered", !0);
});
y.addProperty("any", function() {
  S(this, "any", !0), S(this, "all", !1);
});
y.addProperty("all", function() {
  S(this, "all", !0), S(this, "any", !1);
});
var Ei = {
  function: [
    "function",
    "asyncfunction",
    "generatorfunction",
    "asyncgeneratorfunction"
  ],
  asyncfunction: ["asyncfunction", "asyncgeneratorfunction"],
  generatorfunction: ["generatorfunction", "asyncgeneratorfunction"],
  asyncgeneratorfunction: ["asyncgeneratorfunction"]
};
function Uo(e, t) {
  t && S(this, "message", t), e = e.toLowerCase();
  let n = S(this, "object"), r = ~["a", "e", "i", "o", "u"].indexOf(e.charAt(0)) ? "an " : "a ";
  const o = Q(n).toLowerCase();
  Ei.function.includes(e) ? this.assert(
    Ei[e].includes(o),
    "expected #{this} to be " + r + e,
    "expected #{this} not to be " + r + e
  ) : this.assert(
    e === o,
    "expected #{this} to be " + r + e,
    "expected #{this} not to be " + r + e
  );
}
v(Uo, "an");
y.addChainableMethod("an", Uo);
y.addChainableMethod("a", Uo);
function su(e, t) {
  return On(e) && On(t) || e === t;
}
v(su, "SameValueZero");
function an() {
  S(this, "contains", !0);
}
v(an, "includeChainingBehavior");
function un(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = Q(n).toLowerCase(), o = S(this, "message"), s = S(this, "negate"), i = S(this, "ssfi"), a = S(this, "deep"), u = a ? "deep " : "", c = a ? S(this, "eql") : su;
  o = o ? o + ": " : "";
  let l = !1;
  switch (r) {
    case "string":
      l = n.indexOf(e) !== -1;
      break;
    case "weakset":
      if (a)
        throw new K(
          o + "unable to use .deep.include with WeakSet",
          void 0,
          i
        );
      l = n.has(e);
      break;
    case "map":
      n.forEach(function(f) {
        l = l || c(f, e);
      });
      break;
    case "set":
      a ? n.forEach(function(f) {
        l = l || c(f, e);
      }) : l = n.has(e);
      break;
    case "array":
      a ? l = n.some(function(f) {
        return c(f, e);
      }) : l = n.indexOf(e) !== -1;
      break;
    default: {
      if (e !== Object(e))
        throw new K(
          o + "the given combination of arguments (" + r + " and " + Q(e).toLowerCase() + ") is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a " + Q(e).toLowerCase(),
          void 0,
          i
        );
      let f = Object.keys(e), h = null, p = 0;
      if (f.forEach(function(d) {
        let g = new y(n);
        if (ze(this, g, !0), S(g, "lockSsfi", !0), !s || f.length === 1) {
          g.property(d, e[d]);
          return;
        }
        try {
          g.property(d, e[d]);
        } catch (w) {
          if (!_e.compatibleConstructor(w, K))
            throw w;
          h === null && (h = w), p++;
        }
      }, this), s && f.length > 1 && p === f.length)
        throw h;
      return;
    }
  }
  this.assert(
    l,
    "expected #{this} to " + u + "include " + W(e),
    "expected #{this} to not " + u + "include " + W(e)
  );
}
v(un, "include");
y.addChainableMethod("include", un, an);
y.addChainableMethod("contain", un, an);
y.addChainableMethod("contains", un, an);
y.addChainableMethod("includes", un, an);
y.addProperty("ok", function() {
  this.assert(
    S(this, "object"),
    "expected #{this} to be truthy",
    "expected #{this} to be falsy"
  );
});
y.addProperty("true", function() {
  this.assert(
    S(this, "object") === !0,
    "expected #{this} to be true",
    "expected #{this} to be false",
    !S(this, "negate")
  );
});
y.addProperty("numeric", function() {
  const e = S(this, "object");
  this.assert(
    ["Number", "BigInt"].includes(Q(e)),
    "expected #{this} to be numeric",
    "expected #{this} to not be numeric",
    !S(this, "negate")
  );
});
y.addProperty("callable", function() {
  const e = S(this, "object"), t = S(this, "ssfi"), n = S(this, "message"), r = n ? `${n}: ` : "", o = S(this, "negate"), s = o ? `${r}expected ${W(e)} not to be a callable function` : `${r}expected ${W(e)} to be a callable function`, i = [
    "Function",
    "AsyncFunction",
    "GeneratorFunction",
    "AsyncGeneratorFunction"
  ].includes(Q(e));
  if (i && o || !i && !o)
    throw new K(s, void 0, t);
});
y.addProperty("false", function() {
  this.assert(
    S(this, "object") === !1,
    "expected #{this} to be false",
    "expected #{this} to be true",
    !!S(this, "negate")
  );
});
y.addProperty("null", function() {
  this.assert(
    S(this, "object") === null,
    "expected #{this} to be null",
    "expected #{this} not to be null"
  );
});
y.addProperty("undefined", function() {
  this.assert(
    S(this, "object") === void 0,
    "expected #{this} to be undefined",
    "expected #{this} not to be undefined"
  );
});
y.addProperty("NaN", function() {
  this.assert(
    On(S(this, "object")),
    "expected #{this} to be NaN",
    "expected #{this} not to be NaN"
  );
});
function Ko() {
  let e = S(this, "object");
  this.assert(
    e != null,
    "expected #{this} to exist",
    "expected #{this} to not exist"
  );
}
v(Ko, "assertExist");
y.addProperty("exist", Ko);
y.addProperty("exists", Ko);
y.addProperty("empty", function() {
  let e = S(this, "object"), t = S(this, "ssfi"), n = S(this, "message"), r;
  switch (n = n ? n + ": " : "", Q(e).toLowerCase()) {
    case "array":
    case "string":
      r = e.length;
      break;
    case "map":
    case "set":
      r = e.size;
      break;
    case "weakmap":
    case "weakset":
      throw new K(
        n + ".empty was passed a weak collection",
        void 0,
        t
      );
    case "function": {
      const o = n + ".empty was passed a function " + Vn(e);
      throw new K(o.trim(), void 0, t);
    }
    default:
      if (e !== Object(e))
        throw new K(
          n + ".empty was passed non-string primitive " + W(e),
          void 0,
          t
        );
      r = Object.keys(e).length;
  }
  this.assert(
    r === 0,
    "expected #{this} to be empty",
    "expected #{this} not to be empty"
  );
});
function Go() {
  let e = S(this, "object"), t = Q(e);
  this.assert(
    t === "Arguments",
    "expected #{this} to be arguments but got " + t,
    "expected #{this} to not be arguments"
  );
}
v(Go, "checkArguments");
y.addProperty("arguments", Go);
y.addProperty("Arguments", Go);
function Un(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object");
  if (S(this, "deep")) {
    let r = S(this, "lockSsfi");
    S(this, "lockSsfi", !0), this.eql(e), S(this, "lockSsfi", r);
  } else
    this.assert(
      e === n,
      "expected #{this} to equal #{exp}",
      "expected #{this} to not equal #{exp}",
      e,
      this._obj,
      !0
    );
}
v(Un, "assertEqual");
y.addMethod("equal", Un);
y.addMethod("equals", Un);
y.addMethod("eq", Un);
function Yo(e, t) {
  t && S(this, "message", t);
  let n = S(this, "eql");
  this.assert(
    n(e, S(this, "object")),
    "expected #{this} to deeply equal #{exp}",
    "expected #{this} to not deeply equal #{exp}",
    e,
    this._obj,
    !0
  );
}
v(Yo, "assertEql");
y.addMethod("eql", Yo);
y.addMethod("eqls", Yo);
function Kn(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "doLength"), o = S(this, "message"), s = o ? o + ": " : "", i = S(this, "ssfi"), a = Q(n).toLowerCase(), u = Q(e).toLowerCase();
  if (r && a !== "map" && a !== "set" && new y(n, o, i, !0).to.have.property("length"), !r && a === "date" && u !== "date")
    throw new K(
      s + "the argument to above must be a date",
      void 0,
      i
    );
  if (!pe(e) && (r || pe(n)))
    throw new K(
      s + "the argument to above must be a number",
      void 0,
      i
    );
  if (!r && a !== "date" && !pe(n)) {
    let c = a === "string" ? "'" + n + "'" : n;
    throw new K(
      s + "expected " + c + " to be a number or a date",
      void 0,
      i
    );
  }
  if (r) {
    let c = "length", l;
    a === "map" || a === "set" ? (c = "size", l = n.size) : l = n.length, this.assert(
      l > e,
      "expected #{this} to have a " + c + " above #{exp} but got #{act}",
      "expected #{this} to not have a " + c + " above #{exp}",
      e,
      l
    );
  } else
    this.assert(
      n > e,
      "expected #{this} to be above #{exp}",
      "expected #{this} to be at most #{exp}",
      e
    );
}
v(Kn, "assertAbove");
y.addMethod("above", Kn);
y.addMethod("gt", Kn);
y.addMethod("greaterThan", Kn);
function Gn(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "doLength"), o = S(this, "message"), s = o ? o + ": " : "", i = S(this, "ssfi"), a = Q(n).toLowerCase(), u = Q(e).toLowerCase(), c, l = !0;
  if (r && a !== "map" && a !== "set" && new y(n, o, i, !0).to.have.property("length"), !r && a === "date" && u !== "date")
    c = s + "the argument to least must be a date";
  else if (!pe(e) && (r || pe(n)))
    c = s + "the argument to least must be a number";
  else if (!r && a !== "date" && !pe(n)) {
    let f = a === "string" ? "'" + n + "'" : n;
    c = s + "expected " + f + " to be a number or a date";
  } else
    l = !1;
  if (l)
    throw new K(c, void 0, i);
  if (r) {
    let f = "length", h;
    a === "map" || a === "set" ? (f = "size", h = n.size) : h = n.length, this.assert(
      h >= e,
      "expected #{this} to have a " + f + " at least #{exp} but got #{act}",
      "expected #{this} to have a " + f + " below #{exp}",
      e,
      h
    );
  } else
    this.assert(
      n >= e,
      "expected #{this} to be at least #{exp}",
      "expected #{this} to be below #{exp}",
      e
    );
}
v(Gn, "assertLeast");
y.addMethod("least", Gn);
y.addMethod("gte", Gn);
y.addMethod("greaterThanOrEqual", Gn);
function Yn(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "doLength"), o = S(this, "message"), s = o ? o + ": " : "", i = S(this, "ssfi"), a = Q(n).toLowerCase(), u = Q(e).toLowerCase(), c, l = !0;
  if (r && a !== "map" && a !== "set" && new y(n, o, i, !0).to.have.property("length"), !r && a === "date" && u !== "date")
    c = s + "the argument to below must be a date";
  else if (!pe(e) && (r || pe(n)))
    c = s + "the argument to below must be a number";
  else if (!r && a !== "date" && !pe(n)) {
    let f = a === "string" ? "'" + n + "'" : n;
    c = s + "expected " + f + " to be a number or a date";
  } else
    l = !1;
  if (l)
    throw new K(c, void 0, i);
  if (r) {
    let f = "length", h;
    a === "map" || a === "set" ? (f = "size", h = n.size) : h = n.length, this.assert(
      h < e,
      "expected #{this} to have a " + f + " below #{exp} but got #{act}",
      "expected #{this} to not have a " + f + " below #{exp}",
      e,
      h
    );
  } else
    this.assert(
      n < e,
      "expected #{this} to be below #{exp}",
      "expected #{this} to be at least #{exp}",
      e
    );
}
v(Yn, "assertBelow");
y.addMethod("below", Yn);
y.addMethod("lt", Yn);
y.addMethod("lessThan", Yn);
function Jn(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "doLength"), o = S(this, "message"), s = o ? o + ": " : "", i = S(this, "ssfi"), a = Q(n).toLowerCase(), u = Q(e).toLowerCase(), c, l = !0;
  if (r && a !== "map" && a !== "set" && new y(n, o, i, !0).to.have.property("length"), !r && a === "date" && u !== "date")
    c = s + "the argument to most must be a date";
  else if (!pe(e) && (r || pe(n)))
    c = s + "the argument to most must be a number";
  else if (!r && a !== "date" && !pe(n)) {
    let f = a === "string" ? "'" + n + "'" : n;
    c = s + "expected " + f + " to be a number or a date";
  } else
    l = !1;
  if (l)
    throw new K(c, void 0, i);
  if (r) {
    let f = "length", h;
    a === "map" || a === "set" ? (f = "size", h = n.size) : h = n.length, this.assert(
      h <= e,
      "expected #{this} to have a " + f + " at most #{exp} but got #{act}",
      "expected #{this} to have a " + f + " above #{exp}",
      e,
      h
    );
  } else
    this.assert(
      n <= e,
      "expected #{this} to be at most #{exp}",
      "expected #{this} to be above #{exp}",
      e
    );
}
v(Jn, "assertMost");
y.addMethod("most", Jn);
y.addMethod("lte", Jn);
y.addMethod("lessThanOrEqual", Jn);
y.addMethod("within", function(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "doLength"), s = S(this, "message"), i = s ? s + ": " : "", a = S(this, "ssfi"), u = Q(r).toLowerCase(), c = Q(e).toLowerCase(), l = Q(t).toLowerCase(), f, h = !0, p = c === "date" && l === "date" ? e.toISOString() + ".." + t.toISOString() : e + ".." + t;
  if (o && u !== "map" && u !== "set" && new y(r, s, a, !0).to.have.property("length"), !o && u === "date" && (c !== "date" || l !== "date"))
    f = i + "the arguments to within must be dates";
  else if ((!pe(e) || !pe(t)) && (o || pe(r)))
    f = i + "the arguments to within must be numbers";
  else if (!o && u !== "date" && !pe(r)) {
    let d = u === "string" ? "'" + r + "'" : r;
    f = i + "expected " + d + " to be a number or a date";
  } else
    h = !1;
  if (h)
    throw new K(f, void 0, a);
  if (o) {
    let d = "length", g;
    u === "map" || u === "set" ? (d = "size", g = r.size) : g = r.length, this.assert(
      g >= e && g <= t,
      "expected #{this} to have a " + d + " within " + p,
      "expected #{this} to not have a " + d + " within " + p
    );
  } else
    this.assert(
      r >= e && r <= t,
      "expected #{this} to be within " + p,
      "expected #{this} to not be within " + p
    );
});
function Jo(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "ssfi"), o = S(this, "message"), s;
  try {
    s = n instanceof e;
  } catch (a) {
    throw a instanceof TypeError ? (o = o ? o + ": " : "", new K(
      o + "The instanceof assertion needs a constructor but " + Q(e) + " was given.",
      void 0,
      r
    )) : a;
  }
  let i = Vn(e);
  i == null && (i = "an unnamed constructor"), this.assert(
    s,
    "expected #{this} to be an instance of " + i,
    "expected #{this} to not be an instance of " + i
  );
}
v(Jo, "assertInstanceOf");
y.addMethod("instanceof", Jo);
y.addMethod("instanceOf", Jo);
function Xo(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "nested"), o = S(this, "own"), s = S(this, "message"), i = S(this, "object"), a = S(this, "ssfi"), u = typeof e;
  if (s = s ? s + ": " : "", r) {
    if (u !== "string")
      throw new K(
        s + "the argument to property must be a string when using nested syntax",
        void 0,
        a
      );
  } else if (u !== "string" && u !== "number" && u !== "symbol")
    throw new K(
      s + "the argument to property must be a string, number, or symbol",
      void 0,
      a
    );
  if (r && o)
    throw new K(
      s + 'The "nested" and "own" flags cannot be combined.',
      void 0,
      a
    );
  if (i == null)
    throw new K(
      s + "Target cannot be null or undefined.",
      void 0,
      a
    );
  let c = S(this, "deep"), l = S(this, "negate"), f = r ? No(i, e) : null, h = r ? f.value : i[e], p = c ? S(this, "eql") : (w, T) => w === T, d = "";
  c && (d += "deep "), o && (d += "own "), r && (d += "nested "), d += "property ";
  let g;
  o ? g = Object.prototype.hasOwnProperty.call(i, e) : r ? g = f.exists : g = zn(i, e), (!l || arguments.length === 1) && this.assert(
    g,
    "expected #{this} to have " + d + W(e),
    "expected #{this} to not have " + d + W(e)
  ), arguments.length > 1 && this.assert(
    g && p(t, h),
    "expected #{this} to have " + d + W(e) + " of #{exp}, but got #{act}",
    "expected #{this} to not have " + d + W(e) + " of #{act}",
    t,
    h
  ), S(this, "object", h);
}
v(Xo, "assertProperty");
y.addMethod("property", Xo);
function Ho(e, t, n) {
  S(this, "own", !0), Xo.apply(this, arguments);
}
v(Ho, "assertOwnProperty");
y.addMethod("ownProperty", Ho);
y.addMethod("haveOwnProperty", Ho);
function Zo(e, t, n) {
  typeof t == "string" && (n = t, t = null), n && S(this, "message", n);
  let r = S(this, "object"), o = Object.getOwnPropertyDescriptor(Object(r), e), s = S(this, "eql");
  o && t ? this.assert(
    s(t, o),
    "expected the own property descriptor for " + W(e) + " on #{this} to match " + W(t) + ", got " + W(o),
    "expected the own property descriptor for " + W(e) + " on #{this} to not match " + W(t),
    t,
    o,
    !0
  ) : this.assert(
    o,
    "expected #{this} to have an own property descriptor for " + W(e),
    "expected #{this} to not have an own property descriptor for " + W(e)
  ), S(this, "object", o);
}
v(Zo, "assertOwnPropertyDescriptor");
y.addMethod("ownPropertyDescriptor", Zo);
y.addMethod("haveOwnPropertyDescriptor", Zo);
function Qo() {
  S(this, "doLength", !0);
}
v(Qo, "assertLengthChain");
function es(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = Q(n).toLowerCase(), o = S(this, "message"), s = S(this, "ssfi"), i = "length", a;
  switch (r) {
    case "map":
    case "set":
      i = "size", a = n.size;
      break;
    default:
      new y(n, o, s, !0).to.have.property("length"), a = n.length;
  }
  this.assert(
    a == e,
    "expected #{this} to have a " + i + " of #{exp} but got #{act}",
    "expected #{this} to not have a " + i + " of #{act}",
    e,
    a
  );
}
v(es, "assertLength");
y.addChainableMethod("length", es, Qo);
y.addChainableMethod("lengthOf", es, Qo);
function ts(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object");
  this.assert(
    e.exec(n),
    "expected #{this} to match " + e,
    "expected #{this} not to match " + e
  );
}
v(ts, "assertMatch");
y.addMethod("match", ts);
y.addMethod("matches", ts);
y.addMethod("string", function(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "message"), o = S(this, "ssfi");
  new y(n, r, o, !0).is.a("string"), this.assert(
    ~n.indexOf(e),
    "expected #{this} to contain " + W(e),
    "expected #{this} to not contain " + W(e)
  );
});
function ns(e) {
  let t = S(this, "object"), n = Q(t), r = Q(e), o = S(this, "ssfi"), s = S(this, "deep"), i, a = "", u, c = !0, l = S(this, "message");
  l = l ? l + ": " : "";
  let f = l + "when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments";
  if (n === "Map" || n === "Set")
    a = s ? "deeply " : "", u = [], t.forEach(function(T, $) {
      u.push($);
    }), r !== "Array" && (e = Array.prototype.slice.call(arguments));
  else {
    switch (u = Wo(t), r) {
      case "Array":
        if (arguments.length > 1)
          throw new K(f, void 0, o);
        break;
      case "Object":
        if (arguments.length > 1)
          throw new K(f, void 0, o);
        e = Object.keys(e);
        break;
      default:
        e = Array.prototype.slice.call(arguments);
    }
    e = e.map(function(T) {
      return typeof T == "symbol" ? T : String(T);
    });
  }
  if (!e.length)
    throw new K(l + "keys required", void 0, o);
  let h = e.length, p = S(this, "any"), d = S(this, "all"), g = e, w = s ? S(this, "eql") : (T, $) => T === $;
  if (!p && !d && (d = !0), p && (c = g.some(function(T) {
    return u.some(function($) {
      return w(T, $);
    });
  })), d && (c = g.every(function(T) {
    return u.some(function($) {
      return w(T, $);
    });
  }), S(this, "contains") || (c = c && e.length == u.length)), h > 1) {
    e = e.map(function($) {
      return W($);
    });
    let T = e.pop();
    d && (i = e.join(", ") + ", and " + T), p && (i = e.join(", ") + ", or " + T);
  } else
    i = W(e[0]);
  i = (h > 1 ? "keys " : "key ") + i, i = (S(this, "contains") ? "contain " : "have ") + i, this.assert(
    c,
    "expected #{this} to " + a + i,
    "expected #{this} to not " + a + i,
    g.slice(0).sort(Mn),
    u.sort(Mn),
    !0
  );
}
v(ns, "assertKeys");
y.addMethod("keys", ns);
y.addMethod("key", ns);
function Xn(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "ssfi"), s = S(this, "message"), i = S(this, "negate") || !1;
  new y(r, s, o, !0).is.a("function"), (An(e) || typeof e == "string") && (t = e, e = null);
  let a, u = !1;
  try {
    r();
  } catch (p) {
    u = !0, a = p;
  }
  let c = e === void 0 && t === void 0, l = !!(e && t), f = !1, h = !1;
  if (c || !c && !i) {
    let p = "an error";
    e instanceof Error ? p = "#{exp}" : e && (p = _e.getConstructorName(e));
    let d = a;
    if (a instanceof Error)
      d = a.toString();
    else if (typeof a == "string")
      d = a;
    else if (a && (typeof a == "object" || typeof a == "function"))
      try {
        d = _e.getConstructorName(a);
      } catch {
      }
    this.assert(
      u,
      "expected #{this} to throw " + p,
      "expected #{this} to not throw an error but #{act} was thrown",
      e && e.toString(),
      d
    );
  }
  if (e && a && (e instanceof Error && _e.compatibleInstance(
    a,
    e
  ) === i && (l && i ? f = !0 : this.assert(
    i,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (a && !i ? " but #{act} was thrown" : ""),
    e.toString(),
    a.toString()
  )), _e.compatibleConstructor(
    a,
    e
  ) === i && (l && i ? f = !0 : this.assert(
    i,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (a ? " but #{act} was thrown" : ""),
    e instanceof Error ? e.toString() : e && _e.getConstructorName(e),
    a instanceof Error ? a.toString() : a && _e.getConstructorName(a)
  ))), a && t !== void 0 && t !== null) {
    let p = "including";
    An(t) && (p = "matching"), _e.compatibleMessage(
      a,
      t
    ) === i && (l && i ? h = !0 : this.assert(
      i,
      "expected #{this} to throw error " + p + " #{exp} but got #{act}",
      "expected #{this} to throw error not " + p + " #{exp}",
      t,
      _e.getMessage(a)
    ));
  }
  f && h && this.assert(
    i,
    "expected #{this} to throw #{exp} but #{act} was thrown",
    "expected #{this} to not throw #{exp}" + (a ? " but #{act} was thrown" : ""),
    e instanceof Error ? e.toString() : e && _e.getConstructorName(e),
    a instanceof Error ? a.toString() : a && _e.getConstructorName(a)
  ), S(this, "object", a);
}
v(Xn, "assertThrows");
y.addMethod("throw", Xn);
y.addMethod("throws", Xn);
y.addMethod("Throw", Xn);
function rs(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "itself"), o = typeof n == "function" && !r ? n.prototype[e] : n[e];
  this.assert(
    typeof o == "function",
    "expected #{this} to respond to " + W(e),
    "expected #{this} to not respond to " + W(e)
  );
}
v(rs, "respondTo");
y.addMethod("respondTo", rs);
y.addMethod("respondsTo", rs);
y.addProperty("itself", function() {
  S(this, "itself", !0);
});
function os(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = e(n);
  this.assert(
    r,
    "expected #{this} to satisfy " + ft(e),
    "expected #{this} to not satisfy" + ft(e),
    !S(this, "negate"),
    r
  );
}
v(os, "satisfy");
y.addMethod("satisfy", os);
y.addMethod("satisfies", os);
function ss(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "message"), s = S(this, "ssfi");
  new y(r, o, s, !0).is.numeric;
  let i = "A `delta` value is required for `closeTo`";
  if (t == null)
    throw new K(
      o ? `${o}: ${i}` : i,
      void 0,
      s
    );
  if (new y(t, o, s, !0).is.numeric, i = "A `expected` value is required for `closeTo`", e == null)
    throw new K(
      o ? `${o}: ${i}` : i,
      void 0,
      s
    );
  new y(e, o, s, !0).is.numeric;
  const a = /* @__PURE__ */ v((c) => c < 0n ? -c : c, "abs"), u = /* @__PURE__ */ v((c) => parseFloat(parseFloat(c).toPrecision(12)), "strip");
  this.assert(
    u(a(r - e)) <= t,
    "expected #{this} to be close to " + e + " +/- " + t,
    "expected #{this} not to be close to " + e + " +/- " + t
  );
}
v(ss, "closeTo");
y.addMethod("closeTo", ss);
y.addMethod("approximately", ss);
function iu(e, t, n, r, o) {
  let s = Array.from(t), i = Array.from(e);
  if (!r) {
    if (i.length !== s.length) return !1;
    s = s.slice();
  }
  return i.every(function(a, u) {
    if (o) return n ? n(a, s[u]) : a === s[u];
    if (!n) {
      let c = s.indexOf(a);
      return c === -1 ? !1 : (r || s.splice(c, 1), !0);
    }
    return s.some(function(c, l) {
      return n(a, c) ? (r || s.splice(l, 1), !0) : !1;
    });
  });
}
v(iu, "isSubsetOf");
y.addMethod("members", function(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "message"), o = S(this, "ssfi");
  new y(n, r, o, !0).to.be.iterable, new y(e, r, o, !0).to.be.iterable;
  let s = S(this, "contains"), i = S(this, "ordered"), a, u, c;
  s ? (a = i ? "an ordered superset" : "a superset", u = "expected #{this} to be " + a + " of #{exp}", c = "expected #{this} to not be " + a + " of #{exp}") : (a = i ? "ordered members" : "members", u = "expected #{this} to have the same " + a + " as #{exp}", c = "expected #{this} to not have the same " + a + " as #{exp}");
  let l = S(this, "deep") ? S(this, "eql") : void 0;
  this.assert(
    iu(e, n, l, s, i),
    u,
    c,
    e,
    n,
    !0
  );
});
y.addProperty("iterable", function(e) {
  e && S(this, "message", e);
  let t = S(this, "object");
  this.assert(
    t != null && t[Symbol.iterator],
    "expected #{this} to be an iterable",
    "expected #{this} to not be an iterable",
    t
  );
});
function cu(e, t) {
  t && S(this, "message", t);
  let n = S(this, "object"), r = S(this, "message"), o = S(this, "ssfi"), s = S(this, "contains"), i = S(this, "deep"), a = S(this, "eql");
  new y(e, r, o, !0).to.be.an("array"), s ? this.assert(
    e.some(function(u) {
      return n.indexOf(u) > -1;
    }),
    "expected #{this} to contain one of #{exp}",
    "expected #{this} to not contain one of #{exp}",
    e,
    n
  ) : i ? this.assert(
    e.some(function(u) {
      return a(n, u);
    }),
    "expected #{this} to deeply equal one of #{exp}",
    "expected #{this} to deeply equal one of #{exp}",
    e,
    n
  ) : this.assert(
    e.indexOf(n) > -1,
    "expected #{this} to be one of #{exp}",
    "expected #{this} to not be one of #{exp}",
    e,
    n
  );
}
v(cu, "oneOf");
y.addMethod("oneOf", cu);
function is(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "message"), s = S(this, "ssfi");
  new y(r, o, s, !0).is.a("function");
  let i;
  t ? (new y(e, o, s, !0).to.have.property(t), i = e[t]) : (new y(e, o, s, !0).is.a("function"), i = e()), r();
  let a = t == null ? e() : e[t], u = t == null ? i : "." + t;
  S(this, "deltaMsgObj", u), S(this, "initialDeltaValue", i), S(this, "finalDeltaValue", a), S(this, "deltaBehavior", "change"), S(this, "realDelta", a !== i), this.assert(
    i !== a,
    "expected " + u + " to change",
    "expected " + u + " to not change"
  );
}
v(is, "assertChanges");
y.addMethod("change", is);
y.addMethod("changes", is);
function cs(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "message"), s = S(this, "ssfi");
  new y(r, o, s, !0).is.a("function");
  let i;
  t ? (new y(e, o, s, !0).to.have.property(t), i = e[t]) : (new y(e, o, s, !0).is.a("function"), i = e()), new y(i, o, s, !0).is.a("number"), r();
  let a = t == null ? e() : e[t], u = t == null ? i : "." + t;
  S(this, "deltaMsgObj", u), S(this, "initialDeltaValue", i), S(this, "finalDeltaValue", a), S(this, "deltaBehavior", "increase"), S(this, "realDelta", a - i), this.assert(
    a - i > 0,
    "expected " + u + " to increase",
    "expected " + u + " to not increase"
  );
}
v(cs, "assertIncreases");
y.addMethod("increase", cs);
y.addMethod("increases", cs);
function as(e, t, n) {
  n && S(this, "message", n);
  let r = S(this, "object"), o = S(this, "message"), s = S(this, "ssfi");
  new y(r, o, s, !0).is.a("function");
  let i;
  t ? (new y(e, o, s, !0).to.have.property(t), i = e[t]) : (new y(e, o, s, !0).is.a("function"), i = e()), new y(i, o, s, !0).is.a("number"), r();
  let a = t == null ? e() : e[t], u = t == null ? i : "." + t;
  S(this, "deltaMsgObj", u), S(this, "initialDeltaValue", i), S(this, "finalDeltaValue", a), S(this, "deltaBehavior", "decrease"), S(this, "realDelta", i - a), this.assert(
    a - i < 0,
    "expected " + u + " to decrease",
    "expected " + u + " to not decrease"
  );
}
v(as, "assertDecreases");
y.addMethod("decrease", as);
y.addMethod("decreases", as);
function au(e, t) {
  t && S(this, "message", t);
  let n = S(this, "deltaMsgObj"), r = S(this, "initialDeltaValue"), o = S(this, "finalDeltaValue"), s = S(this, "deltaBehavior"), i = S(this, "realDelta"), a;
  s === "change" ? a = Math.abs(o - r) === Math.abs(e) : a = i === Math.abs(e), this.assert(
    a,
    "expected " + n + " to " + s + " by " + e,
    "expected " + n + " to not " + s + " by " + e
  );
}
v(au, "assertDelta");
y.addMethod("by", au);
y.addProperty("extensible", function() {
  let e = S(this, "object"), t = e === Object(e) && Object.isExtensible(e);
  this.assert(
    t,
    "expected #{this} to be extensible",
    "expected #{this} to not be extensible"
  );
});
y.addProperty("sealed", function() {
  let e = S(this, "object"), t = e === Object(e) ? Object.isSealed(e) : !0;
  this.assert(
    t,
    "expected #{this} to be sealed",
    "expected #{this} to not be sealed"
  );
});
y.addProperty("frozen", function() {
  let e = S(this, "object"), t = e === Object(e) ? Object.isFrozen(e) : !0;
  this.assert(
    t,
    "expected #{this} to be frozen",
    "expected #{this} to not be frozen"
  );
});
y.addProperty("finite", function(e) {
  let t = S(this, "object");
  this.assert(
    typeof t == "number" && isFinite(t),
    "expected #{this} to be a finite number",
    "expected #{this} to not be a finite number"
  );
});
function kn(e, t) {
  return e === t ? !0 : typeof t != typeof e ? !1 : typeof e != "object" || e === null ? e === t : t ? Array.isArray(e) ? Array.isArray(t) ? e.every(function(n) {
    return t.some(function(r) {
      return kn(n, r);
    });
  }) : !1 : e instanceof Date ? t instanceof Date ? e.getTime() === t.getTime() : !1 : Object.keys(e).every(function(n) {
    let r = e[n], o = t[n];
    return typeof r == "object" && r !== null && o !== null ? kn(r, o) : typeof r == "function" ? r(o) : o === r;
  }) : !1;
}
v(kn, "compareSubset");
y.addMethod("containSubset", function(e) {
  const t = q(this, "object"), n = we.showDiff;
  this.assert(
    kn(e, t),
    "expected #{act} to contain subset #{exp}",
    "expected #{act} to not contain subset #{exp}",
    e,
    t,
    n
  );
});
function ht(e, t) {
  return new y(e, t);
}
v(ht, "expect");
ht.fail = function(e, t, n, r) {
  throw arguments.length < 2 && (n = e, e = void 0), n = n || "expect.fail()", new K(
    n,
    {
      actual: e,
      expected: t,
      operator: r
    },
    ht.fail
  );
};
var uu = {};
Mo(uu, {
  Should: () => wp,
  should: () => bp
});
function us() {
  function e() {
    return this instanceof String || this instanceof Number || this instanceof Boolean || typeof Symbol == "function" && this instanceof Symbol || typeof BigInt == "function" && this instanceof BigInt ? new y(this.valueOf(), null, e) : new y(this, null, e);
  }
  v(e, "shouldGetter");
  function t(r) {
    Object.defineProperty(this, "should", {
      value: r,
      enumerable: !0,
      configurable: !0,
      writable: !0
    });
  }
  v(t, "shouldSetter"), Object.defineProperty(Object.prototype, "should", {
    set: t,
    get: e,
    configurable: !0
  });
  let n = {};
  return n.fail = function(r, o, s, i) {
    throw arguments.length < 2 && (s = r, r = void 0), s = s || "should.fail()", new K(
      s,
      {
        actual: r,
        expected: o,
        operator: i
      },
      n.fail
    );
  }, n.equal = function(r, o, s) {
    new y(r, s).to.equal(o);
  }, n.Throw = function(r, o, s, i) {
    new y(r, i).to.Throw(o, s);
  }, n.exist = function(r, o) {
    new y(r, o).to.exist;
  }, n.not = {}, n.not.equal = function(r, o, s) {
    new y(r, s).to.not.equal(o);
  }, n.not.Throw = function(r, o, s, i) {
    new y(r, i).to.not.Throw(o, s);
  }, n.not.exist = function(r, o) {
    new y(r, o).to.not.exist;
  }, n.throw = n.Throw, n.not.throw = n.not.Throw, n;
}
v(us, "loadShould");
var bp = us, wp = us;
function m(e, t) {
  new y(null, null, m, !0).assert(e, t, "[ negation message unavailable ]");
}
v(m, "assert");
m.fail = function(e, t, n, r) {
  throw arguments.length < 2 && (n = e, e = void 0), n = n || "assert.fail()", new K(
    n,
    {
      actual: e,
      expected: t,
      operator: r
    },
    m.fail
  );
};
m.isOk = function(e, t) {
  new y(e, t, m.isOk, !0).is.ok;
};
m.isNotOk = function(e, t) {
  new y(e, t, m.isNotOk, !0).is.not.ok;
};
m.equal = function(e, t, n) {
  let r = new y(e, n, m.equal, !0);
  r.assert(
    t == q(r, "object"),
    "expected #{this} to equal #{exp}",
    "expected #{this} to not equal #{act}",
    t,
    e,
    !0
  );
};
m.notEqual = function(e, t, n) {
  let r = new y(e, n, m.notEqual, !0);
  r.assert(
    t != q(r, "object"),
    "expected #{this} to not equal #{exp}",
    "expected #{this} to equal #{act}",
    t,
    e,
    !0
  );
};
m.strictEqual = function(e, t, n) {
  new y(e, n, m.strictEqual, !0).to.equal(t);
};
m.notStrictEqual = function(e, t, n) {
  new y(e, n, m.notStrictEqual, !0).to.not.equal(t);
};
m.deepEqual = m.deepStrictEqual = function(e, t, n) {
  new y(e, n, m.deepEqual, !0).to.eql(t);
};
m.notDeepEqual = function(e, t, n) {
  new y(e, n, m.notDeepEqual, !0).to.not.eql(t);
};
m.isAbove = function(e, t, n) {
  new y(e, n, m.isAbove, !0).to.be.above(t);
};
m.isAtLeast = function(e, t, n) {
  new y(e, n, m.isAtLeast, !0).to.be.least(t);
};
m.isBelow = function(e, t, n) {
  new y(e, n, m.isBelow, !0).to.be.below(t);
};
m.isAtMost = function(e, t, n) {
  new y(e, n, m.isAtMost, !0).to.be.most(t);
};
m.isTrue = function(e, t) {
  new y(e, t, m.isTrue, !0).is.true;
};
m.isNotTrue = function(e, t) {
  new y(e, t, m.isNotTrue, !0).to.not.equal(!0);
};
m.isFalse = function(e, t) {
  new y(e, t, m.isFalse, !0).is.false;
};
m.isNotFalse = function(e, t) {
  new y(e, t, m.isNotFalse, !0).to.not.equal(!1);
};
m.isNull = function(e, t) {
  new y(e, t, m.isNull, !0).to.equal(null);
};
m.isNotNull = function(e, t) {
  new y(e, t, m.isNotNull, !0).to.not.equal(null);
};
m.isNaN = function(e, t) {
  new y(e, t, m.isNaN, !0).to.be.NaN;
};
m.isNotNaN = function(e, t) {
  new y(e, t, m.isNotNaN, !0).not.to.be.NaN;
};
m.exists = function(e, t) {
  new y(e, t, m.exists, !0).to.exist;
};
m.notExists = function(e, t) {
  new y(e, t, m.notExists, !0).to.not.exist;
};
m.isUndefined = function(e, t) {
  new y(e, t, m.isUndefined, !0).to.equal(void 0);
};
m.isDefined = function(e, t) {
  new y(e, t, m.isDefined, !0).to.not.equal(void 0);
};
m.isCallable = function(e, t) {
  new y(e, t, m.isCallable, !0).is.callable;
};
m.isNotCallable = function(e, t) {
  new y(e, t, m.isNotCallable, !0).is.not.callable;
};
m.isObject = function(e, t) {
  new y(e, t, m.isObject, !0).to.be.a("object");
};
m.isNotObject = function(e, t) {
  new y(e, t, m.isNotObject, !0).to.not.be.a("object");
};
m.isArray = function(e, t) {
  new y(e, t, m.isArray, !0).to.be.an("array");
};
m.isNotArray = function(e, t) {
  new y(e, t, m.isNotArray, !0).to.not.be.an("array");
};
m.isString = function(e, t) {
  new y(e, t, m.isString, !0).to.be.a("string");
};
m.isNotString = function(e, t) {
  new y(e, t, m.isNotString, !0).to.not.be.a("string");
};
m.isNumber = function(e, t) {
  new y(e, t, m.isNumber, !0).to.be.a("number");
};
m.isNotNumber = function(e, t) {
  new y(e, t, m.isNotNumber, !0).to.not.be.a("number");
};
m.isNumeric = function(e, t) {
  new y(e, t, m.isNumeric, !0).is.numeric;
};
m.isNotNumeric = function(e, t) {
  new y(e, t, m.isNotNumeric, !0).is.not.numeric;
};
m.isFinite = function(e, t) {
  new y(e, t, m.isFinite, !0).to.be.finite;
};
m.isBoolean = function(e, t) {
  new y(e, t, m.isBoolean, !0).to.be.a("boolean");
};
m.isNotBoolean = function(e, t) {
  new y(e, t, m.isNotBoolean, !0).to.not.be.a("boolean");
};
m.typeOf = function(e, t, n) {
  new y(e, n, m.typeOf, !0).to.be.a(t);
};
m.notTypeOf = function(e, t, n) {
  new y(e, n, m.notTypeOf, !0).to.not.be.a(t);
};
m.instanceOf = function(e, t, n) {
  new y(e, n, m.instanceOf, !0).to.be.instanceOf(t);
};
m.notInstanceOf = function(e, t, n) {
  new y(e, n, m.notInstanceOf, !0).to.not.be.instanceOf(
    t
  );
};
m.include = function(e, t, n) {
  new y(e, n, m.include, !0).include(t);
};
m.notInclude = function(e, t, n) {
  new y(e, n, m.notInclude, !0).not.include(t);
};
m.deepInclude = function(e, t, n) {
  new y(e, n, m.deepInclude, !0).deep.include(t);
};
m.notDeepInclude = function(e, t, n) {
  new y(e, n, m.notDeepInclude, !0).not.deep.include(t);
};
m.nestedInclude = function(e, t, n) {
  new y(e, n, m.nestedInclude, !0).nested.include(t);
};
m.notNestedInclude = function(e, t, n) {
  new y(e, n, m.notNestedInclude, !0).not.nested.include(
    t
  );
};
m.deepNestedInclude = function(e, t, n) {
  new y(e, n, m.deepNestedInclude, !0).deep.nested.include(
    t
  );
};
m.notDeepNestedInclude = function(e, t, n) {
  new y(
    e,
    n,
    m.notDeepNestedInclude,
    !0
  ).not.deep.nested.include(t);
};
m.ownInclude = function(e, t, n) {
  new y(e, n, m.ownInclude, !0).own.include(t);
};
m.notOwnInclude = function(e, t, n) {
  new y(e, n, m.notOwnInclude, !0).not.own.include(t);
};
m.deepOwnInclude = function(e, t, n) {
  new y(e, n, m.deepOwnInclude, !0).deep.own.include(t);
};
m.notDeepOwnInclude = function(e, t, n) {
  new y(e, n, m.notDeepOwnInclude, !0).not.deep.own.include(
    t
  );
};
m.match = function(e, t, n) {
  new y(e, n, m.match, !0).to.match(t);
};
m.notMatch = function(e, t, n) {
  new y(e, n, m.notMatch, !0).to.not.match(t);
};
m.property = function(e, t, n) {
  new y(e, n, m.property, !0).to.have.property(t);
};
m.notProperty = function(e, t, n) {
  new y(e, n, m.notProperty, !0).to.not.have.property(t);
};
m.propertyVal = function(e, t, n, r) {
  new y(e, r, m.propertyVal, !0).to.have.property(t, n);
};
m.notPropertyVal = function(e, t, n, r) {
  new y(e, r, m.notPropertyVal, !0).to.not.have.property(
    t,
    n
  );
};
m.deepPropertyVal = function(e, t, n, r) {
  new y(e, r, m.deepPropertyVal, !0).to.have.deep.property(
    t,
    n
  );
};
m.notDeepPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.notDeepPropertyVal,
    !0
  ).to.not.have.deep.property(t, n);
};
m.ownProperty = function(e, t, n) {
  new y(e, n, m.ownProperty, !0).to.have.own.property(t);
};
m.notOwnProperty = function(e, t, n) {
  new y(e, n, m.notOwnProperty, !0).to.not.have.own.property(
    t
  );
};
m.ownPropertyVal = function(e, t, n, r) {
  new y(e, r, m.ownPropertyVal, !0).to.have.own.property(
    t,
    n
  );
};
m.notOwnPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.notOwnPropertyVal,
    !0
  ).to.not.have.own.property(t, n);
};
m.deepOwnPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.deepOwnPropertyVal,
    !0
  ).to.have.deep.own.property(t, n);
};
m.notDeepOwnPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.notDeepOwnPropertyVal,
    !0
  ).to.not.have.deep.own.property(t, n);
};
m.nestedProperty = function(e, t, n) {
  new y(e, n, m.nestedProperty, !0).to.have.nested.property(
    t
  );
};
m.notNestedProperty = function(e, t, n) {
  new y(
    e,
    n,
    m.notNestedProperty,
    !0
  ).to.not.have.nested.property(t);
};
m.nestedPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.nestedPropertyVal,
    !0
  ).to.have.nested.property(t, n);
};
m.notNestedPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.notNestedPropertyVal,
    !0
  ).to.not.have.nested.property(t, n);
};
m.deepNestedPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.deepNestedPropertyVal,
    !0
  ).to.have.deep.nested.property(t, n);
};
m.notDeepNestedPropertyVal = function(e, t, n, r) {
  new y(
    e,
    r,
    m.notDeepNestedPropertyVal,
    !0
  ).to.not.have.deep.nested.property(t, n);
};
m.lengthOf = function(e, t, n) {
  new y(e, n, m.lengthOf, !0).to.have.lengthOf(t);
};
m.hasAnyKeys = function(e, t, n) {
  new y(e, n, m.hasAnyKeys, !0).to.have.any.keys(t);
};
m.hasAllKeys = function(e, t, n) {
  new y(e, n, m.hasAllKeys, !0).to.have.all.keys(t);
};
m.containsAllKeys = function(e, t, n) {
  new y(e, n, m.containsAllKeys, !0).to.contain.all.keys(
    t
  );
};
m.doesNotHaveAnyKeys = function(e, t, n) {
  new y(e, n, m.doesNotHaveAnyKeys, !0).to.not.have.any.keys(
    t
  );
};
m.doesNotHaveAllKeys = function(e, t, n) {
  new y(e, n, m.doesNotHaveAllKeys, !0).to.not.have.all.keys(
    t
  );
};
m.hasAnyDeepKeys = function(e, t, n) {
  new y(e, n, m.hasAnyDeepKeys, !0).to.have.any.deep.keys(
    t
  );
};
m.hasAllDeepKeys = function(e, t, n) {
  new y(e, n, m.hasAllDeepKeys, !0).to.have.all.deep.keys(
    t
  );
};
m.containsAllDeepKeys = function(e, t, n) {
  new y(
    e,
    n,
    m.containsAllDeepKeys,
    !0
  ).to.contain.all.deep.keys(t);
};
m.doesNotHaveAnyDeepKeys = function(e, t, n) {
  new y(
    e,
    n,
    m.doesNotHaveAnyDeepKeys,
    !0
  ).to.not.have.any.deep.keys(t);
};
m.doesNotHaveAllDeepKeys = function(e, t, n) {
  new y(
    e,
    n,
    m.doesNotHaveAllDeepKeys,
    !0
  ).to.not.have.all.deep.keys(t);
};
m.throws = function(e, t, n, r) {
  (typeof t == "string" || t instanceof RegExp) && (n = t, t = null);
  let o = new y(e, r, m.throws, !0).to.throw(
    t,
    n
  );
  return q(o, "object");
};
m.doesNotThrow = function(e, t, n, r) {
  (typeof t == "string" || t instanceof RegExp) && (n = t, t = null), new y(e, r, m.doesNotThrow, !0).to.not.throw(
    t,
    n
  );
};
m.operator = function(e, t, n, r) {
  let o;
  switch (t) {
    case "==":
      o = e == n;
      break;
    case "===":
      o = e === n;
      break;
    case ">":
      o = e > n;
      break;
    case ">=":
      o = e >= n;
      break;
    case "<":
      o = e < n;
      break;
    case "<=":
      o = e <= n;
      break;
    case "!=":
      o = e != n;
      break;
    case "!==":
      o = e !== n;
      break;
    default:
      throw r = r && r + ": ", new K(
        r + 'Invalid operator "' + t + '"',
        void 0,
        m.operator
      );
  }
  let s = new y(o, r, m.operator, !0);
  s.assert(
    q(s, "object") === !0,
    "expected " + W(e) + " to be " + t + " " + W(n),
    "expected " + W(e) + " to not be " + t + " " + W(n)
  );
};
m.closeTo = function(e, t, n, r) {
  new y(e, r, m.closeTo, !0).to.be.closeTo(t, n);
};
m.approximately = function(e, t, n, r) {
  new y(e, r, m.approximately, !0).to.be.approximately(
    t,
    n
  );
};
m.sameMembers = function(e, t, n) {
  new y(e, n, m.sameMembers, !0).to.have.same.members(t);
};
m.notSameMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notSameMembers,
    !0
  ).to.not.have.same.members(t);
};
m.sameDeepMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.sameDeepMembers,
    !0
  ).to.have.same.deep.members(t);
};
m.notSameDeepMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notSameDeepMembers,
    !0
  ).to.not.have.same.deep.members(t);
};
m.sameOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.sameOrderedMembers,
    !0
  ).to.have.same.ordered.members(t);
};
m.notSameOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notSameOrderedMembers,
    !0
  ).to.not.have.same.ordered.members(t);
};
m.sameDeepOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.sameDeepOrderedMembers,
    !0
  ).to.have.same.deep.ordered.members(t);
};
m.notSameDeepOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notSameDeepOrderedMembers,
    !0
  ).to.not.have.same.deep.ordered.members(t);
};
m.includeMembers = function(e, t, n) {
  new y(e, n, m.includeMembers, !0).to.include.members(
    t
  );
};
m.notIncludeMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notIncludeMembers,
    !0
  ).to.not.include.members(t);
};
m.includeDeepMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.includeDeepMembers,
    !0
  ).to.include.deep.members(t);
};
m.notIncludeDeepMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notIncludeDeepMembers,
    !0
  ).to.not.include.deep.members(t);
};
m.includeOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.includeOrderedMembers,
    !0
  ).to.include.ordered.members(t);
};
m.notIncludeOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notIncludeOrderedMembers,
    !0
  ).to.not.include.ordered.members(t);
};
m.includeDeepOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.includeDeepOrderedMembers,
    !0
  ).to.include.deep.ordered.members(t);
};
m.notIncludeDeepOrderedMembers = function(e, t, n) {
  new y(
    e,
    n,
    m.notIncludeDeepOrderedMembers,
    !0
  ).to.not.include.deep.ordered.members(t);
};
m.oneOf = function(e, t, n) {
  new y(e, n, m.oneOf, !0).to.be.oneOf(t);
};
m.isIterable = function(e, t) {
  if (e == null || !e[Symbol.iterator])
    throw t = t ? `${t} expected ${W(e)} to be an iterable` : `expected ${W(e)} to be an iterable`, new K(t, void 0, m.isIterable);
};
m.changes = function(e, t, n, r) {
  arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.changes, !0).to.change(t, n);
};
m.changesBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.changesBy, !0).to.change(t, n).by(r);
};
m.doesNotChange = function(e, t, n, r) {
  return arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.doesNotChange, !0).to.not.change(
    t,
    n
  );
};
m.changesButNotBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.changesButNotBy, !0).to.change(t, n).but.not.by(r);
};
m.increases = function(e, t, n, r) {
  return arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.increases, !0).to.increase(t, n);
};
m.increasesBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.increasesBy, !0).to.increase(t, n).by(r);
};
m.doesNotIncrease = function(e, t, n, r) {
  return arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.doesNotIncrease, !0).to.not.increase(
    t,
    n
  );
};
m.increasesButNotBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.increasesButNotBy, !0).to.increase(t, n).but.not.by(r);
};
m.decreases = function(e, t, n, r) {
  return arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.decreases, !0).to.decrease(t, n);
};
m.decreasesBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.decreasesBy, !0).to.decrease(t, n).by(r);
};
m.doesNotDecrease = function(e, t, n, r) {
  return arguments.length === 3 && typeof t == "function" && (r = n, n = null), new y(e, r, m.doesNotDecrease, !0).to.not.decrease(
    t,
    n
  );
};
m.doesNotDecreaseBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  return new y(e, o, m.doesNotDecreaseBy, !0).to.not.decrease(t, n).by(r);
};
m.decreasesButNotBy = function(e, t, n, r, o) {
  if (arguments.length === 4 && typeof t == "function") {
    let s = r;
    r = n, o = s;
  } else arguments.length === 3 && (r = n, n = null);
  new y(e, o, m.decreasesButNotBy, !0).to.decrease(t, n).but.not.by(r);
};
m.ifError = function(e) {
  if (e)
    throw e;
};
m.isExtensible = function(e, t) {
  new y(e, t, m.isExtensible, !0).to.be.extensible;
};
m.isNotExtensible = function(e, t) {
  new y(e, t, m.isNotExtensible, !0).to.not.be.extensible;
};
m.isSealed = function(e, t) {
  new y(e, t, m.isSealed, !0).to.be.sealed;
};
m.isNotSealed = function(e, t) {
  new y(e, t, m.isNotSealed, !0).to.not.be.sealed;
};
m.isFrozen = function(e, t) {
  new y(e, t, m.isFrozen, !0).to.be.frozen;
};
m.isNotFrozen = function(e, t) {
  new y(e, t, m.isNotFrozen, !0).to.not.be.frozen;
};
m.isEmpty = function(e, t) {
  new y(e, t, m.isEmpty, !0).to.be.empty;
};
m.isNotEmpty = function(e, t) {
  new y(e, t, m.isNotEmpty, !0).to.not.be.empty;
};
m.containsSubset = function(e, t, n) {
  new y(e, n).to.containSubset(t);
};
m.doesNotContainSubset = function(e, t, n) {
  new y(e, n).to.not.containSubset(t);
};
var Tp = [
  ["isOk", "ok"],
  ["isNotOk", "notOk"],
  ["throws", "throw"],
  ["throws", "Throw"],
  ["isExtensible", "extensible"],
  ["isNotExtensible", "notExtensible"],
  ["isSealed", "sealed"],
  ["isNotSealed", "notSealed"],
  ["isFrozen", "frozen"],
  ["isNotFrozen", "notFrozen"],
  ["isEmpty", "empty"],
  ["isNotEmpty", "notEmpty"],
  ["isCallable", "isFunction"],
  ["isNotCallable", "isNotFunction"],
  ["containsSubset", "containSubset"]
];
for (const [e, t] of Tp)
  m[t] = m[e];
var vi = [];
function wt(e) {
  const t = {
    use: wt,
    AssertionError: K,
    util: he,
    config: we,
    expect: ht,
    assert: m,
    Assertion: y,
    ...uu
  };
  return ~vi.indexOf(e) || (e(t, he), vi.push(e)), t;
}
v(wt, "use");
const Cn = Symbol.for("matchers-object"), ln = Symbol.for("$$jest-matchers-object"), Hn = Symbol.for("expect-global"), ls = Symbol.for("asymmetric-matchers-object"), Sp = {
  toSatisfy(e, t, n) {
    const { printReceived: r, printExpected: o, matcherHint: s } = this.utils, i = t(e);
    return {
      pass: i,
      message: () => i ? `${s(".not.toSatisfy", "received", "")}

Expected value to not satisfy:
${n || o(t)}
Received:
${r(e)}` : `${s(".toSatisfy", "received", "")}

Expected value to satisfy:
${n || o(t)}

Received:
${r(e)}`
    };
  },
  toBeOneOf(e, t) {
    const { equals: n, customTesters: r } = this, { printReceived: o, printExpected: s, matcherHint: i } = this.utils;
    if (!Array.isArray(t))
      throw new TypeError(`You must provide an array to ${i(".toBeOneOf")}, not '${typeof t}'.`);
    const a = t.length === 0 || t.some((u) => n(u, e, r));
    return {
      pass: a,
      message: () => a ? `${i(".not.toBeOneOf", "received", "")}

Expected value to not be one of:
${s(t)}
Received:
${o(e)}` : `${i(".toBeOneOf", "received", "")}

Expected value to be one of:
${s(t)}

Received:
${o(e)}`
    };
  }
}, In = ce.green, fs = ce.red, Ep = ce.inverse, vp = ce.bold, et = ce.dim;
function $p(e, t = "received", n = "expected", r = {}) {
  const { comment: o = "", isDirectExpectCall: s = !1, isNot: i = !1, promise: a = "", secondArgument: u = "", expectedColor: c = In, receivedColor: l = fs, secondArgumentColor: f = In } = r;
  let h = "", p = "expect";
  return !s && t !== "" && (h += et(`${p}(`) + l(t), p = ")"), a !== "" && (h += et(`${p}.`) + a, p = ""), i && (h += `${et(`${p}.`)}not`, p = ""), e.includes(".") ? p += e : (h += et(`${p}.`) + e, p = ""), n === "" ? p += "()" : (h += et(`${p}(`) + c(n), u && (h += et(", ") + f(u)), p = ")"), o !== "" && (p += ` // ${o}`), p !== "" && (h += et(p)), h;
}
const xp = "·";
function lu(e) {
  return e.replace(/\s+$/gm, (t) => xp.repeat(t.length));
}
function _p(e) {
  return fs(lu(Ae(e)));
}
function Mp(e) {
  return In(lu(Ae(e)));
}
function fu() {
  return {
    EXPECTED_COLOR: In,
    RECEIVED_COLOR: fs,
    INVERTED_COLOR: Ep,
    BOLD_WEIGHT: vp,
    DIM_COLOR: et,
    diff: Nt,
    matcherHint: $p,
    printReceived: _p,
    printExpected: Mp,
    printDiffOrStringify: ga,
    printWithType: Op
  };
}
function Op(e, t, n) {
  const r = tn(t), o = r !== "null" && r !== "undefined" ? `${e} has type:  ${r}
` : "", s = `${e} has value: ${n(t)}`;
  return o + s;
}
function Ap(e) {
  if (!Array.isArray(e))
    throw new TypeError(`expect.customEqualityTesters: Must be set to an array of Testers. Was given "${tn(e)}"`);
  globalThis[ln].customEqualityTesters.push(...e);
}
function hs() {
  return globalThis[ln].customEqualityTesters;
}
function U(e, t, n, r) {
  return n = n || [], Xt(e, t, [], [], n, r ? hu : Ip);
}
function $i(e) {
  return !!e && typeof e == "object" && "asymmetricMatch" in e && qe("Function", e.asymmetricMatch);
}
function kp(e, t, n) {
  const r = $i(e), o = $i(t);
  if (!(r && o)) {
    if (r)
      return e.asymmetricMatch(t, n);
    if (o)
      return t.asymmetricMatch(e, n);
  }
}
function Xt(e, t, n, r, o, s) {
  let i = !0;
  const a = kp(e, t, o);
  if (a !== void 0)
    return a;
  const u = { equals: U };
  for (let d = 0; d < o.length; d++) {
    const g = o[d].call(u, e, t, o);
    if (g !== void 0)
      return g;
  }
  if (typeof URL == "function" && e instanceof URL && t instanceof URL)
    return e.href === t.href;
  if (Object.is(e, t))
    return !0;
  if (e === null || t === null)
    return e === t;
  const c = Object.prototype.toString.call(e);
  if (c !== Object.prototype.toString.call(t))
    return !1;
  switch (c) {
    case "[object Boolean]":
    case "[object String]":
    case "[object Number]":
      return typeof e != typeof t ? !1 : typeof e != "object" && typeof t != "object" ? Object.is(e, t) : Object.is(e.valueOf(), t.valueOf());
    case "[object Date]": {
      const d = +e, g = +t;
      return d === g || Number.isNaN(d) && Number.isNaN(g);
    }
    case "[object RegExp]":
      return e.source === t.source && e.flags === t.flags;
    case "[object Temporal.Instant]":
    case "[object Temporal.ZonedDateTime]":
    case "[object Temporal.PlainDateTime]":
    case "[object Temporal.PlainDate]":
    case "[object Temporal.PlainTime]":
    case "[object Temporal.PlainYearMonth]":
    case "[object Temporal.PlainMonthDay]":
      return e.equals(t);
    case "[object Temporal.Duration]":
      return e.toString() === t.toString();
  }
  if (typeof e != "object" || typeof t != "object")
    return !1;
  if (_i(e) && _i(t))
    return e.isEqualNode(t);
  let l = n.length;
  for (; l--; ) {
    if (n[l] === e)
      return r[l] === t;
    if (r[l] === t)
      return !1;
  }
  if (n.push(e), r.push(t), c === "[object Array]" && e.length !== t.length)
    return !1;
  if (e instanceof Error && t instanceof Error)
    try {
      return Cp(e, t, n, r, o, s);
    } finally {
      n.pop(), r.pop();
    }
  const f = xi(e, s);
  let h, p = f.length;
  if (xi(t, s).length !== p)
    return !1;
  for (; p--; )
    if (h = f[p], i = s(t, h) && Xt(e[h], t[h], n, r, o, s), !i)
      return !1;
  return n.pop(), r.pop(), i;
}
function Cp(e, t, n, r, o, s) {
  let i = Object.getPrototypeOf(e) === Object.getPrototypeOf(t) && e.name === t.name && e.message === t.message;
  return typeof t.cause < "u" && i && (i = Xt(e.cause, t.cause, n, r, o, s)), e instanceof AggregateError && t instanceof AggregateError && i && (i = Xt(e.errors, t.errors, n, r, o, s)), i && (i = Xt({ ...e }, { ...t }, n, r, o, s)), i;
}
function xi(e, t) {
  const n = [];
  for (const r in e)
    t(e, r) && n.push(r);
  return n.concat(Object.getOwnPropertySymbols(e).filter((r) => Object.getOwnPropertyDescriptor(e, r).enumerable));
}
function Ip(e, t) {
  return hu(e, t) && e[t] !== void 0;
}
function hu(e, t) {
  return Object.hasOwn(e, t);
}
function qe(e, t) {
  return Object.prototype.toString.apply(t) === `[object ${e}]`;
}
function _i(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && typeof e.nodeType == "number" && "nodeName" in e && typeof e.nodeName == "string" && "isEqualNode" in e && typeof e.isEqualNode == "function";
}
const pu = "@@__IMMUTABLE_KEYED__@@", du = "@@__IMMUTABLE_SET__@@", Pp = "@@__IMMUTABLE_LIST__@@", Zn = "@@__IMMUTABLE_ORDERED__@@", Np = "@@__IMMUTABLE_RECORD__@@";
function jp(e) {
  return !!(e && e[pu] && !e[Zn]);
}
function Rp(e) {
  return !!(e && e[du] && !e[Zn]);
}
function Qn(e) {
  return e != null && typeof e == "object" && !Array.isArray(e);
}
function Dp(e) {
  return !!(e && Qn(e) && e[Pp]);
}
function Fp(e) {
  return !!(e && Qn(e) && e[pu] && e[Zn]);
}
function Lp(e) {
  return !!(e && Qn(e) && e[du] && e[Zn]);
}
function qp(e) {
  return !!(e && Qn(e) && e[Np]);
}
const mu = Symbol.iterator;
function Mi(e) {
  return !!(e != null && e[mu]);
}
function Oe(e, t, n = [], r = [], o = []) {
  if (typeof e != "object" || typeof t != "object" || Array.isArray(e) || Array.isArray(t) || !Mi(e) || !Mi(t))
    return;
  if (e.constructor !== t.constructor)
    return !1;
  let s = r.length;
  for (; s--; )
    if (r[s] === e)
      return o[s] === t;
  r.push(e), o.push(t);
  const i = [...n.filter((c) => c !== Oe), a];
  function a(c, l) {
    return Oe(c, l, [...n], [...r], [...o]);
  }
  if (e.size !== void 0) {
    if (e.size !== t.size)
      return !1;
    if (qe("Set", e) || Rp(e)) {
      let c = !0;
      for (const l of e)
        if (!t.has(l)) {
          let f = !1;
          for (const h of t)
            U(l, h, i) === !0 && (f = !0);
          if (f === !1) {
            c = !1;
            break;
          }
        }
      return r.pop(), o.pop(), c;
    } else if (qe("Map", e) || jp(e)) {
      let c = !0;
      for (const l of e)
        if (!t.has(l[0]) || !U(l[1], t.get(l[0]), i)) {
          let f = !1;
          for (const h of t) {
            const p = U(l[0], h[0], i);
            let d = !1;
            p === !0 && (d = U(l[1], h[1], i)), d === !0 && (f = !0);
          }
          if (f === !1) {
            c = !1;
            break;
          }
        }
      return r.pop(), o.pop(), c;
    }
  }
  const u = t[mu]();
  for (const c of e) {
    const l = u.next();
    if (l.done || !U(c, l.value, i))
      return !1;
  }
  if (!u.next().done)
    return !1;
  if (!Dp(e) && !Fp(e) && !Lp(e) && !qp(e)) {
    const c = Object.entries(e), l = Object.entries(t);
    if (!U(c, l, i))
      return !1;
  }
  return r.pop(), o.pop(), !0;
}
function ps(e, t) {
  return !e || typeof e != "object" || e === Object.prototype ? !1 : Object.hasOwn(e, t) || ps(Object.getPrototypeOf(e), t);
}
function Bp(e) {
  return xt(e) && !(e instanceof Error) && !Array.isArray(e) && !(e instanceof Date);
}
function Rt(e, t, n = []) {
  const r = n.filter((s) => s !== Rt), o = (s = /* @__PURE__ */ new WeakMap()) => (i, a) => {
    if (Bp(a))
      return Object.keys(a).every((u) => {
        if (a[u] != null && typeof a[u] == "object") {
          if (s.has(a[u]))
            return U(i[u], a[u], r);
          s.set(a[u], !0);
        }
        const c = i != null && ps(i, u) && U(i[u], a[u], [...r, o(s)]);
        return s.delete(a[u]), c;
      });
  };
  return o()(e, t);
}
function Oi(e, t) {
  if (!(e == null || t == null || e.constructor === t.constructor))
    return !1;
}
function Ai(e, t) {
  let n = e, r = t;
  if (!(e instanceof DataView && t instanceof DataView)) {
    if (!(e instanceof ArrayBuffer) || !(t instanceof ArrayBuffer))
      return;
    try {
      n = new DataView(e), r = new DataView(t);
    } catch {
      return;
    }
  }
  if (n.byteLength !== r.byteLength)
    return !1;
  for (let o = 0; o < n.byteLength; o++)
    if (n.getUint8(o) !== r.getUint8(o))
      return !1;
  return !0;
}
function uo(e, t, n = []) {
  if (!Array.isArray(e) || !Array.isArray(t))
    return;
  const r = Object.keys(e), o = Object.keys(t), s = n.filter((i) => i !== uo);
  return U(e, t, s, !0) && U(r, o);
}
function zp(e, t = "#{this}", n = "#{exp}") {
  const r = `expected ${t} to be ${n} // Object.is equality`;
  return ["toStrictEqual", "toEqual"].includes(e) ? `${r}

If it should pass with deep equality, replace "toBe" with "${e}"

Expected: ${t}
Received: serializes to the same string
` : r;
}
function Wp(e, t) {
  return `${t} ${e}${t === 1 ? "" : "s"}`;
}
function gr(e) {
  return [...Object.keys(e), ...Object.getOwnPropertySymbols(e).filter((t) => {
    var n;
    return (n = Object.getOwnPropertyDescriptor(e, t)) === null || n === void 0 ? void 0 : n.enumerable;
  })];
}
function Vp(e, t, n) {
  let r = 0;
  const o = (s = /* @__PURE__ */ new WeakMap()) => (i, a) => {
    if (Array.isArray(i)) {
      if (Array.isArray(a) && a.length === i.length)
        return a.map((u, c) => o(s)(i[c], u));
    } else {
      if (i instanceof Date)
        return i;
      if (xt(i) && xt(a)) {
        if (U(i, a, [
          ...n,
          Oe,
          Rt
        ]))
          return a;
        const u = {};
        s.set(i, u), typeof i.constructor == "function" && typeof i.constructor.name == "string" && Object.defineProperty(u, "constructor", {
          enumerable: !1,
          value: i.constructor
        });
        for (const c of gr(i))
          ps(a, c) ? u[c] = s.has(i[c]) ? s.get(i[c]) : o(s)(i[c], a[c]) : s.has(i[c]) || (r += 1, xt(i[c]) && (r += gr(i[c]).length), o(s)(i[c], a[c]));
        if (gr(u).length > 0)
          return u;
      }
    }
    return i;
  };
  return {
    subset: o()(e, t),
    stripped: r
  };
}
function Up(e) {
  return !!e && typeof e == "object" && e["~standard"] && typeof e["~standard"].validate == "function";
}
if (!Object.hasOwn(globalThis, Cn)) {
  const e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ Object.create(null), n = [], r = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(globalThis, Cn, { get: () => e }), Object.defineProperty(globalThis, ln, {
    configurable: !0,
    get: () => ({
      state: e.get(globalThis[Hn]),
      matchers: t,
      customEqualityTesters: n
    })
  }), Object.defineProperty(globalThis, ls, { get: () => r });
}
function Ht(e) {
  return globalThis[Cn].get(e);
}
function yr(e, t) {
  const n = globalThis[Cn], r = n.get(t) || {}, o = Object.defineProperties(r, {
    ...Object.getOwnPropertyDescriptors(r),
    ...Object.getOwnPropertyDescriptors(e)
  });
  n.set(t, o);
}
let Ge = class {
  // should have "jest" to be compatible with its ecosystem
  $$typeof = Symbol.for("jest.asymmetricMatcher");
  constructor(t, n = !1) {
    this.sample = t, this.inverse = n;
  }
  getMatcherContext(t) {
    return {
      ...Ht(t || globalThis[Hn]),
      equals: U,
      isNot: this.inverse,
      customTesters: hs(),
      utils: {
        ...fu(),
        diff: Nt,
        stringify: Ae,
        iterableEquality: Oe,
        subsetEquality: Rt
      }
    };
  }
};
Ge.prototype[Symbol.for("chai/inspect")] = function(e) {
  const t = Ae(this, e.depth, { min: !0 });
  return t.length <= e.truncate ? t : `${this.toString()}{…}`;
};
class ki extends Ge {
  constructor(t, n = !1) {
    if (!qe("String", t))
      throw new Error("Expected is not a string");
    super(t, n);
  }
  asymmetricMatch(t) {
    const n = qe("String", t) && t.includes(this.sample);
    return this.inverse ? !n : n;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "string";
  }
}
class Kp extends Ge {
  asymmetricMatch(t) {
    return t != null;
  }
  toString() {
    return "Anything";
  }
  toAsymmetricMatcher() {
    return "Anything";
  }
}
class Ci extends Ge {
  constructor(t, n = !1) {
    super(t, n);
  }
  getPrototype(t) {
    return Object.getPrototypeOf ? Object.getPrototypeOf(t) : t.constructor.prototype === t ? null : t.constructor.prototype;
  }
  hasProperty(t, n) {
    return t ? Object.hasOwn(t, n) ? !0 : this.hasProperty(this.getPrototype(t), n) : !1;
  }
  getProperties(t) {
    return [...Object.keys(t), ...Object.getOwnPropertySymbols(t).filter((n) => {
      var r;
      return (r = Object.getOwnPropertyDescriptor(t, n)) === null || r === void 0 ? void 0 : r.enumerable;
    })];
  }
  asymmetricMatch(t, n) {
    if (typeof this.sample != "object")
      throw new TypeError(`You must provide an object to ${this.toString()}, not '${typeof this.sample}'.`);
    let r = !0;
    const o = this.getProperties(this.sample);
    for (const a of o) {
      var s, i;
      if (!this.hasProperty(t, a)) {
        r = !1;
        break;
      }
      const u = ((s = Object.getOwnPropertyDescriptor(this.sample, a)) === null || s === void 0 ? void 0 : s.value) ?? this.sample[a], c = ((i = Object.getOwnPropertyDescriptor(t, a)) === null || i === void 0 ? void 0 : i.value) ?? t[a];
      if (!U(u, c, n)) {
        r = !1;
        break;
      }
    }
    return this.inverse ? !r : r;
  }
  toString() {
    return `Object${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "object";
  }
}
class Ii extends Ge {
  constructor(t, n = !1) {
    super(t, n);
  }
  asymmetricMatch(t, n) {
    if (!Array.isArray(this.sample))
      throw new TypeError(`You must provide an array to ${this.toString()}, not '${typeof this.sample}'.`);
    const r = this.sample.length === 0 || Array.isArray(t) && this.sample.every((o) => t.some((s) => U(o, s, n)));
    return this.inverse ? !r : r;
  }
  toString() {
    return `Array${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "array";
  }
}
class Gp extends Ge {
  constructor(t) {
    if (typeof t > "u")
      throw new TypeError("any() expects to be passed a constructor function. Please pass one or use anything() to match any object.");
    super(t);
  }
  fnNameFor(t) {
    if (t.name)
      return t.name;
    const r = Function.prototype.toString.call(t).match(/^(?:async)?\s*function\s*(?:\*\s*)?([\w$]+)\s*\(/);
    return r ? r[1] : "<anonymous>";
  }
  asymmetricMatch(t) {
    return this.sample === String ? typeof t == "string" || t instanceof String : this.sample === Number ? typeof t == "number" || t instanceof Number : this.sample === Function ? typeof t == "function" || typeof t == "function" : this.sample === Boolean ? typeof t == "boolean" || t instanceof Boolean : this.sample === BigInt ? typeof t == "bigint" || t instanceof BigInt : this.sample === Symbol ? typeof t == "symbol" || t instanceof Symbol : this.sample === Object ? typeof t == "object" : t instanceof this.sample;
  }
  toString() {
    return "Any";
  }
  getExpectedType() {
    return this.sample === String ? "string" : this.sample === Number ? "number" : this.sample === Function ? "function" : this.sample === Object ? "object" : this.sample === Boolean ? "boolean" : this.fnNameFor(this.sample);
  }
  toAsymmetricMatcher() {
    return `Any<${this.fnNameFor(this.sample)}>`;
  }
}
class Pi extends Ge {
  constructor(t, n = !1) {
    if (!qe("String", t) && !qe("RegExp", t))
      throw new Error("Expected is not a String or a RegExp");
    super(new RegExp(t), n);
  }
  asymmetricMatch(t) {
    const n = qe("String", t) && this.sample.test(t);
    return this.inverse ? !n : n;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Matching`;
  }
  getExpectedType() {
    return "string";
  }
}
class Ni extends Ge {
  precision;
  constructor(t, n = 2, r = !1) {
    if (!qe("Number", t))
      throw new Error("Expected is not a Number");
    if (!qe("Number", n))
      throw new Error("Precision is not a Number");
    super(t), this.inverse = r, this.precision = n;
  }
  asymmetricMatch(t) {
    if (!qe("Number", t))
      return !1;
    let n = !1;
    return t === Number.POSITIVE_INFINITY && this.sample === Number.POSITIVE_INFINITY || t === Number.NEGATIVE_INFINITY && this.sample === Number.NEGATIVE_INFINITY ? n = !0 : n = Math.abs(this.sample - t) < 10 ** -this.precision / 2, this.inverse ? !n : n;
  }
  toString() {
    return `Number${this.inverse ? "Not" : ""}CloseTo`;
  }
  getExpectedType() {
    return "number";
  }
  toAsymmetricMatcher() {
    return [
      this.toString(),
      this.sample,
      `(${Wp("digit", this.precision)})`
    ].join(" ");
  }
}
class ji extends Ge {
  result;
  constructor(t, n = !1) {
    if (!Up(t))
      throw new TypeError("SchemaMatching expected to receive a Standard Schema.");
    super(t, n);
  }
  asymmetricMatch(t) {
    const n = this.sample["~standard"].validate(t);
    if (n instanceof Promise)
      throw new TypeError("Async schema validation is not supported in asymmetric matchers.");
    this.result = n;
    const r = !this.result.issues || this.result.issues.length === 0;
    return this.inverse ? !r : r;
  }
  toString() {
    return `Schema${this.inverse ? "Not" : ""}Matching`;
  }
  getExpectedType() {
    return "object";
  }
  toAsymmetricMatcher() {
    var t;
    const { utils: n } = this.getMatcherContext();
    return (((t = this.result) === null || t === void 0 ? void 0 : t.issues) || []).length > 0 ? `${this.toString()} ${n.stringify(this.result, void 0, { printBasicPrototype: !1 })}` : this.toString();
  }
}
const Yp = (e, t) => {
  t.addMethod(e.expect, "anything", () => new Kp()), t.addMethod(e.expect, "any", (n) => new Gp(n)), t.addMethod(e.expect, "stringContaining", (n) => new ki(n)), t.addMethod(e.expect, "objectContaining", (n) => new Ci(n)), t.addMethod(e.expect, "arrayContaining", (n) => new Ii(n)), t.addMethod(e.expect, "stringMatching", (n) => new Pi(n)), t.addMethod(e.expect, "closeTo", (n, r) => new Ni(n, r)), t.addMethod(e.expect, "schemaMatching", (n) => new ji(n)), e.expect.not = {
    stringContaining: (n) => new ki(n, !0),
    objectContaining: (n) => new Ci(n, !0),
    arrayContaining: (n) => new Ii(n, !0),
    stringMatching: (n) => new Pi(n, !0),
    closeTo: (n, r) => new Ni(n, r, !0),
    schemaMatching: (n) => new ji(n, !0)
  };
};
function Ri(e, t, n) {
  const r = e.flag(t, "negate") ? "not." : "", o = `${e.flag(t, "_name")}(${n ? "expected" : ""})`, s = e.flag(t, "promise");
  return `expect(actual)${s ? `.${s}` : ""}.${r}${o}`;
}
function Di(e, t, n, r) {
  const o = e;
  if (o && t instanceof Promise) {
    t = t.finally(() => {
      if (!o.promises)
        return;
      const i = o.promises.indexOf(t);
      i !== -1 && o.promises.splice(i, 1);
    }), o.promises || (o.promises = []), o.promises.push(t);
    let s = !1;
    return o.onFinished ?? (o.onFinished = []), o.onFinished.push(() => {
      if (!s) {
        var i;
        const u = (((i = globalThis.__vitest_worker__) === null || i === void 0 ? void 0 : i.onFilterStackTrace) || ((c) => c || ""))(r.stack);
        console.warn([
          `Promise returned by \`${n}\` was not awaited. `,
          "Vitest currently auto-awaits hanging assertions at the end of the test, but this will cause the test to fail in Vitest 3. ",
          `Please remember to await the assertion.
`,
          u
        ].join(""));
      }
    }), {
      then(i, a) {
        return s = !0, t.then(i, a);
      },
      catch(i) {
        return t.catch(i);
      },
      finally(i) {
        return t.finally(i);
      },
      [Symbol.toStringTag]: "Promise"
    };
  }
  return t;
}
function Fi(e, t) {
  var n;
  e.result || (e.result = { state: "fail" }), e.result.state = "fail", (n = e.result).errors || (n.errors = []), e.result.errors.push(Sa(t));
}
function gu(e, t, n) {
  return function(...r) {
    if (t !== "withTest" && e.flag(this, "_name", t), !e.flag(this, "soft"))
      return n.apply(this, r);
    const o = e.flag(this, "vitest-test");
    if (!o)
      throw new Error("expect.soft() can only be used inside a test");
    try {
      const s = n.apply(this, r);
      return s && typeof s == "object" && typeof s.then == "function" ? s.then(Yf, (i) => {
        Fi(o, i);
      }) : s;
    } catch (s) {
      Fi(o, s);
    }
  };
}
const Jp = (e, t) => {
  const { AssertionError: n } = e, r = hs();
  function o(c, l) {
    const f = (h) => {
      const p = gu(t, h, l);
      t.addMethod(e.Assertion.prototype, h, p), t.addMethod(globalThis[ln].matchers, h, p);
    };
    Array.isArray(c) ? c.forEach((h) => f(h)) : f(c);
  }
  [
    "throw",
    "throws",
    "Throw"
  ].forEach((c) => {
    t.overwriteMethod(e.Assertion.prototype, c, (l) => function(...f) {
      const h = t.flag(this, "promise"), p = t.flag(this, "object"), d = t.flag(this, "negate");
      if (h === "rejects")
        t.flag(this, "object", () => {
          throw p;
        });
      else if (h === "resolves" && typeof p != "function") {
        if (d)
          return;
        {
          const g = t.flag(this, "message") || "expected promise to throw an error, but it didn't", w = { showDiff: !1 };
          throw new n(g, w, t.flag(this, "ssfi"));
        }
      }
      l.apply(this, f);
    });
  }), o("withTest", function(c) {
    return t.flag(this, "vitest-test", c), this;
  }), o("toEqual", function(c) {
    const l = t.flag(this, "object"), f = U(l, c, [...r, Oe]);
    return this.assert(f, "expected #{this} to deeply equal #{exp}", "expected #{this} to not deeply equal #{exp}", c, l);
  }), o("toStrictEqual", function(c) {
    const l = t.flag(this, "object"), f = U(l, c, [
      ...r,
      Oe,
      Oi,
      uo,
      Ai
    ], !0);
    return this.assert(f, "expected #{this} to strictly equal #{exp}", "expected #{this} to not strictly equal #{exp}", c, l);
  }), o("toBe", function(c) {
    const l = this._obj, f = Object.is(l, c);
    let h = "";
    return f || (U(l, c, [
      ...r,
      Oe,
      Oi,
      uo,
      Ai
    ], !0) ? h = "toStrictEqual" : U(l, c, [...r, Oe]) && (h = "toEqual")), this.assert(f, zp(h), "expected #{this} not to be #{exp} // Object.is equality", c, l);
  }), o("toMatchObject", function(c) {
    const l = this._obj, f = U(l, c, [
      ...r,
      Oe,
      Rt
    ]), h = t.flag(this, "negate"), { subset: p, stripped: d } = Vp(l, c, r);
    if (f && h || !f && !h) {
      const g = t.getMessage(this, [
        f,
        "expected #{this} to match object #{exp}",
        "expected #{this} to not match object #{exp}",
        c,
        p,
        !1
      ]), w = d === 0 ? g : `${g}
(${d} matching ${d === 1 ? "property" : "properties"} omitted from actual)`;
      throw new n(w, {
        showDiff: !0,
        expected: c,
        actual: p
      });
    }
  }), o("toMatch", function(c) {
    const l = this._obj;
    if (typeof l != "string")
      throw new TypeError(`.toMatch() expects to receive a string, but got ${typeof l}`);
    return this.assert(typeof c == "string" ? l.includes(c) : l.match(c), "expected #{this} to match #{exp}", "expected #{this} not to match #{exp}", c, l);
  }), o("toContain", function(c) {
    const l = this._obj;
    if (typeof Node < "u" && l instanceof Node) {
      if (!(c instanceof Node))
        throw new TypeError(`toContain() expected a DOM node as the argument, but got ${typeof c}`);
      return this.assert(l.contains(c), "expected #{this} to contain element #{exp}", "expected #{this} not to contain element #{exp}", c, l);
    }
    if (typeof DOMTokenList < "u" && l instanceof DOMTokenList) {
      ve(c, "class name", ["string"]);
      const h = t.flag(this, "negate") ? l.value.replace(c, "").trim() : `${l.value} ${c}`;
      return this.assert(l.contains(c), `expected "${l.value}" to contain "${c}"`, `expected "${l.value}" not to contain "${c}"`, h, l.value);
    }
    return typeof l == "string" && typeof c == "string" ? this.assert(l.includes(c), "expected #{this} to contain #{exp}", "expected #{this} not to contain #{exp}", c, l) : (l != null && typeof l != "string" && t.flag(this, "object", Array.from(l)), this.contain(c));
  }), o("toContainEqual", function(c) {
    const l = t.flag(this, "object"), f = Array.from(l).findIndex((h) => U(h, c, r));
    this.assert(f !== -1, "expected #{this} to deep equally contain #{exp}", "expected #{this} to not deep equally contain #{exp}", c);
  }), o("toBeTruthy", function() {
    const c = t.flag(this, "object");
    this.assert(!!c, "expected #{this} to be truthy", "expected #{this} to not be truthy", !0, c);
  }), o("toBeFalsy", function() {
    const c = t.flag(this, "object");
    this.assert(!c, "expected #{this} to be falsy", "expected #{this} to not be falsy", !1, c);
  }), o("toBeGreaterThan", function(c) {
    const l = this._obj;
    return ve(l, "actual", ["number", "bigint"]), ve(c, "expected", ["number", "bigint"]), this.assert(l > c, `expected ${l} to be greater than ${c}`, `expected ${l} to be not greater than ${c}`, c, l, !1);
  }), o("toBeGreaterThanOrEqual", function(c) {
    const l = this._obj;
    return ve(l, "actual", ["number", "bigint"]), ve(c, "expected", ["number", "bigint"]), this.assert(l >= c, `expected ${l} to be greater than or equal to ${c}`, `expected ${l} to be not greater than or equal to ${c}`, c, l, !1);
  }), o("toBeLessThan", function(c) {
    const l = this._obj;
    return ve(l, "actual", ["number", "bigint"]), ve(c, "expected", ["number", "bigint"]), this.assert(l < c, `expected ${l} to be less than ${c}`, `expected ${l} to be not less than ${c}`, c, l, !1);
  }), o("toBeLessThanOrEqual", function(c) {
    const l = this._obj;
    return ve(l, "actual", ["number", "bigint"]), ve(c, "expected", ["number", "bigint"]), this.assert(l <= c, `expected ${l} to be less than or equal to ${c}`, `expected ${l} to be not less than or equal to ${c}`, c, l, !1);
  }), o("toBeNaN", function() {
    const c = t.flag(this, "object");
    this.assert(Number.isNaN(c), "expected #{this} to be NaN", "expected #{this} not to be NaN", Number.NaN, c);
  }), o("toBeUndefined", function() {
    const c = t.flag(this, "object");
    this.assert(c === void 0, "expected #{this} to be undefined", "expected #{this} not to be undefined", void 0, c);
  }), o("toBeNull", function() {
    const c = t.flag(this, "object");
    this.assert(c === null, "expected #{this} to be null", "expected #{this} not to be null", null, c);
  }), o("toBeNullable", function() {
    const c = t.flag(this, "object");
    this.assert(c == null, "expected #{this} to be nullish", "expected #{this} not to be nullish", null, c);
  }), o("toBeDefined", function() {
    const c = t.flag(this, "object");
    this.assert(typeof c < "u", "expected #{this} to be defined", "expected #{this} to be undefined", c);
  }), o("toBeTypeOf", function(c) {
    const l = typeof this._obj, f = c === l;
    return this.assert(f, "expected #{this} to be type of #{exp}", "expected #{this} not to be type of #{exp}", c, l);
  }), o("toBeInstanceOf", function(c) {
    return this.instanceOf(c);
  }), o("toHaveLength", function(c) {
    return this.have.length(c);
  }), o("toHaveProperty", function(...c) {
    Array.isArray(c[0]) && (c[0] = c[0].map(($) => String($).replace(/([.[\]])/g, "\\$1")).join("."));
    const l = this._obj, [f, h] = c, p = () => Object.hasOwn(l, f) ? {
      value: l[f],
      exists: !0
    } : t.getPathInfo(l, f), { value: d, exists: g } = p(), w = g && (c.length === 1 || U(h, d, r)), T = c.length === 1 ? "" : ` with value ${t.objDisplay(h)}`;
    return this.assert(w, `expected #{this} to have property "${f}"${T}`, `expected #{this} to not have property "${f}"${T}`, h, g ? d : void 0);
  }), o("toBeCloseTo", function(c, l = 2) {
    const f = this._obj;
    let h = !1, p = 0, d = 0;
    return c === Number.POSITIVE_INFINITY && f === Number.POSITIVE_INFINITY || c === Number.NEGATIVE_INFINITY && f === Number.NEGATIVE_INFINITY ? h = !0 : (p = 10 ** -l / 2, d = Math.abs(f - c), h = d < p), this.assert(h, `expected #{this} to be close to #{exp}, received difference is ${d}, but expected ${p}`, `expected #{this} to not be close to #{exp}, received difference is ${d}, but expected ${p}`, c, f, !1);
  });
  function s(c) {
    if (!lt(c._obj))
      throw new TypeError(`${t.inspect(c._obj)} is not a spy or a call to a spy!`);
  }
  function i(c) {
    return s(c), c._obj;
  }
  o(["toHaveBeenCalledTimes", "toBeCalledTimes"], function(c) {
    const l = i(this), f = l.getMockName(), h = l.mock.calls.length;
    return this.assert(h === c, `expected "${f}" to be called #{exp} times, but got ${h} times`, `expected "${f}" to not be called #{exp} times`, c, h, !1);
  }), o("toHaveBeenCalledOnce", function() {
    const c = i(this), l = c.getMockName(), f = c.mock.calls.length;
    return this.assert(f === 1, `expected "${l}" to be called once, but got ${f} times`, `expected "${l}" to not be called once`, 1, f, !1);
  }), o(["toHaveBeenCalled", "toBeCalled"], function() {
    const c = i(this), l = c.getMockName(), f = c.mock.calls.length, h = f > 0, p = t.flag(this, "negate");
    let d = t.getMessage(this, [
      h,
      `expected "${l}" to be called at least once`,
      `expected "${l}" to not be called at all, but actually been called ${f} times`,
      !0,
      h
    ]);
    if (h && p && (d = br(c, d)), h && p || !h && !p)
      throw new n(d);
  });
  function a(c, l) {
    return c.length === l.length && c.every((f, h) => U(f, l[h], [...r, Oe]));
  }
  o(["toHaveBeenCalledWith", "toBeCalledWith"], function(...c) {
    const l = i(this), f = l.getMockName(), h = l.mock.calls.some((g) => a(g, c)), p = t.flag(this, "negate"), d = t.getMessage(this, [
      h,
      `expected "${f}" to be called with arguments: #{exp}`,
      `expected "${f}" to not be called with arguments: #{exp}`,
      c
    ]);
    if (h && p || !h && !p)
      throw new n(br(l, d, c));
  }), o("toHaveBeenCalledExactlyOnceWith", function(...c) {
    const l = i(this), f = l.getMockName(), h = l.mock.calls.length, d = l.mock.calls.some((T) => a(T, c)) && h === 1, g = t.flag(this, "negate"), w = t.getMessage(this, [
      d,
      `expected "${f}" to be called once with arguments: #{exp}`,
      `expected "${f}" to not be called once with arguments: #{exp}`,
      c
    ]);
    if (d && g || !d && !g)
      throw new n(br(l, w, c));
  }), o(["toHaveBeenNthCalledWith", "nthCalledWith"], function(c, ...l) {
    const f = i(this), h = f.getMockName(), p = f.mock.calls[c - 1], d = f.mock.calls.length, g = c <= d;
    this.assert(p && a(p, l), `expected ${Zt(c)} "${h}" call to have been called with #{exp}${g ? "" : `, but called only ${d} times`}`, `expected ${Zt(c)} "${h}" call to not have been called with #{exp}`, l, p, g);
  }), o(["toHaveBeenLastCalledWith", "lastCalledWith"], function(...c) {
    const l = i(this), f = l.getMockName(), h = l.mock.calls.at(-1);
    this.assert(h && a(h, c), `expected last "${f}" call to have been called with #{exp}`, `expected last "${f}" call to not have been called with #{exp}`, c, h);
  });
  function u(c, l, f) {
    const h = c.mock.invocationCallOrder, p = l.mock.invocationCallOrder;
    return h.length === 0 ? !f : p.length === 0 ? !1 : h[0] < p[0];
  }
  o(["toHaveBeenCalledBefore"], function(c, l = !0) {
    const f = i(this);
    if (!lt(c))
      throw new TypeError(`${t.inspect(c)} is not a spy or a call to a spy`);
    this.assert(u(f, c, l), `expected "${f.getMockName()}" to have been called before "${c.getMockName()}"`, `expected "${f.getMockName()}" to not have been called before "${c.getMockName()}"`, c, f);
  }), o(["toHaveBeenCalledAfter"], function(c, l = !0) {
    const f = i(this);
    if (!lt(c))
      throw new TypeError(`${t.inspect(c)} is not a spy or a call to a spy`);
    this.assert(u(c, f, l), `expected "${f.getMockName()}" to have been called after "${c.getMockName()}"`, `expected "${f.getMockName()}" to not have been called after "${c.getMockName()}"`, c, f);
  }), o(["toThrow", "toThrowError"], function(c) {
    if (typeof c == "string" || typeof c > "u" || c instanceof RegExp)
      return this.throws(c === "" ? /^$/ : c);
    const l = this._obj, f = t.flag(this, "promise"), h = t.flag(this, "negate");
    let p = null;
    if (f === "rejects")
      p = l;
    else if (f === "resolves" && typeof l != "function") {
      if (h)
        return;
      {
        const d = t.flag(this, "message") || "expected promise to throw an error, but it didn't", g = { showDiff: !1 };
        throw new n(d, g, t.flag(this, "ssfi"));
      }
    } else {
      let d = !1;
      try {
        l();
      } catch (g) {
        d = !0, p = g;
      }
      if (!d && !h) {
        const g = t.flag(this, "message") || "expected function to throw an error, but it didn't", w = { showDiff: !1 };
        throw new n(g, w, t.flag(this, "ssfi"));
      }
    }
    if (typeof c == "function") {
      const d = c.name || c.prototype.constructor.name;
      return this.assert(p && p instanceof c, `expected error to be instance of ${d}`, `expected error not to be instance of ${d}`, c, p);
    }
    if (c instanceof Error) {
      const d = U(p, c, [...r, Oe]);
      return this.assert(d, "expected a thrown error to be #{exp}", "expected a thrown error not to be #{exp}", c, p);
    }
    if (typeof c == "object" && "asymmetricMatch" in c && typeof c.asymmetricMatch == "function") {
      const d = c;
      return this.assert(p && d.asymmetricMatch(p), "expected error to match asymmetric matcher", "expected error not to match asymmetric matcher", d, p);
    }
    throw new Error(`"toThrow" expects string, RegExp, function, Error instance or asymmetric matcher, got "${typeof c}"`);
  }), [{
    name: "toHaveResolved",
    condition: (c) => c.mock.settledResults.length > 0 && c.mock.settledResults.some(({ type: l }) => l === "fulfilled"),
    action: "resolved"
  }, {
    name: ["toHaveReturned", "toReturn"],
    condition: (c) => c.mock.calls.length > 0 && c.mock.results.some(({ type: l }) => l !== "throw"),
    action: "called"
  }].forEach(({ name: c, condition: l, action: f }) => {
    o(c, function() {
      const h = i(this), p = h.getMockName(), d = l(h);
      this.assert(d, `expected "${p}" to be successfully ${f} at least once`, `expected "${p}" to not be successfully ${f}`, d, !d, !1);
    });
  }), [{
    name: "toHaveResolvedTimes",
    condition: (c, l) => c.mock.settledResults.reduce((f, { type: h }) => h === "fulfilled" ? ++f : f, 0) === l,
    action: "resolved"
  }, {
    name: ["toHaveReturnedTimes", "toReturnTimes"],
    condition: (c, l) => c.mock.results.reduce((f, { type: h }) => h === "throw" ? f : ++f, 0) === l,
    action: "called"
  }].forEach(({ name: c, condition: l, action: f }) => {
    o(c, function(h) {
      const p = i(this), d = p.getMockName(), g = l(p, h);
      this.assert(g, `expected "${d}" to be successfully ${f} ${h} times`, `expected "${d}" to not be successfully ${f} ${h} times`, `expected resolved times: ${h}`, `received resolved times: ${g}`, !1);
    });
  }), [{
    name: "toHaveResolvedWith",
    condition: (c, l) => c.mock.settledResults.some(({ type: f, value: h }) => f === "fulfilled" && U(l, h)),
    action: "resolve"
  }, {
    name: ["toHaveReturnedWith", "toReturnWith"],
    condition: (c, l) => c.mock.results.some(({ type: f, value: h }) => f === "return" && U(l, h)),
    action: "return"
  }].forEach(({ name: c, condition: l, action: f }) => {
    o(c, function(h) {
      const p = i(this), d = l(p, h), g = t.flag(this, "negate");
      if (d && g || !d && !g) {
        const w = p.getMockName(), T = t.getMessage(this, [
          d,
          `expected "${w}" to ${f} with: #{exp} at least once`,
          `expected "${w}" to not ${f} with: #{exp}`,
          h
        ]), $ = f === "return" ? p.mock.results : p.mock.settledResults;
        throw new n(Xp(p, $, T, h));
      }
    });
  }), [{
    name: "toHaveLastResolvedWith",
    condition: (c, l) => {
      const f = c.mock.settledResults.at(-1);
      return !!(f && f.type === "fulfilled" && U(f.value, l));
    },
    action: "resolve"
  }, {
    name: ["toHaveLastReturnedWith", "lastReturnedWith"],
    condition: (c, l) => {
      const f = c.mock.results.at(-1);
      return !!(f && f.type === "return" && U(f.value, l));
    },
    action: "return"
  }].forEach(({ name: c, condition: l, action: f }) => {
    o(c, function(h) {
      const p = i(this), g = (f === "return" ? p.mock.results : p.mock.settledResults).at(-1), w = p.getMockName();
      this.assert(l(p, h), `expected last "${w}" call to ${f} #{exp}`, `expected last "${w}" call to not ${f} #{exp}`, h, g?.value);
    });
  }), [{
    name: "toHaveNthResolvedWith",
    condition: (c, l, f) => {
      const h = c.mock.settledResults[l - 1];
      return h && h.type === "fulfilled" && U(h.value, f);
    },
    action: "resolve"
  }, {
    name: ["toHaveNthReturnedWith", "nthReturnedWith"],
    condition: (c, l, f) => {
      const h = c.mock.results[l - 1];
      return h && h.type === "return" && U(h.value, f);
    },
    action: "return"
  }].forEach(({ name: c, condition: l, action: f }) => {
    o(c, function(h, p) {
      const d = i(this), g = d.getMockName(), T = (f === "return" ? d.mock.results : d.mock.settledResults)[h - 1], $ = `${Zt(h)} call`;
      this.assert(l(d, h, p), `expected ${$} "${g}" call to ${f} #{exp}`, `expected ${$} "${g}" call to not ${f} #{exp}`, p, T?.value);
    });
  }), o("withContext", function(c) {
    for (const l in c)
      t.flag(this, l, c[l]);
    return this;
  }), t.addProperty(e.Assertion.prototype, "resolves", function() {
    const l = new Error("resolves");
    t.flag(this, "promise", "resolves"), t.flag(this, "error", l);
    const f = t.flag(this, "vitest-test"), h = t.flag(this, "object");
    if (t.flag(this, "poll"))
      throw new SyntaxError("expect.poll() is not supported in combination with .resolves");
    if (typeof h?.then != "function")
      throw new TypeError(`You must provide a Promise to expect() when using .resolves, not '${typeof h}'.`);
    const p = new Proxy(this, { get: (d, g, w) => {
      const T = Reflect.get(d, g, w);
      return typeof T != "function" ? T instanceof e.Assertion ? p : T : (...$) => {
        t.flag(this, "_name", g);
        const k = h.then((_) => (t.flag(this, "object", _), T.call(this, ...$)), (_) => {
          const O = new n(`promise rejected "${t.inspect(_)}" instead of resolving`, { showDiff: !1 });
          throw O.cause = _, O.stack = l.stack.replace(l.message, O.message), O;
        });
        return Di(f, k, Ri(t, this, !!$.length), l);
      };
    } });
    return p;
  }), t.addProperty(e.Assertion.prototype, "rejects", function() {
    const l = new Error("rejects");
    t.flag(this, "promise", "rejects"), t.flag(this, "error", l);
    const f = t.flag(this, "vitest-test"), h = t.flag(this, "object"), p = typeof h == "function" ? h() : h;
    if (t.flag(this, "poll"))
      throw new SyntaxError("expect.poll() is not supported in combination with .rejects");
    if (typeof p?.then != "function")
      throw new TypeError(`You must provide a Promise to expect() when using .rejects, not '${typeof p}'.`);
    const d = new Proxy(this, { get: (g, w, T) => {
      const $ = Reflect.get(g, w, T);
      return typeof $ != "function" ? $ instanceof e.Assertion ? d : $ : (...k) => {
        t.flag(this, "_name", w);
        const _ = p.then((O) => {
          const I = new n(`promise resolved "${t.inspect(O)}" instead of rejecting`, {
            showDiff: !0,
            expected: new Error("rejected promise"),
            actual: O
          });
          throw I.stack = l.stack.replace(l.message, I.message), I;
        }, (O) => (t.flag(this, "object", O), $.call(this, ...k)));
        return Di(f, _, Ri(t, this, !!k.length), l);
      };
    } });
    return d;
  });
};
function Zt(e) {
  const t = e % 10, n = e % 100;
  return t === 1 && n !== 11 ? `${e}st` : t === 2 && n !== 12 ? `${e}nd` : t === 3 && n !== 13 ? `${e}rd` : `${e}th`;
}
function br(e, t, n) {
  return e.mock.calls.length && (t += ce.gray(`

Received: 

${e.mock.calls.map((r, o) => {
    let s = ce.bold(`  ${Zt(o + 1)} ${e.getMockName()} call:

`);
    return n ? s += Nt(n, r, { omitAnnotationLines: !0 }) : s += Ae(r).split(`
`).map((i) => `    ${i}`).join(`
`), s += `
`, s;
  }).join(`
`)}`)), t += ce.gray(`

Number of calls: ${ce.bold(e.mock.calls.length)}
`), t;
}
function Xp(e, t, n, r) {
  return t.length && (n += ce.gray(`

Received: 

${t.map((o, s) => {
    let i = ce.bold(`  ${Zt(s + 1)} ${e.getMockName()} call return:

`);
    return r ? i += Nt(r, o.value, { omitAnnotationLines: !0 }) : i += Ae(o).split(`
`).map((a) => `    ${a}`).join(`
`), i += `
`, i;
  }).join(`
`)}`)), n += ce.gray(`

Number of calls: ${ce.bold(e.mock.calls.length)}
`), n;
}
function Hp(e, t) {
  const n = e._obj, r = he.flag(e, "negate"), o = he.flag(e, "promise") || "", s = he.flag(e, "message"), i = {
    ...fu(),
    diff: Nt,
    stringify: Ae,
    iterableEquality: Oe,
    subsetEquality: Rt
  };
  return {
    state: {
      ...Ht(t),
      customTesters: hs(),
      isNot: r,
      utils: i,
      promise: o,
      equals: U,
      suppressedErrors: [],
      soft: he.flag(e, "soft"),
      poll: he.flag(e, "poll")
    },
    isNot: r,
    obj: n,
    customMessage: s
  };
}
class Li extends Error {
  constructor(t, n, r) {
    super(t), this.actual = n, this.expected = r;
  }
}
function Zp(e, t, n) {
  return (r, o) => {
    Object.entries(n).forEach(([s, i]) => {
      function a(...f) {
        const { state: h, isNot: p, obj: d, customMessage: g } = Hp(this, t), w = i.call(h, d, ...f);
        if (w && typeof w == "object" && typeof w.then == "function")
          return w.then(({ pass: I, message: M, actual: L, expected: ee }) => {
            if (I && p || !I && !p) {
              const j = g ?? M();
              throw new Li(j, L, ee);
            }
          });
        const { pass: T, message: $, actual: k, expected: _ } = w;
        if (T && p || !T && !p) {
          const O = g ?? $();
          throw new Li(O, k, _);
        }
      }
      const u = gu(o, s, a);
      o.addMethod(globalThis[ln].matchers, s, u), o.addMethod(e.Assertion.prototype, s, u);
      class c extends Ge {
        constructor(h = !1, ...p) {
          super(p, h);
        }
        asymmetricMatch(h) {
          const { pass: p } = i.call(this.getMatcherContext(t), h, ...this.sample);
          return this.inverse ? !p : p;
        }
        toString() {
          return `${this.inverse ? "not." : ""}${s}`;
        }
        getExpectedType() {
          return "any";
        }
        toAsymmetricMatcher() {
          return `${this.toString()}<${this.sample.map((h) => Ae(h)).join(", ")}>`;
        }
      }
      const l = (...f) => new c(!1, ...f);
      Object.defineProperty(t, s, {
        configurable: !0,
        enumerable: !0,
        value: l,
        writable: !0
      }), Object.defineProperty(t.not, s, {
        configurable: !0,
        enumerable: !0,
        value: (...f) => new c(!0, ...f),
        writable: !0
      }), Object.defineProperty(globalThis[ls], s, {
        configurable: !0,
        enumerable: !0,
        value: l,
        writable: !0
      });
    });
  };
}
const Qp = (e, t) => {
  t.addMethod(e.expect, "extend", (n, r) => {
    wt(Zp(e, n, r));
  });
}, qi = Symbol("vitest:SAFE_TIMERS");
function Dt() {
  const { setTimeout: e, setInterval: t, clearInterval: n, clearTimeout: r, setImmediate: o, clearImmediate: s, queueMicrotask: i } = globalThis[qi] || globalThis, { nextTick: a } = globalThis[qi] || globalThis.process || {};
  return {
    nextTick: a,
    setTimeout: e,
    setInterval: t,
    clearInterval: n,
    clearTimeout: r,
    setImmediate: o,
    clearImmediate: s,
    queueMicrotask: i
  };
}
const ed = /^[A-Za-z]:\//;
function td(e = "") {
  return e && e.replace(/\\/g, "/").replace(ed, (t) => t.toUpperCase());
}
const nd = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function rd() {
  return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
}
const od = function(...e) {
  e = e.map((r) => td(r));
  let t = "", n = !1;
  for (let r = e.length - 1; r >= -1 && !n; r--) {
    const o = r >= 0 ? e[r] : rd();
    !o || o.length === 0 || (t = `${o}/${t}`, n = Bi(o));
  }
  return t = sd(t, !n), n && !Bi(t) ? `/${t}` : t.length > 0 ? t : ".";
};
function sd(e, t) {
  let n = "", r = 0, o = -1, s = 0, i = null;
  for (let a = 0; a <= e.length; ++a) {
    if (a < e.length)
      i = e[a];
    else {
      if (i === "/")
        break;
      i = "/";
    }
    if (i === "/") {
      if (!(o === a - 1 || s === 1)) if (s === 2) {
        if (n.length < 2 || r !== 2 || n[n.length - 1] !== "." || n[n.length - 2] !== ".") {
          if (n.length > 2) {
            const u = n.lastIndexOf("/");
            u === -1 ? (n = "", r = 0) : (n = n.slice(0, u), r = n.length - 1 - n.lastIndexOf("/")), o = a, s = 0;
            continue;
          } else if (n.length > 0) {
            n = "", r = 0, o = a, s = 0;
            continue;
          }
        }
        t && (n += n.length > 0 ? "/.." : "..", r = 2);
      } else
        n.length > 0 ? n += `/${e.slice(o + 1, a)}` : n = e.slice(o + 1, a), r = a - o - 1;
      o = a, s = 0;
    } else i === "." && s !== -1 ? ++s : s = -1;
  }
  return n;
}
const Bi = function(e) {
  return nd.test(e);
};
var zi = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", id = new Uint8Array(64), cd = new Uint8Array(128);
for (let e = 0; e < zi.length; e++) {
  const t = zi.charCodeAt(e);
  id[e] = t, cd[t] = e;
}
const yu = /^\s*at .*(?:\S:\d+|\(native\))/m, ad = /^(?:eval@)?(?:\[native code\])?$/;
function bu(e) {
  if (!e.includes(":"))
    return [e];
  const n = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(e.replace(/^\(|\)$/g, ""));
  if (!n)
    return [e];
  let r = n[1];
  if (r.startsWith("async ") && (r = r.slice(6)), r.startsWith("http:") || r.startsWith("https:")) {
    const o = new URL(r);
    o.searchParams.delete("import"), o.searchParams.delete("browserv"), r = o.pathname + o.hash + o.search;
  }
  if (r.startsWith("/@fs/")) {
    const o = /^\/@fs\/[a-zA-Z]:\//.test(r);
    r = r.slice(o ? 5 : 4);
  }
  return [
    r,
    n[2] || void 0,
    n[3] || void 0
  ];
}
function ud(e) {
  let t = e.trim();
  if (ad.test(t) || (t.includes(" > eval") && (t = t.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1")), !t.includes("@")))
    return null;
  let n = -1, r = "", o;
  for (let u = 0; u < t.length; u++)
    if (t[u] === "@") {
      const c = t.slice(u + 1);
      if (c.includes(":") && c.length >= 3) {
        n = u, r = c, o = u > 0 ? t.slice(0, u) : void 0;
        break;
      }
    }
  if (n === -1 || !r.includes(":") || r.length < 3)
    return null;
  const [s, i, a] = bu(r);
  return !s || !i || !a ? null : {
    file: s,
    method: o || "",
    line: Number.parseInt(i),
    column: Number.parseInt(a)
  };
}
function wu(e) {
  const t = e.trim();
  return yu.test(t) ? ld(t) : ud(t);
}
function ld(e) {
  let t = e.trim();
  if (!yu.test(t))
    return null;
  t.includes("(eval ") && (t = t.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, ""));
  let n = t.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
  const r = n.match(/ (\(.+\)$)/);
  n = r ? n.replace(r[0], "") : n;
  const [o, s, i] = bu(r ? r[1] : n);
  let a = r && n || "", u = o && ["eval", "<anonymous>"].includes(o) ? void 0 : o;
  return !u || !s || !i ? null : (a.startsWith("async ") && (a = a.slice(6)), u.startsWith("file://") && (u = u.slice(7)), u = u.startsWith("node:") || u.startsWith("internal:") ? u : od(u), a && (a = a.replace(/__vite_ssr_import_\d+__\./g, "").replace(/(Object\.)?__vite_ssr_export_default__\s?/g, "")), {
    method: a,
    file: u,
    line: Number.parseInt(s),
    column: Number.parseInt(i)
  });
}
const fd = /^[A-Za-z]:\//;
function hd(e = "") {
  return e && e.replace(/\\/g, "/").replace(fd, (t) => t.toUpperCase());
}
const pd = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function dd() {
  return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
}
const Tu = function(...e) {
  e = e.map((r) => hd(r));
  let t = "", n = !1;
  for (let r = e.length - 1; r >= -1 && !n; r--) {
    const o = r >= 0 ? e[r] : dd();
    !o || o.length === 0 || (t = `${o}/${t}`, n = Wi(o));
  }
  return t = md(t, !n), n && !Wi(t) ? `/${t}` : t.length > 0 ? t : ".";
};
function md(e, t) {
  let n = "", r = 0, o = -1, s = 0, i = null;
  for (let a = 0; a <= e.length; ++a) {
    if (a < e.length)
      i = e[a];
    else {
      if (i === "/")
        break;
      i = "/";
    }
    if (i === "/") {
      if (!(o === a - 1 || s === 1)) if (s === 2) {
        if (n.length < 2 || r !== 2 || n[n.length - 1] !== "." || n[n.length - 2] !== ".") {
          if (n.length > 2) {
            const u = n.lastIndexOf("/");
            u === -1 ? (n = "", r = 0) : (n = n.slice(0, u), r = n.length - 1 - n.lastIndexOf("/")), o = a, s = 0;
            continue;
          } else if (n.length > 0) {
            n = "", r = 0, o = a, s = 0;
            continue;
          }
        }
        t && (n += n.length > 0 ? "/.." : "..", r = 2);
      } else
        n.length > 0 ? n += `/${e.slice(o + 1, a)}` : n = e.slice(o + 1, a), r = a - o - 1;
      o = a, s = 0;
    } else i === "." && s !== -1 ? ++s : s = -1;
  }
  return n;
}
const Wi = function(e) {
  return pd.test(e);
};
function Su(e, t) {
  function n(o) {
    const s = function(...i) {
      return t.apply(o, i);
    };
    Object.assign(s, t), s.withContext = () => s.bind(o), s.setContext = (i, a) => {
      o[i] = a;
    }, s.mergeContext = (i) => {
      Object.assign(o, i);
    };
    for (const i of e)
      Object.defineProperty(s, i, { get() {
        return n({
          ...o,
          [i]: !0
        });
      } });
    return s;
  }
  const r = n({});
  return r.fn = t, r;
}
function Eu(e, t) {
  const n = t.split(`
`).slice(1);
  for (const r of n) {
    const o = wu(r);
    if (o && o.file === e)
      return o;
  }
}
function gd(e) {
  const t = [e.name];
  let n = e;
  for (; n?.suite; )
    n = n.suite, n?.name && t.unshift(n.name);
  return n !== e.file && t.unshift(e.file.name), t;
}
class yd extends Error {
  code = "VITEST_PENDING";
  taskId;
  constructor(t, n, r) {
    super(t), this.message = t, this.note = r, this.taskId = n.id;
  }
}
const bd = /* @__PURE__ */ new WeakMap(), vu = /* @__PURE__ */ new WeakMap(), $u = /* @__PURE__ */ new WeakMap();
function wd(e, t) {
  bd.set(e, t);
}
function Td(e, t) {
  vu.set(e, t);
}
function Sd(e) {
  return vu.get(e);
}
function Ed(e, t) {
  $u.set(e, t);
}
function vd(e) {
  return $u.get(e);
}
function $d(e, t) {
  const n = t.reduce((s, i) => (s[i.prop] = i, s), {}), r = {};
  e.forEach((s) => {
    const i = n[s.prop] || { ...s };
    r[i.prop] = i;
  });
  for (const s in r) {
    var o;
    const i = r[s];
    i.deps = (o = i.deps) === null || o === void 0 ? void 0 : o.map((a) => r[a.prop]);
  }
  return Object.values(r);
}
function xu(e, t, n) {
  const r = [
    "auto",
    "injected",
    "scope"
  ], o = Object.entries(e).map(([s, i]) => {
    const a = { value: i };
    if (Array.isArray(i) && i.length >= 2 && xt(i[1]) && Object.keys(i[1]).some((c) => r.includes(c))) {
      var u;
      Object.assign(a, i[1]);
      const c = i[0];
      a.value = a.injected ? ((u = n.injectValue) === null || u === void 0 ? void 0 : u.call(n, s)) ?? c : c;
    }
    return a.scope = a.scope || "test", a.scope === "worker" && !n.getWorkerContext && (a.scope = "file"), a.prop = s, a.isFn = typeof a.value == "function", a;
  });
  return Array.isArray(t.fixtures) ? t.fixtures = t.fixtures.concat(o) : t.fixtures = o, o.forEach((s) => {
    if (s.isFn) {
      const a = Mu(s.value);
      if (a.length && (s.deps = t.fixtures.filter(({ prop: u }) => u !== s.prop && a.includes(u))), s.scope !== "test") {
        var i;
        (i = s.deps) === null || i === void 0 || i.forEach((u) => {
          if (u.isFn && !(s.scope === "worker" && u.scope === "worker") && !(s.scope === "file" && u.scope !== "test"))
            throw new SyntaxError(`cannot use the ${u.scope} fixture "${u.prop}" inside the ${s.scope} fixture "${s.prop}"`);
        });
      }
    }
  }), t;
}
const wr = /* @__PURE__ */ new Map(), _t = /* @__PURE__ */ new Map();
function ds(e, t, n) {
  return (r) => {
    const o = r || n;
    if (!o)
      return t({});
    const s = Sd(o);
    if (!s?.length)
      return t(o);
    const i = Mu(t), a = s.some(({ auto: p }) => p);
    if (!i.length && !a)
      return t(o);
    wr.get(o) || wr.set(o, /* @__PURE__ */ new Map());
    const u = wr.get(o);
    _t.has(o) || _t.set(o, []);
    const c = _t.get(o), l = s.filter(({ prop: p, auto: d }) => d || i.includes(p)), f = _u(l);
    if (!f.length)
      return t(o);
    async function h() {
      for (const p of f) {
        if (u.has(p))
          continue;
        const d = await xd(e, p, o, c);
        o[p.prop] = d, u.set(p, d), p.scope === "test" && c.unshift(() => {
          u.delete(p);
        });
      }
    }
    return h().then(() => t(o));
  };
}
const gn = /* @__PURE__ */ new WeakMap();
function xd(e, t, n, r) {
  var o;
  const s = zd(n.task.file), i = (o = e.getWorkerContext) === null || o === void 0 ? void 0 : o.call(e);
  if (!t.isFn) {
    var a;
    if (s[a = t.prop] ?? (s[a] = t.value), i) {
      var u;
      i[u = t.prop] ?? (i[u] = t.value);
    }
    return t.value;
  }
  if (t.scope === "test")
    return Vi(t.value, n, r);
  if (gn.has(t))
    return gn.get(t);
  let c;
  if (t.scope === "worker") {
    if (!i)
      throw new TypeError("[@vitest/runner] The worker context is not available in the current test runner. Please, provide the `getWorkerContext` method when initiating the runner.");
    c = i;
  } else
    c = s;
  if (t.prop in c)
    return c[t.prop];
  _t.has(c) || _t.set(c, []);
  const l = _t.get(c), f = Vi(t.value, c, l).then((h) => (c[t.prop] = h, gn.delete(t), h));
  return gn.set(t, f), f;
}
async function Vi(e, t, n) {
  const r = Xs();
  let o = !1;
  const s = e(t, async (i) => {
    o = !0, r.resolve(i);
    const a = Xs();
    n.push(async () => {
      a.resolve(), await s;
    }), await a;
  }).catch((i) => {
    if (!o) {
      r.reject(i);
      return;
    }
    throw i;
  });
  return r;
}
function _u(e, t = /* @__PURE__ */ new Set(), n = []) {
  return e.forEach((r) => {
    if (!n.includes(r)) {
      if (!r.isFn || !r.deps) {
        n.push(r);
        return;
      }
      if (t.has(r))
        throw new Error(`Circular fixture dependency detected: ${r.prop} <- ${[...t].reverse().map((o) => o.prop).join(" <- ")}`);
      t.add(r), _u(r.deps, t, n), n.push(r), t.clear();
    }
  }), n;
}
function Mu(e) {
  let t = _d(e.toString());
  /__async\((?:this|null), (?:null|arguments|\[[_0-9, ]*\]), function\*/.test(t) && (t = t.split(/__async\((?:this|null),/)[1]);
  const n = t.match(/[^(]*\(([^)]*)/);
  if (!n)
    return [];
  const r = Ui(n[1]);
  if (!r.length)
    return [];
  let o = r[0];
  if ("__VITEST_FIXTURE_INDEX__" in e && (o = r[e.__VITEST_FIXTURE_INDEX__], !o))
    return [];
  if (!(o[0] === "{" && o.endsWith("}")))
    throw new Error(`The first argument inside a fixture must use object destructuring pattern, e.g. ({ test } => {}). Instead, received "${o}".`);
  const s = o.slice(1, -1).replace(/\s/g, ""), i = Ui(s).map((u) => u.replace(/:.*|=.*/g, "")), a = i.at(-1);
  if (a && a.startsWith("..."))
    throw new Error(`Rest parameters are not supported in fixtures, received "${a}".`);
  return i;
}
function _d(e) {
  const t = [];
  let n = "none";
  for (let r = 0; r < e.length; ++r)
    n === "singleline" ? e[r] === `
` && (n = "none") : n === "multiline" ? e[r - 1] === "*" && e[r] === "/" && (n = "none") : n === "none" && (e[r] === "/" && e[r + 1] === "/" ? n = "singleline" : e[r] === "/" && e[r + 1] === "*" ? (n = "multiline", r += 2) : t.push(e[r]));
  return t.join("");
}
function Ui(e) {
  const t = [], n = [];
  let r = 0;
  for (let s = 0; s < e.length; s++)
    if (e[s] === "{" || e[s] === "[")
      n.push(e[s] === "{" ? "}" : "]");
    else if (e[s] === n.at(-1))
      n.pop();
    else if (!n.length && e[s] === ",") {
      const i = e.substring(r, s).trim();
      i && t.push(i), r = s + 1;
    }
  const o = e.substring(r).trim();
  return o && t.push(o), t;
}
const zt = Cd();
ms(function(e, t, n) {
  gt().test.fn.call(this, ot(e), t, n);
});
let Ue, Ou, Md;
function Au(e, t) {
  if (!e)
    throw new Error(`Vitest failed to find ${t}. This is a bug in Vitest. Please, open an issue with reproduction.`);
}
function er() {
  return Au(Ue, "the runner"), Ue;
}
function gt() {
  const e = st.currentSuite || Ou;
  return Au(e, "the current suite"), e;
}
function Od() {
  return {
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: []
  };
}
function Mt(e, t) {
  if (t != null && typeof t == "object")
    throw new TypeError('Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.');
  let n = {}, r;
  if (typeof t == "number" ? n = { timeout: t } : typeof e == "object" && (n = e), typeof e == "function") {
    if (typeof t == "function")
      throw new TypeError("Cannot use two functions as arguments. Please use the second argument for options.");
    r = e;
  } else typeof t == "function" && (r = t);
  return {
    options: n,
    handler: r
  };
}
function Ad(e, t = () => {
}, n, r, o, s) {
  const i = [];
  let a;
  p();
  const u = function(w = "", T = {}) {
    var $;
    const k = T?.timeout ?? Ue.config.testTimeout, _ = {
      id: "",
      name: w,
      suite: ($ = st.currentSuite) === null || $ === void 0 ? void 0 : $.suite,
      each: T.each,
      fails: T.fails,
      context: void 0,
      type: "test",
      file: void 0,
      timeout: k,
      retry: T.retry ?? Ue.config.retry,
      repeats: T.repeats,
      mode: T.only ? "only" : T.skip ? "skip" : T.todo ? "todo" : "run",
      meta: T.meta ?? /* @__PURE__ */ Object.create(null),
      annotations: []
    }, O = T.handler;
    _.mode === "run" && !O && (_.mode = "todo"), (T.concurrent || !T.sequential && Ue.config.sequence.concurrent) && (_.concurrent = !0), _.shuffle = o?.shuffle;
    const I = Ld(_, Ue);
    Object.defineProperty(_, "context", {
      value: I,
      enumerable: !1
    }), Td(I, T.fixtures);
    const M = Error.stackTraceLimit;
    Error.stackTraceLimit = 15;
    const L = new Error("STACK_TRACE_ERROR");
    if (Error.stackTraceLimit = M, O && wd(_, yt(kd(ds(Ue, O, I), _), k, !1, L, (ee, j) => gs([I], j))), Ue.config.includeTaskLocation) {
      const ee = L.stack, j = Eu(Md, ee);
      j && (_.location = {
        line: j.line,
        column: j.column
      });
    }
    return i.push(_), _;
  }, c = ms(function(w, T, $) {
    let { options: k, handler: _ } = Mt(T, $);
    typeof o == "object" && (k = Object.assign({}, o, k)), k.concurrent = this.concurrent || !this.sequential && k?.concurrent, k.sequential = this.sequential || !this.concurrent && k?.sequential;
    const O = u(ot(w), {
      ...this,
      ...k,
      handler: _
    });
    O.type = "test";
  });
  let l = s;
  const f = {
    type: "collector",
    name: e,
    mode: n,
    suite: a,
    options: o,
    test: c,
    tasks: i,
    collect: g,
    task: u,
    clear: d,
    on: h,
    fixtures() {
      return l;
    },
    scoped(w) {
      const T = xu(w, { fixtures: l }, Ue);
      T.fixtures && (l = T.fixtures);
    }
  };
  function h(w, ...T) {
    vd(a)[w].push(...T);
  }
  function p(w) {
    var T;
    typeof o == "number" && (o = { timeout: o }), a = {
      id: "",
      type: "suite",
      name: e,
      suite: (T = st.currentSuite) === null || T === void 0 ? void 0 : T.suite,
      mode: n,
      each: r,
      file: void 0,
      shuffle: o?.shuffle,
      tasks: [],
      meta: /* @__PURE__ */ Object.create(null),
      concurrent: o?.concurrent
    }, Ed(a, Od());
  }
  function d() {
    i.length = 0, p();
  }
  async function g(w) {
    if (!w)
      throw new TypeError("File is required to collect tasks.");
    t && await Dd(f, () => t(c));
    const T = [];
    for (const $ of i)
      T.push($.type === "collector" ? await $.collect(w) : $);
    return a.file = w, a.tasks = T, T.forEach(($) => {
      $.file = w;
    }), a;
  }
  return Rd(f), f;
}
function kd(e, t) {
  return (async (...n) => {
    const r = await e(...n);
    if (t.promises) {
      const s = (await Promise.allSettled(t.promises)).map((i) => i.status === "rejected" ? i.reason : void 0).filter(Boolean);
      if (s.length)
        throw s;
    }
    return r;
  });
}
function Cd() {
  function e(t, n, r) {
    var o;
    let s = this.only ? "only" : this.skip ? "skip" : this.todo ? "todo" : "run";
    const i = st.currentSuite || Ou;
    let { options: a, handler: u } = Mt(n, r);
    s === "run" && !u && (s = "todo");
    const c = a.concurrent || this.concurrent || a.sequential === !1, l = a.sequential || this.sequential || a.concurrent === !1;
    a = {
      ...i?.options,
      ...a,
      shuffle: this.shuffle ?? a.shuffle ?? (i == null || (o = i.options) === null || o === void 0 ? void 0 : o.shuffle) ?? void 0
    };
    const f = c || a.concurrent && !l, h = l || a.sequential && !c;
    return a.concurrent = f && !h, a.sequential = h && !f, Ad(ot(t), u, s, this.each, a, i?.fixtures());
  }
  return e.each = function(t, ...n) {
    const r = this.withContext();
    return this.setContext("each", !0), Array.isArray(t) && n.length && (t = Pn(t, n)), (o, s, i) => {
      const a = ot(o), u = t.every(Array.isArray), { options: c, handler: l } = Mt(s, i), f = typeof s == "function";
      t.forEach((h, p) => {
        const d = Array.isArray(h) ? h : [h];
        f ? u ? r(Ke(a, d, p), l ? () => l(...d) : void 0, c.timeout) : r(Ke(a, d, p), l ? () => l(h) : void 0, c.timeout) : u ? r(Ke(a, d, p), c, l ? () => l(...d) : void 0) : r(Ke(a, d, p), c, l ? () => l(h) : void 0);
      }), this.setContext("each", void 0);
    };
  }, e.for = function(t, ...n) {
    return Array.isArray(t) && n.length && (t = Pn(t, n)), (r, o, s) => {
      const i = ot(r), { options: a, handler: u } = Mt(o, s);
      t.forEach((c, l) => {
        zt(Ke(i, ta(c), l), a, u ? () => u(c) : void 0);
      });
    };
  }, e.skipIf = (t) => t ? zt.skip : zt, e.runIf = (t) => t ? zt : zt.skip, Su([
    "concurrent",
    "sequential",
    "shuffle",
    "skip",
    "only",
    "todo"
  ], e);
}
function Id(e, t) {
  const n = e;
  n.each = function(o, ...s) {
    const i = this.withContext();
    return this.setContext("each", !0), Array.isArray(o) && s.length && (o = Pn(o, s)), (a, u, c) => {
      const l = ot(a), f = o.every(Array.isArray), { options: h, handler: p } = Mt(u, c), d = typeof u == "function";
      o.forEach((g, w) => {
        const T = Array.isArray(g) ? g : [g];
        d ? f ? i(Ke(l, T, w), p ? () => p(...T) : void 0, h.timeout) : i(Ke(l, T, w), p ? () => p(g) : void 0, h.timeout) : f ? i(Ke(l, T, w), h, p ? () => p(...T) : void 0) : i(Ke(l, T, w), h, p ? () => p(g) : void 0);
      }), this.setContext("each", void 0);
    };
  }, n.for = function(o, ...s) {
    const i = this.withContext();
    return Array.isArray(o) && s.length && (o = Pn(o, s)), (a, u, c) => {
      const l = ot(a), { options: f, handler: h } = Mt(u, c);
      o.forEach((p, d) => {
        const g = h ? (w) => h(p, w) : void 0;
        g && (g.__VITEST_FIXTURE_INDEX__ = 1, g.toString = () => h.toString()), i(Ke(l, ta(p), d), f, g);
      });
    };
  }, n.skipIf = function(o) {
    return o ? this.skip : this;
  }, n.runIf = function(o) {
    return o ? this : this.skip;
  }, n.scoped = function(o) {
    gt().scoped(o);
  }, n.extend = function(o) {
    const s = xu(o, t || {}, Ue), i = e;
    return ms(function(a, u, c) {
      const f = gt().fixtures(), h = { ...this };
      f && (h.fixtures = $d(h.fixtures || [], f)), i.call(h, ot(a), u, c);
    }, s);
  }, n.beforeEach = Kd, n.afterEach = Gd, n.beforeAll = Vd, n.afterAll = Ud;
  const r = Su([
    "concurrent",
    "sequential",
    "skip",
    "only",
    "todo",
    "fails"
  ], n);
  return t && r.mergeContext(t), r;
}
function ms(e, t) {
  return Id(e, t);
}
function ot(e) {
  return typeof e == "string" ? e : typeof e == "function" ? e.name || "<anonymous>" : String(e);
}
function Ke(e, t, n) {
  (e.includes("%#") || e.includes("%$")) && (e = e.replace(/%%/g, "__vitest_escaped_%__").replace(/%#/g, `${n}`).replace(/%\$/g, `${n + 1}`).replace(/__vitest_escaped_%__/g, "%%"));
  const r = e.split("%").length - 1;
  e.includes("%f") && (e.match(/%f/g) || []).forEach((c, l) => {
    if (Jf(t[l]) || Object.is(t[l], -0)) {
      let f = 0;
      e = e.replace(/%f/g, (h) => (f++, f === l + 1 ? "-%f" : h));
    }
  });
  const o = xt(t[0]);
  function s(u) {
    return u.replace(/\$([$\w.]+)/g, (c, l) => {
      const f = /^\d+$/.test(l);
      if (!o && !f)
        return `$${l}`;
      const h = f ? Js(t, l) : void 0, p = o ? Js(t[0], l, h) : h;
      return Vf(p, { truncate: void 0 });
    });
  }
  let i = "", a = 0;
  return Pd(
    e,
    ea,
    // format "%"
    (u) => {
      a < r ? i += Wf(u[0], t[a++]) : i += u[0];
    },
    // format "$"
    (u) => {
      i += s(u);
    }
  ), i;
}
function Pd(e, t, n, r) {
  let o = 0;
  for (const s of e.matchAll(t))
    o < s.index && r(e.slice(o, s.index)), n(s), o = s.index + s[0].length;
  o < e.length && r(e.slice(o));
}
function Pn(e, t) {
  const n = e.join("").trim().replace(/ /g, "").split(`
`).map((o) => o.split("|"))[0], r = [];
  for (let o = 0; o < Math.floor(t.length / n.length); o++) {
    const s = {};
    for (let i = 0; i < n.length; i++)
      s[n[i]] = t[o * n.length + i];
    r.push(s);
  }
  return r;
}
globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
Dt();
const Tr = /* @__PURE__ */ new Map(), Ki = [], Sn = [];
function Nd(e) {
  if (Tr.size) {
    var t;
    const n = Array.from(Tr).map(([o, s]) => [
      o,
      s[0],
      s[1]
    ]), r = (t = e.onTaskUpdate) === null || t === void 0 ? void 0 : t.call(e, n, Ki);
    r && (Sn.push(r), r.then(() => Sn.splice(Sn.indexOf(r), 1), () => {
    })), Ki.length = 0, Tr.clear();
  }
}
async function jd(e) {
  Nd(e), await Promise.all(Sn);
}
const Gi = Date.now, st = {
  currentSuite: null
};
function Rd(e) {
  var t;
  (t = st.currentSuite) === null || t === void 0 || t.tasks.push(e);
}
async function Dd(e, t) {
  const n = st.currentSuite;
  st.currentSuite = e, await t(), st.currentSuite = n;
}
function yt(e, t, n = !1, r, o) {
  if (t <= 0 || t === Number.POSITIVE_INFINITY)
    return e;
  const { setTimeout: s, clearTimeout: i } = Dt();
  return (function(...u) {
    const c = Gi(), l = er();
    return l._currentTaskStartTime = c, l._currentTaskTimeout = t, new Promise((f, h) => {
      var p;
      const d = s(() => {
        i(d), g();
      }, t);
      (p = d.unref) === null || p === void 0 || p.call(d);
      function g() {
        const $ = qd(n, t, r);
        o?.(u, $), h($);
      }
      function w($) {
        if (l._currentTaskStartTime = void 0, l._currentTaskTimeout = void 0, i(d), Gi() - c >= t) {
          g();
          return;
        }
        f($);
      }
      function T($) {
        l._currentTaskStartTime = void 0, l._currentTaskTimeout = void 0, i(d), h($);
      }
      try {
        const $ = e(...u);
        typeof $ == "object" && $ != null && typeof $.then == "function" ? $.then(w, T) : w($);
      } catch ($) {
        T($);
      }
    });
  });
}
const lo = /* @__PURE__ */ new WeakMap();
function gs([e], t) {
  e && Fd(e, t);
}
function Fd(e, t) {
  const n = lo.get(e);
  n?.abort(t);
}
function Ld(e, t) {
  var n;
  const r = function() {
    throw new Error("done() callback is deprecated, use promise instead");
  };
  let o = lo.get(r);
  o || (o = new AbortController(), lo.set(r, o)), r.signal = o.signal, r.task = e, r.skip = (i, a) => {
    if (i !== !1)
      throw e.result ?? (e.result = { state: "skip" }), e.result.pending = !0, new yd("test is skipped; abort execution", e, typeof i == "string" ? i : a);
  };
  async function s(i, a, u, c) {
    const l = {
      message: i,
      type: u || "notice"
    };
    if (c) {
      if (c.body == null && !c.path)
        throw new TypeError('Test attachment requires "body" or "path" to be set. Both are missing.');
      if (c.body && c.path)
        throw new TypeError('Test attachment requires only one of "body" or "path" to be set. Both are specified.');
      l.attachment = c, c.body instanceof Uint8Array && (c.body = Wd(c.body));
    }
    if (a && (l.location = a), !t.onTestAnnotate)
      throw new Error("Test runner doesn't support test annotations.");
    await jd(t);
    const f = await t.onTestAnnotate(e, l);
    return e.annotations.push(f), f;
  }
  return r.annotate = ((i, a, u) => {
    if (e.result && e.result.state !== "run")
      throw new Error(`Cannot annotate tests outside of the test run. The test "${e.name}" finished running with the "${e.result.state}" state already.`);
    const c = Eu(e.file.filepath, new Error("STACK_TRACE").stack);
    let l;
    return c && (l = {
      file: c.file,
      line: c.line,
      column: c.column
    }), typeof a == "object" ? Yi(e, s(i, l, void 0, a)) : Yi(e, s(i, l, a, u));
  }), r.onTestFailed = (i, a) => {
    e.onFailed || (e.onFailed = []), e.onFailed.push(yt(i, a ?? t.config.hookTimeout, !0, new Error("STACK_TRACE_ERROR"), (u, c) => o.abort(c)));
  }, r.onTestFinished = (i, a) => {
    e.onFinished || (e.onFinished = []), e.onFinished.push(yt(i, a ?? t.config.hookTimeout, !0, new Error("STACK_TRACE_ERROR"), (u, c) => o.abort(c)));
  }, ((n = t.extendTaskContext) === null || n === void 0 ? void 0 : n.call(t, r)) || r;
}
function qd(e, t, n) {
  const r = `${e ? "Hook" : "Test"} timed out in ${t}ms.
If this is a long-running ${e ? "hook" : "test"}, pass a timeout value as the last argument or configure it globally with "${e ? "hookTimeout" : "testTimeout"}".`, o = new Error(r);
  return n?.stack && (o.stack = n.stack.replace(o.message, n.message)), o;
}
const Bd = /* @__PURE__ */ new WeakMap();
function zd(e) {
  const t = Bd.get(e);
  if (!t)
    throw new Error(`Cannot find file context for ${e.name}`);
  return t;
}
const Me = [];
for (let e = 65; e < 91; e++)
  Me.push(String.fromCharCode(e));
for (let e = 97; e < 123; e++)
  Me.push(String.fromCharCode(e));
for (let e = 0; e < 10; e++)
  Me.push(e.toString(10));
Me.push("+", "/");
function Wd(e) {
  let t = "";
  const n = e.byteLength;
  for (let r = 0; r < n; r += 3)
    if (n === r + 1) {
      const o = (e[r] & 252) >> 2, s = (e[r] & 3) << 4;
      t += Me[o], t += Me[s], t += "==";
    } else if (n === r + 2) {
      const o = (e[r] & 252) >> 2, s = (e[r] & 3) << 4 | (e[r + 1] & 240) >> 4, i = (e[r + 1] & 15) << 2;
      t += Me[o], t += Me[s], t += Me[i], t += "=";
    } else {
      const o = (e[r] & 252) >> 2, s = (e[r] & 3) << 4 | (e[r + 1] & 240) >> 4, i = (e[r + 1] & 15) << 2 | (e[r + 2] & 192) >> 6, a = e[r + 2] & 63;
      t += Me[o], t += Me[s], t += Me[i], t += Me[a];
    }
  return t;
}
function Yi(e, t) {
  return t = t.finally(() => {
    if (!e.promises)
      return;
    const n = e.promises.indexOf(t);
    n !== -1 && e.promises.splice(n, 1);
  }), e.promises || (e.promises = []), e.promises.push(t), t;
}
function nn() {
  return er().config.hookTimeout;
}
const ku = Symbol.for("VITEST_CLEANUP_TIMEOUT"), Cu = Symbol.for("VITEST_CLEANUP_STACK_TRACE");
function Vd(e, t = nn()) {
  ve(e, '"beforeAll" callback', ["function"]);
  const n = new Error("STACK_TRACE_ERROR");
  return gt().on("beforeAll", Object.assign(yt(e, t, !0, n), {
    [ku]: t,
    [Cu]: n
  }));
}
function Ud(e, t) {
  return ve(e, '"afterAll" callback', ["function"]), gt().on("afterAll", yt(e, t ?? nn(), !0, new Error("STACK_TRACE_ERROR")));
}
function Kd(e, t = nn()) {
  ve(e, '"beforeEach" callback', ["function"]);
  const n = new Error("STACK_TRACE_ERROR"), r = er();
  return gt().on("beforeEach", Object.assign(yt(ds(r, e), t ?? nn(), !0, n, gs), {
    [ku]: t,
    [Cu]: n
  }));
}
function Gd(e, t) {
  ve(e, '"afterEach" callback', ["function"]);
  const n = er();
  return gt().on("afterEach", yt(ds(n, e), t ?? nn(), !0, new Error("STACK_TRACE_ERROR"), gs));
}
const Yd = "__vitest_worker__";
function tr() {
  const e = globalThis[Yd];
  if (!e) throw new Error(`Vitest failed to access its internal state.

One of the following is possible:
- "vitest" is imported directly without running "vitest" command
- "vitest" is imported inside "globalSetup" (to fix this, use "setupFiles" instead, because "globalSetup" runs in a different context)
- "vitest" is imported inside Vite / Vitest config file
- Otherwise, it might be a Vitest bug. Please report it to https://github.com/vitest-dev/vitest/issues
`);
  return e;
}
function Iu() {
  return typeof process < "u" && !!process.send;
}
function Jd(e, t = !1) {
  const n = [
    /\/vitest\/dist\//,
    /vitest-virtual-\w+\/dist/,
    /@vitest\/dist/,
    ...t ? [] : [/^mock:/]
  ];
  e.idToModuleMap.forEach((r, o) => {
    n.some((s) => s.test(o)) || (r.promise = void 0, r.exports = void 0, r.evaluated = !1, r.importers.clear());
  });
}
function Xd() {
  const { setTimeout: e } = Dt();
  return new Promise((t) => e(t, 0));
}
async function Pu() {
  await Xd();
  const e = tr(), t = [], n = e.resolvingModules.size;
  for (const [r, o] of e.evaluatedModules.idToModuleMap) o.promise && !o.evaluated && t.push(o.promise);
  !t.length && !n || (await Promise.allSettled(t), await Pu());
}
var Hd = 44, Ji = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", Zd = new Uint8Array(64), Nu = new Uint8Array(128);
for (let e = 0; e < Ji.length; e++) {
  const t = Ji.charCodeAt(e);
  Zd[e] = t, Nu[t] = e;
}
function Wt(e, t) {
  let n = 0, r = 0, o = 0;
  do {
    const i = e.next();
    o = Nu[i], n |= (o & 31) << r, r += 5;
  } while (o & 32);
  const s = n & 1;
  return n >>>= 1, s && (n = -2147483648 | -n), t + n;
}
function Xi(e, t) {
  return e.pos >= t ? !1 : e.peek() !== Hd;
}
var Qd = class {
  constructor(e) {
    this.pos = 0, this.buffer = e;
  }
  next() {
    return this.buffer.charCodeAt(this.pos++);
  }
  peek() {
    return this.buffer.charCodeAt(this.pos);
  }
  indexOf(e) {
    const { buffer: t, pos: n } = this, r = t.indexOf(e, n);
    return r === -1 ? t.length : r;
  }
};
function em(e) {
  const { length: t } = e, n = new Qd(e), r = [];
  let o = 0, s = 0, i = 0, a = 0, u = 0;
  do {
    const c = n.indexOf(";"), l = [];
    let f = !0, h = 0;
    for (o = 0; n.pos < c; ) {
      let p;
      o = Wt(n, o), o < h && (f = !1), h = o, Xi(n, c) ? (s = Wt(n, s), i = Wt(n, i), a = Wt(n, a), Xi(n, c) ? (u = Wt(n, u), p = [o, s, i, a, u]) : p = [o, s, i, a]) : p = [o], l.push(p), n.pos++;
    }
    f || tm(l), r.push(l), n.pos = c + 1;
  } while (n.pos <= t);
  return r;
}
function tm(e) {
  e.sort(nm);
}
function nm(e, t) {
  return e[0] - t[0];
}
var nr = 0, rm = 1, om = 2, sm = 3, im = 4, Nn = !1;
function cm(e, t, n, r) {
  for (; n <= r; ) {
    const o = n + (r - n >> 1), s = e[o][nr] - t;
    if (s === 0)
      return Nn = !0, o;
    s < 0 ? n = o + 1 : r = o - 1;
  }
  return Nn = !1, n - 1;
}
function am(e, t, n) {
  for (let r = n + 1; r < e.length && e[r][nr] === t; n = r++)
    ;
  return n;
}
function um(e, t, n) {
  for (let r = n - 1; r >= 0 && e[r][nr] === t; n = r--)
    ;
  return n;
}
function lm(e, t, n, r) {
  const { lastKey: o, lastNeedle: s, lastIndex: i } = n;
  let a = 0, u = e.length - 1;
  if (r === o) {
    if (t === s)
      return Nn = i !== -1 && e[i][nr] === t, i;
    t >= s ? a = i === -1 ? 0 : i : u = i;
  }
  return n.lastKey = r, n.lastNeedle = t, n.lastIndex = cm(e, t, a, u);
}
var fm = "`line` must be greater than 0 (lines start at line 1)", hm = "`column` must be greater than or equal to 0 (columns start at column 0)", Hi = -1, pm = 1;
function dm(e) {
  var t;
  return (t = e)._decoded || (t._decoded = em(e._encoded));
}
function mm(e, t) {
  let { line: n, column: r, bias: o } = t;
  if (n--, n < 0) throw new Error(fm);
  if (r < 0) throw new Error(hm);
  const s = dm(e);
  if (n >= s.length) return yn(null, null, null, null);
  const i = s[n], a = gm(
    i,
    e._decodedMemo,
    n,
    r,
    o || pm
  );
  if (a === -1) return yn(null, null, null, null);
  const u = i[a];
  if (u.length === 1) return yn(null, null, null, null);
  const { names: c, resolvedSources: l } = e;
  return yn(
    l[u[rm]],
    u[om] + 1,
    u[sm],
    u.length === 5 ? c[u[im]] : null
  );
}
function yn(e, t, n, r) {
  return { source: e, line: t, column: n, name: r };
}
function gm(e, t, n, r, o) {
  let s = lm(e, r, t, n);
  return Nn ? s = (o === Hi ? am : um)(e, r, s) : o === Hi && s++, s === -1 || s === e.length ? -1 : s;
}
function ju(e) {
  return e != null;
}
function ym(e) {
  return e === null || typeof e != "function" && typeof e != "object";
}
function En(e) {
  return e != null && typeof e == "object" && !Array.isArray(e);
}
function bm(e) {
  let t = -1, n = null, r = 0, o = 0, s = null;
  for (; t <= e.length; ) {
    s = e[t], t++;
    const i = e[t];
    if ((i === '"' || i === "'" || i === "`") && s !== "\\" && (n === i ? n = null : n || (n = i)), n || (i === "(" && r++, i === ")" && o++), r && o && r === o)
      return t;
  }
  return null;
}
const Ru = /^\s*at .*(?:\S:\d+|\(native\))/m, wm = /^(?:eval@)?(?:\[native code\])?$/, Tm = [
  "node:internal",
  /\/packages\/\w+\/dist\//,
  /\/@vitest\/\w+\/dist\//,
  "/vitest/dist/",
  "/vitest/src/",
  "/node_modules/chai/",
  "/node_modules/tinyspy/",
  "/vite/dist/node/module-runner",
  "/rolldown-vite/dist/node/module-runner",
  "/deps/chunk-",
  "/deps/@vitest",
  "/deps/loupe",
  "/deps/chai",
  "/browser-playwright/dist/locators.js",
  "/browser-webdriverio/dist/locators.js",
  "/browser-preview/dist/locators.js",
  /node:\w+/,
  /__vitest_test__/,
  /__vitest_browser__/,
  /\/deps\/vitest_/
];
function Du(e) {
  if (!e.includes(":"))
    return [e];
  const n = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(e.replace(/^\(|\)$/g, ""));
  if (!n)
    return [e];
  let r = n[1];
  if (r.startsWith("async ") && (r = r.slice(6)), r.startsWith("http:") || r.startsWith("https:")) {
    const o = new URL(r);
    o.searchParams.delete("import"), o.searchParams.delete("browserv"), r = o.pathname + o.hash + o.search;
  }
  if (r.startsWith("/@fs/")) {
    const o = /^\/@fs\/[a-zA-Z]:\//.test(r);
    r = r.slice(o ? 5 : 4);
  }
  return [
    r,
    n[2] || void 0,
    n[3] || void 0
  ];
}
function Sm(e) {
  let t = e.trim();
  if (wm.test(t) || (t.includes(" > eval") && (t = t.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1")), !t.includes("@")))
    return null;
  let n = -1, r = "", o;
  for (let u = 0; u < t.length; u++)
    if (t[u] === "@") {
      const c = t.slice(u + 1);
      if (c.includes(":") && c.length >= 3) {
        n = u, r = c, o = u > 0 ? t.slice(0, u) : void 0;
        break;
      }
    }
  if (n === -1 || !r.includes(":") || r.length < 3)
    return null;
  const [s, i, a] = Du(r);
  return !s || !i || !a ? null : {
    file: s,
    method: o || "",
    line: Number.parseInt(i),
    column: Number.parseInt(a)
  };
}
function Em(e) {
  let t = e.trim();
  if (!Ru.test(t))
    return null;
  t.includes("(eval ") && (t = t.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, ""));
  let n = t.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
  const r = n.match(/ (\(.+\)$)/);
  n = r ? n.replace(r[0], "") : n;
  const [o, s, i] = Du(r ? r[1] : n);
  let a = r && n || "", u = o && ["eval", "<anonymous>"].includes(o) ? void 0 : o;
  return !u || !s || !i ? null : (a.startsWith("async ") && (a = a.slice(6)), u.startsWith("file://") && (u = u.slice(7)), u = u.startsWith("node:") || u.startsWith("internal:") ? u : Tu(u), a && (a = a.replace(/__vite_ssr_import_\d+__\./g, "").replace(/(Object\.)?__vite_ssr_export_default__\s?/g, "")), {
    method: a,
    file: u,
    line: Number.parseInt(s),
    column: Number.parseInt(i)
  });
}
function Sr(e, t = {}) {
  const { ignoreStackEntries: n = Tm } = t;
  return (Ru.test(e) ? $m(e) : vm(e)).map((o) => {
    var s;
    t.getUrlId && (o.file = t.getUrlId(o.file));
    const i = (s = t.getSourceMap) === null || s === void 0 ? void 0 : s.call(t, o.file);
    if (!i || typeof i != "object" || !i.version)
      return Zi(n, o.file) ? null : o;
    const a = new _m(i, o.file), u = Om(a, o);
    if (!u)
      return o;
    const { line: c, column: l, source: f, name: h } = u;
    let p = f || o.file;
    return p.match(/\/\w:\//) && (p = p.slice(1)), Zi(n, p) ? null : c != null && l != null ? {
      line: c,
      column: l,
      file: p,
      method: h || o.method
    } : o;
  }).filter((o) => o != null);
}
function Zi(e, t) {
  return e.some((n) => t.match(n));
}
function vm(e) {
  return e.split(`
`).map((t) => Sm(t)).filter(ju);
}
function $m(e) {
  return e.split(`
`).map((t) => Em(t)).filter(ju);
}
function xm(e, t = {}) {
  if (!e || ym(e))
    return [];
  if ("stacks" in e && e.stacks)
    return e.stacks;
  const n = e.stack || "";
  let r = typeof n == "string" ? Sr(n, t) : [];
  if (!r.length) {
    const o = e;
    o.fileName != null && o.lineNumber != null && o.columnNumber != null && (r = Sr(`${o.fileName}:${o.lineNumber}:${o.columnNumber}`, t)), o.sourceURL != null && o.line != null && o._column != null && (r = Sr(`${o.sourceURL}:${o.line}:${o.column}`, t));
  }
  return t.frameFilter && (r = r.filter((o) => t.frameFilter(e, o) !== !1)), e.stacks = r, r;
}
class _m {
  _encoded;
  _decoded;
  _decodedMemo;
  url;
  version;
  names = [];
  resolvedSources;
  constructor(t, n) {
    this.map = t;
    const { mappings: r, names: o, sources: s } = t;
    this.version = t.version, this.names = o || [], this._encoded = r || "", this._decodedMemo = Mm(), this.url = n, this.resolvedSources = (s || []).map((i) => Tu(i || "", n));
  }
}
function Mm() {
  return {
    lastKey: -1,
    lastNeedle: -1,
    lastIndex: -1
  };
}
function Om(e, t) {
  const n = mm(e, t);
  return n.column == null ? null : n;
}
const ys = /\r?\n/;
function Am(e, t, n) {
  const r = e.split(ys), o = /\r\n/.test(e) ? 2 : 1;
  let s = 0;
  if (t > r.length)
    return e.length;
  for (let i = 0; i < t - 1; i++)
    s += r[i].length + o;
  return s + n;
}
function km(e, t) {
  if (t > e.length)
    throw new Error(`offset is longer than source length! offset ${t} > length ${e.length}`);
  const n = e.split(ys), r = /\r\n/.test(e) ? 2 : 1;
  let o = 0, s = 0;
  for (; s < n.length; s++) {
    const i = n[s].length + r;
    if (o + i >= t)
      break;
    o += i;
  }
  return s + 1;
}
async function Cm(e, t) {
  const n = (await import("../magic-string.es-uPKorP4O.mjs")).default, r = new Set(t.map((o) => o.file));
  await Promise.all(Array.from(r).map(async (o) => {
    const s = t.filter((c) => c.file === o), i = await e.readSnapshotFile(o), a = new n(i);
    for (const c of s) {
      const l = Am(i, c.line, c.column);
      Dm(i, a, l, c.snapshot);
    }
    const u = a.toString();
    u !== i && await e.saveSnapshotFile(o, u);
  }));
}
const Im = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*\{/;
function Pm(e, t, n, r) {
  let o = e.slice(n);
  const s = Im.exec(o);
  if (!s)
    return !1;
  o = o.slice(s.index);
  let i = bm(o);
  if (i === null)
    return !1;
  i += n + s.index;
  const a = n + s.index + s[0].length, u = Nm(e, a), c = `, ${Fu(r, e, n)}`;
  return u === i ? t.appendLeft(i, c) : t.overwrite(u, i, c), !0;
}
function Nm(e, t) {
  let n = 1, r = 0;
  for (; n !== r && t < e.length; ) {
    const o = e[t++];
    o === "{" ? n++ : o === "}" && r++;
  }
  return t;
}
function Fu(e, t, n) {
  const r = km(t, n), s = t.split(ys)[r - 1].match(/^\s*/)[0] || "", i = s.includes("	") ? `${s}	` : `${s}  `, a = e.trim().replace(/\\/g, "\\\\").split(/\n/g), u = a.length <= 1, c = "`";
  return u ? `${c}${a.join(`
`).replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}${c}` : `${c}
${a.map((l) => l ? i + l : "").join(`
`).replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}
${s}${c}`;
}
const Qi = "toMatchInlineSnapshot", ec = "toThrowErrorMatchingInlineSnapshot";
function jm(e, t) {
  const n = t - Qi.length;
  if (e.slice(n, t) === Qi)
    return {
      code: e.slice(n),
      index: n
    };
  const r = t - ec.length;
  return e.slice(t - r, t) === ec ? {
    code: e.slice(t - r),
    index: t - r
  } : {
    code: e.slice(t),
    index: t
  };
}
const Rm = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*[\w$]*(['"`)])/;
function Dm(e, t, n, r) {
  const { code: o, index: s } = jm(e, n), i = Rm.exec(o), a = /toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot/.exec(o);
  if (!i || i.index !== a?.index)
    return Pm(e, t, s, r);
  const u = i[1], c = s + i.index + i[0].length, l = Fu(r, e, s);
  if (u === ")")
    return t.appendRight(c - 1, l), !0;
  const h = new RegExp(`(?:^|[^\\\\])${u}`).exec(e.slice(c));
  if (!h)
    return !1;
  const p = c + h.index + h[0].length;
  return t.overwrite(c - 1, p, l), !0;
}
const Fm = /^([^\S\n]*)\S/m;
function tc(e) {
  var t;
  const n = e.match(Fm);
  if (!n || !n[1])
    return e;
  const r = n[1], o = e.split(/\n/g);
  if (o.length <= 2 || o[0].trim() !== "" || ((t = o.at(-1)) === null || t === void 0 ? void 0 : t.trim()) !== "")
    return e;
  for (let s = 1; s < o.length - 1; s++)
    if (o[s] !== "") {
      if (o[s].indexOf(r) !== 0)
        return e;
      o[s] = o[s].substring(r.length);
    }
  return o[o.length - 1] = "", e = o.join(`
`), e;
}
async function Lm(e, t) {
  await Promise.all(t.map(async (n) => {
    n.readonly || await e.saveSnapshotFile(n.file, n.snapshot);
  }));
}
function qm(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Er = { exports: {} }, nc;
function Bm() {
  if (nc) return Er.exports;
  nc = 1;
  var e = function(t, n) {
    var r, o, s = 1, i = 0, a = 0, u = String.alphabet;
    function c(l, f, h) {
      if (h) {
        for (r = f; h = c(l, r), h < 76 && h > 65; ) ++r;
        return +l.slice(f - 1, r);
      }
      return h = u && u.indexOf(l.charAt(f)), h > -1 ? h + 76 : (h = l.charCodeAt(f) || 0, h < 45 || h > 127 ? h : h < 46 ? 65 : h < 48 ? h - 1 : h < 58 ? h + 18 : h < 65 ? h - 11 : h < 91 ? h + 11 : h < 97 ? h - 37 : h < 123 ? h + 5 : h - 63);
    }
    if ((t += "") != (n += "")) {
      for (; s; )
        if (o = c(t, i++), s = c(n, a++), o < 76 && s < 76 && o > 66 && s > 66 && (o = c(t, i, i), s = c(n, a, i = r), a = r), o != s) return o < s ? -1 : 1;
    }
    return 0;
  };
  try {
    Er.exports = e;
  } catch {
    String.naturalCompare = e;
  }
  return Er.exports;
}
var zm = Bm(), Wm = /* @__PURE__ */ qm(zm);
const Vm = (e, t, n, r, o, s) => {
  const i = e.getMockName(), a = i === "vi.fn()" ? "" : ` ${i}`;
  let u = "";
  if (e.mock.calls.length !== 0) {
    const c = n + t.indent;
    u = ` {${t.spacingOuter}${c}"calls": ${s(e.mock.calls, t, c, r, o)}${t.min ? ", " : ","}${t.spacingOuter}${c}"results": ${s(e.mock.results, t, c, r, o)}${t.min ? "" : ","}${t.spacingOuter}${n}}`;
  }
  return `[MockFunction${a}]${u}`;
}, Um = (e) => e && !!e._isMockFunction, Km = {
  serialize: Vm,
  test: Um
}, { DOMCollection: Gm, DOMElement: Ym, Immutable: Jm, ReactElement: Xm, ReactTestComponent: Hm, AsymmetricMatcher: Zm } = Fn;
let fo = [
  Hm,
  Xm,
  Ym,
  Gm,
  Jm,
  Zm,
  Km
];
function Qm(e) {
  fo = [e].concat(fo);
}
function eg() {
  return fo;
}
function tg(e, t) {
  return `${e} ${t}`;
}
function ng(e) {
  if (!/ \d+$/.test(e))
    throw new Error("Snapshot keys must end with a number.");
  return e.replace(/ \d+$/, "");
}
function rg(e, t) {
  const n = t.updateSnapshot, r = /* @__PURE__ */ Object.create(null);
  let o = "", s = !1;
  if (e != null)
    try {
      o = e, new Function("exports", o)(r);
    } catch {
    }
  return (n === "all" || n === "new") && o && (s = !0), {
    data: r,
    dirty: s
  };
}
function og(e) {
  return e.includes(`
`) ? `
${e}
` : e;
}
function rc(e) {
  return e.length > 2 && e[0] === `
` && e.endsWith(`
`) ? e.slice(1, -1) : e;
}
const sg = !0, ig = !1;
function cg(e, t = 2, n = {}) {
  return bs(Le(e, {
    escapeRegex: sg,
    indent: t,
    plugins: eg(),
    printFunctionName: ig,
    ...n
  }));
}
function ag(e) {
  return e.replace(/`|\\|\$\{/g, "\\$&");
}
function oc(e) {
  return `\`${ag(e)}\``;
}
function bs(e) {
  return e.replace(/\r\n|\r/g, `
`);
}
async function ug(e, t, n) {
  const r = Object.keys(t).sort(Wm).map((a) => `exports[${oc(a)}] = ${oc(bs(t[a]))};`), o = `${e.getHeader()}

${r.join(`

`)}
`, s = await e.readSnapshotFile(n);
  s != null && s === o || await e.saveSnapshotFile(n, o);
}
function ho(e = [], t = []) {
  const n = Array.from(e);
  return t.forEach((r, o) => {
    const s = n[o];
    Array.isArray(e[o]) ? n[o] = ho(e[o], r) : En(s) ? n[o] = ws(e[o], r) : n[o] = r;
  }), n;
}
function ws(e, t) {
  if (En(e) && En(t)) {
    const n = { ...e };
    return Object.keys(t).forEach((r) => {
      En(t[r]) && !t[r].$$typeof ? r in e ? n[r] = ws(e[r], t[r]) : Object.assign(n, { [r]: t[r] }) : Array.isArray(t[r]) ? n[r] = ho(e[r], t[r]) : Object.assign(n, { [r]: t[r] });
    }), n;
  } else if (Array.isArray(e) && Array.isArray(t))
    return ho(e, t);
  return e;
}
class Lu extends Map {
  constructor(t, n) {
    super(n), this.defaultFn = t;
  }
  get(t) {
    return this.has(t) || this.set(t, this.defaultFn(t)), super.get(t);
  }
}
class Vt extends Lu {
  constructor() {
    super(() => 0);
  }
  // compat for jest-image-snapshot https://github.com/vitest-dev/vitest/issues/7322
  // `valueOf` and `Snapshot.added` setter allows
  //   snapshotState.added = snapshotState.added + 1
  // to function as
  //   snapshotState.added.total_ = snapshotState.added.total() + 1
  _total;
  valueOf() {
    return this._total = this.total();
  }
  increment(t) {
    typeof this._total < "u" && this._total++, this.set(t, this.get(t) + 1);
  }
  total() {
    if (typeof this._total < "u")
      return this._total;
    let t = 0;
    for (const n of this.values())
      t += n;
    return t;
  }
}
function sc(e, t) {
  return e.file === t.file && e.column === t.column && e.line === t.line;
}
class Ts {
  _counters = new Vt();
  _dirty;
  _updateSnapshot;
  _snapshotData;
  _initialData;
  _inlineSnapshots;
  _inlineSnapshotStacks;
  _testIdToKeys = new Lu(() => []);
  _rawSnapshots;
  _uncheckedKeys;
  _snapshotFormat;
  _environment;
  _fileExists;
  expand;
  // getter/setter for jest-image-snapshot compat
  // https://github.com/vitest-dev/vitest/issues/7322
  _added = new Vt();
  _matched = new Vt();
  _unmatched = new Vt();
  _updated = new Vt();
  get added() {
    return this._added;
  }
  set added(t) {
    this._added._total = t;
  }
  get matched() {
    return this._matched;
  }
  set matched(t) {
    this._matched._total = t;
  }
  get unmatched() {
    return this._unmatched;
  }
  set unmatched(t) {
    this._unmatched._total = t;
  }
  get updated() {
    return this._updated;
  }
  set updated(t) {
    this._updated._total = t;
  }
  constructor(t, n, r, o) {
    this.testFilePath = t, this.snapshotPath = n;
    const { data: s, dirty: i } = rg(r, o);
    this._fileExists = r != null, this._initialData = { ...s }, this._snapshotData = { ...s }, this._dirty = i, this._inlineSnapshots = [], this._inlineSnapshotStacks = [], this._rawSnapshots = [], this._uncheckedKeys = new Set(Object.keys(this._snapshotData)), this.expand = o.expand || !1, this._updateSnapshot = o.updateSnapshot, this._snapshotFormat = {
      printBasicPrototype: !1,
      escapeString: !1,
      ...o.snapshotFormat
    }, this._environment = o.snapshotEnvironment;
  }
  static async create(t, n) {
    const r = await n.snapshotEnvironment.resolvePath(t), o = await n.snapshotEnvironment.readSnapshotFile(r);
    return new Ts(t, r, o, n);
  }
  get environment() {
    return this._environment;
  }
  markSnapshotsAsCheckedForTest(t) {
    this._uncheckedKeys.forEach((n) => {
      / \d+$| > /.test(n.slice(t.length)) && this._uncheckedKeys.delete(n);
    });
  }
  clearTest(t) {
    this._inlineSnapshots = this._inlineSnapshots.filter((n) => n.testId !== t), this._inlineSnapshotStacks = this._inlineSnapshotStacks.filter((n) => n.testId !== t);
    for (const n of this._testIdToKeys.get(t)) {
      const r = ng(n), o = this._counters.get(r);
      o > 0 && ((n in this._snapshotData || n in this._initialData) && (this._snapshotData[n] = this._initialData[n]), this._counters.set(r, o - 1));
    }
    this._testIdToKeys.delete(t), this.added.delete(t), this.updated.delete(t), this.matched.delete(t), this.unmatched.delete(t);
  }
  _inferInlineSnapshotStack(t) {
    const n = t.findIndex((o) => o.method.match(/__VITEST_(RESOLVES|REJECTS)__/));
    if (n !== -1)
      return t[n + 3];
    const r = t.findIndex((o) => o.method.includes("__INLINE_SNAPSHOT__"));
    return r !== -1 ? t[r + 2] : null;
  }
  _addSnapshot(t, n, r) {
    this._dirty = !0, r.stack ? this._inlineSnapshots.push({
      snapshot: n,
      testId: r.testId,
      ...r.stack
    }) : r.rawSnapshot ? this._rawSnapshots.push({
      ...r.rawSnapshot,
      snapshot: n
    }) : this._snapshotData[t] = n;
  }
  async save() {
    const t = Object.keys(this._snapshotData).length, n = this._inlineSnapshots.length, r = this._rawSnapshots.length, o = !t && !n && !r, s = {
      deleted: !1,
      saved: !1
    };
    return (this._dirty || this._uncheckedKeys.size) && !o ? (t && (await ug(this._environment, this._snapshotData, this.snapshotPath), this._fileExists = !0), n && await Cm(this._environment, this._inlineSnapshots), r && await Lm(this._environment, this._rawSnapshots), s.saved = !0) : !t && this._fileExists && (this._updateSnapshot === "all" && (await this._environment.removeSnapshotFile(this.snapshotPath), this._fileExists = !1), s.deleted = !0), s;
  }
  getUncheckedCount() {
    return this._uncheckedKeys.size || 0;
  }
  getUncheckedKeys() {
    return Array.from(this._uncheckedKeys);
  }
  removeUncheckedKeys() {
    this._updateSnapshot === "all" && this._uncheckedKeys.size && (this._dirty = !0, this._uncheckedKeys.forEach((t) => delete this._snapshotData[t]), this._uncheckedKeys.clear());
  }
  match({ testId: t, testName: n, received: r, key: o, inlineSnapshot: s, isInline: i, error: a, rawSnapshot: u }) {
    this._counters.increment(n);
    const c = this._counters.get(n);
    o || (o = tg(n, c)), this._testIdToKeys.get(t).push(o), i && this._snapshotData[o] !== void 0 || this._uncheckedKeys.delete(o);
    let l = u && typeof r == "string" ? r : cg(r, void 0, this._snapshotFormat);
    u || (l = og(l)), u && u.content && u.content.match(/\r\n/) && !l.match(/\r\n/) && (u.content = bs(u.content));
    const f = i ? s : u ? u.content : this._snapshotData[o], h = u ? f : f?.trim(), p = h === (u ? l : l.trim()), d = f !== void 0, g = i || this._fileExists || u && u.content != null;
    p && !i && !u && (this._snapshotData[o] = l);
    let w;
    if (i) {
      var T, $;
      const k = xm(a || new Error("snapshot"), { ignoreStackEntries: [] }), _ = this._inferInlineSnapshotStack(k);
      if (!_)
        throw new Error(`@vitest/snapshot: Couldn't infer stack frame for inline snapshot.
${JSON.stringify(k)}`);
      w = ((T = ($ = this.environment).processStackTrace) === null || T === void 0 ? void 0 : T.call($, _)) || _, w.column--;
      const O = this._inlineSnapshotStacks.filter((I) => sc(I, w));
      if (O.length > 0) {
        this._inlineSnapshots = this._inlineSnapshots.filter((M) => !sc(M, w));
        const I = O.find((M) => M.snapshot !== l);
        if (I)
          throw Object.assign(new Error("toMatchInlineSnapshot with different snapshots cannot be called at the same location"), {
            actual: l,
            expected: I.snapshot
          });
      }
      this._inlineSnapshotStacks.push({
        ...w,
        testId: t,
        snapshot: l
      });
    }
    return d && this._updateSnapshot === "all" || (!d || !g) && (this._updateSnapshot === "new" || this._updateSnapshot === "all") ? (this._updateSnapshot === "all" ? p ? this.matched.increment(t) : (d ? this.updated.increment(t) : this.added.increment(t), this._addSnapshot(o, l, {
      stack: w,
      testId: t,
      rawSnapshot: u
    })) : (this._addSnapshot(o, l, {
      stack: w,
      testId: t,
      rawSnapshot: u
    }), this.added.increment(t)), {
      actual: "",
      count: c,
      expected: "",
      key: o,
      pass: !0
    }) : p ? (this.matched.increment(t), {
      actual: "",
      count: c,
      expected: "",
      key: o,
      pass: !0
    }) : (this.unmatched.increment(t), {
      actual: u ? l : rc(l),
      count: c,
      expected: h !== void 0 ? u ? h : rc(h) : void 0,
      key: o,
      pass: !1
    });
  }
  async pack() {
    const t = {
      filepath: this.testFilePath,
      added: 0,
      fileDeleted: !1,
      matched: 0,
      unchecked: 0,
      uncheckedKeys: [],
      unmatched: 0,
      updated: 0
    }, n = this.getUncheckedCount(), r = this.getUncheckedKeys();
    n && this.removeUncheckedKeys();
    const o = await this.save();
    return t.fileDeleted = o.deleted, t.added = this.added.total(), t.matched = this.matched.total(), t.unmatched = this.unmatched.total(), t.updated = this.updated.total(), t.unchecked = o.deleted ? 0 : n, t.uncheckedKeys = Array.from(r), t;
  }
}
function ic(e, t, n, r) {
  const o = new Error(e);
  return Object.defineProperty(o, "actual", {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }), Object.defineProperty(o, "expected", {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }), Object.defineProperty(o, "diffOptions", { value: { expand: t } }), o;
}
class lg {
  snapshotStateMap = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    this.options = t;
  }
  async setup(t, n) {
    this.snapshotStateMap.has(t) || this.snapshotStateMap.set(t, await Ts.create(t, n));
  }
  async finish(t) {
    const r = await this.getSnapshotState(t).pack();
    return this.snapshotStateMap.delete(t), r;
  }
  skipTest(t, n) {
    this.getSnapshotState(t).markSnapshotsAsCheckedForTest(n);
  }
  clearTest(t, n) {
    this.getSnapshotState(t).clearTest(n);
  }
  getSnapshotState(t) {
    const n = this.snapshotStateMap.get(t);
    if (!n)
      throw new Error(`The snapshot state for '${t}' is not found. Did you call 'SnapshotClient.setup()'?`);
    return n;
  }
  assert(t) {
    const { filepath: n, name: r, testId: o = r, message: s, isInline: i = !1, properties: a, inlineSnapshot: u, error: c, errorMessage: l, rawSnapshot: f } = t;
    let { received: h } = t;
    if (!n)
      throw new Error("Snapshot cannot be used outside of test");
    const p = this.getSnapshotState(n);
    if (typeof a == "object") {
      if (typeof h != "object" || !h)
        throw new Error("Received value must be an object when the matcher has properties");
      try {
        var d, g;
        if (((d = (g = this.options).isEqual) === null || d === void 0 ? void 0 : d.call(g, h, a)) ?? !1)
          h = ws(h, a);
        else
          throw ic("Snapshot properties mismatched", p.expand, h, a);
      } catch (O) {
        throw O.message = l || "Snapshot mismatched", O;
      }
    }
    const w = [r, ...s ? [s] : []].join(" > "), { actual: T, expected: $, key: k, pass: _ } = p.match({
      testId: o,
      testName: w,
      received: h,
      isInline: i,
      error: c,
      inlineSnapshot: u,
      rawSnapshot: f
    });
    if (!_)
      throw ic(`Snapshot \`${k || "unknown"}\` mismatched`, p.expand, f ? T : T?.trim(), f ? $ : $?.trim());
  }
  async assertRaw(t) {
    if (!t.rawSnapshot)
      throw new Error("Raw snapshot is required");
    const { filepath: n, rawSnapshot: r } = t;
    if (r.content == null) {
      if (!n)
        throw new Error("Snapshot cannot be used outside of test");
      const o = this.getSnapshotState(n);
      t.filepath || (t.filepath = n), r.file = await o.environment.resolveRawPath(n, r.file), r.content = await o.environment.readSnapshotFile(r.file) ?? void 0;
    }
    return this.assert(t);
  }
  clear() {
    this.snapshotStateMap.clear();
  }
}
var po = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
const Fe = Date;
let mo = null;
class it extends Fe {
  constructor(t, n, r, o, s, i, a) {
    super();
    let u;
    switch (arguments.length) {
      case 0:
        mo !== null ? u = new Fe(mo.valueOf()) : u = new Fe();
        break;
      case 1:
        u = new Fe(t);
        break;
      default:
        r = typeof r > "u" ? 1 : r, o = o || 0, s = s || 0, i = i || 0, a = a || 0, u = new Fe(t, n, r, o, s, i, a);
        break;
    }
    return Object.setPrototypeOf(u, it.prototype), u;
  }
}
it.UTC = Fe.UTC;
it.now = function() {
  return new it().valueOf();
};
it.parse = function(e) {
  return Fe.parse(e);
};
it.toString = function() {
  return Fe.toString();
};
function fg(e) {
  const t = new Fe(e.valueOf());
  if (Number.isNaN(t.getTime())) throw new TypeError(`mockdate: The time set is an invalid date: ${e}`);
  globalThis.Date = it, mo = t.valueOf();
}
function cc() {
  globalThis.Date = Fe;
}
const hg = [
  "matchSnapshot",
  "toMatchSnapshot",
  "toMatchInlineSnapshot",
  "toThrowErrorMatchingSnapshot",
  "toThrowErrorMatchingInlineSnapshot",
  "throws",
  "Throw",
  "throw",
  "toThrow",
  "toThrowError"
];
function pg(e) {
  return function(n, r = {}) {
    const o = tr().config.expect?.poll ?? {}, { interval: s = o.interval ?? 50, timeout: i = o.timeout ?? 1e3, message: a } = r, u = e(null, a).withContext({ poll: !0 });
    n = n.bind(u);
    const c = he.flag(u, "vitest-test");
    if (!c) throw new Error("expect.poll() must be called inside a test");
    const l = new Proxy(u, { get(f, h, p) {
      const d = Reflect.get(f, h, p);
      if (typeof d != "function") return d instanceof y ? l : d;
      if (h === "assert") return d;
      if (typeof h == "string" && hg.includes(h)) throw new SyntaxError(`expect.poll() is not supported in combination with .${h}(). Use vi.waitFor() if your assertion condition is unstable.`);
      return function(...g) {
        const w = /* @__PURE__ */ new Error("STACK_TRACE_ERROR"), T = () => new Promise((_, O) => {
          let I, M, L;
          const { setTimeout: ee, clearTimeout: j } = Dt(), G = async () => {
            try {
              he.flag(u, "_name", h);
              const H = await n();
              he.flag(u, "object", H), _(await d.call(u, ...g)), j(I), j(M);
            } catch (H) {
              L = H, he.flag(u, "_isLastPollAttempt") || (I = ee(G, s));
            }
          };
          M = ee(() => {
            j(I), he.flag(u, "_isLastPollAttempt", !0);
            const H = (ae) => {
              ae.cause == null && (ae.cause = /* @__PURE__ */ new Error("Matcher did not succeed in time.")), O(ac(ae, w));
            };
            G().then(() => H(L)).catch((ae) => H(ae));
          }, i), G();
        });
        let $ = !1;
        c.onFinished ??= [], c.onFinished.push(() => {
          if (!$) {
            const _ = he.flag(u, "negate") ? "not." : "", O = `expect.${he.flag(u, "_poll.element") ? "element(locator)" : "poll(assertion)"}.${_}${String(h)}()`;
            throw ac(/* @__PURE__ */ new Error(`${O} was not awaited. This assertion is asynchronous and must be awaited; otherwise, it is not executed to avoid unhandled rejections:

await ${O}
`), w);
          }
        });
        let k;
        return {
          then(_, O) {
            return $ = !0, (k ||= T()).then(_, O);
          },
          catch(_) {
            return (k ||= T()).catch(_);
          },
          finally(_) {
            return (k ||= T()).finally(_);
          },
          [Symbol.toStringTag]: "Promise"
        };
      };
    } });
    return l;
  };
}
function ac(e, t) {
  return t.stack !== void 0 && (e.stack = t.stack.replace(t.message, e.message)), e;
}
function dg(e, t, n) {
  const r = e.flag(t, "negate") ? "not." : "", o = `${e.flag(t, "_name")}(expected)`, s = e.flag(t, "promise");
  return `expect(actual)${s ? `.${s}` : ""}.${r}${o}`;
}
function mg(e, t, n, r) {
  const o = e;
  if (o && t instanceof Promise) {
    t = t.finally(() => {
      if (!o.promises) return;
      const i = o.promises.indexOf(t);
      i !== -1 && o.promises.splice(i, 1);
    }), o.promises || (o.promises = []), o.promises.push(t);
    let s = !1;
    return o.onFinished ??= [], o.onFinished.push(() => {
      if (!s) {
        const i = (globalThis.__vitest_worker__?.onFilterStackTrace || ((a) => a || ""))(r.stack);
        console.warn([
          `Promise returned by \`${n}\` was not awaited. `,
          "Vitest currently auto-awaits hanging assertions at the end of the test, but this will cause the test to fail in Vitest 3. ",
          `Please remember to await the assertion.
`,
          i
        ].join(""));
      }
    }), {
      then(i, a) {
        return s = !0, t.then(i, a);
      },
      catch(i) {
        return t.catch(i);
      },
      finally(i) {
        return t.finally(i);
      },
      [Symbol.toStringTag]: "Promise"
    };
  }
  return t;
}
let vr;
function Ut() {
  return vr || (vr = new lg({ isEqual: (e, t) => U(e, t, [Oe, Rt]) })), vr;
}
function uc(e, t) {
  if (typeof e != "function") {
    if (!t) throw new Error(`expected must be a function, received ${typeof e}`);
    return e;
  }
  try {
    e();
  } catch (n) {
    return n;
  }
  throw new Error("snapshot function didn't throw");
}
function Kt(e) {
  return {
    filepath: e.file.filepath,
    name: gd(e).slice(1).join(" > "),
    testId: e.id
  };
}
const gg = (e, t) => {
  function n(r, o) {
    const s = t.flag(o, "vitest-test");
    if (!s) throw new Error(`'${r}' cannot be used without test context`);
    return s;
  }
  for (const r of ["matchSnapshot", "toMatchSnapshot"]) t.addMethod(e.Assertion.prototype, r, function(o, s) {
    if (t.flag(this, "_name", r), t.flag(this, "negate")) throw new Error(`${r} cannot be used with "not"`);
    const i = t.flag(this, "object"), a = n(r, this);
    typeof o == "string" && typeof s > "u" && (s = o, o = void 0);
    const u = t.flag(this, "message");
    Ut().assert({
      received: i,
      message: s,
      isInline: !1,
      properties: o,
      errorMessage: u,
      ...Kt(a)
    });
  });
  t.addMethod(e.Assertion.prototype, "toMatchFileSnapshot", function(r, o) {
    if (t.flag(this, "_name", "toMatchFileSnapshot"), t.flag(this, "negate")) throw new Error('toMatchFileSnapshot cannot be used with "not"');
    const s = /* @__PURE__ */ new Error("resolves"), i = t.flag(this, "object"), a = n("toMatchFileSnapshot", this), u = t.flag(this, "message");
    return mg(a, Ut().assertRaw({
      received: i,
      message: o,
      isInline: !1,
      rawSnapshot: { file: r },
      errorMessage: u,
      ...Kt(a)
    }), dg(t, this), s);
  }), t.addMethod(e.Assertion.prototype, "toMatchInlineSnapshot", function(o, s, i) {
    if (t.flag(this, "_name", "toMatchInlineSnapshot"), t.flag(this, "negate")) throw new Error('toMatchInlineSnapshot cannot be used with "not"');
    const a = n("toMatchInlineSnapshot", this);
    if (a.each || a.suite?.each) throw new Error("InlineSnapshot cannot be used inside of test.each or describe.each");
    const u = t.flag(this, "object"), c = t.flag(this, "error");
    typeof o == "string" && (i = s, s = o, o = void 0), s && (s = tc(s));
    const l = t.flag(this, "message");
    Ut().assert({
      received: u,
      message: i,
      isInline: !0,
      properties: o,
      inlineSnapshot: s,
      error: c,
      errorMessage: l,
      ...Kt(a)
    });
  }), t.addMethod(e.Assertion.prototype, "toThrowErrorMatchingSnapshot", function(r) {
    if (t.flag(this, "_name", "toThrowErrorMatchingSnapshot"), t.flag(this, "negate")) throw new Error('toThrowErrorMatchingSnapshot cannot be used with "not"');
    const o = t.flag(this, "object"), s = n("toThrowErrorMatchingSnapshot", this), i = t.flag(this, "promise"), a = t.flag(this, "message");
    Ut().assert({
      received: uc(o, i),
      message: r,
      errorMessage: a,
      ...Kt(s)
    });
  }), t.addMethod(e.Assertion.prototype, "toThrowErrorMatchingInlineSnapshot", function(o, s) {
    if (t.flag(this, "negate")) throw new Error('toThrowErrorMatchingInlineSnapshot cannot be used with "not"');
    const i = n("toThrowErrorMatchingInlineSnapshot", this);
    if (i.each || i.suite?.each) throw new Error("InlineSnapshot cannot be used inside of test.each or describe.each");
    const a = t.flag(this, "object"), u = t.flag(this, "error"), c = t.flag(this, "promise"), l = t.flag(this, "message");
    o && (o = tc(o)), Ut().assert({
      received: uc(a, c),
      message: s,
      inlineSnapshot: o,
      isInline: !0,
      error: u,
      errorMessage: l,
      ...Kt(i)
    });
  }), t.addMethod(e.expect, "addSnapshotSerializer", Qm);
};
wt(Qp);
wt(Jp);
wt(gg);
wt(Yp);
function yg(e) {
  const t = ((s, i) => {
    const { assertionCalls: a } = Ht(t);
    return yr({ assertionCalls: a + 1 }, t), ht(s, i);
  });
  Object.assign(t, ht), Object.assign(t, globalThis[ls]), t.getState = () => Ht(t), t.setState = (s) => yr(s, t);
  const n = Ht(globalThis[Hn]) || {};
  yr({
    ...n,
    assertionCalls: 0,
    isExpectingAssertions: !1,
    isExpectingAssertionsError: null,
    expectedAssertionsNumber: null,
    expectedAssertionsNumberErrorGen: null,
    get testPath() {
      return tr().filepath;
    },
    currentTestName: n.currentTestName
  }, t), t.assert = m, t.extend = (s) => ht.extend(t, s), t.addEqualityTesters = (s) => Ap(s), t.soft = (...s) => t(...s).withContext({ soft: !0 }), t.poll = pg(t), t.unreachable = (s) => {
    m.fail(`expected${s ? ` "${s}" ` : " "}not to be reached`);
  };
  function r(s) {
    const i = () => /* @__PURE__ */ new Error(`expected number of assertions to be ${s}, but got ${t.getState().assertionCalls}`);
    Error.captureStackTrace && Error.captureStackTrace(i(), r), t.setState({
      expectedAssertionsNumber: s,
      expectedAssertionsNumberErrorGen: i
    });
  }
  function o() {
    const s = /* @__PURE__ */ new Error("expected any number of assertion, but got none");
    Error.captureStackTrace && Error.captureStackTrace(s, o), t.setState({
      isExpectingAssertions: !0,
      isExpectingAssertionsError: s
    });
  }
  return he.addMethod(t, "assertions", r), he.addMethod(t, "hasAssertions", o), t.extend(Sp), t;
}
const bg = yg();
Object.defineProperty(globalThis, Hn, {
  value: bg,
  writable: !0,
  configurable: !0
});
var St = {}, $r, lc;
function wg() {
  if (lc) return $r;
  lc = 1;
  var e;
  return typeof po < "u" ? e = po : typeof window < "u" ? e = window : e = self, $r = e, $r;
}
var xr, fc;
function Tg() {
  if (fc) return xr;
  fc = 1;
  let e;
  try {
    ({}).__proto__, e = !1;
  } catch {
    e = !0;
  }
  return xr = e, xr;
}
var _r, hc;
function Ft() {
  if (hc) return _r;
  hc = 1;
  var e = Function.call, t = Tg(), n = [
    // ignore size because it throws from Map
    "size",
    "caller",
    "callee",
    "arguments"
  ];
  return t && n.push("__proto__"), _r = function(o) {
    return Object.getOwnPropertyNames(o).reduce(
      function(s, i) {
        return n.includes(i) || typeof o[i] != "function" || (s[i] = e.bind(o[i])), s;
      },
      /* @__PURE__ */ Object.create(null)
    );
  }, _r;
}
var Mr, pc;
function jn() {
  if (pc) return Mr;
  pc = 1;
  var e = Ft();
  return Mr = e(Array.prototype), Mr;
}
var Or, dc;
function Sg() {
  if (dc) return Or;
  dc = 1;
  var e = jn().every;
  function t(o, s) {
    return o[s.id] === void 0 && (o[s.id] = 0), o[s.id] < s.callCount;
  }
  function n(o, s, i, a) {
    var u = !0;
    return i !== a.length - 1 && (u = s.calledBefore(a[i + 1])), t(o, s) && u ? (o[s.id] += 1, !0) : !1;
  }
  function r(o) {
    var s = {}, i = arguments.length > 1 ? arguments : o;
    return e(i, n.bind(null, s));
  }
  return Or = r, Or;
}
var Ar, mc;
function Eg() {
  if (mc) return Ar;
  mc = 1;
  function e(t) {
    return t.constructor && t.constructor.name || null;
  }
  return Ar = e, Ar;
}
var kr = {}, gc;
function vg() {
  return gc || (gc = 1, (function(e) {
    e.wrap = function(t, n) {
      var r = function() {
        return e.printWarning(n), t.apply(this, arguments);
      };
      return t.prototype && (r.prototype = t.prototype), r;
    }, e.defaultMsg = function(t, n) {
      return `${t}.${n} is deprecated and will be removed from the public API in a future version of ${t}.`;
    }, e.printWarning = function(t) {
      typeof process == "object" && process.emitWarning ? process.emitWarning(t) : console.info ? console.info(t) : console.log(t);
    };
  })(kr)), kr;
}
var Cr, yc;
function $g() {
  return yc || (yc = 1, Cr = function(t, n) {
    var r = !0;
    try {
      t.forEach(function() {
        if (!n.apply(this, arguments))
          throw new Error();
      });
    } catch {
      r = !1;
    }
    return r;
  }), Cr;
}
var Ir, bc;
function xg() {
  return bc || (bc = 1, Ir = function(t) {
    if (!t)
      return "";
    try {
      return t.displayName || t.name || // Use function decomposition as a last resort to get function
      // name. Does not rely on function decomposition to work - if it
      // doesn't debugging will be slightly less informative
      // (i.e. toString will say 'spy' rather than 'myFunc').
      (String(t).match(/function ([^\s(]+)/) || [])[1];
    } catch {
      return "";
    }
  }), Ir;
}
var Pr, wc;
function _g() {
  if (wc) return Pr;
  wc = 1;
  var e = jn().sort, t = jn().slice;
  function n(o, s) {
    var i = o.getCall(0), a = s.getCall(0), u = i && i.callId || -1, c = a && a.callId || -1;
    return u < c ? -1 : 1;
  }
  function r(o) {
    return e(t(o), n);
  }
  return Pr = r, Pr;
}
var Nr, Tc;
function Mg() {
  if (Tc) return Nr;
  Tc = 1;
  var e = Ft();
  return Nr = e(Function.prototype), Nr;
}
var jr, Sc;
function Og() {
  if (Sc) return jr;
  Sc = 1;
  var e = Ft();
  return jr = e(Map.prototype), jr;
}
var Rr, Ec;
function Ag() {
  if (Ec) return Rr;
  Ec = 1;
  var e = Ft();
  return Rr = e(Object.prototype), Rr;
}
var Dr, vc;
function kg() {
  if (vc) return Dr;
  vc = 1;
  var e = Ft();
  return Dr = e(Set.prototype), Dr;
}
var Fr, $c;
function Cg() {
  if ($c) return Fr;
  $c = 1;
  var e = Ft();
  return Fr = e(String.prototype), Fr;
}
var Lr, xc;
function Ig() {
  return xc || (xc = 1, Lr = {
    array: jn(),
    function: Mg(),
    map: Og(),
    object: Ag(),
    set: kg(),
    string: Cg()
  }), Lr;
}
var vn = { exports: {} }, Pg = vn.exports, _c;
function Ng() {
  return _c || (_c = 1, (function(e, t) {
    (function(n, r) {
      e.exports = r();
    })(Pg, (function() {
      var n = typeof Promise == "function", r = typeof self == "object" ? self : po, o = typeof Symbol < "u", s = typeof Map < "u", i = typeof Set < "u", a = typeof WeakMap < "u", u = typeof WeakSet < "u", c = typeof DataView < "u", l = o && typeof Symbol.iterator < "u", f = o && typeof Symbol.toStringTag < "u", h = i && typeof Set.prototype.entries == "function", p = s && typeof Map.prototype.entries == "function", d = h && Object.getPrototypeOf((/* @__PURE__ */ new Set()).entries()), g = p && Object.getPrototypeOf((/* @__PURE__ */ new Map()).entries()), w = l && typeof Array.prototype[Symbol.iterator] == "function", T = w && Object.getPrototypeOf([][Symbol.iterator]()), $ = l && typeof String.prototype[Symbol.iterator] == "function", k = $ && Object.getPrototypeOf(""[Symbol.iterator]()), _ = 8, O = -1;
      function I(M) {
        var L = typeof M;
        if (L !== "object")
          return L;
        if (M === null)
          return "null";
        if (M === r)
          return "global";
        if (Array.isArray(M) && (f === !1 || !(Symbol.toStringTag in M)))
          return "Array";
        if (typeof window == "object" && window !== null) {
          if (typeof window.location == "object" && M === window.location)
            return "Location";
          if (typeof window.document == "object" && M === window.document)
            return "Document";
          if (typeof window.navigator == "object") {
            if (typeof window.navigator.mimeTypes == "object" && M === window.navigator.mimeTypes)
              return "MimeTypeArray";
            if (typeof window.navigator.plugins == "object" && M === window.navigator.plugins)
              return "PluginArray";
          }
          if ((typeof window.HTMLElement == "function" || typeof window.HTMLElement == "object") && M instanceof window.HTMLElement) {
            if (M.tagName === "BLOCKQUOTE")
              return "HTMLQuoteElement";
            if (M.tagName === "TD")
              return "HTMLTableDataCellElement";
            if (M.tagName === "TH")
              return "HTMLTableHeaderCellElement";
          }
        }
        var ee = f && M[Symbol.toStringTag];
        if (typeof ee == "string")
          return ee;
        var j = Object.getPrototypeOf(M);
        return j === RegExp.prototype ? "RegExp" : j === Date.prototype ? "Date" : n && j === Promise.prototype ? "Promise" : i && j === Set.prototype ? "Set" : s && j === Map.prototype ? "Map" : u && j === WeakSet.prototype ? "WeakSet" : a && j === WeakMap.prototype ? "WeakMap" : c && j === DataView.prototype ? "DataView" : s && j === g ? "Map Iterator" : i && j === d ? "Set Iterator" : w && j === T ? "Array Iterator" : $ && j === k ? "String Iterator" : j === null ? "Object" : Object.prototype.toString.call(M).slice(_, O);
      }
      return I;
    }));
  })(vn)), vn.exports;
}
var qr, Mc;
function jg() {
  if (Mc) return qr;
  Mc = 1;
  var e = Ng();
  return qr = function(n) {
    return e(n).toLowerCase();
  }, qr;
}
var Br, Oc;
function Rg() {
  if (Oc) return Br;
  Oc = 1;
  function e(t) {
    return t && t.toString ? t.toString() : String(t);
  }
  return Br = e, Br;
}
var zr, Ac;
function Dg() {
  return Ac || (Ac = 1, zr = {
    global: wg(),
    calledInOrder: Sg(),
    className: Eg(),
    deprecated: vg(),
    every: $g(),
    functionName: xg(),
    orderByFirstCall: _g(),
    prototypes: Ig(),
    typeOf: jg(),
    valueToString: Rg()
  }), zr;
}
var kc;
function Fg() {
  if (kc) return St;
  kc = 1;
  const e = Dg().global;
  let t, n;
  if (typeof __vitest_required__ < "u") {
    try {
      t = __vitest_required__.timers;
    } catch {
    }
    try {
      n = __vitest_required__.timersPromises;
    } catch {
    }
  }
  function r(s) {
    const i = Math.pow(2, 31) - 1, a = 1e12, u = function() {
    }, c = function() {
      return [];
    }, l = {};
    let f, h = !1;
    s.setTimeout && (l.setTimeout = !0, f = s.setTimeout(u, 0), h = typeof f == "object"), l.clearTimeout = !!s.clearTimeout, l.setInterval = !!s.setInterval, l.clearInterval = !!s.clearInterval, l.hrtime = s.process && typeof s.process.hrtime == "function", l.hrtimeBigint = l.hrtime && typeof s.process.hrtime.bigint == "function", l.nextTick = s.process && typeof s.process.nextTick == "function";
    const p = s.process && s.__vitest_required__ && s.__vitest_required__.util.promisify;
    l.performance = s.performance && typeof s.performance.now == "function";
    const d = s.Performance && (typeof s.Performance).match(/^(function|object)$/), g = s.performance && s.performance.constructor && s.performance.constructor.prototype;
    l.queueMicrotask = s.hasOwnProperty("queueMicrotask"), l.requestAnimationFrame = s.requestAnimationFrame && typeof s.requestAnimationFrame == "function", l.cancelAnimationFrame = s.cancelAnimationFrame && typeof s.cancelAnimationFrame == "function", l.requestIdleCallback = s.requestIdleCallback && typeof s.requestIdleCallback == "function", l.cancelIdleCallbackPresent = s.cancelIdleCallback && typeof s.cancelIdleCallback == "function", l.setImmediate = s.setImmediate && typeof s.setImmediate == "function", l.clearImmediate = s.clearImmediate && typeof s.clearImmediate == "function", l.Intl = s.Intl && typeof s.Intl == "object", s.clearTimeout && s.clearTimeout(f);
    const w = s.Date, T = l.Intl ? Object.defineProperties(
      /* @__PURE__ */ Object.create(null),
      Object.getOwnPropertyDescriptors(s.Intl)
    ) : void 0;
    let $ = a;
    if (w === void 0)
      throw new Error(
        "The global scope doesn't have a `Date` object (see https://github.com/sinonjs/sinon/issues/1852#issuecomment-419622780)"
      );
    l.Date = !0;
    class k {
      constructor(x, A, P, b) {
        this.name = x, this.entryType = A, this.startTime = P, this.duration = b;
      }
      toJSON() {
        return JSON.stringify({ ...this });
      }
    }
    function _(E) {
      return Number.isFinite ? Number.isFinite(E) : isFinite(E);
    }
    let O = !1;
    function I(E, x) {
      E.loopLimit && x === E.loopLimit - 1 && (O = !0);
    }
    function M() {
      O = !1;
    }
    function L(E) {
      if (!E)
        return 0;
      const x = E.split(":"), A = x.length;
      let P = A, b = 0, D;
      if (A > 3 || !/^(\d\d:){0,2}\d\d?$/.test(E))
        throw new Error(
          "tick only understands numbers, 'm:s' and 'h:m:s'. Each part must be two digits"
        );
      for (; P--; ) {
        if (D = parseInt(x[P], 10), D >= 60)
          throw new Error(`Invalid time ${E}`);
        b += D * Math.pow(60, A - P - 1);
      }
      return b * 1e3;
    }
    function ee(E) {
      const A = E * 1e6 % 1e6, P = A < 0 ? A + 1e6 : A;
      return Math.floor(P);
    }
    function j(E) {
      if (!E)
        return 0;
      if (typeof E.getTime == "function")
        return E.getTime();
      if (typeof E == "number")
        return E;
      throw new TypeError("now should be milliseconds since UNIX epoch");
    }
    function G(E, x, A) {
      return A && A.callAt >= E && A.callAt <= x;
    }
    function H(E, x) {
      const A = new Error(
        `Aborting after running ${E.loopLimit} timers, assuming an infinite loop!`
      );
      if (!x.error)
        return A;
      const P = /target\.*[<|(|[].*?[>|\]|)]\s*/;
      let b = new RegExp(
        String(Object.keys(E).join("|"))
      );
      h && (b = new RegExp(
        `\\s+at (Object\\.)?(?:${Object.keys(E).join("|")})\\s+`
      ));
      let D = -1;
      x.error.stack.split(`
`).some(function(B, z) {
        return B.match(P) ? (D = z, !0) : B.match(b) ? (D = z, !1) : D >= 0;
      });
      const V = `${A}
${x.type || "Microtask"} - ${x.func.name || "anonymous"}
${x.error.stack.split(`
`).slice(D + 1).join(`
`)}`;
      try {
        Object.defineProperty(A, "stack", {
          value: V
        });
      } catch {
      }
      return A;
    }
    function ae() {
      class E extends w {
        /**
         * @param {number} year
         * @param {number} month
         * @param {number} date
         * @param {number} hour
         * @param {number} minute
         * @param {number} second
         * @param {number} ms
         * @returns void
         */
        // eslint-disable-next-line no-unused-vars
        constructor(P, b, D, V, B, z, R) {
          arguments.length === 0 ? super(E.clock.now) : super(...arguments), Object.defineProperty(this, "constructor", {
            value: w,
            enumerable: !1
          });
        }
        static [Symbol.hasInstance](P) {
          return P instanceof w;
        }
      }
      return E.isFake = !0, w.now && (E.now = function() {
        return E.clock.now;
      }), w.toSource && (E.toSource = function() {
        return w.toSource();
      }), E.toString = function() {
        return w.toString();
      }, new Proxy(E, {
        // handler for [[Call]] invocations (i.e. not using `new`)
        apply() {
          if (this instanceof E)
            throw new TypeError(
              "A Proxy should only capture `new` calls with the `construct` handler. This is not supposed to be possible, so check the logic."
            );
          return new w(E.clock.now).toString();
        }
      });
    }
    function ue() {
      const E = {};
      return Object.getOwnPropertyNames(T).forEach(
        (x) => E[x] = T[x]
      ), E.DateTimeFormat = function(...x) {
        const A = new T.DateTimeFormat(...x), P = {};
        return ["formatRange", "formatRangeToParts", "resolvedOptions"].forEach(
          (b) => {
            P[b] = A[b].bind(A);
          }
        ), ["format", "formatToParts"].forEach((b) => {
          P[b] = function(D) {
            return A[b](D || E.clock.now);
          };
        }), P;
      }, E.DateTimeFormat.prototype = Object.create(
        T.DateTimeFormat.prototype
      ), E.DateTimeFormat.supportedLocalesOf = T.DateTimeFormat.supportedLocalesOf, E;
    }
    function re(E, x) {
      E.jobs || (E.jobs = []), E.jobs.push(x);
    }
    function Y(E) {
      if (E.jobs) {
        for (let x = 0; x < E.jobs.length; x++) {
          const A = E.jobs[x];
          if (A.func.apply(null, A.args), I(E, x), E.loopLimit && x > E.loopLimit)
            throw H(E, A);
        }
        M(), E.jobs = [];
      }
    }
    function te(E, x) {
      if (x.func === void 0)
        throw new Error("Callback must be provided to timer calls");
      if (h && typeof x.func != "function")
        throw new TypeError(
          `[ERR_INVALID_CALLBACK]: Callback must be a function. Received ${x.func} of type ${typeof x.func}`
        );
      if (O && (x.error = new Error()), x.type = x.immediate ? "Immediate" : "Timeout", x.hasOwnProperty("delay") && (typeof x.delay != "number" && (x.delay = parseInt(x.delay, 10)), _(x.delay) || (x.delay = 0), x.delay = x.delay > i ? 1 : x.delay, x.delay = Math.max(0, x.delay)), x.hasOwnProperty("interval") && (x.type = "Interval", x.interval = x.interval > i ? 1 : x.interval), x.hasOwnProperty("animation") && (x.type = "AnimationFrame", x.animation = !0), x.hasOwnProperty("idleCallback") && (x.type = "IdleCallback", x.idleCallback = !0), E.timers || (E.timers = {}), x.id = $++, x.createdAt = E.now, x.callAt = E.now + (parseInt(x.delay) || (E.duringTick ? 1 : 0)), E.timers[x.id] = x, h) {
        const A = {
          refed: !0,
          ref: function() {
            return this.refed = !0, A;
          },
          unref: function() {
            return this.refed = !1, A;
          },
          hasRef: function() {
            return this.refed;
          },
          refresh: function() {
            return x.callAt = E.now + (parseInt(x.delay) || (E.duringTick ? 1 : 0)), E.timers[x.id] = x, A;
          },
          [Symbol.toPrimitive]: function() {
            return x.id;
          }
        };
        return A;
      }
      return x.id;
    }
    function $e(E, x) {
      if (E.callAt < x.callAt)
        return -1;
      if (E.callAt > x.callAt)
        return 1;
      if (E.immediate && !x.immediate)
        return -1;
      if (!E.immediate && x.immediate)
        return 1;
      if (E.createdAt < x.createdAt)
        return -1;
      if (E.createdAt > x.createdAt)
        return 1;
      if (E.id < x.id)
        return -1;
      if (E.id > x.id)
        return 1;
    }
    function le(E, x, A) {
      const P = E.timers;
      let b = null, D, V;
      for (D in P)
        P.hasOwnProperty(D) && (V = G(x, A, P[D]), V && (!b || $e(b, P[D]) === 1) && (b = P[D]));
      return b;
    }
    function me(E) {
      const x = E.timers;
      let A = null, P;
      for (P in x)
        x.hasOwnProperty(P) && (!A || $e(A, x[P]) === 1) && (A = x[P]);
      return A;
    }
    function Pe(E) {
      const x = E.timers;
      let A = null, P;
      for (P in x)
        x.hasOwnProperty(P) && (!A || $e(A, x[P]) === -1) && (A = x[P]);
      return A;
    }
    function be(E, x) {
      if (typeof x.interval == "number" ? E.timers[x.id].callAt += x.interval : delete E.timers[x.id], typeof x.func == "function")
        x.func.apply(null, x.args);
      else {
        const A = eval;
        (function() {
          A(x.func);
        })();
      }
    }
    function Te(E) {
      return E === "IdleCallback" || E === "AnimationFrame" ? `cancel${E}` : `clear${E}`;
    }
    function Ye(E) {
      return E === "IdleCallback" || E === "AnimationFrame" ? `request${E}` : `set${E}`;
    }
    function ke() {
      let E = 0;
      return function(x) {
        !E++ && console.warn(x);
      };
    }
    const Se = ke();
    function Ee(E, x, A) {
      if (!x)
        return;
      E.timers || (E.timers = {});
      const P = Number(x);
      if (Number.isNaN(P) || P < a) {
        const b = Te(A);
        if (E.shouldClearNativeTimers === !0) {
          const D = E[`_${b}`];
          return typeof D == "function" ? D(x) : void 0;
        }
        Se(
          `FakeTimers: ${b} was invoked to clear a native timer instead of one created by this library.
To automatically clean-up native timers, use \`shouldClearNativeTimers\`.`
        );
      }
      if (E.timers.hasOwnProperty(P)) {
        const b = E.timers[P];
        if (b.type === A || b.type === "Timeout" && A === "Interval" || b.type === "Interval" && A === "Timeout")
          delete E.timers[P];
        else {
          const D = Te(A), V = Ye(b.type);
          throw new Error(
            `Cannot clear timer: timer created with ${V}() but cleared with ${D}()`
          );
        }
      }
    }
    function Tt(E, x) {
      let A, P, b;
      const D = "_hrtime", V = "_nextTick";
      for (P = 0, b = E.methods.length; P < b; P++) {
        if (A = E.methods[P], A === "hrtime" && s.process)
          s.process.hrtime = E[D];
        else if (A === "nextTick" && s.process)
          s.process.nextTick = E[V];
        else if (A === "performance") {
          const B = Object.getOwnPropertyDescriptor(
            E,
            `_${A}`
          );
          B && B.get && !B.set ? Object.defineProperty(
            s,
            A,
            B
          ) : B.configurable && (s[A] = E[`_${A}`]);
        } else if (s[A] && s[A].hadOwnProperty)
          s[A] = E[`_${A}`];
        else
          try {
            delete s[A];
          } catch {
          }
        if (E.timersModuleMethods !== void 0)
          for (let B = 0; B < E.timersModuleMethods.length; B++) {
            const z = E.timersModuleMethods[B];
            t[z.methodName] = z.original;
          }
        if (E.timersPromisesModuleMethods !== void 0)
          for (let B = 0; B < E.timersPromisesModuleMethods.length; B++) {
            const z = E.timersPromisesModuleMethods[B];
            n[z.methodName] = z.original;
          }
      }
      x.shouldAdvanceTime === !0 && s.clearInterval(E.attachedInterval), E.methods = [];
      for (const [B, z] of E.abortListenerMap.entries())
        z.removeEventListener("abort", B), E.abortListenerMap.delete(B);
      return E.timers ? Object.keys(E.timers).map(function(z) {
        return E.timers[z];
      }) : [];
    }
    function We(E, x, A) {
      if (A[x].hadOwnProperty = Object.prototype.hasOwnProperty.call(
        E,
        x
      ), A[`_${x}`] = E[x], x === "Date")
        E[x] = A[x];
      else if (x === "Intl")
        E[x] = A[x];
      else if (x === "performance") {
        const P = Object.getOwnPropertyDescriptor(
          E,
          x
        );
        if (P && P.get && !P.set) {
          Object.defineProperty(
            A,
            `_${x}`,
            P
          );
          const b = Object.getOwnPropertyDescriptor(
            A,
            x
          );
          Object.defineProperty(E, x, b);
        } else
          E[x] = A[x];
      } else
        E[x] = function() {
          return A[x].apply(A, arguments);
        }, Object.defineProperties(
          E[x],
          Object.getOwnPropertyDescriptors(A[x])
        );
      E[x].clock = A;
    }
    function Lt(E, x) {
      E.tick(x);
    }
    const ge = {
      setTimeout: s.setTimeout,
      clearTimeout: s.clearTimeout,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
      Date: s.Date
    };
    l.setImmediate && (ge.setImmediate = s.setImmediate), l.clearImmediate && (ge.clearImmediate = s.clearImmediate), l.hrtime && (ge.hrtime = s.process.hrtime), l.nextTick && (ge.nextTick = s.process.nextTick), l.performance && (ge.performance = s.performance), l.requestAnimationFrame && (ge.requestAnimationFrame = s.requestAnimationFrame), l.queueMicrotask && (ge.queueMicrotask = s.queueMicrotask), l.cancelAnimationFrame && (ge.cancelAnimationFrame = s.cancelAnimationFrame), l.requestIdleCallback && (ge.requestIdleCallback = s.requestIdleCallback), l.cancelIdleCallback && (ge.cancelIdleCallback = s.cancelIdleCallback), l.Intl && (ge.Intl = T);
    const Je = s.setImmediate || s.setTimeout;
    function Ss(E, x) {
      E = Math.floor(j(E)), x = x || 1e3;
      let A = 0;
      const P = [0, 0], b = {
        now: E,
        Date: ae(),
        loopLimit: x
      };
      b.Date.clock = b;
      function D() {
        return 16 - (b.now - E) % 16;
      }
      function V(R) {
        const C = b.now - P[0] - E, N = Math.floor(C / 1e3), F = (C - N * 1e3) * 1e6 + A - P[1];
        if (Array.isArray(R)) {
          if (R[1] > 1e9)
            throw new TypeError(
              "Number of nanoseconds can't exceed a billion"
            );
          const X = R[0];
          let oe = F - R[1], Xe = N - X;
          return oe < 0 && (oe += 1e9, Xe -= 1), [Xe, oe];
        }
        return [N, F];
      }
      function B() {
        const R = V();
        return R[0] * 1e3 + R[1] / 1e6;
      }
      l.hrtimeBigint && (V.bigint = function() {
        const R = V();
        return BigInt(R[0]) * BigInt(1e9) + BigInt(R[1]);
      }), l.Intl && (b.Intl = ue(), b.Intl.clock = b), b.requestIdleCallback = function(C, N) {
        let F = 0;
        b.countTimers() > 0 && (F = 50);
        const X = te(b, {
          func: C,
          args: Array.prototype.slice.call(arguments, 2),
          delay: typeof N > "u" ? F : Math.min(N, F),
          idleCallback: !0
        });
        return Number(X);
      }, b.cancelIdleCallback = function(C) {
        return Ee(b, C, "IdleCallback");
      }, b.setTimeout = function(C, N) {
        return te(b, {
          func: C,
          args: Array.prototype.slice.call(arguments, 2),
          delay: N
        });
      }, typeof s.Promise < "u" && p && (b.setTimeout[p.custom] = function(C, N) {
        return new s.Promise(function(X) {
          te(b, {
            func: X,
            args: [N],
            delay: C
          });
        });
      }), b.clearTimeout = function(C) {
        return Ee(b, C, "Timeout");
      }, b.nextTick = function(C) {
        return re(b, {
          func: C,
          args: Array.prototype.slice.call(arguments, 1),
          error: O ? new Error() : null
        });
      }, b.queueMicrotask = function(C) {
        return b.nextTick(C);
      }, b.setInterval = function(C, N) {
        return N = parseInt(N, 10), te(b, {
          func: C,
          args: Array.prototype.slice.call(arguments, 2),
          delay: N,
          interval: N
        });
      }, b.clearInterval = function(C) {
        return Ee(b, C, "Interval");
      }, l.setImmediate && (b.setImmediate = function(C) {
        return te(b, {
          func: C,
          args: Array.prototype.slice.call(arguments, 1),
          immediate: !0
        });
      }, typeof s.Promise < "u" && p && (b.setImmediate[p.custom] = function(C) {
        return new s.Promise(
          function(F) {
            te(b, {
              func: F,
              args: [C],
              immediate: !0
            });
          }
        );
      }), b.clearImmediate = function(C) {
        return Ee(b, C, "Immediate");
      }), b.countTimers = function() {
        return Object.keys(b.timers || {}).length + (b.jobs || []).length;
      }, b.requestAnimationFrame = function(C) {
        const N = te(b, {
          func: C,
          delay: D(),
          get args() {
            return [B()];
          },
          animation: !0
        });
        return Number(N);
      }, b.cancelAnimationFrame = function(C) {
        return Ee(b, C, "AnimationFrame");
      }, b.runMicrotasks = function() {
        Y(b);
      };
      function z(R, C, N, F) {
        const X = typeof R == "number" ? R : L(R), oe = Math.floor(X), Xe = ee(X);
        let Ne = A + Xe, fe = b.now + oe;
        if (X < 0)
          throw new TypeError("Negative ticks are not supported");
        Ne >= 1e6 && (fe += 1, Ne -= 1e6), A = Ne;
        let je = b.now, at = b.now, Re, Qe, xe, Es, rr, or;
        b.duringTick = !0, xe = b.now, Y(b), xe !== b.now && (je += b.now - xe, fe += b.now - xe);
        function vs() {
          for (Re = le(b, je, fe); Re && je <= fe; ) {
            if (b.timers[Re.id]) {
              je = Re.callAt, b.now = Re.callAt, xe = b.now;
              try {
                Y(b), be(b, Re);
              } catch (qt) {
                Qe = Qe || qt;
              }
              if (C) {
                Je(Es);
                return;
              }
              rr();
            }
            or();
          }
          if (xe = b.now, Y(b), xe !== b.now && (je += b.now - xe, fe += b.now - xe), b.duringTick = !1, Re = le(b, je, fe), Re)
            try {
              b.tick(fe - b.now);
            } catch (qt) {
              Qe = Qe || qt;
            }
          else
            b.now = fe, A = Ne;
          if (Qe)
            throw Qe;
          if (C)
            N(b.now);
          else
            return b.now;
        }
        return Es = C && function() {
          try {
            rr(), or(), vs();
          } catch (qt) {
            F(qt);
          }
        }, rr = function() {
          xe !== b.now && (je += b.now - xe, fe += b.now - xe, at += b.now - xe);
        }, or = function() {
          Re = le(b, at, fe), at = je;
        }, vs();
      }
      return b.tick = function(C) {
        return z(C, !1);
      }, typeof s.Promise < "u" && (b.tickAsync = function(C) {
        return new s.Promise(function(N, F) {
          Je(function() {
            try {
              z(C, !0, N, F);
            } catch (X) {
              F(X);
            }
          });
        });
      }), b.next = function() {
        Y(b);
        const C = me(b);
        if (!C)
          return b.now;
        b.duringTick = !0;
        try {
          return b.now = C.callAt, be(b, C), Y(b), b.now;
        } finally {
          b.duringTick = !1;
        }
      }, typeof s.Promise < "u" && (b.nextAsync = function() {
        return new s.Promise(function(C, N) {
          Je(function() {
            try {
              const F = me(b);
              if (!F) {
                C(b.now);
                return;
              }
              let X;
              b.duringTick = !0, b.now = F.callAt;
              try {
                be(b, F);
              } catch (oe) {
                X = oe;
              }
              b.duringTick = !1, Je(function() {
                X ? N(X) : C(b.now);
              });
            } catch (F) {
              N(F);
            }
          });
        });
      }), b.runAll = function() {
        let C, N;
        for (Y(b), N = 0; N < b.loopLimit; N++) {
          if (!b.timers || (C = Object.keys(b.timers).length, C === 0))
            return M(), b.now;
          b.next(), I(b, N);
        }
        const F = me(b);
        throw H(b, F);
      }, b.runToFrame = function() {
        return b.tick(D());
      }, typeof s.Promise < "u" && (b.runAllAsync = function() {
        return new s.Promise(function(C, N) {
          let F = 0;
          function X() {
            Je(function() {
              try {
                Y(b);
                let oe;
                if (F < b.loopLimit) {
                  if (!b.timers) {
                    M(), C(b.now);
                    return;
                  }
                  if (oe = Object.keys(
                    b.timers
                  ).length, oe === 0) {
                    M(), C(b.now);
                    return;
                  }
                  b.next(), F++, X(), I(b, F);
                  return;
                }
                const Xe = me(b);
                N(H(b, Xe));
              } catch (oe) {
                N(oe);
              }
            });
          }
          X();
        });
      }), b.runToLast = function() {
        const C = Pe(b);
        return C ? b.tick(C.callAt - b.now) : (Y(b), b.now);
      }, typeof s.Promise < "u" && (b.runToLastAsync = function() {
        return new s.Promise(function(C, N) {
          Je(function() {
            try {
              const F = Pe(b);
              F || (Y(b), C(b.now)), C(b.tickAsync(F.callAt - b.now));
            } catch (F) {
              N(F);
            }
          });
        });
      }), b.reset = function() {
        A = 0, b.timers = {}, b.jobs = [], b.now = E;
      }, b.setSystemTime = function(C) {
        const N = j(C), F = N - b.now;
        let X, oe;
        P[0] = P[0] + F, P[1] = P[1] + A, b.now = N, A = 0;
        for (X in b.timers)
          b.timers.hasOwnProperty(X) && (oe = b.timers[X], oe.createdAt += F, oe.callAt += F);
      }, b.jump = function(C) {
        const N = typeof C == "number" ? C : L(C), F = Math.floor(N);
        for (const X of Object.values(b.timers))
          b.now + F > X.callAt && (X.callAt = b.now + F);
        b.tick(F);
      }, l.performance && (b.performance = /* @__PURE__ */ Object.create(null), b.performance.now = B), l.hrtime && (b.hrtime = V), b;
    }
    function Bu(E) {
      if (arguments.length > 1 || E instanceof Date || Array.isArray(E) || typeof E == "number")
        throw new TypeError(
          `FakeTimers.install called with ${String(
            E
          )} install requires an object parameter`
        );
      if (s.Date.isFake === !0)
        throw new TypeError(
          "Can't install fake timers twice on the same global object."
        );
      if (E = typeof E < "u" ? E : {}, E.shouldAdvanceTime = E.shouldAdvanceTime || !1, E.advanceTimeDelta = E.advanceTimeDelta || 20, E.shouldClearNativeTimers = E.shouldClearNativeTimers || !1, E.target)
        throw new TypeError(
          "config.target is no longer supported. Use `withGlobal(target)` instead."
        );
      function x(D) {
        if (!E.ignoreMissingTimers)
          throw new ReferenceError(
            `non-existent timers and/or objects cannot be faked: '${D}'`
          );
      }
      let A, P;
      const b = Ss(E.now, E.loopLimit);
      if (b.shouldClearNativeTimers = E.shouldClearNativeTimers, b.uninstall = function() {
        return Tt(b, E);
      }, b.abortListenerMap = /* @__PURE__ */ new Map(), b.methods = E.toFake || [], b.methods.length === 0 && (b.methods = Object.keys(ge)), E.shouldAdvanceTime === !0) {
        const D = Lt.bind(
          null,
          b,
          E.advanceTimeDelta
        ), V = s.setInterval(
          D,
          E.advanceTimeDelta
        );
        b.attachedInterval = V;
      }
      if (b.methods.includes("performance")) {
        const D = (() => {
          if (g)
            return s.performance.constructor.prototype;
          if (d)
            return s.Performance.prototype;
        })();
        if (D)
          Object.getOwnPropertyNames(D).forEach(function(V) {
            V !== "now" && (b.performance[V] = V.indexOf("getEntries") === 0 ? c : u);
          }), b.performance.mark = (V) => new k(V, "mark", 0, 0), b.performance.measure = (V) => new k(V, "measure", 0, 100), b.performance.timeOrigin = j(E.now);
        else if ((E.toFake || []).includes("performance"))
          return x("performance");
      }
      for (s === e && t && (b.timersModuleMethods = []), s === e && n && (b.timersPromisesModuleMethods = []), A = 0, P = b.methods.length; A < P; A++) {
        const D = b.methods[A];
        if (!l[D]) {
          x(D);
          continue;
        }
        if (D === "hrtime" ? s.process && typeof s.process.hrtime == "function" && We(s.process, D, b) : D === "nextTick" ? s.process && typeof s.process.nextTick == "function" && We(s.process, D, b) : We(s, D, b), b.timersModuleMethods !== void 0 && t[D]) {
          const V = t[D];
          b.timersModuleMethods.push({
            methodName: D,
            original: V
          }), t[D] = s[D];
        }
        b.timersPromisesModuleMethods !== void 0 && (D === "setTimeout" ? (b.timersPromisesModuleMethods.push({
          methodName: "setTimeout",
          original: n.setTimeout
        }), n.setTimeout = (V, B, z = {}) => new Promise((R, C) => {
          const N = () => {
            z.signal.removeEventListener(
              "abort",
              N
            ), b.abortListenerMap.delete(N), b.clearTimeout(F), C(z.signal.reason);
          }, F = b.setTimeout(() => {
            z.signal && (z.signal.removeEventListener(
              "abort",
              N
            ), b.abortListenerMap.delete(N)), R(B);
          }, V);
          z.signal && (z.signal.aborted ? N() : (z.signal.addEventListener(
            "abort",
            N
          ), b.abortListenerMap.set(
            N,
            z.signal
          )));
        })) : D === "setImmediate" ? (b.timersPromisesModuleMethods.push({
          methodName: "setImmediate",
          original: n.setImmediate
        }), n.setImmediate = (V, B = {}) => new Promise((z, R) => {
          const C = () => {
            B.signal.removeEventListener(
              "abort",
              C
            ), b.abortListenerMap.delete(C), b.clearImmediate(N), R(B.signal.reason);
          }, N = b.setImmediate(() => {
            B.signal && (B.signal.removeEventListener(
              "abort",
              C
            ), b.abortListenerMap.delete(C)), z(V);
          });
          B.signal && (B.signal.aborted ? C() : (B.signal.addEventListener(
            "abort",
            C
          ), b.abortListenerMap.set(
            C,
            B.signal
          )));
        })) : D === "setInterval" && (b.timersPromisesModuleMethods.push({
          methodName: "setInterval",
          original: n.setInterval
        }), n.setInterval = (V, B, z = {}) => ({
          [Symbol.asyncIterator]: () => {
            const R = () => {
              let fe, je;
              const at = new Promise((Re, Qe) => {
                fe = Re, je = Qe;
              });
              return at.resolve = fe, at.reject = je, at;
            };
            let C = !1, N = !1, F, X = 0;
            const oe = [], Xe = b.setInterval(() => {
              oe.length > 0 ? oe.shift().resolve() : X++;
            }, V), Ne = () => {
              z.signal.removeEventListener(
                "abort",
                Ne
              ), b.abortListenerMap.delete(Ne), b.clearInterval(Xe), C = !0;
              for (const fe of oe)
                fe.resolve();
            };
            return z.signal && (z.signal.aborted ? C = !0 : (z.signal.addEventListener(
              "abort",
              Ne
            ), b.abortListenerMap.set(
              Ne,
              z.signal
            ))), {
              next: async () => {
                if (z.signal?.aborted && !N)
                  throw N = !0, z.signal.reason;
                if (C)
                  return { done: !0, value: void 0 };
                if (X > 0)
                  return X--, { done: !1, value: B };
                const fe = R();
                if (oe.push(fe), await fe, F && oe.length === 0 && F.resolve(), z.signal?.aborted && !N)
                  throw N = !0, z.signal.reason;
                return C ? { done: !0, value: void 0 } : { done: !1, value: B };
              },
              return: async () => C ? { done: !0, value: void 0 } : (oe.length > 0 && (F = R(), await F), b.clearInterval(Xe), C = !0, z.signal && (z.signal.removeEventListener(
                "abort",
                Ne
              ), b.abortListenerMap.delete(Ne)), { done: !0, value: void 0 })
            };
          }
        })));
      }
      return b;
    }
    return {
      timers: ge,
      createClock: Ss,
      install: Bu,
      withGlobal: r
    };
  }
  const o = r(e);
  return St.timers = o.timers, St.createClock = o.createClock, St.install = o.install, St.withGlobal = r, St;
}
var Lg = Fg();
class qg {
  _global;
  _clock;
  // | _fakingTime | _fakingDate |
  // +-------------+-------------+
  // | false       | falsy       | initial
  // | false       | truthy      | vi.setSystemTime called first (for mocking only Date without fake timers)
  // | true        | falsy       | vi.useFakeTimers called first
  // | true        | truthy      | unreachable
  _fakingTime;
  _fakingDate;
  _fakeTimers;
  _userConfig;
  _now = Fe.now;
  constructor({ global: t, config: n }) {
    this._userConfig = n, this._fakingDate = null, this._fakingTime = !1, this._fakeTimers = Lg.withGlobal(t), this._global = t;
  }
  clearAllTimers() {
    this._fakingTime && this._clock.reset();
  }
  dispose() {
    this.useRealTimers();
  }
  runAllTimers() {
    this._checkFakeTimers() && this._clock.runAll();
  }
  async runAllTimersAsync() {
    this._checkFakeTimers() && await this._clock.runAllAsync();
  }
  runOnlyPendingTimers() {
    this._checkFakeTimers() && this._clock.runToLast();
  }
  async runOnlyPendingTimersAsync() {
    this._checkFakeTimers() && await this._clock.runToLastAsync();
  }
  advanceTimersToNextTimer(t = 1) {
    if (this._checkFakeTimers()) for (let n = t; n > 0 && (this._clock.next(), this._clock.tick(0), this._clock.countTimers() !== 0); n--)
      ;
  }
  async advanceTimersToNextTimerAsync(t = 1) {
    if (this._checkFakeTimers()) for (let n = t; n > 0 && (await this._clock.nextAsync(), this._clock.tick(0), this._clock.countTimers() !== 0); n--)
      ;
  }
  advanceTimersByTime(t) {
    this._checkFakeTimers() && this._clock.tick(t);
  }
  async advanceTimersByTimeAsync(t) {
    this._checkFakeTimers() && await this._clock.tickAsync(t);
  }
  advanceTimersToNextFrame() {
    this._checkFakeTimers() && this._clock.runToFrame();
  }
  runAllTicks() {
    this._checkFakeTimers() && this._clock.runMicrotasks();
  }
  useRealTimers() {
    this._fakingDate && (cc(), this._fakingDate = null), this._fakingTime && (this._clock.uninstall(), this._fakingTime = !1);
  }
  useFakeTimers() {
    const t = this._fakingDate || Date.now();
    this._fakingDate && (cc(), this._fakingDate = null), this._fakingTime && this._clock.uninstall();
    const n = Object.keys(this._fakeTimers.timers).filter((r) => r !== "nextTick" && r !== "queueMicrotask");
    if (this._userConfig?.toFake?.includes("nextTick") && Iu()) throw new Error("process.nextTick cannot be mocked inside child_process");
    this._clock = this._fakeTimers.install({
      now: t,
      ...this._userConfig,
      toFake: this._userConfig?.toFake || n,
      ignoreMissingTimers: !0
    }), this._fakingTime = !0;
  }
  reset() {
    if (this._checkFakeTimers()) {
      const { now: t } = this._clock;
      this._clock.reset(), this._clock.setSystemTime(t);
    }
  }
  setSystemTime(t) {
    const n = typeof t > "u" || t instanceof Date ? t : new Date(t);
    this._fakingTime ? this._clock.setSystemTime(n) : (this._fakingDate = n ?? new Date(this.getRealSystemTime()), fg(this._fakingDate));
  }
  getMockedSystemTime() {
    return this._fakingTime ? new Date(this._clock.now) : this._fakingDate;
  }
  getRealSystemTime() {
    return this._now();
  }
  getTimerCount() {
    return this._checkFakeTimers() ? this._clock.countTimers() : 0;
  }
  configure(t) {
    this._userConfig = t;
  }
  isFakeTimers() {
    return this._fakingTime;
  }
  _checkFakeTimers() {
    if (!this._fakingTime) throw new Error("A function to advance timers was called but the timers APIs are not mocked. Call `vi.useFakeTimers()` in the test file first.");
    return this._fakingTime;
  }
}
function qu(e, t) {
  return t.stack !== void 0 && (e.stack = t.stack.replace(t.message, e.message)), e;
}
function Bg(e, t = {}) {
  const { setTimeout: n, setInterval: r, clearTimeout: o, clearInterval: s } = Dt(), { interval: i = 50, timeout: a = 1e3 } = typeof t == "number" ? { timeout: t } : t, u = /* @__PURE__ */ new Error("STACK_TRACE_ERROR");
  return new Promise((c, l) => {
    let f, h = "idle", p, d;
    const g = ($) => {
      p && o(p), d && s(d), c($);
    }, w = () => {
      d && s(d);
      let $ = f;
      $ || ($ = qu(/* @__PURE__ */ new Error("Timed out in waitFor!"), u)), l($);
    }, T = () => {
      if (ne.isFakeTimers() && ne.advanceTimersByTime(i), h !== "pending")
        try {
          const $ = e();
          if ($ !== null && typeof $ == "object" && typeof $.then == "function") {
            const k = $;
            h = "pending", k.then((_) => {
              h = "resolved", g(_);
            }, (_) => {
              h = "rejected", f = _;
            });
          } else
            return g($), !0;
        } catch ($) {
          f = $;
        }
    };
    T() !== !0 && (p = n(w, a), d = r(T, i));
  });
}
function zg(e, t = {}) {
  const { setTimeout: n, setInterval: r, clearTimeout: o, clearInterval: s } = Dt(), { interval: i = 50, timeout: a = 1e3 } = typeof t == "number" ? { timeout: t } : t, u = /* @__PURE__ */ new Error("STACK_TRACE_ERROR");
  return new Promise((c, l) => {
    let f = "idle", h, p;
    const d = (T) => {
      p && s(p), T || (T = qu(/* @__PURE__ */ new Error("Timed out in waitUntil!"), u)), l(T);
    }, g = (T) => {
      if (T)
        return h && o(h), p && s(p), c(T), !0;
    }, w = () => {
      if (ne.isFakeTimers() && ne.advanceTimersByTime(i), f !== "pending")
        try {
          const T = e();
          if (T !== null && typeof T == "object" && typeof T.then == "function") {
            const $ = T;
            f = "pending", $.then((k) => {
              f = "resolved", g(k);
            }, (k) => {
              f = "rejected", d(k);
            });
          } else return g(T);
        } catch (T) {
          d(T);
        }
    };
    w() !== !0 && (h = n(d, a), p = r(w, i));
  });
}
function Wg() {
  let e = null;
  const t = () => tr();
  let n;
  const r = () => n ||= new qg({
    global: globalThis,
    config: t().config.fakeTimers
  }), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), i = [
    "PROD",
    "DEV",
    "SSR"
  ], a = {
    useFakeTimers(u) {
      if (Iu() && (u?.toFake?.includes("nextTick") || t().config?.fakeTimers?.toFake?.includes("nextTick")))
        throw new Error('vi.useFakeTimers({ toFake: ["nextTick"] }) is not supported in node:child_process. Use --pool=threads if mocking nextTick is required.');
      return u ? r().configure({
        ...t().config.fakeTimers,
        ...u
      }) : r().configure(t().config.fakeTimers), r().useFakeTimers(), a;
    },
    isFakeTimers() {
      return r().isFakeTimers();
    },
    useRealTimers() {
      return r().useRealTimers(), a;
    },
    runOnlyPendingTimers() {
      return r().runOnlyPendingTimers(), a;
    },
    async runOnlyPendingTimersAsync() {
      return await r().runOnlyPendingTimersAsync(), a;
    },
    runAllTimers() {
      return r().runAllTimers(), a;
    },
    async runAllTimersAsync() {
      return await r().runAllTimersAsync(), a;
    },
    runAllTicks() {
      return r().runAllTicks(), a;
    },
    advanceTimersByTime(u) {
      return r().advanceTimersByTime(u), a;
    },
    async advanceTimersByTimeAsync(u) {
      return await r().advanceTimersByTimeAsync(u), a;
    },
    advanceTimersToNextTimer() {
      return r().advanceTimersToNextTimer(), a;
    },
    async advanceTimersToNextTimerAsync() {
      return await r().advanceTimersToNextTimerAsync(), a;
    },
    advanceTimersToNextFrame() {
      return r().advanceTimersToNextFrame(), a;
    },
    getTimerCount() {
      return r().getTimerCount();
    },
    setSystemTime(u) {
      return r().setSystemTime(u), a;
    },
    getMockedSystemTime() {
      return r().getMockedSystemTime();
    },
    getRealSystemTime() {
      return r().getRealSystemTime();
    },
    clearAllTimers() {
      return r().clearAllTimers(), a;
    },
    spyOn: Ph,
    fn: Ih,
    waitFor: Bg,
    waitUntil: zg,
    hoisted(u) {
      return ve(u, '"vi.hoisted" factory', ["function"]), u();
    },
    mock(u, c) {
      if (typeof u != "string") throw new TypeError(`vi.mock() expects a string path, but received a ${typeof u}`);
      const l = Et("mock");
      Ce().queueMock(u, l, typeof c == "function" ? () => c(() => Ce().importActual(u, l, Ce().getMockContext().callstack)) : c);
    },
    unmock(u) {
      if (typeof u != "string") throw new TypeError(`vi.unmock() expects a string path, but received a ${typeof u}`);
      Ce().queueUnmock(u, Et("unmock"));
    },
    doMock(u, c) {
      if (typeof u != "string") throw new TypeError(`vi.doMock() expects a string path, but received a ${typeof u}`);
      const l = Et("doMock");
      Ce().queueMock(u, l, typeof c == "function" ? () => c(() => Ce().importActual(u, l, Ce().getMockContext().callstack)) : c);
    },
    doUnmock(u) {
      if (typeof u != "string") throw new TypeError(`vi.doUnmock() expects a string path, but received a ${typeof u}`);
      const c = Et("doUnmock");
      Ce().queueUnmock(u, c);
    },
    async importActual(u) {
      const c = Et("importActual");
      return Ce().importActual(u, c, Ce().getMockContext().callstack);
    },
    async importMock(u) {
      const c = Et("importMock");
      return Ce().importMock(u, c);
    },
    mockObject(u, c) {
      return Ce().mockObject({ value: u }, void 0, c?.spy ? "autospy" : "automock").value;
    },
    mocked(u, c = {}) {
      return u;
    },
    isMockFunction(u) {
      return lt(u);
    },
    clearAllMocks() {
      return Yh(), a;
    },
    resetAllMocks() {
      return Jh(), a;
    },
    restoreAllMocks() {
      return Gh(), a;
    },
    stubGlobal(u, c) {
      return o.has(u) || o.set(u, Object.getOwnPropertyDescriptor(globalThis, u)), Object.defineProperty(globalThis, u, {
        value: c,
        writable: !0,
        configurable: !0,
        enumerable: !0
      }), a;
    },
    stubEnv(u, c) {
      const l = t().metaEnv;
      return s.has(u) || s.set(u, l[u]), i.includes(u) ? l[u] = c ? "1" : "" : c === void 0 ? delete l[u] : l[u] = String(c), a;
    },
    unstubAllGlobals() {
      return o.forEach((u, c) => {
        u ? Object.defineProperty(globalThis, c, u) : Reflect.deleteProperty(globalThis, c);
      }), o.clear(), a;
    },
    unstubAllEnvs() {
      const u = t().metaEnv;
      return s.forEach((c, l) => {
        c === void 0 ? delete u[l] : u[l] = c;
      }), s.clear(), a;
    },
    resetModules() {
      return Jd(t().evaluatedModules), a;
    },
    async dynamicImportSettled() {
      return Pu();
    },
    setConfig(u) {
      e || (e = { ...t().config }), Object.assign(t().config, u);
    },
    resetConfig() {
      e && Object.assign(t().config, e);
    }
  };
  return a;
}
const Vg = Wg(), ne = Vg;
function Ce() {
  return typeof __vitest_mocker__ < "u" ? __vitest_mocker__ : new Proxy({}, { get(e, t) {
    throw new Error(`Vitest mocker was not initialized in this environment. vi.${String(t)}() is forbidden.`);
  } });
}
function Et(e) {
  const t = Uf({ stackTraceLimit: 5 }).split(`
`);
  return wu(t[t.findLastIndex((n) => n.includes(` at Object.${e}`) || n.includes(`${e}@`)) + 1])?.file || "";
}
const Jg = {
  clusterApiUrl: ne.fn(() => "https://api.devnet.solana.com"),
  Connection: class {
    async getLatestBlockhash() {
      return {
        blockhash: "mockedBlockhash123",
        lastValidBlockHeight: 1e6
      };
    }
    async getBalance() {
      return 1e9;
    }
    async getSignatureStatus() {
      return { value: { confirmationStatus: "confirmed" } };
    }
    async getAccountInfo() {
      return {
        data: new Uint8Array(),
        executable: !1,
        lamports: 1e6,
        owner: new Uint8Array(32),
        rentEpoch: 0
      };
    }
    async sendRawTransaction() {
      return "mockedSignature123";
    }
    async confirmTransaction() {
      return { value: { err: null } };
    }
  },
  SystemProgram: {
    transfer: ne.fn(() => ({
      keys: [],
      programId: {},
      data: new Uint8Array()
    }))
  },
  Transaction: class {
    recentBlockhash;
    feePayer;
    instructions = [];
    add(t) {
      return this.instructions.push(t), this;
    }
    serialize() {
      return new Uint8Array([1, 2, 3, 4, 5]);
    }
  },
  LAMPORTS_PER_SOL: 1e9,
  PublicKey: class {
    constructor(t) {
      this.value = t;
    }
    toString() {
      return typeof this.value == "string" ? this.value : "mockPublicKey123";
    }
    toBase58() {
      return this.toString();
    }
    toBytes() {
      return new Uint8Array(32);
    }
  }
}, Qg = {
  getAssociatedTokenAddress: ne.fn(async () => ({
    toBase58: () => "mockTokenAddress123"
  })),
  createTransferInstruction: ne.fn(() => ({
    keys: [],
    programId: {},
    data: new Uint8Array()
  })),
  TOKEN_PROGRAM_ID: "mockTokenProgramId"
}, ey = {
  ConnectionProvider: ({ children: e }) => e,
  WalletProvider: ({ children: e }) => e,
  useWallet: () => ({
    connected: !1,
    connecting: !1,
    connect: ne.fn(),
    disconnect: ne.fn(),
    publicKey: null,
    signTransaction: ne.fn(),
    signAllTransactions: ne.fn(),
    select: ne.fn()
  })
}, ty = {
  PhantomWalletAdapter: class {
  },
  SolflareWalletAdapter: class {
  },
  BackpackWalletAdapter: class {
  }
}, sy = {
  loadStripe: ne.fn(async () => ({
    redirectToCheckout: ne.fn(async (e) => ({
      error: null
    })),
    confirmCardPayment: ne.fn(async () => ({
      paymentIntent: { id: "pi_mock123", status: "succeeded" },
      error: null
    }))
  }))
};
function iy(e = !0, t = "mockWallet123") {
  return {
    connected: e,
    connecting: !1,
    connect: ne.fn().mockResolvedValue(void 0),
    disconnect: ne.fn().mockResolvedValue(void 0),
    publicKey: e ? { toBase58: () => t, toString: () => t } : null,
    signTransaction: ne.fn().mockResolvedValue({
      signature: new Uint8Array(64),
      serialize: () => new Uint8Array([1, 2, 3])
    }),
    signAllTransactions: ne.fn().mockResolvedValue([]),
    select: ne.fn()
  };
}
function cy(e = {}) {
  const { redirectSuccess: t = !0 } = e, n = e.sessionId ?? "cs_test_mock123";
  return {
    redirectToCheckout: ne.fn().mockResolvedValue({
      error: t ? null : { message: "Mock redirect error" }
    }),
    confirmCardPayment: ne.fn().mockResolvedValue({
      paymentIntent: {
        id: "pi_mock123",
        status: "succeeded"
      },
      error: null
    }),
    _sessionId: n
    // Store for potential inspection
  };
}
function ay(e) {
  return ne.fn((t) => {
    for (const [n, r] of Object.entries(e))
      if (t.includes(n))
        return Promise.resolve({
          ok: r.status >= 200 && r.status < 300,
          status: r.status,
          json: async () => r.body,
          text: async () => JSON.stringify(r.body),
          headers: new Map(Object.entries(r.headers || {}))
        });
    return Promise.resolve({
      ok: !1,
      status: 404,
      json: async () => ({ error: "Not found" }),
      text: async () => JSON.stringify({ error: "Not found" }),
      headers: /* @__PURE__ */ new Map()
    });
  });
}
function Ug(e = {}) {
  return function({ children: n }) {
    const r = {
      stripePublicKey: e.stripePublicKey ?? "pk_test_mock_key_for_testing",
      serverUrl: e.serverUrl ?? "http://localhost:8080",
      solanaCluster: e.solanaCluster ?? "devnet",
      solanaEndpoint: e.solanaEndpoint,
      theme: e.theme ?? "light",
      themeOverrides: e.themeOverrides,
      unstyled: !1,
      tokenMint: void 0,
      dangerouslyAllowUnknownMint: !0,
      // Allow any mint in test mode
      logLevel: 4
      // LogLevel.SILENT - no logs in tests
    };
    return /* @__PURE__ */ Cc(Wu, { config: r, children: n });
  };
}
function uy() {
  return Ug({
    stripePublicKey: "pk_test_minimal",
    serverUrl: "http://localhost:8080",
    solanaCluster: "devnet"
  });
}
function ly(e = {}) {
  return e.connected, e.publicKey, e.connecting, function({ children: n }) {
    return /* @__PURE__ */ Cc(zu, { children: n });
  };
}
function fy(e = "cs_test_mock123") {
  return {
    success: !0,
    transactionId: e,
    error: void 0
  };
}
function hy(e = "Payment failed") {
  return {
    success: !1,
    transactionId: void 0,
    error: e
  };
}
function py(e = {}) {
  const {
    scheme: t = "solana-spl-transfer",
    network: n = "mainnet-beta",
    maxAmountRequired: r = "1000000",
    resource: o = "test-resource",
    description: s = "Test Payment",
    mimeType: i = "application/json",
    payTo: a = "mockRecipient123",
    maxTimeoutSeconds: u = 300,
    asset: c = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    // USDC mint
    extra: l = {
      recipientTokenAccount: "mockTokenAccount123",
      decimals: 6,
      tokenSymbol: "USDC",
      memo: "test-payment"
    }
  } = e;
  return {
    scheme: t,
    network: n,
    maxAmountRequired: r,
    resource: o,
    description: s,
    mimeType: i,
    payTo: a,
    maxTimeoutSeconds: u,
    asset: c,
    extra: l
  };
}
function dy(e = {}) {
  const {
    success: t = !0,
    error: n = null,
    txHash: r = "mockSignature123",
    networkId: o = "mainnet-beta",
    metadata: s
  } = e;
  return {
    success: t,
    error: n,
    txHash: r,
    networkId: o,
    metadata: s
  };
}
async function my() {
  return new Promise((e) => setTimeout(e, 0));
}
async function gy(e) {
  return new Promise((t) => setTimeout(t, e));
}
function yy(e, t = {}) {
  const {
    maxAmountRequired: n = "1000000",
    asset: r = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    // USDC mint
    payTo: o = "mockRecipient123"
  } = t;
  return {
    ok: !1,
    status: 402,
    json: async () => ({
      x402Version: 0,
      error: "payment required",
      accepts: [
        {
          scheme: "solana-spl-transfer",
          network: "mainnet-beta",
          maxAmountRequired: n,
          resource: e,
          description: "Payment required",
          mimeType: "application/json",
          payTo: o,
          maxTimeoutSeconds: 300,
          asset: r,
          extra: {
            recipientTokenAccount: "mockTokenAccount123",
            decimals: 6,
            tokenSymbol: "USDC",
            memo: `${e}:${Date.now()}`
          }
        }
      ]
    }),
    headers: /* @__PURE__ */ new Map([
      ["content-type", "application/json"]
    ])
  };
}
function by(e = !0) {
  const t = e ? {
    success: !0,
    error: null,
    txHash: "mockSignature123",
    networkId: "mainnet-beta"
  } : {
    success: !1,
    error: "Payment verification failed",
    txHash: null,
    networkId: null
  };
  return {
    ok: e,
    status: e ? 200 : 402,
    json: async () => t,
    headers: /* @__PURE__ */ new Map([
      ["x-payment-response", JSON.stringify(t)]
    ])
  };
}
function wy(e = "cs_test_mock123") {
  return {
    ok: !0,
    status: 200,
    json: async () => ({
      sessionId: e,
      url: `https://checkout.stripe.com/pay/${e}`
    })
  };
}
function Ty(e = "mockWallet123") {
  return {
    publicKey: {
      toBase58: () => e,
      toString: () => e
    }
  };
}
function Sy() {
  return {
    signature: new Uint8Array(64).fill(1),
    serialize: () => new Uint8Array([1, 2, 3, 4, 5])
  };
}
function Ey(e) {
  return ne.fn(e);
}
async function vy() {
  return new Promise((e) => setImmediate(e));
}
export {
  uy as createMinimalMockProvider,
  Ug as createMockCedrosProvider,
  ay as createMockFetch,
  cy as createMockStripe,
  iy as createMockWallet,
  Ey as createSpy,
  vy as flushPromises,
  hy as mockPaymentFailure,
  fy as mockPaymentSuccess,
  yy as mockQuoteResponse,
  dy as mockSettlement,
  Sy as mockSignTransaction,
  Jg as mockSolanaWeb3,
  Qg as mockSplToken,
  sy as mockStripeJs,
  wy as mockStripeSessionResponse,
  by as mockVerifyResponse,
  ey as mockWalletAdapter,
  ty as mockWalletAdapterWallets,
  Ty as mockWalletConnect,
  ly as mockWalletProvider,
  py as mockX402Quote,
  gy as wait,
  my as waitForNextTick
};
