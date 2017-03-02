# noinfopath.forms
@version 2.0.28

Implements the NoInfoPath Transaction processing in conjunction with AngularJS validation mechanism.


## noForm : Directive

> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.

### Attributes

|Name|Description|
|----|-----------|
|no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
|no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
|no-database|The location of the Tables or Collections that this form will read and write to.|
|no-datasource|The name of a table, view or collection contained in the database. The data source must expose a NoCRUD interface.|

##### Usage

 ```html

<div no-form no-provider="noIndexedDB" no-database="FCFNv2" no-datasoure="Cooperator">
	... other form elements ...
</div>

 ```
  OR

 ```html

 <div no-form="myform">
	... other form elements ...
</div>

 ```

### NoInfoPath Form Configuration

 When a NoInfoPath Form Configuration is used, it defines the semantics of
how data is read and written by the form. The following is an
example of how the configuration object is defined. Note that when
datasource is a `String` that it is the name of an entity on the
database.  When an obect it is instructions on how to proccess
multi-table relationships represented by the form.


##### Sample NoInfoPath Form Configuration

```json
{
	"myform": {
		"provider": "noWebSQL",
		"database": "FCFNv3",
		"datasource": {
			"create": [
				"Cooperators",
				"Addresses",
				"CooperatorAddresses":
				[
					"Cooperators",
					"Addresses"
				]

				],
			"read": "vwCooperator",
			"update": [
				"Cooperators",
				"Addresses"
				],
			"destroy": [
				"CooperatorAddresses",
				"Cooperators",
				"Addresses"
				]
			}
	}
}
```

## NoPromptService (noPrompt)

The noPrompt service shows and hides a UI blocking dialog box that can be customized to
display any kind of information require by an application.

### Methods

#### show(title, message, cb, options)

Displays the prompt configuring it with the parameters and options provided.

##### Parameters

|Name|Type|Description|
|----|----|-----------|
|title|String|The text that is displayed in the dialog boxes header sections|
|message|String|HTML or plain text that is displayed in the body of the dialog box.|
|cb|Function|A callback function that noPrompt will call when any button is clicked. In order for a button to trigger the  callback it must be decorated with special CSS classes.  (See `CSS Classes` section below)|
|options|Object|Allows for serveral optional setting to be provided.|

#### hide(to)

Hides the dialog box.  Hiding can be delayed by passing the `to` parameter.

|Name|Type|Description|
|----|----|-----------|
|to|Integer|The number of milliseconds to wait before closing the dialog.

### CSS classes

#### .btn-callback

When added to a `<button>` element causes noPrompt to execute the `callback`
function if provided.  If the provided HTML `message` contains buttons other than the
standard `OK` and `Cancel` buttons, adding this class will trigger the
provided `callback` function.

#### .btn-auto-hide

When added to a button with the `btn-callback` class, noPrompt will
call the `hide` method before executing the `callback` function.

#### .btn-no-auto-hide

When added to a button with the `btn-callback` class, prvents the call
call to the `hide` method.

### Options

|Name|Type|Description|
|----|----|-----------|
|height|String|Any valid CSS `min-height` value.  If ommited then `10%` is used.|
|scope|Object|Reference to the scope object associated with the context of the noPrompt callee.|
|showFooter|Object|When provided causes the noPrompt to display the footer section. Typically this used with an `OK` and/or `Cancel` button is desired.|
|showFooter.cancelLabel|String|Text to display on the button|
|showFooter.okAutoHide|Boolean|Adds the `.btn-auto-hide` class to the `OK` button|
|showFooter.okDisabled|Boolean|Adds the `ng-disabled` class to the `OK` button. Useful when the user must perform some activity before clicking the `OK` button.|
|showFooter.okLabel|String|Text to display on the `OK` button.|
|showFooter.okValue|String|Value to set on the `OK` button's `value` attribute. This useful for identifying which button was clicked during a call to the provided `callback` function.|
|showFooter.showCancel|Boolean|When `true` displays the `Cancel` button in the footer.|
|showFooter.showOK|Boolean|When `true` displays the `OK` button in the footer.|
|showFooter.okPubSub|Object|This is useful when you want to receive direct PubSub messages from the various NoInfoPath componets that publish events.  This is different from the AngularJS Digest method.|
|width|String|Any valid CSS `min-width` value.  If ommited then `60%` is used.|

### Examples

#### Simple Progress Bar

Displays the dialog box without the footer or any other buttons. Notice that
no callback function was provided, a `null` value was passed instead.

```js
	noPrompt.show(
		"Deletion in Progress",
		"<div><div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div></div>",
		null,
		{
			height: "15%"
		}
	);
```

#### Typical OK/Cancel Modal w/Callback Function

In this example the dialog box is displayed with the footer enabled and
the OK and Cancel buttons visible.  It implements the `callback` function.

