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
  `;

  return [elementStyles];
}

export function render() { 
return html`
  <div class="l-container l-container--flush-with-page-header u-space-mt--large">
    <ucdlib-md id="md" .data=${this.content}></ucdlib-md>  
  </div>
`;}