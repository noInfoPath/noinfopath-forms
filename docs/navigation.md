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

