import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
      container-type: inline-size;
    }
    .container {
      display: block;
      text-decoration: none;
    }
    .container:hover {
      text-decoration: none;
    }
    .container:hover img, .container:hover app-icon {
      transform: scale(1.1);
    }
    .title {
      padding: 0;
      color: var(--forced-contrast-heading-primary, #022851);
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      font-size: 1.092rem;
      margin-bottom: .5rem;
    }
    .count {
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.2;
      color: var(--ucd-blue-80, #13639E);
    }
    .logo-container {
      background-color: rgba(245, 245, 245, 0.93);
      width: 100%;
      aspect-ratio: 1/1;
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      object-fit: contain;
      transition: transform 0.3s ease-in-out;
    }
    app-icon {
      --app-icon-size: 2rem;
      transition: transform 0.3s ease-in-out;
    }

    @container (width > 200px) {
      .title {
        font-size: 1.428rem;
      }
      app-icon {
        --app-icon-size: 4rem;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <style>
    .icon {color: ${this._brandColorHex};}
  </style>
  <a class='container' href='/org/${this.data.name}'>
    <div class='logo-container'>
      ${this._logoSrc ? html`
        <img src="${this._logoSrc}">
        ` : html`
          <app-icon class='icon' slug="${this.icon || 'fa.solid.building'}" auto-height></app-icon>
        `}
    </div>
    <div class='content'>
      <div class='title'>${this._orgTitle}</div>
      <div class='count'>${this._databaseCtText}</div>
    </div>
  </a>

`;}
