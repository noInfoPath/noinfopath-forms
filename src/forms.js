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
		 *  |Name|Description|
		 *  |----|-----------|
		 *  |no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
		 *  |no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
		 *  |no-database|The location of the Tables or Collections that this form will read and write to.|
		 *  |no-datasource|The name of a table, view or collection contained in the database. The data source must expose a NoCRUD interface.|
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
		 *					{
		 *						"name": "CooperatorAddresses",
		 *						"joins": [
		 *							"Cooperators",
		 *							"Addresses"
		 *						]
		 *					}
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
		.directive("noForm", ['$q', '$state', 'noAppStatus', '$injector', 'noConfig', function($q, $state, noAppStatus, $injector, noConfig) {
			return {
				restrict: "A",
				//controller: [function(){}],
				//transclude: true,
				scope: false,
				link: function(scope, el, attrs) {
					var provider, database, datasource;

					if(!attrs.noForm) {
						if (!attrs.noProvider) throw "noForm requires a noProvider attribute when noForm is undefined.";
						if (!attrs.noDatabase) throw "noForm requires a noDatasource attribute when noForm is undefined.";
						if (!attrs.noDatasource) throw "noForm requires a noSchema attribute when noForm is undefined.";

						provider = $injector.get(attrs.noProvider);
						database = provider.getDatabase(attrs.noDataSource);
						datasource = datasource[attrs.noDatasource];

						_start();
					}else{
						noConfig.whenReady()
							.then(function(){
								var cfg = noConfig.current.components[attrs.noForm];

								provider = $injector.get(cfg.provider);
								database = provider.getDatabase(cfg.datasource);
								datasource = cfg.datasource;

								_start();
							});
					}

					function _getFormData(){
						var ds, data = {};

						if(datasource.__type === "INoCRUD"){
							ds = datasource;
						}else{
							/*
							*	> NOTE: datasource.read is always expected to be a single table or view name.
							*/
							ds = database[datasource.read];
						}

						data[ds.primaryKey] = $state.params.id;

						datasource.noOne(data)
							.then(function(data) {
								scope[attrs.noDataSource] = data;
								//console.log("noForm", scope);
							})
							.catch(function(err) {
								console.error(err);
							});
					}

					function _upsert(data){

					}

					function _simpleUpsert(data){
					}

					function _multiTableUpsert(data){

					}

					function _start() {
						scope.$on("noSubmit::dataReady", function(e, elm, scope) {
							var formData = scope[attrs.noDataSource];
							//console.warn("TODO: Implement save form data", noFormData, this);
							// ds.transport.upsert({
							// 		data: noFormData
							// 	})
							// 	.then(function(data) {
							// 		$state.go("^.summary");
							// 	})
							// 	.catch(function(err) {
							// 		alert(err);
							// 	});
						});

						_getFormData();
					}
				}
			};
		}]);

})(angular);
