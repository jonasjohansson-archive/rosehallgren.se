#!/bin/bash

echo "🖼️ Starting image optimization to WebP..."

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install webp
    else
        echo "❌ Homebrew not found. Please install webp manually:"
        echo "   brew install webp"
        echo "   or download from: https://developers.google.com/speed/webp/download"
        exit 1
    fi
fi

# Create optimized images directory
mkdir -p assets/images/optimized

# Function to convert image to WebP with orientation preservation
convert_to_webp() {
    local input_file="$1"
    local output_file="$2"
    
    if [ -f "$input_file" ]; then
        echo "Converting: $input_file"
        # Use -metadata all to preserve EXIF data including orientation
        cwebp -q 85 -m 6 -metadata all "$input_file" -o "$output_file"
        return 0
    else
        echo "⚠️  File not found: $input_file"
        return 1
    fi
}

# Convert all project images
echo "📁 Converting project images..."
for img in assets/images/projects/*.{jpg,jpeg,png}; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        name="${filename%.*}"
        convert_to_webp "$img" "assets/images/optimized/${name}.webp"
    fi
done

# Convert all photography images
echo "📁 Converting photography images..."
for img in assets/images/photography/*.{jpg,jpeg,png}; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        name="${filename%.*}"
        convert_to_webp "$img" "assets/images/optimized/${name}.webp"
    fi
done

# Convert favicon images
echo "📁 Converting favicon images..."
for img in assets/favicon/*.{png,ico}; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        name="${filename%.*}"
        convert_to_webp "$img" "assets/images/optimized/${name}.webp"
    fi
done

echo "✅ Image conversion complete!"
echo "📊 Checking file sizes..."

# Show size comparison
echo ""
echo "📈 Size comparison (original vs WebP):"
for img in assets/images/optimized/*.webp; do
    if [ -f "$img" ]; then
        webp_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
        original_name=$(basename "${img%.webp}")
        original_file=""
        
        # Find original file
        for ext in jpg jpeg png; do
            if [ -f "assets/images/projects/${original_name}.${ext}" ]; then
                original_file="assets/images/projects/${original_name}.${ext}"
                break
            elif [ -f "assets/images/photography/${original_name}.${ext}" ]; then
                original_file="assets/images/photography/${original_name}.${ext}"
                break
            elif [ -f "assets/favicon/${original_name}.${ext}" ]; then
                original_file="assets/favicon/${original_name}.${ext}"
                break
            fi
        done
        
        if [ -f "$original_file" ]; then
            original_size=$(stat -f%z "$original_file" 2>/dev/null || stat -c%s "$original_file" 2>/dev/null)
            reduction=$(( (original_size - webp_size) * 100 / original_size ))
            echo "  ${original_name}: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $webp_size) (-${reduction}%)"
        fi
    fi
done

echo ""
echo "🎯 Next step: Run './update-html.sh' to update HTML links to use WebP images"
