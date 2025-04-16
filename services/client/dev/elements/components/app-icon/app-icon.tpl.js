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
    svg {
      width: 100%;
      height: auto;
    }
    [hidden] {
      display: none !important;
    }
  `;

  return [elementStyles];
}

export function render() {
  return html`
    ${this.size ? html`
      <style>:host { --app-icon-size: var(--spacer--${this.size}); }</style>` : ''}
    ${!this.autoHeight ? html`
      <style>:host .container {height: var(--app-icon-size, var(--spacer, 1rem));}</style>` : ''}
    ${this.transformDegrees ? html`
      <style>:host .container {transform: rotate(${this.transformDegrees}deg);}</style>` : ''}
    <div class='container' ?hidden=${this.invisibleIfEmpty && !this.svg}>
      ${unsafeHTML(this.svg)}
    </div>
`;}
