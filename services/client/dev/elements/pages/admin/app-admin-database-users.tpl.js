import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import { elementChWidth } from '@ucd-lib/pgfarm-client/elements/templates/styles.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-user-table/admin-database-user-table.js';

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
      flex-wrap: wrap;
    }
    app-admin-database-users .heading h2 {
      color: var(--ucd-blue, #022851);
      margin-bottom: .25rem;
    }
    app-admin-database-users .add-user-container {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
    @media (min-width: 480px) {
      app-admin-database-users .add-user-container {
        width: auto;
      }
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
            <div class='flex flex--align-center gap--small flex--wrap'>
              <h2>Users:</h2>
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
            <div class='add-user-container'>
              <app-prefixed-icon-button icon='fa.solid.plus' @click=${() => this.showAddUserModal()}>Add User</app-prefixed-icon-button>
            </div>
          </div>
          <admin-database-user-table .users=${this.users} instance=${this.dataCtl.db?.instance?.name || ''}></admin-database-user-table>
        </div>
      </div>
    </div>
`;}
