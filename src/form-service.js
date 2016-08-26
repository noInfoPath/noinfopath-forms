//form-service.js
(function (angular, undefined) {
	"use strict";

	/* Replacement for NoForm / NoSubmit */
	function NoFormService($rootScope, $compile, $stateParams, noNCLManager, noTransactionCache, noLoginService) {
		this.save = function(ctx, scope, el, attrs) {
			var form = el.closest("no-form[ng-form]");
			if(scope.$validator.$valid) {
				var data = {},
					models = form.find("[ng-model]").toArray(),
					ngModelValues = models.map(function(m) {
						return m.attributes['ng-model'].value;
					}),
					hashStore = noNCLManager.getHashStore($stateParams.fid),
					noTransactionConfig = hashStore.get(hashStore.root).noComponent.noForm,
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, noTransactionConfig, $rootScope);

				angular.forEach(ngModelValues, function(value, i) {
					data[value.split(".").pop()] = noInfoPath.getItem(scope, value);
				});

				//Adding remote destination information
				// noTrans.remote = {
				// 	databaseName: "NoInfoPath_AppStore",
				// 	entityName: "appConfigs"
				// };

				noTrans.upsert(data)
					.then(function (resp) {
						noTransactionCache.endTransaction(noTrans);
						scope.noGrowler.growl("success");
					})
					.catch(function (err) {
						console.error(err);
					});


				console.log(data);
			} else {
				scope.noGrowler.growl("error", undefined, "Form invalid!");
				return { pauseFor: 1000 };
			}
		};
	}

	angular.module("noinfopath.forms")

		.service("noFormService", ["$rootScope", "$compile", "$stateParams", "noNCLManager", "noTransactionCache", "noLoginService", NoFormService])

	;

})(angular);
