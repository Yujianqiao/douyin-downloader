/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 抖音品牌色
        douyin: {
          red: '#FE2C55',
          'red-hover': '#E62648',
          'red-light': '#FF4D6D',
        },
        // 文字颜色
        text: {
          primary: '#161823',
          secondary: '#666666',
          tertiary: '#999999',
        },
        // 背景颜色
        bg: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#FAFAFA',
        },
      },
      borderRadius: {
        'douyin': '8px',
        'douyin-sm': '6px',
      },
    },
  },
  plugins: [],
}
