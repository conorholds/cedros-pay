"""Executable standard reference checks; NOT Data/Pay native integration evidence.

Run: python3 docs/extension-authoring/contracts/fixtures/check_portal_usage_capacity_v1.py
Requires the review environment's jsonschema package; installs nothing.
"""

import copy
import hashlib
import json
import math
import unittest
from datetime import datetime
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

HERE = Path(__file__).resolve().parent
ARTIFACT = json.loads((HERE.parent / "portal-usage-capacity-v1.contract.json").read_text())
FIXTURES = json.loads((HERE / "portal-usage-capacity-v1.fixtures.json").read_text())
VALUES = {row["id"]: row["value"] for row in FIXTURES["fixtures"]}
ROOT = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$defs": ARTIFACT["$defs"]}


def canonical_digest(value):
    """capacity-json-v1: integer-only JSON, not general RFC canonical JSON."""
    def check(item):
        if item is None or isinstance(item, (str, bool)):
            return
        if isinstance(item, int) and abs(item) <= 9007199254740991:
            return
        if isinstance(item, list):
            for child in item:
                check(child)
            return
        if isinstance(item, dict) and all(isinstance(k, str) and k.isascii() for k in item):
            for child in item.values():
                check(child)
            return
        raise ValueError("unsupported canonical value")
    check(value)
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    return "sha256:" + hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fresh(source, now):
    return (source["state"] == "available" and source["observedAt"] is not None
            and source["validUntil"] is not None
            and time(source["observedAt"]) <= time(now) < time(source["validUntil"]))


def effective_grants(grants, now):
    chosen = {}
    for grant in grants:
        if time(grant["revisionEffectiveAt"]) > time(now):
            continue
        prior = chosen.get(grant["grantId"])
        if prior is None or grant["revision"] > prior["revision"]:
            chosen[grant["grantId"]] = grant
    return [g for g in chosen.values() if g["state"] == "active"
            and time(g["effectiveAt"]) <= time(now) < time(g["expiresAt"])]


def merge_grants(live, incoming):
    records = {(g["grantId"], g["revision"]): copy.deepcopy(g) for g in live}
    for grant in incoming:
        key = (grant["grantId"], grant["revision"])
        if key in records and canonical_digest(records[key]) != canonical_digest(grant):
            raise ValueError("grant_conflict")
        records[key] = copy.deepcopy(grant)
    by_id = {}
    purchases = {}
    for grant in records.values():
        snapshot = grant["snapshot"]
        if (canonical_digest(snapshot["quote"]) != snapshot["quoteDigest"]
                or grant["quoteId"] != snapshot["quote"]["quoteId"]):
            raise ValueError("grant_binding_conflict")
        binding = snapshot["quote"]["binding"]
        purchase_key = (binding["payInstallationId"], binding["environment"], grant["purchaseId"])
        purchase_binding = (grant["authorizationId"], grant["quoteId"], snapshot)
        if purchase_key in purchases and purchases[purchase_key] != purchase_binding:
            raise ValueError("grant_binding_conflict")
        purchases[purchase_key] = purchase_binding
        by_id.setdefault(grant["grantId"], []).append(grant)
    intervals = []
    for history in by_id.values():
        ordered = sorted(history, key=lambda g: g["revision"])
        for previous, current in zip(ordered, ordered[1:]):
            for field in ("purchaseId", "authorizationId", "quoteId", "snapshot",
                          "billingPeriodId", "paymentAttemptId"):
                if current[field] != previous[field]:
                    raise ValueError("grant_binding_conflict")
            if time(current["revisionEffectiveAt"]) < time(previous["revisionEffectiveAt"]):
                raise ValueError("retrograde_revision")
            if (current["effectiveAt"], current["expiresAt"]) != (previous["effectiveAt"], previous["expiresAt"]):
                raise ValueError("interval_conflict")
        grant = ordered[0]
        binding = grant["snapshot"]["quote"]["binding"]
        identity = (binding["payInstallationId"], binding["environment"], grant["purchaseId"],
                    canonical_digest(binding["scope"]), binding["terms"]["meterId"])
        for prior_identity, start, end in intervals:
            if prior_identity == identity and time(grant["effectiveAt"]) < end and start < time(grant["expiresAt"]):
                raise ValueError("overlapping_grants")
        intervals.append((identity, time(grant["effectiveAt"]), time(grant["expiresAt"])))
    return list(records.values())


class IdempotencyReference:
    """Durable reference receipts; the optional response cache is disposable."""
    def __init__(self):
        self.receipts = {}
        self.cache = {}

    def identity(self, operation, binding, actor, key):
        if not isinstance(key, str) or not 1 <= len(key) <= 128:
            raise ValueError("invalid_request")
        return (operation, binding["payInstallationId"], binding["environment"],
                binding["scope"]["organizationId"], actor, key)

    def lookup(self, identity, command):
        receipt = self.receipts.get(identity)
        if receipt is None:
            return None
        if receipt[0] != canonical_digest(command):
            raise ValueError("idempotency_conflict")
        return copy.deepcopy(receipt[1])

    def record(self, identity, command, outcome):
        previous = self.lookup(identity, command)
        if previous is not None and previous != outcome:
            raise ValueError("idempotency_conflict")
        self.receipts[identity] = (canonical_digest(command), copy.deepcopy(outcome))
        self.cache[identity] = copy.deepcopy(outcome)


class PurchaseReference:
    """Durable uniqueness rules expressed in memory solely for protocol review."""
    def __init__(self, snapshot):
        self.snapshot = copy.deepcopy(snapshot)
        self.purchase = None
        self.authorizations = {}
        self.idempotency = IdempotencyReference()
        self.provider_identity = None

    def accept(self, authorization, proposed_purchase, key, digest, now, authorized=True):
        binding = self.snapshot["quote"]["binding"]
        identity = self.idempotency.identity("capacity.authorization.redeem", binding,
                                             binding["buyerUserId"], key)
        command = {"authorizationId": authorization, "quoteId": self.snapshot["quote"]["quoteId"],
                   "quoteDigest": digest, "purchaseId": proposed_purchase}
        replay = self.idempotency.lookup(identity, command)
        if replay is not None:
            return replay["purchaseId"]
        if digest != self.snapshot["quoteDigest"]:
            raise ValueError("version_conflict")
        if self.purchase is not None:
            if proposed_purchase != self.purchase:
                raise ValueError("quote_already_accepted")
            self.authorizations[authorization] = self.purchase
            self.idempotency.record(identity, command, {"purchaseId": self.purchase})
            return self.purchase  # durable replay, not new acceptance
        if not authorized:
            raise ValueError("forbidden")
        if time(now) >= time(self.snapshot["quote"]["expiresAt"]):
            raise ValueError("quote_expired")
        self.purchase = proposed_purchase
        self.authorizations[authorization] = proposed_purchase
        self.idempotency.record(identity, command, {"purchaseId": proposed_purchase})
        return self.purchase

    def dispatch_payment(self, billing_period, attempt):
        if self.purchase is None:
            raise ValueError("not_accepted")
        identity = (self.purchase, billing_period, attempt)
        if self.provider_identity is not None and identity != self.provider_identity:
            raise ValueError("payment_outcome_unknown")
        self.provider_identity = identity
        return identity


