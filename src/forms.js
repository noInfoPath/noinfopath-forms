//forms.js
(function(angular, undefined) {
	"use strict";

	angular.module("noinfopath.forms")
		/*
		 *  ## noForm : Directive
		 *
		 *	> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.
		 *
		 *	### Attributes
		 *   |Name|Description|
		 *   |----|-----------|
		 *   |no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
		 *   |no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
		 *   |no-datasource|The location of the Tables or Collections that this form will read and write to.|
		 *   |no-schema|The name of the NoInfoPath Form Schema that defines the semantics of how data is read and written by the form.|
		 *
		 *	##### Usage
		 *
		 *  ```html
		 *
		 *	<div no-form no-provider="noIndexedDB" no-datasource="FCFNv2" no-schema="Cooperator">
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
		 *	##### Sample NoInfoPath Form Configuration
		 *
		 *	```json
		 *	{
		 *		"myform": {
		 *			"provider": "noIndexedDB",
		 *			"datasource": "FCFNv2",
		 *			"schema": "Cooperator"
		 *		}
		 *	}
		 *	```
		 */
		.directive("noForm", ['$q', '$state', 'noAppStatus', '$injector', function($q, $state, noAppStatus, $injector) {
			return {
				restrict: "A",
				//controller: [function(){}],
				//transclude: true,
				//scope:{},
				link: function(scope, el, attrs) {
					var provider, datasource, schema;

					if(!attrs.noForm) {
						if (!attrs.noProvider) throw "noForm requires a noProvider attribute when noForm is undefined.";
						if (!attrs.noDatasource) throw "noForm requires a noDatasource attribute when noForm is undefined.";
						if (!attrs.noSchema) throw "noForm requires a noSchema attribute when noForm is undefined.";

						provider = $injector.get(attrs.noProvider);
						datasource = provider.getDatabase(attrs.noDataSource);
						//TODO: Implement noSchema use case.
					}else{
						var noConfig = $inject.get("noConfig");
						noConfig.whenReady()
							.then(function(){

							});
					}

					function _start() {
						var ds;

						if ($state.current.data) {
							var dsCfg = $state.current.data.noDataSources[attrs.noDataSource],
								formCfg = $state.current.data.noComponents[attrs.noComponent];

							ds = new window.noInfoPath.noDataSource(attrs.noForm, dsCfg, $state.params);

							noInfoPath.watchFiltersOnScope(attrs, dsCfg, ds, scope, $state);

							scope.$on("noSubmit::dataReady", function(e, elm, scope) {
								var noFormData = scope[attrs.noDataSource];
								//console.warn("TODO: Implement save form data", noFormData, this);
								ds.transport.upsert({
										data: noFormData
									})
									.then(function(data) {
										$state.go("^.summary");
									})
									.catch(function(err) {
										alert(err);
									});
							}.bind($state));

							var req = new window.noInfoPath.noDataReadRequest(ds.table, {
								data: {
									"filter": {
										filters: ds.filter
									}
								},
								expand: ds.expand
							});
							ds.transport.one(req)
								.then(function(data) {
									scope.$root[attrs.noDataSource] = data;
									//console.log("noForm", scope);
								})
								.catch(function(err) {
									console.error(err);
								});
						}

					}

					_start();
				}
			};
		}]);

})(angular);
