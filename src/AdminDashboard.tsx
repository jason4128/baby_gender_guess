import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { SiteConfig, Guess, InviteCode, isAdmin, ADMIN_EMAILS } from './types';
import { themes } from './themes';
// @ts-ignore
import boyDefaultImage from './components/assets/images/IMG_1587.jpeg';
// @ts-ignore
import girlDefaultImage from './components/assets/images/IMG_1588.jpeg';

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

function generateRandomCode(length: number = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid visually confusing chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminDashboard({ themeId, setThemeId }: AdminDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    closeTime: "2026-08-30T23:59:59",
    isVotingOpen: true,
    actualGender: "",
    winnerCount: 3,
    boyImageUrl: boyDefaultImage,
    girlImageUrl: girlDefaultImage
  });
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Guess[]>([]);
  const [drawAnimating, setDrawAnimating] = useState(false);
  const [currentAnimGuess, setCurrentAnimGuess] = useState<Guess | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetCodeConfirmId, setResetCodeConfirmId] = useState<string | null>(null);

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
        const data = configSnap.data();
        setSiteConfig(prev => ({ 
          ...prev, 
          closeTime: data.closeTime || prev.closeTime,
          isVotingOpen: data.isVotingOpen ?? prev.isVotingOpen,
          actualGender: data.actualGender || prev.actualGender,
          winnerCount: data.winnerCount || prev.winnerCount,
          boyImageUrl: data.boyImageUrl || prev.boyImageUrl,
          girlImageUrl: data.girlImageUrl || prev.girlImageUrl
        }));
        if (data.winners) {
          setWinners(data.winners);
        }
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

      const codesSnap = await getDocs(collection(db, "inviteCodes"));
      const codesData = codesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as InviteCode[];
      codesData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setInviteCodes(codesData);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user && isAdmin(user.email)) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      if (!isAdmin(credential.user.email)) {
        setLoginError('您登入的帳號非管理員帳號！');
      } else {
        showToast('success', '登入成功！');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError('帳號或密碼錯誤，請重新確認！');
      } else {
        setLoginError(err.message || '登入失敗，請稍候重試');
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginSubmitting(true);
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (!isAdmin(result.user.email)) {
        setLoginError('您登入的 Google 帳號非管理員帳號！請登出並改用管理員帳號。');
      } else {
        showToast('success', 'Google 登入成功！');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Google 登入失敗');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('info', '已成功登出。');
    } catch (err) {
      console.error(err);
    }
  };

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

  const generateInviteCodes = async () => {
    try {
      const batch = writeBatch(db);
      for(let i=0; i<10; i++) {
        const newCode = generateRandomCode();
        const codeRef = doc(collection(db, "inviteCodes"), newCode);
        batch.set(codeRef, {
          id: newCode,
          used: false,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();
      showToast('success', "成功產生 10 組邀請碼！");
      loadData();
    } catch(err) {
      console.error(err);
      showToast('error', "產生失敗");
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('success', `已複製邀請碼: ${code}`);
    } catch (err) {
      console.error(err);
      showToast('error', "複製失敗");
    }
  };

  const handleResetCode = (code: string) => {
    setResetCodeConfirmId(code);
  };

  const confirmResetCode = async () => {
    if (!resetCodeConfirmId) return;
    try {
      await setDoc(doc(db, "inviteCodes", resetCodeConfirmId), {
        used: false,
        usedBy: ""
      }, { merge: true });
      showToast('success', `邀請碼 ${resetCodeConfirmId} 已恢復！`);
      setResetCodeConfirmId(null);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('error', "恢復失敗");
    }
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

    setDrawAnimating(true);
    setWinners([]);
    
    let iterations = 0;
    const maxIterations = 40; 
    const intervalTime = 50; 

    const animInterval = setInterval(() => {
      const randomGuess = correct[Math.floor(Math.random() * correct.length)];
      setCurrentAnimGuess(randomGuess);
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(animInterval);
        const shuffled = [...correct].sort(() => 0.5 - Math.random());
        const drawn = shuffled.slice(0, Math.min(siteConfig.winnerCount, correct.length));
        setWinners(drawn);
        
        // Save to Firestore
        setDoc(doc(db, "settings", "siteConfig"), {
          ...siteConfig,
          winners: drawn
        }, { merge: true })
        .then(() => {
          showToast('success', "已成功隨機抽出幸運中獎者，並儲存至雲端！");
        })
        .catch(err => {
          console.error("Save winners failed:", err);
          showToast('error', "儲存中獎者至雲端失敗！");
        });

        setCurrentAnimGuess(null);
        setDrawAnimating(false);
      }
    }, intervalTime);
  };

  const clearWinners = async () => {
    try {
      setWinners([]);
      await setDoc(doc(db, "settings", "siteConfig"), {
        ...siteConfig,
        winners: []
      }, { merge: true });
      showToast('success', "抽獎結果已成功清除！");
    } catch (err) {
      console.error("Clear winners failed:", err);
      showToast('error', "清除抽獎結果失敗！");
    }
  };

  const requestDeleteGuess = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteGuess = async () => {
    if (!deleteConfirmId) return;
    try {
      const guessToDelete = guesses.find(g => g.id === deleteConfirmId);
      if (guessToDelete && guessToDelete.inviteCode) {
        await setDoc(doc(db, "inviteCodes", guessToDelete.inviteCode), {
          used: false,
          usedBy: ""
        }, { merge: true });
      }

      await deleteDoc(doc(db, "guesses", deleteConfirmId));
      showToast('success', "投票資料已成功刪除！邀請碼已恢復為未使用狀態。");
      setDeleteConfirmId(null);
      loadData();
    } catch (error) {
      console.error("Error deleting guess:", error);
      showToast('error', "刪除失敗，請稍後再試。");
      setDeleteConfirmId(null);
    }
  };

  const exportCSV = () => {
    const headers = ["姓名", "聯絡方式", "猜測", "關係", "邀請碼", "想抽到的禮物", "祝福留言", "建立時間", "是否猜對"];
    const rows = guesses.map(item => {
      const isCorrect = siteConfig.actualGender
        ? (item.gender === siteConfig.actualGender ? "猜對" : "未中")
        : "尚未揭曉";
      return [
        item.name || "",
        item.contact || "",
        item.gender || "",
        item.relation || "",
        item.inviteCode || "",
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf6f0]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#b08e72] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-[#8c7a6b] font-extrabold text-sm">正在驗證身分中...</div>
        </div>
      </div>
    );
  }

  if (!currentUser || !currentUser.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf6f0] to-[#f4ebe1] p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_24px_48px_rgba(176,142,114,0.15)] border border-[#eedac5] overflow-hidden">
          <div className="p-8 text-center border-b border-[#f5ebe2]">
            <div className="w-16 h-16 bg-[#fdfbf9] rounded-2xl flex items-center justify-center border-2 border-[#eedac5] shadow-sm mx-auto mb-4">
              <span className="text-3xl">🔑</span>
            </div>
            <h2 className="text-2xl font-bold text-[#524339] mb-1.5 font-sans">管理員登入</h2>
            <p className="text-[#8c7a6b] text-sm leading-relaxed">請輸入管理者帳號以進入盤口及活動控制台</p>
          </div>
          
          <form onSubmit={handleEmailLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-2">管理者電子信箱</label>
              <input 
                type="email" 
                required 
                placeholder="user@gmail.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#eedac5] focus:outline-none focus:ring-2 focus:ring-[#b08e72] focus:border-[#b08e72] bg-[#faf6f0] text-[#524339] font-medium transition-all text-sm placeholder:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-2">管理密碼</label>
              <input 
                type="password" 
                required 
                placeholder="請輸入密碼"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#eedac5] focus:outline-none focus:ring-2 focus:ring-[#b08e72] focus:border-[#b08e72] bg-[#faf6f0] text-[#524339] font-medium transition-all text-sm placeholder:opacity-50"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold leading-relaxed">
                ⚠️ {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loginSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#b08e72] to-[#c6a385] text-white font-extrabold text-sm shadow-[0_8px_20px_rgba(176,142,114,0.25)] hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer flex justify-center items-center disabled:opacity-50"
            >
              {loginSubmitting ? '登入驗證中...' : '確認登入'}
            </button>

            <div className="relative my-6 flex items-center justify-center">
              <span className="absolute bg-white px-3 text-xs text-[#8c7a6b] font-bold">或使用 Google 登入</span>
              <div className="w-full border-t border-[#f5ebe2]"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loginSubmitting}
              className="w-full py-3 px-4 border border-[#eedac5] rounded-xl bg-white hover:bg-slate-50 text-[#524339] font-extrabold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google 帳號快速登入</span>
            </button>
          </form>
          
          <div className="bg-[#faf6f0] p-5 border-t border-[#eedac5] text-center">
            <a href="#/" className="text-xs font-bold text-[#b08e72] hover:underline">← 返回首頁投票</a>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin(currentUser.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf6f0] to-[#f4ebe1] p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_24px_48px_rgba(176,142,114,0.15)] border border-[#eedac5] overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border-2 border-red-100 shadow-sm mx-auto mb-4 text-red-500">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-[#524339] mb-3">權限不足</h2>
          <p className="text-[#8c7a6b] text-sm leading-relaxed mb-6">
            您的登入帳號為 <span className="font-extrabold text-[#524339]">{currentUser.email}</span>。<br />
            本後台僅限 <span className="font-extrabold text-red-500">{ADMIN_EMAILS.join(' 或 ')}</span> 登入存取。
          </p>
          <div className="space-y-3">
            <button 
              onClick={handleLogout}
              className="w-full py-3.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm transition-all cursor-pointer shadow-sm"
            >
              登出並切換帳號
            </button>
            <a 
              href="#/"
              className="block w-full py-3 px-4 border border-[#eedac5] rounded-xl bg-white hover:bg-slate-50 text-[#524339] font-extrabold text-sm transition-all shadow-sm no-underline"
            >
              返回首頁投票
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[var(--color-primary-dark)]">載入中...</div>;

  return (
    <div className="w-[min(1320px,calc(100%-32px))] mx-auto py-6 pb-10 relative z-10 text-[var(--color-text)]">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-[var(--color-primary-dark)] text-3xl font-bold mb-2">
            {isGambling ? "🎰 皇家娛樂城・莊家風控後台 👑" : "猜寶寶性別｜管理後台 💜"}
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed">
            {isGambling 
              ? "提供莊家極速即時監控下注流向、設置盤口開合、執行封盤倒數、導出完整投注單與自動賠率派彩抽獎。" 
              : "這裡可以管理網站設定、查看投票名單、匯出資料、設定正確答案與抽出得獎者。"
            }
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <a href="#/" className="bg-white dark:bg-slate-900 text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm no-underline">回首頁</a>
          <button onClick={loadData} className="bg-white dark:bg-slate-900 text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm">重新整理資料</button>
          <button onClick={exportCSV} className="bg-gradient-to-br from-[var(--color-primary)] to-[#aa91ff] text-white shadow-[0_12px_26px_rgba(140,111,232,.25)] px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform">匯出 CSV</button>
          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-sm">登出系統 🚪</button>
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

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="boyImageUrl" className="text-sm font-extrabold text-[var(--color-primary-dark)]">💙 男寶照片網址 / 路徑 (資料庫儲存)</label>
            <input id="boyImageUrl" value={siteConfig.boyImageUrl || ""} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3 text-[13px] text-[var(--color-text)] outline-none font-mono" placeholder="男寶照片路徑或網址" />
            {siteConfig.boyImageUrl && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[var(--color-muted)] font-semibold">預覽：</span>
                <img src={siteConfig.boyImageUrl} alt="Boy Preview" className="w-10 h-10 object-cover rounded-lg border border-[var(--color-glass-border)] bg-slate-100" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label htmlFor="girlImageUrl" className="text-sm font-extrabold text-[var(--color-primary-dark)]">💖 女寶照片網址 / 路徑 (資料庫儲存)</label>
            <input id="girlImageUrl" value={siteConfig.girlImageUrl || ""} onChange={handleInputChange} className="w-full border border-[rgba(140,111,232,.15)] bg-white/10 dark:bg-slate-900/60 rounded-2xl px-4 py-3 text-[13px] text-[var(--color-text)] outline-none font-mono" placeholder="女寶照片路徑或網址" />
            {siteConfig.girlImageUrl && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[var(--color-muted)] font-semibold">預覽：</span>
                <img src={siteConfig.girlImageUrl} alt="Girl Preview" className="w-10 h-10 object-cover rounded-lg border border-[var(--color-glass-border)] bg-slate-100" />
              </div>
            )}
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
            {isGambling ? "🎟️ 邀請碼管理 (VIP 通行證)" : "邀請碼管理"}
          </h2>
          <button onClick={generateInviteCodes} className="bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-[0_12px_28px_rgba(59,130,246,.28)]">
            + 產生 10 組邀請碼
          </button>
        </div>
        
        <h3 className="text-sm font-bold text-gray-500 mb-2 mt-4">未使用的邀請碼</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {inviteCodes.filter(c => !c.used).length === 0 ? (
             <div className="col-span-full bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed text-[var(--color-muted)]">
               目前沒有未使用的邀請碼。
             </div>
          ) : (
            inviteCodes.filter(c => !c.used).map(code => (
              <div 
                key={code.id} 
                onClick={() => handleCopyCode(code.id)}
                className={`border rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-transform border-[#3b82f6] bg-white dark:bg-slate-900 shadow-sm hover:-translate-y-1 hover:shadow-md cursor-pointer`}
                title="點擊複製"
              >
                <span className="font-mono text-lg font-bold tracking-wider">{code.id}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700`}>
                  未使用 (點擊複製)
                </span>
              </div>
            ))
          )}
        </div>

        <h3 className="text-sm font-bold text-gray-500 mb-2 mt-8">已使用的邀請碼</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {inviteCodes.filter(c => c.used).length === 0 ? (
             <div className="col-span-full bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-4 leading-relaxed text-[var(--color-muted)]">
               目前沒有已使用的邀請碼。
             </div>
          ) : (
            inviteCodes.filter(c => c.used).map(code => (
              <div 
                key={code.id} 
                className={`border rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-transform border-gray-200 opacity-50 bg-gray-50 dark:bg-slate-800 relative group`}
              >
                <button 
                  onClick={() => handleResetCode(code.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  title="恢復此邀請碼"
                >
                  &times;
                </button>
                <span className="font-mono text-lg font-bold tracking-wider">{code.id}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-500`}>
                  已由 {code.usedBy} 使用
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] rounded-[var(--radius-xl)] p-5 mb-5 backdrop-blur-sm relative overflow-hidden" style={{ background: 'var(--color-glass-bg)' }}>
        {drawAnimating && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm transition-all">
             <div className="text-center transform scale-110">
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 mb-6 animate-pulse">
                  {isGambling ? '🎲 系統極速派彩中...' : '🎁 緊張刺激的抽獎中...'}
                </div>
                {currentAnimGuess && (
                  <div className="bg-white/10 border-2 border-yellow-400/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(250,204,21,0.4)] transition-all">
                    <div className="text-xl text-yellow-100 font-bold mb-2">候選人</div>
                    <div className="text-5xl font-extrabold text-white mb-2">{currentAnimGuess.name}</div>
                    <div className="text-lg text-yellow-200">押注：{currentAnimGuess.gender}</div>
                  </div>
                )}
             </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
          <h2 className="text-[var(--color-primary-dark)] text-xl font-bold">
            {isGambling ? "🎁 極速自動派彩抽獎" : "抽獎 / 猜對名單"}
          </h2>
          <div className="flex gap-2.5 flex-wrap">
            {winners.length > 0 && (
              <button 
                onClick={clearWinners} 
                disabled={drawAnimating} 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-[0_12px_28px_rgba(239,68,68,.28)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                🗑️ 清除抽獎結果
              </button>
            )}
            <button 
              onClick={drawWinners} 
              disabled={drawAnimating} 
              className="bg-gradient-to-br from-[var(--color-primary)] to-[#ab90ff] text-white px-4 py-2.5 rounded-full text-sm font-extrabold hover:-translate-y-px transition-transform shadow-[0_12px_28px_rgba(140,111,232,.28)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGambling ? "🎰 點擊一鍵自動派彩抽獎" : "抽出得獎者"}
            </button>
          </div>
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
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">使用邀請碼</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">{isGambling ? "預計想領派彩" : "想抽到的禮物"}</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">祝福附言</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">投單時間</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">結算狀態</th>
                <th className="p-3.5 text-left text-[13px] font-extrabold text-[var(--color-primary-dark)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {guesses.length === 0 ? (
                <tr><td colSpan={11} className="p-4 text-center text-[var(--color-muted)]">目前尚無投票資料。</td></tr>
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
                      <td className="p-3.5 align-top font-mono text-sm">{escapeHtml(item.inviteCode || "")}</td>
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

      {/* Reset Code Confirmation Modal */}
      {resetCodeConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[var(--color-glass-border)] rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-xl font-bold text-[var(--color-primary-dark)] mb-3">🔄 恢復邀請碼</h3>
            <p className="text-[var(--color-muted)] leading-relaxed mb-6">
              確定要將邀請碼 <span className="font-mono font-bold">{resetCodeConfirmId}</span> 恢復為未使用狀態嗎？這並不會刪除對應的歷史單。
            </p>
            <div className="flex justify-end gap-3.5">
              <button
                onClick={() => setResetCodeConfirmId(null)}
                className="px-5 py-2.5 rounded-full text-sm font-bold border border-[rgba(140,111,232,.2)] text-[var(--color-muted)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmResetCode}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white hover:scale-[1.03] active:scale-[0.97] transition-all"
              >
                確認恢復
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
