function o(e = {}) {
  return {
    resourceId: "resource_123",
    revision: 2,
    etag: '"resource:2"',
    savedAt: "2026-07-01T12:00:00.000Z",
    warnings: [],
    ...e
  };
}
function r(e, s, t = "Autosave failed") {
  const a = new Error(s);
  return a.status = e, a.problem = {
    type: `https://docs.cedros.example/problems/autosave/${e}`,
    title: t,
    status: e,
    detail: s
  }, a;
}
const i = {
  staleEtag: () => r(412, "The resource changed after this draft loaded.", "Stale revision"),
  inProgress: () => r(409, "This idempotency key is already processing.", "In progress"),
  invalidPatch: () => r(422, "The patch contains a blocked field.", "Invalid patch"),
  rateLimited: () => r(429, "Autosave is sending too many writes.", "Rate limited"),
  serverFailure: () => r(500, "The server could not save this draft.", "Server failure")
};
export {
  i as a,
  o as b,
  r as c
};
