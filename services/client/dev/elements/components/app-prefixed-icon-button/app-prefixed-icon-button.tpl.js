import { html, css } from 'lit';
import '../app-icon/app-icon.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: inline-block;
    }
    .container {
      display: flex;
      align-items: center;
      cursor: pointer;
      text-decoration: none;
      gap: .5rem;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 2.5rem;
      padding: .5rem 1rem;
      border: none;
      box-shadow: none;
      transition: background-color .2s, color .2s;
    }
    .container.color--light {
      background: var(--ucd-blue-40, #DBEAF7);
      color: var(--ucd-blue, #022851);
    }
    .container.color--light app-icon {
      color: var(--ucd-blue-80, #13639E);
    }
    .container.color--light:hover {
      background: var(--ucd-blue-60, #B0D0ED);
    }
    .container.color--dark {
      background: var(--ucd-blue, #022851);
      color: var(--white, #FFF);
    }
    .container.color--dark app-icon {
      color: var(--ucd-gold, #FFBF00);
    }
    .container.color--dark:hover {
      background: var(--ucd-gold, #FFBF00);
      color: var(--ucd-blue, #022851);
    }
    .container.color--dark:hover app-icon {
      color: var(--ucd-blue, #022851);
    }
    .container.color--medium {
      background-color: var(--ucd-blue-80, #13639E);
      color: var(--white, #FFF);
    }
    .container.color--medium app-icon {
      color: var(--ucd-gold, #FFBF00);
    }
    .container.color--medium:hover {
      background-color: var(--ucd-blue, #022851);
    }
    .container[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    ::slotted(*) {
      display: none !important;
    }
    slot {
      display: none;
    }
  `;

  return [elementStyles];
}

export function render() {
  const containerClass = `container color--${this.color}`;
  return html`
    <slot @slotchange=${this._onSlotChange}></slot>
    ${this.href && !this.disabled ? html`
      <a href='${this.href}' class=${containerClass}>
        <app-icon slug=${this.icon}></app-icon>
        <span>${this.text}</span>
      </a>
      ` : html`
      <button class=${containerClass} ?disabled=${this.disabled}>
        <app-icon slug=${this.icon}></app-icon>
        <span>${this.text}</span>
      </button>
      `}
  `;
}
