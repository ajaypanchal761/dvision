#!/bin/bash

# Quick Fix Script for API Subdomain Setup
# Run on Contabo VPS

echo "🔧 Setting up api.dvisionacademy.com subdomain..."

# Step 1: Create Nginx config
echo "📝 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/api.dvisionacademy.com > /dev/null <<EOF
server {
    listen 80;
    server_name api.dvisionacademy.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Step 2: Enable config
echo "🔗 Enabling Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/api.dvisionacademy.com /etc/nginx/sites-enabled/

# Step 3: Test Nginx
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    sudo systemctl restart nginx
    echo "✅ Nginx restarted"
else
    echo "❌ Nginx config has errors. Please check manually."
    exit 1
fi

# Step 4: Test HTTP
echo "🧪 Testing HTTP connection..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://api.dvisionacademy.com/health)

if [ "$HTTP_RESPONSE" = "200" ]; then
    echo "✅ HTTP is working"
else
    echo "⚠️  HTTP test returned: $HTTP_RESPONSE"
    echo "   This might be normal if DNS hasn't propagated yet"
fi

# Step 5: Install SSL
echo "🔐 Installing SSL certificate..."
sudo certbot --nginx -d api.dvisionacademy.com --non-interactive --agree-tos --redirect

# Step 6: Test HTTPS
echo "🧪 Testing HTTPS connection..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.dvisionacademy.com/health)

if [ "$HTTPS_RESPONSE" = "200" ]; then
    echo "✅ HTTPS is working!"
    echo ""
    echo "🎉 Setup complete!"
    echo "✅ Test: curl https://api.dvisionacademy.com/health"
else
    echo "⚠️  HTTPS test returned: $HTTPS_RESPONSE"
    echo "   SSL might need manual configuration"
fi

echo ""
echo "📋 Next steps:"
echo "1. Verify DNS: nslookup api.dvisionacademy.com"
echo "2. Test API: curl https://api.dvisionacademy.com/api/health"
echo "3. Update Vercel ENV: VITE_API_BASE_URL=https://api.dvisionacademy.com/api"

