import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';

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
<app-search-input
  placeholder=${this.placeholder}
  @search=${this._onSearch}
  .value=${this.value}
  search-bar-style='basic'>
</app-search-input>
`;}
