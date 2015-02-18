/**
 * #**noinfopath-validation**
 */
(function(angular,undefined){
	"use strict";
	
	/**
	* ##validate
	* @private
	* @param {object} el - Element.
	* @param {object} field - Elementn field.
	*/
	function _validate(el, field){
		el.find(".help-block").toggleClass("ng-hide", field.$valid || field.$pristine);
		el.toggleClass("has-error", field.$invalid);
		el.toggleClass("has-success", field.$valid);
	}
	
	/**
	* ##resetErrors
	* @private
	* @param {object} el - Element.
	* @param {object} field - Elementn field.
	*/
	function _resetErrors(el, field){
		el.find(".help-block").toggleClass("ng-hide", true);
		el.toggleClass("has-error", false);
		el.toggleClass("has-success", false);
	}
	
	/**
	* ##blur
	* @private
	* @param {object} el - Element.
	* @param {object} field - Elementn field.
	*/
	function _blur(el, field){
		if(!field.$pristine) _validate(el, field);
	}

	/**
	* ##noinfopath.validation
	* Combines the functionality of validation from bootstrap and angular.
	*/
	angular.module("noinfopath.validation", [])
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
	    			function _submit(form){
	    				if(form.$valid)
	    				{
	    					$rootScope.$broadcast("noSubmit::dataReady");
	    				}else{
		    				$rootScope.$broadcast("no::validate");
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
})(angular)