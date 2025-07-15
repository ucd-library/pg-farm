import { html, css } from 'lit';

import '@ucd-lib/theme-elements/ucdlib/ucdlib-md/ucdlib-md.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }

    li > ul.list--bordered {
      padding: 0.5rem 0 1rem 0;
    }

    pre {
      background-color: var(--ucd-black-10, #e5e5e5);
      border-radius: 0.5rem;
      padding: .8rem;
      overflow-x: auto;
      opacity: 0.9;
    }
  `;

  return [elementStyles];
}

export function render() { 
return html`
  <div class="l-container l-container--flush-with-page-header u-space-mt--large">
    <ucdlib-md id="md" .data=${this.content}></ucdlib-md>  
  </div>
`;}