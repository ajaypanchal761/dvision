# 🚀 Quick Fix: API Connection Issue

## 🔴 Current Problem
Frontend cannot connect to `https://api.dvisionacademy.com` - getting "Failed to fetch" error.

## ✅ Solution: Run This on VPS

**SSH into your Contabo VPS and run:**

```bash
cd ~/dvision/backend
bash fix-api-subdomain.sh
```

**OR manually run these commands:**

```bash
# 1. Create Nginx config
sudo tee /etc/nginx/sites-available/api.dvisionacademy.com > /dev/null <<'EOF'
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
EOF

# 2. Enable config
sudo ln -sf /etc/nginx/sites-available/api.dvisionacademy.com /etc/nginx/sites-enabled/

# 3. Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx

# 4. Install SSL
sudo certbot --nginx -d api.dvisionacademy.com --non-interactive --agree-tos --redirect

# 5. Test connection
curl https://api.dvisionacademy.com/health
```

**Expected output:**
```json
{"success":true,"message":"Backend is running"}
```

---

## 🧪 Test After Fix

**1. Test in browser:**
```
https://api.dvisionacademy.com/health
```

**2. Test from frontend:**
Deploy the test page: `frontend/public/test-api.html`
Then visit: `https://dvisionacademy.com/test-api.html`

**3. Test login:**
Try login from frontend - should work now!

---

## 📋 Checklist

After running the fix, verify:

- [ ] `curl http://localhost:5000/health` → Works
- [ ] `curl http://api.dvisionacademy.com/health` → Works  
- [ ] `curl https://api.dvisionacademy.com/health` → Works
- [ ] Browser: `https://api.dvisionacademy.com/health` → Shows JSON
- [ ] Frontend login → No network error

---

## 🔍 If Still Not Working

**Share output of:**
```bash
curl -v https://api.dvisionacademy.com/health
sudo nginx -t
sudo certbot certificates
nslookup api.dvisionacademy.com
pm2 status
```

I'll help debug further! 🔧

