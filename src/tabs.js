//tabs.js
(function (angular) {
	function NoTabsDirective($compile, $state, noFormConfig, noDataSource, noActionQueue, noDataManager, noNCLManager, PubSub) {
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
			return ul;
		}

		function _click(ctx, scope, el, e) {
			e.preventDefault();

			//console.log("noTabs ctx.isDirty", ctx.isDirty);

			if(ctx.isDirty) return;

			var ul = el.find("ul").first(),
				tab = ul.find("li.active"),
				ndx = tab.attr("ndx"),
				noid = el.attr("noid"),
				pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']"),
				//el.find("no-tab-panel[ndx='" + ndx + "']").first(),
				tabKey = ctx.component && ctx.component.scopeKey ? ctx.component.scopeKey : "noTabs_" + noid,
				actions = (ctx.component && ctx.component.actions) || (ctx.widget && ctx.widget.actions),
				execQueue = actions ? noActionQueue.createQueue(ctx, scope, el, actions) : undefined;


			//First deactivate the active tab.
			tab.removeClass("active");
			pnl.addClass("ng-hide");

			//Next activate the tab that was clicked.
			tab = angular.element(e.target).closest("li");
			ndx = tab.attr("ndx");

			pnl = el.find("no-tab-panels").first().children("[ndx='"+ ndx + "']");

			tab.addClass("active");
			pnl.removeClass("ng-hide");

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


			//$scope.$broadcast("noGrid::refresh", $scope.docGrid ? $scope.docGrid._id : "");

			if(execQueue) {
				noActionQueue.synchronize(execQueue);
			}else{
				//scope.$broadcast("")
			}

			PubSub.publish("noTabs::change", {tabKey: tabKey, tabIndex: ndx});
		}

		function _static(ctx, scope, el, attrs) {
			//console.log("static");
			var ul = el.find("ul").first(),
				lis = ul.length > 0 ? ul.children() : null,
				pnls = el.find("no-tab-panels").first().children("no-tab-panel"),
				def = ul.find("li.active"),
				defNdx;

			pnls.addClass("ng-hide");

			el.find("no-tab-panels").first().addClass("tab-panels");

			el.find("no-tab-panels > no-tab-panel > div")
				.addClass("no-m-t-lg");

			for(var lii = 0, ndx = 0; lii < lis.length; lii++) {
				var lie = angular.element(lis[lii]);

				if(!lie.is(".filler-tab")) {
					lie.attr("ndx", ndx);
					angular.element(pnls[ndx]).attr("ndx", ndx++);
				}

			}

			lis.find("a:not(.filler-tab)").click(_click.bind(ctx, ctx, scope, el));

		}

		function _dynamic(ctx, scope, el, attrs) {
			var dsCfg, ds;

			if(ctx.noid) {
				dsCfg = ctx.noComponent.noDataSource;
				ds = noDataSource.create(dsCfg, scope);

				ds.read()
					.then(function(data) {
						var tabCfg = ctx.noComponent.noTabs,
							ul = el.find("ul").first(),
							pnls = el.find("no-tab-panels").first();

						if(tabCfg.orientation) ul.addClass(_resolveOrientation());

						for(var i = 0; i < data.length; i++) {
							var li = angular.element("<li></li>"),
							a = angular.element("<a href=\"\#\"></a>"),
							datum = data[i];
							if(i === 0) {
								li.addClass("active");
							}
							li.attr("ndx", datum[tabCfg.valueField]);
							a.text(datum[tabCfg.textField]);

							li.append(a);

							ul.append(li);
						}

						ul.find("li > a").click(_click.bind(ctx, ctx, scope, el));

						var tab = el.find("ul").find("li.active");
						tab.children("a").click();

					});

			} else {
				// an attempt for complete backwards compatability
				dsCfg = ctx.resolveDataSource(ctx.component.noDataSource);
				ds = noDataSource.create(dsCfg, scope);

				noDataManager.cacheRead(dsCfg.name, ds)
					.then(function (data) {
						var ul = el.find("ul").first(),
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
								el.find("no-tab-panels > no-tab-panel > div").addClass("no-m-t-lg");
							}
						}

						for(var i = 0, ndx = 0; i < data.length; i++) {
							var li = angular.element("<li></li>"),
							a = angular.element("<a href=\"\#\"></a>"),
							datum = data[i];
							if(i === 0) {
								li.addClass("active");
							}
							li.attr("ndx", datum[ctx.widget.valueField]);
							a.text(datum[ctx.widget.textField]);

							li.append(a);

							ul.append(li);
						}

						ul.find("li > a").click(_click.bind(ctx, ctx, scope, el));

						var tab = el.find("ul").find("li.active");
						tab.children("a").click();
						// pnl = el.find("no-tab-panels").first(),
						// ndx2 = tab.attr("ndx"),
						// noid = el.attr("noid"),
						// key = "noTabs_" + noid;


					});
			}

		}

		function _link(ctx, scope, el, attrs) {

			var noForm = ctx.form,
				noTab = ctx.widget,
				dynamic = ctx.noElement && !ctx.noElement.tabstrip,
				pubID;

			//console.log("noTab", "ctx", ctx);

			if(noTab || dynamic) {
				_dynamic(ctx, scope, el, attrs);
			} else {
				_static(ctx, scope, el, attrs);
				var tab = el.find("ul").find("li.active");
				// pnl = el.find("no-tab-panels").first(),
				// ndx2 = tab.attr("ndx"),
				// noid = el.attr("noid"),
				// key = "noTabs_" + noid;


				tab.children("a").click();
				// noInfoPath.setItem(scope, key, ndx2);
				// scope.$root.$broadcast("noTabs::Change", tab, pnl, noTab);
			}

			pubID = PubSub.subscribe("no-validation::dirty-state-changed", function(state){
				ctx.isDirty = state.isDirty;
				if(ctx.isDirty) console.log("noTabs", "no-validation::dirty-state-changed::isDirty", ctx.isDirty);
			});

			scope.$on("$destroy", function () {
				//console.log("noTabs", "$destroy", "PubSub::unsubscribe", "no-validation::dirty-state-changed", pubID);
				PubSub.unsubscribe(pubID);
			});

			// scope.$on("noForm::dirty", function () {
			// 	var cover = el.find(".no-editor-cover");
			// 	//console.log("noFormDirty caught.");
			// 	cover.removeClass("ng-hide");
			// });
			//
			// scope.$on("noForm::clean", function () {
			// 	var cover = el.find(".no-editor-cover");
			// 	//console.log("noFormDirty caught.");
			// 	cover.addClass("ng-hide");
			//
			// });

		}

		function _compile(el, attrs) {
			var ctx = attrs.noForm ? noFormConfig.getComponentContextByRoute($state.current.name, $state.params.entity, "noTabs", attrs.noForm) : {};
			if(attrs.noid) {
				var hashStore = noNCLManager.getHashStore($state.params.fid || $state.current.name.split(".").pop());
				ctx = hashStore.get(attrs.noid);
			}

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
