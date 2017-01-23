import * as THREE from 'three';
import assign from 'object-assign';
import TWEEN from 'tween.js';
import { maybeEval, randomRange } from './utils.js'
import { input } from './main.js'
import { mean, max, min, sum, identity, groupBy, map, keys, sortBy } from 'lodash'
import chroma from 'chroma-js'

/**
 * Base class for all embeddings.
 */
export class Embedding {
	/**
	 * Embedding base constructor.
	 * @constructor
	 * @param scene - The scene to which the embedding belongs
	 * @param {Dataset} dataset - The dataset that backs the embedding
	 * @param {Object} [options={}] - Options describing the embedding's location and scale
	 * @param {Number} [options.x=0] - x position of the embedding
	 * @param {Number} [options.y=0] - y position of the embedding
	 * @param {Number} [options.z=0] - z position of the embedding
	 * @param {Number} [options.rx=0] - x rotation of the embedding
	 * @param {Number} [options.ry=0] - y rotation of the embedding
	 * @param {Number} [options.rz=0] - z rotation of the embedding
	 * @param {Number} [options.sx=1] - x scale of the embedding
	 * @param {Number} [options.sy=1] - y scale of the embedding
	 * @param {Number} [options.sz=1] - z scale of the embedding
	 */
	constructor(scene, dataset, options = {}) {
		this.dataset = dataset;
		if (dataset) dataset.register(this);
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

	/**
	 * Translates from a source property of a datapoint to a target property of an embedding
	 * element.
	 */
	_map(dp, src) {
		let tgt = this.mapping[src];
		if (tgt) {
			if (typeof(tgt) == 'function')
				return tgt(dp);
			else 
				return dp.get(tgt)
		} else
			return dp.get(src);
	}

	/**
	 * Translates from a source property of a datapoint to a target property of an embedding
	 * element.
	 */
	_mapAttr(src) {
		let tgt = this.mapping[src];
		return tgt ? tgt : src;
	}

	/**
	 * Render the embedding - must be implemented by each concrete subclass.
	 * @abstract
	 */
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
/**
 * Define individual properties
 * position: x,y,z
 * geo type: cube, box, sphere, ellipsoid, tetrahedron, octahedron
 * color: hue, sat, luminance
 * wireframe?
 * 
 * Supply functions to generate material and/or geometry from datapoint
 */
export class MeshEmbedding extends Embedding {
	constructor(scene, dataset, options={}) {
		options = assign(
			{
				meshType: 'cube',
				color: 0xff00ff,
				emissive: 0x888888,
				metalness: 0,
				wireframe: false
			}, options);

		// Set defaults appropriate to the mesh type
		switch (options.meshType.toLowerCase()) {
			case 'box':
				options = assign({
					sizeX: .02,
				}, options);
				options = assign({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'sphere':
				options = assign({
					sizeR: .01
				}, options);
				break;
			case 'ellipsoid':
				options = assign({
					sizeX: .01,
					sizeY: .02,
					sizeZ: .03
				}, options);
				break;
			case 'tetrahedron':
				options = assign({
					sizeX: .02
				}, options);
				options = assign({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'octahedron':
				options = assign({
					sizeX: .02,
				}, options);
				options = assign({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'cube':
			default:
				// fall back to Cube
				options = assign({
					sizeX: .02
				}, options);
				break;
		}

		// Ensure options.geometry is an array if it is present
		if (options.geometry && !Array.isArray(options.geometry))
			options.geometry = [options.geometry]; 

		super(scene, dataset, options);

		// mapping from datapoint ids to meshes
		this.dpMap = {};

		// place the datapoints present in the dataset
		for (let id of this.dataset.getIds()) this._placeDatapoint(id);
	}

	embed() {
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
	}

	/**
	 * A default Object3D creator; this can be overriden by subclasses 
	 */
	createObjectForDatapoint(dp) {
		var geos, mat;
		if (this.options.object3d) {
			// Objects specified
			let object3d = this.options.object3d;
			if (typeof(object3d) == 'function') {
				let result = object3d(dp);
				result.userData = dp;
				return result;
			} else if (object3d instanceof THREE.Object3D) {
				let result = object3d.clone();
				result.userData = dp;
				return result;
			} else {
				console.warn('Object3D type not recognized');
			}
		} else if (this.options.geometry) { 

			// Geometry(ies) specified
			geos = this.options.geometry.map(function(g) {
				if (typeof(g) == 'function')
					return g(dp);
				else if (g instanceof THREE.Geometry)
					return g.clone();
				else
					console.warn('geometry type not recognized');
			}.bind(this))

		} else { 
			// Create geometry from parameters
			switch (this.options.meshType.toLowerCase()) {
				case 'box':
					geos = [new THREE.BoxGeometry(
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeY, dp),
						maybeEval(this.options.sizeZ, dp))];
					break;
				case 'sphere':
					geos = [new THREE.SphereGeometry(maybeEval(this.options.sizeR, dp), 16, 16)];
					break;
				case 'ellipsoid':
					geos = [new THREE.SphereGeometry(1.0, 16, 16)];
					geos[0].applyMatrix(new THREE.Matrix4().makeScale(
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeY, dp),
						maybeEval(this.options.sizeZ, dp)));
					break;
				case 'tetrahedron':
					geos = [new THREE.TetrahedronGeometry(1.0)];
					geos[0].applyMatrix(new THREE.Matrix4().makeScale(
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeY, dp),
						maybeEval(this.options.sizeZ, dp)));
					break;
				case 'octahedron':
					geos = [new THREE.OctahedronGeometry(1.0)];
					geos[0].applyMatrix(new THREE.Matrix4().makeScale(
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeY, dp),
						maybeEval(this.options.sizeZ, dp)));
					break;
				case 'cube':
				default:
					geos = [new THREE.BoxGeometry(
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeX, dp),
						maybeEval(this.options.sizeX, dp))];
					break;
			}
		}

		if (this.options.material) {
			if (typeof(this.options.material) == 'function')
				mat = this.options.material(dp);
			else if (this.options.material instanceof THREE.Material) 
				mat = this.options.material.clone();
			else
				console.warn('material type not recognized');
		} else { // Create material from parameters
			mat = new THREE.MeshStandardMaterial({
				color: maybeEval(this.options.color, dp),
				emissive: maybeEval(this.options.emissive, dp),
				metalness: maybeEval(this.options.metalness, dp),
				wireframe: maybeEval(this.options.wireframe, dp)
			});
		}
		let obj = new THREE.Object3D();
		for (let geo of geos)
			obj.add(new THREE.Mesh(geo, mat));
		obj.userData = dp;
		return obj;
	}

	_placeDatapoint(id) {
		let dp  = this.dataset.datapoints[id];
		let obj = this.createObjectForDatapoint(dp);
		obj.userData.description = this.getOpt("description", dp);
		this.dpMap[id] = obj;
		this.obj3D.add(obj);
		input.add(obj);
		obj.position.set(this._map(dp, 'x'), this._map(dp, 'y'), this._map(dp, 'z'));
	}

	_removeDatapoint(id) {
		let mesh = this.dpMap[id];
		if (mesh) this.obj3D.remove(mesh);
	}

	_updateDatapoint(id, event) {
		_removeDatapoint(id);
		_placeDatapoint(id);
	}

}

/**
 * Base class for embedding backed by a Points object (i.e., particle clouds)
 */
export class PointsEmbedding extends Embedding {
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

/**
 * An embedding in which each datapoint is rendered as a vertex in a THREE.Points object.
 */
export class ScatterEmbedding extends PointsEmbedding {
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
				// console.log("calling vertices update");
				this.points.geometry.verticesNeedUpdate = true;			
			} 
			this.events = [];
		}
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

/**
 * A {MeshEmbedding} in which each {Datapoint} is rendered as a Mesh that follows a
 * path defined by waypoints.
 */
export class PathEmbedding extends MeshEmbedding {
	constructor(scene, dataset, waypoints, options) {
		options = assign({
			pathWidthX: 0,
			pathWidthY: 0,
			pathWidthZ: 0,
			description: '',
			removeAfter: true,
			pathTime: 10000
		}, options);
		super(scene, dataset, options);
		this.waypoints = waypoints.map((x) => new THREE.Vector3(x[0], x[1], x[2]));

		this.meshOffsets = {};
		this.tweens = {};
	}

	_createMeshOffset(id) {
		let pwx = this.getOpt('pathWidthX');
		let pwy = this.getOpt('pathWidthY');
		let pwz = this.getOpt('pathWidthZ');
		let ox = pwx * Math.random() - pwx / 2;
		let oy = pwy * Math.random() - pwy / 2;
		let oz = pwz * Math.random() - pwz / 2;
		this.meshOffsets[id] = new THREE.Vector3(ox, oy, oz);
	}

	_placeDatapoint(id) {
		let dp  = this.dataset.datapoints[id];
		let mesh = this.createObjectForDatapoint(dp);
		this._createMeshOffset(id);
		mesh.userData.description = this.getOpt("description", dp);
		this.dpMap[id] = mesh;
		this.obj3D.add(mesh);
		input.add(mesh);

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
				// keep the x-axis of the mesh tangent to the path as it moves
				let oldPos = mesh.position.clone();
				let newPos = new THREE.Vector3(this.x, this.y, this.z);
				let dir = newPos.sub(oldPos).normalize();
				let axis = new THREE.Vector3(1, 0, 0);
				let offset = obj.meshOffsets[id]
				mesh.position.set(this.x + offset.x, this.y + offset.y, this.z + offset.z);
				// mesh.position.set(this.x, this.y, this.z);
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
		if (this.tweens[id]) this.tweens[id].stop();
		let mesh = this.dpMap[id];
		if (mesh) this.obj3D.remove(mesh);
	}

	_updateDatapoint(id, event) {
		// TODO implement
	}
}

export class ConsoleEmbedding extends Embedding {
	constructor(scene, dataset, options={}) {
		options = assign({
			font: "Bold 24px Arial",
			fillStyle: "rgba(225,225,225,0.90)",
			align: "center",
			width: 1.0
		}, options);
		super(scene, dataset, options);
		this.canvas = document.createElement('canvas');
		this.canvas.width = 1024;
		this.canvas.height = 512;
		this.context = this.canvas.getContext('2d');
		this.context.font = this.getOpt('font');
		this.context.fillStyle = this.getOpt('fillStyle');
		this.context.textAlign = this.getOpt('align');
		this.mesh = undefined;
	}

	setText(text) {
		if (this.mesh)
			this.obj3D.remove(this.mesh)
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.getOpt('align') == 'left')
			this.context.fillText(text, 0, this.canvas.height / 2);
		else if (this.getOpt('align') == 'right')
			this.context.fillText(text, this.canvas.width, this.canvas.height / 2);
		else // default to center
			this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

		let texture = new THREE.Texture(this.canvas);
		texture.needsUpdate = true;
		let material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
		material.transparent = true;

		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(
				this.getOpt('width') * this.canvas.width / 256, this.getOpt('width') * this.canvas.height / 128),
			material
		);
		this.mesh.position.set(this.getOpt('x'), this.getOpt('y'), this.getOpt('z'));
		this.obj3D.add(this.mesh);
	}
}

/**
 * An embedding that represents an aggregation of a dataset, including many operations
 * from traditional data analytics.
 */
// TODO avoid recomputing aggs on every event
export class AggregateEmbedding extends Embedding {
	static get IndividualGrouping() {
		return (dp) => dp.id
	}

