/**
* # noinfopath.forms
* @version 0.1.1
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

						_start();
					}else{
						var noConfig = $inject.get("noConfig");
						noConfig.whenReady()
							.then(_start);
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


				}
			};
		}]);

})(angular);

//validation.js
(function(angular,undefined){
	"use strict";

	function _validate(el, field){
		if(!field) return;

		var t = el.find(".k-editor"),
			h = el.find(".help-block");

		h.toggleClass("ng-hide", field.$valid || field.$pristine);
		if(t.length > 0){
			t.closest("div").parent().toggleClass("has-error", field.$invalid);
			t.closest("div").parent().toggleClass("has-success", field.$invalid);
			t.toggleClass("has-error", field.$invalid);
			t.toggleClass("has-success", field.$valid);
		}else{
			el.toggleClass("has-error", field.$invalid);
			el.toggleClass("has-success", field.$valid);
		}
	}


	function _resetErrors(el, field){
		el.find(".help-block").toggleClass("ng-hide", true);
		el.toggleClass("has-error", false);
		el.toggleClass("has-success", false);
	}


	function _blur(el, field){
		if(!field.$pristine) _validate(el, field);
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
		    	require: '^form',
		    	compile: function(el, attrs){
					var i = el.find("INPUT, TEXTAREA, SELECT, [ngf-drop]");
		    		i.attr("name", i.attr("ng-model"));

		    		return function(scope, el, attrs, ctrl) {
			    		scope.$on('no::validate', _validate.bind(null, el, ctrl[i.attr("name")]));
			    		scope.$on('no::validate:reset', _resetErrors.bind(null, el, ctrl[i.attr("name")]));
						i.bind('blur', _blur.bind(null, el, ctrl[i.attr("name")]));
					};
		    	}
			};
	    }])

		/**
		* ## noSubmit
		*
		* When user clicks submit, checks to make sure the data is appropriate and returns an error if not.
		*/
	    .directive('noSubmit', ['$rootScope', function($rootScope){
	    	return {
	    		restrict: "A",
	    		require: "^form",
	    		link: function(scope, el, attr, ctrl){
	    			function _submit(form, e){
	    				e.preventDefault();

	    				if(form.$valid)
	    				{
	    					$rootScope.$broadcast("noSubmit::dataReady", el, scope);
	    				}else{
		    				$rootScope.$broadcast("no::validate", form.$valid);
	    				}
	    			}

	    			el.bind('click', _submit.bind(null, ctrl));
	    		}
	    	};
	    }])

		/**
		* ## noReset
		*
		* When user clicks reset, form is reset to null state.
		*/
	    .directive('noReset', ['$rootScope', function($rootScope){
	    	return {
	    		restrict: "A",
	    		require: "^form",
	    		link: function(scope, el, attr, ctrl){
	    			function _reset(form){
	    				$rootScope.$broadcast("noReset::click");
	    				form.$setPristine();
	    				$rootScope.$broadcast("no::validate:reset");
	    			}
	    			el.bind('click', _reset.bind(null, ctrl));
	    		}
	    	};
	    }])
	;
})(angular);
