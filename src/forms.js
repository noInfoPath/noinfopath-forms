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

		function _successful(ctx, resolve, data) {
			if(data.scope.noNavigation) {
				var navState = data.scope.noNavigation[data.ctx.component.scopeKey].validationState;
				navState.form.$setUntouched();
				navState.form.$setPristine();
				navState.form.$setSubmitted();
			}

			ctx.data = data;

			// if(ctx.form.noReset){
			// 	data.scope[ctx.form.primaryComponent + "Reset"] = angular.copy(data.scope[ctx.form.primaryComponent]);
			// }

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