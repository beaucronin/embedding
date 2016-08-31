'use strict';

var assign = require('object-assign');

// from https://github.com/mock-end/random-normal
function normalPool(options) {

  var performanceCounter = 0;

  do {

    var idx = Math.round(normal({
      mean: options.mean,
      dev: options.dev
    }));

    if (idx < options.pool.length && idx >= 0) {
      return options.pool[idx];
    } else {
      performanceCounter++;
    }

  } while (performanceCounter < 100);
}

function normal(options) {

  options = assign({ mean: 0, dev: 1, pool: [] }, options);

  // If a pool has been passed, then we are returning an item from that pool,
  // using the normal distribution settings that were passed in
  if (Array.isArray(options.pool) && options.pool.length > 0) {
    return normalPool(options);
  }

  // The Marsaglia Polar method
  var s;
  var u;
  var v;
  var norm;
  var mean = options.mean;
  var dev  = options.dev;

  do {
    // U and V are from the uniform distribution on (-1, 1)
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;

    s = u * u + v * v;
  } while (s >= 1);

  // Compute the standard normal variate
  norm = u * Math.sqrt(-2 * Math.log(s) / s);

  // Shape and scale
  return dev * norm + mean;
}

