# Car Editor Tycoon

A React-based tycoon game where you manage a car editing studio. Build your team, upgrade equipment, complete jobs, and grow your reputation in this addictive browser game!

<!-- Trigger deployment - JavaScript hoisting fix applied -->

## 🎮 Features

- **Team Management**: Hire editors, buy PCs, and manage your studio
- **Job System**: Accept and complete various editing jobs
- **Upgrade System**: Train editors and upgrade equipment
- **Advanced Mechanics**: Team efficiency, managers, onboarding delays
- **Performance Optimized**: Handles 150+ staff and 100+ jobs smoothly
- **Dev Tools**: Command palette, changelog, and performance monitoring
- **API Integration**: Leaderboard and run submission system

## 🚀 Deploy Instructions

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `car-editor-tycoon` (or your preferred name)
3. Make it public (required for GitHub Pages)
4. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/[your-username]/car-editor-tycoon.git
   cd car-editor-tycoon
   ```

### 2. Setup Project

1. Copy all project files to the repository directory
2. Update `package.json` with your GitHub username:
   ```json
   {
     "homepage": "https://[your-username].github.io/car-editor-tycoon"
   }
   ```
3. Update `index.html` with your GitHub username in the meta tags
4. Install dependencies:
   ```bash
   npm install
   ```

### 3. Configure API URLs (Optional)

If you want to enable the leaderboard system, update the API configuration in `src/CarEditorTycoon.jsx`:

```javascript
const CONFIG = {
  // ... other config
  api: {
    submitRunUrl: "https://your-api-endpoint.com/submit-run",
    leaderboardUrl: "https://your-api-endpoint.com/leaderboard", 
    requestHandleUrl: "https://your-api-endpoint.com/request-handle",
    timeout: 10000,
    retryDelay: 2000
  },
  ownerHandle: "your-github-handle" // For dev access in production
}
```

### 4. Build and Deploy

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Setup GitHub Pages deployment**:
   ```bash
   npm run deploy:setup
   ```

3. **Deploy to GitHub Pages**:
   ```bash
   npm run deploy
   ```

### 5. Configure GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select **gh-pages** branch and **/(root)** folder
5. Click **Save**

Your game will be available at: `https://[your-username].github.io/car-editor-tycoon`

### 6. Dev Access in Production

To access dev features in production, add `?dev=1` to the URL:
```
https://[your-username].github.io/car-editor-tycoon?dev=1
```

Or if you set `ownerHandle` in the config, access with your handle:
```
https://[your-username].github.io/car-editor-tycoon?handle=your-github-handle
```

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
car-editor-tycoon/
├── src/
│   ├── CarEditorTycoon.jsx    # Main game component
│   ├── main.jsx               # React entry point
│   └── index.css              # Styles with Tailwind
├── public/
│   └── 404.html               # SPA fallback for GitHub Pages
├── index.html                 # Main HTML file
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── README.md                  # This file
```

## 🎯 Performance Targets

- **Target FPS**: 60 FPS at 8× speed
- **Large Dataset**: 150+ editors, 100+ PCs, 100+ jobs
- **Tick Processing**: < 8ms per tick
- **Render Time**: < 16ms per frame
- **Memory Usage**: < 100MB for large datasets

## 🔧 Dev Features

- **Command Palette**: Press `` ` `` to open (dev mode only)
- **Performance Monitoring**: Real-time FPS and timing metrics
- **Health Checks**: Automatic game integrity verification
- **Changelog**: Track all changes and dev actions
- **API Testing**: Leaderboard and run submission testing

## 📝 License

MIT License - feel free to use and modify as needed!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy gaming! 🎮**
