//tabs.js
(function (angular) {
	function NoTabsDirective($compile, $state, noFormConfig, noDataSource, noActionQueue, noDataManager, noNCLManager, PubSub) {
		function _resolveID(ctx) {
			return noInfoPath.sanitize(ctx.routeName) + "_" + (ctx.componentKey||"verticalTabs").split(".").pop();
		}

		function _resolveOrientation(noTab) {
			var ul = "nav nav-tabs";

			switch((noTab.orientation || "").toLowerCase()) {
				case "left":
					ul = "nav nav-tabs tabs-left col-sm-2";
					break;
				case "left-flex":
					ul = "nav nav-tabs tabs-left";
					break;
			}

			//console.log("noTabs::_resolveOrientation", ul);

			return ul;
		}

		function _click(ctx, scope, el, e) {
			var initialClick = !e.preventDefault;

			if(!initialClick) e.preventDefault();

			//console.log("noTabs ctx.isDirty", ctx.isDirty);

			if(ctx.widget && ctx.widget.preventTabChangeOnDirty !== false && ctx.isDirty) return;

			var ul = el.find("ul").first(),
				tab = ul.find("li.active"),
				ndx = tab.attr("ndx"),
				noid = el.attr("noid"),
				id = el.attr("id"),
				pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']"),
				//el.find("no-tab-panel[ndx='" + ndx + "']").first(),
				tabKey = ctx.component && ctx.component.scopeKey ? ctx.component.scopeKey : "noTabs_" + noid,
				actions = (ctx.component && ctx.component.actions) || (ctx.widget && ctx.widget.actions),
				execQueue = actions ? noActionQueue.createQueue(ctx, scope, el, actions) : undefined,
				tabState = $state.current.data.noTabs[id];

				//console.log(tabState, $state.current.data.backtracking);

			//First deactivate the active tab.
			tab.removeClass("active");
			pnl.addClass("ng-hide");

			//Next activate the tab that was clicked.
			if(initialClick) {
				tab = $state.current.data.backtracking ? el.find("li[ndx='" + tabState.tabIndex  + "']")  : angular.element(e).closest("li");
			} else {
				tab = angular.element(e.target).closest("li");
			}

			ndx = tab.attr("ndx");
			pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']");

			tab.addClass("active");
			pnl.removeClass("ng-hide");

			tabState.tab = tab;
			tabState.panel = pnl;
			tabState.tabIndex = ndx;

			if(ctx.noElement) {
				ctx.noElement.activeTab = Number(ndx);
				scope.$evalAsync(function() {
					scope[tabKey] = ndx;
				});
				//selectTab(ndx, ctx);
				// scope[tabKey] = ndx;
			} else {
				noInfoPath.setItem(scope, tabKey, {
					ndx: ndx,
					btnBar: tab.children("a").attr("btnbar"),
					title: tab.children("a").text()
				});
			}

			if(execQueue) {
				noActionQueue.synchronize(execQueue)
					.then(PubSub.publish.bind(PubSub, "noTabs::change", tabState));
			}else{
				//scope.$broadcast("")
				PubSub.publish("noTabs::change", tabState);
			}


		}

		function _static(ctx, scope, el, attrs) {
			//console.log("noTabs::_static");

			var ul = el.find("ul").first(),
				lis = ul.length > 0 ? ul.children() : null,
				pnls = el.find("no-tab-panels").first().children("no-tab-panel"),
				def = ul.find("li.active"),
				defNdx;

			pnls.addClass("ng-hide");

			el.find("no-tab-panels").first().addClass("tab-panels");

			// el.find("no-tab-panels > no-tab-panel > div")
			// 	.addClass("no-m-t-lg");

			for(var lii = 0, ndx = 0; lii < lis.length; lii++) {
				var lie = angular.element(lis[lii]);

				if(!lie.is(".filler-tab")) {
					lie.attr("ndx", ndx);
					angular.element(pnls[ndx]).attr("ndx", ndx++);
				}

			}

			lis.find("a:not(.filler-tab)").click(_click.bind(ctx, ctx, scope, el));

		}

		function _clickRoute(scope, el, attrs, e) {
			var initialClick = !e.preventDefault;

			if(!initialClick) e.preventDefault();

			//console.log("noTabs ctx.isDirty", ctx.isDirty);
			var ul = el.find("ul").first(),
				tab = ul.find("li.active"),
				ndx = tab.attr("ndx"),
				noid = el.attr("noid"),
				id = el.attr("id"),
				pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']");

			//First deactivate the active tab.
			tab.removeClass("active");
			//pnl.addClass("ng-hide");

			//Next activate the tab that was clicked.
			if(initialClick) {
				tab = angular.element(e).closest("li");
			} else {
				tab = angular.element(e.target).closest("li");
			}

			ndx = tab.attr("ndx");
			//pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']");

			tab.addClass("active");
			//pnl.removeClass("ng-hide");

			// tabState.tab = tab;
			// tabState.panel = pnl;
			// tabState.tabIndex = ndx;
			$state.go(tab.attr("no-sref"));

			PubSub.publish("noTabs::change", {
				tab: tab,
				pnl: pnl,
				name: attrs.scopeKey,
				ndx: ndx,
				btnBar: tab.children("a").attr("btnbar"),
				title: tab.children("a").text()
			});

		}

		function _dynamic(ctx, scope, el, attrs) {
			//console.log("noTabs::_dynamic");
			var dsCfg, ds;

			if(ctx.noid) {
				dsCfg = ctx.noComponent.noDataSource;
				ds = noDataSource.create(dsCfg, scope);

				ds.read()
					.then(function(data) {
						var tabCfg = ctx.noComponent.noTabs,
							ul = el.find("ul").first(),
							pnls = el.find("no-tab-panels").first(),
							defaultTab;


						if(tabCfg.orientation) ul.addClass(_resolveOrientation());

						for(var i = 0; i < data.length; i++) {
							var li = angular.element("<li></li>"),
								a = angular.element("<a href=\"\#\"></a>"),
								datum = data[i],
								ndx = datum[tabCfg.valueField],
								txt = datum[tabCfg.textField];

							if(i === 0) {
								li.addClass("active");
								// noInfoPath.setItem(scope, tabKey, {
								// 	ndx: ndx,
								// 	btnBar: tab.children("a").attr("btnbar"),
								// 	title: txt
								// });
								defaultTab = a;
							}

							li.attr("ndx", ndx);
							a.text(txt);

							li.append(a);

							ul.append(li);
						}

						ul.find("li > a").click(_click.bind(ctx, ctx, scope, el));

						var tab = el.find("ul").find("li.active");
						_click(ctx, scope, el, tab.children("a"));

					});

			} else {
				// an attempt for complete backwards compatability
				dsCfg = ctx.resolveDataSource(ctx.component.noDataSource);
				ds = noDataSource.create(dsCfg, scope);

				noDataManager.cacheRead(dsCfg.name, ds)
					.then(function (data) {
						var tabCfg = ctx.component.noTabs,
							ul = el.find("ul").first(),
							pnls = el.find("no-tab-panels").first();

						ul.addClass(_resolveOrientation(ctx.widget));

						el.find("no-tab-panels").first().addClass("tab-panels");

						if(ctx.widget.orientation !== "left-flex") {

							if(ctx.widget.class) {
								//TODO: Implement class as an object that contains properties for
								//		the different components of the tabs that are dynamically
								//		create by the widget.
							}else{
								el.find("no-tab-panels").first().addClass("col-sm-10");
								//el.find("no-tab-panels > no-tab-panel > div").addClass("no-m-t-lg");
							}
						}

						for(var i = 0; i < data.length; i++) {
							var li = angular.element("<li></li>"),
								a = angular.element("<a href=\"\#\"></a>"),
								datum = data[i],
								ndx = datum[tabCfg.valueField],
								txt = datum[tabCfg.textField];

							if(i === 0) {
								li.addClass("active");
								defaultTab = a;
							}

							li.attr("ndx", ndx);

							a.text(txt);

							li.append(a);

							ul.append(li);
						}

						ul.find("li > a").click(_click.bind(ctx, ctx, scope, el));

						var tab = el.find("ul").find("li.active");
						_click(ctx, scope, el, tab.children("a"));
						//tab.children("a").click.call();

					});
			}

		}

		function _uiRouter(scope, el, attrs) {
			var ul = el.find("ul").first(),
				lis = ul.length > 0 ? ul.children() : null,
				pnls = el.find("no-tab-panels").first().children("no-tab-panel"),
				def = ul.find("li.active"),
				defNdx;

			//NOTE: Why is this here?
			el.find("no-tab-panels").first().addClass("tab-panels");

			// el.find("no-tab-panels > no-tab-panel > div")
			// 	.addClass("no-m-t-lg");

			for(var lii = 0, ndx = 0; lii < lis.length; lii++) {
				var lie = angular.element(lis[lii]);

				if(!lie.is(".filler-tab")) {
					lie.attr("ndx", ndx);
					angular.element(pnls[ndx]).attr("ndx", ndx++);
				}

			}

			lis.find("a:not(.filler-tab)").click(_clickRoute.bind(null, scope, el, attrs));
		}

		function __makeScopeKey(ctx) {
			if(!ctx.component) return "undefined";

			var x = ctx.component && ctx.component.scopeKey,
				t = ctx.componentKey.split("."),
				l = t[t.length -1],
				r = x || l;

			return r;
		};
		function _link(ctx, scope, el, attrs) {

			var scopeKey = __makeScopeKey(ctx),
				noForm = ctx.form,
				noTab = ctx.widget,
				dynamic = ctx.noElement && !ctx.noElement.tabstrip,
				pubID;

				console.log("noTabs:ctx", ctx);

			if(attrs.noForm) {
				if((noTab && ctx.component.noDataSource) || dynamic) {
					_dynamic(ctx, scope, el, attrs);
				} else {
					_static(ctx, scope, el, attrs);
					var tab = el.find("ul").find("li.active");
					// pnl = el.find("no-tab-panels").first(),
					// ndx2 = tab.attr("ndx"),
					// noid = el.attr("noid"),
					// key = "noTabs_" + noid;

					_click(ctx, scope, el, tab.children("a"));

					// noInfoPath.setItem(scope, key, ndx2);
					// scope.$root.$broadcast("noTabs::Change", tab, pnl, noTab);
				}
			} else {
				switch(attrs.panelType) {
					case "ui-router":
						_uiRouter(scope, el, attrs);
						break;
				}
			}

			if(!scope[scopeKey + "_api"]) scope[scopeKey + "_api"] = {};
			scope[scopeKey + "_api"].click = function(tabs, ndx) {
				var tab = tabs.find("[ndx=" + ndx + "]");
				console.log(scopeKey + "_api", tab);
				tab.next().click();

			}.bind(null, el.find("ul"));


			// scope.noTab = {
			// 	select: _click.bind(null, ctx, scope, el)
			// };
			//
			// console.log(scope);

			pubID = PubSub.subscribe("no-validation::dirty-state-changed", function(state){
				if(ctx.routeName) {
					ctx.isDirty = state.isDirty;
					if(ctx.isDirty) console.log("noTabs", "no-validation::dirty-state-changed::isDirty");
				}
			});

			scope.$on("$destroy", function () {
				//console.log("noTabs", "$destroy", "PubSub::unsubscribe", "no-validation::dirty-state-changed", pubID);
				PubSub.unsubscribe(pubID);
			});

		}

		function _compile(el, attrs) {
			//Ensure that the current state has a noTabs node.
			if(!$state.current.data.noTabs) $state.current.data.noTabs = {};

			var ctx = attrs.noForm ? noFormConfig.getComponentContextByRoute($state.current.name, $state.params.entity, "noTabs", attrs.noForm) : {},
				id =  _resolveID(ctx),
				noid = el.attr("noid"),
				tabKey = ctx.component && ctx.component.scopeKey ? ctx.component.scopeKey : "noTabs_" + noid;


			if(attrs.noid) {
				var hashStore = noNCLManager.getHashStore($state.params.fid || $state.current.name.split(".").pop());
				ctx = hashStore.get(attrs.noid);
			}

			if(ctx.routeName) {
				el.attr("id", id);
			} else {
				id = el.attr("id");
			}

			//Register this noTabs if it is not already on the currentState.
			if(!$state.current.data.noTabs[id])
				$state.current.data.noTabs[id] = {noTabsID: id, noTabs: el, tabKey: tabKey, noid: noid, tabIndex: null, tab: null, panel: null};


			return _link.bind(ctx, ctx);
		}

		return {
			restrict: "E",
			compile: _compile
		};
	}

	angular.module("noinfopath.ui")
		.directive("noTabs", ["$compile", "$state", "noFormConfig", "noDataSource", "noActionQueue", "noDataManager", "noNCLManager", "PubSub", NoTabsDirective]);
})(angular);
