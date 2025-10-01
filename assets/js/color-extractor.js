/* ========================================
   COLOR EXTRACTION UTILITIES
   ======================================== */

export class ColorExtractor {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  // Extract dominant color from an image
  async extractDominantColor(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Set canvas size to image size
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        // Draw image to canvas
        this.ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Sample colors from the image (every 10th pixel for performance)
        const colors = [];
        for (let i = 0; i < data.length; i += 40) {
          // Every 10th pixel (4 bytes per pixel)
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a > 128) {
            colors.push({ r, g, b });
          }
        }

        // Find the most common color
        const dominantColor = this.findDominantColor(colors);
        resolve(dominantColor);
      };

      img.onerror = () => {
        // Fallback to default color if image fails to load
        resolve({ r: 26, g: 26, b: 26 }); // Default dark gray
      };

      img.src = imageSrc;
    });
  }

  // Find the most common color from an array of colors
  findDominantColor(colors) {
    if (colors.length === 0) {
      return { r: 26, g: 26, b: 26 }; // Default dark gray
    }

    // Group similar colors together
    const colorGroups = {};

    colors.forEach((color) => {
      // Round colors to reduce noise
      const roundedR = Math.round(color.r / 10) * 10;
      const roundedG = Math.round(color.g / 10) * 10;
      const roundedB = Math.round(color.b / 10) * 10;

      const key = `${roundedR},${roundedG},${roundedB}`;

      if (!colorGroups[key]) {
        colorGroups[key] = {
          color: { r: roundedR, g: roundedG, b: roundedB },
          count: 0,
        };
      }
      colorGroups[key].count++;
    });

    // Find the group with the most colors
    let maxCount = 0;
    let dominantColor = { r: 26, g: 26, b: 26 };

    Object.values(colorGroups).forEach((group) => {
      if (group.count > maxCount) {
        maxCount = group.count;
        dominantColor = group.color;
      }
    });

    return dominantColor;
  }

  // Convert RGB to hex
  rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Set project color for a specific project
  setProjectColor(projectElement, color) {
    const hexColor = this.rgbToHex(color.r, color.g, color.b);
    projectElement.style.setProperty("--project-primary-color", hexColor);
  }

  // Initialize color extraction for all projects
  async initializeProjectColors() {
    const projects = document.querySelectorAll(".project");

    for (const project of projects) {
      const heroImage = project.querySelector(".image-slide img");
      if (heroImage) {
        try {
          const dominantColor = await this.extractDominantColor(heroImage.src);
          this.setProjectColor(project, dominantColor);
          console.log(`Project color set: ${this.rgbToHex(dominantColor.r, dominantColor.g, dominantColor.b)}`);
        } catch (error) {
          console.warn("Failed to extract color for project:", error);
        }
      }
    }
  }
}
