import { html, css } from 'lit';
import { grantDefinitions } from '../../../utils/service-lib.js';

export function styles() {
  const elementStyles = css`
    admin-instance-user-form {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <form @submit=${this._onSubmit}>
    <div class='field-container'>
      <label for=${this.idGen.get('username')}>UC Davis Kerberos ID</label>
      <input
        id=${this.idGen.get('username')}
        .value=${this.payload.username || ''}
        @input=${e => this._onInput('username', e.target.value)}
        required>
    </div>
    <div class='field-container'>
      <label>Account Type</label>
      <ul class="list--reset radio">
        <li>
          <input
            id=${this.idGen.get('admin.false')}
            name='admin'
            type='radio'
            @input=${e => this._onInput('admin', false)}
            .checked=${!this.payload.admin} />
          <label for=${this.idGen.get('admin.false')}>Standard</label>
        </li>
        <li>
          <input
            id=${this.idGen.get('admin.true')}
            name='admin'
            type='radio'
            @input=${e => this._onInput('admin', true)}
            .checked=${this.payload.admin === true} />
          <label for=${this.idGen.get('admin.true')}>Admin</label>
        </li>
      </ul>
    </div>
    <div class='field-container' ?hidden=${this.payload.admin}>
      <label>Database Access</label>
      <ul class="list--reset radio">
        ${grantDefinitions.registry.filter(def => def.object === 'DATABASE').map(def => html`
          <li>
            <input
              id=${this.idGen.get(`access.${def.action}`)}
              type='radio'
              name='access'
              @input=${e => this._onInput('access', def.action)}
              .checked=${def.action === 'READ' ? !this.payload.access || this.payload.access === def.action : this.payload.access === def.action} />
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
