//form-config.js
(function(angular, undefined) {
	"use strict";

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "$state", "noDataSource", "noLocalStorage", function($q, $http, $rootScope, $state, noDataSource, noLocalStorage) {
			var SELF = this,
				isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
				dsConfig = {
					"dataProvider": "noIndexedDb",
					"databaseName": "NoInfoPath_dtc_v1",
					"entityName": "NoInfoPath_Forms",
					"primaryKey": "FormID"
				},
				dataSource,
				noNavBarConfig = {};

			this.navBarNames = {
				BASIC: "basic",
				SEARCH: "search",
				READONLY: "readonly",
				WRITEABLE: "writeable",
				CREATE: "create"
			};

			$rootScope.$on("noSubmit::success", function() {
				//Assume we are in edit mode.
				this.showNavBar(this.navBarNames.READONLY);
			}.bind(this));

			$rootScope.$on("noReset::click", function() {
				//Assume we are in edit mode.
				this.showNavBar(this.navBarNames.READONLY);
			}.bind(this));

			function getFormConfig() {
				return $q(function(resolve, reject) {

					$http.get("/no-forms.json")
						.then(function(resp) {
							var forms = resp.data,
								promises = [];

							dataSource.entity.clear()
								.then(function() {
									for (var f in forms) {
										var frm = forms[f];

										switch (f) {
											case "editors":
												for (var e in frm) {
													var editor = frm[e];

													editor.search.shortName = "search_" + e;
													editor.search.routeToken = e;
													promises.push(dataSource.create(editor.search));

													if(editor.edit){
														editor.edit.shortName = "edit_" + e;
														editor.edit.routeToken = e;
														promises.push(dataSource.create(editor.edit));
													}
												}
												break;
											case "lookups":
												for (var g in frm) {
													var refed = frm[g];

													refed.shortName = "lookup_" + g;
													refed.routeToken = g;
													promises.push(dataSource.create(refed));

												}
												break;
											default:
												frm.shortName = f;
												promises.push(dataSource.create(frm));
												break;
										}
									}

									$q.all(promises)
										.then(function() {
											noLocalStorage.setItem("dbPopulated_NoInfoPath_dtc_v1", {
												timestamp: new Date()
											});
											resolve();
										})
										.catch(reject);

								});

						})
						.catch(function(err) {

							if (isDbPopulated) {
								resolve();
							} else {
								reject(err);
							}
						});
				});
			}

			function getNavBarConfig() {
				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");

				if (!noNavBarConfig) {
					noNavBarConfig = $q(function(resolve, reject) {
						$http.get("navbars/no-nav-bar.json")
							.then(function(resp) {
								noNavBarConfig = resp.data;
								noLocalStorage.setItem("no-nav-bar", noNavBarConfig);
								resolve(noNavBarConfig);
							})
							.catch(reject);
					});
				}

				return $q.when(noNavBarConfig);
			}

			Object.defineProperties(this, {
				"noNavBarRoutes": {
					"get": function() {
						return noNavBarConfig;
					}
				}
			});

			this.whenReady = function() {
				dataSource = noDataSource.create(dsConfig, $rootScope);

				return getFormConfig()
					.then(getNavBarConfig)
					.catch(function(err) {
						console.log(err);
					});
			};

			this.getFormByShortName = function(shortName, scope) {
				var form = noInfoPath.getItem(scope, shortName),
					promise;

				if (form) {
					promise = $q.when(form);
				} else {
					promise = dataSource.entity
						.where("shortName")
						.equals(shortName)
						.toArray()
						.then(function(data) {
							form = data.length ? data[0] : undefined;
							scope[shortName] = form;
							return form;
						});
				}


				return promise;
			};

			this.getFormByRoute = function(routeName, entityName, scope) {
				var promise,
					routeKey = entityName ? routeName + entityName : routeName,
					form = scope[routeKey];

				if (form) {
					promise = $q.when(form);
				} else {
					if (entityName) {
						promise = dataSource.entity
							.where("[route.name+routeToken]")
							.equals([routeName, entityName])
							.toArray()
							.then(function(data) {
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					} else {
						promise = dataSource.entity
							.where("route.name")
							.equals(routeName)
							.toArray()
							.then(function(data) {
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					}

				}

				return promise;
			};


			function navBarRoute(stateName) {
				var route = SELF.noNavBarRoutes[stateName];

				route = route ? route : SELF.noNavBarRoutes[undefined];

				return route;
			}


			function navBarEntityIDFromState(route, params) {
				var id;

				if (route.entityIdParam) {
					id = params[route.entityIdParam];
				}

				return id;
			}

			function navBarNameFromState(state) {
				if (!state) throw "state is a required parameter";

				var route = navBarRoute(state.current.name),
					navBar = SELF.navBarKeyFromState(state.current.name),
					id = navBarEntityIDFromState(route, state.params);

				if (navBar === "edit") navBar = id ? "readonly" : "create";

				return navBar;
			}
			this.navBarKeyFromState = function(stateName) {
				var navBarKey = navBarRoute(stateName)
					.type;

				return navBarKey;
			};

			this.showNavBar = function(navBarName) {
				//if (!navBarKey) throw "navBarKey is a required parameter";

				var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

				var el = angular.element(".has-button-bar");
				el.find("[no-navbar]")
					.addClass("ng-hide");
				el.find("[no-navbar='" + targetNavBar + "']")
					.removeClass("ng-hide");

				//Make form readonly when required.
				switch (targetNavBar) {
					case this.navBarNames.READONLY:
						angular.element(".no-editor-cover")
							.removeClass("ng-hide");
						break;
					case this.navBarNames.WRITEABLE:
					case this.navBarNames.CREATE:
						angular.element(".no-editor-cover")
							.addClass("ng-hide");
						break;
				}
			};
		}]);
})(angular);
