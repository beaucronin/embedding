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
		this.datapoints[datapoint.id] = datapoint;
		this.added.push(datapoint)
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
}

class Datapoint {
	constructor(values, idAttribute='_id') {
		this.values = values;
		this.idAttribute = idAttribute;
		this.id = values[this.idAttribute];
		this.dirty = true;
	}

	get id() {
		return this.values[idAttribute];
	}

	setAttribute(att, val) {
		this.values[att] = val;
		dirty = true;
	}
}