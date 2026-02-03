function n() {
  if (typeof crypto < "u" && crypto.randomUUID)
    return crypto.randomUUID();
  if (typeof crypto < "u" && crypto.getRandomValues) {
    const r = new Uint8Array(16);
    crypto.getRandomValues(r), r[6] = r[6] & 15 | 64, r[8] = r[8] & 63 | 128;
    const e = Array.from(r).map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${e.slice(0, 8)}-${e.slice(8, 12)}-${e.slice(12, 16)}-${e.slice(16, 20)}-${e.slice(20)}`;
  }
  return console.warn("[uuid] Using insecure Math.random() fallback. Upgrade browser for secure UUID generation."), "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (r) => {
    const e = Math.random() * 16 | 0;
    return (r === "x" ? e : e & 3 | 8).toString(16);
  });
}
export {
  n as g
};
