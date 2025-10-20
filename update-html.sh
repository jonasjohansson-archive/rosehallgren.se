#!/bin/bash

echo "🔗 Updating HTML to use WebP images..."

# Function to update image references
update_image_references() {
    local file="$1"
    
    # Update project images
    sed -i '' 's|assets/images/projects/\([^"]*\)\.jpg|assets/images/optimized/\1.webp|g' "$file"
    sed -i '' 's|assets/images/projects/\([^"]*\)\.jpeg|assets/images/optimized/\1.webp|g' "$file"
    sed -i '' 's|assets/images/projects/\([^"]*\)\.png|assets/images/optimized/\1.webp|g' "$file"
    
    # Update photography images
    sed -i '' 's|assets/images/photography/\([^"]*\)\.jpg|assets/images/optimized/\1.webp|g' "$file"
    sed -i '' 's|assets/images/photography/\([^"]*\)\.jpeg|assets/images/optimized/\1.webp|g' "$file"
    sed -i '' 's|assets/images/photography/\([^"]*\)\.png|assets/images/optimized/\1.webp|g' "$file"
    
    # Update favicon images
    sed -i '' 's|assets/favicon/\([^"]*\)\.png|assets/images/optimized/\1.webp|g' "$file"
    sed -i '' 's|assets/favicon/\([^"]*\)\.ico|assets/images/optimized/\1.webp|g' "$file"
}

# Update the main HTML file
update_image_references "index.html"

echo "✅ HTML updated to use WebP images!"
echo ""
echo "📊 Summary:"
echo "  - Original images kept in: assets/images/projects/, assets/images/photography/, assets/favicon/"
echo "  - WebP images created in: assets/images/optimized/"
echo "  - HTML updated to reference WebP versions"
echo ""
echo "🧪 Test the site to make sure everything works!"
