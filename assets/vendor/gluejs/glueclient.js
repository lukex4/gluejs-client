
/*

GlueJS provides an integrated event, object, and function handler across multiple devices and client-server-client environments.

GlueClient - Version 0.1.1 (beta).
Developed by Luke Cohen.

*/

'use strict';

var GlueClient = function(socketObj, generalScope){


  /* internal variables and objects */

  var socket = socketObj;
  var generalScope = generalScope;
  var $body, $rootScope;
  var scopeSet = 0;

  var cons = true;

  this.subscribedObjects = {};
  this.restrictedFunctions = {};
  this.eventHandlers = {};
  this.sessionKey = "";
  this.curKey = "";

  /* / */


  /* initialise */
  this.init = function() {
    cons && console.log("init");

    /* set the scope: */
    if (generalScope.length==0) {

      generalScope = "window";
      scopeSet = 1;

      cons && console.log("generalScope -> window", window);

    }

    if (generalScope == "$rootScope") {

      $body = angular.element(document.body);
      $rootScope = $body.scope().$root;

      scopeSet = 1;

      cons && console.log("generalScope -> $body", $body);
      cons && console.log("generalScope -> $rootScope", $rootScope);

    }

  };
  /* / */


  /* set an event listener */
  this.on = function(events, handler) {

    var handlers = this.eventHandlers;

    each(events.split(","), function(event){
      event = event.trim();

      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    })

    cons && console.log("eventHandlers", this.eventHandlers);

    return this;

  }
  /* / */


  /* subscribe to a remote object */
  this.subscribeObject = function(objectName, localObjectName, dontUpdate, convertToArray) {
    cons && console.log("subscribeObject", objectName, localObjectName);

    if (isRelName(objectName) && isRelName(localObjectName)) {

      if (this.subscribedObjects[objectName]) {

        cons && console.log("remote object already subscribed");

      } else {

        if (typeof dontUpdate !== 'boolean') {
          dontUpdate = false;
        }

        if (typeof convertToArray !== 'boolean') {
          convertToArray = false;
        }

        var newObj = {};
        newObj.localObjectName = localObjectName;
        newObj.remoteObjectName = objectName;
        newObj.dontUpdate = dontUpdate;
        newObj.objectLoaded = false;
        newObj.convertToArray = convertToArray;

        this.subscribedObjects[objectName] = newObj;

        cons && console.log("this.subscribedObjects after new object subscribed", this.subscribedObjects);

        var msg = {
          "messageType": "fetchObject",
          "object": {
            "objectName": objectName
            }
        };

        socket.emit('glue message', JSON.stringify(msg));

      }

    } else {

      return false;

    }

  };
  /* / */


  /* unsubscribe an object */
  this.unsubscribeObject = function(objectName, destroyLocal) {
    cons && console.log("unsubscribeObject", objectName);

    if (isRelName(objectName) && this.subscribedObjects[objectName]) {

      if (typeof destroyLocal !== 'boolean') {
        destroyLocal = false;
      }

      delete this.subscribedObjects[objectName];

      if (destroyLocal == true) {

        switch(generalScope) {

          case "$rootScope":

            if ($rootScope[objectName]) {
              delete $rootScope[objectName];
            }

          break;

          case "window":

            if (window[objectName]) {
              delete window[objectName]
            }

          break;

        }

      }

      cons && console.log("this.subscribedObjects after unsubscribe", this.subscribedObjects);

    } else {

      return false;

    }

  }
  /* / */


  /* unsubscribes all objects */
  this.unsubscribeAll = function() {
    cons && console.log("unsubscribeAll");

    if (this.subscribedObjects) {

      cons && console.log("this.subscribedObjects before unsubscribeAll", this.subscribedObjects);

      for (var key in this.subscribedObjects) {

        switch(generalScope) {

          case "$rootScope":

            if ($rootScope[key]) {
              delete $rootScope[key];
              delete this.subscribedObjects[key];
            }

          break;

          case "window":

            if (window[key]) {
              delete window[key]
              delete this.subscribedObjects[key];
            }

          break;

        }

      }

      cons && console.log("this.subscribedObjects after unsubscribeAll", this.subscribedObjects);

    }

  };
  /* / */


  /* swaps a bound object for another, on the same local object */
  this.changeSubscribedObject = function(oldRemoteObject, newRemoteObject, localObjectName) {
    cons && console.log("changeSubscribedObject", oldRemoteObject, newRemoteObject, localObjectName);

    if (isRelName(oldRemoteObject) && isRelName(newRemoteObject) && isRelName(localObjectName) && this.subscribedObjects[localObjectName]) {

      cons && console.log("this.subscribedObjects before change", this.subscribedObjects);

      this.subscribedObjects[localObjectName].objectLoaded = false;
      this.subscribedObjects[localObjectName].remoteObjectName = newRemoteObject;

      var msg = {
        "messageType" : "fetchObject",
        "object" : {
          "objectName" : newRemoteObject
          }
      };

      socket.emit('glue message', JSON.stringify(msg));

      cons && console.log("this.subscribedObjects after change", this.subscribedObjects);

    } else {

      return false;

    }

  };
  /* / */


  /* appends to a remote object */
  this.remoteAppend = function(objectName, itemToAppend) {
    cons && console.log("remoteAppend", objectName, itemToAppend);

    if (isRelObject(itemToAppend) && isRelName(objectName)) {

      var msg = {
        "messageType" : "objectAppend",
        "object" : {
          "objectName" : objectName
        },
        "objectAddition" : itemToAppend
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* updates a remote object - swaps the current remote object for a whole new object */
  this.updateObject = function(objectName, newObject) {
    cons && console.log("updateObject", objectName, newObject);

    if (isRelName(objectName) && isRelObject(newObject)) {

      var msg = {
        "messageType": "updateObject",
        "objectName": objectName,
        "newObject": newObject
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* updates a specific node of a remote object */
  this.updateObjectNode = function(objectName, nodeIndex, newObject) {
    cons && console.log("cons", objectName, nodeIndex, newObject);

    if (isRelName(objectName) && isRelObject(newObject)) {

      var msg = {
        "messageType": "updateObjectNode",
        "objectName": objectName,
        "nodeIndex": nodeIndex,
        "newObject": newObject
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* deletes from a remote object */
  this.objectItemRemove = function(objectName, itemToRemove, isIndex) {
    cons && console.log("objectItemRemove", itemToRemove, isIndex);

    if (typeof isIndex !== 'boolean') {
      isIndex = false;
    }

    if (isRelName(objectName)) {

      if (isIndex === true && isNaN(itemToRemove)) {
        return false;
      }

      if (isIndex === false && isRelObject(itemToRemove) === false) {
        return false;
      }

      var msg = {
        "messageType" : "objectItemDelete",
        "objectName" : objectName,
        "itemToDelete" : itemToRemove,
        "isIndex" : isIndex
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* fire a function on the server only and await response */
  this.functionServer = function(funcName, funcParams) {
    cons && console.log("functionServer", funcName, funcParams);

    /* fires off a remote function request */
    var msg = {
      "messageType": "functionServer",
      "functionName": funcName,
      "functionParams": funcParams
    };

    socket.emit('glue message', JSON.stringify(msg));

  };
  /* / */


  /* requests a lock on remote object, if it exists and if it isn't yet locked */
  this.requestLockObject = function(objectName) {
    cons && console.log("requestLockObject", objectName);


  };
  /* / */


  /* triggers an event locally */
  this.triggerEvent = function(eventName, eventParams) {
    cons && console.log("triggerEvent", eventName, eventParams);

    var handles = this.eventHandlers[eventName] && this.eventHandlers[eventName].slice();

    if (handles) {

      var i = 0;
      var data = {};

      data.type = eventName;

      data.preventDefault = function() {
          data.srcEvent.preventDefault();
      };

      data.arguments = eventParams;

      while (i < handles.length) {
          handles[i](data);
          i++;
      }

    } else {

      return false;

    }

  };


  /* send the signal to trigger a system-wide event */
  this.eventGeneral = function(eventName, eventParams) {
    cons && console.log("eventGeneral", eventName);

    if (isRelName(eventName)) {

      if (isRelObject(eventParams) === false) {
        eventParams = {};
      }

      var msg = {
        "messageType" : "triggerEvent",
        "eventName" : eventName,
        "eventParams" : eventParams
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* sends the signal to fire a function wherever it exists across clients */
  this.functionGeneral = function(funcName, funcParams) {
    cons && console.log("functionGeneral", funcName, funcParams);

    if (isRelName(funcName)) {

      if (isRelObject(funcParams) === false) {
        funcParams = {};
      }

      var msg = {
        "messageType" : "triggerFunction",
        "functionName" : funcName,
        "functionParams" : funcParams
      };

      socket.emit('glue message', JSON.stringify(msg));

    } else {

      return false;

    }

  };
  /* / */


  /* processes and triggers based on received socket message */
  this.signalHandler = function(message, ioObj, socketObj) {
    cons && console.log("signalHandler", message);

    if (checkStringJSON(message)) {
      message = JSON.parse(message);
    }

    switch(message.messageType) {

      case 'eventTriggered':
        cons && console.log("execute: eventTriggered");

        var eventName = message.eventName;

        if (this.eventHandlers[eventName]) {
          cons && console.log('triggering event: ' + eventName);

          var handles = this.eventHandlers[eventName] && this.eventHandlers[eventName].slice();

          var data = {};

          data.type = eventName;
          data.preventDefault = function() {
              data.srcEvent.preventDefault();
          };

          var i = 0;
          while (i < handles.length) {
              handles[i](data);
              i++;
          }

        }

      break;

      case 'functionTriggered':
        cons && console.log("execute: functionTriggered");

        var functionName = message.functionName;
        var functionParams = message.functionParams;

        switch(generalScope) {

          case "$rootScope":

            if ($rootScope[functionName] && typeof $rootScope[functionName] === "function") {
              $rootScope[functionName](functionParams);
            }

          break;

          case "window":

            if (window[functionName] && typeof window[functionName] === "function") {
              window[functionName](functionParams);
            }

          break;

        }

      break;

      case 'loadedObject':
        cons && console.log("execute: loadedObject", this.subscribedObjects[message.objectName]);

        if (this.subscribedObjects[message.objectName] &&  this.subscribedObjects[message.objectName].objectLoaded == false) {

          var theObjName = message.objectName;
          var localObjName = this.subscribedObjects[theObjName].localObjectName;
          var convertToArray = this.subscribedObjects[theObjName].convertToArray;

          var theObj = message.object;

          switch(generalScope) {

            case "$rootScope":
              cons && console.log("applying object to $rootScope");

              if (convertToArray === true) {

                var newArray = [];

                for (var key in theObj) {
                  newArray.push(theObj[key]);
                }

                $rootScope[localObjName] = newArray;
                $rootScope.$apply();

                this.subscribedObjects[theObjName].objectLoaded = true;

                var eventParams = {
                  "localObjectName": localObjName,
                  "remoteObjectName": theObjName
                };

                this.triggerEvent('objectLoaded', eventParams);

                cons && console.log("$rootScope[" + localObjName + "]", $rootScope[localObjName]);
                cons && console.log("this.subscribedObjects", this.subscribedObjects);

              } else {

                $rootScope[localObjName] = theObj;
                $rootScope.$apply();
                this.subscribedObjects[theObjName].objectLoaded = true;

                var eventParams = {
                  "localObjectName": localObjName,
                  "remoteObjectName": theObjName
                };

                this.triggerEvent('objectLoaded', eventParams);

                cons && console.log("$rootScope[" + localObjName + "]", $rootScope[localObjName]);
                cons && console.log("this.subscribedObjects", this.subscribedObjects);

              }

            break;

            case "window":
              cons && console.log("applying object to window");

              if (convertToArray === true) {

                var newArray = [];

                for (var key in theObj) {
                  newArray.push(theObj[key]);
                }

                window[localObjName] = newArray;
                this.subscribedObjects[theObjName].objectLoaded = true;

                var eventParams = {
                  "localObjectName": localObjName,
                  "remoteObjectName": theObjName
                };

                this.triggerEvent('objectLoaded', eventParams);

              } else {

                window[localObjName] = theObj;
                this.subscribedObjects[theObjName].objectLoaded = true;

                var eventParams = {
                  "localObjectName": localObjName,
                  "remoteObjectName": theObjName
                };

                this.triggerEvent('objectLoaded', eventParams);

              }

              cons && console.log("window[" + localObjName + "]", window[localObjName]);

            break;

          }

        }

      break;


      case 'objectLocked':
      break;


      case 'objectLockReleased':
      break;


      case 'objectAppend':
        cons && console.log("execute: objectAppend", message, this.subscribedObjects[message.objectName], this.subscribedObjects);

        var objectName = message.objectName;
        var objectAddition = message.objectAddition;

        if (this.subscribedObjects[objectName] && this.subscribedObjects[objectName].dontUpdate === false) {

          var localObjectName = this.subscribedObjects[objectName].localObjectName;
          var convertToArray = this.subscribedObjects[objectName].convertToArray;

          switch(generalScope) {

            case "$rootScope":

              cons && console.log("local object before append (" + localObjectName + "): ", $rootScope[localObjectName]);

              if (convertToArray === true) {

                var newArray = $rootScope[localObjectName];
                newArray.push(objectAddition);

                $rootScope.$apply();

                this.triggerEvent('objectAppend', localObjectName);

              } else {

                if (!Object.keys($rootScope[localObjectName]).length) {

                  $rootScope[localObjectName][0] = objectAddition;
                  $rootScope.$apply();

                  this.triggerEvent('objectAppend', localObjectName);

                } else {

                  $rootScope[localObjectName][Object.keys($rootScope[localObjectName]).length] = objectAddition;
                  $rootScope.$apply();

                  this.triggerEvent('objectAppend', localObjectName);

                }

              }

              cons && console.log("local object after append (" + localObjectName + "): ", $rootScope[localObjectName]);

            break;

            case "window":

              if (convertToArray === true) {

                var newArray = window[localObjectName];
                newArray.push(objectAddition);

                this.triggerEvent('objectAppend', localObjectName);

              } else {

                if (!Object.keys(window[localObjectName]).length) {

                  window[localObjectName][0] = objectAddition;
                  this.triggerEvent('objectAppend', localObjectName);

                } else {
                  window[localObjectName][Object.keys(window[localObjectName])] = objectAddition;
                  this.triggerEvent('objectAppend', localObjectName);

                }

              }

            break;

          }

        } else {

          return false;

        }

      break;

      case 'objectItemDelete':
        cons && console.log("execute: objectItemDelete", message);

        var objectName = message.objectName;
        var itemToDelete = message.itemToDelete;
        var isIndex = message.isIndex;

        if (isIndex === true && isNaN(itemToDelete)) {
          return false;
        }

        if (isIndex !== true && isRelObject(itemToDelete) === false) {
          return false;
        }


        if (this.subscribedObjects[objectName] && this.subscribedObjects[objectName].dontUpdate === false) {

          var localObjectName = this.subscribedObjects[objectName].localObjectName;

          switch(generalScope) {

            case "$rootScope":

              cons && console.log("local object before delete (" + localObjectName + "): ", $rootScope[localObjectName]);

              if (isIndex === true) {

                delete $rootScope[localObjectName][itemToDelete];
                $rootScope.$apply();

                this.triggerEvent('objectItemDelete', localObjectName);

              } else {

                for (var key in $rootScope[localObjectName]) {
                  if ($rootScope[localObjectName][key] == itemToDelete) {

                    delete $rootScope[localObjectName][key];
                    $rootScope.$apply();

                    this.triggerEvent('objectItemDelete', localObjectName);

                  }
                }

              }

              cons && console.log("local object after delete (" + localObjectName + "): ", $rootScope[localObjectName]);

            break;

            case "window":

              cons && console.log("local object before delete (" + localObjectName + "): ", window[localObjectName]);


              if (isIndex === true) {

                delete window[localObjectName][itemToDelete];
                this.triggerEvent('objectItemDelete', localObjectName);

              } else {

                for (var key in window[localObjectName]) {
                  if (window[localObjectName][key] == itemToDelete) {

                    delete window[localObjectName][key];
                    this.triggerEvent('objectItemDelete', localObjectName);

                  }
                }

              }

              cons && console.log("local object after delete (" + localObjectName + "): ", window[localObjectName]);

            break;

          }

        }

      break;

      case 'objectUpdate':
        cons && console.log("execute: objectUpdate", message);

        var objectName = message.objectName;
        var updatedObject = message.object;

        if (this.subscribedObjects[objectName] && this.subscribedObjects[objectName].dontUpdate === false) {

          var localObjectName = this.subscribedObjects[objectName].localObjectName;

          switch(generalScope) {

            case "$rootScope":

              cons && console.log("local object before update (" + localObjectName + "): ", $rootScope[localObjectName]);

              $rootScope[localObjectName] = updatedObject;
              $rootScope.$apply();

              cons && console.log("objectUpdate: $rootScope[" + localObjectName + "]", $rootScope[localObjectName]);

            break;

            case "window":

              cons && console.log("local object before update (" + localObjectName + "): ", window[localObjectName]);

              window[localObjectName] = updatedObject;

              cons && console.log("objectUpdate: window[" + localObjectName + "]", window[localObjectName]);

            break;

          }

        }

      break;

      case 'objectNodeUpdate':
        cons && console.log('objectNodeUpdate');

        var objectName = message.objectName;
        var nodeIndex = message.nodeIndex;
        var updatedObject = message.updatedNodeObject;

        if (this.subscribedObjects[objectName] && this.subscribedObjects[objectName].dontUpdate === false) {

          var localObjectName = this.subscribedObjects[objectName].localObjectName;

          switch(generalScope) {

            case "$rootScope":

              cons && console.log(localObjectName + "[" + nodeIndex + "] before update: ", $rootScope[localObjectName][nodeIndex]);

              $rootScope[localObjectName][nodeIndex] = updatedObject;
              $rootScope.$apply();

              cons && console.log(localObjectName + "[" + nodeIndex + "] after update: ", $rootScope[localObjectName][nodeIndex]);

            break;

            case "window":

              cons && console.log(localObjectName + "[" + nodeIndex + "] before update: ", window[localObjectName][nodeIndex]);

              window[localObjectName][nodeIndex] = updatedObject;

              cons && console.log(localObjectName + "[" + nodeIndex + "] after update: ", window[localObjectName][nodeIndex]);

            break;

          }

        }

      break;

    }

  };


  /* helper functions */
  var isRelName = function(nameToCheck) {
    cons && console.log("isRelName", nameToCheck);

    if (typeof nameToCheck === 'string' && /^([a-zA-Z0-9_-]+)$/i.test(nameToCheck) === true) {
      return true;
    } else {
      return false;
    }

  };


  var checkStringJSON = function(jsonToTest) {
    cons && console.log("checkStringJSON", jsonToTest);

    if (jsonToTest) {

      try {
        JSON.parse(jsonToTest);
        return true;
      } catch(e) {
        return false;
      }

    } else {
      return false;
    }

  };


  var isRelObject = function(objectToTest) {
    cons && console.log("isRelObject", objectToTest);

    if (typeof objectToTest === 'object') {
      return true;
    } else {
      return checkStringJSON(objectToTest);
    }

  };


  var extend = function(obj, src) {

    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }

    return obj;

  };

  function each(obj, iterator, context) {
      var i;

      if (!obj) {
          return;
      }

      if (obj.forEach) {
          obj.forEach(iterator, context);
      } else if (obj.length !== undefined) {
          i = 0;
          while (i < obj.length) {
              iterator.call(context, obj[i], i, obj);
              i++;
          }
      } else {
          for (i in obj) {
              obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
          }
      }
  }


};
