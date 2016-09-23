(function(angular, undefined){
	"use strict";
	
	angular.module("noinfopath.forms")
		.service("noParameterParser", [function () {
			this.parse = function (data) {
				var keys = Object.keys(data).filter(function (v, k) {
						if(v.indexOf("$") === -1) return v;
					}),
					values = {};
				keys.forEach(function (k) {
					values[k] = data[k].$modelValue || data[k];
				});
				return values;
			};
			this.update = function (src, dest) {
				var keys = Object.keys(src).filter(function (v, k) {
					if(v.indexOf("$") === -1) return v;
				});
				keys.forEach(function (k) {
					var d = dest[k];
					if(d) {
						d.$setViewValue(src[k]);
						d.$render();
					} else {
						dest[k] = src[k];
					}
				});
			};
		}]);
})(angular);
