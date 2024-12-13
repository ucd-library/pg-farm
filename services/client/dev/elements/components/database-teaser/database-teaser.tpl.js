import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    .container {
      padding: 1rem 1rem 1rem .5rem;
      display: flex;
      gap: 1rem;
    }
    .title {
      margin: 0;
      padding: 0;
      color: var(--forced-contrast-heading-primary, #022851);
      font-size: 1rem;
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      font-size: 1.092rem;
    }
    .title a {
      color: var(--forced-contrast, #022851);
      text-decoration: none;
    }
    .title a:hover, .h4 a:focus {
      color: var(--forced-contrast, #022851);
      text-decoration: underline;
    }
    @media (min-width: 768px) {
      .title {
        font-size: 1.428rem;
      }
    }
    .icon {
      --app-icon-size: 2.5rem;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <style>
    .icon {color: ${this._brandColorHex}};
    .container.featured {background-color: ${this._brandColorHex + '1A'}}
  </style>
  <div class="container ${this.featured ? 'featured' : ''}">
    <div class='icon'>
      <app-icon slug="${this.data.icon || this.defaultIcon}" auto-height></app-icon>
    </div>
    <div>
      <div class="title"><a href="">${this.data.title}</a></div>
    </div>
  </div>


`;}
