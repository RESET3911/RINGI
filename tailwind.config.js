/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 和紙・墨・朱 palette
        paper: {
          DEFAULT: '#f6f1e7',   // 生成り
          deep: '#ede5d3',      // 濃い生成り
          card: '#fffdf8',      // カード面
        },
        ink: {
          DEFAULT: '#2a251d',   // 墨
          soft: '#6b6355',      // 薄墨
          faint: '#a89e8c',     // 淡墨
          line: '#e0d6c2',      // 罫線
        },
        shu: {
          DEFAULT: '#c73e2c',   // 朱（メインアクセント）
          deep: '#a5301f',
          pale: '#faeae6',
        },
        matsu: {
          DEFAULT: '#3d7357',   // 松葉（承認・完了）
          pale: '#e9f2ec',
        },
        ai: {
          DEFAULT: '#39587a',   // 藍（要相談・情報）
          pale: '#e9eef5',
        },
        karashi: {
          DEFAULT: '#a97e22',   // 芥子（条件付き・警戒）
          pale: '#f7efdc',
        },
        nezu: {
          DEFAULT: '#8a8578',   // 鼠（保留・取消）
          pale: '#efede6',
        },
      },
      fontFamily: {
        mincho: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', 'serif'],
        gothic: ['"Zen Kaku Gothic New"', '"Hiragino Kaku Gothic ProN"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,37,29,0.06), 0 4px 16px rgba(42,37,29,0.05)',
        float: '0 8px 30px rgba(42,37,29,0.16)',
      },
      keyframes: {
        'stamp-in': {
          '0%':   { opacity: '0', transform: 'scale(2.2) rotate(-14deg)' },
          '55%':  { opacity: '1', transform: 'scale(0.92) rotate(-8deg)' },
          '75%':  { transform: 'scale(1.06) rotate(-8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-8deg)' },
        },
        'rise-in': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translate(-50%, 12px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'stamp-in': 'stamp-in .5s cubic-bezier(.2,1.4,.4,1) both',
        'rise-in': 'rise-in .45s cubic-bezier(.2,.8,.3,1) both',
        'sheet-up': 'sheet-up .32s cubic-bezier(.2,.9,.3,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        'toast-in': 'toast-in .3s cubic-bezier(.2,.9,.3,1) both',
      },
    },
  },
  plugins: [],
}
