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

// Render's bare internal hostnames ("dpg-xxxx-a", no dot) only resolve on the
// private network. When a service isn't on that network, the name fails DNS
// entirely (getaddrinfo ENOTFOUND) — which is exactly what happens to this
// service. Rewrite such hosts to the database's PUBLIC hostname
// (<host>.<region>-postgres.render.com, TLS), which resolves and connects from
// anywhere. The region defaults to the DB's home region (ohio, verified
// reachable); override with RENDER_DB_REGION if the database ever moves.
export function externalizeRenderHost(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (/^dpg-[a-z0-9-]+$/i.test(url.hostname)) {
      const region = process.env.RENDER_DB_REGION || "ohio";
      url.hostname = `${url.hostname}.${region}-postgres.render.com`;
      if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
      return url.toString();
    }
  } catch {
    /* fall through and return the original string unchanged */
  }
  return connectionString;
}
