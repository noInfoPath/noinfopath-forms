//form-config.js
(function(angular, undefined) {
	"use strict";

	/**
	 * @method NoFormConfigSync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig)
	 *
	 * `NoFormConfigSync` is a class that has multiple methods hanging off of it that assists on
	 * configuring route information from the no-forms.json file.
	 *
	 * @param
	 *
	 * |Name|Type|Description|
	 * |----|----|-----------|
	 * |$q|object|angular.js promise provider object|
	 * |$http|object|angular.js http provider object|
	 * |$rootScope|object|angular.js rootScope provider object|
	 * |$state|object|ui-router state provider object|
	 * |noDataSource|object|noInfoPath noDataSource object|
	 * |noLocalStorage|object|noInfoPath noLocalStorage object|
	 * |noConfig|object|noInfoPath noConfig object|
	 *
	 */
	 function NoFormConfigSync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig) {
 		var SELF = this,
 			isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
 			dataSource,
 			noNavBarConfig,
 			cacheNavBar = false,
 			indexes = {
 				"shortName": {},
 				"route.name+routeToken": {},
 				"route.name": {}
 			},
 			nextKey = 0;

 		this.navBarNames = {
 			BASIC: "basic",
 			SEARCH: "search",
 			READONLY: "readonly",
 			WRITEABLE: "writeable",
 			CREATE: "create"
 		};


 		/**
 		 * @method saveNoFormConfig(form)
 		 *
 		 * `saveNoFormConfig` saves the noForm configuration in local storage, and adds
 		 * the configuration to the noForm index object based on the routeKey.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |form|object|An noForm object loaded from no-forms.json|
 		 *
 		 */

 		function saveNoFormConfig(form) {
 			if(!form) throw "form is a required parameter";
 			var guid = "noForm_" + nextKey++;

 			indexes.shortName[form.shortName] = guid;
 			if(form.routeToken) indexes["route.name+routeToken"][form.route.name + "+" + form.routeToken] = guid;
 			indexes["route.name"][form.route.name] = guid;
 			noLocalStorage.setItem(guid, form);
 		}

 		/**
 		 * @method getFormConfig()
 		 *
 		 * `getFormConfig` checks to see if the routes from no-forms.json have
 		 * been configured, and if it has not, configures the routes found
 		 * within no-forms.json. It also saves some indexes into local storage.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns promise
 		 */
 		function getFormConfig(url) {
 			var promise;

 			/**
 			 * `getFormConfig` checks to see if the routes in no-forms.json are
 			 * configured.
 			 */
 			if(!noConfig.current.debug && isDbPopulated) {
 				promise = $q.when(true);
 			} else {
 				promise = $q(function (resolve, reject) {
 					$rootScope.noFormConfig = {};

 					$http.get(url || "no-forms.json")
 						.then(function (resp) {
 							var forms = resp.data;

 							/**
 							 * `getFormConfig` loops through each property in no-forms.json
 							 * and saves the route configuration in local storage based on
 							 * the routeKey.
 							 */
 							for(var f in forms) {
 								var frm = forms[f];

 								if(frm.areas) {
 									var areas = frm.areas;
 									for(var na in areas) {
 										var newForm = areas[na];

 										newForm.shortName = na;

 										saveNoFormConfig(newForm);
 									}
 								} else {
 									switch(f) {
 										case "editors":
 											for(var e in frm) {
 												var editor = frm[e];

 												editor.search.shortName = "search_" + e;
 												editor.search.routeToken = e;
 												saveNoFormConfig(editor.search);

 												if(editor.edit) {
 													editor.edit.shortName = "edit_" + e;
 													editor.edit.routeToken = e;
 													saveNoFormConfig(editor.edit);
 												}

 												if(editor.detail) {
 													editor.detail.shortName = "detail_" + e;
 													editor.detail.routeToken = e;
 													saveNoFormConfig(editor.detail);
 												}
 											}
 											break;
 										case "lookups":
 											for(var g in frm) {
 												var refed = frm[g];

 												refed.shortName = "lookup_" + g;
 												refed.routeToken = g;
 												saveNoFormConfig(refed);
 											}
 											break;
 										default:
 											frm.shortName = f;
 											saveNoFormConfig(frm);
 											break;
 									}
 								}
 							}

 							noLocalStorage.setItem("noForms_index_shortName", indexes.shortName);
 							noLocalStorage.setItem("noForms_index_route.name+routeToken", indexes["route.name+routeToken"]);
 							noLocalStorage.setItem("noForms_index_route.name", indexes["route.name"]);

 							noLocalStorage.setItem("dbPopulated_NoInfoPath_dtc_v1", {
 								timestamp: new Date()
 							});

 							resolve();
 						})
 						.catch(function (err) {

 							if(isDbPopulated) {
 								resolve();
 							} else {
 								reject(err);
 							}
 						});
 				});

 			}

 			return promise;
 		}

 		/**
 		 * @method getNavBarConfig()
 		 *
 		 * `getNavBarConfig` returns a promise that will eventually provide the
 		 * navBarConfig object.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns promise
 		 */
 		function getNavBarConfig(loadNavigation) {
			if(!loadNavigation) return $q.when({});

 			/**
 			 * `getNavBarConfig` checks if the cacheNavBar flag is true, it
 			 * attempts to load the noNavBarConfig from local storage before
 			 * performing a $http.get request.
 			 */
 			if(cacheNavBar) {
 				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");
 			}

 			/**
 			 * `getNavBarConfig` checks to see if noNavBarConfig was loaded from
 			 * local storage, and if it was not, it performs a $http.get request
 			 * to get the noNavBarConfig and then saves the configuration to
 			 * local storage.
 			 */
 			if(!noNavBarConfig) {
 				noNavBarConfig = $q(function (resolve, reject) {
 					$http.get("navbars/no-nav-bar.json")
 						.then(function (resp) {
 							noNavBarConfig = resp.data;
 							noLocalStorage.setItem("no-nav-bar", noNavBarConfig);
 							resolve(noNavBarConfig);
 						})
 						.catch(reject);
 				});
 			}

 			return $q.when(noNavBarConfig);
 		}

 		/**
 		 * `NoFormConfigSync` exposes noNavBarConfig as the property noNavBarRoutes
 		 */
 		Object.defineProperties(this, {
 			"noNavBarRoutes": {
 				"get": function () {
 					return noNavBarConfig;
 				}
 			}
 		});

 		/**
 		 * @method getRoute(routeKey, routeData)
 		 *
 		 * `getRoute` returns the form configuration based on the routeKey and routeData
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |routeKey|string|The key to query local storage|
 		 * |routeData|string|Route data that matches the routeKey format|
 		 *
 		 * @returns object
 		 */
 		function getRoute(routeKey, routeData) {
 			var requestInProgress = "requestInProgress",
 				indexKey = "noForms_index_" + routeKey,
 				//scopeKey = angular.isArray(routeData) ? routeData.join("").replace(/\./g, "") : routeData.replace(/\./g, ""),
 				//form = $rootScope.noFormConfig[scopeKey],
 				//isInProgress = form === requestInProgress,
 				//haveDataAlready = angular.isObject(form),
 				index = noLocalStorage.getItem(indexKey),
 				formKey = index[routeData],
 				formCfg = noLocalStorage.getItem(formKey);

 			return formCfg;
 		}

 		/**
 		 * @method navBarRoute(stateName)
 		 *
 		 * `navBarRoute` returns the route based on the stateName passed in, and
 		 * if there is no route found for the stateName, returns a default route.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |stateName|string|(Optional) A name of a state|
 		 *
 		 * @returns object
 		 */
 		function navBarRoute(state) {
 			var route = noInfoPath.getItem(state, "data.noNavBar");

 			if(!route && SELF.noNavBarRoutes) {
 				route = SELF.noNavBarRoutes[state.name];
 				route = route ? route : SELF.noNavBarRoutes[undefined];
 			}

 			return route;
 		}

 		/**
 		 * @method navBarEntityIDFromState(route, params)
 		 *
 		 * `navBarEntityIDFromState` returns the navbar id from the stateParams
 		 * passed in based on the route
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |route|object|A navBarRoute object|
 		 * |params|object|A ui-router stateParams object|
 		 *
 		 * @returns string
 		 */
 		function navBarEntityIDFromState(route, params) {
 			if(!route) throw "route is a required parameter";
 			if(!params) throw "params is a required parameter";

 			var id;

 			if(route.entityIdParam) {
 				id = params[route.entityIdParam];
 			}

 			return id;
 		}

 		/**
 		 * @method navBarNameFromState(state)
 		 *
 		 * `navBarNameFromState` returns the navbar name associated with a given
 		 * state and returns it.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |state|object|A ui-router state object|
 		 *
 		 * @returns string
 		 */
 		function navBarNameFromState(state) {
 			if(!state) throw "state is a required parameter";

 			var route = navBarRoute(state.current),
 				navBar = SELF.navBarKeyFromState(state.current),
 				id = navBarEntityIDFromState(route, state.params);

 			if(navBar === "edit") navBar = id ? "readonly" : "create";

 			return navBar;
 		}

 		/**
 		 * @method getFormByShortName(shortName) @deprecated
 		 *
 		 * `getFormByShortName` gets a form configuration based on the name of the route
 		 * passed in.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |shortName|string|Name of a route|
 		 *
 		 * @returns object
 		 */
 		function getFormByShortName(shortName) {
 			if(!shortName) throw "shortName is a required parameter";

 			return getRoute("route.name", shortName);
 		}

 		/**
 		 * @method getFormByRoute(routeName, entityName)
 		 *
 		 * `getFormByRoute` gets the route based on the routeName passed into
 		 * the function. Returns a form configuration object.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |routeName|string|The name of the route|
 		 * |entityName|string|(Optional) the entity name|
 		 *
 		 * @returns object
 		 */
 		function getFormByRoute(routeName, entityName) {
 			if(!routeName) throw "routeName is a require parameter";

 			if(entityName) { // This is here to prevent a regression.
 				return getRoute("route.name+routeToken", routeName + "+" + entityName);
 			} else {
 				return getRoute("route.name", routeName);
 			}
 		}

 		function _resolveDataSource(datasources, dsCfg) {
 			var ds;

 			if(dsCfg && dsCfg.dataProvider) {
 				ds = dsCfg;
 			} else {
 				ds = dsCfg ? datasources[dsCfg.name || dsCfg] : undefined;
 			}

 			if(!ds) return;

 			if(angular.isObject(dsCfg)) {
 				ds = angular.merge(dsCfg, ds);
 			} else {
 				ds.name = dsCfg;
 			}

 			if(!ds) throw "DataSource " + dsCfg.name + "was not found in the global datasources collection.";

 			return ds;
 		}

 		function getComponentContextByRoute(routeName, entityName, componentType, componentKey) {

 			var config = getFormByRoute($state.current.name, $state.params.entity) || {},
 				route = noInfoPath.getItem(config, "route"),
 				form = noInfoPath.getItem(config, "noForm"),
 				component = noInfoPath.getItem(config, componentKey),
 				widget = component ? component[componentType] : undefined,
 				primary = form.primaryComponent ? noInfoPath.getItem(form.noComponents, form.primaryComponent) : undefined,
 				datasources = config.noDataSources || {},
 				dsCfg;

 			if(primary) {
 				dsCfg = primary.noDataSource;
 			} else if(component) {
 				dsCfg = component.noDataSource;
 			}

 			return {
				routeName: routeName,
				entityName: entityName,
				componentType: componentType,
				componentKey: componentKey,
 				config: config,
 				route: route,
 				form: form,
 				component: component,
 				widget: widget,
 				primary: primary,
 				datasources: datasources,
 				datasource: _resolveDataSource(datasources, dsCfg),
 				resolveDataSource: _resolveDataSource.bind(null, datasources)
 			};
 		}

		function getComponentContextByNoid(screenName, dbName, noid) {
			var config = $rootScope.nacl.noScreens[screenName],
				route = { data: {} },
				noFormCfg = config.get(noid),
				form = noFormCfg.noComponent.noForm,
				component = noFormCfg.componentKey,
				datasources = $rootScope.nacl.noDataSources, // change to option
				dsCfg = form.noDataSource;


			return {
				screenName: screenName,
				dbName: dbName,
				noid: noid,
 				config: config,
 				route: route,
 				form: form,
 				component: component,
 				widget: undefined,
 				primary: undefined,
 				datasources: datasources,
 				datasource: datasources[dbName || "test"],
 				resolveDataSource: _resolveDataSource.bind(null, datasources)
 			};
		}

 		/**
 		 * @method whenReady()
 		 *
 		 * `whenReady` returns the navBarConfig object after ensuring that the formConfig
 		 * and the navBarConfig has been loaded.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns object
 		 */
 		function whenReady(url, loadNavigation) {
 			/*
 			 * `whenReady` sets a flag based on noConfig's configuration to load/save
 			 * navBar configuration in local storage.
 			 */
 			cacheNavBar = noConfig.current ? noConfig.current.noCacheNoNavBar : false;

 			return getFormConfig(url)
 				.then(getNavBarConfig.bind(null, loadNavigation))
 				.catch(function (err) {
 					console.log(err);
 				});
 		}

 		this.whenReady = whenReady;

 		this.getFormByShortName = getFormByShortName;

 		this.getFormByRoute = getFormByRoute;

 		this.getComponentContextByRoute = getComponentContextByRoute;

		this.getComponentContextByNoid = getComponentContextByNoid;

 		/**
 		 * @method navBarKeyFromState(stateName)
 		 *
 		 * `navBarKeyFromState` finds the navbar type associated with a given
 		 * state and returns it, and if there is not a navbar type, returns undefined
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |stateName|string|The name of the state to get the navBar type configured for it|
 		 *
 		 * @returns string || undefined
 		 *
 		 */
 		this.navBarKeyFromState = function (state) {
 			if(!state) throw "state is a required parameter";

 			var nbr = navBarRoute(state);
 			return nbr ? nbr.type : undefined;
 		};

 		/**
 		 * @method showNavBar(navBarName)
 		 *
 		 * `showNavBar` determines the navbar to display depending if a
 		 * navBarName has been passed into the function call, and defaults to
 		 * the navbar based on the current state if there was not.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |navBarName|string|(optional) The name of the navbar to be shown|
 		 *
 		 */
 		this.showNavBar = function (navBarName) {

 			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

 			/*
 			 * `showNavBar` hides all the navbars within the template and then
 			 * shows the nav bar that matches the targetNavBar.
 			 */
 			if(!!targetNavBar) {
 				var el = angular.element("no-nav-bar");
 				el.find("[no-navbar]").addClass("ng-hide");
 				el.find("[no-navbar='" + targetNavBar + "']").removeClass("ng-hide");
 			}

 			/*
 			 * `showNavBar` puts on a protective cover over the form when the
 			 * form is Read Only mode. When the mode is Writable or Create,
 			 * it removes the cover, enabling interaction with the form
 			 * components.
 			 */
 			var route = navBarRoute($state.current);

 			if(route.covers) {
 				if(route.covers[targetNavBar]) {
 					angular.element(".no-editor-cover").removeClass("ng-hide");
 				} else {
 					angular.element(".no-editor-cover").addClass("ng-hide");
 				}
 			} else {
 				switch(targetNavBar) {
 					case this.navBarNames.READONLY:
 						angular.element(".no-editor-cover").removeClass("ng-hide");
 						break;
 					case this.navBarNames.WRITEABLE:
 					case this.navBarNames.CREATE:
 						angular.element(".no-editor-cover").addClass("ng-hide");
 						break;
 				}
 			}
 		};

 		this.btnBarChange = function (btnBarID) {
 			var toID = noInfoPath.getItem($rootScope, "noFormConfig.curBtnBar"),
 				isEditing = noInfoPath.getItem($rootScope, "noFormConfig.isEditing");

 			if(toID === "editing" && !btnBarID) {
 				toID = noInfoPath.getItem($rootScope, "noFormConfig.curTab");
 			} else {
 				toID = btnBarID ? btnBarID : "default";
 			}


 			switch(btnBarID) {
 				case "editing":
 					noInfoPath.setItem($rootScope, "noFormConfig.isEditing", true);
 					break;
 				default:
 					if(isEditing) {
 						toID = "editing";
 					}
 					break;
 			}

 			noInfoPath.setItem($rootScope, "noFormConfig.curBtnBar", toID);
 			this.showNavBar(toID);
 		};

 	}

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "$state", "noDataSource", "noLocalStorage", "noConfig", NoFormConfigSync]);

})(angular);
