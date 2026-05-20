import { html, css } from 'lit';
import { live } from 'lit/directives/live.js';

import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-dropdown-button/app-dropdown-button.js';
import '@ucd-lib/pgfarm-client/elements/components/app-icon-button/app-icon-button.js';
import {grantDefinitions} from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export function styles() {
  const elementStyles = css`
    admin-database-user-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-user-table .desktop {
      display: none;
    }
    admin-database-user-table .desktop .app-table .row {
      grid-template-columns: 2fr 1fr 1fr 75px 75px;
    }
    admin-database-user-table .mobile {
      display: block;
    }
    admin-database-user-table .mobile .app-table .row {
      grid-template-columns: 1fr auto;
    }
    admin-database-user-table .user-name-container {
      display: flex;
      gap: .5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    admin-database-user-table .user-name-container a {
      font-weight: 700;
      text-decoration: none;
    }
    admin-database-user-table .mobile .details {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
      font-size: var(--font-size--small, .75rem);
      justify-content: space-between;
      max-width: 350px;
      margin-top: .75rem;
    }
    admin-database-user-table .search-container {
      display: flex;
      gap: .5rem;
    }
    admin-database-user-table .sa-filter-toggle {
      --app-icon-button-icon-size: 75%;
    }
    admin-database-user-table .service-account-details {
      display: flex;
      align-items: center;
      gap: .25rem;
      --app-icon-size: .875rem;
      font-size: var(--font-size--small, 0.875rem);
      color: var(--ucd-black-70, #4C4C4C);
      font-weight: 400;
      margin-top: .5rem;
    }
    admin-database-user-table button.service-account-details {
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
    }
    admin-database-user-table button.service-account-details:hover {
      text-decoration: underline;
    }
    @container (min-width: 768px) {
      admin-database-user-table .desktop {
        display: block;
      }
      admin-database-user-table .mobile {
        display: none;
      }
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='content app-table-container'>
    <div class='action-bar'>
      <app-dropdown-button
        .options=${this.bulkActions}
        placeholder='Bulk changes'
        button-text='Apply'
        .value=${this.selectedBulkAction}
        ?disabled=${!this.tableCtl.getSelectedCount()}
        @option-change=${e => this.selectedBulkAction = e.detail.value}
        @apply=${this._onBulkActionSelect}>
      </app-dropdown-button>
      <div class='search-container'>
        <app-icon-button 
          icon='fa.solid.robot' 
          @click=${this._onSaFilterToggleClick} 
          title='Toggle Service Accounts Filter'
          ?pressed=${this.tableCtl.getFilterValue('service-account')}
          class='sa-filter-toggle'>
        </app-icon-button>
        <app-search-input
          placeholder='Search Users'
          @search=${e => this.tableCtl.search(e.detail.value)}
          .value=${this.tableCtl?.opts?.searchValue || ''}
          search-bar-style='basic'>
        </app-search-input>
      </div>
    </div>
    <div class='alert' ?hidden=${ !(!this.hasServiceAccounts && this.tableCtl.getFilterValue('service-account')) }>
      This database does not currently have any service accounts. To request a service account, see the  <a href="/static-assets/docs/authenticate-service-account.md">service account documentation</a>.
    </div>
    ${_renderDesktopView.call(this)}
    ${_renderMobileView.call(this)}
  </div>
`;}

