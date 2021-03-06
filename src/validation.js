//validation.js
(function(angular, undefined) {
	"use strict";

	function _validate(el, field, label) {
		if (!field || (field.$pristine && field.$valid)) return;

		var t = el.find(".k-editor"),
		h = el.find(".help-block");

		h.toggleClass("ng-hide", field.$valid || field.$pristine);
		if (t.length > 0) {
			t.closest("div").parent().toggleClass("has-error", field.$invalid);
			t.closest("div").parent().toggleClass("has-success", field.$invalid);
			t.toggleClass("has-error", field.$invalid);
			t.toggleClass("has-success", field.$valid);
		} else {
			if (label) {
				label.toggleClass("has-error", field.$invalid);
				label.toggleClass("has-success", field.$valid);
			}
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
		if (field && !field.$pristine) _validate(el, field);
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

				var i = el.find("INPUT, TEXTAREA, SELECT, [ngf-drop], no-lookup, no-kendo-date-picker, no-file-upload, no-auto-complete");

				//console.log(i);

				return function(i, scope, el, attrs, form) {
					var fld,
					lbl,
					ctl,
					tag = i[0].tagName.toLowerCase();

					if (!form) {
						form = new NoFormValidate(el);
					}

					fld = form[i.attr("name")];

					if (i.attr("type") === "hidden") {
						lbl = el.find("SPAN[required]");
					}


					switch (tag) {
						case "no-lookup":
						case "no-kendo-date-picker":
							ctl = i.children(":first");
							ctl.bind('change', _blur.bind(null, el, fld, lbl));
							break;

						default:
							ctl = i;
							break;
					}

					ctl.bind('blur', _blur.bind(null, el, fld, lbl));

					scope.$on("$destroy", function(unbind1, unbind2) {
						//console.log("Unbinding", 'no::validate', 'no::validate:reset');
						unbind1();
						unbind2();
					}.bind(
						this,
						scope.$on('no::validate', _validate.bind(null, el, fld, lbl)),
						scope.$on('no::validate:reset', _resetErrors.bind(null, el, fld, lbl))
					));


				}.bind(this, i);
			}
		};
	}])

	/**
	* ## noSubmit
	*
	* When user clicks submit, checks to make sure the data is appropriate and returns an error if not.
	*
	*	### Events
	*
	*	The noSubmit directive will broadcast events on the root scope to notify
	*	the implementor that the data submitted is valid.
	*
	*	#### noSubmit::dataReady
	*
	*	Raise when the data submmited has passed all validations. Along with the
	*	standard event object, the broadcast also sends a reference to the element
	*	that has the noSubmit directive attached to it, the scope, and a timestamp.
	*
	*/
	.directive("noSubmit", ["$injector", "$rootScope", function($injector, $rootScope) {
		return {
			restrict: "A",
			require: "?^form",
			link: function(scope, el, attr, form) {
				//console.info("Linking noSubmit");
				if (!form) {
					form = new NoFormValidate(el);
				}

				function _submit(form, e) {
					e.preventDefault();
					if (attr.noValidate) {
						$rootScope.$broadcast("noSubmit::dataReady", el, scope, new Date());
					} else {
						if (form.$valid) {
							$rootScope.$broadcast("noSubmit::dataReady", el, scope, new Date());
						} else {
							$rootScope.$broadcast("no::validate", form.$valid);
						}
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
	.directive("noReset", ["$rootScope", function($rootScope) {
		return {
			restrict: "A",
			require: "?^^form",
			scope: false,
			link: function(scope, el, attr, ctrl) {
				var rsetKey = "noReset_" + attr.noReset,
				stopWatch;

				stopWatch = scope.$watch(attr.noReset, function(n, o, s) {
					if (n) {
						scope[rsetKey] = angular.copy(scope[attr.noReset]);
						stopWatch();
					}
				});

				function _reset(form, e) {
					e.preventDefault();
					if (!form) {
						form = new NoFormValidate(el);
					}

					scope[attr.noReset] = angular.copy(scope[rsetKey]);
					scope.$digest();

					$rootScope.$broadcast("noReset::click", attr.noResetNavbar);
					form.$setPristine();
					$rootScope.$broadcast("no::validate:reset");
				}
				el.bind("click", _reset.bind(null, ctrl));
			}
		};
	}])

	.directive("noEnterKey", [function() {
		function _enterPressed(el, scope, attr) {

		}

		function _link(scope, el, attr) {
			el.bind("keypress", function(e) {
				var keyCode = e.which || e.keyCode;

				if (keyCode === 13) //Enter is pressed
				{
					var frm = el.closest("[no-form], [ng-form]");

					frm.find(attr.noEnterKey).click(); //Assume that it is a button
				}
			});
		}

		var directive = {
			restrict: "A",
			link: _link
		};

		return directive;
	}])

	.directive("noValidation", ["PubSub", "noParameterParser", function(pubsub, noParameterParser) {
		return {
			restrict: "A",
			require: "form",
			link: function(scope, el, attrs, form) {
				//watch for validation flags and broadcast events down this
				//directives hierarchy.
				var wk = form.$name + ".$dirty";
				//console.log("noValidation", wk, form, scope[wk], Object.is(form, scope[wk]));
				var unbind = scope.$watch(wk, function(n, o, s) {
					console.log("noValidation", this.$name, "isDirty", this.$dirty, n, o);
					pubsub.publish("no-validation::dirty-state-changed", {
						isDirty: form.$dirty,
						pure: noParameterParser.parse(form),
						form: form
					});
				}.bind(form));

				scope.$on("$destroy", unbind);
			}
		};
	}]);
})(angular);
