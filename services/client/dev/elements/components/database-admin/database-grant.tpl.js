import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    :host {
      display: none;
      position: fixed;
      z-index: 1000;
      overflow: auto;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background-color: white;
    }

    .header { 
      display: flex;
    } 
    .header h1 {
      flex: 1;
      margin: 0;
      padding: 1rem;
    }
    .header .close-btn {
      padding: 1rem;
    }


  `;

  return [elementStyles];
}

export function render() { 
return html`

<div class="header">
  <h1>Database Grant: ${this.database.pathname}</h1>
  <button class="close-btn" @click="${this._onCloseBtnClick}">Close</button>
</div>
<div class="content">
  <div>
    <input type="text" placeholder="CAS Username" @keyup="${this._onUsernameKeyup}"> 
    <span ?hidden="${!this.userInDb}">Existing database user</span>
    <span ?hidden="${this.userInDb}">New database user</span>
  </div>

  <ucdlib-pages
    selected="${this.view}"
    selectedAttribute="visible">

    <div id="schema">
      Alter all table permissions in schema <b>${this.schema}</b> for 
      user <b>${this.user}</b> to:

      <div>
      <select @change="${this._onPermissionSelectChange}">
          ${this.options.map(option => html`
            <option ?disabled=${!this.userInDb && option.value === 'NONE'}>${option.label}</option>
          `)}
        </select>
      </div>
    </div>
    <div id="table">
      Update user <b>${this.user}</b> on table <b>${this.schema}.${this.table}</b> to:

      <div>
        Change permissions to:
        <select @change="${this._onPermissionSelectChange}">
          ${this.options.map(option => html`
            <option ?disabled=${!this.userInDb && option.value === 'NONE'}>${option.label}</option>
          `)}
        </select>
      </div>
    </div>

  </ucdlib-pages>
</div>

`;}