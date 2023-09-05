'use strict';
const common = require('../common.js');
const readline = require('readline');
const { Readable } = require('stream');

const bench = common.createBenchmark(main, {
  n: [1e1, 1e2, 1e3, 1e4, 1e5, 1e6],
  type: ['old', 'new']
});

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Dui accumsan sit amet nulla facilisi morbi tempus iaculis urna.
Eget dolor morbi non arcu risus quis varius quam quisque.
Lacus viverra vitae congue eu consequat ac felis donec.
Amet porttitor eget dolor morbi non arcu.
Velit ut tortor pretium viverra suspendisse.
Mauris nunc congue nisi vitae suscipit tellus.
Amet nisl suscipit adipiscing bibendum est ultricies integer.
Sit amet dictum sit amet justo donec enim diam.
Condimentum mattis pellentesque id nibh tortor id aliquet lectus proin.
Diam in arcu cursus euismod quis viverra nibh.
Rest of line`;

function getLoremIpsumStream(repetitions) {
  const readable = Readable({
    objectMode: true,
  });
  let i = 0;
  readable._read = () => readable.push(
    i++ >= repetitions ? null : loremIpsum,
  );
  return readable;
}

function oldWay() {
  const readable = new Readable({
    objectMode: true,
    read: () => {
      this.resume();
    },
    destroy: (err, cb) => {
      this.off('line', lineListener);
      this.off('close', closeListener);
      this.close();
      cb(err);
    },
  });
  const lineListener = (input) => {
    if (!readable.push(input)) {
      // TODO(rexagod): drain to resume flow
      this.pause();
    }
  };
  const closeListener = () => {
    readable.push(null);
  };
  const errorListener = (err) => {
    readable.destroy(err);
  };
  this.on('error', errorListener);
  this.on('line', lineListener);
  this.on('close', closeListener);
  return readable[Symbol.asyncIterator]();
}

async function readlineOldWay(n) {
  bench.start();
  const rlOldWay = readline.createInterface({
    input: getLoremIpsumStream(n),
  });
  let totalCharsOldWay = 0
  for await (const line of oldWay.call(rlOldWay)) {
    totalCharsOldWay += line.length;
  }
  bench.end(totalCharsOldWay);
}

async function readlineNewWay(n) {
  bench.start();
  let lineCount = 0;

  const iterable = readline.createInterface({
    input: getLoremIpsumStream(n),
  });

  // eslint-disable-next-line no-unused-vars
  for await (const _ of iterable) {
    lineCount++;
  }
  bench.end(lineCount);
}

async function main({ n, type }) {
  switch (type) {
    case 'old':
      readlineOldWay(n);
      break;
    case 'new':
      readlineNewWay(n);
      break;
    default:
      throw new Error(`Unknown type ${type}`);
  }

}
