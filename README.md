# Amplify Interview

![Amplify Interview](https://img.shields.io/badge/Amplify%20Interview-Interview%20Platform-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?logo=supabase)

**AI-Powered Mock Interview Platform for Technical, Behavioral, Leadership, and Custom Domain Interview Preparation**

Amplify Interview is a comprehensive mock interview platform that leverages advanced AI models to provide personalized interview coaching, detailed performance analysis, and skill development tracking. Whether you're preparing for technical interviews, behavioral assessments, leadership roles, or custom domains like Product Management, Software Engineering, AI Engineering, and more - our platform offers a complete interview preparation experience with video recording, real-time transcription, and intelligent feedback.

---

## Features

### Core Functionality

* **AI-Powered Interview Analysis** - Real-time evaluation using OpenAI GPT and Anthropic Claude models
* **Video Recording & Transcription** - High-quality video capture with automatic speech-to-text via Deepgram
* **Custom Question Bank** - Create and manage personal question collections by category and domain
* **Multiple Interview Types** - Behavioral, Technical, Leadership, and Custom domain formats
* **Session Management** - Complete interview session tracking with video playback and analysis
* **Progress Analytics** - Visual charts and metrics tracking performance improvements over time
* **Interview Readiness Assessment** - AI-powered evaluation of interview preparedness
* **Performance Insights** - Detailed feedback on communication, content quality, and improvement areas

### Question Management

* **Personal Question Bank** - Build your own collection of interview questions
* **Multi-category Support** - Behavioral, technical, and leadership question categories
* **Custom Domain Selection** - Specialized questions for Product Manager, Software Engineer, AI Engineer, Data Scientist, UX Designer, and more
* **Question Classification** - Intelligent categorization by domain and difficulty
* **Practice Integration** - Seamlessly use custom questions in mock interviews

### Analytics & Tracking

* **Session History** - Complete record of all interview sessions with detailed metrics
* **Visual Progress Charts** - Interactive charts showing skill development over time
* **Score Trends** - Track performance improvements across different skill areas
* **Skill Development Radar** - Visual representation of strengths and improvement areas
* **Cost Tracking** - Monitor AI analysis costs and token usage

### Security & Privacy

* **Secure Authentication** - Email/password and Google OAuth integration
* **Row Level Security** - Database-level access control with user isolation
* **Local Video Storage** - Videos stored securely in browser's IndexedDB for privacy
* **Data Encryption** - All sensitive data encrypted in transit and at rest

---

## Tech Stack

### Frontend

* **React 18** with TypeScript
* **Vite** for blazing-fast development
* **Tailwind CSS** for styling
* **shadcn/ui** component library
* **React Router** for navigation
* **TanStack Query** for data fetching
* **Framer Motion** for animations
* **Recharts** for data visualization

### Backend & Database

* **Supabase** for authentication, database, and real-time features
* **PostgreSQL** for robust data storage and relationships
* **Row Level Security (RLS)** for data protection and user isolation
* **Supabase Auth** for secure user authentication and session management

### AI & Analysis

* **OpenRouter API** for AI model integration and analysis
* **Deepgram** for high-accuracy speech-to-text transcription
* **Custom AI Analysis Service** for interview response evaluation
* **Question Classification System** for intelligent question categorization

### Video & Media

* **WebRTC** for video recording and streaming
* **MediaRecorder API** for video capture and processing
* **Video Segmentation Service** for question-based response tracking
* **IndexedDB Storage** for local video file management and privacy

---

## Quick Start

### Prerequisites

* **Node.js** 18+ (for frontend)
* **npm** or **yarn** package manager
* **Supabase Account** for backend services
* **OpenRouter API Key** for AI analysis
* **Deepgram API Key** for transcription services (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nirajmehta960/amplify-interview.git
   cd amplify-interview
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   
   **Required Variables:**
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `VITE_OPENROUTER_API_KEY` - Your OpenRouter API key
   - `VITE_RESEND_API_KEY` - Your Resend API key (for welcome emails)
   - `VITE_EMAIL_FROM` - Your email address for sending emails
   - `VITE_APP_NAME` - Your application name
   - `VITE_APP_URL` - Your application URL
   
   **Optional Variables:**
   - `VITE_DEEPGRAM_API_KEY` - Deepgram API key (for transcription)
   - `VITE_SITE_URL` - Your site URL (for OpenRouter)
   - `VITE_SITE_TITLE` - Your site title (for OpenRouter)

4. **Database Setup**
   
   1. Create a new Supabase project at [supabase.com](https://supabase.com)
   2. Run the database migrations located in `supabase/migrations/`
   3. Set up Row Level Security policies for data protection
   4. Configure authentication settings in your Supabase dashboard

5. **Google OAuth Setup (Optional)**
   
   1. Create Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
   2. Add authorized redirect URI: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
   3. Enable Google provider in Supabase Dashboard → Authentication → Providers
   4. Enter your Client ID and Client Secret

6. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

---

## Project Structure

```
amplify-interview/
├── api/                      # API routes (Vercel serverless functions)
│   └── send-welcome-email.ts
├── public/                   # Static assets
│   ├── logo.svg
│   └── favicon.svg
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── landing/        # Landing page sections
│   │   └── layout/         # Layout components
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx
│   │   └── InterviewContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useVideoRecording.ts
│   ├── integrations/       # External service integrations
│   │   └── supabase/       # Supabase client and types
│   ├── lib/                # Utility functions
│   ├── pages/              # Application pages
│   │   ├── Dashboard.tsx
│   │   ├── InterviewSession.tsx
│   │   ├── InterviewResults.tsx
│   │   └── PracticeQuestions.tsx
│   ├── services/           # Business logic and API services
│   │   ├── aiAnalysisService.ts
│   │   ├── interviewSessionService.ts
│   │   ├── openRouterService.ts
│   │   └── deepgramTranscriptionService.ts
│   └── types/              # TypeScript type definitions
├── supabase/               # Database migrations and configuration
│   ├── migrations/
│   └── config.toml
├── .env.example            # Environment variables template
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run dev:api      # Start with Vercel API routes
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

### API Documentation

Once the backend is running, access your Supabase project:
* **Supabase Dashboard**: `https://app.supabase.com/project/<your-project-id>`
* **API Documentation**: Available in Supabase Dashboard → API

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Deploy**: Automatic deployment on every push to main branch

### Other Platforms

The application can be deployed to any platform that supports Node.js applications:
* **Netlify**
* **Railway**
* **Heroku**
* **AWS Amplify**

---

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

* Follow existing code patterns
* Use meaningful variable names
* Add comments for complex logic
* Keep components and functions focused
* Use TypeScript strict mode
* Follow ESLint rules

---

## Copyright

Copyright (c) 2025 Niraj Mehta. All rights reserved.

---

## Authors

**Niraj Mehta**

* GitHub: [@nirajmehta960](https://github.com/nirajmehta960)

---

## Acknowledgments

* Built with React and Supabase
* UI components from shadcn/ui
* AI models via OpenRouter
* Speech-to-text by Deepgram
* Icons from Lucide

---

**Made with passion for better interview preparation**

Star this repo if you find it helpful!
