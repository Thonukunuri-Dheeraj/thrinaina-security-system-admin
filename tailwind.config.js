/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        security: {
          bg: '#101830',        // Deep CCTV Monitor Navy (same to website)
          card: '#0f1629',      // Rich Navy Surface
          cardAlt: '#141b32',   // Elevated Card Surface
          blue: '#1a3370',      // Royal Navy Blue
          lightBlue: '#4A90E2', // Premium Tech Blue
          gold: '#4a90e2',      // Keep light blue as primary accent color for active items!
          goldHover: '#357abd', // Saturated blue hover
          textGray: '#a0aec0',  // Warm Silver Gray
          goldLight: 'rgba(74, 144, 226, 0.08)',
          border: '#1c2540',    // Subtle Navy Border
          accent: '#2a3f6f',    // Accent Navy
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px rgba(74, 144, 226, 0.2), 0 0 50px rgba(74, 144, 226, 0.1)',
        'blue-glow': '0 0 25px rgba(74, 144, 226, 0.12), 0 0 50px rgba(74, 144, 226, 0.06)',
        'card-glow': '0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 10px rgba(0, 0, 0, 0.25)',
        'premium': '0 20px 60px rgba(0, 0, 0, 0.35), 0 4px 20px rgba(0, 0, 0, 0.18)',
      }
    },
  },
  plugins: [],
}
