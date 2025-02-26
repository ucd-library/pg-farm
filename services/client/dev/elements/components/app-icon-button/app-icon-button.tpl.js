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
      justify-content: center;
      border-width: 3px;
      border-style: solid;
      cursor: pointer;
      text-decoration: none;
      transition: background-color .2s ease, border-color .2s ease, color .2s ease;
    }
    .container.basic {
      width: var(--app-icon-button-size, 2rem);
      color: var(--ucd-blue-80, #13639E);
      background-color: transparent;
      border-color: transparent;
    }
    .container.basic:hover {
      color: var(--ucd-gold-100, #FFBF00);
    }
    .container.basic:active {
      border-color: var(--ucd-gold-100, #FFBF00);
    }
    .container.basic:focus {
      background: var(--ucd-gold-60, #FFECB2);
      border-color: var(--ucd-gold-60, #FFECB2);
      color: var(--ucd-blue-80, #13639E);
    }
    .container.round {
      width: var(--app-icon-button-size, 2.5rem);
      height: var(--app-icon-button-size, 2.5rem);
      min-width: var(--app-icon-button-size, 2.5rem);
      min-height: var(--app-icon-button-size, 2.5rem);
      border-radius: 50%;
    }
    .container:hover {
      text-decoration: none;
    }
    .container:focus {
      text-decoration: none;
      outline: none;
    }
    .container[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    app-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .basic app-icon {
      --app-icon-size: 75%;
    }
    .round app-icon {
      --app-icon-size: 55%;
    }
    .container.round.color--light {
      background-color: var(--ucd-blue-40, #DBEAF7);
      border-color: var(--ucd-blue-40, #DBEAF7);
      color: var(--ucd-blue, #022851);
    }
    .container.round.color--light:hover {
      background-color: var(--ucd-blue-60, #B0D0ED);
      border-color: var(--ucd-blue-60, #B0D0ED);
    }
    .container.round.color--light:focus {
      background-color: var(--ucd-blue-40, #DBEAF7);
      border-color: var(--ucd-blue-80, #13639E);
    }
    .container.round.color--dark {
      background-color: var(--ucd-blue, #022851);
      border-color: var(--ucd-blue, #022851);
      color: var(--white, #FFFFFF);
    }
    .container.round.color--dark:hover {
      background-color: var(--ucd-gold, #FFBF00);
      border-color: var(--ucd-gold, #FFBF00);
      color: var(--ucd-blue, #022851);
    }
    .container.round.color--dark:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }
    .container.round.color--medium {
      background-color: var(--ucd-blue-80, #13639E);
      border-color: var(--ucd-blue-80, #13639E);
      color: var(--white, #FFFFFF);
    }
    .container.round.color--medium:hover {
      background-color: var(--ucd-blue, #022851);
      border-color: var(--ucd-blue, #022851);
    }
    .container.round.color--medium:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }
    .container.round.color--white {
      background-color: var(--white, #FFFFFF);
      border-color: var(--white, #FFFFFF);
      color: var(--ucd-blue-80, #13639E);
    }
    .container.round.color--white:hover {
      background-color: var(--ucd-blue-80, #13639E);
      border-color: var(--ucd-blue-80, #13639E);
      color: var(--ucd-gold, #FFBF00);
    }
    .container.round.color--white:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }

  `;

  return [elementStyles];
}

export function render() {
  const containerClass = `container color--${this.color} ${this.basic ? 'basic' : 'round'}`;
  if ( this.href && !this.disabled ) {
    return html`
      <a href='${this.href}' class='${containerClass}'>
        <app-icon slug=${this.icon}></app-icon>
      </a>
    `;
  } else {
    return html`
      <button class='${containerClass}' ?disabled=${this.disabled}>
        <app-icon slug=${this.icon}></app-icon>
      </button>
    `;
  }
}
