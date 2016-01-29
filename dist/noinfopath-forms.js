/**
* # noinfopath.forms
* @version 1.0.17
*
* Combines the functionality of validation from bootstrap and angular.
*
*/
	(function(angular,undefined){
	"use strict";


	angular.module("noinfopath.forms", ["noinfopath"])

	;
})(angular);

//forms.js
(function(angular, undefined) {
	"use strict";

	angular.module("noinfopath.forms")
		/*
		 *	## noForm : Directive
		 *
		 *	> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.
		 *
		 *	### Attributes
		 *
		 *	|Name|Description|
		 *	|----|-----------|
		 *	|no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
		 *	|no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
		 *	|no-database|The location of the Tables or Collections that this form will read and write to.|
		 *	|no-datasource|The name of a table, view or collection contained in the database. The data source must expose a NoCRUD interface.|
		 *
		 *	##### Usage
		 *
		 *  ```html
		 *
		 *	<div no-form no-provider="noIndexedDB" no-database="FCFNv2" no-datasoure="Cooperator">
		 *		... other form elements ...
		 *	</div>
		 *
		 *  ```
		 *   OR
		 *
		 *  ```html
		 *
		 *  <div no-form="myform">
		 *		... other form elements ...
		 *	</div>
		 *
		 *  ```
		 *
		 *	### NoInfoPath Form Configuration
		 *
		 *  When a NoInfoPath Form Configuration is used, it defines the semantics of
		 *	how data is read and written by the form. The following is an
		 *	example of how the configuration object is defined. Note that when
		 *	datasource is a `String` that it is the name of an entity on the
		 *	database.  When an obect it is instructions on how to proccess
		 *	multi-table relationships represented by the form.
		 *
		 *
		 *	##### Sample NoInfoPath Form Configuration
		 *
		 *	```json
		 *	{
		 *		"myform": {
		 *			"provider": "noWebSQL",
		 *			"database": "FCFNv3",
		 *			"datasource": {
		 *				"create": [
		 *					"Cooperators",
		 *					"Addresses",
		 *					"CooperatorAddresses":
		 *					[
		 *						"Cooperators",
		 *						"Addresses"
		 *					]
		 *
		 * 				],
		 *				"read": "vwCooperator",
		 *				"update": [
		 *					"Cooperators",
		 *					"Addresses"
		 * 				],
		 *				"destroy": [
		 *					"CooperatorAddresses",
		 *					"Cooperators",
		 *					"Addresses"
		 * 				]
		 * 			}
		 *		}
		 *	}
		 *	```
		 */
		.directive("noForm", ['$timeout', '$q', '$state', '$injector', 'noConfig', 'noFormConfig', 'noLoginService', 'noTransactionCache', 'lodash', function($timeout, $q, $state, $injector, noConfig, noFormConfig, noLoginService, noTransactionCache, _) {

			function _saveSuccessful(noTrans, scope, _, config, results) {

				_growl(scope, "yeah"); //TODO: refactor _growl into a service.

				var readOnly, primaryComponent, primaryComponentObject, entityName;

				if (config && config.noNavBar && config.noNavBar.scopeKey && config.noNavBar.scopeKey.readOnly){
					primaryComponent = config.noForm.primaryComponent;
					readOnly = "noReset_" + primaryComponent;

					if(primaryComponent){
						primaryComponentObject = config.noForm.noComponents[primaryComponent];
						entityName = primaryComponentObject.noDataSource.entityName;
						scope[readOnly] = angular.merge(scope[readOnly], results[entityName]);
					}
				}

				noTransactionCache.endTransaction(noTrans);
				scope.$emit("noSubmit::success", {
					config: config,
					data: results,
					state: $state
				});
			}

			function _saveFailed(scope, err) {
				console.error(err);
				_growl(scope, "boo");
			}

			function _save(config, _, e, elm, scope) {
				var noForm = config.noForm,
					comp = noForm.noComponents[noForm.primaryComponent],
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
					data = scope[comp.scopeKey];

				noTrans.upsert(data)
					.then(_saveSuccessful.bind(null, noTrans, scope, _, config))
					.catch(_saveFailed.bind(null, scope));
			}

			function _growl(scope, m) {
				scope.noForm[m] = true;

				$timeout(function() {
					scope.noForm = {
						yeah: false,
						boo: false
					};
				}, 5000);

			}

			function _notify(scope, _, noForm, routeParams, e, data) {
				//console.log(noForm, routeParams, data);

				var comp = noForm.noComponents[noForm.primaryComponent],
					pkFilter = _.find(comp.noDataSource.filter, {
						field: comp.noDataSource.primaryKey
					}),
					routeID = routeParams[pkFilter.value.property],
					isSameEntity = comp.noDataSource.entityName === data.tableName,
					isSameRecord = routeID === data.values[pkFilter.field];

				if (isSameEntity && isSameRecord) {
					if (confirm("External change detected, would you like to reload this record")) {
						scope[comp.scopeKey] = data.values;
					}
				}
			}

			function _link(scope, el, attrs, form, $t) {
				var noForm;

				scope.$validator = form;

				noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
					.then(function(config) {

						var primaryComponent;
						/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/

						noForm = config.noForm;

						for (var c in config.noComponents) {
							var comp = config.noComponents[c];

							if (comp.scopeKey) {
								if (config.primaryComponent !== comp.scopeKey || (config.primaryComponent === comp.scopeKey && config.watchPrimaryComponent)) {
									scope.waitingFor[comp.scopeKey] = true;
								}
							}

						}

						scope.$on("noSubmit::dataReady", _save.bind(null, config, _));

						scope.$on("noSync::dataReceived", _notify.bind(null, scope, _, noForm, $state.params));
					});

				scope.waitingFor = {};
				scope.noFormReady = false;
				scope.noForm = {
					yeah: false,
					boo: false
				};

				var releaseWaitingFor = scope.$watchCollection("waitingFor", function(newval, oldval) {
					var stillWaiting = false;
					for (var w in scope.waitingFor) {
						if (scope.waitingFor[w]) {
							stillWaiting = true;
							break;
						}
					}

					scope.noFormReady = !stillWaiting;

					if (scope.noFormReady) releaseWaitingFor();

				});

			}

			return {
				restrict: "E",
				//controller: [function(){}],
				//transclude: true,
				scope: false,
				require: "?^form",
				link: _link
			};
		}])

	.directive("noRecordStats", ["$q", "$http", "$compile", "noFormConfig", "$state", function($q, $http, $compile, noFormConfig, $state) {
		function _link(scope, el, attrs) {

			function getTemplate() {
				var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-kendo.html";

				//console.log(scope.noRecordStatsTemplate);

				if (scope.noRecordStatsTemplate) {
					return $q.when(scope.noRecordStatsTemplate);
				} else {
					return $q(function(resolve, reject) {
						$http.get(url)
							.then(function(resp) {
								scope.noRecordStatsTemplate = resp.data.replace(/{scopeKey}/g, attrs.scopeKey);
								resolve(scope.noRecordStatsTemplate);
							})
							.catch(function(err) {
								console.log(err);
								reject(err);
							});
					});
				}
			}

			function _finish(config) {
				if (!config) throw "Form configuration not found for route " + $state.params.entity;

				getTemplate()
					.then(function(template) {
						var t = $compile(template)(scope);
						el.html(t);
					})
					.catch(function(err) {
						console.error(err);
					});
			}

			noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
				.then(_finish)
				.catch(function(err) {
					console.error(err);
				});
		}



		var directive = {
			restrict: "E",
			link: _link

		};

		return directive;

	}])

	;


})(angular);

