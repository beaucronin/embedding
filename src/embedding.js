import assign from 'object-assign';
import TWEEN from 'tween.js';

export class Embedding {
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
export class MeshEmbedding extends Embedding {
	constructor(scene, dataset, options={}) {
		super(scene, dataset, options);
	}
}

export class RandomEmbedding extends MeshEmbedding {
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

export class PathEmbedding extends Embedding {
	constructor(scene, dataset, waypoints, options) {
		options = assign({
			meshSizeX: .2,
			meshSizeY: .2,
			meshSizeZ: .2,
			description: '',
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
		mat = new THREE.MeshStandardMaterial( {
					color: 0xff00ff,
					emissive: 0x072534,
					side: THREE.DoubleSide,
					shading: THREE.FlatShading
				} );
		var mesh = new THREE.Mesh(geo,mat);
		mesh.userData.description = this.getOpt("description", dp);
		this.dpMap[id] = mesh;
		this.obj3D.add(mesh);
		THREE.input.add(mesh);

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