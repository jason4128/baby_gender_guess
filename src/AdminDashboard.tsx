import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { SiteConfig, Guess } from './types';

function formatDate(dateValue: any) {
  if (!dateValue) return "";
  try {
    let date;
    if (dateValue?.toDate) {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-TW", { hour12: false });
  } catch {
    return "";
  }
}

function toDatetimeLocalValue(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str: string) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AdminDashboard() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    eventTitle: "猜猜我們的小寶寶是男生還是女生 💜",
    eventSubtitle: "一起來猜猜看，猜對的人會抽小禮物唷！",
    closeTime: "2026-08-30T23:59:59",
    isVotingOpen: true,
    actualGender: "",
    winnerCount: 3
  });
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Guess[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const configRef = doc(db, "settings", "siteConfig");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setSiteConfig(prev => ({ ...prev, ...configSnap.data() as SiteConfig }));
      }

      const guessesSnap = await getDocs(collection(db, "guesses"));
      const guessesData = guessesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Guess[];

      guessesData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setGuesses(guessesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "siteConfig"), {
        ...siteConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("網站設定已儲存！");
      loadData();
    } catch (error) {
      console.error("Error saving config:", error);
      alert("儲存失敗");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setSiteConfig(prev => ({
      ...prev,
      [id]: id === 'isVotingOpen' ? value === 'true' : id === 'winnerCount' ? Number(value) : value
    }));
  };

  const drawWinners = () => {
    if (!siteConfig.actualGender) {
      alert("請先在「網站設定」填入實際寶寶性別，再抽獎。");
      return;
    }
    const correct = guesses.filter(g => g.gender === siteConfig.actualGender);
    if (correct.length === 0) {
      alert("沒有猜對的人可抽獎。");
      return;
    }

    const shuffled = [...correct].sort(() => 0.5 - Math.random());
    setWinners(shuffled.slice(0, Math.min(siteConfig.winnerCount, correct.length)));
  };

  const deleteGuess = async (id: string) => {
    if (!window.confirm("確定要刪除這筆投票資料嗎？")) return;
    try {
      await deleteDoc(doc(db, "guesses", id));
      loadData();
    } catch (error) {
      console.error("Error deleting guess:", error);
    }
  };

  const exportCSV = () => {
    const headers = ["姓名", "聯絡方式", "猜測", "關係", "想抽到的禮物", "祝福留言", "建立時間", "是否猜對"];
    const rows = guesses.map(item => {
      const isCorrect = siteConfig.actualGender
        ? (item.gender === siteConfig.actualGender ? "猜對" : "未中")
        : "尚未揭曉";
      return [
        item.name || "",
        item.contact || "",
        item.gender || "",
        item.relation || "",
        item.giftWish || "",
        item.wish || "",
        formatDate(item.createdAt),
        isCorrect
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baby_gender_guesses.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const correctGuesses = siteConfig.actualGender ? guesses.filter(g => g.gender === siteConfig.actualGender) : [];
  const boyVotes = guesses.filter(g => g.gender === "男寶").length;
  const girlVotes = guesses.filter(g => g.gender === "女寶").length;

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="w-[min(1320px,calc(100%-32px))] mx-auto py-6 pb-10">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-[color:var(--color-primary-dark)] text-3xl font-bold mb-2">猜寶寶性別｜管理後台 💜</h1>
          <p className="text-[color:var(--color-muted)] leading-relaxed">這裡可以管理網站設定、查看投票名單、匯出資料、設定正確答案與抽出得獎者。</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <a href="#/" className="bg-white text-[color:var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm no-underline">回首頁</a>
          <button onClick={loadData} className="bg-white text-[color:var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm">重新整理資料</button>
          <button onClick={exportCSV} className="bg-gradient-to-br from-[var(--color-primary)] to-[#aa91ff] text-white shadow-[0_12px_26px_rgba(140,111,232,.25)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform">匯出 CSV</button>
        </div>
      </div>

      <section className="bg-white/80 border border-white/90 shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm">
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[color:var(--color-primary-dark)] text-xl font-bold">投票統計</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(140,111,232,.08)]">
            <div className="text-[color:var(--color-muted)] text-sm font-bold mb-2">總投票數</div>
            <div className="text-[color:var(--color-primary-dark)] text-3xl font-extrabold">{guesses.length}</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(140,111,232,.08)]">
            <div className="text-[color:var(--color-muted)] text-sm font-bold mb-2">男寶票數</div>
            <div className="text-[color:var(--color-primary-dark)] text-3xl font-extrabold">{boyVotes}</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(140,111,232,.08)]">
            <div className="text-[color:var(--color-muted)] text-sm font-bold mb-2">女寶票數</div>
            <div className="text-[color:var(--color-primary-dark)] text-3xl font-extrabold">{girlVotes}</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(140,111,232,.08)]">
            <div className="text-[color:var(--color-muted)] text-sm font-bold mb-2">目前猜對人數</div>
            <div className="text-[color:var(--color-primary-dark)] text-3xl font-extrabold">{correctGuesses.length}</div>
          </div>
        </div>
      </section>

      <section className="bg-white/80 border border-white/90 shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm">
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[color:var(--color-primary-dark)] text-xl font-bold">網站設定</h2>
          <button onClick={handleSaveConfig} className="bg-gradient-to-br from-[#34b57b] to-[#4fcb92] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform">儲存網站設定</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2 mb-3">
            <label htmlFor="eventTitle" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">活動標題</label>
            <input id="eventTitle" value={siteConfig.eventTitle} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none" type="text" />
          </div>

          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2 mb-3">
            <label htmlFor="eventSubtitle" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">活動副標題</label>
            <textarea id="eventSubtitle" value={siteConfig.eventSubtitle} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none min-h-[110px] resize-y"></textarea>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="closeTime" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">截止時間</label>
            <input id="closeTime" value={toDatetimeLocalValue(siteConfig.closeTime)} onChange={e => setSiteConfig(prev => ({ ...prev, closeTime: new Date(e.target.value).toISOString() }))} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none" type="datetime-local" />
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="isVotingOpen" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">是否開放投票</label>
            <select id="isVotingOpen" value={String(siteConfig.isVotingOpen)} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none">
              <option value="true">開放</option>
              <option value="false">關閉</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="actualGender" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">實際寶寶性別（揭曉後再填）</label>
            <select id="actualGender" value={siteConfig.actualGender} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none">
              <option value="">尚未揭曉</option>
              <option value="男寶">男寶</option>
              <option value="女寶">女寶</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="winnerCount" className="text-sm font-extrabold text-[color:var(--color-primary-dark)]">抽出幾位得獎者</label>
            <input id="winnerCount" value={siteConfig.winnerCount} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.12)] bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[color:var(--color-text)] outline-none" type="number" min="1" />
          </div>
        </div>

        <div className="bg-[rgba(140,111,232,.08)] text-[color:var(--color-muted)] rounded-2xl p-4 leading-relaxed text-sm mt-3">
          你可以在這裡控制網站是否開放投票、截止時間、活動文案，以及寶寶正式揭曉後要以哪個答案作為「猜對名單」依據。
        </div>
      </section>

      <section className="bg-white/80 border border-white/90 shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm">
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[color:var(--color-primary-dark)] text-xl font-bold">抽獎 / 猜對名單</h2>
          <button onClick={drawWinners} className="bg-gradient-to-br from-[var(--color-primary)] to-[#ab90ff] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-[0_12px_28px_rgba(140,111,232,.28)]">抽出得獎者</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[color:var(--color-primary-dark)]">猜對名單</div>
            <div className="grid gap-3 mt-3">
              {!siteConfig.actualGender ? (
                <div className="bg-white border border-[rgba(140,111,232,.08)] rounded-2xl p-4 leading-relaxed">尚未設定實際性別，因此目前無法產生猜對名單。</div>
              ) : correctGuesses.length === 0 ? (
                <div className="bg-white border border-[rgba(140,111,232,.08)] rounded-2xl p-4 leading-relaxed">目前沒有猜對的人。</div>
              ) : (
                correctGuesses.map((item, idx) => (
                  <div key={item.id} className="bg-white border border-[rgba(140,111,232,.08)] rounded-2xl p-4 leading-relaxed">
                    <strong>{idx + 1}. {item.name}</strong><br/>
                    聯絡方式：{item.contact || "-"}<br/>
                    猜測：{item.gender}<br/>
                    祝福：{item.wish || "—"}
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
             <div className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[color:var(--color-primary-dark)]">抽獎結果</div>
             <div className="grid gap-3 mt-3">
               {winners.length === 0 && siteConfig.actualGender && <div className="bg-white border border-[rgba(140,111,232,.08)] rounded-2xl p-4 leading-relaxed">尚未抽獎或無人猜對</div>}
               {winners.map((item, idx) => (
                 <div key={item.id} className="bg-white border border-[rgba(140,111,232,.08)] rounded-2xl p-4 leading-relaxed">
                   <strong>🎉 得獎者 {idx + 1}：{item.name}</strong><br/>
                   聯絡方式：{item.contact || "-"}<br/>
                   猜測：{item.gender}<br/>
                   祝福：{item.wish || "—"}
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="bg-[rgba(239,93,122,.12)] text-[#bf3955] border border-[rgba(239,93,122,.18)] rounded-2xl p-4 leading-relaxed text-sm mt-4">
          抽獎結果只是這個後台頁面隨機抽出，若你重新整理再按一次，結果可能會不同。若你想固定中獎名單，我建議抽出後手動另存或把結果寫回 Firestore，我也可以再幫你補這個功能。
        </div>
      </section>

      <section className="bg-white/80 border border-white/90 shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm">
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[color:var(--color-primary-dark)] text-xl font-bold">全部投票名單</h2>
          <span className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[color:var(--color-primary-dark)]">共 {guesses.length} 筆</span>
        </div>

        <div className="overflow-auto rounded-[20px] border border-[rgba(140,111,232,.08)] bg-white h-[500px]">
          <table className="w-full border-collapse min-w-[980px]">
            <thead className="sticky top-0 bg-[var(--color-bg1)] z-10">
              <tr>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">#</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">姓名</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">聯絡方式</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">猜測</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">關係</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">想抽到的禮物</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">祝福留言</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">建立時間</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">是否猜對</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[color:var(--color-primary-dark)] border-b border-[#f1ecff]">操作</th>
              </tr>
            </thead>
            <tbody>
              {guesses.length === 0 ? (
                <tr><td colSpan={10} className="p-4 text-center">目前尚無投票資料。</td></tr>
              ) : (
                guesses.map((item, idx) => {
                  const isCorrect = siteConfig.actualGender ? item.gender === siteConfig.actualGender : null;
                  return (
                    <tr key={item.id} className="border-b border-[#f1ecff]">
                      <td className="p-3.5 align-top">{idx + 1}</td>
                      <td className="p-3.5 align-top">{escapeHtml(item.name || "")}</td>
                      <td className="p-3.5 align-top break-all">{escapeHtml(item.contact || "")}</td>
                      <td className={`p-3.5 align-top font-extrabold ${item.gender === "男寶" ? "text-[#4f89d7]" : "text-[#e26ca5]"}`}>{escapeHtml(item.gender || "")}</td>
                      <td className="p-3.5 align-top">{escapeHtml(item.relation || "")}</td>
                      <td className="p-3.5 align-top">{escapeHtml(item.giftWish || "")}</td>
                      <td className="p-3.5 align-top max-w-[200px]">{escapeHtml(item.wish || "")}</td>
                      <td className="p-3.5 align-top">{formatDate(item.createdAt)}</td>
                      <td className="p-3.5 align-top">{isCorrect === null ? "尚未揭曉" : (isCorrect ? "✔ 猜對" : "✘ 未中")}</td>
                      <td className="p-3.5 align-top">
                        <button onClick={() => deleteGuess(item.id!)} className="bg-gradient-to-br from-[#ef5d7a] to-[#ff7f99] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:-translate-y-px transition-transform">刪除</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
