import React, { useEffect, useState } from "react";

interface ConfettiItem {
  id: number;
  left: number; // percentage
  color: string;
  delay: number; // seconds
  duration: number; // seconds
  size: number; // px
  shape: "rect" | "circle" | "triangle";
  drift: number; // px drift left/right
}

interface CelebrationBallProps {
  isOpen: boolean;
}

export const CelebrationBall: React.FC<CelebrationBallProps> = ({ isOpen }) => {
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Generate 60 beautiful random confetti particles
      const colors = [
        "#ff4081",
        "#00e5ff",
        "#ffeb3b",
        "#4caf50",
        "#9c27b0",
        "#ff9800",
        "#e91e63",
        "#00decb",
        "#ff5722",
        "#3f51b5",
      ];
      const shapes: ("rect" | "circle" | "triangle")[] = [
        "rect",
        "circle",
        "triangle",
      ];

      const newConfetti = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: 45 + Math.random() * 10, // tightly clustered around center top (45% - 55%)
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1.5,
        duration: 3 + Math.random() * 3,
        size: 8 + Math.random() * 12,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        drift: -150 + Math.random() * 300, // drift left or right by up to 150px
      }));
      setConfetti(newConfetti);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 pointer-events-none z-50 overflow-visible select-none h-screen flex flex-col items-center transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Styles Injection for Custom Animations */}
      <style>{`
        @keyframes swingLeft {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(115deg); }
        }
        @keyframes swingRight {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-115deg); }
        }
        @keyframes bannerUnroll {
          0% { transform: scaleY(0); opacity: 0; }
          40% { transform: scaleY(1.1); opacity: 1; }
          70% { transform: scaleY(0.95); }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(120px) rotate(0deg) translateX(0px);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) translateX(var(--drift));
            opacity: 0;
          }
        }
        @keyframes ropeWobble {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(2deg); }
        }
        .animate-swing-left {
          animation: swingLeft 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transform-origin: top right;
        }
        .animate-swing-right {
          animation: swingRight 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transform-origin: top left;
        }
        .animate-banner-unroll {
          animation: bannerUnroll 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
          transform-origin: top center;
        }
        .animate-confetti {
          animation: confettiFall var(--duration) linear var(--delay) infinite;
        }
        
        .hanging-rope {
          height: 280px;
        }
        .ball-scale {
          transform: scale(1);
          transform-origin: top center;
        }
        
        @media (max-width: 640px) {
          .hanging-rope {
            height: 180px;
          }
          .ball-scale {
            transform: scale(0.85);
          }
        }

        @media (max-height: 550px) and (orientation: landscape) {
          .hanging-rope {
            height: 40px !important;
          }
          .ball-scale {
            transform: scale(0.5) !important;
          }
        }
      `}</style>

      {/* Hanging rope */}
      <div
        className="w-[3px] bg-red-600/80 shadow-[0_2px_10px_rgba(0,0,0,0.15)] origin-top hanging-rope"
        style={{
          animation: "ropeWobble 4s ease-in-out infinite",
        }}
      />

      {/* The Decorative Ball Container */}
      <div className="relative -mt-1 w-0 h-0 flex items-center justify-center ball-scale">
        {/* Confetti particles spraying from the center */}
        {confetti.map((item) => (
          <div
            key={item.id}
            className="absolute animate-confetti"
            style={
              {
                "--duration": `${item.duration}s`,
                "--delay": `${item.delay}s`,
                "--drift": `${item.drift}px`,
                left: `${item.left - 50}vw`, // center offset
                top: "0px",
                backgroundColor:
                  item.shape !== "triangle" ? item.color : "transparent",
                borderColor:
                  item.shape === "triangle"
                    ? `transparent transparent ${item.color} transparent`
                    : "transparent",
                borderWidth:
                  item.shape === "triangle"
                    ? `0 ${item.size / 2}px ${item.size}px ${item.size / 2}px`
                    : "0",
                width: item.shape !== "triangle" ? `${item.size}px` : "0",
                height:
                  item.shape !== "triangle"
                    ? item.shape === "rect"
                      ? `${item.size * 1.5}px`
                      : `${item.size}px`
                    : "0",
                borderRadius: item.shape === "circle" ? "50%" : "0",
                opacity: 0,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Dropping Banner */}
        <div
          className="absolute top-[20px] z-10 w-[140px] sm:w-[180px] py-4 px-2 sm:px-3 text-center rounded-2xl bg-gradient-to-b from-red-500 to-red-600 border-2 border-yellow-300 shadow-[0_20px_40px_rgba(220,38,38,0.4)] animate-banner-unroll"
          style={{ opacity: 0 }}
        >
          {/* Top Golden Accent tassel */}
          <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-5 h-2.5 bg-yellow-400 rounded-b-md" />

          <div className="text-yellow-300 text-xs font-black tracking-widest mb-1">
            🎁 恭喜得獎 🎁
          </div>
          <div className="text-white text-base sm:text-lg font-black leading-tight tracking-wider break-all drop-shadow-md">
            中獎特等獎
            <br />
            好運降臨！✨
          </div>

          {/* Ribbon Tail decorations */}
          <div className="absolute left-4 -bottom-4 w-4 h-6 bg-red-600 border-b-2 border-r-2 border-yellow-300/40 rounded-b-sm transform skew-y-12" />
          <div className="absolute right-4 -bottom-4 w-4 h-6 bg-red-600 border-b-2 border-l-2 border-yellow-300/40 rounded-b-sm transform -skew-y-12" />
        </div>

        {/* Left half of the ball */}
        <div
          className="absolute right-0 top-[-60px] w-[75px] h-[130px] rounded-l-full bg-gradient-to-r from-red-600 to-red-500 border-y-4 border-l-4 border-yellow-400 shadow-[inset_-4px_0_12px_rgba(255,255,255,0.25)] flex items-center justify-end pr-1 z-20 animate-swing-left"
          style={{
            boxShadow:
              "-8px 12px 24px rgba(0,0,0,0.25), inset -2px 0 8px rgba(255,220,100,0.5)",
          }}
        >
          {/* Golden flower pattern */}
          <div className="w-8 h-8 rounded-full border-2 border-yellow-300 bg-yellow-400/20 mr-1 opacity-80" />
        </div>

        {/* Right half of the ball */}
        <div
          className="absolute left-0 top-[-60px] w-[75px] h-[130px] rounded-r-full bg-gradient-to-l from-red-600 to-red-500 border-y-4 border-r-4 border-yellow-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.25)] flex items-center justify-start pl-1 z-20 animate-swing-right"
          style={{
            boxShadow:
              "8px 12px 24px rgba(0,0,0,0.25), inset 2px 0 8px rgba(255,220,100,0.5)",
          }}
        >
          {/* Golden flower pattern */}
          <div className="w-8 h-8 rounded-full border-2 border-yellow-300 bg-yellow-400/20 ml-1 opacity-80" />
        </div>

        {/* Center tassel strings */}
        <div className="absolute top-[50px] w-2 h-16 bg-yellow-400/90 rounded-full animate-pulse shadow-sm z-0" />
      </div>
    </div>
  );
};
