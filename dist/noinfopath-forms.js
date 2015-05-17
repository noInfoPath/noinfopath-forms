/**
* ##noinfopath.forms
* @version 0.0.4
* Combines the functionality of validation from bootstrap and angular.
*/
	(function(angular,undefined){
	"use strict";


	angular.module("noinfopath.forms", [])

	;	    	
})(angular);


//validation.js
(function(angular,undefined){
	"use strict";
	
	/**
	* @function #validate
	* @param {object} el - Element.
	* @param {object} field - Element field.
	*/
	function _validate(el, field){
		if(!field) return;

		var t = el.find(".k-editor"),
			h = el.find(".help-block");
		
		h.toggleClass("ng-hide", field.$valid || field.$pristine);
		if(t.length > 0){
			t.closest("div").parent().toggleClass("has-error", field.$invalid);
			t.closest("div").parent().toggleClass("has-success", field.$invalid)
			t.toggleClass("has-error", field.$invalid);
			t.toggleClass("has-success", field.$valid);				
		}else{
			el.toggleClass("has-error", field.$invalid);
			el.toggleClass("has-success", field.$valid);				
		}
	}
	
	/**
	* @function #resetErrors
	* @param {object} el - Element.
	* @param {object} field - Element field.
	*/
	function _resetErrors(el, field){
		el.find(".help-block").toggleClass("ng-hide", true);
		el.toggleClass("has-error", false);
		el.toggleClass("has-success", false);
	}
	
	/**
	* @function #blur
	* @param {object} el - Element.
	* @param {object} field - Element field.
	*/
	function _blur(el, field){
		if(!field.$pristine) _validate(el, field);
	}

	/**
	* ##noinfopath.forms
	* Combines the functionality of validation from bootstrap and angular.
	*/
	angular.module("noinfopath.forms")
		/**
		* ##noErrors
		* Will alert the user if errors ocurred in each field.
		*/
	    .directive('noErrors', [function() {
		    return {
		    	restrict: 'A',
		    	require: '^form',
		    	compile: function(el, attrs){
		    		var i = el.find("INPUT, TEXTAREA, SELECT");
		    		i.attr("name", i.attr("ng-model"));

		    		return function(scope, el, attrs, ctrl) {
			    		scope.$on('no::validate', _validate.bind(null, el, ctrl[i.attr("name")]));
			    		scope.$on('no::validate:reset', _resetErrors.bind(null, el, ctrl[i.attr("name")]));
						i.bind('blur', _blur.bind(null, el, ctrl[i.attr("name")]))
					}
		    	}
			}	
	    }])	

		/**
		* ##noSubmit
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
		* ##noReset
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


//forms.js
(function(angular, undefined){
    angular.module("noinfopath.forms")
        .directive("noForm", ['$q', '$state', 'noAppStatus', 'noIndexedDB', function($q, $state, noAppStatus, noIndexedDB){
            return {
                restrict: "A",
                //controller: [function(){}],
                //transclude: true,
                //scope:{},
                link: function(scope, el, attrs){

                	console.log($state.params, $state.current.data);

            		var noFormName = attrs.noForm || "noForm",
                		noFormConfig = $state.current.data ? $state.current.data[noFormName] : undefined;

                   	if(noFormConfig){
						var _table = noIndexedDB[noFormConfig.tableName],
							req = new window.noInfoPath.noDataReadRequest($q, _table),
							_value;

						if(!noFormConfig.primaryKey) throw "noForm requires a primaryKey property.";
						 

						_value = $state.params[noFormConfig.primaryKey.name];
						if(noFormConfig.primaryKey.type === "Number"){
							_value = Number(_value);
						}

						req.addFilter(noFormConfig.primaryKey.name, "eq", _value);

						_table.noCRUD.one(req)
							.then(function(data){
								scope.$root[noFormConfig.name] = data;
								//console.log("noForm", scope);
							})
							.catch(function(err){
								console.error(err);
							});	                   		


	                    scope.$on("noSubmit::dataReady", function(e, elm, scope){
	                        var noFormData = scope[noFormConfig.name];
	                        console.warn("TODO: Implement save form data", noFormData, this);
	                        _table.noCRUD.upsert({data: noFormData})
	                        	.then(function(data){
	                        		$state.go("^.summary");
	                        	})
	                        	.catch(function(err){
	                        		alert(err);
	                        	});
	                    }.bind($state));                  		
                   	}

                }
            }
        }])
    ;
    var noInfoPath = {};

    window.noInfoPath = angular.extend(window.noInfoPath || {}, noInfoPath);
})(angular);

