import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: inline-block;
    }
    .container {
      display: flex;
      width: var(--app-icon-size, var(--spacer, 1rem));
      fill: currentColor;
    }
  `;

  return [elementStyles];
}

export function render() {
  const makeSquare = !this.autoHeight || (!this.svg && this.invisibleIfEmpty);
  return html`
    ${this.size ? html`
      <style>:host { --app-icon-size: var(--spacer--${this.size}); }</style>` : ''}
    ${makeSquare ? html`
      <style>:host .container {height: var(--app-icon-size, var(--spacer, 1rem));}</style>` : ''}
    <div class='container'>
      ${unsafeHTML(this.svg)}
    </div>
`;}
