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
      background-color: var(--ucd-blue-30, #EBF3FA);
      padding: 1rem;
    }
    .heading {
      margin-bottom: var(--spacer, 1rem);
      padding-bottom: var(--spacer, 1rem);
      border-bottom: 1px solid var(--ucd-blue-60, #B0D0ED);
      color: var(--forced-contrast-heading-primary, #022851);
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      font-size: 1.092rem;
    }
    @media (min-width: 768px) {
      .heading {
        font-size: 1.428rem;
      }
    }
    .menu-items a {
      text-decoration: none;
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .menu-items a:hover {
      text-decoration: none;
    }
    .menu-items button {
      background: none;
      border: none;
      cursor: pointer;
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .75rem 1rem;
      color: var(--ucd-blue, #022851);
      font-size: var(--font-size, 1rem);
      font-weight: var(--font-weight, 400);
    }
    .menu-item app-icon {
      color: var(--ucd-blue-70, #73ABDD);
    }
    .menu-item:hover {
      background-color: var(--ucd-blue-40, #DBEAF7);
    }
    .menu-item.selected {
      background-color: var(--ucd-blue-50, #CCE0F3);
      font-weight: 700;
    }
    .menu-item.selected app-icon {
      color: var(--ucd-blue-80, #13639E);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container'>
    <div ?hidden=${!this.heading} class='heading'>${this.heading}</div>
    <div class='menu-items'>
      ${this._items.map(item => item.href ? html`
        <a href=${item.href}>${_renderMenuItem.call(this, item)}</a>
        ` : html`
        <button @click=${e => this._onItemClick(e, item)} type='button'>${_renderMenuItem.call(this, item)}</button>
        `)}
    </div>
  </div>
`;}

function _renderMenuItem(item){
  return html`
    <div class='menu-item ${item.selected ? 'selected' : ''}'>
      ${item.icon ? html`<app-icon slug=${item.icon}></app-icon>` : ''}
      <div>${item.label}</div>
    </div>
  `;
}
