/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FDF6EC',
        paperCard: '#FFFFFF',
        ink: '#22252B',
        inkSoft: '#5B5E66',
        coral: '#FF6B5B',
        teal: '#1FAF9E',
        sun: '#FFC93C',
        grape: '#8B5FBF',
        mint: '#22C48D',
        sky: '#3FA7D6',
        rose: '#F4436C',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