	static get CollapsedGrouping() {
		return (dp) => 1
	}

	static get Aggregates() {
		return {
			mean,
			max,
			min,
			sum,
			identity
		}
	}

	/**
	 * Create a new AggregateEmbedding.
	 * @param {string} attr - The attribute which is being aggregated
	 * @param scene - The scene to which the embedding belongs
	 * @param {Dataset} dataset - The dataset that backs the embedding
	 * @param {Object} [options={}] - Options describing the embedding's location and scale
	 * @param {function} [options.filter=identity] - A filter to apply to the Dataset before 
	 *        applying the aggregator. Default is to keep all datapoints in the Dataset
	 * @param {function} [options.groupBy=AggregateEmbedding.CollapsedGrouping] - A function 
	 *        by whose output the Dataset will be grouped before applyting the aggregator. 
	          Default is to place all datapoints into a single group.
	 * @param {function} [options.aggregate=AggregateEmbedding.Aggregates.mean] - The function by
	          which to aggregate the dataset attribute
	 */
	constructor(attr, scene, dataset, options) {
		options = assign({
			filter: identity,
			groupBy: AggregateEmbedding.CollapsedGrouping,
			aggregate: AggregateEmbedding.Aggregates.mean,
			baseSize: 0.1,
			color: 'gray',
			emissive: 0x000000
		}, options);
		super(scene, dataset, options);

		this.attr = attr;

		this.meshes = [];
		this.initMeshes()
	}

