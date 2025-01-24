import { html, css } from 'lit';
import adminDatabaseHeader from '../../templates/admin-database-header.js';
import '../../components/admin-database-subnav/admin-database-subnav.js';
import '../../components/admin-database-wake/admin-database-wake.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-users {
      display: block;
    }
    app-admin-database-users .heading {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-admin-database-users .heading h2 {
      color: var(--ucd-blue, #022851);
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
        <admin-database-wake orgName=${this.orgName} dbName=${this.dbName} @wake-up-successful=${() => this.AppStateModel.refresh()}></admin-database-wake>
        <div ?hidden=${this.dataCtl?.db?.instance?.state === 'SLEEP'}>
          <div class='heading'>
            <h2>Users</h2>
            <app-prefixed-icon-button icon='fa.solid.plus' @click=${() => this.showAddUserModal()}>Add User</app-prefixed-icon-button>
          </div>
        </div>
      </div>
    </div>
`;}
