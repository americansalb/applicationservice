// Render's bare internal hostnames (e.g. "dpg-xxxx-a") have no dots and
// don't accept SSL. External hostnames (e.g. "dpg-xxxx-a.ohio-postgres.render.com")
// require SSL. The Render dashboard's "External Database URL" copy field does not
// always include "?sslmode=require", so detect from the hostname instead.
export function sslConfigForUrl(connectionString: string): false | { rejectUnauthorized: false } {
  try {
    const url = new URL(connectionString);
    return url.hostname.includes(".") ? { rejectUnauthorized: false } : false;
  } catch {
    return false;
  }
}
