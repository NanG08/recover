module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#ffffff',
        'bg-surface': '#f7f7f5',
        'bg-hover': '#eeeeeb',
        'border': '#deded8',
        'text-primary': '#111111',
        'text-secondary': '#6d6d66',
        'accent-ice': '#111111',
        'success': '#2f7d57',
        'error': '#b84a42',
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
