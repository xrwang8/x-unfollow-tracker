// 调用 X 自家的 followers/list.json 接口拉取关注者列表。复用认证方式：
// 页面 ct0 CSRF cookie + 站点公开 bearer + 浏览器同源 cookie。
//
// followers/list 是分页接口，每次最多返回 200 人 + next_cursor。需要循环调用
// 直到 next_cursor = 0 才算拉完。限速 + 退避避免触发 X 的反滥用检测。

export interface FollowerUser {
  id_str: string;
  screen_name: string;
  name: string;
  profile_image_url_https?: string;
}

export interface FetchResult {
  ok: boolean;
  users?: FollowerUser[];
  nextCursor?: string | undefined;
  status?: number;
  retryable?: boolean;
  retryAfterMs?: number | undefined;
}

// X web 长期使用的公开 bearer（站点自己也发这个）。
const X_BEARER =
  "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const FOLLOWERS_ENDPOINT = "/i/api/1.1/followers/list.json";
const FRIENDS_ENDPOINT = "/i/api/1.1/friends/list.json";

// 限速 — 读操作，间隔 + 抖动 + 退避。
const REQUEST_DELAY_MS = 1000;
const REQUEST_JITTER_MS = 500;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const TRANSIENT_COOLDOWN_MS = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 从页面 cookie 读 ct0（X 的 CSRF token）。 */
function ct0(): string {
  return document.cookie.match(/ct0=([^;]+)/)?.[1] ?? "";
}

function apiOrigin(): string {
  return location.hostname.endsWith("twitter.com")
    ? "https://twitter.com"
    : "https://x.com";
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

/** 单次 followers/list 调用（一页）。 */
async function fetchFollowersPage(cursor: string = "-1"): Promise<FetchResult> {
  try {
    const csrf = ct0();
    if (!csrf) return { ok: false, retryable: false };

    const params = new URLSearchParams({
      count: "200",
      cursor,
      skip_status: "true",
      include_user_entities: "false",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(`${apiOrigin()}${FOLLOWERS_ENDPOINT}?${params}`, {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
      headers: {
        authorization: X_BEARER,
        "x-csrf-token": csrf,
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-active-user": "yes",
      },
    }).finally(() => clearTimeout(timer));

    const status = res.status;
    if (!res.ok) {
      return {
        ok: false,
        status,
        retryAfterMs: parseRetryAfterMs(res.headers.get("retry-after")),
        retryable:
          status === 408 || status === 425 || status === 429 || status >= 500,
      };
    }

    const data = (await res.json()) as {
      users?: FollowerUser[];
      next_cursor_str?: string;
    };
    return {
      ok: true,
      status,
      users: data.users ?? [],
      nextCursor: data.next_cursor_str,
    };
  } catch {
    return { ok: false, retryable: true };
  }
}

/** 单次 friends/list 调用（一页）。 */
async function fetchFriendsPage(cursor: string = "-1"): Promise<FetchResult> {
  try {
    const csrf = ct0();
    if (!csrf) return { ok: false, retryable: false };

    const params = new URLSearchParams({
      count: "200",
      cursor,
      skip_status: "true",
      include_user_entities: "false",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(`${apiOrigin()}${FRIENDS_ENDPOINT}?${params}`, {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
      headers: {
        authorization: X_BEARER,
        "x-csrf-token": csrf,
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-active-user": "yes",
      },
    }).finally(() => clearTimeout(timer));

    const status = res.status;
    if (!res.ok) {
      return {
        ok: false,
        status,
        retryAfterMs: parseRetryAfterMs(res.headers.get("retry-after")),
        retryable:
          status === 408 || status === 425 || status === 429 || status >= 500,
      };
    }

    const data = (await res.json()) as {
      users?: FollowerUser[];
      next_cursor_str?: string;
    };
    return {
      ok: true,
      status,
      users: data.users ?? [],
      nextCursor: data.next_cursor_str,
    };
  } catch {
    return { ok: false, retryable: true };
  }
}

/** 拉取完整关注者列表（自动分页，带限速 + 退避）。返回进度回调。 */
export async function fetchAllFollowers(
  onProgress?: (fetched: number, total: number) => void,
): Promise<{ ok: boolean; users: FollowerUser[]; error?: string }> {
  const all: FollowerUser[] = [];
  let cursor = "-1";
  let pageCount = 0;

  while (cursor !== "0") {
    // 限速：首页立即执行，后续页间隔 + 抖动
    if (pageCount > 0) {
      const jitter = Math.floor(Math.random() * REQUEST_JITTER_MS);
      await sleep(REQUEST_DELAY_MS + jitter);
    }

    const result = await fetchFollowersPage(cursor);
    pageCount++;

    if (!result.ok) {
      if (result.status === 429) {
        return {
          ok: false,
          users: all,
          error: `Rate limit (429)，已拉取 ${all.length} 人`,
        };
      }
      if (result.retryable) {
        // 遇到临时错误，等一会儿重试一次
        await sleep(TRANSIENT_COOLDOWN_MS);
        const retry = await fetchFollowersPage(cursor);
        if (!retry.ok) {
          return {
            ok: false,
            users: all,
            error: `请求失败 (status ${retry.status})，已拉取 ${all.length} 人`,
          };
        }
        all.push(...(retry.users ?? []));
        cursor = retry.nextCursor ?? "0";
      } else {
        return {
          ok: false,
          users: all,
          error: `认证失败 (status ${result.status})`,
        };
      }
    } else {
      all.push(...(result.users ?? []));
      cursor = result.nextCursor ?? "0";
    }

    onProgress?.(all.length, -1); // total 未知，传 -1
  }

  return { ok: true, users: all };
}

/** 拉取完整关注列表（你关注的人，自动分页，带限速 + 退避）。 */
export async function fetchAllFriends(
  onProgress?: (fetched: number, total: number) => void,
): Promise<{ ok: boolean; users: FollowerUser[]; error?: string }> {
  const all: FollowerUser[] = [];
  let cursor = "-1";
  let pageCount = 0;

  while (cursor !== "0") {
    if (pageCount > 0) {
      const jitter = Math.floor(Math.random() * REQUEST_JITTER_MS);
      await sleep(REQUEST_DELAY_MS + jitter);
    }

    const result = await fetchFriendsPage(cursor);
    pageCount++;

    if (!result.ok) {
      if (result.status === 429) {
        return {
          ok: false,
          users: all,
          error: `Rate limit (429)，已拉取 ${all.length} 人`,
        };
      }
      if (result.retryable) {
        await sleep(TRANSIENT_COOLDOWN_MS);
        const retry = await fetchFriendsPage(cursor);
        if (!retry.ok) {
          return {
            ok: false,
            users: all,
            error: `请求失败 (status ${retry.status})，已拉取 ${all.length} 人`,
          };
        }
        all.push(...(retry.users ?? []));
        cursor = retry.nextCursor ?? "0";
      } else {
        return {
          ok: false,
          users: all,
          error: `认证失败 (status ${result.status})`,
        };
      }
    } else {
      all.push(...(result.users ?? []));
      cursor = result.nextCursor ?? "0";
    }

    onProgress?.(all.length, -1);
  }

  return { ok: true, users: all };
}

/** 当前是否已登录 X（有 ct0 cookie）。 */
export function isLoggedIn(): boolean {
  return ct0().length > 0;
}
