# 🚀 Production Deployment Guide - Dvision Academy

## ✅ Code Fixes Applied

### 1. Frontend API URL Configuration ✅
- ✅ Trailing slash handling added
- ✅ Auto-detection for production (api.dvisionacademy.com)
- ✅ Environment variable priority set correctly

### 2. Backend Server Configuration ✅
- ✅ Routes properly mounted: `app.use('/api', apiRoutes)`
- ✅ Listen on `0.0.0.0` for VPS access
- ✅ CORS configured for Vercel + domain
- ✅ Health check endpoint: `/health`

---

## 📋 Step-by-Step Deployment Checklist

### STEP 1: Vercel Environment Variable (CRITICAL)

**Vercel Dashboard → Project → Settings → Environment Variables**

Add:
```
VITE_API_BASE_URL=https://api.dvisionacademy.com/api
```

**Important:**
- ✅ Must include `/api` at the end
- ✅ Must use `https://`
- ❌ No trailing slash

**After adding:**
1. Go to Deployments tab
2. Click "Redeploy" on latest deployment
3. Wait for build to complete

---

### STEP 2: Backend Server (Contabo VPS)

**Current Status:**
- ✅ PM2 running: `dvbackend`
- ✅ Routes mounted correctly
- ✅ Listen on `0.0.0.0`

**Verify Backend:**
```bash
# On VPS
curl http://localhost:5000/health
# Should return: {"success":true,"message":"Backend is running"}
```

**Restart if needed:**
```bash
pm2 restart dvbackend
pm2 logs dvbackend
```

---

### STEP 3: Nginx Configuration (API Subdomain)

**File:** `/etc/nginx/sites-available/api.dvisionacademy.com`

**Content:**
```nginx
server {
    listen 80;
    server_name api.dvisionacademy.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable & Test:**
```bash
sudo ln -s /etc/nginx/sites-available/api.dvisionacademy.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### STEP 4: SSL Certificate (HTTPS)

**Install SSL:**
```bash
sudo certbot --nginx -d api.dvisionacademy.com
```

**Auto-renewal test:**
```bash
sudo certbot renew --dry-run
```

---

### STEP 5: DNS Verification

**Check DNS resolution:**
```bash
nslookup api.dvisionacademy.com
# Should return: 62.171.148.215
```

**Test HTTP:**
```bash
curl http://api.dvisionacademy.com/health
```

**Test HTTPS:**
```bash
curl https://api.dvisionacademy.com/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Backend is running"
}
```

---

### STEP 6: Final API Endpoint Test

**Test Login Endpoint:**
```bash
curl -X POST https://api.dvisionacademy.com/api/student/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+917610416911"}'
```

**Expected:**
- ✅ Status 200 or 400 (not network error)
- ✅ JSON response (not "Failed to fetch")

---

## 🧪 Verification Checklist

| Check | Command/URL | Expected Result |
|-------|------------|-----------------|
| Backend local | `curl http://localhost:5000/health` | JSON response |
| Backend via domain | `curl https://api.dvisionacademy.com/health` | JSON response |
| API endpoint | `curl https://api.dvisionacademy.com/api/student/login` | 400/200 (not network error) |
| Frontend ENV | Vercel dashboard | `https://api.dvisionacademy.com/api` |
| DNS resolve | `nslookup api.dvisionacademy.com` | `62.171.148.215` |
| SSL working | Browser: `https://api.dvisionacademy.com/health` | Green lock + JSON |

---

## 🔧 Troubleshooting

### Issue: Network Error / Failed to fetch

**Check 1: Environment Variable**
- Vercel → Settings → Environment Variables
- Ensure: `VITE_API_BASE_URL=https://api.dvisionacademy.com/api`
- Redeploy after change

**Check 2: Backend Running**
```bash
pm2 status
pm2 logs dvbackend
```

**Check 3: Nginx Proxy**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Check 4: DNS**
```bash
ping api.dvisionacademy.com
# Should ping 62.171.148.215
```

**Check 5: SSL**
```bash
curl -I https://api.dvisionacademy.com/health
# Should return 200 OK
```

---

## 📝 Important Notes

1. **Frontend ENV Format:**
   - ✅ Correct: `https://api.dvisionacademy.com/api`
   - ❌ Wrong: `https://api.dvisionacademy.com` (missing /api)
   - ❌ Wrong: `https://api.dvisionacademy.com/api/` (trailing slash)

2. **Backend Routes:**
   - All routes are mounted under `/api`
   - Final URL: `https://api.dvisionacademy.com/api/student/login`

3. **CORS:**
   - Already configured for `dvisionacademy.com` and Vercel
   - No changes needed

4. **PM2:**
   - Backend should run via PM2 in production
   - Auto-restart on server reboot: `pm2 startup`

---

## ✅ Final Status

After completing all steps:

- ✅ Frontend (Vercel) → `https://dvisionacademy.com`
- ✅ Backend API (Contabo) → `https://api.dvisionacademy.com`
- ✅ All API calls → `https://api.dvisionacademy.com/api/*`
- ✅ No Network Errors
- ✅ Production Ready 🚀

---

## 🆘 If Still Getting Errors

**Send these details:**

1. Browser console error (full message)
2. Network tab screenshot (showing request URL)
3. `curl https://api.dvisionacademy.com/health` output
4. `pm2 logs dvbackend --lines 20` output
5. Vercel environment variables screenshot

