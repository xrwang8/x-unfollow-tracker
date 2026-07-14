import { useEffect, useState } from "react";
import { isLoggedIn } from "../../lib/x-api";
import {
  fetchFollowersHybrid,
  fetchFriendsHybrid,
} from "../../lib/hybrid-fetch";
import {
  compareSnapshots,
  deleteSnapshot,
  findSnapshotBefore,
  listSnapshots,
  saveSnapshot,
  type Snapshot,
  type SnapshotType,
} from "../../lib/snapshot";
import type { FollowerUser } from "../../lib/x-api";

type AnalysisMode = "unfollowers" | "non-mutual";

export function App() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [followersSnapshots, setFollowersSnapshots] = useState<Snapshot[]>([]);
  const [friendsSnapshots, setFriendsSnapshots] = useState<Snapshot[]>([]);
  const [compareDays, setCompareDays] = useState<7 | 30>(7);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("unfollowers");
  const [results, setResults] = useState<FollowerUser[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadAllSnapshots();
    chrome.cookies
      ?.get({ url: "https://x.com", name: "ct0" })
      .then((c) => setLoggedIn(!!c?.value))
      .catch(() => setLoggedIn(undefined));
  }, []);

  async function loadAllSnapshots() {
    const followers = await listSnapshots("followers");
    const friends = await listSnapshots("friends");
    setFollowersSnapshots(followers);
    setFriendsSnapshots(friends);
  }

  async function handleFetchFollowers() {
    if (!isLoggedIn()) {
      alert("未检测到 X 登录态，请先登录 x.com");
      return;
    }

    setLoading(true);
    setProgress("正在拉取关注者列表...");
    setResults([]);

    const result = await fetchFollowersHybrid("auto", (fetched, method) => {
      const methodText = method === "api" ? "API" : "页面滚动";
      setProgress(`[${methodText}] 已拉取 ${fetched} 人...`);
    });

    if (!result.ok) {
      setProgress(`失败: ${result.error}`);
      setLoading(false);
      return;
    }

    setProgress(`拉取完成，共 ${result.users.length} 人，正在保存...`);
    await saveSnapshot(result.users, "followers");
    await loadAllSnapshots();

    const finalMsg = result.method === "dom"
      ? `快照已保存：${result.users.length} 人 (使用备用方案)`
      : `快照已保存：${result.users.length} 人`;
    setProgress(finalMsg);
    setLoading(false);
  }

  async function handleFetchFriends() {
    if (!isLoggedIn()) {
      alert("未检测到 X 登录态，请先登录 x.com");
      return;
    }

    setLoading(true);
    setProgress("正在拉取你的关注列表...");
    setResults([]);

    const result = await fetchFriendsHybrid("auto", (fetched, method) => {
      const methodText = method === "api" ? "API" : "页面滚动";
      setProgress(`[${methodText}] 已拉取 ${fetched} 人...`);
    });

    if (!result.ok) {
      setProgress(`失败: ${result.error}`);
      setLoading(false);
      return;
    }

    setProgress(`拉取完成，共 ${result.users.length} 人，正在保存...`);
    await saveSnapshot(result.users, "friends");
    await loadAllSnapshots();

    const finalMsg = result.method === "dom"
      ? `快照已保存：${result.users.length} 人 (使用备用方案)`
      : `快照已保存：${result.users.length} 人`;
    setProgress(finalMsg);
    setLoading(false);
  }

  async function handleCompare() {
    const snapshots = analysisMode === "unfollowers" ? followersSnapshots : friendsSnapshots;

    if (snapshots.length < 2) {
      alert("至少需要 2 个快照才能对比");
      return;
    }

    const latest = snapshots[0];
    if (!latest) return;

    const old = findSnapshotBefore(snapshots, compareDays);
    if (!old) {
      alert(`找不到 ${compareDays} 天前的快照`);
      return;
    }

    if (analysisMode === "unfollowers") {
      // 谁取关了你：old 里有、latest 里没有
      const lost = compareSnapshots(old, latest);
      setResults(lost);
    } else {
      // 未回关列表：你关注的人里，有多少不在你的关注者列表
      // 需要同时有 friends 和 followers 快照
      if (friendsSnapshots.length === 0 || followersSnapshots.length === 0) {
        alert("需要同时检查关注者和你的关注才能分析未回关");
        return;
      }

      const latestFriends = friendsSnapshots[0];
      const latestFollowers = followersSnapshots[0];
      if (!latestFriends || !latestFollowers) return;

      // 在 friends 但不在 followers = 未回关
      const followerIds = new Set(latestFollowers.users.map((u) => u.id_str));
      const nonMutual = latestFriends.users.filter((u) => !followerIds.has(u.id_str));
      setResults(nonMutual);
    }
  }

  async function handleDelete(id: string, type: SnapshotType) {
    if (!confirm("确定删除此快照？")) return;
    await deleteSnapshot(id, type);
    await loadAllSnapshots();
    setResults([]);
  }

  return (
    <div className="wrap">
      <h1>X 取关追踪器</h1>
      <p className="sub">手动检查关注者变化，找出取关你的用户或未回关。</p>

      {loggedIn === false && (
        <div className="status warn">未检测到 X 登录态，请先登录 x.com。</div>
      )}

      <button className="btn" onClick={handleFetchFollowers} disabled={loading}>
        {loading ? "拉取中..." : "检查关注者"}
      </button>

      <button className="btn" onClick={handleFetchFriends} disabled={loading}>
        {loading ? "拉取中..." : "检查你的关注"}
      </button>

      {progress && <div className="status">{progress}</div>}

      {(followersSnapshots.length > 0 || friendsSnapshots.length > 0) && (
        <div className="section">
          <h2>历史快照</h2>

          {followersSnapshots.length > 0 && (
            <>
              <h3 style={{ fontSize: "13px", margin: "10px 0 6px", color: "var(--muted)" }}>
                关注者快照（{followersSnapshots.length} 个）
              </h3>
              <div className="snapshots">
                {followersSnapshots.map((s) => (
                  <div key={s.id} className="snapshot">
                    <span className="snapshot-date">
                      {new Date(s.timestamp).toLocaleString("zh-CN")}
                    </span>
                    <span className="snapshot-count">{s.users.length} 人</span>
                    <button
                      className="snapshot-del"
                      onClick={() => handleDelete(s.id, "followers")}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {friendsSnapshots.length > 0 && (
            <>
              <h3 style={{ fontSize: "13px", margin: "10px 0 6px", color: "var(--muted)" }}>
                你的关注快照（{friendsSnapshots.length} 个）
              </h3>
              <div className="snapshots">
                {friendsSnapshots.map((s) => (
                  <div key={s.id} className="snapshot">
                    <span className="snapshot-date">
                      {new Date(s.timestamp).toLocaleString("zh-CN")}
                    </span>
                    <span className="snapshot-count">{s.users.length} 人</span>
                    <button
                      className="snapshot-del"
                      onClick={() => handleDelete(s.id, "friends")}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {(followersSnapshots.length >= 2 || friendsSnapshots.length >= 2) && (
        <div className="section">
          <h2>对比分析</h2>
          <div className="compare">
            <select
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
            >
              <option value="unfollowers">谁取关了你</option>
              <option value="non-mutual">未回关列表</option>
            </select>
            <select
              value={compareDays}
              onChange={(e) => setCompareDays(Number(e.target.value) as 7 | 30)}
            >
              <option value={7}>过去 7 天</option>
              <option value={30}>过去 30 天</option>
            </select>
          </div>
          <button className="btn" onClick={handleCompare}>
            查看结果
          </button>

          {results.length > 0 && (
            <div>
              <h2>
                {analysisMode === "unfollowers"
                  ? `这些人取关了你（${results.length} 人）`
                  : `这些人未回关你（${results.length} 人）`}
              </h2>
              <div className="unfollowers">
                {results.map((u) => (
                  <div key={u.id_str} className="user">
                    {u.profile_image_url_https && (
                      <img
                        src={u.profile_image_url_https}
                        alt={u.screen_name}
                      />
                    )}
                    <div className="user-name">
                      <div>{u.name}</div>
                      <div className="user-handle">@{u.screen_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && (
            <div className="empty">点击"查看结果"按钮开始分析</div>
          )}
        </div>
      )}

      {followersSnapshots.length === 0 && friendsSnapshots.length === 0 && (
        <div className="empty">暂无快照，点击上方按钮开始检查</div>
      )}
    </div>
  );
}
