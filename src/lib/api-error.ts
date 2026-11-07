import { ZodError } from "zod";
import { FishApiError } from "@/lib/fish/client";

/**
 * Map upstream Fish statuses to the status we expose to the browser.
 * 401/403 mean our server credential is bad, so it is an upstream failure
 * (502) rather than the browser being unauthorized.
 */
const FISH_HTTP_STATUS: Record<number, number> = {
  401: 502,
  403: 502,
  402: 402,
  404: 404,
  429: 429,
  500: 500,
  503: 503,
  504: 504,
};

export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "参数校验失败",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof SyntaxError) {
    return Response.json(
      { error: "请求体不是合法的 JSON。" },
      { status: 400 },
    );
  }

  if (error instanceof FishApiError) {
    if (error.status >= 500) {
      console.error("[fish]", error.status, error.message, error.detail ?? "");
    }
    return Response.json(
      {
        error: error.message,
        detail: error.detail,
        upstreamStatus: error.status,
      },
      { status: FISH_HTTP_STATUS[error.status] ?? 502 },
    );
  }

  console.error("[api] unhandled error", error);
  return Response.json(
    {
      error: "服务器内部错误",
      detail:
        process.env.NODE_ENV !== "production" && error instanceof Error
          ? error.message
          : undefined,
    },
    { status: 500 },
  );
}
