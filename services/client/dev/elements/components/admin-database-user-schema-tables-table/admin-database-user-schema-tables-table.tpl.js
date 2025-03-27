import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    admin-database-user-schema-tables-table {
      display: block;
      container-type: inline-size;
    }
    admin-database-user-schema-tables-table .app-table .row {
      grid-template-columns: 1fr 150px;
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
          <div class='cell'>Access</div>
        </div>
        ${this.tableCtl.getRows().map( row => html`
          <div class=${row.classes}>
            <div class='cell'>
              <div class='checkbox-container'>
                <input type='checkbox' .checked=${row.selected} @change=${row.toggleSelected}>
                <div>${row.item.table?.table_name}</div>
              </div>
            </div>
            <div class='cell'>
              <!-- TODO: Replace this with an app-select component for selecting roles -->
              ${row.item.grant?.roleLabel}
            </div>

          </div>
        `)}
      </div>

    </div>
`;}
