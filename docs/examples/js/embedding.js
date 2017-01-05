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


var MeshEmbedding = exports.MeshEmbedding = function (_Embedding) {
	_inherits(MeshEmbedding, _Embedding);

	function MeshEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, MeshEmbedding);

		options = (0, _objectAssign2.default)({
			meshSizeX: .02,
			meshSizeY: .02,
			meshSizeZ: .02,
			material: new THREE.MeshStandardMaterial({
				color: 0xff00ff,
				emissive: 0x888888,
				shading: THREE.FlatShading
			})
		}, options);

		// mapping from datapoint ids to meshes
		var _this = _possibleConstructorReturn(this, (MeshEmbedding.__proto__ || Object.getPrototypeOf(MeshEmbedding)).call(this, scene, dataset, options));

		_this.dpMap = {};

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
   * A default mesh creator; this can be overriden by subclasses 
   */

	}, {
		key: 'createMeshForDatapoint',
		value: function createMeshForDatapoint(dp) {
			var geo = new THREE.BoxGeometry(this.getOpt("meshSizeX", dp), this.getOpt("meshSizeY", dp), this.getOpt("meshSizeZ", dp));
			var mat = this.getOpt('material').clone();
			return new THREE.Mesh(geo, mat);
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var dp = this.dataset.datapoints[id];
			var mesh = this.createMeshForDatapoint(dp);
			mesh.userData.description = this.getOpt("description", dp);
			this.dpMap[id] = mesh;
			this.obj3D.add(mesh);
			THREE.input.add(mesh);
			mesh.position.set(dp.get(this._mapAttr('x')), dp.get(this._mapAttr('y')), dp.get(this._mapAttr('z')));
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
	}, {
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
			var mesh = this.createMeshForDatapoint(dp);
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
			fillStyle: "rgba(255,0,0,0.95)"
		}, options);

		var _this7 = _possibleConstructorReturn(this, (ConsoleEmbedding.__proto__ || Object.getPrototypeOf(ConsoleEmbedding)).call(this, scene, dataset, options));

		_this7.canvas = document.createElement('canvas');
		_this7.canvas.width = 256;
		_this7.canvas.height = 128;
		_this7.context = _this7.canvas.getContext('2d');
		_this7.context.font = _this7.getOpt('font');
		_this7.context.fillStyle = _this7.getOpt('fillStyle');
		_this7.mesh = undefined;
		return _this7;
	}

	_createClass(ConsoleEmbedding, [{
		key: 'setText',
		value: function setText(text) {
			if (this.mesh) this.obj3D.remove(this.mesh);

			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.context.fillText(text, 0, 25);
			var texture = new THREE.Texture(this.canvas);
			texture.needsUpdate = true;
			var material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
			material.transparent = true;
			this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.canvas.width * .1, this.canvas.height * .1), material);
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

},{"object-assign":3,"tween.js":13}],17:[function(require,module,exports){
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
var lastRender = 0;
var vrDisplay;

/**
 * Convenience function to create a responsive THREE scene and related objects. Returns a number 
 * of objects that should probably be kept around by the enclosing script.
 */
function initScene() {
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
		ajaxWithCallback: _utils.ajaxWithCallback
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

},{"object-assign":3}]},{},[17])(17)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92Ni41LjAvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8ubnZtL3ZlcnNpb25zL25vZGUvdjYuNS4wL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXBhcGFyc2UvcGFwYXBhcnNlLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeS1zdHJpbmcvbm9kZV9tb2R1bGVzL3N0cmljdC11cmktZW5jb2RlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvb3JpZW50YXRpb24tYXJtLW1vZGVsLmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvcmF5LWNvbnRyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW5wdXQuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW50ZXJhY3Rpb24tbW9kZXMuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyIsInNyYy9kYXRhc2V0LmpzIiwic3JjL2RldGVjdGlvbi11dGlscy5qcyIsInNyYy9lbWJlZGRpbmcuanMiLCJzcmMvbWFpbi5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7OztBQ3QyQkE7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0FBRUE7OztJQUdhLE8sV0FBQSxPOztBQUVaOzs7QUFHQSxvQkFBYztBQUFBOztBQUNiLE9BQUssVUFBTCxHQUFrQixFQUFsQjtBQUNBLE9BQUssVUFBTCxHQUFrQixFQUFsQjtBQUNBOztBQUVEOzs7Ozs7O0FBT0E7Ozs7Ozs7Ozs7O0FBc0JBOzs7O3NCQUlJLFMsRUFBVztBQUNkLE9BQUksQ0FBSjtBQUNBLE9BQUksRUFBRyxxQkFBcUIsU0FBeEIsQ0FBSixFQUF3QztBQUN2QyxRQUFJLElBQUksU0FBSixDQUFjLFNBQWQsQ0FBSjtBQUNBLElBRkQsTUFFTztBQUNOLFFBQUksU0FBSjtBQUNBO0FBQ0QsUUFBSyxVQUFMLENBQWdCLEVBQUUsRUFBbEIsSUFBd0IsQ0FBeEI7QUFDQSxRQUFLLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCLEVBQUUsRUFBaEM7QUFDQTs7QUFFRDs7Ozs7Ozt5QkFJTyxFLEVBQUk7QUFDVixVQUFPLEtBQUssVUFBTCxDQUFnQixFQUFoQixDQUFQO0FBQ0EsUUFBSyxpQkFBTCxDQUF1QixRQUF2QixFQUFpQyxFQUFqQztBQUNBOztBQUVEOzs7Ozs7Ozs7eUJBTU8sRSxFQUFJLEMsRUFBRyxDLEVBQUc7QUFDaEIsT0FBSSxLQUFLLEtBQUssVUFBTCxDQUFnQixFQUFoQixDQUFUO0FBQ0EsT0FBSSxFQUFKLEVBQVE7QUFDUCxRQUFJLE1BQU0sR0FBRyxHQUFILENBQU8sQ0FBUCxDQUFWO0FBQ0EsT0FBRyxHQUFILENBQU8sQ0FBUCxFQUFVLENBQVY7QUFDQSxTQUFLLGlCQUFMLENBQXVCLFFBQXZCLEVBQWlDLEVBQWpDLEVBQXFDLENBQXJDLEVBQXdDLENBQXhDLEVBQTJDLEdBQTNDO0FBQ0E7QUFDRDs7O3NCQUVHLEUsRUFBSTtBQUFFLFVBQU8sS0FBSyxVQUFMLENBQWdCLEVBQWhCLENBQVA7QUFBNkI7OzsyQkFFOUI7QUFBRSxVQUFPLE9BQU8sSUFBUCxDQUFZLEtBQUssVUFBakIsQ0FBUDtBQUFzQzs7OzJCQUV4QyxTLEVBQVc7QUFDbkIsUUFBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLFNBQXJCO0FBQ0E7OztvQ0FFaUIsSSxFQUFNLEUsRUFBVTtBQUNqQyxPQUFJLE1BQU0sRUFBRSxNQUFNLElBQVIsRUFBYyxJQUFJLEVBQWxCLEVBQVY7QUFDQSxPQUFJLFFBQVEsUUFBWixFQUFzQjtBQUNyQixRQUFJLElBQUo7QUFDQSxRQUFJLE1BQUo7QUFDQSxRQUFJLE1BQUo7QUFDQTtBQUNELFFBQUssVUFBTCxDQUFnQixPQUFoQixDQUF3QixVQUFDLENBQUQ7QUFBQSxXQUFPLEVBQUUsTUFBRixDQUFVLEdBQVYsQ0FBUDtBQUFBLElBQXhCO0FBQ0E7OztnQ0F4RW9CLEcsRUFBSyxRLEVBQVU7QUFDbkMsdUJBQUssS0FBTCxDQUFXLEdBQVgsRUFBZ0I7QUFDZixjQUFVLElBREs7QUFFZixZQUFRLElBRk87QUFHZixtQkFBZSxJQUhBO0FBSWYsY0FBVSxrQkFBUyxPQUFULEVBQWtCO0FBQzNCLFNBQUksS0FBSyxJQUFJLE9BQUosRUFBVDtBQUNBLFVBQUssSUFBSSxDQUFULElBQWMsUUFBUSxJQUF0QixFQUE0QjtBQUMzQixVQUFJLEtBQUssUUFBUSxJQUFSLENBQWEsQ0FBYixDQUFUO0FBQ0EsU0FBRyxHQUFILEdBQVMsQ0FBVDtBQUNBLFNBQUcsR0FBSCxDQUFPLEVBQVA7QUFDQTtBQUNELGNBQVMsRUFBVDtBQUNBO0FBWmMsSUFBaEI7QUFjQTs7Ozs7O0FBNERGOzs7OztJQUdhLGdCLFdBQUEsZ0I7OztBQUNaLDJCQUFZLEdBQVosRUFBK0I7QUFBQSxNQUFkLE9BQWMsdUVBQUosRUFBSTs7QUFBQTs7QUFDOUIsWUFBVSw0QkFBTyxFQUFDLFdBQVcsbUJBQUMsQ0FBRDtBQUFBLFdBQU8sQ0FBUDtBQUFBLElBQVosRUFBc0IsTUFBTSxjQUFDLENBQUQsRUFBTyxDQUFFLENBQXJDLEVBQVAsRUFBK0MsT0FBL0MsQ0FBVjs7QUFEOEI7O0FBRzlCLFFBQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxRQUFLLE1BQUwsR0FBYyxJQUFJLFNBQUosQ0FBYyxHQUFkLENBQWQ7QUFDQSxRQUFLLE1BQUwsQ0FBWSxNQUFaLEdBQXFCO0FBQUEsVUFBTSxNQUFLLE9BQUwsQ0FBYSxJQUFiLENBQWtCLE1BQUssTUFBdkIsQ0FBTjtBQUFBLEdBQXJCO0FBQ0EsUUFBSyxNQUFMLENBQVksU0FBWixHQUF3QixVQUFTLENBQVQsRUFBWTtBQUNuQyxPQUFJLElBQUksS0FBSyxPQUFMLENBQWEsU0FBYixDQUF1QixLQUFLLEtBQUwsQ0FBVyxFQUFFLElBQWIsQ0FBdkIsQ0FBUjtBQUNBLFFBQUssR0FBTCxDQUFTLENBQVQ7QUFDQSxHQUh1QixDQUd0QixJQUhzQixPQUF4QjtBQU44QjtBQVU5Qjs7O0VBWG9DLE87O0lBY3pCLFMsV0FBQSxTO0FBQ1osb0JBQVksTUFBWixFQUF1QztBQUFBLE1BQW5CLFdBQW1CLHVFQUFQLEtBQU87O0FBQUE7O0FBQ3RDLE9BQUssTUFBTCxHQUFjLE1BQWQ7QUFDQSxPQUFLLFdBQUwsR0FBbUIsV0FBbkI7QUFDQTs7OztzQkFNRyxDLEVBQUc7QUFBRSxVQUFPLEtBQUssTUFBTCxDQUFZLENBQVosQ0FBUDtBQUF3Qjs7O3NCQUU3QixDLEVBQUcsQyxFQUFHO0FBQ1QsUUFBSyxNQUFMLENBQVksQ0FBWixJQUFpQixDQUFqQjtBQUNBOzs7c0JBUlE7QUFDUixVQUFPLEtBQUssTUFBTCxDQUFZLEtBQUssV0FBakIsQ0FBUDtBQUNBOzs7Ozs7O0FDaElGOztBQUVBOzs7OztRQTZEZ0IsVSxHQUFBLFU7QUEzRFQsSUFBTSx3Q0FBZ0I7QUFDNUIsVUFBUyxpQkFEbUI7QUFFNUIsU0FBUSxnQkFGb0I7QUFHNUIsS0FBSTtBQUh3QixDQUF0Qjs7QUFNQSxJQUFNLG9DQUFjO0FBQzFCLFdBQVUsZ0JBRGdCO0FBRTFCLFFBQU8sYUFGbUI7QUFHMUIsVUFBUyxlQUhpQjtBQUkxQixVQUFTLGVBSmlCO0FBSzFCLFVBQVM7QUFMaUIsQ0FBcEI7O0FBUVA7QUFDQSxTQUFTLFFBQVQsR0FBb0I7QUFDbEIsS0FBSSxRQUFRLEtBQVo7QUFDQSxFQUFDLFVBQVMsQ0FBVCxFQUFXO0FBQUMsTUFBRywyVEFBMlQsSUFBM1QsQ0FBZ1UsQ0FBaFUsS0FBb1UsMGtEQUEwa0QsSUFBMWtELENBQStrRCxFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVcsQ0FBWCxDQUEva0QsQ0FBdlUsRUFBcTZELFFBQVEsSUFBUjtBQUFhLEVBQS83RCxFQUFpOEQsVUFBVSxTQUFWLElBQXFCLFVBQVUsTUFBL0IsSUFBdUMsT0FBTyxLQUEvK0Q7QUFDQSxRQUFPLEtBQVA7QUFDRDs7QUFFRCxTQUFTLGFBQVQsR0FBeUI7QUFDeEIsS0FBSSxVQUFVLGFBQWQsRUFBNkI7QUFDNUIsU0FBTyxjQUFjLEVBQXJCO0FBQ0EsRUFGRCxNQUVPO0FBQ04sTUFBSSxVQUFKLEVBQ0MsT0FBTyxjQUFjLE1BQXJCLENBREQsS0FHQyxPQUFPLGNBQWMsT0FBckI7QUFDRDtBQUNEOztBQUVELFNBQVMsV0FBVCxDQUFxQixXQUFyQixFQUFrQztBQUNqQyxLQUFJLFVBQVUsU0FBZDtBQUNBLEtBQUksVUFBVSxXQUFkLEVBQTJCO0FBQzFCLE1BQUksV0FBVyxVQUFVLFdBQVYsRUFBZjtBQUQwQjtBQUFBO0FBQUE7O0FBQUE7QUFFMUIsd0JBQW9CLFFBQXBCLDhIQUE4QjtBQUFBLFFBQXJCLFFBQXFCOztBQUM3QixRQUFJLFlBQVcsU0FBUSxJQUF2QixFQUE2QjtBQUM1QixTQUFJLFNBQVEsSUFBUixDQUFhLFdBQWpCLEVBQ0MsT0FBTyxZQUFZLE9BQW5CLENBREQsS0FFSyxJQUFJLFNBQVEsSUFBUixDQUFhLGNBQWpCLEVBQ0osT0FBTyxZQUFZLE9BQW5CO0FBQ0Q7QUFDRDtBQVR5QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVTFCOztBQUVEO0FBQ0EsS0FBSSxVQUFKLEVBQWdCO0FBQ2YsTUFBSSxlQUFlLGNBQWMsRUFBakMsRUFDQyxPQUFPLFlBQVksT0FBbkIsQ0FERCxLQUdDLE9BQU8sWUFBWSxLQUFuQjtBQUNELEVBTEQsTUFLTztBQUNOLFNBQU8sWUFBWSxRQUFuQjtBQUNBOztBQUVELFFBQU8sWUFBWSxLQUFuQjtBQUNBOztBQUVNLFNBQVMsVUFBVCxHQUFzQjtBQUM1QixLQUFNLGNBQWMsZUFBcEI7QUFDQSxLQUFNLFlBQVksWUFBWSxXQUFaLENBQWxCO0FBQ0EsUUFBTyxFQUFFLHdCQUFGLEVBQWUsb0JBQWYsRUFBUDtBQUNBOzs7Ozs7Ozs7Ozs7OztBQ25FRDs7OztBQUNBOzs7Ozs7Ozs7Ozs7QUFFQTs7O0lBR2EsUyxXQUFBLFM7QUFDWjs7Ozs7Ozs7Ozs7Ozs7OztBQWdCQSxvQkFBWSxLQUFaLEVBQW1CLE9BQW5CLEVBQTBDO0FBQUEsTUFBZCxPQUFjLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3pDLE9BQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxNQUFJLE9BQUosRUFBYSxRQUFRLFFBQVIsQ0FBaUIsSUFBakI7QUFDYixPQUFLLEtBQUwsR0FBYSxJQUFJLE1BQU0sUUFBVixFQUFiO0FBQ0EsUUFBTSxHQUFOLENBQVUsS0FBSyxLQUFmO0FBQ0EsT0FBSyxXQUFMLEdBQW1CLEtBQW5CO0FBQ0EsT0FBSyxNQUFMLEdBQWMsRUFBZDs7QUFFQTtBQUNBLFlBQVUsNEJBQU8sRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBYyxHQUFHLENBQWpCLEVBQVAsRUFBNkIsT0FBN0IsQ0FBVjtBQUNBLFlBQVUsNEJBQU8sRUFBRSxJQUFHLENBQUwsRUFBUSxJQUFHLENBQVgsRUFBYyxJQUFHLENBQWpCLEVBQVAsRUFBNkIsT0FBN0IsQ0FBVjtBQUNBLFlBQVUsNEJBQU8sRUFBRSxJQUFHLENBQUwsRUFBUSxJQUFHLENBQVgsRUFBYyxJQUFHLENBQWpCLEVBQVAsRUFBNkIsT0FBN0IsQ0FBVjtBQUNBLFlBQVUsNEJBQU8sRUFBRSxTQUFTLEVBQVgsRUFBUCxFQUF3QixPQUF4QixDQUFWO0FBQ0EsT0FBSyxPQUFMLEdBQWUsT0FBZjtBQUNBLE9BQUssS0FBTCxDQUFXLFFBQVgsQ0FBb0IsR0FBcEIsQ0FBd0IsUUFBUSxDQUFoQyxFQUFtQyxRQUFRLENBQTNDLEVBQThDLFFBQVEsQ0FBdEQ7QUFDQSxPQUFLLEtBQUwsQ0FBVyxRQUFYLENBQW9CLEdBQXBCLENBQXdCLFFBQVEsRUFBaEMsRUFBb0MsUUFBUSxFQUE1QyxFQUFnRCxRQUFRLEVBQXhEO0FBQ0EsT0FBSyxLQUFMLENBQVcsS0FBWCxDQUFpQixHQUFqQixDQUFxQixRQUFRLEVBQTdCLEVBQWlDLFFBQVEsRUFBekMsRUFBNkMsUUFBUSxFQUFyRDtBQUNBO0FBQ0EsT0FBSyxPQUFMLEdBQWUsS0FBSyxPQUFMLENBQWEsT0FBNUI7QUFDQTs7QUFFRDs7Ozs7Ozs7dUJBSUssRSxFQUFJLEcsRUFBSztBQUNiLE9BQUksTUFBTSxLQUFLLE9BQUwsQ0FBYSxHQUFiLENBQVY7QUFDQSxVQUFPLE1BQU0sR0FBRyxHQUFILENBQU8sR0FBUCxDQUFOLEdBQW9CLEdBQUcsR0FBSCxDQUFPLEdBQVAsQ0FBM0I7QUFDQTs7QUFFRDs7Ozs7OzsyQkFJUyxHLEVBQUs7QUFDYixPQUFJLE1BQU0sS0FBSyxPQUFMLENBQWEsR0FBYixDQUFWO0FBQ0EsVUFBTyxNQUFNLEdBQU4sR0FBWSxHQUFuQjtBQUNBOztBQUVEOzs7Ozs7OzBCQUlRO0FBQ1A7QUFDQTs7O3lCQUVNLEssRUFBTztBQUNiLFFBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBakI7QUFDQTs7O3lCQUVNLEMsRUFBYztBQUFBLE9BQVgsRUFBVyx1RUFBTixJQUFNOztBQUNwQixPQUFJLElBQUksS0FBSyxPQUFMLENBQWEsQ0FBYixDQUFSO0FBQ0EsT0FBSSxPQUFPLENBQVAsSUFBYSxVQUFqQixFQUE2QixPQUFPLEVBQUUsRUFBRixDQUFQLENBQTdCLEtBQ0ssT0FBTyxDQUFQO0FBQ0w7Ozs7OztBQUdGOzs7OztJQUdhLGEsV0FBQSxhOzs7QUFDWix3QkFBWSxLQUFaLEVBQW1CLE9BQW5CLEVBQXdDO0FBQUEsTUFBWixPQUFZLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3ZDLFlBQVUsNEJBQ1Q7QUFDQyxjQUFXLEdBRFo7QUFFQyxjQUFXLEdBRlo7QUFHQyxjQUFXLEdBSFo7QUFJQyxhQUFVLElBQUksTUFBTSxvQkFBVixDQUFnQztBQUN6QyxXQUFPLFFBRGtDO0FBRXpDLGNBQVUsUUFGK0I7QUFHekMsYUFBUyxNQUFNO0FBSDBCLElBQWhDO0FBSlgsR0FEUyxFQVVOLE9BVk0sQ0FBVjs7QUFhQTtBQWR1Qyw0SEFZakMsS0FaaUMsRUFZMUIsT0FaMEIsRUFZakIsT0FaaUI7O0FBZXZDLFFBQUssS0FBTCxHQUFhLEVBQWI7O0FBZnVDO0FBQUE7QUFBQTs7QUFBQTtBQWlCdkMsd0JBQWUsTUFBSyxPQUFMLENBQWEsTUFBYixFQUFmO0FBQUEsUUFBUyxFQUFUO0FBQXNDLFVBQUssZUFBTCxDQUFxQixFQUFyQjtBQUF0QztBQWpCdUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQWtCdkM7Ozs7MEJBRU87QUFDUDtBQUNBLE9BQUksS0FBSyxNQUFMLENBQVksTUFBWixHQUFxQixDQUF6QixFQUE0QjtBQUMzQixTQUFLLElBQUksQ0FBVCxJQUFjLEtBQUssTUFBbkIsRUFBMkI7QUFDMUIsU0FBSSxJQUFJLEtBQUssTUFBTCxDQUFZLENBQVosQ0FBUjtBQUNBLFNBQVMsRUFBRSxJQUFGLElBQVUsS0FBbkIsRUFBNkIsS0FBSyxlQUFMLENBQXFCLEVBQUUsRUFBdkIsRUFBN0IsS0FDSyxJQUFJLEVBQUUsSUFBRixJQUFVLFFBQWQsRUFBd0IsS0FBSyxnQkFBTCxDQUFzQixFQUFFLEVBQXhCLEVBQXhCLEtBQ0EsSUFBSSxFQUFFLElBQUYsSUFBVSxRQUFkLEVBQXdCLEtBQUssZ0JBQUwsQ0FBc0IsRUFBRSxFQUF4QixFQUE0QixDQUE1QjtBQUM3QjtBQUNEO0FBQ0QsUUFBSyxNQUFMLEdBQWMsRUFBZDtBQUNBOztBQUVEOzs7Ozs7eUNBR3VCLEUsRUFBSTtBQUMxQixPQUFJLE1BQU0sSUFBSSxNQUFNLFdBQVYsQ0FDVCxLQUFLLE1BQUwsQ0FBWSxXQUFaLEVBQXlCLEVBQXpCLENBRFMsRUFDcUIsS0FBSyxNQUFMLENBQVksV0FBWixFQUF5QixFQUF6QixDQURyQixFQUNtRCxLQUFLLE1BQUwsQ0FBWSxXQUFaLEVBQXlCLEVBQXpCLENBRG5ELENBQVY7QUFFQSxPQUFJLE1BQU0sS0FBSyxNQUFMLENBQVksVUFBWixFQUF3QixLQUF4QixFQUFWO0FBQ0EsVUFBTyxJQUFJLE1BQU0sSUFBVixDQUFlLEdBQWYsRUFBb0IsR0FBcEIsQ0FBUDtBQUNBOzs7a0NBRWUsRSxFQUFJO0FBQ25CLE9BQUksS0FBTSxLQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLEVBQXhCLENBQVY7QUFDQSxPQUFJLE9BQU8sS0FBSyxzQkFBTCxDQUE0QixFQUE1QixDQUFYO0FBQ0EsUUFBSyxRQUFMLENBQWMsV0FBZCxHQUE0QixLQUFLLE1BQUwsQ0FBWSxhQUFaLEVBQTJCLEVBQTNCLENBQTVCO0FBQ0EsUUFBSyxLQUFMLENBQVcsRUFBWCxJQUFpQixJQUFqQjtBQUNBLFFBQUssS0FBTCxDQUFXLEdBQVgsQ0FBZSxJQUFmO0FBQ0EsU0FBTSxLQUFOLENBQVksR0FBWixDQUFnQixJQUFoQjtBQUNBLFFBQUssUUFBTCxDQUFjLEdBQWQsQ0FBa0IsR0FBRyxHQUFILENBQU8sS0FBSyxRQUFMLENBQWMsR0FBZCxDQUFQLENBQWxCLEVBQThDLEdBQUcsR0FBSCxDQUFPLEtBQUssUUFBTCxDQUFjLEdBQWQsQ0FBUCxDQUE5QyxFQUEwRSxHQUFHLEdBQUgsQ0FBTyxLQUFLLFFBQUwsQ0FBYyxHQUFkLENBQVAsQ0FBMUU7QUFDQTs7O21DQUVnQixFLEVBQUk7QUFDcEIsT0FBSSxPQUFPLEtBQUssS0FBTCxDQUFXLEVBQVgsQ0FBWDtBQUNBLE9BQUksSUFBSixFQUFVLEtBQUssS0FBTCxDQUFXLE1BQVgsQ0FBa0IsSUFBbEI7QUFDVjs7O21DQUVnQixFLEVBQUksSyxFQUFPO0FBQzNCLG9CQUFpQixFQUFqQjtBQUNBLG1CQUFnQixFQUFoQjtBQUNBOzs7O0VBOURpQyxTOztBQWtFbkM7Ozs7O0lBR2EsZSxXQUFBLGU7OztBQUNaLDBCQUFZLEtBQVosRUFBbUIsT0FBbkIsRUFBd0M7QUFBQSxNQUFaLE9BQVksdUVBQUosRUFBSTs7QUFBQTs7QUFDdkMsWUFBVSw0QkFDVDtBQUNDLGNBQVcsTUFEWjtBQUVDLGNBQVcsR0FGWjtBQUdDLGVBQVk7QUFIYixHQURTLEVBS04sT0FMTSxDQUFWOztBQVFBO0FBVHVDLGlJQU9qQyxLQVBpQyxFQU8xQixPQVAwQixFQU9qQixPQVBpQjs7QUFVdkMsTUFBSSxTQUFTLElBQUksTUFBTSxhQUFWLEdBQTBCLElBQTFCLENBQ1osd0VBRFksQ0FBYjtBQUVBLE1BQUksZ0JBQWdCO0FBQ25CLFNBQU0sT0FBSyxNQUFMLENBQVksV0FBWixDQURhO0FBRW5CLG9CQUFpQixJQUZFO0FBR25CLFFBQUssTUFIYztBQUluQixVQUFPLE9BQUssTUFBTCxDQUFZLFlBQVosQ0FKWTtBQUtuQixjQUFXLEdBTFE7QUFNbkIsZ0JBQWE7QUFOTSxHQUFwQjtBQVFBLFNBQUssTUFBTCxHQUFjLElBQUksTUFBTSxNQUFWLENBQ2IsSUFBSSxNQUFNLFFBQVYsRUFEYSxFQUNTLElBQUksTUFBTSxjQUFWLENBQXlCLGFBQXpCLENBRFQsQ0FBZDtBQUVBLFNBQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsUUFBckIsQ0FBOEIsSUFBOUIsQ0FBbUMsSUFBSSxNQUFNLE9BQVYsQ0FBa0IsQ0FBbEIsRUFBb0IsQ0FBcEIsRUFBc0IsQ0FBdEIsQ0FBbkM7QUFDQSxTQUFLLEtBQUwsQ0FBVyxHQUFYLENBQWUsT0FBSyxNQUFwQjtBQXZCdUM7QUF3QnZDOzs7RUF6Qm1DLFM7O0FBNEJyQzs7Ozs7SUFHYSxnQixXQUFBLGdCOzs7QUFDWiwyQkFBWSxLQUFaLEVBQW1CLE9BQW5CLEVBQXdDO0FBQUEsTUFBWixPQUFZLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3ZDLFlBQVUsNEJBQ1Q7QUFDQyxlQUFZLElBRGI7QUFFQyxjQUFXLENBRlo7QUFHQyxjQUFXLEtBSFo7QUFJQyxtQkFBZ0I7QUFKakIsR0FEUyxFQU1OLE9BTk0sQ0FBVjs7QUFTQTtBQVZ1QyxtSUFRakMsS0FSaUMsRUFRMUIsT0FSMEIsRUFRakIsT0FSaUI7O0FBV3ZDLFNBQUssS0FBTCxHQUFhLEVBQWI7O0FBRUE7QUFDQSxTQUFLLFlBQUwsR0FBb0IsRUFBcEI7O0FBRUE7QUFDQSxPQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksT0FBSyxNQUFMLENBQVksWUFBWixDQUFwQixFQUErQyxHQUEvQyxFQUFvRDtBQUNuRCxVQUFLLE1BQUwsQ0FBWSxRQUFaLENBQXFCLFFBQXJCLENBQThCLElBQTlCLENBQ0MsSUFBSSxNQUFNLE9BQVYsQ0FBa0IsQ0FBQyxPQUFuQixFQUE0QixDQUFDLE9BQTdCLEVBQXNDLENBQUMsT0FBdkMsQ0FERDtBQUVBLFVBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixDQUF2QjtBQUNBOztBQUVEO0FBQ0EsTUFBSSxPQUFLLE1BQUwsQ0FBWSxXQUFaLENBQUosRUFBOEI7QUFDN0IsVUFBSyxjQUFMLENBQW9CLE9BQUssTUFBTCxDQUFZLGdCQUFaLENBQXBCO0FBQ0EsV0FBUSxHQUFSLENBQVksT0FBSyxPQUFqQjtBQUNBLEdBSEQsTUFHTyxJQUFJLE9BQUssTUFBTCxDQUFZLFNBQVosQ0FBSixFQUE0QjtBQUNsQztBQUNBLEdBRk0sTUFFQTtBQUNOLFVBQUssT0FBTCxHQUFlLElBQUksU0FBSixFQUFmO0FBQ0E7O0FBRUQsU0FBSyxNQUFMLEdBQWMsRUFBZDtBQWpDdUM7QUFrQ3ZDOzs7O2lDQUVjLEssRUFBTztBQUFBOztBQUNyQixPQUFJLE1BQU0sS0FBSyxPQUFMLENBQWEsTUFBYixHQUFzQixHQUF0QixDQUEwQixVQUFDLEVBQUQ7QUFBQSxXQUFRLE9BQUssT0FBTCxDQUFhLEdBQWIsQ0FBaUIsRUFBakIsQ0FBUjtBQUFBLElBQTFCLENBQVY7QUFDQSxPQUFJLE9BQU8sS0FBSyxHQUFMLENBQVMsS0FBVCxDQUFlLElBQWYsRUFBcUIsSUFBSSxHQUFKLENBQVEsVUFBQyxFQUFEO0FBQUEsV0FBUSxHQUFHLEdBQUgsQ0FBTyxPQUFLLFFBQUwsQ0FBYyxHQUFkLENBQVAsQ0FBUjtBQUFBLElBQVIsQ0FBckIsQ0FBWDtBQUNBLE9BQUksT0FBTyxLQUFLLEdBQUwsQ0FBUyxLQUFULENBQWUsSUFBZixFQUFxQixJQUFJLEdBQUosQ0FBUSxVQUFDLEVBQUQ7QUFBQSxXQUFRLEdBQUcsR0FBSCxDQUFPLE9BQUssUUFBTCxDQUFjLEdBQWQsQ0FBUCxDQUFSO0FBQUEsSUFBUixDQUFyQixDQUFYO0FBQ0EsT0FBSSxPQUFPLEtBQUssR0FBTCxDQUFTLEtBQVQsQ0FBZSxJQUFmLEVBQXFCLElBQUksR0FBSixDQUFRLFVBQUMsRUFBRDtBQUFBLFdBQVEsR0FBRyxHQUFILENBQU8sT0FBSyxRQUFMLENBQWMsR0FBZCxDQUFQLENBQVI7QUFBQSxJQUFSLENBQXJCLENBQVg7QUFDQSxPQUFJLE9BQU8sS0FBSyxHQUFMLENBQVMsS0FBVCxDQUFlLElBQWYsRUFBcUIsSUFBSSxHQUFKLENBQVEsVUFBQyxFQUFEO0FBQUEsV0FBUSxHQUFHLEdBQUgsQ0FBTyxPQUFLLFFBQUwsQ0FBYyxHQUFkLENBQVAsQ0FBUjtBQUFBLElBQVIsQ0FBckIsQ0FBWDtBQUNBLE9BQUksT0FBTyxLQUFLLEdBQUwsQ0FBUyxLQUFULENBQWUsSUFBZixFQUFxQixJQUFJLEdBQUosQ0FBUSxVQUFDLEVBQUQ7QUFBQSxXQUFRLEdBQUcsR0FBSCxDQUFPLE9BQUssUUFBTCxDQUFjLEdBQWQsQ0FBUCxDQUFSO0FBQUEsSUFBUixDQUFyQixDQUFYO0FBQ0EsT0FBSSxPQUFPLEtBQUssR0FBTCxDQUFTLEtBQVQsQ0FBZSxJQUFmLEVBQXFCLElBQUksR0FBSixDQUFRLFVBQUMsRUFBRDtBQUFBLFdBQVEsR0FBRyxHQUFILENBQU8sT0FBSyxRQUFMLENBQWMsR0FBZCxDQUFQLENBQVI7QUFBQSxJQUFSLENBQXJCLENBQVg7QUFDQSxRQUFLLE9BQUwsR0FBZSxJQUFJLFNBQUosQ0FDZCxFQUFHLE9BQU8sSUFBVixJQUFrQixDQURKLEVBRWQsRUFBRyxPQUFPLElBQVYsSUFBa0IsQ0FGSixFQUdkLEVBQUcsT0FBTyxJQUFWLElBQWtCLENBSEosRUFJZCxTQUFTLE9BQU8sSUFBaEIsQ0FKYyxFQUtkLFNBQVMsT0FBTyxJQUFoQixDQUxjLEVBTWQsU0FBUyxPQUFPLElBQWhCLENBTmMsQ0FBZjtBQVFBOzs7MEJBRU87QUFDUCxPQUFJLENBQUUsS0FBSyxXQUFYLEVBQXdCO0FBQ3ZCO0FBQ0EsU0FBSyxJQUFJLEVBQVQsSUFBZSxLQUFLLE9BQUwsQ0FBYSxVQUE1QixFQUF3QztBQUN2QyxVQUFLLGVBQUwsQ0FBcUIsRUFBckI7QUFDQTtBQUNELFNBQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsa0JBQXJCLEdBQTBDLElBQTFDO0FBQ0EsU0FBSyxXQUFMLEdBQW1CLElBQW5CO0FBQ0EsSUFQRCxNQU9PO0FBQ047QUFDQSxRQUFJLEtBQUssTUFBTCxDQUFZLE1BQVosR0FBcUIsQ0FBekIsRUFBNEI7QUFDM0IsVUFBSyxJQUFJLENBQVQsSUFBYyxLQUFLLE1BQW5CLEVBQTJCO0FBQzFCLFVBQUksSUFBSSxLQUFLLE1BQUwsQ0FBWSxDQUFaLENBQVI7QUFDQSxVQUFTLEVBQUUsSUFBRixJQUFVLEtBQW5CLEVBQTZCLEtBQUssZUFBTCxDQUFxQixFQUFFLEVBQXZCLEVBQTdCLEtBQ0ssSUFBSSxFQUFFLElBQUYsSUFBVSxRQUFkLEVBQXdCLEtBQUssZ0JBQUwsQ0FBc0IsRUFBRSxFQUF4QixFQUF4QixLQUNBLElBQUksRUFBRSxJQUFGLElBQVUsUUFBZCxFQUF3QixLQUFLLGdCQUFMLENBQXNCLEVBQUUsRUFBeEIsRUFBNEIsQ0FBNUI7QUFDN0I7QUFDRDtBQUNBLFVBQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsa0JBQXJCLEdBQTBDLElBQTFDO0FBQ0E7QUFDRCxTQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0E7QUFDRDs7O2tDQUVlLEUsRUFBSTtBQUNuQixPQUFJLEtBQUssS0FBSyxZQUFMLENBQWtCLEdBQWxCLEVBQVQ7QUFDQSxPQUFJLE1BQU0sU0FBVixFQUFxQjtBQUNwQixRQUFJLEtBQU0sS0FBSyxPQUFMLENBQWEsVUFBYixDQUF3QixFQUF4QixDQUFWO0FBQ0EsUUFBSSxDQUFFLEVBQU4sRUFBVTtBQUNWLFNBQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsUUFBckIsQ0FBOEIsRUFBOUIsRUFBa0MsR0FBbEMsQ0FDQyxLQUFLLE9BQUwsQ0FBYSxNQUFiLENBQW9CLEtBQUssSUFBTCxDQUFVLEVBQVYsRUFBYyxHQUFkLENBQXBCLENBREQsRUFFQyxLQUFLLE9BQUwsQ0FBYSxNQUFiLENBQW9CLEtBQUssSUFBTCxDQUFVLEVBQVYsRUFBYyxHQUFkLENBQXBCLENBRkQsRUFHQyxLQUFLLE9BQUwsQ0FBYSxNQUFiLENBQW9CLEtBQUssSUFBTCxDQUFVLEVBQVYsRUFBYyxHQUFkLENBQXBCLENBSEQ7QUFJQSxTQUFLLEtBQUwsQ0FBVyxFQUFYLElBQWlCLEVBQWpCO0FBQ0EsSUFSRCxNQVFPO0FBQ04sWUFBUSxJQUFSLENBQWEsNkJBQWI7QUFDQTtBQUNEOzs7bUNBRWdCLEUsRUFBSTtBQUNwQixPQUFJLEtBQUssS0FBSyxLQUFMLENBQVcsRUFBWCxDQUFUO0FBQ0EsT0FBSSxNQUFNLFNBQVYsRUFBcUI7QUFDcEIsU0FBSyxNQUFMLENBQVksUUFBWixDQUFxQixRQUFyQixDQUE4QixFQUE5QixFQUFrQyxHQUFsQyxDQUFzQyxDQUFDLE9BQXZDLEVBQWdELENBQUMsT0FBakQsRUFBMEQsQ0FBQyxPQUEzRDtBQUNBLFdBQU8sS0FBSyxLQUFMLENBQVcsRUFBWCxDQUFQO0FBQ0EsU0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLEVBQXZCO0FBQ0E7QUFDRDs7O21DQUVnQixFLEVBQUksSyxFQUFPO0FBQUE7O0FBQzNCLE9BQUksS0FBSyxLQUFLLEtBQUwsQ0FBVyxFQUFYLENBQVQ7QUFDQSxPQUFJLE1BQU0sU0FBVixFQUFxQjtBQUFBLFFBaUJoQixHQWpCZ0I7QUFBQSxRQWtCaEIsR0FsQmdCOztBQUFBO0FBQ3BCLFNBQUksS0FBTSxPQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLEVBQXhCLENBQVY7QUFDQSxTQUFJLENBQUUsRUFBTixFQUFVO0FBQUE7QUFBQTtBQUNWO0FBQ0EsU0FBSSxJQUFJLE9BQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsUUFBckIsQ0FBOEIsRUFBOUIsQ0FBUjs7QUFFQSxTQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBUCxFQUFVLEdBQUcsRUFBRSxDQUFmLEVBQWtCLEdBQUcsRUFBRSxDQUF2QixFQUFaO0FBQ0EsU0FBSSxNQUFNO0FBQ1QsU0FBRyxPQUFLLE9BQUwsQ0FBYSxNQUFiLENBQW9CLE9BQUssSUFBTCxDQUFVLEVBQVYsRUFBYyxHQUFkLENBQXBCLENBRE07QUFFVCxTQUFHLE9BQUssT0FBTCxDQUFhLE1BQWIsQ0FBb0IsT0FBSyxJQUFMLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBcEIsQ0FGTTtBQUdULFNBQUcsT0FBSyxPQUFMLENBQWEsTUFBYixDQUFvQixPQUFLLElBQUwsQ0FBVSxFQUFWLEVBQWMsR0FBZCxDQUFwQjtBQUhNLE1BQVY7QUFLQSxTQUFJLElBQUssSUFBSSxNQUFNLE9BQVYsQ0FBa0IsTUFBTSxDQUF4QixFQUEyQixNQUFNLENBQWpDLEVBQW9DLE1BQU0sQ0FBMUMsQ0FBRCxDQUNOLEdBRE0sQ0FDRixJQUFJLE1BQU0sT0FBVixDQUFrQixJQUFJLENBQXRCLEVBQXlCLElBQUksQ0FBN0IsRUFBZ0MsSUFBSSxDQUFwQyxDQURFLEVBRU4sTUFGTSxFQUFSO0FBR0EsU0FBSSxJQUFJLE9BQU8sQ0FBUCxHQUFXLE9BQUssTUFBTCxDQUFZLFdBQVosRUFBeUIsRUFBekIsQ0FBbkI7O0FBRUksV0FBTSxPQUFLLE1BQUwsQ0FBWSxRQWpCRjtBQWtCaEIsaUJBbEJnQjs7QUFtQnBCLFNBQUksT0FBSyxNQUFMLENBQVksRUFBWixDQUFKLEVBQXFCO0FBQ3BCLGFBQUssTUFBTCxDQUFZLEVBQVosRUFBZ0IsSUFBaEI7QUFDQSxhQUFPLE9BQUssTUFBTCxDQUFZLEVBQVosQ0FBUDtBQUNBOztBQUVELFNBQUksUUFBUSxJQUFJLGdCQUFNLEtBQVYsQ0FBZ0IsS0FBaEIsRUFDVixFQURVLENBQ1AsR0FETyxFQUNGLENBREUsRUFFVixRQUZVLENBRUQsWUFBVztBQUNwQixRQUFFLEdBQUYsQ0FBTSxLQUFLLENBQVgsRUFBYyxLQUFLLENBQW5CLEVBQXNCLEtBQUssQ0FBM0I7QUFDQSxVQUFJLGtCQUFKLEdBQXlCLElBQXpCO0FBQ0EsTUFMVSxFQU1WLFVBTlUsQ0FNQztBQUFBLGFBQU0sT0FBTyxJQUFJLE1BQUosQ0FBVyxFQUFYLENBQWI7QUFBQSxNQU5ELEVBT1YsTUFQVSxDQU9IO0FBQUEsYUFBTSxPQUFPLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBYjtBQUFBLE1BUEcsRUFRVixNQVJVLENBUUgsZ0JBQU0sTUFBTixDQUFhLFdBQWIsQ0FBeUIsS0FSdEIsRUFTVixLQVRVLEVBQVo7QUFVQSxZQUFLLE1BQUwsQ0FBWSxFQUFaLElBQWtCLEtBQWxCO0FBbENvQjs7QUFBQTtBQW1DcEI7QUFDRDs7OztFQTdJb0MsZTs7QUFnSnRDOzs7Ozs7SUFJYSxhLFdBQUEsYTs7O0FBQ1osd0JBQVksS0FBWixFQUFtQixPQUFuQixFQUE0QixTQUE1QixFQUF1QyxPQUF2QyxFQUFnRDtBQUFBOztBQUMvQyxZQUFVLDRCQUFPO0FBQ2hCLGVBQVksQ0FESTtBQUVoQixlQUFZLENBRkk7QUFHaEIsZUFBWSxDQUhJO0FBSWhCLGdCQUFhLEVBSkc7QUFLaEIsZ0JBQWEsSUFMRztBQU1oQixhQUFVO0FBTk0sR0FBUCxFQU9QLE9BUE8sQ0FBVjs7QUFEK0MsNkhBU3pDLEtBVHlDLEVBU2xDLE9BVGtDLEVBU3pCLE9BVHlCOztBQVUvQyxTQUFLLFNBQUwsR0FBaUIsVUFBVSxHQUFWLENBQWMsVUFBQyxDQUFEO0FBQUEsVUFBTyxJQUFJLE1BQU0sT0FBVixDQUFrQixFQUFFLENBQUYsQ0FBbEIsRUFBd0IsRUFBRSxDQUFGLENBQXhCLEVBQThCLEVBQUUsQ0FBRixDQUE5QixDQUFQO0FBQUEsR0FBZCxDQUFqQjs7QUFFQSxTQUFLLFdBQUwsR0FBbUIsRUFBbkI7QUFDQSxTQUFLLE1BQUwsR0FBYyxFQUFkO0FBYitDO0FBYy9DOzs7OzBCQUVPO0FBQ1A7QUFDQSxPQUFJLEtBQUssTUFBTCxDQUFZLE1BQVosR0FBcUIsQ0FBekIsRUFBNEI7QUFDM0IsU0FBSyxJQUFJLENBQVQsSUFBYyxLQUFLLE1BQW5CLEVBQTJCO0FBQzFCLFNBQUksSUFBSSxLQUFLLE1BQUwsQ0FBWSxDQUFaLENBQVI7QUFDQSxTQUFTLEVBQUUsSUFBRixJQUFVLEtBQW5CLEVBQTZCLEtBQUssZUFBTCxDQUFxQixFQUFFLEVBQXZCLEVBQTdCLEtBQ0ssSUFBSSxFQUFFLElBQUYsSUFBVSxRQUFkLEVBQXdCLEtBQUssZ0JBQUwsQ0FBc0IsRUFBRSxFQUF4QixFQUF4QixLQUNBLElBQUksRUFBRSxJQUFGLElBQVUsUUFBZCxFQUF3QixLQUFLLGdCQUFMLENBQXNCLEVBQUUsRUFBeEIsRUFBNEIsQ0FBNUI7QUFDN0I7QUFDRDtBQUNELFFBQUssTUFBTCxHQUFjLEVBQWQ7QUFDQTs7O29DQUVpQixFLEVBQUk7QUFDckIsT0FBSSxNQUFNLEtBQUssTUFBTCxDQUFZLFlBQVosQ0FBVjtBQUNBLE9BQUksTUFBTSxLQUFLLE1BQUwsQ0FBWSxZQUFaLENBQVY7QUFDQSxPQUFJLE1BQU0sS0FBSyxNQUFMLENBQVksWUFBWixDQUFWO0FBQ0EsT0FBSSxLQUFLLE1BQU0sS0FBSyxNQUFMLEVBQU4sR0FBc0IsTUFBTSxDQUFyQztBQUNBLE9BQUksS0FBSyxNQUFNLEtBQUssTUFBTCxFQUFOLEdBQXNCLE1BQU0sQ0FBckM7QUFDQSxPQUFJLEtBQUssTUFBTSxLQUFLLE1BQUwsRUFBTixHQUFzQixNQUFNLENBQXJDO0FBQ0EsUUFBSyxXQUFMLENBQWlCLEVBQWpCLElBQXVCLElBQUksTUFBTSxPQUFWLENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLEVBQTFCLENBQXZCO0FBQ0E7OztrQ0FFZSxFLEVBQUk7QUFDbkIsT0FBSSxLQUFNLEtBQUssT0FBTCxDQUFhLFVBQWIsQ0FBd0IsRUFBeEIsQ0FBVjtBQUNBLE9BQUksT0FBTyxLQUFLLHNCQUFMLENBQTRCLEVBQTVCLENBQVg7QUFDQSxRQUFLLGlCQUFMLENBQXVCLEVBQXZCO0FBQ0EsUUFBSyxRQUFMLENBQWMsV0FBZCxHQUE0QixLQUFLLE1BQUwsQ0FBWSxhQUFaLEVBQTJCLEVBQTNCLENBQTVCO0FBQ0EsUUFBSyxLQUFMLENBQVcsRUFBWCxJQUFpQixJQUFqQjtBQUNBLFFBQUssS0FBTCxDQUFXLEdBQVgsQ0FBZSxJQUFmO0FBQ0EsU0FBTSxLQUFOLENBQVksR0FBWixDQUFnQixJQUFoQjs7QUFFQTtBQUNBLE9BQUksUUFBUSxFQUFFLEdBQUcsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixDQUF2QixFQUEwQixHQUFHLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsQ0FBL0MsRUFBa0QsR0FBRyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLENBQXZFLEVBQVo7QUFDQSxPQUFJLE1BQU07QUFDVCxPQUFHLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsQ0FBckIsRUFBd0IsR0FBeEIsQ0FBNEIsVUFBQyxDQUFEO0FBQUEsWUFBTyxFQUFFLENBQVQ7QUFBQSxLQUE1QixDQURNO0FBRVQsT0FBRyxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLENBQXJCLEVBQXdCLEdBQXhCLENBQTRCLFVBQUMsQ0FBRDtBQUFBLFlBQU8sRUFBRSxDQUFUO0FBQUEsS0FBNUIsQ0FGTTtBQUdULE9BQUcsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixDQUFyQixFQUF3QixHQUF4QixDQUE0QixVQUFDLENBQUQ7QUFBQSxZQUFPLEVBQUUsQ0FBVDtBQUFBLEtBQTVCO0FBSE0sSUFBVjtBQUtBLE9BQUksSUFBSSxLQUFLLE1BQUwsQ0FBWSxVQUFaLENBQVI7QUFDQSxPQUFJLE1BQU0sSUFBVjtBQUNBLE9BQUksUUFBUSxJQUFJLGdCQUFNLEtBQVYsQ0FBZ0IsS0FBaEIsRUFDVixFQURVLENBQ1AsR0FETyxFQUNGLENBREUsRUFFVixhQUZVLENBRUssZ0JBQU0sYUFBTixDQUFvQixVQUZ6QixFQUdWLFFBSFUsQ0FHRCxZQUFXO0FBQ3BCO0FBQ0EsUUFBSSxTQUFTLEtBQUssUUFBTCxDQUFjLEtBQWQsRUFBYjtBQUNBLFFBQUksU0FBUyxJQUFJLE1BQU0sT0FBVixDQUFrQixLQUFLLENBQXZCLEVBQTBCLEtBQUssQ0FBL0IsRUFBa0MsS0FBSyxDQUF2QyxDQUFiO0FBQ0EsUUFBSSxNQUFNLE9BQU8sR0FBUCxDQUFXLE1BQVgsRUFBbUIsU0FBbkIsRUFBVjtBQUNBLFFBQUksT0FBTyxJQUFJLE1BQU0sT0FBVixDQUFrQixDQUFsQixFQUFxQixDQUFyQixFQUF3QixDQUF4QixDQUFYO0FBQ0EsUUFBSSxTQUFTLElBQUksV0FBSixDQUFnQixFQUFoQixDQUFiO0FBQ0EsU0FBSyxRQUFMLENBQWMsR0FBZCxDQUFrQixLQUFLLENBQUwsR0FBUyxPQUFPLENBQWxDLEVBQXFDLEtBQUssQ0FBTCxHQUFTLE9BQU8sQ0FBckQsRUFBd0QsS0FBSyxDQUFMLEdBQVMsT0FBTyxDQUF4RTtBQUNBO0FBQ0EsU0FBSyxVQUFMLENBQWdCLGtCQUFoQixDQUFtQyxJQUFuQyxFQUF5QyxHQUF6QztBQUNBLElBYlUsRUFjVixVQWRVLENBY0MsWUFBVztBQUN0QixXQUFPLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBUDtBQUNBLFFBQUksSUFBSSxNQUFKLENBQVcsYUFBWCxDQUFKLEVBQStCLElBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsSUFBakI7QUFDL0IsSUFqQlUsRUFrQlYsTUFsQlUsQ0FrQkg7QUFBQSxXQUFNLE9BQU8sSUFBSSxNQUFKLENBQVcsRUFBWCxDQUFiO0FBQUEsSUFsQkcsRUFtQlYsS0FuQlUsRUFBWjtBQW9CQSxRQUFLLE1BQUwsQ0FBWSxFQUFaLElBQWtCLEtBQWxCO0FBQ0E7OzttQ0FFZ0IsRSxFQUFJO0FBQ3BCLE9BQUksS0FBSyxNQUFMLENBQVksRUFBWixDQUFKLEVBQXFCLEtBQUssTUFBTCxDQUFZLEVBQVosRUFBZ0IsSUFBaEI7QUFDckIsT0FBSSxPQUFPLEtBQUssS0FBTCxDQUFXLEVBQVgsQ0FBWDtBQUNBLE9BQUksSUFBSixFQUFVLEtBQUssS0FBTCxDQUFXLE1BQVgsQ0FBa0IsSUFBbEI7QUFDVjs7O21DQUVnQixFLEVBQUksSyxFQUFPO0FBQzNCO0FBQ0E7Ozs7RUF6RmlDLGE7O0lBNEZ0QixnQixXQUFBLGdCOzs7QUFDWiwyQkFBWSxLQUFaLEVBQW1CLE9BQW5CLEVBQXdDO0FBQUEsTUFBWixPQUFZLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3ZDLFlBQVUsNEJBQU87QUFDaEIsU0FBTSxpQkFEVTtBQUVoQixjQUFXO0FBRkssR0FBUCxFQUdQLE9BSE8sQ0FBVjs7QUFEdUMsbUlBS2pDLEtBTGlDLEVBSzFCLE9BTDBCLEVBS2pCLE9BTGlCOztBQU12QyxTQUFLLE1BQUwsR0FBYyxTQUFTLGFBQVQsQ0FBdUIsUUFBdkIsQ0FBZDtBQUNBLFNBQUssTUFBTCxDQUFZLEtBQVosR0FBb0IsR0FBcEI7QUFDQSxTQUFLLE1BQUwsQ0FBWSxNQUFaLEdBQXFCLEdBQXJCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsT0FBSyxNQUFMLENBQVksVUFBWixDQUF1QixJQUF2QixDQUFmO0FBQ0EsU0FBSyxPQUFMLENBQWEsSUFBYixHQUFvQixPQUFLLE1BQUwsQ0FBWSxNQUFaLENBQXBCO0FBQ0EsU0FBSyxPQUFMLENBQWEsU0FBYixHQUF5QixPQUFLLE1BQUwsQ0FBWSxXQUFaLENBQXpCO0FBQ0EsU0FBSyxJQUFMLEdBQVksU0FBWjtBQVp1QztBQWF2Qzs7OzswQkFFTyxJLEVBQU07QUFDYixPQUFJLEtBQUssSUFBVCxFQUNDLEtBQUssS0FBTCxDQUFXLE1BQVgsQ0FBa0IsS0FBSyxJQUF2Qjs7QUFFRCxRQUFLLE9BQUwsQ0FBYSxTQUFiLENBQXVCLENBQXZCLEVBQTBCLENBQTFCLEVBQTZCLEtBQUssTUFBTCxDQUFZLEtBQXpDLEVBQWdELEtBQUssTUFBTCxDQUFZLE1BQTVEO0FBQ0EsUUFBSyxPQUFMLENBQWEsUUFBYixDQUFzQixJQUF0QixFQUE0QixDQUE1QixFQUErQixFQUEvQjtBQUNBLE9BQUksVUFBVSxJQUFJLE1BQU0sT0FBVixDQUFrQixLQUFLLE1BQXZCLENBQWQ7QUFDQSxXQUFRLFdBQVIsR0FBc0IsSUFBdEI7QUFDQSxPQUFJLFdBQVcsSUFBSSxNQUFNLGlCQUFWLENBQTRCLEVBQUUsS0FBSyxPQUFQLEVBQWdCLE1BQU0sTUFBTSxVQUE1QixFQUE1QixDQUFmO0FBQ0EsWUFBUyxXQUFULEdBQXVCLElBQXZCO0FBQ0EsUUFBSyxJQUFMLEdBQVksSUFBSSxNQUFNLElBQVYsQ0FDWCxJQUFJLE1BQU0sYUFBVixDQUF3QixLQUFLLE1BQUwsQ0FBWSxLQUFaLEdBQW9CLEVBQTVDLEVBQWdELEtBQUssTUFBTCxDQUFZLE1BQVosR0FBcUIsRUFBckUsQ0FEVyxFQUVYLFFBRlcsQ0FBWjtBQUlBLFFBQUssSUFBTCxDQUFVLFFBQVYsQ0FBbUIsR0FBbkIsQ0FBdUIsS0FBSyxNQUFMLENBQVksR0FBWixDQUF2QixFQUF5QyxLQUFLLE1BQUwsQ0FBWSxHQUFaLENBQXpDLEVBQTJELEtBQUssTUFBTCxDQUFZLEdBQVosQ0FBM0Q7QUFDQSxRQUFLLEtBQUwsQ0FBVyxHQUFYLENBQWUsS0FBSyxJQUFwQjtBQUNBOzs7O0VBaENvQyxTOztJQW1DekIsa0IsV0FBQSxrQjs7Ozs7Ozs7OztFQUEyQixTOztJQUlsQyxTO0FBQ0wsc0JBQWdEO0FBQUEsTUFBcEMsRUFBb0MsdUVBQWpDLENBQWlDO0FBQUEsTUFBOUIsRUFBOEIsdUVBQTNCLENBQTJCO0FBQUEsTUFBeEIsRUFBd0IsdUVBQXJCLENBQXFCO0FBQUEsTUFBbEIsRUFBa0IsdUVBQWYsQ0FBZTtBQUFBLE1BQVosRUFBWSx1RUFBVCxDQUFTO0FBQUEsTUFBTixFQUFNLHVFQUFILENBQUc7O0FBQUE7O0FBQy9DLE1BQUksT0FBTyxFQUFQLElBQWMsUUFBbEIsRUFBNEI7QUFDM0IsUUFBSyxFQUFMLEdBQVUsRUFBVjtBQUNBLFFBQUssRUFBTCxHQUFVLEVBQVY7QUFDQSxRQUFLLEVBQUwsR0FBVSxFQUFWO0FBQ0EsUUFBSyxFQUFMLEdBQVUsRUFBVjtBQUNBLFFBQUssRUFBTCxHQUFVLEVBQVY7QUFDQSxRQUFLLEVBQUwsR0FBVSxFQUFWO0FBQ0E7QUFDRDs7Ozt5QkFFTSxDLEVBQUc7QUFDVCxVQUFPLEtBQUssRUFBTCxJQUFTLElBQUksS0FBSyxFQUFsQixDQUFQO0FBQ0E7Ozt5QkFFTSxDLEVBQUc7QUFDVCxVQUFPLEtBQUssRUFBTCxJQUFTLElBQUksS0FBSyxFQUFsQixDQUFQO0FBQ0E7Ozt5QkFFTSxDLEVBQUc7QUFDVCxVQUFPLEtBQUssRUFBTCxJQUFTLElBQUksS0FBSyxFQUFsQixDQUFQO0FBQ0E7Ozs7Ozs7QUNyZUY7O0FBRUE7Ozs7Ozs7UUFrQ2dCLFMsR0FBQSxTO1FBNENBLGMsR0FBQSxjO1FBZUEsTyxHQUFBLE87UUFvQkEsUSxHQUFBLFE7O0FBN0doQjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFJQTs7QUFRQTs7QUFDQTs7OztBQU1BLElBQUksYUFBYSxFQUFqQjtBQUNBLElBQUksYUFBYSxDQUFqQjtBQUNBLElBQUksU0FBSjs7QUFFQTs7OztBQUlPLFNBQVMsU0FBVCxHQUFxQjtBQUMzQixLQUFNLFFBQVEsSUFBSSxNQUFNLEtBQVYsRUFBZDtBQUNBLEtBQU0sU0FBUyxJQUFJLE1BQU0saUJBQVYsQ0FBNkIsRUFBN0IsRUFBaUMsT0FBTyxVQUFQLEdBQW9CLE9BQU8sV0FBNUQsRUFBeUUsQ0FBekUsRUFBNEUsS0FBNUUsQ0FBZjtBQUNBLFFBQU8sUUFBUCxDQUFnQixDQUFoQixHQUFvQixFQUFwQjs7QUFFQTtBQUNBO0FBQ0EsS0FBTSxpQkFBaUIsSUFBSSxNQUFNLFVBQVYsQ0FBcUIsTUFBckIsQ0FBdkI7QUFDQSxnQkFBZSxRQUFmLEdBQTBCLElBQTFCOztBQUVBO0FBQ0E7QUFDQSxLQUFNLFdBQVcsSUFBSSxNQUFNLGFBQVYsRUFBakI7QUFDQSxVQUFTLE9BQVQsQ0FBa0IsT0FBTyxVQUF6QixFQUFxQyxPQUFPLFdBQTVDO0FBQ0EsVUFBUyxhQUFULENBQXVCLE9BQU8sZ0JBQTlCO0FBQ0csVUFBUyxJQUFULENBQWMsV0FBZCxDQUEyQixTQUFTLFVBQXBDOztBQUVBO0FBQ0E7QUFDQSxLQUFNLFNBQVMsSUFBSSxNQUFNLFFBQVYsQ0FBbUIsUUFBbkIsQ0FBZjtBQUNILFFBQU8sT0FBUCxDQUFnQixPQUFPLFVBQXZCLEVBQW1DLE9BQU8sV0FBMUM7O0FBRUE7QUFDQTtBQUNBLEtBQU0sVUFBVSxJQUFJLFlBQUosQ0FBaUIsUUFBakIsRUFBMkIsTUFBM0IsQ0FBaEI7O0FBRUEsS0FBSSxXQUFXLFNBQVgsUUFBVyxDQUFTLENBQVQsRUFBWTtBQUN6QixTQUFPLE9BQVAsQ0FBZSxPQUFPLFVBQXRCLEVBQWtDLE9BQU8sV0FBekM7QUFDQSxTQUFPLE1BQVAsR0FBZ0IsT0FBTyxVQUFQLEdBQW9CLE9BQU8sV0FBM0M7QUFDQSxTQUFPLHNCQUFQO0FBQ0QsRUFKRDs7QUFNQSxRQUFPLGdCQUFQLENBQXdCLFFBQXhCLEVBQWtDLFFBQWxDLEVBQTRDLElBQTVDO0FBQ0EsUUFBTyxnQkFBUCxDQUF3Qix3QkFBeEIsRUFBa0QsUUFBbEQsRUFBNEQsSUFBNUQ7O0FBRUc7QUFDQTtBQUNILE9BQU0sS0FBTixHQUFjLHVCQUFhLE1BQWIsRUFBcUIsU0FBUyxVQUE5QixDQUFkO0FBQ0EsT0FBTSxLQUFOLENBQVksT0FBWixDQUFvQixTQUFTLE9BQVQsRUFBcEI7QUFDQSxPQUFNLEdBQU4sQ0FBVSxNQUFNLEtBQU4sQ0FBWSxPQUFaLEVBQVY7O0FBRUcsUUFBTyxFQUFFLFlBQUYsRUFBUyxjQUFULEVBQWlCLGdCQUFqQixFQUEwQixjQUExQixFQUFrQyw4QkFBbEMsRUFBUDtBQUNIOztBQUVNLFNBQVMsY0FBVCxHQUEwQjtBQUNoQztBQUNBLFdBQVUsYUFBVixHQUEwQixJQUExQixDQUErQixVQUFTLFFBQVQsRUFBbUI7QUFDOUMsTUFBSSxTQUFTLE1BQVQsR0FBa0IsQ0FBdEIsRUFBeUI7QUFDdEIsZUFBWSxTQUFTLENBQVQsQ0FBWjtBQUNBLGFBQVUscUJBQVYsQ0FBZ0MsT0FBaEM7QUFDRjtBQUNKLEVBTEQ7QUFNQTs7QUFFRDs7Ozs7QUFLTyxTQUFTLE9BQVQsQ0FBaUIsU0FBakIsRUFBNEI7QUFDbEMsS0FBSSxDQUFFLFNBQU4sRUFBaUIsWUFBWSxLQUFLLEdBQUwsRUFBWjtBQUNqQixLQUFJLFFBQVEsS0FBSyxHQUFMLENBQVMsWUFBWSxVQUFyQixFQUFpQyxHQUFqQyxDQUFaO0FBQ0UsY0FBYSxTQUFiOztBQUhnQztBQUFBO0FBQUE7O0FBQUE7QUFLaEMsdUJBQWMsVUFBZCw4SEFBMEI7QUFBQSxPQUFqQixDQUFpQjs7QUFDM0IsS0FBRSxLQUFGO0FBQ0U7QUFQK0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFRaEMsaUJBQU0sTUFBTjtBQUNGLE9BQU0sS0FBTixDQUFZLE1BQVo7QUFDRyxnQkFBZSxNQUFmO0FBQ0EsU0FBUSxNQUFSLENBQWdCLEtBQWhCLEVBQXVCLE1BQXZCLEVBQStCLFNBQS9COztBQUVBLFdBQVUscUJBQVYsQ0FBaUMsT0FBakM7QUFDSDs7QUFFRDs7OztBQUlPLFNBQVMsUUFBVCxDQUFrQixTQUFsQixFQUE2QjtBQUNuQyxZQUFXLElBQVgsQ0FBZ0IsU0FBaEI7QUFDQTs7QUFFRCxPQUFPLE9BQVAsR0FBaUI7QUFDaEIsMEJBRGdCO0FBRWhCLDRDQUZnQjtBQUdoQixnQ0FIZ0I7QUFJaEIsd0NBSmdCO0FBS2hCLDRDQUxnQjtBQU1oQiw4Q0FOZ0I7QUFPaEIsd0NBUGdCO0FBUWhCLDhDQVJnQjtBQVNoQixZQUFXLFNBVEs7QUFVaEIsVUFBUyxPQVZPO0FBV2hCLG1DQVhnQjtBQVloQix1Q0FaZ0I7QUFhaEIsV0FBVSxRQWJNO0FBY2hCLCtCQWRnQjtBQWVoQixRQUFPO0FBQ04sMkJBRE07QUFFTiwrQ0FGTTtBQUdOO0FBSE07QUFmUyxDQUFqQjs7O0FDdkhBOzs7OztRQUtnQixVLEdBQUEsVTtRQW9CQSxNLEdBQUEsTTtRQWlDQSxRLEdBQUEsUTtRQUlBLGtCLEdBQUEsa0I7UUFTQSxnQixHQUFBLGdCOztBQXJFaEI7Ozs7OztBQUVBO0FBQ08sU0FBUyxVQUFULENBQW9CLE9BQXBCLEVBQTZCOztBQUVsQyxNQUFJLHFCQUFxQixDQUF6Qjs7QUFFQSxLQUFHOztBQUVELFFBQUksTUFBTSxLQUFLLEtBQUwsQ0FBVyxPQUFPO0FBQzFCLFlBQU0sUUFBUSxJQURZO0FBRTFCLFdBQUssUUFBUTtBQUZhLEtBQVAsQ0FBWCxDQUFWOztBQUtBLFFBQUksTUFBTSxRQUFRLElBQVIsQ0FBYSxNQUFuQixJQUE2QixPQUFPLENBQXhDLEVBQTJDO0FBQ3pDLGFBQU8sUUFBUSxJQUFSLENBQWEsR0FBYixDQUFQO0FBQ0QsS0FGRCxNQUVPO0FBQ0w7QUFDRDtBQUVGLEdBYkQsUUFhUyxxQkFBcUIsR0FiOUI7QUFjRDs7QUFFTSxTQUFTLE1BQVQsQ0FBZ0IsT0FBaEIsRUFBeUI7O0FBRTlCLFlBQVUsNEJBQU8sRUFBRSxNQUFNLENBQVIsRUFBVyxLQUFLLENBQWhCLEVBQW1CLE1BQU0sRUFBekIsRUFBUCxFQUFzQyxPQUF0QyxDQUFWOztBQUVBO0FBQ0E7QUFDQSxNQUFJLE1BQU0sT0FBTixDQUFjLFFBQVEsSUFBdEIsS0FBK0IsUUFBUSxJQUFSLENBQWEsTUFBYixHQUFzQixDQUF6RCxFQUE0RDtBQUMxRCxXQUFPLFdBQVcsT0FBWCxDQUFQO0FBQ0Q7O0FBRUQ7QUFDQSxNQUFJLENBQUo7QUFDQSxNQUFJLENBQUo7QUFDQSxNQUFJLENBQUo7QUFDQSxNQUFJLElBQUo7QUFDQSxNQUFJLE9BQU8sUUFBUSxJQUFuQjtBQUNBLE1BQUksTUFBTyxRQUFRLEdBQW5COztBQUVBLEtBQUc7QUFDRDtBQUNBLFFBQUksS0FBSyxNQUFMLEtBQWdCLENBQWhCLEdBQW9CLENBQXhCO0FBQ0EsUUFBSSxLQUFLLE1BQUwsS0FBZ0IsQ0FBaEIsR0FBb0IsQ0FBeEI7O0FBRUEsUUFBSSxJQUFJLENBQUosR0FBUSxJQUFJLENBQWhCO0FBQ0QsR0FORCxRQU1TLEtBQUssQ0FOZDs7QUFRQTtBQUNBLFNBQU8sSUFBSSxLQUFLLElBQUwsQ0FBVSxDQUFDLENBQUQsR0FBSyxLQUFLLEdBQUwsQ0FBUyxDQUFULENBQUwsR0FBbUIsQ0FBN0IsQ0FBWDs7QUFFQTtBQUNBLFNBQU8sTUFBTSxJQUFOLEdBQWEsSUFBcEI7QUFDRDs7QUFFTSxTQUFTLFFBQVQsQ0FBa0IsR0FBbEIsRUFBdUI7QUFDNUIsU0FBTyxNQUFNLEtBQUssRUFBWCxHQUFnQixHQUF2QjtBQUNEOztBQUVNLFNBQVMsa0JBQVQsQ0FBNEIsR0FBNUIsRUFBaUMsSUFBakMsRUFBMEQ7QUFBQSxNQUFuQixDQUFtQix1RUFBakIsQ0FBaUI7QUFBQSxNQUFkLE9BQWMsdUVBQU4sSUFBTTs7QUFDL0QsTUFBSSxTQUFTLFNBQVMsR0FBVCxDQUFiO0FBQ0EsTUFBSSxVQUFVLFVBQVUsU0FBUyxDQUFDLElBQVYsQ0FBVixHQUE0QixTQUFTLElBQVQsQ0FBMUM7QUFDQSxNQUFJLElBQUksSUFBSSxLQUFLLEdBQUwsQ0FBUyxNQUFULENBQUosR0FBdUIsS0FBSyxHQUFMLENBQVMsT0FBVCxDQUEvQjtBQUNBLE1BQUksSUFBSSxJQUFJLEtBQUssR0FBTCxDQUFTLE1BQVQsQ0FBSixHQUF1QixLQUFLLEdBQUwsQ0FBUyxPQUFULENBQS9CO0FBQ0EsTUFBSSxJQUFJLElBQUksS0FBSyxHQUFMLENBQVMsTUFBVCxDQUFaO0FBQ0EsU0FBTyxFQUFDLElBQUQsRUFBSSxJQUFKLEVBQU8sSUFBUCxFQUFQO0FBQ0Q7O0FBRU0sU0FBUyxnQkFBVCxDQUEwQixHQUExQixFQUErQixFQUEvQixFQUFtQztBQUN4QyxNQUFJLE1BQU0sSUFBSSxjQUFKLEVBQVY7QUFDQSxNQUFJLElBQUosQ0FBUyxLQUFULEVBQWdCLEdBQWhCO0FBQ0EsTUFBSSxJQUFKLENBQVMsSUFBVDtBQUNBLE1BQUksa0JBQUosR0FBeUIsWUFBVztBQUNsQyxRQUFJLElBQUksVUFBSixLQUFtQixDQUFuQixJQUF3QixJQUFJLE1BQUosS0FBZSxHQUEzQyxFQUFnRDtBQUM5QyxTQUFHLEtBQUssS0FBTCxDQUFXLElBQUksWUFBZixDQUFIO0FBQ0Q7QUFDRixHQUpEO0FBS0QiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaXMgbm90IGRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vL1xuLy8gV2Ugc3RvcmUgb3VyIEVFIG9iamVjdHMgaW4gYSBwbGFpbiBvYmplY3Qgd2hvc2UgcHJvcGVydGllcyBhcmUgZXZlbnQgbmFtZXMuXG4vLyBJZiBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgbm90IHN1cHBvcnRlZCB3ZSBwcmVmaXggdGhlIGV2ZW50IG5hbWVzIHdpdGggYVxuLy8gYH5gIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBidWlsdC1pbiBvYmplY3QgcHJvcGVydGllcyBhcmUgbm90IG92ZXJyaWRkZW4gb3Jcbi8vIHVzZWQgYXMgYW4gYXR0YWNrIHZlY3Rvci5cbi8vIFdlIGFsc28gYXNzdW1lIHRoYXQgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIGF2YWlsYWJsZSB3aGVuIHRoZSBldmVudCBuYW1lXG4vLyBpcyBhbiBFUzYgU3ltYm9sLlxuLy9cbnZhciBwcmVmaXggPSB0eXBlb2YgT2JqZWN0LmNyZWF0ZSAhPT0gJ2Z1bmN0aW9uJyA/ICd+JyA6IGZhbHNlO1xuXG4vKipcbiAqIFJlcHJlc2VudGF0aW9uIG9mIGEgc2luZ2xlIEV2ZW50RW1pdHRlciBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBFdmVudCBoYW5kbGVyIHRvIGJlIGNhbGxlZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgQ29udGV4dCBmb3IgZnVuY3Rpb24gZXhlY3V0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb25jZT1mYWxzZV0gT25seSBlbWl0IG9uY2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFRShmbiwgY29udGV4dCwgb25jZSkge1xuICB0aGlzLmZuID0gZm47XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMub25jZSA9IG9uY2UgfHwgZmFsc2U7XG59XG5cbi8qKlxuICogTWluaW1hbCBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7IC8qIE5vdGhpbmcgdG8gc2V0ICovIH1cblxuLyoqXG4gKiBIb2xkIHRoZSBhc3NpZ25lZCBFdmVudEVtaXR0ZXJzIGJ5IG5hbWUuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXR1cm4gYW4gYXJyYXkgbGlzdGluZyB0aGUgZXZlbnRzIGZvciB3aGljaCB0aGUgZW1pdHRlciBoYXMgcmVnaXN0ZXJlZFxuICogbGlzdGVuZXJzLlxuICpcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uIGV2ZW50TmFtZXMoKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNcbiAgICAsIG5hbWVzID0gW11cbiAgICAsIG5hbWU7XG5cbiAgaWYgKCFldmVudHMpIHJldHVybiBuYW1lcztcblxuICBmb3IgKG5hbWUgaW4gZXZlbnRzKSB7XG4gICAgaWYgKGhhcy5jYWxsKGV2ZW50cywgbmFtZSkpIG5hbWVzLnB1c2gocHJlZml4ID8gbmFtZS5zbGljZSgxKSA6IG5hbWUpO1xuICB9XG5cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgICByZXR1cm4gbmFtZXMuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZXZlbnRzKSk7XG4gIH1cblxuICByZXR1cm4gbmFtZXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhIGxpc3Qgb2YgYXNzaWduZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnRzIHRoYXQgc2hvdWxkIGJlIGxpc3RlZC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXhpc3RzIFdlIG9ubHkgbmVlZCB0byBrbm93IGlmIHRoZXJlIGFyZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7QXJyYXl8Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50LCBleGlzdHMpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRcbiAgICAsIGF2YWlsYWJsZSA9IHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbZXZ0XTtcblxuICBpZiAoZXhpc3RzKSByZXR1cm4gISFhdmFpbGFibGU7XG4gIGlmICghYXZhaWxhYmxlKSByZXR1cm4gW107XG4gIGlmIChhdmFpbGFibGUuZm4pIHJldHVybiBbYXZhaWxhYmxlLmZuXTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF2YWlsYWJsZS5sZW5ndGgsIGVlID0gbmV3IEFycmF5KGwpOyBpIDwgbDsgaSsrKSB7XG4gICAgZWVbaV0gPSBhdmFpbGFibGVbaV0uZm47XG4gIH1cblxuICByZXR1cm4gZWU7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGlvbiBpZiB3ZSd2ZSBlbWl0dGVkIGFuIGV2ZW50LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldmVudCwgYTEsIGEyLCBhMywgYTQsIGE1KSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnc1xuICAgICwgaTtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGxpc3RlbmVycy5mbikge1xuICAgIGlmIChsaXN0ZW5lcnMub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgc3dpdGNoIChsZW4pIHtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgMjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSksIHRydWU7XG4gICAgICBjYXNlIDM6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCksIHRydWU7XG4gICAgICBjYXNlIDY6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQsIGE1KSwgdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLmZuLmFwcGx5KGxpc3RlbmVycy5jb250ZXh0LCBhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgICAgLCBqO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobGlzdGVuZXJzW2ldLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyc1tpXS5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgICAgc3dpdGNoIChsZW4pIHtcbiAgICAgICAgY2FzZSAxOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCk7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSk7IGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSwgYTIpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoIWFyZ3MpIGZvciAoaiA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIG5ldyBFdmVudExpc3RlbmVyIGZvciB0aGUgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyO1xuICBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW1xuICAgICAgdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYW4gRXZlbnRMaXN0ZW5lciB0aGF0J3Mgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UoZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzLCB0cnVlKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyO1xuICBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW1xuICAgICAgdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2Ugd2FudCB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgdGhhdCB3ZSBuZWVkIHRvIGZpbmQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IE9ubHkgcmVtb3ZlIGxpc3RlbmVycyBtYXRjaGluZyB0aGlzIGNvbnRleHQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9uY2UgT25seSByZW1vdmUgb25jZSBsaXN0ZW5lcnMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBldmVudHMgPSBbXTtcblxuICBpZiAoZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgICBpZiAoXG4gICAgICAgICAgIGxpc3RlbmVycy5mbiAhPT0gZm5cbiAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVycy5vbmNlKVxuICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnMuY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICkge1xuICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4gIT09IGZuXG4gICAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVyc1tpXS5vbmNlKVxuICAgICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVyc1tpXS5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgICApIHtcbiAgICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAvL1xuICBpZiAoZXZlbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2V2ZW50c1tldnRdID0gZXZlbnRzLmxlbmd0aCA9PT0gMSA/IGV2ZW50c1swXSA6IGV2ZW50cztcbiAgfSBlbHNlIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgb3Igb25seSB0aGUgbGlzdGVuZXJzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2FudCB0byByZW1vdmUgYWxsIGxpc3RlbmVycyBmb3IuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG5cbiAgaWYgKGV2ZW50KSBkZWxldGUgdGhpcy5fZXZlbnRzW3ByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRdO1xuICBlbHNlIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBBbGlhcyBtZXRob2RzIG5hbWVzIGJlY2F1c2UgcGVvcGxlIHJvbGwgbGlrZSB0aGF0LlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiBkb2Vzbid0IGFwcGx5IGFueW1vcmUuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEV4cG9zZSB0aGUgcHJlZml4LlxuLy9cbkV2ZW50RW1pdHRlci5wcmVmaXhlZCA9IHByZWZpeDtcblxuLy9cbi8vIEV4cG9zZSB0aGUgbW9kdWxlLlxuLy9cbmlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFVzZU5hdGl2ZSgpIHtcblx0dHJ5IHtcblx0XHRpZiAoIU9iamVjdC5hc3NpZ24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBEZXRlY3QgYnVnZ3kgcHJvcGVydHkgZW51bWVyYXRpb24gb3JkZXIgaW4gb2xkZXIgVjggdmVyc2lvbnMuXG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTE4XG5cdFx0dmFyIHRlc3QxID0gbmV3IFN0cmluZygnYWJjJyk7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cdFx0dGVzdDFbNV0gPSAnZGUnO1xuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDIgPSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcblx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcblx0XHR9XG5cdFx0dmFyIG9yZGVyMiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24gKG4pIHtcblx0XHRcdHJldHVybiB0ZXN0MltuXTtcblx0XHR9KTtcblx0XHRpZiAob3JkZXIyLmpvaW4oJycpICE9PSAnMDEyMzQ1Njc4OScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QzID0ge307XG5cdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG5cdFx0XHR0ZXN0M1tsZXR0ZXJdID0gbGV0dGVyO1xuXHRcdH0pO1xuXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuXHRcdFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQvLyBXZSBkb24ndCBleHBlY3QgYW55IG9mIHRoZSBhYm92ZSB0byB0aHJvdywgYnV0IGJldHRlciB0byBiZSBzYWZlLlxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNob3VsZFVzZU5hdGl2ZSgpID8gT2JqZWN0LmFzc2lnbiA6IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsIi8qIVxuXHRQYXBhIFBhcnNlXG5cdHY0LjEuMlxuXHRodHRwczovL2dpdGh1Yi5jb20vbWhvbHQvUGFwYVBhcnNlXG4qL1xuKGZ1bmN0aW9uKGdsb2JhbClcbntcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0dmFyIElTX1dPUktFUiA9ICFnbG9iYWwuZG9jdW1lbnQgJiYgISFnbG9iYWwucG9zdE1lc3NhZ2UsXG5cdFx0SVNfUEFQQV9XT1JLRVIgPSBJU19XT1JLRVIgJiYgLyhcXD98JilwYXBhd29ya2VyKD18JnwkKS8udGVzdChnbG9iYWwubG9jYXRpb24uc2VhcmNoKSxcblx0XHRMT0FERURfU1lOQyA9IGZhbHNlLCBBVVRPX1NDUklQVF9QQVRIO1xuXHR2YXIgd29ya2VycyA9IHt9LCB3b3JrZXJJZENvdW50ZXIgPSAwO1xuXG5cdHZhciBQYXBhID0ge307XG5cblx0UGFwYS5wYXJzZSA9IENzdlRvSnNvbjtcblx0UGFwYS51bnBhcnNlID0gSnNvblRvQ3N2O1xuXG5cdFBhcGEuUkVDT1JEX1NFUCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMzApO1xuXHRQYXBhLlVOSVRfU0VQID0gU3RyaW5nLmZyb21DaGFyQ29kZSgzMSk7XG5cdFBhcGEuQllURV9PUkRFUl9NQVJLID0gXCJcXHVmZWZmXCI7XG5cdFBhcGEuQkFEX0RFTElNSVRFUlMgPSBbXCJcXHJcIiwgXCJcXG5cIiwgXCJcXFwiXCIsIFBhcGEuQllURV9PUkRFUl9NQVJLXTtcblx0UGFwYS5XT1JLRVJTX1NVUFBPUlRFRCA9ICFJU19XT1JLRVIgJiYgISFnbG9iYWwuV29ya2VyO1xuXHRQYXBhLlNDUklQVF9QQVRIID0gbnVsbDtcdC8vIE11c3QgYmUgc2V0IGJ5IHlvdXIgY29kZSBpZiB5b3UgdXNlIHdvcmtlcnMgYW5kIHRoaXMgbGliIGlzIGxvYWRlZCBhc3luY2hyb25vdXNseVxuXG5cdC8vIENvbmZpZ3VyYWJsZSBjaHVuayBzaXplcyBmb3IgbG9jYWwgYW5kIHJlbW90ZSBmaWxlcywgcmVzcGVjdGl2ZWx5XG5cdFBhcGEuTG9jYWxDaHVua1NpemUgPSAxMDI0ICogMTAyNCAqIDEwO1x0Ly8gMTAgTUJcblx0UGFwYS5SZW1vdGVDaHVua1NpemUgPSAxMDI0ICogMTAyNCAqIDU7XHQvLyA1IE1CXG5cdFBhcGEuRGVmYXVsdERlbGltaXRlciA9IFwiLFwiO1x0XHRcdC8vIFVzZWQgaWYgbm90IHNwZWNpZmllZCBhbmQgZGV0ZWN0aW9uIGZhaWxzXG5cblx0Ly8gRXhwb3NlZCBmb3IgdGVzdGluZyBhbmQgZGV2ZWxvcG1lbnQgb25seVxuXHRQYXBhLlBhcnNlciA9IFBhcnNlcjtcblx0UGFwYS5QYXJzZXJIYW5kbGUgPSBQYXJzZXJIYW5kbGU7XG5cdFBhcGEuTmV0d29ya1N0cmVhbWVyID0gTmV0d29ya1N0cmVhbWVyO1xuXHRQYXBhLkZpbGVTdHJlYW1lciA9IEZpbGVTdHJlYW1lcjtcblx0UGFwYS5TdHJpbmdTdHJlYW1lciA9IFN0cmluZ1N0cmVhbWVyO1xuXG5cdGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cylcblx0e1xuXHRcdC8vIEV4cG9ydCB0byBOb2RlLi4uXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBQYXBhO1xuXHR9XG5cdGVsc2UgaWYgKGlzRnVuY3Rpb24oZ2xvYmFsLmRlZmluZSkgJiYgZ2xvYmFsLmRlZmluZS5hbWQpXG5cdHtcblx0XHQvLyBXaXJldXAgd2l0aCBSZXF1aXJlSlNcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBQYXBhOyB9KTtcblx0fVxuXHRlbHNlXG5cdHtcblx0XHQvLyAuLi5vciBhcyBicm93c2VyIGdsb2JhbFxuXHRcdGdsb2JhbC5QYXBhID0gUGFwYTtcblx0fVxuXG5cdGlmIChnbG9iYWwualF1ZXJ5KVxuXHR7XG5cdFx0dmFyICQgPSBnbG9iYWwualF1ZXJ5O1xuXHRcdCQuZm4ucGFyc2UgPSBmdW5jdGlvbihvcHRpb25zKVxuXHRcdHtcblx0XHRcdHZhciBjb25maWcgPSBvcHRpb25zLmNvbmZpZyB8fCB7fTtcblx0XHRcdHZhciBxdWV1ZSA9IFtdO1xuXG5cdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oaWR4KVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgc3VwcG9ydGVkID0gJCh0aGlzKS5wcm9wKCd0YWdOYW1lJykudG9VcHBlckNhc2UoKSA9PSBcIklOUFVUXCJcblx0XHRcdFx0XHRcdFx0XHQmJiAkKHRoaXMpLmF0dHIoJ3R5cGUnKS50b0xvd2VyQ2FzZSgpID09IFwiZmlsZVwiXG5cdFx0XHRcdFx0XHRcdFx0JiYgZ2xvYmFsLkZpbGVSZWFkZXI7XG5cblx0XHRcdFx0aWYgKCFzdXBwb3J0ZWQgfHwgIXRoaXMuZmlsZXMgfHwgdGhpcy5maWxlcy5sZW5ndGggPT0gMClcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcdC8vIGNvbnRpbnVlIHRvIG5leHQgaW5wdXQgZWxlbWVudFxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5maWxlcy5sZW5ndGg7IGkrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHF1ZXVlLnB1c2goe1xuXHRcdFx0XHRcdFx0ZmlsZTogdGhpcy5maWxlc1tpXSxcblx0XHRcdFx0XHRcdGlucHV0RWxlbTogdGhpcyxcblx0XHRcdFx0XHRcdGluc3RhbmNlQ29uZmlnOiAkLmV4dGVuZCh7fSwgY29uZmlnKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cGFyc2VOZXh0RmlsZSgpO1x0Ly8gYmVnaW4gcGFyc2luZ1xuXHRcdFx0cmV0dXJuIHRoaXM7XHRcdC8vIG1haW50YWlucyBjaGFpbmFiaWxpdHlcblxuXG5cdFx0XHRmdW5jdGlvbiBwYXJzZU5leHRGaWxlKClcblx0XHRcdHtcblx0XHRcdFx0aWYgKHF1ZXVlLmxlbmd0aCA9PSAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGlzRnVuY3Rpb24ob3B0aW9ucy5jb21wbGV0ZSkpXG5cdFx0XHRcdFx0XHRvcHRpb25zLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGYgPSBxdWV1ZVswXTtcblxuXHRcdFx0XHRpZiAoaXNGdW5jdGlvbihvcHRpb25zLmJlZm9yZSkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgcmV0dXJuZWQgPSBvcHRpb25zLmJlZm9yZShmLmZpbGUsIGYuaW5wdXRFbGVtKTtcblxuXHRcdFx0XHRcdGlmICh0eXBlb2YgcmV0dXJuZWQgPT09ICdvYmplY3QnKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChyZXR1cm5lZC5hY3Rpb24gPT0gXCJhYm9ydFwiKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRlcnJvcihcIkFib3J0RXJyb3JcIiwgZi5maWxlLCBmLmlucHV0RWxlbSwgcmV0dXJuZWQucmVhc29uKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1x0Ly8gQWJvcnRzIGFsbCBxdWV1ZWQgZmlsZXMgaW1tZWRpYXRlbHlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHJldHVybmVkLmFjdGlvbiA9PSBcInNraXBcIilcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0ZmlsZUNvbXBsZXRlKCk7XHQvLyBwYXJzZSB0aGUgbmV4dCBmaWxlIGluIHRoZSBxdWV1ZSwgaWYgYW55XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiByZXR1cm5lZC5jb25maWcgPT09ICdvYmplY3QnKVxuXHRcdFx0XHRcdFx0XHRmLmluc3RhbmNlQ29uZmlnID0gJC5leHRlbmQoZi5pbnN0YW5jZUNvbmZpZywgcmV0dXJuZWQuY29uZmlnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAocmV0dXJuZWQgPT0gXCJza2lwXCIpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZmlsZUNvbXBsZXRlKCk7XHQvLyBwYXJzZSB0aGUgbmV4dCBmaWxlIGluIHRoZSBxdWV1ZSwgaWYgYW55XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gV3JhcCB1cCB0aGUgdXNlcidzIGNvbXBsZXRlIGNhbGxiYWNrLCBpZiBhbnksIHNvIHRoYXQgb3VycyBhbHNvIGdldHMgZXhlY3V0ZWRcblx0XHRcdFx0dmFyIHVzZXJDb21wbGV0ZUZ1bmMgPSBmLmluc3RhbmNlQ29uZmlnLmNvbXBsZXRlO1xuXHRcdFx0XHRmLmluc3RhbmNlQ29uZmlnLmNvbXBsZXRlID0gZnVuY3Rpb24ocmVzdWx0cylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChpc0Z1bmN0aW9uKHVzZXJDb21wbGV0ZUZ1bmMpKVxuXHRcdFx0XHRcdFx0dXNlckNvbXBsZXRlRnVuYyhyZXN1bHRzLCBmLmZpbGUsIGYuaW5wdXRFbGVtKTtcblx0XHRcdFx0XHRmaWxlQ29tcGxldGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRQYXBhLnBhcnNlKGYuZmlsZSwgZi5pbnN0YW5jZUNvbmZpZyk7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGVycm9yKG5hbWUsIGZpbGUsIGVsZW0sIHJlYXNvbilcblx0XHRcdHtcblx0XHRcdFx0aWYgKGlzRnVuY3Rpb24ob3B0aW9ucy5lcnJvcikpXG5cdFx0XHRcdFx0b3B0aW9ucy5lcnJvcih7bmFtZTogbmFtZX0sIGZpbGUsIGVsZW0sIHJlYXNvbik7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGZpbGVDb21wbGV0ZSgpXG5cdFx0XHR7XG5cdFx0XHRcdHF1ZXVlLnNwbGljZSgwLCAxKTtcblx0XHRcdFx0cGFyc2VOZXh0RmlsZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cblx0aWYgKElTX1BBUEFfV09SS0VSKVxuXHR7XG5cdFx0Z2xvYmFsLm9ubWVzc2FnZSA9IHdvcmtlclRocmVhZFJlY2VpdmVkTWVzc2FnZTtcblx0fVxuXHRlbHNlIGlmIChQYXBhLldPUktFUlNfU1VQUE9SVEVEKVxuXHR7XG5cdFx0QVVUT19TQ1JJUFRfUEFUSCA9IGdldFNjcmlwdFBhdGgoKTtcblxuXHRcdC8vIENoZWNrIGlmIHRoZSBzY3JpcHQgd2FzIGxvYWRlZCBzeW5jaHJvbm91c2x5XG5cdFx0aWYgKCFkb2N1bWVudC5ib2R5KVxuXHRcdHtcblx0XHRcdC8vIEJvZHkgZG9lc24ndCBleGlzdCB5ZXQsIG11c3QgYmUgc3luY2hyb25vdXNcblx0XHRcdExPQURFRF9TWU5DID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdExPQURFRF9TWU5DID0gdHJ1ZTtcblx0XHRcdH0sIHRydWUpO1xuXHRcdH1cblx0fVxuXG5cblxuXG5cdGZ1bmN0aW9uIENzdlRvSnNvbihfaW5wdXQsIF9jb25maWcpXG5cdHtcblx0XHRfY29uZmlnID0gX2NvbmZpZyB8fCB7fTtcblxuXHRcdGlmIChfY29uZmlnLndvcmtlciAmJiBQYXBhLldPUktFUlNfU1VQUE9SVEVEKVxuXHRcdHtcblx0XHRcdHZhciB3ID0gbmV3V29ya2VyKCk7XG5cblx0XHRcdHcudXNlclN0ZXAgPSBfY29uZmlnLnN0ZXA7XG5cdFx0XHR3LnVzZXJDaHVuayA9IF9jb25maWcuY2h1bms7XG5cdFx0XHR3LnVzZXJDb21wbGV0ZSA9IF9jb25maWcuY29tcGxldGU7XG5cdFx0XHR3LnVzZXJFcnJvciA9IF9jb25maWcuZXJyb3I7XG5cblx0XHRcdF9jb25maWcuc3RlcCA9IGlzRnVuY3Rpb24oX2NvbmZpZy5zdGVwKTtcblx0XHRcdF9jb25maWcuY2h1bmsgPSBpc0Z1bmN0aW9uKF9jb25maWcuY2h1bmspO1xuXHRcdFx0X2NvbmZpZy5jb21wbGV0ZSA9IGlzRnVuY3Rpb24oX2NvbmZpZy5jb21wbGV0ZSk7XG5cdFx0XHRfY29uZmlnLmVycm9yID0gaXNGdW5jdGlvbihfY29uZmlnLmVycm9yKTtcblx0XHRcdGRlbGV0ZSBfY29uZmlnLndvcmtlcjtcdC8vIHByZXZlbnQgaW5maW5pdGUgbG9vcFxuXG5cdFx0XHR3LnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0aW5wdXQ6IF9pbnB1dCxcblx0XHRcdFx0Y29uZmlnOiBfY29uZmlnLFxuXHRcdFx0XHR3b3JrZXJJZDogdy5pZFxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgc3RyZWFtZXIgPSBudWxsO1xuXHRcdGlmICh0eXBlb2YgX2lucHV0ID09PSAnc3RyaW5nJylcblx0XHR7XG5cdFx0XHRpZiAoX2NvbmZpZy5kb3dubG9hZClcblx0XHRcdFx0c3RyZWFtZXIgPSBuZXcgTmV0d29ya1N0cmVhbWVyKF9jb25maWcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzdHJlYW1lciA9IG5ldyBTdHJpbmdTdHJlYW1lcihfY29uZmlnKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoKGdsb2JhbC5GaWxlICYmIF9pbnB1dCBpbnN0YW5jZW9mIEZpbGUpIHx8IF9pbnB1dCBpbnN0YW5jZW9mIE9iamVjdClcdC8vIC4uLlNhZmFyaS4gKHNlZSBpc3N1ZSAjMTA2KVxuXHRcdFx0c3RyZWFtZXIgPSBuZXcgRmlsZVN0cmVhbWVyKF9jb25maWcpO1xuXG5cdFx0cmV0dXJuIHN0cmVhbWVyLnN0cmVhbShfaW5wdXQpO1xuXHR9XG5cblxuXG5cblxuXG5cdGZ1bmN0aW9uIEpzb25Ub0NzdihfaW5wdXQsIF9jb25maWcpXG5cdHtcblx0XHR2YXIgX291dHB1dCA9IFwiXCI7XG5cdFx0dmFyIF9maWVsZHMgPSBbXTtcblxuXHRcdC8vIERlZmF1bHQgY29uZmlndXJhdGlvblxuXG5cdFx0LyoqIHdoZXRoZXIgdG8gc3Vycm91bmQgZXZlcnkgZGF0dW0gd2l0aCBxdW90ZXMgKi9cblx0XHR2YXIgX3F1b3RlcyA9IGZhbHNlO1xuXG5cdFx0LyoqIGRlbGltaXRpbmcgY2hhcmFjdGVyICovXG5cdFx0dmFyIF9kZWxpbWl0ZXIgPSBcIixcIjtcblxuXHRcdC8qKiBuZXdsaW5lIGNoYXJhY3RlcihzKSAqL1xuXHRcdHZhciBfbmV3bGluZSA9IFwiXFxyXFxuXCI7XG5cblx0XHR1bnBhY2tDb25maWcoKTtcblxuXHRcdGlmICh0eXBlb2YgX2lucHV0ID09PSAnc3RyaW5nJylcblx0XHRcdF9pbnB1dCA9IEpTT04ucGFyc2UoX2lucHV0KTtcblxuXHRcdGlmIChfaW5wdXQgaW5zdGFuY2VvZiBBcnJheSlcblx0XHR7XG5cdFx0XHRpZiAoIV9pbnB1dC5sZW5ndGggfHwgX2lucHV0WzBdIGluc3RhbmNlb2YgQXJyYXkpXG5cdFx0XHRcdHJldHVybiBzZXJpYWxpemUobnVsbCwgX2lucHV0KTtcblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBfaW5wdXRbMF0gPT09ICdvYmplY3QnKVxuXHRcdFx0XHRyZXR1cm4gc2VyaWFsaXplKG9iamVjdEtleXMoX2lucHV0WzBdKSwgX2lucHV0KTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodHlwZW9mIF9pbnB1dCA9PT0gJ29iamVjdCcpXG5cdFx0e1xuXHRcdFx0aWYgKHR5cGVvZiBfaW5wdXQuZGF0YSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdF9pbnB1dC5kYXRhID0gSlNPTi5wYXJzZShfaW5wdXQuZGF0YSk7XG5cblx0XHRcdGlmIChfaW5wdXQuZGF0YSBpbnN0YW5jZW9mIEFycmF5KVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIV9pbnB1dC5maWVsZHMpXG5cdFx0XHRcdFx0X2lucHV0LmZpZWxkcyA9IF9pbnB1dC5kYXRhWzBdIGluc3RhbmNlb2YgQXJyYXlcblx0XHRcdFx0XHRcdFx0XHRcdD8gX2lucHV0LmZpZWxkc1xuXHRcdFx0XHRcdFx0XHRcdFx0OiBvYmplY3RLZXlzKF9pbnB1dC5kYXRhWzBdKTtcblxuXHRcdFx0XHRpZiAoIShfaW5wdXQuZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KSAmJiB0eXBlb2YgX2lucHV0LmRhdGFbMF0gIT09ICdvYmplY3QnKVxuXHRcdFx0XHRcdF9pbnB1dC5kYXRhID0gW19pbnB1dC5kYXRhXTtcdC8vIGhhbmRsZXMgaW5wdXQgbGlrZSBbMSwyLDNdIG9yIFtcImFzZGZcIl1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHNlcmlhbGl6ZShfaW5wdXQuZmllbGRzIHx8IFtdLCBfaW5wdXQuZGF0YSB8fCBbXSk7XG5cdFx0fVxuXG5cdFx0Ly8gRGVmYXVsdCAoYW55IHZhbGlkIHBhdGhzIHNob3VsZCByZXR1cm4gYmVmb3JlIHRoaXMpXG5cdFx0dGhyb3cgXCJleGNlcHRpb246IFVuYWJsZSB0byBzZXJpYWxpemUgdW5yZWNvZ25pemVkIGlucHV0XCI7XG5cblxuXHRcdGZ1bmN0aW9uIHVucGFja0NvbmZpZygpXG5cdFx0e1xuXHRcdFx0aWYgKHR5cGVvZiBfY29uZmlnICE9PSAnb2JqZWN0Jylcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRpZiAodHlwZW9mIF9jb25maWcuZGVsaW1pdGVyID09PSAnc3RyaW5nJ1xuXHRcdFx0XHQmJiBfY29uZmlnLmRlbGltaXRlci5sZW5ndGggPT0gMVxuXHRcdFx0XHQmJiBQYXBhLkJBRF9ERUxJTUlURVJTLmluZGV4T2YoX2NvbmZpZy5kZWxpbWl0ZXIpID09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHRfZGVsaW1pdGVyID0gX2NvbmZpZy5kZWxpbWl0ZXI7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2YgX2NvbmZpZy5xdW90ZXMgPT09ICdib29sZWFuJ1xuXHRcdFx0XHR8fCBfY29uZmlnLnF1b3RlcyBpbnN0YW5jZW9mIEFycmF5KVxuXHRcdFx0XHRfcXVvdGVzID0gX2NvbmZpZy5xdW90ZXM7XG5cblx0XHRcdGlmICh0eXBlb2YgX2NvbmZpZy5uZXdsaW5lID09PSAnc3RyaW5nJylcblx0XHRcdFx0X25ld2xpbmUgPSBfY29uZmlnLm5ld2xpbmU7XG5cdFx0fVxuXG5cblx0XHQvKiogVHVybnMgYW4gb2JqZWN0J3Mga2V5cyBpbnRvIGFuIGFycmF5ICovXG5cdFx0ZnVuY3Rpb24gb2JqZWN0S2V5cyhvYmopXG5cdFx0e1xuXHRcdFx0aWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKVxuXHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHR2YXIga2V5cyA9IFtdO1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIG9iailcblx0XHRcdFx0a2V5cy5wdXNoKGtleSk7XG5cdFx0XHRyZXR1cm4ga2V5cztcblx0XHR9XG5cblx0XHQvKiogVGhlIGRvdWJsZSBmb3IgbG9vcCB0aGF0IGl0ZXJhdGVzIHRoZSBkYXRhIGFuZCB3cml0ZXMgb3V0IGEgQ1NWIHN0cmluZyBpbmNsdWRpbmcgaGVhZGVyIHJvdyAqL1xuXHRcdGZ1bmN0aW9uIHNlcmlhbGl6ZShmaWVsZHMsIGRhdGEpXG5cdFx0e1xuXHRcdFx0dmFyIGNzdiA9IFwiXCI7XG5cblx0XHRcdGlmICh0eXBlb2YgZmllbGRzID09PSAnc3RyaW5nJylcblx0XHRcdFx0ZmllbGRzID0gSlNPTi5wYXJzZShmaWVsZHMpO1xuXHRcdFx0aWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJylcblx0XHRcdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cblx0XHRcdHZhciBoYXNIZWFkZXIgPSBmaWVsZHMgaW5zdGFuY2VvZiBBcnJheSAmJiBmaWVsZHMubGVuZ3RoID4gMDtcblx0XHRcdHZhciBkYXRhS2V5ZWRCeUZpZWxkID0gIShkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpO1xuXG5cdFx0XHQvLyBJZiB0aGVyZSBhIGhlYWRlciByb3csIHdyaXRlIGl0IGZpcnN0XG5cdFx0XHRpZiAoaGFzSGVhZGVyKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChpID4gMClcblx0XHRcdFx0XHRcdGNzdiArPSBfZGVsaW1pdGVyO1xuXHRcdFx0XHRcdGNzdiArPSBzYWZlKGZpZWxkc1tpXSwgaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGRhdGEubGVuZ3RoID4gMClcblx0XHRcdFx0XHRjc3YgKz0gX25ld2xpbmU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRoZW4gd3JpdGUgb3V0IHRoZSBkYXRhXG5cdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBkYXRhLmxlbmd0aDsgcm93KyspXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBtYXhDb2wgPSBoYXNIZWFkZXIgPyBmaWVsZHMubGVuZ3RoIDogZGF0YVtyb3ddLmxlbmd0aDtcblxuXHRcdFx0XHRmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtYXhDb2w7IGNvbCsrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGNvbCA+IDApXG5cdFx0XHRcdFx0XHRjc3YgKz0gX2RlbGltaXRlcjtcblx0XHRcdFx0XHR2YXIgY29sSWR4ID0gaGFzSGVhZGVyICYmIGRhdGFLZXllZEJ5RmllbGQgPyBmaWVsZHNbY29sXSA6IGNvbDtcblx0XHRcdFx0XHRjc3YgKz0gc2FmZShkYXRhW3Jvd11bY29sSWR4XSwgY29sKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChyb3cgPCBkYXRhLmxlbmd0aCAtIDEpXG5cdFx0XHRcdFx0Y3N2ICs9IF9uZXdsaW5lO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY3N2O1xuXHRcdH1cblxuXHRcdC8qKiBFbmNsb3NlcyBhIHZhbHVlIGFyb3VuZCBxdW90ZXMgaWYgbmVlZGVkIChtYWtlcyBhIHZhbHVlIHNhZmUgZm9yIENTViBpbnNlcnRpb24pICovXG5cdFx0ZnVuY3Rpb24gc2FmZShzdHIsIGNvbClcblx0XHR7XG5cdFx0XHRpZiAodHlwZW9mIHN0ciA9PT0gXCJ1bmRlZmluZWRcIiB8fCBzdHIgPT09IG51bGwpXG5cdFx0XHRcdHJldHVybiBcIlwiO1xuXG5cdFx0XHRzdHIgPSBzdHIudG9TdHJpbmcoKS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpO1xuXG5cdFx0XHR2YXIgbmVlZHNRdW90ZXMgPSAodHlwZW9mIF9xdW90ZXMgPT09ICdib29sZWFuJyAmJiBfcXVvdGVzKVxuXHRcdFx0XHRcdFx0XHR8fCAoX3F1b3RlcyBpbnN0YW5jZW9mIEFycmF5ICYmIF9xdW90ZXNbY29sXSlcblx0XHRcdFx0XHRcdFx0fHwgaGFzQW55KHN0ciwgUGFwYS5CQURfREVMSU1JVEVSUylcblx0XHRcdFx0XHRcdFx0fHwgc3RyLmluZGV4T2YoX2RlbGltaXRlcikgPiAtMVxuXHRcdFx0XHRcdFx0XHR8fCBzdHIuY2hhckF0KDApID09ICcgJ1xuXHRcdFx0XHRcdFx0XHR8fCBzdHIuY2hhckF0KHN0ci5sZW5ndGggLSAxKSA9PSAnICc7XG5cblx0XHRcdHJldHVybiBuZWVkc1F1b3RlcyA/ICdcIicgKyBzdHIgKyAnXCInIDogc3RyO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhhc0FueShzdHIsIHN1YnN0cmluZ3MpXG5cdFx0e1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzdHJpbmdzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHRpZiAoc3RyLmluZGV4T2Yoc3Vic3RyaW5nc1tpXSkgPiAtMSlcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHQvKiogQ2h1bmtTdHJlYW1lciBpcyB0aGUgYmFzZSBwcm90b3R5cGUgZm9yIHZhcmlvdXMgc3RyZWFtZXIgaW1wbGVtZW50YXRpb25zLiAqL1xuXHRmdW5jdGlvbiBDaHVua1N0cmVhbWVyKGNvbmZpZylcblx0e1xuXHRcdHRoaXMuX2hhbmRsZSA9IG51bGw7XG5cdFx0dGhpcy5fcGF1c2VkID0gZmFsc2U7XG5cdFx0dGhpcy5fZmluaXNoZWQgPSBmYWxzZTtcblx0XHR0aGlzLl9pbnB1dCA9IG51bGw7XG5cdFx0dGhpcy5fYmFzZUluZGV4ID0gMDtcblx0XHR0aGlzLl9wYXJ0aWFsTGluZSA9IFwiXCI7XG5cdFx0dGhpcy5fcm93Q291bnQgPSAwO1xuXHRcdHRoaXMuX3N0YXJ0ID0gMDtcblx0XHR0aGlzLl9uZXh0Q2h1bmsgPSBudWxsO1xuXHRcdHRoaXMuaXNGaXJzdENodW5rID0gdHJ1ZTtcblx0XHR0aGlzLl9jb21wbGV0ZVJlc3VsdHMgPSB7XG5cdFx0XHRkYXRhOiBbXSxcblx0XHRcdGVycm9yczogW10sXG5cdFx0XHRtZXRhOiB7fVxuXHRcdH07XG5cdFx0cmVwbGFjZUNvbmZpZy5jYWxsKHRoaXMsIGNvbmZpZyk7XG5cblx0XHR0aGlzLnBhcnNlQ2h1bmsgPSBmdW5jdGlvbihjaHVuaylcblx0XHR7XG5cdFx0XHQvLyBGaXJzdCBjaHVuayBwcmUtcHJvY2Vzc2luZ1xuXHRcdFx0aWYgKHRoaXMuaXNGaXJzdENodW5rICYmIGlzRnVuY3Rpb24odGhpcy5fY29uZmlnLmJlZm9yZUZpcnN0Q2h1bmspKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgbW9kaWZpZWRDaHVuayA9IHRoaXMuX2NvbmZpZy5iZWZvcmVGaXJzdENodW5rKGNodW5rKTtcblx0XHRcdFx0aWYgKG1vZGlmaWVkQ2h1bmsgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0XHRjaHVuayA9IG1vZGlmaWVkQ2h1bms7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmlzRmlyc3RDaHVuayA9IGZhbHNlO1xuXG5cdFx0XHQvLyBSZWpvaW4gdGhlIGxpbmUgd2UgbGlrZWx5IGp1c3Qgc3BsaXQgaW4gdHdvIGJ5IGNodW5raW5nIHRoZSBmaWxlXG5cdFx0XHR2YXIgYWdncmVnYXRlID0gdGhpcy5fcGFydGlhbExpbmUgKyBjaHVuaztcblx0XHRcdHRoaXMuX3BhcnRpYWxMaW5lID0gXCJcIjtcblxuXHRcdFx0dmFyIHJlc3VsdHMgPSB0aGlzLl9oYW5kbGUucGFyc2UoYWdncmVnYXRlLCB0aGlzLl9iYXNlSW5kZXgsICF0aGlzLl9maW5pc2hlZCk7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLl9oYW5kbGUucGF1c2VkKCkgfHwgdGhpcy5faGFuZGxlLmFib3J0ZWQoKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHR2YXIgbGFzdEluZGV4ID0gcmVzdWx0cy5tZXRhLmN1cnNvcjtcblx0XHRcdFxuXHRcdFx0aWYgKCF0aGlzLl9maW5pc2hlZClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcGFydGlhbExpbmUgPSBhZ2dyZWdhdGUuc3Vic3RyaW5nKGxhc3RJbmRleCAtIHRoaXMuX2Jhc2VJbmRleCk7XG5cdFx0XHRcdHRoaXMuX2Jhc2VJbmRleCA9IGxhc3RJbmRleDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5kYXRhKVxuXHRcdFx0XHR0aGlzLl9yb3dDb3VudCArPSByZXN1bHRzLmRhdGEubGVuZ3RoO1xuXG5cdFx0XHR2YXIgZmluaXNoZWRJbmNsdWRpbmdQcmV2aWV3ID0gdGhpcy5fZmluaXNoZWQgfHwgKHRoaXMuX2NvbmZpZy5wcmV2aWV3ICYmIHRoaXMuX3Jvd0NvdW50ID49IHRoaXMuX2NvbmZpZy5wcmV2aWV3KTtcblxuXHRcdFx0aWYgKElTX1BBUEFfV09SS0VSKVxuXHRcdFx0e1xuXHRcdFx0XHRnbG9iYWwucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHJlc3VsdHM6IHJlc3VsdHMsXG5cdFx0XHRcdFx0d29ya2VySWQ6IFBhcGEuV09SS0VSX0lELFxuXHRcdFx0XHRcdGZpbmlzaGVkOiBmaW5pc2hlZEluY2x1ZGluZ1ByZXZpZXdcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2NvbmZpZy5jaHVuaykpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX2NvbmZpZy5jaHVuayhyZXN1bHRzLCB0aGlzLl9oYW5kbGUpO1xuXHRcdFx0XHRpZiAodGhpcy5fcGF1c2VkKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0cmVzdWx0cyA9IHVuZGVmaW5lZDtcblx0XHRcdFx0dGhpcy5fY29tcGxldGVSZXN1bHRzID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXRoaXMuX2NvbmZpZy5zdGVwICYmICF0aGlzLl9jb25maWcuY2h1bmspIHtcblx0XHRcdFx0dGhpcy5fY29tcGxldGVSZXN1bHRzLmRhdGEgPSB0aGlzLl9jb21wbGV0ZVJlc3VsdHMuZGF0YS5jb25jYXQocmVzdWx0cy5kYXRhKTtcblx0XHRcdFx0dGhpcy5fY29tcGxldGVSZXN1bHRzLmVycm9ycyA9IHRoaXMuX2NvbXBsZXRlUmVzdWx0cy5lcnJvcnMuY29uY2F0KHJlc3VsdHMuZXJyb3JzKTtcblx0XHRcdFx0dGhpcy5fY29tcGxldGVSZXN1bHRzLm1ldGEgPSByZXN1bHRzLm1ldGE7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChmaW5pc2hlZEluY2x1ZGluZ1ByZXZpZXcgJiYgaXNGdW5jdGlvbih0aGlzLl9jb25maWcuY29tcGxldGUpICYmICghcmVzdWx0cyB8fCAhcmVzdWx0cy5tZXRhLmFib3J0ZWQpKVxuXHRcdFx0XHR0aGlzLl9jb25maWcuY29tcGxldGUodGhpcy5fY29tcGxldGVSZXN1bHRzKTtcblxuXHRcdFx0aWYgKCFmaW5pc2hlZEluY2x1ZGluZ1ByZXZpZXcgJiYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLm1ldGEucGF1c2VkKSlcblx0XHRcdFx0dGhpcy5fbmV4dENodW5rKCk7XG5cblx0XHRcdHJldHVybiByZXN1bHRzO1xuXHRcdH07XG5cblx0XHR0aGlzLl9zZW5kRXJyb3IgPSBmdW5jdGlvbihlcnJvcilcblx0XHR7XG5cdFx0XHRpZiAoaXNGdW5jdGlvbih0aGlzLl9jb25maWcuZXJyb3IpKVxuXHRcdFx0XHR0aGlzLl9jb25maWcuZXJyb3IoZXJyb3IpO1xuXHRcdFx0ZWxzZSBpZiAoSVNfUEFQQV9XT1JLRVIgJiYgdGhpcy5fY29uZmlnLmVycm9yKVxuXHRcdFx0e1xuXHRcdFx0XHRnbG9iYWwucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRcdHdvcmtlcklkOiBQYXBhLldPUktFUl9JRCxcblx0XHRcdFx0XHRlcnJvcjogZXJyb3IsXG5cdFx0XHRcdFx0ZmluaXNoZWQ6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiByZXBsYWNlQ29uZmlnKGNvbmZpZylcblx0XHR7XG5cdFx0XHQvLyBEZWVwLWNvcHkgdGhlIGNvbmZpZyBzbyB3ZSBjYW4gZWRpdCBpdFxuXHRcdFx0dmFyIGNvbmZpZ0NvcHkgPSBjb3B5KGNvbmZpZyk7XG5cdFx0XHRjb25maWdDb3B5LmNodW5rU2l6ZSA9IHBhcnNlSW50KGNvbmZpZ0NvcHkuY2h1bmtTaXplKTtcdC8vIHBhcnNlSW50IFZFUlkgaW1wb3J0YW50IHNvIHdlIGRvbid0IGNvbmNhdGVuYXRlIHN0cmluZ3MhXG5cdFx0XHRpZiAoIWNvbmZpZy5zdGVwICYmICFjb25maWcuY2h1bmspXG5cdFx0XHRcdGNvbmZpZ0NvcHkuY2h1bmtTaXplID0gbnVsbDsgIC8vIGRpc2FibGUgUmFuZ2UgaGVhZGVyIGlmIG5vdCBzdHJlYW1pbmc7IGJhZCB2YWx1ZXMgYnJlYWsgSUlTIC0gc2VlIGlzc3VlICMxOTZcblx0XHRcdHRoaXMuX2hhbmRsZSA9IG5ldyBQYXJzZXJIYW5kbGUoY29uZmlnQ29weSk7XG5cdFx0XHR0aGlzLl9oYW5kbGUuc3RyZWFtZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5fY29uZmlnID0gY29uZmlnQ29weTtcdC8vIHBlcnNpc3QgdGhlIGNvcHkgdG8gdGhlIGNhbGxlclxuXHRcdH1cblx0fVxuXG5cblx0ZnVuY3Rpb24gTmV0d29ya1N0cmVhbWVyKGNvbmZpZylcblx0e1xuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0XHRpZiAoIWNvbmZpZy5jaHVua1NpemUpXG5cdFx0XHRjb25maWcuY2h1bmtTaXplID0gUGFwYS5SZW1vdGVDaHVua1NpemU7XG5cdFx0Q2h1bmtTdHJlYW1lci5jYWxsKHRoaXMsIGNvbmZpZyk7XG5cblx0XHR2YXIgeGhyO1xuXG5cdFx0aWYgKElTX1dPUktFUilcblx0XHR7XG5cdFx0XHR0aGlzLl9uZXh0Q2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlYWRDaHVuaygpO1xuXHRcdFx0XHR0aGlzLl9jaHVua0xvYWRlZCgpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuX25leHRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcmVhZENodW5rKCk7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHRoaXMuc3RyZWFtID0gZnVuY3Rpb24odXJsKVxuXHRcdHtcblx0XHRcdHRoaXMuX2lucHV0ID0gdXJsO1xuXHRcdFx0dGhpcy5fbmV4dENodW5rKCk7XHQvLyBTdGFydHMgc3RyZWFtaW5nXG5cdFx0fTtcblxuXHRcdHRoaXMuX3JlYWRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5fZmluaXNoZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX2NodW5rTG9hZGVkKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0eGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcblx0XHRcdGlmICghSVNfV09SS0VSKVxuXHRcdFx0e1xuXHRcdFx0XHR4aHIub25sb2FkID0gYmluZEZ1bmN0aW9uKHRoaXMuX2NodW5rTG9hZGVkLCB0aGlzKTtcblx0XHRcdFx0eGhyLm9uZXJyb3IgPSBiaW5kRnVuY3Rpb24odGhpcy5fY2h1bmtFcnJvciwgdGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5vcGVuKFwiR0VUXCIsIHRoaXMuX2lucHV0LCAhSVNfV09SS0VSKTtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuX2NvbmZpZy5jaHVua1NpemUpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBlbmQgPSB0aGlzLl9zdGFydCArIHRoaXMuX2NvbmZpZy5jaHVua1NpemUgLSAxO1x0Ly8gbWludXMgb25lIGJlY2F1c2UgYnl0ZSByYW5nZSBpcyBpbmNsdXNpdmVcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoXCJSYW5nZVwiLCBcImJ5dGVzPVwiK3RoaXMuX3N0YXJ0K1wiLVwiK2VuZCk7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiSWYtTm9uZS1NYXRjaFwiLCBcIndlYmtpdC1uby1jYWNoZVwiKTsgLy8gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgyNjcyXG5cdFx0XHR9XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdHhoci5zZW5kKCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHRoaXMuX2NodW5rRXJyb3IoZXJyLm1lc3NhZ2UpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoSVNfV09SS0VSICYmIHhoci5zdGF0dXMgPT0gMClcblx0XHRcdFx0dGhpcy5fY2h1bmtFcnJvcigpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLl9zdGFydCArPSB0aGlzLl9jb25maWcuY2h1bmtTaXplO1xuXHRcdH1cblxuXHRcdHRoaXMuX2NodW5rTG9hZGVkID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSAhPSA0KVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdGlmICh4aHIuc3RhdHVzIDwgMjAwIHx8IHhoci5zdGF0dXMgPj0gNDAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9jaHVua0Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZmluaXNoZWQgPSAhdGhpcy5fY29uZmlnLmNodW5rU2l6ZSB8fCB0aGlzLl9zdGFydCA+IGdldEZpbGVTaXplKHhocik7XG5cdFx0XHR0aGlzLnBhcnNlQ2h1bmsoeGhyLnJlc3BvbnNlVGV4dCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fY2h1bmtFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSlcblx0XHR7XG5cdFx0XHR2YXIgZXJyb3JUZXh0ID0geGhyLnN0YXR1c1RleHQgfHwgZXJyb3JNZXNzYWdlO1xuXHRcdFx0dGhpcy5fc2VuZEVycm9yKGVycm9yVGV4dCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0RmlsZVNpemUoeGhyKVxuXHRcdHtcblx0XHRcdHZhciBjb250ZW50UmFuZ2UgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVJhbmdlXCIpO1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KGNvbnRlbnRSYW5nZS5zdWJzdHIoY29udGVudFJhbmdlLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpKTtcblx0XHR9XG5cdH1cblx0TmV0d29ya1N0cmVhbWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ2h1bmtTdHJlYW1lci5wcm90b3R5cGUpO1xuXHROZXR3b3JrU3RyZWFtZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTmV0d29ya1N0cmVhbWVyO1xuXG5cblx0ZnVuY3Rpb24gRmlsZVN0cmVhbWVyKGNvbmZpZylcblx0e1xuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0XHRpZiAoIWNvbmZpZy5jaHVua1NpemUpXG5cdFx0XHRjb25maWcuY2h1bmtTaXplID0gUGFwYS5Mb2NhbENodW5rU2l6ZTtcblx0XHRDaHVua1N0cmVhbWVyLmNhbGwodGhpcywgY29uZmlnKTtcblxuXHRcdHZhciByZWFkZXIsIHNsaWNlO1xuXG5cdFx0Ly8gRmlsZVJlYWRlciBpcyBiZXR0ZXIgdGhhbiBGaWxlUmVhZGVyU3luYyAoZXZlbiBpbiB3b3JrZXIpIC0gc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xLzI0NzA4NjQ5LzEwNDg4NjJcblx0XHQvLyBCdXQgRmlyZWZveCBpcyBhIHBpbGwsIHRvbyAtIHNlZSBpc3N1ZSAjNzY6IGh0dHBzOi8vZ2l0aHViLmNvbS9taG9sdC9QYXBhUGFyc2UvaXNzdWVzLzc2XG5cdFx0dmFyIHVzaW5nQXN5bmNSZWFkZXIgPSB0eXBlb2YgRmlsZVJlYWRlciAhPT0gJ3VuZGVmaW5lZCc7XHQvLyBTYWZhcmkgZG9lc24ndCBjb25zaWRlciBpdCBhIGZ1bmN0aW9uIC0gc2VlIGlzc3VlICMxMDVcblxuXHRcdHRoaXMuc3RyZWFtID0gZnVuY3Rpb24oZmlsZSlcblx0XHR7XG5cdFx0XHR0aGlzLl9pbnB1dCA9IGZpbGU7XG5cdFx0XHRzbGljZSA9IGZpbGUuc2xpY2UgfHwgZmlsZS53ZWJraXRTbGljZSB8fCBmaWxlLm1velNsaWNlO1xuXG5cdFx0XHRpZiAodXNpbmdBc3luY1JlYWRlcilcblx0XHRcdHtcblx0XHRcdFx0cmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcdFx0Ly8gUHJlZmVycmVkIG1ldGhvZCBvZiByZWFkaW5nIGZpbGVzLCBldmVuIGluIHdvcmtlcnNcblx0XHRcdFx0cmVhZGVyLm9ubG9hZCA9IGJpbmRGdW5jdGlvbih0aGlzLl9jaHVua0xvYWRlZCwgdGhpcyk7XG5cdFx0XHRcdHJlYWRlci5vbmVycm9yID0gYmluZEZ1bmN0aW9uKHRoaXMuX2NodW5rRXJyb3IsIHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRyZWFkZXIgPSBuZXcgRmlsZVJlYWRlclN5bmMoKTtcdC8vIEhhY2sgZm9yIHJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyIGluIEZpcmVmb3hcblxuXHRcdFx0dGhpcy5fbmV4dENodW5rKCk7XHQvLyBTdGFydHMgc3RyZWFtaW5nXG5cdFx0fTtcblxuXHRcdHRoaXMuX25leHRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMuX2ZpbmlzaGVkICYmICghdGhpcy5fY29uZmlnLnByZXZpZXcgfHwgdGhpcy5fcm93Q291bnQgPCB0aGlzLl9jb25maWcucHJldmlldykpXG5cdFx0XHRcdHRoaXMuX3JlYWRDaHVuaygpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3JlYWRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHR2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dDtcblx0XHRcdGlmICh0aGlzLl9jb25maWcuY2h1bmtTaXplKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZW5kID0gTWF0aC5taW4odGhpcy5fc3RhcnQgKyB0aGlzLl9jb25maWcuY2h1bmtTaXplLCB0aGlzLl9pbnB1dC5zaXplKTtcblx0XHRcdFx0aW5wdXQgPSBzbGljZS5jYWxsKGlucHV0LCB0aGlzLl9zdGFydCwgZW5kKTtcblx0XHRcdH1cblx0XHRcdHZhciB0eHQgPSByZWFkZXIucmVhZEFzVGV4dChpbnB1dCwgdGhpcy5fY29uZmlnLmVuY29kaW5nKTtcblx0XHRcdGlmICghdXNpbmdBc3luY1JlYWRlcilcblx0XHRcdFx0dGhpcy5fY2h1bmtMb2FkZWQoeyB0YXJnZXQ6IHsgcmVzdWx0OiB0eHQgfSB9KTtcdC8vIG1pbWljIHRoZSBhc3luYyBzaWduYXR1cmVcblx0XHR9XG5cblx0XHR0aGlzLl9jaHVua0xvYWRlZCA9IGZ1bmN0aW9uKGV2ZW50KVxuXHRcdHtcblx0XHRcdC8vIFZlcnkgaW1wb3J0YW50IHRvIGluY3JlbWVudCBzdGFydCBlYWNoIHRpbWUgYmVmb3JlIGhhbmRsaW5nIHJlc3VsdHNcblx0XHRcdHRoaXMuX3N0YXJ0ICs9IHRoaXMuX2NvbmZpZy5jaHVua1NpemU7XG5cdFx0XHR0aGlzLl9maW5pc2hlZCA9ICF0aGlzLl9jb25maWcuY2h1bmtTaXplIHx8IHRoaXMuX3N0YXJ0ID49IHRoaXMuX2lucHV0LnNpemU7XG5cdFx0XHR0aGlzLnBhcnNlQ2h1bmsoZXZlbnQudGFyZ2V0LnJlc3VsdCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fY2h1bmtFcnJvciA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHR0aGlzLl9zZW5kRXJyb3IocmVhZGVyLmVycm9yKTtcblx0XHR9XG5cblx0fVxuXHRGaWxlU3RyZWFtZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDaHVua1N0cmVhbWVyLnByb3RvdHlwZSk7XG5cdEZpbGVTdHJlYW1lci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGaWxlU3RyZWFtZXI7XG5cblxuXHRmdW5jdGlvbiBTdHJpbmdTdHJlYW1lcihjb25maWcpXG5cdHtcblx0XHRjb25maWcgPSBjb25maWcgfHwge307XG5cdFx0Q2h1bmtTdHJlYW1lci5jYWxsKHRoaXMsIGNvbmZpZyk7XG5cblx0XHR2YXIgc3RyaW5nO1xuXHRcdHZhciByZW1haW5pbmc7XG5cdFx0dGhpcy5zdHJlYW0gPSBmdW5jdGlvbihzKVxuXHRcdHtcblx0XHRcdHN0cmluZyA9IHM7XG5cdFx0XHRyZW1haW5pbmcgPSBzO1xuXHRcdFx0cmV0dXJuIHRoaXMuX25leHRDaHVuaygpO1xuXHRcdH1cblx0XHR0aGlzLl9uZXh0Q2h1bmsgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuX2ZpbmlzaGVkKSByZXR1cm47XG5cdFx0XHR2YXIgc2l6ZSA9IHRoaXMuX2NvbmZpZy5jaHVua1NpemU7XG5cdFx0XHR2YXIgY2h1bmsgPSBzaXplID8gcmVtYWluaW5nLnN1YnN0cigwLCBzaXplKSA6IHJlbWFpbmluZztcblx0XHRcdHJlbWFpbmluZyA9IHNpemUgPyByZW1haW5pbmcuc3Vic3RyKHNpemUpIDogJyc7XG5cdFx0XHR0aGlzLl9maW5pc2hlZCA9ICFyZW1haW5pbmc7XG5cdFx0XHRyZXR1cm4gdGhpcy5wYXJzZUNodW5rKGNodW5rKTtcblx0XHR9XG5cdH1cblx0U3RyaW5nU3RyZWFtZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdHJpbmdTdHJlYW1lci5wcm90b3R5cGUpO1xuXHRTdHJpbmdTdHJlYW1lci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdTdHJlYW1lcjtcblxuXG5cblx0Ly8gVXNlIG9uZSBQYXJzZXJIYW5kbGUgcGVyIGVudGlyZSBDU1YgZmlsZSBvciBzdHJpbmdcblx0ZnVuY3Rpb24gUGFyc2VySGFuZGxlKF9jb25maWcpXG5cdHtcblx0XHQvLyBPbmUgZ29hbCBpcyB0byBtaW5pbWl6ZSB0aGUgdXNlIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMuLi5cblx0XHR2YXIgRkxPQVQgPSAvXlxccyotPyhcXGQqXFwuP1xcZCt8XFxkK1xcLj9cXGQqKShlWy0rXT9cXGQrKT9cXHMqJC9pO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBfc3RlcENvdW50ZXIgPSAwO1x0Ly8gTnVtYmVyIG9mIHRpbWVzIHN0ZXAgd2FzIGNhbGxlZCAobnVtYmVyIG9mIHJvd3MgcGFyc2VkKVxuXHRcdHZhciBfaW5wdXQ7XHRcdFx0XHQvLyBUaGUgaW5wdXQgYmVpbmcgcGFyc2VkXG5cdFx0dmFyIF9wYXJzZXI7XHRcdFx0Ly8gVGhlIGNvcmUgcGFyc2VyIGJlaW5nIHVzZWRcblx0XHR2YXIgX3BhdXNlZCA9IGZhbHNlO1x0Ly8gV2hldGhlciB3ZSBhcmUgcGF1c2VkIG9yIG5vdFxuXHRcdHZhciBfYWJvcnRlZCA9IGZhbHNlOyAgIC8vIFdoZXRoZXIgdGhlIHBhcnNlciBoYXMgYWJvcnRlZCBvciBub3Rcblx0XHR2YXIgX2RlbGltaXRlckVycm9yO1x0Ly8gVGVtcG9yYXJ5IHN0YXRlIGJldHdlZW4gZGVsaW1pdGVyIGRldGVjdGlvbiBhbmQgcHJvY2Vzc2luZyByZXN1bHRzXG5cdFx0dmFyIF9maWVsZHMgPSBbXTtcdFx0Ly8gRmllbGRzIGFyZSBmcm9tIHRoZSBoZWFkZXIgcm93IG9mIHRoZSBpbnB1dCwgaWYgdGhlcmUgaXMgb25lXG5cdFx0dmFyIF9yZXN1bHRzID0ge1x0XHQvLyBUaGUgbGFzdCByZXN1bHRzIHJldHVybmVkIGZyb20gdGhlIHBhcnNlclxuXHRcdFx0ZGF0YTogW10sXG5cdFx0XHRlcnJvcnM6IFtdLFxuXHRcdFx0bWV0YToge31cblx0XHR9O1xuXG5cdFx0aWYgKGlzRnVuY3Rpb24oX2NvbmZpZy5zdGVwKSlcblx0XHR7XG5cdFx0XHR2YXIgdXNlclN0ZXAgPSBfY29uZmlnLnN0ZXA7XG5cdFx0XHRfY29uZmlnLnN0ZXAgPSBmdW5jdGlvbihyZXN1bHRzKVxuXHRcdFx0e1xuXHRcdFx0XHRfcmVzdWx0cyA9IHJlc3VsdHM7XG5cblx0XHRcdFx0aWYgKG5lZWRzSGVhZGVyUm93KCkpXG5cdFx0XHRcdFx0cHJvY2Vzc1Jlc3VsdHMoKTtcblx0XHRcdFx0ZWxzZVx0Ly8gb25seSBjYWxsIHVzZXIncyBzdGVwIGZ1bmN0aW9uIGFmdGVyIGhlYWRlciByb3dcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHByb2Nlc3NSZXN1bHRzKCk7XG5cblx0XHRcdFx0XHQvLyBJdCdzIHBvc3NiaWxlIHRoYXQgdGhpcyBsaW5lIHdhcyBlbXB0eSBhbmQgdGhlcmUncyBubyByb3cgaGVyZSBhZnRlciBhbGxcblx0XHRcdFx0XHRpZiAoX3Jlc3VsdHMuZGF0YS5sZW5ndGggPT0gMClcblx0XHRcdFx0XHRcdHJldHVybjtcblxuXHRcdFx0XHRcdF9zdGVwQ291bnRlciArPSByZXN1bHRzLmRhdGEubGVuZ3RoO1xuXHRcdFx0XHRcdGlmIChfY29uZmlnLnByZXZpZXcgJiYgX3N0ZXBDb3VudGVyID4gX2NvbmZpZy5wcmV2aWV3KVxuXHRcdFx0XHRcdFx0X3BhcnNlci5hYm9ydCgpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdHVzZXJTdGVwKF9yZXN1bHRzLCBzZWxmKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBQYXJzZXMgaW5wdXQuIE1vc3QgdXNlcnMgd29uJ3QgbmVlZCwgYW5kIHNob3VsZG4ndCBtZXNzIHdpdGgsIHRoZSBiYXNlSW5kZXhcblx0XHQgKiBhbmQgaWdub3JlTGFzdFJvdyBwYXJhbWV0ZXJzLiBUaGV5IGFyZSB1c2VkIGJ5IHN0cmVhbWVycyAod3JhcHBlciBmdW5jdGlvbnMpXG5cdFx0ICogd2hlbiBhbiBpbnB1dCBjb21lcyBpbiBtdWx0aXBsZSBjaHVua3MsIGxpa2UgZnJvbSBhIGZpbGUuXG5cdFx0ICovXG5cdFx0dGhpcy5wYXJzZSA9IGZ1bmN0aW9uKGlucHV0LCBiYXNlSW5kZXgsIGlnbm9yZUxhc3RSb3cpXG5cdFx0e1xuXHRcdFx0aWYgKCFfY29uZmlnLm5ld2xpbmUpXG5cdFx0XHRcdF9jb25maWcubmV3bGluZSA9IGd1ZXNzTGluZUVuZGluZ3MoaW5wdXQpO1xuXG5cdFx0XHRfZGVsaW1pdGVyRXJyb3IgPSBmYWxzZTtcblx0XHRcdGlmICghX2NvbmZpZy5kZWxpbWl0ZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBkZWxpbUd1ZXNzID0gZ3Vlc3NEZWxpbWl0ZXIoaW5wdXQpO1xuXHRcdFx0XHRpZiAoZGVsaW1HdWVzcy5zdWNjZXNzZnVsKVxuXHRcdFx0XHRcdF9jb25maWcuZGVsaW1pdGVyID0gZGVsaW1HdWVzcy5iZXN0RGVsaW1pdGVyO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRfZGVsaW1pdGVyRXJyb3IgPSB0cnVlO1x0Ly8gYWRkIGVycm9yIGFmdGVyIHBhcnNpbmcgKG90aGVyd2lzZSBpdCB3b3VsZCBiZSBvdmVyd3JpdHRlbilcblx0XHRcdFx0XHRfY29uZmlnLmRlbGltaXRlciA9IFBhcGEuRGVmYXVsdERlbGltaXRlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHRfcmVzdWx0cy5tZXRhLmRlbGltaXRlciA9IF9jb25maWcuZGVsaW1pdGVyO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcGFyc2VyQ29uZmlnID0gY29weShfY29uZmlnKTtcblx0XHRcdGlmIChfY29uZmlnLnByZXZpZXcgJiYgX2NvbmZpZy5oZWFkZXIpXG5cdFx0XHRcdHBhcnNlckNvbmZpZy5wcmV2aWV3Kys7XHQvLyB0byBjb21wZW5zYXRlIGZvciBoZWFkZXIgcm93XG5cblx0XHRcdF9pbnB1dCA9IGlucHV0O1xuXHRcdFx0X3BhcnNlciA9IG5ldyBQYXJzZXIocGFyc2VyQ29uZmlnKTtcblx0XHRcdF9yZXN1bHRzID0gX3BhcnNlci5wYXJzZShfaW5wdXQsIGJhc2VJbmRleCwgaWdub3JlTGFzdFJvdyk7XG5cdFx0XHRwcm9jZXNzUmVzdWx0cygpO1xuXHRcdFx0cmV0dXJuIF9wYXVzZWQgPyB7IG1ldGE6IHsgcGF1c2VkOiB0cnVlIH0gfSA6IChfcmVzdWx0cyB8fCB7IG1ldGE6IHsgcGF1c2VkOiBmYWxzZSB9IH0pO1xuXHRcdH07XG5cblx0XHR0aGlzLnBhdXNlZCA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gX3BhdXNlZDtcblx0XHR9O1xuXG5cdFx0dGhpcy5wYXVzZSA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRfcGF1c2VkID0gdHJ1ZTtcblx0XHRcdF9wYXJzZXIuYWJvcnQoKTtcblx0XHRcdF9pbnB1dCA9IF9pbnB1dC5zdWJzdHIoX3BhcnNlci5nZXRDaGFySW5kZXgoKSk7XG5cdFx0fTtcblxuXHRcdHRoaXMucmVzdW1lID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdF9wYXVzZWQgPSBmYWxzZTtcblx0XHRcdHNlbGYuc3RyZWFtZXIucGFyc2VDaHVuayhfaW5wdXQpO1xuXHRcdH07XG5cblx0XHR0aGlzLmFib3J0ZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gX2Fib3J0ZWQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5hYm9ydCA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRfYWJvcnRlZCA9IHRydWU7XG5cdFx0XHRfcGFyc2VyLmFib3J0KCk7XG5cdFx0XHRfcmVzdWx0cy5tZXRhLmFib3J0ZWQgPSB0cnVlO1xuXHRcdFx0aWYgKGlzRnVuY3Rpb24oX2NvbmZpZy5jb21wbGV0ZSkpXG5cdFx0XHRcdF9jb25maWcuY29tcGxldGUoX3Jlc3VsdHMpO1xuXHRcdFx0X2lucHV0ID0gXCJcIjtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc1Jlc3VsdHMoKVxuXHRcdHtcblx0XHRcdGlmIChfcmVzdWx0cyAmJiBfZGVsaW1pdGVyRXJyb3IpXG5cdFx0XHR7XG5cdFx0XHRcdGFkZEVycm9yKFwiRGVsaW1pdGVyXCIsIFwiVW5kZXRlY3RhYmxlRGVsaW1pdGVyXCIsIFwiVW5hYmxlIHRvIGF1dG8tZGV0ZWN0IGRlbGltaXRpbmcgY2hhcmFjdGVyOyBkZWZhdWx0ZWQgdG8gJ1wiK1BhcGEuRGVmYXVsdERlbGltaXRlcitcIidcIik7XG5cdFx0XHRcdF9kZWxpbWl0ZXJFcnJvciA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoX2NvbmZpZy5za2lwRW1wdHlMaW5lcylcblx0XHRcdHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBfcmVzdWx0cy5kYXRhLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHRcdGlmIChfcmVzdWx0cy5kYXRhW2ldLmxlbmd0aCA9PSAxICYmIF9yZXN1bHRzLmRhdGFbaV1bMF0gPT0gXCJcIilcblx0XHRcdFx0XHRcdF9yZXN1bHRzLmRhdGEuc3BsaWNlKGktLSwgMSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuZWVkc0hlYWRlclJvdygpKVxuXHRcdFx0XHRmaWxsSGVhZGVyRmllbGRzKCk7XG5cblx0XHRcdHJldHVybiBhcHBseUhlYWRlckFuZER5bmFtaWNUeXBpbmcoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBuZWVkc0hlYWRlclJvdygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIF9jb25maWcuaGVhZGVyICYmIF9maWVsZHMubGVuZ3RoID09IDA7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZmlsbEhlYWRlckZpZWxkcygpXG5cdFx0e1xuXHRcdFx0aWYgKCFfcmVzdWx0cylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IG5lZWRzSGVhZGVyUm93KCkgJiYgaSA8IF9yZXN1bHRzLmRhdGEubGVuZ3RoOyBpKyspXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgX3Jlc3VsdHMuZGF0YVtpXS5sZW5ndGg7IGorKylcblx0XHRcdFx0XHRfZmllbGRzLnB1c2goX3Jlc3VsdHMuZGF0YVtpXVtqXSk7XG5cdFx0XHRfcmVzdWx0cy5kYXRhLnNwbGljZSgwLCAxKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhcHBseUhlYWRlckFuZER5bmFtaWNUeXBpbmcoKVxuXHRcdHtcblx0XHRcdGlmICghX3Jlc3VsdHMgfHwgKCFfY29uZmlnLmhlYWRlciAmJiAhX2NvbmZpZy5keW5hbWljVHlwaW5nKSlcblx0XHRcdFx0cmV0dXJuIF9yZXN1bHRzO1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IF9yZXN1bHRzLmRhdGEubGVuZ3RoOyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdHZhciByb3cgPSB7fTtcblxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IF9yZXN1bHRzLmRhdGFbaV0ubGVuZ3RoOyBqKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoX2NvbmZpZy5keW5hbWljVHlwaW5nKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHZhciB2YWx1ZSA9IF9yZXN1bHRzLmRhdGFbaV1bal07XG5cdFx0XHRcdFx0XHRpZiAodmFsdWUgPT0gXCJ0cnVlXCIgfHwgdmFsdWUgPT0gXCJUUlVFXCIpXG5cdFx0XHRcdFx0XHRcdF9yZXN1bHRzLmRhdGFbaV1bal0gPSB0cnVlO1xuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodmFsdWUgPT0gXCJmYWxzZVwiIHx8IHZhbHVlID09IFwiRkFMU0VcIilcblx0XHRcdFx0XHRcdFx0X3Jlc3VsdHMuZGF0YVtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRfcmVzdWx0cy5kYXRhW2ldW2pdID0gdHJ5UGFyc2VGbG9hdCh2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKF9jb25maWcuaGVhZGVyKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChqID49IF9maWVsZHMubGVuZ3RoKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoIXJvd1tcIl9fcGFyc2VkX2V4dHJhXCJdKVxuXHRcdFx0XHRcdFx0XHRcdHJvd1tcIl9fcGFyc2VkX2V4dHJhXCJdID0gW107XG5cdFx0XHRcdFx0XHRcdHJvd1tcIl9fcGFyc2VkX2V4dHJhXCJdLnB1c2goX3Jlc3VsdHMuZGF0YVtpXVtqXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHJvd1tfZmllbGRzW2pdXSA9IF9yZXN1bHRzLmRhdGFbaV1bal07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9jb25maWcuaGVhZGVyKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0X3Jlc3VsdHMuZGF0YVtpXSA9IHJvdztcblx0XHRcdFx0XHRpZiAoaiA+IF9maWVsZHMubGVuZ3RoKVxuXHRcdFx0XHRcdFx0YWRkRXJyb3IoXCJGaWVsZE1pc21hdGNoXCIsIFwiVG9vTWFueUZpZWxkc1wiLCBcIlRvbyBtYW55IGZpZWxkczogZXhwZWN0ZWQgXCIgKyBfZmllbGRzLmxlbmd0aCArIFwiIGZpZWxkcyBidXQgcGFyc2VkIFwiICsgaiwgaSk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoaiA8IF9maWVsZHMubGVuZ3RoKVxuXHRcdFx0XHRcdFx0YWRkRXJyb3IoXCJGaWVsZE1pc21hdGNoXCIsIFwiVG9vRmV3RmllbGRzXCIsIFwiVG9vIGZldyBmaWVsZHM6IGV4cGVjdGVkIFwiICsgX2ZpZWxkcy5sZW5ndGggKyBcIiBmaWVsZHMgYnV0IHBhcnNlZCBcIiArIGosIGkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfY29uZmlnLmhlYWRlciAmJiBfcmVzdWx0cy5tZXRhKVxuXHRcdFx0XHRfcmVzdWx0cy5tZXRhLmZpZWxkcyA9IF9maWVsZHM7XG5cdFx0XHRyZXR1cm4gX3Jlc3VsdHM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ3Vlc3NEZWxpbWl0ZXIoaW5wdXQpXG5cdFx0e1xuXHRcdFx0dmFyIGRlbGltQ2hvaWNlcyA9IFtcIixcIiwgXCJcXHRcIiwgXCJ8XCIsIFwiO1wiLCBQYXBhLlJFQ09SRF9TRVAsIFBhcGEuVU5JVF9TRVBdO1xuXHRcdFx0dmFyIGJlc3REZWxpbSwgYmVzdERlbHRhLCBmaWVsZENvdW50UHJldlJvdztcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWxpbUNob2ljZXMubGVuZ3RoOyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBkZWxpbSA9IGRlbGltQ2hvaWNlc1tpXTtcblx0XHRcdFx0dmFyIGRlbHRhID0gMCwgYXZnRmllbGRDb3VudCA9IDA7XG5cdFx0XHRcdGZpZWxkQ291bnRQcmV2Um93ID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdHZhciBwcmV2aWV3ID0gbmV3IFBhcnNlcih7XG5cdFx0XHRcdFx0ZGVsaW1pdGVyOiBkZWxpbSxcblx0XHRcdFx0XHRwcmV2aWV3OiAxMFxuXHRcdFx0XHR9KS5wYXJzZShpbnB1dCk7XG5cblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBwcmV2aWV3LmRhdGEubGVuZ3RoOyBqKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgZmllbGRDb3VudCA9IHByZXZpZXcuZGF0YVtqXS5sZW5ndGg7XG5cdFx0XHRcdFx0YXZnRmllbGRDb3VudCArPSBmaWVsZENvdW50O1xuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWVsZENvdW50UHJldlJvdyA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZmllbGRDb3VudFByZXZSb3cgPSBmaWVsZENvdW50O1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGZpZWxkQ291bnQgPiAxKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRlbHRhICs9IE1hdGguYWJzKGZpZWxkQ291bnQgLSBmaWVsZENvdW50UHJldlJvdyk7XG5cdFx0XHRcdFx0XHRmaWVsZENvdW50UHJldlJvdyA9IGZpZWxkQ291bnQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHByZXZpZXcuZGF0YS5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdGF2Z0ZpZWxkQ291bnQgLz0gcHJldmlldy5kYXRhLmxlbmd0aDtcblxuXHRcdFx0XHRpZiAoKHR5cGVvZiBiZXN0RGVsdGEgPT09ICd1bmRlZmluZWQnIHx8IGRlbHRhIDwgYmVzdERlbHRhKVxuXHRcdFx0XHRcdCYmIGF2Z0ZpZWxkQ291bnQgPiAxLjk5KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0YmVzdERlbHRhID0gZGVsdGE7XG5cdFx0XHRcdFx0YmVzdERlbGltID0gZGVsaW07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0X2NvbmZpZy5kZWxpbWl0ZXIgPSBiZXN0RGVsaW07XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3NmdWw6ICEhYmVzdERlbGltLFxuXHRcdFx0XHRiZXN0RGVsaW1pdGVyOiBiZXN0RGVsaW1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBndWVzc0xpbmVFbmRpbmdzKGlucHV0KVxuXHRcdHtcblx0XHRcdGlucHV0ID0gaW5wdXQuc3Vic3RyKDAsIDEwMjQqMTAyNCk7XHQvLyBtYXggbGVuZ3RoIDEgTUJcblxuXHRcdFx0dmFyIHIgPSBpbnB1dC5zcGxpdCgnXFxyJyk7XG5cblx0XHRcdGlmIChyLmxlbmd0aCA9PSAxKVxuXHRcdFx0XHRyZXR1cm4gJ1xcbic7XG5cblx0XHRcdHZhciBudW1XaXRoTiA9IDA7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHIubGVuZ3RoOyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyW2ldWzBdID09ICdcXG4nKVxuXHRcdFx0XHRcdG51bVdpdGhOKys7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBudW1XaXRoTiA+PSByLmxlbmd0aCAvIDIgPyAnXFxyXFxuJyA6ICdcXHInO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyeVBhcnNlRmxvYXQodmFsKVxuXHRcdHtcblx0XHRcdHZhciBpc051bWJlciA9IEZMT0FULnRlc3QodmFsKTtcblx0XHRcdHJldHVybiBpc051bWJlciA/IHBhcnNlRmxvYXQodmFsKSA6IHZhbDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhZGRFcnJvcih0eXBlLCBjb2RlLCBtc2csIHJvdylcblx0XHR7XG5cdFx0XHRfcmVzdWx0cy5lcnJvcnMucHVzaCh7XG5cdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdGNvZGU6IGNvZGUsXG5cdFx0XHRcdG1lc3NhZ2U6IG1zZyxcblx0XHRcdFx0cm93OiByb3dcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cblxuXG5cblx0LyoqIFRoZSBjb3JlIHBhcnNlciBpbXBsZW1lbnRzIHNwZWVkeSBhbmQgY29ycmVjdCBDU1YgcGFyc2luZyAqL1xuXHRmdW5jdGlvbiBQYXJzZXIoY29uZmlnKVxuXHR7XG5cdFx0Ly8gVW5wYWNrIHRoZSBjb25maWcgb2JqZWN0XG5cdFx0Y29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHRcdHZhciBkZWxpbSA9IGNvbmZpZy5kZWxpbWl0ZXI7XG5cdFx0dmFyIG5ld2xpbmUgPSBjb25maWcubmV3bGluZTtcblx0XHR2YXIgY29tbWVudHMgPSBjb25maWcuY29tbWVudHM7XG5cdFx0dmFyIHN0ZXAgPSBjb25maWcuc3RlcDtcblx0XHR2YXIgcHJldmlldyA9IGNvbmZpZy5wcmV2aWV3O1xuXHRcdHZhciBmYXN0TW9kZSA9IGNvbmZpZy5mYXN0TW9kZTtcblxuXHRcdC8vIERlbGltaXRlciBtdXN0IGJlIHZhbGlkXG5cdFx0aWYgKHR5cGVvZiBkZWxpbSAhPT0gJ3N0cmluZydcblx0XHRcdHx8IFBhcGEuQkFEX0RFTElNSVRFUlMuaW5kZXhPZihkZWxpbSkgPiAtMSlcblx0XHRcdGRlbGltID0gXCIsXCI7XG5cblx0XHQvLyBDb21tZW50IGNoYXJhY3RlciBtdXN0IGJlIHZhbGlkXG5cdFx0aWYgKGNvbW1lbnRzID09PSBkZWxpbSlcblx0XHRcdHRocm93IFwiQ29tbWVudCBjaGFyYWN0ZXIgc2FtZSBhcyBkZWxpbWl0ZXJcIjtcblx0XHRlbHNlIGlmIChjb21tZW50cyA9PT0gdHJ1ZSlcblx0XHRcdGNvbW1lbnRzID0gXCIjXCI7XG5cdFx0ZWxzZSBpZiAodHlwZW9mIGNvbW1lbnRzICE9PSAnc3RyaW5nJ1xuXHRcdFx0fHwgUGFwYS5CQURfREVMSU1JVEVSUy5pbmRleE9mKGNvbW1lbnRzKSA+IC0xKVxuXHRcdFx0Y29tbWVudHMgPSBmYWxzZTtcblxuXHRcdC8vIE5ld2xpbmUgbXVzdCBiZSB2YWxpZDogXFxyLCBcXG4sIG9yIFxcclxcblxuXHRcdGlmIChuZXdsaW5lICE9ICdcXG4nICYmIG5ld2xpbmUgIT0gJ1xccicgJiYgbmV3bGluZSAhPSAnXFxyXFxuJylcblx0XHRcdG5ld2xpbmUgPSAnXFxuJztcblxuXHRcdC8vIFdlJ3JlIGdvbm5hIG5lZWQgdGhlc2UgYXQgdGhlIFBhcnNlciBzY29wZVxuXHRcdHZhciBjdXJzb3IgPSAwO1xuXHRcdHZhciBhYm9ydGVkID0gZmFsc2U7XG5cblx0XHR0aGlzLnBhcnNlID0gZnVuY3Rpb24oaW5wdXQsIGJhc2VJbmRleCwgaWdub3JlTGFzdFJvdylcblx0XHR7XG5cdFx0XHQvLyBGb3Igc29tZSByZWFzb24sIGluIENocm9tZSwgdGhpcyBzcGVlZHMgdGhpbmdzIHVwICghPylcblx0XHRcdGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKVxuXHRcdFx0XHR0aHJvdyBcIklucHV0IG11c3QgYmUgYSBzdHJpbmdcIjtcblxuXHRcdFx0Ly8gV2UgZG9uJ3QgbmVlZCB0byBjb21wdXRlIHNvbWUgb2YgdGhlc2UgZXZlcnkgdGltZSBwYXJzZSgpIGlzIGNhbGxlZCxcblx0XHRcdC8vIGJ1dCBoYXZpbmcgdGhlbSBpbiBhIG1vcmUgbG9jYWwgc2NvcGUgc2VlbXMgdG8gcGVyZm9ybSBiZXR0ZXJcblx0XHRcdHZhciBpbnB1dExlbiA9IGlucHV0Lmxlbmd0aCxcblx0XHRcdFx0ZGVsaW1MZW4gPSBkZWxpbS5sZW5ndGgsXG5cdFx0XHRcdG5ld2xpbmVMZW4gPSBuZXdsaW5lLmxlbmd0aCxcblx0XHRcdFx0Y29tbWVudHNMZW4gPSBjb21tZW50cy5sZW5ndGg7XG5cdFx0XHR2YXIgc3RlcElzRnVuY3Rpb24gPSB0eXBlb2Ygc3RlcCA9PT0gJ2Z1bmN0aW9uJztcblxuXHRcdFx0Ly8gRXN0YWJsaXNoIHN0YXJ0aW5nIHN0YXRlXG5cdFx0XHRjdXJzb3IgPSAwO1xuXHRcdFx0dmFyIGRhdGEgPSBbXSwgZXJyb3JzID0gW10sIHJvdyA9IFtdLCBsYXN0Q3Vyc29yID0gMDtcblxuXHRcdFx0aWYgKCFpbnB1dClcblx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblxuXHRcdFx0aWYgKGZhc3RNb2RlIHx8IChmYXN0TW9kZSAhPT0gZmFsc2UgJiYgaW5wdXQuaW5kZXhPZignXCInKSA9PT0gLTEpKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcm93cyA9IGlucHV0LnNwbGl0KG5ld2xpbmUpO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgcm93ID0gcm93c1tpXTtcblx0XHRcdFx0XHRjdXJzb3IgKz0gcm93Lmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoaSAhPT0gcm93cy5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdFx0Y3Vyc29yICs9IG5ld2xpbmUubGVuZ3RoO1xuXHRcdFx0XHRcdGVsc2UgaWYgKGlnbm9yZUxhc3RSb3cpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRcdGlmIChjb21tZW50cyAmJiByb3cuc3Vic3RyKDAsIGNvbW1lbnRzTGVuKSA9PSBjb21tZW50cylcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdGlmIChzdGVwSXNGdW5jdGlvbilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRkYXRhID0gW107XG5cdFx0XHRcdFx0XHRwdXNoUm93KHJvdy5zcGxpdChkZWxpbSkpO1xuXHRcdFx0XHRcdFx0ZG9TdGVwKCk7XG5cdFx0XHRcdFx0XHRpZiAoYWJvcnRlZClcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cHVzaFJvdyhyb3cuc3BsaXQoZGVsaW0pKTtcblx0XHRcdFx0XHRpZiAocHJldmlldyAmJiBpID49IHByZXZpZXcpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZGF0YSA9IGRhdGEuc2xpY2UoMCwgcHJldmlldyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSh0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIG5leHREZWxpbSA9IGlucHV0LmluZGV4T2YoZGVsaW0sIGN1cnNvcik7XG5cdFx0XHR2YXIgbmV4dE5ld2xpbmUgPSBpbnB1dC5pbmRleE9mKG5ld2xpbmUsIGN1cnNvcik7XG5cblx0XHRcdC8vIFBhcnNlciBsb29wXG5cdFx0XHRmb3IgKDs7KVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBGaWVsZCBoYXMgb3BlbmluZyBxdW90ZVxuXHRcdFx0XHRpZiAoaW5wdXRbY3Vyc29yXSA9PSAnXCInKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgb3VyIHNlYXJjaCBmb3IgdGhlIGNsb3NpbmcgcXVvdGUgd2hlcmUgdGhlIGN1cnNvciBpc1xuXHRcdFx0XHRcdHZhciBxdW90ZVNlYXJjaCA9IGN1cnNvcjtcblxuXHRcdFx0XHRcdC8vIFNraXAgdGhlIG9wZW5pbmcgcXVvdGVcblx0XHRcdFx0XHRjdXJzb3IrKztcblxuXHRcdFx0XHRcdGZvciAoOzspXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gRmluZCBjbG9zaW5nIHF1b3RlXG5cdFx0XHRcdFx0XHR2YXIgcXVvdGVTZWFyY2ggPSBpbnB1dC5pbmRleE9mKCdcIicsIHF1b3RlU2VhcmNoKzEpO1xuXG5cdFx0XHRcdFx0XHRpZiAocXVvdGVTZWFyY2ggPT09IC0xKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoIWlnbm9yZUxhc3RSb3cpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBObyBjbG9zaW5nIHF1b3RlLi4uIHdoYXQgYSBwaXR5XG5cdFx0XHRcdFx0XHRcdFx0ZXJyb3JzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJRdW90ZXNcIixcblx0XHRcdFx0XHRcdFx0XHRcdGNvZGU6IFwiTWlzc2luZ1F1b3Rlc1wiLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogXCJRdW90ZWQgZmllbGQgdW50ZXJtaW5hdGVkXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRyb3c6IGRhdGEubGVuZ3RoLFx0Ly8gcm93IGhhcyB5ZXQgdG8gYmUgaW5zZXJ0ZWRcblx0XHRcdFx0XHRcdFx0XHRcdGluZGV4OiBjdXJzb3Jcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmluaXNoKCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChxdW90ZVNlYXJjaCA9PT0gaW5wdXRMZW4tMSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Ly8gQ2xvc2luZyBxdW90ZSBhdCBFT0Zcblx0XHRcdFx0XHRcdFx0dmFyIHZhbHVlID0gaW5wdXQuc3Vic3RyaW5nKGN1cnNvciwgcXVvdGVTZWFyY2gpLnJlcGxhY2UoL1wiXCIvZywgJ1wiJyk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmaW5pc2godmFsdWUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGlzIHF1b3RlIGlzIGVzY2FwZWQsIGl0J3MgcGFydCBvZiB0aGUgZGF0YTsgc2tpcCBpdFxuXHRcdFx0XHRcdFx0aWYgKGlucHV0W3F1b3RlU2VhcmNoKzFdID09ICdcIicpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHF1b3RlU2VhcmNoKys7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoaW5wdXRbcXVvdGVTZWFyY2grMV0gPT0gZGVsaW0pXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdC8vIENsb3NpbmcgcXVvdGUgZm9sbG93ZWQgYnkgZGVsaW1pdGVyXG5cdFx0XHRcdFx0XHRcdHJvdy5wdXNoKGlucHV0LnN1YnN0cmluZyhjdXJzb3IsIHF1b3RlU2VhcmNoKS5yZXBsYWNlKC9cIlwiL2csICdcIicpKTtcblx0XHRcdFx0XHRcdFx0Y3Vyc29yID0gcXVvdGVTZWFyY2ggKyAxICsgZGVsaW1MZW47XG5cdFx0XHRcdFx0XHRcdG5leHREZWxpbSA9IGlucHV0LmluZGV4T2YoZGVsaW0sIGN1cnNvcik7XG5cdFx0XHRcdFx0XHRcdG5leHROZXdsaW5lID0gaW5wdXQuaW5kZXhPZihuZXdsaW5lLCBjdXJzb3IpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGlucHV0LnN1YnN0cihxdW90ZVNlYXJjaCsxLCBuZXdsaW5lTGVuKSA9PT0gbmV3bGluZSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Ly8gQ2xvc2luZyBxdW90ZSBmb2xsb3dlZCBieSBuZXdsaW5lXG5cdFx0XHRcdFx0XHRcdHJvdy5wdXNoKGlucHV0LnN1YnN0cmluZyhjdXJzb3IsIHF1b3RlU2VhcmNoKS5yZXBsYWNlKC9cIlwiL2csICdcIicpKTtcblx0XHRcdFx0XHRcdFx0c2F2ZVJvdyhxdW90ZVNlYXJjaCArIDEgKyBuZXdsaW5lTGVuKTtcblx0XHRcdFx0XHRcdFx0bmV4dERlbGltID0gaW5wdXQuaW5kZXhPZihkZWxpbSwgY3Vyc29yKTtcdC8vIGJlY2F1c2Ugd2UgbWF5IGhhdmUgc2tpcHBlZCB0aGUgbmV4dERlbGltIGluIHRoZSBxdW90ZWQgZmllbGRcblxuXHRcdFx0XHRcdFx0XHRpZiAoc3RlcElzRnVuY3Rpb24pXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRkb1N0ZXAoKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoYWJvcnRlZClcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdGlmIChwcmV2aWV3ICYmIGRhdGEubGVuZ3RoID49IHByZXZpZXcpXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUodHJ1ZSk7XG5cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDb21tZW50IGZvdW5kIGF0IHN0YXJ0IG9mIG5ldyBsaW5lXG5cdFx0XHRcdGlmIChjb21tZW50cyAmJiByb3cubGVuZ3RoID09PSAwICYmIGlucHV0LnN1YnN0cihjdXJzb3IsIGNvbW1lbnRzTGVuKSA9PT0gY29tbWVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAobmV4dE5ld2xpbmUgPT0gLTEpXHQvLyBDb21tZW50IGVuZHMgYXQgRU9GXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRcdGN1cnNvciA9IG5leHROZXdsaW5lICsgbmV3bGluZUxlbjtcblx0XHRcdFx0XHRuZXh0TmV3bGluZSA9IGlucHV0LmluZGV4T2YobmV3bGluZSwgY3Vyc29yKTtcblx0XHRcdFx0XHRuZXh0RGVsaW0gPSBpbnB1dC5pbmRleE9mKGRlbGltLCBjdXJzb3IpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTmV4dCBkZWxpbWl0ZXIgY29tZXMgYmVmb3JlIG5leHQgbmV3bGluZSwgc28gd2UndmUgcmVhY2hlZCBlbmQgb2YgZmllbGRcblx0XHRcdFx0aWYgKG5leHREZWxpbSAhPT0gLTEgJiYgKG5leHREZWxpbSA8IG5leHROZXdsaW5lIHx8IG5leHROZXdsaW5lID09PSAtMSkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyb3cucHVzaChpbnB1dC5zdWJzdHJpbmcoY3Vyc29yLCBuZXh0RGVsaW0pKTtcblx0XHRcdFx0XHRjdXJzb3IgPSBuZXh0RGVsaW0gKyBkZWxpbUxlbjtcblx0XHRcdFx0XHRuZXh0RGVsaW0gPSBpbnB1dC5pbmRleE9mKGRlbGltLCBjdXJzb3IpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRW5kIG9mIHJvd1xuXHRcdFx0XHRpZiAobmV4dE5ld2xpbmUgIT09IC0xKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cm93LnB1c2goaW5wdXQuc3Vic3RyaW5nKGN1cnNvciwgbmV4dE5ld2xpbmUpKTtcblx0XHRcdFx0XHRzYXZlUm93KG5leHROZXdsaW5lICsgbmV3bGluZUxlbik7XG5cblx0XHRcdFx0XHRpZiAoc3RlcElzRnVuY3Rpb24pXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZG9TdGVwKCk7XG5cdFx0XHRcdFx0XHRpZiAoYWJvcnRlZClcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocHJldmlldyAmJiBkYXRhLmxlbmd0aCA+PSBwcmV2aWV3KVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUodHJ1ZSk7XG5cblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cblx0XHRcdHJldHVybiBmaW5pc2goKTtcblxuXG5cdFx0XHRmdW5jdGlvbiBwdXNoUm93KHJvdylcblx0XHRcdHtcblx0XHRcdFx0ZGF0YS5wdXNoKHJvdyk7XG5cdFx0XHRcdGxhc3RDdXJzb3IgPSBjdXJzb3I7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQXBwZW5kcyB0aGUgcmVtYWluaW5nIGlucHV0IGZyb20gY3Vyc29yIHRvIHRoZSBlbmQgaW50b1xuXHRcdFx0ICogcm93LCBzYXZlcyB0aGUgcm93LCBjYWxscyBzdGVwLCBhbmQgcmV0dXJucyB0aGUgcmVzdWx0cy5cblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gZmluaXNoKHZhbHVlKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoaWdub3JlTGFzdFJvdylcblx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHR2YWx1ZSA9IGlucHV0LnN1YnN0cihjdXJzb3IpO1xuXHRcdFx0XHRyb3cucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdGN1cnNvciA9IGlucHV0TGVuO1x0Ly8gaW1wb3J0YW50IGluIGNhc2UgcGFyc2luZyBpcyBwYXVzZWRcblx0XHRcdFx0cHVzaFJvdyhyb3cpO1xuXHRcdFx0XHRpZiAoc3RlcElzRnVuY3Rpb24pXG5cdFx0XHRcdFx0ZG9TdGVwKCk7XG5cdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQXBwZW5kcyB0aGUgY3VycmVudCByb3cgdG8gdGhlIHJlc3VsdHMuIEl0IHNldHMgdGhlIGN1cnNvclxuXHRcdFx0ICogdG8gbmV3Q3Vyc29yIGFuZCBmaW5kcyB0aGUgbmV4dE5ld2xpbmUuIFRoZSBjYWxsZXIgc2hvdWxkXG5cdFx0XHQgKiB0YWtlIGNhcmUgdG8gZXhlY3V0ZSB1c2VyJ3Mgc3RlcCBmdW5jdGlvbiBhbmQgY2hlY2sgZm9yXG5cdFx0XHQgKiBwcmV2aWV3IGFuZCBlbmQgcGFyc2luZyBpZiBuZWNlc3NhcnkuXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIHNhdmVSb3cobmV3Q3Vyc29yKVxuXHRcdFx0e1xuXHRcdFx0XHRjdXJzb3IgPSBuZXdDdXJzb3I7XG5cdFx0XHRcdHB1c2hSb3cocm93KTtcblx0XHRcdFx0cm93ID0gW107XG5cdFx0XHRcdG5leHROZXdsaW5lID0gaW5wdXQuaW5kZXhPZihuZXdsaW5lLCBjdXJzb3IpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKiogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgcmVzdWx0cywgZXJyb3JzLCBhbmQgbWV0YS4gKi9cblx0XHRcdGZ1bmN0aW9uIHJldHVybmFibGUoc3RvcHBlZClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0XHRcdGVycm9yczogZXJyb3JzLFxuXHRcdFx0XHRcdG1ldGE6IHtcblx0XHRcdFx0XHRcdGRlbGltaXRlcjogZGVsaW0sXG5cdFx0XHRcdFx0XHRsaW5lYnJlYWs6IG5ld2xpbmUsXG5cdFx0XHRcdFx0XHRhYm9ydGVkOiBhYm9ydGVkLFxuXHRcdFx0XHRcdFx0dHJ1bmNhdGVkOiAhIXN0b3BwZWQsXG5cdFx0XHRcdFx0XHRjdXJzb3I6IGxhc3RDdXJzb3IgKyAoYmFzZUluZGV4IHx8IDApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvKiogRXhlY3V0ZXMgdGhlIHVzZXIncyBzdGVwIGZ1bmN0aW9uIGFuZCByZXNldHMgZGF0YSAmIGVycm9ycy4gKi9cblx0XHRcdGZ1bmN0aW9uIGRvU3RlcCgpXG5cdFx0XHR7XG5cdFx0XHRcdHN0ZXAocmV0dXJuYWJsZSgpKTtcblx0XHRcdFx0ZGF0YSA9IFtdLCBlcnJvcnMgPSBbXTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqIFNldHMgdGhlIGFib3J0IGZsYWcgKi9cblx0XHR0aGlzLmFib3J0ID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdGFib3J0ZWQgPSB0cnVlO1xuXHRcdH07XG5cblx0XHQvKiogR2V0cyB0aGUgY3Vyc29yIHBvc2l0aW9uICovXG5cdFx0dGhpcy5nZXRDaGFySW5kZXggPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGN1cnNvcjtcblx0XHR9O1xuXHR9XG5cblxuXHQvLyBJZiB5b3UgbmVlZCB0byBsb2FkIFBhcGEgUGFyc2UgYXN5bmNocm9ub3VzbHkgYW5kIHlvdSBhbHNvIG5lZWQgd29ya2VyIHRocmVhZHMsIGhhcmQtY29kZVxuXHQvLyB0aGUgc2NyaXB0IHBhdGggaGVyZS4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbWhvbHQvUGFwYVBhcnNlL2lzc3Vlcy84NyNpc3N1ZWNvbW1lbnQtNTc4ODUzNThcblx0ZnVuY3Rpb24gZ2V0U2NyaXB0UGF0aCgpXG5cdHtcblx0XHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblx0XHRyZXR1cm4gc2NyaXB0cy5sZW5ndGggPyBzY3JpcHRzW3NjcmlwdHMubGVuZ3RoIC0gMV0uc3JjIDogJyc7XG5cdH1cblxuXHRmdW5jdGlvbiBuZXdXb3JrZXIoKVxuXHR7XG5cdFx0aWYgKCFQYXBhLldPUktFUlNfU1VQUE9SVEVEKVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdGlmICghTE9BREVEX1NZTkMgJiYgUGFwYS5TQ1JJUFRfUEFUSCA9PT0gbnVsbClcblx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0J1NjcmlwdCBwYXRoIGNhbm5vdCBiZSBkZXRlcm1pbmVkIGF1dG9tYXRpY2FsbHkgd2hlbiBQYXBhIFBhcnNlIGlzIGxvYWRlZCBhc3luY2hyb25vdXNseS4gJyArXG5cdFx0XHRcdCdZb3UgbmVlZCB0byBzZXQgUGFwYS5TQ1JJUFRfUEFUSCBtYW51YWxseS4nXG5cdFx0XHQpO1xuXHRcdHZhciB3b3JrZXJVcmwgPSBQYXBhLlNDUklQVF9QQVRIIHx8IEFVVE9fU0NSSVBUX1BBVEg7XG5cdFx0Ly8gQXBwZW5kIFwicGFwYXdvcmtlclwiIHRvIHRoZSBzZWFyY2ggc3RyaW5nIHRvIHRlbGwgcGFwYXBhcnNlIHRoYXQgdGhpcyBpcyBvdXIgd29ya2VyLlxuXHRcdHdvcmtlclVybCArPSAod29ya2VyVXJsLmluZGV4T2YoJz8nKSAhPT0gLTEgPyAnJicgOiAnPycpICsgJ3BhcGF3b3JrZXInO1xuXHRcdHZhciB3ID0gbmV3IGdsb2JhbC5Xb3JrZXIod29ya2VyVXJsKTtcblx0XHR3Lm9ubWVzc2FnZSA9IG1haW5UaHJlYWRSZWNlaXZlZE1lc3NhZ2U7XG5cdFx0dy5pZCA9IHdvcmtlcklkQ291bnRlcisrO1xuXHRcdHdvcmtlcnNbdy5pZF0gPSB3O1xuXHRcdHJldHVybiB3O1xuXHR9XG5cblx0LyoqIENhbGxiYWNrIHdoZW4gbWFpbiB0aHJlYWQgcmVjZWl2ZXMgYSBtZXNzYWdlICovXG5cdGZ1bmN0aW9uIG1haW5UaHJlYWRSZWNlaXZlZE1lc3NhZ2UoZSlcblx0e1xuXHRcdHZhciBtc2cgPSBlLmRhdGE7XG5cdFx0dmFyIHdvcmtlciA9IHdvcmtlcnNbbXNnLndvcmtlcklkXTtcblx0XHR2YXIgYWJvcnRlZCA9IGZhbHNlO1xuXG5cdFx0aWYgKG1zZy5lcnJvcilcblx0XHRcdHdvcmtlci51c2VyRXJyb3IobXNnLmVycm9yLCBtc2cuZmlsZSk7XG5cdFx0ZWxzZSBpZiAobXNnLnJlc3VsdHMgJiYgbXNnLnJlc3VsdHMuZGF0YSlcblx0XHR7XG5cdFx0XHR2YXIgYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0YWJvcnRlZCA9IHRydWU7XG5cdFx0XHRcdGNvbXBsZXRlV29ya2VyKG1zZy53b3JrZXJJZCwgeyBkYXRhOiBbXSwgZXJyb3JzOiBbXSwgbWV0YTogeyBhYm9ydGVkOiB0cnVlIH0gfSk7XG5cdFx0XHR9O1xuXG5cdFx0XHR2YXIgaGFuZGxlID0ge1xuXHRcdFx0XHRhYm9ydDogYWJvcnQsXG5cdFx0XHRcdHBhdXNlOiBub3RJbXBsZW1lbnRlZCxcblx0XHRcdFx0cmVzdW1lOiBub3RJbXBsZW1lbnRlZFxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKGlzRnVuY3Rpb24od29ya2VyLnVzZXJTdGVwKSlcblx0XHRcdHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtc2cucmVzdWx0cy5kYXRhLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0d29ya2VyLnVzZXJTdGVwKHtcblx0XHRcdFx0XHRcdGRhdGE6IFttc2cucmVzdWx0cy5kYXRhW2ldXSxcblx0XHRcdFx0XHRcdGVycm9yczogbXNnLnJlc3VsdHMuZXJyb3JzLFxuXHRcdFx0XHRcdFx0bWV0YTogbXNnLnJlc3VsdHMubWV0YVxuXHRcdFx0XHRcdH0sIGhhbmRsZSk7XG5cdFx0XHRcdFx0aWYgKGFib3J0ZWQpXG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRkZWxldGUgbXNnLnJlc3VsdHM7XHQvLyBmcmVlIG1lbW9yeSBBU0FQXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChpc0Z1bmN0aW9uKHdvcmtlci51c2VyQ2h1bmspKVxuXHRcdFx0e1xuXHRcdFx0XHR3b3JrZXIudXNlckNodW5rKG1zZy5yZXN1bHRzLCBoYW5kbGUsIG1zZy5maWxlKTtcblx0XHRcdFx0ZGVsZXRlIG1zZy5yZXN1bHRzO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChtc2cuZmluaXNoZWQgJiYgIWFib3J0ZWQpXG5cdFx0XHRjb21wbGV0ZVdvcmtlcihtc2cud29ya2VySWQsIG1zZy5yZXN1bHRzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbXBsZXRlV29ya2VyKHdvcmtlcklkLCByZXN1bHRzKSB7XG5cdFx0dmFyIHdvcmtlciA9IHdvcmtlcnNbd29ya2VySWRdO1xuXHRcdGlmIChpc0Z1bmN0aW9uKHdvcmtlci51c2VyQ29tcGxldGUpKVxuXHRcdFx0d29ya2VyLnVzZXJDb21wbGV0ZShyZXN1bHRzKTtcblx0XHR3b3JrZXIudGVybWluYXRlKCk7XG5cdFx0ZGVsZXRlIHdvcmtlcnNbd29ya2VySWRdO1xuXHR9XG5cblx0ZnVuY3Rpb24gbm90SW1wbGVtZW50ZWQoKSB7XG5cdFx0dGhyb3cgXCJOb3QgaW1wbGVtZW50ZWQuXCI7XG5cdH1cblxuXHQvKiogQ2FsbGJhY2sgd2hlbiB3b3JrZXIgdGhyZWFkIHJlY2VpdmVzIGEgbWVzc2FnZSAqL1xuXHRmdW5jdGlvbiB3b3JrZXJUaHJlYWRSZWNlaXZlZE1lc3NhZ2UoZSlcblx0e1xuXHRcdHZhciBtc2cgPSBlLmRhdGE7XG5cblx0XHRpZiAodHlwZW9mIFBhcGEuV09SS0VSX0lEID09PSAndW5kZWZpbmVkJyAmJiBtc2cpXG5cdFx0XHRQYXBhLldPUktFUl9JRCA9IG1zZy53b3JrZXJJZDtcblxuXHRcdGlmICh0eXBlb2YgbXNnLmlucHV0ID09PSAnc3RyaW5nJylcblx0XHR7XG5cdFx0XHRnbG9iYWwucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHR3b3JrZXJJZDogUGFwYS5XT1JLRVJfSUQsXG5cdFx0XHRcdHJlc3VsdHM6IFBhcGEucGFyc2UobXNnLmlucHV0LCBtc2cuY29uZmlnKSxcblx0XHRcdFx0ZmluaXNoZWQ6IHRydWVcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIGlmICgoZ2xvYmFsLkZpbGUgJiYgbXNnLmlucHV0IGluc3RhbmNlb2YgRmlsZSkgfHwgbXNnLmlucHV0IGluc3RhbmNlb2YgT2JqZWN0KVx0Ly8gdGhhbmsgeW91LCBTYWZhcmkgKHNlZSBpc3N1ZSAjMTA2KVxuXHRcdHtcblx0XHRcdHZhciByZXN1bHRzID0gUGFwYS5wYXJzZShtc2cuaW5wdXQsIG1zZy5jb25maWcpO1xuXHRcdFx0aWYgKHJlc3VsdHMpXG5cdFx0XHRcdGdsb2JhbC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0d29ya2VySWQ6IFBhcGEuV09SS0VSX0lELFxuXHRcdFx0XHRcdHJlc3VsdHM6IHJlc3VsdHMsXG5cdFx0XHRcdFx0ZmluaXNoZWQ6IHRydWVcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqIE1ha2VzIGEgZGVlcCBjb3B5IG9mIGFuIGFycmF5IG9yIG9iamVjdCAobW9zdGx5KSAqL1xuXHRmdW5jdGlvbiBjb3B5KG9iailcblx0e1xuXHRcdGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jylcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0dmFyIGNweSA9IG9iaiBpbnN0YW5jZW9mIEFycmF5ID8gW10gOiB7fTtcblx0XHRmb3IgKHZhciBrZXkgaW4gb2JqKVxuXHRcdFx0Y3B5W2tleV0gPSBjb3B5KG9ialtrZXldKTtcblx0XHRyZXR1cm4gY3B5O1xuXHR9XG5cblx0ZnVuY3Rpb24gYmluZEZ1bmN0aW9uKGYsIHNlbGYpXG5cdHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7IGYuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTsgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzRnVuY3Rpb24oZnVuYylcblx0e1xuXHRcdHJldHVybiB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJztcblx0fVxufSkodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBzdHJpY3RVcmlFbmNvZGUgPSByZXF1aXJlKCdzdHJpY3QtdXJpLWVuY29kZScpO1xudmFyIG9iamVjdEFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKTtcblxuZnVuY3Rpb24gZW5jb2RlKHZhbHVlLCBvcHRzKSB7XG5cdGlmIChvcHRzLmVuY29kZSkge1xuXHRcdHJldHVybiBvcHRzLnN0cmljdCA/IHN0cmljdFVyaUVuY29kZSh2YWx1ZSkgOiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXHR9XG5cblx0cmV0dXJuIHZhbHVlO1xufVxuXG5leHBvcnRzLmV4dHJhY3QgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdHJldHVybiBzdHIuc3BsaXQoJz8nKVsxXSB8fCAnJztcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdC8vIENyZWF0ZSBhbiBvYmplY3Qgd2l0aCBubyBwcm90b3R5cGVcblx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmcvaXNzdWVzLzQ3XG5cdHZhciByZXQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybiByZXQ7XG5cdH1cblxuXHRzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoL14oXFw/fCN8JikvLCAnJyk7XG5cblx0aWYgKCFzdHIpIHtcblx0XHRyZXR1cm4gcmV0O1xuXHR9XG5cblx0c3RyLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0pIHtcblx0XHR2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuXHRcdC8vIEZpcmVmb3ggKHByZSA0MCkgZGVjb2RlcyBgJTNEYCB0byBgPWBcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZy9wdWxsLzM3XG5cdFx0dmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG5cdFx0dmFyIHZhbCA9IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCc9JykgOiB1bmRlZmluZWQ7XG5cblx0XHRrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuXHRcdC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG5cdFx0Ly8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuXHRcdHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG5cdFx0aWYgKHJldFtrZXldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldFtrZXldID0gdmFsO1xuXHRcdH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcblx0XHRcdHJldFtrZXldLnB1c2godmFsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG5cdFx0fVxuXHR9KTtcblxuXHRyZXR1cm4gcmV0O1xufTtcblxuZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAob2JqLCBvcHRzKSB7XG5cdHZhciBkZWZhdWx0cyA9IHtcblx0XHRlbmNvZGU6IHRydWUsXG5cdFx0c3RyaWN0OiB0cnVlXG5cdH07XG5cblx0b3B0cyA9IG9iamVjdEFzc2lnbihkZWZhdWx0cywgb3B0cyk7XG5cblx0cmV0dXJuIG9iaiA/IE9iamVjdC5rZXlzKG9iaikuc29ydCgpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0dmFyIHZhbCA9IG9ialtrZXldO1xuXG5cdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXG5cdFx0aWYgKHZhbCA9PT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShrZXksIG9wdHMpO1xuXHRcdH1cblxuXHRcdGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcblx0XHRcdHZhciByZXN1bHQgPSBbXTtcblxuXHRcdFx0dmFsLnNsaWNlKCkuZm9yRWFjaChmdW5jdGlvbiAodmFsMikge1xuXHRcdFx0XHRpZiAodmFsMiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHZhbDIgPT09IG51bGwpIHtcblx0XHRcdFx0XHRyZXN1bHQucHVzaChlbmNvZGUoa2V5LCBvcHRzKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0LnB1c2goZW5jb2RlKGtleSwgb3B0cykgKyAnPScgKyBlbmNvZGUodmFsMiwgb3B0cykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHJlc3VsdC5qb2luKCcmJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGVuY29kZShrZXksIG9wdHMpICsgJz0nICsgZW5jb2RlKHZhbCwgb3B0cyk7XG5cdH0pLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuXHRcdHJldHVybiB4Lmxlbmd0aCA+IDA7XG5cdH0pLmpvaW4oJyYnKSA6ICcnO1xufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cikge1xuXHRyZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cikucmVwbGFjZSgvWyEnKCkqXS9nLCBmdW5jdGlvbiAoYykge1xuXHRcdHJldHVybiAnJScgKyBjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmNvbnN0IEhFQURfRUxCT1dfT0ZGU0VUID0gbmV3IFRIUkVFLlZlY3RvcjMoMC4xNTUsIC0wLjQ2NSwgLTAuMTUpO1xuY29uc3QgRUxCT1dfV1JJU1RfT0ZGU0VUID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTAuMjUpO1xuY29uc3QgV1JJU1RfQ09OVFJPTExFUl9PRkZTRVQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwLjA1KTtcbmNvbnN0IEFSTV9FWFRFTlNJT05fT0ZGU0VUID0gbmV3IFRIUkVFLlZlY3RvcjMoLTAuMDgsIDAuMTQsIDAuMDgpO1xuXG5jb25zdCBFTEJPV19CRU5EX1JBVElPID0gMC40OyAvLyA0MCUgZWxib3csIDYwJSB3cmlzdC5cbmNvbnN0IEVYVEVOU0lPTl9SQVRJT19XRUlHSFQgPSAwLjQ7XG5cbmNvbnN0IE1JTl9BTkdVTEFSX1NQRUVEID0gMC42MTsgLy8gMzUgZGVncmVlcyBwZXIgc2Vjb25kIChpbiByYWRpYW5zKS5cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBhcm0gbW9kZWwgZm9yIHRoZSBEYXlkcmVhbSBjb250cm9sbGVyLiBGZWVkIGl0IGEgY2FtZXJhIGFuZFxuICogdGhlIGNvbnRyb2xsZXIuIFVwZGF0ZSBpdCBvbiBhIFJBRi5cbiAqXG4gKiBHZXQgdGhlIG1vZGVsJ3MgcG9zZSB1c2luZyBnZXRQb3NlKCkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9yaWVudGF0aW9uQXJtTW9kZWwge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmlzTGVmdEhhbmRlZCA9IGZhbHNlO1xuXG4gICAgLy8gQ3VycmVudCBhbmQgcHJldmlvdXMgY29udHJvbGxlciBvcmllbnRhdGlvbnMuXG4gICAgdGhpcy5jb250cm9sbGVyUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gICAgdGhpcy5sYXN0Q29udHJvbGxlclEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gICAgLy8gQ3VycmVudCBhbmQgcHJldmlvdXMgaGVhZCBvcmllbnRhdGlvbnMuXG4gICAgdGhpcy5oZWFkUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgICAvLyBDdXJyZW50IGhlYWQgcG9zaXRpb24uXG4gICAgdGhpcy5oZWFkUG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAgIC8vIFBvc2l0aW9ucyBvZiBvdGhlciBqb2ludHMgKG1vc3RseSBmb3IgZGVidWdnaW5nKS5cbiAgICB0aGlzLmVsYm93UG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICB0aGlzLndyaXN0UG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAgIC8vIEN1cnJlbnQgYW5kIHByZXZpb3VzIHRpbWVzIHRoZSBtb2RlbCB3YXMgdXBkYXRlZC5cbiAgICB0aGlzLnRpbWUgPSBudWxsO1xuICAgIHRoaXMubGFzdFRpbWUgPSBudWxsO1xuXG4gICAgLy8gUm9vdCByb3RhdGlvbi5cbiAgICB0aGlzLnJvb3RRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAgIC8vIEN1cnJlbnQgcG9zZSB0aGF0IHRoaXMgYXJtIG1vZGVsIGNhbGN1bGF0ZXMuXG4gICAgdGhpcy5wb3NlID0ge1xuICAgICAgb3JpZW50YXRpb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCksXG4gICAgICBwb3NpdGlvbjogbmV3IFRIUkVFLlZlY3RvcjMoKVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kcyB0byBzZXQgY29udHJvbGxlciBhbmQgaGVhZCBwb3NlIChpbiB3b3JsZCBjb29yZGluYXRlcykuXG4gICAqL1xuICBzZXRDb250cm9sbGVyT3JpZW50YXRpb24ocXVhdGVybmlvbikge1xuICAgIHRoaXMubGFzdENvbnRyb2xsZXJRLmNvcHkodGhpcy5jb250cm9sbGVyUSk7XG4gICAgdGhpcy5jb250cm9sbGVyUS5jb3B5KHF1YXRlcm5pb24pO1xuICB9XG5cbiAgc2V0SGVhZE9yaWVudGF0aW9uKHF1YXRlcm5pb24pIHtcbiAgICB0aGlzLmhlYWRRLmNvcHkocXVhdGVybmlvbik7XG4gIH1cblxuICBzZXRIZWFkUG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLmhlYWRQb3MuY29weShwb3NpdGlvbik7XG4gIH1cblxuICBzZXRMZWZ0SGFuZGVkKGlzTGVmdEhhbmRlZCkge1xuICAgIC8vIFRPRE8oc211cyk6IEltcGxlbWVudCBtZSFcbiAgICB0aGlzLmlzTGVmdEhhbmRlZCA9IGlzTGVmdEhhbmRlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgb24gYSBSQUYuXG4gICAqL1xuICB1cGRhdGUoKSB7XG4gICAgdGhpcy50aW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgICAvLyBJZiB0aGUgY29udHJvbGxlcidzIGFuZ3VsYXIgdmVsb2NpdHkgaXMgYWJvdmUgYSBjZXJ0YWluIGFtb3VudCwgd2UgY2FuXG4gICAgLy8gYXNzdW1lIHRvcnNvIHJvdGF0aW9uIGFuZCBtb3ZlIHRoZSBlbGJvdyBqb2ludCByZWxhdGl2ZSB0byB0aGVcbiAgICAvLyBjYW1lcmEgb3JpZW50YXRpb24uXG4gICAgbGV0IGhlYWRZYXdRID0gdGhpcy5nZXRIZWFkWWF3T3JpZW50YXRpb25fKCk7XG4gICAgbGV0IHRpbWVEZWx0YSA9ICh0aGlzLnRpbWUgLSB0aGlzLmxhc3RUaW1lKSAvIDEwMDA7XG4gICAgbGV0IGFuZ2xlRGVsdGEgPSB0aGlzLnF1YXRBbmdsZV8odGhpcy5sYXN0Q29udHJvbGxlclEsIHRoaXMuY29udHJvbGxlclEpO1xuICAgIGxldCBjb250cm9sbGVyQW5ndWxhclNwZWVkID0gYW5nbGVEZWx0YSAvIHRpbWVEZWx0YTtcbiAgICBpZiAoY29udHJvbGxlckFuZ3VsYXJTcGVlZCA+IE1JTl9BTkdVTEFSX1NQRUVEKSB7XG4gICAgICAvLyBBdHRlbnVhdGUgdGhlIFJvb3Qgcm90YXRpb24gc2xpZ2h0bHkuXG4gICAgICB0aGlzLnJvb3RRLnNsZXJwKGhlYWRZYXdRLCBhbmdsZURlbHRhIC8gMTApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucm9vdFEuY29weShoZWFkWWF3USk7XG4gICAgfVxuXG4gICAgLy8gV2Ugd2FudCB0byBtb3ZlIHRoZSBlbGJvdyB1cCBhbmQgdG8gdGhlIGNlbnRlciBhcyB0aGUgdXNlciBwb2ludHMgdGhlXG4gICAgLy8gY29udHJvbGxlciB1cHdhcmRzLCBzbyB0aGF0IHRoZXkgY2FuIGVhc2lseSBzZWUgdGhlIGNvbnRyb2xsZXIgYW5kIGl0c1xuICAgIC8vIHRvb2wgdGlwcy5cbiAgICBsZXQgY29udHJvbGxlckV1bGVyID0gbmV3IFRIUkVFLkV1bGVyKCkuc2V0RnJvbVF1YXRlcm5pb24odGhpcy5jb250cm9sbGVyUSwgJ1lYWicpO1xuICAgIGxldCBjb250cm9sbGVyWERlZyA9IFRIUkVFLk1hdGgucmFkVG9EZWcoY29udHJvbGxlckV1bGVyLngpO1xuICAgIGxldCBleHRlbnNpb25SYXRpbyA9IHRoaXMuY2xhbXBfKChjb250cm9sbGVyWERlZyAtIDExKSAvICg1MCAtIDExKSwgMCwgMSk7XG5cbiAgICAvLyBDb250cm9sbGVyIG9yaWVudGF0aW9uIGluIGNhbWVyYSBzcGFjZS5cbiAgICBsZXQgY29udHJvbGxlckNhbWVyYVEgPSB0aGlzLnJvb3RRLmNsb25lKCkuaW52ZXJzZSgpO1xuICAgIGNvbnRyb2xsZXJDYW1lcmFRLm11bHRpcGx5KHRoaXMuY29udHJvbGxlclEpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIGVsYm93IHBvc2l0aW9uLlxuICAgIGxldCBlbGJvd1BvcyA9IHRoaXMuZWxib3dQb3M7XG4gICAgZWxib3dQb3MuY29weSh0aGlzLmhlYWRQb3MpLmFkZChIRUFEX0VMQk9XX09GRlNFVCk7XG4gICAgbGV0IGVsYm93T2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jb3B5KEFSTV9FWFRFTlNJT05fT0ZGU0VUKTtcbiAgICBlbGJvd09mZnNldC5tdWx0aXBseVNjYWxhcihleHRlbnNpb25SYXRpbyk7XG4gICAgZWxib3dQb3MuYWRkKGVsYm93T2Zmc2V0KTtcblxuICAgIC8vIENhbGN1bGF0ZSBqb2ludCBhbmdsZXMuIEdlbmVyYWxseSA0MCUgb2Ygcm90YXRpb24gYXBwbGllZCB0byBlbGJvdywgNjAlXG4gICAgLy8gdG8gd3Jpc3QsIGJ1dCBpZiBjb250cm9sbGVyIGlzIHJhaXNlZCBoaWdoZXIsIG1vcmUgcm90YXRpb24gY29tZXMgZnJvbVxuICAgIC8vIHRoZSB3cmlzdC5cbiAgICBsZXQgdG90YWxBbmdsZSA9IHRoaXMucXVhdEFuZ2xlXyhjb250cm9sbGVyQ2FtZXJhUSwgbmV3IFRIUkVFLlF1YXRlcm5pb24oKSk7XG4gICAgbGV0IHRvdGFsQW5nbGVEZWcgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHRvdGFsQW5nbGUpO1xuICAgIGxldCBsZXJwU3VwcHJlc3Npb24gPSAxIC0gTWF0aC5wb3codG90YWxBbmdsZURlZyAvIDE4MCwgNCk7IC8vIFRPRE8oc211cyk6ID8/P1xuXG4gICAgbGV0IGVsYm93UmF0aW8gPSBFTEJPV19CRU5EX1JBVElPO1xuICAgIGxldCB3cmlzdFJhdGlvID0gMSAtIEVMQk9XX0JFTkRfUkFUSU87XG4gICAgbGV0IGxlcnBWYWx1ZSA9IGxlcnBTdXBwcmVzc2lvbiAqXG4gICAgICAgIChlbGJvd1JhdGlvICsgd3Jpc3RSYXRpbyAqIGV4dGVuc2lvblJhdGlvICogRVhURU5TSU9OX1JBVElPX1dFSUdIVCk7XG5cbiAgICBsZXQgd3Jpc3RRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5zbGVycChjb250cm9sbGVyQ2FtZXJhUSwgbGVycFZhbHVlKTtcbiAgICBsZXQgaW52V3Jpc3RRID0gd3Jpc3RRLmludmVyc2UoKTtcbiAgICBsZXQgZWxib3dRID0gY29udHJvbGxlckNhbWVyYVEuY2xvbmUoKS5tdWx0aXBseShpbnZXcmlzdFEpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIG91ciBmaW5hbCBjb250cm9sbGVyIHBvc2l0aW9uIGJhc2VkIG9uIGFsbCBvdXIgam9pbnQgcm90YXRpb25zXG4gICAgLy8gYW5kIGxlbmd0aHMuXG4gICAgLypcbiAgICBwb3NpdGlvbl8gPVxuICAgICAgcm9vdF9yb3RfICogKFxuICAgICAgICBjb250cm9sbGVyX3Jvb3Rfb2Zmc2V0XyArXG4yOiAgICAgIChhcm1fZXh0ZW5zaW9uXyAqIGFtdF9leHRlbnNpb24pICtcbjE6ICAgICAgZWxib3dfcm90ICogKGtDb250cm9sbGVyRm9yZWFybSArICh3cmlzdF9yb3QgKiBrQ29udHJvbGxlclBvc2l0aW9uKSlcbiAgICAgICk7XG4gICAgKi9cbiAgICBsZXQgd3Jpc3RQb3MgPSB0aGlzLndyaXN0UG9zO1xuICAgIHdyaXN0UG9zLmNvcHkoV1JJU1RfQ09OVFJPTExFUl9PRkZTRVQpO1xuICAgIHdyaXN0UG9zLmFwcGx5UXVhdGVybmlvbih3cmlzdFEpO1xuICAgIHdyaXN0UG9zLmFkZChFTEJPV19XUklTVF9PRkZTRVQpO1xuICAgIHdyaXN0UG9zLmFwcGx5UXVhdGVybmlvbihlbGJvd1EpO1xuICAgIHdyaXN0UG9zLmFkZCh0aGlzLmVsYm93UG9zKTtcblxuICAgIGxldCBvZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNvcHkoQVJNX0VYVEVOU0lPTl9PRkZTRVQpO1xuICAgIG9mZnNldC5tdWx0aXBseVNjYWxhcihleHRlbnNpb25SYXRpbyk7XG5cbiAgICBsZXQgcG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNvcHkodGhpcy53cmlzdFBvcyk7XG4gICAgcG9zaXRpb24uYWRkKG9mZnNldCk7XG4gICAgcG9zaXRpb24uYXBwbHlRdWF0ZXJuaW9uKHRoaXMucm9vdFEpO1xuXG4gICAgbGV0IG9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5jb3B5KHRoaXMuY29udHJvbGxlclEpO1xuXG4gICAgLy8gU2V0IHRoZSByZXN1bHRpbmcgcG9zZSBvcmllbnRhdGlvbiBhbmQgcG9zaXRpb24uXG4gICAgdGhpcy5wb3NlLm9yaWVudGF0aW9uLmNvcHkob3JpZW50YXRpb24pO1xuICAgIHRoaXMucG9zZS5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uKTtcblxuICAgIHRoaXMubGFzdFRpbWUgPSB0aGlzLnRpbWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcG9zZSBjYWxjdWxhdGVkIGJ5IHRoZSBtb2RlbC5cbiAgICovXG4gIGdldFBvc2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucG9zZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWJ1ZyBtZXRob2RzIGZvciByZW5kZXJpbmcgdGhlIGFybSBtb2RlbC5cbiAgICovXG4gIGdldEZvcmVhcm1MZW5ndGgoKSB7XG4gICAgcmV0dXJuIEVMQk9XX1dSSVNUX09GRlNFVC5sZW5ndGgoKTtcbiAgfVxuXG4gIGdldEVsYm93UG9zaXRpb24oKSB7XG4gICAgbGV0IG91dCA9IHRoaXMuZWxib3dQb3MuY2xvbmUoKTtcbiAgICByZXR1cm4gb3V0LmFwcGx5UXVhdGVybmlvbih0aGlzLnJvb3RRKTtcbiAgfVxuXG4gIGdldFdyaXN0UG9zaXRpb24oKSB7XG4gICAgbGV0IG91dCA9IHRoaXMud3Jpc3RQb3MuY2xvbmUoKTtcbiAgICByZXR1cm4gb3V0LmFwcGx5UXVhdGVybmlvbih0aGlzLnJvb3RRKTtcbiAgfVxuXG4gIGdldEhlYWRZYXdPcmllbnRhdGlvbl8oKSB7XG4gICAgbGV0IGhlYWRFdWxlciA9IG5ldyBUSFJFRS5FdWxlcigpLnNldEZyb21RdWF0ZXJuaW9uKHRoaXMuaGVhZFEsICdZWFonKTtcbiAgICBoZWFkRXVsZXIueCA9IDA7XG4gICAgaGVhZEV1bGVyLnogPSAwO1xuICAgIGxldCBkZXN0aW5hdGlvblEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLnNldEZyb21FdWxlcihoZWFkRXVsZXIpO1xuICAgIHJldHVybiBkZXN0aW5hdGlvblE7XG4gIH1cblxuICBjbGFtcF8odmFsdWUsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KHZhbHVlLCBtaW4pLCBtYXgpO1xuICB9XG5cbiAgcXVhdEFuZ2xlXyhxMSwgcTIpIHtcbiAgICBsZXQgdmVjMSA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0xKTtcbiAgICBsZXQgdmVjMiA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0xKTtcbiAgICB2ZWMxLmFwcGx5UXVhdGVybmlvbihxMSk7XG4gICAgdmVjMi5hcHBseVF1YXRlcm5pb24ocTIpO1xuICAgIHJldHVybiB2ZWMxLmFuZ2xlVG8odmVjMik7XG4gIH1cbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRlbWl0dGVyMydcbmltcG9ydCBJbnRlcmFjdGlvbk1vZGVzIGZyb20gJy4vcmF5LWludGVyYWN0aW9uLW1vZGVzJ1xuaW1wb3J0IHtpc01vYmlsZX0gZnJvbSAnLi91dGlsJ1xuXG5jb25zdCBEUkFHX0RJU1RBTkNFX1BYID0gMTA7XG5cbi8qKlxuICogRW51bWVyYXRlcyBhbGwgcG9zc2libGUgaW50ZXJhY3Rpb24gbW9kZXMuIFNldHMgdXAgYWxsIGV2ZW50IGhhbmRsZXJzIChtb3VzZSxcbiAqIHRvdWNoLCBldGMpLCBpbnRlcmZhY2VzIHdpdGggZ2FtZXBhZCBBUEkuXG4gKlxuICogRW1pdHMgZXZlbnRzOlxuICogICAgYWN0aW9uOiBJbnB1dCBpcyBhY3RpdmF0ZWQgKG1vdXNlZG93biwgdG91Y2hzdGFydCwgZGF5ZHJlYW0gY2xpY2ssIHZpdmVcbiAqICAgIHRyaWdnZXIpLlxuICogICAgcmVsZWFzZTogSW5wdXQgaXMgZGVhY3RpdmF0ZWQgKG1vdXNldXAsIHRvdWNoZW5kLCBkYXlkcmVhbSByZWxlYXNlLCB2aXZlXG4gKiAgICByZWxlYXNlKS5cbiAqICAgIGNhbmNlbDogSW5wdXQgaXMgY2FuY2VsZWQgKGVnLiB3ZSBzY3JvbGxlZCBpbnN0ZWFkIG9mIHRhcHBpbmcgb25cbiAqICAgIG1vYmlsZS9kZXNrdG9wKS5cbiAqICAgIHBvaW50ZXJtb3ZlKDJEIHBvc2l0aW9uKTogVGhlIHBvaW50ZXIgaXMgbW92ZWQgKG1vdXNlIG9yIHRvdWNoKS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmF5Q29udHJvbGxlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHJlbmRlcmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnJlbmRlcmVyID0gcmVuZGVyZXI7XG5cbiAgICB0aGlzLmF2YWlsYWJsZUludGVyYWN0aW9ucyA9IHt9O1xuXG4gICAgLy8gSGFuZGxlIGludGVyYWN0aW9ucy5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5vbk1vdXNlRG93bl8uYmluZCh0aGlzKSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmVfLmJpbmQodGhpcykpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcykpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGhpcy5vblRvdWNoU3RhcnRfLmJpbmQodGhpcykpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLm9uVG91Y2hNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLm9uVG91Y2hFbmRfLmJpbmQodGhpcykpO1xuXG4gICAgLy8gVGhlIHBvc2l0aW9uIG9mIHRoZSBwb2ludGVyLlxuICAgIHRoaXMucG9pbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgLy8gVGhlIHByZXZpb3VzIHBvc2l0aW9uIG9mIHRoZSBwb2ludGVyLlxuICAgIHRoaXMubGFzdFBvaW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIC8vIFBvc2l0aW9uIG9mIHBvaW50ZXIgaW4gTm9ybWFsaXplZCBEZXZpY2UgQ29vcmRpbmF0ZXMgKE5EQykuXG4gICAgdGhpcy5wb2ludGVyTmRjID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAvLyBIb3cgbXVjaCB3ZSBoYXZlIGRyYWdnZWQgKGlmIHdlIGFyZSBkcmFnZ2luZykuXG4gICAgdGhpcy5kcmFnRGlzdGFuY2UgPSAwO1xuICAgIC8vIEFyZSB3ZSBkcmFnZ2luZyBvciBub3QuXG4gICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgLy8gSXMgcG9pbnRlciBhY3RpdmUgb3Igbm90LlxuICAgIHRoaXMuaXNUb3VjaEFjdGl2ZSA9IGZhbHNlO1xuXG4gICAgLy8gR2FtZXBhZCBldmVudHMuXG4gICAgdGhpcy5nYW1lcGFkID0gbnVsbDtcblxuICAgIC8vIFZSIEV2ZW50cy5cbiAgICBpZiAoIW5hdmlnYXRvci5nZXRWUkRpc3BsYXlzKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1dlYlZSIEFQSSBub3QgYXZhaWxhYmxlISBDb25zaWRlciB1c2luZyB0aGUgd2VidnItcG9seWZpbGwuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hdmlnYXRvci5nZXRWUkRpc3BsYXlzKCkudGhlbigoZGlzcGxheXMpID0+IHtcbiAgICAgICAgdGhpcy52ckRpc3BsYXkgPSBkaXNwbGF5c1swXTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGdldEludGVyYWN0aW9uTW9kZSgpIHtcbiAgICAvLyBUT0RPOiBEZWJ1Z2dpbmcgb25seS5cbiAgICAvL3JldHVybiBJbnRlcmFjdGlvbk1vZGVzLkRBWURSRUFNO1xuXG4gICAgdmFyIGdhbWVwYWQgPSB0aGlzLmdldFZSR2FtZXBhZF8oKTtcblxuICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICBsZXQgcG9zZSA9IGdhbWVwYWQucG9zZTtcbiAgICAgIC8vIElmIHRoZXJlJ3MgYSBnYW1lcGFkIGNvbm5lY3RlZCwgZGV0ZXJtaW5lIGlmIGl0J3MgRGF5ZHJlYW0gb3IgYSBWaXZlLlxuICAgICAgaWYgKHBvc2UuaGFzUG9zaXRpb24pIHtcbiAgICAgICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuVlJfNkRPRjtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2UuaGFzT3JpZW50YXRpb24pIHtcbiAgICAgICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuVlJfM0RPRjtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSdzIG5vIGdhbWVwYWQsIGl0IG1pZ2h0IGJlIENhcmRib2FyZCwgbWFnaWMgd2luZG93IG9yIGRlc2t0b3AuXG4gICAgICBpZiAoaXNNb2JpbGUoKSkge1xuICAgICAgICAvLyBFaXRoZXIgQ2FyZGJvYXJkIG9yIG1hZ2ljIHdpbmRvdywgZGVwZW5kaW5nIG9uIHdoZXRoZXIgd2UgYXJlXG4gICAgICAgIC8vIHByZXNlbnRpbmcuXG4gICAgICAgIGlmICh0aGlzLnZyRGlzcGxheSAmJiB0aGlzLnZyRGlzcGxheS5pc1ByZXNlbnRpbmcpIHtcbiAgICAgICAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5WUl8wRE9GO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLlRPVUNIO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBXZSBtdXN0IGJlIG9uIGRlc2t0b3AuXG4gICAgICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLk1PVVNFO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBCeSBkZWZhdWx0LCB1c2UgVE9VQ0guXG4gICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuVE9VQ0g7XG4gIH1cblxuICBnZXRHYW1lcGFkUG9zZSgpIHtcbiAgICB2YXIgZ2FtZXBhZCA9IHRoaXMuZ2V0VlJHYW1lcGFkXygpO1xuICAgIHJldHVybiBnYW1lcGFkLnBvc2U7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGlmIHRoZXJlIGlzIGFuIGFjdGl2ZSB0b3VjaCBldmVudCBnb2luZyBvbi5cbiAgICogT25seSByZWxldmFudCBvbiB0b3VjaCBkZXZpY2VzXG4gICAqL1xuICBnZXRJc1RvdWNoQWN0aXZlKCkge1xuICAgIHJldHVybiB0aGlzLmlzVG91Y2hBY3RpdmU7XG4gIH1cblxuICBzZXRTaXplKHNpemUpIHtcbiAgICB0aGlzLnNpemUgPSBzaXplO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGxldCBtb2RlID0gdGhpcy5nZXRJbnRlcmFjdGlvbk1vZGUoKTtcbiAgICBpZiAobW9kZSA9PSBJbnRlcmFjdGlvbk1vZGVzLlZSXzNET0YgfHwgbW9kZSA9PSBJbnRlcmFjdGlvbk1vZGVzLlZSXzZET0YpIHtcbiAgICAgIC8vIElmIHdlJ3JlIGRlYWxpbmcgd2l0aCBhIGdhbWVwYWQsIGNoZWNrIGV2ZXJ5IGFuaW1hdGlvbiBmcmFtZSBmb3IgYVxuICAgICAgLy8gcHJlc3NlZCBhY3Rpb24uXG4gICAgICBsZXQgaXNHYW1lcGFkUHJlc3NlZCA9IHRoaXMuZ2V0R2FtZXBhZEJ1dHRvblByZXNzZWRfKCk7XG4gICAgICBpZiAoaXNHYW1lcGFkUHJlc3NlZCAmJiAhdGhpcy53YXNHYW1lcGFkUHJlc3NlZCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3JheWRvd24nKTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNHYW1lcGFkUHJlc3NlZCAmJiB0aGlzLndhc0dhbWVwYWRQcmVzc2VkKSB7XG4gICAgICAgIHRoaXMuZW1pdCgncmF5dXAnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMud2FzR2FtZXBhZFByZXNzZWQgPSBpc0dhbWVwYWRQcmVzc2VkO1xuICAgIH1cbiAgfVxuXG4gIGdldEdhbWVwYWRCdXR0b25QcmVzc2VkXygpIHtcbiAgICB2YXIgZ2FtZXBhZCA9IHRoaXMuZ2V0VlJHYW1lcGFkXygpO1xuICAgIGlmICghZ2FtZXBhZCkge1xuICAgICAgLy8gSWYgdGhlcmUncyBubyBnYW1lcGFkLCB0aGUgYnV0dG9uIHdhcyBub3QgcHJlc3NlZC5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIGNsaWNrcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGdhbWVwYWQuYnV0dG9ucy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tqXS5wcmVzc2VkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBvbk1vdXNlRG93bl8oZSkge1xuICAgIHRoaXMuc3RhcnREcmFnZ2luZ18oZSk7XG4gICAgdGhpcy5lbWl0KCdyYXlkb3duJyk7XG4gIH1cblxuICBvbk1vdXNlTW92ZV8oZSkge1xuICAgIHRoaXMudXBkYXRlUG9pbnRlcl8oZSk7XG4gICAgdGhpcy51cGRhdGVEcmFnRGlzdGFuY2VfKCk7XG4gICAgdGhpcy5lbWl0KCdwb2ludGVybW92ZScsIHRoaXMucG9pbnRlck5kYyk7XG4gIH1cblxuICBvbk1vdXNlVXBfKGUpIHtcbiAgICB0aGlzLmVuZERyYWdnaW5nXygpO1xuICB9XG5cbiAgb25Ub3VjaFN0YXJ0XyhlKSB7XG4gICAgdGhpcy5pc1RvdWNoQWN0aXZlID0gdHJ1ZTtcbiAgICB2YXIgdCA9IGUudG91Y2hlc1swXTtcbiAgICB0aGlzLnN0YXJ0RHJhZ2dpbmdfKHQpO1xuICAgIHRoaXMudXBkYXRlVG91Y2hQb2ludGVyXyhlKTtcblxuICAgIHRoaXMuZW1pdCgncG9pbnRlcm1vdmUnLCB0aGlzLnBvaW50ZXJOZGMpO1xuICAgIHRoaXMuZW1pdCgncmF5ZG93bicpO1xuXG4gICAgLy8gUHJldmVudCBzeW50aGV0aWMgbW91c2UgZXZlbnQgZnJvbSBiZWluZyBjcmVhdGVkLlxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfVxuXG4gIG9uVG91Y2hNb3ZlXyhlKSB7XG4gICAgdGhpcy51cGRhdGVUb3VjaFBvaW50ZXJfKGUpO1xuICAgIHRoaXMudXBkYXRlRHJhZ0Rpc3RhbmNlXygpO1xuXG4gICAgLy8gUHJldmVudCBzeW50aGV0aWMgbW91c2UgZXZlbnQgZnJvbSBiZWluZyBjcmVhdGVkLlxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfVxuXG4gIG9uVG91Y2hFbmRfKGUpIHtcbiAgICB0aGlzLmVuZERyYWdnaW5nXygpO1xuXG4gICAgLy8gUHJldmVudCBzeW50aGV0aWMgbW91c2UgZXZlbnQgZnJvbSBiZWluZyBjcmVhdGVkLlxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmlzVG91Y2hBY3RpdmUgPSBmYWxzZTtcbiAgfVxuXG4gIHVwZGF0ZVRvdWNoUG9pbnRlcl8oZSkge1xuICAgIC8vIElmIHRoZXJlJ3Mgbm8gdG91Y2hlcyBhcnJheSwgaWdub3JlLlxuICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1JlY2VpdmVkIHRvdWNoIGV2ZW50IHdpdGggbm8gdG91Y2hlcy4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHQgPSBlLnRvdWNoZXNbMF07XG4gICAgdGhpcy51cGRhdGVQb2ludGVyXyh0KTtcbiAgfVxuXG4gIHVwZGF0ZVBvaW50ZXJfKGUpIHtcbiAgICAvLyBIb3cgbXVjaCB0aGUgcG9pbnRlciBtb3ZlZC5cbiAgICB0aGlzLnBvaW50ZXIuc2V0KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcbiAgICB0aGlzLnBvaW50ZXJOZGMueCA9IChlLmNsaWVudFggLyB0aGlzLnNpemUud2lkdGgpICogMiAtIDE7XG4gICAgdGhpcy5wb2ludGVyTmRjLnkgPSAtIChlLmNsaWVudFkgLyB0aGlzLnNpemUuaGVpZ2h0KSAqIDIgKyAxO1xuICB9XG5cbiAgdXBkYXRlRHJhZ0Rpc3RhbmNlXygpIHtcbiAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSB7XG4gICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLmxhc3RQb2ludGVyLnN1Yih0aGlzLnBvaW50ZXIpLmxlbmd0aCgpO1xuICAgICAgdGhpcy5kcmFnRGlzdGFuY2UgKz0gZGlzdGFuY2U7XG4gICAgICB0aGlzLmxhc3RQb2ludGVyLmNvcHkodGhpcy5wb2ludGVyKTtcblxuXG4gICAgICAvL2NvbnNvbGUubG9nKCdkcmFnRGlzdGFuY2UnLCB0aGlzLmRyYWdEaXN0YW5jZSk7XG4gICAgICBpZiAodGhpcy5kcmFnRGlzdGFuY2UgPiBEUkFHX0RJU1RBTkNFX1BYKSB7XG4gICAgICAgIHRoaXMuZW1pdCgncmF5Y2FuY2VsJyk7XG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHN0YXJ0RHJhZ2dpbmdfKGUpIHtcbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgIHRoaXMubGFzdFBvaW50ZXIuc2V0KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcbiAgfVxuXG4gIGVuZERyYWdnaW5nXygpIHtcbiAgICBpZiAodGhpcy5kcmFnRGlzdGFuY2UgPCBEUkFHX0RJU1RBTkNFX1BYKSB7XG4gICAgICB0aGlzLmVtaXQoJ3JheXVwJyk7XG4gICAgfVxuICAgIHRoaXMuZHJhZ0Rpc3RhbmNlID0gMDtcbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBmaXJzdCBWUi1lbmFibGVkIGdhbWVwYWQuXG4gICAqL1xuICBnZXRWUkdhbWVwYWRfKCkge1xuICAgIC8vIElmIHRoZXJlJ3Mgbm8gZ2FtZXBhZCBBUEksIHRoZXJlJ3Mgbm8gZ2FtZXBhZC5cbiAgICBpZiAoIW5hdmlnYXRvci5nZXRHYW1lcGFkcykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGdhbWVwYWRzID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lcGFkcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGdhbWVwYWQgPSBnYW1lcGFkc1tpXTtcblxuICAgICAgLy8gVGhlIGFycmF5IG1heSBjb250YWluIHVuZGVmaW5lZCBnYW1lcGFkcywgc28gY2hlY2sgZm9yIHRoYXQgYXMgd2VsbCBhc1xuICAgICAgLy8gYSBub24tbnVsbCBwb3NlLlxuICAgICAgaWYgKGdhbWVwYWQgJiYgZ2FtZXBhZC5wb3NlKSB7XG4gICAgICAgIHJldHVybiBnYW1lcGFkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IE9yaWVudGF0aW9uQXJtTW9kZWwgZnJvbSAnLi9vcmllbnRhdGlvbi1hcm0tbW9kZWwnXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50ZW1pdHRlcjMnXG5pbXBvcnQgUmF5UmVuZGVyZXIgZnJvbSAnLi9yYXktcmVuZGVyZXInXG5pbXBvcnQgUmF5Q29udHJvbGxlciBmcm9tICcuL3JheS1jb250cm9sbGVyJ1xuaW1wb3J0IEludGVyYWN0aW9uTW9kZXMgZnJvbSAnLi9yYXktaW50ZXJhY3Rpb24tbW9kZXMnXG5cbi8qKlxuICogQVBJIHdyYXBwZXIgZm9yIHRoZSBpbnB1dCBsaWJyYXJ5LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSYXlJbnB1dCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGNhbWVyYSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNhbWVyYSA9IGNhbWVyYTtcbiAgICB0aGlzLnJlbmRlcmVyID0gbmV3IFJheVJlbmRlcmVyKGNhbWVyYSk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gbmV3IFJheUNvbnRyb2xsZXIoKTtcblxuICAgIC8vIEFybSBtb2RlbCBuZWVkZWQgdG8gdHJhbnNmb3JtIGNvbnRyb2xsZXIgb3JpZW50YXRpb24gaW50byBwcm9wZXIgcG9zZS5cbiAgICB0aGlzLmFybU1vZGVsID0gbmV3IE9yaWVudGF0aW9uQXJtTW9kZWwoKTtcblxuICAgIHRoaXMuY29udHJvbGxlci5vbigncmF5ZG93bicsIHRoaXMub25SYXlEb3duXy5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIub24oJ3JheXVwJywgdGhpcy5vblJheVVwXy5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIub24oJ3JheWNhbmNlbCcsIHRoaXMub25SYXlDYW5jZWxfLmJpbmQodGhpcykpO1xuICAgIHRoaXMuY29udHJvbGxlci5vbigncG9pbnRlcm1vdmUnLCB0aGlzLm9uUG9pbnRlck1vdmVfLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVuZGVyZXIub24oJ3JheW92ZXInLCAobWVzaCkgPT4geyB0aGlzLmVtaXQoJ3JheW92ZXInLCBtZXNoKSB9KTtcbiAgICB0aGlzLnJlbmRlcmVyLm9uKCdyYXlvdXQnLCAobWVzaCkgPT4geyB0aGlzLmVtaXQoJ3JheW91dCcsIG1lc2gpIH0pO1xuXG4gICAgLy8gQnkgZGVmYXVsdCwgcHV0IHRoZSBwb2ludGVyIG9mZnNjcmVlbi5cbiAgICB0aGlzLnBvaW50ZXJOZGMgPSBuZXcgVEhSRUUuVmVjdG9yMigxLCAxKTtcblxuICAgIC8vIEV2ZW50IGhhbmRsZXJzLlxuICAgIHRoaXMuaGFuZGxlcnMgPSB7fTtcbiAgfVxuXG4gIGFkZChvYmplY3QsIGhhbmRsZXJzKSB7XG4gICAgdGhpcy5yZW5kZXJlci5hZGQob2JqZWN0LCBoYW5kbGVycyk7XG4gICAgdGhpcy5oYW5kbGVyc1tvYmplY3QuaWRdID0gaGFuZGxlcnM7XG4gIH1cblxuICByZW1vdmUob2JqZWN0KSB7XG4gICAgdGhpcy5yZW5kZXJlci5yZW1vdmUob2JqZWN0KTtcbiAgICBkZWxldGUgdGhpcy5oYW5kbGVyc1tvYmplY3QuaWRdXG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgbGV0IGxvb2tBdCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0xKTtcbiAgICBsb29rQXQuYXBwbHlRdWF0ZXJuaW9uKHRoaXMuY2FtZXJhLnF1YXRlcm5pb24pO1xuXG4gICAgbGV0IG1vZGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0SW50ZXJhY3Rpb25Nb2RlKCk7XG4gICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICBjYXNlIEludGVyYWN0aW9uTW9kZXMuTU9VU0U6XG4gICAgICAgIC8vIERlc2t0b3AgbW91c2UgbW9kZSwgbW91c2UgY29vcmRpbmF0ZXMgYXJlIHdoYXQgbWF0dGVycy5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRQb2ludGVyKHRoaXMucG9pbnRlck5kYyk7XG4gICAgICAgIC8vIEhpZGUgdGhlIHJheSBhbmQgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSYXlWaXNpYmlsaXR5KGZhbHNlKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSZXRpY2xlVmlzaWJpbGl0eShmYWxzZSk7XG5cbiAgICAgICAgLy8gSW4gbW91c2UgbW9kZSByYXkgcmVuZGVyZXIgaXMgYWx3YXlzIGFjdGl2ZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIEludGVyYWN0aW9uTW9kZXMuVE9VQ0g6XG4gICAgICAgIC8vIE1vYmlsZSBtYWdpYyB3aW5kb3cgbW9kZS4gVG91Y2ggY29vcmRpbmF0ZXMgbWF0dGVyLCBidXQgd2Ugd2FudCB0b1xuICAgICAgICAvLyBoaWRlIHRoZSByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFBvaW50ZXIodGhpcy5wb2ludGVyTmRjKTtcblxuICAgICAgICAvLyBIaWRlIHRoZSByYXkgYW5kIHRoZSByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJheVZpc2liaWxpdHkoZmFsc2UpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJldGljbGVWaXNpYmlsaXR5KGZhbHNlKTtcblxuICAgICAgICAvLyBJbiB0b3VjaCBtb2RlIHRoZSByYXkgcmVuZGVyZXIgaXMgb25seSBhY3RpdmUgb24gdG91Y2guXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRoaXMuY29udHJvbGxlci5nZXRJc1RvdWNoQWN0aXZlKCkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBJbnRlcmFjdGlvbk1vZGVzLlZSXzBET0Y6XG4gICAgICAgIC8vIENhcmRib2FyZCBtb2RlLCB3ZSdyZSBkZWFsaW5nIHdpdGggYSBnYXplIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UG9zaXRpb24odGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldE9yaWVudGF0aW9uKHRoaXMuY2FtZXJhLnF1YXRlcm5pb24pO1xuXG4gICAgICAgIC8vIFJldGljbGUgb25seS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSYXlWaXNpYmlsaXR5KGZhbHNlKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSZXRpY2xlVmlzaWJpbGl0eSh0cnVlKTtcblxuICAgICAgICAvLyBSYXkgcmVuZGVyZXIgYWx3YXlzIGFjdGl2ZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIEludGVyYWN0aW9uTW9kZXMuVlJfM0RPRjpcbiAgICAgICAgLy8gRGF5ZHJlYW0sIG91ciBvcmlnaW4gaXMgc2xpZ2h0bHkgb2ZmIChkZXBlbmRpbmcgb24gaGFuZGVkbmVzcykuXG4gICAgICAgIC8vIEJ1dCB3ZSBzaG91bGQgYmUgdXNpbmcgdGhlIG9yaWVudGF0aW9uIGZyb20gdGhlIGdhbWVwYWQuXG4gICAgICAgIC8vIFRPRE8oc211cyk6IEltcGxlbWVudCB0aGUgcmVhbCBhcm0gbW9kZWwuXG4gICAgICAgIHZhciBwb3NlID0gdGhpcy5jb250cm9sbGVyLmdldEdhbWVwYWRQb3NlKCk7XG5cbiAgICAgICAgLy8gRGVidWcgb25seTogdXNlIGNhbWVyYSBhcyBpbnB1dCBjb250cm9sbGVyLlxuICAgICAgICAvL2xldCBjb250cm9sbGVyT3JpZW50YXRpb24gPSB0aGlzLmNhbWVyYS5xdWF0ZXJuaW9uO1xuICAgICAgICBsZXQgY29udHJvbGxlck9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5mcm9tQXJyYXkocG9zZS5vcmllbnRhdGlvbik7XG5cbiAgICAgICAgLy8gVHJhbnNmb3JtIHRoZSBjb250cm9sbGVyIGludG8gdGhlIGNhbWVyYSBjb29yZGluYXRlIHN5c3RlbS5cbiAgICAgICAgLypcbiAgICAgICAgY29udHJvbGxlck9yaWVudGF0aW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5zZXRGcm9tQXhpc0FuZ2xlKG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApLCBNYXRoLlBJKSk7XG4gICAgICAgIGNvbnRyb2xsZXJPcmllbnRhdGlvbi54ICo9IC0xO1xuICAgICAgICBjb250cm9sbGVyT3JpZW50YXRpb24ueiAqPSAtMTtcbiAgICAgICAgKi9cblxuICAgICAgICAvLyBGZWVkIGNhbWVyYSBhbmQgY29udHJvbGxlciBpbnRvIHRoZSBhcm0gbW9kZWwuXG4gICAgICAgIHRoaXMuYXJtTW9kZWwuc2V0SGVhZE9yaWVudGF0aW9uKHRoaXMuY2FtZXJhLnF1YXRlcm5pb24pO1xuICAgICAgICB0aGlzLmFybU1vZGVsLnNldEhlYWRQb3NpdGlvbih0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIHRoaXMuYXJtTW9kZWwuc2V0Q29udHJvbGxlck9yaWVudGF0aW9uKGNvbnRyb2xsZXJPcmllbnRhdGlvbik7XG4gICAgICAgIHRoaXMuYXJtTW9kZWwudXBkYXRlKCk7XG5cbiAgICAgICAgLy8gR2V0IHJlc3VsdGluZyBwb3NlIGFuZCBjb25maWd1cmUgdGhlIHJlbmRlcmVyLlxuICAgICAgICBsZXQgbW9kZWxQb3NlID0gdGhpcy5hcm1Nb2RlbC5nZXRQb3NlKCk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UG9zaXRpb24obW9kZWxQb3NlLnBvc2l0aW9uKTtcbiAgICAgICAgLy90aGlzLnJlbmRlcmVyLnNldFBvc2l0aW9uKG5ldyBUSFJFRS5WZWN0b3IzKCkpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldE9yaWVudGF0aW9uKG1vZGVsUG9zZS5vcmllbnRhdGlvbik7XG4gICAgICAgIC8vdGhpcy5yZW5kZXJlci5zZXRPcmllbnRhdGlvbihjb250cm9sbGVyT3JpZW50YXRpb24pO1xuXG4gICAgICAgIC8vIFNob3cgcmF5IGFuZCByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJheVZpc2liaWxpdHkodHJ1ZSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmV0aWNsZVZpc2liaWxpdHkodHJ1ZSk7XG5cbiAgICAgICAgLy8gUmF5IHJlbmRlcmVyIGFsd2F5cyBhY3RpdmUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBJbnRlcmFjdGlvbk1vZGVzLlZSXzZET0Y6XG4gICAgICAgIC8vIFZpdmUsIG9yaWdpbiBkZXBlbmRzIG9uIHRoZSBwb3NpdGlvbiBvZiB0aGUgY29udHJvbGxlci5cbiAgICAgICAgLy8gVE9ETyhzbXVzKS4uLlxuICAgICAgICB2YXIgcG9zZSA9IHRoaXMuY29udHJvbGxlci5nZXRHYW1lcGFkUG9zZSgpO1xuXG4gICAgICAgIC8vIENoZWNrIHRoYXQgdGhlIHBvc2UgaXMgdmFsaWQuXG4gICAgICAgIGlmICghcG9zZS5vcmllbnRhdGlvbiB8fCAhcG9zZS5wb3NpdGlvbikge1xuICAgICAgICAgIGNvbnNvbGUud2FybignSW52YWxpZCBnYW1lcGFkIHBvc2UuIENhblxcJ3QgdXBkYXRlIHJheS4nKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBsZXQgb3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLmZyb21BcnJheShwb3NlLm9yaWVudGF0aW9uKTtcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5mcm9tQXJyYXkocG9zZS5wb3NpdGlvbik7XG4gICAgICAgIFxuICAgICAgICBsZXQgY29tcG9zZWQgPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICAgICAgICBsZXQgc3RhbmRpbmdPcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gICAgICAgIGxldCBzdGFuZGluZ1Bvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICAgICAgbGV0IHN0YW5kaW5nU2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yKCk7XG4gICAgICAgIGNvbXBvc2VkLm1ha2VSb3RhdGlvbkZyb21RdWF0ZXJuaW9uKG9yaWVudGF0aW9uKTtcbiAgICAgICAgY29tcG9zZWQuc2V0UG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgICBjb21wb3NlZC5wcmVtdWx0aXBseSh2ckRpc3BsYXkuc3RhZ2VQYXJhbWV0ZXJzLnNpdHRpbmdUb1N0YW5kaW5nVHJhbnNmb3JtKTtcbiAgICAgICAgY29tcG9zZWQuZGVjb21wb3NlKHN0YW5kaW5nUG9zaXRpb24sIHN0YW5kaW5nT3JpZW50YXRpb24sIHN0YW5kaW5nU2NhbGUpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0T3JpZW50YXRpb24oc3RhbmRpbmdPcmllbnRhdGlvbik7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UG9zaXRpb24oc3RhbmRpbmdQb3NpdGlvbik7XG5cbiAgICAgICAgLy8gU2hvdyByYXkgYW5kIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmF5VmlzaWJpbGl0eSh0cnVlKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSZXRpY2xlVmlzaWJpbGl0eSh0cnVlKTtcblxuICAgICAgICAvLyBSYXkgcmVuZGVyZXIgYWx3YXlzIGFjdGl2ZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGludGVyYWN0aW9uIG1vZGUuJyk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyZXIudXBkYXRlKCk7XG4gICAgdGhpcy5jb250cm9sbGVyLnVwZGF0ZSgpO1xuICB9XG5cbiAgc2V0U2l6ZShzaXplKSB7XG4gICAgdGhpcy5jb250cm9sbGVyLnNldFNpemUoc2l6ZSk7XG4gIH1cblxuICBnZXRNZXNoKCkge1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmdldFJldGljbGVSYXlNZXNoKCk7XG4gIH1cblxuICBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZXIuZ2V0T3JpZ2luKCk7XG4gIH1cblxuICBnZXREaXJlY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZXIuZ2V0RGlyZWN0aW9uKCk7XG4gIH1cblxuICBnZXRSaWdodERpcmVjdGlvbigpIHtcbiAgICBsZXQgbG9va0F0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpO1xuICAgIGxvb2tBdC5hcHBseVF1YXRlcm5pb24odGhpcy5jYW1lcmEucXVhdGVybmlvbik7XG4gICAgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKCkuY3Jvc3NWZWN0b3JzKGxvb2tBdCwgdGhpcy5jYW1lcmEudXApO1xuICB9XG5cbiAgb25SYXlEb3duXyhlKSB7XG4gICAgLy9jb25zb2xlLmxvZygnb25SYXlEb3duXycpO1xuXG4gICAgLy8gRm9yY2UgdGhlIHJlbmRlcmVyIHRvIHJheWNhc3QuXG4gICAgdGhpcy5yZW5kZXJlci51cGRhdGUoKTtcbiAgICBsZXQgbWVzaCA9IHRoaXMucmVuZGVyZXIuZ2V0U2VsZWN0ZWRNZXNoKCk7XG4gICAgdGhpcy5lbWl0KCdyYXlkb3duJywgbWVzaCk7XG5cbiAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0cnVlKTtcbiAgfVxuXG4gIG9uUmF5VXBfKGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdvblJheVVwXycpO1xuICAgIGxldCBtZXNoID0gdGhpcy5yZW5kZXJlci5nZXRTZWxlY3RlZE1lc2goKTtcbiAgICB0aGlzLmVtaXQoJ3JheXVwJywgbWVzaCk7XG5cbiAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZShmYWxzZSk7XG4gIH1cblxuICBvblJheUNhbmNlbF8oZSkge1xuICAgIC8vY29uc29sZS5sb2coJ29uUmF5Q2FuY2VsXycpO1xuICAgIGxldCBtZXNoID0gdGhpcy5yZW5kZXJlci5nZXRTZWxlY3RlZE1lc2goKTtcbiAgICB0aGlzLmVtaXQoJ3JheWNhbmNlbCcsIG1lc2gpO1xuICB9XG5cbiAgb25Qb2ludGVyTW92ZV8obmRjKSB7XG4gICAgdGhpcy5wb2ludGVyTmRjLmNvcHkobmRjKTtcbiAgfVxufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxudmFyIEludGVyYWN0aW9uTW9kZXMgPSB7XG4gIE1PVVNFOiAxLFxuICBUT1VDSDogMixcbiAgVlJfMERPRjogMyxcbiAgVlJfM0RPRjogNCxcbiAgVlJfNkRPRjogNVxufTtcblxuZXhwb3J0IHsgSW50ZXJhY3Rpb25Nb2RlcyBhcyBkZWZhdWx0IH07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQge2Jhc2U2NH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudGVtaXR0ZXIzJ1xuXG5jb25zdCBSRVRJQ0xFX0RJU1RBTkNFID0gMztcbmNvbnN0IElOTkVSX1JBRElVUyA9IDAuMDI7XG5jb25zdCBPVVRFUl9SQURJVVMgPSAwLjA0O1xuY29uc3QgUkFZX1JBRElVUyA9IDAuMDI7XG5jb25zdCBHUkFESUVOVF9JTUFHRSA9IGJhc2U2NCgnaW1hZ2UvcG5nJywgJ2lWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFJQUFBQUNBQ0FZQUFBRERQbUhMQUFBQmRrbEVRVlI0bk8zV3dYSEVRQXdEUWNpbi9GT1d3K0JqdWlQWUIycTRHMm5QOTMzUDlTTzQ4MjR6Z0RBRGlET0F1SGZiMy9VanVLTUFjUVlRWndCeC9nQnhDaENuQUhFS0VLY0FjUW9RcHdCeENoQ25BSEVHRUdjQWNmNEFjUW9RWndCeEJoQm5BSEVHRUdjQWNRWVFad0J4QmhCbkFIRUdFR2NBY1FZUVp3QnhCaEJuQUhIdnR0LzFJN2lqQUhFR0VHY0FjZjRBY1FvUVp3QnhUa0NjQXNRWlFKd1RFS2NBY1FvUXB3QnhCaERuQk1RcFFKd0N4Q2xBbkFMRUtVQ2NBc1FwUUp3Q3hDbEFuQUxFS1VDY0FzUXBRSndCeERrQmNRb1Fwd0J4Q2hDbkFIRUtFS2NBY1FvUXB3QnhDaENuQUhFS0VHY0FjVTVBbkFMRUtVQ2NBc1FaUUp3VEVLY0FjUVlRNXdURUtVQ2NBY1FaUUp3L1FKd0N4QmxBbkFIRUdVQ2NBY1FaUUp3QnhCbEFuQUhFR1VDY0FjUVpRSndCeEJsQW5BSEVHVURjdSsyNWZnUjNGQ0RPQU9JTUlNNGZJRTRCNGhRZ1RnSGlGQ0JPQWVJVUlFNEI0aFFnemdEaURDRE9IeUJPQWVJTUlNNEE0djRCLzVJRjllRDZReGdBQUFBQVNVVk9SSzVDWUlJPScpO1xuXG4vKipcbiAqIEhhbmRsZXMgcmF5IGlucHV0IHNlbGVjdGlvbiBmcm9tIGZyYW1lIG9mIHJlZmVyZW5jZSBvZiBhbiBhcmJpdHJhcnkgb2JqZWN0LlxuICpcbiAqIFRoZSBzb3VyY2Ugb2YgdGhlIHJheSBpcyBmcm9tIHZhcmlvdXMgbG9jYXRpb25zOlxuICpcbiAqIERlc2t0b3A6IG1vdXNlLlxuICogTWFnaWMgd2luZG93OiB0b3VjaC5cbiAqIENhcmRib2FyZDogY2FtZXJhLlxuICogRGF5ZHJlYW06IDNET0YgY29udHJvbGxlciB2aWEgZ2FtZXBhZCAoYW5kIHNob3cgcmF5KS5cbiAqIFZpdmU6IDZET0YgY29udHJvbGxlciB2aWEgZ2FtZXBhZCAoYW5kIHNob3cgcmF5KS5cbiAqXG4gKiBFbWl0cyBzZWxlY3Rpb24gZXZlbnRzOlxuICogICAgIHJheW92ZXIobWVzaCk6IFRoaXMgbWVzaCB3YXMgc2VsZWN0ZWQuXG4gKiAgICAgcmF5b3V0KG1lc2gpOiBUaGlzIG1lc2ggd2FzIHVuc2VsZWN0ZWQuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJheVJlbmRlcmVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoY2FtZXJhLCBvcHRfcGFyYW1zKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuY2FtZXJhID0gY2FtZXJhO1xuXG4gICAgdmFyIHBhcmFtcyA9IG9wdF9wYXJhbXMgfHwge307XG5cbiAgICAvLyBXaGljaCBvYmplY3RzIGFyZSBpbnRlcmFjdGl2ZSAoa2V5ZWQgb24gaWQpLlxuICAgIHRoaXMubWVzaGVzID0ge307XG5cbiAgICAvLyBXaGljaCBvYmplY3RzIGFyZSBjdXJyZW50bHkgc2VsZWN0ZWQgKGtleWVkIG9uIGlkKS5cbiAgICB0aGlzLnNlbGVjdGVkID0ge307XG5cbiAgICAvLyBUaGUgcmF5Y2FzdGVyLlxuICAgIHRoaXMucmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuXG4gICAgLy8gUG9zaXRpb24gYW5kIG9yaWVudGF0aW9uLCBpbiBhZGRpdGlvbi5cbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAgIHRoaXMucm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXG4gICAgLy8gQWRkIHRoZSByZXRpY2xlIG1lc2ggdG8gdGhlIHJvb3Qgb2YgdGhlIG9iamVjdC5cbiAgICB0aGlzLnJldGljbGUgPSB0aGlzLmNyZWF0ZVJldGljbGVfKCk7XG4gICAgdGhpcy5yb290LmFkZCh0aGlzLnJldGljbGUpO1xuXG4gICAgLy8gQWRkIHRoZSByYXkgdG8gdGhlIHJvb3Qgb2YgdGhlIG9iamVjdC5cbiAgICB0aGlzLnJheSA9IHRoaXMuY3JlYXRlUmF5XygpO1xuICAgIHRoaXMucm9vdC5hZGQodGhpcy5yYXkpO1xuXG4gICAgLy8gSG93IGZhciB0aGUgcmV0aWNsZSBpcyBjdXJyZW50bHkgZnJvbSB0aGUgcmV0aWNsZSBvcmlnaW4uXG4gICAgdGhpcy5yZXRpY2xlRGlzdGFuY2UgPSBSRVRJQ0xFX0RJU1RBTkNFO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGFuIG9iamVjdCBzbyB0aGF0IGl0IGNhbiBiZSBpbnRlcmFjdGVkIHdpdGguXG4gICAqL1xuICBhZGQob2JqZWN0KSB7XG4gICAgdGhpcy5tZXNoZXNbb2JqZWN0LmlkXSA9IG9iamVjdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmV2ZW50IGFuIG9iamVjdCBmcm9tIGJlaW5nIGludGVyYWN0ZWQgd2l0aC5cbiAgICovXG4gIHJlbW92ZShvYmplY3QpIHtcbiAgICB2YXIgaWQgPSBvYmplY3QuaWQ7XG4gICAgaWYgKCF0aGlzLm1lc2hlc1tpZF0pIHtcbiAgICAgIC8vIElmIHRoZXJlJ3Mgbm8gZXhpc3RpbmcgbWVzaCwgd2UgY2FuJ3QgcmVtb3ZlIGl0LlxuICAgICAgZGVsZXRlIHRoaXMubWVzaGVzW2lkXTtcbiAgICB9XG4gICAgLy8gSWYgdGhlIG9iamVjdCBpcyBjdXJyZW50bHkgc2VsZWN0ZWQsIHJlbW92ZSBpdC5cbiAgICBpZiAodGhpcy5zZWxlY3RlZFtpZF0pIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkW29iamVjdC5pZF07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIC8vIERvIHRoZSByYXljYXN0aW5nIGFuZCBpc3N1ZSB2YXJpb3VzIGV2ZW50cyBhcyBuZWVkZWQuXG4gICAgZm9yIChsZXQgaWQgaW4gdGhpcy5tZXNoZXMpIHtcbiAgICAgIGxldCBtZXNoID0gdGhpcy5tZXNoZXNbaWRdO1xuICAgICAgbGV0IGludGVyc2VjdHMgPSB0aGlzLnJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3QobWVzaCwgdHJ1ZSk7XG4gICAgICBpZiAoaW50ZXJzZWN0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignVW5leHBlY3RlZDogbXVsdGlwbGUgbWVzaGVzIGludGVyc2VjdGVkLicpO1xuICAgICAgfVxuICAgICAgbGV0IGlzSW50ZXJzZWN0ZWQgPSAoaW50ZXJzZWN0cy5sZW5ndGggPiAwKTtcbiAgICAgIGxldCBpc1NlbGVjdGVkID0gdGhpcy5zZWxlY3RlZFtpZF07XG5cbiAgICAgIC8vIElmIGl0J3MgbmV3bHkgc2VsZWN0ZWQsIHNlbmQgcmF5b3Zlci5cbiAgICAgIGlmIChpc0ludGVyc2VjdGVkICYmICFpc1NlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRbaWRdID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JheW92ZXInLCBtZXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiBpdCdzIG5vIGxvbmdlciBpbnRlcnNlY3RlZCwgc2VuZCByYXlvdXQuXG4gICAgICBpZiAoIWlzSW50ZXJzZWN0ZWQgJiYgaXNTZWxlY3RlZCkge1xuICAgICAgICBkZWxldGUgdGhpcy5zZWxlY3RlZFtpZF07XG4gICAgICAgIHRoaXMubW92ZVJldGljbGVfKG51bGwpO1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIHRoaXMuZW1pdCgncmF5b3V0JywgbWVzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzSW50ZXJzZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5tb3ZlUmV0aWNsZV8oaW50ZXJzZWN0cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIG9yaWdpbiBvZiB0aGUgcmF5LlxuICAgKiBAcGFyYW0ge1ZlY3Rvcn0gdmVjdG9yIFBvc2l0aW9uIG9mIHRoZSBvcmlnaW4gb2YgdGhlIHBpY2tpbmcgcmF5LlxuICAgKi9cbiAgc2V0UG9zaXRpb24odmVjdG9yKSB7XG4gICAgdGhpcy5wb3NpdGlvbi5jb3B5KHZlY3Rvcik7XG4gICAgdGhpcy5yYXljYXN0ZXIucmF5Lm9yaWdpbi5jb3B5KHZlY3Rvcik7XG4gICAgdGhpcy51cGRhdGVSYXljYXN0ZXJfKCk7XG4gIH1cblxuICBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMucmF5Y2FzdGVyLnJheS5vcmlnaW47XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSByYXkuXG4gICAqIEBwYXJhbSB7VmVjdG9yfSB2ZWN0b3IgVW5pdCB2ZWN0b3IgY29ycmVzcG9uZGluZyB0byBkaXJlY3Rpb24uXG4gICAqL1xuICBzZXRPcmllbnRhdGlvbihxdWF0ZXJuaW9uKSB7XG4gICAgdGhpcy5vcmllbnRhdGlvbi5jb3B5KHF1YXRlcm5pb24pO1xuXG4gICAgdmFyIHBvaW50QXQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSkuYXBwbHlRdWF0ZXJuaW9uKHF1YXRlcm5pb24pO1xuICAgIHRoaXMucmF5Y2FzdGVyLnJheS5kaXJlY3Rpb24uY29weShwb2ludEF0KVxuICAgIHRoaXMudXBkYXRlUmF5Y2FzdGVyXygpO1xuICB9XG5cbiAgZ2V0RGlyZWN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJheWNhc3Rlci5yYXkuZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHBvaW50ZXIgb24gdGhlIHNjcmVlbiBmb3IgY2FtZXJhICsgcG9pbnRlciBiYXNlZCBwaWNraW5nLiBUaGlzXG4gICAqIHN1cGVyc2NlZGVzIG9yaWdpbiBhbmQgZGlyZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge1ZlY3RvcjJ9IHZlY3RvciBUaGUgcG9zaXRpb24gb2YgdGhlIHBvaW50ZXIgKHNjcmVlbiBjb29yZHMpLlxuICAgKi9cbiAgc2V0UG9pbnRlcih2ZWN0b3IpIHtcbiAgICB0aGlzLnJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKHZlY3RvciwgdGhpcy5jYW1lcmEpO1xuICAgIHRoaXMudXBkYXRlUmF5Y2FzdGVyXygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lc2gsIHdoaWNoIGluY2x1ZGVzIHJldGljbGUgYW5kL29yIHJheS4gVGhpcyBtZXNoIGlzIHRoZW4gYWRkZWRcbiAgICogdG8gdGhlIHNjZW5lLlxuICAgKi9cbiAgZ2V0UmV0aWNsZVJheU1lc2goKSB7XG4gICAgcmV0dXJuIHRoaXMucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgb2JqZWN0IGluIHRoZSBzY2VuZS5cbiAgICovXG4gIGdldFNlbGVjdGVkTWVzaCgpIHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGxldCBtZXNoID0gbnVsbDtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnNlbGVjdGVkKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgICAgbWVzaCA9IHRoaXMubWVzaGVzW2lkXTtcbiAgICB9XG4gICAgaWYgKGNvdW50ID4gMSkge1xuICAgICAgY29uc29sZS53YXJuKCdNb3JlIHRoYW4gb25lIG1lc2ggc2VsZWN0ZWQuJyk7XG4gICAgfVxuICAgIHJldHVybiBtZXNoO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGFuZCBzaG93cyB0aGUgcmV0aWNsZS5cbiAgICovXG4gIHNldFJldGljbGVWaXNpYmlsaXR5KGlzVmlzaWJsZSkge1xuICAgIHRoaXMucmV0aWNsZS52aXNpYmxlID0gaXNWaXNpYmxlO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgb3IgZGlzYWJsZXMgdGhlIHJheWNhc3RpbmcgcmF5IHdoaWNoIGdyYWR1YWxseSBmYWRlcyBvdXQgZnJvbVxuICAgKiB0aGUgb3JpZ2luLlxuICAgKi9cbiAgc2V0UmF5VmlzaWJpbGl0eShpc1Zpc2libGUpIHtcbiAgICB0aGlzLnJheS52aXNpYmxlID0gaXNWaXNpYmxlO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYW5kIGRpc2FibGVzIHRoZSByYXljYXN0ZXIuIEZvciB0b3VjaCwgd2hlcmUgZmluZ2VyIHVwIG1lYW5zIHdlXG4gICAqIHNob3VsZG4ndCBiZSByYXljYXN0aW5nLlxuICAgKi9cbiAgc2V0QWN0aXZlKGlzQWN0aXZlKSB7XG4gICAgLy8gSWYgbm90aGluZyBjaGFuZ2VkLCBkbyBub3RoaW5nLlxuICAgIGlmICh0aGlzLmlzQWN0aXZlID09IGlzQWN0aXZlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRPRE8oc211cyk6IFNob3cgdGhlIHJheSBvciByZXRpY2xlIGFkanVzdCBpbiByZXNwb25zZS5cbiAgICB0aGlzLmlzQWN0aXZlID0gaXNBY3RpdmU7XG5cbiAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICB0aGlzLm1vdmVSZXRpY2xlXyhudWxsKTtcbiAgICAgIGZvciAobGV0IGlkIGluIHRoaXMuc2VsZWN0ZWQpIHtcbiAgICAgICAgbGV0IG1lc2ggPSB0aGlzLm1lc2hlc1tpZF07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkW2lkXTtcbiAgICAgICAgdGhpcy5lbWl0KCdyYXlvdXQnLCBtZXNoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGVSYXljYXN0ZXJfKCkge1xuICAgIHZhciByYXkgPSB0aGlzLnJheWNhc3Rlci5yYXk7XG5cbiAgICAvLyBQb3NpdGlvbiB0aGUgcmV0aWNsZSBhdCBhIGRpc3RhbmNlLCBhcyBjYWxjdWxhdGVkIGZyb20gdGhlIG9yaWdpbiBhbmRcbiAgICAvLyBkaXJlY3Rpb24uXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5yZXRpY2xlLnBvc2l0aW9uO1xuICAgIHBvc2l0aW9uLmNvcHkocmF5LmRpcmVjdGlvbik7XG4gICAgcG9zaXRpb24ubXVsdGlwbHlTY2FsYXIodGhpcy5yZXRpY2xlRGlzdGFuY2UpO1xuICAgIHBvc2l0aW9uLmFkZChyYXkub3JpZ2luKTtcblxuICAgIC8vIFNldCBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIHJheSBzbyB0aGF0IGl0IGdvZXMgZnJvbSBvcmlnaW4gdG9cbiAgICAvLyByZXRpY2xlLlxuICAgIHZhciBkZWx0YSA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY29weShyYXkuZGlyZWN0aW9uKTtcbiAgICBkZWx0YS5tdWx0aXBseVNjYWxhcih0aGlzLnJldGljbGVEaXN0YW5jZSk7XG4gICAgdGhpcy5yYXkuc2NhbGUueSA9IGRlbHRhLmxlbmd0aCgpO1xuICAgIHZhciBhcnJvdyA9IG5ldyBUSFJFRS5BcnJvd0hlbHBlcihyYXkuZGlyZWN0aW9uLCByYXkub3JpZ2luKTtcbiAgICB0aGlzLnJheS5yb3RhdGlvbi5jb3B5KGFycm93LnJvdGF0aW9uKTtcbiAgICB0aGlzLnJheS5wb3NpdGlvbi5hZGRWZWN0b3JzKHJheS5vcmlnaW4sIGRlbHRhLm11bHRpcGx5U2NhbGFyKDAuNSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGdlb21ldHJ5IG9mIHRoZSByZXRpY2xlLlxuICAgKi9cbiAgY3JlYXRlUmV0aWNsZV8oKSB7XG4gICAgLy8gQ3JlYXRlIGEgc3BoZXJpY2FsIHJldGljbGUuXG4gICAgbGV0IGlubmVyR2VvbWV0cnkgPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoSU5ORVJfUkFESVVTLCAzMiwgMzIpO1xuICAgIGxldCBpbm5lck1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiAweGZmZmZmZixcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC45XG4gICAgfSk7XG4gICAgbGV0IGlubmVyID0gbmV3IFRIUkVFLk1lc2goaW5uZXJHZW9tZXRyeSwgaW5uZXJNYXRlcmlhbCk7XG5cbiAgICBsZXQgb3V0ZXJHZW9tZXRyeSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeShPVVRFUl9SQURJVVMsIDMyLCAzMik7XG4gICAgbGV0IG91dGVyTWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4MzMzMzMzLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjNcbiAgICB9KTtcbiAgICBsZXQgb3V0ZXIgPSBuZXcgVEhSRUUuTWVzaChvdXRlckdlb21ldHJ5LCBvdXRlck1hdGVyaWFsKTtcblxuICAgIGxldCByZXRpY2xlID0gbmV3IFRIUkVFLkdyb3VwKCk7XG4gICAgcmV0aWNsZS5hZGQoaW5uZXIpO1xuICAgIHJldGljbGUuYWRkKG91dGVyKTtcbiAgICByZXR1cm4gcmV0aWNsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyB0aGUgcmV0aWNsZSB0byBhIHBvc2l0aW9uIHNvIHRoYXQgaXQncyBqdXN0IGluIGZyb250IG9mIHRoZSBtZXNoIHRoYXRcbiAgICogaXQgaW50ZXJzZWN0ZWQgd2l0aC5cbiAgICovXG4gIG1vdmVSZXRpY2xlXyhpbnRlcnNlY3Rpb25zKSB7XG4gICAgLy8gSWYgbm8gaW50ZXJzZWN0aW9uLCByZXR1cm4gdGhlIHJldGljbGUgdG8gdGhlIGRlZmF1bHQgcG9zaXRpb24uXG4gICAgbGV0IGRpc3RhbmNlID0gUkVUSUNMRV9ESVNUQU5DRTtcbiAgICBpZiAoaW50ZXJzZWN0aW9ucykge1xuICAgICAgLy8gT3RoZXJ3aXNlLCBkZXRlcm1pbmUgdGhlIGNvcnJlY3QgZGlzdGFuY2UuXG4gICAgICBsZXQgaW50ZXIgPSBpbnRlcnNlY3Rpb25zWzBdO1xuICAgICAgZGlzdGFuY2UgPSBpbnRlci5kaXN0YW5jZTtcbiAgICB9XG5cbiAgICB0aGlzLnJldGljbGVEaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgIHRoaXMudXBkYXRlUmF5Y2FzdGVyXygpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNyZWF0ZVJheV8oKSB7XG4gICAgLy8gQ3JlYXRlIGEgY3lsaW5kcmljYWwgcmF5LlxuICAgIHZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KFJBWV9SQURJVVMsIFJBWV9SQURJVVMsIDEsIDMyKTtcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgbWFwOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKEdSQURJRU5UX0lNQUdFKSxcbiAgICAgIC8vY29sb3I6IDB4ZmZmZmZmLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjNcbiAgICB9KTtcbiAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb21ldHJ5LCBtYXRlcmlhbCk7XG5cbiAgICByZXR1cm4gbWVzaDtcbiAgfVxufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTW9iaWxlKCkge1xuICB2YXIgY2hlY2sgPSBmYWxzZTtcbiAgKGZ1bmN0aW9uKGEpe2lmKC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm8vaS50ZXN0KGEpfHwvMTIwN3w2MzEwfDY1OTB8M2dzb3w0dGhwfDUwWzEtNl1pfDc3MHN8ODAyc3xhIHdhfGFiYWN8YWMoZXJ8b298c1xcLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXxcXC1tfHIgfHMgKXxhdmFufGJlKGNrfGxsfG5xKXxiaShsYnxyZCl8YmwoYWN8YXopfGJyKGV8dil3fGJ1bWJ8YndcXC0obnx1KXxjNTVcXC98Y2FwaXxjY3dhfGNkbVxcLXxjZWxsfGNodG18Y2xkY3xjbWRcXC18Y28obXB8bmQpfGNyYXd8ZGEoaXR8bGx8bmcpfGRidGV8ZGNcXC1zfGRldml8ZGljYXxkbW9ifGRvKGN8cClvfGRzKDEyfFxcLWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseShcXC18Xyl8ZzEgdXxnNTYwfGdlbmV8Z2ZcXC01fGdcXC1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkXFwtKG18cHx0KXxoZWlcXC18aGkocHR8dGEpfGhwKCBpfGlwKXxoc1xcLWN8aHQoYyhcXC18IHxffGF8Z3xwfHN8dCl8dHApfGh1KGF3fHRjKXxpXFwtKDIwfGdvfG1hKXxpMjMwfGlhYyggfFxcLXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djXFwtfGt5byhjfGspfGxlKG5vfHhpKXxsZyggZ3xcXC8oa3xsfHUpfDUwfDU0fFxcLVthLXddKXxsaWJ3fGx5bnh8bTFcXC13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bVxcLWNyfG1lKHJjfHJpKXxtaShvOHxvYXx0cyl8bW1lZnxtbygwMXwwMnxiaXxkZXxkb3x0KFxcLXwgfG98dil8enopfG10KDUwfHAxfHYgKXxtd2JwfG15d2F8bjEwWzAtMl18bjIwWzItM118bjMwKDB8Mil8bjUwKDB8Mnw1KXxuNygwKDB8MSl8MTApfG5lKChjfG0pXFwtfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3xcXC0oWzEtOF18YykpfHBoaWx8cGlyZXxwbChheXx1Yyl8cG5cXC0yfHBvKGNrfHJ0fHNlKXxwcm94fHBzaW98cHRcXC1nfHFhXFwtYXxxYygwN3wxMnwyMXwzMnw2MHxcXC1bMi03XXxpXFwtKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aFxcLXxvb3xwXFwtKXxzZGtcXC98c2UoYyhcXC18MHwxKXw0N3xtY3xuZHxyaSl8c2doXFwtfHNoYXJ8c2llKFxcLXxtKXxza1xcLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aFxcLXx2XFwtfHYgKXxzeSgwMXxtYil8dDIoMTh8NTApfHQ2KDAwfDEwfDE4KXx0YShndHxsayl8dGNsXFwtfHRkZ1xcLXx0ZWwoaXxtKXx0aW1cXC18dFxcLW1vfHRvKHBsfHNoKXx0cyg3MHxtXFwtfG0zfG01KXx0eFxcLTl8dXAoXFwuYnxnMXxzaSl8dXRzdHx2NDAwfHY3NTB8dmVyaXx2aShyZ3x0ZSl8dmsoNDB8NVswLTNdfFxcLXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoXFwtfCApfHdlYmN8d2hpdHx3aShnIHxuY3xudyl8d21sYnx3b251fHg3MDB8eWFzXFwtfHlvdXJ8emV0b3x6dGVcXC0vaS50ZXN0KGEuc3Vic3RyKDAsNCkpKWNoZWNrID0gdHJ1ZX0pKG5hdmlnYXRvci51c2VyQWdlbnR8fG5hdmlnYXRvci52ZW5kb3J8fHdpbmRvdy5vcGVyYSk7XG4gIHJldHVybiBjaGVjaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NChtaW1lVHlwZSwgYmFzZTY0KSB7XG4gIHJldHVybiAnZGF0YTonICsgbWltZVR5cGUgKyAnO2Jhc2U2NCwnICsgYmFzZTY0O1xufVxuIiwiLyoqXG4gKiBUd2Vlbi5qcyAtIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL3R3ZWVuanMvdHdlZW4uanNcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3R3ZWVuanMvdHdlZW4uanMvZ3JhcGhzL2NvbnRyaWJ1dG9ycyBmb3IgdGhlIGZ1bGwgbGlzdCBvZiBjb250cmlidXRvcnMuXG4gKiBUaGFuayB5b3UgYWxsLCB5b3UncmUgYXdlc29tZSFcbiAqL1xuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoZnVuY3Rpb24gKCkge1xuXG5cdHZhciBfdHdlZW5zID0gW107XG5cblx0cmV0dXJuIHtcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKHR3ZWVuKSB7XG5cblx0XHRcdF90d2VlbnMucHVzaCh0d2Vlbik7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbiAodHdlZW4pIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YodHdlZW4pO1xuXG5cdFx0XHRpZiAoaSAhPT0gLTEpIHtcblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAodGltZSwgcHJlc2VydmUpIHtcblxuXHRcdFx0aWYgKF90d2VlbnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGkgPSAwO1xuXG5cdFx0XHR0aW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6IFRXRUVOLm5vdygpO1xuXG5cdFx0XHR3aGlsZSAoaSA8IF90d2VlbnMubGVuZ3RoKSB7XG5cblx0XHRcdFx0aWYgKF90d2VlbnNbaV0udXBkYXRlKHRpbWUpIHx8IHByZXNlcnZlKSB7XG5cdFx0XHRcdFx0aSsrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF90d2VlbnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cdH07XG5cbn0pKCk7XG5cblxuLy8gSW5jbHVkZSBhIHBlcmZvcm1hbmNlLm5vdyBwb2x5ZmlsbFxuKGZ1bmN0aW9uICgpIHtcblx0Ly8gSW4gbm9kZS5qcywgdXNlIHByb2Nlc3MuaHJ0aW1lLlxuXHRpZiAodGhpcy53aW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0aGlzLnByb2Nlc3MgIT09IHVuZGVmaW5lZCkge1xuXHRcdFRXRUVOLm5vdyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciB0aW1lID0gcHJvY2Vzcy5ocnRpbWUoKTtcblxuXHRcdFx0Ly8gQ29udmVydCBbc2Vjb25kcywgbWljcm9zZWNvbmRzXSB0byBtaWxsaXNlY29uZHMuXG5cdFx0XHRyZXR1cm4gdGltZVswXSAqIDEwMDAgKyB0aW1lWzFdIC8gMTAwMDtcblx0XHR9O1xuXHR9XG5cdC8vIEluIGEgYnJvd3NlciwgdXNlIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgaWYgaXQgaXMgYXZhaWxhYmxlLlxuXHRlbHNlIGlmICh0aGlzLndpbmRvdyAhPT0gdW5kZWZpbmVkICYmXG5cdCAgICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkICYmXG5cdFx0IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgIT09IHVuZGVmaW5lZCkge1xuXG5cdFx0Ly8gVGhpcyBtdXN0IGJlIGJvdW5kLCBiZWNhdXNlIGRpcmVjdGx5IGFzc2lnbmluZyB0aGlzIGZ1bmN0aW9uXG5cdFx0Ly8gbGVhZHMgdG8gYW4gaW52b2NhdGlvbiBleGNlcHRpb24gaW4gQ2hyb21lLlxuXHRcdFRXRUVOLm5vdyA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3aW5kb3cucGVyZm9ybWFuY2UpO1xuXHR9XG5cdC8vIFVzZSBEYXRlLm5vdyBpZiBpdCBpcyBhdmFpbGFibGUuXG5cdGVsc2UgaWYgKERhdGUubm93ICE9PSB1bmRlZmluZWQpIHtcblx0XHRUV0VFTi5ub3cgPSBEYXRlLm5vdztcblx0fVxuXHQvLyBPdGhlcndpc2UsIHVzZSAnbmV3IERhdGUoKS5nZXRUaW1lKCknLlxuXHRlbHNlIHtcblx0XHRUV0VFTi5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0fTtcblx0fVxufSkoKTtcblxuXG5UV0VFTi5Ud2VlbiA9IGZ1bmN0aW9uIChvYmplY3QpIHtcblxuXHR2YXIgX29iamVjdCA9IG9iamVjdDtcblx0dmFyIF92YWx1ZXNTdGFydCA9IHt9O1xuXHR2YXIgX3ZhbHVlc0VuZCA9IHt9O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0UmVwZWF0ID0ge307XG5cdHZhciBfZHVyYXRpb24gPSAxMDAwO1xuXHR2YXIgX3JlcGVhdCA9IDA7XG5cdHZhciBfeW95byA9IGZhbHNlO1xuXHR2YXIgX2lzUGxheWluZyA9IGZhbHNlO1xuXHR2YXIgX3JldmVyc2VkID0gZmFsc2U7XG5cdHZhciBfZGVsYXlUaW1lID0gMDtcblx0dmFyIF9zdGFydFRpbWUgPSBudWxsO1xuXHR2YXIgX2Vhc2luZ0Z1bmN0aW9uID0gVFdFRU4uRWFzaW5nLkxpbmVhci5Ob25lO1xuXHR2YXIgX2ludGVycG9sYXRpb25GdW5jdGlvbiA9IFRXRUVOLkludGVycG9sYXRpb24uTGluZWFyO1xuXHR2YXIgX2NoYWluZWRUd2VlbnMgPSBbXTtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cdHZhciBfb25VcGRhdGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25Db21wbGV0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0b3BDYWxsYmFjayA9IG51bGw7XG5cblx0Ly8gU2V0IGFsbCBzdGFydGluZyB2YWx1ZXMgcHJlc2VudCBvbiB0aGUgdGFyZ2V0IG9iamVjdFxuXHRmb3IgKHZhciBmaWVsZCBpbiBvYmplY3QpIHtcblx0XHRfdmFsdWVzU3RhcnRbZmllbGRdID0gcGFyc2VGbG9hdChvYmplY3RbZmllbGRdLCAxMCk7XG5cdH1cblxuXHR0aGlzLnRvID0gZnVuY3Rpb24gKHByb3BlcnRpZXMsIGR1cmF0aW9uKSB7XG5cblx0XHRpZiAoZHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0X2R1cmF0aW9uID0gZHVyYXRpb247XG5cdFx0fVxuXG5cdFx0X3ZhbHVlc0VuZCA9IHByb3BlcnRpZXM7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RhcnQgPSBmdW5jdGlvbiAodGltZSkge1xuXG5cdFx0VFdFRU4uYWRkKHRoaXMpO1xuXG5cdFx0X2lzUGxheWluZyA9IHRydWU7XG5cblx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblxuXHRcdF9zdGFydFRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogVFdFRU4ubm93KCk7XG5cdFx0X3N0YXJ0VGltZSArPSBfZGVsYXlUaW1lO1xuXG5cdFx0Zm9yICh2YXIgcHJvcGVydHkgaW4gX3ZhbHVlc0VuZCkge1xuXG5cdFx0XHQvLyBDaGVjayBpZiBhbiBBcnJheSB3YXMgcHJvdmlkZWQgYXMgcHJvcGVydHkgdmFsdWVcblx0XHRcdGlmIChfdmFsdWVzRW5kW3Byb3BlcnR5XSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cblx0XHRcdFx0aWYgKF92YWx1ZXNFbmRbcHJvcGVydHldLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbG9jYWwgY29weSBvZiB0aGUgQXJyYXkgd2l0aCB0aGUgc3RhcnQgdmFsdWUgYXQgdGhlIGZyb250XG5cdFx0XHRcdF92YWx1ZXNFbmRbcHJvcGVydHldID0gW19vYmplY3RbcHJvcGVydHldXS5jb25jYXQoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0pO1xuXG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIGB0bygpYCBzcGVjaWZpZXMgYSBwcm9wZXJ0eSB0aGF0IGRvZXNuJ3QgZXhpc3QgaW4gdGhlIHNvdXJjZSBvYmplY3QsXG5cdFx0XHQvLyB3ZSBzaG91bGQgbm90IHNldCB0aGF0IHByb3BlcnR5IGluIHRoZSBvYmplY3Rcblx0XHRcdGlmIChfdmFsdWVzU3RhcnRbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPSBfb2JqZWN0W3Byb3BlcnR5XTtcblxuXHRcdFx0aWYgKChfdmFsdWVzU3RhcnRbcHJvcGVydHldIGluc3RhbmNlb2YgQXJyYXkpID09PSBmYWxzZSkge1xuXHRcdFx0XHRfdmFsdWVzU3RhcnRbcHJvcGVydHldICo9IDEuMDsgLy8gRW5zdXJlcyB3ZSdyZSB1c2luZyBudW1iZXJzLCBub3Qgc3RyaW5nc1xuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSB8fCAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoIV9pc1BsYXlpbmcpIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdFRXRUVOLnJlbW92ZSh0aGlzKTtcblx0XHRfaXNQbGF5aW5nID0gZmFsc2U7XG5cblx0XHRpZiAoX29uU3RvcENhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRfb25TdG9wQ2FsbGJhY2suY2FsbChfb2JqZWN0KTtcblx0XHR9XG5cblx0XHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0b3AoKTtcblx0XHR9XG5cblx0fTtcblxuXHR0aGlzLmRlbGF5ID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG5cdFx0X2RlbGF5VGltZSA9IGFtb3VudDtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMucmVwZWF0ID0gZnVuY3Rpb24gKHRpbWVzKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnlveW8gPSBmdW5jdGlvbiAoeW95bykge1xuXG5cdFx0X3lveW8gPSB5b3lvO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblxuXHR0aGlzLmVhc2luZyA9IGZ1bmN0aW9uIChlYXNpbmcpIHtcblxuXHRcdF9lYXNpbmdGdW5jdGlvbiA9IGVhc2luZztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuaW50ZXJwb2xhdGlvbiA9IGZ1bmN0aW9uIChpbnRlcnBvbGF0aW9uKSB7XG5cblx0XHRfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gaW50ZXJwb2xhdGlvbjtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuY2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRfY2hhaW5lZFR3ZWVucyA9IGFyZ3VtZW50cztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdGFydCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uU3RhcnRDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblVwZGF0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25Db21wbGV0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uQ29tcGxldGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0b3AgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRcdF9vblN0b3BDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbiAodGltZSkge1xuXG5cdFx0dmFyIHByb3BlcnR5O1xuXHRcdHZhciBlbGFwc2VkO1xuXHRcdHZhciB2YWx1ZTtcblxuXHRcdGlmICh0aW1lIDwgX3N0YXJ0VGltZSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9PT0gZmFsc2UpIHtcblxuXHRcdFx0aWYgKF9vblN0YXJ0Q2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdFx0X29uU3RhcnRDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdFx0fVxuXG5cdFx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0ZWxhcHNlZCA9ICh0aW1lIC0gX3N0YXJ0VGltZSkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YWx1ZSA9IF9lYXNpbmdGdW5jdGlvbihlbGFwc2VkKTtcblxuXHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc0VuZCkge1xuXG5cdFx0XHQvLyBEb24ndCB1cGRhdGUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBleGlzdCBpbiB0aGUgc291cmNlIG9iamVjdFxuXHRcdFx0aWYgKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHN0YXJ0ID0gX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSB8fCAwO1xuXHRcdFx0dmFyIGVuZCA9IF92YWx1ZXNFbmRbcHJvcGVydHldO1xuXG5cdFx0XHRpZiAoZW5kIGluc3RhbmNlb2YgQXJyYXkpIHtcblxuXHRcdFx0XHRfb2JqZWN0W3Byb3BlcnR5XSA9IF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24oZW5kLCB2YWx1ZSk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Ly8gUGFyc2VzIHJlbGF0aXZlIGVuZCB2YWx1ZXMgd2l0aCBzdGFydCBhcyBiYXNlIChlLmcuOiArMTAsIC0zKVxuXHRcdFx0XHRpZiAodHlwZW9mIChlbmQpID09PSAnc3RyaW5nJykge1xuXG5cdFx0XHRcdFx0aWYgKGVuZC5jaGFyQXQoMCkgPT09ICcrJyB8fCBlbmQuY2hhckF0KDApID09PSAnLScpIHtcblx0XHRcdFx0XHRcdGVuZCA9IHN0YXJ0ICsgcGFyc2VGbG9hdChlbmQsIDEwKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZW5kID0gcGFyc2VGbG9hdChlbmQsIDEwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBQcm90ZWN0IGFnYWluc3Qgbm9uIG51bWVyaWMgcHJvcGVydGllcy5cblx0XHRcdFx0aWYgKHR5cGVvZiAoZW5kKSA9PT0gJ251bWJlcicpIHtcblx0XHRcdFx0XHRfb2JqZWN0W3Byb3BlcnR5XSA9IHN0YXJ0ICsgKGVuZCAtIHN0YXJ0KSAqIHZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGlmIChfb25VcGRhdGVDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0X29uVXBkYXRlQ2FsbGJhY2suY2FsbChfb2JqZWN0LCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0aWYgKGVsYXBzZWQgPT09IDEpIHtcblxuXHRcdFx0aWYgKF9yZXBlYXQgPiAwKSB7XG5cblx0XHRcdFx0aWYgKGlzRmluaXRlKF9yZXBlYXQpKSB7XG5cdFx0XHRcdFx0X3JlcGVhdC0tO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVhc3NpZ24gc3RhcnRpbmcgdmFsdWVzLCByZXN0YXJ0IGJ5IG1ha2luZyBzdGFydFRpbWUgPSBub3dcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBfdmFsdWVzU3RhcnRSZXBlYXQpIHtcblxuXHRcdFx0XHRcdGlmICh0eXBlb2YgKF92YWx1ZXNFbmRbcHJvcGVydHldKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldICsgcGFyc2VGbG9hdChfdmFsdWVzRW5kW3Byb3BlcnR5XSwgMTApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV07XG5cblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzRW5kW3Byb3BlcnR5XTtcblx0XHRcdFx0XHRcdF92YWx1ZXNFbmRbcHJvcGVydHldID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRfcmV2ZXJzZWQgPSAhX3JldmVyc2VkO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0X3N0YXJ0VGltZSA9IHRpbWUgKyBfZGVsYXlUaW1lO1xuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdGlmIChfb25Db21wbGV0ZUNhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0X29uQ29tcGxldGVDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdFx0XHQvLyBNYWtlIHRoZSBjaGFpbmVkIHR3ZWVucyBzdGFydCBleGFjdGx5IGF0IHRoZSB0aW1lIHRoZXkgc2hvdWxkLFxuXHRcdFx0XHRcdC8vIGV2ZW4gaWYgdGhlIGB1cGRhdGUoKWAgbWV0aG9kIHdhcyBjYWxsZWQgd2F5IHBhc3QgdGhlIGR1cmF0aW9uIG9mIHRoZSB0d2VlblxuXHRcdFx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0YXJ0KF9zdGFydFRpbWUgKyBfZHVyYXRpb24pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHR9O1xuXG59O1xuXG5cblRXRUVOLkVhc2luZyA9IHtcblxuXHRMaW5lYXI6IHtcblxuXHRcdE5vbmU6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhZHJhdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiAoMiAtIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gMC41ICogKC0tayAqIChrIC0gMikgLSAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEN1YmljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFydGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtICgtLWsgKiBrICogayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoKGsgLT0gMikgKiBrICogayAqIGsgLSAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1aW50aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqIGsgKiBrICogayArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0U2ludXNvaWRhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5jb3MoayAqIE1hdGguUEkgLyAyKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNpbihrICogTWF0aC5QSSAvIDIpO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RXhwb25lbnRpYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdygxMDI0LCBrIC0gMSk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMSA/IDEgOiAxIC0gTWF0aC5wb3coMiwgLSAxMCAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIE1hdGgucG93KDEwMjQsIGsgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgtIE1hdGgucG93KDIsIC0gMTAgKiAoayAtIDEpKSArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguc3FydCgxIC0gayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gLSAwLjUgKiAoTWF0aC5zcXJ0KDEgLSBrICogaykgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqIChNYXRoLnNxcnQoMSAtIChrIC09IDIpICogaykgKyAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEVsYXN0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAtTWF0aC5wb3coMiwgMTAgKiAoayAtIDEpKSAqIE1hdGguc2luKChrIC0gMS4xKSAqIDUgKiBNYXRoLlBJKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIE1hdGgucG93KDIsIC0xMCAqIGspICogTWF0aC5zaW4oKGsgLSAwLjEpICogNSAqIE1hdGguUEkpICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRrICo9IDI7XG5cblx0XHRcdGlmIChrIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gLTAuNSAqIE1hdGgucG93KDIsIDEwICogKGsgLSAxKSkgKiBNYXRoLnNpbigoayAtIDEuMSkgKiA1ICogTWF0aC5QSSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiBNYXRoLnBvdygyLCAtMTAgKiAoayAtIDEpKSAqIE1hdGguc2luKChrIC0gMS4xKSAqIDUgKiBNYXRoLlBJKSArIDE7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCYWNrOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiAoKHMgKyAxKSAqIGsgLSBzKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiAoKHMgKyAxKSAqIGsgKyBzKSArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1OCAqIDEuNTI1O1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiAoayAqIGsgKiAoKHMgKyAxKSAqIGsgLSBzKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoKGsgLT0gMikgKiBrICogKChzICsgMSkgKiBrICsgcykgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJvdW5jZToge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoMSAtIGspO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPCAoMSAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiBrICogaztcblx0XHRcdH0gZWxzZSBpZiAoayA8ICgyIC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgxLjUgLyAyLjc1KSkgKiBrICsgMC43NTtcblx0XHRcdH0gZWxzZSBpZiAoayA8ICgyLjUgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuMjUgLyAyLjc1KSkgKiBrICsgMC45Mzc1O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjYyNSAvIDIuNzUpKSAqIGsgKyAwLjk4NDM3NTtcblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPCAwLjUpIHtcblx0XHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuSW4oayAqIDIpICogMC41O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoayAqIDIgLSAxKSAqIDAuNSArIDAuNTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cblRXRUVOLkludGVycG9sYXRpb24gPSB7XG5cblx0TGluZWFyOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIGYgPSBtICogaztcblx0XHR2YXIgaSA9IE1hdGguZmxvb3IoZik7XG5cdFx0dmFyIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5MaW5lYXI7XG5cblx0XHRpZiAoayA8IDApIHtcblx0XHRcdHJldHVybiBmbih2WzBdLCB2WzFdLCBmKTtcblx0XHR9XG5cblx0XHRpZiAoayA+IDEpIHtcblx0XHRcdHJldHVybiBmbih2W21dLCB2W20gLSAxXSwgbSAtIGYpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmbih2W2ldLCB2W2kgKyAxID4gbSA/IG0gOiBpICsgMV0sIGYgLSBpKTtcblxuXHR9LFxuXG5cdEJlemllcjogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBiID0gMDtcblx0XHR2YXIgbiA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgcHcgPSBNYXRoLnBvdztcblx0XHR2YXIgYm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkJlcm5zdGVpbjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IG47IGkrKykge1xuXHRcdFx0YiArPSBwdygxIC0gaywgbiAtIGkpICogcHcoaywgaSkgKiB2W2ldICogYm4obiwgaSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGI7XG5cblx0fSxcblxuXHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIGYgPSBtICogaztcblx0XHR2YXIgaSA9IE1hdGguZmxvb3IoZik7XG5cdFx0dmFyIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5DYXRtdWxsUm9tO1xuXG5cdFx0aWYgKHZbMF0gPT09IHZbbV0pIHtcblxuXHRcdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRcdGkgPSBNYXRoLmZsb29yKGYgPSBtICogKDEgKyBrKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmbih2WyhpIC0gMSArIG0pICUgbV0sIHZbaV0sIHZbKGkgKyAxKSAlIG1dLCB2WyhpICsgMikgJSBtXSwgZiAtIGkpO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRcdHJldHVybiB2WzBdIC0gKGZuKHZbMF0sIHZbMF0sIHZbMV0sIHZbMV0sIC1mKSAtIHZbMF0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA+IDEpIHtcblx0XHRcdFx0cmV0dXJuIHZbbV0gLSAoZm4odlttXSwgdlttXSwgdlttIC0gMV0sIHZbbSAtIDFdLCBmIC0gbSkgLSB2W21dKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZuKHZbaSA/IGkgLSAxIDogMF0sIHZbaV0sIHZbbSA8IGkgKyAxID8gbSA6IGkgKyAxXSwgdlttIDwgaSArIDIgPyBtIDogaSArIDJdLCBmIC0gaSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRVdGlsczoge1xuXG5cdFx0TGluZWFyOiBmdW5jdGlvbiAocDAsIHAxLCB0KSB7XG5cblx0XHRcdHJldHVybiAocDEgLSBwMCkgKiB0ICsgcDA7XG5cblx0XHR9LFxuXG5cdFx0QmVybnN0ZWluOiBmdW5jdGlvbiAobiwgaSkge1xuXG5cdFx0XHR2YXIgZmMgPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkZhY3RvcmlhbDtcblxuXHRcdFx0cmV0dXJuIGZjKG4pIC8gZmMoaSkgLyBmYyhuIC0gaSk7XG5cblx0XHR9LFxuXG5cdFx0RmFjdG9yaWFsOiAoZnVuY3Rpb24gKCkge1xuXG5cdFx0XHR2YXIgYSA9IFsxXTtcblxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChuKSB7XG5cblx0XHRcdFx0dmFyIHMgPSAxO1xuXG5cdFx0XHRcdGlmIChhW25dKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFbbl07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gbjsgaSA+IDE7IGktLSkge1xuXHRcdFx0XHRcdHMgKj0gaTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGFbbl0gPSBzO1xuXHRcdFx0XHRyZXR1cm4gcztcblxuXHRcdFx0fTtcblxuXHRcdH0pKCksXG5cblx0XHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAocDAsIHAxLCBwMiwgcDMsIHQpIHtcblxuXHRcdFx0dmFyIHYwID0gKHAyIC0gcDApICogMC41O1xuXHRcdFx0dmFyIHYxID0gKHAzIC0gcDEpICogMC41O1xuXHRcdFx0dmFyIHQyID0gdCAqIHQ7XG5cdFx0XHR2YXIgdDMgPSB0ICogdDI7XG5cblx0XHRcdHJldHVybiAoMiAqIHAxIC0gMiAqIHAyICsgdjAgKyB2MSkgKiB0MyArICgtIDMgKiBwMSArIDMgKiBwMiAtIDIgKiB2MCAtIHYxKSAqIHQyICsgdjAgKiB0ICsgcDE7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG4vLyBVTUQgKFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbilcbihmdW5jdGlvbiAocm9vdCkge1xuXG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblxuXHRcdC8vIEFNRFxuXHRcdGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIFRXRUVOO1xuXHRcdH0pO1xuXG5cdH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cblx0XHQvLyBOb2RlLmpzXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBUV0VFTjtcblxuXHR9IGVsc2UgaWYgKHJvb3QgIT09IHVuZGVmaW5lZCkge1xuXG5cdFx0Ly8gR2xvYmFsIHZhcmlhYmxlXG5cdFx0cm9vdC5UV0VFTiA9IFRXRUVOO1xuXG5cdH1cblxufSkodGhpcyk7XG4iLCJpbXBvcnQgUGFwYSBmcm9tICdwYXBhcGFyc2UnO1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcblxuLyoqXG4gKiBCYXNlIERhdGFzZXQgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIERhdGFzZXQge1xuXG5cdC8qKlxuXHQgKlxuXHQgKi9cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5kYXRhcG9pbnRzID0ge307XG5cdFx0dGhpcy5lbWJlZGRpbmdzID0gW107XG5cdH1cblxuXHQvKipcblx0ICogQSBjYWxsYmFjayB0aGF0IGlzIHRyaWdnZXJlZCBhZnRlciB0aGUgZGF0YXNldCBpcyBsb2FkZWQ7IHR5cGljYWxseSB1c2VkIHRvIGNyZWF0ZVxuXHQgKiBhbiBlbWJlZGRpbmcgYmFzZWQgb24gdGhlIGRhdGFzZXQuXG5cdCAqIEBjYWxsYmFjayBDU1ZEYXRhc2V0Q2FsbGJhY2tcblx0ICogQHBhcmFtIHtEYXRhc2V0fSBkYXRhc2V0IC0gVGhlIERhdGFzZXQgbG9hZGVkIGZyb20gdGhlIGNzdiBmaWxlXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSB7RGF0YXNldH0gZnJvbSBhIGNzdiBmaWxlIHRoYXQgY2FuIGJlIGZvdW5kIGF0IHRoZSBnaXZlbiB1cmxcblx0ICogQHBhcmFtIHtTdHJpbmd9IHVybCAtIFRoZSB1cmwgd2hlcmUgdGhlIGNzdiBmaWxlIGNhbiBiZSBmb3VuZFxuXHQgKiBAcGFyYW0ge0NTVkRhdGFzZXRDYWxsYmFja30gY2FsbGJhY2tcblx0ICovXG5cdHN0YXRpYyBjcmVhdGVGcm9tQ1NWKHVybCwgY2FsbGJhY2spIHtcblx0XHRQYXBhLnBhcnNlKHVybCwge1xuXHRcdFx0ZG93bmxvYWQ6IHRydWUsXG5cdFx0XHRoZWFkZXI6IHRydWUsXG5cdFx0XHRkeW5hbWljVHlwaW5nOiB0cnVlLFxuXHRcdFx0Y29tcGxldGU6IGZ1bmN0aW9uKHJlc3VsdHMpIHtcblx0XHRcdFx0dmFyIGRzID0gbmV3IERhdGFzZXQoKTtcblx0XHRcdFx0Zm9yIChsZXQgaSBpbiByZXN1bHRzLmRhdGEpIHtcblx0XHRcdFx0XHRsZXQgZHAgPSByZXN1bHRzLmRhdGFbaV07XG5cdFx0XHRcdFx0ZHAuX2lkID0gaTtcblx0XHRcdFx0XHRkcy5hZGQoZHApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKGRzKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGQgYSBkYXRhcG9pbnQgdG8gdGhlIERhdGFzZXRcblx0ICogQHBhcmFtIHtEYXRhcG9pbnR9IGRhdGFwb2ludFxuXHQgKi9cblx0YWRkKGRhdGFwb2ludCkge1xuXHRcdHZhciBkO1xuXHRcdGlmICghIChkYXRhcG9pbnQgaW5zdGFuY2VvZiBEYXRhcG9pbnQpKSB7XG5cdFx0XHRkID0gbmV3IERhdGFwb2ludChkYXRhcG9pbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkID0gZGF0YXBvaW50O1xuXHRcdH1cblx0XHR0aGlzLmRhdGFwb2ludHNbZC5pZF0gPSBkO1xuXHRcdHRoaXMuc2VuZE5vdGlmaWNhdGlvbnMoJ2FkZCcsIGQuaWQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlbW92ZSBhIGRhdGFwb2ludCBmcm9tIHRoZSBEYXRhc2V0XG5cdCAqIEBwYXJhbSBpZCAtIFRoZSBpZCBvZiB0aGUgZGF0YXBvaW50IHRvIHJlbW92ZVxuXHQgKi9cblx0cmVtb3ZlKGlkKSB7XG5cdFx0ZGVsZXRlIHRoaXMuZGF0YXBvaW50c1tpZF07XG5cdFx0dGhpcy5zZW5kTm90aWZpY2F0aW9ucygncmVtb3ZlJywgaWQpXG5cdH1cblxuXHQvKipcblx0ICogTW9kaWZ5IHRoZSB2YWx1ZSBvZiBhIGRhdGFwb2ludCBhdHRyaWJ1dGVcblx0ICogQHBhcmFtIGlkIC0gVGhlIGlkIG9mIHRoZSBkYXRhcG9pbnQgdG8gbW9kaWZ5XG5cdCAqIEBwYXJhbSBrIC0gVGhlIGtleSB3aG9zZSB2YWx1ZSB0byBtb2RpZnlcblx0IEAgQHBhcmFtIHYgLSBUaGUgbmV3IHZhbHVlXG5cdCAqL1xuXHR1cGRhdGUoaWQsIGssIHYpIHtcblx0XHRsZXQgZHAgPSB0aGlzLmRhdGFwb2ludHNbaWRdO1xuXHRcdGlmIChkcCkge1xuXHRcdFx0bGV0IG9sZCA9IGRwLmdldChrKTtcblx0XHRcdGRwLnNldChrLCB2KTtcblx0XHRcdHRoaXMuc2VuZE5vdGlmaWNhdGlvbnMoJ3VwZGF0ZScsIGlkLCBrLCB2LCBvbGQpXG5cdFx0fVxuXHR9XG5cblx0Z2V0KGlkKSB7IHJldHVybiB0aGlzLmRhdGFwb2ludHNbaWRdOyB9XG5cblx0Z2V0SWRzKCkgeyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5kYXRhcG9pbnRzKTsgfVxuXG5cdHJlZ2lzdGVyKGVtYmVkZGluZykge1xuXHRcdHRoaXMuZW1iZWRkaW5ncy5wdXNoKGVtYmVkZGluZyk7XG5cdH1cblxuXHRzZW5kTm90aWZpY2F0aW9ucyh0eXBlLCBpZCwgLi4ueCkge1xuXHRcdGxldCBtc2cgPSB7IHR5cGU6IHR5cGUsIGlkOiBpZCB9O1xuXHRcdGlmICh0eXBlID09ICd1cGRhdGUnKSB7XG5cdFx0XHRtc2cuYXR0ciA9IHhbMF07XG5cdFx0XHRtc2cubmV3VmFsID0geFsxXTtcblx0XHRcdG1zZy5vbGRWYWwgPSB4WzJdO1xuXHRcdH1cblx0XHR0aGlzLmVtYmVkZGluZ3MuZm9yRWFjaCgoZSkgPT4gZS5ub3RpZnkoIG1zZyApKTtcblx0fVxufVxuXG4vKipcbiAqIEEgRGF0YXNldCB3aG9zZSBkYXRhcG9pbnRzIGFyZSByZWNlaXZlZCBmcm9tIGEgd2Vic29ja2V0LlxuICovXG5leHBvcnQgY2xhc3MgV2ViU29ja2V0RGF0YXNldCBleHRlbmRzIERhdGFzZXQge1xuXHRjb25zdHJ1Y3Rvcih1cmwsIG9wdGlvbnMgPSB7fSkge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oe29ubWVzc2FnZTogKHgpID0+IHgsIGluaXQ6IChzKSA9PiB7fX0sIG9wdGlvbnMpXG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMuc29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpO1xuXHRcdHRoaXMuc29ja2V0Lm9ub3BlbiA9ICgpID0+IHRoaXMub3B0aW9ucy5pbml0KHRoaXMuc29ja2V0KTtcblx0XHR0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XG5cdFx0XHR2YXIgZCA9IHRoaXMub3B0aW9ucy5vbm1lc3NhZ2UoSlNPTi5wYXJzZShtLmRhdGEpKTtcblx0XHRcdHRoaXMuYWRkKGQpO1xuXHRcdH0uYmluZCh0aGlzKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgRGF0YXBvaW50IHtcblx0Y29uc3RydWN0b3IodmFsdWVzLCBpZEF0dHJpYnV0ZT0nX2lkJykge1xuXHRcdHRoaXMudmFsdWVzID0gdmFsdWVzO1xuXHRcdHRoaXMuaWRBdHRyaWJ1dGUgPSBpZEF0dHJpYnV0ZTtcblx0fVxuXG5cdGdldCBpZCgpIHtcblx0XHRyZXR1cm4gdGhpcy52YWx1ZXNbdGhpcy5pZEF0dHJpYnV0ZV07XG5cdH1cblxuXHRnZXQoaykgeyByZXR1cm4gdGhpcy52YWx1ZXNba107IH1cblxuXHRzZXQoaywgdikge1xuXHRcdHRoaXMudmFsdWVzW2tdID0gdjtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnXG5cbi8vIGxvZ2ljIGhlcmUgYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9ib3Jpc211cy9yYXktaW5wdXQvYmxvYi9tYXN0ZXIvc3JjL3JheS1jb250cm9sbGVyLmpzXG5cbmV4cG9ydCBjb25zdCBESVNQTEFZX1RZUEVTID0ge1xuXHRERVNLVE9QOiAnREVTS1RPUF9ESVNQTEFZJyxcblx0TU9CSUxFOiAnTU9CSUxFX0RTSVBMQVknLFxuXHRWUjogJ1ZSX0RJU1BMQVknXG59XG5cbmV4cG9ydCBjb25zdCBJTlBVVF9UWVBFUyA9IHtcblx0S0JfTU9VU0U6ICdLQl9NT1VTRV9JTlBVVCcsXG5cdFRPVUNIOiAnVE9VQ0hfSU5QVVQnLFxuXHRWUl9HQVpFOiAnVlJfR0FaRV9JTlBVVCcsXG5cdFZSXzNET0Y6ICdWUl8zRE9GX0lOUFVUJyxcblx0VlJfNkRPRjogJ1ZSXzZET0ZfSU5QVVQnXG59XG5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ib3Jpc211cy9yYXktaW5wdXQvYmxvYi9tYXN0ZXIvc3JjL3V0aWwuanNcbmZ1bmN0aW9uIGlzTW9iaWxlKCkge1xuICB2YXIgY2hlY2sgPSBmYWxzZTtcbiAgKGZ1bmN0aW9uKGEpe2lmKC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm8vaS50ZXN0KGEpfHwvMTIwN3w2MzEwfDY1OTB8M2dzb3w0dGhwfDUwWzEtNl1pfDc3MHN8ODAyc3xhIHdhfGFiYWN8YWMoZXJ8b298c1xcLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXxcXC1tfHIgfHMgKXxhdmFufGJlKGNrfGxsfG5xKXxiaShsYnxyZCl8YmwoYWN8YXopfGJyKGV8dil3fGJ1bWJ8YndcXC0obnx1KXxjNTVcXC98Y2FwaXxjY3dhfGNkbVxcLXxjZWxsfGNodG18Y2xkY3xjbWRcXC18Y28obXB8bmQpfGNyYXd8ZGEoaXR8bGx8bmcpfGRidGV8ZGNcXC1zfGRldml8ZGljYXxkbW9ifGRvKGN8cClvfGRzKDEyfFxcLWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseShcXC18Xyl8ZzEgdXxnNTYwfGdlbmV8Z2ZcXC01fGdcXC1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkXFwtKG18cHx0KXxoZWlcXC18aGkocHR8dGEpfGhwKCBpfGlwKXxoc1xcLWN8aHQoYyhcXC18IHxffGF8Z3xwfHN8dCl8dHApfGh1KGF3fHRjKXxpXFwtKDIwfGdvfG1hKXxpMjMwfGlhYyggfFxcLXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djXFwtfGt5byhjfGspfGxlKG5vfHhpKXxsZyggZ3xcXC8oa3xsfHUpfDUwfDU0fFxcLVthLXddKXxsaWJ3fGx5bnh8bTFcXC13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bVxcLWNyfG1lKHJjfHJpKXxtaShvOHxvYXx0cyl8bW1lZnxtbygwMXwwMnxiaXxkZXxkb3x0KFxcLXwgfG98dil8enopfG10KDUwfHAxfHYgKXxtd2JwfG15d2F8bjEwWzAtMl18bjIwWzItM118bjMwKDB8Mil8bjUwKDB8Mnw1KXxuNygwKDB8MSl8MTApfG5lKChjfG0pXFwtfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3xcXC0oWzEtOF18YykpfHBoaWx8cGlyZXxwbChheXx1Yyl8cG5cXC0yfHBvKGNrfHJ0fHNlKXxwcm94fHBzaW98cHRcXC1nfHFhXFwtYXxxYygwN3wxMnwyMXwzMnw2MHxcXC1bMi03XXxpXFwtKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aFxcLXxvb3xwXFwtKXxzZGtcXC98c2UoYyhcXC18MHwxKXw0N3xtY3xuZHxyaSl8c2doXFwtfHNoYXJ8c2llKFxcLXxtKXxza1xcLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aFxcLXx2XFwtfHYgKXxzeSgwMXxtYil8dDIoMTh8NTApfHQ2KDAwfDEwfDE4KXx0YShndHxsayl8dGNsXFwtfHRkZ1xcLXx0ZWwoaXxtKXx0aW1cXC18dFxcLW1vfHRvKHBsfHNoKXx0cyg3MHxtXFwtfG0zfG01KXx0eFxcLTl8dXAoXFwuYnxnMXxzaSl8dXRzdHx2NDAwfHY3NTB8dmVyaXx2aShyZ3x0ZSl8dmsoNDB8NVswLTNdfFxcLXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoXFwtfCApfHdlYmN8d2hpdHx3aShnIHxuY3xudyl8d21sYnx3b251fHg3MDB8eWFzXFwtfHlvdXJ8emV0b3x6dGVcXC0vaS50ZXN0KGEuc3Vic3RyKDAsNCkpKWNoZWNrID0gdHJ1ZX0pKG5hdmlnYXRvci51c2VyQWdlbnR8fG5hdmlnYXRvci52ZW5kb3J8fHdpbmRvdy5vcGVyYSk7XG4gIHJldHVybiBjaGVjaztcbn1cblxuZnVuY3Rpb24gZGV0ZWN0RGlzcGxheSgpIHtcblx0aWYgKG5hdmlnYXRvci5nZXRWUkRpc3BsYXlzKSB7XG5cdFx0cmV0dXJuIERJU1BMQVlfVFlQRVMuVlI7XHRcblx0fSBlbHNlIHtcblx0XHRpZiAoaXNNb2JpbGUoKSlcblx0XHRcdHJldHVybiBESVNQTEFZX1RZUEVTLk1PQklMRTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gRElTUExBWV9UWVBFUy5ERVNLVE9QO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRldGVjdElucHV0KGRpc3BsYXlNb2RlKSB7XG5cdHZhciBnYW1lcGFkID0gdW5kZWZpbmVkO1xuXHRpZiAobmF2aWdhdG9yLmdldEdhbWVwYWRzKSB7XG5cdFx0bGV0IGdhbWVwYWRzID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKCk7XG5cdFx0Zm9yIChsZXQgZ2FtZXBhZCBvZiBnYW1lcGFkcykge1xuXHRcdFx0aWYgKGdhbWVwYWQgJiYgZ2FtZXBhZC5wb3NlKSB7XG5cdFx0XHRcdGlmIChnYW1lcGFkLnBvc2UuaGFzUG9zaXRpb24pIFxuXHRcdFx0XHRcdHJldHVybiBJTlBVVF9UWVBFUy5WUl82RE9GO1xuXHRcdFx0XHRlbHNlIGlmIChnYW1lcGFkLnBvc2UuaGFzT3JpZW50YXRpb24pXG5cdFx0XHRcdFx0cmV0dXJuIElOUFVUX1RZUEVTLlZSXzNET0Y7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gZ2FtZXBhZCBBUEkgbm90IGZvdW5kIG9yIG5vIFZSIGdhbWVwYWQgZm91bmRcblx0aWYgKGlzTW9iaWxlKCkpIHtcblx0XHRpZiAoZGlzcGxheU1vZGUgPT0gRElTUExBWV9UWVBFUy5WUilcblx0XHRcdHJldHVybiBJTlBVVF9UWVBFUy5WUl9HQVpFO1xuXHRcdGVsc2UgXG5cdFx0XHRyZXR1cm4gSU5QVVRfVFlQRVMuVE9VQ0g7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIElOUFVUX1RZUEVTLktCX01PVVNFO1xuXHR9XG5cblx0cmV0dXJuIElOUFVUX1RZUEVTLlRPVUNIO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0TW9kZSgpIHtcblx0Y29uc3QgZGlzcGxheU1vZGUgPSBkZXRlY3REaXNwbGF5KCk7XG5cdGNvbnN0IGlucHV0TW9kZSA9IGRldGVjdElucHV0KGRpc3BsYXlNb2RlKTtcblx0cmV0dXJuIHsgZGlzcGxheU1vZGUsIGlucHV0TW9kZSB9O1xufSIsImltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5pbXBvcnQgVFdFRU4gZnJvbSAndHdlZW4uanMnO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBlbWJlZGRpbmdzLlxuICovXG5leHBvcnQgY2xhc3MgRW1iZWRkaW5nIHtcblx0LyoqXG5cdCAqIEVtYmVkZGluZyBiYXNlIGNvbnN0cnVjdG9yLlxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICogQHBhcmFtIHNjZW5lIC0gVGhlIHNjZW5lIHRvIHdoaWNoIHRoZSBlbWJlZGRpbmcgYmVsb25nc1xuXHQgKiBAcGFyYW0ge0RhdGFzZXR9IGRhdGFzZXQgLSBUaGUgZGF0YXNldCB0aGF0IGJhY2tzIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSAtIE9wdGlvbnMgZGVzY3JpYmluZyB0aGUgZW1iZWRkaW5nJ3MgbG9jYXRpb24gYW5kIHNjYWxlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy54PTBdIC0geCBwb3NpdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy55PTBdIC0geSBwb3NpdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy56PTBdIC0geiBwb3NpdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5yeD0wXSAtIHggcm90YXRpb24gb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucnk9MF0gLSB5IHJvdGF0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnJ6PTBdIC0geiByb3RhdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5zeD0xXSAtIHggc2NhbGUgb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc3k9MV0gLSB5IHNjYWxlIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnN6PTFdIC0geiBzY2FsZSBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucyA9IHt9KSB7XG5cdFx0dGhpcy5kYXRhc2V0ID0gZGF0YXNldDtcblx0XHRpZiAoZGF0YXNldCkgZGF0YXNldC5yZWdpc3Rlcih0aGlzKTtcblx0XHR0aGlzLm9iajNEID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cdFx0c2NlbmUuYWRkKHRoaXMub2JqM0QpO1xuXHRcdHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcblx0XHR0aGlzLmV2ZW50cyA9IFtdO1xuXG5cdFx0Ly8gc2V0IGRlZmF1bHQgcG9zaXRpb24gYW5kIHJvdGF0aW9uXG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7IHg6IDAsIHk6IDAsIHo6IDAgfSwgb3B0aW9ucyk7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7IHJ4OjAsIHJ5OjAsIHJ6OjAgfSwgb3B0aW9ucyk7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7IHN4OjEsIHN5OjEsIHN6OjEgfSwgb3B0aW9ucyk7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7IG1hcHBpbmc6IHt9IH0sIG9wdGlvbnMpO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5vYmozRC5wb3NpdGlvbi5zZXQob3B0aW9ucy54LCBvcHRpb25zLnksIG9wdGlvbnMueik7XG5cdFx0dGhpcy5vYmozRC5yb3RhdGlvbi5zZXQob3B0aW9ucy5yeCwgb3B0aW9ucy5yeSwgb3B0aW9ucy5yeik7XG5cdFx0dGhpcy5vYmozRC5zY2FsZS5zZXQob3B0aW9ucy5zeCwgb3B0aW9ucy5zeSwgb3B0aW9ucy5zeik7XG5cdFx0Ly8gVE9ETyBjYW5vbmljYWxpemUsIHNhbml0aXplIG1hcHBpbmdcblx0XHR0aGlzLm1hcHBpbmcgPSB0aGlzLm9wdGlvbnMubWFwcGluZztcblx0fVxuXG5cdC8qKlxuXHQgKiBUcmFuc2xhdGVzIGZyb20gYSBzb3VyY2UgcHJvcGVydHkgb2YgYSBkYXRhcG9pbnQgdG8gYSB0YXJnZXQgcHJvcGVydHkgb2YgYW4gZW1iZWRkaW5nXG5cdCAqIGVsZW1lbnQuXG5cdCAqL1xuXHRfbWFwKGRwLCBzcmMpIHtcblx0XHRsZXQgdGd0ID0gdGhpcy5tYXBwaW5nW3NyY107XG5cdFx0cmV0dXJuIHRndCA/IGRwLmdldCh0Z3QpIDogZHAuZ2V0KHNyYyk7XG5cdH1cblxuXHQvKipcblx0ICogVHJhbnNsYXRlcyBmcm9tIGEgc291cmNlIHByb3BlcnR5IG9mIGEgZGF0YXBvaW50IHRvIGEgdGFyZ2V0IHByb3BlcnR5IG9mIGFuIGVtYmVkZGluZ1xuXHQgKiBlbGVtZW50LlxuXHQgKi9cblx0X21hcEF0dHIoc3JjKSB7XG5cdFx0bGV0IHRndCA9IHRoaXMubWFwcGluZ1tzcmNdO1xuXHRcdHJldHVybiB0Z3QgPyB0Z3QgOiBzcmM7XG5cdH1cblxuXHQvKipcblx0ICogUmVuZGVyIHRoZSBlbWJlZGRpbmcgLSBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IGVhY2ggY29uY3JldGUgc3ViY2xhc3MuXG5cdCAqIEBhYnN0cmFjdFxuXHQgKi9cblx0ZW1iZWQoKSB7XG5cdFx0Ly8gbm90IGltcGxlbWVudGVkIGhlcmVcblx0fVxuXG5cdG5vdGlmeShldmVudCkge1xuXHRcdHRoaXMuZXZlbnRzLnB1c2goZXZlbnQpO1xuXHR9XG5cblx0Z2V0T3B0KHgsIGRwID0gbnVsbCkge1xuXHRcdGxldCBhID0gdGhpcy5vcHRpb25zW3hdO1xuXHRcdGlmICh0eXBlb2YoYSkgPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGEoZHApO1xuXHRcdGVsc2UgcmV0dXJuIGE7XG5cdH1cbn1cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBlbWJlZGRpbmdzIHRoYXQgcmVuZGVyIERhdGFwb2ludHMgYXMgaW5kaXZpZHVhbCBtZXNoZXNcbiAqL1xuZXhwb3J0IGNsYXNzIE1lc2hFbWJlZGRpbmcgZXh0ZW5kcyBFbWJlZGRpbmcge1xuXHRjb25zdHJ1Y3RvcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucz17fSkge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oXG5cdFx0XHR7XG5cdFx0XHRcdG1lc2hTaXplWDogLjAyLFxuXHRcdFx0XHRtZXNoU2l6ZVk6IC4wMixcblx0XHRcdFx0bWVzaFNpemVaOiAuMDIsXG5cdFx0XHRcdG1hdGVyaWFsOiBuZXcgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwoIHtcblx0XHRcdFx0XHRjb2xvcjogMHhmZjAwZmYsXG5cdFx0XHRcdFx0ZW1pc3NpdmU6IDB4ODg4ODg4LFxuXHRcdFx0XHRcdHNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nXG5cdFx0XHRcdH0gKVxuXHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXG5cdFx0Ly8gbWFwcGluZyBmcm9tIGRhdGFwb2ludCBpZHMgdG8gbWVzaGVzXG5cdFx0dGhpcy5kcE1hcCA9IHt9O1xuXG5cdFx0Zm9yIChsZXQgaWQgb2YgdGhpcy5kYXRhc2V0LmdldElkcygpKSB0aGlzLl9wbGFjZURhdGFwb2ludChpZCk7XG5cdH1cblxuXHRlbWJlZCgpIHtcblx0XHQvLyBwcm9jZXNzIGV2ZW50cyBzZW50IGJ5IHRoZSBkYXRhc2V0IHNpbmNlIGxhc3QgZW1iZWQoKSBjYWxsXG5cdFx0aWYgKHRoaXMuZXZlbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvciAobGV0IGkgaW4gdGhpcy5ldmVudHMpIHtcblx0XHRcdFx0bGV0IGUgPSB0aGlzLmV2ZW50c1tpXTtcblx0XHRcdFx0aWYgICAgICAoZS50eXBlID09IFwiYWRkXCIpICAgIHRoaXMuX3BsYWNlRGF0YXBvaW50KGUuaWQpO1xuXHRcdFx0XHRlbHNlIGlmIChlLnR5cGUgPT0gXCJyZW1vdmVcIikgdGhpcy5fcmVtb3ZlRGF0YXBvaW50KGUuaWQpO1xuXHRcdFx0XHRlbHNlIGlmIChlLnR5cGUgPT0gXCJ1cGRhdGVcIikgdGhpcy5fdXBkYXRlRGF0YXBvaW50KGUuaWQsIGUpO1xuXHRcdFx0fVxuXHRcdH0gXG5cdFx0dGhpcy5ldmVudHMgPSBbXTtcdFx0XG5cdH1cblxuXHQvKipcblx0ICogQSBkZWZhdWx0IG1lc2ggY3JlYXRvcjsgdGhpcyBjYW4gYmUgb3ZlcnJpZGVuIGJ5IHN1YmNsYXNzZXMgXG5cdCAqL1xuXHRjcmVhdGVNZXNoRm9yRGF0YXBvaW50KGRwKSB7XG5cdFx0bGV0IGdlbyA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcblx0XHRcdHRoaXMuZ2V0T3B0KFwibWVzaFNpemVYXCIsIGRwKSwgdGhpcy5nZXRPcHQoXCJtZXNoU2l6ZVlcIiwgZHApLCB0aGlzLmdldE9wdChcIm1lc2hTaXplWlwiLCBkcCkpO1xuXHRcdGxldCBtYXQgPSB0aGlzLmdldE9wdCgnbWF0ZXJpYWwnKS5jbG9uZSgpO1xuXHRcdHJldHVybiBuZXcgVEhSRUUuTWVzaChnZW8sIG1hdCk7XG5cdH1cblxuXHRfcGxhY2VEYXRhcG9pbnQoaWQpIHtcblx0XHRsZXQgZHAgID0gdGhpcy5kYXRhc2V0LmRhdGFwb2ludHNbaWRdO1xuXHRcdGxldCBtZXNoID0gdGhpcy5jcmVhdGVNZXNoRm9yRGF0YXBvaW50KGRwKTtcblx0XHRtZXNoLnVzZXJEYXRhLmRlc2NyaXB0aW9uID0gdGhpcy5nZXRPcHQoXCJkZXNjcmlwdGlvblwiLCBkcCk7XG5cdFx0dGhpcy5kcE1hcFtpZF0gPSBtZXNoO1xuXHRcdHRoaXMub2JqM0QuYWRkKG1lc2gpO1xuXHRcdFRIUkVFLmlucHV0LmFkZChtZXNoKTtcblx0XHRtZXNoLnBvc2l0aW9uLnNldChkcC5nZXQodGhpcy5fbWFwQXR0cigneCcpKSwgZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3knKSksIGRwLmdldCh0aGlzLl9tYXBBdHRyKCd6JykpKTtcblx0fVxuXG5cdF9yZW1vdmVEYXRhcG9pbnQoaWQpIHtcblx0XHRsZXQgbWVzaCA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmIChtZXNoKSB0aGlzLm9iajNELnJlbW92ZShtZXNoKTtcblx0fVxuXG5cdF91cGRhdGVEYXRhcG9pbnQoaWQsIGV2ZW50KSB7XG5cdFx0X3JlbW92ZURhdGFwb2ludChpZCk7XG5cdFx0X3BsYWNlRGF0YXBvaW50KGlkKTtcblx0fVxuXG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgZW1iZWRkaW5nIGJhY2tlZCBieSBhIFBvaW50cyBvYmplY3QgKGkuZS4sIHBhcnRpY2xlIGNsb3VkcylcbiAqL1xuZXhwb3J0IGNsYXNzIFBvaW50c0VtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbihcblx0XHRcdHsgXG5cdFx0XHRcdHBvaW50VHlwZTogXCJiYWxsXCIsXG5cdFx0XHRcdHBvaW50U2l6ZTogMC4yLFxuXHRcdFx0XHRwb2ludENvbG9yOiAweGZmZmZmZlxuXHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXG5cdFx0Ly8gVE9ETyBiYXNlNjQgZW5jb2RlIGFuZCByZWFkIGZyb20gc3RyaW5nXG5cdFx0bGV0IHNwcml0ZSA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCkubG9hZChcblx0XHRcdFwiaHR0cHM6Ly9yYXdnaXQuY29tL2JlYXVjcm9uaW4vZW1iZWRkaW5nL21hc3Rlci9zdGF0aWMvc3ByaXRlcy9iYWxsLnBuZ1wiKTtcblx0XHRsZXQgbWF0ZXJpYWxQcm9wcyA9IHtcblx0XHRcdHNpemU6IHRoaXMuZ2V0T3B0KFwicG9pbnRTaXplXCIpLFxuXHRcdFx0c2l6ZUF0dGVudWF0aW9uOiB0cnVlLFxuXHRcdFx0bWFwOiBzcHJpdGUsXG5cdFx0XHRjb2xvcjogdGhpcy5nZXRPcHQoXCJwb2ludENvbG9yXCIpLFxuXHRcdFx0YWxwaGFUZXN0OiAwLjUsXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZVxuXHRcdH1cblx0XHR0aGlzLnBvaW50cyA9IG5ldyBUSFJFRS5Qb2ludHMoXG5cdFx0XHRuZXcgVEhSRUUuR2VvbWV0cnkoKSwgbmV3IFRIUkVFLlBvaW50c01hdGVyaWFsKG1hdGVyaWFsUHJvcHMpKTtcblx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKSk7XG5cdFx0dGhpcy5vYmozRC5hZGQodGhpcy5wb2ludHMpO1xuXHR9XG59XG5cbi8qKlxuICogQW4gZW1iZWRkaW5nIGluIHdoaWNoIGVhY2ggZGF0YXBvaW50IGlzIHJlbmRlcmVkIGFzIGEgdmVydGV4IGluIGEgVEhSRUUuUG9pbnRzIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYXR0ZXJFbWJlZGRpbmcgZXh0ZW5kcyBQb2ludHNFbWJlZGRpbmcge1xuXHRjb25zdHJ1Y3RvcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucz17fSkge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oIFxuXHRcdFx0eyBcblx0XHRcdFx0YnVmZmVyU2l6ZTogMTAwMCxcblx0XHRcdFx0bW92ZVNwZWVkOiAyLFxuXHRcdFx0XHRhdXRvU2NhbGU6IGZhbHNlLFxuXHRcdFx0XHRhdXRvU2NhbGVSYW5nZTogMTBcblx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKVxuXHRcdFxuXHRcdC8vIG1hcHBpbmcgZnJvbSBkYXRhcG9pbnQgaWRzIHRvIHZlcnRleCBpbmRpY2VzXG5cdFx0dGhpcy5kcE1hcCA9IHt9XG5cblx0XHQvLyB1bmFsbG9jYXRlZCB2ZXJ0aWNlcyBcblx0XHR0aGlzLmZyZWVWZXJ0aWNlcyA9IFtdO1xuXHRcdFxuXHRcdC8vIGluaXRpYWxpemUgdmVydGljZXMgYW5kIG1hcmsgdGhlbSBhcyB1bmFsbG9jYXRlZFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5nZXRPcHQoXCJidWZmZXJTaXplXCIpOyBpKyspIHtcblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzLnB1c2goXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0xMDAwMDAwLCAtMTAwMDAwMCwgLTEwMDAwMDApKTtcblx0XHRcdHRoaXMuZnJlZVZlcnRpY2VzLnB1c2goaSk7XG5cdFx0fVxuXG5cdFx0Ly8gY3JlYXRlIHJlc2NhbGluZ1xuXHRcdGlmICh0aGlzLmdldE9wdChcImF1dG9TY2FsZVwiKSkge1xuXHRcdFx0dGhpcy5faW5pdEF1dG9TY2FsZSh0aGlzLmdldE9wdChcImF1dG9TY2FsZVJhbmdlXCIpKTtcblx0XHRcdGNvbnNvbGUubG9nKHRoaXMucmVzY2FsZSk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLmdldE9wdChcInJlc2NhbGVcIikpIHtcblx0XHRcdC8vIFRPRE9cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZXNjYWxlID0gbmV3IFJlc2NhbGluZygpO1xuXHRcdH1cblxuXHRcdHRoaXMudHdlZW5zID0ge307XG5cdH1cblxuXHRfaW5pdEF1dG9TY2FsZShyYW5nZSkge1xuXHRcdGxldCBkcHMgPSB0aGlzLmRhdGFzZXQuZ2V0SWRzKCkubWFwKChpZCkgPT4gdGhpcy5kYXRhc2V0LmdldChpZCkpXG5cdFx0bGV0IHhtaW4gPSBNYXRoLm1pbi5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3gnKSkpKVxuXHRcdGxldCB4bWF4ID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd4JykpKSlcblx0XHRsZXQgeW1pbiA9IE1hdGgubWluLmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneScpKSkpXG5cdFx0bGV0IHltYXggPSBNYXRoLm1heC5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3knKSkpKVxuXHRcdGxldCB6bWluID0gTWF0aC5taW4uYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd6JykpKSlcblx0XHRsZXQgem1heCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneicpKSkpXG5cdFx0dGhpcy5yZXNjYWxlID0gbmV3IFJlc2NhbGluZyhcblx0XHRcdC0gKHhtYXggKyB4bWluKSAvIDIsXG5cdFx0XHQtICh5bWF4ICsgeW1pbikgLyAyLFxuXHRcdFx0LSAoem1heCArIHptaW4pIC8gMixcblx0XHRcdHJhbmdlIC8gKHhtYXggLSB4bWluKSxcblx0XHRcdHJhbmdlIC8gKHltYXggLSB5bWluKSxcblx0XHRcdHJhbmdlIC8gKHptYXggLSB6bWluKVxuXHRcdFx0KVxuXHR9XG5cblx0ZW1iZWQoKSB7XG5cdFx0aWYgKCEgdGhpcy5pbml0aWFsaXplZCkge1xuXHRcdFx0Ly8gYWRkIGFsbCBkYXRhcG9pbnRzIGFscmVhZHkgaW4gdGhlIGRhdGFzZXRcblx0XHRcdGZvciAobGV0IGlkIGluIHRoaXMuZGF0YXNldC5kYXRhcG9pbnRzKSB7XG5cdFx0XHRcdHRoaXMuX3BsYWNlRGF0YXBvaW50KGlkKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzTmVlZFVwZGF0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcHJvY2VzcyBldmVudHMgc2VudCBieSB0aGUgZGF0YXNldCBzaW5jZSBsYXN0IGVtYmVkKCkgY2FsbFxuXHRcdFx0aWYgKHRoaXMuZXZlbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Zm9yIChsZXQgaSBpbiB0aGlzLmV2ZW50cykge1xuXHRcdFx0XHRcdGxldCBlID0gdGhpcy5ldmVudHNbaV07XG5cdFx0XHRcdFx0aWYgICAgICAoZS50eXBlID09IFwiYWRkXCIpICAgIHRoaXMuX3BsYWNlRGF0YXBvaW50KGUuaWQpO1xuXHRcdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInJlbW92ZVwiKSB0aGlzLl9yZW1vdmVEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZS50eXBlID09IFwidXBkYXRlXCIpIHRoaXMuX3VwZGF0ZURhdGFwb2ludChlLmlkLCBlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImNhbGxpbmcgdmVydGljZXMgdXBkYXRlXCIpO1xuXHRcdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc05lZWRVcGRhdGUgPSB0cnVlO1x0XHRcdFxuXHRcdFx0fSBcblx0XHRcdHRoaXMuZXZlbnRzID0gW107XG5cdFx0fVxuXHR9XG5cblx0X3BsYWNlRGF0YXBvaW50KGlkKSB7XG5cdFx0bGV0IHZpID0gdGhpcy5mcmVlVmVydGljZXMucG9wKCk7XG5cdFx0aWYgKHZpICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGRwICA9IHRoaXMuZGF0YXNldC5kYXRhcG9pbnRzW2lkXTtcblx0XHRcdGlmICghIGRwKSByZXR1cm47XG5cdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc1t2aV0uc2V0KFxuXHRcdFx0XHR0aGlzLnJlc2NhbGUuc2NhbGVYKHRoaXMuX21hcChkcCwgJ3gnKSksXG5cdFx0XHRcdHRoaXMucmVzY2FsZS5zY2FsZVkodGhpcy5fbWFwKGRwLCAneScpKSxcblx0XHRcdFx0dGhpcy5yZXNjYWxlLnNjYWxlWih0aGlzLl9tYXAoZHAsICd6JykpKTtcblx0XHRcdHRoaXMuZHBNYXBbaWRdID0gdmk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUud2FybignVmVydGV4IGJ1ZmZlciBzaXplIGV4Y2VlZGVkJyk7XG5cdFx0fVxuXHR9XG5cblx0X3JlbW92ZURhdGFwb2ludChpZCkge1xuXHRcdGxldCB2aSA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmICh2aSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzW3ZpXS5zZXQoLTEwMDAwMDAsIC0xMDAwMDAwLCAtMTAwMDAwMCk7XG5cdFx0XHRkZWxldGUgdGhpcy5kcE1hcFtpZF07XG5cdFx0XHR0aGlzLmZyZWVWZXJ0aWNlcy5wdXNoKHZpKTtcblx0XHR9XG5cdH1cblxuXHRfdXBkYXRlRGF0YXBvaW50KGlkLCBldmVudCkge1xuXHRcdGxldCB2aSA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmICh2aSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0XHRpZiAoISBkcCkgcmV0dXJuO1xuXHRcdFx0Ly8gVE9ETyBvdGhlciBhdHRyaWJ1dGVzIGJlc2lkZSBwb3NpdGlvblxuXHRcdFx0bGV0IHYgPSB0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc1t2aV07XG5cdFx0XHRcblx0XHRcdGxldCBzdGFydCA9IHsgeDogdi54LCB5OiB2LnksIHo6IHYueiB9O1xuXHRcdFx0bGV0IGVuZCA9IHsgXG5cdFx0XHRcdHg6IHRoaXMucmVzY2FsZS5zY2FsZVgodGhpcy5fbWFwKGRwLCAneCcpKSwgXG5cdFx0XHRcdHk6IHRoaXMucmVzY2FsZS5zY2FsZVkodGhpcy5fbWFwKGRwLCAneScpKSwgXG5cdFx0XHRcdHo6IHRoaXMucmVzY2FsZS5zY2FsZVoodGhpcy5fbWFwKGRwLCAneicpKSBcblx0XHRcdH07XG5cdFx0XHRsZXQgZCA9IChuZXcgVEhSRUUuVmVjdG9yMyhzdGFydC54LCBzdGFydC55LCBzdGFydC56KSlcblx0XHRcdFx0LnN1YihuZXcgVEhSRUUuVmVjdG9yMyhlbmQueCwgZW5kLnksIGVuZC56KSlcblx0XHRcdFx0Lmxlbmd0aCgpO1xuXHRcdFx0bGV0IHQgPSAxMDAwICogZCAvIHRoaXMuZ2V0T3B0KFwibW92ZVNwZWVkXCIsIGRwKTtcblx0XHRcdFxuXHRcdFx0dmFyIGdlbyA9IHRoaXMucG9pbnRzLmdlb21ldHJ5O1xuXHRcdFx0dmFyIG9iaiA9IHRoaXM7XG5cdFx0XHRpZiAodGhpcy50d2VlbnNbdmldKSB7XG5cdFx0XHRcdHRoaXMudHdlZW5zW3ZpXS5zdG9wKCk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnR3ZWVuc1t2aV07XG5cdFx0XHR9XG5cblx0XHRcdGxldCB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbihzdGFydClcblx0XHRcdFx0LnRvKGVuZCwgdClcblx0XHRcdFx0Lm9uVXBkYXRlKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHYuc2V0KHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xuXHRcdFx0XHRcdGdlby52ZXJ0aWNlc05lZWRVcGRhdGUgPSB0cnVlO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub25Db21wbGV0ZSgoKSA9PiBkZWxldGUgb2JqLnR3ZWVuc1tpZF0pXG5cdFx0XHRcdC5vblN0b3AoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5FeHBvbmVudGlhbC5Jbk91dClcblx0XHRcdFx0LnN0YXJ0KCk7XG5cdFx0XHR0aGlzLnR3ZWVuc1t2aV0gPSB0d2Vlbjtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBBIHtNZXNoRW1iZWRkaW5nfSBpbiB3aGljaCBlYWNoIHtEYXRhcG9pbnR9IGlzIHJlbmRlcmVkIGFzIGEgTWVzaCB0aGF0IGZvbGxvd3MgYVxuICogcGF0aCBkZWZpbmVkIGJ5IHdheXBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdGhFbWJlZGRpbmcgZXh0ZW5kcyBNZXNoRW1iZWRkaW5nIHtcblx0Y29uc3RydWN0b3Ioc2NlbmUsIGRhdGFzZXQsIHdheXBvaW50cywgb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oe1xuXHRcdFx0cGF0aFdpZHRoWDogMCxcblx0XHRcdHBhdGhXaWR0aFk6IDAsXG5cdFx0XHRwYXRoV2lkdGhaOiAwLFxuXHRcdFx0ZGVzY3JpcHRpb246ICcnLFxuXHRcdFx0cmVtb3ZlQWZ0ZXI6IHRydWUsXG5cdFx0XHRwYXRoVGltZTogMTAwMDBcblx0XHR9LCBvcHRpb25zKTtcblx0XHRzdXBlcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucyk7XG5cdFx0dGhpcy53YXlwb2ludHMgPSB3YXlwb2ludHMubWFwKCh4KSA9PiBuZXcgVEhSRUUuVmVjdG9yMyh4WzBdLCB4WzFdLCB4WzJdKSk7XG5cblx0XHR0aGlzLm1lc2hPZmZzZXRzID0ge307XG5cdFx0dGhpcy50d2VlbnMgPSB7fTtcblx0fVxuXG5cdGVtYmVkKCkge1xuXHRcdC8vIHByb2Nlc3MgZXZlbnRzIHNlbnQgYnkgdGhlIGRhdGFzZXQgc2luY2UgbGFzdCBlbWJlZCgpIGNhbGxcblx0XHRpZiAodGhpcy5ldmVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChsZXQgaSBpbiB0aGlzLmV2ZW50cykge1xuXHRcdFx0XHRsZXQgZSA9IHRoaXMuZXZlbnRzW2ldO1xuXHRcdFx0XHRpZiAgICAgIChlLnR5cGUgPT0gXCJhZGRcIikgICAgdGhpcy5fcGxhY2VEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInJlbW92ZVwiKSB0aGlzLl9yZW1vdmVEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInVwZGF0ZVwiKSB0aGlzLl91cGRhdGVEYXRhcG9pbnQoZS5pZCwgZSk7XG5cdFx0XHR9XG5cdFx0fSBcblx0XHR0aGlzLmV2ZW50cyA9IFtdO1x0XHRcblx0fVxuXG5cdF9jcmVhdGVNZXNoT2Zmc2V0KGlkKSB7XG5cdFx0bGV0IHB3eCA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhYJyk7XG5cdFx0bGV0IHB3eSA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhZJyk7XG5cdFx0bGV0IHB3eiA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhaJyk7XG5cdFx0bGV0IG94ID0gcHd4ICogTWF0aC5yYW5kb20oKSAtIHB3eCAvIDI7XG5cdFx0bGV0IG95ID0gcHd5ICogTWF0aC5yYW5kb20oKSAtIHB3eSAvIDI7XG5cdFx0bGV0IG96ID0gcHd6ICogTWF0aC5yYW5kb20oKSAtIHB3eiAvIDI7XG5cdFx0dGhpcy5tZXNoT2Zmc2V0c1tpZF0gPSBuZXcgVEhSRUUuVmVjdG9yMyhveCwgb3ksIG96KTtcblx0fVxuXG5cdF9wbGFjZURhdGFwb2ludChpZCkge1xuXHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0bGV0IG1lc2ggPSB0aGlzLmNyZWF0ZU1lc2hGb3JEYXRhcG9pbnQoZHApO1xuXHRcdHRoaXMuX2NyZWF0ZU1lc2hPZmZzZXQoaWQpO1xuXHRcdG1lc2gudXNlckRhdGEuZGVzY3JpcHRpb24gPSB0aGlzLmdldE9wdChcImRlc2NyaXB0aW9uXCIsIGRwKTtcblx0XHR0aGlzLmRwTWFwW2lkXSA9IG1lc2g7XG5cdFx0dGhpcy5vYmozRC5hZGQobWVzaCk7XG5cdFx0VEhSRUUuaW5wdXQuYWRkKG1lc2gpO1xuXG5cdFx0Ly8gY3JlYXRlIHBhdGggdHdlZW5cblx0XHRsZXQgc3RhcnQgPSB7IHg6IHRoaXMud2F5cG9pbnRzWzBdLngsIHk6IHRoaXMud2F5cG9pbnRzWzBdLnksIHo6IHRoaXMud2F5cG9pbnRzWzBdLnogfVxuXHRcdGxldCBlbmQgPSB7XG5cdFx0XHR4OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueCksXG5cdFx0XHR5OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueSksXG5cdFx0XHR6OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueilcblx0XHR9XG5cdFx0bGV0IHQgPSB0aGlzLmdldE9wdChcInBhdGhUaW1lXCIpO1xuXHRcdHZhciBvYmogPSB0aGlzO1xuXHRcdGxldCB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbihzdGFydClcblx0XHRcdC50byhlbmQsIHQpXG5cdFx0XHQuaW50ZXJwb2xhdGlvbiggVFdFRU4uSW50ZXJwb2xhdGlvbi5DYXRtdWxsUm9tIClcblx0XHRcdC5vblVwZGF0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8ga2VlcCB0aGUgeC1heGlzIG9mIHRoZSBtZXNoIHRhbmdlbnQgdG8gdGhlIHBhdGggYXMgaXQgbW92ZXNcblx0XHRcdFx0bGV0IG9sZFBvcyA9IG1lc2gucG9zaXRpb24uY2xvbmUoKTtcblx0XHRcdFx0bGV0IG5ld1BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xuXHRcdFx0XHRsZXQgZGlyID0gbmV3UG9zLnN1YihvbGRQb3MpLm5vcm1hbGl6ZSgpO1xuXHRcdFx0XHRsZXQgYXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApO1xuXHRcdFx0XHRsZXQgb2Zmc2V0ID0gb2JqLm1lc2hPZmZzZXRzW2lkXVxuXHRcdFx0XHRtZXNoLnBvc2l0aW9uLnNldCh0aGlzLnggKyBvZmZzZXQueCwgdGhpcy55ICsgb2Zmc2V0LnksIHRoaXMueiArIG9mZnNldC56KTtcblx0XHRcdFx0Ly8gbWVzaC5wb3NpdGlvbi5zZXQodGhpcy54LCB0aGlzLnksIHRoaXMueik7XG5cdFx0XHRcdG1lc2gucXVhdGVybmlvbi5zZXRGcm9tVW5pdFZlY3RvcnMoYXhpcywgZGlyKTtcblx0XHRcdH0pXG5cdFx0XHQub25Db21wbGV0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0ZGVsZXRlIG9iai50d2VlbnNbaWRdO1xuXHRcdFx0XHRpZiAob2JqLmdldE9wdChcInJlbW92ZUFmdGVyXCIpKSBvYmoub2JqM0QucmVtb3ZlKG1lc2gpO1xuXHRcdFx0fSlcblx0XHRcdC5vblN0b3AoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0LnN0YXJ0KCk7XG5cdFx0dGhpcy50d2VlbnNbaWRdID0gdHdlZW47XG5cdH1cblxuXHRfcmVtb3ZlRGF0YXBvaW50KGlkKSB7XG5cdFx0aWYgKHRoaXMudHdlZW5zW2lkXSkgdGhpcy50d2VlbnNbaWRdLnN0b3AoKTtcblx0XHRsZXQgbWVzaCA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmIChtZXNoKSB0aGlzLm9iajNELnJlbW92ZShtZXNoKTtcblx0fVxuXG5cdF91cGRhdGVEYXRhcG9pbnQoaWQsIGV2ZW50KSB7XG5cdFx0Ly8gVE9ETyBpbXBsZW1lbnRcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQ29uc29sZUVtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRmb250OiBcIkJvbGQgMjRweCBBcmlhbFwiLFxuXHRcdFx0ZmlsbFN0eWxlOiBcInJnYmEoMjU1LDAsMCwwLjk1KVwiXG5cdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jYW52YXMud2lkdGggPSAyNTY7XG5cdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gMTI4O1xuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0dGhpcy5jb250ZXh0LmZvbnQgPSB0aGlzLmdldE9wdCgnZm9udCcpO1xuXHRcdHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmdldE9wdCgnZmlsbFN0eWxlJyk7XG5cdFx0dGhpcy5tZXNoID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0c2V0VGV4dCh0ZXh0KSB7XG5cdFx0aWYgKHRoaXMubWVzaClcblx0XHRcdHRoaXMub2JqM0QucmVtb3ZlKHRoaXMubWVzaClcblxuXHRcdHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cdFx0dGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIDAsIDI1KTtcblx0XHRsZXQgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKHRoaXMuY2FudmFzKTtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRsZXQgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBtYXA6IHRleHR1cmUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGUgfSk7XG5cdFx0bWF0ZXJpYWwudHJhbnNwYXJlbnQgPSB0cnVlO1xuXHRcdHRoaXMubWVzaCA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkodGhpcy5jYW52YXMud2lkdGggKiAuMSwgdGhpcy5jYW52YXMuaGVpZ2h0ICogLjEpLFxuXHRcdFx0bWF0ZXJpYWxcblx0XHQpO1xuXHRcdHRoaXMubWVzaC5wb3NpdGlvbi5zZXQodGhpcy5nZXRPcHQoJ3gnKSwgdGhpcy5nZXRPcHQoJ3knKSwgdGhpcy5nZXRPcHQoJ3onKSk7XG5cdFx0dGhpcy5vYmozRC5hZGQodGhpcy5tZXNoKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQWdncmVnYXRlRW1iZWRkaW5nIGV4dGVuZHMgRW1iZWRkaW5nIHtcblxufVxuXG5jbGFzcyBSZXNjYWxpbmcge1xuXHRjb25zdHJ1Y3Rvcih4bz0wLCB5bz0wLCB6bz0wLCB4cz0xLCB5cz0xLCB6cz0xKSB7XG5cdFx0aWYgKHR5cGVvZih4bykgPT0gXCJudW1iZXJcIikge1xuXHRcdFx0dGhpcy54byA9IHhvO1xuXHRcdFx0dGhpcy55byA9IHlvO1xuXHRcdFx0dGhpcy56byA9IHpvO1xuXHRcdFx0dGhpcy54cyA9IHhzO1xuXHRcdFx0dGhpcy55cyA9IHlzO1xuXHRcdFx0dGhpcy56cyA9IHpzO1xuXHRcdH1cblx0fVxuXG5cdHNjYWxlWCh4KSB7XG5cdFx0cmV0dXJuIHRoaXMueHMqKHggKyB0aGlzLnhvKTtcblx0fVxuXG5cdHNjYWxlWSh5KSB7XG5cdFx0cmV0dXJuIHRoaXMueXMqKHkgKyB0aGlzLnlvKTtcblx0fVxuXG5cdHNjYWxlWih6KSB7XG5cdFx0cmV0dXJuIHRoaXMuenMqKHogKyB0aGlzLnpvKTtcblx0fVxufSIsIid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIEBhdXRob3IgQmVhdSBDcm9uaW4gPGJlYXUuY3JvbmluQGdtYWlsLmNvbT5cbiAqL1xuXG5pbXBvcnQgUmF5SW5wdXQgZnJvbSAncmF5LWlucHV0JztcbmltcG9ydCBUV0VFTiBmcm9tICd0d2Vlbi5qcyc7XG5pbXBvcnQgcXVlcnlTdHJpbmcgZnJvbSAncXVlcnktc3RyaW5nJztcbmltcG9ydCB7XG5cdFdlYlNvY2tldERhdGFzZXQsIFxuXHREYXRhc2V0XG59IGZyb20gJy4vZGF0YXNldC5qcyc7XG5pbXBvcnQge1xuXHRFbWJlZGRpbmcsXG5cdE1lc2hFbWJlZGRpbmcsXG5cdFJhbmRvbUVtYmVkZGluZyxcblx0U2NhdHRlckVtYmVkZGluZyxcblx0UGF0aEVtYmVkZGluZyxcblx0Q29uc29sZUVtYmVkZGluZ1xufSBmcm9tICcuL2VtYmVkZGluZy5qcyc7XG5pbXBvcnQgeyBkZXRlY3RNb2RlIH0gZnJvbSAnLi9kZXRlY3Rpb24tdXRpbHMuanMnO1xuaW1wb3J0IHtcblx0bGF0TG9uZ1RvRXVjbGlkZWFuLFxuXHRkZWdUb1JhZCxcblx0YWpheFdpdGhDYWxsYmFja1xufSBmcm9tICcuL3V0aWxzLmpzJztcblxudmFyIGVtYmVkZGluZ3MgPSBbXTtcbnZhciBsYXN0UmVuZGVyID0gMDtcbnZhciB2ckRpc3BsYXk7XG5cbi8qKlxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gY3JlYXRlIGEgcmVzcG9uc2l2ZSBUSFJFRSBzY2VuZSBhbmQgcmVsYXRlZCBvYmplY3RzLiBSZXR1cm5zIGEgbnVtYmVyIFxuICogb2Ygb2JqZWN0cyB0aGF0IHNob3VsZCBwcm9iYWJseSBiZSBrZXB0IGFyb3VuZCBieSB0aGUgZW5jbG9zaW5nIHNjcmlwdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRTY2VuZSgpIHtcblx0Y29uc3Qgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblx0Y29uc3QgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCA3NSwgd2luZG93LmlubmVyV2lkdGggLyB3aW5kb3cuaW5uZXJIZWlnaHQsIDEsIDEwMDAwICk7XG5cdGNhbWVyYS5wb3NpdGlvbi56ID0gMTA7XG5cdFxuXHQvLyBUaGUgVlJDb250cm9scyBvYmplY3QgdXBkYXRlcyB0aGUgY2FtZXJhIHBvc2l0aW9uIGluIHJlc3BvbnNlIHRvIHBvc2l0aW9uIGFuZCBvcmllbnRhdGlvblxuXHQvLyBjaGFuZ2VzIG9mIHRoZSBITUQuXG5cdGNvbnN0IGNhbWVyYUNvbnRyb2xzID0gbmV3IFRIUkVFLlZSQ29udHJvbHMoY2FtZXJhKTtcblx0Y2FtZXJhQ29udHJvbHMuc3RhbmRpbmcgPSB0cnVlO1xuXG5cdC8vIFRoaXMgcmVuZGVyZXIgaXMgdGhlIHN0YW5kYXJkIFdlYkdMIHJlbmRlcmVyOyBpdCBtYXkgYmUgZnVydGhlciBwcm9jZXNzZWQgZm9yIFZSIHVzZSBkZXBlbmRpbmdcblx0Ly8gb24gdGhlIG1vZGUgc2VsZWN0ZWQgYnkgdGhlIHdlYnZyLWJvaWxlcnBsYXRlXG5cdGNvbnN0IHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcblx0cmVuZGVyZXIuc2V0U2l6ZSggd2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCApO1xuXHRyZW5kZXJlci5zZXRQaXhlbFJhdGlvKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKCByZW5kZXJlci5kb21FbGVtZW50ICk7XG4gICAgXG4gICAgLy8gVGhlIFZSRWZmZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBkaXN0b3J0aW5nIHRoZSByZW5kZXJlZCBpbWFnZSB0byBtYXRjaCB0aGUgb3B0aWNzIG9mIHRoZSBITUQsXG4gICAgLy8gYXMgd2VsbCBhcyByZW5kZXJpbmcgZGlmZmVyZW50LCBvZmZzZXQgaW1hZ2VzIGZvciBlYWNoIGV5ZVxuICAgIGNvbnN0IGVmZmVjdCA9IG5ldyBUSFJFRS5WUkVmZmVjdChyZW5kZXJlcik7XG5cdGVmZmVjdC5zZXRTaXplKCB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0ICk7XG5cblx0Ly8gVGhlIFdlYlZSTWFuYWdlciBpcyBwcm92aWRlZCBieSB0aGUgd2VidnItYm9pbGVycGxhdGUsIGFuZCBoYW5kbGVzIGRldGVjdGlvbiBvZiBkaXNwbGF5IGhhcmR3YXJlXG5cdC8vIChkZXNrdG9wLCBtb2JpbGUsIFZSKSBhbmQgc3dpdGNoaW5nIGJldHdlZW4gcmVndWxhciBhbmQgVlIgbW9kZXNcblx0Y29uc3QgbWFuYWdlciA9IG5ldyBXZWJWUk1hbmFnZXIocmVuZGVyZXIsIGVmZmVjdCk7XG5cblx0dmFyIG9uUmVzaXplID0gZnVuY3Rpb24oZSkge1xuXHQgIGVmZmVjdC5zZXRTaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xuXHQgIGNhbWVyYS5hc3BlY3QgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIHdpbmRvdy5pbm5lckhlaWdodDtcblx0ICBjYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXHR9XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplLCB0cnVlKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3ZyZGlzcGxheXByZXNlbnRjaGFuZ2UnLCBvblJlc2l6ZSwgdHJ1ZSk7XG5cbiAgICAvLyBUT0RPIHB1dHRpbmcgdGhlIGlucHV0IGluIHRoZSBUSFJFRSBnbG9iYWwgZm9yIG5vdzsgcHJvYmFibHkgd2FudCBlbWJlZGRpbmdzIHRvIGZpcmUgXG4gICAgLy8gZXZlbnRzIHdoZW4gbWVzaGVzIGFyZSBhZGRlZC9yZW1vdmVkIHJhdGhlciB0aGFuIHJlZmVyZW5jaW5nIHRoZSBpbnB1dCBkaXJlY3RseVxuXHRUSFJFRS5pbnB1dCA9IG5ldyBSYXlJbnB1dChjYW1lcmEsIHJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuXHRUSFJFRS5pbnB1dC5zZXRTaXplKHJlbmRlcmVyLmdldFNpemUoKSk7XG5cdHNjZW5lLmFkZChUSFJFRS5pbnB1dC5nZXRNZXNoKCkpO1xuXG4gICAgcmV0dXJuIHsgc2NlbmUsIGNhbWVyYSwgbWFuYWdlciwgZWZmZWN0LCBjYW1lcmFDb250cm9scyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRBbmltYXRpb24oKSB7XG5cdC8vIE5PVEU6IGFzc3VtZXMgdGhlIHdlYnZyIHBvbHlmaWxsIGlzIHByZXNlbnQsIHNvIGNhbiBjb3VudCBvbiBhIHZhbGlkIGRpc3BsYXlcblx0bmF2aWdhdG9yLmdldFZSRGlzcGxheXMoKS50aGVuKGZ1bmN0aW9uKGRpc3BsYXlzKSB7XG5cdCAgICBpZiAoZGlzcGxheXMubGVuZ3RoID4gMCkge1xuXHQgICAgICBcdHZyRGlzcGxheSA9IGRpc3BsYXlzWzBdO1xuXHQgICAgICBcdHZyRGlzcGxheS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cdCAgICB9XG5cdH0pO1xufVxuXG4vKipcbiAqIFRoZSBjb3JlIGFuaW1hdGlvbiBjYWxsIHRoYXQgaXMgZXhlY3V0ZWQgZm9yIGVhY2ggZnJhbWUuIFVwZGF0ZXMgYWxsIHJlZ2lzdGVyZWRcbiAqIGVtYmVkZGluZ3MsIHRoZSBwb2ludGVyIGNvbnRyb2xzLCBhbmQgdGhlIGNhbWVyYSBwb3NpdGlvbi4gUmVuZGVycyB0aGUgc2NlbmVcbiAqIHVzaW5nIHRoZSBXZWJWUk1hbmFnZXIsIHdoaWNoIGFwcGxpZXMgdGhlIFZSRWZmZWN0IGlmIGluIFZSIG1vZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmltYXRlKHRpbWVzdGFtcCkge1xuXHRpZiAoISB0aW1lc3RhbXApIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG5cdHZhciBkZWx0YSA9IE1hdGgubWluKHRpbWVzdGFtcCAtIGxhc3RSZW5kZXIsIDUwMCk7XG4gIFx0bGFzdFJlbmRlciA9IHRpbWVzdGFtcDtcblxuICBcdGZvciAobGV0IGUgb2YgZW1iZWRkaW5ncykge1xuXHRcdGUuZW1iZWQoKTtcbiAgXHR9XG4gIFx0VFdFRU4udXBkYXRlKCk7XG5cdFRIUkVFLmlucHV0LnVwZGF0ZSgpO1xuICAgIGNhbWVyYUNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIG1hbmFnZXIucmVuZGVyKCBzY2VuZSwgY2FtZXJhLCB0aW1lc3RhbXAgKTtcblxuICAgIHZyRGlzcGxheS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIGFuaW1hdGUgKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlciBhbiBlbWJlZGRpbmcgc28gdGhhdCBpdCB3aWxsIGJlIHVwZGF0ZWQgb24gZWFjaCBhbmltYXRpb24gZnJhbWUuXG4gKiBAcGFyYW0ge0VtYmVkZGluZ30gZW1iZWRkaW5nIC0gVGhlIGVtYmVkZGluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoZW1iZWRkaW5nKSB7XG5cdGVtYmVkZGluZ3MucHVzaChlbWJlZGRpbmcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0RGF0YXNldDogRGF0YXNldCxcblx0V2ViU29ja2V0RGF0YXNldDogV2ViU29ja2V0RGF0YXNldCxcblx0RW1iZWRkaW5nOiBFbWJlZGRpbmcsXG5cdE1lc2hFbWJlZGRpbmc6IE1lc2hFbWJlZGRpbmcsXG5cdFJhbmRvbUVtYmVkZGluZzogUmFuZG9tRW1iZWRkaW5nLFxuXHRTY2F0dGVyRW1iZWRkaW5nOiBTY2F0dGVyRW1iZWRkaW5nLFxuXHRQYXRoRW1iZWRkaW5nOiBQYXRoRW1iZWRkaW5nLFxuXHRDb25zb2xlRW1iZWRkaW5nOiBDb25zb2xlRW1iZWRkaW5nLFxuXHRpbml0U2NlbmU6IGluaXRTY2VuZSxcblx0YW5pbWF0ZTogYW5pbWF0ZSxcblx0cXVlcnlTdHJpbmc6IHF1ZXJ5U3RyaW5nLFxuXHRkZXRlY3RNb2RlOiBkZXRlY3RNb2RlLFxuXHRyZWdpc3RlcjogcmVnaXN0ZXIsXG5cdHN0YXJ0QW5pbWF0aW9uLFxuXHR1dGlsczoge1xuXHRcdGRlZ1RvUmFkLFxuXHRcdGxhdExvbmdUb0V1Y2xpZGVhbixcblx0XHRhamF4V2l0aENhbGxiYWNrXG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcblxuLy8gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbW9jay1lbmQvcmFuZG9tLW5vcm1hbFxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbFBvb2wob3B0aW9ucykge1xuXG4gIHZhciBwZXJmb3JtYW5jZUNvdW50ZXIgPSAwO1xuXG4gIGRvIHtcblxuICAgIHZhciBpZHggPSBNYXRoLnJvdW5kKG5vcm1hbCh7XG4gICAgICBtZWFuOiBvcHRpb25zLm1lYW4sXG4gICAgICBkZXY6IG9wdGlvbnMuZGV2XG4gICAgfSkpO1xuXG4gICAgaWYgKGlkeCA8IG9wdGlvbnMucG9vbC5sZW5ndGggJiYgaWR4ID49IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnBvb2xbaWR4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGVyZm9ybWFuY2VDb3VudGVyKys7XG4gICAgfVxuXG4gIH0gd2hpbGUgKHBlcmZvcm1hbmNlQ291bnRlciA8IDEwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWwob3B0aW9ucykge1xuXG4gIG9wdGlvbnMgPSBhc3NpZ24oeyBtZWFuOiAwLCBkZXY6IDEsIHBvb2w6IFtdIH0sIG9wdGlvbnMpO1xuXG4gIC8vIElmIGEgcG9vbCBoYXMgYmVlbiBwYXNzZWQsIHRoZW4gd2UgYXJlIHJldHVybmluZyBhbiBpdGVtIGZyb20gdGhhdCBwb29sLFxuICAvLyB1c2luZyB0aGUgbm9ybWFsIGRpc3RyaWJ1dGlvbiBzZXR0aW5ncyB0aGF0IHdlcmUgcGFzc2VkIGluXG4gIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMucG9vbCkgJiYgb3B0aW9ucy5wb29sLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gbm9ybWFsUG9vbChvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFRoZSBNYXJzYWdsaWEgUG9sYXIgbWV0aG9kXG4gIHZhciBzO1xuICB2YXIgdTtcbiAgdmFyIHY7XG4gIHZhciBub3JtO1xuICB2YXIgbWVhbiA9IG9wdGlvbnMubWVhbjtcbiAgdmFyIGRldiAgPSBvcHRpb25zLmRldjtcblxuICBkbyB7XG4gICAgLy8gVSBhbmQgViBhcmUgZnJvbSB0aGUgdW5pZm9ybSBkaXN0cmlidXRpb24gb24gKC0xLCAxKVxuICAgIHUgPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7XG4gICAgdiA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcblxuICAgIHMgPSB1ICogdSArIHYgKiB2O1xuICB9IHdoaWxlIChzID49IDEpO1xuXG4gIC8vIENvbXB1dGUgdGhlIHN0YW5kYXJkIG5vcm1hbCB2YXJpYXRlXG4gIG5vcm0gPSB1ICogTWF0aC5zcXJ0KC0yICogTWF0aC5sb2cocykgLyBzKTtcblxuICAvLyBTaGFwZSBhbmQgc2NhbGVcbiAgcmV0dXJuIGRldiAqIG5vcm0gKyBtZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQoZGVnKSB7XG4gIHJldHVybiBkZWcgKiBNYXRoLlBJIC8gMTgwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGF0TG9uZ1RvRXVjbGlkZWFuKGxhdCwgbG9uZywgUj0xLCByZXZlcnNlPXRydWUpIHtcbiAgbGV0IHJhZExhdCA9IGRlZ1RvUmFkKGxhdCk7XG4gIGxldCByYWRMb25nID0gcmV2ZXJzZSA/IGRlZ1RvUmFkKC1sb25nKSA6IGRlZ1RvUmFkKGxvbmcpO1xuICBsZXQgeCA9IFIgKiBNYXRoLmNvcyhyYWRMYXQpICogTWF0aC5jb3MocmFkTG9uZyk7XG4gIGxldCB6ID0gUiAqIE1hdGguY29zKHJhZExhdCkgKiBNYXRoLnNpbihyYWRMb25nKTtcbiAgbGV0IHkgPSBSICogTWF0aC5zaW4ocmFkTGF0KVxuICByZXR1cm4ge3gsIHksIHp9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhamF4V2l0aENhbGxiYWNrKHVybCwgY2IpIHtcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgeGhyLnNlbmQobnVsbCk7XG4gIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICBjYihKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICB9XG4gIH1cbn1cblxuIl19
