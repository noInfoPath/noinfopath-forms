//parameter-parser.js
(function(angular, undefined){
	"use strict";

	angular.module("noinfopath.forms")
		.service("noParameterParser", [function () {
			this.parse = function (data) {
				var keys = Object.keys(data).filter(function (v, k) {
						if(v.indexOf("$") === -1 && v.indexOf(".") === -1) return v;
					}),
					values = {};
				keys.forEach(function (k) {
					var haveSomething = !!data[k],
						haveModelValue = haveSomething && data[k].hasOwnProperty("$modelValue");

					if(haveModelValue) {
						values[k] = data[k].$modelValue;
					} else if(haveSomething) {
						values[k] =  data[k];
					} else {
						values[k] = "";
					}

				});

				return values;
			};
			this.update = function (src, dest) {
				var keys = Object.keys(src).filter(function (v, k) {
					if(v.indexOf("$") === -1) return v;
				});
				keys.forEach(function (k) {
					var d = dest[k];
					if(d && d.hasOwnProperty("$viewValue")) {
						d.$setViewValue(src[k]);
						d.$render();
						d.$setPristine();
						d.$setUntouched();
					} else {
						dest[k] = src[k];
					}
				});
			};
		}]);
})(angular);
