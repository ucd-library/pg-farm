import { html, css } from 'lit';
import formStyles from "@ucd-lib/theme-sass/1_base_html/_forms.css.js";

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    form {
      display: flex;
      align-items: center;
      padding: var(--spacer--small, .5rem) .75rem;
      background: var(--ucd-blue-30, #EBF3FA);
    }
    input {
      box-sizing: border-box;
      font-size: 100%;
      line-height: 1.15;
      border: none !important;
      background-color: transparent !important;
      box-shadow: none;
      padding: 0;
      height: 1.5rem;
      color: var(--black, #000);
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background-color: var(--ucd-blue-80, #13639E);
      color: var(--white, #fff);
      --app-icon-size: .75rem;
      height: 1.5rem;
      width: 1.5rem;
    }
    button:hover {
      background-color: var(--ucd-blue-70, #73ABDD);
    }
  `;

  return [formStyles, elementStyles];
}

export function render() {
return html`
  <form @submit="${this._onFormSubmit}">
    <input
      placeholder=${this.placeholder}
      .value="${this.value || ''}"
      ?disabled=${this.disabled}
      @input="${e => this.value = e.target.value}">
    <button type="submit">
      <app-icon slug='fa.solid.magnifying-glass' fetch-method='page-load'></app-icon>
    </button>
  </form>


`;}
