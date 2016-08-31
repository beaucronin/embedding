'use strict'

class Dataset {
	constructor() {
		this.datapoints = {};
		this.added = [];
		this.removed = [];
	}

	/**
	 * Add a datapoint to the Dataset
	 */
	addDatapoint(datapoint) {
		var d;
		if (! (datapoint instanceof Datapoint)) {
			d = new Datapoint(datapoint);
		} else {
			d = datapoint;
		}
		this.datapoints[d.id] = d;
		this.added.push(d)
	}

	/**
	 * Remove a datapoint from the Dataset
	 */
	removeDatapoint(id) {
		this.removed = this.datapoints[id];
		delete this.datapoints[id];
	}

	getDatapoint(id) {
		return this.datapoints[id];
	}

	processed() {
		this.added = [];
		this.removed = [];
	}
}

class Datapoint {
	constructor(values, idAttribute='_id') {
		this.values = values;
		this.idAttribute = idAttribute;
		this.dirty = true;
	}

	get id() {
		return this.values[this.idAttribute];
	}

	setAttribute(att, val) {
		this.values[att] = val;
		dirty = true;
	}
}
