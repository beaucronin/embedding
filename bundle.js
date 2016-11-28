(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EMBED = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

	get(id) { return this.datapoints[id]; }

	getIds() { return Object.keys(this.datapoints); }

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

class WebSocketDataset extends Dataset {
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

class Embedding {
	constructor(scene, dataset, options = {}) {
		this.dataset = dataset;
		dataset.register(this);
		this.obj3D = new THREE.Object3D();
		scene.add(this.obj3D);
		this.initialized = false;
		this.events = [];

		// set default position and rotation
		options = assign({ x: 0, y: 0, z: 0 }, options);
		options = assign({ rx:0, ry:0, rz:0 }, options);
		options = assign({ sx:1, sy:1, sz:1 }, options);
		options = assign({ mapping: {} }, options);
		this.options = options;
		this.obj3D.position.set(options.x, options.y, options.z);
		this.obj3D.rotation.set(options.rx, options.ry, options.rz);
		this.obj3D.scale.set(options.sx, options.sy, options.sz);
		// TODO canonicalize, sanitize mapping
		this.mapping = this.options.mapping;
	}

	_map(dp, src) {
		let tgt = this.mapping[src];
		return tgt ? dp.get(tgt) : dp.get(src);
	}

	_mapAttr(src) {
		let tgt = this.mapping[src];
		return tgt ? tgt : src;
	}

	embed() {
		// not implemented here
	}

	notify(event) {
		this.events.push(event);
	}

	getOpt(x, dp = null) {
		let a = this.options[x];
		if (typeof(a) == 'function') return a(dp);
		else return a;
	}
}

/**
 * Base class for embeddings that render Datapoints as individual meshes
 */
class MeshEmbedding extends Embedding {
	constructor(scene, dataset, options={}) {
		super(scene, dataset, options);
	}
}

class RandomEmbedding extends MeshEmbedding {
	constructor(scene, dataset, options={}) {
		options = assign({spread: 1.0}, options)
		super(scene, dataset, options);
	}

	get spread() { return this.getOpt("spread"); }

	embed() {
		if (! this.initialized) {
			// need to process all the datapoints in the Dataset
			for (let id in this.dataset.datapoints) {
				let dp  = this.dataset.datapoints[id];
				this._createMeshForDatapoint(dp);
			}
			this.initialized = true;
		} else {
			// just process the added datapoints
		}
	}

	_createMeshForDatapoint(dp) {
		var pos = new THREE.Vector3(normal()*this.spread, normal()*this.spread, normal()*this.spread);
		var geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		var mat = new THREE.MeshBasicMaterial(
			{ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
		var mesh = new THREE.Mesh(geo, mat);
		mesh.position.copy(pos);
		this.obj3D.add(mesh);
	}
}

/**
 * Base class for embedding backed by a Points object (i.e., particle clouds)
 */
class PointsEmbedding extends Embedding {
	constructor(scene, dataset, options={}) {
		options = assign(
			{ 
				pointType: "ball",
				pointSize: 0.2,
				pointColor: 0xffffff
			}, options);
		super(scene, dataset, options);

		// TODO base64 encode and read from string
		let sprite = new THREE.TextureLoader().load(
			"https://rawgit.com/beaucronin/embedding/master/static/sprites/ball.png");
		let materialProps = {
			size: this.getOpt("pointSize"),
			sizeAttenuation: true,
			map: sprite,
			color: this.getOpt("pointColor"),
			alphaTest: 0.5,
			transparent: true
		}
		this.points = new THREE.Points(
			new THREE.Geometry(), new THREE.PointsMaterial(materialProps));
		this.points.geometry.vertices.push(new THREE.Vector3(0,0,0));
		this.obj3D.add(this.points);
	}
}

class ScatterEmbedding extends PointsEmbedding {
	constructor(scene, dataset, options={}) {
		options = assign( 
			{ 
				bufferSize: 1000,
				moveSpeed: 2,
				autoScale: false,
				autoScaleRange: 10
			}, options);
		super(scene, dataset, options)
		
		// mapping from datapoint ids to vertex indices
		this.dpMap = {}

		// unallocated vertices 
		this.freeVertices = [];
		
		// initialize vertices and mark them as unallocated
		for (let i = 0; i < this.getOpt("bufferSize"); i++) {
			this.points.geometry.vertices.push(
				new THREE.Vector3(-1000000, -1000000, -1000000));
			this.freeVertices.push(i);
		}

		// create rescaling
		if (this.getOpt("autoScale")) {
			this._initAutoScale(this.getOpt("autoScaleRange"));
			console.log(this.rescale);
		} else if (this.getOpt("rescale")) {
			// TODO
		} else {
			this.rescale = new Rescaling();
		}

		this.tweens = {};
	}

	_initAutoScale(range) {
		let dps = this.dataset.getIds().map((id) => this.dataset.get(id))
		let xmin = Math.min.apply(Math, dps.map((dp) => dp.get(this._mapAttr('x'))))
		let xmax = Math.max.apply(Math, dps.map((dp) => dp.get(this._mapAttr('x'))))
		let ymin = Math.min.apply(Math, dps.map((dp) => dp.get(this._mapAttr('y'))))
		let ymax = Math.max.apply(Math, dps.map((dp) => dp.get(this._mapAttr('y'))))
		let zmin = Math.min.apply(Math, dps.map((dp) => dp.get(this._mapAttr('z'))))
		let zmax = Math.max.apply(Math, dps.map((dp) => dp.get(this._mapAttr('z'))))
		this.rescale = new Rescaling(
			- (xmax + xmin) / 2,
			- (ymax + ymin) / 2,
			- (zmax + zmin) / 2,
			range / (xmax - xmin),
			range / (ymax - ymin),
			range / (zmax - zmin)
			)
	}

	embed() {
		if (! this.initialized) {
			// add all datapoints already in the dataset
			for (let id in this.dataset.datapoints) {
				this._placeDatapoint(id);
			}
			this.points.geometry.verticesNeedUpdate = true;
			this.initialized = true;
		} else {
			// process events sent by the dataset since last embed() call
			if (this.events.length > 0) {
				for (let i in this.events) {
					let e = this.events[i];
					if      (e.type == "add")    this._placeDatapoint(e.id);
					else if (e.type == "remove") this._removeDatapoint(e.id);
					else if (e.type == "update") this._updateDatapoint(e.id, e);
				}
				console.log("calling vertices update");
				this.points.geometry.verticesNeedUpdate = true;			
			} 
			this.events = [];
		}
		// TODO move to global embedding update location
		TWEEN.update();
	}

	_placeDatapoint(id) {
		let vi = this.freeVertices.pop();
		if (vi != undefined) {
			let dp  = this.dataset.datapoints[id];
			if (! dp) return;
			this.points.geometry.vertices[vi].set(
				this.rescale.scaleX(this._map(dp, 'x')),
				this.rescale.scaleY(this._map(dp, 'y')),
				this.rescale.scaleZ(this._map(dp, 'z')));
			this.dpMap[id] = vi;
		} else {
			console.warn('Vertex buffer size exceeded');
		}
	}

	_removeDatapoint(id) {
		let vi = this.dpMap[id];
		if (vi != undefined) {
			this.points.geometry.vertices[vi].set(-1000000, -1000000, -1000000);
			delete this.dpMap[id];
			this.freeVertices.push(vi);
		}
	}

	_updateDatapoint(id, event) {
		let vi = this.dpMap[id];
		if (vi != undefined) {
			let dp  = this.dataset.datapoints[id];
			if (! dp) return;
			// TODO other attributes beside position
			let v = this.points.geometry.vertices[vi];
			
			let start = { x: v.x, y: v.y, z: v.z };
			let end = { 
				x: this.rescale.scaleX(this._map(dp, 'x')), 
				y: this.rescale.scaleY(this._map(dp, 'y')), 
				z: this.rescale.scaleZ(this._map(dp, 'z')) 
			};
			let d = (new THREE.Vector3(start.x, start.y, start.z))
				.sub(new THREE.Vector3(end.x, end.y, end.z))
				.length();
			let t = 1000 * d / this.getOpt("moveSpeed", dp);
			
			var geo = this.points.geometry;
			var obj = this;
			if (this.tweens[vi]) {
				this.tweens[vi].stop();
				delete this.tweens[vi];
			}

			let tween = new TWEEN.Tween(start)
				.to(end, t)
				.onUpdate(function() {
					v.set(this.x, this.y, this.z);
					geo.verticesNeedUpdate = true;
				})
				.onComplete(() => delete obj.tweens[id])
				.onStop(() => delete obj.tweens[id])
				.easing(TWEEN.Easing.Exponential.InOut)
				.start();
			this.tweens[vi] = tween;
		}
	}
}

class PathEmbedding extends Embedding {
	constructor(scene, dataset, waypoints, options) {
		options = assign({
			meshSizeX: .2,
			meshSizeY: .2,
			meshSizeZ: .2,
			removeAfter: true,
			pathTime: 10000
		}, options);
		super(scene, dataset, options);
		this.waypoints = waypoints.map((x) => new THREE.Vector3(x[0], x[1], x[2]));

		// mapping from datapoint ids to meshes
		this.dpMap = {};

		this.tweens = {};
	}

	embed() {
		// note: ignore datapoints that are already present in the dataset

		// process events sent by the dataset since last embed() call
		if (this.events.length > 0) {
			for (let i in this.events) {
				let e = this.events[i];
				if      (e.type == "add")    this._placeDatapoint(e.id);
				else if (e.type == "remove") this._removeDatapoint(e.id);
				else if (e.type == "update") this._updateDatapoint(e.id, e);
			}
		} 
		this.events = [];		
		// TODO move to global embedding update location
		TWEEN.update();
	}

	_placeDatapoint(id) {
		let dp  = this.dataset.datapoints[id];
		// create mesh
		let geo = new THREE.BoxGeometry(
			this.getOpt("meshSizeX", dp), this.getOpt("meshSizeY", dp), this.getOpt("meshSizeZ", dp));
		let mat = new THREE.MeshBasicMaterial( {
			color: 0x156289,
			shading: THREE.FlatShading
		} );
		mat = new THREE.MeshPhongMaterial( {
					color: 0xff00ff,
					emissive: 0x072534,
					side: THREE.DoubleSide,
					shading: THREE.FlatShading
				} );
		var mesh = new THREE.Mesh(geo,mat);
		this.dpMap[id] = mesh;
		this.obj3D.add(mesh);

		// create path tween
		let start = { x: this.waypoints[0].x, y: this.waypoints[0].y, z: this.waypoints[0].z }
		let end = {
			x: this.waypoints.slice(1).map((a) => a.x),
			y: this.waypoints.slice(1).map((a) => a.y),
			z: this.waypoints.slice(1).map((a) => a.z)
		}
		let t = this.getOpt("pathTime");
		var obj = this;
		let tween = new TWEEN.Tween(start)
			.to(end, t)
			.interpolation( TWEEN.Interpolation.CatmullRom )
			.onUpdate(function() {
				let oldPos = mesh.position.clone();
				let newPos = new THREE.Vector3(this.x, this.y, this.z);
				let dir = newPos.sub(oldPos).normalize();
				let axis = new THREE.Vector3(1, 0, 0);
				mesh.position.set(this.x, this.y, this.z);
				mesh.quaternion.setFromUnitVectors(axis, dir);
			})
			.onComplete(function() {
				delete obj.tweens[id];
				if (obj.getOpt("removeAfter")) obj.obj3D.remove(mesh);
			})
			.onStop(() => delete obj.tweens[id])
			.start();
		this.tweens[id] = tween;
	}

	_removeDatapoint(id) {
		// TODO implement
	}

	_updateDatapoint(id, event) {
		// TODO implement
	}

	_createMeshForDatapoint() {

	}
}

class Rescaling {
	constructor(xo=0, yo=0, zo=0, xs=1, ys=1, zs=1) {
		if (typeof(xo) == "number") {
			this.xo = xo;
			this.yo = yo;
			this.zo = zo;
			this.xs = xs;
			this.ys = ys;
			this.zs = zs;
		}
	}

	scaleX(x) {
		return this.xs*(x + this.xo);
	}

	scaleY(y) {
		return this.ys*(y + this.yo);
	}

	scaleZ(z) {
		return this.zs*(z + this.zo);
	}
}
'use strict'

var Papa = require('papaparse');
var assign = require('object-assign');
var TWEEN = require('tween.js');
var queryString = require('query-string');

var controls;

var embeddings = [];

var animateEmbeddings = function() {
	for (e in embeddings) {
		//
	}
}

function initScene(controlType = "") {
	if (controlType.toLowerCase() == "vr") {
		// use mflux's webvr harness
		const { scene, camera, renderer, events, toggleVR, controllers, vrEffect } = VRViewer({THREE});
		return { scene, camera, renderer };
	} else {
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 10;

		const renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );
	    document.body.appendChild( renderer.domElement );

	    if (controlType.toLowerCase() == "orbit") {
	    	const OrbitControls = require('three-orbit-controls')(THREE);
	    	controls = new OrbitControls(camera, renderer.domElement);
	    }
	    return { scene, camera, renderer };		
	}
}

function animate() {

    requestAnimationFrame( animate );
	embedding.embed();
    renderer.render( scene, camera );

}

module.exports = {
	Dataset: Dataset,
	WebSocketDataset: WebSocketDataset,
	Embedding: Embedding,
	RandomEmbedding: RandomEmbedding,
	ScatterEmbedding: ScatterEmbedding,
	PathEmbedding: PathEmbedding,
	initScene: initScene,
	animate: animate,
	queryString: queryString
}

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


},{"object-assign":2,"papaparse":3,"query-string":5,"three-orbit-controls":7,"tween.js":8}],2:[function(require,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],3:[function(require,module,exports){
/*!
	Papa Parse
	v4.1.2
	https://github.com/mholt/PapaParse
*/
(function(global)
{
	"use strict";

	var IS_WORKER = !global.document && !!global.postMessage,
		IS_PAPA_WORKER = IS_WORKER && /(\?|&)papaworker(=|&|$)/.test(global.location.search),
		LOADED_SYNC = false, AUTO_SCRIPT_PATH;
	var workers = {}, workerIdCounter = 0;

	var Papa = {};

	Papa.parse = CsvToJson;
	Papa.unparse = JsonToCsv;

	Papa.RECORD_SEP = String.fromCharCode(30);
	Papa.UNIT_SEP = String.fromCharCode(31);
	Papa.BYTE_ORDER_MARK = "\ufeff";
	Papa.BAD_DELIMITERS = ["\r", "\n", "\"", Papa.BYTE_ORDER_MARK];
	Papa.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
	Papa.SCRIPT_PATH = null;	// Must be set by your code if you use workers and this lib is loaded asynchronously

	// Configurable chunk sizes for local and remote files, respectively
	Papa.LocalChunkSize = 1024 * 1024 * 10;	// 10 MB
	Papa.RemoteChunkSize = 1024 * 1024 * 5;	// 5 MB
	Papa.DefaultDelimiter = ",";			// Used if not specified and detection fails

	// Exposed for testing and development only
	Papa.Parser = Parser;
	Papa.ParserHandle = ParserHandle;
	Papa.NetworkStreamer = NetworkStreamer;
	Papa.FileStreamer = FileStreamer;
	Papa.StringStreamer = StringStreamer;

	if (typeof module !== 'undefined' && module.exports)
	{
		// Export to Node...
		module.exports = Papa;
	}
	else if (isFunction(global.define) && global.define.amd)
	{
		// Wireup with RequireJS
		define(function() { return Papa; });
	}
	else
	{
		// ...or as browser global
		global.Papa = Papa;
	}

	if (global.jQuery)
	{
		var $ = global.jQuery;
		$.fn.parse = function(options)
		{
			var config = options.config || {};
			var queue = [];

			this.each(function(idx)
			{
				var supported = $(this).prop('tagName').toUpperCase() == "INPUT"
								&& $(this).attr('type').toLowerCase() == "file"
								&& global.FileReader;

				if (!supported || !this.files || this.files.length == 0)
					return true;	// continue to next input element

				for (var i = 0; i < this.files.length; i++)
				{
					queue.push({
						file: this.files[i],
						inputElem: this,
						instanceConfig: $.extend({}, config)
					});
				}
			});

			parseNextFile();	// begin parsing
			return this;		// maintains chainability


			function parseNextFile()
			{
				if (queue.length == 0)
				{
					if (isFunction(options.complete))
						options.complete();
					return;
				}

				var f = queue[0];

				if (isFunction(options.before))
				{
					var returned = options.before(f.file, f.inputElem);

					if (typeof returned === 'object')
					{
						if (returned.action == "abort")
						{
							error("AbortError", f.file, f.inputElem, returned.reason);
							return;	// Aborts all queued files immediately
						}
						else if (returned.action == "skip")
						{
							fileComplete();	// parse the next file in the queue, if any
							return;
						}
						else if (typeof returned.config === 'object')
							f.instanceConfig = $.extend(f.instanceConfig, returned.config);
					}
					else if (returned == "skip")
					{
						fileComplete();	// parse the next file in the queue, if any
						return;
					}
				}

				// Wrap up the user's complete callback, if any, so that ours also gets executed
				var userCompleteFunc = f.instanceConfig.complete;
				f.instanceConfig.complete = function(results)
				{
					if (isFunction(userCompleteFunc))
						userCompleteFunc(results, f.file, f.inputElem);
					fileComplete();
				};

				Papa.parse(f.file, f.instanceConfig);
			}

			function error(name, file, elem, reason)
			{
				if (isFunction(options.error))
					options.error({name: name}, file, elem, reason);
			}

			function fileComplete()
			{
				queue.splice(0, 1);
				parseNextFile();
			}
		}
	}


	if (IS_PAPA_WORKER)
	{
		global.onmessage = workerThreadReceivedMessage;
	}
	else if (Papa.WORKERS_SUPPORTED)
	{
		AUTO_SCRIPT_PATH = getScriptPath();

		// Check if the script was loaded synchronously
		if (!document.body)
		{
			// Body doesn't exist yet, must be synchronous
			LOADED_SYNC = true;
		}
		else
		{
			document.addEventListener('DOMContentLoaded', function () {
				LOADED_SYNC = true;
			}, true);
		}
	}




	function CsvToJson(_input, _config)
	{
		_config = _config || {};

		if (_config.worker && Papa.WORKERS_SUPPORTED)
		{
			var w = newWorker();

			w.userStep = _config.step;
			w.userChunk = _config.chunk;
			w.userComplete = _config.complete;
			w.userError = _config.error;

			_config.step = isFunction(_config.step);
			_config.chunk = isFunction(_config.chunk);
			_config.complete = isFunction(_config.complete);
			_config.error = isFunction(_config.error);
			delete _config.worker;	// prevent infinite loop

			w.postMessage({
				input: _input,
				config: _config,
				workerId: w.id
			});

			return;
		}

		var streamer = null;
		if (typeof _input === 'string')
		{
			if (_config.download)
				streamer = new NetworkStreamer(_config);
			else
				streamer = new StringStreamer(_config);
		}
		else if ((global.File && _input instanceof File) || _input instanceof Object)	// ...Safari. (see issue #106)
			streamer = new FileStreamer(_config);

		return streamer.stream(_input);
	}






	function JsonToCsv(_input, _config)
	{
		var _output = "";
		var _fields = [];

		// Default configuration

		/** whether to surround every datum with quotes */
		var _quotes = false;

		/** delimiting character */
		var _delimiter = ",";

		/** newline character(s) */
		var _newline = "\r\n";

		unpackConfig();

		if (typeof _input === 'string')
			_input = JSON.parse(_input);

		if (_input instanceof Array)
		{
			if (!_input.length || _input[0] instanceof Array)
				return serialize(null, _input);
			else if (typeof _input[0] === 'object')
				return serialize(objectKeys(_input[0]), _input);
		}
		else if (typeof _input === 'object')
		{
			if (typeof _input.data === 'string')
				_input.data = JSON.parse(_input.data);

			if (_input.data instanceof Array)
			{
				if (!_input.fields)
					_input.fields = _input.data[0] instanceof Array
									? _input.fields
									: objectKeys(_input.data[0]);

				if (!(_input.data[0] instanceof Array) && typeof _input.data[0] !== 'object')
					_input.data = [_input.data];	// handles input like [1,2,3] or ["asdf"]
			}

			return serialize(_input.fields || [], _input.data || []);
		}

		// Default (any valid paths should return before this)
		throw "exception: Unable to serialize unrecognized input";


		function unpackConfig()
		{
			if (typeof _config !== 'object')
				return;

			if (typeof _config.delimiter === 'string'
				&& _config.delimiter.length == 1
				&& Papa.BAD_DELIMITERS.indexOf(_config.delimiter) == -1)
			{
				_delimiter = _config.delimiter;
			}

			if (typeof _config.quotes === 'boolean'
				|| _config.quotes instanceof Array)
				_quotes = _config.quotes;

			if (typeof _config.newline === 'string')
				_newline = _config.newline;
		}


		/** Turns an object's keys into an array */
		function objectKeys(obj)
		{
			if (typeof obj !== 'object')
				return [];
			var keys = [];
			for (var key in obj)
				keys.push(key);
			return keys;
		}

		/** The double for loop that iterates the data and writes out a CSV string including header row */
		function serialize(fields, data)
		{
			var csv = "";

			if (typeof fields === 'string')
				fields = JSON.parse(fields);
			if (typeof data === 'string')
				data = JSON.parse(data);

			var hasHeader = fields instanceof Array && fields.length > 0;
			var dataKeyedByField = !(data[0] instanceof Array);

			// If there a header row, write it first
			if (hasHeader)
			{
				for (var i = 0; i < fields.length; i++)
				{
					if (i > 0)
						csv += _delimiter;
					csv += safe(fields[i], i);
				}
				if (data.length > 0)
					csv += _newline;
			}

			// Then write out the data
			for (var row = 0; row < data.length; row++)
			{
				var maxCol = hasHeader ? fields.length : data[row].length;

				for (var col = 0; col < maxCol; col++)
				{
					if (col > 0)
						csv += _delimiter;
					var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
					csv += safe(data[row][colIdx], col);
				}

				if (row < data.length - 1)
					csv += _newline;
			}

			return csv;
		}

		/** Encloses a value around quotes if needed (makes a value safe for CSV insertion) */
		function safe(str, col)
		{
			if (typeof str === "undefined" || str === null)
				return "";

			str = str.toString().replace(/"/g, '""');

			var needsQuotes = (typeof _quotes === 'boolean' && _quotes)
							|| (_quotes instanceof Array && _quotes[col])
							|| hasAny(str, Papa.BAD_DELIMITERS)
							|| str.indexOf(_delimiter) > -1
							|| str.charAt(0) == ' '
							|| str.charAt(str.length - 1) == ' ';

			return needsQuotes ? '"' + str + '"' : str;
		}

		function hasAny(str, substrings)
		{
			for (var i = 0; i < substrings.length; i++)
				if (str.indexOf(substrings[i]) > -1)
					return true;
			return false;
		}
	}

	/** ChunkStreamer is the base prototype for various streamer implementations. */
	function ChunkStreamer(config)
	{
		this._handle = null;
		this._paused = false;
		this._finished = false;
		this._input = null;
		this._baseIndex = 0;
		this._partialLine = "";
		this._rowCount = 0;
		this._start = 0;
		this._nextChunk = null;
		this.isFirstChunk = true;
		this._completeResults = {
			data: [],
			errors: [],
			meta: {}
		};
		replaceConfig.call(this, config);

		this.parseChunk = function(chunk)
		{
			// First chunk pre-processing
			if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk))
			{
				var modifiedChunk = this._config.beforeFirstChunk(chunk);
				if (modifiedChunk !== undefined)
					chunk = modifiedChunk;
			}
			this.isFirstChunk = false;

			// Rejoin the line we likely just split in two by chunking the file
			var aggregate = this._partialLine + chunk;
			this._partialLine = "";

			var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);
			
			if (this._handle.paused() || this._handle.aborted())
				return;
			
			var lastIndex = results.meta.cursor;
			
			if (!this._finished)
			{
				this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
				this._baseIndex = lastIndex;
			}

			if (results && results.data)
				this._rowCount += results.data.length;

			var finishedIncludingPreview = this._finished || (this._config.preview && this._rowCount >= this._config.preview);

			if (IS_PAPA_WORKER)
			{
				global.postMessage({
					results: results,
					workerId: Papa.WORKER_ID,
					finished: finishedIncludingPreview
				});
			}
			else if (isFunction(this._config.chunk))
			{
				this._config.chunk(results, this._handle);
				if (this._paused)
					return;
				results = undefined;
				this._completeResults = undefined;
			}

			if (!this._config.step && !this._config.chunk) {
				this._completeResults.data = this._completeResults.data.concat(results.data);
				this._completeResults.errors = this._completeResults.errors.concat(results.errors);
				this._completeResults.meta = results.meta;
			}

			if (finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted))
				this._config.complete(this._completeResults);

			if (!finishedIncludingPreview && (!results || !results.meta.paused))
				this._nextChunk();

			return results;
		};

		this._sendError = function(error)
		{
			if (isFunction(this._config.error))
				this._config.error(error);
			else if (IS_PAPA_WORKER && this._config.error)
			{
				global.postMessage({
					workerId: Papa.WORKER_ID,
					error: error,
					finished: false
				});
			}
		};

		function replaceConfig(config)
		{
			// Deep-copy the config so we can edit it
			var configCopy = copy(config);
			configCopy.chunkSize = parseInt(configCopy.chunkSize);	// parseInt VERY important so we don't concatenate strings!
			if (!config.step && !config.chunk)
				configCopy.chunkSize = null;  // disable Range header if not streaming; bad values break IIS - see issue #196
			this._handle = new ParserHandle(configCopy);
			this._handle.streamer = this;
			this._config = configCopy;	// persist the copy to the caller
		}
	}


	function NetworkStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.RemoteChunkSize;
		ChunkStreamer.call(this, config);

		var xhr;

		if (IS_WORKER)
		{
			this._nextChunk = function()
			{
				this._readChunk();
				this._chunkLoaded();
			};
		}
		else
		{
			this._nextChunk = function()
			{
				this._readChunk();
			};
		}

		this.stream = function(url)
		{
			this._input = url;
			this._nextChunk();	// Starts streaming
		};

		this._readChunk = function()
		{
			if (this._finished)
			{
				this._chunkLoaded();
				return;
			}

			xhr = new XMLHttpRequest();
			
			if (!IS_WORKER)
			{
				xhr.onload = bindFunction(this._chunkLoaded, this);
				xhr.onerror = bindFunction(this._chunkError, this);
			}

			xhr.open("GET", this._input, !IS_WORKER);
			
			if (this._config.chunkSize)
			{
				var end = this._start + this._config.chunkSize - 1;	// minus one because byte range is inclusive
				xhr.setRequestHeader("Range", "bytes="+this._start+"-"+end);
				xhr.setRequestHeader("If-None-Match", "webkit-no-cache"); // https://bugs.webkit.org/show_bug.cgi?id=82672
			}

			try {
				xhr.send();
			}
			catch (err) {
				this._chunkError(err.message);
			}

			if (IS_WORKER && xhr.status == 0)
				this._chunkError();
			else
				this._start += this._config.chunkSize;
		}

		this._chunkLoaded = function()
		{
			if (xhr.readyState != 4)
				return;

			if (xhr.status < 200 || xhr.status >= 400)
			{
				this._chunkError();
				return;
			}

			this._finished = !this._config.chunkSize || this._start > getFileSize(xhr);
			this.parseChunk(xhr.responseText);
		}

		this._chunkError = function(errorMessage)
		{
			var errorText = xhr.statusText || errorMessage;
			this._sendError(errorText);
		}

		function getFileSize(xhr)
		{
			var contentRange = xhr.getResponseHeader("Content-Range");
			return parseInt(contentRange.substr(contentRange.lastIndexOf("/") + 1));
		}
	}
	NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
	NetworkStreamer.prototype.constructor = NetworkStreamer;


	function FileStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.LocalChunkSize;
		ChunkStreamer.call(this, config);

		var reader, slice;

		// FileReader is better than FileReaderSync (even in worker) - see http://stackoverflow.com/q/24708649/1048862
		// But Firefox is a pill, too - see issue #76: https://github.com/mholt/PapaParse/issues/76
		var usingAsyncReader = typeof FileReader !== 'undefined';	// Safari doesn't consider it a function - see issue #105

		this.stream = function(file)
		{
			this._input = file;
			slice = file.slice || file.webkitSlice || file.mozSlice;

			if (usingAsyncReader)
			{
				reader = new FileReader();		// Preferred method of reading files, even in workers
				reader.onload = bindFunction(this._chunkLoaded, this);
				reader.onerror = bindFunction(this._chunkError, this);
			}
			else
				reader = new FileReaderSync();	// Hack for running in a web worker in Firefox

			this._nextChunk();	// Starts streaming
		};

		this._nextChunk = function()
		{
			if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
				this._readChunk();
		}

		this._readChunk = function()
		{
			var input = this._input;
			if (this._config.chunkSize)
			{
				var end = Math.min(this._start + this._config.chunkSize, this._input.size);
				input = slice.call(input, this._start, end);
			}
			var txt = reader.readAsText(input, this._config.encoding);
			if (!usingAsyncReader)
				this._chunkLoaded({ target: { result: txt } });	// mimic the async signature
		}

		this._chunkLoaded = function(event)
		{
			// Very important to increment start each time before handling results
			this._start += this._config.chunkSize;
			this._finished = !this._config.chunkSize || this._start >= this._input.size;
			this.parseChunk(event.target.result);
		}

		this._chunkError = function()
		{
			this._sendError(reader.error);
		}

	}
	FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
	FileStreamer.prototype.constructor = FileStreamer;


	function StringStreamer(config)
	{
		config = config || {};
		ChunkStreamer.call(this, config);

		var string;
		var remaining;
		this.stream = function(s)
		{
			string = s;
			remaining = s;
			return this._nextChunk();
		}
		this._nextChunk = function()
		{
			if (this._finished) return;
			var size = this._config.chunkSize;
			var chunk = size ? remaining.substr(0, size) : remaining;
			remaining = size ? remaining.substr(size) : '';
			this._finished = !remaining;
			return this.parseChunk(chunk);
		}
	}
	StringStreamer.prototype = Object.create(StringStreamer.prototype);
	StringStreamer.prototype.constructor = StringStreamer;



	// Use one ParserHandle per entire CSV file or string
	function ParserHandle(_config)
	{
		// One goal is to minimize the use of regular expressions...
		var FLOAT = /^\s*-?(\d*\.?\d+|\d+\.?\d*)(e[-+]?\d+)?\s*$/i;

		var self = this;
		var _stepCounter = 0;	// Number of times step was called (number of rows parsed)
		var _input;				// The input being parsed
		var _parser;			// The core parser being used
		var _paused = false;	// Whether we are paused or not
		var _aborted = false;   // Whether the parser has aborted or not
		var _delimiterError;	// Temporary state between delimiter detection and processing results
		var _fields = [];		// Fields are from the header row of the input, if there is one
		var _results = {		// The last results returned from the parser
			data: [],
			errors: [],
			meta: {}
		};

		if (isFunction(_config.step))
		{
			var userStep = _config.step;
			_config.step = function(results)
			{
				_results = results;

				if (needsHeaderRow())
					processResults();
				else	// only call user's step function after header row
				{
					processResults();

					// It's possbile that this line was empty and there's no row here after all
					if (_results.data.length == 0)
						return;

					_stepCounter += results.data.length;
					if (_config.preview && _stepCounter > _config.preview)
						_parser.abort();
					else
						userStep(_results, self);
				}
			};
		}

		/**
		 * Parses input. Most users won't need, and shouldn't mess with, the baseIndex
		 * and ignoreLastRow parameters. They are used by streamers (wrapper functions)
		 * when an input comes in multiple chunks, like from a file.
		 */
		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			if (!_config.newline)
				_config.newline = guessLineEndings(input);

			_delimiterError = false;
			if (!_config.delimiter)
			{
				var delimGuess = guessDelimiter(input);
				if (delimGuess.successful)
					_config.delimiter = delimGuess.bestDelimiter;
				else
				{
					_delimiterError = true;	// add error after parsing (otherwise it would be overwritten)
					_config.delimiter = Papa.DefaultDelimiter;
				}
				_results.meta.delimiter = _config.delimiter;
			}

			var parserConfig = copy(_config);
			if (_config.preview && _config.header)
				parserConfig.preview++;	// to compensate for header row

			_input = input;
			_parser = new Parser(parserConfig);
			_results = _parser.parse(_input, baseIndex, ignoreLastRow);
			processResults();
			return _paused ? { meta: { paused: true } } : (_results || { meta: { paused: false } });
		};

		this.paused = function()
		{
			return _paused;
		};

		this.pause = function()
		{
			_paused = true;
			_parser.abort();
			_input = _input.substr(_parser.getCharIndex());
		};

		this.resume = function()
		{
			_paused = false;
			self.streamer.parseChunk(_input);
		};

		this.aborted = function () {
			return _aborted;
		}

		this.abort = function()
		{
			_aborted = true;
			_parser.abort();
			_results.meta.aborted = true;
			if (isFunction(_config.complete))
				_config.complete(_results);
			_input = "";
		};

		function processResults()
		{
			if (_results && _delimiterError)
			{
				addError("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '"+Papa.DefaultDelimiter+"'");
				_delimiterError = false;
			}

			if (_config.skipEmptyLines)
			{
				for (var i = 0; i < _results.data.length; i++)
					if (_results.data[i].length == 1 && _results.data[i][0] == "")
						_results.data.splice(i--, 1);
			}

			if (needsHeaderRow())
				fillHeaderFields();

			return applyHeaderAndDynamicTyping();
		}

		function needsHeaderRow()
		{
			return _config.header && _fields.length == 0;
		}

		function fillHeaderFields()
		{
			if (!_results)
				return;
			for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
				for (var j = 0; j < _results.data[i].length; j++)
					_fields.push(_results.data[i][j]);
			_results.data.splice(0, 1);
		}

		function applyHeaderAndDynamicTyping()
		{
			if (!_results || (!_config.header && !_config.dynamicTyping))
				return _results;

			for (var i = 0; i < _results.data.length; i++)
			{
				var row = {};

				for (var j = 0; j < _results.data[i].length; j++)
				{
					if (_config.dynamicTyping)
					{
						var value = _results.data[i][j];
						if (value == "true" || value == "TRUE")
							_results.data[i][j] = true;
						else if (value == "false" || value == "FALSE")
							_results.data[i][j] = false;
						else
							_results.data[i][j] = tryParseFloat(value);
					}

					if (_config.header)
					{
						if (j >= _fields.length)
						{
							if (!row["__parsed_extra"])
								row["__parsed_extra"] = [];
							row["__parsed_extra"].push(_results.data[i][j]);
						}
						else
							row[_fields[j]] = _results.data[i][j];
					}
				}

				if (_config.header)
				{
					_results.data[i] = row;
					if (j > _fields.length)
						addError("FieldMismatch", "TooManyFields", "Too many fields: expected " + _fields.length + " fields but parsed " + j, i);
					else if (j < _fields.length)
						addError("FieldMismatch", "TooFewFields", "Too few fields: expected " + _fields.length + " fields but parsed " + j, i);
				}
			}

			if (_config.header && _results.meta)
				_results.meta.fields = _fields;
			return _results;
		}

		function guessDelimiter(input)
		{
			var delimChoices = [",", "\t", "|", ";", Papa.RECORD_SEP, Papa.UNIT_SEP];
			var bestDelim, bestDelta, fieldCountPrevRow;

			for (var i = 0; i < delimChoices.length; i++)
			{
				var delim = delimChoices[i];
				var delta = 0, avgFieldCount = 0;
				fieldCountPrevRow = undefined;

				var preview = new Parser({
					delimiter: delim,
					preview: 10
				}).parse(input);

				for (var j = 0; j < preview.data.length; j++)
				{
					var fieldCount = preview.data[j].length;
					avgFieldCount += fieldCount;

					if (typeof fieldCountPrevRow === 'undefined')
					{
						fieldCountPrevRow = fieldCount;
						continue;
					}
					else if (fieldCount > 1)
					{
						delta += Math.abs(fieldCount - fieldCountPrevRow);
						fieldCountPrevRow = fieldCount;
					}
				}

				if (preview.data.length > 0)
					avgFieldCount /= preview.data.length;

				if ((typeof bestDelta === 'undefined' || delta < bestDelta)
					&& avgFieldCount > 1.99)
				{
					bestDelta = delta;
					bestDelim = delim;
				}
			}

			_config.delimiter = bestDelim;

			return {
				successful: !!bestDelim,
				bestDelimiter: bestDelim
			}
		}

		function guessLineEndings(input)
		{
			input = input.substr(0, 1024*1024);	// max length 1 MB

			var r = input.split('\r');

			if (r.length == 1)
				return '\n';

			var numWithN = 0;
			for (var i = 0; i < r.length; i++)
			{
				if (r[i][0] == '\n')
					numWithN++;
			}

			return numWithN >= r.length / 2 ? '\r\n' : '\r';
		}

		function tryParseFloat(val)
		{
			var isNumber = FLOAT.test(val);
			return isNumber ? parseFloat(val) : val;
		}

		function addError(type, code, msg, row)
		{
			_results.errors.push({
				type: type,
				code: code,
				message: msg,
				row: row
			});
		}
	}





	/** The core parser implements speedy and correct CSV parsing */
	function Parser(config)
	{
		// Unpack the config object
		config = config || {};
		var delim = config.delimiter;
		var newline = config.newline;
		var comments = config.comments;
		var step = config.step;
		var preview = config.preview;
		var fastMode = config.fastMode;

		// Delimiter must be valid
		if (typeof delim !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(delim) > -1)
			delim = ",";

		// Comment character must be valid
		if (comments === delim)
			throw "Comment character same as delimiter";
		else if (comments === true)
			comments = "#";
		else if (typeof comments !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(comments) > -1)
			comments = false;

		// Newline must be valid: \r, \n, or \r\n
		if (newline != '\n' && newline != '\r' && newline != '\r\n')
			newline = '\n';

		// We're gonna need these at the Parser scope
		var cursor = 0;
		var aborted = false;

		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			// For some reason, in Chrome, this speeds things up (!?)
			if (typeof input !== 'string')
				throw "Input must be a string";

			// We don't need to compute some of these every time parse() is called,
			// but having them in a more local scope seems to perform better
			var inputLen = input.length,
				delimLen = delim.length,
				newlineLen = newline.length,
				commentsLen = comments.length;
			var stepIsFunction = typeof step === 'function';

			// Establish starting state
			cursor = 0;
			var data = [], errors = [], row = [], lastCursor = 0;

			if (!input)
				return returnable();

			if (fastMode || (fastMode !== false && input.indexOf('"') === -1))
			{
				var rows = input.split(newline);
				for (var i = 0; i < rows.length; i++)
				{
					var row = rows[i];
					cursor += row.length;
					if (i !== rows.length - 1)
						cursor += newline.length;
					else if (ignoreLastRow)
						return returnable();
					if (comments && row.substr(0, commentsLen) == comments)
						continue;
					if (stepIsFunction)
					{
						data = [];
						pushRow(row.split(delim));
						doStep();
						if (aborted)
							return returnable();
					}
					else
						pushRow(row.split(delim));
					if (preview && i >= preview)
					{
						data = data.slice(0, preview);
						return returnable(true);
					}
				}
				return returnable();
			}

			var nextDelim = input.indexOf(delim, cursor);
			var nextNewline = input.indexOf(newline, cursor);

			// Parser loop
			for (;;)
			{
				// Field has opening quote
				if (input[cursor] == '"')
				{
					// Start our search for the closing quote where the cursor is
					var quoteSearch = cursor;

					// Skip the opening quote
					cursor++;

					for (;;)
					{
						// Find closing quote
						var quoteSearch = input.indexOf('"', quoteSearch+1);

						if (quoteSearch === -1)
						{
							if (!ignoreLastRow) {
								// No closing quote... what a pity
								errors.push({
									type: "Quotes",
									code: "MissingQuotes",
									message: "Quoted field unterminated",
									row: data.length,	// row has yet to be inserted
									index: cursor
								});
							}
							return finish();
						}

						if (quoteSearch === inputLen-1)
						{
							// Closing quote at EOF
							var value = input.substring(cursor, quoteSearch).replace(/""/g, '"');
							return finish(value);
						}

						// If this quote is escaped, it's part of the data; skip it
						if (input[quoteSearch+1] == '"')
						{
							quoteSearch++;
							continue;
						}

						if (input[quoteSearch+1] == delim)
						{
							// Closing quote followed by delimiter
							row.push(input.substring(cursor, quoteSearch).replace(/""/g, '"'));
							cursor = quoteSearch + 1 + delimLen;
							nextDelim = input.indexOf(delim, cursor);
							nextNewline = input.indexOf(newline, cursor);
							break;
						}

						if (input.substr(quoteSearch+1, newlineLen) === newline)
						{
							// Closing quote followed by newline
							row.push(input.substring(cursor, quoteSearch).replace(/""/g, '"'));
							saveRow(quoteSearch + 1 + newlineLen);
							nextDelim = input.indexOf(delim, cursor);	// because we may have skipped the nextDelim in the quoted field

							if (stepIsFunction)
							{
								doStep();
								if (aborted)
									return returnable();
							}
							
							if (preview && data.length >= preview)
								return returnable(true);

							break;
						}
					}

					continue;
				}

				// Comment found at start of new line
				if (comments && row.length === 0 && input.substr(cursor, commentsLen) === comments)
				{
					if (nextNewline == -1)	// Comment ends at EOF
						return returnable();
					cursor = nextNewline + newlineLen;
					nextNewline = input.indexOf(newline, cursor);
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// Next delimiter comes before next newline, so we've reached end of field
				if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1))
				{
					row.push(input.substring(cursor, nextDelim));
					cursor = nextDelim + delimLen;
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// End of row
				if (nextNewline !== -1)
				{
					row.push(input.substring(cursor, nextNewline));
					saveRow(nextNewline + newlineLen);

					if (stepIsFunction)
					{
						doStep();
						if (aborted)
							return returnable();
					}

					if (preview && data.length >= preview)
						return returnable(true);

					continue;
				}

				break;
			}


			return finish();


			function pushRow(row)
			{
				data.push(row);
				lastCursor = cursor;
			}

			/**
			 * Appends the remaining input from cursor to the end into
			 * row, saves the row, calls step, and returns the results.
			 */
			function finish(value)
			{
				if (ignoreLastRow)
					return returnable();
				if (typeof value === 'undefined')
					value = input.substr(cursor);
				row.push(value);
				cursor = inputLen;	// important in case parsing is paused
				pushRow(row);
				if (stepIsFunction)
					doStep();
				return returnable();
			}

			/**
			 * Appends the current row to the results. It sets the cursor
			 * to newCursor and finds the nextNewline. The caller should
			 * take care to execute user's step function and check for
			 * preview and end parsing if necessary.
			 */
			function saveRow(newCursor)
			{
				cursor = newCursor;
				pushRow(row);
				row = [];
				nextNewline = input.indexOf(newline, cursor);
			}

			/** Returns an object with the results, errors, and meta. */
			function returnable(stopped)
			{
				return {
					data: data,
					errors: errors,
					meta: {
						delimiter: delim,
						linebreak: newline,
						aborted: aborted,
						truncated: !!stopped,
						cursor: lastCursor + (baseIndex || 0)
					}
				};
			}

			/** Executes the user's step function and resets data & errors. */
			function doStep()
			{
				step(returnable());
				data = [], errors = [];
			}
		};

		/** Sets the abort flag */
		this.abort = function()
		{
			aborted = true;
		};

		/** Gets the cursor position */
		this.getCharIndex = function()
		{
			return cursor;
		};
	}


	// If you need to load Papa Parse asynchronously and you also need worker threads, hard-code
	// the script path here. See: https://github.com/mholt/PapaParse/issues/87#issuecomment-57885358
	function getScriptPath()
	{
		var scripts = document.getElementsByTagName('script');
		return scripts.length ? scripts[scripts.length - 1].src : '';
	}

	function newWorker()
	{
		if (!Papa.WORKERS_SUPPORTED)
			return false;
		if (!LOADED_SYNC && Papa.SCRIPT_PATH === null)
			throw new Error(
				'Script path cannot be determined automatically when Papa Parse is loaded asynchronously. ' +
				'You need to set Papa.SCRIPT_PATH manually.'
			);
		var workerUrl = Papa.SCRIPT_PATH || AUTO_SCRIPT_PATH;
		// Append "papaworker" to the search string to tell papaparse that this is our worker.
		workerUrl += (workerUrl.indexOf('?') !== -1 ? '&' : '?') + 'papaworker';
		var w = new global.Worker(workerUrl);
		w.onmessage = mainThreadReceivedMessage;
		w.id = workerIdCounter++;
		workers[w.id] = w;
		return w;
	}

	/** Callback when main thread receives a message */
	function mainThreadReceivedMessage(e)
	{
		var msg = e.data;
		var worker = workers[msg.workerId];
		var aborted = false;

		if (msg.error)
			worker.userError(msg.error, msg.file);
		else if (msg.results && msg.results.data)
		{
			var abort = function() {
				aborted = true;
				completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
			};

			var handle = {
				abort: abort,
				pause: notImplemented,
				resume: notImplemented
			};

			if (isFunction(worker.userStep))
			{
				for (var i = 0; i < msg.results.data.length; i++)
				{
					worker.userStep({
						data: [msg.results.data[i]],
						errors: msg.results.errors,
						meta: msg.results.meta
					}, handle);
					if (aborted)
						break;
				}
				delete msg.results;	// free memory ASAP
			}
			else if (isFunction(worker.userChunk))
			{
				worker.userChunk(msg.results, handle, msg.file);
				delete msg.results;
			}
		}

		if (msg.finished && !aborted)
			completeWorker(msg.workerId, msg.results);
	}

	function completeWorker(workerId, results) {
		var worker = workers[workerId];
		if (isFunction(worker.userComplete))
			worker.userComplete(results);
		worker.terminate();
		delete workers[workerId];
	}

	function notImplemented() {
		throw "Not implemented.";
	}

	/** Callback when worker thread receives a message */
	function workerThreadReceivedMessage(e)
	{
		var msg = e.data;

		if (typeof Papa.WORKER_ID === 'undefined' && msg)
			Papa.WORKER_ID = msg.workerId;

		if (typeof msg.input === 'string')
		{
			global.postMessage({
				workerId: Papa.WORKER_ID,
				results: Papa.parse(msg.input, msg.config),
				finished: true
			});
		}
		else if ((global.File && msg.input instanceof File) || msg.input instanceof Object)	// thank you, Safari (see issue #106)
		{
			var results = Papa.parse(msg.input, msg.config);
			if (results)
				global.postMessage({
					workerId: Papa.WORKER_ID,
					results: results,
					finished: true
				});
		}
	}

	/** Makes a deep copy of an array or object (mostly) */
	function copy(obj)
	{
		if (typeof obj !== 'object')
			return obj;
		var cpy = obj instanceof Array ? [] : {};
		for (var key in obj)
			cpy[key] = copy(obj[key]);
		return cpy;
	}

	function bindFunction(f, self)
	{
		return function() { f.apply(self, arguments); };
	}

	function isFunction(func)
	{
		return typeof func === 'function';
	}
})(typeof window !== 'undefined' ? window : this);

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
'use strict';
var strictUriEncode = require('strict-uri-encode');
var objectAssign = require('object-assign');

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str) {
	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (ret[key] === undefined) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}
	});

	return ret;
};

