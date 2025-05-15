import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-user-table-access-table/admin-database-user-table-access-table.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-tables {
      display: block;
    }
    app-admin-database-tables .heading {
      /*display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem;*/
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-admin-database-table-single .heading h2 {
      color: var(--ucd-blue, #022851);
      margin-bottom: .25rem;
    }
    app-admin-database-table-single .heading h2.table {
      margin: 1rem 0 2rem;
    }
  `;

  return [elementStyles];
}

export function render() {
  const db = this.dataCtl?.db;
  return html`
    ${adminDatabaseHeader(db)}
    <div class='l-basic l-container'>
      <div class='l-sidebar-first'>
        <admin-database-subnav></admin-database-subnav>
      </div>
      <div class='l-content'>
        <admin-database-wake .orgName=${this.orgName} .dbName=${this.dbName} @wake-up-successful=${() => this.AppStateModel.refresh()}></admin-database-wake>
        <div ?hidden=${this.dataCtl?.db?.instance?.state === 'SLEEP'}>
          <div class='heading'>
            <h2 class='schema'>${this.schema}</h2>
            <h2 class='table'>Table ${this.tableName}</h2>
          </div>
          <admin-database-user-table-access-table .users=${this.users}></admin-database-user-table-access-table>
        </div>
      </div>
    </div>

`;}
