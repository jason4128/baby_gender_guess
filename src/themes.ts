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
    },
  },
];
