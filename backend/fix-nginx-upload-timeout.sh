#!/bin/bash

# Fix Nginx Timeout for Large File Uploads
# Run on Contabo VPS

echo "🔧 Fixing Nginx timeout for recording uploads..."

# Check if config file exists
CONFIG_FILE="/etc/nginx/sites-available/api.dvisionacademy.com"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Nginx config file not found: $CONFIG_FILE"
    echo "   Please run fix-api-subdomain.sh first"
    exit 1
fi

# Backup original config
echo "📦 Backing up original config..."
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if SSL config exists
if grep -q "listen 443 ssl" "$CONFIG_FILE"; then
    echo "✅ SSL configuration detected"
    HAS_SSL=true
else
    echo "⚠️  SSL configuration not found (HTTP only)"
    HAS_SSL=false
fi

# Create updated config
echo "📝 Updating Nginx configuration..."

if [ "$HAS_SSL" = true ]; then
    # Update both HTTP and HTTPS blocks
    sudo tee "$CONFIG_FILE" > /dev/null <<'EOF'
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
EOF
else
    # HTTP only
    sudo tee "$CONFIG_FILE" > /dev/null <<'EOF'
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
EOF
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    
    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    
    # Check status
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx restarted successfully"
    else
        echo "❌ Nginx failed to start. Check logs: sudo journalctl -u nginx"
        exit 1
    fi
else
    echo "❌ Nginx config has errors. Restoring backup..."
    sudo cp "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)" "$CONFIG_FILE"
    exit 1
fi

# Test health endpoint
echo "🧪 Testing API endpoint..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://api.dvisionacademy.com/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API endpoint is working!"
    echo ""
    echo "📋 Summary:"
    echo "   - Client max body size: 500MB"
    echo "   - Proxy timeouts: 30 minutes"
    echo "   - Buffering: Disabled"
    echo "   - Status: ✅ Ready for large file uploads"
else
    echo "⚠️  API endpoint returned HTTP $HTTP_CODE"
    echo "   Check: curl https://api.dvisionacademy.com/health"
fi

echo ""
echo "✅ Done! Recording uploads should work now."