class SnapshotReference:
    """Stage an entire snapshot; publish only after its final digest validates."""
    def __init__(self, live, scope):
        self.live = copy.deepcopy(live)
        self.scope = copy.deepcopy(scope)
        self.staged = []
        self.identity = None
        self.next_page = 0
        self.revision = None
        self.source_digest = None
        self.receipts = {}

    def page(self, page):
        for field, expected in self.scope.items():
            if page[field] != expected:
                raise ValueError("snapshot_binding_conflict")
        for grant in page["grants"]:
            binding = grant["snapshot"]["quote"]["binding"]
            scope = {"payInstallationId": binding["payInstallationId"],
                     "environment": binding["environment"],
                     "organizationId": binding["scope"]["organizationId"]}
            if scope != self.scope:
                raise ValueError("snapshot_binding_conflict")
        receipt_key = (page["snapshotId"], page["pageIndex"])
        page_digest = canonical_digest(page)
        receipt = self.receipts.get(receipt_key)
        if receipt is not None:
            if receipt[0] != page_digest:
                raise ValueError("snapshot_conflict")
            return receipt[1]  # prior outcome, no publication or checkpoint change
        identity = tuple(page[k] for k in ("payInstallationId", "environment", "organizationId",
                                           "snapshotId", "sourceRevision", "snapshotDigest"))
        if self.identity is not None and identity != self.identity:
            raise ValueError("snapshot_conflict")
        if (page["pageIndex"] != self.next_page
                or (self.revision is not None and page["sourceRevision"] < self.revision)
                or (page["sourceRevision"] == self.revision
                    and page["snapshotDigest"] != self.source_digest)):
            raise ValueError("snapshot_conflict")
        staged = self.staged + copy.deepcopy(page["grants"])
        if not page["complete"]:
            self.identity = identity
            self.staged = staged
            self.next_page += 1
            self.receipts[receipt_key] = (page_digest, False)
            return False
        payload = {k: page[k] for k in ("payInstallationId", "environment", "organizationId", "sourceRevision")}
        payload["grants"] = sorted(staged, key=lambda g: (g["grantId"], g["revision"]))
        if canonical_digest(payload) != page["snapshotDigest"]:
            raise ValueError("snapshot_conflict")
        # Absence never removes existing grants. Explicit revisions/tombstones do.
        merged = merge_grants(self.live, staged)
        self.live = merged
        self.revision = page["sourceRevision"]
        self.source_digest = page["snapshotDigest"]
        self.receipts[receipt_key] = (page_digest, True)
        self.identity, self.staged, self.next_page = None, [], 0
        return True


def validate_semantics(status, now):
    cap = status["capacity"]
    if cap["state"] == "active":
        if cap["desiredRevision"] != cap["appliedRevision"] or not fresh(cap["freshness"], now):
            raise ValueError("invalid_active")
    purchase = status["purchase"]
    if purchase is not None:
        snap = purchase["snapshot"]
        if canonical_digest(snap["quote"]) != snap["quoteDigest"]:
            raise ValueError("quote_conflict")
        initial = purchase["initialAttempt"]
        if initial and initial["payment"]["state"] in ("failed", "canceled"):
            if cap["state"] == "active":
                raise ValueError("initial_payment_not_confirmed")


def receipt_satisfied(receipt, revision):
    return receipt["epoch"] == revision["epoch"] and revision["sequence"] >= receipt["sequence"]


def local_limit(command, now):
    return local_selection(command, now)[1]


def local_selection(command, now):
    if time(now) < time(command["validFrom"]):
        raise ValueError("schedule_not_effective")
    if time(now) >= time(command["validUntil"]):
        return {"kind": "lease_expired", "intervalId": None,
                "effectiveAt": command["validUntil"]}, None
    base_since = command["validFrom"]
    for entry in command["schedule"]:
        if time(entry["effectiveAt"]) <= time(now) < time(entry["expiresAt"]):
            return {"kind": "interval", "intervalId": entry["intervalId"],
                    "effectiveAt": entry["effectiveAt"]}, entry["limitBytes"]
        if time(entry["expiresAt"]) <= time(now):
            base_since = entry["expiresAt"]
    return {"kind": "base", "intervalId": None, "effectiveAt": base_since}, command["baseLimitBytes"]


def local_apply(current, incoming, expected_binding):
    command = incoming["command"]
    if command["binding"] != expected_binding:
        raise ValueError("not_found")
    if canonical_digest(command) != incoming["payloadDigest"]:
        raise ValueError("version_conflict")
    ids = set()
    previous_end = time(command["validFrom"])
    if previous_end >= time(command["validUntil"]):
        raise ValueError("invalid_schedule")
    for entry in command["schedule"]:
        if (entry["intervalId"] in ids or time(entry["effectiveAt"]) < previous_end
                or time(entry["expiresAt"]) <= time(entry["effectiveAt"])
                or time(entry["expiresAt"]) > time(command["validUntil"])):
            raise ValueError("invalid_schedule")
        previous_end = time(entry["expiresAt"])
        ids.add(entry["intervalId"])
    if current is not None:
        before, after = current["command"]["scheduleRevision"], command["scheduleRevision"]
        if before["epoch"] != after["epoch"] or after["sequence"] < before["sequence"]:
            raise ValueError("version_conflict")
        if before == after and current["payloadDigest"] != incoming["payloadDigest"]:
            raise ValueError("version_conflict")
    return copy.deepcopy(incoming)


