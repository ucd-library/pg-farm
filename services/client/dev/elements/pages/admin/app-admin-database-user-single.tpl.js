import { html, css } from 'lit';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';

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
              <app-icon-button icon='fa.solid.trash' @click=${() => console.log('todo: delete')}></app-icon-button>
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
        </div>

      </div>
    </div>


`;}
