
`NoFormConfigSync` is a class that has multiple methods hanging off of it that assists on
configuring route information from the no-forms.json file.


|Name|Type|Description|
|----|----|-----------|
|$q|object|angular.js promise provider object|
|$http|object|angular.js http provider object|
|$rootScope|object|angular.js rootScope provider object|
|$state|object|ui-router state provider object|
|noDataSource|object|noInfoPath noDataSource object|
|noLocalStorage|object|noInfoPath noLocalStorage object|
|noConfig|object|noInfoPath noConfig object|



`saveNoFormConfig` saves the noForm configuration in local storage, and adds
the configuration to the noForm index object based on the routeKey.


|Name|Type|Description|
|----|----|-----------|
|form|object|An noForm object loaded from no-forms.json|



`getFormConfig` checks to see if the routes from no-forms.json have
been configured, and if it has not, configures the routes found
within no-forms.json. It also saves some indexes into local storage.


None


`getFormConfig` checks to see if the routes in no-forms.json are
configured.

`getFormConfig` loops through each property in no-forms.json
and saves the route configuration in local storage based on
the routeKey.


`getNavBarConfig` returns a promise that will eventually provide the
navBarConfig object.


None


`getNavBarConfig` checks if the cacheNavBar flag is true, it
attempts to load the noNavBarConfig from local storage before
performing a $http.get request.

`getNavBarConfig` checks to see if noNavBarConfig was loaded from
local storage, and if it was not, it performs a $http.get request
to get the noNavBarConfig and then saves the configuration to
local storage.

`NoFormConfigSync` exposes noNavBarConfig as the property noNavBarRoutes


`getRoute` returns the form configuration based on the routeKey and routeData


|Name|Type|Description|
|----|----|-----------|
|routeKey|string|The key to query local storage|
|routeData|string|Route data that matches the routeKey format|



`navBarRoute` returns the route based on the stateName passed in, and
if there is no route found for the stateName, returns a default route.


|Name|Type|Description|
|----|----|-----------|
|stateName|string|(Optional) A name of a state|



`navBarEntityIDFromState` returns the navbar id from the stateParams
passed in based on the route


|Name|Type|Description|
|----|----|-----------|
|route|object|A navBarRoute object|
|params|object|A ui-router stateParams object|



`navBarNameFromState` returns the navbar name associated with a given
state and returns it.


|Name|Type|Description|
|----|----|-----------|
|state|object|A ui-router state object|



`getFormByShortName` gets a form configuration based on the name of the route
passed in.


|Name|Type|Description|
|----|----|-----------|
|shortName|string|Name of a route|



`getFormByRoute` gets the route based on the routeName passed into
the function. Returns a form configuration object.


|Name|Type|Description|
|----|----|-----------|
|routeName|string|The name of the route|
|entityName|string|(Optional) the entity name|



`whenReady` returns the navBarConfig object after ensuring that the formConfig
and the navBarConfig has been loaded.


None


`whenReady` sets a flag based on noConfig's configuration to load/save
navBar configuration in local storage.


`navBarKeyFromState` finds the navbar type associated with a given


|Name|Type|Description|
|----|----|-----------|
|stateName|string|The name of the state to get the navBar type configured for it|




`showNavBar` determines the navbar to display depending if a
navBarName has been passed into the function call, and defaults to
the navbar based on the current state if there was not.


|Name|Type|Description|
|----|----|-----------|
|navBarName|string|(optional) The name of the navbar to be shown|


`showNavBar` hides all the navbars within the template and then
shows the nav bar that matches the targetNavBar.

`showNavBar` puts on a protective cover over the form when the
form is Read Only mode. When the mode is Writable or Create,
it removes the cover, enabling interaction with the form
components.

