import { html, css } from 'lit';

import '@ucd-lib/pgfarm-client/elements/components/admin-table-access-dropdown/admin-table-access-dropdown.js';

export function styles() {
  const elementStyles = css`
    admin-database-user-schema-tables-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-user-schema-tables-table .app-table .row {
      grid-template-columns: 3fr 2fr;
    }

    admin-database-user-schema-tables-table .cell.access {
      margin: 0 .5rem;
    }

    @media (min-width: 768px) {
      admin-database-user-schema-tables-table .app-table .row {
        grid-template-columns: 1fr 250px;
      }
      admin-database-user-schema-tables-table .cell.access {
        margin: 0 1rem;
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
      </div>
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
          <div class='cell access'>Access</div>
        </div>
        ${this.tableCtl.getRows().map( row => html`
          <div class=${row.classes}>
            <div class='cell'>
              <div class='checkbox-container'>
                <input type='checkbox' .checked=${row.selected} @change=${row.toggleSelected}>
                <div>${row.item.table?.table_name}</div>
              </div>
            </div>
            <admin-table-access-dropdown 
              data-tablename=${row.item.table?.table_name}
              .value=${row.item?.grant?.action}
              @option-change=${this._onTableAccessChange}>
            </admin-table-access-dropdown>
          </div>
        `)}
      </div>

    </div>
`;}
