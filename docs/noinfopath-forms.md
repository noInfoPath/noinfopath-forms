# noinfopath.forms
@version 2.0.22

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

