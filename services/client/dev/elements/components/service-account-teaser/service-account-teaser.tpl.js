import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
      container-type: inline-size;
    }
    .container {
      padding: .5rem 1rem;
      border-left: 2px solid var(--ucd-gold);
    }

    .title {
      margin: 0 0 var(--spacer--small, .5rem) 0;
      padding: 0;
      color: var(--forced-contrast-heading-primary, #022851);
      font-size: 1rem;
      font-style: normal;
      font-weight: 800;
      line-height: 1.2;
      font-size: 1.092rem;
    }
    .rotated {
      color: var(--ucd-black-70, #4C4C4C);
      font-size: var(--font-size--small, .875rem);
      margin-bottom: var(--spacer--small, .5rem);
      display: flex;
      gap: .25rem;
      align-items: center;
    }
    .description {
      font-size: var(--font-size, 1rem);
    }
    button.rotate-button {
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
      font-size: var(--font-size--small, .875rem);
      color: var(--ucd-black-70, #4C4C4C);
    }
    button.rotate-button:hover, button.rotate-button:focus {
      text-decoration: underline;
      cursor: pointer;
    }

    @keyframes dot-flash {
      0%, 80%, 100% { opacity: 0; }
      40% { opacity: 1; }
    }
    .rotating-indicator span {
      animation: dot-flash 1.4s infinite ease-in-out;
    }
    .rotating-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .rotating-indicator span:nth-child(3) { animation-delay: 0.4s; }
    .rotated .separator {
      padding: 0 .25rem;
    }

    @container (width < 475px) {
      .rotated {
        flex-direction: column;
        align-items: flex-start;
      }
      .rotated .separator {
        display: none;
      }
    }
  `;

  return [elementStyles];
}

export function render() { 
  return html`
    <div class='container'>
      <div class='title'>${this.username}</div>
      <div class='rotated'>
        <div>Password Last Rotated: </div>
        <div>${this.lastRotatedText}</div>
        <div class='separator'>|</div>
        <button class='rotate-button' @click=${this._onRotateClick} ?hidden=${this.rotating}>Rotate Now</button>
        <div class='rotating-indicator' ?hidden=${!this.rotating}>Rotating<span>.</span><span>.</span><span>.</span></div>
      </div>
      <div class='description'>
        ${this.data.description || ''}
      </div>
    </div>
  `;
}