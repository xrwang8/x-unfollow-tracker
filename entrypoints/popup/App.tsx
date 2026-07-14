import { useEffect, useState } from "react";
import { fetchAllFollowers, isLoggedIn } from "../../lib/x-api";
import {
  compareSnapshots,
  deleteSnapshot,
  findSnapshotBefore,
  listSnapshots,
  saveSnapshot,
  type Snapshot,
} from "../../lib/snapshot";
import type { FollowerUser } from "../../lib/x-api";

export function App() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [compareDays, setCompareDays] = useState<7 | 30>(7);
  const [unfollowers, setUnfollowers] = useState<FollowerUser[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadSnapshots();
    chrome.cookies
      ?.get({ url: "https://x.com", name: "ct0" })
      .then((c) => setLoggedIn(!!c?.value))
      .catch(() => setLoggedIn(undefined));
  }, []);

  async function loadSnapshots() {
    const list = await listSnapshots();
    setSnapshots(list);
  }

  async function handleFetch() {
    if (!isLoggedIn()) {
      alert("未检测到 X 登录态，请先登录 x.com");
      return;
    }

    setLoading(true);
    setProgress("正在拉取关注者列表...");
    setUnfollowers([]);

    const result = await fetchAllFollowers((fetched) => {
      setProgress(`已拉取 ${fetched} 人...`);
    });

    if (!result.ok) {
      setProgress(`失败: ${result.error}`);
      setLoading(false);
      return;
    }

    setProgress(`拉取完成，共 ${result.users.length} 人，正在保存...`);
    await saveSnapshot(result.users);
    await loadSnapshots();
    setProgress(`快照已保存：${result.users.length} 人`);
    setLoading(false);
  }

  async function handleCompare() {
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

    const lost = compareSnapshots(old, latest);
    setUnfollowers(lost);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此快照？")) return;
    await deleteSnapshot(id);
    await loadSnapshots();
    setUnfollowers([]);
  }

  return (
    <div className="wrap">
      <h1>X 取关追踪器</h1>
      <p className="sub">手动检查关注者变化，找出取关你的用户。</p>

      {loggedIn === false && (
        <div className="status warn">未检测到 X 登录态，请先登录 x.com。</div>
      )}

      <button className="btn" onClick={handleFetch} disabled={loading}>
        {loading ? "拉取中..." : "立即检查关注者"}
      </button>

      {progress && <div className="status">{progress}</div>}

      {snapshots.length > 0 && (
        <div className="section">
          <h2>历史快照（{snapshots.length} 个）</h2>
          <div className="snapshots">
            {snapshots.map((s) => (
              <div key={s.id} className="snapshot">
                <span className="snapshot-date">
                  {new Date(s.timestamp).toLocaleString("zh-CN")}
                </span>
                <span className="snapshot-count">{s.users.length} 人</span>
                <button
                  className="snapshot-del"
                  onClick={() => handleDelete(s.id)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshots.length >= 2 && (
        <div className="section">
          <h2>对比分析</h2>
          <div className="compare">
            <select
              value={compareDays}
              onChange={(e) => setCompareDays(Number(e.target.value) as 7 | 30)}
            >
              <option value={7}>过去 7 天</option>
              <option value={30}>过去 30 天</option>
            </select>
            <button className="btn" onClick={handleCompare} style={{ width: "auto", padding: "8px 16px" }}>
              查看取关
            </button>
          </div>

          {unfollowers.length > 0 && (
            <div>
              <h2>这些人取关了你（{unfollowers.length} 人）</h2>
              <div className="unfollowers">
                {unfollowers.map((u) => (
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

          {unfollowers.length === 0 && compareDays && (
            <div className="empty">暂无对比结果，点击"查看取关"按钮分析</div>
          )}
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="empty">暂无快照，点击上方按钮开始检查</div>
      )}
    </div>
  );
}
