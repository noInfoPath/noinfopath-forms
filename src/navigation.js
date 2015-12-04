//navigation.js
(function(angular, undefined) {
	"use strict";
	var stateProvider;

	angular.module("noinfopath.forms")
		.config(["$stateProvider", function($stateProvider){
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
					"home": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav);

						$state.go(route);
					},
					"back": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav),
							// params = {
							// 	entity: $state.params.entity
							// };
							params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function() {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function() {
						var route = noInfoPath.getItem(config.noNavBar.routes, attrs.noNav),
							params = scope.$root.noNav[route];

						params = params ? params : {};

						if (attrs.noNav === "new" && route == "vd.entity.edit") {
							params.entity = $state.params.entity;
							params.id = "";
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
					"undefined": function() {}
				},
				config, html;

			function saveConfig(c) {
				config = c;
				//console.log(config);
				return $q.when(config);
			}

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if (!navFn) navFn = navFns["undefined"];

				//navFn(config.noNavBar.routes[navFnKey], $state.params);
				navFn();
			}

			function finish() {
				el.click(click);
			}

			noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
				.then(saveConfig)
				.then(finish)
				.catch(function(err) {
					console.error(err);
				});


		}

		return {
			restrict: "A",
			scope: false,
			link: _link
		};
	}])

	.directive("noNavBar", ["$q", "$compile", "$http", "$state", "noFormConfig", function($q, $compile, $http, $state, noFormConfig) {
		var routeNames = {
				search: "vd.entity.search",
				edit: "vd.entity.edit",
				trialSummary: "vd.observations.trialplot",
				observationsEdit: "vd.observations.editor",
				observationsNew: "vd.observations.new"
			},
			navNames = {
				search: "search",
				edit: "edit",
				basic: "basic"
			};

		function _link(scope, el, attrs) {
			var config, html;

			function saveConfig(c) {
				config = c;
				//console.log(config);
				return $q.when(config);
			}

			function getTemplate() {

				function templateUrl(tplKey) {
					return "navbars/no-navbar-" + tplKey + ".tpl.html";
				}

				var tplKey = noFormConfig.navBarKeyFromState($state.current.name),
					tplUrl = templateUrl(tplKey);

				return $http.get(tplUrl)
					.then(function(resp) {
						html = resp.data;
						if (tplKey === navNames.edit) {
							html = html.replace(/{noNavBar\.scopeKey\.readOnly}/g, config.noNavBar.scopeKey.readOnly);
							html = html.replace(/{noNavBar\.scopeKey\.writeable}/g, config.noNavBar.scopeKey.writeable);
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

			function finish() {
				noFormConfig.showNavBar();
			}

			noFormConfig.getFormByRoute($state.current.name, $state.params.entity, scope)
				.then(saveConfig)
				.then(getTemplate)
				.then(finish)
				.catch(function(err) {
					console.error(err);
				});
		}

		return {
			restrict: "E",
			scope: false,
			link: _link
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

	.service("noNavigation", ["$q", "$http", "$state", function($q, $http, $state){
		this.configure = function(){
			return $q(function(resolve, reject){
				var routes;

				function saveRoutes(resp){
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates(){
					for(var r in routes){
						var route = routes[r];

						route.data = { entities: {} };

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
	}])
	;
})(angular);
