import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-token-search-input/app-token-search-input.js';

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
  <p>hello world!</p>
  <app-token-search-input
    .options=${['foo', 'bar', 'baz']}
    placeholder='Search users'
  ></app-token-search-input>


`;}