//navigation.js
(function(angular, undefined) {
	"use strict";
	var stateProvider;

	angular.module("noinfopath.forms")
		.config(["$stateProvider", function($stateProvider){
			stateProvider = $stateProvider;
		}])

		.run(["$rootScope", function($rootScope) {
			$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
				//console.log("$stateChangeSuccess");
				event.currentScope.$root.noNav = event.currentScope.$root.noNav ? event.currentScope.$root.noNav : {};
				event.currentScope.$root.noNav[fromState.name] = fromParams;
			});

		}])

	.directive("noNav", ["$q", "$state", "noFormConfig", function($q, $state, noFormConfig) {

		function _link(scope, el, attrs) {
			var navFns = {
					"home": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav);

						$state.go(route);
					},
					"back": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav),
							// params = {
							// 	entity: $state.params.entity
							// };
							params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav),
							params = scope.$root.noNav[route];

						params = params ? params : {};

						params.entity = $state.params.entity;
                        if (attrs.noNav === "new" && route == "vd.entity.edit") {
                            params.id = "";
                        } else {
                            params = $state.params;
                        }

						//console.log(route, params);
						if (route) $state.go(route, params);

					},
					"kendo-new-row": function() {
						scope.noGrid.addRow();
					},
					"undo": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.READONLY);
					},
					"undefined": function() {}
				},
				config, html;

			function saveConfig(c) {
				config = c;
				//console.log(config);
				return $q.when(config);
			}

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if (!navFn) navFn = navFns["undefined"];

				//navFn(config.noNavBar.routes[navFnKey], $state.params);
				navFn();
			}

			function finish() {
				el.click(click);
			}

			noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
				.then(saveConfig)
				.then(finish)
				.catch(function(err) {
					console.error(err);
				});


		}

		return {
			restrict: "A",
			scope: false,
			link: _link
		};
	}])

	.directive("noNavBar", ["$q", "$compile", "$http", "$state", "noFormConfig", function($q, $compile, $http, $state, noFormConfig) {
		var routeNames = {
				search: "vd.entity.search",
				edit: "vd.entity.edit",
				trialSummary: "vd.observations.trialplot",
				observationsEdit: "vd.observations.editor",
				observationsNew: "vd.observations.new"
			},
			navNames = {
				search: "search",
				edit: "edit",
				basic: "basic"
			};

		function _link(scope, el, attrs) {
			var config, html;

			function saveConfig(c) {
				config = c;
				//console.log(config);
				return $q.when(config);
			}

			function getTemplate() {

				function templateUrl(tplKey) {
					return "navbars/no-navbar-" + tplKey + ".tpl.html";
				}

				var tplKey = noFormConfig.navBarKeyFromState($state.current.name),
					tplUrl = templateUrl(tplKey);

				return $http.get(tplUrl)
					.then(function(resp) {
						html = resp.data;
						if (tplKey === navNames.edit) {
							html = html.replace(/{noNavBar\.scopeKey\.readOnly}/g, config.noNavBar.scopeKey.readOnly);
							html = html.replace(/{noNavBar\.scopeKey\.writeable}/g, config.noNavBar.scopeKey.writeable);
						}
						html = $compile(html)(scope);
						el.html(html);
						return;
					})
					.catch(function(err) {
						if (err.status === 404) {
							throw "noFormConfig could not locate the file `navbars/no-nav-bar.json`.";
						} else {
							throw err;
						}
					});

			}

			function finish() {
				noFormConfig.showNavBar();
			}

			noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
				.then(saveConfig)
				.then(getTemplate)
				.then(finish)
				.catch(function(err) {
					console.error(err);
				});
		}

		return {
			restrict: "E",
			scope: false,
			link: _link
		};
	}])

	.directive("noReadOnly", [function() {
		function _link(scope, el, attrs) {
			el.append("<div class=\"no-editor-cover\"></div>");
		}

		return {
			restrict: "A",
			link: _link
		};
	}])

	.service("noNavigation", ["$q", "$http", "$state", function($q, $http, $state){
		this.configure = function(){
			return $q(function(resolve, reject){
				var routes;

				function saveRoutes(resp){
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates(){
					for(var r in routes){
						var route = routes[r];

						route.data = { entities: {} };

						stateProvider.state(route.name, route);
					}

					resolve();
				}

				$http.get("navbars/routes.json")
					.then(saveRoutes)
					.then(configureStates)
					.catch(reject);
			});
		};
	}])
	;
})(angular);

