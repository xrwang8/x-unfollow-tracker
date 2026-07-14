// 快照管理：存储、读取、对比、清理。每个快照包含时间戳 + 关注者列表。
// 数据存在 chrome.storage.local，保留 30 天，超期自动清理。
// 支持两种快照类型：followers（关注你的）和 friends（你关注的）。

import type { FollowerUser } from "./x-api";

export type SnapshotType = "followers" | "friends";

export interface Snapshot {
  id: string; // 时间戳字符串（如 "2026-01-15T14:32:01.234Z"）
  timestamp: number; // Date.now()
  users: FollowerUser[];
  type: SnapshotType; // 快照类型
}

const STORAGE_KEY_FOLLOWERS = "xut:snapshots:followers";
const STORAGE_KEY_FRIENDS = "xut:snapshots:friends";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

function storageKey(type: SnapshotType): string {
  return type === "followers" ? STORAGE_KEY_FOLLOWERS : STORAGE_KEY_FRIENDS;
}

/** 保存新快照。 */
export async function saveSnapshot(
  users: FollowerUser[],
  type: SnapshotType,
): Promise<Snapshot> {
  const now = Date.now();
  const snapshot: Snapshot = {
    id: new Date(now).toISOString(),
    timestamp: now,
    users,
    type,
  };

  const key = storageKey(type);
  const stored = await chrome.storage.local.get(key);
  const snapshots = (stored[key] as Snapshot[] | undefined) ?? [];
  snapshots.push(snapshot);

  // 清理超过 30 天的旧快照
  const cutoff = now - MAX_AGE_MS;
  const filtered = snapshots.filter((s) => s.timestamp >= cutoff);

  await chrome.storage.local.set({ [key]: filtered });
  return snapshot;
}

/** 读取所有快照（倒序，最新的在前）。 */
export async function listSnapshots(type: SnapshotType): Promise<Snapshot[]> {
  const key = storageKey(type);
  const stored = await chrome.storage.local.get(key);
  const snapshots = (stored[key] as Snapshot[] | undefined) ?? [];
  return snapshots.sort((a, b) => b.timestamp - a.timestamp);
}

/** 删除指定快照。 */
export async function deleteSnapshot(id: string, type: SnapshotType): Promise<void> {
  const key = storageKey(type);
  const stored = await chrome.storage.local.get(key);
  const snapshots = (stored[key] as Snapshot[] | undefined) ?? [];
  const filtered = snapshots.filter((s) => s.id !== id);
  await chrome.storage.local.set({ [key]: filtered });
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
