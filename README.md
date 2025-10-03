# Amplify Interview

A professional interview practice platform that helps candidates build confidence and improve their interview skills through realistic practice sessions.

<!-- Force deployment update -->

## Features

- **Realistic Interview Practice**: Practice with behavioral, technical, and leadership interview formats
- **Performance Analytics**: Track your progress with detailed metrics and insights
- **Personalized Feedback**: Receive tailored coaching based on your specific needs
- **Video Recording**: Record your practice sessions for review and improvement
- **Secure & Private**: Your data is protected with enterprise-grade security

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Integration**: OpenAI Whisper API for speech-to-text

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

```bash
cp .env.example .env.local
```

4. Configure your Supabase credentials in `.env.local`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development server:

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
