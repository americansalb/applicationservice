# Domain structure - derived from the AALB ↔ University Hospital agreement

Source: *Medical Interpreter and Translator Qualification Assessment Services
Agreement* (Doc `AALB-UH-2025-001`, original 2025-11-20, rev. 2026-03-10,
executed 2026-04-23). This is the reference the `/portal` platform is being
built to model. Where the agreement's own step numbering is inconsistent (it
is, in a couple of places), this document defines the canonical version we
build to and flags the discrepancy.

## 1. Parties and how they map to platform roles

| Agreement party | Who | Platform role |
| --- | --- | --- |
| **AALB** (the assessor) | Iris Lafitte (primary), Kevin Thakkar, Exec. Dir. (secondary); plus **Evaluators** | `DEVELOPER` |
| **Client** (the institution) | University Hospital; primary contact **Lawrenda Henry-Willis** (henrywla@uhnj.org), secondary HR | `MANAGER` |
| **Candidate** (the individual assessed) | Interpreters / translators / bilingual staff employed by the Client | `PROFESSIONAL` |

Key consequence: the agreement is between AALB and an **organization**, not an
individual manager. The platform therefore needs an **Organization** entity
that the manager(s) and candidates belong to. Standards docs, the agreement
itself, fees, term, and reporting all hang off the organization. (Our seeded
manager Lawrenda Henry-Willis / University Hospital already matches the real
contract.)

AALB **Evaluators** are a distinct concept from generic developers: they must
meet minimum credentials (defined in Step 0) and their inter-rater reliability
is tracked (see SLAs).

## 2. Engagement lifecycle

```
Organization signed
   │
   ▼
Step 0 - Institutional Partnership & Standards Alignment   (one-time, per org)
   → Written Standards Documentation  (deliverable, valid 2 years)
   │
   ▼
Per-Candidate Assessment  (repeated per interpreter/bilingual-staff member)
   → steps below, all required
   │
   ▼
Verification Documentation issued   (only if ALL steps pass; valid 2 years)
   │
   ▼
Renewal / re-assessment on expiry; revocation on fraud/misconduct/bad standing
```

## 3. Step 0 - Institutional Partnership & Standards Alignment ("Phase 0")

One-time per organization. Foundation for every later assessment.

- Review the Client's institutional language-access policies.
- Analyze applicable regulation: **ACA Section 1557**, **Title VI of the Civil
  Rights Act**, **ADA**.
- Collaborate with Client leadership to set **formal qualification benchmarks**.
- Produce **customized assessment rubrics** aligned to the Client's roles.
- **Deliverable: Written Standards Documentation. Valid 2 years.** Fee **$875**.

This is exactly the "Phase 0" placeholder in the current UI. It is an
organization-level artifact with a status and an expiry, not a per-candidate
thing.

## 4. Per-candidate assessment - pathways and components

An **Assessment** is defined in the agreement as the *complete, multi-step
qualification verification process for one Candidate*. There are two pathways.

### Pathway A - Medical Interpreter (Spoken Language **or** ASL / Trilingual)

Canonical component set (fees in USD, all required for verification):

| # | Component | Standard / detail | Fee |
| --- | --- | --- | --- |
| 1 | **Credential Verification & Application** | Verify certifications (CCHI, NBCMI, RID), and ≥40-hour medical interpreter training | $150 |
| 2 | **Language Proficiency** | Speaking + listening in every working language to **LTI L3+**; third-party results may be accepted under the §2.2 accommodation (fee then waived) | $475 |
| 3 | **Knowledge Examination** | Proctored written exam: professional ethics, interpreter role boundaries, HIPAA, medical terminology. **Pass ≥ 80%** | $385 |
| 4 | **Simulated Skills Assessment** | Recorded high-fidelity medical-encounter scenarios scored for linguistic accuracy, interpreting modes, encounter management (remote/video) | $475 |
| 5 | **Live Skills Observation** | Supervised observation in a real clinical setting or via technology platform | $775 |

> Source inconsistency to standardize: the Scope section labels the written
> exam "Step 3A" and the simulated assessment "Step 3B / Virtual", while the
> Fee section calls the written exam "Step 3 Knowledge Examination" and the
> recorded one "Step 3B Simulated Skills". We use the names in the table above
> and treat them as components 1–5, not as the literal "3A/3B/3C" labels.

These five map directly onto the five areas already in the UI
(`EVALUATION_CRITERIA`): credentials → 1, language proficiency → 2, ethical
decision-making → 3 (Knowledge Exam), virtual performance → 4 (Simulated),
live performance → 5 (Live). We should relabel/expand them to match the
agreement and attach the standards (LTI L3+, 80%, certs) and fees.

