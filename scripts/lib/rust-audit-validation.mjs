function warnings(report) {
  return Object.values(report.warnings ?? {}).flatMap((entries) => entries ?? []);
}

function describe(warning) {
  const id = warning?.advisory?.id ?? 'unknown advisory';
  const name = warning?.package?.name ?? 'unknown package';
  const version = warning?.package?.version ?? 'unknown version';
  return `${id} for ${name} ${version}`;
}

export function validateRustAuditReport(report) {
  const vulnerabilities = report?.vulnerabilities;
  const vulnerabilityList = vulnerabilities?.list ?? [];
  if (vulnerabilities?.found || vulnerabilities?.count > 0 || vulnerabilityList.length > 0) {
    const ids = vulnerabilityList.map((entry) => entry?.advisory?.id ?? 'unknown').join(', ');
    throw new Error(`RustSec vulnerabilities found${ids ? `: ${ids}` : ''}`);
  }

  const observedWarnings = warnings(report);
  if (observedWarnings.length > 0) {
    throw new Error(`unexpected RustSec warning(s): ${observedWarnings.map(describe).join(', ')}`);
  }
  return observedWarnings.map(describe);
}
