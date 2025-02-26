import { html, css } from 'lit';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import formStyles from '@ucd-lib/theme-sass/1_base_html/_forms.css.js';
import brandColorStyles from '@ucd-lib/theme-sass/4_component/_category-brand.css.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
      --app-icon-size: 3rem;
    }
    .container {
      display: flex;
      gap: 1rem;
    }
    .loading app-icon {
      animation: spin 3s linear infinite;
      opacity: 0.5;
    }
    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }
    input {
      box-sizing: border-box;
      max-width: 200px;
    }
    .no-exist {
      color: var(--gray, #4c4c4c);
      font-size: var(--font-size--small, 0.875rem);
    }
    .input-wrapper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .search {
      background: white;
      max-height: 260px;
      overflow: auto;
      border: 1px solid var(--gray, #4c4c4c);
      padding: 1rem;
    }
    .search .result {
      gap: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: .5rem;
    }
    .search svg {
      height: 30px;
      width: 30px;
      fill: var(--gray, #4c4c4c);
      outline: var(--gray, #4c4c4c);
    }
    .search .text {
      font-size: 1rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }

  `;

  return [formStyles, brandColorStyles, elementStyles];
}

export function render() {
  let icon = 'fa.regular.circle-question';
  if ( this._loading ) {
    icon = 'fa.solid.circle-notch';
  } else if ( this._iconExists ){
    icon = this.value;
  } else if (!this.value || !this._value) {
    icon = this._default;
  }
return html`
  <div class='container ${this._loading ? 'loading' : ''}'>
    <app-icon slug=${icon} class='${this.brandColor}'></app-icon>
    <div class='input-wrapper'>
      <input
        type='text'
        .value=${this._value}
        @input=${e => this._onInput(e.target.value)}
        @keyup=${e => this._onKeyUp(e)}
        @focus=${e => this._onFocus(e)}
        @blur=${e => this._onBlur(e)}
      />
      <div ?hidden=${!(!this._iconExists && this.value)} class='no-exist'>This icon does not exist.</div>
    </div>
  </div>
  <div class="search" ?hidden=${!this.searchResults.length}>
    <div>Suggestions:</div>
    ${this.searchResults.map(result => html`
      <div class="result" @click=${() => this._onSuggestionClick(result)}>
        <div>${unsafeHTML(result.svg)}</div>
        <div class='label'>${result.label}</div>
      </div>
    `)}
  </div>

`;}
