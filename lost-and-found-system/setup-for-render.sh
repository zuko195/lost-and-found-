#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Lost & Found System - Render.com Setup Helper      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    echo "   Visit: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Check if already a git repository
if [ -d ".git" ]; then
    echo "⚠️  This is already a git repository."
    echo "   Skipping git init..."
else
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
fi

echo ""
echo "📝 Creating .gitignore if not exists..."
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
node_modules/
*.db
*.sqlite
.env
.DS_Store
npm-debug.log*
EOF
    echo "✅ .gitignore created"
else
    echo "✅ .gitignore already exists"
fi

echo ""
echo "📋 Checking files..."
git add .
echo "✅ Files staged for commit"

echo ""
echo "💾 Creating initial commit..."
git commit -m "Initial commit - Ready for Render deployment" || echo "✅ Already committed"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                 NEXT STEPS                            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Create GitHub Repository:"
echo "   → Go to: https://github.com/new"
echo "   → Name: lost-and-found-system"
echo "   → Keep it PUBLIC (required for free Render)"
echo "   → DON'T initialize with README"
echo "   → Click 'Create repository'"
echo ""
echo "2️⃣  Push to GitHub:"
echo "   → Copy the commands from GitHub"
echo "   → Or run these (replace YOUR_USERNAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/lost-and-found-system.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3️⃣  Deploy to Render:"
echo "   → Go to: https://render.com"
echo "   → Sign up with GitHub"
echo "   → Follow the guide in RENDER_DEPLOYMENT.md"
echo ""
echo "📖 For detailed instructions, read:"
echo "   → RENDER_DEPLOYMENT.md"
echo ""
echo "🎉 Your files are ready for Render.com!"
