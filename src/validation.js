//validation.js
(function(angular, undefined) {
	"use strict";

	function _validate(el, field) {
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

						if (!form) {
							form = new NoFormValidate(el);
						}

						scope.$on('no::validate', _validate.bind(null, el, form[i.attr("name")]));
						scope.$on('no::validate:reset', _resetErrors.bind(null, el, form[i.attr("name")]));
						i.bind('blur', _blur.bind(null, el, form[i.attr("name")]));
					};
				}
			};
		}])

	/**
	 * ## noSubmit
	 *
	 * When user clicks submit, checks to make sure the data is appropriate and returns an error if not.
	 */
	.directive('noSubmit', ['$injector', '$rootScope', function($injector, $rootScope) {
		return {
			restrict: "A",
			require: "?^^form",
			scope: false,
			link: function(scope, el, attr, form) {
				console.info("Linking noSubmit");

				function _submit(form, e) {
					e.preventDefault();
					if (!form) {
						form = new NoFormValidate(el);
					}

					if (form.$valid) {
						$rootScope.$broadcast("noSubmit::dataReady", el, scope);
					} else {
						$rootScope.$broadcast("no::validate", form.$valid);
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
	.directive('noReset', ['$rootScope', function($rootScope) {
		return {
			restrict: "A",
			require: "?^^form",
			scope: false,
			link: function(scope, el, attr, ctrl) {
				var rsetKey = "noReset_" + attr.noReset;

				scope.$watch(attr.noReset, function(n, o, s) {
					if (n) {
						scope[rsetKey] = angular.copy(scope[attr.noReset]);
					}
				});

				function _reset(form, e) {
					e.preventDefault();
					if (!form) {
						form = new NoFormValidate(el);
					}

					scope[attr.noReset] = scope[rsetKey];
					scope.$digest();

					$rootScope.$broadcast("noReset::click");
					form.$setPristine();
					$rootScope.$broadcast("no::validate:reset");
				}
				el.bind('click', _reset.bind(null, ctrl));
			}
		};
	}])

	.directive("noEnterKey", [function() {
		function _enterPressed(el, scope, attr) {
			el.bind("keypress", function(e) {
				var keyCode = e.which || e.keyCode;

				if (keyCode === 13) //Enter is pressed
				{
					var frm = el.closest("[no-form]");

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
