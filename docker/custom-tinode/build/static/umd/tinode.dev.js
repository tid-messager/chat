(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Tinode = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * @file Access control model.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

// NOTE TO DEVELOPERS:
// Localizable strings should be double quoted "строка на другом языке",
// non-localizable strings should be single quoted 'non-localized'.

/**
 * Helper class for handling access mode.
 *
 * @class AccessMode
 * @memberof Tinode
 *
 * @param {AccessMode|Object=} acs - AccessMode to copy or access mode object received from the server.
 */
const AccessMode = function(acs) {
  if (acs) {
    this.given = typeof acs.given == 'number' ? acs.given : AccessMode.decode(acs.given);
    this.want = typeof acs.want == 'number' ? acs.want : AccessMode.decode(acs.want);
    this.mode = acs.mode ? (typeof acs.mode == 'number' ? acs.mode : AccessMode.decode(acs.mode)) :
      (this.given & this.want);
  }
};

AccessMode._NONE = 0x00;
AccessMode._JOIN = 0x01;
AccessMode._READ = 0x02;
AccessMode._WRITE = 0x04;
AccessMode._PRES = 0x08;
AccessMode._APPROVE = 0x10;
AccessMode._SHARE = 0x20;
AccessMode._DELETE = 0x40;
AccessMode._OWNER = 0x80;

AccessMode._BITMASK = AccessMode._JOIN | AccessMode._READ | AccessMode._WRITE | AccessMode._PRES |
  AccessMode._APPROVE | AccessMode._SHARE | AccessMode._DELETE | AccessMode._OWNER;
AccessMode._INVALID = 0x100000;

AccessMode._checkFlag = function(val, side, flag) {
  side = side || 'mode';
  if (['given', 'want', 'mode'].includes(side)) {
    return ((val[side] & flag) != 0);
  }
  throw new Error(`Invalid AccessMode component '${side}'`);
}

/**
 * Parse string into an access mode value.
 * @memberof Tinode.AccessMode
 * @static
 *
 * @param {string | Number} mode - either a String representation of the access mode to parse or a set of bits to assign.
 * @returns {number} - Access mode as a numeric value.
 */
AccessMode.decode = function(str) {
  if (!str) {
    return null;
  } else if (typeof str == 'number') {
    return str & AccessMode._BITMASK;
  } else if (str === 'N' || str === 'n') {
    return AccessMode._NONE;
  }

  const bitmask = {
    'J': AccessMode._JOIN,
    'R': AccessMode._READ,
    'W': AccessMode._WRITE,
    'P': AccessMode._PRES,
    'A': AccessMode._APPROVE,
    'S': AccessMode._SHARE,
    'D': AccessMode._DELETE,
    'O': AccessMode._OWNER
  };

  let m0 = AccessMode._NONE;

  for (let i = 0; i < str.length; i++) {
    const bit = bitmask[str.charAt(i).toUpperCase()];
    if (!bit) {
      // Unrecognized bit, skip.
      continue;
    }
    m0 |= bit;
  }
  return m0;
};

/**
 * Convert numeric representation of the access mode into a string.
 *
 * @memberof Tinode.AccessMode
 * @static
 *
 * @param {number} val - access mode value to convert to a string.
 * @returns {string} - Access mode as a string.
 */
AccessMode.encode = function(val) {
  if (val === null || val === AccessMode._INVALID) {
    return null;
  } else if (val === AccessMode._NONE) {
    return 'N';
  }

  const bitmask = ['J', 'R', 'W', 'P', 'A', 'S', 'D', 'O'];
  let res = '';
  for (let i = 0; i < bitmask.length; i++) {
    if ((val & (1 << i)) != 0) {
      res = res + bitmask[i];
    }
  }
  return res;
};

/**
 * Update numeric representation of access mode with the new value. The value
 * is one of the following:
 *  - a string starting with <code>'+'</code> or <code>'-'</code> then the bits to add or remove, e.g. <code>'+R-W'</code> or <code>'-PS'</code>.
 *  - a new value of access mode
 *
 * @memberof Tinode.AccessMode
 * @static
 *
 * @param {number} val - access mode value to update.
 * @param {string} upd - update to apply to val.
 * @returns {number} - updated access mode.
 */
AccessMode.update = function(val, upd) {
  if (!upd || typeof upd != 'string') {
    return val;
  }

  let action = upd.charAt(0);
  if (action == '+' || action == '-') {
    let val0 = val;
    // Split delta-string like '+ABC-DEF+Z' into an array of parts including + and -.
    const parts = upd.split(/([-+])/);
    // Starting iteration from 1 because String.split() creates an array with the first empty element.
    // Iterating by 2 because we parse pairs +/- then data.
    for (let i = 1; i < parts.length - 1; i += 2) {
      action = parts[i];
      const m0 = AccessMode.decode(parts[i + 1]);
      if (m0 == AccessMode._INVALID) {
        return val;
      }
      if (m0 == null) {
        continue;
      }
      if (action === '+') {
        val0 |= m0;
      } else if (action === '-') {
        val0 &= ~m0;
      }
    }
    val = val0;
  } else {
    // The string is an explicit new value 'ABC' rather than delta.
    const val0 = AccessMode.decode(upd);
    if (val0 != AccessMode._INVALID) {
      val = val0;
    }
  }

  return val;
};

/**
 * Bits present in a1 but missing in a2.
 *
 * @static
 * @memberof Tinode
 *
 * @param {number | string} a1 - access mode to subtract from.
 * @param {number | string} a2 - access mode to subtract.
 * @returns {number} access mode with bits present in <code>a1</code> but missing in <code>a2</code>.
 */
AccessMode.diff = function(a1, a2) {
  a1 = AccessMode.decode(a1);
  a2 = AccessMode.decode(a2);

  if (a1 == AccessMode._INVALID || a2 == AccessMode._INVALID) {
    return AccessMode._INVALID;
  }
  return a1 & ~a2;
};

/**
 * AccessMode is a class representing topic access mode.
 *
 * @memberof Tinode
 * @class AccessMode
 */
AccessMode.prototype = {
  /**
   * Custom formatter
   */
  toString: function() {
    return '{"mode": "' + AccessMode.encode(this.mode) +
      '", "given": "' + AccessMode.encode(this.given) +
      '", "want": "' + AccessMode.encode(this.want) + '"}';
  },
  /**
   * Converts numeric values to strings.
   */
  jsonHelper: function() {
    return {
      mode: AccessMode.encode(this.mode),
      given: AccessMode.encode(this.given),
      want: AccessMode.encode(this.want)
    };
  },
  /**
   * Assign value to 'mode'.
   * @memberof Tinode.AccessMode
   *
   * @param {string | Number} m - either a string representation of the access mode or a set of bits.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  setMode: function(m) {
    this.mode = AccessMode.decode(m);
    return this;
  },
  /**
   * Update <code>mode</code> value.
   * @memberof Tinode.AccessMode
   *
   * @param {string} u - string representation of the changes to apply to access mode.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  updateMode: function(u) {
    this.mode = AccessMode.update(this.mode, u);
    return this;
  },
  /**
   * Get <code>mode</code> value as a string.
   * @memberof Tinode.AccessMode
   *
   * @returns {string} - <code>mode</code> value.
   */
  getMode: function() {
    return AccessMode.encode(this.mode);
  },

  /**
   * Assign <code>given</code>  value.
   * @memberof Tinode.AccessMode
   *
   * @param {string | Number} g - either a string representation of the access mode or a set of bits.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  setGiven: function(g) {
    this.given = AccessMode.decode(g);
    return this;
  },
  /**
   * Update 'given' value.
   * @memberof Tinode.AccessMode
   *
   * @param {string} u - string representation of the changes to apply to access mode.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  updateGiven: function(u) {
    this.given = AccessMode.update(this.given, u);
    return this;
  },
  /**
   * Get 'given' value as a string.
   * @memberof Tinode.AccessMode
   *
   * @returns {string} - <b>given</b> value.
   */
  getGiven: function() {
    return AccessMode.encode(this.given);
  },

  /**
   * Assign 'want' value.
   * @memberof Tinode.AccessMode
   *
   * @param {string | Number} w - either a string representation of the access mode or a set of bits.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  setWant: function(w) {
    this.want = AccessMode.decode(w);
    return this;
  },
  /**
   * Update 'want' value.
   * @memberof Tinode.AccessMode
   *
   * @param {string} u - string representation of the changes to apply to access mode.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  updateWant: function(u) {
    this.want = AccessMode.update(this.want, u);
    return this;
  },
  /**
   * Get 'want' value as a string.
   * @memberof Tinode.AccessMode
   *
   * @returns {string} - <b>want</b> value.
   */
  getWant: function() {
    return AccessMode.encode(this.want);
  },

  /**
   * Get permissions present in 'want' but missing in 'given'.
   * Inverse of {@link Tinode.AccessMode#getExcessive}
   *
   * @memberof Tinode.AccessMode
   *
   * @returns {string} permissions present in <b>want</b> but missing in <b>given</b>.
   */
  getMissing: function() {
    return AccessMode.encode(this.want & ~this.given);
  },

  /**
   * Get permissions present in 'given' but missing in 'want'.
   * Inverse of {@link Tinode.AccessMode#getMissing}
   * @memberof Tinode.AccessMode
   *
   * @returns {string} permissions present in <b>given</b> but missing in <b>want</b>.
   */
  getExcessive: function() {
    return AccessMode.encode(this.given & ~this.want);
  },

  /**
   * Update 'want', 'give', and 'mode' values.
   * @memberof Tinode.AccessMode
   *
   * @param {AccessMode} val - new access mode value.
   * @returns {AccessMode} - <code>this</code> AccessMode.
   */
  updateAll: function(val) {
    if (val) {
      this.updateGiven(val.given);
      this.updateWant(val.want);
      this.mode = this.given & this.want;
    }
    return this;
  },

  /**
   * Check if Owner (O) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isOwner: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._OWNER);
  },

  /**
   * Check if Presence (P) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isPresencer: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._PRES);
  },

  /**
   * Check if Presence (P) flag is NOT set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isMuted: function(side) {
    return !this.isPresencer(side);
  },

  /**
   * Check if Join (J) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isJoiner: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._JOIN);
  },

  /**
   * Check if Reader (R) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isReader: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._READ);
  },

  /**
   * Check if Writer (W) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isWriter: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._WRITE);
  },

  /**
   * Check if Approver (A) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isApprover: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._APPROVE);
  },

  /**
   * Check if either one of Owner (O) or Approver (A) flags is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isAdmin: function(side) {
    return this.isOwner(side) || this.isApprover(side);
  },

  /**
   * Check if either one of Owner (O), Approver (A), or Sharer (S) flags is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isSharer: function(side) {
    return this.isAdmin(side) || AccessMode._checkFlag(this, side, AccessMode._SHARE);
  },

  /**
   * Check if Deleter (D) flag is set.
   * @memberof Tinode.AccessMode
   * @param {string=} side - which permission to check: given, want, mode; default: mode.
   * @returns {boolean} - <code>true</code> if flag is set.
   */
  isDeleter: function(side) {
    return AccessMode._checkFlag(this, side, AccessMode._DELETE);
  }
};

if (typeof module != 'undefined') {
  module.exports = AccessMode;
}

},{}],2:[function(require,module,exports){
/**
 * @file In-memory sorted cache of objects.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

/**
 * In-memory sorted cache of objects.
 *
 * @class CBuffer
 * @memberof Tinode
 * @protected
 *
 * @param {function} compare custom comparator of objects. Takes two parameters <code>a</code> and <code>b</code>;
 *    returns <code>-1</code> if <code>a < b</code>, <code>0</code> if <code>a == b</code>, <code>1</code> otherwise.
 * @param {boolean} unique enforce element uniqueness: when <code>true</code> replace existing element with a new
 *    one on conflict; when <code>false</code> keep both elements.
 */
const CBuffer = function(compare, unique) {
  let buffer = [];

  compare = compare || function(a, b) {
    return a === b ? 0 : a < b ? -1 : 1;
  };

  function findNearest(elem, arr, exact) {
    let start = 0;
    let end = arr.length - 1;
    let pivot = 0;
    let diff = 0;
    let found = false;

    while (start <= end) {
      pivot = (start + end) / 2 | 0;
      diff = compare(arr[pivot], elem);
      if (diff < 0) {
        start = pivot + 1;
      } else if (diff > 0) {
        end = pivot - 1;
      } else {
        found = true;
        break;
      }
    }
    if (found) {
      return {
        idx: pivot,
        exact: true
      };
    }
    if (exact) {
      return {
        idx: -1
      };
    }
    // Not exact - insertion point
    return {
      idx: diff < 0 ? pivot + 1 : pivot
    };
  }

  // Insert element into a sorted array.
  function insertSorted(elem, arr) {
    const found = findNearest(elem, arr, false);
    const count = (found.exact && unique) ? 1 : 0;
    arr.splice(found.idx, count, elem);
    return arr;
  }

  return {
    /**
     * Get an element at the given position.
     * @memberof Tinode.CBuffer#
     * @param {number} at - Position to fetch from.
     * @returns {Object} Element at the given position or <code>undefined</code>.
     */
    getAt: function(at) {
      return buffer[at];
    },

    /**
     * Convenience method for getting the element from the end of the buffer.
     * @memberof Tinode.CBuffer#
     * @param {number} at - position to fetch from, counting from the end;
     *    <code>undefined</code> or <code>null</code>  mean "last".
     * @returns {Object} The last element in the buffer or <code>undefined</code> if buffer is empty.
     */
    getLast: function(at) {
      at |= 0;
      return buffer.length > at ? buffer[buffer.length - 1 - at] : undefined;
    },

    /**
     * Add new element(s) to the buffer. Variadic: takes one or more arguments. If an array is passed as a single
     * argument, its elements are inserted individually.
     * @memberof Tinode.CBuffer#
     *
     * @param {...Object|Array} - One or more objects to insert.
     */
    put: function() {
      let insert;
      // inspect arguments: if array, insert its elements, if one or more non-array arguments, insert them one by one
      if (arguments.length == 1 && Array.isArray(arguments[0])) {
        insert = arguments[0];
      } else {
        insert = arguments;
      }
      for (let idx in insert) {
        insertSorted(insert[idx], buffer);
      }
    },

    /**
     * Remove element at the given position.
     * @memberof Tinode.CBuffer#
     * @param {number} at - Position to delete at.
     * @returns {Object} Element at the given position or <code>undefined</code>.
     */
    delAt: function(at) {
      let r = buffer.splice(at, 1);
      if (r && r.length > 0) {
        return r[0];
      }
      return undefined;
    },

    /**
     * Remove elements between two positions.
     * @memberof Tinode.CBuffer#
     * @param {number} since - Position to delete from (inclusive).
     * @param {number} before - Position to delete to (exclusive).
     *
     * @returns {Array} array of removed elements (could be zero length).
     */
    delRange: function(since, before) {
      return buffer.splice(since, before - since);
    },

    /**
     * Return the number of elements the buffer holds.
     * @memberof Tinode.CBuffer#
     * @return {number} Number of elements in the buffer.
     */
    length: function() {
      return buffer.length;
    },

    /**
     * Reset the buffer discarding all elements
     * @memberof Tinode.CBuffer#
     */
    reset: function() {
      buffer = [];
    },

    /**
     * Callback for iterating contents of buffer. See {@link Tinode.CBuffer#forEach}.
     * @callback ForEachCallbackType
     * @memberof Tinode.CBuffer#
     * @param {Object} elem - Element of the buffer.
     * @param {number} index - Index of the current element.
     */

    /**
     * Apply given <code>callback</code> to all elements of the buffer.
     * @memberof Tinode.CBuffer#
     *
     * @param {Tinode.ForEachCallbackType} callback - Function to call for each element.
     * @param {number} startIdx - Optional index to start iterating from (inclusive).
     * @param {number} beforeIdx - Optional index to stop iterating before (exclusive).
     * @param {Object} context - calling context (i.e. value of <code>this</code> in callback)
     */
    forEach: function(callback, startIdx, beforeIdx, context) {
      startIdx = startIdx | 0;
      beforeIdx = beforeIdx || buffer.length;
      for (let i = startIdx; i < beforeIdx; i++) {
        callback.call(context, buffer[i], i);
      }
    },

    /**
     * Find element in buffer using buffer's comparison function.
     * @memberof Tinode.CBuffer#
     *
     * @param {Object} elem - element to find.
     * @param {boolean=} nearest - when true and exact match is not found, return the nearest element (insertion point).
     * @returns {number} index of the element in the buffer or -1.
     */
    find: function(elem, nearest) {
      const {
        idx
      } = findNearest(elem, buffer, !nearest);
      return idx;
    }
  }
}

if (typeof module != 'undefined') {
  module.exports = CBuffer;
}

},{}],3:[function(require,module,exports){
/**
 * @file Abstraction layer for websocket and long polling connections.
 * See <a href="https://github.com/tinode/webapp">https://github.com/tinode/webapp</a> for real-life usage.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

let WebSocketProvider;
let XHRProvider;

// Error code to return in case of a network problem.
const NETWORK_ERROR = 503;
const NETWORK_ERROR_TEXT = "Connection failed";

// Error code to return when user disconnected from server.
const NETWORK_USER = 418;
const NETWORK_USER_TEXT = "Disconnected by client";

// Helper function for creating an endpoint URL.
function makeBaseUrl(host, protocol, version, apiKey) {
  let url = null;

  if (['http', 'https', 'ws', 'wss'].includes(protocol)) {
    url = `${protocol}://${host}`;
    if (url.charAt(url.length - 1) !== '/') {
      url += '/';
    }
    url += 'v' + version + '/channels';
    if (['http', 'https'].includes(protocol)) {
      // Long polling endpoint ends with "lp", i.e.
      // '/v0/channels/lp' vs just '/v0/channels' for ws
      url += '/lp';
    }
    url += '?apikey=' + apiKey;
  }

  return url;
}

/**
 * An abstraction for a websocket or a long polling connection.
 *
 * @class Connection
 * @memberof Tinode

 * @param {Object} config - configuration parameters.
 * @param {string} config.host - Host name and optional port number to connect to.
 * @param {string} config.apiKey - API key generated by <code>keygen</code>.
 * @param {string} config.transport - Network transport to use, either <code>"ws"<code>/<code>"wss"</code> for websocket or
 *      <code>lp</code> for long polling.
 * @param {boolean} config.secure - Use Secure WebSocket if <code>true</code>.
 * @param {string} version_ - Major value of the protocol version, e.g. '0' in '0.17.1'.
 * @param {boolean} autoreconnect_ - If connection is lost, try to reconnect automatically.
 */
// config.host, PROTOCOL_VERSION, config.apiKey, config.transport, config.secure, true
const Connection = function(config, version_, autoreconnect_) {
  const host = config.host;
  const secure = config.secure;
  const apiKey = config.apiKey;

  const version = version_;
  const autoreconnect = autoreconnect_;

  // Settings for exponential backoff
  const _BOFF_BASE = 2000; // 2000 milliseconds, minimum delay between reconnects
  const _BOFF_MAX_ITER = 10; // Maximum delay between reconnects 2^10 * 2000 ~ 34 minutes
  const _BOFF_JITTER = 0.3; // Add random delay

  let _boffTimer = null;
  let _boffIteration = 0;
  let _boffClosed = false; // Indicator if the socket was manually closed - don't autoreconnect if true.

  const log = (text, ...args) => {
    if (Connection.logger) {
      Connection.logger(text, ...args);
    }
  }

  // Backoff implementation - reconnect after a timeout.
  function boffReconnect() {
    // Clear timer
    clearTimeout(_boffTimer);
    // Calculate when to fire the reconnect attempt
    const timeout = _BOFF_BASE * (Math.pow(2, _boffIteration) * (1.0 + _BOFF_JITTER * Math.random()));
    // Update iteration counter for future use
    _boffIteration = (_boffIteration >= _BOFF_MAX_ITER ? _boffIteration : _boffIteration + 1);
    if (this.onAutoreconnectIteration) {
      this.onAutoreconnectIteration(timeout);
    }

    _boffTimer = setTimeout(() => {
      log(`Reconnecting, iter=${_boffIteration}, timeout=${timeout}`);
      // Maybe the socket was closed while we waited for the timer?
      if (!_boffClosed) {
        const prom = this.connect();
        if (this.onAutoreconnectIteration) {
          this.onAutoreconnectIteration(0, prom);
        } else {
          // Suppress error if it's not used.
          prom.catch(() => {
            /* do nothing */
          });
        }
      } else if (this.onAutoreconnectIteration) {
        this.onAutoreconnectIteration(-1);
      }
    }, timeout);
  }

  // Terminate auto-reconnect process.
  function boffStop() {
    clearTimeout(_boffTimer);
    _boffTimer = null;
  }

  // Reset auto-reconnect iteration counter.
  function boffReset() {
    _boffIteration = 0;
  }

  // Initialization for Websocket
  function init_ws(instance) {
    let _socket = null;

    /**
     * Initiate a new connection
     * @memberof Tinode.Connection#
     * @param {string} host_ Host name to connect to; if <code>null</code> the old host name will be used.
     * @param {boolean} force Force new connection even if one already exists.
     * @return {Promise} Promise resolved/rejected when the connection call completes, resolution is called without
     *  parameters, rejection passes the {Error} as parameter.
     */
    instance.connect = function(host_, force) {
      _boffClosed = false;

      if (_socket) {
        if (!force && _socket.readyState == _socket.OPEN) {
          return Promise.resolve();
        }
        _socket.close();
        _socket = null;
      }

      if (host_) {
        host = host_;
      }

      return new Promise(function(resolve, reject) {
        const url = makeBaseUrl(host, secure ? 'wss' : 'ws', version, apiKey);

        log("Connecting to: ", url);

        // It throws when the server is not accessible but the exception cannot be caught:
        // https://stackoverflow.com/questions/31002592/javascript-doesnt-catch-error-in-websocket-instantiation/31003057
        const conn = new WebSocketProvider(url);

        conn.onerror = function(err) {
          reject(err);
        }

        conn.onopen = function(evt) {
          if (autoreconnect) {
            boffStop();
          }

          if (instance.onOpen) {
            instance.onOpen();
          }

          resolve();
        }

        conn.onclose = function(evt) {
          _socket = null;

          if (instance.onDisconnect) {
            const code = _boffClosed ? NETWORK_USER : NETWORK_ERROR;
            instance.onDisconnect(new Error(_boffClosed ? NETWORK_USER_TEXT : NETWORK_ERROR_TEXT +
              ' (' + code + ')'), code);
          }

          if (!_boffClosed && autoreconnect) {
            boffReconnect.call(instance);
          }
        }

        conn.onmessage = function(evt) {
          if (instance.onMessage) {
            instance.onMessage(evt.data);
          }
        }
        _socket = conn;
      });
    }

    /**
     * Try to restore a network connection, also reset backoff.
     * @memberof Tinode.Connection#
     *
     * @param {boolean} force - reconnect even if there is a live connection already.
     */
    instance.reconnect = function(force) {
      boffStop();
      instance.connect(null, force);
    }

    /**
     * Terminate the network connection
     * @memberof Tinode.Connection#
     */
    instance.disconnect = function() {
      _boffClosed = true;
      boffStop();

      if (!_socket) {
        return;
      }
      _socket.close();
      _socket = null;
    }

    /**
     * Send a string to the server.
     * @memberof Tinode.Connection#
     *
     * @param {string} msg - String to send.
     * @throws Throws an exception if the underlying connection is not live.
     */
    instance.sendText = function(msg) {
      if (_socket && (_socket.readyState == _socket.OPEN)) {
        _socket.send(msg);
      } else {
        throw new Error("Websocket is not connected");
      }
    };

    /**
     * Check if socket is alive.
     * @memberof Tinode.Connection#
     * @returns {boolean} <code>true</code> if connection is live, <code>false</code> otherwise.
     */
    instance.isConnected = function() {
      return (_socket && (_socket.readyState == _socket.OPEN));
    }

    /**
     * Get the name of the current network transport.
     * @memberof Tinode.Connection#
     * @returns {string} name of the transport such as <code>"ws"</code> or <code>"lp"</code>.
     */
    instance.transport = function() {
      return 'ws';
    }

    /**
     * Send network probe to check if connection is indeed live.
     * @memberof Tinode.Connection#
     */
    instance.probe = function() {
      instance.sendText('1');
    }
  }

  // Initialization for long polling.
  function init_lp(instance) {
    const XDR_UNSENT = 0; // Client has been created. open() not called yet.
    const XDR_OPENED = 1; // open() has been called.
    const XDR_HEADERS_RECEIVED = 2; // send() has been called, and headers and status are available.
    const XDR_LOADING = 3; // Downloading; responseText holds partial data.
    const XDR_DONE = 4; // The operation is complete.
    // Fully composed endpoint URL, with API key & SID
    let _lpURL = null;

    let _poller = null;
    let _sender = null;

    function lp_sender(url_) {
      const sender = new XHRProvider();
      sender.onreadystatechange = function(evt) {
        if (sender.readyState == XDR_DONE && sender.status >= 400) {
          // Some sort of error response
          throw new Error(`LP sender failed, ${sender.status}`);
        }
      }

      sender.open('POST', url_, true);
      return sender;
    }

    function lp_poller(url_, resolve, reject) {
      let poller = new XHRProvider();
      let promiseCompleted = false;

      poller.onreadystatechange = function(evt) {

        if (poller.readyState == XDR_DONE) {
          if (poller.status == 201) { // 201 == HTTP.Created, get SID
            let pkt = JSON.parse(poller.responseText, jsonParseHelper);
            _lpURL = url_ + '&sid=' + pkt.ctrl.params.sid
            poller = lp_poller(_lpURL);
            poller.send(null)
            if (instance.onOpen) {
              instance.onOpen();
            }

            if (resolve) {
              promiseCompleted = true;
              resolve();
            }

            if (autoreconnect) {
              boffStop();
            }
          } else if (poller.status < 400) { // 400 = HTTP.BadRequest
            if (instance.onMessage) {
              instance.onMessage(poller.responseText)
            }
            poller = lp_poller(_lpURL);
            poller.send(null);
          } else {
            // Don't throw an error here, gracefully handle server errors
            if (reject && !promiseCompleted) {
              promiseCompleted = true;
              reject(poller.responseText);
            }
            if (instance.onMessage && poller.responseText) {
              instance.onMessage(poller.responseText);
            }
            if (instance.onDisconnect) {
              const code = poller.status || (_boffClosed ? NETWORK_USER : NETWORK_ERROR);
              const text = poller.responseText || (_boffClosed ? NETWORK_USER_TEXT : NETWORK_ERROR_TEXT);
              instance.onDisconnect(new Error(text + ' (' + code + ')'), code);
            }

            // Polling has stopped. Indicate it by setting poller to null.
            poller = null;
            if (!_boffClosed && autoreconnect) {
              boffReconnect.call(instance);
            }
          }
        }
      }
      poller.open('GET', url_, true);
      return poller;
    }

    instance.connect = function(host_, force) {
      _boffClosed = false;

      if (_poller) {
        if (!force) {
          return Promise.resolve();
        }
        _poller.onreadystatechange = undefined;
        _poller.abort();
        _poller = null;
      }

      if (host_) {
        host = host_;
      }

      return new Promise(function(resolve, reject) {
        const url = makeBaseUrl(host, secure ? 'https' : 'http', version, apiKey);
        log("Connecting to:", url);
        _poller = lp_poller(url, resolve, reject);
        _poller.send(null)
      }).catch((err) => {
        log("LP connection failed:", err);
      });
    };

    instance.reconnect = function(force) {
      boffStop();
      instance.connect(null, force);
    };

    instance.disconnect = function() {
      _boffClosed = true;
      boffStop();

      if (_sender) {
        _sender.onreadystatechange = undefined;
        _sender.abort();
        _sender = null;
      }
      if (_poller) {
        _poller.onreadystatechange = undefined;
        _poller.abort();
        _poller = null;
      }

      if (instance.onDisconnect) {
        instance.onDisconnect(new Error(NETWORK_USER_TEXT + ' (' + NETWORK_USER + ')'), NETWORK_USER);
      }
      // Ensure it's reconstructed
      _lpURL = null;
    }

    instance.sendText = function(msg) {
      _sender = lp_sender(_lpURL);
      if (_sender && (_sender.readyState == 1)) { // 1 == OPENED
        _sender.send(msg);
      } else {
        throw new Error("Long poller failed to connect");
      }
    };

    instance.isConnected = function() {
      return (_poller && true);
    }

    instance.transport = function() {
      return 'lp';
    }

    instance.probe = function() {
      instance.sendText('1');
    }
  }

  let initialized = false;
  if (config.transport === 'lp') {
    // explicit request to use long polling
    init_lp(this);
    initialized = true;
  } else if (config.transport === 'ws') {
    // explicit request to use web socket
    // if websockets are not available, horrible things will happen
    init_ws(this);
    initialized = true;
  }

  if (!initialized) {
    // Invalid or undefined network transport.
    log("Unknown or invalid network transport. Running under Node? Call 'Tinode.setNetworkProviders()'.");
    throw new Error("Unknown or invalid network transport. Running under Node? Call 'Tinode.setNetworkProviders()'.");
  }

  /**
   * Reset autoreconnect counter to zero.
   * @memberof Tinode.Connection#
   */
  this.backoffReset = function() {
    boffReset();
  }

  // Callbacks:
  /**
   * A callback to pass incoming messages to. See {@link Tinode.Connection#onMessage}.
   * @callback Tinode.Connection.OnMessage
   * @memberof Tinode.Connection
   * @param {string} message - Message to process.
   */
  /**
   * A callback to pass incoming messages to.
   * @type {Tinode.Connection.OnMessage}
   * @memberof Tinode.Connection#
   */
  this.onMessage = undefined;

  /**
   * A callback for reporting a dropped connection.
   * @type {function}
   * @memberof Tinode.Connection#
   */
  this.onDisconnect = undefined;

  /**
   * A callback called when the connection is ready to be used for sending. For websockets it's socket open,
   * for long polling it's <code>readyState=1</code> (OPENED)
   * @type {function}
   * @memberof Tinode.Connection#
   */
  this.onOpen = undefined;

  /**
   * A callback to notify of reconnection attempts. See {@link Tinode.Connection#onAutoreconnectIteration}.
   * @memberof Tinode.Connection
   * @callback AutoreconnectIterationType
   * @param {string} timeout - time till the next reconnect attempt in milliseconds. <code>-1</code> means reconnect was skipped.
   * @param {Promise} promise resolved or rejected when the reconnect attemp completes.
   *
   */
  /**
   * A callback to inform when the next attampt to reconnect will happen and to receive connection promise.
   * @memberof Tinode.Connection#
   * @type {Tinode.Connection.AutoreconnectIterationType}
   */
  this.onAutoreconnectIteration = undefined;

  /**
   * A callback to log events from Connection. See {@link Tinode.Connection#logger}.
   * @memberof Tinode.Connection
   * @callback LoggerCallbackType
   * @param {string} event - Event to log.
   */
  /**
   * A callback to report logging events.
   * @memberof Tinode.Connection#
   * @type {Tinode.Connection.LoggerCallbackType}
   */
  this.logger = undefined;
};

/**
 * To use Connection in a non browser context, supply WebSocket and XMLHttpRequest providers.
 * @static
 * @memberof Connection
 * @param wsProvider WebSocket provider, e.g. for nodeJS , <code>require('ws')</code>.
 * @param xhrProvider XMLHttpRequest provider, e.g. for node <code>require('xhr')</code>.
 */
Connection.setNetworkProviders = function(wsProvider, xhrProvider) {
  WebSocketProvider = wsProvider;
  XHRProvider = xhrProvider;
};

Connection.NETWORK_ERROR = NETWORK_ERROR;
Connection.NETWORK_ERROR_TEXT = NETWORK_ERROR_TEXT;
Connection.NETWORK_USER = NETWORK_USER;
Connection.NETWORK_USER_TEXT = NETWORK_USER_TEXT;

if (typeof module != 'undefined') {
  module.exports = Connection;
}

},{}],4:[function(require,module,exports){
/**
 * @file Helper methods for dealing with IndexedDB cache of messages, users, and topics.
 * See <a href="https://github.com/tinode/webapp">https://github.com/tinode/webapp</a> for real-life usage.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

// NOTE TO DEVELOPERS:
// Localizable strings should be double quoted "строка на другом языке",
// non-localizable strings should be single quoted 'non-localized'.

const DB_VERSION = 1;
const DB_NAME = 'tinode-web';

const DB = function(onError, logger) {
  onError = onError || function() {}
  logger = logger || function() {}

  // Instance of IndexDB.
  let db = null;
  // Indicator that the cache is disabled.
  let disabled = false;

  // Serializable topic fields.
  const topic_fields = ['created', 'updated', 'deleted', 'read', 'recv', 'seq', 'clear', 'defacs',
    'creds', 'public', 'private', 'touched'
  ];

  // Copy values from 'src' to 'dst'. Allocate dst if it's null or undefined.
  function serializeTopic(dst, src) {
    const res = dst || {
      name: src.name
    };
    topic_fields.forEach((f) => {
      if (src.hasOwnProperty(f)) {
        res[f] = src[f];
      }
    });
    if (Array.isArray(src._tags)) {
      res.tags = src._tags;
    }
    if (src.acs) {
      res.acs = src.getAccessMode().jsonHelper();
    }
    return res;
  }

  // Copy data from src to Topic object.
  function deserializeTopic(topic, src) {
    topic_fields.forEach((f) => {
      if (src.hasOwnProperty(f)) {
        topic[f] = src[f];
      }
    });
    if (Array.isArray(src.tags)) {
      topic._tags = src.tags;
    }
    if (src.acs) {
      topic.setAccessMode(src.acs);
    }
    topic.seq |= 0;
    topic.read |= 0;
    topic.unread = Math.max(0, topic.seq - topic.read);
  }

  function serializeSubscription(dst, topicName, uid, sub) {
    const fields = ['updated', 'mode', 'read', 'recv', 'clear', 'lastSeen', 'userAgent'];
    const res = dst || {
      topic: topicName,
      uid: uid
    };

    fields.forEach((f) => {
      if (sub.hasOwnProperty(f)) {
        res[f] = sub[f];
      }
    });

    return res;
  }

  function serializeMessage(dst, msg) {
    // Serializable fields.
    const fields = ['topic', 'seq', 'ts', '_status', 'from', 'head', 'content'];
    const res = dst || {};
    fields.forEach((f) => {
      if (msg.hasOwnProperty(f)) {
        res[f] = msg[f];
      }
    });
    return res;
  }

  function mapObjects(source, callback, context) {
    if (!db) {
      return disabled ?
        Promise.resolve([]) :
        Promise.reject(new Error("not initialized"));
    }

    return new Promise((resolve, reject) => {
      const trx = db.transaction([source]);
      trx.onerror = (event) => {
        logger("PCache", "mapObjects", source, event.target.error);
        reject(event.target.error);
      };
      trx.objectStore(source).getAll().onsuccess = (event) => {
        if (callback) {
          event.target.result.forEach((topic) => {
            callback.call(context, topic);
          });
        }
        resolve(event.target.result);
      };
    });
  }

  return {
    /**
     * Initialize persistent cache: open or create/upgrade if needed.
     * @returns {Promise} promise to be resolved/rejected when the DB is initialized.
     */
    initDatabase: function() {
      return new Promise((resolve, reject) => {
        // Open the database and initialize callbacks.
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = (event) => {
          db = event.target.result;
          disabled = false;
          resolve(db);
        };
        req.onerror = (event) => {
          logger("PCache", "failed to initialize", event);
          reject(event.target.error);
          onError(event.target.error);
        };
        req.onupgradeneeded = function(event) {
          db = event.target.result;

          db.onerror = function(event) {
            logger("PCache", "failed to create storage", event);
            onError(event.target.error);
          };

          // Individual object stores.

          // Object store (table) for topics. The primary key is topic name.
          db.createObjectStore('topic', {
            keyPath: 'name'
          });

          // Users object store. UID is the primary key.
          db.createObjectStore('user', {
            keyPath: 'uid'
          });

          // Subscriptions object store topic <-> user. Topic name + UID is the primary key.
          db.createObjectStore('subscription', {
            keyPath: ['topic', 'uid']
          });

          // Messages object store. The primary key is topic name + seq.
          db.createObjectStore('message', {
            keyPath: ['topic', 'seq']
          });
        };
      });
    },

    /**
     * Delete persistent cache.
     */
    deleteDatabase: function() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onblocked = function(event) {
          if (db) {
            db.close();
          }
        };
        req.onsuccess = (event) => {
          db = null;
          disabled = true;
          resolve(true);
        };
        req.onerror = (event) => {
          logger("PCache", "deleteDatabase", event.target.error);
          reject(event.target.error);
        };
      });
    },

    /**
     * Check if persistent cache is ready for use.
     * @memberOf DB
     * @returns {boolean} <code>true</code> if cache is ready, <code>false</code> otherwise.
     */
    isReady: function() {
      return !!db;
    },

    // Topics.
    /**
     * Save to cache or update topic in persistent cache.
     * @memberOf DB
     * @param {Topic} topic - topic to be added or updated.
     * @returns {Promise} promise resolved/rejected on operation completion.
     */
    updTopic: function(topic) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['topic'], 'readwrite');
        trx.oncomplete = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "updTopic", event.target.error);
          reject(event.target.error);
        };
        const req = trx.objectStore('topic').get(topic.name);
        req.onsuccess = (event) => {
          trx.objectStore('topic').put(serializeTopic(req.result, topic));
          trx.commit();
        };
      });
    },

    /**
     * Remove topic from persistent cache.
     * @memberOf DB
     * @param {string} name - name of the topic to remove from database.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remTopic: function(name) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['topic', 'subscription', 'message'], 'readwrite');
        trx.oncomplete = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "remTopic", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('topic').delete(IDBKeyRange.only(name));
        trx.objectStore('subscription').delete(IDBKeyRange.bound([name, '-'], [name, '~']));
        trx.objectStore('message').delete(IDBKeyRange.bound([name, 0], [name, Number.MAX_SAFE_INTEGER]));
        trx.commit();
      });
    },

    /**
     * Execute a callback for each stored topic.
     * @memberOf DB
     * @param {function} callback - function to call for each topic.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapTopics: function(callback, context) {
      return mapObjects('topic', callback, context);
    },

    /**
     * Copy data from serialized object to topic.
     * @memberOf DB
     * @param {Topic} topic - target to deserialize to.
     * @param {Object} src - serialized data to copy from.
     */
    deserializeTopic: function(topic, src) {
      deserializeTopic(topic, src);
    },

    // Users.
    /**
     * Add or update user object in the persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to save or update.
     * @param {Object} pub - user's <code>public</code> information.
     * @returns {Promise} promise resolved/rejected on operation completion.
     */
    updUser: function(uid, pub) {
      if (arguments.length < 2 || pub === undefined) {
        // No point inupdating user with invalid data.
        return;
      }
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['user'], 'readwrite');
        trx.oncomplete = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "updUser", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('user').put({
          uid: uid,
          public: pub
        });
        trx.commit();
      });
    },

    /**
     * Remove user from persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to remove from the cache.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remUser: function(uid) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['user'], 'readwrite');
        trx.oncomplete = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "remUser", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('user').delete(IDBKeyRange.only(uid));
        trx.commit();
      });
    },

    /**
     * Execute a callback for each stored user.
     * @memberOf DB
     * @param {function} callback - function to call for each topic.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapUsers: function(callback, context) {
      return mapObjects('user', callback, context);
    },

    /**
     * Read a single user from persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to fetch from cache.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    getUser: function(uid) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['user']);
        trx.oncomplete = (event) => {
          const user = event.target.result;
          resolve({
            user: user.uid,
            public: user.public
          });
        };
        trx.onerror = (event) => {
          logger("PCache", "getUser", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('user').get(uid);
      });
    },

    // Subscriptions.

    /**
     * Add or update subscription in persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {string} uid - ID of the subscribed user.
     * @param {Object} sub - subscription to save.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    updSubscription: function(topicName, uid, sub) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['subscription'], 'readwrite');
        trx.oncomplete = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "updSubscription", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('subscription').get([topicName, uid]).onsuccess = (event) => {
          trx.objectStore('subscription').put(serializeSubscription(event.target.result, topicName, uid, sub));
          trx.commit();
        };
      });
    },

    /**
     * Execute a callback for each cached subscription in a given topic.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the subscriptions.
     * @param {function} callback - function to call for each subscription.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapSubscriptions: function(topicName, callback, context) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve([]) :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['subscription']);
        trx.onerror = (event) => {
          logger("PCache", "mapSubscriptions", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('subscription').getAll(IDBKeyRange.bound([topicName, '-'], [topicName, '~'])).onsuccess = (event) => {
          if (callback) {
            event.target.result.forEach((topic) => {
              callback.call(context, topic);
            });
          }
          resolve(event.target.result);
        };
      });
    },

    // Messages.

    /**
     * Save message to persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {Object} msg - message to save.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    addMessage: function(msg) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['message'], 'readwrite');
        trx.onsuccess = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "addMesssage", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('message').add(serializeMessage(null, msg));
        trx.commit();
      });
    },

    /**
     * Update delivery status of a message stored in persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {number} seq - ID of the message to update
     * @param {number} status - new delivery status of the message.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    updMessageStatus: function(topicName, seq, status) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        const trx = db.transaction(['message'], 'readwrite');
        trx.onsuccess = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "updMessageStatus", event.target.error);
          reject(event.target.error);
        };
        const req = trx.objectStore('message').get(IDBKeyRange.only([topicName, seq]));
        req.onsuccess = (event) => {
          const src = req.result || event.target.result;
          if (!src || src._status == status) {
            trx.commit();
            return;
          }
          trx.objectStore('message').put(serializeMessage(src, {
            topic: topicName,
            seq: seq,
            _status: status
          }));
          trx.commit();
        };
      });
    },

    /**
     * Remove one or more messages from persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {number} from - id of the message to remove or lower boundary when removing range (inclusive).
     * @param {number=} to - upper boundary (exclusive) when removing a range of messages.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remMessages: function(topicName, from, to) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        if (!from && !to) {
          from = 0;
          to = Number.MAX_SAFE_INTEGER;
        }
        const range = to > 0 ? IDBKeyRange.bound([topicName, from], [topicName, to], false, true) :
          IDBKeyRange.only([topicName, from]);
        const trx = db.transaction(['message'], 'readwrite');
        trx.onsuccess = (event) => {
          resolve(event.target.result);
        };
        trx.onerror = (event) => {
          logger("PCache", "remMessages", event.target.error);
          reject(event.target.error);
        };
        trx.objectStore('message').delete(range);
        trx.commit();
      });
    },

    /**
     * Retrieve messages from persistent store.
     * @memberOf DB
     * @param {string} topicName - name of the topic to retrieve messages from.
     * @param {function} callback to call for each retrieved message.
     * @param {Object} query - parameters of the message range to retrieve.
     * @param {number=} query.from - the least message ID to retrieve (inclusive).
     * @param {number=} query.to - the greatest message ID to retrieve (exclusive).
     * @param {number=} query.limit - the maximum number of messages to retrieve.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    readMessages: function(topicName, query, callback, context) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve([]) :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        query = query || {};
        const from = query.from > 0 ? query.from : 0;
        const to = query.to > 0 ? query.to : Number.MAX_SAFE_INTEGER;
        const limit = query.limit | 0;

        const result = [];
        const range = IDBKeyRange.bound([topicName, from], [topicName, to], false, true);
        const trx = db.transaction(['message']);
        trx.onerror = (event) => {
          logger("PCache", "readMessages", event.target.error);
          reject(event.target.error);
        };
        // Iterate in descending order.
        trx.objectStore('message').openCursor(range, 'prev').onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (callback) {
              callback.call(context, cursor.value);
            }
            result.push(cursor.value);
            if (limit <= 0 || result.length < limit) {
              cursor.continue();
            } else {
              resolve(result);
            }
          } else {
            resolve(result);
          }
        };
      });
    }
  };
}

if (typeof module != 'undefined') {
  module.exports = DB;
}

},{}],5:[function(require,module,exports){
/**
 * @copyright 2015-2021 Tinode
 * @summary Minimally rich text representation and formatting for Tinode.
 * @license Apache 2.0
 * @version 0.16
 *
 * @file Basic parser and formatter for very simple text markup. Mostly targeted at
 * mobile use cases similar to Telegram, WhatsApp, and FB Messenger.
 *
 * <p>Supports conversion of user keyboard input to formatted text:</p>
 * <ul>
 *   <li>*abc* &rarr; <b>abc</b></li>
 *   <li>_abc_ &rarr; <i>abc</i></li>
 *   <li>~abc~ &rarr; <del>abc</del></li>
 *   <li>`abc` &rarr; <tt>abc</tt></li>
 * </ul>
 * Also supports forms and buttons.
 *
 * Nested formatting is supported, e.g. *abc _def_* -> <b>abc <i>def</i></b>
 * URLs, @mentions, and #hashtags are extracted and converted into links.
 * Forms and buttons can be added procedurally.
 * JSON data representation is inspired by Draft.js raw formatting.
 *
 *
 * @example
 * Text:
 * <pre>
 *     this is *bold*, `code` and _italic_, ~strike~
 *     combined *bold and _italic_*
 *     an url: https://www.example.com/abc#fragment and another _www.tinode.co_
 *     this is a @mention and a #hashtag in a string
 *     second #hashtag
 * </pre>
 *
 *  Sample JSON representation of the text above:
 *  {
 *     "txt": "this is bold, code and italic, strike combined bold and italic an url: https://www.example.com/abc#fragment " +
 *             "and another www.tinode.co this is a @mention and a #hashtag in a string second #hashtag",
 *     "fmt": [
 *         { "at":8, "len":4,"tp":"ST" },{ "at":14, "len":4, "tp":"CO" },{ "at":23, "len":6, "tp":"EM"},
 *         { "at":31, "len":6, "tp":"DL" },{ "tp":"BR", "len":1, "at":37 },{ "at":56, "len":6, "tp":"EM" },
 *         { "at":47, "len":15, "tp":"ST" },{ "tp":"BR", "len":1, "at":62 },{ "at":120, "len":13, "tp":"EM" },
 *         { "at":71, "len":36, "key":0 },{ "at":120, "len":13, "key":1 },{ "tp":"BR", "len":1, "at":133 },
 *         { "at":144, "len":8, "key":2 },{ "at":159, "len":8, "key":3 },{ "tp":"BR", "len":1, "at":179 },
 *         { "at":187, "len":8, "key":3 },{ "tp":"BR", "len":1, "at":195 }
 *     ],
 *     "ent": [
 *         { "tp":"LN", "data":{ "url":"https://www.example.com/abc#fragment" } },
 *         { "tp":"LN", "data":{ "url":"http://www.tinode.co" } },
 *         { "tp":"MN", "data":{ "val":"mention" } },
 *         { "tp":"HT", "data":{ "val":"hashtag" } }
 *     ]
 *  }
 */

'use strict';

// NOTE TO DEVELOPERS:
// Localizable strings should be double quoted "строка на другом языке",
// non-localizable strings should be single quoted 'non-localized'.

const MAX_FORM_ELEMENTS = 8;
const JSON_MIME_TYPE = 'application/json';

// Regular expressions for parsing inline formats. Javascript does not support lookbehind,
// so it's a bit messy.
const INLINE_STYLES = [
  // Strong = bold, *bold text*
  {
    name: 'ST',
    start: /(?:^|[\W_])(\*)[^\s*]/,
    end: /[^\s*](\*)(?=$|[\W_])/
  },
  // Emphesized = italic, _italic text_
  {
    name: 'EM',
    start: /(?:^|\W)(_)[^\s_]/,
    end: /[^\s_](_)(?=$|\W)/
  },
  // Deleted, ~strike this though~
  {
    name: 'DL',
    start: /(?:^|[\W_])(~)[^\s~]/,
    end: /[^\s~](~)(?=$|[\W_])/
  },
  // Code block `this is monospace`
  {
    name: 'CO',
    start: /(?:^|\W)(`)[^`]/,
    end: /[^`](`)(?=$|\W)/
  }
];

// RegExps for entity extraction (RF = reference)
const ENTITY_TYPES = [
  // URLs
  {
    name: 'LN',
    dataName: 'url',
    pack: function(val) {
      // Check if the protocol is specified, if not use http
      if (!/^[a-z]+:\/\//i.test(val)) {
        val = 'http://' + val;
      }
      return {
        url: val
      };
    },
    re: /(?:(?:https?|ftp):\/\/|www\.|ftp\.)[-A-Z0-9+&@#\/%=~_|$?!:,.]*[A-Z0-9+&@#\/%=~_|$]/ig
  },
  // Mentions @user (must be 2 or more characters)
  {
    name: 'MN',
    dataName: 'val',
    pack: function(val) {
      return {
        val: val.slice(1)
      };
    },
    re: /\B@(\w\w+)/g
  },
  // Hashtags #hashtag, like metion 2 or more characters.
  {
    name: 'HT',
    dataName: 'val',
    pack: function(val) {
      return {
        val: val.slice(1)
      };
    },
    re: /\B#(\w\w+)/g
  }
];

// HTML tag name suggestions
const HTML_TAGS = {
  ST: {
    name: 'b',
    isVoid: false
  },
  EM: {
    name: 'i',
    isVoid: false
  },
  DL: {
    name: 'del',
    isVoid: false
  },
  CO: {
    name: 'tt',
    isVoid: false
  },
  BR: {
    name: 'br',
    isVoid: true
  },
  LN: {
    name: 'a',
    isVoid: false
  },
  MN: {
    name: 'a',
    isVoid: false
  },
  HT: {
    name: 'a',
    isVoid: false
  },
  IM: {
    name: 'img',
    isVoid: true
  },
  FM: {
    name: 'div',
    isVoid: false
  },
  RW: {
    name: 'div',
    isVoid: false,
  },
  BN: {
    name: 'button',
    isVoid: false
  },
  HD: {
    name: '',
    isVoid: false
  },
  HL: {
    name: 'span',
    isVoid: false
  }
};

// Convert base64-encoded string into Blob.
function base64toObjectUrl(b64, contentType, logger) {
  if (!b64) {
    return null;
  }

  try {
    const bin = atob(b64);
    const length = bin.length;
    const buf = new ArrayBuffer(length);
    const arr = new Uint8Array(buf);
    for (let i = 0; i < length; i++) {
      arr[i] = bin.charCodeAt(i);
    }

    return URL.createObjectURL(new Blob([buf], {
      type: contentType
    }));
  } catch (err) {
    if (logger) {
      logger("Drafty: failed to convert object.", err.message);
    }
  }

  return null;
}

function base64toDataUrl(b64, contentType) {
  if (!b64) {
    return null;
  }
  contentType = contentType || 'image/jpeg';
  return 'data:' + contentType + ';base64,' + b64;
}

// Helpers for converting Drafty to HTML.
const DECORATORS = {
  // Visial styles
  ST: {
    open: function() {
      return '<b>';
    },
    close: function() {
      return '</b>';
    }
  },
  EM: {
    open: function() {
      return '<i>';
    },
    close: function() {
      return '</i>'
    }
  },
  DL: {
    open: function() {
      return '<del>';
    },
    close: function() {
      return '</del>'
    }
  },
  CO: {
    open: function() {
      return '<tt>';
    },
    close: function() {
      return '</tt>'
    }
  },
  // Line break
  BR: {
    open: function() {
      return '<br/>';
    },
    close: function() {
      return ''
    }
  },
  // Hidden element
  HD: {
    open: function() {
      return '';
    },
    close: function() {
      return '';
    }
  },
  // Highlighted element.
  HL: {
    open: function() {
      return '<span style="color:teal">';
    },
    close: function() {
      return '</span>';
    }
  },
  // Link (URL)
  LN: {
    open: function(data) {
      return '<a href="' + data.url + '">';
    },
    close: function(data) {
      return '</a>';
    },
    props: function(data) {
      return data ? {
        href: data.url,
        target: "_blank"
      } : null;
    },
  },
  // Mention
  MN: {
    open: function(data) {
      return '<a href="#' + data.val + '">';
    },
    close: function(data) {
      return '</a>';
    },
    props: function(data) {
      return data ? {
        name: data.val
      } : null;
    },
  },
  // Hashtag
  HT: {
    open: function(data) {
      return '<a href="#' + data.val + '">';
    },
    close: function(data) {
      return '</a>';
    },
    props: function(data) {
      return data ? {
        name: data.val
      } : null;
    },
  },
  // Button
  BN: {
    open: function(data) {
      return '<button>';
    },
    close: function(data) {
      return '</button>';
    },
    props: function(data) {
      return data ? {
        'data-act': data.act,
        'data-val': data.val,
        'data-name': data.name,
        'data-ref': data.ref
      } : null;
    },
  },
  // Image
  IM: {
    open: function(data) {
      // Don't use data.ref for preview: it's a security risk.
      const tmpPreviewUrl = base64toDataUrl(data._tempPreview, data.mime);
      const previewUrl = base64toObjectUrl(data.val, data.mime, Drafty.logger);
      const downloadUrl = data.ref || previewUrl;
      return (data.name ? '<a href="' + downloadUrl + '" download="' + data.name + '">' : '') +
        '<img src="' + (tmpPreviewUrl || previewUrl) + '"' +
        (data.width ? ' width="' + data.width + '"' : '') +
        (data.height ? ' height="' + data.height + '"' : '') + ' border="0" />';
    },
    close: function(data) {
      return (data.name ? '</a>' : '');
    },
    props: function(data) {
      if (!data) return null;
      return {
        // Temporary preview, or permanent preview, or external link.
        src: base64toDataUrl(data._tempPreview, data.mime) ||
          data.ref || base64toObjectUrl(data.val, data.mime, Drafty.logger),
        title: data.name,
        'data-width': data.width,
        'data-height': data.height,
        'data-name': data.name,
        'data-size': data.val ? ((data.val.length * 0.75) | 0) : (data.size | 0),
        'data-mime': data.mime
      };
    },
  },
  // Form - structured layout of elements.
  FM: {
    open: function(data) {
      return '<div>';
    },
    close: function(data) {
      return '</div>';
    }
  },
  // Row: logic grouping of elements
  RW: {
    open: function(data) {
      return '<div>';
    },
    close: function(data) {
      return '</div>';
    }
  }
};

/**
 * The main object which performs all the formatting actions.
 * @class Drafty
 * @constructor
 */
const Drafty = function() {}

// Take a string and defined earlier style spans, re-compose them into a tree where each leaf is
// a same-style (including unstyled) string. I.e. 'hello *bold _italic_* and ~more~ world' ->
// ('hello ', (b: 'bold ', (i: 'italic')), ' and ', (s: 'more'), ' world');
//
// This is needed in order to clear markup, i.e. 'hello *world*' -> 'hello world' and convert
// ranges from markup-ed offsets to plain text offsets.
function chunkify(line, start, end, spans) {
  const chunks = [];

  if (spans.length == 0) {
    return [];
  }

  for (let i in spans) {
    // Get the next chunk from the queue
    const span = spans[i];

    // Grab the initial unstyled chunk
    if (span.start > start) {
      chunks.push({
        text: line.slice(start, span.start)
      });
    }

    // Grab the styled chunk. It may include subchunks.
    const chunk = {
      type: span.type
    };
    const chld = chunkify(line, span.start + 1, span.end, span.children);
    if (chld.length > 0) {
      chunk.children = chld;
    } else {
      chunk.text = span.text;
    }
    chunks.push(chunk);
    start = span.end + 1; // '+1' is to skip the formatting character
  }

  // Grab the remaining unstyled chunk, after the last span
  if (start < end) {
    chunks.push({
      text: line.slice(start, end)
    });
  }

  return chunks;
}

// Inverse of chunkify. Returns a tree of formatted spans.
function forEach(line, start, end, spans, formatter, context) {
  const result = [];

  // Process ranges calling formatter for each range.
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span.at < 0) {
      // Ask formatter if it wants to do anything with the non-visual span.
      const s = formatter.call(context, span.tp, span.data, undefined, result.length);
      if (s) {
        result.push(s);
      }
      continue;
    }
    // Add un-styled range before the styled span starts.
    if (start < span.at) {
      result.push(formatter.call(context, null, undefined, line.slice(start, span.at), result.length));
      start = span.at;
    }
    // Get all spans which are within current span.
    const subspans = [];
    for (let si = i + 1; si < spans.length && spans[si].at < span.at + span.len; si++) {
      subspans.push(spans[si]);
      i = si;
    }

    const tag = HTML_TAGS[span.tp] || {}
    result.push(formatter.call(context, span.tp, span.data,
      tag.isVoid ? null : forEach(line, start, span.at + span.len, subspans, formatter, context),
      result.length));

    start = span.at + span.len;
  }

  // Add the last unformatted range.
  if (start < end) {
    result.push(formatter.call(context, null, undefined, line.slice(start, end), result.length));
  }

  return result;
}

// Detect starts and ends of formatting spans. Unformatted spans are
// ignored at this stage.
function spannify(original, re_start, re_end, type) {
  const result = [];
  let index = 0;
  let line = original.slice(0); // make a copy;

  while (line.length > 0) {
    // match[0]; // match, like '*abc*'
    // match[1]; // match captured in parenthesis, like 'abc'
    // match['index']; // offset where the match started.

    // Find the opening token.
    const start = re_start.exec(line);
    if (start == null) {
      break;
    }

    // Because javascript RegExp does not support lookbehind, the actual offset may not point
    // at the markup character. Find it in the matched string.
    let start_offset = start['index'] + start[0].lastIndexOf(start[1]);
    // Clip the processed part of the string.
    line = line.slice(start_offset + 1);
    // start_offset is an offset within the clipped string. Convert to original index.
    start_offset += index;
    // Index now point to the beginning of 'line' within the 'original' string.
    index = start_offset + 1;

    // Find the matching closing token.
    const end = re_end ? re_end.exec(line) : null;
    if (end == null) {
      break;
    }
    let end_offset = end['index'] + end[0].indexOf(end[1]);
    // Clip the processed part of the string.
    line = line.slice(end_offset + 1);
    // Update offsets
    end_offset += index;
    // Index now point to the beginning of 'line' within the 'original' string.
    index = end_offset + 1;

    result.push({
      text: original.slice(start_offset + 1, end_offset),
      children: [],
      start: start_offset,
      end: end_offset,
      type: type
    });
  }

  return result;
}

// Convert linear array or spans into a tree representation.
// Keep standalone and nested spans, throw away partially overlapping spans.
function toTree(spans) {
  if (spans.length == 0) {
    return [];
  }

  const tree = [spans[0]];
  let last = spans[0];
  for (let i = 1; i < spans.length; i++) {
    // Keep spans which start after the end of the previous span or those which
    // are complete within the previous span.

    if (spans[i].start > last.end) {
      // Span is completely outside of the previous span.
      tree.push(spans[i]);
      last = spans[i];
    } else if (spans[i].end < last.end) {
      // Span is fully inside of the previous span. Push to subnode.
      last.children.push(spans[i]);
    }
    // Span could partially overlap, ignoring it as invalid.
  }

  // Recursively rearrange the subnodes.
  for (let i in tree) {
    tree[i].children = toTree(tree[i].children);
  }

  return tree;
}

// Get a list of entities from a text.
function extractEntities(line) {
  let match;
  let extracted = [];
  ENTITY_TYPES.map(function(entity) {
    while ((match = entity.re.exec(line)) !== null) {
      extracted.push({
        offset: match['index'],
        len: match[0].length,
        unique: match[0],
        data: entity.pack(match[0]),
        type: entity.name
      });
    }
  });

  if (extracted.length == 0) {
    return extracted;
  }

  // Remove entities detected inside other entities, like #hashtag in a URL.
  extracted.sort(function(a, b) {
    return a.offset - b.offset;
  });

  let idx = -1;
  extracted = extracted.filter(function(el) {
    const result = (el.offset > idx);
    idx = el.offset + el.len;
    return result;
  });

  return extracted;
}

// Convert the chunks into format suitable for serialization.
function draftify(chunks, startAt) {
  let plain = "";
  let ranges = [];
  for (let i in chunks) {
    const chunk = chunks[i];
    if (!chunk.text) {
      const drafty = draftify(chunk.children, plain.length + startAt);
      chunk.text = drafty.txt;
      ranges = ranges.concat(drafty.fmt);
    }

    if (chunk.type) {
      ranges.push({
        at: plain.length + startAt,
        len: chunk.text.length,
        tp: chunk.type
      });
    }

    plain += chunk.text;
  }
  return {
    txt: plain,
    fmt: ranges
  };
}

// Splice two strings: insert second string into the first one at the given index
function splice(src, at, insert) {
  return src.slice(0, at) + insert + src.slice(at);
}

/**
 * Parse plain text into Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {String} content - plain-text content to parse.
 * @return {Drafty} parsed document or null if the source is not plain text.
 */
Drafty.parse = function(content) {
  // Make sure we are parsing strings only.
  if (typeof content != 'string') {
    return null;
  }

  // Split text into lines. It makes further processing easier.
  const lines = content.split(/\r?\n/);

  // Holds entities referenced from text
  const entityMap = [];
  const entityIndex = {};

  // Processing lines one by one, hold intermediate result in blx.
  const blx = [];
  lines.map(function(line) {
    let spans = [];
    let entities;

    // Find formatted spans in the string.
    // Try to match each style.
    INLINE_STYLES.map(function(style) {
      // Each style could be matched multiple times.
      spans = spans.concat(spannify(line, style.start, style.end, style.name));
    });

    let block;
    if (spans.length == 0) {
      block = {
        txt: line
      };
    } else {
      // Sort spans by style occurence early -> late
      spans.sort(function(a, b) {
        return a.start - b.start;
      });

      // Convert an array of possibly overlapping spans into a tree
      spans = toTree(spans);

      // Build a tree representation of the entire string, not
      // just the formatted parts.
      const chunks = chunkify(line, 0, line.length, spans);

      const drafty = draftify(chunks, 0);

      block = {
        txt: drafty.txt,
        fmt: drafty.fmt
      };
    }

    // Extract entities from the cleaned up string.
    entities = extractEntities(block.txt);
    if (entities.length > 0) {
      const ranges = [];
      for (let i in entities) {
        // {offset: match['index'], unique: match[0], len: match[0].length, data: ent.packer(), type: ent.name}
        const entity = entities[i];
        let index = entityIndex[entity.unique];
        if (!index) {
          index = entityMap.length;
          entityIndex[entity.unique] = index;
          entityMap.push({
            tp: entity.type,
            data: entity.data
          });
        }
        ranges.push({
          at: entity.offset,
          len: entity.len,
          key: index
        });
      }
      block.ent = ranges;
    }

    blx.push(block);
  });

  const result = {
    txt: ""
  };

  // Merge lines and save line breaks as BR inline formatting.
  if (blx.length > 0) {
    result.txt = blx[0].txt;
    result.fmt = (blx[0].fmt || []).concat(blx[0].ent || []);

    for (let i = 1; i < blx.length; i++) {
      const block = blx[i];
      const offset = result.txt.length + 1;

      result.fmt.push({
        tp: 'BR',
        len: 1,
        at: offset - 1
      });

      result.txt += " " + block.txt;
      if (block.fmt) {
        result.fmt = result.fmt.concat(block.fmt.map(function(s) {
          s.at += offset;
          return s;
        }));
      }
      if (block.ent) {
        result.fmt = result.fmt.concat(block.ent.map(function(s) {
          s.at += offset;
          return s;
        }));
      }
    }

    if (result.fmt.length == 0) {
      delete result.fmt;
    }

    if (entityMap.length > 0) {
      result.ent = entityMap;
    }
  }
  return result;
}

/**
 * Initialize Drafty document to a plain text string.
 *
 * @param {String} plainText - string to use as Drafty content.
 *
 * @returns new Drafty document or null is plainText is not a string.
 */
Drafty.init = function(plainText) {
  if (typeof plainText != 'string') {
    return null;
  }
  return {
    txt: plainText
  };
}

/**
 * Append one Drafty document to another.
 *
 * @param {Drafty} first - Drafty document to append to.
 * @param {Drafty} second - Drafty document being appended.
 *
 * @return {Drafty} first document with the second appended to it.
 */
Drafty.append = function(first, second) {
  if (first == null) {
    return second;
  }
  if (second == null) {
    return first;
  }

  first.txt = first.txt || '';
  second.txt = second.txt || '';
  const len = first.txt.length;

  first.txt += second.txt;
  if (Array.isArray(second.fmt)) {
    first.fmt = first.fmt || [];
    if (Array.isArray(second.ent)) {
      first.ent = first.ent || [];
    }
    second.fmt.forEach(src => {
      const fmt = {
        at: src.at + len,
        len: src.len
      };
      if (src.tp) {
        fmt.tp = src.tp;
      } else {
        fmt.key = first.ent.length;
        first.ent.push(second.ent[src.key || 0]);
      }
      first.fmt.push(fmt);
    });
  }

  return first;
}

/**
 * @typedef Drafty.ImageDesc
 * @memberof Drafty
 * @type Object
 * @param {string} mime - mime-type of the image, e.g. "image/png"
 * @param {string} preview - base64-encoded image content (or preview, if large image is attached). Could be null/undefined.
 * @param {integer} width - width of the image
 * @param {integer} height - height of the image
 * @param {string} filename - file name suggestion for downloading the image.
 * @param {integer} size - size of the image in bytes. Treat is as an untrusted hint.
 * @param {string} refurl - reference to the content. Could be null/undefined.
 * @param {string} _tempPreview - base64-encoded image preview used during upload process; not serializable.
 * @param {Promise} urlPromise - Promise which returns content URL when resolved.
 */

/**
 * Insert inline image into Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to add image to.
 * @param {integer} at - index where the object is inserted. The length of the image is always 1.
 * @param {ImageDesc} imageDesc - object with image paramenets and data.
 *
 * @return {Drafty} updated document.
 */
Drafty.insertImage = function(content, at, imageDesc) {
  content = content || {
    txt: " "
  };
  content.ent = content.ent || [];
  content.fmt = content.fmt || [];

  content.fmt.push({
    at: at,
    len: 1,
    key: content.ent.length
  });

  const ex = {
    tp: 'IM',
    data: {
      mime: imageDesc.mime,
      val: imageDesc.preview,
      width: imageDesc.width,
      height: imageDesc.height,
      name: imageDesc.filename,
      size: imageDesc.size | 0,
      ref: imageDesc.refurl
    }
  };

  if (imageDesc.urlPromise) {
    ex.data._tempPreview = imageDesc._tempPreview;
    ex.data._processing = true;
    imageDesc.urlPromise.then(
      (url) => {
        ex.data.ref = url;
        ex.data._tempPreview = undefined;
        ex.data._processing = undefined;
      },
      (err) => {
        /* catch the error, otherwise it will appear in the console. */
        ex.data._processing = undefined;
      }
    );
  }

  content.ent.push(ex);

  return content;
}

/**
 * Append inline image to Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to add image to.
 * @param {ImageDesc} imageDesc - object with image paramenets.
 *
 * @return {Drafty} updated document.
 */
Drafty.appendImage = function(content, imageDesc) {
  content = content || {
    txt: ""
  };
  content.txt += " ";
  return Drafty.insertImage(content, content.txt.length - 1, imageDesc);
}

/**
 * @typedef Drafty.AttachmentDesc
 * @memberof Drafty
 * @type Object
 * @param {string} mime - mime-type of the image, e.g. "image/png"
 * @param {string} data - base64-encoded in-band content of small attachments. Could be null/undefined.
 * @param {string} filename - file name suggestion for downloading the attachment.
 * @param {integer} size - size of the file in bytes. Treat is as an untrusted hint.
 * @param {string} refurl - reference to the out-of-band content. Could be null/undefined.
 * @param {Promise} urlPromise - Promise which returns content URL when resolved.
 */

/**
 * Attach file to Drafty content. Either as a blob or as a reference.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to attach file to.
 * @param {AttachmentDesc} object - containing attachment description and data.
 *
 * @return {Drafty} updated document.
 */
Drafty.attachFile = function(content, attachmentDesc) {
  content = content || {
    txt: ""
  };
  content.ent = content.ent || [];
  content.fmt = content.fmt || [];

  content.fmt.push({
    at: -1,
    len: 0,
    key: content.ent.length
  });

  const ex = {
    tp: 'EX',
    data: {
      mime: attachmentDesc.mime,
      val: attachmentDesc.data,
      name: attachmentDesc.filename,
      ref: attachmentDesc.refurl,
      size: attachmentDesc.size | 0
    }
  }
  if (attachmentDesc.urlPromise) {
    ex.data._processing = true;
    attachmentDesc.urlPromise.then(
      (url) => {
        ex.data.ref = url;
        ex.data._processing = undefined;
      },
      (err) => {
        /* catch the error, otherwise it will appear in the console. */
        ex.data._processing = undefined;
      }
    );
  }
  content.ent.push(ex);

  return content;
}

/**
 * Wraps content into an interactive form.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty|string} content - to wrap into a form.
 * @param {number} at - index where the forms starts.
 * @param {number} len - length of the form content.
 *
 * @return {Drafty} updated document.
 */
Drafty.wrapAsForm = function(content, at, len) {
  if (typeof content == 'string') {
    content = {
      txt: content
    };
  }
  content.fmt = content.fmt || [];

  content.fmt.push({
    at: at,
    len: len,
    tp: 'FM'
  });

  return content;
}

/**
 * Insert clickable button into Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty|string} content - Drafty document to insert button to or a string to be used as button text.
 * @param {number} at - location where the button is inserted.
 * @param {number} len - the length of the text to be used as button title.
 * @param {string} name - the button. Client should return it to the server when the button is clicked.
 * @param {string} actionType - the type of the button, one of 'url' or 'pub'.
 * @param {string} actionValue - the value to return on click:
 * @param {string} refUrl - the URL to go to when the 'url' button is clicked.
 *
 * @return {Drafty} updated document.
 */
Drafty.insertButton = function(content, at, len, name, actionType, actionValue, refUrl) {
  if (typeof content == 'string') {
    content = {
      txt: content
    };
  }

  if (!content || !content.txt || content.txt.length < at + len) {
    return null;
  }

  if (len <= 0 || ['url', 'pub'].indexOf(actionType) == -1) {
    return null;
  }
  // Ensure refUrl is a string.
  if (actionType == 'url' && !refUrl) {
    return null;
  }
  refUrl = '' + refUrl;

  content.ent = content.ent || [];
  content.fmt = content.fmt || [];

  content.fmt.push({
    at: at,
    len: len,
    key: content.ent.length
  });
  content.ent.push({
    tp: 'BN',
    data: {
      act: actionType,
      val: actionValue,
      ref: refUrl,
      name: name
    }
  });

  return content;
}

/**
 * Append clickable button to Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty|string} content - Drafty document to insert button to or a string to be used as button text.
 * @param {string} title - the text to be used as button title.
 * @param {string} name - the button. Client should return it to the server when the button is clicked.
 * @param {string} actionType - the type of the button, one of 'url' or 'pub'.
 * @param {string} actionValue - the value to return on click:
 * @param {string} refUrl - the URL to go to when the 'url' button is clicked.
 *
 * @return {Drafty} updated document.
 */
Drafty.appendButton = function(content, title, name, actionType, actionValue, refUrl) {
  content = content || {
    txt: ""
  };
  const at = content.txt.length;
  content.txt += title;
  return Drafty.insertButton(content, at, title.length, name, actionType, actionValue, refUrl);
}

/**
 * Attach a generic JS object. The object is attached as a json string.
 * Intended for representing a form response.
 *
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - Drafty document to attach file to.
 * @param {Object} data - data to convert to json string and attach.
 * @returns {Drafty} the same document as <code>content</code>.
 */
Drafty.attachJSON = function(content, data) {
  content = content || {
    txt: ""
  };
  content.ent = content.ent || [];
  content.fmt = content.fmt || [];

  content.fmt.push({
    at: -1,
    len: 0,
    key: content.ent.length
  });

  content.ent.push({
    tp: 'EX',
    data: {
      mime: JSON_MIME_TYPE,
      val: data
    }
  });

  return content;
}
/**
 * Append line break to a Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - Drafty document to append linebreak to.
 * @returns {Drafty} the same document as <code>content</code>.
 */
Drafty.appendLineBreak = function(content) {
  content = content || {
    txt: ""
  };
  content.fmt = content.fmt || [];
  content.fmt.push({
    at: content.txt.length,
    len: 1,
    tp: 'BR'
  });
  content.txt += " ";

  return content;
}
/**
 * Given Drafty document, convert it to HTML.
 * No attempt is made to strip pre-existing html markup.
 * This is potentially unsafe because <code>content.txt</code> may contain malicious
 * markup.
 * @memberof Tinode.Drafty
 * @static
 *
 * @param {Drafy} content - document to convert.
 *
 * @returns {string} HTML-representation of content.
 */
Drafty.UNSAFE_toHTML = function(content) {
  let {
    txt,
    fmt,
    ent
  } = content;

  const markup = [];
  if (fmt) {
    for (let i in fmt) {
      const range = fmt[i];
      const at = range.at | 0;
      let tp = range.tp;
      let data;
      if (!tp) {
        const entity = ent[range.key | 0];
        if (entity) {
          tp = entity.tp;
          data = entity.data;
        }
      }

      if (DECORATORS[tp]) {
        // Because we later sort in descending order, closing markup must come first.
        // Otherwise zero-length objects will not be represented correctly.
        markup.push({
          idx: at + range.len,
          len: -range.len,
          what: DECORATORS[tp].close(data)
        });
        markup.push({
          idx: at,
          len: range.len,
          what: DECORATORS[tp].open(data)
        });
      }
    }
  }

  markup.sort(function(a, b) {
    return b.idx == a.idx ? b.len - a.len : b.idx - a.idx; // in descending order
  });

  for (let i in markup) {
    if (markup[i].what) {
      txt = splice(txt, markup[i].idx, markup[i].what);
    }
  }

  return txt;
}

/**
 * Callback for applying custom formatting/transformation to a Drafty document.
 * Called once for each syle span.
 * @memberof Drafty
 * @static
 *
 * @callback Formatter
 * @param {string} style - style code such as "ST" or "IM".
 * @param {Object} data - entity's data
 * @param {Object} values - possibly styled subspans contained in this style span.
 * @param {number} index - of the current element among its siblings.
 */

/**
 * Transform Drafty document using custom formatting.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - content to transform.
 * @param {Formatter} formatter - callback which transforms individual elements
 * @param {Object} context - context provided to formatter as <code>this</code>.
 *
 * @return {Object} transformed object
 */
Drafty.format = function(content, formatter, context) {
  let {
    txt,
    fmt,
    ent
  } = content;

  // Assign default values.
  txt = txt || "";
  if (!Array.isArray(ent)) {
    ent = [];
  }

  if (!Array.isArray(fmt)) {
    // Handle special case when all values in fmt are 0 and fmt is skipped.
    if (ent.length == 1) {
      fmt = [{
        at: 0,
        len: 0,
        key: 0
      }];
    } else {
      return [txt];
    }
  }

  let spans = [].concat(fmt);

  // Zero values may have been stripped. Restore them.
  // Also ensure indexes and lengths are sane.
  spans.map(function(s) {
    s.at = s.at || 0;
    s.len = s.len || 0;
    if (s.len < 0) {
      s.len = 0;
    }
    if (s.at < -1) {
      s.at = -1;
    }
  });

  // Sort spans first by start index (asc) then by length (desc).
  spans.sort(function(a, b) {
    if (a.at - b.at == 0) {
      return b.len - a.len; // longer one comes first (<0)
    }
    return a.at - b.at;
  });

  // Denormalize entities into spans. Create a copy of the objects to leave
  // original Drafty object unchanged.
  spans = spans.map((s) => {
    let data;
    let tp = s.tp;
    if (!tp) {
      s.key = s.key || 0;
      if (ent[s.key]) {
        data = ent[s.key].data;
        tp = ent[s.key].tp;
      }
    }

    // Type still not defined? Hide invalid element.
    tp = tp || 'HD';

    return {
      tp: tp,
      data: data,
      at: s.at,
      len: s.len
    };
  });

  return forEach(txt, 0, txt.length, spans, formatter, context);
}

/**
 * Given Drafty document, convert it to plain text.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to convert to plain text.
 * @returns {string} plain-text representation of the drafty document.
 */
Drafty.toPlainText = function(content) {
  return typeof content == 'string' ? content : content.txt;
}

/**
 * Check if the document has no markup and no entities.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - content to check for presence of markup.
 * @returns <code>true</code> is content is plain text, <code>false</code> otherwise.
 */
Drafty.isPlainText = function(content) {
  return typeof content == 'string' || !(content.fmt || content.ent);
}

/**
 * Checks if the object represets is a valid Drafty document.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - content to check for validity.
 * @returns <code>true</code> is content is valid, <code>false</code> otherwise.
 */
Drafty.isValid = function(content) {
  if (!content) {
    return false;
  }

  const {
    txt,
    fmt,
    ent
  } = content;

  if (!txt && txt !== '' && !fmt && !ent) {
    return false;
  }

  const txt_type = typeof txt;
  if (txt_type != 'string' && txt_type != 'undefined' && txt !== null) {
    return false;
  }

  if (typeof fmt != 'undefined' && !Array.isArray(fmt) && fmt !== null) {
    return false;
  }

  if (typeof ent != 'undefined' && !Array.isArray(ent) && ent !== null) {
    return false;
  }
  return true;
}

/**
 * Check if the drafty document has attachments.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to check for attachments.
 * @returns <code>true</code> if there are attachments.
 */
Drafty.hasAttachments = function(content) {
  if (content.ent && content.ent.length > 0) {
    for (let i in content.ent) {
      if (content.ent[i] && content.ent[i].tp == 'EX') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Callback for applying custom formatting/transformation to a Drafty document.
 * Called once for each syle span.
 * @memberof Drafty
 * @static
 *
 * @callback AttachmentCallback
 * @param {Object} data attachment data
 * @param {number} index attachment's index in `content.ent`.
 */

/**
 * Enumerate attachments.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} content - document to process for attachments.
 * @param {AttachmentCallback} callback - callback to call for each attachment.
 * @param {Object} context - value of "this" for callback.
 */
Drafty.attachments = function(content, callback, context) {
  if (content.ent && content.ent.length > 0) {
    for (let i in content.ent) {
      if (content.ent[i] && content.ent[i].tp == 'EX') {
        callback.call(context, content.ent[i].data, i);
      }
    }
  }
}

/**
 * Given the entity, get URL which can be used for downloading
 * entity data.
 * @memberof Drafty
 * @static
 *
 * @param {Object} entData - entity.data to get the URl from.
 * @returns {string} URL to download entity data or <code>null</code>.
 */
Drafty.getDownloadUrl = function(entData) {
  let url = null;
  if (entData.mime != JSON_MIME_TYPE && entData.val) {
    url = base64toObjectUrl(entData.val, entData.mime, Drafty.logger);
  } else if (typeof entData.ref == 'string') {
    url = entData.ref;
  }
  return url;
}

/**
 * Check if the entity data is not ready for sending, such as being uploaded to the server.
 * @memberof Drafty
 * @static
 *
 * @param {Object} entity.data to get the URl from.
 * @returns {boolean} true if upload is in progress, false otherwise.
 */
Drafty.isProcessing = function(entData) {
  return !!entData._processing;
}

/**
 * Given the entity, get URL which can be used for previewing
 * the entity.
 * @memberof Drafty
 * @static
 *
 * @param {Object} entity.data to get the URl from.
 *
 * @returns {string} url for previewing or null if no such url is available.
 */
Drafty.getPreviewUrl = function(entData) {
  return entData.val ? base64toObjectUrl(entData.val, entData.mime, Drafty.logger) : null;
}

/**
 * Get approximate size of the entity.
 * @memberof Drafty
 * @static
 *
 * @param {Object} entData - entity.data to get the size for.
 * @returns {number} size of entity data in bytes.
 */
Drafty.getEntitySize = function(entData) {
  // Either size hint or length of value. The value is base64 encoded,
  // the actual object size is smaller than the encoded length.
  return entData.size ? entData.size : entData.val ? (entData.val.length * 0.75) | 0 : 0;
}

/**
 * Get entity mime type.
 * @memberof Drafty
 * @static
 *
 * @param {Object} entData - entity.data to get the type for.
 * @returns {string} mime type of entity.
 */
Drafty.getEntityMimeType = function(entData) {
  return entData.mime || 'text/plain';
}

/**
 * Get HTML tag for a given two-letter style name.
 * @memberof Drafty
 * @static
 *
 * @param {string} style - two-letter style, like ST or LN.
 *
 * @returns {string} HTML tag name if style is found, '_UNKN' if not found, {code: undefined} if style is falsish.
 */
Drafty.tagName = function(style) {
  return style ? (HTML_TAGS[style] ? HTML_TAGS[style].name : '_UNKN') : undefined;
}

/**
 * For a given data bundle generate an object with HTML attributes,
 * for instance, given {url: "http://www.example.com/"} return
 * {href: "http://www.example.com/"}
 * @memberof Drafty
 * @static
 *
 * @param {string} style - two-letter style to generate attributes for.
 * @param {Object} data - data bundle to convert to attributes
 *
 * @returns {Object} object with HTML attributes.
 */
Drafty.attrValue = function(style, data) {
  if (data && DECORATORS[style]) {
    return DECORATORS[style].props(data);
  }

  return undefined;
}

/**
 * Drafty MIME type.
 * @memberof Drafty
 * @static
 *
 * @returns {string} HTTP Content-Type "text/x-drafty".
 */
Drafty.getContentType = function() {
  return 'text/x-drafty';
}

/**
 * Shorten Drafty document and strip all entity data leaving just inline styles and entity references.
 * @memberof Drafty
 * @static
 *
 * @param {Drafty} original - Drafty object to shorten.
 * @param {number} length - length in characters to shorten to.
 * @returns new shortened Drafty object leaving the original intact.
 */
Drafty.preview = function(original, length) {
  if (!original || length <= 0 || typeof original != 'object') {
    return null;
  }

  const {
    txt,
    fmt,
    ent
  } = original;

  const preview = {
    txt: ''
  };

  if (typeof txt == 'string') {
    preview.txt = txt.substr(0, length);
  }
  let len = preview.txt.length;

  if (Array.isArray(fmt) && fmt.length > 0) {
    // Old key to new key entity mapping.
    const ent_refs = [];
    // Count styles which start within the new length of the text and save entity keys as a set.
    let fmt_count = 0;
    let ent_count = 0;
    fmt.forEach((st) => {
      st.at |= 0;
      if (st.at < len) {
        fmt_count++;
        if (!st.tp) {
          st.key |= 0;
          if (!ent_refs[st.key]) {
            ent_refs[st.key] = ent_count;
            ent_count++;
          }
        }
      }
    });

    if (fmt_count == 0) {
      return preview;
    }

    // Allocate space for copying styles and entities.
    preview.fmt = [];
    if (Array.isArray(ent) && ent_refs.length > 0) {
      preview.ent = [];
    }

    // Insertion point for styles.
    let fmt_idx = 0;
    fmt.forEach((st) => {
      if (st.at < len) {
        const style = {
          at: st.at,
          len: st.len | 0
        };
        if (st.tp) {
          style.tp = '' + st.tp;
        } else if (Array.isArray(ent) && ent.length > st.key && typeof ent_refs[st.key] == 'number') {
          style.key = ent_refs[st.key];
          preview.ent[style.key] = copyLight(ent[st.key]);
        } else {
          return;
        }
        preview.fmt[fmt_idx++] = style;
      }
    });
  }

  return preview;
}

// Create a copy of an entity without large data.
function copyLight(ent) {
  let result = {
    tp: ent.tp
  };
  if (ent.data && Object.entries(ent.data).length != 0) {
    const dc = {};
    ["mime", "name", "width", "height", "size"].forEach((key) => {
      const val = ent.data[key];
      if (val) {
        dc[key] = val;
      }
    });
    if (Object.entries(dc).length != 0) {
      result.data = dc;
    }
  }
  return result;
}

if (typeof module != 'undefined') {
  module.exports = Drafty;
}

},{}],6:[function(require,module,exports){
/**
 * @file Utilities for uploading and downloading files.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

let XHRProvider;

/**
 * @class LargeFileHelper - utilities for uploading and downloading files out of band.
 * Don't instantiate this class directly. Use {Tinode.getLargeFileHelper} instead.
 * @memberof Tinode
 *
 * @param {Tinode} tinode - the main Tinode object.
 * @param {string} version - protocol version, i.e. '0'.
 */
const LargeFileHelper = function(tinode, version) {
  this._tinode = tinode;
  this._version = version;

  this._apiKey = tinode._apiKey;
  this._authToken = tinode.getAuthToken();
  this._reqId = tinode.getNextUniqueId();
  this.xhr = new XHRProvider();

  // Promise
  this.toResolve = null;
  this.toReject = null;

  // Callbacks
  this.onProgress = null;
  this.onSuccess = null;
  this.onFailure = null;
}

LargeFileHelper.prototype = {
  /**
   * Start uploading the file to a non-default endpoint.
   *
   * @memberof Tinode.LargeFileHelper#
   *
   * @param {string} baseUrl alternative base URL of upload server.
   * @param {File|Blob} data to upload.
   * @param {string} avatarFor topic name if the upload represents an avatar.
   * @param {Callback} onProgress callback. Takes one {float} parameter 0..1
   * @param {Callback} onSuccess callback. Called when the file is successfully uploaded.
   * @param {Callback} onFailure callback. Called in case of a failure.
   *
   * @returns {Promise} resolved/rejected when the upload is completed/failed.
   */
  uploadWithBaseUrl: function(baseUrl, data, avatarFor, onProgress, onSuccess, onFailure) {
    if (!this._authToken) {
      throw new Error("Must authenticate first");
    }
    const instance = this;

    let url = `/v${this._version}/file/u/`;
    if (baseUrl) {
      let base = baseUrl;
      if (base.endsWith('/')) {
        // Removing trailing slash.
        base = base.slice(0, -1);
      }
      if (base.startsWith('http://') || base.startsWith('https://')) {
        url = base + url;
      } else {
        throw new Error(`Invalid base URL '${baseUrl}'`);
      }
    }
    this.xhr.open('POST', url, true);
    this.xhr.setRequestHeader('X-Tinode-APIKey', this._apiKey);
    this.xhr.setRequestHeader('X-Tinode-Auth', `Token ${this._authToken.token}`);
    const result = new Promise((resolve, reject) => {
      this.toResolve = resolve;
      this.toReject = reject;
    });

    this.onProgress = onProgress;
    this.onSuccess = onSuccess;
    this.onFailure = onFailure;

    this.xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && instance.onProgress) {
        instance.onProgress(e.loaded / e.total);
      }
    }

    this.xhr.onload = function() {
      let pkt;
      try {
        pkt = JSON.parse(this.response, jsonParseHelper);
      } catch (err) {
        instance._tinode.logger("ERROR: Invalid server response in LargeFileHelper", this.response);
        pkt = {
          ctrl: {
            code: this.status,
            text: this.statusText
          }
        };
      }

      if (this.status >= 200 && this.status < 300) {
        if (instance.toResolve) {
          instance.toResolve(pkt.ctrl.params.url);
        }
        if (instance.onSuccess) {
          instance.onSuccess(pkt.ctrl);
        }
      } else if (this.status >= 400) {
        if (instance.toReject) {
          instance.toReject(new Error(`${pkt.ctrl.text} (${pkt.ctrl.code})`));
        }
        if (instance.onFailure) {
          instance.onFailure(pkt.ctrl)
        }
      } else {
        instance._tinode.logger("ERROR: Unexpected server response status", this.status, this.response);
      }
    };

    this.xhr.onerror = function(e) {
      if (instance.toReject) {
        instance.toReject(new Error("failed"));
      }
      if (instance.onFailure) {
        instance.onFailure(null);
      }
    };

    this.xhr.onabort = function(e) {
      if (instance.toReject) {
        instance.toReject(new Error("upload cancelled by user"));
      }
      if (instance.onFailure) {
        instance.onFailure(null);
      }
    };

    try {
      const form = new FormData();
      form.append('file', data);
      form.set('id', this._reqId);
      if (avatarFor) {
        form.set('topic', avatarFor);
      }
      this.xhr.send(form);
    } catch (err) {
      if (this.toReject) {
        this.toReject(err);
      }
      if (this.onFailure) {
        this.onFailure(null);
      }
    }

    return result;
  },

  /**
   * Start uploading the file to default endpoint.
   *
   * @memberof Tinode.LargeFileHelper#
   *
   * @param {File|Blob} data to upload
   * @param {string} avatarFor topic name if the upload represents an avatar.
   * @param {Callback} onProgress callback. Takes one {float} parameter 0..1
   * @param {Callback} onSuccess callback. Called when the file is successfully uploaded.
   * @param {Callback} onFailure callback. Called in case of a failure.
   *
   * @returns {Promise} resolved/rejected when the upload is completed/failed.
   */
  upload: function(data, avatarFor, onProgress, onSuccess, onFailure) {
    const baseUrl = (this._tinode._secure ? 'https://' : 'http://') + this.tinode._host;
    return this.uploadWithBaseUrl(baseUrl, data, avatarFor, onProgress, onSuccess, onFailure);
  },

  /**
   * Download the file from a given URL using GET request. This method works with the Tinode server only.
   *
   * @memberof Tinode.LargeFileHelper#
   *
   * @param {string} relativeUrl - URL to download the file from. Must be relative url, i.e. must not contain the host.
   * @param {string=} filename - file name to use for the downloaded file.
   *
   * @returns {Promise} resolved/rejected when the download is completed/failed.
   */
  download: function(relativeUrl, filename, mimetype, onProgress, onError) {
    if (!Tinode.isRelativeURL(relativeUrl)) {
      // As a security measure refuse to download from an absolute URL.
      if (onError) {
        onError(`The URL '${relativeUrl}' must be relative, not absolute`);
      }
      return;
    }
    if (!this._authToken) {
      if (onError) {
        onError("Must authenticate first");
      }
      return;
    }
    const instance = this;
    // Get data as blob (stored by the browser as a temporary file).
    this.xhr.open('GET', relativeUrl, true);
    this.xhr.setRequestHeader('X-Tinode-APIKey', this._apiKey);
    this.xhr.setRequestHeader('X-Tinode-Auth', 'Token ' + this._authToken.token);
    this.xhr.responseType = 'blob';

    this.onProgress = onProgress;
    this.xhr.onprogress = function(e) {
      if (instance.onProgress) {
        // Passing e.loaded instead of e.loaded/e.total because e.total
        // is always 0 with gzip compression enabled by the server.
        instance.onProgress(e.loaded);
      }
    };

    const result = new Promise((resolve, reject) => {
      this.toResolve = resolve;
      this.toReject = reject;
    });

    // The blob needs to be saved as file. There is no known way to
    // save the blob as file other than to fake a click on an <a href... download=...>.
    this.xhr.onload = function() {
      if (this.status == 200) {
        const link = document.createElement('a');
        // URL.createObjectURL is not available in non-browser environment. This call will fail.
        link.href = window.URL.createObjectURL(new Blob([this.response], {
          type: mimetype
        }));
        link.style.display = 'none';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
        if (instance.toResolve) {
          instance.toResolve();
        }
      } else if (this.status >= 400 && instance.toReject) {
        // The this.responseText is undefined, must use this.response which is a blob.
        // Need to convert this.response to JSON. The blob can only be accessed by the
        // FileReader.
        const reader = new FileReader();
        reader.onload = function() {
          try {
            const pkt = JSON.parse(this.result, jsonParseHelper);
            instance.toReject(new Error(`${pkt.ctrl.text} (${pkt.ctrl.code})`));
          } catch (err) {
            instance._tinode.logger("ERROR: Invalid server response in LargeFileHelper", this.result);
            instance.toReject(err);
          }
        };
        reader.readAsText(this.response);
      }
    };

    this.xhr.onerror = function(e) {
      if (instance.toReject) {
        instance.toReject(new Error("failed"));
      }
    };

    this.xhr.onabort = function() {
      if (instance.toReject) {
        instance.toReject(null);
      }
    };

    try {
      this.xhr.send();
    } catch (err) {
      if (this.toReject) {
        this.toReject(err);
      }
    }

    return result;
  },

  /**
   * Try to cancel an ongoing upload or download.
   * @memberof Tinode.LargeFileHelper#
   */
  cancel: function() {
    if (this.xhr && this.xhr.readyState < 4) {
      this.xhr.abort();
    }
  },

  /**
   * Get unique id of this request.
   * @memberof Tinode.LargeFileHelper#
   *
   * @returns {string} unique id
   */
  getId: function() {
    return this._reqId;
  }
};

/**
 * To use LargeFileHelper in a non browser context, supply XMLHttpRequest provider.
 * @static
 * @memberof LargeFileHelper
 * @param xhrProvider XMLHttpRequest provider, e.g. for node <code>require('xhr')</code>.
 */
LargeFileHelper.setNetworkProvider = function(xhrProvider) {
  XHRProvider = xhrProvider;
};

if (typeof module != 'undefined') {
  module.exports = LargeFileHelper;
}

},{}],7:[function(require,module,exports){
/**
 * @file Helper class for constructing {@link Tinode.GetQuery}.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

/**
 * Helper class for constructing {@link Tinode.GetQuery}.
 *
 * @class MetaGetBuilder
 * @memberof Tinode
 *
 * @param {Tinode.Topic} parent topic which instantiated this builder.
 */
const MetaGetBuilder = function(parent) {
  this.topic = parent;
  this.what = {};
}

MetaGetBuilder.prototype = {

  // Get timestamp of the most recent desc update.
  _get_desc_ims: function() {
    return this.topic.updated;
  },

  // Get timestamp of the most recent subs update.
  _get_subs_ims: function() {
    if (this.topic.isP2PType()) {
      return this._get_desc_ims();
    }
    return this.topic._lastSubsUpdate;
  },

  /**
   * Add query parameters to fetch messages within explicit limits.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} since - messages newer than this (inclusive);
   * @param {number=} before - older than this (exclusive)
   * @param {number=} limit - number of messages to fetch
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withData: function(since, before, limit) {
    this.what['data'] = {
      since: since,
      before: before,
      limit: limit
    };
    return this;
  },

  /**
   * Add query parameters to fetch messages newer than the latest saved message.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} limit - number of messages to fetch
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withLaterData: function(limit) {
    return this.withData(this.topic._maxSeq > 0 ? this.topic._maxSeq + 1 : undefined, undefined, limit);
  },

  /**
   * Add query parameters to fetch messages older than the earliest saved message.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} limit - maximum number of messages to fetch.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withEarlierData: function(limit) {
    return this.withData(undefined, this.topic._minSeq > 0 ? this.topic._minSeq : undefined, limit);
  },

  /**
   * Add query parameters to fetch topic description if it's newer than the given timestamp.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {Date=} ims - fetch messages newer than this timestamp.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withDesc: function(ims) {
    this.what['desc'] = {
      ims: ims
    };
    return this;
  },

  /**
   * Add query parameters to fetch topic description if it's newer than the last update.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withLaterDesc: function() {
    return this.withDesc(this._get_desc_ims());
  },

  /**
   * Add query parameters to fetch subscriptions.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {Date=} ims - fetch subscriptions modified more recently than this timestamp
   * @param {number=} limit - maximum number of subscriptions to fetch.
   * @param {string=} userOrTopic - user ID or topic name to fetch for fetching one subscription.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withSub: function(ims, limit, userOrTopic) {
    const opts = {
      ims: ims,
      limit: limit
    };
    if (this.topic.getType() == 'me') {
      opts.topic = userOrTopic;
    } else {
      opts.user = userOrTopic;
    }
    this.what['sub'] = opts;
    return this;
  },

  /**
   * Add query parameters to fetch a single subscription.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {Date=} ims - fetch subscriptions modified more recently than this timestamp
   * @param {string=} userOrTopic - user ID or topic name to fetch for fetching one subscription.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withOneSub: function(ims, userOrTopic) {
    return this.withSub(ims, undefined, userOrTopic);
  },

  /**
   * Add query parameters to fetch a single subscription if it's been updated since the last update.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {string=} userOrTopic - user ID or topic name to fetch for fetching one subscription.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withLaterOneSub: function(userOrTopic) {
    return this.withOneSub(this.topic._lastSubsUpdate, userOrTopic);
  },

  /**
   * Add query parameters to fetch subscriptions updated since the last update.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} limit - maximum number of subscriptions to fetch.
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withLaterSub: function(limit) {
    return this.withSub(this._get_subs_ims(), limit);
  },

  /**
   * Add query parameters to fetch topic tags.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withTags: function() {
    this.what['tags'] = true;
    return this;
  },

  /**
   * Add query parameters to fetch user's credentials. <code>'me'</code> topic only.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withCred: function() {
    if (this.topic.getType() == 'me') {
      this.what['cred'] = true;
    } else {
      this.topic._tinode.logger("ERROR: Invalid topic type for MetaGetBuilder:withCreds", this.topic.getType());
    }
    return this;
  },

  /**
   * Add query parameters to fetch deleted messages within explicit limits. Any/all parameters can be null.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} since - ids of messages deleted since this 'del' id (inclusive)
   * @param {number=} limit - number of deleted message ids to fetch
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withDel: function(since, limit) {
    if (since || limit) {
      this.what['del'] = {
        since: since,
        limit: limit
      };
    }
    return this;
  },

  /**
   * Add query parameters to fetch messages deleted after the saved <code>'del'</code> id.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @param {number=} limit - number of deleted message ids to fetch
   *
   * @returns {Tinode.MetaGetBuilder} <code>this</code> object.
   */
  withLaterDel: function(limit) {
    // Specify 'since' only if we have already received some messages. If
    // we have no locally cached messages then we don't care if any messages were deleted.
    return this.withDel(this.topic._maxSeq > 0 ? this.topic._maxDel + 1 : undefined, limit);
  },

  /**
   * Construct parameters.
   * @memberof Tinode.MetaGetBuilder#
   *
   * @returns {Tinode.GetQuery} Get query
   */
  build: function() {
    const what = [];
    const instance = this;
    let params = {};
    ['data', 'sub', 'desc', 'tags', 'cred', 'del'].map(function(key) {
      if (instance.what.hasOwnProperty(key)) {
        what.push(key);
        if (Object.getOwnPropertyNames(instance.what[key]).length > 0) {
          params[key] = instance.what[key];
        }
      }
    });
    if (what.length > 0) {
      params.what = what.join(' ');
    } else {
      params = undefined;
    }
    return params;
  }
};

if (typeof module != 'undefined') {
  module.exports = MetaGetBuilder;
}

},{}],8:[function(require,module,exports){
(function (global){(function (){
/**
 * @file SDK to connect to Tinode chat server.
 * See <a href="https://github.com/tinode/webapp">
 * https://github.com/tinode/webapp</a> for real-life usage.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 *
 * @example
 * <head>
 * <script src=".../tinode.js"></script>
 * </head>
 *
 * <body>
 *  ...
 * <script>
 *  // Instantiate tinode.
 *  const tinode = new Tinode(APP_NAME, HOST, API_KEY, null, true);
 *  tinode.enableLogging(true);
 *  // Add logic to handle disconnects.
 *  tinode.onDisconnect = function(err) { ... };
 *  // Connect to the server.
 *  tinode.connect().then(() => {
 *    // Connected. Login now.
 *    return tinode.loginBasic(login, password);
 *  }).then((ctrl) => {
 *    // Logged in fine, attach callbacks, subscribe to 'me'.
 *    const me = tinode.getMeTopic();
 *    me.onMetaDesc = function(meta) { ... };
 *    // Subscribe, fetch topic description and the list of contacts.
 *    me.subscribe({get: {desc: {}, sub: {}});
 *  }).catch((err) => {
 *    // Login or subscription failed, do something.
 *    ...
 *  });
 *  ...
 * </script>
 * </body>
 */
'use strict';

// NOTE TO DEVELOPERS:
// Localizable strings should be double quoted "строка на другом языке",
// non-localizable strings should be single quoted 'non-localized'.

// Module imports Node.js style.
if (typeof require != 'function') {
  throw new Error("Unable to load modules: require() is not available.");
}

const AccessMode = require('./access-mode.js');
const CBuffer = require('./cbuffer.js');
const Connection = require('./connection.js');
const DBCache = require('./db.js');
const Drafty = require('./drafty.js');
const LargeFileHelper = require('./large-file.js');
const MetaGetBuilder = require('./meta-builder.js');

const package_version = require('../version.json').version;

let WebSocketProvider;
if (typeof WebSocket != 'undefined') {
  WebSocketProvider = WebSocket;
}

let XHRProvider;
if (typeof XMLHttpRequest != 'undefined') {
  XHRProvider = XMLHttpRequest;
}

initForNonBrowserApp();

// Global constants
const PROTOCOL_VERSION = '0'; // Major component of the version, e.g. '0' in '0.17.1'.
const VERSION = package_version || '0.17';
const LIBRARY = 'tinodejs/' + VERSION;

const TOPIC_NEW = 'new';
const TOPIC_NEW_CHAN = 'nch';
const TOPIC_ME = 'me';
const TOPIC_FND = 'fnd';
const TOPIC_SYS = 'sys';
const TOPIC_CHAN = 'chn';
const USER_NEW = 'new';

// Starting value of a locally-generated seqId used for pending messages.
const LOCAL_SEQID = 0xFFFFFFF;

const MESSAGE_STATUS_NONE = 0; // Status not assigned.
const MESSAGE_STATUS_QUEUED = 1; // Local ID assigned, in progress to be sent.
const MESSAGE_STATUS_SENDING = 2; // Transmission started.
const MESSAGE_STATUS_FAILED = 3; // At least one attempt was made to send the message.
const MESSAGE_STATUS_SENT = 4; // Delivered to the server.
const MESSAGE_STATUS_RECEIVED = 5; // Received by the client.
const MESSAGE_STATUS_READ = 6; // Read by the user.
const MESSAGE_STATUS_TO_ME = 7; // Message from another user.
const MESSAGE_STATUS_DEL_RANGE = 8; // Message is a deleted range.

// Reject unresolved futures after this many milliseconds.
const EXPIRE_PROMISES_TIMEOUT = 5000;
// Periodicity of garbage collection of unresolved futures.
const EXPIRE_PROMISES_PERIOD = 1000;

// Default number of messages to pull into memory from persistent cache.
const DEFAULT_MESSAGES_PAGE = 24;

// Utility functions

// Polyfill for non-browser context, e.g. NodeJs.
function initForNonBrowserApp() {
  // Tinode requirement in native mode because react native doesn't provide Base64 method
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  if (typeof btoa == 'undefined') {
    global.btoa = function(input = '') {
      let str = input;
      let output = '';

      for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {

        charCode = str.charCodeAt(i += 3 / 4);

        if (charCode > 0xFF) {
          throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
      }

      return output;
    };
  }

  if (typeof atob == 'undefined') {
    global.atob = function(input = '') {
      let str = input.replace(/=+$/, '');
      let output = '';

      if (str.length % 4 == 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
      }
      for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++);

        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
          bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
      ) {
        buffer = chars.indexOf(buffer);
      }

      return output;
    };
  }

  if (typeof window == 'undefined') {
    global.window = {
      WebSocket: WebSocketProvider,
      XMLHttpRequest: XHRProvider,
      URL: {
        createObjectURL: function() {
          throw new Error("Unable to use URL.createObjectURL in a non-browser application");
        }
      }
    }
  }

  Connection.setNetworkProviders(WebSocketProvider, XHRProvider);
  LargeFileHelper.setNetworkProvider(XHRProvider);
}

// Detect find most useful network transport.
function detectTransport() {
  if (typeof window == 'object') {
    if (window['WebSocket']) {
      return 'ws';
    } else if (window['XMLHttpRequest']) {
      // The browser or node has no websockets, using long polling.
      return 'lp';
    }
  }
  return null;
}

// Checks if 'd' is a valid non-zero date;
function isValidDate(d) {
  return (d instanceof Date) && !isNaN(d) && (d.getTime() != 0);
}

// RFC3339 formater of Date
function rfc3339DateString(d) {
  if (!isValidDate(d)) {
    return undefined;
  }

  const pad = function(val, sp) {
    sp = sp || 2;
    return '0'.repeat(sp - ('' + val).length) + val;
  };

  const millis = d.getUTCMilliseconds();
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) +
    (millis ? '.' + pad(millis, 3) : '') + 'Z';
}

// btoa replacement. Stock btoa fails on on non-Latin1 strings.
function b64EncodeUnicode(str) {
  // The encodeURIComponent percent-encodes UTF-8 string,
  // then the percent encoding is converted into raw bytes which
  // can be fed into btoa.
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
}

// Recursively merge src's own properties to dst.
// Ignore properties where ignore[property] is true.
// Array and Date objects are shallow-copied.
function mergeObj(dst, src, ignore) {
  if (typeof src != 'object') {
    if (src === Tinode.DEL_CHAR) {
      return undefined;
    }
    if (src === undefined) {
      return dst;
    }
    return src;
  }
  // JS is crazy: typeof null is 'object'.
  if (src === null) {
    return src;
  }

  // Handle Date
  if (src instanceof Date && !isNaN(src)) {
    return (!dst || !(dst instanceof Date) || isNaN(dst) || dst < src) ? src : dst;
  }

  // Access mode
  if (src instanceof AccessMode) {
    return new AccessMode(src);
  }

  // Handle Array
  if (src instanceof Array) {
    return src;
  }

  if (!dst || dst === Tinode.DEL_CHAR) {
    dst = src.constructor();
  }

  for (let prop in src) {
    if (src.hasOwnProperty(prop) &&
      (!ignore || !ignore[prop]) &&
      (prop != '_noForwarding')) {

      dst[prop] = mergeObj(dst[prop], src[prop]);
    }
  }
  return dst;
}

// Update object stored in a cache. Returns updated value.
function mergeToCache(cache, key, newval, ignore) {
  cache[key] = mergeObj(cache[key], newval, ignore);
  return cache[key];
}

function stringToDate(obj) {
  if (typeof obj.created == 'string') {
    obj.created = new Date(obj.created);
  }
  if (typeof obj.updated == 'string') {
    obj.updated = new Date(obj.updated);
  }
  if (typeof obj.touched == 'string') {
    obj.touched = new Date(obj.touched);
  }
}

// JSON stringify helper - pre-processor for JSON.stringify
function jsonBuildHelper(key, val) {
  if (val instanceof Date) {
    // Convert javascript Date objects to rfc3339 strings
    val = rfc3339DateString(val);
  } else if (val instanceof AccessMode) {
    val = val.jsonHelper();
  } else if (val === undefined || val === null || val === false ||
    (Array.isArray(val) && val.length == 0) ||
    ((typeof val == 'object') && (Object.keys(val).length == 0))) {
    // strip out empty elements while serializing objects to JSON
    return undefined;
  }

  return val;
};

// Strips all values from an object of they evaluate to false or if their name starts with '_'.
// Used on all outgoing object before serialization to string.
function simplify(obj) {
  Object.keys(obj).forEach((key) => {
    if (key[0] == '_') {
      // Strip fields like "obj._key".
      delete obj[key];
    } else if (!obj[key]) {
      // Strip fields which evaluate to false.
      delete obj[key];
    } else if (Array.isArray(obj[key]) && obj[key].length == 0) {
      // Strip empty arrays.
      delete obj[key];
    } else if (!obj[key]) {
      // Strip fields which evaluate to false.
      delete obj[key];
    } else if (obj[key] instanceof Date) {
      // Strip invalid or zero date.
      if (!isValidDate(obj[key])) {
        delete obj[key];
      }
    } else if (typeof obj[key] == 'object') {
      simplify(obj[key]);
      // Strip empty objects.
      if (Object.getOwnPropertyNames(obj[key]).length == 0) {
        delete obj[key];
      }
    }
  });
  return obj;
};

// Trim whitespace, strip empty and duplicate elements elements.
// If the result is an empty array, add a single element "\u2421" (Unicode Del character).
function normalizeArray(arr) {
  let out = [];
  if (Array.isArray(arr)) {
    // Trim, throw away very short and empty tags.
    for (let i = 0, l = arr.length; i < l; i++) {
      let t = arr[i];
      if (t) {
        t = t.trim().toLowerCase();
        if (t.length > 1) {
          out.push(t);
        }
      }
    }
    out.sort().filter(function(item, pos, ary) {
      return !pos || item != ary[pos - 1];
    });
  }
  if (out.length == 0) {
    // Add single tag with a Unicode Del character, otherwise an ampty array
    // is ambiguos. The Del tag will be stripped by the server.
    out.push(Tinode.DEL_CHAR);
  }
  return out;
}

// Attempt to convert date strings to objects.
function jsonParseHelper(key, val) {
  // Convert string timestamps with optional milliseconds to Date
  // 2015-09-02T01:45:43[.123]Z
  if (key === 'ts' && typeof val === 'string' &&
    val.length >= 20 && val.length <= 24) {
    const date = new Date(val);
    if (!isNaN(date)) {
      return date;
    }
  } else if (key === 'acs' && typeof val === 'object') {
    return new AccessMode(val);
  }
  return val;
};

// Trims very long strings (encoded images) to make logged packets more readable.
function jsonLoggerHelper(key, val) {
  if (typeof val == 'string' && val.length > 128) {
    return '<' + val.length + ', bytes: ' + val.substring(0, 12) + '...' + val.substring(val.length - 12) + '>';
  }
  return jsonBuildHelper(key, val);
};

// Parse browser user agent to extract browser name and version.
function getBrowserInfo(ua, product) {
  ua = ua || '';
  let reactnative = '';
  // Check if this is a ReactNative app.
  if (/reactnative/i.test(product)) {
    reactnative = 'ReactNative; ';
  }
  let result;
  // Remove useless string.
  ua = ua.replace(' (KHTML, like Gecko)', '');
  // Test for WebKit-based browser.
  let m = ua.match(/(AppleWebKit\/[.\d]+)/i);
  if (m) {
    // List of common strings, from more useful to less useful.
    // All unknown strings get the highest (-1) priority.
    const priority = ['edg', 'chrome', 'safari', 'mobile', 'version'];
    let tmp = ua.substr(m.index + m[0].length).split(' ');
    let tokens = [];
    let version; // 1.0 in Version/1.0 or undefined;
    // Split string like 'Name/0.0.0' into ['Name', '0.0.0', 3] where the last element is the priority.
    for (let i = 0; i < tmp.length; i++) {
      let m2 = /([\w.]+)[\/]([\.\d]+)/.exec(tmp[i]);
      if (m2) {
        // Unknown values are highest priority (-1).
        tokens.push([m2[1], m2[2], priority.findIndex((e) => {
          return m2[1].toLowerCase().startsWith(e);
        })]);
        if (m2[1] == 'Version') {
          version = m2[2];
        }
      }
    }
    // Sort by priority: more interesting is earlier than less interesting.
    tokens.sort((a, b) => {
      return a[2] - b[2];
    });
    if (tokens.length > 0) {
      // Return the least common browser string and version.
      if (tokens[0][0].toLowerCase().startsWith('edg')) {
        tokens[0][0] = 'Edge';
      } else if (tokens[0][0] == 'OPR') {
        tokens[0][0] = 'Opera';
      } else if (tokens[0][0] == 'Safari' && version) {
        tokens[0][1] = version;
      }
      result = tokens[0][0] + '/' + tokens[0][1];
    } else {
      // Failed to ID the browser. Return the webkit version.
      result = m[1];
    }
  } else if (/firefox/i.test(ua)) {
    m = /Firefox\/([.\d]+)/g.exec(ua);
    if (m) {
      result = 'Firefox/' + m[1];
    } else {
      result = 'Firefox/?';
    }
  } else {
    // Neither AppleWebKit nor Firefox. Try the last resort.
    m = /([\w.]+)\/([.\d]+)/.exec(ua);
    if (m) {
      result = m[1] + '/' + m[2];
    } else {
      m = ua.split(' ');
      result = m[0];
    }
  }

  // Shorten the version to one dot 'a.bb.ccc.d -> a.bb' at most.
  m = result.split('/');
  if (m.length > 1) {
    const v = m[1].split('.');
    const minor = v[1] ? '.' + v[1].substr(0, 2) : '';
    result = `${m[0]}/${v[0]}${minor}`;
  }
  return reactnative + result;
}

/**
 * @class Tinode
 *
 * @param {Object} config - configuration parameters.
 * @param {string} config.appName - Name of the calling application to be reported in the User Agent.
 * @param {string} config.host - Host name and optional port number to connect to.
 * @param {string} config.apiKey - API key generated by <code>keygen</code>.
 * @param {string} config.transport - See {@link Tinode.Connection#transport}.
 * @param {boolean} config.secure - Use Secure WebSocket if <code>true</code>.
 * @param {string} config.platform - Optional platform identifier, one of <code>"ios"</code>, <code>"web"</code>, <code>"android"</code>.
 * @param {boolen} config.persist - Use IndexedDB persistent storage.
 * @param {function} onComplete - callback to call when initialization is completed.
 */
var Tinode = function(config, onComplete) {
  this._host = config.host;
  this._secure = config.secure;

  // Client-provided application name, format <Name>/<version number>
  this._appName = config.appName || "Undefined";

  // API Key.
  this._apiKey = config.apiKey;

  // Name and version of the browser.
  this._browser = '';
  this._platform = config.platform || 'web';
  // Hardware
  this._hwos = 'undefined';
  this._humanLanguage = 'xx';
  // Underlying OS.
  if (typeof navigator != 'undefined') {
    this._browser = getBrowserInfo(navigator.userAgent, navigator.product);
    this._hwos = navigator.platform;
    // This is the default language. It could be changed by client.
    this._humanLanguage = navigator.language || 'en-US';
  }
  // Logging to console enabled
  this._loggingEnabled = false;
  // When logging, trip long strings (base64-encoded images) for readability
  this._trimLongStrings = false;
  // UID of the currently authenticated user.
  this._myUID = null;
  // Status of connection: authenticated or not.
  this._authenticated = false;
  // Login used in the last successful basic authentication
  this._login = null;
  // Token which can be used for login instead of login/password.
  this._authToken = null;
  // Counter of received packets
  this._inPacketCount = 0;
  // Counter for generating unique message IDs
  this._messageId = Math.floor((Math.random() * 0xFFFF) + 0xFFFF);
  // Information about the server, if connected
  this._serverInfo = null;
  // Push notification token. Called deviceToken for consistency with the Android SDK.
  this._deviceToken = null;

  // Cache of pending promises by message id.
  this._pendingPromises = {};
  // The Timeout object returned by the reject expired promises setInterval.
  this._expirePromises = null;

  // Console logger. Babel somehow fails to parse '...rest' parameter.
  this.logger = (str, ...args) => {
    if (this._loggingEnabled) {
      const d = new Date()
      const dateString = ('0' + d.getUTCHours()).slice(-2) + ':' +
        ('0' + d.getUTCMinutes()).slice(-2) + ':' +
        ('0' + d.getUTCSeconds()).slice(-2) + '.' +
        ('00' + d.getUTCMilliseconds()).slice(-3);

      console.log('[' + dateString + ']', str, args.join(' '));
    }
  }

  Connection.logger = this.logger;
  Drafty.logger = this.logger;

  // WebSocket or long polling network connection.
  if (config.transport != 'lp' && config.transport != 'ws') {
    config.transport = detectTransport();
  }
  this._connection = new Connection(config, PROTOCOL_VERSION, /* autoreconnect */ true);

  // Tinode's cache of objects
  this._cache = {};

  const cachePut = this.cachePut = (type, name, obj) => {
    this._cache[type + ':' + name] = obj;
  }

  const cacheGet = this.cacheGet = (type, name) => {
    return this._cache[type + ':' + name];
  }

  const cacheDel = this.cacheDel = (type, name) => {
    delete this._cache[type + ':' + name];
  }
  // Enumerate all items in cache, call func for each item.
  // Enumeration stops if func returns true.
  const cacheMap = this.cacheMap = (type, func, context) => {
    const key = type ? type + ':' : undefined;
    for (let idx in this._cache) {
      if (!key || idx.indexOf(key) == 0) {
        if (func.call(context, this._cache[idx], idx)) {
          break;
        }
      }
    }
  }

  // Make limited cache management available to topic.
  // Caching user.public only. Everything else is per-topic.
  this.attachCacheToTopic = (topic) => {
    topic._tinode = this;

    topic._cacheGetUser = (uid) => {
      const pub = cacheGet('user', uid);
      if (pub) {
        return {
          user: uid,
          public: mergeObj({}, pub)
        };
      }
      return undefined;
    };
    topic._cachePutUser = (uid, user) => {
      return cachePut('user', uid, mergeObj({}, user.public));
    };
    topic._cacheDelUser = (uid) => {
      return cacheDel('user', uid);
    };
    topic._cachePutSelf = () => {
      return cachePut('topic', topic.name, topic);
    }
    topic._cacheDelSelf = () => {
      return cacheDel('topic', topic.name);
    }
  }

  // Use indexDB for caching topics and messages.
  this._persist = config.persist;
  // Initialize object regardless. It simplifies the code.
  this._db = DBCache((err) => {
    this.logger("DB", err);
  }, this.logger);

  if (this._persist) {
    // Create the persistent cache.
    // Store promises to be resolved when messages load into memory.
    const msgs = [];
    this._db.initDatabase().then(() => {
      // First load topics into memory.
      return this._db.mapTopics((data) => {
        let topic = this.cacheGet('topic', data.name);
        if (topic) {
          return;
        }
        if (data.name == TOPIC_ME) {
          topic = new TopicMe();
        } else if (data.name == TOPIC_FND) {
          topic = new TopicFnd();
        } else {
          topic = new Topic(data.name);
        }

        this._db.deserializeTopic(topic, data);
        this.attachCacheToTopic(topic);
        topic._cachePutSelf();
        // Request to load messages and save the promise.
        msgs.push(topic._loadMessages(this._db));
      });
    }).then(() => {
      // Then load users.
      return this._db.mapUsers((data) => {
        return cachePut('user', data.uid, mergeObj({}, data.public));
      });
    }).then(() => {
      // Now wait for all messages to finish loading.
      return Promise.all(msgs);
    }).then(() => {
      if (onComplete) {
        onComplete();
      }
      this.logger("Persistent cache initialized.");
    });
  } else {
    this._db.deleteDatabase().then(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }

  // Resolve or reject a pending promise.
  // Unresolved promises are stored in _pendingPromises.
  const execPromise = (id, code, onOK, errorText) => {
    const callbacks = this._pendingPromises[id];
    if (callbacks) {
      delete this._pendingPromises[id];
      if (code >= 200 && code < 400) {
        if (callbacks.resolve) {
          callbacks.resolve(onOK);
        }
      } else if (callbacks.reject) {
        callbacks.reject(new Error(`${errorText} (${code})`));
      }
    }
  }

  // Generator of default promises for sent packets.
  const makePromise = (id) => {
    let promise = null;
    if (id) {
      promise = new Promise((resolve, reject) => {
        // Stored callbacks will be called when the response packet with this Id arrives
        this._pendingPromises[id] = {
          'resolve': resolve,
          'reject': reject,
          'ts': new Date()
        };
      })
    }
    return promise;
  }

  // Generates unique message IDs
  const getNextUniqueId = this.getNextUniqueId = () => {
    return (this._messageId != 0) ? '' + this._messageId++ : undefined;
  }

  // Get User Agent string
  const getUserAgent = () => {
    return this._appName + ' (' + (this._browser ? this._browser + '; ' : '') + this._hwos + '); ' + LIBRARY;
  }

  // Generator of packets stubs
  this.initPacket = (type, topic) => {
    switch (type) {
      case 'hi':
        return {
          'hi': {
            'id': getNextUniqueId(),
            'ver': VERSION,
            'ua': getUserAgent(),
            'dev': this._deviceToken,
            'lang': this._humanLanguage,
            'platf': this._platform
          }
        };

      case 'acc':
        return {
          'acc': {
            'id': getNextUniqueId(),
            'user': null,
            'scheme': null,
            'secret': null,
            'login': false,
            'tags': null,
            'desc': {},
            'cred': {}
          }
        };

      case 'login':
        return {
          'login': {
            'id': getNextUniqueId(),
            'scheme': null,
            'secret': null
          }
        };

      case 'sub':
        return {
          'sub': {
            'id': getNextUniqueId(),
            'topic': topic,
            'set': {},
            'get': {}
          }
        };

      case 'leave':
        return {
          'leave': {
            'id': getNextUniqueId(),
            'topic': topic,
            'unsub': false
          }
        };

      case 'pub':
        return {
          'pub': {
            'id': getNextUniqueId(),
            'topic': topic,
            'noecho': false,
            'head': null,
            'content': {}
          }
        };

      case 'get':
        return {
          'get': {
            'id': getNextUniqueId(),
            'topic': topic,
            'what': null, // data, sub, desc, space separated list; unknown strings are ignored
            'desc': {},
            'sub': {},
            'data': {}
          }
        };

      case 'set':
        return {
          'set': {
            'id': getNextUniqueId(),
            'topic': topic,
            'desc': {},
            'sub': {},
            'tags': []
          }
        };

      case 'del':
        return {
          'del': {
            'id': getNextUniqueId(),
            'topic': topic,
            'what': null,
            'delseq': null,
            'user': null,
            'hard': false
          }
        };

      case 'note':
        return {
          'note': {
            // no id by design
            'topic': topic,
            'what': null, // one of "recv", "read", "kp"
            'seq': undefined // the server-side message id aknowledged as received or read
          }
        };

      default:
        throw new Error(`Unknown packet type requested: ${type}`);
    }
  }

  // Send a packet. If packet id is provided return a promise.
  this.send = (pkt, id) => {
    let promise;
    if (id) {
      promise = makePromise(id);
    }
    pkt = simplify(pkt);
    let msg = JSON.stringify(pkt);
    this.logger("out: " + (this._trimLongStrings ? JSON.stringify(pkt, jsonLoggerHelper) : msg));
    try {
      this._connection.sendText(msg);
    } catch (err) {
      // If sendText throws, wrap the error in a promise or rethrow.
      if (id) {
        execPromise(id, Connection.NETWORK_ERROR, null, err.message);
      } else {
        throw err;
      }
    }
    return promise;
  }

  // On successful login save server-provided data.
  this.loginSuccessful = (ctrl) => {
    if (!ctrl.params || !ctrl.params.user) {
      return ctrl;
    }
    // This is a response to a successful login,
    // extract UID and security token, save it in Tinode module
    this._myUID = ctrl.params.user;
    this._authenticated = (ctrl && ctrl.code >= 200 && ctrl.code < 300);
    if (ctrl.params && ctrl.params.token && ctrl.params.expires) {
      this._authToken = {
        token: ctrl.params.token,
        expires: new Date(ctrl.params.expires)
      };
    } else {
      this._authToken = null;
    }

    if (this.onLogin) {
      this.onLogin(ctrl.code, ctrl.text);
    }

    return ctrl;
  }

  // The main message dispatcher.
  this._connection.onMessage = (data) => {
    // Skip empty response. This happens when LP times out.
    if (!data) return;

    this._inPacketCount++;

    // Send raw message to listener
    if (this.onRawMessage) {
      this.onRawMessage(data);
    }

    if (data === '0') {
      // Server response to a network probe.
      if (this.onNetworkProbe) {
        this.onNetworkProbe();
      }
      // No processing is necessary.
      return;
    }

    let pkt = JSON.parse(data, jsonParseHelper);
    if (!pkt) {
      this.logger("in: " + data);
      this.logger("ERROR: failed to parse data");
    } else {
      this.logger("in: " + (this._trimLongStrings ? JSON.stringify(pkt, jsonLoggerHelper) : data));

      // Send complete packet to listener
      if (this.onMessage) {
        this.onMessage(pkt);
      }

      if (pkt.ctrl) {
        // Handling {ctrl} message
        if (this.onCtrlMessage) {
          this.onCtrlMessage(pkt.ctrl);
        }

        // Resolve or reject a pending promise, if any
        if (pkt.ctrl.id) {
          execPromise(pkt.ctrl.id, pkt.ctrl.code, pkt.ctrl, pkt.ctrl.text);
        }
        setTimeout(() => {
          if (pkt.ctrl.code == 205 && pkt.ctrl.text == 'evicted') {
            // User evicted from topic.
            const topic = cacheGet('topic', pkt.ctrl.topic);
            if (topic) {
              topic._resetSub();
              if (pkt.ctrl.params && pkt.ctrl.params.unsub) {
                topic._gone();
              }
            }
          } else if (pkt.ctrl.code < 300 && pkt.ctrl.params) {
            if (pkt.ctrl.params.what == 'data') {
              // code=208, all messages received: "params":{"count":11,"what":"data"},
              const topic = cacheGet('topic', pkt.ctrl.topic);
              if (topic) {
                topic._allMessagesReceived(pkt.ctrl.params.count);
              }
            } else if (pkt.ctrl.params.what == 'sub') {
              // code=204, the topic has no (refreshed) subscriptions.
              const topic = cacheGet('topic', pkt.ctrl.topic);
              if (topic) {
                // Trigger topic.onSubsUpdated.
                topic._processMetaSub([]);
              }
            }
          }
        }, 0);
      } else {
        setTimeout(() => {
          if (pkt.meta) {
            // Handling a {meta} message.

            // Preferred API: Route meta to topic, if one is registered
            const topic = cacheGet('topic', pkt.meta.topic);
            if (topic) {
              topic._routeMeta(pkt.meta);
            }

            if (pkt.meta.id) {
              execPromise(pkt.meta.id, 200, pkt.meta, 'META');
            }

            // Secondary API: callback
            if (this.onMetaMessage) {
              this.onMetaMessage(pkt.meta);
            }
          } else if (pkt.data) {
            // Handling {data} message

            // Preferred API: Route data to topic, if one is registered
            const topic = cacheGet('topic', pkt.data.topic);
            if (topic) {
              topic._routeData(pkt.data);
            }

            // Secondary API: Call callback
            if (this.onDataMessage) {
              this.onDataMessage(pkt.data);
            }
          } else if (pkt.pres) {
            // Handling {pres} message

            // Preferred API: Route presence to topic, if one is registered
            const topic = cacheGet('topic', pkt.pres.topic);
            if (topic) {
              topic._routePres(pkt.pres);
            }

            // Secondary API - callback
            if (this.onPresMessage) {
              this.onPresMessage(pkt.pres);
            }
          } else if (pkt.info) {
            // {info} message - read/received notifications and key presses

            // Preferred API: Route {info}} to topic, if one is registered
            const topic = cacheGet('topic', pkt.info.topic);
            if (topic) {
              topic._routeInfo(pkt.info);
            }

            // Secondary API - callback
            if (this.onInfoMessage) {
              this.onInfoMessage(pkt.info);
            }
          } else {
            this.logger("ERROR: Unknown packet received.");
          }
        }, 0);
      }
    }
  }

  // Ready to start sending.
  this._connection.onOpen = () => {
    if (!this._expirePromises) {
      // Reject promises which have not been resolved for too long.
      this._expirePromises = setInterval(() => {
        const err = new Error("Timeout (504)");
        const expires = new Date(new Date().getTime() - EXPIRE_PROMISES_TIMEOUT);
        for (let id in this._pendingPromises) {
          let callbacks = this._pendingPromises[id];
          if (callbacks && callbacks.ts < expires) {
            this.logger("Promise expired", id);
            delete this._pendingPromises[id];
            if (callbacks.reject) {
              callbacks.reject(err);
            }
          }
        }
      }, EXPIRE_PROMISES_PERIOD);
    }
    this.hello();
  }

  // Wrapper for the reconnect iterator callback.
  this._connection.onAutoreconnectIteration = (timeout, promise) => {
    if (this.onAutoreconnectIteration) {
      this.onAutoreconnectIteration(timeout, promise);
    }
  }

  this._connection.onDisconnect = (err, code) => {
    this._inPacketCount = 0;
    this._serverInfo = null;
    this._authenticated = false;

    if (this._expirePromises) {
      clearInterval(this._expirePromises);
      this._expirePromises = null;
    }

    // Mark all topics as unsubscribed
    cacheMap('topic', (topic, key) => {
      topic._resetSub();
    });

    // Reject all pending promises
    for (let key in this._pendingPromises) {
      const callbacks = this._pendingPromises[key];
      if (callbacks && callbacks.reject) {
        callbacks.reject(err);
      }
    }
    this._pendingPromises = {};

    if (this.onDisconnect) {
      this.onDisconnect(err);
    }
  }
};

// Static methods.

/**
 * @typedef Credential
 * @type {object}
 * @property {string} meth - validation method.
 * @property {string} val - value to validate (e.g. email or phone number).
 * @property {string} resp - validation response.
 * @property {Object} params - validation parameters.
 */
/**
 * Helper method to package account credential.
 *
 * @memberof Tinode
 * @static
 *
 * @param {string | Credential} meth - validation method or object with validation data.
 * @param {string=} val - validation value (e.g. email or phone number).
 * @param {Object=} params - validation parameters.
 * @param {string=} resp - validation response.
 *
 * @returns {Array.<Credential>} array with a single credential or <code>null</code> if no valid credentials were given.
 */
Tinode.credential = function(meth, val, params, resp) {
  if (typeof meth == 'object') {
    ({
      val,
      params,
      resp,
      meth
    } = meth);
  }
  if (meth && (val || resp)) {
    return [{
      'meth': meth,
      'val': val,
      'resp': resp,
      'params': params
    }];
  }
  return null;
};

/**
 * Determine topic type from topic's name: grp, p2p, me, fnd, sys.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - Name of the topic to test.
 * @returns {string} One of <code>"me"</code>, <code>"fnd"</code>, <code>"sys"</code>, <code>"grp"</code>,
 *    <code>"p2p"</code> or <code>undefined</code>.
 */
Tinode.topicType = function(name) {
  const types = {
    'me': 'me',
    'fnd': 'fnd',
    'grp': 'grp',
    'new': 'grp',
    'nch': 'grp',
    'chn': 'grp',
    'usr': 'p2p',
    'sys': 'sys'
  };
  return types[(typeof name == 'string') ? name.substring(0, 3) : 'xxx'];
};

/**
 * Check if the given topic name is a name of a 'me' topic.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - Name of the topic to test.
 * @returns {boolean} <code>true</code> if the name is a name of a 'me' topic, <code>false</code> otherwise.
 */
Tinode.isMeTopicName = function(name) {
  return Tinode.topicType(name) == 'me';
};

/**
 * Check if the given topic name is a name of a group topic.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - Name of the topic to test.
 * @returns {boolean} <code>true</code> if the name is a name of a group topic, <code>false</code> otherwise.
 */
Tinode.isGroupTopicName = function(name) {
  return Tinode.topicType(name) == 'grp';
};

/**
 * Check if the given topic name is a name of a p2p topic.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - Name of the topic to test.
 * @returns {boolean} <code>true</code> if the name is a name of a p2p topic, <code>false</code> otherwise.
 */
Tinode.isP2PTopicName = function(name) {
  return Tinode.topicType(name) == 'p2p';
};

/**
 * Check if the given topic name is a name of a communication topic, i.e. P2P or group.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - Name of the topic to test.
 * @returns {boolean} <code>true</code> if the name is a name of a p2p or group topic, <code>false</code> otherwise.
 */
Tinode.isCommTopicName = function(name) {
  return Tinode.isP2PTopicName(name) || Tinode.isGroupTopicName(name);
};

/**
 * Check if the topic name is a name of a new topic.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - topic name to check.
 * @returns {boolean} <code>true</code> if the name is a name of a new topic, <code>false</code> otherwise.
 */
Tinode.isNewGroupTopicName = function(name) {
  return (typeof name == 'string') &&
    (name.substring(0, 3) == TOPIC_NEW || name.substring(0, 3) == TOPIC_NEW_CHAN);
};

/**
 * Check if the topic name is a name of a channel.
 * @memberof Tinode
 * @static
 *
 * @param {string} name - topic name to check.
 * @returns {boolean} <code>true</code> if the name is a name of a channel, <code>false</code> otherwise.
 */
Tinode.isChannelTopicName = function(name) {
  return (typeof name == 'string') &&
    (name.substring(0, 3) == TOPIC_CHAN || name.substring(0, 3) == TOPIC_NEW_CHAN);
};

/**
 * Return information about the current version of this Tinode client library.
 * @memberof Tinode
 * @static
 *
 * @returns {string} semantic version of the library, e.g. <code>"0.15.5-rc1"</code>.
 */
Tinode.getVersion = function() {
  return VERSION;
};

/**
 * To use Tinode in a non browser context, supply WebSocket and XMLHttpRequest providers.
 * @static
 * @memberof Tinode
 * @param wsProvider WebSocket provider, e.g. for nodeJS , <code>require('ws')</code>.
 * @param xhrProvider XMLHttpRequest provider, e.g. for node <code>require('xhr')</code>.
 */
Tinode.setNetworkProviders = function(wsProvider, xhrProvider) {
  WebSocketProvider = wsProvider;
  XHRProvider = xhrProvider;
};

/**
 * Return information about the current name and version of this Tinode library.
 * @memberof Tinode
 * @static
 *
 * @returns {string} the name of the library and it's version.
 */
Tinode.getLibrary = function() {
  return LIBRARY;
};

// Exported constants
Tinode.MESSAGE_STATUS_NONE = MESSAGE_STATUS_NONE;
Tinode.MESSAGE_STATUS_QUEUED = MESSAGE_STATUS_QUEUED;
Tinode.MESSAGE_STATUS_SENDING = MESSAGE_STATUS_SENDING;
Tinode.MESSAGE_STATUS_FAILED = MESSAGE_STATUS_FAILED;
Tinode.MESSAGE_STATUS_SENT = MESSAGE_STATUS_SENT;
Tinode.MESSAGE_STATUS_RECEIVED = MESSAGE_STATUS_RECEIVED;
Tinode.MESSAGE_STATUS_READ = MESSAGE_STATUS_READ;
Tinode.MESSAGE_STATUS_TO_ME = MESSAGE_STATUS_TO_ME;
Tinode.MESSAGE_STATUS_DEL_RANGE = MESSAGE_STATUS_DEL_RANGE;

// Unicode [del] symbol.
Tinode.DEL_CHAR = '\u2421';

/**
 * Check if the given string represents <code>NULL</code> value as defined by Tinode (<code>'\u2421'</code>).
 * @memberof Tinode
 * @static
 *
 * @param {string} str - string to check for <code>NULL</code> value.
 *
 * @returns {boolean} <code>true</code> if string represents <code>NULL</code> value, <code>false</code> otherwise.
 */
Tinode.isNullValue = function(str) {
  return str === Tinode.DEL_CHAR;
};

/**
 * Check if the given URL string is a relative URL.
 * Check for cases like:
 *  <code>'http://example.com'</code>
 *  <code>' http://example.com'</code>
 *  <code>'//example.com/'</code>
 *  <code>'http:example.com'</code>
 *  <code>'http:/example.com'</code>
 * @memberof Tinode
 * @static
 *
 * @param {string} url - URL string to check.
 *
 * @returns {boolean} <code>true</code> if the URL is relative, <code>false</code> otherwise.
 */
Tinode.isRelativeURL = function(url) {
  return !/^\s*([a-z][a-z0-9+.-]*:|\/\/)/im.test(url);
};

// Names of keys to server-provided configuration limits.
Tinode.MAX_MESSAGE_SIZE = 'maxMessageSize';
Tinode.MAX_SUBSCRIBER_COUNT = 'maxSubscriberCount';
Tinode.MAX_TAG_COUNT = 'maxTagCount';
Tinode.MAX_FILE_UPLOAD_SIZE = 'maxFileUploadSize';

// Public methods;
Tinode.prototype = {
  /**
   * Connect to the server.
   * @memberof Tinode#
   *
   * @param {string} host_ - name of the host to connect to.
   *
   * @return {Promise} Promise resolved/rejected when the connection call completes:
   *    <code>resolve()</code> is called without parameters, <code>reject()</code> receives the
   *    <code>Error</code> as a single parameter.
   */
  connect: function(host_) {
    return this._connection.connect(host_);
  },

  /**
   * Attempt to reconnect to the server immediately.
   * @memberof Tinode#
   *
   * @param {string} force - reconnect even if there is a connection already.
   */
  reconnect: function(force) {
    this._connection.reconnect(force);
  },

  /**
   * Disconnect from the server.
   * @memberof Tinode#
   */
  disconnect: function() {
    this._connection.disconnect();
  },

  /**
   * Clear persistent cache: remove IndexedDB.
   * @memberof Tinode#
   * @return {Promise} Promise resolved/rejected when the operation is completed.
   */
  clearStorage: function() {
    if (this._db.isReady()) {
      return this._db.deleteDatabase();
    }
    return Promise.resolve();
  },

  /**
   * Initialize persistent cache: create IndexedDB cache.
   * @memberof Tinode#
   * @return {Promise} Promise resolved/rejected when the operation is completed.
   */
  initStorage: function() {
    if (!this._db.isReady()) {
      return this._db.initDatabase();
    }
    return Promise.resolve();
  },

  /**
   * Send a network probe message to make sure the connection is alive.
   * @memberof Tinode#
   */
  networkProbe: function() {
    this._connection.probe();
  },

  /**
   * Check for live connection to server.
   * @memberof Tinode#
   *
   * @returns {boolean} <code>true</code> if there is a live connection, <code>false</code> otherwise.
   */
  isConnected: function() {
    return this._connection.isConnected();
  },

  /**
   * Check if connection is authenticated (last login was successful).
   * @memberof Tinode#
   * @returns {boolean} <code>true</code> if authenticated, <code>false</code> otherwise.
   */
  isAuthenticated: function() {
    return this._authenticated;
  },

  /**
   * Add API key and auth token to the relative URL making it usable for getting data
   * from the server in a simple <code>HTTP GET</code> request.
   * @memberof Tinode#
   *
   * @param {string} URL - URL to wrap.
   * @returns {string} URL with appended API key and token, if valid token is present.
   */
  authorizeURL: function(url) {
    if (!url) {
      return url;
    }

    if (Tinode.isRelativeURL(url)) {
      // Fake base to make the relative URL parseable.
      const base = 'scheme://host/';
      const parsed = new URL(url, base);
      if (this._apiKey) {
        parsed.searchParams.append('apikey', this._apiKey);
      }
      if (this._authToken.token) {
        parsed.searchParams.append('auth', 'token');
        parsed.searchParams.append('secret', this._authToken.token);
      }
      // Convert back to string and strip fake base URL except for the root slash.
      url = parsed.toString().substring(base.length - 1);
    }
    return url;
  },

  /**
   * @typedef AccountParams
   * @memberof Tinode
   * @type {Object}
   * @property {Tinode.DefAcs=} defacs - Default access parameters for user's <code>me</code> topic.
   * @property {Object=} public - Public application-defined data exposed on <code>me</code> topic.
   * @property {Object=} private - Private application-defined data accessible on <code>me</code> topic.
   * @property {Array} tags - array of string tags for user discovery.
   * @property {string=} token - authentication token to use.
   */
  /**
   * @typedef DefAcs
   * @memberof Tinode
   * @type {Object}
   * @property {string=} auth - Access mode for <code>me</code> for authenticated users.
   * @property {string=} anon - Access mode for <code>me</code> for anonymous users.
   */

  /**
   * Create or update an account.
   * @memberof Tinode#
   *
   * @param {string} uid - User id to update
   * @param {string} scheme - Authentication scheme; <code>"basic"</code> and <code>"anonymous"</code> are the currently supported schemes.
   * @param {string} secret - Authentication secret, assumed to be already base64 encoded.
   * @param {boolean=} login - Use new account to authenticate current session
   * @param {Tinode.AccountParams=} params - User data to pass to the server.
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  account: function(uid, scheme, secret, login, params) {
    const pkt = this.initPacket('acc');
    pkt.acc.user = uid;
    pkt.acc.scheme = scheme;
    pkt.acc.secret = secret;
    // Log in to the new account using selected scheme
    pkt.acc.login = login;

    if (params) {
      pkt.acc.desc.defacs = params.defacs;
      pkt.acc.desc.public = params.public;
      pkt.acc.desc.private = params.private;

      pkt.acc.tags = params.tags;
      pkt.acc.cred = params.cred;

      pkt.acc.token = params.token;
    }

    return this.send(pkt, pkt.acc.id);
  },

  /**
   * Create a new user. Wrapper for {@link Tinode#account}.
   * @memberof Tinode#
   *
   * @param {string} scheme - Authentication scheme; <code>"basic"</code> is the only currently supported scheme.
   * @param {string} secret - Authentication.
   * @param {boolean=} login - Use new account to authenticate current session
   * @param {Tinode.AccountParams=} params - User data to pass to the server.
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  createAccount: function(scheme, secret, login, params) {
    let promise = this.account(USER_NEW, scheme, secret, login, params);
    if (login) {
      promise = promise.then((ctrl) => {
        return this.loginSuccessful(ctrl);
      });
    }
    return promise;
  },

  /**
   * Create user with <code>'basic'</code> authentication scheme and immediately
   * use it for authentication. Wrapper for {@link Tinode#account}.
   * @memberof Tinode#
   *
   * @param {string} username - Login to use for the new account.
   * @param {string} password - User's password.
   * @param {Tinode.AccountParams=} params - User data to pass to the server.
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  createAccountBasic: function(username, password, params) {
    // Make sure we are not using 'null' or 'undefined';
    username = username || '';
    password = password || '';
    return this.createAccount('basic',
      b64EncodeUnicode(username + ':' + password), true, params);
  },

  /**
   * Update user's credentials for <code>'basic'</code> authentication scheme. Wrapper for {@link Tinode#account}.
   * @memberof Tinode#
   *
   * @param {string} uid - User ID to update.
   * @param {string} username - Login to use for the new account.
   * @param {string} password - User's password.
   * @param {Tinode.AccountParams=} params - data to pass to the server.
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  updateAccountBasic: function(uid, username, password, params) {
    // Make sure we are not using 'null' or 'undefined';
    username = username || '';
    password = password || '';
    return this.account(uid, 'basic',
      b64EncodeUnicode(username + ':' + password), false, params);
  },

  /**
   * Send handshake to the server.
   * @memberof Tinode#
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  hello: function() {
    const pkt = this.initPacket('hi');

    return this.send(pkt, pkt.hi.id)
      .then((ctrl) => {
        // Reset backoff counter on successful connection.
        this._connection.backoffReset();

        // Server response contains server protocol version, build, constraints,
        // session ID for long polling. Save them.
        if (ctrl.params) {
          this._serverInfo = ctrl.params;
        }

        if (this.onConnect) {
          this.onConnect();
        }

        return ctrl;
      }).catch((err) => {
        this._connection.reconnect(true);

        if (this.onDisconnect) {
          this.onDisconnect(err);
        }
      });
  },

  /**
   * Set or refresh the push notifications/device token. If the client is connected,
   * the deviceToken can be sent to the server.
   *
   * @memberof Tinode#
   * @param {string} dt - token obtained from the provider or <code>false</code>,
   *    <code>null</code> or <code>undefined</code> to clear the token.
   *
   * @returns <code>true</code> if attempt was made to send the update to the server.
   */
  setDeviceToken: function(dt) {
    let sent = false;
    // Convert any falsish value to null.
    dt = dt || null;
    if (dt != this._deviceToken) {
      this._deviceToken = dt;
      if (this.isConnected() && this.isAuthenticated()) {
        this.send({
          'hi': {
            'dev': dt || Tinode.DEL_CHAR
          }
        });
        sent = true;
      }
    }
    return sent;
  },

  /**
   * Authenticate current session.
   * @memberof Tinode#
   *
   * @param {string} scheme - Authentication scheme; <code>"basic"</code> is the only currently supported scheme.
   * @param {string} secret - Authentication secret, assumed to be already base64 encoded.
   *
   * @returns {Promise} Promise which will be resolved/rejected when server reply is received.
   */
  login: function(scheme, secret, cred) {
    const pkt = this.initPacket('login');
    pkt.login.scheme = scheme;
    pkt.login.secret = secret;
    pkt.login.cred = cred;

    return this.send(pkt, pkt.login.id)
      .then((ctrl) => {
        return this.loginSuccessful(ctrl);
      });
  },

  /**
   * Wrapper for {@link Tinode#login} with basic authentication
   * @memberof Tinode#
   *
   * @param {string} uname - User name.
   * @param {string} password  - Password.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  loginBasic: function(uname, password, cred) {
    return this.login('basic', b64EncodeUnicode(uname + ':' + password), cred)
      .then((ctrl) => {
        this._login = uname;
        return ctrl;
      });
  },

  /**
   * Wrapper for {@link Tinode#login} with token authentication
   * @memberof Tinode#
   *
   * @param {string} token - Token received in response to earlier login.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  loginToken: function(token, cred) {
    return this.login('token', token, cred);
  },

  /**
   * Send a request for resetting an authentication secret.
   * @memberof Tinode#
   *
   * @param {string} scheme - authentication scheme to reset.
   * @param {string} method - method to use for resetting the secret, such as "email" or "tel".
   * @param {string} value - value of the credential to use, a specific email address or a phone number.
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving the server reply.
   */
  requestResetAuthSecret: function(scheme, method, value) {
    return this.login('reset', b64EncodeUnicode(scheme + ':' + method + ':' + value));
  },

  /**
   * @typedef AuthToken
   * @memberof Tinode
   * @type {Object}
   * @property {string} token - Token value.
   * @property {Date} expires - Token expiration time.
   */
  /**
   * Get stored authentication token.
   * @memberof Tinode#
   *
   * @returns {Tinode.AuthToken} authentication token.
   */
  getAuthToken: function() {
    if (this._authToken && (this._authToken.expires.getTime() > Date.now())) {
      return this._authToken;
    } else {
      this._authToken = null;
    }
    return null;
  },

  /**
   * Application may provide a saved authentication token.
   * @memberof Tinode#
   *
   * @param {Tinode.AuthToken} token - authentication token.
   */
  setAuthToken: function(token) {
    this._authToken = token;
  },

  /**
   * @typedef SetParams
   * @type {Object}
   * @memberof Tinode
   * @property {Tinode.SetDesc=} desc - Topic initialization parameters when creating a new topic or a new subscription.
   * @property {Tinode.SetSub=} sub - Subscription initialization parameters.
   */
  /**
   * @typedef SetDesc
   * @type {Object}
   * @memberof Tinode
   * @property {Tinode.DefAcs=} defacs - Default access mode.
   * @property {Object=} public - Free-form topic description, publically accessible.
   * @property {Object=} private - Free-form topic descriptionaccessible only to the owner.
   */
  /**
   * @typedef SetSub
   * @type {Object}
   * @memberof Tinode
   * @property {string=} user - UID of the user affected by the request. Default (empty) - current user.
   * @property {string=} mode - User access mode, either requested or assigned dependent on context.
   * @property {Object=} info - Free-form payload to pass to the invited user or topic manager.
   */
  /**
   * Parameters passed to {@link Tinode#subscribe}.
   *
   * @typedef SubscriptionParams
   * @type {Object}
   * @memberof Tinode
   * @property {Tinode.SetParams=} set - Parameters used to initialize topic
   * @property {Tinode.GetQuery=} get - Query for fetching data from topic.
   */

  /**
   * Send a topic subscription request.
   * @memberof Tinode#
   *
   * @param {string} topic - Name of the topic to subscribe to.
   * @param {Tinode.GetQuery=} getParams - Optional subscription metadata query
   * @param {Tinode.SetParams=} setParams - Optional initialization parameters
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  subscribe: function(topicName, getParams, setParams) {
    const pkt = this.initPacket('sub', topicName)
    if (!topicName) {
      topicName = TOPIC_NEW;
    }

    pkt.sub.get = getParams;

    if (setParams) {
      if (setParams.sub) {
        pkt.sub.set.sub = setParams.sub;
      }

      if (setParams.desc) {
        if (Tinode.isNewGroupTopicName(topicName)) {
          // Full set.desc params are used for new topics only
          pkt.sub.set.desc = setParams.desc;
        } else if (Tinode.isP2PTopicName(topicName) && setParams.desc.defacs) {
          // Use optional default permissions only.
          pkt.sub.set.desc = {
            defacs: setParams.desc.defacs
          };
        }
      }

      if (setParams.tags) {
        pkt.sub.set.tags = setParams.tags;
      }
    }

    return this.send(pkt, pkt.sub.id);
  },

  /**
   * Detach and optionally unsubscribe from the topic
   * @memberof Tinode#
   *
   * @param {string} topic - Topic to detach from.
   * @param {boolean} unsub - If <code>true</code>, detach and unsubscribe, otherwise just detach.
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  leave: function(topic, unsub) {
    const pkt = this.initPacket('leave', topic);
    pkt.leave.unsub = unsub;

    return this.send(pkt, pkt.leave.id);
  },

  /**
   * Create message draft without sending it to the server.
   * @memberof Tinode#
   *
   * @param {string} topic - Name of the topic to publish to.
   * @param {Object} data - Payload to publish.
   * @param {boolean=} noEcho - If <code>true</code>, tell the server not to echo the message to the original session.
   *
   * @returns {Object} new message which can be sent to the server or otherwise used.
   */
  createMessage: function(topic, data, noEcho) {
    const pkt = this.initPacket('pub', topic);

    let dft = typeof data == 'string' ? Drafty.parse(data) : data;
    if (dft && !Drafty.isPlainText(dft)) {
      pkt.pub.head = {
        mime: Drafty.getContentType()
      };
      data = dft;
    }
    pkt.pub.noecho = noEcho;
    pkt.pub.content = data;

    return pkt.pub;
  },

  /**
   * Publish {data} message to topic.
   * @memberof Tinode#
   *
   * @param {string} topic - Name of the topic to publish to.
   * @param {Object} data - Payload to publish.
   * @param {boolean=} noEcho - If <code>true</code>, tell the server not to echo the message to the original session.
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  publish: function(topic, data, noEcho) {
    return this.publishMessage(
      this.createMessage(topic, data, noEcho)
    );
  },

  /**
   * Publish message to topic. The message should be created by {@link Tinode#createMessage}.
   * @memberof Tinode#
   *
   * @param {Object} pub - Message to publish.
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  publishMessage: function(pub) {
    // Make a shallow copy. Needed in order to clear locally-assigned temp values;
    pub = Object.assign({}, pub);
    pub.seq = undefined;
    pub.from = undefined;
    pub.ts = undefined;
    return this.send({
      pub: pub
    }, pub.id);
  },

  /**
   * Out of band notification: notify topic that an external (push) notification was recived by the client.
   * @memberof Tinode#
   *
   * @param {string} topicName - name of the updated topic.
   * @param {number} seq - seq ID of the new message.
   * @param {string=} act - UID of the sender; default is current.
   */
  oobNotification: function(topicName, seq, act) {
    const topic = this.cacheGet('topic', topicName);
    if (topic) {
      topic._updateReceived(seq, act);
      this.getMeTopic()._refreshContact('msg', topic);
    }
  },

  /**
   * @typedef GetQuery
   * @type {Object}
   * @memberof Tinode
   * @property {Tinode.GetOptsType=} desc - If provided (even if empty), fetch topic description.
   * @property {Tinode.GetOptsType=} sub - If provided (even if empty), fetch topic subscriptions.
   * @property {Tinode.GetDataType=} data - If provided (even if empty), get messages.
   */

  /**
   * @typedef GetOptsType
   * @type {Object}
   * @memberof Tinode
   * @property {Date=} ims - "If modified since", fetch data only it was was modified since stated date.
   * @property {number=} limit - Maximum number of results to return. Ignored when querying topic description.
   */

  /**
   * @typedef GetDataType
   * @type {Object}
   * @memberof Tinode
   * @property {number=} since - Load messages with seq id equal or greater than this value.
   * @property {number=} before - Load messages with seq id lower than this number.
   * @property {number=} limit - Maximum number of results to return.
   */

  /**
   * Request topic metadata
   * @memberof Tinode#
   *
   * @param {string} topic - Name of the topic to query.
   * @param {Tinode.GetQuery} params - Parameters of the query. Use {@link Tinode.MetaGetBuilder} to generate.
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  getMeta: function(topic, params) {
    const pkt = this.initPacket('get', topic);

    pkt.get = mergeObj(pkt.get, params);

    return this.send(pkt, pkt.get.id);
  },

  /**
   * Update topic's metadata: description, subscribtions.
   * @memberof Tinode#
   *
   * @param {string} topic - Topic to update.
   * @param {Tinode.SetParams} params - topic metadata to update.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  setMeta: function(topic, params) {
    const pkt = this.initPacket('set', topic);
    const what = [];

    if (params) {
      ['desc', 'sub', 'tags', 'cred'].map(function(key) {
        if (params.hasOwnProperty(key)) {
          what.push(key);
          pkt.set[key] = params[key];
        }
      });
    }

    if (what.length == 0) {
      return Promise.reject(new Error("Invalid {set} parameters"));
    }

    return this.send(pkt, pkt.set.id);
  },

  /**
   * Range of message IDs to delete.
   *
   * @typedef DelRange
   * @type {Object}
   * @memberof Tinode
   * @property {number} low - low end of the range, inclusive (closed).
   * @property {number=} hi - high end of the range, exclusive (open).
   */
  /**
   * Delete some or all messages in a topic.
   * @memberof Tinode#
   *
   * @param {string} topic - Topic name to delete messages from.
   * @param {Tinode.DelRange[]} list - Ranges of message IDs to delete.
   * @param {boolean=} hard - Hard or soft delete
   *
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delMessages: function(topic, ranges, hard) {
    const pkt = this.initPacket('del', topic);

    pkt.del.what = 'msg';
    pkt.del.delseq = ranges;
    pkt.del.hard = hard;

    return this.send(pkt, pkt.del.id);
  },

  /**
   * Delete the topic alltogether. Requires Owner permission.
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic to delete
   * @param {boolean} hard - hard-delete topic.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delTopic: function(topicName, hard) {
    const pkt = this.initPacket('del', topicName);
    pkt.del.what = 'topic';
    pkt.del.hard = hard;

    return this.send(pkt, pkt.del.id);
  },

  /**
   * Delete subscription. Requires Share permission.
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic to delete
   * @param {string} user - User ID to remove.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delSubscription: function(topicName, user) {
    const pkt = this.initPacket('del', topicName);
    pkt.del.what = 'sub';
    pkt.del.user = user;

    return this.send(pkt, pkt.del.id);
  },

  /**
   * Delete credential. Always sent on <code>'me'</code> topic.
   * @memberof Tinode#
   *
   * @param {string} method - validation method such as <code>'email'</code> or <code>'tel'</code>.
   * @param {string} value - validation value, i.e. <code>'alice@example.com'</code>.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delCredential: function(method, value) {
    const pkt = this.initPacket('del', TOPIC_ME);
    pkt.del.what = 'cred';
    pkt.del.cred = {
      meth: method,
      val: value
    };

    return this.send(pkt, pkt.del.id);
  },

  /**
   * Request to delete account of the current user.
   * @memberof Tinode#
   *
   * @param {boolean} hard - hard-delete user.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delCurrentUser: function(hard) {
    const pkt = this.initPacket('del', null);
    pkt.del.what = 'user';
    pkt.del.hard = hard;

    return this.send(pkt, pkt.del.id).then((ctrl) => {
      this._myUID = null;
    });
  },

  /**
   * Notify server that a message or messages were read or received. Does NOT return promise.
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic where the mesage is being aknowledged.
   * @param {string} what - Action being aknowledged, either <code>"read"</code> or <code>"recv"</code>.
   * @param {number} seq - Maximum id of the message being acknowledged.
   */
  note: function(topicName, what, seq) {
    if (seq <= 0 || seq >= LOCAL_SEQID) {
      throw new Error(`Invalid message id ${seq}`);
    }

    const pkt = this.initPacket('note', topicName);
    pkt.note.what = what;
    pkt.note.seq = seq;
    this.send(pkt);
  },

  /**
   * Broadcast a key-press notification to topic subscribers. Used to show
   * typing notifications "user X is typing...".
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic to broadcast to.
   */
  noteKeyPress: function(topicName) {
    const pkt = this.initPacket('note', topicName);
    pkt.note.what = 'kp';
    this.send(pkt);
  },

  /**
   * Get a named topic, either pull it from cache or create a new instance.
   * There is a single instance of topic for each name.
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic to get.
   * @returns {Tinode.Topic} Requested or newly created topic or <code>undefined</code> if topic name is invalid.
   */
  getTopic: function(topicName) {
    let topic = this.cacheGet('topic', topicName);
    if (!topic && topicName) {
      if (topicName == TOPIC_ME) {
        topic = new TopicMe();
      } else if (topicName == TOPIC_FND) {
        topic = new TopicFnd();
      } else {
        topic = new Topic(topicName);
      }
      // Cache management.
      this.attachCacheToTopic(topic);
      topic._cachePutSelf();
      // Don't save to DB here: a record will be added when the topic is subscribed.
    }
    return topic;
  },

  /**
   * Check if named topic is already present in cache.
   * @memberof Tinode#
   *
   * @param {string} topicName - Name of the topic to check.
   * @returns {boolean} true if topic is found in cache, false oterwise.
   */
  isTopicCached: function(topicName) {
    return !!this.cacheGet('topic', topicName);
  },

  /**
   * Generate unique name like <code>'new123456'</code> suitable for creating a new group topic.
   * @memberof Tinode#
   *
   * @param {boolean} isChan - if the topic is channel-enabled.
   * @returns {string} name which can be used for creating a new group topic.
   */
  newGroupTopicName: function(isChan) {
    return (isChan ? TOPIC_NEW_CHAN : TOPIC_NEW) + this.getNextUniqueId();
  },

  /**
   * Instantiate <code>'me'</code> topic or get it from cache.
   * @memberof Tinode#
   *
   * @returns {Tinode.TopicMe} Instance of <code>'me'</code> topic.
   */
  getMeTopic: function() {
    return this.getTopic(TOPIC_ME);
  },

  /**
   * Instantiate <code>'fnd'</code> (find) topic or get it from cache.
   * @memberof Tinode#
   *
   * @returns {Tinode.Topic} Instance of <code>'fnd'</code> topic.
   */
  getFndTopic: function() {
    return this.getTopic(TOPIC_FND);
  },

  /**
   * Create a new {@link LargeFileHelper} instance
   * @memberof Tinode#
   *
   * @returns {Tinode.LargeFileHelper} instance of a {@link Tinode.LargeFileHelper}.
   */
  getLargeFileHelper: function() {
    return new LargeFileHelper(this, PROTOCOL_VERSION);
  },

  /**
   * Get the UID of the the current authenticated user.
   * @memberof Tinode#
   * @returns {string} UID of the current user or <code>undefined</code> if the session is not yet authenticated or if there is no session.
   */
  getCurrentUserID: function() {
    return this._myUID;
  },

  /**
   * Check if the given user ID is equal to the current user's UID.
   * @memberof Tinode#
   * @param {string} uid - UID to check.
   * @returns {boolean} true if the given UID belongs to the current logged in user.
   */
  isMe: function(uid) {
    return this._myUID === uid;
  },

  /**
   * Get login used for last successful authentication.
   * @memberof Tinode#
   * @returns {string} login last used successfully or <code>undefined</code>.
   */
  getCurrentLogin: function() {
    return this._login;
  },

  /**
   * Return information about the server: protocol version and build timestamp.
   * @memberof Tinode#
   * @returns {Object} build and version of the server or <code>null</code> if there is no connection or if the first server response has not been received yet.
   */
  getServerInfo: function() {
    return this._serverInfo;
  },

  /**
   * Return server-provided configuration value (long integer).
   * @memberof Tinode#
   * @param {string} name of the value to return
   * @param {Object} defaultValue to return in case server limit is not set or not found.
   * @returns {number} named value.
   */
  getServerLimit: function(name, defaultValue) {
    return (this._serverInfo ? this._serverInfo[name] : null) || defaultValue;
  },

  /**
   * Toggle console logging. Logging is off by default.
   * @memberof Tinode#
   * @param {boolean} enabled - Set to <code>true</code> to enable logging to console.
   * @param {boolean} trimLongStrings - Set to <code>true</code> to trim long strings.
   */
  enableLogging: function(enabled, trimLongStrings) {
    this._loggingEnabled = enabled;
    this._trimLongStrings = enabled && trimLongStrings;
  },

  /**
   * Set UI language to report to the server. Must be called before <code>'hi'</code> is sent, otherwise it will not be used.
   * @memberof Tinode#
   *
   * @param {string} hl - human (UI) language, like <code>"en_US"</code> or <code>"zh-Hans"</code>.
   */
  setHumanLanguage: function(hl) {
    if (hl) {
      this._humanLanguage = hl;
    }
  },

  /**
   * Check if given topic is online.
   * @memberof Tinode#
   *
   * @param {string} name of the topic to test.
   * @returns {boolean} true if topic is online, false otherwise.
   */
  isTopicOnline: function(name) {
    const topic = this.cacheGet('topic', name);
    return topic && topic.online;
  },

  /**
   * Get access mode for the given contact.
   * @memberof Tinode#
   *
   * @param {string} name of the topic to query.
   * @returns {AccessMode} access mode if topic is found, null otherwise.
   */
  getTopicAccessMode: function(name) {
    const topic = this.cacheGet('topic', name);
    return topic ? topic.acs : null;
  },

  /**
   * Include message ID into all subsequest messages to server instructin it to send aknowledgemens.
   * Required for promises to function. Default is <code>"on"</code>.
   * @memberof Tinode#
   *
   * @param {boolean} status - Turn aknowledgemens on or off.
   * @deprecated
   */
  wantAkn: function(status) {
    if (status) {
      this._messageId = Math.floor((Math.random() * 0xFFFFFF) + 0xFFFFFF);
    } else {
      this._messageId = 0;
    }
  },

  // Callbacks:
  /**
   * Callback to report when the websocket is opened. The callback has no parameters.
   * @memberof Tinode#
   * @type {Tinode.onWebsocketOpen}
   */
  onWebsocketOpen: undefined,

  /**
   * @typedef Tinode.ServerParams
   * @memberof Tinode
   * @type {Object}
   * @property {string} ver - Server version
   * @property {string} build - Server build
   * @property {string=} sid - Session ID, long polling connections only.
   */

  /**
   * @callback Tinode.onConnect
   * @param {number} code - Result code
   * @param {string} text - Text epxplaining the completion, i.e "OK" or an error message.
   * @param {Tinode.ServerParams} params - Parameters returned by the server.
   */
  /**
   * Callback to report when connection with Tinode server is established.
   * @memberof Tinode#
   * @type {Tinode.onConnect}
   */
  onConnect: undefined,

  /**
   * Callback to report when connection is lost. The callback has no parameters.
   * @memberof Tinode#
   * @type {Tinode.onDisconnect}
   */
  onDisconnect: undefined,

  /**
   * @callback Tinode.onLogin
   * @param {number} code - NUmeric completion code, same as HTTP status codes.
   * @param {string} text - Explanation of the completion code.
   */
  /**
   * Callback to report login completion.
   * @memberof Tinode#
   * @type {Tinode.onLogin}
   */
  onLogin: undefined,

  /**
   * Callback to receive <code>{ctrl}</code> (control) messages.
   * @memberof Tinode#
   * @type {Tinode.onCtrlMessage}
   */
  onCtrlMessage: undefined,

  /**
   * Callback to recieve <code>{data}</code> (content) messages.
   * @memberof Tinode#
   * @type {Tinode.onDataMessage}
   */
  onDataMessage: undefined,

  /**
   * Callback to receive <code>{pres}</code> (presence) messages.
   * @memberof Tinode#
   * @type {Tinode.onPresMessage}
   */
  onPresMessage: undefined,

  /**
   * Callback to receive all messages as objects.
   * @memberof Tinode#
   * @type {Tinode.onMessage}
   */
  onMessage: undefined,

  /**
   * Callback to receive all messages as unparsed text.
   * @memberof Tinode#
   * @type {Tinode.onRawMessage}
   */
  onRawMessage: undefined,

  /**
   * Callback to receive server responses to network probes. See {@link Tinode#networkProbe}
   * @memberof Tinode#
   * @type {Tinode.onNetworkProbe}
   */
  onNetworkProbe: undefined,

  /**
   * Callback to be notified when exponential backoff is iterating.
   * @memberof Tinode#
   * @type {Tinode.onAutoreconnectIteration}
   */
  onAutoreconnectIteration: undefined,
};

/**
 * @callback Tinode.Topic.onData
 * @param {Data} data - Data packet
 */
/**
 * Topic is a class representing a logical communication channel.
 * @class Topic
 * @memberof Tinode
 *
 * @param {string} name - Name of the topic to create.
 * @param {Object=} callbacks - Object with various event callbacks.
 * @param {Tinode.Topic.onData} callbacks.onData - Callback which receives a <code>{data}</code> message.
 * @param {callback} callbacks.onMeta - Callback which receives a <code>{meta}</code> message.
 * @param {callback} callbacks.onPres - Callback which receives a <code>{pres}</code> message.
 * @param {callback} callbacks.onInfo - Callback which receives an <code>{info}</code> message.
 * @param {callback} callbacks.onMetaDesc - Callback which receives changes to topic desctioption {@link desc}.
 * @param {callback} callbacks.onMetaSub - Called for a single subscription record change.
 * @param {callback} callbacks.onSubsUpdated - Called after a batch of subscription changes have been recieved and cached.
 * @param {callback} callbacks.onDeleteTopic - Called after the topic is deleted.
 * @param {callback} callbacls.onAllMessagesReceived - Called when all requested <code>{data}</code> messages have been recived.
 */
var Topic = function(name, callbacks) {
  // Parent Tinode object.
  this._tinode = null;

  // Server-provided data, locally immutable.
  // topic name
  this.name = name;
  // Timestamp when the topic was created.
  this.created = null;
  // Timestamp when the topic was last updated.
  this.updated = null;
  // Timestamp of the last messages
  this.touched = new Date(0);
  // Access mode, see AccessMode
  this.acs = new AccessMode(null);
  // per-topic private data
  this.private = null;
  // per-topic public data
  this.public = null;

  // Locally cached data
  // Subscribed users, for tracking read/recv/msg notifications.
  this._users = {};

  // Current value of locally issued seqId, used for pending messages.
  this._queuedSeqId = LOCAL_SEQID;

  // The maximum known {data.seq} value.
  this._maxSeq = 0;
  // The minimum known {data.seq} value.
  this._minSeq = 0;
  // Indicator that the last request for earlier messages returned 0.
  this._noEarlierMsgs = false;
  // The maximum known deletion ID.
  this._maxDel = 0;
  // User discovery tags
  this._tags = [];
  // Credentials such as email or phone number.
  this._credentials = [];
  // Message cache, sorted by message seq values, from old to new.
  this._messages = CBuffer(function(a, b) {
    return a.seq - b.seq;
  }, true);
  // Boolean, true if the topic is currently live
  this._subscribed = false;
  // Timestap of the most recently updated subscription.
  this._lastSubsUpdate = new Date(0);
  // Topic created but not yet synced with the server. Used only during initialization.
  this._new = true;

  // Callbacks
  if (callbacks) {
    this.onData = callbacks.onData;
    this.onMeta = callbacks.onMeta;
    this.onPres = callbacks.onPres;
    this.onInfo = callbacks.onInfo;
    // A single desc update;
    this.onMetaDesc = callbacks.onMetaDesc;
    // A single subscription record;
    this.onMetaSub = callbacks.onMetaSub;
    // All subscription records received;
    this.onSubsUpdated = callbacks.onSubsUpdated;
    this.onTagsUpdated = callbacks.onTagsUpdated;
    this.onCredsUpdated = callbacks.onCredsUpdated;
    this.onDeleteTopic = callbacks.onDeleteTopic;
    this.onAllMessagesReceived = callbacks.onAllMessagesReceived;
  }
};

Topic.prototype = {
  /**
   * Check if the topic is subscribed.
   * @memberof Tinode.Topic#
   * @returns {boolean} True is topic is attached/subscribed, false otherwise.
   */
  isSubscribed: function() {
    return this._subscribed;
  },

  /**
   * Request topic to subscribe. Wrapper for {@link Tinode#subscribe}.
   * @memberof Tinode.Topic#
   *
   * @param {Tinode.GetQuery=} getParams - get query parameters.
   * @param {Tinode.SetParams=} setParams - set parameters.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to the request.
   */
  subscribe: function(getParams, setParams) {
    // If the topic is already subscribed, return resolved promise
    if (this._subscribed) {
      return Promise.resolve(this);
    }

    // Send subscribe message, handle async response.
    // If topic name is explicitly provided, use it. If no name, then it's a new group topic,
    // use "new".
    return this._tinode.subscribe(this.name || TOPIC_NEW, getParams, setParams).then((ctrl) => {
      if (ctrl.code >= 300) {
        // Do nothing if subscription status has not changed.
        return ctrl;
      }

      this._subscribed = true;
      this.acs = (ctrl.params && ctrl.params.acs) ? ctrl.params.acs : this.acs;

      // Set topic name for new topics and add it to cache.
      if (this._new) {
        this._new = false;

        if (this.name != ctrl.topic) {
          // Name may change new123456 -> grpAbCdEf. Remove from cache under the old name.
          this._cacheDelSelf();
          this.name = ctrl.topic;
        }
        this._cachePutSelf();

        this.created = ctrl.ts;
        this.updated = ctrl.ts;
        this.touched = ctrl.ts;

        if (this.name != TOPIC_ME && this.name != TOPIC_FND) {
          // Add the new topic to the list of contacts maintained by the 'me' topic.
          const me = this._tinode.getMeTopic();
          if (me.onMetaSub) {
            me.onMetaSub(this);
          }
          if (me.onSubsUpdated) {
            me.onSubsUpdated([this.name], 1);
          }
        }

        if (setParams && setParams.desc) {
          setParams.desc._noForwarding = true;
          this._processMetaDesc(setParams.desc);
        }
      }

      return ctrl;
    });
  },

  /**
   * Create a draft of a message without sending it to the server.
   * @memberof Tinode.Topic#
   *
   * @param {string | Object} data - Content to wrap in a draft.
   * @param {boolean=} noEcho - If <code>true</code> server will not echo message back to originating
   * session. Otherwise the server will send a copy of the message to sender.
   *
   * @returns {Object} message draft.
   */
  createMessage: function(data, noEcho) {
    return this._tinode.createMessage(this.name, data, noEcho);
  },

  /**
   * Immediately publish data to topic. Wrapper for {@link Tinode#publish}.
   * @memberof Tinode.Topic#
   *
   * @param {string | Object} data - Data to publish, either plain string or a Drafty object.
   * @param {boolean=} noEcho - If <code>true</code> server will not echo message back to originating
   * @returns {Promise} Promise to be resolved/rejected when the server responds to the request.
   */
  publish: function(data, noEcho) {
    return this.publishMessage(this.createMessage(data, noEcho));
  },

  /**
   * Publish message created by {@link Tinode.Topic#createMessage}.
   * @memberof Tinode.Topic#
   *
   * @param {Object} pub - {data} object to publish. Must be created by {@link Tinode.Topic#createMessage}
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to the request.
   */
  publishMessage: function(pub) {
    if (!this._subscribed) {
      return Promise.reject(new Error("Cannot publish on inactive topic"));
    }

    // Update header with attachment records.
    if (Drafty.hasAttachments(pub.content) && !pub.head.attachments) {
      let attachments = [];
      Drafty.attachments(pub.content, (data) => {
        attachments.push(data.ref);
      });
      pub.head.attachments = attachments;
    }

    // Send data.
    pub._sending = true;
    pub._failed = false;
    return this._tinode.publishMessage(pub).then((ctrl) => {
      pub._sending = false;
      pub.ts = ctrl.ts;
      this.swapMessageId(pub, ctrl.params.seq);
      this._routeData(pub);
      return ctrl;
    }).catch((err) => {
      this._tinode.logger("WARNING: Message rejected by the server", err);
      pub._sending = false;
      pub._failed = true;
      if (this.onData) {
        this.onData();
      }
    });
  },

  /**
   * Add message to local message cache, send to the server when the promise is resolved.
   * If promise is null or undefined, the message will be sent immediately.
   * The message is sent when the
   * The message should be created by {@link Tinode.Topic#createMessage}.
   * This is probably not the final API.
   * @memberof Tinode.Topic#
   *
   * @param {Object} pub - Message to use as a draft.
   * @param {Promise} prom - Message will be sent when this promise is resolved, discarded if rejected.
   *
   * @returns {Promise} derived promise.
   */
  publishDraft: function(pub, prom) {
    if (!prom && !this._subscribed) {
      return Promise.reject(new Error("Cannot publish on inactive topic"));
    }

    const seq = pub.seq || this._getQueuedSeqId();
    if (!pub._noForwarding) {
      // The 'seq', 'ts', and 'from' are added to mimic {data}. They are removed later
      // before the message is sent.

      pub._noForwarding = true;
      pub.seq = seq;
      pub.ts = new Date();
      pub.from = this._tinode.getCurrentUserID();

      // Don't need an echo message because the message is added to local cache right away.
      pub.noecho = true;
      // Add to cache.
      this._messages.put(pub);
      this._tinode._db.addMessage(pub);

      if (this.onData) {
        this.onData(pub);
      }
    }
    // If promise is provided, send the queued message when it's resolved.
    // If no promise is provided, create a resolved one and send immediately.
    prom = (prom || Promise.resolve()).then(
      ( /* argument ignored */ ) => {
        if (pub._cancelled) {
          return {
            code: 300,
            text: "cancelled"
          };
        }
        return this.publishMessage(pub);
      },
      (err) => {
        this._tinode.logger("WARNING: Message draft rejected", err);
        pub._sending = false;
        pub._failed = true;
        this._messages.delAt(this._messages.find(pub));
        this._tinode._db.remMessages(this.name, pub.seq);
        if (this.onData) {
          this.onData();
        }
      });
    return prom;
  },

  /**
   * Leave the topic, optionally unsibscribe. Leaving the topic means the topic will stop
   * receiving updates from the server. Unsubscribing will terminate user's relationship with the topic.
   * Wrapper for {@link Tinode#leave}.
   * @memberof Tinode.Topic#
   *
   * @param {boolean=} unsub - If true, unsubscribe, otherwise just leave.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to the request.
   */
  leave: function(unsub) {
    // It's possible to unsubscribe (unsub==true) from inactive topic.
    if (!this._subscribed && !unsub) {
      return Promise.reject(new Error("Cannot leave inactive topic"));
    }

    // Send a 'leave' message, handle async response
    return this._tinode.leave(this.name, unsub).then((ctrl) => {
      this._resetSub();
      if (unsub) {
        this._tinode._db.remTopic(this.name);
        this._tinode.cacheDel('topic', this.name);
        this._gone();
      }
      return ctrl;
    });
  },

  /**
   * Request topic metadata from the server.
   * @memberof Tinode.Topic#
   *
   * @param {Tinode.GetQuery} request parameters
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  getMeta: function(params) {
    // Send {get} message, return promise.
    return this._tinode.getMeta(this.name, params);
  },

  /**
   * Request more messages from the server
   * @memberof Tinode.Topic#
   *
   * @param {number} limit number of messages to get.
   * @param {boolean} forward if true, request newer messages.
   */
  getMessagesPage: function(limit, forward) {
    const query = this.startMetaQuery();
    if (forward) {
      query.withLaterData(limit);
    } else {
      query.withEarlierData(limit);
    }
    let promise = this.getMeta(query.build());
    if (!forward) {
      promise = promise.then((ctrl) => {
        if (ctrl && ctrl.params && !ctrl.params.count) {
          this._noEarlierMsgs = true;
        }
      });
    }
    return promise;
  },

  /**
   * Update topic metadata.
   * @memberof Tinode.Topic#
   *
   * @param {Tinode.SetParams} params parameters to update.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  setMeta: function(params) {
    if (params.tags) {
      params.tags = normalizeArray(params.tags);
    }
    // Send Set message, handle async response.
    return this._tinode.setMeta(this.name, params)
      .then((ctrl) => {
        if (ctrl && ctrl.code >= 300) {
          // Not modified
          return ctrl;
        }

        if (params.sub) {
          params.sub.topic = this.name;
          if (ctrl.params && ctrl.params.acs) {
            params.sub.acs = ctrl.params.acs;
            params.sub.updated = ctrl.ts;
          }
          if (!params.sub.user) {
            // This is a subscription update of the current user.
            // Assign user ID otherwise the update will be ignored by _processMetaSub.
            params.sub.user = this._tinode.getCurrentUserID();
            if (!params.desc) {
              // Force update to topic's asc.
              params.desc = {};
            }
          }
          params.sub._noForwarding = true;
          this._processMetaSub([params.sub]);
        }

        if (params.desc) {
          if (ctrl.params && ctrl.params.acs) {
            params.desc.acs = ctrl.params.acs;
            params.desc.updated = ctrl.ts;
          }
          this._processMetaDesc(params.desc);
        }

        if (params.tags) {
          this._processMetaTags(params.tags);
        }
        if (params.cred) {
          this._processMetaCreds([params.cred], true);
        }

        return ctrl;
      });
  },

  /**
   * Update access mode of the current user or of another topic subsriber.
   * @memberof Tinode.Topic#
   *
   * @param {string} uid - UID of the user to update or null to update current user.
   * @param {string} update - the update value, full or delta.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  updateMode: function(uid, update) {
    const user = uid ? this.subscriber(uid) : null;
    const am = user ?
      user.acs.updateGiven(update).getGiven() :
      this.getAccessMode().updateWant(update).getWant();

    return this.setMeta({
      sub: {
        user: uid,
        mode: am
      }
    });
  },

  /**
   * Create new topic subscription. Wrapper for {@link Tinode#setMeta}.
   * @memberof Tinode.Topic#
   *
   * @param {string} uid - ID of the user to invite
   * @param {string=} mode - Access mode. <code>null</code> means to use default.
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  invite: function(uid, mode) {
    return this.setMeta({
      sub: {
        user: uid,
        mode: mode
      }
    });
  },

  /**
   * Archive or un-archive the topic. Wrapper for {@link Tinode#setMeta}.
   * @memberof Tinode.Topic#
   *
   * @param {boolean} arch - true to archive the topic, false otherwise.
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  archive: function(arch) {
    if (this.private && this.private.arch == arch) {
      return Promise.resolve(arch);
    }
    return this.setMeta({
      desc: {
        private: {
          arch: arch ? true : Tinode.DEL_CHAR
        }
      }
    });
  },

  /**
   * Delete messages. Hard-deleting messages requires Owner permission.
   * Wrapper for {@link Tinode#delMessages}.
   * @memberof Tinode.Topic#
   *
   * @param {Tinode.DelRange[]} ranges - Ranges of message IDs to delete.
   * @param {boolean=} hard - Hard or soft delete
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  delMessages: function(ranges, hard) {
    if (!this._subscribed) {
      return Promise.reject(new Error("Cannot delete messages in inactive topic"));
    }

    // Sort ranges in accending order by low, the descending by hi.
    ranges.sort((r1, r2) => {
      if (r1.low < r2.low) {
        return true;
      }
      if (r1.low == r2.low) {
        return !r2.hi || (r1.hi >= r2.hi);
      }
      return false;
    });

    // Remove pending messages from ranges possibly clipping some ranges.
    let tosend = ranges.reduce((out, r) => {
      if (r.low < LOCAL_SEQID) {
        if (!r.hi || r.hi < LOCAL_SEQID) {
          out.push(r);
        } else {
          // Clip hi to max allowed value.
          out.push({
            low: r.low,
            hi: this._maxSeq + 1
          });
        }
      }
      return out;
    }, []);

    // Send {del} message, return promise
    let result;
    if (tosend.length > 0) {
      result = this._tinode.delMessages(this.name, tosend, hard);
    } else {
      result = Promise.resolve({
        params: {
          del: 0
        }
      });
    }
    // Update local cache.
    return result.then((ctrl) => {
      if (ctrl.params.del > this._maxDel) {
        this._maxDel = ctrl.params.del;
      }

      ranges.map((r) => {
        if (r.hi) {
          this.flushMessageRange(r.low, r.hi);
        } else {
          this.flushMessage(r.low);
        }
      });

      this._updateDeletedRanges();

      if (this.onData) {
        // Calling with no parameters to indicate the messages were deleted.
        this.onData();
      }
      return ctrl;
    });
  },

  /**
   * Delete all messages. Hard-deleting messages requires Owner permission.
   * @memberof Tinode.Topic#
   *
   * @param {boolean} hardDel - true if messages should be hard-deleted.
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  delMessagesAll: function(hardDel) {
    if (!this._maxSeq || this._maxSeq <= 0) {
      // There are no messages to delete.
      return Promise.resolve();
    }
    return this.delMessages([{
      low: 1,
      hi: this._maxSeq + 1,
      _all: true
    }], hardDel);
  },

  /**
   * Delete multiple messages defined by their IDs. Hard-deleting messages requires Owner permission.
   * @memberof Tinode.Topic#
   *
   * @param {Tinode.DelRange[]} list - list of seq IDs to delete
   * @param {boolean=} hardDel - true if messages should be hard-deleted.
   *
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  delMessagesList: function(list, hardDel) {
    // Sort the list in ascending order
    list.sort((a, b) => a - b);
    // Convert the array of IDs to ranges.
    let ranges = list.reduce((out, id) => {
      if (out.length == 0) {
        // First element.
        out.push({
          low: id
        });
      } else {
        let prev = out[out.length - 1];
        if ((!prev.hi && (id != prev.low + 1)) || (id > prev.hi)) {
          // New range.
          out.push({
            low: id
          });
        } else {
          // Expand existing range.
          prev.hi = prev.hi ? Math.max(prev.hi, id + 1) : id + 1;
        }
      }
      return out;
    }, []);
    // Send {del} message, return promise
    return this.delMessages(ranges, hardDel)
  },

  /**
   * Delete topic. Requires Owner permission. Wrapper for {@link Tinode#delTopic}.
   * @memberof Tinode.Topic#
   *
   * @param {boolean} hard - had-delete topic.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to the request.
   */
  delTopic: function(hard) {
    return this._tinode.delTopic(this.name, hard).then((ctrl) => {
      this._resetSub();
      this._gone();
      return ctrl;
    });
  },

  /**
   * Delete subscription. Requires Share permission. Wrapper for {@link Tinode#delSubscription}.
   * @memberof Tinode.Topic#
   *
   * @param {string} user - ID of the user to remove subscription for.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  delSubscription: function(user) {
    if (!this._subscribed) {
      return Promise.reject(new Error("Cannot delete subscription in inactive topic"));
    }
    // Send {del} message, return promise
    return this._tinode.delSubscription(this.name, user).then((ctrl) => {
      // Remove the object from the subscription cache;
      delete this._users[user];
      // Notify listeners
      if (this.onSubsUpdated) {
        this.onSubsUpdated(Object.keys(this._users));
      }
      return ctrl;
    });
  },

  /**
   * Send a read/recv notification.
   * @memberof Tinode.Topic#
   *
   * @param {string} what - what notification to send: <code>recv</code>, <code>read</code>.
   * @param {number} seq - ID or the message read or received.
   */
  note: function(what, seq) {
    if (!this._subscribed) {
      // Cannot sending {note} on an inactive topic".
      return;
    }

    // Update local cache with the new count.
    const user = this._users[this._tinode.getCurrentUserID()];
    let update = false;
    if (user) {
      // Self-subscription is found.
      if (!user[what] || user[what] < seq) {
        user[what] = seq;
        update = true;
      }
    } else {
      // Self-subscription is not found.
      update = (this[what] | 0) < seq;
    }

    if (update) {
      // Send notification to the server.
      this._tinode.note(this.name, what, seq);
      // Update locally cached contact with the new count.
      this._updateReadRecv(what, seq);

      if (this.acs != null && !this.acs.isMuted()) {
        const me = this._tinode.getMeTopic();
        // Sent a notification to 'me' listeners.
        me._refreshContact(what, this);
      }
    }
  },

  /**
   * Send a 'recv' receipt. Wrapper for {@link Tinode#noteRecv}.
   * @memberof Tinode.Topic#
   *
   * @param {number} seq - ID of the message to aknowledge.
   */
  noteRecv: function(seq) {
    this.note('recv', seq);
  },

  /**
   * Send a 'read' receipt. Wrapper for {@link Tinode#noteRead}.
   * @memberof Tinode.Topic#
   *
   * @param {number} seq - ID of the message to aknowledge or 0/undefined to acknowledge the latest messages.
   */
  noteRead: function(seq) {
    seq = seq || this._maxSeq;
    if (seq > 0) {
      this.note('read', seq);
    }
  },

  /**
   * Send a key-press notification. Wrapper for {@link Tinode#noteKeyPress}.
   * @memberof Tinode.Topic#
   */
  noteKeyPress: function() {
    if (this._subscribed) {
      this._tinode.noteKeyPress(this.name);
    } else {
      this._tinode.logger("INFO: Cannot send notification in inactive topic");
    }
  },

  // Update cached read/recv/unread counts.
  _updateReadRecv: function(what, seq, ts) {
    let oldVal, doUpdate = false;

    seq = seq | 0;
    this.seq = this.seq | 0;
    this.read = this.read | 0;
    this.recv = this.recv | 0;
    switch (what) {
      case 'recv':
        oldVal = this.recv;
        this.recv = Math.max(this.recv, seq);
        doUpdate = (oldVal != this.recv);
        break;
      case 'read':
        oldVal = this.read;
        this.read = Math.max(this.read, seq);
        doUpdate = (oldVal != this.read);
        break;
      case 'msg':
        oldVal = this.seq;
        this.seq = Math.max(this.seq, seq);
        if (!this.touched || this.touched < ts) {
          this.touched = ts;
        }
        doUpdate = (oldVal != this.seq);
        break;
    }

    // Sanity checks.
    if (this.recv < this.read) {
      this.recv = this.read;
      doUpdate = true;
    }
    if (this.seq < this.recv) {
      this.seq = this.recv;
      if (!this.touched || this.touched < ts) {
        this.touched = ts;
      }
      doUpdate = true;
    }
    this.unread = this.seq - this.read;
    return doUpdate;
  },

  /**
   * Get user description from global cache. The user does not need to be a
   * subscriber of this topic.
   * @memberof Tinode.Topic#
   *
   * @param {string} uid - ID of the user to fetch.
   * @return {Object} user description or undefined.
   */
  userDesc: function(uid) {
    // TODO(gene): handle asynchronous requests

    const user = this._cacheGetUser(uid);
    if (user) {
      return user; // Promise.resolve(user)
    }
  },

  /**
   * Get description of the p2p peer from subscription cache.
   * @memberof Tinode.Topic#
   *
   * @return {Object} peer's description or undefined.
   */
  p2pPeerDesc: function() {
    if (!this.isP2PType()) {
      return undefined;
    }
    return this._users[this.name];
  },

  /**
   * Iterate over cached subscribers. If callback is undefined, use this.onMetaSub.
   * @memberof Tinode.Topic#
   *
   * @param {function} callback - Callback which will receive subscribers one by one.
   * @param {Object=} context - Value of `this` inside the `callback`.
   */
  subscribers: function(callback, context) {
    const cb = (callback || this.onMetaSub);
    if (cb) {
      for (let idx in this._users) {
        cb.call(context, this._users[idx], idx, this._users);
      }
    }
  },

  /**
   * Get a copy of cached tags.
   * @memberof Tinode.Topic#
   *
   * @return {Array.<string>} a copy of tags
   */
  tags: function() {
    // Return a copy.
    return this._tags.slice(0);
  },

  /**
   * Get cached subscription for the given user ID.
   * @memberof Tinode.Topic#
   *
   * @param {string} uid - id of the user to query for
   * @return user description or undefined.
   */
  subscriber: function(uid) {
    return this._users[uid];
  },

  /**
   * Iterate over cached messages. If callback is undefined, use this.onData.
   * @memberof Tinode.Topic#
   *
   * @param {function} callback - Callback which will receive messages one by one. See {@link Tinode.CBuffer#forEach}
   * @param {number} sinceId - Optional seqId to start iterating from (inclusive).
   * @param {number} beforeId - Optional seqId to stop iterating before (exclusive).
   * @param {Object} context - Value of `this` inside the `callback`.
   */
  messages: function(callback, sinceId, beforeId, context) {
    const cb = (callback || this.onData);
    if (cb) {
      let startIdx = typeof sinceId == 'number' ? this._messages.find({
        seq: sinceId
      }, true) : undefined;
      let beforeIdx = typeof beforeId == 'number' ? this._messages.find({
        seq: beforeId
      }, true) : undefined;
      if (startIdx != -1 && beforeIdx != -1) {
        this._messages.forEach(cb, startIdx, beforeIdx, context);
      }
    }
  },

  /**
   * Get the most recent message from cache.
   * @memberof Tinode.Topic#
   *
   * @param {boolen} skipDeleted - if the last message is a deleted range, get the one before it.
   * @returns {Object} the most recent cached message or <code>undefined</code>, if no messages are cached.
   */
  latestMessage: function(skipDeleted) {
    const msg = this._messages.getLast();
    if (!skipDeleted || !msg || msg._status != MESSAGE_STATUS_DEL_RANGE) {
      return msg;
    }
    return this._messages.getLast(1);
  },

  /**
   * Iterate over cached unsent messages. Wraps {@link Tinode.Topic#messages}.
   * @memberof Tinode.Topic#
   *
   * @param {function} callback - Callback which will receive messages one by one. See {@link Tinode.CBuffer#forEach}
   * @param {Object} context - Value of <code>this</code> inside the <code>callback</code>.
   */
  queuedMessages: function(callback, context) {
    if (!callback) {
      throw new Error("Callback must be provided");
    }
    this.messages(callback, LOCAL_SEQID, undefined, context);
  },

  /**
   * Get the number of topic subscribers who marked this message as either recv or read
   * Current user is excluded from the count.
   * @memberof Tinode.Topic#
   *
   * @param {string} what - what action to consider: received <code>"recv"</code> or read <code>"read"</code>.
   * @param {number} seq - ID or the message read or received.
   *
   * @returns {number} the number of subscribers who marked the message with the given ID as read or received.
   */
  msgReceiptCount: function(what, seq) {
    let count = 0;
    if (seq > 0) {
      const me = this._tinode.getCurrentUserID();
      for (let idx in this._users) {
        const user = this._users[idx];
        if (user.user !== me && user[what] >= seq) {
          count++;
        }
      }
    }
    return count;
  },

  /**
   * Get the number of topic subscribers who marked this message (and all older messages) as read.
   * The current user is excluded from the count.
   * @memberof Tinode.Topic#
   *
   * @param {number} seq - message id to check.
   * @returns {number} number of subscribers who claim to have received the message.
   */
  msgReadCount: function(seq) {
    return this.msgReceiptCount('read', seq);
  },

  /**
   * Get the number of topic subscribers who marked this message (and all older messages) as received.
   * The current user is excluded from the count.
   * @memberof Tinode.Topic#
   *
   * @param {number} seq - Message id to check.
   * @returns {number} Number of subscribers who claim to have received the message.
   */
  msgRecvCount: function(seq) {
    return this.msgReceiptCount('recv', seq);
  },

  /**
   * Check if cached message IDs indicate that the server may have more messages.
   * @memberof Tinode.Topic#
   *
   * @param {boolean} newer - if <code>true</code>, check for newer messages only.
   */
  msgHasMoreMessages: function(newer) {
    return newer ? this.seq > this._maxSeq :
      // _minSeq could be more than 1, but earlier messages could have been deleted.
      (this._minSeq > 1 && !this._noEarlierMsgs);
  },

  /**
   * Check if the given seq Id is id of the most recent message.
   * @memberof Tinode.Topic#
   *
   * @param {number} seqId id of the message to check
   */
  isNewMessage: function(seqId) {
    return this._maxSeq <= seqId;
  },

  /**
   * Remove one message from local cache.
   * @memberof Tinode.Topic#
   *
   * @param {number} seqId id of the message to remove from cache.
   * @returns {Message} removed message or undefined if such message was not found.
   */
  flushMessage: function(seqId) {
    const idx = this._messages.find({
      seq: seqId
    });
    if (idx >= 0) {
      this._tinode._db.remMessages(this.name, seqId);
      return this._messages.delAt(idx);
    }
    return undefined;
  },

  /**
   * Update message's seqId.
   * @memberof Tinode.Topic#
   *
   * @param {Object} pub message object.
   * @param {number} newSeqId new seq id for pub.
   */
  swapMessageId: function(pub, newSeqId) {
    const idx = this._messages.find(pub);
    const numMessages = this._messages.length();
    if (0 <= idx && idx < numMessages) {
      // Remove message with the old seq ID.
      this._messages.delAt(idx);
      this._tinode._db.remMessages(this.name, pub.seq);
      // Add message with the new seq ID.
      pub.seq = newSeqId;
      this._messages.put(pub);
      this._tinode._db.addMessage(pub);
    }
  },

  /**
   * Remove a range of messages from the local cache.
   * @memberof Tinode.Topic#
   *
   * @param {number} fromId seq ID of the first message to remove (inclusive).
   * @param {number} untilId seqID of the last message to remove (exclusive).
   *
   * @returns {Message[]} array of removed messages (could be empty).
   */
  flushMessageRange: function(fromId, untilId) {
    // Remove range from persistent cache.
    this._tinode._db.remMessages(this.name, fromId, untilId);
    // start, end: find insertion points (nearest == true).
    const since = this._messages.find({
      seq: fromId
    }, true);
    return since >= 0 ? this._messages.delRange(since, this._messages.find({
      seq: untilId
    }, true)) : [];
  },

  /**
   * Attempt to stop message from being sent.
   * @memberof Tinode.Topic#
   *
   * @param {number} seqId id of the message to stop sending and remove from cache.
   *
   * @returns {boolean} <code>true</code> if message was cancelled, <code>false</code> otherwise.
   */
  cancelSend: function(seqId) {
    const idx = this._messages.find({
      seq: seqId
    });
    if (idx >= 0) {
      const msg = this._messages.getAt(idx);
      const status = this.msgStatus(msg);
      if (status == MESSAGE_STATUS_QUEUED || status == MESSAGE_STATUS_FAILED) {
        this._tinode._db.remMessages(this.name, seqId);
        msg._cancelled = true;
        this._messages.delAt(idx);
        if (this.onData) {
          // Calling with no parameters to indicate the message was deleted.
          this.onData();
        }
        return true;
      }
    }
    return false;
  },

  /**
   * Get type of the topic: me, p2p, grp, fnd...
   * @memberof Tinode.Topic#
   *
   * @returns {string} One of 'me', 'p2p', 'grp', 'fnd', 'sys' or <code>undefined</code>.
   */
  getType: function() {
    return Tinode.topicType(this.name);
  },

  /**
   * Get current user's access mode of the topic.
   * @memberof Tinode.Topic#
   *
   * @returns {Tinode.AccessMode} - user's access mode
   */
  getAccessMode: function() {
    return this.acs;
  },

  /**
   * Set current user's access mode of the topic.
   * @memberof Tinode.Topic#
   *
   * @param {AccessMode | Object} acs - access mode to set.
   */
  setAccessMode: function(acs) {
    return this.acs = new AccessMode(acs);
  },

  /**
   * Get topic's default access mode.
   * @memberof Tinode.Topic#
   *
   * @returns {Tinode.DefAcs} - access mode, such as {auth: `RWP`, anon: `N`}.
   */
  getDefaultAccess: function() {
    return this.defacs;
  },

  /**
   * Initialize new meta {@link Tinode.GetQuery} builder. The query is attched to the current topic.
   * It will not work correctly if used with a different topic.
   * @memberof Tinode.Topic#
   *
   * @returns {Tinode.MetaGetBuilder} query attached to the current topic.
   */
  startMetaQuery: function() {
    return new MetaGetBuilder(this);
  },

  /**
   * Check if topic is archived, i.e. private.arch == true.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is archived, <code>false</code> otherwise.
   */
  isArchived: function() {
    return this.private && this.private.arch ? true : false;
  },

  /**
   * Check if topic is a 'me' topic.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is a 'me' topic, <code>false</code> otherwise.
   */
  isMeType: function() {
    return Tinode.isMeTopicName(this.name);
  },

  /**
   * Check if topic is a channel.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is a channel, <code>false</code> otherwise.
   */
  isChannelType: function() {
    return Tinode.isChannelTopicName(this.name);
  },

  /**
   * Check if topic is a group topic.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is a group, <code>false</code> otherwise.
   */
  isGroupType: function() {
    return Tinode.isGroupTopicName(this.name);
  },

  /**
   * Check if topic is a p2p topic.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is a p2p topic, <code>false</code> otherwise.
   */
  isP2PType: function() {
    return Tinode.isP2PTopicName(this.name);
  },

  /**
   * Check if topic is a communication topic, i.e. a group or p2p topic.
   * @memberof Tinode.Topic#
   *
   * @returns {boolean} - <code>true</code> if topic is a p2p or group topic, <code>false</code> otherwise.
   */
  isCommType: function() {
    return Tinode.isCommTopicName(this.name);
  },

  /**
   * Get status (queued, sent, received etc) of a given message in the context
   * of this topic.
   * @memberof Tinode.Topic#
   *
   * @param {Message} msg - message to check for status.
   * @param {boolean} upd - update chached message status.
   *
   * @returns message status constant.
   */
  msgStatus: function(msg, upd) {
    let status = MESSAGE_STATUS_NONE;
    if (this._tinode.isMe(msg.from)) {
      if (msg._sending) {
        status = MESSAGE_STATUS_SENDING;
      } else if (msg._failed || msg._cancelled) {
        status = MESSAGE_STATUS_FAILED;
      } else if (msg.seq >= LOCAL_SEQID) {
        status = MESSAGE_STATUS_QUEUED;
      } else if (this.msgReadCount(msg.seq) > 0) {
        status = MESSAGE_STATUS_READ;
      } else if (this.msgRecvCount(msg.seq) > 0) {
        status = MESSAGE_STATUS_RECEIVED;
      } else if (msg.seq > 0) {
        status = MESSAGE_STATUS_SENT;
      }
    } else if (msg._status == MESSAGE_STATUS_DEL_RANGE) {
      status == MESSAGE_STATUS_DEL_RANGE;
    } else {
      status = MESSAGE_STATUS_TO_ME;
    }

    if (upd && msg._status != status) {
      msg._status = status;
      this._tinode._db.updMessageStatus(this.name, msg.seq, status);
    }

    return status;
  },

  // Process data message
  _routeData: function(data) {
    if (data.content) {
      if (!this.touched || this.touched < data.ts) {
        this.touched = data.ts;
      }
    }

    if (data.seq > this._maxSeq) {
      this._maxSeq = data.seq;
    }
    if (data.seq < this._minSeq || this._minSeq == 0) {
      this._minSeq = data.seq;
    }

    if (!data._noForwarding) {
      this._messages.put(data);
      this._tinode._db.addMessage(data);
      this._updateDeletedRanges();
    }

    if (this.onData) {
      this.onData(data);
    }

    // Update locally cached contact with the new message count.
    const what = ((!this.isChannelType() && !data.from) || this._tinode.isMe(data.from)) ? 'read' : 'msg';
    this._updateReadRecv(what, data.seq, data.ts);
    // Notify 'me' listeners of the change.
    this._tinode.getMeTopic()._refreshContact(what, this);
  },

  // Process metadata message
  _routeMeta: function(meta) {
    if (meta.desc) {
      this._processMetaDesc(meta.desc);
    }
    if (meta.sub && meta.sub.length > 0) {
      this._processMetaSub(meta.sub);
    }
    if (meta.del) {
      this._processDelMessages(meta.del.clear, meta.del.delseq);
    }
    if (meta.tags) {
      this._processMetaTags(meta.tags);
    }
    if (meta.cred) {
      this._processMetaCreds(meta.cred);
    }
    if (this.onMeta) {
      this.onMeta(meta);
    }
  },

  // Process presence change message
  _routePres: function(pres) {
    let user;
    switch (pres.what) {
      case 'del':
        // Delete cached messages.
        this._processDelMessages(pres.clear, pres.delseq);
        break;
      case 'on':
      case 'off':
        // Update online status of a subscription.
        user = this._users[pres.src];
        if (user) {
          user.online = pres.what == 'on';
        } else {
          this._tinode.logger("WARNING: Presence update for an unknown user", this.name, pres.src);
        }
        break;
      case 'term':
        // Attachment to topic is terminated probably due to cluster rehashing.
        this._resetSub();
        break;
      case 'acs':
        const uid = pres.src || this._tinode.getCurrentUserID();
        user = this._users[uid];
        if (!user) {
          // Update for an unknown user: notification of a new subscription.
          const acs = new AccessMode().updateAll(pres.dacs);
          if (acs && acs.mode != AccessMode._NONE) {
            user = this._cacheGetUser(uid);
            if (!user) {
              user = {
                user: uid,
                acs: acs
              };
              this.getMeta(this.startMetaQuery().withOneSub(undefined, uid).build());
            } else {
              user.acs = acs;
            }
            user.updated = new Date();
            this._processMetaSub([user]);
          }
        } else {
          // Known user
          user.acs.updateAll(pres.dacs);
          // Update user's access mode.
          this._processMetaSub([{
            user: uid,
            updated: new Date(),
            acs: user.acs
          }]);
        }
        break;
      default:
        this._tinode.logger("INFO: Ignored presence update", pres.what);
    }

    if (this.onPres) {
      this.onPres(pres);
    }
  },

  // Process {info} message
  _routeInfo: function(info) {
    if (info.what !== 'kp') {
      const user = this._users[info.from];
      if (user) {
        user[info.what] = info.seq;
        if (user.recv < user.read) {
          user.recv = user.read;
        }
      }
      const msg = this.latestMessage();
      if (msg) {
        this.msgStatus(msg, true);
      }

      // If this is an update from the current user, update the cache with the new count.
      if (this._tinode.isMe(info.from)) {
        this._updateReadRecv(info.what, info.seq);
      }

      // Notify 'me' listener of the status change.
      this._tinode.getMeTopic()._refreshContact(info.what, this);
    }
    if (this.onInfo) {
      this.onInfo(info);
    }
  },

  // Called by Tinode when meta.desc packet is received.
  // Called by 'me' topic on contact update (desc._noForwarding is true).
  _processMetaDesc: function(desc) {
    if (this.isP2PType()) {
      // Synthetic desc may include defacs for p2p topics which is useless.
      // Remove it.
      delete desc.defacs;

      // Update to p2p desc is the same as user update. Update cached user.
      this._tinode._db.updUser(this.name, desc.public);
    }

    // Copy parameters from desc object to this topic.
    mergeObj(this, desc);
    // Make sure date fields are Date().
    stringToDate(this);
    // Update persistent cache.
    this._tinode._db.updTopic(this);

    // Notify 'me' listener, if available:
    if (this.name !== TOPIC_ME && !desc._noForwarding) {
      const me = this._tinode.getMeTopic();
      if (me.onMetaSub) {
        me.onMetaSub(this);
      }
      if (me.onSubsUpdated) {
        me.onSubsUpdated([this.name], 1);
      }
    }

    if (this.onMetaDesc) {
      this.onMetaDesc(this);
    }
  },

  // Called by Tinode when meta.sub is recived or in response to received
  // {ctrl} after setMeta-sub.
  _processMetaSub: function(subs) {
    for (let idx in subs) {
      const sub = subs[idx];

      // Fill defaults.
      sub.updated = new Date(sub.updated);
      sub.deleted = sub.deleted ? new Date(sub.deleted) : null;
      sub.online = !!sub.online;
      // Update timestamp of the most recent subscription update.
      this._lastSubsUpdate = new Date(Math.max(this._lastSubsUpdate, sub.updated));

      let user = null;
      if (!sub.deleted) {
        // If this is a change to user's own permissions, update them in topic too.
        // Desc will update 'me' topic.
        if (this._tinode.isMe(sub.user) && sub.acs) {
          this._processMetaDesc({
            updated: sub.updated,
            touched: sub.updated,
            acs: sub.acs
          });
        }
        user = this._updateCachedUser(sub.user, sub);
      } else {
        // Subscription is deleted, remove it from topic (but leave in Users cache)
        delete this._users[sub.user];
        user = sub;
      }

      if (this.onMetaSub) {
        this.onMetaSub(user);
      }
    }

    if (this.onSubsUpdated) {
      this.onSubsUpdated(Object.keys(this._users));
    }
  },

  // Called by Tinode when meta.tags is recived.
  _processMetaTags: function(tags) {
    if (tags.length == 1 && tags[0] == Tinode.DEL_CHAR) {
      tags = [];
    }
    this._tags = tags;
    if (this.onTagsUpdated) {
      this.onTagsUpdated(tags);
    }
  },

  // Do nothing for topics other than 'me'
  _processMetaCreds: function(creds) {},

  // Delete cached messages and update cached transaction IDs
  _processDelMessages: function(clear, delseq) {
    this._maxDel = Math.max(clear, this._maxDel);
    this.clear = Math.max(clear, this.clear);
    const topic = this;
    let count = 0;
    if (Array.isArray(delseq)) {
      delseq.map(function(range) {
        if (!range.hi) {
          count++;
          topic.flushMessage(range.low);
        } else {
          for (let i = range.low; i < range.hi; i++) {
            count++;
            topic.flushMessage(i);
          }
        }
      });
    }

    if (count > 0) {
      this._updateDeletedRanges();

      if (this.onData) {
        this.onData();
      }
    }
  },

  // Topic is informed that the entire response to {get what=data} has been received.
  _allMessagesReceived: function(count) {
    this._updateDeletedRanges();

    if (this.onAllMessagesReceived) {
      this.onAllMessagesReceived(count);
    }
  },

  // Reset subscribed state
  _resetSub: function() {
    this._subscribed = false;
  },

  // This topic is either deleted or unsubscribed from.
  _gone: function() {
    this._messages.reset();
    this._tinode._db.remMessages(this.name);
    this._users = {};
    this.acs = new AccessMode(null);
    this.private = null;
    this.public = null;
    this._maxSeq = 0;
    this._minSeq = 0;
    this._subscribed = false;

    const me = this._tinode.getMeTopic();
    if (me) {
      me._routePres({
        _noForwarding: true,
        what: 'gone',
        topic: TOPIC_ME,
        src: this.name
      });
    }
    if (this.onDeleteTopic) {
      this.onDeleteTopic();
    }
  },

  // Update global user cache and local subscribers cache.
  // Don't call this method for non-subscribers.
  _updateCachedUser: function(uid, obj) {
    // Fetch user object from the global cache.
    // This is a clone of the stored object
    let cached = this._cacheGetUser(uid);
    cached = mergeObj(cached || {}, obj);
    // Save to global cache
    this._cachePutUser(uid, cached);
    // Save to the list of topic subsribers.
    return mergeToCache(this._users, uid, cached);
  },

  // Get local seqId for a queued message.
  _getQueuedSeqId: function() {
    return this._queuedSeqId++;
  },

  // Calculate ranges of missing messages.
  _updateDeletedRanges: function() {
    const ranges = [];

    let prev = null;
    // Check for gap in the beginning, before the first message.
    const first = this._messages.getAt(0);
    if (first && this._minSeq > 1 && !this._noEarlierMsgs) {
      // Some messages are missing in the beginning.
      if (first.hi) {
        // The first message already represents a gap.
        if (first.seq > 1) {
          first.seq = 1;
        }
        if (first.hi < this._minSeq - 1) {
          first.hi = this._minSeq - 1;
        }
        prev = first;
      } else {
        // Create new gap.
        prev = {
          seq: 1,
          hi: this._minSeq - 1
        };
        ranges.push(prev);
      }
    } else {
      // No gap in the beginning.
      prev = {
        seq: 0,
        hi: 0
      };
    }

    // Find gaps in the list of received messages. The list contains messages-proper as well
    // as placeholers for deleted ranges.
    // The messages are iterated by seq ID in ascending order.
    this._messages.forEach((data) => {
      // Do not create a gap between the last sent message and the first unsent.
      if (data.seq >= LOCAL_SEQID) {
        return;
      }

      // New message is reducing the existing gap
      if (data.seq == (prev.hi || prev.seq) + 1) {
        // No new gap. Replace previous with current.
        prev = data;
        return;
      }

      // Found a new gap.
      if (prev.hi) {
        // Previous is also a gap, alter it.
        prev.hi = data.hi || data.seq;
        return;
      }

      // Previous is not a gap. Create a new gap.
      prev = {
        seq: (prev.hi || prev.seq) + 1,
        hi: data.hi || data.seq
      };
      ranges.push(prev);
    });

    // Check for missing messages at the end.
    // All messages could be missing or it could be a new topic with no messages.
    const last = this._messages.getLast();
    const maxSeq = Math.max(this.seq, this._maxSeq) || 0;
    if ((maxSeq > 0 && !last) || (last && ((last.hi || last.seq) < maxSeq))) {
      if (last && last.hi) {
        // Extend existing gap
        last.hi = maxSeq;
      } else {
        // Create new gap.
        ranges.push({
          seq: last ? last.seq + 1 : 1,
          hi: maxSeq
        });
      }
    }

    // Insert new gaps into cache.
    ranges.map((gap) => {
      gap._status = MESSAGE_STATUS_DEL_RANGE;
      this._messages.put(gap);
    });
  },

  // Load most recent messages from persistent cache.
  _loadMessages: function(db) {
    return db.readMessages(this.name, {
        limit: DEFAULT_MESSAGES_PAGE
      })
      .then((msgs) => {
        msgs.forEach((data) => {
          if (data.seq > this._maxSeq) {
            this._maxSeq = data.seq;
          }
          if (data.seq < this._minSeq || this._minSeq == 0) {
            this._minSeq = data.seq;
          }
          this._messages.put(data);
        });

        this._updateDeletedRanges();
        return this.name;
      });
  },

  // Push or {pres}: message received.
  _updateReceived: function(seq, act) {
    this.touched = new Date();
    this.seq = seq | 0;
    // Check if message is sent by the current user. If so it's been read already.
    if (!act || this._tinode.isMe(act)) {
      this.read = this.read ? Math.max(this.read, this.seq) : this.seq;
      this.recv = this.recv ? Math.max(this.read, this.recv) : this.read;
    }
    this.unread = this.seq - (this.read | 0);
    this._tinode._db.updTopic(this);
  }
};

/**
 * @class TopicMe - special case of {@link Tinode.Topic} for
 * managing data of the current user, including contact list.
 * @extends Tinode.Topic
 * @memberof Tinode
 *
 * @param {TopicMe.Callbacks} callbacks - Callbacks to receive various events.
 */
var TopicMe = function(callbacks) {
  Topic.call(this, TOPIC_ME, callbacks);

  // me-specific callbacks
  if (callbacks) {
    this.onContactUpdate = callbacks.onContactUpdate;
  }
};

// Inherit everyting from the generic Topic
TopicMe.prototype = Object.create(Topic.prototype, {
  // Override the original Topic._processMetaDesc.
  _processMetaDesc: {
    value: function(desc) {
      // Check if online contacts need to be turned off because P permission was removed.
      const turnOff = (desc.acs && !desc.acs.isPresencer()) && (this.acs && this.acs.isPresencer());

      // Copy parameters from desc object to this topic.
      mergeObj(this, desc);
      this._tinode._db.updTopic(this);

      // String datetime headers to Date() objects.
      stringToDate(this);

      // 'P' permission was removed. All topics are offline now.
      if (turnOff) {
        this._tinode.cacheMap('topic', (cont) => {
          if (cont.online) {
            cont.online = false;
            if (cont.seen) {
              cont.seen.when = new Date();
            } else {
              cont.seen = {
                when: new Date()
              };
            }
            this._refreshContact('off', cont);
          }
        });
      }

      if (this.onMetaDesc) {
        this.onMetaDesc(this);
      }
    },
    enumerable: true,
    configurable: true
  },

  // Override the original Topic._processMetaSub
  _processMetaSub: {
    value: function(subs) {
      let updateCount = 0;
      subs.forEach((sub) => {
        const topicName = sub.topic;
        // Don't show 'me' and 'fnd' topics in the list of contacts.
        if (topicName == TOPIC_FND || topicName == TOPIC_ME) {
          return;
        }
        sub.updated = new Date(sub.updated);
        sub.touched = sub.touched ? new Date(sub.touched) : undefined;
        sub.deleted = sub.deleted ? new Date(sub.deleted) : null;
        sub.online = !!sub.online;

        let cont = null;
        if (sub.deleted) {
          cont = sub;
          this._tinode.cacheDel('topic', topicName);
          this._tinode._db.remTopic(topicName);
        } else {
          // Ensure the values are defined and are integers.
          if (typeof sub.seq != 'undefined') {
            sub.seq = sub.seq | 0;
            sub.recv = sub.recv | 0;
            sub.read = sub.read | 0;
            sub.unread = sub.seq - sub.read;
          }

          if (sub.seen && sub.seen.when) {
            sub.seen.when = new Date(sub.seen.when);
          }

          cont = mergeObj(this._tinode.getTopic(topicName), sub);
          this._tinode._db.updTopic(cont);

          if (Tinode.isP2PTopicName(topicName)) {
            this._cachePutUser(topicName, cont);
            this._tinode._db.updUser(topicName, cont.public);
          }
          // Notify topic of the update if it's an external update.
          if (!sub._noForwarding) {
            const topic = this._tinode.getTopic(topicName);
            if (topic) {
              sub._noForwarding = true;
              topic._processMetaDesc(sub);
            }
          }
        }

        updateCount++;

        if (this.onMetaSub) {
          this.onMetaSub(cont);
        }
      });

      if (this.onSubsUpdated && updateCount > 0) {
        const keys = [];
        subs.forEach((s) => {
          keys.push(s.topic);
        });
        this.onSubsUpdated(keys, updateCount);
      }
    },
    enumerable: true,
    configurable: true
  },

  // Called by Tinode when meta.sub is recived.
  _processMetaCreds: {
    value: function(creds, upd) {
      if (creds.length == 1 && creds[0] == Tinode.DEL_CHAR) {
        creds = [];
      }
      if (upd) {
        creds.map((cr) => {
          if (cr.val) {
            // Adding a credential.
            let idx = this._credentials.findIndex((el) => {
              return el.meth == cr.meth && el.val == cr.val;
            });
            if (idx < 0) {
              // Not found.
              if (!cr.done) {
                // Unconfirmed credential replaces previous unconfirmed credential of the same method.
                idx = this._credentials.findIndex((el) => {
                  return el.meth == cr.meth && !el.done;
                });
                if (idx >= 0) {
                  // Remove previous unconfirmed credential.
                  this._credentials.splice(idx, 1);
                }
              }
              this._credentials.push(cr);
            } else {
              // Found. Maybe change 'done' status.
              this._credentials[idx].done = cr.done;
            }
          } else if (cr.resp) {
            // Handle credential confirmation.
            const idx = this._credentials.findIndex((el) => {
              return el.meth == cr.meth && !el.done;
            });
            if (idx >= 0) {
              this._credentials[idx].done = true;
            }
          }
        });
      } else {
        this._credentials = creds;
      }
      if (this.onCredsUpdated) {
        this.onCredsUpdated(this._credentials);
      }
    },
    enumerable: true,
    configurable: true
  },

  // Process presence change message
  _routePres: {
    value: function(pres) {
      if (pres.what == 'term') {
        // The 'me' topic itself is detached. Mark as unsubscribed.
        this._resetSub();
        return;
      }

      if (pres.what == 'upd' && pres.src == TOPIC_ME) {
        // Update to me's description. Request updated value.
        this.getMeta(this.startMetaQuery().withDesc().build());
        return;
      }

      const cont = this._tinode.cacheGet('topic', pres.src);
      if (cont) {
        switch (pres.what) {
          case 'on': // topic came online
            cont.online = true;
            break;
          case 'off': // topic went offline
            if (cont.online) {
              cont.online = false;
              if (cont.seen) {
                cont.seen.when = new Date();
              } else {
                cont.seen = {
                  when: new Date()
                };
              }
            }
            break;
          case 'msg': // new message received
            cont._updateReceived(pres.seq, pres.act);
            break;
          case 'upd': // desc updated
            // Request updated subscription.
            this.getMeta(this.startMetaQuery().withLaterOneSub(pres.src).build());
            break;
          case 'acs': // access mode changed
            if (cont.acs) {
              cont.acs.updateAll(pres.dacs);
            } else {
              cont.acs = new AccessMode().updateAll(pres.dacs);
            }
            cont.touched = new Date();
            break;
          case 'ua':
            // user agent changed.
            cont.seen = {
              when: new Date(),
              ua: pres.ua
            };
            break;
          case 'recv':
            // user's other session marked some messges as received.
            pres.seq = pres.seq | 0;
            cont.recv = cont.recv ? Math.max(cont.recv, pres.seq) : pres.seq;
            break;
          case 'read':
            // user's other session marked some messages as read.
            pres.seq = pres.seq | 0;
            cont.read = cont.read ? Math.max(cont.read, pres.seq) : pres.seq;
            cont.recv = cont.recv ? Math.max(cont.read, cont.recv) : cont.recv;
            cont.unread = cont.seq - cont.read;
            break;
          case 'gone':
            // topic deleted or unsubscribed from.
            this._tinode.cacheDel('topic', pres.src);
            this._tinode._db.remTopic(pres.src);
            break;
          case 'del':
            // Update topic.del value.
            break;
          default:
            this._tinode.logger("INFO: Unsupported presence update in 'me'", pres.what);
        }

        this._refreshContact(pres.what, cont);
      } else {
        if (pres.what == 'acs') {
          // New subscriptions and deleted/banned subscriptions have full
          // access mode (no + or - in the dacs string). Changes to known subscriptions are sent as
          // deltas, but they should not happen here.
          const acs = new AccessMode(pres.dacs);
          if (!acs || acs.mode == AccessMode._INVALID) {
            this._tinode.logger("ERROR: Invalid access mode update", pres.src, pres.dacs);
            return;
          } else if (acs.mode == AccessMode._NONE) {
            this._tinode.logger("WARNING: Removing non-existent subscription", pres.src, pres.dacs);
            return;
          } else {
            // New subscription. Send request for the full description.
            // Using .withOneSub (not .withLaterOneSub) to make sure IfModifiedSince is not set.
            this.getMeta(this.startMetaQuery().withOneSub(undefined, pres.src).build());
            // Create a dummy entry to catch online status update.
            const dummy = this._tinode.getTopic(pres.src);
            dummy.touched = new Date();
            dummy.topic = pres.src;
            dummy.online = false;
            dummy.acs = acs;
            this._tinode.attachCacheToTopic(dummy);
            dummy._cachePutSelf();
            this._db.updTopic(dummy);
          }
        } else if (pres.what == 'tags') {
          this.getMeta(this.startMetaQuery().withTags().build());
        }
      }

      if (this.onPres) {
        this.onPres(pres);
      }
    },
    enumerable: true,
    configurable: true
  },

  // Contact is updated, execute callbacks.
  _refreshContact: {
    value: function(what, cont) {
      if (this.onContactUpdate) {
        this.onContactUpdate(what, cont);
      }
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Publishing to TopicMe is not supported. {@link Topic#publish} is overriden and thows an {Error} if called.
   * @memberof Tinode.TopicMe#
   * @throws {Error} Always throws an error.
   */
  publish: {
    value: function() {
      return Promise.reject(new Error("Publishing to 'me' is not supported"));
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Delete validation credential.
   * @memberof Tinode.TopicMe#
   *
   * @param {string} topic - Name of the topic to delete
   * @param {string} user - User ID to remove.
   * @returns {Promise} Promise which will be resolved/rejected on receiving server reply.
   */
  delCredential: {
    value: function(method, value) {
      if (!this._subscribed) {
        return Promise.reject(new Error("Cannot delete credential in inactive 'me' topic"));
      }
      // Send {del} message, return promise
      return this._tinode.delCredential(method, value).then((ctrl) => {
        // Remove deleted credential from the cache.
        const index = this._credentials.findIndex((el) => {
          return el.meth == method && el.val == value;
        });
        if (index > -1) {
          this._credentials.splice(index, 1);
        }
        // Notify listeners
        if (this.onCredsUpdated) {
          this.onCredsUpdated(this._credentials);
        }
        return ctrl;
      });

    },
    enumerable: true,
    configurable: true
  },

  /**
   * @callback contactFilter
   * @param {Object} contact to check for inclusion.
   * @returns {boolean} <code>true</code> if contact should be processed, <code>false</code> to exclude it.
   */
  /**
   * Iterate over cached contacts.
   *
   * @function
   * @memberof Tinode.TopicMe#
   * @param {TopicMe.ContactCallback} callback - Callback to call for each contact.
   * @param {contactFilter=} filter - Optionally filter contacts; include all if filter is false-ish, otherwise
   *      include those for which filter returns true-ish.
   * @param {Object=} context - Context to use for calling the `callback`, i.e. the value of `this` inside the callback.
   */
  contacts: {
    value: function(callback, filter, context) {
      this._tinode.cacheMap('topic', (c, idx) => {
        if (c.isCommType() && (!filter || filter(c))) {
          callback.call(context, c, idx);
        }
      });
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Get a contact from cache.
   * @memberof Tinode.TopicMe#
   *
   * @param {string} name - Name of the contact to get, either a UID (for p2p topics) or a topic name.
   * @returns {Tinode.Contact} - Contact or `undefined`.
   */
  getContact: {
    value: function(name) {
      return this._tinode.cacheGet('topic', name);
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Get access mode of a given contact from cache.
   * @memberof Tinode.TopicMe#
   *
   * @param {string} name - Name of the contact to get access mode for, either a UID (for p2p topics)
   *        or a topic name; if missing, access mode for the 'me' topic itself.
   * @returns {string} - access mode, such as `RWP`.
   */
  getAccessMode: {
    value: function(name) {
      if (name) {
        const cont = this._tinode.cacheGet('topic', name);
        return cont ? cont.acs : null;
      }
      return this.acs;
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Check if contact is archived, i.e. contact.private.arch == true.
   * @memberof Tinode.TopicMe#
   *
   * @param {string} name - Name of the contact to check archived status, either a UID (for p2p topics) or a topic name.
   * @returns {boolean} - true if contact is archived, false otherwise.
   */
  isArchived: {
    value: function(name) {
      const cont = this._tinode.cacheGet('topic', name);
      return cont ? ((cont.private && cont.private.arch) ? true : false) : null;
    },
    enumerable: true,
    configurable: true
  },

  /**
   * @typedef Tinode.Credential
   * @memberof Tinode
   * @type Object
   * @property {string} meth - validation method such as 'email' or 'tel'.
   * @property {string} val - credential value, i.e. 'jdoe@example.com' or '+17025551234'
   * @property {boolean} done - true if credential is validated.
   */
  /**
   * Get the user's credentials: email, phone, etc.
   * @memberof Tinode.TopicMe#
   *
   * @returns {Tinode.Credential[]} - array of credentials.
   */
  getCredentials: {
    value: function() {
      return this._credentials;
    },
    enumerable: true,
    configurable: true
  }
});
TopicMe.prototype.constructor = TopicMe;

/**
 * @class TopicFnd - special case of {@link Tinode.Topic} for searching for
 * contacts and group topics.
 * @extends Tinode.Topic
 * @memberof Tinode
 *
 * @param {TopicFnd.Callbacks} callbacks - Callbacks to receive various events.
 */
var TopicFnd = function(callbacks) {
  Topic.call(this, TOPIC_FND, callbacks);
  // List of users and topics uid or topic_name -> Contact object)
  this._contacts = {};
};

// Inherit everyting from the generic Topic
TopicFnd.prototype = Object.create(Topic.prototype, {
  // Override the original Topic._processMetaSub
  _processMetaSub: {
    value: function(subs) {
      let updateCount = Object.getOwnPropertyNames(this._contacts).length;
      // Reset contact list.
      this._contacts = {};
      for (let idx in subs) {
        let sub = subs[idx];
        const indexBy = sub.topic ? sub.topic : sub.user;

        sub.updated = new Date(sub.updated);
        if (sub.seen && sub.seen.when) {
          sub.seen.when = new Date(sub.seen.when);
        }

        sub = mergeToCache(this._contacts, indexBy, sub);
        updateCount++;

        if (this.onMetaSub) {
          this.onMetaSub(sub);
        }
      }

      if (updateCount > 0 && this.onSubsUpdated) {
        this.onSubsUpdated(Object.keys(this._contacts));
      }
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Publishing to TopicFnd is not supported. {@link Topic#publish} is overriden and thows an {Error} if called.
   * @memberof Tinode.TopicFnd#
   * @throws {Error} Always throws an error.
   */
  publish: {
    value: function() {
      return Promise.reject(new Error("Publishing to 'fnd' is not supported"));
    },
    enumerable: true,
    configurable: true
  },

  /**
   * setMeta to TopicFnd resets contact list in addition to sending the message.
   * @memberof Tinode.TopicFnd#
   * @param {Tinode.SetParams} params parameters to update.
   * @returns {Promise} Promise to be resolved/rejected when the server responds to request.
   */
  setMeta: {
    value: function(params) {
      const instance = this;
      return Object.getPrototypeOf(TopicFnd.prototype).setMeta.call(this, params).then(function() {
        if (Object.keys(instance._contacts).length > 0) {
          instance._contacts = {};
          if (instance.onSubsUpdated) {
            instance.onSubsUpdated([]);
          }
        }
      });
    },
    enumerable: true,
    configurable: true
  },

  /**
   * Iterate over found contacts. If callback is undefined, use {@link this.onMetaSub}.
   * @function
   * @memberof Tinode.TopicFnd#
   * @param {TopicFnd.ContactCallback} callback - Callback to call for each contact.
   * @param {Object} context - Context to use for calling the `callback`, i.e. the value of `this` inside the callback.
   */
  contacts: {
    value: function(callback, context) {
      const cb = (callback || this.onMetaSub);
      if (cb) {
        for (let idx in this._contacts) {
          cb.call(context, this._contacts[idx], idx, this._contacts);
        }
      }
    },
    enumerable: true,
    configurable: true
  }
});
TopicFnd.prototype.constructor = TopicFnd;

/**
 * @class Message - definition a communication message.
 * Work in progress.
 * @memberof Tinode
 *
 * @param {string} topic_ - name of the topic the message belongs to.
 * @param {string | Drafty} content_ - message contant.
 */
var Message = function(topic_, content_) {
  this.status = Message.STATUS_NONE;
  this.topic = topic_;
  this.content = content_;
}

Message.STATUS_NONE = MESSAGE_STATUS_NONE;
Message.STATUS_QUEUED = MESSAGE_STATUS_QUEUED;
Message.STATUS_SENDING = MESSAGE_STATUS_SENDING;
Message.STATUS_FAILED = MESSAGE_STATUS_FAILED;
Message.STATUS_SENT = MESSAGE_STATUS_SENT;
Message.STATUS_RECEIVED = MESSAGE_STATUS_RECEIVED;
Message.STATUS_READ = MESSAGE_STATUS_READ;
Message.STATUS_TO_ME = MESSAGE_STATUS_TO_ME;

Message.prototype = {
  /**
   * Convert message object to {pub} packet.
   */
  toJSON: function() {

  },
  /**
   * Parse JSON into message.
   */
  fromJSON: function(json) {

  }
}
Message.prototype.constructor = Message;

if (typeof module != 'undefined') {
  module.exports = Tinode;
  module.exports.Drafty = Drafty;
  module.exports.AccessMode = AccessMode;
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../version.json":9,"./access-mode.js":1,"./cbuffer.js":2,"./connection.js":3,"./db.js":4,"./drafty.js":5,"./large-file.js":6,"./meta-builder.js":7}],9:[function(require,module,exports){
module.exports={"version": "0.17.2"}

},{}]},{},[8])(8)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYWNjZXNzLW1vZGUuanMiLCJzcmMvY2J1ZmZlci5qcyIsInNyYy9jb25uZWN0aW9uLmpzIiwic3JjL2RiLmpzIiwic3JjL2RyYWZ0eS5qcyIsInNyYy9sYXJnZS1maWxlLmpzIiwic3JjL21ldGEtYnVpbGRlci5qcyIsInNyYy90aW5vZGUuanMiLCJ2ZXJzaW9uLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5bEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDejlJQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBAZmlsZSBBY2Nlc3MgY29udHJvbCBtb2RlbC5cbiAqXG4gKiBAY29weXJpZ2h0IDIwMTUtMjAyMSBUaW5vZGVcbiAqIEBzdW1tYXJ5IEphdmFzY3JpcHQgYmluZGluZ3MgZm9yIFRpbm9kZS5cbiAqIEBsaWNlbnNlIEFwYWNoZSAyLjBcbiAqIEB2ZXJzaW9uIDAuMTdcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyBOT1RFIFRPIERFVkVMT1BFUlM6XG4vLyBMb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBkb3VibGUgcXVvdGVkIFwi0YHRgtGA0L7QutCwINC90LAg0LTRgNGD0LPQvtC8INGP0LfRi9C60LVcIixcbi8vIG5vbi1sb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBzaW5nbGUgcXVvdGVkICdub24tbG9jYWxpemVkJy5cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgZm9yIGhhbmRsaW5nIGFjY2VzcyBtb2RlLlxuICpcbiAqIEBjbGFzcyBBY2Nlc3NNb2RlXG4gKiBAbWVtYmVyb2YgVGlub2RlXG4gKlxuICogQHBhcmFtIHtBY2Nlc3NNb2RlfE9iamVjdD19IGFjcyAtIEFjY2Vzc01vZGUgdG8gY29weSBvciBhY2Nlc3MgbW9kZSBvYmplY3QgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLlxuICovXG5jb25zdCBBY2Nlc3NNb2RlID0gZnVuY3Rpb24oYWNzKSB7XG4gIGlmIChhY3MpIHtcbiAgICB0aGlzLmdpdmVuID0gdHlwZW9mIGFjcy5naXZlbiA9PSAnbnVtYmVyJyA/IGFjcy5naXZlbiA6IEFjY2Vzc01vZGUuZGVjb2RlKGFjcy5naXZlbik7XG4gICAgdGhpcy53YW50ID0gdHlwZW9mIGFjcy53YW50ID09ICdudW1iZXInID8gYWNzLndhbnQgOiBBY2Nlc3NNb2RlLmRlY29kZShhY3Mud2FudCk7XG4gICAgdGhpcy5tb2RlID0gYWNzLm1vZGUgPyAodHlwZW9mIGFjcy5tb2RlID09ICdudW1iZXInID8gYWNzLm1vZGUgOiBBY2Nlc3NNb2RlLmRlY29kZShhY3MubW9kZSkpIDpcbiAgICAgICh0aGlzLmdpdmVuICYgdGhpcy53YW50KTtcbiAgfVxufTtcblxuQWNjZXNzTW9kZS5fTk9ORSA9IDB4MDA7XG5BY2Nlc3NNb2RlLl9KT0lOID0gMHgwMTtcbkFjY2Vzc01vZGUuX1JFQUQgPSAweDAyO1xuQWNjZXNzTW9kZS5fV1JJVEUgPSAweDA0O1xuQWNjZXNzTW9kZS5fUFJFUyA9IDB4MDg7XG5BY2Nlc3NNb2RlLl9BUFBST1ZFID0gMHgxMDtcbkFjY2Vzc01vZGUuX1NIQVJFID0gMHgyMDtcbkFjY2Vzc01vZGUuX0RFTEVURSA9IDB4NDA7XG5BY2Nlc3NNb2RlLl9PV05FUiA9IDB4ODA7XG5cbkFjY2Vzc01vZGUuX0JJVE1BU0sgPSBBY2Nlc3NNb2RlLl9KT0lOIHwgQWNjZXNzTW9kZS5fUkVBRCB8IEFjY2Vzc01vZGUuX1dSSVRFIHwgQWNjZXNzTW9kZS5fUFJFUyB8XG4gIEFjY2Vzc01vZGUuX0FQUFJPVkUgfCBBY2Nlc3NNb2RlLl9TSEFSRSB8IEFjY2Vzc01vZGUuX0RFTEVURSB8IEFjY2Vzc01vZGUuX09XTkVSO1xuQWNjZXNzTW9kZS5fSU5WQUxJRCA9IDB4MTAwMDAwO1xuXG5BY2Nlc3NNb2RlLl9jaGVja0ZsYWcgPSBmdW5jdGlvbih2YWwsIHNpZGUsIGZsYWcpIHtcbiAgc2lkZSA9IHNpZGUgfHwgJ21vZGUnO1xuICBpZiAoWydnaXZlbicsICd3YW50JywgJ21vZGUnXS5pbmNsdWRlcyhzaWRlKSkge1xuICAgIHJldHVybiAoKHZhbFtzaWRlXSAmIGZsYWcpICE9IDApO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBBY2Nlc3NNb2RlIGNvbXBvbmVudCAnJHtzaWRlfSdgKTtcbn1cblxuLyoqXG4gKiBQYXJzZSBzdHJpbmcgaW50byBhbiBhY2Nlc3MgbW9kZSB2YWx1ZS5cbiAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nIHwgTnVtYmVyfSBtb2RlIC0gZWl0aGVyIGEgU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBhY2Nlc3MgbW9kZSB0byBwYXJzZSBvciBhIHNldCBvZiBiaXRzIHRvIGFzc2lnbi5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IC0gQWNjZXNzIG1vZGUgYXMgYSBudW1lcmljIHZhbHVlLlxuICovXG5BY2Nlc3NNb2RlLmRlY29kZSA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzdHIgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gc3RyICYgQWNjZXNzTW9kZS5fQklUTUFTSztcbiAgfSBlbHNlIGlmIChzdHIgPT09ICdOJyB8fCBzdHIgPT09ICduJykge1xuICAgIHJldHVybiBBY2Nlc3NNb2RlLl9OT05FO1xuICB9XG5cbiAgY29uc3QgYml0bWFzayA9IHtcbiAgICAnSic6IEFjY2Vzc01vZGUuX0pPSU4sXG4gICAgJ1InOiBBY2Nlc3NNb2RlLl9SRUFELFxuICAgICdXJzogQWNjZXNzTW9kZS5fV1JJVEUsXG4gICAgJ1AnOiBBY2Nlc3NNb2RlLl9QUkVTLFxuICAgICdBJzogQWNjZXNzTW9kZS5fQVBQUk9WRSxcbiAgICAnUyc6IEFjY2Vzc01vZGUuX1NIQVJFLFxuICAgICdEJzogQWNjZXNzTW9kZS5fREVMRVRFLFxuICAgICdPJzogQWNjZXNzTW9kZS5fT1dORVJcbiAgfTtcblxuICBsZXQgbTAgPSBBY2Nlc3NNb2RlLl9OT05FO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYml0ID0gYml0bWFza1tzdHIuY2hhckF0KGkpLnRvVXBwZXJDYXNlKCldO1xuICAgIGlmICghYml0KSB7XG4gICAgICAvLyBVbnJlY29nbml6ZWQgYml0LCBza2lwLlxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIG0wIHw9IGJpdDtcbiAgfVxuICByZXR1cm4gbTA7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgbnVtZXJpYyByZXByZXNlbnRhdGlvbiBvZiB0aGUgYWNjZXNzIG1vZGUgaW50byBhIHN0cmluZy5cbiAqXG4gKiBAbWVtYmVyb2YgVGlub2RlLkFjY2Vzc01vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIC0gYWNjZXNzIG1vZGUgdmFsdWUgdG8gY29udmVydCB0byBhIHN0cmluZy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gQWNjZXNzIG1vZGUgYXMgYSBzdHJpbmcuXG4gKi9cbkFjY2Vzc01vZGUuZW5jb2RlID0gZnVuY3Rpb24odmFsKSB7XG4gIGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSBBY2Nlc3NNb2RlLl9JTlZBTElEKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAodmFsID09PSBBY2Nlc3NNb2RlLl9OT05FKSB7XG4gICAgcmV0dXJuICdOJztcbiAgfVxuXG4gIGNvbnN0IGJpdG1hc2sgPSBbJ0onLCAnUicsICdXJywgJ1AnLCAnQScsICdTJywgJ0QnLCAnTyddO1xuICBsZXQgcmVzID0gJyc7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYml0bWFzay5sZW5ndGg7IGkrKykge1xuICAgIGlmICgodmFsICYgKDEgPDwgaSkpICE9IDApIHtcbiAgICAgIHJlcyA9IHJlcyArIGJpdG1hc2tbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBudW1lcmljIHJlcHJlc2VudGF0aW9uIG9mIGFjY2VzcyBtb2RlIHdpdGggdGhlIG5ldyB2YWx1ZS4gVGhlIHZhbHVlXG4gKiBpcyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAqICAtIGEgc3RyaW5nIHN0YXJ0aW5nIHdpdGggPGNvZGU+JysnPC9jb2RlPiBvciA8Y29kZT4nLSc8L2NvZGU+IHRoZW4gdGhlIGJpdHMgdG8gYWRkIG9yIHJlbW92ZSwgZS5nLiA8Y29kZT4nK1ItVyc8L2NvZGU+IG9yIDxjb2RlPictUFMnPC9jb2RlPi5cbiAqICAtIGEgbmV3IHZhbHVlIG9mIGFjY2VzcyBtb2RlXG4gKlxuICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCAtIGFjY2VzcyBtb2RlIHZhbHVlIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1cGQgLSB1cGRhdGUgdG8gYXBwbHkgdG8gdmFsLlxuICogQHJldHVybnMge251bWJlcn0gLSB1cGRhdGVkIGFjY2VzcyBtb2RlLlxuICovXG5BY2Nlc3NNb2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKHZhbCwgdXBkKSB7XG4gIGlmICghdXBkIHx8IHR5cGVvZiB1cGQgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgbGV0IGFjdGlvbiA9IHVwZC5jaGFyQXQoMCk7XG4gIGlmIChhY3Rpb24gPT0gJysnIHx8IGFjdGlvbiA9PSAnLScpIHtcbiAgICBsZXQgdmFsMCA9IHZhbDtcbiAgICAvLyBTcGxpdCBkZWx0YS1zdHJpbmcgbGlrZSAnK0FCQy1ERUYrWicgaW50byBhbiBhcnJheSBvZiBwYXJ0cyBpbmNsdWRpbmcgKyBhbmQgLS5cbiAgICBjb25zdCBwYXJ0cyA9IHVwZC5zcGxpdCgvKFstK10pLyk7XG4gICAgLy8gU3RhcnRpbmcgaXRlcmF0aW9uIGZyb20gMSBiZWNhdXNlIFN0cmluZy5zcGxpdCgpIGNyZWF0ZXMgYW4gYXJyYXkgd2l0aCB0aGUgZmlyc3QgZW1wdHkgZWxlbWVudC5cbiAgICAvLyBJdGVyYXRpbmcgYnkgMiBiZWNhdXNlIHdlIHBhcnNlIHBhaXJzICsvLSB0aGVuIGRhdGEuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGggLSAxOyBpICs9IDIpIHtcbiAgICAgIGFjdGlvbiA9IHBhcnRzW2ldO1xuICAgICAgY29uc3QgbTAgPSBBY2Nlc3NNb2RlLmRlY29kZShwYXJ0c1tpICsgMV0pO1xuICAgICAgaWYgKG0wID09IEFjY2Vzc01vZGUuX0lOVkFMSUQpIHtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgIH1cbiAgICAgIGlmIChtMCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGFjdGlvbiA9PT0gJysnKSB7XG4gICAgICAgIHZhbDAgfD0gbTA7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIHZhbDAgJj0gfm0wO1xuICAgICAgfVxuICAgIH1cbiAgICB2YWwgPSB2YWwwO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoZSBzdHJpbmcgaXMgYW4gZXhwbGljaXQgbmV3IHZhbHVlICdBQkMnIHJhdGhlciB0aGFuIGRlbHRhLlxuICAgIGNvbnN0IHZhbDAgPSBBY2Nlc3NNb2RlLmRlY29kZSh1cGQpO1xuICAgIGlmICh2YWwwICE9IEFjY2Vzc01vZGUuX0lOVkFMSUQpIHtcbiAgICAgIHZhbCA9IHZhbDA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogQml0cyBwcmVzZW50IGluIGExIGJ1dCBtaXNzaW5nIGluIGEyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqXG4gKiBAcGFyYW0ge251bWJlciB8IHN0cmluZ30gYTEgLSBhY2Nlc3MgbW9kZSB0byBzdWJ0cmFjdCBmcm9tLlxuICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IGEyIC0gYWNjZXNzIG1vZGUgdG8gc3VidHJhY3QuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhY2Nlc3MgbW9kZSB3aXRoIGJpdHMgcHJlc2VudCBpbiA8Y29kZT5hMTwvY29kZT4gYnV0IG1pc3NpbmcgaW4gPGNvZGU+YTI8L2NvZGU+LlxuICovXG5BY2Nlc3NNb2RlLmRpZmYgPSBmdW5jdGlvbihhMSwgYTIpIHtcbiAgYTEgPSBBY2Nlc3NNb2RlLmRlY29kZShhMSk7XG4gIGEyID0gQWNjZXNzTW9kZS5kZWNvZGUoYTIpO1xuXG4gIGlmIChhMSA9PSBBY2Nlc3NNb2RlLl9JTlZBTElEIHx8IGEyID09IEFjY2Vzc01vZGUuX0lOVkFMSUQpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5fSU5WQUxJRDtcbiAgfVxuICByZXR1cm4gYTEgJiB+YTI7XG59O1xuXG4vKipcbiAqIEFjY2Vzc01vZGUgaXMgYSBjbGFzcyByZXByZXNlbnRpbmcgdG9waWMgYWNjZXNzIG1vZGUuXG4gKlxuICogQG1lbWJlcm9mIFRpbm9kZVxuICogQGNsYXNzIEFjY2Vzc01vZGVcbiAqL1xuQWNjZXNzTW9kZS5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiBDdXN0b20gZm9ybWF0dGVyXG4gICAqL1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICd7XCJtb2RlXCI6IFwiJyArIEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMubW9kZSkgK1xuICAgICAgJ1wiLCBcImdpdmVuXCI6IFwiJyArIEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMuZ2l2ZW4pICtcbiAgICAgICdcIiwgXCJ3YW50XCI6IFwiJyArIEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMud2FudCkgKyAnXCJ9JztcbiAgfSxcbiAgLyoqXG4gICAqIENvbnZlcnRzIG51bWVyaWMgdmFsdWVzIHRvIHN0cmluZ3MuXG4gICAqL1xuICBqc29uSGVscGVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbW9kZTogQWNjZXNzTW9kZS5lbmNvZGUodGhpcy5tb2RlKSxcbiAgICAgIGdpdmVuOiBBY2Nlc3NNb2RlLmVuY29kZSh0aGlzLmdpdmVuKSxcbiAgICAgIHdhbnQ6IEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMud2FudClcbiAgICB9O1xuICB9LFxuICAvKipcbiAgICogQXNzaWduIHZhbHVlIHRvICdtb2RlJy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nIHwgTnVtYmVyfSBtIC0gZWl0aGVyIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBhY2Nlc3MgbW9kZSBvciBhIHNldCBvZiBiaXRzLlxuICAgKiBAcmV0dXJucyB7QWNjZXNzTW9kZX0gLSA8Y29kZT50aGlzPC9jb2RlPiBBY2Nlc3NNb2RlLlxuICAgKi9cbiAgc2V0TW9kZTogZnVuY3Rpb24obSkge1xuICAgIHRoaXMubW9kZSA9IEFjY2Vzc01vZGUuZGVjb2RlKG0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvKipcbiAgICogVXBkYXRlIDxjb2RlPm1vZGU8L2NvZGU+IHZhbHVlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkFjY2Vzc01vZGVcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHUgLSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNoYW5nZXMgdG8gYXBwbHkgdG8gYWNjZXNzIG1vZGUuXG4gICAqIEByZXR1cm5zIHtBY2Nlc3NNb2RlfSAtIDxjb2RlPnRoaXM8L2NvZGU+IEFjY2Vzc01vZGUuXG4gICAqL1xuICB1cGRhdGVNb2RlOiBmdW5jdGlvbih1KSB7XG4gICAgdGhpcy5tb2RlID0gQWNjZXNzTW9kZS51cGRhdGUodGhpcy5tb2RlLCB1KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLyoqXG4gICAqIEdldCA8Y29kZT5tb2RlPC9jb2RlPiB2YWx1ZSBhcyBhIHN0cmluZy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gPGNvZGU+bW9kZTwvY29kZT4gdmFsdWUuXG4gICAqL1xuICBnZXRNb2RlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5lbmNvZGUodGhpcy5tb2RlKTtcbiAgfSxcblxuICAvKipcbiAgICogQXNzaWduIDxjb2RlPmdpdmVuPC9jb2RlPiAgdmFsdWUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZyB8IE51bWJlcn0gZyAtIGVpdGhlciBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgYWNjZXNzIG1vZGUgb3IgYSBzZXQgb2YgYml0cy5cbiAgICogQHJldHVybnMge0FjY2Vzc01vZGV9IC0gPGNvZGU+dGhpczwvY29kZT4gQWNjZXNzTW9kZS5cbiAgICovXG4gIHNldEdpdmVuOiBmdW5jdGlvbihnKSB7XG4gICAgdGhpcy5naXZlbiA9IEFjY2Vzc01vZGUuZGVjb2RlKGcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvKipcbiAgICogVXBkYXRlICdnaXZlbicgdmFsdWUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdSAtIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2hhbmdlcyB0byBhcHBseSB0byBhY2Nlc3MgbW9kZS5cbiAgICogQHJldHVybnMge0FjY2Vzc01vZGV9IC0gPGNvZGU+dGhpczwvY29kZT4gQWNjZXNzTW9kZS5cbiAgICovXG4gIHVwZGF0ZUdpdmVuOiBmdW5jdGlvbih1KSB7XG4gICAgdGhpcy5naXZlbiA9IEFjY2Vzc01vZGUudXBkYXRlKHRoaXMuZ2l2ZW4sIHUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvKipcbiAgICogR2V0ICdnaXZlbicgdmFsdWUgYXMgYSBzdHJpbmcuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIDxiPmdpdmVuPC9iPiB2YWx1ZS5cbiAgICovXG4gIGdldEdpdmVuOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5lbmNvZGUodGhpcy5naXZlbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFzc2lnbiAnd2FudCcgdmFsdWUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZyB8IE51bWJlcn0gdyAtIGVpdGhlciBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgYWNjZXNzIG1vZGUgb3IgYSBzZXQgb2YgYml0cy5cbiAgICogQHJldHVybnMge0FjY2Vzc01vZGV9IC0gPGNvZGU+dGhpczwvY29kZT4gQWNjZXNzTW9kZS5cbiAgICovXG4gIHNldFdhbnQ6IGZ1bmN0aW9uKHcpIHtcbiAgICB0aGlzLndhbnQgPSBBY2Nlc3NNb2RlLmRlY29kZSh3KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgLyoqXG4gICAqIFVwZGF0ZSAnd2FudCcgdmFsdWUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdSAtIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2hhbmdlcyB0byBhcHBseSB0byBhY2Nlc3MgbW9kZS5cbiAgICogQHJldHVybnMge0FjY2Vzc01vZGV9IC0gPGNvZGU+dGhpczwvY29kZT4gQWNjZXNzTW9kZS5cbiAgICovXG4gIHVwZGF0ZVdhbnQ6IGZ1bmN0aW9uKHUpIHtcbiAgICB0aGlzLndhbnQgPSBBY2Nlc3NNb2RlLnVwZGF0ZSh0aGlzLndhbnQsIHUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICAvKipcbiAgICogR2V0ICd3YW50JyB2YWx1ZSBhcyBhIHN0cmluZy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gPGI+d2FudDwvYj4gdmFsdWUuXG4gICAqL1xuICBnZXRXYW50OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5lbmNvZGUodGhpcy53YW50KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHBlcm1pc3Npb25zIHByZXNlbnQgaW4gJ3dhbnQnIGJ1dCBtaXNzaW5nIGluICdnaXZlbicuXG4gICAqIEludmVyc2Ugb2Yge0BsaW5rIFRpbm9kZS5BY2Nlc3NNb2RlI2dldEV4Y2Vzc2l2ZX1cbiAgICpcbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IHBlcm1pc3Npb25zIHByZXNlbnQgaW4gPGI+d2FudDwvYj4gYnV0IG1pc3NpbmcgaW4gPGI+Z2l2ZW48L2I+LlxuICAgKi9cbiAgZ2V0TWlzc2luZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMud2FudCAmIH50aGlzLmdpdmVuKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHBlcm1pc3Npb25zIHByZXNlbnQgaW4gJ2dpdmVuJyBidXQgbWlzc2luZyBpbiAnd2FudCcuXG4gICAqIEludmVyc2Ugb2Yge0BsaW5rIFRpbm9kZS5BY2Nlc3NNb2RlI2dldE1pc3Npbmd9XG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBwZXJtaXNzaW9ucyBwcmVzZW50IGluIDxiPmdpdmVuPC9iPiBidXQgbWlzc2luZyBpbiA8Yj53YW50PC9iPi5cbiAgICovXG4gIGdldEV4Y2Vzc2l2ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEFjY2Vzc01vZGUuZW5jb2RlKHRoaXMuZ2l2ZW4gJiB+dGhpcy53YW50KTtcbiAgfSxcblxuICAvKipcbiAgICogVXBkYXRlICd3YW50JywgJ2dpdmUnLCBhbmQgJ21vZGUnIHZhbHVlcy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqXG4gICAqIEBwYXJhbSB7QWNjZXNzTW9kZX0gdmFsIC0gbmV3IGFjY2VzcyBtb2RlIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7QWNjZXNzTW9kZX0gLSA8Y29kZT50aGlzPC9jb2RlPiBBY2Nlc3NNb2RlLlxuICAgKi9cbiAgdXBkYXRlQWxsOiBmdW5jdGlvbih2YWwpIHtcbiAgICBpZiAodmFsKSB7XG4gICAgICB0aGlzLnVwZGF0ZUdpdmVuKHZhbC5naXZlbik7XG4gICAgICB0aGlzLnVwZGF0ZVdhbnQodmFsLndhbnQpO1xuICAgICAgdGhpcy5tb2RlID0gdGhpcy5naXZlbiAmIHRoaXMud2FudDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIE93bmVyIChPKSBmbGFnIGlzIHNldC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gc2lkZSAtIHdoaWNoIHBlcm1pc3Npb24gdG8gY2hlY2s6IGdpdmVuLCB3YW50LCBtb2RlOyBkZWZhdWx0OiBtb2RlLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSA8Y29kZT50cnVlPC9jb2RlPiBpZiBmbGFnIGlzIHNldC5cbiAgICovXG4gIGlzT3duZXI6IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5fY2hlY2tGbGFnKHRoaXMsIHNpZGUsIEFjY2Vzc01vZGUuX09XTkVSKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgUHJlc2VuY2UgKFApIGZsYWcgaXMgc2V0LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkFjY2Vzc01vZGVcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBzaWRlIC0gd2hpY2ggcGVybWlzc2lvbiB0byBjaGVjazogZ2l2ZW4sIHdhbnQsIG1vZGU7IGRlZmF1bHQ6IG1vZGUuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAtIDxjb2RlPnRydWU8L2NvZGU+IGlmIGZsYWcgaXMgc2V0LlxuICAgKi9cbiAgaXNQcmVzZW5jZXI6IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5fY2hlY2tGbGFnKHRoaXMsIHNpZGUsIEFjY2Vzc01vZGUuX1BSRVMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBQcmVzZW5jZSAoUCkgZmxhZyBpcyBOT1Qgc2V0LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkFjY2Vzc01vZGVcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBzaWRlIC0gd2hpY2ggcGVybWlzc2lvbiB0byBjaGVjazogZ2l2ZW4sIHdhbnQsIG1vZGU7IGRlZmF1bHQ6IG1vZGUuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAtIDxjb2RlPnRydWU8L2NvZGU+IGlmIGZsYWcgaXMgc2V0LlxuICAgKi9cbiAgaXNNdXRlZDogZnVuY3Rpb24oc2lkZSkge1xuICAgIHJldHVybiAhdGhpcy5pc1ByZXNlbmNlcihzaWRlKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgSm9pbiAoSikgZmxhZyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc0pvaW5lcjogZnVuY3Rpb24oc2lkZSkge1xuICAgIHJldHVybiBBY2Nlc3NNb2RlLl9jaGVja0ZsYWcodGhpcywgc2lkZSwgQWNjZXNzTW9kZS5fSk9JTik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIFJlYWRlciAoUikgZmxhZyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc1JlYWRlcjogZnVuY3Rpb24oc2lkZSkge1xuICAgIHJldHVybiBBY2Nlc3NNb2RlLl9jaGVja0ZsYWcodGhpcywgc2lkZSwgQWNjZXNzTW9kZS5fUkVBRCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIFdyaXRlciAoVykgZmxhZyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc1dyaXRlcjogZnVuY3Rpb24oc2lkZSkge1xuICAgIHJldHVybiBBY2Nlc3NNb2RlLl9jaGVja0ZsYWcodGhpcywgc2lkZSwgQWNjZXNzTW9kZS5fV1JJVEUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBBcHByb3ZlciAoQSkgZmxhZyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc0FwcHJvdmVyOiBmdW5jdGlvbihzaWRlKSB7XG4gICAgcmV0dXJuIEFjY2Vzc01vZGUuX2NoZWNrRmxhZyh0aGlzLCBzaWRlLCBBY2Nlc3NNb2RlLl9BUFBST1ZFKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgZWl0aGVyIG9uZSBvZiBPd25lciAoTykgb3IgQXBwcm92ZXIgKEEpIGZsYWdzIGlzIHNldC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5BY2Nlc3NNb2RlXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gc2lkZSAtIHdoaWNoIHBlcm1pc3Npb24gdG8gY2hlY2s6IGdpdmVuLCB3YW50LCBtb2RlOyBkZWZhdWx0OiBtb2RlLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSA8Y29kZT50cnVlPC9jb2RlPiBpZiBmbGFnIGlzIHNldC5cbiAgICovXG4gIGlzQWRtaW46IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICByZXR1cm4gdGhpcy5pc093bmVyKHNpZGUpIHx8IHRoaXMuaXNBcHByb3ZlcihzaWRlKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgZWl0aGVyIG9uZSBvZiBPd25lciAoTyksIEFwcHJvdmVyIChBKSwgb3IgU2hhcmVyIChTKSBmbGFncyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc1NoYXJlcjogZnVuY3Rpb24oc2lkZSkge1xuICAgIHJldHVybiB0aGlzLmlzQWRtaW4oc2lkZSkgfHwgQWNjZXNzTW9kZS5fY2hlY2tGbGFnKHRoaXMsIHNpZGUsIEFjY2Vzc01vZGUuX1NIQVJFKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgRGVsZXRlciAoRCkgZmxhZyBpcyBzZXQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQWNjZXNzTW9kZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IHNpZGUgLSB3aGljaCBwZXJtaXNzaW9uIHRvIGNoZWNrOiBnaXZlbiwgd2FudCwgbW9kZTsgZGVmYXVsdDogbW9kZS5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgZmxhZyBpcyBzZXQuXG4gICAqL1xuICBpc0RlbGV0ZXI6IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICByZXR1cm4gQWNjZXNzTW9kZS5fY2hlY2tGbGFnKHRoaXMsIHNpZGUsIEFjY2Vzc01vZGUuX0RFTEVURSk7XG4gIH1cbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gQWNjZXNzTW9kZTtcbn1cbiIsIi8qKlxuICogQGZpbGUgSW4tbWVtb3J5IHNvcnRlZCBjYWNoZSBvZiBvYmplY3RzLlxuICpcbiAqIEBjb3B5cmlnaHQgMjAxNS0yMDIxIFRpbm9kZVxuICogQHN1bW1hcnkgSmF2YXNjcmlwdCBiaW5kaW5ncyBmb3IgVGlub2RlLlxuICogQGxpY2Vuc2UgQXBhY2hlIDIuMFxuICogQHZlcnNpb24gMC4xN1xuICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogSW4tbWVtb3J5IHNvcnRlZCBjYWNoZSBvZiBvYmplY3RzLlxuICpcbiAqIEBjbGFzcyBDQnVmZmVyXG4gKiBAbWVtYmVyb2YgVGlub2RlXG4gKiBAcHJvdGVjdGVkXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY29tcGFyZSBjdXN0b20gY29tcGFyYXRvciBvZiBvYmplY3RzLiBUYWtlcyB0d28gcGFyYW1ldGVycyA8Y29kZT5hPC9jb2RlPiBhbmQgPGNvZGU+YjwvY29kZT47XG4gKiAgICByZXR1cm5zIDxjb2RlPi0xPC9jb2RlPiBpZiA8Y29kZT5hIDwgYjwvY29kZT4sIDxjb2RlPjA8L2NvZGU+IGlmIDxjb2RlPmEgPT0gYjwvY29kZT4sIDxjb2RlPjE8L2NvZGU+IG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdW5pcXVlIGVuZm9yY2UgZWxlbWVudCB1bmlxdWVuZXNzOiB3aGVuIDxjb2RlPnRydWU8L2NvZGU+IHJlcGxhY2UgZXhpc3RpbmcgZWxlbWVudCB3aXRoIGEgbmV3XG4gKiAgICBvbmUgb24gY29uZmxpY3Q7IHdoZW4gPGNvZGU+ZmFsc2U8L2NvZGU+IGtlZXAgYm90aCBlbGVtZW50cy5cbiAqL1xuY29uc3QgQ0J1ZmZlciA9IGZ1bmN0aW9uKGNvbXBhcmUsIHVuaXF1ZSkge1xuICBsZXQgYnVmZmVyID0gW107XG5cbiAgY29tcGFyZSA9IGNvbXBhcmUgfHwgZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhID09PSBiID8gMCA6IGEgPCBiID8gLTEgOiAxO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGZpbmROZWFyZXN0KGVsZW0sIGFyciwgZXhhY3QpIHtcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGxldCBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBsZXQgcGl2b3QgPSAwO1xuICAgIGxldCBkaWZmID0gMDtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcblxuICAgIHdoaWxlIChzdGFydCA8PSBlbmQpIHtcbiAgICAgIHBpdm90ID0gKHN0YXJ0ICsgZW5kKSAvIDIgfCAwO1xuICAgICAgZGlmZiA9IGNvbXBhcmUoYXJyW3Bpdm90XSwgZWxlbSk7XG4gICAgICBpZiAoZGlmZiA8IDApIHtcbiAgICAgICAgc3RhcnQgPSBwaXZvdCArIDE7XG4gICAgICB9IGVsc2UgaWYgKGRpZmYgPiAwKSB7XG4gICAgICAgIGVuZCA9IHBpdm90IC0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWR4OiBwaXZvdCxcbiAgICAgICAgZXhhY3Q6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChleGFjdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWR4OiAtMVxuICAgICAgfTtcbiAgICB9XG4gICAgLy8gTm90IGV4YWN0IC0gaW5zZXJ0aW9uIHBvaW50XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkeDogZGlmZiA8IDAgPyBwaXZvdCArIDEgOiBwaXZvdFxuICAgIH07XG4gIH1cblxuICAvLyBJbnNlcnQgZWxlbWVudCBpbnRvIGEgc29ydGVkIGFycmF5LlxuICBmdW5jdGlvbiBpbnNlcnRTb3J0ZWQoZWxlbSwgYXJyKSB7XG4gICAgY29uc3QgZm91bmQgPSBmaW5kTmVhcmVzdChlbGVtLCBhcnIsIGZhbHNlKTtcbiAgICBjb25zdCBjb3VudCA9IChmb3VuZC5leGFjdCAmJiB1bmlxdWUpID8gMSA6IDA7XG4gICAgYXJyLnNwbGljZShmb3VuZC5pZHgsIGNvdW50LCBlbGVtKTtcbiAgICByZXR1cm4gYXJyO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBHZXQgYW4gZWxlbWVudCBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhdCAtIFBvc2l0aW9uIHRvIGZldGNoIGZyb20uXG4gICAgICogQHJldHVybnMge09iamVjdH0gRWxlbWVudCBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24gb3IgPGNvZGU+dW5kZWZpbmVkPC9jb2RlPi5cbiAgICAgKi9cbiAgICBnZXRBdDogZnVuY3Rpb24oYXQpIHtcbiAgICAgIHJldHVybiBidWZmZXJbYXRdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZW5pZW5jZSBtZXRob2QgZm9yIGdldHRpbmcgdGhlIGVsZW1lbnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXIuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhdCAtIHBvc2l0aW9uIHRvIGZldGNoIGZyb20sIGNvdW50aW5nIGZyb20gdGhlIGVuZDtcbiAgICAgKiAgICA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IG9yIDxjb2RlPm51bGw8L2NvZGU+ICBtZWFuIFwibGFzdFwiLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBsYXN0IGVsZW1lbnQgaW4gdGhlIGJ1ZmZlciBvciA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IGlmIGJ1ZmZlciBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBnZXRMYXN0OiBmdW5jdGlvbihhdCkge1xuICAgICAgYXQgfD0gMDtcbiAgICAgIHJldHVybiBidWZmZXIubGVuZ3RoID4gYXQgPyBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDEgLSBhdF0gOiB1bmRlZmluZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBuZXcgZWxlbWVudChzKSB0byB0aGUgYnVmZmVyLiBWYXJpYWRpYzogdGFrZXMgb25lIG9yIG1vcmUgYXJndW1lbnRzLiBJZiBhbiBhcnJheSBpcyBwYXNzZWQgYXMgYSBzaW5nbGVcbiAgICAgKiBhcmd1bWVudCwgaXRzIGVsZW1lbnRzIGFyZSBpbnNlcnRlZCBpbmRpdmlkdWFsbHkuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqXG4gICAgICogQHBhcmFtIHsuLi5PYmplY3R8QXJyYXl9IC0gT25lIG9yIG1vcmUgb2JqZWN0cyB0byBpbnNlcnQuXG4gICAgICovXG4gICAgcHV0OiBmdW5jdGlvbigpIHtcbiAgICAgIGxldCBpbnNlcnQ7XG4gICAgICAvLyBpbnNwZWN0IGFyZ3VtZW50czogaWYgYXJyYXksIGluc2VydCBpdHMgZWxlbWVudHMsIGlmIG9uZSBvciBtb3JlIG5vbi1hcnJheSBhcmd1bWVudHMsIGluc2VydCB0aGVtIG9uZSBieSBvbmVcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEgJiYgQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIGluc2VydCA9IGFyZ3VtZW50c1swXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2VydCA9IGFyZ3VtZW50cztcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGlkeCBpbiBpbnNlcnQpIHtcbiAgICAgICAgaW5zZXJ0U29ydGVkKGluc2VydFtpZHhdLCBidWZmZXIpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgZWxlbWVudCBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhdCAtIFBvc2l0aW9uIHRvIGRlbGV0ZSBhdC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBFbGVtZW50IGF0IHRoZSBnaXZlbiBwb3NpdGlvbiBvciA8Y29kZT51bmRlZmluZWQ8L2NvZGU+LlxuICAgICAqL1xuICAgIGRlbEF0OiBmdW5jdGlvbihhdCkge1xuICAgICAgbGV0IHIgPSBidWZmZXIuc3BsaWNlKGF0LCAxKTtcbiAgICAgIGlmIChyICYmIHIubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gclswXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBlbGVtZW50cyBiZXR3ZWVuIHR3byBwb3NpdGlvbnMuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzaW5jZSAtIFBvc2l0aW9uIHRvIGRlbGV0ZSBmcm9tIChpbmNsdXNpdmUpLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBiZWZvcmUgLSBQb3NpdGlvbiB0byBkZWxldGUgdG8gKGV4Y2x1c2l2ZSkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IGFycmF5IG9mIHJlbW92ZWQgZWxlbWVudHMgKGNvdWxkIGJlIHplcm8gbGVuZ3RoKS5cbiAgICAgKi9cbiAgICBkZWxSYW5nZTogZnVuY3Rpb24oc2luY2UsIGJlZm9yZSkge1xuICAgICAgcmV0dXJuIGJ1ZmZlci5zcGxpY2Uoc2luY2UsIGJlZm9yZSAtIHNpbmNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdGhlIGJ1ZmZlciBob2xkcy5cbiAgICAgKiBAbWVtYmVyb2YgVGlub2RlLkNCdWZmZXIjXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBOdW1iZXIgb2YgZWxlbWVudHMgaW4gdGhlIGJ1ZmZlci5cbiAgICAgKi9cbiAgICBsZW5ndGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGJ1ZmZlci5sZW5ndGg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRoZSBidWZmZXIgZGlzY2FyZGluZyBhbGwgZWxlbWVudHNcbiAgICAgKiBAbWVtYmVyb2YgVGlub2RlLkNCdWZmZXIjXG4gICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgYnVmZmVyID0gW107XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBpdGVyYXRpbmcgY29udGVudHMgb2YgYnVmZmVyLiBTZWUge0BsaW5rIFRpbm9kZS5DQnVmZmVyI2ZvckVhY2h9LlxuICAgICAqIEBjYWxsYmFjayBGb3JFYWNoQ2FsbGJhY2tUeXBlXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0gRWxlbWVudCBvZiB0aGUgYnVmZmVyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIEluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBnaXZlbiA8Y29kZT5jYWxsYmFjazwvY29kZT4gdG8gYWxsIGVsZW1lbnRzIG9mIHRoZSBidWZmZXIuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5DQnVmZmVyI1xuICAgICAqXG4gICAgICogQHBhcmFtIHtUaW5vZGUuRm9yRWFjaENhbGxiYWNrVHlwZX0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0SWR4IC0gT3B0aW9uYWwgaW5kZXggdG8gc3RhcnQgaXRlcmF0aW5nIGZyb20gKGluY2x1c2l2ZSkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJlZm9yZUlkeCAtIE9wdGlvbmFsIGluZGV4IHRvIHN0b3AgaXRlcmF0aW5nIGJlZm9yZSAoZXhjbHVzaXZlKS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIGNhbGxpbmcgY29udGV4dCAoaS5lLiB2YWx1ZSBvZiA8Y29kZT50aGlzPC9jb2RlPiBpbiBjYWxsYmFjaylcbiAgICAgKi9cbiAgICBmb3JFYWNoOiBmdW5jdGlvbihjYWxsYmFjaywgc3RhcnRJZHgsIGJlZm9yZUlkeCwgY29udGV4dCkge1xuICAgICAgc3RhcnRJZHggPSBzdGFydElkeCB8IDA7XG4gICAgICBiZWZvcmVJZHggPSBiZWZvcmVJZHggfHwgYnVmZmVyLmxlbmd0aDtcbiAgICAgIGZvciAobGV0IGkgPSBzdGFydElkeDsgaSA8IGJlZm9yZUlkeDsgaSsrKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgYnVmZmVyW2ldLCBpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBlbGVtZW50IGluIGJ1ZmZlciB1c2luZyBidWZmZXIncyBjb21wYXJpc29uIGZ1bmN0aW9uLlxuICAgICAqIEBtZW1iZXJvZiBUaW5vZGUuQ0J1ZmZlciNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0gZWxlbWVudCB0byBmaW5kLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbj19IG5lYXJlc3QgLSB3aGVuIHRydWUgYW5kIGV4YWN0IG1hdGNoIGlzIG5vdCBmb3VuZCwgcmV0dXJuIHRoZSBuZWFyZXN0IGVsZW1lbnQgKGluc2VydGlvbiBwb2ludCkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gaW5kZXggb2YgdGhlIGVsZW1lbnQgaW4gdGhlIGJ1ZmZlciBvciAtMS5cbiAgICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbihlbGVtLCBuZWFyZXN0KSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkeFxuICAgICAgfSA9IGZpbmROZWFyZXN0KGVsZW0sIGJ1ZmZlciwgIW5lYXJlc3QpO1xuICAgICAgcmV0dXJuIGlkeDtcbiAgICB9XG4gIH1cbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBDQnVmZmVyO1xufVxuIiwiLyoqXG4gKiBAZmlsZSBBYnN0cmFjdGlvbiBsYXllciBmb3Igd2Vic29ja2V0IGFuZCBsb25nIHBvbGxpbmcgY29ubmVjdGlvbnMuXG4gKiBTZWUgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS90aW5vZGUvd2ViYXBwXCI+aHR0cHM6Ly9naXRodWIuY29tL3Rpbm9kZS93ZWJhcHA8L2E+IGZvciByZWFsLWxpZmUgdXNhZ2UuXG4gKlxuICogQGNvcHlyaWdodCAyMDE1LTIwMjEgVGlub2RlXG4gKiBAc3VtbWFyeSBKYXZhc2NyaXB0IGJpbmRpbmdzIGZvciBUaW5vZGUuXG4gKiBAbGljZW5zZSBBcGFjaGUgMi4wXG4gKiBAdmVyc2lvbiAwLjE3XG4gKi9cbid1c2Ugc3RyaWN0JztcblxubGV0IFdlYlNvY2tldFByb3ZpZGVyO1xubGV0IFhIUlByb3ZpZGVyO1xuXG4vLyBFcnJvciBjb2RlIHRvIHJldHVybiBpbiBjYXNlIG9mIGEgbmV0d29yayBwcm9ibGVtLlxuY29uc3QgTkVUV09SS19FUlJPUiA9IDUwMztcbmNvbnN0IE5FVFdPUktfRVJST1JfVEVYVCA9IFwiQ29ubmVjdGlvbiBmYWlsZWRcIjtcblxuLy8gRXJyb3IgY29kZSB0byByZXR1cm4gd2hlbiB1c2VyIGRpc2Nvbm5lY3RlZCBmcm9tIHNlcnZlci5cbmNvbnN0IE5FVFdPUktfVVNFUiA9IDQxODtcbmNvbnN0IE5FVFdPUktfVVNFUl9URVhUID0gXCJEaXNjb25uZWN0ZWQgYnkgY2xpZW50XCI7XG5cbi8vIEhlbHBlciBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYW4gZW5kcG9pbnQgVVJMLlxuZnVuY3Rpb24gbWFrZUJhc2VVcmwoaG9zdCwgcHJvdG9jb2wsIHZlcnNpb24sIGFwaUtleSkge1xuICBsZXQgdXJsID0gbnVsbDtcblxuICBpZiAoWydodHRwJywgJ2h0dHBzJywgJ3dzJywgJ3dzcyddLmluY2x1ZGVzKHByb3RvY29sKSkge1xuICAgIHVybCA9IGAke3Byb3RvY29sfTovLyR7aG9zdH1gO1xuICAgIGlmICh1cmwuY2hhckF0KHVybC5sZW5ndGggLSAxKSAhPT0gJy8nKSB7XG4gICAgICB1cmwgKz0gJy8nO1xuICAgIH1cbiAgICB1cmwgKz0gJ3YnICsgdmVyc2lvbiArICcvY2hhbm5lbHMnO1xuICAgIGlmIChbJ2h0dHAnLCAnaHR0cHMnXS5pbmNsdWRlcyhwcm90b2NvbCkpIHtcbiAgICAgIC8vIExvbmcgcG9sbGluZyBlbmRwb2ludCBlbmRzIHdpdGggXCJscFwiLCBpLmUuXG4gICAgICAvLyAnL3YwL2NoYW5uZWxzL2xwJyB2cyBqdXN0ICcvdjAvY2hhbm5lbHMnIGZvciB3c1xuICAgICAgdXJsICs9ICcvbHAnO1xuICAgIH1cbiAgICB1cmwgKz0gJz9hcGlrZXk9JyArIGFwaUtleTtcbiAgfVxuXG4gIHJldHVybiB1cmw7XG59XG5cbi8qKlxuICogQW4gYWJzdHJhY3Rpb24gZm9yIGEgd2Vic29ja2V0IG9yIGEgbG9uZyBwb2xsaW5nIGNvbm5lY3Rpb24uXG4gKlxuICogQGNsYXNzIENvbm5lY3Rpb25cbiAqIEBtZW1iZXJvZiBUaW5vZGVcblxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuaG9zdCAtIEhvc3QgbmFtZSBhbmQgb3B0aW9uYWwgcG9ydCBudW1iZXIgdG8gY29ubmVjdCB0by5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuYXBpS2V5IC0gQVBJIGtleSBnZW5lcmF0ZWQgYnkgPGNvZGU+a2V5Z2VuPC9jb2RlPi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcudHJhbnNwb3J0IC0gTmV0d29yayB0cmFuc3BvcnQgdG8gdXNlLCBlaXRoZXIgPGNvZGU+XCJ3c1wiPGNvZGU+Lzxjb2RlPlwid3NzXCI8L2NvZGU+IGZvciB3ZWJzb2NrZXQgb3JcbiAqICAgICAgPGNvZGU+bHA8L2NvZGU+IGZvciBsb25nIHBvbGxpbmcuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGNvbmZpZy5zZWN1cmUgLSBVc2UgU2VjdXJlIFdlYlNvY2tldCBpZiA8Y29kZT50cnVlPC9jb2RlPi5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2ZXJzaW9uXyAtIE1ham9yIHZhbHVlIG9mIHRoZSBwcm90b2NvbCB2ZXJzaW9uLCBlLmcuICcwJyBpbiAnMC4xNy4xJy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b3JlY29ubmVjdF8gLSBJZiBjb25uZWN0aW9uIGlzIGxvc3QsIHRyeSB0byByZWNvbm5lY3QgYXV0b21hdGljYWxseS5cbiAqL1xuLy8gY29uZmlnLmhvc3QsIFBST1RPQ09MX1ZFUlNJT04sIGNvbmZpZy5hcGlLZXksIGNvbmZpZy50cmFuc3BvcnQsIGNvbmZpZy5zZWN1cmUsIHRydWVcbmNvbnN0IENvbm5lY3Rpb24gPSBmdW5jdGlvbihjb25maWcsIHZlcnNpb25fLCBhdXRvcmVjb25uZWN0Xykge1xuICBjb25zdCBob3N0ID0gY29uZmlnLmhvc3Q7XG4gIGNvbnN0IHNlY3VyZSA9IGNvbmZpZy5zZWN1cmU7XG4gIGNvbnN0IGFwaUtleSA9IGNvbmZpZy5hcGlLZXk7XG5cbiAgY29uc3QgdmVyc2lvbiA9IHZlcnNpb25fO1xuICBjb25zdCBhdXRvcmVjb25uZWN0ID0gYXV0b3JlY29ubmVjdF87XG5cbiAgLy8gU2V0dGluZ3MgZm9yIGV4cG9uZW50aWFsIGJhY2tvZmZcbiAgY29uc3QgX0JPRkZfQkFTRSA9IDIwMDA7IC8vIDIwMDAgbWlsbGlzZWNvbmRzLCBtaW5pbXVtIGRlbGF5IGJldHdlZW4gcmVjb25uZWN0c1xuICBjb25zdCBfQk9GRl9NQVhfSVRFUiA9IDEwOyAvLyBNYXhpbXVtIGRlbGF5IGJldHdlZW4gcmVjb25uZWN0cyAyXjEwICogMjAwMCB+IDM0IG1pbnV0ZXNcbiAgY29uc3QgX0JPRkZfSklUVEVSID0gMC4zOyAvLyBBZGQgcmFuZG9tIGRlbGF5XG5cbiAgbGV0IF9ib2ZmVGltZXIgPSBudWxsO1xuICBsZXQgX2JvZmZJdGVyYXRpb24gPSAwO1xuICBsZXQgX2JvZmZDbG9zZWQgPSBmYWxzZTsgLy8gSW5kaWNhdG9yIGlmIHRoZSBzb2NrZXQgd2FzIG1hbnVhbGx5IGNsb3NlZCAtIGRvbid0IGF1dG9yZWNvbm5lY3QgaWYgdHJ1ZS5cblxuICBjb25zdCBsb2cgPSAodGV4dCwgLi4uYXJncykgPT4ge1xuICAgIGlmIChDb25uZWN0aW9uLmxvZ2dlcikge1xuICAgICAgQ29ubmVjdGlvbi5sb2dnZXIodGV4dCwgLi4uYXJncyk7XG4gICAgfVxuICB9XG5cbiAgLy8gQmFja29mZiBpbXBsZW1lbnRhdGlvbiAtIHJlY29ubmVjdCBhZnRlciBhIHRpbWVvdXQuXG4gIGZ1bmN0aW9uIGJvZmZSZWNvbm5lY3QoKSB7XG4gICAgLy8gQ2xlYXIgdGltZXJcbiAgICBjbGVhclRpbWVvdXQoX2JvZmZUaW1lcik7XG4gICAgLy8gQ2FsY3VsYXRlIHdoZW4gdG8gZmlyZSB0aGUgcmVjb25uZWN0IGF0dGVtcHRcbiAgICBjb25zdCB0aW1lb3V0ID0gX0JPRkZfQkFTRSAqIChNYXRoLnBvdygyLCBfYm9mZkl0ZXJhdGlvbikgKiAoMS4wICsgX0JPRkZfSklUVEVSICogTWF0aC5yYW5kb20oKSkpO1xuICAgIC8vIFVwZGF0ZSBpdGVyYXRpb24gY291bnRlciBmb3IgZnV0dXJlIHVzZVxuICAgIF9ib2ZmSXRlcmF0aW9uID0gKF9ib2ZmSXRlcmF0aW9uID49IF9CT0ZGX01BWF9JVEVSID8gX2JvZmZJdGVyYXRpb24gOiBfYm9mZkl0ZXJhdGlvbiArIDEpO1xuICAgIGlmICh0aGlzLm9uQXV0b3JlY29ubmVjdEl0ZXJhdGlvbikge1xuICAgICAgdGhpcy5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24odGltZW91dCk7XG4gICAgfVxuXG4gICAgX2JvZmZUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgbG9nKGBSZWNvbm5lY3RpbmcsIGl0ZXI9JHtfYm9mZkl0ZXJhdGlvbn0sIHRpbWVvdXQ9JHt0aW1lb3V0fWApO1xuICAgICAgLy8gTWF5YmUgdGhlIHNvY2tldCB3YXMgY2xvc2VkIHdoaWxlIHdlIHdhaXRlZCBmb3IgdGhlIHRpbWVyP1xuICAgICAgaWYgKCFfYm9mZkNsb3NlZCkge1xuICAgICAgICBjb25zdCBwcm9tID0gdGhpcy5jb25uZWN0KCk7XG4gICAgICAgIGlmICh0aGlzLm9uQXV0b3JlY29ubmVjdEl0ZXJhdGlvbikge1xuICAgICAgICAgIHRoaXMub25BdXRvcmVjb25uZWN0SXRlcmF0aW9uKDAsIHByb20pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFN1cHByZXNzIGVycm9yIGlmIGl0J3Mgbm90IHVzZWQuXG4gICAgICAgICAgcHJvbS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvKiBkbyBub3RoaW5nICovXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24pIHtcbiAgICAgICAgdGhpcy5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24oLTEpO1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXQpO1xuICB9XG5cbiAgLy8gVGVybWluYXRlIGF1dG8tcmVjb25uZWN0IHByb2Nlc3MuXG4gIGZ1bmN0aW9uIGJvZmZTdG9wKCkge1xuICAgIGNsZWFyVGltZW91dChfYm9mZlRpbWVyKTtcbiAgICBfYm9mZlRpbWVyID0gbnVsbDtcbiAgfVxuXG4gIC8vIFJlc2V0IGF1dG8tcmVjb25uZWN0IGl0ZXJhdGlvbiBjb3VudGVyLlxuICBmdW5jdGlvbiBib2ZmUmVzZXQoKSB7XG4gICAgX2JvZmZJdGVyYXRpb24gPSAwO1xuICB9XG5cbiAgLy8gSW5pdGlhbGl6YXRpb24gZm9yIFdlYnNvY2tldFxuICBmdW5jdGlvbiBpbml0X3dzKGluc3RhbmNlKSB7XG4gICAgbGV0IF9zb2NrZXQgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhdGUgYSBuZXcgY29ubmVjdGlvblxuICAgICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvbiNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaG9zdF8gSG9zdCBuYW1lIHRvIGNvbm5lY3QgdG87IGlmIDxjb2RlPm51bGw8L2NvZGU+IHRoZSBvbGQgaG9zdCBuYW1lIHdpbGwgYmUgdXNlZC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlIEZvcmNlIG5ldyBjb25uZWN0aW9uIGV2ZW4gaWYgb25lIGFscmVhZHkgZXhpc3RzLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgY29ubmVjdGlvbiBjYWxsIGNvbXBsZXRlcywgcmVzb2x1dGlvbiBpcyBjYWxsZWQgd2l0aG91dFxuICAgICAqICBwYXJhbWV0ZXJzLCByZWplY3Rpb24gcGFzc2VzIHRoZSB7RXJyb3J9IGFzIHBhcmFtZXRlci5cbiAgICAgKi9cbiAgICBpbnN0YW5jZS5jb25uZWN0ID0gZnVuY3Rpb24oaG9zdF8sIGZvcmNlKSB7XG4gICAgICBfYm9mZkNsb3NlZCA9IGZhbHNlO1xuXG4gICAgICBpZiAoX3NvY2tldCkge1xuICAgICAgICBpZiAoIWZvcmNlICYmIF9zb2NrZXQucmVhZHlTdGF0ZSA9PSBfc29ja2V0Lk9QRU4pIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgX3NvY2tldC5jbG9zZSgpO1xuICAgICAgICBfc29ja2V0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGhvc3RfKSB7XG4gICAgICAgIGhvc3QgPSBob3N0XztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBjb25zdCB1cmwgPSBtYWtlQmFzZVVybChob3N0LCBzZWN1cmUgPyAnd3NzJyA6ICd3cycsIHZlcnNpb24sIGFwaUtleSk7XG5cbiAgICAgICAgbG9nKFwiQ29ubmVjdGluZyB0bzogXCIsIHVybCk7XG5cbiAgICAgICAgLy8gSXQgdGhyb3dzIHdoZW4gdGhlIHNlcnZlciBpcyBub3QgYWNjZXNzaWJsZSBidXQgdGhlIGV4Y2VwdGlvbiBjYW5ub3QgYmUgY2F1Z2h0OlxuICAgICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zMTAwMjU5Mi9qYXZhc2NyaXB0LWRvZXNudC1jYXRjaC1lcnJvci1pbi13ZWJzb2NrZXQtaW5zdGFudGlhdGlvbi8zMTAwMzA1N1xuICAgICAgICBjb25zdCBjb25uID0gbmV3IFdlYlNvY2tldFByb3ZpZGVyKHVybCk7XG5cbiAgICAgICAgY29ubi5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25uLm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgIGlmIChhdXRvcmVjb25uZWN0KSB7XG4gICAgICAgICAgICBib2ZmU3RvcCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpbnN0YW5jZS5vbk9wZW4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLm9uT3BlbigpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbm4ub25jbG9zZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgIF9zb2NrZXQgPSBudWxsO1xuXG4gICAgICAgICAgaWYgKGluc3RhbmNlLm9uRGlzY29ubmVjdCkge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IF9ib2ZmQ2xvc2VkID8gTkVUV09SS19VU0VSIDogTkVUV09SS19FUlJPUjtcbiAgICAgICAgICAgIGluc3RhbmNlLm9uRGlzY29ubmVjdChuZXcgRXJyb3IoX2JvZmZDbG9zZWQgPyBORVRXT1JLX1VTRVJfVEVYVCA6IE5FVFdPUktfRVJST1JfVEVYVCArXG4gICAgICAgICAgICAgICcgKCcgKyBjb2RlICsgJyknKSwgY29kZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFfYm9mZkNsb3NlZCAmJiBhdXRvcmVjb25uZWN0KSB7XG4gICAgICAgICAgICBib2ZmUmVjb25uZWN0LmNhbGwoaW5zdGFuY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbm4ub25tZXNzYWdlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgaWYgKGluc3RhbmNlLm9uTWVzc2FnZSkge1xuICAgICAgICAgICAgaW5zdGFuY2Uub25NZXNzYWdlKGV2dC5kYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgX3NvY2tldCA9IGNvbm47XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcnkgdG8gcmVzdG9yZSBhIG5ldHdvcmsgY29ubmVjdGlvbiwgYWxzbyByZXNldCBiYWNrb2ZmLlxuICAgICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvbiNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZm9yY2UgLSByZWNvbm5lY3QgZXZlbiBpZiB0aGVyZSBpcyBhIGxpdmUgY29ubmVjdGlvbiBhbHJlYWR5LlxuICAgICAqL1xuICAgIGluc3RhbmNlLnJlY29ubmVjdCA9IGZ1bmN0aW9uKGZvcmNlKSB7XG4gICAgICBib2ZmU3RvcCgpO1xuICAgICAgaW5zdGFuY2UuY29ubmVjdChudWxsLCBmb3JjZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGVybWluYXRlIHRoZSBuZXR3b3JrIGNvbm5lY3Rpb25cbiAgICAgKiBAbWVtYmVyb2YgVGlub2RlLkNvbm5lY3Rpb24jXG4gICAgICovXG4gICAgaW5zdGFuY2UuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgX2JvZmZDbG9zZWQgPSB0cnVlO1xuICAgICAgYm9mZlN0b3AoKTtcblxuICAgICAgaWYgKCFfc29ja2V0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIF9zb2NrZXQuY2xvc2UoKTtcbiAgICAgIF9zb2NrZXQgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmQgYSBzdHJpbmcgdG8gdGhlIHNlcnZlci5cbiAgICAgKiBAbWVtYmVyb2YgVGlub2RlLkNvbm5lY3Rpb24jXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gU3RyaW5nIHRvIHNlbmQuXG4gICAgICogQHRocm93cyBUaHJvd3MgYW4gZXhjZXB0aW9uIGlmIHRoZSB1bmRlcmx5aW5nIGNvbm5lY3Rpb24gaXMgbm90IGxpdmUuXG4gICAgICovXG4gICAgaW5zdGFuY2Uuc2VuZFRleHQgPSBmdW5jdGlvbihtc2cpIHtcbiAgICAgIGlmIChfc29ja2V0ICYmIChfc29ja2V0LnJlYWR5U3RhdGUgPT0gX3NvY2tldC5PUEVOKSkge1xuICAgICAgICBfc29ja2V0LnNlbmQobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIldlYnNvY2tldCBpcyBub3QgY29ubmVjdGVkXCIpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBzb2NrZXQgaXMgYWxpdmUuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5Db25uZWN0aW9uI1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiBjb25uZWN0aW9uIGlzIGxpdmUsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gICAgICovXG4gICAgaW5zdGFuY2UuaXNDb25uZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoX3NvY2tldCAmJiAoX3NvY2tldC5yZWFkeVN0YXRlID09IF9zb2NrZXQuT1BFTikpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbmFtZSBvZiB0aGUgY3VycmVudCBuZXR3b3JrIHRyYW5zcG9ydC5cbiAgICAgKiBAbWVtYmVyb2YgVGlub2RlLkNvbm5lY3Rpb24jXG4gICAgICogQHJldHVybnMge3N0cmluZ30gbmFtZSBvZiB0aGUgdHJhbnNwb3J0IHN1Y2ggYXMgPGNvZGU+XCJ3c1wiPC9jb2RlPiBvciA8Y29kZT5cImxwXCI8L2NvZGU+LlxuICAgICAqL1xuICAgIGluc3RhbmNlLnRyYW5zcG9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICd3cyc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZCBuZXR3b3JrIHByb2JlIHRvIGNoZWNrIGlmIGNvbm5lY3Rpb24gaXMgaW5kZWVkIGxpdmUuXG4gICAgICogQG1lbWJlcm9mIFRpbm9kZS5Db25uZWN0aW9uI1xuICAgICAqL1xuICAgIGluc3RhbmNlLnByb2JlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpbnN0YW5jZS5zZW5kVGV4dCgnMScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluaXRpYWxpemF0aW9uIGZvciBsb25nIHBvbGxpbmcuXG4gIGZ1bmN0aW9uIGluaXRfbHAoaW5zdGFuY2UpIHtcbiAgICBjb25zdCBYRFJfVU5TRU5UID0gMDsgLy8gQ2xpZW50IGhhcyBiZWVuIGNyZWF0ZWQuIG9wZW4oKSBub3QgY2FsbGVkIHlldC5cbiAgICBjb25zdCBYRFJfT1BFTkVEID0gMTsgLy8gb3BlbigpIGhhcyBiZWVuIGNhbGxlZC5cbiAgICBjb25zdCBYRFJfSEVBREVSU19SRUNFSVZFRCA9IDI7IC8vIHNlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCBoZWFkZXJzIGFuZCBzdGF0dXMgYXJlIGF2YWlsYWJsZS5cbiAgICBjb25zdCBYRFJfTE9BRElORyA9IDM7IC8vIERvd25sb2FkaW5nOyByZXNwb25zZVRleHQgaG9sZHMgcGFydGlhbCBkYXRhLlxuICAgIGNvbnN0IFhEUl9ET05FID0gNDsgLy8gVGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZS5cbiAgICAvLyBGdWxseSBjb21wb3NlZCBlbmRwb2ludCBVUkwsIHdpdGggQVBJIGtleSAmIFNJRFxuICAgIGxldCBfbHBVUkwgPSBudWxsO1xuXG4gICAgbGV0IF9wb2xsZXIgPSBudWxsO1xuICAgIGxldCBfc2VuZGVyID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGxwX3NlbmRlcih1cmxfKSB7XG4gICAgICBjb25zdCBzZW5kZXIgPSBuZXcgWEhSUHJvdmlkZXIoKTtcbiAgICAgIHNlbmRlci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKHNlbmRlci5yZWFkeVN0YXRlID09IFhEUl9ET05FICYmIHNlbmRlci5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgLy8gU29tZSBzb3J0IG9mIGVycm9yIHJlc3BvbnNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMUCBzZW5kZXIgZmFpbGVkLCAke3NlbmRlci5zdGF0dXN9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc2VuZGVyLm9wZW4oJ1BPU1QnLCB1cmxfLCB0cnVlKTtcbiAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbHBfcG9sbGVyKHVybF8sIHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgbGV0IHBvbGxlciA9IG5ldyBYSFJQcm92aWRlcigpO1xuICAgICAgbGV0IHByb21pc2VDb21wbGV0ZWQgPSBmYWxzZTtcblxuICAgICAgcG9sbGVyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKGV2dCkge1xuXG4gICAgICAgIGlmIChwb2xsZXIucmVhZHlTdGF0ZSA9PSBYRFJfRE9ORSkge1xuICAgICAgICAgIGlmIChwb2xsZXIuc3RhdHVzID09IDIwMSkgeyAvLyAyMDEgPT0gSFRUUC5DcmVhdGVkLCBnZXQgU0lEXG4gICAgICAgICAgICBsZXQgcGt0ID0gSlNPTi5wYXJzZShwb2xsZXIucmVzcG9uc2VUZXh0LCBqc29uUGFyc2VIZWxwZXIpO1xuICAgICAgICAgICAgX2xwVVJMID0gdXJsXyArICcmc2lkPScgKyBwa3QuY3RybC5wYXJhbXMuc2lkXG4gICAgICAgICAgICBwb2xsZXIgPSBscF9wb2xsZXIoX2xwVVJMKTtcbiAgICAgICAgICAgIHBvbGxlci5zZW5kKG51bGwpXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2Uub25PcGVuKSB7XG4gICAgICAgICAgICAgIGluc3RhbmNlLm9uT3BlbigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmVzb2x2ZSkge1xuICAgICAgICAgICAgICBwcm9taXNlQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXV0b3JlY29ubmVjdCkge1xuICAgICAgICAgICAgICBib2ZmU3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAocG9sbGVyLnN0YXR1cyA8IDQwMCkgeyAvLyA0MDAgPSBIVFRQLkJhZFJlcXVlc3RcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5vbk1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgaW5zdGFuY2Uub25NZXNzYWdlKHBvbGxlci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwb2xsZXIgPSBscF9wb2xsZXIoX2xwVVJMKTtcbiAgICAgICAgICAgIHBvbGxlci5zZW5kKG51bGwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEb24ndCB0aHJvdyBhbiBlcnJvciBoZXJlLCBncmFjZWZ1bGx5IGhhbmRsZSBzZXJ2ZXIgZXJyb3JzXG4gICAgICAgICAgICBpZiAocmVqZWN0ICYmICFwcm9taXNlQ29tcGxldGVkKSB7XG4gICAgICAgICAgICAgIHByb21pc2VDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICByZWplY3QocG9sbGVyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5zdGFuY2Uub25NZXNzYWdlICYmIHBvbGxlci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgaW5zdGFuY2Uub25NZXNzYWdlKHBvbGxlci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLm9uRGlzY29ubmVjdCkge1xuICAgICAgICAgICAgICBjb25zdCBjb2RlID0gcG9sbGVyLnN0YXR1cyB8fCAoX2JvZmZDbG9zZWQgPyBORVRXT1JLX1VTRVIgOiBORVRXT1JLX0VSUk9SKTtcbiAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHBvbGxlci5yZXNwb25zZVRleHQgfHwgKF9ib2ZmQ2xvc2VkID8gTkVUV09SS19VU0VSX1RFWFQgOiBORVRXT1JLX0VSUk9SX1RFWFQpO1xuICAgICAgICAgICAgICBpbnN0YW5jZS5vbkRpc2Nvbm5lY3QobmV3IEVycm9yKHRleHQgKyAnICgnICsgY29kZSArICcpJyksIGNvZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQb2xsaW5nIGhhcyBzdG9wcGVkLiBJbmRpY2F0ZSBpdCBieSBzZXR0aW5nIHBvbGxlciB0byBudWxsLlxuICAgICAgICAgICAgcG9sbGVyID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghX2JvZmZDbG9zZWQgJiYgYXV0b3JlY29ubmVjdCkge1xuICAgICAgICAgICAgICBib2ZmUmVjb25uZWN0LmNhbGwoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcG9sbGVyLm9wZW4oJ0dFVCcsIHVybF8sIHRydWUpO1xuICAgICAgcmV0dXJuIHBvbGxlcjtcbiAgICB9XG5cbiAgICBpbnN0YW5jZS5jb25uZWN0ID0gZnVuY3Rpb24oaG9zdF8sIGZvcmNlKSB7XG4gICAgICBfYm9mZkNsb3NlZCA9IGZhbHNlO1xuXG4gICAgICBpZiAoX3BvbGxlcikge1xuICAgICAgICBpZiAoIWZvcmNlKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIF9wb2xsZXIub25yZWFkeXN0YXRlY2hhbmdlID0gdW5kZWZpbmVkO1xuICAgICAgICBfcG9sbGVyLmFib3J0KCk7XG4gICAgICAgIF9wb2xsZXIgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoaG9zdF8pIHtcbiAgICAgICAgaG9zdCA9IGhvc3RfO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGNvbnN0IHVybCA9IG1ha2VCYXNlVXJsKGhvc3QsIHNlY3VyZSA/ICdodHRwcycgOiAnaHR0cCcsIHZlcnNpb24sIGFwaUtleSk7XG4gICAgICAgIGxvZyhcIkNvbm5lY3RpbmcgdG86XCIsIHVybCk7XG4gICAgICAgIF9wb2xsZXIgPSBscF9wb2xsZXIodXJsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICBfcG9sbGVyLnNlbmQobnVsbClcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgbG9nKFwiTFAgY29ubmVjdGlvbiBmYWlsZWQ6XCIsIGVycik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW5zdGFuY2UucmVjb25uZWN0ID0gZnVuY3Rpb24oZm9yY2UpIHtcbiAgICAgIGJvZmZTdG9wKCk7XG4gICAgICBpbnN0YW5jZS5jb25uZWN0KG51bGwsIGZvcmNlKTtcbiAgICB9O1xuXG4gICAgaW5zdGFuY2UuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgX2JvZmZDbG9zZWQgPSB0cnVlO1xuICAgICAgYm9mZlN0b3AoKTtcblxuICAgICAgaWYgKF9zZW5kZXIpIHtcbiAgICAgICAgX3NlbmRlci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIF9zZW5kZXIuYWJvcnQoKTtcbiAgICAgICAgX3NlbmRlciA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoX3BvbGxlcikge1xuICAgICAgICBfcG9sbGVyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgX3BvbGxlci5hYm9ydCgpO1xuICAgICAgICBfcG9sbGVyID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGluc3RhbmNlLm9uRGlzY29ubmVjdCkge1xuICAgICAgICBpbnN0YW5jZS5vbkRpc2Nvbm5lY3QobmV3IEVycm9yKE5FVFdPUktfVVNFUl9URVhUICsgJyAoJyArIE5FVFdPUktfVVNFUiArICcpJyksIE5FVFdPUktfVVNFUik7XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgaXQncyByZWNvbnN0cnVjdGVkXG4gICAgICBfbHBVUkwgPSBudWxsO1xuICAgIH1cblxuICAgIGluc3RhbmNlLnNlbmRUZXh0ID0gZnVuY3Rpb24obXNnKSB7XG4gICAgICBfc2VuZGVyID0gbHBfc2VuZGVyKF9scFVSTCk7XG4gICAgICBpZiAoX3NlbmRlciAmJiAoX3NlbmRlci5yZWFkeVN0YXRlID09IDEpKSB7IC8vIDEgPT0gT1BFTkVEXG4gICAgICAgIF9zZW5kZXIuc2VuZChtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTG9uZyBwb2xsZXIgZmFpbGVkIHRvIGNvbm5lY3RcIik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGluc3RhbmNlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKF9wb2xsZXIgJiYgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaW5zdGFuY2UudHJhbnNwb3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ2xwJztcbiAgICB9XG5cbiAgICBpbnN0YW5jZS5wcm9iZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaW5zdGFuY2Uuc2VuZFRleHQoJzEnKTtcbiAgICB9XG4gIH1cblxuICBsZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgaWYgKGNvbmZpZy50cmFuc3BvcnQgPT09ICdscCcpIHtcbiAgICAvLyBleHBsaWNpdCByZXF1ZXN0IHRvIHVzZSBsb25nIHBvbGxpbmdcbiAgICBpbml0X2xwKHRoaXMpO1xuICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChjb25maWcudHJhbnNwb3J0ID09PSAnd3MnKSB7XG4gICAgLy8gZXhwbGljaXQgcmVxdWVzdCB0byB1c2Ugd2ViIHNvY2tldFxuICAgIC8vIGlmIHdlYnNvY2tldHMgYXJlIG5vdCBhdmFpbGFibGUsIGhvcnJpYmxlIHRoaW5ncyB3aWxsIGhhcHBlblxuICAgIGluaXRfd3ModGhpcyk7XG4gICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKCFpbml0aWFsaXplZCkge1xuICAgIC8vIEludmFsaWQgb3IgdW5kZWZpbmVkIG5ldHdvcmsgdHJhbnNwb3J0LlxuICAgIGxvZyhcIlVua25vd24gb3IgaW52YWxpZCBuZXR3b3JrIHRyYW5zcG9ydC4gUnVubmluZyB1bmRlciBOb2RlPyBDYWxsICdUaW5vZGUuc2V0TmV0d29ya1Byb3ZpZGVycygpJy5cIik7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBvciBpbnZhbGlkIG5ldHdvcmsgdHJhbnNwb3J0LiBSdW5uaW5nIHVuZGVyIE5vZGU/IENhbGwgJ1Rpbm9kZS5zZXROZXR3b3JrUHJvdmlkZXJzKCknLlwiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldCBhdXRvcmVjb25uZWN0IGNvdW50ZXIgdG8gemVyby5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Db25uZWN0aW9uI1xuICAgKi9cbiAgdGhpcy5iYWNrb2ZmUmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICBib2ZmUmVzZXQoKTtcbiAgfVxuXG4gIC8vIENhbGxiYWNrczpcbiAgLyoqXG4gICAqIEEgY2FsbGJhY2sgdG8gcGFzcyBpbmNvbWluZyBtZXNzYWdlcyB0by4gU2VlIHtAbGluayBUaW5vZGUuQ29ubmVjdGlvbiNvbk1lc3NhZ2V9LlxuICAgKiBAY2FsbGJhY2sgVGlub2RlLkNvbm5lY3Rpb24uT25NZXNzYWdlXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIE1lc3NhZ2UgdG8gcHJvY2Vzcy5cbiAgICovXG4gIC8qKlxuICAgKiBBIGNhbGxiYWNrIHRvIHBhc3MgaW5jb21pbmcgbWVzc2FnZXMgdG8uXG4gICAqIEB0eXBlIHtUaW5vZGUuQ29ubmVjdGlvbi5Pbk1lc3NhZ2V9XG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvbiNcbiAgICovXG4gIHRoaXMub25NZXNzYWdlID0gdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGNhbGxiYWNrIGZvciByZXBvcnRpbmcgYSBkcm9wcGVkIGNvbm5lY3Rpb24uXG4gICAqIEB0eXBlIHtmdW5jdGlvbn1cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Db25uZWN0aW9uI1xuICAgKi9cbiAgdGhpcy5vbkRpc2Nvbm5lY3QgPSB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEEgY2FsbGJhY2sgY2FsbGVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkgdG8gYmUgdXNlZCBmb3Igc2VuZGluZy4gRm9yIHdlYnNvY2tldHMgaXQncyBzb2NrZXQgb3BlbixcbiAgICogZm9yIGxvbmcgcG9sbGluZyBpdCdzIDxjb2RlPnJlYWR5U3RhdGU9MTwvY29kZT4gKE9QRU5FRClcbiAgICogQHR5cGUge2Z1bmN0aW9ufVxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkNvbm5lY3Rpb24jXG4gICAqL1xuICB0aGlzLm9uT3BlbiA9IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQSBjYWxsYmFjayB0byBub3RpZnkgb2YgcmVjb25uZWN0aW9uIGF0dGVtcHRzLiBTZWUge0BsaW5rIFRpbm9kZS5Db25uZWN0aW9uI29uQXV0b3JlY29ubmVjdEl0ZXJhdGlvbn0uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvblxuICAgKiBAY2FsbGJhY2sgQXV0b3JlY29ubmVjdEl0ZXJhdGlvblR5cGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRpbWVvdXQgLSB0aW1lIHRpbGwgdGhlIG5leHQgcmVjb25uZWN0IGF0dGVtcHQgaW4gbWlsbGlzZWNvbmRzLiA8Y29kZT4tMTwvY29kZT4gbWVhbnMgcmVjb25uZWN0IHdhcyBza2lwcGVkLlxuICAgKiBAcGFyYW0ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQgb3IgcmVqZWN0ZWQgd2hlbiB0aGUgcmVjb25uZWN0IGF0dGVtcCBjb21wbGV0ZXMuXG4gICAqXG4gICAqL1xuICAvKipcbiAgICogQSBjYWxsYmFjayB0byBpbmZvcm0gd2hlbiB0aGUgbmV4dCBhdHRhbXB0IHRvIHJlY29ubmVjdCB3aWxsIGhhcHBlbiBhbmQgdG8gcmVjZWl2ZSBjb25uZWN0aW9uIHByb21pc2UuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuQ29ubmVjdGlvbiNcbiAgICogQHR5cGUge1Rpbm9kZS5Db25uZWN0aW9uLkF1dG9yZWNvbm5lY3RJdGVyYXRpb25UeXBlfVxuICAgKi9cbiAgdGhpcy5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24gPSB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEEgY2FsbGJhY2sgdG8gbG9nIGV2ZW50cyBmcm9tIENvbm5lY3Rpb24uIFNlZSB7QGxpbmsgVGlub2RlLkNvbm5lY3Rpb24jbG9nZ2VyfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Db25uZWN0aW9uXG4gICAqIEBjYWxsYmFjayBMb2dnZXJDYWxsYmFja1R5cGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IC0gRXZlbnQgdG8gbG9nLlxuICAgKi9cbiAgLyoqXG4gICAqIEEgY2FsbGJhY2sgdG8gcmVwb3J0IGxvZ2dpbmcgZXZlbnRzLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkNvbm5lY3Rpb24jXG4gICAqIEB0eXBlIHtUaW5vZGUuQ29ubmVjdGlvbi5Mb2dnZXJDYWxsYmFja1R5cGV9XG4gICAqL1xuICB0aGlzLmxvZ2dlciA9IHVuZGVmaW5lZDtcbn07XG5cbi8qKlxuICogVG8gdXNlIENvbm5lY3Rpb24gaW4gYSBub24gYnJvd3NlciBjb250ZXh0LCBzdXBwbHkgV2ViU29ja2V0IGFuZCBYTUxIdHRwUmVxdWVzdCBwcm92aWRlcnMuXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyb2YgQ29ubmVjdGlvblxuICogQHBhcmFtIHdzUHJvdmlkZXIgV2ViU29ja2V0IHByb3ZpZGVyLCBlLmcuIGZvciBub2RlSlMgLCA8Y29kZT5yZXF1aXJlKCd3cycpPC9jb2RlPi5cbiAqIEBwYXJhbSB4aHJQcm92aWRlciBYTUxIdHRwUmVxdWVzdCBwcm92aWRlciwgZS5nLiBmb3Igbm9kZSA8Y29kZT5yZXF1aXJlKCd4aHInKTwvY29kZT4uXG4gKi9cbkNvbm5lY3Rpb24uc2V0TmV0d29ya1Byb3ZpZGVycyA9IGZ1bmN0aW9uKHdzUHJvdmlkZXIsIHhoclByb3ZpZGVyKSB7XG4gIFdlYlNvY2tldFByb3ZpZGVyID0gd3NQcm92aWRlcjtcbiAgWEhSUHJvdmlkZXIgPSB4aHJQcm92aWRlcjtcbn07XG5cbkNvbm5lY3Rpb24uTkVUV09SS19FUlJPUiA9IE5FVFdPUktfRVJST1I7XG5Db25uZWN0aW9uLk5FVFdPUktfRVJST1JfVEVYVCA9IE5FVFdPUktfRVJST1JfVEVYVDtcbkNvbm5lY3Rpb24uTkVUV09SS19VU0VSID0gTkVUV09SS19VU0VSO1xuQ29ubmVjdGlvbi5ORVRXT1JLX1VTRVJfVEVYVCA9IE5FVFdPUktfVVNFUl9URVhUO1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJykge1xuICBtb2R1bGUuZXhwb3J0cyA9IENvbm5lY3Rpb247XG59XG4iLCIvKipcbiAqIEBmaWxlIEhlbHBlciBtZXRob2RzIGZvciBkZWFsaW5nIHdpdGggSW5kZXhlZERCIGNhY2hlIG9mIG1lc3NhZ2VzLCB1c2VycywgYW5kIHRvcGljcy5cbiAqIFNlZSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3Rpbm9kZS93ZWJhcHBcIj5odHRwczovL2dpdGh1Yi5jb20vdGlub2RlL3dlYmFwcDwvYT4gZm9yIHJlYWwtbGlmZSB1c2FnZS5cbiAqXG4gKiBAY29weXJpZ2h0IDIwMTUtMjAyMSBUaW5vZGVcbiAqIEBzdW1tYXJ5IEphdmFzY3JpcHQgYmluZGluZ3MgZm9yIFRpbm9kZS5cbiAqIEBsaWNlbnNlIEFwYWNoZSAyLjBcbiAqIEB2ZXJzaW9uIDAuMTdcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyBOT1RFIFRPIERFVkVMT1BFUlM6XG4vLyBMb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBkb3VibGUgcXVvdGVkIFwi0YHRgtGA0L7QutCwINC90LAg0LTRgNGD0LPQvtC8INGP0LfRi9C60LVcIixcbi8vIG5vbi1sb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBzaW5nbGUgcXVvdGVkICdub24tbG9jYWxpemVkJy5cblxuY29uc3QgREJfVkVSU0lPTiA9IDE7XG5jb25zdCBEQl9OQU1FID0gJ3Rpbm9kZS13ZWInO1xuXG5jb25zdCBEQiA9IGZ1bmN0aW9uKG9uRXJyb3IsIGxvZ2dlcikge1xuICBvbkVycm9yID0gb25FcnJvciB8fCBmdW5jdGlvbigpIHt9XG4gIGxvZ2dlciA9IGxvZ2dlciB8fCBmdW5jdGlvbigpIHt9XG5cbiAgLy8gSW5zdGFuY2Ugb2YgSW5kZXhEQi5cbiAgbGV0IGRiID0gbnVsbDtcbiAgLy8gSW5kaWNhdG9yIHRoYXQgdGhlIGNhY2hlIGlzIGRpc2FibGVkLlxuICBsZXQgZGlzYWJsZWQgPSBmYWxzZTtcblxuICAvLyBTZXJpYWxpemFibGUgdG9waWMgZmllbGRzLlxuICBjb25zdCB0b3BpY19maWVsZHMgPSBbJ2NyZWF0ZWQnLCAndXBkYXRlZCcsICdkZWxldGVkJywgJ3JlYWQnLCAncmVjdicsICdzZXEnLCAnY2xlYXInLCAnZGVmYWNzJyxcbiAgICAnY3JlZHMnLCAncHVibGljJywgJ3ByaXZhdGUnLCAndG91Y2hlZCdcbiAgXTtcblxuICAvLyBDb3B5IHZhbHVlcyBmcm9tICdzcmMnIHRvICdkc3QnLiBBbGxvY2F0ZSBkc3QgaWYgaXQncyBudWxsIG9yIHVuZGVmaW5lZC5cbiAgZnVuY3Rpb24gc2VyaWFsaXplVG9waWMoZHN0LCBzcmMpIHtcbiAgICBjb25zdCByZXMgPSBkc3QgfHwge1xuICAgICAgbmFtZTogc3JjLm5hbWVcbiAgICB9O1xuICAgIHRvcGljX2ZpZWxkcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGYpKSB7XG4gICAgICAgIHJlc1tmXSA9IHNyY1tmXTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzcmMuX3RhZ3MpKSB7XG4gICAgICByZXMudGFncyA9IHNyYy5fdGFncztcbiAgICB9XG4gICAgaWYgKHNyYy5hY3MpIHtcbiAgICAgIHJlcy5hY3MgPSBzcmMuZ2V0QWNjZXNzTW9kZSgpLmpzb25IZWxwZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8vIENvcHkgZGF0YSBmcm9tIHNyYyB0byBUb3BpYyBvYmplY3QuXG4gIGZ1bmN0aW9uIGRlc2VyaWFsaXplVG9waWModG9waWMsIHNyYykge1xuICAgIHRvcGljX2ZpZWxkcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGYpKSB7XG4gICAgICAgIHRvcGljW2ZdID0gc3JjW2ZdO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHNyYy50YWdzKSkge1xuICAgICAgdG9waWMuX3RhZ3MgPSBzcmMudGFncztcbiAgICB9XG4gICAgaWYgKHNyYy5hY3MpIHtcbiAgICAgIHRvcGljLnNldEFjY2Vzc01vZGUoc3JjLmFjcyk7XG4gICAgfVxuICAgIHRvcGljLnNlcSB8PSAwO1xuICAgIHRvcGljLnJlYWQgfD0gMDtcbiAgICB0b3BpYy51bnJlYWQgPSBNYXRoLm1heCgwLCB0b3BpYy5zZXEgLSB0b3BpYy5yZWFkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZVN1YnNjcmlwdGlvbihkc3QsIHRvcGljTmFtZSwgdWlkLCBzdWIpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbJ3VwZGF0ZWQnLCAnbW9kZScsICdyZWFkJywgJ3JlY3YnLCAnY2xlYXInLCAnbGFzdFNlZW4nLCAndXNlckFnZW50J107XG4gICAgY29uc3QgcmVzID0gZHN0IHx8IHtcbiAgICAgIHRvcGljOiB0b3BpY05hbWUsXG4gICAgICB1aWQ6IHVpZFxuICAgIH07XG5cbiAgICBmaWVsZHMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgaWYgKHN1Yi5oYXNPd25Qcm9wZXJ0eShmKSkge1xuICAgICAgICByZXNbZl0gPSBzdWJbZl07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VyaWFsaXplTWVzc2FnZShkc3QsIG1zZykge1xuICAgIC8vIFNlcmlhbGl6YWJsZSBmaWVsZHMuXG4gICAgY29uc3QgZmllbGRzID0gWyd0b3BpYycsICdzZXEnLCAndHMnLCAnX3N0YXR1cycsICdmcm9tJywgJ2hlYWQnLCAnY29udGVudCddO1xuICAgIGNvbnN0IHJlcyA9IGRzdCB8fCB7fTtcbiAgICBmaWVsZHMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgaWYgKG1zZy5oYXNPd25Qcm9wZXJ0eShmKSkge1xuICAgICAgICByZXNbZl0gPSBtc2dbZl07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hcE9iamVjdHMoc291cmNlLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZGIpIHtcbiAgICAgIHJldHVybiBkaXNhYmxlZCA/XG4gICAgICAgIFByb21pc2UucmVzb2x2ZShbXSkgOlxuICAgICAgICBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJub3QgaW5pdGlhbGl6ZWRcIikpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0cnggPSBkYi50cmFuc2FjdGlvbihbc291cmNlXSk7XG4gICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJtYXBPYmplY3RzXCIsIHNvdXJjZSwgZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICB9O1xuICAgICAgdHJ4Lm9iamVjdFN0b3JlKHNvdXJjZSkuZ2V0QWxsKCkub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGV2ZW50LnRhcmdldC5yZXN1bHQuZm9yRWFjaCgodG9waWMpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgdG9waWMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoZXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcnNpc3RlbnQgY2FjaGU6IG9wZW4gb3IgY3JlYXRlL3VwZ3JhZGUgaWYgbmVlZGVkLlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIERCIGlzIGluaXRpYWxpemVkLlxuICAgICAqL1xuICAgIGluaXREYXRhYmFzZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAvLyBPcGVuIHRoZSBkYXRhYmFzZSBhbmQgaW5pdGlhbGl6ZSBjYWxsYmFja3MuXG4gICAgICAgIGNvbnN0IHJlcSA9IGluZGV4ZWREQi5vcGVuKERCX05BTUUsIERCX1ZFUlNJT04pO1xuICAgICAgICByZXEub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIGRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgcmVzb2x2ZShkYik7XG4gICAgICAgIH07XG4gICAgICAgIHJlcS5vbmVycm9yID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgbG9nZ2VyKFwiUENhY2hlXCIsIFwiZmFpbGVkIHRvIGluaXRpYWxpemVcIiwgZXZlbnQpO1xuICAgICAgICAgIHJlamVjdChldmVudC50YXJnZXQuZXJyb3IpO1xuICAgICAgICAgIG9uRXJyb3IoZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxLm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgZGIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJmYWlsZWQgdG8gY3JlYXRlIHN0b3JhZ2VcIiwgZXZlbnQpO1xuICAgICAgICAgICAgb25FcnJvcihldmVudC50YXJnZXQuZXJyb3IpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBJbmRpdmlkdWFsIG9iamVjdCBzdG9yZXMuXG5cbiAgICAgICAgICAvLyBPYmplY3Qgc3RvcmUgKHRhYmxlKSBmb3IgdG9waWNzLiBUaGUgcHJpbWFyeSBrZXkgaXMgdG9waWMgbmFtZS5cbiAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZSgndG9waWMnLCB7XG4gICAgICAgICAgICBrZXlQYXRoOiAnbmFtZSdcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIFVzZXJzIG9iamVjdCBzdG9yZS4gVUlEIGlzIHRoZSBwcmltYXJ5IGtleS5cbiAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZSgndXNlcicsIHtcbiAgICAgICAgICAgIGtleVBhdGg6ICd1aWQnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBTdWJzY3JpcHRpb25zIG9iamVjdCBzdG9yZSB0b3BpYyA8LT4gdXNlci4gVG9waWMgbmFtZSArIFVJRCBpcyB0aGUgcHJpbWFyeSBrZXkuXG4gICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoJ3N1YnNjcmlwdGlvbicsIHtcbiAgICAgICAgICAgIGtleVBhdGg6IFsndG9waWMnLCAndWlkJ11cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIE1lc3NhZ2VzIG9iamVjdCBzdG9yZS4gVGhlIHByaW1hcnkga2V5IGlzIHRvcGljIG5hbWUgKyBzZXEuXG4gICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoJ21lc3NhZ2UnLCB7XG4gICAgICAgICAgICBrZXlQYXRoOiBbJ3RvcGljJywgJ3NlcSddXG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHBlcnNpc3RlbnQgY2FjaGUuXG4gICAgICovXG4gICAgZGVsZXRlRGF0YWJhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxID0gaW5kZXhlZERCLmRlbGV0ZURhdGFiYXNlKERCX05BTUUpO1xuICAgICAgICByZXEub25ibG9ja2VkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZGIpIHtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXEub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgZGIgPSBudWxsO1xuICAgICAgICAgIGRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICB9O1xuICAgICAgICByZXEub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcImRlbGV0ZURhdGFiYXNlXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGVyc2lzdGVudCBjYWNoZSBpcyByZWFkeSBmb3IgdXNlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiBjYWNoZSBpcyByZWFkeSwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBpc1JlYWR5OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIWRiO1xuICAgIH0sXG5cbiAgICAvLyBUb3BpY3MuXG4gICAgLyoqXG4gICAgICogU2F2ZSB0byBjYWNoZSBvciB1cGRhdGUgdG9waWMgaW4gcGVyc2lzdGVudCBjYWNoZS5cbiAgICAgKiBAbWVtYmVyT2YgREJcbiAgICAgKiBAcGFyYW0ge1RvcGljfSB0b3BpYyAtIHRvcGljIHRvIGJlIGFkZGVkIG9yIHVwZGF0ZWQuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgdXBkVG9waWM6IGZ1bmN0aW9uKHRvcGljKSB7XG4gICAgICBpZiAoIXRoaXMuaXNSZWFkeSgpKSB7XG4gICAgICAgIHJldHVybiBkaXNhYmxlZCA/XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCB0cnggPSBkYi50cmFuc2FjdGlvbihbJ3RvcGljJ10sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgdHJ4Lm9uY29tcGxldGUgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcInVwZFRvcGljXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHJlcSA9IHRyeC5vYmplY3RTdG9yZSgndG9waWMnKS5nZXQodG9waWMubmFtZSk7XG4gICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICB0cngub2JqZWN0U3RvcmUoJ3RvcGljJykucHV0KHNlcmlhbGl6ZVRvcGljKHJlcS5yZXN1bHQsIHRvcGljKSk7XG4gICAgICAgICAgdHJ4LmNvbW1pdCgpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSB0b3BpYyBmcm9tIHBlcnNpc3RlbnQgY2FjaGUuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSB0b3BpYyB0byByZW1vdmUgZnJvbSBkYXRhYmFzZS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHJlc29sdmVkL3JlamVjdGVkIG9uIG9wZXJhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqL1xuICAgIHJlbVRvcGljOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAoIXRoaXMuaXNSZWFkeSgpKSB7XG4gICAgICAgIHJldHVybiBkaXNhYmxlZCA/XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCB0cnggPSBkYi50cmFuc2FjdGlvbihbJ3RvcGljJywgJ3N1YnNjcmlwdGlvbicsICdtZXNzYWdlJ10sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgdHJ4Lm9uY29tcGxldGUgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcInJlbVRvcGljXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgndG9waWMnKS5kZWxldGUoSURCS2V5UmFuZ2Uub25seShuYW1lKSk7XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgnc3Vic2NyaXB0aW9uJykuZGVsZXRlKElEQktleVJhbmdlLmJvdW5kKFtuYW1lLCAnLSddLCBbbmFtZSwgJ34nXSkpO1xuICAgICAgICB0cngub2JqZWN0U3RvcmUoJ21lc3NhZ2UnKS5kZWxldGUoSURCS2V5UmFuZ2UuYm91bmQoW25hbWUsIDBdLCBbbmFtZSwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJdKSk7XG4gICAgICAgIHRyeC5jb21taXQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgY2FsbGJhY2sgZm9yIGVhY2ggc3RvcmVkIHRvcGljLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCB0b3BpYy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIHRoZSB2YWx1ZSBvciA8Y29kZT50aGlzPC9jb2RlPiBpbnNpZGUgdGhlIGNhbGxiYWNrLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgbWFwVG9waWNzOiBmdW5jdGlvbihjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgcmV0dXJuIG1hcE9iamVjdHMoJ3RvcGljJywgY2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGRhdGEgZnJvbSBzZXJpYWxpemVkIG9iamVjdCB0byB0b3BpYy5cbiAgICAgKiBAbWVtYmVyT2YgREJcbiAgICAgKiBAcGFyYW0ge1RvcGljfSB0b3BpYyAtIHRhcmdldCB0byBkZXNlcmlhbGl6ZSB0by5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3JjIC0gc2VyaWFsaXplZCBkYXRhIHRvIGNvcHkgZnJvbS5cbiAgICAgKi9cbiAgICBkZXNlcmlhbGl6ZVRvcGljOiBmdW5jdGlvbih0b3BpYywgc3JjKSB7XG4gICAgICBkZXNlcmlhbGl6ZVRvcGljKHRvcGljLCBzcmMpO1xuICAgIH0sXG5cbiAgICAvLyBVc2Vycy5cbiAgICAvKipcbiAgICAgKiBBZGQgb3IgdXBkYXRlIHVzZXIgb2JqZWN0IGluIHRoZSBwZXJzaXN0ZW50IGNhY2hlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1aWQgLSBJRCBvZiB0aGUgdXNlciB0byBzYXZlIG9yIHVwZGF0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHViIC0gdXNlcidzIDxjb2RlPnB1YmxpYzwvY29kZT4gaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgdXBkVXNlcjogZnVuY3Rpb24odWlkLCBwdWIpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiB8fCBwdWIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBObyBwb2ludCBpbnVwZGF0aW5nIHVzZXIgd2l0aCBpbnZhbGlkIGRhdGEuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc1JlYWR5KCkpIHtcbiAgICAgICAgcmV0dXJuIGRpc2FibGVkID9cbiAgICAgICAgICBQcm9taXNlLnJlc29sdmUoKSA6XG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwibm90IGluaXRpYWxpemVkXCIpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHRyeCA9IGRiLnRyYW5zYWN0aW9uKFsndXNlciddLCAncmVhZHdyaXRlJyk7XG4gICAgICAgIHRyeC5vbmNvbXBsZXRlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShldmVudC50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgICAgdHJ4Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJ1cGRVc2VyXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgndXNlcicpLnB1dCh7XG4gICAgICAgICAgdWlkOiB1aWQsXG4gICAgICAgICAgcHVibGljOiBwdWJcbiAgICAgICAgfSk7XG4gICAgICAgIHRyeC5jb21taXQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdXNlciBmcm9tIHBlcnNpc3RlbnQgY2FjaGUuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVpZCAtIElEIG9mIHRoZSB1c2VyIHRvIHJlbW92ZSBmcm9tIHRoZSBjYWNoZS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHJlc29sdmVkL3JlamVjdGVkIG9uIG9wZXJhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqL1xuICAgIHJlbVVzZXI6IGZ1bmN0aW9uKHVpZCkge1xuICAgICAgaWYgKCF0aGlzLmlzUmVhZHkoKSkge1xuICAgICAgICByZXR1cm4gZGlzYWJsZWQgP1xuICAgICAgICAgIFByb21pc2UucmVzb2x2ZSgpIDpcbiAgICAgICAgICBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJub3QgaW5pdGlhbGl6ZWRcIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdHJ4ID0gZGIudHJhbnNhY3Rpb24oWyd1c2VyJ10sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgdHJ4Lm9uY29tcGxldGUgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcInJlbVVzZXJcIiwgZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgdHJ4Lm9iamVjdFN0b3JlKCd1c2VyJykuZGVsZXRlKElEQktleVJhbmdlLm9ubHkodWlkKSk7XG4gICAgICAgIHRyeC5jb21taXQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgY2FsbGJhY2sgZm9yIGVhY2ggc3RvcmVkIHVzZXIuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIHRvcGljLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IC0gdGhlIHZhbHVlIG9yIDxjb2RlPnRoaXM8L2NvZGU+IGluc2lkZSB0aGUgY2FsbGJhY2suXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSByZXNvbHZlZC9yZWplY3RlZCBvbiBvcGVyYXRpb24gY29tcGxldGlvbi5cbiAgICAgKi9cbiAgICBtYXBVc2VyczogZnVuY3Rpb24oY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiBtYXBPYmplY3RzKCd1c2VyJywgY2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWFkIGEgc2luZ2xlIHVzZXIgZnJvbSBwZXJzaXN0ZW50IGNhY2hlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1aWQgLSBJRCBvZiB0aGUgdXNlciB0byBmZXRjaCBmcm9tIGNhY2hlLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgZ2V0VXNlcjogZnVuY3Rpb24odWlkKSB7XG4gICAgICBpZiAoIXRoaXMuaXNSZWFkeSgpKSB7XG4gICAgICAgIHJldHVybiBkaXNhYmxlZCA/XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCB0cnggPSBkYi50cmFuc2FjdGlvbihbJ3VzZXInXSk7XG4gICAgICAgIHRyeC5vbmNvbXBsZXRlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgdXNlciA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICB1c2VyOiB1c2VyLnVpZCxcbiAgICAgICAgICAgIHB1YmxpYzogdXNlci5wdWJsaWNcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdHJ4Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJnZXRVc2VyXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgndXNlcicpLmdldCh1aWQpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFN1YnNjcmlwdGlvbnMuXG5cbiAgICAvKipcbiAgICAgKiBBZGQgb3IgdXBkYXRlIHN1YnNjcmlwdGlvbiBpbiBwZXJzaXN0ZW50IGNhY2hlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpY05hbWUgLSBuYW1lIG9mIHRoZSB0b3BpYyB3aGljaCBvd25zIHRoZSBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1aWQgLSBJRCBvZiB0aGUgc3Vic2NyaWJlZCB1c2VyLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdWIgLSBzdWJzY3JpcHRpb24gdG8gc2F2ZS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHJlc29sdmVkL3JlamVjdGVkIG9uIG9wZXJhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqL1xuICAgIHVwZFN1YnNjcmlwdGlvbjogZnVuY3Rpb24odG9waWNOYW1lLCB1aWQsIHN1Yikge1xuICAgICAgaWYgKCF0aGlzLmlzUmVhZHkoKSkge1xuICAgICAgICByZXR1cm4gZGlzYWJsZWQgP1xuICAgICAgICAgIFByb21pc2UucmVzb2x2ZSgpIDpcbiAgICAgICAgICBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJub3QgaW5pdGlhbGl6ZWRcIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdHJ4ID0gZGIudHJhbnNhY3Rpb24oWydzdWJzY3JpcHRpb24nXSwgJ3JlYWR3cml0ZScpO1xuICAgICAgICB0cngub25jb21wbGV0ZSA9IChldmVudCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoZXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgbG9nZ2VyKFwiUENhY2hlXCIsIFwidXBkU3Vic2NyaXB0aW9uXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgnc3Vic2NyaXB0aW9uJykuZ2V0KFt0b3BpY05hbWUsIHVpZF0pLm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xuICAgICAgICAgIHRyeC5vYmplY3RTdG9yZSgnc3Vic2NyaXB0aW9uJykucHV0KHNlcmlhbGl6ZVN1YnNjcmlwdGlvbihldmVudC50YXJnZXQucmVzdWx0LCB0b3BpY05hbWUsIHVpZCwgc3ViKSk7XG4gICAgICAgICAgdHJ4LmNvbW1pdCgpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBjYWxsYmFjayBmb3IgZWFjaCBjYWNoZWQgc3Vic2NyaXB0aW9uIGluIGEgZ2l2ZW4gdG9waWMuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIG5hbWUgb2YgdGhlIHRvcGljIHdoaWNoIG93bnMgdGhlIHN1YnNjcmlwdGlvbnMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIHN1YnNjcmlwdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIHRoZSB2YWx1ZSBvciA8Y29kZT50aGlzPC9jb2RlPiBpbnNpZGUgdGhlIGNhbGxiYWNrLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgbWFwU3Vic2NyaXB0aW9uczogZnVuY3Rpb24odG9waWNOYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCF0aGlzLmlzUmVhZHkoKSkge1xuICAgICAgICByZXR1cm4gZGlzYWJsZWQgP1xuICAgICAgICAgIFByb21pc2UucmVzb2x2ZShbXSkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCB0cnggPSBkYi50cmFuc2FjdGlvbihbJ3N1YnNjcmlwdGlvbiddKTtcbiAgICAgICAgdHJ4Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJtYXBTdWJzY3JpcHRpb25zXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgnc3Vic2NyaXB0aW9uJykuZ2V0QWxsKElEQktleVJhbmdlLmJvdW5kKFt0b3BpY05hbWUsICctJ10sIFt0b3BpY05hbWUsICd+J10pKS5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC5yZXN1bHQuZm9yRWFjaCgodG9waWMpID0+IHtcbiAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCB0b3BpYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZShldmVudC50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBNZXNzYWdlcy5cblxuICAgIC8qKlxuICAgICAqIFNhdmUgbWVzc2FnZSB0byBwZXJzaXN0ZW50IGNhY2hlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpY05hbWUgLSBuYW1lIG9mIHRoZSB0b3BpYyB3aGljaCBvd25zIHRoZSBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtc2cgLSBtZXNzYWdlIHRvIHNhdmUuXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSByZXNvbHZlZC9yZWplY3RlZCBvbiBvcGVyYXRpb24gY29tcGxldGlvbi5cbiAgICAgKi9cbiAgICBhZGRNZXNzYWdlOiBmdW5jdGlvbihtc2cpIHtcbiAgICAgIGlmICghdGhpcy5pc1JlYWR5KCkpIHtcbiAgICAgICAgcmV0dXJuIGRpc2FibGVkID9cbiAgICAgICAgICBQcm9taXNlLnJlc29sdmUoKSA6XG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwibm90IGluaXRpYWxpemVkXCIpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHRyeCA9IGRiLnRyYW5zYWN0aW9uKFsnbWVzc2FnZSddLCAncmVhZHdyaXRlJyk7XG4gICAgICAgIHRyeC5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcImFkZE1lc3NzYWdlXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgnbWVzc2FnZScpLmFkZChzZXJpYWxpemVNZXNzYWdlKG51bGwsIG1zZykpO1xuICAgICAgICB0cnguY29tbWl0KCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRlbGl2ZXJ5IHN0YXR1cyBvZiBhIG1lc3NhZ2Ugc3RvcmVkIGluIHBlcnNpc3RlbnQgY2FjaGUuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIG5hbWUgb2YgdGhlIHRvcGljIHdoaWNoIG93bnMgdGhlIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlcSAtIElEIG9mIHRoZSBtZXNzYWdlIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGF0dXMgLSBuZXcgZGVsaXZlcnkgc3RhdHVzIG9mIHRoZSBtZXNzYWdlLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgdXBkTWVzc2FnZVN0YXR1czogZnVuY3Rpb24odG9waWNOYW1lLCBzZXEsIHN0YXR1cykge1xuICAgICAgaWYgKCF0aGlzLmlzUmVhZHkoKSkge1xuICAgICAgICByZXR1cm4gZGlzYWJsZWQgP1xuICAgICAgICAgIFByb21pc2UucmVzb2x2ZSgpIDpcbiAgICAgICAgICBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJub3QgaW5pdGlhbGl6ZWRcIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdHJ4ID0gZGIudHJhbnNhY3Rpb24oWydtZXNzYWdlJ10sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgdHJ4Lm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoZXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgbG9nZ2VyKFwiUENhY2hlXCIsIFwidXBkTWVzc2FnZVN0YXR1c1wiLCBldmVudC50YXJnZXQuZXJyb3IpO1xuICAgICAgICAgIHJlamVjdChldmVudC50YXJnZXQuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCByZXEgPSB0cngub2JqZWN0U3RvcmUoJ21lc3NhZ2UnKS5nZXQoSURCS2V5UmFuZ2Uub25seShbdG9waWNOYW1lLCBzZXFdKSk7XG4gICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBzcmMgPSByZXEucmVzdWx0IHx8IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgaWYgKCFzcmMgfHwgc3JjLl9zdGF0dXMgPT0gc3RhdHVzKSB7XG4gICAgICAgICAgICB0cnguY29tbWl0KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRyeC5vYmplY3RTdG9yZSgnbWVzc2FnZScpLnB1dChzZXJpYWxpemVNZXNzYWdlKHNyYywge1xuICAgICAgICAgICAgdG9waWM6IHRvcGljTmFtZSxcbiAgICAgICAgICAgIHNlcTogc2VxLFxuICAgICAgICAgICAgX3N0YXR1czogc3RhdHVzXG4gICAgICAgICAgfSkpO1xuICAgICAgICAgIHRyeC5jb21taXQoKTtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgb25lIG9yIG1vcmUgbWVzc2FnZXMgZnJvbSBwZXJzaXN0ZW50IGNhY2hlLlxuICAgICAqIEBtZW1iZXJPZiBEQlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpY05hbWUgLSBuYW1lIG9mIHRoZSB0b3BpYyB3aGljaCBvd25zIHRoZSBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBmcm9tIC0gaWQgb2YgdGhlIG1lc3NhZ2UgdG8gcmVtb3ZlIG9yIGxvd2VyIGJvdW5kYXJ5IHdoZW4gcmVtb3ZpbmcgcmFuZ2UgKGluY2x1c2l2ZSkuXG4gICAgICogQHBhcmFtIHtudW1iZXI9fSB0byAtIHVwcGVyIGJvdW5kYXJ5IChleGNsdXNpdmUpIHdoZW4gcmVtb3ZpbmcgYSByYW5nZSBvZiBtZXNzYWdlcy5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHJlc29sdmVkL3JlamVjdGVkIG9uIG9wZXJhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqL1xuICAgIHJlbU1lc3NhZ2VzOiBmdW5jdGlvbih0b3BpY05hbWUsIGZyb20sIHRvKSB7XG4gICAgICBpZiAoIXRoaXMuaXNSZWFkeSgpKSB7XG4gICAgICAgIHJldHVybiBkaXNhYmxlZCA/XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBpZiAoIWZyb20gJiYgIXRvKSB7XG4gICAgICAgICAgZnJvbSA9IDA7XG4gICAgICAgICAgdG8gPSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByYW5nZSA9IHRvID4gMCA/IElEQktleVJhbmdlLmJvdW5kKFt0b3BpY05hbWUsIGZyb21dLCBbdG9waWNOYW1lLCB0b10sIGZhbHNlLCB0cnVlKSA6XG4gICAgICAgICAgSURCS2V5UmFuZ2Uub25seShbdG9waWNOYW1lLCBmcm9tXSk7XG4gICAgICAgIGNvbnN0IHRyeCA9IGRiLnRyYW5zYWN0aW9uKFsnbWVzc2FnZSddLCAncmVhZHdyaXRlJyk7XG4gICAgICAgIHRyeC5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICB0cngub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGxvZ2dlcihcIlBDYWNoZVwiLCBcInJlbU1lc3NhZ2VzXCIsIGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHRyeC5vYmplY3RTdG9yZSgnbWVzc2FnZScpLmRlbGV0ZShyYW5nZSk7XG4gICAgICAgIHRyeC5jb21taXQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZSBtZXNzYWdlcyBmcm9tIHBlcnNpc3RlbnQgc3RvcmUuXG4gICAgICogQG1lbWJlck9mIERCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIG5hbWUgb2YgdGhlIHRvcGljIHRvIHJldHJpZXZlIG1lc3NhZ2VzIGZyb20uXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgdG8gY2FsbCBmb3IgZWFjaCByZXRyaWV2ZWQgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgLSBwYXJhbWV0ZXJzIG9mIHRoZSBtZXNzYWdlIHJhbmdlIHRvIHJldHJpZXZlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyPX0gcXVlcnkuZnJvbSAtIHRoZSBsZWFzdCBtZXNzYWdlIElEIHRvIHJldHJpZXZlIChpbmNsdXNpdmUpLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyPX0gcXVlcnkudG8gLSB0aGUgZ3JlYXRlc3QgbWVzc2FnZSBJRCB0byByZXRyaWV2ZSAoZXhjbHVzaXZlKS5cbiAgICAgKiBAcGFyYW0ge251bWJlcj19IHF1ZXJ5LmxpbWl0IC0gdGhlIG1heGltdW0gbnVtYmVyIG9mIG1lc3NhZ2VzIHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gb3BlcmF0aW9uIGNvbXBsZXRpb24uXG4gICAgICovXG4gICAgcmVhZE1lc3NhZ2VzOiBmdW5jdGlvbih0b3BpY05hbWUsIHF1ZXJ5LCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCF0aGlzLmlzUmVhZHkoKSkge1xuICAgICAgICByZXR1cm4gZGlzYWJsZWQgP1xuICAgICAgICAgIFByb21pc2UucmVzb2x2ZShbXSkgOlxuICAgICAgICAgIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIm5vdCBpbml0aWFsaXplZFwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBxdWVyeSA9IHF1ZXJ5IHx8IHt9O1xuICAgICAgICBjb25zdCBmcm9tID0gcXVlcnkuZnJvbSA+IDAgPyBxdWVyeS5mcm9tIDogMDtcbiAgICAgICAgY29uc3QgdG8gPSBxdWVyeS50byA+IDAgPyBxdWVyeS50byA6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuICAgICAgICBjb25zdCBsaW1pdCA9IHF1ZXJ5LmxpbWl0IHwgMDtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICAgICAgY29uc3QgcmFuZ2UgPSBJREJLZXlSYW5nZS5ib3VuZChbdG9waWNOYW1lLCBmcm9tXSwgW3RvcGljTmFtZSwgdG9dLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHRyeCA9IGRiLnRyYW5zYWN0aW9uKFsnbWVzc2FnZSddKTtcbiAgICAgICAgdHJ4Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICBsb2dnZXIoXCJQQ2FjaGVcIiwgXCJyZWFkTWVzc2FnZXNcIiwgZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gSXRlcmF0ZSBpbiBkZXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICB0cngub2JqZWN0U3RvcmUoJ21lc3NhZ2UnKS5vcGVuQ3Vyc29yKHJhbmdlLCAncHJldicpLm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGN1cnNvciA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGN1cnNvci52YWx1ZSk7XG4gICAgICAgICAgICBpZiAobGltaXQgPD0gMCB8fCByZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gREI7XG59XG4iLCIvKipcbiAqIEBjb3B5cmlnaHQgMjAxNS0yMDIxIFRpbm9kZVxuICogQHN1bW1hcnkgTWluaW1hbGx5IHJpY2ggdGV4dCByZXByZXNlbnRhdGlvbiBhbmQgZm9ybWF0dGluZyBmb3IgVGlub2RlLlxuICogQGxpY2Vuc2UgQXBhY2hlIDIuMFxuICogQHZlcnNpb24gMC4xNlxuICpcbiAqIEBmaWxlIEJhc2ljIHBhcnNlciBhbmQgZm9ybWF0dGVyIGZvciB2ZXJ5IHNpbXBsZSB0ZXh0IG1hcmt1cC4gTW9zdGx5IHRhcmdldGVkIGF0XG4gKiBtb2JpbGUgdXNlIGNhc2VzIHNpbWlsYXIgdG8gVGVsZWdyYW0sIFdoYXRzQXBwLCBhbmQgRkIgTWVzc2VuZ2VyLlxuICpcbiAqIDxwPlN1cHBvcnRzIGNvbnZlcnNpb24gb2YgdXNlciBrZXlib2FyZCBpbnB1dCB0byBmb3JtYXR0ZWQgdGV4dDo8L3A+XG4gKiA8dWw+XG4gKiAgIDxsaT4qYWJjKiAmcmFycjsgPGI+YWJjPC9iPjwvbGk+XG4gKiAgIDxsaT5fYWJjXyAmcmFycjsgPGk+YWJjPC9pPjwvbGk+XG4gKiAgIDxsaT5+YWJjfiAmcmFycjsgPGRlbD5hYmM8L2RlbD48L2xpPlxuICogICA8bGk+YGFiY2AgJnJhcnI7IDx0dD5hYmM8L3R0PjwvbGk+XG4gKiA8L3VsPlxuICogQWxzbyBzdXBwb3J0cyBmb3JtcyBhbmQgYnV0dG9ucy5cbiAqXG4gKiBOZXN0ZWQgZm9ybWF0dGluZyBpcyBzdXBwb3J0ZWQsIGUuZy4gKmFiYyBfZGVmXyogLT4gPGI+YWJjIDxpPmRlZjwvaT48L2I+XG4gKiBVUkxzLCBAbWVudGlvbnMsIGFuZCAjaGFzaHRhZ3MgYXJlIGV4dHJhY3RlZCBhbmQgY29udmVydGVkIGludG8gbGlua3MuXG4gKiBGb3JtcyBhbmQgYnV0dG9ucyBjYW4gYmUgYWRkZWQgcHJvY2VkdXJhbGx5LlxuICogSlNPTiBkYXRhIHJlcHJlc2VudGF0aW9uIGlzIGluc3BpcmVkIGJ5IERyYWZ0LmpzIHJhdyBmb3JtYXR0aW5nLlxuICpcbiAqXG4gKiBAZXhhbXBsZVxuICogVGV4dDpcbiAqIDxwcmU+XG4gKiAgICAgdGhpcyBpcyAqYm9sZCosIGBjb2RlYCBhbmQgX2l0YWxpY18sIH5zdHJpa2V+XG4gKiAgICAgY29tYmluZWQgKmJvbGQgYW5kIF9pdGFsaWNfKlxuICogICAgIGFuIHVybDogaHR0cHM6Ly93d3cuZXhhbXBsZS5jb20vYWJjI2ZyYWdtZW50IGFuZCBhbm90aGVyIF93d3cudGlub2RlLmNvX1xuICogICAgIHRoaXMgaXMgYSBAbWVudGlvbiBhbmQgYSAjaGFzaHRhZyBpbiBhIHN0cmluZ1xuICogICAgIHNlY29uZCAjaGFzaHRhZ1xuICogPC9wcmU+XG4gKlxuICogIFNhbXBsZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0ZXh0IGFib3ZlOlxuICogIHtcbiAqICAgICBcInR4dFwiOiBcInRoaXMgaXMgYm9sZCwgY29kZSBhbmQgaXRhbGljLCBzdHJpa2UgY29tYmluZWQgYm9sZCBhbmQgaXRhbGljIGFuIHVybDogaHR0cHM6Ly93d3cuZXhhbXBsZS5jb20vYWJjI2ZyYWdtZW50IFwiICtcbiAqICAgICAgICAgICAgIFwiYW5kIGFub3RoZXIgd3d3LnRpbm9kZS5jbyB0aGlzIGlzIGEgQG1lbnRpb24gYW5kIGEgI2hhc2h0YWcgaW4gYSBzdHJpbmcgc2Vjb25kICNoYXNodGFnXCIsXG4gKiAgICAgXCJmbXRcIjogW1xuICogICAgICAgICB7IFwiYXRcIjo4LCBcImxlblwiOjQsXCJ0cFwiOlwiU1RcIiB9LHsgXCJhdFwiOjE0LCBcImxlblwiOjQsIFwidHBcIjpcIkNPXCIgfSx7IFwiYXRcIjoyMywgXCJsZW5cIjo2LCBcInRwXCI6XCJFTVwifSxcbiAqICAgICAgICAgeyBcImF0XCI6MzEsIFwibGVuXCI6NiwgXCJ0cFwiOlwiRExcIiB9LHsgXCJ0cFwiOlwiQlJcIiwgXCJsZW5cIjoxLCBcImF0XCI6MzcgfSx7IFwiYXRcIjo1NiwgXCJsZW5cIjo2LCBcInRwXCI6XCJFTVwiIH0sXG4gKiAgICAgICAgIHsgXCJhdFwiOjQ3LCBcImxlblwiOjE1LCBcInRwXCI6XCJTVFwiIH0seyBcInRwXCI6XCJCUlwiLCBcImxlblwiOjEsIFwiYXRcIjo2MiB9LHsgXCJhdFwiOjEyMCwgXCJsZW5cIjoxMywgXCJ0cFwiOlwiRU1cIiB9LFxuICogICAgICAgICB7IFwiYXRcIjo3MSwgXCJsZW5cIjozNiwgXCJrZXlcIjowIH0seyBcImF0XCI6MTIwLCBcImxlblwiOjEzLCBcImtleVwiOjEgfSx7IFwidHBcIjpcIkJSXCIsIFwibGVuXCI6MSwgXCJhdFwiOjEzMyB9LFxuICogICAgICAgICB7IFwiYXRcIjoxNDQsIFwibGVuXCI6OCwgXCJrZXlcIjoyIH0seyBcImF0XCI6MTU5LCBcImxlblwiOjgsIFwia2V5XCI6MyB9LHsgXCJ0cFwiOlwiQlJcIiwgXCJsZW5cIjoxLCBcImF0XCI6MTc5IH0sXG4gKiAgICAgICAgIHsgXCJhdFwiOjE4NywgXCJsZW5cIjo4LCBcImtleVwiOjMgfSx7IFwidHBcIjpcIkJSXCIsIFwibGVuXCI6MSwgXCJhdFwiOjE5NSB9XG4gKiAgICAgXSxcbiAqICAgICBcImVudFwiOiBbXG4gKiAgICAgICAgIHsgXCJ0cFwiOlwiTE5cIiwgXCJkYXRhXCI6eyBcInVybFwiOlwiaHR0cHM6Ly93d3cuZXhhbXBsZS5jb20vYWJjI2ZyYWdtZW50XCIgfSB9LFxuICogICAgICAgICB7IFwidHBcIjpcIkxOXCIsIFwiZGF0YVwiOnsgXCJ1cmxcIjpcImh0dHA6Ly93d3cudGlub2RlLmNvXCIgfSB9LFxuICogICAgICAgICB7IFwidHBcIjpcIk1OXCIsIFwiZGF0YVwiOnsgXCJ2YWxcIjpcIm1lbnRpb25cIiB9IH0sXG4gKiAgICAgICAgIHsgXCJ0cFwiOlwiSFRcIiwgXCJkYXRhXCI6eyBcInZhbFwiOlwiaGFzaHRhZ1wiIH0gfVxuICogICAgIF1cbiAqICB9XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBOT1RFIFRPIERFVkVMT1BFUlM6XG4vLyBMb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBkb3VibGUgcXVvdGVkIFwi0YHRgtGA0L7QutCwINC90LAg0LTRgNGD0LPQvtC8INGP0LfRi9C60LVcIixcbi8vIG5vbi1sb2NhbGl6YWJsZSBzdHJpbmdzIHNob3VsZCBiZSBzaW5nbGUgcXVvdGVkICdub24tbG9jYWxpemVkJy5cblxuY29uc3QgTUFYX0ZPUk1fRUxFTUVOVFMgPSA4O1xuY29uc3QgSlNPTl9NSU1FX1RZUEUgPSAnYXBwbGljYXRpb24vanNvbic7XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbnMgZm9yIHBhcnNpbmcgaW5saW5lIGZvcm1hdHMuIEphdmFzY3JpcHQgZG9lcyBub3Qgc3VwcG9ydCBsb29rYmVoaW5kLFxuLy8gc28gaXQncyBhIGJpdCBtZXNzeS5cbmNvbnN0IElOTElORV9TVFlMRVMgPSBbXG4gIC8vIFN0cm9uZyA9IGJvbGQsICpib2xkIHRleHQqXG4gIHtcbiAgICBuYW1lOiAnU1QnLFxuICAgIHN0YXJ0OiAvKD86XnxbXFxXX10pKFxcKilbXlxccypdLyxcbiAgICBlbmQ6IC9bXlxccypdKFxcKikoPz0kfFtcXFdfXSkvXG4gIH0sXG4gIC8vIEVtcGhlc2l6ZWQgPSBpdGFsaWMsIF9pdGFsaWMgdGV4dF9cbiAge1xuICAgIG5hbWU6ICdFTScsXG4gICAgc3RhcnQ6IC8oPzpefFxcVykoXylbXlxcc19dLyxcbiAgICBlbmQ6IC9bXlxcc19dKF8pKD89JHxcXFcpL1xuICB9LFxuICAvLyBEZWxldGVkLCB+c3RyaWtlIHRoaXMgdGhvdWdoflxuICB7XG4gICAgbmFtZTogJ0RMJyxcbiAgICBzdGFydDogLyg/Ol58W1xcV19dKSh+KVteXFxzfl0vLFxuICAgIGVuZDogL1teXFxzfl0ofikoPz0kfFtcXFdfXSkvXG4gIH0sXG4gIC8vIENvZGUgYmxvY2sgYHRoaXMgaXMgbW9ub3NwYWNlYFxuICB7XG4gICAgbmFtZTogJ0NPJyxcbiAgICBzdGFydDogLyg/Ol58XFxXKShgKVteYF0vLFxuICAgIGVuZDogL1teYF0oYCkoPz0kfFxcVykvXG4gIH1cbl07XG5cbi8vIFJlZ0V4cHMgZm9yIGVudGl0eSBleHRyYWN0aW9uIChSRiA9IHJlZmVyZW5jZSlcbmNvbnN0IEVOVElUWV9UWVBFUyA9IFtcbiAgLy8gVVJMc1xuICB7XG4gICAgbmFtZTogJ0xOJyxcbiAgICBkYXRhTmFtZTogJ3VybCcsXG4gICAgcGFjazogZnVuY3Rpb24odmFsKSB7XG4gICAgICAvLyBDaGVjayBpZiB0aGUgcHJvdG9jb2wgaXMgc3BlY2lmaWVkLCBpZiBub3QgdXNlIGh0dHBcbiAgICAgIGlmICghL15bYS16XSs6XFwvXFwvL2kudGVzdCh2YWwpKSB7XG4gICAgICAgIHZhbCA9ICdodHRwOi8vJyArIHZhbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHVybDogdmFsXG4gICAgICB9O1xuICAgIH0sXG4gICAgcmU6IC8oPzooPzpodHRwcz98ZnRwKTpcXC9cXC98d3d3XFwufGZ0cFxcLilbLUEtWjAtOSsmQCNcXC8lPX5ffCQ/ITosLl0qW0EtWjAtOSsmQCNcXC8lPX5ffCRdL2lnXG4gIH0sXG4gIC8vIE1lbnRpb25zIEB1c2VyIChtdXN0IGJlIDIgb3IgbW9yZSBjaGFyYWN0ZXJzKVxuICB7XG4gICAgbmFtZTogJ01OJyxcbiAgICBkYXRhTmFtZTogJ3ZhbCcsXG4gICAgcGFjazogZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWw6IHZhbC5zbGljZSgxKVxuICAgICAgfTtcbiAgICB9LFxuICAgIHJlOiAvXFxCQChcXHdcXHcrKS9nXG4gIH0sXG4gIC8vIEhhc2h0YWdzICNoYXNodGFnLCBsaWtlIG1ldGlvbiAyIG9yIG1vcmUgY2hhcmFjdGVycy5cbiAge1xuICAgIG5hbWU6ICdIVCcsXG4gICAgZGF0YU5hbWU6ICd2YWwnLFxuICAgIHBhY2s6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsOiB2YWwuc2xpY2UoMSlcbiAgICAgIH07XG4gICAgfSxcbiAgICByZTogL1xcQiMoXFx3XFx3KykvZ1xuICB9XG5dO1xuXG4vLyBIVE1MIHRhZyBuYW1lIHN1Z2dlc3Rpb25zXG5jb25zdCBIVE1MX1RBR1MgPSB7XG4gIFNUOiB7XG4gICAgbmFtZTogJ2InLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgRU06IHtcbiAgICBuYW1lOiAnaScsXG4gICAgaXNWb2lkOiBmYWxzZVxuICB9LFxuICBETDoge1xuICAgIG5hbWU6ICdkZWwnLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgQ086IHtcbiAgICBuYW1lOiAndHQnLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgQlI6IHtcbiAgICBuYW1lOiAnYnInLFxuICAgIGlzVm9pZDogdHJ1ZVxuICB9LFxuICBMTjoge1xuICAgIG5hbWU6ICdhJyxcbiAgICBpc1ZvaWQ6IGZhbHNlXG4gIH0sXG4gIE1OOiB7XG4gICAgbmFtZTogJ2EnLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgSFQ6IHtcbiAgICBuYW1lOiAnYScsXG4gICAgaXNWb2lkOiBmYWxzZVxuICB9LFxuICBJTToge1xuICAgIG5hbWU6ICdpbWcnLFxuICAgIGlzVm9pZDogdHJ1ZVxuICB9LFxuICBGTToge1xuICAgIG5hbWU6ICdkaXYnLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgUlc6IHtcbiAgICBuYW1lOiAnZGl2JyxcbiAgICBpc1ZvaWQ6IGZhbHNlLFxuICB9LFxuICBCTjoge1xuICAgIG5hbWU6ICdidXR0b24nLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfSxcbiAgSEQ6IHtcbiAgICBuYW1lOiAnJyxcbiAgICBpc1ZvaWQ6IGZhbHNlXG4gIH0sXG4gIEhMOiB7XG4gICAgbmFtZTogJ3NwYW4nLFxuICAgIGlzVm9pZDogZmFsc2VcbiAgfVxufTtcblxuLy8gQ29udmVydCBiYXNlNjQtZW5jb2RlZCBzdHJpbmcgaW50byBCbG9iLlxuZnVuY3Rpb24gYmFzZTY0dG9PYmplY3RVcmwoYjY0LCBjb250ZW50VHlwZSwgbG9nZ2VyKSB7XG4gIGlmICghYjY0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGJpbiA9IGF0b2IoYjY0KTtcbiAgICBjb25zdCBsZW5ndGggPSBiaW4ubGVuZ3RoO1xuICAgIGNvbnN0IGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW5ndGgpO1xuICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYXJyW2ldID0gYmluLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW2J1Zl0sIHtcbiAgICAgIHR5cGU6IGNvbnRlbnRUeXBlXG4gICAgfSkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAobG9nZ2VyKSB7XG4gICAgICBsb2dnZXIoXCJEcmFmdHk6IGZhaWxlZCB0byBjb252ZXJ0IG9iamVjdC5cIiwgZXJyLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBiYXNlNjR0b0RhdGFVcmwoYjY0LCBjb250ZW50VHlwZSkge1xuICBpZiAoIWI2NCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnRlbnRUeXBlID0gY29udGVudFR5cGUgfHwgJ2ltYWdlL2pwZWcnO1xuICByZXR1cm4gJ2RhdGE6JyArIGNvbnRlbnRUeXBlICsgJztiYXNlNjQsJyArIGI2NDtcbn1cblxuLy8gSGVscGVycyBmb3IgY29udmVydGluZyBEcmFmdHkgdG8gSFRNTC5cbmNvbnN0IERFQ09SQVRPUlMgPSB7XG4gIC8vIFZpc2lhbCBzdHlsZXNcbiAgU1Q6IHtcbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnPGI+JztcbiAgICB9LFxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnPC9iPic7XG4gICAgfVxuICB9LFxuICBFTToge1xuICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICc8aT4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICc8L2k+J1xuICAgIH1cbiAgfSxcbiAgREw6IHtcbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnPGRlbD4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICc8L2RlbD4nXG4gICAgfVxuICB9LFxuICBDTzoge1xuICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICc8dHQ+JztcbiAgICB9LFxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnPC90dD4nXG4gICAgfVxuICB9LFxuICAvLyBMaW5lIGJyZWFrXG4gIEJSOiB7XG4gICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJzxici8+JztcbiAgICB9LFxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnJ1xuICAgIH1cbiAgfSxcbiAgLy8gSGlkZGVuIGVsZW1lbnRcbiAgSEQ6IHtcbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH0sXG4gIC8vIEhpZ2hsaWdodGVkIGVsZW1lbnQuXG4gIEhMOiB7XG4gICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJzxzcGFuIHN0eWxlPVwiY29sb3I6dGVhbFwiPic7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJzwvc3Bhbj4nO1xuICAgIH1cbiAgfSxcbiAgLy8gTGluayAoVVJMKVxuICBMTjoge1xuICAgIG9wZW46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyBkYXRhLnVybCArICdcIj4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPC9hPic7XG4gICAgfSxcbiAgICBwcm9wczogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIGRhdGEgPyB7XG4gICAgICAgIGhyZWY6IGRhdGEudXJsLFxuICAgICAgICB0YXJnZXQ6IFwiX2JsYW5rXCJcbiAgICAgIH0gOiBudWxsO1xuICAgIH0sXG4gIH0sXG4gIC8vIE1lbnRpb25cbiAgTU46IHtcbiAgICBvcGVuOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gJzxhIGhyZWY9XCIjJyArIGRhdGEudmFsICsgJ1wiPic7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuICc8L2E+JztcbiAgICB9LFxuICAgIHByb3BzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gZGF0YSA/IHtcbiAgICAgICAgbmFtZTogZGF0YS52YWxcbiAgICAgIH0gOiBudWxsO1xuICAgIH0sXG4gIH0sXG4gIC8vIEhhc2h0YWdcbiAgSFQ6IHtcbiAgICBvcGVuOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gJzxhIGhyZWY9XCIjJyArIGRhdGEudmFsICsgJ1wiPic7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuICc8L2E+JztcbiAgICB9LFxuICAgIHByb3BzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gZGF0YSA/IHtcbiAgICAgICAgbmFtZTogZGF0YS52YWxcbiAgICAgIH0gOiBudWxsO1xuICAgIH0sXG4gIH0sXG4gIC8vIEJ1dHRvblxuICBCTjoge1xuICAgIG9wZW46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPGJ1dHRvbj4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPC9idXR0b24+JztcbiAgICB9LFxuICAgIHByb3BzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gZGF0YSA/IHtcbiAgICAgICAgJ2RhdGEtYWN0JzogZGF0YS5hY3QsXG4gICAgICAgICdkYXRhLXZhbCc6IGRhdGEudmFsLFxuICAgICAgICAnZGF0YS1uYW1lJzogZGF0YS5uYW1lLFxuICAgICAgICAnZGF0YS1yZWYnOiBkYXRhLnJlZlxuICAgICAgfSA6IG51bGw7XG4gICAgfSxcbiAgfSxcbiAgLy8gSW1hZ2VcbiAgSU06IHtcbiAgICBvcGVuOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAvLyBEb24ndCB1c2UgZGF0YS5yZWYgZm9yIHByZXZpZXc6IGl0J3MgYSBzZWN1cml0eSByaXNrLlxuICAgICAgY29uc3QgdG1wUHJldmlld1VybCA9IGJhc2U2NHRvRGF0YVVybChkYXRhLl90ZW1wUHJldmlldywgZGF0YS5taW1lKTtcbiAgICAgIGNvbnN0IHByZXZpZXdVcmwgPSBiYXNlNjR0b09iamVjdFVybChkYXRhLnZhbCwgZGF0YS5taW1lLCBEcmFmdHkubG9nZ2VyKTtcbiAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gZGF0YS5yZWYgfHwgcHJldmlld1VybDtcbiAgICAgIHJldHVybiAoZGF0YS5uYW1lID8gJzxhIGhyZWY9XCInICsgZG93bmxvYWRVcmwgKyAnXCIgZG93bmxvYWQ9XCInICsgZGF0YS5uYW1lICsgJ1wiPicgOiAnJykgK1xuICAgICAgICAnPGltZyBzcmM9XCInICsgKHRtcFByZXZpZXdVcmwgfHwgcHJldmlld1VybCkgKyAnXCInICtcbiAgICAgICAgKGRhdGEud2lkdGggPyAnIHdpZHRoPVwiJyArIGRhdGEud2lkdGggKyAnXCInIDogJycpICtcbiAgICAgICAgKGRhdGEuaGVpZ2h0ID8gJyBoZWlnaHQ9XCInICsgZGF0YS5oZWlnaHQgKyAnXCInIDogJycpICsgJyBib3JkZXI9XCIwXCIgLz4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAoZGF0YS5uYW1lID8gJzwvYT4nIDogJycpO1xuICAgIH0sXG4gICAgcHJvcHM6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAvLyBUZW1wb3JhcnkgcHJldmlldywgb3IgcGVybWFuZW50IHByZXZpZXcsIG9yIGV4dGVybmFsIGxpbmsuXG4gICAgICAgIHNyYzogYmFzZTY0dG9EYXRhVXJsKGRhdGEuX3RlbXBQcmV2aWV3LCBkYXRhLm1pbWUpIHx8XG4gICAgICAgICAgZGF0YS5yZWYgfHwgYmFzZTY0dG9PYmplY3RVcmwoZGF0YS52YWwsIGRhdGEubWltZSwgRHJhZnR5LmxvZ2dlciksXG4gICAgICAgIHRpdGxlOiBkYXRhLm5hbWUsXG4gICAgICAgICdkYXRhLXdpZHRoJzogZGF0YS53aWR0aCxcbiAgICAgICAgJ2RhdGEtaGVpZ2h0JzogZGF0YS5oZWlnaHQsXG4gICAgICAgICdkYXRhLW5hbWUnOiBkYXRhLm5hbWUsXG4gICAgICAgICdkYXRhLXNpemUnOiBkYXRhLnZhbCA/ICgoZGF0YS52YWwubGVuZ3RoICogMC43NSkgfCAwKSA6IChkYXRhLnNpemUgfCAwKSxcbiAgICAgICAgJ2RhdGEtbWltZSc6IGRhdGEubWltZVxuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAvLyBGb3JtIC0gc3RydWN0dXJlZCBsYXlvdXQgb2YgZWxlbWVudHMuXG4gIEZNOiB7XG4gICAgb3BlbjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuICc8ZGl2Pic7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuICc8L2Rpdj4nO1xuICAgIH1cbiAgfSxcbiAgLy8gUm93OiBsb2dpYyBncm91cGluZyBvZiBlbGVtZW50c1xuICBSVzoge1xuICAgIG9wZW46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPGRpdj4nO1xuICAgIH0sXG4gICAgY2xvc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiAnPC9kaXY+JztcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogVGhlIG1haW4gb2JqZWN0IHdoaWNoIHBlcmZvcm1zIGFsbCB0aGUgZm9ybWF0dGluZyBhY3Rpb25zLlxuICogQGNsYXNzIERyYWZ0eVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmNvbnN0IERyYWZ0eSA9IGZ1bmN0aW9uKCkge31cblxuLy8gVGFrZSBhIHN0cmluZyBhbmQgZGVmaW5lZCBlYXJsaWVyIHN0eWxlIHNwYW5zLCByZS1jb21wb3NlIHRoZW0gaW50byBhIHRyZWUgd2hlcmUgZWFjaCBsZWFmIGlzXG4vLyBhIHNhbWUtc3R5bGUgKGluY2x1ZGluZyB1bnN0eWxlZCkgc3RyaW5nLiBJLmUuICdoZWxsbyAqYm9sZCBfaXRhbGljXyogYW5kIH5tb3JlfiB3b3JsZCcgLT5cbi8vICgnaGVsbG8gJywgKGI6ICdib2xkICcsIChpOiAnaXRhbGljJykpLCAnIGFuZCAnLCAoczogJ21vcmUnKSwgJyB3b3JsZCcpO1xuLy9cbi8vIFRoaXMgaXMgbmVlZGVkIGluIG9yZGVyIHRvIGNsZWFyIG1hcmt1cCwgaS5lLiAnaGVsbG8gKndvcmxkKicgLT4gJ2hlbGxvIHdvcmxkJyBhbmQgY29udmVydFxuLy8gcmFuZ2VzIGZyb20gbWFya3VwLWVkIG9mZnNldHMgdG8gcGxhaW4gdGV4dCBvZmZzZXRzLlxuZnVuY3Rpb24gY2h1bmtpZnkobGluZSwgc3RhcnQsIGVuZCwgc3BhbnMpIHtcbiAgY29uc3QgY2h1bmtzID0gW107XG5cbiAgaWYgKHNwYW5zLmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZm9yIChsZXQgaSBpbiBzcGFucykge1xuICAgIC8vIEdldCB0aGUgbmV4dCBjaHVuayBmcm9tIHRoZSBxdWV1ZVxuICAgIGNvbnN0IHNwYW4gPSBzcGFuc1tpXTtcblxuICAgIC8vIEdyYWIgdGhlIGluaXRpYWwgdW5zdHlsZWQgY2h1bmtcbiAgICBpZiAoc3Bhbi5zdGFydCA+IHN0YXJ0KSB7XG4gICAgICBjaHVua3MucHVzaCh7XG4gICAgICAgIHRleHQ6IGxpbmUuc2xpY2Uoc3RhcnQsIHNwYW4uc3RhcnQpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBHcmFiIHRoZSBzdHlsZWQgY2h1bmsuIEl0IG1heSBpbmNsdWRlIHN1YmNodW5rcy5cbiAgICBjb25zdCBjaHVuayA9IHtcbiAgICAgIHR5cGU6IHNwYW4udHlwZVxuICAgIH07XG4gICAgY29uc3QgY2hsZCA9IGNodW5raWZ5KGxpbmUsIHNwYW4uc3RhcnQgKyAxLCBzcGFuLmVuZCwgc3Bhbi5jaGlsZHJlbik7XG4gICAgaWYgKGNobGQubGVuZ3RoID4gMCkge1xuICAgICAgY2h1bmsuY2hpbGRyZW4gPSBjaGxkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaHVuay50ZXh0ID0gc3Bhbi50ZXh0O1xuICAgIH1cbiAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgc3RhcnQgPSBzcGFuLmVuZCArIDE7IC8vICcrMScgaXMgdG8gc2tpcCB0aGUgZm9ybWF0dGluZyBjaGFyYWN0ZXJcbiAgfVxuXG4gIC8vIEdyYWIgdGhlIHJlbWFpbmluZyB1bnN0eWxlZCBjaHVuaywgYWZ0ZXIgdGhlIGxhc3Qgc3BhblxuICBpZiAoc3RhcnQgPCBlbmQpIHtcbiAgICBjaHVua3MucHVzaCh7XG4gICAgICB0ZXh0OiBsaW5lLnNsaWNlKHN0YXJ0LCBlbmQpXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY2h1bmtzO1xufVxuXG4vLyBJbnZlcnNlIG9mIGNodW5raWZ5LiBSZXR1cm5zIGEgdHJlZSBvZiBmb3JtYXR0ZWQgc3BhbnMuXG5mdW5jdGlvbiBmb3JFYWNoKGxpbmUsIHN0YXJ0LCBlbmQsIHNwYW5zLCBmb3JtYXR0ZXIsIGNvbnRleHQpIHtcbiAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgLy8gUHJvY2VzcyByYW5nZXMgY2FsbGluZyBmb3JtYXR0ZXIgZm9yIGVhY2ggcmFuZ2UuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3BhbnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBzcGFuID0gc3BhbnNbaV07XG4gICAgaWYgKHNwYW4uYXQgPCAwKSB7XG4gICAgICAvLyBBc2sgZm9ybWF0dGVyIGlmIGl0IHdhbnRzIHRvIGRvIGFueXRoaW5nIHdpdGggdGhlIG5vbi12aXN1YWwgc3Bhbi5cbiAgICAgIGNvbnN0IHMgPSBmb3JtYXR0ZXIuY2FsbChjb250ZXh0LCBzcGFuLnRwLCBzcGFuLmRhdGEsIHVuZGVmaW5lZCwgcmVzdWx0Lmxlbmd0aCk7XG4gICAgICBpZiAocykge1xuICAgICAgICByZXN1bHQucHVzaChzKTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBBZGQgdW4tc3R5bGVkIHJhbmdlIGJlZm9yZSB0aGUgc3R5bGVkIHNwYW4gc3RhcnRzLlxuICAgIGlmIChzdGFydCA8IHNwYW4uYXQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdHRlci5jYWxsKGNvbnRleHQsIG51bGwsIHVuZGVmaW5lZCwgbGluZS5zbGljZShzdGFydCwgc3Bhbi5hdCksIHJlc3VsdC5sZW5ndGgpKTtcbiAgICAgIHN0YXJ0ID0gc3Bhbi5hdDtcbiAgICB9XG4gICAgLy8gR2V0IGFsbCBzcGFucyB3aGljaCBhcmUgd2l0aGluIGN1cnJlbnQgc3Bhbi5cbiAgICBjb25zdCBzdWJzcGFucyA9IFtdO1xuICAgIGZvciAobGV0IHNpID0gaSArIDE7IHNpIDwgc3BhbnMubGVuZ3RoICYmIHNwYW5zW3NpXS5hdCA8IHNwYW4uYXQgKyBzcGFuLmxlbjsgc2krKykge1xuICAgICAgc3Vic3BhbnMucHVzaChzcGFuc1tzaV0pO1xuICAgICAgaSA9IHNpO1xuICAgIH1cblxuICAgIGNvbnN0IHRhZyA9IEhUTUxfVEFHU1tzcGFuLnRwXSB8fCB7fVxuICAgIHJlc3VsdC5wdXNoKGZvcm1hdHRlci5jYWxsKGNvbnRleHQsIHNwYW4udHAsIHNwYW4uZGF0YSxcbiAgICAgIHRhZy5pc1ZvaWQgPyBudWxsIDogZm9yRWFjaChsaW5lLCBzdGFydCwgc3Bhbi5hdCArIHNwYW4ubGVuLCBzdWJzcGFucywgZm9ybWF0dGVyLCBjb250ZXh0KSxcbiAgICAgIHJlc3VsdC5sZW5ndGgpKTtcblxuICAgIHN0YXJ0ID0gc3Bhbi5hdCArIHNwYW4ubGVuO1xuICB9XG5cbiAgLy8gQWRkIHRoZSBsYXN0IHVuZm9ybWF0dGVkIHJhbmdlLlxuICBpZiAoc3RhcnQgPCBlbmQpIHtcbiAgICByZXN1bHQucHVzaChmb3JtYXR0ZXIuY2FsbChjb250ZXh0LCBudWxsLCB1bmRlZmluZWQsIGxpbmUuc2xpY2Uoc3RhcnQsIGVuZCksIHJlc3VsdC5sZW5ndGgpKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIERldGVjdCBzdGFydHMgYW5kIGVuZHMgb2YgZm9ybWF0dGluZyBzcGFucy4gVW5mb3JtYXR0ZWQgc3BhbnMgYXJlXG4vLyBpZ25vcmVkIGF0IHRoaXMgc3RhZ2UuXG5mdW5jdGlvbiBzcGFubmlmeShvcmlnaW5hbCwgcmVfc3RhcnQsIHJlX2VuZCwgdHlwZSkge1xuICBjb25zdCByZXN1bHQgPSBbXTtcbiAgbGV0IGluZGV4ID0gMDtcbiAgbGV0IGxpbmUgPSBvcmlnaW5hbC5zbGljZSgwKTsgLy8gbWFrZSBhIGNvcHk7XG5cbiAgd2hpbGUgKGxpbmUubGVuZ3RoID4gMCkge1xuICAgIC8vIG1hdGNoWzBdOyAvLyBtYXRjaCwgbGlrZSAnKmFiYyonXG4gICAgLy8gbWF0Y2hbMV07IC8vIG1hdGNoIGNhcHR1cmVkIGluIHBhcmVudGhlc2lzLCBsaWtlICdhYmMnXG4gICAgLy8gbWF0Y2hbJ2luZGV4J107IC8vIG9mZnNldCB3aGVyZSB0aGUgbWF0Y2ggc3RhcnRlZC5cblxuICAgIC8vIEZpbmQgdGhlIG9wZW5pbmcgdG9rZW4uXG4gICAgY29uc3Qgc3RhcnQgPSByZV9zdGFydC5leGVjKGxpbmUpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIGphdmFzY3JpcHQgUmVnRXhwIGRvZXMgbm90IHN1cHBvcnQgbG9va2JlaGluZCwgdGhlIGFjdHVhbCBvZmZzZXQgbWF5IG5vdCBwb2ludFxuICAgIC8vIGF0IHRoZSBtYXJrdXAgY2hhcmFjdGVyLiBGaW5kIGl0IGluIHRoZSBtYXRjaGVkIHN0cmluZy5cbiAgICBsZXQgc3RhcnRfb2Zmc2V0ID0gc3RhcnRbJ2luZGV4J10gKyBzdGFydFswXS5sYXN0SW5kZXhPZihzdGFydFsxXSk7XG4gICAgLy8gQ2xpcCB0aGUgcHJvY2Vzc2VkIHBhcnQgb2YgdGhlIHN0cmluZy5cbiAgICBsaW5lID0gbGluZS5zbGljZShzdGFydF9vZmZzZXQgKyAxKTtcbiAgICAvLyBzdGFydF9vZmZzZXQgaXMgYW4gb2Zmc2V0IHdpdGhpbiB0aGUgY2xpcHBlZCBzdHJpbmcuIENvbnZlcnQgdG8gb3JpZ2luYWwgaW5kZXguXG4gICAgc3RhcnRfb2Zmc2V0ICs9IGluZGV4O1xuICAgIC8vIEluZGV4IG5vdyBwb2ludCB0byB0aGUgYmVnaW5uaW5nIG9mICdsaW5lJyB3aXRoaW4gdGhlICdvcmlnaW5hbCcgc3RyaW5nLlxuICAgIGluZGV4ID0gc3RhcnRfb2Zmc2V0ICsgMTtcblxuICAgIC8vIEZpbmQgdGhlIG1hdGNoaW5nIGNsb3NpbmcgdG9rZW4uXG4gICAgY29uc3QgZW5kID0gcmVfZW5kID8gcmVfZW5kLmV4ZWMobGluZSkgOiBudWxsO1xuICAgIGlmIChlbmQgPT0gbnVsbCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxldCBlbmRfb2Zmc2V0ID0gZW5kWydpbmRleCddICsgZW5kWzBdLmluZGV4T2YoZW5kWzFdKTtcbiAgICAvLyBDbGlwIHRoZSBwcm9jZXNzZWQgcGFydCBvZiB0aGUgc3RyaW5nLlxuICAgIGxpbmUgPSBsaW5lLnNsaWNlKGVuZF9vZmZzZXQgKyAxKTtcbiAgICAvLyBVcGRhdGUgb2Zmc2V0c1xuICAgIGVuZF9vZmZzZXQgKz0gaW5kZXg7XG4gICAgLy8gSW5kZXggbm93IHBvaW50IHRvIHRoZSBiZWdpbm5pbmcgb2YgJ2xpbmUnIHdpdGhpbiB0aGUgJ29yaWdpbmFsJyBzdHJpbmcuXG4gICAgaW5kZXggPSBlbmRfb2Zmc2V0ICsgMTtcblxuICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgIHRleHQ6IG9yaWdpbmFsLnNsaWNlKHN0YXJ0X29mZnNldCArIDEsIGVuZF9vZmZzZXQpLFxuICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgc3RhcnQ6IHN0YXJ0X29mZnNldCxcbiAgICAgIGVuZDogZW5kX29mZnNldCxcbiAgICAgIHR5cGU6IHR5cGVcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIENvbnZlcnQgbGluZWFyIGFycmF5IG9yIHNwYW5zIGludG8gYSB0cmVlIHJlcHJlc2VudGF0aW9uLlxuLy8gS2VlcCBzdGFuZGFsb25lIGFuZCBuZXN0ZWQgc3BhbnMsIHRocm93IGF3YXkgcGFydGlhbGx5IG92ZXJsYXBwaW5nIHNwYW5zLlxuZnVuY3Rpb24gdG9UcmVlKHNwYW5zKSB7XG4gIGlmIChzcGFucy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IHRyZWUgPSBbc3BhbnNbMF1dO1xuICBsZXQgbGFzdCA9IHNwYW5zWzBdO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHNwYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gS2VlcCBzcGFucyB3aGljaCBzdGFydCBhZnRlciB0aGUgZW5kIG9mIHRoZSBwcmV2aW91cyBzcGFuIG9yIHRob3NlIHdoaWNoXG4gICAgLy8gYXJlIGNvbXBsZXRlIHdpdGhpbiB0aGUgcHJldmlvdXMgc3Bhbi5cblxuICAgIGlmIChzcGFuc1tpXS5zdGFydCA+IGxhc3QuZW5kKSB7XG4gICAgICAvLyBTcGFuIGlzIGNvbXBsZXRlbHkgb3V0c2lkZSBvZiB0aGUgcHJldmlvdXMgc3Bhbi5cbiAgICAgIHRyZWUucHVzaChzcGFuc1tpXSk7XG4gICAgICBsYXN0ID0gc3BhbnNbaV07XG4gICAgfSBlbHNlIGlmIChzcGFuc1tpXS5lbmQgPCBsYXN0LmVuZCkge1xuICAgICAgLy8gU3BhbiBpcyBmdWxseSBpbnNpZGUgb2YgdGhlIHByZXZpb3VzIHNwYW4uIFB1c2ggdG8gc3Vibm9kZS5cbiAgICAgIGxhc3QuY2hpbGRyZW4ucHVzaChzcGFuc1tpXSk7XG4gICAgfVxuICAgIC8vIFNwYW4gY291bGQgcGFydGlhbGx5IG92ZXJsYXAsIGlnbm9yaW5nIGl0IGFzIGludmFsaWQuXG4gIH1cblxuICAvLyBSZWN1cnNpdmVseSByZWFycmFuZ2UgdGhlIHN1Ym5vZGVzLlxuICBmb3IgKGxldCBpIGluIHRyZWUpIHtcbiAgICB0cmVlW2ldLmNoaWxkcmVuID0gdG9UcmVlKHRyZWVbaV0uY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIHRyZWU7XG59XG5cbi8vIEdldCBhIGxpc3Qgb2YgZW50aXRpZXMgZnJvbSBhIHRleHQuXG5mdW5jdGlvbiBleHRyYWN0RW50aXRpZXMobGluZSkge1xuICBsZXQgbWF0Y2g7XG4gIGxldCBleHRyYWN0ZWQgPSBbXTtcbiAgRU5USVRZX1RZUEVTLm1hcChmdW5jdGlvbihlbnRpdHkpIHtcbiAgICB3aGlsZSAoKG1hdGNoID0gZW50aXR5LnJlLmV4ZWMobGluZSkpICE9PSBudWxsKSB7XG4gICAgICBleHRyYWN0ZWQucHVzaCh7XG4gICAgICAgIG9mZnNldDogbWF0Y2hbJ2luZGV4J10sXG4gICAgICAgIGxlbjogbWF0Y2hbMF0ubGVuZ3RoLFxuICAgICAgICB1bmlxdWU6IG1hdGNoWzBdLFxuICAgICAgICBkYXRhOiBlbnRpdHkucGFjayhtYXRjaFswXSksXG4gICAgICAgIHR5cGU6IGVudGl0eS5uYW1lXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChleHRyYWN0ZWQubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gZXh0cmFjdGVkO1xuICB9XG5cbiAgLy8gUmVtb3ZlIGVudGl0aWVzIGRldGVjdGVkIGluc2lkZSBvdGhlciBlbnRpdGllcywgbGlrZSAjaGFzaHRhZyBpbiBhIFVSTC5cbiAgZXh0cmFjdGVkLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLm9mZnNldCAtIGIub2Zmc2V0O1xuICB9KTtcblxuICBsZXQgaWR4ID0gLTE7XG4gIGV4dHJhY3RlZCA9IGV4dHJhY3RlZC5maWx0ZXIoZnVuY3Rpb24oZWwpIHtcbiAgICBjb25zdCByZXN1bHQgPSAoZWwub2Zmc2V0ID4gaWR4KTtcbiAgICBpZHggPSBlbC5vZmZzZXQgKyBlbC5sZW47XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG5cbiAgcmV0dXJuIGV4dHJhY3RlZDtcbn1cblxuLy8gQ29udmVydCB0aGUgY2h1bmtzIGludG8gZm9ybWF0IHN1aXRhYmxlIGZvciBzZXJpYWxpemF0aW9uLlxuZnVuY3Rpb24gZHJhZnRpZnkoY2h1bmtzLCBzdGFydEF0KSB7XG4gIGxldCBwbGFpbiA9IFwiXCI7XG4gIGxldCByYW5nZXMgPSBbXTtcbiAgZm9yIChsZXQgaSBpbiBjaHVua3MpIHtcbiAgICBjb25zdCBjaHVuayA9IGNodW5rc1tpXTtcbiAgICBpZiAoIWNodW5rLnRleHQpIHtcbiAgICAgIGNvbnN0IGRyYWZ0eSA9IGRyYWZ0aWZ5KGNodW5rLmNoaWxkcmVuLCBwbGFpbi5sZW5ndGggKyBzdGFydEF0KTtcbiAgICAgIGNodW5rLnRleHQgPSBkcmFmdHkudHh0O1xuICAgICAgcmFuZ2VzID0gcmFuZ2VzLmNvbmNhdChkcmFmdHkuZm10KTtcbiAgICB9XG5cbiAgICBpZiAoY2h1bmsudHlwZSkge1xuICAgICAgcmFuZ2VzLnB1c2goe1xuICAgICAgICBhdDogcGxhaW4ubGVuZ3RoICsgc3RhcnRBdCxcbiAgICAgICAgbGVuOiBjaHVuay50ZXh0Lmxlbmd0aCxcbiAgICAgICAgdHA6IGNodW5rLnR5cGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHBsYWluICs9IGNodW5rLnRleHQ7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB0eHQ6IHBsYWluLFxuICAgIGZtdDogcmFuZ2VzXG4gIH07XG59XG5cbi8vIFNwbGljZSB0d28gc3RyaW5nczogaW5zZXJ0IHNlY29uZCBzdHJpbmcgaW50byB0aGUgZmlyc3Qgb25lIGF0IHRoZSBnaXZlbiBpbmRleFxuZnVuY3Rpb24gc3BsaWNlKHNyYywgYXQsIGluc2VydCkge1xuICByZXR1cm4gc3JjLnNsaWNlKDAsIGF0KSArIGluc2VydCArIHNyYy5zbGljZShhdCk7XG59XG5cbi8qKlxuICogUGFyc2UgcGxhaW4gdGV4dCBpbnRvIERyYWZ0eSBkb2N1bWVudC5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudCAtIHBsYWluLXRleHQgY29udGVudCB0byBwYXJzZS5cbiAqIEByZXR1cm4ge0RyYWZ0eX0gcGFyc2VkIGRvY3VtZW50IG9yIG51bGwgaWYgdGhlIHNvdXJjZSBpcyBub3QgcGxhaW4gdGV4dC5cbiAqL1xuRHJhZnR5LnBhcnNlID0gZnVuY3Rpb24oY29udGVudCkge1xuICAvLyBNYWtlIHN1cmUgd2UgYXJlIHBhcnNpbmcgc3RyaW5ncyBvbmx5LlxuICBpZiAodHlwZW9mIGNvbnRlbnQgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFNwbGl0IHRleHQgaW50byBsaW5lcy4gSXQgbWFrZXMgZnVydGhlciBwcm9jZXNzaW5nIGVhc2llci5cbiAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuLyk7XG5cbiAgLy8gSG9sZHMgZW50aXRpZXMgcmVmZXJlbmNlZCBmcm9tIHRleHRcbiAgY29uc3QgZW50aXR5TWFwID0gW107XG4gIGNvbnN0IGVudGl0eUluZGV4ID0ge307XG5cbiAgLy8gUHJvY2Vzc2luZyBsaW5lcyBvbmUgYnkgb25lLCBob2xkIGludGVybWVkaWF0ZSByZXN1bHQgaW4gYmx4LlxuICBjb25zdCBibHggPSBbXTtcbiAgbGluZXMubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICBsZXQgc3BhbnMgPSBbXTtcbiAgICBsZXQgZW50aXRpZXM7XG5cbiAgICAvLyBGaW5kIGZvcm1hdHRlZCBzcGFucyBpbiB0aGUgc3RyaW5nLlxuICAgIC8vIFRyeSB0byBtYXRjaCBlYWNoIHN0eWxlLlxuICAgIElOTElORV9TVFlMRVMubWFwKGZ1bmN0aW9uKHN0eWxlKSB7XG4gICAgICAvLyBFYWNoIHN0eWxlIGNvdWxkIGJlIG1hdGNoZWQgbXVsdGlwbGUgdGltZXMuXG4gICAgICBzcGFucyA9IHNwYW5zLmNvbmNhdChzcGFubmlmeShsaW5lLCBzdHlsZS5zdGFydCwgc3R5bGUuZW5kLCBzdHlsZS5uYW1lKSk7XG4gICAgfSk7XG5cbiAgICBsZXQgYmxvY2s7XG4gICAgaWYgKHNwYW5zLmxlbmd0aCA9PSAwKSB7XG4gICAgICBibG9jayA9IHtcbiAgICAgICAgdHh0OiBsaW5lXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb3J0IHNwYW5zIGJ5IHN0eWxlIG9jY3VyZW5jZSBlYXJseSAtPiBsYXRlXG4gICAgICBzcGFucy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEuc3RhcnQgLSBiLnN0YXJ0O1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENvbnZlcnQgYW4gYXJyYXkgb2YgcG9zc2libHkgb3ZlcmxhcHBpbmcgc3BhbnMgaW50byBhIHRyZWVcbiAgICAgIHNwYW5zID0gdG9UcmVlKHNwYW5zKTtcblxuICAgICAgLy8gQnVpbGQgYSB0cmVlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBlbnRpcmUgc3RyaW5nLCBub3RcbiAgICAgIC8vIGp1c3QgdGhlIGZvcm1hdHRlZCBwYXJ0cy5cbiAgICAgIGNvbnN0IGNodW5rcyA9IGNodW5raWZ5KGxpbmUsIDAsIGxpbmUubGVuZ3RoLCBzcGFucyk7XG5cbiAgICAgIGNvbnN0IGRyYWZ0eSA9IGRyYWZ0aWZ5KGNodW5rcywgMCk7XG5cbiAgICAgIGJsb2NrID0ge1xuICAgICAgICB0eHQ6IGRyYWZ0eS50eHQsXG4gICAgICAgIGZtdDogZHJhZnR5LmZtdFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGVudGl0aWVzIGZyb20gdGhlIGNsZWFuZWQgdXAgc3RyaW5nLlxuICAgIGVudGl0aWVzID0gZXh0cmFjdEVudGl0aWVzKGJsb2NrLnR4dCk7XG4gICAgaWYgKGVudGl0aWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHJhbmdlcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaSBpbiBlbnRpdGllcykge1xuICAgICAgICAvLyB7b2Zmc2V0OiBtYXRjaFsnaW5kZXgnXSwgdW5pcXVlOiBtYXRjaFswXSwgbGVuOiBtYXRjaFswXS5sZW5ndGgsIGRhdGE6IGVudC5wYWNrZXIoKSwgdHlwZTogZW50Lm5hbWV9XG4gICAgICAgIGNvbnN0IGVudGl0eSA9IGVudGl0aWVzW2ldO1xuICAgICAgICBsZXQgaW5kZXggPSBlbnRpdHlJbmRleFtlbnRpdHkudW5pcXVlXTtcbiAgICAgICAgaWYgKCFpbmRleCkge1xuICAgICAgICAgIGluZGV4ID0gZW50aXR5TWFwLmxlbmd0aDtcbiAgICAgICAgICBlbnRpdHlJbmRleFtlbnRpdHkudW5pcXVlXSA9IGluZGV4O1xuICAgICAgICAgIGVudGl0eU1hcC5wdXNoKHtcbiAgICAgICAgICAgIHRwOiBlbnRpdHkudHlwZSxcbiAgICAgICAgICAgIGRhdGE6IGVudGl0eS5kYXRhXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmFuZ2VzLnB1c2goe1xuICAgICAgICAgIGF0OiBlbnRpdHkub2Zmc2V0LFxuICAgICAgICAgIGxlbjogZW50aXR5LmxlbixcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgYmxvY2suZW50ID0gcmFuZ2VzO1xuICAgIH1cblxuICAgIGJseC5wdXNoKGJsb2NrKTtcbiAgfSk7XG5cbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIHR4dDogXCJcIlxuICB9O1xuXG4gIC8vIE1lcmdlIGxpbmVzIGFuZCBzYXZlIGxpbmUgYnJlYWtzIGFzIEJSIGlubGluZSBmb3JtYXR0aW5nLlxuICBpZiAoYmx4Lmxlbmd0aCA+IDApIHtcbiAgICByZXN1bHQudHh0ID0gYmx4WzBdLnR4dDtcbiAgICByZXN1bHQuZm10ID0gKGJseFswXS5mbXQgfHwgW10pLmNvbmNhdChibHhbMF0uZW50IHx8IFtdKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgYmx4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBibG9jayA9IGJseFtpXTtcbiAgICAgIGNvbnN0IG9mZnNldCA9IHJlc3VsdC50eHQubGVuZ3RoICsgMTtcblxuICAgICAgcmVzdWx0LmZtdC5wdXNoKHtcbiAgICAgICAgdHA6ICdCUicsXG4gICAgICAgIGxlbjogMSxcbiAgICAgICAgYXQ6IG9mZnNldCAtIDFcbiAgICAgIH0pO1xuXG4gICAgICByZXN1bHQudHh0ICs9IFwiIFwiICsgYmxvY2sudHh0O1xuICAgICAgaWYgKGJsb2NrLmZtdCkge1xuICAgICAgICByZXN1bHQuZm10ID0gcmVzdWx0LmZtdC5jb25jYXQoYmxvY2suZm10Lm1hcChmdW5jdGlvbihzKSB7XG4gICAgICAgICAgcy5hdCArPSBvZmZzZXQ7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIGlmIChibG9jay5lbnQpIHtcbiAgICAgICAgcmVzdWx0LmZtdCA9IHJlc3VsdC5mbXQuY29uY2F0KGJsb2NrLmVudC5tYXAoZnVuY3Rpb24ocykge1xuICAgICAgICAgIHMuYXQgKz0gb2Zmc2V0O1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJlc3VsdC5mbXQubGVuZ3RoID09IDApIHtcbiAgICAgIGRlbGV0ZSByZXN1bHQuZm10O1xuICAgIH1cblxuICAgIGlmIChlbnRpdHlNYXAubGVuZ3RoID4gMCkge1xuICAgICAgcmVzdWx0LmVudCA9IGVudGl0eU1hcDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIERyYWZ0eSBkb2N1bWVudCB0byBhIHBsYWluIHRleHQgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwbGFpblRleHQgLSBzdHJpbmcgdG8gdXNlIGFzIERyYWZ0eSBjb250ZW50LlxuICpcbiAqIEByZXR1cm5zIG5ldyBEcmFmdHkgZG9jdW1lbnQgb3IgbnVsbCBpcyBwbGFpblRleHQgaXMgbm90IGEgc3RyaW5nLlxuICovXG5EcmFmdHkuaW5pdCA9IGZ1bmN0aW9uKHBsYWluVGV4dCkge1xuICBpZiAodHlwZW9mIHBsYWluVGV4dCAhPSAnc3RyaW5nJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgdHh0OiBwbGFpblRleHRcbiAgfTtcbn1cblxuLyoqXG4gKiBBcHBlbmQgb25lIERyYWZ0eSBkb2N1bWVudCB0byBhbm90aGVyLlxuICpcbiAqIEBwYXJhbSB7RHJhZnR5fSBmaXJzdCAtIERyYWZ0eSBkb2N1bWVudCB0byBhcHBlbmQgdG8uXG4gKiBAcGFyYW0ge0RyYWZ0eX0gc2Vjb25kIC0gRHJhZnR5IGRvY3VtZW50IGJlaW5nIGFwcGVuZGVkLlxuICpcbiAqIEByZXR1cm4ge0RyYWZ0eX0gZmlyc3QgZG9jdW1lbnQgd2l0aCB0aGUgc2Vjb25kIGFwcGVuZGVkIHRvIGl0LlxuICovXG5EcmFmdHkuYXBwZW5kID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuICBpZiAoZmlyc3QgPT0gbnVsbCkge1xuICAgIHJldHVybiBzZWNvbmQ7XG4gIH1cbiAgaWYgKHNlY29uZCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGZpcnN0O1xuICB9XG5cbiAgZmlyc3QudHh0ID0gZmlyc3QudHh0IHx8ICcnO1xuICBzZWNvbmQudHh0ID0gc2Vjb25kLnR4dCB8fCAnJztcbiAgY29uc3QgbGVuID0gZmlyc3QudHh0Lmxlbmd0aDtcblxuICBmaXJzdC50eHQgKz0gc2Vjb25kLnR4dDtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2Vjb25kLmZtdCkpIHtcbiAgICBmaXJzdC5mbXQgPSBmaXJzdC5mbXQgfHwgW107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2Vjb25kLmVudCkpIHtcbiAgICAgIGZpcnN0LmVudCA9IGZpcnN0LmVudCB8fCBbXTtcbiAgICB9XG4gICAgc2Vjb25kLmZtdC5mb3JFYWNoKHNyYyA9PiB7XG4gICAgICBjb25zdCBmbXQgPSB7XG4gICAgICAgIGF0OiBzcmMuYXQgKyBsZW4sXG4gICAgICAgIGxlbjogc3JjLmxlblxuICAgICAgfTtcbiAgICAgIGlmIChzcmMudHApIHtcbiAgICAgICAgZm10LnRwID0gc3JjLnRwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm10LmtleSA9IGZpcnN0LmVudC5sZW5ndGg7XG4gICAgICAgIGZpcnN0LmVudC5wdXNoKHNlY29uZC5lbnRbc3JjLmtleSB8fCAwXSk7XG4gICAgICB9XG4gICAgICBmaXJzdC5mbXQucHVzaChmbXQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGZpcnN0O1xufVxuXG4vKipcbiAqIEB0eXBlZGVmIERyYWZ0eS5JbWFnZURlc2NcbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEB0eXBlIE9iamVjdFxuICogQHBhcmFtIHtzdHJpbmd9IG1pbWUgLSBtaW1lLXR5cGUgb2YgdGhlIGltYWdlLCBlLmcuIFwiaW1hZ2UvcG5nXCJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcmV2aWV3IC0gYmFzZTY0LWVuY29kZWQgaW1hZ2UgY29udGVudCAob3IgcHJldmlldywgaWYgbGFyZ2UgaW1hZ2UgaXMgYXR0YWNoZWQpLiBDb3VsZCBiZSBudWxsL3VuZGVmaW5lZC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gd2lkdGggLSB3aWR0aCBvZiB0aGUgaW1hZ2VcbiAqIEBwYXJhbSB7aW50ZWdlcn0gaGVpZ2h0IC0gaGVpZ2h0IG9mIHRoZSBpbWFnZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gZmlsZSBuYW1lIHN1Z2dlc3Rpb24gZm9yIGRvd25sb2FkaW5nIHRoZSBpbWFnZS5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc2l6ZSAtIHNpemUgb2YgdGhlIGltYWdlIGluIGJ5dGVzLiBUcmVhdCBpcyBhcyBhbiB1bnRydXN0ZWQgaGludC5cbiAqIEBwYXJhbSB7c3RyaW5nfSByZWZ1cmwgLSByZWZlcmVuY2UgdG8gdGhlIGNvbnRlbnQuIENvdWxkIGJlIG51bGwvdW5kZWZpbmVkLlxuICogQHBhcmFtIHtzdHJpbmd9IF90ZW1wUHJldmlldyAtIGJhc2U2NC1lbmNvZGVkIGltYWdlIHByZXZpZXcgdXNlZCBkdXJpbmcgdXBsb2FkIHByb2Nlc3M7IG5vdCBzZXJpYWxpemFibGUuXG4gKiBAcGFyYW0ge1Byb21pc2V9IHVybFByb21pc2UgLSBQcm9taXNlIHdoaWNoIHJldHVybnMgY29udGVudCBVUkwgd2hlbiByZXNvbHZlZC5cbiAqL1xuXG4vKipcbiAqIEluc2VydCBpbmxpbmUgaW1hZ2UgaW50byBEcmFmdHkgZG9jdW1lbnQuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IGNvbnRlbnQgLSBkb2N1bWVudCB0byBhZGQgaW1hZ2UgdG8uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGF0IC0gaW5kZXggd2hlcmUgdGhlIG9iamVjdCBpcyBpbnNlcnRlZC4gVGhlIGxlbmd0aCBvZiB0aGUgaW1hZ2UgaXMgYWx3YXlzIDEuXG4gKiBAcGFyYW0ge0ltYWdlRGVzY30gaW1hZ2VEZXNjIC0gb2JqZWN0IHdpdGggaW1hZ2UgcGFyYW1lbmV0cyBhbmQgZGF0YS5cbiAqXG4gKiBAcmV0dXJuIHtEcmFmdHl9IHVwZGF0ZWQgZG9jdW1lbnQuXG4gKi9cbkRyYWZ0eS5pbnNlcnRJbWFnZSA9IGZ1bmN0aW9uKGNvbnRlbnQsIGF0LCBpbWFnZURlc2MpIHtcbiAgY29udGVudCA9IGNvbnRlbnQgfHwge1xuICAgIHR4dDogXCIgXCJcbiAgfTtcbiAgY29udGVudC5lbnQgPSBjb250ZW50LmVudCB8fCBbXTtcbiAgY29udGVudC5mbXQgPSBjb250ZW50LmZtdCB8fCBbXTtcblxuICBjb250ZW50LmZtdC5wdXNoKHtcbiAgICBhdDogYXQsXG4gICAgbGVuOiAxLFxuICAgIGtleTogY29udGVudC5lbnQubGVuZ3RoXG4gIH0pO1xuXG4gIGNvbnN0IGV4ID0ge1xuICAgIHRwOiAnSU0nLFxuICAgIGRhdGE6IHtcbiAgICAgIG1pbWU6IGltYWdlRGVzYy5taW1lLFxuICAgICAgdmFsOiBpbWFnZURlc2MucHJldmlldyxcbiAgICAgIHdpZHRoOiBpbWFnZURlc2Mud2lkdGgsXG4gICAgICBoZWlnaHQ6IGltYWdlRGVzYy5oZWlnaHQsXG4gICAgICBuYW1lOiBpbWFnZURlc2MuZmlsZW5hbWUsXG4gICAgICBzaXplOiBpbWFnZURlc2Muc2l6ZSB8IDAsXG4gICAgICByZWY6IGltYWdlRGVzYy5yZWZ1cmxcbiAgICB9XG4gIH07XG5cbiAgaWYgKGltYWdlRGVzYy51cmxQcm9taXNlKSB7XG4gICAgZXguZGF0YS5fdGVtcFByZXZpZXcgPSBpbWFnZURlc2MuX3RlbXBQcmV2aWV3O1xuICAgIGV4LmRhdGEuX3Byb2Nlc3NpbmcgPSB0cnVlO1xuICAgIGltYWdlRGVzYy51cmxQcm9taXNlLnRoZW4oXG4gICAgICAodXJsKSA9PiB7XG4gICAgICAgIGV4LmRhdGEucmVmID0gdXJsO1xuICAgICAgICBleC5kYXRhLl90ZW1wUHJldmlldyA9IHVuZGVmaW5lZDtcbiAgICAgICAgZXguZGF0YS5fcHJvY2Vzc2luZyA9IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICAoZXJyKSA9PiB7XG4gICAgICAgIC8qIGNhdGNoIHRoZSBlcnJvciwgb3RoZXJ3aXNlIGl0IHdpbGwgYXBwZWFyIGluIHRoZSBjb25zb2xlLiAqL1xuICAgICAgICBleC5kYXRhLl9wcm9jZXNzaW5nID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBjb250ZW50LmVudC5wdXNoKGV4KTtcblxuICByZXR1cm4gY29udGVudDtcbn1cblxuLyoqXG4gKiBBcHBlbmQgaW5saW5lIGltYWdlIHRvIERyYWZ0eSBkb2N1bWVudC5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ0eX0gY29udGVudCAtIGRvY3VtZW50IHRvIGFkZCBpbWFnZSB0by5cbiAqIEBwYXJhbSB7SW1hZ2VEZXNjfSBpbWFnZURlc2MgLSBvYmplY3Qgd2l0aCBpbWFnZSBwYXJhbWVuZXRzLlxuICpcbiAqIEByZXR1cm4ge0RyYWZ0eX0gdXBkYXRlZCBkb2N1bWVudC5cbiAqL1xuRHJhZnR5LmFwcGVuZEltYWdlID0gZnVuY3Rpb24oY29udGVudCwgaW1hZ2VEZXNjKSB7XG4gIGNvbnRlbnQgPSBjb250ZW50IHx8IHtcbiAgICB0eHQ6IFwiXCJcbiAgfTtcbiAgY29udGVudC50eHQgKz0gXCIgXCI7XG4gIHJldHVybiBEcmFmdHkuaW5zZXJ0SW1hZ2UoY29udGVudCwgY29udGVudC50eHQubGVuZ3RoIC0gMSwgaW1hZ2VEZXNjKTtcbn1cblxuLyoqXG4gKiBAdHlwZWRlZiBEcmFmdHkuQXR0YWNobWVudERlc2NcbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEB0eXBlIE9iamVjdFxuICogQHBhcmFtIHtzdHJpbmd9IG1pbWUgLSBtaW1lLXR5cGUgb2YgdGhlIGltYWdlLCBlLmcuIFwiaW1hZ2UvcG5nXCJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhIC0gYmFzZTY0LWVuY29kZWQgaW4tYmFuZCBjb250ZW50IG9mIHNtYWxsIGF0dGFjaG1lbnRzLiBDb3VsZCBiZSBudWxsL3VuZGVmaW5lZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIGZpbGUgbmFtZSBzdWdnZXN0aW9uIGZvciBkb3dubG9hZGluZyB0aGUgYXR0YWNobWVudC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc2l6ZSAtIHNpemUgb2YgdGhlIGZpbGUgaW4gYnl0ZXMuIFRyZWF0IGlzIGFzIGFuIHVudHJ1c3RlZCBoaW50LlxuICogQHBhcmFtIHtzdHJpbmd9IHJlZnVybCAtIHJlZmVyZW5jZSB0byB0aGUgb3V0LW9mLWJhbmQgY29udGVudC4gQ291bGQgYmUgbnVsbC91bmRlZmluZWQuXG4gKiBAcGFyYW0ge1Byb21pc2V9IHVybFByb21pc2UgLSBQcm9taXNlIHdoaWNoIHJldHVybnMgY29udGVudCBVUkwgd2hlbiByZXNvbHZlZC5cbiAqL1xuXG4vKipcbiAqIEF0dGFjaCBmaWxlIHRvIERyYWZ0eSBjb250ZW50LiBFaXRoZXIgYXMgYSBibG9iIG9yIGFzIGEgcmVmZXJlbmNlLlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7RHJhZnR5fSBjb250ZW50IC0gZG9jdW1lbnQgdG8gYXR0YWNoIGZpbGUgdG8uXG4gKiBAcGFyYW0ge0F0dGFjaG1lbnREZXNjfSBvYmplY3QgLSBjb250YWluaW5nIGF0dGFjaG1lbnQgZGVzY3JpcHRpb24gYW5kIGRhdGEuXG4gKlxuICogQHJldHVybiB7RHJhZnR5fSB1cGRhdGVkIGRvY3VtZW50LlxuICovXG5EcmFmdHkuYXR0YWNoRmlsZSA9IGZ1bmN0aW9uKGNvbnRlbnQsIGF0dGFjaG1lbnREZXNjKSB7XG4gIGNvbnRlbnQgPSBjb250ZW50IHx8IHtcbiAgICB0eHQ6IFwiXCJcbiAgfTtcbiAgY29udGVudC5lbnQgPSBjb250ZW50LmVudCB8fCBbXTtcbiAgY29udGVudC5mbXQgPSBjb250ZW50LmZtdCB8fCBbXTtcblxuICBjb250ZW50LmZtdC5wdXNoKHtcbiAgICBhdDogLTEsXG4gICAgbGVuOiAwLFxuICAgIGtleTogY29udGVudC5lbnQubGVuZ3RoXG4gIH0pO1xuXG4gIGNvbnN0IGV4ID0ge1xuICAgIHRwOiAnRVgnLFxuICAgIGRhdGE6IHtcbiAgICAgIG1pbWU6IGF0dGFjaG1lbnREZXNjLm1pbWUsXG4gICAgICB2YWw6IGF0dGFjaG1lbnREZXNjLmRhdGEsXG4gICAgICBuYW1lOiBhdHRhY2htZW50RGVzYy5maWxlbmFtZSxcbiAgICAgIHJlZjogYXR0YWNobWVudERlc2MucmVmdXJsLFxuICAgICAgc2l6ZTogYXR0YWNobWVudERlc2Muc2l6ZSB8IDBcbiAgICB9XG4gIH1cbiAgaWYgKGF0dGFjaG1lbnREZXNjLnVybFByb21pc2UpIHtcbiAgICBleC5kYXRhLl9wcm9jZXNzaW5nID0gdHJ1ZTtcbiAgICBhdHRhY2htZW50RGVzYy51cmxQcm9taXNlLnRoZW4oXG4gICAgICAodXJsKSA9PiB7XG4gICAgICAgIGV4LmRhdGEucmVmID0gdXJsO1xuICAgICAgICBleC5kYXRhLl9wcm9jZXNzaW5nID0gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIChlcnIpID0+IHtcbiAgICAgICAgLyogY2F0Y2ggdGhlIGVycm9yLCBvdGhlcndpc2UgaXQgd2lsbCBhcHBlYXIgaW4gdGhlIGNvbnNvbGUuICovXG4gICAgICAgIGV4LmRhdGEuX3Byb2Nlc3NpbmcgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuICBjb250ZW50LmVudC5wdXNoKGV4KTtcblxuICByZXR1cm4gY29udGVudDtcbn1cblxuLyoqXG4gKiBXcmFwcyBjb250ZW50IGludG8gYW4gaW50ZXJhY3RpdmUgZm9ybS5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ0eXxzdHJpbmd9IGNvbnRlbnQgLSB0byB3cmFwIGludG8gYSBmb3JtLlxuICogQHBhcmFtIHtudW1iZXJ9IGF0IC0gaW5kZXggd2hlcmUgdGhlIGZvcm1zIHN0YXJ0cy5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW4gLSBsZW5ndGggb2YgdGhlIGZvcm0gY29udGVudC5cbiAqXG4gKiBAcmV0dXJuIHtEcmFmdHl9IHVwZGF0ZWQgZG9jdW1lbnQuXG4gKi9cbkRyYWZ0eS53cmFwQXNGb3JtID0gZnVuY3Rpb24oY29udGVudCwgYXQsIGxlbikge1xuICBpZiAodHlwZW9mIGNvbnRlbnQgPT0gJ3N0cmluZycpIHtcbiAgICBjb250ZW50ID0ge1xuICAgICAgdHh0OiBjb250ZW50XG4gICAgfTtcbiAgfVxuICBjb250ZW50LmZtdCA9IGNvbnRlbnQuZm10IHx8IFtdO1xuXG4gIGNvbnRlbnQuZm10LnB1c2goe1xuICAgIGF0OiBhdCxcbiAgICBsZW46IGxlbixcbiAgICB0cDogJ0ZNJ1xuICB9KTtcblxuICByZXR1cm4gY29udGVudDtcbn1cblxuLyoqXG4gKiBJbnNlcnQgY2xpY2thYmxlIGJ1dHRvbiBpbnRvIERyYWZ0eSBkb2N1bWVudC5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ0eXxzdHJpbmd9IGNvbnRlbnQgLSBEcmFmdHkgZG9jdW1lbnQgdG8gaW5zZXJ0IGJ1dHRvbiB0byBvciBhIHN0cmluZyB0byBiZSB1c2VkIGFzIGJ1dHRvbiB0ZXh0LlxuICogQHBhcmFtIHtudW1iZXJ9IGF0IC0gbG9jYXRpb24gd2hlcmUgdGhlIGJ1dHRvbiBpcyBpbnNlcnRlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW4gLSB0aGUgbGVuZ3RoIG9mIHRoZSB0ZXh0IHRvIGJlIHVzZWQgYXMgYnV0dG9uIHRpdGxlLlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSB0aGUgYnV0dG9uLiBDbGllbnQgc2hvdWxkIHJldHVybiBpdCB0byB0aGUgc2VydmVyIHdoZW4gdGhlIGJ1dHRvbiBpcyBjbGlja2VkLlxuICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvblR5cGUgLSB0aGUgdHlwZSBvZiB0aGUgYnV0dG9uLCBvbmUgb2YgJ3VybCcgb3IgJ3B1YicuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uVmFsdWUgLSB0aGUgdmFsdWUgdG8gcmV0dXJuIG9uIGNsaWNrOlxuICogQHBhcmFtIHtzdHJpbmd9IHJlZlVybCAtIHRoZSBVUkwgdG8gZ28gdG8gd2hlbiB0aGUgJ3VybCcgYnV0dG9uIGlzIGNsaWNrZWQuXG4gKlxuICogQHJldHVybiB7RHJhZnR5fSB1cGRhdGVkIGRvY3VtZW50LlxuICovXG5EcmFmdHkuaW5zZXJ0QnV0dG9uID0gZnVuY3Rpb24oY29udGVudCwgYXQsIGxlbiwgbmFtZSwgYWN0aW9uVHlwZSwgYWN0aW9uVmFsdWUsIHJlZlVybCkge1xuICBpZiAodHlwZW9mIGNvbnRlbnQgPT0gJ3N0cmluZycpIHtcbiAgICBjb250ZW50ID0ge1xuICAgICAgdHh0OiBjb250ZW50XG4gICAgfTtcbiAgfVxuXG4gIGlmICghY29udGVudCB8fCAhY29udGVudC50eHQgfHwgY29udGVudC50eHQubGVuZ3RoIDwgYXQgKyBsZW4pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChsZW4gPD0gMCB8fCBbJ3VybCcsICdwdWInXS5pbmRleE9mKGFjdGlvblR5cGUpID09IC0xKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gRW5zdXJlIHJlZlVybCBpcyBhIHN0cmluZy5cbiAgaWYgKGFjdGlvblR5cGUgPT0gJ3VybCcgJiYgIXJlZlVybCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJlZlVybCA9ICcnICsgcmVmVXJsO1xuXG4gIGNvbnRlbnQuZW50ID0gY29udGVudC5lbnQgfHwgW107XG4gIGNvbnRlbnQuZm10ID0gY29udGVudC5mbXQgfHwgW107XG5cbiAgY29udGVudC5mbXQucHVzaCh7XG4gICAgYXQ6IGF0LFxuICAgIGxlbjogbGVuLFxuICAgIGtleTogY29udGVudC5lbnQubGVuZ3RoXG4gIH0pO1xuICBjb250ZW50LmVudC5wdXNoKHtcbiAgICB0cDogJ0JOJyxcbiAgICBkYXRhOiB7XG4gICAgICBhY3Q6IGFjdGlvblR5cGUsXG4gICAgICB2YWw6IGFjdGlvblZhbHVlLFxuICAgICAgcmVmOiByZWZVcmwsXG4gICAgICBuYW1lOiBuYW1lXG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29udGVudDtcbn1cblxuLyoqXG4gKiBBcHBlbmQgY2xpY2thYmxlIGJ1dHRvbiB0byBEcmFmdHkgZG9jdW1lbnQuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl8c3RyaW5nfSBjb250ZW50IC0gRHJhZnR5IGRvY3VtZW50IHRvIGluc2VydCBidXR0b24gdG8gb3IgYSBzdHJpbmcgdG8gYmUgdXNlZCBhcyBidXR0b24gdGV4dC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0aXRsZSAtIHRoZSB0ZXh0IHRvIGJlIHVzZWQgYXMgYnV0dG9uIHRpdGxlLlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSB0aGUgYnV0dG9uLiBDbGllbnQgc2hvdWxkIHJldHVybiBpdCB0byB0aGUgc2VydmVyIHdoZW4gdGhlIGJ1dHRvbiBpcyBjbGlja2VkLlxuICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvblR5cGUgLSB0aGUgdHlwZSBvZiB0aGUgYnV0dG9uLCBvbmUgb2YgJ3VybCcgb3IgJ3B1YicuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uVmFsdWUgLSB0aGUgdmFsdWUgdG8gcmV0dXJuIG9uIGNsaWNrOlxuICogQHBhcmFtIHtzdHJpbmd9IHJlZlVybCAtIHRoZSBVUkwgdG8gZ28gdG8gd2hlbiB0aGUgJ3VybCcgYnV0dG9uIGlzIGNsaWNrZWQuXG4gKlxuICogQHJldHVybiB7RHJhZnR5fSB1cGRhdGVkIGRvY3VtZW50LlxuICovXG5EcmFmdHkuYXBwZW5kQnV0dG9uID0gZnVuY3Rpb24oY29udGVudCwgdGl0bGUsIG5hbWUsIGFjdGlvblR5cGUsIGFjdGlvblZhbHVlLCByZWZVcmwpIHtcbiAgY29udGVudCA9IGNvbnRlbnQgfHwge1xuICAgIHR4dDogXCJcIlxuICB9O1xuICBjb25zdCBhdCA9IGNvbnRlbnQudHh0Lmxlbmd0aDtcbiAgY29udGVudC50eHQgKz0gdGl0bGU7XG4gIHJldHVybiBEcmFmdHkuaW5zZXJ0QnV0dG9uKGNvbnRlbnQsIGF0LCB0aXRsZS5sZW5ndGgsIG5hbWUsIGFjdGlvblR5cGUsIGFjdGlvblZhbHVlLCByZWZVcmwpO1xufVxuXG4vKipcbiAqIEF0dGFjaCBhIGdlbmVyaWMgSlMgb2JqZWN0LiBUaGUgb2JqZWN0IGlzIGF0dGFjaGVkIGFzIGEganNvbiBzdHJpbmcuXG4gKiBJbnRlbmRlZCBmb3IgcmVwcmVzZW50aW5nIGEgZm9ybSByZXNwb25zZS5cbiAqXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IGNvbnRlbnQgLSBEcmFmdHkgZG9jdW1lbnQgdG8gYXR0YWNoIGZpbGUgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIGRhdGEgdG8gY29udmVydCB0byBqc29uIHN0cmluZyBhbmQgYXR0YWNoLlxuICogQHJldHVybnMge0RyYWZ0eX0gdGhlIHNhbWUgZG9jdW1lbnQgYXMgPGNvZGU+Y29udGVudDwvY29kZT4uXG4gKi9cbkRyYWZ0eS5hdHRhY2hKU09OID0gZnVuY3Rpb24oY29udGVudCwgZGF0YSkge1xuICBjb250ZW50ID0gY29udGVudCB8fCB7XG4gICAgdHh0OiBcIlwiXG4gIH07XG4gIGNvbnRlbnQuZW50ID0gY29udGVudC5lbnQgfHwgW107XG4gIGNvbnRlbnQuZm10ID0gY29udGVudC5mbXQgfHwgW107XG5cbiAgY29udGVudC5mbXQucHVzaCh7XG4gICAgYXQ6IC0xLFxuICAgIGxlbjogMCxcbiAgICBrZXk6IGNvbnRlbnQuZW50Lmxlbmd0aFxuICB9KTtcblxuICBjb250ZW50LmVudC5wdXNoKHtcbiAgICB0cDogJ0VYJyxcbiAgICBkYXRhOiB7XG4gICAgICBtaW1lOiBKU09OX01JTUVfVFlQRSxcbiAgICAgIHZhbDogZGF0YVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNvbnRlbnQ7XG59XG4vKipcbiAqIEFwcGVuZCBsaW5lIGJyZWFrIHRvIGEgRHJhZnR5IGRvY3VtZW50LlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7RHJhZnR5fSBjb250ZW50IC0gRHJhZnR5IGRvY3VtZW50IHRvIGFwcGVuZCBsaW5lYnJlYWsgdG8uXG4gKiBAcmV0dXJucyB7RHJhZnR5fSB0aGUgc2FtZSBkb2N1bWVudCBhcyA8Y29kZT5jb250ZW50PC9jb2RlPi5cbiAqL1xuRHJhZnR5LmFwcGVuZExpbmVCcmVhayA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgY29udGVudCA9IGNvbnRlbnQgfHwge1xuICAgIHR4dDogXCJcIlxuICB9O1xuICBjb250ZW50LmZtdCA9IGNvbnRlbnQuZm10IHx8IFtdO1xuICBjb250ZW50LmZtdC5wdXNoKHtcbiAgICBhdDogY29udGVudC50eHQubGVuZ3RoLFxuICAgIGxlbjogMSxcbiAgICB0cDogJ0JSJ1xuICB9KTtcbiAgY29udGVudC50eHQgKz0gXCIgXCI7XG5cbiAgcmV0dXJuIGNvbnRlbnQ7XG59XG4vKipcbiAqIEdpdmVuIERyYWZ0eSBkb2N1bWVudCwgY29udmVydCBpdCB0byBIVE1MLlxuICogTm8gYXR0ZW1wdCBpcyBtYWRlIHRvIHN0cmlwIHByZS1leGlzdGluZyBodG1sIG1hcmt1cC5cbiAqIFRoaXMgaXMgcG90ZW50aWFsbHkgdW5zYWZlIGJlY2F1c2UgPGNvZGU+Y29udGVudC50eHQ8L2NvZGU+IG1heSBjb250YWluIG1hbGljaW91c1xuICogbWFya3VwLlxuICogQG1lbWJlcm9mIFRpbm9kZS5EcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ5fSBjb250ZW50IC0gZG9jdW1lbnQgdG8gY29udmVydC5cbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MLXJlcHJlc2VudGF0aW9uIG9mIGNvbnRlbnQuXG4gKi9cbkRyYWZ0eS5VTlNBRkVfdG9IVE1MID0gZnVuY3Rpb24oY29udGVudCkge1xuICBsZXQge1xuICAgIHR4dCxcbiAgICBmbXQsXG4gICAgZW50XG4gIH0gPSBjb250ZW50O1xuXG4gIGNvbnN0IG1hcmt1cCA9IFtdO1xuICBpZiAoZm10KSB7XG4gICAgZm9yIChsZXQgaSBpbiBmbXQpIHtcbiAgICAgIGNvbnN0IHJhbmdlID0gZm10W2ldO1xuICAgICAgY29uc3QgYXQgPSByYW5nZS5hdCB8IDA7XG4gICAgICBsZXQgdHAgPSByYW5nZS50cDtcbiAgICAgIGxldCBkYXRhO1xuICAgICAgaWYgKCF0cCkge1xuICAgICAgICBjb25zdCBlbnRpdHkgPSBlbnRbcmFuZ2Uua2V5IHwgMF07XG4gICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgICB0cCA9IGVudGl0eS50cDtcbiAgICAgICAgICBkYXRhID0gZW50aXR5LmRhdGE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKERFQ09SQVRPUlNbdHBdKSB7XG4gICAgICAgIC8vIEJlY2F1c2Ugd2UgbGF0ZXIgc29ydCBpbiBkZXNjZW5kaW5nIG9yZGVyLCBjbG9zaW5nIG1hcmt1cCBtdXN0IGNvbWUgZmlyc3QuXG4gICAgICAgIC8vIE90aGVyd2lzZSB6ZXJvLWxlbmd0aCBvYmplY3RzIHdpbGwgbm90IGJlIHJlcHJlc2VudGVkIGNvcnJlY3RseS5cbiAgICAgICAgbWFya3VwLnB1c2goe1xuICAgICAgICAgIGlkeDogYXQgKyByYW5nZS5sZW4sXG4gICAgICAgICAgbGVuOiAtcmFuZ2UubGVuLFxuICAgICAgICAgIHdoYXQ6IERFQ09SQVRPUlNbdHBdLmNsb3NlKGRhdGEpXG4gICAgICAgIH0pO1xuICAgICAgICBtYXJrdXAucHVzaCh7XG4gICAgICAgICAgaWR4OiBhdCxcbiAgICAgICAgICBsZW46IHJhbmdlLmxlbixcbiAgICAgICAgICB3aGF0OiBERUNPUkFUT1JTW3RwXS5vcGVuKGRhdGEpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1hcmt1cC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYi5pZHggPT0gYS5pZHggPyBiLmxlbiAtIGEubGVuIDogYi5pZHggLSBhLmlkeDsgLy8gaW4gZGVzY2VuZGluZyBvcmRlclxuICB9KTtcblxuICBmb3IgKGxldCBpIGluIG1hcmt1cCkge1xuICAgIGlmIChtYXJrdXBbaV0ud2hhdCkge1xuICAgICAgdHh0ID0gc3BsaWNlKHR4dCwgbWFya3VwW2ldLmlkeCwgbWFya3VwW2ldLndoYXQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0eHQ7XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGFwcGx5aW5nIGN1c3RvbSBmb3JtYXR0aW5nL3RyYW5zZm9ybWF0aW9uIHRvIGEgRHJhZnR5IGRvY3VtZW50LlxuICogQ2FsbGVkIG9uY2UgZm9yIGVhY2ggc3lsZSBzcGFuLlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBjYWxsYmFjayBGb3JtYXR0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHlsZSAtIHN0eWxlIGNvZGUgc3VjaCBhcyBcIlNUXCIgb3IgXCJJTVwiLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBlbnRpdHkncyBkYXRhXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVzIC0gcG9zc2libHkgc3R5bGVkIHN1YnNwYW5zIGNvbnRhaW5lZCBpbiB0aGlzIHN0eWxlIHNwYW4uXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBvZiB0aGUgY3VycmVudCBlbGVtZW50IGFtb25nIGl0cyBzaWJsaW5ncy5cbiAqL1xuXG4vKipcbiAqIFRyYW5zZm9ybSBEcmFmdHkgZG9jdW1lbnQgdXNpbmcgY3VzdG9tIGZvcm1hdHRpbmcuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IGNvbnRlbnQgLSBjb250ZW50IHRvIHRyYW5zZm9ybS5cbiAqIEBwYXJhbSB7Rm9ybWF0dGVyfSBmb3JtYXR0ZXIgLSBjYWxsYmFjayB3aGljaCB0cmFuc2Zvcm1zIGluZGl2aWR1YWwgZWxlbWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IC0gY29udGV4dCBwcm92aWRlZCB0byBmb3JtYXR0ZXIgYXMgPGNvZGU+dGhpczwvY29kZT4uXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSB0cmFuc2Zvcm1lZCBvYmplY3RcbiAqL1xuRHJhZnR5LmZvcm1hdCA9IGZ1bmN0aW9uKGNvbnRlbnQsIGZvcm1hdHRlciwgY29udGV4dCkge1xuICBsZXQge1xuICAgIHR4dCxcbiAgICBmbXQsXG4gICAgZW50XG4gIH0gPSBjb250ZW50O1xuXG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgdHh0ID0gdHh0IHx8IFwiXCI7XG4gIGlmICghQXJyYXkuaXNBcnJheShlbnQpKSB7XG4gICAgZW50ID0gW107XG4gIH1cblxuICBpZiAoIUFycmF5LmlzQXJyYXkoZm10KSkge1xuICAgIC8vIEhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiBhbGwgdmFsdWVzIGluIGZtdCBhcmUgMCBhbmQgZm10IGlzIHNraXBwZWQuXG4gICAgaWYgKGVudC5sZW5ndGggPT0gMSkge1xuICAgICAgZm10ID0gW3tcbiAgICAgICAgYXQ6IDAsXG4gICAgICAgIGxlbjogMCxcbiAgICAgICAga2V5OiAwXG4gICAgICB9XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFt0eHRdO1xuICAgIH1cbiAgfVxuXG4gIGxldCBzcGFucyA9IFtdLmNvbmNhdChmbXQpO1xuXG4gIC8vIFplcm8gdmFsdWVzIG1heSBoYXZlIGJlZW4gc3RyaXBwZWQuIFJlc3RvcmUgdGhlbS5cbiAgLy8gQWxzbyBlbnN1cmUgaW5kZXhlcyBhbmQgbGVuZ3RocyBhcmUgc2FuZS5cbiAgc3BhbnMubWFwKGZ1bmN0aW9uKHMpIHtcbiAgICBzLmF0ID0gcy5hdCB8fCAwO1xuICAgIHMubGVuID0gcy5sZW4gfHwgMDtcbiAgICBpZiAocy5sZW4gPCAwKSB7XG4gICAgICBzLmxlbiA9IDA7XG4gICAgfVxuICAgIGlmIChzLmF0IDwgLTEpIHtcbiAgICAgIHMuYXQgPSAtMTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFNvcnQgc3BhbnMgZmlyc3QgYnkgc3RhcnQgaW5kZXggKGFzYykgdGhlbiBieSBsZW5ndGggKGRlc2MpLlxuICBzcGFucy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoYS5hdCAtIGIuYXQgPT0gMCkge1xuICAgICAgcmV0dXJuIGIubGVuIC0gYS5sZW47IC8vIGxvbmdlciBvbmUgY29tZXMgZmlyc3QgKDwwKVxuICAgIH1cbiAgICByZXR1cm4gYS5hdCAtIGIuYXQ7XG4gIH0pO1xuXG4gIC8vIERlbm9ybWFsaXplIGVudGl0aWVzIGludG8gc3BhbnMuIENyZWF0ZSBhIGNvcHkgb2YgdGhlIG9iamVjdHMgdG8gbGVhdmVcbiAgLy8gb3JpZ2luYWwgRHJhZnR5IG9iamVjdCB1bmNoYW5nZWQuXG4gIHNwYW5zID0gc3BhbnMubWFwKChzKSA9PiB7XG4gICAgbGV0IGRhdGE7XG4gICAgbGV0IHRwID0gcy50cDtcbiAgICBpZiAoIXRwKSB7XG4gICAgICBzLmtleSA9IHMua2V5IHx8IDA7XG4gICAgICBpZiAoZW50W3Mua2V5XSkge1xuICAgICAgICBkYXRhID0gZW50W3Mua2V5XS5kYXRhO1xuICAgICAgICB0cCA9IGVudFtzLmtleV0udHA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHlwZSBzdGlsbCBub3QgZGVmaW5lZD8gSGlkZSBpbnZhbGlkIGVsZW1lbnQuXG4gICAgdHAgPSB0cCB8fCAnSEQnO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRwOiB0cCxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICBhdDogcy5hdCxcbiAgICAgIGxlbjogcy5sZW5cbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gZm9yRWFjaCh0eHQsIDAsIHR4dC5sZW5ndGgsIHNwYW5zLCBmb3JtYXR0ZXIsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIEdpdmVuIERyYWZ0eSBkb2N1bWVudCwgY29udmVydCBpdCB0byBwbGFpbiB0ZXh0LlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7RHJhZnR5fSBjb250ZW50IC0gZG9jdW1lbnQgdG8gY29udmVydCB0byBwbGFpbiB0ZXh0LlxuICogQHJldHVybnMge3N0cmluZ30gcGxhaW4tdGV4dCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZHJhZnR5IGRvY3VtZW50LlxuICovXG5EcmFmdHkudG9QbGFpblRleHQgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHJldHVybiB0eXBlb2YgY29udGVudCA9PSAnc3RyaW5nJyA/IGNvbnRlbnQgOiBjb250ZW50LnR4dDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZG9jdW1lbnQgaGFzIG5vIG1hcmt1cCBhbmQgbm8gZW50aXRpZXMuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IGNvbnRlbnQgLSBjb250ZW50IHRvIGNoZWNrIGZvciBwcmVzZW5jZSBvZiBtYXJrdXAuXG4gKiBAcmV0dXJucyA8Y29kZT50cnVlPC9jb2RlPiBpcyBjb250ZW50IGlzIHBsYWluIHRleHQsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cbkRyYWZ0eS5pc1BsYWluVGV4dCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgcmV0dXJuIHR5cGVvZiBjb250ZW50ID09ICdzdHJpbmcnIHx8ICEoY29udGVudC5mbXQgfHwgY29udGVudC5lbnQpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgb2JqZWN0IHJlcHJlc2V0cyBpcyBhIHZhbGlkIERyYWZ0eSBkb2N1bWVudC5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ0eX0gY29udGVudCAtIGNvbnRlbnQgdG8gY2hlY2sgZm9yIHZhbGlkaXR5LlxuICogQHJldHVybnMgPGNvZGU+dHJ1ZTwvY29kZT4gaXMgY29udGVudCBpcyB2YWxpZCwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAqL1xuRHJhZnR5LmlzVmFsaWQgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmICghY29udGVudCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHtcbiAgICB0eHQsXG4gICAgZm10LFxuICAgIGVudFxuICB9ID0gY29udGVudDtcblxuICBpZiAoIXR4dCAmJiB0eHQgIT09ICcnICYmICFmbXQgJiYgIWVudCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHR4dF90eXBlID0gdHlwZW9mIHR4dDtcbiAgaWYgKHR4dF90eXBlICE9ICdzdHJpbmcnICYmIHR4dF90eXBlICE9ICd1bmRlZmluZWQnICYmIHR4dCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZm10ICE9ICd1bmRlZmluZWQnICYmICFBcnJheS5pc0FycmF5KGZtdCkgJiYgZm10ICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBlbnQgIT0gJ3VuZGVmaW5lZCcgJiYgIUFycmF5LmlzQXJyYXkoZW50KSAmJiBlbnQgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGRyYWZ0eSBkb2N1bWVudCBoYXMgYXR0YWNobWVudHMuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IGNvbnRlbnQgLSBkb2N1bWVudCB0byBjaGVjayBmb3IgYXR0YWNobWVudHMuXG4gKiBAcmV0dXJucyA8Y29kZT50cnVlPC9jb2RlPiBpZiB0aGVyZSBhcmUgYXR0YWNobWVudHMuXG4gKi9cbkRyYWZ0eS5oYXNBdHRhY2htZW50cyA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQuZW50ICYmIGNvbnRlbnQuZW50Lmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGxldCBpIGluIGNvbnRlbnQuZW50KSB7XG4gICAgICBpZiAoY29udGVudC5lbnRbaV0gJiYgY29udGVudC5lbnRbaV0udHAgPT0gJ0VYJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBhcHBseWluZyBjdXN0b20gZm9ybWF0dGluZy90cmFuc2Zvcm1hdGlvbiB0byBhIERyYWZ0eSBkb2N1bWVudC5cbiAqIENhbGxlZCBvbmNlIGZvciBlYWNoIHN5bGUgc3Bhbi5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAY2FsbGJhY2sgQXR0YWNobWVudENhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBhdHRhY2htZW50IGRhdGFcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBhdHRhY2htZW50J3MgaW5kZXggaW4gYGNvbnRlbnQuZW50YC5cbiAqL1xuXG4vKipcbiAqIEVudW1lcmF0ZSBhdHRhY2htZW50cy5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge0RyYWZ0eX0gY29udGVudCAtIGRvY3VtZW50IHRvIHByb2Nlc3MgZm9yIGF0dGFjaG1lbnRzLlxuICogQHBhcmFtIHtBdHRhY2htZW50Q2FsbGJhY2t9IGNhbGxiYWNrIC0gY2FsbGJhY2sgdG8gY2FsbCBmb3IgZWFjaCBhdHRhY2htZW50LlxuICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgLSB2YWx1ZSBvZiBcInRoaXNcIiBmb3IgY2FsbGJhY2suXG4gKi9cbkRyYWZ0eS5hdHRhY2htZW50cyA9IGZ1bmN0aW9uKGNvbnRlbnQsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gIGlmIChjb250ZW50LmVudCAmJiBjb250ZW50LmVudC5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChsZXQgaSBpbiBjb250ZW50LmVudCkge1xuICAgICAgaWYgKGNvbnRlbnQuZW50W2ldICYmIGNvbnRlbnQuZW50W2ldLnRwID09ICdFWCcpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBjb250ZW50LmVudFtpXS5kYXRhLCBpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBHaXZlbiB0aGUgZW50aXR5LCBnZXQgVVJMIHdoaWNoIGNhbiBiZSB1c2VkIGZvciBkb3dubG9hZGluZ1xuICogZW50aXR5IGRhdGEuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVudERhdGEgLSBlbnRpdHkuZGF0YSB0byBnZXQgdGhlIFVSbCBmcm9tLlxuICogQHJldHVybnMge3N0cmluZ30gVVJMIHRvIGRvd25sb2FkIGVudGl0eSBkYXRhIG9yIDxjb2RlPm51bGw8L2NvZGU+LlxuICovXG5EcmFmdHkuZ2V0RG93bmxvYWRVcmwgPSBmdW5jdGlvbihlbnREYXRhKSB7XG4gIGxldCB1cmwgPSBudWxsO1xuICBpZiAoZW50RGF0YS5taW1lICE9IEpTT05fTUlNRV9UWVBFICYmIGVudERhdGEudmFsKSB7XG4gICAgdXJsID0gYmFzZTY0dG9PYmplY3RVcmwoZW50RGF0YS52YWwsIGVudERhdGEubWltZSwgRHJhZnR5LmxvZ2dlcik7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVudERhdGEucmVmID09ICdzdHJpbmcnKSB7XG4gICAgdXJsID0gZW50RGF0YS5yZWY7XG4gIH1cbiAgcmV0dXJuIHVybDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZW50aXR5IGRhdGEgaXMgbm90IHJlYWR5IGZvciBzZW5kaW5nLCBzdWNoIGFzIGJlaW5nIHVwbG9hZGVkIHRvIHRoZSBzZXJ2ZXIuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVudGl0eS5kYXRhIHRvIGdldCB0aGUgVVJsIGZyb20uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB1cGxvYWQgaXMgaW4gcHJvZ3Jlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuRHJhZnR5LmlzUHJvY2Vzc2luZyA9IGZ1bmN0aW9uKGVudERhdGEpIHtcbiAgcmV0dXJuICEhZW50RGF0YS5fcHJvY2Vzc2luZztcbn1cblxuLyoqXG4gKiBHaXZlbiB0aGUgZW50aXR5LCBnZXQgVVJMIHdoaWNoIGNhbiBiZSB1c2VkIGZvciBwcmV2aWV3aW5nXG4gKiB0aGUgZW50aXR5LlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnRpdHkuZGF0YSB0byBnZXQgdGhlIFVSbCBmcm9tLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHVybCBmb3IgcHJldmlld2luZyBvciBudWxsIGlmIG5vIHN1Y2ggdXJsIGlzIGF2YWlsYWJsZS5cbiAqL1xuRHJhZnR5LmdldFByZXZpZXdVcmwgPSBmdW5jdGlvbihlbnREYXRhKSB7XG4gIHJldHVybiBlbnREYXRhLnZhbCA/IGJhc2U2NHRvT2JqZWN0VXJsKGVudERhdGEudmFsLCBlbnREYXRhLm1pbWUsIERyYWZ0eS5sb2dnZXIpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYXBwcm94aW1hdGUgc2l6ZSBvZiB0aGUgZW50aXR5LlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnREYXRhIC0gZW50aXR5LmRhdGEgdG8gZ2V0IHRoZSBzaXplIGZvci5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IHNpemUgb2YgZW50aXR5IGRhdGEgaW4gYnl0ZXMuXG4gKi9cbkRyYWZ0eS5nZXRFbnRpdHlTaXplID0gZnVuY3Rpb24oZW50RGF0YSkge1xuICAvLyBFaXRoZXIgc2l6ZSBoaW50IG9yIGxlbmd0aCBvZiB2YWx1ZS4gVGhlIHZhbHVlIGlzIGJhc2U2NCBlbmNvZGVkLFxuICAvLyB0aGUgYWN0dWFsIG9iamVjdCBzaXplIGlzIHNtYWxsZXIgdGhhbiB0aGUgZW5jb2RlZCBsZW5ndGguXG4gIHJldHVybiBlbnREYXRhLnNpemUgPyBlbnREYXRhLnNpemUgOiBlbnREYXRhLnZhbCA/IChlbnREYXRhLnZhbC5sZW5ndGggKiAwLjc1KSB8IDAgOiAwO1xufVxuXG4vKipcbiAqIEdldCBlbnRpdHkgbWltZSB0eXBlLlxuICogQG1lbWJlcm9mIERyYWZ0eVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnREYXRhIC0gZW50aXR5LmRhdGEgdG8gZ2V0IHRoZSB0eXBlIGZvci5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IG1pbWUgdHlwZSBvZiBlbnRpdHkuXG4gKi9cbkRyYWZ0eS5nZXRFbnRpdHlNaW1lVHlwZSA9IGZ1bmN0aW9uKGVudERhdGEpIHtcbiAgcmV0dXJuIGVudERhdGEubWltZSB8fCAndGV4dC9wbGFpbic7XG59XG5cbi8qKlxuICogR2V0IEhUTUwgdGFnIGZvciBhIGdpdmVuIHR3by1sZXR0ZXIgc3R5bGUgbmFtZS5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3R5bGUgLSB0d28tbGV0dGVyIHN0eWxlLCBsaWtlIFNUIG9yIExOLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgdGFnIG5hbWUgaWYgc3R5bGUgaXMgZm91bmQsICdfVU5LTicgaWYgbm90IGZvdW5kLCB7Y29kZTogdW5kZWZpbmVkfSBpZiBzdHlsZSBpcyBmYWxzaXNoLlxuICovXG5EcmFmdHkudGFnTmFtZSA9IGZ1bmN0aW9uKHN0eWxlKSB7XG4gIHJldHVybiBzdHlsZSA/IChIVE1MX1RBR1Nbc3R5bGVdID8gSFRNTF9UQUdTW3N0eWxlXS5uYW1lIDogJ19VTktOJykgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogRm9yIGEgZ2l2ZW4gZGF0YSBidW5kbGUgZ2VuZXJhdGUgYW4gb2JqZWN0IHdpdGggSFRNTCBhdHRyaWJ1dGVzLFxuICogZm9yIGluc3RhbmNlLCBnaXZlbiB7dXJsOiBcImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vXCJ9IHJldHVyblxuICoge2hyZWY6IFwiaHR0cDovL3d3dy5leGFtcGxlLmNvbS9cIn1cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3R5bGUgLSB0d28tbGV0dGVyIHN0eWxlIHRvIGdlbmVyYXRlIGF0dHJpYnV0ZXMgZm9yLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBkYXRhIGJ1bmRsZSB0byBjb252ZXJ0IHRvIGF0dHJpYnV0ZXNcbiAqXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBvYmplY3Qgd2l0aCBIVE1MIGF0dHJpYnV0ZXMuXG4gKi9cbkRyYWZ0eS5hdHRyVmFsdWUgPSBmdW5jdGlvbihzdHlsZSwgZGF0YSkge1xuICBpZiAoZGF0YSAmJiBERUNPUkFUT1JTW3N0eWxlXSkge1xuICAgIHJldHVybiBERUNPUkFUT1JTW3N0eWxlXS5wcm9wcyhkYXRhKTtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogRHJhZnR5IE1JTUUgdHlwZS5cbiAqIEBtZW1iZXJvZiBEcmFmdHlcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIVFRQIENvbnRlbnQtVHlwZSBcInRleHQveC1kcmFmdHlcIi5cbiAqL1xuRHJhZnR5LmdldENvbnRlbnRUeXBlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAndGV4dC94LWRyYWZ0eSc7XG59XG5cbi8qKlxuICogU2hvcnRlbiBEcmFmdHkgZG9jdW1lbnQgYW5kIHN0cmlwIGFsbCBlbnRpdHkgZGF0YSBsZWF2aW5nIGp1c3QgaW5saW5lIHN0eWxlcyBhbmQgZW50aXR5IHJlZmVyZW5jZXMuXG4gKiBAbWVtYmVyb2YgRHJhZnR5XG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtEcmFmdHl9IG9yaWdpbmFsIC0gRHJhZnR5IG9iamVjdCB0byBzaG9ydGVuLlxuICogQHBhcmFtIHtudW1iZXJ9IGxlbmd0aCAtIGxlbmd0aCBpbiBjaGFyYWN0ZXJzIHRvIHNob3J0ZW4gdG8uXG4gKiBAcmV0dXJucyBuZXcgc2hvcnRlbmVkIERyYWZ0eSBvYmplY3QgbGVhdmluZyB0aGUgb3JpZ2luYWwgaW50YWN0LlxuICovXG5EcmFmdHkucHJldmlldyA9IGZ1bmN0aW9uKG9yaWdpbmFsLCBsZW5ndGgpIHtcbiAgaWYgKCFvcmlnaW5hbCB8fCBsZW5ndGggPD0gMCB8fCB0eXBlb2Ygb3JpZ2luYWwgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHtcbiAgICB0eHQsXG4gICAgZm10LFxuICAgIGVudFxuICB9ID0gb3JpZ2luYWw7XG5cbiAgY29uc3QgcHJldmlldyA9IHtcbiAgICB0eHQ6ICcnXG4gIH07XG5cbiAgaWYgKHR5cGVvZiB0eHQgPT0gJ3N0cmluZycpIHtcbiAgICBwcmV2aWV3LnR4dCA9IHR4dC5zdWJzdHIoMCwgbGVuZ3RoKTtcbiAgfVxuICBsZXQgbGVuID0gcHJldmlldy50eHQubGVuZ3RoO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGZtdCkgJiYgZm10Lmxlbmd0aCA+IDApIHtcbiAgICAvLyBPbGQga2V5IHRvIG5ldyBrZXkgZW50aXR5IG1hcHBpbmcuXG4gICAgY29uc3QgZW50X3JlZnMgPSBbXTtcbiAgICAvLyBDb3VudCBzdHlsZXMgd2hpY2ggc3RhcnQgd2l0aGluIHRoZSBuZXcgbGVuZ3RoIG9mIHRoZSB0ZXh0IGFuZCBzYXZlIGVudGl0eSBrZXlzIGFzIGEgc2V0LlxuICAgIGxldCBmbXRfY291bnQgPSAwO1xuICAgIGxldCBlbnRfY291bnQgPSAwO1xuICAgIGZtdC5mb3JFYWNoKChzdCkgPT4ge1xuICAgICAgc3QuYXQgfD0gMDtcbiAgICAgIGlmIChzdC5hdCA8IGxlbikge1xuICAgICAgICBmbXRfY291bnQrKztcbiAgICAgICAgaWYgKCFzdC50cCkge1xuICAgICAgICAgIHN0LmtleSB8PSAwO1xuICAgICAgICAgIGlmICghZW50X3JlZnNbc3Qua2V5XSkge1xuICAgICAgICAgICAgZW50X3JlZnNbc3Qua2V5XSA9IGVudF9jb3VudDtcbiAgICAgICAgICAgIGVudF9jb3VudCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGZtdF9jb3VudCA9PSAwKSB7XG4gICAgICByZXR1cm4gcHJldmlldztcbiAgICB9XG5cbiAgICAvLyBBbGxvY2F0ZSBzcGFjZSBmb3IgY29weWluZyBzdHlsZXMgYW5kIGVudGl0aWVzLlxuICAgIHByZXZpZXcuZm10ID0gW107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZW50KSAmJiBlbnRfcmVmcy5sZW5ndGggPiAwKSB7XG4gICAgICBwcmV2aWV3LmVudCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEluc2VydGlvbiBwb2ludCBmb3Igc3R5bGVzLlxuICAgIGxldCBmbXRfaWR4ID0gMDtcbiAgICBmbXQuZm9yRWFjaCgoc3QpID0+IHtcbiAgICAgIGlmIChzdC5hdCA8IGxlbikge1xuICAgICAgICBjb25zdCBzdHlsZSA9IHtcbiAgICAgICAgICBhdDogc3QuYXQsXG4gICAgICAgICAgbGVuOiBzdC5sZW4gfCAwXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzdC50cCkge1xuICAgICAgICAgIHN0eWxlLnRwID0gJycgKyBzdC50cDtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGVudCkgJiYgZW50Lmxlbmd0aCA+IHN0LmtleSAmJiB0eXBlb2YgZW50X3JlZnNbc3Qua2V5XSA9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHN0eWxlLmtleSA9IGVudF9yZWZzW3N0LmtleV07XG4gICAgICAgICAgcHJldmlldy5lbnRbc3R5bGUua2V5XSA9IGNvcHlMaWdodChlbnRbc3Qua2V5XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHByZXZpZXcuZm10W2ZtdF9pZHgrK10gPSBzdHlsZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcmV2aWV3O1xufVxuXG4vLyBDcmVhdGUgYSBjb3B5IG9mIGFuIGVudGl0eSB3aXRob3V0IGxhcmdlIGRhdGEuXG5mdW5jdGlvbiBjb3B5TGlnaHQoZW50KSB7XG4gIGxldCByZXN1bHQgPSB7XG4gICAgdHA6IGVudC50cFxuICB9O1xuICBpZiAoZW50LmRhdGEgJiYgT2JqZWN0LmVudHJpZXMoZW50LmRhdGEpLmxlbmd0aCAhPSAwKSB7XG4gICAgY29uc3QgZGMgPSB7fTtcbiAgICBbXCJtaW1lXCIsIFwibmFtZVwiLCBcIndpZHRoXCIsIFwiaGVpZ2h0XCIsIFwic2l6ZVwiXS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHZhbCA9IGVudC5kYXRhW2tleV07XG4gICAgICBpZiAodmFsKSB7XG4gICAgICAgIGRjW2tleV0gPSB2YWw7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKE9iamVjdC5lbnRyaWVzKGRjKS5sZW5ndGggIT0gMCkge1xuICAgICAgcmVzdWx0LmRhdGEgPSBkYztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBEcmFmdHk7XG59XG4iLCIvKipcbiAqIEBmaWxlIFV0aWxpdGllcyBmb3IgdXBsb2FkaW5nIGFuZCBkb3dubG9hZGluZyBmaWxlcy5cbiAqXG4gKiBAY29weXJpZ2h0IDIwMTUtMjAyMSBUaW5vZGVcbiAqIEBzdW1tYXJ5IEphdmFzY3JpcHQgYmluZGluZ3MgZm9yIFRpbm9kZS5cbiAqIEBsaWNlbnNlIEFwYWNoZSAyLjBcbiAqIEB2ZXJzaW9uIDAuMTdcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5sZXQgWEhSUHJvdmlkZXI7XG5cbi8qKlxuICogQGNsYXNzIExhcmdlRmlsZUhlbHBlciAtIHV0aWxpdGllcyBmb3IgdXBsb2FkaW5nIGFuZCBkb3dubG9hZGluZyBmaWxlcyBvdXQgb2YgYmFuZC5cbiAqIERvbid0IGluc3RhbnRpYXRlIHRoaXMgY2xhc3MgZGlyZWN0bHkuIFVzZSB7VGlub2RlLmdldExhcmdlRmlsZUhlbHBlcn0gaW5zdGVhZC5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqXG4gKiBAcGFyYW0ge1Rpbm9kZX0gdGlub2RlIC0gdGhlIG1haW4gVGlub2RlIG9iamVjdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2ZXJzaW9uIC0gcHJvdG9jb2wgdmVyc2lvbiwgaS5lLiAnMCcuXG4gKi9cbmNvbnN0IExhcmdlRmlsZUhlbHBlciA9IGZ1bmN0aW9uKHRpbm9kZSwgdmVyc2lvbikge1xuICB0aGlzLl90aW5vZGUgPSB0aW5vZGU7XG4gIHRoaXMuX3ZlcnNpb24gPSB2ZXJzaW9uO1xuXG4gIHRoaXMuX2FwaUtleSA9IHRpbm9kZS5fYXBpS2V5O1xuICB0aGlzLl9hdXRoVG9rZW4gPSB0aW5vZGUuZ2V0QXV0aFRva2VuKCk7XG4gIHRoaXMuX3JlcUlkID0gdGlub2RlLmdldE5leHRVbmlxdWVJZCgpO1xuICB0aGlzLnhociA9IG5ldyBYSFJQcm92aWRlcigpO1xuXG4gIC8vIFByb21pc2VcbiAgdGhpcy50b1Jlc29sdmUgPSBudWxsO1xuICB0aGlzLnRvUmVqZWN0ID0gbnVsbDtcblxuICAvLyBDYWxsYmFja3NcbiAgdGhpcy5vblByb2dyZXNzID0gbnVsbDtcbiAgdGhpcy5vblN1Y2Nlc3MgPSBudWxsO1xuICB0aGlzLm9uRmFpbHVyZSA9IG51bGw7XG59XG5cbkxhcmdlRmlsZUhlbHBlci5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiBTdGFydCB1cGxvYWRpbmcgdGhlIGZpbGUgdG8gYSBub24tZGVmYXVsdCBlbmRwb2ludC5cbiAgICpcbiAgICogQG1lbWJlcm9mIFRpbm9kZS5MYXJnZUZpbGVIZWxwZXIjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVXJsIGFsdGVybmF0aXZlIGJhc2UgVVJMIG9mIHVwbG9hZCBzZXJ2ZXIuXG4gICAqIEBwYXJhbSB7RmlsZXxCbG9ifSBkYXRhIHRvIHVwbG9hZC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGF2YXRhckZvciB0b3BpYyBuYW1lIGlmIHRoZSB1cGxvYWQgcmVwcmVzZW50cyBhbiBhdmF0YXIuXG4gICAqIEBwYXJhbSB7Q2FsbGJhY2t9IG9uUHJvZ3Jlc3MgY2FsbGJhY2suIFRha2VzIG9uZSB7ZmxvYXR9IHBhcmFtZXRlciAwLi4xXG4gICAqIEBwYXJhbSB7Q2FsbGJhY2t9IG9uU3VjY2VzcyBjYWxsYmFjay4gQ2FsbGVkIHdoZW4gdGhlIGZpbGUgaXMgc3VjY2Vzc2Z1bGx5IHVwbG9hZGVkLlxuICAgKiBAcGFyYW0ge0NhbGxiYWNrfSBvbkZhaWx1cmUgY2FsbGJhY2suIENhbGxlZCBpbiBjYXNlIG9mIGEgZmFpbHVyZS5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHVwbG9hZCBpcyBjb21wbGV0ZWQvZmFpbGVkLlxuICAgKi9cbiAgdXBsb2FkV2l0aEJhc2VVcmw6IGZ1bmN0aW9uKGJhc2VVcmwsIGRhdGEsIGF2YXRhckZvciwgb25Qcm9ncmVzcywgb25TdWNjZXNzLCBvbkZhaWx1cmUpIHtcbiAgICBpZiAoIXRoaXMuX2F1dGhUb2tlbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBhdXRoZW50aWNhdGUgZmlyc3RcIik7XG4gICAgfVxuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcztcblxuICAgIGxldCB1cmwgPSBgL3Yke3RoaXMuX3ZlcnNpb259L2ZpbGUvdS9gO1xuICAgIGlmIChiYXNlVXJsKSB7XG4gICAgICBsZXQgYmFzZSA9IGJhc2VVcmw7XG4gICAgICBpZiAoYmFzZS5lbmRzV2l0aCgnLycpKSB7XG4gICAgICAgIC8vIFJlbW92aW5nIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICBiYXNlID0gYmFzZS5zbGljZSgwLCAtMSk7XG4gICAgICB9XG4gICAgICBpZiAoYmFzZS5zdGFydHNXaXRoKCdodHRwOi8vJykgfHwgYmFzZS5zdGFydHNXaXRoKCdodHRwczovLycpKSB7XG4gICAgICAgIHVybCA9IGJhc2UgKyB1cmw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYmFzZSBVUkwgJyR7YmFzZVVybH0nYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMueGhyLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoJ1gtVGlub2RlLUFQSUtleScsIHRoaXMuX2FwaUtleSk7XG4gICAgdGhpcy54aHIuc2V0UmVxdWVzdEhlYWRlcignWC1UaW5vZGUtQXV0aCcsIGBUb2tlbiAke3RoaXMuX2F1dGhUb2tlbi50b2tlbn1gKTtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnRvUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnRvUmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuXG4gICAgdGhpcy5vblByb2dyZXNzID0gb25Qcm9ncmVzcztcbiAgICB0aGlzLm9uU3VjY2VzcyA9IG9uU3VjY2VzcztcbiAgICB0aGlzLm9uRmFpbHVyZSA9IG9uRmFpbHVyZTtcblxuICAgIHRoaXMueGhyLnVwbG9hZC5vbnByb2dyZXNzID0gKGUpID0+IHtcbiAgICAgIGlmIChlLmxlbmd0aENvbXB1dGFibGUgJiYgaW5zdGFuY2Uub25Qcm9ncmVzcykge1xuICAgICAgICBpbnN0YW5jZS5vblByb2dyZXNzKGUubG9hZGVkIC8gZS50b3RhbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy54aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgcGt0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGt0ID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlLCBqc29uUGFyc2VIZWxwZXIpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGluc3RhbmNlLl90aW5vZGUubG9nZ2VyKFwiRVJST1I6IEludmFsaWQgc2VydmVyIHJlc3BvbnNlIGluIExhcmdlRmlsZUhlbHBlclwiLCB0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgcGt0ID0ge1xuICAgICAgICAgIGN0cmw6IHtcbiAgICAgICAgICAgIGNvZGU6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgICAgdGV4dDogdGhpcy5zdGF0dXNUZXh0XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS50b1Jlc29sdmUpIHtcbiAgICAgICAgICBpbnN0YW5jZS50b1Jlc29sdmUocGt0LmN0cmwucGFyYW1zLnVybCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLm9uU3VjY2Vzcykge1xuICAgICAgICAgIGluc3RhbmNlLm9uU3VjY2Vzcyhwa3QuY3RybCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS50b1JlamVjdCkge1xuICAgICAgICAgIGluc3RhbmNlLnRvUmVqZWN0KG5ldyBFcnJvcihgJHtwa3QuY3RybC50ZXh0fSAoJHtwa3QuY3RybC5jb2RlfSlgKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLm9uRmFpbHVyZSkge1xuICAgICAgICAgIGluc3RhbmNlLm9uRmFpbHVyZShwa3QuY3RybClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5zdGFuY2UuX3Rpbm9kZS5sb2dnZXIoXCJFUlJPUjogVW5leHBlY3RlZCBzZXJ2ZXIgcmVzcG9uc2Ugc3RhdHVzXCIsIHRoaXMuc3RhdHVzLCB0aGlzLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy54aHIub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChpbnN0YW5jZS50b1JlamVjdCkge1xuICAgICAgICBpbnN0YW5jZS50b1JlamVjdChuZXcgRXJyb3IoXCJmYWlsZWRcIikpO1xuICAgICAgfVxuICAgICAgaWYgKGluc3RhbmNlLm9uRmFpbHVyZSkge1xuICAgICAgICBpbnN0YW5jZS5vbkZhaWx1cmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMueGhyLm9uYWJvcnQgPSBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAoaW5zdGFuY2UudG9SZWplY3QpIHtcbiAgICAgICAgaW5zdGFuY2UudG9SZWplY3QobmV3IEVycm9yKFwidXBsb2FkIGNhbmNlbGxlZCBieSB1c2VyXCIpKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnN0YW5jZS5vbkZhaWx1cmUpIHtcbiAgICAgICAgaW5zdGFuY2Uub25GYWlsdXJlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgZm9ybS5hcHBlbmQoJ2ZpbGUnLCBkYXRhKTtcbiAgICAgIGZvcm0uc2V0KCdpZCcsIHRoaXMuX3JlcUlkKTtcbiAgICAgIGlmIChhdmF0YXJGb3IpIHtcbiAgICAgICAgZm9ybS5zZXQoJ3RvcGljJywgYXZhdGFyRm9yKTtcbiAgICAgIH1cbiAgICAgIHRoaXMueGhyLnNlbmQoZm9ybSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAodGhpcy50b1JlamVjdCkge1xuICAgICAgICB0aGlzLnRvUmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vbkZhaWx1cmUpIHtcbiAgICAgICAgdGhpcy5vbkZhaWx1cmUobnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogU3RhcnQgdXBsb2FkaW5nIHRoZSBmaWxlIHRvIGRlZmF1bHQgZW5kcG9pbnQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuTGFyZ2VGaWxlSGVscGVyI1xuICAgKlxuICAgKiBAcGFyYW0ge0ZpbGV8QmxvYn0gZGF0YSB0byB1cGxvYWRcbiAgICogQHBhcmFtIHtzdHJpbmd9IGF2YXRhckZvciB0b3BpYyBuYW1lIGlmIHRoZSB1cGxvYWQgcmVwcmVzZW50cyBhbiBhdmF0YXIuXG4gICAqIEBwYXJhbSB7Q2FsbGJhY2t9IG9uUHJvZ3Jlc3MgY2FsbGJhY2suIFRha2VzIG9uZSB7ZmxvYXR9IHBhcmFtZXRlciAwLi4xXG4gICAqIEBwYXJhbSB7Q2FsbGJhY2t9IG9uU3VjY2VzcyBjYWxsYmFjay4gQ2FsbGVkIHdoZW4gdGhlIGZpbGUgaXMgc3VjY2Vzc2Z1bGx5IHVwbG9hZGVkLlxuICAgKiBAcGFyYW0ge0NhbGxiYWNrfSBvbkZhaWx1cmUgY2FsbGJhY2suIENhbGxlZCBpbiBjYXNlIG9mIGEgZmFpbHVyZS5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHVwbG9hZCBpcyBjb21wbGV0ZWQvZmFpbGVkLlxuICAgKi9cbiAgdXBsb2FkOiBmdW5jdGlvbihkYXRhLCBhdmF0YXJGb3IsIG9uUHJvZ3Jlc3MsIG9uU3VjY2Vzcywgb25GYWlsdXJlKSB7XG4gICAgY29uc3QgYmFzZVVybCA9ICh0aGlzLl90aW5vZGUuX3NlY3VyZSA/ICdodHRwczovLycgOiAnaHR0cDovLycpICsgdGhpcy50aW5vZGUuX2hvc3Q7XG4gICAgcmV0dXJuIHRoaXMudXBsb2FkV2l0aEJhc2VVcmwoYmFzZVVybCwgZGF0YSwgYXZhdGFyRm9yLCBvblByb2dyZXNzLCBvblN1Y2Nlc3MsIG9uRmFpbHVyZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERvd25sb2FkIHRoZSBmaWxlIGZyb20gYSBnaXZlbiBVUkwgdXNpbmcgR0VUIHJlcXVlc3QuIFRoaXMgbWV0aG9kIHdvcmtzIHdpdGggdGhlIFRpbm9kZSBzZXJ2ZXIgb25seS5cbiAgICpcbiAgICogQG1lbWJlcm9mIFRpbm9kZS5MYXJnZUZpbGVIZWxwZXIjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVybCAtIFVSTCB0byBkb3dubG9hZCB0aGUgZmlsZSBmcm9tLiBNdXN0IGJlIHJlbGF0aXZlIHVybCwgaS5lLiBtdXN0IG5vdCBjb250YWluIHRoZSBob3N0LlxuICAgKiBAcGFyYW0ge3N0cmluZz19IGZpbGVuYW1lIC0gZmlsZSBuYW1lIHRvIHVzZSBmb3IgdGhlIGRvd25sb2FkZWQgZmlsZS5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIGRvd25sb2FkIGlzIGNvbXBsZXRlZC9mYWlsZWQuXG4gICAqL1xuICBkb3dubG9hZDogZnVuY3Rpb24ocmVsYXRpdmVVcmwsIGZpbGVuYW1lLCBtaW1ldHlwZSwgb25Qcm9ncmVzcywgb25FcnJvcikge1xuICAgIGlmICghVGlub2RlLmlzUmVsYXRpdmVVUkwocmVsYXRpdmVVcmwpKSB7XG4gICAgICAvLyBBcyBhIHNlY3VyaXR5IG1lYXN1cmUgcmVmdXNlIHRvIGRvd25sb2FkIGZyb20gYW4gYWJzb2x1dGUgVVJMLlxuICAgICAgaWYgKG9uRXJyb3IpIHtcbiAgICAgICAgb25FcnJvcihgVGhlIFVSTCAnJHtyZWxhdGl2ZVVybH0nIG11c3QgYmUgcmVsYXRpdmUsIG5vdCBhYnNvbHV0ZWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuX2F1dGhUb2tlbikge1xuICAgICAgaWYgKG9uRXJyb3IpIHtcbiAgICAgICAgb25FcnJvcihcIk11c3QgYXV0aGVudGljYXRlIGZpcnN0XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXM7XG4gICAgLy8gR2V0IGRhdGEgYXMgYmxvYiAoc3RvcmVkIGJ5IHRoZSBicm93c2VyIGFzIGEgdGVtcG9yYXJ5IGZpbGUpLlxuICAgIHRoaXMueGhyLm9wZW4oJ0dFVCcsIHJlbGF0aXZlVXJsLCB0cnVlKTtcbiAgICB0aGlzLnhoci5zZXRSZXF1ZXN0SGVhZGVyKCdYLVRpbm9kZS1BUElLZXknLCB0aGlzLl9hcGlLZXkpO1xuICAgIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoJ1gtVGlub2RlLUF1dGgnLCAnVG9rZW4gJyArIHRoaXMuX2F1dGhUb2tlbi50b2tlbik7XG4gICAgdGhpcy54aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuXG4gICAgdGhpcy5vblByb2dyZXNzID0gb25Qcm9ncmVzcztcbiAgICB0aGlzLnhoci5vbnByb2dyZXNzID0gZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKGluc3RhbmNlLm9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgLy8gUGFzc2luZyBlLmxvYWRlZCBpbnN0ZWFkIG9mIGUubG9hZGVkL2UudG90YWwgYmVjYXVzZSBlLnRvdGFsXG4gICAgICAgIC8vIGlzIGFsd2F5cyAwIHdpdGggZ3ppcCBjb21wcmVzc2lvbiBlbmFibGVkIGJ5IHRoZSBzZXJ2ZXIuXG4gICAgICAgIGluc3RhbmNlLm9uUHJvZ3Jlc3MoZS5sb2FkZWQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnRvUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnRvUmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuXG4gICAgLy8gVGhlIGJsb2IgbmVlZHMgdG8gYmUgc2F2ZWQgYXMgZmlsZS4gVGhlcmUgaXMgbm8ga25vd24gd2F5IHRvXG4gICAgLy8gc2F2ZSB0aGUgYmxvYiBhcyBmaWxlIG90aGVyIHRoYW4gdG8gZmFrZSBhIGNsaWNrIG9uIGFuIDxhIGhyZWYuLi4gZG93bmxvYWQ9Li4uPi5cbiAgICB0aGlzLnhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgLy8gVVJMLmNyZWF0ZU9iamVjdFVSTCBpcyBub3QgYXZhaWxhYmxlIGluIG5vbi1icm93c2VyIGVudmlyb25tZW50LiBUaGlzIGNhbGwgd2lsbCBmYWlsLlxuICAgICAgICBsaW5rLmhyZWYgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbdGhpcy5yZXNwb25zZV0sIHtcbiAgICAgICAgICB0eXBlOiBtaW1ldHlwZVxuICAgICAgICB9KSk7XG4gICAgICAgIGxpbmsuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2Rvd25sb2FkJywgZmlsZW5hbWUpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKGxpbmsuaHJlZik7XG4gICAgICAgIGlmIChpbnN0YW5jZS50b1Jlc29sdmUpIHtcbiAgICAgICAgICBpbnN0YW5jZS50b1Jlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXR1cyA+PSA0MDAgJiYgaW5zdGFuY2UudG9SZWplY3QpIHtcbiAgICAgICAgLy8gVGhlIHRoaXMucmVzcG9uc2VUZXh0IGlzIHVuZGVmaW5lZCwgbXVzdCB1c2UgdGhpcy5yZXNwb25zZSB3aGljaCBpcyBhIGJsb2IuXG4gICAgICAgIC8vIE5lZWQgdG8gY29udmVydCB0aGlzLnJlc3BvbnNlIHRvIEpTT04uIFRoZSBibG9iIGNhbiBvbmx5IGJlIGFjY2Vzc2VkIGJ5IHRoZVxuICAgICAgICAvLyBGaWxlUmVhZGVyLlxuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBrdCA9IEpTT04ucGFyc2UodGhpcy5yZXN1bHQsIGpzb25QYXJzZUhlbHBlcik7XG4gICAgICAgICAgICBpbnN0YW5jZS50b1JlamVjdChuZXcgRXJyb3IoYCR7cGt0LmN0cmwudGV4dH0gKCR7cGt0LmN0cmwuY29kZX0pYCkpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaW5zdGFuY2UuX3Rpbm9kZS5sb2dnZXIoXCJFUlJPUjogSW52YWxpZCBzZXJ2ZXIgcmVzcG9uc2UgaW4gTGFyZ2VGaWxlSGVscGVyXCIsIHRoaXMucmVzdWx0KTtcbiAgICAgICAgICAgIGluc3RhbmNlLnRvUmVqZWN0KGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZWFkZXIucmVhZEFzVGV4dCh0aGlzLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy54aHIub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChpbnN0YW5jZS50b1JlamVjdCkge1xuICAgICAgICBpbnN0YW5jZS50b1JlamVjdChuZXcgRXJyb3IoXCJmYWlsZWRcIikpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnhoci5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoaW5zdGFuY2UudG9SZWplY3QpIHtcbiAgICAgICAgaW5zdGFuY2UudG9SZWplY3QobnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICB0aGlzLnhoci5zZW5kKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAodGhpcy50b1JlamVjdCkge1xuICAgICAgICB0aGlzLnRvUmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogVHJ5IHRvIGNhbmNlbCBhbiBvbmdvaW5nIHVwbG9hZCBvciBkb3dubG9hZC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5MYXJnZUZpbGVIZWxwZXIjXG4gICAqL1xuICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnhociAmJiB0aGlzLnhoci5yZWFkeVN0YXRlIDwgNCkge1xuICAgICAgdGhpcy54aHIuYWJvcnQoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB1bmlxdWUgaWQgb2YgdGhpcyByZXF1ZXN0LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLkxhcmdlRmlsZUhlbHBlciNcbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ30gdW5pcXVlIGlkXG4gICAqL1xuICBnZXRJZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlcUlkO1xuICB9XG59O1xuXG4vKipcbiAqIFRvIHVzZSBMYXJnZUZpbGVIZWxwZXIgaW4gYSBub24gYnJvd3NlciBjb250ZXh0LCBzdXBwbHkgWE1MSHR0cFJlcXVlc3QgcHJvdmlkZXIuXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyb2YgTGFyZ2VGaWxlSGVscGVyXG4gKiBAcGFyYW0geGhyUHJvdmlkZXIgWE1MSHR0cFJlcXVlc3QgcHJvdmlkZXIsIGUuZy4gZm9yIG5vZGUgPGNvZGU+cmVxdWlyZSgneGhyJyk8L2NvZGU+LlxuICovXG5MYXJnZUZpbGVIZWxwZXIuc2V0TmV0d29ya1Byb3ZpZGVyID0gZnVuY3Rpb24oeGhyUHJvdmlkZXIpIHtcbiAgWEhSUHJvdmlkZXIgPSB4aHJQcm92aWRlcjtcbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gTGFyZ2VGaWxlSGVscGVyO1xufVxuIiwiLyoqXG4gKiBAZmlsZSBIZWxwZXIgY2xhc3MgZm9yIGNvbnN0cnVjdGluZyB7QGxpbmsgVGlub2RlLkdldFF1ZXJ5fS5cbiAqXG4gKiBAY29weXJpZ2h0IDIwMTUtMjAyMSBUaW5vZGVcbiAqIEBzdW1tYXJ5IEphdmFzY3JpcHQgYmluZGluZ3MgZm9yIFRpbm9kZS5cbiAqIEBsaWNlbnNlIEFwYWNoZSAyLjBcbiAqIEB2ZXJzaW9uIDAuMTdcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEhlbHBlciBjbGFzcyBmb3IgY29uc3RydWN0aW5nIHtAbGluayBUaW5vZGUuR2V0UXVlcnl9LlxuICpcbiAqIEBjbGFzcyBNZXRhR2V0QnVpbGRlclxuICogQG1lbWJlcm9mIFRpbm9kZVxuICpcbiAqIEBwYXJhbSB7VGlub2RlLlRvcGljfSBwYXJlbnQgdG9waWMgd2hpY2ggaW5zdGFudGlhdGVkIHRoaXMgYnVpbGRlci5cbiAqL1xuY29uc3QgTWV0YUdldEJ1aWxkZXIgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgdGhpcy50b3BpYyA9IHBhcmVudDtcbiAgdGhpcy53aGF0ID0ge307XG59XG5cbk1ldGFHZXRCdWlsZGVyLnByb3RvdHlwZSA9IHtcblxuICAvLyBHZXQgdGltZXN0YW1wIG9mIHRoZSBtb3N0IHJlY2VudCBkZXNjIHVwZGF0ZS5cbiAgX2dldF9kZXNjX2ltczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9waWMudXBkYXRlZDtcbiAgfSxcblxuICAvLyBHZXQgdGltZXN0YW1wIG9mIHRoZSBtb3N0IHJlY2VudCBzdWJzIHVwZGF0ZS5cbiAgX2dldF9zdWJzX2ltczogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMudG9waWMuaXNQMlBUeXBlKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9nZXRfZGVzY19pbXMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudG9waWMuX2xhc3RTdWJzVXBkYXRlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgcXVlcnkgcGFyYW1ldGVycyB0byBmZXRjaCBtZXNzYWdlcyB3aXRoaW4gZXhwbGljaXQgbGltaXRzLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLk1ldGFHZXRCdWlsZGVyI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcj19IHNpbmNlIC0gbWVzc2FnZXMgbmV3ZXIgdGhhbiB0aGlzIChpbmNsdXNpdmUpO1xuICAgKiBAcGFyYW0ge251bWJlcj19IGJlZm9yZSAtIG9sZGVyIHRoYW4gdGhpcyAoZXhjbHVzaXZlKVxuICAgKiBAcGFyYW0ge251bWJlcj19IGxpbWl0IC0gbnVtYmVyIG9mIG1lc3NhZ2VzIHRvIGZldGNoXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IDxjb2RlPnRoaXM8L2NvZGU+IG9iamVjdC5cbiAgICovXG4gIHdpdGhEYXRhOiBmdW5jdGlvbihzaW5jZSwgYmVmb3JlLCBsaW1pdCkge1xuICAgIHRoaXMud2hhdFsnZGF0YSddID0ge1xuICAgICAgc2luY2U6IHNpbmNlLFxuICAgICAgYmVmb3JlOiBiZWZvcmUsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9O1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgcXVlcnkgcGFyYW1ldGVycyB0byBmZXRjaCBtZXNzYWdlcyBuZXdlciB0aGFuIHRoZSBsYXRlc3Qgc2F2ZWQgbWVzc2FnZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXI9fSBsaW1pdCAtIG51bWJlciBvZiBtZXNzYWdlcyB0byBmZXRjaFxuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLk1ldGFHZXRCdWlsZGVyfSA8Y29kZT50aGlzPC9jb2RlPiBvYmplY3QuXG4gICAqL1xuICB3aXRoTGF0ZXJEYXRhOiBmdW5jdGlvbihsaW1pdCkge1xuICAgIHJldHVybiB0aGlzLndpdGhEYXRhKHRoaXMudG9waWMuX21heFNlcSA+IDAgPyB0aGlzLnRvcGljLl9tYXhTZXEgKyAxIDogdW5kZWZpbmVkLCB1bmRlZmluZWQsIGxpbWl0KTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggbWVzc2FnZXMgb2xkZXIgdGhhbiB0aGUgZWFybGllc3Qgc2F2ZWQgbWVzc2FnZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXI9fSBsaW1pdCAtIG1heGltdW0gbnVtYmVyIG9mIG1lc3NhZ2VzIHRvIGZldGNoLlxuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLk1ldGFHZXRCdWlsZGVyfSA8Y29kZT50aGlzPC9jb2RlPiBvYmplY3QuXG4gICAqL1xuICB3aXRoRWFybGllckRhdGE6IGZ1bmN0aW9uKGxpbWl0KSB7XG4gICAgcmV0dXJuIHRoaXMud2l0aERhdGEodW5kZWZpbmVkLCB0aGlzLnRvcGljLl9taW5TZXEgPiAwID8gdGhpcy50b3BpYy5fbWluU2VxIDogdW5kZWZpbmVkLCBsaW1pdCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGZldGNoIHRvcGljIGRlc2NyaXB0aW9uIGlmIGl0J3MgbmV3ZXIgdGhhbiB0aGUgZ2l2ZW4gdGltZXN0YW1wLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLk1ldGFHZXRCdWlsZGVyI1xuICAgKlxuICAgKiBAcGFyYW0ge0RhdGU9fSBpbXMgLSBmZXRjaCBtZXNzYWdlcyBuZXdlciB0aGFuIHRoaXMgdGltZXN0YW1wLlxuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLk1ldGFHZXRCdWlsZGVyfSA8Y29kZT50aGlzPC9jb2RlPiBvYmplY3QuXG4gICAqL1xuICB3aXRoRGVzYzogZnVuY3Rpb24oaW1zKSB7XG4gICAgdGhpcy53aGF0WydkZXNjJ10gPSB7XG4gICAgICBpbXM6IGltc1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGZldGNoIHRvcGljIGRlc2NyaXB0aW9uIGlmIGl0J3MgbmV3ZXIgdGhhbiB0aGUgbGFzdCB1cGRhdGUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuTWV0YUdldEJ1aWxkZXIjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IDxjb2RlPnRoaXM8L2NvZGU+IG9iamVjdC5cbiAgICovXG4gIHdpdGhMYXRlckRlc2M6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLndpdGhEZXNjKHRoaXMuX2dldF9kZXNjX2ltcygpKTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggc3Vic2NyaXB0aW9ucy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtEYXRlPX0gaW1zIC0gZmV0Y2ggc3Vic2NyaXB0aW9ucyBtb2RpZmllZCBtb3JlIHJlY2VudGx5IHRoYW4gdGhpcyB0aW1lc3RhbXBcbiAgICogQHBhcmFtIHtudW1iZXI9fSBsaW1pdCAtIG1heGltdW0gbnVtYmVyIG9mIHN1YnNjcmlwdGlvbnMgdG8gZmV0Y2guXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gdXNlck9yVG9waWMgLSB1c2VyIElEIG9yIHRvcGljIG5hbWUgdG8gZmV0Y2ggZm9yIGZldGNoaW5nIG9uZSBzdWJzY3JpcHRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IDxjb2RlPnRoaXM8L2NvZGU+IG9iamVjdC5cbiAgICovXG4gIHdpdGhTdWI6IGZ1bmN0aW9uKGltcywgbGltaXQsIHVzZXJPclRvcGljKSB7XG4gICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgIGltczogaW1zLFxuICAgICAgbGltaXQ6IGxpbWl0XG4gICAgfTtcbiAgICBpZiAodGhpcy50b3BpYy5nZXRUeXBlKCkgPT0gJ21lJykge1xuICAgICAgb3B0cy50b3BpYyA9IHVzZXJPclRvcGljO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRzLnVzZXIgPSB1c2VyT3JUb3BpYztcbiAgICB9XG4gICAgdGhpcy53aGF0WydzdWInXSA9IG9wdHM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGZldGNoIGEgc2luZ2xlIHN1YnNjcmlwdGlvbi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtEYXRlPX0gaW1zIC0gZmV0Y2ggc3Vic2NyaXB0aW9ucyBtb2RpZmllZCBtb3JlIHJlY2VudGx5IHRoYW4gdGhpcyB0aW1lc3RhbXBcbiAgICogQHBhcmFtIHtzdHJpbmc9fSB1c2VyT3JUb3BpYyAtIHVzZXIgSUQgb3IgdG9waWMgbmFtZSB0byBmZXRjaCBmb3IgZmV0Y2hpbmcgb25lIHN1YnNjcmlwdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5NZXRhR2V0QnVpbGRlcn0gPGNvZGU+dGhpczwvY29kZT4gb2JqZWN0LlxuICAgKi9cbiAgd2l0aE9uZVN1YjogZnVuY3Rpb24oaW1zLCB1c2VyT3JUb3BpYykge1xuICAgIHJldHVybiB0aGlzLndpdGhTdWIoaW1zLCB1bmRlZmluZWQsIHVzZXJPclRvcGljKTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggYSBzaW5nbGUgc3Vic2NyaXB0aW9uIGlmIGl0J3MgYmVlbiB1cGRhdGVkIHNpbmNlIHRoZSBsYXN0IHVwZGF0ZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSB1c2VyT3JUb3BpYyAtIHVzZXIgSUQgb3IgdG9waWMgbmFtZSB0byBmZXRjaCBmb3IgZmV0Y2hpbmcgb25lIHN1YnNjcmlwdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5NZXRhR2V0QnVpbGRlcn0gPGNvZGU+dGhpczwvY29kZT4gb2JqZWN0LlxuICAgKi9cbiAgd2l0aExhdGVyT25lU3ViOiBmdW5jdGlvbih1c2VyT3JUb3BpYykge1xuICAgIHJldHVybiB0aGlzLndpdGhPbmVTdWIodGhpcy50b3BpYy5fbGFzdFN1YnNVcGRhdGUsIHVzZXJPclRvcGljKTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggc3Vic2NyaXB0aW9ucyB1cGRhdGVkIHNpbmNlIHRoZSBsYXN0IHVwZGF0ZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXI9fSBsaW1pdCAtIG1heGltdW0gbnVtYmVyIG9mIHN1YnNjcmlwdGlvbnMgdG8gZmV0Y2guXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IDxjb2RlPnRoaXM8L2NvZGU+IG9iamVjdC5cbiAgICovXG4gIHdpdGhMYXRlclN1YjogZnVuY3Rpb24obGltaXQpIHtcbiAgICByZXR1cm4gdGhpcy53aXRoU3ViKHRoaXMuX2dldF9zdWJzX2ltcygpLCBsaW1pdCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGZldGNoIHRvcGljIHRhZ3MuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuTWV0YUdldEJ1aWxkZXIjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IDxjb2RlPnRoaXM8L2NvZGU+IG9iamVjdC5cbiAgICovXG4gIHdpdGhUYWdzOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLndoYXRbJ3RhZ3MnXSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGZldGNoIHVzZXIncyBjcmVkZW50aWFscy4gPGNvZGU+J21lJzwvY29kZT4gdG9waWMgb25seS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5NZXRhR2V0QnVpbGRlcn0gPGNvZGU+dGhpczwvY29kZT4gb2JqZWN0LlxuICAgKi9cbiAgd2l0aENyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnRvcGljLmdldFR5cGUoKSA9PSAnbWUnKSB7XG4gICAgICB0aGlzLndoYXRbJ2NyZWQnXSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudG9waWMuX3Rpbm9kZS5sb2dnZXIoXCJFUlJPUjogSW52YWxpZCB0b3BpYyB0eXBlIGZvciBNZXRhR2V0QnVpbGRlcjp3aXRoQ3JlZHNcIiwgdGhpcy50b3BpYy5nZXRUeXBlKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggZGVsZXRlZCBtZXNzYWdlcyB3aXRoaW4gZXhwbGljaXQgbGltaXRzLiBBbnkvYWxsIHBhcmFtZXRlcnMgY2FuIGJlIG51bGwuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuTWV0YUdldEJ1aWxkZXIjXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gc2luY2UgLSBpZHMgb2YgbWVzc2FnZXMgZGVsZXRlZCBzaW5jZSB0aGlzICdkZWwnIGlkIChpbmNsdXNpdmUpXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gbGltaXQgLSBudW1iZXIgb2YgZGVsZXRlZCBtZXNzYWdlIGlkcyB0byBmZXRjaFxuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLk1ldGFHZXRCdWlsZGVyfSA8Y29kZT50aGlzPC9jb2RlPiBvYmplY3QuXG4gICAqL1xuICB3aXRoRGVsOiBmdW5jdGlvbihzaW5jZSwgbGltaXQpIHtcbiAgICBpZiAoc2luY2UgfHwgbGltaXQpIHtcbiAgICAgIHRoaXMud2hhdFsnZGVsJ10gPSB7XG4gICAgICAgIHNpbmNlOiBzaW5jZSxcbiAgICAgICAgbGltaXQ6IGxpbWl0XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZmV0Y2ggbWVzc2FnZXMgZGVsZXRlZCBhZnRlciB0aGUgc2F2ZWQgPGNvZGU+J2RlbCc8L2NvZGU+IGlkLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLk1ldGFHZXRCdWlsZGVyI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcj19IGxpbWl0IC0gbnVtYmVyIG9mIGRlbGV0ZWQgbWVzc2FnZSBpZHMgdG8gZmV0Y2hcbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5NZXRhR2V0QnVpbGRlcn0gPGNvZGU+dGhpczwvY29kZT4gb2JqZWN0LlxuICAgKi9cbiAgd2l0aExhdGVyRGVsOiBmdW5jdGlvbihsaW1pdCkge1xuICAgIC8vIFNwZWNpZnkgJ3NpbmNlJyBvbmx5IGlmIHdlIGhhdmUgYWxyZWFkeSByZWNlaXZlZCBzb21lIG1lc3NhZ2VzLiBJZlxuICAgIC8vIHdlIGhhdmUgbm8gbG9jYWxseSBjYWNoZWQgbWVzc2FnZXMgdGhlbiB3ZSBkb24ndCBjYXJlIGlmIGFueSBtZXNzYWdlcyB3ZXJlIGRlbGV0ZWQuXG4gICAgcmV0dXJuIHRoaXMud2l0aERlbCh0aGlzLnRvcGljLl9tYXhTZXEgPiAwID8gdGhpcy50b3BpYy5fbWF4RGVsICsgMSA6IHVuZGVmaW5lZCwgbGltaXQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgcGFyYW1ldGVycy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5NZXRhR2V0QnVpbGRlciNcbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5HZXRRdWVyeX0gR2V0IHF1ZXJ5XG4gICAqL1xuICBidWlsZDogZnVuY3Rpb24oKSB7XG4gICAgY29uc3Qgd2hhdCA9IFtdO1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcztcbiAgICBsZXQgcGFyYW1zID0ge307XG4gICAgWydkYXRhJywgJ3N1YicsICdkZXNjJywgJ3RhZ3MnLCAnY3JlZCcsICdkZWwnXS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoaW5zdGFuY2Uud2hhdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHdoYXQucHVzaChrZXkpO1xuICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaW5zdGFuY2Uud2hhdFtrZXldKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcGFyYW1zW2tleV0gPSBpbnN0YW5jZS53aGF0W2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAod2hhdC5sZW5ndGggPiAwKSB7XG4gICAgICBwYXJhbXMud2hhdCA9IHdoYXQuam9pbignICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJhbXMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gTWV0YUdldEJ1aWxkZXI7XG59XG4iLCIvKipcbiAqIEBmaWxlIFNESyB0byBjb25uZWN0IHRvIFRpbm9kZSBjaGF0IHNlcnZlci5cbiAqIFNlZSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3Rpbm9kZS93ZWJhcHBcIj5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS90aW5vZGUvd2ViYXBwPC9hPiBmb3IgcmVhbC1saWZlIHVzYWdlLlxuICpcbiAqIEBjb3B5cmlnaHQgMjAxNS0yMDIxIFRpbm9kZVxuICogQHN1bW1hcnkgSmF2YXNjcmlwdCBiaW5kaW5ncyBmb3IgVGlub2RlLlxuICogQGxpY2Vuc2UgQXBhY2hlIDIuMFxuICogQHZlcnNpb24gMC4xN1xuICpcbiAqIEBleGFtcGxlXG4gKiA8aGVhZD5cbiAqIDxzY3JpcHQgc3JjPVwiLi4uL3Rpbm9kZS5qc1wiPjwvc2NyaXB0PlxuICogPC9oZWFkPlxuICpcbiAqIDxib2R5PlxuICogIC4uLlxuICogPHNjcmlwdD5cbiAqICAvLyBJbnN0YW50aWF0ZSB0aW5vZGUuXG4gKiAgY29uc3QgdGlub2RlID0gbmV3IFRpbm9kZShBUFBfTkFNRSwgSE9TVCwgQVBJX0tFWSwgbnVsbCwgdHJ1ZSk7XG4gKiAgdGlub2RlLmVuYWJsZUxvZ2dpbmcodHJ1ZSk7XG4gKiAgLy8gQWRkIGxvZ2ljIHRvIGhhbmRsZSBkaXNjb25uZWN0cy5cbiAqICB0aW5vZGUub25EaXNjb25uZWN0ID0gZnVuY3Rpb24oZXJyKSB7IC4uLiB9O1xuICogIC8vIENvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqICB0aW5vZGUuY29ubmVjdCgpLnRoZW4oKCkgPT4ge1xuICogICAgLy8gQ29ubmVjdGVkLiBMb2dpbiBub3cuXG4gKiAgICByZXR1cm4gdGlub2RlLmxvZ2luQmFzaWMobG9naW4sIHBhc3N3b3JkKTtcbiAqICB9KS50aGVuKChjdHJsKSA9PiB7XG4gKiAgICAvLyBMb2dnZWQgaW4gZmluZSwgYXR0YWNoIGNhbGxiYWNrcywgc3Vic2NyaWJlIHRvICdtZScuXG4gKiAgICBjb25zdCBtZSA9IHRpbm9kZS5nZXRNZVRvcGljKCk7XG4gKiAgICBtZS5vbk1ldGFEZXNjID0gZnVuY3Rpb24obWV0YSkgeyAuLi4gfTtcbiAqICAgIC8vIFN1YnNjcmliZSwgZmV0Y2ggdG9waWMgZGVzY3JpcHRpb24gYW5kIHRoZSBsaXN0IG9mIGNvbnRhY3RzLlxuICogICAgbWUuc3Vic2NyaWJlKHtnZXQ6IHtkZXNjOiB7fSwgc3ViOiB7fX0pO1xuICogIH0pLmNhdGNoKChlcnIpID0+IHtcbiAqICAgIC8vIExvZ2luIG9yIHN1YnNjcmlwdGlvbiBmYWlsZWQsIGRvIHNvbWV0aGluZy5cbiAqICAgIC4uLlxuICogIH0pO1xuICogIC4uLlxuICogPC9zY3JpcHQ+XG4gKiA8L2JvZHk+XG4gKi9cbid1c2Ugc3RyaWN0JztcblxuLy8gTk9URSBUTyBERVZFTE9QRVJTOlxuLy8gTG9jYWxpemFibGUgc3RyaW5ncyBzaG91bGQgYmUgZG91YmxlIHF1b3RlZCBcItGB0YLRgNC+0LrQsCDQvdCwINC00YDRg9Cz0L7QvCDRj9C30YvQutC1XCIsXG4vLyBub24tbG9jYWxpemFibGUgc3RyaW5ncyBzaG91bGQgYmUgc2luZ2xlIHF1b3RlZCAnbm9uLWxvY2FsaXplZCcuXG5cbi8vIE1vZHVsZSBpbXBvcnRzIE5vZGUuanMgc3R5bGUuXG5pZiAodHlwZW9mIHJlcXVpcmUgIT0gJ2Z1bmN0aW9uJykge1xuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gbG9hZCBtb2R1bGVzOiByZXF1aXJlKCkgaXMgbm90IGF2YWlsYWJsZS5cIik7XG59XG5cbmNvbnN0IEFjY2Vzc01vZGUgPSByZXF1aXJlKCcuL2FjY2Vzcy1tb2RlLmpzJyk7XG5jb25zdCBDQnVmZmVyID0gcmVxdWlyZSgnLi9jYnVmZmVyLmpzJyk7XG5jb25zdCBDb25uZWN0aW9uID0gcmVxdWlyZSgnLi9jb25uZWN0aW9uLmpzJyk7XG5jb25zdCBEQkNhY2hlID0gcmVxdWlyZSgnLi9kYi5qcycpO1xuY29uc3QgRHJhZnR5ID0gcmVxdWlyZSgnLi9kcmFmdHkuanMnKTtcbmNvbnN0IExhcmdlRmlsZUhlbHBlciA9IHJlcXVpcmUoJy4vbGFyZ2UtZmlsZS5qcycpO1xuY29uc3QgTWV0YUdldEJ1aWxkZXIgPSByZXF1aXJlKCcuL21ldGEtYnVpbGRlci5qcycpO1xuXG5jb25zdCBwYWNrYWdlX3ZlcnNpb24gPSByZXF1aXJlKCcuLi92ZXJzaW9uLmpzb24nKS52ZXJzaW9uO1xuXG5sZXQgV2ViU29ja2V0UHJvdmlkZXI7XG5pZiAodHlwZW9mIFdlYlNvY2tldCAhPSAndW5kZWZpbmVkJykge1xuICBXZWJTb2NrZXRQcm92aWRlciA9IFdlYlNvY2tldDtcbn1cblxubGV0IFhIUlByb3ZpZGVyO1xuaWYgKHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAhPSAndW5kZWZpbmVkJykge1xuICBYSFJQcm92aWRlciA9IFhNTEh0dHBSZXF1ZXN0O1xufVxuXG5pbml0Rm9yTm9uQnJvd3NlckFwcCgpO1xuXG4vLyBHbG9iYWwgY29uc3RhbnRzXG5jb25zdCBQUk9UT0NPTF9WRVJTSU9OID0gJzAnOyAvLyBNYWpvciBjb21wb25lbnQgb2YgdGhlIHZlcnNpb24sIGUuZy4gJzAnIGluICcwLjE3LjEnLlxuY29uc3QgVkVSU0lPTiA9IHBhY2thZ2VfdmVyc2lvbiB8fCAnMC4xNyc7XG5jb25zdCBMSUJSQVJZID0gJ3Rpbm9kZWpzLycgKyBWRVJTSU9OO1xuXG5jb25zdCBUT1BJQ19ORVcgPSAnbmV3JztcbmNvbnN0IFRPUElDX05FV19DSEFOID0gJ25jaCc7XG5jb25zdCBUT1BJQ19NRSA9ICdtZSc7XG5jb25zdCBUT1BJQ19GTkQgPSAnZm5kJztcbmNvbnN0IFRPUElDX1NZUyA9ICdzeXMnO1xuY29uc3QgVE9QSUNfQ0hBTiA9ICdjaG4nO1xuY29uc3QgVVNFUl9ORVcgPSAnbmV3JztcblxuLy8gU3RhcnRpbmcgdmFsdWUgb2YgYSBsb2NhbGx5LWdlbmVyYXRlZCBzZXFJZCB1c2VkIGZvciBwZW5kaW5nIG1lc3NhZ2VzLlxuY29uc3QgTE9DQUxfU0VRSUQgPSAweEZGRkZGRkY7XG5cbmNvbnN0IE1FU1NBR0VfU1RBVFVTX05PTkUgPSAwOyAvLyBTdGF0dXMgbm90IGFzc2lnbmVkLlxuY29uc3QgTUVTU0FHRV9TVEFUVVNfUVVFVUVEID0gMTsgLy8gTG9jYWwgSUQgYXNzaWduZWQsIGluIHByb2dyZXNzIHRvIGJlIHNlbnQuXG5jb25zdCBNRVNTQUdFX1NUQVRVU19TRU5ESU5HID0gMjsgLy8gVHJhbnNtaXNzaW9uIHN0YXJ0ZWQuXG5jb25zdCBNRVNTQUdFX1NUQVRVU19GQUlMRUQgPSAzOyAvLyBBdCBsZWFzdCBvbmUgYXR0ZW1wdCB3YXMgbWFkZSB0byBzZW5kIHRoZSBtZXNzYWdlLlxuY29uc3QgTUVTU0FHRV9TVEFUVVNfU0VOVCA9IDQ7IC8vIERlbGl2ZXJlZCB0byB0aGUgc2VydmVyLlxuY29uc3QgTUVTU0FHRV9TVEFUVVNfUkVDRUlWRUQgPSA1OyAvLyBSZWNlaXZlZCBieSB0aGUgY2xpZW50LlxuY29uc3QgTUVTU0FHRV9TVEFUVVNfUkVBRCA9IDY7IC8vIFJlYWQgYnkgdGhlIHVzZXIuXG5jb25zdCBNRVNTQUdFX1NUQVRVU19UT19NRSA9IDc7IC8vIE1lc3NhZ2UgZnJvbSBhbm90aGVyIHVzZXIuXG5jb25zdCBNRVNTQUdFX1NUQVRVU19ERUxfUkFOR0UgPSA4OyAvLyBNZXNzYWdlIGlzIGEgZGVsZXRlZCByYW5nZS5cblxuLy8gUmVqZWN0IHVucmVzb2x2ZWQgZnV0dXJlcyBhZnRlciB0aGlzIG1hbnkgbWlsbGlzZWNvbmRzLlxuY29uc3QgRVhQSVJFX1BST01JU0VTX1RJTUVPVVQgPSA1MDAwO1xuLy8gUGVyaW9kaWNpdHkgb2YgZ2FyYmFnZSBjb2xsZWN0aW9uIG9mIHVucmVzb2x2ZWQgZnV0dXJlcy5cbmNvbnN0IEVYUElSRV9QUk9NSVNFU19QRVJJT0QgPSAxMDAwO1xuXG4vLyBEZWZhdWx0IG51bWJlciBvZiBtZXNzYWdlcyB0byBwdWxsIGludG8gbWVtb3J5IGZyb20gcGVyc2lzdGVudCBjYWNoZS5cbmNvbnN0IERFRkFVTFRfTUVTU0FHRVNfUEFHRSA9IDI0O1xuXG4vLyBVdGlsaXR5IGZ1bmN0aW9uc1xuXG4vLyBQb2x5ZmlsbCBmb3Igbm9uLWJyb3dzZXIgY29udGV4dCwgZS5nLiBOb2RlSnMuXG5mdW5jdGlvbiBpbml0Rm9yTm9uQnJvd3NlckFwcCgpIHtcbiAgLy8gVGlub2RlIHJlcXVpcmVtZW50IGluIG5hdGl2ZSBtb2RlIGJlY2F1c2UgcmVhY3QgbmF0aXZlIGRvZXNuJ3QgcHJvdmlkZSBCYXNlNjQgbWV0aG9kXG4gIGNvbnN0IGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcblxuICBpZiAodHlwZW9mIGJ0b2EgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBnbG9iYWwuYnRvYSA9IGZ1bmN0aW9uKGlucHV0ID0gJycpIHtcbiAgICAgIGxldCBzdHIgPSBpbnB1dDtcbiAgICAgIGxldCBvdXRwdXQgPSAnJztcblxuICAgICAgZm9yIChsZXQgYmxvY2sgPSAwLCBjaGFyQ29kZSwgaSA9IDAsIG1hcCA9IGNoYXJzOyBzdHIuY2hhckF0KGkgfCAwKSB8fCAobWFwID0gJz0nLCBpICUgMSk7IG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGkgJSAxICogOCkpIHtcblxuICAgICAgICBjaGFyQ29kZSA9IHN0ci5jaGFyQ29kZUF0KGkgKz0gMyAvIDQpO1xuXG4gICAgICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCInYnRvYScgZmFpbGVkOiBUaGUgc3RyaW5nIHRvIGJlIGVuY29kZWQgY29udGFpbnMgY2hhcmFjdGVycyBvdXRzaWRlIG9mIHRoZSBMYXRpbjEgcmFuZ2UuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIGF0b2IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBnbG9iYWwuYXRvYiA9IGZ1bmN0aW9uKGlucHV0ID0gJycpIHtcbiAgICAgIGxldCBzdHIgPSBpbnB1dC5yZXBsYWNlKC89KyQvLCAnJyk7XG4gICAgICBsZXQgb3V0cHV0ID0gJyc7XG5cbiAgICAgIGlmIChzdHIubGVuZ3RoICUgNCA9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIidhdG9iJyBmYWlsZWQ6IFRoZSBzdHJpbmcgdG8gYmUgZGVjb2RlZCBpcyBub3QgY29ycmVjdGx5IGVuY29kZWQuXCIpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgYmMgPSAwLCBicyA9IDAsIGJ1ZmZlciwgaSA9IDA7IGJ1ZmZlciA9IHN0ci5jaGFyQXQoaSsrKTtcblxuICAgICAgICB+YnVmZmVyICYmIChicyA9IGJjICUgNCA/IGJzICogNjQgKyBidWZmZXIgOiBidWZmZXIsXG4gICAgICAgICAgYmMrKyAlIDQpID8gb3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoMjU1ICYgYnMgPj4gKC0yICogYmMgJiA2KSkgOiAwXG4gICAgICApIHtcbiAgICAgICAgYnVmZmVyID0gY2hhcnMuaW5kZXhPZihidWZmZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIHdpbmRvdyA9PSAndW5kZWZpbmVkJykge1xuICAgIGdsb2JhbC53aW5kb3cgPSB7XG4gICAgICBXZWJTb2NrZXQ6IFdlYlNvY2tldFByb3ZpZGVyLFxuICAgICAgWE1MSHR0cFJlcXVlc3Q6IFhIUlByb3ZpZGVyLFxuICAgICAgVVJMOiB7XG4gICAgICAgIGNyZWF0ZU9iamVjdFVSTDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIHVzZSBVUkwuY3JlYXRlT2JqZWN0VVJMIGluIGEgbm9uLWJyb3dzZXIgYXBwbGljYXRpb25cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBDb25uZWN0aW9uLnNldE5ldHdvcmtQcm92aWRlcnMoV2ViU29ja2V0UHJvdmlkZXIsIFhIUlByb3ZpZGVyKTtcbiAgTGFyZ2VGaWxlSGVscGVyLnNldE5ldHdvcmtQcm92aWRlcihYSFJQcm92aWRlcik7XG59XG5cbi8vIERldGVjdCBmaW5kIG1vc3QgdXNlZnVsIG5ldHdvcmsgdHJhbnNwb3J0LlxuZnVuY3Rpb24gZGV0ZWN0VHJhbnNwb3J0KCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0Jykge1xuICAgIGlmICh3aW5kb3dbJ1dlYlNvY2tldCddKSB7XG4gICAgICByZXR1cm4gJ3dzJztcbiAgICB9IGVsc2UgaWYgKHdpbmRvd1snWE1MSHR0cFJlcXVlc3QnXSkge1xuICAgICAgLy8gVGhlIGJyb3dzZXIgb3Igbm9kZSBoYXMgbm8gd2Vic29ja2V0cywgdXNpbmcgbG9uZyBwb2xsaW5nLlxuICAgICAgcmV0dXJuICdscCc7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyBDaGVja3MgaWYgJ2QnIGlzIGEgdmFsaWQgbm9uLXplcm8gZGF0ZTtcbmZ1bmN0aW9uIGlzVmFsaWREYXRlKGQpIHtcbiAgcmV0dXJuIChkIGluc3RhbmNlb2YgRGF0ZSkgJiYgIWlzTmFOKGQpICYmIChkLmdldFRpbWUoKSAhPSAwKTtcbn1cblxuLy8gUkZDMzMzOSBmb3JtYXRlciBvZiBEYXRlXG5mdW5jdGlvbiByZmMzMzM5RGF0ZVN0cmluZyhkKSB7XG4gIGlmICghaXNWYWxpZERhdGUoZCkpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgcGFkID0gZnVuY3Rpb24odmFsLCBzcCkge1xuICAgIHNwID0gc3AgfHwgMjtcbiAgICByZXR1cm4gJzAnLnJlcGVhdChzcCAtICgnJyArIHZhbCkubGVuZ3RoKSArIHZhbDtcbiAgfTtcblxuICBjb25zdCBtaWxsaXMgPSBkLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICByZXR1cm4gZC5nZXRVVENGdWxsWWVhcigpICsgJy0nICsgcGFkKGQuZ2V0VVRDTW9udGgoKSArIDEpICsgJy0nICsgcGFkKGQuZ2V0VVRDRGF0ZSgpKSArXG4gICAgJ1QnICsgcGFkKGQuZ2V0VVRDSG91cnMoKSkgKyAnOicgKyBwYWQoZC5nZXRVVENNaW51dGVzKCkpICsgJzonICsgcGFkKGQuZ2V0VVRDU2Vjb25kcygpKSArXG4gICAgKG1pbGxpcyA/ICcuJyArIHBhZChtaWxsaXMsIDMpIDogJycpICsgJ1onO1xufVxuXG4vLyBidG9hIHJlcGxhY2VtZW50LiBTdG9jayBidG9hIGZhaWxzIG9uIG9uIG5vbi1MYXRpbjEgc3RyaW5ncy5cbmZ1bmN0aW9uIGI2NEVuY29kZVVuaWNvZGUoc3RyKSB7XG4gIC8vIFRoZSBlbmNvZGVVUklDb21wb25lbnQgcGVyY2VudC1lbmNvZGVzIFVURi04IHN0cmluZyxcbiAgLy8gdGhlbiB0aGUgcGVyY2VudCBlbmNvZGluZyBpcyBjb252ZXJ0ZWQgaW50byByYXcgYnl0ZXMgd2hpY2hcbiAgLy8gY2FuIGJlIGZlZCBpbnRvIGJ0b2EuXG4gIHJldHVybiBidG9hKGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoLyUoWzAtOUEtRl17Mn0pL2csXG4gICAgZnVuY3Rpb24gdG9Tb2xpZEJ5dGVzKG1hdGNoLCBwMSkge1xuICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoJzB4JyArIHAxKTtcbiAgICB9KSk7XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IG1lcmdlIHNyYydzIG93biBwcm9wZXJ0aWVzIHRvIGRzdC5cbi8vIElnbm9yZSBwcm9wZXJ0aWVzIHdoZXJlIGlnbm9yZVtwcm9wZXJ0eV0gaXMgdHJ1ZS5cbi8vIEFycmF5IGFuZCBEYXRlIG9iamVjdHMgYXJlIHNoYWxsb3ctY29waWVkLlxuZnVuY3Rpb24gbWVyZ2VPYmooZHN0LCBzcmMsIGlnbm9yZSkge1xuICBpZiAodHlwZW9mIHNyYyAhPSAnb2JqZWN0Jykge1xuICAgIGlmIChzcmMgPT09IFRpbm9kZS5ERUxfQ0hBUikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHNyYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZHN0O1xuICAgIH1cbiAgICByZXR1cm4gc3JjO1xuICB9XG4gIC8vIEpTIGlzIGNyYXp5OiB0eXBlb2YgbnVsbCBpcyAnb2JqZWN0Jy5cbiAgaWYgKHNyYyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBzcmM7XG4gIH1cblxuICAvLyBIYW5kbGUgRGF0ZVxuICBpZiAoc3JjIGluc3RhbmNlb2YgRGF0ZSAmJiAhaXNOYU4oc3JjKSkge1xuICAgIHJldHVybiAoIWRzdCB8fCAhKGRzdCBpbnN0YW5jZW9mIERhdGUpIHx8IGlzTmFOKGRzdCkgfHwgZHN0IDwgc3JjKSA/IHNyYyA6IGRzdDtcbiAgfVxuXG4gIC8vIEFjY2VzcyBtb2RlXG4gIGlmIChzcmMgaW5zdGFuY2VvZiBBY2Nlc3NNb2RlKSB7XG4gICAgcmV0dXJuIG5ldyBBY2Nlc3NNb2RlKHNyYyk7XG4gIH1cblxuICAvLyBIYW5kbGUgQXJyYXlcbiAgaWYgKHNyYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgcmV0dXJuIHNyYztcbiAgfVxuXG4gIGlmICghZHN0IHx8IGRzdCA9PT0gVGlub2RlLkRFTF9DSEFSKSB7XG4gICAgZHN0ID0gc3JjLmNvbnN0cnVjdG9yKCk7XG4gIH1cblxuICBmb3IgKGxldCBwcm9wIGluIHNyYykge1xuICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkocHJvcCkgJiZcbiAgICAgICghaWdub3JlIHx8ICFpZ25vcmVbcHJvcF0pICYmXG4gICAgICAocHJvcCAhPSAnX25vRm9yd2FyZGluZycpKSB7XG5cbiAgICAgIGRzdFtwcm9wXSA9IG1lcmdlT2JqKGRzdFtwcm9wXSwgc3JjW3Byb3BdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRzdDtcbn1cblxuLy8gVXBkYXRlIG9iamVjdCBzdG9yZWQgaW4gYSBjYWNoZS4gUmV0dXJucyB1cGRhdGVkIHZhbHVlLlxuZnVuY3Rpb24gbWVyZ2VUb0NhY2hlKGNhY2hlLCBrZXksIG5ld3ZhbCwgaWdub3JlKSB7XG4gIGNhY2hlW2tleV0gPSBtZXJnZU9iaihjYWNoZVtrZXldLCBuZXd2YWwsIGlnbm9yZSk7XG4gIHJldHVybiBjYWNoZVtrZXldO1xufVxuXG5mdW5jdGlvbiBzdHJpbmdUb0RhdGUob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqLmNyZWF0ZWQgPT0gJ3N0cmluZycpIHtcbiAgICBvYmouY3JlYXRlZCA9IG5ldyBEYXRlKG9iai5jcmVhdGVkKTtcbiAgfVxuICBpZiAodHlwZW9mIG9iai51cGRhdGVkID09ICdzdHJpbmcnKSB7XG4gICAgb2JqLnVwZGF0ZWQgPSBuZXcgRGF0ZShvYmoudXBkYXRlZCk7XG4gIH1cbiAgaWYgKHR5cGVvZiBvYmoudG91Y2hlZCA9PSAnc3RyaW5nJykge1xuICAgIG9iai50b3VjaGVkID0gbmV3IERhdGUob2JqLnRvdWNoZWQpO1xuICB9XG59XG5cbi8vIEpTT04gc3RyaW5naWZ5IGhlbHBlciAtIHByZS1wcm9jZXNzb3IgZm9yIEpTT04uc3RyaW5naWZ5XG5mdW5jdGlvbiBqc29uQnVpbGRIZWxwZXIoa2V5LCB2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAvLyBDb252ZXJ0IGphdmFzY3JpcHQgRGF0ZSBvYmplY3RzIHRvIHJmYzMzMzkgc3RyaW5nc1xuICAgIHZhbCA9IHJmYzMzMzlEYXRlU3RyaW5nKHZhbCk7XG4gIH0gZWxzZSBpZiAodmFsIGluc3RhbmNlb2YgQWNjZXNzTW9kZSkge1xuICAgIHZhbCA9IHZhbC5qc29uSGVscGVyKCk7XG4gIH0gZWxzZSBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsIHx8IHZhbCA9PT0gZmFsc2UgfHxcbiAgICAoQXJyYXkuaXNBcnJheSh2YWwpICYmIHZhbC5sZW5ndGggPT0gMCkgfHxcbiAgICAoKHR5cGVvZiB2YWwgPT0gJ29iamVjdCcpICYmIChPYmplY3Qua2V5cyh2YWwpLmxlbmd0aCA9PSAwKSkpIHtcbiAgICAvLyBzdHJpcCBvdXQgZW1wdHkgZWxlbWVudHMgd2hpbGUgc2VyaWFsaXppbmcgb2JqZWN0cyB0byBKU09OXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB2YWw7XG59O1xuXG4vLyBTdHJpcHMgYWxsIHZhbHVlcyBmcm9tIGFuIG9iamVjdCBvZiB0aGV5IGV2YWx1YXRlIHRvIGZhbHNlIG9yIGlmIHRoZWlyIG5hbWUgc3RhcnRzIHdpdGggJ18nLlxuLy8gVXNlZCBvbiBhbGwgb3V0Z29pbmcgb2JqZWN0IGJlZm9yZSBzZXJpYWxpemF0aW9uIHRvIHN0cmluZy5cbmZ1bmN0aW9uIHNpbXBsaWZ5KG9iaikge1xuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGlmIChrZXlbMF0gPT0gJ18nKSB7XG4gICAgICAvLyBTdHJpcCBmaWVsZHMgbGlrZSBcIm9iai5fa2V5XCIuXG4gICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgfSBlbHNlIGlmICghb2JqW2tleV0pIHtcbiAgICAgIC8vIFN0cmlwIGZpZWxkcyB3aGljaCBldmFsdWF0ZSB0byBmYWxzZS5cbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkob2JqW2tleV0pICYmIG9ialtrZXldLmxlbmd0aCA9PSAwKSB7XG4gICAgICAvLyBTdHJpcCBlbXB0eSBhcnJheXMuXG4gICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgfSBlbHNlIGlmICghb2JqW2tleV0pIHtcbiAgICAgIC8vIFN0cmlwIGZpZWxkcyB3aGljaCBldmFsdWF0ZSB0byBmYWxzZS5cbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICB9IGVsc2UgaWYgKG9ialtrZXldIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgLy8gU3RyaXAgaW52YWxpZCBvciB6ZXJvIGRhdGUuXG4gICAgICBpZiAoIWlzVmFsaWREYXRlKG9ialtrZXldKSkge1xuICAgICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqW2tleV0gPT0gJ29iamVjdCcpIHtcbiAgICAgIHNpbXBsaWZ5KG9ialtrZXldKTtcbiAgICAgIC8vIFN0cmlwIGVtcHR5IG9iamVjdHMuXG4gICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqW2tleV0pLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufTtcblxuLy8gVHJpbSB3aGl0ZXNwYWNlLCBzdHJpcCBlbXB0eSBhbmQgZHVwbGljYXRlIGVsZW1lbnRzIGVsZW1lbnRzLlxuLy8gSWYgdGhlIHJlc3VsdCBpcyBhbiBlbXB0eSBhcnJheSwgYWRkIGEgc2luZ2xlIGVsZW1lbnQgXCJcXHUyNDIxXCIgKFVuaWNvZGUgRGVsIGNoYXJhY3RlcikuXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShhcnIpIHtcbiAgbGV0IG91dCA9IFtdO1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgLy8gVHJpbSwgdGhyb3cgYXdheSB2ZXJ5IHNob3J0IGFuZCBlbXB0eSB0YWdzLlxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gYXJyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGV0IHQgPSBhcnJbaV07XG4gICAgICBpZiAodCkge1xuICAgICAgICB0ID0gdC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKHQubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG91dC5wdXNoKHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIG91dC5zb3J0KCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0sIHBvcywgYXJ5KSB7XG4gICAgICByZXR1cm4gIXBvcyB8fCBpdGVtICE9IGFyeVtwb3MgLSAxXTtcbiAgICB9KTtcbiAgfVxuICBpZiAob3V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgLy8gQWRkIHNpbmdsZSB0YWcgd2l0aCBhIFVuaWNvZGUgRGVsIGNoYXJhY3Rlciwgb3RoZXJ3aXNlIGFuIGFtcHR5IGFycmF5XG4gICAgLy8gaXMgYW1iaWd1b3MuIFRoZSBEZWwgdGFnIHdpbGwgYmUgc3RyaXBwZWQgYnkgdGhlIHNlcnZlci5cbiAgICBvdXQucHVzaChUaW5vZGUuREVMX0NIQVIpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIEF0dGVtcHQgdG8gY29udmVydCBkYXRlIHN0cmluZ3MgdG8gb2JqZWN0cy5cbmZ1bmN0aW9uIGpzb25QYXJzZUhlbHBlcihrZXksIHZhbCkge1xuICAvLyBDb252ZXJ0IHN0cmluZyB0aW1lc3RhbXBzIHdpdGggb3B0aW9uYWwgbWlsbGlzZWNvbmRzIHRvIERhdGVcbiAgLy8gMjAxNS0wOS0wMlQwMTo0NTo0M1suMTIzXVpcbiAgaWYgKGtleSA9PT0gJ3RzJyAmJiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyAmJlxuICAgIHZhbC5sZW5ndGggPj0gMjAgJiYgdmFsLmxlbmd0aCA8PSAyNCkge1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh2YWwpO1xuICAgIGlmICghaXNOYU4oZGF0ZSkpIHtcbiAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cbiAgfSBlbHNlIGlmIChrZXkgPT09ICdhY3MnICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG5ldyBBY2Nlc3NNb2RlKHZhbCk7XG4gIH1cbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8vIFRyaW1zIHZlcnkgbG9uZyBzdHJpbmdzIChlbmNvZGVkIGltYWdlcykgdG8gbWFrZSBsb2dnZWQgcGFja2V0cyBtb3JlIHJlYWRhYmxlLlxuZnVuY3Rpb24ganNvbkxvZ2dlckhlbHBlcihrZXksIHZhbCkge1xuICBpZiAodHlwZW9mIHZhbCA9PSAnc3RyaW5nJyAmJiB2YWwubGVuZ3RoID4gMTI4KSB7XG4gICAgcmV0dXJuICc8JyArIHZhbC5sZW5ndGggKyAnLCBieXRlczogJyArIHZhbC5zdWJzdHJpbmcoMCwgMTIpICsgJy4uLicgKyB2YWwuc3Vic3RyaW5nKHZhbC5sZW5ndGggLSAxMikgKyAnPic7XG4gIH1cbiAgcmV0dXJuIGpzb25CdWlsZEhlbHBlcihrZXksIHZhbCk7XG59O1xuXG4vLyBQYXJzZSBicm93c2VyIHVzZXIgYWdlbnQgdG8gZXh0cmFjdCBicm93c2VyIG5hbWUgYW5kIHZlcnNpb24uXG5mdW5jdGlvbiBnZXRCcm93c2VySW5mbyh1YSwgcHJvZHVjdCkge1xuICB1YSA9IHVhIHx8ICcnO1xuICBsZXQgcmVhY3RuYXRpdmUgPSAnJztcbiAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIFJlYWN0TmF0aXZlIGFwcC5cbiAgaWYgKC9yZWFjdG5hdGl2ZS9pLnRlc3QocHJvZHVjdCkpIHtcbiAgICByZWFjdG5hdGl2ZSA9ICdSZWFjdE5hdGl2ZTsgJztcbiAgfVxuICBsZXQgcmVzdWx0O1xuICAvLyBSZW1vdmUgdXNlbGVzcyBzdHJpbmcuXG4gIHVhID0gdWEucmVwbGFjZSgnIChLSFRNTCwgbGlrZSBHZWNrbyknLCAnJyk7XG4gIC8vIFRlc3QgZm9yIFdlYktpdC1iYXNlZCBicm93c2VyLlxuICBsZXQgbSA9IHVhLm1hdGNoKC8oQXBwbGVXZWJLaXRcXC9bLlxcZF0rKS9pKTtcbiAgaWYgKG0pIHtcbiAgICAvLyBMaXN0IG9mIGNvbW1vbiBzdHJpbmdzLCBmcm9tIG1vcmUgdXNlZnVsIHRvIGxlc3MgdXNlZnVsLlxuICAgIC8vIEFsbCB1bmtub3duIHN0cmluZ3MgZ2V0IHRoZSBoaWdoZXN0ICgtMSkgcHJpb3JpdHkuXG4gICAgY29uc3QgcHJpb3JpdHkgPSBbJ2VkZycsICdjaHJvbWUnLCAnc2FmYXJpJywgJ21vYmlsZScsICd2ZXJzaW9uJ107XG4gICAgbGV0IHRtcCA9IHVhLnN1YnN0cihtLmluZGV4ICsgbVswXS5sZW5ndGgpLnNwbGl0KCcgJyk7XG4gICAgbGV0IHRva2VucyA9IFtdO1xuICAgIGxldCB2ZXJzaW9uOyAvLyAxLjAgaW4gVmVyc2lvbi8xLjAgb3IgdW5kZWZpbmVkO1xuICAgIC8vIFNwbGl0IHN0cmluZyBsaWtlICdOYW1lLzAuMC4wJyBpbnRvIFsnTmFtZScsICcwLjAuMCcsIDNdIHdoZXJlIHRoZSBsYXN0IGVsZW1lbnQgaXMgdGhlIHByaW9yaXR5LlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgbTIgPSAvKFtcXHcuXSspW1xcL10oW1xcLlxcZF0rKS8uZXhlYyh0bXBbaV0pO1xuICAgICAgaWYgKG0yKSB7XG4gICAgICAgIC8vIFVua25vd24gdmFsdWVzIGFyZSBoaWdoZXN0IHByaW9yaXR5ICgtMSkuXG4gICAgICAgIHRva2Vucy5wdXNoKFttMlsxXSwgbTJbMl0sIHByaW9yaXR5LmZpbmRJbmRleCgoZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBtMlsxXS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoZSk7XG4gICAgICAgIH0pXSk7XG4gICAgICAgIGlmIChtMlsxXSA9PSAnVmVyc2lvbicpIHtcbiAgICAgICAgICB2ZXJzaW9uID0gbTJbMl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gU29ydCBieSBwcmlvcml0eTogbW9yZSBpbnRlcmVzdGluZyBpcyBlYXJsaWVyIHRoYW4gbGVzcyBpbnRlcmVzdGluZy5cbiAgICB0b2tlbnMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgcmV0dXJuIGFbMl0gLSBiWzJdO1xuICAgIH0pO1xuICAgIGlmICh0b2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gUmV0dXJuIHRoZSBsZWFzdCBjb21tb24gYnJvd3NlciBzdHJpbmcgYW5kIHZlcnNpb24uXG4gICAgICBpZiAodG9rZW5zWzBdWzBdLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWRnJykpIHtcbiAgICAgICAgdG9rZW5zWzBdWzBdID0gJ0VkZ2UnO1xuICAgICAgfSBlbHNlIGlmICh0b2tlbnNbMF1bMF0gPT0gJ09QUicpIHtcbiAgICAgICAgdG9rZW5zWzBdWzBdID0gJ09wZXJhJztcbiAgICAgIH0gZWxzZSBpZiAodG9rZW5zWzBdWzBdID09ICdTYWZhcmknICYmIHZlcnNpb24pIHtcbiAgICAgICAgdG9rZW5zWzBdWzFdID0gdmVyc2lvbjtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IHRva2Vuc1swXVswXSArICcvJyArIHRva2Vuc1swXVsxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFpbGVkIHRvIElEIHRoZSBicm93c2VyLiBSZXR1cm4gdGhlIHdlYmtpdCB2ZXJzaW9uLlxuICAgICAgcmVzdWx0ID0gbVsxXTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoL2ZpcmVmb3gvaS50ZXN0KHVhKSkge1xuICAgIG0gPSAvRmlyZWZveFxcLyhbLlxcZF0rKS9nLmV4ZWModWEpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXN1bHQgPSAnRmlyZWZveC8nICsgbVsxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gJ0ZpcmVmb3gvPyc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIE5laXRoZXIgQXBwbGVXZWJLaXQgbm9yIEZpcmVmb3guIFRyeSB0aGUgbGFzdCByZXNvcnQuXG4gICAgbSA9IC8oW1xcdy5dKylcXC8oWy5cXGRdKykvLmV4ZWModWEpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXN1bHQgPSBtWzFdICsgJy8nICsgbVsyXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHVhLnNwbGl0KCcgJyk7XG4gICAgICByZXN1bHQgPSBtWzBdO1xuICAgIH1cbiAgfVxuXG4gIC8vIFNob3J0ZW4gdGhlIHZlcnNpb24gdG8gb25lIGRvdCAnYS5iYi5jY2MuZCAtPiBhLmJiJyBhdCBtb3N0LlxuICBtID0gcmVzdWx0LnNwbGl0KCcvJyk7XG4gIGlmIChtLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCB2ID0gbVsxXS5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1pbm9yID0gdlsxXSA/ICcuJyArIHZbMV0uc3Vic3RyKDAsIDIpIDogJyc7XG4gICAgcmVzdWx0ID0gYCR7bVswXX0vJHt2WzBdfSR7bWlub3J9YDtcbiAgfVxuICByZXR1cm4gcmVhY3RuYXRpdmUgKyByZXN1bHQ7XG59XG5cbi8qKlxuICogQGNsYXNzIFRpbm9kZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBjb25maWd1cmF0aW9uIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmFwcE5hbWUgLSBOYW1lIG9mIHRoZSBjYWxsaW5nIGFwcGxpY2F0aW9uIHRvIGJlIHJlcG9ydGVkIGluIHRoZSBVc2VyIEFnZW50LlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5ob3N0IC0gSG9zdCBuYW1lIGFuZCBvcHRpb25hbCBwb3J0IG51bWJlciB0byBjb25uZWN0IHRvLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5hcGlLZXkgLSBBUEkga2V5IGdlbmVyYXRlZCBieSA8Y29kZT5rZXlnZW48L2NvZGU+LlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy50cmFuc3BvcnQgLSBTZWUge0BsaW5rIFRpbm9kZS5Db25uZWN0aW9uI3RyYW5zcG9ydH0uXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGNvbmZpZy5zZWN1cmUgLSBVc2UgU2VjdXJlIFdlYlNvY2tldCBpZiA8Y29kZT50cnVlPC9jb2RlPi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucGxhdGZvcm0gLSBPcHRpb25hbCBwbGF0Zm9ybSBpZGVudGlmaWVyLCBvbmUgb2YgPGNvZGU+XCJpb3NcIjwvY29kZT4sIDxjb2RlPlwid2ViXCI8L2NvZGU+LCA8Y29kZT5cImFuZHJvaWRcIjwvY29kZT4uXG4gKiBAcGFyYW0ge2Jvb2xlbn0gY29uZmlnLnBlcnNpc3QgLSBVc2UgSW5kZXhlZERCIHBlcnNpc3RlbnQgc3RvcmFnZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGxldGUgLSBjYWxsYmFjayB0byBjYWxsIHdoZW4gaW5pdGlhbGl6YXRpb24gaXMgY29tcGxldGVkLlxuICovXG52YXIgVGlub2RlID0gZnVuY3Rpb24oY29uZmlnLCBvbkNvbXBsZXRlKSB7XG4gIHRoaXMuX2hvc3QgPSBjb25maWcuaG9zdDtcbiAgdGhpcy5fc2VjdXJlID0gY29uZmlnLnNlY3VyZTtcblxuICAvLyBDbGllbnQtcHJvdmlkZWQgYXBwbGljYXRpb24gbmFtZSwgZm9ybWF0IDxOYW1lPi88dmVyc2lvbiBudW1iZXI+XG4gIHRoaXMuX2FwcE5hbWUgPSBjb25maWcuYXBwTmFtZSB8fCBcIlVuZGVmaW5lZFwiO1xuXG4gIC8vIEFQSSBLZXkuXG4gIHRoaXMuX2FwaUtleSA9IGNvbmZpZy5hcGlLZXk7XG5cbiAgLy8gTmFtZSBhbmQgdmVyc2lvbiBvZiB0aGUgYnJvd3Nlci5cbiAgdGhpcy5fYnJvd3NlciA9ICcnO1xuICB0aGlzLl9wbGF0Zm9ybSA9IGNvbmZpZy5wbGF0Zm9ybSB8fCAnd2ViJztcbiAgLy8gSGFyZHdhcmVcbiAgdGhpcy5faHdvcyA9ICd1bmRlZmluZWQnO1xuICB0aGlzLl9odW1hbkxhbmd1YWdlID0gJ3h4JztcbiAgLy8gVW5kZXJseWluZyBPUy5cbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLl9icm93c2VyID0gZ2V0QnJvd3NlckluZm8obmF2aWdhdG9yLnVzZXJBZ2VudCwgbmF2aWdhdG9yLnByb2R1Y3QpO1xuICAgIHRoaXMuX2h3b3MgPSBuYXZpZ2F0b3IucGxhdGZvcm07XG4gICAgLy8gVGhpcyBpcyB0aGUgZGVmYXVsdCBsYW5ndWFnZS4gSXQgY291bGQgYmUgY2hhbmdlZCBieSBjbGllbnQuXG4gICAgdGhpcy5faHVtYW5MYW5ndWFnZSA9IG5hdmlnYXRvci5sYW5ndWFnZSB8fCAnZW4tVVMnO1xuICB9XG4gIC8vIExvZ2dpbmcgdG8gY29uc29sZSBlbmFibGVkXG4gIHRoaXMuX2xvZ2dpbmdFbmFibGVkID0gZmFsc2U7XG4gIC8vIFdoZW4gbG9nZ2luZywgdHJpcCBsb25nIHN0cmluZ3MgKGJhc2U2NC1lbmNvZGVkIGltYWdlcykgZm9yIHJlYWRhYmlsaXR5XG4gIHRoaXMuX3RyaW1Mb25nU3RyaW5ncyA9IGZhbHNlO1xuICAvLyBVSUQgb2YgdGhlIGN1cnJlbnRseSBhdXRoZW50aWNhdGVkIHVzZXIuXG4gIHRoaXMuX215VUlEID0gbnVsbDtcbiAgLy8gU3RhdHVzIG9mIGNvbm5lY3Rpb246IGF1dGhlbnRpY2F0ZWQgb3Igbm90LlxuICB0aGlzLl9hdXRoZW50aWNhdGVkID0gZmFsc2U7XG4gIC8vIExvZ2luIHVzZWQgaW4gdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBiYXNpYyBhdXRoZW50aWNhdGlvblxuICB0aGlzLl9sb2dpbiA9IG51bGw7XG4gIC8vIFRva2VuIHdoaWNoIGNhbiBiZSB1c2VkIGZvciBsb2dpbiBpbnN0ZWFkIG9mIGxvZ2luL3Bhc3N3b3JkLlxuICB0aGlzLl9hdXRoVG9rZW4gPSBudWxsO1xuICAvLyBDb3VudGVyIG9mIHJlY2VpdmVkIHBhY2tldHNcbiAgdGhpcy5faW5QYWNrZXRDb3VudCA9IDA7XG4gIC8vIENvdW50ZXIgZm9yIGdlbmVyYXRpbmcgdW5pcXVlIG1lc3NhZ2UgSURzXG4gIHRoaXMuX21lc3NhZ2VJZCA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiAweEZGRkYpICsgMHhGRkZGKTtcbiAgLy8gSW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlcnZlciwgaWYgY29ubmVjdGVkXG4gIHRoaXMuX3NlcnZlckluZm8gPSBudWxsO1xuICAvLyBQdXNoIG5vdGlmaWNhdGlvbiB0b2tlbi4gQ2FsbGVkIGRldmljZVRva2VuIGZvciBjb25zaXN0ZW5jeSB3aXRoIHRoZSBBbmRyb2lkIFNESy5cbiAgdGhpcy5fZGV2aWNlVG9rZW4gPSBudWxsO1xuXG4gIC8vIENhY2hlIG9mIHBlbmRpbmcgcHJvbWlzZXMgYnkgbWVzc2FnZSBpZC5cbiAgdGhpcy5fcGVuZGluZ1Byb21pc2VzID0ge307XG4gIC8vIFRoZSBUaW1lb3V0IG9iamVjdCByZXR1cm5lZCBieSB0aGUgcmVqZWN0IGV4cGlyZWQgcHJvbWlzZXMgc2V0SW50ZXJ2YWwuXG4gIHRoaXMuX2V4cGlyZVByb21pc2VzID0gbnVsbDtcblxuICAvLyBDb25zb2xlIGxvZ2dlci4gQmFiZWwgc29tZWhvdyBmYWlscyB0byBwYXJzZSAnLi4ucmVzdCcgcGFyYW1ldGVyLlxuICB0aGlzLmxvZ2dlciA9IChzdHIsIC4uLmFyZ3MpID0+IHtcbiAgICBpZiAodGhpcy5fbG9nZ2luZ0VuYWJsZWQpIHtcbiAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSgpXG4gICAgICBjb25zdCBkYXRlU3RyaW5nID0gKCcwJyArIGQuZ2V0VVRDSG91cnMoKSkuc2xpY2UoLTIpICsgJzonICtcbiAgICAgICAgKCcwJyArIGQuZ2V0VVRDTWludXRlcygpKS5zbGljZSgtMikgKyAnOicgK1xuICAgICAgICAoJzAnICsgZC5nZXRVVENTZWNvbmRzKCkpLnNsaWNlKC0yKSArICcuJyArXG4gICAgICAgICgnMDAnICsgZC5nZXRVVENNaWxsaXNlY29uZHMoKSkuc2xpY2UoLTMpO1xuXG4gICAgICBjb25zb2xlLmxvZygnWycgKyBkYXRlU3RyaW5nICsgJ10nLCBzdHIsIGFyZ3Muam9pbignICcpKTtcbiAgICB9XG4gIH1cblxuICBDb25uZWN0aW9uLmxvZ2dlciA9IHRoaXMubG9nZ2VyO1xuICBEcmFmdHkubG9nZ2VyID0gdGhpcy5sb2dnZXI7XG5cbiAgLy8gV2ViU29ja2V0IG9yIGxvbmcgcG9sbGluZyBuZXR3b3JrIGNvbm5lY3Rpb24uXG4gIGlmIChjb25maWcudHJhbnNwb3J0ICE9ICdscCcgJiYgY29uZmlnLnRyYW5zcG9ydCAhPSAnd3MnKSB7XG4gICAgY29uZmlnLnRyYW5zcG9ydCA9IGRldGVjdFRyYW5zcG9ydCgpO1xuICB9XG4gIHRoaXMuX2Nvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihjb25maWcsIFBST1RPQ09MX1ZFUlNJT04sIC8qIGF1dG9yZWNvbm5lY3QgKi8gdHJ1ZSk7XG5cbiAgLy8gVGlub2RlJ3MgY2FjaGUgb2Ygb2JqZWN0c1xuICB0aGlzLl9jYWNoZSA9IHt9O1xuXG4gIGNvbnN0IGNhY2hlUHV0ID0gdGhpcy5jYWNoZVB1dCA9ICh0eXBlLCBuYW1lLCBvYmopID0+IHtcbiAgICB0aGlzLl9jYWNoZVt0eXBlICsgJzonICsgbmFtZV0gPSBvYmo7XG4gIH1cblxuICBjb25zdCBjYWNoZUdldCA9IHRoaXMuY2FjaGVHZXQgPSAodHlwZSwgbmFtZSkgPT4ge1xuICAgIHJldHVybiB0aGlzLl9jYWNoZVt0eXBlICsgJzonICsgbmFtZV07XG4gIH1cblxuICBjb25zdCBjYWNoZURlbCA9IHRoaXMuY2FjaGVEZWwgPSAodHlwZSwgbmFtZSkgPT4ge1xuICAgIGRlbGV0ZSB0aGlzLl9jYWNoZVt0eXBlICsgJzonICsgbmFtZV07XG4gIH1cbiAgLy8gRW51bWVyYXRlIGFsbCBpdGVtcyBpbiBjYWNoZSwgY2FsbCBmdW5jIGZvciBlYWNoIGl0ZW0uXG4gIC8vIEVudW1lcmF0aW9uIHN0b3BzIGlmIGZ1bmMgcmV0dXJucyB0cnVlLlxuICBjb25zdCBjYWNoZU1hcCA9IHRoaXMuY2FjaGVNYXAgPSAodHlwZSwgZnVuYywgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGtleSA9IHR5cGUgPyB0eXBlICsgJzonIDogdW5kZWZpbmVkO1xuICAgIGZvciAobGV0IGlkeCBpbiB0aGlzLl9jYWNoZSkge1xuICAgICAgaWYgKCFrZXkgfHwgaWR4LmluZGV4T2Yoa2V5KSA9PSAwKSB7XG4gICAgICAgIGlmIChmdW5jLmNhbGwoY29udGV4dCwgdGhpcy5fY2FjaGVbaWR4XSwgaWR4KSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTWFrZSBsaW1pdGVkIGNhY2hlIG1hbmFnZW1lbnQgYXZhaWxhYmxlIHRvIHRvcGljLlxuICAvLyBDYWNoaW5nIHVzZXIucHVibGljIG9ubHkuIEV2ZXJ5dGhpbmcgZWxzZSBpcyBwZXItdG9waWMuXG4gIHRoaXMuYXR0YWNoQ2FjaGVUb1RvcGljID0gKHRvcGljKSA9PiB7XG4gICAgdG9waWMuX3Rpbm9kZSA9IHRoaXM7XG5cbiAgICB0b3BpYy5fY2FjaGVHZXRVc2VyID0gKHVpZCkgPT4ge1xuICAgICAgY29uc3QgcHViID0gY2FjaGVHZXQoJ3VzZXInLCB1aWQpO1xuICAgICAgaWYgKHB1Yikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXI6IHVpZCxcbiAgICAgICAgICBwdWJsaWM6IG1lcmdlT2JqKHt9LCBwdWIpXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgdG9waWMuX2NhY2hlUHV0VXNlciA9ICh1aWQsIHVzZXIpID0+IHtcbiAgICAgIHJldHVybiBjYWNoZVB1dCgndXNlcicsIHVpZCwgbWVyZ2VPYmooe30sIHVzZXIucHVibGljKSk7XG4gICAgfTtcbiAgICB0b3BpYy5fY2FjaGVEZWxVc2VyID0gKHVpZCkgPT4ge1xuICAgICAgcmV0dXJuIGNhY2hlRGVsKCd1c2VyJywgdWlkKTtcbiAgICB9O1xuICAgIHRvcGljLl9jYWNoZVB1dFNlbGYgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gY2FjaGVQdXQoJ3RvcGljJywgdG9waWMubmFtZSwgdG9waWMpO1xuICAgIH1cbiAgICB0b3BpYy5fY2FjaGVEZWxTZWxmID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIGNhY2hlRGVsKCd0b3BpYycsIHRvcGljLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVzZSBpbmRleERCIGZvciBjYWNoaW5nIHRvcGljcyBhbmQgbWVzc2FnZXMuXG4gIHRoaXMuX3BlcnNpc3QgPSBjb25maWcucGVyc2lzdDtcbiAgLy8gSW5pdGlhbGl6ZSBvYmplY3QgcmVnYXJkbGVzcy4gSXQgc2ltcGxpZmllcyB0aGUgY29kZS5cbiAgdGhpcy5fZGIgPSBEQkNhY2hlKChlcnIpID0+IHtcbiAgICB0aGlzLmxvZ2dlcihcIkRCXCIsIGVycik7XG4gIH0sIHRoaXMubG9nZ2VyKTtcblxuICBpZiAodGhpcy5fcGVyc2lzdCkge1xuICAgIC8vIENyZWF0ZSB0aGUgcGVyc2lzdGVudCBjYWNoZS5cbiAgICAvLyBTdG9yZSBwcm9taXNlcyB0byBiZSByZXNvbHZlZCB3aGVuIG1lc3NhZ2VzIGxvYWQgaW50byBtZW1vcnkuXG4gICAgY29uc3QgbXNncyA9IFtdO1xuICAgIHRoaXMuX2RiLmluaXREYXRhYmFzZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgLy8gRmlyc3QgbG9hZCB0b3BpY3MgaW50byBtZW1vcnkuXG4gICAgICByZXR1cm4gdGhpcy5fZGIubWFwVG9waWNzKChkYXRhKSA9PiB7XG4gICAgICAgIGxldCB0b3BpYyA9IHRoaXMuY2FjaGVHZXQoJ3RvcGljJywgZGF0YS5uYW1lKTtcbiAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLm5hbWUgPT0gVE9QSUNfTUUpIHtcbiAgICAgICAgICB0b3BpYyA9IG5ldyBUb3BpY01lKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5uYW1lID09IFRPUElDX0ZORCkge1xuICAgICAgICAgIHRvcGljID0gbmV3IFRvcGljRm5kKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9waWMgPSBuZXcgVG9waWMoZGF0YS5uYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2RiLmRlc2VyaWFsaXplVG9waWModG9waWMsIGRhdGEpO1xuICAgICAgICB0aGlzLmF0dGFjaENhY2hlVG9Ub3BpYyh0b3BpYyk7XG4gICAgICAgIHRvcGljLl9jYWNoZVB1dFNlbGYoKTtcbiAgICAgICAgLy8gUmVxdWVzdCB0byBsb2FkIG1lc3NhZ2VzIGFuZCBzYXZlIHRoZSBwcm9taXNlLlxuICAgICAgICBtc2dzLnB1c2godG9waWMuX2xvYWRNZXNzYWdlcyh0aGlzLl9kYikpO1xuICAgICAgfSk7XG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAvLyBUaGVuIGxvYWQgdXNlcnMuXG4gICAgICByZXR1cm4gdGhpcy5fZGIubWFwVXNlcnMoKGRhdGEpID0+IHtcbiAgICAgICAgcmV0dXJuIGNhY2hlUHV0KCd1c2VyJywgZGF0YS51aWQsIG1lcmdlT2JqKHt9LCBkYXRhLnB1YmxpYykpO1xuICAgICAgfSk7XG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAvLyBOb3cgd2FpdCBmb3IgYWxsIG1lc3NhZ2VzIHRvIGZpbmlzaCBsb2FkaW5nLlxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKG1zZ3MpO1xuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgaWYgKG9uQ29tcGxldGUpIHtcbiAgICAgICAgb25Db21wbGV0ZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2dnZXIoXCJQZXJzaXN0ZW50IGNhY2hlIGluaXRpYWxpemVkLlwiKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9kYi5kZWxldGVEYXRhYmFzZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgaWYgKG9uQ29tcGxldGUpIHtcbiAgICAgICAgb25Db21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gUmVzb2x2ZSBvciByZWplY3QgYSBwZW5kaW5nIHByb21pc2UuXG4gIC8vIFVucmVzb2x2ZWQgcHJvbWlzZXMgYXJlIHN0b3JlZCBpbiBfcGVuZGluZ1Byb21pc2VzLlxuICBjb25zdCBleGVjUHJvbWlzZSA9IChpZCwgY29kZSwgb25PSywgZXJyb3JUZXh0KSA9PiB7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gdGhpcy5fcGVuZGluZ1Byb21pc2VzW2lkXTtcbiAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICBkZWxldGUgdGhpcy5fcGVuZGluZ1Byb21pc2VzW2lkXTtcbiAgICAgIGlmIChjb2RlID49IDIwMCAmJiBjb2RlIDwgNDAwKSB7XG4gICAgICAgIGlmIChjYWxsYmFja3MucmVzb2x2ZSkge1xuICAgICAgICAgIGNhbGxiYWNrcy5yZXNvbHZlKG9uT0spO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrcy5yZWplY3QpIHtcbiAgICAgICAgY2FsbGJhY2tzLnJlamVjdChuZXcgRXJyb3IoYCR7ZXJyb3JUZXh0fSAoJHtjb2RlfSlgKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gR2VuZXJhdG9yIG9mIGRlZmF1bHQgcHJvbWlzZXMgZm9yIHNlbnQgcGFja2V0cy5cbiAgY29uc3QgbWFrZVByb21pc2UgPSAoaWQpID0+IHtcbiAgICBsZXQgcHJvbWlzZSA9IG51bGw7XG4gICAgaWYgKGlkKSB7XG4gICAgICBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAvLyBTdG9yZWQgY2FsbGJhY2tzIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIHJlc3BvbnNlIHBhY2tldCB3aXRoIHRoaXMgSWQgYXJyaXZlc1xuICAgICAgICB0aGlzLl9wZW5kaW5nUHJvbWlzZXNbaWRdID0ge1xuICAgICAgICAgICdyZXNvbHZlJzogcmVzb2x2ZSxcbiAgICAgICAgICAncmVqZWN0JzogcmVqZWN0LFxuICAgICAgICAgICd0cyc6IG5ldyBEYXRlKClcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgLy8gR2VuZXJhdGVzIHVuaXF1ZSBtZXNzYWdlIElEc1xuICBjb25zdCBnZXROZXh0VW5pcXVlSWQgPSB0aGlzLmdldE5leHRVbmlxdWVJZCA9ICgpID0+IHtcbiAgICByZXR1cm4gKHRoaXMuX21lc3NhZ2VJZCAhPSAwKSA/ICcnICsgdGhpcy5fbWVzc2FnZUlkKysgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBHZXQgVXNlciBBZ2VudCBzdHJpbmdcbiAgY29uc3QgZ2V0VXNlckFnZW50ID0gKCkgPT4ge1xuICAgIHJldHVybiB0aGlzLl9hcHBOYW1lICsgJyAoJyArICh0aGlzLl9icm93c2VyID8gdGhpcy5fYnJvd3NlciArICc7ICcgOiAnJykgKyB0aGlzLl9od29zICsgJyk7ICcgKyBMSUJSQVJZO1xuICB9XG5cbiAgLy8gR2VuZXJhdG9yIG9mIHBhY2tldHMgc3R1YnNcbiAgdGhpcy5pbml0UGFja2V0ID0gKHR5cGUsIHRvcGljKSA9PiB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdoaSc6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgJ2hpJzoge1xuICAgICAgICAgICAgJ2lkJzogZ2V0TmV4dFVuaXF1ZUlkKCksXG4gICAgICAgICAgICAndmVyJzogVkVSU0lPTixcbiAgICAgICAgICAgICd1YSc6IGdldFVzZXJBZ2VudCgpLFxuICAgICAgICAgICAgJ2Rldic6IHRoaXMuX2RldmljZVRva2VuLFxuICAgICAgICAgICAgJ2xhbmcnOiB0aGlzLl9odW1hbkxhbmd1YWdlLFxuICAgICAgICAgICAgJ3BsYXRmJzogdGhpcy5fcGxhdGZvcm1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ2FjYyc6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgJ2FjYyc6IHtcbiAgICAgICAgICAgICdpZCc6IGdldE5leHRVbmlxdWVJZCgpLFxuICAgICAgICAgICAgJ3VzZXInOiBudWxsLFxuICAgICAgICAgICAgJ3NjaGVtZSc6IG51bGwsXG4gICAgICAgICAgICAnc2VjcmV0JzogbnVsbCxcbiAgICAgICAgICAgICdsb2dpbic6IGZhbHNlLFxuICAgICAgICAgICAgJ3RhZ3MnOiBudWxsLFxuICAgICAgICAgICAgJ2Rlc2MnOiB7fSxcbiAgICAgICAgICAgICdjcmVkJzoge31cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ2xvZ2luJzpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAnbG9naW4nOiB7XG4gICAgICAgICAgICAnaWQnOiBnZXROZXh0VW5pcXVlSWQoKSxcbiAgICAgICAgICAgICdzY2hlbWUnOiBudWxsLFxuICAgICAgICAgICAgJ3NlY3JldCc6IG51bGxcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ3N1Yic6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgJ3N1Yic6IHtcbiAgICAgICAgICAgICdpZCc6IGdldE5leHRVbmlxdWVJZCgpLFxuICAgICAgICAgICAgJ3RvcGljJzogdG9waWMsXG4gICAgICAgICAgICAnc2V0Jzoge30sXG4gICAgICAgICAgICAnZ2V0Jzoge31cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ2xlYXZlJzpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAnbGVhdmUnOiB7XG4gICAgICAgICAgICAnaWQnOiBnZXROZXh0VW5pcXVlSWQoKSxcbiAgICAgICAgICAgICd0b3BpYyc6IHRvcGljLFxuICAgICAgICAgICAgJ3Vuc3ViJzogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ3B1Yic6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgJ3B1Yic6IHtcbiAgICAgICAgICAgICdpZCc6IGdldE5leHRVbmlxdWVJZCgpLFxuICAgICAgICAgICAgJ3RvcGljJzogdG9waWMsXG4gICAgICAgICAgICAnbm9lY2hvJzogZmFsc2UsXG4gICAgICAgICAgICAnaGVhZCc6IG51bGwsXG4gICAgICAgICAgICAnY29udGVudCc6IHt9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICBjYXNlICdnZXQnOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICdnZXQnOiB7XG4gICAgICAgICAgICAnaWQnOiBnZXROZXh0VW5pcXVlSWQoKSxcbiAgICAgICAgICAgICd0b3BpYyc6IHRvcGljLFxuICAgICAgICAgICAgJ3doYXQnOiBudWxsLCAvLyBkYXRhLCBzdWIsIGRlc2MsIHNwYWNlIHNlcGFyYXRlZCBsaXN0OyB1bmtub3duIHN0cmluZ3MgYXJlIGlnbm9yZWRcbiAgICAgICAgICAgICdkZXNjJzoge30sXG4gICAgICAgICAgICAnc3ViJzoge30sXG4gICAgICAgICAgICAnZGF0YSc6IHt9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICBjYXNlICdzZXQnOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICdzZXQnOiB7XG4gICAgICAgICAgICAnaWQnOiBnZXROZXh0VW5pcXVlSWQoKSxcbiAgICAgICAgICAgICd0b3BpYyc6IHRvcGljLFxuICAgICAgICAgICAgJ2Rlc2MnOiB7fSxcbiAgICAgICAgICAgICdzdWInOiB7fSxcbiAgICAgICAgICAgICd0YWdzJzogW11cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ2RlbCc6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgJ2RlbCc6IHtcbiAgICAgICAgICAgICdpZCc6IGdldE5leHRVbmlxdWVJZCgpLFxuICAgICAgICAgICAgJ3RvcGljJzogdG9waWMsXG4gICAgICAgICAgICAnd2hhdCc6IG51bGwsXG4gICAgICAgICAgICAnZGVsc2VxJzogbnVsbCxcbiAgICAgICAgICAgICd1c2VyJzogbnVsbCxcbiAgICAgICAgICAgICdoYXJkJzogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgJ25vdGUnOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICdub3RlJzoge1xuICAgICAgICAgICAgLy8gbm8gaWQgYnkgZGVzaWduXG4gICAgICAgICAgICAndG9waWMnOiB0b3BpYyxcbiAgICAgICAgICAgICd3aGF0JzogbnVsbCwgLy8gb25lIG9mIFwicmVjdlwiLCBcInJlYWRcIiwgXCJrcFwiXG4gICAgICAgICAgICAnc2VxJzogdW5kZWZpbmVkIC8vIHRoZSBzZXJ2ZXItc2lkZSBtZXNzYWdlIGlkIGFrbm93bGVkZ2VkIGFzIHJlY2VpdmVkIG9yIHJlYWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwYWNrZXQgdHlwZSByZXF1ZXN0ZWQ6ICR7dHlwZX1gKTtcbiAgICB9XG4gIH1cblxuICAvLyBTZW5kIGEgcGFja2V0LiBJZiBwYWNrZXQgaWQgaXMgcHJvdmlkZWQgcmV0dXJuIGEgcHJvbWlzZS5cbiAgdGhpcy5zZW5kID0gKHBrdCwgaWQpID0+IHtcbiAgICBsZXQgcHJvbWlzZTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIHByb21pc2UgPSBtYWtlUHJvbWlzZShpZCk7XG4gICAgfVxuICAgIHBrdCA9IHNpbXBsaWZ5KHBrdCk7XG4gICAgbGV0IG1zZyA9IEpTT04uc3RyaW5naWZ5KHBrdCk7XG4gICAgdGhpcy5sb2dnZXIoXCJvdXQ6IFwiICsgKHRoaXMuX3RyaW1Mb25nU3RyaW5ncyA/IEpTT04uc3RyaW5naWZ5KHBrdCwganNvbkxvZ2dlckhlbHBlcikgOiBtc2cpKTtcbiAgICB0cnkge1xuICAgICAgdGhpcy5fY29ubmVjdGlvbi5zZW5kVGV4dChtc2cpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gSWYgc2VuZFRleHQgdGhyb3dzLCB3cmFwIHRoZSBlcnJvciBpbiBhIHByb21pc2Ugb3IgcmV0aHJvdy5cbiAgICAgIGlmIChpZCkge1xuICAgICAgICBleGVjUHJvbWlzZShpZCwgQ29ubmVjdGlvbi5ORVRXT1JLX0VSUk9SLCBudWxsLCBlcnIubWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgLy8gT24gc3VjY2Vzc2Z1bCBsb2dpbiBzYXZlIHNlcnZlci1wcm92aWRlZCBkYXRhLlxuICB0aGlzLmxvZ2luU3VjY2Vzc2Z1bCA9IChjdHJsKSA9PiB7XG4gICAgaWYgKCFjdHJsLnBhcmFtcyB8fCAhY3RybC5wYXJhbXMudXNlcikge1xuICAgICAgcmV0dXJuIGN0cmw7XG4gICAgfVxuICAgIC8vIFRoaXMgaXMgYSByZXNwb25zZSB0byBhIHN1Y2Nlc3NmdWwgbG9naW4sXG4gICAgLy8gZXh0cmFjdCBVSUQgYW5kIHNlY3VyaXR5IHRva2VuLCBzYXZlIGl0IGluIFRpbm9kZSBtb2R1bGVcbiAgICB0aGlzLl9teVVJRCA9IGN0cmwucGFyYW1zLnVzZXI7XG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IChjdHJsICYmIGN0cmwuY29kZSA+PSAyMDAgJiYgY3RybC5jb2RlIDwgMzAwKTtcbiAgICBpZiAoY3RybC5wYXJhbXMgJiYgY3RybC5wYXJhbXMudG9rZW4gJiYgY3RybC5wYXJhbXMuZXhwaXJlcykge1xuICAgICAgdGhpcy5fYXV0aFRva2VuID0ge1xuICAgICAgICB0b2tlbjogY3RybC5wYXJhbXMudG9rZW4sXG4gICAgICAgIGV4cGlyZXM6IG5ldyBEYXRlKGN0cmwucGFyYW1zLmV4cGlyZXMpXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hdXRoVG9rZW4gPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9naW4pIHtcbiAgICAgIHRoaXMub25Mb2dpbihjdHJsLmNvZGUsIGN0cmwudGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0cmw7XG4gIH1cblxuICAvLyBUaGUgbWFpbiBtZXNzYWdlIGRpc3BhdGNoZXIuXG4gIHRoaXMuX2Nvbm5lY3Rpb24ub25NZXNzYWdlID0gKGRhdGEpID0+IHtcbiAgICAvLyBTa2lwIGVtcHR5IHJlc3BvbnNlLiBUaGlzIGhhcHBlbnMgd2hlbiBMUCB0aW1lcyBvdXQuXG4gICAgaWYgKCFkYXRhKSByZXR1cm47XG5cbiAgICB0aGlzLl9pblBhY2tldENvdW50Kys7XG5cbiAgICAvLyBTZW5kIHJhdyBtZXNzYWdlIHRvIGxpc3RlbmVyXG4gICAgaWYgKHRoaXMub25SYXdNZXNzYWdlKSB7XG4gICAgICB0aGlzLm9uUmF3TWVzc2FnZShkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSA9PT0gJzAnKSB7XG4gICAgICAvLyBTZXJ2ZXIgcmVzcG9uc2UgdG8gYSBuZXR3b3JrIHByb2JlLlxuICAgICAgaWYgKHRoaXMub25OZXR3b3JrUHJvYmUpIHtcbiAgICAgICAgdGhpcy5vbk5ldHdvcmtQcm9iZSgpO1xuICAgICAgfVxuICAgICAgLy8gTm8gcHJvY2Vzc2luZyBpcyBuZWNlc3NhcnkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHBrdCA9IEpTT04ucGFyc2UoZGF0YSwganNvblBhcnNlSGVscGVyKTtcbiAgICBpZiAoIXBrdCkge1xuICAgICAgdGhpcy5sb2dnZXIoXCJpbjogXCIgKyBkYXRhKTtcbiAgICAgIHRoaXMubG9nZ2VyKFwiRVJST1I6IGZhaWxlZCB0byBwYXJzZSBkYXRhXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvZ2dlcihcImluOiBcIiArICh0aGlzLl90cmltTG9uZ1N0cmluZ3MgPyBKU09OLnN0cmluZ2lmeShwa3QsIGpzb25Mb2dnZXJIZWxwZXIpIDogZGF0YSkpO1xuXG4gICAgICAvLyBTZW5kIGNvbXBsZXRlIHBhY2tldCB0byBsaXN0ZW5lclxuICAgICAgaWYgKHRoaXMub25NZXNzYWdlKSB7XG4gICAgICAgIHRoaXMub25NZXNzYWdlKHBrdCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwa3QuY3RybCkge1xuICAgICAgICAvLyBIYW5kbGluZyB7Y3RybH0gbWVzc2FnZVxuICAgICAgICBpZiAodGhpcy5vbkN0cmxNZXNzYWdlKSB7XG4gICAgICAgICAgdGhpcy5vbkN0cmxNZXNzYWdlKHBrdC5jdHJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc29sdmUgb3IgcmVqZWN0IGEgcGVuZGluZyBwcm9taXNlLCBpZiBhbnlcbiAgICAgICAgaWYgKHBrdC5jdHJsLmlkKSB7XG4gICAgICAgICAgZXhlY1Byb21pc2UocGt0LmN0cmwuaWQsIHBrdC5jdHJsLmNvZGUsIHBrdC5jdHJsLCBwa3QuY3RybC50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBpZiAocGt0LmN0cmwuY29kZSA9PSAyMDUgJiYgcGt0LmN0cmwudGV4dCA9PSAnZXZpY3RlZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZXIgZXZpY3RlZCBmcm9tIHRvcGljLlxuICAgICAgICAgICAgY29uc3QgdG9waWMgPSBjYWNoZUdldCgndG9waWMnLCBwa3QuY3RybC50b3BpYyk7XG4gICAgICAgICAgICBpZiAodG9waWMpIHtcbiAgICAgICAgICAgICAgdG9waWMuX3Jlc2V0U3ViKCk7XG4gICAgICAgICAgICAgIGlmIChwa3QuY3RybC5wYXJhbXMgJiYgcGt0LmN0cmwucGFyYW1zLnVuc3ViKSB7XG4gICAgICAgICAgICAgICAgdG9waWMuX2dvbmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAocGt0LmN0cmwuY29kZSA8IDMwMCAmJiBwa3QuY3RybC5wYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwa3QuY3RybC5wYXJhbXMud2hhdCA9PSAnZGF0YScpIHtcbiAgICAgICAgICAgICAgLy8gY29kZT0yMDgsIGFsbCBtZXNzYWdlcyByZWNlaXZlZDogXCJwYXJhbXNcIjp7XCJjb3VudFwiOjExLFwid2hhdFwiOlwiZGF0YVwifSxcbiAgICAgICAgICAgICAgY29uc3QgdG9waWMgPSBjYWNoZUdldCgndG9waWMnLCBwa3QuY3RybC50b3BpYyk7XG4gICAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICAgIHRvcGljLl9hbGxNZXNzYWdlc1JlY2VpdmVkKHBrdC5jdHJsLnBhcmFtcy5jb3VudCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGt0LmN0cmwucGFyYW1zLndoYXQgPT0gJ3N1YicpIHtcbiAgICAgICAgICAgICAgLy8gY29kZT0yMDQsIHRoZSB0b3BpYyBoYXMgbm8gKHJlZnJlc2hlZCkgc3Vic2NyaXB0aW9ucy5cbiAgICAgICAgICAgICAgY29uc3QgdG9waWMgPSBjYWNoZUdldCgndG9waWMnLCBwa3QuY3RybC50b3BpYyk7XG4gICAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdG9waWMub25TdWJzVXBkYXRlZC5cbiAgICAgICAgICAgICAgICB0b3BpYy5fcHJvY2Vzc01ldGFTdWIoW10pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGlmIChwa3QubWV0YSkge1xuICAgICAgICAgICAgLy8gSGFuZGxpbmcgYSB7bWV0YX0gbWVzc2FnZS5cblxuICAgICAgICAgICAgLy8gUHJlZmVycmVkIEFQSTogUm91dGUgbWV0YSB0byB0b3BpYywgaWYgb25lIGlzIHJlZ2lzdGVyZWRcbiAgICAgICAgICAgIGNvbnN0IHRvcGljID0gY2FjaGVHZXQoJ3RvcGljJywgcGt0Lm1ldGEudG9waWMpO1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgIHRvcGljLl9yb3V0ZU1ldGEocGt0Lm1ldGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGt0Lm1ldGEuaWQpIHtcbiAgICAgICAgICAgICAgZXhlY1Byb21pc2UocGt0Lm1ldGEuaWQsIDIwMCwgcGt0Lm1ldGEsICdNRVRBJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlY29uZGFyeSBBUEk6IGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAodGhpcy5vbk1ldGFNZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25NZXRhTWVzc2FnZShwa3QubWV0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChwa3QuZGF0YSkge1xuICAgICAgICAgICAgLy8gSGFuZGxpbmcge2RhdGF9IG1lc3NhZ2VcblxuICAgICAgICAgICAgLy8gUHJlZmVycmVkIEFQSTogUm91dGUgZGF0YSB0byB0b3BpYywgaWYgb25lIGlzIHJlZ2lzdGVyZWRcbiAgICAgICAgICAgIGNvbnN0IHRvcGljID0gY2FjaGVHZXQoJ3RvcGljJywgcGt0LmRhdGEudG9waWMpO1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgIHRvcGljLl9yb3V0ZURhdGEocGt0LmRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZWNvbmRhcnkgQVBJOiBDYWxsIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAodGhpcy5vbkRhdGFNZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25EYXRhTWVzc2FnZShwa3QuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChwa3QucHJlcykge1xuICAgICAgICAgICAgLy8gSGFuZGxpbmcge3ByZXN9IG1lc3NhZ2VcblxuICAgICAgICAgICAgLy8gUHJlZmVycmVkIEFQSTogUm91dGUgcHJlc2VuY2UgdG8gdG9waWMsIGlmIG9uZSBpcyByZWdpc3RlcmVkXG4gICAgICAgICAgICBjb25zdCB0b3BpYyA9IGNhY2hlR2V0KCd0b3BpYycsIHBrdC5wcmVzLnRvcGljKTtcbiAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICB0b3BpYy5fcm91dGVQcmVzKHBrdC5wcmVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2Vjb25kYXJ5IEFQSSAtIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAodGhpcy5vblByZXNNZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25QcmVzTWVzc2FnZShwa3QucHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChwa3QuaW5mbykge1xuICAgICAgICAgICAgLy8ge2luZm99IG1lc3NhZ2UgLSByZWFkL3JlY2VpdmVkIG5vdGlmaWNhdGlvbnMgYW5kIGtleSBwcmVzc2VzXG5cbiAgICAgICAgICAgIC8vIFByZWZlcnJlZCBBUEk6IFJvdXRlIHtpbmZvfX0gdG8gdG9waWMsIGlmIG9uZSBpcyByZWdpc3RlcmVkXG4gICAgICAgICAgICBjb25zdCB0b3BpYyA9IGNhY2hlR2V0KCd0b3BpYycsIHBrdC5pbmZvLnRvcGljKTtcbiAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICB0b3BpYy5fcm91dGVJbmZvKHBrdC5pbmZvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2Vjb25kYXJ5IEFQSSAtIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAodGhpcy5vbkluZm9NZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25JbmZvTWVzc2FnZShwa3QuaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyKFwiRVJST1I6IFVua25vd24gcGFja2V0IHJlY2VpdmVkLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlYWR5IHRvIHN0YXJ0IHNlbmRpbmcuXG4gIHRoaXMuX2Nvbm5lY3Rpb24ub25PcGVuID0gKCkgPT4ge1xuICAgIGlmICghdGhpcy5fZXhwaXJlUHJvbWlzZXMpIHtcbiAgICAgIC8vIFJlamVjdCBwcm9taXNlcyB3aGljaCBoYXZlIG5vdCBiZWVuIHJlc29sdmVkIGZvciB0b28gbG9uZy5cbiAgICAgIHRoaXMuX2V4cGlyZVByb21pc2VzID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoXCJUaW1lb3V0ICg1MDQpXCIpO1xuICAgICAgICBjb25zdCBleHBpcmVzID0gbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBFWFBJUkVfUFJPTUlTRVNfVElNRU9VVCk7XG4gICAgICAgIGZvciAobGV0IGlkIGluIHRoaXMuX3BlbmRpbmdQcm9taXNlcykge1xuICAgICAgICAgIGxldCBjYWxsYmFja3MgPSB0aGlzLl9wZW5kaW5nUHJvbWlzZXNbaWRdO1xuICAgICAgICAgIGlmIChjYWxsYmFja3MgJiYgY2FsbGJhY2tzLnRzIDwgZXhwaXJlcykge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIoXCJQcm9taXNlIGV4cGlyZWRcIiwgaWQpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdQcm9taXNlc1tpZF07XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tzLnJlamVjdCkge1xuICAgICAgICAgICAgICBjYWxsYmFja3MucmVqZWN0KGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBFWFBJUkVfUFJPTUlTRVNfUEVSSU9EKTtcbiAgICB9XG4gICAgdGhpcy5oZWxsbygpO1xuICB9XG5cbiAgLy8gV3JhcHBlciBmb3IgdGhlIHJlY29ubmVjdCBpdGVyYXRvciBjYWxsYmFjay5cbiAgdGhpcy5fY29ubmVjdGlvbi5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24gPSAodGltZW91dCwgcHJvbWlzZSkgPT4ge1xuICAgIGlmICh0aGlzLm9uQXV0b3JlY29ubmVjdEl0ZXJhdGlvbikge1xuICAgICAgdGhpcy5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb24odGltZW91dCwgcHJvbWlzZSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5fY29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QgPSAoZXJyLCBjb2RlKSA9PiB7XG4gICAgdGhpcy5faW5QYWNrZXRDb3VudCA9IDA7XG4gICAgdGhpcy5fc2VydmVySW5mbyA9IG51bGw7XG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuX2V4cGlyZVByb21pc2VzKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuX2V4cGlyZVByb21pc2VzKTtcbiAgICAgIHRoaXMuX2V4cGlyZVByb21pc2VzID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBNYXJrIGFsbCB0b3BpY3MgYXMgdW5zdWJzY3JpYmVkXG4gICAgY2FjaGVNYXAoJ3RvcGljJywgKHRvcGljLCBrZXkpID0+IHtcbiAgICAgIHRvcGljLl9yZXNldFN1YigpO1xuICAgIH0pO1xuXG4gICAgLy8gUmVqZWN0IGFsbCBwZW5kaW5nIHByb21pc2VzXG4gICAgZm9yIChsZXQga2V5IGluIHRoaXMuX3BlbmRpbmdQcm9taXNlcykge1xuICAgICAgY29uc3QgY2FsbGJhY2tzID0gdGhpcy5fcGVuZGluZ1Byb21pc2VzW2tleV07XG4gICAgICBpZiAoY2FsbGJhY2tzICYmIGNhbGxiYWNrcy5yZWplY3QpIHtcbiAgICAgICAgY2FsbGJhY2tzLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wZW5kaW5nUHJvbWlzZXMgPSB7fTtcblxuICAgIGlmICh0aGlzLm9uRGlzY29ubmVjdCkge1xuICAgICAgdGhpcy5vbkRpc2Nvbm5lY3QoZXJyKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIFN0YXRpYyBtZXRob2RzLlxuXG4vKipcbiAqIEB0eXBlZGVmIENyZWRlbnRpYWxcbiAqIEB0eXBlIHtvYmplY3R9XG4gKiBAcHJvcGVydHkge3N0cmluZ30gbWV0aCAtIHZhbGlkYXRpb24gbWV0aG9kLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHZhbCAtIHZhbHVlIHRvIHZhbGlkYXRlIChlLmcuIGVtYWlsIG9yIHBob25lIG51bWJlcikuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gcmVzcCAtIHZhbGlkYXRpb24gcmVzcG9uc2UuXG4gKiBAcHJvcGVydHkge09iamVjdH0gcGFyYW1zIC0gdmFsaWRhdGlvbiBwYXJhbWV0ZXJzLlxuICovXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gcGFja2FnZSBhY2NvdW50IGNyZWRlbnRpYWwuXG4gKlxuICogQG1lbWJlcm9mIFRpbm9kZVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nIHwgQ3JlZGVudGlhbH0gbWV0aCAtIHZhbGlkYXRpb24gbWV0aG9kIG9yIG9iamVjdCB3aXRoIHZhbGlkYXRpb24gZGF0YS5cbiAqIEBwYXJhbSB7c3RyaW5nPX0gdmFsIC0gdmFsaWRhdGlvbiB2YWx1ZSAoZS5nLiBlbWFpbCBvciBwaG9uZSBudW1iZXIpLlxuICogQHBhcmFtIHtPYmplY3Q9fSBwYXJhbXMgLSB2YWxpZGF0aW9uIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge3N0cmluZz19IHJlc3AgLSB2YWxpZGF0aW9uIHJlc3BvbnNlLlxuICpcbiAqIEByZXR1cm5zIHtBcnJheS48Q3JlZGVudGlhbD59IGFycmF5IHdpdGggYSBzaW5nbGUgY3JlZGVudGlhbCBvciA8Y29kZT5udWxsPC9jb2RlPiBpZiBubyB2YWxpZCBjcmVkZW50aWFscyB3ZXJlIGdpdmVuLlxuICovXG5UaW5vZGUuY3JlZGVudGlhbCA9IGZ1bmN0aW9uKG1ldGgsIHZhbCwgcGFyYW1zLCByZXNwKSB7XG4gIGlmICh0eXBlb2YgbWV0aCA9PSAnb2JqZWN0Jykge1xuICAgICh7XG4gICAgICB2YWwsXG4gICAgICBwYXJhbXMsXG4gICAgICByZXNwLFxuICAgICAgbWV0aFxuICAgIH0gPSBtZXRoKTtcbiAgfVxuICBpZiAobWV0aCAmJiAodmFsIHx8IHJlc3ApKSB7XG4gICAgcmV0dXJuIFt7XG4gICAgICAnbWV0aCc6IG1ldGgsXG4gICAgICAndmFsJzogdmFsLFxuICAgICAgJ3Jlc3AnOiByZXNwLFxuICAgICAgJ3BhcmFtcyc6IHBhcmFtc1xuICAgIH1dO1xuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgdG9waWMgdHlwZSBmcm9tIHRvcGljJ3MgbmFtZTogZ3JwLCBwMnAsIG1lLCBmbmQsIHN5cy5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIE5hbWUgb2YgdGhlIHRvcGljIHRvIHRlc3QuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBPbmUgb2YgPGNvZGU+XCJtZVwiPC9jb2RlPiwgPGNvZGU+XCJmbmRcIjwvY29kZT4sIDxjb2RlPlwic3lzXCI8L2NvZGU+LCA8Y29kZT5cImdycFwiPC9jb2RlPixcbiAqICAgIDxjb2RlPlwicDJwXCI8L2NvZGU+IG9yIDxjb2RlPnVuZGVmaW5lZDwvY29kZT4uXG4gKi9cblRpbm9kZS50b3BpY1R5cGUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGNvbnN0IHR5cGVzID0ge1xuICAgICdtZSc6ICdtZScsXG4gICAgJ2ZuZCc6ICdmbmQnLFxuICAgICdncnAnOiAnZ3JwJyxcbiAgICAnbmV3JzogJ2dycCcsXG4gICAgJ25jaCc6ICdncnAnLFxuICAgICdjaG4nOiAnZ3JwJyxcbiAgICAndXNyJzogJ3AycCcsXG4gICAgJ3N5cyc6ICdzeXMnXG4gIH07XG4gIHJldHVybiB0eXBlc1sodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycpID8gbmFtZS5zdWJzdHJpbmcoMCwgMykgOiAneHh4J107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiB0b3BpYyBuYW1lIGlzIGEgbmFtZSBvZiBhICdtZScgdG9waWMuXG4gKiBAbWVtYmVyb2YgVGlub2RlXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSB0b3BpYyB0byB0ZXN0LlxuICogQHJldHVybnMge2Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIHRoZSBuYW1lIGlzIGEgbmFtZSBvZiBhICdtZScgdG9waWMsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc01lVG9waWNOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gVGlub2RlLnRvcGljVHlwZShuYW1lKSA9PSAnbWUnO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gdG9waWMgbmFtZSBpcyBhIG5hbWUgb2YgYSBncm91cCB0b3BpYy5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIE5hbWUgb2YgdGhlIHRvcGljIHRvIHRlc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdGhlIG5hbWUgaXMgYSBuYW1lIG9mIGEgZ3JvdXAgdG9waWMsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc0dyb3VwVG9waWNOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gVGlub2RlLnRvcGljVHlwZShuYW1lKSA9PSAnZ3JwJztcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGdpdmVuIHRvcGljIG5hbWUgaXMgYSBuYW1lIG9mIGEgcDJwIHRvcGljLlxuICogQG1lbWJlcm9mIFRpbm9kZVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gdGVzdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0aGUgbmFtZSBpcyBhIG5hbWUgb2YgYSBwMnAgdG9waWMsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc1AyUFRvcGljTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIFRpbm9kZS50b3BpY1R5cGUobmFtZSkgPT0gJ3AycCc7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiB0b3BpYyBuYW1lIGlzIGEgbmFtZSBvZiBhIGNvbW11bmljYXRpb24gdG9waWMsIGkuZS4gUDJQIG9yIGdyb3VwLlxuICogQG1lbWJlcm9mIFRpbm9kZVxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gdGVzdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0aGUgbmFtZSBpcyBhIG5hbWUgb2YgYSBwMnAgb3IgZ3JvdXAgdG9waWMsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc0NvbW1Ub3BpY05hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiBUaW5vZGUuaXNQMlBUb3BpY05hbWUobmFtZSkgfHwgVGlub2RlLmlzR3JvdXBUb3BpY05hbWUobmFtZSk7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSB0b3BpYyBuYW1lIGlzIGEgbmFtZSBvZiBhIG5ldyB0b3BpYy5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIHRvcGljIG5hbWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdGhlIG5hbWUgaXMgYSBuYW1lIG9mIGEgbmV3IHRvcGljLCA8Y29kZT5mYWxzZTwvY29kZT4gb3RoZXJ3aXNlLlxuICovXG5UaW5vZGUuaXNOZXdHcm91cFRvcGljTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuICh0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJykgJiZcbiAgICAobmFtZS5zdWJzdHJpbmcoMCwgMykgPT0gVE9QSUNfTkVXIHx8IG5hbWUuc3Vic3RyaW5nKDAsIDMpID09IFRPUElDX05FV19DSEFOKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIHRvcGljIG5hbWUgaXMgYSBuYW1lIG9mIGEgY2hhbm5lbC5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIHRvcGljIG5hbWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdGhlIG5hbWUgaXMgYSBuYW1lIG9mIGEgY2hhbm5lbCwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAqL1xuVGlub2RlLmlzQ2hhbm5lbFRvcGljTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuICh0eXBlb2YgbmFtZSA9PSAnc3RyaW5nJykgJiZcbiAgICAobmFtZS5zdWJzdHJpbmcoMCwgMykgPT0gVE9QSUNfQ0hBTiB8fCBuYW1lLnN1YnN0cmluZygwLCAzKSA9PSBUT1BJQ19ORVdfQ0hBTik7XG59O1xuXG4vKipcbiAqIFJldHVybiBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIHRoaXMgVGlub2RlIGNsaWVudCBsaWJyYXJ5LlxuICogQG1lbWJlcm9mIFRpbm9kZVxuICogQHN0YXRpY1xuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHNlbWFudGljIHZlcnNpb24gb2YgdGhlIGxpYnJhcnksIGUuZy4gPGNvZGU+XCIwLjE1LjUtcmMxXCI8L2NvZGU+LlxuICovXG5UaW5vZGUuZ2V0VmVyc2lvbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gVkVSU0lPTjtcbn07XG5cbi8qKlxuICogVG8gdXNlIFRpbm9kZSBpbiBhIG5vbiBicm93c2VyIGNvbnRleHQsIHN1cHBseSBXZWJTb2NrZXQgYW5kIFhNTEh0dHBSZXF1ZXN0IHByb3ZpZGVycy5cbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBwYXJhbSB3c1Byb3ZpZGVyIFdlYlNvY2tldCBwcm92aWRlciwgZS5nLiBmb3Igbm9kZUpTICwgPGNvZGU+cmVxdWlyZSgnd3MnKTwvY29kZT4uXG4gKiBAcGFyYW0geGhyUHJvdmlkZXIgWE1MSHR0cFJlcXVlc3QgcHJvdmlkZXIsIGUuZy4gZm9yIG5vZGUgPGNvZGU+cmVxdWlyZSgneGhyJyk8L2NvZGU+LlxuICovXG5UaW5vZGUuc2V0TmV0d29ya1Byb3ZpZGVycyA9IGZ1bmN0aW9uKHdzUHJvdmlkZXIsIHhoclByb3ZpZGVyKSB7XG4gIFdlYlNvY2tldFByb3ZpZGVyID0gd3NQcm92aWRlcjtcbiAgWEhSUHJvdmlkZXIgPSB4aHJQcm92aWRlcjtcbn07XG5cbi8qKlxuICogUmV0dXJuIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IG5hbWUgYW5kIHZlcnNpb24gb2YgdGhpcyBUaW5vZGUgbGlicmFyeS5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSB0aGUgbmFtZSBvZiB0aGUgbGlicmFyeSBhbmQgaXQncyB2ZXJzaW9uLlxuICovXG5UaW5vZGUuZ2V0TGlicmFyeSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTElCUkFSWTtcbn07XG5cbi8vIEV4cG9ydGVkIGNvbnN0YW50c1xuVGlub2RlLk1FU1NBR0VfU1RBVFVTX05PTkUgPSBNRVNTQUdFX1NUQVRVU19OT05FO1xuVGlub2RlLk1FU1NBR0VfU1RBVFVTX1FVRVVFRCA9IE1FU1NBR0VfU1RBVFVTX1FVRVVFRDtcblRpbm9kZS5NRVNTQUdFX1NUQVRVU19TRU5ESU5HID0gTUVTU0FHRV9TVEFUVVNfU0VORElORztcblRpbm9kZS5NRVNTQUdFX1NUQVRVU19GQUlMRUQgPSBNRVNTQUdFX1NUQVRVU19GQUlMRUQ7XG5UaW5vZGUuTUVTU0FHRV9TVEFUVVNfU0VOVCA9IE1FU1NBR0VfU1RBVFVTX1NFTlQ7XG5UaW5vZGUuTUVTU0FHRV9TVEFUVVNfUkVDRUlWRUQgPSBNRVNTQUdFX1NUQVRVU19SRUNFSVZFRDtcblRpbm9kZS5NRVNTQUdFX1NUQVRVU19SRUFEID0gTUVTU0FHRV9TVEFUVVNfUkVBRDtcblRpbm9kZS5NRVNTQUdFX1NUQVRVU19UT19NRSA9IE1FU1NBR0VfU1RBVFVTX1RPX01FO1xuVGlub2RlLk1FU1NBR0VfU1RBVFVTX0RFTF9SQU5HRSA9IE1FU1NBR0VfU1RBVFVTX0RFTF9SQU5HRTtcblxuLy8gVW5pY29kZSBbZGVsXSBzeW1ib2wuXG5UaW5vZGUuREVMX0NIQVIgPSAnXFx1MjQyMSc7XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGdpdmVuIHN0cmluZyByZXByZXNlbnRzIDxjb2RlPk5VTEw8L2NvZGU+IHZhbHVlIGFzIGRlZmluZWQgYnkgVGlub2RlICg8Y29kZT4nXFx1MjQyMSc8L2NvZGU+KS5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIC0gc3RyaW5nIHRvIGNoZWNrIGZvciA8Y29kZT5OVUxMPC9jb2RlPiB2YWx1ZS5cbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgc3RyaW5nIHJlcHJlc2VudHMgPGNvZGU+TlVMTDwvY29kZT4gdmFsdWUsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc051bGxWYWx1ZSA9IGZ1bmN0aW9uKHN0cikge1xuICByZXR1cm4gc3RyID09PSBUaW5vZGUuREVMX0NIQVI7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiBVUkwgc3RyaW5nIGlzIGEgcmVsYXRpdmUgVVJMLlxuICogQ2hlY2sgZm9yIGNhc2VzIGxpa2U6XG4gKiAgPGNvZGU+J2h0dHA6Ly9leGFtcGxlLmNvbSc8L2NvZGU+XG4gKiAgPGNvZGU+JyBodHRwOi8vZXhhbXBsZS5jb20nPC9jb2RlPlxuICogIDxjb2RlPicvL2V4YW1wbGUuY29tLyc8L2NvZGU+XG4gKiAgPGNvZGU+J2h0dHA6ZXhhbXBsZS5jb20nPC9jb2RlPlxuICogIDxjb2RlPidodHRwOi9leGFtcGxlLmNvbSc8L2NvZGU+XG4gKiBAbWVtYmVyb2YgVGlub2RlXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCAtIFVSTCBzdHJpbmcgdG8gY2hlY2suXG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIHRoZSBVUkwgaXMgcmVsYXRpdmUsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cblRpbm9kZS5pc1JlbGF0aXZlVVJMID0gZnVuY3Rpb24odXJsKSB7XG4gIHJldHVybiAhL15cXHMqKFthLXpdW2EtejAtOSsuLV0qOnxcXC9cXC8pL2ltLnRlc3QodXJsKTtcbn07XG5cbi8vIE5hbWVzIG9mIGtleXMgdG8gc2VydmVyLXByb3ZpZGVkIGNvbmZpZ3VyYXRpb24gbGltaXRzLlxuVGlub2RlLk1BWF9NRVNTQUdFX1NJWkUgPSAnbWF4TWVzc2FnZVNpemUnO1xuVGlub2RlLk1BWF9TVUJTQ1JJQkVSX0NPVU5UID0gJ21heFN1YnNjcmliZXJDb3VudCc7XG5UaW5vZGUuTUFYX1RBR19DT1VOVCA9ICdtYXhUYWdDb3VudCc7XG5UaW5vZGUuTUFYX0ZJTEVfVVBMT0FEX1NJWkUgPSAnbWF4RmlsZVVwbG9hZFNpemUnO1xuXG4vLyBQdWJsaWMgbWV0aG9kcztcblRpbm9kZS5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIHRoZSBzZXJ2ZXIuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBob3N0XyAtIG5hbWUgb2YgdGhlIGhvc3QgdG8gY29ubmVjdCB0by5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBjb25uZWN0aW9uIGNhbGwgY29tcGxldGVzOlxuICAgKiAgICA8Y29kZT5yZXNvbHZlKCk8L2NvZGU+IGlzIGNhbGxlZCB3aXRob3V0IHBhcmFtZXRlcnMsIDxjb2RlPnJlamVjdCgpPC9jb2RlPiByZWNlaXZlcyB0aGVcbiAgICogICAgPGNvZGU+RXJyb3I8L2NvZGU+IGFzIGEgc2luZ2xlIHBhcmFtZXRlci5cbiAgICovXG4gIGNvbm5lY3Q6IGZ1bmN0aW9uKGhvc3RfKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24uY29ubmVjdChob3N0Xyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gcmVjb25uZWN0IHRvIHRoZSBzZXJ2ZXIgaW1tZWRpYXRlbHkuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JjZSAtIHJlY29ubmVjdCBldmVuIGlmIHRoZXJlIGlzIGEgY29ubmVjdGlvbiBhbHJlYWR5LlxuICAgKi9cbiAgcmVjb25uZWN0OiBmdW5jdGlvbihmb3JjZSkge1xuICAgIHRoaXMuX2Nvbm5lY3Rpb24ucmVjb25uZWN0KGZvcmNlKTtcbiAgfSxcblxuICAvKipcbiAgICogRGlzY29ubmVjdCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqL1xuICBkaXNjb25uZWN0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jb25uZWN0aW9uLmRpc2Nvbm5lY3QoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xlYXIgcGVyc2lzdGVudCBjYWNoZTogcmVtb3ZlIEluZGV4ZWREQi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGVkLlxuICAgKi9cbiAgY2xlYXJTdG9yYWdlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fZGIuaXNSZWFkeSgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGIuZGVsZXRlRGF0YWJhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBlcnNpc3RlbnQgY2FjaGU6IGNyZWF0ZSBJbmRleGVkREIgY2FjaGUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlZC5cbiAgICovXG4gIGluaXRTdG9yYWdlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2RiLmlzUmVhZHkoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RiLmluaXREYXRhYmFzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbmQgYSBuZXR3b3JrIHByb2JlIG1lc3NhZ2UgdG8gbWFrZSBzdXJlIHRoZSBjb25uZWN0aW9uIGlzIGFsaXZlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKi9cbiAgbmV0d29ya1Byb2JlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jb25uZWN0aW9uLnByb2JlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBsaXZlIGNvbm5lY3Rpb24gdG8gc2VydmVyLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdGhlcmUgaXMgYSBsaXZlIGNvbm5lY3Rpb24sIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gICAqL1xuICBpc0Nvbm5lY3RlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24uaXNDb25uZWN0ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgY29ubmVjdGlvbiBpcyBhdXRoZW50aWNhdGVkIChsYXN0IGxvZ2luIHdhcyBzdWNjZXNzZnVsKS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHJldHVybnMge2Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIGF1dGhlbnRpY2F0ZWQsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gICAqL1xuICBpc0F1dGhlbnRpY2F0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9hdXRoZW50aWNhdGVkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgQVBJIGtleSBhbmQgYXV0aCB0b2tlbiB0byB0aGUgcmVsYXRpdmUgVVJMIG1ha2luZyBpdCB1c2FibGUgZm9yIGdldHRpbmcgZGF0YVxuICAgKiBmcm9tIHRoZSBzZXJ2ZXIgaW4gYSBzaW1wbGUgPGNvZGU+SFRUUCBHRVQ8L2NvZGU+IHJlcXVlc3QuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgLSBVUkwgdG8gd3JhcC5cbiAgICogQHJldHVybnMge3N0cmluZ30gVVJMIHdpdGggYXBwZW5kZWQgQVBJIGtleSBhbmQgdG9rZW4sIGlmIHZhbGlkIHRva2VuIGlzIHByZXNlbnQuXG4gICAqL1xuICBhdXRob3JpemVVUkw6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIGlmIChUaW5vZGUuaXNSZWxhdGl2ZVVSTCh1cmwpKSB7XG4gICAgICAvLyBGYWtlIGJhc2UgdG8gbWFrZSB0aGUgcmVsYXRpdmUgVVJMIHBhcnNlYWJsZS5cbiAgICAgIGNvbnN0IGJhc2UgPSAnc2NoZW1lOi8vaG9zdC8nO1xuICAgICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwsIGJhc2UpO1xuICAgICAgaWYgKHRoaXMuX2FwaUtleSkge1xuICAgICAgICBwYXJzZWQuc2VhcmNoUGFyYW1zLmFwcGVuZCgnYXBpa2V5JywgdGhpcy5fYXBpS2V5KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hdXRoVG9rZW4udG9rZW4pIHtcbiAgICAgICAgcGFyc2VkLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ2F1dGgnLCAndG9rZW4nKTtcbiAgICAgICAgcGFyc2VkLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ3NlY3JldCcsIHRoaXMuX2F1dGhUb2tlbi50b2tlbik7XG4gICAgICB9XG4gICAgICAvLyBDb252ZXJ0IGJhY2sgdG8gc3RyaW5nIGFuZCBzdHJpcCBmYWtlIGJhc2UgVVJMIGV4Y2VwdCBmb3IgdGhlIHJvb3Qgc2xhc2guXG4gICAgICB1cmwgPSBwYXJzZWQudG9TdHJpbmcoKS5zdWJzdHJpbmcoYmFzZS5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfSxcblxuICAvKipcbiAgICogQHR5cGVkZWYgQWNjb3VudFBhcmFtc1xuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7VGlub2RlLkRlZkFjcz19IGRlZmFjcyAtIERlZmF1bHQgYWNjZXNzIHBhcmFtZXRlcnMgZm9yIHVzZXIncyA8Y29kZT5tZTwvY29kZT4gdG9waWMuXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0PX0gcHVibGljIC0gUHVibGljIGFwcGxpY2F0aW9uLWRlZmluZWQgZGF0YSBleHBvc2VkIG9uIDxjb2RlPm1lPC9jb2RlPiB0b3BpYy5cbiAgICogQHByb3BlcnR5IHtPYmplY3Q9fSBwcml2YXRlIC0gUHJpdmF0ZSBhcHBsaWNhdGlvbi1kZWZpbmVkIGRhdGEgYWNjZXNzaWJsZSBvbiA8Y29kZT5tZTwvY29kZT4gdG9waWMuXG4gICAqIEBwcm9wZXJ0eSB7QXJyYXl9IHRhZ3MgLSBhcnJheSBvZiBzdHJpbmcgdGFncyBmb3IgdXNlciBkaXNjb3ZlcnkuXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nPX0gdG9rZW4gLSBhdXRoZW50aWNhdGlvbiB0b2tlbiB0byB1c2UuXG4gICAqL1xuICAvKipcbiAgICogQHR5cGVkZWYgRGVmQWNzXG4gICAqIEBtZW1iZXJvZiBUaW5vZGVcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtzdHJpbmc9fSBhdXRoIC0gQWNjZXNzIG1vZGUgZm9yIDxjb2RlPm1lPC9jb2RlPiBmb3IgYXV0aGVudGljYXRlZCB1c2Vycy5cbiAgICogQHByb3BlcnR5IHtzdHJpbmc9fSBhbm9uIC0gQWNjZXNzIG1vZGUgZm9yIDxjb2RlPm1lPC9jb2RlPiBmb3IgYW5vbnltb3VzIHVzZXJzLlxuICAgKi9cblxuICAvKipcbiAgICogQ3JlYXRlIG9yIHVwZGF0ZSBhbiBhY2NvdW50LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdWlkIC0gVXNlciBpZCB0byB1cGRhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNjaGVtZSAtIEF1dGhlbnRpY2F0aW9uIHNjaGVtZTsgPGNvZGU+XCJiYXNpY1wiPC9jb2RlPiBhbmQgPGNvZGU+XCJhbm9ueW1vdXNcIjwvY29kZT4gYXJlIHRoZSBjdXJyZW50bHkgc3VwcG9ydGVkIHNjaGVtZXMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWNyZXQgLSBBdXRoZW50aWNhdGlvbiBzZWNyZXQsIGFzc3VtZWQgdG8gYmUgYWxyZWFkeSBiYXNlNjQgZW5jb2RlZC5cbiAgICogQHBhcmFtIHtib29sZWFuPX0gbG9naW4gLSBVc2UgbmV3IGFjY291bnQgdG8gYXV0aGVudGljYXRlIGN1cnJlbnQgc2Vzc2lvblxuICAgKiBAcGFyYW0ge1Rpbm9kZS5BY2NvdW50UGFyYW1zPX0gcGFyYW1zIC0gVXNlciBkYXRhIHRvIHBhc3MgdG8gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHNlcnZlciByZXBseSBpcyByZWNlaXZlZC5cbiAgICovXG4gIGFjY291bnQ6IGZ1bmN0aW9uKHVpZCwgc2NoZW1lLCBzZWNyZXQsIGxvZ2luLCBwYXJhbXMpIHtcbiAgICBjb25zdCBwa3QgPSB0aGlzLmluaXRQYWNrZXQoJ2FjYycpO1xuICAgIHBrdC5hY2MudXNlciA9IHVpZDtcbiAgICBwa3QuYWNjLnNjaGVtZSA9IHNjaGVtZTtcbiAgICBwa3QuYWNjLnNlY3JldCA9IHNlY3JldDtcbiAgICAvLyBMb2cgaW4gdG8gdGhlIG5ldyBhY2NvdW50IHVzaW5nIHNlbGVjdGVkIHNjaGVtZVxuICAgIHBrdC5hY2MubG9naW4gPSBsb2dpbjtcblxuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgIHBrdC5hY2MuZGVzYy5kZWZhY3MgPSBwYXJhbXMuZGVmYWNzO1xuICAgICAgcGt0LmFjYy5kZXNjLnB1YmxpYyA9IHBhcmFtcy5wdWJsaWM7XG4gICAgICBwa3QuYWNjLmRlc2MucHJpdmF0ZSA9IHBhcmFtcy5wcml2YXRlO1xuXG4gICAgICBwa3QuYWNjLnRhZ3MgPSBwYXJhbXMudGFncztcbiAgICAgIHBrdC5hY2MuY3JlZCA9IHBhcmFtcy5jcmVkO1xuXG4gICAgICBwa3QuYWNjLnRva2VuID0gcGFyYW1zLnRva2VuO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QuYWNjLmlkKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHVzZXIuIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjYWNjb3VudH0uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzY2hlbWUgLSBBdXRoZW50aWNhdGlvbiBzY2hlbWU7IDxjb2RlPlwiYmFzaWNcIjwvY29kZT4gaXMgdGhlIG9ubHkgY3VycmVudGx5IHN1cHBvcnRlZCBzY2hlbWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWNyZXQgLSBBdXRoZW50aWNhdGlvbi5cbiAgICogQHBhcmFtIHtib29sZWFuPX0gbG9naW4gLSBVc2UgbmV3IGFjY291bnQgdG8gYXV0aGVudGljYXRlIGN1cnJlbnQgc2Vzc2lvblxuICAgKiBAcGFyYW0ge1Rpbm9kZS5BY2NvdW50UGFyYW1zPX0gcGFyYW1zIC0gVXNlciBkYXRhIHRvIHBhc3MgdG8gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHNlcnZlciByZXBseSBpcyByZWNlaXZlZC5cbiAgICovXG4gIGNyZWF0ZUFjY291bnQ6IGZ1bmN0aW9uKHNjaGVtZSwgc2VjcmV0LCBsb2dpbiwgcGFyYW1zKSB7XG4gICAgbGV0IHByb21pc2UgPSB0aGlzLmFjY291bnQoVVNFUl9ORVcsIHNjaGVtZSwgc2VjcmV0LCBsb2dpbiwgcGFyYW1zKTtcbiAgICBpZiAobG9naW4pIHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKGN0cmwpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9naW5TdWNjZXNzZnVsKGN0cmwpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdXNlciB3aXRoIDxjb2RlPidiYXNpYyc8L2NvZGU+IGF1dGhlbnRpY2F0aW9uIHNjaGVtZSBhbmQgaW1tZWRpYXRlbHlcbiAgICogdXNlIGl0IGZvciBhdXRoZW50aWNhdGlvbi4gV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNhY2NvdW50fS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJuYW1lIC0gTG9naW4gdG8gdXNlIGZvciB0aGUgbmV3IGFjY291bnQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFVzZXIncyBwYXNzd29yZC5cbiAgICogQHBhcmFtIHtUaW5vZGUuQWNjb3VudFBhcmFtcz19IHBhcmFtcyAtIFVzZXIgZGF0YSB0byBwYXNzIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiBzZXJ2ZXIgcmVwbHkgaXMgcmVjZWl2ZWQuXG4gICAqL1xuICBjcmVhdGVBY2NvdW50QmFzaWM6IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCwgcGFyYW1zKSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZSBub3QgdXNpbmcgJ251bGwnIG9yICd1bmRlZmluZWQnO1xuICAgIHVzZXJuYW1lID0gdXNlcm5hbWUgfHwgJyc7XG4gICAgcGFzc3dvcmQgPSBwYXNzd29yZCB8fCAnJztcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVBY2NvdW50KCdiYXNpYycsXG4gICAgICBiNjRFbmNvZGVVbmljb2RlKHVzZXJuYW1lICsgJzonICsgcGFzc3dvcmQpLCB0cnVlLCBwYXJhbXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdXNlcidzIGNyZWRlbnRpYWxzIGZvciA8Y29kZT4nYmFzaWMnPC9jb2RlPiBhdXRoZW50aWNhdGlvbiBzY2hlbWUuIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjYWNjb3VudH0uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1aWQgLSBVc2VyIElEIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJuYW1lIC0gTG9naW4gdG8gdXNlIGZvciB0aGUgbmV3IGFjY291bnQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFVzZXIncyBwYXNzd29yZC5cbiAgICogQHBhcmFtIHtUaW5vZGUuQWNjb3VudFBhcmFtcz19IHBhcmFtcyAtIGRhdGEgdG8gcGFzcyB0byB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gc2VydmVyIHJlcGx5IGlzIHJlY2VpdmVkLlxuICAgKi9cbiAgdXBkYXRlQWNjb3VudEJhc2ljOiBmdW5jdGlvbih1aWQsIHVzZXJuYW1lLCBwYXNzd29yZCwgcGFyYW1zKSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZSBub3QgdXNpbmcgJ251bGwnIG9yICd1bmRlZmluZWQnO1xuICAgIHVzZXJuYW1lID0gdXNlcm5hbWUgfHwgJyc7XG4gICAgcGFzc3dvcmQgPSBwYXNzd29yZCB8fCAnJztcbiAgICByZXR1cm4gdGhpcy5hY2NvdW50KHVpZCwgJ2Jhc2ljJyxcbiAgICAgIGI2NEVuY29kZVVuaWNvZGUodXNlcm5hbWUgKyAnOicgKyBwYXNzd29yZCksIGZhbHNlLCBwYXJhbXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIGhhbmRzaGFrZSB0byB0aGUgc2VydmVyLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gc2VydmVyIHJlcGx5IGlzIHJlY2VpdmVkLlxuICAgKi9cbiAgaGVsbG86IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHBrdCA9IHRoaXMuaW5pdFBhY2tldCgnaGknKTtcblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QuaGkuaWQpXG4gICAgICAudGhlbigoY3RybCkgPT4ge1xuICAgICAgICAvLyBSZXNldCBiYWNrb2ZmIGNvdW50ZXIgb24gc3VjY2Vzc2Z1bCBjb25uZWN0aW9uLlxuICAgICAgICB0aGlzLl9jb25uZWN0aW9uLmJhY2tvZmZSZXNldCgpO1xuXG4gICAgICAgIC8vIFNlcnZlciByZXNwb25zZSBjb250YWlucyBzZXJ2ZXIgcHJvdG9jb2wgdmVyc2lvbiwgYnVpbGQsIGNvbnN0cmFpbnRzLFxuICAgICAgICAvLyBzZXNzaW9uIElEIGZvciBsb25nIHBvbGxpbmcuIFNhdmUgdGhlbS5cbiAgICAgICAgaWYgKGN0cmwucGFyYW1zKSB7XG4gICAgICAgICAgdGhpcy5fc2VydmVySW5mbyA9IGN0cmwucGFyYW1zO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMub25Db25uZWN0KSB7XG4gICAgICAgICAgdGhpcy5vbkNvbm5lY3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjdHJsO1xuICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICB0aGlzLl9jb25uZWN0aW9uLnJlY29ubmVjdCh0cnVlKTtcblxuICAgICAgICBpZiAodGhpcy5vbkRpc2Nvbm5lY3QpIHtcbiAgICAgICAgICB0aGlzLm9uRGlzY29ubmVjdChlcnIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IG9yIHJlZnJlc2ggdGhlIHB1c2ggbm90aWZpY2F0aW9ucy9kZXZpY2UgdG9rZW4uIElmIHRoZSBjbGllbnQgaXMgY29ubmVjdGVkLFxuICAgKiB0aGUgZGV2aWNlVG9rZW4gY2FuIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGR0IC0gdG9rZW4gb2J0YWluZWQgZnJvbSB0aGUgcHJvdmlkZXIgb3IgPGNvZGU+ZmFsc2U8L2NvZGU+LFxuICAgKiAgICA8Y29kZT5udWxsPC9jb2RlPiBvciA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IHRvIGNsZWFyIHRoZSB0b2tlbi5cbiAgICpcbiAgICogQHJldHVybnMgPGNvZGU+dHJ1ZTwvY29kZT4gaWYgYXR0ZW1wdCB3YXMgbWFkZSB0byBzZW5kIHRoZSB1cGRhdGUgdG8gdGhlIHNlcnZlci5cbiAgICovXG4gIHNldERldmljZVRva2VuOiBmdW5jdGlvbihkdCkge1xuICAgIGxldCBzZW50ID0gZmFsc2U7XG4gICAgLy8gQ29udmVydCBhbnkgZmFsc2lzaCB2YWx1ZSB0byBudWxsLlxuICAgIGR0ID0gZHQgfHwgbnVsbDtcbiAgICBpZiAoZHQgIT0gdGhpcy5fZGV2aWNlVG9rZW4pIHtcbiAgICAgIHRoaXMuX2RldmljZVRva2VuID0gZHQ7XG4gICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCgpICYmIHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgdGhpcy5zZW5kKHtcbiAgICAgICAgICAnaGknOiB7XG4gICAgICAgICAgICAnZGV2JzogZHQgfHwgVGlub2RlLkRFTF9DSEFSXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgc2VudCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZW50O1xuICB9LFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGUgY3VycmVudCBzZXNzaW9uLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2NoZW1lIC0gQXV0aGVudGljYXRpb24gc2NoZW1lOyA8Y29kZT5cImJhc2ljXCI8L2NvZGU+IGlzIHRoZSBvbmx5IGN1cnJlbnRseSBzdXBwb3J0ZWQgc2NoZW1lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2VjcmV0IC0gQXV0aGVudGljYXRpb24gc2VjcmV0LCBhc3N1bWVkIHRvIGJlIGFscmVhZHkgYmFzZTY0IGVuY29kZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiBzZXJ2ZXIgcmVwbHkgaXMgcmVjZWl2ZWQuXG4gICAqL1xuICBsb2dpbjogZnVuY3Rpb24oc2NoZW1lLCBzZWNyZXQsIGNyZWQpIHtcbiAgICBjb25zdCBwa3QgPSB0aGlzLmluaXRQYWNrZXQoJ2xvZ2luJyk7XG4gICAgcGt0LmxvZ2luLnNjaGVtZSA9IHNjaGVtZTtcbiAgICBwa3QubG9naW4uc2VjcmV0ID0gc2VjcmV0O1xuICAgIHBrdC5sb2dpbi5jcmVkID0gY3JlZDtcblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QubG9naW4uaWQpXG4gICAgICAudGhlbigoY3RybCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2dpblN1Y2Nlc3NmdWwoY3RybCk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNsb2dpbn0gd2l0aCBiYXNpYyBhdXRoZW50aWNhdGlvblxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdW5hbWUgLSBVc2VyIG5hbWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAgLSBQYXNzd29yZC5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCBvbiByZWNlaXZpbmcgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgbG9naW5CYXNpYzogZnVuY3Rpb24odW5hbWUsIHBhc3N3b3JkLCBjcmVkKSB7XG4gICAgcmV0dXJuIHRoaXMubG9naW4oJ2Jhc2ljJywgYjY0RW5jb2RlVW5pY29kZSh1bmFtZSArICc6JyArIHBhc3N3b3JkKSwgY3JlZClcbiAgICAgIC50aGVuKChjdHJsKSA9PiB7XG4gICAgICAgIHRoaXMuX2xvZ2luID0gdW5hbWU7XG4gICAgICAgIHJldHVybiBjdHJsO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjbG9naW59IHdpdGggdG9rZW4gYXV0aGVudGljYXRpb25cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVG9rZW4gcmVjZWl2ZWQgaW4gcmVzcG9uc2UgdG8gZWFybGllciBsb2dpbi5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCBvbiByZWNlaXZpbmcgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgbG9naW5Ub2tlbjogZnVuY3Rpb24odG9rZW4sIGNyZWQpIHtcbiAgICByZXR1cm4gdGhpcy5sb2dpbigndG9rZW4nLCB0b2tlbiwgY3JlZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXF1ZXN0IGZvciByZXNldHRpbmcgYW4gYXV0aGVudGljYXRpb24gc2VjcmV0LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2NoZW1lIC0gYXV0aGVudGljYXRpb24gc2NoZW1lIHRvIHJlc2V0LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kIC0gbWV0aG9kIHRvIHVzZSBmb3IgcmVzZXR0aW5nIHRoZSBzZWNyZXQsIHN1Y2ggYXMgXCJlbWFpbFwiIG9yIFwidGVsXCIuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIHZhbHVlIG9mIHRoZSBjcmVkZW50aWFsIHRvIHVzZSwgYSBzcGVjaWZpYyBlbWFpbCBhZGRyZXNzIG9yIGEgcGhvbmUgbnVtYmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyB0aGUgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgcmVxdWVzdFJlc2V0QXV0aFNlY3JldDogZnVuY3Rpb24oc2NoZW1lLCBtZXRob2QsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMubG9naW4oJ3Jlc2V0JywgYjY0RW5jb2RlVW5pY29kZShzY2hlbWUgKyAnOicgKyBtZXRob2QgKyAnOicgKyB2YWx1ZSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiBBdXRoVG9rZW5cbiAgICogQG1lbWJlcm9mIFRpbm9kZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gdG9rZW4gLSBUb2tlbiB2YWx1ZS5cbiAgICogQHByb3BlcnR5IHtEYXRlfSBleHBpcmVzIC0gVG9rZW4gZXhwaXJhdGlvbiB0aW1lLlxuICAgKi9cbiAgLyoqXG4gICAqIEdldCBzdG9yZWQgYXV0aGVudGljYXRpb24gdG9rZW4uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuQXV0aFRva2VufSBhdXRoZW50aWNhdGlvbiB0b2tlbi5cbiAgICovXG4gIGdldEF1dGhUb2tlbjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2F1dGhUb2tlbiAmJiAodGhpcy5fYXV0aFRva2VuLmV4cGlyZXMuZ2V0VGltZSgpID4gRGF0ZS5ub3coKSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hdXRoVG9rZW47XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2F1dGhUb2tlbiA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBsaWNhdGlvbiBtYXkgcHJvdmlkZSBhIHNhdmVkIGF1dGhlbnRpY2F0aW9uIHRva2VuLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge1Rpbm9kZS5BdXRoVG9rZW59IHRva2VuIC0gYXV0aGVudGljYXRpb24gdG9rZW4uXG4gICAqL1xuICBzZXRBdXRoVG9rZW46IGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgdGhpcy5fYXV0aFRva2VuID0gdG9rZW47XG4gIH0sXG5cbiAgLyoqXG4gICAqIEB0eXBlZGVmIFNldFBhcmFtc1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEBwcm9wZXJ0eSB7VGlub2RlLlNldERlc2M9fSBkZXNjIC0gVG9waWMgaW5pdGlhbGl6YXRpb24gcGFyYW1ldGVycyB3aGVuIGNyZWF0aW5nIGEgbmV3IHRvcGljIG9yIGEgbmV3IHN1YnNjcmlwdGlvbi5cbiAgICogQHByb3BlcnR5IHtUaW5vZGUuU2V0U3ViPX0gc3ViIC0gU3Vic2NyaXB0aW9uIGluaXRpYWxpemF0aW9uIHBhcmFtZXRlcnMuXG4gICAqL1xuICAvKipcbiAgICogQHR5cGVkZWYgU2V0RGVzY1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEBwcm9wZXJ0eSB7VGlub2RlLkRlZkFjcz19IGRlZmFjcyAtIERlZmF1bHQgYWNjZXNzIG1vZGUuXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0PX0gcHVibGljIC0gRnJlZS1mb3JtIHRvcGljIGRlc2NyaXB0aW9uLCBwdWJsaWNhbGx5IGFjY2Vzc2libGUuXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0PX0gcHJpdmF0ZSAtIEZyZWUtZm9ybSB0b3BpYyBkZXNjcmlwdGlvbmFjY2Vzc2libGUgb25seSB0byB0aGUgb3duZXIuXG4gICAqL1xuICAvKipcbiAgICogQHR5cGVkZWYgU2V0U3ViXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBtZW1iZXJvZiBUaW5vZGVcbiAgICogQHByb3BlcnR5IHtzdHJpbmc9fSB1c2VyIC0gVUlEIG9mIHRoZSB1c2VyIGFmZmVjdGVkIGJ5IHRoZSByZXF1ZXN0LiBEZWZhdWx0IChlbXB0eSkgLSBjdXJyZW50IHVzZXIuXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nPX0gbW9kZSAtIFVzZXIgYWNjZXNzIG1vZGUsIGVpdGhlciByZXF1ZXN0ZWQgb3IgYXNzaWduZWQgZGVwZW5kZW50IG9uIGNvbnRleHQuXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0PX0gaW5mbyAtIEZyZWUtZm9ybSBwYXlsb2FkIHRvIHBhc3MgdG8gdGhlIGludml0ZWQgdXNlciBvciB0b3BpYyBtYW5hZ2VyLlxuICAgKi9cbiAgLyoqXG4gICAqIFBhcmFtZXRlcnMgcGFzc2VkIHRvIHtAbGluayBUaW5vZGUjc3Vic2NyaWJlfS5cbiAgICpcbiAgICogQHR5cGVkZWYgU3Vic2NyaXB0aW9uUGFyYW1zXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBtZW1iZXJvZiBUaW5vZGVcbiAgICogQHByb3BlcnR5IHtUaW5vZGUuU2V0UGFyYW1zPX0gc2V0IC0gUGFyYW1ldGVycyB1c2VkIHRvIGluaXRpYWxpemUgdG9waWNcbiAgICogQHByb3BlcnR5IHtUaW5vZGUuR2V0UXVlcnk9fSBnZXQgLSBRdWVyeSBmb3IgZmV0Y2hpbmcgZGF0YSBmcm9tIHRvcGljLlxuICAgKi9cblxuICAvKipcbiAgICogU2VuZCBhIHRvcGljIHN1YnNjcmlwdGlvbiByZXF1ZXN0LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdG9waWMgLSBOYW1lIG9mIHRoZSB0b3BpYyB0byBzdWJzY3JpYmUgdG8uXG4gICAqIEBwYXJhbSB7VGlub2RlLkdldFF1ZXJ5PX0gZ2V0UGFyYW1zIC0gT3B0aW9uYWwgc3Vic2NyaXB0aW9uIG1ldGFkYXRhIHF1ZXJ5XG4gICAqIEBwYXJhbSB7VGlub2RlLlNldFBhcmFtcz19IHNldFBhcmFtcyAtIE9wdGlvbmFsIGluaXRpYWxpemF0aW9uIHBhcmFtZXRlcnNcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCBvbiByZWNlaXZpbmcgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpY05hbWUsIGdldFBhcmFtcywgc2V0UGFyYW1zKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdzdWInLCB0b3BpY05hbWUpXG4gICAgaWYgKCF0b3BpY05hbWUpIHtcbiAgICAgIHRvcGljTmFtZSA9IFRPUElDX05FVztcbiAgICB9XG5cbiAgICBwa3Quc3ViLmdldCA9IGdldFBhcmFtcztcblxuICAgIGlmIChzZXRQYXJhbXMpIHtcbiAgICAgIGlmIChzZXRQYXJhbXMuc3ViKSB7XG4gICAgICAgIHBrdC5zdWIuc2V0LnN1YiA9IHNldFBhcmFtcy5zdWI7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZXRQYXJhbXMuZGVzYykge1xuICAgICAgICBpZiAoVGlub2RlLmlzTmV3R3JvdXBUb3BpY05hbWUodG9waWNOYW1lKSkge1xuICAgICAgICAgIC8vIEZ1bGwgc2V0LmRlc2MgcGFyYW1zIGFyZSB1c2VkIGZvciBuZXcgdG9waWNzIG9ubHlcbiAgICAgICAgICBwa3Quc3ViLnNldC5kZXNjID0gc2V0UGFyYW1zLmRlc2M7XG4gICAgICAgIH0gZWxzZSBpZiAoVGlub2RlLmlzUDJQVG9waWNOYW1lKHRvcGljTmFtZSkgJiYgc2V0UGFyYW1zLmRlc2MuZGVmYWNzKSB7XG4gICAgICAgICAgLy8gVXNlIG9wdGlvbmFsIGRlZmF1bHQgcGVybWlzc2lvbnMgb25seS5cbiAgICAgICAgICBwa3Quc3ViLnNldC5kZXNjID0ge1xuICAgICAgICAgICAgZGVmYWNzOiBzZXRQYXJhbXMuZGVzYy5kZWZhY3NcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChzZXRQYXJhbXMudGFncykge1xuICAgICAgICBwa3Quc3ViLnNldC50YWdzID0gc2V0UGFyYW1zLnRhZ3M7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc2VuZChwa3QsIHBrdC5zdWIuaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZXRhY2ggYW5kIG9wdGlvbmFsbHkgdW5zdWJzY3JpYmUgZnJvbSB0aGUgdG9waWNcbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljIC0gVG9waWMgdG8gZGV0YWNoIGZyb20uXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdW5zdWIgLSBJZiA8Y29kZT50cnVlPC9jb2RlPiwgZGV0YWNoIGFuZCB1bnN1YnNjcmliZSwgb3RoZXJ3aXNlIGp1c3QgZGV0YWNoLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyBzZXJ2ZXIgcmVwbHkuXG4gICAqL1xuICBsZWF2ZTogZnVuY3Rpb24odG9waWMsIHVuc3ViKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdsZWF2ZScsIHRvcGljKTtcbiAgICBwa3QubGVhdmUudW5zdWIgPSB1bnN1YjtcblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QubGVhdmUuaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgbWVzc2FnZSBkcmFmdCB3aXRob3V0IHNlbmRpbmcgaXQgdG8gdGhlIHNlcnZlci5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gcHVibGlzaCB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBQYXlsb2FkIHRvIHB1Ymxpc2guXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IG5vRWNobyAtIElmIDxjb2RlPnRydWU8L2NvZGU+LCB0ZWxsIHRoZSBzZXJ2ZXIgbm90IHRvIGVjaG8gdGhlIG1lc3NhZ2UgdG8gdGhlIG9yaWdpbmFsIHNlc3Npb24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IG5ldyBtZXNzYWdlIHdoaWNoIGNhbiBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIgb3Igb3RoZXJ3aXNlIHVzZWQuXG4gICAqL1xuICBjcmVhdGVNZXNzYWdlOiBmdW5jdGlvbih0b3BpYywgZGF0YSwgbm9FY2hvKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdwdWInLCB0b3BpYyk7XG5cbiAgICBsZXQgZGZ0ID0gdHlwZW9mIGRhdGEgPT0gJ3N0cmluZycgPyBEcmFmdHkucGFyc2UoZGF0YSkgOiBkYXRhO1xuICAgIGlmIChkZnQgJiYgIURyYWZ0eS5pc1BsYWluVGV4dChkZnQpKSB7XG4gICAgICBwa3QucHViLmhlYWQgPSB7XG4gICAgICAgIG1pbWU6IERyYWZ0eS5nZXRDb250ZW50VHlwZSgpXG4gICAgICB9O1xuICAgICAgZGF0YSA9IGRmdDtcbiAgICB9XG4gICAgcGt0LnB1Yi5ub2VjaG8gPSBub0VjaG87XG4gICAgcGt0LnB1Yi5jb250ZW50ID0gZGF0YTtcblxuICAgIHJldHVybiBwa3QucHViO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQdWJsaXNoIHtkYXRhfSBtZXNzYWdlIHRvIHRvcGljLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdG9waWMgLSBOYW1lIG9mIHRoZSB0b3BpYyB0byBwdWJsaXNoIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFBheWxvYWQgdG8gcHVibGlzaC5cbiAgICogQHBhcmFtIHtib29sZWFuPX0gbm9FY2hvIC0gSWYgPGNvZGU+dHJ1ZTwvY29kZT4sIHRlbGwgdGhlIHNlcnZlciBub3QgdG8gZWNobyB0aGUgbWVzc2FnZSB0byB0aGUgb3JpZ2luYWwgc2Vzc2lvbi5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCBvbiByZWNlaXZpbmcgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGRhdGEsIG5vRWNobykge1xuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hNZXNzYWdlKFxuICAgICAgdGhpcy5jcmVhdGVNZXNzYWdlKHRvcGljLCBkYXRhLCBub0VjaG8pXG4gICAgKTtcbiAgfSxcblxuICAvKipcbiAgICogUHVibGlzaCBtZXNzYWdlIHRvIHRvcGljLiBUaGUgbWVzc2FnZSBzaG91bGQgYmUgY3JlYXRlZCBieSB7QGxpbmsgVGlub2RlI2NyZWF0ZU1lc3NhZ2V9LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcHViIC0gTWVzc2FnZSB0byBwdWJsaXNoLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyBzZXJ2ZXIgcmVwbHkuXG4gICAqL1xuICBwdWJsaXNoTWVzc2FnZTogZnVuY3Rpb24ocHViKSB7XG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY29weS4gTmVlZGVkIGluIG9yZGVyIHRvIGNsZWFyIGxvY2FsbHktYXNzaWduZWQgdGVtcCB2YWx1ZXM7XG4gICAgcHViID0gT2JqZWN0LmFzc2lnbih7fSwgcHViKTtcbiAgICBwdWIuc2VxID0gdW5kZWZpbmVkO1xuICAgIHB1Yi5mcm9tID0gdW5kZWZpbmVkO1xuICAgIHB1Yi50cyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy5zZW5kKHtcbiAgICAgIHB1YjogcHViXG4gICAgfSwgcHViLmlkKTtcbiAgfSxcblxuICAvKipcbiAgICogT3V0IG9mIGJhbmQgbm90aWZpY2F0aW9uOiBub3RpZnkgdG9waWMgdGhhdCBhbiBleHRlcm5hbCAocHVzaCkgbm90aWZpY2F0aW9uIHdhcyByZWNpdmVkIGJ5IHRoZSBjbGllbnQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpY05hbWUgLSBuYW1lIG9mIHRoZSB1cGRhdGVkIHRvcGljLlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxIC0gc2VxIElEIG9mIHRoZSBuZXcgbWVzc2FnZS5cbiAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3QgLSBVSUQgb2YgdGhlIHNlbmRlcjsgZGVmYXVsdCBpcyBjdXJyZW50LlxuICAgKi9cbiAgb29iTm90aWZpY2F0aW9uOiBmdW5jdGlvbih0b3BpY05hbWUsIHNlcSwgYWN0KSB7XG4gICAgY29uc3QgdG9waWMgPSB0aGlzLmNhY2hlR2V0KCd0b3BpYycsIHRvcGljTmFtZSk7XG4gICAgaWYgKHRvcGljKSB7XG4gICAgICB0b3BpYy5fdXBkYXRlUmVjZWl2ZWQoc2VxLCBhY3QpO1xuICAgICAgdGhpcy5nZXRNZVRvcGljKCkuX3JlZnJlc2hDb250YWN0KCdtc2cnLCB0b3BpYyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiBHZXRRdWVyeVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEBwcm9wZXJ0eSB7VGlub2RlLkdldE9wdHNUeXBlPX0gZGVzYyAtIElmIHByb3ZpZGVkIChldmVuIGlmIGVtcHR5KSwgZmV0Y2ggdG9waWMgZGVzY3JpcHRpb24uXG4gICAqIEBwcm9wZXJ0eSB7VGlub2RlLkdldE9wdHNUeXBlPX0gc3ViIC0gSWYgcHJvdmlkZWQgKGV2ZW4gaWYgZW1wdHkpLCBmZXRjaCB0b3BpYyBzdWJzY3JpcHRpb25zLlxuICAgKiBAcHJvcGVydHkge1Rpbm9kZS5HZXREYXRhVHlwZT19IGRhdGEgLSBJZiBwcm92aWRlZCAoZXZlbiBpZiBlbXB0eSksIGdldCBtZXNzYWdlcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIEB0eXBlZGVmIEdldE9wdHNUeXBlXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBtZW1iZXJvZiBUaW5vZGVcbiAgICogQHByb3BlcnR5IHtEYXRlPX0gaW1zIC0gXCJJZiBtb2RpZmllZCBzaW5jZVwiLCBmZXRjaCBkYXRhIG9ubHkgaXQgd2FzIHdhcyBtb2RpZmllZCBzaW5jZSBzdGF0ZWQgZGF0ZS5cbiAgICogQHByb3BlcnR5IHtudW1iZXI9fSBsaW1pdCAtIE1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgdG8gcmV0dXJuLiBJZ25vcmVkIHdoZW4gcXVlcnlpbmcgdG9waWMgZGVzY3JpcHRpb24uXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiBHZXREYXRhVHlwZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEBwcm9wZXJ0eSB7bnVtYmVyPX0gc2luY2UgLSBMb2FkIG1lc3NhZ2VzIHdpdGggc2VxIGlkIGVxdWFsIG9yIGdyZWF0ZXIgdGhhbiB0aGlzIHZhbHVlLlxuICAgKiBAcHJvcGVydHkge251bWJlcj19IGJlZm9yZSAtIExvYWQgbWVzc2FnZXMgd2l0aCBzZXEgaWQgbG93ZXIgdGhhbiB0aGlzIG51bWJlci5cbiAgICogQHByb3BlcnR5IHtudW1iZXI9fSBsaW1pdCAtIE1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgdG8gcmV0dXJuLlxuICAgKi9cblxuICAvKipcbiAgICogUmVxdWVzdCB0b3BpYyBtZXRhZGF0YVxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdG9waWMgLSBOYW1lIG9mIHRoZSB0b3BpYyB0byBxdWVyeS5cbiAgICogQHBhcmFtIHtUaW5vZGUuR2V0UXVlcnl9IHBhcmFtcyAtIFBhcmFtZXRlcnMgb2YgdGhlIHF1ZXJ5LiBVc2Uge0BsaW5rIFRpbm9kZS5NZXRhR2V0QnVpbGRlcn0gdG8gZ2VuZXJhdGUuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gcmVjZWl2aW5nIHNlcnZlciByZXBseS5cbiAgICovXG4gIGdldE1ldGE6IGZ1bmN0aW9uKHRvcGljLCBwYXJhbXMpIHtcbiAgICBjb25zdCBwa3QgPSB0aGlzLmluaXRQYWNrZXQoJ2dldCcsIHRvcGljKTtcblxuICAgIHBrdC5nZXQgPSBtZXJnZU9iaihwa3QuZ2V0LCBwYXJhbXMpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2VuZChwa3QsIHBrdC5nZXQuaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdG9waWMncyBtZXRhZGF0YTogZGVzY3JpcHRpb24sIHN1YnNjcmlidGlvbnMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpYyAtIFRvcGljIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIHtUaW5vZGUuU2V0UGFyYW1zfSBwYXJhbXMgLSB0b3BpYyBtZXRhZGF0YSB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gcmVjZWl2aW5nIHNlcnZlciByZXBseS5cbiAgICovXG4gIHNldE1ldGE6IGZ1bmN0aW9uKHRvcGljLCBwYXJhbXMpIHtcbiAgICBjb25zdCBwa3QgPSB0aGlzLmluaXRQYWNrZXQoJ3NldCcsIHRvcGljKTtcbiAgICBjb25zdCB3aGF0ID0gW107XG5cbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICBbJ2Rlc2MnLCAnc3ViJywgJ3RhZ3MnLCAnY3JlZCddLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgd2hhdC5wdXNoKGtleSk7XG4gICAgICAgICAgcGt0LnNldFtrZXldID0gcGFyYW1zW2tleV07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh3aGF0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiSW52YWxpZCB7c2V0fSBwYXJhbWV0ZXJzXCIpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zZW5kKHBrdCwgcGt0LnNldC5pZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJhbmdlIG9mIG1lc3NhZ2UgSURzIHRvIGRlbGV0ZS5cbiAgICpcbiAgICogQHR5cGVkZWYgRGVsUmFuZ2VcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQG1lbWJlcm9mIFRpbm9kZVxuICAgKiBAcHJvcGVydHkge251bWJlcn0gbG93IC0gbG93IGVuZCBvZiB0aGUgcmFuZ2UsIGluY2x1c2l2ZSAoY2xvc2VkKS5cbiAgICogQHByb3BlcnR5IHtudW1iZXI9fSBoaSAtIGhpZ2ggZW5kIG9mIHRoZSByYW5nZSwgZXhjbHVzaXZlIChvcGVuKS5cbiAgICovXG4gIC8qKlxuICAgKiBEZWxldGUgc29tZSBvciBhbGwgbWVzc2FnZXMgaW4gYSB0b3BpYy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljIC0gVG9waWMgbmFtZSB0byBkZWxldGUgbWVzc2FnZXMgZnJvbS5cbiAgICogQHBhcmFtIHtUaW5vZGUuRGVsUmFuZ2VbXX0gbGlzdCAtIFJhbmdlcyBvZiBtZXNzYWdlIElEcyB0byBkZWxldGUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGhhcmQgLSBIYXJkIG9yIHNvZnQgZGVsZXRlXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gcmVjZWl2aW5nIHNlcnZlciByZXBseS5cbiAgICovXG4gIGRlbE1lc3NhZ2VzOiBmdW5jdGlvbih0b3BpYywgcmFuZ2VzLCBoYXJkKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdkZWwnLCB0b3BpYyk7XG5cbiAgICBwa3QuZGVsLndoYXQgPSAnbXNnJztcbiAgICBwa3QuZGVsLmRlbHNlcSA9IHJhbmdlcztcbiAgICBwa3QuZGVsLmhhcmQgPSBoYXJkO1xuXG4gICAgcmV0dXJuIHRoaXMuc2VuZChwa3QsIHBrdC5kZWwuaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZWxldGUgdGhlIHRvcGljIGFsbHRvZ2V0aGVyLiBSZXF1aXJlcyBPd25lciBwZXJtaXNzaW9uLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdG9waWNOYW1lIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gZGVsZXRlXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaGFyZCAtIGhhcmQtZGVsZXRlIHRvcGljLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyBzZXJ2ZXIgcmVwbHkuXG4gICAqL1xuICBkZWxUb3BpYzogZnVuY3Rpb24odG9waWNOYW1lLCBoYXJkKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdkZWwnLCB0b3BpY05hbWUpO1xuICAgIHBrdC5kZWwud2hhdCA9ICd0b3BpYyc7XG4gICAgcGt0LmRlbC5oYXJkID0gaGFyZDtcblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QuZGVsLmlkKTtcbiAgfSxcblxuICAvKipcbiAgICogRGVsZXRlIHN1YnNjcmlwdGlvbi4gUmVxdWlyZXMgU2hhcmUgcGVybWlzc2lvbi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIE5hbWUgb2YgdGhlIHRvcGljIHRvIGRlbGV0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlciAtIFVzZXIgSUQgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyBzZXJ2ZXIgcmVwbHkuXG4gICAqL1xuICBkZWxTdWJzY3JpcHRpb246IGZ1bmN0aW9uKHRvcGljTmFtZSwgdXNlcikge1xuICAgIGNvbnN0IHBrdCA9IHRoaXMuaW5pdFBhY2tldCgnZGVsJywgdG9waWNOYW1lKTtcbiAgICBwa3QuZGVsLndoYXQgPSAnc3ViJztcbiAgICBwa3QuZGVsLnVzZXIgPSB1c2VyO1xuXG4gICAgcmV0dXJuIHRoaXMuc2VuZChwa3QsIHBrdC5kZWwuaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZWxldGUgY3JlZGVudGlhbC4gQWx3YXlzIHNlbnQgb24gPGNvZGU+J21lJzwvY29kZT4gdG9waWMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSB2YWxpZGF0aW9uIG1ldGhvZCBzdWNoIGFzIDxjb2RlPidlbWFpbCc8L2NvZGU+IG9yIDxjb2RlPid0ZWwnPC9jb2RlPi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gdmFsaWRhdGlvbiB2YWx1ZSwgaS5lLiA8Y29kZT4nYWxpY2VAZXhhbXBsZS5jb20nPC9jb2RlPi5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hpY2ggd2lsbCBiZSByZXNvbHZlZC9yZWplY3RlZCBvbiByZWNlaXZpbmcgc2VydmVyIHJlcGx5LlxuICAgKi9cbiAgZGVsQ3JlZGVudGlhbDogZnVuY3Rpb24obWV0aG9kLCB2YWx1ZSkge1xuICAgIGNvbnN0IHBrdCA9IHRoaXMuaW5pdFBhY2tldCgnZGVsJywgVE9QSUNfTUUpO1xuICAgIHBrdC5kZWwud2hhdCA9ICdjcmVkJztcbiAgICBwa3QuZGVsLmNyZWQgPSB7XG4gICAgICBtZXRoOiBtZXRob2QsXG4gICAgICB2YWw6IHZhbHVlXG4gICAgfTtcblxuICAgIHJldHVybiB0aGlzLnNlbmQocGt0LCBwa3QuZGVsLmlkKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVxdWVzdCB0byBkZWxldGUgYWNjb3VudCBvZiB0aGUgY3VycmVudCB1c2VyLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGhhcmQgLSBoYXJkLWRlbGV0ZSB1c2VyLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGljaCB3aWxsIGJlIHJlc29sdmVkL3JlamVjdGVkIG9uIHJlY2VpdmluZyBzZXJ2ZXIgcmVwbHkuXG4gICAqL1xuICBkZWxDdXJyZW50VXNlcjogZnVuY3Rpb24oaGFyZCkge1xuICAgIGNvbnN0IHBrdCA9IHRoaXMuaW5pdFBhY2tldCgnZGVsJywgbnVsbCk7XG4gICAgcGt0LmRlbC53aGF0ID0gJ3VzZXInO1xuICAgIHBrdC5kZWwuaGFyZCA9IGhhcmQ7XG5cbiAgICByZXR1cm4gdGhpcy5zZW5kKHBrdCwgcGt0LmRlbC5pZCkudGhlbigoY3RybCkgPT4ge1xuICAgICAgdGhpcy5fbXlVSUQgPSBudWxsO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBOb3RpZnkgc2VydmVyIHRoYXQgYSBtZXNzYWdlIG9yIG1lc3NhZ2VzIHdlcmUgcmVhZCBvciByZWNlaXZlZC4gRG9lcyBOT1QgcmV0dXJuIHByb21pc2UuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0b3BpY05hbWUgLSBOYW1lIG9mIHRoZSB0b3BpYyB3aGVyZSB0aGUgbWVzYWdlIGlzIGJlaW5nIGFrbm93bGVkZ2VkLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gd2hhdCAtIEFjdGlvbiBiZWluZyBha25vd2xlZGdlZCwgZWl0aGVyIDxjb2RlPlwicmVhZFwiPC9jb2RlPiBvciA8Y29kZT5cInJlY3ZcIjwvY29kZT4uXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZXEgLSBNYXhpbXVtIGlkIG9mIHRoZSBtZXNzYWdlIGJlaW5nIGFja25vd2xlZGdlZC5cbiAgICovXG4gIG5vdGU6IGZ1bmN0aW9uKHRvcGljTmFtZSwgd2hhdCwgc2VxKSB7XG4gICAgaWYgKHNlcSA8PSAwIHx8IHNlcSA+PSBMT0NBTF9TRVFJRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIG1lc3NhZ2UgaWQgJHtzZXF9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdub3RlJywgdG9waWNOYW1lKTtcbiAgICBwa3Qubm90ZS53aGF0ID0gd2hhdDtcbiAgICBwa3Qubm90ZS5zZXEgPSBzZXE7XG4gICAgdGhpcy5zZW5kKHBrdCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJyb2FkY2FzdCBhIGtleS1wcmVzcyBub3RpZmljYXRpb24gdG8gdG9waWMgc3Vic2NyaWJlcnMuIFVzZWQgdG8gc2hvd1xuICAgKiB0eXBpbmcgbm90aWZpY2F0aW9ucyBcInVzZXIgWCBpcyB0eXBpbmcuLi5cIi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIE5hbWUgb2YgdGhlIHRvcGljIHRvIGJyb2FkY2FzdCB0by5cbiAgICovXG4gIG5vdGVLZXlQcmVzczogZnVuY3Rpb24odG9waWNOYW1lKSB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5pbml0UGFja2V0KCdub3RlJywgdG9waWNOYW1lKTtcbiAgICBwa3Qubm90ZS53aGF0ID0gJ2twJztcbiAgICB0aGlzLnNlbmQocGt0KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGEgbmFtZWQgdG9waWMsIGVpdGhlciBwdWxsIGl0IGZyb20gY2FjaGUgb3IgY3JlYXRlIGEgbmV3IGluc3RhbmNlLlxuICAgKiBUaGVyZSBpcyBhIHNpbmdsZSBpbnN0YW5jZSBvZiB0b3BpYyBmb3IgZWFjaCBuYW1lLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdG9waWNOYW1lIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7VGlub2RlLlRvcGljfSBSZXF1ZXN0ZWQgb3IgbmV3bHkgY3JlYXRlZCB0b3BpYyBvciA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IGlmIHRvcGljIG5hbWUgaXMgaW52YWxpZC5cbiAgICovXG4gIGdldFRvcGljOiBmdW5jdGlvbih0b3BpY05hbWUpIHtcbiAgICBsZXQgdG9waWMgPSB0aGlzLmNhY2hlR2V0KCd0b3BpYycsIHRvcGljTmFtZSk7XG4gICAgaWYgKCF0b3BpYyAmJiB0b3BpY05hbWUpIHtcbiAgICAgIGlmICh0b3BpY05hbWUgPT0gVE9QSUNfTUUpIHtcbiAgICAgICAgdG9waWMgPSBuZXcgVG9waWNNZSgpO1xuICAgICAgfSBlbHNlIGlmICh0b3BpY05hbWUgPT0gVE9QSUNfRk5EKSB7XG4gICAgICAgIHRvcGljID0gbmV3IFRvcGljRm5kKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b3BpYyA9IG5ldyBUb3BpYyh0b3BpY05hbWUpO1xuICAgICAgfVxuICAgICAgLy8gQ2FjaGUgbWFuYWdlbWVudC5cbiAgICAgIHRoaXMuYXR0YWNoQ2FjaGVUb1RvcGljKHRvcGljKTtcbiAgICAgIHRvcGljLl9jYWNoZVB1dFNlbGYoKTtcbiAgICAgIC8vIERvbid0IHNhdmUgdG8gREIgaGVyZTogYSByZWNvcmQgd2lsbCBiZSBhZGRlZCB3aGVuIHRoZSB0b3BpYyBpcyBzdWJzY3JpYmVkLlxuICAgIH1cbiAgICByZXR1cm4gdG9waWM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIG5hbWVkIHRvcGljIGlzIGFscmVhZHkgcHJlc2VudCBpbiBjYWNoZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljTmFtZSAtIE5hbWUgb2YgdGhlIHRvcGljIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0b3BpYyBpcyBmb3VuZCBpbiBjYWNoZSwgZmFsc2Ugb3Rlcndpc2UuXG4gICAqL1xuICBpc1RvcGljQ2FjaGVkOiBmdW5jdGlvbih0b3BpY05hbWUpIHtcbiAgICByZXR1cm4gISF0aGlzLmNhY2hlR2V0KCd0b3BpYycsIHRvcGljTmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHVuaXF1ZSBuYW1lIGxpa2UgPGNvZGU+J25ldzEyMzQ1Nic8L2NvZGU+IHN1aXRhYmxlIGZvciBjcmVhdGluZyBhIG5ldyBncm91cCB0b3BpYy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBpc0NoYW4gLSBpZiB0aGUgdG9waWMgaXMgY2hhbm5lbC1lbmFibGVkLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBuYW1lIHdoaWNoIGNhbiBiZSB1c2VkIGZvciBjcmVhdGluZyBhIG5ldyBncm91cCB0b3BpYy5cbiAgICovXG4gIG5ld0dyb3VwVG9waWNOYW1lOiBmdW5jdGlvbihpc0NoYW4pIHtcbiAgICByZXR1cm4gKGlzQ2hhbiA/IFRPUElDX05FV19DSEFOIDogVE9QSUNfTkVXKSArIHRoaXMuZ2V0TmV4dFVuaXF1ZUlkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlIDxjb2RlPidtZSc8L2NvZGU+IHRvcGljIG9yIGdldCBpdCBmcm9tIGNhY2hlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLlRvcGljTWV9IEluc3RhbmNlIG9mIDxjb2RlPidtZSc8L2NvZGU+IHRvcGljLlxuICAgKi9cbiAgZ2V0TWVUb3BpYzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VG9waWMoVE9QSUNfTUUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZSA8Y29kZT4nZm5kJzwvY29kZT4gKGZpbmQpIHRvcGljIG9yIGdldCBpdCBmcm9tIGNhY2hlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLlRvcGljfSBJbnN0YW5jZSBvZiA8Y29kZT4nZm5kJzwvY29kZT4gdG9waWMuXG4gICAqL1xuICBnZXRGbmRUb3BpYzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VG9waWMoVE9QSUNfRk5EKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHtAbGluayBMYXJnZUZpbGVIZWxwZXJ9IGluc3RhbmNlXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTGFyZ2VGaWxlSGVscGVyfSBpbnN0YW5jZSBvZiBhIHtAbGluayBUaW5vZGUuTGFyZ2VGaWxlSGVscGVyfS5cbiAgICovXG4gIGdldExhcmdlRmlsZUhlbHBlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBMYXJnZUZpbGVIZWxwZXIodGhpcywgUFJPVE9DT0xfVkVSU0lPTik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgVUlEIG9mIHRoZSB0aGUgY3VycmVudCBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFVJRCBvZiB0aGUgY3VycmVudCB1c2VyIG9yIDxjb2RlPnVuZGVmaW5lZDwvY29kZT4gaWYgdGhlIHNlc3Npb24gaXMgbm90IHlldCBhdXRoZW50aWNhdGVkIG9yIGlmIHRoZXJlIGlzIG5vIHNlc3Npb24uXG4gICAqL1xuICBnZXRDdXJyZW50VXNlcklEOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbXlVSUQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBnaXZlbiB1c2VyIElEIGlzIGVxdWFsIHRvIHRoZSBjdXJyZW50IHVzZXIncyBVSUQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1aWQgLSBVSUQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHRoZSBnaXZlbiBVSUQgYmVsb25ncyB0byB0aGUgY3VycmVudCBsb2dnZWQgaW4gdXNlci5cbiAgICovXG4gIGlzTWU6IGZ1bmN0aW9uKHVpZCkge1xuICAgIHJldHVybiB0aGlzLl9teVVJRCA9PT0gdWlkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgbG9naW4gdXNlZCBmb3IgbGFzdCBzdWNjZXNzZnVsIGF1dGhlbnRpY2F0aW9uLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBsb2dpbiBsYXN0IHVzZWQgc3VjY2Vzc2Z1bGx5IG9yIDxjb2RlPnVuZGVmaW5lZDwvY29kZT4uXG4gICAqL1xuICBnZXRDdXJyZW50TG9naW46IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2dpbjtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJuIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzZXJ2ZXI6IHByb3RvY29sIHZlcnNpb24gYW5kIGJ1aWxkIHRpbWVzdGFtcC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHJldHVybnMge09iamVjdH0gYnVpbGQgYW5kIHZlcnNpb24gb2YgdGhlIHNlcnZlciBvciA8Y29kZT5udWxsPC9jb2RlPiBpZiB0aGVyZSBpcyBubyBjb25uZWN0aW9uIG9yIGlmIHRoZSBmaXJzdCBzZXJ2ZXIgcmVzcG9uc2UgaGFzIG5vdCBiZWVuIHJlY2VpdmVkIHlldC5cbiAgICovXG4gIGdldFNlcnZlckluZm86IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXJJbmZvO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gc2VydmVyLXByb3ZpZGVkIGNvbmZpZ3VyYXRpb24gdmFsdWUgKGxvbmcgaW50ZWdlcikuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIG9mIHRoZSB2YWx1ZSB0byByZXR1cm5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRWYWx1ZSB0byByZXR1cm4gaW4gY2FzZSBzZXJ2ZXIgbGltaXQgaXMgbm90IHNldCBvciBub3QgZm91bmQuXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IG5hbWVkIHZhbHVlLlxuICAgKi9cbiAgZ2V0U2VydmVyTGltaXQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmF1bHRWYWx1ZSkge1xuICAgIHJldHVybiAodGhpcy5fc2VydmVySW5mbyA/IHRoaXMuX3NlcnZlckluZm9bbmFtZV0gOiBudWxsKSB8fCBkZWZhdWx0VmFsdWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRvZ2dsZSBjb25zb2xlIGxvZ2dpbmcuIExvZ2dpbmcgaXMgb2ZmIGJ5IGRlZmF1bHQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlZCAtIFNldCB0byA8Y29kZT50cnVlPC9jb2RlPiB0byBlbmFibGUgbG9nZ2luZyB0byBjb25zb2xlLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHRyaW1Mb25nU3RyaW5ncyAtIFNldCB0byA8Y29kZT50cnVlPC9jb2RlPiB0byB0cmltIGxvbmcgc3RyaW5ncy5cbiAgICovXG4gIGVuYWJsZUxvZ2dpbmc6IGZ1bmN0aW9uKGVuYWJsZWQsIHRyaW1Mb25nU3RyaW5ncykge1xuICAgIHRoaXMuX2xvZ2dpbmdFbmFibGVkID0gZW5hYmxlZDtcbiAgICB0aGlzLl90cmltTG9uZ1N0cmluZ3MgPSBlbmFibGVkICYmIHRyaW1Mb25nU3RyaW5ncztcbiAgfSxcblxuICAvKipcbiAgICogU2V0IFVJIGxhbmd1YWdlIHRvIHJlcG9ydCB0byB0aGUgc2VydmVyLiBNdXN0IGJlIGNhbGxlZCBiZWZvcmUgPGNvZGU+J2hpJzwvY29kZT4gaXMgc2VudCwgb3RoZXJ3aXNlIGl0IHdpbGwgbm90IGJlIHVzZWQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBobCAtIGh1bWFuIChVSSkgbGFuZ3VhZ2UsIGxpa2UgPGNvZGU+XCJlbl9VU1wiPC9jb2RlPiBvciA8Y29kZT5cInpoLUhhbnNcIjwvY29kZT4uXG4gICAqL1xuICBzZXRIdW1hbkxhbmd1YWdlOiBmdW5jdGlvbihobCkge1xuICAgIGlmIChobCkge1xuICAgICAgdGhpcy5faHVtYW5MYW5ndWFnZSA9IGhsO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgZ2l2ZW4gdG9waWMgaXMgb25saW5lLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBvZiB0aGUgdG9waWMgdG8gdGVzdC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgdG9waWMgaXMgb25saW5lLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBpc1RvcGljT25saW5lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgY29uc3QgdG9waWMgPSB0aGlzLmNhY2hlR2V0KCd0b3BpYycsIG5hbWUpO1xuICAgIHJldHVybiB0b3BpYyAmJiB0b3BpYy5vbmxpbmU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhY2Nlc3MgbW9kZSBmb3IgdGhlIGdpdmVuIGNvbnRhY3QuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIG9mIHRoZSB0b3BpYyB0byBxdWVyeS5cbiAgICogQHJldHVybnMge0FjY2Vzc01vZGV9IGFjY2VzcyBtb2RlIGlmIHRvcGljIGlzIGZvdW5kLCBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIGdldFRvcGljQWNjZXNzTW9kZTogZnVuY3Rpb24obmFtZSkge1xuICAgIGNvbnN0IHRvcGljID0gdGhpcy5jYWNoZUdldCgndG9waWMnLCBuYW1lKTtcbiAgICByZXR1cm4gdG9waWMgPyB0b3BpYy5hY3MgOiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbmNsdWRlIG1lc3NhZ2UgSUQgaW50byBhbGwgc3Vic2VxdWVzdCBtZXNzYWdlcyB0byBzZXJ2ZXIgaW5zdHJ1Y3RpbiBpdCB0byBzZW5kIGFrbm93bGVkZ2VtZW5zLlxuICAgKiBSZXF1aXJlZCBmb3IgcHJvbWlzZXMgdG8gZnVuY3Rpb24uIERlZmF1bHQgaXMgPGNvZGU+XCJvblwiPC9jb2RlPi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBzdGF0dXMgLSBUdXJuIGFrbm93bGVkZ2VtZW5zIG9uIG9yIG9mZi5cbiAgICogQGRlcHJlY2F0ZWRcbiAgICovXG4gIHdhbnRBa246IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgIHRoaXMuX21lc3NhZ2VJZCA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRikgKyAweEZGRkZGRik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21lc3NhZ2VJZCA9IDA7XG4gICAgfVxuICB9LFxuXG4gIC8vIENhbGxiYWNrczpcbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlcG9ydCB3aGVuIHRoZSB3ZWJzb2NrZXQgaXMgb3BlbmVkLiBUaGUgY2FsbGJhY2sgaGFzIG5vIHBhcmFtZXRlcnMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEB0eXBlIHtUaW5vZGUub25XZWJzb2NrZXRPcGVufVxuICAgKi9cbiAgb25XZWJzb2NrZXRPcGVuOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIEB0eXBlZGVmIFRpbm9kZS5TZXJ2ZXJQYXJhbXNcbiAgICogQG1lbWJlcm9mIFRpbm9kZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gdmVyIC0gU2VydmVyIHZlcnNpb25cbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IGJ1aWxkIC0gU2VydmVyIGJ1aWxkXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nPX0gc2lkIC0gU2Vzc2lvbiBJRCwgbG9uZyBwb2xsaW5nIGNvbm5lY3Rpb25zIG9ubHkuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgVGlub2RlLm9uQ29ubmVjdFxuICAgKiBAcGFyYW0ge251bWJlcn0gY29kZSAtIFJlc3VsdCBjb2RlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCBlcHhwbGFpbmluZyB0aGUgY29tcGxldGlvbiwgaS5lIFwiT0tcIiBvciBhbiBlcnJvciBtZXNzYWdlLlxuICAgKiBAcGFyYW0ge1Rpbm9kZS5TZXJ2ZXJQYXJhbXN9IHBhcmFtcyAtIFBhcmFtZXRlcnMgcmV0dXJuZWQgYnkgdGhlIHNlcnZlci5cbiAgICovXG4gIC8qKlxuICAgKiBDYWxsYmFjayB0byByZXBvcnQgd2hlbiBjb25uZWN0aW9uIHdpdGggVGlub2RlIHNlcnZlciBpcyBlc3RhYmxpc2hlZC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHR5cGUge1Rpbm9kZS5vbkNvbm5lY3R9XG4gICAqL1xuICBvbkNvbm5lY3Q6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogQ2FsbGJhY2sgdG8gcmVwb3J0IHdoZW4gY29ubmVjdGlvbiBpcyBsb3N0LiBUaGUgY2FsbGJhY2sgaGFzIG5vIHBhcmFtZXRlcnMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEB0eXBlIHtUaW5vZGUub25EaXNjb25uZWN0fVxuICAgKi9cbiAgb25EaXNjb25uZWN0OiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIEBjYWxsYmFjayBUaW5vZGUub25Mb2dpblxuICAgKiBAcGFyYW0ge251bWJlcn0gY29kZSAtIE5VbWVyaWMgY29tcGxldGlvbiBjb2RlLCBzYW1lIGFzIEhUVFAgc3RhdHVzIGNvZGVzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIEV4cGxhbmF0aW9uIG9mIHRoZSBjb21wbGV0aW9uIGNvZGUuXG4gICAqL1xuICAvKipcbiAgICogQ2FsbGJhY2sgdG8gcmVwb3J0IGxvZ2luIGNvbXBsZXRpb24uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEB0eXBlIHtUaW5vZGUub25Mb2dpbn1cbiAgICovXG4gIG9uTG9naW46IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogQ2FsbGJhY2sgdG8gcmVjZWl2ZSA8Y29kZT57Y3RybH08L2NvZGU+IChjb250cm9sKSBtZXNzYWdlcy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHR5cGUge1Rpbm9kZS5vbkN0cmxNZXNzYWdlfVxuICAgKi9cbiAgb25DdHJsTWVzc2FnZTogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayB0byByZWNpZXZlIDxjb2RlPntkYXRhfTwvY29kZT4gKGNvbnRlbnQpIG1lc3NhZ2VzLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKiBAdHlwZSB7VGlub2RlLm9uRGF0YU1lc3NhZ2V9XG4gICAqL1xuICBvbkRhdGFNZXNzYWdlOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlY2VpdmUgPGNvZGU+e3ByZXN9PC9jb2RlPiAocHJlc2VuY2UpIG1lc3NhZ2VzLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKiBAdHlwZSB7VGlub2RlLm9uUHJlc01lc3NhZ2V9XG4gICAqL1xuICBvblByZXNNZXNzYWdlOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlY2VpdmUgYWxsIG1lc3NhZ2VzIGFzIG9iamVjdHMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEB0eXBlIHtUaW5vZGUub25NZXNzYWdlfVxuICAgKi9cbiAgb25NZXNzYWdlOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlY2VpdmUgYWxsIG1lc3NhZ2VzIGFzIHVucGFyc2VkIHRleHQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUjXG4gICAqIEB0eXBlIHtUaW5vZGUub25SYXdNZXNzYWdlfVxuICAgKi9cbiAgb25SYXdNZXNzYWdlOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlY2VpdmUgc2VydmVyIHJlc3BvbnNlcyB0byBuZXR3b3JrIHByb2Jlcy4gU2VlIHtAbGluayBUaW5vZGUjbmV0d29ya1Byb2JlfVxuICAgKiBAbWVtYmVyb2YgVGlub2RlI1xuICAgKiBAdHlwZSB7VGlub2RlLm9uTmV0d29ya1Byb2JlfVxuICAgKi9cbiAgb25OZXR3b3JrUHJvYmU6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogQ2FsbGJhY2sgdG8gYmUgbm90aWZpZWQgd2hlbiBleHBvbmVudGlhbCBiYWNrb2ZmIGlzIGl0ZXJhdGluZy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZSNcbiAgICogQHR5cGUge1Rpbm9kZS5vbkF1dG9yZWNvbm5lY3RJdGVyYXRpb259XG4gICAqL1xuICBvbkF1dG9yZWNvbm5lY3RJdGVyYXRpb246IHVuZGVmaW5lZCxcbn07XG5cbi8qKlxuICogQGNhbGxiYWNrIFRpbm9kZS5Ub3BpYy5vbkRhdGFcbiAqIEBwYXJhbSB7RGF0YX0gZGF0YSAtIERhdGEgcGFja2V0XG4gKi9cbi8qKlxuICogVG9waWMgaXMgYSBjbGFzcyByZXByZXNlbnRpbmcgYSBsb2dpY2FsIGNvbW11bmljYXRpb24gY2hhbm5lbC5cbiAqIEBjbGFzcyBUb3BpY1xuICogQG1lbWJlcm9mIFRpbm9kZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gY3JlYXRlLlxuICogQHBhcmFtIHtPYmplY3Q9fSBjYWxsYmFja3MgLSBPYmplY3Qgd2l0aCB2YXJpb3VzIGV2ZW50IGNhbGxiYWNrcy5cbiAqIEBwYXJhbSB7VGlub2RlLlRvcGljLm9uRGF0YX0gY2FsbGJhY2tzLm9uRGF0YSAtIENhbGxiYWNrIHdoaWNoIHJlY2VpdmVzIGEgPGNvZGU+e2RhdGF9PC9jb2RlPiBtZXNzYWdlLlxuICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2tzLm9uTWV0YSAtIENhbGxiYWNrIHdoaWNoIHJlY2VpdmVzIGEgPGNvZGU+e21ldGF9PC9jb2RlPiBtZXNzYWdlLlxuICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2tzLm9uUHJlcyAtIENhbGxiYWNrIHdoaWNoIHJlY2VpdmVzIGEgPGNvZGU+e3ByZXN9PC9jb2RlPiBtZXNzYWdlLlxuICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2tzLm9uSW5mbyAtIENhbGxiYWNrIHdoaWNoIHJlY2VpdmVzIGFuIDxjb2RlPntpbmZvfTwvY29kZT4gbWVzc2FnZS5cbiAqIEBwYXJhbSB7Y2FsbGJhY2t9IGNhbGxiYWNrcy5vbk1ldGFEZXNjIC0gQ2FsbGJhY2sgd2hpY2ggcmVjZWl2ZXMgY2hhbmdlcyB0byB0b3BpYyBkZXNjdGlvcHRpb24ge0BsaW5rIGRlc2N9LlxuICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2tzLm9uTWV0YVN1YiAtIENhbGxlZCBmb3IgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHJlY29yZCBjaGFuZ2UuXG4gKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFja3Mub25TdWJzVXBkYXRlZCAtIENhbGxlZCBhZnRlciBhIGJhdGNoIG9mIHN1YnNjcmlwdGlvbiBjaGFuZ2VzIGhhdmUgYmVlbiByZWNpZXZlZCBhbmQgY2FjaGVkLlxuICogQHBhcmFtIHtjYWxsYmFja30gY2FsbGJhY2tzLm9uRGVsZXRlVG9waWMgLSBDYWxsZWQgYWZ0ZXIgdGhlIHRvcGljIGlzIGRlbGV0ZWQuXG4gKiBAcGFyYW0ge2NhbGxiYWNrfSBjYWxsYmFjbHMub25BbGxNZXNzYWdlc1JlY2VpdmVkIC0gQ2FsbGVkIHdoZW4gYWxsIHJlcXVlc3RlZCA8Y29kZT57ZGF0YX08L2NvZGU+IG1lc3NhZ2VzIGhhdmUgYmVlbiByZWNpdmVkLlxuICovXG52YXIgVG9waWMgPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFja3MpIHtcbiAgLy8gUGFyZW50IFRpbm9kZSBvYmplY3QuXG4gIHRoaXMuX3Rpbm9kZSA9IG51bGw7XG5cbiAgLy8gU2VydmVyLXByb3ZpZGVkIGRhdGEsIGxvY2FsbHkgaW1tdXRhYmxlLlxuICAvLyB0b3BpYyBuYW1lXG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vIFRpbWVzdGFtcCB3aGVuIHRoZSB0b3BpYyB3YXMgY3JlYXRlZC5cbiAgdGhpcy5jcmVhdGVkID0gbnVsbDtcbiAgLy8gVGltZXN0YW1wIHdoZW4gdGhlIHRvcGljIHdhcyBsYXN0IHVwZGF0ZWQuXG4gIHRoaXMudXBkYXRlZCA9IG51bGw7XG4gIC8vIFRpbWVzdGFtcCBvZiB0aGUgbGFzdCBtZXNzYWdlc1xuICB0aGlzLnRvdWNoZWQgPSBuZXcgRGF0ZSgwKTtcbiAgLy8gQWNjZXNzIG1vZGUsIHNlZSBBY2Nlc3NNb2RlXG4gIHRoaXMuYWNzID0gbmV3IEFjY2Vzc01vZGUobnVsbCk7XG4gIC8vIHBlci10b3BpYyBwcml2YXRlIGRhdGFcbiAgdGhpcy5wcml2YXRlID0gbnVsbDtcbiAgLy8gcGVyLXRvcGljIHB1YmxpYyBkYXRhXG4gIHRoaXMucHVibGljID0gbnVsbDtcblxuICAvLyBMb2NhbGx5IGNhY2hlZCBkYXRhXG4gIC8vIFN1YnNjcmliZWQgdXNlcnMsIGZvciB0cmFja2luZyByZWFkL3JlY3YvbXNnIG5vdGlmaWNhdGlvbnMuXG4gIHRoaXMuX3VzZXJzID0ge307XG5cbiAgLy8gQ3VycmVudCB2YWx1ZSBvZiBsb2NhbGx5IGlzc3VlZCBzZXFJZCwgdXNlZCBmb3IgcGVuZGluZyBtZXNzYWdlcy5cbiAgdGhpcy5fcXVldWVkU2VxSWQgPSBMT0NBTF9TRVFJRDtcblxuICAvLyBUaGUgbWF4aW11bSBrbm93biB7ZGF0YS5zZXF9IHZhbHVlLlxuICB0aGlzLl9tYXhTZXEgPSAwO1xuICAvLyBUaGUgbWluaW11bSBrbm93biB7ZGF0YS5zZXF9IHZhbHVlLlxuICB0aGlzLl9taW5TZXEgPSAwO1xuICAvLyBJbmRpY2F0b3IgdGhhdCB0aGUgbGFzdCByZXF1ZXN0IGZvciBlYXJsaWVyIG1lc3NhZ2VzIHJldHVybmVkIDAuXG4gIHRoaXMuX25vRWFybGllck1zZ3MgPSBmYWxzZTtcbiAgLy8gVGhlIG1heGltdW0ga25vd24gZGVsZXRpb24gSUQuXG4gIHRoaXMuX21heERlbCA9IDA7XG4gIC8vIFVzZXIgZGlzY292ZXJ5IHRhZ3NcbiAgdGhpcy5fdGFncyA9IFtdO1xuICAvLyBDcmVkZW50aWFscyBzdWNoIGFzIGVtYWlsIG9yIHBob25lIG51bWJlci5cbiAgdGhpcy5fY3JlZGVudGlhbHMgPSBbXTtcbiAgLy8gTWVzc2FnZSBjYWNoZSwgc29ydGVkIGJ5IG1lc3NhZ2Ugc2VxIHZhbHVlcywgZnJvbSBvbGQgdG8gbmV3LlxuICB0aGlzLl9tZXNzYWdlcyA9IENCdWZmZXIoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLnNlcSAtIGIuc2VxO1xuICB9LCB0cnVlKTtcbiAgLy8gQm9vbGVhbiwgdHJ1ZSBpZiB0aGUgdG9waWMgaXMgY3VycmVudGx5IGxpdmVcbiAgdGhpcy5fc3Vic2NyaWJlZCA9IGZhbHNlO1xuICAvLyBUaW1lc3RhcCBvZiB0aGUgbW9zdCByZWNlbnRseSB1cGRhdGVkIHN1YnNjcmlwdGlvbi5cbiAgdGhpcy5fbGFzdFN1YnNVcGRhdGUgPSBuZXcgRGF0ZSgwKTtcbiAgLy8gVG9waWMgY3JlYXRlZCBidXQgbm90IHlldCBzeW5jZWQgd2l0aCB0aGUgc2VydmVyLiBVc2VkIG9ubHkgZHVyaW5nIGluaXRpYWxpemF0aW9uLlxuICB0aGlzLl9uZXcgPSB0cnVlO1xuXG4gIC8vIENhbGxiYWNrc1xuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5vbkRhdGEgPSBjYWxsYmFja3Mub25EYXRhO1xuICAgIHRoaXMub25NZXRhID0gY2FsbGJhY2tzLm9uTWV0YTtcbiAgICB0aGlzLm9uUHJlcyA9IGNhbGxiYWNrcy5vblByZXM7XG4gICAgdGhpcy5vbkluZm8gPSBjYWxsYmFja3Mub25JbmZvO1xuICAgIC8vIEEgc2luZ2xlIGRlc2MgdXBkYXRlO1xuICAgIHRoaXMub25NZXRhRGVzYyA9IGNhbGxiYWNrcy5vbk1ldGFEZXNjO1xuICAgIC8vIEEgc2luZ2xlIHN1YnNjcmlwdGlvbiByZWNvcmQ7XG4gICAgdGhpcy5vbk1ldGFTdWIgPSBjYWxsYmFja3Mub25NZXRhU3ViO1xuICAgIC8vIEFsbCBzdWJzY3JpcHRpb24gcmVjb3JkcyByZWNlaXZlZDtcbiAgICB0aGlzLm9uU3Vic1VwZGF0ZWQgPSBjYWxsYmFja3Mub25TdWJzVXBkYXRlZDtcbiAgICB0aGlzLm9uVGFnc1VwZGF0ZWQgPSBjYWxsYmFja3Mub25UYWdzVXBkYXRlZDtcbiAgICB0aGlzLm9uQ3JlZHNVcGRhdGVkID0gY2FsbGJhY2tzLm9uQ3JlZHNVcGRhdGVkO1xuICAgIHRoaXMub25EZWxldGVUb3BpYyA9IGNhbGxiYWNrcy5vbkRlbGV0ZVRvcGljO1xuICAgIHRoaXMub25BbGxNZXNzYWdlc1JlY2VpdmVkID0gY2FsbGJhY2tzLm9uQWxsTWVzc2FnZXNSZWNlaXZlZDtcbiAgfVxufTtcblxuVG9waWMucHJvdG90eXBlID0ge1xuICAvKipcbiAgICogQ2hlY2sgaWYgdGhlIHRvcGljIGlzIHN1YnNjcmliZWQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlzIHRvcGljIGlzIGF0dGFjaGVkL3N1YnNjcmliZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIGlzU3Vic2NyaWJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N1YnNjcmliZWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlcXVlc3QgdG9waWMgdG8gc3Vic2NyaWJlLiBXcmFwcGVyIGZvciB7QGxpbmsgVGlub2RlI3N1YnNjcmliZX0uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7VGlub2RlLkdldFF1ZXJ5PX0gZ2V0UGFyYW1zIC0gZ2V0IHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7VGlub2RlLlNldFBhcmFtcz19IHNldFBhcmFtcyAtIHNldCBwYXJhbWV0ZXJzLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgdG8gdGhlIHJlcXVlc3QuXG4gICAqL1xuICBzdWJzY3JpYmU6IGZ1bmN0aW9uKGdldFBhcmFtcywgc2V0UGFyYW1zKSB7XG4gICAgLy8gSWYgdGhlIHRvcGljIGlzIGFscmVhZHkgc3Vic2NyaWJlZCwgcmV0dXJuIHJlc29sdmVkIHByb21pc2VcbiAgICBpZiAodGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBTZW5kIHN1YnNjcmliZSBtZXNzYWdlLCBoYW5kbGUgYXN5bmMgcmVzcG9uc2UuXG4gICAgLy8gSWYgdG9waWMgbmFtZSBpcyBleHBsaWNpdGx5IHByb3ZpZGVkLCB1c2UgaXQuIElmIG5vIG5hbWUsIHRoZW4gaXQncyBhIG5ldyBncm91cCB0b3BpYyxcbiAgICAvLyB1c2UgXCJuZXdcIi5cbiAgICByZXR1cm4gdGhpcy5fdGlub2RlLnN1YnNjcmliZSh0aGlzLm5hbWUgfHwgVE9QSUNfTkVXLCBnZXRQYXJhbXMsIHNldFBhcmFtcykudGhlbigoY3RybCkgPT4ge1xuICAgICAgaWYgKGN0cmwuY29kZSA+PSAzMDApIHtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiBzdWJzY3JpcHRpb24gc3RhdHVzIGhhcyBub3QgY2hhbmdlZC5cbiAgICAgICAgcmV0dXJuIGN0cmw7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3N1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgdGhpcy5hY3MgPSAoY3RybC5wYXJhbXMgJiYgY3RybC5wYXJhbXMuYWNzKSA/IGN0cmwucGFyYW1zLmFjcyA6IHRoaXMuYWNzO1xuXG4gICAgICAvLyBTZXQgdG9waWMgbmFtZSBmb3IgbmV3IHRvcGljcyBhbmQgYWRkIGl0IHRvIGNhY2hlLlxuICAgICAgaWYgKHRoaXMuX25ldykge1xuICAgICAgICB0aGlzLl9uZXcgPSBmYWxzZTtcblxuICAgICAgICBpZiAodGhpcy5uYW1lICE9IGN0cmwudG9waWMpIHtcbiAgICAgICAgICAvLyBOYW1lIG1heSBjaGFuZ2UgbmV3MTIzNDU2IC0+IGdycEFiQ2RFZi4gUmVtb3ZlIGZyb20gY2FjaGUgdW5kZXIgdGhlIG9sZCBuYW1lLlxuICAgICAgICAgIHRoaXMuX2NhY2hlRGVsU2VsZigpO1xuICAgICAgICAgIHRoaXMubmFtZSA9IGN0cmwudG9waWM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2FjaGVQdXRTZWxmKCk7XG5cbiAgICAgICAgdGhpcy5jcmVhdGVkID0gY3RybC50cztcbiAgICAgICAgdGhpcy51cGRhdGVkID0gY3RybC50cztcbiAgICAgICAgdGhpcy50b3VjaGVkID0gY3RybC50cztcblxuICAgICAgICBpZiAodGhpcy5uYW1lICE9IFRPUElDX01FICYmIHRoaXMubmFtZSAhPSBUT1BJQ19GTkQpIHtcbiAgICAgICAgICAvLyBBZGQgdGhlIG5ldyB0b3BpYyB0byB0aGUgbGlzdCBvZiBjb250YWN0cyBtYWludGFpbmVkIGJ5IHRoZSAnbWUnIHRvcGljLlxuICAgICAgICAgIGNvbnN0IG1lID0gdGhpcy5fdGlub2RlLmdldE1lVG9waWMoKTtcbiAgICAgICAgICBpZiAobWUub25NZXRhU3ViKSB7XG4gICAgICAgICAgICBtZS5vbk1ldGFTdWIodGhpcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtZS5vblN1YnNVcGRhdGVkKSB7XG4gICAgICAgICAgICBtZS5vblN1YnNVcGRhdGVkKFt0aGlzLm5hbWVdLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2V0UGFyYW1zICYmIHNldFBhcmFtcy5kZXNjKSB7XG4gICAgICAgICAgc2V0UGFyYW1zLmRlc2MuX25vRm9yd2FyZGluZyA9IHRydWU7XG4gICAgICAgICAgdGhpcy5fcHJvY2Vzc01ldGFEZXNjKHNldFBhcmFtcy5kZXNjKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY3RybDtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgZHJhZnQgb2YgYSBtZXNzYWdlIHdpdGhvdXQgc2VuZGluZyBpdCB0byB0aGUgc2VydmVyLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZyB8IE9iamVjdH0gZGF0YSAtIENvbnRlbnQgdG8gd3JhcCBpbiBhIGRyYWZ0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBub0VjaG8gLSBJZiA8Y29kZT50cnVlPC9jb2RlPiBzZXJ2ZXIgd2lsbCBub3QgZWNobyBtZXNzYWdlIGJhY2sgdG8gb3JpZ2luYXRpbmdcbiAgICogc2Vzc2lvbi4gT3RoZXJ3aXNlIHRoZSBzZXJ2ZXIgd2lsbCBzZW5kIGEgY29weSBvZiB0aGUgbWVzc2FnZSB0byBzZW5kZXIuXG4gICAqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IG1lc3NhZ2UgZHJhZnQuXG4gICAqL1xuICBjcmVhdGVNZXNzYWdlOiBmdW5jdGlvbihkYXRhLCBub0VjaG8pIHtcbiAgICByZXR1cm4gdGhpcy5fdGlub2RlLmNyZWF0ZU1lc3NhZ2UodGhpcy5uYW1lLCBkYXRhLCBub0VjaG8pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbW1lZGlhdGVseSBwdWJsaXNoIGRhdGEgdG8gdG9waWMuIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjcHVibGlzaH0uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nIHwgT2JqZWN0fSBkYXRhIC0gRGF0YSB0byBwdWJsaXNoLCBlaXRoZXIgcGxhaW4gc3RyaW5nIG9yIGEgRHJhZnR5IG9iamVjdC5cbiAgICogQHBhcmFtIHtib29sZWFuPX0gbm9FY2hvIC0gSWYgPGNvZGU+dHJ1ZTwvY29kZT4gc2VydmVyIHdpbGwgbm90IGVjaG8gbWVzc2FnZSBiYWNrIHRvIG9yaWdpbmF0aW5nXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB0byB0aGUgcmVxdWVzdC5cbiAgICovXG4gIHB1Ymxpc2g6IGZ1bmN0aW9uKGRhdGEsIG5vRWNobykge1xuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hNZXNzYWdlKHRoaXMuY3JlYXRlTWVzc2FnZShkYXRhLCBub0VjaG8pKTtcbiAgfSxcblxuICAvKipcbiAgICogUHVibGlzaCBtZXNzYWdlIGNyZWF0ZWQgYnkge0BsaW5rIFRpbm9kZS5Ub3BpYyNjcmVhdGVNZXNzYWdlfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHB1YiAtIHtkYXRhfSBvYmplY3QgdG8gcHVibGlzaC4gTXVzdCBiZSBjcmVhdGVkIGJ5IHtAbGluayBUaW5vZGUuVG9waWMjY3JlYXRlTWVzc2FnZX1cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgdG8gYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHRvIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgcHVibGlzaE1lc3NhZ2U6IGZ1bmN0aW9uKHB1Yikge1xuICAgIGlmICghdGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNhbm5vdCBwdWJsaXNoIG9uIGluYWN0aXZlIHRvcGljXCIpKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgaGVhZGVyIHdpdGggYXR0YWNobWVudCByZWNvcmRzLlxuICAgIGlmIChEcmFmdHkuaGFzQXR0YWNobWVudHMocHViLmNvbnRlbnQpICYmICFwdWIuaGVhZC5hdHRhY2htZW50cykge1xuICAgICAgbGV0IGF0dGFjaG1lbnRzID0gW107XG4gICAgICBEcmFmdHkuYXR0YWNobWVudHMocHViLmNvbnRlbnQsIChkYXRhKSA9PiB7XG4gICAgICAgIGF0dGFjaG1lbnRzLnB1c2goZGF0YS5yZWYpO1xuICAgICAgfSk7XG4gICAgICBwdWIuaGVhZC5hdHRhY2htZW50cyA9IGF0dGFjaG1lbnRzO1xuICAgIH1cblxuICAgIC8vIFNlbmQgZGF0YS5cbiAgICBwdWIuX3NlbmRpbmcgPSB0cnVlO1xuICAgIHB1Yi5fZmFpbGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIHRoaXMuX3Rpbm9kZS5wdWJsaXNoTWVzc2FnZShwdWIpLnRoZW4oKGN0cmwpID0+IHtcbiAgICAgIHB1Yi5fc2VuZGluZyA9IGZhbHNlO1xuICAgICAgcHViLnRzID0gY3RybC50cztcbiAgICAgIHRoaXMuc3dhcE1lc3NhZ2VJZChwdWIsIGN0cmwucGFyYW1zLnNlcSk7XG4gICAgICB0aGlzLl9yb3V0ZURhdGEocHViKTtcbiAgICAgIHJldHVybiBjdHJsO1xuICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIHRoaXMuX3Rpbm9kZS5sb2dnZXIoXCJXQVJOSU5HOiBNZXNzYWdlIHJlamVjdGVkIGJ5IHRoZSBzZXJ2ZXJcIiwgZXJyKTtcbiAgICAgIHB1Yi5fc2VuZGluZyA9IGZhbHNlO1xuICAgICAgcHViLl9mYWlsZWQgPSB0cnVlO1xuICAgICAgaWYgKHRoaXMub25EYXRhKSB7XG4gICAgICAgIHRoaXMub25EYXRhKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCBtZXNzYWdlIHRvIGxvY2FsIG1lc3NhZ2UgY2FjaGUsIHNlbmQgdG8gdGhlIHNlcnZlciB3aGVuIHRoZSBwcm9taXNlIGlzIHJlc29sdmVkLlxuICAgKiBJZiBwcm9taXNlIGlzIG51bGwgb3IgdW5kZWZpbmVkLCB0aGUgbWVzc2FnZSB3aWxsIGJlIHNlbnQgaW1tZWRpYXRlbHkuXG4gICAqIFRoZSBtZXNzYWdlIGlzIHNlbnQgd2hlbiB0aGVcbiAgICogVGhlIG1lc3NhZ2Ugc2hvdWxkIGJlIGNyZWF0ZWQgYnkge0BsaW5rIFRpbm9kZS5Ub3BpYyNjcmVhdGVNZXNzYWdlfS5cbiAgICogVGhpcyBpcyBwcm9iYWJseSBub3QgdGhlIGZpbmFsIEFQSS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHB1YiAtIE1lc3NhZ2UgdG8gdXNlIGFzIGEgZHJhZnQuXG4gICAqIEBwYXJhbSB7UHJvbWlzZX0gcHJvbSAtIE1lc3NhZ2Ugd2lsbCBiZSBzZW50IHdoZW4gdGhpcyBwcm9taXNlIGlzIHJlc29sdmVkLCBkaXNjYXJkZWQgaWYgcmVqZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBkZXJpdmVkIHByb21pc2UuXG4gICAqL1xuICBwdWJsaXNoRHJhZnQ6IGZ1bmN0aW9uKHB1YiwgcHJvbSkge1xuICAgIGlmICghcHJvbSAmJiAhdGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNhbm5vdCBwdWJsaXNoIG9uIGluYWN0aXZlIHRvcGljXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXEgPSBwdWIuc2VxIHx8IHRoaXMuX2dldFF1ZXVlZFNlcUlkKCk7XG4gICAgaWYgKCFwdWIuX25vRm9yd2FyZGluZykge1xuICAgICAgLy8gVGhlICdzZXEnLCAndHMnLCBhbmQgJ2Zyb20nIGFyZSBhZGRlZCB0byBtaW1pYyB7ZGF0YX0uIFRoZXkgYXJlIHJlbW92ZWQgbGF0ZXJcbiAgICAgIC8vIGJlZm9yZSB0aGUgbWVzc2FnZSBpcyBzZW50LlxuXG4gICAgICBwdWIuX25vRm9yd2FyZGluZyA9IHRydWU7XG4gICAgICBwdWIuc2VxID0gc2VxO1xuICAgICAgcHViLnRzID0gbmV3IERhdGUoKTtcbiAgICAgIHB1Yi5mcm9tID0gdGhpcy5fdGlub2RlLmdldEN1cnJlbnRVc2VySUQoKTtcblxuICAgICAgLy8gRG9uJ3QgbmVlZCBhbiBlY2hvIG1lc3NhZ2UgYmVjYXVzZSB0aGUgbWVzc2FnZSBpcyBhZGRlZCB0byBsb2NhbCBjYWNoZSByaWdodCBhd2F5LlxuICAgICAgcHViLm5vZWNobyA9IHRydWU7XG4gICAgICAvLyBBZGQgdG8gY2FjaGUuXG4gICAgICB0aGlzLl9tZXNzYWdlcy5wdXQocHViKTtcbiAgICAgIHRoaXMuX3Rpbm9kZS5fZGIuYWRkTWVzc2FnZShwdWIpO1xuXG4gICAgICBpZiAodGhpcy5vbkRhdGEpIHtcbiAgICAgICAgdGhpcy5vbkRhdGEocHViKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gSWYgcHJvbWlzZSBpcyBwcm92aWRlZCwgc2VuZCB0aGUgcXVldWVkIG1lc3NhZ2Ugd2hlbiBpdCdzIHJlc29sdmVkLlxuICAgIC8vIElmIG5vIHByb21pc2UgaXMgcHJvdmlkZWQsIGNyZWF0ZSBhIHJlc29sdmVkIG9uZSBhbmQgc2VuZCBpbW1lZGlhdGVseS5cbiAgICBwcm9tID0gKHByb20gfHwgUHJvbWlzZS5yZXNvbHZlKCkpLnRoZW4oXG4gICAgICAoIC8qIGFyZ3VtZW50IGlnbm9yZWQgKi8gKSA9PiB7XG4gICAgICAgIGlmIChwdWIuX2NhbmNlbGxlZCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb2RlOiAzMDAsXG4gICAgICAgICAgICB0ZXh0OiBcImNhbmNlbGxlZFwiXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaXNoTWVzc2FnZShwdWIpO1xuICAgICAgfSxcbiAgICAgIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy5fdGlub2RlLmxvZ2dlcihcIldBUk5JTkc6IE1lc3NhZ2UgZHJhZnQgcmVqZWN0ZWRcIiwgZXJyKTtcbiAgICAgICAgcHViLl9zZW5kaW5nID0gZmFsc2U7XG4gICAgICAgIHB1Yi5fZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fbWVzc2FnZXMuZGVsQXQodGhpcy5fbWVzc2FnZXMuZmluZChwdWIpKTtcbiAgICAgICAgdGhpcy5fdGlub2RlLl9kYi5yZW1NZXNzYWdlcyh0aGlzLm5hbWUsIHB1Yi5zZXEpO1xuICAgICAgICBpZiAodGhpcy5vbkRhdGEpIHtcbiAgICAgICAgICB0aGlzLm9uRGF0YSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICByZXR1cm4gcHJvbTtcbiAgfSxcblxuICAvKipcbiAgICogTGVhdmUgdGhlIHRvcGljLCBvcHRpb25hbGx5IHVuc2lic2NyaWJlLiBMZWF2aW5nIHRoZSB0b3BpYyBtZWFucyB0aGUgdG9waWMgd2lsbCBzdG9wXG4gICAqIHJlY2VpdmluZyB1cGRhdGVzIGZyb20gdGhlIHNlcnZlci4gVW5zdWJzY3JpYmluZyB3aWxsIHRlcm1pbmF0ZSB1c2VyJ3MgcmVsYXRpb25zaGlwIHdpdGggdGhlIHRvcGljLlxuICAgKiBXcmFwcGVyIGZvciB7QGxpbmsgVGlub2RlI2xlYXZlfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gdW5zdWIgLSBJZiB0cnVlLCB1bnN1YnNjcmliZSwgb3RoZXJ3aXNlIGp1c3QgbGVhdmUuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB0byB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGxlYXZlOiBmdW5jdGlvbih1bnN1Yikge1xuICAgIC8vIEl0J3MgcG9zc2libGUgdG8gdW5zdWJzY3JpYmUgKHVuc3ViPT10cnVlKSBmcm9tIGluYWN0aXZlIHRvcGljLlxuICAgIGlmICghdGhpcy5fc3Vic2NyaWJlZCAmJiAhdW5zdWIpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW5ub3QgbGVhdmUgaW5hY3RpdmUgdG9waWNcIikpO1xuICAgIH1cblxuICAgIC8vIFNlbmQgYSAnbGVhdmUnIG1lc3NhZ2UsIGhhbmRsZSBhc3luYyByZXNwb25zZVxuICAgIHJldHVybiB0aGlzLl90aW5vZGUubGVhdmUodGhpcy5uYW1lLCB1bnN1YikudGhlbigoY3RybCkgPT4ge1xuICAgICAgdGhpcy5fcmVzZXRTdWIoKTtcbiAgICAgIGlmICh1bnN1Yikge1xuICAgICAgICB0aGlzLl90aW5vZGUuX2RiLnJlbVRvcGljKHRoaXMubmFtZSk7XG4gICAgICAgIHRoaXMuX3Rpbm9kZS5jYWNoZURlbCgndG9waWMnLCB0aGlzLm5hbWUpO1xuICAgICAgICB0aGlzLl9nb25lKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3RybDtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmVxdWVzdCB0b3BpYyBtZXRhZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7VGlub2RlLkdldFF1ZXJ5fSByZXF1ZXN0IHBhcmFtZXRlcnNcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgdG8gYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHRvIHJlcXVlc3QuXG4gICAqL1xuICBnZXRNZXRhOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAvLyBTZW5kIHtnZXR9IG1lc3NhZ2UsIHJldHVybiBwcm9taXNlLlxuICAgIHJldHVybiB0aGlzLl90aW5vZGUuZ2V0TWV0YSh0aGlzLm5hbWUsIHBhcmFtcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlcXVlc3QgbW9yZSBtZXNzYWdlcyBmcm9tIHRoZSBzZXJ2ZXJcbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IG51bWJlciBvZiBtZXNzYWdlcyB0byBnZXQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gZm9yd2FyZCBpZiB0cnVlLCByZXF1ZXN0IG5ld2VyIG1lc3NhZ2VzLlxuICAgKi9cbiAgZ2V0TWVzc2FnZXNQYWdlOiBmdW5jdGlvbihsaW1pdCwgZm9yd2FyZCkge1xuICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5zdGFydE1ldGFRdWVyeSgpO1xuICAgIGlmIChmb3J3YXJkKSB7XG4gICAgICBxdWVyeS53aXRoTGF0ZXJEYXRhKGxpbWl0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlcnkud2l0aEVhcmxpZXJEYXRhKGxpbWl0KTtcbiAgICB9XG4gICAgbGV0IHByb21pc2UgPSB0aGlzLmdldE1ldGEocXVlcnkuYnVpbGQoKSk7XG4gICAgaWYgKCFmb3J3YXJkKSB7XG4gICAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKChjdHJsKSA9PiB7XG4gICAgICAgIGlmIChjdHJsICYmIGN0cmwucGFyYW1zICYmICFjdHJsLnBhcmFtcy5jb3VudCkge1xuICAgICAgICAgIHRoaXMuX25vRWFybGllck1zZ3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0b3BpYyBtZXRhZGF0YS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtUaW5vZGUuU2V0UGFyYW1zfSBwYXJhbXMgcGFyYW1ldGVycyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB0byByZXF1ZXN0LlxuICAgKi9cbiAgc2V0TWV0YTogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgaWYgKHBhcmFtcy50YWdzKSB7XG4gICAgICBwYXJhbXMudGFncyA9IG5vcm1hbGl6ZUFycmF5KHBhcmFtcy50YWdzKTtcbiAgICB9XG4gICAgLy8gU2VuZCBTZXQgbWVzc2FnZSwgaGFuZGxlIGFzeW5jIHJlc3BvbnNlLlxuICAgIHJldHVybiB0aGlzLl90aW5vZGUuc2V0TWV0YSh0aGlzLm5hbWUsIHBhcmFtcylcbiAgICAgIC50aGVuKChjdHJsKSA9PiB7XG4gICAgICAgIGlmIChjdHJsICYmIGN0cmwuY29kZSA+PSAzMDApIHtcbiAgICAgICAgICAvLyBOb3QgbW9kaWZpZWRcbiAgICAgICAgICByZXR1cm4gY3RybDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYXJhbXMuc3ViKSB7XG4gICAgICAgICAgcGFyYW1zLnN1Yi50b3BpYyA9IHRoaXMubmFtZTtcbiAgICAgICAgICBpZiAoY3RybC5wYXJhbXMgJiYgY3RybC5wYXJhbXMuYWNzKSB7XG4gICAgICAgICAgICBwYXJhbXMuc3ViLmFjcyA9IGN0cmwucGFyYW1zLmFjcztcbiAgICAgICAgICAgIHBhcmFtcy5zdWIudXBkYXRlZCA9IGN0cmwudHM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcGFyYW1zLnN1Yi51c2VyKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgc3Vic2NyaXB0aW9uIHVwZGF0ZSBvZiB0aGUgY3VycmVudCB1c2VyLlxuICAgICAgICAgICAgLy8gQXNzaWduIHVzZXIgSUQgb3RoZXJ3aXNlIHRoZSB1cGRhdGUgd2lsbCBiZSBpZ25vcmVkIGJ5IF9wcm9jZXNzTWV0YVN1Yi5cbiAgICAgICAgICAgIHBhcmFtcy5zdWIudXNlciA9IHRoaXMuX3Rpbm9kZS5nZXRDdXJyZW50VXNlcklEKCk7XG4gICAgICAgICAgICBpZiAoIXBhcmFtcy5kZXNjKSB7XG4gICAgICAgICAgICAgIC8vIEZvcmNlIHVwZGF0ZSB0byB0b3BpYydzIGFzYy5cbiAgICAgICAgICAgICAgcGFyYW1zLmRlc2MgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcGFyYW1zLnN1Yi5fbm9Gb3J3YXJkaW5nID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLl9wcm9jZXNzTWV0YVN1YihbcGFyYW1zLnN1Yl0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcmFtcy5kZXNjKSB7XG4gICAgICAgICAgaWYgKGN0cmwucGFyYW1zICYmIGN0cmwucGFyYW1zLmFjcykge1xuICAgICAgICAgICAgcGFyYW1zLmRlc2MuYWNzID0gY3RybC5wYXJhbXMuYWNzO1xuICAgICAgICAgICAgcGFyYW1zLmRlc2MudXBkYXRlZCA9IGN0cmwudHM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhRGVzYyhwYXJhbXMuZGVzYyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFyYW1zLnRhZ3MpIHtcbiAgICAgICAgICB0aGlzLl9wcm9jZXNzTWV0YVRhZ3MocGFyYW1zLnRhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbXMuY3JlZCkge1xuICAgICAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhQ3JlZHMoW3BhcmFtcy5jcmVkXSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3RybDtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgYWNjZXNzIG1vZGUgb2YgdGhlIGN1cnJlbnQgdXNlciBvciBvZiBhbm90aGVyIHRvcGljIHN1YnNyaWJlci5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVpZCAtIFVJRCBvZiB0aGUgdXNlciB0byB1cGRhdGUgb3IgbnVsbCB0byB1cGRhdGUgY3VycmVudCB1c2VyLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXBkYXRlIC0gdGhlIHVwZGF0ZSB2YWx1ZSwgZnVsbCBvciBkZWx0YS5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgdG8gYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHRvIHJlcXVlc3QuXG4gICAqL1xuICB1cGRhdGVNb2RlOiBmdW5jdGlvbih1aWQsIHVwZGF0ZSkge1xuICAgIGNvbnN0IHVzZXIgPSB1aWQgPyB0aGlzLnN1YnNjcmliZXIodWlkKSA6IG51bGw7XG4gICAgY29uc3QgYW0gPSB1c2VyID9cbiAgICAgIHVzZXIuYWNzLnVwZGF0ZUdpdmVuKHVwZGF0ZSkuZ2V0R2l2ZW4oKSA6XG4gICAgICB0aGlzLmdldEFjY2Vzc01vZGUoKS51cGRhdGVXYW50KHVwZGF0ZSkuZ2V0V2FudCgpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2V0TWV0YSh7XG4gICAgICBzdWI6IHtcbiAgICAgICAgdXNlcjogdWlkLFxuICAgICAgICBtb2RlOiBhbVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgbmV3IHRvcGljIHN1YnNjcmlwdGlvbi4gV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNzZXRNZXRhfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVpZCAtIElEIG9mIHRoZSB1c2VyIHRvIGludml0ZVxuICAgKiBAcGFyYW0ge3N0cmluZz19IG1vZGUgLSBBY2Nlc3MgbW9kZS4gPGNvZGU+bnVsbDwvY29kZT4gbWVhbnMgdG8gdXNlIGRlZmF1bHQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB0byByZXF1ZXN0LlxuICAgKi9cbiAgaW52aXRlOiBmdW5jdGlvbih1aWQsIG1vZGUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRNZXRhKHtcbiAgICAgIHN1Yjoge1xuICAgICAgICB1c2VyOiB1aWQsXG4gICAgICAgIG1vZGU6IG1vZGVcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXJjaGl2ZSBvciB1bi1hcmNoaXZlIHRoZSB0b3BpYy4gV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNzZXRNZXRhfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBhcmNoIC0gdHJ1ZSB0byBhcmNoaXZlIHRoZSB0b3BpYywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgdG8gcmVxdWVzdC5cbiAgICovXG4gIGFyY2hpdmU6IGZ1bmN0aW9uKGFyY2gpIHtcbiAgICBpZiAodGhpcy5wcml2YXRlICYmIHRoaXMucHJpdmF0ZS5hcmNoID09IGFyY2gpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYXJjaCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNldE1ldGEoe1xuICAgICAgZGVzYzoge1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgYXJjaDogYXJjaCA/IHRydWUgOiBUaW5vZGUuREVMX0NIQVJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZWxldGUgbWVzc2FnZXMuIEhhcmQtZGVsZXRpbmcgbWVzc2FnZXMgcmVxdWlyZXMgT3duZXIgcGVybWlzc2lvbi5cbiAgICogV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNkZWxNZXNzYWdlc30uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7VGlub2RlLkRlbFJhbmdlW119IHJhbmdlcyAtIFJhbmdlcyBvZiBtZXNzYWdlIElEcyB0byBkZWxldGUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGhhcmQgLSBIYXJkIG9yIHNvZnQgZGVsZXRlXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRvIGJlIHJlc29sdmVkL3JlamVjdGVkIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB0byByZXF1ZXN0LlxuICAgKi9cbiAgZGVsTWVzc2FnZXM6IGZ1bmN0aW9uKHJhbmdlcywgaGFyZCkge1xuICAgIGlmICghdGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNhbm5vdCBkZWxldGUgbWVzc2FnZXMgaW4gaW5hY3RpdmUgdG9waWNcIikpO1xuICAgIH1cblxuICAgIC8vIFNvcnQgcmFuZ2VzIGluIGFjY2VuZGluZyBvcmRlciBieSBsb3csIHRoZSBkZXNjZW5kaW5nIGJ5IGhpLlxuICAgIHJhbmdlcy5zb3J0KChyMSwgcjIpID0+IHtcbiAgICAgIGlmIChyMS5sb3cgPCByMi5sb3cpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAocjEubG93ID09IHIyLmxvdykge1xuICAgICAgICByZXR1cm4gIXIyLmhpIHx8IChyMS5oaSA+PSByMi5oaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICAvLyBSZW1vdmUgcGVuZGluZyBtZXNzYWdlcyBmcm9tIHJhbmdlcyBwb3NzaWJseSBjbGlwcGluZyBzb21lIHJhbmdlcy5cbiAgICBsZXQgdG9zZW5kID0gcmFuZ2VzLnJlZHVjZSgob3V0LCByKSA9PiB7XG4gICAgICBpZiAoci5sb3cgPCBMT0NBTF9TRVFJRCkge1xuICAgICAgICBpZiAoIXIuaGkgfHwgci5oaSA8IExPQ0FMX1NFUUlEKSB7XG4gICAgICAgICAgb3V0LnB1c2gocik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQ2xpcCBoaSB0byBtYXggYWxsb3dlZCB2YWx1ZS5cbiAgICAgICAgICBvdXQucHVzaCh7XG4gICAgICAgICAgICBsb3c6IHIubG93LFxuICAgICAgICAgICAgaGk6IHRoaXMuX21heFNlcSArIDFcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dDtcbiAgICB9LCBbXSk7XG5cbiAgICAvLyBTZW5kIHtkZWx9IG1lc3NhZ2UsIHJldHVybiBwcm9taXNlXG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAodG9zZW5kLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMuX3Rpbm9kZS5kZWxNZXNzYWdlcyh0aGlzLm5hbWUsIHRvc2VuZCwgaGFyZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIGRlbDogMFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gVXBkYXRlIGxvY2FsIGNhY2hlLlxuICAgIHJldHVybiByZXN1bHQudGhlbigoY3RybCkgPT4ge1xuICAgICAgaWYgKGN0cmwucGFyYW1zLmRlbCA+IHRoaXMuX21heERlbCkge1xuICAgICAgICB0aGlzLl9tYXhEZWwgPSBjdHJsLnBhcmFtcy5kZWw7XG4gICAgICB9XG5cbiAgICAgIHJhbmdlcy5tYXAoKHIpID0+IHtcbiAgICAgICAgaWYgKHIuaGkpIHtcbiAgICAgICAgICB0aGlzLmZsdXNoTWVzc2FnZVJhbmdlKHIubG93LCByLmhpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmZsdXNoTWVzc2FnZShyLmxvdyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl91cGRhdGVEZWxldGVkUmFuZ2VzKCk7XG5cbiAgICAgIGlmICh0aGlzLm9uRGF0YSkge1xuICAgICAgICAvLyBDYWxsaW5nIHdpdGggbm8gcGFyYW1ldGVycyB0byBpbmRpY2F0ZSB0aGUgbWVzc2FnZXMgd2VyZSBkZWxldGVkLlxuICAgICAgICB0aGlzLm9uRGF0YSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGN0cmw7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERlbGV0ZSBhbGwgbWVzc2FnZXMuIEhhcmQtZGVsZXRpbmcgbWVzc2FnZXMgcmVxdWlyZXMgT3duZXIgcGVybWlzc2lvbi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBoYXJkRGVsIC0gdHJ1ZSBpZiBtZXNzYWdlcyBzaG91bGQgYmUgaGFyZC1kZWxldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgdG8gcmVxdWVzdC5cbiAgICovXG4gIGRlbE1lc3NhZ2VzQWxsOiBmdW5jdGlvbihoYXJkRGVsKSB7XG4gICAgaWYgKCF0aGlzLl9tYXhTZXEgfHwgdGhpcy5fbWF4U2VxIDw9IDApIHtcbiAgICAgIC8vIFRoZXJlIGFyZSBubyBtZXNzYWdlcyB0byBkZWxldGUuXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbE1lc3NhZ2VzKFt7XG4gICAgICBsb3c6IDEsXG4gICAgICBoaTogdGhpcy5fbWF4U2VxICsgMSxcbiAgICAgIF9hbGw6IHRydWVcbiAgICB9XSwgaGFyZERlbCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERlbGV0ZSBtdWx0aXBsZSBtZXNzYWdlcyBkZWZpbmVkIGJ5IHRoZWlyIElEcy4gSGFyZC1kZWxldGluZyBtZXNzYWdlcyByZXF1aXJlcyBPd25lciBwZXJtaXNzaW9uLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge1Rpbm9kZS5EZWxSYW5nZVtdfSBsaXN0IC0gbGlzdCBvZiBzZXEgSURzIHRvIGRlbGV0ZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBoYXJkRGVsIC0gdHJ1ZSBpZiBtZXNzYWdlcyBzaG91bGQgYmUgaGFyZC1kZWxldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgdG8gcmVxdWVzdC5cbiAgICovXG4gIGRlbE1lc3NhZ2VzTGlzdDogZnVuY3Rpb24obGlzdCwgaGFyZERlbCkge1xuICAgIC8vIFNvcnQgdGhlIGxpc3QgaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgbGlzdC5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gICAgLy8gQ29udmVydCB0aGUgYXJyYXkgb2YgSURzIHRvIHJhbmdlcy5cbiAgICBsZXQgcmFuZ2VzID0gbGlzdC5yZWR1Y2UoKG91dCwgaWQpID0+IHtcbiAgICAgIGlmIChvdXQubGVuZ3RoID09IDApIHtcbiAgICAgICAgLy8gRmlyc3QgZWxlbWVudC5cbiAgICAgICAgb3V0LnB1c2goe1xuICAgICAgICAgIGxvdzogaWRcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcHJldiA9IG91dFtvdXQubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICgoIXByZXYuaGkgJiYgKGlkICE9IHByZXYubG93ICsgMSkpIHx8IChpZCA+IHByZXYuaGkpKSB7XG4gICAgICAgICAgLy8gTmV3IHJhbmdlLlxuICAgICAgICAgIG91dC5wdXNoKHtcbiAgICAgICAgICAgIGxvdzogaWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBFeHBhbmQgZXhpc3RpbmcgcmFuZ2UuXG4gICAgICAgICAgcHJldi5oaSA9IHByZXYuaGkgPyBNYXRoLm1heChwcmV2LmhpLCBpZCArIDEpIDogaWQgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH0sIFtdKTtcbiAgICAvLyBTZW5kIHtkZWx9IG1lc3NhZ2UsIHJldHVybiBwcm9taXNlXG4gICAgcmV0dXJuIHRoaXMuZGVsTWVzc2FnZXMocmFuZ2VzLCBoYXJkRGVsKVxuICB9LFxuXG4gIC8qKlxuICAgKiBEZWxldGUgdG9waWMuIFJlcXVpcmVzIE93bmVyIHBlcm1pc3Npb24uIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjZGVsVG9waWN9LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGhhcmQgLSBoYWQtZGVsZXRlIHRvcGljLlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSByZXNvbHZlZC9yZWplY3RlZCB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgdG8gdGhlIHJlcXVlc3QuXG4gICAqL1xuICBkZWxUb3BpYzogZnVuY3Rpb24oaGFyZCkge1xuICAgIHJldHVybiB0aGlzLl90aW5vZGUuZGVsVG9waWModGhpcy5uYW1lLCBoYXJkKS50aGVuKChjdHJsKSA9PiB7XG4gICAgICB0aGlzLl9yZXNldFN1YigpO1xuICAgICAgdGhpcy5fZ29uZSgpO1xuICAgICAgcmV0dXJuIGN0cmw7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERlbGV0ZSBzdWJzY3JpcHRpb24uIFJlcXVpcmVzIFNoYXJlIHBlcm1pc3Npb24uIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjZGVsU3Vic2NyaXB0aW9ufS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXIgLSBJRCBvZiB0aGUgdXNlciB0byByZW1vdmUgc3Vic2NyaXB0aW9uIGZvci5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgdG8gYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHRvIHJlcXVlc3QuXG4gICAqL1xuICBkZWxTdWJzY3JpcHRpb246IGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAoIXRoaXMuX3N1YnNjcmliZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW5ub3QgZGVsZXRlIHN1YnNjcmlwdGlvbiBpbiBpbmFjdGl2ZSB0b3BpY1wiKSk7XG4gICAgfVxuICAgIC8vIFNlbmQge2RlbH0gbWVzc2FnZSwgcmV0dXJuIHByb21pc2VcbiAgICByZXR1cm4gdGhpcy5fdGlub2RlLmRlbFN1YnNjcmlwdGlvbih0aGlzLm5hbWUsIHVzZXIpLnRoZW4oKGN0cmwpID0+IHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHN1YnNjcmlwdGlvbiBjYWNoZTtcbiAgICAgIGRlbGV0ZSB0aGlzLl91c2Vyc1t1c2VyXTtcbiAgICAgIC8vIE5vdGlmeSBsaXN0ZW5lcnNcbiAgICAgIGlmICh0aGlzLm9uU3Vic1VwZGF0ZWQpIHtcbiAgICAgICAgdGhpcy5vblN1YnNVcGRhdGVkKE9iamVjdC5rZXlzKHRoaXMuX3VzZXJzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3RybDtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2VuZCBhIHJlYWQvcmVjdiBub3RpZmljYXRpb24uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB3aGF0IC0gd2hhdCBub3RpZmljYXRpb24gdG8gc2VuZDogPGNvZGU+cmVjdjwvY29kZT4sIDxjb2RlPnJlYWQ8L2NvZGU+LlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxIC0gSUQgb3IgdGhlIG1lc3NhZ2UgcmVhZCBvciByZWNlaXZlZC5cbiAgICovXG4gIG5vdGU6IGZ1bmN0aW9uKHdoYXQsIHNlcSkge1xuICAgIGlmICghdGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgLy8gQ2Fubm90IHNlbmRpbmcge25vdGV9IG9uIGFuIGluYWN0aXZlIHRvcGljXCIuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGxvY2FsIGNhY2hlIHdpdGggdGhlIG5ldyBjb3VudC5cbiAgICBjb25zdCB1c2VyID0gdGhpcy5fdXNlcnNbdGhpcy5fdGlub2RlLmdldEN1cnJlbnRVc2VySUQoKV07XG4gICAgbGV0IHVwZGF0ZSA9IGZhbHNlO1xuICAgIGlmICh1c2VyKSB7XG4gICAgICAvLyBTZWxmLXN1YnNjcmlwdGlvbiBpcyBmb3VuZC5cbiAgICAgIGlmICghdXNlclt3aGF0XSB8fCB1c2VyW3doYXRdIDwgc2VxKSB7XG4gICAgICAgIHVzZXJbd2hhdF0gPSBzZXE7XG4gICAgICAgIHVwZGF0ZSA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNlbGYtc3Vic2NyaXB0aW9uIGlzIG5vdCBmb3VuZC5cbiAgICAgIHVwZGF0ZSA9ICh0aGlzW3doYXRdIHwgMCkgPCBzZXE7XG4gICAgfVxuXG4gICAgaWYgKHVwZGF0ZSkge1xuICAgICAgLy8gU2VuZCBub3RpZmljYXRpb24gdG8gdGhlIHNlcnZlci5cbiAgICAgIHRoaXMuX3Rpbm9kZS5ub3RlKHRoaXMubmFtZSwgd2hhdCwgc2VxKTtcbiAgICAgIC8vIFVwZGF0ZSBsb2NhbGx5IGNhY2hlZCBjb250YWN0IHdpdGggdGhlIG5ldyBjb3VudC5cbiAgICAgIHRoaXMuX3VwZGF0ZVJlYWRSZWN2KHdoYXQsIHNlcSk7XG5cbiAgICAgIGlmICh0aGlzLmFjcyAhPSBudWxsICYmICF0aGlzLmFjcy5pc011dGVkKCkpIHtcbiAgICAgICAgY29uc3QgbWUgPSB0aGlzLl90aW5vZGUuZ2V0TWVUb3BpYygpO1xuICAgICAgICAvLyBTZW50IGEgbm90aWZpY2F0aW9uIHRvICdtZScgbGlzdGVuZXJzLlxuICAgICAgICBtZS5fcmVmcmVzaENvbnRhY3Qod2hhdCwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIGEgJ3JlY3YnIHJlY2VpcHQuIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjbm90ZVJlY3Z9LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxIC0gSUQgb2YgdGhlIG1lc3NhZ2UgdG8gYWtub3dsZWRnZS5cbiAgICovXG4gIG5vdGVSZWN2OiBmdW5jdGlvbihzZXEpIHtcbiAgICB0aGlzLm5vdGUoJ3JlY3YnLCBzZXEpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIGEgJ3JlYWQnIHJlY2VpcHQuIFdyYXBwZXIgZm9yIHtAbGluayBUaW5vZGUjbm90ZVJlYWR9LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxIC0gSUQgb2YgdGhlIG1lc3NhZ2UgdG8gYWtub3dsZWRnZSBvciAwL3VuZGVmaW5lZCB0byBhY2tub3dsZWRnZSB0aGUgbGF0ZXN0IG1lc3NhZ2VzLlxuICAgKi9cbiAgbm90ZVJlYWQ6IGZ1bmN0aW9uKHNlcSkge1xuICAgIHNlcSA9IHNlcSB8fCB0aGlzLl9tYXhTZXE7XG4gICAgaWYgKHNlcSA+IDApIHtcbiAgICAgIHRoaXMubm90ZSgncmVhZCcsIHNlcSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIGEga2V5LXByZXNzIG5vdGlmaWNhdGlvbi4gV3JhcHBlciBmb3Ige0BsaW5rIFRpbm9kZSNub3RlS2V5UHJlc3N9LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKi9cbiAgbm90ZUtleVByZXNzOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fc3Vic2NyaWJlZCkge1xuICAgICAgdGhpcy5fdGlub2RlLm5vdGVLZXlQcmVzcyh0aGlzLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl90aW5vZGUubG9nZ2VyKFwiSU5GTzogQ2Fubm90IHNlbmQgbm90aWZpY2F0aW9uIGluIGluYWN0aXZlIHRvcGljXCIpO1xuICAgIH1cbiAgfSxcblxuICAvLyBVcGRhdGUgY2FjaGVkIHJlYWQvcmVjdi91bnJlYWQgY291bnRzLlxuICBfdXBkYXRlUmVhZFJlY3Y6IGZ1bmN0aW9uKHdoYXQsIHNlcSwgdHMpIHtcbiAgICBsZXQgb2xkVmFsLCBkb1VwZGF0ZSA9IGZhbHNlO1xuXG4gICAgc2VxID0gc2VxIHwgMDtcbiAgICB0aGlzLnNlcSA9IHRoaXMuc2VxIHwgMDtcbiAgICB0aGlzLnJlYWQgPSB0aGlzLnJlYWQgfCAwO1xuICAgIHRoaXMucmVjdiA9IHRoaXMucmVjdiB8IDA7XG4gICAgc3dpdGNoICh3aGF0KSB7XG4gICAgICBjYXNlICdyZWN2JzpcbiAgICAgICAgb2xkVmFsID0gdGhpcy5yZWN2O1xuICAgICAgICB0aGlzLnJlY3YgPSBNYXRoLm1heCh0aGlzLnJlY3YsIHNlcSk7XG4gICAgICAgIGRvVXBkYXRlID0gKG9sZFZhbCAhPSB0aGlzLnJlY3YpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICBvbGRWYWwgPSB0aGlzLnJlYWQ7XG4gICAgICAgIHRoaXMucmVhZCA9IE1hdGgubWF4KHRoaXMucmVhZCwgc2VxKTtcbiAgICAgICAgZG9VcGRhdGUgPSAob2xkVmFsICE9IHRoaXMucmVhZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbXNnJzpcbiAgICAgICAgb2xkVmFsID0gdGhpcy5zZXE7XG4gICAgICAgIHRoaXMuc2VxID0gTWF0aC5tYXgodGhpcy5zZXEsIHNlcSk7XG4gICAgICAgIGlmICghdGhpcy50b3VjaGVkIHx8IHRoaXMudG91Y2hlZCA8IHRzKSB7XG4gICAgICAgICAgdGhpcy50b3VjaGVkID0gdHM7XG4gICAgICAgIH1cbiAgICAgICAgZG9VcGRhdGUgPSAob2xkVmFsICE9IHRoaXMuc2VxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gU2FuaXR5IGNoZWNrcy5cbiAgICBpZiAodGhpcy5yZWN2IDwgdGhpcy5yZWFkKSB7XG4gICAgICB0aGlzLnJlY3YgPSB0aGlzLnJlYWQ7XG4gICAgICBkb1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLnNlcSA8IHRoaXMucmVjdikge1xuICAgICAgdGhpcy5zZXEgPSB0aGlzLnJlY3Y7XG4gICAgICBpZiAoIXRoaXMudG91Y2hlZCB8fCB0aGlzLnRvdWNoZWQgPCB0cykge1xuICAgICAgICB0aGlzLnRvdWNoZWQgPSB0cztcbiAgICAgIH1cbiAgICAgIGRvVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy51bnJlYWQgPSB0aGlzLnNlcSAtIHRoaXMucmVhZDtcbiAgICByZXR1cm4gZG9VcGRhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB1c2VyIGRlc2NyaXB0aW9uIGZyb20gZ2xvYmFsIGNhY2hlLiBUaGUgdXNlciBkb2VzIG5vdCBuZWVkIHRvIGJlIGFcbiAgICogc3Vic2NyaWJlciBvZiB0aGlzIHRvcGljLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdWlkIC0gSUQgb2YgdGhlIHVzZXIgdG8gZmV0Y2guXG4gICAqIEByZXR1cm4ge09iamVjdH0gdXNlciBkZXNjcmlwdGlvbiBvciB1bmRlZmluZWQuXG4gICAqL1xuICB1c2VyRGVzYzogZnVuY3Rpb24odWlkKSB7XG4gICAgLy8gVE9ETyhnZW5lKTogaGFuZGxlIGFzeW5jaHJvbm91cyByZXF1ZXN0c1xuXG4gICAgY29uc3QgdXNlciA9IHRoaXMuX2NhY2hlR2V0VXNlcih1aWQpO1xuICAgIGlmICh1c2VyKSB7XG4gICAgICByZXR1cm4gdXNlcjsgLy8gUHJvbWlzZS5yZXNvbHZlKHVzZXIpXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgZGVzY3JpcHRpb24gb2YgdGhlIHAycCBwZWVyIGZyb20gc3Vic2NyaXB0aW9uIGNhY2hlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHBlZXIncyBkZXNjcmlwdGlvbiBvciB1bmRlZmluZWQuXG4gICAqL1xuICBwMnBQZWVyRGVzYzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmlzUDJQVHlwZSgpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdXNlcnNbdGhpcy5uYW1lXTtcbiAgfSxcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGNhY2hlZCBzdWJzY3JpYmVycy4gSWYgY2FsbGJhY2sgaXMgdW5kZWZpbmVkLCB1c2UgdGhpcy5vbk1ldGFTdWIuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hpY2ggd2lsbCByZWNlaXZlIHN1YnNjcmliZXJzIG9uZSBieSBvbmUuXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gY29udGV4dCAtIFZhbHVlIG9mIGB0aGlzYCBpbnNpZGUgdGhlIGBjYWxsYmFja2AuXG4gICAqL1xuICBzdWJzY3JpYmVyczogZnVuY3Rpb24oY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBjb25zdCBjYiA9IChjYWxsYmFjayB8fCB0aGlzLm9uTWV0YVN1Yik7XG4gICAgaWYgKGNiKSB7XG4gICAgICBmb3IgKGxldCBpZHggaW4gdGhpcy5fdXNlcnMpIHtcbiAgICAgICAgY2IuY2FsbChjb250ZXh0LCB0aGlzLl91c2Vyc1tpZHhdLCBpZHgsIHRoaXMuX3VzZXJzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhIGNvcHkgb2YgY2FjaGVkIHRhZ3MuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBhIGNvcHkgb2YgdGFnc1xuICAgKi9cbiAgdGFnczogZnVuY3Rpb24oKSB7XG4gICAgLy8gUmV0dXJuIGEgY29weS5cbiAgICByZXR1cm4gdGhpcy5fdGFncy5zbGljZSgwKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGNhY2hlZCBzdWJzY3JpcHRpb24gZm9yIHRoZSBnaXZlbiB1c2VyIElELlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdWlkIC0gaWQgb2YgdGhlIHVzZXIgdG8gcXVlcnkgZm9yXG4gICAqIEByZXR1cm4gdXNlciBkZXNjcmlwdGlvbiBvciB1bmRlZmluZWQuXG4gICAqL1xuICBzdWJzY3JpYmVyOiBmdW5jdGlvbih1aWQpIHtcbiAgICByZXR1cm4gdGhpcy5fdXNlcnNbdWlkXTtcbiAgfSxcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGNhY2hlZCBtZXNzYWdlcy4gSWYgY2FsbGJhY2sgaXMgdW5kZWZpbmVkLCB1c2UgdGhpcy5vbkRhdGEuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hpY2ggd2lsbCByZWNlaXZlIG1lc3NhZ2VzIG9uZSBieSBvbmUuIFNlZSB7QGxpbmsgVGlub2RlLkNCdWZmZXIjZm9yRWFjaH1cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNpbmNlSWQgLSBPcHRpb25hbCBzZXFJZCB0byBzdGFydCBpdGVyYXRpbmcgZnJvbSAoaW5jbHVzaXZlKS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGJlZm9yZUlkIC0gT3B0aW9uYWwgc2VxSWQgdG8gc3RvcCBpdGVyYXRpbmcgYmVmb3JlIChleGNsdXNpdmUpLlxuICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIFZhbHVlIG9mIGB0aGlzYCBpbnNpZGUgdGhlIGBjYWxsYmFja2AuXG4gICAqL1xuICBtZXNzYWdlczogZnVuY3Rpb24oY2FsbGJhY2ssIHNpbmNlSWQsIGJlZm9yZUlkLCBjb250ZXh0KSB7XG4gICAgY29uc3QgY2IgPSAoY2FsbGJhY2sgfHwgdGhpcy5vbkRhdGEpO1xuICAgIGlmIChjYikge1xuICAgICAgbGV0IHN0YXJ0SWR4ID0gdHlwZW9mIHNpbmNlSWQgPT0gJ251bWJlcicgPyB0aGlzLl9tZXNzYWdlcy5maW5kKHtcbiAgICAgICAgc2VxOiBzaW5jZUlkXG4gICAgICB9LCB0cnVlKSA6IHVuZGVmaW5lZDtcbiAgICAgIGxldCBiZWZvcmVJZHggPSB0eXBlb2YgYmVmb3JlSWQgPT0gJ251bWJlcicgPyB0aGlzLl9tZXNzYWdlcy5maW5kKHtcbiAgICAgICAgc2VxOiBiZWZvcmVJZFxuICAgICAgfSwgdHJ1ZSkgOiB1bmRlZmluZWQ7XG4gICAgICBpZiAoc3RhcnRJZHggIT0gLTEgJiYgYmVmb3JlSWR4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX21lc3NhZ2VzLmZvckVhY2goY2IsIHN0YXJ0SWR4LCBiZWZvcmVJZHgsIGNvbnRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBtb3N0IHJlY2VudCBtZXNzYWdlIGZyb20gY2FjaGUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVufSBza2lwRGVsZXRlZCAtIGlmIHRoZSBsYXN0IG1lc3NhZ2UgaXMgYSBkZWxldGVkIHJhbmdlLCBnZXQgdGhlIG9uZSBiZWZvcmUgaXQuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IHRoZSBtb3N0IHJlY2VudCBjYWNoZWQgbWVzc2FnZSBvciA8Y29kZT51bmRlZmluZWQ8L2NvZGU+LCBpZiBubyBtZXNzYWdlcyBhcmUgY2FjaGVkLlxuICAgKi9cbiAgbGF0ZXN0TWVzc2FnZTogZnVuY3Rpb24oc2tpcERlbGV0ZWQpIHtcbiAgICBjb25zdCBtc2cgPSB0aGlzLl9tZXNzYWdlcy5nZXRMYXN0KCk7XG4gICAgaWYgKCFza2lwRGVsZXRlZCB8fCAhbXNnIHx8IG1zZy5fc3RhdHVzICE9IE1FU1NBR0VfU1RBVFVTX0RFTF9SQU5HRSkge1xuICAgICAgcmV0dXJuIG1zZztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX21lc3NhZ2VzLmdldExhc3QoMSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBjYWNoZWQgdW5zZW50IG1lc3NhZ2VzLiBXcmFwcyB7QGxpbmsgVGlub2RlLlRvcGljI21lc3NhZ2VzfS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayB3aGljaCB3aWxsIHJlY2VpdmUgbWVzc2FnZXMgb25lIGJ5IG9uZS4gU2VlIHtAbGluayBUaW5vZGUuQ0J1ZmZlciNmb3JFYWNofVxuICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIFZhbHVlIG9mIDxjb2RlPnRoaXM8L2NvZGU+IGluc2lkZSB0aGUgPGNvZGU+Y2FsbGJhY2s8L2NvZGU+LlxuICAgKi9cbiAgcXVldWVkTWVzc2FnZXM6IGZ1bmN0aW9uKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZFwiKTtcbiAgICB9XG4gICAgdGhpcy5tZXNzYWdlcyhjYWxsYmFjaywgTE9DQUxfU0VRSUQsIHVuZGVmaW5lZCwgY29udGV4dCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbnVtYmVyIG9mIHRvcGljIHN1YnNjcmliZXJzIHdobyBtYXJrZWQgdGhpcyBtZXNzYWdlIGFzIGVpdGhlciByZWN2IG9yIHJlYWRcbiAgICogQ3VycmVudCB1c2VyIGlzIGV4Y2x1ZGVkIGZyb20gdGhlIGNvdW50LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gd2hhdCAtIHdoYXQgYWN0aW9uIHRvIGNvbnNpZGVyOiByZWNlaXZlZCA8Y29kZT5cInJlY3ZcIjwvY29kZT4gb3IgcmVhZCA8Y29kZT5cInJlYWRcIjwvY29kZT4uXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZXEgLSBJRCBvciB0aGUgbWVzc2FnZSByZWFkIG9yIHJlY2VpdmVkLlxuICAgKlxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSB0aGUgbnVtYmVyIG9mIHN1YnNjcmliZXJzIHdobyBtYXJrZWQgdGhlIG1lc3NhZ2Ugd2l0aCB0aGUgZ2l2ZW4gSUQgYXMgcmVhZCBvciByZWNlaXZlZC5cbiAgICovXG4gIG1zZ1JlY2VpcHRDb3VudDogZnVuY3Rpb24od2hhdCwgc2VxKSB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBpZiAoc2VxID4gMCkge1xuICAgICAgY29uc3QgbWUgPSB0aGlzLl90aW5vZGUuZ2V0Q3VycmVudFVzZXJJRCgpO1xuICAgICAgZm9yIChsZXQgaWR4IGluIHRoaXMuX3VzZXJzKSB7XG4gICAgICAgIGNvbnN0IHVzZXIgPSB0aGlzLl91c2Vyc1tpZHhdO1xuICAgICAgICBpZiAodXNlci51c2VyICE9PSBtZSAmJiB1c2VyW3doYXRdID49IHNlcSkge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiB0b3BpYyBzdWJzY3JpYmVycyB3aG8gbWFya2VkIHRoaXMgbWVzc2FnZSAoYW5kIGFsbCBvbGRlciBtZXNzYWdlcykgYXMgcmVhZC5cbiAgICogVGhlIGN1cnJlbnQgdXNlciBpcyBleGNsdWRlZCBmcm9tIHRoZSBjb3VudC5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IHNlcSAtIG1lc3NhZ2UgaWQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IG51bWJlciBvZiBzdWJzY3JpYmVycyB3aG8gY2xhaW0gdG8gaGF2ZSByZWNlaXZlZCB0aGUgbWVzc2FnZS5cbiAgICovXG4gIG1zZ1JlYWRDb3VudDogZnVuY3Rpb24oc2VxKSB7XG4gICAgcmV0dXJuIHRoaXMubXNnUmVjZWlwdENvdW50KCdyZWFkJywgc2VxKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgdG9waWMgc3Vic2NyaWJlcnMgd2hvIG1hcmtlZCB0aGlzIG1lc3NhZ2UgKGFuZCBhbGwgb2xkZXIgbWVzc2FnZXMpIGFzIHJlY2VpdmVkLlxuICAgKiBUaGUgY3VycmVudCB1c2VyIGlzIGV4Y2x1ZGVkIGZyb20gdGhlIGNvdW50LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxIC0gTWVzc2FnZSBpZCB0byBjaGVjay5cbiAgICogQHJldHVybnMge251bWJlcn0gTnVtYmVyIG9mIHN1YnNjcmliZXJzIHdobyBjbGFpbSB0byBoYXZlIHJlY2VpdmVkIHRoZSBtZXNzYWdlLlxuICAgKi9cbiAgbXNnUmVjdkNvdW50OiBmdW5jdGlvbihzZXEpIHtcbiAgICByZXR1cm4gdGhpcy5tc2dSZWNlaXB0Q291bnQoJ3JlY3YnLCBzZXEpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjYWNoZWQgbWVzc2FnZSBJRHMgaW5kaWNhdGUgdGhhdCB0aGUgc2VydmVyIG1heSBoYXZlIG1vcmUgbWVzc2FnZXMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gbmV3ZXIgLSBpZiA8Y29kZT50cnVlPC9jb2RlPiwgY2hlY2sgZm9yIG5ld2VyIG1lc3NhZ2VzIG9ubHkuXG4gICAqL1xuICBtc2dIYXNNb3JlTWVzc2FnZXM6IGZ1bmN0aW9uKG5ld2VyKSB7XG4gICAgcmV0dXJuIG5ld2VyID8gdGhpcy5zZXEgPiB0aGlzLl9tYXhTZXEgOlxuICAgICAgLy8gX21pblNlcSBjb3VsZCBiZSBtb3JlIHRoYW4gMSwgYnV0IGVhcmxpZXIgbWVzc2FnZXMgY291bGQgaGF2ZSBiZWVuIGRlbGV0ZWQuXG4gICAgICAodGhpcy5fbWluU2VxID4gMSAmJiAhdGhpcy5fbm9FYXJsaWVyTXNncyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBnaXZlbiBzZXEgSWQgaXMgaWQgb2YgdGhlIG1vc3QgcmVjZW50IG1lc3NhZ2UuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzZXFJZCBpZCBvZiB0aGUgbWVzc2FnZSB0byBjaGVja1xuICAgKi9cbiAgaXNOZXdNZXNzYWdlOiBmdW5jdGlvbihzZXFJZCkge1xuICAgIHJldHVybiB0aGlzLl9tYXhTZXEgPD0gc2VxSWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBvbmUgbWVzc2FnZSBmcm9tIGxvY2FsIGNhY2hlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxSWQgaWQgb2YgdGhlIG1lc3NhZ2UgdG8gcmVtb3ZlIGZyb20gY2FjaGUuXG4gICAqIEByZXR1cm5zIHtNZXNzYWdlfSByZW1vdmVkIG1lc3NhZ2Ugb3IgdW5kZWZpbmVkIGlmIHN1Y2ggbWVzc2FnZSB3YXMgbm90IGZvdW5kLlxuICAgKi9cbiAgZmx1c2hNZXNzYWdlOiBmdW5jdGlvbihzZXFJZCkge1xuICAgIGNvbnN0IGlkeCA9IHRoaXMuX21lc3NhZ2VzLmZpbmQoe1xuICAgICAgc2VxOiBzZXFJZFxuICAgIH0pO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgdGhpcy5fdGlub2RlLl9kYi5yZW1NZXNzYWdlcyh0aGlzLm5hbWUsIHNlcUlkKTtcbiAgICAgIHJldHVybiB0aGlzLl9tZXNzYWdlcy5kZWxBdChpZHgpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgbWVzc2FnZSdzIHNlcUlkLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcHViIG1lc3NhZ2Ugb2JqZWN0LlxuICAgKiBAcGFyYW0ge251bWJlcn0gbmV3U2VxSWQgbmV3IHNlcSBpZCBmb3IgcHViLlxuICAgKi9cbiAgc3dhcE1lc3NhZ2VJZDogZnVuY3Rpb24ocHViLCBuZXdTZXFJZCkge1xuICAgIGNvbnN0IGlkeCA9IHRoaXMuX21lc3NhZ2VzLmZpbmQocHViKTtcbiAgICBjb25zdCBudW1NZXNzYWdlcyA9IHRoaXMuX21lc3NhZ2VzLmxlbmd0aCgpO1xuICAgIGlmICgwIDw9IGlkeCAmJiBpZHggPCBudW1NZXNzYWdlcykge1xuICAgICAgLy8gUmVtb3ZlIG1lc3NhZ2Ugd2l0aCB0aGUgb2xkIHNlcSBJRC5cbiAgICAgIHRoaXMuX21lc3NhZ2VzLmRlbEF0KGlkeCk7XG4gICAgICB0aGlzLl90aW5vZGUuX2RiLnJlbU1lc3NhZ2VzKHRoaXMubmFtZSwgcHViLnNlcSk7XG4gICAgICAvLyBBZGQgbWVzc2FnZSB3aXRoIHRoZSBuZXcgc2VxIElELlxuICAgICAgcHViLnNlcSA9IG5ld1NlcUlkO1xuICAgICAgdGhpcy5fbWVzc2FnZXMucHV0KHB1Yik7XG4gICAgICB0aGlzLl90aW5vZGUuX2RiLmFkZE1lc3NhZ2UocHViKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIHJhbmdlIG9mIG1lc3NhZ2VzIGZyb20gdGhlIGxvY2FsIGNhY2hlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gZnJvbUlkIHNlcSBJRCBvZiB0aGUgZmlyc3QgbWVzc2FnZSB0byByZW1vdmUgKGluY2x1c2l2ZSkuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB1bnRpbElkIHNlcUlEIG9mIHRoZSBsYXN0IG1lc3NhZ2UgdG8gcmVtb3ZlIChleGNsdXNpdmUpLlxuICAgKlxuICAgKiBAcmV0dXJucyB7TWVzc2FnZVtdfSBhcnJheSBvZiByZW1vdmVkIG1lc3NhZ2VzIChjb3VsZCBiZSBlbXB0eSkuXG4gICAqL1xuICBmbHVzaE1lc3NhZ2VSYW5nZTogZnVuY3Rpb24oZnJvbUlkLCB1bnRpbElkKSB7XG4gICAgLy8gUmVtb3ZlIHJhbmdlIGZyb20gcGVyc2lzdGVudCBjYWNoZS5cbiAgICB0aGlzLl90aW5vZGUuX2RiLnJlbU1lc3NhZ2VzKHRoaXMubmFtZSwgZnJvbUlkLCB1bnRpbElkKTtcbiAgICAvLyBzdGFydCwgZW5kOiBmaW5kIGluc2VydGlvbiBwb2ludHMgKG5lYXJlc3QgPT0gdHJ1ZSkuXG4gICAgY29uc3Qgc2luY2UgPSB0aGlzLl9tZXNzYWdlcy5maW5kKHtcbiAgICAgIHNlcTogZnJvbUlkXG4gICAgfSwgdHJ1ZSk7XG4gICAgcmV0dXJuIHNpbmNlID49IDAgPyB0aGlzLl9tZXNzYWdlcy5kZWxSYW5nZShzaW5jZSwgdGhpcy5fbWVzc2FnZXMuZmluZCh7XG4gICAgICBzZXE6IHVudGlsSWRcbiAgICB9LCB0cnVlKSkgOiBbXTtcbiAgfSxcblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBzdG9wIG1lc3NhZ2UgZnJvbSBiZWluZyBzZW50LlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gc2VxSWQgaWQgb2YgdGhlIG1lc3NhZ2UgdG8gc3RvcCBzZW5kaW5nIGFuZCByZW1vdmUgZnJvbSBjYWNoZS5cbiAgICpcbiAgICogQHJldHVybnMge2Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIG1lc3NhZ2Ugd2FzIGNhbmNlbGxlZCwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAgICovXG4gIGNhbmNlbFNlbmQ6IGZ1bmN0aW9uKHNlcUlkKSB7XG4gICAgY29uc3QgaWR4ID0gdGhpcy5fbWVzc2FnZXMuZmluZCh7XG4gICAgICBzZXE6IHNlcUlkXG4gICAgfSk7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBjb25zdCBtc2cgPSB0aGlzLl9tZXNzYWdlcy5nZXRBdChpZHgpO1xuICAgICAgY29uc3Qgc3RhdHVzID0gdGhpcy5tc2dTdGF0dXMobXNnKTtcbiAgICAgIGlmIChzdGF0dXMgPT0gTUVTU0FHRV9TVEFUVVNfUVVFVUVEIHx8IHN0YXR1cyA9PSBNRVNTQUdFX1NUQVRVU19GQUlMRUQpIHtcbiAgICAgICAgdGhpcy5fdGlub2RlLl9kYi5yZW1NZXNzYWdlcyh0aGlzLm5hbWUsIHNlcUlkKTtcbiAgICAgICAgbXNnLl9jYW5jZWxsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9tZXNzYWdlcy5kZWxBdChpZHgpO1xuICAgICAgICBpZiAodGhpcy5vbkRhdGEpIHtcbiAgICAgICAgICAvLyBDYWxsaW5nIHdpdGggbm8gcGFyYW1ldGVycyB0byBpbmRpY2F0ZSB0aGUgbWVzc2FnZSB3YXMgZGVsZXRlZC5cbiAgICAgICAgICB0aGlzLm9uRGF0YSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0eXBlIG9mIHRoZSB0b3BpYzogbWUsIHAycCwgZ3JwLCBmbmQuLi5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ30gT25lIG9mICdtZScsICdwMnAnLCAnZ3JwJywgJ2ZuZCcsICdzeXMnIG9yIDxjb2RlPnVuZGVmaW5lZDwvY29kZT4uXG4gICAqL1xuICBnZXRUeXBlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gVGlub2RlLnRvcGljVHlwZSh0aGlzLm5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgY3VycmVudCB1c2VyJ3MgYWNjZXNzIG1vZGUgb2YgdGhlIHRvcGljLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcmV0dXJucyB7VGlub2RlLkFjY2Vzc01vZGV9IC0gdXNlcidzIGFjY2VzcyBtb2RlXG4gICAqL1xuICBnZXRBY2Nlc3NNb2RlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hY3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBjdXJyZW50IHVzZXIncyBhY2Nlc3MgbW9kZSBvZiB0aGUgdG9waWMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEBwYXJhbSB7QWNjZXNzTW9kZSB8IE9iamVjdH0gYWNzIC0gYWNjZXNzIG1vZGUgdG8gc2V0LlxuICAgKi9cbiAgc2V0QWNjZXNzTW9kZTogZnVuY3Rpb24oYWNzKSB7XG4gICAgcmV0dXJuIHRoaXMuYWNzID0gbmV3IEFjY2Vzc01vZGUoYWNzKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRvcGljJ3MgZGVmYXVsdCBhY2Nlc3MgbW9kZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHJldHVybnMge1Rpbm9kZS5EZWZBY3N9IC0gYWNjZXNzIG1vZGUsIHN1Y2ggYXMge2F1dGg6IGBSV1BgLCBhbm9uOiBgTmB9LlxuICAgKi9cbiAgZ2V0RGVmYXVsdEFjY2VzczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVmYWNzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIG5ldyBtZXRhIHtAbGluayBUaW5vZGUuR2V0UXVlcnl9IGJ1aWxkZXIuIFRoZSBxdWVyeSBpcyBhdHRjaGVkIHRvIHRoZSBjdXJyZW50IHRvcGljLlxuICAgKiBJdCB3aWxsIG5vdCB3b3JrIGNvcnJlY3RseSBpZiB1c2VkIHdpdGggYSBkaWZmZXJlbnQgdG9waWMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuTWV0YUdldEJ1aWxkZXJ9IHF1ZXJ5IGF0dGFjaGVkIHRvIHRoZSBjdXJyZW50IHRvcGljLlxuICAgKi9cbiAgc3RhcnRNZXRhUXVlcnk6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgTWV0YUdldEJ1aWxkZXIodGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRvcGljIGlzIGFyY2hpdmVkLCBpLmUuIHByaXZhdGUuYXJjaCA9PSB0cnVlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0b3BpYyBpcyBhcmNoaXZlZCwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAgICovXG4gIGlzQXJjaGl2ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnByaXZhdGUgJiYgdGhpcy5wcml2YXRlLmFyY2ggPyB0cnVlIDogZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRvcGljIGlzIGEgJ21lJyB0b3BpYy5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpYyNcbiAgICpcbiAgICogQHJldHVybnMge2Jvb2xlYW59IC0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdG9waWMgaXMgYSAnbWUnIHRvcGljLCA8Y29kZT5mYWxzZTwvY29kZT4gb3RoZXJ3aXNlLlxuICAgKi9cbiAgaXNNZVR5cGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBUaW5vZGUuaXNNZVRvcGljTmFtZSh0aGlzLm5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0b3BpYyBpcyBhIGNoYW5uZWwuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAtIDxjb2RlPnRydWU8L2NvZGU+IGlmIHRvcGljIGlzIGEgY2hhbm5lbCwgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAgICovXG4gIGlzQ2hhbm5lbFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBUaW5vZGUuaXNDaGFubmVsVG9waWNOYW1lKHRoaXMubmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRvcGljIGlzIGEgZ3JvdXAgdG9waWMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAtIDxjb2RlPnRydWU8L2NvZGU+IGlmIHRvcGljIGlzIGEgZ3JvdXAsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gICAqL1xuICBpc0dyb3VwVHlwZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFRpbm9kZS5pc0dyb3VwVG9waWNOYW1lKHRoaXMubmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRvcGljIGlzIGEgcDJwIHRvcGljLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0b3BpYyBpcyBhIHAycCB0b3BpYywgPGNvZGU+ZmFsc2U8L2NvZGU+IG90aGVyd2lzZS5cbiAgICovXG4gIGlzUDJQVHlwZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFRpbm9kZS5pc1AyUFRvcGljTmFtZSh0aGlzLm5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0b3BpYyBpcyBhIGNvbW11bmljYXRpb24gdG9waWMsIGkuZS4gYSBncm91cCBvciBwMnAgdG9waWMuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWMjXG4gICAqXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAtIDxjb2RlPnRydWU8L2NvZGU+IGlmIHRvcGljIGlzIGEgcDJwIG9yIGdyb3VwIHRvcGljLCA8Y29kZT5mYWxzZTwvY29kZT4gb3RoZXJ3aXNlLlxuICAgKi9cbiAgaXNDb21tVHlwZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFRpbm9kZS5pc0NvbW1Ub3BpY05hbWUodGhpcy5uYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHN0YXR1cyAocXVldWVkLCBzZW50LCByZWNlaXZlZCBldGMpIG9mIGEgZ2l2ZW4gbWVzc2FnZSBpbiB0aGUgY29udGV4dFxuICAgKiBvZiB0aGlzIHRvcGljLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljI1xuICAgKlxuICAgKiBAcGFyYW0ge01lc3NhZ2V9IG1zZyAtIG1lc3NhZ2UgdG8gY2hlY2sgZm9yIHN0YXR1cy5cbiAgICogQHBhcmFtIHtib29sZWFufSB1cGQgLSB1cGRhdGUgY2hhY2hlZCBtZXNzYWdlIHN0YXR1cy5cbiAgICpcbiAgICogQHJldHVybnMgbWVzc2FnZSBzdGF0dXMgY29uc3RhbnQuXG4gICAqL1xuICBtc2dTdGF0dXM6IGZ1bmN0aW9uKG1zZywgdXBkKSB7XG4gICAgbGV0IHN0YXR1cyA9IE1FU1NBR0VfU1RBVFVTX05PTkU7XG4gICAgaWYgKHRoaXMuX3Rpbm9kZS5pc01lKG1zZy5mcm9tKSkge1xuICAgICAgaWYgKG1zZy5fc2VuZGluZykge1xuICAgICAgICBzdGF0dXMgPSBNRVNTQUdFX1NUQVRVU19TRU5ESU5HO1xuICAgICAgfSBlbHNlIGlmIChtc2cuX2ZhaWxlZCB8fCBtc2cuX2NhbmNlbGxlZCkge1xuICAgICAgICBzdGF0dXMgPSBNRVNTQUdFX1NUQVRVU19GQUlMRUQ7XG4gICAgICB9IGVsc2UgaWYgKG1zZy5zZXEgPj0gTE9DQUxfU0VRSUQpIHtcbiAgICAgICAgc3RhdHVzID0gTUVTU0FHRV9TVEFUVVNfUVVFVUVEO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm1zZ1JlYWRDb3VudChtc2cuc2VxKSA+IDApIHtcbiAgICAgICAgc3RhdHVzID0gTUVTU0FHRV9TVEFUVVNfUkVBRDtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5tc2dSZWN2Q291bnQobXNnLnNlcSkgPiAwKSB7XG4gICAgICAgIHN0YXR1cyA9IE1FU1NBR0VfU1RBVFVTX1JFQ0VJVkVEO1xuICAgICAgfSBlbHNlIGlmIChtc2cuc2VxID4gMCkge1xuICAgICAgICBzdGF0dXMgPSBNRVNTQUdFX1NUQVRVU19TRU5UO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobXNnLl9zdGF0dXMgPT0gTUVTU0FHRV9TVEFUVVNfREVMX1JBTkdFKSB7XG4gICAgICBzdGF0dXMgPT0gTUVTU0FHRV9TVEFUVVNfREVMX1JBTkdFO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0dXMgPSBNRVNTQUdFX1NUQVRVU19UT19NRTtcbiAgICB9XG5cbiAgICBpZiAodXBkICYmIG1zZy5fc3RhdHVzICE9IHN0YXR1cykge1xuICAgICAgbXNnLl9zdGF0dXMgPSBzdGF0dXM7XG4gICAgICB0aGlzLl90aW5vZGUuX2RiLnVwZE1lc3NhZ2VTdGF0dXModGhpcy5uYW1lLCBtc2cuc2VxLCBzdGF0dXMpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0dXM7XG4gIH0sXG5cbiAgLy8gUHJvY2VzcyBkYXRhIG1lc3NhZ2VcbiAgX3JvdXRlRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChkYXRhLmNvbnRlbnQpIHtcbiAgICAgIGlmICghdGhpcy50b3VjaGVkIHx8IHRoaXMudG91Y2hlZCA8IGRhdGEudHMpIHtcbiAgICAgICAgdGhpcy50b3VjaGVkID0gZGF0YS50cztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGF0YS5zZXEgPiB0aGlzLl9tYXhTZXEpIHtcbiAgICAgIHRoaXMuX21heFNlcSA9IGRhdGEuc2VxO1xuICAgIH1cbiAgICBpZiAoZGF0YS5zZXEgPCB0aGlzLl9taW5TZXEgfHwgdGhpcy5fbWluU2VxID09IDApIHtcbiAgICAgIHRoaXMuX21pblNlcSA9IGRhdGEuc2VxO1xuICAgIH1cblxuICAgIGlmICghZGF0YS5fbm9Gb3J3YXJkaW5nKSB7XG4gICAgICB0aGlzLl9tZXNzYWdlcy5wdXQoZGF0YSk7XG4gICAgICB0aGlzLl90aW5vZGUuX2RiLmFkZE1lc3NhZ2UoZGF0YSk7XG4gICAgICB0aGlzLl91cGRhdGVEZWxldGVkUmFuZ2VzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25EYXRhKSB7XG4gICAgICB0aGlzLm9uRGF0YShkYXRhKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgbG9jYWxseSBjYWNoZWQgY29udGFjdCB3aXRoIHRoZSBuZXcgbWVzc2FnZSBjb3VudC5cbiAgICBjb25zdCB3aGF0ID0gKCghdGhpcy5pc0NoYW5uZWxUeXBlKCkgJiYgIWRhdGEuZnJvbSkgfHwgdGhpcy5fdGlub2RlLmlzTWUoZGF0YS5mcm9tKSkgPyAncmVhZCcgOiAnbXNnJztcbiAgICB0aGlzLl91cGRhdGVSZWFkUmVjdih3aGF0LCBkYXRhLnNlcSwgZGF0YS50cyk7XG4gICAgLy8gTm90aWZ5ICdtZScgbGlzdGVuZXJzIG9mIHRoZSBjaGFuZ2UuXG4gICAgdGhpcy5fdGlub2RlLmdldE1lVG9waWMoKS5fcmVmcmVzaENvbnRhY3Qod2hhdCwgdGhpcyk7XG4gIH0sXG5cbiAgLy8gUHJvY2VzcyBtZXRhZGF0YSBtZXNzYWdlXG4gIF9yb3V0ZU1ldGE6IGZ1bmN0aW9uKG1ldGEpIHtcbiAgICBpZiAobWV0YS5kZXNjKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzTWV0YURlc2MobWV0YS5kZXNjKTtcbiAgICB9XG4gICAgaWYgKG1ldGEuc3ViICYmIG1ldGEuc3ViLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhU3ViKG1ldGEuc3ViKTtcbiAgICB9XG4gICAgaWYgKG1ldGEuZGVsKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzRGVsTWVzc2FnZXMobWV0YS5kZWwuY2xlYXIsIG1ldGEuZGVsLmRlbHNlcSk7XG4gICAgfVxuICAgIGlmIChtZXRhLnRhZ3MpIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhVGFncyhtZXRhLnRhZ3MpO1xuICAgIH1cbiAgICBpZiAobWV0YS5jcmVkKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzTWV0YUNyZWRzKG1ldGEuY3JlZCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9uTWV0YSkge1xuICAgICAgdGhpcy5vbk1ldGEobWV0YSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFByb2Nlc3MgcHJlc2VuY2UgY2hhbmdlIG1lc3NhZ2VcbiAgX3JvdXRlUHJlczogZnVuY3Rpb24ocHJlcykge1xuICAgIGxldCB1c2VyO1xuICAgIHN3aXRjaCAocHJlcy53aGF0KSB7XG4gICAgICBjYXNlICdkZWwnOlxuICAgICAgICAvLyBEZWxldGUgY2FjaGVkIG1lc3NhZ2VzLlxuICAgICAgICB0aGlzLl9wcm9jZXNzRGVsTWVzc2FnZXMocHJlcy5jbGVhciwgcHJlcy5kZWxzZXEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29uJzpcbiAgICAgIGNhc2UgJ29mZic6XG4gICAgICAgIC8vIFVwZGF0ZSBvbmxpbmUgc3RhdHVzIG9mIGEgc3Vic2NyaXB0aW9uLlxuICAgICAgICB1c2VyID0gdGhpcy5fdXNlcnNbcHJlcy5zcmNdO1xuICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgIHVzZXIub25saW5lID0gcHJlcy53aGF0ID09ICdvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fdGlub2RlLmxvZ2dlcihcIldBUk5JTkc6IFByZXNlbmNlIHVwZGF0ZSBmb3IgYW4gdW5rbm93biB1c2VyXCIsIHRoaXMubmFtZSwgcHJlcy5zcmMpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndGVybSc6XG4gICAgICAgIC8vIEF0dGFjaG1lbnQgdG8gdG9waWMgaXMgdGVybWluYXRlZCBwcm9iYWJseSBkdWUgdG8gY2x1c3RlciByZWhhc2hpbmcuXG4gICAgICAgIHRoaXMuX3Jlc2V0U3ViKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnYWNzJzpcbiAgICAgICAgY29uc3QgdWlkID0gcHJlcy5zcmMgfHwgdGhpcy5fdGlub2RlLmdldEN1cnJlbnRVc2VySUQoKTtcbiAgICAgICAgdXNlciA9IHRoaXMuX3VzZXJzW3VpZF07XG4gICAgICAgIGlmICghdXNlcikge1xuICAgICAgICAgIC8vIFVwZGF0ZSBmb3IgYW4gdW5rbm93biB1c2VyOiBub3RpZmljYXRpb24gb2YgYSBuZXcgc3Vic2NyaXB0aW9uLlxuICAgICAgICAgIGNvbnN0IGFjcyA9IG5ldyBBY2Nlc3NNb2RlKCkudXBkYXRlQWxsKHByZXMuZGFjcyk7XG4gICAgICAgICAgaWYgKGFjcyAmJiBhY3MubW9kZSAhPSBBY2Nlc3NNb2RlLl9OT05FKSB7XG4gICAgICAgICAgICB1c2VyID0gdGhpcy5fY2FjaGVHZXRVc2VyKHVpZCk7XG4gICAgICAgICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgICAgICAgdXNlciA9IHtcbiAgICAgICAgICAgICAgICB1c2VyOiB1aWQsXG4gICAgICAgICAgICAgICAgYWNzOiBhY3NcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgdGhpcy5nZXRNZXRhKHRoaXMuc3RhcnRNZXRhUXVlcnkoKS53aXRoT25lU3ViKHVuZGVmaW5lZCwgdWlkKS5idWlsZCgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHVzZXIuYWNzID0gYWNzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXNlci51cGRhdGVkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhU3ViKFt1c2VyXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEtub3duIHVzZXJcbiAgICAgICAgICB1c2VyLmFjcy51cGRhdGVBbGwocHJlcy5kYWNzKTtcbiAgICAgICAgICAvLyBVcGRhdGUgdXNlcidzIGFjY2VzcyBtb2RlLlxuICAgICAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhU3ViKFt7XG4gICAgICAgICAgICB1c2VyOiB1aWQsXG4gICAgICAgICAgICB1cGRhdGVkOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgYWNzOiB1c2VyLmFjc1xuICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuX3Rpbm9kZS5sb2dnZXIoXCJJTkZPOiBJZ25vcmVkIHByZXNlbmNlIHVwZGF0ZVwiLCBwcmVzLndoYXQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uUHJlcykge1xuICAgICAgdGhpcy5vblByZXMocHJlcyk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFByb2Nlc3Mge2luZm99IG1lc3NhZ2VcbiAgX3JvdXRlSW5mbzogZnVuY3Rpb24oaW5mbykge1xuICAgIGlmIChpbmZvLndoYXQgIT09ICdrcCcpIHtcbiAgICAgIGNvbnN0IHVzZXIgPSB0aGlzLl91c2Vyc1tpbmZvLmZyb21dO1xuICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgdXNlcltpbmZvLndoYXRdID0gaW5mby5zZXE7XG4gICAgICAgIGlmICh1c2VyLnJlY3YgPCB1c2VyLnJlYWQpIHtcbiAgICAgICAgICB1c2VyLnJlY3YgPSB1c2VyLnJlYWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG1zZyA9IHRoaXMubGF0ZXN0TWVzc2FnZSgpO1xuICAgICAgaWYgKG1zZykge1xuICAgICAgICB0aGlzLm1zZ1N0YXR1cyhtc2csIHRydWUpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIGlzIGFuIHVwZGF0ZSBmcm9tIHRoZSBjdXJyZW50IHVzZXIsIHVwZGF0ZSB0aGUgY2FjaGUgd2l0aCB0aGUgbmV3IGNvdW50LlxuICAgICAgaWYgKHRoaXMuX3Rpbm9kZS5pc01lKGluZm8uZnJvbSkpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlUmVhZFJlY3YoaW5mby53aGF0LCBpbmZvLnNlcSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vdGlmeSAnbWUnIGxpc3RlbmVyIG9mIHRoZSBzdGF0dXMgY2hhbmdlLlxuICAgICAgdGhpcy5fdGlub2RlLmdldE1lVG9waWMoKS5fcmVmcmVzaENvbnRhY3QoaW5mby53aGF0LCB0aGlzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub25JbmZvKSB7XG4gICAgICB0aGlzLm9uSW5mbyhpbmZvKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gQ2FsbGVkIGJ5IFRpbm9kZSB3aGVuIG1ldGEuZGVzYyBwYWNrZXQgaXMgcmVjZWl2ZWQuXG4gIC8vIENhbGxlZCBieSAnbWUnIHRvcGljIG9uIGNvbnRhY3QgdXBkYXRlIChkZXNjLl9ub0ZvcndhcmRpbmcgaXMgdHJ1ZSkuXG4gIF9wcm9jZXNzTWV0YURlc2M6IGZ1bmN0aW9uKGRlc2MpIHtcbiAgICBpZiAodGhpcy5pc1AyUFR5cGUoKSkge1xuICAgICAgLy8gU3ludGhldGljIGRlc2MgbWF5IGluY2x1ZGUgZGVmYWNzIGZvciBwMnAgdG9waWNzIHdoaWNoIGlzIHVzZWxlc3MuXG4gICAgICAvLyBSZW1vdmUgaXQuXG4gICAgICBkZWxldGUgZGVzYy5kZWZhY3M7XG5cbiAgICAgIC8vIFVwZGF0ZSB0byBwMnAgZGVzYyBpcyB0aGUgc2FtZSBhcyB1c2VyIHVwZGF0ZS4gVXBkYXRlIGNhY2hlZCB1c2VyLlxuICAgICAgdGhpcy5fdGlub2RlLl9kYi51cGRVc2VyKHRoaXMubmFtZSwgZGVzYy5wdWJsaWMpO1xuICAgIH1cblxuICAgIC8vIENvcHkgcGFyYW1ldGVycyBmcm9tIGRlc2Mgb2JqZWN0IHRvIHRoaXMgdG9waWMuXG4gICAgbWVyZ2VPYmoodGhpcywgZGVzYyk7XG4gICAgLy8gTWFrZSBzdXJlIGRhdGUgZmllbGRzIGFyZSBEYXRlKCkuXG4gICAgc3RyaW5nVG9EYXRlKHRoaXMpO1xuICAgIC8vIFVwZGF0ZSBwZXJzaXN0ZW50IGNhY2hlLlxuICAgIHRoaXMuX3Rpbm9kZS5fZGIudXBkVG9waWModGhpcyk7XG5cbiAgICAvLyBOb3RpZnkgJ21lJyBsaXN0ZW5lciwgaWYgYXZhaWxhYmxlOlxuICAgIGlmICh0aGlzLm5hbWUgIT09IFRPUElDX01FICYmICFkZXNjLl9ub0ZvcndhcmRpbmcpIHtcbiAgICAgIGNvbnN0IG1lID0gdGhpcy5fdGlub2RlLmdldE1lVG9waWMoKTtcbiAgICAgIGlmIChtZS5vbk1ldGFTdWIpIHtcbiAgICAgICAgbWUub25NZXRhU3ViKHRoaXMpO1xuICAgICAgfVxuICAgICAgaWYgKG1lLm9uU3Vic1VwZGF0ZWQpIHtcbiAgICAgICAgbWUub25TdWJzVXBkYXRlZChbdGhpcy5uYW1lXSwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25NZXRhRGVzYykge1xuICAgICAgdGhpcy5vbk1ldGFEZXNjKHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICAvLyBDYWxsZWQgYnkgVGlub2RlIHdoZW4gbWV0YS5zdWIgaXMgcmVjaXZlZCBvciBpbiByZXNwb25zZSB0byByZWNlaXZlZFxuICAvLyB7Y3RybH0gYWZ0ZXIgc2V0TWV0YS1zdWIuXG4gIF9wcm9jZXNzTWV0YVN1YjogZnVuY3Rpb24oc3Vicykge1xuICAgIGZvciAobGV0IGlkeCBpbiBzdWJzKSB7XG4gICAgICBjb25zdCBzdWIgPSBzdWJzW2lkeF07XG5cbiAgICAgIC8vIEZpbGwgZGVmYXVsdHMuXG4gICAgICBzdWIudXBkYXRlZCA9IG5ldyBEYXRlKHN1Yi51cGRhdGVkKTtcbiAgICAgIHN1Yi5kZWxldGVkID0gc3ViLmRlbGV0ZWQgPyBuZXcgRGF0ZShzdWIuZGVsZXRlZCkgOiBudWxsO1xuICAgICAgc3ViLm9ubGluZSA9ICEhc3ViLm9ubGluZTtcbiAgICAgIC8vIFVwZGF0ZSB0aW1lc3RhbXAgb2YgdGhlIG1vc3QgcmVjZW50IHN1YnNjcmlwdGlvbiB1cGRhdGUuXG4gICAgICB0aGlzLl9sYXN0U3Vic1VwZGF0ZSA9IG5ldyBEYXRlKE1hdGgubWF4KHRoaXMuX2xhc3RTdWJzVXBkYXRlLCBzdWIudXBkYXRlZCkpO1xuXG4gICAgICBsZXQgdXNlciA9IG51bGw7XG4gICAgICBpZiAoIXN1Yi5kZWxldGVkKSB7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBjaGFuZ2UgdG8gdXNlcidzIG93biBwZXJtaXNzaW9ucywgdXBkYXRlIHRoZW0gaW4gdG9waWMgdG9vLlxuICAgICAgICAvLyBEZXNjIHdpbGwgdXBkYXRlICdtZScgdG9waWMuXG4gICAgICAgIGlmICh0aGlzLl90aW5vZGUuaXNNZShzdWIudXNlcikgJiYgc3ViLmFjcykge1xuICAgICAgICAgIHRoaXMuX3Byb2Nlc3NNZXRhRGVzYyh7XG4gICAgICAgICAgICB1cGRhdGVkOiBzdWIudXBkYXRlZCxcbiAgICAgICAgICAgIHRvdWNoZWQ6IHN1Yi51cGRhdGVkLFxuICAgICAgICAgICAgYWNzOiBzdWIuYWNzXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdXNlciA9IHRoaXMuX3VwZGF0ZUNhY2hlZFVzZXIoc3ViLnVzZXIsIHN1Yik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBTdWJzY3JpcHRpb24gaXMgZGVsZXRlZCwgcmVtb3ZlIGl0IGZyb20gdG9waWMgKGJ1dCBsZWF2ZSBpbiBVc2VycyBjYWNoZSlcbiAgICAgICAgZGVsZXRlIHRoaXMuX3VzZXJzW3N1Yi51c2VyXTtcbiAgICAgICAgdXNlciA9IHN1YjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub25NZXRhU3ViKSB7XG4gICAgICAgIHRoaXMub25NZXRhU3ViKHVzZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9uU3Vic1VwZGF0ZWQpIHtcbiAgICAgIHRoaXMub25TdWJzVXBkYXRlZChPYmplY3Qua2V5cyh0aGlzLl91c2VycykpO1xuICAgIH1cbiAgfSxcblxuICAvLyBDYWxsZWQgYnkgVGlub2RlIHdoZW4gbWV0YS50YWdzIGlzIHJlY2l2ZWQuXG4gIF9wcm9jZXNzTWV0YVRhZ3M6IGZ1bmN0aW9uKHRhZ3MpIHtcbiAgICBpZiAodGFncy5sZW5ndGggPT0gMSAmJiB0YWdzWzBdID09IFRpbm9kZS5ERUxfQ0hBUikge1xuICAgICAgdGFncyA9IFtdO1xuICAgIH1cbiAgICB0aGlzLl90YWdzID0gdGFncztcbiAgICBpZiAodGhpcy5vblRhZ3NVcGRhdGVkKSB7XG4gICAgICB0aGlzLm9uVGFnc1VwZGF0ZWQodGFncyk7XG4gICAgfVxuICB9LFxuXG4gIC8vIERvIG5vdGhpbmcgZm9yIHRvcGljcyBvdGhlciB0aGFuICdtZSdcbiAgX3Byb2Nlc3NNZXRhQ3JlZHM6IGZ1bmN0aW9uKGNyZWRzKSB7fSxcblxuICAvLyBEZWxldGUgY2FjaGVkIG1lc3NhZ2VzIGFuZCB1cGRhdGUgY2FjaGVkIHRyYW5zYWN0aW9uIElEc1xuICBfcHJvY2Vzc0RlbE1lc3NhZ2VzOiBmdW5jdGlvbihjbGVhciwgZGVsc2VxKSB7XG4gICAgdGhpcy5fbWF4RGVsID0gTWF0aC5tYXgoY2xlYXIsIHRoaXMuX21heERlbCk7XG4gICAgdGhpcy5jbGVhciA9IE1hdGgubWF4KGNsZWFyLCB0aGlzLmNsZWFyKTtcbiAgICBjb25zdCB0b3BpYyA9IHRoaXM7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkZWxzZXEpKSB7XG4gICAgICBkZWxzZXEubWFwKGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgIGlmICghcmFuZ2UuaGkpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgIHRvcGljLmZsdXNoTWVzc2FnZShyYW5nZS5sb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAobGV0IGkgPSByYW5nZS5sb3c7IGkgPCByYW5nZS5oaTsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgdG9waWMuZmx1c2hNZXNzYWdlKGkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvdW50ID4gMCkge1xuICAgICAgdGhpcy5fdXBkYXRlRGVsZXRlZFJhbmdlcygpO1xuXG4gICAgICBpZiAodGhpcy5vbkRhdGEpIHtcbiAgICAgICAgdGhpcy5vbkRhdGEoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLy8gVG9waWMgaXMgaW5mb3JtZWQgdGhhdCB0aGUgZW50aXJlIHJlc3BvbnNlIHRvIHtnZXQgd2hhdD1kYXRhfSBoYXMgYmVlbiByZWNlaXZlZC5cbiAgX2FsbE1lc3NhZ2VzUmVjZWl2ZWQ6IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgdGhpcy5fdXBkYXRlRGVsZXRlZFJhbmdlcygpO1xuXG4gICAgaWYgKHRoaXMub25BbGxNZXNzYWdlc1JlY2VpdmVkKSB7XG4gICAgICB0aGlzLm9uQWxsTWVzc2FnZXNSZWNlaXZlZChjb3VudCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFJlc2V0IHN1YnNjcmliZWQgc3RhdGVcbiAgX3Jlc2V0U3ViOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zdWJzY3JpYmVkID0gZmFsc2U7XG4gIH0sXG5cbiAgLy8gVGhpcyB0b3BpYyBpcyBlaXRoZXIgZGVsZXRlZCBvciB1bnN1YnNjcmliZWQgZnJvbS5cbiAgX2dvbmU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX21lc3NhZ2VzLnJlc2V0KCk7XG4gICAgdGhpcy5fdGlub2RlLl9kYi5yZW1NZXNzYWdlcyh0aGlzLm5hbWUpO1xuICAgIHRoaXMuX3VzZXJzID0ge307XG4gICAgdGhpcy5hY3MgPSBuZXcgQWNjZXNzTW9kZShudWxsKTtcbiAgICB0aGlzLnByaXZhdGUgPSBudWxsO1xuICAgIHRoaXMucHVibGljID0gbnVsbDtcbiAgICB0aGlzLl9tYXhTZXEgPSAwO1xuICAgIHRoaXMuX21pblNlcSA9IDA7XG4gICAgdGhpcy5fc3Vic2NyaWJlZCA9IGZhbHNlO1xuXG4gICAgY29uc3QgbWUgPSB0aGlzLl90aW5vZGUuZ2V0TWVUb3BpYygpO1xuICAgIGlmIChtZSkge1xuICAgICAgbWUuX3JvdXRlUHJlcyh7XG4gICAgICAgIF9ub0ZvcndhcmRpbmc6IHRydWUsXG4gICAgICAgIHdoYXQ6ICdnb25lJyxcbiAgICAgICAgdG9waWM6IFRPUElDX01FLFxuICAgICAgICBzcmM6IHRoaXMubmFtZVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9uRGVsZXRlVG9waWMpIHtcbiAgICAgIHRoaXMub25EZWxldGVUb3BpYygpO1xuICAgIH1cbiAgfSxcblxuICAvLyBVcGRhdGUgZ2xvYmFsIHVzZXIgY2FjaGUgYW5kIGxvY2FsIHN1YnNjcmliZXJzIGNhY2hlLlxuICAvLyBEb24ndCBjYWxsIHRoaXMgbWV0aG9kIGZvciBub24tc3Vic2NyaWJlcnMuXG4gIF91cGRhdGVDYWNoZWRVc2VyOiBmdW5jdGlvbih1aWQsIG9iaikge1xuICAgIC8vIEZldGNoIHVzZXIgb2JqZWN0IGZyb20gdGhlIGdsb2JhbCBjYWNoZS5cbiAgICAvLyBUaGlzIGlzIGEgY2xvbmUgb2YgdGhlIHN0b3JlZCBvYmplY3RcbiAgICBsZXQgY2FjaGVkID0gdGhpcy5fY2FjaGVHZXRVc2VyKHVpZCk7XG4gICAgY2FjaGVkID0gbWVyZ2VPYmooY2FjaGVkIHx8IHt9LCBvYmopO1xuICAgIC8vIFNhdmUgdG8gZ2xvYmFsIGNhY2hlXG4gICAgdGhpcy5fY2FjaGVQdXRVc2VyKHVpZCwgY2FjaGVkKTtcbiAgICAvLyBTYXZlIHRvIHRoZSBsaXN0IG9mIHRvcGljIHN1YnNyaWJlcnMuXG4gICAgcmV0dXJuIG1lcmdlVG9DYWNoZSh0aGlzLl91c2VycywgdWlkLCBjYWNoZWQpO1xuICB9LFxuXG4gIC8vIEdldCBsb2NhbCBzZXFJZCBmb3IgYSBxdWV1ZWQgbWVzc2FnZS5cbiAgX2dldFF1ZXVlZFNlcUlkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcXVldWVkU2VxSWQrKztcbiAgfSxcblxuICAvLyBDYWxjdWxhdGUgcmFuZ2VzIG9mIG1pc3NpbmcgbWVzc2FnZXMuXG4gIF91cGRhdGVEZWxldGVkUmFuZ2VzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCByYW5nZXMgPSBbXTtcblxuICAgIGxldCBwcmV2ID0gbnVsbDtcbiAgICAvLyBDaGVjayBmb3IgZ2FwIGluIHRoZSBiZWdpbm5pbmcsIGJlZm9yZSB0aGUgZmlyc3QgbWVzc2FnZS5cbiAgICBjb25zdCBmaXJzdCA9IHRoaXMuX21lc3NhZ2VzLmdldEF0KDApO1xuICAgIGlmIChmaXJzdCAmJiB0aGlzLl9taW5TZXEgPiAxICYmICF0aGlzLl9ub0VhcmxpZXJNc2dzKSB7XG4gICAgICAvLyBTb21lIG1lc3NhZ2VzIGFyZSBtaXNzaW5nIGluIHRoZSBiZWdpbm5pbmcuXG4gICAgICBpZiAoZmlyc3QuaGkpIHtcbiAgICAgICAgLy8gVGhlIGZpcnN0IG1lc3NhZ2UgYWxyZWFkeSByZXByZXNlbnRzIGEgZ2FwLlxuICAgICAgICBpZiAoZmlyc3Quc2VxID4gMSkge1xuICAgICAgICAgIGZpcnN0LnNlcSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpcnN0LmhpIDwgdGhpcy5fbWluU2VxIC0gMSkge1xuICAgICAgICAgIGZpcnN0LmhpID0gdGhpcy5fbWluU2VxIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBwcmV2ID0gZmlyc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgbmV3IGdhcC5cbiAgICAgICAgcHJldiA9IHtcbiAgICAgICAgICBzZXE6IDEsXG4gICAgICAgICAgaGk6IHRoaXMuX21pblNlcSAtIDFcbiAgICAgICAgfTtcbiAgICAgICAgcmFuZ2VzLnB1c2gocHJldik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIGdhcCBpbiB0aGUgYmVnaW5uaW5nLlxuICAgICAgcHJldiA9IHtcbiAgICAgICAgc2VxOiAwLFxuICAgICAgICBoaTogMFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIGdhcHMgaW4gdGhlIGxpc3Qgb2YgcmVjZWl2ZWQgbWVzc2FnZXMuIFRoZSBsaXN0IGNvbnRhaW5zIG1lc3NhZ2VzLXByb3BlciBhcyB3ZWxsXG4gICAgLy8gYXMgcGxhY2Vob2xlcnMgZm9yIGRlbGV0ZWQgcmFuZ2VzLlxuICAgIC8vIFRoZSBtZXNzYWdlcyBhcmUgaXRlcmF0ZWQgYnkgc2VxIElEIGluIGFzY2VuZGluZyBvcmRlci5cbiAgICB0aGlzLl9tZXNzYWdlcy5mb3JFYWNoKChkYXRhKSA9PiB7XG4gICAgICAvLyBEbyBub3QgY3JlYXRlIGEgZ2FwIGJldHdlZW4gdGhlIGxhc3Qgc2VudCBtZXNzYWdlIGFuZCB0aGUgZmlyc3QgdW5zZW50LlxuICAgICAgaWYgKGRhdGEuc2VxID49IExPQ0FMX1NFUUlEKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTmV3IG1lc3NhZ2UgaXMgcmVkdWNpbmcgdGhlIGV4aXN0aW5nIGdhcFxuICAgICAgaWYgKGRhdGEuc2VxID09IChwcmV2LmhpIHx8IHByZXYuc2VxKSArIDEpIHtcbiAgICAgICAgLy8gTm8gbmV3IGdhcC4gUmVwbGFjZSBwcmV2aW91cyB3aXRoIGN1cnJlbnQuXG4gICAgICAgIHByZXYgPSBkYXRhO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEZvdW5kIGEgbmV3IGdhcC5cbiAgICAgIGlmIChwcmV2LmhpKSB7XG4gICAgICAgIC8vIFByZXZpb3VzIGlzIGFsc28gYSBnYXAsIGFsdGVyIGl0LlxuICAgICAgICBwcmV2LmhpID0gZGF0YS5oaSB8fCBkYXRhLnNlcTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBQcmV2aW91cyBpcyBub3QgYSBnYXAuIENyZWF0ZSBhIG5ldyBnYXAuXG4gICAgICBwcmV2ID0ge1xuICAgICAgICBzZXE6IChwcmV2LmhpIHx8IHByZXYuc2VxKSArIDEsXG4gICAgICAgIGhpOiBkYXRhLmhpIHx8IGRhdGEuc2VxXG4gICAgICB9O1xuICAgICAgcmFuZ2VzLnB1c2gocHJldik7XG4gICAgfSk7XG5cbiAgICAvLyBDaGVjayBmb3IgbWlzc2luZyBtZXNzYWdlcyBhdCB0aGUgZW5kLlxuICAgIC8vIEFsbCBtZXNzYWdlcyBjb3VsZCBiZSBtaXNzaW5nIG9yIGl0IGNvdWxkIGJlIGEgbmV3IHRvcGljIHdpdGggbm8gbWVzc2FnZXMuXG4gICAgY29uc3QgbGFzdCA9IHRoaXMuX21lc3NhZ2VzLmdldExhc3QoKTtcbiAgICBjb25zdCBtYXhTZXEgPSBNYXRoLm1heCh0aGlzLnNlcSwgdGhpcy5fbWF4U2VxKSB8fCAwO1xuICAgIGlmICgobWF4U2VxID4gMCAmJiAhbGFzdCkgfHwgKGxhc3QgJiYgKChsYXN0LmhpIHx8IGxhc3Quc2VxKSA8IG1heFNlcSkpKSB7XG4gICAgICBpZiAobGFzdCAmJiBsYXN0LmhpKSB7XG4gICAgICAgIC8vIEV4dGVuZCBleGlzdGluZyBnYXBcbiAgICAgICAgbGFzdC5oaSA9IG1heFNlcTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZ2FwLlxuICAgICAgICByYW5nZXMucHVzaCh7XG4gICAgICAgICAgc2VxOiBsYXN0ID8gbGFzdC5zZXEgKyAxIDogMSxcbiAgICAgICAgICBoaTogbWF4U2VxXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEluc2VydCBuZXcgZ2FwcyBpbnRvIGNhY2hlLlxuICAgIHJhbmdlcy5tYXAoKGdhcCkgPT4ge1xuICAgICAgZ2FwLl9zdGF0dXMgPSBNRVNTQUdFX1NUQVRVU19ERUxfUkFOR0U7XG4gICAgICB0aGlzLl9tZXNzYWdlcy5wdXQoZ2FwKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBMb2FkIG1vc3QgcmVjZW50IG1lc3NhZ2VzIGZyb20gcGVyc2lzdGVudCBjYWNoZS5cbiAgX2xvYWRNZXNzYWdlczogZnVuY3Rpb24oZGIpIHtcbiAgICByZXR1cm4gZGIucmVhZE1lc3NhZ2VzKHRoaXMubmFtZSwge1xuICAgICAgICBsaW1pdDogREVGQVVMVF9NRVNTQUdFU19QQUdFXG4gICAgICB9KVxuICAgICAgLnRoZW4oKG1zZ3MpID0+IHtcbiAgICAgICAgbXNncy5mb3JFYWNoKChkYXRhKSA9PiB7XG4gICAgICAgICAgaWYgKGRhdGEuc2VxID4gdGhpcy5fbWF4U2VxKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXhTZXEgPSBkYXRhLnNlcTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRhdGEuc2VxIDwgdGhpcy5fbWluU2VxIHx8IHRoaXMuX21pblNlcSA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9taW5TZXEgPSBkYXRhLnNlcTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fbWVzc2FnZXMucHV0KGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl91cGRhdGVEZWxldGVkUmFuZ2VzKCk7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XG4gICAgICB9KTtcbiAgfSxcblxuICAvLyBQdXNoIG9yIHtwcmVzfTogbWVzc2FnZSByZWNlaXZlZC5cbiAgX3VwZGF0ZVJlY2VpdmVkOiBmdW5jdGlvbihzZXEsIGFjdCkge1xuICAgIHRoaXMudG91Y2hlZCA9IG5ldyBEYXRlKCk7XG4gICAgdGhpcy5zZXEgPSBzZXEgfCAwO1xuICAgIC8vIENoZWNrIGlmIG1lc3NhZ2UgaXMgc2VudCBieSB0aGUgY3VycmVudCB1c2VyLiBJZiBzbyBpdCdzIGJlZW4gcmVhZCBhbHJlYWR5LlxuICAgIGlmICghYWN0IHx8IHRoaXMuX3Rpbm9kZS5pc01lKGFjdCkpIHtcbiAgICAgIHRoaXMucmVhZCA9IHRoaXMucmVhZCA/IE1hdGgubWF4KHRoaXMucmVhZCwgdGhpcy5zZXEpIDogdGhpcy5zZXE7XG4gICAgICB0aGlzLnJlY3YgPSB0aGlzLnJlY3YgPyBNYXRoLm1heCh0aGlzLnJlYWQsIHRoaXMucmVjdikgOiB0aGlzLnJlYWQ7XG4gICAgfVxuICAgIHRoaXMudW5yZWFkID0gdGhpcy5zZXEgLSAodGhpcy5yZWFkIHwgMCk7XG4gICAgdGhpcy5fdGlub2RlLl9kYi51cGRUb3BpYyh0aGlzKTtcbiAgfVxufTtcblxuLyoqXG4gKiBAY2xhc3MgVG9waWNNZSAtIHNwZWNpYWwgY2FzZSBvZiB7QGxpbmsgVGlub2RlLlRvcGljfSBmb3JcbiAqIG1hbmFnaW5nIGRhdGEgb2YgdGhlIGN1cnJlbnQgdXNlciwgaW5jbHVkaW5nIGNvbnRhY3QgbGlzdC5cbiAqIEBleHRlbmRzIFRpbm9kZS5Ub3BpY1xuICogQG1lbWJlcm9mIFRpbm9kZVxuICpcbiAqIEBwYXJhbSB7VG9waWNNZS5DYWxsYmFja3N9IGNhbGxiYWNrcyAtIENhbGxiYWNrcyB0byByZWNlaXZlIHZhcmlvdXMgZXZlbnRzLlxuICovXG52YXIgVG9waWNNZSA9IGZ1bmN0aW9uKGNhbGxiYWNrcykge1xuICBUb3BpYy5jYWxsKHRoaXMsIFRPUElDX01FLCBjYWxsYmFja3MpO1xuXG4gIC8vIG1lLXNwZWNpZmljIGNhbGxiYWNrc1xuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5vbkNvbnRhY3RVcGRhdGUgPSBjYWxsYmFja3Mub25Db250YWN0VXBkYXRlO1xuICB9XG59O1xuXG4vLyBJbmhlcml0IGV2ZXJ5dGluZyBmcm9tIHRoZSBnZW5lcmljIFRvcGljXG5Ub3BpY01lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVG9waWMucHJvdG90eXBlLCB7XG4gIC8vIE92ZXJyaWRlIHRoZSBvcmlnaW5hbCBUb3BpYy5fcHJvY2Vzc01ldGFEZXNjLlxuICBfcHJvY2Vzc01ldGFEZXNjOiB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKGRlc2MpIHtcbiAgICAgIC8vIENoZWNrIGlmIG9ubGluZSBjb250YWN0cyBuZWVkIHRvIGJlIHR1cm5lZCBvZmYgYmVjYXVzZSBQIHBlcm1pc3Npb24gd2FzIHJlbW92ZWQuXG4gICAgICBjb25zdCB0dXJuT2ZmID0gKGRlc2MuYWNzICYmICFkZXNjLmFjcy5pc1ByZXNlbmNlcigpKSAmJiAodGhpcy5hY3MgJiYgdGhpcy5hY3MuaXNQcmVzZW5jZXIoKSk7XG5cbiAgICAgIC8vIENvcHkgcGFyYW1ldGVycyBmcm9tIGRlc2Mgb2JqZWN0IHRvIHRoaXMgdG9waWMuXG4gICAgICBtZXJnZU9iaih0aGlzLCBkZXNjKTtcbiAgICAgIHRoaXMuX3Rpbm9kZS5fZGIudXBkVG9waWModGhpcyk7XG5cbiAgICAgIC8vIFN0cmluZyBkYXRldGltZSBoZWFkZXJzIHRvIERhdGUoKSBvYmplY3RzLlxuICAgICAgc3RyaW5nVG9EYXRlKHRoaXMpO1xuXG4gICAgICAvLyAnUCcgcGVybWlzc2lvbiB3YXMgcmVtb3ZlZC4gQWxsIHRvcGljcyBhcmUgb2ZmbGluZSBub3cuXG4gICAgICBpZiAodHVybk9mZikge1xuICAgICAgICB0aGlzLl90aW5vZGUuY2FjaGVNYXAoJ3RvcGljJywgKGNvbnQpID0+IHtcbiAgICAgICAgICBpZiAoY29udC5vbmxpbmUpIHtcbiAgICAgICAgICAgIGNvbnQub25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoY29udC5zZWVuKSB7XG4gICAgICAgICAgICAgIGNvbnQuc2Vlbi53aGVuID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnQuc2VlbiA9IHtcbiAgICAgICAgICAgICAgICB3aGVuOiBuZXcgRGF0ZSgpXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9yZWZyZXNoQ29udGFjdCgnb2ZmJywgY29udCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub25NZXRhRGVzYykge1xuICAgICAgICB0aGlzLm9uTWV0YURlc2ModGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8vIE92ZXJyaWRlIHRoZSBvcmlnaW5hbCBUb3BpYy5fcHJvY2Vzc01ldGFTdWJcbiAgX3Byb2Nlc3NNZXRhU3ViOiB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKHN1YnMpIHtcbiAgICAgIGxldCB1cGRhdGVDb3VudCA9IDA7XG4gICAgICBzdWJzLmZvckVhY2goKHN1YikgPT4ge1xuICAgICAgICBjb25zdCB0b3BpY05hbWUgPSBzdWIudG9waWM7XG4gICAgICAgIC8vIERvbid0IHNob3cgJ21lJyBhbmQgJ2ZuZCcgdG9waWNzIGluIHRoZSBsaXN0IG9mIGNvbnRhY3RzLlxuICAgICAgICBpZiAodG9waWNOYW1lID09IFRPUElDX0ZORCB8fCB0b3BpY05hbWUgPT0gVE9QSUNfTUUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3ViLnVwZGF0ZWQgPSBuZXcgRGF0ZShzdWIudXBkYXRlZCk7XG4gICAgICAgIHN1Yi50b3VjaGVkID0gc3ViLnRvdWNoZWQgPyBuZXcgRGF0ZShzdWIudG91Y2hlZCkgOiB1bmRlZmluZWQ7XG4gICAgICAgIHN1Yi5kZWxldGVkID0gc3ViLmRlbGV0ZWQgPyBuZXcgRGF0ZShzdWIuZGVsZXRlZCkgOiBudWxsO1xuICAgICAgICBzdWIub25saW5lID0gISFzdWIub25saW5lO1xuXG4gICAgICAgIGxldCBjb250ID0gbnVsbDtcbiAgICAgICAgaWYgKHN1Yi5kZWxldGVkKSB7XG4gICAgICAgICAgY29udCA9IHN1YjtcbiAgICAgICAgICB0aGlzLl90aW5vZGUuY2FjaGVEZWwoJ3RvcGljJywgdG9waWNOYW1lKTtcbiAgICAgICAgICB0aGlzLl90aW5vZGUuX2RiLnJlbVRvcGljKHRvcGljTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gRW5zdXJlIHRoZSB2YWx1ZXMgYXJlIGRlZmluZWQgYW5kIGFyZSBpbnRlZ2Vycy5cbiAgICAgICAgICBpZiAodHlwZW9mIHN1Yi5zZXEgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHN1Yi5zZXEgPSBzdWIuc2VxIHwgMDtcbiAgICAgICAgICAgIHN1Yi5yZWN2ID0gc3ViLnJlY3YgfCAwO1xuICAgICAgICAgICAgc3ViLnJlYWQgPSBzdWIucmVhZCB8IDA7XG4gICAgICAgICAgICBzdWIudW5yZWFkID0gc3ViLnNlcSAtIHN1Yi5yZWFkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzdWIuc2VlbiAmJiBzdWIuc2Vlbi53aGVuKSB7XG4gICAgICAgICAgICBzdWIuc2Vlbi53aGVuID0gbmV3IERhdGUoc3ViLnNlZW4ud2hlbik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29udCA9IG1lcmdlT2JqKHRoaXMuX3Rpbm9kZS5nZXRUb3BpYyh0b3BpY05hbWUpLCBzdWIpO1xuICAgICAgICAgIHRoaXMuX3Rpbm9kZS5fZGIudXBkVG9waWMoY29udCk7XG5cbiAgICAgICAgICBpZiAoVGlub2RlLmlzUDJQVG9waWNOYW1lKHRvcGljTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlUHV0VXNlcih0b3BpY05hbWUsIGNvbnQpO1xuICAgICAgICAgICAgdGhpcy5fdGlub2RlLl9kYi51cGRVc2VyKHRvcGljTmFtZSwgY29udC5wdWJsaWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBOb3RpZnkgdG9waWMgb2YgdGhlIHVwZGF0ZSBpZiBpdCdzIGFuIGV4dGVybmFsIHVwZGF0ZS5cbiAgICAgICAgICBpZiAoIXN1Yi5fbm9Gb3J3YXJkaW5nKSB7XG4gICAgICAgICAgICBjb25zdCB0b3BpYyA9IHRoaXMuX3Rpbm9kZS5nZXRUb3BpYyh0b3BpY05hbWUpO1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgIHN1Yi5fbm9Gb3J3YXJkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdG9waWMuX3Byb2Nlc3NNZXRhRGVzYyhzdWIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZUNvdW50Kys7XG5cbiAgICAgICAgaWYgKHRoaXMub25NZXRhU3ViKSB7XG4gICAgICAgICAgdGhpcy5vbk1ldGFTdWIoY29udCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5vblN1YnNVcGRhdGVkICYmIHVwZGF0ZUNvdW50ID4gMCkge1xuICAgICAgICBjb25zdCBrZXlzID0gW107XG4gICAgICAgIHN1YnMuZm9yRWFjaCgocykgPT4ge1xuICAgICAgICAgIGtleXMucHVzaChzLnRvcGljKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMub25TdWJzVXBkYXRlZChrZXlzLCB1cGRhdGVDb3VudCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8vIENhbGxlZCBieSBUaW5vZGUgd2hlbiBtZXRhLnN1YiBpcyByZWNpdmVkLlxuICBfcHJvY2Vzc01ldGFDcmVkczoge1xuICAgIHZhbHVlOiBmdW5jdGlvbihjcmVkcywgdXBkKSB7XG4gICAgICBpZiAoY3JlZHMubGVuZ3RoID09IDEgJiYgY3JlZHNbMF0gPT0gVGlub2RlLkRFTF9DSEFSKSB7XG4gICAgICAgIGNyZWRzID0gW107XG4gICAgICB9XG4gICAgICBpZiAodXBkKSB7XG4gICAgICAgIGNyZWRzLm1hcCgoY3IpID0+IHtcbiAgICAgICAgICBpZiAoY3IudmFsKSB7XG4gICAgICAgICAgICAvLyBBZGRpbmcgYSBjcmVkZW50aWFsLlxuICAgICAgICAgICAgbGV0IGlkeCA9IHRoaXMuX2NyZWRlbnRpYWxzLmZpbmRJbmRleCgoZWwpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIGVsLm1ldGggPT0gY3IubWV0aCAmJiBlbC52YWwgPT0gY3IudmFsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaWR4IDwgMCkge1xuICAgICAgICAgICAgICAvLyBOb3QgZm91bmQuXG4gICAgICAgICAgICAgIGlmICghY3IuZG9uZSkge1xuICAgICAgICAgICAgICAgIC8vIFVuY29uZmlybWVkIGNyZWRlbnRpYWwgcmVwbGFjZXMgcHJldmlvdXMgdW5jb25maXJtZWQgY3JlZGVudGlhbCBvZiB0aGUgc2FtZSBtZXRob2QuXG4gICAgICAgICAgICAgICAgaWR4ID0gdGhpcy5fY3JlZGVudGlhbHMuZmluZEluZGV4KChlbCkgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLm1ldGggPT0gY3IubWV0aCAmJiAhZWwuZG9uZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBwcmV2aW91cyB1bmNvbmZpcm1lZCBjcmVkZW50aWFsLlxuICAgICAgICAgICAgICAgICAgdGhpcy5fY3JlZGVudGlhbHMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRoaXMuX2NyZWRlbnRpYWxzLnB1c2goY3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gRm91bmQuIE1heWJlIGNoYW5nZSAnZG9uZScgc3RhdHVzLlxuICAgICAgICAgICAgICB0aGlzLl9jcmVkZW50aWFsc1tpZHhdLmRvbmUgPSBjci5kb25lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoY3IucmVzcCkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGNyZWRlbnRpYWwgY29uZmlybWF0aW9uLlxuICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5fY3JlZGVudGlhbHMuZmluZEluZGV4KChlbCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gZWwubWV0aCA9PSBjci5tZXRoICYmICFlbC5kb25lO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5fY3JlZGVudGlhbHNbaWR4XS5kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY3JlZGVudGlhbHMgPSBjcmVkcztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9uQ3JlZHNVcGRhdGVkKSB7XG4gICAgICAgIHRoaXMub25DcmVkc1VwZGF0ZWQodGhpcy5fY3JlZGVudGlhbHMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSxcblxuICAvLyBQcm9jZXNzIHByZXNlbmNlIGNoYW5nZSBtZXNzYWdlXG4gIF9yb3V0ZVByZXM6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24ocHJlcykge1xuICAgICAgaWYgKHByZXMud2hhdCA9PSAndGVybScpIHtcbiAgICAgICAgLy8gVGhlICdtZScgdG9waWMgaXRzZWxmIGlzIGRldGFjaGVkLiBNYXJrIGFzIHVuc3Vic2NyaWJlZC5cbiAgICAgICAgdGhpcy5fcmVzZXRTdWIoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJlcy53aGF0ID09ICd1cGQnICYmIHByZXMuc3JjID09IFRPUElDX01FKSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0byBtZSdzIGRlc2NyaXB0aW9uLiBSZXF1ZXN0IHVwZGF0ZWQgdmFsdWUuXG4gICAgICAgIHRoaXMuZ2V0TWV0YSh0aGlzLnN0YXJ0TWV0YVF1ZXJ5KCkud2l0aERlc2MoKS5idWlsZCgpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ID0gdGhpcy5fdGlub2RlLmNhY2hlR2V0KCd0b3BpYycsIHByZXMuc3JjKTtcbiAgICAgIGlmIChjb250KSB7XG4gICAgICAgIHN3aXRjaCAocHJlcy53aGF0KSB7XG4gICAgICAgICAgY2FzZSAnb24nOiAvLyB0b3BpYyBjYW1lIG9ubGluZVxuICAgICAgICAgICAgY29udC5vbmxpbmUgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnb2ZmJzogLy8gdG9waWMgd2VudCBvZmZsaW5lXG4gICAgICAgICAgICBpZiAoY29udC5vbmxpbmUpIHtcbiAgICAgICAgICAgICAgY29udC5vbmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgaWYgKGNvbnQuc2Vlbikge1xuICAgICAgICAgICAgICAgIGNvbnQuc2Vlbi53aGVuID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250LnNlZW4gPSB7XG4gICAgICAgICAgICAgICAgICB3aGVuOiBuZXcgRGF0ZSgpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbXNnJzogLy8gbmV3IG1lc3NhZ2UgcmVjZWl2ZWRcbiAgICAgICAgICAgIGNvbnQuX3VwZGF0ZVJlY2VpdmVkKHByZXMuc2VxLCBwcmVzLmFjdCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd1cGQnOiAvLyBkZXNjIHVwZGF0ZWRcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgdXBkYXRlZCBzdWJzY3JpcHRpb24uXG4gICAgICAgICAgICB0aGlzLmdldE1ldGEodGhpcy5zdGFydE1ldGFRdWVyeSgpLndpdGhMYXRlck9uZVN1YihwcmVzLnNyYykuYnVpbGQoKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdhY3MnOiAvLyBhY2Nlc3MgbW9kZSBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoY29udC5hY3MpIHtcbiAgICAgICAgICAgICAgY29udC5hY3MudXBkYXRlQWxsKHByZXMuZGFjcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250LmFjcyA9IG5ldyBBY2Nlc3NNb2RlKCkudXBkYXRlQWxsKHByZXMuZGFjcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250LnRvdWNoZWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndWEnOlxuICAgICAgICAgICAgLy8gdXNlciBhZ2VudCBjaGFuZ2VkLlxuICAgICAgICAgICAgY29udC5zZWVuID0ge1xuICAgICAgICAgICAgICB3aGVuOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICB1YTogcHJlcy51YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JlY3YnOlxuICAgICAgICAgICAgLy8gdXNlcidzIG90aGVyIHNlc3Npb24gbWFya2VkIHNvbWUgbWVzc2dlcyBhcyByZWNlaXZlZC5cbiAgICAgICAgICAgIHByZXMuc2VxID0gcHJlcy5zZXEgfCAwO1xuICAgICAgICAgICAgY29udC5yZWN2ID0gY29udC5yZWN2ID8gTWF0aC5tYXgoY29udC5yZWN2LCBwcmVzLnNlcSkgOiBwcmVzLnNlcTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICAgICAgLy8gdXNlcidzIG90aGVyIHNlc3Npb24gbWFya2VkIHNvbWUgbWVzc2FnZXMgYXMgcmVhZC5cbiAgICAgICAgICAgIHByZXMuc2VxID0gcHJlcy5zZXEgfCAwO1xuICAgICAgICAgICAgY29udC5yZWFkID0gY29udC5yZWFkID8gTWF0aC5tYXgoY29udC5yZWFkLCBwcmVzLnNlcSkgOiBwcmVzLnNlcTtcbiAgICAgICAgICAgIGNvbnQucmVjdiA9IGNvbnQucmVjdiA/IE1hdGgubWF4KGNvbnQucmVhZCwgY29udC5yZWN2KSA6IGNvbnQucmVjdjtcbiAgICAgICAgICAgIGNvbnQudW5yZWFkID0gY29udC5zZXEgLSBjb250LnJlYWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdnb25lJzpcbiAgICAgICAgICAgIC8vIHRvcGljIGRlbGV0ZWQgb3IgdW5zdWJzY3JpYmVkIGZyb20uXG4gICAgICAgICAgICB0aGlzLl90aW5vZGUuY2FjaGVEZWwoJ3RvcGljJywgcHJlcy5zcmMpO1xuICAgICAgICAgICAgdGhpcy5fdGlub2RlLl9kYi5yZW1Ub3BpYyhwcmVzLnNyYyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdkZWwnOlxuICAgICAgICAgICAgLy8gVXBkYXRlIHRvcGljLmRlbCB2YWx1ZS5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLl90aW5vZGUubG9nZ2VyKFwiSU5GTzogVW5zdXBwb3J0ZWQgcHJlc2VuY2UgdXBkYXRlIGluICdtZSdcIiwgcHJlcy53aGF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3JlZnJlc2hDb250YWN0KHByZXMud2hhdCwgY29udCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocHJlcy53aGF0ID09ICdhY3MnKSB7XG4gICAgICAgICAgLy8gTmV3IHN1YnNjcmlwdGlvbnMgYW5kIGRlbGV0ZWQvYmFubmVkIHN1YnNjcmlwdGlvbnMgaGF2ZSBmdWxsXG4gICAgICAgICAgLy8gYWNjZXNzIG1vZGUgKG5vICsgb3IgLSBpbiB0aGUgZGFjcyBzdHJpbmcpLiBDaGFuZ2VzIHRvIGtub3duIHN1YnNjcmlwdGlvbnMgYXJlIHNlbnQgYXNcbiAgICAgICAgICAvLyBkZWx0YXMsIGJ1dCB0aGV5IHNob3VsZCBub3QgaGFwcGVuIGhlcmUuXG4gICAgICAgICAgY29uc3QgYWNzID0gbmV3IEFjY2Vzc01vZGUocHJlcy5kYWNzKTtcbiAgICAgICAgICBpZiAoIWFjcyB8fCBhY3MubW9kZSA9PSBBY2Nlc3NNb2RlLl9JTlZBTElEKSB7XG4gICAgICAgICAgICB0aGlzLl90aW5vZGUubG9nZ2VyKFwiRVJST1I6IEludmFsaWQgYWNjZXNzIG1vZGUgdXBkYXRlXCIsIHByZXMuc3JjLCBwcmVzLmRhY3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYWNzLm1vZGUgPT0gQWNjZXNzTW9kZS5fTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5fdGlub2RlLmxvZ2dlcihcIldBUk5JTkc6IFJlbW92aW5nIG5vbi1leGlzdGVudCBzdWJzY3JpcHRpb25cIiwgcHJlcy5zcmMsIHByZXMuZGFjcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5ldyBzdWJzY3JpcHRpb24uIFNlbmQgcmVxdWVzdCBmb3IgdGhlIGZ1bGwgZGVzY3JpcHRpb24uXG4gICAgICAgICAgICAvLyBVc2luZyAud2l0aE9uZVN1YiAobm90IC53aXRoTGF0ZXJPbmVTdWIpIHRvIG1ha2Ugc3VyZSBJZk1vZGlmaWVkU2luY2UgaXMgbm90IHNldC5cbiAgICAgICAgICAgIHRoaXMuZ2V0TWV0YSh0aGlzLnN0YXJ0TWV0YVF1ZXJ5KCkud2l0aE9uZVN1Yih1bmRlZmluZWQsIHByZXMuc3JjKS5idWlsZCgpKTtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIGR1bW15IGVudHJ5IHRvIGNhdGNoIG9ubGluZSBzdGF0dXMgdXBkYXRlLlxuICAgICAgICAgICAgY29uc3QgZHVtbXkgPSB0aGlzLl90aW5vZGUuZ2V0VG9waWMocHJlcy5zcmMpO1xuICAgICAgICAgICAgZHVtbXkudG91Y2hlZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBkdW1teS50b3BpYyA9IHByZXMuc3JjO1xuICAgICAgICAgICAgZHVtbXkub25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICBkdW1teS5hY3MgPSBhY3M7XG4gICAgICAgICAgICB0aGlzLl90aW5vZGUuYXR0YWNoQ2FjaGVUb1RvcGljKGR1bW15KTtcbiAgICAgICAgICAgIGR1bW15Ll9jYWNoZVB1dFNlbGYoKTtcbiAgICAgICAgICAgIHRoaXMuX2RiLnVwZFRvcGljKGR1bW15KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJlcy53aGF0ID09ICd0YWdzJykge1xuICAgICAgICAgIHRoaXMuZ2V0TWV0YSh0aGlzLnN0YXJ0TWV0YVF1ZXJ5KCkud2l0aFRhZ3MoKS5idWlsZCgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vblByZXMpIHtcbiAgICAgICAgdGhpcy5vblByZXMocHJlcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8vIENvbnRhY3QgaXMgdXBkYXRlZCwgZXhlY3V0ZSBjYWxsYmFja3MuXG4gIF9yZWZyZXNoQ29udGFjdDoge1xuICAgIHZhbHVlOiBmdW5jdGlvbih3aGF0LCBjb250KSB7XG4gICAgICBpZiAodGhpcy5vbkNvbnRhY3RVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5vbkNvbnRhY3RVcGRhdGUod2hhdCwgY29udCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBQdWJsaXNoaW5nIHRvIFRvcGljTWUgaXMgbm90IHN1cHBvcnRlZC4ge0BsaW5rIFRvcGljI3B1Ymxpc2h9IGlzIG92ZXJyaWRlbiBhbmQgdGhvd3MgYW4ge0Vycm9yfSBpZiBjYWxsZWQuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWNNZSNcbiAgICogQHRocm93cyB7RXJyb3J9IEFsd2F5cyB0aHJvd3MgYW4gZXJyb3IuXG4gICAqL1xuICBwdWJsaXNoOiB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlB1Ymxpc2hpbmcgdG8gJ21lJyBpcyBub3Qgc3VwcG9ydGVkXCIpKTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0sXG5cbiAgLyoqXG4gICAqIERlbGV0ZSB2YWxpZGF0aW9uIGNyZWRlbnRpYWwuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWNNZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRvcGljIC0gTmFtZSBvZiB0aGUgdG9waWMgdG8gZGVsZXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VyIC0gVXNlciBJRCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoaWNoIHdpbGwgYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgb24gcmVjZWl2aW5nIHNlcnZlciByZXBseS5cbiAgICovXG4gIGRlbENyZWRlbnRpYWw6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24obWV0aG9kLCB2YWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLl9zdWJzY3JpYmVkKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW5ub3QgZGVsZXRlIGNyZWRlbnRpYWwgaW4gaW5hY3RpdmUgJ21lJyB0b3BpY1wiKSk7XG4gICAgICB9XG4gICAgICAvLyBTZW5kIHtkZWx9IG1lc3NhZ2UsIHJldHVybiBwcm9taXNlXG4gICAgICByZXR1cm4gdGhpcy5fdGlub2RlLmRlbENyZWRlbnRpYWwobWV0aG9kLCB2YWx1ZSkudGhlbigoY3RybCkgPT4ge1xuICAgICAgICAvLyBSZW1vdmUgZGVsZXRlZCBjcmVkZW50aWFsIGZyb20gdGhlIGNhY2hlLlxuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX2NyZWRlbnRpYWxzLmZpbmRJbmRleCgoZWwpID0+IHtcbiAgICAgICAgICByZXR1cm4gZWwubWV0aCA9PSBtZXRob2QgJiYgZWwudmFsID09IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICB0aGlzLl9jcmVkZW50aWFscy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vdGlmeSBsaXN0ZW5lcnNcbiAgICAgICAgaWYgKHRoaXMub25DcmVkc1VwZGF0ZWQpIHtcbiAgICAgICAgICB0aGlzLm9uQ3JlZHNVcGRhdGVkKHRoaXMuX2NyZWRlbnRpYWxzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3RybDtcbiAgICAgIH0pO1xuXG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgY29udGFjdEZpbHRlclxuICAgKiBAcGFyYW0ge09iamVjdH0gY29udGFjdCB0byBjaGVjayBmb3IgaW5jbHVzaW9uLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgY29udGFjdCBzaG91bGQgYmUgcHJvY2Vzc2VkLCA8Y29kZT5mYWxzZTwvY29kZT4gdG8gZXhjbHVkZSBpdC5cbiAgICovXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgY2FjaGVkIGNvbnRhY3RzLlxuICAgKlxuICAgKiBAZnVuY3Rpb25cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpY01lI1xuICAgKiBAcGFyYW0ge1RvcGljTWUuQ29udGFjdENhbGxiYWNrfSBjYWxsYmFjayAtIENhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggY29udGFjdC5cbiAgICogQHBhcmFtIHtjb250YWN0RmlsdGVyPX0gZmlsdGVyIC0gT3B0aW9uYWxseSBmaWx0ZXIgY29udGFjdHM7IGluY2x1ZGUgYWxsIGlmIGZpbHRlciBpcyBmYWxzZS1pc2gsIG90aGVyd2lzZVxuICAgKiAgICAgIGluY2x1ZGUgdGhvc2UgZm9yIHdoaWNoIGZpbHRlciByZXR1cm5zIHRydWUtaXNoLlxuICAgKiBAcGFyYW0ge09iamVjdD19IGNvbnRleHQgLSBDb250ZXh0IHRvIHVzZSBmb3IgY2FsbGluZyB0aGUgYGNhbGxiYWNrYCwgaS5lLiB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSB0aGUgY2FsbGJhY2suXG4gICAqL1xuICBjb250YWN0czoge1xuICAgIHZhbHVlOiBmdW5jdGlvbihjYWxsYmFjaywgZmlsdGVyLCBjb250ZXh0KSB7XG4gICAgICB0aGlzLl90aW5vZGUuY2FjaGVNYXAoJ3RvcGljJywgKGMsIGlkeCkgPT4ge1xuICAgICAgICBpZiAoYy5pc0NvbW1UeXBlKCkgJiYgKCFmaWx0ZXIgfHwgZmlsdGVyKGMpKSkge1xuICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgYywgaWR4KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb250YWN0IGZyb20gY2FjaGUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWNNZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBjb250YWN0IHRvIGdldCwgZWl0aGVyIGEgVUlEIChmb3IgcDJwIHRvcGljcykgb3IgYSB0b3BpYyBuYW1lLlxuICAgKiBAcmV0dXJucyB7VGlub2RlLkNvbnRhY3R9IC0gQ29udGFjdCBvciBgdW5kZWZpbmVkYC5cbiAgICovXG4gIGdldENvbnRhY3Q6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Rpbm9kZS5jYWNoZUdldCgndG9waWMnLCBuYW1lKTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhY2Nlc3MgbW9kZSBvZiBhIGdpdmVuIGNvbnRhY3QgZnJvbSBjYWNoZS5cbiAgICogQG1lbWJlcm9mIFRpbm9kZS5Ub3BpY01lI1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIE5hbWUgb2YgdGhlIGNvbnRhY3QgdG8gZ2V0IGFjY2VzcyBtb2RlIGZvciwgZWl0aGVyIGEgVUlEIChmb3IgcDJwIHRvcGljcylcbiAgICogICAgICAgIG9yIGEgdG9waWMgbmFtZTsgaWYgbWlzc2luZywgYWNjZXNzIG1vZGUgZm9yIHRoZSAnbWUnIHRvcGljIGl0c2VsZi5cbiAgICogQHJldHVybnMge3N0cmluZ30gLSBhY2Nlc3MgbW9kZSwgc3VjaCBhcyBgUldQYC5cbiAgICovXG4gIGdldEFjY2Vzc01vZGU6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgY29uc3QgY29udCA9IHRoaXMuX3Rpbm9kZS5jYWNoZUdldCgndG9waWMnLCBuYW1lKTtcbiAgICAgICAgcmV0dXJuIGNvbnQgPyBjb250LmFjcyA6IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5hY3M7XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjb250YWN0IGlzIGFyY2hpdmVkLCBpLmUuIGNvbnRhY3QucHJpdmF0ZS5hcmNoID09IHRydWUuXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWNNZSNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBjb250YWN0IHRvIGNoZWNrIGFyY2hpdmVkIHN0YXR1cywgZWl0aGVyIGEgVUlEIChmb3IgcDJwIHRvcGljcykgb3IgYSB0b3BpYyBuYW1lLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIGNvbnRhY3QgaXMgYXJjaGl2ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIGlzQXJjaGl2ZWQ6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgY29uc3QgY29udCA9IHRoaXMuX3Rpbm9kZS5jYWNoZUdldCgndG9waWMnLCBuYW1lKTtcbiAgICAgIHJldHVybiBjb250ID8gKChjb250LnByaXZhdGUgJiYgY29udC5wcml2YXRlLmFyY2gpID8gdHJ1ZSA6IGZhbHNlKSA6IG51bGw7XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiBUaW5vZGUuQ3JlZGVudGlhbFxuICAgKiBAbWVtYmVyb2YgVGlub2RlXG4gICAqIEB0eXBlIE9iamVjdFxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbWV0aCAtIHZhbGlkYXRpb24gbWV0aG9kIHN1Y2ggYXMgJ2VtYWlsJyBvciAndGVsJy5cbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IHZhbCAtIGNyZWRlbnRpYWwgdmFsdWUsIGkuZS4gJ2pkb2VAZXhhbXBsZS5jb20nIG9yICcrMTcwMjU1NTEyMzQnXG4gICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gZG9uZSAtIHRydWUgaWYgY3JlZGVudGlhbCBpcyB2YWxpZGF0ZWQuXG4gICAqL1xuICAvKipcbiAgICogR2V0IHRoZSB1c2VyJ3MgY3JlZGVudGlhbHM6IGVtYWlsLCBwaG9uZSwgZXRjLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljTWUjXG4gICAqXG4gICAqIEByZXR1cm5zIHtUaW5vZGUuQ3JlZGVudGlhbFtdfSAtIGFycmF5IG9mIGNyZWRlbnRpYWxzLlxuICAgKi9cbiAgZ2V0Q3JlZGVudGlhbHM6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY3JlZGVudGlhbHM7XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9XG59KTtcblRvcGljTWUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVG9waWNNZTtcblxuLyoqXG4gKiBAY2xhc3MgVG9waWNGbmQgLSBzcGVjaWFsIGNhc2Ugb2Yge0BsaW5rIFRpbm9kZS5Ub3BpY30gZm9yIHNlYXJjaGluZyBmb3JcbiAqIGNvbnRhY3RzIGFuZCBncm91cCB0b3BpY3MuXG4gKiBAZXh0ZW5kcyBUaW5vZGUuVG9waWNcbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqXG4gKiBAcGFyYW0ge1RvcGljRm5kLkNhbGxiYWNrc30gY2FsbGJhY2tzIC0gQ2FsbGJhY2tzIHRvIHJlY2VpdmUgdmFyaW91cyBldmVudHMuXG4gKi9cbnZhciBUb3BpY0ZuZCA9IGZ1bmN0aW9uKGNhbGxiYWNrcykge1xuICBUb3BpYy5jYWxsKHRoaXMsIFRPUElDX0ZORCwgY2FsbGJhY2tzKTtcbiAgLy8gTGlzdCBvZiB1c2VycyBhbmQgdG9waWNzIHVpZCBvciB0b3BpY19uYW1lIC0+IENvbnRhY3Qgb2JqZWN0KVxuICB0aGlzLl9jb250YWN0cyA9IHt9O1xufTtcblxuLy8gSW5oZXJpdCBldmVyeXRpbmcgZnJvbSB0aGUgZ2VuZXJpYyBUb3BpY1xuVG9waWNGbmQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShUb3BpYy5wcm90b3R5cGUsIHtcbiAgLy8gT3ZlcnJpZGUgdGhlIG9yaWdpbmFsIFRvcGljLl9wcm9jZXNzTWV0YVN1YlxuICBfcHJvY2Vzc01ldGFTdWI6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oc3Vicykge1xuICAgICAgbGV0IHVwZGF0ZUNvdW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5fY29udGFjdHMpLmxlbmd0aDtcbiAgICAgIC8vIFJlc2V0IGNvbnRhY3QgbGlzdC5cbiAgICAgIHRoaXMuX2NvbnRhY3RzID0ge307XG4gICAgICBmb3IgKGxldCBpZHggaW4gc3Vicykge1xuICAgICAgICBsZXQgc3ViID0gc3Vic1tpZHhdO1xuICAgICAgICBjb25zdCBpbmRleEJ5ID0gc3ViLnRvcGljID8gc3ViLnRvcGljIDogc3ViLnVzZXI7XG5cbiAgICAgICAgc3ViLnVwZGF0ZWQgPSBuZXcgRGF0ZShzdWIudXBkYXRlZCk7XG4gICAgICAgIGlmIChzdWIuc2VlbiAmJiBzdWIuc2Vlbi53aGVuKSB7XG4gICAgICAgICAgc3ViLnNlZW4ud2hlbiA9IG5ldyBEYXRlKHN1Yi5zZWVuLndoZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgc3ViID0gbWVyZ2VUb0NhY2hlKHRoaXMuX2NvbnRhY3RzLCBpbmRleEJ5LCBzdWIpO1xuICAgICAgICB1cGRhdGVDb3VudCsrO1xuXG4gICAgICAgIGlmICh0aGlzLm9uTWV0YVN1Yikge1xuICAgICAgICAgIHRoaXMub25NZXRhU3ViKHN1Yik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHVwZGF0ZUNvdW50ID4gMCAmJiB0aGlzLm9uU3Vic1VwZGF0ZWQpIHtcbiAgICAgICAgdGhpcy5vblN1YnNVcGRhdGVkKE9iamVjdC5rZXlzKHRoaXMuX2NvbnRhY3RzKSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBQdWJsaXNoaW5nIHRvIFRvcGljRm5kIGlzIG5vdCBzdXBwb3J0ZWQuIHtAbGluayBUb3BpYyNwdWJsaXNofSBpcyBvdmVycmlkZW4gYW5kIHRob3dzIGFuIHtFcnJvcn0gaWYgY2FsbGVkLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljRm5kI1xuICAgKiBAdGhyb3dzIHtFcnJvcn0gQWx3YXlzIHRocm93cyBhbiBlcnJvci5cbiAgICovXG4gIHB1Ymxpc2g6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiUHVibGlzaGluZyB0byAnZm5kJyBpcyBub3Qgc3VwcG9ydGVkXCIpKTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0sXG5cbiAgLyoqXG4gICAqIHNldE1ldGEgdG8gVG9waWNGbmQgcmVzZXRzIGNvbnRhY3QgbGlzdCBpbiBhZGRpdGlvbiB0byBzZW5kaW5nIHRoZSBtZXNzYWdlLlxuICAgKiBAbWVtYmVyb2YgVGlub2RlLlRvcGljRm5kI1xuICAgKiBAcGFyYW0ge1Rpbm9kZS5TZXRQYXJhbXN9IHBhcmFtcyBwYXJhbWV0ZXJzIHRvIHVwZGF0ZS5cbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgdG8gYmUgcmVzb2x2ZWQvcmVqZWN0ZWQgd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHRvIHJlcXVlc3QuXG4gICAqL1xuICBzZXRNZXRhOiB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihUb3BpY0ZuZC5wcm90b3R5cGUpLnNldE1ldGEuY2FsbCh0aGlzLCBwYXJhbXMpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhpbnN0YW5jZS5fY29udGFjdHMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpbnN0YW5jZS5fY29udGFjdHMgPSB7fTtcbiAgICAgICAgICBpZiAoaW5zdGFuY2Uub25TdWJzVXBkYXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2Uub25TdWJzVXBkYXRlZChbXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0sXG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBmb3VuZCBjb250YWN0cy4gSWYgY2FsbGJhY2sgaXMgdW5kZWZpbmVkLCB1c2Uge0BsaW5rIHRoaXMub25NZXRhU3VifS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBtZW1iZXJvZiBUaW5vZGUuVG9waWNGbmQjXG4gICAqIEBwYXJhbSB7VG9waWNGbmQuQ29udGFjdENhbGxiYWNrfSBjYWxsYmFjayAtIENhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggY29udGFjdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgLSBDb250ZXh0IHRvIHVzZSBmb3IgY2FsbGluZyB0aGUgYGNhbGxiYWNrYCwgaS5lLiB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSB0aGUgY2FsbGJhY2suXG4gICAqL1xuICBjb250YWN0czoge1xuICAgIHZhbHVlOiBmdW5jdGlvbihjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgY29uc3QgY2IgPSAoY2FsbGJhY2sgfHwgdGhpcy5vbk1ldGFTdWIpO1xuICAgICAgaWYgKGNiKSB7XG4gICAgICAgIGZvciAobGV0IGlkeCBpbiB0aGlzLl9jb250YWN0cykge1xuICAgICAgICAgIGNiLmNhbGwoY29udGV4dCwgdGhpcy5fY29udGFjdHNbaWR4XSwgaWR4LCB0aGlzLl9jb250YWN0cyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH1cbn0pO1xuVG9waWNGbmQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVG9waWNGbmQ7XG5cbi8qKlxuICogQGNsYXNzIE1lc3NhZ2UgLSBkZWZpbml0aW9uIGEgY29tbXVuaWNhdGlvbiBtZXNzYWdlLlxuICogV29yayBpbiBwcm9ncmVzcy5cbiAqIEBtZW1iZXJvZiBUaW5vZGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdG9waWNfIC0gbmFtZSBvZiB0aGUgdG9waWMgdGhlIG1lc3NhZ2UgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7c3RyaW5nIHwgRHJhZnR5fSBjb250ZW50XyAtIG1lc3NhZ2UgY29udGFudC5cbiAqL1xudmFyIE1lc3NhZ2UgPSBmdW5jdGlvbih0b3BpY18sIGNvbnRlbnRfKSB7XG4gIHRoaXMuc3RhdHVzID0gTWVzc2FnZS5TVEFUVVNfTk9ORTtcbiAgdGhpcy50b3BpYyA9IHRvcGljXztcbiAgdGhpcy5jb250ZW50ID0gY29udGVudF87XG59XG5cbk1lc3NhZ2UuU1RBVFVTX05PTkUgPSBNRVNTQUdFX1NUQVRVU19OT05FO1xuTWVzc2FnZS5TVEFUVVNfUVVFVUVEID0gTUVTU0FHRV9TVEFUVVNfUVVFVUVEO1xuTWVzc2FnZS5TVEFUVVNfU0VORElORyA9IE1FU1NBR0VfU1RBVFVTX1NFTkRJTkc7XG5NZXNzYWdlLlNUQVRVU19GQUlMRUQgPSBNRVNTQUdFX1NUQVRVU19GQUlMRUQ7XG5NZXNzYWdlLlNUQVRVU19TRU5UID0gTUVTU0FHRV9TVEFUVVNfU0VOVDtcbk1lc3NhZ2UuU1RBVFVTX1JFQ0VJVkVEID0gTUVTU0FHRV9TVEFUVVNfUkVDRUlWRUQ7XG5NZXNzYWdlLlNUQVRVU19SRUFEID0gTUVTU0FHRV9TVEFUVVNfUkVBRDtcbk1lc3NhZ2UuU1RBVFVTX1RPX01FID0gTUVTU0FHRV9TVEFUVVNfVE9fTUU7XG5cbk1lc3NhZ2UucHJvdG90eXBlID0ge1xuICAvKipcbiAgICogQ29udmVydCBtZXNzYWdlIG9iamVjdCB0byB7cHVifSBwYWNrZXQuXG4gICAqL1xuICB0b0pTT046IGZ1bmN0aW9uKCkge1xuXG4gIH0sXG4gIC8qKlxuICAgKiBQYXJzZSBKU09OIGludG8gbWVzc2FnZS5cbiAgICovXG4gIGZyb21KU09OOiBmdW5jdGlvbihqc29uKSB7XG5cbiAgfVxufVxuTWVzc2FnZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNZXNzYWdlO1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJykge1xuICBtb2R1bGUuZXhwb3J0cyA9IFRpbm9kZTtcbiAgbW9kdWxlLmV4cG9ydHMuRHJhZnR5ID0gRHJhZnR5O1xuICBtb2R1bGUuZXhwb3J0cy5BY2Nlc3NNb2RlID0gQWNjZXNzTW9kZTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcInZlcnNpb25cIjogXCIwLjE3LjJcIn1cbiJdfQ==
