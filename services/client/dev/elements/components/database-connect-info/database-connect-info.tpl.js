import { html, css, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import formStyles from '@ucd-lib/theme-sass/1_base_html/_forms.css.js';
import prismStyles from 'prismjs/themes/prism.css';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    select {
      max-width: 200px;
    }
    pre {
      overflow-x: scroll;
      padding: 1rem;
      background-color: var(--ucd-blue-30, #ebf3fa);
      font-size: .875rem;
    }
    .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string {
      background-color: transparent;
    }
  `;

  return [
    formStyles,
    unsafeCSS(prismStyles),
    elementStyles
  ];
}

export function render() {
return html`
  <div class='container'>
    <div class='field-container'>
      <label for=${this.idGen.get('connectionType')}>Connection Type</label>
      <select id=${this.idGen.get('connectionType')} @input=${e => this.connectionType = e.target.value}>
        <option value='' ?selected=${this.connectionType === ''} disabled>Choose a connection type</option>
        ${this.examples.getConnectionTypes().map( type => html`
          <option value=${type} ?selected=${this.connectionType === type}>${type}</option>
          `)}
      </select>
    </div>
    <div ?hidden=${!this._exampleCode}>
      <pre><code>${unsafeHTML(this._exampleCode)}</code></pre>
    </div>
  </div>

`;}
