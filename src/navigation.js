//navigation.js
(function (angular, undefined) {
	"use strict";
	/*
	*	## noNavigation Directive
	*
	*	##### Sample navbar configuration
	*
	*	```json
	*	"quantities": {
	*		"ngShow": "!project.$dirty",
	*		"class": "no-flex justify-left no-flex-item size-1",
	*		"components": [
	*			{
	*				"type": "button",
	*				"actions": [{
	*					"provider": "$state",
	*					"method": "go",
	*					"params": ["efr.client.search"],
	*					"noContextParams": true
	*				}],
	*				"class": "btn btn-default no-flex-item",
	*				"icon": {
	*					"class": "glyphicon glyphicon-arrow-left no-text"
	*				}
	*			}
	*		]
	*	}
	*	```
	*
	*	When a bar configuration is a string then it is an alias
	*	or a reference to another bar configuration.
	*/
	function NoNavigationDirective($injector, $q, $state, noFormConfig, noActionQueue, noNavigationManager, PubSub, noKendoHelpers) {
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

				btn.click(_click.bind(ctx, ctx, cfg, scope, el));

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

			delete scope.noNavigationError;

			return noActionQueue.synchronize(execQueue)
				.then(function (results) {
					return results;
				})
				.catch(function (err) {
					scope.noNavigationError = err;
					throw err;
				});

		}

		function _getCurrentNavBar(navBarName, scope, el) {
			var nbc = scope.noNavigation[navBarName];

			if(nbc) {
				var nbe = el.find("navbar[bar-id='" + nbc.currentNavBar + "']");
				//if(nbe.length === 0) console.log("_getCurrentNavBar", navBarName,  el.parent().parent().html());
				return nbe;
			} else {
				throw {error: "could not locate navbar on scope.", navBarName: navBarName, scope: scope, el: el};
			}
		}

		function _changeNavBar(ctx, el, n, o, s) {
			if(n !== o) {
				el.find("navbar").addClass("ng-hide");
				el.find("navbar[bar-id='" + n + "']").removeClass("ng-hide");
			}
		}

		function _registerWatch(ctx, scope, el, uid) {
			var scopeKey = uid ? ctx.component.scopeKey + "_" + uid : ctx.component.scopeKey;

			noInfoPath.setItem(scope, "noNavigation." + scopeKey + ".currentNavBar", ctx.component.default);

			/*
			*	noNavigation sets up an AngularJS watch on the specific rows property
			*	on the scope, and also captures and stores the watch's unregister method
			*	for later use.
			*
			*	When the currentNavBar value  changes for a given row the
			*	`noKendoHelpers.changeRowNavBarWatch` method is called to handle
			*	the event.
			*/
			if(uid) {
				var unRegWatch = scope.$watch("noNavigation." + scopeKey + ".currentNavBar", noKendoHelpers.changeRowNavBarWatch.bind(ctx, ctx, scope, el));

				noInfoPath.setItem(scope, "noNavigation." + scopeKey + ".deregister", unRegWatch);
			} else {
				console.warn("Possible dead code area.");
			}

		}

		function _compile(el, attrs) {
			var ctx = noFormConfig.getComponentContextByRoute($state.current.name, undefined, "noNavigation", attrs.noForm);
			//el.attr("noid", noInfoPath.createNoid());
			return _link.bind(ctx, ctx);
		}

		function _link(ctx, scope, el, attrs) {
			var bars = ctx.component.bars,
				pubID, unwatch;

			el.empty();

			/*
			*	#### @property noNavigation::bars
			*
			*	Creates a new `<navbar>` element for each navbar found in the
			*	no-forms noNavigation.bars configuration node.
			*/
			for(var b in bars) {
				var bar = bars[b],
					btnBar = angular.element("<navbar></navbar>");

				if(angular.isString(bar)){
					bar = bars[bar];  //Aliased
				}

				/*
				*	This directive adds a `bar-id` attribute to the `<navbar>` element using
				*	each bars configuration key.
				*/
				btnBar.attr("bar-id", b);

				/*
				*	#### @property noNavigation::bar::class
				*
				*	It then appends any CSS class defined in the configuration.
				*/
				btnBar.addClass(bar.class);

				/*
				*	#### @property noNavigation::default
				*
				*	noNavigation allows multiple bars to be defined, one bar is
				*	always defined as the default. So if a bar is not the default
				*	then add the AngularJS directive `ng-hide`.
				*/
				if(b !== ctx.component.default) {
					btnBar.addClass("ng-hide");
				}

				/*
				*	#### @property noNavigation::bar::components
				*
				*	Each bar can have one or more components.  Currently supported
				*	component types are `button` and `message`. Each component
				*	is rendered, events wired up and then appended to its navbar.
				*/
				for(var c in bar.components) {
					var comp = bar.components[c],
						tmpl = templateFactories[comp.type],
						renderedComp = tmpl(ctx, comp, scope, el);

					//JAG 1/7/2017 - moved this to the button template factory above.
					//btn.click(_click.bind(ctx, ctx, comp, scope, el));

					btnBar.append(renderedComp);
				}

				el.append(btnBar);
			}

			/*
			*	#### @property noNavigation::scopeKey
			*
			*	noNavigation keeps track of the currently visible navbar using
			*	an object called `noNavigation` that is store on Angular's scope.
			*	The `scopeKey` property is used to uniquely identify a given
			*	noNavigation instance on that noNavigation scope object.
			*
			*	noNavigation currently supports two distinct ways of using the
			*	scopeKey property; either stand-alone or in conjunction with
			*	a KendoUI Grid's RowUID.
			*/
			if(ctx.component.useKendoRowDataUid) {
				console.warn("Possible dead code area.");
				/*
				*	#### @property noNavigation::useKendoRowDataUid
				*
				*	This property is used when you want to use a noNavigation directive
				*	in a KendoUI Grid's column template. When this property is set to `true`
				*	the rows `UID` is included in the `scopeKey` for the noNavigation
				*	directive.
				*
				*	> Because AngularJS scopeKey don't like hyphens in their names,
				*	> they are replaced with underscores.
				*/
				var uid = noInfoPath.toScopeSafeGuid(noKendoHelpers.getGridRowUID(el));

				//_registerWatch(ctx, scope, el, uid);

				/*
				*	Due to the specific behavior of KendoUI Grid, and inline row editing,
				*	a way of detecting when they add and remove elements from a table
				*	was needed.  Using the HTML5 `MutationObserver` accomplishes this
				*	design goal. This is done by getting a reference to the `TBODY`
				*	element that contains the grid rows, which will be the observers
				*	"target." A new `MutationObserver` object is created giving it
				*	a callback method that will provide an array of mutations. Each
				*	mutation has a list of removed nodes and a list of added nodes.
				*/


			} else {
				_registerWatch(ctx, scope, el);

				if(!scope.noNavigation) scope.noNavigation = {};

				if(!scope.noNavigation[ctx.component.scopeKey]) scope.noNavigation[ctx.component.scopeKey] = {};

				unwatch = scope.$on("noAreaLoader::areaReady", function(ctx){
					/*
					*	When a KendoUI Grid is not involved, the noNavigation directive instead
					*	subscribes to the `no-validation::dirty-state-changed` event published by
					*	the noValidation directive.
					*/
					pubID = PubSub.subscribe("no-validation::dirty-state-changed", function (navBarName, state) {
						var cnav = _getCurrentNavBar(navBarName, scope, el),
							barid = cnav.attr("bar-id") ? cnav.attr("bar-id").split(".")[0] : undefined,
							baridDirty = (barid || "") + ".dirty";

						//console.log("no-validation::dirty-state-changed", "isDirty", state.isDirty, barid, baridDirty);
						noNavigationManager.updateValidationState(scope, navBarName, state);

						if(state.isDirty) {
							//scope.noNavigation[navBarName].currentNavBar = baridDirty;
							//noNavigationManager.changeNavBar(this, scope, el, navBarName, baridDirty);
							_changeNavBar(this, el, baridDirty, barid, scope);
						}else{
							//scope.noNavigation[navBarName].currentNavBar = barid;
							//noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
							_changeNavBar(this, el, barid, baridDirty, scope);
						}

						// if(cnav && !cnav.attr("bar-id").includes(".dirty")) {
						// 	noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
						// }
					}.bind(ctx, ctx.component.scopeKey));
				}.bind(ctx, ctx));

			}


			//console.log("pubID", pubID);
			scope.$on("$destroy", function () {
				//console.log("$destroy", "PubSub::unsubscribe", "no-validation::dirty-state-changed");
				if(pubID) PubSub.unsubscribe(pubID);

				if(unwatch) unwatch();
			});
		}

		return {
			restrict: "E",
			compile: _compile
		};
	}

	function NoNavigationManagerService($q, $http, $state, noKendoHelpers) {
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
			var barkey = navBarName;
			var currentBar = noInfoPath.getItem(scope,  "noNavigation." + barkey + ".currentNavBar");

			if(currentBar !== barid) {
				if(barid === "^") {
					var p = currentBar.split(".");
					barid = p[0];
				}

				noInfoPath.setItem(scope, "noNavigation." + barkey + ".currentNavBar", barid);

				console.warn("changeNavBar", navBarName, currentBar, barid);
			}
		};

		this.changeGridRowNavBar = function (ctx, scope, el, gridScopeId, navBarName, barid) {

			var grid = scope[gridScopeId],
				tr = /*grid.wrapper.find(".k-grid-edit-row") ||*/ grid.select(),
				uid = (tr.attr("data-uid") || "").replace(/-/g, "_"),
				barkey = navBarName + "_" + uid;

			if(!uid) return;

			if(grid.editable && grid.editable.validatable && grid.editable.validatable.errors().length > 0) return;

			//console.log("changeNavBar", arguments);
			if(barid === "^") {
				var t = noInfoPath.getItem(scope,  "noNavigation." + barkey + ".currentNavBar"),
					p = t.split(".");

				barid = p[0];
			}

			noInfoPath.setItem(scope, "noNavigation." + barkey + ".currentNavBar", barid);
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

		.run(["$rootScope", "noAreaLoader", "noPrompt", "PubSub", "$state", function ($rootScope, noAreaLoader, noPrompt, PubSub, $state) {

			$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {



				if(toState.name === "startup") {
					toState.data = angular.extend({}, {registeredComponents: 0}, toState.data);
				} else {
					toState.data = angular.extend({}, {registeredComponents: noAreaLoader.registerArea(toState.name)}, toState.data);
				}

				toState.data.pubSubId = PubSub.subscribe("noSync::complete", function(a, b) {
					//TODO: Stash the pubsub id on the toState's data property
					//TODO: unsubscribe fromState's data.pubsub.id.
					if(toState.data.pubSubId) PubSub.unsubscribe(toState.data.pubSubId);
					//TODO: reload the current state. (if possible)
					$state.reload($state.current.name);
				});

				event.currentScope.$root.noNav = event.currentScope.$root.noNav ? event.currentScope.$root.noNav : {};
				event.currentScope.$root.noNav[fromState.name] = fromParams;

				noAreaLoader.unRegisterArea(fromState.name);

				//if(fromState.name === "startup") console.groupEnd();
				console.groupEnd();
				console.info("$stateChangeSuccess: from", fromState.name, "==>", toState.name);
				console.groupCollapsed();

				console.log("noAreaLoader::Start", toState.name);

				if(!toState.data.hidePrompt) {

					noPrompt.show("Loading Area", "<div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div>" , null, {width: "40%"});
				}

			});

			// $rootScope.$on("noAreaLoader::Complete", function (e, data) {
			//
			// });


			window.addEventListener("error", function() {
				console.groupEnd();
				noPrompt.hide(0);
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
				var unWatchChange  = scope.$on("noTabs::Change", function (e, t, p) {
					var te = angular.element(t.html()),
						ta = te.attr("btnbar");

					if(ta) {
						scope.currentTabName = ta;
						noFormConfig.btnBarChange(ta);
					}
				});

				noFormConfig.showNavBar();

				var unWatchDirty = scope.$on("noForm::dirty", function () {
					if(scope.currentTabName) {
						noFormConfig.btnBarChange(scope.currentTabName + ".dirty");
					}
				});

				var unWatchClean = scope.$on("noForm::clean", function () {
					if(scope.currentTabName) {
						noFormConfig.btnBarChange(scope.currentTabName);
					}
				});

				scope.$on("$destroy", function(){
					if(unWatchChange) unWatchChange();
					if(unWatchDirty) unWatchDirty();
					if(unWatchClean) unWatchClean();
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

		.directive("noNavigation", ["$injector", "$q", "$state", "noFormConfig", "noActionQueue", "noNavigationManager", "PubSub", "noKendoHelpers", NoNavigationDirective])

		.service("noNavigationManager", ["$q", "$http", "$state", "noKendoHelpers", NoNavigationManagerService]);
})(angular);
