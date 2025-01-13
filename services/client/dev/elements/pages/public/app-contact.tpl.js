import { html, css } from 'lit';

export function styles() {
  const elementStyles = css`
    app-contact {
      display: block;
    }
    app-contact .recaptcha-disclaimer {
      color: var(--gray-light, #999);
      font-size: var(--font-size--small, 0.875rem);
      margin-top: .5rem;
    }
    app-contact .field-container:has(.validation-messages) input {
      border-color: var(--double-decker, #c10230);
    }
    app-contact .field-container:has(.validation-messages) textarea {
      border-color: var(--double-decker, #c10230);
    }
    app-contact .validation-messages {
      color: var(--double-decker, #c10230);
      font-size: var(--font-size--small, 0.875rem);
      font-weight: 700;
      margin-top: .25rem;
    }
  `;

  return [elementStyles];
}

export function render() {
return html`
  <div ?hidden=${this._showSuccess}>
    <div class='page-header'>
      <div class='page-header__wrapper'>
        <div class='page-header__title'>
          <h1>Get Started with PG-Farm</h1>
        </div>
        <div class='page-header__description'>
          Tell us about your project using the form below or by emailing us at <a href='pgfarm@ucdavis.edu'>pgfarm@ucdavis.edu</a>.
        </div>
      </div>
    </div>
    <div class='l-container--narrow-desktop u-space-mt--large'>
      <div ?hidden=${!this.failedValidations.length} class='alert alert--error'>
        Submission failed. Please correct the following errors and try again.
      </div>
      ${_renderForm.call(this)}
    </div>
  </div>
  ${_renderSuccess.call(this)}
`;}

/**
 * @description Render the contact form
 * @returns {TemplateResult}
 */
function _renderForm(){
  return html`
    <form @submit=${this._onFormSubmit}>
      <div class='u-space-mb--large'>
        <h2 class='heading--auxiliary'>Contact Information</h2>
        ${_renderInput.call(this, 'contactName', 'Name *')}
        ${_renderInput.call(this, 'contactTitle', 'Title')}
        ${_renderInput.call(this, 'contactEmail', 'Email *', {type: 'email'})}
        ${_renderInput.call(this, 'contactDepartment', 'Department')}
      </div>
      <div class='u-space-mb--large'>
      <h2 class='heading--auxiliary'>Your Project</h2>
        ${_renderInput.call(this, 'projectDescription', 'Briefly describe your project *', {type: 'textarea'})}
        <div class='field-container'>
          <label>What is the current stage of your project?</label>
          <ul class="list--reset radio">
            <li>${_renderRadioItem.call(this, 'projectStage', 'Grant proposal writing', 'grant')}</li>
            <li>${_renderRadioItem.call(this, 'projectStage', 'Ongoing', 'ongoing')}</li>
            <li>${_renderRadioItem.call(this, 'projectStage', 'Archiving', 'archiving')}</li>
            <li>${_renderRadioItem.call(this, 'projectStage', 'Other:', 'other')}</li>
          </ul>
          ${_renderValidations.call(this, 'projectStage')}
          <div class='u-space-ml--large u-space-mt--small'>
            ${_renderInput.call(this, 'projectStageOther', 'Please specify', {hideLabel: true, disabled: this.data.projectStage !== 'other'})}
          </div>
        </div>
        <div class='field-container'>
          <label>Do you currently have a database</label>
          <ul class="list--reset radio">
            <li>${_renderRadioItem.call(this, 'hasDatabase', 'No', 'no')}</li>
            <li>${_renderRadioItem.call(this, 'hasDatabase', 'Yes. The type of database I have is:', 'yes')}</li>
          </ul>
          ${_renderValidations.call(this, 'hasDatabase')}
          <div class='u-space-ml--large u-space-mt--small'>
            ${_renderInput.call(this, 'databaseType', 'Please specify', {hideLabel: true, disabled: this.data.hasDatabase !== 'yes'})}
          </div>
        </div>
        ${_renderInput.call(this, 'datasetSize', 'How large is your dataset')}
        <div class='field-container'>
          <label>Do you expect your dataset to grow at a rate over 10 GB per year?</label>
          <ul class="list--reset radio">
            <li>${_renderRadioItem.call(this, 'datasetGrowth', 'No', 'no')}</li>
            <li>${_renderRadioItem.call(this, 'datasetGrowth', 'Yes', 'yes')}</li>
          </ul>
          ${_renderValidations.call(this, 'datasetGrowth')}
        </div>
        <div class='field-container'>
          <label>Who will need access to your data?</label>
          <ul class="list--reset checkbox">
            <li>${_renderCheckboxItem.call(this, 'access', 'UC Davis affiliates', 'affiliates')}</li>
            <li>${_renderCheckboxItem.call(this, 'access', 'External collaborators', 'external')}</li>
            <li>${_renderCheckboxItem.call(this, 'access', 'Website Portal and/or Application', 'application')}</li>
          </ul>
          ${_renderValidations.call(this, 'access')}
        </div>
      </div>
      <button type='submit' class="btn btn--primary btn--lg u-space-mt">Submit Form</button>
      <div class='recaptcha-disclaimer' ?hidden=${this._recaptchaDisabled}>
          This site is protected by reCAPTCHA and the Google
        <a href="https://policies.google.com/privacy">Privacy Policy</a> and
        <a href="https://policies.google.com/terms">Terms of Service</a> apply.
      </div>
    </form>
  `;
}

