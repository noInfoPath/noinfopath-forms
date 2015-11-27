//form-config.js
(function(angular, undefined) {
	"use strict";

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "noDataSource", "noLocalStorage", function($q, $http, $rootScope, noDataSource, noLocalStorage) {
			var isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
				dsConfig = {
					"dataProvider": "noIndexedDb",
					"databaseName": "NoInfoPath_dtc_v1",
					"entityName": "NoInfoPath_Forms",
					"primaryKey": "FormID"
				},
				dataSource;

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

			this.whenReady = function() {
				dataSource = noDataSource.create(dsConfig, $rootScope);

				return $q(function(resolve, reject) {

					$http.get("/no-forms.json")
						.then(function(resp) {
							var forms = resp.data,
								promises = [];

							dataSource.entity.clear()
								.then(function() {
									for (var f in forms) {
										var frm = forms[f];

										switch(f){
											case "editors":
												for (var e in frm) {
													var editor = frm[e];

													editor.search.shortName = "search_" + e;
													editor.search.routeToken = e;
													promises.push(dataSource.create(editor.search));

													editor.edit.shortName = "edit_" + e;
													editor.edit.routeToken = e;
													promises.push(dataSource.create(editor.edit));
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

			this.showNavBar = function(targetNavBar) {
				if (!targetNavBar) throw "targetNavBar is a required parameter";

				var el = angular.element("no-form, .no-search");
				el.find("[no-navbar]").addClass("ng-hide");
				el.find("[no-navbar='" + targetNavBar + "']").removeClass("ng-hide");

				//Make form readonly when required.
				switch (targetNavBar) {
					case this.navBarNames.READONLY:
						angular.element(".no-editor-cover").removeClass("ng-hide");
						break;
					case this.navBarNames.WRITEABLE:
					case this.navBarNames.CREATE:
						angular.element(".no-editor-cover").addClass("ng-hide");
						break;
				}

			};

			this.navBarNameFromState = function(stateName, id) {
				if (!stateName) throw "stateName is a required parameter";

				var navBar = "";

				switch (stateName) {
					case "vd.entity.search":
						navBar = "search";
						break;
					case "vd.entity.edit":
						navBar = id ? "readonly" : "create";
						break;
					default:
						navBar = "basic";
						break;
				}

				return navBar;
			};

		}]);
})(angular);
