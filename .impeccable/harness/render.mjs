// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS((exports, module) => {
  (function() {
    function defineDeprecationWarning(methodName, info) {
      Object.defineProperty(Component.prototype, methodName, {
        get: function() {
          console.warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
        }
      });
    }
    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== "object")
        return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return typeof maybeIterable === "function" ? maybeIterable : null;
    }
    function warnNoop(publicInstance, callerName) {
      publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
      var warningKey = publicInstance + "." + callerName;
      didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, publicInstance), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
    }
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    function ComponentDummy() {}
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    function noop() {}
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console;
        var JSCompiler_temp_const = JSCompiler_inline_result.error;
        var JSCompiler_inline_result$jscomp$0 = typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
        JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
        return testStringCoercion(value);
      }
    }
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE)
        return "<>";
      if (typeof type === "object" && type !== null && type.$$typeof === REACT_LAZY_TYPE)
        return "<...>";
      try {
        var name = getComponentNameFromType(type);
        return name ? "<" + name + ">" : "<...>";
      } catch (x) {
        return "<...>";
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A;
      return dispatcher === null ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
      return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, "key")) {
        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
        if (getter && getter.isReactWarning)
          return false;
      }
      return config.key !== undefined;
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
      }
      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, "key", {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type);
      didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
      componentName = this.props.ref;
      return componentName !== undefined ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref;
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner
      };
      (refProp !== undefined ? refProp : null) !== null ? Object.defineProperty(type, "ref", {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning
      }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
      type._store = {};
      Object.defineProperty(type._store, "validated", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: 0
      });
      Object.defineProperty(type, "_debugInfo", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
      });
      Object.defineProperty(type, "_debugStack", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack
      });
      Object.defineProperty(type, "_debugTask", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask
      });
      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
      return type;
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      newKey = ReactElement(oldElement.type, newKey, oldElement.props, oldElement._owner, oldElement._debugStack, oldElement._debugTask);
      oldElement._store && (newKey._store.validated = oldElement._store.validated);
      return newKey;
    }
    function validateChildKeys(node) {
      isValidElement(node) ? node._store && (node._store.validated = 1) : typeof node === "object" && node !== null && node.$$typeof === REACT_LAZY_TYPE && (node._payload.status === "fulfilled" ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
      return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    function getElementKey(element, index) {
      return typeof element === "object" && element !== null && element.key != null ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch (typeof thenable.status === "string" ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
            thenable.status === "pending" && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          }, function(error) {
            thenable.status === "pending" && (thenable.status = "rejected", thenable.reason = error);
          })), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if (type === "undefined" || type === "boolean")
        children = null;
      var invokeCallback = false;
      if (children === null)
        invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
            }
        }
      if (invokeCallback) {
        invokeCallback = children;
        callback = callback(invokeCallback);
        var childKey = nameSoFar === "" ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
        isArrayImpl(callback) ? (escapedPrefix = "", childKey != null && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : callback != null && (isValidElement(callback) && (callback.key != null && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(callback, escapedPrefix + (callback.key == null || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + childKey), nameSoFar !== "" && invokeCallback != null && isValidElement(invokeCallback) && invokeCallback.key == null && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
        return 1;
      }
      invokeCallback = 0;
      childKey = nameSoFar === "" ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0;i < children.length; i++)
          nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
      else if (i = getIteratorFn(children), typeof i === "function")
        for (i === children.entries && (didWarnAboutMaps || console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = true), children = i.call(children), i = 0;!(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
      else if (type === "object") {
        if (typeof children.then === "function")
          return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
        array = String(children);
        throw Error("Objects are not valid as a React child (found: " + (array === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (children == null)
        return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (payload._status === -1) {
        var ioInfo = payload._ioInfo;
        ioInfo != null && (ioInfo.start = ioInfo.end = performance.now());
        ioInfo = payload._result;
        var thenable = ioInfo();
        thenable.then(function(moduleObject) {
          if (payload._status === 0 || payload._status === -1) {
            payload._status = 1;
            payload._result = moduleObject;
            var _ioInfo = payload._ioInfo;
            _ioInfo != null && (_ioInfo.end = performance.now());
            thenable.status === undefined && (thenable.status = "fulfilled", thenable.value = moduleObject);
          }
        }, function(error) {
          if (payload._status === 0 || payload._status === -1) {
            payload._status = 2;
            payload._result = error;
            var _ioInfo2 = payload._ioInfo;
            _ioInfo2 != null && (_ioInfo2.end = performance.now());
            thenable.status === undefined && (thenable.status = "rejected", thenable.reason = error);
          }
        });
        ioInfo = payload._ioInfo;
        if (ioInfo != null) {
          ioInfo.value = thenable;
          var displayName = thenable.displayName;
          typeof displayName === "string" && (ioInfo.name = displayName);
        }
        payload._status === -1 && (payload._status = 0, payload._result = thenable);
      }
      if (payload._status === 1)
        return ioInfo = payload._result, ioInfo === undefined && console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))

Did you accidentally put curly braces around the import?`, ioInfo), "default" in ioInfo || console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))`, ioInfo), ioInfo.default;
      throw payload._result;
    }
    function resolveDispatcher() {
      var dispatcher = ReactSharedInternals.H;
      dispatcher === null && console.error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
      return dispatcher;
    }
    function releaseAsyncTransition() {
      ReactSharedInternals.asyncTransitions--;
    }
    function enqueueTask(task) {
      if (enqueueTaskImpl === null)
        try {
          var requireString = ("require" + Math.random()).slice(0, 7);
          enqueueTaskImpl = (module && module[requireString]).call(module, "timers").setImmediate;
        } catch (_err) {
          enqueueTaskImpl = function(callback) {
            didWarnAboutMessageChannel === false && (didWarnAboutMessageChannel = true, typeof MessageChannel === "undefined" && console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));
            var channel = new MessageChannel;
            channel.port1.onmessage = callback;
            channel.port2.postMessage(undefined);
          };
        }
      return enqueueTaskImpl(task);
    }
    function aggregateErrors(errors) {
      return 1 < errors.length && typeof AggregateError === "function" ? new AggregateError(errors) : errors[0];
    }
    function popActScope(prevActQueue, prevActScopeDepth) {
      prevActScopeDepth !== actScopeDepth - 1 && console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
      actScopeDepth = prevActScopeDepth;
    }
    function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
      var queue = ReactSharedInternals.actQueue;
      if (queue !== null)
        if (queue.length !== 0)
          try {
            flushActQueue(queue);
            enqueueTask(function() {
              return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
            });
            return;
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
        else
          ReactSharedInternals.actQueue = null;
      0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
    }
    function flushActQueue(queue) {
      if (!isFlushing) {
        isFlushing = true;
        var i = 0;
        try {
          for (;i < queue.length; i++) {
            var callback = queue[i];
            do {
              ReactSharedInternals.didUsePromise = false;
              var continuation = callback(false);
              if (continuation !== null) {
                if (ReactSharedInternals.didUsePromise) {
                  queue[i] = callback;
                  queue.splice(0, i);
                  return;
                }
                callback = continuation;
              } else
                break;
            } while (1);
          }
          queue.length = 0;
        } catch (error) {
          queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
        } finally {
          isFlushing = false;
        }
      }
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function(publicInstance) {
        warnNoop(publicInstance, "forceUpdate");
      },
      enqueueReplaceState: function(publicInstance) {
        warnNoop(publicInstance, "replaceState");
      },
      enqueueSetState: function(publicInstance) {
        warnNoop(publicInstance, "setState");
      }
    }, assign = Object.assign, emptyObject = {};
    Object.freeze(emptyObject);
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null)
        throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    var deprecatedAPIs = {
      isMounted: [
        "isMounted",
        "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
      ],
      replaceState: [
        "replaceState",
        "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
      ]
    };
    for (fnName in deprecatedAPIs)
      deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    ComponentDummy.prototype = Component.prototype;
    deprecatedAPIs = PureComponent.prototype = new ComponentDummy;
    deprecatedAPIs.constructor = PureComponent;
    assign(deprecatedAPIs, Component.prototype);
    deprecatedAPIs.isPureReactComponent = true;
    var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
      H: null,
      A: null,
      T: null,
      S: null,
      actQueue: null,
      asyncTransitions: 0,
      isBatchingLegacy: false,
      didScheduleLegacyUpdate: false,
      didUsePromise: false,
      thrownErrors: [],
      getCurrentStack: null,
      recentlyCreatedOwnerStacks: 0
    }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
      return null;
    };
    deprecatedAPIs = {
      react_stack_bottom_frame: function(callStackForError) {
        return callStackForError();
      }
    };
    var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(deprecatedAPIs, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = typeof reportError === "function" ? reportError : function(error) {
      if (typeof window === "object" && typeof window.ErrorEvent === "function") {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: typeof error === "object" && error !== null && typeof error.message === "string" ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event))
          return;
      } else if (typeof process === "object" && typeof process.emit === "function") {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = typeof queueMicrotask === "function" ? function(callback) {
      queueMicrotask(function() {
        return queueMicrotask(callback);
      });
    } : enqueueTask;
    deprecatedAPIs = Object.freeze({
      __proto__: null,
      c: function(size) {
        return resolveDispatcher().useMemoCache(size);
      }
    });
    var fnName = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(children, function() {
          forEachFunc.apply(this, arguments);
        }, forEachContext);
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error("React.Children.only expected to receive a single React element child.");
        return children;
      }
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = fnName;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = deprecatedAPIs;
    exports.act = function(callback) {
      var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
      actScopeDepth++;
      var queue = ReactSharedInternals.actQueue = prevActQueue !== null ? prevActQueue : [], didAwaitActCall = false;
      try {
        var result = callback();
      } catch (error) {
        ReactSharedInternals.thrownErrors.push(error);
      }
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
      if (result !== null && typeof result === "object" && typeof result.then === "function") {
        var thenable = result;
        queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"));
        });
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            thenable.then(function(returnValue) {
              popActScope(prevActQueue, prevActScopeDepth);
              if (prevActScopeDepth === 0) {
                try {
                  flushActQueue(queue), enqueueTask(function() {
                    return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  });
                } catch (error$0) {
                  ReactSharedInternals.thrownErrors.push(error$0);
                }
                if (0 < ReactSharedInternals.thrownErrors.length) {
                  var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
                  ReactSharedInternals.thrownErrors.length = 0;
                  reject(_thrownError);
                }
              } else
                resolve(returnValue);
            }, function(error) {
              popActScope(prevActQueue, prevActScopeDepth);
              0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
            });
          }
        };
      }
      var returnValue$jscomp$0 = result;
      popActScope(prevActQueue, prevActScopeDepth);
      prevActScopeDepth === 0 && (flushActQueue(queue), queue.length !== 0 && queueSeveralMicrotasks(function() {
        didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"));
      }), ReactSharedInternals.actQueue = null);
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
      return {
        then: function(resolve, reject) {
          didAwaitActCall = true;
          prevActScopeDepth === 0 ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
            return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject);
          })) : resolve(returnValue$jscomp$0);
        }
      };
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.captureOwnerStack = function() {
      var getCurrentStack = ReactSharedInternals.getCurrentStack;
      return getCurrentStack === null ? null : getCurrentStack();
    };
    exports.cloneElement = function(element, config, children) {
      if (element === null || element === undefined)
        throw Error("The argument must be a React element, but you passed " + element + ".");
      var props = assign({}, element.props), key = element.key, owner = element._owner;
      if (config != null) {
        var JSCompiler_inline_result;
        a: {
          if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, "ref").get) && JSCompiler_inline_result.isReactWarning) {
            JSCompiler_inline_result = false;
            break a;
          }
          JSCompiler_inline_result = config.ref !== undefined;
        }
        JSCompiler_inline_result && (owner = getOwner());
        hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
        for (propName in config)
          !hasOwnProperty.call(config, propName) || propName === "key" || propName === "__self" || propName === "__source" || propName === "ref" && config.ref === undefined || (props[propName] = config[propName]);
      }
      var propName = arguments.length - 2;
      if (propName === 1)
        props.children = children;
      else if (1 < propName) {
        JSCompiler_inline_result = Array(propName);
        for (var i = 0;i < propName; i++)
          JSCompiler_inline_result[i] = arguments[i + 2];
        props.children = JSCompiler_inline_result;
      }
      props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask);
      for (key = 2;key < arguments.length; key++)
        validateChildKeys(arguments[key]);
      return props;
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      defaultValue._currentRenderer = null;
      defaultValue._currentRenderer2 = null;
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      for (var i = 2;i < arguments.length; i++)
        validateChildKeys(arguments[i]);
      i = {};
      var key = null;
      if (config != null)
        for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && propName !== "key" && propName !== "__self" && propName !== "__source" && (i[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1)
        i.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), _i = 0;_i < childrenLength; _i++)
          childArray[_i] = arguments[_i + 2];
        Object.freeze && Object.freeze(childArray);
        i.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          i[propName] === undefined && (i[propName] = childrenLength[propName]);
      key && defineKeyPropWarningGetter(i, typeof type === "function" ? type.displayName || type.name || "Unknown" : type);
      var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return ReactElement(type, key, i, getOwner(), propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack, propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
    exports.createRef = function() {
      var refObject = { current: null };
      Object.seal(refObject);
      return refObject;
    };
    exports.forwardRef = function(render) {
      render != null && render.$$typeof === REACT_MEMO_TYPE ? console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).") : typeof render !== "function" ? console.error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render) : render.length !== 0 && render.length !== 2 && console.error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
      render != null && render.defaultProps != null && console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");
      var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
      Object.defineProperty(elementType, "displayName", {
        enumerable: false,
        configurable: true,
        get: function() {
          return ownName;
        },
        set: function(name) {
          ownName = name;
          render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
        }
      });
      return elementType;
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      ctor = { _status: -1, _result: ctor };
      var lazyType = {
        $$typeof: REACT_LAZY_TYPE,
        _payload: ctor,
        _init: lazyInitializer
      }, ioInfo = {
        name: "lazy",
        start: -1,
        end: -1,
        value: null,
        owner: null,
        debugStack: Error("react-stack-top-frame"),
        debugTask: console.createTask ? console.createTask("lazy()") : null
      };
      ctor._ioInfo = ioInfo;
      lazyType._debugInfo = [{ awaited: ioInfo }];
      return lazyType;
    };
    exports.memo = function(type, compare) {
      type == null && console.error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
      compare = {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: compare === undefined ? null : compare
      };
      var ownName;
      Object.defineProperty(compare, "displayName", {
        enumerable: false,
        configurable: true,
        get: function() {
          return ownName;
        },
        set: function(name) {
          ownName = name;
          type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
        }
      });
      return compare;
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      currentTransition._updatedFibers = new Set;
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        onStartTransitionFinish !== null && onStartTransitionFinish(currentTransition, returnValue);
        typeof returnValue === "object" && returnValue !== null && typeof returnValue.then === "function" && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
      } catch (error) {
        reportGlobalError(error);
      } finally {
        prevTransition === null && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")), prevTransition !== null && currentTransition.types !== null && (prevTransition.types !== null && prevTransition.types !== currentTransition.types && console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return resolveDispatcher().useCacheRefresh();
    };
    exports.use = function(usable) {
      return resolveDispatcher().use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return resolveDispatcher().useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return resolveDispatcher().useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      var dispatcher = resolveDispatcher();
      Context.$$typeof === REACT_CONSUMER_TYPE && console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?");
      return dispatcher.useContext(Context);
    };
    exports.useDebugValue = function(value, formatterFn) {
      return resolveDispatcher().useDebugValue(value, formatterFn);
    };
    exports.useDeferredValue = function(value, initialValue) {
      return resolveDispatcher().useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, deps) {
      create == null && console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useEffect(create, deps);
    };
    exports.useEffectEvent = function(callback) {
      return resolveDispatcher().useEffectEvent(callback);
    };
    exports.useId = function() {
      return resolveDispatcher().useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return resolveDispatcher().useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      create == null && console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      create == null && console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return resolveDispatcher().useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return resolveDispatcher().useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return resolveDispatcher().useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return resolveDispatcher().useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return resolveDispatcher().useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    };
    exports.useTransition = function() {
      return resolveDispatcher().useTransition();
    };
    exports.version = "19.2.0";
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })();
});

// node_modules/react/index.js
var require_react = __commonJS((exports, module) => {
  if (false) {} else {
    module.exports = require_react_development();
  }
});

// node_modules/react-dom/cjs/react-dom.development.js
var require_react_dom_development = __commonJS((exports) => {
  var React = __toESM(require_react(), 1);
  (function() {
    function noop() {}
    function testStringCoercion(value) {
      return "" + value;
    }
    function createPortal$1(children, containerInfo, implementation) {
      var key = 3 < arguments.length && arguments[3] !== undefined ? arguments[3] : null;
      try {
        testStringCoercion(key);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      JSCompiler_inline_result && (console.error("The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", typeof Symbol === "function" && Symbol.toStringTag && key[Symbol.toStringTag] || key.constructor.name || "Object"), testStringCoercion(key));
      return {
        $$typeof: REACT_PORTAL_TYPE,
        key: key == null ? null : "" + key,
        children,
        containerInfo,
        implementation
      };
    }
    function getCrossOriginStringAs(as, input) {
      if (as === "font")
        return "";
      if (typeof input === "string")
        return input === "use-credentials" ? input : "";
    }
    function getValueDescriptorExpectingObjectForWarning(thing) {
      return thing === null ? "`null`" : thing === undefined ? "`undefined`" : thing === "" ? "an empty string" : 'something with type "' + typeof thing + '"';
    }
    function getValueDescriptorExpectingEnumForWarning(thing) {
      return thing === null ? "`null`" : thing === undefined ? "`undefined`" : thing === "" ? "an empty string" : typeof thing === "string" ? JSON.stringify(thing) : typeof thing === "number" ? "`" + thing + "`" : 'something with type "' + typeof thing + '"';
    }
    function resolveDispatcher() {
      var dispatcher = ReactSharedInternals.H;
      dispatcher === null && console.error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
      return dispatcher;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var Internals = {
      d: {
        f: noop,
        r: function() {
          throw Error("Invalid form element. requestFormReset must be passed a form that was rendered by React.");
        },
        D: noop,
        C: noop,
        L: noop,
        m: noop,
        X: noop,
        S: noop,
        M: noop
      },
      p: 0,
      findDOMNode: null
    }, REACT_PORTAL_TYPE = Symbol.for("react.portal"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map === "function" && Map.prototype != null && typeof Map.prototype.forEach === "function" && typeof Set === "function" && Set.prototype != null && typeof Set.prototype.clear === "function" && typeof Set.prototype.forEach === "function" || console.error("React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");
    exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
    exports.createPortal = function(children, container) {
      var key = 2 < arguments.length && arguments[2] !== undefined ? arguments[2] : null;
      if (!container || container.nodeType !== 1 && container.nodeType !== 9 && container.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return createPortal$1(children, container, null, key);
    };
    exports.flushSync = function(fn) {
      var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
      try {
        if (ReactSharedInternals.T = null, Internals.p = 2, fn)
          return fn();
      } finally {
        ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f() && console.error("flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task.");
      }
    };
    exports.preconnect = function(href, options) {
      typeof href === "string" && href ? options != null && typeof options !== "object" ? console.error("ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.", getValueDescriptorExpectingEnumForWarning(options)) : options != null && typeof options.crossOrigin !== "string" && console.error("ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.", getValueDescriptorExpectingObjectForWarning(options.crossOrigin)) : console.error("ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
      typeof href === "string" && (options ? (options = options.crossOrigin, options = typeof options === "string" ? options === "use-credentials" ? options : "" : undefined) : options = null, Internals.d.C(href, options));
    };
    exports.prefetchDNS = function(href) {
      if (typeof href !== "string" || !href)
        console.error("ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
      else if (1 < arguments.length) {
        var options = arguments[1];
        typeof options === "object" && options.hasOwnProperty("crossOrigin") ? console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.", getValueDescriptorExpectingEnumForWarning(options)) : console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.", getValueDescriptorExpectingEnumForWarning(options));
      }
      typeof href === "string" && Internals.d.D(href);
    };
    exports.preinit = function(href, options) {
      typeof href === "string" && href ? options == null || typeof options !== "object" ? console.error("ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.", getValueDescriptorExpectingEnumForWarning(options)) : options.as !== "style" && options.as !== "script" && console.error('ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".', getValueDescriptorExpectingEnumForWarning(options.as)) : console.error("ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
      if (typeof href === "string" && options && typeof options.as === "string") {
        var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = typeof options.integrity === "string" ? options.integrity : undefined, fetchPriority = typeof options.fetchPriority === "string" ? options.fetchPriority : undefined;
        as === "style" ? Internals.d.S(href, typeof options.precedence === "string" ? options.precedence : undefined, {
          crossOrigin,
          integrity,
          fetchPriority
        }) : as === "script" && Internals.d.X(href, {
          crossOrigin,
          integrity,
          fetchPriority,
          nonce: typeof options.nonce === "string" ? options.nonce : undefined
        });
      }
    };
    exports.preinitModule = function(href, options) {
      var encountered = "";
      typeof href === "string" && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
      options !== undefined && typeof options !== "object" ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && ("as" in options) && options.as !== "script" && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingEnumForWarning(options.as) + ".");
      if (encountered)
        console.error("ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s", encountered);
      else
        switch (encountered = options && typeof options.as === "string" ? options.as : "script", encountered) {
          case "script":
            break;
          default:
            encountered = getValueDescriptorExpectingEnumForWarning(encountered), console.error('ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)', encountered, href);
        }
      if (typeof href === "string")
        if (typeof options === "object" && options !== null) {
          if (options.as == null || options.as === "script")
            encountered = getCrossOriginStringAs(options.as, options.crossOrigin), Internals.d.M(href, {
              crossOrigin: encountered,
              integrity: typeof options.integrity === "string" ? options.integrity : undefined,
              nonce: typeof options.nonce === "string" ? options.nonce : undefined
            });
        } else
          options == null && Internals.d.M(href);
    };
    exports.preload = function(href, options) {
      var encountered = "";
      typeof href === "string" && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
      options == null || typeof options !== "object" ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : typeof options.as === "string" && options.as || (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
      encountered && console.error('ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s', encountered);
      if (typeof href === "string" && typeof options === "object" && options !== null && typeof options.as === "string") {
        encountered = options.as;
        var crossOrigin = getCrossOriginStringAs(encountered, options.crossOrigin);
        Internals.d.L(href, encountered, {
          crossOrigin,
          integrity: typeof options.integrity === "string" ? options.integrity : undefined,
          nonce: typeof options.nonce === "string" ? options.nonce : undefined,
          type: typeof options.type === "string" ? options.type : undefined,
          fetchPriority: typeof options.fetchPriority === "string" ? options.fetchPriority : undefined,
          referrerPolicy: typeof options.referrerPolicy === "string" ? options.referrerPolicy : undefined,
          imageSrcSet: typeof options.imageSrcSet === "string" ? options.imageSrcSet : undefined,
          imageSizes: typeof options.imageSizes === "string" ? options.imageSizes : undefined,
          media: typeof options.media === "string" ? options.media : undefined
        });
      }
    };
    exports.preloadModule = function(href, options) {
      var encountered = "";
      typeof href === "string" && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
      options !== undefined && typeof options !== "object" ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && ("as" in options) && typeof options.as !== "string" && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
      encountered && console.error('ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s', encountered);
      typeof href === "string" && (options ? (encountered = getCrossOriginStringAs(options.as, options.crossOrigin), Internals.d.m(href, {
        as: typeof options.as === "string" && options.as !== "script" ? options.as : undefined,
        crossOrigin: encountered,
        integrity: typeof options.integrity === "string" ? options.integrity : undefined
      })) : Internals.d.m(href));
    };
    exports.requestFormReset = function(form) {
      Internals.d.r(form);
    };
    exports.unstable_batchedUpdates = function(fn, a) {
      return fn(a);
    };
    exports.useFormState = function(action, initialState, permalink) {
      return resolveDispatcher().useFormState(action, initialState, permalink);
    };
    exports.useFormStatus = function() {
      return resolveDispatcher().useHostTransitionStatus();
    };
    exports.version = "19.2.0";
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })();
});

// node_modules/react-dom/index.js
var require_react_dom = __commonJS((exports, module) => {
  if (false) {} else {
    module.exports = require_react_dom_development();
  }
});

// node_modules/react-dom/cjs/react-dom-server.bun.development.js
var require_react_dom_server_bun_development = __commonJS((exports) => {
  var React = __toESM(require_react(), 1);
  var ReactDOM = __toESM(require_react_dom(), 1);
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
  var REACT_PORTAL_TYPE = Symbol.for("react.portal");
  var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
  var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
  var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
  var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
  var REACT_CONTEXT_TYPE = Symbol.for("react.context");
  var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
  var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
  var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
  var REACT_MEMO_TYPE = Symbol.for("react.memo");
  var REACT_LAZY_TYPE = Symbol.for("react.lazy");
  var REACT_SCOPE_TYPE = Symbol.for("react.scope");
  var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
  var REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
  var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
  var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
  var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (maybeIterable === null || typeof maybeIterable !== "object")
      return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return typeof maybeIterable === "function" ? maybeIterable : null;
  }
  var isArrayImpl = Array.isArray;
  var jsxPropsParents = new WeakMap;
  var jsxChildrenParents = new WeakMap;
  function objectName(object) {
    object = Object.prototype.toString.call(object);
    return object.slice(8, object.length - 1);
  }
  function describeKeyForErrorMessage(key) {
    var encodedKey = JSON.stringify(key);
    return '"' + key + '"' === encodedKey ? key : encodedKey;
  }
  function describeValueForErrorMessage(value) {
    switch (typeof value) {
      case "string":
        return JSON.stringify(10 >= value.length ? value : value.slice(0, 10) + "...");
      case "object":
        if (isArrayImpl(value))
          return "[...]";
        if (value !== null && value.$$typeof === CLIENT_REFERENCE_TAG)
          return "client";
        value = objectName(value);
        return value === "Object" ? "{...}" : value;
      case "function":
        return value.$$typeof === CLIENT_REFERENCE_TAG ? "client" : (value = value.displayName || value.name) ? "function " + value : "function";
      default:
        return String(value);
    }
  }
  function describeElementType(type) {
    if (typeof type === "string")
      return type;
    switch (type) {
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
    }
    if (typeof type === "object")
      switch (type.$$typeof) {
        case REACT_FORWARD_REF_TYPE:
          return describeElementType(type.render);
        case REACT_MEMO_TYPE:
          return describeElementType(type.type);
        case REACT_LAZY_TYPE:
          var payload = type._payload;
          type = type._init;
          try {
            return describeElementType(type(payload));
          } catch (x) {}
      }
    return "";
  }
  var CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference");
  function describeObjectForErrorMessage(objectOrArray, expandedName) {
    var objKind = objectName(objectOrArray);
    if (objKind !== "Object" && objKind !== "Array")
      return objKind;
    var start = -1, length = 0;
    if (isArrayImpl(objectOrArray))
      if (jsxChildrenParents.has(objectOrArray)) {
        var type = jsxChildrenParents.get(objectOrArray);
        objKind = "<" + describeElementType(type) + ">";
        for (var i = 0;i < objectOrArray.length; i++) {
          var value = objectOrArray[i];
          value = typeof value === "string" ? value : typeof value === "object" && value !== null ? "{" + describeObjectForErrorMessage(value) + "}" : "{" + describeValueForErrorMessage(value) + "}";
          "" + i === expandedName ? (start = objKind.length, length = value.length, objKind += value) : objKind = 15 > value.length && 40 > objKind.length + value.length ? objKind + value : objKind + "{...}";
        }
        objKind += "</" + describeElementType(type) + ">";
      } else {
        objKind = "[";
        for (type = 0;type < objectOrArray.length; type++)
          0 < type && (objKind += ", "), i = objectOrArray[type], i = typeof i === "object" && i !== null ? describeObjectForErrorMessage(i) : describeValueForErrorMessage(i), "" + type === expandedName ? (start = objKind.length, length = i.length, objKind += i) : objKind = 10 > i.length && 40 > objKind.length + i.length ? objKind + i : objKind + "...";
        objKind += "]";
      }
    else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
      objKind = "<" + describeElementType(objectOrArray.type) + "/>";
    else {
      if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG)
        return "client";
      if (jsxPropsParents.has(objectOrArray)) {
        objKind = jsxPropsParents.get(objectOrArray);
        objKind = "<" + (describeElementType(objKind) || "...");
        type = Object.keys(objectOrArray);
        for (i = 0;i < type.length; i++) {
          objKind += " ";
          value = type[i];
          objKind += describeKeyForErrorMessage(value) + "=";
          var _value2 = objectOrArray[value];
          var _substr2 = value === expandedName && typeof _value2 === "object" && _value2 !== null ? describeObjectForErrorMessage(_value2) : describeValueForErrorMessage(_value2);
          typeof _value2 !== "string" && (_substr2 = "{" + _substr2 + "}");
          value === expandedName ? (start = objKind.length, length = _substr2.length, objKind += _substr2) : objKind = 10 > _substr2.length && 40 > objKind.length + _substr2.length ? objKind + _substr2 : objKind + "...";
        }
        objKind += ">";
      } else {
        objKind = "{";
        type = Object.keys(objectOrArray);
        for (i = 0;i < type.length; i++)
          0 < i && (objKind += ", "), value = type[i], objKind += describeKeyForErrorMessage(value) + ": ", _value2 = objectOrArray[value], _value2 = typeof _value2 === "object" && _value2 !== null ? describeObjectForErrorMessage(_value2) : describeValueForErrorMessage(_value2), value === expandedName ? (start = objKind.length, length = _value2.length, objKind += _value2) : objKind = 10 > _value2.length && 40 > objKind.length + _value2.length ? objKind + _value2 : objKind + "...";
        objKind += "}";
      }
    }
    return expandedName === undefined ? objKind : -1 < start && 0 < length ? (objectOrArray = " ".repeat(start) + "^".repeat(length), `
  ` + objKind + `
  ` + objectOrArray) : `
  ` + objKind;
  }
  var scheduleMicrotask = queueMicrotask;
  function flushBuffered(destination) {
    typeof destination.flush === "function" && destination.flush();
  }
  function writeChunk(destination, chunk) {
    chunk.length !== 0 && destination.write(chunk);
  }
  function byteLengthOfChunk(chunk) {
    return Buffer.byteLength(chunk, "utf8");
  }
  function closeWithError(destination, error) {
    typeof destination.error === "function" ? destination.error(error) : destination.close();
  }
  var assign = Object.assign;
  function typeName(value) {
    return typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
  }
  function willCoercionThrow(value) {
    try {
      return testStringCoercion(value), false;
    } catch (e) {
      return true;
    }
  }
  function testStringCoercion(value) {
    return "" + value;
  }
  function checkAttributeStringCoercion(value, attributeName) {
    if (willCoercionThrow(value))
      return console.error("The provided `%s` attribute is an unsupported type %s. This value must be coerced to a string before using it here.", attributeName, typeName(value)), testStringCoercion(value);
  }
  function checkCSSPropertyStringCoercion(value, propName) {
    if (willCoercionThrow(value))
      return console.error("The provided `%s` CSS property is an unsupported type %s. This value must be coerced to a string before using it here.", propName, typeName(value)), testStringCoercion(value);
  }
  function checkHtmlStringCoercion(value) {
    if (willCoercionThrow(value))
      return console.error("The provided HTML markup uses a value of unsupported type %s. This value must be coerced to a string before using it here.", typeName(value)), testStringCoercion(value);
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var VALID_ATTRIBUTE_NAME_REGEX = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
  var illegalAttributeNameCache = {};
  var validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
      return true;
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName))
      return false;
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
      return validatedAttributeNameCache[attributeName] = true;
    illegalAttributeNameCache[attributeName] = true;
    console.error("Invalid attribute name: `%s`", attributeName);
    return false;
  }
  var unitlessNumbers = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
  var aliases = new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]);
  var hasReadOnlyValue = {
    button: true,
    checkbox: true,
    image: true,
    hidden: true,
    radio: true,
    reset: true,
    submit: true
  };
  function checkControlledValueProps(tagName, props) {
    hasReadOnlyValue[props.type] || props.onChange || props.onInput || props.readOnly || props.disabled || props.value == null || (tagName === "select" ? console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set `onChange`.") : console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`."));
    props.onChange || props.readOnly || props.disabled || props.checked == null || console.error("You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`.");
  }
  var ariaProperties = {
    "aria-current": 0,
    "aria-description": 0,
    "aria-details": 0,
    "aria-disabled": 0,
    "aria-hidden": 0,
    "aria-invalid": 0,
    "aria-keyshortcuts": 0,
    "aria-label": 0,
    "aria-roledescription": 0,
    "aria-autocomplete": 0,
    "aria-checked": 0,
    "aria-expanded": 0,
    "aria-haspopup": 0,
    "aria-level": 0,
    "aria-modal": 0,
    "aria-multiline": 0,
    "aria-multiselectable": 0,
    "aria-orientation": 0,
    "aria-placeholder": 0,
    "aria-pressed": 0,
    "aria-readonly": 0,
    "aria-required": 0,
    "aria-selected": 0,
    "aria-sort": 0,
    "aria-valuemax": 0,
    "aria-valuemin": 0,
    "aria-valuenow": 0,
    "aria-valuetext": 0,
    "aria-atomic": 0,
    "aria-busy": 0,
    "aria-live": 0,
    "aria-relevant": 0,
    "aria-dropeffect": 0,
    "aria-grabbed": 0,
    "aria-activedescendant": 0,
    "aria-colcount": 0,
    "aria-colindex": 0,
    "aria-colspan": 0,
    "aria-controls": 0,
    "aria-describedby": 0,
    "aria-errormessage": 0,
    "aria-flowto": 0,
    "aria-labelledby": 0,
    "aria-owns": 0,
    "aria-posinset": 0,
    "aria-rowcount": 0,
    "aria-rowindex": 0,
    "aria-rowspan": 0,
    "aria-setsize": 0,
    "aria-braillelabel": 0,
    "aria-brailleroledescription": 0,
    "aria-colindextext": 0,
    "aria-rowindextext": 0
  };
  var warnedProperties$1 = {};
  var rARIA$1 = RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
  var rARIACamel$1 = RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
  function validateProperty$1(tagName, name) {
    if (hasOwnProperty.call(warnedProperties$1, name) && warnedProperties$1[name])
      return true;
    if (rARIACamel$1.test(name)) {
      tagName = "aria-" + name.slice(4).toLowerCase();
      tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
      if (tagName == null)
        return console.error("Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.", name), warnedProperties$1[name] = true;
      if (name !== tagName)
        return console.error("Invalid ARIA attribute `%s`. Did you mean `%s`?", name, tagName), warnedProperties$1[name] = true;
    }
    if (rARIA$1.test(name)) {
      tagName = name.toLowerCase();
      tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
      if (tagName == null)
        return warnedProperties$1[name] = true, false;
      name !== tagName && (console.error("Unknown ARIA attribute `%s`. Did you mean `%s`?", name, tagName), warnedProperties$1[name] = true);
    }
    return true;
  }
  function validateProperties$2(type, props) {
    var invalidProps = [], key;
    for (key in props)
      validateProperty$1(type, key) || invalidProps.push(key);
    props = invalidProps.map(function(prop) {
      return "`" + prop + "`";
    }).join(", ");
    invalidProps.length === 1 ? console.error("Invalid aria prop %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props", props, type) : 1 < invalidProps.length && console.error("Invalid aria props %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props", props, type);
  }
  var didWarnValueNull = false;
  var possibleStandardNames = {
    accept: "accept",
    acceptcharset: "acceptCharset",
    "accept-charset": "acceptCharset",
    accesskey: "accessKey",
    action: "action",
    allowfullscreen: "allowFullScreen",
    alt: "alt",
    as: "as",
    async: "async",
    autocapitalize: "autoCapitalize",
    autocomplete: "autoComplete",
    autocorrect: "autoCorrect",
    autofocus: "autoFocus",
    autoplay: "autoPlay",
    autosave: "autoSave",
    capture: "capture",
    cellpadding: "cellPadding",
    cellspacing: "cellSpacing",
    challenge: "challenge",
    charset: "charSet",
    checked: "checked",
    children: "children",
    cite: "cite",
    class: "className",
    classid: "classID",
    classname: "className",
    cols: "cols",
    colspan: "colSpan",
    content: "content",
    contenteditable: "contentEditable",
    contextmenu: "contextMenu",
    controls: "controls",
    controlslist: "controlsList",
    coords: "coords",
    crossorigin: "crossOrigin",
    dangerouslysetinnerhtml: "dangerouslySetInnerHTML",
    data: "data",
    datetime: "dateTime",
    default: "default",
    defaultchecked: "defaultChecked",
    defaultvalue: "defaultValue",
    defer: "defer",
    dir: "dir",
    disabled: "disabled",
    disablepictureinpicture: "disablePictureInPicture",
    disableremoteplayback: "disableRemotePlayback",
    download: "download",
    draggable: "draggable",
    enctype: "encType",
    enterkeyhint: "enterKeyHint",
    fetchpriority: "fetchPriority",
    for: "htmlFor",
    form: "form",
    formmethod: "formMethod",
    formaction: "formAction",
    formenctype: "formEncType",
    formnovalidate: "formNoValidate",
    formtarget: "formTarget",
    frameborder: "frameBorder",
    headers: "headers",
    height: "height",
    hidden: "hidden",
    high: "high",
    href: "href",
    hreflang: "hrefLang",
    htmlfor: "htmlFor",
    httpequiv: "httpEquiv",
    "http-equiv": "httpEquiv",
    icon: "icon",
    id: "id",
    imagesizes: "imageSizes",
    imagesrcset: "imageSrcSet",
    inert: "inert",
    innerhtml: "innerHTML",
    inputmode: "inputMode",
    integrity: "integrity",
    is: "is",
    itemid: "itemID",
    itemprop: "itemProp",
    itemref: "itemRef",
    itemscope: "itemScope",
    itemtype: "itemType",
    keyparams: "keyParams",
    keytype: "keyType",
    kind: "kind",
    label: "label",
    lang: "lang",
    list: "list",
    loop: "loop",
    low: "low",
    manifest: "manifest",
    marginwidth: "marginWidth",
    marginheight: "marginHeight",
    max: "max",
    maxlength: "maxLength",
    media: "media",
    mediagroup: "mediaGroup",
    method: "method",
    min: "min",
    minlength: "minLength",
    multiple: "multiple",
    muted: "muted",
    name: "name",
    nomodule: "noModule",
    nonce: "nonce",
    novalidate: "noValidate",
    open: "open",
    optimum: "optimum",
    pattern: "pattern",
    placeholder: "placeholder",
    playsinline: "playsInline",
    poster: "poster",
    preload: "preload",
    profile: "profile",
    radiogroup: "radioGroup",
    readonly: "readOnly",
    referrerpolicy: "referrerPolicy",
    rel: "rel",
    required: "required",
    reversed: "reversed",
    role: "role",
    rows: "rows",
    rowspan: "rowSpan",
    sandbox: "sandbox",
    scope: "scope",
    scoped: "scoped",
    scrolling: "scrolling",
    seamless: "seamless",
    selected: "selected",
    shape: "shape",
    size: "size",
    sizes: "sizes",
    span: "span",
    spellcheck: "spellCheck",
    src: "src",
    srcdoc: "srcDoc",
    srclang: "srcLang",
    srcset: "srcSet",
    start: "start",
    step: "step",
    style: "style",
    summary: "summary",
    tabindex: "tabIndex",
    target: "target",
    title: "title",
    type: "type",
    usemap: "useMap",
    value: "value",
    width: "width",
    wmode: "wmode",
    wrap: "wrap",
    about: "about",
    accentheight: "accentHeight",
    "accent-height": "accentHeight",
    accumulate: "accumulate",
    additive: "additive",
    alignmentbaseline: "alignmentBaseline",
    "alignment-baseline": "alignmentBaseline",
    allowreorder: "allowReorder",
    alphabetic: "alphabetic",
    amplitude: "amplitude",
    arabicform: "arabicForm",
    "arabic-form": "arabicForm",
    ascent: "ascent",
    attributename: "attributeName",
    attributetype: "attributeType",
    autoreverse: "autoReverse",
    azimuth: "azimuth",
    basefrequency: "baseFrequency",
    baselineshift: "baselineShift",
    "baseline-shift": "baselineShift",
    baseprofile: "baseProfile",
    bbox: "bbox",
    begin: "begin",
    bias: "bias",
    by: "by",
    calcmode: "calcMode",
    capheight: "capHeight",
    "cap-height": "capHeight",
    clip: "clip",
    clippath: "clipPath",
    "clip-path": "clipPath",
    clippathunits: "clipPathUnits",
    cliprule: "clipRule",
    "clip-rule": "clipRule",
    color: "color",
    colorinterpolation: "colorInterpolation",
    "color-interpolation": "colorInterpolation",
    colorinterpolationfilters: "colorInterpolationFilters",
    "color-interpolation-filters": "colorInterpolationFilters",
    colorprofile: "colorProfile",
    "color-profile": "colorProfile",
    colorrendering: "colorRendering",
    "color-rendering": "colorRendering",
    contentscripttype: "contentScriptType",
    contentstyletype: "contentStyleType",
    cursor: "cursor",
    cx: "cx",
    cy: "cy",
    d: "d",
    datatype: "datatype",
    decelerate: "decelerate",
    descent: "descent",
    diffuseconstant: "diffuseConstant",
    direction: "direction",
    display: "display",
    divisor: "divisor",
    dominantbaseline: "dominantBaseline",
    "dominant-baseline": "dominantBaseline",
    dur: "dur",
    dx: "dx",
    dy: "dy",
    edgemode: "edgeMode",
    elevation: "elevation",
    enablebackground: "enableBackground",
    "enable-background": "enableBackground",
    end: "end",
    exponent: "exponent",
    externalresourcesrequired: "externalResourcesRequired",
    fill: "fill",
    fillopacity: "fillOpacity",
    "fill-opacity": "fillOpacity",
    fillrule: "fillRule",
    "fill-rule": "fillRule",
    filter: "filter",
    filterres: "filterRes",
    filterunits: "filterUnits",
    floodopacity: "floodOpacity",
    "flood-opacity": "floodOpacity",
    floodcolor: "floodColor",
    "flood-color": "floodColor",
    focusable: "focusable",
    fontfamily: "fontFamily",
    "font-family": "fontFamily",
    fontsize: "fontSize",
    "font-size": "fontSize",
    fontsizeadjust: "fontSizeAdjust",
    "font-size-adjust": "fontSizeAdjust",
    fontstretch: "fontStretch",
    "font-stretch": "fontStretch",
    fontstyle: "fontStyle",
    "font-style": "fontStyle",
    fontvariant: "fontVariant",
    "font-variant": "fontVariant",
    fontweight: "fontWeight",
    "font-weight": "fontWeight",
    format: "format",
    from: "from",
    fx: "fx",
    fy: "fy",
    g1: "g1",
    g2: "g2",
    glyphname: "glyphName",
    "glyph-name": "glyphName",
    glyphorientationhorizontal: "glyphOrientationHorizontal",
    "glyph-orientation-horizontal": "glyphOrientationHorizontal",
    glyphorientationvertical: "glyphOrientationVertical",
    "glyph-orientation-vertical": "glyphOrientationVertical",
    glyphref: "glyphRef",
    gradienttransform: "gradientTransform",
    gradientunits: "gradientUnits",
    hanging: "hanging",
    horizadvx: "horizAdvX",
    "horiz-adv-x": "horizAdvX",
    horizoriginx: "horizOriginX",
    "horiz-origin-x": "horizOriginX",
    ideographic: "ideographic",
    imagerendering: "imageRendering",
    "image-rendering": "imageRendering",
    in2: "in2",
    in: "in",
    inlist: "inlist",
    intercept: "intercept",
    k1: "k1",
    k2: "k2",
    k3: "k3",
    k4: "k4",
    k: "k",
    kernelmatrix: "kernelMatrix",
    kernelunitlength: "kernelUnitLength",
    kerning: "kerning",
    keypoints: "keyPoints",
    keysplines: "keySplines",
    keytimes: "keyTimes",
    lengthadjust: "lengthAdjust",
    letterspacing: "letterSpacing",
    "letter-spacing": "letterSpacing",
    lightingcolor: "lightingColor",
    "lighting-color": "lightingColor",
    limitingconeangle: "limitingConeAngle",
    local: "local",
    markerend: "markerEnd",
    "marker-end": "markerEnd",
    markerheight: "markerHeight",
    markermid: "markerMid",
    "marker-mid": "markerMid",
    markerstart: "markerStart",
    "marker-start": "markerStart",
    markerunits: "markerUnits",
    markerwidth: "markerWidth",
    mask: "mask",
    maskcontentunits: "maskContentUnits",
    maskunits: "maskUnits",
    mathematical: "mathematical",
    mode: "mode",
    numoctaves: "numOctaves",
    offset: "offset",
    opacity: "opacity",
    operator: "operator",
    order: "order",
    orient: "orient",
    orientation: "orientation",
    origin: "origin",
    overflow: "overflow",
    overlineposition: "overlinePosition",
    "overline-position": "overlinePosition",
    overlinethickness: "overlineThickness",
    "overline-thickness": "overlineThickness",
    paintorder: "paintOrder",
    "paint-order": "paintOrder",
    panose1: "panose1",
    "panose-1": "panose1",
    pathlength: "pathLength",
    patterncontentunits: "patternContentUnits",
    patterntransform: "patternTransform",
    patternunits: "patternUnits",
    pointerevents: "pointerEvents",
    "pointer-events": "pointerEvents",
    points: "points",
    pointsatx: "pointsAtX",
    pointsaty: "pointsAtY",
    pointsatz: "pointsAtZ",
    popover: "popover",
    popovertarget: "popoverTarget",
    popovertargetaction: "popoverTargetAction",
    prefix: "prefix",
    preservealpha: "preserveAlpha",
    preserveaspectratio: "preserveAspectRatio",
    primitiveunits: "primitiveUnits",
    property: "property",
    r: "r",
    radius: "radius",
    refx: "refX",
    refy: "refY",
    renderingintent: "renderingIntent",
    "rendering-intent": "renderingIntent",
    repeatcount: "repeatCount",
    repeatdur: "repeatDur",
    requiredextensions: "requiredExtensions",
    requiredfeatures: "requiredFeatures",
    resource: "resource",
    restart: "restart",
    result: "result",
    results: "results",
    rotate: "rotate",
    rx: "rx",
    ry: "ry",
    scale: "scale",
    security: "security",
    seed: "seed",
    shaperendering: "shapeRendering",
    "shape-rendering": "shapeRendering",
    slope: "slope",
    spacing: "spacing",
    specularconstant: "specularConstant",
    specularexponent: "specularExponent",
    speed: "speed",
    spreadmethod: "spreadMethod",
    startoffset: "startOffset",
    stddeviation: "stdDeviation",
    stemh: "stemh",
    stemv: "stemv",
    stitchtiles: "stitchTiles",
    stopcolor: "stopColor",
    "stop-color": "stopColor",
    stopopacity: "stopOpacity",
    "stop-opacity": "stopOpacity",
    strikethroughposition: "strikethroughPosition",
    "strikethrough-position": "strikethroughPosition",
    strikethroughthickness: "strikethroughThickness",
    "strikethrough-thickness": "strikethroughThickness",
    string: "string",
    stroke: "stroke",
    strokedasharray: "strokeDasharray",
    "stroke-dasharray": "strokeDasharray",
    strokedashoffset: "strokeDashoffset",
    "stroke-dashoffset": "strokeDashoffset",
    strokelinecap: "strokeLinecap",
    "stroke-linecap": "strokeLinecap",
    strokelinejoin: "strokeLinejoin",
    "stroke-linejoin": "strokeLinejoin",
    strokemiterlimit: "strokeMiterlimit",
    "stroke-miterlimit": "strokeMiterlimit",
    strokewidth: "strokeWidth",
    "stroke-width": "strokeWidth",
    strokeopacity: "strokeOpacity",
    "stroke-opacity": "strokeOpacity",
    suppresscontenteditablewarning: "suppressContentEditableWarning",
    suppresshydrationwarning: "suppressHydrationWarning",
    surfacescale: "surfaceScale",
    systemlanguage: "systemLanguage",
    tablevalues: "tableValues",
    targetx: "targetX",
    targety: "targetY",
    textanchor: "textAnchor",
    "text-anchor": "textAnchor",
    textdecoration: "textDecoration",
    "text-decoration": "textDecoration",
    textlength: "textLength",
    textrendering: "textRendering",
    "text-rendering": "textRendering",
    to: "to",
    transform: "transform",
    transformorigin: "transformOrigin",
    "transform-origin": "transformOrigin",
    typeof: "typeof",
    u1: "u1",
    u2: "u2",
    underlineposition: "underlinePosition",
    "underline-position": "underlinePosition",
    underlinethickness: "underlineThickness",
    "underline-thickness": "underlineThickness",
    unicode: "unicode",
    unicodebidi: "unicodeBidi",
    "unicode-bidi": "unicodeBidi",
    unicoderange: "unicodeRange",
    "unicode-range": "unicodeRange",
    unitsperem: "unitsPerEm",
    "units-per-em": "unitsPerEm",
    unselectable: "unselectable",
    valphabetic: "vAlphabetic",
    "v-alphabetic": "vAlphabetic",
    values: "values",
    vectoreffect: "vectorEffect",
    "vector-effect": "vectorEffect",
    version: "version",
    vertadvy: "vertAdvY",
    "vert-adv-y": "vertAdvY",
    vertoriginx: "vertOriginX",
    "vert-origin-x": "vertOriginX",
    vertoriginy: "vertOriginY",
    "vert-origin-y": "vertOriginY",
    vhanging: "vHanging",
    "v-hanging": "vHanging",
    videographic: "vIdeographic",
    "v-ideographic": "vIdeographic",
    viewbox: "viewBox",
    viewtarget: "viewTarget",
    visibility: "visibility",
    vmathematical: "vMathematical",
    "v-mathematical": "vMathematical",
    vocab: "vocab",
    widths: "widths",
    wordspacing: "wordSpacing",
    "word-spacing": "wordSpacing",
    writingmode: "writingMode",
    "writing-mode": "writingMode",
    x1: "x1",
    x2: "x2",
    x: "x",
    xchannelselector: "xChannelSelector",
    xheight: "xHeight",
    "x-height": "xHeight",
    xlinkactuate: "xlinkActuate",
    "xlink:actuate": "xlinkActuate",
    xlinkarcrole: "xlinkArcrole",
    "xlink:arcrole": "xlinkArcrole",
    xlinkhref: "xlinkHref",
    "xlink:href": "xlinkHref",
    xlinkrole: "xlinkRole",
    "xlink:role": "xlinkRole",
    xlinkshow: "xlinkShow",
    "xlink:show": "xlinkShow",
    xlinktitle: "xlinkTitle",
    "xlink:title": "xlinkTitle",
    xlinktype: "xlinkType",
    "xlink:type": "xlinkType",
    xmlbase: "xmlBase",
    "xml:base": "xmlBase",
    xmllang: "xmlLang",
    "xml:lang": "xmlLang",
    xmlns: "xmlns",
    "xml:space": "xmlSpace",
    xmlnsxlink: "xmlnsXlink",
    "xmlns:xlink": "xmlnsXlink",
    xmlspace: "xmlSpace",
    y1: "y1",
    y2: "y2",
    y: "y",
    ychannelselector: "yChannelSelector",
    z: "z",
    zoomandpan: "zoomAndPan"
  };
  var warnedProperties = {};
  var EVENT_NAME_REGEX = /^on./;
  var INVALID_EVENT_NAME_REGEX = /^on[^A-Z]/;
  var rARIA = RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
  var rARIACamel = RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
  function validateProperty(tagName, name, value, eventRegistry) {
    if (hasOwnProperty.call(warnedProperties, name) && warnedProperties[name])
      return true;
    var lowerCasedName = name.toLowerCase();
    if (lowerCasedName === "onfocusin" || lowerCasedName === "onfocusout")
      return console.error("React uses onFocus and onBlur instead of onFocusIn and onFocusOut. All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React."), warnedProperties[name] = true;
    if (typeof value === "function" && (tagName === "form" && name === "action" || tagName === "input" && name === "formAction" || tagName === "button" && name === "formAction"))
      return true;
    if (eventRegistry != null) {
      tagName = eventRegistry.possibleRegistrationNames;
      if (eventRegistry.registrationNameDependencies.hasOwnProperty(name))
        return true;
      eventRegistry = tagName.hasOwnProperty(lowerCasedName) ? tagName[lowerCasedName] : null;
      if (eventRegistry != null)
        return console.error("Invalid event handler property `%s`. Did you mean `%s`?", name, eventRegistry), warnedProperties[name] = true;
      if (EVENT_NAME_REGEX.test(name))
        return console.error("Unknown event handler property `%s`. It will be ignored.", name), warnedProperties[name] = true;
    } else if (EVENT_NAME_REGEX.test(name))
      return INVALID_EVENT_NAME_REGEX.test(name) && console.error("Invalid event handler property `%s`. React events use the camelCase naming convention, for example `onClick`.", name), warnedProperties[name] = true;
    if (rARIA.test(name) || rARIACamel.test(name))
      return true;
    if (lowerCasedName === "innerhtml")
      return console.error("Directly setting property `innerHTML` is not permitted. For more information, lookup documentation on `dangerouslySetInnerHTML`."), warnedProperties[name] = true;
    if (lowerCasedName === "aria")
      return console.error("The `aria` attribute is reserved for future use in React. Pass individual `aria-` attributes instead."), warnedProperties[name] = true;
    if (lowerCasedName === "is" && value !== null && value !== undefined && typeof value !== "string")
      return console.error("Received a `%s` for a string attribute `is`. If this is expected, cast the value to a string.", typeof value), warnedProperties[name] = true;
    if (typeof value === "number" && isNaN(value))
      return console.error("Received NaN for the `%s` attribute. If this is expected, cast the value to a string.", name), warnedProperties[name] = true;
    if (possibleStandardNames.hasOwnProperty(lowerCasedName)) {
      if (lowerCasedName = possibleStandardNames[lowerCasedName], lowerCasedName !== name)
        return console.error("Invalid DOM property `%s`. Did you mean `%s`?", name, lowerCasedName), warnedProperties[name] = true;
    } else if (name !== lowerCasedName)
      return console.error("React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.", name, lowerCasedName), warnedProperties[name] = true;
    switch (name) {
      case "dangerouslySetInnerHTML":
      case "children":
      case "style":
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        return true;
      case "innerText":
      case "textContent":
        return true;
    }
    switch (typeof value) {
      case "boolean":
        switch (name) {
          case "autoFocus":
          case "checked":
          case "multiple":
          case "muted":
          case "selected":
          case "contentEditable":
          case "spellCheck":
          case "draggable":
          case "value":
          case "autoReverse":
          case "externalResourcesRequired":
          case "focusable":
          case "preserveAlpha":
          case "allowFullScreen":
          case "async":
          case "autoPlay":
          case "controls":
          case "default":
          case "defer":
          case "disabled":
          case "disablePictureInPicture":
          case "disableRemotePlayback":
          case "formNoValidate":
          case "hidden":
          case "loop":
          case "noModule":
          case "noValidate":
          case "open":
          case "playsInline":
          case "readOnly":
          case "required":
          case "reversed":
          case "scoped":
          case "seamless":
          case "itemScope":
          case "capture":
          case "download":
          case "inert":
            return true;
          default:
            lowerCasedName = name.toLowerCase().slice(0, 5);
            if (lowerCasedName === "data-" || lowerCasedName === "aria-")
              return true;
            value ? console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.', value, name, name, value, name) : console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.', value, name, name, value, name, name, name);
            return warnedProperties[name] = true;
        }
      case "function":
      case "symbol":
        return warnedProperties[name] = true, false;
      case "string":
        if (value === "false" || value === "true") {
          switch (name) {
            case "checked":
            case "selected":
            case "multiple":
            case "muted":
            case "allowFullScreen":
            case "async":
            case "autoPlay":
            case "controls":
            case "default":
            case "defer":
            case "disabled":
            case "disablePictureInPicture":
            case "disableRemotePlayback":
            case "formNoValidate":
            case "hidden":
            case "loop":
            case "noModule":
            case "noValidate":
            case "open":
            case "playsInline":
            case "readOnly":
            case "required":
            case "reversed":
            case "scoped":
            case "seamless":
            case "itemScope":
            case "inert":
              break;
            default:
              return true;
          }
          console.error("Received the string `%s` for the boolean attribute `%s`. %s Did you mean %s={%s}?", value, name, value === "false" ? "The browser will interpret it as a truthy value." : 'Although this works, it will not work as expected if you pass the string "false".', name, value);
          warnedProperties[name] = true;
        }
    }
    return true;
  }
  function warnUnknownProperties(type, props, eventRegistry) {
    var unknownProps = [], key;
    for (key in props)
      validateProperty(type, key, props[key], eventRegistry) || unknownProps.push(key);
    props = unknownProps.map(function(prop) {
      return "`" + prop + "`";
    }).join(", ");
    unknownProps.length === 1 ? console.error("Invalid value for prop %s on <%s> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM. For details, see https://react.dev/link/attribute-behavior ", props, type) : 1 < unknownProps.length && console.error("Invalid values for props %s on <%s> tag. Either remove them from the element, or pass a string or number value to keep them in the DOM. For details, see https://react.dev/link/attribute-behavior ", props, type);
  }
  var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;
  var msPattern$1 = /^-ms-/;
  var hyphenPattern = /-(.)/g;
  var badStyleValueWithSemicolonPattern = /;\s*$/;
  var warnedStyleNames = {};
  var warnedStyleValues = {};
  var warnedForNaNValue = false;
  var warnedForInfinityValue = false;
  function camelize(string) {
    return string.replace(hyphenPattern, function(_, character) {
      return character.toUpperCase();
    });
  }
  var matchHtmlRegExp = /["'&<>]/;
  function escapeTextForBrowser(text) {
    if (typeof text === "boolean" || typeof text === "number" || typeof text === "bigint")
      return "" + text;
    checkHtmlStringCoercion(text);
    text = "" + text;
    var match = matchHtmlRegExp.exec(text);
    if (match) {
      var html = "", index, lastIndex = 0;
      for (index = match.index;index < text.length; index++) {
        switch (text.charCodeAt(index)) {
          case 34:
            match = "&quot;";
            break;
          case 38:
            match = "&amp;";
            break;
          case 39:
            match = "&#x27;";
            break;
          case 60:
            match = "&lt;";
            break;
          case 62:
            match = "&gt;";
            break;
          default:
            continue;
        }
        lastIndex !== index && (html += text.slice(lastIndex, index));
        lastIndex = index + 1;
        html += match;
      }
      text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
    }
    return text;
  }
  var uppercasePattern = /([A-Z])/g;
  var msPattern = /^ms-/;
  var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function sanitizeURL(url) {
    return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
  }
  var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  var NotPending = Object.freeze({
    pending: false,
    data: null,
    method: null,
    action: null
  });
  var previousDispatcher = ReactDOMSharedInternals.d;
  ReactDOMSharedInternals.d = {
    f: previousDispatcher.f,
    r: previousDispatcher.r,
    D: prefetchDNS,
    C: preconnect,
    L: preload,
    m: preloadModule,
    X: preinitScript,
    S: preinitStyle,
    M: preinitModuleScript
  };
  var NothingSent = 0;
  var SentCompleteSegmentFunction = 1;
  var SentCompleteBoundaryFunction = 2;
  var SentClientRenderFunction = 4;
  var SentStyleInsertionFunction = 8;
  var SentCompletedShellId = 32;
  var SentMarkShellTime = 64;
  var EXISTS = null;
  var PRELOAD_NO_CREDS = [];
  Object.freeze(PRELOAD_NO_CREDS);
  var currentlyFlushingRenderState = null;
  var endInlineScript = "</script>";
  function escapeEntireInlineScriptContent(scriptText) {
    checkHtmlStringCoercion(scriptText);
    return ("" + scriptText).replace(scriptRegex, scriptReplacer);
  }
  var scriptRegex = /(<\/|<)(s)(cript)/gi;
  function scriptReplacer(match, prefix2, s, suffix2) {
    return "" + prefix2 + (s === "s" ? "\\u0073" : "\\u0053") + suffix2;
  }
  var didWarnForNewBooleanPropsWithEmptyValue;
  didWarnForNewBooleanPropsWithEmptyValue = {};
  function createRenderState(resumableState, nonce, externalRuntimeConfig, importMap, onHeaders, maxHeadersLength) {
    externalRuntimeConfig = typeof nonce === "string" ? nonce : nonce && nonce.script;
    var inlineScriptWithNonce = externalRuntimeConfig === undefined ? "<script" : '<script nonce="' + escapeTextForBrowser(externalRuntimeConfig) + '"', nonceStyle = typeof nonce === "string" ? undefined : nonce && nonce.style, inlineStyleWithNonce = nonceStyle === undefined ? "<style" : '<style nonce="' + escapeTextForBrowser(nonceStyle) + '"', idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
    bootstrapScriptContent !== undefined && (bootstrapChunks.push(inlineScriptWithNonce), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, escapeEntireInlineScriptContent(bootstrapScriptContent), endInlineScript));
    bootstrapScriptContent = [];
    importMap !== undefined && (bootstrapScriptContent.push('<script type="importmap">'), bootstrapScriptContent.push(escapeEntireInlineScriptContent(JSON.stringify(importMap))), bootstrapScriptContent.push("</script>"));
    onHeaders && typeof maxHeadersLength === "number" && 0 >= maxHeadersLength && console.error("React expected a positive non-zero `maxHeadersLength` option but found %s instead. When using the `onHeaders` option you may supply an optional `maxHeadersLength` option as well however, when setting this value to zero or less no headers will be captured.", maxHeadersLength === 0 ? "zero" : maxHeadersLength);
    importMap = onHeaders ? {
      preconnects: "",
      fontPreloads: "",
      highImagePreloads: "",
      remainingCapacity: 2 + (typeof maxHeadersLength === "number" ? maxHeadersLength : 2000)
    } : null;
    onHeaders = {
      placeholderPrefix: idPrefix + "P:",
      segmentPrefix: idPrefix + "S:",
      boundaryPrefix: idPrefix + "B:",
      startInlineScript: inlineScriptWithNonce,
      startInlineStyle: inlineStyleWithNonce,
      preamble: createPreambleState(),
      externalRuntimeScript: null,
      bootstrapChunks,
      importMapChunks: bootstrapScriptContent,
      onHeaders,
      headers: importMap,
      resets: {
        font: {},
        dns: {},
        connect: { default: {}, anonymous: {}, credentials: {} },
        image: {},
        style: {}
      },
      charsetChunks: [],
      viewportChunks: [],
      hoistableChunks: [],
      preconnects: new Set,
      fontPreloads: new Set,
      highImagePreloads: new Set,
      styles: new Map,
      bootstrapScripts: new Set,
      scripts: new Set,
      bulkPreloads: new Set,
      preloads: {
        images: new Map,
        stylesheets: new Map,
        scripts: new Map,
        moduleScripts: new Map
      },
      nonce: { script: externalRuntimeConfig, style: nonceStyle },
      hoistableState: null,
      stylesToHoist: false
    };
    if (bootstrapScripts !== undefined)
      for (importMap = 0;importMap < bootstrapScripts.length; importMap++)
        maxHeadersLength = bootstrapScripts[importMap], inlineStyleWithNonce = nonceStyle = undefined, idPrefix = {
          rel: "preload",
          as: "script",
          fetchPriority: "low",
          nonce
        }, typeof maxHeadersLength === "string" ? idPrefix.href = inlineScriptWithNonce = maxHeadersLength : (idPrefix.href = inlineScriptWithNonce = maxHeadersLength.src, idPrefix.integrity = inlineStyleWithNonce = typeof maxHeadersLength.integrity === "string" ? maxHeadersLength.integrity : undefined, idPrefix.crossOrigin = nonceStyle = typeof maxHeadersLength === "string" || maxHeadersLength.crossOrigin == null ? undefined : maxHeadersLength.crossOrigin === "use-credentials" ? "use-credentials" : ""), preloadBootstrapScriptOrModule(resumableState, onHeaders, inlineScriptWithNonce, idPrefix), bootstrapChunks.push('<script src="', escapeTextForBrowser(inlineScriptWithNonce), attributeEnd), externalRuntimeConfig && bootstrapChunks.push(' nonce="', escapeTextForBrowser(externalRuntimeConfig), attributeEnd), typeof inlineStyleWithNonce === "string" && bootstrapChunks.push(' integrity="', escapeTextForBrowser(inlineStyleWithNonce), attributeEnd), typeof nonceStyle === "string" && bootstrapChunks.push(' crossorigin="', escapeTextForBrowser(nonceStyle), attributeEnd), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(' async=""></script>');
    if (bootstrapModules !== undefined)
      for (nonce = 0;nonce < bootstrapModules.length; nonce++)
        bootstrapScripts = bootstrapModules[nonce], inlineScriptWithNonce = maxHeadersLength = undefined, nonceStyle = {
          rel: "modulepreload",
          fetchPriority: "low",
          nonce: externalRuntimeConfig
        }, typeof bootstrapScripts === "string" ? nonceStyle.href = importMap = bootstrapScripts : (nonceStyle.href = importMap = bootstrapScripts.src, nonceStyle.integrity = inlineScriptWithNonce = typeof bootstrapScripts.integrity === "string" ? bootstrapScripts.integrity : undefined, nonceStyle.crossOrigin = maxHeadersLength = typeof bootstrapScripts === "string" || bootstrapScripts.crossOrigin == null ? undefined : bootstrapScripts.crossOrigin === "use-credentials" ? "use-credentials" : ""), preloadBootstrapScriptOrModule(resumableState, onHeaders, importMap, nonceStyle), bootstrapChunks.push('<script type="module" src="', escapeTextForBrowser(importMap), attributeEnd), externalRuntimeConfig && bootstrapChunks.push(' nonce="', escapeTextForBrowser(externalRuntimeConfig), attributeEnd), typeof inlineScriptWithNonce === "string" && bootstrapChunks.push(' integrity="', escapeTextForBrowser(inlineScriptWithNonce), attributeEnd), typeof maxHeadersLength === "string" && bootstrapChunks.push(' crossorigin="', escapeTextForBrowser(maxHeadersLength), attributeEnd), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(' async=""></script>');
    return onHeaders;
  }
  function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
    return {
      idPrefix: identifierPrefix === undefined ? "" : identifierPrefix,
      nextFormID: 0,
      streamingFormat: 0,
      bootstrapScriptContent,
      bootstrapScripts,
      bootstrapModules,
      instructions: NothingSent,
      hasBody: false,
      hasHtml: false,
      unknownResources: {},
      dnsResources: {},
      connectResources: { default: {}, anonymous: {}, credentials: {} },
      imageResources: {},
      styleResources: {},
      scriptResources: {},
      moduleUnknownResources: {},
      moduleScriptResources: {}
    };
  }
  function createPreambleState() {
    return { htmlChunks: null, headChunks: null, bodyChunks: null };
  }
  var ROOT_HTML_MODE = 0;
  var HTML_HTML_MODE = 1;
  var HTML_MODE = 2;
  var HTML_HEAD_MODE = 3;
  var SVG_MODE = 4;
  var MATHML_MODE = 5;
  var HTML_TABLE_MODE = 6;
  var HTML_TABLE_BODY_MODE = 7;
  var HTML_TABLE_ROW_MODE = 8;
  var HTML_COLGROUP_MODE = 9;
  function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
    return {
      insertionMode,
      selectedValue,
      tagScope,
      viewTransition
    };
  }
  function createRootFormatContext(namespaceURI) {
    return createFormatContext(namespaceURI === "http://www.w3.org/2000/svg" ? SVG_MODE : namespaceURI === "http://www.w3.org/1998/Math/MathML" ? MATHML_MODE : ROOT_HTML_MODE, null, 0, null);
  }
  function getChildFormatContext(parentContext, type, props) {
    var subtreeScope = parentContext.tagScope & -25;
    switch (type) {
      case "noscript":
        return createFormatContext(HTML_MODE, null, subtreeScope | 1, null);
      case "select":
        return createFormatContext(HTML_MODE, props.value != null ? props.value : props.defaultValue, subtreeScope, null);
      case "svg":
        return createFormatContext(SVG_MODE, null, subtreeScope, null);
      case "picture":
        return createFormatContext(HTML_MODE, null, subtreeScope | 2, null);
      case "math":
        return createFormatContext(MATHML_MODE, null, subtreeScope, null);
      case "foreignObject":
        return createFormatContext(HTML_MODE, null, subtreeScope, null);
      case "table":
        return createFormatContext(HTML_TABLE_MODE, null, subtreeScope, null);
      case "thead":
      case "tbody":
      case "tfoot":
        return createFormatContext(HTML_TABLE_BODY_MODE, null, subtreeScope, null);
      case "colgroup":
        return createFormatContext(HTML_COLGROUP_MODE, null, subtreeScope, null);
      case "tr":
        return createFormatContext(HTML_TABLE_ROW_MODE, null, subtreeScope, null);
      case "head":
        if (parentContext.insertionMode < HTML_MODE)
          return createFormatContext(HTML_HEAD_MODE, null, subtreeScope, null);
        break;
      case "html":
        if (parentContext.insertionMode === ROOT_HTML_MODE)
          return createFormatContext(HTML_HTML_MODE, null, subtreeScope, null);
    }
    return parentContext.insertionMode >= HTML_TABLE_MODE || parentContext.insertionMode < HTML_MODE ? createFormatContext(HTML_MODE, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null) : parentContext;
  }
  function getSuspenseViewTransition(parentViewTransition) {
    return parentViewTransition === null ? null : {
      update: parentViewTransition.update,
      enter: "none",
      exit: "none",
      share: parentViewTransition.update,
      name: parentViewTransition.autoName,
      autoName: parentViewTransition.autoName,
      nameIdx: 0
    };
  }
  function getSuspenseFallbackFormatContext(resumableState, parentContext) {
    parentContext.tagScope & 32 && (resumableState.instructions |= 128);
    return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | 12, getSuspenseViewTransition(parentContext.viewTransition));
  }
  function getSuspenseContentFormatContext(resumableState, parentContext) {
    resumableState = getSuspenseViewTransition(parentContext.viewTransition);
    var subtreeScope = parentContext.tagScope | 16;
    resumableState !== null && resumableState.share !== "none" && (subtreeScope |= 64);
    return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, resumableState);
  }
  function pushTextInstance(target, text, renderState, textEmbedded) {
    if (text === "")
      return textEmbedded;
    textEmbedded && target.push("<!-- -->");
    target.push(escapeTextForBrowser(text));
    return true;
  }
  function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
    lastPushedText && textEmbedded && target.push("<!-- -->");
  }
  var styleNameCache = new Map;
  var styleAttributeStart = ' style="';
  var styleAssign = ":";
  var styleSeparator = ";";
  function pushStyleAttribute(target, style) {
    if (typeof style !== "object")
      throw Error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");
    var isFirst = true, styleName;
    for (styleName in style)
      if (hasOwnProperty.call(style, styleName)) {
        var styleValue = style[styleName];
        if (styleValue != null && typeof styleValue !== "boolean" && styleValue !== "") {
          if (styleName.indexOf("--") === 0) {
            var nameChunk = escapeTextForBrowser(styleName);
            checkCSSPropertyStringCoercion(styleValue, styleName);
            styleValue = escapeTextForBrowser(("" + styleValue).trim());
          } else {
            nameChunk = styleName;
            var value = styleValue;
            if (-1 < nameChunk.indexOf("-")) {
              var name = nameChunk;
              warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name] || (warnedStyleNames[name] = true, console.error("Unsupported style property %s. Did you mean %s?", name, camelize(name.replace(msPattern$1, "ms-"))));
            } else if (badVendoredStyleNamePattern.test(nameChunk))
              name = nameChunk, warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name] || (warnedStyleNames[name] = true, console.error("Unsupported vendor-prefixed style property %s. Did you mean %s?", name, name.charAt(0).toUpperCase() + name.slice(1)));
            else if (badStyleValueWithSemicolonPattern.test(value)) {
              name = nameChunk;
              var value$jscomp$0 = value;
              warnedStyleValues.hasOwnProperty(value$jscomp$0) && warnedStyleValues[value$jscomp$0] || (warnedStyleValues[value$jscomp$0] = true, console.error(`Style property values shouldn't contain a semicolon. Try "%s: %s" instead.`, name, value$jscomp$0.replace(badStyleValueWithSemicolonPattern, "")));
            }
            typeof value === "number" && (isNaN(value) ? warnedForNaNValue || (warnedForNaNValue = true, console.error("`NaN` is an invalid value for the `%s` css style property.", nameChunk)) : isFinite(value) || warnedForInfinityValue || (warnedForInfinityValue = true, console.error("`Infinity` is an invalid value for the `%s` css style property.", nameChunk)));
            nameChunk = styleName;
            value = styleNameCache.get(nameChunk);
            value !== undefined ? nameChunk = value : (value = escapeTextForBrowser(nameChunk.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-")), styleNameCache.set(nameChunk, value), nameChunk = value);
            typeof styleValue === "number" ? styleValue = styleValue === 0 || unitlessNumbers.has(styleName) ? "" + styleValue : styleValue + "px" : (checkCSSPropertyStringCoercion(styleValue, styleName), styleValue = escapeTextForBrowser(("" + styleValue).trim()));
          }
          isFirst ? (isFirst = false, target.push(styleAttributeStart, nameChunk, styleAssign, styleValue)) : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
        }
      }
    isFirst || target.push(attributeEnd);
  }
  var attributeSeparator = " ";
  var attributeAssign = '="';
  var attributeEnd = '"';
  var attributeEmptyString = '=""';
  function pushBooleanAttribute(target, name, value) {
    value && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeEmptyString);
  }
  function pushStringAttribute(target, name, value) {
    typeof value !== "function" && typeof value !== "symbol" && typeof value !== "boolean" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
  }
  var actionJavaScriptURL = escapeTextForBrowser("javascript:throw new Error('React form unexpectedly submitted.')");
  function pushAdditionalFormField(value, key) {
    this.push('<input type="hidden"');
    validateAdditionalFormField(value);
    pushStringAttribute(this, "name", key);
    pushStringAttribute(this, "value", value);
    this.push(endOfStartTagSelfClosing);
  }
  function validateAdditionalFormField(value) {
    if (typeof value !== "string")
      throw Error("File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration.");
  }
  function getCustomFormFields(resumableState, formAction) {
    if (typeof formAction.$$FORM_ACTION === "function") {
      var id = resumableState.nextFormID++;
      resumableState = resumableState.idPrefix + id;
      try {
        var customFields = formAction.$$FORM_ACTION(resumableState);
        if (customFields) {
          var formData = customFields.data;
          formData != null && formData.forEach(validateAdditionalFormField);
        }
        return customFields;
      } catch (x) {
        if (typeof x === "object" && x !== null && typeof x.then === "function")
          throw x;
        console.error(`Failed to serialize an action for progressive enhancement:
%s`, x);
      }
    }
    return null;
  }
  function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
    var formData = null;
    if (typeof formAction === "function") {
      name === null || didWarnFormActionName || (didWarnFormActionName = true, console.error('Cannot specify a "name" prop for a button that specifies a function as a formAction. React needs it to encode which action should be invoked. It will get overridden.'));
      formEncType === null && formMethod === null || didWarnFormActionMethod || (didWarnFormActionMethod = true, console.error("Cannot specify a formEncType or formMethod for a button that specifies a function as a formAction. React provides those automatically. They will get overridden."));
      formTarget === null || didWarnFormActionTarget || (didWarnFormActionTarget = true, console.error("Cannot specify a formTarget for a button that specifies a function as a formAction. The function will always be executed in the same window."));
      var customFields = getCustomFormFields(resumableState, formAction);
      customFields !== null ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(attributeSeparator, "formAction", attributeAssign, actionJavaScriptURL, attributeEnd), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
    }
    name != null && pushAttribute(target, "name", name);
    formAction != null && pushAttribute(target, "formAction", formAction);
    formEncType != null && pushAttribute(target, "formEncType", formEncType);
    formMethod != null && pushAttribute(target, "formMethod", formMethod);
    formTarget != null && pushAttribute(target, "formTarget", formTarget);
    return formData;
  }
  function pushAttribute(target, name, value) {
    switch (name) {
      case "className":
        pushStringAttribute(target, "class", value);
        break;
      case "tabIndex":
        pushStringAttribute(target, "tabindex", value);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        pushStringAttribute(target, name, value);
        break;
      case "style":
        pushStyleAttribute(target, value);
        break;
      case "src":
      case "href":
        if (value === "") {
          name === "src" ? console.error('An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', name, name) : console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', name, name);
          break;
        }
      case "action":
      case "formAction":
        if (value == null || typeof value === "function" || typeof value === "symbol" || typeof value === "boolean")
          break;
        checkAttributeStringCoercion(value, name);
        value = sanitizeURL("" + value);
        target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "ref":
        break;
      case "autoFocus":
      case "multiple":
      case "muted":
        pushBooleanAttribute(target, name.toLowerCase(), value);
        break;
      case "xlinkHref":
        if (typeof value === "function" || typeof value === "symbol" || typeof value === "boolean")
          break;
        checkAttributeStringCoercion(value, name);
        value = sanitizeURL("" + value);
        target.push(attributeSeparator, "xlink:href", attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "inert":
        value !== "" || didWarnForNewBooleanPropsWithEmptyValue[name] || (didWarnForNewBooleanPropsWithEmptyValue[name] = true, console.error("Received an empty string for a boolean attribute `%s`. This will treat the attribute as if it were false. Either pass `false` to silence this warning, or pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.", name));
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        value && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeEmptyString);
        break;
      case "capture":
      case "download":
        value === true ? target.push(attributeSeparator, name, attributeEmptyString) : value !== false && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        typeof value !== "function" && typeof value !== "symbol" && !isNaN(value) && 1 <= value && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "rowSpan":
      case "start":
        typeof value === "function" || typeof value === "symbol" || isNaN(value) || target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
        break;
      case "xlinkActuate":
        pushStringAttribute(target, "xlink:actuate", value);
        break;
      case "xlinkArcrole":
        pushStringAttribute(target, "xlink:arcrole", value);
        break;
      case "xlinkRole":
        pushStringAttribute(target, "xlink:role", value);
        break;
      case "xlinkShow":
        pushStringAttribute(target, "xlink:show", value);
        break;
      case "xlinkTitle":
        pushStringAttribute(target, "xlink:title", value);
        break;
      case "xlinkType":
        pushStringAttribute(target, "xlink:type", value);
        break;
      case "xmlBase":
        pushStringAttribute(target, "xml:base", value);
        break;
      case "xmlLang":
        pushStringAttribute(target, "xml:lang", value);
        break;
      case "xmlSpace":
        pushStringAttribute(target, "xml:space", value);
        break;
      default:
        if (!(2 < name.length) || name[0] !== "o" && name[0] !== "O" || name[1] !== "n" && name[1] !== "N") {
          if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
            switch (typeof value) {
              case "function":
              case "symbol":
                return;
              case "boolean":
                var prefix2 = name.toLowerCase().slice(0, 5);
                if (prefix2 !== "data-" && prefix2 !== "aria-")
                  return;
            }
            target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          }
        }
    }
  }
  var endOfStartTag = ">";
  var endOfStartTagSelfClosing = "/>";
  function pushInnerHTML(target, innerHTML, children) {
    if (innerHTML != null) {
      if (children != null)
        throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
      if (typeof innerHTML !== "object" || !("__html" in innerHTML))
        throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");
      innerHTML = innerHTML.__html;
      innerHTML !== null && innerHTML !== undefined && (checkHtmlStringCoercion(innerHTML), target.push("" + innerHTML));
    }
  }
  var didWarnDefaultInputValue = false;
  var didWarnDefaultChecked = false;
  var didWarnDefaultSelectValue = false;
  var didWarnDefaultTextareaValue = false;
  var didWarnInvalidOptionChildren = false;
  var didWarnInvalidOptionInnerHTML = false;
  var didWarnSelectedSetOnOption = false;
  var didWarnFormActionType = false;
  var didWarnFormActionName = false;
  var didWarnFormActionTarget = false;
  var didWarnFormActionMethod = false;
  function checkSelectProp(props, propName) {
    var value = props[propName];
    value != null && (value = isArrayImpl(value), props.multiple && !value ? console.error("The `%s` prop supplied to <select> must be an array if `multiple` is true.", propName) : !props.multiple && value && console.error("The `%s` prop supplied to <select> must be a scalar value if `multiple` is false.", propName));
  }
  function flattenOptionChildren(children) {
    var content = "";
    React.Children.forEach(children, function(child) {
      child != null && (content += child, didWarnInvalidOptionChildren || typeof child === "string" || typeof child === "number" || typeof child === "bigint" || (didWarnInvalidOptionChildren = true, console.error("Cannot infer the option value of complex children. Pass a `value` prop or use a plain string as children to <option>.")));
    });
    return content;
  }
  var formReplayingRuntimeScript = `addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`;
  function injectFormReplayingRuntime(resumableState, renderState) {
    if ((resumableState.instructions & 16) === NothingSent) {
      resumableState.instructions |= 16;
      var { preamble, bootstrapChunks } = renderState;
      (preamble.htmlChunks || preamble.headChunks) && bootstrapChunks.length === 0 ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, formReplayingRuntimeScript, endInlineScript)) : bootstrapChunks.unshift(renderState.startInlineScript, endOfStartTag, formReplayingRuntimeScript, endInlineScript);
    }
  }
  function pushLinkImpl(target, props) {
    target.push(startChunkForTag("link"));
    for (var propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
            case "dangerouslySetInnerHTML":
              throw Error("link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTagSelfClosing);
    return null;
  }
  function escapeStyleTextContent(styleText) {
    checkHtmlStringCoercion(styleText);
    return ("" + styleText).replace(styleRegex, styleReplacer);
  }
  var styleRegex = /(<\/|<)(s)(tyle)/gi;
  function styleReplacer(match, prefix2, s, suffix2) {
    return "" + prefix2 + (s === "s" ? "\\73 " : "\\53 ") + suffix2;
  }
  function pushSelfClosing(target, props, tag) {
    target.push(startChunkForTag(tag));
    for (var propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
            case "dangerouslySetInnerHTML":
              throw Error(tag + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTagSelfClosing);
    return null;
  }
  function pushTitleImpl(target, props) {
    target.push(startChunkForTag("title"));
    var children = null, innerHTML = null, propKey;
    for (propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
              children = propValue;
              break;
            case "dangerouslySetInnerHTML":
              innerHTML = propValue;
              break;
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTag);
    props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
    typeof props !== "function" && typeof props !== "symbol" && props !== null && props !== undefined && target.push(escapeTextForBrowser("" + props));
    pushInnerHTML(target, innerHTML, children);
    target.push(endChunkForTag("title"));
    return null;
  }
  function pushScriptImpl(target, props) {
    target.push(startChunkForTag("script"));
    var children = null, innerHTML = null, propKey;
    for (propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
              children = propValue;
              break;
            case "dangerouslySetInnerHTML":
              innerHTML = propValue;
              break;
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTag);
    children != null && typeof children !== "string" && (props = typeof children === "number" ? "a number for children" : Array.isArray(children) ? "an array for children" : "something unexpected for children", console.error("A script element was rendered with %s. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.", props));
    pushInnerHTML(target, innerHTML, children);
    typeof children === "string" && target.push(escapeEntireInlineScriptContent(children));
    target.push(endChunkForTag("script"));
    return null;
  }
  function pushStartSingletonElement(target, props, tag) {
    target.push(startChunkForTag(tag));
    var innerHTML = tag = null, propKey;
    for (propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
              tag = propValue;
              break;
            case "dangerouslySetInnerHTML":
              innerHTML = propValue;
              break;
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTag);
    pushInnerHTML(target, innerHTML, tag);
    return tag;
  }
  function pushStartGenericElement(target, props, tag) {
    target.push(startChunkForTag(tag));
    var innerHTML = tag = null, propKey;
    for (propKey in props)
      if (hasOwnProperty.call(props, propKey)) {
        var propValue = props[propKey];
        if (propValue != null)
          switch (propKey) {
            case "children":
              tag = propValue;
              break;
            case "dangerouslySetInnerHTML":
              innerHTML = propValue;
              break;
            default:
              pushAttribute(target, propKey, propValue);
          }
      }
    target.push(endOfStartTag);
    pushInnerHTML(target, innerHTML, tag);
    return typeof tag === "string" ? (target.push(escapeTextForBrowser(tag)), null) : tag;
  }
  var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
  var validatedTagCache = new Map;
  function startChunkForTag(tag) {
    var tagStartChunk = validatedTagCache.get(tag);
    if (tagStartChunk === undefined) {
      if (!VALID_TAG_REGEX.test(tag))
        throw Error("Invalid tag: " + tag);
      tagStartChunk = "<" + tag;
      validatedTagCache.set(tag, tagStartChunk);
    }
    return tagStartChunk;
  }
  function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
    validateProperties$2(type, props);
    type !== "input" && type !== "textarea" && type !== "select" || props == null || props.value !== null || didWarnValueNull || (didWarnValueNull = true, type === "select" && props.multiple ? console.error("`value` prop on `%s` should not be null. Consider using an empty array when `multiple` is set to `true` to clear the component or `undefined` for uncontrolled components.", type) : console.error("`value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.", type));
    b:
      if (type.indexOf("-") === -1)
        var JSCompiler_inline_result = false;
      else
        switch (type) {
          case "annotation-xml":
          case "color-profile":
          case "font-face":
          case "font-face-src":
          case "font-face-uri":
          case "font-face-format":
          case "font-face-name":
          case "missing-glyph":
            JSCompiler_inline_result = false;
            break b;
          default:
            JSCompiler_inline_result = true;
        }
    JSCompiler_inline_result || typeof props.is === "string" || warnUnknownProperties(type, props, null);
    !props.suppressContentEditableWarning && props.contentEditable && props.children != null && console.error("A component is `contentEditable` and contains `children` managed by React. It is now your responsibility to guarantee that none of those nodes are unexpectedly modified or duplicated. This is probably not intentional.");
    formatContext.insertionMode !== SVG_MODE && formatContext.insertionMode !== MATHML_MODE && type.indexOf("-") === -1 && type.toLowerCase() !== type && console.error("<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.", type);
    switch (type) {
      case "div":
      case "span":
      case "svg":
      case "path":
        break;
      case "a":
        target$jscomp$0.push(startChunkForTag("a"));
        var children = null, innerHTML = null, propKey;
        for (propKey in props)
          if (hasOwnProperty.call(props, propKey)) {
            var propValue = props[propKey];
            if (propValue != null)
              switch (propKey) {
                case "children":
                  children = propValue;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML = propValue;
                  break;
                case "href":
                  propValue === "" ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey, propValue);
              }
          }
        target$jscomp$0.push(endOfStartTag);
        pushInnerHTML(target$jscomp$0, innerHTML, children);
        if (typeof children === "string") {
          target$jscomp$0.push(escapeTextForBrowser(children));
          var JSCompiler_inline_result$jscomp$0 = null;
        } else
          JSCompiler_inline_result$jscomp$0 = children;
        return JSCompiler_inline_result$jscomp$0;
      case "g":
      case "p":
      case "li":
        break;
      case "select":
        checkControlledValueProps("select", props);
        checkSelectProp(props, "value");
        checkSelectProp(props, "defaultValue");
        props.value === undefined || props.defaultValue === undefined || didWarnDefaultSelectValue || (console.error("Select elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled select element and remove one of these props. More info: https://react.dev/link/controlled-components"), didWarnDefaultSelectValue = true);
        target$jscomp$0.push(startChunkForTag("select"));
        var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
        for (propKey$jscomp$0 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$0)) {
            var propValue$jscomp$0 = props[propKey$jscomp$0];
            if (propValue$jscomp$0 != null)
              switch (propKey$jscomp$0) {
                case "children":
                  children$jscomp$0 = propValue$jscomp$0;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$0 = propValue$jscomp$0;
                  break;
                case "defaultValue":
                case "value":
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$0, propValue$jscomp$0);
              }
          }
        target$jscomp$0.push(endOfStartTag);
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
        return children$jscomp$0;
      case "option":
        var selectedValue = formatContext.selectedValue;
        target$jscomp$0.push(startChunkForTag("option"));
        var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
        for (propKey$jscomp$1 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$1)) {
            var propValue$jscomp$1 = props[propKey$jscomp$1];
            if (propValue$jscomp$1 != null)
              switch (propKey$jscomp$1) {
                case "children":
                  children$jscomp$1 = propValue$jscomp$1;
                  break;
                case "selected":
                  selected = propValue$jscomp$1;
                  didWarnSelectedSetOnOption || (console.error("Use the `defaultValue` or `value` props on <select> instead of setting `selected` on <option>."), didWarnSelectedSetOnOption = true);
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$1 = propValue$jscomp$1;
                  break;
                case "value":
                  value = propValue$jscomp$1;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$1, propValue$jscomp$1);
              }
          }
        if (selectedValue != null) {
          if (value !== null) {
            checkAttributeStringCoercion(value, "value");
            var stringValue = "" + value;
          } else
            innerHTML$jscomp$1 === null || didWarnInvalidOptionInnerHTML || (didWarnInvalidOptionInnerHTML = true, console.error("Pass a `value` prop if you set dangerouslyInnerHTML so React knows which value should be selected.")), stringValue = flattenOptionChildren(children$jscomp$1);
          if (isArrayImpl(selectedValue))
            for (var i = 0;i < selectedValue.length; i++) {
              if (checkAttributeStringCoercion(selectedValue[i], "value"), "" + selectedValue[i] === stringValue) {
                target$jscomp$0.push(' selected=""');
                break;
              }
            }
          else
            checkAttributeStringCoercion(selectedValue, "select.value"), "" + selectedValue === stringValue && target$jscomp$0.push(' selected=""');
        } else
          selected && target$jscomp$0.push(' selected=""');
        target$jscomp$0.push(endOfStartTag);
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
        return children$jscomp$1;
      case "textarea":
        checkControlledValueProps("textarea", props);
        props.value === undefined || props.defaultValue === undefined || didWarnDefaultTextareaValue || (console.error("Textarea elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled textarea and remove one of these props. More info: https://react.dev/link/controlled-components"), didWarnDefaultTextareaValue = true);
        target$jscomp$0.push(startChunkForTag("textarea"));
        var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
        for (propKey$jscomp$2 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$2)) {
            var propValue$jscomp$2 = props[propKey$jscomp$2];
            if (propValue$jscomp$2 != null)
              switch (propKey$jscomp$2) {
                case "children":
                  children$jscomp$2 = propValue$jscomp$2;
                  break;
                case "value":
                  value$jscomp$0 = propValue$jscomp$2;
                  break;
                case "defaultValue":
                  defaultValue = propValue$jscomp$2;
                  break;
                case "dangerouslySetInnerHTML":
                  throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$2, propValue$jscomp$2);
              }
          }
        value$jscomp$0 === null && defaultValue !== null && (value$jscomp$0 = defaultValue);
        target$jscomp$0.push(endOfStartTag);
        if (children$jscomp$2 != null) {
          console.error("Use the `defaultValue` or `value` props instead of setting children on <textarea>.");
          if (value$jscomp$0 != null)
            throw Error("If you supply `defaultValue` on a <textarea>, do not pass children.");
          if (isArrayImpl(children$jscomp$2)) {
            if (1 < children$jscomp$2.length)
              throw Error("<textarea> can only have at most one child.");
            checkHtmlStringCoercion(children$jscomp$2[0]);
            value$jscomp$0 = "" + children$jscomp$2[0];
          }
          checkHtmlStringCoercion(children$jscomp$2);
          value$jscomp$0 = "" + children$jscomp$2;
        }
        typeof value$jscomp$0 === "string" && value$jscomp$0[0] === `
` && target$jscomp$0.push(`
`);
        value$jscomp$0 !== null && (checkAttributeStringCoercion(value$jscomp$0, "value"), target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0)));
        return null;
      case "input":
        checkControlledValueProps("input", props);
        target$jscomp$0.push(startChunkForTag("input"));
        var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
        for (propKey$jscomp$3 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$3)) {
            var propValue$jscomp$3 = props[propKey$jscomp$3];
            if (propValue$jscomp$3 != null)
              switch (propKey$jscomp$3) {
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error("input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
                case "name":
                  name = propValue$jscomp$3;
                  break;
                case "formAction":
                  formAction = propValue$jscomp$3;
                  break;
                case "formEncType":
                  formEncType = propValue$jscomp$3;
                  break;
                case "formMethod":
                  formMethod = propValue$jscomp$3;
                  break;
                case "formTarget":
                  formTarget = propValue$jscomp$3;
                  break;
                case "defaultChecked":
                  defaultChecked = propValue$jscomp$3;
                  break;
                case "defaultValue":
                  defaultValue$jscomp$0 = propValue$jscomp$3;
                  break;
                case "checked":
                  checked = propValue$jscomp$3;
                  break;
                case "value":
                  value$jscomp$1 = propValue$jscomp$3;
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$3, propValue$jscomp$3);
              }
          }
        formAction === null || props.type === "image" || props.type === "submit" || didWarnFormActionType || (didWarnFormActionType = true, console.error('An input can only specify a formAction along with type="submit" or type="image".'));
        var formData = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);
        checked === null || defaultChecked === null || didWarnDefaultChecked || (console.error("%s contains an input of type %s with both checked and defaultChecked props. Input elements must be either controlled or uncontrolled (specify either the checked prop, or the defaultChecked prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components", "A component", props.type), didWarnDefaultChecked = true);
        value$jscomp$1 === null || defaultValue$jscomp$0 === null || didWarnDefaultInputValue || (console.error("%s contains an input of type %s with both value and defaultValue props. Input elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components", "A component", props.type), didWarnDefaultInputValue = true);
        checked !== null ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : defaultChecked !== null && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
        value$jscomp$1 !== null ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : defaultValue$jscomp$0 !== null && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
        target$jscomp$0.push(endOfStartTagSelfClosing);
        formData != null && formData.forEach(pushAdditionalFormField, target$jscomp$0);
        return null;
      case "button":
        target$jscomp$0.push(startChunkForTag("button"));
        var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
        for (propKey$jscomp$4 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$4)) {
            var propValue$jscomp$4 = props[propKey$jscomp$4];
            if (propValue$jscomp$4 != null)
              switch (propKey$jscomp$4) {
                case "children":
                  children$jscomp$3 = propValue$jscomp$4;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$2 = propValue$jscomp$4;
                  break;
                case "name":
                  name$jscomp$0 = propValue$jscomp$4;
                  break;
                case "formAction":
                  formAction$jscomp$0 = propValue$jscomp$4;
                  break;
                case "formEncType":
                  formEncType$jscomp$0 = propValue$jscomp$4;
                  break;
                case "formMethod":
                  formMethod$jscomp$0 = propValue$jscomp$4;
                  break;
                case "formTarget":
                  formTarget$jscomp$0 = propValue$jscomp$4;
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$4, propValue$jscomp$4);
              }
          }
        formAction$jscomp$0 === null || props.type == null || props.type === "submit" || didWarnFormActionType || (didWarnFormActionType = true, console.error('A button can only specify a formAction along with type="submit" or no type.'));
        var formData$jscomp$0 = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction$jscomp$0, formEncType$jscomp$0, formMethod$jscomp$0, formTarget$jscomp$0, name$jscomp$0);
        target$jscomp$0.push(endOfStartTag);
        formData$jscomp$0 != null && formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
        if (typeof children$jscomp$3 === "string") {
          target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
          var JSCompiler_inline_result$jscomp$1 = null;
        } else
          JSCompiler_inline_result$jscomp$1 = children$jscomp$3;
        return JSCompiler_inline_result$jscomp$1;
      case "form":
        target$jscomp$0.push(startChunkForTag("form"));
        var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
        for (propKey$jscomp$5 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$5)) {
            var propValue$jscomp$5 = props[propKey$jscomp$5];
            if (propValue$jscomp$5 != null)
              switch (propKey$jscomp$5) {
                case "children":
                  children$jscomp$4 = propValue$jscomp$5;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$3 = propValue$jscomp$5;
                  break;
                case "action":
                  formAction$jscomp$1 = propValue$jscomp$5;
                  break;
                case "encType":
                  formEncType$jscomp$1 = propValue$jscomp$5;
                  break;
                case "method":
                  formMethod$jscomp$1 = propValue$jscomp$5;
                  break;
                case "target":
                  formTarget$jscomp$1 = propValue$jscomp$5;
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$5, propValue$jscomp$5);
              }
          }
        var formData$jscomp$1 = null, formActionName = null;
        if (typeof formAction$jscomp$1 === "function") {
          formEncType$jscomp$1 === null && formMethod$jscomp$1 === null || didWarnFormActionMethod || (didWarnFormActionMethod = true, console.error("Cannot specify a encType or method for a form that specifies a function as the action. React provides those automatically. They will get overridden."));
          formTarget$jscomp$1 === null || didWarnFormActionTarget || (didWarnFormActionTarget = true, console.error("Cannot specify a target for a form that specifies a function as the action. The function will always be executed in the same window."));
          var customFields = getCustomFormFields(resumableState, formAction$jscomp$1);
          customFields !== null ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(attributeSeparator, "action", attributeAssign, actionJavaScriptURL, attributeEnd), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
        }
        formAction$jscomp$1 != null && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
        formEncType$jscomp$1 != null && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
        formMethod$jscomp$1 != null && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
        formTarget$jscomp$1 != null && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
        target$jscomp$0.push(endOfStartTag);
        formActionName !== null && (target$jscomp$0.push('<input type="hidden"'), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push(endOfStartTagSelfClosing), formData$jscomp$1 != null && formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
        if (typeof children$jscomp$4 === "string") {
          target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
          var JSCompiler_inline_result$jscomp$2 = null;
        } else
          JSCompiler_inline_result$jscomp$2 = children$jscomp$4;
        return JSCompiler_inline_result$jscomp$2;
      case "menuitem":
        target$jscomp$0.push(startChunkForTag("menuitem"));
        for (var propKey$jscomp$6 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$6)) {
            var propValue$jscomp$6 = props[propKey$jscomp$6];
            if (propValue$jscomp$6 != null)
              switch (propKey$jscomp$6) {
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error("menuitems cannot have `children` nor `dangerouslySetInnerHTML`.");
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$6, propValue$jscomp$6);
              }
          }
        target$jscomp$0.push(endOfStartTag);
        return null;
      case "object":
        target$jscomp$0.push(startChunkForTag("object"));
        var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
        for (propKey$jscomp$7 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$7)) {
            var propValue$jscomp$7 = props[propKey$jscomp$7];
            if (propValue$jscomp$7 != null)
              switch (propKey$jscomp$7) {
                case "children":
                  children$jscomp$5 = propValue$jscomp$7;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$4 = propValue$jscomp$7;
                  break;
                case "data":
                  checkAttributeStringCoercion(propValue$jscomp$7, "data");
                  var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                  if (sanitizedValue === "") {
                    console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', propKey$jscomp$7, propKey$jscomp$7);
                    break;
                  }
                  target$jscomp$0.push(attributeSeparator, "data", attributeAssign, escapeTextForBrowser(sanitizedValue), attributeEnd);
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$7, propValue$jscomp$7);
              }
          }
        target$jscomp$0.push(endOfStartTag);
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
        if (typeof children$jscomp$5 === "string") {
          target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
          var JSCompiler_inline_result$jscomp$3 = null;
        } else
          JSCompiler_inline_result$jscomp$3 = children$jscomp$5;
        return JSCompiler_inline_result$jscomp$3;
      case "title":
        var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
        if (hasOwnProperty.call(props, "children")) {
          var children$jscomp$6 = props.children, child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
          Array.isArray(children$jscomp$6) && 1 < children$jscomp$6.length ? console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes. For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.", children$jscomp$6.length) : typeof child === "function" || typeof child === "symbol" ? console.error("React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value.", typeof child === "function" ? "a Function" : "a Sybmol") : child && child.toString === {}.toString && (child.$$typeof != null ? console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.") : console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title> is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>."));
        }
        if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null)
          var JSCompiler_inline_result$jscomp$4 = pushTitleImpl(target$jscomp$0, props);
        else
          isFallback ? JSCompiler_inline_result$jscomp$4 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$4 = undefined);
        return JSCompiler_inline_result$jscomp$4;
      case "link":
        var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
        if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$0 || props.itemProp != null || typeof rel !== "string" || typeof href !== "string" || href === "") {
          rel === "stylesheet" && typeof props.precedence === "string" && (typeof href === "string" && href || console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and expected the `href` prop to be a non-empty string but ecountered %s instead. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop ensure there is a non-empty string `href` prop as well, otherwise remove the `precedence` prop.', href === null ? "`null`" : href === undefined ? "`undefined`" : href === "" ? "an empty string" : 'something with type "' + typeof href + '"'));
          pushLinkImpl(target$jscomp$0, props);
          var JSCompiler_inline_result$jscomp$5 = null;
        } else if (props.rel === "stylesheet")
          if (typeof precedence !== "string" || props.disabled != null || props.onLoad || props.onError) {
            if (typeof precedence === "string") {
              if (props.disabled != null)
                console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the `disabled` prop, otherwise remove the `precedence` prop.');
              else if (props.onLoad || props.onError) {
                var propDescription = props.onLoad && props.onError ? "`onLoad` and `onError` props" : props.onLoad ? "`onLoad` prop" : "`onError` prop";
                console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.', propDescription, propDescription);
              }
            }
            JSCompiler_inline_result$jscomp$5 = pushLinkImpl(target$jscomp$0, props);
          } else {
            var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : undefined;
            if (resourceState !== EXISTS) {
              resumableState.styleResources[href] = EXISTS;
              styleQueue || (styleQueue = {
                precedence: escapeTextForBrowser(precedence),
                rules: [],
                hrefs: [],
                sheets: new Map
              }, renderState.styles.set(precedence, styleQueue));
              var resource = {
                state: PENDING$1,
                props: assign({}, props, {
                  "data-precedence": props.precedence,
                  precedence: null
                })
              };
              if (resourceState) {
                resourceState.length === 2 && adoptPreloadCredentials(resource.props, resourceState);
                var preloadResource = renderState.preloads.stylesheets.get(href);
                preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = PRELOADED;
              }
              styleQueue.sheets.set(href, resource);
              hoistableState && hoistableState.stylesheets.add(resource);
            } else if (styleQueue) {
              var _resource = styleQueue.sheets.get(href);
              _resource && hoistableState && hoistableState.stylesheets.add(_resource);
            }
            textEmbedded && target$jscomp$0.push("<!-- -->");
            JSCompiler_inline_result$jscomp$5 = null;
          }
        else
          props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$5 = pushLinkImpl(target$jscomp$0, props) : (textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$5 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
        return JSCompiler_inline_result$jscomp$5;
      case "script":
        var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
        if (typeof props.src !== "string" || !props.src || !asyncProp || typeof asyncProp === "function" || typeof asyncProp === "symbol" || props.onLoad || props.onError || formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$1 || props.itemProp != null)
          var JSCompiler_inline_result$jscomp$6 = pushScriptImpl(target$jscomp$0, props);
        else {
          var key = props.src;
          if (props.type === "module") {
            var resources = resumableState.moduleScriptResources;
            var preloads = renderState.preloads.moduleScripts;
          } else
            resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
          var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : undefined;
          if (resourceState$jscomp$0 !== EXISTS) {
            resources[key] = EXISTS;
            var scriptProps = props;
            if (resourceState$jscomp$0) {
              resourceState$jscomp$0.length === 2 && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
              var preloadResource$jscomp$0 = preloads.get(key);
              preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
            }
            var resource$jscomp$0 = [];
            renderState.scripts.add(resource$jscomp$0);
            pushScriptImpl(resource$jscomp$0, scriptProps);
          }
          textEmbedded && target$jscomp$0.push("<!-- -->");
          JSCompiler_inline_result$jscomp$6 = null;
        }
        return JSCompiler_inline_result$jscomp$6;
      case "style":
        var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1;
        if (hasOwnProperty.call(props, "children")) {
          var children$jscomp$7 = props.children, child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
          (typeof child$jscomp$0 === "function" || typeof child$jscomp$0 === "symbol" || Array.isArray(child$jscomp$0)) && console.error("React expect children of <style> tags to be a string, number, or object with a `toString` method but found %s instead. In browsers style Elements can only have `Text` Nodes as children.", typeof child$jscomp$0 === "function" ? "a Function" : typeof child$jscomp$0 === "symbol" ? "a Sybmol" : "an Array");
        }
        var { precedence: precedence$jscomp$0, href: href$jscomp$0, nonce } = props;
        if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$2 || props.itemProp != null || typeof precedence$jscomp$0 !== "string" || typeof href$jscomp$0 !== "string" || href$jscomp$0 === "") {
          target$jscomp$0.push(startChunkForTag("style"));
          var children$jscomp$8 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
          for (propKey$jscomp$8 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$8)) {
              var propValue$jscomp$8 = props[propKey$jscomp$8];
              if (propValue$jscomp$8 != null)
                switch (propKey$jscomp$8) {
                  case "children":
                    children$jscomp$8 = propValue$jscomp$8;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$5 = propValue$jscomp$8;
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$8, propValue$jscomp$8);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          var child$jscomp$1 = Array.isArray(children$jscomp$8) ? 2 > children$jscomp$8.length ? children$jscomp$8[0] : null : children$jscomp$8;
          typeof child$jscomp$1 !== "function" && typeof child$jscomp$1 !== "symbol" && child$jscomp$1 !== null && child$jscomp$1 !== undefined && target$jscomp$0.push(escapeStyleTextContent(child$jscomp$1));
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$8);
          target$jscomp$0.push(endChunkForTag("style"));
          var JSCompiler_inline_result$jscomp$7 = null;
        } else {
          href$jscomp$0.includes(" ") && console.error('React expected the `href` prop for a <style> tag opting into hoisting semantics using the `precedence` prop to not have any spaces but ecountered spaces instead. using spaces in this prop will cause hydration of this style to fail on the client. The href for the <style> where this ocurred is "%s".', href$jscomp$0);
          var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0), resourceState$jscomp$1 = resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : undefined;
          if (resourceState$jscomp$1 !== EXISTS) {
            resumableState.styleResources[href$jscomp$0] = EXISTS;
            resourceState$jscomp$1 && console.error('React encountered a hoistable style tag for the same href as a preload: "%s". When using a style tag to inline styles you should not also preload it as a stylsheet.', href$jscomp$0);
            styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
              precedence: escapeTextForBrowser(precedence$jscomp$0),
              rules: [],
              hrefs: [],
              sheets: new Map
            }, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
            var nonceStyle = renderState.nonce.style;
            if (nonceStyle && nonceStyle !== nonce)
              console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "%s" that was included with this render.', precedence$jscomp$0, nonce, nonceStyle);
            else {
              !nonceStyle && nonce && console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.', precedence$jscomp$0, nonce);
              styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
              var target = styleQueue$jscomp$0.rules, children$jscomp$9 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
              for (propKey$jscomp$9 in props)
                if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                  var propValue$jscomp$9 = props[propKey$jscomp$9];
                  if (propValue$jscomp$9 != null)
                    switch (propKey$jscomp$9) {
                      case "children":
                        children$jscomp$9 = propValue$jscomp$9;
                        break;
                      case "dangerouslySetInnerHTML":
                        innerHTML$jscomp$6 = propValue$jscomp$9;
                    }
                }
              var child$jscomp$2 = Array.isArray(children$jscomp$9) ? 2 > children$jscomp$9.length ? children$jscomp$9[0] : null : children$jscomp$9;
              typeof child$jscomp$2 !== "function" && typeof child$jscomp$2 !== "symbol" && child$jscomp$2 !== null && child$jscomp$2 !== undefined && target.push(escapeStyleTextContent(child$jscomp$2));
              pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$9);
            }
          }
          styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
          textEmbedded && target$jscomp$0.push("<!-- -->");
          JSCompiler_inline_result$jscomp$7 = undefined;
        }
        return JSCompiler_inline_result$jscomp$7;
      case "meta":
        var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
        if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$3 || props.itemProp != null)
          var JSCompiler_inline_result$jscomp$8 = pushSelfClosing(target$jscomp$0, props, "meta");
        else
          textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$8 = isFallback$jscomp$1 ? null : typeof props.charSet === "string" ? pushSelfClosing(renderState.charsetChunks, props, "meta") : props.name === "viewport" ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
        return JSCompiler_inline_result$jscomp$8;
      case "listing":
      case "pre":
        target$jscomp$0.push(startChunkForTag(type));
        var children$jscomp$10 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
        for (propKey$jscomp$10 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$10)) {
            var propValue$jscomp$10 = props[propKey$jscomp$10];
            if (propValue$jscomp$10 != null)
              switch (propKey$jscomp$10) {
                case "children":
                  children$jscomp$10 = propValue$jscomp$10;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$7 = propValue$jscomp$10;
                  break;
                default:
                  pushAttribute(target$jscomp$0, propKey$jscomp$10, propValue$jscomp$10);
              }
          }
        target$jscomp$0.push(endOfStartTag);
        if (innerHTML$jscomp$7 != null) {
          if (children$jscomp$10 != null)
            throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
          if (typeof innerHTML$jscomp$7 !== "object" || !("__html" in innerHTML$jscomp$7))
            throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");
          var html = innerHTML$jscomp$7.__html;
          html !== null && html !== undefined && (typeof html === "string" && 0 < html.length && html[0] === `
` ? target$jscomp$0.push(`
`, html) : (checkHtmlStringCoercion(html), target$jscomp$0.push("" + html)));
        }
        typeof children$jscomp$10 === "string" && children$jscomp$10[0] === `
` && target$jscomp$0.push(`
`);
        return children$jscomp$10;
      case "img":
        var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
        if (!(props.loading === "lazy" || !src && !srcSet || typeof src !== "string" && src != null || typeof srcSet !== "string" && srcSet != null || props.fetchPriority === "low" || pictureOrNoScriptTagInScope) && (typeof src !== "string" || src[4] !== ":" || src[0] !== "d" && src[0] !== "D" || src[1] !== "a" && src[1] !== "A" || src[2] !== "t" && src[2] !== "T" || src[3] !== "a" && src[3] !== "A") && (typeof srcSet !== "string" || srcSet[4] !== ":" || srcSet[0] !== "d" && srcSet[0] !== "D" || srcSet[1] !== "a" && srcSet[1] !== "A" || srcSet[2] !== "t" && srcSet[2] !== "T" || srcSet[3] !== "a" && srcSet[3] !== "A")) {
          hoistableState !== null && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = true);
          var sizes = typeof props.sizes === "string" ? props.sizes : undefined, key$jscomp$0 = srcSet ? srcSet + `
` + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
          if (resource$jscomp$1) {
            if (props.fetchPriority === "high" || 10 > renderState.highImagePreloads.size)
              promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
          } else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
            resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
            var input = props.crossOrigin;
            var crossOrigin = typeof input === "string" ? input === "use-credentials" ? input : "" : undefined;
            var headers = renderState.headers, header;
            headers && 0 < headers.remainingCapacity && typeof props.srcSet !== "string" && (props.fetchPriority === "high" || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
              imageSrcSet: props.srcSet,
              imageSizes: props.sizes,
              crossOrigin,
              integrity: props.integrity,
              nonce: props.nonce,
              type: props.type,
              fetchPriority: props.fetchPriority,
              referrerPolicy: props.refererPolicy
            }), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
              rel: "preload",
              as: "image",
              href: srcSet ? undefined : src,
              imageSrcSet: srcSet,
              imageSizes: sizes,
              crossOrigin,
              integrity: props.integrity,
              type: props.type,
              fetchPriority: props.fetchPriority,
              referrerPolicy: props.referrerPolicy
            }), props.fetchPriority === "high" || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
          }
        }
        return pushSelfClosing(target$jscomp$0, props, "img");
      case "base":
      case "area":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "param":
      case "source":
      case "track":
      case "wbr":
        return pushSelfClosing(target$jscomp$0, props, type);
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        break;
      case "head":
        if (formatContext.insertionMode < HTML_MODE) {
          var preamble = preambleState || renderState.preamble;
          if (preamble.headChunks)
            throw Error("The `<head>` tag may only be rendered once.");
          preambleState !== null && target$jscomp$0.push("<!--head-->");
          preamble.headChunks = [];
          var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(preamble.headChunks, props, "head");
        } else
          JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(target$jscomp$0, props, "head");
        return JSCompiler_inline_result$jscomp$9;
      case "body":
        if (formatContext.insertionMode < HTML_MODE) {
          var preamble$jscomp$0 = preambleState || renderState.preamble;
          if (preamble$jscomp$0.bodyChunks)
            throw Error("The `<body>` tag may only be rendered once.");
          preambleState !== null && target$jscomp$0.push("<!--body-->");
          preamble$jscomp$0.bodyChunks = [];
          var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(preamble$jscomp$0.bodyChunks, props, "body");
        } else
          JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(target$jscomp$0, props, "body");
        return JSCompiler_inline_result$jscomp$10;
      case "html":
        if (formatContext.insertionMode === ROOT_HTML_MODE) {
          var preamble$jscomp$1 = preambleState || renderState.preamble;
          if (preamble$jscomp$1.htmlChunks)
            throw Error("The `<html>` tag may only be rendered once.");
          preambleState !== null && target$jscomp$0.push("<!--html-->");
          preamble$jscomp$1.htmlChunks = ["<!DOCTYPE html>"];
          var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(preamble$jscomp$1.htmlChunks, props, "html");
        } else
          JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(target$jscomp$0, props, "html");
        return JSCompiler_inline_result$jscomp$11;
      default:
        if (type.indexOf("-") !== -1) {
          target$jscomp$0.push(startChunkForTag(type));
          var children$jscomp$11 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
          for (propKey$jscomp$11 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$11)) {
              var propValue$jscomp$11 = props[propKey$jscomp$11];
              if (propValue$jscomp$11 != null) {
                var attributeName = propKey$jscomp$11;
                switch (propKey$jscomp$11) {
                  case "children":
                    children$jscomp$11 = propValue$jscomp$11;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$8 = propValue$jscomp$11;
                    break;
                  case "style":
                    pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                    break;
                  case "suppressContentEditableWarning":
                  case "suppressHydrationWarning":
                  case "ref":
                    break;
                  case "className":
                    attributeName = "class";
                  default:
                    if (isAttributeNameSafe(propKey$jscomp$11) && typeof propValue$jscomp$11 !== "function" && typeof propValue$jscomp$11 !== "symbol" && propValue$jscomp$11 !== false) {
                      if (propValue$jscomp$11 === true)
                        propValue$jscomp$11 = "";
                      else if (typeof propValue$jscomp$11 === "object")
                        continue;
                      target$jscomp$0.push(attributeSeparator, attributeName, attributeAssign, escapeTextForBrowser(propValue$jscomp$11), attributeEnd);
                    }
                }
              }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$11);
          return children$jscomp$11;
        }
    }
    return pushStartGenericElement(target$jscomp$0, props, type);
  }
  var endTagCache = new Map;
  function endChunkForTag(tag) {
    var chunk = endTagCache.get(tag);
    chunk === undefined && (chunk = "</" + tag + ">", endTagCache.set(tag, chunk));
    return chunk;
  }
  function hoistPreambleState(renderState, preambleState) {
    renderState = renderState.preamble;
    renderState.htmlChunks === null && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
    renderState.headChunks === null && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
    renderState.bodyChunks === null && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
  }
  function writeBootstrap(destination, renderState) {
    renderState = renderState.bootstrapChunks;
    for (var i = 0;i < renderState.length - 1; i++)
      writeChunk(destination, renderState[i]);
    return i < renderState.length ? (i = renderState[i], renderState.length = 0, !!destination.write(i)) : true;
  }
  var shellTimeRuntimeScript = "requestAnimationFrame(function(){$RT=performance.now()});";
  var placeholder1 = '<template id="';
  var placeholder2 = '"></template>';
  var startCompletedSuspenseBoundary = "<!--$-->";
  var startPendingSuspenseBoundary1 = '<!--$?--><template id="';
  var startPendingSuspenseBoundary2 = '"></template>';
  var startClientRenderedSuspenseBoundary = "<!--$!-->";
  var endSuspenseBoundary = "<!--/$-->";
  var clientRenderedSuspenseBoundaryError1 = "<template";
  var clientRenderedSuspenseBoundaryErrorAttrInterstitial = '"';
  var clientRenderedSuspenseBoundaryError1A = ' data-dgst="';
  var clientRenderedSuspenseBoundaryError1B = ' data-msg="';
  var clientRenderedSuspenseBoundaryError1C = ' data-stck="';
  var clientRenderedSuspenseBoundaryError1D = ' data-cstck="';
  var clientRenderedSuspenseBoundaryError2 = "></template>";
  function writeStartPendingSuspenseBoundary(destination, renderState, id) {
    writeChunk(destination, startPendingSuspenseBoundary1);
    if (id === null)
      throw Error("An ID must have been assigned before we can complete the boundary.");
    writeChunk(destination, renderState.boundaryPrefix);
    writeChunk(destination, id.toString(16));
    return !!destination.write(startPendingSuspenseBoundary2);
  }
  var startSegmentHTML = '<div hidden id="';
  var startSegmentHTML2 = '">';
  var endSegmentHTML = "</div>";
  var startSegmentSVG = '<svg aria-hidden="true" style="display:none" id="';
  var startSegmentSVG2 = '">';
  var endSegmentSVG = "</svg>";
  var startSegmentMathML = '<math aria-hidden="true" style="display:none" id="';
  var startSegmentMathML2 = '">';
  var endSegmentMathML = "</math>";
  var startSegmentTable = '<table hidden id="';
  var startSegmentTable2 = '">';
  var endSegmentTable = "</table>";
  var startSegmentTableBody = '<table hidden><tbody id="';
  var startSegmentTableBody2 = '">';
  var endSegmentTableBody = "</tbody></table>";
  var startSegmentTableRow = '<table hidden><tr id="';
  var startSegmentTableRow2 = '">';
  var endSegmentTableRow = "</tr></table>";
  var startSegmentColGroup = '<table hidden><colgroup id="';
  var startSegmentColGroup2 = '">';
  var endSegmentColGroup = "</colgroup></table>";
  function writeStartSegment(destination, renderState, formatContext, id) {
    switch (formatContext.insertionMode) {
      case ROOT_HTML_MODE:
      case HTML_HTML_MODE:
      case HTML_HEAD_MODE:
      case HTML_MODE:
        return writeChunk(destination, startSegmentHTML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentHTML2);
      case SVG_MODE:
        return writeChunk(destination, startSegmentSVG), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentSVG2);
      case MATHML_MODE:
        return writeChunk(destination, startSegmentMathML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentMathML2);
      case HTML_TABLE_MODE:
        return writeChunk(destination, startSegmentTable), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentTable2);
      case HTML_TABLE_BODY_MODE:
        return writeChunk(destination, startSegmentTableBody), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentTableBody2);
      case HTML_TABLE_ROW_MODE:
        return writeChunk(destination, startSegmentTableRow), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentTableRow2);
      case HTML_COLGROUP_MODE:
        return writeChunk(destination, startSegmentColGroup), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), !!destination.write(startSegmentColGroup2);
      default:
        throw Error("Unknown insertion mode. This is a bug in React.");
    }
  }
  function writeEndSegment(destination, formatContext) {
    switch (formatContext.insertionMode) {
      case ROOT_HTML_MODE:
      case HTML_HTML_MODE:
      case HTML_HEAD_MODE:
      case HTML_MODE:
        return !!destination.write(endSegmentHTML);
      case SVG_MODE:
        return !!destination.write(endSegmentSVG);
      case MATHML_MODE:
        return !!destination.write(endSegmentMathML);
      case HTML_TABLE_MODE:
        return !!destination.write(endSegmentTable);
      case HTML_TABLE_BODY_MODE:
        return !!destination.write(endSegmentTableBody);
      case HTML_TABLE_ROW_MODE:
        return !!destination.write(endSegmentTableRow);
      case HTML_COLGROUP_MODE:
        return !!destination.write(endSegmentColGroup);
      default:
        throw Error("Unknown insertion mode. This is a bug in React.");
    }
  }
  var completeSegmentScript1Full = '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("';
  var completeSegmentScript1Partial = '$RS("';
  var completeSegmentScript2 = '","';
  var completeSegmentScriptEnd = '")</script>';
  var completeBoundaryScriptFunctionOnly = `$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};`;
  var completeBoundaryScript1Partial = '$RC("';
  var completeBoundaryWithStylesScript1FullPartial = `$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=
"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=
"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("`;
  var completeBoundaryWithStylesScript1Partial = '$RR("';
  var completeBoundaryScript2 = '","';
  var completeBoundaryScript3a = '",';
  var completeBoundaryScript3b = '"';
  var completeBoundaryScriptEnd = ")</script>";
  var clientRenderScriptFunctionOnly = '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};';
  var clientRenderScript1Full = '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("';
  var clientRenderScript1Partial = '$RX("';
  var clientRenderScript1A = '"';
  var clientRenderErrorScriptArgInterstitial = ",";
  var clientRenderScriptEnd = ")</script>";
  var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
  function escapeJSStringsForInstructionScripts(input) {
    return JSON.stringify(input).replace(regexForJSStringsInInstructionScripts, function(match) {
      switch (match) {
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
      }
    });
  }
  var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
  function escapeJSObjectForInstructionScripts(input) {
    return JSON.stringify(input).replace(regexForJSStringsInScripts, function(match) {
      switch (match) {
        case "&":
          return "\\u0026";
        case ">":
          return "\\u003e";
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
      }
    });
  }
  var lateStyleTagResourceOpen1 = ' media="not all" data-precedence="';
  var lateStyleTagResourceOpen2 = '" data-href="';
  var lateStyleTagResourceOpen3 = '">';
  var lateStyleTagTemplateClose = "</style>";
  var currentlyRenderingBoundaryHasStylesToHoist = false;
  var destinationHasCapacity = true;
  function flushStyleTagsLateForBoundary(styleQueue) {
    var { rules, hrefs } = styleQueue;
    0 < rules.length && hrefs.length === 0 && console.error("React expected to have at least one href for an a hoistable style but found none. This is a bug in React.");
    var i = 0;
    if (hrefs.length) {
      writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
      writeChunk(this, lateStyleTagResourceOpen1);
      writeChunk(this, styleQueue.precedence);
      for (writeChunk(this, lateStyleTagResourceOpen2);i < hrefs.length - 1; i++)
        writeChunk(this, hrefs[i]), writeChunk(this, spaceSeparator);
      writeChunk(this, hrefs[i]);
      writeChunk(this, lateStyleTagResourceOpen3);
      for (i = 0;i < rules.length; i++)
        writeChunk(this, rules[i]);
      destinationHasCapacity = !!this.write(lateStyleTagTemplateClose);
      currentlyRenderingBoundaryHasStylesToHoist = true;
      rules.length = 0;
      hrefs.length = 0;
    }
  }
  function hasStylesToHoist(stylesheet) {
    return stylesheet.state !== PREAMBLE ? currentlyRenderingBoundaryHasStylesToHoist = true : false;
  }
  function writeHoistablesForBoundary(destination, hoistableState, renderState) {
    currentlyRenderingBoundaryHasStylesToHoist = false;
    destinationHasCapacity = true;
    currentlyFlushingRenderState = renderState;
    hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
    currentlyFlushingRenderState = null;
    hoistableState.stylesheets.forEach(hasStylesToHoist);
    currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = true);
    return destinationHasCapacity;
  }
  function flushResource(resource) {
    for (var i = 0;i < resource.length; i++)
      writeChunk(this, resource[i]);
    resource.length = 0;
  }
  var stylesheetFlushingQueue = [];
  function flushStyleInPreamble(stylesheet) {
    pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
    for (var i = 0;i < stylesheetFlushingQueue.length; i++)
      writeChunk(this, stylesheetFlushingQueue[i]);
    stylesheetFlushingQueue.length = 0;
    stylesheet.state = PREAMBLE;
  }
  var styleTagResourceOpen1 = ' data-precedence="';
  var styleTagResourceOpen2 = '" data-href="';
  var spaceSeparator = " ";
  var styleTagResourceOpen3 = '">';
  var styleTagResourceClose = "</style>";
  function flushStylesInPreamble(styleQueue) {
    var hasStylesheets = 0 < styleQueue.sheets.size;
    styleQueue.sheets.forEach(flushStyleInPreamble, this);
    styleQueue.sheets.clear();
    var { rules, hrefs } = styleQueue;
    if (!hasStylesheets || hrefs.length) {
      writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
      writeChunk(this, styleTagResourceOpen1);
      writeChunk(this, styleQueue.precedence);
      styleQueue = 0;
      if (hrefs.length) {
        for (writeChunk(this, styleTagResourceOpen2);styleQueue < hrefs.length - 1; styleQueue++)
          writeChunk(this, hrefs[styleQueue]), writeChunk(this, spaceSeparator);
        writeChunk(this, hrefs[styleQueue]);
      }
      writeChunk(this, styleTagResourceOpen3);
      for (styleQueue = 0;styleQueue < rules.length; styleQueue++)
        writeChunk(this, rules[styleQueue]);
      writeChunk(this, styleTagResourceClose);
      rules.length = 0;
      hrefs.length = 0;
    }
  }
  function preloadLateStyle(stylesheet) {
    if (stylesheet.state === PENDING$1) {
      stylesheet.state = PRELOADED;
      var props = stylesheet.props;
      pushLinkImpl(stylesheetFlushingQueue, {
        rel: "preload",
        as: "style",
        href: stylesheet.props.href,
        crossOrigin: props.crossOrigin,
        fetchPriority: props.fetchPriority,
        integrity: props.integrity,
        media: props.media,
        hrefLang: props.hrefLang,
        referrerPolicy: props.referrerPolicy
      });
      for (stylesheet = 0;stylesheet < stylesheetFlushingQueue.length; stylesheet++)
        writeChunk(this, stylesheetFlushingQueue[stylesheet]);
      stylesheetFlushingQueue.length = 0;
    }
  }
  function preloadLateStyles(styleQueue) {
    styleQueue.sheets.forEach(preloadLateStyle, this);
    styleQueue.sheets.clear();
  }
  var completedShellIdAttributeStart = ' id="';
  function pushCompletedShellIdAttribute(target, resumableState) {
    (resumableState.instructions & SentCompletedShellId) === NothingSent && (resumableState.instructions |= SentCompletedShellId, target.push(completedShellIdAttributeStart, escapeTextForBrowser("_" + resumableState.idPrefix + "R_"), attributeEnd));
  }
  var arrayFirstOpenBracket = "[";
  var arraySubsequentOpenBracket = ",[";
  var arrayInterstitial = ",";
  var arrayCloseBracket = "]";
  function writeStyleResourceDependenciesInJS(destination, hoistableState) {
    writeChunk(destination, arrayFirstOpenBracket);
    var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
    hoistableState.stylesheets.forEach(function(resource) {
      if (resource.state !== PREAMBLE)
        if (resource.state === LATE)
          writeChunk(destination, nextArrayOpenBrackChunk), resource = resource.props.href, checkAttributeStringCoercion(resource, "href"), writeChunk(destination, escapeJSObjectForInstructionScripts("" + resource)), writeChunk(destination, arrayCloseBracket), nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
        else {
          writeChunk(destination, nextArrayOpenBrackChunk);
          var precedence = resource.props["data-precedence"], props = resource.props, coercedHref = sanitizeURL("" + resource.props.href);
          writeChunk(destination, escapeJSObjectForInstructionScripts(coercedHref));
          checkAttributeStringCoercion(precedence, "precedence");
          precedence = "" + precedence;
          writeChunk(destination, arrayInterstitial);
          writeChunk(destination, escapeJSObjectForInstructionScripts(precedence));
          for (var propKey in props)
            if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], precedence != null))
              switch (propKey) {
                case "href":
                case "rel":
                case "precedence":
                case "data-precedence":
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error("link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
                default:
                  writeStyleResourceAttributeInJS(destination, propKey, precedence);
              }
          writeChunk(destination, arrayCloseBracket);
          nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
          resource.state = LATE;
        }
    });
    writeChunk(destination, arrayCloseBracket);
  }
  function writeStyleResourceAttributeInJS(destination, name, value) {
    var attributeName = name.toLowerCase();
    switch (typeof value) {
      case "function":
      case "symbol":
        return;
    }
    switch (name) {
      case "innerHTML":
      case "dangerouslySetInnerHTML":
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "style":
      case "ref":
        return;
      case "className":
        attributeName = "class";
        checkAttributeStringCoercion(value, attributeName);
        name = "" + value;
        break;
      case "hidden":
        if (value === false)
          return;
        name = "";
        break;
      case "src":
      case "href":
        value = sanitizeURL(value);
        checkAttributeStringCoercion(value, attributeName);
        name = "" + value;
        break;
      default:
        if (2 < name.length && (name[0] === "o" || name[0] === "O") && (name[1] === "n" || name[1] === "N") || !isAttributeNameSafe(name))
          return;
        checkAttributeStringCoercion(value, attributeName);
        name = "" + value;
    }
    writeChunk(destination, arrayInterstitial);
    writeChunk(destination, escapeJSObjectForInstructionScripts(attributeName));
    writeChunk(destination, arrayInterstitial);
    writeChunk(destination, escapeJSObjectForInstructionScripts(name));
  }
  var PENDING$1 = 0;
  var PRELOADED = 1;
  var PREAMBLE = 2;
  var LATE = 3;
  function createHoistableState() {
    return { styles: new Set, stylesheets: new Set, suspenseyImages: false };
  }
  function prefetchDNS(href) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (typeof href === "string" && href) {
        if (!resumableState.dnsResources.hasOwnProperty(href)) {
          resumableState.dnsResources[href] = EXISTS;
          resumableState = renderState.headers;
          var header, JSCompiler_temp;
          if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity)
            JSCompiler_temp = (header = "<" + escapeHrefForLinkHeaderURLContext(href) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
          JSCompiler_temp ? (renderState.resets.dns[href] = EXISTS, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, { href, rel: "dns-prefetch" }), renderState.preconnects.add(header));
        }
        enqueueFlush(request);
      }
    } else
      previousDispatcher.D(href);
  }
  function preconnect(href, crossOrigin) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (typeof href === "string" && href) {
        var bucket = crossOrigin === "use-credentials" ? "credentials" : typeof crossOrigin === "string" ? "anonymous" : "default";
        if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
          resumableState.connectResources[bucket][href] = EXISTS;
          resumableState = renderState.headers;
          var header, JSCompiler_temp;
          if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
            JSCompiler_temp = "<" + escapeHrefForLinkHeaderURLContext(href) + ">; rel=preconnect";
            if (typeof crossOrigin === "string") {
              var escapedCrossOrigin = escapeStringForLinkHeaderQuotedParamValueContext(crossOrigin, "crossOrigin");
              JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
            }
            JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
          }
          JSCompiler_temp ? (renderState.resets.connect[bucket][href] = EXISTS, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
            rel: "preconnect",
            href,
            crossOrigin
          }), renderState.preconnects.add(bucket));
        }
        enqueueFlush(request);
      }
    } else
      previousDispatcher.C(href, crossOrigin);
  }
  function preload(href, as, options) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (as && href) {
        switch (as) {
          case "image":
            if (options) {
              var imageSrcSet = options.imageSrcSet;
              var imageSizes = options.imageSizes;
              var fetchPriority = options.fetchPriority;
            }
            var key = imageSrcSet ? imageSrcSet + `
` + (imageSizes || "") : href;
            if (resumableState.imageResources.hasOwnProperty(key))
              return;
            resumableState.imageResources[key] = PRELOAD_NO_CREDS;
            resumableState = renderState.headers;
            var header;
            resumableState && 0 < resumableState.remainingCapacity && typeof imageSrcSet !== "string" && fetchPriority === "high" && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(resumableState, assign({ rel: "preload", href: imageSrcSet ? undefined : href, as }, options)), fetchPriority === "high" ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
            break;
          case "style":
            if (resumableState.styleResources.hasOwnProperty(href))
              return;
            imageSrcSet = [];
            pushLinkImpl(imageSrcSet, assign({ rel: "preload", href, as }, options));
            resumableState.styleResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
            renderState.preloads.stylesheets.set(href, imageSrcSet);
            renderState.bulkPreloads.add(imageSrcSet);
            break;
          case "script":
            if (resumableState.scriptResources.hasOwnProperty(href))
              return;
            imageSrcSet = [];
            renderState.preloads.scripts.set(href, imageSrcSet);
            renderState.bulkPreloads.add(imageSrcSet);
            pushLinkImpl(imageSrcSet, assign({ rel: "preload", href, as }, options));
            resumableState.scriptResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
            break;
          default:
            if (resumableState.unknownResources.hasOwnProperty(as)) {
              if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href))
                return;
            } else
              imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
            imageSrcSet[href] = PRELOAD_NO_CREDS;
            if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && as === "font" && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2)))
              renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
            else
              switch (resumableState = [], href = assign({ rel: "preload", href, as }, options), pushLinkImpl(resumableState, href), as) {
                case "font":
                  renderState.fontPreloads.add(resumableState);
                  break;
                default:
                  renderState.bulkPreloads.add(resumableState);
              }
        }
        enqueueFlush(request);
      }
    } else
      previousDispatcher.L(href, as, options);
  }
  function preloadModule(href, options) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (href) {
        var as = options && typeof options.as === "string" ? options.as : "script";
        switch (as) {
          case "script":
            if (resumableState.moduleScriptResources.hasOwnProperty(href))
              return;
            as = [];
            resumableState.moduleScriptResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
            renderState.preloads.moduleScripts.set(href, as);
            break;
          default:
            if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
              var resources = resumableState.unknownResources[as];
              if (resources.hasOwnProperty(href))
                return;
            } else
              resources = {}, resumableState.moduleUnknownResources[as] = resources;
            as = [];
            resources[href] = PRELOAD_NO_CREDS;
        }
        pushLinkImpl(as, assign({ rel: "modulepreload", href }, options));
        renderState.bulkPreloads.add(as);
        enqueueFlush(request);
      }
    } else
      previousDispatcher.m(href, options);
  }
  function preinitStyle(href, precedence, options) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (href) {
        precedence = precedence || "default";
        var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : undefined;
        resourceState !== EXISTS && (resumableState.styleResources[href] = EXISTS, styleQueue || (styleQueue = {
          precedence: escapeTextForBrowser(precedence),
          rules: [],
          hrefs: [],
          sheets: new Map
        }, renderState.styles.set(precedence, styleQueue)), precedence = {
          state: PENDING$1,
          props: assign({ rel: "stylesheet", href, "data-precedence": precedence }, options)
        }, resourceState && (resourceState.length === 2 && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = PRELOADED), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
      }
    } else
      previousDispatcher.S(href, precedence, options);
  }
  function preinitScript(src, options) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (src) {
        var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : undefined;
        resourceState !== EXISTS && (resumableState.scriptResources[src] = EXISTS, options = assign({ src, async: true }, options), resourceState && (resourceState.length === 2 && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
      }
    } else
      previousDispatcher.X(src, options);
  }
  function preinitModuleScript(src, options) {
    var request = currentRequest ? currentRequest : null;
    if (request) {
      var { resumableState, renderState } = request;
      if (src) {
        var resourceState = resumableState.moduleScriptResources.hasOwnProperty(src) ? resumableState.moduleScriptResources[src] : undefined;
        resourceState !== EXISTS && (resumableState.moduleScriptResources[src] = EXISTS, options = assign({ src, type: "module", async: true }, options), resourceState && (resourceState.length === 2 && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
      }
    } else
      previousDispatcher.M(src, options);
  }
  function preloadBootstrapScriptOrModule(resumableState, renderState, href, props) {
    (resumableState.scriptResources.hasOwnProperty(href) || resumableState.moduleScriptResources.hasOwnProperty(href)) && console.error('Internal React Error: React expected bootstrap script or module with src "%s" to not have been preloaded already. please file an issue', href);
    resumableState.scriptResources[href] = EXISTS;
    resumableState.moduleScriptResources[href] = EXISTS;
    resumableState = [];
    pushLinkImpl(resumableState, props);
    renderState.bootstrapScripts.add(resumableState);
  }
  function adoptPreloadCredentials(target, preloadState) {
    target.crossOrigin == null && (target.crossOrigin = preloadState[0]);
    target.integrity == null && (target.integrity = preloadState[1]);
  }
  function getPreloadAsHeader(href, as, params) {
    href = escapeHrefForLinkHeaderURLContext(href);
    as = escapeStringForLinkHeaderQuotedParamValueContext(as, "as");
    as = "<" + href + '>; rel=preload; as="' + as + '"';
    for (var paramName in params)
      hasOwnProperty.call(params, paramName) && (href = params[paramName], typeof href === "string" && (as += "; " + paramName.toLowerCase() + '="' + escapeStringForLinkHeaderQuotedParamValueContext(href, paramName) + '"'));
    return as;
  }
  var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
  function escapeHrefForLinkHeaderURLContext(hrefInput) {
    checkAttributeStringCoercion(hrefInput, "href");
    return ("" + hrefInput).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer);
  }
  function escapeHrefForLinkHeaderURLContextReplacer(match) {
    switch (match) {
      case "<":
        return "%3C";
      case ">":
        return "%3E";
      case `
`:
        return "%0A";
      case "\r":
        return "%0D";
      default:
        throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
    }
  }
  var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
  function escapeStringForLinkHeaderQuotedParamValueContext(value, name) {
    willCoercionThrow(value) && (console.error("The provided `%s` option is an unsupported type %s. This value must be coerced to a string before using it here.", name, typeName(value)), testStringCoercion(value));
    return ("" + value).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
  }
  function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
    switch (match) {
      case '"':
        return "%22";
      case "'":
        return "%27";
      case ";":
        return "%3B";
      case ",":
        return "%2C";
      case `
`:
        return "%0A";
      case "\r":
        return "%0D";
      default:
        throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
    }
  }
  function hoistStyleQueueDependency(styleQueue) {
    this.styles.add(styleQueue);
  }
  function hoistStylesheetDependency(stylesheet) {
    this.stylesheets.add(stylesheet);
  }
  function hoistHoistables(parentState, childState) {
    childState.styles.forEach(hoistStyleQueueDependency, parentState);
    childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
    childState.suspenseyImages && (parentState.suspenseyImages = true);
  }
  function hasSuspenseyContent(hoistableState) {
    return 0 < hoistableState.stylesheets.size || hoistableState.suspenseyImages;
  }
  var bind = Function.prototype.bind;
  var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function getComponentNameFromType(type) {
    if (type == null)
      return null;
    if (typeof type === "function")
      return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
    if (typeof type === "string")
      return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
      case REACT_ACTIVITY_TYPE:
        return "Activity";
    }
    if (typeof type === "object")
      switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
        case REACT_PORTAL_TYPE:
          return "Portal";
        case REACT_CONTEXT_TYPE:
          return type.displayName || "Context";
        case REACT_CONSUMER_TYPE:
          return (type._context.displayName || "Context") + ".Consumer";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
          return type;
        case REACT_MEMO_TYPE:
          return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {}
      }
    return null;
  }
  var emptyContextObject = {};
  Object.freeze(emptyContextObject);
  var rendererSigil;
  rendererSigil = {};
  var currentActiveSnapshot = null;
  function popToNearestCommonAncestor(prev, next) {
    if (prev !== next) {
      prev.context._currentValue = prev.parentValue;
      prev = prev.parent;
      var parentNext = next.parent;
      if (prev === null) {
        if (parentNext !== null)
          throw Error("The stacks must reach the root at the same time. This is a bug in React.");
      } else {
        if (parentNext === null)
          throw Error("The stacks must reach the root at the same time. This is a bug in React.");
        popToNearestCommonAncestor(prev, parentNext);
      }
      next.context._currentValue = next.value;
    }
  }
  function popAllPrevious(prev) {
    prev.context._currentValue = prev.parentValue;
    prev = prev.parent;
    prev !== null && popAllPrevious(prev);
  }
  function pushAllNext(next) {
    var parentNext = next.parent;
    parentNext !== null && pushAllNext(parentNext);
    next.context._currentValue = next.value;
  }
  function popPreviousToCommonLevel(prev, next) {
    prev.context._currentValue = prev.parentValue;
    prev = prev.parent;
    if (prev === null)
      throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
    prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
  }
  function popNextToCommonLevel(prev, next) {
    var parentNext = next.parent;
    if (parentNext === null)
      throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
    prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
    next.context._currentValue = next.value;
  }
  function switchContext(newSnapshot) {
    var prev = currentActiveSnapshot;
    prev !== newSnapshot && (prev === null ? pushAllNext(newSnapshot) : newSnapshot === null ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
  }
  var didWarnAboutNoopUpdateForComponent = {};
  var didWarnAboutDeprecatedWillMount = {};
  var didWarnAboutUninitializedState;
  var didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate;
  var didWarnAboutLegacyLifecyclesAndDerivedState;
  var didWarnAboutUndefinedDerivedState;
  var didWarnAboutDirectlyAssigningPropsToState;
  var didWarnAboutContextTypes$1;
  var didWarnAboutChildContextTypes;
  var didWarnAboutInvalidateContextType;
  var didWarnOnInvalidCallback;
  didWarnAboutUninitializedState = new Set;
  didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate = new Set;
  didWarnAboutLegacyLifecyclesAndDerivedState = new Set;
  didWarnAboutDirectlyAssigningPropsToState = new Set;
  didWarnAboutUndefinedDerivedState = new Set;
  didWarnAboutContextTypes$1 = new Set;
  didWarnAboutChildContextTypes = new Set;
  didWarnAboutInvalidateContextType = new Set;
  didWarnOnInvalidCallback = new Set;
  function warnOnInvalidCallback(callback) {
    if (callback !== null && typeof callback !== "function") {
      var key = String(callback);
      didWarnOnInvalidCallback.has(key) || (didWarnOnInvalidCallback.add(key), console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.", callback));
    }
  }
  function warnNoop(publicInstance, callerName) {
    publicInstance = (publicInstance = publicInstance.constructor) && getComponentNameFromType(publicInstance) || "ReactClass";
    var warningKey = publicInstance + "." + callerName;
    didWarnAboutNoopUpdateForComponent[warningKey] || (console.error(`Can only update a mounting component. This usually means you called %s() outside componentWillMount() on the server. This is a no-op.

Please check the code for the %s component.`, callerName, publicInstance), didWarnAboutNoopUpdateForComponent[warningKey] = true);
  }
  var classComponentUpdater = {
    enqueueSetState: function(inst, payload, callback) {
      var internals = inst._reactInternals;
      internals.queue === null ? warnNoop(inst, "setState") : (internals.queue.push(payload), callback !== undefined && callback !== null && warnOnInvalidCallback(callback));
    },
    enqueueReplaceState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      inst.replace = true;
      inst.queue = [payload];
      callback !== undefined && callback !== null && warnOnInvalidCallback(callback);
    },
    enqueueForceUpdate: function(inst, callback) {
      inst._reactInternals.queue === null ? warnNoop(inst, "forceUpdate") : callback !== undefined && callback !== null && warnOnInvalidCallback(callback);
    }
  };
  var emptyTreeContext = { id: 1, overflow: "" };
  function pushTreeContext(baseContext, totalChildren, index) {
    var baseIdWithLeadingBit = baseContext.id;
    baseContext = baseContext.overflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - baseLength % 5;
      length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      return {
        id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
        overflow: length + baseContext
      };
    }
    return {
      id: 1 << length | index << baseLength | baseIdWithLeadingBit,
      overflow: baseContext
    };
  }
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
  var log = Math.log;
  var LN2 = Math.LN2;
  function clz32Fallback(x) {
    x >>>= 0;
    return x === 0 ? 32 : 31 - (log(x) / LN2 | 0) | 0;
  }
  function noop() {}
  var SuspenseException = Error("Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`.");
  function trackUsedThenable(thenableState2, thenable, index) {
    index = thenableState2[index];
    index === undefined ? thenableState2.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenable.reason;
      default:
        typeof thenable.status === "string" ? thenable.then(noop, noop) : (thenableState2 = thenable, thenableState2.status = "pending", thenableState2.then(function(fulfilledValue) {
          if (thenable.status === "pending") {
            var fulfilledThenable = thenable;
            fulfilledThenable.status = "fulfilled";
            fulfilledThenable.value = fulfilledValue;
          }
        }, function(error) {
          if (thenable.status === "pending") {
            var rejectedThenable = thenable;
            rejectedThenable.status = "rejected";
            rejectedThenable.reason = error;
          }
        }));
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
        }
        suspendedThenable = thenable;
        throw SuspenseException;
    }
  }
  var suspendedThenable = null;
  function getSuspendedThenable() {
    if (suspendedThenable === null)
      throw Error("Expected a suspended thenable. This is a bug in React. Please file an issue.");
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function is(x, y) {
    return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = typeof Object.is === "function" ? Object.is : is;
  var currentlyRenderingComponent = null;
  var currentlyRenderingTask = null;
  var currentlyRenderingRequest = null;
  var currentlyRenderingKeyPath = null;
  var firstWorkInProgressHook = null;
  var workInProgressHook = null;
  var isReRender = false;
  var didScheduleRenderPhaseUpdate = false;
  var localIdCounter = 0;
  var actionStateCounter = 0;
  var actionStateMatchingIndex = -1;
  var thenableIndexCounter = 0;
  var thenableState = null;
  var renderPhaseUpdates = null;
  var numberOfReRenders = 0;
  var isInHookUserCodeInDev = false;
  var currentHookNameInDev;
  function resolveCurrentlyRenderingComponent() {
    if (currentlyRenderingComponent === null)
      throw Error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
    isInHookUserCodeInDev && console.error("Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://react.dev/link/rules-of-hooks");
    return currentlyRenderingComponent;
  }
  function createHook() {
    if (0 < numberOfReRenders)
      throw Error("Rendered more hooks than during the previous render");
    return { memoizedState: null, queue: null, next: null };
  }
  function createWorkInProgressHook() {
    workInProgressHook === null ? firstWorkInProgressHook === null ? (isReRender = false, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = true, workInProgressHook = firstWorkInProgressHook) : workInProgressHook.next === null ? (isReRender = false, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = true, workInProgressHook = workInProgressHook.next);
    return workInProgressHook;
  }
  function getThenableStateAfterSuspending() {
    var state = thenableState;
    thenableState = null;
    return state;
  }
  function resetHooksState() {
    isInHookUserCodeInDev = false;
    currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
    didScheduleRenderPhaseUpdate = false;
    firstWorkInProgressHook = null;
    numberOfReRenders = 0;
    workInProgressHook = renderPhaseUpdates = null;
  }
  function readContext(context) {
    isInHookUserCodeInDev && console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");
    return context._currentValue;
  }
  function basicStateReducer(state, action) {
    return typeof action === "function" ? action(state) : action;
  }
  function useReducer(reducer, initialArg, init) {
    reducer !== basicStateReducer && (currentHookNameInDev = "useReducer");
    currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
    workInProgressHook = createWorkInProgressHook();
    if (isReRender) {
      init = workInProgressHook.queue;
      initialArg = init.dispatch;
      if (renderPhaseUpdates !== null) {
        var firstRenderPhaseUpdate = renderPhaseUpdates.get(init);
        if (firstRenderPhaseUpdate !== undefined) {
          renderPhaseUpdates.delete(init);
          init = workInProgressHook.memoizedState;
          do {
            var action = firstRenderPhaseUpdate.action;
            isInHookUserCodeInDev = true;
            init = reducer(init, action);
            isInHookUserCodeInDev = false;
            firstRenderPhaseUpdate = firstRenderPhaseUpdate.next;
          } while (firstRenderPhaseUpdate !== null);
          workInProgressHook.memoizedState = init;
          return [init, initialArg];
        }
      }
      return [workInProgressHook.memoizedState, initialArg];
    }
    isInHookUserCodeInDev = true;
    reducer = reducer === basicStateReducer ? typeof initialArg === "function" ? initialArg() : initialArg : init !== undefined ? init(initialArg) : initialArg;
    isInHookUserCodeInDev = false;
    workInProgressHook.memoizedState = reducer;
    reducer = workInProgressHook.queue = { last: null, dispatch: null };
    reducer = reducer.dispatch = dispatchAction.bind(null, currentlyRenderingComponent, reducer);
    return [workInProgressHook.memoizedState, reducer];
  }
  function useMemo(nextCreate, deps) {
    currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
    workInProgressHook = createWorkInProgressHook();
    deps = deps === undefined ? null : deps;
    if (workInProgressHook !== null) {
      var prevState = workInProgressHook.memoizedState;
      if (prevState !== null && deps !== null) {
        a: {
          var JSCompiler_inline_result = prevState[1];
          if (JSCompiler_inline_result === null)
            console.error("%s received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.", currentHookNameInDev), JSCompiler_inline_result = false;
          else {
            deps.length !== JSCompiler_inline_result.length && console.error(`The final argument passed to %s changed size between renders. The order and size of this array must remain constant.

Previous: %s
Incoming: %s`, currentHookNameInDev, "[" + deps.join(", ") + "]", "[" + JSCompiler_inline_result.join(", ") + "]");
            for (var i = 0;i < JSCompiler_inline_result.length && i < deps.length; i++)
              if (!objectIs(deps[i], JSCompiler_inline_result[i])) {
                JSCompiler_inline_result = false;
                break a;
              }
            JSCompiler_inline_result = true;
          }
        }
        if (JSCompiler_inline_result)
          return prevState[0];
      }
    }
    isInHookUserCodeInDev = true;
    nextCreate = nextCreate();
    isInHookUserCodeInDev = false;
    workInProgressHook.memoizedState = [nextCreate, deps];
    return nextCreate;
  }
  function dispatchAction(componentIdentity, queue, action) {
    if (25 <= numberOfReRenders)
      throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");
    if (componentIdentity === currentlyRenderingComponent)
      if (didScheduleRenderPhaseUpdate = true, componentIdentity = { action, next: null }, renderPhaseUpdates === null && (renderPhaseUpdates = new Map), action = renderPhaseUpdates.get(queue), action === undefined)
        renderPhaseUpdates.set(queue, componentIdentity);
      else {
        for (queue = action;queue.next !== null; )
          queue = queue.next;
        queue.next = componentIdentity;
      }
  }
  function throwOnUseEffectEventCall() {
    throw Error("A function wrapped in useEffectEvent can't be called during rendering.");
  }
  function unsupportedStartTransition() {
    throw Error("startTransition cannot be called during server rendering.");
  }
  function unsupportedSetOptimisticState() {
    throw Error("Cannot update optimistic state while rendering.");
  }
  function useActionState(action, initialState, permalink) {
    resolveCurrentlyRenderingComponent();
    var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
    if (typeof action.$$FORM_ACTION === "function") {
      var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
      request = request.formState;
      var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
      if (request !== null && typeof isSignatureEqual === "function") {
        var postbackKey = request[1];
        isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = permalink !== undefined ? "p" + permalink : "k" + Bun.hash(JSON.stringify([componentKeyPath, null, actionStateHookIndex])), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
      }
      var boundAction = action.bind(null, initialState);
      action = function(payload) {
        boundAction(payload);
      };
      typeof boundAction.$$FORM_ACTION === "function" && (action.$$FORM_ACTION = function(prefix2) {
        prefix2 = boundAction.$$FORM_ACTION(prefix2);
        permalink !== undefined && (checkAttributeStringCoercion(permalink, "target"), permalink += "", prefix2.action = permalink);
        var formData = prefix2.data;
        formData && (nextPostbackStateKey === null && (nextPostbackStateKey = permalink !== undefined ? "p" + permalink : "k" + Bun.hash(JSON.stringify([
          componentKeyPath,
          null,
          actionStateHookIndex
        ]))), formData.append("$ACTION_KEY", nextPostbackStateKey));
        return prefix2;
      });
      return [initialState, action, false];
    }
    var _boundAction = action.bind(null, initialState);
    return [
      initialState,
      function(payload) {
        _boundAction(payload);
      },
      false
    ];
  }
  function unwrapThenable(thenable) {
    var index = thenableIndexCounter;
    thenableIndexCounter += 1;
    thenableState === null && (thenableState = []);
    return trackUsedThenable(thenableState, thenable, index);
  }
  function unsupportedRefresh() {
    throw Error("Cache cannot be refreshed during server rendering.");
  }
  var HooksDispatcher = {
    readContext,
    use: function(usable) {
      if (usable !== null && typeof usable === "object") {
        if (typeof usable.then === "function")
          return unwrapThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE)
          return readContext(usable);
      }
      throw Error("An unsupported type was passed to use(): " + String(usable));
    },
    useContext: function(context) {
      currentHookNameInDev = "useContext";
      resolveCurrentlyRenderingComponent();
      return context._currentValue;
    },
    useMemo,
    useReducer,
    useRef: function(initialValue) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      var previousRef = workInProgressHook.memoizedState;
      return previousRef === null ? (initialValue = { current: initialValue }, Object.seal(initialValue), workInProgressHook.memoizedState = initialValue) : previousRef;
    },
    useState: function(initialState) {
      currentHookNameInDev = "useState";
      return useReducer(basicStateReducer, initialState);
    },
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useCallback: function(callback, deps) {
      return useMemo(function() {
        return callback;
      }, deps);
    },
    useImperativeHandle: noop,
    useEffect: noop,
    useDebugValue: noop,
    useDeferredValue: function(value, initialValue) {
      resolveCurrentlyRenderingComponent();
      return initialValue !== undefined ? initialValue : value;
    },
    useTransition: function() {
      resolveCurrentlyRenderingComponent();
      return [false, unsupportedStartTransition];
    },
    useId: function() {
      var treeId = currentlyRenderingTask.treeContext;
      var overflow = treeId.overflow;
      treeId = treeId.id;
      treeId = (treeId & ~(1 << 32 - clz32(treeId) - 1)).toString(32) + overflow;
      var resumableState = currentResumableState;
      if (resumableState === null)
        throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component.");
      overflow = localIdCounter++;
      treeId = "_" + resumableState.idPrefix + "R_" + treeId;
      0 < overflow && (treeId += "H" + overflow.toString(32));
      return treeId + "_";
    },
    useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
      if (getServerSnapshot === undefined)
        throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
      return getServerSnapshot();
    },
    useOptimistic: function(passthrough) {
      resolveCurrentlyRenderingComponent();
      return [passthrough, unsupportedSetOptimisticState];
    },
    useActionState,
    useFormState: useActionState,
    useHostTransitionStatus: function() {
      resolveCurrentlyRenderingComponent();
      return NotPending;
    },
    useMemoCache: function(size) {
      for (var data = Array(size), i = 0;i < size; i++)
        data[i] = REACT_MEMO_CACHE_SENTINEL;
      return data;
    },
    useCacheRefresh: function() {
      return unsupportedRefresh;
    },
    useEffectEvent: function() {
      return throwOnUseEffectEventCall;
    }
  };
  var currentResumableState = null;
  var currentTaskInDEV = null;
  var DefaultAsyncDispatcher = {
    getCacheForType: function() {
      throw Error("Not implemented.");
    },
    cacheSignal: function() {
      throw Error("Not implemented.");
    },
    getOwner: function() {
      return currentTaskInDEV === null ? null : currentTaskInDEV.componentStack;
    }
  };
  var disabledDepth = 0;
  var prevLog;
  var prevInfo;
  var prevWarn;
  var prevError;
  var prevGroup;
  var prevGroupCollapsed;
  var prevGroupEnd;
  function disabledLog() {}
  disabledLog.__reactDisabledLog = true;
  function disableLogs() {
    if (disabledDepth === 0) {
      prevLog = console.log;
      prevInfo = console.info;
      prevWarn = console.warn;
      prevError = console.error;
      prevGroup = console.group;
      prevGroupCollapsed = console.groupCollapsed;
      prevGroupEnd = console.groupEnd;
      var props = {
        configurable: true,
        enumerable: true,
        value: disabledLog,
        writable: true
      };
      Object.defineProperties(console, {
        info: props,
        log: props,
        warn: props,
        error: props,
        group: props,
        groupCollapsed: props,
        groupEnd: props
      });
    }
    disabledDepth++;
  }
  function reenableLogs() {
    disabledDepth--;
    if (disabledDepth === 0) {
      var props = { configurable: true, enumerable: true, writable: true };
      Object.defineProperties(console, {
        log: assign({}, props, { value: prevLog }),
        info: assign({}, props, { value: prevInfo }),
        warn: assign({}, props, { value: prevWarn }),
        error: assign({}, props, { value: prevError }),
        group: assign({}, props, { value: prevGroup }),
        groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
        groupEnd: assign({}, props, { value: prevGroupEnd })
      });
    }
    0 > disabledDepth && console.error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
  }
  function formatOwnerStack(error) {
    var prevPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = undefined;
    error = error.stack;
    Error.prepareStackTrace = prevPrepareStackTrace;
    error.startsWith(`Error: react-stack-top-frame
`) && (error = error.slice(29));
    prevPrepareStackTrace = error.indexOf(`
`);
    prevPrepareStackTrace !== -1 && (error = error.slice(prevPrepareStackTrace + 1));
    prevPrepareStackTrace = error.indexOf("react_stack_bottom_frame");
    prevPrepareStackTrace !== -1 && (prevPrepareStackTrace = error.lastIndexOf(`
`, prevPrepareStackTrace));
    if (prevPrepareStackTrace !== -1)
      error = error.slice(0, prevPrepareStackTrace);
    else
      return "";
    return error;
  }
  var prefix;
  var suffix;
  function describeBuiltInComponentFrame(name) {
    if (prefix === undefined)
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = match && match[1] || "";
        suffix = -1 < x.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + prefix + name + suffix;
  }
  var reentry = false;
  var componentFrameCache;
  componentFrameCache = new (typeof WeakMap === "function" ? WeakMap : Map);
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry)
      return "";
    var frame = componentFrameCache.get(fn);
    if (frame !== undefined)
      return frame;
    reentry = true;
    frame = Error.prepareStackTrace;
    Error.prepareStackTrace = undefined;
    var previousDispatcher2 = null;
    previousDispatcher2 = ReactSharedInternals.H;
    ReactSharedInternals.H = null;
    disableLogs();
    try {
      var RunInRootFrame = {
        DetermineComponentFrameRoot: function() {
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  var control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x$0) {
                  control = x$0;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x$1) {
                control = x$1;
              }
              (Fake = fn()) && typeof Fake.catch === "function" && Fake.catch(function() {});
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string")
              return [sample.stack, control.stack];
          }
          return [null, null];
        }
      };
      RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
      namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
      var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
      if (sampleStack && controlStack) {
        var sampleLines = sampleStack.split(`
`), controlLines = controlStack.split(`
`);
        for (_RunInRootFrame$Deter = namePropDescriptor = 0;namePropDescriptor < sampleLines.length && !sampleLines[namePropDescriptor].includes("DetermineComponentFrameRoot"); )
          namePropDescriptor++;
        for (;_RunInRootFrame$Deter < controlLines.length && !controlLines[_RunInRootFrame$Deter].includes("DetermineComponentFrameRoot"); )
          _RunInRootFrame$Deter++;
        if (namePropDescriptor === sampleLines.length || _RunInRootFrame$Deter === controlLines.length)
          for (namePropDescriptor = sampleLines.length - 1, _RunInRootFrame$Deter = controlLines.length - 1;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter && sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]; )
            _RunInRootFrame$Deter--;
        for (;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter; namePropDescriptor--, _RunInRootFrame$Deter--)
          if (sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
            if (namePropDescriptor !== 1 || _RunInRootFrame$Deter !== 1) {
              do
                if (namePropDescriptor--, _RunInRootFrame$Deter--, 0 > _RunInRootFrame$Deter || sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                  var _frame = `
` + sampleLines[namePropDescriptor].replace(" at new ", " at ");
                  fn.displayName && _frame.includes("<anonymous>") && (_frame = _frame.replace("<anonymous>", fn.displayName));
                  typeof fn === "function" && componentFrameCache.set(fn, _frame);
                  return _frame;
                }
              while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
            }
            break;
          }
      }
    } finally {
      reentry = false, ReactSharedInternals.H = previousDispatcher2, reenableLogs(), Error.prepareStackTrace = frame;
    }
    sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(sampleLines) : "";
    typeof fn === "function" && componentFrameCache.set(fn, sampleLines);
    return sampleLines;
  }
  function describeComponentStackByType(type) {
    if (typeof type === "string")
      return describeBuiltInComponentFrame(type);
    if (typeof type === "function")
      return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, true) : describeNativeComponentFrame(type, false);
    if (typeof type === "object" && type !== null) {
      switch (type.$$typeof) {
        case REACT_FORWARD_REF_TYPE:
          return describeNativeComponentFrame(type.render, false);
        case REACT_MEMO_TYPE:
          return describeNativeComponentFrame(type.type, false);
        case REACT_LAZY_TYPE:
          var lazyComponent = type, payload = lazyComponent._payload;
          lazyComponent = lazyComponent._init;
          try {
            type = lazyComponent(payload);
          } catch (x) {
            return describeBuiltInComponentFrame("Lazy");
          }
          return describeComponentStackByType(type);
      }
      if (typeof type.name === "string") {
        a: {
          payload = type.name;
          lazyComponent = type.env;
          type = type.debugLocation;
          if (type != null) {
            type = formatOwnerStack(type);
            var idx = type.lastIndexOf(`
`);
            type = idx === -1 ? type : type.slice(idx + 1);
            if (type.indexOf(payload) !== -1) {
              payload = `
` + type;
              break a;
            }
          }
          payload = describeBuiltInComponentFrame(payload + (lazyComponent ? " [" + lazyComponent + "]" : ""));
        }
        return payload;
      }
    }
    switch (type) {
      case REACT_SUSPENSE_LIST_TYPE:
        return describeBuiltInComponentFrame("SuspenseList");
      case REACT_SUSPENSE_TYPE:
        return describeBuiltInComponentFrame("Suspense");
    }
    return "";
  }
  var callComponent = {
    react_stack_bottom_frame: function(Component, props, secondArg) {
      return Component(props, secondArg);
    }
  };
  var callComponentInDEV = callComponent.react_stack_bottom_frame.bind(callComponent);
  var callRender = {
    react_stack_bottom_frame: function(instance) {
      return instance.render();
    }
  };
  var callRenderInDEV = callRender.react_stack_bottom_frame.bind(callRender);
  var callLazyInit = {
    react_stack_bottom_frame: function(lazy) {
      var init = lazy._init;
      return init(lazy._payload);
    }
  };
  var callLazyInitInDEV = callLazyInit.react_stack_bottom_frame.bind(callLazyInit);
  var lastResetTime = 0;
  var getCurrentTime;
  if (typeof performance === "object" && typeof performance.now === "function") {
    localPerformance = performance;
    getCurrentTime = function() {
      return localPerformance.now();
    };
  } else {
    localDate = Date;
    getCurrentTime = function() {
      return localDate.now();
    };
  }
  var localPerformance;
  var localDate;
  var CLIENT_RENDERED = 4;
  var PENDING = 0;
  var COMPLETED = 1;
  var FLUSHED = 2;
  var ABORTED = 3;
  var ERRORED = 4;
  var POSTPONED = 5;
  var CLOSED = 14;
  function isEligibleForOutlining(request, boundary) {
    return (500 < boundary.byteSize || hasSuspenseyContent(boundary.contentState)) && boundary.contentPreamble === null;
  }
  function defaultErrorHandler(error) {
    if (typeof error === "object" && error !== null && typeof error.environmentName === "string") {
      var JSCompiler_inline_result = error.environmentName;
      error = [error].slice(0);
      typeof error[0] === "string" ? error.splice(0, 1, "%c%s%c " + error[0], "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px", " " + JSCompiler_inline_result + " ", "") : error.splice(0, 0, "%c%s%c", "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px", " " + JSCompiler_inline_result + " ", "");
      error.unshift(console);
      JSCompiler_inline_result = bind.apply(console.error, error);
      JSCompiler_inline_result();
    } else
      console.error(error);
    return null;
  }
  function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
    var abortSet = new Set;
    this.destination = null;
    this.flushScheduled = false;
    this.resumableState = resumableState;
    this.renderState = renderState;
    this.rootFormatContext = rootFormatContext;
    this.progressiveChunkSize = progressiveChunkSize === undefined ? 12800 : progressiveChunkSize;
    this.status = 10;
    this.fatalError = null;
    this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
    this.completedPreambleSegments = this.completedRootSegment = null;
    this.byteSize = 0;
    this.abortableTasks = abortSet;
    this.pingedTasks = [];
    this.clientRenderedBoundaries = [];
    this.completedBoundaries = [];
    this.partialBoundaries = [];
    this.trackedPostpones = null;
    this.onError = onError === undefined ? defaultErrorHandler : onError;
    this.onPostpone = onPostpone === undefined ? noop : onPostpone;
    this.onAllReady = onAllReady === undefined ? noop : onAllReady;
    this.onShellReady = onShellReady === undefined ? noop : onShellReady;
    this.onShellError = onShellError === undefined ? noop : onShellError;
    this.onFatalError = onFatalError === undefined ? noop : onFatalError;
    this.formState = formState === undefined ? null : formState;
    this.didWarnForKey = null;
  }
  function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
    var now = getCurrentTime();
    1000 < now - lastResetTime && (ReactSharedInternals.recentlyCreatedOwnerStacks = 0, lastResetTime = now);
    resumableState = new RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState);
    renderState = createPendingSegment(resumableState, 0, null, rootFormatContext, false, false);
    renderState.parentFlushed = true;
    children = createRenderTask(resumableState, null, children, -1, null, renderState, null, null, resumableState.abortableTasks, null, rootFormatContext, null, emptyTreeContext, null, null, emptyContextObject, null);
    pushComponentStack(children);
    resumableState.pingedTasks.push(children);
    return resumableState;
  }
  var currentRequest = null;
  function pingTask(request, task) {
    request.pingedTasks.push(task);
    request.pingedTasks.length === 1 && (request.flushScheduled = request.destination !== null, request.trackedPostpones !== null || request.status === 10 ? scheduleMicrotask(function() {
      return performWork(request);
    }) : setTimeout(function() {
      return performWork(request);
    }, 0));
  }
  function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
    fallbackAbortableTasks = {
      status: PENDING,
      rootSegmentID: -1,
      parentFlushed: false,
      pendingTasks: 0,
      row,
      completedSegments: [],
      byteSize: 0,
      fallbackAbortableTasks,
      errorDigest: null,
      contentState: createHoistableState(),
      fallbackState: createHoistableState(),
      contentPreamble,
      fallbackPreamble,
      trackedContentKeyPath: null,
      trackedFallbackNode: null,
      errorMessage: null,
      errorStack: null,
      errorComponentStack: null
    };
    row !== null && (row.pendingTasks++, contentPreamble = row.boundaries, contentPreamble !== null && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, request !== null && hoistHoistables(fallbackAbortableTasks.contentState, request));
    return fallbackAbortableTasks;
  }
  function createRenderTask(request, thenableState2, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack, legacyContext, debugTask) {
    request.allPendingTasks++;
    blockedBoundary === null ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
    row !== null && row.pendingTasks++;
    var task = {
      replay: null,
      node,
      childIndex,
      ping: function() {
        return pingTask(request, task);
      },
      blockedBoundary,
      blockedSegment,
      blockedPreamble,
      hoistableState,
      abortSet,
      keyPath,
      formatContext,
      context,
      treeContext,
      row,
      componentStack,
      thenableState: thenableState2
    };
    task.debugTask = debugTask;
    abortSet.add(task);
    return task;
  }
  function createReplayTask(request, thenableState2, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack, legacyContext, debugTask) {
    request.allPendingTasks++;
    blockedBoundary === null ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
    row !== null && row.pendingTasks++;
    replay.pendingTasks++;
    var task = {
      replay,
      node,
      childIndex,
      ping: function() {
        return pingTask(request, task);
      },
      blockedBoundary,
      blockedSegment: null,
      blockedPreamble: null,
      hoistableState,
      abortSet,
      keyPath,
      formatContext,
      context,
      treeContext,
      row,
      componentStack,
      thenableState: thenableState2
    };
    task.debugTask = debugTask;
    abortSet.add(task);
    return task;
  }
  function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
    return {
      status: PENDING,
      parentFlushed: false,
      id: -1,
      index,
      chunks: [],
      children: [],
      preambleChildren: [],
      parentFormatContext,
      boundary,
      lastPushedText,
      textEmbedded
    };
  }
  function getCurrentStackInDEV() {
    if (currentTaskInDEV === null || currentTaskInDEV.componentStack === null)
      return "";
    var componentStack = currentTaskInDEV.componentStack;
    try {
      var info = "";
      if (typeof componentStack.type === "string")
        info += describeBuiltInComponentFrame(componentStack.type);
      else if (typeof componentStack.type === "function") {
        if (!componentStack.owner) {
          var JSCompiler_temp_const = info, fn = componentStack.type, name = fn ? fn.displayName || fn.name : "";
          var JSCompiler_inline_result = name ? describeBuiltInComponentFrame(name) : "";
          info = JSCompiler_temp_const + JSCompiler_inline_result;
        }
      } else
        componentStack.owner || (info += describeComponentStackByType(componentStack.type));
      for (;componentStack; )
        JSCompiler_temp_const = null, componentStack.debugStack != null ? JSCompiler_temp_const = formatOwnerStack(componentStack.debugStack) : (JSCompiler_inline_result = componentStack, JSCompiler_inline_result.stack != null && (JSCompiler_temp_const = typeof JSCompiler_inline_result.stack !== "string" ? JSCompiler_inline_result.stack = formatOwnerStack(JSCompiler_inline_result.stack) : JSCompiler_inline_result.stack)), (componentStack = componentStack.owner) && JSCompiler_temp_const && (info += `
` + JSCompiler_temp_const);
      var JSCompiler_inline_result$jscomp$0 = info;
    } catch (x) {
      JSCompiler_inline_result$jscomp$0 = `
Error generating stack: ` + x.message + `
` + x.stack;
    }
    return JSCompiler_inline_result$jscomp$0;
  }
  function pushHaltedAwaitOnComponentStack(task, debugInfo) {
    if (debugInfo != null)
      for (var i = debugInfo.length - 1;0 <= i; i--) {
        var info = debugInfo[i];
        if (typeof info.name === "string")
          break;
        if (typeof info.time === "number")
          break;
        if (info.awaited != null) {
          var bestStack = info.debugStack == null ? info.awaited : info;
          if (bestStack.debugStack !== undefined) {
            task.componentStack = {
              parent: task.componentStack,
              type: info,
              owner: bestStack.owner,
              stack: bestStack.debugStack
            };
            task.debugTask = bestStack.debugTask;
            break;
          }
        }
      }
  }
  function pushServerComponentStack(task, debugInfo) {
    if (debugInfo != null)
      for (var i = 0;i < debugInfo.length; i++) {
        var componentInfo = debugInfo[i];
        typeof componentInfo.name === "string" && componentInfo.debugStack !== undefined && (task.componentStack = {
          parent: task.componentStack,
          type: componentInfo,
          owner: componentInfo.owner,
          stack: componentInfo.debugStack
        }, task.debugTask = componentInfo.debugTask);
      }
  }
  function pushComponentStack(task) {
    var node = task.node;
    if (typeof node === "object" && node !== null)
      switch (node.$$typeof) {
        case REACT_ELEMENT_TYPE:
          var { type, _owner: owner, _debugStack: stack } = node;
          pushServerComponentStack(task, node._debugInfo);
          task.debugTask = node._debugTask;
          task.componentStack = {
            parent: task.componentStack,
            type,
            owner,
            stack
          };
          break;
        case REACT_LAZY_TYPE:
          pushServerComponentStack(task, node._debugInfo);
          break;
        default:
          typeof node.then === "function" && pushServerComponentStack(task, node._debugInfo);
      }
  }
  function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
    return componentStack === null ? null : {
      parent: componentStack.parent,
      type: "Suspense Fallback",
      owner: componentStack.owner,
      stack: componentStack.stack
    };
  }
  function getThrownInfo(node$jscomp$0) {
    var errorInfo = {};
    node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
      configurable: true,
      enumerable: true,
      get: function() {
        try {
          var info = "", node = node$jscomp$0;
          do
            info += describeComponentStackByType(node.type), node = node.parent;
          while (node);
          var stack = info;
        } catch (x) {
          stack = `
Error generating stack: ` + x.message + `
` + x.stack;
        }
        Object.defineProperty(errorInfo, "componentStack", { value: stack });
        return stack;
      }
    });
    return errorInfo;
  }
  function encodeErrorForBoundary(boundary, digest, error, thrownInfo, wasAborted) {
    boundary.errorDigest = digest;
    error instanceof Error ? (digest = String(error.message), error = String(error.stack)) : (digest = typeof error === "object" && error !== null ? describeObjectForErrorMessage(error) : String(error), error = null);
    wasAborted = wasAborted ? `Switched to client rendering because the server rendering aborted due to:

` : `Switched to client rendering because the server rendering errored:

`;
    boundary.errorMessage = wasAborted + digest;
    boundary.errorStack = error !== null ? wasAborted + error : null;
    boundary.errorComponentStack = thrownInfo.componentStack;
  }
  function logRecoverableError(request, error, errorInfo, debugTask) {
    request = request.onError;
    error = debugTask ? debugTask.run(request.bind(null, error, errorInfo)) : request(error, errorInfo);
    if (error != null && typeof error !== "string")
      console.error('onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "%s" instead', typeof error);
    else
      return error;
  }
  function fatalError(request, error, errorInfo, debugTask) {
    errorInfo = request.onShellError;
    var onFatalError = request.onFatalError;
    debugTask ? (debugTask.run(errorInfo.bind(null, error)), debugTask.run(onFatalError.bind(null, error))) : (errorInfo(error), onFatalError(error));
    request.destination !== null ? (request.status = CLOSED, closeWithError(request.destination, error)) : (request.status = 13, request.fatalError = error);
  }
  function finishSuspenseListRow(request, row) {
    unblockSuspenseListRow(request, row.next, row.hoistables);
  }
  function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
    for (;unblockedRow !== null; ) {
      inheritedHoistables !== null && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
      var unblockedBoundaries = unblockedRow.boundaries;
      if (unblockedBoundaries !== null) {
        unblockedRow.boundaries = null;
        for (var i = 0;i < unblockedBoundaries.length; i++) {
          var unblockedBoundary = unblockedBoundaries[i];
          inheritedHoistables !== null && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
          finishedTask(request, unblockedBoundary, null, null);
        }
      }
      unblockedRow.pendingTasks--;
      if (0 < unblockedRow.pendingTasks)
        break;
      inheritedHoistables = unblockedRow.hoistables;
      unblockedRow = unblockedRow.next;
    }
  }
  function tryToResolveTogetherRow(request, togetherRow) {
    var boundaries = togetherRow.boundaries;
    if (boundaries !== null && togetherRow.pendingTasks === boundaries.length) {
      for (var allCompleteAndInlinable = true, i = 0;i < boundaries.length; i++) {
        var rowBoundary = boundaries[i];
        if (rowBoundary.pendingTasks !== 1 || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
          allCompleteAndInlinable = false;
          break;
        }
      }
      allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
    }
  }
  function createSuspenseListRow(previousRow) {
    var newRow = {
      pendingTasks: 1,
      boundaries: null,
      hoistables: createHoistableState(),
      inheritedHoistables: null,
      together: false,
      next: null
    };
    previousRow !== null && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
    return newRow;
  }
  function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
    var { keyPath: prevKeyPath, treeContext: prevTreeContext, row: prevRow, componentStack: previousComponentStack } = task;
    var previousDebugTask = task.debugTask;
    pushServerComponentStack(task, task.node.props.children._debugInfo);
    task.keyPath = keyPath;
    keyPath = rows.length;
    var previousSuspenseListRow = null;
    if (task.replay !== null) {
      var resumeSlots = task.replay.slots;
      if (resumeSlots !== null && typeof resumeSlots === "object")
        for (var n = 0;n < keyPath; n++) {
          var i = revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards" ? n : keyPath - 1 - n, node = rows[i];
          task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
          task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
          var resumeSegmentID = resumeSlots[i];
          typeof resumeSegmentID === "number" ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
          --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
        }
      else
        for (resumeSlots = 0;resumeSlots < keyPath; resumeSlots++)
          n = revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards" ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], warnForMissingKey(request, task, i), task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
    } else if (revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards")
      for (revealOrder = 0;revealOrder < keyPath; revealOrder++)
        resumeSlots = rows[revealOrder], warnForMissingKey(request, task, resumeSlots), task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, revealOrder), renderNode(request, task, resumeSlots, revealOrder), --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
    else {
      revealOrder = task.blockedSegment;
      resumeSlots = revealOrder.children.length;
      n = revealOrder.chunks.length;
      for (i = keyPath - 1;0 <= i; i--) {
        node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
        task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
        resumeSegmentID = createPendingSegment(request, n, null, task.formatContext, i === 0 ? revealOrder.lastPushedText : true, true);
        revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
        task.blockedSegment = resumeSegmentID;
        warnForMissingKey(request, task, node);
        try {
          renderNode(request, task, node, i), pushSegmentFinale(resumeSegmentID.chunks, request.renderState, resumeSegmentID.lastPushedText, resumeSegmentID.textEmbedded), resumeSegmentID.status = COMPLETED, finishedSegment(request, task.blockedBoundary, resumeSegmentID), --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
        } catch (thrownValue) {
          throw resumeSegmentID.status = request.status === 12 ? ABORTED : ERRORED, thrownValue;
        }
      }
      task.blockedSegment = revealOrder;
      revealOrder.lastPushedText = false;
    }
    prevRow !== null && previousSuspenseListRow !== null && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
    task.treeContext = prevTreeContext;
    task.row = prevRow;
    task.keyPath = prevKeyPath;
    task.componentStack = previousComponentStack;
    task.debugTask = previousDebugTask;
  }
  function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
    var prevThenableState = task.thenableState;
    task.thenableState = null;
    currentlyRenderingComponent = {};
    currentlyRenderingTask = task;
    currentlyRenderingRequest = request;
    currentlyRenderingKeyPath = keyPath;
    isInHookUserCodeInDev = false;
    actionStateCounter = localIdCounter = 0;
    actionStateMatchingIndex = -1;
    thenableIndexCounter = 0;
    thenableState = prevThenableState;
    for (request = callComponentInDEV(Component, props, secondArg);didScheduleRenderPhaseUpdate; )
      didScheduleRenderPhaseUpdate = false, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
    resetHooksState();
    return request;
  }
  var didWarnAboutBadClass = {};
  var didWarnAboutContextTypes = {};
  var didWarnAboutContextTypeOnFunctionComponent = {};
  var didWarnAboutGetDerivedStateOnFunctionComponent = {};
  var didWarnAboutReassigningProps = false;
  var didWarnAboutGenerators = false;
  var didWarnAboutMaps = false;
  function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex2) {
    var didEmitActionStateMarkers = false;
    if (actionStateCount !== 0 && request.formState !== null) {
      var segment = task.blockedSegment;
      if (segment !== null) {
        didEmitActionStateMarkers = true;
        segment = segment.chunks;
        for (var i = 0;i < actionStateCount; i++)
          i === actionStateMatchingIndex2 ? segment.push("<!--F!-->") : segment.push("<!--F-->");
      }
    }
    actionStateCount = task.keyPath;
    task.keyPath = keyPath;
    hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
    task.keyPath = actionStateCount;
  }
  function renderElement(request, task, keyPath, type, props, ref) {
    if (typeof type === "function")
      if (type.prototype && type.prototype.isReactComponent) {
        var newProps = props;
        if ("ref" in props) {
          newProps = {};
          for (var propName in props)
            propName !== "ref" && (newProps[propName] = props[propName]);
        }
        var defaultProps = type.defaultProps;
        if (defaultProps) {
          newProps === props && (newProps = assign({}, newProps, props));
          for (var _propName in defaultProps)
            newProps[_propName] === undefined && (newProps[_propName] = defaultProps[_propName]);
        }
        var resolvedProps = newProps;
        var context = emptyContextObject, contextType = type.contextType;
        if ("contextType" in type && contextType !== null && (contextType === undefined || contextType.$$typeof !== REACT_CONTEXT_TYPE) && !didWarnAboutInvalidateContextType.has(type)) {
          didWarnAboutInvalidateContextType.add(type);
          var addendum = contextType === undefined ? " However, it is set to undefined. This can be caused by a typo or by mixing up named and default imports. This can also happen due to a circular dependency, so try moving the createContext() call to a separate file." : typeof contextType !== "object" ? " However, it is set to a " + typeof contextType + "." : contextType.$$typeof === REACT_CONSUMER_TYPE ? " Did you accidentally pass the Context.Consumer instead?" : " However, it is set to an object with keys {" + Object.keys(contextType).join(", ") + "}.";
          console.error("%s defines an invalid contextType. contextType should point to the Context object returned by React.createContext().%s", getComponentNameFromType(type) || "Component", addendum);
        }
        typeof contextType === "object" && contextType !== null && (context = contextType._currentValue);
        var instance = new type(resolvedProps, context);
        if (typeof type.getDerivedStateFromProps === "function" && (instance.state === null || instance.state === undefined)) {
          var componentName = getComponentNameFromType(type) || "Component";
          didWarnAboutUninitializedState.has(componentName) || (didWarnAboutUninitializedState.add(componentName), console.error("`%s` uses `getDerivedStateFromProps` but its initial state is %s. This is not recommended. Instead, define the initial state by assigning an object to `this.state` in the constructor of `%s`. This ensures that `getDerivedStateFromProps` arguments have a consistent shape.", componentName, instance.state === null ? "null" : "undefined", componentName));
        }
        if (typeof type.getDerivedStateFromProps === "function" || typeof instance.getSnapshotBeforeUpdate === "function") {
          var foundWillMountName = null, foundWillReceivePropsName = null, foundWillUpdateName = null;
          typeof instance.componentWillMount === "function" && instance.componentWillMount.__suppressDeprecationWarning !== true ? foundWillMountName = "componentWillMount" : typeof instance.UNSAFE_componentWillMount === "function" && (foundWillMountName = "UNSAFE_componentWillMount");
          typeof instance.componentWillReceiveProps === "function" && instance.componentWillReceiveProps.__suppressDeprecationWarning !== true ? foundWillReceivePropsName = "componentWillReceiveProps" : typeof instance.UNSAFE_componentWillReceiveProps === "function" && (foundWillReceivePropsName = "UNSAFE_componentWillReceiveProps");
          typeof instance.componentWillUpdate === "function" && instance.componentWillUpdate.__suppressDeprecationWarning !== true ? foundWillUpdateName = "componentWillUpdate" : typeof instance.UNSAFE_componentWillUpdate === "function" && (foundWillUpdateName = "UNSAFE_componentWillUpdate");
          if (foundWillMountName !== null || foundWillReceivePropsName !== null || foundWillUpdateName !== null) {
            var _componentName = getComponentNameFromType(type) || "Component", newApiName = typeof type.getDerivedStateFromProps === "function" ? "getDerivedStateFromProps()" : "getSnapshotBeforeUpdate()";
            didWarnAboutLegacyLifecyclesAndDerivedState.has(_componentName) || (didWarnAboutLegacyLifecyclesAndDerivedState.add(_componentName), console.error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

%s uses %s but also contains the following legacy lifecycles:%s%s%s

The above lifecycles should be removed. Learn more about this warning here:
https://react.dev/link/unsafe-component-lifecycles`, _componentName, newApiName, foundWillMountName !== null ? `
  ` + foundWillMountName : "", foundWillReceivePropsName !== null ? `
  ` + foundWillReceivePropsName : "", foundWillUpdateName !== null ? `
  ` + foundWillUpdateName : ""));
          }
        }
        var name = getComponentNameFromType(type) || "Component";
        instance.render || (type.prototype && typeof type.prototype.render === "function" ? console.error("No `render` method found on the %s instance: did you accidentally return an object from the constructor?", name) : console.error("No `render` method found on the %s instance: you may have forgotten to define `render`.", name));
        !instance.getInitialState || instance.getInitialState.isReactClassApproved || instance.state || console.error("getInitialState was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Did you mean to define a state property instead?", name);
        instance.getDefaultProps && !instance.getDefaultProps.isReactClassApproved && console.error("getDefaultProps was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Use a static property to define defaultProps instead.", name);
        instance.contextType && console.error("contextType was defined as an instance property on %s. Use a static property to define contextType instead.", name);
        type.childContextTypes && !didWarnAboutChildContextTypes.has(type) && (didWarnAboutChildContextTypes.add(type), console.error("%s uses the legacy childContextTypes API which was removed in React 19. Use React.createContext() instead. (https://react.dev/link/legacy-context)", name));
        type.contextTypes && !didWarnAboutContextTypes$1.has(type) && (didWarnAboutContextTypes$1.add(type), console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)", name));
        typeof instance.componentShouldUpdate === "function" && console.error("%s has a method called componentShouldUpdate(). Did you mean shouldComponentUpdate()? The name is phrased as a question because the function is expected to return a value.", name);
        type.prototype && type.prototype.isPureReactComponent && typeof instance.shouldComponentUpdate !== "undefined" && console.error("%s has a method called shouldComponentUpdate(). shouldComponentUpdate should not be used when extending React.PureComponent. Please extend React.Component if shouldComponentUpdate is used.", getComponentNameFromType(type) || "A pure component");
        typeof instance.componentDidUnmount === "function" && console.error("%s has a method called componentDidUnmount(). But there is no such lifecycle method. Did you mean componentWillUnmount()?", name);
        typeof instance.componentDidReceiveProps === "function" && console.error("%s has a method called componentDidReceiveProps(). But there is no such lifecycle method. If you meant to update the state in response to changing props, use componentWillReceiveProps(). If you meant to fetch data or run side-effects or mutations after React has updated the UI, use componentDidUpdate().", name);
        typeof instance.componentWillRecieveProps === "function" && console.error("%s has a method called componentWillRecieveProps(). Did you mean componentWillReceiveProps()?", name);
        typeof instance.UNSAFE_componentWillRecieveProps === "function" && console.error("%s has a method called UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?", name);
        var hasMutatedProps = instance.props !== resolvedProps;
        instance.props !== undefined && hasMutatedProps && console.error("When calling super() in `%s`, make sure to pass up the same props that your component's constructor was passed.", name);
        instance.defaultProps && console.error("Setting defaultProps as an instance property on %s is not supported and will be ignored. Instead, define defaultProps as a static property on %s.", name, name);
        typeof instance.getSnapshotBeforeUpdate !== "function" || typeof instance.componentDidUpdate === "function" || didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.has(type) || (didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.add(type), console.error("%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). This component defines getSnapshotBeforeUpdate() only.", getComponentNameFromType(type)));
        typeof instance.getDerivedStateFromProps === "function" && console.error("%s: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.", name);
        typeof instance.getDerivedStateFromError === "function" && console.error("%s: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.", name);
        typeof type.getSnapshotBeforeUpdate === "function" && console.error("%s: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.", name);
        var state = instance.state;
        state && (typeof state !== "object" || isArrayImpl(state)) && console.error("%s.state: must be set to an object or null", name);
        typeof instance.getChildContext === "function" && typeof type.childContextTypes !== "object" && console.error("%s.getChildContext(): childContextTypes must be defined in order to use getChildContext().", name);
        var initialState = instance.state !== undefined ? instance.state : null;
        instance.updater = classComponentUpdater;
        instance.props = resolvedProps;
        instance.state = initialState;
        var internalInstance = { queue: [], replace: false };
        instance._reactInternals = internalInstance;
        var contextType$jscomp$0 = type.contextType;
        instance.context = typeof contextType$jscomp$0 === "object" && contextType$jscomp$0 !== null ? contextType$jscomp$0._currentValue : emptyContextObject;
        if (instance.state === resolvedProps) {
          var componentName$jscomp$0 = getComponentNameFromType(type) || "Component";
          didWarnAboutDirectlyAssigningPropsToState.has(componentName$jscomp$0) || (didWarnAboutDirectlyAssigningPropsToState.add(componentName$jscomp$0), console.error("%s: It is not recommended to assign props directly to state because updates to props won't be reflected in state. In most cases, it is better to use props directly.", componentName$jscomp$0));
        }
        var getDerivedStateFromProps = type.getDerivedStateFromProps;
        if (typeof getDerivedStateFromProps === "function") {
          var partialState = getDerivedStateFromProps(resolvedProps, initialState);
          if (partialState === undefined) {
            var componentName$jscomp$1 = getComponentNameFromType(type) || "Component";
            didWarnAboutUndefinedDerivedState.has(componentName$jscomp$1) || (didWarnAboutUndefinedDerivedState.add(componentName$jscomp$1), console.error("%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. You have returned undefined.", componentName$jscomp$1));
          }
          var JSCompiler_inline_result = partialState === null || partialState === undefined ? initialState : assign({}, initialState, partialState);
          instance.state = JSCompiler_inline_result;
        }
        if (typeof type.getDerivedStateFromProps !== "function" && typeof instance.getSnapshotBeforeUpdate !== "function" && (typeof instance.UNSAFE_componentWillMount === "function" || typeof instance.componentWillMount === "function")) {
          var oldState = instance.state;
          if (typeof instance.componentWillMount === "function") {
            if (instance.componentWillMount.__suppressDeprecationWarning !== true) {
              var componentName$jscomp$2 = getComponentNameFromType(type) || "Unknown";
              didWarnAboutDeprecatedWillMount[componentName$jscomp$2] || (console.warn(`componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.

Please update the following components: %s`, componentName$jscomp$2), didWarnAboutDeprecatedWillMount[componentName$jscomp$2] = true);
            }
            instance.componentWillMount();
          }
          typeof instance.UNSAFE_componentWillMount === "function" && instance.UNSAFE_componentWillMount();
          oldState !== instance.state && (console.error("%s.componentWillMount(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.", getComponentNameFromType(type) || "Component"), classComponentUpdater.enqueueReplaceState(instance, instance.state, null));
          if (internalInstance.queue !== null && 0 < internalInstance.queue.length) {
            var { queue: oldQueue, replace: oldReplace } = internalInstance;
            internalInstance.queue = null;
            internalInstance.replace = false;
            if (oldReplace && oldQueue.length === 1)
              instance.state = oldQueue[0];
            else {
              for (var nextState = oldReplace ? oldQueue[0] : instance.state, dontMutate = true, i = oldReplace ? 1 : 0;i < oldQueue.length; i++) {
                var partial = oldQueue[i], partialState$jscomp$0 = typeof partial === "function" ? partial.call(instance, nextState, resolvedProps, undefined) : partial;
                partialState$jscomp$0 != null && (dontMutate ? (dontMutate = false, nextState = assign({}, nextState, partialState$jscomp$0)) : assign(nextState, partialState$jscomp$0));
              }
              instance.state = nextState;
            }
          } else
            internalInstance.queue = null;
        }
        var nextChildren = callRenderInDEV(instance);
        if (request.status === 12)
          throw null;
        instance.props !== resolvedProps && (didWarnAboutReassigningProps || console.error("It looks like %s is reassigning its own `this.props` while rendering. This is not supported and can lead to confusing bugs.", getComponentNameFromType(type) || "a component"), didWarnAboutReassigningProps = true);
        var prevKeyPath = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, nextChildren, -1);
        task.keyPath = prevKeyPath;
      } else {
        if (type.prototype && typeof type.prototype.render === "function") {
          var componentName$jscomp$3 = getComponentNameFromType(type) || "Unknown";
          didWarnAboutBadClass[componentName$jscomp$3] || (console.error("The <%s /> component appears to have a render method, but doesn't extend React.Component. This is likely to cause errors. Change %s to extend React.Component instead.", componentName$jscomp$3, componentName$jscomp$3), didWarnAboutBadClass[componentName$jscomp$3] = true);
        }
        var value = renderWithHooks(request, task, keyPath, type, props, undefined);
        if (request.status === 12)
          throw null;
        var hasId = localIdCounter !== 0, actionStateCount = actionStateCounter, actionStateMatchingIndex$jscomp$0 = actionStateMatchingIndex;
        if (type.contextTypes) {
          var _componentName$jscomp$0 = getComponentNameFromType(type) || "Unknown";
          didWarnAboutContextTypes[_componentName$jscomp$0] || (didWarnAboutContextTypes[_componentName$jscomp$0] = true, console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)", _componentName$jscomp$0));
        }
        type && type.childContextTypes && console.error(`childContextTypes cannot be defined on a function component.
  %s.childContextTypes = ...`, type.displayName || type.name || "Component");
        if (typeof type.getDerivedStateFromProps === "function") {
          var componentName$jscomp$4 = getComponentNameFromType(type) || "Unknown";
          didWarnAboutGetDerivedStateOnFunctionComponent[componentName$jscomp$4] || (console.error("%s: Function components do not support getDerivedStateFromProps.", componentName$jscomp$4), didWarnAboutGetDerivedStateOnFunctionComponent[componentName$jscomp$4] = true);
        }
        if (typeof type.contextType === "object" && type.contextType !== null) {
          var _componentName2 = getComponentNameFromType(type) || "Unknown";
          didWarnAboutContextTypeOnFunctionComponent[_componentName2] || (console.error("%s: Function components do not support contextType.", _componentName2), didWarnAboutContextTypeOnFunctionComponent[_componentName2] = true);
        }
        finishFunctionComponent(request, task, keyPath, value, hasId, actionStateCount, actionStateMatchingIndex$jscomp$0);
      }
    else if (typeof type === "string") {
      var segment = task.blockedSegment;
      if (segment === null) {
        var children = props.children, prevContext = task.formatContext, prevKeyPath$jscomp$0 = task.keyPath;
        task.formatContext = getChildFormatContext(prevContext, type, props);
        task.keyPath = keyPath;
        renderNode(request, task, children, -1);
        task.formatContext = prevContext;
        task.keyPath = prevKeyPath$jscomp$0;
      } else {
        var _children = pushStartInstance(segment.chunks, type, props, request.resumableState, request.renderState, task.blockedPreamble, task.hoistableState, task.formatContext, segment.lastPushedText);
        segment.lastPushedText = false;
        var { formatContext: _prevContext2, keyPath: _prevKeyPath3 } = task;
        task.keyPath = keyPath;
        if ((task.formatContext = getChildFormatContext(_prevContext2, type, props)).insertionMode === HTML_HEAD_MODE) {
          var preambleSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
          segment.preambleChildren.push(preambleSegment);
          task.blockedSegment = preambleSegment;
          try {
            preambleSegment.status = 6, renderNode(request, task, _children, -1), pushSegmentFinale(preambleSegment.chunks, request.renderState, preambleSegment.lastPushedText, preambleSegment.textEmbedded), preambleSegment.status = COMPLETED, finishedSegment(request, task.blockedBoundary, preambleSegment);
          } finally {
            task.blockedSegment = segment;
          }
        } else
          renderNode(request, task, _children, -1);
        task.formatContext = _prevContext2;
        task.keyPath = _prevKeyPath3;
        a: {
          var target = segment.chunks, resumableState = request.resumableState;
          switch (type) {
            case "title":
            case "style":
            case "script":
            case "area":
            case "base":
            case "br":
            case "col":
            case "embed":
            case "hr":
            case "img":
            case "input":
            case "keygen":
            case "link":
            case "meta":
            case "param":
            case "source":
            case "track":
            case "wbr":
              break a;
            case "body":
              if (_prevContext2.insertionMode <= HTML_HTML_MODE) {
                resumableState.hasBody = true;
                break a;
              }
              break;
            case "html":
              if (_prevContext2.insertionMode === ROOT_HTML_MODE) {
                resumableState.hasHtml = true;
                break a;
              }
              break;
            case "head":
              if (_prevContext2.insertionMode <= HTML_HTML_MODE)
                break a;
          }
          target.push(endChunkForTag(type));
        }
        segment.lastPushedText = false;
      }
    } else {
      switch (type) {
        case REACT_LEGACY_HIDDEN_TYPE:
        case REACT_STRICT_MODE_TYPE:
        case REACT_PROFILER_TYPE:
        case REACT_FRAGMENT_TYPE:
          var prevKeyPath$jscomp$1 = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, props.children, -1);
          task.keyPath = prevKeyPath$jscomp$1;
          return;
        case REACT_ACTIVITY_TYPE:
          var segment$jscomp$0 = task.blockedSegment;
          if (segment$jscomp$0 === null) {
            if (props.mode !== "hidden") {
              var prevKeyPath$jscomp$2 = task.keyPath;
              task.keyPath = keyPath;
              renderNode(request, task, props.children, -1);
              task.keyPath = prevKeyPath$jscomp$2;
            }
          } else if (props.mode !== "hidden") {
            segment$jscomp$0.chunks.push("<!--&-->");
            segment$jscomp$0.lastPushedText = false;
            var _prevKeyPath4 = task.keyPath;
            task.keyPath = keyPath;
            renderNode(request, task, props.children, -1);
            task.keyPath = _prevKeyPath4;
            segment$jscomp$0.chunks.push("<!--/&-->");
            segment$jscomp$0.lastPushedText = false;
          }
          return;
        case REACT_SUSPENSE_LIST_TYPE:
          a: {
            var { children: children$jscomp$0, revealOrder } = props;
            if (revealOrder === "forwards" || revealOrder === "backwards" || revealOrder === "unstable_legacy-backwards") {
              if (isArrayImpl(children$jscomp$0)) {
                renderSuspenseListRows(request, task, keyPath, children$jscomp$0, revealOrder);
                break a;
              }
              var iteratorFn = getIteratorFn(children$jscomp$0);
              if (iteratorFn) {
                var iterator = iteratorFn.call(children$jscomp$0);
                if (iterator) {
                  validateIterable(task, children$jscomp$0, -1, iterator, iteratorFn);
                  var step = iterator.next();
                  if (!step.done) {
                    var rows = [];
                    do
                      rows.push(step.value), step = iterator.next();
                    while (!step.done);
                    renderSuspenseListRows(request, task, keyPath, children$jscomp$0, revealOrder);
                  }
                  break a;
                }
              }
            }
            if (revealOrder === "together") {
              var { keyPath: _prevKeyPath2, row: prevRow } = task, newRow = task.row = createSuspenseListRow(null);
              newRow.boundaries = [];
              newRow.together = true;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, children$jscomp$0, -1);
              --newRow.pendingTasks === 0 && finishSuspenseListRow(request, newRow);
              task.keyPath = _prevKeyPath2;
              task.row = prevRow;
              prevRow !== null && 0 < newRow.pendingTasks && (prevRow.pendingTasks++, newRow.next = prevRow);
            } else {
              var prevKeyPath$jscomp$3 = task.keyPath;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, children$jscomp$0, -1);
              task.keyPath = prevKeyPath$jscomp$3;
            }
          }
          return;
        case REACT_VIEW_TRANSITION_TYPE:
        case REACT_SCOPE_TYPE:
          throw Error("ReactDOMServer does not yet support scope components.");
        case REACT_SUSPENSE_TYPE:
          a:
            if (task.replay !== null) {
              var { keyPath: _prevKeyPath, formatContext: _prevContext, row: _prevRow } = task;
              task.keyPath = keyPath;
              task.formatContext = getSuspenseContentFormatContext(request.resumableState, _prevContext);
              task.row = null;
              var _content = props.children;
              try {
                renderNode(request, task, _content, -1);
              } finally {
                task.keyPath = _prevKeyPath, task.formatContext = _prevContext, task.row = _prevRow;
              }
            } else {
              var { keyPath: prevKeyPath$jscomp$4, formatContext: prevContext$jscomp$0, row: prevRow$jscomp$0, blockedBoundary: parentBoundary, blockedPreamble: parentPreamble, hoistableState: parentHoistableState, blockedSegment: parentSegment } = task, fallback = props.fallback, content = props.children, fallbackAbortSet = new Set;
              var newBoundary = task.formatContext.insertionMode < HTML_MODE ? createSuspenseBoundary(request, task.row, fallbackAbortSet, createPreambleState(), createPreambleState()) : createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
              request.trackedPostpones !== null && (newBoundary.trackedContentKeyPath = keyPath);
              var boundarySegment = createPendingSegment(request, parentSegment.chunks.length, newBoundary, task.formatContext, false, false);
              parentSegment.children.push(boundarySegment);
              parentSegment.lastPushedText = false;
              var contentRootSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
              contentRootSegment.parentFlushed = true;
              if (request.trackedPostpones !== null) {
                var suspenseComponentStack = task.componentStack, fallbackKeyPath = [keyPath[0], "Suspense Fallback", keyPath[2]], fallbackReplayNode = [
                  fallbackKeyPath[1],
                  fallbackKeyPath[2],
                  [],
                  null
                ];
                request.trackedPostpones.workingMap.set(fallbackKeyPath, fallbackReplayNode);
                newBoundary.trackedFallbackNode = fallbackReplayNode;
                task.blockedSegment = boundarySegment;
                task.blockedPreamble = newBoundary.fallbackPreamble;
                task.keyPath = fallbackKeyPath;
                task.formatContext = getSuspenseFallbackFormatContext(request.resumableState, prevContext$jscomp$0);
                task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(suspenseComponentStack);
                boundarySegment.status = 6;
                try {
                  renderNode(request, task, fallback, -1), pushSegmentFinale(boundarySegment.chunks, request.renderState, boundarySegment.lastPushedText, boundarySegment.textEmbedded), boundarySegment.status = COMPLETED, finishedSegment(request, parentBoundary, boundarySegment);
                } catch (thrownValue) {
                  throw boundarySegment.status = request.status === 12 ? ABORTED : ERRORED, thrownValue;
                } finally {
                  task.blockedSegment = parentSegment, task.blockedPreamble = parentPreamble, task.keyPath = prevKeyPath$jscomp$4, task.formatContext = prevContext$jscomp$0;
                }
                var suspendedPrimaryTask = createRenderTask(request, null, content, -1, newBoundary, contentRootSegment, newBoundary.contentPreamble, newBoundary.contentState, task.abortSet, keyPath, getSuspenseContentFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, null, suspenseComponentStack, emptyContextObject, task.debugTask);
                pushComponentStack(suspendedPrimaryTask);
                request.pingedTasks.push(suspendedPrimaryTask);
              } else {
                task.blockedBoundary = newBoundary;
                task.blockedPreamble = newBoundary.contentPreamble;
                task.hoistableState = newBoundary.contentState;
                task.blockedSegment = contentRootSegment;
                task.keyPath = keyPath;
                task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext$jscomp$0);
                task.row = null;
                contentRootSegment.status = 6;
                try {
                  if (renderNode(request, task, content, -1), pushSegmentFinale(contentRootSegment.chunks, request.renderState, contentRootSegment.lastPushedText, contentRootSegment.textEmbedded), contentRootSegment.status = COMPLETED, finishedSegment(request, newBoundary, contentRootSegment), queueCompletedSegment(newBoundary, contentRootSegment), newBoundary.pendingTasks === 0 && newBoundary.status === PENDING) {
                    if (newBoundary.status = COMPLETED, !isEligibleForOutlining(request, newBoundary)) {
                      prevRow$jscomp$0 !== null && --prevRow$jscomp$0.pendingTasks === 0 && finishSuspenseListRow(request, prevRow$jscomp$0);
                      request.pendingRootTasks === 0 && task.blockedPreamble && preparePreamble(request);
                      break a;
                    }
                  } else
                    prevRow$jscomp$0 !== null && prevRow$jscomp$0.together && tryToResolveTogetherRow(request, prevRow$jscomp$0);
                } catch (thrownValue$2) {
                  newBoundary.status = CLIENT_RENDERED;
                  if (request.status === 12) {
                    contentRootSegment.status = ABORTED;
                    var error = request.fatalError;
                  } else
                    contentRootSegment.status = ERRORED, error = thrownValue$2;
                  var thrownInfo = getThrownInfo(task.componentStack);
                  var errorDigest = logRecoverableError(request, error, thrownInfo, task.debugTask);
                  encodeErrorForBoundary(newBoundary, errorDigest, error, thrownInfo, false);
                  untrackBoundary(request, newBoundary);
                } finally {
                  task.blockedBoundary = parentBoundary, task.blockedPreamble = parentPreamble, task.hoistableState = parentHoistableState, task.blockedSegment = parentSegment, task.keyPath = prevKeyPath$jscomp$4, task.formatContext = prevContext$jscomp$0, task.row = prevRow$jscomp$0;
                }
                var suspendedFallbackTask = createRenderTask(request, null, fallback, -1, parentBoundary, boundarySegment, newBoundary.fallbackPreamble, newBoundary.fallbackState, fallbackAbortSet, [keyPath[0], "Suspense Fallback", keyPath[2]], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack), emptyContextObject, task.debugTask);
                pushComponentStack(suspendedFallbackTask);
                request.pingedTasks.push(suspendedFallbackTask);
              }
            }
          return;
      }
      if (typeof type === "object" && type !== null)
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            if ("ref" in props) {
              var propsWithoutRef = {};
              for (var key in props)
                key !== "ref" && (propsWithoutRef[key] = props[key]);
            } else
              propsWithoutRef = props;
            var children$jscomp$1 = renderWithHooks(request, task, keyPath, type.render, propsWithoutRef, ref);
            finishFunctionComponent(request, task, keyPath, children$jscomp$1, localIdCounter !== 0, actionStateCounter, actionStateMatchingIndex);
            return;
          case REACT_MEMO_TYPE:
            renderElement(request, task, keyPath, type.type, props, ref);
            return;
          case REACT_CONTEXT_TYPE:
            var { value: value$jscomp$0, children: children$jscomp$2 } = props;
            var prevSnapshot = task.context;
            var prevKeyPath$jscomp$5 = task.keyPath;
            var prevValue = type._currentValue;
            type._currentValue = value$jscomp$0;
            type._currentRenderer !== undefined && type._currentRenderer !== null && type._currentRenderer !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.");
            type._currentRenderer = rendererSigil;
            var prevNode = currentActiveSnapshot, newNode = {
              parent: prevNode,
              depth: prevNode === null ? 0 : prevNode.depth + 1,
              context: type,
              parentValue: prevValue,
              value: value$jscomp$0
            };
            currentActiveSnapshot = newNode;
            task.context = newNode;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, children$jscomp$2, -1);
            var prevSnapshot$jscomp$0 = currentActiveSnapshot;
            if (prevSnapshot$jscomp$0 === null)
              throw Error("Tried to pop a Context at the root of the app. This is a bug in React.");
            prevSnapshot$jscomp$0.context !== type && console.error("The parent context is not the expected context. This is probably a bug in React.");
            prevSnapshot$jscomp$0.context._currentValue = prevSnapshot$jscomp$0.parentValue;
            type._currentRenderer !== undefined && type._currentRenderer !== null && type._currentRenderer !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.");
            type._currentRenderer = rendererSigil;
            var JSCompiler_inline_result$jscomp$0 = currentActiveSnapshot = prevSnapshot$jscomp$0.parent;
            task.context = JSCompiler_inline_result$jscomp$0;
            task.keyPath = prevKeyPath$jscomp$5;
            prevSnapshot !== task.context && console.error("Popping the context provider did not return back to the original snapshot. This is a bug in React.");
            return;
          case REACT_CONSUMER_TYPE:
            var context$jscomp$0 = type._context, render = props.children;
            typeof render !== "function" && console.error("A context consumer was rendered with multiple children, or a child that isn't a function. A context consumer expects a single child that is a function. If you did pass a function, make sure there is no trailing or leading whitespace around it.");
            var newChildren = render(context$jscomp$0._currentValue), prevKeyPath$jscomp$6 = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, newChildren, -1);
            task.keyPath = prevKeyPath$jscomp$6;
            return;
          case REACT_LAZY_TYPE:
            var Component = callLazyInitInDEV(type);
            if (request.status === 12)
              throw null;
            renderElement(request, task, keyPath, Component, props, ref);
            return;
        }
      var info = "";
      if (type === undefined || typeof type === "object" && type !== null && Object.keys(type).length === 0)
        info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
      throw Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((type == null ? type : typeof type) + "." + info));
    }
  }
  function resumeNode(request, task, segmentId, node, childIndex) {
    var { replay: prevReplay, blockedBoundary } = task, resumedSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
    resumedSegment.id = segmentId;
    resumedSegment.parentFlushed = true;
    try {
      task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = COMPLETED, finishedSegment(request, blockedBoundary, resumedSegment), blockedBoundary === null ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
    } finally {
      task.replay = prevReplay, task.blockedSegment = null;
    }
  }
  function replayElement(request, task, keyPath, name, keyOrIndex, childIndex, type, props, ref, replay) {
    childIndex = replay.nodes;
    for (var i = 0;i < childIndex.length; i++) {
      var node = childIndex[i];
      if (keyOrIndex === node[1]) {
        if (node.length === 4) {
          if (name !== null && name !== node[0])
            throw Error("Expected the resume to render <" + node[0] + "> in this slot but instead it rendered <" + name + ">. The tree doesn't match so React will fallback to client rendering.");
          var childNodes = node[2];
          name = node[3];
          keyOrIndex = task.node;
          task.replay = { nodes: childNodes, slots: name, pendingTasks: 1 };
          try {
            renderElement(request, task, keyPath, type, props, ref);
            if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
              throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
            task.replay.pendingTasks--;
          } catch (x) {
            if (typeof x === "object" && x !== null && (x === SuspenseException || typeof x.then === "function"))
              throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(i, 1), x;
            task.replay.pendingTasks--;
            type = getThrownInfo(task.componentStack);
            props = request;
            request = task.blockedBoundary;
            keyPath = x;
            ref = name;
            name = logRecoverableError(props, keyPath, type, task.debugTask);
            abortRemainingReplayNodes(props, request, childNodes, ref, keyPath, name, type, false);
          }
          task.replay = replay;
        } else {
          if (type !== REACT_SUSPENSE_TYPE)
            throw Error("Expected the resume to render <Suspense> in this slot but instead it rendered <" + (getComponentNameFromType(type) || "Unknown") + ">. The tree doesn't match so React will fallback to client rendering.");
          a: {
            replay = undefined;
            name = node[5];
            type = node[2];
            ref = node[3];
            keyOrIndex = node[4] === null ? [] : node[4][2];
            node = node[4] === null ? null : node[4][3];
            var { keyPath: prevKeyPath, formatContext: prevContext, row: prevRow, replay: previousReplaySet, blockedBoundary: parentBoundary, hoistableState: parentHoistableState } = task, content = props.children, fallback = props.fallback, fallbackAbortSet = new Set;
            props = task.formatContext.insertionMode < HTML_MODE ? createSuspenseBoundary(request, task.row, fallbackAbortSet, createPreambleState(), createPreambleState()) : createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
            props.parentFlushed = true;
            props.rootSegmentID = name;
            task.blockedBoundary = props;
            task.hoistableState = props.contentState;
            task.keyPath = keyPath;
            task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext);
            task.row = null;
            task.replay = { nodes: type, slots: ref, pendingTasks: 1 };
            try {
              renderNode(request, task, content, -1);
              if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
                throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
              task.replay.pendingTasks--;
              if (props.pendingTasks === 0 && props.status === PENDING) {
                props.status = COMPLETED;
                request.completedBoundaries.push(props);
                break a;
              }
            } catch (error) {
              props.status = CLIENT_RENDERED, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(request, error, childNodes, task.debugTask), encodeErrorForBoundary(props, replay, error, childNodes, false), task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
            } finally {
              task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
            }
            props = createReplayTask(request, null, { nodes: keyOrIndex, slots: node, pendingTasks: 0 }, fallback, -1, parentBoundary, props.fallbackState, fallbackAbortSet, [keyPath[0], "Suspense Fallback", keyPath[2]], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack), emptyContextObject, task.debugTask);
            pushComponentStack(props);
            request.pingedTasks.push(props);
          }
        }
        childIndex.splice(i, 1);
        break;
      }
    }
  }
  function validateIterable(task, iterable, childIndex, iterator, iteratorFn) {
    if (iterator === iterable) {
      if (childIndex !== -1 || task.componentStack === null || typeof task.componentStack.type !== "function" || Object.prototype.toString.call(task.componentStack.type) !== "[object GeneratorFunction]" || Object.prototype.toString.call(iterator) !== "[object Generator]")
        didWarnAboutGenerators || console.error("Using Iterators as children is unsupported and will likely yield unexpected results because enumerating a generator mutates it. You may convert it to an array with `Array.from()` or the `[...spread]` operator before rendering. You can also use an Iterable that can iterate multiple times over the same items."), didWarnAboutGenerators = true;
    } else
      iterable.entries !== iteratorFn || didWarnAboutMaps || (console.error("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = true);
  }
  function renderNodeDestructive(request, task, node, childIndex) {
    task.replay !== null && typeof task.replay.slots === "number" ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, childIndex = task.debugTask, pushComponentStack(task), retryNode(request, task), task.componentStack = node, task.debugTask = childIndex);
  }
  function retryNode(request, task) {
    var { node, childIndex } = task;
    if (node !== null) {
      if (typeof node === "object") {
        switch (node.$$typeof) {
          case REACT_ELEMENT_TYPE:
            var { type, key } = node;
            node = node.props;
            var refProp = node.ref;
            refProp = refProp !== undefined ? refProp : null;
            var debugTask = task.debugTask, name = getComponentNameFromType(type);
            key = key == null ? childIndex === -1 ? 0 : childIndex : key;
            var keyPath = [task.keyPath, name, key];
            task.replay !== null ? debugTask ? debugTask.run(replayElement.bind(null, request, task, keyPath, name, key, childIndex, type, node, refProp, task.replay)) : replayElement(request, task, keyPath, name, key, childIndex, type, node, refProp, task.replay) : debugTask ? debugTask.run(renderElement.bind(null, request, task, keyPath, type, node, refProp)) : renderElement(request, task, keyPath, type, node, refProp);
            return;
          case REACT_PORTAL_TYPE:
            throw Error("Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render.");
          case REACT_LAZY_TYPE:
            type = callLazyInitInDEV(node);
            if (request.status === 12)
              throw null;
            renderNodeDestructive(request, task, type, childIndex);
            return;
        }
        if (isArrayImpl(node)) {
          renderChildrenArray(request, task, node, childIndex);
          return;
        }
        if (key = getIteratorFn(node)) {
          if (type = key.call(node)) {
            validateIterable(task, node, childIndex, type, key);
            node = type.next();
            if (!node.done) {
              key = [];
              do
                key.push(node.value), node = type.next();
              while (!node.done);
              renderChildrenArray(request, task, key, childIndex);
            }
            return;
          }
        }
        if (typeof node.then === "function")
          return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
        if (node.$$typeof === REACT_CONTEXT_TYPE)
          return renderNodeDestructive(request, task, node._currentValue, childIndex);
        request = Object.prototype.toString.call(node);
        throw Error("Objects are not valid as a React child (found: " + (request === "[object Object]" ? "object with keys {" + Object.keys(node).join(", ") + "}" : request) + "). If you meant to render a collection of children, use an array instead.");
      }
      typeof node === "string" ? (task = task.blockedSegment, task !== null && (task.lastPushedText = pushTextInstance(task.chunks, node, request.renderState, task.lastPushedText))) : typeof node === "number" || typeof node === "bigint" ? (task = task.blockedSegment, task !== null && (task.lastPushedText = pushTextInstance(task.chunks, "" + node, request.renderState, task.lastPushedText))) : (typeof node === "function" && (request = node.displayName || node.name || "Component", console.error("Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.", request, request)), typeof node === "symbol" && console.error(`Symbols are not valid as a React child.
  %s`, String(node)));
    }
  }
  function warnForMissingKey(request, task, child) {
    if (child !== null && typeof child === "object" && (child.$$typeof === REACT_ELEMENT_TYPE || child.$$typeof === REACT_PORTAL_TYPE) && child._store && (!child._store.validated && child.key == null || child._store.validated === 2)) {
      if (typeof child._store !== "object")
        throw Error("React Component in warnForMissingKey should have a _store. This error is likely caused by a bug in React. Please file an issue.");
      child._store.validated = 1;
      var didWarnForKey = request.didWarnForKey;
      didWarnForKey == null && (didWarnForKey = request.didWarnForKey = new WeakSet);
      request = task.componentStack;
      if (request !== null && !didWarnForKey.has(request)) {
        didWarnForKey.add(request);
        var componentName = getComponentNameFromType(child.type);
        didWarnForKey = child._owner;
        var parentOwner = request.owner;
        request = "";
        if (parentOwner && typeof parentOwner.type !== "undefined") {
          var name = getComponentNameFromType(parentOwner.type);
          name && (request = `

Check the render method of \`` + name + "`.");
        }
        request || componentName && (request = `

Check the top-level render call using <` + componentName + ">.");
        componentName = "";
        didWarnForKey != null && parentOwner !== didWarnForKey && (parentOwner = null, typeof didWarnForKey.type !== "undefined" ? parentOwner = getComponentNameFromType(didWarnForKey.type) : typeof didWarnForKey.name === "string" && (parentOwner = didWarnForKey.name), parentOwner && (componentName = " It was passed a child from " + parentOwner + "."));
        didWarnForKey = task.componentStack;
        task.componentStack = {
          parent: task.componentStack,
          type: child.type,
          owner: child._owner,
          stack: child._debugStack
        };
        console.error('Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.', request, componentName);
        task.componentStack = didWarnForKey;
      }
    }
  }
  function renderChildrenArray(request, task, children, childIndex) {
    var { keyPath: prevKeyPath, componentStack: previousComponentStack } = task;
    var previousDebugTask = task.debugTask;
    pushServerComponentStack(task, task.node._debugInfo);
    if (childIndex !== -1 && (task.keyPath = [task.keyPath, "Fragment", childIndex], task.replay !== null)) {
      for (var replay = task.replay, replayNodes = replay.nodes, j = 0;j < replayNodes.length; j++) {
        var node = replayNodes[j];
        if (node[1] === childIndex) {
          childIndex = node[2];
          node = node[3];
          task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
          try {
            renderChildrenArray(request, task, children, -1);
            if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
              throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
            task.replay.pendingTasks--;
          } catch (x) {
            if (typeof x === "object" && x !== null && (x === SuspenseException || typeof x.then === "function"))
              throw x;
            task.replay.pendingTasks--;
            var thrownInfo = getThrownInfo(task.componentStack);
            children = task.blockedBoundary;
            var error = x, resumeSlots = node;
            node = logRecoverableError(request, error, thrownInfo, task.debugTask);
            abortRemainingReplayNodes(request, children, childIndex, resumeSlots, error, node, thrownInfo, false);
          }
          task.replay = replay;
          replayNodes.splice(j, 1);
          break;
        }
      }
      task.keyPath = prevKeyPath;
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
      return;
    }
    replay = task.treeContext;
    replayNodes = children.length;
    if (task.replay !== null && (j = task.replay.slots, j !== null && typeof j === "object")) {
      for (childIndex = 0;childIndex < replayNodes; childIndex++)
        node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), error = j[childIndex], typeof error === "number" ? (resumeNode(request, task, error, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
      task.treeContext = replay;
      task.keyPath = prevKeyPath;
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
      return;
    }
    for (j = 0;j < replayNodes; j++)
      childIndex = children[j], warnForMissingKey(request, task, childIndex), task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
    task.treeContext = replay;
    task.keyPath = prevKeyPath;
    task.componentStack = previousComponentStack;
    task.debugTask = previousDebugTask;
  }
  function trackPostponedBoundary(request, trackedPostpones, boundary) {
    boundary.status = POSTPONED;
    boundary.rootSegmentID = request.nextSegmentId++;
    request = boundary.trackedContentKeyPath;
    if (request === null)
      throw Error("It should not be possible to postpone at the root. This is a bug in React.");
    var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
    if (boundaryNode === undefined)
      return boundary = [
        request[1],
        request[2],
        children,
        null,
        fallbackReplayNode,
        boundary.rootSegmentID
      ], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
    boundaryNode[4] = fallbackReplayNode;
    boundaryNode[5] = boundary.rootSegmentID;
    return boundaryNode;
  }
  function trackPostpone(request, trackedPostpones, task, segment) {
    segment.status = POSTPONED;
    var { keyPath, blockedBoundary: boundary } = task;
    if (boundary === null)
      segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, request.completedRootSegment !== null && (request.completedRootSegment.status = POSTPONED);
    else {
      if (boundary !== null && boundary.status === PENDING) {
        var boundaryNode = trackPostponedBoundary(request, trackedPostpones, boundary);
        if (boundary.trackedContentKeyPath === keyPath && task.childIndex === -1) {
          segment.id === -1 && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
          boundaryNode[3] = segment.id;
          return;
        }
      }
      segment.id === -1 && (segment.id = segment.parentFlushed && boundary !== null ? boundary.rootSegmentID : request.nextSegmentId++);
      if (task.childIndex === -1)
        keyPath === null ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), task === undefined ? (task = [keyPath[1], keyPath[2], [], segment.id], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
      else {
        if (keyPath === null)
          if (request = trackedPostpones.rootSlots, request === null)
            request = trackedPostpones.rootSlots = {};
          else {
            if (typeof request === "number")
              throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.");
          }
        else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), boundaryNode === undefined)
          request = {}, boundaryNode = [keyPath[1], keyPath[2], [], request], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
        else if (request = boundaryNode[3], request === null)
          request = boundaryNode[3] = {};
        else if (typeof request === "number")
          throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.");
        request[task.childIndex] = segment.id;
      }
    }
  }
  function untrackBoundary(request, boundary) {
    request = request.trackedPostpones;
    request !== null && (boundary = boundary.trackedContentKeyPath, boundary !== null && (boundary = request.workingMap.get(boundary), boundary !== undefined && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
  }
  function spawnNewSuspendedReplayTask(request, task, thenableState2) {
    return createReplayTask(request, thenableState2, task.replay, task.node, task.childIndex, task.blockedBoundary, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack, emptyContextObject, task.debugTask);
  }
  function spawnNewSuspendedRenderTask(request, task, thenableState2) {
    var segment = task.blockedSegment, newSegment = createPendingSegment(request, segment.chunks.length, null, task.formatContext, segment.lastPushedText, true);
    segment.children.push(newSegment);
    segment.lastPushedText = false;
    return createRenderTask(request, thenableState2, task.node, task.childIndex, task.blockedBoundary, newSegment, task.blockedPreamble, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack, emptyContextObject, task.debugTask);
  }
  function renderNode(request, task, node, childIndex) {
    var { formatContext: previousFormatContext, context: previousContext, keyPath: previousKeyPath, treeContext: previousTreeContext, componentStack: previousComponentStack, debugTask: previousDebugTask, blockedSegment: segment } = task;
    if (segment === null) {
      segment = task.replay;
      try {
        return renderNodeDestructive(request, task, node, childIndex);
      } catch (thrownValue) {
        if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, request.status !== 12 && typeof node === "object" && node !== null) {
          if (typeof node.then === "function") {
            childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
            request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
            node.then(request, request);
            task.formatContext = previousFormatContext;
            task.context = previousContext;
            task.keyPath = previousKeyPath;
            task.treeContext = previousTreeContext;
            task.componentStack = previousComponentStack;
            task.replay = segment;
            task.debugTask = previousDebugTask;
            switchContext(previousContext);
            return;
          }
          if (node.message === "Maximum call stack size exceeded") {
            node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
            node = spawnNewSuspendedReplayTask(request, task, node);
            request.pingedTasks.push(node);
            task.formatContext = previousFormatContext;
            task.context = previousContext;
            task.keyPath = previousKeyPath;
            task.treeContext = previousTreeContext;
            task.componentStack = previousComponentStack;
            task.replay = segment;
            task.debugTask = previousDebugTask;
            switchContext(previousContext);
            return;
          }
        }
      }
    } else {
      var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
      try {
        return renderNodeDestructive(request, task, node, childIndex);
      } catch (thrownValue$3) {
        if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$3 === SuspenseException ? getSuspendedThenable() : thrownValue$3, request.status !== 12 && typeof node === "object" && node !== null) {
          if (typeof node.then === "function") {
            segment = node;
            node = thrownValue$3 === SuspenseException ? getThenableStateAfterSuspending() : null;
            request = spawnNewSuspendedRenderTask(request, task, node).ping;
            segment.then(request, request);
            task.formatContext = previousFormatContext;
            task.context = previousContext;
            task.keyPath = previousKeyPath;
            task.treeContext = previousTreeContext;
            task.componentStack = previousComponentStack;
            task.debugTask = previousDebugTask;
            switchContext(previousContext);
            return;
          }
          if (node.message === "Maximum call stack size exceeded") {
            segment = thrownValue$3 === SuspenseException ? getThenableStateAfterSuspending() : null;
            segment = spawnNewSuspendedRenderTask(request, task, segment);
            request.pingedTasks.push(segment);
            task.formatContext = previousFormatContext;
            task.context = previousContext;
            task.keyPath = previousKeyPath;
            task.treeContext = previousTreeContext;
            task.componentStack = previousComponentStack;
            task.debugTask = previousDebugTask;
            switchContext(previousContext);
            return;
          }
        }
      }
    }
    task.formatContext = previousFormatContext;
    task.context = previousContext;
    task.keyPath = previousKeyPath;
    task.treeContext = previousTreeContext;
    switchContext(previousContext);
    throw node;
  }
  function abortTaskSoft(task) {
    var { blockedBoundary: boundary, blockedSegment: segment } = task;
    segment !== null && (segment.status = ABORTED, finishedTask(this, boundary, task.row, segment));
  }
  function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error$jscomp$0, errorDigest$jscomp$0, errorInfo$jscomp$0, aborted) {
    for (var i = 0;i < nodes.length; i++) {
      var node = nodes[i];
      if (node.length === 4)
        abortRemainingReplayNodes(request$jscomp$0, boundary, node[2], node[3], error$jscomp$0, errorDigest$jscomp$0, errorInfo$jscomp$0, aborted);
      else {
        var request = request$jscomp$0;
        node = node[5];
        var error = error$jscomp$0, errorDigest = errorDigest$jscomp$0, errorInfo = errorInfo$jscomp$0, wasAborted = aborted, resumedBoundary = createSuspenseBoundary(request, null, new Set, null, null);
        resumedBoundary.parentFlushed = true;
        resumedBoundary.rootSegmentID = node;
        resumedBoundary.status = CLIENT_RENDERED;
        encodeErrorForBoundary(resumedBoundary, errorDigest, error, errorInfo, wasAborted);
        resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
      }
    }
    nodes.length = 0;
    if (slots !== null) {
      if (boundary === null)
        throw Error("We should not have any resumable nodes in the shell. This is a bug in React.");
      boundary.status !== CLIENT_RENDERED && (boundary.status = CLIENT_RENDERED, encodeErrorForBoundary(boundary, errorDigest$jscomp$0, error$jscomp$0, errorInfo$jscomp$0, aborted), boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
      if (typeof slots === "object")
        for (var index in slots)
          delete slots[index];
    }
  }
  function abortTask(task, request, error) {
    var { blockedBoundary: boundary, blockedSegment: segment } = task;
    if (segment !== null) {
      if (segment.status === 6)
        return;
      segment.status = ABORTED;
    }
    var errorInfo = getThrownInfo(task.componentStack), node = task.node;
    node !== null && typeof node === "object" && pushHaltedAwaitOnComponentStack(task, node._debugInfo);
    if (boundary === null) {
      if (request.status !== 13 && request.status !== CLOSED) {
        boundary = task.replay;
        if (boundary === null) {
          request.trackedPostpones !== null && segment !== null ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo, task.debugTask), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo, task.debugTask), fatalError(request, error, errorInfo, task.debugTask));
          return;
        }
        boundary.pendingTasks--;
        boundary.pendingTasks === 0 && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo, null), abortRemainingReplayNodes(request, null, boundary.nodes, boundary.slots, error, segment, errorInfo, true));
        request.pendingRootTasks--;
        request.pendingRootTasks === 0 && completeShell(request);
      }
    } else {
      node = request.trackedPostpones;
      if (boundary.status !== CLIENT_RENDERED) {
        if (node !== null && segment !== null)
          return logRecoverableError(request, error, errorInfo, task.debugTask), trackPostpone(request, node, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
            return abortTask(fallbackTask, request, error);
          }), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
        boundary.status = CLIENT_RENDERED;
        segment = logRecoverableError(request, error, errorInfo, task.debugTask);
        boundary.status = CLIENT_RENDERED;
        encodeErrorForBoundary(boundary, segment, error, errorInfo, true);
        untrackBoundary(request, boundary);
        boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
      }
      boundary.pendingTasks--;
      errorInfo = boundary.row;
      errorInfo !== null && --errorInfo.pendingTasks === 0 && finishSuspenseListRow(request, errorInfo);
      boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
        return abortTask(fallbackTask, request, error);
      });
      boundary.fallbackAbortableTasks.clear();
    }
    task = task.row;
    task !== null && --task.pendingTasks === 0 && finishSuspenseListRow(request, task);
    request.allPendingTasks--;
    request.allPendingTasks === 0 && completeAll(request);
  }
  function safelyEmitEarlyPreloads(request, shellComplete) {
    try {
      var renderState = request.renderState, onHeaders = renderState.onHeaders;
      if (onHeaders) {
        var headers = renderState.headers;
        if (headers) {
          renderState.headers = null;
          var linkHeader = headers.preconnects;
          headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
          headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
          if (!shellComplete) {
            var queueIter = renderState.styles.values(), queueStep = queueIter.next();
            b:
              for (;0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next())
                for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next();0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
                  var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props;
                  var header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                    crossOrigin: props$jscomp$0.crossOrigin,
                    integrity: props$jscomp$0.integrity,
                    nonce: props$jscomp$0.nonce,
                    type: props$jscomp$0.type,
                    fetchPriority: props$jscomp$0.fetchPriority,
                    referrerPolicy: props$jscomp$0.referrerPolicy,
                    media: props$jscomp$0.media
                  });
                  if (0 <= (headers.remainingCapacity -= header.length + 2))
                    renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = typeof props.crossOrigin === "string" || typeof props.integrity === "string" ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
                  else
                    break b;
                }
          }
          linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
        }
      }
    } catch (error) {
      logRecoverableError(request, error, {}, null);
    }
  }
  function completeShell(request) {
    request.trackedPostpones === null && safelyEmitEarlyPreloads(request, true);
    request.trackedPostpones === null && preparePreamble(request);
    request.onShellError = noop;
    request = request.onShellReady;
    request();
  }
  function completeAll(request) {
    safelyEmitEarlyPreloads(request, request.trackedPostpones === null ? true : request.completedRootSegment === null || request.completedRootSegment.status !== POSTPONED);
    preparePreamble(request);
    request = request.onAllReady;
    request();
  }
  function queueCompletedSegment(boundary, segment) {
    if (segment.chunks.length === 0 && segment.children.length === 1 && segment.children[0].boundary === null && segment.children[0].id === -1) {
      var childSegment = segment.children[0];
      childSegment.id = segment.id;
      childSegment.parentFlushed = true;
      childSegment.status !== COMPLETED && childSegment.status !== ABORTED && childSegment.status !== ERRORED || queueCompletedSegment(boundary, childSegment);
    } else
      boundary.completedSegments.push(segment);
  }
  function finishedSegment(request, boundary, segment) {
    if (byteLengthOfChunk !== null) {
      segment = segment.chunks;
      for (var segmentByteSize = 0, i = 0;i < segment.length; i++)
        segmentByteSize += byteLengthOfChunk(segment[i]);
      boundary === null ? request.byteSize += segmentByteSize : boundary.byteSize += segmentByteSize;
    }
  }
  function finishedTask(request, boundary, row, segment) {
    row !== null && (--row.pendingTasks === 0 ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
    request.allPendingTasks--;
    if (boundary === null) {
      if (segment !== null && segment.parentFlushed) {
        if (request.completedRootSegment !== null)
          throw Error("There can only be one root segment. This is a bug in React.");
        request.completedRootSegment = segment;
      }
      request.pendingRootTasks--;
      request.pendingRootTasks === 0 && completeShell(request);
    } else if (boundary.pendingTasks--, boundary.status !== CLIENT_RENDERED)
      if (boundary.pendingTasks === 0)
        if (boundary.status === PENDING && (boundary.status = COMPLETED), segment !== null && segment.parentFlushed && (segment.status === COMPLETED || segment.status === ABORTED) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), boundary.status === COMPLETED)
          row = boundary.row, row !== null && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row)), request.pendingRootTasks === 0 && request.trackedPostpones === null && boundary.contentPreamble !== null && preparePreamble(request);
        else {
          if (boundary.status === POSTPONED && (boundary = boundary.row, boundary !== null)) {
            if (request.trackedPostpones !== null) {
              row = request.trackedPostpones;
              var postponedRow = boundary.next;
              if (postponedRow !== null && (segment = postponedRow.boundaries, segment !== null))
                for (postponedRow.boundaries = null, postponedRow = 0;postponedRow < segment.length; postponedRow++) {
                  var postponedBoundary = segment[postponedRow];
                  trackPostponedBoundary(request, row, postponedBoundary);
                  finishedTask(request, postponedBoundary, null, null);
                }
            }
            --boundary.pendingTasks === 0 && finishSuspenseListRow(request, boundary);
          }
        }
      else
        segment === null || !segment.parentFlushed || segment.status !== COMPLETED && segment.status !== ABORTED || (queueCompletedSegment(boundary, segment), boundary.completedSegments.length === 1 && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, boundary !== null && boundary.together && tryToResolveTogetherRow(request, boundary);
    request.allPendingTasks === 0 && completeAll(request);
  }
  function performWork(request$jscomp$2) {
    if (request$jscomp$2.status !== CLOSED && request$jscomp$2.status !== 13) {
      var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = HooksDispatcher;
      var prevAsyncDispatcher = ReactSharedInternals.A;
      ReactSharedInternals.A = DefaultAsyncDispatcher;
      var prevRequest = currentRequest;
      currentRequest = request$jscomp$2;
      var prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
      ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
      var prevResumableState = currentResumableState;
      currentResumableState = request$jscomp$2.resumableState;
      try {
        var pingedTasks = request$jscomp$2.pingedTasks, i;
        for (i = 0;i < pingedTasks.length; i++) {
          var request = request$jscomp$2, task = pingedTasks[i], segment = task.blockedSegment;
          if (segment === null) {
            var prevTaskInDEV = undefined, request$jscomp$0 = request;
            request = task;
            if (request.replay.pendingTasks !== 0) {
              switchContext(request.context);
              prevTaskInDEV = currentTaskInDEV;
              currentTaskInDEV = request;
              try {
                typeof request.replay.slots === "number" ? resumeNode(request$jscomp$0, request, request.replay.slots, request.node, request.childIndex) : retryNode(request$jscomp$0, request);
                if (request.replay.pendingTasks === 1 && 0 < request.replay.nodes.length)
                  throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
                request.replay.pendingTasks--;
                request.abortSet.delete(request);
                finishedTask(request$jscomp$0, request.blockedBoundary, request.row, null);
              } catch (thrownValue) {
                resetHooksState();
                var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
                if (typeof x === "object" && x !== null && typeof x.then === "function") {
                  var ping = request.ping;
                  x.then(ping, ping);
                  request.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                } else {
                  request.replay.pendingTasks--;
                  request.abortSet.delete(request);
                  var errorInfo = getThrownInfo(request.componentStack), errorDigest = undefined, request$jscomp$1 = request$jscomp$0, boundary = request.blockedBoundary, error$jscomp$0 = request$jscomp$0.status === 12 ? request$jscomp$0.fatalError : x, errorInfo$jscomp$0 = errorInfo, replayNodes = request.replay.nodes, resumeSlots = request.replay.slots;
                  errorDigest = logRecoverableError(request$jscomp$1, error$jscomp$0, errorInfo$jscomp$0, request.debugTask);
                  abortRemainingReplayNodes(request$jscomp$1, boundary, replayNodes, resumeSlots, error$jscomp$0, errorDigest, errorInfo$jscomp$0, false);
                  request$jscomp$0.pendingRootTasks--;
                  request$jscomp$0.pendingRootTasks === 0 && completeShell(request$jscomp$0);
                  request$jscomp$0.allPendingTasks--;
                  request$jscomp$0.allPendingTasks === 0 && completeAll(request$jscomp$0);
                }
              } finally {
                currentTaskInDEV = prevTaskInDEV;
              }
            }
          } else if (request$jscomp$0 = prevTaskInDEV = undefined, errorDigest = task, request$jscomp$1 = segment, request$jscomp$1.status === PENDING) {
            request$jscomp$1.status = 6;
            switchContext(errorDigest.context);
            request$jscomp$0 = currentTaskInDEV;
            currentTaskInDEV = errorDigest;
            var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
            try {
              retryNode(request, errorDigest), pushSegmentFinale(request$jscomp$1.chunks, request.renderState, request$jscomp$1.lastPushedText, request$jscomp$1.textEmbedded), errorDigest.abortSet.delete(errorDigest), request$jscomp$1.status = COMPLETED, finishedSegment(request, errorDigest.blockedBoundary, request$jscomp$1), finishedTask(request, errorDigest.blockedBoundary, errorDigest.row, request$jscomp$1);
            } catch (thrownValue) {
              resetHooksState();
              request$jscomp$1.children.length = childrenLength;
              request$jscomp$1.chunks.length = chunkLength;
              var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : request.status === 12 ? request.fatalError : thrownValue;
              if (request.status === 12 && request.trackedPostpones !== null) {
                var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(errorDigest.componentStack);
                errorDigest.abortSet.delete(errorDigest);
                logRecoverableError(request, x$jscomp$0, thrownInfo, errorDigest.debugTask);
                trackPostpone(request, trackedPostpones, errorDigest, request$jscomp$1);
                finishedTask(request, errorDigest.blockedBoundary, errorDigest.row, request$jscomp$1);
              } else if (typeof x$jscomp$0 === "object" && x$jscomp$0 !== null && typeof x$jscomp$0.then === "function") {
                request$jscomp$1.status = PENDING;
                errorDigest.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                var ping$jscomp$0 = errorDigest.ping;
                x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
              } else {
                var errorInfo$jscomp$1 = getThrownInfo(errorDigest.componentStack);
                errorDigest.abortSet.delete(errorDigest);
                request$jscomp$1.status = ERRORED;
                var { blockedBoundary: boundary$jscomp$0, row, debugTask } = errorDigest;
                row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row);
                request.allPendingTasks--;
                prevTaskInDEV = logRecoverableError(request, x$jscomp$0, errorInfo$jscomp$1, debugTask);
                if (boundary$jscomp$0 === null)
                  fatalError(request, x$jscomp$0, errorInfo$jscomp$1, debugTask);
                else if (boundary$jscomp$0.pendingTasks--, boundary$jscomp$0.status !== CLIENT_RENDERED) {
                  boundary$jscomp$0.status = CLIENT_RENDERED;
                  encodeErrorForBoundary(boundary$jscomp$0, prevTaskInDEV, x$jscomp$0, errorInfo$jscomp$1, false);
                  untrackBoundary(request, boundary$jscomp$0);
                  var boundaryRow = boundary$jscomp$0.row;
                  boundaryRow !== null && --boundaryRow.pendingTasks === 0 && finishSuspenseListRow(request, boundaryRow);
                  boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
                  request.pendingRootTasks === 0 && request.trackedPostpones === null && boundary$jscomp$0.contentPreamble !== null && preparePreamble(request);
                }
                request.allPendingTasks === 0 && completeAll(request);
              }
            } finally {
              currentTaskInDEV = request$jscomp$0;
            }
          }
        }
        pingedTasks.splice(0, i);
        request$jscomp$2.destination !== null && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
      } catch (error) {
        pingedTasks = {}, logRecoverableError(request$jscomp$2, error, pingedTasks, null), fatalError(request$jscomp$2, error, pingedTasks, null);
      } finally {
        currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
      }
    }
  }
  function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
    segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
    for (var pendingPreambles = false, i = 0;i < segment.children.length; i++)
      pendingPreambles = preparePreambleFromSegment(request, segment.children[i], collectedPreambleSegments) || pendingPreambles;
    return pendingPreambles;
  }
  function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
    var boundary = segment.boundary;
    if (boundary === null)
      return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
    var { contentPreamble: preamble, fallbackPreamble } = boundary;
    if (preamble === null || fallbackPreamble === null)
      return false;
    switch (boundary.status) {
      case COMPLETED:
        hoistPreambleState(request.renderState, preamble);
        request.byteSize += boundary.byteSize;
        segment = boundary.completedSegments[0];
        if (!segment)
          throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
        return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
      case POSTPONED:
        if (request.trackedPostpones !== null)
          return true;
      case CLIENT_RENDERED:
        if (segment.status === COMPLETED)
          return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
      default:
        return true;
    }
  }
  function preparePreamble(request) {
    if (request.completedRootSegment && request.completedPreambleSegments === null) {
      var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(request, request.completedRootSegment, collectedPreambleSegments), preamble = request.renderState.preamble;
      hasPendingPreambles === false || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
    }
  }
  function flushSubtree(request, destination, segment, hoistableState) {
    segment.parentFlushed = true;
    switch (segment.status) {
      case PENDING:
        segment.id = request.nextSegmentId++;
      case POSTPONED:
        return hoistableState = segment.id, segment.lastPushedText = false, segment.textEmbedded = false, request = request.renderState, writeChunk(destination, placeholder1), writeChunk(destination, request.placeholderPrefix), request = hoistableState.toString(16), writeChunk(destination, request), !!destination.write(placeholder2);
      case COMPLETED:
        segment.status = FLUSHED;
        var r = true, chunks = segment.chunks, chunkIdx = 0;
        segment = segment.children;
        for (var childIdx = 0;childIdx < segment.length; childIdx++) {
          for (r = segment[childIdx];chunkIdx < r.index; chunkIdx++)
            writeChunk(destination, chunks[chunkIdx]);
          r = flushSegment(request, destination, r, hoistableState);
        }
        for (;chunkIdx < chunks.length - 1; chunkIdx++)
          writeChunk(destination, chunks[chunkIdx]);
        chunkIdx < chunks.length && (r = !!destination.write(chunks[chunkIdx]));
        return r;
      case ABORTED:
        return true;
      default:
        throw Error("Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React.");
    }
  }
  var flushedByteSize = 0;
  function flushSegment(request, destination, segment, hoistableState) {
    var boundary = segment.boundary;
    if (boundary === null)
      return flushSubtree(request, destination, segment, hoistableState);
    boundary.parentFlushed = true;
    if (boundary.status === CLIENT_RENDERED) {
      var row = boundary.row;
      row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row);
      row = boundary.errorDigest;
      var { errorMessage, errorStack } = boundary;
      boundary = boundary.errorComponentStack;
      destination.write(startClientRenderedSuspenseBoundary);
      writeChunk(destination, clientRenderedSuspenseBoundaryError1);
      row && (writeChunk(destination, clientRenderedSuspenseBoundaryError1A), writeChunk(destination, escapeTextForBrowser(row)), writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial));
      errorMessage && (writeChunk(destination, clientRenderedSuspenseBoundaryError1B), writeChunk(destination, escapeTextForBrowser(errorMessage)), writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial));
      errorStack && (writeChunk(destination, clientRenderedSuspenseBoundaryError1C), writeChunk(destination, escapeTextForBrowser(errorStack)), writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial));
      boundary && (writeChunk(destination, clientRenderedSuspenseBoundaryError1D), writeChunk(destination, escapeTextForBrowser(boundary)), writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial));
      destination.write(clientRenderedSuspenseBoundaryError2);
      flushSubtree(request, destination, segment, hoistableState);
    } else if (boundary.status !== COMPLETED)
      boundary.status === PENDING && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState);
    else if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && (flushedByteSize + boundary.byteSize > request.progressiveChunkSize || hasSuspenseyContent(boundary.contentState)))
      boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), flushSubtree(request, destination, segment, hoistableState);
    else {
      flushedByteSize += boundary.byteSize;
      hoistableState && hoistHoistables(hoistableState, boundary.contentState);
      segment = boundary.row;
      segment !== null && isEligibleForOutlining(request, boundary) && --segment.pendingTasks === 0 && finishSuspenseListRow(request, segment);
      destination.write(startCompletedSuspenseBoundary);
      segment = boundary.completedSegments;
      if (segment.length !== 1)
        throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
      flushSegment(request, destination, segment[0], hoistableState);
    }
    return !!destination.write(endSuspenseBoundary);
  }
  function flushSegmentContainer(request, destination, segment, hoistableState) {
    writeStartSegment(destination, request.renderState, segment.parentFormatContext, segment.id);
    flushSegment(request, destination, segment, hoistableState);
    return writeEndSegment(destination, segment.parentFormatContext);
  }
  function flushCompletedBoundary(request, destination, boundary) {
    flushedByteSize = boundary.byteSize;
    for (var completedSegments = boundary.completedSegments, i = 0;i < completedSegments.length; i++)
      flushPartiallyCompletedSegment(request, destination, boundary, completedSegments[i]);
    completedSegments.length = 0;
    completedSegments = boundary.row;
    completedSegments !== null && isEligibleForOutlining(request, boundary) && --completedSegments.pendingTasks === 0 && finishSuspenseListRow(request, completedSegments);
    writeHoistablesForBoundary(destination, boundary.contentState, request.renderState);
    completedSegments = request.resumableState;
    request = request.renderState;
    i = boundary.rootSegmentID;
    boundary = boundary.contentState;
    var requiresStyleInsertion = request.stylesToHoist;
    request.stylesToHoist = false;
    writeChunk(destination, request.startInlineScript);
    writeChunk(destination, endOfStartTag);
    requiresStyleInsertion ? ((completedSegments.instructions & SentClientRenderFunction) === NothingSent && (completedSegments.instructions |= SentClientRenderFunction, writeChunk(destination, clientRenderScriptFunctionOnly)), (completedSegments.instructions & SentCompleteBoundaryFunction) === NothingSent && (completedSegments.instructions |= SentCompleteBoundaryFunction, writeChunk(destination, completeBoundaryScriptFunctionOnly)), (completedSegments.instructions & SentStyleInsertionFunction) === NothingSent ? (completedSegments.instructions |= SentStyleInsertionFunction, writeChunk(destination, completeBoundaryWithStylesScript1FullPartial)) : writeChunk(destination, completeBoundaryWithStylesScript1Partial)) : ((completedSegments.instructions & SentCompleteBoundaryFunction) === NothingSent && (completedSegments.instructions |= SentCompleteBoundaryFunction, writeChunk(destination, completeBoundaryScriptFunctionOnly)), writeChunk(destination, completeBoundaryScript1Partial));
    completedSegments = i.toString(16);
    writeChunk(destination, request.boundaryPrefix);
    writeChunk(destination, completedSegments);
    writeChunk(destination, completeBoundaryScript2);
    writeChunk(destination, request.segmentPrefix);
    writeChunk(destination, completedSegments);
    requiresStyleInsertion ? (writeChunk(destination, completeBoundaryScript3a), writeStyleResourceDependenciesInJS(destination, boundary)) : writeChunk(destination, completeBoundaryScript3b);
    boundary = !!destination.write(completeBoundaryScriptEnd);
    return writeBootstrap(destination, request) && boundary;
  }
  function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
    if (segment.status === FLUSHED)
      return true;
    var hoistableState = boundary.contentState, segmentID = segment.id;
    if (segmentID === -1) {
      if ((segment.id = boundary.rootSegmentID) === -1)
        throw Error("A root segment ID must have been assigned by now. This is a bug in React.");
      return flushSegmentContainer(request, destination, segment, hoistableState);
    }
    if (segmentID === boundary.rootSegmentID)
      return flushSegmentContainer(request, destination, segment, hoistableState);
    flushSegmentContainer(request, destination, segment, hoistableState);
    boundary = request.resumableState;
    request = request.renderState;
    writeChunk(destination, request.startInlineScript);
    writeChunk(destination, endOfStartTag);
    (boundary.instructions & SentCompleteSegmentFunction) === NothingSent ? (boundary.instructions |= SentCompleteSegmentFunction, writeChunk(destination, completeSegmentScript1Full)) : writeChunk(destination, completeSegmentScript1Partial);
    writeChunk(destination, request.segmentPrefix);
    segmentID = segmentID.toString(16);
    writeChunk(destination, segmentID);
    writeChunk(destination, completeSegmentScript2);
    writeChunk(destination, request.placeholderPrefix);
    writeChunk(destination, segmentID);
    destination = !!destination.write(completeSegmentScriptEnd);
    return destination;
  }
  var flushingPartialBoundaries = false;
  function flushCompletedQueues(request, destination) {
    try {
      if (!(0 < request.pendingRootTasks)) {
        var i, completedRootSegment = request.completedRootSegment;
        if (completedRootSegment !== null) {
          if (completedRootSegment.status === POSTPONED)
            return;
          var completedPreambleSegments = request.completedPreambleSegments;
          if (completedPreambleSegments === null)
            return;
          flushedByteSize = request.byteSize;
          var { resumableState, renderState } = request, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
          if (htmlChunks) {
            for (i$jscomp$0 = 0;i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
              writeChunk(destination, htmlChunks[i$jscomp$0]);
            if (headChunks)
              for (i$jscomp$0 = 0;i$jscomp$0 < headChunks.length; i$jscomp$0++)
                writeChunk(destination, headChunks[i$jscomp$0]);
            else
              writeChunk(destination, startChunkForTag("head")), writeChunk(destination, endOfStartTag);
          } else if (headChunks)
            for (i$jscomp$0 = 0;i$jscomp$0 < headChunks.length; i$jscomp$0++)
              writeChunk(destination, headChunks[i$jscomp$0]);
          var charsetChunks = renderState.charsetChunks;
          for (i$jscomp$0 = 0;i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
            writeChunk(destination, charsetChunks[i$jscomp$0]);
          charsetChunks.length = 0;
          renderState.preconnects.forEach(flushResource, destination);
          renderState.preconnects.clear();
          var viewportChunks = renderState.viewportChunks;
          for (i$jscomp$0 = 0;i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
            writeChunk(destination, viewportChunks[i$jscomp$0]);
          viewportChunks.length = 0;
          renderState.fontPreloads.forEach(flushResource, destination);
          renderState.fontPreloads.clear();
          renderState.highImagePreloads.forEach(flushResource, destination);
          renderState.highImagePreloads.clear();
          currentlyFlushingRenderState = renderState;
          renderState.styles.forEach(flushStylesInPreamble, destination);
          currentlyFlushingRenderState = null;
          var importMapChunks = renderState.importMapChunks;
          for (i$jscomp$0 = 0;i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
            writeChunk(destination, importMapChunks[i$jscomp$0]);
          importMapChunks.length = 0;
          renderState.bootstrapScripts.forEach(flushResource, destination);
          renderState.scripts.forEach(flushResource, destination);
          renderState.scripts.clear();
          renderState.bulkPreloads.forEach(flushResource, destination);
          renderState.bulkPreloads.clear();
          htmlChunks || headChunks || (resumableState.instructions |= SentCompletedShellId);
          var hoistableChunks = renderState.hoistableChunks;
          for (i$jscomp$0 = 0;i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
            writeChunk(destination, hoistableChunks[i$jscomp$0]);
          for (resumableState = hoistableChunks.length = 0;resumableState < completedPreambleSegments.length; resumableState++) {
            var segments = completedPreambleSegments[resumableState];
            for (renderState = 0;renderState < segments.length; renderState++)
              flushSegment(request, destination, segments[renderState], null);
          }
          var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
          (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) && writeChunk(destination, endChunkForTag("head"));
          var bodyChunks = preamble$jscomp$0.bodyChunks;
          if (bodyChunks)
            for (completedPreambleSegments = 0;completedPreambleSegments < bodyChunks.length; completedPreambleSegments++)
              writeChunk(destination, bodyChunks[completedPreambleSegments]);
          flushSegment(request, destination, completedRootSegment, null);
          request.completedRootSegment = null;
          var renderState$jscomp$0 = request.renderState;
          if (request.allPendingTasks !== 0 || request.clientRenderedBoundaries.length !== 0 || request.completedBoundaries.length !== 0 || request.trackedPostpones !== null && (request.trackedPostpones.rootNodes.length !== 0 || request.trackedPostpones.rootSlots !== null)) {
            var resumableState$jscomp$0 = request.resumableState;
            if ((resumableState$jscomp$0.instructions & SentMarkShellTime) === NothingSent) {
              resumableState$jscomp$0.instructions |= SentMarkShellTime;
              writeChunk(destination, renderState$jscomp$0.startInlineScript);
              if ((resumableState$jscomp$0.instructions & SentCompletedShellId) === NothingSent) {
                resumableState$jscomp$0.instructions |= SentCompletedShellId;
                var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
                writeChunk(destination, completedShellIdAttributeStart);
                writeChunk(destination, escapeTextForBrowser(shellId));
                writeChunk(destination, attributeEnd);
              }
              writeChunk(destination, endOfStartTag);
              writeChunk(destination, shellTimeRuntimeScript);
              destination.write(endInlineScript);
            }
          }
          writeBootstrap(destination, renderState$jscomp$0);
        }
        var renderState$jscomp$1 = request.renderState;
        completedRootSegment = 0;
        var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
        for (completedRootSegment = 0;completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++)
          writeChunk(destination, viewportChunks$jscomp$0[completedRootSegment]);
        viewportChunks$jscomp$0.length = 0;
        renderState$jscomp$1.preconnects.forEach(flushResource, destination);
        renderState$jscomp$1.preconnects.clear();
        renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
        renderState$jscomp$1.fontPreloads.clear();
        renderState$jscomp$1.highImagePreloads.forEach(flushResource, destination);
        renderState$jscomp$1.highImagePreloads.clear();
        renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
        renderState$jscomp$1.scripts.forEach(flushResource, destination);
        renderState$jscomp$1.scripts.clear();
        renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
        renderState$jscomp$1.bulkPreloads.clear();
        var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
        for (completedRootSegment = 0;completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++)
          writeChunk(destination, hoistableChunks$jscomp$0[completedRootSegment]);
        hoistableChunks$jscomp$0.length = 0;
        var clientRenderedBoundaries = request.clientRenderedBoundaries;
        for (i = 0;i < clientRenderedBoundaries.length; i++) {
          var boundary = clientRenderedBoundaries[i];
          renderState$jscomp$1 = destination;
          var { resumableState: resumableState$jscomp$1, renderState: renderState$jscomp$2 } = request, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest, errorMessage = boundary.errorMessage, errorStack = boundary.errorStack, errorComponentStack = boundary.errorComponentStack;
          writeChunk(renderState$jscomp$1, renderState$jscomp$2.startInlineScript);
          writeChunk(renderState$jscomp$1, endOfStartTag);
          (resumableState$jscomp$1.instructions & SentClientRenderFunction) === NothingSent ? (resumableState$jscomp$1.instructions |= SentClientRenderFunction, writeChunk(renderState$jscomp$1, clientRenderScript1Full)) : writeChunk(renderState$jscomp$1, clientRenderScript1Partial);
          writeChunk(renderState$jscomp$1, renderState$jscomp$2.boundaryPrefix);
          writeChunk(renderState$jscomp$1, id.toString(16));
          writeChunk(renderState$jscomp$1, clientRenderScript1A);
          if (errorDigest || errorMessage || errorStack || errorComponentStack)
            writeChunk(renderState$jscomp$1, clientRenderErrorScriptArgInterstitial), writeChunk(renderState$jscomp$1, escapeJSStringsForInstructionScripts(errorDigest || ""));
          if (errorMessage || errorStack || errorComponentStack)
            writeChunk(renderState$jscomp$1, clientRenderErrorScriptArgInterstitial), writeChunk(renderState$jscomp$1, escapeJSStringsForInstructionScripts(errorMessage || ""));
          if (errorStack || errorComponentStack)
            writeChunk(renderState$jscomp$1, clientRenderErrorScriptArgInterstitial), writeChunk(renderState$jscomp$1, escapeJSStringsForInstructionScripts(errorStack || ""));
          errorComponentStack && (writeChunk(renderState$jscomp$1, clientRenderErrorScriptArgInterstitial), writeChunk(renderState$jscomp$1, escapeJSStringsForInstructionScripts(errorComponentStack)));
          var JSCompiler_inline_result = !!renderState$jscomp$1.write(clientRenderScriptEnd);
          if (!JSCompiler_inline_result) {
            request.destination = null;
            i++;
            clientRenderedBoundaries.splice(0, i);
            return;
          }
        }
        clientRenderedBoundaries.splice(0, i);
        var completedBoundaries = request.completedBoundaries;
        for (i = 0;i < completedBoundaries.length; i++)
          if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
            request.destination = null;
            i++;
            completedBoundaries.splice(0, i);
            return;
          }
        completedBoundaries.splice(0, i);
        flushingPartialBoundaries = true;
        var partialBoundaries = request.partialBoundaries;
        for (i = 0;i < partialBoundaries.length; i++) {
          a: {
            clientRenderedBoundaries = request;
            boundary = destination;
            var boundary$jscomp$0 = partialBoundaries[i];
            flushedByteSize = boundary$jscomp$0.byteSize;
            var completedSegments = boundary$jscomp$0.completedSegments;
            for (JSCompiler_inline_result = 0;JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++)
              if (!flushPartiallyCompletedSegment(clientRenderedBoundaries, boundary, boundary$jscomp$0, completedSegments[JSCompiler_inline_result])) {
                JSCompiler_inline_result++;
                completedSegments.splice(0, JSCompiler_inline_result);
                var JSCompiler_inline_result$jscomp$0 = false;
                break a;
              }
            completedSegments.splice(0, JSCompiler_inline_result);
            var row = boundary$jscomp$0.row;
            row !== null && row.together && boundary$jscomp$0.pendingTasks === 1 && (row.pendingTasks === 1 ? unblockSuspenseListRow(clientRenderedBoundaries, row, row.hoistables) : row.pendingTasks--);
            JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(boundary, boundary$jscomp$0.contentState, clientRenderedBoundaries.renderState);
          }
          if (!JSCompiler_inline_result$jscomp$0) {
            request.destination = null;
            i++;
            partialBoundaries.splice(0, i);
            return;
          }
        }
        partialBoundaries.splice(0, i);
        flushingPartialBoundaries = false;
        var largeBoundaries = request.completedBoundaries;
        for (i = 0;i < largeBoundaries.length; i++)
          if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
            request.destination = null;
            i++;
            largeBoundaries.splice(0, i);
            return;
          }
        largeBoundaries.splice(0, i);
      }
    } finally {
      flushingPartialBoundaries = false, request.allPendingTasks === 0 && request.clientRenderedBoundaries.length === 0 && request.completedBoundaries.length === 0 ? (request.flushScheduled = false, i = request.resumableState, i.hasBody && writeChunk(destination, endChunkForTag("body")), i.hasHtml && writeChunk(destination, endChunkForTag("html")), flushBuffered(destination), request.abortableTasks.size !== 0 && console.error("There was still abortable task at the root when we closed. This is a bug in React."), request.status = CLOSED, destination.end(), request.destination = null) : flushBuffered(destination);
    }
  }
  function startWork(request) {
    request.flushScheduled = request.destination !== null;
    scheduleMicrotask(function() {
      return performWork(request);
    });
    setTimeout(function() {
      request.status === 10 && (request.status = 11);
      request.trackedPostpones === null && safelyEmitEarlyPreloads(request, request.pendingRootTasks === 0);
    }, 0);
  }
  function enqueueFlush(request) {
    request.flushScheduled === false && request.pingedTasks.length === 0 && request.destination !== null && (request.flushScheduled = true, setTimeout(function() {
      var destination = request.destination;
      destination ? flushCompletedQueues(request, destination) : request.flushScheduled = false;
    }, 0));
  }
  function abort(request, reason) {
    if (request.status === 11 || request.status === 10)
      request.status = 12;
    try {
      var abortableTasks = request.abortableTasks;
      if (0 < abortableTasks.size) {
        var error = reason === undefined ? Error("The render was aborted by the server without a reason.") : typeof reason === "object" && reason !== null && typeof reason.then === "function" ? Error("The render was aborted by the server with a promise.") : reason;
        request.fatalError = error;
        abortableTasks.forEach(function(task) {
          var prevTaskInDEV = currentTaskInDEV, prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
          currentTaskInDEV = task;
          ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
          try {
            abortTask(task, request, error);
          } finally {
            currentTaskInDEV = prevTaskInDEV, ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
          }
        });
        abortableTasks.clear();
      }
      request.destination !== null && flushCompletedQueues(request, request.destination);
    } catch (error$4) {
      reason = {}, logRecoverableError(request, error$4, reason, null), fatalError(request, error$4, reason, null);
    }
  }
  function addToReplayParent(node, parentKeyPath, trackedPostpones) {
    if (parentKeyPath === null)
      trackedPostpones.rootNodes.push(node);
    else {
      var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
      parentNode === undefined && (parentNode = [parentKeyPath[1], parentKeyPath[2], [], null], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
      parentNode[2].push(node);
    }
  }
  var isomorphicReactPackageVersion$jscomp$inline_766 = React.version;
  if (isomorphicReactPackageVersion$jscomp$inline_766 !== "19.2.0")
    throw Error(`Incompatible React versions: The "react" and "react-dom" packages must have the exact same version. Instead got:
  - react:      ` + (isomorphicReactPackageVersion$jscomp$inline_766 + `
  - react-dom:  19.2.0
Learn more: https://react.dev/warnings/version-mismatch`));
  exports.renderToReadableStream = function(children, options) {
    return new Promise(function(resolve, reject) {
      var onFatalError, onAllReady, allReady = new Promise(function(res, rej) {
        onAllReady = res;
        onFatalError = rej;
      }), onHeaders = options ? options.onHeaders : undefined, onHeadersImpl;
      onHeaders && (onHeadersImpl = function(headersDescriptor) {
        onHeaders(new Headers(headersDescriptor));
      });
      var resumableState = createResumableState(options ? options.identifierPrefix : undefined, options ? options.unstable_externalRuntimeSrc : undefined, options ? options.bootstrapScriptContent : undefined, options ? options.bootstrapScripts : undefined, options ? options.bootstrapModules : undefined), request$jscomp$0 = createRequest(children, resumableState, createRenderState(resumableState, options ? options.nonce : undefined, options ? options.unstable_externalRuntimeSrc : undefined, options ? options.importMap : undefined, onHeadersImpl, options ? options.maxHeadersLength : undefined), createRootFormatContext(options ? options.namespaceURI : undefined), options ? options.progressiveChunkSize : undefined, options ? options.onError : undefined, onAllReady, function() {
        var stream = new ReadableStream({
          type: "direct",
          pull: function(controller) {
            var request = request$jscomp$0;
            if (request.status === 13)
              request.status = CLOSED, closeWithError(controller, request.fatalError);
            else if (request.status !== CLOSED && request.destination === null) {
              request.destination = controller;
              try {
                flushCompletedQueues(request, controller);
              } catch (error) {
                controller = {}, logRecoverableError(request, error, controller, null), fatalError(request, error, controller, null);
              }
            }
          },
          cancel: function(reason) {
            request$jscomp$0.destination = null;
            abort(request$jscomp$0, reason);
          }
        }, { highWaterMark: 2048 });
        stream.allReady = allReady;
        resolve(stream);
      }, function(error) {
        allReady.catch(function() {});
        reject(error);
      }, onFatalError, options ? options.onPostpone : undefined, options ? options.formState : undefined);
      if (options && options.signal) {
        var signal = options.signal;
        if (signal.aborted)
          abort(request$jscomp$0, signal.reason);
        else {
          var listener = function() {
            abort(request$jscomp$0, signal.reason);
            signal.removeEventListener("abort", listener);
          };
          signal.addEventListener("abort", listener);
        }
      }
      startWork(request$jscomp$0);
    });
  };
  exports.version = "19.2.0";
});

// node_modules/react-dom/cjs/react-dom-server-legacy.browser.development.js
var require_react_dom_server_legacy_browser_development = __commonJS((exports) => {
  var React = __toESM(require_react(), 1);
  var ReactDOM = __toESM(require_react_dom(), 1);
  (function() {
    function styleReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + (s === "s" ? "\\73 " : "\\53 ") + suffix2;
    }
    function scriptReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + (s === "s" ? "\\u0073" : "\\u0053") + suffix2;
    }
    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== "object")
        return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return typeof maybeIterable === "function" ? maybeIterable : null;
    }
    function objectName(object) {
      object = Object.prototype.toString.call(object);
      return object.slice(8, object.length - 1);
    }
    function describeKeyForErrorMessage(key) {
      var encodedKey = JSON.stringify(key);
      return '"' + key + '"' === encodedKey ? key : encodedKey;
    }
    function describeValueForErrorMessage(value) {
      switch (typeof value) {
        case "string":
          return JSON.stringify(10 >= value.length ? value : value.slice(0, 10) + "...");
        case "object":
          if (isArrayImpl(value))
            return "[...]";
          if (value !== null && value.$$typeof === CLIENT_REFERENCE_TAG)
            return "client";
          value = objectName(value);
          return value === "Object" ? "{...}" : value;
        case "function":
          return value.$$typeof === CLIENT_REFERENCE_TAG ? "client" : (value = value.displayName || value.name) ? "function " + value : "function";
        default:
          return String(value);
      }
    }
    function describeElementType(type) {
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
      }
      if (typeof type === "object")
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeElementType(type.render);
          case REACT_MEMO_TYPE:
            return describeElementType(type.type);
          case REACT_LAZY_TYPE:
            var payload = type._payload;
            type = type._init;
            try {
              return describeElementType(type(payload));
            } catch (x) {}
        }
      return "";
    }
    function describeObjectForErrorMessage(objectOrArray, expandedName) {
      var objKind = objectName(objectOrArray);
      if (objKind !== "Object" && objKind !== "Array")
        return objKind;
      var start = -1, length = 0;
      if (isArrayImpl(objectOrArray))
        if (jsxChildrenParents.has(objectOrArray)) {
          var type = jsxChildrenParents.get(objectOrArray);
          objKind = "<" + describeElementType(type) + ">";
          for (var i = 0;i < objectOrArray.length; i++) {
            var value = objectOrArray[i];
            value = typeof value === "string" ? value : typeof value === "object" && value !== null ? "{" + describeObjectForErrorMessage(value) + "}" : "{" + describeValueForErrorMessage(value) + "}";
            "" + i === expandedName ? (start = objKind.length, length = value.length, objKind += value) : objKind = 15 > value.length && 40 > objKind.length + value.length ? objKind + value : objKind + "{...}";
          }
          objKind += "</" + describeElementType(type) + ">";
        } else {
          objKind = "[";
          for (type = 0;type < objectOrArray.length; type++)
            0 < type && (objKind += ", "), i = objectOrArray[type], i = typeof i === "object" && i !== null ? describeObjectForErrorMessage(i) : describeValueForErrorMessage(i), "" + type === expandedName ? (start = objKind.length, length = i.length, objKind += i) : objKind = 10 > i.length && 40 > objKind.length + i.length ? objKind + i : objKind + "...";
          objKind += "]";
        }
      else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
        objKind = "<" + describeElementType(objectOrArray.type) + "/>";
      else {
        if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG)
          return "client";
        if (jsxPropsParents.has(objectOrArray)) {
          objKind = jsxPropsParents.get(objectOrArray);
          objKind = "<" + (describeElementType(objKind) || "...");
          type = Object.keys(objectOrArray);
          for (i = 0;i < type.length; i++) {
            objKind += " ";
            value = type[i];
            objKind += describeKeyForErrorMessage(value) + "=";
            var _value2 = objectOrArray[value];
            var _substr2 = value === expandedName && typeof _value2 === "object" && _value2 !== null ? describeObjectForErrorMessage(_value2) : describeValueForErrorMessage(_value2);
            typeof _value2 !== "string" && (_substr2 = "{" + _substr2 + "}");
            value === expandedName ? (start = objKind.length, length = _substr2.length, objKind += _substr2) : objKind = 10 > _substr2.length && 40 > objKind.length + _substr2.length ? objKind + _substr2 : objKind + "...";
          }
          objKind += ">";
        } else {
          objKind = "{";
          type = Object.keys(objectOrArray);
          for (i = 0;i < type.length; i++)
            0 < i && (objKind += ", "), value = type[i], objKind += describeKeyForErrorMessage(value) + ": ", _value2 = objectOrArray[value], _value2 = typeof _value2 === "object" && _value2 !== null ? describeObjectForErrorMessage(_value2) : describeValueForErrorMessage(_value2), value === expandedName ? (start = objKind.length, length = _value2.length, objKind += _value2) : objKind = 10 > _value2.length && 40 > objKind.length + _value2.length ? objKind + _value2 : objKind + "...";
          objKind += "}";
        }
      }
      return expandedName === undefined ? objKind : -1 < start && 0 < length ? (objectOrArray = " ".repeat(start) + "^".repeat(length), `
  ` + objKind + `
  ` + objectOrArray) : `
  ` + objKind;
    }
    function murmurhash3_32_gc(key, seed) {
      var remainder = key.length & 3;
      var bytes = key.length - remainder;
      var h1 = seed;
      for (seed = 0;seed < bytes; ) {
        var k1 = key.charCodeAt(seed) & 255 | (key.charCodeAt(++seed) & 255) << 8 | (key.charCodeAt(++seed) & 255) << 16 | (key.charCodeAt(++seed) & 255) << 24;
        ++seed;
        k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295;
        k1 = k1 << 15 | k1 >>> 17;
        k1 = 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
        h1 ^= k1;
        h1 = h1 << 13 | h1 >>> 19;
        h1 = 5 * (h1 & 65535) + ((5 * (h1 >>> 16) & 65535) << 16) & 4294967295;
        h1 = (h1 & 65535) + 27492 + (((h1 >>> 16) + 58964 & 65535) << 16);
      }
      k1 = 0;
      switch (remainder) {
        case 3:
          k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
        case 2:
          k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
        case 1:
          k1 ^= key.charCodeAt(seed) & 255, k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295, k1 = k1 << 15 | k1 >>> 17, h1 ^= 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
      }
      h1 ^= key.length;
      h1 ^= h1 >>> 16;
      h1 = 2246822507 * (h1 & 65535) + ((2246822507 * (h1 >>> 16) & 65535) << 16) & 4294967295;
      h1 ^= h1 >>> 13;
      h1 = 3266489909 * (h1 & 65535) + ((3266489909 * (h1 >>> 16) & 65535) << 16) & 4294967295;
      return (h1 ^ h1 >>> 16) >>> 0;
    }
    function typeName(value) {
      return typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
    }
    function willCoercionThrow(value) {
      try {
        return testStringCoercion(value), false;
      } catch (e) {
        return true;
      }
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkAttributeStringCoercion(value, attributeName) {
      if (willCoercionThrow(value))
        return console.error("The provided `%s` attribute is an unsupported type %s. This value must be coerced to a string before using it here.", attributeName, typeName(value)), testStringCoercion(value);
    }
    function checkCSSPropertyStringCoercion(value, propName) {
      if (willCoercionThrow(value))
        return console.error("The provided `%s` CSS property is an unsupported type %s. This value must be coerced to a string before using it here.", propName, typeName(value)), testStringCoercion(value);
    }
    function checkHtmlStringCoercion(value) {
      if (willCoercionThrow(value))
        return console.error("The provided HTML markup uses a value of unsupported type %s. This value must be coerced to a string before using it here.", typeName(value)), testStringCoercion(value);
    }
    function isAttributeNameSafe(attributeName) {
      if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
        return true;
      if (hasOwnProperty.call(illegalAttributeNameCache, attributeName))
        return false;
      if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
        return validatedAttributeNameCache[attributeName] = true;
      illegalAttributeNameCache[attributeName] = true;
      console.error("Invalid attribute name: `%s`", attributeName);
      return false;
    }
    function checkControlledValueProps(tagName, props) {
      hasReadOnlyValue[props.type] || props.onChange || props.onInput || props.readOnly || props.disabled || props.value == null || (tagName === "select" ? console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set `onChange`.") : console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`."));
      props.onChange || props.readOnly || props.disabled || props.checked == null || console.error("You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`.");
    }
    function validateProperty$1(tagName, name) {
      if (hasOwnProperty.call(warnedProperties$1, name) && warnedProperties$1[name])
        return true;
      if (rARIACamel$1.test(name)) {
        tagName = "aria-" + name.slice(4).toLowerCase();
        tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
        if (tagName == null)
          return console.error("Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.", name), warnedProperties$1[name] = true;
        if (name !== tagName)
          return console.error("Invalid ARIA attribute `%s`. Did you mean `%s`?", name, tagName), warnedProperties$1[name] = true;
      }
      if (rARIA$1.test(name)) {
        tagName = name.toLowerCase();
        tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
        if (tagName == null)
          return warnedProperties$1[name] = true, false;
        name !== tagName && (console.error("Unknown ARIA attribute `%s`. Did you mean `%s`?", name, tagName), warnedProperties$1[name] = true);
      }
      return true;
    }
    function validateProperties$2(type, props) {
      var invalidProps = [], key;
      for (key in props)
        validateProperty$1(type, key) || invalidProps.push(key);
      props = invalidProps.map(function(prop) {
        return "`" + prop + "`";
      }).join(", ");
      invalidProps.length === 1 ? console.error("Invalid aria prop %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props", props, type) : 1 < invalidProps.length && console.error("Invalid aria props %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props", props, type);
    }
    function validateProperty(tagName, name, value, eventRegistry) {
      if (hasOwnProperty.call(warnedProperties, name) && warnedProperties[name])
        return true;
      var lowerCasedName = name.toLowerCase();
      if (lowerCasedName === "onfocusin" || lowerCasedName === "onfocusout")
        return console.error("React uses onFocus and onBlur instead of onFocusIn and onFocusOut. All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React."), warnedProperties[name] = true;
      if (typeof value === "function" && (tagName === "form" && name === "action" || tagName === "input" && name === "formAction" || tagName === "button" && name === "formAction"))
        return true;
      if (eventRegistry != null) {
        tagName = eventRegistry.possibleRegistrationNames;
        if (eventRegistry.registrationNameDependencies.hasOwnProperty(name))
          return true;
        eventRegistry = tagName.hasOwnProperty(lowerCasedName) ? tagName[lowerCasedName] : null;
        if (eventRegistry != null)
          return console.error("Invalid event handler property `%s`. Did you mean `%s`?", name, eventRegistry), warnedProperties[name] = true;
        if (EVENT_NAME_REGEX.test(name))
          return console.error("Unknown event handler property `%s`. It will be ignored.", name), warnedProperties[name] = true;
      } else if (EVENT_NAME_REGEX.test(name))
        return INVALID_EVENT_NAME_REGEX.test(name) && console.error("Invalid event handler property `%s`. React events use the camelCase naming convention, for example `onClick`.", name), warnedProperties[name] = true;
      if (rARIA.test(name) || rARIACamel.test(name))
        return true;
      if (lowerCasedName === "innerhtml")
        return console.error("Directly setting property `innerHTML` is not permitted. For more information, lookup documentation on `dangerouslySetInnerHTML`."), warnedProperties[name] = true;
      if (lowerCasedName === "aria")
        return console.error("The `aria` attribute is reserved for future use in React. Pass individual `aria-` attributes instead."), warnedProperties[name] = true;
      if (lowerCasedName === "is" && value !== null && value !== undefined && typeof value !== "string")
        return console.error("Received a `%s` for a string attribute `is`. If this is expected, cast the value to a string.", typeof value), warnedProperties[name] = true;
      if (typeof value === "number" && isNaN(value))
        return console.error("Received NaN for the `%s` attribute. If this is expected, cast the value to a string.", name), warnedProperties[name] = true;
      if (possibleStandardNames.hasOwnProperty(lowerCasedName)) {
        if (lowerCasedName = possibleStandardNames[lowerCasedName], lowerCasedName !== name)
          return console.error("Invalid DOM property `%s`. Did you mean `%s`?", name, lowerCasedName), warnedProperties[name] = true;
      } else if (name !== lowerCasedName)
        return console.error("React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.", name, lowerCasedName), warnedProperties[name] = true;
      switch (name) {
        case "dangerouslySetInnerHTML":
        case "children":
        case "style":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "defaultValue":
        case "defaultChecked":
        case "innerHTML":
        case "ref":
          return true;
        case "innerText":
        case "textContent":
          return true;
      }
      switch (typeof value) {
        case "boolean":
          switch (name) {
            case "autoFocus":
            case "checked":
            case "multiple":
            case "muted":
            case "selected":
            case "contentEditable":
            case "spellCheck":
            case "draggable":
            case "value":
            case "autoReverse":
            case "externalResourcesRequired":
            case "focusable":
            case "preserveAlpha":
            case "allowFullScreen":
            case "async":
            case "autoPlay":
            case "controls":
            case "default":
            case "defer":
            case "disabled":
            case "disablePictureInPicture":
            case "disableRemotePlayback":
            case "formNoValidate":
            case "hidden":
            case "loop":
            case "noModule":
            case "noValidate":
            case "open":
            case "playsInline":
            case "readOnly":
            case "required":
            case "reversed":
            case "scoped":
            case "seamless":
            case "itemScope":
            case "capture":
            case "download":
            case "inert":
              return true;
            default:
              lowerCasedName = name.toLowerCase().slice(0, 5);
              if (lowerCasedName === "data-" || lowerCasedName === "aria-")
                return true;
              value ? console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.', value, name, name, value, name) : console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.', value, name, name, value, name, name, name);
              return warnedProperties[name] = true;
          }
        case "function":
        case "symbol":
          return warnedProperties[name] = true, false;
        case "string":
          if (value === "false" || value === "true") {
            switch (name) {
              case "checked":
              case "selected":
              case "multiple":
              case "muted":
              case "allowFullScreen":
              case "async":
              case "autoPlay":
              case "controls":
              case "default":
              case "defer":
              case "disabled":
              case "disablePictureInPicture":
              case "disableRemotePlayback":
              case "formNoValidate":
              case "hidden":
              case "loop":
              case "noModule":
              case "noValidate":
              case "open":
              case "playsInline":
              case "readOnly":
              case "required":
              case "reversed":
              case "scoped":
              case "seamless":
              case "itemScope":
              case "inert":
                break;
              default:
                return true;
            }
            console.error("Received the string `%s` for the boolean attribute `%s`. %s Did you mean %s={%s}?", value, name, value === "false" ? "The browser will interpret it as a truthy value." : 'Although this works, it will not work as expected if you pass the string "false".', name, value);
            warnedProperties[name] = true;
          }
      }
      return true;
    }
    function warnUnknownProperties(type, props, eventRegistry) {
      var unknownProps = [], key;
      for (key in props)
        validateProperty(type, key, props[key], eventRegistry) || unknownProps.push(key);
      props = unknownProps.map(function(prop) {
        return "`" + prop + "`";
      }).join(", ");
      unknownProps.length === 1 ? console.error("Invalid value for prop %s on <%s> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM. For details, see https://react.dev/link/attribute-behavior ", props, type) : 1 < unknownProps.length && console.error("Invalid values for props %s on <%s> tag. Either remove them from the element, or pass a string or number value to keep them in the DOM. For details, see https://react.dev/link/attribute-behavior ", props, type);
    }
    function camelize(string) {
      return string.replace(hyphenPattern, function(_, character) {
        return character.toUpperCase();
      });
    }
    function escapeTextForBrowser(text) {
      if (typeof text === "boolean" || typeof text === "number" || typeof text === "bigint")
        return "" + text;
      checkHtmlStringCoercion(text);
      text = "" + text;
      var match = matchHtmlRegExp.exec(text);
      if (match) {
        var html = "", index, lastIndex = 0;
        for (index = match.index;index < text.length; index++) {
          switch (text.charCodeAt(index)) {
            case 34:
              match = "&quot;";
              break;
            case 38:
              match = "&amp;";
              break;
            case 39:
              match = "&#x27;";
              break;
            case 60:
              match = "&lt;";
              break;
            case 62:
              match = "&gt;";
              break;
            default:
              continue;
          }
          lastIndex !== index && (html += text.slice(lastIndex, index));
          lastIndex = index + 1;
          html += match;
        }
        text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
      }
      return text;
    }
    function sanitizeURL(url) {
      return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
    }
    function escapeEntireInlineScriptContent(scriptText) {
      checkHtmlStringCoercion(scriptText);
      return ("" + scriptText).replace(scriptRegex, scriptReplacer);
    }
    function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
      return {
        idPrefix: identifierPrefix === undefined ? "" : identifierPrefix,
        nextFormID: 0,
        streamingFormat: 0,
        bootstrapScriptContent,
        bootstrapScripts,
        bootstrapModules,
        instructions: NothingSent,
        hasBody: false,
        hasHtml: false,
        unknownResources: {},
        dnsResources: {},
        connectResources: { default: {}, anonymous: {}, credentials: {} },
        imageResources: {},
        styleResources: {},
        scriptResources: {},
        moduleUnknownResources: {},
        moduleScriptResources: {}
      };
    }
    function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
      return {
        insertionMode,
        selectedValue,
        tagScope,
        viewTransition
      };
    }
    function getChildFormatContext(parentContext, type, props) {
      var subtreeScope = parentContext.tagScope & -25;
      switch (type) {
        case "noscript":
          return createFormatContext(HTML_MODE, null, subtreeScope | 1, null);
        case "select":
          return createFormatContext(HTML_MODE, props.value != null ? props.value : props.defaultValue, subtreeScope, null);
        case "svg":
          return createFormatContext(SVG_MODE, null, subtreeScope, null);
        case "picture":
          return createFormatContext(HTML_MODE, null, subtreeScope | 2, null);
        case "math":
          return createFormatContext(MATHML_MODE, null, subtreeScope, null);
        case "foreignObject":
          return createFormatContext(HTML_MODE, null, subtreeScope, null);
        case "table":
          return createFormatContext(HTML_TABLE_MODE, null, subtreeScope, null);
        case "thead":
        case "tbody":
        case "tfoot":
          return createFormatContext(HTML_TABLE_BODY_MODE, null, subtreeScope, null);
        case "colgroup":
          return createFormatContext(HTML_COLGROUP_MODE, null, subtreeScope, null);
        case "tr":
          return createFormatContext(HTML_TABLE_ROW_MODE, null, subtreeScope, null);
        case "head":
          if (parentContext.insertionMode < HTML_MODE)
            return createFormatContext(HTML_HEAD_MODE, null, subtreeScope, null);
          break;
        case "html":
          if (parentContext.insertionMode === ROOT_HTML_MODE)
            return createFormatContext(HTML_HTML_MODE, null, subtreeScope, null);
      }
      return parentContext.insertionMode >= HTML_TABLE_MODE || parentContext.insertionMode < HTML_MODE ? createFormatContext(HTML_MODE, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null) : parentContext;
    }
    function getSuspenseViewTransition(parentViewTransition) {
      return parentViewTransition === null ? null : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
    }
    function getSuspenseFallbackFormatContext(resumableState, parentContext) {
      parentContext.tagScope & 32 && (resumableState.instructions |= 128);
      return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | 12, getSuspenseViewTransition(parentContext.viewTransition));
    }
    function getSuspenseContentFormatContext(resumableState, parentContext) {
      resumableState = getSuspenseViewTransition(parentContext.viewTransition);
      var subtreeScope = parentContext.tagScope | 16;
      resumableState !== null && resumableState.share !== "none" && (subtreeScope |= 64);
      return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, resumableState);
    }
    function pushStyleAttribute(target, style) {
      if (typeof style !== "object")
        throw Error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");
      var isFirst = true, styleName;
      for (styleName in style)
        if (hasOwnProperty.call(style, styleName)) {
          var styleValue = style[styleName];
          if (styleValue != null && typeof styleValue !== "boolean" && styleValue !== "") {
            if (styleName.indexOf("--") === 0) {
              var nameChunk = escapeTextForBrowser(styleName);
              checkCSSPropertyStringCoercion(styleValue, styleName);
              styleValue = escapeTextForBrowser(("" + styleValue).trim());
            } else {
              nameChunk = styleName;
              var value = styleValue;
              if (-1 < nameChunk.indexOf("-")) {
                var name = nameChunk;
                warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name] || (warnedStyleNames[name] = true, console.error("Unsupported style property %s. Did you mean %s?", name, camelize(name.replace(msPattern$1, "ms-"))));
              } else if (badVendoredStyleNamePattern.test(nameChunk))
                name = nameChunk, warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name] || (warnedStyleNames[name] = true, console.error("Unsupported vendor-prefixed style property %s. Did you mean %s?", name, name.charAt(0).toUpperCase() + name.slice(1)));
              else if (badStyleValueWithSemicolonPattern.test(value)) {
                name = nameChunk;
                var value$jscomp$0 = value;
                warnedStyleValues.hasOwnProperty(value$jscomp$0) && warnedStyleValues[value$jscomp$0] || (warnedStyleValues[value$jscomp$0] = true, console.error(`Style property values shouldn't contain a semicolon. Try "%s: %s" instead.`, name, value$jscomp$0.replace(badStyleValueWithSemicolonPattern, "")));
              }
              typeof value === "number" && (isNaN(value) ? warnedForNaNValue || (warnedForNaNValue = true, console.error("`NaN` is an invalid value for the `%s` css style property.", nameChunk)) : isFinite(value) || warnedForInfinityValue || (warnedForInfinityValue = true, console.error("`Infinity` is an invalid value for the `%s` css style property.", nameChunk)));
              nameChunk = styleName;
              value = styleNameCache.get(nameChunk);
              value !== undefined ? nameChunk = value : (value = escapeTextForBrowser(nameChunk.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-")), styleNameCache.set(nameChunk, value), nameChunk = value);
              typeof styleValue === "number" ? styleValue = styleValue === 0 || unitlessNumbers.has(styleName) ? "" + styleValue : styleValue + "px" : (checkCSSPropertyStringCoercion(styleValue, styleName), styleValue = escapeTextForBrowser(("" + styleValue).trim()));
            }
            isFirst ? (isFirst = false, target.push(styleAttributeStart, nameChunk, styleAssign, styleValue)) : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
          }
        }
      isFirst || target.push(attributeEnd);
    }
    function pushBooleanAttribute(target, name, value) {
      value && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeEmptyString);
    }
    function pushStringAttribute(target, name, value) {
      typeof value !== "function" && typeof value !== "symbol" && typeof value !== "boolean" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
    }
    function pushAdditionalFormField(value, key) {
      this.push('<input type="hidden"');
      validateAdditionalFormField(value);
      pushStringAttribute(this, "name", key);
      pushStringAttribute(this, "value", value);
      this.push(endOfStartTagSelfClosing);
    }
    function validateAdditionalFormField(value) {
      if (typeof value !== "string")
        throw Error("File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration.");
    }
    function getCustomFormFields(resumableState, formAction) {
      if (typeof formAction.$$FORM_ACTION === "function") {
        var id = resumableState.nextFormID++;
        resumableState = resumableState.idPrefix + id;
        try {
          var customFields = formAction.$$FORM_ACTION(resumableState);
          if (customFields) {
            var formData = customFields.data;
            formData != null && formData.forEach(validateAdditionalFormField);
          }
          return customFields;
        } catch (x) {
          if (typeof x === "object" && x !== null && typeof x.then === "function")
            throw x;
          console.error(`Failed to serialize an action for progressive enhancement:
%s`, x);
        }
      }
      return null;
    }
    function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
      var formData = null;
      if (typeof formAction === "function") {
        name === null || didWarnFormActionName || (didWarnFormActionName = true, console.error('Cannot specify a "name" prop for a button that specifies a function as a formAction. React needs it to encode which action should be invoked. It will get overridden.'));
        formEncType === null && formMethod === null || didWarnFormActionMethod || (didWarnFormActionMethod = true, console.error("Cannot specify a formEncType or formMethod for a button that specifies a function as a formAction. React provides those automatically. They will get overridden."));
        formTarget === null || didWarnFormActionTarget || (didWarnFormActionTarget = true, console.error("Cannot specify a formTarget for a button that specifies a function as a formAction. The function will always be executed in the same window."));
        var customFields = getCustomFormFields(resumableState, formAction);
        customFields !== null ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(attributeSeparator, "formAction", attributeAssign, actionJavaScriptURL, attributeEnd), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
      }
      name != null && pushAttribute(target, "name", name);
      formAction != null && pushAttribute(target, "formAction", formAction);
      formEncType != null && pushAttribute(target, "formEncType", formEncType);
      formMethod != null && pushAttribute(target, "formMethod", formMethod);
      formTarget != null && pushAttribute(target, "formTarget", formTarget);
      return formData;
    }
    function pushAttribute(target, name, value) {
      switch (name) {
        case "className":
          pushStringAttribute(target, "class", value);
          break;
        case "tabIndex":
          pushStringAttribute(target, "tabindex", value);
          break;
        case "dir":
        case "role":
        case "viewBox":
        case "width":
        case "height":
          pushStringAttribute(target, name, value);
          break;
        case "style":
          pushStyleAttribute(target, value);
          break;
        case "src":
        case "href":
          if (value === "") {
            name === "src" ? console.error('An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', name, name) : console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', name, name);
            break;
          }
        case "action":
        case "formAction":
          if (value == null || typeof value === "function" || typeof value === "symbol" || typeof value === "boolean")
            break;
          checkAttributeStringCoercion(value, name);
          value = sanitizeURL("" + value);
          target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "defaultValue":
        case "defaultChecked":
        case "innerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "ref":
          break;
        case "autoFocus":
        case "multiple":
        case "muted":
          pushBooleanAttribute(target, name.toLowerCase(), value);
          break;
        case "xlinkHref":
          if (typeof value === "function" || typeof value === "symbol" || typeof value === "boolean")
            break;
          checkAttributeStringCoercion(value, name);
          value = sanitizeURL("" + value);
          target.push(attributeSeparator, "xlink:href", attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "contentEditable":
        case "spellCheck":
        case "draggable":
        case "value":
        case "autoReverse":
        case "externalResourcesRequired":
        case "focusable":
        case "preserveAlpha":
          typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "inert":
          value !== "" || didWarnForNewBooleanPropsWithEmptyValue[name] || (didWarnForNewBooleanPropsWithEmptyValue[name] = true, console.error("Received an empty string for a boolean attribute `%s`. This will treat the attribute as if it were false. Either pass `false` to silence this warning, or pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.", name));
        case "allowFullScreen":
        case "async":
        case "autoPlay":
        case "controls":
        case "default":
        case "defer":
        case "disabled":
        case "disablePictureInPicture":
        case "disableRemotePlayback":
        case "formNoValidate":
        case "hidden":
        case "loop":
        case "noModule":
        case "noValidate":
        case "open":
        case "playsInline":
        case "readOnly":
        case "required":
        case "reversed":
        case "scoped":
        case "seamless":
        case "itemScope":
          value && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeEmptyString);
          break;
        case "capture":
        case "download":
          value === true ? target.push(attributeSeparator, name, attributeEmptyString) : value !== false && typeof value !== "function" && typeof value !== "symbol" && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "cols":
        case "rows":
        case "size":
        case "span":
          typeof value !== "function" && typeof value !== "symbol" && !isNaN(value) && 1 <= value && target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "rowSpan":
        case "start":
          typeof value === "function" || typeof value === "symbol" || isNaN(value) || target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
          break;
        case "xlinkActuate":
          pushStringAttribute(target, "xlink:actuate", value);
          break;
        case "xlinkArcrole":
          pushStringAttribute(target, "xlink:arcrole", value);
          break;
        case "xlinkRole":
          pushStringAttribute(target, "xlink:role", value);
          break;
        case "xlinkShow":
          pushStringAttribute(target, "xlink:show", value);
          break;
        case "xlinkTitle":
          pushStringAttribute(target, "xlink:title", value);
          break;
        case "xlinkType":
          pushStringAttribute(target, "xlink:type", value);
          break;
        case "xmlBase":
          pushStringAttribute(target, "xml:base", value);
          break;
        case "xmlLang":
          pushStringAttribute(target, "xml:lang", value);
          break;
        case "xmlSpace":
          pushStringAttribute(target, "xml:space", value);
          break;
        default:
          if (!(2 < name.length) || name[0] !== "o" && name[0] !== "O" || name[1] !== "n" && name[1] !== "N") {
            if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
              switch (typeof value) {
                case "function":
                case "symbol":
                  return;
                case "boolean":
                  var prefix2 = name.toLowerCase().slice(0, 5);
                  if (prefix2 !== "data-" && prefix2 !== "aria-")
                    return;
              }
              target.push(attributeSeparator, name, attributeAssign, escapeTextForBrowser(value), attributeEnd);
            }
          }
      }
    }
    function pushInnerHTML(target, innerHTML, children) {
      if (innerHTML != null) {
        if (children != null)
          throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
        if (typeof innerHTML !== "object" || !("__html" in innerHTML))
          throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");
        innerHTML = innerHTML.__html;
        innerHTML !== null && innerHTML !== undefined && (checkHtmlStringCoercion(innerHTML), target.push("" + innerHTML));
      }
    }
    function checkSelectProp(props, propName) {
      var value = props[propName];
      value != null && (value = isArrayImpl(value), props.multiple && !value ? console.error("The `%s` prop supplied to <select> must be an array if `multiple` is true.", propName) : !props.multiple && value && console.error("The `%s` prop supplied to <select> must be a scalar value if `multiple` is false.", propName));
    }
    function flattenOptionChildren(children) {
      var content = "";
      React.Children.forEach(children, function(child) {
        child != null && (content += child, didWarnInvalidOptionChildren || typeof child === "string" || typeof child === "number" || typeof child === "bigint" || (didWarnInvalidOptionChildren = true, console.error("Cannot infer the option value of complex children. Pass a `value` prop or use a plain string as children to <option>.")));
      });
      return content;
    }
    function injectFormReplayingRuntime(resumableState, renderState) {
      if ((resumableState.instructions & 16) === NothingSent) {
        resumableState.instructions |= 16;
        var { preamble, bootstrapChunks } = renderState;
        (preamble.htmlChunks || preamble.headChunks) && bootstrapChunks.length === 0 ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, formReplayingRuntimeScript, endInlineScript)) : bootstrapChunks.unshift(renderState.startInlineScript, endOfStartTag, formReplayingRuntimeScript, endInlineScript);
      }
    }
    function pushLinkImpl(target, props) {
      target.push(startChunkForTag("link"));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error("link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTagSelfClosing);
      return null;
    }
    function escapeStyleTextContent(styleText) {
      checkHtmlStringCoercion(styleText);
      return ("" + styleText).replace(styleRegex, styleReplacer);
    }
    function pushSelfClosing(target, props, tag) {
      target.push(startChunkForTag(tag));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(tag + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTagSelfClosing);
      return null;
    }
    function pushTitleImpl(target, props) {
      target.push(startChunkForTag("title"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
      typeof props !== "function" && typeof props !== "symbol" && props !== null && props !== undefined && target.push(escapeTextForBrowser("" + props));
      pushInnerHTML(target, innerHTML, children);
      target.push(endChunkForTag("title"));
      return null;
    }
    function pushScriptImpl(target, props) {
      target.push(startChunkForTag("script"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      children != null && typeof children !== "string" && (props = typeof children === "number" ? "a number for children" : Array.isArray(children) ? "an array for children" : "something unexpected for children", console.error("A script element was rendered with %s. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.", props));
      pushInnerHTML(target, innerHTML, children);
      typeof children === "string" && target.push(escapeEntireInlineScriptContent(children));
      target.push(endChunkForTag("script"));
      return null;
    }
    function pushStartSingletonElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, tag);
      return tag;
    }
    function pushStartGenericElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (propValue != null)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, tag);
      return typeof tag === "string" ? (target.push(escapeTextForBrowser(tag)), null) : tag;
    }
    function startChunkForTag(tag) {
      var tagStartChunk = validatedTagCache.get(tag);
      if (tagStartChunk === undefined) {
        if (!VALID_TAG_REGEX.test(tag))
          throw Error("Invalid tag: " + tag);
        tagStartChunk = "<" + tag;
        validatedTagCache.set(tag, tagStartChunk);
      }
      return tagStartChunk;
    }
    function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
      validateProperties$2(type, props);
      type !== "input" && type !== "textarea" && type !== "select" || props == null || props.value !== null || didWarnValueNull || (didWarnValueNull = true, type === "select" && props.multiple ? console.error("`value` prop on `%s` should not be null. Consider using an empty array when `multiple` is set to `true` to clear the component or `undefined` for uncontrolled components.", type) : console.error("`value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.", type));
      b:
        if (type.indexOf("-") === -1)
          var JSCompiler_inline_result = false;
        else
          switch (type) {
            case "annotation-xml":
            case "color-profile":
            case "font-face":
            case "font-face-src":
            case "font-face-uri":
            case "font-face-format":
            case "font-face-name":
            case "missing-glyph":
              JSCompiler_inline_result = false;
              break b;
            default:
              JSCompiler_inline_result = true;
          }
      JSCompiler_inline_result || typeof props.is === "string" || warnUnknownProperties(type, props, null);
      !props.suppressContentEditableWarning && props.contentEditable && props.children != null && console.error("A component is `contentEditable` and contains `children` managed by React. It is now your responsibility to guarantee that none of those nodes are unexpectedly modified or duplicated. This is probably not intentional.");
      formatContext.insertionMode !== SVG_MODE && formatContext.insertionMode !== MATHML_MODE && type.indexOf("-") === -1 && type.toLowerCase() !== type && console.error("<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.", type);
      switch (type) {
        case "div":
        case "span":
        case "svg":
        case "path":
          break;
        case "a":
          target$jscomp$0.push(startChunkForTag("a"));
          var children = null, innerHTML = null, propKey;
          for (propKey in props)
            if (hasOwnProperty.call(props, propKey)) {
              var propValue = props[propKey];
              if (propValue != null)
                switch (propKey) {
                  case "children":
                    children = propValue;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML = propValue;
                    break;
                  case "href":
                    propValue === "" ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey, propValue);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML, children);
          if (typeof children === "string") {
            target$jscomp$0.push(escapeTextForBrowser(children));
            var JSCompiler_inline_result$jscomp$0 = null;
          } else
            JSCompiler_inline_result$jscomp$0 = children;
          return JSCompiler_inline_result$jscomp$0;
        case "g":
        case "p":
        case "li":
          break;
        case "select":
          checkControlledValueProps("select", props);
          checkSelectProp(props, "value");
          checkSelectProp(props, "defaultValue");
          props.value === undefined || props.defaultValue === undefined || didWarnDefaultSelectValue || (console.error("Select elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled select element and remove one of these props. More info: https://react.dev/link/controlled-components"), didWarnDefaultSelectValue = true);
          target$jscomp$0.push(startChunkForTag("select"));
          var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
          for (propKey$jscomp$0 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$0)) {
              var propValue$jscomp$0 = props[propKey$jscomp$0];
              if (propValue$jscomp$0 != null)
                switch (propKey$jscomp$0) {
                  case "children":
                    children$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "defaultValue":
                  case "value":
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$0, propValue$jscomp$0);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
          return children$jscomp$0;
        case "option":
          var selectedValue = formatContext.selectedValue;
          target$jscomp$0.push(startChunkForTag("option"));
          var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
          for (propKey$jscomp$1 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$1)) {
              var propValue$jscomp$1 = props[propKey$jscomp$1];
              if (propValue$jscomp$1 != null)
                switch (propKey$jscomp$1) {
                  case "children":
                    children$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "selected":
                    selected = propValue$jscomp$1;
                    didWarnSelectedSetOnOption || (console.error("Use the `defaultValue` or `value` props on <select> instead of setting `selected` on <option>."), didWarnSelectedSetOnOption = true);
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "value":
                    value = propValue$jscomp$1;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$1, propValue$jscomp$1);
                }
            }
          if (selectedValue != null) {
            if (value !== null) {
              checkAttributeStringCoercion(value, "value");
              var stringValue = "" + value;
            } else
              innerHTML$jscomp$1 === null || didWarnInvalidOptionInnerHTML || (didWarnInvalidOptionInnerHTML = true, console.error("Pass a `value` prop if you set dangerouslyInnerHTML so React knows which value should be selected.")), stringValue = flattenOptionChildren(children$jscomp$1);
            if (isArrayImpl(selectedValue))
              for (var i = 0;i < selectedValue.length; i++) {
                if (checkAttributeStringCoercion(selectedValue[i], "value"), "" + selectedValue[i] === stringValue) {
                  target$jscomp$0.push(' selected=""');
                  break;
                }
              }
            else
              checkAttributeStringCoercion(selectedValue, "select.value"), "" + selectedValue === stringValue && target$jscomp$0.push(' selected=""');
          } else
            selected && target$jscomp$0.push(' selected=""');
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
          return children$jscomp$1;
        case "textarea":
          checkControlledValueProps("textarea", props);
          props.value === undefined || props.defaultValue === undefined || didWarnDefaultTextareaValue || (console.error("Textarea elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled textarea and remove one of these props. More info: https://react.dev/link/controlled-components"), didWarnDefaultTextareaValue = true);
          target$jscomp$0.push(startChunkForTag("textarea"));
          var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
          for (propKey$jscomp$2 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$2)) {
              var propValue$jscomp$2 = props[propKey$jscomp$2];
              if (propValue$jscomp$2 != null)
                switch (propKey$jscomp$2) {
                  case "children":
                    children$jscomp$2 = propValue$jscomp$2;
                    break;
                  case "value":
                    value$jscomp$0 = propValue$jscomp$2;
                    break;
                  case "defaultValue":
                    defaultValue = propValue$jscomp$2;
                    break;
                  case "dangerouslySetInnerHTML":
                    throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$2, propValue$jscomp$2);
                }
            }
          value$jscomp$0 === null && defaultValue !== null && (value$jscomp$0 = defaultValue);
          target$jscomp$0.push(endOfStartTag);
          if (children$jscomp$2 != null) {
            console.error("Use the `defaultValue` or `value` props instead of setting children on <textarea>.");
            if (value$jscomp$0 != null)
              throw Error("If you supply `defaultValue` on a <textarea>, do not pass children.");
            if (isArrayImpl(children$jscomp$2)) {
              if (1 < children$jscomp$2.length)
                throw Error("<textarea> can only have at most one child.");
              checkHtmlStringCoercion(children$jscomp$2[0]);
              value$jscomp$0 = "" + children$jscomp$2[0];
            }
            checkHtmlStringCoercion(children$jscomp$2);
            value$jscomp$0 = "" + children$jscomp$2;
          }
          typeof value$jscomp$0 === "string" && value$jscomp$0[0] === `
` && target$jscomp$0.push(leadingNewline);
          value$jscomp$0 !== null && (checkAttributeStringCoercion(value$jscomp$0, "value"), target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0)));
          return null;
        case "input":
          checkControlledValueProps("input", props);
          target$jscomp$0.push(startChunkForTag("input"));
          var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
          for (propKey$jscomp$3 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$3)) {
              var propValue$jscomp$3 = props[propKey$jscomp$3];
              if (propValue$jscomp$3 != null)
                switch (propKey$jscomp$3) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error("input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
                  case "name":
                    name = propValue$jscomp$3;
                    break;
                  case "formAction":
                    formAction = propValue$jscomp$3;
                    break;
                  case "formEncType":
                    formEncType = propValue$jscomp$3;
                    break;
                  case "formMethod":
                    formMethod = propValue$jscomp$3;
                    break;
                  case "formTarget":
                    formTarget = propValue$jscomp$3;
                    break;
                  case "defaultChecked":
                    defaultChecked = propValue$jscomp$3;
                    break;
                  case "defaultValue":
                    defaultValue$jscomp$0 = propValue$jscomp$3;
                    break;
                  case "checked":
                    checked = propValue$jscomp$3;
                    break;
                  case "value":
                    value$jscomp$1 = propValue$jscomp$3;
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$3, propValue$jscomp$3);
                }
            }
          formAction === null || props.type === "image" || props.type === "submit" || didWarnFormActionType || (didWarnFormActionType = true, console.error('An input can only specify a formAction along with type="submit" or type="image".'));
          var formData = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);
          checked === null || defaultChecked === null || didWarnDefaultChecked || (console.error("%s contains an input of type %s with both checked and defaultChecked props. Input elements must be either controlled or uncontrolled (specify either the checked prop, or the defaultChecked prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components", "A component", props.type), didWarnDefaultChecked = true);
          value$jscomp$1 === null || defaultValue$jscomp$0 === null || didWarnDefaultInputValue || (console.error("%s contains an input of type %s with both value and defaultValue props. Input elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components", "A component", props.type), didWarnDefaultInputValue = true);
          checked !== null ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : defaultChecked !== null && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
          value$jscomp$1 !== null ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : defaultValue$jscomp$0 !== null && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
          target$jscomp$0.push(endOfStartTagSelfClosing);
          formData != null && formData.forEach(pushAdditionalFormField, target$jscomp$0);
          return null;
        case "button":
          target$jscomp$0.push(startChunkForTag("button"));
          var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
          for (propKey$jscomp$4 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$4)) {
              var propValue$jscomp$4 = props[propKey$jscomp$4];
              if (propValue$jscomp$4 != null)
                switch (propKey$jscomp$4) {
                  case "children":
                    children$jscomp$3 = propValue$jscomp$4;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$2 = propValue$jscomp$4;
                    break;
                  case "name":
                    name$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formAction":
                    formAction$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formEncType":
                    formEncType$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formMethod":
                    formMethod$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formTarget":
                    formTarget$jscomp$0 = propValue$jscomp$4;
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$4, propValue$jscomp$4);
                }
            }
          formAction$jscomp$0 === null || props.type == null || props.type === "submit" || didWarnFormActionType || (didWarnFormActionType = true, console.error('A button can only specify a formAction along with type="submit" or no type.'));
          var formData$jscomp$0 = pushFormActionAttribute(target$jscomp$0, resumableState, renderState, formAction$jscomp$0, formEncType$jscomp$0, formMethod$jscomp$0, formTarget$jscomp$0, name$jscomp$0);
          target$jscomp$0.push(endOfStartTag);
          formData$jscomp$0 != null && formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
          if (typeof children$jscomp$3 === "string") {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
            var JSCompiler_inline_result$jscomp$1 = null;
          } else
            JSCompiler_inline_result$jscomp$1 = children$jscomp$3;
          return JSCompiler_inline_result$jscomp$1;
        case "form":
          target$jscomp$0.push(startChunkForTag("form"));
          var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
          for (propKey$jscomp$5 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$5)) {
              var propValue$jscomp$5 = props[propKey$jscomp$5];
              if (propValue$jscomp$5 != null)
                switch (propKey$jscomp$5) {
                  case "children":
                    children$jscomp$4 = propValue$jscomp$5;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$3 = propValue$jscomp$5;
                    break;
                  case "action":
                    formAction$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "encType":
                    formEncType$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "method":
                    formMethod$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "target":
                    formTarget$jscomp$1 = propValue$jscomp$5;
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$5, propValue$jscomp$5);
                }
            }
          var formData$jscomp$1 = null, formActionName = null;
          if (typeof formAction$jscomp$1 === "function") {
            formEncType$jscomp$1 === null && formMethod$jscomp$1 === null || didWarnFormActionMethod || (didWarnFormActionMethod = true, console.error("Cannot specify a encType or method for a form that specifies a function as the action. React provides those automatically. They will get overridden."));
            formTarget$jscomp$1 === null || didWarnFormActionTarget || (didWarnFormActionTarget = true, console.error("Cannot specify a target for a form that specifies a function as the action. The function will always be executed in the same window."));
            var customFields = getCustomFormFields(resumableState, formAction$jscomp$1);
            customFields !== null ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(attributeSeparator, "action", attributeAssign, actionJavaScriptURL, attributeEnd), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
          }
          formAction$jscomp$1 != null && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
          formEncType$jscomp$1 != null && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
          formMethod$jscomp$1 != null && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
          formTarget$jscomp$1 != null && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
          target$jscomp$0.push(endOfStartTag);
          formActionName !== null && (target$jscomp$0.push('<input type="hidden"'), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push(endOfStartTagSelfClosing), formData$jscomp$1 != null && formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
          if (typeof children$jscomp$4 === "string") {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
            var JSCompiler_inline_result$jscomp$2 = null;
          } else
            JSCompiler_inline_result$jscomp$2 = children$jscomp$4;
          return JSCompiler_inline_result$jscomp$2;
        case "menuitem":
          target$jscomp$0.push(startChunkForTag("menuitem"));
          for (var propKey$jscomp$6 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$6)) {
              var propValue$jscomp$6 = props[propKey$jscomp$6];
              if (propValue$jscomp$6 != null)
                switch (propKey$jscomp$6) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error("menuitems cannot have `children` nor `dangerouslySetInnerHTML`.");
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$6, propValue$jscomp$6);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          return null;
        case "object":
          target$jscomp$0.push(startChunkForTag("object"));
          var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
          for (propKey$jscomp$7 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$7)) {
              var propValue$jscomp$7 = props[propKey$jscomp$7];
              if (propValue$jscomp$7 != null)
                switch (propKey$jscomp$7) {
                  case "children":
                    children$jscomp$5 = propValue$jscomp$7;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$4 = propValue$jscomp$7;
                    break;
                  case "data":
                    checkAttributeStringCoercion(propValue$jscomp$7, "data");
                    var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                    if (sanitizedValue === "") {
                      console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.', propKey$jscomp$7, propKey$jscomp$7);
                      break;
                    }
                    target$jscomp$0.push(attributeSeparator, "data", attributeAssign, escapeTextForBrowser(sanitizedValue), attributeEnd);
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$7, propValue$jscomp$7);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
          if (typeof children$jscomp$5 === "string") {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
            var JSCompiler_inline_result$jscomp$3 = null;
          } else
            JSCompiler_inline_result$jscomp$3 = children$jscomp$5;
          return JSCompiler_inline_result$jscomp$3;
        case "title":
          var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
          if (hasOwnProperty.call(props, "children")) {
            var children$jscomp$6 = props.children, child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
            Array.isArray(children$jscomp$6) && 1 < children$jscomp$6.length ? console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes. For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.", children$jscomp$6.length) : typeof child === "function" || typeof child === "symbol" ? console.error("React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value.", typeof child === "function" ? "a Function" : "a Sybmol") : child && child.toString === {}.toString && (child.$$typeof != null ? console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.") : console.error("React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title> is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>."));
          }
          if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null)
            var JSCompiler_inline_result$jscomp$4 = pushTitleImpl(target$jscomp$0, props);
          else
            isFallback ? JSCompiler_inline_result$jscomp$4 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$4 = undefined);
          return JSCompiler_inline_result$jscomp$4;
        case "link":
          var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
          if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$0 || props.itemProp != null || typeof rel !== "string" || typeof href !== "string" || href === "") {
            rel === "stylesheet" && typeof props.precedence === "string" && (typeof href === "string" && href || console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and expected the `href` prop to be a non-empty string but ecountered %s instead. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop ensure there is a non-empty string `href` prop as well, otherwise remove the `precedence` prop.', href === null ? "`null`" : href === undefined ? "`undefined`" : href === "" ? "an empty string" : 'something with type "' + typeof href + '"'));
            pushLinkImpl(target$jscomp$0, props);
            var JSCompiler_inline_result$jscomp$5 = null;
          } else if (props.rel === "stylesheet")
            if (typeof precedence !== "string" || props.disabled != null || props.onLoad || props.onError) {
              if (typeof precedence === "string") {
                if (props.disabled != null)
                  console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the `disabled` prop, otherwise remove the `precedence` prop.');
                else if (props.onLoad || props.onError) {
                  var propDescription = props.onLoad && props.onError ? "`onLoad` and `onError` props" : props.onLoad ? "`onLoad` prop" : "`onError` prop";
                  console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.', propDescription, propDescription);
                }
              }
              JSCompiler_inline_result$jscomp$5 = pushLinkImpl(target$jscomp$0, props);
            } else {
              var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : undefined;
              if (resourceState !== EXISTS) {
                resumableState.styleResources[href] = EXISTS;
                styleQueue || (styleQueue = {
                  precedence: escapeTextForBrowser(precedence),
                  rules: [],
                  hrefs: [],
                  sheets: new Map
                }, renderState.styles.set(precedence, styleQueue));
                var resource = {
                  state: PENDING$1,
                  props: assign({}, props, {
                    "data-precedence": props.precedence,
                    precedence: null
                  })
                };
                if (resourceState) {
                  resourceState.length === 2 && adoptPreloadCredentials(resource.props, resourceState);
                  var preloadResource = renderState.preloads.stylesheets.get(href);
                  preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = PRELOADED;
                }
                styleQueue.sheets.set(href, resource);
                hoistableState && hoistableState.stylesheets.add(resource);
              } else if (styleQueue) {
                var _resource = styleQueue.sheets.get(href);
                _resource && hoistableState && hoistableState.stylesheets.add(_resource);
              }
              textEmbedded && target$jscomp$0.push("<!-- -->");
              JSCompiler_inline_result$jscomp$5 = null;
            }
          else
            props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$5 = pushLinkImpl(target$jscomp$0, props) : (textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$5 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
          return JSCompiler_inline_result$jscomp$5;
        case "script":
          var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
          if (typeof props.src !== "string" || !props.src || !asyncProp || typeof asyncProp === "function" || typeof asyncProp === "symbol" || props.onLoad || props.onError || formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$1 || props.itemProp != null)
            var JSCompiler_inline_result$jscomp$6 = pushScriptImpl(target$jscomp$0, props);
          else {
            var key = props.src;
            if (props.type === "module") {
              var resources = resumableState.moduleScriptResources;
              var preloads = renderState.preloads.moduleScripts;
            } else
              resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
            var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : undefined;
            if (resourceState$jscomp$0 !== EXISTS) {
              resources[key] = EXISTS;
              var scriptProps = props;
              if (resourceState$jscomp$0) {
                resourceState$jscomp$0.length === 2 && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
                var preloadResource$jscomp$0 = preloads.get(key);
                preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
              }
              var resource$jscomp$0 = [];
              renderState.scripts.add(resource$jscomp$0);
              pushScriptImpl(resource$jscomp$0, scriptProps);
            }
            textEmbedded && target$jscomp$0.push("<!-- -->");
            JSCompiler_inline_result$jscomp$6 = null;
          }
          return JSCompiler_inline_result$jscomp$6;
        case "style":
          var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1;
          if (hasOwnProperty.call(props, "children")) {
            var children$jscomp$7 = props.children, child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
            (typeof child$jscomp$0 === "function" || typeof child$jscomp$0 === "symbol" || Array.isArray(child$jscomp$0)) && console.error("React expect children of <style> tags to be a string, number, or object with a `toString` method but found %s instead. In browsers style Elements can only have `Text` Nodes as children.", typeof child$jscomp$0 === "function" ? "a Function" : typeof child$jscomp$0 === "symbol" ? "a Sybmol" : "an Array");
          }
          var { precedence: precedence$jscomp$0, href: href$jscomp$0, nonce } = props;
          if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$2 || props.itemProp != null || typeof precedence$jscomp$0 !== "string" || typeof href$jscomp$0 !== "string" || href$jscomp$0 === "") {
            target$jscomp$0.push(startChunkForTag("style"));
            var children$jscomp$8 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
            for (propKey$jscomp$8 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$8)) {
                var propValue$jscomp$8 = props[propKey$jscomp$8];
                if (propValue$jscomp$8 != null)
                  switch (propKey$jscomp$8) {
                    case "children":
                      children$jscomp$8 = propValue$jscomp$8;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$5 = propValue$jscomp$8;
                      break;
                    default:
                      pushAttribute(target$jscomp$0, propKey$jscomp$8, propValue$jscomp$8);
                  }
              }
            target$jscomp$0.push(endOfStartTag);
            var child$jscomp$1 = Array.isArray(children$jscomp$8) ? 2 > children$jscomp$8.length ? children$jscomp$8[0] : null : children$jscomp$8;
            typeof child$jscomp$1 !== "function" && typeof child$jscomp$1 !== "symbol" && child$jscomp$1 !== null && child$jscomp$1 !== undefined && target$jscomp$0.push(escapeStyleTextContent(child$jscomp$1));
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$8);
            target$jscomp$0.push(endChunkForTag("style"));
            var JSCompiler_inline_result$jscomp$7 = null;
          } else {
            href$jscomp$0.includes(" ") && console.error('React expected the `href` prop for a <style> tag opting into hoisting semantics using the `precedence` prop to not have any spaces but ecountered spaces instead. using spaces in this prop will cause hydration of this style to fail on the client. The href for the <style> where this ocurred is "%s".', href$jscomp$0);
            var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0), resourceState$jscomp$1 = resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : undefined;
            if (resourceState$jscomp$1 !== EXISTS) {
              resumableState.styleResources[href$jscomp$0] = EXISTS;
              resourceState$jscomp$1 && console.error('React encountered a hoistable style tag for the same href as a preload: "%s". When using a style tag to inline styles you should not also preload it as a stylsheet.', href$jscomp$0);
              styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
                precedence: escapeTextForBrowser(precedence$jscomp$0),
                rules: [],
                hrefs: [],
                sheets: new Map
              }, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
              var nonceStyle = renderState.nonce.style;
              if (nonceStyle && nonceStyle !== nonce)
                console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "%s" that was included with this render.', precedence$jscomp$0, nonce, nonceStyle);
              else {
                !nonceStyle && nonce && console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.', precedence$jscomp$0, nonce);
                styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
                var target = styleQueue$jscomp$0.rules, children$jscomp$9 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
                for (propKey$jscomp$9 in props)
                  if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                    var propValue$jscomp$9 = props[propKey$jscomp$9];
                    if (propValue$jscomp$9 != null)
                      switch (propKey$jscomp$9) {
                        case "children":
                          children$jscomp$9 = propValue$jscomp$9;
                          break;
                        case "dangerouslySetInnerHTML":
                          innerHTML$jscomp$6 = propValue$jscomp$9;
                      }
                  }
                var child$jscomp$2 = Array.isArray(children$jscomp$9) ? 2 > children$jscomp$9.length ? children$jscomp$9[0] : null : children$jscomp$9;
                typeof child$jscomp$2 !== "function" && typeof child$jscomp$2 !== "symbol" && child$jscomp$2 !== null && child$jscomp$2 !== undefined && target.push(escapeStyleTextContent(child$jscomp$2));
                pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$9);
              }
            }
            styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
            textEmbedded && target$jscomp$0.push("<!-- -->");
            JSCompiler_inline_result$jscomp$7 = undefined;
          }
          return JSCompiler_inline_result$jscomp$7;
        case "meta":
          var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
          if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope$jscomp$3 || props.itemProp != null)
            var JSCompiler_inline_result$jscomp$8 = pushSelfClosing(target$jscomp$0, props, "meta");
          else
            textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$8 = isFallback$jscomp$1 ? null : typeof props.charSet === "string" ? pushSelfClosing(renderState.charsetChunks, props, "meta") : props.name === "viewport" ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
          return JSCompiler_inline_result$jscomp$8;
        case "listing":
        case "pre":
          target$jscomp$0.push(startChunkForTag(type));
          var children$jscomp$10 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
          for (propKey$jscomp$10 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$10)) {
              var propValue$jscomp$10 = props[propKey$jscomp$10];
              if (propValue$jscomp$10 != null)
                switch (propKey$jscomp$10) {
                  case "children":
                    children$jscomp$10 = propValue$jscomp$10;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$7 = propValue$jscomp$10;
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey$jscomp$10, propValue$jscomp$10);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          if (innerHTML$jscomp$7 != null) {
            if (children$jscomp$10 != null)
              throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
            if (typeof innerHTML$jscomp$7 !== "object" || !("__html" in innerHTML$jscomp$7))
              throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");
            var html = innerHTML$jscomp$7.__html;
            html !== null && html !== undefined && (typeof html === "string" && 0 < html.length && html[0] === `
` ? target$jscomp$0.push(leadingNewline, html) : (checkHtmlStringCoercion(html), target$jscomp$0.push("" + html)));
          }
          typeof children$jscomp$10 === "string" && children$jscomp$10[0] === `
` && target$jscomp$0.push(leadingNewline);
          return children$jscomp$10;
        case "img":
          var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
          if (!(props.loading === "lazy" || !src && !srcSet || typeof src !== "string" && src != null || typeof srcSet !== "string" && srcSet != null || props.fetchPriority === "low" || pictureOrNoScriptTagInScope) && (typeof src !== "string" || src[4] !== ":" || src[0] !== "d" && src[0] !== "D" || src[1] !== "a" && src[1] !== "A" || src[2] !== "t" && src[2] !== "T" || src[3] !== "a" && src[3] !== "A") && (typeof srcSet !== "string" || srcSet[4] !== ":" || srcSet[0] !== "d" && srcSet[0] !== "D" || srcSet[1] !== "a" && srcSet[1] !== "A" || srcSet[2] !== "t" && srcSet[2] !== "T" || srcSet[3] !== "a" && srcSet[3] !== "A")) {
            hoistableState !== null && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = true);
            var sizes = typeof props.sizes === "string" ? props.sizes : undefined, key$jscomp$0 = srcSet ? srcSet + `
` + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
            if (resource$jscomp$1) {
              if (props.fetchPriority === "high" || 10 > renderState.highImagePreloads.size)
                promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
            } else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
              resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
              var input = props.crossOrigin;
              var crossOrigin = typeof input === "string" ? input === "use-credentials" ? input : "" : undefined;
              var headers = renderState.headers, header;
              headers && 0 < headers.remainingCapacity && typeof props.srcSet !== "string" && (props.fetchPriority === "high" || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
                imageSrcSet: props.srcSet,
                imageSizes: props.sizes,
                crossOrigin,
                integrity: props.integrity,
                nonce: props.nonce,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.refererPolicy
              }), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? undefined : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }), props.fetchPriority === "high" || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
            }
          }
          return pushSelfClosing(target$jscomp$0, props, "img");
        case "base":
        case "area":
        case "br":
        case "col":
        case "embed":
        case "hr":
        case "keygen":
        case "param":
        case "source":
        case "track":
        case "wbr":
          return pushSelfClosing(target$jscomp$0, props, type);
        case "annotation-xml":
        case "color-profile":
        case "font-face":
        case "font-face-src":
        case "font-face-uri":
        case "font-face-format":
        case "font-face-name":
        case "missing-glyph":
          break;
        case "head":
          if (formatContext.insertionMode < HTML_MODE) {
            var preamble = preambleState || renderState.preamble;
            if (preamble.headChunks)
              throw Error("The `<head>` tag may only be rendered once.");
            preambleState !== null && target$jscomp$0.push("<!--head-->");
            preamble.headChunks = [];
            var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(preamble.headChunks, props, "head");
          } else
            JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(target$jscomp$0, props, "head");
          return JSCompiler_inline_result$jscomp$9;
        case "body":
          if (formatContext.insertionMode < HTML_MODE) {
            var preamble$jscomp$0 = preambleState || renderState.preamble;
            if (preamble$jscomp$0.bodyChunks)
              throw Error("The `<body>` tag may only be rendered once.");
            preambleState !== null && target$jscomp$0.push("<!--body-->");
            preamble$jscomp$0.bodyChunks = [];
            var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(preamble$jscomp$0.bodyChunks, props, "body");
          } else
            JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(target$jscomp$0, props, "body");
          return JSCompiler_inline_result$jscomp$10;
        case "html":
          if (formatContext.insertionMode === ROOT_HTML_MODE) {
            var preamble$jscomp$1 = preambleState || renderState.preamble;
            if (preamble$jscomp$1.htmlChunks)
              throw Error("The `<html>` tag may only be rendered once.");
            preambleState !== null && target$jscomp$0.push("<!--html-->");
            preamble$jscomp$1.htmlChunks = [doctypeChunk];
            var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(preamble$jscomp$1.htmlChunks, props, "html");
          } else
            JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(target$jscomp$0, props, "html");
          return JSCompiler_inline_result$jscomp$11;
        default:
          if (type.indexOf("-") !== -1) {
            target$jscomp$0.push(startChunkForTag(type));
            var children$jscomp$11 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
            for (propKey$jscomp$11 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$11)) {
                var propValue$jscomp$11 = props[propKey$jscomp$11];
                if (propValue$jscomp$11 != null) {
                  var attributeName = propKey$jscomp$11;
                  switch (propKey$jscomp$11) {
                    case "children":
                      children$jscomp$11 = propValue$jscomp$11;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$8 = propValue$jscomp$11;
                      break;
                    case "style":
                      pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                      break;
                    case "suppressContentEditableWarning":
                    case "suppressHydrationWarning":
                    case "ref":
                      break;
                    case "className":
                      attributeName = "class";
                    default:
                      if (isAttributeNameSafe(propKey$jscomp$11) && typeof propValue$jscomp$11 !== "function" && typeof propValue$jscomp$11 !== "symbol" && propValue$jscomp$11 !== false) {
                        if (propValue$jscomp$11 === true)
                          propValue$jscomp$11 = "";
                        else if (typeof propValue$jscomp$11 === "object")
                          continue;
                        target$jscomp$0.push(attributeSeparator, attributeName, attributeAssign, escapeTextForBrowser(propValue$jscomp$11), attributeEnd);
                      }
                  }
                }
              }
            target$jscomp$0.push(endOfStartTag);
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$11);
            return children$jscomp$11;
          }
      }
      return pushStartGenericElement(target$jscomp$0, props, type);
    }
    function endChunkForTag(tag) {
      var chunk = endTagCache.get(tag);
      chunk === undefined && (chunk = "</" + tag + ">", endTagCache.set(tag, chunk));
      return chunk;
    }
    function hoistPreambleState(renderState, preambleState) {
      renderState = renderState.preamble;
      renderState.htmlChunks === null && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
      renderState.headChunks === null && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
      renderState.bodyChunks === null && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
    }
    function writeBootstrap(destination, renderState) {
      renderState = renderState.bootstrapChunks;
      for (var i = 0;i < renderState.length - 1; i++)
        destination.push(renderState[i]);
      return i < renderState.length ? (i = renderState[i], renderState.length = 0, destination.push(i)) : true;
    }
    function writeStartPendingSuspenseBoundary(destination, renderState, id) {
      destination.push(startPendingSuspenseBoundary1);
      if (id === null)
        throw Error("An ID must have been assigned before we can complete the boundary.");
      destination.push(renderState.boundaryPrefix);
      renderState = id.toString(16);
      destination.push(renderState);
      return destination.push(startPendingSuspenseBoundary2);
    }
    function writeStartSegment(destination, renderState, formatContext, id) {
      switch (formatContext.insertionMode) {
        case ROOT_HTML_MODE:
        case HTML_HTML_MODE:
        case HTML_HEAD_MODE:
        case HTML_MODE:
          return destination.push(startSegmentHTML), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentHTML2);
        case SVG_MODE:
          return destination.push(startSegmentSVG), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentSVG2);
        case MATHML_MODE:
          return destination.push(startSegmentMathML), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentMathML2);
        case HTML_TABLE_MODE:
          return destination.push(startSegmentTable), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentTable2);
        case HTML_TABLE_BODY_MODE:
          return destination.push(startSegmentTableBody), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentTableBody2);
        case HTML_TABLE_ROW_MODE:
          return destination.push(startSegmentTableRow), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentTableRow2);
        case HTML_COLGROUP_MODE:
          return destination.push(startSegmentColGroup), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push(startSegmentColGroup2);
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    function writeEndSegment(destination, formatContext) {
      switch (formatContext.insertionMode) {
        case ROOT_HTML_MODE:
        case HTML_HTML_MODE:
        case HTML_HEAD_MODE:
        case HTML_MODE:
          return destination.push(endSegmentHTML);
        case SVG_MODE:
          return destination.push(endSegmentSVG);
        case MATHML_MODE:
          return destination.push(endSegmentMathML);
        case HTML_TABLE_MODE:
          return destination.push(endSegmentTable);
        case HTML_TABLE_BODY_MODE:
          return destination.push(endSegmentTableBody);
        case HTML_TABLE_ROW_MODE:
          return destination.push(endSegmentTableRow);
        case HTML_COLGROUP_MODE:
          return destination.push(endSegmentColGroup);
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    function escapeJSStringsForInstructionScripts(input) {
      return JSON.stringify(input).replace(regexForJSStringsInInstructionScripts, function(match) {
        switch (match) {
          case "<":
            return "\\u003c";
          case "\u2028":
            return "\\u2028";
          case "\u2029":
            return "\\u2029";
          default:
            throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
        }
      });
    }
    function escapeJSObjectForInstructionScripts(input) {
      return JSON.stringify(input).replace(regexForJSStringsInScripts, function(match) {
        switch (match) {
          case "&":
            return "\\u0026";
          case ">":
            return "\\u003e";
          case "<":
            return "\\u003c";
          case "\u2028":
            return "\\u2028";
          case "\u2029":
            return "\\u2029";
          default:
            throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
        }
      });
    }
    function flushStyleTagsLateForBoundary(styleQueue) {
      var { rules, hrefs } = styleQueue;
      0 < rules.length && hrefs.length === 0 && console.error("React expected to have at least one href for an a hoistable style but found none. This is a bug in React.");
      var i = 0;
      if (hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(lateStyleTagResourceOpen1);
        this.push(styleQueue.precedence);
        for (this.push(lateStyleTagResourceOpen2);i < hrefs.length - 1; i++)
          this.push(hrefs[i]), this.push(spaceSeparator);
        this.push(hrefs[i]);
        this.push(lateStyleTagResourceOpen3);
        for (i = 0;i < rules.length; i++)
          this.push(rules[i]);
        destinationHasCapacity = this.push(lateStyleTagTemplateClose);
        currentlyRenderingBoundaryHasStylesToHoist = true;
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function hasStylesToHoist(stylesheet) {
      return stylesheet.state !== PREAMBLE ? currentlyRenderingBoundaryHasStylesToHoist = true : false;
    }
    function writeHoistablesForBoundary(destination, hoistableState, renderState) {
      currentlyRenderingBoundaryHasStylesToHoist = false;
      destinationHasCapacity = true;
      currentlyFlushingRenderState = renderState;
      hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
      currentlyFlushingRenderState = null;
      hoistableState.stylesheets.forEach(hasStylesToHoist);
      currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = true);
      return destinationHasCapacity;
    }
    function flushResource(resource) {
      for (var i = 0;i < resource.length; i++)
        this.push(resource[i]);
      resource.length = 0;
    }
    function flushStyleInPreamble(stylesheet) {
      pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
      for (var i = 0;i < stylesheetFlushingQueue.length; i++)
        this.push(stylesheetFlushingQueue[i]);
      stylesheetFlushingQueue.length = 0;
      stylesheet.state = PREAMBLE;
    }
    function flushStylesInPreamble(styleQueue) {
      var hasStylesheets = 0 < styleQueue.sheets.size;
      styleQueue.sheets.forEach(flushStyleInPreamble, this);
      styleQueue.sheets.clear();
      var { rules, hrefs } = styleQueue;
      if (!hasStylesheets || hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(styleTagResourceOpen1);
        this.push(styleQueue.precedence);
        styleQueue = 0;
        if (hrefs.length) {
          for (this.push(styleTagResourceOpen2);styleQueue < hrefs.length - 1; styleQueue++)
            this.push(hrefs[styleQueue]), this.push(spaceSeparator);
          this.push(hrefs[styleQueue]);
        }
        this.push(styleTagResourceOpen3);
        for (styleQueue = 0;styleQueue < rules.length; styleQueue++)
          this.push(rules[styleQueue]);
        this.push(styleTagResourceClose);
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function preloadLateStyle(stylesheet) {
      if (stylesheet.state === PENDING$1) {
        stylesheet.state = PRELOADED;
        var props = stylesheet.props;
        pushLinkImpl(stylesheetFlushingQueue, {
          rel: "preload",
          as: "style",
          href: stylesheet.props.href,
          crossOrigin: props.crossOrigin,
          fetchPriority: props.fetchPriority,
          integrity: props.integrity,
          media: props.media,
          hrefLang: props.hrefLang,
          referrerPolicy: props.referrerPolicy
        });
        for (stylesheet = 0;stylesheet < stylesheetFlushingQueue.length; stylesheet++)
          this.push(stylesheetFlushingQueue[stylesheet]);
        stylesheetFlushingQueue.length = 0;
      }
    }
    function preloadLateStyles(styleQueue) {
      styleQueue.sheets.forEach(preloadLateStyle, this);
      styleQueue.sheets.clear();
    }
    function pushCompletedShellIdAttribute(target, resumableState) {
      (resumableState.instructions & SentCompletedShellId) === NothingSent && (resumableState.instructions |= SentCompletedShellId, target.push(completedShellIdAttributeStart, escapeTextForBrowser("_" + resumableState.idPrefix + "R_"), attributeEnd));
    }
    function writeStyleResourceDependenciesInJS(destination, hoistableState) {
      destination.push(arrayFirstOpenBracket);
      var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
      hoistableState.stylesheets.forEach(function(resource) {
        if (resource.state !== PREAMBLE)
          if (resource.state === LATE)
            destination.push(nextArrayOpenBrackChunk), resource = resource.props.href, checkAttributeStringCoercion(resource, "href"), resource = escapeJSObjectForInstructionScripts("" + resource), destination.push(resource), destination.push(arrayCloseBracket), nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
          else {
            destination.push(nextArrayOpenBrackChunk);
            var precedence = resource.props["data-precedence"], props = resource.props, coercedHref = sanitizeURL("" + resource.props.href);
            coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
            destination.push(coercedHref);
            checkAttributeStringCoercion(precedence, "precedence");
            precedence = "" + precedence;
            destination.push(arrayInterstitial);
            precedence = escapeJSObjectForInstructionScripts(precedence);
            destination.push(precedence);
            for (var propKey in props)
              if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], precedence != null))
                switch (propKey) {
                  case "href":
                  case "rel":
                  case "precedence":
                  case "data-precedence":
                    break;
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error("link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
                  default:
                    writeStyleResourceAttributeInJS(destination, propKey, precedence);
                }
            destination.push(arrayCloseBracket);
            nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
            resource.state = LATE;
          }
      });
      destination.push(arrayCloseBracket);
    }
    function writeStyleResourceAttributeInJS(destination, name, value) {
      var attributeName = name.toLowerCase();
      switch (typeof value) {
        case "function":
        case "symbol":
          return;
      }
      switch (name) {
        case "innerHTML":
        case "dangerouslySetInnerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "style":
        case "ref":
          return;
        case "className":
          attributeName = "class";
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
          break;
        case "hidden":
          if (value === false)
            return;
          name = "";
          break;
        case "src":
        case "href":
          value = sanitizeURL(value);
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
          break;
        default:
          if (2 < name.length && (name[0] === "o" || name[0] === "O") && (name[1] === "n" || name[1] === "N") || !isAttributeNameSafe(name))
            return;
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
      }
      destination.push(arrayInterstitial);
      attributeName = escapeJSObjectForInstructionScripts(attributeName);
      destination.push(attributeName);
      destination.push(arrayInterstitial);
      attributeName = escapeJSObjectForInstructionScripts(name);
      destination.push(attributeName);
    }
    function createHoistableState() {
      return { styles: new Set, stylesheets: new Set, suspenseyImages: false };
    }
    function preloadBootstrapScriptOrModule(resumableState, renderState, href, props) {
      (resumableState.scriptResources.hasOwnProperty(href) || resumableState.moduleScriptResources.hasOwnProperty(href)) && console.error('Internal React Error: React expected bootstrap script or module with src "%s" to not have been preloaded already. please file an issue', href);
      resumableState.scriptResources[href] = EXISTS;
      resumableState.moduleScriptResources[href] = EXISTS;
      resumableState = [];
      pushLinkImpl(resumableState, props);
      renderState.bootstrapScripts.add(resumableState);
    }
    function adoptPreloadCredentials(target, preloadState) {
      target.crossOrigin == null && (target.crossOrigin = preloadState[0]);
      target.integrity == null && (target.integrity = preloadState[1]);
    }
    function getPreloadAsHeader(href, as, params) {
      href = escapeHrefForLinkHeaderURLContext(href);
      as = escapeStringForLinkHeaderQuotedParamValueContext(as, "as");
      as = "<" + href + '>; rel=preload; as="' + as + '"';
      for (var paramName in params)
        hasOwnProperty.call(params, paramName) && (href = params[paramName], typeof href === "string" && (as += "; " + paramName.toLowerCase() + '="' + escapeStringForLinkHeaderQuotedParamValueContext(href, paramName) + '"'));
      return as;
    }
    function escapeHrefForLinkHeaderURLContext(hrefInput) {
      checkAttributeStringCoercion(hrefInput, "href");
      return ("" + hrefInput).replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer);
    }
    function escapeHrefForLinkHeaderURLContextReplacer(match) {
      switch (match) {
        case "<":
          return "%3C";
        case ">":
          return "%3E";
        case `
`:
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
      }
    }
    function escapeStringForLinkHeaderQuotedParamValueContext(value, name) {
      willCoercionThrow(value) && (console.error("The provided `%s` option is an unsupported type %s. This value must be coerced to a string before using it here.", name, typeName(value)), testStringCoercion(value));
      return ("" + value).replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
    }
    function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
      switch (match) {
        case '"':
          return "%22";
        case "'":
          return "%27";
        case ";":
          return "%3B";
        case ",":
          return "%2C";
        case `
`:
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
      }
    }
    function hoistStyleQueueDependency(styleQueue) {
      this.styles.add(styleQueue);
    }
    function hoistStylesheetDependency(stylesheet) {
      this.stylesheets.add(stylesheet);
    }
    function hoistHoistables(parentState, childState) {
      childState.styles.forEach(hoistStyleQueueDependency, parentState);
      childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
      childState.suspenseyImages && (parentState.suspenseyImages = true);
    }
    function createRenderState(resumableState, generateStaticMarkup) {
      var idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
      bootstrapScriptContent !== undefined && (bootstrapChunks.push("<script"), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endOfStartTag, escapeEntireInlineScriptContent(bootstrapScriptContent), endInlineScript));
      idPrefix = {
        placeholderPrefix: idPrefix + "P:",
        segmentPrefix: idPrefix + "S:",
        boundaryPrefix: idPrefix + "B:",
        startInlineScript: "<script",
        startInlineStyle: "<style",
        preamble: { htmlChunks: null, headChunks: null, bodyChunks: null },
        externalRuntimeScript: null,
        bootstrapChunks,
        importMapChunks: [],
        onHeaders: undefined,
        headers: null,
        resets: {
          font: {},
          dns: {},
          connect: { default: {}, anonymous: {}, credentials: {} },
          image: {},
          style: {}
        },
        charsetChunks: [],
        viewportChunks: [],
        hoistableChunks: [],
        preconnects: new Set,
        fontPreloads: new Set,
        highImagePreloads: new Set,
        styles: new Map,
        bootstrapScripts: new Set,
        scripts: new Set,
        bulkPreloads: new Set,
        preloads: {
          images: new Map,
          stylesheets: new Map,
          scripts: new Map,
          moduleScripts: new Map
        },
        nonce: { script: undefined, style: undefined },
        hoistableState: null,
        stylesToHoist: false
      };
      if (bootstrapScripts !== undefined)
        for (bootstrapScriptContent = 0;bootstrapScriptContent < bootstrapScripts.length; bootstrapScriptContent++) {
          var scriptConfig = bootstrapScripts[bootstrapScriptContent], src, crossOrigin = undefined, integrity = undefined, props = {
            rel: "preload",
            as: "script",
            fetchPriority: "low",
            nonce: undefined
          };
          typeof scriptConfig === "string" ? props.href = src = scriptConfig : (props.href = src = scriptConfig.src, props.integrity = integrity = typeof scriptConfig.integrity === "string" ? scriptConfig.integrity : undefined, props.crossOrigin = crossOrigin = typeof scriptConfig === "string" || scriptConfig.crossOrigin == null ? undefined : scriptConfig.crossOrigin === "use-credentials" ? "use-credentials" : "");
          preloadBootstrapScriptOrModule(resumableState, idPrefix, src, props);
          bootstrapChunks.push('<script src="', escapeTextForBrowser(src), attributeEnd);
          typeof integrity === "string" && bootstrapChunks.push(' integrity="', escapeTextForBrowser(integrity), attributeEnd);
          typeof crossOrigin === "string" && bootstrapChunks.push(' crossorigin="', escapeTextForBrowser(crossOrigin), attributeEnd);
          pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
          bootstrapChunks.push(' async=""></script>');
        }
      if (bootstrapModules !== undefined)
        for (bootstrapScripts = 0;bootstrapScripts < bootstrapModules.length; bootstrapScripts++)
          bootstrapScriptContent = bootstrapModules[bootstrapScripts], crossOrigin = src = undefined, integrity = {
            rel: "modulepreload",
            fetchPriority: "low",
            nonce: undefined
          }, typeof bootstrapScriptContent === "string" ? integrity.href = scriptConfig = bootstrapScriptContent : (integrity.href = scriptConfig = bootstrapScriptContent.src, integrity.integrity = crossOrigin = typeof bootstrapScriptContent.integrity === "string" ? bootstrapScriptContent.integrity : undefined, integrity.crossOrigin = src = typeof bootstrapScriptContent === "string" || bootstrapScriptContent.crossOrigin == null ? undefined : bootstrapScriptContent.crossOrigin === "use-credentials" ? "use-credentials" : ""), preloadBootstrapScriptOrModule(resumableState, idPrefix, scriptConfig, integrity), bootstrapChunks.push('<script type="module" src="', escapeTextForBrowser(scriptConfig), attributeEnd), typeof crossOrigin === "string" && bootstrapChunks.push(' integrity="', escapeTextForBrowser(crossOrigin), attributeEnd), typeof src === "string" && bootstrapChunks.push(' crossorigin="', escapeTextForBrowser(src), attributeEnd), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(' async=""></script>');
      return {
        placeholderPrefix: idPrefix.placeholderPrefix,
        segmentPrefix: idPrefix.segmentPrefix,
        boundaryPrefix: idPrefix.boundaryPrefix,
        startInlineScript: idPrefix.startInlineScript,
        startInlineStyle: idPrefix.startInlineStyle,
        preamble: idPrefix.preamble,
        externalRuntimeScript: idPrefix.externalRuntimeScript,
        bootstrapChunks: idPrefix.bootstrapChunks,
        importMapChunks: idPrefix.importMapChunks,
        onHeaders: idPrefix.onHeaders,
        headers: idPrefix.headers,
        resets: idPrefix.resets,
        charsetChunks: idPrefix.charsetChunks,
        viewportChunks: idPrefix.viewportChunks,
        hoistableChunks: idPrefix.hoistableChunks,
        preconnects: idPrefix.preconnects,
        fontPreloads: idPrefix.fontPreloads,
        highImagePreloads: idPrefix.highImagePreloads,
        styles: idPrefix.styles,
        bootstrapScripts: idPrefix.bootstrapScripts,
        scripts: idPrefix.scripts,
        bulkPreloads: idPrefix.bulkPreloads,
        preloads: idPrefix.preloads,
        nonce: idPrefix.nonce,
        stylesToHoist: idPrefix.stylesToHoist,
        generateStaticMarkup
      };
    }
    function pushTextInstance(target, text, renderState, textEmbedded) {
      if (renderState.generateStaticMarkup)
        return target.push(escapeTextForBrowser(text)), false;
      text === "" ? target = textEmbedded : (textEmbedded && target.push("<!-- -->"), target.push(escapeTextForBrowser(text)), target = true);
      return target;
    }
    function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
      renderState.generateStaticMarkup || lastPushedText && textEmbedded && target.push("<!-- -->");
    }
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function popToNearestCommonAncestor(prev, next) {
      if (prev !== next) {
        prev.context._currentValue2 = prev.parentValue;
        prev = prev.parent;
        var parentNext = next.parent;
        if (prev === null) {
          if (parentNext !== null)
            throw Error("The stacks must reach the root at the same time. This is a bug in React.");
        } else {
          if (parentNext === null)
            throw Error("The stacks must reach the root at the same time. This is a bug in React.");
          popToNearestCommonAncestor(prev, parentNext);
        }
        next.context._currentValue2 = next.value;
      }
    }
    function popAllPrevious(prev) {
      prev.context._currentValue2 = prev.parentValue;
      prev = prev.parent;
      prev !== null && popAllPrevious(prev);
    }
    function pushAllNext(next) {
      var parentNext = next.parent;
      parentNext !== null && pushAllNext(parentNext);
      next.context._currentValue2 = next.value;
    }
    function popPreviousToCommonLevel(prev, next) {
      prev.context._currentValue2 = prev.parentValue;
      prev = prev.parent;
      if (prev === null)
        throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
      prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
    }
    function popNextToCommonLevel(prev, next) {
      var parentNext = next.parent;
      if (parentNext === null)
        throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
      prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
      next.context._currentValue2 = next.value;
    }
    function switchContext(newSnapshot) {
      var prev = currentActiveSnapshot;
      prev !== newSnapshot && (prev === null ? pushAllNext(newSnapshot) : newSnapshot === null ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
    }
    function warnOnInvalidCallback(callback) {
      if (callback !== null && typeof callback !== "function") {
        var key = String(callback);
        didWarnOnInvalidCallback.has(key) || (didWarnOnInvalidCallback.add(key), console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.", callback));
      }
    }
    function warnNoop(publicInstance, callerName) {
      publicInstance = (publicInstance = publicInstance.constructor) && getComponentNameFromType(publicInstance) || "ReactClass";
      var warningKey = publicInstance + "." + callerName;
      didWarnAboutNoopUpdateForComponent[warningKey] || (console.error(`Can only update a mounting component. This usually means you called %s() outside componentWillMount() on the server. This is a no-op.

Please check the code for the %s component.`, callerName, publicInstance), didWarnAboutNoopUpdateForComponent[warningKey] = true);
    }
    function pushTreeContext(baseContext, totalChildren, index) {
      var baseIdWithLeadingBit = baseContext.id;
      baseContext = baseContext.overflow;
      var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
      baseIdWithLeadingBit &= ~(1 << baseLength);
      index += 1;
      var length = 32 - clz32(totalChildren) + baseLength;
      if (30 < length) {
        var numberOfOverflowBits = baseLength - baseLength % 5;
        length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
        baseIdWithLeadingBit >>= numberOfOverflowBits;
        baseLength -= numberOfOverflowBits;
        return {
          id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
          overflow: length + baseContext
        };
      }
      return {
        id: 1 << length | index << baseLength | baseIdWithLeadingBit,
        overflow: baseContext
      };
    }
    function clz32Fallback(x) {
      x >>>= 0;
      return x === 0 ? 32 : 31 - (log(x) / LN2 | 0) | 0;
    }
    function noop() {}
    function trackUsedThenable(thenableState2, thenable, index) {
      index = thenableState2[index];
      index === undefined ? thenableState2.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          typeof thenable.status === "string" ? thenable.then(noop, noop) : (thenableState2 = thenable, thenableState2.status = "pending", thenableState2.then(function(fulfilledValue) {
            if (thenable.status === "pending") {
              var fulfilledThenable = thenable;
              fulfilledThenable.status = "fulfilled";
              fulfilledThenable.value = fulfilledValue;
            }
          }, function(error) {
            if (thenable.status === "pending") {
              var rejectedThenable = thenable;
              rejectedThenable.status = "rejected";
              rejectedThenable.reason = error;
            }
          }));
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
          suspendedThenable = thenable;
          throw SuspenseException;
      }
    }
    function getSuspendedThenable() {
      if (suspendedThenable === null)
        throw Error("Expected a suspended thenable. This is a bug in React. Please file an issue.");
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function is(x, y) {
      return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y;
    }
    function resolveCurrentlyRenderingComponent() {
      if (currentlyRenderingComponent === null)
        throw Error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
      isInHookUserCodeInDev && console.error("Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://react.dev/link/rules-of-hooks");
      return currentlyRenderingComponent;
    }
    function createHook() {
      if (0 < numberOfReRenders)
        throw Error("Rendered more hooks than during the previous render");
      return { memoizedState: null, queue: null, next: null };
    }
    function createWorkInProgressHook() {
      workInProgressHook === null ? firstWorkInProgressHook === null ? (isReRender = false, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = true, workInProgressHook = firstWorkInProgressHook) : workInProgressHook.next === null ? (isReRender = false, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = true, workInProgressHook = workInProgressHook.next);
      return workInProgressHook;
    }
    function getThenableStateAfterSuspending() {
      var state = thenableState;
      thenableState = null;
      return state;
    }
    function resetHooksState() {
      isInHookUserCodeInDev = false;
      currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
      didScheduleRenderPhaseUpdate = false;
      firstWorkInProgressHook = null;
      numberOfReRenders = 0;
      workInProgressHook = renderPhaseUpdates = null;
    }
    function readContext(context) {
      isInHookUserCodeInDev && console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");
      return context._currentValue2;
    }
    function basicStateReducer(state, action) {
      return typeof action === "function" ? action(state) : action;
    }
    function useReducer(reducer, initialArg, init) {
      reducer !== basicStateReducer && (currentHookNameInDev = "useReducer");
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      if (isReRender) {
        init = workInProgressHook.queue;
        initialArg = init.dispatch;
        if (renderPhaseUpdates !== null) {
          var firstRenderPhaseUpdate = renderPhaseUpdates.get(init);
          if (firstRenderPhaseUpdate !== undefined) {
            renderPhaseUpdates.delete(init);
            init = workInProgressHook.memoizedState;
            do {
              var action = firstRenderPhaseUpdate.action;
              isInHookUserCodeInDev = true;
              init = reducer(init, action);
              isInHookUserCodeInDev = false;
              firstRenderPhaseUpdate = firstRenderPhaseUpdate.next;
            } while (firstRenderPhaseUpdate !== null);
            workInProgressHook.memoizedState = init;
            return [init, initialArg];
          }
        }
        return [workInProgressHook.memoizedState, initialArg];
      }
      isInHookUserCodeInDev = true;
      reducer = reducer === basicStateReducer ? typeof initialArg === "function" ? initialArg() : initialArg : init !== undefined ? init(initialArg) : initialArg;
      isInHookUserCodeInDev = false;
      workInProgressHook.memoizedState = reducer;
      reducer = workInProgressHook.queue = { last: null, dispatch: null };
      reducer = reducer.dispatch = dispatchAction.bind(null, currentlyRenderingComponent, reducer);
      return [workInProgressHook.memoizedState, reducer];
    }
    function useMemo(nextCreate, deps) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      if (workInProgressHook !== null) {
        var prevState = workInProgressHook.memoizedState;
        if (prevState !== null && deps !== null) {
          a: {
            var JSCompiler_inline_result = prevState[1];
            if (JSCompiler_inline_result === null)
              console.error("%s received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.", currentHookNameInDev), JSCompiler_inline_result = false;
            else {
              deps.length !== JSCompiler_inline_result.length && console.error(`The final argument passed to %s changed size between renders. The order and size of this array must remain constant.

Previous: %s
Incoming: %s`, currentHookNameInDev, "[" + deps.join(", ") + "]", "[" + JSCompiler_inline_result.join(", ") + "]");
              for (var i = 0;i < JSCompiler_inline_result.length && i < deps.length; i++)
                if (!objectIs(deps[i], JSCompiler_inline_result[i])) {
                  JSCompiler_inline_result = false;
                  break a;
                }
              JSCompiler_inline_result = true;
            }
          }
          if (JSCompiler_inline_result)
            return prevState[0];
        }
      }
      isInHookUserCodeInDev = true;
      nextCreate = nextCreate();
      isInHookUserCodeInDev = false;
      workInProgressHook.memoizedState = [nextCreate, deps];
      return nextCreate;
    }
    function dispatchAction(componentIdentity, queue, action) {
      if (25 <= numberOfReRenders)
        throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");
      if (componentIdentity === currentlyRenderingComponent)
        if (didScheduleRenderPhaseUpdate = true, componentIdentity = { action, next: null }, renderPhaseUpdates === null && (renderPhaseUpdates = new Map), action = renderPhaseUpdates.get(queue), action === undefined)
          renderPhaseUpdates.set(queue, componentIdentity);
        else {
          for (queue = action;queue.next !== null; )
            queue = queue.next;
          queue.next = componentIdentity;
        }
    }
    function throwOnUseEffectEventCall() {
      throw Error("A function wrapped in useEffectEvent can't be called during rendering.");
    }
    function unsupportedStartTransition() {
      throw Error("startTransition cannot be called during server rendering.");
    }
    function unsupportedSetOptimisticState() {
      throw Error("Cannot update optimistic state while rendering.");
    }
    function useActionState(action, initialState, permalink) {
      resolveCurrentlyRenderingComponent();
      var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
      if (typeof action.$$FORM_ACTION === "function") {
        var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
        request = request.formState;
        var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
        if (request !== null && typeof isSignatureEqual === "function") {
          var postbackKey = request[1];
          isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = permalink !== undefined ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
            componentKeyPath,
            null,
            actionStateHookIndex
          ]), 0), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
        }
        var boundAction = action.bind(null, initialState);
        action = function(payload) {
          boundAction(payload);
        };
        typeof boundAction.$$FORM_ACTION === "function" && (action.$$FORM_ACTION = function(prefix2) {
          prefix2 = boundAction.$$FORM_ACTION(prefix2);
          permalink !== undefined && (checkAttributeStringCoercion(permalink, "target"), permalink += "", prefix2.action = permalink);
          var formData = prefix2.data;
          formData && (nextPostbackStateKey === null && (nextPostbackStateKey = permalink !== undefined ? "p" + permalink : "k" + murmurhash3_32_gc(JSON.stringify([
            componentKeyPath,
            null,
            actionStateHookIndex
          ]), 0)), formData.append("$ACTION_KEY", nextPostbackStateKey));
          return prefix2;
        });
        return [initialState, action, false];
      }
      var _boundAction = action.bind(null, initialState);
      return [
        initialState,
        function(payload) {
          _boundAction(payload);
        },
        false
      ];
    }
    function unwrapThenable(thenable) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      thenableState === null && (thenableState = []);
      return trackUsedThenable(thenableState, thenable, index);
    }
    function unsupportedRefresh() {
      throw Error("Cache cannot be refreshed during server rendering.");
    }
    function disabledLog() {}
    function disableLogs() {
      if (disabledDepth === 0) {
        prevLog = console.log;
        prevInfo = console.info;
        prevWarn = console.warn;
        prevError = console.error;
        prevGroup = console.group;
        prevGroupCollapsed = console.groupCollapsed;
        prevGroupEnd = console.groupEnd;
        var props = {
          configurable: true,
          enumerable: true,
          value: disabledLog,
          writable: true
        };
        Object.defineProperties(console, {
          info: props,
          log: props,
          warn: props,
          error: props,
          group: props,
          groupCollapsed: props,
          groupEnd: props
        });
      }
      disabledDepth++;
    }
    function reenableLogs() {
      disabledDepth--;
      if (disabledDepth === 0) {
        var props = { configurable: true, enumerable: true, writable: true };
        Object.defineProperties(console, {
          log: assign({}, props, { value: prevLog }),
          info: assign({}, props, { value: prevInfo }),
          warn: assign({}, props, { value: prevWarn }),
          error: assign({}, props, { value: prevError }),
          group: assign({}, props, { value: prevGroup }),
          groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
          groupEnd: assign({}, props, { value: prevGroupEnd })
        });
      }
      0 > disabledDepth && console.error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
    }
    function formatOwnerStack(error) {
      var prevPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = undefined;
      error = error.stack;
      Error.prepareStackTrace = prevPrepareStackTrace;
      error.startsWith(`Error: react-stack-top-frame
`) && (error = error.slice(29));
      prevPrepareStackTrace = error.indexOf(`
`);
      prevPrepareStackTrace !== -1 && (error = error.slice(prevPrepareStackTrace + 1));
      prevPrepareStackTrace = error.indexOf("react_stack_bottom_frame");
      prevPrepareStackTrace !== -1 && (prevPrepareStackTrace = error.lastIndexOf(`
`, prevPrepareStackTrace));
      if (prevPrepareStackTrace !== -1)
        error = error.slice(0, prevPrepareStackTrace);
      else
        return "";
      return error;
    }
    function describeBuiltInComponentFrame(name) {
      if (prefix === undefined)
        try {
          throw Error();
        } catch (x) {
          var match = x.stack.trim().match(/\n( *(at )?)/);
          prefix = match && match[1] || "";
          suffix = -1 < x.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
        }
      return `
` + prefix + name + suffix;
    }
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry)
        return "";
      var frame = componentFrameCache.get(fn);
      if (frame !== undefined)
        return frame;
      reentry = true;
      frame = Error.prepareStackTrace;
      Error.prepareStackTrace = undefined;
      var previousDispatcher2 = null;
      previousDispatcher2 = ReactSharedInternals.H;
      ReactSharedInternals.H = null;
      disableLogs();
      try {
        var RunInRootFrame = {
          DetermineComponentFrameRoot: function() {
            try {
              if (construct) {
                var Fake = function() {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function() {
                    throw Error();
                  }
                });
                if (typeof Reflect === "object" && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    var control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x$0) {
                    control = x$0;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x$1) {
                  control = x$1;
                }
                (Fake = fn()) && typeof Fake.catch === "function" && Fake.catch(function() {});
              }
            } catch (sample) {
              if (sample && control && typeof sample.stack === "string")
                return [sample.stack, control.stack];
            }
            return [null, null];
          }
        };
        RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
        var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
        namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
        var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split(`
`), controlLines = controlStack.split(`
`);
          for (_RunInRootFrame$Deter = namePropDescriptor = 0;namePropDescriptor < sampleLines.length && !sampleLines[namePropDescriptor].includes("DetermineComponentFrameRoot"); )
            namePropDescriptor++;
          for (;_RunInRootFrame$Deter < controlLines.length && !controlLines[_RunInRootFrame$Deter].includes("DetermineComponentFrameRoot"); )
            _RunInRootFrame$Deter++;
          if (namePropDescriptor === sampleLines.length || _RunInRootFrame$Deter === controlLines.length)
            for (namePropDescriptor = sampleLines.length - 1, _RunInRootFrame$Deter = controlLines.length - 1;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter && sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]; )
              _RunInRootFrame$Deter--;
          for (;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter; namePropDescriptor--, _RunInRootFrame$Deter--)
            if (sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
              if (namePropDescriptor !== 1 || _RunInRootFrame$Deter !== 1) {
                do
                  if (namePropDescriptor--, _RunInRootFrame$Deter--, 0 > _RunInRootFrame$Deter || sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                    var _frame = `
` + sampleLines[namePropDescriptor].replace(" at new ", " at ");
                    fn.displayName && _frame.includes("<anonymous>") && (_frame = _frame.replace("<anonymous>", fn.displayName));
                    typeof fn === "function" && componentFrameCache.set(fn, _frame);
                    return _frame;
                  }
                while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
              }
              break;
            }
        }
      } finally {
        reentry = false, ReactSharedInternals.H = previousDispatcher2, reenableLogs(), Error.prepareStackTrace = frame;
      }
      sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(sampleLines) : "";
      typeof fn === "function" && componentFrameCache.set(fn, sampleLines);
      return sampleLines;
    }
    function describeComponentStackByType(type) {
      if (typeof type === "string")
        return describeBuiltInComponentFrame(type);
      if (typeof type === "function")
        return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, true) : describeNativeComponentFrame(type, false);
      if (typeof type === "object" && type !== null) {
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeNativeComponentFrame(type.render, false);
          case REACT_MEMO_TYPE:
            return describeNativeComponentFrame(type.type, false);
          case REACT_LAZY_TYPE:
            var lazyComponent = type, payload = lazyComponent._payload;
            lazyComponent = lazyComponent._init;
            try {
              type = lazyComponent(payload);
            } catch (x) {
              return describeBuiltInComponentFrame("Lazy");
            }
            return describeComponentStackByType(type);
        }
        if (typeof type.name === "string") {
          a: {
            payload = type.name;
            lazyComponent = type.env;
            type = type.debugLocation;
            if (type != null) {
              type = formatOwnerStack(type);
              var idx = type.lastIndexOf(`
`);
              type = idx === -1 ? type : type.slice(idx + 1);
              if (type.indexOf(payload) !== -1) {
                payload = `
` + type;
                break a;
              }
            }
            payload = describeBuiltInComponentFrame(payload + (lazyComponent ? " [" + lazyComponent + "]" : ""));
          }
          return payload;
        }
      }
      switch (type) {
        case REACT_SUSPENSE_LIST_TYPE:
          return describeBuiltInComponentFrame("SuspenseList");
        case REACT_SUSPENSE_TYPE:
          return describeBuiltInComponentFrame("Suspense");
      }
      return "";
    }
    function isEligibleForOutlining(request, boundary) {
      return (500 < boundary.byteSize || false) && boundary.contentPreamble === null;
    }
    function defaultErrorHandler(error) {
      if (typeof error === "object" && error !== null && typeof error.environmentName === "string") {
        var JSCompiler_inline_result = error.environmentName;
        error = [error].slice(0);
        typeof error[0] === "string" ? error.splice(0, 1, "[%s] " + error[0], " " + JSCompiler_inline_result + " ") : error.splice(0, 0, "[%s]", " " + JSCompiler_inline_result + " ");
        error.unshift(console);
        JSCompiler_inline_result = bind.apply(console.error, error);
        JSCompiler_inline_result();
      } else
        console.error(error);
      return null;
    }
    function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError2, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      var abortSet = new Set;
      this.destination = null;
      this.flushScheduled = false;
      this.resumableState = resumableState;
      this.renderState = renderState;
      this.rootFormatContext = rootFormatContext;
      this.progressiveChunkSize = progressiveChunkSize === undefined ? 12800 : progressiveChunkSize;
      this.status = 10;
      this.fatalError = null;
      this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
      this.completedPreambleSegments = this.completedRootSegment = null;
      this.byteSize = 0;
      this.abortableTasks = abortSet;
      this.pingedTasks = [];
      this.clientRenderedBoundaries = [];
      this.completedBoundaries = [];
      this.partialBoundaries = [];
      this.trackedPostpones = null;
      this.onError = onError2 === undefined ? defaultErrorHandler : onError2;
      this.onPostpone = onPostpone === undefined ? noop : onPostpone;
      this.onAllReady = onAllReady === undefined ? noop : onAllReady;
      this.onShellReady = onShellReady === undefined ? noop : onShellReady;
      this.onShellError = onShellError === undefined ? noop : onShellError;
      this.onFatalError = onFatalError === undefined ? noop : onFatalError;
      this.formState = formState === undefined ? null : formState;
      this.didWarnForKey = null;
    }
    function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError2, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      var now = getCurrentTime();
      1000 < now - lastResetTime && (ReactSharedInternals.recentlyCreatedOwnerStacks = 0, lastResetTime = now);
      resumableState = new RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError2, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState);
      renderState = createPendingSegment(resumableState, 0, null, rootFormatContext, false, false);
      renderState.parentFlushed = true;
      children = createRenderTask(resumableState, null, children, -1, null, renderState, null, null, resumableState.abortableTasks, null, rootFormatContext, null, emptyTreeContext, null, null, emptyContextObject, null);
      pushComponentStack(children);
      resumableState.pingedTasks.push(children);
      return resumableState;
    }
    function pingTask(request, task) {
      request.pingedTasks.push(task);
      request.pingedTasks.length === 1 && (request.flushScheduled = request.destination !== null, performWork(request));
    }
    function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
      fallbackAbortableTasks = {
        status: PENDING,
        rootSegmentID: -1,
        parentFlushed: false,
        pendingTasks: 0,
        row,
        completedSegments: [],
        byteSize: 0,
        fallbackAbortableTasks,
        errorDigest: null,
        contentState: createHoistableState(),
        fallbackState: createHoistableState(),
        contentPreamble,
        fallbackPreamble,
        trackedContentKeyPath: null,
        trackedFallbackNode: null,
        errorMessage: null,
        errorStack: null,
        errorComponentStack: null
      };
      row !== null && (row.pendingTasks++, contentPreamble = row.boundaries, contentPreamble !== null && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, request !== null && hoistHoistables(fallbackAbortableTasks.contentState, request));
      return fallbackAbortableTasks;
    }
    function createRenderTask(request, thenableState2, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack, legacyContext, debugTask) {
      request.allPendingTasks++;
      blockedBoundary === null ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      row !== null && row.pendingTasks++;
      var task = {
        replay: null,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment,
        blockedPreamble,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      task.debugTask = debugTask;
      abortSet.add(task);
      return task;
    }
    function createReplayTask(request, thenableState2, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack, legacyContext, debugTask) {
      request.allPendingTasks++;
      blockedBoundary === null ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      row !== null && row.pendingTasks++;
      replay.pendingTasks++;
      var task = {
        replay,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment: null,
        blockedPreamble: null,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      task.debugTask = debugTask;
      abortSet.add(task);
      return task;
    }
    function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
      return {
        status: PENDING,
        parentFlushed: false,
        id: -1,
        index,
        chunks: [],
        children: [],
        preambleChildren: [],
        parentFormatContext,
        boundary,
        lastPushedText,
        textEmbedded
      };
    }
    function getCurrentStackInDEV() {
      if (currentTaskInDEV === null || currentTaskInDEV.componentStack === null)
        return "";
      var componentStack = currentTaskInDEV.componentStack;
      try {
        var info = "";
        if (typeof componentStack.type === "string")
          info += describeBuiltInComponentFrame(componentStack.type);
        else if (typeof componentStack.type === "function") {
          if (!componentStack.owner) {
            var JSCompiler_temp_const = info, fn = componentStack.type, name = fn ? fn.displayName || fn.name : "";
            var JSCompiler_inline_result = name ? describeBuiltInComponentFrame(name) : "";
            info = JSCompiler_temp_const + JSCompiler_inline_result;
          }
        } else
          componentStack.owner || (info += describeComponentStackByType(componentStack.type));
        for (;componentStack; )
          JSCompiler_temp_const = null, componentStack.debugStack != null ? JSCompiler_temp_const = formatOwnerStack(componentStack.debugStack) : (JSCompiler_inline_result = componentStack, JSCompiler_inline_result.stack != null && (JSCompiler_temp_const = typeof JSCompiler_inline_result.stack !== "string" ? JSCompiler_inline_result.stack = formatOwnerStack(JSCompiler_inline_result.stack) : JSCompiler_inline_result.stack)), (componentStack = componentStack.owner) && JSCompiler_temp_const && (info += `
` + JSCompiler_temp_const);
        var JSCompiler_inline_result$jscomp$0 = info;
      } catch (x) {
        JSCompiler_inline_result$jscomp$0 = `
Error generating stack: ` + x.message + `
` + x.stack;
      }
      return JSCompiler_inline_result$jscomp$0;
    }
    function pushHaltedAwaitOnComponentStack(task, debugInfo) {
      if (debugInfo != null)
        for (var i = debugInfo.length - 1;0 <= i; i--) {
          var info = debugInfo[i];
          if (typeof info.name === "string")
            break;
          if (typeof info.time === "number")
            break;
          if (info.awaited != null) {
            var bestStack = info.debugStack == null ? info.awaited : info;
            if (bestStack.debugStack !== undefined) {
              task.componentStack = {
                parent: task.componentStack,
                type: info,
                owner: bestStack.owner,
                stack: bestStack.debugStack
              };
              task.debugTask = bestStack.debugTask;
              break;
            }
          }
        }
    }
    function pushServerComponentStack(task, debugInfo) {
      if (debugInfo != null)
        for (var i = 0;i < debugInfo.length; i++) {
          var componentInfo = debugInfo[i];
          typeof componentInfo.name === "string" && componentInfo.debugStack !== undefined && (task.componentStack = {
            parent: task.componentStack,
            type: componentInfo,
            owner: componentInfo.owner,
            stack: componentInfo.debugStack
          }, task.debugTask = componentInfo.debugTask);
        }
    }
    function pushComponentStack(task) {
      var node = task.node;
      if (typeof node === "object" && node !== null)
        switch (node.$$typeof) {
          case REACT_ELEMENT_TYPE:
            var { type, _owner: owner, _debugStack: stack } = node;
            pushServerComponentStack(task, node._debugInfo);
            task.debugTask = node._debugTask;
            task.componentStack = {
              parent: task.componentStack,
              type,
              owner,
              stack
            };
            break;
          case REACT_LAZY_TYPE:
            pushServerComponentStack(task, node._debugInfo);
            break;
          default:
            typeof node.then === "function" && pushServerComponentStack(task, node._debugInfo);
        }
    }
    function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
      return componentStack === null ? null : {
        parent: componentStack.parent,
        type: "Suspense Fallback",
        owner: componentStack.owner,
        stack: componentStack.stack
      };
    }
    function getThrownInfo(node$jscomp$0) {
      var errorInfo = {};
      node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
        configurable: true,
        enumerable: true,
        get: function() {
          try {
            var info = "", node = node$jscomp$0;
            do
              info += describeComponentStackByType(node.type), node = node.parent;
            while (node);
            var stack = info;
          } catch (x) {
            stack = `
Error generating stack: ` + x.message + `
` + x.stack;
          }
          Object.defineProperty(errorInfo, "componentStack", {
            value: stack
          });
          return stack;
        }
      });
      return errorInfo;
    }
    function encodeErrorForBoundary(boundary, digest, error, thrownInfo, wasAborted) {
      boundary.errorDigest = digest;
      error instanceof Error ? (digest = String(error.message), error = String(error.stack)) : (digest = typeof error === "object" && error !== null ? describeObjectForErrorMessage(error) : String(error), error = null);
      wasAborted = wasAborted ? `Switched to client rendering because the server rendering aborted due to:

` : `Switched to client rendering because the server rendering errored:

`;
      boundary.errorMessage = wasAborted + digest;
      boundary.errorStack = error !== null ? wasAborted + error : null;
      boundary.errorComponentStack = thrownInfo.componentStack;
    }
    function logRecoverableError(request, error, errorInfo, debugTask) {
      request = request.onError;
      error = debugTask ? debugTask.run(request.bind(null, error, errorInfo)) : request(error, errorInfo);
      if (error != null && typeof error !== "string")
        console.error('onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "%s" instead', typeof error);
      else
        return error;
    }
    function fatalError(request, error, errorInfo, debugTask) {
      errorInfo = request.onShellError;
      var onFatalError = request.onFatalError;
      debugTask ? (debugTask.run(errorInfo.bind(null, error)), debugTask.run(onFatalError.bind(null, error))) : (errorInfo(error), onFatalError(error));
      request.destination !== null ? (request.status = CLOSED, request.destination.destroy(error)) : (request.status = 13, request.fatalError = error);
    }
    function finishSuspenseListRow(request, row) {
      unblockSuspenseListRow(request, row.next, row.hoistables);
    }
    function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
      for (;unblockedRow !== null; ) {
        inheritedHoistables !== null && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
        var unblockedBoundaries = unblockedRow.boundaries;
        if (unblockedBoundaries !== null) {
          unblockedRow.boundaries = null;
          for (var i = 0;i < unblockedBoundaries.length; i++) {
            var unblockedBoundary = unblockedBoundaries[i];
            inheritedHoistables !== null && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
            finishedTask(request, unblockedBoundary, null, null);
          }
        }
        unblockedRow.pendingTasks--;
        if (0 < unblockedRow.pendingTasks)
          break;
        inheritedHoistables = unblockedRow.hoistables;
        unblockedRow = unblockedRow.next;
      }
    }
    function tryToResolveTogetherRow(request, togetherRow) {
      var boundaries = togetherRow.boundaries;
      if (boundaries !== null && togetherRow.pendingTasks === boundaries.length) {
        for (var allCompleteAndInlinable = true, i = 0;i < boundaries.length; i++) {
          var rowBoundary = boundaries[i];
          if (rowBoundary.pendingTasks !== 1 || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
            allCompleteAndInlinable = false;
            break;
          }
        }
        allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
      }
    }
    function createSuspenseListRow(previousRow) {
      var newRow = {
        pendingTasks: 1,
        boundaries: null,
        hoistables: createHoistableState(),
        inheritedHoistables: null,
        together: false,
        next: null
      };
      previousRow !== null && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
      return newRow;
    }
    function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
      var { keyPath: prevKeyPath, treeContext: prevTreeContext, row: prevRow, componentStack: previousComponentStack } = task;
      var previousDebugTask = task.debugTask;
      pushServerComponentStack(task, task.node.props.children._debugInfo);
      task.keyPath = keyPath;
      keyPath = rows.length;
      var previousSuspenseListRow = null;
      if (task.replay !== null) {
        var resumeSlots = task.replay.slots;
        if (resumeSlots !== null && typeof resumeSlots === "object")
          for (var n = 0;n < keyPath; n++) {
            var i = revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards" ? n : keyPath - 1 - n, node = rows[i];
            task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
            task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
            var resumeSegmentID = resumeSlots[i];
            typeof resumeSegmentID === "number" ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
            --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
          }
        else
          for (resumeSlots = 0;resumeSlots < keyPath; resumeSlots++)
            n = revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards" ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], warnForMissingKey(request, task, i), task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
      } else if (revealOrder !== "backwards" && revealOrder !== "unstable_legacy-backwards")
        for (revealOrder = 0;revealOrder < keyPath; revealOrder++)
          resumeSlots = rows[revealOrder], warnForMissingKey(request, task, resumeSlots), task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, revealOrder), renderNode(request, task, resumeSlots, revealOrder), --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
      else {
        revealOrder = task.blockedSegment;
        resumeSlots = revealOrder.children.length;
        n = revealOrder.chunks.length;
        for (i = keyPath - 1;0 <= i; i--) {
          node = rows[i];
          task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow);
          task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
          resumeSegmentID = createPendingSegment(request, n, null, task.formatContext, i === 0 ? revealOrder.lastPushedText : true, true);
          revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
          task.blockedSegment = resumeSegmentID;
          warnForMissingKey(request, task, node);
          try {
            renderNode(request, task, node, i), pushSegmentFinale(resumeSegmentID.chunks, request.renderState, resumeSegmentID.lastPushedText, resumeSegmentID.textEmbedded), resumeSegmentID.status = COMPLETED, --previousSuspenseListRow.pendingTasks === 0 && finishSuspenseListRow(request, previousSuspenseListRow);
          } catch (thrownValue) {
            throw resumeSegmentID.status = request.status === 12 ? ABORTED : ERRORED, thrownValue;
          }
        }
        task.blockedSegment = revealOrder;
        revealOrder.lastPushedText = false;
      }
      prevRow !== null && previousSuspenseListRow !== null && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
      task.treeContext = prevTreeContext;
      task.row = prevRow;
      task.keyPath = prevKeyPath;
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
    }
    function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
      var prevThenableState = task.thenableState;
      task.thenableState = null;
      currentlyRenderingComponent = {};
      currentlyRenderingTask = task;
      currentlyRenderingRequest = request;
      currentlyRenderingKeyPath = keyPath;
      isInHookUserCodeInDev = false;
      actionStateCounter = localIdCounter = 0;
      actionStateMatchingIndex = -1;
      thenableIndexCounter = 0;
      thenableState = prevThenableState;
      for (request = callComponentInDEV(Component, props, secondArg);didScheduleRenderPhaseUpdate; )
        didScheduleRenderPhaseUpdate = false, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
      resetHooksState();
      return request;
    }
    function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex2) {
      var didEmitActionStateMarkers = false;
      if (actionStateCount !== 0 && request.formState !== null) {
        var segment = task.blockedSegment;
        if (segment !== null) {
          didEmitActionStateMarkers = true;
          segment = segment.chunks;
          for (var i = 0;i < actionStateCount; i++)
            i === actionStateMatchingIndex2 ? segment.push("<!--F!-->") : segment.push("<!--F-->");
        }
      }
      actionStateCount = task.keyPath;
      task.keyPath = keyPath;
      hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
      task.keyPath = actionStateCount;
    }
    function renderElement(request, task, keyPath, type, props, ref) {
      if (typeof type === "function")
        if (type.prototype && type.prototype.isReactComponent) {
          var newProps = props;
          if ("ref" in props) {
            newProps = {};
            for (var propName in props)
              propName !== "ref" && (newProps[propName] = props[propName]);
          }
          var defaultProps = type.defaultProps;
          if (defaultProps) {
            newProps === props && (newProps = assign({}, newProps, props));
            for (var _propName in defaultProps)
              newProps[_propName] === undefined && (newProps[_propName] = defaultProps[_propName]);
          }
          var resolvedProps = newProps;
          var context = emptyContextObject, contextType = type.contextType;
          if ("contextType" in type && contextType !== null && (contextType === undefined || contextType.$$typeof !== REACT_CONTEXT_TYPE) && !didWarnAboutInvalidateContextType.has(type)) {
            didWarnAboutInvalidateContextType.add(type);
            var addendum = contextType === undefined ? " However, it is set to undefined. This can be caused by a typo or by mixing up named and default imports. This can also happen due to a circular dependency, so try moving the createContext() call to a separate file." : typeof contextType !== "object" ? " However, it is set to a " + typeof contextType + "." : contextType.$$typeof === REACT_CONSUMER_TYPE ? " Did you accidentally pass the Context.Consumer instead?" : " However, it is set to an object with keys {" + Object.keys(contextType).join(", ") + "}.";
            console.error("%s defines an invalid contextType. contextType should point to the Context object returned by React.createContext().%s", getComponentNameFromType(type) || "Component", addendum);
          }
          typeof contextType === "object" && contextType !== null && (context = contextType._currentValue2);
          var instance = new type(resolvedProps, context);
          if (typeof type.getDerivedStateFromProps === "function" && (instance.state === null || instance.state === undefined)) {
            var componentName = getComponentNameFromType(type) || "Component";
            didWarnAboutUninitializedState.has(componentName) || (didWarnAboutUninitializedState.add(componentName), console.error("`%s` uses `getDerivedStateFromProps` but its initial state is %s. This is not recommended. Instead, define the initial state by assigning an object to `this.state` in the constructor of `%s`. This ensures that `getDerivedStateFromProps` arguments have a consistent shape.", componentName, instance.state === null ? "null" : "undefined", componentName));
          }
          if (typeof type.getDerivedStateFromProps === "function" || typeof instance.getSnapshotBeforeUpdate === "function") {
            var foundWillMountName = null, foundWillReceivePropsName = null, foundWillUpdateName = null;
            typeof instance.componentWillMount === "function" && instance.componentWillMount.__suppressDeprecationWarning !== true ? foundWillMountName = "componentWillMount" : typeof instance.UNSAFE_componentWillMount === "function" && (foundWillMountName = "UNSAFE_componentWillMount");
            typeof instance.componentWillReceiveProps === "function" && instance.componentWillReceiveProps.__suppressDeprecationWarning !== true ? foundWillReceivePropsName = "componentWillReceiveProps" : typeof instance.UNSAFE_componentWillReceiveProps === "function" && (foundWillReceivePropsName = "UNSAFE_componentWillReceiveProps");
            typeof instance.componentWillUpdate === "function" && instance.componentWillUpdate.__suppressDeprecationWarning !== true ? foundWillUpdateName = "componentWillUpdate" : typeof instance.UNSAFE_componentWillUpdate === "function" && (foundWillUpdateName = "UNSAFE_componentWillUpdate");
            if (foundWillMountName !== null || foundWillReceivePropsName !== null || foundWillUpdateName !== null) {
              var _componentName = getComponentNameFromType(type) || "Component", newApiName = typeof type.getDerivedStateFromProps === "function" ? "getDerivedStateFromProps()" : "getSnapshotBeforeUpdate()";
              didWarnAboutLegacyLifecyclesAndDerivedState.has(_componentName) || (didWarnAboutLegacyLifecyclesAndDerivedState.add(_componentName), console.error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

%s uses %s but also contains the following legacy lifecycles:%s%s%s

The above lifecycles should be removed. Learn more about this warning here:
https://react.dev/link/unsafe-component-lifecycles`, _componentName, newApiName, foundWillMountName !== null ? `
  ` + foundWillMountName : "", foundWillReceivePropsName !== null ? `
  ` + foundWillReceivePropsName : "", foundWillUpdateName !== null ? `
  ` + foundWillUpdateName : ""));
            }
          }
          var name = getComponentNameFromType(type) || "Component";
          instance.render || (type.prototype && typeof type.prototype.render === "function" ? console.error("No `render` method found on the %s instance: did you accidentally return an object from the constructor?", name) : console.error("No `render` method found on the %s instance: you may have forgotten to define `render`.", name));
          !instance.getInitialState || instance.getInitialState.isReactClassApproved || instance.state || console.error("getInitialState was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Did you mean to define a state property instead?", name);
          instance.getDefaultProps && !instance.getDefaultProps.isReactClassApproved && console.error("getDefaultProps was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Use a static property to define defaultProps instead.", name);
          instance.contextType && console.error("contextType was defined as an instance property on %s. Use a static property to define contextType instead.", name);
          type.childContextTypes && !didWarnAboutChildContextTypes.has(type) && (didWarnAboutChildContextTypes.add(type), console.error("%s uses the legacy childContextTypes API which was removed in React 19. Use React.createContext() instead. (https://react.dev/link/legacy-context)", name));
          type.contextTypes && !didWarnAboutContextTypes$1.has(type) && (didWarnAboutContextTypes$1.add(type), console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)", name));
          typeof instance.componentShouldUpdate === "function" && console.error("%s has a method called componentShouldUpdate(). Did you mean shouldComponentUpdate()? The name is phrased as a question because the function is expected to return a value.", name);
          type.prototype && type.prototype.isPureReactComponent && typeof instance.shouldComponentUpdate !== "undefined" && console.error("%s has a method called shouldComponentUpdate(). shouldComponentUpdate should not be used when extending React.PureComponent. Please extend React.Component if shouldComponentUpdate is used.", getComponentNameFromType(type) || "A pure component");
          typeof instance.componentDidUnmount === "function" && console.error("%s has a method called componentDidUnmount(). But there is no such lifecycle method. Did you mean componentWillUnmount()?", name);
          typeof instance.componentDidReceiveProps === "function" && console.error("%s has a method called componentDidReceiveProps(). But there is no such lifecycle method. If you meant to update the state in response to changing props, use componentWillReceiveProps(). If you meant to fetch data or run side-effects or mutations after React has updated the UI, use componentDidUpdate().", name);
          typeof instance.componentWillRecieveProps === "function" && console.error("%s has a method called componentWillRecieveProps(). Did you mean componentWillReceiveProps()?", name);
          typeof instance.UNSAFE_componentWillRecieveProps === "function" && console.error("%s has a method called UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?", name);
          var hasMutatedProps = instance.props !== resolvedProps;
          instance.props !== undefined && hasMutatedProps && console.error("When calling super() in `%s`, make sure to pass up the same props that your component's constructor was passed.", name);
          instance.defaultProps && console.error("Setting defaultProps as an instance property on %s is not supported and will be ignored. Instead, define defaultProps as a static property on %s.", name, name);
          typeof instance.getSnapshotBeforeUpdate !== "function" || typeof instance.componentDidUpdate === "function" || didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.has(type) || (didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.add(type), console.error("%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). This component defines getSnapshotBeforeUpdate() only.", getComponentNameFromType(type)));
          typeof instance.getDerivedStateFromProps === "function" && console.error("%s: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.", name);
          typeof instance.getDerivedStateFromError === "function" && console.error("%s: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.", name);
          typeof type.getSnapshotBeforeUpdate === "function" && console.error("%s: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.", name);
          var state = instance.state;
          state && (typeof state !== "object" || isArrayImpl(state)) && console.error("%s.state: must be set to an object or null", name);
          typeof instance.getChildContext === "function" && typeof type.childContextTypes !== "object" && console.error("%s.getChildContext(): childContextTypes must be defined in order to use getChildContext().", name);
          var initialState = instance.state !== undefined ? instance.state : null;
          instance.updater = classComponentUpdater;
          instance.props = resolvedProps;
          instance.state = initialState;
          var internalInstance = { queue: [], replace: false };
          instance._reactInternals = internalInstance;
          var contextType$jscomp$0 = type.contextType;
          instance.context = typeof contextType$jscomp$0 === "object" && contextType$jscomp$0 !== null ? contextType$jscomp$0._currentValue2 : emptyContextObject;
          if (instance.state === resolvedProps) {
            var componentName$jscomp$0 = getComponentNameFromType(type) || "Component";
            didWarnAboutDirectlyAssigningPropsToState.has(componentName$jscomp$0) || (didWarnAboutDirectlyAssigningPropsToState.add(componentName$jscomp$0), console.error("%s: It is not recommended to assign props directly to state because updates to props won't be reflected in state. In most cases, it is better to use props directly.", componentName$jscomp$0));
          }
          var getDerivedStateFromProps = type.getDerivedStateFromProps;
          if (typeof getDerivedStateFromProps === "function") {
            var partialState = getDerivedStateFromProps(resolvedProps, initialState);
            if (partialState === undefined) {
              var componentName$jscomp$1 = getComponentNameFromType(type) || "Component";
              didWarnAboutUndefinedDerivedState.has(componentName$jscomp$1) || (didWarnAboutUndefinedDerivedState.add(componentName$jscomp$1), console.error("%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. You have returned undefined.", componentName$jscomp$1));
            }
            var JSCompiler_inline_result = partialState === null || partialState === undefined ? initialState : assign({}, initialState, partialState);
            instance.state = JSCompiler_inline_result;
          }
          if (typeof type.getDerivedStateFromProps !== "function" && typeof instance.getSnapshotBeforeUpdate !== "function" && (typeof instance.UNSAFE_componentWillMount === "function" || typeof instance.componentWillMount === "function")) {
            var oldState = instance.state;
            if (typeof instance.componentWillMount === "function") {
              if (instance.componentWillMount.__suppressDeprecationWarning !== true) {
                var componentName$jscomp$2 = getComponentNameFromType(type) || "Unknown";
                didWarnAboutDeprecatedWillMount[componentName$jscomp$2] || (console.warn(`componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.

Please update the following components: %s`, componentName$jscomp$2), didWarnAboutDeprecatedWillMount[componentName$jscomp$2] = true);
              }
              instance.componentWillMount();
            }
            typeof instance.UNSAFE_componentWillMount === "function" && instance.UNSAFE_componentWillMount();
            oldState !== instance.state && (console.error("%s.componentWillMount(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.", getComponentNameFromType(type) || "Component"), classComponentUpdater.enqueueReplaceState(instance, instance.state, null));
            if (internalInstance.queue !== null && 0 < internalInstance.queue.length) {
              var { queue: oldQueue, replace: oldReplace } = internalInstance;
              internalInstance.queue = null;
              internalInstance.replace = false;
              if (oldReplace && oldQueue.length === 1)
                instance.state = oldQueue[0];
              else {
                for (var nextState = oldReplace ? oldQueue[0] : instance.state, dontMutate = true, i = oldReplace ? 1 : 0;i < oldQueue.length; i++) {
                  var partial = oldQueue[i], partialState$jscomp$0 = typeof partial === "function" ? partial.call(instance, nextState, resolvedProps, undefined) : partial;
                  partialState$jscomp$0 != null && (dontMutate ? (dontMutate = false, nextState = assign({}, nextState, partialState$jscomp$0)) : assign(nextState, partialState$jscomp$0));
                }
                instance.state = nextState;
              }
            } else
              internalInstance.queue = null;
          }
          var nextChildren = callRenderInDEV(instance);
          if (request.status === 12)
            throw null;
          instance.props !== resolvedProps && (didWarnAboutReassigningProps || console.error("It looks like %s is reassigning its own `this.props` while rendering. This is not supported and can lead to confusing bugs.", getComponentNameFromType(type) || "a component"), didWarnAboutReassigningProps = true);
          var prevKeyPath = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, nextChildren, -1);
          task.keyPath = prevKeyPath;
        } else {
          if (type.prototype && typeof type.prototype.render === "function") {
            var componentName$jscomp$3 = getComponentNameFromType(type) || "Unknown";
            didWarnAboutBadClass[componentName$jscomp$3] || (console.error("The <%s /> component appears to have a render method, but doesn't extend React.Component. This is likely to cause errors. Change %s to extend React.Component instead.", componentName$jscomp$3, componentName$jscomp$3), didWarnAboutBadClass[componentName$jscomp$3] = true);
          }
          var value = renderWithHooks(request, task, keyPath, type, props, undefined);
          if (request.status === 12)
            throw null;
          var hasId = localIdCounter !== 0, actionStateCount = actionStateCounter, actionStateMatchingIndex$jscomp$0 = actionStateMatchingIndex;
          if (type.contextTypes) {
            var _componentName$jscomp$0 = getComponentNameFromType(type) || "Unknown";
            didWarnAboutContextTypes[_componentName$jscomp$0] || (didWarnAboutContextTypes[_componentName$jscomp$0] = true, console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)", _componentName$jscomp$0));
          }
          type && type.childContextTypes && console.error(`childContextTypes cannot be defined on a function component.
  %s.childContextTypes = ...`, type.displayName || type.name || "Component");
          if (typeof type.getDerivedStateFromProps === "function") {
            var componentName$jscomp$4 = getComponentNameFromType(type) || "Unknown";
            didWarnAboutGetDerivedStateOnFunctionComponent[componentName$jscomp$4] || (console.error("%s: Function components do not support getDerivedStateFromProps.", componentName$jscomp$4), didWarnAboutGetDerivedStateOnFunctionComponent[componentName$jscomp$4] = true);
          }
          if (typeof type.contextType === "object" && type.contextType !== null) {
            var _componentName2 = getComponentNameFromType(type) || "Unknown";
            didWarnAboutContextTypeOnFunctionComponent[_componentName2] || (console.error("%s: Function components do not support contextType.", _componentName2), didWarnAboutContextTypeOnFunctionComponent[_componentName2] = true);
          }
          finishFunctionComponent(request, task, keyPath, value, hasId, actionStateCount, actionStateMatchingIndex$jscomp$0);
        }
      else if (typeof type === "string") {
        var segment = task.blockedSegment;
        if (segment === null) {
          var children = props.children, prevContext = task.formatContext, prevKeyPath$jscomp$0 = task.keyPath;
          task.formatContext = getChildFormatContext(prevContext, type, props);
          task.keyPath = keyPath;
          renderNode(request, task, children, -1);
          task.formatContext = prevContext;
          task.keyPath = prevKeyPath$jscomp$0;
        } else {
          var _children = pushStartInstance(segment.chunks, type, props, request.resumableState, request.renderState, task.blockedPreamble, task.hoistableState, task.formatContext, segment.lastPushedText);
          segment.lastPushedText = false;
          var { formatContext: _prevContext2, keyPath: _prevKeyPath3 } = task;
          task.keyPath = keyPath;
          if ((task.formatContext = getChildFormatContext(_prevContext2, type, props)).insertionMode === HTML_HEAD_MODE) {
            var preambleSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
            segment.preambleChildren.push(preambleSegment);
            task.blockedSegment = preambleSegment;
            try {
              preambleSegment.status = 6, renderNode(request, task, _children, -1), pushSegmentFinale(preambleSegment.chunks, request.renderState, preambleSegment.lastPushedText, preambleSegment.textEmbedded), preambleSegment.status = COMPLETED;
            } finally {
              task.blockedSegment = segment;
            }
          } else
            renderNode(request, task, _children, -1);
          task.formatContext = _prevContext2;
          task.keyPath = _prevKeyPath3;
          a: {
            var target = segment.chunks, resumableState = request.resumableState;
            switch (type) {
              case "title":
              case "style":
              case "script":
              case "area":
              case "base":
              case "br":
              case "col":
              case "embed":
              case "hr":
              case "img":
              case "input":
              case "keygen":
              case "link":
              case "meta":
              case "param":
              case "source":
              case "track":
              case "wbr":
                break a;
              case "body":
                if (_prevContext2.insertionMode <= HTML_HTML_MODE) {
                  resumableState.hasBody = true;
                  break a;
                }
                break;
              case "html":
                if (_prevContext2.insertionMode === ROOT_HTML_MODE) {
                  resumableState.hasHtml = true;
                  break a;
                }
                break;
              case "head":
                if (_prevContext2.insertionMode <= HTML_HTML_MODE)
                  break a;
            }
            target.push(endChunkForTag(type));
          }
          segment.lastPushedText = false;
        }
      } else {
        switch (type) {
          case REACT_LEGACY_HIDDEN_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_FRAGMENT_TYPE:
            var prevKeyPath$jscomp$1 = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, props.children, -1);
            task.keyPath = prevKeyPath$jscomp$1;
            return;
          case REACT_ACTIVITY_TYPE:
            var segment$jscomp$0 = task.blockedSegment;
            if (segment$jscomp$0 === null) {
              if (props.mode !== "hidden") {
                var prevKeyPath$jscomp$2 = task.keyPath;
                task.keyPath = keyPath;
                renderNode(request, task, props.children, -1);
                task.keyPath = prevKeyPath$jscomp$2;
              }
            } else if (props.mode !== "hidden") {
              request.renderState.generateStaticMarkup || segment$jscomp$0.chunks.push("<!--&-->");
              segment$jscomp$0.lastPushedText = false;
              var _prevKeyPath4 = task.keyPath;
              task.keyPath = keyPath;
              renderNode(request, task, props.children, -1);
              task.keyPath = _prevKeyPath4;
              request.renderState.generateStaticMarkup || segment$jscomp$0.chunks.push("<!--/&-->");
              segment$jscomp$0.lastPushedText = false;
            }
            return;
          case REACT_SUSPENSE_LIST_TYPE:
            a: {
              var { children: children$jscomp$0, revealOrder } = props;
              if (revealOrder === "forwards" || revealOrder === "backwards" || revealOrder === "unstable_legacy-backwards") {
                if (isArrayImpl(children$jscomp$0)) {
                  renderSuspenseListRows(request, task, keyPath, children$jscomp$0, revealOrder);
                  break a;
                }
                var iteratorFn = getIteratorFn(children$jscomp$0);
                if (iteratorFn) {
                  var iterator = iteratorFn.call(children$jscomp$0);
                  if (iterator) {
                    validateIterable(task, children$jscomp$0, -1, iterator, iteratorFn);
                    var step = iterator.next();
                    if (!step.done) {
                      var rows = [];
                      do
                        rows.push(step.value), step = iterator.next();
                      while (!step.done);
                      renderSuspenseListRows(request, task, keyPath, children$jscomp$0, revealOrder);
                    }
                    break a;
                  }
                }
              }
              if (revealOrder === "together") {
                var { keyPath: _prevKeyPath2, row: prevRow } = task, newRow = task.row = createSuspenseListRow(null);
                newRow.boundaries = [];
                newRow.together = true;
                task.keyPath = keyPath;
                renderNodeDestructive(request, task, children$jscomp$0, -1);
                --newRow.pendingTasks === 0 && finishSuspenseListRow(request, newRow);
                task.keyPath = _prevKeyPath2;
                task.row = prevRow;
                prevRow !== null && 0 < newRow.pendingTasks && (prevRow.pendingTasks++, newRow.next = prevRow);
              } else {
                var prevKeyPath$jscomp$3 = task.keyPath;
                task.keyPath = keyPath;
                renderNodeDestructive(request, task, children$jscomp$0, -1);
                task.keyPath = prevKeyPath$jscomp$3;
              }
            }
            return;
          case REACT_VIEW_TRANSITION_TYPE:
          case REACT_SCOPE_TYPE:
            throw Error("ReactDOMServer does not yet support scope components.");
          case REACT_SUSPENSE_TYPE:
            a:
              if (task.replay !== null) {
                var { keyPath: _prevKeyPath, formatContext: _prevContext, row: _prevRow } = task;
                task.keyPath = keyPath;
                task.formatContext = getSuspenseContentFormatContext(request.resumableState, _prevContext);
                task.row = null;
                var _content = props.children;
                try {
                  renderNode(request, task, _content, -1);
                } finally {
                  task.keyPath = _prevKeyPath, task.formatContext = _prevContext, task.row = _prevRow;
                }
              } else {
                var { keyPath: prevKeyPath$jscomp$4, formatContext: prevContext$jscomp$0, row: prevRow$jscomp$0, blockedBoundary: parentBoundary, blockedPreamble: parentPreamble, hoistableState: parentHoistableState, blockedSegment: parentSegment } = task, fallback = props.fallback, content = props.children, fallbackAbortSet = new Set;
                var newBoundary = createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
                request.trackedPostpones !== null && (newBoundary.trackedContentKeyPath = keyPath);
                var boundarySegment = createPendingSegment(request, parentSegment.chunks.length, newBoundary, task.formatContext, false, false);
                parentSegment.children.push(boundarySegment);
                parentSegment.lastPushedText = false;
                var contentRootSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
                contentRootSegment.parentFlushed = true;
                if (request.trackedPostpones !== null) {
                  var suspenseComponentStack = task.componentStack, fallbackKeyPath = [
                    keyPath[0],
                    "Suspense Fallback",
                    keyPath[2]
                  ], fallbackReplayNode = [
                    fallbackKeyPath[1],
                    fallbackKeyPath[2],
                    [],
                    null
                  ];
                  request.trackedPostpones.workingMap.set(fallbackKeyPath, fallbackReplayNode);
                  newBoundary.trackedFallbackNode = fallbackReplayNode;
                  task.blockedSegment = boundarySegment;
                  task.blockedPreamble = newBoundary.fallbackPreamble;
                  task.keyPath = fallbackKeyPath;
                  task.formatContext = getSuspenseFallbackFormatContext(request.resumableState, prevContext$jscomp$0);
                  task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(suspenseComponentStack);
                  boundarySegment.status = 6;
                  try {
                    renderNode(request, task, fallback, -1), pushSegmentFinale(boundarySegment.chunks, request.renderState, boundarySegment.lastPushedText, boundarySegment.textEmbedded), boundarySegment.status = COMPLETED;
                  } catch (thrownValue) {
                    throw boundarySegment.status = request.status === 12 ? ABORTED : ERRORED, thrownValue;
                  } finally {
                    task.blockedSegment = parentSegment, task.blockedPreamble = parentPreamble, task.keyPath = prevKeyPath$jscomp$4, task.formatContext = prevContext$jscomp$0;
                  }
                  var suspendedPrimaryTask = createRenderTask(request, null, content, -1, newBoundary, contentRootSegment, newBoundary.contentPreamble, newBoundary.contentState, task.abortSet, keyPath, getSuspenseContentFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, null, suspenseComponentStack, emptyContextObject, task.debugTask);
                  pushComponentStack(suspendedPrimaryTask);
                  request.pingedTasks.push(suspendedPrimaryTask);
                } else {
                  task.blockedBoundary = newBoundary;
                  task.blockedPreamble = newBoundary.contentPreamble;
                  task.hoistableState = newBoundary.contentState;
                  task.blockedSegment = contentRootSegment;
                  task.keyPath = keyPath;
                  task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext$jscomp$0);
                  task.row = null;
                  contentRootSegment.status = 6;
                  try {
                    if (renderNode(request, task, content, -1), pushSegmentFinale(contentRootSegment.chunks, request.renderState, contentRootSegment.lastPushedText, contentRootSegment.textEmbedded), contentRootSegment.status = COMPLETED, queueCompletedSegment(newBoundary, contentRootSegment), newBoundary.pendingTasks === 0 && newBoundary.status === PENDING) {
                      if (newBoundary.status = COMPLETED, !isEligibleForOutlining(request, newBoundary)) {
                        prevRow$jscomp$0 !== null && --prevRow$jscomp$0.pendingTasks === 0 && finishSuspenseListRow(request, prevRow$jscomp$0);
                        request.pendingRootTasks === 0 && task.blockedPreamble && preparePreamble(request);
                        break a;
                      }
                    } else
                      prevRow$jscomp$0 !== null && prevRow$jscomp$0.together && tryToResolveTogetherRow(request, prevRow$jscomp$0);
                  } catch (thrownValue$2) {
                    newBoundary.status = CLIENT_RENDERED;
                    if (request.status === 12) {
                      contentRootSegment.status = ABORTED;
                      var error = request.fatalError;
                    } else
                      contentRootSegment.status = ERRORED, error = thrownValue$2;
                    var thrownInfo = getThrownInfo(task.componentStack);
                    var errorDigest = logRecoverableError(request, error, thrownInfo, task.debugTask);
                    encodeErrorForBoundary(newBoundary, errorDigest, error, thrownInfo, false);
                    untrackBoundary(request, newBoundary);
                  } finally {
                    task.blockedBoundary = parentBoundary, task.blockedPreamble = parentPreamble, task.hoistableState = parentHoistableState, task.blockedSegment = parentSegment, task.keyPath = prevKeyPath$jscomp$4, task.formatContext = prevContext$jscomp$0, task.row = prevRow$jscomp$0;
                  }
                  var suspendedFallbackTask = createRenderTask(request, null, fallback, -1, parentBoundary, boundarySegment, newBoundary.fallbackPreamble, newBoundary.fallbackState, fallbackAbortSet, [keyPath[0], "Suspense Fallback", keyPath[2]], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack), emptyContextObject, task.debugTask);
                  pushComponentStack(suspendedFallbackTask);
                  request.pingedTasks.push(suspendedFallbackTask);
                }
              }
            return;
        }
        if (typeof type === "object" && type !== null)
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE:
              if ("ref" in props) {
                var propsWithoutRef = {};
                for (var key in props)
                  key !== "ref" && (propsWithoutRef[key] = props[key]);
              } else
                propsWithoutRef = props;
              var children$jscomp$1 = renderWithHooks(request, task, keyPath, type.render, propsWithoutRef, ref);
              finishFunctionComponent(request, task, keyPath, children$jscomp$1, localIdCounter !== 0, actionStateCounter, actionStateMatchingIndex);
              return;
            case REACT_MEMO_TYPE:
              renderElement(request, task, keyPath, type.type, props, ref);
              return;
            case REACT_CONTEXT_TYPE:
              var { value: value$jscomp$0, children: children$jscomp$2 } = props;
              var prevSnapshot = task.context;
              var prevKeyPath$jscomp$5 = task.keyPath;
              var prevValue = type._currentValue2;
              type._currentValue2 = value$jscomp$0;
              type._currentRenderer2 !== undefined && type._currentRenderer2 !== null && type._currentRenderer2 !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.");
              type._currentRenderer2 = rendererSigil;
              var prevNode = currentActiveSnapshot, newNode = {
                parent: prevNode,
                depth: prevNode === null ? 0 : prevNode.depth + 1,
                context: type,
                parentValue: prevValue,
                value: value$jscomp$0
              };
              currentActiveSnapshot = newNode;
              task.context = newNode;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, children$jscomp$2, -1);
              var prevSnapshot$jscomp$0 = currentActiveSnapshot;
              if (prevSnapshot$jscomp$0 === null)
                throw Error("Tried to pop a Context at the root of the app. This is a bug in React.");
              prevSnapshot$jscomp$0.context !== type && console.error("The parent context is not the expected context. This is probably a bug in React.");
              prevSnapshot$jscomp$0.context._currentValue2 = prevSnapshot$jscomp$0.parentValue;
              type._currentRenderer2 !== undefined && type._currentRenderer2 !== null && type._currentRenderer2 !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.");
              type._currentRenderer2 = rendererSigil;
              var JSCompiler_inline_result$jscomp$0 = currentActiveSnapshot = prevSnapshot$jscomp$0.parent;
              task.context = JSCompiler_inline_result$jscomp$0;
              task.keyPath = prevKeyPath$jscomp$5;
              prevSnapshot !== task.context && console.error("Popping the context provider did not return back to the original snapshot. This is a bug in React.");
              return;
            case REACT_CONSUMER_TYPE:
              var context$jscomp$0 = type._context, render = props.children;
              typeof render !== "function" && console.error("A context consumer was rendered with multiple children, or a child that isn't a function. A context consumer expects a single child that is a function. If you did pass a function, make sure there is no trailing or leading whitespace around it.");
              var newChildren = render(context$jscomp$0._currentValue2), prevKeyPath$jscomp$6 = task.keyPath;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, newChildren, -1);
              task.keyPath = prevKeyPath$jscomp$6;
              return;
            case REACT_LAZY_TYPE:
              var Component = callLazyInitInDEV(type);
              if (request.status === 12)
                throw null;
              renderElement(request, task, keyPath, Component, props, ref);
              return;
          }
        var info = "";
        if (type === undefined || typeof type === "object" && type !== null && Object.keys(type).length === 0)
          info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
        throw Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((type == null ? type : typeof type) + "." + info));
      }
    }
    function resumeNode(request, task, segmentId, node, childIndex) {
      var { replay: prevReplay, blockedBoundary } = task, resumedSegment = createPendingSegment(request, 0, null, task.formatContext, false, false);
      resumedSegment.id = segmentId;
      resumedSegment.parentFlushed = true;
      try {
        task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = COMPLETED, blockedBoundary === null ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
      } finally {
        task.replay = prevReplay, task.blockedSegment = null;
      }
    }
    function replayElement(request, task, keyPath, name, keyOrIndex, childIndex, type, props, ref, replay) {
      childIndex = replay.nodes;
      for (var i = 0;i < childIndex.length; i++) {
        var node = childIndex[i];
        if (keyOrIndex === node[1]) {
          if (node.length === 4) {
            if (name !== null && name !== node[0])
              throw Error("Expected the resume to render <" + node[0] + "> in this slot but instead it rendered <" + name + ">. The tree doesn't match so React will fallback to client rendering.");
            var childNodes = node[2];
            name = node[3];
            keyOrIndex = task.node;
            task.replay = { nodes: childNodes, slots: name, pendingTasks: 1 };
            try {
              renderElement(request, task, keyPath, type, props, ref);
              if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
                throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
              task.replay.pendingTasks--;
            } catch (x) {
              if (typeof x === "object" && x !== null && (x === SuspenseException || typeof x.then === "function"))
                throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(i, 1), x;
              task.replay.pendingTasks--;
              type = getThrownInfo(task.componentStack);
              props = request;
              request = task.blockedBoundary;
              keyPath = x;
              ref = name;
              name = logRecoverableError(props, keyPath, type, task.debugTask);
              abortRemainingReplayNodes(props, request, childNodes, ref, keyPath, name, type, false);
            }
            task.replay = replay;
          } else {
            if (type !== REACT_SUSPENSE_TYPE)
              throw Error("Expected the resume to render <Suspense> in this slot but instead it rendered <" + (getComponentNameFromType(type) || "Unknown") + ">. The tree doesn't match so React will fallback to client rendering.");
            a: {
              replay = undefined;
              name = node[5];
              type = node[2];
              ref = node[3];
              keyOrIndex = node[4] === null ? [] : node[4][2];
              node = node[4] === null ? null : node[4][3];
              var { keyPath: prevKeyPath, formatContext: prevContext, row: prevRow, replay: previousReplaySet, blockedBoundary: parentBoundary, hoistableState: parentHoistableState } = task, content = props.children, fallback = props.fallback, fallbackAbortSet = new Set;
              props = createSuspenseBoundary(request, task.row, fallbackAbortSet, null, null);
              props.parentFlushed = true;
              props.rootSegmentID = name;
              task.blockedBoundary = props;
              task.hoistableState = props.contentState;
              task.keyPath = keyPath;
              task.formatContext = getSuspenseContentFormatContext(request.resumableState, prevContext);
              task.row = null;
              task.replay = { nodes: type, slots: ref, pendingTasks: 1 };
              try {
                renderNode(request, task, content, -1);
                if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
                  throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
                task.replay.pendingTasks--;
                if (props.pendingTasks === 0 && props.status === PENDING) {
                  props.status = COMPLETED;
                  request.completedBoundaries.push(props);
                  break a;
                }
              } catch (error) {
                props.status = CLIENT_RENDERED, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(request, error, childNodes, task.debugTask), encodeErrorForBoundary(props, replay, error, childNodes, false), task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
              } finally {
                task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
              }
              props = createReplayTask(request, null, { nodes: keyOrIndex, slots: node, pendingTasks: 0 }, fallback, -1, parentBoundary, props.fallbackState, fallbackAbortSet, [keyPath[0], "Suspense Fallback", keyPath[2]], getSuspenseFallbackFormatContext(request.resumableState, task.formatContext), task.context, task.treeContext, task.row, replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack), emptyContextObject, task.debugTask);
              pushComponentStack(props);
              request.pingedTasks.push(props);
            }
          }
          childIndex.splice(i, 1);
          break;
        }
      }
    }
    function validateIterable(task, iterable, childIndex, iterator, iteratorFn) {
      if (iterator === iterable) {
        if (childIndex !== -1 || task.componentStack === null || typeof task.componentStack.type !== "function" || Object.prototype.toString.call(task.componentStack.type) !== "[object GeneratorFunction]" || Object.prototype.toString.call(iterator) !== "[object Generator]")
          didWarnAboutGenerators || console.error("Using Iterators as children is unsupported and will likely yield unexpected results because enumerating a generator mutates it. You may convert it to an array with `Array.from()` or the `[...spread]` operator before rendering. You can also use an Iterable that can iterate multiple times over the same items."), didWarnAboutGenerators = true;
      } else
        iterable.entries !== iteratorFn || didWarnAboutMaps || (console.error("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = true);
    }
    function renderNodeDestructive(request, task, node, childIndex) {
      task.replay !== null && typeof task.replay.slots === "number" ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, childIndex = task.debugTask, pushComponentStack(task), retryNode(request, task), task.componentStack = node, task.debugTask = childIndex);
    }
    function retryNode(request, task) {
      var { node, childIndex } = task;
      if (node !== null) {
        if (typeof node === "object") {
          switch (node.$$typeof) {
            case REACT_ELEMENT_TYPE:
              var { type, key } = node;
              node = node.props;
              var refProp = node.ref;
              refProp = refProp !== undefined ? refProp : null;
              var debugTask = task.debugTask, name = getComponentNameFromType(type);
              key = key == null ? childIndex === -1 ? 0 : childIndex : key;
              var keyPath = [task.keyPath, name, key];
              task.replay !== null ? debugTask ? debugTask.run(replayElement.bind(null, request, task, keyPath, name, key, childIndex, type, node, refProp, task.replay)) : replayElement(request, task, keyPath, name, key, childIndex, type, node, refProp, task.replay) : debugTask ? debugTask.run(renderElement.bind(null, request, task, keyPath, type, node, refProp)) : renderElement(request, task, keyPath, type, node, refProp);
              return;
            case REACT_PORTAL_TYPE:
              throw Error("Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render.");
            case REACT_LAZY_TYPE:
              type = callLazyInitInDEV(node);
              if (request.status === 12)
                throw null;
              renderNodeDestructive(request, task, type, childIndex);
              return;
          }
          if (isArrayImpl(node)) {
            renderChildrenArray(request, task, node, childIndex);
            return;
          }
          if (key = getIteratorFn(node)) {
            if (type = key.call(node)) {
              validateIterable(task, node, childIndex, type, key);
              node = type.next();
              if (!node.done) {
                key = [];
                do
                  key.push(node.value), node = type.next();
                while (!node.done);
                renderChildrenArray(request, task, key, childIndex);
              }
              return;
            }
          }
          if (typeof node.then === "function")
            return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
          if (node.$$typeof === REACT_CONTEXT_TYPE)
            return renderNodeDestructive(request, task, node._currentValue2, childIndex);
          request = Object.prototype.toString.call(node);
          throw Error("Objects are not valid as a React child (found: " + (request === "[object Object]" ? "object with keys {" + Object.keys(node).join(", ") + "}" : request) + "). If you meant to render a collection of children, use an array instead.");
        }
        typeof node === "string" ? (task = task.blockedSegment, task !== null && (task.lastPushedText = pushTextInstance(task.chunks, node, request.renderState, task.lastPushedText))) : typeof node === "number" || typeof node === "bigint" ? (task = task.blockedSegment, task !== null && (task.lastPushedText = pushTextInstance(task.chunks, "" + node, request.renderState, task.lastPushedText))) : (typeof node === "function" && (request = node.displayName || node.name || "Component", console.error("Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.", request, request)), typeof node === "symbol" && console.error(`Symbols are not valid as a React child.
  %s`, String(node)));
      }
    }
    function warnForMissingKey(request, task, child) {
      if (child !== null && typeof child === "object" && (child.$$typeof === REACT_ELEMENT_TYPE || child.$$typeof === REACT_PORTAL_TYPE) && child._store && (!child._store.validated && child.key == null || child._store.validated === 2)) {
        if (typeof child._store !== "object")
          throw Error("React Component in warnForMissingKey should have a _store. This error is likely caused by a bug in React. Please file an issue.");
        child._store.validated = 1;
        var didWarnForKey = request.didWarnForKey;
        didWarnForKey == null && (didWarnForKey = request.didWarnForKey = new WeakSet);
        request = task.componentStack;
        if (request !== null && !didWarnForKey.has(request)) {
          didWarnForKey.add(request);
          var componentName = getComponentNameFromType(child.type);
          didWarnForKey = child._owner;
          var parentOwner = request.owner;
          request = "";
          if (parentOwner && typeof parentOwner.type !== "undefined") {
            var name = getComponentNameFromType(parentOwner.type);
            name && (request = `

Check the render method of \`` + name + "`.");
          }
          request || componentName && (request = `

Check the top-level render call using <` + componentName + ">.");
          componentName = "";
          didWarnForKey != null && parentOwner !== didWarnForKey && (parentOwner = null, typeof didWarnForKey.type !== "undefined" ? parentOwner = getComponentNameFromType(didWarnForKey.type) : typeof didWarnForKey.name === "string" && (parentOwner = didWarnForKey.name), parentOwner && (componentName = " It was passed a child from " + parentOwner + "."));
          didWarnForKey = task.componentStack;
          task.componentStack = {
            parent: task.componentStack,
            type: child.type,
            owner: child._owner,
            stack: child._debugStack
          };
          console.error('Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.', request, componentName);
          task.componentStack = didWarnForKey;
        }
      }
    }
    function renderChildrenArray(request, task, children, childIndex) {
      var { keyPath: prevKeyPath, componentStack: previousComponentStack } = task;
      var previousDebugTask = task.debugTask;
      pushServerComponentStack(task, task.node._debugInfo);
      if (childIndex !== -1 && (task.keyPath = [task.keyPath, "Fragment", childIndex], task.replay !== null)) {
        for (var replay = task.replay, replayNodes = replay.nodes, j = 0;j < replayNodes.length; j++) {
          var node = replayNodes[j];
          if (node[1] === childIndex) {
            childIndex = node[2];
            node = node[3];
            task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
            try {
              renderChildrenArray(request, task, children, -1);
              if (task.replay.pendingTasks === 1 && 0 < task.replay.nodes.length)
                throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
              task.replay.pendingTasks--;
            } catch (x) {
              if (typeof x === "object" && x !== null && (x === SuspenseException || typeof x.then === "function"))
                throw x;
              task.replay.pendingTasks--;
              var thrownInfo = getThrownInfo(task.componentStack);
              children = task.blockedBoundary;
              var error = x, resumeSlots = node;
              node = logRecoverableError(request, error, thrownInfo, task.debugTask);
              abortRemainingReplayNodes(request, children, childIndex, resumeSlots, error, node, thrownInfo, false);
            }
            task.replay = replay;
            replayNodes.splice(j, 1);
            break;
          }
        }
        task.keyPath = prevKeyPath;
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
        return;
      }
      replay = task.treeContext;
      replayNodes = children.length;
      if (task.replay !== null && (j = task.replay.slots, j !== null && typeof j === "object")) {
        for (childIndex = 0;childIndex < replayNodes; childIndex++)
          node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), error = j[childIndex], typeof error === "number" ? (resumeNode(request, task, error, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
        task.treeContext = replay;
        task.keyPath = prevKeyPath;
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
        return;
      }
      for (j = 0;j < replayNodes; j++)
        childIndex = children[j], warnForMissingKey(request, task, childIndex), task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
      task.treeContext = replay;
      task.keyPath = prevKeyPath;
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
    }
    function trackPostponedBoundary(request, trackedPostpones, boundary) {
      boundary.status = POSTPONED;
      boundary.rootSegmentID = request.nextSegmentId++;
      request = boundary.trackedContentKeyPath;
      if (request === null)
        throw Error("It should not be possible to postpone at the root. This is a bug in React.");
      var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
      if (boundaryNode === undefined)
        return boundary = [
          request[1],
          request[2],
          children,
          null,
          fallbackReplayNode,
          boundary.rootSegmentID
        ], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
      boundaryNode[4] = fallbackReplayNode;
      boundaryNode[5] = boundary.rootSegmentID;
      return boundaryNode;
    }
    function trackPostpone(request, trackedPostpones, task, segment) {
      segment.status = POSTPONED;
      var { keyPath, blockedBoundary: boundary } = task;
      if (boundary === null)
        segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, request.completedRootSegment !== null && (request.completedRootSegment.status = POSTPONED);
      else {
        if (boundary !== null && boundary.status === PENDING) {
          var boundaryNode = trackPostponedBoundary(request, trackedPostpones, boundary);
          if (boundary.trackedContentKeyPath === keyPath && task.childIndex === -1) {
            segment.id === -1 && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
            boundaryNode[3] = segment.id;
            return;
          }
        }
        segment.id === -1 && (segment.id = segment.parentFlushed && boundary !== null ? boundary.rootSegmentID : request.nextSegmentId++);
        if (task.childIndex === -1)
          keyPath === null ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), task === undefined ? (task = [keyPath[1], keyPath[2], [], segment.id], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
        else {
          if (keyPath === null)
            if (request = trackedPostpones.rootSlots, request === null)
              request = trackedPostpones.rootSlots = {};
            else {
              if (typeof request === "number")
                throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.");
            }
          else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), boundaryNode === undefined)
            request = {}, boundaryNode = [keyPath[1], keyPath[2], [], request], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
          else if (request = boundaryNode[3], request === null)
            request = boundaryNode[3] = {};
          else if (typeof request === "number")
            throw Error("It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React.");
          request[task.childIndex] = segment.id;
        }
      }
    }
    function untrackBoundary(request, boundary) {
      request = request.trackedPostpones;
      request !== null && (boundary = boundary.trackedContentKeyPath, boundary !== null && (boundary = request.workingMap.get(boundary), boundary !== undefined && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
    }
    function spawnNewSuspendedReplayTask(request, task, thenableState2) {
      return createReplayTask(request, thenableState2, task.replay, task.node, task.childIndex, task.blockedBoundary, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack, emptyContextObject, task.debugTask);
    }
    function spawnNewSuspendedRenderTask(request, task, thenableState2) {
      var segment = task.blockedSegment, newSegment = createPendingSegment(request, segment.chunks.length, null, task.formatContext, segment.lastPushedText, true);
      segment.children.push(newSegment);
      segment.lastPushedText = false;
      return createRenderTask(request, thenableState2, task.node, task.childIndex, task.blockedBoundary, newSegment, task.blockedPreamble, task.hoistableState, task.abortSet, task.keyPath, task.formatContext, task.context, task.treeContext, task.row, task.componentStack, emptyContextObject, task.debugTask);
    }
    function renderNode(request, task, node, childIndex) {
      var { formatContext: previousFormatContext, context: previousContext, keyPath: previousKeyPath, treeContext: previousTreeContext, componentStack: previousComponentStack, debugTask: previousDebugTask, blockedSegment: segment } = task;
      if (segment === null) {
        segment = task.replay;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue) {
          if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, request.status !== 12 && typeof node === "object" && node !== null) {
            if (typeof node.then === "function") {
              childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
              node.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              task.debugTask = previousDebugTask;
              switchContext(previousContext);
              return;
            }
            if (node.message === "Maximum call stack size exceeded") {
              node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              node = spawnNewSuspendedReplayTask(request, task, node);
              request.pingedTasks.push(node);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              task.debugTask = previousDebugTask;
              switchContext(previousContext);
              return;
            }
          }
        }
      } else {
        var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue$3) {
          if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$3 === SuspenseException ? getSuspendedThenable() : thrownValue$3, request.status !== 12 && typeof node === "object" && node !== null) {
            if (typeof node.then === "function") {
              segment = node;
              node = thrownValue$3 === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedRenderTask(request, task, node).ping;
              segment.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.debugTask = previousDebugTask;
              switchContext(previousContext);
              return;
            }
            if (node.message === "Maximum call stack size exceeded") {
              segment = thrownValue$3 === SuspenseException ? getThenableStateAfterSuspending() : null;
              segment = spawnNewSuspendedRenderTask(request, task, segment);
              request.pingedTasks.push(segment);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.debugTask = previousDebugTask;
              switchContext(previousContext);
              return;
            }
          }
        }
      }
      task.formatContext = previousFormatContext;
      task.context = previousContext;
      task.keyPath = previousKeyPath;
      task.treeContext = previousTreeContext;
      switchContext(previousContext);
      throw node;
    }
    function abortTaskSoft(task) {
      var { blockedBoundary: boundary, blockedSegment: segment } = task;
      segment !== null && (segment.status = ABORTED, finishedTask(this, boundary, task.row, segment));
    }
    function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error$jscomp$0, errorDigest$jscomp$0, errorInfo$jscomp$0, aborted) {
      for (var i = 0;i < nodes.length; i++) {
        var node = nodes[i];
        if (node.length === 4)
          abortRemainingReplayNodes(request$jscomp$0, boundary, node[2], node[3], error$jscomp$0, errorDigest$jscomp$0, errorInfo$jscomp$0, aborted);
        else {
          var request = request$jscomp$0;
          node = node[5];
          var error = error$jscomp$0, errorDigest = errorDigest$jscomp$0, errorInfo = errorInfo$jscomp$0, wasAborted = aborted, resumedBoundary = createSuspenseBoundary(request, null, new Set, null, null);
          resumedBoundary.parentFlushed = true;
          resumedBoundary.rootSegmentID = node;
          resumedBoundary.status = CLIENT_RENDERED;
          encodeErrorForBoundary(resumedBoundary, errorDigest, error, errorInfo, wasAborted);
          resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
        }
      }
      nodes.length = 0;
      if (slots !== null) {
        if (boundary === null)
          throw Error("We should not have any resumable nodes in the shell. This is a bug in React.");
        boundary.status !== CLIENT_RENDERED && (boundary.status = CLIENT_RENDERED, encodeErrorForBoundary(boundary, errorDigest$jscomp$0, error$jscomp$0, errorInfo$jscomp$0, aborted), boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
        if (typeof slots === "object")
          for (var index in slots)
            delete slots[index];
      }
    }
    function abortTask(task, request, error) {
      var { blockedBoundary: boundary, blockedSegment: segment } = task;
      if (segment !== null) {
        if (segment.status === 6)
          return;
        segment.status = ABORTED;
      }
      var errorInfo = getThrownInfo(task.componentStack), node = task.node;
      node !== null && typeof node === "object" && pushHaltedAwaitOnComponentStack(task, node._debugInfo);
      if (boundary === null) {
        if (request.status !== 13 && request.status !== CLOSED) {
          boundary = task.replay;
          if (boundary === null) {
            request.trackedPostpones !== null && segment !== null ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo, task.debugTask), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo, task.debugTask), fatalError(request, error, errorInfo, task.debugTask));
            return;
          }
          boundary.pendingTasks--;
          boundary.pendingTasks === 0 && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo, null), abortRemainingReplayNodes(request, null, boundary.nodes, boundary.slots, error, segment, errorInfo, true));
          request.pendingRootTasks--;
          request.pendingRootTasks === 0 && completeShell(request);
        }
      } else {
        node = request.trackedPostpones;
        if (boundary.status !== CLIENT_RENDERED) {
          if (node !== null && segment !== null)
            return logRecoverableError(request, error, errorInfo, task.debugTask), trackPostpone(request, node, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
              return abortTask(fallbackTask, request, error);
            }), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
          boundary.status = CLIENT_RENDERED;
          segment = logRecoverableError(request, error, errorInfo, task.debugTask);
          boundary.status = CLIENT_RENDERED;
          encodeErrorForBoundary(boundary, segment, error, errorInfo, true);
          untrackBoundary(request, boundary);
          boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
        }
        boundary.pendingTasks--;
        errorInfo = boundary.row;
        errorInfo !== null && --errorInfo.pendingTasks === 0 && finishSuspenseListRow(request, errorInfo);
        boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
          return abortTask(fallbackTask, request, error);
        });
        boundary.fallbackAbortableTasks.clear();
      }
      task = task.row;
      task !== null && --task.pendingTasks === 0 && finishSuspenseListRow(request, task);
      request.allPendingTasks--;
      request.allPendingTasks === 0 && completeAll(request);
    }
    function safelyEmitEarlyPreloads(request, shellComplete) {
      try {
        var renderState = request.renderState, onHeaders = renderState.onHeaders;
        if (onHeaders) {
          var headers = renderState.headers;
          if (headers) {
            renderState.headers = null;
            var linkHeader = headers.preconnects;
            headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
            headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
            if (!shellComplete) {
              var queueIter = renderState.styles.values(), queueStep = queueIter.next();
              b:
                for (;0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next())
                  for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next();0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
                    var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props;
                    var header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                      crossOrigin: props$jscomp$0.crossOrigin,
                      integrity: props$jscomp$0.integrity,
                      nonce: props$jscomp$0.nonce,
                      type: props$jscomp$0.type,
                      fetchPriority: props$jscomp$0.fetchPriority,
                      referrerPolicy: props$jscomp$0.referrerPolicy,
                      media: props$jscomp$0.media
                    });
                    if (0 <= (headers.remainingCapacity -= header.length + 2))
                      renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = typeof props.crossOrigin === "string" || typeof props.integrity === "string" ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
                    else
                      break b;
                  }
            }
            linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
          }
        }
      } catch (error) {
        logRecoverableError(request, error, {}, null);
      }
    }
    function completeShell(request) {
      request.trackedPostpones === null && safelyEmitEarlyPreloads(request, true);
      request.trackedPostpones === null && preparePreamble(request);
      request.onShellError = noop;
      request = request.onShellReady;
      request();
    }
    function completeAll(request) {
      safelyEmitEarlyPreloads(request, request.trackedPostpones === null ? true : request.completedRootSegment === null || request.completedRootSegment.status !== POSTPONED);
      preparePreamble(request);
      request = request.onAllReady;
      request();
    }
    function queueCompletedSegment(boundary, segment) {
      if (segment.chunks.length === 0 && segment.children.length === 1 && segment.children[0].boundary === null && segment.children[0].id === -1) {
        var childSegment = segment.children[0];
        childSegment.id = segment.id;
        childSegment.parentFlushed = true;
        childSegment.status !== COMPLETED && childSegment.status !== ABORTED && childSegment.status !== ERRORED || queueCompletedSegment(boundary, childSegment);
      } else
        boundary.completedSegments.push(segment);
    }
    function finishedTask(request, boundary, row, segment) {
      row !== null && (--row.pendingTasks === 0 ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
      request.allPendingTasks--;
      if (boundary === null) {
        if (segment !== null && segment.parentFlushed) {
          if (request.completedRootSegment !== null)
            throw Error("There can only be one root segment. This is a bug in React.");
          request.completedRootSegment = segment;
        }
        request.pendingRootTasks--;
        request.pendingRootTasks === 0 && completeShell(request);
      } else if (boundary.pendingTasks--, boundary.status !== CLIENT_RENDERED)
        if (boundary.pendingTasks === 0)
          if (boundary.status === PENDING && (boundary.status = COMPLETED), segment !== null && segment.parentFlushed && (segment.status === COMPLETED || segment.status === ABORTED) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), boundary.status === COMPLETED)
            row = boundary.row, row !== null && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row)), request.pendingRootTasks === 0 && request.trackedPostpones === null && boundary.contentPreamble !== null && preparePreamble(request);
          else {
            if (boundary.status === POSTPONED && (boundary = boundary.row, boundary !== null)) {
              if (request.trackedPostpones !== null) {
                row = request.trackedPostpones;
                var postponedRow = boundary.next;
                if (postponedRow !== null && (segment = postponedRow.boundaries, segment !== null))
                  for (postponedRow.boundaries = null, postponedRow = 0;postponedRow < segment.length; postponedRow++) {
                    var postponedBoundary = segment[postponedRow];
                    trackPostponedBoundary(request, row, postponedBoundary);
                    finishedTask(request, postponedBoundary, null, null);
                  }
              }
              --boundary.pendingTasks === 0 && finishSuspenseListRow(request, boundary);
            }
          }
        else
          segment === null || !segment.parentFlushed || segment.status !== COMPLETED && segment.status !== ABORTED || (queueCompletedSegment(boundary, segment), boundary.completedSegments.length === 1 && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, boundary !== null && boundary.together && tryToResolveTogetherRow(request, boundary);
      request.allPendingTasks === 0 && completeAll(request);
    }
    function performWork(request$jscomp$2) {
      if (request$jscomp$2.status !== CLOSED && request$jscomp$2.status !== 13) {
        var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = HooksDispatcher;
        var prevAsyncDispatcher = ReactSharedInternals.A;
        ReactSharedInternals.A = DefaultAsyncDispatcher;
        var prevRequest = currentRequest;
        currentRequest = request$jscomp$2;
        var prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
        ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
        var prevResumableState = currentResumableState;
        currentResumableState = request$jscomp$2.resumableState;
        try {
          var pingedTasks = request$jscomp$2.pingedTasks, i;
          for (i = 0;i < pingedTasks.length; i++) {
            var request = request$jscomp$2, task = pingedTasks[i], segment = task.blockedSegment;
            if (segment === null) {
              var prevTaskInDEV = undefined, request$jscomp$0 = request;
              request = task;
              if (request.replay.pendingTasks !== 0) {
                switchContext(request.context);
                prevTaskInDEV = currentTaskInDEV;
                currentTaskInDEV = request;
                try {
                  typeof request.replay.slots === "number" ? resumeNode(request$jscomp$0, request, request.replay.slots, request.node, request.childIndex) : retryNode(request$jscomp$0, request);
                  if (request.replay.pendingTasks === 1 && 0 < request.replay.nodes.length)
                    throw Error("Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering.");
                  request.replay.pendingTasks--;
                  request.abortSet.delete(request);
                  finishedTask(request$jscomp$0, request.blockedBoundary, request.row, null);
                } catch (thrownValue) {
                  resetHooksState();
                  var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
                  if (typeof x === "object" && x !== null && typeof x.then === "function") {
                    var ping = request.ping;
                    x.then(ping, ping);
                    request.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  } else {
                    request.replay.pendingTasks--;
                    request.abortSet.delete(request);
                    var errorInfo = getThrownInfo(request.componentStack), errorDigest = undefined, request$jscomp$1 = request$jscomp$0, boundary = request.blockedBoundary, error$jscomp$0 = request$jscomp$0.status === 12 ? request$jscomp$0.fatalError : x, errorInfo$jscomp$0 = errorInfo, replayNodes = request.replay.nodes, resumeSlots = request.replay.slots;
                    errorDigest = logRecoverableError(request$jscomp$1, error$jscomp$0, errorInfo$jscomp$0, request.debugTask);
                    abortRemainingReplayNodes(request$jscomp$1, boundary, replayNodes, resumeSlots, error$jscomp$0, errorDigest, errorInfo$jscomp$0, false);
                    request$jscomp$0.pendingRootTasks--;
                    request$jscomp$0.pendingRootTasks === 0 && completeShell(request$jscomp$0);
                    request$jscomp$0.allPendingTasks--;
                    request$jscomp$0.allPendingTasks === 0 && completeAll(request$jscomp$0);
                  }
                } finally {
                  currentTaskInDEV = prevTaskInDEV;
                }
              }
            } else if (request$jscomp$0 = prevTaskInDEV = undefined, errorDigest = task, request$jscomp$1 = segment, request$jscomp$1.status === PENDING) {
              request$jscomp$1.status = 6;
              switchContext(errorDigest.context);
              request$jscomp$0 = currentTaskInDEV;
              currentTaskInDEV = errorDigest;
              var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
              try {
                retryNode(request, errorDigest), pushSegmentFinale(request$jscomp$1.chunks, request.renderState, request$jscomp$1.lastPushedText, request$jscomp$1.textEmbedded), errorDigest.abortSet.delete(errorDigest), request$jscomp$1.status = COMPLETED, finishedTask(request, errorDigest.blockedBoundary, errorDigest.row, request$jscomp$1);
              } catch (thrownValue) {
                resetHooksState();
                request$jscomp$1.children.length = childrenLength;
                request$jscomp$1.chunks.length = chunkLength;
                var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : request.status === 12 ? request.fatalError : thrownValue;
                if (request.status === 12 && request.trackedPostpones !== null) {
                  var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(errorDigest.componentStack);
                  errorDigest.abortSet.delete(errorDigest);
                  logRecoverableError(request, x$jscomp$0, thrownInfo, errorDigest.debugTask);
                  trackPostpone(request, trackedPostpones, errorDigest, request$jscomp$1);
                  finishedTask(request, errorDigest.blockedBoundary, errorDigest.row, request$jscomp$1);
                } else if (typeof x$jscomp$0 === "object" && x$jscomp$0 !== null && typeof x$jscomp$0.then === "function") {
                  request$jscomp$1.status = PENDING;
                  errorDigest.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  var ping$jscomp$0 = errorDigest.ping;
                  x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
                } else {
                  var errorInfo$jscomp$1 = getThrownInfo(errorDigest.componentStack);
                  errorDigest.abortSet.delete(errorDigest);
                  request$jscomp$1.status = ERRORED;
                  var { blockedBoundary: boundary$jscomp$0, row, debugTask } = errorDigest;
                  row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row);
                  request.allPendingTasks--;
                  prevTaskInDEV = logRecoverableError(request, x$jscomp$0, errorInfo$jscomp$1, debugTask);
                  if (boundary$jscomp$0 === null)
                    fatalError(request, x$jscomp$0, errorInfo$jscomp$1, debugTask);
                  else if (boundary$jscomp$0.pendingTasks--, boundary$jscomp$0.status !== CLIENT_RENDERED) {
                    boundary$jscomp$0.status = CLIENT_RENDERED;
                    encodeErrorForBoundary(boundary$jscomp$0, prevTaskInDEV, x$jscomp$0, errorInfo$jscomp$1, false);
                    untrackBoundary(request, boundary$jscomp$0);
                    var boundaryRow = boundary$jscomp$0.row;
                    boundaryRow !== null && --boundaryRow.pendingTasks === 0 && finishSuspenseListRow(request, boundaryRow);
                    boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
                    request.pendingRootTasks === 0 && request.trackedPostpones === null && boundary$jscomp$0.contentPreamble !== null && preparePreamble(request);
                  }
                  request.allPendingTasks === 0 && completeAll(request);
                }
              } finally {
                currentTaskInDEV = request$jscomp$0;
              }
            }
          }
          pingedTasks.splice(0, i);
          request$jscomp$2.destination !== null && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
        } catch (error) {
          pingedTasks = {}, logRecoverableError(request$jscomp$2, error, pingedTasks, null), fatalError(request$jscomp$2, error, pingedTasks, null);
        } finally {
          currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
        }
      }
    }
    function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
      segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
      for (var pendingPreambles = false, i = 0;i < segment.children.length; i++)
        pendingPreambles = preparePreambleFromSegment(request, segment.children[i], collectedPreambleSegments) || pendingPreambles;
      return pendingPreambles;
    }
    function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
      var boundary = segment.boundary;
      if (boundary === null)
        return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
      var { contentPreamble: preamble, fallbackPreamble } = boundary;
      if (preamble === null || fallbackPreamble === null)
        return false;
      switch (boundary.status) {
        case COMPLETED:
          hoistPreambleState(request.renderState, preamble);
          request.byteSize += boundary.byteSize;
          segment = boundary.completedSegments[0];
          if (!segment)
            throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
          return preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
        case POSTPONED:
          if (request.trackedPostpones !== null)
            return true;
        case CLIENT_RENDERED:
          if (segment.status === COMPLETED)
            return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(request, segment, collectedPreambleSegments);
        default:
          return true;
      }
    }
    function preparePreamble(request) {
      if (request.completedRootSegment && request.completedPreambleSegments === null) {
        var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(request, request.completedRootSegment, collectedPreambleSegments), preamble = request.renderState.preamble;
        hasPendingPreambles === false || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
      }
    }
    function flushSubtree(request, destination, segment, hoistableState) {
      segment.parentFlushed = true;
      switch (segment.status) {
        case PENDING:
          segment.id = request.nextSegmentId++;
        case POSTPONED:
          return hoistableState = segment.id, segment.lastPushedText = false, segment.textEmbedded = false, request = request.renderState, destination.push(placeholder1), destination.push(request.placeholderPrefix), request = hoistableState.toString(16), destination.push(request), destination.push(placeholder2);
        case COMPLETED:
          segment.status = FLUSHED;
          var r = true, chunks = segment.chunks, chunkIdx = 0;
          segment = segment.children;
          for (var childIdx = 0;childIdx < segment.length; childIdx++) {
            for (r = segment[childIdx];chunkIdx < r.index; chunkIdx++)
              destination.push(chunks[chunkIdx]);
            r = flushSegment(request, destination, r, hoistableState);
          }
          for (;chunkIdx < chunks.length - 1; chunkIdx++)
            destination.push(chunks[chunkIdx]);
          chunkIdx < chunks.length && (r = destination.push(chunks[chunkIdx]));
          return r;
        case ABORTED:
          return true;
        default:
          throw Error("Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React.");
      }
    }
    function flushSegment(request, destination, segment, hoistableState) {
      var boundary = segment.boundary;
      if (boundary === null)
        return flushSubtree(request, destination, segment, hoistableState);
      boundary.parentFlushed = true;
      if (boundary.status === CLIENT_RENDERED) {
        var row = boundary.row;
        row !== null && --row.pendingTasks === 0 && finishSuspenseListRow(request, row);
        if (!request.renderState.generateStaticMarkup) {
          var { errorDigest, errorMessage } = boundary;
          row = boundary.errorStack;
          boundary = boundary.errorComponentStack;
          destination.push(startClientRenderedSuspenseBoundary);
          destination.push(clientRenderedSuspenseBoundaryError1);
          errorDigest && (destination.push(clientRenderedSuspenseBoundaryError1A), errorDigest = escapeTextForBrowser(errorDigest), destination.push(errorDigest), destination.push(clientRenderedSuspenseBoundaryErrorAttrInterstitial));
          errorMessage && (destination.push(clientRenderedSuspenseBoundaryError1B), errorMessage = escapeTextForBrowser(errorMessage), destination.push(errorMessage), destination.push(clientRenderedSuspenseBoundaryErrorAttrInterstitial));
          row && (destination.push(clientRenderedSuspenseBoundaryError1C), row = escapeTextForBrowser(row), destination.push(row), destination.push(clientRenderedSuspenseBoundaryErrorAttrInterstitial));
          boundary && (destination.push(clientRenderedSuspenseBoundaryError1D), row = escapeTextForBrowser(boundary), destination.push(row), destination.push(clientRenderedSuspenseBoundaryErrorAttrInterstitial));
          destination.push(clientRenderedSuspenseBoundaryError2);
        }
        flushSubtree(request, destination, segment, hoistableState);
        request = request.renderState.generateStaticMarkup ? true : destination.push(endSuspenseBoundary);
        return request;
      }
      if (boundary.status !== COMPLETED)
        return boundary.status === PENDING && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState), destination.push(endSuspenseBoundary);
      if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && flushedByteSize + boundary.byteSize > request.progressiveChunkSize)
        return boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(destination, request.renderState, boundary.rootSegmentID), flushSubtree(request, destination, segment, hoistableState), destination.push(endSuspenseBoundary);
      flushedByteSize += boundary.byteSize;
      hoistableState && hoistHoistables(hoistableState, boundary.contentState);
      segment = boundary.row;
      segment !== null && isEligibleForOutlining(request, boundary) && --segment.pendingTasks === 0 && finishSuspenseListRow(request, segment);
      request.renderState.generateStaticMarkup || destination.push(startCompletedSuspenseBoundary);
      segment = boundary.completedSegments;
      if (segment.length !== 1)
        throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
      flushSegment(request, destination, segment[0], hoistableState);
      request = request.renderState.generateStaticMarkup ? true : destination.push(endSuspenseBoundary);
      return request;
    }
    function flushSegmentContainer(request, destination, segment, hoistableState) {
      writeStartSegment(destination, request.renderState, segment.parentFormatContext, segment.id);
      flushSegment(request, destination, segment, hoistableState);
      return writeEndSegment(destination, segment.parentFormatContext);
    }
    function flushCompletedBoundary(request, destination, boundary) {
      flushedByteSize = boundary.byteSize;
      for (var completedSegments = boundary.completedSegments, i = 0;i < completedSegments.length; i++)
        flushPartiallyCompletedSegment(request, destination, boundary, completedSegments[i]);
      completedSegments.length = 0;
      completedSegments = boundary.row;
      completedSegments !== null && isEligibleForOutlining(request, boundary) && --completedSegments.pendingTasks === 0 && finishSuspenseListRow(request, completedSegments);
      writeHoistablesForBoundary(destination, boundary.contentState, request.renderState);
      completedSegments = request.resumableState;
      request = request.renderState;
      i = boundary.rootSegmentID;
      boundary = boundary.contentState;
      var requiresStyleInsertion = request.stylesToHoist;
      request.stylesToHoist = false;
      destination.push(request.startInlineScript);
      destination.push(endOfStartTag);
      requiresStyleInsertion ? ((completedSegments.instructions & SentClientRenderFunction) === NothingSent && (completedSegments.instructions |= SentClientRenderFunction, destination.push(clientRenderScriptFunctionOnly)), (completedSegments.instructions & SentCompleteBoundaryFunction) === NothingSent && (completedSegments.instructions |= SentCompleteBoundaryFunction, destination.push(completeBoundaryScriptFunctionOnly)), (completedSegments.instructions & SentStyleInsertionFunction) === NothingSent ? (completedSegments.instructions |= SentStyleInsertionFunction, destination.push(completeBoundaryWithStylesScript1FullPartial)) : destination.push(completeBoundaryWithStylesScript1Partial)) : ((completedSegments.instructions & SentCompleteBoundaryFunction) === NothingSent && (completedSegments.instructions |= SentCompleteBoundaryFunction, destination.push(completeBoundaryScriptFunctionOnly)), destination.push(completeBoundaryScript1Partial));
      completedSegments = i.toString(16);
      destination.push(request.boundaryPrefix);
      destination.push(completedSegments);
      destination.push(completeBoundaryScript2);
      destination.push(request.segmentPrefix);
      destination.push(completedSegments);
      requiresStyleInsertion ? (destination.push(completeBoundaryScript3a), writeStyleResourceDependenciesInJS(destination, boundary)) : destination.push(completeBoundaryScript3b);
      boundary = destination.push(completeBoundaryScriptEnd);
      return writeBootstrap(destination, request) && boundary;
    }
    function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
      if (segment.status === FLUSHED)
        return true;
      var hoistableState = boundary.contentState, segmentID = segment.id;
      if (segmentID === -1) {
        if ((segment.id = boundary.rootSegmentID) === -1)
          throw Error("A root segment ID must have been assigned by now. This is a bug in React.");
        return flushSegmentContainer(request, destination, segment, hoistableState);
      }
      if (segmentID === boundary.rootSegmentID)
        return flushSegmentContainer(request, destination, segment, hoistableState);
      flushSegmentContainer(request, destination, segment, hoistableState);
      boundary = request.resumableState;
      request = request.renderState;
      destination.push(request.startInlineScript);
      destination.push(endOfStartTag);
      (boundary.instructions & SentCompleteSegmentFunction) === NothingSent ? (boundary.instructions |= SentCompleteSegmentFunction, destination.push(completeSegmentScript1Full)) : destination.push(completeSegmentScript1Partial);
      destination.push(request.segmentPrefix);
      segmentID = segmentID.toString(16);
      destination.push(segmentID);
      destination.push(completeSegmentScript2);
      destination.push(request.placeholderPrefix);
      destination.push(segmentID);
      destination = destination.push(completeSegmentScriptEnd);
      return destination;
    }
    function flushCompletedQueues(request, destination) {
      try {
        if (!(0 < request.pendingRootTasks)) {
          var i, completedRootSegment = request.completedRootSegment;
          if (completedRootSegment !== null) {
            if (completedRootSegment.status === POSTPONED)
              return;
            var completedPreambleSegments = request.completedPreambleSegments;
            if (completedPreambleSegments === null)
              return;
            flushedByteSize = request.byteSize;
            var { resumableState, renderState } = request, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
            if (htmlChunks) {
              for (i$jscomp$0 = 0;i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
                destination.push(htmlChunks[i$jscomp$0]);
              if (headChunks)
                for (i$jscomp$0 = 0;i$jscomp$0 < headChunks.length; i$jscomp$0++)
                  destination.push(headChunks[i$jscomp$0]);
              else {
                var chunk = startChunkForTag("head");
                destination.push(chunk);
                destination.push(endOfStartTag);
              }
            } else if (headChunks)
              for (i$jscomp$0 = 0;i$jscomp$0 < headChunks.length; i$jscomp$0++)
                destination.push(headChunks[i$jscomp$0]);
            var charsetChunks = renderState.charsetChunks;
            for (i$jscomp$0 = 0;i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
              destination.push(charsetChunks[i$jscomp$0]);
            charsetChunks.length = 0;
            renderState.preconnects.forEach(flushResource, destination);
            renderState.preconnects.clear();
            var viewportChunks = renderState.viewportChunks;
            for (i$jscomp$0 = 0;i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
              destination.push(viewportChunks[i$jscomp$0]);
            viewportChunks.length = 0;
            renderState.fontPreloads.forEach(flushResource, destination);
            renderState.fontPreloads.clear();
            renderState.highImagePreloads.forEach(flushResource, destination);
            renderState.highImagePreloads.clear();
            currentlyFlushingRenderState = renderState;
            renderState.styles.forEach(flushStylesInPreamble, destination);
            currentlyFlushingRenderState = null;
            var importMapChunks = renderState.importMapChunks;
            for (i$jscomp$0 = 0;i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
              destination.push(importMapChunks[i$jscomp$0]);
            importMapChunks.length = 0;
            renderState.bootstrapScripts.forEach(flushResource, destination);
            renderState.scripts.forEach(flushResource, destination);
            renderState.scripts.clear();
            renderState.bulkPreloads.forEach(flushResource, destination);
            renderState.bulkPreloads.clear();
            resumableState.instructions |= SentCompletedShellId;
            var hoistableChunks = renderState.hoistableChunks;
            for (i$jscomp$0 = 0;i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
              destination.push(hoistableChunks[i$jscomp$0]);
            for (resumableState = hoistableChunks.length = 0;resumableState < completedPreambleSegments.length; resumableState++) {
              var segments = completedPreambleSegments[resumableState];
              for (renderState = 0;renderState < segments.length; renderState++)
                flushSegment(request, destination, segments[renderState], null);
            }
            var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
            if (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) {
              var chunk$jscomp$0 = endChunkForTag("head");
              destination.push(chunk$jscomp$0);
            }
            var bodyChunks = preamble$jscomp$0.bodyChunks;
            if (bodyChunks)
              for (completedPreambleSegments = 0;completedPreambleSegments < bodyChunks.length; completedPreambleSegments++)
                destination.push(bodyChunks[completedPreambleSegments]);
            flushSegment(request, destination, completedRootSegment, null);
            request.completedRootSegment = null;
            var renderState$jscomp$0 = request.renderState;
            if (request.allPendingTasks !== 0 || request.clientRenderedBoundaries.length !== 0 || request.completedBoundaries.length !== 0 || request.trackedPostpones !== null && (request.trackedPostpones.rootNodes.length !== 0 || request.trackedPostpones.rootSlots !== null)) {
              var resumableState$jscomp$0 = request.resumableState;
              if ((resumableState$jscomp$0.instructions & SentMarkShellTime) === NothingSent) {
                resumableState$jscomp$0.instructions |= SentMarkShellTime;
                destination.push(renderState$jscomp$0.startInlineScript);
                if ((resumableState$jscomp$0.instructions & SentCompletedShellId) === NothingSent) {
                  resumableState$jscomp$0.instructions |= SentCompletedShellId;
                  var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
                  destination.push(completedShellIdAttributeStart);
                  var chunk$jscomp$1 = escapeTextForBrowser(shellId);
                  destination.push(chunk$jscomp$1);
                  destination.push(attributeEnd);
                }
                destination.push(endOfStartTag);
                destination.push(shellTimeRuntimeScript);
                destination.push(endInlineScript);
              }
            }
            writeBootstrap(destination, renderState$jscomp$0);
          }
          var renderState$jscomp$1 = request.renderState;
          completedRootSegment = 0;
          var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
          for (completedRootSegment = 0;completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++)
            destination.push(viewportChunks$jscomp$0[completedRootSegment]);
          viewportChunks$jscomp$0.length = 0;
          renderState$jscomp$1.preconnects.forEach(flushResource, destination);
          renderState$jscomp$1.preconnects.clear();
          renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.fontPreloads.clear();
          renderState$jscomp$1.highImagePreloads.forEach(flushResource, destination);
          renderState$jscomp$1.highImagePreloads.clear();
          renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
          renderState$jscomp$1.scripts.forEach(flushResource, destination);
          renderState$jscomp$1.scripts.clear();
          renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.bulkPreloads.clear();
          var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
          for (completedRootSegment = 0;completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++)
            destination.push(hoistableChunks$jscomp$0[completedRootSegment]);
          hoistableChunks$jscomp$0.length = 0;
          var clientRenderedBoundaries = request.clientRenderedBoundaries;
          for (i = 0;i < clientRenderedBoundaries.length; i++) {
            var boundary = clientRenderedBoundaries[i];
            renderState$jscomp$1 = destination;
            var { resumableState: resumableState$jscomp$1, renderState: renderState$jscomp$2 } = request, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest, errorMessage = boundary.errorMessage, errorStack = boundary.errorStack, errorComponentStack = boundary.errorComponentStack;
            renderState$jscomp$1.push(renderState$jscomp$2.startInlineScript);
            renderState$jscomp$1.push(endOfStartTag);
            (resumableState$jscomp$1.instructions & SentClientRenderFunction) === NothingSent ? (resumableState$jscomp$1.instructions |= SentClientRenderFunction, renderState$jscomp$1.push(clientRenderScript1Full)) : renderState$jscomp$1.push(clientRenderScript1Partial);
            renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
            var chunk$jscomp$2 = id.toString(16);
            renderState$jscomp$1.push(chunk$jscomp$2);
            renderState$jscomp$1.push(clientRenderScript1A);
            if (errorDigest || errorMessage || errorStack || errorComponentStack) {
              renderState$jscomp$1.push(clientRenderErrorScriptArgInterstitial);
              var chunk$jscomp$3 = escapeJSStringsForInstructionScripts(errorDigest || "");
              renderState$jscomp$1.push(chunk$jscomp$3);
            }
            if (errorMessage || errorStack || errorComponentStack) {
              renderState$jscomp$1.push(clientRenderErrorScriptArgInterstitial);
              var chunk$jscomp$4 = escapeJSStringsForInstructionScripts(errorMessage || "");
              renderState$jscomp$1.push(chunk$jscomp$4);
            }
            if (errorStack || errorComponentStack) {
              renderState$jscomp$1.push(clientRenderErrorScriptArgInterstitial);
              var chunk$jscomp$5 = escapeJSStringsForInstructionScripts(errorStack || "");
              renderState$jscomp$1.push(chunk$jscomp$5);
            }
            if (errorComponentStack) {
              renderState$jscomp$1.push(clientRenderErrorScriptArgInterstitial);
              var chunk$jscomp$6 = escapeJSStringsForInstructionScripts(errorComponentStack);
              renderState$jscomp$1.push(chunk$jscomp$6);
            }
            var JSCompiler_inline_result = renderState$jscomp$1.push(clientRenderScriptEnd);
            if (!JSCompiler_inline_result) {
              request.destination = null;
              i++;
              clientRenderedBoundaries.splice(0, i);
              return;
            }
          }
          clientRenderedBoundaries.splice(0, i);
          var completedBoundaries = request.completedBoundaries;
          for (i = 0;i < completedBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
              request.destination = null;
              i++;
              completedBoundaries.splice(0, i);
              return;
            }
          completedBoundaries.splice(0, i);
          flushingPartialBoundaries = true;
          var partialBoundaries = request.partialBoundaries;
          for (i = 0;i < partialBoundaries.length; i++) {
            a: {
              clientRenderedBoundaries = request;
              boundary = destination;
              var boundary$jscomp$0 = partialBoundaries[i];
              flushedByteSize = boundary$jscomp$0.byteSize;
              var completedSegments = boundary$jscomp$0.completedSegments;
              for (JSCompiler_inline_result = 0;JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++)
                if (!flushPartiallyCompletedSegment(clientRenderedBoundaries, boundary, boundary$jscomp$0, completedSegments[JSCompiler_inline_result])) {
                  JSCompiler_inline_result++;
                  completedSegments.splice(0, JSCompiler_inline_result);
                  var JSCompiler_inline_result$jscomp$0 = false;
                  break a;
                }
              completedSegments.splice(0, JSCompiler_inline_result);
              var row = boundary$jscomp$0.row;
              row !== null && row.together && boundary$jscomp$0.pendingTasks === 1 && (row.pendingTasks === 1 ? unblockSuspenseListRow(clientRenderedBoundaries, row, row.hoistables) : row.pendingTasks--);
              JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(boundary, boundary$jscomp$0.contentState, clientRenderedBoundaries.renderState);
            }
            if (!JSCompiler_inline_result$jscomp$0) {
              request.destination = null;
              i++;
              partialBoundaries.splice(0, i);
              return;
            }
          }
          partialBoundaries.splice(0, i);
          flushingPartialBoundaries = false;
          var largeBoundaries = request.completedBoundaries;
          for (i = 0;i < largeBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
              request.destination = null;
              i++;
              largeBoundaries.splice(0, i);
              return;
            }
          largeBoundaries.splice(0, i);
        }
      } finally {
        flushingPartialBoundaries = false, request.allPendingTasks === 0 && request.clientRenderedBoundaries.length === 0 && request.completedBoundaries.length === 0 && (request.flushScheduled = false, i = request.resumableState, i.hasBody && (partialBoundaries = endChunkForTag("body"), destination.push(partialBoundaries)), i.hasHtml && (i = endChunkForTag("html"), destination.push(i)), request.abortableTasks.size !== 0 && console.error("There was still abortable task at the root when we closed. This is a bug in React."), request.status = CLOSED, destination.push(null), request.destination = null);
      }
    }
    function startWork(request) {
      request.flushScheduled = request.destination !== null;
      performWork(request);
      request.status === 10 && (request.status = 11);
      request.trackedPostpones === null && safelyEmitEarlyPreloads(request, request.pendingRootTasks === 0);
    }
    function enqueueFlush(request) {
      if (request.flushScheduled === false && request.pingedTasks.length === 0 && request.destination !== null) {
        request.flushScheduled = true;
        var destination = request.destination;
        destination ? flushCompletedQueues(request, destination) : request.flushScheduled = false;
      }
    }
    function startFlowing(request, destination) {
      if (request.status === 13)
        request.status = CLOSED, destination.destroy(request.fatalError);
      else if (request.status !== CLOSED && request.destination === null) {
        request.destination = destination;
        try {
          flushCompletedQueues(request, destination);
        } catch (error) {
          destination = {}, logRecoverableError(request, error, destination, null), fatalError(request, error, destination, null);
        }
      }
    }
    function abort(request, reason) {
      if (request.status === 11 || request.status === 10)
        request.status = 12;
      try {
        var abortableTasks = request.abortableTasks;
        if (0 < abortableTasks.size) {
          var error = reason === undefined ? Error("The render was aborted by the server without a reason.") : typeof reason === "object" && reason !== null && typeof reason.then === "function" ? Error("The render was aborted by the server with a promise.") : reason;
          request.fatalError = error;
          abortableTasks.forEach(function(task) {
            var prevTaskInDEV = currentTaskInDEV, prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
            currentTaskInDEV = task;
            ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
            try {
              abortTask(task, request, error);
            } finally {
              currentTaskInDEV = prevTaskInDEV, ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
            }
          });
          abortableTasks.clear();
        }
        request.destination !== null && flushCompletedQueues(request, request.destination);
      } catch (error$4) {
        reason = {}, logRecoverableError(request, error$4, reason, null), fatalError(request, error$4, reason, null);
      }
    }
    function addToReplayParent(node, parentKeyPath, trackedPostpones) {
      if (parentKeyPath === null)
        trackedPostpones.rootNodes.push(node);
      else {
        var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
        parentNode === undefined && (parentNode = [parentKeyPath[1], parentKeyPath[2], [], null], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
        parentNode[2].push(node);
      }
    }
    function onError() {}
    function renderToStringImpl(children, options, generateStaticMarkup, abortReason) {
      var didFatal = false, fatalError2 = null, result = "", readyToStream = false;
      options = createResumableState(options ? options.identifierPrefix : undefined);
      children = createRequest(children, options, createRenderState(options, generateStaticMarkup), createFormatContext(ROOT_HTML_MODE, null, 0, null), Infinity, onError, undefined, function() {
        readyToStream = true;
      }, undefined, undefined, undefined);
      startWork(children);
      abort(children, abortReason);
      startFlowing(children, {
        push: function(chunk) {
          chunk !== null && (result += chunk);
          return true;
        },
        destroy: function(error) {
          didFatal = true;
          fatalError2 = error;
        }
      });
      if (didFatal && fatalError2 !== abortReason)
        throw fatalError2;
      if (!readyToStream)
        throw Error("A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition.");
      return result;
    }
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_SCOPE_TYPE = Symbol.for("react.scope"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"), REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, isArrayImpl = Array.isArray, jsxPropsParents = new WeakMap, jsxChildrenParents = new WeakMap, CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference"), assign = Object.assign, hasOwnProperty = Object.prototype.hasOwnProperty, VALID_ATTRIBUTE_NAME_REGEX = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), illegalAttributeNameCache = {}, validatedAttributeNameCache = {}, unitlessNumbers = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" ")), aliases = new Map([
      ["acceptCharset", "accept-charset"],
      ["htmlFor", "for"],
      ["httpEquiv", "http-equiv"],
      ["crossOrigin", "crossorigin"],
      ["accentHeight", "accent-height"],
      ["alignmentBaseline", "alignment-baseline"],
      ["arabicForm", "arabic-form"],
      ["baselineShift", "baseline-shift"],
      ["capHeight", "cap-height"],
      ["clipPath", "clip-path"],
      ["clipRule", "clip-rule"],
      ["colorInterpolation", "color-interpolation"],
      ["colorInterpolationFilters", "color-interpolation-filters"],
      ["colorProfile", "color-profile"],
      ["colorRendering", "color-rendering"],
      ["dominantBaseline", "dominant-baseline"],
      ["enableBackground", "enable-background"],
      ["fillOpacity", "fill-opacity"],
      ["fillRule", "fill-rule"],
      ["floodColor", "flood-color"],
      ["floodOpacity", "flood-opacity"],
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontSizeAdjust", "font-size-adjust"],
      ["fontStretch", "font-stretch"],
      ["fontStyle", "font-style"],
      ["fontVariant", "font-variant"],
      ["fontWeight", "font-weight"],
      ["glyphName", "glyph-name"],
      ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
      ["glyphOrientationVertical", "glyph-orientation-vertical"],
      ["horizAdvX", "horiz-adv-x"],
      ["horizOriginX", "horiz-origin-x"],
      ["imageRendering", "image-rendering"],
      ["letterSpacing", "letter-spacing"],
      ["lightingColor", "lighting-color"],
      ["markerEnd", "marker-end"],
      ["markerMid", "marker-mid"],
      ["markerStart", "marker-start"],
      ["overlinePosition", "overline-position"],
      ["overlineThickness", "overline-thickness"],
      ["paintOrder", "paint-order"],
      ["panose-1", "panose-1"],
      ["pointerEvents", "pointer-events"],
      ["renderingIntent", "rendering-intent"],
      ["shapeRendering", "shape-rendering"],
      ["stopColor", "stop-color"],
      ["stopOpacity", "stop-opacity"],
      ["strikethroughPosition", "strikethrough-position"],
      ["strikethroughThickness", "strikethrough-thickness"],
      ["strokeDasharray", "stroke-dasharray"],
      ["strokeDashoffset", "stroke-dashoffset"],
      ["strokeLinecap", "stroke-linecap"],
      ["strokeLinejoin", "stroke-linejoin"],
      ["strokeMiterlimit", "stroke-miterlimit"],
      ["strokeOpacity", "stroke-opacity"],
      ["strokeWidth", "stroke-width"],
      ["textAnchor", "text-anchor"],
      ["textDecoration", "text-decoration"],
      ["textRendering", "text-rendering"],
      ["transformOrigin", "transform-origin"],
      ["underlinePosition", "underline-position"],
      ["underlineThickness", "underline-thickness"],
      ["unicodeBidi", "unicode-bidi"],
      ["unicodeRange", "unicode-range"],
      ["unitsPerEm", "units-per-em"],
      ["vAlphabetic", "v-alphabetic"],
      ["vHanging", "v-hanging"],
      ["vIdeographic", "v-ideographic"],
      ["vMathematical", "v-mathematical"],
      ["vectorEffect", "vector-effect"],
      ["vertAdvY", "vert-adv-y"],
      ["vertOriginX", "vert-origin-x"],
      ["vertOriginY", "vert-origin-y"],
      ["wordSpacing", "word-spacing"],
      ["writingMode", "writing-mode"],
      ["xmlnsXlink", "xmlns:xlink"],
      ["xHeight", "x-height"]
    ]), hasReadOnlyValue = {
      button: true,
      checkbox: true,
      image: true,
      hidden: true,
      radio: true,
      reset: true,
      submit: true
    }, ariaProperties = {
      "aria-current": 0,
      "aria-description": 0,
      "aria-details": 0,
      "aria-disabled": 0,
      "aria-hidden": 0,
      "aria-invalid": 0,
      "aria-keyshortcuts": 0,
      "aria-label": 0,
      "aria-roledescription": 0,
      "aria-autocomplete": 0,
      "aria-checked": 0,
      "aria-expanded": 0,
      "aria-haspopup": 0,
      "aria-level": 0,
      "aria-modal": 0,
      "aria-multiline": 0,
      "aria-multiselectable": 0,
      "aria-orientation": 0,
      "aria-placeholder": 0,
      "aria-pressed": 0,
      "aria-readonly": 0,
      "aria-required": 0,
      "aria-selected": 0,
      "aria-sort": 0,
      "aria-valuemax": 0,
      "aria-valuemin": 0,
      "aria-valuenow": 0,
      "aria-valuetext": 0,
      "aria-atomic": 0,
      "aria-busy": 0,
      "aria-live": 0,
      "aria-relevant": 0,
      "aria-dropeffect": 0,
      "aria-grabbed": 0,
      "aria-activedescendant": 0,
      "aria-colcount": 0,
      "aria-colindex": 0,
      "aria-colspan": 0,
      "aria-controls": 0,
      "aria-describedby": 0,
      "aria-errormessage": 0,
      "aria-flowto": 0,
      "aria-labelledby": 0,
      "aria-owns": 0,
      "aria-posinset": 0,
      "aria-rowcount": 0,
      "aria-rowindex": 0,
      "aria-rowspan": 0,
      "aria-setsize": 0,
      "aria-braillelabel": 0,
      "aria-brailleroledescription": 0,
      "aria-colindextext": 0,
      "aria-rowindextext": 0
    }, warnedProperties$1 = {}, rARIA$1 = RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), rARIACamel$1 = RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), didWarnValueNull = false, possibleStandardNames = {
      accept: "accept",
      acceptcharset: "acceptCharset",
      "accept-charset": "acceptCharset",
      accesskey: "accessKey",
      action: "action",
      allowfullscreen: "allowFullScreen",
      alt: "alt",
      as: "as",
      async: "async",
      autocapitalize: "autoCapitalize",
      autocomplete: "autoComplete",
      autocorrect: "autoCorrect",
      autofocus: "autoFocus",
      autoplay: "autoPlay",
      autosave: "autoSave",
      capture: "capture",
      cellpadding: "cellPadding",
      cellspacing: "cellSpacing",
      challenge: "challenge",
      charset: "charSet",
      checked: "checked",
      children: "children",
      cite: "cite",
      class: "className",
      classid: "classID",
      classname: "className",
      cols: "cols",
      colspan: "colSpan",
      content: "content",
      contenteditable: "contentEditable",
      contextmenu: "contextMenu",
      controls: "controls",
      controlslist: "controlsList",
      coords: "coords",
      crossorigin: "crossOrigin",
      dangerouslysetinnerhtml: "dangerouslySetInnerHTML",
      data: "data",
      datetime: "dateTime",
      default: "default",
      defaultchecked: "defaultChecked",
      defaultvalue: "defaultValue",
      defer: "defer",
      dir: "dir",
      disabled: "disabled",
      disablepictureinpicture: "disablePictureInPicture",
      disableremoteplayback: "disableRemotePlayback",
      download: "download",
      draggable: "draggable",
      enctype: "encType",
      enterkeyhint: "enterKeyHint",
      fetchpriority: "fetchPriority",
      for: "htmlFor",
      form: "form",
      formmethod: "formMethod",
      formaction: "formAction",
      formenctype: "formEncType",
      formnovalidate: "formNoValidate",
      formtarget: "formTarget",
      frameborder: "frameBorder",
      headers: "headers",
      height: "height",
      hidden: "hidden",
      high: "high",
      href: "href",
      hreflang: "hrefLang",
      htmlfor: "htmlFor",
      httpequiv: "httpEquiv",
      "http-equiv": "httpEquiv",
      icon: "icon",
      id: "id",
      imagesizes: "imageSizes",
      imagesrcset: "imageSrcSet",
      inert: "inert",
      innerhtml: "innerHTML",
      inputmode: "inputMode",
      integrity: "integrity",
      is: "is",
      itemid: "itemID",
      itemprop: "itemProp",
      itemref: "itemRef",
      itemscope: "itemScope",
      itemtype: "itemType",
      keyparams: "keyParams",
      keytype: "keyType",
      kind: "kind",
      label: "label",
      lang: "lang",
      list: "list",
      loop: "loop",
      low: "low",
      manifest: "manifest",
      marginwidth: "marginWidth",
      marginheight: "marginHeight",
      max: "max",
      maxlength: "maxLength",
      media: "media",
      mediagroup: "mediaGroup",
      method: "method",
      min: "min",
      minlength: "minLength",
      multiple: "multiple",
      muted: "muted",
      name: "name",
      nomodule: "noModule",
      nonce: "nonce",
      novalidate: "noValidate",
      open: "open",
      optimum: "optimum",
      pattern: "pattern",
      placeholder: "placeholder",
      playsinline: "playsInline",
      poster: "poster",
      preload: "preload",
      profile: "profile",
      radiogroup: "radioGroup",
      readonly: "readOnly",
      referrerpolicy: "referrerPolicy",
      rel: "rel",
      required: "required",
      reversed: "reversed",
      role: "role",
      rows: "rows",
      rowspan: "rowSpan",
      sandbox: "sandbox",
      scope: "scope",
      scoped: "scoped",
      scrolling: "scrolling",
      seamless: "seamless",
      selected: "selected",
      shape: "shape",
      size: "size",
      sizes: "sizes",
      span: "span",
      spellcheck: "spellCheck",
      src: "src",
      srcdoc: "srcDoc",
      srclang: "srcLang",
      srcset: "srcSet",
      start: "start",
      step: "step",
      style: "style",
      summary: "summary",
      tabindex: "tabIndex",
      target: "target",
      title: "title",
      type: "type",
      usemap: "useMap",
      value: "value",
      width: "width",
      wmode: "wmode",
      wrap: "wrap",
      about: "about",
      accentheight: "accentHeight",
      "accent-height": "accentHeight",
      accumulate: "accumulate",
      additive: "additive",
      alignmentbaseline: "alignmentBaseline",
      "alignment-baseline": "alignmentBaseline",
      allowreorder: "allowReorder",
      alphabetic: "alphabetic",
      amplitude: "amplitude",
      arabicform: "arabicForm",
      "arabic-form": "arabicForm",
      ascent: "ascent",
      attributename: "attributeName",
      attributetype: "attributeType",
      autoreverse: "autoReverse",
      azimuth: "azimuth",
      basefrequency: "baseFrequency",
      baselineshift: "baselineShift",
      "baseline-shift": "baselineShift",
      baseprofile: "baseProfile",
      bbox: "bbox",
      begin: "begin",
      bias: "bias",
      by: "by",
      calcmode: "calcMode",
      capheight: "capHeight",
      "cap-height": "capHeight",
      clip: "clip",
      clippath: "clipPath",
      "clip-path": "clipPath",
      clippathunits: "clipPathUnits",
      cliprule: "clipRule",
      "clip-rule": "clipRule",
      color: "color",
      colorinterpolation: "colorInterpolation",
      "color-interpolation": "colorInterpolation",
      colorinterpolationfilters: "colorInterpolationFilters",
      "color-interpolation-filters": "colorInterpolationFilters",
      colorprofile: "colorProfile",
      "color-profile": "colorProfile",
      colorrendering: "colorRendering",
      "color-rendering": "colorRendering",
      contentscripttype: "contentScriptType",
      contentstyletype: "contentStyleType",
      cursor: "cursor",
      cx: "cx",
      cy: "cy",
      d: "d",
      datatype: "datatype",
      decelerate: "decelerate",
      descent: "descent",
      diffuseconstant: "diffuseConstant",
      direction: "direction",
      display: "display",
      divisor: "divisor",
      dominantbaseline: "dominantBaseline",
      "dominant-baseline": "dominantBaseline",
      dur: "dur",
      dx: "dx",
      dy: "dy",
      edgemode: "edgeMode",
      elevation: "elevation",
      enablebackground: "enableBackground",
      "enable-background": "enableBackground",
      end: "end",
      exponent: "exponent",
      externalresourcesrequired: "externalResourcesRequired",
      fill: "fill",
      fillopacity: "fillOpacity",
      "fill-opacity": "fillOpacity",
      fillrule: "fillRule",
      "fill-rule": "fillRule",
      filter: "filter",
      filterres: "filterRes",
      filterunits: "filterUnits",
      floodopacity: "floodOpacity",
      "flood-opacity": "floodOpacity",
      floodcolor: "floodColor",
      "flood-color": "floodColor",
      focusable: "focusable",
      fontfamily: "fontFamily",
      "font-family": "fontFamily",
      fontsize: "fontSize",
      "font-size": "fontSize",
      fontsizeadjust: "fontSizeAdjust",
      "font-size-adjust": "fontSizeAdjust",
      fontstretch: "fontStretch",
      "font-stretch": "fontStretch",
      fontstyle: "fontStyle",
      "font-style": "fontStyle",
      fontvariant: "fontVariant",
      "font-variant": "fontVariant",
      fontweight: "fontWeight",
      "font-weight": "fontWeight",
      format: "format",
      from: "from",
      fx: "fx",
      fy: "fy",
      g1: "g1",
      g2: "g2",
      glyphname: "glyphName",
      "glyph-name": "glyphName",
      glyphorientationhorizontal: "glyphOrientationHorizontal",
      "glyph-orientation-horizontal": "glyphOrientationHorizontal",
      glyphorientationvertical: "glyphOrientationVertical",
      "glyph-orientation-vertical": "glyphOrientationVertical",
      glyphref: "glyphRef",
      gradienttransform: "gradientTransform",
      gradientunits: "gradientUnits",
      hanging: "hanging",
      horizadvx: "horizAdvX",
      "horiz-adv-x": "horizAdvX",
      horizoriginx: "horizOriginX",
      "horiz-origin-x": "horizOriginX",
      ideographic: "ideographic",
      imagerendering: "imageRendering",
      "image-rendering": "imageRendering",
      in2: "in2",
      in: "in",
      inlist: "inlist",
      intercept: "intercept",
      k1: "k1",
      k2: "k2",
      k3: "k3",
      k4: "k4",
      k: "k",
      kernelmatrix: "kernelMatrix",
      kernelunitlength: "kernelUnitLength",
      kerning: "kerning",
      keypoints: "keyPoints",
      keysplines: "keySplines",
      keytimes: "keyTimes",
      lengthadjust: "lengthAdjust",
      letterspacing: "letterSpacing",
      "letter-spacing": "letterSpacing",
      lightingcolor: "lightingColor",
      "lighting-color": "lightingColor",
      limitingconeangle: "limitingConeAngle",
      local: "local",
      markerend: "markerEnd",
      "marker-end": "markerEnd",
      markerheight: "markerHeight",
      markermid: "markerMid",
      "marker-mid": "markerMid",
      markerstart: "markerStart",
      "marker-start": "markerStart",
      markerunits: "markerUnits",
      markerwidth: "markerWidth",
      mask: "mask",
      maskcontentunits: "maskContentUnits",
      maskunits: "maskUnits",
      mathematical: "mathematical",
      mode: "mode",
      numoctaves: "numOctaves",
      offset: "offset",
      opacity: "opacity",
      operator: "operator",
      order: "order",
      orient: "orient",
      orientation: "orientation",
      origin: "origin",
      overflow: "overflow",
      overlineposition: "overlinePosition",
      "overline-position": "overlinePosition",
      overlinethickness: "overlineThickness",
      "overline-thickness": "overlineThickness",
      paintorder: "paintOrder",
      "paint-order": "paintOrder",
      panose1: "panose1",
      "panose-1": "panose1",
      pathlength: "pathLength",
      patterncontentunits: "patternContentUnits",
      patterntransform: "patternTransform",
      patternunits: "patternUnits",
      pointerevents: "pointerEvents",
      "pointer-events": "pointerEvents",
      points: "points",
      pointsatx: "pointsAtX",
      pointsaty: "pointsAtY",
      pointsatz: "pointsAtZ",
      popover: "popover",
      popovertarget: "popoverTarget",
      popovertargetaction: "popoverTargetAction",
      prefix: "prefix",
      preservealpha: "preserveAlpha",
      preserveaspectratio: "preserveAspectRatio",
      primitiveunits: "primitiveUnits",
      property: "property",
      r: "r",
      radius: "radius",
      refx: "refX",
      refy: "refY",
      renderingintent: "renderingIntent",
      "rendering-intent": "renderingIntent",
      repeatcount: "repeatCount",
      repeatdur: "repeatDur",
      requiredextensions: "requiredExtensions",
      requiredfeatures: "requiredFeatures",
      resource: "resource",
      restart: "restart",
      result: "result",
      results: "results",
      rotate: "rotate",
      rx: "rx",
      ry: "ry",
      scale: "scale",
      security: "security",
      seed: "seed",
      shaperendering: "shapeRendering",
      "shape-rendering": "shapeRendering",
      slope: "slope",
      spacing: "spacing",
      specularconstant: "specularConstant",
      specularexponent: "specularExponent",
      speed: "speed",
      spreadmethod: "spreadMethod",
      startoffset: "startOffset",
      stddeviation: "stdDeviation",
      stemh: "stemh",
      stemv: "stemv",
      stitchtiles: "stitchTiles",
      stopcolor: "stopColor",
      "stop-color": "stopColor",
      stopopacity: "stopOpacity",
      "stop-opacity": "stopOpacity",
      strikethroughposition: "strikethroughPosition",
      "strikethrough-position": "strikethroughPosition",
      strikethroughthickness: "strikethroughThickness",
      "strikethrough-thickness": "strikethroughThickness",
      string: "string",
      stroke: "stroke",
      strokedasharray: "strokeDasharray",
      "stroke-dasharray": "strokeDasharray",
      strokedashoffset: "strokeDashoffset",
      "stroke-dashoffset": "strokeDashoffset",
      strokelinecap: "strokeLinecap",
      "stroke-linecap": "strokeLinecap",
      strokelinejoin: "strokeLinejoin",
      "stroke-linejoin": "strokeLinejoin",
      strokemiterlimit: "strokeMiterlimit",
      "stroke-miterlimit": "strokeMiterlimit",
      strokewidth: "strokeWidth",
      "stroke-width": "strokeWidth",
      strokeopacity: "strokeOpacity",
      "stroke-opacity": "strokeOpacity",
      suppresscontenteditablewarning: "suppressContentEditableWarning",
      suppresshydrationwarning: "suppressHydrationWarning",
      surfacescale: "surfaceScale",
      systemlanguage: "systemLanguage",
      tablevalues: "tableValues",
      targetx: "targetX",
      targety: "targetY",
      textanchor: "textAnchor",
      "text-anchor": "textAnchor",
      textdecoration: "textDecoration",
      "text-decoration": "textDecoration",
      textlength: "textLength",
      textrendering: "textRendering",
      "text-rendering": "textRendering",
      to: "to",
      transform: "transform",
      transformorigin: "transformOrigin",
      "transform-origin": "transformOrigin",
      typeof: "typeof",
      u1: "u1",
      u2: "u2",
      underlineposition: "underlinePosition",
      "underline-position": "underlinePosition",
      underlinethickness: "underlineThickness",
      "underline-thickness": "underlineThickness",
      unicode: "unicode",
      unicodebidi: "unicodeBidi",
      "unicode-bidi": "unicodeBidi",
      unicoderange: "unicodeRange",
      "unicode-range": "unicodeRange",
      unitsperem: "unitsPerEm",
      "units-per-em": "unitsPerEm",
      unselectable: "unselectable",
      valphabetic: "vAlphabetic",
      "v-alphabetic": "vAlphabetic",
      values: "values",
      vectoreffect: "vectorEffect",
      "vector-effect": "vectorEffect",
      version: "version",
      vertadvy: "vertAdvY",
      "vert-adv-y": "vertAdvY",
      vertoriginx: "vertOriginX",
      "vert-origin-x": "vertOriginX",
      vertoriginy: "vertOriginY",
      "vert-origin-y": "vertOriginY",
      vhanging: "vHanging",
      "v-hanging": "vHanging",
      videographic: "vIdeographic",
      "v-ideographic": "vIdeographic",
      viewbox: "viewBox",
      viewtarget: "viewTarget",
      visibility: "visibility",
      vmathematical: "vMathematical",
      "v-mathematical": "vMathematical",
      vocab: "vocab",
      widths: "widths",
      wordspacing: "wordSpacing",
      "word-spacing": "wordSpacing",
      writingmode: "writingMode",
      "writing-mode": "writingMode",
      x1: "x1",
      x2: "x2",
      x: "x",
      xchannelselector: "xChannelSelector",
      xheight: "xHeight",
      "x-height": "xHeight",
      xlinkactuate: "xlinkActuate",
      "xlink:actuate": "xlinkActuate",
      xlinkarcrole: "xlinkArcrole",
      "xlink:arcrole": "xlinkArcrole",
      xlinkhref: "xlinkHref",
      "xlink:href": "xlinkHref",
      xlinkrole: "xlinkRole",
      "xlink:role": "xlinkRole",
      xlinkshow: "xlinkShow",
      "xlink:show": "xlinkShow",
      xlinktitle: "xlinkTitle",
      "xlink:title": "xlinkTitle",
      xlinktype: "xlinkType",
      "xlink:type": "xlinkType",
      xmlbase: "xmlBase",
      "xml:base": "xmlBase",
      xmllang: "xmlLang",
      "xml:lang": "xmlLang",
      xmlns: "xmlns",
      "xml:space": "xmlSpace",
      xmlnsxlink: "xmlnsXlink",
      "xmlns:xlink": "xmlnsXlink",
      xmlspace: "xmlSpace",
      y1: "y1",
      y2: "y2",
      y: "y",
      ychannelselector: "yChannelSelector",
      z: "z",
      zoomandpan: "zoomAndPan"
    }, warnedProperties = {}, EVENT_NAME_REGEX = /^on./, INVALID_EVENT_NAME_REGEX = /^on[^A-Z]/, rARIA = RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), rARIACamel = RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/, msPattern$1 = /^-ms-/, hyphenPattern = /-(.)/g, badStyleValueWithSemicolonPattern = /;\s*$/, warnedStyleNames = {}, warnedStyleValues = {}, warnedForNaNValue = false, warnedForInfinityValue = false, matchHtmlRegExp = /["'&<>]/, uppercasePattern = /([A-Z])/g, msPattern = /^ms-/, isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i, ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, NotPending = Object.freeze({
      pending: false,
      data: null,
      method: null,
      action: null
    }), previousDispatcher = ReactDOMSharedInternals.d;
    ReactDOMSharedInternals.d = {
      f: previousDispatcher.f,
      r: previousDispatcher.r,
      D: function(href) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (typeof href === "string" && href) {
            if (!resumableState.dnsResources.hasOwnProperty(href)) {
              resumableState.dnsResources[href] = EXISTS;
              resumableState = renderState.headers;
              var header, JSCompiler_temp;
              if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity)
                JSCompiler_temp = (header = "<" + escapeHrefForLinkHeaderURLContext(href) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
              JSCompiler_temp ? (renderState.resets.dns[href] = EXISTS, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, { href, rel: "dns-prefetch" }), renderState.preconnects.add(header));
            }
            enqueueFlush(request);
          }
        } else
          previousDispatcher.D(href);
      },
      C: function(href, crossOrigin) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (typeof href === "string" && href) {
            var bucket = crossOrigin === "use-credentials" ? "credentials" : typeof crossOrigin === "string" ? "anonymous" : "default";
            if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
              resumableState.connectResources[bucket][href] = EXISTS;
              resumableState = renderState.headers;
              var header, JSCompiler_temp;
              if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
                JSCompiler_temp = "<" + escapeHrefForLinkHeaderURLContext(href) + ">; rel=preconnect";
                if (typeof crossOrigin === "string") {
                  var escapedCrossOrigin = escapeStringForLinkHeaderQuotedParamValueContext(crossOrigin, "crossOrigin");
                  JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
                }
                JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
              }
              JSCompiler_temp ? (renderState.resets.connect[bucket][href] = EXISTS, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
                rel: "preconnect",
                href,
                crossOrigin
              }), renderState.preconnects.add(bucket));
            }
            enqueueFlush(request);
          }
        } else
          previousDispatcher.C(href, crossOrigin);
      },
      L: function(href, as, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (as && href) {
            switch (as) {
              case "image":
                if (options) {
                  var imageSrcSet = options.imageSrcSet;
                  var imageSizes = options.imageSizes;
                  var fetchPriority = options.fetchPriority;
                }
                var key = imageSrcSet ? imageSrcSet + `
` + (imageSizes || "") : href;
                if (resumableState.imageResources.hasOwnProperty(key))
                  return;
                resumableState.imageResources[key] = PRELOAD_NO_CREDS;
                resumableState = renderState.headers;
                var header;
                resumableState && 0 < resumableState.remainingCapacity && typeof imageSrcSet !== "string" && fetchPriority === "high" && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(resumableState, assign({
                  rel: "preload",
                  href: imageSrcSet ? undefined : href,
                  as
                }, options)), fetchPriority === "high" ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
                break;
              case "style":
                if (resumableState.styleResources.hasOwnProperty(href))
                  return;
                imageSrcSet = [];
                pushLinkImpl(imageSrcSet, assign({ rel: "preload", href, as }, options));
                resumableState.styleResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
                renderState.preloads.stylesheets.set(href, imageSrcSet);
                renderState.bulkPreloads.add(imageSrcSet);
                break;
              case "script":
                if (resumableState.scriptResources.hasOwnProperty(href))
                  return;
                imageSrcSet = [];
                renderState.preloads.scripts.set(href, imageSrcSet);
                renderState.bulkPreloads.add(imageSrcSet);
                pushLinkImpl(imageSrcSet, assign({ rel: "preload", href, as }, options));
                resumableState.scriptResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
                break;
              default:
                if (resumableState.unknownResources.hasOwnProperty(as)) {
                  if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href))
                    return;
                } else
                  imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
                imageSrcSet[href] = PRELOAD_NO_CREDS;
                if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && as === "font" && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2)))
                  renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
                else
                  switch (resumableState = [], href = assign({ rel: "preload", href, as }, options), pushLinkImpl(resumableState, href), as) {
                    case "font":
                      renderState.fontPreloads.add(resumableState);
                      break;
                    default:
                      renderState.bulkPreloads.add(resumableState);
                  }
            }
            enqueueFlush(request);
          }
        } else
          previousDispatcher.L(href, as, options);
      },
      m: function(href, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (href) {
            var as = options && typeof options.as === "string" ? options.as : "script";
            switch (as) {
              case "script":
                if (resumableState.moduleScriptResources.hasOwnProperty(href))
                  return;
                as = [];
                resumableState.moduleScriptResources[href] = !options || typeof options.crossOrigin !== "string" && typeof options.integrity !== "string" ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
                renderState.preloads.moduleScripts.set(href, as);
                break;
              default:
                if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
                  var resources = resumableState.unknownResources[as];
                  if (resources.hasOwnProperty(href))
                    return;
                } else
                  resources = {}, resumableState.moduleUnknownResources[as] = resources;
                as = [];
                resources[href] = PRELOAD_NO_CREDS;
            }
            pushLinkImpl(as, assign({ rel: "modulepreload", href }, options));
            renderState.bulkPreloads.add(as);
            enqueueFlush(request);
          }
        } else
          previousDispatcher.m(href, options);
      },
      X: function(src, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (src) {
            var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : undefined;
            resourceState !== EXISTS && (resumableState.scriptResources[src] = EXISTS, options = assign({ src, async: true }, options), resourceState && (resourceState.length === 2 && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
          }
        } else
          previousDispatcher.X(src, options);
      },
      S: function(href, precedence, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (href) {
            precedence = precedence || "default";
            var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : undefined;
            resourceState !== EXISTS && (resumableState.styleResources[href] = EXISTS, styleQueue || (styleQueue = {
              precedence: escapeTextForBrowser(precedence),
              rules: [],
              hrefs: [],
              sheets: new Map
            }, renderState.styles.set(precedence, styleQueue)), precedence = {
              state: PENDING$1,
              props: assign({
                rel: "stylesheet",
                href,
                "data-precedence": precedence
              }, options)
            }, resourceState && (resourceState.length === 2 && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = PRELOADED), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
          }
        } else
          previousDispatcher.S(href, precedence, options);
      },
      M: function(src, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var { resumableState, renderState } = request;
          if (src) {
            var resourceState = resumableState.moduleScriptResources.hasOwnProperty(src) ? resumableState.moduleScriptResources[src] : undefined;
            resourceState !== EXISTS && (resumableState.moduleScriptResources[src] = EXISTS, options = assign({ src, type: "module", async: true }, options), resourceState && (resourceState.length === 2 && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
          }
        } else
          previousDispatcher.M(src, options);
      }
    };
    var NothingSent = 0, SentCompleteSegmentFunction = 1, SentCompleteBoundaryFunction = 2, SentClientRenderFunction = 4, SentStyleInsertionFunction = 8, SentCompletedShellId = 32, SentMarkShellTime = 64, EXISTS = null, PRELOAD_NO_CREDS = [];
    Object.freeze(PRELOAD_NO_CREDS);
    var currentlyFlushingRenderState = null, endInlineScript = "</script>", scriptRegex = /(<\/|<)(s)(cript)/gi;
    var didWarnForNewBooleanPropsWithEmptyValue = {};
    var ROOT_HTML_MODE = 0, HTML_HTML_MODE = 1, HTML_MODE = 2, HTML_HEAD_MODE = 3, SVG_MODE = 4, MATHML_MODE = 5, HTML_TABLE_MODE = 6, HTML_TABLE_BODY_MODE = 7, HTML_TABLE_ROW_MODE = 8, HTML_COLGROUP_MODE = 9, styleNameCache = new Map, styleAttributeStart = ' style="', styleAssign = ":", styleSeparator = ";", attributeSeparator = " ", attributeAssign = '="', attributeEnd = '"', attributeEmptyString = '=""', actionJavaScriptURL = escapeTextForBrowser("javascript:throw new Error('React form unexpectedly submitted.')"), endOfStartTag = ">", endOfStartTagSelfClosing = "/>", didWarnDefaultInputValue = false, didWarnDefaultChecked = false, didWarnDefaultSelectValue = false, didWarnDefaultTextareaValue = false, didWarnInvalidOptionChildren = false, didWarnInvalidOptionInnerHTML = false, didWarnSelectedSetOnOption = false, didWarnFormActionType = false, didWarnFormActionName = false, didWarnFormActionTarget = false, didWarnFormActionMethod = false, formReplayingRuntimeScript = `addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`, styleRegex = /(<\/|<)(s)(tyle)/gi, leadingNewline = `
`, VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/, validatedTagCache = new Map, endTagCache = new Map, shellTimeRuntimeScript = "requestAnimationFrame(function(){$RT=performance.now()});", placeholder1 = '<template id="', placeholder2 = '"></template>', startCompletedSuspenseBoundary = "<!--$-->", startPendingSuspenseBoundary1 = '<!--$?--><template id="', startPendingSuspenseBoundary2 = '"></template>', startClientRenderedSuspenseBoundary = "<!--$!-->", endSuspenseBoundary = "<!--/$-->", clientRenderedSuspenseBoundaryError1 = "<template", clientRenderedSuspenseBoundaryErrorAttrInterstitial = '"', clientRenderedSuspenseBoundaryError1A = ' data-dgst="', clientRenderedSuspenseBoundaryError1B = ' data-msg="', clientRenderedSuspenseBoundaryError1C = ' data-stck="', clientRenderedSuspenseBoundaryError1D = ' data-cstck="', clientRenderedSuspenseBoundaryError2 = "></template>", startSegmentHTML = '<div hidden id="', startSegmentHTML2 = '">', endSegmentHTML = "</div>", startSegmentSVG = '<svg aria-hidden="true" style="display:none" id="', startSegmentSVG2 = '">', endSegmentSVG = "</svg>", startSegmentMathML = '<math aria-hidden="true" style="display:none" id="', startSegmentMathML2 = '">', endSegmentMathML = "</math>", startSegmentTable = '<table hidden id="', startSegmentTable2 = '">', endSegmentTable = "</table>", startSegmentTableBody = '<table hidden><tbody id="', startSegmentTableBody2 = '">', endSegmentTableBody = "</tbody></table>", startSegmentTableRow = '<table hidden><tr id="', startSegmentTableRow2 = '">', endSegmentTableRow = "</tr></table>", startSegmentColGroup = '<table hidden><colgroup id="', startSegmentColGroup2 = '">', endSegmentColGroup = "</colgroup></table>", completeSegmentScript1Full = '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("', completeSegmentScript1Partial = '$RS("', completeSegmentScript2 = '","', completeSegmentScriptEnd = '")</script>', completeBoundaryScriptFunctionOnly = `$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};`, completeBoundaryScript1Partial = '$RC("', completeBoundaryWithStylesScript1FullPartial = `$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=
"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=
"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("`, completeBoundaryWithStylesScript1Partial = '$RR("', completeBoundaryScript2 = '","', completeBoundaryScript3a = '",', completeBoundaryScript3b = '"', completeBoundaryScriptEnd = ")</script>", clientRenderScriptFunctionOnly = '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};', clientRenderScript1Full = '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("', clientRenderScript1Partial = '$RX("', clientRenderScript1A = '"', clientRenderErrorScriptArgInterstitial = ",", clientRenderScriptEnd = ")</script>", regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g, regexForJSStringsInScripts = /[&><\u2028\u2029]/g, lateStyleTagResourceOpen1 = ' media="not all" data-precedence="', lateStyleTagResourceOpen2 = '" data-href="', lateStyleTagResourceOpen3 = '">', lateStyleTagTemplateClose = "</style>", currentlyRenderingBoundaryHasStylesToHoist = false, destinationHasCapacity = true, stylesheetFlushingQueue = [], styleTagResourceOpen1 = ' data-precedence="', styleTagResourceOpen2 = '" data-href="', spaceSeparator = " ", styleTagResourceOpen3 = '">', styleTagResourceClose = "</style>", completedShellIdAttributeStart = ' id="', arrayFirstOpenBracket = "[", arraySubsequentOpenBracket = ",[", arrayInterstitial = ",", arrayCloseBracket = "]", PENDING$1 = 0, PRELOADED = 1, PREAMBLE = 2, LATE = 3, regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g, regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g, doctypeChunk = "", bind = Function.prototype.bind, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), emptyContextObject = {};
    Object.freeze(emptyContextObject);
    var rendererSigil = {};
    var currentActiveSnapshot = null, didWarnAboutNoopUpdateForComponent = {}, didWarnAboutDeprecatedWillMount = {};
    var didWarnAboutUninitializedState = new Set;
    var didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate = new Set;
    var didWarnAboutLegacyLifecyclesAndDerivedState = new Set;
    var didWarnAboutDirectlyAssigningPropsToState = new Set;
    var didWarnAboutUndefinedDerivedState = new Set;
    var didWarnAboutContextTypes$1 = new Set;
    var didWarnAboutChildContextTypes = new Set;
    var didWarnAboutInvalidateContextType = new Set;
    var didWarnOnInvalidCallback = new Set;
    var classComponentUpdater = {
      enqueueSetState: function(inst, payload, callback) {
        var internals = inst._reactInternals;
        internals.queue === null ? warnNoop(inst, "setState") : (internals.queue.push(payload), callback !== undefined && callback !== null && warnOnInvalidCallback(callback));
      },
      enqueueReplaceState: function(inst, payload, callback) {
        inst = inst._reactInternals;
        inst.replace = true;
        inst.queue = [payload];
        callback !== undefined && callback !== null && warnOnInvalidCallback(callback);
      },
      enqueueForceUpdate: function(inst, callback) {
        inst._reactInternals.queue === null ? warnNoop(inst, "forceUpdate") : callback !== undefined && callback !== null && warnOnInvalidCallback(callback);
      }
    }, emptyTreeContext = { id: 1, overflow: "" }, clz32 = Math.clz32 ? Math.clz32 : clz32Fallback, log = Math.log, LN2 = Math.LN2, SuspenseException = Error("Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."), suspendedThenable = null, objectIs = typeof Object.is === "function" ? Object.is : is, currentlyRenderingComponent = null, currentlyRenderingTask = null, currentlyRenderingRequest = null, currentlyRenderingKeyPath = null, firstWorkInProgressHook = null, workInProgressHook = null, isReRender = false, didScheduleRenderPhaseUpdate = false, localIdCounter = 0, actionStateCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, thenableState = null, renderPhaseUpdates = null, numberOfReRenders = 0, isInHookUserCodeInDev = false, currentHookNameInDev, HooksDispatcher = {
      readContext,
      use: function(usable) {
        if (usable !== null && typeof usable === "object") {
          if (typeof usable.then === "function")
            return unwrapThenable(usable);
          if (usable.$$typeof === REACT_CONTEXT_TYPE)
            return readContext(usable);
        }
        throw Error("An unsupported type was passed to use(): " + String(usable));
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        resolveCurrentlyRenderingComponent();
        return context._currentValue2;
      },
      useMemo,
      useReducer,
      useRef: function(initialValue) {
        currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
        workInProgressHook = createWorkInProgressHook();
        var previousRef = workInProgressHook.memoizedState;
        return previousRef === null ? (initialValue = { current: initialValue }, Object.seal(initialValue), workInProgressHook.memoizedState = initialValue) : previousRef;
      },
      useState: function(initialState) {
        currentHookNameInDev = "useState";
        return useReducer(basicStateReducer, initialState);
      },
      useInsertionEffect: noop,
      useLayoutEffect: noop,
      useCallback: function(callback, deps) {
        return useMemo(function() {
          return callback;
        }, deps);
      },
      useImperativeHandle: noop,
      useEffect: noop,
      useDebugValue: noop,
      useDeferredValue: function(value, initialValue) {
        resolveCurrentlyRenderingComponent();
        return initialValue !== undefined ? initialValue : value;
      },
      useTransition: function() {
        resolveCurrentlyRenderingComponent();
        return [false, unsupportedStartTransition];
      },
      useId: function() {
        var treeId = currentlyRenderingTask.treeContext;
        var overflow = treeId.overflow;
        treeId = treeId.id;
        treeId = (treeId & ~(1 << 32 - clz32(treeId) - 1)).toString(32) + overflow;
        var resumableState = currentResumableState;
        if (resumableState === null)
          throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component.");
        overflow = localIdCounter++;
        treeId = "_" + resumableState.idPrefix + "R_" + treeId;
        0 < overflow && (treeId += "H" + overflow.toString(32));
        return treeId + "_";
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        if (getServerSnapshot === undefined)
          throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
        return getServerSnapshot();
      },
      useOptimistic: function(passthrough) {
        resolveCurrentlyRenderingComponent();
        return [passthrough, unsupportedSetOptimisticState];
      },
      useActionState,
      useFormState: useActionState,
      useHostTransitionStatus: function() {
        resolveCurrentlyRenderingComponent();
        return NotPending;
      },
      useMemoCache: function(size) {
        for (var data = Array(size), i = 0;i < size; i++)
          data[i] = REACT_MEMO_CACHE_SENTINEL;
        return data;
      },
      useCacheRefresh: function() {
        return unsupportedRefresh;
      },
      useEffectEvent: function() {
        return throwOnUseEffectEventCall;
      }
    }, currentResumableState = null, currentTaskInDEV = null, DefaultAsyncDispatcher = {
      getCacheForType: function() {
        throw Error("Not implemented.");
      },
      cacheSignal: function() {
        throw Error("Not implemented.");
      },
      getOwner: function() {
        return currentTaskInDEV === null ? null : currentTaskInDEV.componentStack;
      }
    }, disabledDepth = 0, prevLog, prevInfo, prevWarn, prevError, prevGroup, prevGroupCollapsed, prevGroupEnd;
    disabledLog.__reactDisabledLog = true;
    var prefix, suffix, reentry = false;
    var componentFrameCache = new (typeof WeakMap === "function" ? WeakMap : Map);
    var callComponent = {
      react_stack_bottom_frame: function(Component, props, secondArg) {
        return Component(props, secondArg);
      }
    }, callComponentInDEV = callComponent.react_stack_bottom_frame.bind(callComponent), callRender = {
      react_stack_bottom_frame: function(instance) {
        return instance.render();
      }
    }, callRenderInDEV = callRender.react_stack_bottom_frame.bind(callRender), callLazyInit = {
      react_stack_bottom_frame: function(lazy) {
        var init = lazy._init;
        return init(lazy._payload);
      }
    }, callLazyInitInDEV = callLazyInit.react_stack_bottom_frame.bind(callLazyInit), lastResetTime = 0;
    if (typeof performance === "object" && typeof performance.now === "function") {
      var localPerformance = performance;
      var getCurrentTime = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date;
      getCurrentTime = function() {
        return localDate.now();
      };
    }
    var CLIENT_RENDERED = 4, PENDING = 0, COMPLETED = 1, FLUSHED = 2, ABORTED = 3, ERRORED = 4, POSTPONED = 5, CLOSED = 14, currentRequest = null, didWarnAboutBadClass = {}, didWarnAboutContextTypes = {}, didWarnAboutContextTypeOnFunctionComponent = {}, didWarnAboutGetDerivedStateOnFunctionComponent = {}, didWarnAboutReassigningProps = false, didWarnAboutGenerators = false, didWarnAboutMaps = false, flushedByteSize = 0, flushingPartialBoundaries = false;
    exports.renderToStaticMarkup = function(children, options) {
      return renderToStringImpl(children, options, true, 'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server');
    };
    exports.renderToString = function(children, options) {
      return renderToStringImpl(children, options, false, 'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server');
    };
    exports.version = "19.2.0";
  })();
});

// node_modules/react/cjs/react-jsx-dev-runtime.development.js
var require_react_jsx_dev_runtime_development = __commonJS((exports) => {
  var React = __toESM(require_react(), 1);
  (function() {
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console;
        var JSCompiler_temp_const = JSCompiler_inline_result.error;
        var JSCompiler_inline_result$jscomp$0 = typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
        JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
        return testStringCoercion(value);
      }
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE)
        return "<>";
      if (typeof type === "object" && type !== null && type.$$typeof === REACT_LAZY_TYPE)
        return "<...>";
      try {
        var name = getComponentNameFromType(type);
        return name ? "<" + name + ">" : "<...>";
      } catch (x) {
        return "<...>";
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A;
      return dispatcher === null ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
      return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, "key")) {
        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
        if (getter && getter.isReactWarning)
          return false;
      }
      return config.key !== undefined;
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
      }
      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, "key", {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type);
      didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
      componentName = this.props.ref;
      return componentName !== undefined ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref;
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner
      };
      (refProp !== undefined ? refProp : null) !== null ? Object.defineProperty(type, "ref", {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning
      }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
      type._store = {};
      Object.defineProperty(type._store, "validated", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: 0
      });
      Object.defineProperty(type, "_debugInfo", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
      });
      Object.defineProperty(type, "_debugStack", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack
      });
      Object.defineProperty(type, "_debugTask", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask
      });
      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
      return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
      var children = config.children;
      if (children !== undefined)
        if (isStaticChildren)
          if (isArrayImpl(children)) {
            for (isStaticChildren = 0;isStaticChildren < children.length; isStaticChildren++)
              validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
          } else
            console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else
          validateChildKeys(children);
      if (hasOwnProperty.call(config, "key")) {
        children = getComponentNameFromType(type);
        var keys = Object.keys(config).filter(function(k) {
          return k !== "key";
        });
        isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
        didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = true);
      }
      children = null;
      maybeKey !== undefined && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
      hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          propName !== "key" && (maybeKey[propName] = config[propName]);
      } else
        maybeKey = config;
      children && defineKeyPropWarningGetter(maybeKey, typeof type === "function" ? type.displayName || type.name || "Unknown" : type);
      return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
      isValidElement(node) ? node._store && (node._store.validated = 1) : typeof node === "object" && node !== null && node.$$typeof === REACT_LAZY_TYPE && (node._payload.status === "fulfilled" ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
      return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
      return null;
    };
    React = {
      react_stack_bottom_frame: function(callStackForError) {
        return callStackForError();
      }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return jsxDEVImpl(type, config, maybeKey, isStaticChildren, trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
  })();
});

// node_modules/react/jsx-dev-runtime.js
var require_jsx_dev_runtime = __commonJS((exports, module) => {
  if (false) {} else {
    module.exports = require_react_jsx_dev_runtime_development();
  }
});

// .impeccable/harness/render.tsx
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// node_modules/react-dom/server.bun.js
var b;
var l;
if (false) {} else {
  b = require_react_dom_server_bun_development();
  l = require_react_dom_server_legacy_browser_development();
}
var $version = b.version;
var $renderToReadableStream = b.renderToReadableStream;
var $resume = b.resume;
var $renderToString = l.renderToString;
var $renderToStaticMarkup = l.renderToStaticMarkup;

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = __toESM(require_react(), 1);

// node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};

// node_modules/lucide-react/dist/esm/Icon.js
var import_react = __toESM(require_react(), 1);

// node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/lucide-react/dist/esm/Icon.js
var Icon = import_react.forwardRef(({
  color = "currentColor",
  size = 24,
  strokeWidth = 2,
  absoluteStrokeWidth,
  className = "",
  children,
  iconNode,
  ...rest
}, ref) => import_react.createElement("svg", {
  ref,
  ...defaultAttributes,
  width: size,
  height: size,
  stroke: color,
  strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
  className: mergeClasses("lucide", className),
  ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
  ...rest
}, [
  ...iconNode.map(([tag, attrs]) => import_react.createElement(tag, attrs)),
  ...Array.isArray(children) ? children : [children]
]));

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = import_react2.forwardRef(({ className, ...props }, ref) => import_react2.createElement(Icon, {
    ref,
    iconNode,
    className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
    ...props
  }));
  Component.displayName = toPascalCase(iconName);
  return Component;
};

// node_modules/lucide-react/dist/esm/icons/book-open.js
var __iconNode = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
];
var BookOpen = createLucideIcon("book-open", __iconNode);

// node_modules/lucide-react/dist/esm/icons/chevron-left.js
var __iconNode2 = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
var ChevronLeft = createLucideIcon("chevron-left", __iconNode2);

// node_modules/lucide-react/dist/esm/icons/circle-check.js
var __iconNode3 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
var CircleCheck = createLucideIcon("circle-check", __iconNode3);

// node_modules/lucide-react/dist/esm/icons/file-search.js
var __iconNode4 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["circle", { cx: "11.5", cy: "14.5", r: "2.5", key: "1bq0ko" }],
  ["path", { d: "M13.3 16.3 15 18", key: "2quom7" }]
];
var FileSearch = createLucideIcon("file-search", __iconNode4);

// node_modules/lucide-react/dist/esm/icons/history.js
var __iconNode5 = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
];
var History = createLucideIcon("history", __iconNode5);

// node_modules/lucide-react/dist/esm/icons/inbox.js
var __iconNode6 = [
  ["polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12", key: "o97t9d" }],
  [
    "path",
    {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      key: "oot6mr"
    }
  ]
];
var Inbox = createLucideIcon("inbox", __iconNode6);

// node_modules/lucide-react/dist/esm/icons/list-tree.js
var __iconNode7 = [
  ["path", { d: "M8 5h13", key: "1pao27" }],
  ["path", { d: "M13 12h8", key: "h98zly" }],
  ["path", { d: "M13 19h8", key: "c3s6r1" }],
  ["path", { d: "M3 10a2 2 0 0 0 2 2h3", key: "1npucw" }],
  ["path", { d: "M3 5v12a2 2 0 0 0 2 2h3", key: "x1gjn2" }]
];
var ListTree = createLucideIcon("list-tree", __iconNode7);

// node_modules/lucide-react/dist/esm/icons/search.js
var __iconNode8 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
var Search = createLucideIcon("search", __iconNode8);

// node_modules/lucide-react/dist/esm/icons/shield-alert.js
var __iconNode9 = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "M12 8v4", key: "1got3b" }],
  ["path", { d: "M12 16h.01", key: "1drbdi" }]
];
var ShieldAlert = createLucideIcon("shield-alert", __iconNode9);

// node_modules/lucide-react/dist/esm/icons/triangle-alert.js
var __iconNode10 = [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      key: "wmoenq"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
];
var TriangleAlert = createLucideIcon("triangle-alert", __iconNode10);

// node_modules/lucide-react/dist/esm/icons/x.js
var __iconNode11 = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
var X = createLucideIcon("x", __iconNode11);
// apps/frontend/src/mycomponents/support/Shell.tsx
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
"use client";
function ThreePane({ index, main, aside }) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
    className: "flex min-h-0 flex-1 flex-col lg:flex-row",
    "data-support-panes": "",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "flex min-h-0 flex-col border-b border-zinc-200 lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[352px]",
        children: index
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
        children: main
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "hidden min-h-0 flex-col border-zinc-200 lg:flex lg:w-[380px] lg:shrink-0 lg:border-l xl:w-[430px]",
        children: aside
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Section({
  title,
  description,
  actions,
  children,
  id
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("section", {
    "aria-labelledby": id ? `${id}-heading` : undefined,
    className: "border-b border-zinc-100 px-4 py-4",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "flex items-start gap-3",
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
            className: "min-w-0 flex-1",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV("h3", {
                id: id ? `${id}-heading` : undefined,
                className: "text-[13px] font-semibold tracking-tight text-zinc-900",
                children: title
              }, undefined, false, undefined, this),
              description ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV("p", {
                className: "mt-0.5 text-xs text-zinc-500",
                children: description
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          actions ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
            className: "shrink-0",
            children: actions
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "mt-3",
        children
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Fact({ label, value, mono }) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
    className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("dt", {
        className: "shrink-0 text-xs text-zinc-500",
        children: label
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("dd", {
        className: `min-w-0 text-right text-xs font-medium break-words text-zinc-800 ${mono ? "font-mono tabular-nums" : ""}`,
        children: value
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Chip({ children, tone = "neutral" }) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("span", {
    className: `inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${tone === "accent" ? "bg-[#FF4F00]/10 text-[#b33800]" : "bg-zinc-100 text-zinc-600"}`,
    children
  }, undefined, false, undefined, this);
}
function PaneNotice({
  icon: Icon2,
  title,
  detail,
  action,
  tone = "muted"
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
    role: tone === "alert" ? "alert" : "status",
    className: `flex items-start gap-3 px-4 py-4 text-sm ${tone === "alert" ? "bg-amber-50 text-amber-900" : "text-zinc-600"}`,
    children: [
      Icon2 ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Icon2, {
        "aria-hidden": true,
        className: "mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
      }, undefined, false, undefined, this) : null,
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
        className: "min-w-0",
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV("p", {
            className: "font-medium text-zinc-800",
            children: title
          }, undefined, false, undefined, this),
          detail ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV("p", {
            className: "mt-0.5 text-xs text-zinc-600",
            children: detail
          }, undefined, false, undefined, this) : null,
          action ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV("div", {
            className: "mt-2",
            children: action
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function PaneLoading({ label }) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("p", {
    role: "status",
    className: "flex items-center gap-2 px-4 py-4 text-xs text-zinc-500",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV("span", {
        "aria-hidden": true,
        className: "h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF4F00]"
      }, undefined, false, undefined, this),
      label
    ]
  }, undefined, true, undefined, this);
}
function BackToIndex({ onClick }) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV("button", {
    type: "button",
    onClick,
    className: "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 lg:hidden",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ChevronLeft, {
        "aria-hidden": true,
        className: "h-3.5 w-3.5"
      }, undefined, false, undefined, this),
      " Cases"
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/mycomponents/support/Marks.tsx
var jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
var TONES = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  waiting: "bg-amber-50 text-amber-800 ring-amber-200",
  submitted: "bg-sky-50 text-sky-800 ring-sky-200",
  engineering: "bg-violet-50 text-violet-700 ring-violet-200",
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  denied: "bg-red-50 text-red-700 ring-red-200",
  active: "bg-[#FF4F00]/10 text-[#b33800] ring-[#FF4F00]/30"
};
function StatusMark({ label, tone = "neutral" }) {
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV("span", {
    className: `inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TONES[tone]}`,
    children: label
  }, undefined, false, undefined, this);
}
function ReasonList({ reasons, empty }) {
  if (reasons.length === 0)
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV("p", {
      className: "text-xs text-zinc-500",
      children: empty ?? "No policy reason was reported."
    }, undefined, false, undefined, this);
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV("ul", {
    className: "flex flex-wrap gap-1",
    children: reasons.map((reason) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV("li", {
      children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV("code", {
        className: "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700",
        children: reason
      }, undefined, false, undefined, this)
    }, reason, false, undefined, this))
  }, undefined, false, undefined, this);
}

// apps/frontend/src/lib/support-copy.ts
var CODE_WORDS = { http_429: "HTTP 429" };
function humanizeCode(code) {
  return code.split("_").map((part) => CODE_WORDS[part] ?? part).join(" ").replace(/^./, (c) => c.toUpperCase());
}
function stageLabel(stage) {
  return stage === 0 ? "Trigger" : `Action ${stage}`;
}
function providerOutcomeLabel(outcome) {
  if (!outcome)
    return "No provider outcome recorded";
  const labels = {
    accepted: "Provider accepted the request (delivery is not confirmed)",
    rejected: "Provider rejected the request",
    not_attempted: "Provider was never called",
    unknown: "Provider outcome unknown"
  };
  return labels[outcome] ?? `${humanizeCode(outcome)} (recorded provider outcome)`;
}
function sourceLabel(source) {
  if (source === "reconciled_execution")
    return "Reconciled execution";
  if (source === "retry_row")
    return "Failure row";
  return "Evidence source not recorded";
}
function caseSummary(caseItem) {
  const parts = [stageLabel(caseItem.stage)];
  if (caseItem.safe_code)
    parts.push(caseItem.safe_code);
  else if (caseItem.provider_outcome)
    parts.push(caseItem.provider_outcome);
  else
    parts.push("no provider outcome");
  return parts.join(" \xB7 ");
}
var QUEUE_COPY = {
  support: { label: "With support", tone: "neutral" },
  owner: { label: "Needs owner fix", tone: "waiting" },
  engineering: { label: "With engineering", tone: "engineering" },
  resolved: { label: "Resolved", tone: "accepted" }
};
var STATUS_COPY = {
  needing_support: { label: "With support", tone: "neutral" },
  awaiting_owner: { label: "Needs owner fix", tone: "waiting" },
  repair_submitted: { label: "Repair awaiting review", tone: "submitted" },
  escalated: { label: "With engineering", tone: "engineering" },
  findings_returned: { label: "Findings returned", tone: "waiting" },
  resolved: { label: "Resolved", tone: "accepted" }
};
function workflowMark(status, queue) {
  return STATUS_COPY[status ?? ""] ?? QUEUE_COPY[queue ?? ""] ?? { label: status ? humanizeCode(status) : "Responsibility not recorded", tone: "neutral" };
}
function ownerWorkflowMark(status) {
  const marks = {
    needing_support: { label: "With support", tone: "neutral" },
    awaiting_owner: { label: "Needs your fix", tone: "waiting" },
    repair_submitted: { label: "Submitted", tone: "submitted" },
    escalated: { label: "With engineering", tone: "engineering" },
    findings_returned: { label: "Under review", tone: "waiting" },
    resolved: { label: "Resolved", tone: "accepted" }
  };
  return marks[status ?? ""] ?? { label: status ? humanizeCode(status) : "Not started", tone: "neutral" };
}
function publicationMark(publication) {
  if (publication === "published")
    return { label: "Published to the queue", tone: "submitted" };
  if (publication === "queued")
    return { label: "Queued, publication not confirmed", tone: "waiting" };
  return { label: "No publication recorded", tone: "neutral" };
}
var EXECUTION_LABELS = {
  PENDING: "Pending",
  RESERVED: "Reserved by the worker",
  RUNNING: "Running",
  SUCCESS: "Succeeded",
  FAILED: "Failed",
  UNKNOWN: "Unknown and terminal"
};
function executionMark(execution) {
  const label = EXECUTION_LABELS[execution ?? ""];
  if (!label)
    return { label: "No execution recorded", tone: "neutral" };
  const tone = execution === "SUCCESS" ? "accepted" : execution === "FAILED" || execution === "UNKNOWN" ? "denied" : execution === "RUNNING" ? "active" : "waiting";
  return { label, tone };
}
function ageLabel(observedAt, now = Date.now()) {
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed))
    return "time not recorded";
  const minutes = Math.max(0, Math.floor((now - observed) / 60000));
  if (minutes < 1)
    return "just now";
  if (minutes < 60)
    return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
function timestampLabel(value) {
  if (!value)
    return "not recorded";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "not recorded";
}

// apps/frontend/src/mycomponents/support/CaseFile.tsx
var jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
function CaseFile({
  identity,
  context,
  activity,
  work,
  aside,
  onBack,
  onOpenEvidence
}) {
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("article", {
    className: "pb-16",
    "data-case-file": "",
    children: [
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("header", {
        className: "border-b border-zinc-200 px-4 py-4",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("div", {
            className: "flex items-start gap-3",
            children: [
              onBack ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(BackToIndex, {
                onClick: onBack
              }, undefined, false, undefined, this) : null,
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("div", {
                className: "min-w-0 flex-1",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("h1", {
                    className: "truncate text-lg font-semibold tracking-tight text-zinc-900",
                    title: identity.title,
                    children: identity.title
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("p", {
                    className: "mt-0.5 text-xs text-zinc-500",
                    children: identity.subtitle
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("div", {
                className: "flex shrink-0 items-center gap-2",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(StatusMark, {
                    label: identity.status,
                    tone: identity.tone
                  }, undefined, false, undefined, this),
                  onOpenEvidence ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("button", {
                    type: "button",
                    onClick: onOpenEvidence,
                    className: "rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 lg:hidden",
                    children: "Evidence"
                  }, undefined, false, undefined, this) : null
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          aside ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("div", {
            className: "mt-3",
            children: aside
          }, undefined, false, undefined, this) : null,
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV("dl", {
            className: "mt-3 grid gap-x-6 sm:grid-cols-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Stage",
                value: identity.stage === 0 ? "Trigger" : `Action ${identity.stage}`
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Age",
                value: `${ageLabel(identity.observedAt)} \xB7 ${timestampLabel(identity.observedAt)}`
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Provider outcome",
                value: providerOutcomeLabel(identity.providerOutcome)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Evidence source",
                value: sourceLabel(identity.source)
              }, undefined, false, undefined, this),
              identity.ownerLabel ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Subject owner",
                value: identity.ownerLabel,
                mono: true
              }, undefined, false, undefined, this) : null,
              identity.safeCode ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Safe code",
                value: identity.safeCode,
                mono: true
              }, undefined, false, undefined, this) : null,
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Case",
                value: identity.caseId,
                mono: true
              }, undefined, false, undefined, this),
              identity.zapRunId ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Fact, {
                label: "Zap run",
                value: identity.zapRunId,
                mono: true
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      context,
      work,
      activity
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/mycomponents/support/EvidenceRoom.tsx
var import_react3 = __toESM(require_react(), 1);
var jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
var TABS = [
  { id: "observed", label: "Observed", icon: FileSearch },
  { id: "execution", label: "Execution", icon: ListTree },
  { id: "inputs", label: "Inputs", icon: ShieldAlert },
  { id: "runbooks", label: "Runbooks", icon: BookOpen }
];
function EvidenceRoom({
  caseId,
  state,
  onReload,
  onClose,
  saved,
  diagnosis,
  initialTab = "observed"
}) {
  const [tab, setTab] = import_react3.useState(initialTab);
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
    className: "flex min-h-0 flex-1 flex-col bg-white",
    "data-evidence-room": "",
    children: [
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
        className: "flex h-12 shrink-0 items-center gap-1 border-b border-zinc-200 px-2",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
            role: "tablist",
            "aria-label": "Case evidence",
            className: "flex min-w-0 flex-1 items-center gap-0.5",
            children: TABS.map(({ id, label, icon: Icon2 }) => {
              const active = tab === id;
              return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("button", {
                role: "tab",
                type: "button",
                id: `evidence-tab-${id}`,
                "aria-selected": active,
                "aria-controls": `evidence-panel-${id}`,
                tabIndex: active ? 0 : -1,
                onClick: () => setTab(id),
                onKeyDown: (event) => {
                  const index = TABS.findIndex((entry) => entry.id === tab);
                  const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length : -1;
                  if (next < 0)
                    return;
                  event.preventDefault();
                  setTab(TABS[next].id);
                  document.getElementById(`evidence-tab-${TABS[next].id}`)?.focus();
                },
                className: `flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"}`,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Icon2, {
                    "aria-hidden": true,
                    className: "h-3.5 w-3.5 shrink-0"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                    className: "truncate",
                    children: label
                  }, undefined, false, undefined, this)
                ]
              }, id, true, undefined, this);
            })
          }, undefined, false, undefined, this),
          onClose ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("button", {
            type: "button",
            onClick: onClose,
            className: "shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",
            children: [
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(X, {
                "aria-hidden": true,
                className: "h-4 w-4"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                className: "sr-only",
                children: "Close evidence"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
        role: "tabpanel",
        id: `evidence-panel-${tab}`,
        "aria-labelledby": `evidence-tab-${tab}`,
        tabIndex: 0,
        className: "min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF4F00]",
        children: !caseId ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneNotice, {
          icon: FileSearch,
          title: "No case selected",
          detail: "Select a case to read its failure, attempt ledger and input validation."
        }, undefined, false, undefined, this) : state.kind === "idle" || state.kind === "loading" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneLoading, {
          label: "Reading case evidence\u2026"
        }, undefined, false, undefined, this) : state.kind === "denied" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneNotice, {
          tone: "alert",
          icon: TriangleAlert,
          title: "Evidence access denied",
          detail: `${state.message} Reloading will not change this; the permission is checked on every read.`
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(jsx_dev_runtime4.Fragment, {
          children: [
            state.evidence.failureContext.unavailable.length || state.evidence.execution.unavailable.length || state.evidence.validation.unavailable.length ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
              className: "border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900",
              children: [
                "Some evidence could not be read:",
                " ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                  className: "font-mono",
                  children: [...new Set([
                    ...state.evidence.failureContext.unavailable,
                    ...state.evidence.execution.unavailable,
                    ...state.evidence.validation.unavailable
                  ])].join(", ")
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this) : null,
            tab === "observed" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ObservedTab, {
              state
            }, undefined, false, undefined, this) : null,
            tab === "execution" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ExecutionTab, {
              state
            }, undefined, false, undefined, this) : null,
            tab === "inputs" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(InputsTab, {
              state
            }, undefined, false, undefined, this) : null,
            tab === "runbooks" ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(RunbooksTab, {
              saved,
              diagnosis,
              caseId
            }, undefined, false, undefined, this) : null,
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
              className: "flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-zinc-500",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                  children: state.evidence.failureContext.data?.content_hash ? `Content hash ${state.evidence.failureContext.data.content_hash.slice(0, 12)}\u2026` : "No content hash was recorded."
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("button", {
                  type: "button",
                  onClick: onReload,
                  className: "font-medium text-zinc-600 underline underline-offset-2",
                  children: "Re-read evidence"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function ObservedTab({ state }) {
  const envelope = state.evidence.failureContext;
  if (!envelope.data)
    return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneNotice, {
      icon: TriangleAlert,
      title: "Failure evidence unavailable",
      detail: `The failure context could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). No observed facts are shown rather than an inferred version of them.`
    }, undefined, false, undefined, this);
  const { facts } = envelope.data;
  const columns = [
    ["Source", sourceLabel(facts.source_kind)],
    ["Step handler", facts.current_action_type ?? "not recorded"],
    ["Provider", facts.retry.provider ?? "not recorded"],
    ["Stage phase", facts.retry.phase ?? "not recorded"],
    ["Provider outcome", providerOutcomeLabel(facts.retry.provider_outcome)],
    ["Provider status", facts.retry.provider_status ? String(facts.retry.provider_status) : "not recorded"],
    ["Safe code", facts.retry.safe_code ?? "not recorded"],
    ["Retry after", facts.retry.retry_after_seconds ? `${facts.retry.retry_after_seconds}s` : "not recorded"],
    ["Needs a human", facts.retry.requires_human ? "yes" : "no"],
    ["Observed", timestampLabel(envelope.data.observed_at)]
  ];
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(jsx_dev_runtime4.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Observed facts",
        description: "Read from the stored failure evidence. Nothing here is model output.",
        id: "observed-facts",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dl", {
            children: columns.map(([label, value]) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
              className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dt", {
                  className: "shrink-0 text-xs text-zinc-500",
                  children: label
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dd", {
                  className: "min-w-0 text-right text-xs font-medium break-words text-zinc-800",
                  children: value
                }, undefined, false, undefined, this)
              ]
            }, label, true, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-[11px] text-zinc-500",
            children: envelope.data.complete ? "The evidence contract reports this capture as complete." : "The evidence contract reports this capture as incomplete; the missing facts are named below."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      facts.retry.final_error ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Recorded final error",
        description: "The bounded error the worker stored.",
        children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "rounded-md bg-zinc-50 p-2.5 font-mono text-[11px] break-words text-zinc-700",
          children: facts.retry.final_error
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this) : null,
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Captured structure",
        description: "Field paths and types, never raw values.",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
            className: "flex flex-wrap items-center gap-1.5",
            children: [
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
                children: [
                  "action metadata ",
                  facts.action_metadata.paths.length
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
                children: [
                  "payload ",
                  facts.payload.paths.length
                ]
              }, undefined, true, undefined, this),
              facts.action_metadata.truncated || facts.payload.truncated ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
                tone: "accent",
                children: "truncated"
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          facts.action_metadata.paths.length + facts.payload.paths.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-xs text-zinc-500",
            children: "No structure paths were captured for this case."
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
            className: "mt-2 space-y-1",
            children: [...facts.action_metadata.paths, ...facts.payload.paths].slice(0, 24).map((entry, index) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
              className: "flex items-baseline justify-between gap-3 text-[11px]",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
                  className: "truncate font-mono text-zinc-700",
                  children: entry.path
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                  className: "shrink-0 text-zinc-400",
                  children: entry.type
                }, undefined, false, undefined, this)
              ]
            }, `${entry.path}-${index}`, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function ExecutionTab({ state }) {
  const envelope = state.evidence.execution;
  if (!envelope.data)
    return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneNotice, {
      icon: TriangleAlert,
      title: "Execution evidence unavailable",
      detail: `The attempt ledger could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). A missing ledger is not evidence that nothing ran.`
    }, undefined, false, undefined, this);
  const { facts } = envelope.data;
  const current = facts.current_execution;
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(jsx_dev_runtime4.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Current execution",
        description: "The attempt the worker is holding for this case.",
        actions: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
          tone: facts.provenance === "captured" ? "accent" : "neutral",
          children: facts.provenance.replace("_", " ")
        }, undefined, false, undefined, this),
        id: "current-execution",
        children: current ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dl", {
          children: [
            ["Status", current.status],
            ["Provider outcome", providerOutcomeLabel(current.provider_outcome)],
            ["Lease until", timestampLabel(current.lease_until)],
            ["Completed", timestampLabel(current.completed_at)],
            ["Needs a human", current.requires_human ? "yes" : "no"]
          ].map(([label, value]) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
            className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0",
            children: [
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dt", {
                className: "shrink-0 text-xs text-zinc-500",
                children: label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dd", {
                className: "min-w-0 text-right text-xs font-medium break-words text-zinc-800",
                children: value
              }, undefined, false, undefined, this)
            ]
          }, label, true, undefined, this))
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: "No execution row is recorded for this case. It was reported from a retry row instead."
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Attempt ledger",
        description: "Every recorded attempt, oldest first, with its own provider result.",
        actions: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
          children: facts.attempts.length
        }, undefined, false, undefined, this),
        id: "attempt-ledger",
        children: [
          facts.attempts.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "text-xs text-zinc-500",
            children: "No attempts were recorded for this case."
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ol", {
            className: "space-y-2",
            children: facts.attempts.map((attempt) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
              className: "rounded-md border border-zinc-200 p-2.5",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
                  className: "flex items-baseline justify-between gap-2",
                  children: [
                    /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                      className: "text-xs font-semibold text-zinc-900",
                      children: [
                        "Attempt ",
                        attempt.attempt_number
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                      className: "font-mono text-[11px] text-zinc-500",
                      children: attempt.provenance.replace("_", " ")
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                  className: "mt-1 text-xs text-zinc-700",
                  children: providerOutcomeLabel(attempt.provider_outcome)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                  className: "mt-1 text-[11px] text-zinc-500",
                  children: [
                    humanizeCode(attempt.status),
                    attempt.phase ? ` \xB7 phase ${attempt.phase}` : "",
                    attempt.provider_status ? ` \xB7 HTTP ${attempt.provider_status}` : "",
                    attempt.safe_code ? ` \xB7 ${attempt.safe_code}` : "",
                    attempt.retry_after_seconds ? ` \xB7 retry after ${attempt.retry_after_seconds}s` : ""
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                  className: "mt-0.5 text-[11px] text-zinc-400",
                  children: [
                    timestampLabel(attempt.started_at),
                    " \u2192 ",
                    timestampLabel(attempt.completed_at)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, `${attempt.attempt_number}-${attempt.started_at ?? "unknown"}`, true, undefined, this))
          }, undefined, false, undefined, this),
          facts.history_truncated ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-[11px] text-amber-800",
            children: [
              "The ledger is partial: at most ",
              facts.history_limit,
              " attempts are returned."
            ]
          }, undefined, true, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Order and predecessors",
        description: "Whether the earlier stages actually completed first.",
        id: "ordering",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "text-xs text-zinc-700",
            children: [
              "Ordering is ",
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                className: "font-semibold",
                children: facts.ordering.status
              }, undefined, false, undefined, this),
              facts.ordering.status === "invalid" ? ` \xB7 missing predecessor stages ${facts.ordering.missing_predecessor_stages.join(", ") || "unnamed"}` : ""
            ]
          }, undefined, true, undefined, this),
          facts.predecessors.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-xs text-zinc-500",
            children: "No predecessor executions are recorded."
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
            className: "mt-2 space-y-1",
            children: facts.predecessors.map((entry) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
              className: "flex items-baseline justify-between gap-3 text-[11px]",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                  className: "text-zinc-700",
                  children: [
                    "Stage ",
                    entry.stage
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                  className: "text-zinc-500",
                  children: [
                    humanizeCode(entry.status),
                    entry.provider_outcome ? ` \xB7 ${entry.provider_outcome}` : "",
                    " \xB7 ",
                    timestampLabel(entry.completed_at)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, entry.stage, true, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function InputsTab({ state }) {
  const envelope = state.evidence.validation;
  if (!envelope.data)
    return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(PaneNotice, {
      icon: TriangleAlert,
      title: "Input validation unavailable",
      detail: `The dry-run validator could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). Missing-field claims are not shown without it.`
    }, undefined, false, undefined, this);
  const { facts } = envelope.data;
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(jsx_dev_runtime4.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Validation result",
        description: "What the dry-run validator observed, using the same rules the worker applies.",
        actions: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Chip, {
          tone: facts.validation_status === "valid" ? "neutral" : "accent",
          children: facts.validation_status
        }, undefined, false, undefined, this),
        id: "validation-result",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dl", {
            children: [
              ["Action type", facts.action_type ?? "not recorded"],
              ["Handler supported", facts.supported ? "yes" : "no"],
              ["Observed", timestampLabel(envelope.data.observed_at)]
            ].map(([label, value]) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("div", {
              className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0",
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dt", {
                  className: "shrink-0 text-xs text-zinc-500",
                  children: label
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("dd", {
                  className: "min-w-0 text-right text-xs font-medium break-words text-zinc-800",
                  children: value
                }, undefined, false, undefined, this)
              ]
            }, label, true, undefined, this))
          }, undefined, false, undefined, this),
          !facts.supported ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-xs text-amber-800",
            children: "This step handler is not supported by the repair editor, so a missing-field repair cannot be offered."
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Missing required fields",
        description: "Exact field names, not paraphrases.",
        id: "missing-fields",
        children: facts.missing_required_fields.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: "No required field was reported missing."
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
          className: "flex flex-wrap gap-1",
          children: facts.missing_required_fields.map((field) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
            children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
              className: "rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200",
              children: field
            }, undefined, false, undefined, this)
          }, field, false, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      facts.invalid_field_types.length || facts.missing_template_paths.length ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Type and template problems",
        id: "type-problems",
        children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
          className: "space-y-1 text-xs text-zinc-700",
          children: [
            facts.invalid_field_types.map((entry) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
              children: [
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
                  className: "font-mono",
                  children: entry.field
                }, undefined, false, undefined, this),
                " expected ",
                entry.expected,
                ", received ",
                entry.actual
              ]
            }, `type-${entry.field}`, true, undefined, this)),
            facts.missing_template_paths.map((path) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
              children: [
                "Template path ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
                  className: "font-mono",
                  children: path
                }, undefined, false, undefined, this),
                " resolved to nothing"
              ]
            }, `template-${path}`, true, undefined, this))
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this) : null,
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Credentials",
        description: "Presence only. Values never reach this view.",
        id: "credentials",
        children: facts.credential_presence.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: "No credential field was inspected for this step."
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
          className: "space-y-1",
          children: facts.credential_presence.map((entry) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
            className: "flex items-baseline justify-between gap-3 text-xs",
            children: [
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
                className: "font-mono text-zinc-700",
                children: entry.field
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("span", {
                className: entry.present ? "text-zinc-600" : "font-medium text-amber-800",
                children: [
                  entry.present ? "present" : "absent",
                  " \xB7 ",
                  entry.source.replaceAll("_", " ")
                ]
              }, undefined, true, undefined, this)
            ]
          }, entry.field, true, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Blocked reasons",
        description: "Why the validator refused the inputs.",
        id: "blocked-reasons",
        children: [
          /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ReasonList, {
            reasons: facts.blocked_reasons,
            empty: "No blocking reason was reported."
          }, undefined, false, undefined, this),
          facts.input_fingerprint ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
            className: "mt-2 text-[11px] text-zinc-500",
            children: [
              "Input fingerprint ",
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
                className: "font-mono",
                children: [
                  facts.input_fingerprint.slice(0, 16),
                  "\u2026"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this) : null
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function RunbooksTab({
  saved,
  diagnosis,
  caseId
}) {
  const citations = diagnosis?.proposal.runbook_citations ?? [];
  const history = saved?.authority?.replayHistory ?? [];
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(jsx_dev_runtime4.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Cited runbook excerpts",
        description: "Versioned sections the advisory diagnosis retrieved. A citation is a reference, not a guarantee.",
        id: "citations",
        children: citations.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: "No runbook section is cited yet. Run an investigation for this case to retrieve the current guidance."
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ul", {
          className: "space-y-1.5",
          children: citations.map((citation) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
            children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("code", {
              className: "block rounded-md bg-zinc-50 p-2 font-mono text-[11px] break-words text-zinc-700",
              children: citation
            }, undefined, false, undefined, this)
          }, citation, false, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Missing evidence reported by the diagnosis",
        description: "What the diagnosis could not see. Absence is reported, never filled in.",
        id: "missing-evidence",
        children: !diagnosis || diagnosis.diagnosis.missing_evidence.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: diagnosis ? "The diagnosis reported no missing evidence." : "No diagnosis has been produced yet."
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ReasonList, {
          reasons: diagnosis.diagnosis.missing_evidence
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Section, {
        title: "Replay requests for this case",
        description: "Across every investigation, with the proposal that authorized each request.",
        id: "evidence-replay-history",
        children: history.length === 0 ? /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
          className: "text-xs text-zinc-500",
          children: [
            "No replay request has been recorded for case ",
            caseId,
            "."
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("ol", {
          className: "space-y-2",
          children: history.map((item) => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("li", {
            className: "rounded-md border border-zinc-200 p-2.5 text-[11px]",
            children: [
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                className: "font-medium text-zinc-800",
                children: [
                  item.publication === "published" ? "Published" : "Queued",
                  " \xB7 ",
                  item.execution,
                  " \xB7 provider",
                  " ",
                  item.outcome
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                className: "mt-1 text-zinc-500",
                children: [
                  "Requested by operator ",
                  item.requestedBy,
                  " \xB7 approved by ",
                  item.approvedBy,
                  " \xB7",
                  " ",
                  timestampLabel(item.createdAt)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime4.jsxDEV("p", {
                className: "mt-0.5 font-mono break-all text-zinc-400",
                children: [
                  "proposal ",
                  item.proposalId,
                  " v",
                  item.proposalVersion,
                  " \xB7 investigation ",
                  item.investigationId
                ]
              }, undefined, true, undefined, this)
            ]
          }, item.requestId, true, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/mycomponents/support/ReplayLedger.tsx
var import_react4 = __toESM(require_react(), 1);
var jsx_dev_runtime5 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
var decisionLabels = {
  approve: "Approve",
  reject: "Reject",
  mark_owner_action_required: "Owner action required",
  escalate_to_engineering: "Escalate to engineering",
  resolve_without_replay: "Resolve without replay"
};
function ReplayLedger({
  saved,
  capabilities,
  pending,
  replayAction,
  onDecision,
  onDryRun,
  onRequestReplay
}) {
  const authority = saved.authority;
  const [now, setNow] = import_react4.useState(() => Date.now());
  const expiresAt = authority?.expiresAt;
  import_react4.useEffect(() => {
    if (!expiresAt)
      return;
    const delay = Math.max(0, Date.parse(expiresAt) - Date.now()) + 1;
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const expired = authority ? Date.parse(authority.expiresAt) <= now : false;
  const busy = pending || replayAction?.pending === true;
  const eligibility = authority?.eligibility;
  const decision = authority?.decision ?? null;
  const replay = authority?.replay ?? null;
  const intentOff = capabilities?.replayIntent === false;
  return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(jsx_dev_runtime5.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
        title: "Replay ledger",
        description: "Four separate facts in order. Each one is recorded independently.",
        id: "replay-ledger",
        actions: expired ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(StatusMark, {
          label: "Proposal expired",
          tone: "denied"
        }, undefined, false, undefined, this) : null,
        children: [
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("ol", {
            className: "space-y-1.5",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(LedgerRow, {
                index: 1,
                stage: "Policy eligibility",
                mark: eligibility ? eligibility.status === "eligible" ? { label: "eligible", tone: "submitted" } : eligibility.status === "blocked" ? { label: "blocked", tone: "denied" } : { label: eligibility.status, tone: "neutral" } : { label: "not reported", tone: "neutral" },
                detail: eligibility ? `Policy: ${eligibility.status === "eligible" ? "eligible for operator review" : eligibility.status}${eligibility.notBefore ? ` \xB7 cooldown ends ${timestampLabel(eligibility.notBefore)}` : ""}` : "The investigation snapshot did not report application eligibility."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(LedgerRow, {
                index: 2,
                stage: "Operator approval",
                mark: decision ? { label: decisionLabels[decision.decision], tone: "submitted" } : expired ? { label: "expired", tone: "denied" } : { label: "not recorded", tone: "neutral" },
                detail: decision ? `Approved by operator: ${decision.approvedBy}. Approval is recorded but no replay is dispatched yet.` : "No decision is committed on this proposal."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(LedgerRow, {
                index: 3,
                stage: "Request publication",
                mark: replay ? { label: publicationMark(replay.publication).label, tone: publicationMark(replay.publication).tone } : { label: "no request", tone: "neutral" },
                detail: replay ? `Publication: ${replay.publication}${replay.publication === "queued" ? " (publication not confirmed)" : ""}` : "No replay request exists for this investigation. An approved decision alone is not execution."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(LedgerRow, {
                index: 4,
                stage: "Worker execution",
                mark: replay ? { label: executionMark(replay.execution).label, tone: executionMark(replay.execution).tone } : { label: "not requested", tone: "neutral" },
                detail: replay ? `Execution: ${replay.execution}${replay.execution === "UNKNOWN" ? " \xB7 No resend. Delivery is unknown and terminal." : replay.execution === "SUCCESS" ? " \xB7 The provider accepted the request; end-user delivery is still not confirmed." : replay.execution === "RUNNING" ? " \xB7 The worker is executing this replay now." : ""}` : "Publication does not prove execution success."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          eligibility ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "mt-3 text-xs text-zinc-600",
            children: eligibility.candidateGrounded ? "The advisory candidate is grounded in captured evidence." : "The advisory candidate is not grounded; diagnosis confidence does not grant eligibility."
          }, undefined, false, undefined, this) : null,
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "mt-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
                className: "mb-1 text-[11px] font-medium text-zinc-500",
                children: "Policy reasons for this proposal"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("ul", {
                className: "flex flex-wrap gap-1",
                children: [
                  [...new Set([...eligibility?.reasons ?? [], ...authority?.reasons ?? []])].map((reason) => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("li", {
                    children: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("code", {
                      className: "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700",
                      children: reason
                    }, undefined, false, undefined, this)
                  }, reason, false, undefined, this)),
                  [...new Set([...eligibility?.reasons ?? [], ...authority?.reasons ?? []])].length === 0 ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("li", {
                    className: "text-xs text-zinc-500",
                    children: "No blocking policy reason was reported."
                  }, undefined, false, undefined, this) : null
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
        title: "Support decision",
        description: "Decisions are committed against this proposal version and expire with it.",
        id: "support-decision",
        actions: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Chip, {
          children: `proposal v${authority?.version ?? 0}`
        }, undefined, false, undefined, this),
        children: [
          expired ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            role: "alert",
            className: "mb-2 text-xs font-medium text-red-700",
            children: "This proposal expired. Start a new investigation for the case."
          }, undefined, false, undefined, this) : null,
          decision ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "text-xs text-zinc-700",
            children: [
              "Committed decision: ",
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
                className: "font-semibold",
                children: decisionLabels[decision.decision]
              }, undefined, false, undefined, this),
              " \xB7 operator",
              " ",
              decision.approvedBy
            ]
          }, undefined, true, undefined, this) : authority && authority.allowedDecisions.length === 0 ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "text-xs text-zinc-600",
            children: "Decision controls are blocked by backend policy. The reasons above are the current denials."
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex flex-wrap gap-2",
            children: (authority?.allowedDecisions ?? []).map((choice) => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("button", {
              type: "button",
              disabled: pending || expired,
              onClick: () => onDecision(choice),
              className: "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]",
              children: decisionLabels[choice]
            }, choice, false, undefined, this))
          }, undefined, false, undefined, this),
          pending ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            role: "status",
            className: "mt-2 text-xs text-zinc-600",
            children: "Saving decision\u2026 controls are blocked while this request is pending."
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
        title: "Request a replay",
        description: "A fresh dry run review is required after approval. The request revalidates policy immediately before it commits.",
        id: "request-replay",
        children: [
          !decision ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "text-xs text-zinc-600",
            children: "An approval is required before a replay can be requested. Approval alone does not dispatch."
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("button", {
                type: "button",
                disabled: busy || expired || intentOff,
                onClick: onDryRun,
                className: "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]",
                children: "Run dry run review"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("button", {
                type: "button",
                disabled: busy || expired || intentOff,
                onClick: onRequestReplay,
                className: "rounded-lg bg-[#FF4F00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e64700] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]",
                children: "Request replay"
              }, undefined, false, undefined, this),
              intentOff ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
                className: "text-[11px] text-zinc-500",
                children: "Replay intent is disabled by the server for this deployment."
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          replayAction?.pending ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            role: "status",
            className: "mt-2 text-xs text-zinc-600",
            children: [
              "Replay ",
              replayAction.kind === "dry-run" ? "dry run" : "request",
              " in progress\u2026 actions are blocked while this request is pending."
            ]
          }, undefined, true, undefined, this) : null,
          replayAction && !replayAction.pending ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            role: "status",
            "data-replay-action": replayAction.kind,
            className: "mt-2 text-xs text-zinc-700",
            children: replayAction.message
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      authority ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ReplayHistory, {
        items: authority.replayHistory
      }, undefined, false, undefined, this) : null
    ]
  }, undefined, true, undefined, this);
}
function LedgerRow({
  index,
  stage,
  mark,
  detail
}) {
  return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("li", {
    className: "flex gap-3 rounded-md border border-zinc-200 px-3 py-2",
    children: [
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
        "aria-hidden": true,
        className: "mt-0.5 w-3 shrink-0 text-[11px] font-semibold tabular-nums text-zinc-400",
        children: index
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
        className: "min-w-0 flex-1",
        children: [
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex flex-wrap items-center justify-between gap-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
                className: "text-xs font-semibold text-zinc-900",
                children: stage
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(StatusMark, {
                label: mark.label,
                tone: mark.tone
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "mt-0.5 text-[11px] break-words text-zinc-600",
            children: detail
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function ReplayHistory({ items }) {
  return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
    title: "Replay request history",
    description: "Every request recorded for this case, in any investigation.",
    actions: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Chip, {
      children: items.length
    }, undefined, false, undefined, this),
    id: "replay-history",
    children: items.length === 0 ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
      className: "text-xs text-zinc-500",
      children: "No replay request has been recorded for this case in any investigation."
    }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("ol", {
      className: "space-y-2",
      children: items.map((item) => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("li", {
        className: "rounded-md border border-zinc-200 p-2.5 text-[11px]",
        children: [
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex flex-wrap items-center justify-between gap-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
                className: "font-medium text-zinc-800",
                children: [
                  "Publication: ",
                  item.publication,
                  " \xB7 Execution: ",
                  item.execution
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("span", {
                className: "text-zinc-500",
                children: [
                  "Provider outcome: ",
                  item.outcome
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "mt-1 text-zinc-500",
            children: [
              "Requested by operator ",
              item.requestedBy,
              " \xB7 approved by ",
              item.approvedBy,
              " \xB7 ",
              timestampLabel(item.createdAt),
              item.completedAt ? ` \u2192 ${timestampLabel(item.completedAt)}` : ""
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "mt-0.5 font-mono break-all text-zinc-400",
            children: [
              "authorized by proposal ",
              item.proposalId,
              " (v",
              item.proposalVersion,
              ") \xB7 investigation ",
              item.investigationId
            ]
          }, undefined, true, undefined, this)
        ]
      }, item.requestId, true, undefined, this))
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function CapabilitySummary({ capabilities }) {
  if (!capabilities)
    return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
      title: "Server capability",
      id: "capability",
      children: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
        className: "text-xs text-zinc-600",
        children: "Replay capability is unavailable from the server. No replay action is offered until it responds."
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  const states = [
    ["Investigation", capabilities.investigation],
    ["Replay intent", capabilities.replayIntent],
    ["Replay execution", capabilities.replayExecution]
  ];
  return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Section, {
    title: "Server capability",
    description: "Reported by the backend on every load.",
    id: "capability",
    children: [
      /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("dl", {
        children: [
          states.map(([label, enabled]) => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("dt", {
                className: "text-xs text-zinc-500",
                children: label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("dd", {
                className: "text-xs font-medium text-zinc-800",
                children: enabled ? "enabled" : "disabled"
              }, undefined, false, undefined, this)
            ]
          }, label, true, undefined, this)),
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
            className: "flex items-baseline justify-between gap-3 py-1.5",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("dt", {
                className: "text-xs text-zinc-500",
                children: "Release ready"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("dd", {
                className: "text-xs font-medium text-zinc-800",
                children: [
                  capabilities.releaseReady ? "yes" : "no",
                  capabilities.labProfile ? ` \xB7 verified lab profile ${capabilities.labProfile}` : ""
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      capabilities.reasons.length ? /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("div", {
        className: "mt-2",
        children: [
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("p", {
            className: "mb-1 text-[11px] font-medium text-zinc-500",
            children: "Capability reasons"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("ul", {
            className: "flex flex-wrap gap-1",
            children: capabilities.reasons.map((reason) => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("li", {
              children: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV("code", {
                className: "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700",
                children: reason
              }, undefined, false, undefined, this)
            }, reason, false, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this) : null
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/mycomponents/support/TicketIndex.tsx
var import_react5 = __toESM(require_react(), 1);

// apps/frontend/src/lib/support-selection.ts
function moveFocus(nav, move) {
  if (nav.count <= 0)
    return 0;
  const last = nav.count - 1;
  const current = Math.min(Math.max(nav.focusedIndex, 0), last);
  if (move === "first")
    return 0;
  if (move === "last")
    return last;
  const delta = move === "next" ? 1 : -1;
  return Math.min(Math.max(current + delta, 0), last);
}
function tabStopIndex(nav) {
  if (nav.visibleIds.length === 0)
    return -1;
  if (nav.focusedIndex >= 0 && nav.focusedIndex < nav.visibleIds.length)
    return nav.focusedIndex;
  const selected = nav.selectedId ? nav.visibleIds.indexOf(nav.selectedId) : -1;
  return selected >= 0 ? selected : 0;
}

// apps/frontend/src/mycomponents/support/TicketIndex.tsx
var jsx_dev_runtime6 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
function TicketIndex({
  title,
  count,
  state,
  toTicket,
  onSelect,
  selectedCaseId,
  search,
  filteredEmpty,
  notice,
  emptyIcon: EmptyIcon = Inbox,
  collapsedOnNarrow = false,
  actions
}) {
  const rows = state.kind === "ready" ? state.rows : [];
  const visibleIds = rows.map((row) => toTicket(row).caseId);
  const listRef = import_react5.useRef(null);
  const [focusedIndex, setFocusedIndex] = import_react5.useState(-1);
  const keyboardMove = import_react5.useRef(false);
  const stop = tabStopIndex({ count: visibleIds.length, selectedId: selectedCaseId ?? null, focusedIndex, visibleIds });
  import_react5.useEffect(() => {
    if (!keyboardMove.current)
      return;
    const row = listRef.current?.querySelector(`[data-row-index="${stop}"]`);
    row?.focus();
    keyboardMove.current = false;
  }, [stop, focusedIndex]);
  const onKeyDown = (event) => {
    const target = event.target;
    const index = Number(target.dataset.rowIndex);
    if (!Number.isInteger(index) || index < 0)
      return;
    const moves = {
      ArrowDown: "next",
      ArrowUp: "previous",
      Home: "first",
      End: "last"
    };
    const move = moves[event.key];
    if (!move)
      return;
    event.preventDefault();
    const next = moveFocus({ count: visibleIds.length, selectedId: selectedCaseId ?? null, focusedIndex: index }, move);
    keyboardMove.current = true;
    setFocusedIndex(next);
  };
  const hidden = collapsedOnNarrow && Boolean(selectedCaseId);
  return /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
    className: `min-h-0 flex-col ${hidden ? "hidden lg:flex" : "flex"} flex-1`,
    "data-index-pane": "",
    children: [
      /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
        className: "flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3",
        children: [
          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("h2", {
            className: "truncate text-[13px] font-semibold tracking-tight text-zinc-900",
            children: title
          }, undefined, false, undefined, this),
          count ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
            className: "shrink-0 text-[11px] tabular-nums text-zinc-500",
            children: count
          }, undefined, false, undefined, this) : null,
          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
            className: "ml-auto flex shrink-0 items-center gap-1.5",
            children: actions
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      search ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
        className: "shrink-0 border-b border-zinc-200 px-3 py-2.5",
        children: [
          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("label", {
            className: "relative block",
            children: [
              /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                className: "sr-only",
                children: search.label
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(Search, {
                "aria-hidden": true,
                className: "pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("input", {
                type: "search",
                value: search.value,
                maxLength: 120,
                placeholder: search.placeholder,
                onChange: (event) => search.onChange(event.target.value),
                className: "w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pr-8 pl-8 text-[13px] text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:bg-white focus:outline-none"
              }, undefined, false, undefined, this),
              search.value ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("button", {
                type: "button",
                onClick: () => search.onChange(""),
                className: "absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(X, {
                    "aria-hidden": true,
                    className: "h-3.5 w-3.5"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                    className: "sr-only",
                    children: "Clear search"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          search.controls ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
            className: "mt-2",
            children: search.controls
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this) : null,
      notice,
      /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("div", {
        className: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        children: [
          state.kind === "loading" ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(PaneLoading, {
            label: state.label
          }, undefined, false, undefined, this) : null,
          state.kind === "error" ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(PaneNotice, {
            tone: state.tone ?? "alert",
            title: state.title,
            detail: state.detail
          }, undefined, false, undefined, this) : null,
          state.kind === "empty" ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(PaneNotice, {
            icon: EmptyIcon,
            title: state.title,
            detail: state.detail
          }, undefined, false, undefined, this) : null,
          state.kind === "ready" && rows.length === 0 ? filteredEmpty ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(PaneNotice, {
            icon: EmptyIcon,
            title: filteredEmpty.title,
            detail: filteredEmpty.detail,
            action: /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("button", {
              type: "button",
              onClick: filteredEmpty.onClear,
              className: "text-xs font-medium text-[#b33800] underline underline-offset-2",
              children: "Clear filters"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(PaneNotice, {
            icon: EmptyIcon,
            title: "Nothing to show",
            detail: "No rows are available in this view."
          }, undefined, false, undefined, this) : null,
          state.kind === "ready" && rows.length > 0 ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("ul", {
            ref: listRef,
            onKeyDown,
            className: "divide-y divide-zinc-100",
            children: rows.map((row, index) => {
              const ticket = toTicket(row);
              const selected = ticket.caseId === selectedCaseId;
              return /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("li", {
                children: /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("button", {
                  type: "button",
                  id: ticket.id ?? `ticket-${ticket.caseId}`,
                  "data-row-index": index,
                  tabIndex: index === stop ? 0 : -1,
                  "aria-current": selected ? "true" : undefined,
                  onClick: () => onSelect(row),
                  className: `flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${selected ? "bg-orange-50/70" : "hover:bg-zinc-50"}`,
                  children: /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                    className: "min-w-0 flex-1",
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                        className: "flex items-baseline gap-2",
                        children: [
                          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                            className: "truncate text-[13px] font-semibold text-zinc-900",
                            children: ticket.zapName ?? ticket.summary
                          }, undefined, false, undefined, this),
                          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                            className: "ml-auto shrink-0 text-[11px] tabular-nums text-zinc-400",
                            children: ageLabel(ticket.observedAt)
                          }, undefined, false, undefined, this)
                        ]
                      }, undefined, true, undefined, this),
                      ticket.zapName ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                        className: "mt-0.5 block truncate text-xs text-zinc-500",
                        children: ticket.stepLabel ?? ticket.summary
                      }, undefined, false, undefined, this) : null,
                      /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                        className: "mt-1 flex flex-wrap items-center gap-1.5",
                        children: [
                          /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(StatusMark, {
                            label: ticket.status,
                            tone: ticket.tone
                          }, undefined, false, undefined, this),
                          ticket.ownerLabel ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("span", {
                            className: "truncate text-[11px] text-zinc-500",
                            children: ticket.ownerLabel
                          }, undefined, false, undefined, this) : null,
                          ticket.safeCode ? /* @__PURE__ */ jsx_dev_runtime6.jsxDEV("code", {
                            className: "truncate rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] text-zinc-600",
                            children: ticket.safeCode
                          }, undefined, false, undefined, this) : null
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                }, undefined, false, undefined, this)
              }, ticket.caseId, false, undefined, this);
            })
          }, undefined, false, undefined, this) : null
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/app/engineering/EngineeringWorkspace.tsx
var import_react8 = __toESM(require_react(), 1);

// apps/frontend/src/components/ui/dialog.tsx
var jsx_dev_runtime7 = __toESM(require_jsx_dev_runtime(), 1);
"use client";

// apps/frontend/src/mycomponents/app/FormKit.tsx
var jsx_dev_runtime8 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
var btnPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F00]/40 disabled:cursor-not-allowed disabled:opacity-60";
var btnSecondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60";
function Field({
  label,
  hint,
  action,
  children
}) {
  return /* @__PURE__ */ jsx_dev_runtime8.jsxDEV("div", {
    className: "space-y-1.5",
    children: [
      /* @__PURE__ */ jsx_dev_runtime8.jsxDEV("div", {
        className: "flex items-center justify-between gap-3",
        children: [
          /* @__PURE__ */ jsx_dev_runtime8.jsxDEV("label", {
            className: "text-sm font-medium text-zinc-800",
            children: label
          }, undefined, false, undefined, this),
          action
        ]
      }, undefined, true, undefined, this),
      hint && /* @__PURE__ */ jsx_dev_runtime8.jsxDEV("p", {
        className: "text-xs text-zinc-500",
        children: hint
      }, undefined, false, undefined, this),
      children
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/hooks/useSupportEvidence.ts
var import_react6 = __toESM(require_react(), 1);

// apps/frontend/src/config.ts
var BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
var HOOKS_URL = process.env.NEXT_PUBLIC_HOOKS_URL ?? "http://localhost:3002";

// apps/frontend/src/lib/support-evidence.ts
class SupportEvidenceError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "SupportEvidenceError";
  }
}
var sameOriginFetch = (input, init) => fetch(input, init);
var EVIDENCE_SCOPES = {
  operator: { baseUrl: `${BACKEND_URL}/api/v1/triage/operator`, authorizeValidation: true },
  engineering: { baseUrl: `${BACKEND_URL}/api/v1/triage/engineering`, authorizeValidation: false }
};
async function evidenceRequest(scope, path, init, signal, fetchImpl = sameOriginFetch) {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
  if (!token)
    throw new SupportEvidenceError("Sign in to read case evidence.", 401);
  const response = await fetchImpl(`${scope.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : "The evidence service is unavailable.";
    throw new SupportEvidenceError(detail, response.status);
  }
  return payload;
}
var isRecord = (value) => typeof value === "object" && value !== null;
var asArray = (value) => Array.isArray(value) ? value : [];
var asText = (value) => typeof value === "string" ? value : null;
var asNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
var asBoolean = (value) => value === true;
var unavailable = (reason) => ({ data: null, unavailable: [reason] });
function normalizeFailureContext(payload) {
  if (!isRecord(payload) || !isRecord(payload.facts))
    return unavailable("failure_context_unreadable");
  const facts = payload.facts;
  const retry = isRecord(facts.retry) ? facts.retry : {};
  const structure = (value) => ({
    paths: asArray(value && isRecord(value) ? value.paths : []).map((entry) => ({
      path: asText(entry?.path) ?? "",
      type: asText(entry?.type) ?? "unknown"
    })),
    truncated: isRecord(value) ? asBoolean(value.truncated) : false
  });
  const sourceKind = facts.source_kind === "reconciled_execution" ? "reconciled_execution" : "retry_row";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        source_kind: sourceKind,
        current_action_type: asText(facts.current_action_type),
        retry: {
          provider: asText(retry.provider),
          phase: asText(retry.phase),
          provider_outcome: asText(retry.provider_outcome),
          safe_code: asText(retry.safe_code),
          provider_status: asNumber(retry.provider_status),
          retry_after_seconds: asNumber(retry.retry_after_seconds),
          requires_human: asBoolean(retry.requires_human),
          final_error: asText(retry.final_error)
        },
        action_metadata: structure(facts.action_metadata),
        payload: structure(facts.payload)
      }
    },
    unavailable: asArray(payload.unavailable).filter((item) => typeof item === "string")
  };
}
function normalizeExecutionEvidence(payload) {
  if (!isRecord(payload) || !isRecord(payload.facts))
    return unavailable("execution_evidence_unreadable");
  const facts = payload.facts;
  const rawExecution = isRecord(facts.current_execution) ? facts.current_execution : null;
  const provenance = facts.provenance === "reconciled_execution" || facts.provenance === "legacy" ? facts.provenance : "captured";
  const attemptProvenance = (value) => value === "reconciled_execution" || value === "legacy" ? value : "captured";
  const outcome = (value) => value === "accepted" || value === "rejected" || value === "not_attempted" ? value : "unknown";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        provenance,
        current_execution: rawExecution ? {
          status: asText(rawExecution.status) ?? "unknown",
          lease_until: asText(rawExecution.lease_until),
          completed_at: asText(rawExecution.completed_at),
          provider_outcome: asText(rawExecution.provider_outcome),
          requires_human: asBoolean(rawExecution.requires_human)
        } : null,
        attempts: asArray(facts.attempts).map((attempt) => ({
          attempt_number: asNumber(attempt.attempt_number) ?? 0,
          status: asText(attempt.status) ?? "unknown",
          provider: asText(attempt.provider),
          phase: asText(attempt.phase),
          provider_outcome: outcome(attempt.provider_outcome),
          safe_code: asText(attempt.safe_code),
          provider_status: asNumber(attempt.provider_status),
          retry_after_seconds: asNumber(attempt.retry_after_seconds),
          started_at: asText(attempt.started_at),
          completed_at: asText(attempt.completed_at),
          provenance: attemptProvenance(attempt.provenance)
        })),
        history_limit: asNumber(facts.history_limit) ?? 0,
        history_truncated: asBoolean(facts.history_truncated),
        predecessors: asArray(facts.predecessors).map((entry) => ({
          stage: asNumber(entry.stage) ?? 0,
          status: asText(entry.status) ?? "unknown",
          provider_outcome: asText(entry.provider_outcome),
          completed_at: asText(entry.completed_at)
        })),
        ordering: {
          status: isRecord(facts.ordering) && (facts.ordering.status === "valid" || facts.ordering.status === "invalid") ? facts.ordering.status : "unknown",
          missing_predecessor_stages: asArray(isRecord(facts.ordering) ? facts.ordering.missing_predecessor_stages : []).filter((stage) => typeof stage === "number")
        }
      }
    },
    unavailable: asArray(payload.unavailable).filter((item) => typeof item === "string")
  };
}
function normalizeInputValidation(payload) {
  if (!isRecord(payload) || !isRecord(payload.facts))
    return unavailable("input_validation_unreadable");
  const facts = payload.facts;
  const status = facts.validation_status === "valid" || facts.validation_status === "blocked" ? facts.validation_status : "invalid";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        action_type: asText(facts.action_type),
        validation_status: status,
        supported: asBoolean(facts.supported),
        missing_required_fields: asArray(facts.missing_required_fields).filter((f) => typeof f === "string"),
        invalid_field_types: asArray(facts.invalid_field_types).map((entry) => ({
          field: asText(entry.field) ?? "",
          expected: asText(entry.expected) ?? "string",
          actual: asText(entry.actual) ?? "unknown"
        })),
        missing_template_paths: asArray(facts.missing_template_paths).filter((p) => typeof p === "string"),
        credential_presence: asArray(facts.credential_presence).map((entry) => ({
          field: asText(entry.field) ?? "",
          present: asBoolean(entry.present),
          source: asText(entry.source) ?? "unknown_worker_environment"
        })),
        blocked_reasons: asArray(facts.blocked_reasons).filter((r) => typeof r === "string"),
        input_fingerprint: asText(facts.input_fingerprint) ?? ""
      }
    },
    unavailable: asArray(payload.unavailable).filter((item) => typeof item === "string")
  };
}
async function readOrUnavailable(read, normalize, fallbackReason) {
  try {
    return normalize(await read());
  } catch (error) {
    if (error instanceof SupportEvidenceError && (error.status === 401 || error.status === 403))
      throw error;
    return unavailable(fallbackReason);
  }
}
async function readSupportEvidence(caseId, signal, fetchImpl = sameOriginFetch, scope = EVIDENCE_SCOPES.operator) {
  const base = `/cases/${encodeURIComponent(caseId)}`;
  const [failureContext, execution, validation] = await Promise.all([
    readOrUnavailable(() => evidenceRequest(scope, `${base}/failure-context`, { method: "GET" }, signal, fetchImpl), normalizeFailureContext, "failure_context_unavailable"),
    readOrUnavailable(() => evidenceRequest(scope, `${base}/execution-evidence?historyLimit=10`, { method: "GET" }, signal, fetchImpl), normalizeExecutionEvidence, "execution_evidence_unavailable"),
    scope.authorizeValidation ? readOrUnavailable(() => evidenceRequest(scope, `${base}/validate-action-inputs`, { method: "POST" }, signal, fetchImpl), normalizeInputValidation, "input_validation_unavailable") : Promise.resolve(unavailable("input_validation_not_authorized_here"))
  ]);
  return { failureContext, execution, validation };
}

// apps/frontend/src/hooks/useSupportEvidence.ts
"use client";
function useSupportEvidence(caseId, enabled, options = {}) {
  const [stored, setStored] = import_react6.useState(null);
  const [reloadKey, setReloadKey] = import_react6.useState(0);
  const scope = options.scope ?? EVIDENCE_SCOPES.operator;
  const fetchImpl = options.fetchImpl ?? sameOriginFetch;
  import_react6.useEffect(() => {
    if (!enabled || !caseId)
      return;
    const controller = new AbortController;
    readSupportEvidence(caseId, controller.signal, fetchImpl, scope).then((evidence) => {
      if (!controller.signal.aborted)
        setStored({ caseId, reloadKey, value: { kind: "ready", evidence } });
    }).catch((error) => {
      if (controller.signal.aborted)
        return;
      const value = error instanceof SupportEvidenceError && (error.status === 401 || error.status === 403) ? { kind: "denied", message: error.message } : { kind: "denied", message: "Evidence reads are unavailable right now." };
      setStored({ caseId, reloadKey, value });
    });
    return () => controller.abort();
  }, [caseId, enabled, reloadKey, scope, fetchImpl]);
  const reload = import_react6.useCallback(() => setReloadKey((key) => key + 1), []);
  if (!enabled || !caseId)
    return { state: { kind: "idle" }, reload };
  const current = stored?.caseId === caseId && stored.reloadKey === reloadKey ? stored.value : null;
  return { state: current ?? { kind: "loading" }, reload };
}

// apps/frontend/src/hooks/useNarrowViewport.ts
var import_react7 = __toESM(require_react(), 1);
"use client";
function useNarrowViewport(query = "(max-width: 1023px)") {
  const [narrow, setNarrow] = import_react7.useState(false);
  import_react7.useEffect(() => {
    if (typeof window.matchMedia !== "function")
      return;
    const list = window.matchMedia(query);
    const update = () => setNarrow(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return narrow;
}

// apps/frontend/src/lib/engineering-client.ts
class EngineeringError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "EngineeringError";
  }
}
function authToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("token");
}
async function engineeringRequest(path, init = {}, fetchImpl = fetch) {
  const token = authToken();
  if (!token)
    throw new EngineeringError("Sign in to open the engineering workspace.", 401);
  const response = await fetchImpl(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.body === undefined ? {} : { "Content-Type": "application/json" },
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : "The engineering service is unavailable.";
    throw new EngineeringError(detail, response.status);
  }
  return payload;
}
async function readEngineeringCaseHistory(caseId, fetchImpl) {
  return engineeringRequest(`/api/v1/triage/engineering/cases/${encodeURIComponent(caseId)}/history`, {}, fetchImpl);
}
async function returnFindings(input, fetchImpl) {
  return engineeringRequest(`/api/v1/triage/engineering/cases/${encodeURIComponent(input.caseId)}/findings`, {
    method: "POST",
    headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {},
    body: JSON.stringify({
      findings: input.findings,
      ...input.notes ? { notes: input.notes } : {}
    })
  }, fetchImpl);
}
async function resolveEngineeringCase(input, fetchImpl) {
  return engineeringRequest(`/api/v1/triage/engineering/cases/${encodeURIComponent(input.caseId)}/resolve`, {
    method: "POST",
    headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {},
    body: JSON.stringify({
      resolutionReason: input.resolutionReason,
      ...input.notes ? { notes: input.notes } : {}
    })
  }, fetchImpl);
}

// apps/frontend/src/types/engineering.ts
var workflowActionLabels = {
  request_owner_repair: "Support asked the owner to repair",
  submit_repair: "Owner submitted a repair",
  escalate: "Support escalated to engineering",
  return_findings: "Engineering returned findings",
  resolve: "Case resolved",
  decision_handoff: "AI decision recorded"
};
var queueLabels = {
  support: "Support",
  owner: "Owner",
  engineering: "Engineering",
  resolved: "Resolved"
};
function handoffCopy(history) {
  const escalation = history.events.find((event) => event.action === "escalate");
  const returned = history.events.find((event) => event.action === "return_findings");
  if (returned) {
    return {
      kind: "returned",
      message: "Findings were returned to support. This case is no longer in the engineering queue."
    };
  }
  if (escalation) {
    return {
      kind: "escalated",
      message: "Support escalated this case and is waiting on engineering findings."
    };
  }
  return {
    kind: "unknown",
    message: "No escalation event is recorded for this case yet."
  };
}

// apps/frontend/src/app/engineering/EngineeringWorkspace.tsx
var jsx_dev_runtime9 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
var textareaClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20";
var FINDINGS_MAX = 4000;
var REASON_MAX = 2000;
var NOTES_MAX = 2000;
function canSubmitFindings(findings, pending) {
  const trimmed = findings.trim();
  return !pending && trimmed.length > 0 && trimmed.length <= FINDINGS_MAX;
}
function canSubmitResolution(reason, pending) {
  const trimmed = reason.trim();
  return !pending && trimmed.length > 0 && trimmed.length <= REASON_MAX;
}
function idempotencyKey() {
  return globalThis.crypto.randomUUID();
}
function EngineeringWorkspace({
  caseId,
  capabilities,
  onRouted,
  onUnauthorized
}) {
  const [state, setState] = import_react8.useState({ kind: "loading" });
  const [findings, setFindings] = import_react8.useState("");
  const [notes, setNotes] = import_react8.useState("");
  const [reason, setReason] = import_react8.useState("");
  const [pending, setPending] = import_react8.useState(false);
  const [notice, setNotice] = import_react8.useState(null);
  const [reloadKey, setReloadKey] = import_react8.useState(0);
  const [evidenceOpen, setEvidenceOpen] = import_react8.useState(false);
  const narrow = useNarrowViewport();
  const evidence = useSupportEvidence(caseId, true, {
    scope: EVIDENCE_SCOPES.engineering
  });
  import_react8.useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    setFindings("");
    setNotes("");
    setReason("");
    setNotice(null);
    (async () => {
      try {
        const history2 = await readEngineeringCaseHistory(caseId);
        if (active)
          setState({ kind: "ready", history: history2 });
      } catch (error) {
        if (!active)
          return;
        if (error instanceof EngineeringError && (error.status === 403 || error.status === 404)) {
          onUnauthorized?.();
        }
        setState({
          kind: "error",
          message: error instanceof EngineeringError ? error.message : "Could not load this escalation."
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [caseId, reloadKey, onUnauthorized]);
  async function submitFindings(history2) {
    setPending(true);
    setNotice(null);
    try {
      await returnFindings({
        caseId: history2.case.case_id,
        findings: findings.trim(),
        ...notes.trim() ? { notes: notes.trim() } : {},
        idempotencyKey: idempotencyKey()
      });
      setNotice({ tone: "ok", message: "Findings returned to support. It is no longer in your queue." });
      setFindings("");
      setNotes("");
      onRouted?.();
    } catch (error) {
      if (error instanceof EngineeringError && error.status === 403)
        onUnauthorized?.();
      setNotice({
        tone: "error",
        message: error instanceof EngineeringError ? error.message : "Returning findings failed. Try again."
      });
    } finally {
      setPending(false);
    }
  }
  async function submitResolution(history2) {
    setPending(true);
    setNotice(null);
    try {
      await resolveEngineeringCase({
        caseId: history2.case.case_id,
        resolutionReason: reason.trim(),
        ...notes.trim() ? { notes: notes.trim() } : {},
        idempotencyKey: idempotencyKey()
      });
      setNotice({ tone: "ok", message: "Case resolved with your explanation recorded." });
      setReason("");
      setNotes("");
      onRouted?.();
    } catch (error) {
      if (error instanceof EngineeringError && error.status === 403)
        onUnauthorized?.();
      setNotice({
        tone: "error",
        message: error instanceof EngineeringError ? error.message : "Resolving the case failed. Try again."
      });
    } finally {
      setPending(false);
    }
  }
  const evidenceRoom = /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(EvidenceRoom, {
    caseId,
    state: evidence.state,
    onReload: evidence.reload,
    onClose: evidenceOpen ? () => setEvidenceOpen(false) : undefined,
    saved: null,
    diagnosis: null
  }, undefined, false, undefined, this);
  if (state.kind === "loading") {
    return /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
      className: "grid min-h-[320px] place-items-center",
      children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
        role: "status",
        className: "text-xs text-zinc-500",
        children: "Loading this escalation\u2026"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  if (state.kind === "error") {
    return /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
      className: "p-4",
      children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(PaneNotice, {
        tone: "alert",
        icon: TriangleAlert,
        title: "This escalation could not be loaded",
        detail: state.message,
        action: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
          type: "button",
          className: btnSecondary,
          onClick: () => setReloadKey((key) => key + 1),
          children: "Retry"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  const { history } = state;
  const handoff = handoffCopy(history);
  const inQueue = history.case.workflow.queue === "engineering";
  const allowed = Boolean(capabilities?.isEngineer && inQueue);
  const mark = workflowMark(history.case.workflow.status, history.case.workflow.queue);
  const identity = {
    caseId: history.case.case_id,
    title: history.case.safe_code ?? "Unclassified failure",
    subtitle: `${history.case.stage === 0 ? "Trigger" : `Action ${history.case.stage}`} \xB7 routed to engineering`,
    status: mark.label,
    tone: mark.tone,
    observedAt: history.case.observed_at,
    ownerLabel: `Owner ${history.case.subject_owner_id}`,
    safeCode: history.case.safe_code,
    providerOutcome: history.case.provider_outcome,
    source: history.case.source,
    stage: history.case.stage,
    zapRunId: history.case.zap_run_id
  };
  return /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
    className: "flex min-h-0 flex-1 flex-col xl:flex-row",
    children: [
      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
        className: "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
        "data-case-file": "",
        children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(CaseFile, {
          identity,
          aside: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(StatusMark, {
                label: queueLabels[history.case.workflow.queue],
                tone: mark.tone
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("span", {
                className: "text-[11px] text-zinc-600",
                children: handoff.message
              }, undefined, false, undefined, this),
              narrow ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
                type: "button",
                onClick: () => setEvidenceOpen(true),
                className: "rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50",
                children: "Evidence"
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          context: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
            title: "Routed details",
            description: "What the support operator recorded when escalating.",
            id: "routed",
            children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("dl", {
              children: [
                /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Fact, {
                  label: "Provider outcome",
                  value: providerOutcomeLabel(history.case.provider_outcome)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Fact, {
                  label: "Evidence source",
                  value: sourceLabel(history.case.source)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Fact, {
                  label: "Assigned engineer",
                  value: history.case.workflow.assignedEngineerId ? String(history.case.workflow.assignedEngineerId) : "unassigned",
                  mono: true
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Fact, {
                  label: "Workflow version",
                  value: `v${history.case.workflow.version}`
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Fact, {
                  label: "Last updated",
                  value: new Date(history.case.workflow.updatedAt).toLocaleString()
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          activity: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(jsx_dev_runtime9.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
                title: "Why support escalated this",
                description: "The reason the support operator recorded.",
                id: "escalation-reason",
                children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                  className: "text-sm text-zinc-800",
                  children: history.case.workflow.escalationReason ?? "No escalation reason was recorded."
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              history.case.workflow.customerInstructions ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
                title: "Customer-safe instructions already published",
                description: "What the owner was asked to do. This text was reviewed by a person.",
                id: "published-instructions",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                    className: "text-sm text-zinc-800",
                    children: history.case.workflow.customerInstructions.instructions
                  }, undefined, false, undefined, this),
                  history.case.workflow.customerInstructions.missingFields.length ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                    className: "mt-2 text-xs text-zinc-600",
                    children: [
                      "Missing fields:",
                      " ",
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("span", {
                        className: "font-medium text-zinc-800",
                        children: history.case.workflow.customerInstructions.missingFields.join(", ")
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this) : null
                ]
              }, undefined, true, undefined, this) : null,
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
                title: "Handoff history",
                description: "Every workflow event recorded for this case.",
                id: "handoff-history",
                children: [
                  history.events.length === 0 ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                    className: "text-xs text-zinc-500",
                    children: "No workflow events are recorded for this case."
                  }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("ol", {
                    className: "space-y-3",
                    children: history.events.map((event) => /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("li", {
                      className: "border-l-2 border-zinc-200 pl-3",
                      children: [
                        /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                          className: "text-xs font-medium text-zinc-900",
                          children: workflowActionLabels[event.action] ?? humanizeCode(event.action)
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                          className: "text-[11px] text-zinc-500",
                          children: [
                            queueLabels[event.fromQueue],
                            " \u2192 ",
                            queueLabels[event.toQueue],
                            " \xB7 actor ",
                            event.actorId,
                            " \xB7",
                            " ",
                            new Date(event.createdAt).toLocaleString()
                          ]
                        }, undefined, true, undefined, this),
                        event.notes ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                          className: "mt-1 text-[11px] text-zinc-700",
                          children: event.notes
                        }, undefined, false, undefined, this) : null
                      ]
                    }, event.id, true, undefined, this))
                  }, undefined, false, undefined, this),
                  history.case.workflow.findings ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                    className: "mt-3 rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-700",
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("span", {
                        className: "font-medium",
                        children: "Recorded findings: "
                      }, undefined, false, undefined, this),
                      history.case.workflow.findings
                    ]
                  }, undefined, true, undefined, this) : null
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          work: allowed ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
            title: "Return findings to support",
            description: "Responsibility moves back to the support queue. Replay approval and dispatch stay with support operators; this workspace cannot request or execute a replay.",
            id: "return-findings",
            children: [
              notice ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
                role: notice.tone === "error" ? "alert" : "status",
                className: `mb-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`,
                children: [
                  notice.tone === "ok" ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(CircleCheck, {
                    "aria-hidden": true,
                    className: "mt-0.5 h-3.5 w-3.5 shrink-0"
                  }, undefined, false, undefined, this) : null,
                  notice.message
                ]
              }, undefined, true, undefined, this) : null,
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
                className: "space-y-3",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Field, {
                    label: "Findings",
                    hint: `Required \xB7 up to ${FINDINGS_MAX} characters`,
                    children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("textarea", {
                      rows: 4,
                      className: textareaClass,
                      value: findings,
                      onChange: (event) => setFindings(event.target.value),
                      placeholder: "What did you find, and what should support do next?"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Field, {
                    label: "Internal note",
                    hint: `Optional \xB7 up to ${NOTES_MAX} characters`,
                    children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("textarea", {
                      rows: 2,
                      className: textareaClass,
                      value: notes,
                      onChange: (event) => setNotes(event.target.value)
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
                    className: "flex flex-wrap items-center gap-3",
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
                        className: btnPrimary,
                        disabled: !canSubmitFindings(findings, pending),
                        onClick: () => void submitFindings(history),
                        children: pending ? "Working\u2026" : "Return findings to support"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("span", {
                        className: "text-[11px] text-zinc-500",
                        children: [
                          findings.trim().length,
                          "/",
                          FINDINGS_MAX
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
                className: "mt-5 border-t border-zinc-100 pt-4",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("h4", {
                    className: "flex items-center gap-2 text-[13px] font-semibold text-zinc-900",
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(History, {
                        "aria-hidden": true,
                        className: "h-3.5 w-3.5 text-zinc-400"
                      }, undefined, false, undefined, this),
                      "Resolve with an explanation"
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
                    className: "mt-0.5 text-xs text-zinc-500",
                    children: "Use this only when engineering work closed the case without returning it to support."
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
                    className: "mt-3 space-y-3",
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Field, {
                        label: "Resolution reason",
                        hint: `Required \xB7 up to ${REASON_MAX} characters`,
                        children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("textarea", {
                          rows: 3,
                          className: textareaClass,
                          value: reason,
                          onChange: (event) => setReason(event.target.value)
                        }, undefined, false, undefined, this)
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
                        className: btnSecondary,
                        disabled: !canSubmitResolution(reason, pending),
                        onClick: () => void submitResolution(history),
                        children: "Resolve case"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(Section, {
            title: "No engineering action available",
            description: "This workspace states the queue position honestly rather than offering a control that would be rejected.",
            id: "no-action",
            children: /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("p", {
              className: "text-xs text-zinc-600",
              children: inQueue ? "Your engineering access was revoked or is not active, so this case is read-only for you." : "This case is no longer routed to engineering, so responsibility sits elsewhere."
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
        className: "hidden min-h-0 flex-col border-zinc-200 xl:flex xl:w-[400px] xl:shrink-0 xl:border-l",
        children: evidenceRoom
      }, undefined, false, undefined, this),
      evidenceOpen && narrow ? /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
        className: "fixed inset-0 z-40 flex flex-col justify-end xl:hidden",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Case evidence",
        children: [
          /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
            type: "button",
            "aria-label": "Close evidence",
            onClick: () => setEvidenceOpen(false),
            className: "absolute inset-0 bg-zinc-900/30"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("div", {
            className: "relative flex h-[82dvh] flex-col overflow-hidden rounded-t-xl border-t border-zinc-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
            children: [
              /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("button", {
                type: "button",
                onClick: () => setEvidenceOpen(false),
                className: "absolute top-2 right-2 z-10 rounded-md bg-white/90 p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV(X, {
                    "aria-hidden": true,
                    className: "h-4 w-4"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime9.jsxDEV("span", {
                    className: "sr-only",
                    children: "Close evidence"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              evidenceRoom
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this) : null
    ]
  }, undefined, true, undefined, this);
}

// apps/frontend/src/app/failures/OwnerStatusChip.tsx
var jsx_dev_runtime10 = __toESM(require_jsx_dev_runtime(), 1);
"use client";
function StatusChip({ status }) {
  const mark = ownerWorkflowMark(status);
  return /* @__PURE__ */ jsx_dev_runtime10.jsxDEV(StatusMark, {
    label: mark.label,
    tone: mark.tone
  }, undefined, false, undefined, this);
}

// .impeccable/harness/fixtures.tsx
var hashA = "a".repeat(64);
var hashB = "b".repeat(64);
var cases = [
  {
    case_id: "f0100000-0000-4000-8000-000000000001",
    zap_run_id: "11111111-1111-4111-8111-111111111111",
    stage: 2,
    subject_owner_id: 9,
    observed_at: new Date(Date.now() - 42 * 60000).toISOString(),
    provider_outcome: "rejected",
    safe_code: "telegram_http_429",
    source: "retry_row"
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000002",
    zap_run_id: "22222222-2222-4222-8222-222222222222",
    stage: 1,
    subject_owner_id: 14,
    observed_at: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    provider_outcome: "unknown",
    safe_code: "telegram_transport_throw",
    source: "retry_row"
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000003",
    zap_run_id: "33333333-3333-4333-8333-333333333333",
    stage: 1,
    subject_owner_id: 22,
    observed_at: new Date(Date.now() - 26 * 60 * 60000).toISOString(),
    provider_outcome: "not_attempted",
    safe_code: "invalid_action_inputs",
    source: "reconciled_execution"
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000004",
    zap_run_id: "44444444-4444-4444-8444-444444444444",
    stage: 0,
    subject_owner_id: 9,
    observed_at: new Date(Date.now() - 4 * 24 * 60 * 60000).toISOString(),
    provider_outcome: "rejected",
    safe_code: "telegram_http_403",
    source: "retry_row"
  }
];
var diagnosis = {
  status: "completed",
  diagnosis: {
    taxonomy_id: "transient_provider_failure",
    summary: "The Telegram send stage was rejected with HTTP 429 on the second action. The provider stated a retry delay, and the recorded attempt fingerprint still matches the current handler inputs.",
    confidence: "high",
    evidence_refs: ["failure-context:f0100000", "execution-evidence:f0100000", "attempt:2"],
    alternate_explanations: ["A revoked bot token would produce the same rejection if the destination were also invalid."],
    missing_evidence: ["provider_delivery_receipt"]
  },
  proposal: {
    disposition: "replay_candidate",
    kind: "wait_then_replay",
    summary: "Wait for the recorded cooldown, then replay the same fingerprinted request once, unchanged, with operator approval.",
    reasons: [
      "The rejection happened at the send stage, so the provider never accepted the message.",
      "No attempt in the ledger was accepted, so a replay cannot duplicate a delivered message."
    ],
    evidence_refs: ["failure-context:f0100000", "execution-evidence:f0100000"],
    runbook_citations: ["RB-F01-F02@1.1.0#replay-after-send-stage-rejection", "RB-F01-F02@1.1.0#missing-historical-snapshot"],
    preconditions: ["The original inputs and handler must be unchanged.", "At most one replay for this case."],
    not_before: new Date(Date.now() - 5 * 60000).toISOString()
  }
};
var historyItem = {
  requestId: "aaaaaaaa-1111-4111-8111-111111111111",
  approvalId: "bbbbbbbb-2222-4222-8222-222222222222",
  proposalId: "cccccccc-3333-4333-8333-333333333333",
  investigationId: "dddddddd-4444-4444-8444-444444444444",
  proposalVersion: 1,
  publication: "published",
  execution: "SUCCESS",
  outcome: "accepted",
  requestedBy: 4,
  approvedBy: 4,
  createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  completedAt: new Date(Date.now() - 29 * 60000).toISOString()
};
var saved = {
  id: "dddddddd-4444-4444-8444-444444444444",
  status: "proposed",
  result: diagnosis,
  authority: {
    id: "cccccccc-3333-4333-8333-333333333333",
    version: 1,
    status: "requires_approval",
    expiresAt: new Date(Date.now() + 25 * 60000).toISOString(),
    reasons: [],
    eligibility: {
      status: "eligible",
      reasons: [],
      notBefore: new Date(Date.now() - 5 * 60000).toISOString(),
      requiresOperatorApproval: true,
      candidateGrounded: true
    },
    allowedDecisions: ["approve", "reject", "escalate_to_engineering", "mark_owner_action_required"],
    decision: null,
    replay: null,
    replayHistory: [historyItem],
    replayEnabled: false
  }
};
var blockedSaved = {
  ...saved,
  id: "eeeeeeee-5555-4555-8555-555555555555",
  authority: {
    ...saved.authority,
    version: 3,
    status: "blocked",
    reasons: ["replay_limit", "ungrounded_candidate"],
    eligibility: {
      status: "blocked",
      reasons: ["replay_limit", "ungrounded_candidate"],
      notBefore: null,
      requiresOperatorApproval: false,
      candidateGrounded: false
    },
    allowedDecisions: ["reject", "resolve_without_replay"],
    replay: {
      id: historyItem.requestId,
      publication: "published",
      execution: "UNKNOWN",
      completedAt: new Date(Date.now() - 60000).toISOString()
    }
  }
};
var evidence = {
  failureContext: {
    data: {
      observed_at: new Date(Date.now() - 42 * 60000).toISOString(),
      content_hash: hashA,
      complete: true,
      facts: {
        source_kind: "retry_row",
        current_action_type: "telegram",
        retry: {
          provider: "telegram",
          phase: "send",
          provider_outcome: "rejected",
          safe_code: "telegram_http_429",
          provider_status: 429,
          retry_after_seconds: 30,
          requires_human: false,
          final_error: "Too Many Requests: retry after 30"
        },
        action_metadata: {
          paths: [
            { path: "chatId", type: "string" },
            { path: "message", type: "string" },
            { path: "botToken", type: "credential" }
          ],
          truncated: false
        },
        payload: {
          paths: [
            { path: "text", type: "string" },
            { path: "parse_mode", type: "string" }
          ],
          truncated: false
        }
      }
    },
    unavailable: []
  },
  execution: {
    data: {
      observed_at: new Date(Date.now() - 42 * 60000).toISOString(),
      content_hash: hashB,
      complete: true,
      facts: {
        provenance: "captured",
        current_execution: {
          status: "FAILED",
          lease_until: null,
          completed_at: new Date(Date.now() - 42 * 60000).toISOString(),
          provider_outcome: "rejected",
          requires_human: false
        },
        attempts: [
          {
            attempt_number: 1,
            status: "REJECTED",
            provider: "telegram",
            phase: "send",
            provider_outcome: "rejected",
            safe_code: "telegram_http_429",
            provider_status: 429,
            retry_after_seconds: 30,
            started_at: new Date(Date.now() - 43 * 60000).toISOString(),
            completed_at: new Date(Date.now() - 42 * 60000).toISOString(),
            provenance: "captured"
          },
          {
            attempt_number: 2,
            status: "REJECTED",
            provider: "telegram",
            phase: "send",
            provider_outcome: "rejected",
            safe_code: "telegram_http_429",
            provider_status: 429,
            retry_after_seconds: 60,
            started_at: new Date(Date.now() - 41 * 60000).toISOString(),
            completed_at: new Date(Date.now() - 40 * 60000).toISOString(),
            provenance: "captured"
          }
        ],
        history_limit: 10,
        history_truncated: false,
        predecessors: [
          { stage: 0, status: "SUCCESS", provider_outcome: "accepted", completed_at: new Date(Date.now() - 44 * 60000).toISOString() },
          { stage: 1, status: "SUCCESS", provider_outcome: "accepted", completed_at: new Date(Date.now() - 43 * 60000).toISOString() }
        ],
        ordering: { status: "valid", missing_predecessor_stages: [] }
      }
    },
    unavailable: []
  },
  validation: {
    data: {
      observed_at: new Date(Date.now() - 5 * 60000).toISOString(),
      content_hash: hashB,
      complete: true,
      facts: {
        action_type: "telegram",
        validation_status: "valid",
        supported: true,
        missing_required_fields: [],
        invalid_field_types: [],
        missing_template_paths: [],
        credential_presence: [{ field: "botToken", present: true, source: "action_metadata" }],
        blocked_reasons: [],
        input_fingerprint: hashA
      }
    },
    unavailable: []
  }
};
var ownerFailures = [
  {
    caseId: cases[2].case_id,
    zapRunId: cases[2].zap_run_id,
    zapId: "55555555-5555-4555-8555-555555555555",
    zapName: "Meeting reminder",
    stage: 1,
    stepLabel: "Email (action 1)",
    observedAt: cases[2].observed_at,
    providerOutcome: "not_attempted",
    safeCode: "invalid_action_inputs",
    queue: "owner",
    status: "awaiting_owner"
  },
  {
    caseId: cases[0].case_id,
    zapRunId: cases[0].zap_run_id,
    zapId: "66666666-6666-4666-8666-666666666666",
    zapName: "Ops alerts",
    stage: 2,
    stepLabel: "Telegram (action 2)",
    observedAt: cases[0].observed_at,
    providerOutcome: "rejected",
    safeCode: "telegram_http_429",
    queue: "support",
    status: "needing_support"
  },
  {
    caseId: cases[3].case_id,
    zapRunId: cases[3].zap_run_id,
    zapId: "77777777-7777-4777-8777-777777777777",
    zapName: "Weekly digest",
    stage: 0,
    stepLabel: "Catch Hook (trigger)",
    observedAt: cases[3].observed_at,
    providerOutcome: "rejected",
    safeCode: "telegram_http_403",
    queue: "engineering",
    status: "escalated"
  },
  {
    caseId: cases[1].case_id,
    zapRunId: cases[1].zap_run_id,
    zapId: "88888888-8888-4888-8888-888888888888",
    zapName: "Invoice chase",
    stage: 1,
    stepLabel: "Telegram (action 1)",
    observedAt: cases[1].observed_at,
    providerOutcome: "unknown",
    safeCode: "telegram_transport_throw",
    queue: "resolved",
    status: "resolved"
  }
];
var engineeringCases = [
  {
    case_id: cases[1].case_id,
    zap_run_id: cases[1].zap_run_id,
    stage: 1,
    subject_owner_id: 14,
    observed_at: cases[1].observed_at,
    provider_outcome: "unknown",
    safe_code: "telegram_transport_throw",
    source: "retry_row",
    workflow: {
      id: "99999999-9999-4999-8999-999999999999",
      queue: "engineering",
      status: "escalated",
      assignedEngineerId: 42,
      escalationReason: "The transport threw after the send had started, so delivery is genuinely unknown. Support cannot decide whether a replay would duplicate a delivered message.",
      customerInstructions: null,
      findings: null,
      resolutionReason: null,
      version: 2,
      createdAt: cases[1].observed_at,
      updatedAt: cases[1].observed_at
    }
  },
  {
    case_id: cases[3].case_id,
    zap_run_id: cases[3].zap_run_id,
    stage: 0,
    subject_owner_id: 9,
    observed_at: cases[3].observed_at,
    provider_outcome: "rejected",
    safe_code: "telegram_http_403",
    source: "retry_row",
    workflow: {
      id: "abababab-9999-4999-8999-999999999999",
      queue: "engineering",
      status: "escalated",
      assignedEngineerId: null,
      escalationReason: "Repeated 403 after a destination change. Support needs to know whether the bot was removed from the channel.",
      customerInstructions: {
        targetStep: 0,
        missingFields: ["channelUserName"],
        instructions: "Re-add the bot to the channel before the next run.",
        editorPath: "/zap/44444444-4444-4444-8444-444444444444"
      },
      findings: null,
      resolutionReason: null,
      version: 1,
      createdAt: cases[3].observed_at,
      updatedAt: cases[3].observed_at
    }
  }
];

// .impeccable/harness/render.tsx
var jsx_dev_runtime11 = __toESM(require_jsx_dev_runtime(), 1);
var root = join(import.meta.dir, "..", "review");
mkdirSync(root, { recursive: true });
var capabilities = {
  investigation: true,
  replayIntent: true,
  replayExecution: true,
  releaseReady: true,
  labProfile: "triage-lab-v1",
  reasons: []
};
var deniedCapabilities = {
  investigation: true,
  replayIntent: false,
  replayExecution: false,
  releaseReady: false,
  labProfile: null,
  reasons: ["release_not_ready", "replay_switch_off"]
};
var toTicket = (item) => ({
  caseId: item.case_id,
  summary: caseSummary(item),
  status: item.source === "reconciled_execution" ? "Reconciled" : "Durable failure",
  tone: item.provider_outcome === "rejected" ? "denied" : item.provider_outcome === "unknown" ? "waiting" : "neutral",
  observedAt: item.observed_at,
  ownerLabel: `Owner ${item.subject_owner_id}`,
  safeCode: item.safe_code
});
var identity = {
  caseId: cases[0].case_id,
  title: caseSummary(cases[0]),
  subtitle: "Durable failure row",
  status: "Provider rejected",
  tone: "denied",
  observedAt: cases[0].observed_at,
  ownerLabel: `Owner ${cases[0].subject_owner_id}`,
  safeCode: cases[0].safe_code,
  providerOutcome: cases[0].provider_outcome,
  source: cases[0].source,
  stage: cases[0].stage,
  zapRunId: cases[0].zap_run_id
};
var queue = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
  title: "Support queue",
  count: `${cases.length}/${cases.length}`,
  state: { kind: "ready", rows: cases },
  toTicket,
  onSelect: () => {},
  selectedCaseId: cases[0].case_id,
  search: { label: "Search cases", placeholder: "Case, run, owner or error code", value: "", onChange: () => {} }
}, undefined, false, undefined, this);
var caseFile = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(CaseFile, {
  identity,
  aside: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
    className: "flex flex-wrap items-center gap-2",
    children: [
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("button", {
        type: "button",
        className: "inline-flex items-center gap-1.5 rounded-lg bg-[#FF4F00] px-3 py-1.5 text-xs font-semibold text-white",
        children: "Investigate again"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(StatusMark, {
        label: "Investigation proposed",
        tone: "neutral"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
        className: "text-[11px] text-zinc-500",
        children: "Updates stream while this investigation is open."
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this),
  context: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
    title: "Step handler",
    description: "Reported by the captured failure evidence, when it was recorded.",
    id: "step-handler",
    children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
      className: "text-xs text-zinc-700",
      children: "telegram"
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this),
  work: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(jsx_dev_runtime11.Fragment, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
        title: "Diagnosis",
        description: "Advisory only. Application policy, not this advice, decides what may be replayed.",
        id: "diagnosis",
        actions: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(StatusMark, {
          label: "high confidence",
          tone: "submitted"
        }, undefined, false, undefined, this),
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h4", {
            className: "text-sm font-semibold text-zinc-900",
            children: diagnosis.diagnosis.taxonomy_id
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-1 text-sm text-zinc-700",
            children: diagnosis.diagnosis.summary
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-2 text-[11px] text-zinc-500",
            children: "Investigation status: completed"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "mt-3",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                className: "mb-1 text-[11px] font-medium text-zinc-500",
                children: "Other explanations the evidence allows"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ul", {
                className: "list-disc space-y-0.5 pl-4 text-xs text-zinc-700",
                children: diagnosis.diagnosis.alternate_explanations.map((item) => /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
                  children: item
                }, item, false, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
        title: "Advisory next step",
        description: "What the resolver proposed. It is not an approval and not a dispatch.",
        id: "proposal",
        actions: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(StatusMark, {
          label: "replay candidate",
          tone: "neutral"
        }, undefined, false, undefined, this),
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "text-sm text-zinc-800",
            children: diagnosis.proposal.summary
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("dl", {
            className: "mt-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
                className: "flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("dt", {
                    className: "text-xs text-zinc-500",
                    children: "Proposal kind"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("dd", {
                    className: "text-xs font-medium text-zinc-800",
                    children: "wait then replay"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
                className: "flex items-baseline justify-between gap-3 py-1.5",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("dt", {
                    className: "text-xs text-zinc-500",
                    children: "Not before"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("dd", {
                    className: "text-xs font-medium text-zinc-800",
                    children: diagnosis.proposal.not_before
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "mt-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                className: "mb-1 text-[11px] font-medium text-zinc-500",
                children: "Why the resolver proposed this"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ul", {
                className: "list-disc space-y-0.5 pl-4 text-xs text-zinc-700",
                children: diagnosis.proposal.reasons.map((reason) => /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
                  children: reason
                }, reason, false, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "mt-2",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                className: "mb-1 text-[11px] font-medium text-zinc-500",
                children: "Preconditions it recorded"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ul", {
                className: "list-disc space-y-0.5 pl-4 text-xs text-zinc-700",
                children: diagnosis.proposal.preconditions.map((item) => /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
                  children: item
                }, item, false, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
        title: "Missing evidence",
        description: "What the diagnosis could not see. Nothing is inferred to replace it.",
        id: "missing",
        children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ul", {
          className: "flex flex-wrap gap-1",
          children: diagnosis.diagnosis.missing_evidence.map((item) => /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
            children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("code", {
              className: "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700",
              children: item
            }, undefined, false, undefined, this)
          }, item, false, undefined, this))
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ReplayLedger, {
        saved,
        capabilities,
        pending: false,
        onDecision: () => {},
        onDryRun: () => {},
        onRequestReplay: () => {}
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(CapabilitySummary, {
        capabilities
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this),
  activity: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
    title: "Investigation activity",
    description: "Durable milestones, in order, from the saved investigation.",
    id: "activity",
    children: [
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ol", {
        className: "space-y-2",
        children: ["proposed", "investigating", "queued"].map((status, index) => /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
          className: "flex items-baseline gap-3 text-xs",
          children: [
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("time", {
              dateTime: cases[0].observed_at,
              className: "shrink-0 font-mono text-[11px] tabular-nums text-zinc-400",
              children: `0${index + 1}:0${index + 2}`
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
              className: "font-medium text-zinc-800",
              children: status
            }, undefined, false, undefined, this)
          ]
        }, status, true, undefined, this))
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "mt-3 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-600",
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("a", {
            href: "#trace",
            className: "font-medium text-[#b33800] underline underline-offset-2",
            children: "Open investigation trace \u2197"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-1 font-mono break-all text-zinc-400",
            children: "Trace 7f4c1a2e-0000-4000-8000-000000000001"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-1",
            children: "Export is best effort; a recorded trace ID does not confirm delivery to the trace service. Trace access requires project membership."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this)
}, undefined, false, undefined, this);
var observedRoom = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(EvidenceRoom, {
  caseId: cases[0].case_id,
  state: { kind: "ready", evidence },
  onReload: () => {},
  saved,
  diagnosis
}, undefined, false, undefined, this);
var executionRoom = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(EvidenceRoom, {
  caseId: cases[0].case_id,
  state: { kind: "ready", evidence },
  onReload: () => {},
  saved,
  diagnosis,
  initialTab: "execution"
}, undefined, false, undefined, this);
var runbooksRoom = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(EvidenceRoom, {
  caseId: cases[0].case_id,
  state: { kind: "ready", evidence },
  onReload: () => {},
  saved,
  diagnosis,
  initialTab: "runbooks"
}, undefined, false, undefined, this);
var desktop = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ThreePane, {
    index: queue,
    main: caseFile,
    aside: observedRoom
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var desktopExecution = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ThreePane, {
    index: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
      title: "Support queue",
      count: "0/0",
      state: {
        kind: "empty",
        title: "No failures need support",
        detail: "No recent failed workflow case is inside this bounded view. New durable failures appear here on their own."
      },
      toTicket,
      onSelect: () => {}
    }, undefined, false, undefined, this),
    main: caseFile,
    aside: executionRoom
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var desktopBlocked = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ThreePane, {
    index: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
      title: "Support queue",
      count: "3/4",
      state: { kind: "ready", rows: cases },
      toTicket,
      onSelect: () => {},
      selectedCaseId: cases[0].case_id,
      filteredEmpty: { title: "No case matches these filters", detail: "4 cases are loaded.", onClear: () => {} }
    }, undefined, false, undefined, this),
    main: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(CaseFile, {
      identity: { ...identity, status: "Outcome unknown", tone: "waiting" },
      work: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(jsx_dev_runtime11.Fragment, {
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ReplayLedger, {
            saved: blockedSaved,
            capabilities: deniedCapabilities,
            pending: false,
            onDecision: () => {},
            onDryRun: () => {},
            onRequestReplay: () => {}
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(CapabilitySummary, {
            capabilities: deniedCapabilities
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this),
    aside: runbooksRoom
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var ownerPane = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[820px] w-[1440px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ThreePane, {
    index: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
      title: "Your failures",
      count: String(ownerFailures.length),
      state: { kind: "ready", rows: ownerFailures },
      toTicket: (failure) => ({
        caseId: failure.caseId,
        zapName: failure.zapName,
        stepLabel: `${failure.stepLabel}${failure.safeCode ? ` \xB7 ${failure.safeCode}` : ""}`,
        summary: failure.stepLabel,
        status: failure.status === "awaiting_owner" ? "Needs your fix" : "With support",
        tone: failure.status === "awaiting_owner" ? "waiting" : "neutral",
        observedAt: failure.observedAt,
        safeCode: failure.safeCode
      }),
      onSelect: () => {},
      selectedCaseId: ownerFailures[0].caseId
    }, undefined, false, undefined, this),
    main: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "mx-auto w-full max-w-2xl px-4 py-4",
      children: [
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
          className: "mb-3 flex items-center gap-2 text-xs text-zinc-500",
          children: "Edits change how the Zap runs from now on. The original failed run and its evidence are never rewritten."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(StaticRepairPanel, {}, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this),
    aside: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0",
      children: [
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h2", {
          className: "text-[13px] font-semibold text-zinc-900",
          children: "What happens after you submit"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ol", {
          className: "mt-2 space-y-2",
          children: [
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "Support reviews your change against the original failure evidence."
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "A submitted repair is an acknowledgement, not a certification: it does not prove the failure is fixed, and it does not replay the original run."
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "The original failed run, its attempts and its fingerprints stay exactly as they were recorded."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
function StaticRepairPanel() {
  return /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
    className: "space-y-5",
    children: [
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "border-b border-zinc-100 pb-4",
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "flex items-start justify-between gap-4",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
                className: "min-w-0",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h2", {
                    className: "truncate text-lg font-semibold tracking-tight text-zinc-900",
                    children: "Meeting reminder"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                    className: "mt-0.5 text-sm text-zinc-500",
                    children: [
                      "Email (action 1) \xB7 failed ",
                      new Date(cases[2].observed_at).toLocaleString()
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(StatusChip, {
                status: "awaiting_owner"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "mt-4 flex flex-wrap items-center gap-3",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("button", {
                type: "button",
                className: "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800",
                children: "Open Meeting reminder"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                className: "rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600",
                children: "invalid_action_inputs"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(Section, {
        title: "What support asked you to fix",
        description: "Written by a person, not by a model.",
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "text-sm text-zinc-800",
            children: "Add the email subject in step 1. Nothing else needs to change."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-2 text-xs text-zinc-600",
            children: [
              "Missing: ",
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                className: "font-medium text-zinc-800",
                children: "Subject"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "border-b border-zinc-100 pb-4",
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h3", {
            className: "text-[13px] font-semibold tracking-tight text-zinc-900",
            children: "Fix the step"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-0.5 text-xs text-zinc-500",
            children: "This step needs a fix before it can run again."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
            className: "mt-3 space-y-4",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("label", {
                className: "block space-y-1.5",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                    className: "text-sm font-medium text-zinc-800",
                    children: "To"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                    className: "block text-xs text-zinc-500",
                    children: "Required"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("textarea", {
                    rows: 1,
                    readOnly: true,
                    className: "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900",
                    value: "customer@example.invalid"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("label", {
                className: "block space-y-1.5",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                    className: "text-sm font-medium text-zinc-800",
                    children: "Subject"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                    className: "block text-xs text-zinc-500",
                    children: "Required"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("textarea", {
                    rows: 1,
                    readOnly: true,
                    className: "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900",
                    value: ""
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                className: "rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500",
                children: "Credentials such as Bot token are never shown here and are left unchanged."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
                className: "text-xs text-amber-700",
                children: "Fill in Subject before saving."
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
                className: "flex flex-wrap items-center gap-3",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("button", {
                    type: "button",
                    disabled: true,
                    className: "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white opacity-60",
                    children: "Save changes"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                    className: "text-xs text-zinc-500",
                    children: "No unsaved changes"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "border-b border-zinc-100 pb-4",
        children: [
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h3", {
            className: "text-[13px] font-semibold tracking-tight text-zinc-900",
            children: "Tell support you are done"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("p", {
            className: "mt-0.5 text-xs text-zinc-500",
            children: "Only your own Zap configuration changes. The original failed run and its evidence are kept."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("label", {
            className: "mt-3 block space-y-1.5",
            children: [
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                className: "text-sm font-medium text-zinc-800",
                children: "Note for support"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("span", {
                className: "block text-xs text-zinc-500",
                children: "Optional"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("textarea", {
                rows: 3,
                readOnly: true,
                className: "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900",
                value: ""
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("button", {
            type: "button",
            disabled: true,
            className: "mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white opacity-60",
            children: "Submit repair completion"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var engineeringPane = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ThreePane, {
    index: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
      title: "Engineering queue",
      count: String(engineeringCases.length),
      state: { kind: "ready", rows: engineeringCases },
      toTicket: (item) => ({
        caseId: item.case_id,
        summary: `${item.stage === 0 ? "Trigger" : `Action ${item.stage}`} \xB7 ${item.safe_code}`,
        status: "With engineering",
        tone: "engineering",
        observedAt: item.observed_at,
        ownerLabel: `Owner ${item.subject_owner_id}`,
        safeCode: item.safe_code
      }),
      onSelect: () => {},
      selectedCaseId: engineeringCases[0].case_id
    }, undefined, false, undefined, this),
    main: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(EngineeringWorkspace, {
      caseId: engineeringCases[0].case_id,
      capabilities: { isSupportOperator: false, isEngineer: true }
    }, undefined, false, undefined, this),
    aside: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0",
      children: [
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("h2", {
          className: "text-[13px] font-semibold text-zinc-900",
          children: "What this workspace can and cannot do"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("ul", {
          className: "mt-2 space-y-2",
          children: [
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "You can record findings and return the case to support, or resolve it with an explanation."
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "The evidence room reads the captured failure and the attempt ledger. Input validation is not authorized for this role."
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("li", {
              children: "Replay approval, request and dispatch are support-operator surfaces."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var errors = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex w-[1440px] flex-col gap-6 bg-[#fffdf9] p-6",
  children: [
    /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "rounded-lg border border-zinc-200 bg-white",
      children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(PaneNotice, {
        tone: "alert",
        title: "The support queue could not load",
        detail: "Triage service unavailable. Nothing is cached from a previous read."
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this),
    /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "rounded-lg border border-zinc-200 bg-white",
      children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(PaneNotice, {
        tone: "alert",
        title: "Support access is required",
        detail: "This account cannot open the support queue. Ask an administrator to grant the support operator role."
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this),
    /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "rounded-lg border border-zinc-200 bg-white",
      children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(PaneNotice, {
        tone: "alert",
        title: "Evidence access denied",
        detail: "Support operator permission required. Reloading will not change this; the permission is checked on every read."
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this),
    /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
      className: "rounded-lg border border-zinc-200 bg-white",
      children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(PaneNotice, {
        title: "Application eligibility",
        detail: "blocked \xB7 replay_limit, ungrounded_candidate \u2014 the panel states the policy denial rather than hiding the action."
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this)
  ]
}, undefined, true, undefined, this);
var mobileList = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[844px] w-[390px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
    title: "Support queue",
    count: "4/4",
    state: { kind: "ready", rows: cases },
    toTicket,
    onSelect: () => {},
    search: { label: "Search cases", placeholder: "Case, run, owner or error code", value: "telegram", onChange: () => {} },
    collapsedOnNarrow: true
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var mobileDetail = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[844px] w-[390px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
    className: "min-h-0 flex-1 overflow-y-auto",
    children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(CaseFile, {
      identity,
      onBack: () => {},
      onOpenEvidence: () => {},
      work: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(ReplayLedger, {
        saved: blockedSaved,
        capabilities: deniedCapabilities,
        pending: false,
        onDecision: () => {},
        onDryRun: () => {},
        onRequestReplay: () => {}
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var mobileDrawer = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "relative h-[844px] w-[390px] overflow-hidden bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
    className: "absolute inset-0 flex flex-col justify-end",
    children: [
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "absolute inset-0 bg-zinc-900/30"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
        className: "relative flex h-[692px] flex-col overflow-hidden rounded-t-xl border-t border-zinc-200 bg-white",
        children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(EvidenceRoom, {
          caseId: cases[0].case_id,
          state: { kind: "ready", evidence },
          onReload: () => {},
          onClose: () => {},
          saved,
          diagnosis,
          initialTab: "execution"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this)
}, undefined, false, undefined, this);
var mobileOwner = /* @__PURE__ */ jsx_dev_runtime11.jsxDEV("div", {
  className: "flex h-[844px] w-[390px] flex-col bg-[#fffdf9]",
  children: /* @__PURE__ */ jsx_dev_runtime11.jsxDEV(TicketIndex, {
    title: "Your failures",
    count: String(ownerFailures.length),
    state: { kind: "ready", rows: ownerFailures },
    toTicket: (failure) => ({
      caseId: failure.caseId,
      zapName: failure.zapName,
      stepLabel: `${failure.stepLabel}${failure.safeCode ? ` \xB7 ${failure.safeCode}` : ""}`,
      summary: failure.stepLabel,
      status: failure.status === "awaiting_owner" ? "Needs your fix" : "With support",
      tone: failure.status === "awaiting_owner" ? "waiting" : "neutral",
      observedAt: failure.observedAt,
      safeCode: failure.safeCode
    }),
    onSelect: () => {}
  }, undefined, false, undefined, this)
}, undefined, false, undefined, this);
var sections = [
  { title: "Desktop \xB7 support workbench, three panes", note: "1440\xD7900", body: $renderToStaticMarkup(desktop) },
  { title: "Desktop \xB7 empty queue with the execution ledger", note: "1440\xD7900", body: $renderToStaticMarkup(desktopExecution) },
  { title: "Desktop \xB7 blocked eligibility and terminal unknown", note: "1440\xD7900", body: $renderToStaticMarkup(desktopBlocked) },
  { title: "Desktop \xB7 owner failures and repair", note: "1440\xD7820", body: $renderToStaticMarkup(ownerPane) },
  { title: "Desktop \xB7 engineering escalation", note: "1440\xD7900 \xB7 evidence loads in the browser only", body: $renderToStaticMarkup(engineeringPane) },
  { title: "Empty, error and denied states", note: "1440", body: $renderToStaticMarkup(errors) },
  { title: "Mobile \xB7 index", note: "390\xD7844", body: $renderToStaticMarkup(mobileList) },
  { title: "Mobile \xB7 case file and ledger", note: "390\xD7844", body: $renderToStaticMarkup(mobileDetail) },
  { title: "Mobile \xB7 evidence drawer", note: "390\xD7844", body: $renderToStaticMarkup(mobileDrawer) },
  { title: "Mobile \xB7 owner failures", note: "390\xD7844", body: $renderToStaticMarkup(mobileOwner) }
];
var css = readFileSync(join(root, "tailwind.css"), "utf8");
var html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 16G support surfaces \u2014 inspection</title>
<style>${css}</style>
<style>body{margin:0;font-family:var(--font-inter),ui-sans-serif,system-ui,sans-serif;background:#f4f4f5}</style>
</head>
<body>
${sections.map((section, index) => `<section id="s${index}" style="margin:24px auto;width:max-content">
  <p style="font:600 12px/1.4 ui-sans-serif;color:#52525b;margin:0 0 6px">${section.title} \u2014 ${section.note}</p>
  <div style="box-shadow:0 1px 2px rgba(0,0,0,.08);border:1px solid #e4e4e7;overflow:hidden;background:#fff">${section.body}</div>
</section>`).join(`
`)}
</body>
</html>`;
writeFileSync(join(root, "harness.html"), html);
writeFileSync(join(root, "harness-meta.json"), JSON.stringify({ sections: sections.map((s) => s.title) }, null, 2));
console.log(`wrote ${sections.length} sections to .impeccable/review/harness.html`);
