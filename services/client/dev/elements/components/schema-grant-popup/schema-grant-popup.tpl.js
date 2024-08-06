import { html, css } from 'lit';
import buttons from '@ucd-lib/theme-sass/2_base_class/_buttons.css';

export function styles() {
  const elementStyles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
    }

    .content {
      background: rgba(0,0,0,0.5);
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .content > div {
      background: white;
      padding: 20px;
      margin: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      min-width: 300px;
    }
  `;

  return [elementStyles, buttons];
}

export function render() { 
return html`

<div class="content"> <!-- start content -->
  <div> <!-- start content white box -->
    <div>
      <div style="display: flex; justify-content: space-between;">
        <h2 style="flex: 1; margin-top: 0">
          <span ?hidden="${this.grantMode !== true || this.grantMode !== null}">Grant</span>
          <span ?hidden="${this.grantMode !== false}">Revoke</span>
          <span ?hidden="${this.showTableRow()}">Schema</span>
          <span ?hidden="${!this.showTableRow()}">Table</span> 
          Access
        </h2>
        <div>
          <a @click="${this._onCloseClicked}">Close</a>
        </div>
    </div>
    <div>

      <div style="display: flex">
        <b>User:</b> 
        <span ?hidden="${!this.username}">${this.username}</span>
        <div ?hidden="${this.username}">
          <select id="user-select">
            <option value="">Select User</option>
            ${this.userSelect.map(user => html`<option value="${user.name}">${user.name}</option>`)}
          </select>
        </div>
      </div>
      <div><b>Database:</b> ${this.dbName}</div>
      <div style="margin-bottom: 15px"><b>Schema:</b> ${this.schemaName}</div>
      
      <div ?hidden="${!this.showTableRow()}">
        <div style="display: flex; ">
          <span><b>Table:</b> </span> 
          <div ?hidden="${!this.showTableSelect()}">
            <select @change="${this._onTableSelected}">
              <option value="">Select Table</option>
              ${this.tableSelect.map(table => html`<option value="${table.table_name}">${table.table_name}</option>`)}
            </select>
          </div>
          <div ?hidden="${this.showTableSelect()}">${this.tableName}</div>
        </div>
      </div>
    </div>

    <table>
      <tr>
        <td><input type="radio" id="grant-permission-read" name="grant-permission" value="READ" /></td>
        <td><label for="grant-permission-read">Read</label></td>
      <tr>
      <tr>
        <td><input type="radio" id="grant-permission-write" name="grant-permission" value="WRITE" /></td>
        <td><label for="grant-permission-write">Write/Execute</label></td>
      <tr>
      <tr ?hidden=${!this.showRevokeOption()}>
        <td><input type="radio" id="grant-permission-remove" name="grant-permission" value="NONE" /></td>
        <td><label for="grant-permission-remove" >Revoke Access</label></td>
      <tr>
    </table>

    <div ?hidden="${this.showTableRow()}">
      <div ?hidden="${this.grantMode !== true}">
        This will grant the selected permission for user ${this.username} on ALL objects in schema ${this.schemaName}.
      </div>
      <div ?hidden="${this.grantMode !== false}">
        This will revoke all privilages for user ${this.username} on ALL objects in schema ${this.schemaName}.
      </div>
    </div>

    <button class="btn" @click="${this._onCloseClicked}">Cancel</button>
    <button class="btn" @click="${this._onGrantClicked}">
      <span ?hidden="${this.grantMode !== true && this.grantMode !== null}">Grant</span>
      <span ?hidden="${this.grantMode !== false}">Revoke</span>
    </button>

  </div> <!-- end content white box -->
</div> <!-- end content -->

`;}