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
<dt><a href="#ScatterEmbedding">ScatterEmbedding</a></dt>
<dd><p>An embedding in which each datapoint is rendered as a vertex in a THREE.Points object.</p>
</dd>
<dt><a href="#PathEmbedding">PathEmbedding</a></dt>
<dd><p>A {MeshEmbedding} in which each {Datapoint} is rendered as a Mesh that follows a
path defined by waypoints.</p>
</dd>
<dt><a href="#AggregateEmbedding">AggregateEmbedding</a></dt>
<dd><p>An embedding that represents an aggregation of a dataset, including many operations
from traditional data analytics.</p>
</dd>
<dt><a href="#AggregateEmbedding">AggregateEmbedding</a></dt>
<dd></dd>
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
<dt><a href="#categoricalMap">categoricalMap()</a></dt>
<dd><p>Return a function that defines a mapping from values for an attribute to target values.
Can be used, for example, to map from attribute values to colors.</p>
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
        * [.getDatapoints(filter)](#Dataset+getDatapoints)
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

<a name="Dataset+getDatapoints"></a>

### dataset.getDatapoints(filter)
Returns the datapoints in the dataset, in id order. This is live data, and should not be modified

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| filter | An optional filter function |

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
        * [.getDatapoints(filter)](#Dataset+getDatapoints)
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

<a name="Dataset+getDatapoints"></a>

### dataset.getDatapoints(filter)
Returns the datapoints in the dataset, in id order. This is live data, and should not be modified

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  

| Param | Description |
| --- | --- |
| filter | An optional filter function |

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
    * [._map()](#Embedding+_map)
    * [._mapAttr()](#Embedding+_mapAttr)
    * *[.embed()](#Embedding+embed)*

<a name="new_Embedding_new"></a>

### new Embedding(scene, dataset, [options])
Embedding base constructor.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.position.x] | <code>Number</code> | <code>0</code> | x position of the embedding |
| [options.position.y] | <code>Number</code> | <code>0</code> | y position of the embedding |
| [options.position.z] | <code>Number</code> | <code>0</code> | z position of the embedding |
| [options.rotation.x] | <code>Number</code> | <code>0</code> | x rotation of the embedding |
| [options.rotation.y] | <code>Number</code> | <code>0</code> | y rotation of the embedding |
| [options.rotation.z] | <code>Number</code> | <code>0</code> | z rotation of the embedding |
| [options.scale.x] | <code>Number</code> | <code>1</code> | x scale of the embedding |
| [options.scale.y] | <code>Number</code> | <code>1</code> | y scale of the embedding |
| [options.scale.z] | <code>Number</code> | <code>1</code> | z scale of the embedding |

<a name="Embedding+_map"></a>

### embedding._map()
Translates from a source property of a datapoint to a target property of an embedding
element.

**Kind**: instance method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding+_mapAttr"></a>

### embedding._mapAttr()
Translates from a source property of a datapoint to a target property of an embedding
element.

**Kind**: instance method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding+embed"></a>

### *embedding.embed()*
Render the embedding - must be implemented by each concrete subclass.

**Kind**: instance abstract method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding"></a>

## Embedding
**Kind**: global class  

* [Embedding](#Embedding)
    * [new Embedding(scene, dataset, [options])](#new_Embedding_new)
    * [._map()](#Embedding+_map)
    * [._mapAttr()](#Embedding+_mapAttr)
    * *[.embed()](#Embedding+embed)*

<a name="new_Embedding_new"></a>

### new Embedding(scene, dataset, [options])
Embedding base constructor.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.position.x] | <code>Number</code> | <code>0</code> | x position of the embedding |
| [options.position.y] | <code>Number</code> | <code>0</code> | y position of the embedding |
| [options.position.z] | <code>Number</code> | <code>0</code> | z position of the embedding |
| [options.rotation.x] | <code>Number</code> | <code>0</code> | x rotation of the embedding |
| [options.rotation.y] | <code>Number</code> | <code>0</code> | y rotation of the embedding |
| [options.rotation.z] | <code>Number</code> | <code>0</code> | z rotation of the embedding |
| [options.scale.x] | <code>Number</code> | <code>1</code> | x scale of the embedding |
| [options.scale.y] | <code>Number</code> | <code>1</code> | y scale of the embedding |
| [options.scale.z] | <code>Number</code> | <code>1</code> | z scale of the embedding |

<a name="Embedding+_map"></a>

### embedding._map()
Translates from a source property of a datapoint to a target property of an embedding
element.

**Kind**: instance method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding+_mapAttr"></a>

### embedding._mapAttr()
Translates from a source property of a datapoint to a target property of an embedding
element.

**Kind**: instance method of <code>[Embedding](#Embedding)</code>  
<a name="Embedding+embed"></a>

### *embedding.embed()*
Render the embedding - must be implemented by each concrete subclass.

**Kind**: instance abstract method of <code>[Embedding](#Embedding)</code>  
<a name="MeshEmbedding"></a>

## MeshEmbedding
Base class for embeddings that render Datapoints as individual meshes

**Kind**: global class  
<a name="MeshEmbedding+createObjectForDatapoint"></a>

### meshEmbedding.createObjectForDatapoint()
A default Object3D creator; this can be overriden by subclasses

**Kind**: instance method of <code>[MeshEmbedding](#MeshEmbedding)</code>  
<a name="PointsEmbedding"></a>

## PointsEmbedding
Base class for embedding backed by a Points object (i.e., particle clouds)

**Kind**: global class  
<a name="ScatterEmbedding"></a>

## ScatterEmbedding
An embedding in which each datapoint is rendered as a vertex in a THREE.Points object.

**Kind**: global class  
<a name="PathEmbedding"></a>

## PathEmbedding
A {MeshEmbedding} in which each {Datapoint} is rendered as a Mesh that follows a
path defined by waypoints.

**Kind**: global class  
<a name="AggregateEmbedding"></a>

## AggregateEmbedding
An embedding that represents an aggregation of a dataset, including many operations
from traditional data analytics.

**Kind**: global class  
<a name="new_AggregateEmbedding_new"></a>

### new AggregateEmbedding(attr, scene, dataset, [options])
Create a new AggregateEmbedding.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| attr | <code>string</code> |  | The attribute which is being aggregated |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.filter] | <code>function</code> | <code>identity</code> | A filter to apply to the Dataset before         applying the aggregator. Default is to keep all datapoints in the Dataset |
| [options.groupBy] | <code>function</code> | <code>AggregateEmbedding.CollapsedGrouping</code> | A function         by whose output the Dataset will be grouped before applyting the aggregator.  	          Default is to place all datapoints into a single group. |
| [options.aggregate] | <code>function</code> | <code>AggregateEmbedding.Aggregates.mean</code> | The function by 	          which to aggregate the dataset attribute |

<a name="AggregateEmbedding"></a>

## AggregateEmbedding
**Kind**: global class  
<a name="new_AggregateEmbedding_new"></a>

### new AggregateEmbedding(attr, scene, dataset, [options])
Create a new AggregateEmbedding.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| attr | <code>string</code> |  | The attribute which is being aggregated |
| scene |  |  | The scene to which the embedding belongs |
| dataset | <code>[Dataset](#Dataset)</code> |  | The dataset that backs the embedding |
| [options] | <code>Object</code> | <code>{}</code> | Options describing the embedding's location and scale |
| [options.filter] | <code>function</code> | <code>identity</code> | A filter to apply to the Dataset before         applying the aggregator. Default is to keep all datapoints in the Dataset |
| [options.groupBy] | <code>function</code> | <code>AggregateEmbedding.CollapsedGrouping</code> | A function         by whose output the Dataset will be grouped before applyting the aggregator.  	          Default is to place all datapoints into a single group. |
| [options.aggregate] | <code>function</code> | <code>AggregateEmbedding.Aggregates.mean</code> | The function by 	          which to aggregate the dataset attribute |

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

<a name="categoricalMap"></a>

## categoricalMap()
Return a function that defines a mapping from values for an attribute to target values.
Can be used, for example, to map from attribute values to colors.

**Kind**: global function  
<a name="CSVDatasetCallback"></a>

## CSVDatasetCallback : <code>function</code>
A callback that is triggered after the dataset is loaded; typically used to create
an embedding based on the dataset.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| dataset | <code>[Dataset](#Dataset)</code> | The Dataset loaded from the csv file |

