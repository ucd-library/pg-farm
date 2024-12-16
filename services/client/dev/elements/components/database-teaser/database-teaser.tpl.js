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
    .icon {
      --app-icon-size: 2.5rem;
    }
    .title {
      margin: 0 0 var(--spacer--small, .5rem) 0;
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
    .organization {
      color: var(--ucd-black-70, #4C4C4C);
      font-size: var(--font-size--small, .875rem);
      margin-bottom: var(--spacer--small, .5rem);
    }
    .description {
      font-size: var(--font-size, 1rem);
    }
    .featured-label {
      display: none;
    }
    .featured .featured-label {
      display: block;
      text-transform: uppercase;
      color: var(--ucd-blue-100, #022851);
      font-size: var(--font-size--small, .875rem);
      font-weight: var(--font-weight--bold, 700);
      margin-bottom: var(--spacer--small, .5rem);
    }
    @media (min-width: 768px) {
      .title {
        font-size: 1.428rem;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <style>
    .icon {color: ${this._brandColorHex};}
    .container.featured {background-color: ${this._brandColorHex + '1A'};}
  </style>
  <div class="container ${this.featured ? 'featured' : ''}">
    <div class='icon'>
      <app-icon slug="${this.data.icon || this.defaultIcon}" auto-height></app-icon>
    </div>
    <div>
      <div class='featured-label'>${this.featuredLabel}</div>
      <div class="title"><a href="">${this.data.title}</a></div>
      <div ?hidden=${this.hideOrganization || !this._organization} class='organization'>via ${this._organization}</div>
      <div class='description' ?hidden=${!this._description}>${this._description}</div>
    </div>
  </div>
`;}
