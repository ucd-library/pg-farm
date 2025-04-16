import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import { elementChWidth } from '@ucd-lib/pgfarm-client/elements/templates/styles.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-tables-table/admin-database-tables-table.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-tables {
      display: block;
    }
    app-admin-database-tables .heading {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem;
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-admin-database-tables .heading h2 {
      color: var(--ucd-blue, #022851);
      margin-bottom: .25rem;
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
            <h2>Tables:</h2>
            <div>
              <label hidden for=${this.idGen.get('schema')}>Schema</label>
              ${elementChWidth(this.idGen.get('schema'), this.queryCtl.schema?.value || '')}
              <select
                class='select-header'
                id=${this.idGen.get('schema')}
                @input=${e => this.queryCtl.schema.setProperty(e.target.value, true)}
                .value=${this.queryCtl.schema?.value}
                >
                <option value="" ?selected=${!this.queryCtl.schema.exists()}>All Schemas</option>
                ${this.dataCtl.schemas?.map(schema => html`
                  <option value=${schema} ?selected=${this.queryCtl.schema.equals(schema)}>${schema}</option>`)}
              </select>
            </div>
          </div>
          <admin-database-tables-table .tables=${this.tables}></admin-database-tables-table>
        </div>
      </div>
    </div>

`;}