//validation.js
(function(angular, undefined) {
	"use strict";

	function _validate(el, field) {
		if (!field) return;

		var t = el.find(".k-editor"),
			h = el.find(".help-block");

		h.toggleClass("ng-hide", field.$valid || field.$pristine);
		if (t.length > 0) {
			t.closest("div").parent().toggleClass("has-error", field.$invalid);
			t.closest("div").parent().toggleClass("has-success", field.$invalid);
			t.toggleClass("has-error", field.$invalid);
			t.toggleClass("has-success", field.$valid);
		} else {
			el.toggleClass("has-error", field.$invalid);
			el.toggleClass("has-success", field.$valid);
		}
	}


	function _resetErrors(el, field) {
		el.find(".help-block").toggleClass("ng-hide", true);
		el.toggleClass("has-error", false);
		el.toggleClass("has-success", false);
	}


	function _blur(el, field) {
		if (!field.$pristine) _validate(el, field);
	}

	/*
		### NoFormValidate

		This class exists because of a bug with nested custom directives and
		my apparent misunderstanding of how directives actaull work.  :(
	*/
	function NoFormValidate(el) {
		Object.defineProperties(this, {
			"$valid": {
				"get": function() {
					return el.closest("[ng-form]").hasClass("ng-valid");
				}
			},
			"$invalid": {
				"get": function() {
					return el.closest("[ng-form]").hasClass("ng-invalid");
				}
			},
			"$pristine": {
				"get": function() {
					return el.closest("[ng-form]").hasClass("ng-pristine");
				}
			}
		});

		this.$setPristine = function() {
			el.closest("[ng-form]").addClass("ng-pristine");

		};
	}

	angular.module("noinfopath.forms")
		/**
		 * ## noErrors
		 *
		 * The noErrors directive provides the container for applying the
		 * BootStrap validation CSS, in response to AngularJS validation
		 * attributes. The directive works in conjunction with with the noSubmit
		 * and noReset directive.
		 *
		 * It also provides compatibliy with Kendo UI controls and no-file-upload
		 * component.
		 *
		 */
		.directive('noErrors', [function() {
			return {
				restrict: 'A',
				require: '?^^form',
				compile: function(el, attrs) {
					var i = el.find("INPUT, TEXTAREA, SELECT, [ngf-drop]");
					i.attr("name", i.attr("ng-model"));

					return function(scope, el, attrs, form) {

						if (!form) {
							form = new NoFormValidate(el);
						}

						scope.$on('no::validate', _validate.bind(null, el, form[i.attr("name")]));
						scope.$on('no::validate:reset', _resetErrors.bind(null, el, form[i.attr("name")]));
						i.bind('blur', _blur.bind(null, el, form[i.attr("name")]));
					};
				}
			};
		}])

		/**
		 * ## noSubmit
		 *
		 * When user clicks submit, checks to make sure the data is appropriate and returns an error if not.
		 */
		.directive('noSubmit', ['$injector', '$rootScope', function($injector, $rootScope) {
			return {
				restrict: "A",
				require: "?^form",
				link: function(scope, el, attr, form) {
					console.info("Linking noSubmit");
					if (!form) {
						form = new NoFormValidate(el);
					}

					function _submit(form, e) {
						e.preventDefault();

						if (form.$valid) {
							$rootScope.$broadcast("noSubmit::dataReady", el, scope);
						} else {
							$rootScope.$broadcast("no::validate", form.$valid);
						}
					}

					var tmp = _submit.bind(null, form);
					el.click(tmp);
				}
			};
		}])

		/**
		 * ## noReset
		 *
		 * When user clicks reset, form is reset to null state.
		 */
		.directive('noReset', ['$rootScope', function($rootScope) {
			return {
				restrict: "A",
				require: "?^^form",
				scope: false,
				link: function(scope, el, attr, ctrl) {
					var rsetKey = "noReset_" + attr.noReset;

					scope.$watch(attr.noReset, function(n, o, s) {
						if (n) {
							scope[rsetKey] = angular.copy(scope[attr.noReset]);
						}
					});

					function _reset(form, e) {
						e.preventDefault();
						if (!form) {
							form = new NoFormValidate(el);
						}

						scope[attr.noReset] = scope[rsetKey];
						scope.$digest();

						$rootScope.$broadcast("noReset::click");
						form.$setPristine();
						$rootScope.$broadcast("no::validate:reset");
					}
					el.bind('click', _reset.bind(null, ctrl));
				}
			};
		}])

		.directive("noEnterKey", [function() {
			function _enterPressed(el, scope, attr) {
				el.bind("keypress", function(e) {
					var keyCode = e.which || e.keyCode;

					if (keyCode === 13) //Enter is pressed
					{
						var frm = el.closest("[no-form], [ng-form]");

						frm.find("[no-submit]").click(); //Assume that it is a button
					}
				});
			}

			function _link(scope, el, attr) {
				console.warn("This will be refactored into a different module in a future release");
				_enterPressed(el, scope);
			}

			var directive = {
				restrict: "A",
				link: _link
			};

			return directive;
		}])


	;
})(angular);

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
					$rootScope.noFormConfig = {};

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

													if (editor.edit) {
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

			this.getFormByShortName = function(shortName) {
				return getRoute("route.name", shortName);
			};

			this.getFormByRoute = function(routeName, entityName) {
				if(entityName){ // This is here to prevent a regression.
					return getRoute("[route.name+routeToken]", [routeName, entityName]);
				} else {
					return getRoute("route.name", routeName);
				}
			};

			function getRoute(routeKey, routeData){
				var requestInProgress = "requestInProgress",
					scopeKey = angular.isArray(routeData) ? routeData.join("").replace(/\./g,"") : routeData.replace(/\./g,""),
					form = $rootScope.noFormConfig[scopeKey],
					isInProgress = form === requestInProgress,
					haveDataAlready = angular.isObject(form),
					waitingFor;

				if(isInProgress) {
					return $q(function(resolve, reject){
						waitingFor = $rootScope.$watch("noFormConfig." + scopeKey, function(n, o){
							if(n && n !== requestInProgress){
								waitingFor();
								resolve(n);
							}
						});
					});
				} else if(haveDataAlready) {
					return $q.when(form);
				} else {
					$rootScope.noFormConfig[scopeKey] = requestInProgress;
					return $q(function(resolve, reject){
						dataSource.entity
							.where(routeKey)
							.equals(routeData)
							.toArray()
							.then(function(data) {
								form = data.length ? data[0] : undefined;
								$rootScope.noFormConfig[scopeKey] = form;
								resolve(form);
							});
					});
				}
			}

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
