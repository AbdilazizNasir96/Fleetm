# 🚀 Quick Deployment Guide

## TL;DR - Deploy in 15 Minutes

### Backend to Render.com

1. **Create PostgreSQL Database**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - New + → PostgreSQL → Create
   - Copy the "External Database URL"

2. **Deploy Backend**
   - New + → Web Service
   - Connect GitHub repo: `Digivant-Solutions`
   - Root Directory: `artifacts/api-server`
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `node --enable-source-maps ./dist/index.mjs`

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<paste-postgresql-url>
   SESSION_SECRET=<generate-random-32-chars>
   APP_URL=<your-render-url>
   ```

4. **Deploy** → Wait 5-10 minutes → Get URL

---

### Frontend to Vercel

1. **Deploy Frontend**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import repo: `Digivant-Solutions`
   - Root Directory: `artifacts/app`
   - Build Command: `pnpm run build`
   - Output Directory: `dist`

2. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   NODE_ENV=production
   ```

3. **Deploy** → Wait 2-5 minutes → Get URL

---

### Update Backend CORS

Add Vercel URL to backend CORS:

**File**: `artifacts/api-server/src/app.ts`

```typescript
cors({
  origin: [
    'https://your-project.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
})
```

Push changes → Render auto-deploys

---

### Verify Everything Works

```bash
# Test backend
curl https://your-backend.onrender.com/api/health

# Test frontend
open https://your-project.vercel.app
```

---

## Essential Commands

### Generate SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Check Logs
- **Render**: Dashboard → Service → Logs
- **Vercel**: Dashboard → Project → Deployments → Logs

### Redeploy
Just push to GitHub:
```bash
git add .
git commit -m "Deploy updates"
git push origin main
```
Both platforms auto-deploy!

---

## Cost Summary

### Completely Free (with limitations):
- Render Free Tier: Cold starts, 90-day DB
- Vercel Hobby: Unlimited deployments

### Recommended for Production (~$14/month):
- Render Starter: $7 (no cold starts)
- Render PostgreSQL: $7 (persistent data)
- Vercel Hobby: $0 (or Pro $20 for teams)

---

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify DATABASE_URL is correct
- Ensure SESSION_SECRET is at least 32 characters

### Frontend can't connect to backend
- Check VITE_API_URL is correct
- Update backend CORS with Vercel domain
- Verify backend is running (not cold)

### Build fails
- Check build logs
- Verify pnpm is being used
- Ensure all dependencies are installed

---

## Need More Details?

See the complete guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Happy Deploying! 🎉**
