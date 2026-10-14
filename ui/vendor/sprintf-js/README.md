# sprintf precision guard

Development-only backport of [sprintf-js 1.1.3](https://github.com/alexei/sprintf.js),
retaining its BSD-3-Clause license and CommonJS API. The local fork uses
version `1.1.4-cedros.0`; its upstream base is `1.1.3`.

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

The direct development pin makes npm record the local override's package
identity in the lockfile. Like the other local vendor packages, it is listed in
Knip's scoped dependency allowlist because the tool treats file-linked imports
as workspace source. The dependency-security target executes the formatter and
its API Extractor consumer, and release input digests cover this source.
