// One-time bootstrap for the hardcoded platform developer account.
//
// `kevin@aalb.org` is seeded as a "claimable" DEVELOPER (random password,
// mustChangePassword=true). The /portal/claim page accepts the setup password
// below and lets him set his real password exactly once; after that the
// account is no longer claimable (mustChangePassword=false), so the page and
// endpoint self-destruct.
//
// Security note: this setup password lives in the repo by request. It only
// works while the account is unclaimed, so claim it immediately after first
// deploy. Override it in any real environment by setting DEV_BOOTSTRAP_PASSWORD.
export const DEV_BOOTSTRAP_EMAIL = "kevin@aalb.org";

export const DEV_BOOTSTRAP_PASSWORD =
  process.env.DEV_BOOTSTRAP_PASSWORD || "AALB-Dev-Setup-2026!";

// Recovery window for /portal/claim. CLOSED: the developer account has been
// claimed, so the normal "only works once" self-destruct applies again. Set
// this to a future instant (e.g. Date.parse("2026-12-31T23:59:59Z")) only if
// the claim ever needs to be temporarily re-opened for recovery.
export const DEV_RECLAIM_UNTIL = 0;

export function devReclaimOpen(): boolean {
  return Number.isFinite(DEV_RECLAIM_UNTIL) && Date.now() < DEV_RECLAIM_UNTIL;
}
