/**
 * # noinfopath.forms
 * @version 1.2.2*
 *
 * Combines the functionality of validation from bootstrap and angular.
 *
 */
(function(angular, undefined) {
	"use strict";


	angular.module("noinfopath.forms", ["noinfopath"])

	;
})(angular);

//forms.js
(function(angular, undefined) {
	"use strict";

	function NoGrowler($timeout) {
		this.success = false;
		this.error = false;

		this.reset = function() {
			this.success = false;
			this.error = false;
		}.bind(this);

		this.growl = function(messageType, timeoutVal) {
			this[messageType] = true;
			$timeout(this.reset, timeoutVal || 5000);
		}.bind(this);
	}

	function NoGrowlerDirective($timeout) {

		function getTemplateUrl() {
			return "navbars/growler.html";
		}

		function _link(scope, el, attrs) {
			scope.noGrowler = new NoGrowler($timeout);
		}

		return {
			restrict: "E",
			templateUrl: getTemplateUrl,
			link: _link
		};
	}

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

				//_growl(scope, "yeah"); //TODO: refactor _growl into a service.
				scope.noGrowler.growl("success");

				var readOnly, primaryComponent, primaryComponentObject, entityName;

				if (config && config.noNavBar && config.noNavBar.scopeKey && config.noNavBar.scopeKey.readOnly) {
					primaryComponent = config.noForm.primaryComponent;
					readOnly = "noReset_" + primaryComponent;

					if (primaryComponent) {
						primaryComponentObject = config.noForm.noComponents[primaryComponent];
						entityName = primaryComponentObject.noDataSource.entityName;
						scope[readOnly] = angular.merge(scope[readOnly] || {}, results[entityName]);
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
				scope.noGrowler.growl("error");
			}

			function _save(config, _, e, elm, scope, timestamp) {
				if (scope.saveTimestamp == timestamp) {
					scope.saveTimestamp = undefined;
					return;
				} else {
					scope.saveTimestamp = timestamp;
				}

				console.log("noForm::_save", timestamp);
				e.preventDefault();
				var noForm = config.noForm,
					comp = noForm.noComponents[noForm.primaryComponent],
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
					data = scope[comp.scopeKey];

				noTrans.upsert(data)
					.then(_saveSuccessful.bind(null, noTrans, scope, _, config))
					.catch(_saveFailed.bind(null, scope));
			}

			// function _growl(scope, m) {
			// 	scope.noForm[m] = true;
			//
			// 	$timeout(function() {
			// 		scope.noForm = {
			// 			yeah: false,
			// 			boo: false
			// 		};
			// 	}, 5000);
			//
			// }

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

			function _finish(config, scope) {

				var primaryComponent;
				/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/

				var noForm = config.noForm;

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

				scope.$on("noSubmit::success", function(e, resp) {
					var nb = resp.config.noNavBar || resp.config.route.data.noNavBar;
					if (nb && nb.routes && nb.routes.afterSave) {
						if (angular.isObject(nb.routes.afterSave)) {
							var params = {};

							for (var pk in nb.routes.afterSave.params) {
								var param = nb.routes.afterSave.params[pk],
									prov = scope,
									val = noInfoPath.getItem(prov, param.property);

								params[param.name] = val;
							}

							$state.go(nb.routes.afterSave.toState, params);

						} else {
							$state.go(nb.routes.afterSave);
						}

					} else {
						//Assume we are in edit mode.
						this.showNavBar(this.navBarNames.READONLY);
					}
				}.bind(noFormConfig));

				scope.$on("noReset::click", function(config) {
					//Assume we are in edit mode.
					var nb = config.noNavBar;
					if (nb && nb.routes && nb.routes.afterSave) {
						$state.go(nb.routes.afterSave);
					} else {
						//Assume we are in edit mode.
						this.showNavBar(this.navBarNames.READONLY);
					}
				}.bind(noFormConfig, config));

			}

			function _link(scope, el, attrs, form, $t) {

				scope.$validator = form;


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

				_finish(noFormConfig.getFormByRoute($state.current.name, $state.params.entity), scope);

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

			function getTemplateUrl(el, attrs) {
				var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-kendo.html";
				return url;
			}

			function _compile(el, attrs) {
				var noForm = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);
				if (attrs.scopeKey) {
					var	html = el.html(),
						key = attrs.scopeKey.indexOf("{{") > -1 ? attrs.scopeKey.substr(2, attrs.scopeKey.length - 4) : attrs.scopeKey,
						scopeKey = noInfoPath.getItem(noForm, key);

					html = html.replace(/{scopeKey}/g, scopeKey);
					//console.log(html);
					el.html(html);
				}

				return _link.bind(null, noForm);
			}

			function _link(config, scope, el, attrs) {
				console.log("nrs");
				// function getTemplate() {
				// 	var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-kendo.html";
				//
				// 	//console.log(scope.noRecordStatsTemplate);
				//
				// 	if (scope.noRecordStatsTemplate) {
				// 		return $q.when(scope.noRecordStatsTemplate);
				// 	} else {
				// 		return $q(function(resolve, reject) {
				// 			$http.get(url)
				// 				.then(function(resp) {
				// 					scope.noRecordStatsTemplate = resp.data.replace(/{scopeKey}/g, attrs.scopeKey);
				// 					resolve(scope.noRecordStatsTemplate);
				// 				})
				// 				.catch(function(err) {
				// 					console.log(err);
				// 					reject(err);
				// 				});
				// 		});
				// 	}
				// }

				// function _finish(config) {
				// 	if (!config) throw "Form configuration not found for route " + $state.params.entity;
				//
				// 	getTemplate()
				// 		.then(function(template) {
				// 			var t = $compile(template)(scope);
				// 			el.html(t);
				// 		})
				// 		.catch(function(err) {
				// 			console.error(err);
				// 		});
				// }
				//
				// _finish();

			}



			var directive = {
				restrict: "E",
				link: _link,
				templateUrl: getTemplateUrl,
				compile: _compile
			};

			return directive;

			}])

		.directive("noGrowler", ["$timeout", NoGrowlerDirective]);


})(angular);

