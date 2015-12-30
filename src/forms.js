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
		.directive("noForm", ['$timeout', '$q', '$state', '$injector', 'noConfig', 'noFormConfig', 'noLoginService', 'noTransactionCache', function($timeout, $q, $state, $injector, noConfig, noFormConfig, noLoginService, noTransactionCache) {
			return {
				restrict: "E",
				//controller: [function(){}],
				//transclude: true,
				scope: false,
				require: "?^form",
				link: function(scope, el, attrs, form, $t) {
					scope.$validator = form;

					noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
						.then(function(config) {
							var noForm = config.noForm,
								primaryComponent;
							/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/


							for (var c in config.noComponents) {
								var comp = config.noComponents[c];

								if (comp.scopeKey) {
									if (config.primaryComponent !== comp.scopeKey || (config.primaryComponent === comp.scopeKey && config.watchPrimaryComponent)) {
										scope.waitingFor[comp.scopeKey] = true;
									}

								}

							}


							scope.$on("noSubmit::dataReady", function(e, elm, scope) {
								var entityName = elm.attr("no-submit"),
									comp = noForm.noComponents[entityName],
									noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
									data = scope[entityName];

								noTrans.upsert(data)
									.then(function(result) {
										scope[entityName] = result[noForm.noComponents[entityName].noDataSource.entityName];
										_growl("yeah"); //TODO: refactor _grown into a service.
										noTransactionCache.endTransaction(noTrans);
										scope.$emit("noSubmit::success");
									})
									.catch(function(err) {
										console.error(err);
										_growl("boo");
									});
							});

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


					function _growl(m) {
						scope.noForm[m] = true;

						$timeout(function() {
							scope.noForm = {
								yeah: false,
								boo: false
							};
						}, 5000);

					}


				}
			};
		}])

		.directive("noRecordStats", ["$q", "$http", "$compile", "noFormConfig", "$state", function($q, $http, $compile, noFormConfig, $state){
			function _link(scope, el, attrs){

				function getTemplate(){
					var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-kendo.html";

					//console.log(scope.noRecordStatsTemplate);

					if(scope.noRecordStatsTemplate){
						return $q.when(scope.noRecordStatsTemplate);
					}else{
						return $q(function(resolve, reject){
							$http.get(url)
								.then(function(resp){
									scope.noRecordStatsTemplate = resp.data.replace(/{scopeKey}/g, attrs.scopeKey);
									resolve(scope.noRecordStatsTemplate);
								})
								.catch(function(err){
									console.log(err);
									reject(err);
								});
						});
					}
				}

				function _finish(config){
					if(!config) throw "Form configuration not found for route " + $state.params.entity;

					getTemplate()
						.then(function(template){
							var t = $compile(template)(scope);
							console.log(t);
							el.html(t);
						})
						.catch(function(err){
							console.error(err);
						});
				}

				noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
					.then(_finish)
					.catch(function(err){
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
