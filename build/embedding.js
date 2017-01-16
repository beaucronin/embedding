(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EMBED = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        return setTimeout(fun, 0);
    } else {
        return cachedSetTimeout.call(null, fun, 0);
    }
}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        clearTimeout(marker);
    } else {
        cachedClearTimeout.call(null, marker);
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

},{}],2:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"object-assign":3,"strict-uri-encode":6}],6:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var HEAD_ELBOW_OFFSET = new THREE.Vector3(0.155, -0.465, -0.15);
var ELBOW_WRIST_OFFSET = new THREE.Vector3(0, 0, -0.25);
var WRIST_CONTROLLER_OFFSET = new THREE.Vector3(0, 0, 0.05);
var ARM_EXTENSION_OFFSET = new THREE.Vector3(-0.08, 0.14, 0.08);

var ELBOW_BEND_RATIO = 0.4; // 40% elbow, 60% wrist.
var EXTENSION_RATIO_WEIGHT = 0.4;

var MIN_ANGULAR_SPEED = 0.61; // 35 degrees per second (in radians).

/**
 * Represents the arm model for the Daydream controller. Feed it a camera and
 * the controller. Update it on a RAF.
 *
 * Get the model's pose using getPose().
 */

var OrientationArmModel = function () {
  function OrientationArmModel() {
    _classCallCheck(this, OrientationArmModel);

    this.isLeftHanded = false;

    // Current and previous controller orientations.
    this.controllerQ = new THREE.Quaternion();
    this.lastControllerQ = new THREE.Quaternion();

    // Current and previous head orientations.
    this.headQ = new THREE.Quaternion();

    // Current head position.
    this.headPos = new THREE.Vector3();

    // Positions of other joints (mostly for debugging).
    this.elbowPos = new THREE.Vector3();
    this.wristPos = new THREE.Vector3();

    // Current and previous times the model was updated.
    this.time = null;
    this.lastTime = null;

    // Root rotation.
    this.rootQ = new THREE.Quaternion();

    // Current pose that this arm model calculates.
    this.pose = {
      orientation: new THREE.Quaternion(),
      position: new THREE.Vector3()
    };
  }

  /**
   * Methods to set controller and head pose (in world coordinates).
   */


  _createClass(OrientationArmModel, [{
    key: 'setControllerOrientation',
    value: function setControllerOrientation(quaternion) {
      this.lastControllerQ.copy(this.controllerQ);
      this.controllerQ.copy(quaternion);
    }
  }, {
    key: 'setHeadOrientation',
    value: function setHeadOrientation(quaternion) {
      this.headQ.copy(quaternion);
    }
  }, {
    key: 'setHeadPosition',
    value: function setHeadPosition(position) {
      this.headPos.copy(position);
    }
  }, {
    key: 'setLeftHanded',
    value: function setLeftHanded(isLeftHanded) {
      // TODO(smus): Implement me!
      this.isLeftHanded = isLeftHanded;
    }

    /**
     * Called on a RAF.
     */

  }, {
    key: 'update',
    value: function update() {
      this.time = performance.now();

      // If the controller's angular velocity is above a certain amount, we can
      // assume torso rotation and move the elbow joint relative to the
      // camera orientation.
      var headYawQ = this.getHeadYawOrientation_();
      var timeDelta = (this.time - this.lastTime) / 1000;
      var angleDelta = this.quatAngle_(this.lastControllerQ, this.controllerQ);
      var controllerAngularSpeed = angleDelta / timeDelta;
      if (controllerAngularSpeed > MIN_ANGULAR_SPEED) {
        // Attenuate the Root rotation slightly.
        this.rootQ.slerp(headYawQ, angleDelta / 10);
      } else {
        this.rootQ.copy(headYawQ);
      }

      // We want to move the elbow up and to the center as the user points the
      // controller upwards, so that they can easily see the controller and its
      // tool tips.
      var controllerEuler = new THREE.Euler().setFromQuaternion(this.controllerQ, 'YXZ');
      var controllerXDeg = THREE.Math.radToDeg(controllerEuler.x);
      var extensionRatio = this.clamp_((controllerXDeg - 11) / (50 - 11), 0, 1);

      // Controller orientation in camera space.
      var controllerCameraQ = this.rootQ.clone().inverse();
      controllerCameraQ.multiply(this.controllerQ);

      // Calculate elbow position.
      var elbowPos = this.elbowPos;
      elbowPos.copy(this.headPos).add(HEAD_ELBOW_OFFSET);
      var elbowOffset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
      elbowOffset.multiplyScalar(extensionRatio);
      elbowPos.add(elbowOffset);

      // Calculate joint angles. Generally 40% of rotation applied to elbow, 60%
      // to wrist, but if controller is raised higher, more rotation comes from
      // the wrist.
      var totalAngle = this.quatAngle_(controllerCameraQ, new THREE.Quaternion());
      var totalAngleDeg = THREE.Math.radToDeg(totalAngle);
      var lerpSuppression = 1 - Math.pow(totalAngleDeg / 180, 4); // TODO(smus): ???

      var elbowRatio = ELBOW_BEND_RATIO;
      var wristRatio = 1 - ELBOW_BEND_RATIO;
      var lerpValue = lerpSuppression * (elbowRatio + wristRatio * extensionRatio * EXTENSION_RATIO_WEIGHT);

      var wristQ = new THREE.Quaternion().slerp(controllerCameraQ, lerpValue);
      var invWristQ = wristQ.inverse();
      var elbowQ = controllerCameraQ.clone().multiply(invWristQ);

      // Calculate our final controller position based on all our joint rotations
      // and lengths.
      /*
      position_ =
        root_rot_ * (
          controller_root_offset_ +
      2:      (arm_extension_ * amt_extension) +
      1:      elbow_rot * (kControllerForearm + (wrist_rot * kControllerPosition))
        );
      */
      var wristPos = this.wristPos;
      wristPos.copy(WRIST_CONTROLLER_OFFSET);
      wristPos.applyQuaternion(wristQ);
      wristPos.add(ELBOW_WRIST_OFFSET);
      wristPos.applyQuaternion(elbowQ);
      wristPos.add(this.elbowPos);

      var offset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
      offset.multiplyScalar(extensionRatio);

      var position = new THREE.Vector3().copy(this.wristPos);
      position.add(offset);
      position.applyQuaternion(this.rootQ);

      var orientation = new THREE.Quaternion().copy(this.controllerQ);

      // Set the resulting pose orientation and position.
      this.pose.orientation.copy(orientation);
      this.pose.position.copy(position);

      this.lastTime = this.time;
    }

    /**
     * Returns the pose calculated by the model.
     */

  }, {
    key: 'getPose',
    value: function getPose() {
      return this.pose;
    }

    /**
     * Debug methods for rendering the arm model.
     */

  }, {
    key: 'getForearmLength',
    value: function getForearmLength() {
      return ELBOW_WRIST_OFFSET.length();
    }
  }, {
    key: 'getElbowPosition',
    value: function getElbowPosition() {
      var out = this.elbowPos.clone();
      return out.applyQuaternion(this.rootQ);
    }
  }, {
    key: 'getWristPosition',
    value: function getWristPosition() {
      var out = this.wristPos.clone();
      return out.applyQuaternion(this.rootQ);
    }
  }, {
    key: 'getHeadYawOrientation_',
    value: function getHeadYawOrientation_() {
      var headEuler = new THREE.Euler().setFromQuaternion(this.headQ, 'YXZ');
      headEuler.x = 0;
      headEuler.z = 0;
      var destinationQ = new THREE.Quaternion().setFromEuler(headEuler);
      return destinationQ;
    }
  }, {
    key: 'clamp_',
    value: function clamp_(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  }, {
    key: 'quatAngle_',
    value: function quatAngle_(q1, q2) {
      var vec1 = new THREE.Vector3(0, 0, -1);
      var vec2 = new THREE.Vector3(0, 0, -1);
      vec1.applyQuaternion(q1);
      vec2.applyQuaternion(q2);
      return vec1.angleTo(vec2);
    }
  }]);

  return OrientationArmModel;
}();

exports.default = OrientationArmModel;

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _rayInteractionModes = require('./ray-interaction-modes');

var _rayInteractionModes2 = _interopRequireDefault(_rayInteractionModes);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

var DRAG_DISTANCE_PX = 10;

/**
 * Enumerates all possible interaction modes. Sets up all event handlers (mouse,
 * touch, etc), interfaces with gamepad API.
 *
 * Emits events:
 *    action: Input is activated (mousedown, touchstart, daydream click, vive
 *    trigger).
 *    release: Input is deactivated (mouseup, touchend, daydream release, vive
 *    release).
 *    cancel: Input is canceled (eg. we scrolled instead of tapping on
 *    mobile/desktop).
 *    pointermove(2D position): The pointer is moved (mouse or touch).
 */

var RayController = function (_EventEmitter) {
  _inherits(RayController, _EventEmitter);

  function RayController(renderer) {
    _classCallCheck(this, RayController);

    var _this = _possibleConstructorReturn(this, (RayController.__proto__ || Object.getPrototypeOf(RayController)).call(this));

    _this.renderer = renderer;

    _this.availableInteractions = {};

    // Handle interactions.
    window.addEventListener('mousedown', _this.onMouseDown_.bind(_this));
    window.addEventListener('mousemove', _this.onMouseMove_.bind(_this));
    window.addEventListener('mouseup', _this.onMouseUp_.bind(_this));
    window.addEventListener('touchstart', _this.onTouchStart_.bind(_this));
    window.addEventListener('touchmove', _this.onTouchMove_.bind(_this));
    window.addEventListener('touchend', _this.onTouchEnd_.bind(_this));

    // The position of the pointer.
    _this.pointer = new THREE.Vector2();
    // The previous position of the pointer.
    _this.lastPointer = new THREE.Vector2();
    // Position of pointer in Normalized Device Coordinates (NDC).
    _this.pointerNdc = new THREE.Vector2();
    // How much we have dragged (if we are dragging).
    _this.dragDistance = 0;
    // Are we dragging or not.
    _this.isDragging = false;
    // Is pointer active or not.
    _this.isTouchActive = false;

    // Gamepad events.
    _this.gamepad = null;

    // VR Events.
    if (!navigator.getVRDisplays) {
      console.warn('WebVR API not available! Consider using the webvr-polyfill.');
    } else {
      navigator.getVRDisplays().then(function (displays) {
        _this.vrDisplay = displays[0];
      });
    }
    return _this;
  }

  _createClass(RayController, [{
    key: 'getInteractionMode',
    value: function getInteractionMode() {
      // TODO: Debugging only.
      //return InteractionModes.DAYDREAM;

      var gamepad = this.getVRGamepad_();

      if (gamepad) {
        var pose = gamepad.pose;
        // If there's a gamepad connected, determine if it's Daydream or a Vive.
        if (pose.hasPosition) {
          return _rayInteractionModes2.default.VR_6DOF;
        }

        if (pose.hasOrientation) {
          return _rayInteractionModes2.default.VR_3DOF;
        }
      } else {
        // If there's no gamepad, it might be Cardboard, magic window or desktop.
        if ((0, _util.isMobile)()) {
          // Either Cardboard or magic window, depending on whether we are
          // presenting.
          if (this.vrDisplay && this.vrDisplay.isPresenting) {
            return _rayInteractionModes2.default.VR_0DOF;
          } else {
            return _rayInteractionModes2.default.TOUCH;
          }
        } else {
          // We must be on desktop.
          return _rayInteractionModes2.default.MOUSE;
        }
      }
      // By default, use TOUCH.
      return _rayInteractionModes2.default.TOUCH;
    }
  }, {
    key: 'getGamepadPose',
    value: function getGamepadPose() {
      var gamepad = this.getVRGamepad_();
      return gamepad.pose;
    }

    /**
     * Get if there is an active touch event going on.
     * Only relevant on touch devices
     */

  }, {
    key: 'getIsTouchActive',
    value: function getIsTouchActive() {
      return this.isTouchActive;
    }
  }, {
    key: 'setSize',
    value: function setSize(size) {
      this.size = size;
    }
  }, {
    key: 'update',
    value: function update() {
      var mode = this.getInteractionMode();
      if (mode == _rayInteractionModes2.default.VR_3DOF || mode == _rayInteractionModes2.default.VR_6DOF) {
        // If we're dealing with a gamepad, check every animation frame for a
        // pressed action.
        var isGamepadPressed = this.getGamepadButtonPressed_();
        if (isGamepadPressed && !this.wasGamepadPressed) {
          this.emit('raydown');
        }
        if (!isGamepadPressed && this.wasGamepadPressed) {
          this.emit('rayup');
        }
        this.wasGamepadPressed = isGamepadPressed;
      }
    }
  }, {
    key: 'getGamepadButtonPressed_',
    value: function getGamepadButtonPressed_() {
      var gamepad = this.getVRGamepad_();
      if (!gamepad) {
        // If there's no gamepad, the button was not pressed.
        return false;
      }
      // Check for clicks.
      for (var j = 0; j < gamepad.buttons.length; ++j) {
        if (gamepad.buttons[j].pressed) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'onMouseDown_',
    value: function onMouseDown_(e) {
      this.startDragging_(e);
      this.emit('raydown');
    }
  }, {
    key: 'onMouseMove_',
    value: function onMouseMove_(e) {
      this.updatePointer_(e);
      this.updateDragDistance_();
      this.emit('pointermove', this.pointerNdc);
    }
  }, {
    key: 'onMouseUp_',
    value: function onMouseUp_(e) {
      this.endDragging_();
    }
  }, {
    key: 'onTouchStart_',
    value: function onTouchStart_(e) {
      this.isTouchActive = true;
      var t = e.touches[0];
      this.startDragging_(t);
      this.updateTouchPointer_(e);

      this.emit('pointermove', this.pointerNdc);
      this.emit('raydown');

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
    }
  }, {
    key: 'onTouchMove_',
    value: function onTouchMove_(e) {
      this.updateTouchPointer_(e);
      this.updateDragDistance_();

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
    }
  }, {
    key: 'onTouchEnd_',
    value: function onTouchEnd_(e) {
      this.endDragging_();

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
      this.isTouchActive = false;
    }
  }, {
    key: 'updateTouchPointer_',
    value: function updateTouchPointer_(e) {
      // If there's no touches array, ignore.
      if (e.touches.length === 0) {
        console.warn('Received touch event with no touches.');
        return;
      }
      var t = e.touches[0];
      this.updatePointer_(t);
    }
  }, {
    key: 'updatePointer_',
    value: function updatePointer_(e) {
      // How much the pointer moved.
      this.pointer.set(e.clientX, e.clientY);
      this.pointerNdc.x = e.clientX / this.size.width * 2 - 1;
      this.pointerNdc.y = -(e.clientY / this.size.height) * 2 + 1;
    }
  }, {
    key: 'updateDragDistance_',
    value: function updateDragDistance_() {
      if (this.isDragging) {
        var distance = this.lastPointer.sub(this.pointer).length();
        this.dragDistance += distance;
        this.lastPointer.copy(this.pointer);

        //console.log('dragDistance', this.dragDistance);
        if (this.dragDistance > DRAG_DISTANCE_PX) {
          this.emit('raycancel');
          this.isDragging = false;
        }
      }
    }
  }, {
    key: 'startDragging_',
    value: function startDragging_(e) {
      this.isDragging = true;
      this.lastPointer.set(e.clientX, e.clientY);
    }
  }, {
    key: 'endDragging_',
    value: function endDragging_() {
      if (this.dragDistance < DRAG_DISTANCE_PX) {
        this.emit('rayup');
      }
      this.dragDistance = 0;
      this.isDragging = false;
    }

    /**
     * Gets the first VR-enabled gamepad.
     */

  }, {
    key: 'getVRGamepad_',
    value: function getVRGamepad_() {
      // If there's no gamepad API, there's no gamepad.
      if (!navigator.getGamepads) {
        return null;
      }

      var gamepads = navigator.getGamepads();
      for (var i = 0; i < gamepads.length; ++i) {
        var gamepad = gamepads[i];

        // The array may contain undefined gamepads, so check for that as well as
        // a non-null pose.
        if (gamepad && gamepad.pose) {
          return gamepad;
        }
      }
      return null;
    }
  }]);

  return RayController;
}(_eventemitter2.default);

exports.default = RayController;

},{"./ray-interaction-modes":10,"./util":12,"eventemitter3":2}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _orientationArmModel = require('./orientation-arm-model');

var _orientationArmModel2 = _interopRequireDefault(_orientationArmModel);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _rayRenderer = require('./ray-renderer');

var _rayRenderer2 = _interopRequireDefault(_rayRenderer);

var _rayController = require('./ray-controller');

var _rayController2 = _interopRequireDefault(_rayController);

var _rayInteractionModes = require('./ray-interaction-modes');

var _rayInteractionModes2 = _interopRequireDefault(_rayInteractionModes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

/**
 * API wrapper for the input library.
 */
var RayInput = function (_EventEmitter) {
  _inherits(RayInput, _EventEmitter);

  function RayInput(camera) {
    _classCallCheck(this, RayInput);

    var _this = _possibleConstructorReturn(this, (RayInput.__proto__ || Object.getPrototypeOf(RayInput)).call(this));

    _this.camera = camera;
    _this.renderer = new _rayRenderer2.default(camera);
    _this.controller = new _rayController2.default();

    // Arm model needed to transform controller orientation into proper pose.
    _this.armModel = new _orientationArmModel2.default();

    _this.controller.on('raydown', _this.onRayDown_.bind(_this));
    _this.controller.on('rayup', _this.onRayUp_.bind(_this));
    _this.controller.on('raycancel', _this.onRayCancel_.bind(_this));
    _this.controller.on('pointermove', _this.onPointerMove_.bind(_this));
    _this.renderer.on('rayover', function (mesh) {
      _this.emit('rayover', mesh);
    });
    _this.renderer.on('rayout', function (mesh) {
      _this.emit('rayout', mesh);
    });

    // By default, put the pointer offscreen.
    _this.pointerNdc = new THREE.Vector2(1, 1);

    // Event handlers.
    _this.handlers = {};
    return _this;
  }

  _createClass(RayInput, [{
    key: 'add',
    value: function add(object, handlers) {
      this.renderer.add(object, handlers);
      this.handlers[object.id] = handlers;
    }
  }, {
    key: 'remove',
    value: function remove(object) {
      this.renderer.remove(object);
      delete this.handlers[object.id];
    }
  }, {
    key: 'update',
    value: function update() {
      var lookAt = new THREE.Vector3(0, 0, -1);
      lookAt.applyQuaternion(this.camera.quaternion);

      var mode = this.controller.getInteractionMode();
      switch (mode) {
        case _rayInteractionModes2.default.MOUSE:
          // Desktop mouse mode, mouse coordinates are what matters.
          this.renderer.setPointer(this.pointerNdc);
          // Hide the ray and reticle.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(false);

          // In mouse mode ray renderer is always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.TOUCH:
          // Mobile magic window mode. Touch coordinates matter, but we want to
          // hide the reticle.
          this.renderer.setPointer(this.pointerNdc);

          // Hide the ray and the reticle.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(false);

          // In touch mode the ray renderer is only active on touch.
          this.renderer.setActive(this.controller.getIsTouchActive());
          break;

        case _rayInteractionModes2.default.VR_0DOF:
          // Cardboard mode, we're dealing with a gaze reticle.
          this.renderer.setPosition(this.camera.position);
          this.renderer.setOrientation(this.camera.quaternion);

          // Reticle only.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.VR_3DOF:
          // Daydream, our origin is slightly off (depending on handedness).
          // But we should be using the orientation from the gamepad.
          // TODO(smus): Implement the real arm model.
          var pose = this.controller.getGamepadPose();

          // Debug only: use camera as input controller.
          //let controllerOrientation = this.camera.quaternion;
          var controllerOrientation = new THREE.Quaternion().fromArray(pose.orientation);

          // Transform the controller into the camera coordinate system.
          /*
          controllerOrientation.multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
          controllerOrientation.x *= -1;
          controllerOrientation.z *= -1;
          */

          // Feed camera and controller into the arm model.
          this.armModel.setHeadOrientation(this.camera.quaternion);
          this.armModel.setHeadPosition(this.camera.position);
          this.armModel.setControllerOrientation(controllerOrientation);
          this.armModel.update();

          // Get resulting pose and configure the renderer.
          var modelPose = this.armModel.getPose();
          this.renderer.setPosition(modelPose.position);
          //this.renderer.setPosition(new THREE.Vector3());
          this.renderer.setOrientation(modelPose.orientation);
          //this.renderer.setOrientation(controllerOrientation);

          // Show ray and reticle.
          this.renderer.setRayVisibility(true);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.VR_6DOF:
          // Vive, origin depends on the position of the controller.
          // TODO(smus)...
          var pose = this.controller.getGamepadPose();

          // Check that the pose is valid.
          if (!pose.orientation || !pose.position) {
            console.warn('Invalid gamepad pose. Can\'t update ray.');
            break;
          }
          var orientation = new THREE.Quaternion().fromArray(pose.orientation);
          var position = new THREE.Vector3().fromArray(pose.position);

          var composed = new THREE.Matrix4();
          var standingOrientation = new THREE.Quaternion();
          var standingPosition = new THREE.Vector3();
          var standingScale = new THREE.Vector();
          composed.makeRotationFromQuaternion(orientation);
          composed.setPosition(position);
          composed.premultiply(vrDisplay.stageParameters.sittingToStandingTransform);
          composed.decompose(standingPosition, standingOrientation, standingScale);

          this.renderer.setOrientation(standingOrientation);
          this.renderer.setPosition(standingPosition);

          // Show ray and reticle.
          this.renderer.setRayVisibility(true);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        default:
          console.error('Unknown interaction mode.');
      }
      this.renderer.update();
      this.controller.update();
    }
  }, {
    key: 'setSize',
    value: function setSize(size) {
      this.controller.setSize(size);
    }
  }, {
    key: 'getMesh',
    value: function getMesh() {
      return this.renderer.getReticleRayMesh();
    }
  }, {
    key: 'getOrigin',
    value: function getOrigin() {
      return this.renderer.getOrigin();
    }
  }, {
    key: 'getDirection',
    value: function getDirection() {
      return this.renderer.getDirection();
    }
  }, {
    key: 'getRightDirection',
    value: function getRightDirection() {
      var lookAt = new THREE.Vector3(0, 0, -1);
      lookAt.applyQuaternion(this.camera.quaternion);
      return new THREE.Vector3().crossVectors(lookAt, this.camera.up);
    }
  }, {
    key: 'onRayDown_',
    value: function onRayDown_(e) {
      //console.log('onRayDown_');

      // Force the renderer to raycast.
      this.renderer.update();
      var mesh = this.renderer.getSelectedMesh();
      this.emit('raydown', mesh);

      this.renderer.setActive(true);
    }
  }, {
    key: 'onRayUp_',
    value: function onRayUp_(e) {
      //console.log('onRayUp_');
      var mesh = this.renderer.getSelectedMesh();
      this.emit('rayup', mesh);

      this.renderer.setActive(false);
    }
  }, {
    key: 'onRayCancel_',
    value: function onRayCancel_(e) {
      //console.log('onRayCancel_');
      var mesh = this.renderer.getSelectedMesh();
      this.emit('raycancel', mesh);
    }
  }, {
    key: 'onPointerMove_',
    value: function onPointerMove_(ndc) {
      this.pointerNdc.copy(ndc);
    }
  }]);

  return RayInput;
}(_eventemitter2.default);

exports.default = RayInput;

},{"./orientation-arm-model":7,"./ray-controller":8,"./ray-interaction-modes":10,"./ray-renderer":11,"eventemitter3":2}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var InteractionModes = {
  MOUSE: 1,
  TOUCH: 2,
  VR_0DOF: 3,
  VR_3DOF: 4,
  VR_6DOF: 5
};

exports.default = InteractionModes;

},{}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('./util');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

var RETICLE_DISTANCE = 3;
var INNER_RADIUS = 0.02;
var OUTER_RADIUS = 0.04;
var RAY_RADIUS = 0.02;
var GRADIENT_IMAGE = (0, _util.base64)('image/png', 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABdklEQVR4nO3WwXHEQAwDQcin/FOWw+BjuiPYB2q4G2nP933P9SO4824zgDADiDOAuHfb3/UjuKMAcQYQZwBx/gBxChCnAHEKEKcAcQoQpwBxChCnAHEGEGcAcf4AcQoQZwBxBhBnAHEGEGcAcQYQZwBxBhBnAHEGEGcAcQYQZwBxBhBnAHHvtt/1I7ijAHEGEGcAcf4AcQoQZwBxTkCcAsQZQJwTEKcAcQoQpwBxBhDnBMQpQJwCxClAnALEKUCcAsQpQJwCxClAnALEKUCcAsQpQJwBxDkBcQoQpwBxChCnAHEKEKcAcQoQpwBxChCnAHEKEGcAcU5AnALEKUCcAsQZQJwTEKcAcQYQ5wTEKUCcAcQZQJw/QJwCxBlAnAHEGUCcAcQZQJwBxBlAnAHEGUCcAcQZQJwBxBlAnAHEGUDcu+25fgR3FCDOAOIMIM4fIE4B4hQgTgHiFCBOAeIUIE4B4hQgzgDiDCDOHyBOAeIMIM4A4v4B/5IF9eD6QxgAAAAASUVORK5CYII=');

/**
 * Handles ray input selection from frame of reference of an arbitrary object.
 *
 * The source of the ray is from various locations:
 *
 * Desktop: mouse.
 * Magic window: touch.
 * Cardboard: camera.
 * Daydream: 3DOF controller via gamepad (and show ray).
 * Vive: 6DOF controller via gamepad (and show ray).
 *
 * Emits selection events:
 *     rayover(mesh): This mesh was selected.
 *     rayout(mesh): This mesh was unselected.
 */

var RayRenderer = function (_EventEmitter) {
  _inherits(RayRenderer, _EventEmitter);

  function RayRenderer(camera, opt_params) {
    _classCallCheck(this, RayRenderer);

    var _this = _possibleConstructorReturn(this, (RayRenderer.__proto__ || Object.getPrototypeOf(RayRenderer)).call(this));

    _this.camera = camera;

    var params = opt_params || {};

    // Which objects are interactive (keyed on id).
    _this.meshes = {};

    // Which objects are currently selected (keyed on id).
    _this.selected = {};

    // The raycaster.
    _this.raycaster = new THREE.Raycaster();

    // Position and orientation, in addition.
    _this.position = new THREE.Vector3();
    _this.orientation = new THREE.Quaternion();

    _this.root = new THREE.Object3D();

    // Add the reticle mesh to the root of the object.
    _this.reticle = _this.createReticle_();
    _this.root.add(_this.reticle);

    // Add the ray to the root of the object.
    _this.ray = _this.createRay_();
    _this.root.add(_this.ray);

    // How far the reticle is currently from the reticle origin.
    _this.reticleDistance = RETICLE_DISTANCE;
    return _this;
  }

  /**
   * Register an object so that it can be interacted with.
   */


  _createClass(RayRenderer, [{
    key: 'add',
    value: function add(object) {
      this.meshes[object.id] = object;
    }

    /**
     * Prevent an object from being interacted with.
     */

  }, {
    key: 'remove',
    value: function remove(object) {
      var id = object.id;
      if (!this.meshes[id]) {
        // If there's no existing mesh, we can't remove it.
        delete this.meshes[id];
      }
      // If the object is currently selected, remove it.
      if (this.selected[id]) {
        delete this.selected[object.id];
      }
    }
  }, {
    key: 'update',
    value: function update() {
      // Do the raycasting and issue various events as needed.
      for (var id in this.meshes) {
        var mesh = this.meshes[id];
        var intersects = this.raycaster.intersectObject(mesh, true);
        if (intersects.length > 1) {
          console.warn('Unexpected: multiple meshes intersected.');
        }
        var isIntersected = intersects.length > 0;
        var isSelected = this.selected[id];

        // If it's newly selected, send rayover.
        if (isIntersected && !isSelected) {
          this.selected[id] = true;
          if (this.isActive) {
            this.emit('rayover', mesh);
          }
        }

        // If it's no longer intersected, send rayout.
        if (!isIntersected && isSelected) {
          delete this.selected[id];
          this.moveReticle_(null);
          if (this.isActive) {
            this.emit('rayout', mesh);
          }
        }

        if (isIntersected) {
          this.moveReticle_(intersects);
        }
      }
    }

    /**
     * Sets the origin of the ray.
     * @param {Vector} vector Position of the origin of the picking ray.
     */

  }, {
    key: 'setPosition',
    value: function setPosition(vector) {
      this.position.copy(vector);
      this.raycaster.ray.origin.copy(vector);
      this.updateRaycaster_();
    }
  }, {
    key: 'getOrigin',
    value: function getOrigin() {
      return this.raycaster.ray.origin;
    }

    /**
     * Sets the direction of the ray.
     * @param {Vector} vector Unit vector corresponding to direction.
     */

  }, {
    key: 'setOrientation',
    value: function setOrientation(quaternion) {
      this.orientation.copy(quaternion);

      var pointAt = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
      this.raycaster.ray.direction.copy(pointAt);
      this.updateRaycaster_();
    }
  }, {
    key: 'getDirection',
    value: function getDirection() {
      return this.raycaster.ray.direction;
    }

    /**
     * Sets the pointer on the screen for camera + pointer based picking. This
     * superscedes origin and direction.
     *
     * @param {Vector2} vector The position of the pointer (screen coords).
     */

  }, {
    key: 'setPointer',
    value: function setPointer(vector) {
      this.raycaster.setFromCamera(vector, this.camera);
      this.updateRaycaster_();
    }

    /**
     * Gets the mesh, which includes reticle and/or ray. This mesh is then added
     * to the scene.
     */

  }, {
    key: 'getReticleRayMesh',
    value: function getReticleRayMesh() {
      return this.root;
    }

    /**
     * Gets the currently selected object in the scene.
     */

  }, {
    key: 'getSelectedMesh',
    value: function getSelectedMesh() {
      var count = 0;
      var mesh = null;
      for (var id in this.selected) {
        count += 1;
        mesh = this.meshes[id];
      }
      if (count > 1) {
        console.warn('More than one mesh selected.');
      }
      return mesh;
    }

    /**
     * Hides and shows the reticle.
     */

  }, {
    key: 'setReticleVisibility',
    value: function setReticleVisibility(isVisible) {
      this.reticle.visible = isVisible;
    }

    /**
     * Enables or disables the raycasting ray which gradually fades out from
     * the origin.
     */

  }, {
    key: 'setRayVisibility',
    value: function setRayVisibility(isVisible) {
      this.ray.visible = isVisible;
    }

    /**
     * Enables and disables the raycaster. For touch, where finger up means we
     * shouldn't be raycasting.
     */

  }, {
    key: 'setActive',
    value: function setActive(isActive) {
      // If nothing changed, do nothing.
      if (this.isActive == isActive) {
        return;
      }
      // TODO(smus): Show the ray or reticle adjust in response.
      this.isActive = isActive;

      if (!isActive) {
        this.moveReticle_(null);
        for (var id in this.selected) {
          var mesh = this.meshes[id];
          delete this.selected[id];
          this.emit('rayout', mesh);
        }
      }
    }
  }, {
    key: 'updateRaycaster_',
    value: function updateRaycaster_() {
      var ray = this.raycaster.ray;

      // Position the reticle at a distance, as calculated from the origin and
      // direction.
      var position = this.reticle.position;
      position.copy(ray.direction);
      position.multiplyScalar(this.reticleDistance);
      position.add(ray.origin);

      // Set position and orientation of the ray so that it goes from origin to
      // reticle.
      var delta = new THREE.Vector3().copy(ray.direction);
      delta.multiplyScalar(this.reticleDistance);
      this.ray.scale.y = delta.length();
      var arrow = new THREE.ArrowHelper(ray.direction, ray.origin);
      this.ray.rotation.copy(arrow.rotation);
      this.ray.position.addVectors(ray.origin, delta.multiplyScalar(0.5));
    }

    /**
     * Creates the geometry of the reticle.
     */

  }, {
    key: 'createReticle_',
    value: function createReticle_() {
      // Create a spherical reticle.
      var innerGeometry = new THREE.SphereGeometry(INNER_RADIUS, 32, 32);
      var innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
      });
      var inner = new THREE.Mesh(innerGeometry, innerMaterial);

      var outerGeometry = new THREE.SphereGeometry(OUTER_RADIUS, 32, 32);
      var outerMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.3
      });
      var outer = new THREE.Mesh(outerGeometry, outerMaterial);

      var reticle = new THREE.Group();
      reticle.add(inner);
      reticle.add(outer);
      return reticle;
    }

    /**
     * Moves the reticle to a position so that it's just in front of the mesh that
     * it intersected with.
     */

  }, {
    key: 'moveReticle_',
    value: function moveReticle_(intersections) {
      // If no intersection, return the reticle to the default position.
      var distance = RETICLE_DISTANCE;
      if (intersections) {
        // Otherwise, determine the correct distance.
        var inter = intersections[0];
        distance = inter.distance;
      }

      this.reticleDistance = distance;
      this.updateRaycaster_();
      return;
    }
  }, {
    key: 'createRay_',
    value: function createRay_() {
      // Create a cylindrical ray.
      var geometry = new THREE.CylinderGeometry(RAY_RADIUS, RAY_RADIUS, 1, 32);
      var material = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture(GRADIENT_IMAGE),
        //color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      var mesh = new THREE.Mesh(geometry, material);

      return mesh;
    }
  }]);

  return RayRenderer;
}(_eventemitter2.default);

exports.default = RayRenderer;

},{"./util":12,"eventemitter3":2}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMobile = isMobile;
exports.base64 = base64;
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function isMobile() {
  var check = false;
  (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function base64(mimeType, base64) {
  return 'data:' + mimeType + ';base64,' + base64;
}

},{}],13:[function(require,module,exports){
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

},{"_process":1}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Datapoint = exports.WebSocketDataset = exports.Dataset = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _papaparse = require('papaparse');

var _papaparse2 = _interopRequireDefault(_papaparse);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Base Dataset class
 */
var Dataset = exports.Dataset = function () {

	/**
  *
  */
	function Dataset() {
		_classCallCheck(this, Dataset);

		this.datapoints = {};
		this.embeddings = [];
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


	_createClass(Dataset, [{
		key: 'add',


		/**
   * Add a datapoint to the Dataset
   * @param {Datapoint} datapoint
   */
		value: function add(datapoint) {
			var d;
			if (!(datapoint instanceof Datapoint)) {
				d = new Datapoint(datapoint);
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

	}, {
		key: 'remove',
		value: function remove(id) {
			delete this.datapoints[id];
			this.sendNotifications('remove', id);
		}

		/**
   * Modify the value of a datapoint attribute
   * @param id - The id of the datapoint to modify
   * @param k - The key whose value to modify
   @ @param v - The new value
   */

	}, {
		key: 'update',
		value: function update(id, k, v) {
			var dp = this.datapoints[id];
			if (dp) {
				var old = dp.get(k);
				dp.set(k, v);
				this.sendNotifications('update', id, k, v, old);
			}
		}
	}, {
		key: 'get',
		value: function get(id) {
			return this.datapoints[id];
		}
	}, {
		key: 'getIds',
		value: function getIds() {
			return Object.keys(this.datapoints);
		}
	}, {
		key: 'register',
		value: function register(embedding) {
			this.embeddings.push(embedding);
		}
	}, {
		key: 'sendNotifications',
		value: function sendNotifications(type, id) {
			var msg = { type: type, id: id };
			if (type == 'update') {
				msg.attr = arguments.length <= 2 ? undefined : arguments[2];
				msg.newVal = arguments.length <= 3 ? undefined : arguments[3];
				msg.oldVal = arguments.length <= 4 ? undefined : arguments[4];
			}
			this.embeddings.forEach(function (e) {
				return e.notify(msg);
			});
		}
	}], [{
		key: 'createFromCSV',
		value: function createFromCSV(url, callback) {
			_papaparse2.default.parse(url, {
				download: true,
				header: true,
				dynamicTyping: true,
				complete: function complete(results) {
					var ds = new Dataset();
					for (var i in results.data) {
						var dp = results.data[i];
						dp._id = i;
						ds.add(dp);
					}
					callback(ds);
				}
			});
		}
	}]);

	return Dataset;
}();

/**
 * A Dataset whose datapoints are received from a websocket.
 */


var WebSocketDataset = exports.WebSocketDataset = function (_Dataset) {
	_inherits(WebSocketDataset, _Dataset);

	function WebSocketDataset(url) {
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, WebSocketDataset);

		options = (0, _objectAssign2.default)({ onmessage: function onmessage(x) {
				return x;
			}, init: function init(s) {} }, options);

		var _this = _possibleConstructorReturn(this, (WebSocketDataset.__proto__ || Object.getPrototypeOf(WebSocketDataset)).call(this));

		_this.options = options;
		_this.socket = new WebSocket(url);
		_this.socket.onopen = function () {
			return _this.options.init(_this.socket);
		};
		_this.socket.onmessage = function (m) {
			var d = this.options.onmessage(JSON.parse(m.data));
			this.add(d);
		}.bind(_this);
		return _this;
	}

	return WebSocketDataset;
}(Dataset);

var Datapoint = exports.Datapoint = function () {
	function Datapoint(values) {
		var idAttribute = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '_id';

		_classCallCheck(this, Datapoint);

		this.values = values;
		this.idAttribute = idAttribute;
	}

	_createClass(Datapoint, [{
		key: 'get',
		value: function get(k) {
			return this.values[k];
		}
	}, {
		key: 'set',
		value: function set(k, v) {
			this.values[k] = v;
		}
	}, {
		key: 'id',
		get: function get() {
			return this.values[this.idAttribute];
		}
	}]);

	return Datapoint;
}();

},{"object-assign":3,"papaparse":4}],15:[function(require,module,exports){
'use strict';

// logic here adapted from https://github.com/borismus/ray-input/blob/master/src/ray-controller.js

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.detectMode = detectMode;
var DISPLAY_TYPES = exports.DISPLAY_TYPES = {
	DESKTOP: 'DESKTOP_DISPLAY',
	MOBILE: 'MOBILE_DSIPLAY',
	VR: 'VR_DISPLAY'
};

var INPUT_TYPES = exports.INPUT_TYPES = {
	KB_MOUSE: 'KB_MOUSE_INPUT',
	TOUCH: 'TOUCH_INPUT',
	VR_GAZE: 'VR_GAZE_INPUT',
	VR_3DOF: 'VR_3DOF_INPUT',
	VR_6DOF: 'VR_6DOF_INPUT'
};

// https://github.com/borismus/ray-input/blob/master/src/util.js
function isMobile() {
	var check = false;
	(function (a) {
		if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	})(navigator.userAgent || navigator.vendor || window.opera);
	return check;
}

function detectDisplay() {
	if (navigator.getVRDisplays) {
		return DISPLAY_TYPES.VR;
	} else {
		if (isMobile()) return DISPLAY_TYPES.MOBILE;else return DISPLAY_TYPES.DESKTOP;
	}
}

function detectInput(displayMode) {
	var gamepad = undefined;
	if (navigator.getGamepads) {
		var gamepads = navigator.getGamepads();
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = gamepads[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _gamepad = _step.value;

				if (_gamepad && _gamepad.pose) {
					if (_gamepad.pose.hasPosition) return INPUT_TYPES.VR_6DOF;else if (_gamepad.pose.hasOrientation) return INPUT_TYPES.VR_3DOF;
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	}

	// gamepad API not found or no VR gamepad found
	if (isMobile()) {
		if (displayMode == DISPLAY_TYPES.VR) return INPUT_TYPES.VR_GAZE;else return INPUT_TYPES.TOUCH;
	} else {
		return INPUT_TYPES.KB_MOUSE;
	}

	return INPUT_TYPES.TOUCH;
}

function detectMode() {
	var displayMode = detectDisplay();
	var inputMode = detectInput(displayMode);
	return { displayMode: displayMode, inputMode: inputMode };
}

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.AggregateEmbedding = exports.ConsoleEmbedding = exports.PathEmbedding = exports.ScatterEmbedding = exports.PointsEmbedding = exports.MeshEmbedding = exports.Embedding = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _tween = require('tween.js');

var _tween2 = _interopRequireDefault(_tween);

var _utils = require('./utils.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Base class for all embeddings.
 */
var Embedding = exports.Embedding = function () {
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
	function Embedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, Embedding);

		this.dataset = dataset;
		if (dataset) dataset.register(this);
		this.obj3D = new THREE.Object3D();
		scene.add(this.obj3D);
		this.initialized = false;
		this.events = [];

		// set default position and rotation
		options = (0, _objectAssign2.default)({ x: 0, y: 0, z: 0 }, options);
		options = (0, _objectAssign2.default)({ rx: 0, ry: 0, rz: 0 }, options);
		options = (0, _objectAssign2.default)({ sx: 1, sy: 1, sz: 1 }, options);
		options = (0, _objectAssign2.default)({ mapping: {} }, options);
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


	_createClass(Embedding, [{
		key: '_map',
		value: function _map(dp, src) {
			var tgt = this.mapping[src];
			return tgt ? dp.get(tgt) : dp.get(src);
		}

		/**
   * Translates from a source property of a datapoint to a target property of an embedding
   * element.
   */

	}, {
		key: '_mapAttr',
		value: function _mapAttr(src) {
			var tgt = this.mapping[src];
			return tgt ? tgt : src;
		}

		/**
   * Render the embedding - must be implemented by each concrete subclass.
   * @abstract
   */

	}, {
		key: 'embed',
		value: function embed() {
			// not implemented here
		}
	}, {
		key: 'notify',
		value: function notify(event) {
			this.events.push(event);
		}
	}, {
		key: 'getOpt',
		value: function getOpt(x) {
			var dp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			var a = this.options[x];
			if (typeof a == 'function') return a(dp);else return a;
		}
	}]);

	return Embedding;
}();

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


var MeshEmbedding = exports.MeshEmbedding = function (_Embedding) {
	_inherits(MeshEmbedding, _Embedding);

	function MeshEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, MeshEmbedding);

		options = (0, _objectAssign2.default)({
			meshType: 'cube',
			color: 0xff00ff,
			emissive: 0x888888,
			metalness: 0,
			wireframe: false
		}, options);

		// Set defaults appropriate to the mesh type
		switch (options.meshType.toLowerCase()) {
			case 'box':
				options = (0, _objectAssign2.default)({
					sizeX: .02
				}, options);
				options = (0, _objectAssign2.default)({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'sphere':
				options = (0, _objectAssign2.default)({
					sizeR: .01
				}, options);
				break;
			case 'ellipsoid':
				options = (0, _objectAssign2.default)({
					sizeX: .01,
					sizeY: .02,
					sizeZ: .03
				}, options);
				break;
			case 'tetrahedron':
				options = (0, _objectAssign2.default)({
					sizeX: .02
				}, options);
				options = (0, _objectAssign2.default)({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'octahedron':
				options = (0, _objectAssign2.default)({
					sizeX: .02
				}, options);
				options = (0, _objectAssign2.default)({
					sizeY: options.sizeX,
					sizeZ: options.sizeX
				}, options);
				break;
			case 'cube':
			default:
				// fall back to Cube
				options = (0, _objectAssign2.default)({
					sizeX: .02
				}, options);
				break;
		}

		// Ensure options.geometry is an array if it is present
		if (options.geometry && !Array.isArray(options.geometry)) options.geometry = [options.geometry];

		// mapping from datapoint ids to meshes
		var _this = _possibleConstructorReturn(this, (MeshEmbedding.__proto__ || Object.getPrototypeOf(MeshEmbedding)).call(this, scene, dataset, options));

		_this.dpMap = {};

		// place the datapoints present in the dataset
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = _this.dataset.getIds()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var id = _step.value;
				_this._placeDatapoint(id);
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		return _this;
	}

	_createClass(MeshEmbedding, [{
		key: 'embed',
		value: function embed() {
			// process events sent by the dataset since last embed() call
			if (this.events.length > 0) {
				for (var i in this.events) {
					var e = this.events[i];
					if (e.type == "add") this._placeDatapoint(e.id);else if (e.type == "remove") this._removeDatapoint(e.id);else if (e.type == "update") this._updateDatapoint(e.id, e);
				}
			}
			this.events = [];
		}

		/**
   * A default Object3D creator; this can be overriden by subclasses 
   */

	}, {
		key: 'createObjectForDatapoint',
		value: function createObjectForDatapoint(dp) {
			var geos, mat;
			if (this.options.object3d) {

				var object3d = this.options.object3d;
				if (typeof object3d == 'function') return object3d(dp);else if (object3d instanceof THREE.Object3D) return object3d.clone();else console.warn('Object3D type not recognized');
			} else if (this.options.geometry) {

				// Geometry(ies) specified
				geos = this.options.geometry.map(function (g) {
					if (typeof g == 'function') return g(dp);else if (g instanceof THREE.Geometry) return g.clone();else console.warn('geometry type not recognized');
				}.bind(this));
			} else {
				// Create geometry from parameters
				switch (this.options.meshType.toLowerCase()) {
					case 'box':
						geos = [new THREE.BoxGeometry((0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeY, dp), (0, _utils.maybeEval)(this.options.sizeZ, dp))];
						break;
					case 'sphere':
						geos = [new THREE.SphereGeometry((0, _utils.maybeEval)(this.options.sizeR, dp), 16, 16)];
						break;
					case 'ellipsoid':
						geos = [new THREE.SphereGeometry(1.0, 16, 16)];
						geos[0].applyMatrix(new THREE.Matrix4().makeScale((0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeY, dp), (0, _utils.maybeEval)(this.options.sizeZ, dp)));
						break;
					case 'tetrahedron':
						geos = [new THREE.TetrahedronGeometry(1.0)];
						geos[0].applyMatrix(new THREE.Matrix4().makeScale((0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeY, dp), (0, _utils.maybeEval)(this.options.sizeZ, dp)));
						break;
					case 'octahedron':
						geos = [new THREE.OctahedronGeometry(1.0)];
						geos[0].applyMatrix(new THREE.Matrix4().makeScale((0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeY, dp), (0, _utils.maybeEval)(this.options.sizeZ, dp)));
						break;
					case 'cube':
					default:
						geos = [new THREE.BoxGeometry((0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeX, dp), (0, _utils.maybeEval)(this.options.sizeX, dp))];
						break;
				}
			}

			if (this.options.material) {
				if (typeof this.options.material == 'function') mat = this.options.material(dp);else if (this.options.material instanceof THREE.Material) mat = this.options.material.clone();else console.warn('material type not recognized');
			} else {
				// Create material from parameters
				mat = new THREE.MeshStandardMaterial({
					color: (0, _utils.maybeEval)(this.options.color, dp),
					emissive: (0, _utils.maybeEval)(this.options.emissive, dp),
					metalness: (0, _utils.maybeEval)(this.options.metalness, dp),
					wireframe: (0, _utils.maybeEval)(this.options.wireframe, dp)
				});
			}
			var obj = new THREE.Object3D();
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = geos[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var geo = _step2.value;

					obj.add(new THREE.Mesh(geo, mat));
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			return obj;
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var dp = this.dataset.datapoints[id];
			var obj = this.createObjectForDatapoint(dp);
			obj.userData.description = this.getOpt("description", dp);
			this.dpMap[id] = obj;
			this.obj3D.add(obj);
			THREE.input.add(obj);
			obj.position.set(dp.get(this._mapAttr('x')), dp.get(this._mapAttr('y')), dp.get(this._mapAttr('z')));
		}
	}, {
		key: '_removeDatapoint',
		value: function _removeDatapoint(id) {
			var mesh = this.dpMap[id];
			if (mesh) this.obj3D.remove(mesh);
		}
	}, {
		key: '_updateDatapoint',
		value: function _updateDatapoint(id, event) {
			_removeDatapoint(id);
			_placeDatapoint(id);
		}
	}]);

	return MeshEmbedding;
}(Embedding);

/**
 * Base class for embedding backed by a Points object (i.e., particle clouds)
 */


var PointsEmbedding = exports.PointsEmbedding = function (_Embedding2) {
	_inherits(PointsEmbedding, _Embedding2);

	function PointsEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, PointsEmbedding);

		options = (0, _objectAssign2.default)({
			pointType: "ball",
			pointSize: 0.2,
			pointColor: 0xffffff
		}, options);

		// TODO base64 encode and read from string
		var _this2 = _possibleConstructorReturn(this, (PointsEmbedding.__proto__ || Object.getPrototypeOf(PointsEmbedding)).call(this, scene, dataset, options));

		var sprite = new THREE.TextureLoader().load("https://rawgit.com/beaucronin/embedding/master/static/sprites/ball.png");
		var materialProps = {
			size: _this2.getOpt("pointSize"),
			sizeAttenuation: true,
			map: sprite,
			color: _this2.getOpt("pointColor"),
			alphaTest: 0.5,
			transparent: true
		};
		_this2.points = new THREE.Points(new THREE.Geometry(), new THREE.PointsMaterial(materialProps));
		_this2.points.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
		_this2.obj3D.add(_this2.points);
		return _this2;
	}

	return PointsEmbedding;
}(Embedding);

/**
 * An embedding in which each datapoint is rendered as a vertex in a THREE.Points object.
 */


var ScatterEmbedding = exports.ScatterEmbedding = function (_PointsEmbedding) {
	_inherits(ScatterEmbedding, _PointsEmbedding);

	function ScatterEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, ScatterEmbedding);

		options = (0, _objectAssign2.default)({
			bufferSize: 1000,
			moveSpeed: 2,
			autoScale: false,
			autoScaleRange: 10
		}, options);

		// mapping from datapoint ids to vertex indices
		var _this3 = _possibleConstructorReturn(this, (ScatterEmbedding.__proto__ || Object.getPrototypeOf(ScatterEmbedding)).call(this, scene, dataset, options));

		_this3.dpMap = {};

		// unallocated vertices 
		_this3.freeVertices = [];

		// initialize vertices and mark them as unallocated
		for (var i = 0; i < _this3.getOpt("bufferSize"); i++) {
			_this3.points.geometry.vertices.push(new THREE.Vector3(-1000000, -1000000, -1000000));
			_this3.freeVertices.push(i);
		}

		// create rescaling
		if (_this3.getOpt("autoScale")) {
			_this3._initAutoScale(_this3.getOpt("autoScaleRange"));
			console.log(_this3.rescale);
		} else if (_this3.getOpt("rescale")) {
			// TODO
		} else {
			_this3.rescale = new Rescaling();
		}

		_this3.tweens = {};
		return _this3;
	}

	_createClass(ScatterEmbedding, [{
		key: '_initAutoScale',
		value: function _initAutoScale(range) {
			var _this4 = this;

			var dps = this.dataset.getIds().map(function (id) {
				return _this4.dataset.get(id);
			});
			var xmin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('x'));
			}));
			var xmax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('x'));
			}));
			var ymin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('y'));
			}));
			var ymax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('y'));
			}));
			var zmin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('z'));
			}));
			var zmax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('z'));
			}));
			this.rescale = new Rescaling(-(xmax + xmin) / 2, -(ymax + ymin) / 2, -(zmax + zmin) / 2, range / (xmax - xmin), range / (ymax - ymin), range / (zmax - zmin));
		}
	}, {
		key: 'embed',
		value: function embed() {
			if (!this.initialized) {
				// add all datapoints already in the dataset
				for (var id in this.dataset.datapoints) {
					this._placeDatapoint(id);
				}
				this.points.geometry.verticesNeedUpdate = true;
				this.initialized = true;
			} else {
				// process events sent by the dataset since last embed() call
				if (this.events.length > 0) {
					for (var i in this.events) {
						var e = this.events[i];
						if (e.type == "add") this._placeDatapoint(e.id);else if (e.type == "remove") this._removeDatapoint(e.id);else if (e.type == "update") this._updateDatapoint(e.id, e);
					}
					// console.log("calling vertices update");
					this.points.geometry.verticesNeedUpdate = true;
				}
				this.events = [];
			}
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var vi = this.freeVertices.pop();
			if (vi != undefined) {
				var dp = this.dataset.datapoints[id];
				if (!dp) return;
				this.points.geometry.vertices[vi].set(this.rescale.scaleX(this._map(dp, 'x')), this.rescale.scaleY(this._map(dp, 'y')), this.rescale.scaleZ(this._map(dp, 'z')));
				this.dpMap[id] = vi;
			} else {
				console.warn('Vertex buffer size exceeded');
			}
		}
	}, {
		key: '_removeDatapoint',
		value: function _removeDatapoint(id) {
			var vi = this.dpMap[id];
			if (vi != undefined) {
				this.points.geometry.vertices[vi].set(-1000000, -1000000, -1000000);
				delete this.dpMap[id];
				this.freeVertices.push(vi);
			}
		}
	}, {
		key: '_updateDatapoint',
		value: function _updateDatapoint(id, event) {
			var _this5 = this;

			var vi = this.dpMap[id];
			if (vi != undefined) {
				var geo;
				var obj;

				var _ret = function () {
					var dp = _this5.dataset.datapoints[id];
					if (!dp) return {
							v: void 0
						};
					// TODO other attributes beside position
					var v = _this5.points.geometry.vertices[vi];

					var start = { x: v.x, y: v.y, z: v.z };
					var end = {
						x: _this5.rescale.scaleX(_this5._map(dp, 'x')),
						y: _this5.rescale.scaleY(_this5._map(dp, 'y')),
						z: _this5.rescale.scaleZ(_this5._map(dp, 'z'))
					};
					var d = new THREE.Vector3(start.x, start.y, start.z).sub(new THREE.Vector3(end.x, end.y, end.z)).length();
					var t = 1000 * d / _this5.getOpt("moveSpeed", dp);

					geo = _this5.points.geometry;
					obj = _this5;

					if (_this5.tweens[vi]) {
						_this5.tweens[vi].stop();
						delete _this5.tweens[vi];
					}

					var tween = new _tween2.default.Tween(start).to(end, t).onUpdate(function () {
						v.set(this.x, this.y, this.z);
						geo.verticesNeedUpdate = true;
					}).onComplete(function () {
						return delete obj.tweens[id];
					}).onStop(function () {
						return delete obj.tweens[id];
					}).easing(_tween2.default.Easing.Exponential.InOut).start();
					_this5.tweens[vi] = tween;
				}();

				if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
			}
		}
	}]);

	return ScatterEmbedding;
}(PointsEmbedding);

/**
 * A {MeshEmbedding} in which each {Datapoint} is rendered as a Mesh that follows a
 * path defined by waypoints.
 */


var PathEmbedding = exports.PathEmbedding = function (_MeshEmbedding) {
	_inherits(PathEmbedding, _MeshEmbedding);

	function PathEmbedding(scene, dataset, waypoints, options) {
		_classCallCheck(this, PathEmbedding);

		options = (0, _objectAssign2.default)({
			pathWidthX: 0,
			pathWidthY: 0,
			pathWidthZ: 0,
			description: '',
			removeAfter: true,
			pathTime: 10000
		}, options);

		var _this6 = _possibleConstructorReturn(this, (PathEmbedding.__proto__ || Object.getPrototypeOf(PathEmbedding)).call(this, scene, dataset, options));

		_this6.waypoints = waypoints.map(function (x) {
			return new THREE.Vector3(x[0], x[1], x[2]);
		});

		_this6.meshOffsets = {};
		_this6.tweens = {};
		return _this6;
	}

	_createClass(PathEmbedding, [{
		key: '_createMeshOffset',
		value: function _createMeshOffset(id) {
			var pwx = this.getOpt('pathWidthX');
			var pwy = this.getOpt('pathWidthY');
			var pwz = this.getOpt('pathWidthZ');
			var ox = pwx * Math.random() - pwx / 2;
			var oy = pwy * Math.random() - pwy / 2;
			var oz = pwz * Math.random() - pwz / 2;
			this.meshOffsets[id] = new THREE.Vector3(ox, oy, oz);
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var dp = this.dataset.datapoints[id];
			var mesh = this.createObjectForDatapoint(dp);
			this._createMeshOffset(id);
			mesh.userData.description = this.getOpt("description", dp);
			this.dpMap[id] = mesh;
			this.obj3D.add(mesh);
			THREE.input.add(mesh);

			// create path tween
			var start = { x: this.waypoints[0].x, y: this.waypoints[0].y, z: this.waypoints[0].z };
			var end = {
				x: this.waypoints.slice(1).map(function (a) {
					return a.x;
				}),
				y: this.waypoints.slice(1).map(function (a) {
					return a.y;
				}),
				z: this.waypoints.slice(1).map(function (a) {
					return a.z;
				})
			};
			var t = this.getOpt("pathTime");
			var obj = this;
			var tween = new _tween2.default.Tween(start).to(end, t).interpolation(_tween2.default.Interpolation.CatmullRom).onUpdate(function () {
				// keep the x-axis of the mesh tangent to the path as it moves
				var oldPos = mesh.position.clone();
				var newPos = new THREE.Vector3(this.x, this.y, this.z);
				var dir = newPos.sub(oldPos).normalize();
				var axis = new THREE.Vector3(1, 0, 0);
				var offset = obj.meshOffsets[id];
				mesh.position.set(this.x + offset.x, this.y + offset.y, this.z + offset.z);
				// mesh.position.set(this.x, this.y, this.z);
				mesh.quaternion.setFromUnitVectors(axis, dir);
			}).onComplete(function () {
				delete obj.tweens[id];
				if (obj.getOpt("removeAfter")) obj.obj3D.remove(mesh);
			}).onStop(function () {
				return delete obj.tweens[id];
			}).start();
			this.tweens[id] = tween;
		}
	}, {
		key: '_removeDatapoint',
		value: function _removeDatapoint(id) {
			if (this.tweens[id]) this.tweens[id].stop();
			var mesh = this.dpMap[id];
			if (mesh) this.obj3D.remove(mesh);
		}
	}, {
		key: '_updateDatapoint',
		value: function _updateDatapoint(id, event) {
			// TODO implement
		}
	}]);

	return PathEmbedding;
}(MeshEmbedding);

var ConsoleEmbedding = exports.ConsoleEmbedding = function (_Embedding3) {
	_inherits(ConsoleEmbedding, _Embedding3);

	function ConsoleEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, ConsoleEmbedding);

		options = (0, _objectAssign2.default)({
			font: "Bold 24px Arial",
			fillStyle: "rgba(225,225,225,0.90)",
			align: "center",
			width: 1.0
		}, options);

		var _this7 = _possibleConstructorReturn(this, (ConsoleEmbedding.__proto__ || Object.getPrototypeOf(ConsoleEmbedding)).call(this, scene, dataset, options));

		_this7.canvas = document.createElement('canvas');
		_this7.canvas.width = 1024;
		_this7.canvas.height = 512;
		_this7.context = _this7.canvas.getContext('2d');
		_this7.context.font = _this7.getOpt('font');
		_this7.context.fillStyle = _this7.getOpt('fillStyle');
		_this7.context.textAlign = _this7.getOpt('align');
		_this7.mesh = undefined;
		return _this7;
	}

	_createClass(ConsoleEmbedding, [{
		key: 'setText',
		value: function setText(text) {
			if (this.mesh) this.obj3D.remove(this.mesh);
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

			if (this.getOpt('align') == 'left') this.context.fillText(text, 0, this.canvas.height / 2);else if (this.getOpt('align') == 'right') this.context.fillText(text, this.canvas.width, this.canvas.height / 2);else // default to center
				this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

			var texture = new THREE.Texture(this.canvas);
			texture.needsUpdate = true;
			var material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
			material.transparent = true;

			this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.getOpt('width') * this.canvas.width / 256, this.getOpt('width') * this.canvas.height / 128), material);
			this.mesh.position.set(this.getOpt('x'), this.getOpt('y'), this.getOpt('z'));
			this.obj3D.add(this.mesh);
		}
	}]);

	return ConsoleEmbedding;
}(Embedding);

var AggregateEmbedding = exports.AggregateEmbedding = function (_Embedding4) {
	_inherits(AggregateEmbedding, _Embedding4);

	function AggregateEmbedding() {
		_classCallCheck(this, AggregateEmbedding);

		return _possibleConstructorReturn(this, (AggregateEmbedding.__proto__ || Object.getPrototypeOf(AggregateEmbedding)).apply(this, arguments));
	}

	return AggregateEmbedding;
}(Embedding);

var Rescaling = function () {
	function Rescaling() {
		var xo = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
		var yo = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var zo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var xs = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
		var ys = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;
		var zs = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;

		_classCallCheck(this, Rescaling);

		if (typeof xo == "number") {
			this.xo = xo;
			this.yo = yo;
			this.zo = zo;
			this.xs = xs;
			this.ys = ys;
			this.zs = zs;
		}
	}

	_createClass(Rescaling, [{
		key: 'scaleX',
		value: function scaleX(x) {
			return this.xs * (x + this.xo);
		}
	}, {
		key: 'scaleY',
		value: function scaleY(y) {
			return this.ys * (y + this.yo);
		}
	}, {
		key: 'scaleZ',
		value: function scaleZ(z) {
			return this.zs * (z + this.zo);
		}
	}]);

	return Rescaling;
}();

},{"./utils.js":18,"object-assign":3,"tween.js":13}],17:[function(require,module,exports){
'use strict';

/**
 * @author Beau Cronin <beau.cronin@gmail.com>
 */

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.initScene = initScene;
exports.startAnimation = startAnimation;
exports.animate = animate;
exports.register = register;

var _rayInput = require('ray-input');

var _rayInput2 = _interopRequireDefault(_rayInput);

var _tween = require('tween.js');

var _tween2 = _interopRequireDefault(_tween);

var _queryString = require('query-string');

var _queryString2 = _interopRequireDefault(_queryString);

var _dataset = require('./dataset.js');

var _embedding = require('./embedding.js');

var _detectionUtils = require('./detection-utils.js');

var _utils = require('./utils.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var embeddings = [];
var updateFunc;
var lastRender = 0;
var vrDisplay;

/**
 * Convenience function to create a responsive THREE scene and related objects. Returns a number 
 * of objects that should probably be kept around by the enclosing script.
 */
function initScene() {
	var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 10;

	// The VRControls object updates the camera position in response to position and orientation
	// changes of the HMD.
	var cameraControls = new THREE.VRControls(camera);
	cameraControls.standing = true;

	// This renderer is the standard WebGL renderer; it may be further processed for VR use depending
	// on the mode selected by the webvr-boilerplate
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	// The VREffect is responsible for distorting the rendered image to match the optics of the HMD,
	// as well as rendering different, offset images for each eye
	var effect = new THREE.VREffect(renderer);
	effect.setSize(window.innerWidth, window.innerHeight);

	// The WebVRManager is provided by the webvr-boilerplate, and handles detection of display hardware
	// (desktop, mobile, VR) and switching between regular and VR modes
	var manager = new WebVRManager(renderer, effect);

	var onResize = function onResize(e) {
		effect.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	};

	window.addEventListener('resize', onResize, true);
	window.addEventListener('vrdisplaypresentchange', onResize, true);

	// TODO putting the input in the THREE global for now; probably want embeddings to fire 
	// events when meshes are added/removed rather than referencing the input directly
	THREE.input = new _rayInput2.default(camera, renderer.domElement);
	THREE.input.setSize(renderer.getSize());
	scene.add(THREE.input.getMesh());

	updateFunc = options.updateFunc;

	return { scene: scene, camera: camera, manager: manager, effect: effect, cameraControls: cameraControls };
}

function startAnimation() {
	// NOTE: assumes the webvr polyfill is present, so can count on a valid display
	navigator.getVRDisplays().then(function (displays) {
		if (displays.length > 0) {
			vrDisplay = displays[0];
			vrDisplay.requestAnimationFrame(animate);
		}
	});
}

/**
 * The core animation call that is executed for each frame. Updates all registered
 * embeddings, the pointer controls, and the camera position. Renders the scene
 * using the WebVRManager, which applies the VREffect if in VR mode.
 */
function animate(timestamp) {
	if (!timestamp) timestamp = Date.now();
	var delta = Math.min(timestamp - lastRender, 500);
	lastRender = timestamp;

	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = embeddings[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var e = _step.value;

			e.embed();
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	_tween2.default.update();
	THREE.input.update();
	cameraControls.update();
	if (updateFunc) updateFunc(delta);

	manager.render(scene, camera, timestamp);

	vrDisplay.requestAnimationFrame(animate);
}

/**
 * Register an embedding so that it will be updated on each animation frame.
 * @param {Embedding} embedding - The embedding
 */
function register(embedding) {
	embeddings.push(embedding);
}

module.exports = {
	Dataset: _dataset.Dataset,
	WebSocketDataset: _dataset.WebSocketDataset,
	Embedding: _embedding.Embedding,
	MeshEmbedding: _embedding.MeshEmbedding,
	RandomEmbedding: _embedding.RandomEmbedding,
	ScatterEmbedding: _embedding.ScatterEmbedding,
	PathEmbedding: _embedding.PathEmbedding,
	ConsoleEmbedding: _embedding.ConsoleEmbedding,
	initScene: initScene,
	animate: animate,
	queryString: _queryString2.default,
	detectMode: _detectionUtils.detectMode,
	register: register,
	startAnimation: startAnimation,
	utils: {
		degToRad: _utils.degToRad,
		latLongToEuclidean: _utils.latLongToEuclidean,
		ajaxWithCallback: _utils.ajaxWithCallback,
		categoricalMap: _utils.categoricalMap
	}
};

},{"./dataset.js":14,"./detection-utils.js":15,"./embedding.js":16,"./utils.js":18,"query-string":5,"ray-input":9,"tween.js":13}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.normalPool = normalPool;
exports.normal = normal;
exports.degToRad = degToRad;
exports.latLongToEuclidean = latLongToEuclidean;
exports.ajaxWithCallback = ajaxWithCallback;
exports.maybeEval = maybeEval;
exports.categoricalMap = categoricalMap;

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

	options = (0, _objectAssign2.default)({ mean: 0, dev: 1, pool: [] }, options);

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
	var dev = options.dev;

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

function degToRad(deg) {
	return deg * Math.PI / 180;
}

function latLongToEuclidean(lat, long) {
	var R = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
	var reverse = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

	var radLat = degToRad(lat);
	var radLong = reverse ? degToRad(-long) : degToRad(long);
	var x = R * Math.cos(radLat) * Math.cos(radLong);
	var z = R * Math.cos(radLat) * Math.sin(radLong);
	var y = R * Math.sin(radLat);
	return { x: x, y: y, z: z };
}

function ajaxWithCallback(url, cb) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.send(null);
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			cb(JSON.parse(xhr.responseText));
		}
	};
}

function maybeEval(v, x) {
	if (typeof v == 'function') return v(x);else return v;
}

/**
 * Return a function that defines a mapping from values for an attribute to target values.
 * Can be used, for example, to map from attribute values to colors.
 */
function categoricalMap(attribute, map) {
	return function (dp) {
		var v = dp.get(attribute);
		if (map[v]) return map[v];else if (map._default) return map._default;else return undefined;
	};
}

},{"object-assign":3}]},{},[17])(17)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4zLjIvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8ubnZtL3ZlcnNpb25zL25vZGUvdjQuMy4yL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXBhcGFyc2UvcGFwYXBhcnNlLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeS1zdHJpbmcvbm9kZV9tb2R1bGVzL3N0cmljdC11cmktZW5jb2RlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvb3JpZW50YXRpb24tYXJtLW1vZGVsLmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvcmF5LWNvbnRyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW5wdXQuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW50ZXJhY3Rpb24tbW9kZXMuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyIsInNyYy9kYXRhc2V0LmpzIiwic3JjL2RldGVjdGlvbi11dGlscy5qcyIsInNyYy9lbWJlZGRpbmcuanMiLCJzcmMvbWFpbi5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QVo7QUFDQSxRQUFPLEVBQUMsSUFBRCxFQUFJLElBQUosRUFBTyxJQUFQLEVBQVA7QUFDQTs7QUFFTSxTQUFTLGdCQUFULENBQTBCLEdBQTFCLEVBQStCLEVBQS9CLEVBQW1DO0FBQ3pDLEtBQUksTUFBTSxJQUFJLGNBQUosRUFBVjtBQUNBLEtBQUksSUFBSixDQUFTLEtBQVQsRUFBZ0IsR0FBaEI7QUFDQSxLQUFJLElBQUosQ0FBUyxJQUFUO0FBQ0EsS0FBSSxrQkFBSixHQUF5QixZQUFXO0FBQ3BDLE1BQUksSUFBSSxVQUFKLEtBQW1CLENBQW5CLElBQXdCLElBQUksTUFBSixLQUFlLEdBQTNDLEVBQWdEO0FBQy9DLE1BQUcsS0FBSyxLQUFMLENBQVcsSUFBSSxZQUFmLENBQUg7QUFDQTtBQUNBLEVBSkQ7QUFLQTs7QUFFTSxTQUFTLFNBQVQsQ0FBbUIsQ0FBbkIsRUFBc0IsQ0FBdEIsRUFBeUI7QUFDL0IsS0FBSSxPQUFPLENBQVAsSUFBYSxVQUFqQixFQUNDLE9BQU8sRUFBRSxDQUFGLENBQVAsQ0FERCxLQUdDLE9BQU8sQ0FBUDtBQUNEOztBQUVEOzs7O0FBSU8sU0FBUyxjQUFULENBQXdCLFNBQXhCLEVBQW1DLEdBQW5DLEVBQXdDO0FBQzlDLFFBQU8sVUFBUyxFQUFULEVBQWE7QUFDbkIsTUFBSSxJQUFJLEdBQUcsR0FBSCxDQUFPLFNBQVAsQ0FBUjtBQUNBLE1BQUksSUFBSSxDQUFKLENBQUosRUFDQyxPQUFPLElBQUksQ0FBSixDQUFQLENBREQsS0FFSyxJQUFJLElBQUksUUFBUixFQUNKLE9BQU8sSUFBSSxRQUFYLENBREksS0FHSixPQUFPLFNBQVA7QUFDRCxFQVJEO0FBU0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaXMgbm90IGRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICB9XG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy9cbi8vIFdlIHN0b3JlIG91ciBFRSBvYmplY3RzIGluIGEgcGxhaW4gb2JqZWN0IHdob3NlIHByb3BlcnRpZXMgYXJlIGV2ZW50IG5hbWVzLlxuLy8gSWYgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIG5vdCBzdXBwb3J0ZWQgd2UgcHJlZml4IHRoZSBldmVudCBuYW1lcyB3aXRoIGFcbi8vIGB+YCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgYnVpbHQtaW4gb2JqZWN0IHByb3BlcnRpZXMgYXJlIG5vdCBvdmVycmlkZGVuIG9yXG4vLyB1c2VkIGFzIGFuIGF0dGFjayB2ZWN0b3IuXG4vLyBXZSBhbHNvIGFzc3VtZSB0aGF0IGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBhdmFpbGFibGUgd2hlbiB0aGUgZXZlbnQgbmFtZVxuLy8gaXMgYW4gRVM2IFN5bWJvbC5cbi8vXG52YXIgcHJlZml4ID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgIT09ICdmdW5jdGlvbicgPyAnficgOiBmYWxzZTtcblxuLyoqXG4gKiBSZXByZXNlbnRhdGlvbiBvZiBhIHNpbmdsZSBFdmVudEVtaXR0ZXIgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRXZlbnQgaGFuZGxlciB0byBiZSBjYWxsZWQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IENvbnRleHQgZm9yIGZ1bmN0aW9uIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29uY2U9ZmFsc2VdIE9ubHkgZW1pdCBvbmNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgRXZlbnRFbWl0dGVyIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkgeyAvKiBOb3RoaW5nIHRvIHNldCAqLyB9XG5cbi8qKlxuICogSG9sZCB0aGUgYXNzaWduZWQgRXZlbnRFbWl0dGVycyBieSBuYW1lLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0dXJuIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzIHJlZ2lzdGVyZWRcbiAqIGxpc3RlbmVycy5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzXG4gICAgLCBuYW1lcyA9IFtdXG4gICAgLCBuYW1lO1xuXG4gIGlmICghZXZlbnRzKSByZXR1cm4gbmFtZXM7XG5cbiAgZm9yIChuYW1lIGluIGV2ZW50cykge1xuICAgIGlmIChoYXMuY2FsbChldmVudHMsIG5hbWUpKSBuYW1lcy5wdXNoKHByZWZpeCA/IG5hbWUuc2xpY2UoMSkgOiBuYW1lKTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgcmV0dXJuIG5hbWVzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGV2ZW50cykpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBsaXN0IG9mIGFzc2lnbmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50cyB0aGF0IHNob3VsZCBiZSBsaXN0ZWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGV4aXN0cyBXZSBvbmx5IG5lZWQgdG8ga25vdyBpZiB0aGVyZSBhcmUgbGlzdGVuZXJzLlxuICogQHJldHVybnMge0FycmF5fEJvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyhldmVudCwgZXhpc3RzKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XG4gICAgLCBhdmFpbGFibGUgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW2V2dF07XG5cbiAgaWYgKGV4aXN0cykgcmV0dXJuICEhYXZhaWxhYmxlO1xuICBpZiAoIWF2YWlsYWJsZSkgcmV0dXJuIFtdO1xuICBpZiAoYXZhaWxhYmxlLmZuKSByZXR1cm4gW2F2YWlsYWJsZS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdmFpbGFibGUubGVuZ3RoLCBlZSA9IG5ldyBBcnJheShsKTsgaSA8IGw7IGkrKykge1xuICAgIGVlW2ldID0gYXZhaWxhYmxlW2ldLmZuO1xuICB9XG5cbiAgcmV0dXJuIGVlO1xufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIG5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRpb24gaWYgd2UndmUgZW1pdHRlZCBhbiBldmVudC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiBmYWxzZTtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCksIHRydWU7XG4gICAgICBjYXNlIDI6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEpLCB0cnVlO1xuICAgICAgY2FzZSAzOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiksIHRydWU7XG4gICAgICBjYXNlIDQ6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMyksIHRydWU7XG4gICAgICBjYXNlIDU6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQpLCB0cnVlO1xuICAgICAgY2FzZSA2OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0LCBhNSksIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5mbi5hcHBseShsaXN0ZW5lcnMuY29udGV4dCwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAgICwgajtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnNbaV0uZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICAgIGNhc2UgMTogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQpOyBicmVhaztcbiAgICAgICAgY2FzZSAyOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEpOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKCFhcmdzKSBmb3IgKGogPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdGVuZXJzW2ldLmZuLmFwcGx5KGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBuZXcgRXZlbnRMaXN0ZW5lciBmb3IgdGhlIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcylcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGFuIEV2ZW50TGlzdGVuZXIgdGhhdCdzIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcywgdHJ1ZSlcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdlIHdhbnQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIHRoYXQgd2UgbmVlZCB0byBmaW5kLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBPbmx5IHJlbW92ZSBsaXN0ZW5lcnMgbWF0Y2hpbmcgdGhpcyBjb250ZXh0LlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgcmVtb3ZlIG9uY2UgbGlzdGVuZXJzLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbiwgY29udGV4dCwgb25jZSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgZXZlbnRzID0gW107XG5cbiAgaWYgKGZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5mbikge1xuICAgICAgaWYgKFxuICAgICAgICAgICBsaXN0ZW5lcnMuZm4gIT09IGZuXG4gICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnMub25jZSlcbiAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICApIHtcbiAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAgbGlzdGVuZXJzW2ldLmZuICE9PSBmblxuICAgICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnNbaV0ub25jZSlcbiAgICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnNbaV0uY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICAgKSB7XG4gICAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgLy9cbiAgaWYgKGV2ZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9ldmVudHNbZXZ0XSA9IGV2ZW50cy5sZW5ndGggPT09IDEgPyBldmVudHNbMF0gOiBldmVudHM7XG4gIH0gZWxzZSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdhbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuXG4gIGlmIChldmVudCkgZGVsZXRlIHRoaXMuX2V2ZW50c1twcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XTtcbiAgZWxzZSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIHByZWZpeC5cbi8vXG5FdmVudEVtaXR0ZXIucHJlZml4ZWQgPSBwcmVmaXg7XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5pZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG59XG4iLCIndXNlIHN0cmljdCc7XG4vKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuXHRcdHRlc3QxWzVdID0gJ2RlJztcblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDEpWzBdID09PSAnNScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QyID0ge307XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG5cdFx0XHR0ZXN0MlsnXycgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpXSA9IGk7XG5cdFx0fVxuXHRcdHZhciBvcmRlcjIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MikubWFwKGZ1bmN0aW9uIChuKSB7XG5cdFx0XHRyZXR1cm4gdGVzdDJbbl07XG5cdFx0fSk7XG5cdFx0aWYgKG9yZGVyMi5qb2luKCcnKSAhPT0gJzAxMjM0NTY3ODknKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MyA9IHt9O1xuXHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlcikge1xuXHRcdFx0dGVzdDNbbGV0dGVyXSA9IGxldHRlcjtcblx0XHR9KTtcblx0XHRpZiAoT2JqZWN0LmtleXMoT2JqZWN0LmFzc2lnbih7fSwgdGVzdDMpKS5qb2luKCcnKSAhPT1cblx0XHRcdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iLCIvKiFcblx0UGFwYSBQYXJzZVxuXHR2NC4xLjJcblx0aHR0cHM6Ly9naXRodWIuY29tL21ob2x0L1BhcGFQYXJzZVxuKi9cbihmdW5jdGlvbihnbG9iYWwpXG57XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdHZhciBJU19XT1JLRVIgPSAhZ2xvYmFsLmRvY3VtZW50ICYmICEhZ2xvYmFsLnBvc3RNZXNzYWdlLFxuXHRcdElTX1BBUEFfV09SS0VSID0gSVNfV09SS0VSICYmIC8oXFw/fCYpcGFwYXdvcmtlcig9fCZ8JCkvLnRlc3QoZ2xvYmFsLmxvY2F0aW9uLnNlYXJjaCksXG5cdFx0TE9BREVEX1NZTkMgPSBmYWxzZSwgQVVUT19TQ1JJUFRfUEFUSDtcblx0dmFyIHdvcmtlcnMgPSB7fSwgd29ya2VySWRDb3VudGVyID0gMDtcblxuXHR2YXIgUGFwYSA9IHt9O1xuXG5cdFBhcGEucGFyc2UgPSBDc3ZUb0pzb247XG5cdFBhcGEudW5wYXJzZSA9IEpzb25Ub0NzdjtcblxuXHRQYXBhLlJFQ09SRF9TRVAgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDMwKTtcblx0UGFwYS5VTklUX1NFUCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMzEpO1xuXHRQYXBhLkJZVEVfT1JERVJfTUFSSyA9IFwiXFx1ZmVmZlwiO1xuXHRQYXBhLkJBRF9ERUxJTUlURVJTID0gW1wiXFxyXCIsIFwiXFxuXCIsIFwiXFxcIlwiLCBQYXBhLkJZVEVfT1JERVJfTUFSS107XG5cdFBhcGEuV09SS0VSU19TVVBQT1JURUQgPSAhSVNfV09SS0VSICYmICEhZ2xvYmFsLldvcmtlcjtcblx0UGFwYS5TQ1JJUFRfUEFUSCA9IG51bGw7XHQvLyBNdXN0IGJlIHNldCBieSB5b3VyIGNvZGUgaWYgeW91IHVzZSB3b3JrZXJzIGFuZCB0aGlzIGxpYiBpcyBsb2FkZWQgYXN5bmNocm9ub3VzbHlcblxuXHQvLyBDb25maWd1cmFibGUgY2h1bmsgc2l6ZXMgZm9yIGxvY2FsIGFuZCByZW1vdGUgZmlsZXMsIHJlc3BlY3RpdmVseVxuXHRQYXBhLkxvY2FsQ2h1bmtTaXplID0gMTAyNCAqIDEwMjQgKiAxMDtcdC8vIDEwIE1CXG5cdFBhcGEuUmVtb3RlQ2h1bmtTaXplID0gMTAyNCAqIDEwMjQgKiA1O1x0Ly8gNSBNQlxuXHRQYXBhLkRlZmF1bHREZWxpbWl0ZXIgPSBcIixcIjtcdFx0XHQvLyBVc2VkIGlmIG5vdCBzcGVjaWZpZWQgYW5kIGRldGVjdGlvbiBmYWlsc1xuXG5cdC8vIEV4cG9zZWQgZm9yIHRlc3RpbmcgYW5kIGRldmVsb3BtZW50IG9ubHlcblx0UGFwYS5QYXJzZXIgPSBQYXJzZXI7XG5cdFBhcGEuUGFyc2VySGFuZGxlID0gUGFyc2VySGFuZGxlO1xuXHRQYXBhLk5ldHdvcmtTdHJlYW1lciA9IE5ldHdvcmtTdHJlYW1lcjtcblx0UGFwYS5GaWxlU3RyZWFtZXIgPSBGaWxlU3RyZWFtZXI7XG5cdFBhcGEuU3RyaW5nU3RyZWFtZXIgPSBTdHJpbmdTdHJlYW1lcjtcblxuXHRpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdHtcblx0XHQvLyBFeHBvcnQgdG8gTm9kZS4uLlxuXHRcdG1vZHVsZS5leHBvcnRzID0gUGFwYTtcblx0fVxuXHRlbHNlIGlmIChpc0Z1bmN0aW9uKGdsb2JhbC5kZWZpbmUpICYmIGdsb2JhbC5kZWZpbmUuYW1kKVxuXHR7XG5cdFx0Ly8gV2lyZXVwIHdpdGggUmVxdWlyZUpTXG5cdFx0ZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gUGFwYTsgfSk7XG5cdH1cblx0ZWxzZVxuXHR7XG5cdFx0Ly8gLi4ub3IgYXMgYnJvd3NlciBnbG9iYWxcblx0XHRnbG9iYWwuUGFwYSA9IFBhcGE7XG5cdH1cblxuXHRpZiAoZ2xvYmFsLmpRdWVyeSlcblx0e1xuXHRcdHZhciAkID0gZ2xvYmFsLmpRdWVyeTtcblx0XHQkLmZuLnBhcnNlID0gZnVuY3Rpb24ob3B0aW9ucylcblx0XHR7XG5cdFx0XHR2YXIgY29uZmlnID0gb3B0aW9ucy5jb25maWcgfHwge307XG5cdFx0XHR2YXIgcXVldWUgPSBbXTtcblxuXHRcdFx0dGhpcy5lYWNoKGZ1bmN0aW9uKGlkeClcblx0XHRcdHtcblx0XHRcdFx0dmFyIHN1cHBvcnRlZCA9ICQodGhpcykucHJvcCgndGFnTmFtZScpLnRvVXBwZXJDYXNlKCkgPT0gXCJJTlBVVFwiXG5cdFx0XHRcdFx0XHRcdFx0JiYgJCh0aGlzKS5hdHRyKCd0eXBlJykudG9Mb3dlckNhc2UoKSA9PSBcImZpbGVcIlxuXHRcdFx0XHRcdFx0XHRcdCYmIGdsb2JhbC5GaWxlUmVhZGVyO1xuXG5cdFx0XHRcdGlmICghc3VwcG9ydGVkIHx8ICF0aGlzLmZpbGVzIHx8IHRoaXMuZmlsZXMubGVuZ3RoID09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHQvLyBjb250aW51ZSB0byBuZXh0IGlucHV0IGVsZW1lbnRcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZmlsZXMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRxdWV1ZS5wdXNoKHtcblx0XHRcdFx0XHRcdGZpbGU6IHRoaXMuZmlsZXNbaV0sXG5cdFx0XHRcdFx0XHRpbnB1dEVsZW06IHRoaXMsXG5cdFx0XHRcdFx0XHRpbnN0YW5jZUNvbmZpZzogJC5leHRlbmQoe30sIGNvbmZpZylcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHBhcnNlTmV4dEZpbGUoKTtcdC8vIGJlZ2luIHBhcnNpbmdcblx0XHRcdHJldHVybiB0aGlzO1x0XHQvLyBtYWludGFpbnMgY2hhaW5hYmlsaXR5XG5cblxuXHRcdFx0ZnVuY3Rpb24gcGFyc2VOZXh0RmlsZSgpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChxdWV1ZS5sZW5ndGggPT0gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChpc0Z1bmN0aW9uKG9wdGlvbnMuY29tcGxldGUpKVxuXHRcdFx0XHRcdFx0b3B0aW9ucy5jb21wbGV0ZSgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBmID0gcXVldWVbMF07XG5cblx0XHRcdFx0aWYgKGlzRnVuY3Rpb24ob3B0aW9ucy5iZWZvcmUpKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIHJldHVybmVkID0gb3B0aW9ucy5iZWZvcmUoZi5maWxlLCBmLmlucHV0RWxlbSk7XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIHJldHVybmVkID09PSAnb2JqZWN0Jylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAocmV0dXJuZWQuYWN0aW9uID09IFwiYWJvcnRcIilcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0ZXJyb3IoXCJBYm9ydEVycm9yXCIsIGYuZmlsZSwgZi5pbnB1dEVsZW0sIHJldHVybmVkLnJlYXNvbik7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcdC8vIEFib3J0cyBhbGwgcXVldWVkIGZpbGVzIGltbWVkaWF0ZWx5XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGlmIChyZXR1cm5lZC5hY3Rpb24gPT0gXCJza2lwXCIpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGZpbGVDb21wbGV0ZSgpO1x0Ly8gcGFyc2UgdGhlIG5leHQgZmlsZSBpbiB0aGUgcXVldWUsIGlmIGFueVxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgcmV0dXJuZWQuY29uZmlnID09PSAnb2JqZWN0Jylcblx0XHRcdFx0XHRcdFx0Zi5pbnN0YW5jZUNvbmZpZyA9ICQuZXh0ZW5kKGYuaW5zdGFuY2VDb25maWcsIHJldHVybmVkLmNvbmZpZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKHJldHVybmVkID09IFwic2tpcFwiKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZpbGVDb21wbGV0ZSgpO1x0Ly8gcGFyc2UgdGhlIG5leHQgZmlsZSBpbiB0aGUgcXVldWUsIGlmIGFueVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFdyYXAgdXAgdGhlIHVzZXIncyBjb21wbGV0ZSBjYWxsYmFjaywgaWYgYW55LCBzbyB0aGF0IG91cnMgYWxzbyBnZXRzIGV4ZWN1dGVkXG5cdFx0XHRcdHZhciB1c2VyQ29tcGxldGVGdW5jID0gZi5pbnN0YW5jZUNvbmZpZy5jb21wbGV0ZTtcblx0XHRcdFx0Zi5pbnN0YW5jZUNvbmZpZy5jb21wbGV0ZSA9IGZ1bmN0aW9uKHJlc3VsdHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoaXNGdW5jdGlvbih1c2VyQ29tcGxldGVGdW5jKSlcblx0XHRcdFx0XHRcdHVzZXJDb21wbGV0ZUZ1bmMocmVzdWx0cywgZi5maWxlLCBmLmlucHV0RWxlbSk7XG5cdFx0XHRcdFx0ZmlsZUNvbXBsZXRlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0UGFwYS5wYXJzZShmLmZpbGUsIGYuaW5zdGFuY2VDb25maWcpO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBlcnJvcihuYW1lLCBmaWxlLCBlbGVtLCByZWFzb24pXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChpc0Z1bmN0aW9uKG9wdGlvbnMuZXJyb3IpKVxuXHRcdFx0XHRcdG9wdGlvbnMuZXJyb3Ioe25hbWU6IG5hbWV9LCBmaWxlLCBlbGVtLCByZWFzb24pO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBmaWxlQ29tcGxldGUoKVxuXHRcdFx0e1xuXHRcdFx0XHRxdWV1ZS5zcGxpY2UoMCwgMSk7XG5cdFx0XHRcdHBhcnNlTmV4dEZpbGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXG5cdGlmIChJU19QQVBBX1dPUktFUilcblx0e1xuXHRcdGdsb2JhbC5vbm1lc3NhZ2UgPSB3b3JrZXJUaHJlYWRSZWNlaXZlZE1lc3NhZ2U7XG5cdH1cblx0ZWxzZSBpZiAoUGFwYS5XT1JLRVJTX1NVUFBPUlRFRClcblx0e1xuXHRcdEFVVE9fU0NSSVBUX1BBVEggPSBnZXRTY3JpcHRQYXRoKCk7XG5cblx0XHQvLyBDaGVjayBpZiB0aGUgc2NyaXB0IHdhcyBsb2FkZWQgc3luY2hyb25vdXNseVxuXHRcdGlmICghZG9jdW1lbnQuYm9keSlcblx0XHR7XG5cdFx0XHQvLyBCb2R5IGRvZXNuJ3QgZXhpc3QgeWV0LCBtdXN0IGJlIHN5bmNocm9ub3VzXG5cdFx0XHRMT0FERURfU1lOQyA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRMT0FERURfU1lOQyA9IHRydWU7XG5cdFx0XHR9LCB0cnVlKTtcblx0XHR9XG5cdH1cblxuXG5cblxuXHRmdW5jdGlvbiBDc3ZUb0pzb24oX2lucHV0LCBfY29uZmlnKVxuXHR7XG5cdFx0X2NvbmZpZyA9IF9jb25maWcgfHwge307XG5cblx0XHRpZiAoX2NvbmZpZy53b3JrZXIgJiYgUGFwYS5XT1JLRVJTX1NVUFBPUlRFRClcblx0XHR7XG5cdFx0XHR2YXIgdyA9IG5ld1dvcmtlcigpO1xuXG5cdFx0XHR3LnVzZXJTdGVwID0gX2NvbmZpZy5zdGVwO1xuXHRcdFx0dy51c2VyQ2h1bmsgPSBfY29uZmlnLmNodW5rO1xuXHRcdFx0dy51c2VyQ29tcGxldGUgPSBfY29uZmlnLmNvbXBsZXRlO1xuXHRcdFx0dy51c2VyRXJyb3IgPSBfY29uZmlnLmVycm9yO1xuXG5cdFx0XHRfY29uZmlnLnN0ZXAgPSBpc0Z1bmN0aW9uKF9jb25maWcuc3RlcCk7XG5cdFx0XHRfY29uZmlnLmNodW5rID0gaXNGdW5jdGlvbihfY29uZmlnLmNodW5rKTtcblx0XHRcdF9jb25maWcuY29tcGxldGUgPSBpc0Z1bmN0aW9uKF9jb25maWcuY29tcGxldGUpO1xuXHRcdFx0X2NvbmZpZy5lcnJvciA9IGlzRnVuY3Rpb24oX2NvbmZpZy5lcnJvcik7XG5cdFx0XHRkZWxldGUgX2NvbmZpZy53b3JrZXI7XHQvLyBwcmV2ZW50IGluZmluaXRlIGxvb3BcblxuXHRcdFx0dy5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdGlucHV0OiBfaW5wdXQsXG5cdFx0XHRcdGNvbmZpZzogX2NvbmZpZyxcblx0XHRcdFx0d29ya2VySWQ6IHcuaWRcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHN0cmVhbWVyID0gbnVsbDtcblx0XHRpZiAodHlwZW9mIF9pbnB1dCA9PT0gJ3N0cmluZycpXG5cdFx0e1xuXHRcdFx0aWYgKF9jb25maWcuZG93bmxvYWQpXG5cdFx0XHRcdHN0cmVhbWVyID0gbmV3IE5ldHdvcmtTdHJlYW1lcihfY29uZmlnKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c3RyZWFtZXIgPSBuZXcgU3RyaW5nU3RyZWFtZXIoX2NvbmZpZyk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKChnbG9iYWwuRmlsZSAmJiBfaW5wdXQgaW5zdGFuY2VvZiBGaWxlKSB8fCBfaW5wdXQgaW5zdGFuY2VvZiBPYmplY3QpXHQvLyAuLi5TYWZhcmkuIChzZWUgaXNzdWUgIzEwNilcblx0XHRcdHN0cmVhbWVyID0gbmV3IEZpbGVTdHJlYW1lcihfY29uZmlnKTtcblxuXHRcdHJldHVybiBzdHJlYW1lci5zdHJlYW0oX2lucHV0KTtcblx0fVxuXG5cblxuXG5cblxuXHRmdW5jdGlvbiBKc29uVG9Dc3YoX2lucHV0LCBfY29uZmlnKVxuXHR7XG5cdFx0dmFyIF9vdXRwdXQgPSBcIlwiO1xuXHRcdHZhciBfZmllbGRzID0gW107XG5cblx0XHQvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cblxuXHRcdC8qKiB3aGV0aGVyIHRvIHN1cnJvdW5kIGV2ZXJ5IGRhdHVtIHdpdGggcXVvdGVzICovXG5cdFx0dmFyIF9xdW90ZXMgPSBmYWxzZTtcblxuXHRcdC8qKiBkZWxpbWl0aW5nIGNoYXJhY3RlciAqL1xuXHRcdHZhciBfZGVsaW1pdGVyID0gXCIsXCI7XG5cblx0XHQvKiogbmV3bGluZSBjaGFyYWN0ZXIocykgKi9cblx0XHR2YXIgX25ld2xpbmUgPSBcIlxcclxcblwiO1xuXG5cdFx0dW5wYWNrQ29uZmlnKCk7XG5cblx0XHRpZiAodHlwZW9mIF9pbnB1dCA9PT0gJ3N0cmluZycpXG5cdFx0XHRfaW5wdXQgPSBKU09OLnBhcnNlKF9pbnB1dCk7XG5cblx0XHRpZiAoX2lucHV0IGluc3RhbmNlb2YgQXJyYXkpXG5cdFx0e1xuXHRcdFx0aWYgKCFfaW5wdXQubGVuZ3RoIHx8IF9pbnB1dFswXSBpbnN0YW5jZW9mIEFycmF5KVxuXHRcdFx0XHRyZXR1cm4gc2VyaWFsaXplKG51bGwsIF9pbnB1dCk7XG5cdFx0XHRlbHNlIGlmICh0eXBlb2YgX2lucHV0WzBdID09PSAnb2JqZWN0Jylcblx0XHRcdFx0cmV0dXJuIHNlcmlhbGl6ZShvYmplY3RLZXlzKF9pbnB1dFswXSksIF9pbnB1dCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHR5cGVvZiBfaW5wdXQgPT09ICdvYmplY3QnKVxuXHRcdHtcblx0XHRcdGlmICh0eXBlb2YgX2lucHV0LmRhdGEgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRfaW5wdXQuZGF0YSA9IEpTT04ucGFyc2UoX2lucHV0LmRhdGEpO1xuXG5cdFx0XHRpZiAoX2lucHV0LmRhdGEgaW5zdGFuY2VvZiBBcnJheSlcblx0XHRcdHtcblx0XHRcdFx0aWYgKCFfaW5wdXQuZmllbGRzKVxuXHRcdFx0XHRcdF9pbnB1dC5maWVsZHMgPSBfaW5wdXQuZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5XG5cdFx0XHRcdFx0XHRcdFx0XHQ/IF9pbnB1dC5maWVsZHNcblx0XHRcdFx0XHRcdFx0XHRcdDogb2JqZWN0S2V5cyhfaW5wdXQuZGF0YVswXSk7XG5cblx0XHRcdFx0aWYgKCEoX2lucHV0LmRhdGFbMF0gaW5zdGFuY2VvZiBBcnJheSkgJiYgdHlwZW9mIF9pbnB1dC5kYXRhWzBdICE9PSAnb2JqZWN0Jylcblx0XHRcdFx0XHRfaW5wdXQuZGF0YSA9IFtfaW5wdXQuZGF0YV07XHQvLyBoYW5kbGVzIGlucHV0IGxpa2UgWzEsMiwzXSBvciBbXCJhc2RmXCJdXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBzZXJpYWxpemUoX2lucHV0LmZpZWxkcyB8fCBbXSwgX2lucHV0LmRhdGEgfHwgW10pO1xuXHRcdH1cblxuXHRcdC8vIERlZmF1bHQgKGFueSB2YWxpZCBwYXRocyBzaG91bGQgcmV0dXJuIGJlZm9yZSB0aGlzKVxuXHRcdHRocm93IFwiZXhjZXB0aW9uOiBVbmFibGUgdG8gc2VyaWFsaXplIHVucmVjb2duaXplZCBpbnB1dFwiO1xuXG5cblx0XHRmdW5jdGlvbiB1bnBhY2tDb25maWcoKVxuXHRcdHtcblx0XHRcdGlmICh0eXBlb2YgX2NvbmZpZyAhPT0gJ29iamVjdCcpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKHR5cGVvZiBfY29uZmlnLmRlbGltaXRlciA9PT0gJ3N0cmluZydcblx0XHRcdFx0JiYgX2NvbmZpZy5kZWxpbWl0ZXIubGVuZ3RoID09IDFcblx0XHRcdFx0JiYgUGFwYS5CQURfREVMSU1JVEVSUy5pbmRleE9mKF9jb25maWcuZGVsaW1pdGVyKSA9PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0X2RlbGltaXRlciA9IF9jb25maWcuZGVsaW1pdGVyO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mIF9jb25maWcucXVvdGVzID09PSAnYm9vbGVhbidcblx0XHRcdFx0fHwgX2NvbmZpZy5xdW90ZXMgaW5zdGFuY2VvZiBBcnJheSlcblx0XHRcdFx0X3F1b3RlcyA9IF9jb25maWcucXVvdGVzO1xuXG5cdFx0XHRpZiAodHlwZW9mIF9jb25maWcubmV3bGluZSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdF9uZXdsaW5lID0gX2NvbmZpZy5uZXdsaW5lO1xuXHRcdH1cblxuXG5cdFx0LyoqIFR1cm5zIGFuIG9iamVjdCdzIGtleXMgaW50byBhbiBhcnJheSAqL1xuXHRcdGZ1bmN0aW9uIG9iamVjdEtleXMob2JqKVxuXHRcdHtcblx0XHRcdGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jylcblx0XHRcdFx0cmV0dXJuIFtdO1xuXHRcdFx0dmFyIGtleXMgPSBbXTtcblx0XHRcdGZvciAodmFyIGtleSBpbiBvYmopXG5cdFx0XHRcdGtleXMucHVzaChrZXkpO1xuXHRcdFx0cmV0dXJuIGtleXM7XG5cdFx0fVxuXG5cdFx0LyoqIFRoZSBkb3VibGUgZm9yIGxvb3AgdGhhdCBpdGVyYXRlcyB0aGUgZGF0YSBhbmQgd3JpdGVzIG91dCBhIENTViBzdHJpbmcgaW5jbHVkaW5nIGhlYWRlciByb3cgKi9cblx0XHRmdW5jdGlvbiBzZXJpYWxpemUoZmllbGRzLCBkYXRhKVxuXHRcdHtcblx0XHRcdHZhciBjc3YgPSBcIlwiO1xuXG5cdFx0XHRpZiAodHlwZW9mIGZpZWxkcyA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdGZpZWxkcyA9IEpTT04ucGFyc2UoZmllbGRzKTtcblx0XHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG5cdFx0XHR2YXIgaGFzSGVhZGVyID0gZmllbGRzIGluc3RhbmNlb2YgQXJyYXkgJiYgZmllbGRzLmxlbmd0aCA+IDA7XG5cdFx0XHR2YXIgZGF0YUtleWVkQnlGaWVsZCA9ICEoZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KTtcblxuXHRcdFx0Ly8gSWYgdGhlcmUgYSBoZWFkZXIgcm93LCB3cml0ZSBpdCBmaXJzdFxuXHRcdFx0aWYgKGhhc0hlYWRlcilcblx0XHRcdHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoaSA+IDApXG5cdFx0XHRcdFx0XHRjc3YgKz0gX2RlbGltaXRlcjtcblx0XHRcdFx0XHRjc3YgKz0gc2FmZShmaWVsZHNbaV0sIGkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkYXRhLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0Y3N2ICs9IF9uZXdsaW5lO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUaGVuIHdyaXRlIG91dCB0aGUgZGF0YVxuXHRcdFx0Zm9yICh2YXIgcm93ID0gMDsgcm93IDwgZGF0YS5sZW5ndGg7IHJvdysrKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgbWF4Q29sID0gaGFzSGVhZGVyID8gZmllbGRzLmxlbmd0aCA6IGRhdGFbcm93XS5sZW5ndGg7XG5cblx0XHRcdFx0Zm9yICh2YXIgY29sID0gMDsgY29sIDwgbWF4Q29sOyBjb2wrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChjb2wgPiAwKVxuXHRcdFx0XHRcdFx0Y3N2ICs9IF9kZWxpbWl0ZXI7XG5cdFx0XHRcdFx0dmFyIGNvbElkeCA9IGhhc0hlYWRlciAmJiBkYXRhS2V5ZWRCeUZpZWxkID8gZmllbGRzW2NvbF0gOiBjb2w7XG5cdFx0XHRcdFx0Y3N2ICs9IHNhZmUoZGF0YVtyb3ddW2NvbElkeF0sIGNvbCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocm93IDwgZGF0YS5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdGNzdiArPSBfbmV3bGluZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGNzdjtcblx0XHR9XG5cblx0XHQvKiogRW5jbG9zZXMgYSB2YWx1ZSBhcm91bmQgcXVvdGVzIGlmIG5lZWRlZCAobWFrZXMgYSB2YWx1ZSBzYWZlIGZvciBDU1YgaW5zZXJ0aW9uKSAqL1xuXHRcdGZ1bmN0aW9uIHNhZmUoc3RyLCBjb2wpXG5cdFx0e1xuXHRcdFx0aWYgKHR5cGVvZiBzdHIgPT09IFwidW5kZWZpbmVkXCIgfHwgc3RyID09PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gXCJcIjtcblxuXHRcdFx0c3RyID0gc3RyLnRvU3RyaW5nKCkucmVwbGFjZSgvXCIvZywgJ1wiXCInKTtcblxuXHRcdFx0dmFyIG5lZWRzUXVvdGVzID0gKHR5cGVvZiBfcXVvdGVzID09PSAnYm9vbGVhbicgJiYgX3F1b3Rlcylcblx0XHRcdFx0XHRcdFx0fHwgKF9xdW90ZXMgaW5zdGFuY2VvZiBBcnJheSAmJiBfcXVvdGVzW2NvbF0pXG5cdFx0XHRcdFx0XHRcdHx8IGhhc0FueShzdHIsIFBhcGEuQkFEX0RFTElNSVRFUlMpXG5cdFx0XHRcdFx0XHRcdHx8IHN0ci5pbmRleE9mKF9kZWxpbWl0ZXIpID4gLTFcblx0XHRcdFx0XHRcdFx0fHwgc3RyLmNoYXJBdCgwKSA9PSAnICdcblx0XHRcdFx0XHRcdFx0fHwgc3RyLmNoYXJBdChzdHIubGVuZ3RoIC0gMSkgPT0gJyAnO1xuXG5cdFx0XHRyZXR1cm4gbmVlZHNRdW90ZXMgPyAnXCInICsgc3RyICsgJ1wiJyA6IHN0cjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBoYXNBbnkoc3RyLCBzdWJzdHJpbmdzKVxuXHRcdHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic3RyaW5ncy5sZW5ndGg7IGkrKylcblx0XHRcdFx0aWYgKHN0ci5pbmRleE9mKHN1YnN0cmluZ3NbaV0pID4gLTEpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0LyoqIENodW5rU3RyZWFtZXIgaXMgdGhlIGJhc2UgcHJvdG90eXBlIGZvciB2YXJpb3VzIHN0cmVhbWVyIGltcGxlbWVudGF0aW9ucy4gKi9cblx0ZnVuY3Rpb24gQ2h1bmtTdHJlYW1lcihjb25maWcpXG5cdHtcblx0XHR0aGlzLl9oYW5kbGUgPSBudWxsO1xuXHRcdHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuXHRcdHRoaXMuX2ZpbmlzaGVkID0gZmFsc2U7XG5cdFx0dGhpcy5faW5wdXQgPSBudWxsO1xuXHRcdHRoaXMuX2Jhc2VJbmRleCA9IDA7XG5cdFx0dGhpcy5fcGFydGlhbExpbmUgPSBcIlwiO1xuXHRcdHRoaXMuX3Jvd0NvdW50ID0gMDtcblx0XHR0aGlzLl9zdGFydCA9IDA7XG5cdFx0dGhpcy5fbmV4dENodW5rID0gbnVsbDtcblx0XHR0aGlzLmlzRmlyc3RDaHVuayA9IHRydWU7XG5cdFx0dGhpcy5fY29tcGxldGVSZXN1bHRzID0ge1xuXHRcdFx0ZGF0YTogW10sXG5cdFx0XHRlcnJvcnM6IFtdLFxuXHRcdFx0bWV0YToge31cblx0XHR9O1xuXHRcdHJlcGxhY2VDb25maWcuY2FsbCh0aGlzLCBjb25maWcpO1xuXG5cdFx0dGhpcy5wYXJzZUNodW5rID0gZnVuY3Rpb24oY2h1bmspXG5cdFx0e1xuXHRcdFx0Ly8gRmlyc3QgY2h1bmsgcHJlLXByb2Nlc3Npbmdcblx0XHRcdGlmICh0aGlzLmlzRmlyc3RDaHVuayAmJiBpc0Z1bmN0aW9uKHRoaXMuX2NvbmZpZy5iZWZvcmVGaXJzdENodW5rKSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIG1vZGlmaWVkQ2h1bmsgPSB0aGlzLl9jb25maWcuYmVmb3JlRmlyc3RDaHVuayhjaHVuayk7XG5cdFx0XHRcdGlmIChtb2RpZmllZENodW5rICE9PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0Y2h1bmsgPSBtb2RpZmllZENodW5rO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc0ZpcnN0Q2h1bmsgPSBmYWxzZTtcblxuXHRcdFx0Ly8gUmVqb2luIHRoZSBsaW5lIHdlIGxpa2VseSBqdXN0IHNwbGl0IGluIHR3byBieSBjaHVua2luZyB0aGUgZmlsZVxuXHRcdFx0dmFyIGFnZ3JlZ2F0ZSA9IHRoaXMuX3BhcnRpYWxMaW5lICsgY2h1bms7XG5cdFx0XHR0aGlzLl9wYXJ0aWFsTGluZSA9IFwiXCI7XG5cblx0XHRcdHZhciByZXN1bHRzID0gdGhpcy5faGFuZGxlLnBhcnNlKGFnZ3JlZ2F0ZSwgdGhpcy5fYmFzZUluZGV4LCAhdGhpcy5fZmluaXNoZWQpO1xuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5faGFuZGxlLnBhdXNlZCgpIHx8IHRoaXMuX2hhbmRsZS5hYm9ydGVkKCkpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0dmFyIGxhc3RJbmRleCA9IHJlc3VsdHMubWV0YS5jdXJzb3I7XG5cdFx0XHRcblx0XHRcdGlmICghdGhpcy5fZmluaXNoZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3BhcnRpYWxMaW5lID0gYWdncmVnYXRlLnN1YnN0cmluZyhsYXN0SW5kZXggLSB0aGlzLl9iYXNlSW5kZXgpO1xuXHRcdFx0XHR0aGlzLl9iYXNlSW5kZXggPSBsYXN0SW5kZXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXN1bHRzICYmIHJlc3VsdHMuZGF0YSlcblx0XHRcdFx0dGhpcy5fcm93Q291bnQgKz0gcmVzdWx0cy5kYXRhLmxlbmd0aDtcblxuXHRcdFx0dmFyIGZpbmlzaGVkSW5jbHVkaW5nUHJldmlldyA9IHRoaXMuX2ZpbmlzaGVkIHx8ICh0aGlzLl9jb25maWcucHJldmlldyAmJiB0aGlzLl9yb3dDb3VudCA+PSB0aGlzLl9jb25maWcucHJldmlldyk7XG5cblx0XHRcdGlmIChJU19QQVBBX1dPUktFUilcblx0XHRcdHtcblx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHRyZXN1bHRzOiByZXN1bHRzLFxuXHRcdFx0XHRcdHdvcmtlcklkOiBQYXBhLldPUktFUl9JRCxcblx0XHRcdFx0XHRmaW5pc2hlZDogZmluaXNoZWRJbmNsdWRpbmdQcmV2aWV3XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9jb25maWcuY2h1bmspKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9jb25maWcuY2h1bmsocmVzdWx0cywgdGhpcy5faGFuZGxlKTtcblx0XHRcdFx0aWYgKHRoaXMuX3BhdXNlZClcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdHJlc3VsdHMgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdHRoaXMuX2NvbXBsZXRlUmVzdWx0cyA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCF0aGlzLl9jb25maWcuc3RlcCAmJiAhdGhpcy5fY29uZmlnLmNodW5rKSB7XG5cdFx0XHRcdHRoaXMuX2NvbXBsZXRlUmVzdWx0cy5kYXRhID0gdGhpcy5fY29tcGxldGVSZXN1bHRzLmRhdGEuY29uY2F0KHJlc3VsdHMuZGF0YSk7XG5cdFx0XHRcdHRoaXMuX2NvbXBsZXRlUmVzdWx0cy5lcnJvcnMgPSB0aGlzLl9jb21wbGV0ZVJlc3VsdHMuZXJyb3JzLmNvbmNhdChyZXN1bHRzLmVycm9ycyk7XG5cdFx0XHRcdHRoaXMuX2NvbXBsZXRlUmVzdWx0cy5tZXRhID0gcmVzdWx0cy5tZXRhO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZmluaXNoZWRJbmNsdWRpbmdQcmV2aWV3ICYmIGlzRnVuY3Rpb24odGhpcy5fY29uZmlnLmNvbXBsZXRlKSAmJiAoIXJlc3VsdHMgfHwgIXJlc3VsdHMubWV0YS5hYm9ydGVkKSlcblx0XHRcdFx0dGhpcy5fY29uZmlnLmNvbXBsZXRlKHRoaXMuX2NvbXBsZXRlUmVzdWx0cyk7XG5cblx0XHRcdGlmICghZmluaXNoZWRJbmNsdWRpbmdQcmV2aWV3ICYmICghcmVzdWx0cyB8fCAhcmVzdWx0cy5tZXRhLnBhdXNlZCkpXG5cdFx0XHRcdHRoaXMuX25leHRDaHVuaygpO1xuXG5cdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHR9O1xuXG5cdFx0dGhpcy5fc2VuZEVycm9yID0gZnVuY3Rpb24oZXJyb3IpXG5cdFx0e1xuXHRcdFx0aWYgKGlzRnVuY3Rpb24odGhpcy5fY29uZmlnLmVycm9yKSlcblx0XHRcdFx0dGhpcy5fY29uZmlnLmVycm9yKGVycm9yKTtcblx0XHRcdGVsc2UgaWYgKElTX1BBUEFfV09SS0VSICYmIHRoaXMuX2NvbmZpZy5lcnJvcilcblx0XHRcdHtcblx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHR3b3JrZXJJZDogUGFwYS5XT1JLRVJfSUQsXG5cdFx0XHRcdFx0ZXJyb3I6IGVycm9yLFxuXHRcdFx0XHRcdGZpbmlzaGVkOiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gcmVwbGFjZUNvbmZpZyhjb25maWcpXG5cdFx0e1xuXHRcdFx0Ly8gRGVlcC1jb3B5IHRoZSBjb25maWcgc28gd2UgY2FuIGVkaXQgaXRcblx0XHRcdHZhciBjb25maWdDb3B5ID0gY29weShjb25maWcpO1xuXHRcdFx0Y29uZmlnQ29weS5jaHVua1NpemUgPSBwYXJzZUludChjb25maWdDb3B5LmNodW5rU2l6ZSk7XHQvLyBwYXJzZUludCBWRVJZIGltcG9ydGFudCBzbyB3ZSBkb24ndCBjb25jYXRlbmF0ZSBzdHJpbmdzIVxuXHRcdFx0aWYgKCFjb25maWcuc3RlcCAmJiAhY29uZmlnLmNodW5rKVxuXHRcdFx0XHRjb25maWdDb3B5LmNodW5rU2l6ZSA9IG51bGw7ICAvLyBkaXNhYmxlIFJhbmdlIGhlYWRlciBpZiBub3Qgc3RyZWFtaW5nOyBiYWQgdmFsdWVzIGJyZWFrIElJUyAtIHNlZSBpc3N1ZSAjMTk2XG5cdFx0XHR0aGlzLl9oYW5kbGUgPSBuZXcgUGFyc2VySGFuZGxlKGNvbmZpZ0NvcHkpO1xuXHRcdFx0dGhpcy5faGFuZGxlLnN0cmVhbWVyID0gdGhpcztcblx0XHRcdHRoaXMuX2NvbmZpZyA9IGNvbmZpZ0NvcHk7XHQvLyBwZXJzaXN0IHRoZSBjb3B5IHRvIHRoZSBjYWxsZXJcblx0XHR9XG5cdH1cblxuXG5cdGZ1bmN0aW9uIE5ldHdvcmtTdHJlYW1lcihjb25maWcpXG5cdHtcblx0XHRjb25maWcgPSBjb25maWcgfHwge307XG5cdFx0aWYgKCFjb25maWcuY2h1bmtTaXplKVxuXHRcdFx0Y29uZmlnLmNodW5rU2l6ZSA9IFBhcGEuUmVtb3RlQ2h1bmtTaXplO1xuXHRcdENodW5rU3RyZWFtZXIuY2FsbCh0aGlzLCBjb25maWcpO1xuXG5cdFx0dmFyIHhocjtcblxuXHRcdGlmIChJU19XT1JLRVIpXG5cdFx0e1xuXHRcdFx0dGhpcy5fbmV4dENodW5rID0gZnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWFkQ2h1bmsoKTtcblx0XHRcdFx0dGhpcy5fY2h1bmtMb2FkZWQoKTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLl9uZXh0Q2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlYWRDaHVuaygpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0aGlzLnN0cmVhbSA9IGZ1bmN0aW9uKHVybClcblx0XHR7XG5cdFx0XHR0aGlzLl9pbnB1dCA9IHVybDtcblx0XHRcdHRoaXMuX25leHRDaHVuaygpO1x0Ly8gU3RhcnRzIHN0cmVhbWluZ1xuXHRcdH07XG5cblx0XHR0aGlzLl9yZWFkQ2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuX2ZpbmlzaGVkKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9jaHVua0xvYWRlZCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIUlTX1dPUktFUilcblx0XHRcdHtcblx0XHRcdFx0eGhyLm9ubG9hZCA9IGJpbmRGdW5jdGlvbih0aGlzLl9jaHVua0xvYWRlZCwgdGhpcyk7XG5cdFx0XHRcdHhoci5vbmVycm9yID0gYmluZEZ1bmN0aW9uKHRoaXMuX2NodW5rRXJyb3IsIHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHR4aHIub3BlbihcIkdFVFwiLCB0aGlzLl9pbnB1dCwgIUlTX1dPUktFUik7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLl9jb25maWcuY2h1bmtTaXplKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZW5kID0gdGhpcy5fc3RhcnQgKyB0aGlzLl9jb25maWcuY2h1bmtTaXplIC0gMTtcdC8vIG1pbnVzIG9uZSBiZWNhdXNlIGJ5dGUgcmFuZ2UgaXMgaW5jbHVzaXZlXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiUmFuZ2VcIiwgXCJieXRlcz1cIit0aGlzLl9zdGFydCtcIi1cIitlbmQpO1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihcIklmLU5vbmUtTWF0Y2hcIiwgXCJ3ZWJraXQtbm8tY2FjaGVcIik7IC8vIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MjY3MlxuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR4aHIuc2VuZCgpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGVycikge1xuXHRcdFx0XHR0aGlzLl9jaHVua0Vycm9yKGVyci5tZXNzYWdlKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKElTX1dPUktFUiAmJiB4aHIuc3RhdHVzID09IDApXG5cdFx0XHRcdHRoaXMuX2NodW5rRXJyb3IoKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dGhpcy5fc3RhcnQgKz0gdGhpcy5fY29uZmlnLmNodW5rU2l6ZTtcblx0XHR9XG5cblx0XHR0aGlzLl9jaHVua0xvYWRlZCA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgIT0gNClcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA8IDIwMCB8fCB4aHIuc3RhdHVzID49IDQwMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fY2h1bmtFcnJvcigpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX2ZpbmlzaGVkID0gIXRoaXMuX2NvbmZpZy5jaHVua1NpemUgfHwgdGhpcy5fc3RhcnQgPiBnZXRGaWxlU2l6ZSh4aHIpO1xuXHRcdFx0dGhpcy5wYXJzZUNodW5rKHhoci5yZXNwb25zZVRleHQpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2NodW5rRXJyb3IgPSBmdW5jdGlvbihlcnJvck1lc3NhZ2UpXG5cdFx0e1xuXHRcdFx0dmFyIGVycm9yVGV4dCA9IHhoci5zdGF0dXNUZXh0IHx8IGVycm9yTWVzc2FnZTtcblx0XHRcdHRoaXMuX3NlbmRFcnJvcihlcnJvclRleHQpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEZpbGVTaXplKHhocilcblx0XHR7XG5cdFx0XHR2YXIgY29udGVudFJhbmdlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1SYW5nZVwiKTtcblx0XHRcdHJldHVybiBwYXJzZUludChjb250ZW50UmFuZ2Uuc3Vic3RyKGNvbnRlbnRSYW5nZS5sYXN0SW5kZXhPZihcIi9cIikgKyAxKSk7XG5cdFx0fVxuXHR9XG5cdE5ldHdvcmtTdHJlYW1lci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENodW5rU3RyZWFtZXIucHJvdG90eXBlKTtcblx0TmV0d29ya1N0cmVhbWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE5ldHdvcmtTdHJlYW1lcjtcblxuXG5cdGZ1bmN0aW9uIEZpbGVTdHJlYW1lcihjb25maWcpXG5cdHtcblx0XHRjb25maWcgPSBjb25maWcgfHwge307XG5cdFx0aWYgKCFjb25maWcuY2h1bmtTaXplKVxuXHRcdFx0Y29uZmlnLmNodW5rU2l6ZSA9IFBhcGEuTG9jYWxDaHVua1NpemU7XG5cdFx0Q2h1bmtTdHJlYW1lci5jYWxsKHRoaXMsIGNvbmZpZyk7XG5cblx0XHR2YXIgcmVhZGVyLCBzbGljZTtcblxuXHRcdC8vIEZpbGVSZWFkZXIgaXMgYmV0dGVyIHRoYW4gRmlsZVJlYWRlclN5bmMgKGV2ZW4gaW4gd29ya2VyKSAtIHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcS8yNDcwODY0OS8xMDQ4ODYyXG5cdFx0Ly8gQnV0IEZpcmVmb3ggaXMgYSBwaWxsLCB0b28gLSBzZWUgaXNzdWUgIzc2OiBodHRwczovL2dpdGh1Yi5jb20vbWhvbHQvUGFwYVBhcnNlL2lzc3Vlcy83NlxuXHRcdHZhciB1c2luZ0FzeW5jUmVhZGVyID0gdHlwZW9mIEZpbGVSZWFkZXIgIT09ICd1bmRlZmluZWQnO1x0Ly8gU2FmYXJpIGRvZXNuJ3QgY29uc2lkZXIgaXQgYSBmdW5jdGlvbiAtIHNlZSBpc3N1ZSAjMTA1XG5cblx0XHR0aGlzLnN0cmVhbSA9IGZ1bmN0aW9uKGZpbGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5faW5wdXQgPSBmaWxlO1xuXHRcdFx0c2xpY2UgPSBmaWxlLnNsaWNlIHx8IGZpbGUud2Via2l0U2xpY2UgfHwgZmlsZS5tb3pTbGljZTtcblxuXHRcdFx0aWYgKHVzaW5nQXN5bmNSZWFkZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHRcdC8vIFByZWZlcnJlZCBtZXRob2Qgb2YgcmVhZGluZyBmaWxlcywgZXZlbiBpbiB3b3JrZXJzXG5cdFx0XHRcdHJlYWRlci5vbmxvYWQgPSBiaW5kRnVuY3Rpb24odGhpcy5fY2h1bmtMb2FkZWQsIHRoaXMpO1xuXHRcdFx0XHRyZWFkZXIub25lcnJvciA9IGJpbmRGdW5jdGlvbih0aGlzLl9jaHVua0Vycm9yLCB0aGlzKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdFx0cmVhZGVyID0gbmV3IEZpbGVSZWFkZXJTeW5jKCk7XHQvLyBIYWNrIGZvciBydW5uaW5nIGluIGEgd2ViIHdvcmtlciBpbiBGaXJlZm94XG5cblx0XHRcdHRoaXMuX25leHRDaHVuaygpO1x0Ly8gU3RhcnRzIHN0cmVhbWluZ1xuXHRcdH07XG5cblx0XHR0aGlzLl9uZXh0Q2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLl9maW5pc2hlZCAmJiAoIXRoaXMuX2NvbmZpZy5wcmV2aWV3IHx8IHRoaXMuX3Jvd0NvdW50IDwgdGhpcy5fY29uZmlnLnByZXZpZXcpKVxuXHRcdFx0XHR0aGlzLl9yZWFkQ2h1bmsoKTtcblx0XHR9XG5cblx0XHR0aGlzLl9yZWFkQ2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0dmFyIGlucHV0ID0gdGhpcy5faW5wdXQ7XG5cdFx0XHRpZiAodGhpcy5fY29uZmlnLmNodW5rU2l6ZSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIGVuZCA9IE1hdGgubWluKHRoaXMuX3N0YXJ0ICsgdGhpcy5fY29uZmlnLmNodW5rU2l6ZSwgdGhpcy5faW5wdXQuc2l6ZSk7XG5cdFx0XHRcdGlucHV0ID0gc2xpY2UuY2FsbChpbnB1dCwgdGhpcy5fc3RhcnQsIGVuZCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgdHh0ID0gcmVhZGVyLnJlYWRBc1RleHQoaW5wdXQsIHRoaXMuX2NvbmZpZy5lbmNvZGluZyk7XG5cdFx0XHRpZiAoIXVzaW5nQXN5bmNSZWFkZXIpXG5cdFx0XHRcdHRoaXMuX2NodW5rTG9hZGVkKHsgdGFyZ2V0OiB7IHJlc3VsdDogdHh0IH0gfSk7XHQvLyBtaW1pYyB0aGUgYXN5bmMgc2lnbmF0dXJlXG5cdFx0fVxuXG5cdFx0dGhpcy5fY2h1bmtMb2FkZWQgPSBmdW5jdGlvbihldmVudClcblx0XHR7XG5cdFx0XHQvLyBWZXJ5IGltcG9ydGFudCB0byBpbmNyZW1lbnQgc3RhcnQgZWFjaCB0aW1lIGJlZm9yZSBoYW5kbGluZyByZXN1bHRzXG5cdFx0XHR0aGlzLl9zdGFydCArPSB0aGlzLl9jb25maWcuY2h1bmtTaXplO1xuXHRcdFx0dGhpcy5fZmluaXNoZWQgPSAhdGhpcy5fY29uZmlnLmNodW5rU2l6ZSB8fCB0aGlzLl9zdGFydCA+PSB0aGlzLl9pbnB1dC5zaXplO1xuXHRcdFx0dGhpcy5wYXJzZUNodW5rKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2NodW5rRXJyb3IgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0dGhpcy5fc2VuZEVycm9yKHJlYWRlci5lcnJvcik7XG5cdFx0fVxuXG5cdH1cblx0RmlsZVN0cmVhbWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ2h1bmtTdHJlYW1lci5wcm90b3R5cGUpO1xuXHRGaWxlU3RyZWFtZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRmlsZVN0cmVhbWVyO1xuXG5cblx0ZnVuY3Rpb24gU3RyaW5nU3RyZWFtZXIoY29uZmlnKVxuXHR7XG5cdFx0Y29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHRcdENodW5rU3RyZWFtZXIuY2FsbCh0aGlzLCBjb25maWcpO1xuXG5cdFx0dmFyIHN0cmluZztcblx0XHR2YXIgcmVtYWluaW5nO1xuXHRcdHRoaXMuc3RyZWFtID0gZnVuY3Rpb24ocylcblx0XHR7XG5cdFx0XHRzdHJpbmcgPSBzO1xuXHRcdFx0cmVtYWluaW5nID0gcztcblx0XHRcdHJldHVybiB0aGlzLl9uZXh0Q2h1bmsoKTtcblx0XHR9XG5cdFx0dGhpcy5fbmV4dENodW5rID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLl9maW5pc2hlZCkgcmV0dXJuO1xuXHRcdFx0dmFyIHNpemUgPSB0aGlzLl9jb25maWcuY2h1bmtTaXplO1xuXHRcdFx0dmFyIGNodW5rID0gc2l6ZSA/IHJlbWFpbmluZy5zdWJzdHIoMCwgc2l6ZSkgOiByZW1haW5pbmc7XG5cdFx0XHRyZW1haW5pbmcgPSBzaXplID8gcmVtYWluaW5nLnN1YnN0cihzaXplKSA6ICcnO1xuXHRcdFx0dGhpcy5fZmluaXNoZWQgPSAhcmVtYWluaW5nO1xuXHRcdFx0cmV0dXJuIHRoaXMucGFyc2VDaHVuayhjaHVuayk7XG5cdFx0fVxuXHR9XG5cdFN0cmluZ1N0cmVhbWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3RyaW5nU3RyZWFtZXIucHJvdG90eXBlKTtcblx0U3RyaW5nU3RyZWFtZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nU3RyZWFtZXI7XG5cblxuXG5cdC8vIFVzZSBvbmUgUGFyc2VySGFuZGxlIHBlciBlbnRpcmUgQ1NWIGZpbGUgb3Igc3RyaW5nXG5cdGZ1bmN0aW9uIFBhcnNlckhhbmRsZShfY29uZmlnKVxuXHR7XG5cdFx0Ly8gT25lIGdvYWwgaXMgdG8gbWluaW1pemUgdGhlIHVzZSBvZiByZWd1bGFyIGV4cHJlc3Npb25zLi4uXG5cdFx0dmFyIEZMT0FUID0gL15cXHMqLT8oXFxkKlxcLj9cXGQrfFxcZCtcXC4/XFxkKikoZVstK10/XFxkKyk/XFxzKiQvaTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgX3N0ZXBDb3VudGVyID0gMDtcdC8vIE51bWJlciBvZiB0aW1lcyBzdGVwIHdhcyBjYWxsZWQgKG51bWJlciBvZiByb3dzIHBhcnNlZClcblx0XHR2YXIgX2lucHV0O1x0XHRcdFx0Ly8gVGhlIGlucHV0IGJlaW5nIHBhcnNlZFxuXHRcdHZhciBfcGFyc2VyO1x0XHRcdC8vIFRoZSBjb3JlIHBhcnNlciBiZWluZyB1c2VkXG5cdFx0dmFyIF9wYXVzZWQgPSBmYWxzZTtcdC8vIFdoZXRoZXIgd2UgYXJlIHBhdXNlZCBvciBub3Rcblx0XHR2YXIgX2Fib3J0ZWQgPSBmYWxzZTsgICAvLyBXaGV0aGVyIHRoZSBwYXJzZXIgaGFzIGFib3J0ZWQgb3Igbm90XG5cdFx0dmFyIF9kZWxpbWl0ZXJFcnJvcjtcdC8vIFRlbXBvcmFyeSBzdGF0ZSBiZXR3ZWVuIGRlbGltaXRlciBkZXRlY3Rpb24gYW5kIHByb2Nlc3NpbmcgcmVzdWx0c1xuXHRcdHZhciBfZmllbGRzID0gW107XHRcdC8vIEZpZWxkcyBhcmUgZnJvbSB0aGUgaGVhZGVyIHJvdyBvZiB0aGUgaW5wdXQsIGlmIHRoZXJlIGlzIG9uZVxuXHRcdHZhciBfcmVzdWx0cyA9IHtcdFx0Ly8gVGhlIGxhc3QgcmVzdWx0cyByZXR1cm5lZCBmcm9tIHRoZSBwYXJzZXJcblx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0ZXJyb3JzOiBbXSxcblx0XHRcdG1ldGE6IHt9XG5cdFx0fTtcblxuXHRcdGlmIChpc0Z1bmN0aW9uKF9jb25maWcuc3RlcCkpXG5cdFx0e1xuXHRcdFx0dmFyIHVzZXJTdGVwID0gX2NvbmZpZy5zdGVwO1xuXHRcdFx0X2NvbmZpZy5zdGVwID0gZnVuY3Rpb24ocmVzdWx0cylcblx0XHRcdHtcblx0XHRcdFx0X3Jlc3VsdHMgPSByZXN1bHRzO1xuXG5cdFx0XHRcdGlmIChuZWVkc0hlYWRlclJvdygpKVxuXHRcdFx0XHRcdHByb2Nlc3NSZXN1bHRzKCk7XG5cdFx0XHRcdGVsc2VcdC8vIG9ubHkgY2FsbCB1c2VyJ3Mgc3RlcCBmdW5jdGlvbiBhZnRlciBoZWFkZXIgcm93XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRwcm9jZXNzUmVzdWx0cygpO1xuXG5cdFx0XHRcdFx0Ly8gSXQncyBwb3NzYmlsZSB0aGF0IHRoaXMgbGluZSB3YXMgZW1wdHkgYW5kIHRoZXJlJ3Mgbm8gcm93IGhlcmUgYWZ0ZXIgYWxsXG5cdFx0XHRcdFx0aWYgKF9yZXN1bHRzLmRhdGEubGVuZ3RoID09IDApXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdFx0XHRfc3RlcENvdW50ZXIgKz0gcmVzdWx0cy5kYXRhLmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoX2NvbmZpZy5wcmV2aWV3ICYmIF9zdGVwQ291bnRlciA+IF9jb25maWcucHJldmlldylcblx0XHRcdFx0XHRcdF9wYXJzZXIuYWJvcnQoKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHR1c2VyU3RlcChfcmVzdWx0cywgc2VsZik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUGFyc2VzIGlucHV0LiBNb3N0IHVzZXJzIHdvbid0IG5lZWQsIGFuZCBzaG91bGRuJ3QgbWVzcyB3aXRoLCB0aGUgYmFzZUluZGV4XG5cdFx0ICogYW5kIGlnbm9yZUxhc3RSb3cgcGFyYW1ldGVycy4gVGhleSBhcmUgdXNlZCBieSBzdHJlYW1lcnMgKHdyYXBwZXIgZnVuY3Rpb25zKVxuXHRcdCAqIHdoZW4gYW4gaW5wdXQgY29tZXMgaW4gbXVsdGlwbGUgY2h1bmtzLCBsaWtlIGZyb20gYSBmaWxlLlxuXHRcdCAqL1xuXHRcdHRoaXMucGFyc2UgPSBmdW5jdGlvbihpbnB1dCwgYmFzZUluZGV4LCBpZ25vcmVMYXN0Um93KVxuXHRcdHtcblx0XHRcdGlmICghX2NvbmZpZy5uZXdsaW5lKVxuXHRcdFx0XHRfY29uZmlnLm5ld2xpbmUgPSBndWVzc0xpbmVFbmRpbmdzKGlucHV0KTtcblxuXHRcdFx0X2RlbGltaXRlckVycm9yID0gZmFsc2U7XG5cdFx0XHRpZiAoIV9jb25maWcuZGVsaW1pdGVyKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZGVsaW1HdWVzcyA9IGd1ZXNzRGVsaW1pdGVyKGlucHV0KTtcblx0XHRcdFx0aWYgKGRlbGltR3Vlc3Muc3VjY2Vzc2Z1bClcblx0XHRcdFx0XHRfY29uZmlnLmRlbGltaXRlciA9IGRlbGltR3Vlc3MuYmVzdERlbGltaXRlcjtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0X2RlbGltaXRlckVycm9yID0gdHJ1ZTtcdC8vIGFkZCBlcnJvciBhZnRlciBwYXJzaW5nIChvdGhlcndpc2UgaXQgd291bGQgYmUgb3ZlcndyaXR0ZW4pXG5cdFx0XHRcdFx0X2NvbmZpZy5kZWxpbWl0ZXIgPSBQYXBhLkRlZmF1bHREZWxpbWl0ZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0X3Jlc3VsdHMubWV0YS5kZWxpbWl0ZXIgPSBfY29uZmlnLmRlbGltaXRlcjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHBhcnNlckNvbmZpZyA9IGNvcHkoX2NvbmZpZyk7XG5cdFx0XHRpZiAoX2NvbmZpZy5wcmV2aWV3ICYmIF9jb25maWcuaGVhZGVyKVxuXHRcdFx0XHRwYXJzZXJDb25maWcucHJldmlldysrO1x0Ly8gdG8gY29tcGVuc2F0ZSBmb3IgaGVhZGVyIHJvd1xuXG5cdFx0XHRfaW5wdXQgPSBpbnB1dDtcblx0XHRcdF9wYXJzZXIgPSBuZXcgUGFyc2VyKHBhcnNlckNvbmZpZyk7XG5cdFx0XHRfcmVzdWx0cyA9IF9wYXJzZXIucGFyc2UoX2lucHV0LCBiYXNlSW5kZXgsIGlnbm9yZUxhc3RSb3cpO1xuXHRcdFx0cHJvY2Vzc1Jlc3VsdHMoKTtcblx0XHRcdHJldHVybiBfcGF1c2VkID8geyBtZXRhOiB7IHBhdXNlZDogdHJ1ZSB9IH0gOiAoX3Jlc3VsdHMgfHwgeyBtZXRhOiB7IHBhdXNlZDogZmFsc2UgfSB9KTtcblx0XHR9O1xuXG5cdFx0dGhpcy5wYXVzZWQgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIF9wYXVzZWQ7XG5cdFx0fTtcblxuXHRcdHRoaXMucGF1c2UgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0X3BhdXNlZCA9IHRydWU7XG5cdFx0XHRfcGFyc2VyLmFib3J0KCk7XG5cdFx0XHRfaW5wdXQgPSBfaW5wdXQuc3Vic3RyKF9wYXJzZXIuZ2V0Q2hhckluZGV4KCkpO1xuXHRcdH07XG5cblx0XHR0aGlzLnJlc3VtZSA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRfcGF1c2VkID0gZmFsc2U7XG5cdFx0XHRzZWxmLnN0cmVhbWVyLnBhcnNlQ2h1bmsoX2lucHV0KTtcblx0XHR9O1xuXG5cdFx0dGhpcy5hYm9ydGVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIF9hYm9ydGVkO1xuXHRcdH1cblxuXHRcdHRoaXMuYWJvcnQgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0X2Fib3J0ZWQgPSB0cnVlO1xuXHRcdFx0X3BhcnNlci5hYm9ydCgpO1xuXHRcdFx0X3Jlc3VsdHMubWV0YS5hYm9ydGVkID0gdHJ1ZTtcblx0XHRcdGlmIChpc0Z1bmN0aW9uKF9jb25maWcuY29tcGxldGUpKVxuXHRcdFx0XHRfY29uZmlnLmNvbXBsZXRlKF9yZXN1bHRzKTtcblx0XHRcdF9pbnB1dCA9IFwiXCI7XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHByb2Nlc3NSZXN1bHRzKClcblx0XHR7XG5cdFx0XHRpZiAoX3Jlc3VsdHMgJiYgX2RlbGltaXRlckVycm9yKVxuXHRcdFx0e1xuXHRcdFx0XHRhZGRFcnJvcihcIkRlbGltaXRlclwiLCBcIlVuZGV0ZWN0YWJsZURlbGltaXRlclwiLCBcIlVuYWJsZSB0byBhdXRvLWRldGVjdCBkZWxpbWl0aW5nIGNoYXJhY3RlcjsgZGVmYXVsdGVkIHRvICdcIitQYXBhLkRlZmF1bHREZWxpbWl0ZXIrXCInXCIpO1xuXHRcdFx0XHRfZGVsaW1pdGVyRXJyb3IgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9jb25maWcuc2tpcEVtcHR5TGluZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX3Jlc3VsdHMuZGF0YS5sZW5ndGg7IGkrKylcblx0XHRcdFx0XHRpZiAoX3Jlc3VsdHMuZGF0YVtpXS5sZW5ndGggPT0gMSAmJiBfcmVzdWx0cy5kYXRhW2ldWzBdID09IFwiXCIpXG5cdFx0XHRcdFx0XHRfcmVzdWx0cy5kYXRhLnNwbGljZShpLS0sIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobmVlZHNIZWFkZXJSb3coKSlcblx0XHRcdFx0ZmlsbEhlYWRlckZpZWxkcygpO1xuXG5cdFx0XHRyZXR1cm4gYXBwbHlIZWFkZXJBbmREeW5hbWljVHlwaW5nKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbmVlZHNIZWFkZXJSb3coKVxuXHRcdHtcblx0XHRcdHJldHVybiBfY29uZmlnLmhlYWRlciAmJiBfZmllbGRzLmxlbmd0aCA9PSAwO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGZpbGxIZWFkZXJGaWVsZHMoKVxuXHRcdHtcblx0XHRcdGlmICghX3Jlc3VsdHMpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBuZWVkc0hlYWRlclJvdygpICYmIGkgPCBfcmVzdWx0cy5kYXRhLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IF9yZXN1bHRzLmRhdGFbaV0ubGVuZ3RoOyBqKyspXG5cdFx0XHRcdFx0X2ZpZWxkcy5wdXNoKF9yZXN1bHRzLmRhdGFbaV1bal0pO1xuXHRcdFx0X3Jlc3VsdHMuZGF0YS5zcGxpY2UoMCwgMSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYXBwbHlIZWFkZXJBbmREeW5hbWljVHlwaW5nKClcblx0XHR7XG5cdFx0XHRpZiAoIV9yZXN1bHRzIHx8ICghX2NvbmZpZy5oZWFkZXIgJiYgIV9jb25maWcuZHluYW1pY1R5cGluZykpXG5cdFx0XHRcdHJldHVybiBfcmVzdWx0cztcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBfcmVzdWx0cy5kYXRhLmxlbmd0aDsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcm93ID0ge307XG5cblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBfcmVzdWx0cy5kYXRhW2ldLmxlbmd0aDsgaisrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKF9jb25maWcuZHluYW1pY1R5cGluZylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSBfcmVzdWx0cy5kYXRhW2ldW2pdO1xuXHRcdFx0XHRcdFx0aWYgKHZhbHVlID09IFwidHJ1ZVwiIHx8IHZhbHVlID09IFwiVFJVRVwiKVxuXHRcdFx0XHRcdFx0XHRfcmVzdWx0cy5kYXRhW2ldW2pdID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGVsc2UgaWYgKHZhbHVlID09IFwiZmFsc2VcIiB8fCB2YWx1ZSA9PSBcIkZBTFNFXCIpXG5cdFx0XHRcdFx0XHRcdF9yZXN1bHRzLmRhdGFbaV1bal0gPSBmYWxzZTtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0X3Jlc3VsdHMuZGF0YVtpXVtqXSA9IHRyeVBhcnNlRmxvYXQodmFsdWUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfY29uZmlnLmhlYWRlcilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoaiA+PSBfZmllbGRzLmxlbmd0aClcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0aWYgKCFyb3dbXCJfX3BhcnNlZF9leHRyYVwiXSlcblx0XHRcdFx0XHRcdFx0XHRyb3dbXCJfX3BhcnNlZF9leHRyYVwiXSA9IFtdO1xuXHRcdFx0XHRcdFx0XHRyb3dbXCJfX3BhcnNlZF9leHRyYVwiXS5wdXNoKF9yZXN1bHRzLmRhdGFbaV1bal0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyb3dbX2ZpZWxkc1tqXV0gPSBfcmVzdWx0cy5kYXRhW2ldW2pdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfY29uZmlnLmhlYWRlcilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdF9yZXN1bHRzLmRhdGFbaV0gPSByb3c7XG5cdFx0XHRcdFx0aWYgKGogPiBfZmllbGRzLmxlbmd0aClcblx0XHRcdFx0XHRcdGFkZEVycm9yKFwiRmllbGRNaXNtYXRjaFwiLCBcIlRvb01hbnlGaWVsZHNcIiwgXCJUb28gbWFueSBmaWVsZHM6IGV4cGVjdGVkIFwiICsgX2ZpZWxkcy5sZW5ndGggKyBcIiBmaWVsZHMgYnV0IHBhcnNlZCBcIiArIGosIGkpO1xuXHRcdFx0XHRcdGVsc2UgaWYgKGogPCBfZmllbGRzLmxlbmd0aClcblx0XHRcdFx0XHRcdGFkZEVycm9yKFwiRmllbGRNaXNtYXRjaFwiLCBcIlRvb0Zld0ZpZWxkc1wiLCBcIlRvbyBmZXcgZmllbGRzOiBleHBlY3RlZCBcIiArIF9maWVsZHMubGVuZ3RoICsgXCIgZmllbGRzIGJ1dCBwYXJzZWQgXCIgKyBqLCBpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoX2NvbmZpZy5oZWFkZXIgJiYgX3Jlc3VsdHMubWV0YSlcblx0XHRcdFx0X3Jlc3VsdHMubWV0YS5maWVsZHMgPSBfZmllbGRzO1xuXHRcdFx0cmV0dXJuIF9yZXN1bHRzO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGd1ZXNzRGVsaW1pdGVyKGlucHV0KVxuXHRcdHtcblx0XHRcdHZhciBkZWxpbUNob2ljZXMgPSBbXCIsXCIsIFwiXFx0XCIsIFwifFwiLCBcIjtcIiwgUGFwYS5SRUNPUkRfU0VQLCBQYXBhLlVOSVRfU0VQXTtcblx0XHRcdHZhciBiZXN0RGVsaW0sIGJlc3REZWx0YSwgZmllbGRDb3VudFByZXZSb3c7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGVsaW1DaG9pY2VzLmxlbmd0aDsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZGVsaW0gPSBkZWxpbUNob2ljZXNbaV07XG5cdFx0XHRcdHZhciBkZWx0YSA9IDAsIGF2Z0ZpZWxkQ291bnQgPSAwO1xuXHRcdFx0XHRmaWVsZENvdW50UHJldlJvdyA9IHVuZGVmaW5lZDtcblxuXHRcdFx0XHR2YXIgcHJldmlldyA9IG5ldyBQYXJzZXIoe1xuXHRcdFx0XHRcdGRlbGltaXRlcjogZGVsaW0sXG5cdFx0XHRcdFx0cHJldmlldzogMTBcblx0XHRcdFx0fSkucGFyc2UoaW5wdXQpO1xuXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcHJldmlldy5kYXRhLmxlbmd0aDsgaisrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGZpZWxkQ291bnQgPSBwcmV2aWV3LmRhdGFbal0ubGVuZ3RoO1xuXHRcdFx0XHRcdGF2Z0ZpZWxkQ291bnQgKz0gZmllbGRDb3VudDtcblxuXHRcdFx0XHRcdGlmICh0eXBlb2YgZmllbGRDb3VudFByZXZSb3cgPT09ICd1bmRlZmluZWQnKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZpZWxkQ291bnRQcmV2Um93ID0gZmllbGRDb3VudDtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChmaWVsZENvdW50ID4gMSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRkZWx0YSArPSBNYXRoLmFicyhmaWVsZENvdW50IC0gZmllbGRDb3VudFByZXZSb3cpO1xuXHRcdFx0XHRcdFx0ZmllbGRDb3VudFByZXZSb3cgPSBmaWVsZENvdW50O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChwcmV2aWV3LmRhdGEubGVuZ3RoID4gMClcblx0XHRcdFx0XHRhdmdGaWVsZENvdW50IC89IHByZXZpZXcuZGF0YS5sZW5ndGg7XG5cblx0XHRcdFx0aWYgKCh0eXBlb2YgYmVzdERlbHRhID09PSAndW5kZWZpbmVkJyB8fCBkZWx0YSA8IGJlc3REZWx0YSlcblx0XHRcdFx0XHQmJiBhdmdGaWVsZENvdW50ID4gMS45OSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGJlc3REZWx0YSA9IGRlbHRhO1xuXHRcdFx0XHRcdGJlc3REZWxpbSA9IGRlbGltO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdF9jb25maWcuZGVsaW1pdGVyID0gYmVzdERlbGltO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzZnVsOiAhIWJlc3REZWxpbSxcblx0XHRcdFx0YmVzdERlbGltaXRlcjogYmVzdERlbGltXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ3Vlc3NMaW5lRW5kaW5ncyhpbnB1dClcblx0XHR7XG5cdFx0XHRpbnB1dCA9IGlucHV0LnN1YnN0cigwLCAxMDI0KjEwMjQpO1x0Ly8gbWF4IGxlbmd0aCAxIE1CXG5cblx0XHRcdHZhciByID0gaW5wdXQuc3BsaXQoJ1xccicpO1xuXG5cdFx0XHRpZiAoci5sZW5ndGggPT0gMSlcblx0XHRcdFx0cmV0dXJuICdcXG4nO1xuXG5cdFx0XHR2YXIgbnVtV2l0aE4gPSAwO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByLmxlbmd0aDsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAocltpXVswXSA9PSAnXFxuJylcblx0XHRcdFx0XHRudW1XaXRoTisrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbnVtV2l0aE4gPj0gci5sZW5ndGggLyAyID8gJ1xcclxcbicgOiAnXFxyJztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cnlQYXJzZUZsb2F0KHZhbClcblx0XHR7XG5cdFx0XHR2YXIgaXNOdW1iZXIgPSBGTE9BVC50ZXN0KHZhbCk7XG5cdFx0XHRyZXR1cm4gaXNOdW1iZXIgPyBwYXJzZUZsb2F0KHZhbCkgOiB2YWw7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRkRXJyb3IodHlwZSwgY29kZSwgbXNnLCByb3cpXG5cdFx0e1xuXHRcdFx0X3Jlc3VsdHMuZXJyb3JzLnB1c2goe1xuXHRcdFx0XHR0eXBlOiB0eXBlLFxuXHRcdFx0XHRjb2RlOiBjb2RlLFxuXHRcdFx0XHRtZXNzYWdlOiBtc2csXG5cdFx0XHRcdHJvdzogcm93XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXG5cblxuXG5cdC8qKiBUaGUgY29yZSBwYXJzZXIgaW1wbGVtZW50cyBzcGVlZHkgYW5kIGNvcnJlY3QgQ1NWIHBhcnNpbmcgKi9cblx0ZnVuY3Rpb24gUGFyc2VyKGNvbmZpZylcblx0e1xuXHRcdC8vIFVucGFjayB0aGUgY29uZmlnIG9iamVjdFxuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0XHR2YXIgZGVsaW0gPSBjb25maWcuZGVsaW1pdGVyO1xuXHRcdHZhciBuZXdsaW5lID0gY29uZmlnLm5ld2xpbmU7XG5cdFx0dmFyIGNvbW1lbnRzID0gY29uZmlnLmNvbW1lbnRzO1xuXHRcdHZhciBzdGVwID0gY29uZmlnLnN0ZXA7XG5cdFx0dmFyIHByZXZpZXcgPSBjb25maWcucHJldmlldztcblx0XHR2YXIgZmFzdE1vZGUgPSBjb25maWcuZmFzdE1vZGU7XG5cblx0XHQvLyBEZWxpbWl0ZXIgbXVzdCBiZSB2YWxpZFxuXHRcdGlmICh0eXBlb2YgZGVsaW0gIT09ICdzdHJpbmcnXG5cdFx0XHR8fCBQYXBhLkJBRF9ERUxJTUlURVJTLmluZGV4T2YoZGVsaW0pID4gLTEpXG5cdFx0XHRkZWxpbSA9IFwiLFwiO1xuXG5cdFx0Ly8gQ29tbWVudCBjaGFyYWN0ZXIgbXVzdCBiZSB2YWxpZFxuXHRcdGlmIChjb21tZW50cyA9PT0gZGVsaW0pXG5cdFx0XHR0aHJvdyBcIkNvbW1lbnQgY2hhcmFjdGVyIHNhbWUgYXMgZGVsaW1pdGVyXCI7XG5cdFx0ZWxzZSBpZiAoY29tbWVudHMgPT09IHRydWUpXG5cdFx0XHRjb21tZW50cyA9IFwiI1wiO1xuXHRcdGVsc2UgaWYgKHR5cGVvZiBjb21tZW50cyAhPT0gJ3N0cmluZydcblx0XHRcdHx8IFBhcGEuQkFEX0RFTElNSVRFUlMuaW5kZXhPZihjb21tZW50cykgPiAtMSlcblx0XHRcdGNvbW1lbnRzID0gZmFsc2U7XG5cblx0XHQvLyBOZXdsaW5lIG11c3QgYmUgdmFsaWQ6IFxcciwgXFxuLCBvciBcXHJcXG5cblx0XHRpZiAobmV3bGluZSAhPSAnXFxuJyAmJiBuZXdsaW5lICE9ICdcXHInICYmIG5ld2xpbmUgIT0gJ1xcclxcbicpXG5cdFx0XHRuZXdsaW5lID0gJ1xcbic7XG5cblx0XHQvLyBXZSdyZSBnb25uYSBuZWVkIHRoZXNlIGF0IHRoZSBQYXJzZXIgc2NvcGVcblx0XHR2YXIgY3Vyc29yID0gMDtcblx0XHR2YXIgYWJvcnRlZCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5wYXJzZSA9IGZ1bmN0aW9uKGlucHV0LCBiYXNlSW5kZXgsIGlnbm9yZUxhc3RSb3cpXG5cdFx0e1xuXHRcdFx0Ly8gRm9yIHNvbWUgcmVhc29uLCBpbiBDaHJvbWUsIHRoaXMgc3BlZWRzIHRoaW5ncyB1cCAoIT8pXG5cdFx0XHRpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJylcblx0XHRcdFx0dGhyb3cgXCJJbnB1dCBtdXN0IGJlIGEgc3RyaW5nXCI7XG5cblx0XHRcdC8vIFdlIGRvbid0IG5lZWQgdG8gY29tcHV0ZSBzb21lIG9mIHRoZXNlIGV2ZXJ5IHRpbWUgcGFyc2UoKSBpcyBjYWxsZWQsXG5cdFx0XHQvLyBidXQgaGF2aW5nIHRoZW0gaW4gYSBtb3JlIGxvY2FsIHNjb3BlIHNlZW1zIHRvIHBlcmZvcm0gYmV0dGVyXG5cdFx0XHR2YXIgaW5wdXRMZW4gPSBpbnB1dC5sZW5ndGgsXG5cdFx0XHRcdGRlbGltTGVuID0gZGVsaW0ubGVuZ3RoLFxuXHRcdFx0XHRuZXdsaW5lTGVuID0gbmV3bGluZS5sZW5ndGgsXG5cdFx0XHRcdGNvbW1lbnRzTGVuID0gY29tbWVudHMubGVuZ3RoO1xuXHRcdFx0dmFyIHN0ZXBJc0Z1bmN0aW9uID0gdHlwZW9mIHN0ZXAgPT09ICdmdW5jdGlvbic7XG5cblx0XHRcdC8vIEVzdGFibGlzaCBzdGFydGluZyBzdGF0ZVxuXHRcdFx0Y3Vyc29yID0gMDtcblx0XHRcdHZhciBkYXRhID0gW10sIGVycm9ycyA9IFtdLCByb3cgPSBbXSwgbGFzdEN1cnNvciA9IDA7XG5cblx0XHRcdGlmICghaW5wdXQpXG5cdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cblx0XHRcdGlmIChmYXN0TW9kZSB8fCAoZmFzdE1vZGUgIT09IGZhbHNlICYmIGlucHV0LmluZGV4T2YoJ1wiJykgPT09IC0xKSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIHJvd3MgPSBpbnB1dC5zcGxpdChuZXdsaW5lKTtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIHJvdyA9IHJvd3NbaV07XG5cdFx0XHRcdFx0Y3Vyc29yICs9IHJvdy5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKGkgIT09IHJvd3MubGVuZ3RoIC0gMSlcblx0XHRcdFx0XHRcdGN1cnNvciArPSBuZXdsaW5lLmxlbmd0aDtcblx0XHRcdFx0XHRlbHNlIGlmIChpZ25vcmVMYXN0Um93KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0XHRpZiAoY29tbWVudHMgJiYgcm93LnN1YnN0cigwLCBjb21tZW50c0xlbikgPT0gY29tbWVudHMpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRpZiAoc3RlcElzRnVuY3Rpb24pXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZGF0YSA9IFtdO1xuXHRcdFx0XHRcdFx0cHVzaFJvdyhyb3cuc3BsaXQoZGVsaW0pKTtcblx0XHRcdFx0XHRcdGRvU3RlcCgpO1xuXHRcdFx0XHRcdFx0aWYgKGFib3J0ZWQpXG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdHB1c2hSb3cocm93LnNwbGl0KGRlbGltKSk7XG5cdFx0XHRcdFx0aWYgKHByZXZpZXcgJiYgaSA+PSBwcmV2aWV3KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRhdGEgPSBkYXRhLnNsaWNlKDAsIHByZXZpZXcpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUodHJ1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBuZXh0RGVsaW0gPSBpbnB1dC5pbmRleE9mKGRlbGltLCBjdXJzb3IpO1xuXHRcdFx0dmFyIG5leHROZXdsaW5lID0gaW5wdXQuaW5kZXhPZihuZXdsaW5lLCBjdXJzb3IpO1xuXG5cdFx0XHQvLyBQYXJzZXIgbG9vcFxuXHRcdFx0Zm9yICg7Oylcblx0XHRcdHtcblx0XHRcdFx0Ly8gRmllbGQgaGFzIG9wZW5pbmcgcXVvdGVcblx0XHRcdFx0aWYgKGlucHV0W2N1cnNvcl0gPT0gJ1wiJylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIFN0YXJ0IG91ciBzZWFyY2ggZm9yIHRoZSBjbG9zaW5nIHF1b3RlIHdoZXJlIHRoZSBjdXJzb3IgaXNcblx0XHRcdFx0XHR2YXIgcXVvdGVTZWFyY2ggPSBjdXJzb3I7XG5cblx0XHRcdFx0XHQvLyBTa2lwIHRoZSBvcGVuaW5nIHF1b3RlXG5cdFx0XHRcdFx0Y3Vyc29yKys7XG5cblx0XHRcdFx0XHRmb3IgKDs7KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIEZpbmQgY2xvc2luZyBxdW90ZVxuXHRcdFx0XHRcdFx0dmFyIHF1b3RlU2VhcmNoID0gaW5wdXQuaW5kZXhPZignXCInLCBxdW90ZVNlYXJjaCsxKTtcblxuXHRcdFx0XHRcdFx0aWYgKHF1b3RlU2VhcmNoID09PSAtMSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0aWYgKCFpZ25vcmVMYXN0Um93KSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gTm8gY2xvc2luZyBxdW90ZS4uLiB3aGF0IGEgcGl0eVxuXHRcdFx0XHRcdFx0XHRcdGVycm9ycy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiUXVvdGVzXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRjb2RlOiBcIk1pc3NpbmdRdW90ZXNcIixcblx0XHRcdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IFwiUXVvdGVkIGZpZWxkIHVudGVybWluYXRlZFwiLFxuXHRcdFx0XHRcdFx0XHRcdFx0cm93OiBkYXRhLmxlbmd0aCxcdC8vIHJvdyBoYXMgeWV0IHRvIGJlIGluc2VydGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRpbmRleDogY3Vyc29yXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZpbmlzaCgpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAocXVvdGVTZWFyY2ggPT09IGlucHV0TGVuLTEpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdC8vIENsb3NpbmcgcXVvdGUgYXQgRU9GXG5cdFx0XHRcdFx0XHRcdHZhciB2YWx1ZSA9IGlucHV0LnN1YnN0cmluZyhjdXJzb3IsIHF1b3RlU2VhcmNoKS5yZXBsYWNlKC9cIlwiL2csICdcIicpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmluaXNoKHZhbHVlKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhpcyBxdW90ZSBpcyBlc2NhcGVkLCBpdCdzIHBhcnQgb2YgdGhlIGRhdGE7IHNraXAgaXRcblx0XHRcdFx0XHRcdGlmIChpbnB1dFtxdW90ZVNlYXJjaCsxXSA9PSAnXCInKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRxdW90ZVNlYXJjaCsrO1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGlucHV0W3F1b3RlU2VhcmNoKzFdID09IGRlbGltKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHQvLyBDbG9zaW5nIHF1b3RlIGZvbGxvd2VkIGJ5IGRlbGltaXRlclxuXHRcdFx0XHRcdFx0XHRyb3cucHVzaChpbnB1dC5zdWJzdHJpbmcoY3Vyc29yLCBxdW90ZVNlYXJjaCkucmVwbGFjZSgvXCJcIi9nLCAnXCInKSk7XG5cdFx0XHRcdFx0XHRcdGN1cnNvciA9IHF1b3RlU2VhcmNoICsgMSArIGRlbGltTGVuO1xuXHRcdFx0XHRcdFx0XHRuZXh0RGVsaW0gPSBpbnB1dC5pbmRleE9mKGRlbGltLCBjdXJzb3IpO1xuXHRcdFx0XHRcdFx0XHRuZXh0TmV3bGluZSA9IGlucHV0LmluZGV4T2YobmV3bGluZSwgY3Vyc29yKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChpbnB1dC5zdWJzdHIocXVvdGVTZWFyY2grMSwgbmV3bGluZUxlbikgPT09IG5ld2xpbmUpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdC8vIENsb3NpbmcgcXVvdGUgZm9sbG93ZWQgYnkgbmV3bGluZVxuXHRcdFx0XHRcdFx0XHRyb3cucHVzaChpbnB1dC5zdWJzdHJpbmcoY3Vyc29yLCBxdW90ZVNlYXJjaCkucmVwbGFjZSgvXCJcIi9nLCAnXCInKSk7XG5cdFx0XHRcdFx0XHRcdHNhdmVSb3cocXVvdGVTZWFyY2ggKyAxICsgbmV3bGluZUxlbik7XG5cdFx0XHRcdFx0XHRcdG5leHREZWxpbSA9IGlucHV0LmluZGV4T2YoZGVsaW0sIGN1cnNvcik7XHQvLyBiZWNhdXNlIHdlIG1heSBoYXZlIHNraXBwZWQgdGhlIG5leHREZWxpbSBpbiB0aGUgcXVvdGVkIGZpZWxkXG5cblx0XHRcdFx0XHRcdFx0aWYgKHN0ZXBJc0Z1bmN0aW9uKVxuXHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0ZG9TdGVwKCk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGFib3J0ZWQpXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRpZiAocHJldmlldyAmJiBkYXRhLmxlbmd0aCA+PSBwcmV2aWV3KVxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKHRydWUpO1xuXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ29tbWVudCBmb3VuZCBhdCBzdGFydCBvZiBuZXcgbGluZVxuXHRcdFx0XHRpZiAoY29tbWVudHMgJiYgcm93Lmxlbmd0aCA9PT0gMCAmJiBpbnB1dC5zdWJzdHIoY3Vyc29yLCBjb21tZW50c0xlbikgPT09IGNvbW1lbnRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKG5leHROZXdsaW5lID09IC0xKVx0Ly8gQ29tbWVudCBlbmRzIGF0IEVPRlxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0XHRjdXJzb3IgPSBuZXh0TmV3bGluZSArIG5ld2xpbmVMZW47XG5cdFx0XHRcdFx0bmV4dE5ld2xpbmUgPSBpbnB1dC5pbmRleE9mKG5ld2xpbmUsIGN1cnNvcik7XG5cdFx0XHRcdFx0bmV4dERlbGltID0gaW5wdXQuaW5kZXhPZihkZWxpbSwgY3Vyc29yKTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIE5leHQgZGVsaW1pdGVyIGNvbWVzIGJlZm9yZSBuZXh0IG5ld2xpbmUsIHNvIHdlJ3ZlIHJlYWNoZWQgZW5kIG9mIGZpZWxkXG5cdFx0XHRcdGlmIChuZXh0RGVsaW0gIT09IC0xICYmIChuZXh0RGVsaW0gPCBuZXh0TmV3bGluZSB8fCBuZXh0TmV3bGluZSA9PT0gLTEpKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cm93LnB1c2goaW5wdXQuc3Vic3RyaW5nKGN1cnNvciwgbmV4dERlbGltKSk7XG5cdFx0XHRcdFx0Y3Vyc29yID0gbmV4dERlbGltICsgZGVsaW1MZW47XG5cdFx0XHRcdFx0bmV4dERlbGltID0gaW5wdXQuaW5kZXhPZihkZWxpbSwgY3Vyc29yKTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVuZCBvZiByb3dcblx0XHRcdFx0aWYgKG5leHROZXdsaW5lICE9PSAtMSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJvdy5wdXNoKGlucHV0LnN1YnN0cmluZyhjdXJzb3IsIG5leHROZXdsaW5lKSk7XG5cdFx0XHRcdFx0c2F2ZVJvdyhuZXh0TmV3bGluZSArIG5ld2xpbmVMZW4pO1xuXG5cdFx0XHRcdFx0aWYgKHN0ZXBJc0Z1bmN0aW9uKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRvU3RlcCgpO1xuXHRcdFx0XHRcdFx0aWYgKGFib3J0ZWQpXG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHByZXZpZXcgJiYgZGF0YS5sZW5ndGggPj0gcHJldmlldylcblx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKHRydWUpO1xuXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXG5cdFx0XHRyZXR1cm4gZmluaXNoKCk7XG5cblxuXHRcdFx0ZnVuY3Rpb24gcHVzaFJvdyhyb3cpXG5cdFx0XHR7XG5cdFx0XHRcdGRhdGEucHVzaChyb3cpO1xuXHRcdFx0XHRsYXN0Q3Vyc29yID0gY3Vyc29yO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEFwcGVuZHMgdGhlIHJlbWFpbmluZyBpbnB1dCBmcm9tIGN1cnNvciB0byB0aGUgZW5kIGludG9cblx0XHRcdCAqIHJvdywgc2F2ZXMgdGhlIHJvdywgY2FsbHMgc3RlcCwgYW5kIHJldHVybnMgdGhlIHJlc3VsdHMuXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIGZpbmlzaCh2YWx1ZSlcblx0XHRcdHtcblx0XHRcdFx0aWYgKGlnbm9yZUxhc3RSb3cpXG5cdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHRcdFx0dmFsdWUgPSBpbnB1dC5zdWJzdHIoY3Vyc29yKTtcblx0XHRcdFx0cm93LnB1c2godmFsdWUpO1xuXHRcdFx0XHRjdXJzb3IgPSBpbnB1dExlbjtcdC8vIGltcG9ydGFudCBpbiBjYXNlIHBhcnNpbmcgaXMgcGF1c2VkXG5cdFx0XHRcdHB1c2hSb3cocm93KTtcblx0XHRcdFx0aWYgKHN0ZXBJc0Z1bmN0aW9uKVxuXHRcdFx0XHRcdGRvU3RlcCgpO1xuXHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEFwcGVuZHMgdGhlIGN1cnJlbnQgcm93IHRvIHRoZSByZXN1bHRzLiBJdCBzZXRzIHRoZSBjdXJzb3Jcblx0XHRcdCAqIHRvIG5ld0N1cnNvciBhbmQgZmluZHMgdGhlIG5leHROZXdsaW5lLiBUaGUgY2FsbGVyIHNob3VsZFxuXHRcdFx0ICogdGFrZSBjYXJlIHRvIGV4ZWN1dGUgdXNlcidzIHN0ZXAgZnVuY3Rpb24gYW5kIGNoZWNrIGZvclxuXHRcdFx0ICogcHJldmlldyBhbmQgZW5kIHBhcnNpbmcgaWYgbmVjZXNzYXJ5LlxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBzYXZlUm93KG5ld0N1cnNvcilcblx0XHRcdHtcblx0XHRcdFx0Y3Vyc29yID0gbmV3Q3Vyc29yO1xuXHRcdFx0XHRwdXNoUm93KHJvdyk7XG5cdFx0XHRcdHJvdyA9IFtdO1xuXHRcdFx0XHRuZXh0TmV3bGluZSA9IGlucHV0LmluZGV4T2YobmV3bGluZSwgY3Vyc29yKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHJlc3VsdHMsIGVycm9ycywgYW5kIG1ldGEuICovXG5cdFx0XHRmdW5jdGlvbiByZXR1cm5hYmxlKHN0b3BwZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdFx0XHRlcnJvcnM6IGVycm9ycyxcblx0XHRcdFx0XHRtZXRhOiB7XG5cdFx0XHRcdFx0XHRkZWxpbWl0ZXI6IGRlbGltLFxuXHRcdFx0XHRcdFx0bGluZWJyZWFrOiBuZXdsaW5lLFxuXHRcdFx0XHRcdFx0YWJvcnRlZDogYWJvcnRlZCxcblx0XHRcdFx0XHRcdHRydW5jYXRlZDogISFzdG9wcGVkLFxuXHRcdFx0XHRcdFx0Y3Vyc29yOiBsYXN0Q3Vyc29yICsgKGJhc2VJbmRleCB8fCAwKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0LyoqIEV4ZWN1dGVzIHRoZSB1c2VyJ3Mgc3RlcCBmdW5jdGlvbiBhbmQgcmVzZXRzIGRhdGEgJiBlcnJvcnMuICovXG5cdFx0XHRmdW5jdGlvbiBkb1N0ZXAoKVxuXHRcdFx0e1xuXHRcdFx0XHRzdGVwKHJldHVybmFibGUoKSk7XG5cdFx0XHRcdGRhdGEgPSBbXSwgZXJyb3JzID0gW107XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKiBTZXRzIHRoZSBhYm9ydCBmbGFnICovXG5cdFx0dGhpcy5hYm9ydCA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRhYm9ydGVkID0gdHJ1ZTtcblx0XHR9O1xuXG5cdFx0LyoqIEdldHMgdGhlIGN1cnNvciBwb3NpdGlvbiAqL1xuXHRcdHRoaXMuZ2V0Q2hhckluZGV4ID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdHJldHVybiBjdXJzb3I7XG5cdFx0fTtcblx0fVxuXG5cblx0Ly8gSWYgeW91IG5lZWQgdG8gbG9hZCBQYXBhIFBhcnNlIGFzeW5jaHJvbm91c2x5IGFuZCB5b3UgYWxzbyBuZWVkIHdvcmtlciB0aHJlYWRzLCBoYXJkLWNvZGVcblx0Ly8gdGhlIHNjcmlwdCBwYXRoIGhlcmUuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21ob2x0L1BhcGFQYXJzZS9pc3N1ZXMvODcjaXNzdWVjb21tZW50LTU3ODg1MzU4XG5cdGZ1bmN0aW9uIGdldFNjcmlwdFBhdGgoKVxuXHR7XG5cdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdFx0cmV0dXJuIHNjcmlwdHMubGVuZ3RoID8gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyYyA6ICcnO1xuXHR9XG5cblx0ZnVuY3Rpb24gbmV3V29ya2VyKClcblx0e1xuXHRcdGlmICghUGFwYS5XT1JLRVJTX1NVUFBPUlRFRClcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRpZiAoIUxPQURFRF9TWU5DICYmIFBhcGEuU0NSSVBUX1BBVEggPT09IG51bGwpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdCdTY3JpcHQgcGF0aCBjYW5ub3QgYmUgZGV0ZXJtaW5lZCBhdXRvbWF0aWNhbGx5IHdoZW4gUGFwYSBQYXJzZSBpcyBsb2FkZWQgYXN5bmNocm9ub3VzbHkuICcgK1xuXHRcdFx0XHQnWW91IG5lZWQgdG8gc2V0IFBhcGEuU0NSSVBUX1BBVEggbWFudWFsbHkuJ1xuXHRcdFx0KTtcblx0XHR2YXIgd29ya2VyVXJsID0gUGFwYS5TQ1JJUFRfUEFUSCB8fCBBVVRPX1NDUklQVF9QQVRIO1xuXHRcdC8vIEFwcGVuZCBcInBhcGF3b3JrZXJcIiB0byB0aGUgc2VhcmNoIHN0cmluZyB0byB0ZWxsIHBhcGFwYXJzZSB0aGF0IHRoaXMgaXMgb3VyIHdvcmtlci5cblx0XHR3b3JrZXJVcmwgKz0gKHdvcmtlclVybC5pbmRleE9mKCc/JykgIT09IC0xID8gJyYnIDogJz8nKSArICdwYXBhd29ya2VyJztcblx0XHR2YXIgdyA9IG5ldyBnbG9iYWwuV29ya2VyKHdvcmtlclVybCk7XG5cdFx0dy5vbm1lc3NhZ2UgPSBtYWluVGhyZWFkUmVjZWl2ZWRNZXNzYWdlO1xuXHRcdHcuaWQgPSB3b3JrZXJJZENvdW50ZXIrKztcblx0XHR3b3JrZXJzW3cuaWRdID0gdztcblx0XHRyZXR1cm4gdztcblx0fVxuXG5cdC8qKiBDYWxsYmFjayB3aGVuIG1haW4gdGhyZWFkIHJlY2VpdmVzIGEgbWVzc2FnZSAqL1xuXHRmdW5jdGlvbiBtYWluVGhyZWFkUmVjZWl2ZWRNZXNzYWdlKGUpXG5cdHtcblx0XHR2YXIgbXNnID0gZS5kYXRhO1xuXHRcdHZhciB3b3JrZXIgPSB3b3JrZXJzW21zZy53b3JrZXJJZF07XG5cdFx0dmFyIGFib3J0ZWQgPSBmYWxzZTtcblxuXHRcdGlmIChtc2cuZXJyb3IpXG5cdFx0XHR3b3JrZXIudXNlckVycm9yKG1zZy5lcnJvciwgbXNnLmZpbGUpO1xuXHRcdGVsc2UgaWYgKG1zZy5yZXN1bHRzICYmIG1zZy5yZXN1bHRzLmRhdGEpXG5cdFx0e1xuXHRcdFx0dmFyIGFib3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFib3J0ZWQgPSB0cnVlO1xuXHRcdFx0XHRjb21wbGV0ZVdvcmtlcihtc2cud29ya2VySWQsIHsgZGF0YTogW10sIGVycm9yczogW10sIG1ldGE6IHsgYWJvcnRlZDogdHJ1ZSB9IH0pO1xuXHRcdFx0fTtcblxuXHRcdFx0dmFyIGhhbmRsZSA9IHtcblx0XHRcdFx0YWJvcnQ6IGFib3J0LFxuXHRcdFx0XHRwYXVzZTogbm90SW1wbGVtZW50ZWQsXG5cdFx0XHRcdHJlc3VtZTogbm90SW1wbGVtZW50ZWRcblx0XHRcdH07XG5cblx0XHRcdGlmIChpc0Z1bmN0aW9uKHdvcmtlci51c2VyU3RlcCkpXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbXNnLnJlc3VsdHMuZGF0YS5sZW5ndGg7IGkrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHdvcmtlci51c2VyU3RlcCh7XG5cdFx0XHRcdFx0XHRkYXRhOiBbbXNnLnJlc3VsdHMuZGF0YVtpXV0sXG5cdFx0XHRcdFx0XHRlcnJvcnM6IG1zZy5yZXN1bHRzLmVycm9ycyxcblx0XHRcdFx0XHRcdG1ldGE6IG1zZy5yZXN1bHRzLm1ldGFcblx0XHRcdFx0XHR9LCBoYW5kbGUpO1xuXHRcdFx0XHRcdGlmIChhYm9ydGVkKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVsZXRlIG1zZy5yZXN1bHRzO1x0Ly8gZnJlZSBtZW1vcnkgQVNBUFxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoaXNGdW5jdGlvbih3b3JrZXIudXNlckNodW5rKSlcblx0XHRcdHtcblx0XHRcdFx0d29ya2VyLnVzZXJDaHVuayhtc2cucmVzdWx0cywgaGFuZGxlLCBtc2cuZmlsZSk7XG5cdFx0XHRcdGRlbGV0ZSBtc2cucmVzdWx0cztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAobXNnLmZpbmlzaGVkICYmICFhYm9ydGVkKVxuXHRcdFx0Y29tcGxldGVXb3JrZXIobXNnLndvcmtlcklkLCBtc2cucmVzdWx0cyk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb21wbGV0ZVdvcmtlcih3b3JrZXJJZCwgcmVzdWx0cykge1xuXHRcdHZhciB3b3JrZXIgPSB3b3JrZXJzW3dvcmtlcklkXTtcblx0XHRpZiAoaXNGdW5jdGlvbih3b3JrZXIudXNlckNvbXBsZXRlKSlcblx0XHRcdHdvcmtlci51c2VyQ29tcGxldGUocmVzdWx0cyk7XG5cdFx0d29ya2VyLnRlcm1pbmF0ZSgpO1xuXHRcdGRlbGV0ZSB3b3JrZXJzW3dvcmtlcklkXTtcblx0fVxuXG5cdGZ1bmN0aW9uIG5vdEltcGxlbWVudGVkKCkge1xuXHRcdHRocm93IFwiTm90IGltcGxlbWVudGVkLlwiO1xuXHR9XG5cblx0LyoqIENhbGxiYWNrIHdoZW4gd29ya2VyIHRocmVhZCByZWNlaXZlcyBhIG1lc3NhZ2UgKi9cblx0ZnVuY3Rpb24gd29ya2VyVGhyZWFkUmVjZWl2ZWRNZXNzYWdlKGUpXG5cdHtcblx0XHR2YXIgbXNnID0gZS5kYXRhO1xuXG5cdFx0aWYgKHR5cGVvZiBQYXBhLldPUktFUl9JRCA9PT0gJ3VuZGVmaW5lZCcgJiYgbXNnKVxuXHRcdFx0UGFwYS5XT1JLRVJfSUQgPSBtc2cud29ya2VySWQ7XG5cblx0XHRpZiAodHlwZW9mIG1zZy5pbnB1dCA9PT0gJ3N0cmluZycpXG5cdFx0e1xuXHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0d29ya2VySWQ6IFBhcGEuV09SS0VSX0lELFxuXHRcdFx0XHRyZXN1bHRzOiBQYXBhLnBhcnNlKG1zZy5pbnB1dCwgbXNnLmNvbmZpZyksXG5cdFx0XHRcdGZpbmlzaGVkOiB0cnVlXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoKGdsb2JhbC5GaWxlICYmIG1zZy5pbnB1dCBpbnN0YW5jZW9mIEZpbGUpIHx8IG1zZy5pbnB1dCBpbnN0YW5jZW9mIE9iamVjdClcdC8vIHRoYW5rIHlvdSwgU2FmYXJpIChzZWUgaXNzdWUgIzEwNilcblx0XHR7XG5cdFx0XHR2YXIgcmVzdWx0cyA9IFBhcGEucGFyc2UobXNnLmlucHV0LCBtc2cuY29uZmlnKTtcblx0XHRcdGlmIChyZXN1bHRzKVxuXHRcdFx0XHRnbG9iYWwucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHdvcmtlcklkOiBQYXBhLldPUktFUl9JRCxcblx0XHRcdFx0XHRyZXN1bHRzOiByZXN1bHRzLFxuXHRcdFx0XHRcdGZpbmlzaGVkOiB0cnVlXG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdC8qKiBNYWtlcyBhIGRlZXAgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG1vc3RseSkgKi9cblx0ZnVuY3Rpb24gY29weShvYmopXG5cdHtcblx0XHRpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdHZhciBjcHkgPSBvYmogaW5zdGFuY2VvZiBBcnJheSA/IFtdIDoge307XG5cdFx0Zm9yICh2YXIga2V5IGluIG9iailcblx0XHRcdGNweVtrZXldID0gY29weShvYmpba2V5XSk7XG5cdFx0cmV0dXJuIGNweTtcblx0fVxuXG5cdGZ1bmN0aW9uIGJpbmRGdW5jdGlvbihmLCBzZWxmKVxuXHR7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkgeyBmLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7IH07XG5cdH1cblxuXHRmdW5jdGlvbiBpc0Z1bmN0aW9uKGZ1bmMpXG5cdHtcblx0XHRyZXR1cm4gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbic7XG5cdH1cbn0pKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdGhpcyk7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgc3RyaWN0VXJpRW5jb2RlID0gcmVxdWlyZSgnc3RyaWN0LXVyaS1lbmNvZGUnKTtcbnZhciBvYmplY3RBc3NpZ24gPSByZXF1aXJlKCdvYmplY3QtYXNzaWduJyk7XG5cbmZ1bmN0aW9uIGVuY29kZSh2YWx1ZSwgb3B0cykge1xuXHRpZiAob3B0cy5lbmNvZGUpIHtcblx0XHRyZXR1cm4gb3B0cy5zdHJpY3QgPyBzdHJpY3RVcmlFbmNvZGUodmFsdWUpIDogZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblx0fVxuXG5cdHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0cy5leHRyYWN0ID0gZnVuY3Rpb24gKHN0cikge1xuXHRyZXR1cm4gc3RyLnNwbGl0KCc/JylbMV0gfHwgJyc7XG59O1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHN0cikge1xuXHQvLyBDcmVhdGUgYW4gb2JqZWN0IHdpdGggbm8gcHJvdG90eXBlXG5cdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvcXVlcnktc3RyaW5nL2lzc3Vlcy80N1xuXHR2YXIgcmV0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuXHRpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm4gcmV0O1xuXHR9XG5cblx0c3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKC9eKFxcP3wjfCYpLywgJycpO1xuXG5cdGlmICghc3RyKSB7XG5cdFx0cmV0dXJuIHJldDtcblx0fVxuXG5cdHN0ci5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG5cdFx0dmFyIHBhcnRzID0gcGFyYW0ucmVwbGFjZSgvXFwrL2csICcgJykuc3BsaXQoJz0nKTtcblx0XHQvLyBGaXJlZm94IChwcmUgNDApIGRlY29kZXMgYCUzRGAgdG8gYD1gXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmcvcHVsbC8zN1xuXHRcdHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpO1xuXHRcdHZhciB2YWwgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignPScpIDogdW5kZWZpbmVkO1xuXG5cdFx0a2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cblx0XHQvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuXHRcdC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcblx0XHR2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuXHRcdGlmIChyZXRba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXRba2V5XSA9IHZhbDtcblx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmV0W2tleV0pKSB7XG5cdFx0XHRyZXRba2V5XS5wdXNoKHZhbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldFtrZXldID0gW3JldFtrZXldLCB2YWxdO1xuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIHJldDtcbn07XG5cbmV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKG9iaiwgb3B0cykge1xuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0ZW5jb2RlOiB0cnVlLFxuXHRcdHN0cmljdDogdHJ1ZVxuXHR9O1xuXG5cdG9wdHMgPSBvYmplY3RBc3NpZ24oZGVmYXVsdHMsIG9wdHMpO1xuXG5cdHJldHVybiBvYmogPyBPYmplY3Qua2V5cyhvYmopLnNvcnQoKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHRcdHZhciB2YWwgPSBvYmpba2V5XTtcblxuXHRcdGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuICcnO1xuXHRcdH1cblxuXHRcdGlmICh2YWwgPT09IG51bGwpIHtcblx0XHRcdHJldHVybiBlbmNvZGUoa2V5LCBvcHRzKTtcblx0XHR9XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG5cdFx0XHR2YXIgcmVzdWx0ID0gW107XG5cblx0XHRcdHZhbC5zbGljZSgpLmZvckVhY2goZnVuY3Rpb24gKHZhbDIpIHtcblx0XHRcdFx0aWYgKHZhbDIgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh2YWwyID09PSBudWxsKSB7XG5cdFx0XHRcdFx0cmVzdWx0LnB1c2goZW5jb2RlKGtleSwgb3B0cykpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKGVuY29kZShrZXksIG9wdHMpICsgJz0nICsgZW5jb2RlKHZhbDIsIG9wdHMpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiByZXN1bHQuam9pbignJicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbmNvZGUoa2V5LCBvcHRzKSArICc9JyArIGVuY29kZSh2YWwsIG9wdHMpO1xuXHR9KS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcblx0XHRyZXR1cm4geC5sZW5ndGggPiAwO1xuXHR9KS5qb2luKCcmJykgOiAnJztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcblx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoL1shJygpKl0vZywgZnVuY3Rpb24gKGMpIHtcblx0XHRyZXR1cm4gJyUnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXHR9KTtcbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5jb25zdCBIRUFEX0VMQk9XX09GRlNFVCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTU1LCAtMC40NjUsIC0wLjE1KTtcbmNvbnN0IEVMQk9XX1dSSVNUX09GRlNFVCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0wLjI1KTtcbmNvbnN0IFdSSVNUX0NPTlRST0xMRVJfT0ZGU0VUID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMC4wNSk7XG5jb25zdCBBUk1fRVhURU5TSU9OX09GRlNFVCA9IG5ldyBUSFJFRS5WZWN0b3IzKC0wLjA4LCAwLjE0LCAwLjA4KTtcblxuY29uc3QgRUxCT1dfQkVORF9SQVRJTyA9IDAuNDsgLy8gNDAlIGVsYm93LCA2MCUgd3Jpc3QuXG5jb25zdCBFWFRFTlNJT05fUkFUSU9fV0VJR0hUID0gMC40O1xuXG5jb25zdCBNSU5fQU5HVUxBUl9TUEVFRCA9IDAuNjE7IC8vIDM1IGRlZ3JlZXMgcGVyIHNlY29uZCAoaW4gcmFkaWFucykuXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgYXJtIG1vZGVsIGZvciB0aGUgRGF5ZHJlYW0gY29udHJvbGxlci4gRmVlZCBpdCBhIGNhbWVyYSBhbmRcbiAqIHRoZSBjb250cm9sbGVyLiBVcGRhdGUgaXQgb24gYSBSQUYuXG4gKlxuICogR2V0IHRoZSBtb2RlbCdzIHBvc2UgdXNpbmcgZ2V0UG9zZSgpLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPcmllbnRhdGlvbkFybU1vZGVsIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pc0xlZnRIYW5kZWQgPSBmYWxzZTtcblxuICAgIC8vIEN1cnJlbnQgYW5kIHByZXZpb3VzIGNvbnRyb2xsZXIgb3JpZW50YXRpb25zLlxuICAgIHRoaXMuY29udHJvbGxlclEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAgIHRoaXMubGFzdENvbnRyb2xsZXJRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAgIC8vIEN1cnJlbnQgYW5kIHByZXZpb3VzIGhlYWQgb3JpZW50YXRpb25zLlxuICAgIHRoaXMuaGVhZFEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gICAgLy8gQ3VycmVudCBoZWFkIHBvc2l0aW9uLlxuICAgIHRoaXMuaGVhZFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cbiAgICAvLyBQb3NpdGlvbnMgb2Ygb3RoZXIgam9pbnRzIChtb3N0bHkgZm9yIGRlYnVnZ2luZykuXG4gICAgdGhpcy5lbGJvd1BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgdGhpcy53cmlzdFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cbiAgICAvLyBDdXJyZW50IGFuZCBwcmV2aW91cyB0aW1lcyB0aGUgbW9kZWwgd2FzIHVwZGF0ZWQuXG4gICAgdGhpcy50aW1lID0gbnVsbDtcbiAgICB0aGlzLmxhc3RUaW1lID0gbnVsbDtcblxuICAgIC8vIFJvb3Qgcm90YXRpb24uXG4gICAgdGhpcy5yb290USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgICAvLyBDdXJyZW50IHBvc2UgdGhhdCB0aGlzIGFybSBtb2RlbCBjYWxjdWxhdGVzLlxuICAgIHRoaXMucG9zZSA9IHtcbiAgICAgIG9yaWVudGF0aW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigpLFxuICAgICAgcG9zaXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKClcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZHMgdG8gc2V0IGNvbnRyb2xsZXIgYW5kIGhlYWQgcG9zZSAoaW4gd29ybGQgY29vcmRpbmF0ZXMpLlxuICAgKi9cbiAgc2V0Q29udHJvbGxlck9yaWVudGF0aW9uKHF1YXRlcm5pb24pIHtcbiAgICB0aGlzLmxhc3RDb250cm9sbGVyUS5jb3B5KHRoaXMuY29udHJvbGxlclEpO1xuICAgIHRoaXMuY29udHJvbGxlclEuY29weShxdWF0ZXJuaW9uKTtcbiAgfVxuXG4gIHNldEhlYWRPcmllbnRhdGlvbihxdWF0ZXJuaW9uKSB7XG4gICAgdGhpcy5oZWFkUS5jb3B5KHF1YXRlcm5pb24pO1xuICB9XG5cbiAgc2V0SGVhZFBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy5oZWFkUG9zLmNvcHkocG9zaXRpb24pO1xuICB9XG5cbiAgc2V0TGVmdEhhbmRlZChpc0xlZnRIYW5kZWQpIHtcbiAgICAvLyBUT0RPKHNtdXMpOiBJbXBsZW1lbnQgbWUhXG4gICAgdGhpcy5pc0xlZnRIYW5kZWQgPSBpc0xlZnRIYW5kZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGEgUkFGLlxuICAgKi9cbiAgdXBkYXRlKCkge1xuICAgIHRoaXMudGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgLy8gSWYgdGhlIGNvbnRyb2xsZXIncyBhbmd1bGFyIHZlbG9jaXR5IGlzIGFib3ZlIGEgY2VydGFpbiBhbW91bnQsIHdlIGNhblxuICAgIC8vIGFzc3VtZSB0b3JzbyByb3RhdGlvbiBhbmQgbW92ZSB0aGUgZWxib3cgam9pbnQgcmVsYXRpdmUgdG8gdGhlXG4gICAgLy8gY2FtZXJhIG9yaWVudGF0aW9uLlxuICAgIGxldCBoZWFkWWF3USA9IHRoaXMuZ2V0SGVhZFlhd09yaWVudGF0aW9uXygpO1xuICAgIGxldCB0aW1lRGVsdGEgPSAodGhpcy50aW1lIC0gdGhpcy5sYXN0VGltZSkgLyAxMDAwO1xuICAgIGxldCBhbmdsZURlbHRhID0gdGhpcy5xdWF0QW5nbGVfKHRoaXMubGFzdENvbnRyb2xsZXJRLCB0aGlzLmNvbnRyb2xsZXJRKTtcbiAgICBsZXQgY29udHJvbGxlckFuZ3VsYXJTcGVlZCA9IGFuZ2xlRGVsdGEgLyB0aW1lRGVsdGE7XG4gICAgaWYgKGNvbnRyb2xsZXJBbmd1bGFyU3BlZWQgPiBNSU5fQU5HVUxBUl9TUEVFRCkge1xuICAgICAgLy8gQXR0ZW51YXRlIHRoZSBSb290IHJvdGF0aW9uIHNsaWdodGx5LlxuICAgICAgdGhpcy5yb290US5zbGVycChoZWFkWWF3USwgYW5nbGVEZWx0YSAvIDEwKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJvb3RRLmNvcHkoaGVhZFlhd1EpO1xuICAgIH1cblxuICAgIC8vIFdlIHdhbnQgdG8gbW92ZSB0aGUgZWxib3cgdXAgYW5kIHRvIHRoZSBjZW50ZXIgYXMgdGhlIHVzZXIgcG9pbnRzIHRoZVxuICAgIC8vIGNvbnRyb2xsZXIgdXB3YXJkcywgc28gdGhhdCB0aGV5IGNhbiBlYXNpbHkgc2VlIHRoZSBjb250cm9sbGVyIGFuZCBpdHNcbiAgICAvLyB0b29sIHRpcHMuXG4gICAgbGV0IGNvbnRyb2xsZXJFdWxlciA9IG5ldyBUSFJFRS5FdWxlcigpLnNldEZyb21RdWF0ZXJuaW9uKHRoaXMuY29udHJvbGxlclEsICdZWFonKTtcbiAgICBsZXQgY29udHJvbGxlclhEZWcgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKGNvbnRyb2xsZXJFdWxlci54KTtcbiAgICBsZXQgZXh0ZW5zaW9uUmF0aW8gPSB0aGlzLmNsYW1wXygoY29udHJvbGxlclhEZWcgLSAxMSkgLyAoNTAgLSAxMSksIDAsIDEpO1xuXG4gICAgLy8gQ29udHJvbGxlciBvcmllbnRhdGlvbiBpbiBjYW1lcmEgc3BhY2UuXG4gICAgbGV0IGNvbnRyb2xsZXJDYW1lcmFRID0gdGhpcy5yb290US5jbG9uZSgpLmludmVyc2UoKTtcbiAgICBjb250cm9sbGVyQ2FtZXJhUS5tdWx0aXBseSh0aGlzLmNvbnRyb2xsZXJRKTtcblxuICAgIC8vIENhbGN1bGF0ZSBlbGJvdyBwb3NpdGlvbi5cbiAgICBsZXQgZWxib3dQb3MgPSB0aGlzLmVsYm93UG9zO1xuICAgIGVsYm93UG9zLmNvcHkodGhpcy5oZWFkUG9zKS5hZGQoSEVBRF9FTEJPV19PRkZTRVQpO1xuICAgIGxldCBlbGJvd09mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY29weShBUk1fRVhURU5TSU9OX09GRlNFVCk7XG4gICAgZWxib3dPZmZzZXQubXVsdGlwbHlTY2FsYXIoZXh0ZW5zaW9uUmF0aW8pO1xuICAgIGVsYm93UG9zLmFkZChlbGJvd09mZnNldCk7XG5cbiAgICAvLyBDYWxjdWxhdGUgam9pbnQgYW5nbGVzLiBHZW5lcmFsbHkgNDAlIG9mIHJvdGF0aW9uIGFwcGxpZWQgdG8gZWxib3csIDYwJVxuICAgIC8vIHRvIHdyaXN0LCBidXQgaWYgY29udHJvbGxlciBpcyByYWlzZWQgaGlnaGVyLCBtb3JlIHJvdGF0aW9uIGNvbWVzIGZyb21cbiAgICAvLyB0aGUgd3Jpc3QuXG4gICAgbGV0IHRvdGFsQW5nbGUgPSB0aGlzLnF1YXRBbmdsZV8oY29udHJvbGxlckNhbWVyYVEsIG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkpO1xuICAgIGxldCB0b3RhbEFuZ2xlRGVnID0gVEhSRUUuTWF0aC5yYWRUb0RlZyh0b3RhbEFuZ2xlKTtcbiAgICBsZXQgbGVycFN1cHByZXNzaW9uID0gMSAtIE1hdGgucG93KHRvdGFsQW5nbGVEZWcgLyAxODAsIDQpOyAvLyBUT0RPKHNtdXMpOiA/Pz9cblxuICAgIGxldCBlbGJvd1JhdGlvID0gRUxCT1dfQkVORF9SQVRJTztcbiAgICBsZXQgd3Jpc3RSYXRpbyA9IDEgLSBFTEJPV19CRU5EX1JBVElPO1xuICAgIGxldCBsZXJwVmFsdWUgPSBsZXJwU3VwcHJlc3Npb24gKlxuICAgICAgICAoZWxib3dSYXRpbyArIHdyaXN0UmF0aW8gKiBleHRlbnNpb25SYXRpbyAqIEVYVEVOU0lPTl9SQVRJT19XRUlHSFQpO1xuXG4gICAgbGV0IHdyaXN0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuc2xlcnAoY29udHJvbGxlckNhbWVyYVEsIGxlcnBWYWx1ZSk7XG4gICAgbGV0IGludldyaXN0USA9IHdyaXN0US5pbnZlcnNlKCk7XG4gICAgbGV0IGVsYm93USA9IGNvbnRyb2xsZXJDYW1lcmFRLmNsb25lKCkubXVsdGlwbHkoaW52V3Jpc3RRKTtcblxuICAgIC8vIENhbGN1bGF0ZSBvdXIgZmluYWwgY29udHJvbGxlciBwb3NpdGlvbiBiYXNlZCBvbiBhbGwgb3VyIGpvaW50IHJvdGF0aW9uc1xuICAgIC8vIGFuZCBsZW5ndGhzLlxuICAgIC8qXG4gICAgcG9zaXRpb25fID1cbiAgICAgIHJvb3Rfcm90XyAqIChcbiAgICAgICAgY29udHJvbGxlcl9yb290X29mZnNldF8gK1xuMjogICAgICAoYXJtX2V4dGVuc2lvbl8gKiBhbXRfZXh0ZW5zaW9uKSArXG4xOiAgICAgIGVsYm93X3JvdCAqIChrQ29udHJvbGxlckZvcmVhcm0gKyAod3Jpc3Rfcm90ICoga0NvbnRyb2xsZXJQb3NpdGlvbikpXG4gICAgICApO1xuICAgICovXG4gICAgbGV0IHdyaXN0UG9zID0gdGhpcy53cmlzdFBvcztcbiAgICB3cmlzdFBvcy5jb3B5KFdSSVNUX0NPTlRST0xMRVJfT0ZGU0VUKTtcbiAgICB3cmlzdFBvcy5hcHBseVF1YXRlcm5pb24od3Jpc3RRKTtcbiAgICB3cmlzdFBvcy5hZGQoRUxCT1dfV1JJU1RfT0ZGU0VUKTtcbiAgICB3cmlzdFBvcy5hcHBseVF1YXRlcm5pb24oZWxib3dRKTtcbiAgICB3cmlzdFBvcy5hZGQodGhpcy5lbGJvd1Bvcyk7XG5cbiAgICBsZXQgb2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jb3B5KEFSTV9FWFRFTlNJT05fT0ZGU0VUKTtcbiAgICBvZmZzZXQubXVsdGlwbHlTY2FsYXIoZXh0ZW5zaW9uUmF0aW8pO1xuXG4gICAgbGV0IHBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jb3B5KHRoaXMud3Jpc3RQb3MpO1xuICAgIHBvc2l0aW9uLmFkZChvZmZzZXQpO1xuICAgIHBvc2l0aW9uLmFwcGx5UXVhdGVybmlvbih0aGlzLnJvb3RRKTtcblxuICAgIGxldCBvcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuY29weSh0aGlzLmNvbnRyb2xsZXJRKTtcblxuICAgIC8vIFNldCB0aGUgcmVzdWx0aW5nIHBvc2Ugb3JpZW50YXRpb24gYW5kIHBvc2l0aW9uLlxuICAgIHRoaXMucG9zZS5vcmllbnRhdGlvbi5jb3B5KG9yaWVudGF0aW9uKTtcbiAgICB0aGlzLnBvc2UucG9zaXRpb24uY29weShwb3NpdGlvbik7XG5cbiAgICB0aGlzLmxhc3RUaW1lID0gdGhpcy50aW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBvc2UgY2FsY3VsYXRlZCBieSB0aGUgbW9kZWwuXG4gICAqL1xuICBnZXRQb3NlKCkge1xuICAgIHJldHVybiB0aGlzLnBvc2U7XG4gIH1cblxuICAvKipcbiAgICogRGVidWcgbWV0aG9kcyBmb3IgcmVuZGVyaW5nIHRoZSBhcm0gbW9kZWwuXG4gICAqL1xuICBnZXRGb3JlYXJtTGVuZ3RoKCkge1xuICAgIHJldHVybiBFTEJPV19XUklTVF9PRkZTRVQubGVuZ3RoKCk7XG4gIH1cblxuICBnZXRFbGJvd1Bvc2l0aW9uKCkge1xuICAgIGxldCBvdXQgPSB0aGlzLmVsYm93UG9zLmNsb25lKCk7XG4gICAgcmV0dXJuIG91dC5hcHBseVF1YXRlcm5pb24odGhpcy5yb290USk7XG4gIH1cblxuICBnZXRXcmlzdFBvc2l0aW9uKCkge1xuICAgIGxldCBvdXQgPSB0aGlzLndyaXN0UG9zLmNsb25lKCk7XG4gICAgcmV0dXJuIG91dC5hcHBseVF1YXRlcm5pb24odGhpcy5yb290USk7XG4gIH1cblxuICBnZXRIZWFkWWF3T3JpZW50YXRpb25fKCkge1xuICAgIGxldCBoZWFkRXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKS5zZXRGcm9tUXVhdGVybmlvbih0aGlzLmhlYWRRLCAnWVhaJyk7XG4gICAgaGVhZEV1bGVyLnggPSAwO1xuICAgIGhlYWRFdWxlci56ID0gMDtcbiAgICBsZXQgZGVzdGluYXRpb25RID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5zZXRGcm9tRXVsZXIoaGVhZEV1bGVyKTtcbiAgICByZXR1cm4gZGVzdGluYXRpb25RO1xuICB9XG5cbiAgY2xhbXBfKHZhbHVlLCBtaW4sIG1heCkge1xuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heCh2YWx1ZSwgbWluKSwgbWF4KTtcbiAgfVxuXG4gIHF1YXRBbmdsZV8ocTEsIHEyKSB7XG4gICAgbGV0IHZlYzEgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSk7XG4gICAgbGV0IHZlYzIgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSk7XG4gICAgdmVjMS5hcHBseVF1YXRlcm5pb24ocTEpO1xuICAgIHZlYzIuYXBwbHlRdWF0ZXJuaW9uKHEyKTtcbiAgICByZXR1cm4gdmVjMS5hbmdsZVRvKHZlYzIpO1xuICB9XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50ZW1pdHRlcjMnXG5pbXBvcnQgSW50ZXJhY3Rpb25Nb2RlcyBmcm9tICcuL3JheS1pbnRlcmFjdGlvbi1tb2RlcydcbmltcG9ydCB7aXNNb2JpbGV9IGZyb20gJy4vdXRpbCdcblxuY29uc3QgRFJBR19ESVNUQU5DRV9QWCA9IDEwO1xuXG4vKipcbiAqIEVudW1lcmF0ZXMgYWxsIHBvc3NpYmxlIGludGVyYWN0aW9uIG1vZGVzLiBTZXRzIHVwIGFsbCBldmVudCBoYW5kbGVycyAobW91c2UsXG4gKiB0b3VjaCwgZXRjKSwgaW50ZXJmYWNlcyB3aXRoIGdhbWVwYWQgQVBJLlxuICpcbiAqIEVtaXRzIGV2ZW50czpcbiAqICAgIGFjdGlvbjogSW5wdXQgaXMgYWN0aXZhdGVkIChtb3VzZWRvd24sIHRvdWNoc3RhcnQsIGRheWRyZWFtIGNsaWNrLCB2aXZlXG4gKiAgICB0cmlnZ2VyKS5cbiAqICAgIHJlbGVhc2U6IElucHV0IGlzIGRlYWN0aXZhdGVkIChtb3VzZXVwLCB0b3VjaGVuZCwgZGF5ZHJlYW0gcmVsZWFzZSwgdml2ZVxuICogICAgcmVsZWFzZSkuXG4gKiAgICBjYW5jZWw6IElucHV0IGlzIGNhbmNlbGVkIChlZy4gd2Ugc2Nyb2xsZWQgaW5zdGVhZCBvZiB0YXBwaW5nIG9uXG4gKiAgICBtb2JpbGUvZGVza3RvcCkuXG4gKiAgICBwb2ludGVybW92ZSgyRCBwb3NpdGlvbik6IFRoZSBwb2ludGVyIGlzIG1vdmVkIChtb3VzZSBvciB0b3VjaCkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJheUNvbnRyb2xsZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihyZW5kZXJlcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuXG4gICAgdGhpcy5hdmFpbGFibGVJbnRlcmFjdGlvbnMgPSB7fTtcblxuICAgIC8vIEhhbmRsZSBpbnRlcmFjdGlvbnMuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25Nb3VzZURvd25fLmJpbmQodGhpcykpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMub25Ub3VjaFN0YXJ0Xy5iaW5kKHRoaXMpKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5vblRvdWNoTW92ZV8uYmluZCh0aGlzKSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5vblRvdWNoRW5kXy5iaW5kKHRoaXMpKTtcblxuICAgIC8vIFRoZSBwb3NpdGlvbiBvZiB0aGUgcG9pbnRlci5cbiAgICB0aGlzLnBvaW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIC8vIFRoZSBwcmV2aW91cyBwb3NpdGlvbiBvZiB0aGUgcG9pbnRlci5cbiAgICB0aGlzLmxhc3RQb2ludGVyID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAvLyBQb3NpdGlvbiBvZiBwb2ludGVyIGluIE5vcm1hbGl6ZWQgRGV2aWNlIENvb3JkaW5hdGVzIChOREMpLlxuICAgIHRoaXMucG9pbnRlck5kYyA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgLy8gSG93IG11Y2ggd2UgaGF2ZSBkcmFnZ2VkIChpZiB3ZSBhcmUgZHJhZ2dpbmcpLlxuICAgIHRoaXMuZHJhZ0Rpc3RhbmNlID0gMDtcbiAgICAvLyBBcmUgd2UgZHJhZ2dpbmcgb3Igbm90LlxuICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIC8vIElzIHBvaW50ZXIgYWN0aXZlIG9yIG5vdC5cbiAgICB0aGlzLmlzVG91Y2hBY3RpdmUgPSBmYWxzZTtcblxuICAgIC8vIEdhbWVwYWQgZXZlbnRzLlxuICAgIHRoaXMuZ2FtZXBhZCA9IG51bGw7XG5cbiAgICAvLyBWUiBFdmVudHMuXG4gICAgaWYgKCFuYXZpZ2F0b3IuZ2V0VlJEaXNwbGF5cykge1xuICAgICAgY29uc29sZS53YXJuKCdXZWJWUiBBUEkgbm90IGF2YWlsYWJsZSEgQ29uc2lkZXIgdXNpbmcgdGhlIHdlYnZyLXBvbHlmaWxsLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYXZpZ2F0b3IuZ2V0VlJEaXNwbGF5cygpLnRoZW4oKGRpc3BsYXlzKSA9PiB7XG4gICAgICAgIHRoaXMudnJEaXNwbGF5ID0gZGlzcGxheXNbMF07XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnZXRJbnRlcmFjdGlvbk1vZGUoKSB7XG4gICAgLy8gVE9ETzogRGVidWdnaW5nIG9ubHkuXG4gICAgLy9yZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5EQVlEUkVBTTtcblxuICAgIHZhciBnYW1lcGFkID0gdGhpcy5nZXRWUkdhbWVwYWRfKCk7XG5cbiAgICBpZiAoZ2FtZXBhZCkge1xuICAgICAgbGV0IHBvc2UgPSBnYW1lcGFkLnBvc2U7XG4gICAgICAvLyBJZiB0aGVyZSdzIGEgZ2FtZXBhZCBjb25uZWN0ZWQsIGRldGVybWluZSBpZiBpdCdzIERheWRyZWFtIG9yIGEgVml2ZS5cbiAgICAgIGlmIChwb3NlLmhhc1Bvc2l0aW9uKSB7XG4gICAgICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLlZSXzZET0Y7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3NlLmhhc09yaWVudGF0aW9uKSB7XG4gICAgICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLlZSXzNET0Y7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUncyBubyBnYW1lcGFkLCBpdCBtaWdodCBiZSBDYXJkYm9hcmQsIG1hZ2ljIHdpbmRvdyBvciBkZXNrdG9wLlxuICAgICAgaWYgKGlzTW9iaWxlKCkpIHtcbiAgICAgICAgLy8gRWl0aGVyIENhcmRib2FyZCBvciBtYWdpYyB3aW5kb3csIGRlcGVuZGluZyBvbiB3aGV0aGVyIHdlIGFyZVxuICAgICAgICAvLyBwcmVzZW50aW5nLlxuICAgICAgICBpZiAodGhpcy52ckRpc3BsYXkgJiYgdGhpcy52ckRpc3BsYXkuaXNQcmVzZW50aW5nKSB7XG4gICAgICAgICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuVlJfMERPRjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5UT1VDSDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gV2UgbXVzdCBiZSBvbiBkZXNrdG9wLlxuICAgICAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5NT1VTRTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQnkgZGVmYXVsdCwgdXNlIFRPVUNILlxuICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLlRPVUNIO1xuICB9XG5cbiAgZ2V0R2FtZXBhZFBvc2UoKSB7XG4gICAgdmFyIGdhbWVwYWQgPSB0aGlzLmdldFZSR2FtZXBhZF8oKTtcbiAgICByZXR1cm4gZ2FtZXBhZC5wb3NlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBpZiB0aGVyZSBpcyBhbiBhY3RpdmUgdG91Y2ggZXZlbnQgZ29pbmcgb24uXG4gICAqIE9ubHkgcmVsZXZhbnQgb24gdG91Y2ggZGV2aWNlc1xuICAgKi9cbiAgZ2V0SXNUb3VjaEFjdGl2ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5pc1RvdWNoQWN0aXZlO1xuICB9XG5cbiAgc2V0U2l6ZShzaXplKSB7XG4gICAgdGhpcy5zaXplID0gc2l6ZTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgbW9kZSA9IHRoaXMuZ2V0SW50ZXJhY3Rpb25Nb2RlKCk7XG4gICAgaWYgKG1vZGUgPT0gSW50ZXJhY3Rpb25Nb2Rlcy5WUl8zRE9GIHx8IG1vZGUgPT0gSW50ZXJhY3Rpb25Nb2Rlcy5WUl82RE9GKSB7XG4gICAgICAvLyBJZiB3ZSdyZSBkZWFsaW5nIHdpdGggYSBnYW1lcGFkLCBjaGVjayBldmVyeSBhbmltYXRpb24gZnJhbWUgZm9yIGFcbiAgICAgIC8vIHByZXNzZWQgYWN0aW9uLlxuICAgICAgbGV0IGlzR2FtZXBhZFByZXNzZWQgPSB0aGlzLmdldEdhbWVwYWRCdXR0b25QcmVzc2VkXygpO1xuICAgICAgaWYgKGlzR2FtZXBhZFByZXNzZWQgJiYgIXRoaXMud2FzR2FtZXBhZFByZXNzZWQpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdyYXlkb3duJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWlzR2FtZXBhZFByZXNzZWQgJiYgdGhpcy53YXNHYW1lcGFkUHJlc3NlZCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3JheXVwJyk7XG4gICAgICB9XG4gICAgICB0aGlzLndhc0dhbWVwYWRQcmVzc2VkID0gaXNHYW1lcGFkUHJlc3NlZDtcbiAgICB9XG4gIH1cblxuICBnZXRHYW1lcGFkQnV0dG9uUHJlc3NlZF8oKSB7XG4gICAgdmFyIGdhbWVwYWQgPSB0aGlzLmdldFZSR2FtZXBhZF8oKTtcbiAgICBpZiAoIWdhbWVwYWQpIHtcbiAgICAgIC8vIElmIHRoZXJlJ3Mgbm8gZ2FtZXBhZCwgdGhlIGJ1dHRvbiB3YXMgbm90IHByZXNzZWQuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciBjbGlja3MuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChnYW1lcGFkLmJ1dHRvbnNbal0ucHJlc3NlZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgb25Nb3VzZURvd25fKGUpIHtcbiAgICB0aGlzLnN0YXJ0RHJhZ2dpbmdfKGUpO1xuICAgIHRoaXMuZW1pdCgncmF5ZG93bicpO1xuICB9XG5cbiAgb25Nb3VzZU1vdmVfKGUpIHtcbiAgICB0aGlzLnVwZGF0ZVBvaW50ZXJfKGUpO1xuICAgIHRoaXMudXBkYXRlRHJhZ0Rpc3RhbmNlXygpO1xuICAgIHRoaXMuZW1pdCgncG9pbnRlcm1vdmUnLCB0aGlzLnBvaW50ZXJOZGMpO1xuICB9XG5cbiAgb25Nb3VzZVVwXyhlKSB7XG4gICAgdGhpcy5lbmREcmFnZ2luZ18oKTtcbiAgfVxuXG4gIG9uVG91Y2hTdGFydF8oZSkge1xuICAgIHRoaXMuaXNUb3VjaEFjdGl2ZSA9IHRydWU7XG4gICAgdmFyIHQgPSBlLnRvdWNoZXNbMF07XG4gICAgdGhpcy5zdGFydERyYWdnaW5nXyh0KTtcbiAgICB0aGlzLnVwZGF0ZVRvdWNoUG9pbnRlcl8oZSk7XG5cbiAgICB0aGlzLmVtaXQoJ3BvaW50ZXJtb3ZlJywgdGhpcy5wb2ludGVyTmRjKTtcbiAgICB0aGlzLmVtaXQoJ3JheWRvd24nKTtcblxuICAgIC8vIFByZXZlbnQgc3ludGhldGljIG1vdXNlIGV2ZW50IGZyb20gYmVpbmcgY3JlYXRlZC5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cblxuICBvblRvdWNoTW92ZV8oZSkge1xuICAgIHRoaXMudXBkYXRlVG91Y2hQb2ludGVyXyhlKTtcbiAgICB0aGlzLnVwZGF0ZURyYWdEaXN0YW5jZV8oKTtcblxuICAgIC8vIFByZXZlbnQgc3ludGhldGljIG1vdXNlIGV2ZW50IGZyb20gYmVpbmcgY3JlYXRlZC5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cblxuICBvblRvdWNoRW5kXyhlKSB7XG4gICAgdGhpcy5lbmREcmFnZ2luZ18oKTtcblxuICAgIC8vIFByZXZlbnQgc3ludGhldGljIG1vdXNlIGV2ZW50IGZyb20gYmVpbmcgY3JlYXRlZC5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5pc1RvdWNoQWN0aXZlID0gZmFsc2U7XG4gIH1cblxuICB1cGRhdGVUb3VjaFBvaW50ZXJfKGUpIHtcbiAgICAvLyBJZiB0aGVyZSdzIG5vIHRvdWNoZXMgYXJyYXksIGlnbm9yZS5cbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc29sZS53YXJuKCdSZWNlaXZlZCB0b3VjaCBldmVudCB3aXRoIG5vIHRvdWNoZXMuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0ID0gZS50b3VjaGVzWzBdO1xuICAgIHRoaXMudXBkYXRlUG9pbnRlcl8odCk7XG4gIH1cblxuICB1cGRhdGVQb2ludGVyXyhlKSB7XG4gICAgLy8gSG93IG11Y2ggdGhlIHBvaW50ZXIgbW92ZWQuXG4gICAgdGhpcy5wb2ludGVyLnNldChlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gICAgdGhpcy5wb2ludGVyTmRjLnggPSAoZS5jbGllbnRYIC8gdGhpcy5zaXplLndpZHRoKSAqIDIgLSAxO1xuICAgIHRoaXMucG9pbnRlck5kYy55ID0gLSAoZS5jbGllbnRZIC8gdGhpcy5zaXplLmhlaWdodCkgKiAyICsgMTtcbiAgfVxuXG4gIHVwZGF0ZURyYWdEaXN0YW5jZV8oKSB7XG4gICAgaWYgKHRoaXMuaXNEcmFnZ2luZykge1xuICAgICAgdmFyIGRpc3RhbmNlID0gdGhpcy5sYXN0UG9pbnRlci5zdWIodGhpcy5wb2ludGVyKS5sZW5ndGgoKTtcbiAgICAgIHRoaXMuZHJhZ0Rpc3RhbmNlICs9IGRpc3RhbmNlO1xuICAgICAgdGhpcy5sYXN0UG9pbnRlci5jb3B5KHRoaXMucG9pbnRlcik7XG5cblxuICAgICAgLy9jb25zb2xlLmxvZygnZHJhZ0Rpc3RhbmNlJywgdGhpcy5kcmFnRGlzdGFuY2UpO1xuICAgICAgaWYgKHRoaXMuZHJhZ0Rpc3RhbmNlID4gRFJBR19ESVNUQU5DRV9QWCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3JheWNhbmNlbCcpO1xuICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGFydERyYWdnaW5nXyhlKSB7XG4gICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmxhc3RQb2ludGVyLnNldChlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gIH1cblxuICBlbmREcmFnZ2luZ18oKSB7XG4gICAgaWYgKHRoaXMuZHJhZ0Rpc3RhbmNlIDwgRFJBR19ESVNUQU5DRV9QWCkge1xuICAgICAgdGhpcy5lbWl0KCdyYXl1cCcpO1xuICAgIH1cbiAgICB0aGlzLmRyYWdEaXN0YW5jZSA9IDA7XG4gICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgZmlyc3QgVlItZW5hYmxlZCBnYW1lcGFkLlxuICAgKi9cbiAgZ2V0VlJHYW1lcGFkXygpIHtcbiAgICAvLyBJZiB0aGVyZSdzIG5vIGdhbWVwYWQgQVBJLCB0aGVyZSdzIG5vIGdhbWVwYWQuXG4gICAgaWYgKCFuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciBnYW1lcGFkcyA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZXBhZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBnYW1lcGFkID0gZ2FtZXBhZHNbaV07XG5cbiAgICAgIC8vIFRoZSBhcnJheSBtYXkgY29udGFpbiB1bmRlZmluZWQgZ2FtZXBhZHMsIHNvIGNoZWNrIGZvciB0aGF0IGFzIHdlbGwgYXNcbiAgICAgIC8vIGEgbm9uLW51bGwgcG9zZS5cbiAgICAgIGlmIChnYW1lcGFkICYmIGdhbWVwYWQucG9zZSkge1xuICAgICAgICByZXR1cm4gZ2FtZXBhZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCBPcmllbnRhdGlvbkFybU1vZGVsIGZyb20gJy4vb3JpZW50YXRpb24tYXJtLW1vZGVsJ1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudGVtaXR0ZXIzJ1xuaW1wb3J0IFJheVJlbmRlcmVyIGZyb20gJy4vcmF5LXJlbmRlcmVyJ1xuaW1wb3J0IFJheUNvbnRyb2xsZXIgZnJvbSAnLi9yYXktY29udHJvbGxlcidcbmltcG9ydCBJbnRlcmFjdGlvbk1vZGVzIGZyb20gJy4vcmF5LWludGVyYWN0aW9uLW1vZGVzJ1xuXG4vKipcbiAqIEFQSSB3cmFwcGVyIGZvciB0aGUgaW5wdXQgbGlicmFyeS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmF5SW5wdXQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihjYW1lcmEpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5jYW1lcmEgPSBjYW1lcmE7XG4gICAgdGhpcy5yZW5kZXJlciA9IG5ldyBSYXlSZW5kZXJlcihjYW1lcmEpO1xuICAgIHRoaXMuY29udHJvbGxlciA9IG5ldyBSYXlDb250cm9sbGVyKCk7XG5cbiAgICAvLyBBcm0gbW9kZWwgbmVlZGVkIHRvIHRyYW5zZm9ybSBjb250cm9sbGVyIG9yaWVudGF0aW9uIGludG8gcHJvcGVyIHBvc2UuXG4gICAgdGhpcy5hcm1Nb2RlbCA9IG5ldyBPcmllbnRhdGlvbkFybU1vZGVsKCk7XG5cbiAgICB0aGlzLmNvbnRyb2xsZXIub24oJ3JheWRvd24nLCB0aGlzLm9uUmF5RG93bl8uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5jb250cm9sbGVyLm9uKCdyYXl1cCcsIHRoaXMub25SYXlVcF8uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5jb250cm9sbGVyLm9uKCdyYXljYW5jZWwnLCB0aGlzLm9uUmF5Q2FuY2VsXy5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIub24oJ3BvaW50ZXJtb3ZlJywgdGhpcy5vblBvaW50ZXJNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbmRlcmVyLm9uKCdyYXlvdmVyJywgKG1lc2gpID0+IHsgdGhpcy5lbWl0KCdyYXlvdmVyJywgbWVzaCkgfSk7XG4gICAgdGhpcy5yZW5kZXJlci5vbigncmF5b3V0JywgKG1lc2gpID0+IHsgdGhpcy5lbWl0KCdyYXlvdXQnLCBtZXNoKSB9KTtcblxuICAgIC8vIEJ5IGRlZmF1bHQsIHB1dCB0aGUgcG9pbnRlciBvZmZzY3JlZW4uXG4gICAgdGhpcy5wb2ludGVyTmRjID0gbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSk7XG5cbiAgICAvLyBFdmVudCBoYW5kbGVycy5cbiAgICB0aGlzLmhhbmRsZXJzID0ge307XG4gIH1cblxuICBhZGQob2JqZWN0LCBoYW5kbGVycykge1xuICAgIHRoaXMucmVuZGVyZXIuYWRkKG9iamVjdCwgaGFuZGxlcnMpO1xuICAgIHRoaXMuaGFuZGxlcnNbb2JqZWN0LmlkXSA9IGhhbmRsZXJzO1xuICB9XG5cbiAgcmVtb3ZlKG9iamVjdCkge1xuICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlKG9iamVjdCk7XG4gICAgZGVsZXRlIHRoaXMuaGFuZGxlcnNbb2JqZWN0LmlkXVxuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGxldCBsb29rQXQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSk7XG4gICAgbG9va0F0LmFwcGx5UXVhdGVybmlvbih0aGlzLmNhbWVyYS5xdWF0ZXJuaW9uKTtcblxuICAgIGxldCBtb2RlID0gdGhpcy5jb250cm9sbGVyLmdldEludGVyYWN0aW9uTW9kZSgpO1xuICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgY2FzZSBJbnRlcmFjdGlvbk1vZGVzLk1PVVNFOlxuICAgICAgICAvLyBEZXNrdG9wIG1vdXNlIG1vZGUsIG1vdXNlIGNvb3JkaW5hdGVzIGFyZSB3aGF0IG1hdHRlcnMuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UG9pbnRlcih0aGlzLnBvaW50ZXJOZGMpO1xuICAgICAgICAvLyBIaWRlIHRoZSByYXkgYW5kIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmF5VmlzaWJpbGl0eShmYWxzZSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmV0aWNsZVZpc2liaWxpdHkoZmFsc2UpO1xuXG4gICAgICAgIC8vIEluIG1vdXNlIG1vZGUgcmF5IHJlbmRlcmVyIGlzIGFsd2F5cyBhY3RpdmUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBJbnRlcmFjdGlvbk1vZGVzLlRPVUNIOlxuICAgICAgICAvLyBNb2JpbGUgbWFnaWMgd2luZG93IG1vZGUuIFRvdWNoIGNvb3JkaW5hdGVzIG1hdHRlciwgYnV0IHdlIHdhbnQgdG9cbiAgICAgICAgLy8gaGlkZSB0aGUgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRQb2ludGVyKHRoaXMucG9pbnRlck5kYyk7XG5cbiAgICAgICAgLy8gSGlkZSB0aGUgcmF5IGFuZCB0aGUgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSYXlWaXNpYmlsaXR5KGZhbHNlKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSZXRpY2xlVmlzaWJpbGl0eShmYWxzZSk7XG5cbiAgICAgICAgLy8gSW4gdG91Y2ggbW9kZSB0aGUgcmF5IHJlbmRlcmVyIGlzIG9ubHkgYWN0aXZlIG9uIHRvdWNoLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0aGlzLmNvbnRyb2xsZXIuZ2V0SXNUb3VjaEFjdGl2ZSgpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgSW50ZXJhY3Rpb25Nb2Rlcy5WUl8wRE9GOlxuICAgICAgICAvLyBDYXJkYm9hcmQgbW9kZSwgd2UncmUgZGVhbGluZyB3aXRoIGEgZ2F6ZSByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFBvc2l0aW9uKHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRPcmllbnRhdGlvbih0aGlzLmNhbWVyYS5xdWF0ZXJuaW9uKTtcblxuICAgICAgICAvLyBSZXRpY2xlIG9ubHkuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmF5VmlzaWJpbGl0eShmYWxzZSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmV0aWNsZVZpc2liaWxpdHkodHJ1ZSk7XG5cbiAgICAgICAgLy8gUmF5IHJlbmRlcmVyIGFsd2F5cyBhY3RpdmUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBJbnRlcmFjdGlvbk1vZGVzLlZSXzNET0Y6XG4gICAgICAgIC8vIERheWRyZWFtLCBvdXIgb3JpZ2luIGlzIHNsaWdodGx5IG9mZiAoZGVwZW5kaW5nIG9uIGhhbmRlZG5lc3MpLlxuICAgICAgICAvLyBCdXQgd2Ugc2hvdWxkIGJlIHVzaW5nIHRoZSBvcmllbnRhdGlvbiBmcm9tIHRoZSBnYW1lcGFkLlxuICAgICAgICAvLyBUT0RPKHNtdXMpOiBJbXBsZW1lbnQgdGhlIHJlYWwgYXJtIG1vZGVsLlxuICAgICAgICB2YXIgcG9zZSA9IHRoaXMuY29udHJvbGxlci5nZXRHYW1lcGFkUG9zZSgpO1xuXG4gICAgICAgIC8vIERlYnVnIG9ubHk6IHVzZSBjYW1lcmEgYXMgaW5wdXQgY29udHJvbGxlci5cbiAgICAgICAgLy9sZXQgY29udHJvbGxlck9yaWVudGF0aW9uID0gdGhpcy5jYW1lcmEucXVhdGVybmlvbjtcbiAgICAgICAgbGV0IGNvbnRyb2xsZXJPcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuZnJvbUFycmF5KHBvc2Uub3JpZW50YXRpb24pO1xuXG4gICAgICAgIC8vIFRyYW5zZm9ybSB0aGUgY29udHJvbGxlciBpbnRvIHRoZSBjYW1lcmEgY29vcmRpbmF0ZSBzeXN0ZW0uXG4gICAgICAgIC8qXG4gICAgICAgIGNvbnRyb2xsZXJPcmllbnRhdGlvbi5tdWx0aXBseShcbiAgICAgICAgICAgIG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuc2V0RnJvbUF4aXNBbmdsZShuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKSwgTWF0aC5QSSkpO1xuICAgICAgICBjb250cm9sbGVyT3JpZW50YXRpb24ueCAqPSAtMTtcbiAgICAgICAgY29udHJvbGxlck9yaWVudGF0aW9uLnogKj0gLTE7XG4gICAgICAgICovXG5cbiAgICAgICAgLy8gRmVlZCBjYW1lcmEgYW5kIGNvbnRyb2xsZXIgaW50byB0aGUgYXJtIG1vZGVsLlxuICAgICAgICB0aGlzLmFybU1vZGVsLnNldEhlYWRPcmllbnRhdGlvbih0aGlzLmNhbWVyYS5xdWF0ZXJuaW9uKTtcbiAgICAgICAgdGhpcy5hcm1Nb2RlbC5zZXRIZWFkUG9zaXRpb24odGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICB0aGlzLmFybU1vZGVsLnNldENvbnRyb2xsZXJPcmllbnRhdGlvbihjb250cm9sbGVyT3JpZW50YXRpb24pO1xuICAgICAgICB0aGlzLmFybU1vZGVsLnVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIEdldCByZXN1bHRpbmcgcG9zZSBhbmQgY29uZmlndXJlIHRoZSByZW5kZXJlci5cbiAgICAgICAgbGV0IG1vZGVsUG9zZSA9IHRoaXMuYXJtTW9kZWwuZ2V0UG9zZSgpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFBvc2l0aW9uKG1vZGVsUG9zZS5wb3NpdGlvbik7XG4gICAgICAgIC8vdGhpcy5yZW5kZXJlci5zZXRQb3NpdGlvbihuZXcgVEhSRUUuVmVjdG9yMygpKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRPcmllbnRhdGlvbihtb2RlbFBvc2Uub3JpZW50YXRpb24pO1xuICAgICAgICAvL3RoaXMucmVuZGVyZXIuc2V0T3JpZW50YXRpb24oY29udHJvbGxlck9yaWVudGF0aW9uKTtcblxuICAgICAgICAvLyBTaG93IHJheSBhbmQgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSYXlWaXNpYmlsaXR5KHRydWUpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJldGljbGVWaXNpYmlsaXR5KHRydWUpO1xuXG4gICAgICAgIC8vIFJheSByZW5kZXJlciBhbHdheXMgYWN0aXZlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgSW50ZXJhY3Rpb25Nb2Rlcy5WUl82RE9GOlxuICAgICAgICAvLyBWaXZlLCBvcmlnaW4gZGVwZW5kcyBvbiB0aGUgcG9zaXRpb24gb2YgdGhlIGNvbnRyb2xsZXIuXG4gICAgICAgIC8vIFRPRE8oc211cykuLi5cbiAgICAgICAgdmFyIHBvc2UgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0R2FtZXBhZFBvc2UoKTtcblxuICAgICAgICAvLyBDaGVjayB0aGF0IHRoZSBwb3NlIGlzIHZhbGlkLlxuICAgICAgICBpZiAoIXBvc2Uub3JpZW50YXRpb24gfHwgIXBvc2UucG9zaXRpb24pIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0ludmFsaWQgZ2FtZXBhZCBwb3NlLiBDYW5cXCd0IHVwZGF0ZSByYXkuJyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5mcm9tQXJyYXkocG9zZS5vcmllbnRhdGlvbik7XG4gICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuZnJvbUFycmF5KHBvc2UucG9zaXRpb24pO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvbXBvc2VkID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgICAgICAgbGV0IHN0YW5kaW5nT3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAgICAgICBsZXQgc3RhbmRpbmdQb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgICAgIGxldCBzdGFuZGluZ1NjYWxlID0gbmV3IFRIUkVFLlZlY3RvcigpO1xuICAgICAgICBjb21wb3NlZC5tYWtlUm90YXRpb25Gcm9tUXVhdGVybmlvbihvcmllbnRhdGlvbik7XG4gICAgICAgIGNvbXBvc2VkLnNldFBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgICAgY29tcG9zZWQucHJlbXVsdGlwbHkodnJEaXNwbGF5LnN0YWdlUGFyYW1ldGVycy5zaXR0aW5nVG9TdGFuZGluZ1RyYW5zZm9ybSk7XG4gICAgICAgIGNvbXBvc2VkLmRlY29tcG9zZShzdGFuZGluZ1Bvc2l0aW9uLCBzdGFuZGluZ09yaWVudGF0aW9uLCBzdGFuZGluZ1NjYWxlKTtcblxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldE9yaWVudGF0aW9uKHN0YW5kaW5nT3JpZW50YXRpb24pO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFBvc2l0aW9uKHN0YW5kaW5nUG9zaXRpb24pO1xuXG4gICAgICAgIC8vIFNob3cgcmF5IGFuZCByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJheVZpc2liaWxpdHkodHJ1ZSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmV0aWNsZVZpc2liaWxpdHkodHJ1ZSk7XG5cbiAgICAgICAgLy8gUmF5IHJlbmRlcmVyIGFsd2F5cyBhY3RpdmUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBpbnRlcmFjdGlvbiBtb2RlLicpO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcmVyLnVwZGF0ZSgpO1xuICAgIHRoaXMuY29udHJvbGxlci51cGRhdGUoKTtcbiAgfVxuXG4gIHNldFNpemUoc2l6ZSkge1xuICAgIHRoaXMuY29udHJvbGxlci5zZXRTaXplKHNpemUpO1xuICB9XG5cbiAgZ2V0TWVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlci5nZXRSZXRpY2xlUmF5TWVzaCgpO1xuICB9XG5cbiAgZ2V0T3JpZ2luKCkge1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmdldE9yaWdpbigpO1xuICB9XG5cbiAgZ2V0RGlyZWN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmdldERpcmVjdGlvbigpO1xuICB9XG5cbiAgZ2V0UmlnaHREaXJlY3Rpb24oKSB7XG4gICAgbGV0IGxvb2tBdCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0xKTtcbiAgICBsb29rQXQuYXBwbHlRdWF0ZXJuaW9uKHRoaXMuY2FtZXJhLnF1YXRlcm5pb24pO1xuICAgIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMygpLmNyb3NzVmVjdG9ycyhsb29rQXQsIHRoaXMuY2FtZXJhLnVwKTtcbiAgfVxuXG4gIG9uUmF5RG93bl8oZSkge1xuICAgIC8vY29uc29sZS5sb2coJ29uUmF5RG93bl8nKTtcblxuICAgIC8vIEZvcmNlIHRoZSByZW5kZXJlciB0byByYXljYXN0LlxuICAgIHRoaXMucmVuZGVyZXIudXBkYXRlKCk7XG4gICAgbGV0IG1lc2ggPSB0aGlzLnJlbmRlcmVyLmdldFNlbGVjdGVkTWVzaCgpO1xuICAgIHRoaXMuZW1pdCgncmF5ZG93bicsIG1lc2gpO1xuXG4gICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodHJ1ZSk7XG4gIH1cblxuICBvblJheVVwXyhlKSB7XG4gICAgLy9jb25zb2xlLmxvZygnb25SYXlVcF8nKTtcbiAgICBsZXQgbWVzaCA9IHRoaXMucmVuZGVyZXIuZ2V0U2VsZWN0ZWRNZXNoKCk7XG4gICAgdGhpcy5lbWl0KCdyYXl1cCcsIG1lc2gpO1xuXG4gICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUoZmFsc2UpO1xuICB9XG5cbiAgb25SYXlDYW5jZWxfKGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdvblJheUNhbmNlbF8nKTtcbiAgICBsZXQgbWVzaCA9IHRoaXMucmVuZGVyZXIuZ2V0U2VsZWN0ZWRNZXNoKCk7XG4gICAgdGhpcy5lbWl0KCdyYXljYW5jZWwnLCBtZXNoKTtcbiAgfVxuXG4gIG9uUG9pbnRlck1vdmVfKG5kYykge1xuICAgIHRoaXMucG9pbnRlck5kYy5jb3B5KG5kYyk7XG4gIH1cbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbnZhciBJbnRlcmFjdGlvbk1vZGVzID0ge1xuICBNT1VTRTogMSxcbiAgVE9VQ0g6IDIsXG4gIFZSXzBET0Y6IDMsXG4gIFZSXzNET0Y6IDQsXG4gIFZSXzZET0Y6IDVcbn07XG5cbmV4cG9ydCB7IEludGVyYWN0aW9uTW9kZXMgYXMgZGVmYXVsdCB9O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHtiYXNlNjR9IGZyb20gJy4vdXRpbCdcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRlbWl0dGVyMydcblxuY29uc3QgUkVUSUNMRV9ESVNUQU5DRSA9IDM7XG5jb25zdCBJTk5FUl9SQURJVVMgPSAwLjAyO1xuY29uc3QgT1VURVJfUkFESVVTID0gMC4wNDtcbmNvbnN0IFJBWV9SQURJVVMgPSAwLjAyO1xuY29uc3QgR1JBRElFTlRfSU1BR0UgPSBiYXNlNjQoJ2ltYWdlL3BuZycsICdpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBSUFBQUFDQUNBWUFBQUREUG1ITEFBQUJka2xFUVZSNG5PM1d3WEhFUUF3RFFjaW4vRk9XdytCanVpUFlCMnE0RzJuUDkzM1A5U080ODI0emdEQURpRE9BdUhmYjMvVWp1S01BY1FZUVp3QngvZ0J4Q2hDbkFIRUtFS2NBY1FvUXB3QnhDaENuQUhFR0VHY0FjZjRBY1FvUVp3QnhCaEJuQUhFR0VHY0FjUVlRWndCeEJoQm5BSEVHRUdjQWNRWVFad0J4QmhCbkFISHZ0dC8xSTdpakFIRUdFR2NBY2Y0QWNRb1Fad0J4VGtDY0FzUVpRSndURUtjQWNRb1Fwd0J4QmhEbkJNUXBRSndDeENsQW5BTEVLVUNjQXNRcFFKd0N4Q2xBbkFMRUtVQ2NBc1FwUUp3QnhEa0JjUW9RcHdCeENoQ25BSEVLRUtjQWNRb1Fwd0J4Q2hDbkFIRUtFR2NBY1U1QW5BTEVLVUNjQXNRWlFKd1RFS2NBY1FZUTV3VEVLVUNjQWNRWlFKdy9RSndDeEJsQW5BSEVHVUNjQWNRWlFKd0J4QmxBbkFIRUdVQ2NBY1FaUUp3QnhCbEFuQUhFR1VEY3UrMjVmZ1IzRkNET0FPSU1JTTRmSUU0QjRoUWdUZ0hpRkNCT0FlSVVJRTRCNGhRZ3pnRGlEQ0RPSHlCT0FlSU1JTTRBNHY0Qi81SUY5ZUQ2UXhnQUFBQUFTVVZPUks1Q1lJST0nKTtcblxuLyoqXG4gKiBIYW5kbGVzIHJheSBpbnB1dCBzZWxlY3Rpb24gZnJvbSBmcmFtZSBvZiByZWZlcmVuY2Ugb2YgYW4gYXJiaXRyYXJ5IG9iamVjdC5cbiAqXG4gKiBUaGUgc291cmNlIG9mIHRoZSByYXkgaXMgZnJvbSB2YXJpb3VzIGxvY2F0aW9uczpcbiAqXG4gKiBEZXNrdG9wOiBtb3VzZS5cbiAqIE1hZ2ljIHdpbmRvdzogdG91Y2guXG4gKiBDYXJkYm9hcmQ6IGNhbWVyYS5cbiAqIERheWRyZWFtOiAzRE9GIGNvbnRyb2xsZXIgdmlhIGdhbWVwYWQgKGFuZCBzaG93IHJheSkuXG4gKiBWaXZlOiA2RE9GIGNvbnRyb2xsZXIgdmlhIGdhbWVwYWQgKGFuZCBzaG93IHJheSkuXG4gKlxuICogRW1pdHMgc2VsZWN0aW9uIGV2ZW50czpcbiAqICAgICByYXlvdmVyKG1lc2gpOiBUaGlzIG1lc2ggd2FzIHNlbGVjdGVkLlxuICogICAgIHJheW91dChtZXNoKTogVGhpcyBtZXNoIHdhcyB1bnNlbGVjdGVkLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSYXlSZW5kZXJlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGNhbWVyYSwgb3B0X3BhcmFtcykge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNhbWVyYSA9IGNhbWVyYTtcblxuICAgIHZhciBwYXJhbXMgPSBvcHRfcGFyYW1zIHx8IHt9O1xuXG4gICAgLy8gV2hpY2ggb2JqZWN0cyBhcmUgaW50ZXJhY3RpdmUgKGtleWVkIG9uIGlkKS5cbiAgICB0aGlzLm1lc2hlcyA9IHt9O1xuXG4gICAgLy8gV2hpY2ggb2JqZWN0cyBhcmUgY3VycmVudGx5IHNlbGVjdGVkIChrZXllZCBvbiBpZCkuXG4gICAgdGhpcy5zZWxlY3RlZCA9IHt9O1xuXG4gICAgLy8gVGhlIHJheWNhc3Rlci5cbiAgICB0aGlzLnJheWNhc3RlciA9IG5ldyBUSFJFRS5SYXljYXN0ZXIoKTtcblxuICAgIC8vIFBvc2l0aW9uIGFuZCBvcmllbnRhdGlvbiwgaW4gYWRkaXRpb24uXG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgdGhpcy5vcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgICB0aGlzLnJvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIC8vIEFkZCB0aGUgcmV0aWNsZSBtZXNoIHRvIHRoZSByb290IG9mIHRoZSBvYmplY3QuXG4gICAgdGhpcy5yZXRpY2xlID0gdGhpcy5jcmVhdGVSZXRpY2xlXygpO1xuICAgIHRoaXMucm9vdC5hZGQodGhpcy5yZXRpY2xlKTtcblxuICAgIC8vIEFkZCB0aGUgcmF5IHRvIHRoZSByb290IG9mIHRoZSBvYmplY3QuXG4gICAgdGhpcy5yYXkgPSB0aGlzLmNyZWF0ZVJheV8oKTtcbiAgICB0aGlzLnJvb3QuYWRkKHRoaXMucmF5KTtcblxuICAgIC8vIEhvdyBmYXIgdGhlIHJldGljbGUgaXMgY3VycmVudGx5IGZyb20gdGhlIHJldGljbGUgb3JpZ2luLlxuICAgIHRoaXMucmV0aWNsZURpc3RhbmNlID0gUkVUSUNMRV9ESVNUQU5DRTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhbiBvYmplY3Qgc28gdGhhdCBpdCBjYW4gYmUgaW50ZXJhY3RlZCB3aXRoLlxuICAgKi9cbiAgYWRkKG9iamVjdCkge1xuICAgIHRoaXMubWVzaGVzW29iamVjdC5pZF0gPSBvYmplY3Q7XG4gIH1cblxuICAvKipcbiAgICogUHJldmVudCBhbiBvYmplY3QgZnJvbSBiZWluZyBpbnRlcmFjdGVkIHdpdGguXG4gICAqL1xuICByZW1vdmUob2JqZWN0KSB7XG4gICAgdmFyIGlkID0gb2JqZWN0LmlkO1xuICAgIGlmICghdGhpcy5tZXNoZXNbaWRdKSB7XG4gICAgICAvLyBJZiB0aGVyZSdzIG5vIGV4aXN0aW5nIG1lc2gsIHdlIGNhbid0IHJlbW92ZSBpdC5cbiAgICAgIGRlbGV0ZSB0aGlzLm1lc2hlc1tpZF07XG4gICAgfVxuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgY3VycmVudGx5IHNlbGVjdGVkLCByZW1vdmUgaXQuXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRbaWRdKSB7XG4gICAgICBkZWxldGUgdGhpcy5zZWxlY3RlZFtvYmplY3QuaWRdO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICAvLyBEbyB0aGUgcmF5Y2FzdGluZyBhbmQgaXNzdWUgdmFyaW91cyBldmVudHMgYXMgbmVlZGVkLlxuICAgIGZvciAobGV0IGlkIGluIHRoaXMubWVzaGVzKSB7XG4gICAgICBsZXQgbWVzaCA9IHRoaXMubWVzaGVzW2lkXTtcbiAgICAgIGxldCBpbnRlcnNlY3RzID0gdGhpcy5yYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0KG1lc2gsIHRydWUpO1xuICAgICAgaWYgKGludGVyc2VjdHMubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1VuZXhwZWN0ZWQ6IG11bHRpcGxlIG1lc2hlcyBpbnRlcnNlY3RlZC4nKTtcbiAgICAgIH1cbiAgICAgIGxldCBpc0ludGVyc2VjdGVkID0gKGludGVyc2VjdHMubGVuZ3RoID4gMCk7XG4gICAgICBsZXQgaXNTZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWRbaWRdO1xuXG4gICAgICAvLyBJZiBpdCdzIG5ld2x5IHNlbGVjdGVkLCBzZW5kIHJheW92ZXIuXG4gICAgICBpZiAoaXNJbnRlcnNlY3RlZCAmJiAhaXNTZWxlY3RlZCkge1xuICAgICAgICB0aGlzLnNlbGVjdGVkW2lkXSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdyYXlvdmVyJywgbWVzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgaXQncyBubyBsb25nZXIgaW50ZXJzZWN0ZWQsIHNlbmQgcmF5b3V0LlxuICAgICAgaWYgKCFpc0ludGVyc2VjdGVkICYmIGlzU2VsZWN0ZWQpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc2VsZWN0ZWRbaWRdO1xuICAgICAgICB0aGlzLm1vdmVSZXRpY2xlXyhudWxsKTtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JheW91dCcsIG1lc2gpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0ludGVyc2VjdGVkKSB7XG4gICAgICAgIHRoaXMubW92ZVJldGljbGVfKGludGVyc2VjdHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBvcmlnaW4gb2YgdGhlIHJheS5cbiAgICogQHBhcmFtIHtWZWN0b3J9IHZlY3RvciBQb3NpdGlvbiBvZiB0aGUgb3JpZ2luIG9mIHRoZSBwaWNraW5nIHJheS5cbiAgICovXG4gIHNldFBvc2l0aW9uKHZlY3Rvcikge1xuICAgIHRoaXMucG9zaXRpb24uY29weSh2ZWN0b3IpO1xuICAgIHRoaXMucmF5Y2FzdGVyLnJheS5vcmlnaW4uY29weSh2ZWN0b3IpO1xuICAgIHRoaXMudXBkYXRlUmF5Y2FzdGVyXygpO1xuICB9XG5cbiAgZ2V0T3JpZ2luKCkge1xuICAgIHJldHVybiB0aGlzLnJheWNhc3Rlci5yYXkub3JpZ2luO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGRpcmVjdGlvbiBvZiB0aGUgcmF5LlxuICAgKiBAcGFyYW0ge1ZlY3Rvcn0gdmVjdG9yIFVuaXQgdmVjdG9yIGNvcnJlc3BvbmRpbmcgdG8gZGlyZWN0aW9uLlxuICAgKi9cbiAgc2V0T3JpZW50YXRpb24ocXVhdGVybmlvbikge1xuICAgIHRoaXMub3JpZW50YXRpb24uY29weShxdWF0ZXJuaW9uKTtcblxuICAgIHZhciBwb2ludEF0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpLmFwcGx5UXVhdGVybmlvbihxdWF0ZXJuaW9uKTtcbiAgICB0aGlzLnJheWNhc3Rlci5yYXkuZGlyZWN0aW9uLmNvcHkocG9pbnRBdClcbiAgICB0aGlzLnVwZGF0ZVJheWNhc3Rlcl8oKTtcbiAgfVxuXG4gIGdldERpcmVjdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yYXljYXN0ZXIucmF5LmRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb2ludGVyIG9uIHRoZSBzY3JlZW4gZm9yIGNhbWVyYSArIHBvaW50ZXIgYmFzZWQgcGlja2luZy4gVGhpc1xuICAgKiBzdXBlcnNjZWRlcyBvcmlnaW4gYW5kIGRpcmVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtWZWN0b3IyfSB2ZWN0b3IgVGhlIHBvc2l0aW9uIG9mIHRoZSBwb2ludGVyIChzY3JlZW4gY29vcmRzKS5cbiAgICovXG4gIHNldFBvaW50ZXIodmVjdG9yKSB7XG4gICAgdGhpcy5yYXljYXN0ZXIuc2V0RnJvbUNhbWVyYSh2ZWN0b3IsIHRoaXMuY2FtZXJhKTtcbiAgICB0aGlzLnVwZGF0ZVJheWNhc3Rlcl8oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZXNoLCB3aGljaCBpbmNsdWRlcyByZXRpY2xlIGFuZC9vciByYXkuIFRoaXMgbWVzaCBpcyB0aGVuIGFkZGVkXG4gICAqIHRvIHRoZSBzY2VuZS5cbiAgICovXG4gIGdldFJldGljbGVSYXlNZXNoKCkge1xuICAgIHJldHVybiB0aGlzLnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudGx5IHNlbGVjdGVkIG9iamVjdCBpbiB0aGUgc2NlbmUuXG4gICAqL1xuICBnZXRTZWxlY3RlZE1lc2goKSB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBsZXQgbWVzaCA9IG51bGw7XG4gICAgZm9yICh2YXIgaWQgaW4gdGhpcy5zZWxlY3RlZCkge1xuICAgICAgY291bnQgKz0gMTtcbiAgICAgIG1lc2ggPSB0aGlzLm1lc2hlc1tpZF07XG4gICAgfVxuICAgIGlmIChjb3VudCA+IDEpIHtcbiAgICAgIGNvbnNvbGUud2FybignTW9yZSB0aGFuIG9uZSBtZXNoIHNlbGVjdGVkLicpO1xuICAgIH1cbiAgICByZXR1cm4gbWVzaDtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyBhbmQgc2hvd3MgdGhlIHJldGljbGUuXG4gICAqL1xuICBzZXRSZXRpY2xlVmlzaWJpbGl0eShpc1Zpc2libGUpIHtcbiAgICB0aGlzLnJldGljbGUudmlzaWJsZSA9IGlzVmlzaWJsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmFibGVzIG9yIGRpc2FibGVzIHRoZSByYXljYXN0aW5nIHJheSB3aGljaCBncmFkdWFsbHkgZmFkZXMgb3V0IGZyb21cbiAgICogdGhlIG9yaWdpbi5cbiAgICovXG4gIHNldFJheVZpc2liaWxpdHkoaXNWaXNpYmxlKSB7XG4gICAgdGhpcy5yYXkudmlzaWJsZSA9IGlzVmlzaWJsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmFibGVzIGFuZCBkaXNhYmxlcyB0aGUgcmF5Y2FzdGVyLiBGb3IgdG91Y2gsIHdoZXJlIGZpbmdlciB1cCBtZWFucyB3ZVxuICAgKiBzaG91bGRuJ3QgYmUgcmF5Y2FzdGluZy5cbiAgICovXG4gIHNldEFjdGl2ZShpc0FjdGl2ZSkge1xuICAgIC8vIElmIG5vdGhpbmcgY2hhbmdlZCwgZG8gbm90aGluZy5cbiAgICBpZiAodGhpcy5pc0FjdGl2ZSA9PSBpc0FjdGl2ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUT0RPKHNtdXMpOiBTaG93IHRoZSByYXkgb3IgcmV0aWNsZSBhZGp1c3QgaW4gcmVzcG9uc2UuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGlzQWN0aXZlO1xuXG4gICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgdGhpcy5tb3ZlUmV0aWNsZV8obnVsbCk7XG4gICAgICBmb3IgKGxldCBpZCBpbiB0aGlzLnNlbGVjdGVkKSB7XG4gICAgICAgIGxldCBtZXNoID0gdGhpcy5tZXNoZXNbaWRdO1xuICAgICAgICBkZWxldGUgdGhpcy5zZWxlY3RlZFtpZF07XG4gICAgICAgIHRoaXMuZW1pdCgncmF5b3V0JywgbWVzaCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmF5Y2FzdGVyXygpIHtcbiAgICB2YXIgcmF5ID0gdGhpcy5yYXljYXN0ZXIucmF5O1xuXG4gICAgLy8gUG9zaXRpb24gdGhlIHJldGljbGUgYXQgYSBkaXN0YW5jZSwgYXMgY2FsY3VsYXRlZCBmcm9tIHRoZSBvcmlnaW4gYW5kXG4gICAgLy8gZGlyZWN0aW9uLlxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMucmV0aWNsZS5wb3NpdGlvbjtcbiAgICBwb3NpdGlvbi5jb3B5KHJheS5kaXJlY3Rpb24pO1xuICAgIHBvc2l0aW9uLm11bHRpcGx5U2NhbGFyKHRoaXMucmV0aWNsZURpc3RhbmNlKTtcbiAgICBwb3NpdGlvbi5hZGQocmF5Lm9yaWdpbik7XG5cbiAgICAvLyBTZXQgcG9zaXRpb24gYW5kIG9yaWVudGF0aW9uIG9mIHRoZSByYXkgc28gdGhhdCBpdCBnb2VzIGZyb20gb3JpZ2luIHRvXG4gICAgLy8gcmV0aWNsZS5cbiAgICB2YXIgZGVsdGEgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNvcHkocmF5LmRpcmVjdGlvbik7XG4gICAgZGVsdGEubXVsdGlwbHlTY2FsYXIodGhpcy5yZXRpY2xlRGlzdGFuY2UpO1xuICAgIHRoaXMucmF5LnNjYWxlLnkgPSBkZWx0YS5sZW5ndGgoKTtcbiAgICB2YXIgYXJyb3cgPSBuZXcgVEhSRUUuQXJyb3dIZWxwZXIocmF5LmRpcmVjdGlvbiwgcmF5Lm9yaWdpbik7XG4gICAgdGhpcy5yYXkucm90YXRpb24uY29weShhcnJvdy5yb3RhdGlvbik7XG4gICAgdGhpcy5yYXkucG9zaXRpb24uYWRkVmVjdG9ycyhyYXkub3JpZ2luLCBkZWx0YS5tdWx0aXBseVNjYWxhcigwLjUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSBnZW9tZXRyeSBvZiB0aGUgcmV0aWNsZS5cbiAgICovXG4gIGNyZWF0ZVJldGljbGVfKCkge1xuICAgIC8vIENyZWF0ZSBhIHNwaGVyaWNhbCByZXRpY2xlLlxuICAgIGxldCBpbm5lckdlb21ldHJ5ID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KElOTkVSX1JBRElVUywgMzIsIDMyKTtcbiAgICBsZXQgaW5uZXJNYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICBjb2xvcjogMHhmZmZmZmYsXG4gICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgIG9wYWNpdHk6IDAuOVxuICAgIH0pO1xuICAgIGxldCBpbm5lciA9IG5ldyBUSFJFRS5NZXNoKGlubmVyR2VvbWV0cnksIGlubmVyTWF0ZXJpYWwpO1xuXG4gICAgbGV0IG91dGVyR2VvbWV0cnkgPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoT1VURVJfUkFESVVTLCAzMiwgMzIpO1xuICAgIGxldCBvdXRlck1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiAweDMzMzMzMyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC4zXG4gICAgfSk7XG4gICAgbGV0IG91dGVyID0gbmV3IFRIUkVFLk1lc2gob3V0ZXJHZW9tZXRyeSwgb3V0ZXJNYXRlcmlhbCk7XG5cbiAgICBsZXQgcmV0aWNsZSA9IG5ldyBUSFJFRS5Hcm91cCgpO1xuICAgIHJldGljbGUuYWRkKGlubmVyKTtcbiAgICByZXRpY2xlLmFkZChvdXRlcik7XG4gICAgcmV0dXJuIHJldGljbGU7XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgdGhlIHJldGljbGUgdG8gYSBwb3NpdGlvbiBzbyB0aGF0IGl0J3MganVzdCBpbiBmcm9udCBvZiB0aGUgbWVzaCB0aGF0XG4gICAqIGl0IGludGVyc2VjdGVkIHdpdGguXG4gICAqL1xuICBtb3ZlUmV0aWNsZV8oaW50ZXJzZWN0aW9ucykge1xuICAgIC8vIElmIG5vIGludGVyc2VjdGlvbiwgcmV0dXJuIHRoZSByZXRpY2xlIHRvIHRoZSBkZWZhdWx0IHBvc2l0aW9uLlxuICAgIGxldCBkaXN0YW5jZSA9IFJFVElDTEVfRElTVEFOQ0U7XG4gICAgaWYgKGludGVyc2VjdGlvbnMpIHtcbiAgICAgIC8vIE90aGVyd2lzZSwgZGV0ZXJtaW5lIHRoZSBjb3JyZWN0IGRpc3RhbmNlLlxuICAgICAgbGV0IGludGVyID0gaW50ZXJzZWN0aW9uc1swXTtcbiAgICAgIGRpc3RhbmNlID0gaW50ZXIuZGlzdGFuY2U7XG4gICAgfVxuXG4gICAgdGhpcy5yZXRpY2xlRGlzdGFuY2UgPSBkaXN0YW5jZTtcbiAgICB0aGlzLnVwZGF0ZVJheWNhc3Rlcl8oKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjcmVhdGVSYXlfKCkge1xuICAgIC8vIENyZWF0ZSBhIGN5bGluZHJpY2FsIHJheS5cbiAgICB2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShSQVlfUkFESVVTLCBSQVlfUkFESVVTLCAxLCAzMik7XG4gICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgIG1hcDogVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZShHUkFESUVOVF9JTUFHRSksXG4gICAgICAvL2NvbG9yOiAweGZmZmZmZixcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC4zXG4gICAgfSk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIG1lc2g7XG4gIH1cbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBpc01vYmlsZSgpIHtcbiAgdmFyIGNoZWNrID0gZmFsc2U7XG4gIChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICByZXR1cm4gY2hlY2s7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjQobWltZVR5cGUsIGJhc2U2NCkge1xuICByZXR1cm4gJ2RhdGE6JyArIG1pbWVUeXBlICsgJztiYXNlNjQsJyArIGJhc2U2NDtcbn1cbiIsIi8qKlxuICogVHdlZW4uanMgLSBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS90d2VlbmpzL3R3ZWVuLmpzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90d2VlbmpzL3R3ZWVuLmpzL2dyYXBocy9jb250cmlidXRvcnMgZm9yIHRoZSBmdWxsIGxpc3Qgb2YgY29udHJpYnV0b3JzLlxuICogVGhhbmsgeW91IGFsbCwgeW91J3JlIGF3ZXNvbWUhXG4gKi9cblxudmFyIFRXRUVOID0gVFdFRU4gfHwgKGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgX3R3ZWVucyA9IFtdO1xuXG5cdHJldHVybiB7XG5cblx0XHRnZXRBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0cmV0dXJuIF90d2VlbnM7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdF90d2VlbnMgPSBbXTtcblxuXHRcdH0sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uICh0d2Vlbikge1xuXG5cdFx0XHRfdHdlZW5zLnB1c2godHdlZW4pO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZTogZnVuY3Rpb24gKHR3ZWVuKSB7XG5cblx0XHRcdHZhciBpID0gX3R3ZWVucy5pbmRleE9mKHR3ZWVuKTtcblxuXHRcdFx0aWYgKGkgIT09IC0xKSB7XG5cdFx0XHRcdF90d2VlbnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKHRpbWUsIHByZXNlcnZlKSB7XG5cblx0XHRcdGlmIChfdHdlZW5zLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBpID0gMDtcblxuXHRcdFx0dGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiBUV0VFTi5ub3coKTtcblxuXHRcdFx0d2hpbGUgKGkgPCBfdHdlZW5zLmxlbmd0aCkge1xuXG5cdFx0XHRcdGlmIChfdHdlZW5zW2ldLnVwZGF0ZSh0aW1lKSB8fCBwcmVzZXJ2ZSkge1xuXHRcdFx0XHRcdGkrKztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRfdHdlZW5zLnNwbGljZShpLCAxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0fVxuXHR9O1xuXG59KSgpO1xuXG5cbi8vIEluY2x1ZGUgYSBwZXJmb3JtYW5jZS5ub3cgcG9seWZpbGxcbihmdW5jdGlvbiAoKSB7XG5cdC8vIEluIG5vZGUuanMsIHVzZSBwcm9jZXNzLmhydGltZS5cblx0aWYgKHRoaXMud2luZG93ID09PSB1bmRlZmluZWQgJiYgdGhpcy5wcm9jZXNzICE9PSB1bmRlZmluZWQpIHtcblx0XHRUV0VFTi5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGltZSA9IHByb2Nlc3MuaHJ0aW1lKCk7XG5cblx0XHRcdC8vIENvbnZlcnQgW3NlY29uZHMsIG1pY3Jvc2Vjb25kc10gdG8gbWlsbGlzZWNvbmRzLlxuXHRcdFx0cmV0dXJuIHRpbWVbMF0gKiAxMDAwICsgdGltZVsxXSAvIDEwMDA7XG5cdFx0fTtcblx0fVxuXHQvLyBJbiBhIGJyb3dzZXIsIHVzZSB3aW5kb3cucGVyZm9ybWFuY2Uubm93IGlmIGl0IGlzIGF2YWlsYWJsZS5cblx0ZWxzZSBpZiAodGhpcy53aW5kb3cgIT09IHVuZGVmaW5lZCAmJlxuXHQgICAgICAgICB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJlxuXHRcdCB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQpIHtcblxuXHRcdC8vIFRoaXMgbXVzdCBiZSBib3VuZCwgYmVjYXVzZSBkaXJlY3RseSBhc3NpZ25pbmcgdGhpcyBmdW5jdGlvblxuXHRcdC8vIGxlYWRzIHRvIGFuIGludm9jYXRpb24gZXhjZXB0aW9uIGluIENocm9tZS5cblx0XHRUV0VFTi5ub3cgPSB3aW5kb3cucGVyZm9ybWFuY2Uubm93LmJpbmQod2luZG93LnBlcmZvcm1hbmNlKTtcblx0fVxuXHQvLyBVc2UgRGF0ZS5ub3cgaWYgaXQgaXMgYXZhaWxhYmxlLlxuXHRlbHNlIGlmIChEYXRlLm5vdyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0VFdFRU4ubm93ID0gRGF0ZS5ub3c7XG5cdH1cblx0Ly8gT3RoZXJ3aXNlLCB1c2UgJ25ldyBEYXRlKCkuZ2V0VGltZSgpJy5cblx0ZWxzZSB7XG5cdFx0VFdFRU4ubm93ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdH07XG5cdH1cbn0pKCk7XG5cblxuVFdFRU4uVHdlZW4gPSBmdW5jdGlvbiAob2JqZWN0KSB7XG5cblx0dmFyIF9vYmplY3QgPSBvYmplY3Q7XG5cdHZhciBfdmFsdWVzU3RhcnQgPSB7fTtcblx0dmFyIF92YWx1ZXNFbmQgPSB7fTtcblx0dmFyIF92YWx1ZXNTdGFydFJlcGVhdCA9IHt9O1xuXHR2YXIgX2R1cmF0aW9uID0gMTAwMDtcblx0dmFyIF9yZXBlYXQgPSAwO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIFNldCBhbGwgc3RhcnRpbmcgdmFsdWVzIHByZXNlbnQgb24gdGhlIHRhcmdldCBvYmplY3Rcblx0Zm9yICh2YXIgZmllbGQgaW4gb2JqZWN0KSB7XG5cdFx0X3ZhbHVlc1N0YXJ0W2ZpZWxkXSA9IHBhcnNlRmxvYXQob2JqZWN0W2ZpZWxkXSwgMTApO1xuXHR9XG5cblx0dGhpcy50byA9IGZ1bmN0aW9uIChwcm9wZXJ0aWVzLCBkdXJhdGlvbikge1xuXG5cdFx0aWYgKGR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdF9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH1cblxuXHRcdF92YWx1ZXNFbmQgPSBwcm9wZXJ0aWVzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKHRpbWUpIHtcblxuXHRcdFRXRUVOLmFkZCh0aGlzKTtcblxuXHRcdF9pc1BsYXlpbmcgPSB0cnVlO1xuXG5cdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cblx0XHRfc3RhcnRUaW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6IFRXRUVOLm5vdygpO1xuXHRcdF9zdGFydFRpbWUgKz0gX2RlbGF5VGltZTtcblxuXHRcdGZvciAodmFyIHByb3BlcnR5IGluIF92YWx1ZXNFbmQpIHtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgYW4gQXJyYXkgd2FzIHByb3ZpZGVkIGFzIHByb3BlcnR5IHZhbHVlXG5cdFx0XHRpZiAoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXG5cdFx0XHRcdGlmIChfdmFsdWVzRW5kW3Byb3BlcnR5XS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENyZWF0ZSBhIGxvY2FsIGNvcHkgb2YgdGhlIEFycmF5IHdpdGggdGhlIHN0YXJ0IHZhbHVlIGF0IHRoZSBmcm9udFxuXHRcdFx0XHRfdmFsdWVzRW5kW3Byb3BlcnR5XSA9IFtfb2JqZWN0W3Byb3BlcnR5XV0uY29uY2F0KF92YWx1ZXNFbmRbcHJvcGVydHldKTtcblxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiBgdG8oKWAgc3BlY2lmaWVzIGEgcHJvcGVydHkgdGhhdCBkb2Vzbid0IGV4aXN0IGluIHRoZSBzb3VyY2Ugb2JqZWN0LFxuXHRcdFx0Ly8gd2Ugc2hvdWxkIG5vdCBzZXQgdGhhdCBwcm9wZXJ0eSBpbiB0aGUgb2JqZWN0XG5cdFx0XHRpZiAoX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRbcHJvcGVydHldID0gX29iamVjdFtwcm9wZXJ0eV07XG5cblx0XHRcdGlmICgoX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSBpbnN0YW5jZW9mIEFycmF5KSA9PT0gZmFsc2UpIHtcblx0XHRcdFx0X3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSAqPSAxLjA7IC8vIEVuc3VyZXMgd2UncmUgdXNpbmcgbnVtYmVycywgbm90IHN0cmluZ3Ncblx0XHRcdH1cblxuXHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSA9IF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gfHwgMDtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0aWYgKCFfaXNQbGF5aW5nKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHRUV0VFTi5yZW1vdmUodGhpcyk7XG5cdFx0X2lzUGxheWluZyA9IGZhbHNlO1xuXG5cdFx0aWYgKF9vblN0b3BDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0X29uU3RvcENhbGxiYWNrLmNhbGwoX29iamVjdCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucygpO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGZvciAodmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrKSB7XG5cdFx0XHRfY2hhaW5lZFR3ZWVuc1tpXS5zdG9wKCk7XG5cdFx0fVxuXG5cdH07XG5cblx0dGhpcy5kZWxheSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcblxuXHRcdF9kZWxheVRpbWUgPSBhbW91bnQ7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnJlcGVhdCA9IGZ1bmN0aW9uICh0aW1lcykge1xuXG5cdFx0X3JlcGVhdCA9IHRpbWVzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy55b3lvID0gZnVuY3Rpb24gKHlveW8pIHtcblxuXHRcdF95b3lvID0geW95bztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cblx0dGhpcy5lYXNpbmcgPSBmdW5jdGlvbiAoZWFzaW5nKSB7XG5cblx0XHRfZWFzaW5nRnVuY3Rpb24gPSBlYXNpbmc7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLmludGVycG9sYXRpb24gPSBmdW5jdGlvbiAoaW50ZXJwb2xhdGlvbikge1xuXG5cdFx0X2ludGVycG9sYXRpb25GdW5jdGlvbiA9IGludGVycG9sYXRpb247XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLmNoYWluID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0X2NoYWluZWRUd2VlbnMgPSBhcmd1bWVudHM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RhcnQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25VcGRhdGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRcdF9vblVwZGF0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uQ29tcGxldGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRcdF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdG9wID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25TdG9wQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKHRpbWUpIHtcblxuXHRcdHZhciBwcm9wZXJ0eTtcblx0XHR2YXIgZWxhcHNlZDtcblx0XHR2YXIgdmFsdWU7XG5cblx0XHRpZiAodGltZSA8IF9zdGFydFRpbWUpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChfb25TdGFydENhbGxiYWNrRmlyZWQgPT09IGZhbHNlKSB7XG5cblx0XHRcdGlmIChfb25TdGFydENhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRcdF9vblN0YXJ0Q2FsbGJhY2suY2FsbChfb2JqZWN0KTtcblx0XHRcdH1cblxuXHRcdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gdHJ1ZTtcblxuXHRcdH1cblxuXHRcdGVsYXBzZWQgPSAodGltZSAtIF9zdGFydFRpbWUpIC8gX2R1cmF0aW9uO1xuXHRcdGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG5cdFx0dmFsdWUgPSBfZWFzaW5nRnVuY3Rpb24oZWxhcHNlZCk7XG5cblx0XHRmb3IgKHByb3BlcnR5IGluIF92YWx1ZXNFbmQpIHtcblxuXHRcdFx0Ly8gRG9uJ3QgdXBkYXRlIHByb3BlcnRpZXMgdGhhdCBkbyBub3QgZXhpc3QgaW4gdGhlIHNvdXJjZSBvYmplY3Rcblx0XHRcdGlmIChfdmFsdWVzU3RhcnRbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBzdGFydCA9IF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gfHwgMDtcblx0XHRcdHZhciBlbmQgPSBfdmFsdWVzRW5kW3Byb3BlcnR5XTtcblxuXHRcdFx0aWYgKGVuZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cblx0XHRcdFx0X29iamVjdFtwcm9wZXJ0eV0gPSBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uKGVuZCwgdmFsdWUpO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdC8vIFBhcnNlcyByZWxhdGl2ZSBlbmQgdmFsdWVzIHdpdGggc3RhcnQgYXMgYmFzZSAoZS5nLjogKzEwLCAtMylcblx0XHRcdFx0aWYgKHR5cGVvZiAoZW5kKSA9PT0gJ3N0cmluZycpIHtcblxuXHRcdFx0XHRcdGlmIChlbmQuY2hhckF0KDApID09PSAnKycgfHwgZW5kLmNoYXJBdCgwKSA9PT0gJy0nKSB7XG5cdFx0XHRcdFx0XHRlbmQgPSBzdGFydCArIHBhcnNlRmxvYXQoZW5kLCAxMCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGVuZCA9IHBhcnNlRmxvYXQoZW5kLCAxMCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICh0eXBlb2YgKGVuZCkgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0X29iamVjdFtwcm9wZXJ0eV0gPSBzdGFydCArIChlbmQgLSBzdGFydCkgKiB2YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRpZiAoX29uVXBkYXRlQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblVwZGF0ZUNhbGxiYWNrLmNhbGwoX29iamVjdCwgdmFsdWUpO1xuXHRcdH1cblxuXHRcdGlmIChlbGFwc2VkID09PSAxKSB7XG5cblx0XHRcdGlmIChfcmVwZWF0ID4gMCkge1xuXG5cdFx0XHRcdGlmIChpc0Zpbml0ZShfcmVwZWF0KSkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0KSB7XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIChfdmFsdWVzRW5kW3Byb3BlcnR5XSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0sIDEwKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRcdHZhciB0bXAgPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldO1xuXG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc0VuZFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHRfdmFsdWVzRW5kW3Byb3BlcnR5XSA9IHRtcDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRfdmFsdWVzU3RhcnRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0X3JldmVyc2VkID0gIV9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX2RlbGF5VGltZTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoX29uQ29tcGxldGVDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdF9vbkNvbXBsZXRlQ2FsbGJhY2suY2FsbChfb2JqZWN0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrKSB7XG5cdFx0XHRcdFx0Ly8gTWFrZSB0aGUgY2hhaW5lZCB0d2VlbnMgc3RhcnQgZXhhY3RseSBhdCB0aGUgdGltZSB0aGV5IHNob3VsZCxcblx0XHRcdFx0XHQvLyBldmVuIGlmIHRoZSBgdXBkYXRlKClgIG1ldGhvZCB3YXMgY2FsbGVkIHdheSBwYXN0IHRoZSBkdXJhdGlvbiBvZiB0aGUgdHdlZW5cblx0XHRcdFx0XHRfY2hhaW5lZFR3ZWVuc1tpXS5zdGFydChfc3RhcnRUaW1lICsgX2R1cmF0aW9uKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cblx0fTtcblxufTtcblxuXG5UV0VFTi5FYXNpbmcgPSB7XG5cblx0TGluZWFyOiB7XG5cblx0XHROb25lOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gaztcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YWRyYXRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogKDIgLSBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAtIDAuNSAqICgtLWsgKiAoayAtIDIpIC0gMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDdWJpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoKGsgLT0gMikgKiBrICogayArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhcnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSAoLS1rICogayAqIGsgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gMC41ICogKChrIC09IDIpICogayAqIGsgKiBrIC0gMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWludGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICogayAqIGsgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFNpbnVzb2lkYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguY29zKGsgKiBNYXRoLlBJIC8gMik7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5zaW4oayAqIE1hdGguUEkgLyAyKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEV4cG9uZW50aWFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDAgPyAwIDogTWF0aC5wb3coMTAyNCwgayAtIDEpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDEgPyAxIDogMSAtIE1hdGgucG93KDIsIC0gMTAgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBNYXRoLnBvdygxMDI0LCBrIC0gMSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoLSBNYXRoLnBvdygyLCAtIDEwICogKGsgLSAxKSkgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdENpcmN1bGFyOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLnNxcnQoMSAtIGsgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIC0gMC41ICogKE1hdGguc3FydCgxIC0gayAqIGspIC0gMSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoTWF0aC5zcXJ0KDEgLSAoayAtPSAyKSAqIGspICsgMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFbGFzdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLU1hdGgucG93KDIsIDEwICogKGsgLSAxKSkgKiBNYXRoLnNpbigoayAtIDEuMSkgKiA1ICogTWF0aC5QSSk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBNYXRoLnBvdygyLCAtMTAgKiBrKSAqIE1hdGguc2luKChrIC0gMC4xKSAqIDUgKiBNYXRoLlBJKSArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0ayAqPSAyO1xuXG5cdFx0XHRpZiAoayA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIC0wLjUgKiBNYXRoLnBvdygyLCAxMCAqIChrIC0gMSkpICogTWF0aC5zaW4oKGsgLSAxLjEpICogNSAqIE1hdGguUEkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogTWF0aC5wb3coMiwgLTEwICogKGsgLSAxKSkgKiBNYXRoLnNpbigoayAtIDEuMSkgKiA1ICogTWF0aC5QSSkgKyAxO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0QmFjazoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogKChzICsgMSkgKiBrIC0gcyk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogKChzICsgMSkgKiBrICsgcykgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogKGsgKiBrICogKChzICsgMSkgKiBrIC0gcykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqICgocyArIDEpICogayArIHMpICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCb3VuY2U6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KDEgLSBrKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrIDwgKDEgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogayAqIGs7XG5cdFx0XHR9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG5cdFx0XHR9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrIDwgMC41KSB7XG5cdFx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLkluKGsgKiAyKSAqIDAuNTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KGsgKiAyIC0gMSkgKiAwLjUgKyAwLjU7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5UV0VFTi5JbnRlcnBvbGF0aW9uID0ge1xuXG5cdExpbmVhcjogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBmID0gbSAqIGs7XG5cdFx0dmFyIGkgPSBNYXRoLmZsb29yKGYpO1xuXHRcdHZhciBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuTGluZWFyO1xuXG5cdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRyZXR1cm4gZm4odlswXSwgdlsxXSwgZik7XG5cdFx0fVxuXG5cdFx0aWYgKGsgPiAxKSB7XG5cdFx0XHRyZXR1cm4gZm4odlttXSwgdlttIC0gMV0sIG0gLSBmKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZm4odltpXSwgdltpICsgMSA+IG0gPyBtIDogaSArIDFdLCBmIC0gaSk7XG5cblx0fSxcblxuXHRCZXppZXI6IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgYiA9IDA7XG5cdFx0dmFyIG4gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIHB3ID0gTWF0aC5wb3c7XG5cdFx0dmFyIGJuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5CZXJuc3RlaW47XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8PSBuOyBpKyspIHtcblx0XHRcdGIgKz0gcHcoMSAtIGssIG4gLSBpKSAqIHB3KGssIGkpICogdltpXSAqIGJuKG4sIGkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBiO1xuXG5cdH0sXG5cblx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBmID0gbSAqIGs7XG5cdFx0dmFyIGkgPSBNYXRoLmZsb29yKGYpO1xuXHRcdHZhciBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQ2F0bXVsbFJvbTtcblxuXHRcdGlmICh2WzBdID09PSB2W21dKSB7XG5cblx0XHRcdGlmIChrIDwgMCkge1xuXHRcdFx0XHRpID0gTWF0aC5mbG9vcihmID0gbSAqICgxICsgaykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZm4odlsoaSAtIDEgKyBtKSAlIG1dLCB2W2ldLCB2WyhpICsgMSkgJSBtXSwgdlsoaSArIDIpICUgbV0sIGYgLSBpKTtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGlmIChrIDwgMCkge1xuXHRcdFx0XHRyZXR1cm4gdlswXSAtIChmbih2WzBdLCB2WzBdLCB2WzFdLCB2WzFdLCAtZikgLSB2WzBdKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPiAxKSB7XG5cdFx0XHRcdHJldHVybiB2W21dIC0gKGZuKHZbbV0sIHZbbV0sIHZbbSAtIDFdLCB2W20gLSAxXSwgZiAtIG0pIC0gdlttXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmbih2W2kgPyBpIC0gMSA6IDBdLCB2W2ldLCB2W20gPCBpICsgMSA/IG0gOiBpICsgMV0sIHZbbSA8IGkgKyAyID8gbSA6IGkgKyAyXSwgZiAtIGkpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0VXRpbHM6IHtcblxuXHRcdExpbmVhcjogZnVuY3Rpb24gKHAwLCBwMSwgdCkge1xuXG5cdFx0XHRyZXR1cm4gKHAxIC0gcDApICogdCArIHAwO1xuXG5cdFx0fSxcblxuXHRcdEJlcm5zdGVpbjogZnVuY3Rpb24gKG4sIGkpIHtcblxuXHRcdFx0dmFyIGZjID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5GYWN0b3JpYWw7XG5cblx0XHRcdHJldHVybiBmYyhuKSAvIGZjKGkpIC8gZmMobiAtIGkpO1xuXG5cdFx0fSxcblxuXHRcdEZhY3RvcmlhbDogKGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0dmFyIGEgPSBbMV07XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAobikge1xuXG5cdFx0XHRcdHZhciBzID0gMTtcblxuXHRcdFx0XHRpZiAoYVtuXSkge1xuXHRcdFx0XHRcdHJldHVybiBhW25dO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IG47IGkgPiAxOyBpLS0pIHtcblx0XHRcdFx0XHRzICo9IGk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhW25dID0gcztcblx0XHRcdFx0cmV0dXJuIHM7XG5cblx0XHRcdH07XG5cblx0XHR9KSgpLFxuXG5cdFx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKHAwLCBwMSwgcDIsIHAzLCB0KSB7XG5cblx0XHRcdHZhciB2MCA9IChwMiAtIHAwKSAqIDAuNTtcblx0XHRcdHZhciB2MSA9IChwMyAtIHAxKSAqIDAuNTtcblx0XHRcdHZhciB0MiA9IHQgKiB0O1xuXHRcdFx0dmFyIHQzID0gdCAqIHQyO1xuXG5cdFx0XHRyZXR1cm4gKDIgKiBwMSAtIDIgKiBwMiArIHYwICsgdjEpICogdDMgKyAoLSAzICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSkgKiB0MiArIHYwICogdCArIHAxO1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxuLy8gVU1EIChVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24pXG4oZnVuY3Rpb24gKHJvb3QpIHtcblxuXHRpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cblx0XHQvLyBBTURcblx0XHRkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBUV0VFTjtcblx0XHR9KTtcblxuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXG5cdFx0Ly8gTm9kZS5qc1xuXHRcdG1vZHVsZS5leHBvcnRzID0gVFdFRU47XG5cblx0fSBlbHNlIGlmIChyb290ICE9PSB1bmRlZmluZWQpIHtcblxuXHRcdC8vIEdsb2JhbCB2YXJpYWJsZVxuXHRcdHJvb3QuVFdFRU4gPSBUV0VFTjtcblxuXHR9XG5cbn0pKHRoaXMpO1xuIiwiaW1wb3J0IFBhcGEgZnJvbSAncGFwYXBhcnNlJztcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5cbi8qKlxuICogQmFzZSBEYXRhc2V0IGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBEYXRhc2V0IHtcblxuXHQvKipcblx0ICpcblx0ICovXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuZGF0YXBvaW50cyA9IHt9O1xuXHRcdHRoaXMuZW1iZWRkaW5ncyA9IFtdO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgdGhhdCBpcyB0cmlnZ2VyZWQgYWZ0ZXIgdGhlIGRhdGFzZXQgaXMgbG9hZGVkOyB0eXBpY2FsbHkgdXNlZCB0byBjcmVhdGVcblx0ICogYW4gZW1iZWRkaW5nIGJhc2VkIG9uIHRoZSBkYXRhc2V0LlxuXHQgKiBAY2FsbGJhY2sgQ1NWRGF0YXNldENhbGxiYWNrXG5cdCAqIEBwYXJhbSB7RGF0YXNldH0gZGF0YXNldCAtIFRoZSBEYXRhc2V0IGxvYWRlZCBmcm9tIHRoZSBjc3YgZmlsZVxuXHQgKi9cblxuXHQvKipcblx0ICogQ3JlYXRlIGEge0RhdGFzZXR9IGZyb20gYSBjc3YgZmlsZSB0aGF0IGNhbiBiZSBmb3VuZCBhdCB0aGUgZ2l2ZW4gdXJsXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgLSBUaGUgdXJsIHdoZXJlIHRoZSBjc3YgZmlsZSBjYW4gYmUgZm91bmRcblx0ICogQHBhcmFtIHtDU1ZEYXRhc2V0Q2FsbGJhY2t9IGNhbGxiYWNrXG5cdCAqL1xuXHRzdGF0aWMgY3JlYXRlRnJvbUNTVih1cmwsIGNhbGxiYWNrKSB7XG5cdFx0UGFwYS5wYXJzZSh1cmwsIHtcblx0XHRcdGRvd25sb2FkOiB0cnVlLFxuXHRcdFx0aGVhZGVyOiB0cnVlLFxuXHRcdFx0ZHluYW1pY1R5cGluZzogdHJ1ZSxcblx0XHRcdGNvbXBsZXRlOiBmdW5jdGlvbihyZXN1bHRzKSB7XG5cdFx0XHRcdHZhciBkcyA9IG5ldyBEYXRhc2V0KCk7XG5cdFx0XHRcdGZvciAobGV0IGkgaW4gcmVzdWx0cy5kYXRhKSB7XG5cdFx0XHRcdFx0bGV0IGRwID0gcmVzdWx0cy5kYXRhW2ldO1xuXHRcdFx0XHRcdGRwLl9pZCA9IGk7XG5cdFx0XHRcdFx0ZHMuYWRkKGRwKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhkcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQWRkIGEgZGF0YXBvaW50IHRvIHRoZSBEYXRhc2V0XG5cdCAqIEBwYXJhbSB7RGF0YXBvaW50fSBkYXRhcG9pbnRcblx0ICovXG5cdGFkZChkYXRhcG9pbnQpIHtcblx0XHR2YXIgZDtcblx0XHRpZiAoISAoZGF0YXBvaW50IGluc3RhbmNlb2YgRGF0YXBvaW50KSkge1xuXHRcdFx0ZCA9IG5ldyBEYXRhcG9pbnQoZGF0YXBvaW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZCA9IGRhdGFwb2ludDtcblx0XHR9XG5cdFx0dGhpcy5kYXRhcG9pbnRzW2QuaWRdID0gZDtcblx0XHR0aGlzLnNlbmROb3RpZmljYXRpb25zKCdhZGQnLCBkLmlkKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgYSBkYXRhcG9pbnQgZnJvbSB0aGUgRGF0YXNldFxuXHQgKiBAcGFyYW0gaWQgLSBUaGUgaWQgb2YgdGhlIGRhdGFwb2ludCB0byByZW1vdmVcblx0ICovXG5cdHJlbW92ZShpZCkge1xuXHRcdGRlbGV0ZSB0aGlzLmRhdGFwb2ludHNbaWRdO1xuXHRcdHRoaXMuc2VuZE5vdGlmaWNhdGlvbnMoJ3JlbW92ZScsIGlkKVxuXHR9XG5cblx0LyoqXG5cdCAqIE1vZGlmeSB0aGUgdmFsdWUgb2YgYSBkYXRhcG9pbnQgYXR0cmlidXRlXG5cdCAqIEBwYXJhbSBpZCAtIFRoZSBpZCBvZiB0aGUgZGF0YXBvaW50IHRvIG1vZGlmeVxuXHQgKiBAcGFyYW0gayAtIFRoZSBrZXkgd2hvc2UgdmFsdWUgdG8gbW9kaWZ5XG5cdCBAIEBwYXJhbSB2IC0gVGhlIG5ldyB2YWx1ZVxuXHQgKi9cblx0dXBkYXRlKGlkLCBrLCB2KSB7XG5cdFx0bGV0IGRwID0gdGhpcy5kYXRhcG9pbnRzW2lkXTtcblx0XHRpZiAoZHApIHtcblx0XHRcdGxldCBvbGQgPSBkcC5nZXQoayk7XG5cdFx0XHRkcC5zZXQoaywgdik7XG5cdFx0XHR0aGlzLnNlbmROb3RpZmljYXRpb25zKCd1cGRhdGUnLCBpZCwgaywgdiwgb2xkKVxuXHRcdH1cblx0fVxuXG5cdGdldChpZCkgeyByZXR1cm4gdGhpcy5kYXRhcG9pbnRzW2lkXTsgfVxuXG5cdGdldElkcygpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuZGF0YXBvaW50cyk7IH1cblxuXHRyZWdpc3RlcihlbWJlZGRpbmcpIHtcblx0XHR0aGlzLmVtYmVkZGluZ3MucHVzaChlbWJlZGRpbmcpO1xuXHR9XG5cblx0c2VuZE5vdGlmaWNhdGlvbnModHlwZSwgaWQsIC4uLngpIHtcblx0XHRsZXQgbXNnID0geyB0eXBlOiB0eXBlLCBpZDogaWQgfTtcblx0XHRpZiAodHlwZSA9PSAndXBkYXRlJykge1xuXHRcdFx0bXNnLmF0dHIgPSB4WzBdO1xuXHRcdFx0bXNnLm5ld1ZhbCA9IHhbMV07XG5cdFx0XHRtc2cub2xkVmFsID0geFsyXTtcblx0XHR9XG5cdFx0dGhpcy5lbWJlZGRpbmdzLmZvckVhY2goKGUpID0+IGUubm90aWZ5KCBtc2cgKSk7XG5cdH1cbn1cblxuLyoqXG4gKiBBIERhdGFzZXQgd2hvc2UgZGF0YXBvaW50cyBhcmUgcmVjZWl2ZWQgZnJvbSBhIHdlYnNvY2tldC5cbiAqL1xuZXhwb3J0IGNsYXNzIFdlYlNvY2tldERhdGFzZXQgZXh0ZW5kcyBEYXRhc2V0IHtcblx0Y29uc3RydWN0b3IodXJsLCBvcHRpb25zID0ge30pIHtcblx0XHRvcHRpb25zID0gYXNzaWduKHtvbm1lc3NhZ2U6ICh4KSA9PiB4LCBpbml0OiAocykgPT4ge319LCBvcHRpb25zKVxuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcblx0XHR0aGlzLnNvY2tldC5vbm9wZW4gPSAoKSA9PiB0aGlzLm9wdGlvbnMuaW5pdCh0aGlzLnNvY2tldCk7XG5cdFx0dGhpcy5zb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24obSkge1xuXHRcdFx0dmFyIGQgPSB0aGlzLm9wdGlvbnMub25tZXNzYWdlKEpTT04ucGFyc2UobS5kYXRhKSk7XG5cdFx0XHR0aGlzLmFkZChkKTtcblx0XHR9LmJpbmQodGhpcyk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIERhdGFwb2ludCB7XG5cdGNvbnN0cnVjdG9yKHZhbHVlcywgaWRBdHRyaWJ1dGU9J19pZCcpIHtcblx0XHR0aGlzLnZhbHVlcyA9IHZhbHVlcztcblx0XHR0aGlzLmlkQXR0cmlidXRlID0gaWRBdHRyaWJ1dGU7XG5cdH1cblxuXHRnZXQgaWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVzW3RoaXMuaWRBdHRyaWJ1dGVdO1xuXHR9XG5cblx0Z2V0KGspIHsgcmV0dXJuIHRoaXMudmFsdWVzW2tdOyB9XG5cblx0c2V0KGssIHYpIHtcblx0XHR0aGlzLnZhbHVlc1trXSA9IHY7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG4vLyBsb2dpYyBoZXJlIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYm9yaXNtdXMvcmF5LWlucHV0L2Jsb2IvbWFzdGVyL3NyYy9yYXktY29udHJvbGxlci5qc1xuXG5leHBvcnQgY29uc3QgRElTUExBWV9UWVBFUyA9IHtcblx0REVTS1RPUDogJ0RFU0tUT1BfRElTUExBWScsXG5cdE1PQklMRTogJ01PQklMRV9EU0lQTEFZJyxcblx0VlI6ICdWUl9ESVNQTEFZJ1xufVxuXG5leHBvcnQgY29uc3QgSU5QVVRfVFlQRVMgPSB7XG5cdEtCX01PVVNFOiAnS0JfTU9VU0VfSU5QVVQnLFxuXHRUT1VDSDogJ1RPVUNIX0lOUFVUJyxcblx0VlJfR0FaRTogJ1ZSX0dBWkVfSU5QVVQnLFxuXHRWUl8zRE9GOiAnVlJfM0RPRl9JTlBVVCcsXG5cdFZSXzZET0Y6ICdWUl82RE9GX0lOUFVUJ1xufVxuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYm9yaXNtdXMvcmF5LWlucHV0L2Jsb2IvbWFzdGVyL3NyYy91dGlsLmpzXG5mdW5jdGlvbiBpc01vYmlsZSgpIHtcbiAgdmFyIGNoZWNrID0gZmFsc2U7XG4gIChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICByZXR1cm4gY2hlY2s7XG59XG5cbmZ1bmN0aW9uIGRldGVjdERpc3BsYXkoKSB7XG5cdGlmIChuYXZpZ2F0b3IuZ2V0VlJEaXNwbGF5cykge1xuXHRcdHJldHVybiBESVNQTEFZX1RZUEVTLlZSO1x0XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGlzTW9iaWxlKCkpXG5cdFx0XHRyZXR1cm4gRElTUExBWV9UWVBFUy5NT0JJTEU7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIERJU1BMQVlfVFlQRVMuREVTS1RPUDtcblx0fVxufVxuXG5mdW5jdGlvbiBkZXRlY3RJbnB1dChkaXNwbGF5TW9kZSkge1xuXHR2YXIgZ2FtZXBhZCA9IHVuZGVmaW5lZDtcblx0aWYgKG5hdmlnYXRvci5nZXRHYW1lcGFkcykge1xuXHRcdGxldCBnYW1lcGFkcyA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpO1xuXHRcdGZvciAobGV0IGdhbWVwYWQgb2YgZ2FtZXBhZHMpIHtcblx0XHRcdGlmIChnYW1lcGFkICYmIGdhbWVwYWQucG9zZSkge1xuXHRcdFx0XHRpZiAoZ2FtZXBhZC5wb3NlLmhhc1Bvc2l0aW9uKSBcblx0XHRcdFx0XHRyZXR1cm4gSU5QVVRfVFlQRVMuVlJfNkRPRjtcblx0XHRcdFx0ZWxzZSBpZiAoZ2FtZXBhZC5wb3NlLmhhc09yaWVudGF0aW9uKVxuXHRcdFx0XHRcdHJldHVybiBJTlBVVF9UWVBFUy5WUl8zRE9GO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIGdhbWVwYWQgQVBJIG5vdCBmb3VuZCBvciBubyBWUiBnYW1lcGFkIGZvdW5kXG5cdGlmIChpc01vYmlsZSgpKSB7XG5cdFx0aWYgKGRpc3BsYXlNb2RlID09IERJU1BMQVlfVFlQRVMuVlIpXG5cdFx0XHRyZXR1cm4gSU5QVVRfVFlQRVMuVlJfR0FaRTtcblx0XHRlbHNlIFxuXHRcdFx0cmV0dXJuIElOUFVUX1RZUEVTLlRPVUNIO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBJTlBVVF9UWVBFUy5LQl9NT1VTRTtcblx0fVxuXG5cdHJldHVybiBJTlBVVF9UWVBFUy5UT1VDSDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVjdE1vZGUoKSB7XG5cdGNvbnN0IGRpc3BsYXlNb2RlID0gZGV0ZWN0RGlzcGxheSgpO1xuXHRjb25zdCBpbnB1dE1vZGUgPSBkZXRlY3RJbnB1dChkaXNwbGF5TW9kZSk7XG5cdHJldHVybiB7IGRpc3BsYXlNb2RlLCBpbnB1dE1vZGUgfTtcbn0iLCJpbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuaW1wb3J0IFRXRUVOIGZyb20gJ3R3ZWVuLmpzJztcbmltcG9ydCB7IG1heWJlRXZhbCB9IGZyb20gJy4vdXRpbHMuanMnXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgYWxsIGVtYmVkZGluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbWJlZGRpbmcge1xuXHQvKipcblx0ICogRW1iZWRkaW5nIGJhc2UgY29uc3RydWN0b3IuXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0gc2NlbmUgLSBUaGUgc2NlbmUgdG8gd2hpY2ggdGhlIGVtYmVkZGluZyBiZWxvbmdzXG5cdCAqIEBwYXJhbSB7RGF0YXNldH0gZGF0YXNldCAtIFRoZSBkYXRhc2V0IHRoYXQgYmFja3MgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIC0gT3B0aW9ucyBkZXNjcmliaW5nIHRoZSBlbWJlZGRpbmcncyBsb2NhdGlvbiBhbmQgc2NhbGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLng9MF0gLSB4IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnk9MF0gLSB5IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLno9MF0gLSB6IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnJ4PTBdIC0geCByb3RhdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5yeT0wXSAtIHkgcm90YXRpb24gb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucno9MF0gLSB6IHJvdGF0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnN4PTFdIC0geCBzY2FsZSBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5zeT0xXSAtIHkgc2NhbGUgb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc3o9MV0gLSB6IHNjYWxlIG9mIHRoZSBlbWJlZGRpbmdcblx0ICovXG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zID0ge30pIHtcblx0XHR0aGlzLmRhdGFzZXQgPSBkYXRhc2V0O1xuXHRcdGlmIChkYXRhc2V0KSBkYXRhc2V0LnJlZ2lzdGVyKHRoaXMpO1xuXHRcdHRoaXMub2JqM0QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHRzY2VuZS5hZGQodGhpcy5vYmozRCk7XG5cdFx0dGhpcy5pbml0aWFsaXplZCA9IGZhbHNlO1xuXHRcdHRoaXMuZXZlbnRzID0gW107XG5cblx0XHQvLyBzZXQgZGVmYXVsdCBwb3NpdGlvbiBhbmQgcm90YXRpb25cblx0XHRvcHRpb25zID0gYXNzaWduKHsgeDogMCwgeTogMCwgejogMCB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgcng6MCwgcnk6MCwgcno6MCB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgc3g6MSwgc3k6MSwgc3o6MSB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgbWFwcGluZzoge30gfSwgb3B0aW9ucyk7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLm9iajNELnBvc2l0aW9uLnNldChvcHRpb25zLngsIG9wdGlvbnMueSwgb3B0aW9ucy56KTtcblx0XHR0aGlzLm9iajNELnJvdGF0aW9uLnNldChvcHRpb25zLnJ4LCBvcHRpb25zLnJ5LCBvcHRpb25zLnJ6KTtcblx0XHR0aGlzLm9iajNELnNjYWxlLnNldChvcHRpb25zLnN4LCBvcHRpb25zLnN5LCBvcHRpb25zLnN6KTtcblx0XHQvLyBUT0RPIGNhbm9uaWNhbGl6ZSwgc2FuaXRpemUgbWFwcGluZ1xuXHRcdHRoaXMubWFwcGluZyA9IHRoaXMub3B0aW9ucy5tYXBwaW5nO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRyYW5zbGF0ZXMgZnJvbSBhIHNvdXJjZSBwcm9wZXJ0eSBvZiBhIGRhdGFwb2ludCB0byBhIHRhcmdldCBwcm9wZXJ0eSBvZiBhbiBlbWJlZGRpbmdcblx0ICogZWxlbWVudC5cblx0ICovXG5cdF9tYXAoZHAsIHNyYykge1xuXHRcdGxldCB0Z3QgPSB0aGlzLm1hcHBpbmdbc3JjXTtcblx0XHRyZXR1cm4gdGd0ID8gZHAuZ2V0KHRndCkgOiBkcC5nZXQoc3JjKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUcmFuc2xhdGVzIGZyb20gYSBzb3VyY2UgcHJvcGVydHkgb2YgYSBkYXRhcG9pbnQgdG8gYSB0YXJnZXQgcHJvcGVydHkgb2YgYW4gZW1iZWRkaW5nXG5cdCAqIGVsZW1lbnQuXG5cdCAqL1xuXHRfbWFwQXR0cihzcmMpIHtcblx0XHRsZXQgdGd0ID0gdGhpcy5tYXBwaW5nW3NyY107XG5cdFx0cmV0dXJuIHRndCA/IHRndCA6IHNyYztcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW5kZXIgdGhlIGVtYmVkZGluZyAtIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgZWFjaCBjb25jcmV0ZSBzdWJjbGFzcy5cblx0ICogQGFic3RyYWN0XG5cdCAqL1xuXHRlbWJlZCgpIHtcblx0XHQvLyBub3QgaW1wbGVtZW50ZWQgaGVyZVxuXHR9XG5cblx0bm90aWZ5KGV2ZW50KSB7XG5cdFx0dGhpcy5ldmVudHMucHVzaChldmVudCk7XG5cdH1cblxuXHRnZXRPcHQoeCwgZHAgPSBudWxsKSB7XG5cdFx0bGV0IGEgPSB0aGlzLm9wdGlvbnNbeF07XG5cdFx0aWYgKHR5cGVvZihhKSA9PSAnZnVuY3Rpb24nKSByZXR1cm4gYShkcCk7XG5cdFx0ZWxzZSByZXR1cm4gYTtcblx0fVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGVtYmVkZGluZ3MgdGhhdCByZW5kZXIgRGF0YXBvaW50cyBhcyBpbmRpdmlkdWFsIG1lc2hlc1xuICovXG4vKipcbiAqIERlZmluZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcbiAqIHBvc2l0aW9uOiB4LHkselxuICogZ2VvIHR5cGU6IGN1YmUsIGJveCwgc3BoZXJlLCBlbGxpcHNvaWQsIHRldHJhaGVkcm9uLCBvY3RhaGVkcm9uXG4gKiBjb2xvcjogaHVlLCBzYXQsIGx1bWluYW5jZVxuICogd2lyZWZyYW1lP1xuICogXG4gKiBTdXBwbHkgZnVuY3Rpb25zIHRvIGdlbmVyYXRlIG1hdGVyaWFsIGFuZC9vciBnZW9tZXRyeSBmcm9tIGRhdGFwb2ludFxuICovXG5leHBvcnQgY2xhc3MgTWVzaEVtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbihcblx0XHRcdHtcblx0XHRcdFx0bWVzaFR5cGU6ICdjdWJlJyxcblx0XHRcdFx0Y29sb3I6IDB4ZmYwMGZmLFxuXHRcdFx0XHRlbWlzc2l2ZTogMHg4ODg4ODgsXG5cdFx0XHRcdG1ldGFsbmVzczogMCxcblx0XHRcdFx0d2lyZWZyYW1lOiBmYWxzZVxuXHRcdFx0fSwgb3B0aW9ucyk7XG5cblx0XHQvLyBTZXQgZGVmYXVsdHMgYXBwcm9wcmlhdGUgdG8gdGhlIG1lc2ggdHlwZVxuXHRcdHN3aXRjaCAob3B0aW9ucy5tZXNoVHlwZS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0XHRjYXNlICdib3gnOlxuXHRcdFx0XHRvcHRpb25zID0gYXNzaWduKHtcblx0XHRcdFx0XHRzaXplWDogLjAyLFxuXHRcdFx0XHR9LCBvcHRpb25zKTtcblx0XHRcdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRcdFx0c2l6ZVk6IG9wdGlvbnMuc2l6ZVgsXG5cdFx0XHRcdFx0c2l6ZVo6IG9wdGlvbnMuc2l6ZVhcblx0XHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc3BoZXJlJzpcblx0XHRcdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRcdFx0c2l6ZVI6IC4wMVxuXHRcdFx0XHR9LCBvcHRpb25zKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlbGxpcHNvaWQnOlxuXHRcdFx0XHRvcHRpb25zID0gYXNzaWduKHtcblx0XHRcdFx0XHRzaXplWDogLjAxLFxuXHRcdFx0XHRcdHNpemVZOiAuMDIsXG5cdFx0XHRcdFx0c2l6ZVo6IC4wM1xuXHRcdFx0XHR9LCBvcHRpb25zKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd0ZXRyYWhlZHJvbic6XG5cdFx0XHRcdG9wdGlvbnMgPSBhc3NpZ24oe1xuXHRcdFx0XHRcdHNpemVYOiAuMDJcblx0XHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0XHRcdG9wdGlvbnMgPSBhc3NpZ24oe1xuXHRcdFx0XHRcdHNpemVZOiBvcHRpb25zLnNpemVYLFxuXHRcdFx0XHRcdHNpemVaOiBvcHRpb25zLnNpemVYXG5cdFx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ29jdGFoZWRyb24nOlxuXHRcdFx0XHRvcHRpb25zID0gYXNzaWduKHtcblx0XHRcdFx0XHRzaXplWDogLjAyLFxuXHRcdFx0XHR9LCBvcHRpb25zKTtcblx0XHRcdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRcdFx0c2l6ZVk6IG9wdGlvbnMuc2l6ZVgsXG5cdFx0XHRcdFx0c2l6ZVo6IG9wdGlvbnMuc2l6ZVhcblx0XHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnY3ViZSc6XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHQvLyBmYWxsIGJhY2sgdG8gQ3ViZVxuXHRcdFx0XHRvcHRpb25zID0gYXNzaWduKHtcblx0XHRcdFx0XHRzaXplWDogLjAyXG5cdFx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHQvLyBFbnN1cmUgb3B0aW9ucy5nZW9tZXRyeSBpcyBhbiBhcnJheSBpZiBpdCBpcyBwcmVzZW50XG5cdFx0aWYgKG9wdGlvbnMuZ2VvbWV0cnkgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5nZW9tZXRyeSkpXG5cdFx0XHRvcHRpb25zLmdlb21ldHJ5ID0gW29wdGlvbnMuZ2VvbWV0cnldOyBcblxuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKTtcblxuXHRcdC8vIG1hcHBpbmcgZnJvbSBkYXRhcG9pbnQgaWRzIHRvIG1lc2hlc1xuXHRcdHRoaXMuZHBNYXAgPSB7fTtcblxuXHRcdC8vIHBsYWNlIHRoZSBkYXRhcG9pbnRzIHByZXNlbnQgaW4gdGhlIGRhdGFzZXRcblx0XHRmb3IgKGxldCBpZCBvZiB0aGlzLmRhdGFzZXQuZ2V0SWRzKCkpIHRoaXMuX3BsYWNlRGF0YXBvaW50KGlkKTtcblx0fVxuXG5cdGVtYmVkKCkge1xuXHRcdC8vIHByb2Nlc3MgZXZlbnRzIHNlbnQgYnkgdGhlIGRhdGFzZXQgc2luY2UgbGFzdCBlbWJlZCgpIGNhbGxcblx0XHRpZiAodGhpcy5ldmVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChsZXQgaSBpbiB0aGlzLmV2ZW50cykge1xuXHRcdFx0XHRsZXQgZSA9IHRoaXMuZXZlbnRzW2ldO1xuXHRcdFx0XHRpZiAgICAgIChlLnR5cGUgPT0gXCJhZGRcIikgICAgdGhpcy5fcGxhY2VEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInJlbW92ZVwiKSB0aGlzLl9yZW1vdmVEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInVwZGF0ZVwiKSB0aGlzLl91cGRhdGVEYXRhcG9pbnQoZS5pZCwgZSk7XG5cdFx0XHR9XG5cdFx0fSBcblx0XHR0aGlzLmV2ZW50cyA9IFtdO1x0XHRcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGRlZmF1bHQgT2JqZWN0M0QgY3JlYXRvcjsgdGhpcyBjYW4gYmUgb3ZlcnJpZGVuIGJ5IHN1YmNsYXNzZXMgXG5cdCAqL1xuXHRjcmVhdGVPYmplY3RGb3JEYXRhcG9pbnQoZHApIHtcblx0XHR2YXIgZ2VvcywgbWF0O1xuXHRcdGlmICh0aGlzLm9wdGlvbnMub2JqZWN0M2QpIHtcblxuXHRcdFx0bGV0IG9iamVjdDNkID0gdGhpcy5vcHRpb25zLm9iamVjdDNkO1xuXHRcdFx0aWYgKHR5cGVvZihvYmplY3QzZCkgPT0gJ2Z1bmN0aW9uJykgXG5cdFx0XHRcdHJldHVybiBvYmplY3QzZChkcCk7XG5cdFx0XHRlbHNlIGlmIChvYmplY3QzZCBpbnN0YW5jZW9mIFRIUkVFLk9iamVjdDNEKVxuXHRcdFx0XHRyZXR1cm4gb2JqZWN0M2QuY2xvbmUoKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29uc29sZS53YXJuKCdPYmplY3QzRCB0eXBlIG5vdCByZWNvZ25pemVkJyk7XG5cblx0XHR9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5nZW9tZXRyeSkgeyBcblxuXHRcdFx0Ly8gR2VvbWV0cnkoaWVzKSBzcGVjaWZpZWRcblx0XHRcdGdlb3MgPSB0aGlzLm9wdGlvbnMuZ2VvbWV0cnkubWFwKGZ1bmN0aW9uKGcpIHtcblx0XHRcdFx0aWYgKHR5cGVvZihnKSA9PSAnZnVuY3Rpb24nKVxuXHRcdFx0XHRcdHJldHVybiBnKGRwKTtcblx0XHRcdFx0ZWxzZSBpZiAoZyBpbnN0YW5jZW9mIFRIUkVFLkdlb21ldHJ5KVxuXHRcdFx0XHRcdHJldHVybiBnLmNsb25lKCk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oJ2dlb21ldHJ5IHR5cGUgbm90IHJlY29nbml6ZWQnKTtcblx0XHRcdH0uYmluZCh0aGlzKSlcblxuXHRcdH0gZWxzZSB7IFxuXHRcdFx0Ly8gQ3JlYXRlIGdlb21ldHJ5IGZyb20gcGFyYW1ldGVyc1xuXHRcdFx0c3dpdGNoICh0aGlzLm9wdGlvbnMubWVzaFR5cGUudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRjYXNlICdib3gnOlxuXHRcdFx0XHRcdGdlb3MgPSBbbmV3IFRIUkVFLkJveEdlb21ldHJ5KFxuXHRcdFx0XHRcdFx0bWF5YmVFdmFsKHRoaXMub3B0aW9ucy5zaXplWCwgZHApLFxuXHRcdFx0XHRcdFx0bWF5YmVFdmFsKHRoaXMub3B0aW9ucy5zaXplWSwgZHApLFxuXHRcdFx0XHRcdFx0bWF5YmVFdmFsKHRoaXMub3B0aW9ucy5zaXplWiwgZHApKV07XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3NwaGVyZSc6XG5cdFx0XHRcdFx0Z2VvcyA9IFtuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkobWF5YmVFdmFsKHRoaXMub3B0aW9ucy5zaXplUiwgZHApLCAxNiwgMTYpXTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnZWxsaXBzb2lkJzpcblx0XHRcdFx0XHRnZW9zID0gW25ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgxLjAsIDE2LCAxNildO1xuXHRcdFx0XHRcdGdlb3NbMF0uYXBwbHlNYXRyaXgobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlU2NhbGUoXG5cdFx0XHRcdFx0XHRtYXliZUV2YWwodGhpcy5vcHRpb25zLnNpemVYLCBkcCksXG5cdFx0XHRcdFx0XHRtYXliZUV2YWwodGhpcy5vcHRpb25zLnNpemVZLCBkcCksXG5cdFx0XHRcdFx0XHRtYXliZUV2YWwodGhpcy5vcHRpb25zLnNpemVaLCBkcCkpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAndGV0cmFoZWRyb24nOlxuXHRcdFx0XHRcdGdlb3MgPSBbbmV3IFRIUkVFLlRldHJhaGVkcm9uR2VvbWV0cnkoMS4wKV07XG5cdFx0XHRcdFx0Z2Vvc1swXS5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VTY2FsZShcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVgsIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVksIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVosIGRwKSkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdvY3RhaGVkcm9uJzpcblx0XHRcdFx0XHRnZW9zID0gW25ldyBUSFJFRS5PY3RhaGVkcm9uR2VvbWV0cnkoMS4wKV07XG5cdFx0XHRcdFx0Z2Vvc1swXS5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VTY2FsZShcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVgsIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVksIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVosIGRwKSkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdjdWJlJzpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRnZW9zID0gW25ldyBUSFJFRS5Cb3hHZW9tZXRyeShcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVgsIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVgsIGRwKSxcblx0XHRcdFx0XHRcdG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuc2l6ZVgsIGRwKSldO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLm9wdGlvbnMubWF0ZXJpYWwpIHtcblx0XHRcdGlmICh0eXBlb2YodGhpcy5vcHRpb25zLm1hdGVyaWFsKSA9PSAnZnVuY3Rpb24nKVxuXHRcdFx0XHRtYXQgPSB0aGlzLm9wdGlvbnMubWF0ZXJpYWwoZHApO1xuXHRcdFx0ZWxzZSBpZiAodGhpcy5vcHRpb25zLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWF0ZXJpYWwpIFxuXHRcdFx0XHRtYXQgPSB0aGlzLm9wdGlvbnMubWF0ZXJpYWwuY2xvbmUoKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29uc29sZS53YXJuKCdtYXRlcmlhbCB0eXBlIG5vdCByZWNvZ25pemVkJyk7XG5cdFx0fSBlbHNlIHsgLy8gQ3JlYXRlIG1hdGVyaWFsIGZyb20gcGFyYW1ldGVyc1xuXHRcdFx0bWF0ID0gbmV3IFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKHtcblx0XHRcdFx0Y29sb3I6IG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuY29sb3IsIGRwKSxcblx0XHRcdFx0ZW1pc3NpdmU6IG1heWJlRXZhbCh0aGlzLm9wdGlvbnMuZW1pc3NpdmUsIGRwKSxcblx0XHRcdFx0bWV0YWxuZXNzOiBtYXliZUV2YWwodGhpcy5vcHRpb25zLm1ldGFsbmVzcywgZHApLFxuXHRcdFx0XHR3aXJlZnJhbWU6IG1heWJlRXZhbCh0aGlzLm9wdGlvbnMud2lyZWZyYW1lLCBkcClcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRsZXQgb2JqID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cdFx0Zm9yIChsZXQgZ2VvIG9mIGdlb3MpXG5cdFx0XHRvYmouYWRkKG5ldyBUSFJFRS5NZXNoKGdlbywgbWF0KSk7XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cdF9wbGFjZURhdGFwb2ludChpZCkge1xuXHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0bGV0IG9iaiA9IHRoaXMuY3JlYXRlT2JqZWN0Rm9yRGF0YXBvaW50KGRwKTtcblx0XHRvYmoudXNlckRhdGEuZGVzY3JpcHRpb24gPSB0aGlzLmdldE9wdChcImRlc2NyaXB0aW9uXCIsIGRwKTtcblx0XHR0aGlzLmRwTWFwW2lkXSA9IG9iajtcblx0XHR0aGlzLm9iajNELmFkZChvYmopO1xuXHRcdFRIUkVFLmlucHV0LmFkZChvYmopO1xuXHRcdG9iai5wb3NpdGlvbi5zZXQoZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3gnKSksIGRwLmdldCh0aGlzLl9tYXBBdHRyKCd5JykpLCBkcC5nZXQodGhpcy5fbWFwQXR0cigneicpKSk7XG5cdH1cblxuXHRfcmVtb3ZlRGF0YXBvaW50KGlkKSB7XG5cdFx0bGV0IG1lc2ggPSB0aGlzLmRwTWFwW2lkXTtcblx0XHRpZiAobWVzaCkgdGhpcy5vYmozRC5yZW1vdmUobWVzaCk7XG5cdH1cblxuXHRfdXBkYXRlRGF0YXBvaW50KGlkLCBldmVudCkge1xuXHRcdF9yZW1vdmVEYXRhcG9pbnQoaWQpO1xuXHRcdF9wbGFjZURhdGFwb2ludChpZCk7XG5cdH1cblxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGVtYmVkZGluZyBiYWNrZWQgYnkgYSBQb2ludHMgb2JqZWN0IChpLmUuLCBwYXJ0aWNsZSBjbG91ZHMpXG4gKi9cbmV4cG9ydCBjbGFzcyBQb2ludHNFbWJlZGRpbmcgZXh0ZW5kcyBFbWJlZGRpbmcge1xuXHRjb25zdHJ1Y3RvcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucz17fSkge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oXG5cdFx0XHR7IFxuXHRcdFx0XHRwb2ludFR5cGU6IFwiYmFsbFwiLFxuXHRcdFx0XHRwb2ludFNpemU6IDAuMixcblx0XHRcdFx0cG9pbnRDb2xvcjogMHhmZmZmZmZcblx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKTtcblxuXHRcdC8vIFRPRE8gYmFzZTY0IGVuY29kZSBhbmQgcmVhZCBmcm9tIHN0cmluZ1xuXHRcdGxldCBzcHJpdGUgPSBuZXcgVEhSRUUuVGV4dHVyZUxvYWRlcigpLmxvYWQoXG5cdFx0XHRcImh0dHBzOi8vcmF3Z2l0LmNvbS9iZWF1Y3JvbmluL2VtYmVkZGluZy9tYXN0ZXIvc3RhdGljL3Nwcml0ZXMvYmFsbC5wbmdcIik7XG5cdFx0bGV0IG1hdGVyaWFsUHJvcHMgPSB7XG5cdFx0XHRzaXplOiB0aGlzLmdldE9wdChcInBvaW50U2l6ZVwiKSxcblx0XHRcdHNpemVBdHRlbnVhdGlvbjogdHJ1ZSxcblx0XHRcdG1hcDogc3ByaXRlLFxuXHRcdFx0Y29sb3I6IHRoaXMuZ2V0T3B0KFwicG9pbnRDb2xvclwiKSxcblx0XHRcdGFscGhhVGVzdDogMC41LFxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWVcblx0XHR9XG5cdFx0dGhpcy5wb2ludHMgPSBuZXcgVEhSRUUuUG9pbnRzKFxuXHRcdFx0bmV3IFRIUkVFLkdlb21ldHJ5KCksIG5ldyBUSFJFRS5Qb2ludHNNYXRlcmlhbChtYXRlcmlhbFByb3BzKSk7XG5cdFx0dGhpcy5wb2ludHMuZ2VvbWV0cnkudmVydGljZXMucHVzaChuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCkpO1xuXHRcdHRoaXMub2JqM0QuYWRkKHRoaXMucG9pbnRzKTtcblx0fVxufVxuXG4vKipcbiAqIEFuIGVtYmVkZGluZyBpbiB3aGljaCBlYWNoIGRhdGFwb2ludCBpcyByZW5kZXJlZCBhcyBhIHZlcnRleCBpbiBhIFRIUkVFLlBvaW50cyBvYmplY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2F0dGVyRW1iZWRkaW5nIGV4dGVuZHMgUG9pbnRzRW1iZWRkaW5nIHtcblx0Y29uc3RydWN0b3Ioc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnM9e30pIHtcblx0XHRvcHRpb25zID0gYXNzaWduKCBcblx0XHRcdHsgXG5cdFx0XHRcdGJ1ZmZlclNpemU6IDEwMDAsXG5cdFx0XHRcdG1vdmVTcGVlZDogMixcblx0XHRcdFx0YXV0b1NjYWxlOiBmYWxzZSxcblx0XHRcdFx0YXV0b1NjYWxlUmFuZ2U6IDEwXG5cdFx0XHR9LCBvcHRpb25zKTtcblx0XHRzdXBlcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucylcblx0XHRcblx0XHQvLyBtYXBwaW5nIGZyb20gZGF0YXBvaW50IGlkcyB0byB2ZXJ0ZXggaW5kaWNlc1xuXHRcdHRoaXMuZHBNYXAgPSB7fVxuXG5cdFx0Ly8gdW5hbGxvY2F0ZWQgdmVydGljZXMgXG5cdFx0dGhpcy5mcmVlVmVydGljZXMgPSBbXTtcblx0XHRcblx0XHQvLyBpbml0aWFsaXplIHZlcnRpY2VzIGFuZCBtYXJrIHRoZW0gYXMgdW5hbGxvY2F0ZWRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ2V0T3B0KFwiYnVmZmVyU2l6ZVwiKTsgaSsrKSB7XG5cdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKFxuXHRcdFx0XHRuZXcgVEhSRUUuVmVjdG9yMygtMTAwMDAwMCwgLTEwMDAwMDAsIC0xMDAwMDAwKSk7XG5cdFx0XHR0aGlzLmZyZWVWZXJ0aWNlcy5wdXNoKGkpO1xuXHRcdH1cblxuXHRcdC8vIGNyZWF0ZSByZXNjYWxpbmdcblx0XHRpZiAodGhpcy5nZXRPcHQoXCJhdXRvU2NhbGVcIikpIHtcblx0XHRcdHRoaXMuX2luaXRBdXRvU2NhbGUodGhpcy5nZXRPcHQoXCJhdXRvU2NhbGVSYW5nZVwiKSk7XG5cdFx0XHRjb25zb2xlLmxvZyh0aGlzLnJlc2NhbGUpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5nZXRPcHQoXCJyZXNjYWxlXCIpKSB7XG5cdFx0XHQvLyBUT0RPXG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMucmVzY2FsZSA9IG5ldyBSZXNjYWxpbmcoKTtcblx0XHR9XG5cblx0XHR0aGlzLnR3ZWVucyA9IHt9O1xuXHR9XG5cblx0X2luaXRBdXRvU2NhbGUocmFuZ2UpIHtcblx0XHRsZXQgZHBzID0gdGhpcy5kYXRhc2V0LmdldElkcygpLm1hcCgoaWQpID0+IHRoaXMuZGF0YXNldC5nZXQoaWQpKVxuXHRcdGxldCB4bWluID0gTWF0aC5taW4uYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd4JykpKSlcblx0XHRsZXQgeG1heCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneCcpKSkpXG5cdFx0bGV0IHltaW4gPSBNYXRoLm1pbi5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3knKSkpKVxuXHRcdGxldCB5bWF4ID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd5JykpKSlcblx0XHRsZXQgem1pbiA9IE1hdGgubWluLmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneicpKSkpXG5cdFx0bGV0IHptYXggPSBNYXRoLm1heC5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3onKSkpKVxuXHRcdHRoaXMucmVzY2FsZSA9IG5ldyBSZXNjYWxpbmcoXG5cdFx0XHQtICh4bWF4ICsgeG1pbikgLyAyLFxuXHRcdFx0LSAoeW1heCArIHltaW4pIC8gMixcblx0XHRcdC0gKHptYXggKyB6bWluKSAvIDIsXG5cdFx0XHRyYW5nZSAvICh4bWF4IC0geG1pbiksXG5cdFx0XHRyYW5nZSAvICh5bWF4IC0geW1pbiksXG5cdFx0XHRyYW5nZSAvICh6bWF4IC0gem1pbilcblx0XHRcdClcblx0fVxuXG5cdGVtYmVkKCkge1xuXHRcdGlmICghIHRoaXMuaW5pdGlhbGl6ZWQpIHtcblx0XHRcdC8vIGFkZCBhbGwgZGF0YXBvaW50cyBhbHJlYWR5IGluIHRoZSBkYXRhc2V0XG5cdFx0XHRmb3IgKGxldCBpZCBpbiB0aGlzLmRhdGFzZXQuZGF0YXBvaW50cykge1xuXHRcdFx0XHR0aGlzLl9wbGFjZURhdGFwb2ludChpZCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc05lZWRVcGRhdGUgPSB0cnVlO1xuXHRcdFx0dGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHByb2Nlc3MgZXZlbnRzIHNlbnQgYnkgdGhlIGRhdGFzZXQgc2luY2UgbGFzdCBlbWJlZCgpIGNhbGxcblx0XHRcdGlmICh0aGlzLmV2ZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGZvciAobGV0IGkgaW4gdGhpcy5ldmVudHMpIHtcblx0XHRcdFx0XHRsZXQgZSA9IHRoaXMuZXZlbnRzW2ldO1xuXHRcdFx0XHRcdGlmICAgICAgKGUudHlwZSA9PSBcImFkZFwiKSAgICB0aGlzLl9wbGFjZURhdGFwb2ludChlLmlkKTtcblx0XHRcdFx0XHRlbHNlIGlmIChlLnR5cGUgPT0gXCJyZW1vdmVcIikgdGhpcy5fcmVtb3ZlRGF0YXBvaW50KGUuaWQpO1xuXHRcdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInVwZGF0ZVwiKSB0aGlzLl91cGRhdGVEYXRhcG9pbnQoZS5pZCwgZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJjYWxsaW5nIHZlcnRpY2VzIHVwZGF0ZVwiKTtcblx0XHRcdFx0dGhpcy5wb2ludHMuZ2VvbWV0cnkudmVydGljZXNOZWVkVXBkYXRlID0gdHJ1ZTtcdFx0XHRcblx0XHRcdH0gXG5cdFx0XHR0aGlzLmV2ZW50cyA9IFtdO1xuXHRcdH1cblx0fVxuXG5cdF9wbGFjZURhdGFwb2ludChpZCkge1xuXHRcdGxldCB2aSA9IHRoaXMuZnJlZVZlcnRpY2VzLnBvcCgpO1xuXHRcdGlmICh2aSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0XHRpZiAoISBkcCkgcmV0dXJuO1xuXHRcdFx0dGhpcy5wb2ludHMuZ2VvbWV0cnkudmVydGljZXNbdmldLnNldChcblx0XHRcdFx0dGhpcy5yZXNjYWxlLnNjYWxlWCh0aGlzLl9tYXAoZHAsICd4JykpLFxuXHRcdFx0XHR0aGlzLnJlc2NhbGUuc2NhbGVZKHRoaXMuX21hcChkcCwgJ3knKSksXG5cdFx0XHRcdHRoaXMucmVzY2FsZS5zY2FsZVoodGhpcy5fbWFwKGRwLCAneicpKSk7XG5cdFx0XHR0aGlzLmRwTWFwW2lkXSA9IHZpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLndhcm4oJ1ZlcnRleCBidWZmZXIgc2l6ZSBleGNlZWRlZCcpO1xuXHRcdH1cblx0fVxuXG5cdF9yZW1vdmVEYXRhcG9pbnQoaWQpIHtcblx0XHRsZXQgdmkgPSB0aGlzLmRwTWFwW2lkXTtcblx0XHRpZiAodmkgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc1t2aV0uc2V0KC0xMDAwMDAwLCAtMTAwMDAwMCwgLTEwMDAwMDApO1xuXHRcdFx0ZGVsZXRlIHRoaXMuZHBNYXBbaWRdO1xuXHRcdFx0dGhpcy5mcmVlVmVydGljZXMucHVzaCh2aSk7XG5cdFx0fVxuXHR9XG5cblx0X3VwZGF0ZURhdGFwb2ludChpZCwgZXZlbnQpIHtcblx0XHRsZXQgdmkgPSB0aGlzLmRwTWFwW2lkXTtcblx0XHRpZiAodmkgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgZHAgID0gdGhpcy5kYXRhc2V0LmRhdGFwb2ludHNbaWRdO1xuXHRcdFx0aWYgKCEgZHApIHJldHVybjtcblx0XHRcdC8vIFRPRE8gb3RoZXIgYXR0cmlidXRlcyBiZXNpZGUgcG9zaXRpb25cblx0XHRcdGxldCB2ID0gdGhpcy5wb2ludHMuZ2VvbWV0cnkudmVydGljZXNbdmldO1xuXHRcdFx0XG5cdFx0XHRsZXQgc3RhcnQgPSB7IHg6IHYueCwgeTogdi55LCB6OiB2LnogfTtcblx0XHRcdGxldCBlbmQgPSB7IFxuXHRcdFx0XHR4OiB0aGlzLnJlc2NhbGUuc2NhbGVYKHRoaXMuX21hcChkcCwgJ3gnKSksIFxuXHRcdFx0XHR5OiB0aGlzLnJlc2NhbGUuc2NhbGVZKHRoaXMuX21hcChkcCwgJ3knKSksIFxuXHRcdFx0XHR6OiB0aGlzLnJlc2NhbGUuc2NhbGVaKHRoaXMuX21hcChkcCwgJ3onKSkgXG5cdFx0XHR9O1xuXHRcdFx0bGV0IGQgPSAobmV3IFRIUkVFLlZlY3RvcjMoc3RhcnQueCwgc3RhcnQueSwgc3RhcnQueikpXG5cdFx0XHRcdC5zdWIobmV3IFRIUkVFLlZlY3RvcjMoZW5kLngsIGVuZC55LCBlbmQueikpXG5cdFx0XHRcdC5sZW5ndGgoKTtcblx0XHRcdGxldCB0ID0gMTAwMCAqIGQgLyB0aGlzLmdldE9wdChcIm1vdmVTcGVlZFwiLCBkcCk7XG5cdFx0XHRcblx0XHRcdHZhciBnZW8gPSB0aGlzLnBvaW50cy5nZW9tZXRyeTtcblx0XHRcdHZhciBvYmogPSB0aGlzO1xuXHRcdFx0aWYgKHRoaXMudHdlZW5zW3ZpXSkge1xuXHRcdFx0XHR0aGlzLnR3ZWVuc1t2aV0uc3RvcCgpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy50d2VlbnNbdmldO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oc3RhcnQpXG5cdFx0XHRcdC50byhlbmQsIHQpXG5cdFx0XHRcdC5vblVwZGF0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2LnNldCh0aGlzLngsIHRoaXMueSwgdGhpcy56KTtcblx0XHRcdFx0XHRnZW8udmVydGljZXNOZWVkVXBkYXRlID0gdHJ1ZTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uQ29tcGxldGUoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0XHQub25TdG9wKCgpID0+IGRlbGV0ZSBvYmoudHdlZW5zW2lkXSlcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuRXhwb25lbnRpYWwuSW5PdXQpXG5cdFx0XHRcdC5zdGFydCgpO1xuXHRcdFx0dGhpcy50d2VlbnNbdmldID0gdHdlZW47XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogQSB7TWVzaEVtYmVkZGluZ30gaW4gd2hpY2ggZWFjaCB7RGF0YXBvaW50fSBpcyByZW5kZXJlZCBhcyBhIE1lc2ggdGhhdCBmb2xsb3dzIGFcbiAqIHBhdGggZGVmaW5lZCBieSB3YXlwb2ludHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXRoRW1iZWRkaW5nIGV4dGVuZHMgTWVzaEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCB3YXlwb2ludHMsIG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gYXNzaWduKHtcblx0XHRcdHBhdGhXaWR0aFg6IDAsXG5cdFx0XHRwYXRoV2lkdGhZOiAwLFxuXHRcdFx0cGF0aFdpZHRoWjogMCxcblx0XHRcdGRlc2NyaXB0aW9uOiAnJyxcblx0XHRcdHJlbW92ZUFmdGVyOiB0cnVlLFxuXHRcdFx0cGF0aFRpbWU6IDEwMDAwXG5cdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXHRcdHRoaXMud2F5cG9pbnRzID0gd2F5cG9pbnRzLm1hcCgoeCkgPT4gbmV3IFRIUkVFLlZlY3RvcjMoeFswXSwgeFsxXSwgeFsyXSkpO1xuXG5cdFx0dGhpcy5tZXNoT2Zmc2V0cyA9IHt9O1xuXHRcdHRoaXMudHdlZW5zID0ge307XG5cdH1cblxuXHRfY3JlYXRlTWVzaE9mZnNldChpZCkge1xuXHRcdGxldCBwd3ggPSB0aGlzLmdldE9wdCgncGF0aFdpZHRoWCcpO1xuXHRcdGxldCBwd3kgPSB0aGlzLmdldE9wdCgncGF0aFdpZHRoWScpO1xuXHRcdGxldCBwd3ogPSB0aGlzLmdldE9wdCgncGF0aFdpZHRoWicpO1xuXHRcdGxldCBveCA9IHB3eCAqIE1hdGgucmFuZG9tKCkgLSBwd3ggLyAyO1xuXHRcdGxldCBveSA9IHB3eSAqIE1hdGgucmFuZG9tKCkgLSBwd3kgLyAyO1xuXHRcdGxldCBveiA9IHB3eiAqIE1hdGgucmFuZG9tKCkgLSBwd3ogLyAyO1xuXHRcdHRoaXMubWVzaE9mZnNldHNbaWRdID0gbmV3IFRIUkVFLlZlY3RvcjMob3gsIG95LCBveik7XG5cdH1cblxuXHRfcGxhY2VEYXRhcG9pbnQoaWQpIHtcblx0XHRsZXQgZHAgID0gdGhpcy5kYXRhc2V0LmRhdGFwb2ludHNbaWRdO1xuXHRcdGxldCBtZXNoID0gdGhpcy5jcmVhdGVPYmplY3RGb3JEYXRhcG9pbnQoZHApO1xuXHRcdHRoaXMuX2NyZWF0ZU1lc2hPZmZzZXQoaWQpO1xuXHRcdG1lc2gudXNlckRhdGEuZGVzY3JpcHRpb24gPSB0aGlzLmdldE9wdChcImRlc2NyaXB0aW9uXCIsIGRwKTtcblx0XHR0aGlzLmRwTWFwW2lkXSA9IG1lc2g7XG5cdFx0dGhpcy5vYmozRC5hZGQobWVzaCk7XG5cdFx0VEhSRUUuaW5wdXQuYWRkKG1lc2gpO1xuXG5cdFx0Ly8gY3JlYXRlIHBhdGggdHdlZW5cblx0XHRsZXQgc3RhcnQgPSB7IHg6IHRoaXMud2F5cG9pbnRzWzBdLngsIHk6IHRoaXMud2F5cG9pbnRzWzBdLnksIHo6IHRoaXMud2F5cG9pbnRzWzBdLnogfVxuXHRcdGxldCBlbmQgPSB7XG5cdFx0XHR4OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueCksXG5cdFx0XHR5OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueSksXG5cdFx0XHR6OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueilcblx0XHR9XG5cdFx0bGV0IHQgPSB0aGlzLmdldE9wdChcInBhdGhUaW1lXCIpO1xuXHRcdHZhciBvYmogPSB0aGlzO1xuXHRcdGxldCB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbihzdGFydClcblx0XHRcdC50byhlbmQsIHQpXG5cdFx0XHQuaW50ZXJwb2xhdGlvbiggVFdFRU4uSW50ZXJwb2xhdGlvbi5DYXRtdWxsUm9tIClcblx0XHRcdC5vblVwZGF0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8ga2VlcCB0aGUgeC1heGlzIG9mIHRoZSBtZXNoIHRhbmdlbnQgdG8gdGhlIHBhdGggYXMgaXQgbW92ZXNcblx0XHRcdFx0bGV0IG9sZFBvcyA9IG1lc2gucG9zaXRpb24uY2xvbmUoKTtcblx0XHRcdFx0bGV0IG5ld1BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xuXHRcdFx0XHRsZXQgZGlyID0gbmV3UG9zLnN1YihvbGRQb3MpLm5vcm1hbGl6ZSgpO1xuXHRcdFx0XHRsZXQgYXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApO1xuXHRcdFx0XHRsZXQgb2Zmc2V0ID0gb2JqLm1lc2hPZmZzZXRzW2lkXVxuXHRcdFx0XHRtZXNoLnBvc2l0aW9uLnNldCh0aGlzLnggKyBvZmZzZXQueCwgdGhpcy55ICsgb2Zmc2V0LnksIHRoaXMueiArIG9mZnNldC56KTtcblx0XHRcdFx0Ly8gbWVzaC5wb3NpdGlvbi5zZXQodGhpcy54LCB0aGlzLnksIHRoaXMueik7XG5cdFx0XHRcdG1lc2gucXVhdGVybmlvbi5zZXRGcm9tVW5pdFZlY3RvcnMoYXhpcywgZGlyKTtcblx0XHRcdH0pXG5cdFx0XHQub25Db21wbGV0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0ZGVsZXRlIG9iai50d2VlbnNbaWRdO1xuXHRcdFx0XHRpZiAob2JqLmdldE9wdChcInJlbW92ZUFmdGVyXCIpKSBvYmoub2JqM0QucmVtb3ZlKG1lc2gpO1xuXHRcdFx0fSlcblx0XHRcdC5vblN0b3AoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0LnN0YXJ0KCk7XG5cdFx0dGhpcy50d2VlbnNbaWRdID0gdHdlZW47XG5cdH1cblxuXHRfcmVtb3ZlRGF0YXBvaW50KGlkKSB7XG5cdFx0aWYgKHRoaXMudHdlZW5zW2lkXSkgdGhpcy50d2VlbnNbaWRdLnN0b3AoKTtcblx0XHRsZXQgbWVzaCA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmIChtZXNoKSB0aGlzLm9iajNELnJlbW92ZShtZXNoKTtcblx0fVxuXG5cdF91cGRhdGVEYXRhcG9pbnQoaWQsIGV2ZW50KSB7XG5cdFx0Ly8gVE9ETyBpbXBsZW1lbnRcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQ29uc29sZUVtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRmb250OiBcIkJvbGQgMjRweCBBcmlhbFwiLFxuXHRcdFx0ZmlsbFN0eWxlOiBcInJnYmEoMjI1LDIyNSwyMjUsMC45MClcIixcblx0XHRcdGFsaWduOiBcImNlbnRlclwiLFxuXHRcdFx0d2lkdGg6IDEuMFxuXHRcdH0sIG9wdGlvbnMpO1xuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKTtcblx0XHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY2FudmFzLndpZHRoID0gMTAyNDtcblx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSA1MTI7XG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHR0aGlzLmNvbnRleHQuZm9udCA9IHRoaXMuZ2V0T3B0KCdmb250Jyk7XG5cdFx0dGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuZ2V0T3B0KCdmaWxsU3R5bGUnKTtcblx0XHR0aGlzLmNvbnRleHQudGV4dEFsaWduID0gdGhpcy5nZXRPcHQoJ2FsaWduJyk7XG5cdFx0dGhpcy5tZXNoID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0c2V0VGV4dCh0ZXh0KSB7XG5cdFx0aWYgKHRoaXMubWVzaClcblx0XHRcdHRoaXMub2JqM0QucmVtb3ZlKHRoaXMubWVzaClcblx0XHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG5cdFx0aWYgKHRoaXMuZ2V0T3B0KCdhbGlnbicpID09ICdsZWZ0Jylcblx0XHRcdHRoaXMuY29udGV4dC5maWxsVGV4dCh0ZXh0LCAwLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKTtcblx0XHRlbHNlIGlmICh0aGlzLmdldE9wdCgnYWxpZ24nKSA9PSAncmlnaHQnKVxuXHRcdFx0dGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKTtcblx0XHRlbHNlIC8vIGRlZmF1bHQgdG8gY2VudGVyXG5cdFx0XHR0aGlzLmNvbnRleHQuZmlsbFRleHQodGV4dCwgdGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKTtcblxuXHRcdGxldCB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUodGhpcy5jYW52YXMpO1xuXHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdGxldCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IG1hcDogdGV4dHVyZSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZSB9KTtcblx0XHRtYXRlcmlhbC50cmFuc3BhcmVudCA9IHRydWU7XG5cblx0XHR0aGlzLm1lc2ggPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KFxuXHRcdFx0XHR0aGlzLmdldE9wdCgnd2lkdGgnKSAqIHRoaXMuY2FudmFzLndpZHRoIC8gMjU2LCB0aGlzLmdldE9wdCgnd2lkdGgnKSAqIHRoaXMuY2FudmFzLmhlaWdodCAvIDEyOCksXG5cdFx0XHRtYXRlcmlhbFxuXHRcdCk7XG5cdFx0dGhpcy5tZXNoLnBvc2l0aW9uLnNldCh0aGlzLmdldE9wdCgneCcpLCB0aGlzLmdldE9wdCgneScpLCB0aGlzLmdldE9wdCgneicpKTtcblx0XHR0aGlzLm9iajNELmFkZCh0aGlzLm1lc2gpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBBZ2dyZWdhdGVFbWJlZGRpbmcgZXh0ZW5kcyBFbWJlZGRpbmcge1xuXG59XG5cbmNsYXNzIFJlc2NhbGluZyB7XG5cdGNvbnN0cnVjdG9yKHhvPTAsIHlvPTAsIHpvPTAsIHhzPTEsIHlzPTEsIHpzPTEpIHtcblx0XHRpZiAodHlwZW9mKHhvKSA9PSBcIm51bWJlclwiKSB7XG5cdFx0XHR0aGlzLnhvID0geG87XG5cdFx0XHR0aGlzLnlvID0geW87XG5cdFx0XHR0aGlzLnpvID0gem87XG5cdFx0XHR0aGlzLnhzID0geHM7XG5cdFx0XHR0aGlzLnlzID0geXM7XG5cdFx0XHR0aGlzLnpzID0genM7XG5cdFx0fVxuXHR9XG5cblx0c2NhbGVYKHgpIHtcblx0XHRyZXR1cm4gdGhpcy54cyooeCArIHRoaXMueG8pO1xuXHR9XG5cblx0c2NhbGVZKHkpIHtcblx0XHRyZXR1cm4gdGhpcy55cyooeSArIHRoaXMueW8pO1xuXHR9XG5cblx0c2NhbGVaKHopIHtcblx0XHRyZXR1cm4gdGhpcy56cyooeiArIHRoaXMuem8pO1xuXHR9XG59IiwiJ3VzZSBzdHJpY3QnXG5cbi8qKlxuICogQGF1dGhvciBCZWF1IENyb25pbiA8YmVhdS5jcm9uaW5AZ21haWwuY29tPlxuICovXG5cbmltcG9ydCBSYXlJbnB1dCBmcm9tICdyYXktaW5wdXQnO1xuaW1wb3J0IFRXRUVOIGZyb20gJ3R3ZWVuLmpzJztcbmltcG9ydCBxdWVyeVN0cmluZyBmcm9tICdxdWVyeS1zdHJpbmcnO1xuaW1wb3J0IHtcblx0V2ViU29ja2V0RGF0YXNldCwgXG5cdERhdGFzZXRcbn0gZnJvbSAnLi9kYXRhc2V0LmpzJztcbmltcG9ydCB7XG5cdEVtYmVkZGluZyxcblx0TWVzaEVtYmVkZGluZyxcblx0UmFuZG9tRW1iZWRkaW5nLFxuXHRTY2F0dGVyRW1iZWRkaW5nLFxuXHRQYXRoRW1iZWRkaW5nLFxuXHRDb25zb2xlRW1iZWRkaW5nXG59IGZyb20gJy4vZW1iZWRkaW5nLmpzJztcbmltcG9ydCB7IGRldGVjdE1vZGUgfSBmcm9tICcuL2RldGVjdGlvbi11dGlscy5qcyc7XG5pbXBvcnQge1xuXHRsYXRMb25nVG9FdWNsaWRlYW4sXG5cdGRlZ1RvUmFkLFxuXHRhamF4V2l0aENhbGxiYWNrLFxuXHRjYXRlZ29yaWNhbE1hcFxufSBmcm9tICcuL3V0aWxzLmpzJztcblxudmFyIGVtYmVkZGluZ3MgPSBbXTtcbnZhciB1cGRhdGVGdW5jO1xudmFyIGxhc3RSZW5kZXIgPSAwO1xudmFyIHZyRGlzcGxheTtcblxuLyoqXG4gKiBDb252ZW5pZW5jZSBmdW5jdGlvbiB0byBjcmVhdGUgYSByZXNwb25zaXZlIFRIUkVFIHNjZW5lIGFuZCByZWxhdGVkIG9iamVjdHMuIFJldHVybnMgYSBudW1iZXIgXG4gKiBvZiBvYmplY3RzIHRoYXQgc2hvdWxkIHByb2JhYmx5IGJlIGtlcHQgYXJvdW5kIGJ5IHRoZSBlbmNsb3Npbmcgc2NyaXB0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFNjZW5lKG9wdGlvbnMgPSB7fSkge1xuXHRjb25zdCBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuXHRjb25zdCBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoIDc1LCB3aW5kb3cuaW5uZXJXaWR0aCAvIHdpbmRvdy5pbm5lckhlaWdodCwgMSwgMTAwMDAgKTtcblx0Y2FtZXJhLnBvc2l0aW9uLnogPSAxMDtcblx0XG5cdC8vIFRoZSBWUkNvbnRyb2xzIG9iamVjdCB1cGRhdGVzIHRoZSBjYW1lcmEgcG9zaXRpb24gaW4gcmVzcG9uc2UgdG8gcG9zaXRpb24gYW5kIG9yaWVudGF0aW9uXG5cdC8vIGNoYW5nZXMgb2YgdGhlIEhNRC5cblx0Y29uc3QgY2FtZXJhQ29udHJvbHMgPSBuZXcgVEhSRUUuVlJDb250cm9scyhjYW1lcmEpO1xuXHRjYW1lcmFDb250cm9scy5zdGFuZGluZyA9IHRydWU7XG5cblx0Ly8gVGhpcyByZW5kZXJlciBpcyB0aGUgc3RhbmRhcmQgV2ViR0wgcmVuZGVyZXI7IGl0IG1heSBiZSBmdXJ0aGVyIHByb2Nlc3NlZCBmb3IgVlIgdXNlIGRlcGVuZGluZ1xuXHQvLyBvbiB0aGUgbW9kZSBzZWxlY3RlZCBieSB0aGUgd2VidnItYm9pbGVycGxhdGVcblx0Y29uc3QgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcigpO1xuXHRyZW5kZXJlci5zZXRTaXplKCB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0ICk7XG5cdHJlbmRlcmVyLnNldFBpeGVsUmF0aW8od2luZG93LmRldmljZVBpeGVsUmF0aW8pO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoIHJlbmRlcmVyLmRvbUVsZW1lbnQgKTtcbiAgICBcbiAgICAvLyBUaGUgVlJFZmZlY3QgaXMgcmVzcG9uc2libGUgZm9yIGRpc3RvcnRpbmcgdGhlIHJlbmRlcmVkIGltYWdlIHRvIG1hdGNoIHRoZSBvcHRpY3Mgb2YgdGhlIEhNRCxcbiAgICAvLyBhcyB3ZWxsIGFzIHJlbmRlcmluZyBkaWZmZXJlbnQsIG9mZnNldCBpbWFnZXMgZm9yIGVhY2ggZXllXG4gICAgY29uc3QgZWZmZWN0ID0gbmV3IFRIUkVFLlZSRWZmZWN0KHJlbmRlcmVyKTtcblx0ZWZmZWN0LnNldFNpemUoIHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQgKTtcblxuXHQvLyBUaGUgV2ViVlJNYW5hZ2VyIGlzIHByb3ZpZGVkIGJ5IHRoZSB3ZWJ2ci1ib2lsZXJwbGF0ZSwgYW5kIGhhbmRsZXMgZGV0ZWN0aW9uIG9mIGRpc3BsYXkgaGFyZHdhcmVcblx0Ly8gKGRlc2t0b3AsIG1vYmlsZSwgVlIpIGFuZCBzd2l0Y2hpbmcgYmV0d2VlbiByZWd1bGFyIGFuZCBWUiBtb2Rlc1xuXHRjb25zdCBtYW5hZ2VyID0gbmV3IFdlYlZSTWFuYWdlcihyZW5kZXJlciwgZWZmZWN0KTtcblxuXHR2YXIgb25SZXNpemUgPSBmdW5jdGlvbihlKSB7XG5cdCAgZWZmZWN0LnNldFNpemUod2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCk7XG5cdCAgY2FtZXJhLmFzcGVjdCA9IHdpbmRvdy5pbm5lcldpZHRoIC8gd2luZG93LmlubmVySGVpZ2h0O1xuXHQgIGNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG5cdH1cblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUsIHRydWUpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndnJkaXNwbGF5cHJlc2VudGNoYW5nZScsIG9uUmVzaXplLCB0cnVlKTtcblxuICAgIC8vIFRPRE8gcHV0dGluZyB0aGUgaW5wdXQgaW4gdGhlIFRIUkVFIGdsb2JhbCBmb3Igbm93OyBwcm9iYWJseSB3YW50IGVtYmVkZGluZ3MgdG8gZmlyZSBcbiAgICAvLyBldmVudHMgd2hlbiBtZXNoZXMgYXJlIGFkZGVkL3JlbW92ZWQgcmF0aGVyIHRoYW4gcmVmZXJlbmNpbmcgdGhlIGlucHV0IGRpcmVjdGx5XG5cdFRIUkVFLmlucHV0ID0gbmV3IFJheUlucHV0KGNhbWVyYSwgcmVuZGVyZXIuZG9tRWxlbWVudCk7XG5cdFRIUkVFLmlucHV0LnNldFNpemUocmVuZGVyZXIuZ2V0U2l6ZSgpKTtcblx0c2NlbmUuYWRkKFRIUkVFLmlucHV0LmdldE1lc2goKSk7XG5cblx0dXBkYXRlRnVuYyA9IG9wdGlvbnMudXBkYXRlRnVuYztcblxuICAgIHJldHVybiB7IHNjZW5lLCBjYW1lcmEsIG1hbmFnZXIsIGVmZmVjdCwgY2FtZXJhQ29udHJvbHMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0QW5pbWF0aW9uKCkge1xuXHQvLyBOT1RFOiBhc3N1bWVzIHRoZSB3ZWJ2ciBwb2x5ZmlsbCBpcyBwcmVzZW50LCBzbyBjYW4gY291bnQgb24gYSB2YWxpZCBkaXNwbGF5XG5cdG5hdmlnYXRvci5nZXRWUkRpc3BsYXlzKCkudGhlbihmdW5jdGlvbihkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmxlbmd0aCA+IDApIHtcblx0ICAgICAgXHR2ckRpc3BsYXkgPSBkaXNwbGF5c1swXTtcblx0ICAgICAgXHR2ckRpc3BsYXkucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuXHQgICAgfVxuXHR9KTtcbn1cblxuLyoqXG4gKiBUaGUgY29yZSBhbmltYXRpb24gY2FsbCB0aGF0IGlzIGV4ZWN1dGVkIGZvciBlYWNoIGZyYW1lLiBVcGRhdGVzIGFsbCByZWdpc3RlcmVkXG4gKiBlbWJlZGRpbmdzLCB0aGUgcG9pbnRlciBjb250cm9scywgYW5kIHRoZSBjYW1lcmEgcG9zaXRpb24uIFJlbmRlcnMgdGhlIHNjZW5lXG4gKiB1c2luZyB0aGUgV2ViVlJNYW5hZ2VyLCB3aGljaCBhcHBsaWVzIHRoZSBWUkVmZmVjdCBpZiBpbiBWUiBtb2RlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5pbWF0ZSh0aW1lc3RhbXApIHtcblx0aWYgKCEgdGltZXN0YW1wKSB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuXHR2YXIgZGVsdGEgPSBNYXRoLm1pbih0aW1lc3RhbXAgLSBsYXN0UmVuZGVyLCA1MDApO1xuICBcdGxhc3RSZW5kZXIgPSB0aW1lc3RhbXA7XG5cbiAgXHRmb3IgKGxldCBlIG9mIGVtYmVkZGluZ3MpIHtcblx0XHRlLmVtYmVkKCk7XG4gIFx0fVxuICBcdFRXRUVOLnVwZGF0ZSgpO1xuXHRUSFJFRS5pbnB1dC51cGRhdGUoKTtcbiAgICBjYW1lcmFDb250cm9scy51cGRhdGUoKTtcbiAgICBpZiAodXBkYXRlRnVuYykgdXBkYXRlRnVuYyhkZWx0YSk7XG5cbiAgICBtYW5hZ2VyLnJlbmRlciggc2NlbmUsIGNhbWVyYSwgdGltZXN0YW1wICk7XG5cbiAgICB2ckRpc3BsYXkucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCBhbmltYXRlICk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXIgYW4gZW1iZWRkaW5nIHNvIHRoYXQgaXQgd2lsbCBiZSB1cGRhdGVkIG9uIGVhY2ggYW5pbWF0aW9uIGZyYW1lLlxuICogQHBhcmFtIHtFbWJlZGRpbmd9IGVtYmVkZGluZyAtIFRoZSBlbWJlZGRpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKGVtYmVkZGluZykge1xuXHRlbWJlZGRpbmdzLnB1c2goZW1iZWRkaW5nKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdERhdGFzZXQ6IERhdGFzZXQsXG5cdFdlYlNvY2tldERhdGFzZXQ6IFdlYlNvY2tldERhdGFzZXQsXG5cdEVtYmVkZGluZzogRW1iZWRkaW5nLFxuXHRNZXNoRW1iZWRkaW5nOiBNZXNoRW1iZWRkaW5nLFxuXHRSYW5kb21FbWJlZGRpbmc6IFJhbmRvbUVtYmVkZGluZyxcblx0U2NhdHRlckVtYmVkZGluZzogU2NhdHRlckVtYmVkZGluZyxcblx0UGF0aEVtYmVkZGluZzogUGF0aEVtYmVkZGluZyxcblx0Q29uc29sZUVtYmVkZGluZzogQ29uc29sZUVtYmVkZGluZyxcblx0aW5pdFNjZW5lOiBpbml0U2NlbmUsXG5cdGFuaW1hdGU6IGFuaW1hdGUsXG5cdHF1ZXJ5U3RyaW5nOiBxdWVyeVN0cmluZyxcblx0ZGV0ZWN0TW9kZTogZGV0ZWN0TW9kZSxcblx0cmVnaXN0ZXI6IHJlZ2lzdGVyLFxuXHRzdGFydEFuaW1hdGlvbixcblx0dXRpbHM6IHtcblx0XHRkZWdUb1JhZCxcblx0XHRsYXRMb25nVG9FdWNsaWRlYW4sXG5cdFx0YWpheFdpdGhDYWxsYmFjayxcblx0XHRjYXRlZ29yaWNhbE1hcFxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5cbi8vIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL21vY2stZW5kL3JhbmRvbS1ub3JtYWxcbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxQb29sKG9wdGlvbnMpIHtcblxuXHR2YXIgcGVyZm9ybWFuY2VDb3VudGVyID0gMDtcblxuXHRkbyB7XG5cblx0dmFyIGlkeCA9IE1hdGgucm91bmQobm9ybWFsKHtcblx0XHRtZWFuOiBvcHRpb25zLm1lYW4sXG5cdFx0ZGV2OiBvcHRpb25zLmRldlxuXHR9KSk7XG5cblx0aWYgKGlkeCA8IG9wdGlvbnMucG9vbC5sZW5ndGggJiYgaWR4ID49IDApIHtcblx0XHRyZXR1cm4gb3B0aW9ucy5wb29sW2lkeF07XG5cdH0gZWxzZSB7XG5cdFx0cGVyZm9ybWFuY2VDb3VudGVyKys7XG5cdH1cblxuXHR9IHdoaWxlIChwZXJmb3JtYW5jZUNvdW50ZXIgPCAxMDApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsKG9wdGlvbnMpIHtcblxuXHRvcHRpb25zID0gYXNzaWduKHsgbWVhbjogMCwgZGV2OiAxLCBwb29sOiBbXSB9LCBvcHRpb25zKTtcblxuXHQvLyBJZiBhIHBvb2wgaGFzIGJlZW4gcGFzc2VkLCB0aGVuIHdlIGFyZSByZXR1cm5pbmcgYW4gaXRlbSBmcm9tIHRoYXQgcG9vbCxcblx0Ly8gdXNpbmcgdGhlIG5vcm1hbCBkaXN0cmlidXRpb24gc2V0dGluZ3MgdGhhdCB3ZXJlIHBhc3NlZCBpblxuXHRpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLnBvb2wpICYmIG9wdGlvbnMucG9vbC5sZW5ndGggPiAwKSB7XG5cdHJldHVybiBub3JtYWxQb29sKG9wdGlvbnMpO1xuXHR9XG5cblx0Ly8gVGhlIE1hcnNhZ2xpYSBQb2xhciBtZXRob2Rcblx0dmFyIHM7XG5cdHZhciB1O1xuXHR2YXIgdjtcblx0dmFyIG5vcm07XG5cdHZhciBtZWFuID0gb3B0aW9ucy5tZWFuO1xuXHR2YXIgZGV2ICA9IG9wdGlvbnMuZGV2O1xuXG5cdGRvIHtcblx0Ly8gVSBhbmQgViBhcmUgZnJvbSB0aGUgdW5pZm9ybSBkaXN0cmlidXRpb24gb24gKC0xLCAxKVxuXHR1ID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuXHR2ID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuXG5cdHMgPSB1ICogdSArIHYgKiB2O1xuXHR9IHdoaWxlIChzID49IDEpO1xuXG5cdC8vIENvbXB1dGUgdGhlIHN0YW5kYXJkIG5vcm1hbCB2YXJpYXRlXG5cdG5vcm0gPSB1ICogTWF0aC5zcXJ0KC0yICogTWF0aC5sb2cocykgLyBzKTtcblxuXHQvLyBTaGFwZSBhbmQgc2NhbGVcblx0cmV0dXJuIGRldiAqIG5vcm0gKyBtZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQoZGVnKSB7XG5cdHJldHVybiBkZWcgKiBNYXRoLlBJIC8gMTgwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGF0TG9uZ1RvRXVjbGlkZWFuKGxhdCwgbG9uZywgUj0xLCByZXZlcnNlPXRydWUpIHtcblx0bGV0IHJhZExhdCA9IGRlZ1RvUmFkKGxhdCk7XG5cdGxldCByYWRMb25nID0gcmV2ZXJzZSA/IGRlZ1RvUmFkKC1sb25nKSA6IGRlZ1RvUmFkKGxvbmcpO1xuXHRsZXQgeCA9IFIgKiBNYXRoLmNvcyhyYWRMYXQpICogTWF0aC5jb3MocmFkTG9uZyk7XG5cdGxldCB6ID0gUiAqIE1hdGguY29zKHJhZExhdCkgKiBNYXRoLnNpbihyYWRMb25nKTtcblx0bGV0IHkgPSBSICogTWF0aC5zaW4ocmFkTGF0KVxuXHRyZXR1cm4ge3gsIHksIHp9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhamF4V2l0aENhbGxiYWNrKHVybCwgY2IpIHtcblx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHR4aHIub3BlbignR0VUJywgdXJsKTtcblx0eGhyLnNlbmQobnVsbCk7XG5cdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0aWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgPT09IDIwMCkge1xuXHRcdGNiKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHR9XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1heWJlRXZhbCh2LCB4KSB7XG5cdGlmICh0eXBlb2YodikgPT0gJ2Z1bmN0aW9uJylcblx0XHRyZXR1cm4gdih4KTtcblx0ZWxzZVxuXHRcdHJldHVybiB2O1xufVxuXG4vKipcbiAqIFJldHVybiBhIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIG1hcHBpbmcgZnJvbSB2YWx1ZXMgZm9yIGFuIGF0dHJpYnV0ZSB0byB0YXJnZXQgdmFsdWVzLlxuICogQ2FuIGJlIHVzZWQsIGZvciBleGFtcGxlLCB0byBtYXAgZnJvbSBhdHRyaWJ1dGUgdmFsdWVzIHRvIGNvbG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpY2FsTWFwKGF0dHJpYnV0ZSwgbWFwKSB7XG5cdHJldHVybiBmdW5jdGlvbihkcCkge1xuXHRcdGxldCB2ID0gZHAuZ2V0KGF0dHJpYnV0ZSk7XG5cdFx0aWYgKG1hcFt2XSlcblx0XHRcdHJldHVybiBtYXBbdl07XG5cdFx0ZWxzZSBpZiAobWFwLl9kZWZhdWx0KVxuXHRcdFx0cmV0dXJuIG1hcC5fZGVmYXVsdDtcblx0XHRlbHNlIFxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxufVxuXG4iXX0=