/**
 * @description Render the success message for after the form is submitted
 * @returns {TemplateResult}
 */
function _renderSuccess(){
  return html`
    <div ?hidden=${!this._showSuccess}>
      <div class='l-container--narrow-desktop u-space-pt--medium-2x u-align--center'>
        <h1 class='u-space-my--medium'>Thank you!</h1>
        <div>Thanks for your interest in PG-Farm. We'll be in touch with you soon!</div>
        <div>The form data didn't actually go anywhere. TODO: wire it up.</div>
      </div>
    </div>
  `;
}

/**
 * @description Render a checkbox item
 * @param {String} prop - property name on this.data
 * @param {String} label - label for the checkbox
 * @param {String} value - Value to push/pop from this.data[prop] on input
 * @returns {TemplateResult}
 */
function _renderCheckboxItem(prop, label, value){
  const id = this.idGen.get(`${prop}-${value}`);
  const propValue = this.data[prop] || [];
  return html`
    <input
      id=${id}
      name=${this.idGen.get(prop)}
      type='checkbox'
      @input=${() => this._onInput(prop, propValue.includes(value) ? propValue.filter(v => v !== value) : [...propValue, value])}
      .checked=${propValue.includes(value)} />
    <label for=${id}>${label}</label>
  `;
}

/**
 * @description Render a radio item
 * @param {String} prop - property name on this.data
 * @param {String} label - label for the radio item
 * @param {String} value - Value to set this.data[prop] on input
 * @returns {TemplateResult}
 */
function _renderRadioItem(prop, label, value){
  const id = this.idGen.get(`${prop}-${value}`);
  return html`
    <input
      id=${id}
      name=${this.idGen.get(prop)}
      type='radio'
      @input=${() => this._onInput(prop, value)}
      .checked=${this.data[prop] === value} />
    <label for=${id}>${label}</label>
  `;
}

/**
 * @description Render an input or textarea element
 * @param {String} prop - property name on this.data
 * @param {String} label - label for the input
 * @param {Object} opts - options for the input
 * @param {String} opts.type - input type (default: text)
 * @param {Boolean} opts.required - is the input required (default: false)
 * @param {String} opts.placeholder - input placeholder (default: '')
 * @param {Boolean} opts.hideLabel - hide the label (default: false)
 * @param {Number} opts.rows - number of rows for textarea (default: 3)
 * @param {Boolean} opts.disabled - is the input disabled (default: false)
 * @returns {TemplateResult}
 */
function _renderInput(prop, label, opts={}){
  let {
    type='text',
    required=false,
    placeholder='',
    hideLabel=false,
    rows=3,
    disabled=false} = opts;

  const id = this.idGen.get(prop);

  if ( type === 'textarea' ) {
    return html`
      <div class='field-container'>
        <label for=${id} ?hidden=${hideLabel}>${label}</label>
        <textarea
          id=${id}
          ?required=${required}
          placeholder=${placeholder}
          ?disabled=${disabled}
          rows=${rows}
          .value = ${this.data[prop] || ''}
          @input=${e => this._onInput(prop, e.target.value)}></textarea>
      ${_renderValidations.call(this, prop)}
      </div>
    `;
  }

  return html`
    <div class='field-container'>
      <label for=${id} ?hidden=${hideLabel}>${label}</label>
      <input
        id=${id}
        type=${type}
        ?required=${required}
        placeholder=${placeholder}
        ?disabled=${disabled}
        .value = ${this.data[prop] || ''}
        @input=${e => this._onInput(prop, e.target.value)} />
      ${_renderValidations.call(this, prop)}
    </div>
  `;
}

function _renderValidations(prop){
  const validations = this.failedValidations.filter(v => v.field === prop);
  if ( !validations.length ) return html``;
  return html`
  <div class='validation-messages'>
    ${validations.map(v => html`<div class='validation-message'>${v.message}</div>`)}
  </div>
  `;
}
