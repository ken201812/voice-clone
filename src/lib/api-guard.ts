/**
 * Defense-in-depth for a local-only app: browsers send Sec-Fetch-Site and
 * Origin on cross-origin requests, so reject anything that is clearly not
 * same-origin. Requests from curl/scripts (no headers) are still allowed.
 */
export function rejectCrossOrigin(request: Request): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return Response.json({ error: "跨站请求已拒绝" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return Response.json({ error: "非法请求来源" }, { status: 403 });
  }

  const requestHost = request.headers.get("host");
  if (requestHost && originHost !== requestHost) {
    return Response.json({ error: "跨站请求已拒绝" }, { status: 403 });
  }

  return null;
}
