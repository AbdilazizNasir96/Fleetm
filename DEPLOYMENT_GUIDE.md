# 🚀 Deployment Guide

## Backend Deployment to Render.com

### Prerequisites
- GitHub account with your repository pushed
- Render.com account (free tier available)
- PostgreSQL database (you can use Render's PostgreSQL or external)
- Environment variables ready

---

### Method 1: Deploy via Render Dashboard (Recommended for Beginners)

#### Step 1: Set Up PostgreSQL Database on Render

1. **Go to Render Dashboard**: [https://dashboard.render.com](https://dashboard.render.com)
2. **Click "New +"** → Select **"PostgreSQL"**
3. **Configure Database**:
   - Name: `digivant-db` (or your preferred name)
   - Database: `digivant_db`
   - User: `digivant_user`
   - Region: Choose closest to your users
   - Plan: **Free** (or paid for production)
4. **Click "Create Database"**
5. **Copy the External Database URL** (starts with `postgresql://`) - you'll need this

---

#### Step 2: Create Web Service on Render

1. **Click "New +"** → Select **"Web Service"**
2. **Connect Your Repository**:
   - If first time: Click "Connect GitHub" and authorize Render
   - Select your repository: `Digivant-Solutions`
3. **Configure Service**:
   ```
   Name: digivant-api-server
   Region: Same as your database (for lower latency)
   Branch: main (or your deployment branch)
   Root Directory: artifacts/api-server
   Runtime: Node
   Build Command: pnpm install && pnpm run build
   Start Command: node --enable-source-maps ./dist/index.mjs
   Plan: Free (or Starter for production)
   ```

---

#### Step 3: Configure Environment Variables

In the **Environment** section, add these variables:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<paste-your-postgresql-url-from-step-1>
SESSION_SECRET=<generate-a-random-32-character-string>
APP_URL=<will-be-your-render-url-like-https://digivant-api-server.onrender.com>
```

**Optional Variables (add if you're using these services):**
```
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
AZURE_STORAGE_CONNECTION_STRING=<your-azure-connection-string>
AZURE_STORAGE_CONTAINER_NAME=tnw-uploads
REDIS_URL=<your-redis-url-if-using>
LOG_LEVEL=info
```

**To Generate SESSION_SECRET:**
- Run this command locally:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Or use an online generator: [Random.org](https://www.random.org/strings/)

---

#### Step 4: Deploy

1. **Click "Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies with pnpm
   - Run the build command
   - Start your server

3. **Monitor Deployment**:
   - Watch the logs in real-time
   - First deployment takes 5-10 minutes
   - Look for "Server listening" message

4. **Get Your API URL**:
   - After successful deployment: `https://your-service-name.onrender.com`
   - Test health endpoint: `https://your-service-name.onrender.com/api/health`

---

### Method 2: Deploy via render.yaml (Infrastructure as Code)

#### Step 1: Update render.yaml

The `render.yaml` file has been created in `artifacts/api-server/render.yaml`. 

**Customize it**:
```yaml
services:
  - type: web
    name: digivant-api  # Change to your preferred name
    region: oregon      # Options: oregon, frankfurt, singapore, ohio
    plan: free          # Options: free, starter, standard, pro
```

#### Step 2: Push to GitHub

```bash
git add artifacts/api-server/render.yaml
git commit -m "Add Render deployment configuration"
git push origin main
```

#### Step 3: Deploy from Blueprint

1. Go to: [https://dashboard.render.com/select-repo](https://dashboard.render.com/select-repo)
2. Select **"Deploy from YAML"**
3. Connect your repository
4. Render will detect `render.yaml` automatically
5. Review and approve the configuration
6. Add environment variables in the dashboard
7. Click **"Apply"**

---

### Important Notes for Render.com

#### 🔥 Cold Starts on Free Tier
- Free tier services **spin down after 15 minutes** of inactivity
- First request after spin-down takes **30-60 seconds** to wake up
- Upgrade to **Starter plan** ($7/month) to avoid this

#### 🗃️ Database Considerations
- Free PostgreSQL database **expires after 90 days**
- **Data is deleted** when it expires
- Upgrade to paid plan for production use

#### 📦 Monorepo Configuration
Since you're using a monorepo with pnpm workspaces:

1. **Set Root Directory**: `artifacts/api-server`
2. **Modify Build Command** (if needed):
   ```bash
   cd ../.. && pnpm install && cd artifacts/api-server && pnpm run build
   ```

#### 🔐 Environment Variables Best Practices
- Never commit `.env` files
- Use Render's dashboard to set sensitive variables
- Set `sync: false` for secrets in render.yaml
- Use `generateValue: true` for random secrets

---

### Step 5: Database Migration (If Using Drizzle)

After deployment, you may need to run migrations:

1. **Go to Shell tab** in Render dashboard
2. **Run migrations**:
   ```bash
   cd artifacts/api-server
   pnpm drizzle-kit push
   # or
   pnpm drizzle-kit migrate
   ```

Or connect to your database locally and run migrations:
```bash
DATABASE_URL=<your-render-postgres-url> pnpm drizzle-kit push
```

---

### Step 6: Verify Deployment

Test your endpoints:
```bash
# Health check
curl https://your-service.onrender.com/api/health

# Test API (example)
curl https://your-service.onrender.com/api/auth/status
```

---

### Troubleshooting

#### Build Fails with pnpm
**Error**: `pnpm: command not found`

**Solution**: Render uses npm by default. Add this to your build command:
```bash
npm install -g pnpm && pnpm install && pnpm run build
```

#### Port Binding Error
**Error**: `EADDRINUSE: address already in use`

**Solution**: Make sure you're using `process.env.PORT` (Render sets this to 10000)

#### Database Connection Error
**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
- Verify DATABASE_URL is correct
- Check if database is in the same region
- Ensure database allows external connections

#### Module Not Found
**Error**: `Cannot find module 'xyz'`

**Solution**:
- Check if the module is in `external` array in `build.mjs`
- Ensure all dependencies are in `dependencies` (not `devDependencies`)

#### Out of Memory
**Error**: `JavaScript heap out of memory`

**Solution**:
- Upgrade to a higher plan
- Optimize build process
- Reduce bundle size

---

### Monitoring and Logs

1. **View Logs**: Go to your service → **Logs** tab
2. **Metrics**: Monitor CPU, Memory, Response times
3. **Alerts**: Set up notifications for failures
4. **Custom Domain**: Add your domain in **Settings** → **Custom Domains**

---

### Auto-Deployment

Render automatically deploys when you push to your connected branch:
1. Push code to GitHub
2. Render detects changes
3. Builds and deploys automatically
4. Zero downtime deployment

**Disable Auto-Deploy** (if needed):
- Go to **Settings** → **Auto-Deploy** → Toggle off

---

### Scaling Considerations

**Free Tier**: 512 MB RAM, 0.1 CPU
**Starter**: 1 GB RAM, 0.5 CPU - $7/month
**Standard**: 2 GB RAM, 1 CPU - $25/month
**Pro**: 4 GB RAM, 2 CPU - $85/month

For production, consider:
- **Starter or higher** to avoid cold starts
- **Paid PostgreSQL** for data persistence
- **Redis** for Socket.IO scaling (if multiple instances)
- **CDN** for static assets

---

## Frontend Deployment to Vercel

Coming in the next section...



---
---

## Frontend Deployment to Vercel

### Prerequisites
- GitHub account with your repository pushed
- Vercel account (free tier available)
- Backend deployed and running (API URL from Render)

---

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Prepare Your Frontend

Make sure your frontend has environment variables configured. Create `.env.production` if needed:

```bash
# In artifacts/app directory
VITE_API_URL=https://your-render-api.onrender.com
VITE_API_BASE_URL=https://your-render-api.onrender.com/api
VITE_SOCKET_URL=https://your-render-api.onrender.com
NODE_ENV=production
```

---

#### Step 2: Sign Up / Log In to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. **Connect with GitHub** (recommended)
4. Authorize Vercel to access your repositories

---

#### Step 3: Import Your Project

1. **Click "Add New..."** → **"Project"**
2. **Import Git Repository**:
   - Find your `Digivant-Solutions` repository
   - Click **"Import"**

---

#### Step 4: Configure Project Settings

Vercel will detect it's a monorepo. Configure:

```
Framework Preset: Vite
Root Directory: artifacts/app
Build Command: pnpm run build
Output Directory: dist
Install Command: pnpm install
Node.js Version: 20.x (or 18.x)
```

**Important**: Make sure to set the **Root Directory** to `artifacts/app`

---

#### Step 5: Add Environment Variables

In the **Environment Variables** section, add:

**Required:**
```
VITE_API_URL = https://your-service.onrender.com
VITE_API_BASE_URL = https://your-service.onrender.com/api
VITE_SOCKET_URL = https://your-service.onrender.com
NODE_ENV = production
```

**Tips:**
- Use the actual URL from your Render deployment
- Variables prefixed with `VITE_` are exposed to the browser
- Don't put secrets here (they're public in the browser)

---

#### Step 6: Deploy

1. **Click "Deploy"**
2. Vercel will:
   - Clone your repository
   - Install dependencies with pnpm
   - Build your React app with Vite
   - Deploy to global CDN

3. **First deployment takes 2-5 minutes**
4. Watch real-time logs in the deployment page

---

#### Step 7: Get Your Frontend URL

After successful deployment:
- **Production URL**: `https://your-project.vercel.app`
- Vercel automatically assigns a URL
- Access your app immediately

**Test Your Frontend**:
1. Open the URL in browser
2. Check if it connects to your backend
3. Test login/signup functionality
4. Verify Socket.IO real-time features

---

### Method 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

#### Step 3: Deploy from Project Directory

```bash
cd artifacts/app
vercel
```

**Follow the prompts:**
```
? Set up and deploy "~/artifacts/app"? Y
? Which scope? Your username
? Link to existing project? N
? What's your project's name? digivant-frontend
? In which directory is your code located? ./
? Want to modify settings? Y
  - Build Command: pnpm run build
  - Output Directory: dist
  - Development Command: pnpm run dev
```

#### Step 4: Set Environment Variables

```bash
vercel env add VITE_API_URL production
# Enter: https://your-service.onrender.com

vercel env add VITE_API_BASE_URL production
# Enter: https://your-service.onrender.com/api

vercel env add VITE_SOCKET_URL production
# Enter: https://your-service.onrender.com
```

#### Step 5: Deploy to Production

```bash
vercel --prod
```

---

### Important Vercel Configuration

#### Handling Client-Side Routing (Wouter/React Router)

Your app uses `wouter` for routing. The `vercel.json` file has been created with rewrites to handle client-side routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures all routes are handled by your React app.

---

### Connecting Frontend to Backend

#### Update Backend CORS Settings

Your backend needs to allow requests from your Vercel domain. Update your backend's CORS configuration:

**In `artifacts/api-server/src/app.ts`** (or wherever CORS is configured):

```typescript
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:80',
      'https://your-project.vercel.app', // Add your Vercel URL
      'https://*.vercel.app', // Allow all Vercel preview URLs
    ],
    credentials: true,
  })
);
```

**Then redeploy your backend on Render.**

---

### Step 8: Configure Custom Domain (Optional)

#### Add Your Domain to Vercel:

1. Go to your project **Settings** → **Domains**
2. **Add Domain**: `yourdomain.com`
3. **Add DNS Records** (at your domain registrar):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. **Wait for DNS propagation** (can take up to 48 hours)

#### Update Backend CORS:

Add your custom domain to CORS origins:
```typescript
origin: [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
]
```

---

### Auto-Deployment

Vercel automatically deploys on every push:

**Production Deployment:**
- Triggered by pushes to `main` branch
- URL: `your-project.vercel.app`

**Preview Deployments:**
- Triggered by pull requests
- Each PR gets a unique preview URL
- Perfect for testing before merging

**Disable Auto-Deploy:**
- Go to **Settings** → **Git** → **Production Branch**
- Uncheck **"Automatic deployments"**

---

### Vercel Features & Best Practices

#### 🚀 Performance
- **Global CDN**: 99 edge locations worldwide
- **Automatic HTTPS**: SSL certificates included
- **Image Optimization**: Use `<Image>` component (if migrating to Next.js)
- **Build Cache**: Faster rebuilds

#### 🔐 Security
- **Environment Variables**: Encrypted at rest
- **HTTPS Everywhere**: Automatic SSL
- **DDoS Protection**: Built-in
- **Secure Headers**: Configure in `vercel.json`

#### 📊 Monitoring
- **Analytics**: Track page views, performance
- **Real-time Logs**: View build and runtime logs
- **Error Tracking**: Integrate with Sentry

#### 🌐 Domains
- **Free `.vercel.app` subdomain**
- **Custom domains supported** (free)
- **Multiple domains** per project

---

### Troubleshooting Vercel

#### Build Fails with pnpm

**Error**: `pnpm: command not found`

**Solution**: Vercel supports pnpm by default, but ensure your `package.json` has:
```json
{
  "packageManager": "pnpm@10.0.0"
}
```

Or set in Vercel dashboard: **Settings** → **General** → **Package Manager** → `pnpm`

---

#### Environment Variables Not Working

**Error**: `VITE_API_URL is undefined`

**Solution**:
- Make sure variables are prefixed with `VITE_`
- Rebuild the project (env vars are baked into build)
- Check variable names (case-sensitive)

---

#### CORS Errors

**Error**: `Access to fetch has been blocked by CORS policy`

**Solution**:
- Add Vercel URL to backend CORS origins
- Include `credentials: true` in CORS config
- Redeploy backend after CORS changes

---

#### 404 on Refresh

**Error**: Direct URL access returns 404

**Solution**: Ensure `vercel.json` has rewrites (already created):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

#### Build Output Too Large

**Error**: `Build exceeded maximum size`

**Solution**:
- Analyze bundle size: `pnpm run build -- --mode analyze`
- Remove unused dependencies
- Code split with lazy loading
- Use dynamic imports

---

### Environment-Specific Configuration

Create different env files:

**`.env.development`** (local):
```
VITE_API_URL=http://localhost:8080
```

**`.env.production`** (Vercel):
```
VITE_API_URL=https://your-api.onrender.com
```

**In Vercel dashboard**, environment variables override these files.

---

### Vercel Free Tier Limits

- ✅ **Unlimited deployments**
- ✅ **100 GB bandwidth per month**
- ✅ **6,000 build minutes per month**
- ✅ **Automatic HTTPS**
- ✅ **Custom domains**
- ✅ **Preview deployments**
- ❌ No password protection (Pro only)
- ❌ No advanced analytics (Pro only)

**Upgrade to Pro** ($20/month per member) for:
- Team collaboration
- Password protection
- Advanced analytics
- Priority support

---

### Complete Deployment Checklist

#### ✅ Backend (Render)
- [ ] PostgreSQL database created
- [ ] Web service deployed
- [ ] Environment variables set
- [ ] DATABASE_URL configured
- [ ] SESSION_SECRET generated
- [ ] Health check passing
- [ ] CORS configured for Vercel
- [ ] Database migrations run
- [ ] API endpoints tested

#### ✅ Frontend (Vercel)
- [ ] Project imported from GitHub
- [ ] Root directory set to `artifacts/app`
- [ ] Environment variables configured
- [ ] VITE_API_URL points to Render
- [ ] Build successful
- [ ] Deployment accessible
- [ ] API connection working
- [ ] Socket.IO connected
- [ ] Authentication working
- [ ] Custom domain added (optional)

---

### Post-Deployment Testing

Test these critical flows:

1. **Authentication**:
   ```bash
   # Sign up
   curl -X POST https://your-app.vercel.app/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **API Connection**:
   - Open browser console
   - Check Network tab
   - Verify API calls to Render

3. **Socket.IO**:
   - Open multiple browser tabs
   - Test real-time features
   - Check console for connection status

4. **Performance**:
   - Run Lighthouse audit
   - Check page load times
   - Test on mobile devices

---

### Maintenance & Updates

#### Update Backend (Render):
```bash
git add .
git commit -m "Backend updates"
git push origin main
# Render auto-deploys
```

#### Update Frontend (Vercel):
```bash
git add .
git commit -m "Frontend updates"
git push origin main
# Vercel auto-deploys
```

#### Update Environment Variables:
- **Render**: Dashboard → Service → Environment
- **Vercel**: Dashboard → Project → Settings → Environment Variables
- Redeploy after changes

---

### Cost Estimation (Monthly)

#### Render (Backend):
- **Free Tier**: $0 (with limitations)
- **Starter**: $7 (no cold starts)
- **Standard**: $25 (better performance)
- **PostgreSQL Free**: $0 (90 days, then $7/month)

#### Vercel (Frontend):
- **Hobby**: $0 (personal projects)
- **Pro**: $20 per member (teams)

#### Total Minimum (Production):
- **Starter + Paid DB + Free Vercel**: ~$14/month
- **Free Everything**: $0 (with limitations)

---

### Additional Resources

#### Documentation:
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

#### Monitoring:
- [Render Metrics](https://dashboard.render.com)
- [Vercel Analytics](https://vercel.com/analytics)
- [Sentry](https://sentry.io) (Error tracking)

#### Support:
- Render: [Community Forum](https://community.render.com)
- Vercel: [Discord](https://vercel.com/discord)

---

## 🎉 Congratulations!

Your application is now deployed:
- **Backend**: https://your-service.onrender.com
- **Frontend**: https://your-project.vercel.app

Remember to:
- Monitor logs regularly
- Set up error tracking
- Configure backups
- Update dependencies
- Scale as needed

Happy deploying! 🚀