	initMeshes() {
		this.meshes.map((mesh) => this.remove(mesh));
		this.meshes = [];

		let aggValues = this.computeAggValues_();
		this.cachedAggValues = aggValues;
		this.createMeshes_(aggValues);
	}

	computeAggValues_() {
		let filtered = this.dataset.getDatapoints(this.options.filter);
		let groups = groupBy(filtered, this.options.groupBy);
		let groupedValues = keys(groups)
			.map((key) => groups[key].map(
				(dp) => dp.get(this.attr)));
		let aggValues = groupedValues.map((vals) => this.options.aggregate(vals));
		return aggValues;
	}

	createMeshes_() {
		map(aggValues, (aggValue, i) => {
			let geo = new THREE.SphereGeometry(this.options.baseSize, 32, 32);
			let mat = new THREE.MeshStandardMaterial({ 
				emissive: this.options.emissive,
				color: this.options.color 
			});
			let mesh = new THREE.Mesh(geo, mat);
			let scale = Math.cbrt(aggValue);
			mesh.scale.set(scale, scale, scale);
			mesh.position.set(i, 0, 0)
			this.obj3D.add(mesh);
			this.meshes.push(mesh);
		})
	}

	embed() {
		// process events sent by the dataset since last embed() call
		if (this.events.length > 0) {
			for (let i in this.events) {
				let e = this.events[i];
				if      (e.type == "add")    this._addDatapoint(e.id);
				else if (e.type == "remove") this._removeDatapoint(e.id);
				else if (e.type == "update") this._updateDatapoint(e.id, e);
			}
		} 
		this.events = [];
	}

