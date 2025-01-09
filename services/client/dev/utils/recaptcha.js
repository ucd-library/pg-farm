
import { getLogger } from '@ucd-lib/cork-app-utils';

/**
 * @description Recaptcha service
 * https://developers.google.com/recaptcha/intro
 * When your page loads (onAppStateUpdate), call init()
 * When you want to execute recaptcha, call execute()
 */
class Recaptcha {

  constructor() {
    this.logger = getLogger('Recaptcha');
    this.loaded = false;
  }

  init(){
    if ( this.loaded ) return;
    this.loaded = true;
    this.disabled = window.APP_CONFIG.recaptcha.disabled;
    this.siteKey = window.APP_CONFIG.recaptcha.siteKey;
    if ( !this.disabled && !this.siteKey ) {
      this.logger.warn('Recaptcha site key not set');
      return;
    }
    if ( this.disabled ) return;
    this.loadScript();
  }

  loadScript(){
    let script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    this.scriptPromise = new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    return this.scriptPromise;
  }

  async execute(action='pg_farm_contact_form_submit'){
    let token;
    if ( this.disabled || !this.siteKey ) return token;
    await this.scriptPromise;
    try {
      token = await window.grecaptcha.execute(this.siteKey, {action});
    } catch(e) {
      this.logger.error('Error executing recaptcha', e);
    }

    return token;
  }

}

export default new Recaptcha();
