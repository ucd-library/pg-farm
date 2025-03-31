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
  const isUpdate = this.operation === 'update';
  return html`
  <form @submit=${this._onSubmit}>
    <div class='field-container' ?hidden=${!isUpdate}>
      <label for=${this.idGen.get('username')}>UC Davis Kerberos ID</label>
      <input
        id=${this.idGen.get('username')}
        .value=${this.payload.username || ''}
        @input=${e => this._onInput('username', e.target.value)}
        required>
    </div>
    <div class='field-container' ?hidden=${isUpdate}>
      <label>Username</label>
      <div>${this.payload.username || ''}</div>
    </div>
    <div class='field-container'>
      <ul class="list--reset checkbox">
        <li>
          <input
            id=${this.idGen.get('admin')}
            name='admin'
            type='checkbox'
            @input=${e => this._onInput('admin', !this.payload.admin)}
            .checked=${this.payload.admin} />
          <label for=${this.idGen.get('admin')}>Enable admin access</label>
        </li>
      </ul>
    </div>
    <div class='field-container'>
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