```js
	noPrompt.show(
		"Confirm Permanent Deletion", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\"><b class=\"text-danger\">WARNING: THIS ACTION IS NOT REVERSABLE<br/>ALL USERS WILL BE AFFECTED BY THIS ACTION</b></div><div>Click OK to proceed, or Cancel to abort this operation.</div>",
		function(e){
			if($(e.target).attr("value") === "OK") {
				// ... do stuff if OK was clicked ...
			}
		},
		{
			showCloseButton: true,
			showFooter: {
				showCancel: true,
				cancelLabel: "Cancel",
				showOK: true,
				okLabel: "OK",
				okValue: "OK",
				okAutoHide: true
			},
			scope: scope,
			width: "60%",
			height: "35%",
		});
```

#### Complex Messaage w/Custom Buttons.

In this example a more complex message is provided to `noPrompt`.
It contains three custom buttons, and takes advantage of the auto hide feature.
Note that the buttons all have `.btn-callback` and `.btn-auto-hide` classed added to them.
```js
		noPrompt.show(
			"Confirm Deletion",
			"<div class=\"center-block\" style=\"font-size: 1.25em;\">Message Goes Here</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block btn-callback btn-auto-hide\" value=\"delete\">Permanently Delete Selected Items</button><button type=\"button\" class=\"btn btn-info btn-block btn-callback btn-auto-hide\" value=\"remove\">Removed Selected from this Device Only</button><button type=\"button\" class=\"btn btn-default btn-block btn-callback btn-auto-hide\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>",
			function(e){
				switch($(e.target).attr("value")) {
					case "remove":
						//... do stuff ...
						break;
					case "delete":
						//... do stuff ...
						break;
					default:
						break;
				}
			},
			{
				showCloseButton: true,
				scope: scope,
				width: "60%",
				height: "35%"
			}
		);
```

## noNavigation Directive

##### Sample navbar configuration

```json
"quantities": {
	"ngShow": "!project.$dirty",
	"class": "no-flex justify-left no-flex-item size-1",
	"components": [
		{
			"type": "button",
			"actions": [{
				"provider": "$state",
				"method": "go",
				"params": ["efr.client.search"],
				"noContextParams": true
			}],
			"class": "btn btn-default no-flex-item",
			"icon": {
				"class": "glyphicon glyphicon-arrow-left no-text"
			}
		}
	]
}
```

When a bar configuration is a string then it is an alias
or a reference to another bar configuration.

noNavigation sets up an AngularJS watch on the specific rows property
on the scope, and also captures and stores the watch's unregister method
for later use.

When the currentNavBar value  changes for a given row the
`noKendoHelpers.changeRowNavBarWatch` method is called to handle
the event.

#### @property noNavigation::bars

Creates a new `<navbar>` element for each navbar found in the
no-forms noNavigation.bars configuration node.

This directive adds a `bar-id` attribute to the `<navbar>` element using
each bars configuration key.

#### @property noNavigation::bar::class

It then appends any CSS class defined in the configuration.

#### @property noNavigation::default

noNavigation allows multiple bars to be defined, one bar is
always defined as the default. So if a bar is not the default
then add the AngularJS directive `ng-hide`.

#### @property noNavigation::bar::components

Each bar can have one or more components.  Currently supported
component types are `button` and `message`. Each component
is rendered, events wired up and then appended to its navbar.

#### @property noNavigation::scopeKey

noNavigation keeps track of the currently visible navbar using
an object called `noNavigation` that is store on Angular's scope.
The `scopeKey` property is used to uniquely identify a given
noNavigation instance on that noNavigation scope object.

noNavigation currently supports two distinct ways of using the
scopeKey property; either stand-alone or in conjunction with
a KendoUI Grid's RowUID.

#### @property noNavigation::useKendoRowDataUid

This property is used when you want to use a noNavigation directive
in a KendoUI Grid's column template. When this property is set to `true`
the rows `UID` is included in the `scopeKey` for the noNavigation
directive.

> Because AngularJS scopeKey don't like hyphens in their names,
> they are replaced with underscores.

Due to the specific behavior of KendoUI Grid, and inline row editing,
a way of detecting when they add and remove elements from a table
was needed.  Using the HTML5 `MutationObserver` accomplishes this
design goal. This is done by getting a reference to the `TBODY`
element that contains the grid rows, which will be the observers
"target." A new `MutationObserver` object is created giving it
a callback method that will provide an array of mutations. Each
mutation has a list of removed nodes and a list of added nodes.

When a KendoUI Grid is not involved, the noNavigation directive instead
subscribes to the `no-validation::dirty-state-changed` event published by
the noValidation directive.

### NoFormValidate


