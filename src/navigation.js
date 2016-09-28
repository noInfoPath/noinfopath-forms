//navigation.js
(function (angular, undefined) {
	"use strict";

	function NoNavigationDirective($injector, $q, $state, noFormConfig, noActionQueue, noNavigationManager, PubSub) {
		var templateFactories = {
			"button": function (ctx, cfg, scope, el) {

				var btn = angular.element("<button type=\"button\"></button>"),
					icon = angular.element("<span></span>");

				btn.addClass(cfg.class);

				if(cfg.label) {
					btn.append(cfg.label);
				}

				if(cfg.icon) {
					icon.addClass(cfg.icon.class);
					switch(cfg.icon.position) {
						case "left":
							btn.prepend(icon);
							break;

						default:
							btn.append(icon);
							break;
					}
				}

				return btn;
			},
			"message": function (ctx, cfg, scope, el) {
				var div = angular.element("<div></div>");
				div.html(cfg.template);
				div.addClass(cfg.class);
				return div;
			}
		};

		function _click(ctx, btnCfg, scope, el, e) {
			e.preventDefault();

			var deferred = $q.defer(),
				execQueue = noActionQueue.createQueue(ctx, scope, el, btnCfg.actions);

			return noActionQueue.synchronize(execQueue)
				.then(function (results) {
					console.log(results);
				})
				.catch(function (err) {
					console.error(err);
				});

		}

		function _getCurrentNavBar(navBarName, scope, el) {
			return el.find("navbar[bar-id='" + scope.noNavigation[navBarName].currentNavBar + "']");
		}

		function _changeNavBar(ctx, el, n, o, s) {
			//console.log(ctx, el, n, o, s);
			if(n !== o) {
				el.find("navbar").addClass("ng-hide");
				el.find("navbar[bar-id='" + n + "']").removeClass("ng-hide");

			}
		}

		function _compile(el, attrs) {
			var ctx = noFormConfig.getComponentContextByRoute($state.current.name, undefined, "noNavigation", attrs.noForm);
			el.attr("noid", noInfoPath.createNoid());
			return _link.bind(ctx, ctx);
		}

		function _link(ctx, scope, el, attrs) {
			var bars = ctx.component.bars,
				pubID;

			for(var b in bars) {
				var bar = bars[b],
					btnBar = angular.element("<navbar></navbar>");

				btnBar.attr("bar-id", b);

				btnBar.addClass(bar.class);

				if(b !== ctx.component.default) {
					btnBar.addClass("ng-hide");
				}

				for(var c in bar.components) {
					var comp = bar.components[c],
						tmpl = templateFactories[comp.type],
						btn = tmpl(ctx, comp, scope, el);

					btn.click(_click.bind(ctx, ctx, comp, scope, el));

					btnBar.append(btn);
				}

				el.append(btnBar);
			}

			//noActionQueue.configureWatches(ctx, scope, el, ctx.navigation.watches);
			scope.$watch("noNavigation." + ctx.component.scopeKey + ".currentNavBar", _changeNavBar.bind(ctx, ctx, el));

			pubID = PubSub.subscribe("no-validation::dirty-state-changed", function (navBarName, state) {
				var cnav = _getCurrentNavBar(navBarName, scope, el),
					barid = cnav.attr("bar-id").split(".")[0],
					baridDirty = (barid || "") + ".dirty";

				console.log("no-validation::dirty-state-changed", "isDirty", state.isDirty, barid, baridDirty);
				noNavigationManager.updateValidationState(scope, navBarName, state);

				if(state.isDirty) {
						noNavigationManager.changeNavBar(this, scope, el, navBarName, baridDirty);
				}else{
						noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
				}
				// if(cnav && !cnav.attr("bar-id").includes(".dirty")) {
				// 	noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
				// }
			}.bind(ctx, ctx.component.scopeKey));

			console.log("pubID", pubID);
			scope.$on("$destroy", function () {
				console.log("$destroy", "PubSub::unsubscribe", "no-validation::dirty-state-changed");
				PubSub.unsubscribe(pubID);
			});

			// scope.$watchCollection(ctx.primary.scopeKey, function (navBarName, e) {
			// 	var cnav, barid;
			// 	if(scope[ctx.primary.scopeKey].$dirty) {
			// 		cnav = _getCurrentNavBar(navBarName, scope, el);
			// 		barid = cnav.attr("bar-id") + ".dirty";
			// 		if(!cnav.attr("bar-id").includes(".dirty")) {
			// 			noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
			// 		}
			// 	} else {
			// 		cnav = _getCurrentNavBar(navBarName, scope, el);
			// 		barid = cnav.attr("bar-id").replace(/\.dirty/, "");
			// 		noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
			// 	}
			// }.bind(ctx, ctx.component.scopeKey));

		}

		return {
			restrict: "E",
			compile: _compile
		};
	}

	function NoNavigationManagerService($q, $http, $state) {
		this.configure = function () {
			return $q(function (resolve, reject) {
				var routes;

				function saveRoutes(resp) {
					routes = resp.data;

					return $q.when(true);
				}

				function configureStates() {
					for(var r in routes) {
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

		this.changeNavBar = function (ctx, scope, el, navBarName, barid) {
			//console.log("changeNavBar", arguments);
			noInfoPath.setItem(scope, "noNavigation." + navBarName + ".currentNavBar", barid);
		};

		this.updateValidationState = function (scope, navBarName, state) {
			noInfoPath.setItem(scope, "noNavigation." + navBarName + ".validationState", state);
		};


	}

	var stateProvider;

	angular.module("noinfopath.forms")
		.config(["$stateProvider", function ($stateProvider) {
			stateProvider = $stateProvider;
	}])

	.run(["$rootScope", function ($rootScope) {
		$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
			//console.log("$stateChangeSuccess");
			event.currentScope.$root.noNav = event.currentScope.$root.noNav ? event.currentScope.$root.noNav : {};
			event.currentScope.$root.noNav[fromState.name] = fromParams;
		});

		}])

	.directive("noNav", ["$q", "$state", "noFormConfig", function ($q, $state, noFormConfig) {

		function _link(scope, el, attrs) {
			var navFns = {
					"home": function (nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav);

						$state.go(route);
					},
					"back": function (nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
							// params = {
							// 	entity: $state.params.entity
							// };
							params = scope.noNav[route];

						$state.go(route, params);
					},
					"writeable": function () {
						noFormConfig.showNavBar(noFormConfig.navBarNames.WRITEABLE);
					},
					"new": function (nbCfg) {
						var route = noInfoPath.getItem(nbCfg.routes, attrs.noNav),
							params = scope.$root.noNav[route];

						params = params ? params : {};

						params.entity = $state.params.entity;
						if(attrs.noNav === "new" && route == "vd.entity.edit") {
							params.id = "";
						} else {
							params = $state.params;
						}

						//console.log(route, params);
						if(route) $state.go(route, params);

					},
					"kendo-new-row": function () {
						scope.noGrid.addRow();
					},
					"undo": function () {
						noFormConfig.showNavBar(noFormConfig.navBarNames.READONLY);
					},
					"undefined": function (navbar) {
						noFormConfig.showNavBar(navbar); // default behaviour to attempt to navigate to new navbar
					}
				},
				config, html;

			function click() {
				var navFnKey = attrs.noNav,
					navFn = navFns[navFnKey];

				if(!navFn) navFn = navFns["undefined"].bind(null, navFnKey);

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

	.directive("noNavBar", ["$q", "$compile", "noTemplateCache", "$state", "noFormConfig", function ($q, $compile, noTemplateCache, $state, noFormConfig) {
		var navNames = {
			search: "search",
			edit: "edit",
			basic: "basic"
		};

		function getTemplateUrl(elem, attr) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);

			var url = "navbars/no-navbar-basic.tpl.html",
				nbCfg = config.noNavBar || (config.route.data ? config.route.data.noNavBar : undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);

			if(tplKey) {
				url = "navbars/no-navbar-" + tplKey + ".tpl.html";
			} else if(nbCfg && nbCfg.templateUrl) {
				url = nbCfg.templateUrl;
			}

			return url;
		}

		function getTemplate() {

			var nbCfg = config.noNavBar || config.route.data.noNavBar,
				tplKey = noFormConfig.navBarKeyFromState($state.current),
				tplUrl = templateUrl(tplKey, nbCfg);

			return noTemplateCache.get(tplUrl)
				.then(function (resp) {
					html = resp; //resp.data
					if(tplKey === navNames.edit) {
						html = html.replace(/{noNavBar\.scopeKey\.readOnly}/g, nbCfg.scopeKey.readOnly);
						html = html.replace(/{noNavBar\.scopeKey\.writeable}/g, nbCfg.scopeKey.writeable);
					}
					html = $compile(html)(scope);
					el.html(html);
					return;
				})
				.catch(function (err) {
					if(err.status === 404) {
						throw "noFormConfig could not locate the file `navbars/no-nav-bar.json`.";
					} else {
						throw err;
					}
				});
		}

		function _link(scope, el, attrs) {
			scope.$on("noTabs::Change", function (e, t, p) {
				var te = angular.element(t.html()),
					ta = te.attr("btnbar");

				if(ta) {
					scope.currentTabName = ta;
					noFormConfig.btnBarChange(ta);
				}
			});

			noFormConfig.showNavBar();

			scope.$on("noForm::dirty", function () {
				if(scope.currentTabName) {
					noFormConfig.btnBarChange(scope.currentTabName + ".dirty");
				}
			});

			scope.$on("noForm::clean", function () {
				if(scope.currentTabName) {
					noFormConfig.btnBarChange(scope.currentTabName);
				}
			});

		}

		function _compile(el, attrs) {
			var config = noFormConfig.getFormByRoute($state.current.name, $state.params.entity),
				writeable = el.find("[no-navbar='writeable']"),
				noReset = writeable.find("[no-reset='{{noNavBar.scopeKey.writeable}}']"),
				nbCfg = config.noNavBar || (config.route.data ? config.route.data.noNavBar : undefined),
				tplKey = noFormConfig.navBarKeyFromState($state.current);


			if(tplKey === navNames.edit) {
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

	.directive("noReadOnly", [function () {
		function _link(scope, el, attrs) {
			el.append("<div class=\"no-editor-cover\"></div>");
		}

		return {
			restrict: "A",
			link: _link
		};
	}])

	.directive("noNavigation", ["$injector", "$q", "$state", "noFormConfig", "noActionQueue", "noNavigationManager", "PubSub", NoNavigationDirective])

	.service("noNavigationManager", ["$q", "$http", "$state", NoNavigationManagerService]);
})(angular);
