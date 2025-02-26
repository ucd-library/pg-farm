import { LitElement } from 'lit';
import {render, styles} from "./app-file-input.tpl.js";
import { createRef } from 'lit/directives/ref.js';

export default class AppFileInput extends LitElement {

  static get properties() {
    return {
      imageUrl: { type: String, attribute: 'image-url' },
      dragging: { type: Boolean },
      label: { type: String },
      labelSubtext: { type: String, attribute: 'label-subtext' },
      fileSizeLimit: { type: Number, attribute: 'file-size-limit' },
      errorMessage: { type: String }
    }
  }

  static get styles() {
    return styles();
  }

  constructor() {
    super();
    this.render = render.bind(this);

    this.imageUrl = '';
    this.dragging = false;
    this.label = ' Drag and drop or browse for file';
    this.labelSubtext = '';
    this.fileSizeLimit = 0;
    this.errorMessage = '';

    this.inputRef = createRef();
  }

  openFilePicker() {
    this.inputRef.value.click();
  }

  _onDragOver(e) {
    e.preventDefault();
    this.dragging = true;
  }

  _onDragLeave() {
    this.dragging = false;
  }

  _onDrop(e){
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  _onFileInput(e) {
    const file = e.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  processFile(file){
    if (this.fileSizeLimit && file.size > this.fileSizeLimit) {
      this.errorMessage = `File size exceeds ${this.fileSizeLimit / (1024 * 1024)}MB limit`;
      return;
    }
    this.errorMessage = '';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result;
        this._emitFileChange(file, reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  _onRemoveImage(){
    this.imageUrl = '';
    this.errorMessage = '';
    this._emitFileChange(null, '');
  }

  _emitFileChange(file, dataUrl){
    this.dispatchEvent(new CustomEvent('file-change', { detail: { file, dataUrl } }));
  }

}

customElements.define('app-file-input', AppFileInput);
