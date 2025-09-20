# 🌐 Netlify Custom Domain Setup Guide

## DNS Configuration for dashboard.organizedai.vip

### Required DNS Record (Recommended)

```
Type: CNAME
Name: dashboard
Value: claude-code-optimizer-dashboard.netlify.app
TTL: 300 (5 minutes)
```

### Alternative DNS Records (If CNAME doesn't work)

```
Type: A
Name: dashboard  
Value: 75.2.60.5
TTL: 300

Type: AAAA (IPv6)
Name: dashboard
Value: 2600:1f18:3b24:0:0:0:0:5
TTL: 300
```

## Setup Process

### Step 1: Add DNS Records
1. Login to your DNS provider (where organizedai.vip is managed)
2. Navigate to DNS management
3. Add the CNAME record as shown above
4. Save changes

### Step 2: Configure in Netlify (Web Interface)
1. Visit: https://app.netlify.com/projects/claude-code-optimizer-dashboard
2. Go to "Domain settings" or "Site settings" → "Domain management"
3. Click "Add custom domain"
4. Enter: `dashboard.organizedai.vip`
5. Netlify will verify DNS and provision SSL certificate

### Step 3: Verification
After DNS propagation (5-30 minutes):

```bash
# Test DNS resolution
nslookup dashboard.organizedai.vip

# Test HTTPS access
curl -I https://dashboard.organizedai.vip
```

Expected result: 200 OK response

## Troubleshooting

### DNS Not Propagating
- Wait up to 48 hours for full propagation
- Use online DNS checkers: whatsmydns.net
- Clear local DNS cache: `sudo dscacheutil -flushcache`

### SSL Certificate Issues
- Netlify automatically provisions Let's Encrypt certificates
- May take 24 hours after DNS verification
- Force HTTPS redirect will be enabled automatically

### Domain Conflicts
- Ensure no existing A/CNAME records for 'dashboard' subdomain
- Remove any conflicting DNS entries

## Current Status

- ✅ **Netlify Site**: claude-code-optimizer-dashboard.netlify.app
- ✅ **Public Access**: Working (200 OK)
- ✅ **SSL**: Auto-configured on netlify.app domain
- ⏳ **Custom Domain**: Pending DNS configuration
- ⏳ **Custom SSL**: Will auto-provision after DNS verification

## Post-Setup Verification

Once configured, verify:

1. **HTTP Redirect**: http://dashboard.organizedai.vip → https://dashboard.organizedai.vip
2. **SSL Certificate**: Valid Let's Encrypt certificate
3. **Dashboard Loading**: Full Claude Code Optimizer interface
4. **Performance**: <3s load time globally

## Support

- **Netlify Docs**: https://docs.netlify.com/domains-https/custom-domains/
- **Project Admin**: https://app.netlify.com/projects/claude-code-optimizer-dashboard
- **DNS Verification**: https://whatsmydns.net/