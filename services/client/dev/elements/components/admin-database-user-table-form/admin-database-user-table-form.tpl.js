import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-token-search-input/app-token-search-input.js';
import { grantDefinitions } from '../../../utils/service-lib.js';

export function styles() {
  const elementStyles = css`
    admin-database-user-table-form {
      display: block;
    }
    admin-database-user-table-form .custom-validations {
      margin-bottom: 1rem;
      color: var(--double-decker, #c10230);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <form @submit=${this._onSubmit}>
    <div class='custom-validations' ?hidden=${!this.customValidations.length}>
      ${this.customValidations.map( v => html`
        <div class='validation-error'>${v.message}</div>
      `)}
    </div>
    <div class='field-container'>
      <app-token-search-input
        .options=${this.userOptions}
        show-value-in-results
        invert-value-and-label
        placeholder='Search users'
        @token-select=${this._onTokenSelect}
      ></app-token-search-input>
    </div>
    <div class='field-container'>
      <label>Table Access</label>
      <ul class="list--reset radio">
        ${grantDefinitions.getObjectGrants('TABLE', true).map(def => html`
          <li>
            <input
              id=${this.idGen.get(`access.${def.action}`)}
              type='radio'
              name='access'
              @input=${() => this.permission = def.action}
              .checked=${def.action === 'READ' ? !this.permission || this.permission === def.action : this.permission === def.action} />
            <label for=${this.idGen.get(`access.${def.action}`)}>
              <div>${def.roleLabel}</div>
              <div class='caption'>${def.grant.join(', ')}</div>
            </label>
          </li>
          `)}
      </ul>
    </div>
  </form>
`;}
