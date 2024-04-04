import metrics from "../../../lib/metrics/index.js";
import {ValueType} from '@opentelemetry/api';
import logger from '../../../lib/logger.js';
import config from '../../../lib/config.js';

const SERVER_EVENTS = [
  'close',
  'connection',
  'error',
  'listening',
  'drop'
];

const SOCKET_EVENTS = [
  'close',
  'connect',
  'connectionAttempt',
  'connectionAttemptFailed',
  'connectionAttemptTimeout',
  'data',
  'drain',
  'end',
  'error',
  'lookup',
  'ready',
  'timeout'
];

const metricRoot = 'pgfarm.tcp-proxy.';

class ProxyMonitor {

  constructor(name, opts) {
    this.name = name;
    this.opts = opts;

    this.SOCKET_TYPES = ['incoming', 'outgoing', 'incoming-secure'];

    this.data = {
      socketEvents : {},
      serverEvents : {}
    };

    this.socketsProperties = new Map();
  }

  init() {
    if( !config.metrics.enabled ) {
      return;
    }

    const meter = metrics.meterProvider.getMeter('default');
    
    const tcpSocketConnections = meter.createObservableGauge(metricRoot+'connections',  {
      description: 'Number of TCP connections, both incoming and outgoing are reported',
      unit: '',
      valueType: ValueType.INT,
    });
    tcpSocketConnections.addCallback(async result => {
      let count = await this.getConnections();
      result.observe(count, {
        name : this.name,
        type: 'incoming'
      });

      count = 0;
      this.socketsProperties.forEach(props => {
        if( props.type === 'outgoing' ) count++;
      });
      result.observe(count, {
        name : this.name,
        type: 'outgoing'
      });
    });


    const serverEvents = meter.createObservableGauge(metricRoot+'server-events',  {
      description: 'TCP server events',
      unit: '',
      valueType: ValueType.INT,
    });
    serverEvents.addCallback(async result => {
      for( let event in this.data.serverEvents ) {
        result.observe(this.data.serverEvents[event], {
          name : this.name,
          type: event
        });
        this.data.serverEvents[event] = 0;
      }
    });

    const clientEvents = meter.createObservableGauge(metricRoot+'socket-events',  {
      description: 'TCP proxy socket events',
      unit: '',
      valueType: ValueType.INT,
    });
    clientEvents.addCallback(async result => {
      for( let key in this.data.socketEvents ) {
        let [type, event] = key.split('-');
        result.observe(this.data.socketEvents[key], {
          name : this.name,
          event, type
        });
        this.data.socketEvents[key] = 0;
      }
    });
  }

  setSocketProperties(socket, props) {
    let currentProps = this.socketsProperties.get(socket) || {};
    currentProps = Object.assign(currentProps, props);
    this.socketsProperties.set(socket, currentProps);
  }

  registerSocket(socket, type='', session='') {
    if( !this.SOCKET_TYPES.includes(type) ) {
      throw new Error('Invalid socket type: '+type);
    }

    this.socketsProperties.set(socket, {type, session});
    SOCKET_EVENTS.forEach(event => {
      socket.on(event, data => this.socketEventHandler(socket, event, data));
    });
  }

  registerServer(server) {
    this.server = server;
    SERVER_EVENTS.forEach(event => {
      server.on(event, data => this.serverEventHandler(event, data));
    });
  }

  socketEventHandler(socket, event, data) {
    let props = this.socketsProperties.get(socket);
    let key = props.type+'-'+event;

    if( !this.data.socketEvents[key] ) {
      this.data.socketEvents[key] = 0;
    }
    this.data.socketEvents[key]++;

    if( event === 'close' ) {
      this.socketsProperties.delete(socket);
    }

    if( this.opts.logging ) {
      if( event === 'data' ) {
        if( this.opts.logDataEvents ) data = null;
        else return;
      }

      let lt = 'info';
      if( event.toLowerCase().match(/(error|timeout|failed)/) ) {
        lt = 'error';
      }

      if( !data ) {
        logger[lt](this.name+' socket event', event, props);
      } else {
        logger[lt](this.name+' socket event', event, props, data);
      }
    }
  }

  serverEventHandler(event, data) {
    if( !this.data.serverEvents[event] ) {
      this.data.serverEvents[event] = 0;
    }
    this.data.serverEvents[event]++;

    if( this.opts.logging ) {
      // connection event sends proxy object
      // don't log it
      if( event === 'connection' ) {
        data = null;
      }

      let lt = 'info';
      if( event.toLowerCase().match(/(error|drop)/) ) {
        lt = 'error';
      }

      if( !data ) {
        logger[lt](this.name+' server event', event);
      } else {
        logger[lt](this.name+' server event', event, data);
      }
    }
  }

  getConnections() {
    return new Promise((resolve, reject) => {
      if( !this.server ) {
        return resolve(0);
      }

      this.server.getConnections((err, count) => {
        if( err ) {
          return reject(err);
        }
        resolve(count);
      });
    });
  }

}

export default ProxyMonitor;