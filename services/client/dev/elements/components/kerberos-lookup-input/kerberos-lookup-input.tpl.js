import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    .container {
      position: relative;
    }

    .user-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .user-status--found app-icon {
      color: var(--quad, #3dae2b);
    }
    .user-status--not-found app-icon {
      color: var(--gunrock, #0047ba);
    }
  `;

  return [elementStyles];
}

export function render() {
  return html`
    <div class='container'>
      <input
        id=${this.idGen.get('username')}
        .value=${this.value}
        @input=${e => this._onInput('username', e.target.value)}
        required>
      <div ?hidden=${!this.value}>
        <div ?hidden=${this.kerberosId}>
          <div class='user-status user-status--not-found'>
            <app-icon slug='fa.solid.circle-question'></app-icon>
            <div>No UC Davis affiliate has this Kerberos ID</div>
          </div>
        </div>
        <div ?hidden=${!this.kerberosId}>
          <div class='user-status user-status--found'>
            <app-icon slug='fa.solid.circle-check'></app-icon>
            <div>Kerberos ID exists: <strong>${this.userFullName}</strong></div>
          </div>
        </div>
      </div>
    </div>
`;}
