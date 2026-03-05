export class ProjectContent {
  constructor() {
    this.overlay = document.getElementById('project-overlay');
    this.content = this.overlay.querySelector('.content');
    this.closeBtn = this.overlay.querySelector('.close-btn');

    this.closeBtn.addEventListener('click', () => this.hide());
  }

  show(project) {
    let html = `<h2>${project.title}</h2>`;

    if (project.description) {
      html += `<p>${project.description}</p>`;
    }

    if (project.video) {
      html += `
        <div class="media-item">
          <iframe
            src="${project.video}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>`;
    }

    for (const img of project.images) {
      html += `
        <div class="media-item">
          <img src="${img}" alt="${project.title}" loading="lazy" />
        </div>`;
    }

    this.content.innerHTML = html;
    this.overlay.classList.add('active');
  }

  hide() {
    this.overlay.classList.remove('active');
    this.content.innerHTML = '';
  }

  onClose(cb) {
    this.closeBtn.addEventListener('click', cb);
  }
}