	_addDatapoint(id) {
		// TODO optimize
		this.initMeshes();
	}

	_removeDatapoint(id) {
		// TODO optimize
		this.initMeshes();
	}

	_updateDatapoint(id, event) {
		// TODO optimize
		this.initMeshes();
	}
}

export class BallChart extends AggregateEmbedding {
	constructor(attr, scene, dataset, options) {
		options = assign({
			groupBy: AggregateEmbedding.IndividualGrouping,
			aggregate: AggregateEmbedding.Aggregates.identity,
			baseSize: 1.0
		}, options);
		super(attr, scene, dataset, options);
	}

	createMeshes_(aggValues) {
		let scale = chroma.scale(['green', 'white', 'red']);
		let total = sum(aggValues);
		let accum = 0;
		map(aggValues, (aggValue, i) => {
			// Compute the sphere slice parameters
			let start = accum / total;
			let end = (accum + aggValue) / total;
			accum += aggValue;
			let phiStart = start * 2 * Math.PI;
			let phiLength = (end - start) * 2 * Math.PI;

			// Create the sphere slice
			let segments = Math.ceil(64 * (end - start))
			let geo = new THREE.SphereGeometry(this.options.baseSize, segments, 32, phiStart, phiLength);
			let mat = new THREE.MeshStandardMaterial({
				color: scale(start).hex(),
				emissive: scale(start).hex(),
				roughness: 0.0,
				metalness: 0.5,
				emissive: this.options.emissive
			});
			let mesh = new THREE.Mesh(geo, mat);
			this.obj3D.add(mesh);
			this.meshes.push(mesh);
		})
	}
}

export class Histogram extends AggregateEmbedding {
	constructor(attr, scene, dataset, options) {
		options = assign({
			color: 0x888888,
			emissive: 0x222222,
			layout: {
				shape: 'cylinder',
				thetaCenter: 0,
				thetaWidth: 2 * Math.PI,
				phiCenter: 0,
				phiWidth: 0,
				align: 'bottom'
			},
			baseSize: 1
		}, options)
		super(attr, scene, dataset, options);
	}

