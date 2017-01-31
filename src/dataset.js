import Papa from 'papaparse';
import assign from 'object-assign';

/**
 * Base Dataset class
 */
export class Dataset {

	/**
	 *
	 */
	constructor(idAttribute = '_id') {
		this.datapoints = {};
		this.embeddings = [];
		this.idAttribute = idAttribute
	}

	/**
	 * A callback that is triggered after the dataset is loaded; typically used to create
	 * an embedding based on the dataset.
	 * @callback CSVDatasetCallback
	 * @param {Dataset} dataset - The Dataset loaded from the csv file
	 */

	/**
	 * Create a {Dataset} from a csv file that can be found at the given url
	 * @param {String} url - The url where the csv file can be found
	 * @param {CSVDatasetCallback} callback
	 */
	static createFromCSV(url, callback, idAttribute='_id') {
		Papa.parse(url, {
			download: true,
			header: true,
			dynamicTyping: true,
			complete: function(results) {
				var ds = new Dataset(idAttribute);
				for (let i in results.data) {
					let dp = results.data[i];
					if (!dp[idAttribute]) {
						dp[idAttribute] = i;
					}
					ds.add(dp);
				}
				callback(ds);
			}
		});
	}

	/**
	 * Add a datapoint to the Dataset
	 * @param {Datapoint} datapoint
	 */
	add(datapoint) {
		var d;
		if (! (datapoint instanceof Datapoint)) {
			d = new Datapoint(datapoint, this.idAttribute);
		} else {
			d = datapoint;
		}
		this.datapoints[d.id] = d;
		this.sendNotifications('add', d.id);
	}

	/**
	 * Remove a datapoint from the Dataset
	 * @param id - The id of the datapoint to remove
	 */
	remove(id) {
		delete this.datapoints[id];
		this.sendNotifications('remove', id)
	}

	/**
	 * Modify the value of a datapoint attribute
	 * @param id - The id of the datapoint to modify
	 * @param k - The key whose value to modify
	 @ @param v - The new value
	 */
	update(id, k, v) {
		let dp = this.datapoints[id];
		if (dp) {
			let old = dp.get(k);
			dp.set(k, v);
			this.sendNotifications('update', id, k, v, old)
		}
	}

	get(id) { return this.datapoints[id]; }

	getIds() { return Object.keys(this.datapoints); }

	register(embedding) {
		this.embeddings.push(embedding);
	}

	/**
	 * Returns the datapoints in the dataset, in id order. This is live data, and should not be modified
	 * @param filter - An optional filter function
	 */
	getDatapoints(filter) {
		let dps = this.getIds().map((id) => this.get(id));
		if (filter)
			return dps.filter(filter);
		else
			return dps;
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

/**
 * A Dataset whose datapoints are received from a websocket.
 */
export class WebSocketDataset extends Dataset {
	constructor(url, options = {}) {
		options = assign({onmessage: (x) => x, init: (s) => {}}, options)
		super();
		this.options = options;
		this.socket = new WebSocket(url);
		this.socket.onopen = () => this.options.init(this.socket);
		this.socket.onmessage = function(m) {
			var d = this.options.onmessage(JSON.parse(m.data));
			this.add(d);
		}.bind(this);
	}
}

export class Datapoint {
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
