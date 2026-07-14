// 混合策略：优先 API，失败时降级到 DOM 抓取。
// 自动检测 API 可用性并选择最佳方案。

import {
  fetchAllFollowers as fetchFollowersAPI,
  fetchAllFriends as fetchFriendsAPI,
  type FollowerUser,
} from "./x-api";
import {
  scrapFollowersFromDOM,
  scrapFriendsFromDOM,
} from "./dom-fallback";

export type FetchMode = "api" | "dom" | "auto";

interface FetchResult {
  ok: boolean;
  users: FollowerUser[];
  error?: string | undefined;
  method?: "api" | "dom"; // 实际使用的方法
}

/** 检测 API 是否失效（401/403/404 表示失效） */
function isAPIFailure(error?: string): boolean {
  if (!error) return false;
  return (
    error.includes("401") ||
    error.includes("403") ||
    error.includes("404") ||
    error.includes("认证失败")
  );
}

/** 混合策略：拉取关注者列表 */
export async function fetchFollowersHybrid(
  mode: FetchMode = "auto",
  onProgress?: (fetched: number, method: "api" | "dom") => void,
): Promise<FetchResult> {
  // 强制 DOM 模式
  if (mode === "dom") {
    const result = await scrapFollowersFromDOM((n) => onProgress?.(n, "dom"));
    return { ...result, method: "dom" };
  }

  // 强制 API 模式
  if (mode === "api") {
    const result = await fetchFollowersAPI((n) => onProgress?.(n, "api"));
    return { ...result, method: "api" };
  }

  // 自动模式：优先 API，失败降级 DOM
  const apiResult = await fetchFollowersAPI((n) => onProgress?.(n, "api"));

  // API 成功或者是 rate limit（429）→ 返回 API 结果
  if (apiResult.ok || apiResult.error?.includes("429")) {
    return { ...apiResult, method: "api" };
  }

  // API 失效（401/403/404）→ 降级到 DOM
  if (isAPIFailure(apiResult.error)) {
    console.warn("API 失效，降级到 DOM 抓取:", apiResult.error);
    const domResult = await scrapFollowersFromDOM((n) => onProgress?.(n, "dom"));
    return {
      ...domResult,
      method: "dom",
      error: domResult.ok
        ? `API 失效，已使用备用方案。原因: ${apiResult.error}`
        : domResult.error,
    };
  }

  // 其他错误（网络问题等）→ 返回 API 错误
  return { ...apiResult, method: "api" };
}

/** 混合策略：拉取关注列表 */
export async function fetchFriendsHybrid(
  mode: FetchMode = "auto",
  onProgress?: (fetched: number, method: "api" | "dom") => void,
): Promise<FetchResult> {
  if (mode === "dom") {
    const result = await scrapFriendsFromDOM((n) => onProgress?.(n, "dom"));
    return { ...result, method: "dom" };
  }

  if (mode === "api") {
    const result = await fetchFriendsAPI((n) => onProgress?.(n, "api"));
    return { ...result, method: "api" };
  }

  // 自动模式
  const apiResult = await fetchFriendsAPI((n) => onProgress?.(n, "api"));

  if (apiResult.ok || apiResult.error?.includes("429")) {
    return { ...apiResult, method: "api" };
  }

  if (isAPIFailure(apiResult.error)) {
    console.warn("API 失效，降级到 DOM 抓取:", apiResult.error);
    const domResult = await scrapFriendsFromDOM((n) => onProgress?.(n, "dom"));
    return {
      ...domResult,
      method: "dom",
      error: domResult.ok
        ? `API 失效，已使用备用方案。原因: ${apiResult.error}`
        : domResult.error,
    };
  }

  return { ...apiResult, method: "api" };
}

/** 检测 API 健康状态（用于设置页面） */
export async function checkAPIHealth(): Promise<{
  healthy: boolean;
  message: string;
}> {
  try {
    // 尝试拉取 1 个关注者（cursor=-1, count=1）
    const result = await fetchFollowersAPI();

    if (result.ok) {
      return { healthy: true, message: "API 正常工作" };
    }

    if (result.error?.includes("429")) {
      return { healthy: true, message: "API 正常（当前限速中）" };
    }

    if (isAPIFailure(result.error)) {
      return {
        healthy: false,
        message: `API 失效: ${result.error}。扩展将自动使用备用方案（DOM 抓取）`,
      };
    }

    return {
      healthy: false,
      message: `API 异常: ${result.error}`,
    };
  } catch (e) {
    return {
      healthy: false,
      message: `检测失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
