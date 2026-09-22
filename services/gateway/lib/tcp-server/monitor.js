import metrics from "../../../lib/metrics/index.js";
import logger from '../../../lib/logger.js';

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
    if( !metrics.enabled ) {
      return;
    }

    this.connectionsGauge = new metrics.Gauge({
      name: 'pgfarm_tcp_proxy_connections',
      help: 'Number of TCP connections, both incoming and outgoing are reported',
      labelNames: ['name', 'type'],
      registers: [metrics.registry],
      collect: async () => {
        let count = await this.getConnections();
        this.connectionsGauge.set({name: this.name, type: 'incoming'}, count);

        count = 0;
        this.socketsProperties.forEach(props => {
          if( props.type === 'outgoing' ) count++;
        });
        this.connectionsGauge.set({name: this.name, type: 'outgoing'}, count);
      }
    });
  }

  setSocketProperties(socket, props) {
    let currentProps = this.socketsProperties.get(socket) || {};
    currentProps = Object.assign(currentProps, props);
    this.socketsProperties.set(socket, currentProps);
  }

  registerSocket(socket, type='', proxyConnection) {
    if( !this.SOCKET_TYPES.includes(type) ) {
      throw new Error('Invalid socket type: '+type);
    }

    this.socketsProperties.set(socket, {type, proxyConnection});
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
      } else if( event.toLowerCase() === 'drain' ) {
        lt = 'debug';
      }

      let eventProps = {
        socketType: props.type,
        socketEventType : event,
        socketSessionId : props.proxyConnection.sessionId,
        remoteAddress : props.proxyConnection.ipAddress
      };

      if( !data ) {
        logger[lt](this.name+' socket event', props.type, event, eventProps);
      } else {
        logger[lt](this.name+' socket event', props.type, event, eventProps, {jsonPayload: data});
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

      let eventProps = {
        socketType : 'server',
        socketEventType : event
      };

      if( !data ) {
        logger[lt](this.name+' server event', eventProps);
      } else {
        logger[lt](this.name+' server event', eventProps, data);
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
