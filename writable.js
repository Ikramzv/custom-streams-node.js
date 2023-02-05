const { Writable } = require("node:stream");
const fs = require("node:fs");

class FileWriteStream extends Writable {
  constructor({ highWaterMark, filename, flags }) {
    super({ highWaterMark });

    this.filename = filename;
    this.flags = flags;
    this.fd;
    this.chunks = [];
    this.chunkSize = 0;
    this.writesCount = 0;
    this.streamClosed = false;
    this.bytesWritten = 0;
  }

  _write(chunk, enc, cb) {
    ++this.writesCount;
    this.chunks.push(chunk);
    this.chunkSize += chunk.length;
    try {
      if (this.chunkSize >= this.writableHighWaterMark) {
        fs.write(this.fd, Buffer.concat(this.chunks), (err) => {
          if (err) {
            cb(err);
            return;
          }
          this.chunks = [];
          this.bytesWritten += this.chunkSize;
          this.chunkSize = 0;
          cb();
        });
      } else {
        cb();
      }
    } catch (error) {
      cb(error);
    }
  }

  // _writev(chunks, cb) {
  //   console.log(Buffer.concat(chunks), " write_v ");
  //   fs.write(this.fd, Buffer.from(chunks), (err, written, buffer) => {
  //     if (err) cb(err);
  //     console.log(written);
  //     console.log(buffer);
  //     cb();
  //   });
  // }

  _construct(cb) {
    fs.open(this.filename, this.flags, (err, fd) => {
      if (err) {
        cb(err);
        return;
      }
      this.fd = fd;
      this.emit("open");
      cb();
    });
  }

  _final(cb) {
    fs.write(this.fd, Buffer.concat(this.chunks), (err, written, buffer) => {
      if (err) cb(err);
      this.bytesWritten += written;
      fs.close(this.fd, (err) => {
        if (err) throw cb(err);
        cb();
        this.streamClosed = true;
      });
    });
  }

  _destroy(error, cb) {
    console.log("Writes Count : ", this.writesCount);
    if (this.streamClosed) {
      cb(error);
    } else {
      fs.close(this.fd, (err) => {
        if (err) return cb(error || err);
        cb(error);
      });
    }
  }
}

module.exports = FileWriteStream;
