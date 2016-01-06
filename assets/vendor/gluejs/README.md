

GLUEJS USAGE GUIDE


glueJS provides an integrated socket-based model and control environment for client-server Node applications. Once installed, glue cuts down the time and code required to integrate actions and objects across a distributed app, by exposing objects which are created and managed on the server, subscribed to via endpoints, and whose state is kept live across all subscribed endpoints.

glue also provides a distributed function mechanism, whereby any connected endpoint can trigger a function call on any and all other endpoints, simply and with little code. In an environment with ten tablets connected to a server running Node, with the tablet app containing a function called customAlert(alertText), each app - via glueJS - can trigger the customAlert() function on all other tablets simultaneously.

The final piece of the glue puzzle is synchronised events across connected endpoints. All Javascript developers use events somewhere in their code; they are a vital piece of the puzzle when building complex front-end code or apps built with Javascript. glueJS enables the developer to create system-wide event calls. Simply tell glue which code to fire when a certain event is called, and whenever any connected glue client tells the server to trigger that event, it will be fired everywhere that has subscribed to it.

glueJS can be used in Angular and standard Javascript applications.


USE WITH ANGULAR:

For the sake of accessibility across an Angular application - with all of its various scopes, services, controllers, factories and directives - glueJS uses $rootScope for all of its interactions with an Angular app. Any subscribed objects and functions that you want glueJS to trigger must be written in the $rootScope, or glueJS won't know where to look for your application's functions, and any objects that glueJS subscribes to won't have a fixed abode and therefore won't be accessible by other parts of your application.



INSTALLING GLUESERVER:

- include glueserver and sha1 folders in your Node app's node_modules folder (sha1 can be installed via npm)

- glueserver requires a socket.io instance - the installation of which is beyond the scope of this document

- launch the glueserver instance as follows:

var sha1 = require('sha1');
var GlueServer = require('glueserver');
glue = new GlueServer();
glue.sha1 = sha1;

glue.init();


- glueserver operates a whitelist-based approach to objects and functions in the system. In order to enable glue clients to trigger an event, or fire a function across endpoints, it has to be registered on the server.

To register and serialise a new object, in this example called 'displayAssets', your Node app should use the following statement:

glue.registerAllowedObject('displayAssets', false);
glue.updateObject('displayAssets', {});

Once this code fires, the object displayAssets can then be subscribed to from any connected glue client. Any change, update or deletion in the object is immediately reflected locally on the connected glue clients.

To register an allowed function, your Node app should use the following statement:

glue.registerAllowedFunction('testFunc', 'general');

The first variable is the name of the function, the second is the scope for this function. If set to 'general', this function can be fired anywhere. If set to 'remote', this function can only be fired on the Node server running glueserver.


- The final step for glueserver is to create a socket.on event in your code, which ensures glueserver can receive and transmit information when it needs to:

socket.on('glue message', function(msg){
  console.log('glue message: ' + msg);

  msg = JSON.stringify(msg, null, 4);
  $rootScope.glueClient.signalHandler(msg, io, socket);

});



INSTALLING GLUECLIENT:

- glueclient requires socket.io to be installed in the client app

- Include glueclient in your app:

<script src="assets/vendor/gluejs/glueclient.js"></script>

- Initialise the glueclient instance.

For Angular, this should be in the main controller for your app, and assigned to $rootScope:

$rootScope.glueClient = new GlueClient(socket.io, "$rootScope");
$rootScope.glueClient.init();

For standard Javascript, this would be declared as follows:

var glueClient = new GlueClient(socket.io, "window");
glueClient.init();


- It's up to you where this lives in your code, but as with glueserver, glueclient has to be injected with a socket.io object in order to talk to the server:

socket.on('glue message', function(msg){
  console.log('glue message: ' + msg);

  msg = JSON.stringify(msg, null, 4);
  $rootScope.glueClient.signalHandler(msg, io, socket);

});


- Once these steps have been followed, glueclient and glueserver should talk to each other once your apps have successfully launched.


SUBSCRIBING TO A GLUE OBJECT

- The displayAssets object we registered on the server earlier can now be subscribed to by our clients. Subscribing binds a local variable name to the glue object, and once bound, your code can treat the variable/array/object name as it would any other. glue does the magic in the background to ensure the local object is kept up-to-date with the central object:

$rootScope.displayAssets = $rootScope.glueClient.subscribeObject('displayAssets', 'displayAssets', false, false);

Those two false flags are dontUpdate and convertToArray, in that order. Their default values are false. dontUpdate creates a local snapshot-in-time of the remote object, and the local version won't ever be updated or changed regardless of what happens to the remote object. convertToArray stores the local object as an array instead of as a JSON object which is the default mode.