	createMeshes_(aggValues) {
		let sortedValues = sortBy(aggValues, (x) => -1 * x)
		map(sortedValues, (val, i) => {
			// if (i > 10) return
			let mesh = this.createMesh_(val, this.options.layout)
			this.layoutMesh_(mesh)
			this.obj3D.add(mesh)
			this.meshes.push(mesh)
		})
	}

	createMesh_(val, layout) {
		let geo;
		let mat = new THREE.MeshStandardMaterial({ emissive: this.options.emissive, color: this.options.color });
		switch(layout.shape) {
			case 'box':
				break;
			case 'sphere':
				break;
			case 'cylinder':
				// choose a random height/radius ratio, and solve for 
				// height and radius values under fixed volume
				let a = randomRange(0.5, 2) // a = h / (2*r)
				let r = Math.cbrt(val / (2 * Math.PI * a)) * this.options.baseSize
				let h = 2 * a * r 
				geo = new THREE.CylinderGeometry(r, r, h, 32)
				geo.computeBoundingBox();
				break;
		}
		let mesh = new THREE.Mesh(geo, mat)
		return mesh
	}

	layoutMesh_(mesh) {
		let yOffset;
		switch (this.options.layout.align) {
			case 'center':
				yOffset = 0;
				break
			case 'bottom':
				yOffset = mesh.geometry.boundingBox.getSize().y / 2;
				break
			case 'top':
				yOffset = -1 * mesh.geometry.boundingBox.getSize().y / 2;
				break
		}
		let theta = randomRange(this.options.layout.thetaCenter - this.options.layout.thetaWidth / 2,
			this.options.layout.thetaCenter + this.options.layout.thetaWidth / 2)
		// TODO phi

		this.setMeshPosition_(mesh, theta, yOffset)
	}

	setMeshPosition_(mesh, theta, yOffset) {
		// TODO solve directly using known mesh geometries and angle of attack?

		if (this.meshes.length == 0) {
			// first one doesn't get moved
			mesh.position.set(0, yOffset, 0)
			return
		}

		let lo = 0 // highest known unsafe 
		let hi = 1000 // lowest known safe
		let next = 500
		let count = 0
		while (true) {
			// console.log(next);
			if (count > 500)
				break
			count += 1
			let R = next
			let x = R * Math.cos(theta)
			let z = R * Math.sin(theta)
			mesh.position.set(x, yOffset, z)
			mesh.geometry.computeBoundingBox()
			let collision = false
			let thisBox = mesh.geometry.boundingBox.clone()
			thisBox.translate(mesh.position)
			for (let existingMesh of this.meshes) {
				let thatBox = existingMesh.geometry.boundingBox.clone()
				thatBox.translate(existingMesh.position)
				if (thisBox.intersectsBox(thatBox)) {
					collision = true
					break
				}
			}
			if (collision) {
				// move farther
				lo = next
			} else {
				// move closer
				if (hi - lo < .0001) // done
					break
				hi = next
			}
			next = lo + .9 * (hi - lo)
			// console.log(next)
		}
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