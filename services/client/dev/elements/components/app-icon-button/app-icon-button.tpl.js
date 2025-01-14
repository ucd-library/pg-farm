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
      width: var(--app-icon-button-size, 2.5rem);
      height: var(--app-icon-button-size, 2.5rem);
      min-width: var(--app-icon-button-size, 2.5rem);
      min-height: var(--app-icon-button-size, 2.5rem);
      border-radius: 50%;
      border-width: 3px;
      border-style: solid;
      cursor: pointer;
      text-decoration: none;
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
      --app-icon-size: 55%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container.color--light {
      background-color: var(--ucd-blue-40, #DBEAF7);
      border-color: var(--ucd-blue-40, #DBEAF7);
      color: var(--ucd-blue, #022851);
    }
    .container.color--light:hover {
      background-color: var(--ucd-blue-60, #B0D0ED);
      border-color: var(--ucd-blue-60, #B0D0ED);
    }
    .container.color--light:focus {
      background-color: var(--ucd-blue-40, #DBEAF7);
      border-color: var(--ucd-blue-80, #13639E);
    }
    .container.color--dark {
      background-color: var(--ucd-blue, #022851);
      border-color: var(--ucd-blue, #022851);
      color: var(--white, #FFFFFF);
    }
    .container.color--dark:hover {
      background-color: var(--ucd-gold, #FFBF00);
      border-color: var(--ucd-gold, #FFBF00);
      color: var(--ucd-blue, #022851);
    }
    .container.color--dark:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }
    .container.color--medium {
      background-color: var(--ucd-blue-80, #13639E);
      border-color: var(--ucd-blue-80, #13639E);
      color: var(--white, #FFFFFF);
    }
    .container.color--medium:hover {
      background-color: var(--ucd-blue, #022851);
      border-color: var(--ucd-blue, #022851);
    }
    .container.color--medium:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }
    .container.color--white {
      background-color: var(--white, #FFFFFF);
      border-color: var(--white, #FFFFFF);
      color: var(--ucd-blue-80, #13639E);
    }
    .container.color--white:hover {
      background-color: var(--ucd-blue-80, #13639E);
      border-color: var(--ucd-blue-80, #13639E);
      color: var(--ucd-gold, #FFBF00);
    }
    .container.color--white:focus {
      border-color: var(--ucd-gold, #FFBF00);
    }

  `;

  return [elementStyles];
}

export function render() {
  const containerClass = `container color--${this.color}`;
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
