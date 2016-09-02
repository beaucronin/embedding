'use strict'

var Papa = require('papaparse');

class Dataset {
	constructor() {
		this.datapoints = {};
		this.embeddings = [];
	}

	static createFromCSV(url, callback) {
		Papa.parse(url, {
			download: true,
			header: true,
			dynamicTyping: true,
			complete: function(results) {
				var ds = new Dataset();
				for (let i in results.data) {
					let dp = results.data[i];
					dp._id = i;
					ds.add(dp);
				}
				callback(ds);
			}
		});
	}

	/**
	 * Add a datapoint to the Dataset
	 */
	add(datapoint) {
		var d;
		if (! (datapoint instanceof Datapoint)) {
			d = new Datapoint(datapoint);
		} else {
			d = datapoint;
		}
		this.datapoints[d.id] = d;
		this.sendNotifications('add', d.id);
	}

	/**
	 * Remove a datapoint from the Dataset
	 */
	remove(id) {
		delete this.datapoints[id];
		this.sendNotifications('remove', id)
	}

	/**
	 * Modify the value of a datapoint attribute
	 */
	update(id, k, v) {
		let dp = this.datapoints[id];
		if (dp) {
			let old = dp.get(k);
			dp.set(k, v);
			this.sendNotifications('update', id, k, v, old)
		}
	}

	get(id) {
		return this.datapoints[id];
	}

	register(embedding) {
		this.embeddings.push(embedding);
	}

	sendNotifications(type, id, ...x) {
		let msg = { type: type, id: id };
		if (type == 'update') {
			msg.attr = x[0];
			msg.newVal = x[1];
			msg.oldVal = x[2];
		}
		this.embeddings.forEach((e) => e.notify( msg ));
	}
}

class Datapoint {
	constructor(values, idAttribute='_id') {
		this.values = values;
		this.idAttribute = idAttribute;
	}

	get id() {
		return this.values[this.idAttribute];
	}

	get(k) { return this.values[k]; }

	set(k, v) {
		this.values[k] = v;
	}
}
