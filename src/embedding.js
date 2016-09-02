var assign = require('object-assign');
var TWEEN = require('tween.js');

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
		this.options = options;
		this.obj3D.position.set(options.x, options.y, options.z);
		this.obj3D.rotation.set(options.rx, options.ry, options.rz);
		this.obj3D.scale.set(options.sx, options.sy, options.sz);
	}

	embed() {
		// not implemented here
	}

	notify(event) {
		this.events.push(event);
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

	get spread() { return this.options.spread; }

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

		let sprite = new THREE.TextureLoader().load("/static/sprites/"+this.options.pointType+".png");
		let materialProps = {
			size: this.options.pointSize,
			sizeAttenuation: true,
			map: sprite,
			color: this.options.pointColor,
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
			}, options);
		super(scene, dataset, options)
		
		// mapping from datapoint ids to vertex indices
		this.dpMap = {}

		// unallocated vertices 
		this.freeVertices = [];
		
		// initialize vertices and mark them as unallocated
		for (let i = 0; i < this.options.bufferSize; i++) {
			this.points.geometry.vertices.push(
				new THREE.Vector3(-1000000, -1000000, -1000000));
			this.freeVertices.push(i);
		}

		this.tweens = {};
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
				dp.values.x, dp.values.y, dp.values.z);
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
			let end = { x: dp.values.x, y: dp.values.y, z: dp.values.z };
			let d = (new THREE.Vector3(start.x, start.y, start.z))
				.sub(new THREE.Vector3(end.x, end.y, end.z))
				.length();
			let t = 1000 * d / this.options.moveSpeed;
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
				.onComplete(function() {
					delete obj.tweens[vi];
				})
				.onStop(function() {
					delete obj.tweens[vi];
				})
				.easing(TWEEN.Easing.Exponential.InOut)
				.start();
			this.tweens[vi] = tween;
		}
	}
}