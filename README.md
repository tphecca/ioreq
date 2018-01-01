# IOReq

IOReq is a simple microservices module for Node.js which passes requests and data via Redis.
This requires your project to use `ioredis`.

## Usage

```js
const Redis = require('ioredis');
const IOReq = require('ioreq');

async function hello() {
  let redis = new Redis({host: "127.0.0.1"});
  let ioreq = new IOReq(redis, {prefix: "test:"});
  // Second argument is optional. As of now, the only option is prefix.
  // In this case, all PUBLISH channels are prefixed with "hello:".

  // Listen for a few requests:
  const listener = await ioreq.listen('my_endpoint');
  listener.on('request', (request, reply) => {
    if (request.please === 'say_hello') {
      reply({hello: 'world'});
    } else if (request.please === 'give_time') {
      let date = new Date();
      reply({
        hour: date.getHours(),
        minute: date.getMinutes(),
        year: date.getFullYear()
      });
    } else if (request.please === 'take_too_long') {
      setTimeout(() => reply({hello: "world, it's been a while"}), 5000)
    } else {
      reply({error: "No command provided!"});
    }
  });

  // Simple request:
  let result = await ioreq.request('my_endpoint', {please: 'say_hello'});
  console.log(`Hello, ${result.hello}!`) // Hello, world!

  // Request with lots of data:
  let res = await ioreq.request('my_endpoint', {please: 'give_time'});
  console.log(`Happy ${res.year}! The time is ${res.hour}:${res.minute}`);

  // A request which times out (optional third argument for milliseconds):
  try {
    let result = await ioreq.request('my_endpoint', {please: 'take_too_long'}, 3000);
  } catch (e) {
    console.log(e.message) // Request timed out.
  }
}

hello();
```