Once your app fires this code, if glue, socket and Node are working correctly, you now have a successfully subscribed glue object, synchronised between all connected endpoints and the server.


MANIPULATING A GLUE OBJECT

- Any connected glue client can manipulate the central object, with all changes reflected system-wide (unless dontUpdate flags true when subscribing an object). The main functions used to manipulate a glue object are:

.remoteAppend (objectName, itemToAppend)

This pushes a new item into an existing object. Say for example your displayAssets object contains many objects each representing a single display asset. remoteAppend is the function used to add a new display asset to the remote object displayAssets:

var newAssetObj = {
  "assetURI": "http://some.site/pics/pic-1.jpg"
};

$rootScope.glueClient.remoteAppend('displayAssets', newAssetObj);

This command will pass the new object to the glue server, which will then update the centrally held object and pass the new object out to all endpoints subscribed to this object. That includes the client which called the function itself (i.e the local client). So instead of manually pushing the new display asset into the local object *and* to glue, as the local object is bound to glue, pass the new object to glue and let glue update all subscribed endpoints including your local one.

If you add three new display assets to the empty displayAssets object, the object will look as follows across all connected endpoints:

"displayAssets": {
  "0" : {
    "assetURI": "http://some.site/pics/pic-1.jpg"
  },
  "1" : {
    "assetURI": "http://some.site/pics/pic-1.jpg"
  },
  "2" : {
    "assetURI": "http://some.site/pics/pic-1.jpg"
  }
}


.objectItemRemove (objectName, itemToRemove, isIndex)

This function tells glue to remove an item from a managed object. You can either pass the function the object you want removed, or, more efficiently pass it the index and set isIndex to true. For example:

$rootScope.glueClient.objectItemRemove('displayAssets', 5, true);

This command tells glue to remove item with the index 5 from the displayAssets object. This removal will be instantly replicated across all subscribed endpoints.


.updateObject (objectName, newObject)

This is a very powerful function which completely swaps out the existing object for a new one. In this example, the displayAssets object would be swapped out for an empty object across all subscribed endpoints. Any existing data held in the object would be permanently lost.

$rootScope.glueClient.objectUpdate('displayAssets', {});


.updateObjectNode (objectName, nodeIndex, newObject)

This function allows the glue client to change a single node of a glue object, across all subscribed endpoints as well as the server.


DISTRIBUTED FUNCTION CALLS WITH GLUE

- When we were setting up the glue server, we executed the following command, to register a system-wide function called testFunc():

glue.registerAllowedFunction('testFunc', 'general');


- Once a function is registered, it can be fired anywhere across all the clients. To trigger a system-wide function, from any glue client, use the following statement:

var someParams = {
  "a": 1,
  "b": 2
};

$rootScope.glueClient.functionGeneral('testFunc', someParams);

You can pass whatever parameters you need in funcParams. This will be passed through the glue server and out to all glue clients for immediate firing.


- The glue client will look for the triggered function in the codebase it's installed in, and if it is present, the function will be fired right there, with the parameters that were passed to it (if applicable). For example, the following function is on all clients:

var testFunc = function(params) {

  alert(params.a + params.b);

}

When the glue client functionGeneral() fires off, testFunc will create an alert box on every client which has this code present.



DISTRIBUTED EVENTS WITH GLUE

- glue has its own in-built event handler, which handles both custom events that you specify, and also its own internal helper events, which are designed to help your code react to what's happening inside glue.

- glue's internal events are:

"objectLoaded"

This event is triggered when an object is loaded by the glue client for the first time this session.


"objectAppend"

This event is triggered when a subscribed object is appended a new item.


"objectItemDelete"

This event is triggered when an item is removed from a subscribed object.


"objectUpdate"

This event is triggerd when an object is swapped for a new object.


- To react to an internal glue event, your code would work similarly to this:

$rootScope.glueClient.on('objectLoaded', function(params) {

  params = params.arguments;

  alert("object with the remote name: " + params.remoteObjectName + " was successfully loaded!");

});



- You can also create custom events, which are triggered centrally by glue server. A custom glue event can be created and triggered by any connected client. To create a new event, called someCustomEvent, the following code should be present on any client app which requires the event:

$rootScope.glueClient.on('someCustomEvent', function(params) {

  params = params.arguments;

  alert("The weather today is going to be " + params.weatherToday + ". Minimum temperature is " + params.minTemp + " and maximum temperature is " + params.maxTemp);

});


- To trigger an event across subscribed endpoints, use the following statement:

var eventParams = {
  "weatherToday": "rainy",
  "maxTemp": 22,
  "minTemp": 14
};

$rootScope.glueClient.eventGeneral('someCustomEvent', eventParams);
