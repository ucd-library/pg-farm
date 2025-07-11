import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

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

  <div class="docs-content">
    ${unsafeHTML(this.content)}
  </div>

`;}