### Pathway B - Bilingual Staff (Pathway I)

| Component | Fee |
| --- | --- |
| Application & Scope Review | $150 |
| Language Proficiency Verification | $475 |
| Recognition & Safety Protocol | $250 |

**Additional languages:** +$200 per language beyond the primary pair.

### Out of scope (do **not** model as part of qualification)

Translation qualification assessment, Section 1557 website audits, training /
professional development, recruitment / placement, and any language not named
in advance. These are explicitly excluded services.

## 5. Verification, validity, outcomes

- **Verification Documentation** is issued **only** when a Candidate passes
  **all** required components. Partial completion = no verification. AALB's
  determination is **final and binding**.
- Valid **2 years**; re-assessment required after expiry.
- **Revocation** if fraud is discovered, on professional misconduct, or if the
  Client account is not in good standing.
- Candidates who do **not** pass receive **detailed feedback** (§5.5).

## 6. Performance standards / SLAs (modelable as metrics)

- **≥ 85% inter-rater reliability** on Simulated Skills evaluations (§17.3).
- **≥ 95% on-time completion** of scheduled assessments (§17.4).
- Assessment records retained **≥ 3 years** (§5.6).
- **Aggregate outcome reporting** to the Client on request (§5.7) → the
  "Reports" area in the nav.

## 7. Commercial terms (foundation for billing later)

- One-time Step 0 fee $875; per-step per-candidate fees as above.
- Each step is **invoiced once**, due within **60 days**; results released
  within **60 days of payment**. Late interest 0.9%/mo after 60 days; service
  suspended at 90 days overdue; charge disputes within 10 days.
- Fee changes need 60-day notice; volume discounts for **20+ candidates**.
- Term: **2 years**, auto-renews annually unless 60-day notice; convenience
  termination 90 days; cause termination immediate (30-day cure).

## 8. Proposed data model (refines the current skeleton)

Current skeleton: a single `app_user` table with role + a manager→professional
self-link. That covers identity but not the engagement. Proposed additions:

- **Organization** - name, address, status; agreement metadata (doc no.,
  effective date, term, renewal); relationships to users and candidates.
- **AppUser** (existing) - add `organizationId` (managers + professionals link
  to their org). Developers may carry evaluator attributes (credentials).
- **StandardsDocument** (Step 0 deliverable) - `organizationId`, status
  (`not_started | in_progress | completed`), `completedAt`, `expiresAt`
  (+2 yrs), rubric/benchmark payload.
- **Candidate profile** (extends the professional) - `pathway`
  (`medical_spoken | medical_asl_trilingual | bilingual_staff`), working
  languages (primary pair + additional), national certifications.
- **Assessment** - one per candidate engagement: `pathway`, overall `status`,
  `verificationStatus` (`none | verified | failed | revoked`), `verifiedAt`,
  `expiresAt`.
- **AssessmentStep** - `assessmentId`, `component` (the 1–5 above or the
  bilingual set), `status` (`not_started | scheduled | in_progress | passed |
  failed | waived`), `score`, `evaluatorId`, `scheduledAt`, `completedAt`,
  `feedback`, fee + payment status.
- **(Later)** Invoice/payment per step; evaluator inter-rater metrics;
  aggregate report snapshots.

### What each role then sees (grounded, not placeholder)

- **Developer (AALB):** organizations; Step 0 / standards status per org;
  candidates across orgs; assessments in progress; evaluator assignments and
  SLA metrics (85% IRR, 95% on-time); reporting.
- **Manager (Client):** their organization's Standards Documentation status +
  expiry; roster of candidates with per-component progress (e.g. "3 of 5,
  awaiting Live Skills"), verification status + expiry; action items
  (provide credentials, schedule observation, overdue invoices).
- **Professional (Candidate):** their pathway, per-component status and what's
  next, feedback on any failed component, verification + expiry.

## 9. Suggested build order

1. Organization entity + link managers/candidates to it; seed University
   Hospital from the real agreement.
2. Standards Documentation (Step 0) tracking - turns the "Phase 0" placeholder
   into a real org-level status with expiry.
3. Assessment + AssessmentStep per candidate using the five components; relabel
   the evaluation areas to match the agreement and attach standards.
4. Verification documentation (all-or-nothing, 2-year expiry) + feedback.
5. SLA metrics + aggregate reporting; later, invoicing/payment per step.
