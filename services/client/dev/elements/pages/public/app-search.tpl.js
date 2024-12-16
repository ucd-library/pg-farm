import { html, css } from 'lit';
import '../../components/app-search-input/app-search-input.js';
import '../../components/database-teaser/database-teaser.js';
import '../../components/app-no-results/app-no-results.js';

export function styles() {
  const elementStyles = css`
    app-search {
      display: block;
    }
    app-search .search-form-wrapper {
      margin-top: var(--spacer--medium, 2rem);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--spacer--medium, 2rem);
      max-width: 900px;
    }
    app-search .search-form-wrapper app-search-input {
      flex-grow: 1;
    }
    app-search .search-form-wrapper .dd-wrapper {
      display: flex;
      align-items: center;
      gap: var(--spacer--small, .5rem);
    }
    app-search .search-form-wrapper .dd-wrapper label {
      white-space: nowrap;
    }
    app-search database-teaser {
      margin-bottom: var(--spacer, 1rem);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='page-header'>
    <div class='page-header__wrapper'>
      <div class='page-header__title'>
        <h1>Find a Database</h1>
      </div>
      <div class='page-header__description'>
        <div>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque pharetra tincidunt velit et hendrerit curabitur eu odio eleifend, dictum dui sit amet, tristique erat. Aenean sed nisi vehicula, cursus nunc nec, congue metus.</div>
        <div class='search-form-wrapper'>
          <app-search-input query-param="text" placeholder='Keyword or database name'></app-search-input>
          <div class='dd-wrapper'>
            <label for=${this.idGen.get('sort')}>Sort by:</label>
            <select class='blue' id=${this.idGen.get('sort')} @input=${e => this.queryCtl.orderBy.setProperty(e.target.value, true)}>
              <option value="rank" ?selected=${this.queryCtl.orderBy.equals('rank')}>Relevance</option>
              <option value="database_title" ?selected=${this.queryCtl.orderBy.equals('database_title')}>Title</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class='l-container'>
    <div class="l-basic">
      <div class="l-content">
        <div class="u-space-mt--large">
          <div ?hidden=${this.results?.length}>
            <app-no-results text="No databases found"></app-no-results>
          </div>
          <div ?hidden=${!this.results?.length}>
            <div class="u-space-mb">
              <span class='gray italic bold'>${this.total} database${this.total != 1 ? 's' : ''}</span>
            </div>
            <div>
              ${this.results.map(result => html`
                <database-teaser .data=${result}></database-teaser>
              `)}
            </div>
            <div>
              <ucd-theme-pagination
                current-page=${this.queryCtl.getCurrentPage()}
                max-pages=${this.queryCtl.getMaxPage(this.total)}
                @page-change=${e => this.queryCtl.setPage(e.detail.page)}
                xs-screen
              ></ucd-theme-pagination>
            </div>
          </div>
        </div>
      </div>
      <div class="l-sidebar-first">
        <div class="u-space-mt">Filters</div>
      </div>
    </div>
  </div>


`;}
