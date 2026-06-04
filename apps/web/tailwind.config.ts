// Design Ref: Design_System/colors_and_type.css — JNJ SCORE 모노크롬 토큰 이식 (apps/admin 과 동일)
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#111111',
        white: '#FFFFFF',
        grey: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#CACACB',
          400: '#9E9EA0',
          500: '#707072',
          600: '#4B4B4D',
          700: '#39393B',
          800: '#28282A',
          900: '#1F1F21',
        },
        success: '#007D48',
        danger: '#D30005',
        info: '#1151FF',
        live: '#FF5000',
        background: '#FFFFFF',
        foreground: '#111111',
        muted: '#F5F5F5',
        'muted-foreground': '#707072',
        border: '#CACACB',
        primary: '#111111',
        'primary-foreground': '#FFFFFF',
        destructive: '#D30005',
      },
      fontFamily: {
        display: ['Oswald', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        lg: '20px',
        xl: '24px',
        pill: '30px',
      },
      boxShadow: {
        divider: '0px -1px 0px 0px #E5E5E5 inset',
        focus: '0 0 0 2px rgba(39, 93, 197, 1)',
      },
      transitionTimingFunction: {
        jnj: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
