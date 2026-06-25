import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { SiteConfig, Guess, isAdmin } from './types';
// @ts-ignore
import babyImage from './components/assets/images/IMG_1589.jpeg';
// @ts-ignore
import babyBoyIcon from './components/assets/images/IMG_1587.jpeg';
// @ts-ignore
import babyGirlIcon from './components/assets/images/IMG_1588.jpeg';
import { themes } from './themes';
import { CelebrationBall } from './components/CelebrationBall';

interface MainSiteProps {
  themeId: string;
  setThemeId: (themeId: string) => void;
}

export default function MainSite({ themeId, setThemeId }: MainSiteProps) {
  const isGambling = themeId.startsWith('casino') || themeId === 'milktea';
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    closeTime: "2026-08-30T23:59:59",
    isVotingOpen: true,
    actualGender: "",
    winnerCount: 3,
    boyImageUrl: babyBoyIcon,
    girlImageUrl: babyGirlIcon
  });
  
  const [stats, setStats] = useState({ total: 0, boy: 0, girl: 0 });
  const [loading, setLoading] = useState(true);
  
  // Countdown specific state
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [isClosed, setIsClosed] = useState(false);
 
  // Form state
  const [formData, setFormData] = useState({
    gender: '',
    name: '',
    contact: '',
    wish: '',
    giftWish: '',
    relation: '',
    inviteCode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success'|'error', text: React.ReactNode} | null>(null);
 
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [revealState, setRevealState] = useState<'initial' | 'revealing' | 'revealed'>('initial');
  const [drawState, setDrawState] = useState<'hidden' | 'ready' | 'drawing' | 'done'>('hidden');
  const showOnlyReveal = revealState === 'revealed' || revealState === 'revealing';
  const [rollingName, setRollingName] = useState<string>('');
  const [revealedGenderFlashing, setRevealedGenderFlashing] = useState<string>('男寶');
  const [drawCountdown, setDrawCountdown] = useState<number | null>(null);
 
  const loadSiteConfig = async () => {
    try {
      const ref = doc(db, "settings", "siteConfig");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setSiteConfig(prev => ({ 
          ...prev, 
          closeTime: data.closeTime || prev.closeTime,
          isVotingOpen: data.isVotingOpen ?? prev.isVotingOpen,
          actualGender: data.actualGender || prev.actualGender,
          winnerCount: data.winnerCount || prev.winnerCount,
          winners: data.winners || [],
          boyImageUrl: data.boyImageUrl || prev.boyImageUrl,
          girlImageUrl: data.girlImageUrl || prev.girlImageUrl
        }));
      }
    } catch (error) {
      console.error("載入設定失敗", error);
    }
  };

  const loadVoteStats = async () => {
    try {
      const snap = await getDocs(collection(db, "guesses"));
      const votes = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Guess);
      setGuesses(votes);

      const boyCount = votes.filter(v => v.gender === "男寶").length;
      const girlCount = votes.filter(v => v.gender === "女寶").length;
      const total = votes.length;

      setStats({ total, boy: boyCount, girl: girlCount });
    } catch (error) {
      console.error("讀取票數失敗", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSiteConfig();
      await loadVoteStats();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!siteConfig.closeTime) return;

    const timer = setInterval(() => {
      const target = new Date(siteConfig.closeTime).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0 || !siteConfig.isVotingOpen) {
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        setIsClosed(true);
        clearInterval(timer);
        return;
      }

      setIsClosed(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0")
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [siteConfig.closeTime, siteConfig.isVotingOpen]);

  const handleStartReveal = () => {
    setRevealState('revealing');
    setDrawState('hidden');
    setDrawCountdown(null);
    const interval = setInterval(() => {
      setRevealedGenderFlashing(prev => prev === '男寶' ? '女寶' : '男寶');
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setRevealState('revealed');
      setDrawState('ready');
      
      // Wait 4 seconds (4000ms) for guests to view the gender reveal result first
      setTimeout(() => {
        // Auto-scroll to lucky-draw-container
        document.getElementById('lucky-draw-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Start 3-second countdown to automatically draw
        setDrawCountdown(3);
        let count = 3;
        const countdownTimer = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(countdownTimer);
            setDrawCountdown(null);
            handleStartDraw(true);
          } else {
            setDrawCountdown(count);
          }
        }, 1000);
      }, 4000);
    }, 10000);
  };

  const handleStartDraw = (isAuto = false) => {
    if (!siteConfig.winners || siteConfig.winners.length === 0) {
      if (!isAuto) {
        alert("目前主辦人尚未在後台完成幸運得主抽獎，請稍候重試或通知主辦人！");
      }
      return;
    }
    setDrawState('drawing');
    const correctCandidates = guesses.filter(g => g.gender === siteConfig.actualGender);
    if (correctCandidates.length === 0) {
      setDrawState('done');
      return;
    }
    
    let iterations = 0;
    const maxIterations = 40;
    const interval = setInterval(() => {
      const randomCandidate = correctCandidates[Math.floor(Math.random() * correctCandidates.length)];
      setRollingName(randomCandidate.name);
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDrawState('done');
      }
    }, 80);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) {
      setSubmitMessage({ type: 'error', text: "活動已截止，目前無法再送出投票。" });
      return;
    }

    if (!formData.gender) {
      setSubmitMessage({ type: 'error', text: "請先選擇你猜測的寶寶性別 💜" });
      return;
    }

    if (!formData.name.trim() || !formData.contact.trim() || !formData.inviteCode.trim()) {
      setSubmitMessage({ type: 'error', text: "請填寫姓名 / 聯絡方式 / 邀請碼。" });
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const codeStr = formData.inviteCode.trim().toUpperCase();
      const codeRef = doc(db, "inviteCodes", codeStr);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setSubmitMessage({ type: 'error', text: "無效的邀請碼，請確認後再試。" });
        setSubmitting(false);
        return;
      }

      const codeData = codeSnap.data();
      if (codeData.used) {
        setSubmitMessage({ type: 'error', text: "此邀請碼已被使用過囉！" });
        setSubmitting(false);
        return;
      }

      const q = query(collection(db, "guesses"), where("contact", "==", formData.contact.trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setSubmitMessage({ type: 'error', text: "這個聯絡方式已經參加過囉～若要修改資料，請聯絡主辦人 💜" });
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "guesses"), {
        ...formData,
        inviteCode: codeStr,
        createdAt: serverTimestamp()
      });

      await setDoc(codeRef, {
        used: true,
        usedBy: formData.name.trim()
      }, { merge: true });

      setSubmitMessage({
        type: 'success', 
        text: (
          <>
            已成功送出 💜<br/>
            <strong>{formData.name}</strong> 的猜測是：<strong>{formData.gender}</strong><br/>
            謝謝你的參與與祝福，等揭曉寶寶性別後，如果猜對就有機會抽到小禮物喔！
          </>
        )
      });
      
      setFormData({
        gender: '',
        name: '',
        contact: '',
        wish: '',
        giftWish: '',
        relation: '',
        inviteCode: ''
      });
      
      await loadVoteStats();
      
    } catch (error) {
      console.error("送出失敗", error);
      setSubmitMessage({ type: 'error', text: "送出失敗，請稍後再試。" });
    } finally {
      setSubmitting(false);
    }
  };

  const boyPercent = stats.total ? Math.round((stats.boy / stats.total) * 100) : 50;
  const girlPercent = stats.total ? 100 - boyPercent : 50;

  if (loading) return null;

  return (
    <>
      <div className="floating-bg">
        <div className="bubble b1" />
        <div className="bubble b2" />
        <div className="bubble b3" />
        <div className="bubble b4" />
        <div className="bubble b5" />
      </div>

      <header className="py-4 md:py-5 w-[min(1180px,calc(100%-24px))] mx-auto relative z-10">
        <div className="shadow-[var(--shadow-custom)] backdrop-blur-[14px] rounded-3xl md:rounded-full px-4 py-3 md:px-[18px] md:py-[14px] flex flex-col md:flex-row justify-between items-center gap-3 md:gap-[14px]" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
          <div className="flex items-center gap-2.5 sm:gap-3 font-extrabold text-[var(--color-primary-dark)] tracking-wider text-sm sm:text-base">
            <div className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] rounded-full grid place-items-center bg-gradient-to-br from-[#c9b3ff] to-[#ffd8ee] shadow-[0_6px_16px_rgba(140,111,232,.18)] text-[16px] sm:text-[20px]">🍼</div>
            <div>{isGambling ? "🎰 寶寶性別預測娛樂城" : "Baby Gender Guess"}</div>
          </div>
          <nav className="flex gap-1 sm:gap-2 flex-wrap items-center justify-center">
            {[
              { id: 'about', label: isGambling ? '下注規則' : '活動說明' },
              { id: 'countdown', label: isGambling ? '封盤倒數' : '倒數時間' },
              { id: 'vote', label: isGambling ? '立即投注' : '我要猜' },
              { id: 'gift', label: isGambling ? '派彩福利' : '抽禮物' },
              ...(siteConfig.actualGender || isAdmin(currentUser?.email)
                ? [{ id: 'reveal', label: isGambling ? '👑 派彩開獎' : '🎉 揭曉抽獎' }]
                : [])
            ].filter(item => !showOnlyReveal).map((item) => (
              <button 
                key={item.id} 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="cursor-pointer border-none bg-transparent no-underline text-[var(--color-text)] font-bold text-xs sm:text-sm px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full transition-colors hover:bg-[rgba(140,111,232,.12)] hover:text-[var(--color-primary-dark)]"
              >
                {item.label}
              </button>
            ))}
            {isAdmin(currentUser?.email) ? (
              <Link to="/admin" className="no-underline text-[var(--color-text)] font-bold text-xs sm:text-sm px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full transition-colors hover:bg-[rgba(140,111,232,.12)] hover:text-[var(--color-primary-dark)]">
                管理後台
              </Link>
            ) : (
              <Link to="/admin" className="no-underline text-white font-extrabold text-[10px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#b49bff] hover:opacity-90 active:scale-95 transition-all shadow-md">
                🔑 登入
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <CelebrationBall isOpen={drawState === 'done'} />
        {(siteConfig.actualGender || isAdmin(currentUser?.email)) && (
          <section id="reveal" className="py-[26px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10 scroll-mt-6">
            <div className="border shadow-[var(--shadow-custom)] rounded-[28px] p-6 md:p-10 text-center relative overflow-hidden" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              
              {/* Header Title */}
              <div className="inline-flex items-center gap-2 bg-[rgba(140,111,232,.12)] border border-[rgba(140,111,232,.15)] text-[var(--color-primary-dark)] px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold mb-5">
                {isGambling ? "🎰 澳門現場即時派彩盤口 👑" : "🎉 期待已久的揭曉時刻 👶"}
              </div>
              <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[var(--color-primary-dark)] mb-6">
                {isGambling ? "寶寶性別開獎大廳" : "寶寶性別正式揭曉與幸運抽獎"}
              </h2>

              {/* Phase 1: Gender Reveal Container */}
              <div className="max-w-2xl mx-auto mb-10">
                {revealState === 'initial' && (
                  <div className="bg-white/5 dark:bg-slate-900/40 border border-dashed border-[rgba(140,111,232,.3)] rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                    {/* Pulsing secret egg */}
                    <div className="w-[120px] sm:w-[150px] aspect-square rounded-full bg-gradient-to-tr from-[#90caf9] via-[#e1bee7] to-[#f48fb1] flex items-center justify-center text-[50px] sm:text-[64px] animate-bounce shadow-xl relative border-4 border-white dark:border-slate-800">
                      ❓
                      <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/10" />
                    </div>
                    <h3 className="text-xl font-extrabold text-[var(--color-primary-dark)] mt-6 mb-2">
                      {isGambling ? "🎲 莊家已完成性別封盤確認！" : "✨ 性別結果已經送達！"}
                    </h3>
                    <p className="text-[var(--color-muted)] text-sm font-medium mb-6 leading-relaxed">
                      點擊下方按鈕開始倒數並進行戲劇性開獎揭曉！
                    </p>
                    <button 
                      onClick={handleStartReveal}
                      className="px-8 py-3.5 rounded-full text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-[#8c6fe8] to-[#b49bff] hover:opacity-95 active:scale-95 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                    >
                      🔮 點擊開始揭曉寶寶性別 ⚡
                    </button>
                  </div>
                )}

                {showOnlyReveal && (
                  <div className="bg-slate-950 border border-indigo-950 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center min-h-[500px] overflow-hidden relative shadow-[0_0_50px_rgba(140,111,232,0.3)] select-none">
                    <style>{`
                      @keyframes fgoSpinClockwise {
                        0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.85); opacity: 0; }
                        15% { opacity: 0.8; }
                        100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.1); opacity: 0.95; }
                      }
                      @keyframes fgoSpinCounterClockwise {
                        0% { transform: translate(-50%, -50%) rotate(360deg) scale(0.65); opacity: 0; }
                        20% { opacity: 0.7; }
                        100% { transform: translate(-50%, -50%) rotate(0deg) scale(1.25); opacity: 0.85; }
                      }
                      @keyframes fgoPillarBurst {
                        0%, 20% { transform: translate(-50%, -50%) scaleX(0); opacity: 0; }
                        25% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; filter: brightness(2.5); }
                        65% { transform: translate(-50%, -50%) scaleX(1.8); opacity: 0.95; filter: brightness(1.8); }
                        85% { transform: translate(-50%, -50%) scaleX(0.2); opacity: 0.4; }
                        100% { transform: translate(-50%, -50%) scaleX(0); opacity: 0; }
                      }
                      @keyframes fgoCardFloatIn {
                        0% { transform: scale(0.5) translateY(-200px); opacity: 0; }
                        10% { transform: scale(1) translateY(0); opacity: 1; }
                        100% { transform: scale(1) translateY(0); opacity: 1; }
                      }
                      @keyframes fgoCardHover {
                        0%, 100% { transform: scale(1) translateY(0px) rotateY(180deg); }
                        50% { transform: scale(1) translateY(-12px) rotateY(180deg); }
                      }
                      @keyframes fgoCardSpinRoulette {
                        0% { transform: rotateY(0deg); }
                        5% { transform: rotateY(180deg); }
                        10% { transform: rotateY(360deg); }
                        15% { transform: rotateY(540deg); }
                        20% { transform: rotateY(720deg); }
                        25% { transform: rotateY(900deg); }
                        30% { transform: rotateY(1080deg); }
                        35% { transform: rotateY(1260deg); }
                        40% { transform: rotateY(1440deg); }
                        43% { transform: rotateY(1620deg); }
                        46% { transform: rotateY(1800deg); }
                        49% { transform: rotateY(1980deg); }
                        52% { transform: rotateY(2160deg); }
                        55% { transform: rotateY(2340deg); }
                        58% { transform: rotateY(2520deg); }
                        61% { transform: rotateY(2700deg); }
                        64% { transform: rotateY(2880deg); }
                        66% { transform: rotateY(3060deg); }
                        68% { transform: rotateY(3240deg); }
                        70% { transform: rotateY(3420deg); }
                        72% { transform: rotateY(3600deg); }
                        74% { transform: rotateY(3780deg); }
                        76% { transform: rotateY(3960deg); }
                        78% { transform: rotateY(4140deg); }
                        80% { transform: rotateY(4320deg); filter: brightness(1) drop-shadow(0 0 10px gold); }
                        85% { transform: scale(1.1) rotateY(5220deg); filter: brightness(2) drop-shadow(0 0 50px white); }
                        100% { transform: scale(1) rotateY(5220deg); filter: brightness(1) drop-shadow(0 0 20px gold); }
                      }
                      @keyframes whiteFlash {
                        0%, 80% { opacity: 0; }
                        84%, 86% { opacity: 1; }
                        100% { opacity: 0; }
                      }
                      @keyframes girlFlash {
                        0%, 9.9% { opacity: 0; }
                        10%, 19.9% { opacity: 1; }
                        20%, 29.9% { opacity: 0; }
                        30%, 39.9% { opacity: 1; }
                        40%, 45.9% { opacity: 0; }
                        46%, 51.9% { opacity: 1; }
                        52%, 57.9% { opacity: 0; }
                        58%, 63.9% { opacity: 1; }
                        64%, 67.9% { opacity: 0; }
                        68%, 71.9% { opacity: 1; }
                        72%, 75.9% { opacity: 0; }
                        76%, 80.9% { opacity: 1; }
                        81%, 100% { opacity: 0; }
                      }
                      @keyframes finalFlash {
                        0%, 80.9% { opacity: 0; }
                        81%, 100% { opacity: 1; }
                      }
                      @keyframes fgoSparkleFloat {
                        0% { transform: translateY(120px) scale(0); opacity: 0; }
                        40% { opacity: 1; }
                        100% { transform: translateY(-160px) scale(1.3); opacity: 0; }
                      }
                      @keyframes fgoLightningStrike {
                        0%, 100% { opacity: 0; }
                        12%, 14%, 38%, 40%, 75%, 77% { opacity: 0.95; filter: drop-shadow(0 0 15px rgba(255,255,255,0.9)); }
                        13%, 39%, 76% { opacity: 0.2; }
                      }
                      .backface-hidden {
                        backface-visibility: hidden;
                        -webkit-backface-visibility: hidden;
                      }
                    `}</style>
                    
                    {/* Dark Cosmic Void Background */}
                    <div className="absolute inset-0 bg-[#070514] opacity-100 z-0" />
                    
                    {/* Glowing nebulas based on flashing gender state to create tension */}
                    <div className={`absolute inset-0 transition-all duration-1000 z-0 blur-3xl ${
                      revealState === 'revealed'
                        ? 'opacity-40 ' + (siteConfig.actualGender === '男寶' ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-transparent' : 'bg-gradient-to-tr from-pink-600 via-rose-600 to-transparent')
                        : 'opacity-25 ' + (revealedGenderFlashing === '男寶' ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-transparent' : 'bg-gradient-to-tr from-pink-600 via-rose-600 to-transparent')
                    }`} />

                    {/* Concentric spinning runic arrays (FGO style) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[460px] aspect-square pointer-events-none z-10">
                      
                      {/* Fast spinning arrays (revealing) */}
                      <div className={`absolute inset-0 transition-opacity duration-1000 ${revealState === 'revealed' ? 'opacity-0' : 'opacity-100'}`}>
                        <div 
                          className="absolute left-1/2 top-1/2 border-4 border-dashed border-amber-400/40 rounded-full w-full h-full"
                          style={{ animation: 'fgoSpinClockwise 9.0s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}
                        >
                          <div className="absolute inset-2 border-2 border-indigo-400/30 rounded-full flex items-center justify-center">
                             <div className="text-yellow-400/35 text-[9px] font-mono tracking-[0.55em] uppercase w-full text-center rotate-45 select-none font-black">
                              ✦ BABY REVEAL SUMMONING SYSTEM ✦
                            </div>
                          </div>
                        </div>
                        <div 
                          className="absolute left-1/2 top-1/2 border-2 border-double border-cyan-400/50 rounded-full w-[82%] h-[82%]"
                          style={{ animation: 'fgoSpinCounterClockwise 8.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}
                        >
                          <div className="absolute inset-4 border border-dashed border-pink-400/20 rounded-full" />
                        </div>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl animate-pulse" />
                      </div>

                      {/* Slow spinning arrays (revealed) */}
                      <div className={`absolute inset-0 transition-opacity duration-1000 ${revealState === 'revealed' ? 'opacity-75' : 'opacity-0'}`}>
                        <div 
                          className="absolute left-1/2 top-1/2 border-4 border-dashed border-amber-400/20 rounded-full w-full h-full animate-[spin_60s_linear_infinite]"
                          style={{ transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="absolute inset-2 border-2 border-indigo-400/10 rounded-full flex items-center justify-center" />
                        </div>
                        <div 
                          className="absolute left-1/2 top-1/2 border-2 border-double border-cyan-400/20 rounded-full w-[82%] h-[82%] animate-[spin_40s_linear_infinite]"
                          style={{ transform: 'translate(-50%, -50%)', animationDirection: 'reverse' }}
                        />
                      </div>
                    </div>

                    {/* Giant Pillar of Light summoning beam */}
                    <div 
                      className={`absolute left-1/2 top-1/2 h-[600px] w-48 pointer-events-none z-10 ${
                        siteConfig.actualGender === '男寶'
                          ? 'bg-gradient-to-r from-transparent via-blue-400/80 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-pink-400/80 to-transparent'
                      }`}
                      style={{ animation: 'fgoPillarBurst 9.0s ease-in-out forwards' }}
                    />

                    {/* Lightning Sparks flashing overlay */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{ animation: 'fgoLightningStrike 3.5s ease-in-out infinite' }}>
                      <svg className="w-full h-full stroke-yellow-300 dark:stroke-cyan-300 opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 50 0 L 48 25 L 53 45 L 46 65 L 51 100" fill="none" strokeWidth="0.6" />
                        <path d="M 25 5 L 28 35 L 24 55 L 27 100" fill="none" strokeWidth="0.4" className="hidden sm:block" />
                        <path d="M 75 10 L 72 40 L 76 60 L 73 100" fill="none" strokeWidth="0.4" className="hidden sm:block" />
                      </svg>
                    </div>

                    {/* Spinning FGO Class Card Back with slow 3D flip */}
                    <div 
                      className="relative z-20 w-[210px] sm:w-[260px] md:w-[290px] aspect-[2/3]"
                      style={{ 
                        animation: revealState === 'revealed' ? 'fgoCardHover 4s ease-in-out infinite' : 'fgoCardFloatIn 11.0s ease-out forwards',
                        perspective: '1000px',
                      }}
                    >
                      <div 
                        className="w-full h-full relative"
                        style={{
                          transformStyle: 'preserve-3d',
                          animation: revealState === 'revealed' ? 'none' : 'fgoCardSpinRoulette 11.0s linear forwards',
                          transform: revealState === 'revealed' ? 'rotateY(180deg)' : undefined
                        }}
                      >
                        {/* CARD BACK (shown first, face up until flip) */}
                        <div 
                          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.5)] bg-slate-950 border border-amber-400/30"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <img 
                            src={babyImage} 
                            alt="Fate Card Back" 
                            className="w-full h-full object-cover object-center rounded-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* CARD FRONT (hidden initially, flipped 180deg) */}
                        <div 
                          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.7)] bg-slate-950 border border-amber-400/30"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <img 
                            src={babyBoyIcon} 
                            alt="Fate Card Boy Base" 
                            className="absolute inset-0 w-full h-full object-cover object-center rounded-2xl"
                            referrerPolicy="no-referrer"
                          />
                          <img 
                            src={babyGirlIcon} 
                            alt="Fate Card Girl" 
                            className="absolute inset-0 w-full h-full object-cover object-center rounded-2xl"
                            style={{ animation: revealState === 'revealed' ? 'none' : 'girlFlash 10.0s linear forwards', opacity: revealState === 'revealed' ? 0 : 1 }}
                            referrerPolicy="no-referrer"
                          />
                          <img 
                            src={siteConfig.actualGender === '男寶' ? babyBoyIcon : babyGirlIcon} 
                            alt="Fate Card Final" 
                            className="absolute inset-0 w-full h-full object-cover object-center rounded-2xl"
                            style={{ animation: revealState === 'revealed' ? 'none' : 'finalFlash 10.0s linear forwards', opacity: revealState === 'revealed' ? 1 : 0 }}
                            referrerPolicy="no-referrer"
                          />
                          {revealState === 'revealing' && (
                            <div 
                              className="absolute inset-0 bg-white"
                              style={{ animation: 'whiteFlash 10.0s linear forwards' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Magic sparkles floating upwards */}
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                      {[...Array(15)].map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute text-yellow-400/70 font-mono text-sm select-none"
                          style={{
                            left: `${Math.random() * 80 + 10}%`,
                            bottom: '10%',
                            animation: 'fgoSparkleFloat 4s linear infinite',
                            animationDelay: `${Math.random() * 3.5}s`,
                            animationDuration: `${Math.random() * 2 + 2.5}s`
                          }}
                        >
                          {['✦', '✧', '★', '☆', '⚛', '𖦹'][Math.floor(Math.random() * 6)]}
                        </div>
                      ))}
                    </div>

                    {/* Bottom Status panel */}
                    <div className="relative z-20 mt-8 text-center w-full max-w-md h-[180px]">
                      <div className={`absolute top-0 left-0 w-full transition-opacity duration-500 ${revealState === 'revealing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <h3 className="text-xl sm:text-2xl font-black text-yellow-300 font-serif tracking-[0.15em] animate-pulse drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                          {isGambling ? "🎰 聖晶石卡池・寶寶性別召喚中..." : "🔮 聖杯儀式・寶寶性別召喚中..."}
                        </h3>
                        <p className="text-indigo-200 text-xs sm:text-sm font-medium mt-2 tracking-wide leading-relaxed bg-indigo-950/60 border border-indigo-900/40 px-5 py-2.5 rounded-full shadow-inner max-w-xs sm:max-w-none mx-auto">
                          ✨ 正在與根源記錄核對性別因果律，請屏息以待！
                        </p>
                      </div>

                      <div className={`absolute top-0 left-0 w-full transition-opacity duration-1000 delay-300 ${revealState === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div className="text-sm font-extrabold text-amber-400 mb-2 uppercase tracking-widest font-mono">
                          🏆 SUMMON REVEAL SUCCESS 🏆
                        </div>
                        <h3 className={`text-3xl sm:text-4xl font-black tracking-wider mb-3 filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                          siteConfig.actualGender === '男寶' ? 'text-cyan-300' : 'text-pink-300'
                        }`}>
                          恭喜！召喚出 SSR {siteConfig.actualGender || "女寶"}！
                        </h3>
                        <p className="text-gray-300 text-xs sm:text-sm font-semibold leading-relaxed bg-black/60 border border-indigo-950 px-6 py-3.5 rounded-2xl shadow-xl max-w-xs sm:max-w-none mx-auto text-center">
                          {siteConfig.actualGender === '男寶' 
                            ? (isGambling ? "🎰 買中藍方【男寶】的玩家獲得全額 1.95 派彩彩金！全場沸騰中！💸" : "恭喜所有猜測【男寶】的親朋好友們，你們太厲害、太神準了！🎉")
                            : (isGambling ? "🎰 買中紅方【女寶】的玩家獲得全額 1.95 派彩彩金！全場沸騰中！💸" : "恭喜所有猜測【女寶】的親朋好友們，你們太厲害、太神準了！🎉")
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 2: Correct Guessers & Lucky Draw Carousel */}
              {revealState === 'revealed' && (
                <div className="animate-[fadeIn_0.6s_ease-out_forwards] border-t border-[rgba(140,111,232,.15)] pt-8 mt-4 text-left">
                  
                  {/* Correct Guessers List */}
                  <div className="mb-8">
                    <h4 className="text-base sm:text-lg font-extrabold text-[var(--color-primary-dark)] mb-4 flex items-center gap-2">
                      <span>🎯</span> 
                      <span>猜中正確性別的玩家名單 ({guesses.filter(g => g.gender === siteConfig.actualGender).length} 人)：</span>
                    </h4>
                    {guesses.filter(g => g.gender === siteConfig.actualGender).length === 0 ? (
                      <p className="text-[var(--color-muted)] text-sm font-semibold italic">目前沒有人猜中這個性別喔 🧩</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-4 bg-white/10 dark:bg-slate-900/50 border border-[var(--color-glass-border)] rounded-2xl">
                        {guesses.filter(g => g.gender === siteConfig.actualGender).map((g) => (
                          <div key={g.id} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-[var(--color-glass-border)] text-[var(--color-primary-dark)] shadow-sm flex items-center gap-1.5">
                            <span>👶</span>
                            <span>{g.name}</span>
                            <span className="text-[10px] opacity-60 font-mono">({g.relation})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lucky Winner Drawer */}
                  <div id="lucky-draw-container" className="border border-[var(--color-glass-border)] rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[var(--color-glass-bg)] to-white/5 shadow-inner scroll-mt-24">
                    <div className="text-center max-w-xl mx-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-yellow-100 text-yellow-700 border border-yellow-200 mb-4 animate-pulse">
                        🎁 LUCKY DRAW TIME 🎁
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-[var(--color-primary-dark)] mb-2">幸運得主大抽獎</h4>
                      <p className="text-[var(--color-muted)] text-xs sm:text-sm font-semibold leading-relaxed mb-6">
                        得獎結果同步讀取自主辦人在後台隨機抽選、完全公平公正的幸運名單！
                      </p>

                      {/* Display Slot Machine Countdown or Ready Frame */}
                      {drawCountdown !== null && (
                        <div className="bg-gradient-to-b from-amber-500/10 to-yellow-500/5 border-2 border-yellow-400/30 rounded-2xl p-6 mb-6 text-center overflow-hidden relative shadow-lg">
                          <style>{`
                            @keyframes popCountdown {
                              0% { transform: scale(0.3); opacity: 0; filter: blur(3px); }
                              50% { transform: scale(1.4); opacity: 0.9; }
                              100% { transform: scale(1); opacity: 1; filter: blur(0); }
                            }
                            .animate-pop-countdown {
                              animation: popCountdown 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                            }
                          `}</style>
                          <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-yellow-500 block mb-3 animate-pulse">
                            🎈 寶寶性別已揭曉！得獎名單將在 {drawCountdown} 秒後自動開抽 🎈
                          </span>
                          <div className="flex items-center justify-center h-28 relative">
                            {/* Inner ambient glowing circles */}
                            <div className="absolute w-24 h-24 rounded-full bg-amber-500/10 animate-ping" />
                            <div className="absolute w-16 h-16 rounded-full bg-amber-400/20" />
                            
                            <span 
                              key={drawCountdown} 
                              className="text-6xl sm:text-7xl font-black text-amber-500 font-mono tracking-widest relative z-10 animate-pop-countdown drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
                            >
                              {drawCountdown}
                            </span>
                          </div>
                          
                          {/* Progress bar ticking down */}
                          <div className="w-full bg-amber-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
                            <div 
                              className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full" 
                              style={{ width: `${(drawCountdown / 3) * 100}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      {drawState === 'ready' && drawCountdown === null && (
                        <div className="bg-white/10 dark:bg-slate-900/60 border border-[var(--color-glass-border)] rounded-2xl p-6 mb-6">
                          <div className="text-[36px] sm:text-[48px] filter saturate-50 animate-pulse mb-3">🎰</div>
                          <p className="text-[var(--color-muted)] text-sm font-extrabold mb-4">準備好揭曉幸運得獎者了嗎？點擊下方按鈕啟動轉輪！</p>
                          <button 
                            onClick={() => handleStartDraw()}
                            disabled={!siteConfig.winners || siteConfig.winners.length === 0}
                            className={`px-8 py-3.5 rounded-full text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 active:scale-95 transition-all shadow-lg hover:shadow-xl cursor-pointer ${
                              (!siteConfig.winners || siteConfig.winners.length === 0) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                            }`}
                          >
                            🎰 開始抽取幸運得主 🎁
                          </button>
                          {(!siteConfig.winners || siteConfig.winners.length === 0) && (
                            <p className="text-xs text-red-500 font-bold mt-2.5">
                              ⚠️ 主辦人尚未在後台完成隨機抽獎，暫時無法啟動開獎機。請靜待通知！
                            </p>
                          )}
                        </div>
                      )}

                      {drawState === 'drawing' && (
                        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-4 border-yellow-400 rounded-2xl p-8 mb-6 shadow-2xl relative overflow-hidden animate-[pulse_1s_infinite]">
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(234,179,8,0.1)_2px,transparent_2px)] bg-[size:100%_24px] pointer-events-none" />
                          <div className="text-yellow-400 text-xs font-mono tracking-widest uppercase mb-2 animate-pulse">● SPINNER ACTIVE</div>
                          <div className="text-3xl sm:text-5xl font-black text-white font-mono tracking-wider animate-bounce">
                            {rollingName || "???"}
                          </div>
                          <p className="text-indigo-200/80 text-xs font-bold mt-4 animate-pulse">正在核對全場對中盤口數據，計算極致好運得主...</p>
                        </div>
                      )}

                      {drawState === 'done' && (
                        <div>
                          <div className="bg-gradient-to-r from-amber-50/60 to-yellow-50/60 dark:from-yellow-950/10 dark:to-slate-900/50 border-2 border-yellow-300 dark:border-yellow-900/50 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl text-center">
                            <div className="text-5xl mb-4 animate-bounce">👑</div>
                            <h5 className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mb-4">🏆 恭喜以下幸運中獎者 🏆</h5>
                            
                            <div className="grid gap-4 max-w-lg mx-auto">
                              {(!siteConfig.winners || siteConfig.winners.length === 0) ? (
                                <p className="text-[var(--color-muted)] text-sm font-semibold italic">暫無得獎者數據 📭</p>
                              ) : (
                                siteConfig.winners.map((item, idx) => (
                                  <div key={item.id || idx} className="bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/40 rounded-xl p-4 text-left shadow-sm">
                                    <div className="flex justify-between items-start gap-2 border-b border-gray-100 dark:border-slate-700 pb-2 mb-2">
                                      <strong className="text-base text-[var(--color-primary-dark)]">
                                        🎉 特等獎得主 {idx + 1}：{item.name}
                                      </strong>
                                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 font-mono">
                                        {item.relation}
                                      </span>
                                    </div>
                                    <div className="text-xs text-[var(--color-muted)] leading-relaxed space-y-1 font-medium">
                                      <div>📞 聯絡方式：{item.contact}</div>
                                      <div>🎁 期望禮物：{item.giftWish || "—"}</div>
                                      <div className="italic text-gray-500 mt-1">✍️ 祝福留言："{item.wish || "祝寶寶健康平安"}"</div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Replay button removed per user request */}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              )}

            </div>
          </section>
        )}
        {!showOnlyReveal && (
          <>
            <section className="py-4 pb-6 w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
              <div className="rounded-[var(--radius-xl)] p-6 md:p-10 border border-[var(--color-glass-border,rgba(255,255,255,0.8))] shadow-[var(--shadow-custom)] grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-6 items-center overflow-hidden relative" style={{ background: 'var(--color-card-grad)' }}>
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(140,111,232,.12)] border border-[rgba(140,111,232,.15)] text-[var(--color-primary-dark)] px-4 py-2.5 rounded-full text-sm font-extrabold mb-[18px]">
                {isGambling ? "🔥 全台最大盤口熱烈開盤中・買定離手！" : "✨ 一起來猜猜看，寶寶到底是男生還是女生？"}
              </div>
              <h1 className="text-[clamp(32px,5vw,56px)] leading-[1.12] text-[var(--color-primary-dark)] mb-3.5 font-extrabold whitespace-pre-line">
                {isGambling ? "🎰 2026年全球最火爆！\n寶寶性別預測競猜娛樂城 💸" : "猜猜我們的小寶寶\n是男寶還是女寶 💜"}
              </h1>
              <p className="text-[var(--color-muted)] leading-[1.9] text-base mb-6">
                {isGambling ? "【賠率全新升級：1 賠 1.95】支持心中所屬陣營，不需儲值，填寫祝福直接免費領取下注金！猜對在性別正式揭曉派彩日即有機會抽出極奢大禮！🎁" : "我們想把迎接寶寶的喜悅分享給每一位家人朋友～在正式揭曉前，先來玩一個小小的猜謎活動吧！猜對的人將有機會獲得小禮物 🎁"}
              </p>

              <div className="flex gap-3.5 flex-wrap flex-col sm:flex-row mb-5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('vote')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="cursor-pointer border-none inline-flex items-center justify-center gap-2 px-[22px] py-[14px] rounded-full text-[15px] font-extrabold transition-all text-white bg-gradient-to-br from-[var(--color-primary)] to-[#ab90ff] shadow-[0_12px_28px_rgba(140,111,232,.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(140,111,232,.34)]"
                >
                  {isGambling ? "⚡ 立即瘋狂下注" : "立即參加猜猜看"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 px-[22px] py-[14px] rounded-full text-[15px] font-extrabold transition-all text-[var(--color-primary-dark)] border border-[rgba(140,111,232,.12)] hover:-translate-y-0.5 hover:opacity-90"
                  style={{ background: 'var(--color-glass-bg)' }}
                >
                  {isGambling ? "📖 閱讀下注攻略" : "先看活動規則"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                <div className="border shadow-[0_8px_20px_rgba(120,93,200,.08)] rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:px-4 sm:py-3.5 text-center sm:text-left" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
                  <div className="text-[var(--color-muted)] text-[11px] sm:text-[13px] font-bold mb-1 sm:mb-1.5 break-all">{isGambling ? "🎰 總下注人次" : "目前參加人數"}</div>
                  <div className="text-[18px] sm:text-[24px] font-extrabold text-[var(--color-primary-dark)]">{stats.total}</div>
                </div>
                <div className="border shadow-[0_8px_20px_rgba(120,93,200,.08)] rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:px-4 sm:py-3.5 text-center sm:text-left" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
                  <div className="text-[var(--color-muted)] text-[11px] sm:text-[13px] font-bold mb-1 sm:mb-1.5 break-all">{isGambling ? "💙 押注男寶金" : "男寶票數"}</div>
                  <div className="text-[18px] sm:text-[24px] font-extrabold text-[var(--color-primary-dark)]">{isGambling ? `${stats.boy * 1000} 萬` : stats.boy}</div>
                </div>
                <div className="border shadow-[0_8px_20px_rgba(120,93,200,.08)] rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:px-4 sm:py-3.5 text-center sm:text-left" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
                  <div className="text-[var(--color-muted)] text-[11px] sm:text-[13px] font-bold mb-1 sm:mb-1.5 break-all">{isGambling ? "💖 押注女寶金" : "女寶票數"}</div>
                  <div className="text-[18px] sm:text-[24px] font-extrabold text-[var(--color-primary-dark)]">{isGambling ? `${stats.girl * 1000} 萬` : stats.girl}</div>
                </div>
              </div>
            </div>

            <div className="min-h-[300px] sm:min-h-[360px] lg:min-h-[400px] flex items-center justify-center relative">
              <div className="w-[min(100%,430px)] aspect-square rounded-[32px] border border-[var(--color-glass-border,rgba(255,255,255,0.85))] shadow-[var(--shadow-custom)] flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-card-grad)' }}>
                <div className="absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 bg-white/90 dark:bg-slate-800 rounded-full shadow-[0_10px_24px_rgba(120,93,200,.12)] text-[var(--color-primary-dark)] text-[11px] sm:text-[13px] font-extrabold animate-[floatY_7s_ease-in-out_infinite] left-[15px] sm:left-[20px] top-[25px] sm:top-[36px]">
                  {isGambling ? "💙 男寶 (1.95)" : "💙 Team Boy?"}
                </div>
                <div className="absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 bg-white/90 dark:bg-slate-800 rounded-full shadow-[0_10px_24px_rgba(120,93,200,.12)] text-[var(--color-primary-dark)] text-[11px] sm:text-[13px] font-extrabold animate-[floatY_7s_ease-in-out_infinite] right-[15px] sm:right-[18px] top-[55px] sm:top-[72px] [animation-delay:1s]">
                  {isGambling ? "💖 女寶 (1.95)" : "💖 Team Girl?"}
                </div>
                <div className="absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 bg-white/90 dark:bg-slate-800 rounded-full shadow-[0_10px_24px_rgba(120,93,200,.12)] text-[var(--color-primary-dark)] text-[11px] sm:text-[13px] font-extrabold animate-[floatY_7s_ease-in-out_infinite] left-[20px] sm:left-[28px] bottom-[30px] sm:bottom-[40px] [animation-delay:2s]">
                  {isGambling ? "🎰 免費下注" : "🎀 Baby is coming"}
                </div>
                <div className="absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 bg-white/90 dark:bg-slate-800 rounded-full shadow-[0_10px_24px_rgba(120,93,200,.12)] text-[var(--color-primary-dark)] text-[11px] sm:text-[13px] font-extrabold animate-[floatY_7s_ease-in-out_infinite] right-[18px] sm:right-[24px] bottom-[55px] sm:bottom-[76px] [animation-delay:1.4s]">
                  {isGambling ? "💎 自動結算派彩" : "🧸 Guess & Win"}
                </div>
                <div className="w-[78%] aspect-square rounded-full bg-[conic-gradient(from_220deg,#ffd1e8,#eadbff,#d6eaff,#ffd1e8)] shadow-[inset_0_12px_30px_rgba(255,255,255,.78),_0_18px_36px_rgba(120,93,200,.15)] flex items-center justify-center animate-[pulse-custom_5s_ease-in-out_infinite] overflow-hidden">
                  <img 
                    src={isGambling ? "/IMG_1604.png" : (siteConfig.actualGender === '男寶' ? siteConfig.boyImageUrl : siteConfig.actualGender === '女寶' ? siteConfig.girlImageUrl : babyImage)} 
                    alt="Baby" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-[26px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
          <div className="text-center mb-6">
            <div className="inline-block px-3.5 py-2 rounded-full bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] text-[13px] font-extrabold mb-3">
              {isGambling ? "🎲 PLAYING GUIDE & ODDS" : "ABOUT THE EVENT"}
            </div>
            <h2 className="text-[clamp(28px,4vw,40px)] text-[var(--color-primary-dark)] mb-2.5 font-bold">
              {isGambling ? "🎰 娛樂城投注攻略" : "活動怎麼玩？"}
            </h2>
            <p className="text-[var(--color-muted)] leading-[1.9] max-w-[780px] mx-auto text-base">
              {isGambling 
                ? "支持心中看好的寶寶性別，填寫真實姓名與聯絡方式，附上您的祝福語即投單！封盤揭曉後，系統將從猜對的玩家中抽取幸運特獎發放尊榮好禮 💸"
                : "選擇你覺得寶寶是男生還是女生，填上姓名與聯絡方式，最後再留下祝福就完成啦！等寶寶正式揭曉後，我們會從 猜對的人 裡抽出幸運朋友送上小禮物 💝"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-7">
            <div className="border shadow-[var(--shadow-custom)] rounded-[24px] p-6 relative overflow-hidden after:content-[''] after:absolute after:-right-[18px] after:-top-[18px] after:w-[90px] after:h-[90px] after:rounded-full after:bg-[radial-gradient(circle,rgba(205,187,255,.25),rgba(205,187,255,0))]" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="w-[54px] h-[54px] rounded-[18px] grid place-items-center mb-3.5 text-2xl bg-gradient-to-br from-[rgba(205,187,255,.68)] to-[rgba(255,216,238,.7)]">1️⃣</div>
              <h3 className="text-xl text-[var(--color-primary-dark)] mb-2.5 font-bold">
                {isGambling ? "選擇押注盤口" : "選擇你的答案"}
              </h3>
              <p className="text-[var(--color-muted)] leading-[1.85] text-[15px]">
                {isGambling ? "點選您看好的寶寶性別陣營（男寶/女寶），目前雙向賠率全面升級為 1:1.95！" : "選擇你猜測的寶寶性別，可以是「男寶」或「女寶」。"}
              </p>
            </div>
            <div className="border shadow-[var(--shadow-custom)] rounded-[24px] p-6 relative overflow-hidden after:content-[''] after:absolute after:-right-[18px] after:-top-[18px] after:w-[90px] after:h-[90px] after:rounded-full after:bg-[radial-gradient(circle,rgba(205,187,255,.25),rgba(205,187,255,0))]" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="w-[54px] h-[54px] rounded-[18px] grid place-items-center mb-3.5 text-2xl bg-gradient-to-br from-[rgba(205,187,255,.68)] to-[rgba(255,216,238,.7)]">2️⃣</div>
              <h3 className="text-xl text-[var(--color-primary-dark)] mb-2.5 font-bold">
                {isGambling ? "實名投單送祝福" : "填寫姓名與聯絡方式"}
              </h3>
              <p className="text-[var(--color-muted)] leading-[1.85] text-[15px]">
                {isGambling ? "填寫正確姓名與LINE或手機聯絡資訊，並留下最誠摯的祝福，不需資金即可免費送出下注！" : "方便我們在揭曉後通知猜對的朋友，也可以留下對寶寶或爸媽的祝福。"}
              </p>
            </div>
            <div className="border shadow-[var(--shadow-custom)] rounded-[24px] p-6 relative overflow-hidden after:content-[''] after:absolute after:-right-[18px] after:-top-[18px] after:w-[90px] after:h-[90px] after:rounded-full after:bg-[radial-gradient(circle,rgba(205,187,255,.25),rgba(205,187,255,0))]" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="w-[54px] h-[54px] rounded-[18px] grid place-items-center mb-3.5 text-2xl bg-gradient-to-br from-[rgba(205,187,255,.68)] to-[rgba(255,216,238,.7)]">3️⃣</div>
              <h3 className="text-xl text-[var(--color-primary-dark)] mb-2.5 font-bold">
                {isGambling ? "封盤揭曉爆獎" : "揭曉後抽出小禮物"}
              </h3>
              <p className="text-[var(--color-muted)] leading-[1.85] text-[15px]">
                {isGambling ? "截止日一到立即封盤！寶寶正式誕生揭曉後，平台結算從猜對的投注單中抽出尊榮大獎！" : "活動截止後不再接受投票，等寶寶性別揭曉後，會從猜對的人中抽出幸運得主！"}
              </p>
            </div>
          </div>
        </section>

        <section id="countdown" className="py-[26px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
          <div className="text-center mb-6">
            <div className="inline-block px-3.5 py-2 rounded-full bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] text-[13px] font-extrabold mb-3">
              {isGambling ? "⏰ CLOSING COUNTDOWN" : "COUNTDOWN"}
            </div>
            <h2 className="text-[clamp(28px,4vw,40px)] text-[var(--color-primary-dark)] mb-2.5 font-bold">
              {isGambling ? "🎰 距離下注封盤還有" : "距離截止投票還有"}
            </h2>
            <p className="text-[var(--color-muted)] leading-[1.9] max-w-[780px] mx-auto text-base">
              {isGambling ? "倒數計時器歸零後將自動封盤！抓緊時間立刻投注，買定離手！" : "截止時間由後台設定，時間一到將自動關閉投票。"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 mt-6 max-w-2xl mx-auto">
            <div className="border shadow-[var(--shadow-custom)] rounded-2xl sm:rounded-[24px] px-2 py-3.5 sm:px-3.5 sm:py-[22px] text-center animate-pulse" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="text-[var(--color-primary-dark)] text-xl sm:text-[clamp(28px,5vw,34px)] font-extrabold mb-1 sm:mb-2">{timeLeft.days}</div>
              <div className="text-[var(--color-muted)] text-xs sm:text-sm font-bold">天</div>
            </div>
            <div className="border shadow-[var(--shadow-custom)] rounded-2xl sm:rounded-[24px] px-2 py-3.5 sm:px-3.5 sm:py-[22px] text-center animate-pulse" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="text-[var(--color-primary-dark)] text-xl sm:text-[clamp(28px,5vw,34px)] font-extrabold mb-1 sm:mb-2">{timeLeft.hours}</div>
              <div className="text-[var(--color-muted)] text-xs sm:text-sm font-bold">小時</div>
            </div>
            <div className="border shadow-[var(--shadow-custom)] rounded-2xl sm:rounded-[24px] px-2 py-3.5 sm:px-3.5 sm:py-[22px] text-center animate-pulse" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="text-[var(--color-primary-dark)] text-xl sm:text-[clamp(28px,5vw,34px)] font-extrabold mb-1 sm:mb-2">{timeLeft.minutes}</div>
              <div className="text-[var(--color-muted)] text-xs sm:text-sm font-bold">分鐘</div>
            </div>
            <div className="border shadow-[var(--shadow-custom)] rounded-2xl sm:rounded-[24px] px-2 py-3.5 sm:px-3.5 sm:py-[22px] text-center animate-pulse" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
              <div className="text-[var(--color-primary-dark)] text-xl sm:text-[clamp(28px,5vw,34px)] font-extrabold mb-1 sm:mb-2">{timeLeft.seconds}</div>
              <div className="text-[var(--color-muted)] text-xs sm:text-sm font-bold">秒</div>
            </div>
          </div>
        </section>

        <section id="vote" className="py-[26px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
          <div className="text-center mb-6">
            <div className="inline-block px-3.5 py-2 rounded-full bg-[rgba(140,111,232,.12)] text-[var(--color-primary-dark)] text-[13px] font-extrabold mb-3">
              {isGambling ? "🎰 PLACE YOUR BETS" : "MAKE YOUR GUESS"}
            </div>
            <h2 className="text-[clamp(28px,4vw,40px)] text-[var(--color-primary-dark)] mb-2.5 font-bold">
              {isGambling ? "🎰 競猜盤口：立即買定離手！ 💰" : "留下你的猜測吧 💜"}
            </h2>
            <p className="text-[var(--color-muted)] leading-[1.9] max-w-[780px] mx-auto text-base">
              {isGambling 
                ? "支持心中所屬寶寶性別，填寫玩家實名姓名與聯絡電話，不需資金即可免費送出投注！猜對者將在揭曉日參與豪華大禮派彩！"
                : "選擇你的答案後，再填寫基本資料與祝福，我們就能把這份期待一起收藏起來。"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 mt-7">
            <div className="border border-[var(--color-glass-border,rgba(255,255,255,0.85))] shadow-[var(--shadow-custom)] rounded-[28px] p-5 sm:p-[26px]" style={{ background: 'var(--color-glass-bg)' }}>
              <div className="flex justify-between items-center gap-3 mb-4.5">
                <h3 className="text-2xl text-[var(--color-primary-dark)] font-bold">
                  {isGambling ? "🎰 下注競猜面板" : "票選寶寶性別"}
                </h3>
                <div className="bg-[rgba(140,111,232,.12)] border border-[rgba(140,111,232,.15)] text-[var(--color-primary-dark)] px-3 py-2 rounded-full text-[13px] font-extrabold leading-none">即時賠率統計</div>
              </div>
              <div className="text-[var(--color-muted)] leading-[1.8] text-sm mb-5">
                {isGambling ? "選擇您看好的競猜陣營：男寶與女寶兩側賠率高達 1:1.95 點，預測勝率 50% 驚人高爆！" : "先選擇你支持的隊伍吧！投票後下方比例會自動更新。"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4.5">
                <label className={`relative rounded-[24px] px-[18px] py-[22px] min-h-[210px] cursor-pointer transition-all border-2 flex flex-col justify-between overflow-hidden ${
                  themeId === 'milktea'
                    ? `bg-gradient-to-b from-[#fdfbf9] to-[#f5ebe2] text-[#524339] ${
                        formData.gender === '男寶' 
                          ? 'border-[#b08e72] ring-2 ring-[#b08e72] shadow-[0_18px_34px_rgba(176,142,114,0.22)] -translate-y-1' 
                          : 'border-[#eedac5] hover:border-[#b08e72] hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(176,142,114,0.12)]'
                      }`
                    : isGambling 
                    ? `bg-slate-950/80 text-white ${
                        formData.gender === '男寶'
                          ? 'border-sky-400 ring-2 ring-sky-400 shadow-[0_18px_34px_rgba(14,165,233,0.3)] -translate-y-1'
                          : 'border-sky-500/30 hover:border-sky-400 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(14,165,233,0.15)]'
                      }`
                    : `bg-gradient-to-b from-[rgba(207,231,255,.65)] to-[rgba(255,255,255,.88)] text-[var(--color-text)] ${
                        formData.gender === '男寶'
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-[0_18px_34px_rgba(120,93,200,.18)] -translate-y-1'
                          : 'border-transparent hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(120,93,200,.12)]'
                      }`
                }`}>
                  <input type="radio" name="gender" value="男寶" className="hidden" checked={formData.gender === '男寶'} onChange={handleInputChange} />
                  <div>
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-2xl overflow-hidden border-2 border-sky-400/40 shadow-sm bg-white/20">
                        <img src={babyBoyIcon} alt="寶寶男孩" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800 text-[var(--color-primary-dark)] px-3 py-2 rounded-full text-[13px] font-extrabold leading-none">
                        {isGambling ? "賠率 1.95" : "Team Boy"}
                      </div>
                    </div>
                    <h4 className="text-2xl text-[var(--color-primary-dark)] mb-2 font-bold">
                      {isGambling ? "押注男寶 📈" : "我猜是男寶"}
                    </h4>
                    <p className="text-[var(--color-muted)] leading-[1.75] text-sm">
                      {isGambling ? "【極速開盤】帥氣小王子來臨？看好小男生陽光帥氣路線？速押男寶！" : "陽光小男孩報到？你覺得這次是帥氣小王子路線嗎 👶"}
                    </p>
                  </div>
                </label>

                <label className={`relative rounded-[24px] px-[18px] py-[22px] min-h-[210px] cursor-pointer transition-all border-2 flex flex-col justify-between overflow-hidden ${
                  themeId === 'milktea'
                    ? `bg-gradient-to-b from-[#fdfbf9] to-[#f5ebe2] text-[#524339] ${
                        formData.gender === '女寶' 
                          ? 'border-[#b08e72] ring-2 ring-[#b08e72] shadow-[0_18px_34px_rgba(176,142,114,0.22)] -translate-y-1' 
                          : 'border-[#eedac5] hover:border-[#b08e72] hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(176,142,114,0.12)]'
                      }`
                    : isGambling 
                    ? `bg-slate-950/80 text-white ${
                        formData.gender === '女寶'
                          ? 'border-pink-400 ring-2 ring-pink-400 shadow-[0_18px_34px_rgba(236,72,153,0.3)] -translate-y-1'
                          : 'border-pink-500/30 hover:border-pink-400 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(236,72,153,0.15)]'
                      }`
                    : `bg-gradient-to-b from-[rgba(255,200,231,.58)] to-[rgba(255,255,255,.88)] text-[var(--color-text)] ${
                        formData.gender === '女寶'
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-[0_18px_34px_rgba(120,93,200,.18)] -translate-y-1'
                          : 'border-transparent hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(120,93,200,.12)]'
                      }`
                }`}>
                  <input type="radio" name="gender" value="女寶" className="hidden" checked={formData.gender === '女寶'} onChange={handleInputChange} />
                  <div>
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-2xl overflow-hidden border-2 border-pink-400/40 shadow-sm bg-white/20">
                        <img src={babyGirlIcon} alt="寶寶女孩" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800 text-[var(--color-primary-dark)] px-3 py-2 rounded-full text-[13px] font-extrabold leading-none">
                        {isGambling ? "賠率 1.95" : "Team Girl"}
                      </div>
                    </div>
                    <h4 className="text-2xl text-[var(--color-primary-dark)] mb-2 font-bold">
                      {isGambling ? "押注女寶 🔥" : "我猜是女寶"}
                    </h4>
                    <p className="text-[var(--color-muted)] leading-[1.75] text-sm">
                      {isGambling ? "【熱烈推薦】可愛小公主登場？感受滿滿粉嫩甜蜜的氣息？速押女寶！" : "甜甜小公主登場？你是不是已經感受到滿滿可愛氣息了 🎀"}
                    </p>
                  </div>
                </label>
              </div>

              <div className={`mt-4.5 border rounded-[18px] p-4 backdrop-blur-sm ${
                themeId === 'milktea'
                  ? 'border-[#eedac5] bg-white/50'
                  : 'border-[rgba(140,111,232,.15)] bg-black/10 dark:bg-black/30'
              }`}>
                <div className="flex justify-between gap-2.5 mb-3 text-[var(--color-primary-dark)] text-sm font-extrabold">
                  <span>{isGambling ? "📈 兩側池子投注比例" : "目前投票比例"}</span>
                  <span>男寶 {boyPercent}% / 女寶 {girlPercent}%</span>
                </div>
                <div className={`h-[14px] rounded-full overflow-hidden flex ${
                  themeId === 'milktea' ? 'bg-[#f5ebe2]' : 'bg-[#f0e9ff] dark:bg-slate-850'
                }`}>
                  <div className="h-full bg-gradient-to-r from-[#00bfff] to-[#00f0ff] transition-all duration-300" style={{ width: `${boyPercent}%` }}></div>
                  <div className="h-full bg-gradient-to-r from-[#ff007f] to-[#ff66b2] transition-all duration-300" style={{ width: `${girlPercent}%` }}></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className={`rounded-[16px] py-3 px-3.5 text-center text-sm font-extrabold text-[var(--color-primary-dark)] border ${
                    themeId === 'milktea' 
                      ? 'bg-white/60 border-[#eedac5]' 
                      : 'bg-white/10 dark:bg-slate-900/60 border-sky-500/20'
                  }`}>💙 男寶總押注量：<span>{isGambling ? `${stats.boy * 1000} 萬` : stats.boy}</span></div>
                  <div className={`rounded-[16px] py-3 px-3.5 text-center text-sm font-extrabold text-[var(--color-primary-dark)] border ${
                    themeId === 'milktea' 
                      ? 'bg-white/60 border-[#eedac5]' 
                      : 'bg-white/10 dark:bg-slate-900/60 border-pink-500/20'
                  }`}>💖 女寶總押注量：<span>{isGambling ? `${stats.girl * 1000} 萬` : stats.girl}</span></div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-glass-border,rgba(255,255,255,0.85))] shadow-[var(--shadow-custom)] rounded-[28px] p-5 sm:p-[26px]" style={{ background: 'var(--color-glass-bg)' }}>
              <h3 className="text-2xl text-[var(--color-primary-dark)] mb-2.5 font-bold">
                {isGambling ? "📝 登記下注玩家資訊" : "填寫你的參加資訊"}
              </h3>
              <div className="text-[var(--color-muted)] leading-[1.8] mb-5 text-sm">
                {isGambling 
                  ? "請留下真實玩家大名、聯絡方式與給寶寶或爸媽的祝福。猜中性別即具備 100% 機會參與派彩日前十強幸運大抽獎！"
                  : "留下你的名字、聯絡方式與祝福，活動截止後若猜對，我們就能通知你抽小禮物 🎁"
                }
              </div>

              {isClosed && (
                <div className="mt-4.5 bg-[rgba(239,93,122,.12)] border border-[rgba(239,93,122,.2)] text-[#bf3955] px-[18px] py-[16px] rounded-[18px] leading-[1.8] font-bold mb-4 animate-bounce">
                  {isGambling ? "⚠️ 盤口已關閉封盤，目前無法再送出下注。感謝全體玩家支持！" : "活動已截止，目前無法再送出投票。謝謝大家的參與 💜"}
                </div>
              )}

              <form onSubmit={submitVote} className={isClosed ? 'opacity-70 pointer-events-none' : ''}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-2 mb-3.5">
                    <label htmlFor="name" className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {isGambling ? "下注玩家姓名 / 暱稱 *" : "姓名 / 暱稱 *"}
                    </label>
                    <input id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(140,111,232,.15)]" type="text" placeholder="例如：玩家小龍 / 賭神高進" required />
                  </div>

                  <div className="flex flex-col gap-2 mb-3.5">
                    <label htmlFor="contact" className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {isGambling ? "玩家聯絡管道 (LINE / 電話) *" : "聯絡方式 *"}
                    </label>
                    <input id="contact" name="contact" value={formData.contact} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(140,111,232,.15)]" type="text" placeholder="LINE ID / 電話 / 手機號碼" required />
                  </div>

                  <div className="flex flex-col gap-2 mb-3.5 col-span-1 sm:col-span-2">
                    <label htmlFor="inviteCode" className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {isGambling ? "🎟️ VIP 邀請碼 (必填) *" : "🎟️ 活動邀請碼 (必填) *"}
                    </label>
                    <input id="inviteCode" name="inviteCode" value={formData.inviteCode} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(140,111,232,.15)] font-mono tracking-widest uppercase" type="text" placeholder="輸入 8 碼邀請碼" required />
                  </div>

                  <div className="flex flex-col gap-2 mb-3.5 col-span-1 sm:col-span-2">
                    <label htmlFor="wish" className="text-sm font-extrabold text-[var(--color-primary-dark)]">下注附言 / 給寶寶與爸媽的祝福語</label>
                    <textarea id="wish" name="wish" value={formData.wish} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(140,111,232,.15)] min-h-[120px] resize-y leading-[1.7]" placeholder="例如：恭喜當爸爸媽媽！祝寶寶健康快樂，爆發超凡好運 💜"></textarea>
                  </div>

                  <div className="flex flex-col gap-2 mb-3.5">
                    <label htmlFor="giftWish" className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {isGambling ? "🎯 若猜對，想兌換的派彩禮物" : "如果猜對，想抽的小禮物"}
                    </label>
                    <select id="giftWish" name="giftWish" value={formData.giftWish} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer">
                      <option value="" className="text-black">請選擇派彩方向（可不填）</option>
                      <option className="text-black">咖啡 / 飲料券</option>
                      <option className="text-black">小甜點 / 餅乾禮盒</option>
                      <option className="text-black">超商禮券</option>
                      <option className="text-black">可愛小物 / 文具</option>
                      <option className="text-black">都可以，我純粹來送祝福 💕</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 mb-3.5">
                    <label htmlFor="relation" className="text-sm font-extrabold text-[var(--color-primary-dark)]">
                      {isGambling ? "🤝 玩家與主辦莊家關係" : "你是我們的"}
                    </label>
                    <select id="relation" name="relation" value={formData.relation} onChange={handleInputChange} className="w-full bg-white/10 border border-[rgba(140,111,232,.2)] dark:bg-slate-900/60 rounded-[16px] px-4 py-3.5 text-[15px] text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer">
                      <option value="" className="text-black">請選擇親疏關係（可不填）</option>
                      <option className="text-black">家人</option>
                      <option className="text-black">親戚</option>
                      <option className="text-black">朋友</option>
                      <option className="text-black">同事</option>
                      <option className="text-black">同學</option>
                      <option className="text-black">其他</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2.5 bg-[rgba(140,111,232,.08)] border border-[rgba(140,111,232,.15)] rounded-[16px] px-4 py-3.5 text-[var(--color-muted)] text-[13px] leading-[1.8]">
                  {isGambling ? (
                    <>
                      📌 <strong>🎰 莊家風控及投注規章：</strong><br/>
                      1. 每位玩家（單一裝置）限制投單一次，嚴禁多開惡意刷單。<br/>
                      2. 封盤倒數歸零後盤口即刻封死，概不受理任何補單 or 改單。<br/>
                      3. 本次活動為 100% 免費娛樂，不涉及任何真實金錢投注，請放心遊玩！<br/>
                      4. 派彩大抽獎及最終獎品發放規則，最終解釋權歸莊家（爸媽）所有！
                    </>
                  ) : (
                    <>
                      📌 <strong>活動規則提醒：</strong><br/>
                      1. 每人原則上填寫一次。<br/>
                      2. 活動截止後將不再受理修改。<br/>
                      3. 猜對者才有抽獎資格。<br/>
                      4. 實際中獎資格與禮物內容以主辦人公告為準。
                    </>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap items-center mt-4.5">
                  <button type="submit" disabled={submitting} className={`inline-flex items-center justify-center gap-2 px-[22px] py-[14px] rounded-full text-[15px] font-extrabold transition-all text-white bg-gradient-to-br from-[var(--color-primary)] to-[#ab90ff] w-full sm:w-auto shadow-[0_12px_28px_rgba(140,111,232,.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(140,111,232,.34)] ${submitting ? 'opacity-70 cursor-not-allowed hover:translate-y-0' : ''}`}>
                    {isClosed ? (isGambling ? '⚠️ 已截止封盤' : '活動已截止') : (isGambling ? '⚡ 免費下注（確定送出）' : '送出我的猜測')}
                  </button>
                  {submitting && <div className="inline-flex items-center gap-2 text-[var(--color-muted)] text-sm font-bold">⏳ 投單同步至雲端伺服器中...</div>}
                </div>

                {submitMessage && (
                  <div className={`mt-4.5 px-[18px] py-[16px] rounded-[18px] leading-[1.8] font-bold ${
                    submitMessage.type === 'success' 
                      ? 'bg-[rgba(61,187,131,.12)] border border-[rgba(61,187,131,.2)] text-[#2f8f67]' 
                      : 'bg-[rgba(239,93,122,.12)] border border-[rgba(239,93,122,.2)] text-[#bf3955]'
                  }`}>
                    {submitMessage.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>

        <section id="gift" className="py-[26px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
          <div className="relative mt-[18px] text-white rounded-[30px] shadow-[0_18px_40px_rgba(109,80,207,.28)] p-[30px] overflow-hidden after:content-[''] after:absolute after:w-[220px] after:h-[220px] after:rounded-full after:bg-white/10 after:-right-[60px] after:-top-[60px] before:content-[''] before:absolute before:w-[160px] before:h-[160px] before:rounded-full before:bg-white/10 before:-left-[30px] before:-bottom-[60px]" style={{ background: themeId === 'milktea' ? 'linear-gradient(135deg, #b08e72, #d1b49a)' : (isGambling ? 'linear-gradient(135deg, #1e1b4b, #311042)' : 'linear-gradient(135deg, #8c6fe8, #b49bff)') }}>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-center">
              <div>
                <h3 className="text-[30px] mb-3 font-bold">
                  {isGambling ? "🎁 猜中性別：送特級派彩大獎 🎰" : "猜對的人，我們會抽出小禮物 🎁"}
                </h3>
                <p className="leading-[1.95] opacity-95 text-[15px] font-medium">
                  {isGambling ? (
                    <>
                      為慶祝本次寶寶性別大盤口熱烈開啟，莊家特設百萬派彩池！<br/><br/>
                      本盤口結算後，系統將自動校對猜對正確性別的幸運名單，並隨機派發尊榮玩家好禮（例如超商大額禮券、星巴克大杯飲料等）。感謝全體玩家一同見證這場年度高爆競猜！ 💸
                    </>
                  ) : (
                    <>
                      為了讓這份等待更有參與感，我們準備了一點小心意給猜對的朋友。<br/><br/>
                      等到寶寶性別正式揭曉後，會從 <strong>猜對答案的名單中抽出幸運得得主</strong>，並用你留下的聯絡方式通知你。謝謝你一起參與這個可愛又充滿期待的小活動 💜
                    </>
                  )}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="bg-white/15 border border-white/20 rounded-[18px] px-4 py-3.5 leading-[1.75] backdrop-blur-[8px]">
                  {isGambling ? (
                    <>🎟️ <strong>派彩條件：</strong>活動截止前成功送出下注，並猜中寶寶正確性別。</>
                  ) : (
                    <>🎀 <strong>抽獎資格：</strong>活動截止前完成填寫，且猜中寶寶性別。</>
                  )}
                </div>
                <div className="bg-white/15 border border-white/20 rounded-[18px] px-4 py-3.5 leading-[1.75] backdrop-blur-[8px]">
                  {isGambling ? (
                    <>🎉 <strong>揭曉方式：</strong>性別揭曉後，系統結算並由莊家一對一派發好禮。</>
                  ) : (
                    <>🎉 <strong>公布方式：</strong>性別揭曉後，由爸媽另行通知或於社群公布。</>
                  )}
                </div>
                <div className="bg-white/15 border border-white/20 rounded-[18px] px-4 py-3.5 leading-[1.75] backdrop-blur-[8px]">
                  {isGambling ? (
                    <>💝 <strong>派彩內容：</strong>豪華超商禮券、香醇咖啡大杯兌換券等大獎。</>
                  ) : (
                    <>💝 <strong>禮物內容：</strong>可自訂為超商禮券、咖啡券、小甜點、可愛小物等。</>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
          </>
        )}

      </main>

      {!showOnlyReveal && (
        <footer className="py-[30px] pb-[42px] w-[min(1180px,calc(100%-32px))] mx-auto relative z-10">
          <div className="border shadow-[var(--shadow-custom)] rounded-[28px] p-6 text-center" style={{ background: 'var(--color-glass-bg)', borderColor: 'var(--color-glass-border)', borderWidth: '1px' }}>
            <h3 className="text-2xl text-[var(--color-primary-dark)] mb-2.5 font-bold">
              {isGambling ? "👑 皇家娛樂城與您共度溫馨時刻 🍼" : "謝謝你參與我們的小活動 🍼"}
            </h3>
            <p className="text-[var(--color-muted)] leading-[1.85] mb-3.5 font-medium">
              {isGambling 
                ? "每一筆無息免費下注、每一聲至誠至真的祝福，都是我們最珍貴的寶藏。讓我們一同守候這最美的驚喜 💜"
                : "每一份猜測、每一句祝福，對我們來說都是很珍貴的心意。一起期待寶寶正式揭曉的那一天吧 💜"
              }
            </p>
            <div className="text-[var(--color-muted)] text-[13px] font-mono">
              {isGambling 
                ? "Baby Gender Guess Casino Platform ・ Powered by Venice Royal & AI Studio & Firebase Admin" 
                : "Baby Gender Guess ・ Powered by AI Studio & Firebase"
              }
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
