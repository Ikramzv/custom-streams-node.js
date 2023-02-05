const fs = require("node:fs");
const { Readable } = require("node:stream");

class FileReadableStream extends Readable {
  constructor({ highWaterMark, filename, objectMode }) {
    super({ highWaterMark, objectMode });
    this.filename = filename;
    this.fd;
  }

  _construct(cb) {
    fs.open(this.filename, "r", (err, fd) => {
      if (err) return cb(err);
      this.fd = fd;
      cb();
    });
  }

  _read(size) {
    size = size || this.readableHighWaterMark;
    const buff = Buffer.alloc(size);
    fs.read(this.fd, buff, (err, bytesRead, buffer) => {
      if (err) throw new Error(err.message);
      if (bytesRead === 0) {
        fs.close(this.fd, (err) => {
          if (err) return this.destroy(err);
          this.emit("close");
          this.fd = null;
        });
        return this.pause();
      }
      this.push(buffer.subarray(0, bytesRead));
    });
  }

  _destroy(error, callback) {
    if (!this.fd) return callback(error);
    fs.close(this.fd, (err) => {
      if (err) return callback(error || err);
      callback(error);
      this.fd = null;
    });
  }
}

const stream = new FileReadableStream({
  highWaterMark: 1,
  filename: "./read.txt",
  objectMode: true,
});

stream.on("data", (chunk) => {
  console.log(chunk.toString("utf8"));
});

stream.on("close", () => {
  console.log("closed");
});
