module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#080809',
        'bg-surface': '#0F1012',
        'bg-hover': '#16181D',
        'border': '#1F222B',
        'text-primary': '#F3F4F6',
        'text-secondary': '#71717A',
        'accent-ice': '#38BDF8',
        'success': '#34D399',
        'error': '#F87171',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', '"Geist"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      boxShadow: {
        'ice-glow': '0 0 8px rgba(56, 189, 248, 0.03)',
      },
      backgroundImage: {
        noise: "url('/noise.png')",
      },
    },
  },
  plugins: [],
}
