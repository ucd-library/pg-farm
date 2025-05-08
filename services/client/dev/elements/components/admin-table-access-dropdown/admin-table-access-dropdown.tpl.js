import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: flex;
      align-items: center;
      position: relative;
      max-width: 250px;

      /* prevent text highlights on click */
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    :host(.opened) {
      border: 1px solid var(--ucd-gold-100, #FFBF00);
      background: var(--ucd-gold-30, #FFF9E6);
    }

    .container {
      width: 100%;
      height: 100%;
      display: grid;
    }

    .selected {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 9.5px;
    }

    .selected app-icon {
      color: var(--brand--primary-80);
      fill: var(--brand--primary-80);
    }

    .selected span {
      color: var(--black, #000);
      font-style: normal;
      font-weight: 400;
      line-height: 22.8px;
    }

    .content {
      position: absolute;
      top: calc(100% + 1px);
      left: 0;
      width: calc(100% - 1em);
      z-index: 10;
      padding: 0 .5rem;
      border: 1px solid var(--ucd-black-30, #CCC);
      background: #FFF;
      box-shadow: 0px 4px 6px 0px rgba(0, 0, 0, 0.20);
      transform-origin: center top;
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0;
      transform: scaleY(0);
    }

    .content.opened {
      display: block;
      opacity: 1;
      transform: scaleY(1);
    }

    .option {
      display: flex;
      cursor: pointer;
      margin: 1rem 0;
      cursor: pointer;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 9.5px;
      padding: 0.5rem;
    }

    .option:first-child {
      margin-top: .5rem;
    }

    .option:last-child {
      margin-bottom: .5rem;
    }

    .option h4 {
      margin: 0;
      color: var(--black, #000);
      font-style: normal;
      font-weight: 400;
      line-height: 22.8px;
    }

    .option p {
      margin: 0;
      color: var(--ucd-black-70, #4C4C4C);
      font-style: normal;
      font-weight: 400;
      line-height: 19px;
      font-size: var(--font-size--small, 0.875rem);
    }

    .option .icon app-icon {
      color: var(--ucd-quad, #3DAE2B);
      fill: var(--ucd-quad, #3DAE2B);
    }

    .option.selected {
      border-radius: 10px;
      background: rgba(61, 174, 43, 0.10);
    }

    .option .icon {
      opacity: 0;
    }

    .option.selected .icon {
      opacity: 1;
    }

    .container {
      padding: 0 .5rem;
    }

    @media (min-width: 768px) {
      .container {
        padding: 0 1rem;
      }
    }
  `;

  return [
    elementStyles
  ];
}

export function render() {
return html`
  <div class='container' @click=${this._onToggleOpen}>
    <div class='selected'>
      <span>${this.value}</span>
      <app-icon slug='fa.solid.caret-down'></app-icon>
    </div>
    <div class='content ${this.opened ? 'opened' : ''}'>
      <div class='option ${this.value === 'Editor' ? 'selected' : ''}' data-type='Editor' data-grant='WRITE' @click=${this._onSelectChange}>
        <div class='icon'>
          <app-icon slug='fa.solid.check'></app-icon>          
        </div>
        <div class='label'>
          <h4>Editor (default)</h4>
          <p>Insert, select, update, delete, truncate, references, trigger</p>
        </div>
      </div>
      <div class='option ${this.value === 'Viewer' ? 'selected' : ''}' data-type='Viewer' data-grant='READ' @click=${this._onSelectChange}>
        <div class='icon'>
          <app-icon slug='fa.solid.check'></app-icon>          
        </div>
        <div class='label'>
          <h4>Viewer</h4>
          <p>Select</p>
        </div>
      </div>
      <div class='option ${this.value === 'No Access' ? 'selected' : ''}' data-type='No Access' data-grant='NONE' @click=${this._onSelectChange}>
        <div class='icon'>
          <app-icon slug='fa.solid.check'></app-icon>          
        </div>
        <div class='label'>
          <h4>No Access</h4>
        </div>      
      </div>
    </div>
  </div>
`;}
