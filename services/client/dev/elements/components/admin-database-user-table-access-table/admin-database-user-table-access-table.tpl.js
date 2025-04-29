import { html, css } from 'lit';

import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-dropdown-button/app-dropdown-button.js';
import {grantDefinitions} from '@ucd-lib/pgfarm-client/utils/service-lib.js';

export function styles() {
  const elementStyles = css`
    admin-database-user-table-access-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-user-table-access-table .desktop {
      display: none;
    }
    admin-database-user-table-access-table .desktop .app-table .row {
      grid-template-columns: 3fr 1fr;
    }
    admin-database-user-table-access-table .mobile {
      display: block;
    }
    admin-database-user-table-access-table .mobile .app-table .row {
      grid-template-columns: 1fr auto;
    }
    admin-database-user-table-access-table .user-name-container {
      display: flex;
      gap: .5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    admin-database-user-table-access-table .user-name-container a {
      font-weight: 700;
      text-decoration: none;
    }
    admin-database-user-table-access-table .mobile .details {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
      font-size: var(--font-size--small, .75rem);
      justify-content: space-between;
      max-width: 350px;
      margin-top: .75rem;
    }
    @container (min-width: 768px) {
      admin-database-user-table-access-table .desktop {
        display: block;
      }
      admin-database-user-table-access-table .mobile {
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
      <app-search-input placeholder='Search Users' @search=${e => this.tableCtl.search(e.detail.value)} search-bar-style='basic'></app-search-input>
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
            <div>Access</div>
            <div>
              <select .value=${this.tableCtl.getFilterValue('schema-access')} @change=${e => this.tableCtl.setFilterValue('schema-access', e.target.value)}>
                <option value='' ?selected=${this.tableCtl.getFilterValue('schema-access')}>Any Access</option>
                ${Object.entries(grantDefinitions.roleLabels).map(([value, label]) => html`
                  <option value=${value} ?selected=${this.tableCtl.getFilterValue('schema-access') === value}>${label}</option>
                `)}
              </select>
            </div>
          </div>
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
              <div>${row.item?.schemaRole?.grant?.roleLabel}</div>
              <div class='caption' ?hidden=${!row.item?.schemaRole?.privileges?.length}>${row.item?.schemaRole?.privileges?.join?.(', ')}</div>
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
                      <div>Access:</div>
                      <div>${row.item?.schemaRole?.grant?.roleLabel}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `)}
      </div>
    </div>

  `;
}

function _renderUserName(row){
  let href = window.location.pathname.split('/tables/')[0] + '/users/' + row.item?.user?.name;
  if ( this.queryCtl?.schema?.exists() ){
    href += `?schema=${this.queryCtl.schema.value}`;
  }
  return html`
    <div>
      <div class='user-name-container'>
        <div>
          <a href=${href}>${row.item?.user?.name}</a>
        </div>
        <div class='admin-badge' ?hidden=${row.item?.user?.pgFarmUser?.type !== 'ADMIN'}>Admin</div>
      </div>
      <div class='caption' ?hidden=${!(row.item?.user?.pgFarmUser.firstName || row.item?.user?.pgFarmUser.lastName)}>
        ${row.item?.user?.pgFarmUser.firstName} ${row.item?.user?.pgFarmUser.lastName}
      </div>
    </div>
  `;
}

