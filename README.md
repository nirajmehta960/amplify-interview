# Amplify Interview

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

**AI-Powered Mock Interview Platform for Technical, Behavioral, Leadership, and Custom Domain Interview Preparation**

Amplify Interview is a comprehensive mock interview platform that leverages advanced AI models to provide personalized interview coaching, detailed performance analysis, and skill development tracking. Whether you're preparing for technical interviews, behavioral assessments, leadership roles, or custom domains like Product Management, Software Engineering, AI Engineering, and more - our platform offers a complete interview preparation experience with video recording, real-time transcription, and intelligent feedback.

## 🌟 Features

### AI-Powered Interview Analysis

- **Advanced Language Models**: Utilizes OpenAI GPT and Anthropic Claude models for comprehensive response analysis
- **Real-time Response Analysis**: Instant evaluation of communication skills, technical knowledge, and problem-solving approach
- **Detailed Communication Feedback**: Analyzes clarity, structure, conciseness, and speaking pace
- **Personalized Improvement Suggestions**: Tailored recommendations based on individual performance patterns
- **Score-based Performance Evaluation**: Quantitative assessment across multiple skill dimensions

### Custom Question Bank Management

- **Personal Question Bank Creation**: Build and manage your own collection of interview questions
- **Multi-category Support**: Behavioral, technical, and leadership question categories
- **Custom Domain Selection**: Specialized questions for Product Manager, Software Engineer, AI Engineer, Data Scientist, UX Designer, and more
- **Question Categorization & Management**: Intelligent classification and organization of questions by domain and difficulty
- **Practice Session Integration**: Seamlessly integrate custom questions into mock interviews

### Comprehensive Analytics & Progress Tracking

- **Session History & Performance Tracking**: Complete record of all interview sessions with detailed metrics
- **Visual Progress Charts & Analytics**: Interactive charts showing skill development over time
- **Score Trends & Improvement Metrics**: Track performance improvements across different skill areas
- **Interview Readiness Assessment**: AI-powered evaluation of interview preparedness
- **Skill Development Radar Charts**: Visual representation of strengths and improvement areas

### Video Recording & Transcription

- **High-quality Video Recording**: Professional-grade video capture with camera and audio controls
- **Real-time Transcription**: Automatic speech-to-text conversion using Deepgram
- **Question Segmentation**: Automatic breakdown of responses by individual questions
- **Video Playback & Analysis**: Review recorded sessions with synchronized transcripts
- **Local Video Storage**: Videos stored securely in browser's IndexedDB for privacy
- **Download & Export**: Save interview recordings for offline review

### Interactive Interview Experience

- **Multiple Interview Types**: Behavioral, Technical, Leadership, and Custom formats
- **Dynamic Question Selection**: Choose from app-provided questions or personal question bank
- **Real-time Controls**: Pause, mute, camera controls during interview sessions
- **Progress Tracking**: Visual indicators for interview progress and time management
- **Responsive Design**: Optimized for desktop and mobile devices

### Secure Authentication

- **Multiple Sign-in Options**: Email/password and Google OAuth integration
- **Protected Routes**: Automatic redirection for authenticated and unauthenticated users

### Upcoming Features

- **PDF Report Generation**: Download detailed performance reports in PDF format
- **Cloud Video Storage**: Cross-device access with AWS S3/Google Cloud Storage integration
- **Enhanced Analytics**: Advanced performance trends and comparative analysis
- **Team Collaboration**: Share results with mentors and coaches
- **Mobile App**: Native iOS and Android applications

## 🚀 Technology Stack

### Frontend

- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations and transitions
- **Shadcn/ui** for accessible, customizable UI components
- **Recharts** for data visualization and analytics
- **React Router** for client-side routing

### Backend & Database

- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** for robust data storage and relationships
- **Row Level Security (RLS)** for data protection and user isolation
- **Supabase Auth** for secure user authentication and session management
- **Google OAuth Integration** for seamless social authentication via Supabase Auth

### AI & Analysis

- **OpenRouter API** for AI model integration and analysis
- **Deepgram** for high-accuracy speech-to-text transcription
- **Custom AI Analysis Service** for interview response evaluation
- **Question Classification System** for intelligent question categorization

### Video & Media

- **WebRTC** for video recording and streaming
- **MediaRecorder API** for video capture and processing
- **Video Segmentation Service** for question-based response tracking
- **IndexedDB Storage** for local video file management and privacy
- **Future Enhancement**: Cloud storage integration (AWS S3, Google Cloud Storage) for cross-device access

## 📋 Prerequisites

Before running this project locally, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **Supabase Account** for backend services
- **OpenRouter API Key** for AI analysis
- **Deepgram API Key** for transcription services

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/amplify-interview.git
cd amplify-interview
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and fill in your API keys and configuration values. See `.env.example` for detailed documentation of all environment variables.

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
- Local development URLs (for running with Vercel dev)

### 4. Database Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Run the database migrations** located in the `supabase/migrations/` directory
3. **Set up Row Level Security policies** for data protection
4. **Configure authentication settings** in your Supabase dashboard

### 5. Email Configuration (Optional)

- **Confirmation emails**: Sent via Supabase's default service (customizable in Dashboard → Authentication → Email Templates)
- **Welcome emails**: Sent via Resend API (configure `VITE_RESEND_API_KEY` in `.env`)

**Note**: If using a free Vercel domain, you can customize Supabase email templates but cannot use Resend SMTP (requires verified custom domain).

### 6. Google OAuth Setup (Optional but Recommended)

