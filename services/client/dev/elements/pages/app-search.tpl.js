import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }

    .db-search-result-item {
      padding: 0.5em;
      margin: 0.5em;
      border: 1px solid var(--ucd-blue-40);
    }
  `;

  return [elementStyles];
}

export function render() { 
return html`

<div>
  <input type="text" placeholder="Search" @keyup=${this._onInputKeyup} />
</div>

<div ?hidden=${this.loading}>
  Showing ${this.resultStartIndex} - ${this.resultEndIndex} of ${this.total} results
</div>

<div>
  ${this.items.map(item => html`
    <div>
      <h2>
        <a href="/db/${item.pathName}">${item.title}</a>
        ${item.shortDescription ? html`<span>${item.shortDescription}</span>` : ''}
      </h2>
      <div>
        ${item.tags ? item.tags.map(tag => html`<span>${tag}</span>`) : ''}
      </div>
      <div>
        <div>${item.description}</div>
        <div>
          ${item.url ? html`<a href="${item.url}" target="_blank">${item.url}</a>` : ''}
        </div>
      </div>
    </div>
  `)}
</div>

`;}