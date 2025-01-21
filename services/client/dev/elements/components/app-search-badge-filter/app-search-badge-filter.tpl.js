import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    .container {
      display: flex;
      align-items: center;
      gap: var(--app-search-badge-filter-gap, .5rem);
      flex-wrap: wrap;
    }
    .filter {
      display: flex;
      align-items: center;
      padding: .5rem 1rem .5rem .5rem;
      gap: .5rem;
      background: var(--ucd-blue-50, #CCE0F3);
      border-radius: 5rem;
      cursor: pointer;
    }
    .icon-wrapper {
      color: var(--ucd-blue-80, #13639E);
      background-color: transparent;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s, color 0.3s;
    }
    .label {
      font-weight: 700;
      color: var(--ucd-blue-100, #022851);
      font-size: .875rem;
    }
    .filter:hover .icon-wrapper {
      background-color: var(--ucd-blue-80, #13639E);
      color: var(--ucd-gold-100, #FFBF00);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container' ?hidden=${!this.filters.length}>
    ${this.filters.map(filter => html`
      <div class='filter' @click=${() => this._onClick(filter)}>
        <div class='icon-wrapper'>
          <app-icon slug='fa.solid.xmark'></app-icon>
        </div>
        <div class='label'>${filter.label}</div>
      </div>
    `)}
  </div>
`;}
