import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    .title {
      font-weight: 700;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div ?hidden=${this.hideContent}>
    <div class="title">Build Information</div>
    <div ?hidden=${!this.clientEnv}>
      <span>Client Environment:</span>
      <span>${this.clientEnv}</span>
    </div>
    <div ?hidden=${!this.date}>
      <span>Date:</span>
      <span>${this.date}</span>
    </div>
    <div ?hidden=${!this.commit}>
      <span>Commit:</span>
      <span>${this.commit}</span>
    </div>
    <div ?hidden=${!this.branch}>
      <span>Branch:</span>
      <span>${this.branch}</span>
    </div>
    <div ?hidden=${!this.tag}>
      <span>Tag:</span>
      <span>${this.tag}</span>
    </div>
  </div>
`;}
