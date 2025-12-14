# 🔧 Fix: Recording Upload Network Error

## 🔴 Problem
Recording upload fails with "Failed to fetch" error on production (`api.dvisionacademy.com`).

**Error:**
```
[Teacher API] Network Error: Failed to fetch
```

## ✅ Root Cause
Nginx reverse proxy has default timeouts (60 seconds) that are too short for large file uploads (recordings can be 100-500MB).

## 🚀 Solution: Update Nginx Configuration

### Step 1: SSH into Contabo VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Edit Nginx Config
```bash
sudo nano /etc/nginx/sites-available/api.dvisionacademy.com
```

### Step 3: Add Timeout Settings
Add these settings inside the `location /` block:

```nginx
server {
    listen 80;
    server_name api.dvisionacademy.com;

    # Increase client body size limit (for large uploads)
    client_max_body_size 500M;
    
    # Increase timeouts for large file uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 1800s;      # 30 minutes
    proxy_read_timeout 1800s;       # 30 minutes
    send_timeout 1800s;              # 30 minutes

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # Keep connection alive
        proxy_set_header Connection "";
        
        # Standard proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Test and Restart Nginx
```bash
# Test configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Step 5: Verify
```bash
# Test health endpoint
curl https://api.dvisionacademy.com/health

# Should return: {"success":true,"message":"Backend is running"}
```

## 📋 Complete Nginx Config Example

**Full config file (`/etc/nginx/sites-available/api.dvisionacademy.com`):**

```nginx
server {
    listen 80;
    server_name api.dvisionacademy.com;

    # Increase client body size limit
    client_max_body_size 500M;
    
    # Increase timeouts for large file uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 1800s;      # 30 minutes
    proxy_read_timeout 1800s;       # 30 minutes
    send_timeout 1800s;              # 30 minutes

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # Keep connection alive
        proxy_set_header Connection "";
        
        # Standard proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
        
        proxy_cache_bypass $http_upgrade;
    }
}

# SSL configuration (if using certbot)
server {
    listen 443 ssl http2;
    server_name api.dvisionacademy.com;

    ssl_certificate /etc/letsencrypt/live/api.dvisionacademy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.dvisionacademy.com/privkey.pem;
    
    # Include SSL configuration
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Increase client body size limit
    client_max_body_size 500M;
    
    # Increase timeouts for large file uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 1800s;      # 30 minutes
    proxy_read_timeout 1800s;       # 30 minutes
    send_timeout 1800s;              # 30 minutes

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # Keep connection alive
        proxy_set_header Connection "";
        
        # Standard proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 Troubleshooting

### Check Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Check Nginx Access Logs
```bash
sudo tail -f /var/log/nginx/access.log
```

### Test Upload Manually
```bash
# Create a test file
dd if=/dev/zero of=test-upload.bin bs=1M count=100

# Upload via curl
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "recording=@test-upload.bin" \
  https://api.dvisionacademy.com/api/live-classes/teacher/live-classes/TEST_ID/upload-recording
```

## ✅ Verification Checklist

After applying the fix:

- [ ] Nginx config test passes: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`
- [ ] Health endpoint works: `curl https://api.dvisionacademy.com/health`
- [ ] Upload endpoint accessible (check browser network tab)
- [ ] Large file uploads complete successfully (test with 100MB+ file)

## 📝 Notes

1. **Timeout Values:**
   - `proxy_send_timeout`: Time to send request to backend (30 min)
   - `proxy_read_timeout`: Time to read response from backend (30 min)
   - `send_timeout`: Time to send response to client (30 min)

2. **File Size:**
   - `client_max_body_size`: Maximum upload size (500MB)
   - Backend also has 500MB limit in Multer config

3. **Buffering:**
   - `proxy_buffering off`: Disable response buffering
   - `proxy_request_buffering off`: Disable request buffering
   - This allows streaming large files without memory issues

## 🆘 If Still Not Working

1. **Check Backend Logs:**
   ```bash
   pm2 logs dvbackend
   ```

2. **Check if Backend is Running:**
   ```bash
   pm2 status
   ```

3. **Test Direct Connection (bypass Nginx):**
   ```bash
   curl http://localhost:5000/health
   ```

4. **Check Firewall:**
   ```bash
   sudo ufw status
   ```

5. **Check Disk Space:**
   ```bash
   df -h
   ```

