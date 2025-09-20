# 🚀 Deployment Guide - Claude Code Optimizer Dashboard

> **Production deployment to dashboard.organizedai.vip**

This directory contains all the necessary files and scripts for deploying the Claude Code Optimizer Dashboard to production at `dashboard.organizedai.vip`.

## 📁 Deployment Files

| File | Description |
|------|-------------|
| `deploy-to-organizedai.sh` | Main deployment script with full automation |
| `validate-deployment.sh` | Post-deployment validation and testing |
| `vercel-config.json` | Production Vercel configuration |
| `production.env` | Production environment variables |
| `README.md` | This deployment guide |

## 🎯 Quick Deployment

### Prerequisites

1. **Vercel CLI installed**:
   ```bash
   npm install -g vercel
   ```

2. **Vercel account with access to organizedai.vip domain**
   
3. **Project built and tested locally**:
   ```bash
   npm install
   npm run build
   npm test
   ```

### One-Command Deployment

```bash
# Run from project root
./deploy/deploy-to-organizedai.sh
```

This script will:
- ✅ Run pre-deployment checks
- ✅ Build the project
- ✅ Run tests and quality checks
- ✅ Deploy to Vercel
- ✅ Configure custom domain
- ✅ Validate deployment
- ✅ Generate deployment report

## 📋 Manual Deployment Steps

If you prefer to deploy manually or troubleshoot issues:

### 1. Pre-deployment Setup

```bash
# Ensure you're in the project root
cd /path/to/moonlock-dashboard

# Install dependencies
npm ci

# Run quality checks
npm run typecheck
npm run lint
npm test

# Build for production
npm run build
```

### 2. Configure Vercel

```bash
# Login to Vercel
vercel login

# Copy production config
cp deploy/vercel-config.json vercel.json

# Set environment variables (if needed)
vercel env add NODE_ENV production
vercel env add VERCEL_ENV production
```

### 3. Deploy to Vercel

```bash
# Deploy to production
vercel --prod --yes

# Configure custom domain
vercel domains add dashboard.organizedai.vip
vercel alias set moonlock-dashboard dashboard.organizedai.vip
```

### 4. Validate Deployment

```bash
# Run validation tests
./deploy/validate-deployment.sh
```

## 🔧 Configuration Details

### Vercel Configuration

The `vercel-config.json` includes:
- **Custom domain**: `dashboard.organizedai.vip`
- **Security headers**: X-Frame-Options, CSP, etc.
- **CORS configuration**: For API endpoints
- **Build optimization**: Vite framework detection
- **Routing**: SPA rewrites and API proxying

### Environment Variables

Production environment variables in `production.env`:
- **Performance**: Caching, compression, rate limiting
- **Security**: CORS, CSRF protection, secure cookies
- **Features**: Calendar integration, agent system
- **Monitoring**: Analytics, error reporting

### Security Features

- ✅ **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- ✅ **Security Headers**: OWASP recommended headers
- ✅ **CORS Protection**: Restricted to production domain
- ✅ **Content Security**: XSS and injection protection
- ✅ **Frame Protection**: Clickjacking prevention

## 🔍 Post-Deployment Validation

The validation script tests:

### Connectivity & SSL
- Site accessibility
- SSL certificate validity
- CDN configuration

### Security
- Security headers presence
- HTTPS enforcement
- CORS configuration

### Performance
- Page load times (< 3s target)
- Gzip compression
- Asset optimization

### Functionality
- React application loading
- Component rendering
- API endpoint availability

### Accessibility
- Mobile responsiveness
- ARIA attributes
- Alt text for images

## 🚨 Troubleshooting

### Common Issues

#### Domain Not Resolving
```bash
# Check DNS configuration
nslookup dashboard.organizedai.vip

# Force DNS cache refresh
sudo dscacheutil -flushcache
```

#### SSL Certificate Issues
```bash
# Check certificate status
curl -vI https://dashboard.organizedai.vip

# Regenerate certificate (automatic with Vercel)
vercel certs issue dashboard.organizedai.vip
```

#### Build Failures
```bash
# Check build logs
vercel logs

# Debug locally
npm run build
```

#### Performance Issues
```bash
# Check asset sizes
du -sh dist/client/assets/*

# Analyze bundle
npm run build -- --analyze
```

### Rollback Procedures

#### Quick Rollback
```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific version
vercel --prod --name moonlock-dashboard@previous-version
```

#### Emergency Maintenance Page
```bash
# Deploy maintenance page
vercel --prod --name maintenance-page
vercel alias set maintenance-page dashboard.organizedai.vip
```

## 📊 Monitoring & Maintenance

### Health Checks

Add these to your monitoring system:
- **Uptime**: `https://dashboard.organizedai.vip`
- **API Health**: `https://dashboard.organizedai.vip/api/health`
- **Performance**: Page load time < 3s
- **SSL**: Certificate expiry monitoring

### Regular Maintenance

#### Weekly
- ✅ Check deployment logs
- ✅ Review performance metrics
- ✅ Validate SSL certificate
- ✅ Test critical functionality

#### Monthly
- ✅ Update dependencies
- ✅ Security audit
- ✅ Performance optimization
- ✅ Backup validation

#### Quarterly
- ✅ Architecture review
- ✅ Disaster recovery testing
- ✅ User feedback analysis
- ✅ Technology stack updates

## 🆘 Emergency Contacts

For deployment emergencies:

1. **Check Vercel Status**: https://vercel.com/status
2. **Review Deployment Logs**: Vercel dashboard
3. **Contact Support**: Vercel support for infrastructure issues
4. **Team Escalation**: Notify development team lead

## 📈 Performance Targets

### Production SLAs
- **Uptime**: 99.9%
- **Page Load**: < 3 seconds
- **API Response**: < 500ms
- **SSL Grade**: A+

### Metrics to Monitor
- **Core Web Vitals**: LCP, FID, CLS
- **Error Rate**: < 0.1%
- **Memory Usage**: < 100MB baseline
- **Bundle Size**: < 500KB gzipped

---

## 🎉 Deployment Checklist

Before going live:

- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Linting issues resolved
- [ ] Security headers configured
- [ ] SSL certificate validated
- [ ] Custom domain working
- [ ] Performance targets met
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Team notified

**Ready for production! 🚀**

---

*For technical questions or issues, refer to the main project README or contact the development team.*