import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '@ucd-lib/pgfarm-client/elements/components/app-search-input/app-search-input.js';
import '@ucd-lib/pgfarm-client/elements/components/app-search-badge-filter/app-search-badge-filter.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    .results {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid var(--ucd-black-30, #CCC);
      box-shadow: 0px 4px 6px 0px rgba(0, 0, 0, 0.20);
      padding: 0.5rem;
      background-color: #ffffff;
      max-height: 175px;
      overflow: auto;
    }
    .result {
      padding: 0.5rem;
      background: transparent;
      border: none;
      box-shadow: none;
      text-align: start;
      cursor: pointer;
    }
    .result:hover {
      border-radius: 0.5rem;
      background: var(--ucd-gold-30, #FFF9E6);
    }
    .label {
      font-size: 1rem;
      font-weight: 400;
      color: #000000;
      line-height: 1.2rem;
    }
    .value {
      color: var(--ucd-black-70, #4C4C4C);
      font-size: 0.875rem;
      line-height: 1rem;
    }
    .selected {
      margin-top: 2rem;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
<div>
  <app-search-input
    placeholder=${this.placeholder}
    @search-input=${this._onSearch}
    .value=${this.value}
    search-bar-style='basic'>
  </app-search-input>
  <div class='results' ?hidden=${this._options.every(opt => opt.hidden || opt.selected)}>
    ${this._options.filter(opt => !opt.hidden && !opt.selected).map(opt => {
      return html`
        <button class='result' @click=${() => this._onSelect(opt)}>
          <div class='label'>
            ${_highlightText.call(this, this.invertValueAndLabel ? opt.label : opt.value)}
          </div>
          <div class='value' ?hidden=${!this.showValueInResults}>
            ${_highlightText.call(this, this.invertValueAndLabel ? opt.value : opt.label)}
          </div>
        </button>
      `;
    })}
  </div>
  <div class='selected' ?hidden=${!this._options.some(opt => opt.selected)}>
    <app-search-badge-filter
      .values=${this._options.filter(opt => opt.selected).map(opt => opt.value)}
      @remove=${e => this._onRemove(e.detail.value)}>
    </app-search-badge-filter>
  </div>
</div>
`;}

function _highlightText(text){
  if ( !this.value || !text) return text;
  const search = this.value.replace(/[-\/\\^$.*+?()[\]{}|]/g, '\\$&'); // escape regex special characters
  const re = new RegExp(`(${search})`, 'gi');
  return unsafeHTML(text.replace(re, '<strong>$1</strong>'));
}
