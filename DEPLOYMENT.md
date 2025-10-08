# Deployment Guide for Vercel

## Environment Variables Setup

Make sure to set these environment variables in your Vercel project settings:

### Required Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Optional Environment Variables:

```
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
```

## Steps to Deploy:

1. **Push your code to GitHub** (make sure to include the `vercel.json` file)

2. **Connect your GitHub repository to Vercel**

3. **Set Environment Variables in Vercel:**

   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add the required variables listed above

4. **Redeploy your project** after setting environment variables

## Common Issues and Solutions:

### 404 Error on Routes:

- ✅ **Fixed**: Added `vercel.json` with proper rewrites
- This ensures all routes are handled by React Router

### Environment Variables Not Working:

- Make sure variables start with `VITE_` prefix
- Redeploy after adding environment variables
- Check that Supabase URL and keys are correct

### Build Issues:

- Ensure all dependencies are in `package.json`
- Check that there are no TypeScript errors
- Verify all imports are correct

## Testing Deployment:

1. Visit your Vercel URL
2. Try navigating to `/auth/signin`
3. Try navigating to `/auth/signup`
4. All routes should work without 404 errors
