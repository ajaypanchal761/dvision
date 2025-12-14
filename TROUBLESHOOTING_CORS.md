# 🔧 CORS & Network Error Troubleshooting Guide

## 🔴 Current Error Analysis

**Error:** `CORS request did not succeed. Status code: (null)`

**Meaning:** Request is not reaching the server at all. This is NOT a CORS configuration issue, but a **network/SSL/DNS issue**.

---

## ✅ Step-by-Step Fix

### STEP 1: Verify API Subdomain is Accessible

**Test in browser:**
```
https://api.dvisionacademy.com/health
```

**Expected:**
- ✅ JSON response: `{"success":true,"message":"Backend is running"}`
- ❌ If "This site can't be reached" → SSL/DNS issue

---

### STEP 2: Check SSL Certificate on API Subdomain

**On VPS, run:**
```bash
sudo certbot certificates
```

**If api.dvisionacademy.com is NOT listed:**
```bash
sudo certbot --nginx -d api.dvisionacademy.com
```

**Verify SSL:**
```bash
curl -I https://api.dvisionacademy.com/health
# Should return: HTTP/2 200
```

---

### STEP 3: Verify Nginx Configuration

**Check if config exists:**
```bash
ls -la /etc/nginx/sites-available/api.dvisionacademy.com
ls -la /etc/nginx/sites-enabled/api.dvisionacademy.com
```

**If missing, create:**
```bash
sudo nano /etc/nginx/sites-available/api.dvisionacademy.com
```

**Paste this:**
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

### STEP 4: Test HTTP First (Before SSL)

**Test HTTP:**
```bash
curl http://api.dvisionacademy.com/health
```

**If this works:**
- ✅ Nginx is configured correctly
- ✅ Backend is accessible
- ⚠️ SSL needs to be installed

**If this fails:**
- ❌ Nginx not configured
- ❌ DNS not resolving
- ❌ Backend not running

---

### STEP 5: DNS Verification

**Check DNS:**
```bash
nslookup api.dvisionacademy.com
# Should return: 62.171.148.215
```

**If wrong IP or no response:**
- Go to Hostinger DNS
- Verify A record: `api` → `62.171.148.215`
- Wait 5-15 minutes for propagation

---

### STEP 6: Backend Server Check

**Verify backend is running:**
```bash
pm2 status
pm2 logs dvbackend --lines 20
```

**Test local backend:**
```bash
curl http://localhost:5000/health
# Should return JSON
```

---

### STEP 7: Firewall Check

**Check if port 5000 is accessible:**
```bash
sudo ufw status
sudo netstat -tulpn | grep 5000
```

**If needed:**
```bash
sudo ufw allow 5000
sudo ufw reload
```

---

## 🧪 Quick Diagnostic Commands

Run these on VPS and share output:

```bash
# 1. Backend status
pm2 status
curl http://localhost:5000/health

# 2. Nginx config
sudo nginx -t
sudo nginx -T | grep api.dvisionacademy.com

# 3. SSL status
sudo certbot certificates

# 4. DNS
nslookup api.dvisionacademy.com

# 5. HTTP test
curl -v http://api.dvisionacademy.com/health

# 6. HTTPS test
curl -v https://api.dvisionacademy.com/health
```

---

## ✅ Expected Final State

After all fixes:

1. ✅ `curl http://localhost:5000/health` → JSON
2. ✅ `curl http://api.dvisionacademy.com/health` → JSON
3. ✅ `curl https://api.dvisionacademy.com/health` → JSON
4. ✅ Browser: `https://api.dvisionacademy.com/health` → JSON
5. ✅ Frontend login → No network error

---

## 🔴 Most Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| SSL not installed | HTTPS fails, HTTP works | `sudo certbot --nginx -d api.dvisionacademy.com` |
| Nginx not configured | 404 or connection refused | Create nginx config file |
| DNS not resolved | NXDOMAIN error | Add A record in Hostinger |
| Backend not running | Connection refused | `pm2 restart dvbackend` |
| Firewall blocking | Timeout | `sudo ufw allow 5000` |

---

## 📝 Next Steps

1. Run diagnostic commands above
2. Share outputs
3. I'll provide exact fix based on results

**Most likely fix needed:** SSL certificate installation on api subdomain

