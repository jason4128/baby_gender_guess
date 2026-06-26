import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StorybookProps {
  onComplete: () => void;
}

export default function Storybook({ onComplete }: StorybookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 12; // 0 to 11

  // State flow: 'reading' | 'showEnvelope' | 'showInvitation'
  const [storyState, setStoryState] = useState<'reading' | 'showEnvelope' | 'showInvitation'>('reading');
  const [countdown, setCountdown] = useState(5);
  const [flash, setFlash] = useState(false);

  const images = Array.from({ length: totalPages }, (_, i) => `${(import.meta as any).env.BASE_URL}storybook/${i}.png`);

  useEffect(() => {
    // Preload all images to prevent sluggish page turns
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    // Preload envelope and invitation images
    [`${(import.meta as any).env.BASE_URL}letter.png`, `${(import.meta as any).env.BASE_URL}letter2.png`].forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Handle invitation countdown
  useEffect(() => {
    if (storyState === 'showInvitation') {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setFlash(true);
            setTimeout(() => {
              onComplete();
            }, 800); // peak of the white flash
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [storyState, onComplete]);

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      setStoryState('showEnvelope');
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F3E8DC] select-none">
      
      {/* 1. Main Reading Stage */}
      {storyState === 'reading' && (
        <div className="relative w-full h-full overflow-hidden flex flex-col justify-center items-center bg-[#F3E8DC]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full h-full flex items-center justify-center absolute inset-0 cursor-pointer"
              onClick={handleNext}
            >
              <img 
                src={images[currentPage]} 
                alt={`Story page ${currentPage}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Indicators */}
          <div className="absolute bottom-6 left-0 w-full flex flex-col justify-center items-center z-10 pointer-events-none">
            <div className="flex space-x-2 mb-4">
              {images.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentPage ? 'w-6 bg-[#8C6F53] shadow-[0_0_8px_rgba(140,111,83,0.4)]' : 'w-1.5 bg-[#8C6F53]/30'}`}
                />
              ))}
            </div>
            <div className="text-[#8C6F53]/80 text-xs font-bold tracking-widest animate-pulse drop-shadow-sm">
              {currentPage === totalPages - 1 ? "點擊打開神秘驚喜" : "點擊畫面翻頁"}
            </div>
          </div>

          {/* Previous area (invisible) for clicking back */}
          {currentPage > 0 && (
            <div 
              className="absolute left-0 top-0 w-1/4 h-full z-10 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            />
          )}
          
          {/* Next area hint (invisible) */}
          <div 
              className="absolute right-0 top-0 w-3/4 h-full z-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
          />
        </div>
      )}

      {/* 2. Interactive Envelope & Invitation Layers */}
      {storyState !== 'reading' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[50] flex flex-col items-center justify-center p-6 text-center">
          
          <AnimatePresence mode="wait">
            {storyState === 'showEnvelope' && (
              <motion.div
                key="envelope-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center"
              >
                <h2 className="text-2xl sm:text-4xl font-black text-amber-200 tracking-wider mb-8 drop-shadow-[0_4px_12px_rgba(251,191,36,0.2)] animate-pulse">
                  ✉️ 收到一封神秘信件...
                </h2>
                
                <motion.div
                  initial={{ scale: 0.8, y: 50, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    y: [0, -12, 0], 
                    opacity: 1 
                  }}
                  transition={{ 
                    scale: { duration: 0.5, ease: "easeOut" },
                    y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStoryState('showInvitation')}
                  className="max-w-[320px] sm:max-w-[420px] cursor-pointer drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:drop-shadow-[0_20px_60px_rgba(251,191,36,0.3)] transition-all duration-300"
                >
                  <img 
                    src={`${(import.meta as any).env.BASE_URL}letter.png`} 
                    alt="Mysterious Envelope"
                    className="w-full object-contain rounded-2xl border border-amber-500/20"
                  />
                </motion.div>

                <div className="mt-8 text-amber-300 text-base sm:text-lg font-black tracking-widest animate-pulse flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-6 py-2.5 rounded-full">
                  <span>✨</span>
                  <span>點擊打開神秘信封</span>
                  <span>✨</span>
                </div>
              </motion.div>
            )}

            {storyState === 'showInvitation' && (
              <motion.div
                key="invitation-stage"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center relative w-full h-full max-w-4xl"
              >
                {/* Upper Countdown Indicator */}
                <div className="mb-6 text-white text-sm sm:text-base font-extrabold flex items-center gap-2.5 bg-black/50 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
                  <span className="animate-spin text-amber-400">🎰</span>
                  <span>澱粉寶寶皇家娛樂城即將開門...</span>
                  <span className="text-yellow-400 text-2xl sm:text-3xl font-black font-mono w-8 text-center animate-bounce">{countdown}</span>
                  <span>秒</span>
                </div>

                {/* Main Invitation Image */}
                <div className="max-w-[90vw] max-h-[68vh] flex items-center justify-center drop-shadow-[0_25px_60px_rgba(0,0,0,0.7)]">
                  <img 
                    src={`${(import.meta as any).env.BASE_URL}letter2.png`} 
                    alt="Invitation Letter"
                    className="max-w-full max-h-[60vh] object-contain rounded-2xl border border-white/20"
                  />
                </div>

                <p className="mt-6 text-gray-400 text-xs font-bold tracking-widest animate-pulse">
                  五秒後自動啟動皇家星空傳送儀式 🪐
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Skip button for early exits */}
      {storyState === 'reading' && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setStoryState('showEnvelope');
          }}
          className="absolute top-6 right-6 text-[#8C6F53] hover:text-[#5c4733] hover:bg-white/80 text-sm font-bold z-[60] px-4 py-2 rounded-full bg-white/50 border border-[#8C6F53]/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          跳過
        </button>
      )}

      {/* Screen flash transition */}
      <AnimatePresence>
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeIn" }}
            className="fixed inset-0 z-[1000] bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

    </div>
  );
}
