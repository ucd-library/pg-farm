import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-schemas {
      display: block;
    }
    app-admin-database-schemas h2 {
      color: var(--ucd-blue, #022851);
    }
    app-admin-database-schemas section {
      margin-top: var(--spacer--large, 2rem);
    }
    app-admin-database-schemas .nav-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      margin-top: 1rem;
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
            <h2>Schemas</h2>
          </div>
          <div>
            ${(this.dataCtl?.schemas || []).map(schema => html`
                <section>
                  <h3>${schema}</h3>
                  <div class='nav-buttons'>
                    <app-prefixed-icon-button icon='fa.solid.table' href='/db/${this.orgName}/${this.dbName}/edit/tables?schema=${schema}'># Tables</app-prefixed-icon-button>
                    <app-prefixed-icon-button icon='fa.solid.user' href='/db/${this.orgName}/${this.dbName}/edit/users?schema=${schema}'># Users</app-prefixed-icon-button>
                  </div>
                </section>
              `)}
          </div>
        </div>
      </div>
    </div>
`;}
