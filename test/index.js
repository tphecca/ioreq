const { test } = require('ava');
const Redis = require('ioredis');
const IOReq = require('../src/index.js');

test('it works', async t => {
  const redis = new Redis();
  const ior = new IOReq(redis, {prefix: "_test:"});
  const data = {hello: "world!"};
  (await ior.listen('test')).on('request', async (data, reply) => {
    if (data.hello === "world!")
      await reply({it: "works!"});
    else
      await reply({it: "doesn't work!"});
  })
  console.time("one request");
  if ((await ior.request('test', data)).it === "works!") t.pass()
  console.timeEnd("one request");
});

test('timing out works', async t => {
  const redis = new Redis();
  const ior = new IOReq(redis, {prefix: "_test2:"});
  const data = {nope: "not happening!"};
  (await ior.listen('test')).on('request', async (data, reply) => {
    setTimeout(() => reply({nope: "whoops, it happened!"}), 5000);
  });
  console.time("timed out request")
  try {
    await ior.request('test', data, 4000)
  } catch (e) {
    console.timeEnd("timed out request");
    if (e.message === "Request timed out.") {
      t.pass();
      return;
    } else {
      console.log(e);
    }
  }
  console.timeEnd("timed out request")
  t.fail();
});
