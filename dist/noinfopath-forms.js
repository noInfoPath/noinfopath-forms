/**
 * # noinfopath.forms
 * @version 1.2.9
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

	function NoDataManagerService($q, $rootScope, noLoginService, noTransactionCache, noParameterParser) {
		function _initSession(ctx, scope) {
			console.log(ctx);
		}

		function _successful(ctx, resolve, newctx, data) {
			if(newctx.scope.noNavigation) {
				var navState = newctx.scope.noNavigation[newctx.ctx.component.scopeKey].validationState;
				navState.form.$setUntouched();
				navState.form.$setPristine();
				navState.form.$setSubmitted();
			}

			ctx.data = data;

			// if(ctx.form.noReset){
			// 	data.scope[ctx.form.primaryComponent + "Reset"] = angular.copy(data.scope[ctx.form.primaryComponent]);
			// }

			noTransactionCache.endTransaction(newctx.trans);

			resolve(ctx);
		}

		function _fault(ctx, reject, err) {
			ctx.error = err;
			reject(ctx);
		}

		function _save(ctx, scope, el, data) {

			return $q(function (resolve, reject) {
				var noForm = ctx.form,
					comp = noForm.noComponents[noForm.primaryComponent],
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
					newctx = {
						ctx: ctx,
						comp: comp,
						trans: noTrans,
						scope: scope
					};

				if(data.$valid) {
					noTrans.upsert(data)
						.then(_successful.bind(null, ctx, resolve, newctx))
						.catch(_fault.bind(null, ctx, reject, newctx));
				} else {
					reject("Form is invalid.");
				}
			});
		}

		function _undo(ctx, scope, el, dataKey, undoDataKey) {
			var data = noInfoPath.getItem(scope, dataKey),
				undoData = noInfoPath.getItem(scope, undoDataKey);

			console.log(data, undoData);

			return $q(function (resolve, reject) {
				resolve("undo code required.");
			});
		}

		function _cacheRead(cacheKey, dataSource) {

			var data = noInfoPath.getItem($rootScope, "noDataCache." + cacheKey),
				promise;

			if(dataSource.cache) {
				if(data) {
					promise = $q.when(data);
				} else {
					promise = dataSource.read()
						.then(function (ck, data) {
							noInfoPath.setItem($rootScope, "noDataCache." + cacheKey, data);
							return data;
						}.bind(null, cacheKey));
				}
			} else {
				promise = dataSource.read();
			}


			return promise;
		}

		this.save = _save;
		this.undo = _undo;
		this.initSession = _initSession;
		this.beginTransaction = _initSession;
		this.cacheRead = _cacheRead;
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

			function _saveSuccessful(noTrans, scope, _, config, comp, el, noSubmitTarget, results) {

				scope.noGrowler.growl("success");
				var resetButton = el.closest("no-form").find("no-nav-bar").children(":not(.ng-hide)").find("[no-reset]"),
					entityName = comp.noDataSource.entityName,
					readOnly, primaryComponent, primaryComponentObject;

				if (resetButton.attr("no-reset")) {
					readOnly = "noReset_" + resetButton.attr("no-reset");
					scope[readOnly] = angular.merge(scope[readOnly] || {}, results[entityName]);
				}

				// if (config && config.noNavBar && config.noNavBar.scopeKey && config.noNavBar.scopeKey.readOnly) {
				// 	primaryComponent = config.noForm.primaryComponent;
				// 	readOnly = "noReset_" + primaryComponent;
				//
				// 	if (primaryComponent) {
				// 		primaryComponentObject = config.noForm.noComponents[primaryComponent];
				// 		entityName = primaryComponentObject.noDataSource.entityName;
				// 		scope[readOnly] = angular.merge(scope[readOnly] || {}, results[entityName]);
				// 	}
				// }

				noTransactionCache.endTransaction(noTrans);
				scope.saveTimestamp = undefined;
				scope.$emit("noSubmit::success", {
					config: config,
					data: results,
					state: $state,
					navbar: resetButton.attr("no-reset-navbar"),
					target: noSubmitTarget
				});
			}

			function _saveFailed(scope, err) {
				console.error(err);
				scope.noGrowler.growl("error");
				scope.saveTimestamp = undefined;
			}

			function _save(config, _, e, elm, scope, timestamp) {
				if (scope.saveTimestamp == timestamp) {
					return;
				} else {
					scope.saveTimestamp = timestamp;
				}

				console.log("noForm::_save", timestamp);
				e.preventDefault();

				var noForm = config.noForm,
					submitButton = elm.attr("no-submit"),
					comp = noForm.noComponents[submitButton || noForm.primaryComponent],
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
					data = scope[comp.scopeKey];

				noTrans.upsert(data)
					.then(_saveSuccessful.bind(null, noTrans, scope, _, config, comp, elm, submitButton))
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

				var primaryComponent,
					nb = config.noNavBar || config.route.data.noNavBar;
				/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/
				scope.noNavBar = nb;

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
						if (resp.navbar) {
							this.showNavBar(resp.navbar);
						} else {
							this.showNavBar(this.navBarNames.READONLY);
						}
					}
				}.bind(noFormConfig));

				scope.$on("noReset::click", function(config, e, navbar) {
					//Assume we are in edit mode.
					var nb = config.noNavBar;
					if (nb && nb.routes && nb.routes.afterSave) {
						$state.go(nb.routes.afterSave);
					} else {
						//Assume we are in edit mode.
						if (navbar) {
							this.showNavBar(navbar);
						} else {
							this.showNavBar(this.navBarNames.READONLY);
						}
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
			var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-angular.html";
			return url;
		}

		function _compile(el, attrs) {
			var noForm = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);
			if (attrs.scopeKey) {
				var html = el.html(),
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
		}

		var directive = {
			restrict: "E",
			link: _link,
			templateUrl: getTemplateUrl,
			compile: _compile
		};

		return directive;

	}])

	.directive("noGrowler", ["$timeout", NoGrowlerDirective])

	.service("noDataManager", ["$q", "$rootScope", "noLoginService", "noTransactionCache", "noParameterParser", NoDataManagerService])

	.service("noParameterParser", [function () {
			this.parse = function (data) {
				var keys = Object.keys(data).filter(function (v, k) {
						if(v.indexOf("$") === -1 && v.indexOf(".") === -1) return v;
					}),
					values = {};
				keys.forEach(function (k) {
					var haveSomething = !!data[k],
						haveModelValue = haveSomething && data[k].hasOwnProperty("$modelValue");

					if(haveModelValue) {
						values[k] = data[k].$modelValue;
					} else if(haveSomething) {
						values[k] =  data[k];
					} else {
						values[k] = "";
					}

				});

				return values;
			};
			this.update = function (src, dest) {
				var keys = Object.keys(src).filter(function (v, k) {
					if(v.indexOf("$") === -1) return v;
				});
				keys.forEach(function (k) {
					var d = dest[k];
					if(d && d.hasOwnProperty("$viewValue")) {
						d.$setViewValue(src[k]);
						d.$render();
						d.$setPristine();
						d.$setUntouched();
					} else {
						dest[k] = src[k];
					}
				});
			};
		}])

		.directive("noValidation", ["PubSub", "noParameterParser", function(pubsub, noParameterParser){
			return {
				restrict: "A",
				require: "form",
				link: function(scope, el, attrs, form){
					//watch for validation flags and broadcast events down this
					//directives hierarchy.
					var wk = form.$name + ".$dirty";
					console.log(wk, Object.is(form, scope[wk]));
					scope.$watch(wk, function() {
						//console.log(wk, arguments);
						pubsub.publish("no-validation::dirty-state-changed", {isDirty: form.$dirty, pure: noParameterParser.parse(form), form: form});
					});
				}
			};
		}]);

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
							params = {
								entity: $state.params.entity
							};
							// params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav);
						// 	params = scope.$root.noNav[route];
						//
						var params = {};

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
					"undefined": function(navbar) {
						noFormConfig.showNavBar(navbar); // default behaviour to attempt to navigate to new navbar
					}
				},
				config, html;

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if (!navFn) navFn = navFns["undefined"].bind(null, navFnKey);

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

	.directive("noNavBar", ["$q", "$compile", "noTemplateCache", "$state", "noFormConfig", function($q, $compile, noTemplateCache, $state, noFormConfig) {
		var navNames = {
			search: "search",
			edit: "edit",
			basic: "basic"
		};

		function getTemplateUrl(elem, attr) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);

			var url = "navbars/no-navbar-basic.tpl.html",
				nbCfg = config.noNavBar || (config.route.data ? config.route.data.noNavBar: undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);

			if (tplKey) {
				url = "navbars/no-navbar-" + tplKey + ".tpl.html";
			} else if (nbCfg && nbCfg.templateUrl) {
				url = nbCfg.templateUrl;
			}

			return url;
		}

		function getTemplate() {

			var nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current),
				tplUrl = templateUrl(tplKey, nbCfg);

			return noTemplateCache.get(tplUrl)
				.then(function(resp) {
					html = resp; //resp.data
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
			scope.$on("noTabs::Change", function(e, t, p) {
				var te = angular.element(t.html()),
					ta = te.attr("btnbar");

				if(ta){
					noFormConfig.btnBarChange(ta);
				}
			});

			noFormConfig.showNavBar();
		}

		function _compile(el, attrs) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity),
				writeable = el.find("[no-navbar='writeable']"),
				noReset = writeable.find("[no-reset='{{noNavBar.scopeKey.writeable}}']"),
				nbCfg = config.noNavBar ||  (config.route.data ? config.route.data.noNavBar: undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);


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

	.directive("noReadOnly", ["$state", "noFormConfig", function($state, noFormConfig) {
		function _link(scope, el, attrs) {
			var config;

			el.append("<div class=\"no-editor-cover\"></div>");

			config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope);

			if(config && config.noForm.noReadOnly){
				if(config.noForm.noReadOnly.defaultState){
					angular.element(".no-editor-cover")
						.removeClass("ng-hide");
				} else {
					angular.element(".no-editor-cover")
						.addClass("ng-hide");
				}
			}
		}

		return {
			restrict: "A",
			link: _link
		};
	}])

	.directive("noNavigation", ["$injector", "$q", "$state", "$compile", "noFormConfig", "noActionQueue", "noNavigationManager", "PubSub", function($injector, $q, $state, $compile, noFormConfig, noActionQueue, noNavigationManager, PubSub) {
		var templateFactories = {
			"button": function (ctx, cfg, scope, el) {

				var btn = angular.element("<button type=\"button\"></button>"),
					icon = angular.element("<span></span>");

				btn.addClass(cfg.class);

				if(cfg.label) {
					btn.append(cfg.label);
				}

				if(cfg.icon) {
					icon.addClass(cfg.icon.class);
					switch(cfg.icon.position) {
						case "left":
							btn.prepend(icon);
							break;

						default:
							btn.append(icon);
							break;
					}
				}

				return btn;
			},
			"message": function (ctx, cfg, scope, el) {
				var div = angular.element("<div></div>");
				div.html(cfg.template);
				div.addClass(cfg.class);
				return $compile(div)(scope);
			}
		};

		function _click(ctx, btnCfg, scope, el, e) {
			e.preventDefault();

			var deferred = $q.defer(),
				execQueue = noActionQueue.createQueue(ctx, scope, el, btnCfg.actions);

			return noActionQueue.synchronize(execQueue)
				.then(function (results) {
					console.log(results);
				})
				.catch(function (err) {
					console.error(err);
				});

		}

		function _getCurrentNavBar(navBarName, scope, el) {
			return el.find("navbar[bar-id='" + scope.noNavigation[navBarName].currentNavBar + "']");
		}

		function _changeNavBar(ctx, el, n, o, s) {
			//console.log(ctx, el, n, o, s);
			if(n !== o) {
				el.find("navbar").addClass("ng-hide");
				el.find("navbar[bar-id='" + n + "']").removeClass("ng-hide");

			}
		}

		function _compile(el, attrs) {
			var ctx = noFormConfig.getComponentContextByRoute($state.current.name, undefined, "noNavigation", attrs.noForm);
			//el.attr("noid", noInfoPath.createNoid());
			return _link.bind(ctx, ctx);
		}

		function _link(ctx, scope, el, attrs) {
			var bars = ctx.component.bars,
				pubID;

			if(angular.isObject(ctx.component.default)){
				var prov = $injector.get(ctx.component.default.provider),
					meth = !!ctx.component.default.method ? prov[ctx.component.default.method] : undefined,
					prop = !!meth ? meth(ctx.component.default.property) : prov[ctx.component.default.property];

				if(prop){
					ctx.component.default = ctx.component.default.truthyBar;
				} else {
					ctx.component.default = ctx.component.default.falsyBar;
				}
			}

			for(var b in bars) {
				var bar = bars[b],
					btnBar = angular.element("<navbar></navbar>");

				if(angular.isString(bar)){
					bar = bars[bar];  //Aliased
				}

				btnBar.attr("bar-id", b);

				btnBar.addClass(bar.class);

				if(b !== ctx.component.default) {
					btnBar.addClass("ng-hide");
				}

				for(var c in bar.components) {
					var comp = bar.components[c],
						tmpl = templateFactories[comp.type],
						btn = tmpl(ctx, comp, scope, el);

					if(comp.type === "button"){
						btn.click(_click.bind(ctx, ctx, comp, scope, el));
					}

					btnBar.append(btn);
				}

				el.append(btnBar);
			}

			noInfoPath.setItem(scope, "noNavigation." + ctx.component.scopeKey + ".currentNavBar", ctx.component.default);

			scope.$watch("noNavigation." + ctx.component.scopeKey + ".currentNavBar", _changeNavBar.bind(ctx, ctx, el));

			pubID = PubSub.subscribe("no-validation::dirty-state-changed", function (navBarName, state) {
				var cnav = _getCurrentNavBar(navBarName, scope, el),
					barid = cnav.attr("bar-id").split(".")[0],
					baridDirty = (barid || "") + ".dirty";

				console.log("no-validation::dirty-state-changed", "isDirty", state.isDirty, barid, baridDirty);
				noNavigationManager.updateValidationState(scope, navBarName, state);

				if(state.isDirty) {
						noNavigationManager.changeNavBar(this, scope, el, navBarName, baridDirty);
				}else{
						noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
				}

			}.bind(ctx, ctx.component.scopeKey));

			scope.$on("$destroy", function () {
				console.log("$destroy", "PubSub::unsubscribe", "no-validation::dirty-state-changed");
				PubSub.unsubscribe(pubID);
			});
		}

		return {
			restrict: "E",
			compile: _compile
		};
	}])

	.service("noNavigationOld", ["$q", "$http", "$state", function($q, $http, $state) {
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
	}])

	.service("noNavigationManager", ["$q", "$http", "$state", function($q, $http, $state){

		this.configure = function(){
			return $q(function (resolve, reject) {
				var routes;

				function saveRoutes(resp) {
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates() {
					for(var r in routes) {
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

		this.changeNavBar = function (ctx, scope, el, navBarName, barid) {
			if(barid === "^") {
				var t = noInfoPath.getItem(scope,  "noNavigation." + navBarName + ".currentNavBar"),
					p = t.split(".");

				barid = p[0];
			}

			noInfoPath.setItem(scope, "noNavigation." + navBarName + ".currentNavBar", barid);
		};

		this.updateValidationState = function (scope, navBarName, state) {
			noInfoPath.setItem(scope, "noNavigation." + navBarName + ".validationState", state);
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
	.directive("noSubmit", ["$injector", "$rootScope", function($injector, $rootScope) {
		return {
			restrict: "AC",
			require: "?^form",
			link: function(scope, el, attr, form) {
				console.info("Linking noSubmit");
				if (!form) {
					form = new NoFormValidate(el);
				}

				function _submit(form, e) {
					e.preventDefault();
					if(attr.noValidate){
						$rootScope.$broadcast("noSubmit::dataReady", el, scope, new Date());
					}else{
						if (form.$valid) {
							$rootScope.$broadcast("noSubmit::dataReady", el, scope, new Date());
						} else {
							$rootScope.$broadcast("no::validate", form.$valid);
						}
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
	.directive("noReset", ["$rootScope", function($rootScope) {
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

					scope[attr.noReset] = angular.copy(scope[rsetKey]);
					scope.$digest();

					$rootScope.$broadcast("noReset::click", attr.noResetNavbar);
					form.$setPristine();
					$rootScope.$broadcast("no::validate:reset");
				}
				el.bind("click", _reset.bind(null, ctrl));
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

		function navBarRoute(state) {
			var route = noInfoPath.getItem(state, "data.noNavBar");

			if (!route && SELF.noNavBarRoutes) {
				route = SELF.noNavBarRoutes[state.name];
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

			var route = navBarRoute(state.current),
				navBar = SELF.navBarKeyFromState(state.current),
				id = navBarEntityIDFromState(route, state.params);

			if (navBar === "edit") navBar = id ? "readonly" : "create";

			return navBar;
		}

		this.navBarKeyFromState = function(state) {
			var nbr = navBarRoute(state);
			return nbr ? nbr.type : undefined;
		};


		this.showNavBar = function(navBarName) {
			//if (!navBarKey) throw "navBarKey is a required parameter";

			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

			var el = angular.element("no-nav-bar");

			if(!!targetNavBar){
				el.find("[no-navbar]")
					.addClass("ng-hide");
				el.find("[no-navbar='" + targetNavBar + "']")
					.removeClass("ng-hide");
			}


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
			if (form.routeToken) indexes["route.name+routeToken"][form.route.name + "+" + form.routeToken] = guid;
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
		function getFormConfig() {
			var promise;

			/**
			 * `getFormConfig` checks to see if the routes in no-forms.json are
			 * configured.
			 */
			if (!noConfig.current.debug && isDbPopulated) {
				promise = $q.when(true);
			} else {
				promise = $q(function(resolve, reject) {
					$rootScope.noFormConfig = {};

					$http.get("/no-forms.json")
						.then(function(resp) {
							var forms = resp.data;

							/**
							 * `getFormConfig` loops through each property in no-forms.json
							 * and saves the route configuration in local storage based on
							 * the routeKey.
							 */
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
		function getNavBarConfig() {

			/**
			 * `getNavBarConfig` checks if the cacheNavBar flag is true, it
			 * attempts to load the noNavBarConfig from local storage before
			 * performing a $http.get request.
			 */
			if (cacheNavBar) {
				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");
			}

			/**
			 * `getNavBarConfig` checks to see if noNavBarConfig was loaded from
			 * local storage, and if it was not, it performs a $http.get request
			 * to get the noNavBarConfig and then saves the configuration to
			 * local storage.
			 */
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

		/**
		 * `NoFormConfigSync` exposes noNavBarConfig as the property noNavBarRoutes
		 */
		Object.defineProperties(this, {
			"noNavBarRoutes": {
				"get": function() {
					return noNavBarConfig;
				}
			}
		});

		/**
		 * @method whenReady() @deprecated
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
		this.whenReady = function() {
			/*
			 * `whenReady` sets a flag based on noConfig's configuration to load/save
			 * navBar configuration in local storage.
			 */
			cacheNavBar = noConfig.current ? noConfig.current.noCacheNoNavBar : false;

			return getFormConfig()
				.then(getNavBarConfig)
				.catch(function(err) {
					console.log(err);
				});
		};

		/**
		 * @method getFormByShortName(shortName)
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
		this.getFormByShortName = function(shortName) {
			if(!shortName) throw "shortName is a required parameter";

			return getRoute("route.name", shortName);
		};

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

			if (entityName) { // This is here to prevent a regression.
				return getRoute("route.name+routeToken", routeName + "+" + entityName);
			} else {
				return getRoute("route.name", routeName);
			}
		}
		this.getFormByRoute = getFormByRoute;

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
		this.getComponentContextByRoute = getComponentContextByRoute;

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

			if (!route && SELF.noNavBarRoutes) {
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
			if (!route) throw "route is a required parameter";
			if (!params) throw "params is a required parameter";

			var id;

			if (route.entityIdParam) {
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
			if (!state) throw "state is a required parameter";

			var route = navBarRoute(state.current),
				navBar = SELF.navBarKeyFromState(state.current),
				id = navBarEntityIDFromState(route, state.params);

			if (navBar === "edit") navBar = id ? "readonly" : "create";

			return navBar;
		}

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
		this.navBarKeyFromState = function(state) {
			if (!state) throw "state is a required parameter";

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
		this.showNavBar = function(navBarName) {

			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

			/*
			 * `showNavBar` hides all the navbars within the template and then
			 * shows the nav bar that matches the targetNavBar.
			 */
			 if(!!targetNavBar){
				 var el = angular.element("no-nav-bar");
	 			el.find("[no-navbar]")
	 				.addClass("ng-hide");
	 			el.find("[no-navbar='" + targetNavBar + "']")
	 				.removeClass("ng-hide");
			 }

			/*
			 * `showNavBar` puts on a protective cover over the form when the
			 * form is Read Only mode. When the mode is Writable or Create,
			 * it removes the cover, enabling interaction with the form
			 * components.
			 */
			var route = navBarRoute($state.current);

			if(route.covers){
				if(route.covers[targetNavBar]){
					angular.element(".no-editor-cover")
						.removeClass("ng-hide");
				} else {
					angular.element(".no-editor-cover")
						.addClass("ng-hide");
				}
			} else {
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
			}
		};

		this.btnBarChange = function(btnBarID) {
			var toID = noInfoPath.getItem($rootScope, "noFormConfig.curBtnBar"),
				isEditing = noInfoPath.getItem($rootScope, "noFormConfig.isEditing");

			if (toID === "editing" && !btnBarID) {
				toID = noInfoPath.getItem($rootScope, "noFormConfig.curTab");
			} else {
				toID = btnBarID ? btnBarID : "default";
			}


			switch (btnBarID) {
				case "editing":
					noInfoPath.setItem($rootScope, "noFormConfig.isEditing", true);
					break;
				default:
					if (isEditing) {
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