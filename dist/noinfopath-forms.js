/**
* # noinfopath.forms
* @version 0.1.5
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
		.directive("noForm", ['$timeout', '$q', '$state', '$injector', 'noConfig', 'noFormConfig', 'noLoginService', 'noTransactionCache', function($timeout, $q, $state, $injector, noConfig, noFormConfig, noLoginService, noTransactionCache) {
			return {
				restrict: "E",
				//controller: [function(){}],
				//transclude: true,
				scope: false,
				link: function(scope, el, attrs) {
					noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
						.then(function(config){
							var noForm = config.noForm,
								primaryComponent;
								/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/


							for(var c in config.noComponents){
								var comp = config.noComponents[c];

								if(comp.scopeKey){
									if(config.primaryComponent !== comp.scopeKey || (config.primaryComponent === comp.scopeKey && config.watchPrimaryComponent)){
										scope.waitingFor[comp.scopeKey] = true;
									}

								}

							}


							scope.$on("noSubmit::dataReady", function(e, elm, scope) {
								var noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, noForm.noTransactions),
									entityName = elm.attr("no-submit");

								noTrans.upsert(entityName, scope)
									.then(function(result){
										_growl("yeah");
										noTransactionCache.endTransaction(noTrans);
									})
									.catch(function(err){
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

					var releaseWaitingFor = scope.$watchCollection("waitingFor", function(newval, oldval){
						var stillWaiting = false;
						for(var w in scope.waitingFor)
						{
							if(scope.waitingFor[w]){
								stillWaiting = true;
								break;
							}
						}

						scope.noFormReady = !stillWaiting;

						if(scope.noFormReady) releaseWaitingFor();

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
				scope: false,
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

		.directive("noEnterKey",[function(){
			function _enterPressed(el, scope, attr){
				el.bind("keypress", function(e){
					var keyCode = e.which || e.keyCode;

					if(keyCode === 13) //Enter is pressed
					{
					  var frm = el.closest("[no-form]");

						frm.find("[no-submit]").click(); //Assume that it is a button
					}
				});
			}

			function _link(scope, el, attr){
				console.warn("This will be refactored into a different module in a future release");
				_enterPressed(el,scope);
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
(function(angular,undefined){
	"use strict";

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "noDataSource", "noLocalStorage", function($q, $http, $rootScope, noDataSource, noLocalStorage){
			var isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
				dsConfig = {
					"dataProvider": "noIndexedDb",
					"databaseName": "NoInfoPath_dtc_v1",
					"entityName": "NoInfoPath_Forms",
					"primaryKey": "FormID"
				},
				dataSource;

			this.whenReady = function(){
				 dataSource = noDataSource.create(dsConfig, $rootScope);

				return $q(function(resolve, reject){

					if(isDbPopulated){
						resolve();
					}else{
						$http.get("/no-forms.json")
							.then(function(resp){
								var forms = resp.data,
									promises = [];

								for(var f in forms){
									var frm = forms[f];

									if(f === "editors"){
										for(var e in frm){
											var editor = frm[e];

											editor.search.shortName = "search_" + e;
											editor.search.routeToken = e;
											promises.push(dataSource.create(editor.search));

											editor.edit.shortName = "edit_" + e;
											editor.edit.routeToken = e;
											promises.push(dataSource.create(editor.edit));
										}
									}else{
										frm.shortName = f;
										promises.push(dataSource.create(frm));
									}
								}

								$q.all(promises)
									.then(function(){
										noLocalStorage.setItem("dbPopulated_NoInfoPath_dtc_v1", {timestamp: new Date()});
										resolve();
									})
									.catch(reject);
							})
							.catch(function(err){
								reject(err);
							});

					}
				});
			};

			this.getFormByShortName = function(shortName, scope){
				var form = noInfoPath.getItem(scope, shortName),
					promise;

				if(form){
					promise = $q.when(form);
				}else{
					promise = dataSource.entity
						.where("shortName")
						.equals(shortName)
						.toArray()
						.then(function(data){
							form = data.length ? data[0] : undefined;
							scope[shortName] = form;
							return form;
						});
				}


				return promise;
			};


			this.getFormByRoute = function(routeName, entityName, scope){
				var promise,
					routeKey = entityName ? routeName + entityName : routeName,
					form = noInfoPath.getItem(scope, routeKey);

				if(form){
					promise = $when(form);
				}else{
					if(entityName){
						promise = dataSource.entity
							.where("[route.name+routeToken]")
							.equals([routeName, entityName])
							.toArray()
							.then(function(data){
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					}else{
						promise = dataSource.entity
							.where("route.name")
							.equals(routeName)
							.toArray()
							.then(function(data){
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					}

				}

				return promise;
			};
		}]);
})(angular);
