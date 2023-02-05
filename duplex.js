const { Duplex } = require("node:stream");
const fs = require("node:fs");

class FileDuplexStream extends Duplex {
  constructor({
    writableHighWaterMark,
    readableHighWaterMark,
    readableFilename,
    writableFilename,
  }) {
    super({ writableHighWaterMark, readableHighWaterMark });
    this.readableFilename = readableFilename;
    this.writableFilename = writableFilename;
    this.readableFd, this.writableFd;
    this.chunks = [];
    this.bytesRead = 0;
    this.bytesWritten = 0;
  }

  _write(chunk, enc, cb) {
    this.chunks.push(chunk);
    if (chunk.length >= this.writableHighWaterMark) {
      fs.write(
        this.writableFd,
        Buffer.concat(this.chunks),
        (err, written, buffer) => {
          if (err) return cb(err);
          this.chunks = [];
          this.bytesWritten += written; // when drain event is emitted
          cb();
        }
      );
    } else {
      cb();
    }
  }

  _read(size) {
    size = size || this.readableHighWaterMark;
    fs.read(this.readableFd, Buffer.alloc(size), (err, bytesRead, buffer) => {
      if (err) return this.destroy(err);
      if (bytesRead === 0) {
        fs.close(this.readableFd, (err) => {
          if (err) return this.destroy(err);
          this.pause();
        });
        return;
      }
      this.bytesRead += bytesRead;
      this.push(buffer.subarray(0, bytesRead));
    });
  }

  _final(cb) {
    fs.write(
      this.writableFd,
      Buffer.concat(this.chunks),
      (err, written, buffer) => {
        if (err) return cb(err);
        this.bytesWritten += written;
        cb();
      }
    );
  }

  _construct(cb) {
    fs.open(this.readableFilename, "r", (err, readableFd) => {
      if (err) return cb(err);
      this.readableFd = readableFd;
      fs.open(this.writableFilename, "w", (err, writableFd) => {
        if (err) return cb(err);
        this.writableFd = writableFd;
        cb();
      });
    });
  }

  _destroy(error, cb) {
    if (!this.writableFd) return cb(error);
    fs.close(this.writableFd, (err) => cb(err || error));
  }
}

const duplex = new FileDuplexStream({
  readableFilename: "./read.txt",
  writableFilename: "./new.txt",
  readableHighWaterMark: 200,
  writableHighWaterMark: 200,
});

duplex.on("data", (chunk) => {
  console.log(chunk.toString());
  if (!duplex.write(chunk)) duplex.pause();
  // console.log(duplex.bytesWritten);
});

duplex.on("drain", () => {
  duplex.resume();
});
