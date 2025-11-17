# Deployment Guide

## GitHub Pages Setup

To enable GitHub Pages for this repository, follow these steps:

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/hwkim3330/figma
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**

### 2. Wait for Deployment

The GitHub Actions workflow will automatically deploy your site when you push to the `main` branch.

You can check the deployment status:
1. Go to the **Actions** tab in your repository
2. Wait for the "Deploy to GitHub Pages" workflow to complete (usually takes 1-2 minutes)

### 3. Access Your Site

Once deployed, your site will be available at:

**https://hwkim3330.github.io/figma/**

## Local Development

To test locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

## Custom Domain (Optional)

To use a custom domain:

1. Go to Settings > Pages
2. Enter your custom domain under "Custom domain"
3. Update your DNS settings according to GitHub's instructions
4. Wait for DNS propagation (up to 24 hours)

## Troubleshooting

### Workflow Fails

If the GitHub Actions workflow fails:
- Check that GitHub Pages is set to use "GitHub Actions" as the source
- Ensure repository permissions allow Actions to deploy Pages
- Check the Actions log for specific error messages

### 404 Error

If you get a 404 error:
- Wait a few minutes for GitHub Pages to fully deploy
- Clear your browser cache
- Check that the workflow completed successfully in the Actions tab

### Changes Not Showing

If your changes aren't appearing:
- GitHub Pages may cache for up to 10 minutes
- Do a hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Check that your latest commit was successfully pushed

## Manual Deployment Alternative

If you prefer not to use GitHub Actions:

1. Go to Settings > Pages
2. Set Source to "Deploy from a branch"
3. Select branch: `main`
4. Select folder: `/ (root)`
5. Click Save

The site will deploy from the root of your main branch.

---

**Note**: The GitHub Actions workflow (`.github/workflows/deploy.yml`) provides automatic deployment on every push to main. This is the recommended approach.
