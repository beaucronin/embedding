## Classes

<dl>
<dt><a href="#Dataset">Dataset</a></dt>
<dd><p>Base Dataset class</p>
</dd>
<dt><a href="#Dataset">Dataset</a></dt>
<dd></dd>
<dt><a href="#WebSocketDataset">WebSocketDataset</a></dt>
<dd><p>A Dataset whose datapoints are received from a websocket.</p>
</dd>
<dt><a href="#Embedding">Embedding</a></dt>
<dd><p>Base class for all embeddings.</p>
</dd>
<dt><a href="#Embedding">Embedding</a></dt>
<dd></dd>
<dt><a href="#MeshEmbedding">MeshEmbedding</a></dt>
<dd><p>Base class for embeddings that render Datapoints as individual meshes</p>
</dd>
<dt><a href="#PointsEmbedding">PointsEmbedding</a></dt>
<dd><p>Base class for embedding backed by a Points object (i.e., particle clouds)</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#initScene">initScene()</a></dt>
<dd><p>Convenience function to create a responsive THREE scene and related objects. Returns a number 
of objects that should probably be kept around by the enclosing script.</p>
</dd>
<dt><a href="#animate">animate()</a></dt>
<dd><p>The core animation call that is executed for each frame. Updates all registered
embeddings, the pointer controls, and the camera position. Renders the scene
using the WebVRManager, which applies the VREffect if in VR mode.</p>
</dd>
<dt><a href="#register">register(embedding)</a></dt>
<dd><p>Register an embedding so that it will be updated on each animation frame.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#CSVDatasetCallback">CSVDatasetCallback</a> : <code>function</code></dt>
<dd><p>A callback that is triggered after the dataset is loaded; typically used to create
an embedding based on the dataset.</p>
</dd>
</dl>

<a name="Dataset"></a>

## Dataset
Base Dataset class

**Kind**: global class  

