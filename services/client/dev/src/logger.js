import config from './config.js';
const loggers = {};

class Logger {

  constructor(name) {
    this.name = name;

    if( !config.logLevel ) {
      config.logLevel = {};
    }

    if( typeof config.logLevel === 'string' ) {
      this.defaultLevel = config.logLevel;
    } else {
      this.defaultLevel = config.logLevel[name] || 'info';
    }
  }

  get levelInt() {
    switch(this.level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
    }
  }

  get level() {
    if( window.logLevels && window.logLevels[this.name] ) {
      return window.logLevels[this.name];
    }
    return this.defaultLevel;
  }

  debug(...args) {
    if( this.levelInt > 0 ) return;
    console.log(`[${this.name}] debug:`, ...args);
  }

  info(...args) {
    if( this.levelInt > 1 ) return;
    console.log(`[${this.name}] info:`, ...args);
  }

  warn(...args) {
    if( this.levelInt > 2 ) return;
    console.warn(`[${this.name}] warn:`, ...args);
  }

  error(...args) {
    if( this.levelInt > 3 ) return;
    console.error(`[${this.name}] error:`, ...args);
  }

}

function getLogger(name) {
  if( loggers[name] ) return loggers[name];
  loggers[name] = new Logger(name);
  return loggers[name];
}

export default getLogger