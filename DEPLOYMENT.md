# 🚀 Deployment Guide

## Quick Fix for Your Current Issue

Your deployed app isn't working because the frontend is still trying to connect to `localhost:8000` instead of your Railway backend URL.

### Step 1: Configure Vercel Environment Variables

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Select your project** (the frontend)
3. **Go to Settings → Environment Variables**
4. **Add this environment variable:**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-railway-app-name.railway.app` *(replace with your actual Railway URL)*
   - **Environments**: Select "Production" and "Preview"

### Step 2: Configure Railway Environment Variables

1. **Go to [Railway Dashboard](https://railway.app/dashboard)**
2. **Select your project** (the backend)
3. **Go to Variables tab**
4. **Add these environment variables:**

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here

# CORS - Add your Vercel URL
FRONTEND_URL=https://your-vercel-app.vercel.app
ADDITIONAL_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app

# Database (Railway provides this automatically for PostgreSQL)
DATABASE_URL=your_railway_database_url

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Step 3: Redeploy

1. **Redeploy your Railway backend** (it should redeploy automatically when you add environment variables)
2. **Redeploy your Vercel frontend** (go to Deployments → click "Redeploy" on latest deployment)

### Step 4: Update Your URLs

- **Frontend (Vercel)**: `https://your-app.vercel.app`
- **Backend (Railway)**: `https://your-app.railway.app`
- **API Docs**: `https://your-app.railway.app/docs`

## Common URLs to Update

### In Railway Environment Variables:
```bash
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
ADDITIONAL_ALLOWED_ORIGINS=https://your-actual-vercel-url.vercel.app
```

### In Vercel Environment Variables:
```bash
VITE_API_URL=https://your-actual-railway-url.railway.app
```

## Testing Your Deployment

1. **Open your Vercel app URL**
2. **Try to sign up/login** (should work)
3. **Try to submit a report** (should now work)
4. **Check admin dashboard** (should show "Connected" instead of the localhost error)

## Troubleshooting

### If reports still don't work:
1. Check browser Network tab for CORS errors
2. Verify your Railway backend is running: visit `https://your-railway-url.railway.app/health`
3. Check that environment variables are set correctly in both platforms

### If admin dashboard still shows localhost error:
1. Make sure `VITE_API_URL` is set in Vercel
2. Redeploy the Vercel frontend after adding the environment variable
3. Clear browser cache and try again

---

**Need the actual URLs?**
- **Railway**: Check your Railway dashboard → Settings → Domains
- **Vercel**: Check your Vercel dashboard → Deployments → View deployment
