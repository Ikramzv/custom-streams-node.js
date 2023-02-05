const { Transform, pipeline, Readable } = require("node:stream");
const FileReadStream = require("./readable");
const FileWriteStream = require("./writable");
const fs = require("node:fs");
const {
  createReadStream,
  createWriteStream,
  statSync,
  write,
} = require("node:fs");

class Encrypt extends Transform {
  constructor(options) {
    super({ highWaterMark: 20 });
    this.encrypted = 0;
    this.size = options && options.size; // pass readable file's size
  }

  get loaded() {
    if (!this.size) return;
    return ((this.encrypted * 100) / this.size).toFixed();
  }

  _transform(chunk, encoding, cb) {
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] < 255) chunk[i] += 1;
    }
    this.encrypted += chunk.length;
    cb(null, chunk);
  }

  _flush(cb) {
    cb(null);
  }
}

class Decrypt extends Transform {
  constructor(options) {
    super({ highWaterMark: 20 });
    this.decrypted = 0;
    this.size = options && options.size;
  }

  get loaded() {
    if (!this.size) return;
    return ((this.decrypted * 100) / this.size).toFixed(2);
  }

  _transform(chunk, encoding, cb) {
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] < 256) chunk[i] -= 1;
    }
    this.decrypted += chunk.length;
    cb(null, chunk);
  }

  _flush(cb) {
    cb(null);
  }
}

const encrypt = new Encrypt();
const decrypt = new Decrypt();

// const readable = new FileReadStream({
//   filename: "./read.txt",
//   objectMode: false,
//   highWaterMark: 400,
// });
// const writable = new FileWriteStream({
//   filename: "./new.txt",
//   flags: "w",
//   highWaterMark: 200,
// });

const readableStat = statSync("./read.txt");

encrypt.size = readableStat.size;
decrypt.size = readableStat.size;

const readable = createReadStream("read.txt", {
  highWaterMark: 20,
  flags: "r",
});

const writable = createWriteStream("new.txt", {
  flags: "w",
  highWaterMark: 40,
});

/**
 * Some experimental listeners
 * You can also play around with this to sharpen your knowledge about streams
 */

readable.on("data", (chunk) => {
  console.log("readable");
});

encrypt.on("data", (chunk) => {
  console.log("encrypt data", encrypt.writableLength);
});

decrypt.on("data", (chunk) => {
  console.log("decrypt data", decrypt.writableLength);
});

encrypt.on("drain", (chunk) => {
  console.log("encrypt drained");
});

decrypt.on("drain", (chunk) => {
  console.log("decrypt drained");
});

readable.on("end", () => {
  console.log("readable ended");
});

encrypt.on("end", (chunk) => {
  console.log("encrypt ended");
});

decrypt.on("end", (chunk) => {
  console.log("decrypt ended");
});

writable.on("drain", () => {
  console.log("drained", writable.bytesWritten);
});

pipeline(readable, encrypt, decrypt, writable, (err) => {
  if (err) throw new Error(err.message);
  console.log("Pipeline finished");
});