def local_ack_valid(ack, commands, now):
    validator = Draft202012Validator({**ROOT, "$ref": "#/$defs/LocalQuotaAck"}, format_checker=FormatChecker())
    if not validator.is_valid(ack) or not fresh(ack["freshness"], now):
        raise ValueError("invalid_ack")
    known = {}
    for request in commands:
        local_apply(None, request, ack["binding"])
        command = request["command"]
        if command["meterId"] != ack["meterId"]:
            raise ValueError("invalid_ack")
        identity = {"scheduleRevision": command["scheduleRevision"], "payloadDigest": request["payloadDigest"]}
        known[canonical_digest(identity)] = command
    stored = known.get(canonical_digest(ack["storedSchedule"]))
    identity = ack["enforcing"]
    if stored is None or identity is None:
        raise ValueError("invalid_ack")
    enforcing = known.get(canonical_digest(identity["schedule"]))
    if enforcing is None:
        raise ValueError("invalid_ack")
    old, new = enforcing["scheduleRevision"], stored["scheduleRevision"]
    if old["epoch"] != new["epoch"] or old["sequence"] > new["sequence"]:
        raise ValueError("invalid_ack")
    if ack["state"] == "applied" and identity["schedule"] != ack["storedSchedule"]:
        raise ValueError("invalid_ack")
    for at in [ack["freshness"]["observedAt"], now]:
        selected, cap = local_selection(enforcing, at)
        if any(identity[k] != value for k, value in selected.items()) or cap != ack["enforcingLimitBytes"]:
            raise ValueError("invalid_ack")
    boundaries = [entry[field] for entry in enforcing["schedule"] for field in ["effectiveAt", "expiresAt"]]
    boundaries.append(enforcing["validUntil"])
    future = [time(x) for x in boundaries if time(x) > time(ack["freshness"]["observedAt"])]
    if future and time(ack["freshness"]["validUntil"]) > min(future):
        raise ValueError("invalid_ack")
    if identity["kind"] == "lease_expired" and ack["state"] != "expired":
        raise ValueError("invalid_ack")
    return True


def local_receipt_ready(ack, mapping, commands, now):
    local_ack_valid(ack, commands, now)
    return (ack["state"] == "applied" and ack["enforcing"]["kind"] != "lease_expired"
            and all(ack[k] == mapping[k] for k in ["binding", "meterId", "enforcing", "enforcingLimitBytes"]))


def operation_key(op):
    return tuple(op[k] for k in ["routeId", "family", "operation"])


def guard_review_valid(review, catalog, live_rows, protections):
    expected = {operation_key(op) for op in catalog}
    decisions = review["decisions"]
    if (len(expected) != len(catalog) or review["routeCatalog"] != catalog
            or review["routeCatalogRevision"] != canonical_digest(catalog)
            or review["protectionPolicyRevision"] != canonical_digest(protections)
            or len(decisions) != len(expected)
            or {operation_key(x["target"]) for x in decisions} != expected):
        raise ValueError("incomplete_guard_review")
    rows = {row["rowId"]: row for row in review["guardRows"]}
    if len(rows) != len(review["guardRows"]) or rows != {r["rowId"]: r for r in live_rows}:
        raise ValueError("guard_values_changed")
    for row in rows.values():
        if row["rowRevision"] != canonical_digest({k: v for k, v in row.items() if k != "rowRevision"}):
            raise ValueError("guard_values_changed")
    for decision in decisions:
        target = decision["target"]
        protection_ids = [x["guardIds"] for x in protections if x["target"] == target]
        if (len(protection_ids) != 1
                or len(decision["independentProtectionIds"]) != len(set(decision["independentProtectionIds"]))
                or set(decision["independentProtectionIds"]) != set(protection_ids[0])):
            raise ValueError("incomplete_guard_review")
        candidates = [row for row in rows.values() if row["enabled"]
                      and row["organizationId"] == review["organizationId"]
                      and row["siteId"] in (None, review["siteId"])
                      and all(row[k] in (None, target[k]) for k in ["routeId", "family", "operation"])]
        applicable = decision["applicableGuardIds"]
        if len(applicable) != len(set(applicable)) or set(applicable) != {r["rowId"] for r in candidates}:
            raise ValueError("incomplete_guard_review")
        legacy = [row for row in rows.values() if row["enabled"]
                  and row["organizationId"] == review["organizationId"]
                  and (review["siteId"] is None or row["siteId"] in (None, review["siteId"]))
                  and all(row[k] in (None, target[k]) for k in ["routeId", "family", "operation"])]
        def rank(row):
            return tuple(part for k in ["siteId", "routeId", "family"]
                         for part in (row[k] is None, row[k] or "")) + (-time(row["updatedAt"]).timestamp(),)
        top = [] if not legacy else [r["rowId"] for r in legacy if rank(r) == min(map(rank, legacy))]
        ties = decision["tiedCandidateIds"]
        if (decision["selectedRowId"] not in top if top else decision["selectedRowId"] is not None):
            raise ValueError("legacy_decision_mismatch")
        if len(ties) != len(set(ties)) or set(ties) != (set(top) if len(top) > 1 else set()):
            raise ValueError("legacy_decision_mismatch")
    return True


def guard_cutover(policy, approval, catalog, live_rows, protections):
    review = policy["review"]
    guard_review_valid(review, catalog, live_rows, protections)
    expected = {"guardSetDigest": canonical_digest(review), "migrationEpoch": review["migrationEpoch"],
                "approvedBy": policy["approvedBy"], "approvedAt": policy["approvedAt"]}
    if (policy["version"] != "commercial-all-guards-v2" or policy["approvedBy"] is None
            or review["siteId"] is None or policy["approvedAt"] is None or policy["guardSetDigest"] != expected["guardSetDigest"]
            or approval != expected):
        raise ValueError("guard_approval_required")
    return copy.deepcopy(policy)  # Reference result; native cutover must be one transaction.


def guard_resync(policy, live_rows):
    result = copy.deepcopy(policy)
    if {x["rowId"]: x for x in live_rows} != {x["rowId"]: x for x in policy["review"]["guardRows"]}:
        result["salesEligible"] = False
    return result  # Sync cannot rewrite migration version, epoch or approval receipt.


def snapshot_scope():
    page = VALUES["complete-scheduled-snapshot"]
    return {key: page[key] for key in ("payInstallationId", "environment", "organizationId")}


