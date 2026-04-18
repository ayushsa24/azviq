<div align="center">
  
# 🚀 Avyx (formerly Ascend)
**The Ultimate AI-Powered Productivity & Study Companion**

![Avyx Banner](public/logo-dark.png)

*Avyx is a next-generation platform designed to seamlessly fuse task management, interactive studying, comprehensive note-taking, and advanced AI assistance into a single, unified workspace.*

</div>

---

## 🌟 Overview

Avyx is built to optimize how users learn, work, and organize. It provides an intelligent ecosystem featuring context-aware AI chat, algorithmic spaced repetition for studying, rich collaborative note-editing, and parental control features to ensure a safe and productive environment. 

This repository contains the complete frontend and backend logic, built primarily with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and backed by **Supabase**.

---

## ✨ Core Features

### 1. 🤖 Advanced AI Ecosystem
- **Multi-Model Support:** Priority routing via Google Gemini (3.1 Pro/Flash) with seamless fallback to local/custom models via Ollama.
- **Vision Integration:** Upload images directly to the AI for analysis, OCR, and contextual assistance.
- **Speech-to-Text:** Built-in microphone support utilizing standard Web Speech APIs.
- **Web Search Tools:** AI agents can dynamically query the web to provide real-time, accurate responses.
- **Persistent Sessions:** Chat history is fully preserved, searchable, and manageable (Pin, Archive, Delete).

### 2. 📚 Library & Rich Text Note Editor
- **Tiptap Enhanced Editor:** A deeply customized rich-text editor with slash commands, coloring, highlighting, code-blocks (with syntax highlighting), and task lists.
- **AI Co-Writer:** Generate, summarize, continue writing, or rephrase text directly within the editor.
- **PDF Annotation Engine:** Fully featured PDF reader with text highlighting, drawing tools, undo/redo stacks, and PDF generation tools (via `jspdf` and `react-pdf`).
- **Real-Time Collaboration & Sharing:** Share notes with granular permissions (Read/Edit). View real-time active users and imported clones with the new unified `ImportersModal`.

### 3. 🧠 Preparation & Study Module
- **AI-Generated Exercises:** Automatically generate flashcards, quizzes, and structured exercises from your notes or topics.
- **Spaced Repetition:** Smart "Revision" algorithms track your retention score, adjusting review intervals using advanced Leitner system logic.
- **Study Consistency Tracking:** Visual heatmaps and progress charts tracking daily study streaks and completed tasks.

### 4. 🗂 Dashboard & Task Management
- **Smart Timeline:** Visualize your day with "Today's Tasks", upcoming deadlines, and AI-curated suggestions.
- **Kanban-style Boards:** Manage projects and standalone tasks with AI breakdown capabilities (breaking large projects into actionable sub-tasks).
- **Swipe-to-Complete Interactions:** Premium gesture-based UX for managing checklists directly from the dashboard.

### 5. 🛡️ Enterprise-Grade Security & Controls
- **Parental Controls:** Dedicated settings to monitor usage, set study hour constraints, and receive daily automated usage reports via email (powered by Resend).
- **Data Privacy & GDPR Controls:** Manage shared links, revoke access instantly, and export or permanently delete account data.
- **Rate Limiting:** IP-based and user-tier rate limiting backed by Upstash Redis to prevent AI abuse.
- **Tiered Subscriptions:** Free, Plus, and Premium tiers with structured usage quotas, seamlessly integrated with Razorpay.

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Framer Motion (Animations)
- **Components/Icons:** Lucide React, Radix UI primitives
- **Data Fetching:** SWR

### Editor & PDFs
- **Rich Text:** Tiptap (React wrapper + Custom Extensions)
- **Markdown:** React Markdown, Remark GFM
- **PDF Rendering:** React-PDF, pdf-lib, jspdf, html2canvas

### Backend & Infrastructure
- **Database / Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Edge Functions)
- **Authentication:** NextAuth.js (v4) with custom Supabase Adapters & Credentials Provider (Bcrypt hashing)
- **AI Integration:** `@google/generative-ai`, `openai` SDK (for standardizing API shapes)
- **Caching & Rate Limiting:** Upstash Redis
- **Email Delivery:** Resend

---

## 📈 Recent Milestone Updates (The "Start-to-End" Changelog)

The platform recently underwent a massive structural evolution, finalizing the transition from "Ascend" to **Avyx**. Key architectural and UX milestones achieved include:

1. **Rebranding & Theming:** Complete UI overhaul to standard Avyx branding. Fully integrated System/Light/Dark mode synced across databases and local storage. Included precise Lexend typography updates and premium UI polish (skeleton loaders, glassmorphic headers).
2. **Unified AI Architecture:** Hardened the API routes to safely handle session states `Request` objects, fixing persistent 401 unauthorized errors. Optimized the Gemini -> Ollama fallback pipeline to ensure absolute reliability.
3. **Importers & Shared Content:** 
    - Resolved SQL Schema caching errors regarding the `chats` and `shared_chats` relationships.
    - Unified the "Chat Importers" and "Note Importers" UI into a single highly optimized, reusable component (`ImportersModal`).
    - Integrated direct importer management straight into the Data Controls Settings modal.
4. **Subscription Quotas:** Dynamic AI limitation tracking across client UI elements (locking features when out of tokens) and server-side strict enforcement.
5. **Dashboard Gestures & Real Estate:** Normalized card heights (5-item max visibility) and enabled smooth swipe actions across tasks.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js >= 18.17.0
- npm or pnpm or yarn
- Supabase Project & Database credentials
- Resend API Key
- Gemini / OpenAI API Keys
- Upstash Redis URL/Token

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd Ascend_project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory and populate it with your keys:
   ```env
   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role
   
   # Auth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   
   # AI
   GEMINI_API_KEY=your_gemini_key
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   # ... other keys
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤝 Contribution Guidelines
When contributing to Avyx, please ensure you check the `.gsd-core/PROJECT_RULES.md` for architectural patterns. Follow standard Git Flow (Feature branches -> PR -> Main).

<div align="center">
  <i>Built with ❤️ for the future of productivity.</i>
</div>
