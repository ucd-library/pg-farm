import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    .container {
      position: relative;
    }

    .results-list {
      position: absolute;
      top: 2.5rem;
      left: 0;
      right: 0;
      z-index: 10;
  
      display: flex;
      padding: 9.5px;
      flex-direction: column;
      align-items: flex-start;
      gap: 9.5px;

      border: 1px solid var(--ucd-black-30, #CCC);
      background: #FFF;
      box-shadow: 0px 4px 6px 0px rgba(0, 0, 0, 0.20);

      max-height: 12rem;
      overflow-y: auto;

      transform-origin: center top;
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0;
      transform: scaleY(0);
    }

    .results-list.opened {
      display: block;
      opacity: 1;
      transform: scaleY(1);
    }
    .result {
      padding: 9.5px;
      width: 100%;
      cursor: pointer;
    }
    .result:hover {
      border-radius: 10px;
      background: var(--ucd-gold-30, #FFF9E6);
    }
    .result .username .search-match {
      font-weight: 700;
    }
    .result .username {
      color: var(--black, #000);
      font-size: 19px;
      font-style: normal;
      font-weight: 400;
      line-height: 22.8px;
    }
    .result .fullname {
      color: var(--ucd-black-70, #4C4C4C);
      font-size: 16.62px;
      font-style: normal;
      font-weight: 400;
      line-height: 19px;
    }
  `;

  return [elementStyles];
}

export function render() {
  return html`
    <div class='container'>
      <input
        id=${this.idGen.get('username')}
        .value=${this.kerberosId || ''}
        @input=${e => this._onInput('username', e.target.value)}
        required>

      <div class='results-list ${this.searchResults.length > 0 ? 'opened' : ''}' ?hidden=${!this.searchResults.length}>
        ${this.searchResults.map(
          (result, index) =>
            html`
              <div class='result' data-row-id=${index} @click=${this._onSelectResult}>
                <div class='username'><strong>${result.userID}</strong></div>
                <div class='fullname'>${result.dFullName}</div>
              </div>
            `
        )}
      </div>
    </div>
`;}
