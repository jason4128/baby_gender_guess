import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StorybookProps {
  onComplete: () => void;
}

export default function Storybook({ onComplete }: StorybookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 9; // 0 to 8

  const images = Array.from({ length: totalPages }, (_, i) => `/storybook/${i}.png`);

  useEffect(() => {
    // Preload all images to prevent sluggish page turns
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F3E8DC]">
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
            {currentPage === totalPages - 1 ? "點擊進入網站" : "點擊畫面翻頁"}
          </div>
        </div>

        {/* Skip button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="absolute top-6 right-6 text-[#8C6F53] hover:text-[#5c4733] hover:bg-white/80 text-sm font-bold z-20 px-4 py-2 rounded-full bg-white/50 border border-[#8C6F53]/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          {currentPage === totalPages - 1 ? '進入網站' : '跳過'}
        </button>

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
    </div>
  );
}
