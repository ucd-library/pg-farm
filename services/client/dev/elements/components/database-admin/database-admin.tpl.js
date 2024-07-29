import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: block;
    }

    .toggle-btns {
      margin-bottom: 25px;
    }

    .toggle-btns a {
      text-decoration: none;
    }

    .sub-page-layout {
      display: flex;
    }

    .sub-page {
      flex: 1;
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
          value="/db/${this.view.organization}/${this.view.database}/${schema}${this.view.subPage ? "/"+this.view.subPage : ""}">
          ${schema}
        </option>
      `)}
    </select>

  </div>

  <div class="sub-page-layout">


    <div ?hidden="${!this.view.schema}">
      <div class="toggle-btns">
        <a href="/db/${this.view.organization}/${this.view.database}/${this.view.schema}/user">
          <button class="btn btn--sm ${this.view.subPage == "user" ? "btn--primary" : ""}">Users</button>
        </a>
        <a href="/db/${this.view.organization}/${this.view.database}/${this.view.schema}/table">
          <button class="btn btn--sm ${this.view.subPage == "table" ? "btn--primary" : ""}">Tables</button>
        </a>
      </div>

      <div ?hidden="${this.view.subPage != "user"}" >
        ${this.users.map(user => html`
          <div>
            <button class="btn btn--sm ${this.view.subPageValue === user ? "btn--primary" : ""}">
              <a href="/db/${this.view.organization}/${this.view.database}/${this.view.schema}/user/${user}">${user}</a>
            </button>
          </div>
        `)}
      </div>

      <div ?hidden="${this.view.subPage != "table"}" >
        ${this.tables.map(table => html`
          <div>
            <button class="btn btn--sm ${this.view.subPageValue === table.table_name ? "btn--primary" : ""}">
              <a href="/db/${this.view.organization}/${this.view.database}/${this.view.schema}/table/${table.table_name}">${table.table_name}</a>
            </button>
          </div>
        `)}
      </div>
    </div>


    <div class="sub-page" ?hidden="${this.view.subPage != 'user'}">
      <div ?hidden="${!this.view.subPageValue}">
        <div><b>Schema Access for ${this.view.subPageValue}</b></div>

        <div style="margin-bottom: 25px">
          <span>Read: ${this.userData?.schema?.usage}</span>,
          <span>Write: ${this.userData?.schema?.create}</span>
          <a @click=${this._onEditUserTableAccessClick}>Edit</a>
        </div>

        <div><b>Table Access</b></div>
        <div>
          ${(this.userData.tables || []).map(table => html`
            <div>
              <span>
                ${table.name} (<a @click=${this._onEditUserTableAccessClick} table="${table.name}">Edit</a>): 
                ${table.access.join(', ')}
              </span>
            </div>
          `)}
        </div>
      </div>
      <div ?hidden="${this.view.subPageValue}">
        Select a user to view/modify schema access
      </div>
    </div>

    <div class="sub-page" ?hidden="${this.view.subPage != 'table'}">
      <div>User Access for ${this.view.subPageValue} (<a @click=${this._onEditUserTableAccessClick}>Add</a>)</div>

      <div>
        ${(this.tableData || []).map(user => html`
          <div>
            <span>${user.name} (<a user=${user.name} @click=${this._onEditUserTableAccessClick}>Edit</a>): ${user.access.join(', ')}</span>
          </div>
        `)}
      </div>
    </div>
  
  </div>

</div>
`;}