function _renderDesktopView(){
  return html`
    <div class='desktop'>
      <div class='app-table'>

        <div class='row row--header'>
          <div class='cell'>
            <div class='checkbox-container'>
              <input
                type='checkbox'
                ?disabled=${!this.tableCtl.getRowCt()}
                .checked=${this.tableCtl.allSelected()}
                @change=${() => this.tableCtl.toggleAllSelected()}>
              <div>Users (${this.tableCtl.getRowCt()})</div>
            </div>
          </div>
          <div class='cell'>
            <div>Database</div>
            <div>
              <select .value=${this.tableCtl.getFilterValue('db-access')} @change=${e => this.tableCtl.setFilterValue('db-access', e.target.value)}>
                <option value='' ?selected=${this.tableCtl.getFilterValue('db-access')}>Any Access</option>
                <option value='SOME' ?selected=${this.tableCtl.getFilterValue('db-access')}>Some Access</option>
                ${Object.entries(grantDefinitions.roleLabels).map(([value, label]) => html`
                  <option value=${value} ?selected=${this.tableCtl.getFilterValue('db-access') === value}>${label}</option>
                `)}
              </select>
            </div>
          </div>
          <div class='cell'>
            <div>Schema</div>
            <div>
              <select .value=${this.tableCtl.getFilterValue('schema-access')} @change=${e => this.tableCtl.setFilterValue('schema-access', e.target.value)}>
                <option value='' ?selected=${this.tableCtl.getFilterValue('schema-access')}>Any Access</option>
                <option value='SOME' ?selected=${this.tableCtl.getFilterValue('schema-access')}>Some Access</option>
                ${Object.entries(grantDefinitions.roleLabels).map(([value, label]) => html`
                  <option value=${value} ?selected=${this.tableCtl.getFilterValue('schema-access') === value}>${label}</option>
                `)}
              </select>
            </div>
          </div>
          <div class='cell'>Tables</div>
          <div class='cell'>Remove</div>
        </div>

        ${this.tableCtl.getRows().map( row => html`
          <div class=${row.classes}>
            <div class='cell'>
              <div class='checkbox-container'>
                <input type='checkbox' .checked=${row.selected} @change=${row.toggleSelected}>
                ${_renderUserName.call(this, row)}
              </div>
            </div>
            <div class='cell'>
              <div>${grantDefinitions.getRoleLabel('DATABASE', row.item?.user)}</div>
              <div class='caption'>${row.item?.user?.pgPrivileges?.join?.(', ') || ''}</div>
            </div>
            <div class='cell'>
              <div>${row.item?.schemaRole?.grant?.roleLabel}</div>
              <div class='caption' ?hidden=${!row.item?.schemaRole?.privileges?.length}>${row.item?.schemaRole?.privileges?.join?.(', ')}</div>
            </div>
            <div class='cell'>${row.item?.tableCt}</div>
            <div class='cell cell--center'>
              <app-icon-button 
                icon='fa.solid.trash' 
                basic 
                ?disabled=${row.item?.user?.pgFarmUser?.serviceAccountId}
                @click=${() => this._onRemoveUserButtonClick(row.item?.user)}>
              </app-icon-button>
            </div>
          </div>
          `)}
      </div>

    </div>
  `;
}

function _renderMobileView(){
  return html`
    <div class='mobile'>
      <div class='app-table'>
        <div class='row row--header'>
          <div class='cell'>
            <div class='checkbox-container'>
              <input type='checkbox' .checked=${this.tableCtl.allSelected()} @change=${() => this.tableCtl.toggleAllSelected()}>
              <div>Users (${this.tableCtl.getRowCt()})</div>
            </div>
          </div>
          <div class='cell'></div>
        </div>

        ${this.tableCtl.getRows().map( row => html`
          <div class=${row.classes}>
            <div class='cell'>
              <div class='checkbox-container'>
                <input type='checkbox' .checked=${row.selected} @change=${row.toggleSelected}>
                <div class='u-width-100'>
                  ${_renderUserName.call(this, row)}
                  <div class='details'>
                    <div>
                      <div>Database:</div>
                      <div>${grantDefinitions.getRoleLabel('DATABASE', row.item?.user)}</div>
                    </div>
                    <div>
                      <div>Schema:</div>
                      <div>${row.item?.schemaRole?.grant?.roleLabel}</div>
                    </div>
                    <div>
                      <div>Tables:</div>
                      <div>${row.item?.tableCt}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class='cell cell--icon-top'>
              <app-icon-button 
                icon='fa.solid.trash' 
                basic 
                ?disabled=${row.item?.user?.pgFarmUser?.serviceAccountId}
                @click=${() => this._onRemoveUserButtonClick(row.item?.user)}>
              </app-icon-button>
            </div>
          </div>
        `)}
      </div>
    </div>

  `;
}