Enable Google OAuth for one-click authentication:

1. **Create Google OAuth Credentials**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the **Google+ API**
   - Navigate to **Credentials** > **Create Credentials** > **OAuth client ID**
   - Choose **Web application** as the application type
   - Add authorized redirect URI: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
   - Copy your **Client ID** and **Client Secret**

2. **Configure in Supabase Dashboard**:
   - Go to your [Supabase Dashboard](https://app.supabase.com/)
   - Navigate to **Authentication** > **Providers**
   - Enable **Google** provider
   - Enter your **Client ID** and **Client Secret** from Google Cloud Console
   - Add allowed redirect URLs:
     - Development: `http://localhost:5173/dashboard`
     - Production: `https://yourdomain.com/dashboard`
   - Click **Save**

### 7. API Keys Setup

#### OpenRouter API

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key from your dashboard
3. Add the key to your `.env` file

#### Deepgram API

1. Create an account at [deepgram.com](https://deepgram.com)
2. Generate an API key from your console
3. Add the key to your `.env` file

#### Resend API (Optional - for welcome emails)

1. Sign up at [resend.com](https://resend.com)
2. Generate an API key and add it to `.env` as `VITE_RESEND_API_KEY`
3. Set `VITE_EMAIL_FROM` (use `onboarding@resend.dev` for testing)

**Note**: Welcome emails are automatically sent to new users. If not configured, the app works without sending emails.

### 8. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
amplify-interview/
├── public/                     # Static assets
│   ├── logo.svg               # Application logo
│   └── favicon.svg            # Favicon
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── Hero.tsx          # Landing page hero section
│   │   ├── Features.tsx      # Features showcase
│   │   ├── Footer.tsx        # Footer component
│   │   └── Logo.tsx          # Logo component
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication context
│   │   └── InterviewContext.tsx # Interview state management
│   ├── hooks/                # Custom React hooks
│   │   ├── useVideoRecording.ts # Video recording logic
│   │   └── use-toast.ts      # Toast notifications
│   ├── integrations/         # External service integrations
│   │   └── supabase/         # Supabase client and types
│   ├── lib/                  # Utility functions
│   │   ├── utils.ts          # General utilities
│   │   └── design-system.ts  # Design system constants
│   ├── pages/                # Application pages
│   │   ├── Dashboard.tsx     # User dashboard
│   │   ├── InterviewSession.tsx # Live interview interface
│   │   ├── InterviewResults.tsx # Results and analysis
│   │   ├── PracticeQuestions.tsx # Question management
│   │   └── ProgressTab.tsx   # Progress tracking
│   ├── services/             # Business logic and API services
│   │   ├── aiAnalysisService.ts # AI analysis logic
│   │   ├── interviewSessionService.ts # Interview management
│   │   ├── openRouterService.ts # AI model integration
│   │   └── deepgramTranscriptionService.ts # Speech-to-text
│   ├── types/                # TypeScript type definitions
│   │   ├── aiAnalysis.ts     # AI analysis types
│   │   └── index.ts          # General types
│   └── utils/                # Utility functions
│       ├── aiAnalysisUtils.ts # AI analysis utilities
│       └── videoFormatSupport.ts # Video format handling
├── supabase/                 # Database migrations and configuration
│   ├── migrations/           # SQL migration files
│   └── config.toml          # Supabase configuration
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

## 🎯 Quick Start Guide

1. **Sign Up**: Create a new account with email/password or Google OAuth
2. **Set Up Interview**: Choose interview type (Behavioral, Technical, Leadership, or Custom) and questions
3. **Start Recording**: Begin your mock interview with video recording
4. **Review Results**: Analyze your performance with detailed AI feedback
5. **Track Progress**: Monitor your improvement over time with analytics and charts

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Database
npm run db:reset     # Reset database (development only)
npm run db:seed      # Seed database with sample data
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting for consistency
- **Conventional Commits**: Use conventional commit messages

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables
3. **Deploy**: Automatic deployment on every push to main branch

### Other Platforms

The application can be deployed to any platform that supports Node.js applications:

- **Netlify**
- **Railway**
- **Heroku**
- **AWS Amplify**

## 🔒 Security & Privacy

- **Row Level Security**: Database-level access control with user isolation
- **Secure Authentication**: Email/password and Google OAuth with automatic token refresh
- **Local Video Storage**: All videos stored in browser's IndexedDB - never uploaded to servers
- **Data Encryption**: All sensitive data encrypted in transit and at rest
- **Privacy First**: No personal data shared with third parties, GDPR compliant

## 🤝 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

### Common Issues

- **Video Recording**: Ensure camera and microphone permissions are granted
- **AI Analysis**: Check API key configuration and rate limits
- **Database**: Verify Supabase connection and migration status
- **Google OAuth**: Enable provider in Supabase Dashboard → Authentication → Providers and verify redirect URLs match your app URLs

## 📝 License

MIT License - Copyright (c) 2025 Niraj Mehta. See the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and AI capabilities
- **Anthropic** for Claude models and advanced reasoning
- **Supabase** for backend infrastructure and authentication
- **Deepgram** for speech-to-text transcription
- **OpenRouter** for AI model access and management
- **Shadcn/ui** for beautiful and accessible UI components

## 📞 Contact

- **Project Maintainer**: Niraj Mehta
- **Email**: nirajmehta960@gmail.com

## 📄 License

MIT License - Copyright (c) 2025 Niraj Mehta

---

_Help others succeed in their interview preparation journey by contributing to this project!_
