import { html, css } from 'lit';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-dropdown-button/app-dropdown-button.js';

export function styles() {

  const desktopStyles = css`
    admin-database-tables-table .desktop .app-table .row {
      grid-template-columns: 2fr 100px 75px 140px 75px;
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
    admin-database-tables-table .mobile .app-table .row {
      grid-template-columns: 1fr auto;
    }
    admin-database-tables-table .table-name-container {
      display: flex;
      gap: .5rem;
      align-items: center;

      color: var(--ucd-blue-80, #13639E);
      font-weight: 700;
    }
    admin-database-tables-table .table-name-container a {
      text-decoration: none;
    }
    admin-database-tables-table .mobile .details {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
      font-size: var(--font-size--small, .75rem);
      justify-content: space-between;
      max-width: 350px;
      margin-top: .75rem;
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
      <app-search-input
        placeholder='Search Tables'
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
              <div class='table-name-container'>
                <a href='${this.tableUrl}/${row.item?.table?.tableName}?schema=${row.item?.table?.schema}'>${row.item?.table?.tableName}</a>
              </div>
            </div>
          </div>
          <div class='cell'>
            <div>${row.item?.table?.schema}</div>
          </div>
          <div class='cell'>${row.item?.userCt}</div>
          <div class='cell'>${row.item?.accessSummary}</div>
          <div class='cell cell--center'>
            <app-icon-button
              icon='fa.solid.trash'
              ?disabled=${row.item?.userCt == 0}
              basic @click=${() => this._onSingleRemoveClick(row.item)}>
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
              <div>Tables (${this.tableCtl.getRowCt()})</div>
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
                  <div>
                    <div class='table-name-container'>
                      <a href='${this.tableUrl}/${row.item?.table?.tableName}?schema=${row.item?.table?.schema}'>${row.item?.table?.tableName}</a>
                    </div>
                  </div>
                  <div class='details'>
                    <div>
                      <div>Schema:</div>
                      <div>${row.item?.table?.schema}</div>
                    </div>
                    <div>
                      <div>Users:</div>
                      <div>${row.item?.userCt}</div>
                    </div>
                    <div>
                      <div>Access:</div>
                      <div>${row.item?.accessSummary}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class='cell cell--icon-top'>
              <app-icon-button
                icon='fa.solid.trash'
                ?disabled=${row.item?.userCt == 0}
                basic @click=${() => this._onSingleRemoveClick(row.item)}>
              </app-icon-button>
            </div>
          </div>
        `)}
      </div>
    </div>

  `;
}
