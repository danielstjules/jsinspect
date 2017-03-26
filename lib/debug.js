module.exports = function debug(str) {
  if (process.env.DEBUG) {
    console.error(str);
  }
};
