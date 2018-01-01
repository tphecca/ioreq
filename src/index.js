const { EventEmitter } = require('events');
const mp = require('msgpack5')();
const nanoid = require('nanoid');

class RedisRequester {
  constructor(redis, options = {}) {
    if (!redis) throw new Error("You must provide an instance of ioredis.");
    this.redis = redis.duplicate();
    this.options = Object.assign({}, {
      prefix: "ioreq:"
    }, options);
    this.redises = [this.redis];
  }

  async request(endpoint, data = {}, timeout = 0) {
    if (!(data instanceof Object)) throw new Error("Data must be an Object.");
    data._uuid = nanoid();
    const nredis = this.redis.duplicate();
    await new Promise((res, rej) => {
      nredis.on('ready', res);
      nredis.on('error', rej);
    });
    const subChan = `${this.options.prefix}res|${data._uuid}`
    await nredis.subscribe(subChan);
    await this.redis.publish(`${this.options.prefix}req|${endpoint}`, mp.encode(data));
    return await new Promise((res, rej) => {
      if (timeout > 0)
        setTimeout(() => rej(new Error("Request timed out.")), timeout);
      nredis.on('messageBuffer', (chan, msg) => {
        if (chan.toString().trim() !== subChan.trim()) return;
        try {
          const ult = mp.decode(msg);
          res(ult);
          nredis.disconnect();
        } catch (e) {
          rej(e);
        }
      });
    });
  }

  async listen(endpoint) {
    const ee = new EventEmitter();
    const nredis = this.redis.duplicate();
    this.redises.push(nredis);
    await new Promise((res, rej) => {
      nredis.on('ready', res);
      nredis.on('error', rej);
    });
    const subChan = `${this.options.prefix}req|${endpoint}`
    await nredis.subscribe(subChan);
    nredis.on('messageBuffer', (chan, msg) => {
      if (chan.toString().trim() !== subChan.trim()) return;
      try {
        const req = mp.decode(msg);
        if (!req._uuid) throw new Error("Data did not pass a UUID.");
        const cb = async (data) => {
          return await this.redis.publish(`${this.options.prefix}res|${req._uuid}`, mp.encode(data));
        }
        ee.emit('request', req, cb);
      } catch (e) {
        ee.emit('error', e);
      }
    });
    return ee;
  }
}

module.exports = RedisRequester;
