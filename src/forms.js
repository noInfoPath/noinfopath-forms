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
			if (attrs.scopeKey) {
				var noForm = noFormConfig.getFormByRoute($state.current.name, $state.params.entity),
					html = el.html(),
					key = attrs.scopeKey.indexOf("{{") > -1 ? attrs.scopeKey.substr(2, attrs.scopeKey.length - 4) : attrs.scopeKey,
					scopeKey = noInfoPath.getItem(noForm, key);

				html = html.replace(/{scopeKey}/g, scopeKey);
				//console.log(html);
				el.html(html);
			}

			return _link;
		}

		function _link(scope, el, attrs) {
			console.log(scope);
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
