import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-dropdown-button/app-dropdown-button.js';

export function styles() {

  const desktopStyles = css`
    admin-database-tables-table .desktop .app-table .row {
      grid-template-columns: 2fr 1fr 75px 140px 75px;
    }`;

  const elementStyles = css`
    admin-database-tables-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-tables-table .desktop {
      display: none;
    }
    admin-database-tables-table .mobile {
      display: block;
    }
    @container (min-width: 768px) {
      admin-database-tables-table .desktop {
        display: block;
      }
      admin-database-tables-table .mobile {
        display: none;
      }
    }
  `;

  return [
    elementStyles,
    desktopStyles
  ];
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
      <app-search-input placeholder='Search Tables' @search=${e => this.tableCtl.search(e.detail.value)} search-bar-style='basic'></app-search-input>
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
            <div>Tables (${this.tableCtl.getRowCt()})</div>
          </div>
        </div>
        <div class='cell'>Schema</div>
        <div class='cell'>Users</div>
        <div class='cell'>
          <div>Access</div>
          <div>
            <select .value=${this.tableCtl.getFilterValue('table-access')} @change=${e => this.tableCtl.setFilterValue('table-access', e.target.value)}>
              <option value='' ?selected=${!this.tableCtl.getFilterValue('table-access')}>Any Access</option>
              <option value='Public' ?selected=${this.tableCtl.getFilterValue('table-access') === 'Public'}>Public</option>
              <option value='Restricted' ?selected=${this.tableCtl.getFilterValue('table-access') === 'Restricted'}>Restricted</option>
            </select>
          </div>
        </div>
        <div class='cell'>Remove</div>
      </div>
      ${this.tableCtl.getRows().map( row => html`
        <div class=${row.classes}>
          <div class='cell'>
            <div class='checkbox-container'>
              <input type='checkbox' .checked=${row.selected} @change=${row.toggleSelected}>
              <div>
                <div>${row.item?.table?.table_name}</div>
              </div>
            </div>
          </div>
          <div class='cell'>
            <div>${row.item?.table?.table_schema}</div>
          </div>
          <div class='cell'>${row.item?.userCt}</div>
          <div class='cell'>${row.item?.accessSummary}</div>
          <div class='cell cell--center'>
            <app-icon-button icon='fa.solid.trash' basic @click=${() => console.log('todo: delete', row.item)}></app-icon-button>
          </div>
        </div>
      `)}
    </div>
  </div>
  `;
}

function _renderMobileView(){
  return html`
    <div class='mobile'>mobile table ${this.tableCtl.getRowCt()}</div>
  `;
}
