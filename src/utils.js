'use strict';

import assign from 'object-assign';

// from https://github.com/mock-end/random-normal
export function normalPool(options) {

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

export function normal(options) {

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

export function degToRad(deg) {
	return deg * Math.PI / 180;
}

export function latLongToEuclidean(lat, long, R=1, reverse=true) {
	let radLat = degToRad(lat);
	let radLong = reverse ? degToRad(-long) : degToRad(long);
	let x = R * Math.cos(radLat) * Math.cos(radLong);
	let z = R * Math.cos(radLat) * Math.sin(radLong);
	let y = R * Math.sin(radLat)
	return {x, y, z}
}

export function ajaxWithCallback(url, cb) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.send(null);
	xhr.onreadystatechange = function() {
	if (xhr.readyState === 4 && xhr.status === 200) {
		cb(JSON.parse(xhr.responseText));
	}
	}
}

export function maybeEval(v, x) {
	if (typeof(v) == 'function')
		return v(x);
	else
		return v;
}

/**
 * Return a function that defines a mapping from values for an attribute to target values.
 * Can be used, for example, to map from attribute values to colors.
 */
export function categoricalMap(attribute, map) {
	return function(dp) {
		let v = dp.get(attribute);
		if (map[v])
			return map[v];
		else if (map._default)
			return map._default;
		else 
			return undefined;
	}
}

