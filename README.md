# Amplify Interview

A professional AI-powered interview practice platform that helps candidates build confidence and improve their interview skills through realistic practice sessions with comprehensive AI analysis and feedback.

## Features

- **AI-Powered Analysis**: Real-time analysis using OpenRouter API with multiple AI models
- **Realistic Interview Practice**: Practice with behavioral, technical, and leadership interview formats
- **Performance Analytics**: Track your progress with detailed metrics and insights
- **Video Recording & Playback**: Record your interview sessions with optimized video playback
- **Speech-to-Text Transcription**: Automatic transcription using Deepgram API
- **Personalized AI Feedback**: Receive detailed scoring, strengths, improvements, and actionable feedback
- **Cost Tracking**: Monitor AI analysis costs and usage
- **Secure & Private**: Your data is protected with enterprise-grade security

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Integration**: OpenRouter API (Claude, GPT models)
- **Speech-to-Text**: Deepgram API
- **Video Processing**: WebRTC MediaRecorder API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd amplify-my-interview
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# AI Analysis (OpenRouter)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# Speech-to-Text (Deepgram)
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
```

4. Start the development server:

```bash
npm run dev
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API and external service integrations
├── contexts/           # React context providers
├── integrations/       # Third-party integrations (Supabase)
└── lib/                # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@amplifyinterview.com or visit our help center.
