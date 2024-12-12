import { html, css } from 'lit';
import '../../components/app-search-input/app-search-input.js';

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
            <select class='blue' id=${this.idGen.get('sort')} @input=${e => this.orderByCtl.setProperty(e.target.value, true)}>
              <option value="rank" ?selected=${this.orderByCtl.equals('rank')}>Relevance</option>
              <option value="database_title" ?selected=${this.orderByCtl.equals('database_title')}>Title</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class='l-container'>
    <div class="l-basic">
      <div class="l-content">
        <div class="u-space-mt--large">Content</div>
      </div>
      <div class="l-sidebar-first">
        <div class="u-space-mt">Filters</div>
      </div>
    </div>
  </div>


`;}
