## Classes

<dl>
<dt><a href="#Dataset">Dataset</a></dt>
<dd><p>Base Dataset class</p>
</dd>
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

<a name="Dataset"></a>

## Dataset
Base Dataset class

**Kind**: global class  

* [Dataset](#Dataset)
    * [.add()](#Dataset+add)
    * [.remove()](#Dataset+remove)
    * [.update()](#Dataset+update)

<a name="Dataset+add"></a>

### dataset.add()
Add a datapoint to the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  
<a name="Dataset+remove"></a>

### dataset.remove()
Remove a datapoint from the Dataset

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  
<a name="Dataset+update"></a>

### dataset.update()
Modify the value of a datapoint attribute

**Kind**: instance method of <code>[Dataset](#Dataset)</code>  
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
