export interface Theme {
  id: string;
  name: string;
  emoji: string;
  colors: {
    '--color-primary': string;
    '--color-primary-dark': string;
    '--color-secondary': string;
    '--color-pink': string;
    '--color-blue': string;
    '--color-text': string;
    '--color-muted': string;
    '--color-bg1': string;
    '--color-bg2': string;
    '--color-bg3': string;
    '--color-glass-bg'?: string;
    '--color-glass-border'?: string;
    '--color-card-grad'?: string;
    '--color-glow-1'?: string;
    '--color-glow-2'?: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'lavender',
    name: '薰衣草夢境',
    emoji: '🪻',
    colors: {
      '--color-primary': '#8c6fe8',
      '--color-primary-dark': '#6d50cf',
      '--color-secondary': '#cdbbff',
      '--color-pink': '#ffc8e7',
      '--color-blue': '#cfe7ff',
      '--color-text': '#4f4274',
      '--color-muted': '#7f72a4',
      '--color-bg1': '#faf7ff',
      '--color-bg2': '#f2ebff',
      '--color-bg3': '#ede4ff',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.85)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.72), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'casino-gold',
    name: '皇家威尼斯娛樂城 👑 (熱門賭神版)',
    emoji: '🎰',
    colors: {
      '--color-primary': '#ffd700',
      '--color-primary-dark': '#ffaa00',
      '--color-secondary': '#ff3366',
      '--color-pink': '#ff3366',
      '--color-blue': '#00f0ff',
      '--color-text': '#f3f4f6',
      '--color-muted': '#94a3b8',
      '--color-bg1': '#090a0f',
      '--color-bg2': '#121420',
      '--color-bg3': '#0a0b12',
      '--color-glass-bg': 'rgba(18, 20, 32, 0.85)',
      '--color-glass-border': 'rgba(255, 215, 0, 0.35)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0) 35%), linear-gradient(135deg, rgba(26, 29, 46, 0.95), rgba(15, 17, 28, 0.95))',
      '--color-glow-1': 'rgba(255, 215, 0, 0.2)',
      '--color-glow-2': 'rgba(255, 51, 102, 0.25)',
    },
  },
  {
    id: 'casino-sport',
    name: '威博線上體育下注網 ⚽',
    emoji: '📈',
    colors: {
      '--color-primary': '#39ff14',
      '--color-primary-dark': '#1bc402',
      '--color-secondary': '#00f0ff',
      '--color-pink': '#ff007f',
      '--color-blue': '#00f0ff',
      '--color-text': '#f8fafc',
      '--color-muted': '#cbd5e1',
      '--color-bg1': '#0b0f19',
      '--color-bg2': '#111827',
      '--color-bg3': '#070a10',
      '--color-glass-bg': 'rgba(15, 23, 42, 0.9)',
      '--color-glass-border': 'rgba(57, 255, 20, 0.25)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(57, 255, 20, 0.12), rgba(0, 0, 0, 0) 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(9, 13, 22, 0.98))',
      '--color-glow-1': 'rgba(57, 255, 20, 0.15)',
      '--color-glow-2': 'rgba(0, 240, 255, 0.15)',
    },
  },
  {
    id: 'peach-mint',
    name: '蜜桃薄荷',
    emoji: '🍑',
    colors: {
      '--color-primary': '#ff8e7a',
      '--color-primary-dark': '#e06550',
      '--color-secondary': '#ffc0b5',
      '--color-pink': '#ffd8d0',
      '--color-blue': '#bcebe5',
      '--color-text': '#5c433f',
      '--color-muted': '#8f716c',
      '--color-bg1': '#fffbf9',
      '--color-bg2': '#fff0eb',
      '--color-bg3': '#f7e3db',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.85)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.72), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'macaron',
    name: '雲朵馬卡龍',
    emoji: '🧁',
    colors: {
      '--color-primary': '#f0a500',
      '--color-primary-dark': '#cf8300',
      '--color-secondary': '#ffdd93',
      '--color-pink': '#ffc4d6',
      '--color-blue': '#a3e4db',
      '--color-text': '#4a3c31',
      '--color-muted': '#7a6a5d',
      '--color-bg1': '#fffdf9',
      '--color-bg2': '#fff6e5',
      '--color-bg3': '#ffebd3',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.85)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.72), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'sakura',
    name: '櫻花粉藍',
    emoji: '🌸',
    colors: {
      '--color-primary': '#ff7597',
      '--color-primary-dark': '#d64c70',
      '--color-secondary': '#ffb3c6',
      '--color-pink': '#ffe5ec',
      '--color-blue': '#c5ece9',
      '--color-text': '#5c3d46',
      '--color-muted': '#8f6d76',
      '--color-bg1': '#fffcfd',
      '--color-bg2': '#fff0f3',
      '--color-bg3': '#ffe5ec',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.85)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.72), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'forest',
    name: '森林泡泡',
    emoji: '🧼',
    colors: {
      '--color-primary': '#6096ba',
      '--color-primary-dark': '#274c77',
      '--color-secondary': '#a3cef1',
      '--color-pink': '#eddcd2',
      '--color-blue': '#e9ecef',
      '--color-text': '#2d3a44',
      '--color-muted': '#5c6b73',
      '--color-bg1': '#f8f9fa',
      '--color-bg2': '#e9ecef',
      '--color-bg3': '#dee2e6',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.85)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.72), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'milktea',
    name: '溫馨暖雅奶茶 🧋',
    emoji: '🧋',
    colors: {
      '--color-primary': '#b08e72',
      '--color-primary-dark': '#7d5c43',
      '--color-secondary': '#eedac5',
      '--color-pink': '#f3e5d8',
      '--color-blue': '#d8e5e3',
      '--color-text': '#524339',
      '--color-muted': '#847366',
      '--color-bg1': '#fdfaf7',
      '--color-bg2': '#f6ede4',
      '--color-bg3': '#eae0d2',
      '--color-glass-bg': 'rgba(255, 255, 255, 0.72)',
      '--color-glass-border': 'rgba(255, 255, 255, 0.88)',
      '--color-card-grad': 'radial-gradient(circle at top right, rgba(255,255,255,0.75), rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))',
      '--color-glow-1': 'rgba(255, 255, 255, 0.95)',
      '--color-glow-2': 'rgba(255, 255, 255, 0.85)',
    },
  },
];

