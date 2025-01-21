import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    .container {
      border-bottom: 2px solid var(--ucd-black-20, #E5E5E5);
    }
    .title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0 1rem 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--ucd-blue-100, #022851);
      cursor: pointer;
    }
    .title:hover {
      color: var(--ucd-blue-80, #13639E);
    }
    .title app-icon {
      transition: transform 0.3s;
      color: var(--ucd-blue-80, #13639E);
      --app-icon-size: .875rem;

    }
    .expanded .title app-icon {
      transform: rotate(90deg);
    }
    .content {
      display: none;
      padding-bottom: 1rem;
    }
    .expanded .content {
      display: block;
    }
    .search-form-wrapper {
      padding: .8rem 1rem;
      border: 1px solid var(--ucd-blue-60, #B0D0ED);
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-bottom: 1rem;
    }
    .search-form-wrapper input {
      flex-grow: 1;
      border: none;
      font-size: 1rem;
    }
    .search-form-wrapper input::placeholder {
      color: var(--ucd-black-60, #7F7F7F)
    }
    .search-form-wrapper input:focus {
      outline: none;
      border: none;
    }
    .search-form-wrapper app-icon {
      color: var(--ucd-blue-50, #CCE0F3);
    }
    .options {
      max-height: var(--ucd-search-filter-max-height, 140px);
      overflow-y: scroll;
    }
    .options.scroll {
      padding-right: .75rem;
    }
    .option {
      cursor: pointer;
      display: flex;
      gap: .5rem;
      align-items: center;
    }
    .option.selected {
      color: var(--ucd-blue-100, #022851);
      font-weight: 700;
    }
    .option .option__label {
      flex-grow: 1;
    }
    .option .option__remove {
      color: var(--ucd-blue-80, #13639E);
      background-color: transparent;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s, color 0.3s;
    }
    .option:hover .option__remove {
      background-color: var(--ucd-blue-80, #13639E);
      color: var(--ucd-gold-100, #FFBF00);
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div class='container ${this.expanded ? 'expanded' : ''}'>
    <div class='title' @click=${() => this.expanded = !this.expanded}>
      <div>${this.name}</div>
      <app-icon slug='fa.solid.caret-right'></app-icon>
    </div>
    <div class='content'>
      <div class='search-form-wrapper' ?hidden=${this.hideSearch}>
        <input
          type='text'
          @input=${this.filterOptions}
          .value=${this.searchValue}
          placeholder=${this.searchPlaceholder}>
        <app-icon slug='fa.solid.magnifying-glass'></app-icon>
      </div>
      <div class='options ${this._hasScroll ? 'scroll' : 'no-scroll'}'>
        ${this._options.filter(opt => opt.selected).map(opt => _renderOption.call(this, opt))}
        ${this._options.filter(opt => !opt.selected).map(opt => _renderOption.call(this, opt))}
      </div>
    </div>
  </div>
`;}

function _renderOption(opt){
  if ( opt.hidden ) return html``;
  return html`
    <div class='option ${opt.selected ? 'selected' : ''}' @click=${() => this.toggleOption(opt)}>
      <div class='option__remove' ?hidden=${!opt.selected}>
        <app-icon slug='fa.solid.xmark'></app-icon>
      </div>
      <div class='option__label'>${opt.label}</div>
      <div class='option__count' ?hidden=${!opt.count}>${opt.count}</div>
    </div>
  `;
}
