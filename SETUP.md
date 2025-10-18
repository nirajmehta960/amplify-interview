# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites

- Node.js (v18+)
- Git
- Supabase account
- OpenRouter API key
- Deepgram API key

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/amplify-interview.git
cd amplify-interview
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Database Setup

1. Create Supabase project
2. Run migrations from `supabase/migrations/`
3. Enable RLS policies

### 5. Start Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

## 🔑 Required API Keys

| Service    | Purpose         | Get Key                                |
| ---------- | --------------- | -------------------------------------- |
| Supabase   | Database & Auth | [supabase.com](https://supabase.com)   |
| OpenRouter | AI Analysis     | [openrouter.ai](https://openrouter.ai) |
| Deepgram   | Speech-to-Text  | [deepgram.com](https://deepgram.com)   |

## 🆘 Need Help?

- Check the [main README](README.md) for detailed documentation
- Open an [issue](https://github.com/yourusername/amplify-interview/issues) for bugs
- Join [discussions](https://github.com/yourusername/amplify-interview/discussions) for questions
