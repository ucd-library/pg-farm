import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }
  `;

  return [elementStyles];
}

export function render() { 
return html`

<div>
  <h1>Database Admin</h1>
  <p>Perform admin functions on the database</p>
  <div>Database Instance: ${this.metadata?.instance?.name}</div>
  <div>Database Instance State: ${this.metadata?.instance?.state}</div>
</div>

<div ?hidden="${this.metadata?.instance?.state != 'SLEEP'}">
  <div ?hidden="${this.startingInstance}">
    <div>Instance is currently in a sleep state.  You must wake up the database to perform admin functions.</div>
    <button @click="${this._onWakeUpBtnClick}">Wake Up</button>
  </div>
  <div ?hidden="${!this.startingInstance}">
    <div>Starting database instance...  this may take a moment...</div>
  </div>
</div>

<div ?hidden="${this.metadata?.instance?.state == 'SLEEP'}">
  <div>Schemas: 
    <select @change="${this._onSchemaSelectChange}">
      <option 
        .selected="${!this.view.schema}"
        value="/db/${this.view.organization}/${this.view.database}">
        Select Schema
      </option>
      
      ${this.schemas.map(schema => html`
        <option 
          .selected="${this.view.schema === schema}"
          value="/db/${this.view.organization}/${this.view.database}/${schema}">
          ${schema}
        </option>
      `)}
    </select>

  </div>
  <div ?hidden="${!this.view.schema}">Users: 
    <select @change="${this._onUserSelectChange}">
      <option 
        .selected="${!this.view.subPageValue}"
        value="/db/${this.view.organization}/${this.view.database}/${this.view.schema}">
        Select User
      </option>
      
      ${this.users.map(user => html`
        <option 
          .selected="${this.view.subPageValue === user}"
          value="/db/${this.view.organization}/${this.view.database}/${this.view.schema}/user/${user}">
          ${user}
        </option>
      `)}
    </select>
  </div>

  <div ?hidden="${this.view.subPage != 'user'}">
    <div>Schema Access for ${this.view.subPageValue}</div>

    <div>
      <span>Read: ${this.userData?.schema?.usage}</span>,
      <span>Write: ${this.userData?.schema?.create}</span>
    </div>

    <div>Table Access</div>
    <div>
      ${(this.userData.tables || []).map(table => html`
        <div>
          <span>${table.name}: ${table.access.join(', ')}</span>
        </div>
      `)}
    </div>
  </div>

</div>
`;}