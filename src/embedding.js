var assign = require('object-assign');

class Embedding {
	constructor(scene, dataset, options = {}) {
		this.dataset = dataset;
		this.obj3D = new THREE.Object3D();
		scene.add(this.obj3D);
		this.initialized = false;
	}

	embed() {
		// not implemented here
	}
}

class RandomEmbedding extends Embedding {
	constructor(scene, dataset, options) {
		super(scene, dataset);
		this.spread = 1.0;
	}

	embed() {
		if (! this.initialized) {
			// need to process all the datapoints in the Dataset
			for (let id in this.dataset.datapoints) {
				let dp  = this.dataset.datapoints[id];
				this.createMeshForDatapoint(dp);
			}
			this.initialized = true;
		} else {
			// just process the added datapoints
		}
	}

	createMeshForDatapoint(dp) {
		var pos = new THREE.Vector3(normal()*this.spread, normal()*this.spread, normal()*this.spread);
		var geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		var mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
		var mesh = new THREE.Mesh(geo, mat);
		mesh.position.copy(pos);
		this.obj3D.add(mesh);
	}
}