// DOM 抓取备用方案：当 API 失效时，通过滚动页面抓取关注者/关注列表。
// 这是降级方案，速度慢但在 API 失效时可以继续工作。
//
// 注意：DOM 抓取需要用户在正确的页面（followers/following），
// 并且扩展会模拟滚动操作，用户会看到页面自动滚动。

import type { FollowerUser } from "./x-api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 从 UserCell 元素提取用户信息 */
function extractUserFromCell(cell: Element): FollowerUser | null {
  try {
    // 提取 screen_name（从 @username 格式）
    const handleElement = cell.querySelector('[dir="ltr"] span');
    const handleText = handleElement?.textContent?.trim();
    const screenName = handleText?.replace(/^@/, "");
    if (!screenName) return null;

    // 提取 name（显示名称）
    const nameElement = cell.querySelector(
      '[data-testid="UserCell"] > div > div:nth-child(2) > div > div > div > a > div > div > span',
    );
    const name = nameElement?.textContent?.trim() || screenName;

    // 提取头像 URL
    const avatarImg = cell.querySelector("img[src*='pbs.twimg.com']") as HTMLImageElement;
    const profileImageUrl = avatarImg?.src;

    // 生成伪 ID（DOM 抓取无法获取真实 user_id）
    const idStr = `dom_${screenName}`;

    return {
      id_str: idStr,
      screen_name: screenName,
      name,
      profile_image_url_https: profileImageUrl,
    };
  } catch {
    return null;
  }
}

/** 滚动页面直到加载完所有用户 */
async function scrollToLoadAll(
  onProgress?: (fetched: number) => void,
): Promise<Set<string>> {
  const seenScreenNames = new Set<string>();
  let previousHeight = 0;
  let stableCount = 0;
  const MAX_STABLE = 3; // 高度连续 3 次不变就认为到底了

  while (stableCount < MAX_STABLE) {
    // 滚动到底部
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1500); // 等待加载（比竞品的 1s 稍长，更稳定）

    // 提取当前可见的所有 UserCell
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    for (const cell of cells) {
      const user = extractUserFromCell(cell);
      if (user?.screen_name) {
        seenScreenNames.add(user.screen_name);
      }
    }

    onProgress?.(seenScreenNames.size);

    // 检查高度是否还在增长
    const currentHeight = document.body.scrollHeight;
    if (currentHeight === previousHeight) {
      stableCount++;
    } else {
      stableCount = 0;
      previousHeight = currentHeight;
    }
  }

  return seenScreenNames;
}

/** DOM 抓取：拉取关注者列表（需要在 x.com/{handle}/followers 页面执行） */
export async function scrapFollowersFromDOM(
  onProgress?: (fetched: number) => void,
): Promise<{ ok: boolean; users: FollowerUser[]; error?: string }> {
  try {
    // 检查当前 URL 是否在正确页面
    if (!window.location.href.includes("/followers") && !window.location.href.includes("/verified_followers")) {
      return {
        ok: false,
        users: [],
        error: "请先打开你的关注者页面（x.com/{你的用户名}/followers）",
      };
    }

    const screenNames = await scrollToLoadAll(onProgress);

    // 重新扫描 DOM 提取完整用户信息
    const users: FollowerUser[] = [];
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    for (const cell of cells) {
      const user = extractUserFromCell(cell);
      if (user && screenNames.has(user.screen_name)) {
        users.push(user);
      }
    }

    return { ok: true, users };
  } catch (e) {
    return {
      ok: false,
      users: [],
      error: `DOM 抓取失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** DOM 抓取：拉取关注列表（需要在 x.com/{handle}/following 页面执行） */
export async function scrapFriendsFromDOM(
  onProgress?: (fetched: number) => void,
): Promise<{ ok: boolean; users: FollowerUser[]; error?: string }> {
  try {
    if (!window.location.href.includes("/following")) {
      return {
        ok: false,
        users: [],
        error: "请先打开你的关注页面（x.com/{你的用户名}/following）",
      };
    }

    const screenNames = await scrollToLoadAll(onProgress);

    const users: FollowerUser[] = [];
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    for (const cell of cells) {
      const user = extractUserFromCell(cell);
      if (user && screenNames.has(user.screen_name)) {
        users.push(user);
      }
    }

    return { ok: true, users };
  } catch (e) {
    return {
      ok: false,
      users: [],
      error: `DOM 抓取失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
