import { html, css } from 'lit';
import { live } from 'lit/directives/live.js';

import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-dropdown-button/app-dropdown-button.js';
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
      <app-search-input
        placeholder='Search Users'
        @search=${e => this.tableCtl.search(e.detail.value)}
        .value=${this.tableCtl?.opts?.searchValue || ''}
        search-bar-style='basic'>
      </app-search-input>
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
              <app-icon-button icon='fa.solid.trash' basic @click=${() => this._onRemoveUserButtonClick(row.item?.user)}></app-icon-button>
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
              <app-icon-button icon='fa.solid.trash' basic @click=${() => this._onRemoveUserButtonClick(row.item?.user)}></app-icon-button>
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
  return html`
    <div>
      <div class='user-name-container'>
        <div>
          <a href=${href}>${row.item?.user?.name}</a>
        </div>
        <div class='admin-badge' ?hidden=${row.item?.user?.pgFarmUser?.type !== 'ADMIN'}>Admin</div>
      </div>
      <div class='caption' ?hidden=${!name}>${name}</div>
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

