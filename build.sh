#!/bin/bash

echo "🚀 Building optimized Rose Hallgren portfolio..."

# Clean previous build
rm -rf dist

# Remove all comments from source files
echo "📝 Removing comments..."
sed -i '' 's/<!--.*-->//g' index.html
sed -i '' 's/\/\*.*\*\///g' assets/css/styles.css
sed -i '' 's/\/\/.*$//g' assets/js/main.js

# Build with Vite
echo "⚡ Building with Vite..."
npm run build

# Show results
echo "✅ Build complete!"
echo "📊 File size comparison:"
echo "HTML: $(wc -c < index.html) bytes → $(wc -c < dist/index.html) bytes"
echo "CSS: $(wc -c < assets/css/styles.css) bytes → $(wc -c < dist/assets/css/styles-DtzJkUlS.css) bytes"

echo ""
echo "🎯 Optimized files are in the 'dist' folder"
echo "📁 Deploy the contents of 'dist' to your web server"
