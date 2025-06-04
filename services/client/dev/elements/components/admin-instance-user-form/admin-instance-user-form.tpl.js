import { html, css } from 'lit';
import { grantDefinitions } from '../../../utils/service-lib.js';
import '../user-search-typeahead/user-search-typeahead.js';

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
  const isSchemaUpdate = this.operation === 'update-schema';
  const isCreate = this.operation === 'create';
  return html`
  <form @submit=${this._onSubmit}>
    <div class='field-container' ?hidden=${!isCreate}>
      <label for=${this.idGen.get('username')}>UC Davis Kerberos ID</label>
      <user-search-typeahead
        .kerberosId=${this.payload.username || ''}
        @select=${e => this._onInput('username', e.detail.kerberosId)}
        required>
      </user-search-typeahead>
    </div>
    <div class='field-container' ?hidden=${isCreate}>
      <label>Username</label>
      <div>${this.payload.username || ''}</div>
    </div>
    <div class='field-container' ?hidden=${isSchemaUpdate}>
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
    <div class='field-container' ?hidden=${!isSchemaUpdate}>
      <label>Schema</label>
      <div>${this.schema || ''}</div>
    </div>
    <div class='field-container'>
      <label>${isSchemaUpdate ? 'Schema Access' : 'Database Access'}</label>
      <ul class="list--reset radio">
        ${grantDefinitions.getObjectGrants(isSchemaUpdate ? 'SCHEMA' : 'DATABASE', isCreate).map(def => html`
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
