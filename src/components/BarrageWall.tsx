import React, { useState, useEffect } from "react";
import { Guess } from "../types";

interface BarrageWallProps {
  guesses: Guess[];
}

export const BarrageWall: React.FC<BarrageWallProps> = ({ guesses }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Casino/Baby themed high-quality preset guesses to keep the wall lively if database entries are limited
  const presetGuesses: Guess[] = [
    {
      name: "莊家豪氣",
      gender: "男寶",
      wish: "祝寶寶平安喜樂，星光閃耀！✨",
      createdAt: null,
      contact: "",
    },
    {
      name: "幸運觀展人",
      gender: "女寶",
      wish: "期待美麗溫馨的小公主降臨！🍼💖",
      createdAt: null,
      contact: "",
    },
    {
      name: "隔壁桌叔叔",
      gender: "男寶",
      wish: "長大跟爸爸一樣帥氣又聰明！🎲💙",
      createdAt: null,
      contact: "",
    },
    {
      name: "大堂經理",
      gender: "女寶",
      wish: "押中大獎！祝小寶貝幸福健康每一天 🌸",
      createdAt: null,
      contact: "",
    },
    {
      name: "澱粉頭號粉絲",
      gender: "男寶",
      wish: "皇家殿堂熱烈歡迎！健康強壯長大 🍼",
      createdAt: null,
      contact: "",
    },
    {
      name: "幸運女神",
      gender: "女寶",
      wish: "千金報喜！福氣滿滿、天天開心 ⭐",
      createdAt: null,
      contact: "",
    },
    {
      name: "荷官阿傑",
      gender: "男寶",
      wish: "買定離手！期待小帥哥跟我們一起玩 🃏",
      createdAt: null,
      contact: "",
    },
    {
      name: "金牌VIP",
      gender: "女寶",
      wish: "超級幸運星！祝寶寶無憂無慮長大 🎉",
      createdAt: null,
      contact: "",
    },
  ];

  // Combine real database guesses with fallback presets to ensure nice density
  const displayItems = [...guesses, ...presetGuesses];

  // Distribute items into 3 tracks randomly or sequentially
  const track1 = displayItems.filter((_, idx) => idx % 3 === 0);
  const track2 = displayItems.filter((_, idx) => idx % 3 === 1);
  const track3 = displayItems.filter((_, idx) => idx % 3 === 2);

  // Duplicate items in each track to achieve seamless loop scrolling
  const renderTrackItems = (items: Guess[]) => {
    const doubleItems = [...items, ...items, ...items]; // triple to guarantee coverage across wide screens
    return doubleItems.map((item, index) => {
      const isBoy = item.gender === "男寶";
      return (
        <div
          key={`${item.name}-${index}`}
          className={`inline-flex items-center gap-2 px-4 py-2 mx-3 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md transition-all pointer-events-auto hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${
            isBoy
              ? "bg-sky-950/70 border-sky-400/40 text-sky-200 shadow-[0_2px_10px_rgba(14,165,233,0.2)]"
              : "bg-pink-950/70 border-pink-400/40 text-pink-200 shadow-[0_2px_10px_rgba(244,63,94,0.2)]"
          }`}
        >
          <span className="text-sm">{isBoy ? "💙" : "💖"}</span>
          <span className="text-[var(--color-primary-light)] font-black">
            {item.name}
          </span>
          <span className="opacity-75">押{item.gender}</span>
          <span className="text-white/40">|</span>
          <span className="text-white/95 font-medium">
            "{item.wish || "祝寶寶健康平安"}"
          </span>
        </div>
      );
    });
  };

  return (
    <>
      {/* Barrage Wall Tracks Layer */}
      <div className="relative w-[min(1180px,calc(100%-32px))] mx-auto h-[155px] sm:h-[185px] pointer-events-none z-30 overflow-hidden select-none flex flex-col justify-between py-2 sm:py-3.5 rounded-[28px] border border-[var(--color-glass-border)] shadow-[var(--shadow-custom)] bg-slate-950/20 backdrop-blur-md mb-8">
          <style>{`
            @keyframes barrageScroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-33.3333%);
              }
            }
            .barrage-track-1 {
              animation: barrageScroll 25s linear infinite;
            }
            .barrage-track-2 {
              animation: barrageScroll 35s linear infinite;
            }
            .barrage-track-3 {
              animation: barrageScroll 28s linear infinite;
            }
            .barrage-track:hover .barrage-scroller {
              animation-play-state: paused;
            }
          `}</style>

          {/* Track 1 */}
          <div className="barrage-track overflow-hidden whitespace-nowrap flex items-center h-10 w-max">
            <div className="barrage-scroller barrage-track-1 whitespace-nowrap flex">
              {renderTrackItems(track1)}
            </div>
          </div>

          {/* Track 2 */}
          <div className="barrage-track overflow-hidden whitespace-nowrap flex items-center h-10 w-max">
            <div className="barrage-scroller barrage-track-2 whitespace-nowrap flex">
              {renderTrackItems(track2)}
            </div>
          </div>

          {/* Track 3 */}
          <div className="barrage-track overflow-hidden whitespace-nowrap flex items-center h-10 w-max">
            <div className="barrage-scroller barrage-track-3 whitespace-nowrap flex">
              {renderTrackItems(track3)}
            </div>
          </div>
        </div>
    </>
  );
};
