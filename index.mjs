import {
  Multiplexer,
  initiateWebSocketMux,
} from './node_modules/omnistreams-concurrent/src/index.mjs';


class Peer {
  constructor(mux) {
    this._mux = mux;

    mux.onControlMessage((rawMessage) => {
      //const message = decodeObject(rawMessage)
      //this.onMessage(message)
      console.log(rawMessage);
    });
  }
}

async function initiateWebSocketPeer(options) {

  if (options && !options.path) {
    options.path = 'omni-rpc';
  }
  const mux = await initiateWebSocketMux(options);
  return new Peer(mux);
}

export { initiateWebSocketPeer };
