var storage = {
  cache: {},

  get: function(key) {
    return storage.cache[key];
  },

  set: function(key, val) {
    storage.cache[key] = val;
  }
};