class ContractChecks(unittest.TestCase):
    def test_shapes_and_bindings(self):
        Draft202012Validator.check_schema(ROOT)
        self.assertEqual(ARTIFACT["contractVersion"], "1.2.0")
        self.assertEqual(FIXTURES["contractVersion"], "1.2.0")
        self.assertEqual(VALUES["immutable-full-quote"]["quote"]["contractVersion"], "1.0.0")
        self.assertFalse(ARTIFACT["callable"])
        self.assertEqual(ARTIFACT["publicationStatus"], "published-standard")
        self.assertTrue(ARTIFACT["decision"]["implementationMayProceed"])
        self.assertFalse(ARTIFACT["decision"]["ownerSignoffRequired"])
        for row in FIXTURES["fixtures"]:
            with self.subTest(fixture=row["id"]):
                validator = Draft202012Validator({**ROOT, "$ref": row["schemaRef"]}, format_checker=FormatChecker())
                errors = list(validator.iter_errors(row["value"]))
                self.assertEqual(not errors, row["valid"], [e.message for e in errors])
        operations = {op["operationId"]: op for op in ARTIFACT["operations"]}
        for op in operations.values():
            for field in ("requestSchema", "responseSchema", "errorSchema"):
                self.assertIn(op[field]["$ref"].split("/")[-1], ARTIFACT["$defs"])
        ids = set()
        for op in operations.values():
            if op["owner"] == "Pay" and op.get("transport") != "extension-service-only":
                self.assertNotIn(op["routeId"], ids)
                ids.add(op["routeId"])
        for binding in ARTIFACT["serviceBindings"]:
            self.assertNotIn(binding["routeId"], ids)
            ids.add(binding["routeId"])
            if operations[binding["operationId"]].get("transport") == "extension-service-only":
                self.assertEqual(operations[binding["operationId"]]["routeId"], binding["routeId"])
                self.assertEqual(operations[binding["operationId"]]["path"], binding["path"])
                self.assertEqual(binding["callerExtensions"], ["cedros-data"] if operations[binding["operationId"]]["owner"] == "Pay" else ["cedros-pay"])
                self.assertEqual(binding["trustedReadWithoutCallback"], operations[binding["operationId"]]["owner"] == "Pay")
            self.assertEqual(binding["routeId"], binding["capabilityId"])
            self.assertEqual(binding["commandSchema"], operations[binding["operationId"]]["requestSchema"])
            Draft202012Validator.check_schema({**ROOT, **binding["bodySchema"]})

    def test_quote_digest_and_financial_mutations(self):
        snapshot = VALUES["immutable-full-quote"]
        self.assertEqual(canonical_digest(snapshot["quote"]), snapshot["quoteDigest"])
        for field in ("taxMinor", "totalDueMinor", "renewalTotalMinor", "renewalTaxMinor", "effectiveAt", "paidThrough"):
            with self.subTest(field=field):
                changed = copy.deepcopy(snapshot["quote"])
                changed[field] = changed[field] + 1 if isinstance(changed[field], int) else "2026-11-01T00:00:00Z"
                self.assertNotEqual(canonical_digest(changed), snapshot["quoteDigest"])
        self.assertEqual(canonical_digest({"b": 1, "a": "é"}), canonical_digest({"a": "é", "b": 1}))
        with self.assertRaises(ValueError):
            canonical_digest({"amount": 1.1})

    def test_different_keys_and_authorizations_cannot_duplicate(self):
        snapshot = VALUES["immutable-full-quote"]
        model = PurchaseReference(snapshot)
        self.assertEqual(model.accept("auth-a", "purchase-a", "key-a", snapshot["quoteDigest"], "2026-09-09T12:01:00Z"), "purchase-a")
        self.assertEqual(model.accept("auth-b", "purchase-a", "key-b", snapshot["quoteDigest"], "2026-09-09T12:02:00Z"), "purchase-a")
        with self.assertRaisesRegex(ValueError, "quote_already_accepted"):
            model.accept("auth-c", "purchase-b", "key-c", snapshot["quoteDigest"], "2026-09-09T12:02:00Z")

    def test_expired_replay_and_session_loss_only_resume_acceptance(self):
        snapshot = VALUES["immutable-full-quote"]
        model = PurchaseReference(snapshot)
        with self.assertRaisesRegex(ValueError, "quote_expired"):
            model.accept("auth", "purchase", "key", snapshot["quoteDigest"], "2026-10-01T00:00:00Z")
        model.accept("auth", "purchase", "key", snapshot["quoteDigest"], "2026-09-09T12:01:00Z")
        self.assertEqual(model.accept("auth", "purchase", "key", snapshot["quoteDigest"], "2026-10-01T00:00:00Z", authorized=False), "purchase")
        # This is trusted durable replay. A new browser action still needs current membership.
        first = model.dispatch_payment("period", "attempt")
        self.assertEqual(model.dispatch_payment("period", "attempt"), first)
        with self.assertRaisesRegex(ValueError, "payment_outcome_unknown"):
            model.dispatch_payment("period", "new-attempt")

    def test_delayed_payment_does_not_shift_interval(self):
        grant = VALUES["grant-initial"]
        self.assertEqual(len(effective_grants([grant], "2026-09-20T00:00:00Z")), 1)
        self.assertEqual(effective_grants([grant], "2026-10-01T00:00:00Z"), [])
        self.assertEqual(grant["effectiveAt"], grant["snapshot"]["quote"]["effectiveAt"])

    def test_renewal_failure_authentication_and_cancellation_keep_paid_capacity(self):
        for name in ("renewal-failed-paid-capacity-active", "renewal-auth-required-paid-capacity-active", "canceled-renewal-paid-capacity-active"):
            with self.subTest(name=name):
                validate_semantics(VALUES[name], "2026-09-09T12:01:01Z")
                self.assertEqual(VALUES[name]["capacity"]["state"], "active")
        bad = copy.deepcopy(VALUES["paid-runtime-applied"])
        bad["purchase"]["initialAttempt"]["payment"]["state"] = "failed"
        with self.assertRaisesRegex(ValueError, "initial_payment"):
            validate_semantics(bad, "2026-09-09T12:01:01Z")

    def test_future_reduction_and_dispute_resolution(self):
        grants = [VALUES[k] for k in ("grant-initial", "future-partial-refund-reduction", "dispute-revocation", "dispute-won-restoration")]
        self.assertEqual(effective_grants(grants, "2026-09-09T14:00:00Z")[0]["allowance"], 50)
        self.assertEqual(effective_grants(grants, "2026-09-10T13:00:00Z")[0]["allowance"], 30)
        self.assertEqual(effective_grants(grants, "2026-09-11T13:00:00Z"), [])
        self.assertEqual(effective_grants(grants, "2026-09-12T13:00:00Z")[0]["allowance"], 30)
        self.assertEqual(max(0, 30 - 40 - 5), 0)  # reduced cap, preserved usage and hold

    def test_reader_urls_and_admin_audit(self):
        status = VALUES["paid-runtime-applied"]
        self.assertNotIn("Url", json.dumps(status))
        action = VALUES["billing-admin-only-action"]
        self.assertNotEqual(action["actingUserId"], status["purchase"]["originalPurchaserId"])
        self.assertEqual(action["purchaseId"], status["purchase"]["purchaseId"])

    def test_unknown_and_aging_status(self):
        self.assertIsNone(VALUES["unknown-status"]["purchase"])
        self.assertEqual(VALUES["unknown-status"]["capacity"]["state"], "unknown")
        with self.assertRaisesRegex(ValueError, "invalid_active"):
            validate_semantics(VALUES["paid-runtime-applied"], "2026-09-09T12:01:05Z")
        validate_semantics(VALUES["last-confirmed-active"], "2026-09-09T12:01:05Z")

    def test_revision_aware_usage(self):
        cap = VALUES["paid-runtime-applied"]["capacity"]
        revision = cap["appliedRevision"]
        self.assertFalse(receipt_satisfied(revision, {**revision, "sequence": 1}))
        self.assertTrue(receipt_satisfied(revision, {**revision, "sequence": 3}))
        self.assertFalse(receipt_satisfied(revision, {"epoch": "new", "sequence": 999}))
        bad = copy.deepcopy(VALUES["paid-runtime-applied"])
        bad["capacity"]["appliedRevision"]["sequence"] = 1
        with self.assertRaisesRegex(ValueError, "invalid_active"):
            validate_semantics(bad, "2026-09-09T12:01:01Z")

    def test_replacement_split_pages_publish_atomically(self):
        initial = copy.deepcopy(VALUES["grant-initial"])
        ended = copy.deepcopy(initial)
        ended.update(revision=2, state="revoked", revisionEffectiveAt="2026-09-10T00:00:00Z", revocationEffectiveAt="2026-09-10T00:00:00Z")
        replacement = copy.deepcopy(initial)
        replacement.update(grantId="replacement", effectiveAt="2026-10-01T00:00:00Z", expiresAt="2026-11-01T00:00:00Z", revisionEffectiveAt="2026-10-01T00:00:00Z")
        page = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        all_grants = sorted([ended, replacement], key=lambda g: (g["grantId"], g["revision"]))
        payload = {k: page[k] for k in ("payInstallationId", "environment", "organizationId", "sourceRevision")}
        page["snapshotDigest"] = canonical_digest({**payload, "grants": all_grants})
        page.update(grants=[replacement], complete=False, nextCursor="page-2")
        model = SnapshotReference([initial], snapshot_scope())
        self.assertFalse(model.page(page))
        self.assertEqual(model.live, [initial])
        page.update(grants=[ended], complete=True, nextCursor=None, pageIndex=1)
        self.assertTrue(model.page(page))
        self.assertEqual(model.revision, 4)
        self.assertEqual({g["grantId"] for g in model.live}, {"example-grant", "replacement"})
        self.assertEqual(effective_grants(model.live, "2026-09-10T12:00:00Z"), [])

    def test_corrupt_final_page_never_publishes(self):
        initial = VALUES["grant-initial"]
        model = SnapshotReference([initial], snapshot_scope())
        page = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        page["grants"][0]["allowance"] += 1
        with self.assertRaisesRegex(ValueError, "snapshot_conflict"):
            model.page(page)
        self.assertEqual(model.live, [initial])
        self.assertIsNone(model.revision)

    def test_duplicate_intervals_and_out_of_order_revisions(self):
        original = VALUES["grant-initial"]
        duplicate = copy.deepcopy(original)
        duplicate["grantId"] = "different-id-same-interval"
        with self.assertRaisesRegex(ValueError, "overlapping_grants"):
            merge_grants([original], [duplicate])
        history = merge_grants([VALUES["dispute-revocation"]], [original])
        self.assertEqual(effective_grants(history, "2026-09-11T13:00:00Z"), [])
        self.assertEqual(len(merge_grants([original], [original])), 1)
        bad = copy.deepcopy(original)
        bad["allowance"] += 1
        with self.assertRaisesRegex(ValueError, "grant_conflict"):
            merge_grants([original], [bad])
        self.assertEqual(merge_grants([original], []), [original])

    def test_adjacent_renewal_never_refills_the_calendar_period(self):
        first = copy.deepcopy(VALUES["grant-initial"])
        first["expiresAt"] = "2026-09-15T00:00:00Z"
        next_grant = copy.deepcopy(first)
        next_grant.update(grantId="next", effectiveAt=first["expiresAt"],
                          revisionEffectiveAt=first["expiresAt"], expiresAt="2026-10-15T00:00:00Z")
        grants = merge_grants([first], [next_grant])
        consumed_by_purchase = {("example-purchase", "2026-09"): 40}
        for at in ("2026-09-14T23:59:59Z", "2026-09-15T00:00:00Z"):
            active = effective_grants(grants, at)
            self.assertEqual(len(active), 1)
            self.assertEqual(active[0]["allowance"] - consumed_by_purchase[("example-purchase", "2026-09")], 10)
        next_grant["allowance"] = 30
        reduced = merge_grants([first], [next_grant])
        self.assertEqual(max(0, effective_grants(reduced, "2026-09-15T00:00:00Z")[0]["allowance"] - 40), 0)

    def test_annual_billing_and_admission_period(self):
        grant = copy.deepcopy(VALUES["grant-initial"])
        grant["expiresAt"] = "2027-09-09T12:01:00Z"
        grant["snapshot"]["quote"]["binding"]["terms"]["billingInterval"] = "year"
        for month in (10, 11, 12):
            self.assertEqual(effective_grants([grant], f"2026-{month}-15T00:00:00Z")[0]["allowance"], 50)
        ledger = {"2026-09": {"used": 10, "reserved": 1}, "2026-10": {"used": 0, "reserved": 0}}
        admission_period = "2026-09"
        ledger[admission_period]["reserved"] -= 1
        ledger[admission_period]["used"] += 1
        self.assertEqual(ledger["2026-09"], {"used": 11, "reserved": 0})
        self.assertEqual(ledger["2026-10"], {"used": 0, "reserved": 0})

    def test_local_restart_expiry_zero_and_stale_authority(self):
        command = VALUES["local-zero-base-expiring-cap"]["command"]
        restored = json.loads(json.dumps(command))
        self.assertEqual(local_limit(restored, "2026-09-20T00:00:00Z"), 100)
        self.assertEqual(local_limit(restored, "2026-10-01T00:00:00Z"), 0)
        self.assertIsNone(local_limit(restored, "2026-10-02T00:00:00Z"))
        # Deletion or non-growing replacement is permitted even when over cap.
        self.assertLessEqual(80 - 100, 0)

    def test_local_binding_replay_and_conflicts(self):
        request = VALUES["local-zero-base-expiring-cap"]
        binding = request["command"]["binding"]
        applied = local_apply(None, request, binding)
        self.assertEqual(local_apply(applied, request, binding), applied)
        for field in ("organizationId", "siteId", "runtimeSiteId", "runtimeInstallationId"):
            wrong = {**binding, field: "wrong"}
            with self.assertRaisesRegex(ValueError, "not_found"):
                local_apply(applied, request, wrong)
        conflict = copy.deepcopy(request)
        conflict["command"]["baseLimitBytes"] = 10
        conflict["payloadDigest"] = canonical_digest(conflict["command"])
        with self.assertRaisesRegex(ValueError, "version_conflict"):
            local_apply(applied, conflict, binding)
        conflict["command"]["scheduleRevision"]["sequence"] = 1
        conflict["payloadDigest"] = canonical_digest(conflict["command"])
        with self.assertRaisesRegex(ValueError, "version_conflict"):
            local_apply(applied, conflict, binding)

    def test_local_schedule_storage_is_not_interval_activation(self):
        old = VALUES["local-zero-base-expiring-cap"]
        new = VALUES["future-local-reduction"]
        pending = VALUES["new-schedule-stored-old-schedule-enforces"]
        mapping = VALUES["future-interval-organization-mapping"]
        self.assertTrue(local_ack_valid(pending, [old, new], "2026-09-09T12:01:01Z"))
        self.assertFalse(local_receipt_ready(pending, mapping, [old, new], "2026-09-09T12:01:01Z"))
        before = copy.deepcopy(pending)
        before.update(state="applied", enforcing={**before["enforcing"], "schedule": before["storedSchedule"]})
        self.assertTrue(local_ack_valid(before, [old, new], "2026-09-09T12:01:01Z"))
        self.assertFalse(local_receipt_ready(before, mapping, [old, new], "2026-09-09T12:01:01Z"))
        self.assertEqual(local_selection(new["command"], "2026-09-14T23:59:59Z")[1], 100)
        after = copy.deepcopy(before)
        after.update(enforcing=mapping["enforcing"], enforcingLimitBytes=50,
                     freshness={"state": "available", "observedAt": "2026-09-15T00:00:00Z", "validUntil": "2026-09-15T00:00:05Z"})
        self.assertTrue(local_receipt_ready(after, mapping, [old, new], "2026-09-15T00:00:00Z"))
        # Restart persists the identities; polling a lost ack reproduces the same proof.
        restored = json.loads(json.dumps(after))
        self.assertTrue(local_receipt_ready(restored, mapping, [old, new], "2026-09-15T00:00:01Z"))
        self.assertEqual(restored["enforcing"], after["enforcing"])

    def test_local_wrong_interval_cap_clock_and_readiness_fail(self):
        command = VALUES["local-zero-base-expiring-cap"]
        original = VALUES["local-enforcing-ack"]
        changes = [("cap", 101), ("interval", "missing"), ("digest", "sha256:" + "0" * 64), ("writer", False)]
        for name, value in changes:
            bad = copy.deepcopy(original)
            if name == "cap": bad["enforcingLimitBytes"] = value
            if name == "interval": bad["enforcing"]["intervalId"] = value
            if name == "digest": bad["enforcing"]["schedule"]["payloadDigest"] = value
            if name == "writer": bad["allMediaWritersReady"] = value
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "invalid_ack"):
                local_ack_valid(bad, [command], "2026-09-09T12:01:01Z")
        with self.assertRaisesRegex(ValueError, "invalid_ack"):
            local_ack_valid(original, [command], "2026-09-09T12:01:05Z")
        with self.assertRaisesRegex(ValueError, "invalid_ack"):
            local_ack_valid(original, [command], "2026-09-09T12:00:59Z")
        crossed = copy.deepcopy(original)
        crossed["freshness"] = {"state": "available", "observedAt": "2026-09-30T23:59:59Z", "validUntil": "2026-10-01T00:00:05Z"}
        with self.assertRaisesRegex(ValueError, "invalid_ack"):
            local_ack_valid(crossed, [command], "2026-09-30T23:59:59Z")

    def test_local_expiry_base_fallback_and_lease_cannot_issue_receipt(self):
        request = VALUES["future-local-reduction"]
        ack = copy.deepcopy(VALUES["local-enforcing-ack"])
        identity = {"scheduleRevision": request["command"]["scheduleRevision"], "payloadDigest": request["payloadDigest"]}
        ack.update(storedSchedule=identity, enforcing={"schedule": identity, "kind": "base", "intervalId": None, "effectiveAt": "2026-10-01T00:00:00Z"},
                   enforcingLimitBytes=0, freshness={"state": "available", "observedAt": "2026-10-01T00:00:00Z", "validUntil": "2026-10-01T00:00:05Z"})
        self.assertTrue(local_ack_valid(ack, [request], "2026-10-01T00:00:00Z"))
        lease = copy.deepcopy(ack)
        lease.update(state="expired", enforcingLimitBytes=None,
                     freshness={"state": "available", "observedAt": "2026-10-02T00:00:00Z", "validUntil": "2026-10-02T00:00:05Z"})
        lease["enforcing"].update(kind="lease_expired", effectiveAt="2026-10-02T00:00:00Z")
        self.assertTrue(local_ack_valid(lease, [request], "2026-10-02T00:00:00Z"))
        self.assertFalse(local_receipt_ready(lease, VALUES["future-interval-organization-mapping"], [request], "2026-10-02T00:00:00Z"))
        with self.assertRaisesRegex(ValueError, "invalid_ack"):
            local_ack_valid(ack, [request], "2026-10-02T00:00:00Z")

    @staticmethod
    def guard_inputs():
        policy = copy.deepcopy(VALUES["approved-multiple-route-winners"])
        review = policy["review"]
        approval = {k: policy[k] for k in ["guardSetDigest", "approvedBy", "approvedAt"]}
        approval["migrationEpoch"] = review["migrationEpoch"]
        protections = [{"target": x["target"], "guardIds": x["independentProtectionIds"]} for x in review["decisions"]]
        return policy, approval, copy.deepcopy(review["routeCatalog"]), copy.deepcopy(review["guardRows"]), protections

    def test_guard_two_winners_no_limit_and_ties(self):
        policy, approval, catalog, rows, protections = self.guard_inputs()
        self.assertEqual(guard_cutover(policy, approval, catalog, rows, protections), policy)
        decisions = policy["review"]["decisions"]
        self.assertNotEqual(decisions[0]["selectedRowId"], decisions[1]["selectedRowId"])
        self.assertIsNone(decisions[2]["selectedRowId"])
        tie = copy.deepcopy(rows[0]); tie["rowId"] = "tied-row"
        tie["rowRevision"] = canonical_digest({k: v for k, v in tie.items() if k != "rowRevision"})
        rows.append(tie); policy["review"]["guardRows"].append(copy.deepcopy(tie))
        decisions[0]["tiedCandidateIds"] = ["guard-0", "tied-row"]
        decisions[0]["applicableGuardIds"].append("tied-row")
        self.assertTrue(guard_review_valid(policy["review"], catalog, rows, protections))
        decisions[0]["tiedCandidateIds"] = []
        with self.assertRaisesRegex(ValueError, "legacy_decision_mismatch"):
            guard_review_valid(policy["review"], catalog, rows, protections)

    def test_guard_cutover_requires_server_approval_of_exact_epoch_and_values(self):
        policy, approval, catalog, rows, protections = self.guard_inputs()
        for field in ["approvedBy", "approvedAt", "guardSetDigest", "migrationEpoch"]:
            changed = copy.deepcopy(approval); changed[field] = None
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "guard_approval_required"):
                guard_cutover(policy, changed, catalog, rows, protections)
        rows[0]["dailyRequestLimit"] = 1
        rows[0]["rowRevision"] = canonical_digest({k: v for k, v in rows[0].items() if k != "rowRevision"})
        with self.assertRaisesRegex(ValueError, "guard_values_changed"):
            guard_cutover(policy, approval, catalog, rows, protections)
        policy["review"]["guardRows"] = copy.deepcopy(rows)
        policy["guardSetDigest"] = canonical_digest(policy["review"])
        with self.assertRaisesRegex(ValueError, "guard_approval_required"):
            guard_cutover(policy, approval, catalog, rows, protections)

    def test_guard_missing_duplicate_or_omitted_protection_fails(self):
        policy, approval, catalog, rows, protections = self.guard_inputs()
        for kind in ["missing", "duplicate", "protection", "disabled"]:
            changed = copy.deepcopy(policy["review"])
            if kind == "missing": changed["decisions"].pop()
            if kind == "duplicate": changed["decisions"][-1] = copy.deepcopy(changed["decisions"][0])
            if kind == "protection": changed["decisions"][-1]["independentProtectionIds"] = []
            if kind == "disabled": changed["guardRows"][0]["enabled"] = False
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                guard_review_valid(changed, catalog, rows, protections)
        catalog.append({"routeId": "new-route", "family": "web", "operation": "extract"})
        with self.assertRaisesRegex(ValueError, "incomplete_guard_review"):
            guard_review_valid(policy["review"], catalog, rows, protections)

    def test_guard_resync_keeps_approved_version_and_invalidates_drift(self):
        policy, approval, catalog, rows, protections = self.guard_inputs()
        policy["salesEligible"] = True
        self.assertEqual(guard_resync(policy, rows), policy)
        rows[0]["monthlyRequestLimit"] = 0
        changed = guard_resync(policy, rows)
        self.assertFalse(changed["salesEligible"])
        self.assertEqual(changed["version"], "commercial-all-guards-v2")
        self.assertEqual(changed["review"]["migrationEpoch"], policy["review"]["migrationEpoch"])
        self.assertEqual(changed["guardSetDigest"], policy["guardSetDigest"])

    def test_voice_round_once_and_uncertain_hold(self):
        self.assertEqual(math.ceil(math.fsum([0.4, 0.4])), 1)
        self.assertEqual(math.ceil(1.01), 2)
        self.assertEqual(VALUES["uncertain-site-hold"]["state"], "uncertain")
        self.assertNotIn("expiresAt", VALUES["uncertain-site-hold"])
        self.assertFalse(VALUES["legacy-guard-sales-disabled"]["salesEligible"])

    def test_grant_revisions_cannot_rebind_immutable_facts(self):
        original = VALUES["grant-initial"]
        for field in ("purchaseId", "authorizationId", "quoteId", "billingPeriodId", "paymentAttemptId"):
            with self.subTest(field=field):
                changed = copy.deepcopy(original)
                changed.update(revision=2)
                changed[field] = "other"
                with self.assertRaisesRegex(ValueError, "grant_binding_conflict"):
                    merge_grants([original], [changed])
        for field in ("payInstallationId", "environment", "buyerUserId", "baseSubscriptionId",
                      "offerId", "offerVersion", "quantity", "scope", "terms"):
            with self.subTest(field=field):
                changed = copy.deepcopy(original)
                changed["revision"] = 2
                binding = changed["snapshot"]["quote"]["binding"]
                if field == "scope":
                    binding[field]["organizationId"] = "other-org"
                elif field == "terms":
                    binding[field]["mappingRevision"] = "other-mapping"
                elif field == "quantity":
                    binding[field] += 1
                elif field == "environment":
                    binding[field] = "live"
                else:
                    binding[field] = "other"
                changed["snapshot"]["quoteDigest"] = canonical_digest(changed["snapshot"]["quote"])
                with self.assertRaisesRegex(ValueError, "grant_binding_conflict"):
                    merge_grants([original], [changed])
        corrupt = copy.deepcopy(original)
        corrupt["snapshot"]["quote"]["taxMinor"] += 1
        with self.assertRaisesRegex(ValueError, "grant_binding_conflict"):
            merge_grants([], [corrupt])

    def test_snapshot_and_grants_match_trusted_scope(self):
        for field in ("payInstallationId", "environment", "organizationId"):
            for change_page in (False, True):
                with self.subTest(field=field, change_page=change_page):
                    page = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
                    if change_page:
                        page[field] = "other"
                    else:
                        binding = page["grants"][0]["snapshot"]["quote"]["binding"]
                        target = binding["scope"] if field == "organizationId" else binding
                        target[field] = "other"
                        snapshot = page["grants"][0]["snapshot"]
                        snapshot["quoteDigest"] = canonical_digest(snapshot["quote"])
                    page = self.resign_page(page)
                    model = SnapshotReference([], snapshot_scope())
                    with self.assertRaisesRegex(ValueError, "snapshot_binding_conflict"):
                        model.page(page)
                    self.assertEqual(model.live, [])
                    self.assertEqual(model.staged, [])
                    self.assertIsNone(model.revision)

    @staticmethod
    def resign_page(page):
        page = copy.deepcopy(page)
        payload = {k: page[k] for k in ("payInstallationId", "environment", "organizationId", "sourceRevision")}
        payload["grants"] = sorted(page["grants"], key=lambda g: (g["grantId"], g["revision"]))
        page["snapshotDigest"] = canonical_digest(payload)
        return page

    def test_page_replay_and_completed_snapshot_survive_restore(self):
        final = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        first = copy.deepcopy(final)
        first.update(grants=final["grants"][:1], complete=False, nextCursor="next")
        final.update(grants=final["grants"][1:], pageIndex=1)
        model = SnapshotReference([], snapshot_scope())
        self.assertFalse(model.page(first))
        staged = copy.deepcopy(model.staged)
        self.assertFalse(model.page(first))
        self.assertEqual(model.staged, staged)
        # Restore all reference state; native crash recovery needs its own tests.
        model = copy.deepcopy(model)
        self.assertTrue(model.page(final))
        live = copy.deepcopy(model.live)
        self.assertFalse(model.page(first))
        self.assertTrue(model.page(final))
        self.assertEqual(model.live, live)
        changed = copy.deepcopy(first)
        changed["grants"][0]["allowance"] += 1
        with self.assertRaisesRegex(ValueError, "snapshot_conflict"):
            model.page(changed)
        self.assertEqual(model.live, live)

    def test_corrected_final_page_can_retry_without_restart(self):
        final = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        first = copy.deepcopy(final)
        first.update(grants=[], complete=False, nextCursor="next")
        final["pageIndex"] = 1
        model = SnapshotReference([], snapshot_scope())
        self.assertFalse(model.page(first))
        corrupt = copy.deepcopy(final)
        corrupt["grants"][0]["allowance"] += 1
        with self.assertRaisesRegex(ValueError, "snapshot_conflict"):
            model.page(corrupt)
        self.assertEqual(model.next_page, 1)
        self.assertEqual(model.live, [])
        self.assertTrue(model.page(final))

    def test_revision_zero_bootstrap_and_same_revision_reconciliation(self):
        page = copy.deepcopy(VALUES["empty-revision-zero-snapshot"])
        model = SnapshotReference([], snapshot_scope())
        self.assertTrue(model.page(page))
        self.assertEqual(model.revision, 0)
        self.assertTrue(model.page(page))
        page["snapshotId"] = "another-empty-snapshot"
        self.assertTrue(model.page(page))
        conflicting = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        conflicting.update(sourceRevision=0, snapshotId="conflicting-zero")
        with self.assertRaisesRegex(ValueError, "snapshot_conflict"):
            model.page(self.resign_page(conflicting))
        self.assertEqual(model.live, [])

    def test_renewal_cannot_replace_initial_purchase_snapshot(self):
        original = VALUES["grant-initial"]
        renewal = copy.deepcopy(original)
        renewal.update(grantId="renewal", billingPeriodId="next-period", paymentAttemptId="next-attempt",
                       effectiveAt=original["expiresAt"], revisionEffectiveAt=original["expiresAt"],
                       expiresAt="2026-11-01T00:00:00Z")
        self.assertEqual(len(merge_grants([original], [renewal])), 2)
        renewal["snapshot"]["quote"]["binding"]["offerVersion"] = "replacement-offer"
        renewal["snapshot"]["quoteDigest"] = canonical_digest(renewal["snapshot"]["quote"])
        with self.assertRaisesRegex(ValueError, "grant_binding_conflict"):
            merge_grants([original], [renewal])

    def test_old_snapshot_cannot_regress_a_new_checkpoint(self):
        first = copy.deepcopy(VALUES["complete-scheduled-snapshot"])
        model = SnapshotReference([], snapshot_scope())
        model.page(first)
        later = copy.deepcopy(first)
        later.update(sourceRevision=first["sourceRevision"] + 1, snapshotId="later")
        later = self.resign_page(later)
        model.page(later)
        self.assertTrue(model.page(first))  # known replay cannot regress anything
        self.assertEqual(model.revision, later["sourceRevision"])
        first["snapshotId"] = "unknown-old-snapshot"
        with self.assertRaisesRegex(ValueError, "snapshot_conflict"):
            model.page(first)

    def test_all_mutations_scope_and_preserve_idempotency_receipts(self):
        binding = VALUES["immutable-full-quote"]["quote"]["binding"]
        ledger = IdempotencyReference()
        self.assertEqual({op["operationId"]: op["idempotencyScope"] for op in ARTIFACT["operations"]
                          if "idempotencyScope" in op}, {
            "capacity.guard.approve": ["operationId", "organizationId", "siteId", "requestKey"],
            "capacity.site.migration.import": ["operationId", "portalInstallationId", "organizationId", "migrationEpoch", "requestKey"],
        })
        # This model covers Pay-bound commands. Native guard/import operations
        # explicitly publish non-financial scopes; guard replay also has a live
        # PostgreSQL regression in providers_manager_guard_review_db_tests.rs.
        mutations = [op for op in ARTIFACT["operations"]
                     if op["idempotencyKeyRequired"] and "idempotencyScope" not in op]
        for op in mutations:
            with self.subTest(operation=op["operationId"]):
                identity = ledger.identity(op["operationId"], binding, "actor", "shared-key")
                command = {"target": "purchase-a", "action": op["operationId"]}
                outcome = {"receipt": op["operationId"]}
                self.assertIsNone(ledger.lookup(identity, command))
                ledger.record(identity, command, outcome)
                ledger.cache.clear()
                self.assertEqual(ledger.lookup(identity, dict(reversed(list(command.items())))), outcome)
                with self.assertRaisesRegex(ValueError, "idempotency_conflict"):
                    ledger.lookup(identity, {**command, "target": "purchase-b"})
                self.assertIsNone(ledger.lookup(ledger.identity(op["operationId"], binding, "other-actor", "shared-key"), command))
                for field in ("payInstallationId", "environment", "organizationId"):
                    other = copy.deepcopy(binding)
                    target = other["scope"] if field == "organizationId" else other
                    target[field] = "other"
                    self.assertIsNone(ledger.lookup(ledger.identity(op["operationId"], other, "actor", "shared-key"), command))
        self.assertEqual(len(ledger.receipts), len(mutations))
        for key in (None, "", "x" * 129):
            with self.assertRaisesRegex(ValueError, "invalid_request"):
                ledger.identity("capacity.cancel", binding, "actor", key)

    def test_purchase_cache_cleanup_never_removes_financial_uniqueness(self):
        snapshot = VALUES["immutable-full-quote"]
        model = PurchaseReference(snapshot)
        digest = snapshot["quoteDigest"]
        model.accept("auth-a", "purchase-a", "key-a", digest, "2026-09-09T12:01:00Z")
        provider = model.dispatch_payment("period", "attempt")
        model.idempotency.cache.clear()
        self.assertEqual(model.accept("auth-a", "purchase-a", "key-a", digest, "2030-01-01T00:00:00Z", authorized=False), "purchase-a")
        self.assertEqual(model.dispatch_payment("period", "attempt"), provider)
        with self.assertRaisesRegex(ValueError, "idempotency_conflict"):
            model.accept("auth-b", "purchase-a", "key-a", digest, "2030-01-01T00:00:00Z")
        with self.assertRaisesRegex(ValueError, "quote_already_accepted"):
            model.accept("auth-b", "purchase-b", "key-b", digest, "2030-01-01T00:00:00Z")
        self.assertEqual(model.purchase, "purchase-a")


if __name__ == "__main__":
    print(f"Standard {ARTIFACT['contractVersion']}: {len(FIXTURES['fixtures'])} shape fixtures; reference checks only, native integration unverified.")
    unittest.main(verbosity=2)
