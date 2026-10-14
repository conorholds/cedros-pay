# sprintf precision guard

Development-only backport of [sprintf-js 1.1.3](https://github.com/alexei/sprintf.js),
retaining its BSD-3-Clause license and CommonJS API.

[CVE-2026-97058](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) affects
numeric precision passed without bounds to JavaScript number formatting.
This backport clamps explicit `%e` and `%f` precision to 0–100 and `%g`
precision to 1–100. Valid formatting is unchanged; out-of-range precision
produces bounded output rather than an uncaught RangeError. Other format-string
validation retains upstream behavior.

The package is installed through a local override as `sprintf-js` for the
API Extractor/argparse development dependency chain. It is not a replacement
for validating untrusted templates in an application. Consumer and precision
regressions run with `make test-dependency-security` at the repository root.
