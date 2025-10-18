# Amplify Interview

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

### Upcoming Features

#### PDF Report Generation

- **Download Detailed Reports**: Generate comprehensive 1-page PDF reports with performance metrics, insights, and improvement recommendations
- **Professional Formatting**: Clean, dashboard-style reports perfect for sharing with mentors or saving for personal records
- **Multiple Export Options**: Choose between summary reports or detailed analysis documents

#### Cloud Video Storage

- **Cross-Device Access**: Access your interview videos from any device with secure authentication
- **Automatic Backup**: Cloud backup with user consent and control over data retention
- **Storage Optimization**: Intelligent compression and format optimization to reduce storage costs
- **Retention Policies**: Configurable video retention and auto-deletion settings
- **Platform Integration**: AWS S3, Google Cloud Storage, or Azure Blob Storage options

#### Enhanced Analytics

- **Deeper Insights**: Advanced performance trends and skill development tracking
- **Comparative Analysis**: Compare performance across different interview types and time periods
- **Progress Milestones**: Visual achievement tracking and skill development milestones

### Future Enhancements

- **Team Collaboration**: Share results with mentors or coaches
- **Mobile App**: Native iOS and Android applications
- **Interview Scheduling**: Calendar integration and scheduling
- **Company-specific Questions**: Questions tailored to specific companies
- **Real-time Collaboration**: Practice with peers and mentors
- **Career Guidance**: AI-powered career path recommendations

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

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter API Configuration
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENROUTER_APP_NAME=Amplify Interview

# Deepgram Configuration
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key

# Application Configuration
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=Amplify Interview
```

### 4. Database Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Run the database migrations** located in the `supabase/migrations/` directory
3. **Set up Row Level Security policies** for data protection
4. **Configure authentication settings** in your Supabase dashboard

### 5. API Keys Setup

#### OpenRouter API

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key from your dashboard
3. Add the key to your `.env` file

#### Deepgram API

1. Create an account at [deepgram.com](https://deepgram.com)
2. Generate an API key from your console
3. Add the key to your `.env` file

### 6. Start Development Server

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

## 🎯 Usage Guide

### Getting Started

1. **Sign Up**: Create a new account or sign in with existing credentials
2. **Set Up Interview**: Choose interview type, questions, and duration
3. **Start Recording**: Begin your mock interview with video recording
4. **Review Results**: Analyze your performance with detailed AI feedback
5. **Track Progress**: Monitor your improvement over time

### Interview Types

- **Behavioral**: STAR method, leadership, and soft skills
- **Technical**: System design, algorithms, and problem-solving
- **Leadership**: Management scenarios and team leadership
- **Custom**: Mix of question types with domain-specific focus including:
  - **Product Management**: Product strategy, user research, and roadmap planning
  - **Software Engineering**: Coding challenges, system design, and architecture
  - **AI Engineering**: Machine learning, data science, and AI system design
  - **Data Science**: Statistical analysis, data modeling, and insights
  - **UX Design**: User experience, design thinking, and usability
  - **And more**: Expandable to any professional domain

### Question Management

- **App Questions**: Pre-built questions for different interview types
- **Custom Questions**: Create and manage your own question bank
- **Question Categories**: Organize questions by type and difficulty
- **Domain Selection**: Choose questions specific to your field

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

## 📊 Database Schema

### Core Tables

- **profiles**: User profile information
- **interview_sessions**: Interview session metadata
- **interview_questions**: Question bank and metadata
- **interview_responses**: Individual question responses
- **interview_analysis**: AI analysis results
- **interview_summary**: Session summaries and scores
- **user_questions**: Custom user-created questions

### Key Relationships

- Users have many interview sessions
- Sessions contain multiple responses
- Responses are analyzed by AI
- Questions are categorized by type and domain

## 🎥 Video Storage & Privacy

### Current Implementation

- **Local Storage**: All interview videos are stored locally in the user's browser using IndexedDB
- **Privacy First**: Videos never leave the user's device, ensuring complete privacy
- **No Server Upload**: No cloud storage costs or data transfer concerns
- **Browser Managed**: Automatic storage management and cleanup by the browser
- **Cross-Session Persistence**: Videos remain available across browser sessions

## 🔒 Security & Privacy

- **Row Level Security**: Database-level access control
- **Authentication**: Secure user authentication with Supabase Auth
- **Data Encryption**: All sensitive data encrypted in transit and at rest
- **Privacy First**: No personal data shared with third parties
- **GDPR Compliant**: Full compliance with data protection regulations

## 🤝 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

### Common Issues

- **Video Recording**: Ensure camera and microphone permissions are granted
- **AI Analysis**: Check API key configuration and rate limits
- **Database**: Verify Supabase connection and migration status

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

---

**Built with ❤️ for the developer community**

_Help others succeed in their interview preparation journey by contributing to this project!_
