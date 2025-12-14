# 🔍 API Connection Diagnostic Guide

## Current Issue
**Error:** `Failed to fetch` when connecting to `https://api.dvisionacademy.com/api/student/login`

**Meaning:** Request cannot reach the backend server. This is a **network/infrastructure** issue, not a code issue.

---

## ✅ Quick Diagnostic Tests

Run these tests **on your Contabo VPS** to identify the exact problem:

### Test 1: Check if Backend is Running Locally
```bash
curl http://localhost:5000/health
```
**Expected:** `{"success":true,"message":"Backend is running"}`
**If fails:** Backend not running → `pm2 restart dvbackend`

---

### Test 2: Check if Nginx is Running
```bash
sudo systemctl status nginx
```
**Expected:** `active (running)`
**If fails:** `sudo systemctl start nginx`

---

### Test 3: Check if API Subdomain Config Exists
```bash
ls -la /etc/nginx/sites-available/api.dvisionacademy.com
ls -la /etc/nginx/sites-enabled/api.dvisionacademy.com
```
**Expected:** Both files should exist
**If missing:** Need to create Nginx config (see below)

---

### Test 4: Check DNS Resolution
```bash
nslookup api.dvisionacademy.com
```
**Expected:** Should return `62.171.148.215`
**If fails/wrong:** Need to add/update DNS A record in Hostinger

---

### Test 5: Test HTTP (Before SSL)
```bash
curl -v http://api.dvisionacademy.com/health
```
**Expected:** HTTP 200 with JSON response
**If fails:** Nginx not configured or DNS not working

---

### Test 6: Test HTTPS (After SSL)
```bash
curl -v https://api.dvisionacademy.com/health
```
**Expected:** HTTP 200 with JSON response
**If fails:** SSL certificate not installed

---

### Test 7: Check SSL Certificate
```bash
sudo certbot certificates
```
**Expected:** Should list `api.dvisionacademy.com` certificate
**If missing:** Need to install SSL → `sudo certbot --nginx -d api.dvisionacademy.com`

---

### Test 8: Check Nginx Error Logs
```bash
sudo tail -50 /var/log/nginx/error.log
```
Look for any error messages related to `api.dvisionacademy.com`

---

## 🔧 Most Likely Solutions

### Solution 1: Nginx Config Missing (Most Common)

**Create the config file:**
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

**Enable it:**
```bash
sudo ln -s /etc/nginx/sites-available/api.dvisionacademy.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Solution 2: SSL Certificate Missing

**Install SSL:**
```bash
sudo certbot --nginx -d api.dvisionacademy.com
```

**Verify:**
```bash
curl https://api.dvisionacademy.com/health
```

---

### Solution 3: DNS Not Configured

**Go to Hostinger DNS settings:**
1. Add A record:
   - **Name:** `api`
   - **Type:** `A`
   - **Value:** `62.171.148.215`
   - **TTL:** `3600`

2. Wait 5-15 minutes for DNS propagation

3. Test:
   ```bash
   nslookup api.dvisionacademy.com
   ```

---

### Solution 4: Use Quick Fix Script

**Run the automated fix script:**
```bash
cd ~/dvision/backend
bash fix-api-subdomain.sh
```

This will:
- Create Nginx config
- Enable it
- Install SSL
- Test everything

---

## 📊 Diagnostic Results Checklist

Fill this out after running tests:

- [ ] Test 1: Backend local test → `curl http://localhost:5000/health`
- [ ] Test 2: Nginx running → `sudo systemctl status nginx`
- [ ] Test 3: Nginx config exists → `ls -la /etc/nginx/sites-available/api.dvisionacademy.com`
- [ ] Test 4: DNS resolves → `nslookup api.dvisionacademy.com`
- [ ] Test 5: HTTP works → `curl http://api.dvisionacademy.com/health`
- [ ] Test 6: HTTPS works → `curl https://api.dvisionacademy.com/health`
- [ ] Test 7: SSL installed → `sudo certbot certificates`
- [ ] Test 8: No Nginx errors → `sudo tail -50 /var/log/nginx/error.log`

---

## 🎯 Expected Final State

After fixes, all these should work:

```bash
# 1. Local backend
curl http://localhost:5000/health
# ✅ {"success":true,"message":"Backend is running"}

# 2. HTTP via domain
curl http://api.dvisionacademy.com/health
# ✅ {"success":true,"message":"Backend is running"}

# 3. HTTPS via domain
curl https://api.dvisionacademy.com/health
# ✅ {"success":true,"message":"Backend is running"}

# 4. Browser test
# Open: https://api.dvisionacademy.com/health
# ✅ Should show JSON in browser
```

---

## 🚨 If Still Not Working

**Share the outputs of:**
1. `curl -v http://localhost:5000/health`
2. `curl -v http://api.dvisionacademy.com/health`
3. `curl -v https://api.dvisionacademy.com/health`
4. `sudo nginx -t`
5. `sudo certbot certificates`
6. `nslookup api.dvisionacademy.com`

I'll provide exact fix based on the results! 🔧

