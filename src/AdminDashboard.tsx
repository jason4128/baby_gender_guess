import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { SiteConfig, Guess } from './types';
import { themes } from './themes';

interface AdminDashboardProps {
  themeId: string;
  setThemeId: (themeId: string) => void;
}

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

export default function AdminDashboard({ themeId, setThemeId }: AdminDashboardProps) {
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
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

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
      showToast('success', "網站設定已成功儲存！");
      loadData();
    } catch (error) {
      console.error("Error saving config:", error);
      showToast('error', "儲存失敗，請重試");
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
      showToast('info', "請先在「網站設定」填入實際寶寶性別，再抽獎。");
      return;
    }
    const correct = guesses.filter(g => g.gender === siteConfig.actualGender);
    if (correct.length === 0) {
      showToast('info', "目前猜對名單中沒有人可供抽選。");
      return;
    }

    const shuffled = [...correct].sort(() => 0.5 - Math.random());
    setWinners(shuffled.slice(0, Math.min(siteConfig.winnerCount, correct.length)));
    showToast('success', "已成功隨機抽出幸運中獎者！");
  };

  const requestDeleteGuess = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteGuess = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "guesses", deleteConfirmId));
      showToast('success', "投票資料已成功刪除！");
      setDeleteConfirmId(null);
      loadData();
    } catch (error) {
      console.error("Error deleting guess:", error);
      showToast('error', "刪除失敗，請稍後再試。");
      setDeleteConfirmId(null);
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

  const isGambling = themeId.startsWith('casino') || themeId === 'milktea';
  const correctGuesses = siteConfig.actualGender ? guesses.filter(g => g.gender === siteConfig.actualGender) : [];
  const boyVotes = guesses.filter(g => g.gender === "男寶").length;
  const girlVotes = guesses.filter(g => g.gender === "女寶").length;

  if (loading) return <div className="p-8 text-center text-[var(--color-primary-dark)]">載入中...</div>;

  return (
    <div className="w-[min(1320px,calc(100%-32px))] mx-auto py-6 pb-10 relative z-10 text-[var(--color-text)]">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-[var(--color-primary-dark)] text-3xl font-bold mb-2">
            {isGambling ? "🎰 威尼斯人娛樂城・莊家風控後台 👑" : "猜寶寶性別｜管理後台 💜"}
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed">
            {isGambling 
              ? "提供莊家極速即時監控下注流向、設置盤口開合、執行封盤倒數、導出完整投注單與自動賠率派彩抽獎。" 
              : "這裡可以管理網站設定、查看投票名單、匯出資料、設定正確答案與抽出得獎者。"
            }
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative inline-flex items-center">
            <span className="text-xs font-extrabold text-[var(--color-muted)] mr-1.5 hidden sm:inline">🎨 配色盤口：</span>
            <div className="relative">
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-900 text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.18)] hover:border-[var(--color-primary)] px-3 py-1.5 pr-7 rounded-full text-xs font-bold shadow-sm focus:outline-none cursor-pointer transition-all"
              >
                {themes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-primary-dark)] text-[9px] opacity-70">
                ▼
              </div>
            </div>
          </div>
          <a href="#/" className="bg-white dark:bg-slate-900 text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm no-underline">回首頁</a>
          <button onClick={loadData} className="bg-white dark:bg-slate-900 text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm">重新整理資料</button>
          <button onClick={exportCSV} className="bg-gradient-to-br from-[var(--color-primary)] to-[#aa91ff] text-white shadow-[0_12px_26px_rgba(140,111,232,.25)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform">匯出 CSV</button>
        </div>
      </div>

      <section className="border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm" style={{ background: 'var(--color-glass-bg)' }}>
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[var(--color-primary-dark)] text-xl font-bold">
            {isGambling ? "📈 實時下注統計量" : "投票統計"}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 dark:bg-slate-900/60 rounded-[20px] p-4 border border-[var(--color-glass-border)]">
            <div className="text-[var(--color-muted)] text-sm font-bold mb-2">
              {isGambling ? "總投注單數" : "總投票數"}
            </div>
            <div className="text-[var(--color-primary-dark)] text-3xl font-extrabold">{guesses.length}</div>
          </div>
          <div className="bg-white/10 dark:bg-slate-900/60 rounded-[20px] p-4 border border-[var(--color-glass-border)]">
            <div className="text-[var(--color-muted)] text-sm font-bold mb-2">
              {isGambling ? "押注男寶注數" : "男寶票數"}
            </div>
            <div className="text-[var(--color-primary-dark)] text-3xl font-extrabold">{boyVotes}</div>
          </div>
          <div className="bg-white/10 dark:bg-slate-900/60 rounded-[20px] p-4 border border-[var(--color-glass-border)]">
            <div className="text-[var(--color-muted)] text-sm font-bold mb-2">
              {isGambling ? "押注女寶注數" : "女寶票數"}
            </div>
            <div className="text-[var(--color-primary-dark)] text-3xl font-extrabold">{girlVotes}</div>
          </div>
          <div className="bg-white/10 dark:bg-slate-900/60 rounded-[20px] p-4 border border-[var(--color-glass-border)]">
            <div className="text-[var(--color-muted)] text-sm font-bold mb-2">
              {isGambling ? "合格派彩名單人數" : "目前猜對人數"}
            </div>
            <div className="text-[var(--color-primary-dark)] text-3xl font-extrabold">{correctGuesses.length}</div>
          </div>
        </div>
      </section>

      <section className="border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm" style={{ background: 'var(--color-glass-bg)' }}>
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[var(--color-primary-dark)] text-xl font-bold">
            {isGambling ? "⚙️ 盤口與賠率設定" : "網站設定"}
          </h2>
          <button onClick={handleSaveConfig} className="bg-gradient-to-br from-[#34b57b] to-[#4fcb92] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform">儲存網站設定</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2 mb-3">
            <label htmlFor="eventTitle" className="text-sm font-extrabold text-[var(--color-primary-dark)]">活動標題</label>
            <input id="eventTitle" value={siteConfig.eventTitle} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none" type="text" />
          </div>

          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2 mb-3">
            <label htmlFor="eventSubtitle" className="text-sm font-extrabold text-[var(--color-primary-dark)]">活動副標題</label>
            <textarea id="eventSubtitle" value={siteConfig.eventSubtitle} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none min-h-[110px] resize-y"></textarea>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="closeTime" className="text-sm font-extrabold text-[var(--color-primary-dark)]">截止時間</label>
            <input id="closeTime" value={toDatetimeLocalValue(siteConfig.closeTime)} onChange={e => setSiteConfig(prev => ({ ...prev, closeTime: new Date(e.target.value).toISOString() }))} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none" type="datetime-local" />
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="isVotingOpen" className="text-sm font-extrabold text-[var(--color-primary-dark)]">是否開放投票</label>
            <select id="isVotingOpen" value={String(siteConfig.isVotingOpen)} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none cursor-pointer">
              <option value="true" className="text-black">開放下注</option>
              <option value="false" className="text-black">關閉封盤</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="actualGender" className="text-sm font-extrabold text-[var(--color-primary-dark)]">實際寶寶性別（揭曉後再填）</label>
            <select id="actualGender" value={siteConfig.actualGender} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none cursor-pointer">
              <option value="" className="text-black">尚未揭曉</option>
              <option value="男寶" className="text-black">男寶</option>
              <option value="女寶" className="text-black">女寶</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="winnerCount" className="text-sm font-extrabold text-[var(--color-primary-dark)]">抽出幾位得獎者</label>
            <input id="winnerCount" value={siteConfig.winnerCount} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none" type="number" min="1" />
          </div>
        </div>

        <div className="bg-[rgba(140,111,232,.08)] text-[var(--color-muted)] rounded-2xl p-4 leading-relaxed text-sm mt-3 border border-[rgba(140,111,232,.15)]">
          {isGambling 
            ? "莊家控制面板：您在此調控玩家投注網頁是否繼續開放、封盤時限與公佈欄副標題，亦可於結果公佈後點選寶寶性別，以便觸發賠率自動派彩。"
            : "你可以在這裡控制網站是否開放投票、截止時間、活動文案，以及寶寶正式揭曉後要以哪個答案作為「猜對名單」依據。"
          }
        </div>
      </section>

      <section className="border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm" style={{ background: 'var(--color-glass-bg)' }}>
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[var(--color-primary-dark)] text-xl font-bold">
            {isGambling ? "🎁 極速自動派彩抽獎" : "抽獎 / 猜對名單"}
          </h2>
          <button onClick={drawWinners} className="bg-gradient-to-br from-[var(--color-primary)] to-[#ab90ff] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-[0_12px_28px_rgba(140,111,232,.28)]">
            {isGambling ? "🎰 點擊一鍵自動派彩抽獎" : "抽出得獎者"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.15)]">
              {isGambling ? "✔ 猜中性別玩家池" : "猜對名單"}
            </div>
            <div className="grid gap-3 mt-3">
              {!siteConfig.actualGender ? (
                <div className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed text-[var(--color-muted)]">
                  {isGambling ? "盤口尚未揭曉（請在上方設置實際寶寶性別，即可自動篩選猜對玩家池）" : "尚未設定實際性別，因此目前無法產生猜對名單。"}
                </div>
              ) : correctGuesses.length === 0 ? (
                <div className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed text-[var(--color-muted)]">目前沒有猜對的人。</div>
              ) : (
                correctGuesses.map((item, idx) => (
                  <div key={item.id} className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed">
                    <strong>{idx + 1}. {item.name}</strong><br/>
                    聯絡方式：{item.contact || "-"}<br/>
                    押注：{item.gender}<br/>
                    祝福語：{item.wish || "—"}
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
             <div className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.15)]">
               {isGambling ? "🎉 派彩中獎名單" : "抽獎結果"}
             </div>
             <div className="grid gap-3 mt-3">
               {winners.length === 0 && siteConfig.actualGender && (
                 <div className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed text-[var(--color-muted)]">
                   {isGambling ? "尚未執行自動派彩，請點擊上方「自動派彩抽獎」按鈕" : "尚未抽獎或無人猜對"}
                 </div>
               )}
               {winners.map((item, idx) => (
                 <div key={item.id} className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed">
                   <strong>🎉 中獎特等得主 {idx + 1}：{item.name}</strong><br/>
                   聯絡方式：{item.contact || "-"}<br/>
                   押注盤口：{item.gender}<br/>
                   祝福留言：{item.wish || "—"}
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="bg-[rgba(239,93,122,.12)] text-[#bf3955] border border-[rgba(239,93,122,.18)] rounded-2xl p-4 leading-relaxed text-sm mt-4">
          {isGambling 
            ? "⚠️ 風控安全提醒：本系統派彩抽獎為娛樂城純數值隨機抽選。若要固定本期派彩得主，請主辦人在此頁面手動截圖、抄錄或告知玩家。"
            : "抽獎結果只是這個後台頁面隨機抽出，若你重新整理再按一次，結果可能會不同。若你想固定中獎名單，我建議抽出後手動另存或把結果寫回 Firestore。"
          }
        </div>
      </section>

      <section className="border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm" style={{ background: 'var(--color-glass-bg)' }}>
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[var(--color-primary-dark)] text-xl font-bold">
            {isGambling ? "📋 全體玩家投注歷史單" : "全部投票名單"}
          </h2>
          <span className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-extrabold bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.15)]">共 {guesses.length} 筆</span>
        </div>

        <div className="overflow-auto rounded-[20px] border border-[var(--color-glass-border)] bg-white/5 backdrop-blur-sm h-[500px]">
          <table className="w-full border-collapse min-w-[980px]">
            <thead className="sticky top-0 bg-[var(--color-bg1)] z-10">
              <tr className="border-b border-[var(--color-glass-border)]">
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">#</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">玩家姓名</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">聯絡方式</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">下注猜測</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">關係</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">{isGambling ? "預計想領派彩" : "想抽到的禮物"}</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">祝福附言</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">投單時間</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">結算狀態</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {guesses.length === 0 ? (
                <tr><td colSpan={10} className="p-4 text-center text-[var(--color-muted)]">目前尚無投票資料。</td></tr>
              ) : (
                guesses.map((item, idx) => {
                  const isCorrect = siteConfig.actualGender ? item.gender === siteConfig.actualGender : null;
                  return (
                    <tr key={item.id} className="border-b border-[var(--color-glass-border)] hover:bg-white/5 transition-colors">
                      <td className="p-3.5 align-top">{idx + 1}</td>
                      <td className="p-3.5 align-top font-bold">{escapeHtml(item.name || "")}</td>
                      <td className="p-3.5 align-top break-all">{escapeHtml(item.contact || "")}</td>
                      <td className={`p-3.5 align-top font-extrabold ${item.gender === "男寶" ? "text-sky-400 dark:text-sky-300" : "text-pink-400 dark:text-pink-300"}`}>{escapeHtml(item.gender || "")}</td>
                      <td className="p-3.5 align-top">{escapeHtml(item.relation || "")}</td>
                      <td className="p-3.5 align-top">{escapeHtml(item.giftWish || "")}</td>
                      <td className="p-3.5 align-top max-w-[200px] break-words text-sm">{escapeHtml(item.wish || "")}</td>
                      <td className="p-3.5 align-top text-xs font-mono">{formatDate(item.createdAt)}</td>
                      <td className="p-3.5 align-top font-bold">
                        {isCorrect === null ? (
                          <span className="text-gray-400">⏳ 尚未結算</span>
                        ) : isCorrect ? (
                          <span className="text-emerald-500">📈 ✔ 猜對派彩</span>
                        ) : (
                          <span className="text-rose-500">✘ 未中</span>
                        )}
                      </td>
                      <td className="p-3.5 align-top">
                        <button onClick={() => requestDeleteGuess(item.id!)} className="bg-gradient-to-br from-[#ef5d7a] to-[#ff7f99] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-all">刪除</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border shadow-2xl animate-bounce" style={{
          background: 'var(--color-glass-bg)',
          borderColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
          borderWidth: '2px',
          color: 'var(--color-text)',
          fontWeight: 'bold',
          backdropFilter: 'blur(12px)'
        }}>
          <span className="text-lg">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[var(--color-glass-border)] rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-xl font-bold text-[var(--color-primary-dark)] mb-3">⚠️ 確定刪除此筆資料嗎？</h3>
            <p className="text-[var(--color-muted)] leading-relaxed mb-6">
              刪除後此筆投注/投票名單將會永久消失，無法復原，您確定要繼續執行此操作嗎？
            </p>
            <div className="flex justify-end gap-3.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-full text-sm font-bold border border-[rgba(140,111,232,.2)] text-[var(--color-muted)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteGuess}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-br from-[#ef5d7a] to-[#ff7f99] text-white hover:scale-[1.03] active:scale-[0.97] transition-all"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
