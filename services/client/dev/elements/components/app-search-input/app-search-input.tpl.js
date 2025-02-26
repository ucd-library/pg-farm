import { html, css } from 'lit';
import formStyles from "@ucd-lib/theme-sass/1_base_html/_forms.css.js";

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    .search-bar {
      display: flex;
      align-items: center;
      padding: .5rem .75rem;
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
    label {
      color: var(--app-search-input-label-color, var(--ucd-blue, #022851));
    }
    .app-search-input--basic .search-bar {
      background-color: var(--white, #fff);
      border: 1px solid var(--ucd-blue-60, #B0D0ED);
      padding: calc(.5rem - 1px) .75rem;
    }
    .app-search-input--basic .search-bar button {
      background-color: var(--white, #fff);
      color: var(--ucd-blue-70, #73ABDD);
    }
    .app-search-input--basic .search-bar button:hover {
      background-color: var(--white, #fff);
    }
    .app-search-input--basic .search-bar:has(input:focus) {
      border: 1px solid var(--ucd-gold, #ffbf00);
    }
  `;

  return [formStyles, elementStyles];
}

export function render() {
return html`
  <form @submit="${this._onFormSubmit}" class='app-search-input--${this.searchBarStyle}'>
    <label ?hidden=${!this.label} for='app-search-input'>${this.label}</label>
    <div class='search-bar'>
      <input
        id='app-search-input'
        placeholder=${this.placeholder}
        .value="${this.value || ''}"
        ?disabled=${this.disabled}
        @input="${e => this.value = e.target.value}">
      <button type="submit">
        <app-icon slug='fa.solid.magnifying-glass' fetch-method='page-load'></app-icon>
      </button>
    </div>
  </form>
`;}