This class exists because of a bug with nested custom directives and
my apparent misunderstanding of how directives actaull work.  :(

## noErrors

The noErrors directive provides the container for applying the
BootStrap validation CSS, in response to AngularJS validation
attributes. The directive works in conjunction with with the noSubmit
and noReset directive.

It also provides compatibliy with Kendo UI controls and no-file-upload
component.


## noSubmit

When user clicks submit, checks to make sure the data is appropriate and returns an error if not.

### Events

The noSubmit directive will broadcast events on the root scope to notify
the implementor that the data submitted is valid.

#### noSubmit::dataReady

Raise when the data submmited has passed all validations. Along with the
standard event object, the broadcast also sends a reference to the element
that has the noSubmit directive attached to it, the scope, and a timestamp.


## noReset

When user clicks reset, form is reset to null state.

@method NoFormConfigSync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig)

`NoFormConfigSync` is a class that has multiple methods hanging off of it that assists on
configuring route information from the no-forms.json file.

@param

|Name|Type|Description|
|----|----|-----------|
|$q|object|angular.js promise provider object|
|$http|object|angular.js http provider object|
|$rootScope|object|angular.js rootScope provider object|
|$state|object|ui-router state provider object|
|noDataSource|object|noInfoPath noDataSource object|
|noLocalStorage|object|noInfoPath noLocalStorage object|
|noConfig|object|noInfoPath noConfig object|


@method saveNoFormConfig(form)

`saveNoFormConfig` saves the noForm configuration in local storage, and adds
the configuration to the noForm index object based on the routeKey.

@param

|Name|Type|Description|
|----|----|-----------|
|form|object|An noForm object loaded from no-forms.json|


@method getFormConfig()

`getFormConfig` checks to see if the routes from no-forms.json have
been configured, and if it has not, configures the routes found
within no-forms.json. It also saves some indexes into local storage.

@param

None

@returns promise

`getFormConfig` checks to see if the routes in no-forms.json are
configured.

`getFormConfig` loops through each property in no-forms.json
and saves the route configuration in local storage based on
the routeKey.

@method getNavBarConfig()

`getNavBarConfig` returns a promise that will eventually provide the
navBarConfig object.

@param

None

@returns promise

`getNavBarConfig` checks if the cacheNavBar flag is true, it
attempts to load the noNavBarConfig from local storage before
performing a $http.get request.

`getNavBarConfig` checks to see if noNavBarConfig was loaded from
local storage, and if it was not, it performs a $http.get request
to get the noNavBarConfig and then saves the configuration to
local storage.

`NoFormConfigSync` exposes noNavBarConfig as the property noNavBarRoutes

@method getRoute(routeKey, routeData)

`getRoute` returns the form configuration based on the routeKey and routeData

@param

|Name|Type|Description|
|----|----|-----------|
|routeKey|string|The key to query local storage|
|routeData|string|Route data that matches the routeKey format|

@returns object

@method navBarRoute(stateName)

`navBarRoute` returns the route based on the stateName passed in, and
if there is no route found for the stateName, returns a default route.

@param

|Name|Type|Description|
|----|----|-----------|
|stateName|string|(Optional) A name of a state|

@returns object

@method navBarEntityIDFromState(route, params)

`navBarEntityIDFromState` returns the navbar id from the stateParams
passed in based on the route

@param

|Name|Type|Description|
|----|----|-----------|
|route|object|A navBarRoute object|
|params|object|A ui-router stateParams object|

@returns string

@method navBarNameFromState(state)

`navBarNameFromState` returns the navbar name associated with a given
state and returns it.

@param

|Name|Type|Description|
|----|----|-----------|
|state|object|A ui-router state object|

@returns string

@method getFormByShortName(shortName) @deprecated

`getFormByShortName` gets a form configuration based on the name of the route
passed in.

@param

|Name|Type|Description|
|----|----|-----------|
|shortName|string|Name of a route|

@returns object

@method getFormByRoute(routeName, entityName)

`getFormByRoute` gets the route based on the routeName passed into
the function. Returns a form configuration object.

@param

|Name|Type|Description|
|----|----|-----------|
|routeName|string|The name of the route|
|entityName|string|(Optional) the entity name|

@returns object

@method whenReady()

`whenReady` returns the navBarConfig object after ensuring that the formConfig
and the navBarConfig has been loaded.

@param

None

@returns object

`whenReady` sets a flag based on noConfig's configuration to load/save
navBar configuration in local storage.

@method navBarKeyFromState(stateName)

`navBarKeyFromState` finds the navbar type associated with a given

@param

|Name|Type|Description|
|----|----|-----------|
|stateName|string|The name of the state to get the navBar type configured for it|



@method showNavBar(navBarName)

`showNavBar` determines the navbar to display depending if a
navBarName has been passed into the function call, and defaults to
the navbar based on the current state if there was not.

@param

|Name|Type|Description|
|----|----|-----------|
|navBarName|string|(optional) The name of the navbar to be shown|


`showNavBar` hides all the navbars within the template and then
shows the nav bar that matches the targetNavBar.

`showNavBar` puts on a protective cover over the form when the
form is Read Only mode. When the mode is Writable or Create,
it removes the cover, enabling interaction with the form
components.

