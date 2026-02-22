import { jsx as t } from "react/jsx-runtime";
function a({
  checked: o,
  onChange: i,
  disabled: r = !1
}) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": o,
      disabled: r,
      onClick: () => i(!o),
      style: {
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: o ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
        cursor: r ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        flexShrink: 0,
        opacity: r ? 0.5 : 1
      },
      children: /* @__PURE__ */ t(
        "span",
        {
          style: {
            position: "absolute",
            top: 2,
            left: o ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s"
          }
        }
      )
    }
  );
}
export {
  a as T
};
