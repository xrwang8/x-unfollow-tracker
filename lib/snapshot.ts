// 快照管理：存储、读取、对比、清理。每个快照包含时间戳 + 关注者列表。
// 数据存在 chrome.storage.local，保留 30 天，超期自动清理。

import type { FollowerUser } from "./x-api";

export interface Snapshot {
  id: string; // 时间戳字符串（如 "2026-01-15T14:32:01.234Z"）
  timestamp: number; // Date.now()
  users: FollowerUser[];
}

const STORAGE_KEY = "xut:snapshots";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/** 保存新快照。 */
export async function saveSnapshot(users: FollowerUser[]): Promise<Snapshot> {
  const now = Date.now();
  const snapshot: Snapshot = {
    id: new Date(now).toISOString(),
    timestamp: now,
    users,
  };

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const snapshots = (stored[STORAGE_KEY] as Snapshot[] | undefined) ?? [];
  snapshots.push(snapshot);

  // 清理超过 30 天的旧快照
  const cutoff = now - MAX_AGE_MS;
  const filtered = snapshots.filter((s) => s.timestamp >= cutoff);

  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  return snapshot;
}

/** 读取所有快照（倒序，最新的在前）。 */
export async function listSnapshots(): Promise<Snapshot[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const snapshots = (stored[STORAGE_KEY] as Snapshot[] | undefined) ?? [];
  return snapshots.sort((a, b) => b.timestamp - a.timestamp);
}

/** 删除指定快照。 */
export async function deleteSnapshot(id: string): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const snapshots = (stored[STORAGE_KEY] as Snapshot[] | undefined) ?? [];
  const filtered = snapshots.filter((s) => s.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

/** 对比两个快照，找出在 oldSnapshot 里有、在 newSnapshot 里没有的用户（取关）。 */
export function compareSnapshots(
  oldSnapshot: Snapshot,
  newSnapshot: Snapshot,
): FollowerUser[] {
  const newIds = new Set(newSnapshot.users.map((u) => u.id_str));
  return oldSnapshot.users.filter((u) => !newIds.has(u.id_str));
}

/** 找到 N 天前最接近的快照。 */
export function findSnapshotBefore(
  snapshots: Snapshot[],
  daysAgo: number,
): Snapshot | undefined {
  const target = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  // 找最接近 target 且 <= target 的快照
  const candidates = snapshots.filter((s) => s.timestamp <= target);
  return candidates.sort((a, b) => b.timestamp - a.timestamp)[0];
}
