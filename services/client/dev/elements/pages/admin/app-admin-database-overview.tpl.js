import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../../components/admin-database-subnav/admin-database-subnav.js';
import '../../components/app-statistic-button/app-statistic-button.js';

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
    <div class='page-header page-header--mb'>
      <div class='page-header__wrapper'>
        <div class='page-header__title'>
          <app-icon class='${db?.brandColor || 'secondary'}' slug=${db?.icon || 'fa.solid.database'}></app-icon>
          <h1>${db?.title || ''}</h1>
        </div>
        <div class='page-header__subtitle' ?hidden=${!db?.organization?.name}>
          via <a class='bold-link' href='/org/${db?.organization?.name}'>${db?.organization?.title}</a>
        </div>
      </div>
    </div>
    <div class='l-basic l-container'>
      <div class='l-sidebar-first'>
        <admin-database-subnav></admin-database-subnav>
      </div>
      <div class='l-content'>
        <div class='heading'>
          <h2>Database Overview</h2>
          <app-icon-button icon='fa.solid.pen' @click=${() => this.showEditModal()}></app-icon-button>
        </div>
        <section class='stat-buttons'>
          <app-statistic-button href=${`${window.location.pathname}/schemas`} icon='fa.solid.diagram-project' text='# schemas' subtext='# public'></app-statistic-button>
          <app-statistic-button icon='fa.solid.table' text='# tables' subtext='# public'></app-statistic-button>
          <app-statistic-button icon='fa.solid.users' text='# users' subtext='# public'></app-statistic-button>
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
          <div ?hidden=${!db?.tags?.length}>${db?.tags.join(', ')}</div>
          <div ?hidden=${db?.tags?.length}>No detailed description provided</div>
        </section>
      </div>
    </div>
`;}
