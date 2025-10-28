# Deployment Guide - Data Analyzer

This guide will help you deploy your Data Analyzer application for FREE using Vercel (frontend) and Render (backend).

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com - free)
3. A Render account (sign up at https://render.com - free)

## Step 1: Push Code to GitHub

```bash
# Make sure you're in the project root directory
cd "C:\Users\arhou\OneDrive\Bureau\Data manupulation"

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub, then:
git branch -m main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Step 2: Deploy Backend to Render

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `data-analyzer-backend` (or any name you prefer)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `data-analyzer/backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

5. Click "Create Web Service"
6. Wait for deployment to complete (5-10 minutes)
7. **Copy your backend URL** (e.g., `https://data-analyzer-backend-xxxx.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `data-analyzer/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   - Click "Environment Variables"
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-render-backend-url.onrender.com/api` (use the URL from Step 2)
   - Click "Add"

6. Click "Deploy"
7. Wait for deployment (2-5 minutes)
8. Your site is live! You'll get a URL like `https://your-project.vercel.app`

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try uploading a CSV file
3. Test the data analysis features

## Important Notes

### Free Tier Limitations:

**Render Free Tier:**
- Backend will spin down after 15 minutes of inactivity
- First request after inactivity may take 30-50 seconds to respond
- 750 hours/month of runtime

**Vercel Free Tier:**
- Unlimited deployments
- 100GB bandwidth/month
- Instant global CDN

### Troubleshooting:

**If backend doesn't respond:**
- Render free tier spins down after inactivity
- Wait 30-50 seconds for first request
- Check Render logs for errors

**If CORS errors occur:**
- Make sure VITE_API_URL includes `/api` at the end
- Backend already has CORS enabled for all origins

**If deployment fails:**
- Check build logs in Vercel/Render dashboard
- Ensure all dependencies are in requirements.txt and package.json
- Verify paths are correct

## Updating Your Deployment

Whenever you make changes:

```bash
git add .
git commit -m "Your update message"
git push
```

Both Vercel and Render will automatically redeploy your app!

## Custom Domain (Optional)

Both Vercel and Render support custom domains for free:
- Vercel: Project Settings → Domains
- Render: Dashboard → Settings → Custom Domain

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
