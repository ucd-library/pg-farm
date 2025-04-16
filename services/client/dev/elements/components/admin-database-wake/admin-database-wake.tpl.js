import { html, css } from 'lit';
import buttonStyles from '@ucd-lib/theme-sass/2_base_class/_buttons.css.js';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }
    .btn app-icon {
      animation: spin 3s linear infinite;
      margin-right: 0.5rem;
    }
    .btn {
      box-sizing: border-box;
      font-size: 1rem;
    }
    .intro-text {
      margin-bottom: 1rem;
    }
    .container {
      padding: 1rem;
      border: 2px dotted var(--ucd-gold, #ffbf00);
    }
    .starting-text {
      margin-bottom: 1rem;
      color: var(--double-decker, #c10230);
    }
  `;

  return [
    buttonStyles,
    elementStyles
  ];
}

export function render() {
  if ( !this.orgName || !this.dbName ) return html``;
  return html`
    <div ?hidden=${this.isAwake} class='container'>
      <div class='intro-text'>Instance is currently hibernating. You must wake up the database to perform administrative functions.</div>
      <div ?hidden=${!this._isWakingUp} class='starting-text'>Starting database instance. This may take a moment....</div>
      <button
        ?disabled=${this._isWakingUp}
        class='btn btn--primary'
        @click=${this._onWakeUpBtnClick}>
        <app-icon slug='fa.solid.circle-notch' ?hidden=${!this._isWakingUp}></app-icon>
        <span>Wake Up</span>
      </button>
    </div>
`;}