//navigation.js
(function(angular, undefined) {
	"use strict";
	var stateProvider;

	angular.module("noinfopath.forms")
		.config(["$stateProvider", function($stateProvider) {
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
					"home": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav);

						$state.go(route);
					},
					"back": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
							// params = {
							// 	entity: $state.params.entity
							// };
							params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
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

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if (!navFn) navFn = navFns["undefined"];

				//navFn(config.noNavBar.routes[navFnKey], $state.params);

				navFn(config.noNavBar || config.route.data.noNavBar);
			}

			config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope);

			el.click(click);


		}

		return {
			restrict: "A",
			scope: false,
			link: _link
		};
	}])

	.directive("noNavBar", ["$q", "$compile", "$http", "$state", "noFormConfig", function($q, $compile, $http, $state, noFormConfig) {
		var navNames = {
			search: "search",
			edit: "edit",
			basic: "basic"
		};

		function getTemplateUrl(elem, attr) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);

			var url = "navbars/no-navbar-basic.tpl.html",
				nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current.name);

			if (tplKey) {
				url = "navbars/no-navbar-" + tplKey + ".tpl.html";
			} else if (nbCfg && nbCfg.templateUrl) {
				url = nbCfg.templateUrl;
			}

			return url;
		}

		function getTemplate() {



			var nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current.name),
				tplUrl = templateUrl(tplKey, nbCfg);

			return $http.get(tplUrl)
				.then(function(resp) {
					html = resp.data;
					if (tplKey === navNames.edit) {
						html = html.replace(/{noNavBar\.scopeKey\.readOnly}/g, nbCfg.scopeKey.readOnly);
						html = html.replace(/{noNavBar\.scopeKey\.writeable}/g, nbCfg.scopeKey.writeable);
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

		function _link(scope, el, attrs) {
			noFormConfig.showNavBar();
		}

		function _compile(el, attrs) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity),
				writeable = el.find("[no-navbar='writeable']"),
				noReset = writeable.find("[no-reset='{{noNavBar.scopeKey.writeable}}']"),
				nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current.name);


			if (tplKey === navNames.edit) {
				noReset.attr("no-reset", nbCfg.scopeKey.writeable);
				// html = noReset.html().replace(/{noNavBar\.scopeKey\.readOnly}/g, );
				// html = noReset.html().replace(/{noNavBar\.scopeKey\.writeable}/g, nbCfg.scopeKey.writeable);
			}

			return _link;
		}

		return {
			restrict: "E",
			scope: false,
			compile: _compile,
			templateUrl: getTemplateUrl
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

	.service("noNavigation", ["$q", "$http", "$state", function($q, $http, $state) {
		this.configure = function() {
			return $q(function(resolve, reject) {
				var routes;

				function saveRoutes(resp) {
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates() {
					for (var r in routes) {
						var route = routes[r];

						route.data = angular.merge({
							entities: {}
						}, route.data);

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
	}]);
})(angular);

//validation.js
(function(angular, undefined) {
	"use strict";

	function _validate(el, field, label) {
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
			if (label) {
				label.toggleClass("has-error", field.$invalid);
				label.toggleClass("has-success", field.$valid);
			}
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
						var i = el.find("INPUT, TEXTAREA, SELECT, [ngf-drop]"),
							fld,
							lbl;

						if (!form) {
							form = new NoFormValidate(el);
						}

						fld = form[i.attr("name")];

						if (i.attr("type") === "hidden") {
							lbl = el.find("SPAN[required]");
						}

						scope.$on('no::validate', _validate.bind(null, el, fld, lbl));
						scope.$on('no::validate:reset', _resetErrors.bind(null, el, fld, lbl));
						i.bind('blur', _blur.bind(null, el, fld, lbl));
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
						$rootScope.$broadcast("noSubmit::dataReady", el, scope, new Date());
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
				var rsetKey = "noReset_" + attr.noReset,
					stopWatch;

				stopWatch = scope.$watch(attr.noReset, function(n, o, s) {
					if (n) {
						scope[rsetKey] = angular.copy(scope[attr.noReset]);
						stopWatch();
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

	function NoFormConfigAsync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig) {
		var SELF = this,
			isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
			dsConfig = {
				"dataProvider": "noIndexedDb",
				"databaseName": "NoInfoPath_dtc_v1",
				"entityName": "NoInfoPath_Forms",
				"primaryKey": "FormID"
			},
			dataSource,
			noNavBarConfig,
			cacheNavBar = false,
			indexes = {
				"shortName": {},
				"route.name+routeToken": {},
				"route.name": {}
			};

		this.navBarNames = {
			BASIC: "basic",
			SEARCH: "search",
			READONLY: "readonly",
			WRITEABLE: "writeable",
			CREATE: "create"
		};

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

									if (frm.areas) {
										var areas = frm.areas;
										for (var na in areas) {
											var newForm = areas[na];
											newForm.shortName = na;
											promises.push(dataSource.create(newForm));
										}
									} else {
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

													if (editor.detail) {
														editor.detail.shortName = "detail_" + e;
														editor.detail.routeToken = e;
														promises.push(dataSource.create(editor.detail));
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

			if (cacheNavBar) {
				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");
			}

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
			cacheNavBar = noConfig.current ? noConfig.current.noCacheNoNavBar : false;
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
			if (entityName) { // This is here to prevent a regression.
				return getRoute("[route.name+routeToken]", [routeName, entityName]);
			} else {
				return getRoute("route.name", routeName);
			}
		};

		function getRoute(routeKey, routeData) {
			var requestInProgress = "requestInProgress",
				scopeKey = angular.isArray(routeData) ? routeData.join("").replace(/\./g, "") : routeData.replace(/\./g, ""),
				form = $rootScope.noFormConfig[scopeKey],
				isInProgress = form === requestInProgress,
				haveDataAlready = angular.isObject(form),
				waitingFor;

			if (isInProgress) {
				return $q(function(resolve, reject) {
					waitingFor = $rootScope.$watch("noFormConfig." + scopeKey, function(n, o) {
						if (n && n !== requestInProgress) {
							waitingFor();
							resolve(n);
						}
					});
				});
			} else if (haveDataAlready) {
				return $q.when(form);
			} else {
				$rootScope.noFormConfig[scopeKey] = requestInProgress;
				return $q(function(resolve, reject) {
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
			var route;

			if (SELF.noNavBarRoutes) {
				route = SELF.noNavBarRoutes[stateName];
				route = route ? route : SELF.noNavBarRoutes[undefined];
			}

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
			var nbr = navBarRoute(stateName);
			return nbr ? nbr.type : undefined;
		};


		this.showNavBar = function(navBarName) {
			//if (!navBarKey) throw "navBarKey is a required parameter";

			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

			var el = angular.element("no-nav-bar");
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

	}

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

		function saveNoFormConfig(form) {
			var guid = "noForm_" + nextKey++;

			indexes.shortName[form.shortName] = guid;
			if (form.routeToken) indexes["route.name+routeToken"][form.route.name + "+" + form.routeToken] = guid;
			indexes["route.name"][form.route.name] = guid;
			noLocalStorage.setItem(guid, form);
		}

		function getFormConfig() {
			var promise;

			if (isDbPopulated) {
				promise = $q.when(true);
			} else {
				promise = $q(function(resolve, reject) {
					$rootScope.noFormConfig = {};

					$http.get("/no-forms.json")
						.then(function(resp) {
							var forms = resp.data;

							for (var f in forms) {
								var frm = forms[f];

								if (frm.areas) {
									var areas = frm.areas;
									for (var na in areas) {
										var newForm = areas[na];

										newForm.shortName = na;

										saveNoFormConfig(newForm);
									}
								} else {
									switch (f) {
										case "editors":
											for (var e in frm) {
												var editor = frm[e];

												editor.search.shortName = "search_" + e;
												editor.search.routeToken = e;
												saveNoFormConfig(editor.search);

												if (editor.edit) {
													editor.edit.shortName = "edit_" + e;
													editor.edit.routeToken = e;
													saveNoFormConfig(editor.edit);
												}

												if (editor.detail) {
													editor.detail.shortName = "detail_" + e;
													editor.detail.routeToken = e;
													saveNoFormConfig(editor.detail);
												}
											}
											break;
										case "lookups":
											for (var g in frm) {
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
						.catch(function(err) {

							if (isDbPopulated) {
								resolve();
							} else {
								reject(err);
							}
						});
				});

			}

			return promise;
		}

		function getNavBarConfig() {

			if (cacheNavBar) {
				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");
			}

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
			cacheNavBar = noConfig.current ? noConfig.current.noCacheNoNavBar : false;

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
			if (entityName) { // This is here to prevent a regression.
				return getRoute("route.name+routeToken", routeName + "+" + entityName);
			} else {
				return getRoute("route.name", routeName);
			}
		};

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

		function navBarRoute(stateName) {
			var route;

			if (SELF.noNavBarRoutes) {
				route = SELF.noNavBarRoutes[stateName];
				route = route ? route : SELF.noNavBarRoutes[undefined];
			}

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
			var nbr = navBarRoute(stateName);
			return nbr ? nbr.type : undefined;
		};

		this.showNavBar = function(navBarName) {
			//if (!navBarKey) throw "navBarKey is a required parameter";

			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

			var el = angular.element("no-nav-bar");
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

	}

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "$state", "noDataSource", "noLocalStorage", "noConfig", NoFormConfigSync]);

})(angular);