exports.stringify = function (obj, opts) {
	var defaults = {
		encode: true,
		strict: true
	};

	opts = objectAssign(defaults, opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				if (val2 === null) {
					result.push(encode(key, opts));
				} else {
					result.push(encode(key, opts) + '=' + encode(val2, opts));
				}
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

},{"object-assign":2,"strict-uri-encode":6}],6:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],7:[function(require,module,exports){
module.exports = function(THREE) {
	var MOUSE = THREE.MOUSE
	if (!MOUSE)
		MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };

	/**
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 */
	/*global THREE, console */

	function OrbitConstraint ( object ) {

		this.object = object;

		// "target" sets the location of focus, where the object orbits around
		// and where it pans with respect to.
		this.target = new THREE.Vector3();

		// Limits to how far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// Limits to how far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		////////////
		// internals

		var scope = this;

		var EPS = 0.000001;

		// Current position in spherical coordinate system.
		var theta;
		var phi;

		// Pending changes
		var phiDelta = 0;
		var thetaDelta = 0;
		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		// API

		this.getPolarAngle = function () {

			return phi;

		};

		this.getAzimuthalAngle = function () {

			return theta;

		};

		this.rotateLeft = function ( angle ) {

			thetaDelta -= angle;

		};

		this.rotateUp = function ( angle ) {

			phiDelta -= angle;

		};

		// pass in distance in world space to move left
		this.panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft ( distance ) {

				var te = this.object.matrix.elements;

				// get X column of matrix
				v.set( te[ 0 ], te[ 1 ], te[ 2 ] );
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		// pass in distance in world space to move up
		this.panUp = function() {

			var v = new THREE.Vector3();

			return function panUp ( distance ) {

				var te = this.object.matrix.elements;

				// get Y column of matrix
				v.set( te[ 4 ], te[ 5 ], te[ 6 ] );
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		this.pan = function ( deltaX, deltaY, screenWidth, screenHeight ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				// perspective
				var position = scope.object.position;
				var offset = position.clone().sub( scope.target );
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				scope.panLeft( 2 * deltaX * targetDistance / screenHeight );
				scope.panUp( 2 * deltaY * targetDistance / screenHeight );

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				// orthographic
				scope.panLeft( deltaX * ( scope.object.right - scope.object.left ) / screenWidth );
				scope.panUp( deltaY * ( scope.object.top - scope.object.bottom ) / screenHeight );

			} else {

				// camera neither orthographic or perspective
				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

			}

		};

		this.dollyIn = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.dollyOut = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function () {

				var position = this.object.position;

				offset.copy( position ).sub( this.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis

				theta = Math.atan2( offset.x, offset.z );

				// angle from y-axis

				phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

				theta += thetaDelta;
				phi += phiDelta;

				// restrict theta to be between desired limits
				theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

				// restrict phi to be between desired limits
				phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

				// restrict phi to be betwee EPS and PI-EPS
				phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

				var radius = offset.length() * scale;

				// restrict radius to be between desired limits
				radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

				// move target to panned location
				this.target.add( panOffset );

				offset.x = radius * Math.sin( phi ) * Math.sin( theta );
				offset.y = radius * Math.cos( phi );
				offset.z = radius * Math.sin( phi ) * Math.cos( theta );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( this.target ).add( offset );

				this.object.lookAt( this.target );

				if ( this.enableDamping === true ) {

					thetaDelta *= ( 1 - this.dampingFactor );
					phiDelta *= ( 1 - this.dampingFactor );

				} else {

					thetaDelta = 0;
					phiDelta = 0;

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					 lastPosition.distanceToSquared( this.object.position ) > EPS ||
					8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

					lastPosition.copy( this.object.position );
					lastQuaternion.copy( this.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

	};


	// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
	// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
	// supported.
	//
	//    Orbit - left mouse / touch: one finger move
	//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
	//    Pan - right mouse, or arrow keys / touch: three finter swipe

	function OrbitControls ( object, domElement ) {

		var constraint = new OrbitConstraint( object );

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// API

		Object.defineProperty( this, 'constraint', {

			get: function() {

				return constraint;

			}

		} );

		this.getPolarAngle = function () {

			return constraint.getPolarAngle();

		};

		this.getAzimuthalAngle = function () {

			return constraint.getAzimuthalAngle();

		};

		// Set to false to disable this control
		this.enabled = true;

		// center is old, deprecated; use "target" instead
		this.center = this.target;

		// This option actually enables dollying in and out; left as "zoom" for
		// backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		////////////
		// internals

		var scope = this;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		// for reset

		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		// events

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		function pan( deltaX, deltaY ) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			constraint.pan( deltaX, deltaY, element.clientWidth, element.clientHeight );

		}

		this.update = function () {

			if ( this.autoRotate && state === STATE.NONE ) {

				constraint.rotateLeft( getAutoRotationAngle() );

			}

			if ( constraint.update() === true ) {

				this.dispatchEvent( changeEvent );

			}

		};

		this.reset = function () {

			state = STATE.NONE;

			this.target.copy( this.target0 );
			this.object.position.copy( this.position0 );
			this.object.zoom = this.zoom0;

			this.object.updateProjectionMatrix();
			this.dispatchEvent( changeEvent );

			this.update();

		};

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				state = STATE.ROTATE;

				rotateStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				state = STATE.DOLLY;

				dollyStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				state = STATE.PAN;

				panStart.set( event.clientX, event.clientY );

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );
				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

				// rotating up and down along whole screen attempts to go 360, but limited to 180
				constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					constraint.dollyIn( getZoomScale() );

				} else if ( dollyDelta.y < 0 ) {

					constraint.dollyOut( getZoomScale() );

				}

				dollyStart.copy( dollyEnd );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart );

				pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

			}

			if ( state !== STATE.NONE ) scope.update();

		}

		function onMouseUp( /* event */ ) {

			if ( scope.enabled === false ) return;

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

			event.preventDefault();
			event.stopPropagation();

			var delta = 0;

			if ( event.wheelDelta !== undefined ) {

				// WebKit / Opera / Explorer 9

				delta = event.wheelDelta;

			} else if ( event.detail !== undefined ) {

				// Firefox

				delta = - event.detail;

			}

			if ( delta > 0 ) {

				constraint.dollyOut( getZoomScale() );

			} else if ( delta < 0 ) {

				constraint.dollyIn( getZoomScale() );

			}

			scope.update();
			scope.dispatchEvent( startEvent );
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function touchstart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					state = STATE.TOUCH_ROTATE;

					rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					state = STATE.TOUCH_DOLLY;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );
					dollyStart.set( 0, distance );
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					state = STATE.TOUCH_PAN;

					panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

		}

		function touchmove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return;

					rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					rotateDelta.subVectors( rotateEnd, rotateStart );

					// rotating across whole screen goes 360 degrees around
					constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
					// rotating up and down along whole screen attempts to go 360, but limited to 180
					constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

					rotateStart.copy( rotateEnd );

					scope.update();
					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );

					dollyEnd.set( 0, distance );
					dollyDelta.subVectors( dollyEnd, dollyStart );

					if ( dollyDelta.y > 0 ) {

						constraint.dollyOut( getZoomScale() );

					} else if ( dollyDelta.y < 0 ) {

						constraint.dollyIn( getZoomScale() );

					}

					dollyStart.copy( dollyEnd );

					scope.update();
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return;

					panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					panDelta.subVectors( panEnd, panStart );

					pan( panDelta.x, panDelta.y );

					panStart.copy( panEnd );

					scope.update();
					break;

				default:

					state = STATE.NONE;

			}

		}

		function touchend( /* event */ ) {

			if ( scope.enabled === false ) return;

			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function contextmenu( event ) {

			event.preventDefault();

		}

		this.dispose = function() {

			this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
			this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
			this.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

			this.domElement.removeEventListener( 'touchstart', touchstart, false );
			this.domElement.removeEventListener( 'touchend', touchend, false );
			this.domElement.removeEventListener( 'touchmove', touchmove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

		}

		this.domElement.addEventListener( 'contextmenu', contextmenu, false );

		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
		this.domElement.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

		this.domElement.addEventListener( 'touchstart', touchstart, false );
		this.domElement.addEventListener( 'touchend', touchend, false );
		this.domElement.addEventListener( 'touchmove', touchmove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start
		this.update();

	};

	OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	OrbitControls.prototype.constructor = OrbitControls;

	Object.defineProperties( OrbitControls.prototype, {

		object: {

			get: function () {

				return this.constraint.object;

			}

		},

		target: {

			get: function () {

				return this.constraint.target;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: target is now immutable. Use target.set() instead.' );
				this.constraint.target.copy( value );

			}

		},

		minDistance : {

			get: function () {

				return this.constraint.minDistance;

			},

			set: function ( value ) {

				this.constraint.minDistance = value;

			}

		},

		maxDistance : {

			get: function () {

				return this.constraint.maxDistance;

			},

			set: function ( value ) {

				this.constraint.maxDistance = value;

			}

		},

		minZoom : {

			get: function () {

				return this.constraint.minZoom;

			},

			set: function ( value ) {

				this.constraint.minZoom = value;

			}

		},

		maxZoom : {

			get: function () {

				return this.constraint.maxZoom;

			},

			set: function ( value ) {

				this.constraint.maxZoom = value;

			}

		},

		minPolarAngle : {

			get: function () {

				return this.constraint.minPolarAngle;

			},

			set: function ( value ) {

				this.constraint.minPolarAngle = value;

			}

		},

		maxPolarAngle : {

			get: function () {

				return this.constraint.maxPolarAngle;

			},

			set: function ( value ) {

				this.constraint.maxPolarAngle = value;

			}

		},

		minAzimuthAngle : {

			get: function () {

				return this.constraint.minAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.minAzimuthAngle = value;

			}

		},

		maxAzimuthAngle : {

			get: function () {

				return this.constraint.maxAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.maxAzimuthAngle = value;

			}

		},

		enableDamping : {

			get: function () {

				return this.constraint.enableDamping;

			},

			set: function ( value ) {

				this.constraint.enableDamping = value;

			}

		},

		dampingFactor : {

			get: function () {

				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				this.constraint.dampingFactor = value;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.constraint.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.constraint.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.constraint.dampingFactor = value;

			}

		}

	} );

	return OrbitControls;
}

},{}],8:[function(require,module,exports){
(function (process){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time, preserve) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : TWEEN.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time) || preserve) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();


// Include a performance.now polyfill
(function () {
	// In node.js, use process.hrtime.
	if (this.window === undefined && this.process !== undefined) {
		TWEEN.now = function () {
			var time = process.hrtime();

			// Convert [seconds, microseconds] to milliseconds.
			return time[0] * 1000 + time[1] / 1000;
		};
	}
	// In a browser, use window.performance.now if it is available.
	else if (this.window !== undefined &&
	         window.performance !== undefined &&
		 window.performance.now !== undefined) {

		// This must be bound, because directly assigning this function
		// leads to an invocation exception in Chrome.
		TWEEN.now = window.performance.now.bind(window.performance);
	}
	// Use Date.now if it is available.
	else if (Date.now !== undefined) {
		TWEEN.now = Date.now;
	}
	// Otherwise, use 'new Date().getTime()'.
	else {
		TWEEN.now = function () {
			return new Date().getTime();
		};
	}
})();


TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : TWEEN.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;

		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end, 10);
					} else {
						end = parseFloat(end, 10);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this,require('_process'))
},{"_process":4}]},{},[1])(1)
});