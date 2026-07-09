/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12172B',
        inkSoft: '#1B2140',
        parchment: '#F7F2E7',
        parchmentDim: '#EDE5D3',
        brass: '#C89B3C',
        brassSoft: '#E4C77A',
        coral: '#E2725B',
        sage: '#6B8F71',
        inkText: '#2A2A28',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
