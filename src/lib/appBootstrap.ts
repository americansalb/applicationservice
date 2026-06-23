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

// Recovery window: until this instant, /portal/claim will let the developer
// (re)set their password with the setup password even if the account was
// already claimed — needed because the deploy-time seed doesn't run on this
// service, so the one-time claim can't otherwise be re-armed. The setup
// password still gates it, and the window auto-closes afterward (the normal
// "only works once" self-destruct returns). Shorten or remove once recovered.
export const DEV_RECLAIM_UNTIL = Date.parse("2026-06-30T23:59:59Z");

export function devReclaimOpen(): boolean {
  return Number.isFinite(DEV_RECLAIM_UNTIL) && Date.now() < DEV_RECLAIM_UNTIL;
}
