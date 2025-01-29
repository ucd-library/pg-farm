import { html, css } from 'lit';

import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';

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
      grid-template-columns: 1fr 1fr 1fr 75px 75px;
    }
    admin-database-user-table .mobile {
      display: block;
    }
    admin-database-user-table app-search-input {
      max-width: 300px;
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
  <div class='content'>
    <div>
      <app-search-input placeholder='Search Users' @search=${e => this.tableCtl.search(e.detail.value)}></app-search-input>
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
          <div class='cell'>Users (${this.tableCtl.getRowCt()})</div>
          <div class='cell'>
            <div>Database</div>
            <div>Any Access</div>
          </div>
          <div class='cell'>
            <div>Schema</div>
            <div>Any Access</div>
          </div>
          <div class='cell'>Tables</div>
          <div class='cell'>Remove</div>
        </div>

        ${this.tableCtl.getRows().map( row => html`
          <div class='row'>
            <div class='cell'>${row.item?.name}</div>
            <div class='cell'>
              <div>some role</div>
              <div class='caption'>${row.item?.pgPrivileges?.join(', ') || ''}</div>
            </div>
            <div class='cell'>
              <div>some schema role</div>
              <div></div>
            </div>
            <div class='cell'>100</div>
            <div class='cell cell--center'>
              <app-icon-button icon='fa.solid.trash' basic @click=${() => this._onRemoveClick(row.item)}></app-icon-button>
            </div>
          </div>
          `)}
      </div>

    </div>
  `;
}

function _renderMobileView(){
  return html`
    <div class='app-table mobile'>mobile view</div>
  `;
}

export function renderRemoveUserConfirmation(user){
  return html`
    <div>
      <p>Are you sure you want to delete user <strong>${user.name}</strong>?</p>
      <p class='double-decker'>This will revoke all database access</p>
    </div>
  `
}
