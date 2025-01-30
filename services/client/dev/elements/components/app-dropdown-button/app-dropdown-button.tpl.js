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
    button:hover {
      background-color: var(--ucd-blue-60, #B0D0ED);
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
    <select @change=${this._onSelectChange} .value=${this.value}>
      ${this.placeholder ? html`<option disabled value="" ?selected=${!this.value}>${this.placeholder}</option>` : ''}
      ${this.options.map(option => html`
        <option value=${option.value} ?disabled=${option.disabled}>${option.label}</option>`
      )}
    </select>
    <button type='submit' class='' ?disabled=${!this.value}>${this.buttonText}</button>
  </form>
`;}
