import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import adminDatabaseHeader from '@ucd-lib/pgfarm-client/elements/templates/admin-database-header.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-subnav/admin-database-subnav.js';
import '@ucd-lib/pgfarm-client/elements/components/app-statistic-button/app-statistic-button.js';
import '@ucd-lib/pgfarm-client/elements/components/admin-database-wake/admin-database-wake.js';

export function styles() {
  const elementStyles = css`
    app-admin-database-overview {
      display: block;
    }
    app-admin-database-overview .heading {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      color: var(--ucd-blue, #022851);
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-admin-database-overview .heading h2 {
      color: var(--ucd-blue, #022851);
    }
    app-admin-database-overview section {
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-admin-database-overview .stat-buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    @media (min-width: 768px) {
      app-admin-database-overview .stat-buttons {
        flex-direction: row;
        gap: 2rem;
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
        <div class='heading'>
          <h2>Database Overview</h2>
          <app-icon-button icon='fa.solid.pen' @click=${() => this.showEditModal()}></app-icon-button>
        </div>
        <section>
          <admin-database-wake orgName=${this.orgName} dbName=${this.dbName} @wake-up-successful=${() => this.AppStateModel.refresh()}></admin-database-wake>
          <div class='stat-buttons' ?hidden=${this.dataCtl?.db?.instance?.state === 'SLEEP'}>
            <app-statistic-button
              href='${window.location.pathname}/schemas'
              icon='fa.solid.diagram-project'
              text='${this.dataCtl.schemasOverview.length} schemas'
              subtext='${this.dataCtl.schemasOverview.filter(s => s.isPublic).length} public'
              >
            </app-statistic-button>
            <app-statistic-button
              href='${window.location.pathname}/users'
              icon='fa.solid.users'
              text='${this.dataCtl.users.length} users'
              brand-color='redbud'
              subtext='${this.dataCtl.users.filter(u => u.pgFarmUser?.type === 'PUBLIC').length} public'>
            </app-statistic-button>
            <app-statistic-button
              href='${window.location.pathname}/tables'
              icon='fa.solid.table'
              text='${this.dataCtl.tablesOverview.length} tables'
              brand-color='quad'
              subtext='${this.dataCtl.tablesOverview.filter(t => this.tableIsPublic(t)).length} public'>
            </app-statistic-button>
          </div>
        </section>
        <section>
          <h3>Short Description</h3>
          <div ?hidden=${!db?.shortDescription}>${db?.shortDescription}</div>
          <div ?hidden=${db?.shortDescription}>No short description provided</div>
        </section>
        <section>
          <h3>Detailed Description</h3>
          <div ?hidden=${!db?.description}>${unsafeHTML(db?.description)}</div>
          <div ?hidden=${db?.description}>No detailed description provided</div>
        </section>
        <section>
          <h3>Highlight as Featured</h3>
          <div>${this.dataCtl.isFeatured ? 'Yes' : 'No'}</div>
        </section>
        <section>
          <h3>Icon</h3>
          <app-icon
            slug=${db?.icon || 'fa.solid.database'}
            style='--app-icon-size: 3rem;'
            class=${db?.brandColor || 'secondary'	}></app-icon>
        </section>
        <section>
          <h3>Tags</h3>
          <div ?hidden=${!db?.tags?.length}>${db?.tags?.join(', ')}</div>
          <div ?hidden=${db?.tags?.length}>No tags provided</div>
        </section>
        <section>
          <h3>Website</h3>
          <div ?hidden=${!db?.url}>${db?.url}</div>
          <div ?hidden=${db?.url}>No website provided</div>
        </section>
        <app-prefixed-icon-button icon='fa.solid.eye' href='/db/${this.orgName}/${this.dbName}'>View public database page</app-prefixed-icon-button>
      </div>
    </div>
`;}
