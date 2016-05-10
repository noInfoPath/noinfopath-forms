//navigation.js
(function(angular, undefined) {
	"use strict";
	var stateProvider;

	angular.module("noinfopath.forms")
		.config(["$stateProvider", function($stateProvider) {
			stateProvider = $stateProvider;
		}])

	.run(["$rootScope", function($rootScope) {
		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
			//console.log("$stateChangeSuccess");
			event.currentScope.$root.noNav = event.currentScope.$root.noNav ? event.currentScope.$root.noNav : {};
			event.currentScope.$root.noNav[fromState.name] = fromParams;
		});

	}])

	.directive("noNav", ["$q", "$state", "noFormConfig", function($q, $state, noFormConfig) {

		function _link(scope, el, attrs) {
			var navFns = {
					"home": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav);

						$state.go(route);
					},
					"back": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
							// params = {
							// 	entity: $state.params.entity
							// };
							params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function(nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
							params = scope.$root.noNav[route];

						params = params ? params : {};

						params.entity = $state.params.entity;
						if (attrs.noNav === "new" && route == "vd.entity.edit") {
							params.id = "";
						} else {
							params = $state.params;
						}

						//console.log(route, params);
						if (route) $state.go(route, params);

					},
					"kendo-new-row": function() {
						scope.noGrid.addRow();
					},
					"undo": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.READONLY);
					},
					"undefined": function(navbar) {
						noFormConfig.showNavBar(navbar); // default behaviour to attempt to navigate to new navbar
					}
				},
				config, html;

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if (!navFn) navFn = navFns["undefined"].bind(null, navFnKey);

				//navFn(config.noNavBar.routes[navFnKey], $state.params);

				navFn(config.noNavBar || config.route.data.noNavBar);
			}

			config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope);

			el.click(click);


		}

		return {
			restrict: "A",
			scope: false,
			link: _link
		};
	}])

	.directive("noNavBar", ["$q", "$compile", "noTemplateCache", "$state", "noFormConfig", function($q, $compile, noTemplateCache, $state, noFormConfig) {
		var navNames = {
			search: "search",
			edit: "edit",
			basic: "basic"
		};

		function getTemplateUrl(elem, attr) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);

			var url = "navbars/no-navbar-basic.tpl.html",
				nbCfg = config.noNavBar || (config.route.data ? config.route.data.noNavBar: undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);

			if (tplKey) {
				url = "navbars/no-navbar-" + tplKey + ".tpl.html";
			} else if (nbCfg && nbCfg.templateUrl) {
				url = nbCfg.templateUrl;
			}

			return url;
		}

		function getTemplate() {

			var nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current),
				tplUrl = templateUrl(tplKey, nbCfg);

			return noTemplateCache.get(tplUrl)
				.then(function(resp) {
					html = resp; //resp.data
					if (tplKey === navNames.edit) {
						html = html.replace(/{noNavBar\.scopeKey\.readOnly}/g, nbCfg.scopeKey.readOnly);
						html = html.replace(/{noNavBar\.scopeKey\.writeable}/g, nbCfg.scopeKey.writeable);
					}
					html = $compile(html)(scope);
					el.html(html);
					return;
				})
				.catch(function(err) {
					if (err.status === 404) {
						throw "noFormConfig could not locate the file `navbars/no-nav-bar.json`.";
					} else {
						throw err;
					}
				});
		}

		function _link(scope, el, attrs) {
			scope.$on("noTabs::Change", function(e, t, p) {
				noFormConfig.btnBarChange(angular.element(t.html()).attr("btnbar"));
			});

			noFormConfig.showNavBar();
		}

		function _compile(el, attrs) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity),
				writeable = el.find("[no-navbar='writeable']"),
				noReset = writeable.find("[no-reset='{{noNavBar.scopeKey.writeable}}']"),
				nbCfg = config.noNavBar ||  (config.route.data ? config.route.data.noNavBar: undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);


			if (tplKey === navNames.edit) {
				noReset.attr("no-reset", nbCfg.scopeKey.writeable);
				// html = noReset.html().replace(/{noNavBar\.scopeKey\.readOnly}/g, );
				// html = noReset.html().replace(/{noNavBar\.scopeKey\.writeable}/g, nbCfg.scopeKey.writeable);
			}

			return _link;
		}

		return {
			restrict: "E",
			scope: false,
			compile: _compile,
			templateUrl: getTemplateUrl
		};
	}])

	.directive("noReadOnly", [function() {
		function _link(scope, el, attrs) {
			el.append("<div class=\"no-editor-cover\"></div>");
		}

		return {
			restrict: "A",
			link: _link
		};
	}])

	.service("noNavigation", ["$q", "$http", "$state", function($q, $http, $state) {
		this.configure = function() {
			return $q(function(resolve, reject) {
				var routes;

				function saveRoutes(resp) {
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates() {
					for (var r in routes) {
						var route = routes[r];

						route.data = angular.merge({
							entities: {}
						}, route.data);

						stateProvider.state(route.name, route);
					}

					resolve();
				}

				$http.get("navbars/routes.json")
					.then(saveRoutes)
					.then(configureStates)
					.catch(reject);
			});
		};
	}]);
})(angular);
