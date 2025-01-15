import { html, css } from 'lit';
import '../app-subnav/app-subnav.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <app-subnav
    heading=${this.heading}
    .items=${this.items}
    .selectedFn=${(item) => this.selectedFn(item)}
    @app-subnav-item-click=${e => console.log(e.detail.item)}>
    </app-subnav>
`;}
