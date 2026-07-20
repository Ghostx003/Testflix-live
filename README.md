<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/play-square.svg" alt="TestFlix Logo" width="100" />
  
  # TestFlix
  
  **The ultimate modern dashboard to organize, analyze, and master your tests.**
  
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## ✨ Overview

TestFlix is a blazing-fast, locally-stored web application built for students and educators to meticulously track mock exams, practice tests, and daily quizzes. Built with an incredibly sleek, glassmorphism-inspired UI, TestFlix makes analyzing your past mistakes beautiful and intuitive.

Instead of hunting through messy spreadsheets, TestFlix allows you to visually tag tests, review specific questions by their status (e.g., Correct, Incorrect, Left Out), and pinpoint exactly where you need to improve.

## 🚀 Features

- 🎨 **Stunning UI/UX:** A gorgeous dark mode featuring glassmorphism, dynamic gradients, and silky smooth micro-animations.
- 🏷️ **Advanced Tagging System:** Tag entire tests (e.g., `#weekly`, `#mock`) or tag individual questions with custom colors to quickly find tricky concepts.
- 📊 **Intelligent Filtering:** Filter your test questions by Tags or Status, and instantly jump to a "Matching Questions" summary at the bottom of your dashboard.
- 📐 **Math & Physics Ready:** Seamless integration with KaTeX for rendering complex mathematical equations and formulas flawlessly.
- ⚡ **Offline & Lightning Fast:** Powered by IndexedDB (via Dexie), your data is stored locally in your browser for zero-latency loading times.
- 📱 **Fully Responsive:** Works beautifully whether you're reviewing on a 4K monitor or your smartphone.

## 🛠 Tech Stack

TestFlix is built using modern, bleeding-edge web technologies:

- **Framework:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom tokens for deep dark themes and neon accents.
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Math Rendering:** [KaTeX](https://katex.org/)

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm (or pnpm/yarn) installed on your machine.

### Installation

1. **Clone the repo**
   ```sh
   git clone https://github.com/Ghostx003/Testflix-live.git
   ```
2. **Install dependencies**
   ```sh
   cd Testflix-live
   npm install
   ```
3. **Run the development server**
   ```sh
   npm run dev
   ```
4. **Open in Browser**
   Navigate to `http://localhost:5173` to see the app in action!

## 📦 Building for Production

To generate an optimized production build:

```sh
npm run build
```

The output will be perfectly optimized and placed in the `/dist` directory, ready to be deployed to Vercel, Netlify, or any static hosting service.

## 💡 How to Use

1. **Create Tags & Statuses:** Head over to the Settings page to configure your custom tags, choose their colors, and set up your question statuses.
2. **Add Tests:** Load your tests into the dashboard.
3. **Analyze:** Open a test, tag tricky questions, mark them as incorrect if you missed them, and use the powerful filter dropdowns to instantly review your weak spots before the big day.

---

<div align="center">
  <i>Built with ❤️ for modern learners.</i>
</div>
