import { html, css } from 'lit';
import formStyles from '@ucd-lib/theme-sass/1_base_html/_forms.css.js';
import buttonStyles from '@ucd-lib/theme-sass/2_base_class/_buttons.css.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: inline-block;
    }
    form {
      display: flex;
      align-items: stretch;
      gap: .5rem;
      font-size: 1rem;
    }
    select {
      border: 1px solid var(--ucd-blue-60, #B0D0ED);
      font-size: inherit;
      max-width: var(--app-dropdown-button-select-max-width, auto);
    }
    button {
      padding: .5rem 1rem;
      background-color: var(--ucd-blue-40, #DBEAF7);
      border-style: none;
      color: var(--ucd-blue, #022851);
      font-weight: 400;
      font-size: inherit;
      transition: background-color .2s;
    }
    button:disabled {
      cursor: not-allowed;
    }
    button:hover {
      background-color: var(--ucd-blue-60, #B0D0ED);
    }
    button:disabled:hover {
      background-color: var(--ucd-blue-40, #DBEAF7);
    }
    select:disabled {
      background-color: var(--ucd-blue-10, #F7FAFC);
      color: var(--ucd-blue-70, #73abdd);
      cursor: not-allowed;
    }
  `;

  return [
    formStyles,
    buttonStyles,
    elementStyles
  ];
}

export function render() {
return html`
  <form @submit=${this._onSubmit}>
    <select @change=${this._onSelectChange} .value=${this.value} ?disabled=${this.disabled}>
      ${this.placeholder ? html`<option disabled value="" ?selected=${!this.value}>${this.placeholder}</option>` : ''}
      ${this.options.map(option => html`
        <option value=${option.value} ?disabled=${option.disabled}>${option.label}</option>`
      )}
    </select>
    <button type='submit' ?disabled=${!this.value || this.disabled}>${this.buttonText}</button>
  </form>
`;}
