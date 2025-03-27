import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import { elementChWidth } from '@ucd-lib/pgfarm-client/elements/templates/styles.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-user-schema-tables-table/admin-database-user-schema-tables-table.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-user-single {
      display: block;
    }
    app-admin-database-user-single .heading {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: var(--spacer--large, 2rem);
      flex-wrap: wrap;
    }
    app-admin-database-user-single .heading h2 {
      color: var(--ucd-blue, #022851);
      margin-bottom: .25rem;
    }
    app-admin-database-user-single section {
      margin-bottom: var(--spacer--large, 2rem);
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
              <h2>User: ${this.user?.data?.name}</h2>
              <div class='admin-badge' ?hidden=${!this.user?.isAdmin}>Admin</div>
            </div>
            <div class='flex flex--align-center gap--small flex--wrap'>
              <app-icon-button icon='fa.solid.trash' @click=${() => this._showDeleteUserModal()}></app-icon-button>
              <app-icon-button icon='fa.solid.pen' @click=${() => console.log('todo: edit')}></app-icon-button>
            </div>
          </div>
          <section ?hidden=${!this.user?.showContactSection}>
            <h3>Contact</h3>
            <h4 ?hidden=${!this.user?.displayName}>${this.user?.displayName}</h4>
            <div>
              ${this.user?.positions?.map(position => html`<div>${position}</div>`)}
            </div>
          </section>
          <section>
            <h3>Database</h3>
            <h4>${this.user?.databaseGrant?.roleLabel}</h4>
          </section>
          <section>
            <div class='flex flex--align-center gap--small flex--wrap u-space-mb--small'>
              <h3 class='u-space-mb--tiny'>Schema:</h3>
              <div>
                <label hidden for=${this.idGen.get('schema')}>Schema</label>
                ${elementChWidth(this.idGen.get('schema'), this.queryCtl.schema?.value || '')}
                <select class='select-header select-header--h3'
                  id=${this.idGen.get('schema')}
                  @input=${e => this.queryCtl.schema.setProperty(e.target.value, true)}
                  .value=${this.queryCtl.schema?.value}
                  >
                  <option value="" ?selected=${!this.queryCtl.schema.exists()}>Select a Schema</option>
                  ${this.dataCtl.schemas?.map(schema => html`
                    <option value=${schema} ?selected=${this.queryCtl.schema.equals(schema)}>${schema}</option>`)}
                </select>
              </div>
            </div>
            <div ?hidden=${this.queryCtl.schema.exists()}>
              <p>Select a schema to view ${this.user?.data?.name}'s access permissions and tables.</p>
            </div>
            <div ?hidden=${!this.queryCtl.schema.exists()}>
              <div class='flex flex--align-center gap--small flex--wrap u-space-mb--large'>
                <h4 class='u-space-mb--flush'>${this.schemaGrant?.roleLabel}</h4>
                <app-icon-button basic icon='fa.solid.pen' @click=${() => console.log('todo: edit')}></app-icon-button>
              </div>
              <admin-database-user-schema-tables-table .tables=${this.tables}></admin-database-user-schema-tables-table>
            </div>
          </section>
        </div>

      </div>
    </div>


`;}