* [Dataset](#Dataset)
    * _instance_
        * [.add(datapoint)](#Dataset+add)
        * [.remove(id)](#Dataset+remove)
        * [.update(id, k)](#Dataset+update)
    * _static_
        * [.createFromCSV(url, callback)](#Dataset.createFromCSV)

<a name="Dataset+add"></a>

### dataset.add(datapoint)
Add a datapoint to the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Type |
| --- | --- |
| datapoint | <code>Datapoint</code> | 

<a name="Dataset+remove"></a>

### dataset.remove(id)
Remove a datapoint from the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| id | The id of the datapoint to remove |

<a name="Dataset+update"></a>

### dataset.update(id, k)
Modify the value of a datapoint attribute

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| id | The id of the datapoint to modify |
| k | The key whose value to modify 	 @ @param v - The new value |

<a name="Dataset.createFromCSV"></a>

### Dataset.createFromCSV(url, callback)
Create a {Dataset} from a csv file that can be found at the given url

**Kind**: static method of <code>[Dataset](#Dataset)</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | The url where the csv file can be found |
| callback | <code>[CSVDatasetCallback](#CSVDatasetCallback)</code> |  |

<a name="Dataset"></a>

## Dataset
**Kind**: global class  

* [Dataset](#Dataset)
    * _instance_
        * [.add(datapoint)](#Dataset+add)
        * [.remove(id)](#Dataset+remove)
        * [.update(id, k)](#Dataset+update)
    * _static_
        * [.createFromCSV(url, callback)](#Dataset.createFromCSV)

<a name="Dataset+add"></a>

### dataset.add(datapoint)
Add a datapoint to the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Type |
| --- | --- |
| datapoint | <code>Datapoint</code> | 

<a name="Dataset+remove"></a>

### dataset.remove(id)
Remove a datapoint from the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| id | The id of the datapoint to remove |

<a name="Dataset+update"></a>

### dataset.update(id, k)
Modify the value of a datapoint attribute

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| id | The id of the datapoint to modify |
| k | The key whose value to modify 	 @ @param v - The new value |

<a name="Dataset.createFromCSV"></a>

### Dataset.createFromCSV(url, callback)
Create a {Dataset} from a csv file that can be found at the given url

**Kind**: static method of <code>[Dataset](#Dataset)</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | The url where the csv file can be found |
| callback | <code>[CSVDatasetCallback](#CSVDatasetCallback)</code> |  |

<a name="WebSocketDataset"></a>

## WebSocketDataset
A Dataset whose datapoints are received from a websocket.

**Kind**: global class  
<a name="Embedding"></a>

## Embedding
Base class for all embeddings.

**Kind**: global class  

* [Embedding](#Embedding)
    * [new Embedding(scene, dataset, [options])](#new_Embedding_new)
    * *[.embed()](#Embedding+embed)*

<a name="new_Embedding_new"></a>

### new Embedding(scene, dataset, [options])
Embedding base constructor.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.x] | <code>Number</code> | <code>0</code> | x position of the embedding |
| [options.y] | <code>Number</code> | <code>0</code> | y position of the embedding |
| [options.z] | <code>Number</code> | <code>0</code> | z position of the embedding |
| [options.rx] | <code>Number</code> | <code>0</code> | x rotation of the embedding |
| [options.ry] | <code>Number</code> | <code>0</code> | y rotation of the embedding |
| [options.rz] | <code>Number</code> | <code>0</code> | z rotation of the embedding |
| [options.sx] | <code>Number</code> | <code>1</code> | x scale of the embedding |
| [options.sy] | <code>Number</code> | <code>1</code> | y scale of the embedding |
| [options.sz] | <code>Number</code> | <code>1</code> | z scale of the embedding |

<a name="Embedding+embed"></a>

### *embedding.embed()*
Render the embedding - must be implemented by each concrete subclass.

**Kind**: instance abstract method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding"></a>

## Embedding
**Kind**: global class  

* [Embedding](#Embedding)
    * [new Embedding(scene, dataset, [options])](#new_Embedding_new)
    * *[.embed()](#Embedding+embed)*

<a name="new_Embedding_new"></a>

### new Embedding(scene, dataset, [options])
Embedding base constructor.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.x] | <code>Number</code> | <code>0</code> | x position of the embedding |
| [options.y] | <code>Number</code> | <code>0</code> | y position of the embedding |
| [options.z] | <code>Number</code> | <code>0</code> | z position of the embedding |
| [options.rx] | <code>Number</code> | <code>0</code> | x rotation of the embedding |
| [options.ry] | <code>Number</code> | <code>0</code> | y rotation of the embedding |
| [options.rz] | <code>Number</code> | <code>0</code> | z rotation of the embedding |
| [options.sx] | <code>Number</code> | <code>1</code> | x scale of the embedding |
| [options.sy] | <code>Number</code> | <code>1</code> | y scale of the embedding |
| [options.sz] | <code>Number</code> | <code>1</code> | z scale of the embedding |

<a name="Embedding+embed"></a>

### *embedding.embed()*
Render the embedding - must be implemented by each concrete subclass.

**Kind**: instance abstract method of <code>[Embedding](#Embedding)</code>  
<a name="MeshEmbedding"></a>

## MeshEmbedding
Base class for embeddings that render Datapoints as individual meshes

**Kind**: global class  
<a name="PointsEmbedding"></a>

## PointsEmbedding
Base class for embedding backed by a Points object (i.e., particle clouds)

**Kind**: global class  
<a name="initScene"></a>

## initScene()
Convenience function to create a responsive THREE scene and related objects. Returns a number 
of objects that should probably be kept around by the enclosing script.

**Kind**: global function  
<a name="animate"></a>

## animate()
The core animation call that is executed for each frame. Updates all registered
embeddings, the pointer controls, and the camera position. Renders the scene
using the WebVRManager, which applies the VREffect if in VR mode.

**Kind**: global function  
<a name="register"></a>

## register(embedding)
Register an embedding so that it will be updated on each animation frame.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| embedding | <code>[Embedding](#Embedding)</code> | The embedding |

<a name="CSVDatasetCallback"></a>

## CSVDatasetCallback : <code>function</code>
A callback that is triggered after the dataset is loaded; typically used to create
an embedding based on the dataset.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| dataset | <code>[Dataset](#Dataset)</code> | The Dataset loaded from the csv file |