function _renderUserName(row){
  let href = `${window.location.pathname}/${row.item?.user?.name}`;
  if ( this.queryCtl?.schema?.exists() ){
    href += `?schema=${this.queryCtl.schema.value}`;
  }
  const name = `${row.item?.user?.pgFarmUser?.firstName || ''} ${row.item?.user?.pgFarmUser?.lastName || ''}`.trim();
  let username = (row.item?.user?.name || '').replace(/-service-account$/, '');

  const isServiceAccount = !!row.item?.user?.pgFarmUser?.serviceAccountId;
  const isOwnServiceAccount = isServiceAccount && row.item?.user?.pgFarmUser?.serviceAccountParentId == this.currentUser?.userId;
  let serviceAccountOwnerName = '';
  if ( isServiceAccount && !isOwnServiceAccount ){
    const owner = this.users.find(u => u?.user?.pgFarmUser?.id === row.item?.user?.pgFarmUser?.serviceAccountParentId);
    if ( owner ){
      serviceAccountOwnerName = `${owner.user?.pgFarmUser?.firstName || ''} ${owner.user?.pgFarmUser?.lastName || ''}`.trim() || owner.user?.name || '';
    }
  }

  return html`
    <div>
      <div class='user-name-container'>
        <div>
          <a href=${href}>${username}</a>
        </div>
        <div class='badge' ?hidden=${row.item?.user?.pgFarmUser?.type !== 'ADMIN'}>Admin</div>
        <div class='badge badge--blue' ?hidden=${!isServiceAccount}>Service Account</div>
      </div>
      <div class='caption' ?hidden=${!name}>${name}</div>
      <div ?hidden=${!serviceAccountOwnerName} class='service-account-details'>
        <app-icon slug='fa.solid.user'></app-icon>
        <span>${serviceAccountOwnerName}</span>
      </div>
      <button ?hidden=${!isOwnServiceAccount} class='service-account-details' @click=${() => this._showServiceAccountRotationConfirmation(row.item?.user)}>
        <app-icon slug='fa.solid.rotate'></app-icon>
        <span>Rotate password</span>
      </button>
    </div>
  `;
}

export function renderRmAccessForm(user){
  return html`
    <div class='u-space-mb'>Are you sure you want to remove access for <strong>${user?.name}</strong>?</div>
    <div class='field-container'>
      <ul class="list--reset radio">
        <li ?hidden=${!this.queryCtl?.schema?.exists()}>
          <input
            id=${this.idGen.get('rm-from-object--schema')}
            type='radio'
            name=${this.idGen.get('rm-from-object')}
            @input=${() => this.rmFromObject = 'schema'}
            .checked=${live(this.rmFromObject === 'schema')} />
          <label for=${this.idGen.get('rm-from-object--schema')}>Remove access to schema: <strong>${this.queryCtl.schema.value}</strong></label>
        </li>
        <li>
          <input
            id=${this.idGen.get('rm-from-object--database')}
            type='radio'
            name=${this.idGen.get('rm-from-object')}
            @input=${() => this.rmFromObject = 'database'}
            .checked=${live(this.rmFromObject === 'database')} />
          <label for=${this.idGen.get('rm-from-object--database')}>Remove user from database (this will revoke all access)</label>
        </li>
        <li>
          <input
            id=${this.idGen.get('rm-from-object--instance')}
            type='radio'
            name=${this.idGen.get('rm-from-object')}
            @input=${() => this.rmFromObject = 'instance'}
            .checked=${live(this.rmFromObject === 'instance')} />
          <label for=${this.idGen.get('rm-from-object--instance')}>Remove user completely from instance <br>(this will revoke access to all databases running on this instance)</label>
        </li>
      </ul>
    </div>
  `;
}

export function renderServiceAccountRotationConfirmation(user){
  return html`
      <p>Are you sure you want to generate a new password for service account <strong>${user?.name}</strong>?</p>
      <p>To ensure there is no disruption to services, deploy your new secret before your access token expires.</p>
      <p>See the <a href="/static-assets/docs/authenticate-service-account.md">service account documentation</a> for more information.</p>
    `
}

