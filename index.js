import { encodeObject, decodeObject, initiateWebSocketMux } from 'omnistreams';


class Peer {

  constructor(mux) {

    this._nextRequestId = 1;
    this._mux = mux;
    this._requests = {};

    this._methods = {};
    this._receiveMethods = {};
    this._sendMethods = {};
    this._duplexMethods = {};
    
    mux.onControlMessage((rawMessage) => {

      const message = decodeObject(rawMessage)

      if (message.result !== undefined) {
        this._handleMessageResponse(message);
      }
      else {
        this._handleMessageRequest(message);
      }
    });

    mux.onConduit((producer, rawMeta) => {

      const meta = decodeObject(rawMeta)

      if (meta.result !== undefined) {
        this._handleStreamResponse(meta, producer);
      }
      else {
        this._handleStreamRequest(meta, producer);
      }

      delete this._requests[meta.id];
    });
  }

  async _handleMessageRequest(request) {

    const method = request.method;
    const params = request.params;
    const id = request.id;

    if (this._methods[method] !== undefined) {
      const result = await this._methods[method](params);
      this._mux.sendControlMessage(encodeObject({
        jsonrpc: '2.0',
        id,
        result,
      }));
    }
    else if (this._receiveMethods[method] !== undefined) {

      const { result, producer } = await this._receiveMethods[method](params);
      const consumer = this._mux.createConduit(encodeObject({
        jsonrpc: '2.0',
        id,
        result,
      }));

      producer.pipe(consumer);
    }
    else {
      throw new Error("Method not found: " + method);
    }
  }

  _handleMessageResponse(response) {
    if (response.result !== undefined) {
      this._requests[response.id].resolve(response.result);
    }
    else {
      this._requests[response.id].reject();
    }
    delete this._requests[response.id];
  }

  async _handleStreamRequest(meta, producer) {
    if (this._sendMethods[meta.method] !== undefined) {
      const result = await this._sendMethods[meta.method](meta.params, producer);
      this._mux.sendControlMessage(encodeObject({
        jsonrpc: '2.0',
        id: meta.id,
        result,
      }));
    }
    else if (this._duplexMethods[meta.method] !== undefined) {
    }
    else {
      throw new Error("Method not found: " + meta.method);
    }
  }

  _handleStreamResponse(meta, producer) {
    if (meta.result !== undefined) {
      this._requests[meta.id].resolve({ result: meta.result, producer });
    }
    else {
      this._requests[meta.id].reject(meta.result);
    }
    delete this._requests[meta.id];
  }

  implement(method, callback) {
    this._methods[method] = callback;
  }

  implementReceive(method, callback) {
    this._receiveMethods[method] = callback;
  }

  implementSend(method, callback) {
    this._sendMethods[method] = callback;
  }

  implementDuplex(method, callback) {
    this._duplexMethods[method] = callback;
  }

  async request(method, params) {

    const requestId = this._nextRequestId++;

    this._mux.sendControlMessage(encodeObject({
      id: requestId,
      jsonrpc: '2.0',
      method,
      params,
    }));

    return new Promise((resolve, reject) => {
      this._requests[requestId] = { resolve, reject };
    });
  }

  async requestSendStream(method, params, producer) {

    const requestId = this._nextRequestId++;

    const consumer = this._mux.createConduit(encodeObject({
      id: requestId, 
      jsonrpc: '2.0',
      method,
      params,
    }));

    producer.pipe(consumer);

    return new Promise((resolve, reject) => {
      this._requests[requestId] = { resolve, reject };
    });
  }

  async requestReceiveStream(method, params) {

    const requestId = this._nextRequestId++;

    this._mux.sendControlMessage(encodeObject({
      id: requestId,
      jsonrpc: '2.0',
      method,
      params,
    }));

    return new Promise((resolve, reject) => {
      this._requests[requestId] = { resolve, reject };
    });
  }

  async requestDuplexStream(method, params, producer) {

    const requestId = this._nextRequestId++;

    const consumer = this._mux.createConduit(encodeObject({
      id: requestId,
      jsonrpc: '2.0',
      method,
      params,
    }));

    producer.pipe(consumer);

    return new Promise((resolve, reject) => {
      this._requests[requestId] = { resolve, reject };
    });
  }
}

export { Peer };
