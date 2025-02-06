import { html, css } from 'lit';

import '@ucd-lib/pgfarm-client/elements/components/database-teaser/database-teaser.js';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-no-results/app-no-results.js';

export function styles() {
  const elementStyles = css`
    app-organization {
      display: block;
    }
    app-organization database-teaser {
      margin-bottom: var(--spacer, 1rem);
    }
    app-organization .search-form-wrapper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--spacer--medium, 1.5rem);
      margin-bottom: var(--spacer--large, 2rem);
    }
    app-organization .search-form-wrapper app-search-input {
      flex-grow: 1;
      --app-search-input-label-color: var(--gray, #4c4c4c);
    }
    app-organization .search-form-wrapper .dd-wrapper {
      max-width: 200px;
    }
    app-organization .teasers .edit-button {
      display: none;
    }
    app-organization .is-admin .teasers {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
    }
    app-organization .is-admin .teasers .edit-button {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='page-header'>
    <div class='page-header__wrapper page-header__wrapper--flex'>
      <div class='page-header__content'>
        <div class='page-header__title'>
          <h1>${this.dataCtl.org?.title}</h1>
        </div>
        <div class='page-header__description' ?hidden=${!this.dataCtl.org?.description}>
          ${this.dataCtl.org?.description}
        </div>
        <div class='page-header__links' ?hidden=${!this.dataCtl.org?.url}>
          <a class='prefixed-icon' href='${this.dataCtl.org?.url}'>
            <app-icon slug='fa.solid.network-wired'></app-icon>
            <span>${this.dataCtl.org?.url}</span>
          </a>
        </div>
      </div>
      <div ?hidden=${!this.dataCtl.org?.logo}>
        <img class='page-header__image' src='${this.dataCtl.org?.logo}' alt='Organization logo'>
      </div>
      <div ?hidden=${!this.dataCtl.isAdmin}>
        <app-icon-button icon='fa.solid.pen' @click=${this.showEditModal}></app-icon-button>
      </div>

    </div>
  </div>
  <div class='l-container--narrow-desktop u-space-mt--large ${this.dataCtl.isAdmin ? 'is-admin' : ''}'>
    <div class='search-form-wrapper' ?hidden=${!(this.databaseTotal > this.queryCtl.limit.getProperty() || this.queryCtl.text.exists())}>
      <app-search-input
        query-param="text"
        placeholder='Keyword or database name'
        label='Search Databases'></app-search-input>
      <div class='dd-wrapper'>
        <label class='gray' for=${this.idGen.get('sort')}>Sort by</label>
        <select class='blue' id=${this.idGen.get('sort')} @input=${e => this.queryCtl.orderBy.setProperty(e.target.value, true)}>
          <option value="rank" ?selected=${this.queryCtl.orderBy.equals('rank')}>Relevance</option>
          <option value="database_title" ?selected=${this.queryCtl.orderBy.equals('database_title')}>Title</option>
        </select>
      </div>
    </div>
    <div class='teasers' ?hidden=${!this.dataCtl.featured?.length || this.queryCtl.text.exists() || this.queryCtl.offset.exists()}>
      ${this.dataCtl.featured?.map(database => html`
        <database-teaser .data=${database} featured hide-organization></database-teaser>
        ${_renderEditDbButton.call(this, database)}
        `)}
    </div>
    <div class='teasers' ?hidden=${!this.databaseResults?.length}>
      ${this.databaseResults.map(database => html`
        <database-teaser
          .data=${database}
          hide-organization
          ?featured=${(this.dataCtl.featured || []).map(db => db.id).includes(database.id)}>
        </database-teaser>
        ${_renderEditDbButton.call(this, database)}
      `)}
    </div>
    <div ?hidden=${this.queryCtl.getMaxPage(this.databaseTotal) == 1 || !this.databaseTotal}>
      <ucd-theme-pagination
        current-page=${this.queryCtl.getCurrentPage()}
        max-pages=${this.queryCtl.getMaxPage(this.databaseTotal)}
        @page-change=${e => this.queryCtl.setPage(e.detail.page)}
        xs-screen>
      </ucd-theme-pagination>
    </div>
    <div ?hidden=${!(this.queryCtl.text.exists() && !this.databaseResults?.length)}>
      <app-no-results text="No databases found for this organization"></app-no-results>
    </div>
    <div ?hidden=${!(!this.databaseTotal && !this.dataCtl.featured?.length && !this.queryCtl.text.exists())}>
      There are no databases available for this organization.
    </div>
  </div>
`;}

function _renderEditDbButton(database){
  return html`
    <div class='edit-button'>
      <app-icon-button
        icon='fa.solid.gear'
        href='/db/${database?.organization?.name || '_'}/${database?.name || ''}/edit'>
      </app-icon-button>
    </div>
  `;
}
