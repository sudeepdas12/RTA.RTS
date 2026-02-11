# Frontend Installation Guide

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher (comes with Node.js)

## Step-by-Step Installation

### 1. Install Node.js

Download and install from: https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Navigate to Frontend Directory

```bash
cd frontend
```

### 3. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18
- React Router
- Bootstrap 5
- Chart.js
- Axios
- And more...

### 4. Configure Environment

```bash
# Copy example environment file
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac

# Edit .env file
notepad .env              # Windows
nano .env                 # Linux
```

Edit the `.env` file:
```
REACT_APP_API_URL=http://localhost:8000/api
```

If your backend is running on a different URL or port, update accordingly.

### 5. Start Development Server

```bash
npm start
```

The application will automatically open in your browser at: **http://localhost:3000**

## Build for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Serve Production Build Locally

```bash
# Install serve globally
npm install -g serve

# Serve the build
serve -s build
```

## Deployment

### Deploy to Static Hosting

1. Build the application:
```bash
npm run build
```

2. Upload the `build/` directory to your static hosting service (e.g., Netlify, Vercel, GitHub Pages)

### Deploy with Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Deploy with IIS (Windows)

1. Install IIS URL Rewrite Module
2. Copy `build/` folder to IIS root directory
3. Create `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## Troubleshooting

### Issue: npm install fails

**Solution**: Clear npm cache and try again:
```bash
npm cache clean --force
npm install
```

### Issue: Port 3000 already in use

**Solution**: Use a different port:
```bash
# Windows
set PORT=3001 && npm start

# Linux/Mac
PORT=3001 npm start
```

### Issue: API connection error

**Solution**: Verify backend is running and `.env` file has correct API URL:
```bash
REACT_APP_API_URL=http://localhost:8000/api
```

### Issue: Module not found

**Solution**: Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json   # Linux/Mac
rmdir /s node_modules && del package-lock.json   # Windows
npm install
```

### Issue: CORS error

**Solution**: Ensure backend CORS settings include your frontend URL. Check backend `.env`:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## End-to-end tests (Playwright)

Run the visual/layout tests locally (these verify the navbar brand is left, controls are right, CSS variables exist, and dropdowns overlay):

```bash
# install dev dependencies and Playwright browsers
npm install
npm run install:browsers

# run Playwright tests (headless)
npm run test:e2e
```

> The Playwright runner will build the app and serve it locally on port 3000 before running tests.

## Development Tips

### Enable Hot Reload

Hot reload is enabled by default. Changes to source files will automatically refresh the browser.

### View in Network

To access from other devices on your network:
```bash
# Windows
set REACT_APP_API_URL=http://your-ip:8000/api && npm start

# Linux/Mac
REACT_APP_API_URL=http://your-ip:8000/api npm start
```

### Debugging

Open browser developer tools (F12) and check:
- Console for JavaScript errors
- Network tab for API requests
- React Developer Tools extension

## Available Scripts

### `npm start`
Runs the app in development mode at http://localhost:3000

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
⚠️ **Warning**: This is a one-way operation. Once you eject, you can't go back!

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/         # Reusable components
│   │   ├── NavigationBar.js
│   │   └── PrivateRoute.js
│   ├── context/            # React contexts
│   │   └── AuthContext.js
│   ├── pages/              # Page components
│   │   ├── Login.js
│   │   └── Dashboard.js
│   ├── services/           # API services
│   │   └── api.js
│   ├── App.js              # Main app component
│   ├── App.css             # Styles
│   └── index.js            # Entry point
├── package.json
└── .env
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimization

### Code Splitting

React automatically code-splits by route. For additional splitting:
```javascript
const Component = React.lazy(() => import('./Component'));
```

### Image Optimization

- Use WebP format where possible
- Optimize images before uploading
- Use lazy loading for images

### Bundle Analysis

```bash
npm install -g source-map-explorer
npm run build
source-map-explorer build/static/js/*.js
```

## Default Login

**URL**: http://localhost:3000/login  
**Username**: admin  
**Password**: admin123

## Additional Resources

- [React Documentation](https://react.dev/)
- [Bootstrap Documentation](https://getbootstrap.com/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [React Router Documentation](https://reactrouter.com/)
