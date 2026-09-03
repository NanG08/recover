module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'bg-base':    '#FFFFFF',
        'bg-surface': '#F7F7F5',
        'bg-hover':   '#EEEEEB',
        'border':     '#DEDED8',
        'text-primary':   '#111111',
        'text-secondary': '#6D6D66',
        'accent-ice': '#111111',
        'success':    '#2F7D57',
        'error':      '#B84A42',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', '"Geist"', 'sans-serif'],
        ui: ['"Geist"', '"Inter"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      boxShadow: {
        'ice-glow': '0 0 8px rgba(56, 189, 248, 0.03)',
      },
    },
  },
  plugins: [],
}
