export class ColorExtractor {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  async extractDominantColor(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        this.ctx.drawImage(img, 0, 0);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        const colors = [];
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a > 128) {
            colors.push({ r, g, b });
          }
        }

        const dominantColor = this.findDominantColor(colors);
        resolve(dominantColor);
      };

      img.onerror = () => {
        resolve({ r: 26, g: 26, b: 26 });
      };

      img.src = imageSrc;
    });
  }

  findDominantColor(colors) {
    if (colors.length === 0) {
      return { r: 26, g: 26, b: 26 };
    }

    const colorGroups = {};

    colors.forEach((color) => {
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

  rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  setProjectColor(projectElement, color) {
    const hexColor = this.rgbToHex(color.r, color.g, color.b);
    projectElement.style.setProperty("--project-primary-color", hexColor);
  }

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

    this.setLogoColorsFromProjects();
  }

  setLogoColorsFromProjects() {
    const projects = document.querySelectorAll(".project");

    if (projects.length === 0) return;

    const firstProject = projects[0];
    const lastProject = projects[projects.length - 1];

    const firstProjectColor = firstProject.style.getPropertyValue("--project-primary-color");
    const lastProjectColor = lastProject.style.getPropertyValue("--project-primary-color");

    if (firstProjectColor) {
      this.setLogoColor("logo-top", firstProjectColor);
    }

    if (lastProjectColor) {
      this.setLogoColor("logo-bottom", lastProjectColor);
    }
  }

  setLogoColor(logoId, color) {
    const logo = document.getElementById(logoId);
    if (logo) {
      const hexColor = typeof color === "string" ? color : this.rgbToHex(color.r, color.g, color.b);
      logo.style.setProperty("--logo-color", `color-mix(in srgb, ${hexColor} 60%, black 40%)`);
      console.log(`Logo ${logoId} color set: ${hexColor}`);
    }
  }
}
