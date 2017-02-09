/**
 * # noinfopath.forms
 * @version 2.0.23
 *
 * Implements the NoInfoPath Transaction processing in conjunction with AngularJS validation mechanism.
 *
 */
(function (angular, undefined) {
	"use strict";

	angular.module("noinfopath.forms", ["noinfopath"])

	;
})(angular);

//forms.js
(function (angular, undefined) {
	"use strict";

	function NoGrowler($timeout) {
		this.success = false;
		this.error = false;
		this.msg = {
			success: "Awe yeah, record saved!",
			error: "Boooo"
		};
		this.reset = function () {
			this.success = false;
			this.error = false;
			this.msg = {
				success: "Awe yeah, record saved!",
				error: "Boooo"
			};
		}.bind(this);
		this.growl = function (messageType, timeoutVal, msg) {
			if(msg) {
				this.msg[messageType] = msg;
			}
			this[messageType] = true;
			$timeout(this.reset, timeoutVal || 5000);
		}.bind(this);
	}

	function NoGrowlerDirective($timeout) {

		function getTemplateUrl() {
			return "navbars/growler.html";
		}

		function _link(scope, el, attrs) {
			scope.noGrowler = new NoGrowler($timeout);
		}

		return {
			restrict: "E",
			templateUrl: getTemplateUrl,
			link: _link
		};
	}

	/*
	 *	## noForm : Directive
	 *
	 *	> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.
	 *
	 *	### Attributes
	 *
	 *	|Name|Description|
	 *	|----|-----------|
	 *	|no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
	 *	|no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
	 *	|no-database|The location of the Tables or Collections that this form will read and write to.|
	 *	|no-datasource|The name of a table, view or collection contained in the database. The data source must expose a NoCRUD interface.|
	 *
	 *	##### Usage
	 *
	 *  ```html
	 *
	 *	<div no-form no-provider="noIndexedDB" no-database="FCFNv2" no-datasoure="Cooperator">
	 *		... other form elements ...
	 *	</div>
	 *
	 *  ```
	 *   OR
	 *
	 *  ```html
	 *
	 *  <div no-form="myform">
	 *		... other form elements ...
	 *	</div>
	 *
	 *  ```
	 *
	 *	### NoInfoPath Form Configuration
	 *
	 *  When a NoInfoPath Form Configuration is used, it defines the semantics of
	 *	how data is read and written by the form. The following is an
	 *	example of how the configuration object is defined. Note that when
	 *	datasource is a `String` that it is the name of an entity on the
	 *	database.  When an obect it is instructions on how to proccess
	 *	multi-table relationships represented by the form.
	 *
	 *
	 *	##### Sample NoInfoPath Form Configuration
	 *
	 *	```json
	 *	{
	 *		"myform": {
	 *			"provider": "noWebSQL",
	 *			"database": "FCFNv3",
	 *			"datasource": {
	 *				"create": [
	 *					"Cooperators",
	 *					"Addresses",
	 *					"CooperatorAddresses":
	 *					[
	 *						"Cooperators",
	 *						"Addresses"
	 *					]
	 *
	 * 				],
	 *				"read": "vwCooperator",
	 *				"update": [
	 *					"Cooperators",
	 *					"Addresses"
	 * 				],
	 *				"destroy": [
	 *					"CooperatorAddresses",
	 *					"Cooperators",
	 *					"Addresses"
	 * 				]
	 * 			}
	 *		}
	 *	}
	 *	```
	 */
	function NoFormDirective($timeout, $q, $state, $injector, noConfig, noFormConfig, noLoginService, noTransactionCache, _) {
		function _saveSuccessful(noTrans, scope, _, config, comp, el, noSubmitTarget, results) {

			scope.noGrowler.growl("success");
			var resetButton = el.closest("no-form").find("no-nav-bar").children(":not(.ng-hide)").find("[no-reset]"),
				entityName = comp.noDataSource.entityName,
				readOnly, primaryComponent, primaryComponentObject;

			if(resetButton.attr("no-reset")) {
				readOnly = "noReset_" + resetButton.attr("no-reset");
				scope[readOnly] = angular.merge(scope[readOnly] || {}, results[entityName]);
			}

			// if (config && config.noNavBar && config.noNavBar.scopeKey && config.noNavBar.scopeKey.readOnly) {
			// 	primaryComponent = config.noForm.primaryComponent;
			// 	readOnly = "noReset_" + primaryComponent;
			//
			// 	if (primaryComponent) {
			// 		primaryComponentObject = config.noForm.noComponents[primaryComponent];
			// 		entityName = primaryComponentObject.noDataSource.entityName;
			// 		scope[readOnly] = angular.merge(scope[readOnly] || {}, results[entityName]);
			// 	}
			// }

			noTransactionCache.endTransaction(noTrans);
			scope.saveTimestamp = undefined;
			scope.$emit("noSubmit::success", {
				config: config,
				data: results,
				state: $state,
				navbar: resetButton.attr("no-reset-navbar"),
				target: noSubmitTarget
			});

			scope.$root.$broadcast("noForm::clean");
		}

		function _saveFailed(scope, err) {
			console.error(err);
			scope.noGrowler.growl("error");
			scope.saveTimestamp = undefined;
		}

		function _save(config, _, e, elm, scope, timestamp) {
			if(scope.saveTimestamp == timestamp) {
				return;
			} else {
				scope.saveTimestamp = timestamp;
			}

			console.log("noForm::_save", timestamp);
			e.preventDefault();

			var noForm = config.noForm,
				submitButton = elm.attr("no-submit"),
				comp = noForm.noComponents[submitButton || noForm.primaryComponent],
				noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
				data = scope[comp.scopeKey];

			noTrans.upsert(data)
				.then(_saveSuccessful.bind(null, noTrans, scope, _, config, comp, elm, submitButton))
				.catch(_saveFailed.bind(null, scope));

		}

		function _notify(scope, _, noForm, routeParams, e, data) {
			//console.log(noForm, routeParams, data);

			var comp = noForm.noComponents[noForm.primaryComponent],
				pkFilter = _.find(comp.noDataSource.filter, {
					field: comp.noDataSource.primaryKey
				}),
				routeID = routeParams[pkFilter.value.property],
				isSameEntity = comp.noDataSource.entityName === data.tableName,
				isSameRecord = routeID === data.values[pkFilter.field];

			if(isSameEntity && isSameRecord) {
				if(confirm("External change detected, would you like to reload this record")) {
					scope[comp.scopeKey] = data.values;
				}
			}
		}

		function _finish(ctx, scope, el) {

			var config = ctx.config,
				nb = config.noNavBar || ctx.route.data.noNavBar || ctx.navigation,
				noForm = ctx.form;
			//primaryComponent = noForm.primaryComponent ? noForm.noComponents[noForm.primaryComponent] : undefined;
			/* = config.noComponents[noForm ? noForm.primaryComponent : config.primaryComponent],*/
			scope.noNavBar = nb;

			for(var c in noForm.noComponents) {
				var comp = noForm.noComponents[c];

				if(comp.scopeKey) {
					if(config.primaryComponent !== comp.scopeKey || (noForm.primaryComponent === comp.scopeKey && noForm.watchPrimaryComponent)) {
						scope.waitingFor[comp.scopeKey] = true;
					}
				}

			}

			scope.$on("noSubmit::dataReady", _save.bind(null, config, _));

			scope.$on("noSync::dataReceived", _notify.bind(null, scope, _, noForm, $state.params));

			scope.$on("noSubmit::success", function (e, resp) {
				var nb = resp.config.noNavBar || resp.config.route.data.noNavBar;
				if(nb && nb.routes && nb.routes.afterSave) {
					if(angular.isObject(nb.routes.afterSave)) {
						var params = {};

						for(var pk in nb.routes.afterSave.params) {
							var param = nb.routes.afterSave.params[pk],
								prov = scope,
								val = noInfoPath.getItem(prov, param.property);

							params[param.name] = val;
						}

						$state.go(nb.routes.afterSave.toState, params);

					} else {
						$state.go(nb.routes.afterSave);
					}

				} else {
					//Assume we are in edit mode.
					if(resp.navbar) {
						this.showNavBar(resp.navbar);
					} else {
						this.showNavBar(this.navBarNames.READONLY);
					}
				}
			}.bind(noFormConfig));

			scope.$on("noReset::click", function (config, e, navbar) {
				//Assume we are in edit mode.
				var nb = config.noNavBar;
				if(nb && nb.routes && nb.routes.afterSave) {
					$state.go(nb.routes.afterSave);
				} else {
					//Assume we are in edit mode.
					if(navbar) {
						this.showNavBar(navbar);
					} else {
						this.showNavBar(this.navBarNames.READONLY);
					}
				}
			}.bind(noFormConfig, config));

			if(ctx.primary) {
				scope.$watchCollection(ctx.primary.scopeKey, function (n, o, s) {
					if(el.is(".ng-dirty, .ng-dirty-add")) {
						//console.log("Broadcasting noForm:dirty");
						scope.$root.$broadcast("noForm::dirty");

					}
				});
			}

			//scope.$root.$broadcast("noForm:clean");
		}

		function _link(ctx, scope, el, attrs, form) {

			scope.$validator = form;

			scope.waitingFor = {};
			scope.noFormReady = false;
			scope.noForm = {
				yeah: false,
				boo: false
			};

			var releaseWaitingFor = scope.$watchCollection("waitingFor", function (newval, oldval) {
				var stillWaiting = false;
				for(var w in scope.waitingFor) {
					if(scope.waitingFor[w]) {
						stillWaiting = true;
						break;
					}
				}

				scope.noFormReady = !stillWaiting;

				if(scope.noFormReady) releaseWaitingFor();


			});

			_finish(ctx, scope, el);

		}

		function _compile(el, attrs) {
			var ctx;

			if(attrs.noid) {
				// IT WAS RENDERED BY NODOM
				ctx = noFormConfig.getComponentContextByNoid($state.params.fid || $state.current.name.split(".").pop(), "test", attrs.noid);
			} else {
				ctx = noFormConfig.getComponentContextByRoute($state.current.name, $state.params.entity, "noForm", attrs.noForm);
			}
			// el.attr("noid", noInfoPath.createNoid());
			return _link.bind(ctx, ctx);
		}

		return {
			restrict: "E",
			//controller: [function(){}],
			//transclude: true,
			scope: false,
			require: "?^form",
			compile: _compile
		};
	}

	function NoDataManagerService($q, $rootScope, noLoginService, noTransactionCache, noParameterParser, noDataSource, noKendoHelpers, noPrompt) {
		function _initSession(ctx, scope) {
			console.log(ctx);
		}

		function _successful(ctx, resolve, newctx, data) {


			ctx.data = data;

			if(newctx) {
				if(newctx.trans){
					noTransactionCache.endTransaction(newctx.trans);
				}

				if(newctx.comp.scopeKey) {
					var curData = noInfoPath.getItem(newctx.scope, newctx.comp.scopeKey);

					noParameterParser.update(data[newctx.comp.scopeKey] || data, curData);
					//noInfoPath.setItem(newctx.scope, newctx.comp.scopeKey, data[newctx.comp.scopeKey] || data);
				}

				if(newctx.scope.noNavigation) {
					var navState = newctx.scope.noNavigation[newctx.ctx.component.scopeKey].validationState;

					if(navState.form.accept) {

						navState.form.accept(navState.form);

					} else {
						navState.form.$setUntouched();
						navState.form.$setPristine();
						navState.form.$setSubmitted();
					}
				}

			}

			resolve(ctx);
		}

		function _fault(ctx, reject, err) {
			ctx.error = err;
			reject(ctx);
		}

		function _upsert(ctx, scope, el, data, noTrans, newctx) {
			return $q(function (resolve, reject) {
				var noForm = ctx.form,
					comp = noForm.noComponents[noForm.primaryComponent],
					ds = noDataSource.create(comp.noDataSource, scope);

					if(data.$valid) {
						var saveData = noParameterParser.parse(data);

						if(saveData[comp.noDataSource.primaryKey]){
							ds.update(saveData, noTrans)
								.then(_successful.bind(null, ctx, resolve, newctx))
								.catch(_fault.bind(null, ctx, reject, newctx));
						} else {
							ds.create(saveData, noTrans)
								.then(_successful.bind(null, ctx, resolve, newctx))
								.catch(_fault.bind(null, ctx, reject, newctx));
						}
					} else {
						scope.$broadcast("no::validate");
						reject("Form is invalid.");
					}
			});
		}

		function _save(ctx, scope, el, data) {
				var noForm = ctx.form,
					comp = noForm.noComponents[noForm.primaryComponent],
					noTrans = noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope),
					newctx = {
						ctx: ctx,
						comp: comp,
						trans: noTrans,
						scope: scope
					};

				return $q(function(resolve, reject){
					if(data.$valid) {
						if(comp.noDataSource.noTransaction) {
							noTrans.upsert(data)
								.then(_successful.bind(null, ctx, resolve, newctx))
								.catch(_fault.bind(null, ctx, reject, newctx));
						} else {
							_upsert(ctx, scope, el, data, noTrans, newctx);
						}
					} else {
						scope.$broadcast("no::validate");
						reject("Form is invalid.");
					}
				});


		}

		function _undo(ctx, scope, el, dataKey, undoDataKey) {
			var data = noInfoPath.getItem(scope, dataKey),
				undoData = noInfoPath.getItem(scope, undoDataKey);

			console.log(data, undoData);

			return $q(function (resolve, reject) {
				resolve("undo code required.");
			});
		}

		function _cacheRead(cacheKey, dataSource) {

			var data = noInfoPath.getItem($rootScope, "noDataCache." + cacheKey),
				promise;

			if(dataSource.cache) {
				if(data) {
					promise = $q.when(data);
				} else {
					promise = dataSource.read()
						.then(function (ck, data) {
							noInfoPath.setItem($rootScope, "noDataCache." + cacheKey, data);
							return data;
						}.bind(null, cacheKey));
				}
			} else {
				promise = dataSource.read();
			}


			return promise;
		}

		function _deleteSelected(ctx, scope, el, gridName, tableName, entityLabel, primaryKey, message) {
			var grid = scope[gridName],
				checked = grid.tbody.find("input:checkbox:checked"),
				dsCfg = {
					"dataProvider": "noIndexedDb",
					"databaseName": "rmEFR2",
					"entityName": tableName,
					"primaryKey": primaryKey
				},
				ds = noDataSource.create(dsCfg, scope),
				promises = [],
				trans,
				compiledMessage = message.replace(/{{pluralizedCount}}/gi, pluralize(noInfoPath.splitCamelCaseAddSpace(entityLabel), checked.length, true));

			function _executeDeletes(scope, checked, ds, trans) {
				noPrompt.show("Action in Progress", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\">Deleting " + pluralize(entityLabel, checked.length, true) + "</div>" , null, {});

				for (var c = 0; c < checked.length; c++) {
					var rowData = noKendoHelpers.currentGridRowData(scope, $(checked[c]));

					promises.push(ds.destroy(rowData, trans));
				}


				$q.all(promises)
					.then(function(results){
						if(trans) noTransactionCache.endTransaction(trans);
						grid.dataSource.read();
						$("[grid-selection-changed]").prop("disabled", true);
						$("[select-all-grid-rows='reportGrid']").prop("checked", false);
						noPrompt.hide(1000);
					})
					.catch(function(err){
						console.error(err);
						grid.dataSource.read();
						$("[grid-selection-changed]").prop("disabled", true);
						$("[select-all-grid-rows='reportGrid']").prop("checked", false);
						noPrompt.hide(1000);
					});
			}

			noPrompt.show("Confirm Deletion", "<div class=\"center-block\" style=\"font-size: 1.25em; width: 80%\">" + compiledMessage + "</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block\" value=\"delete\">Permanently Delete Selected Items</button><button type=\"button\" class=\"btn btn-info btn-block\" value=\"remove\">Removed Selected from this Device Only</button><button type=\"button\" class=\"btn btn-default btn-block\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>", function(e){
				switch($(e.target).attr("value")) {
					case "remove":
						_executeDeletes(scope, checked, ds);
						break;

					case "delete":
						noPrompt.show("Confirm Permanent  Deletion", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\"><b class=\"text-danger\">WARNING: THIS ACTION IS NOT REVERSABLE<br/>ALL USERS WILL BE AFFECTED BY THIS ACTION</b></div><div class=\"center-block text-center\" style=\"font-size: 1.25em;\">You are about to permanently delete " + pluralize(entityLabel, checked.length, true) + ".<br/>Click OK to proceed, or Cancel to abort this operation.</div>",function(e){
							if($(e.target).attr("value") === "OK") {
								trans = noTransactionCache.beginTransaction(noLoginService.user.userId, {noDataSource: dsCfg}, scope);
								_executeDeletes(scope, checked, ds, trans);
							}
						}, {showFooter: true, showOK: true, showCancel: true});
						break;

					default:
						break;
				}

			}, {showOK: true, showCancel: true});

		}

		this.save = _save;
		this.upsert = _upsert;
		this.undo = _undo;
		this.initSession = _initSession;
		this.beginTransaction = _initSession;
		this.cacheRead = _cacheRead;
		this.deleteSelected = _deleteSelected;
	}

	function NoRecordStatsDirective($q, $http, $compile, noFormConfig, $state) {
		function getTemplateUrl(el, attrs) {
			var url = attrs.templateUrl ? attrs.templateUrl : "/no-record-stats-kendo.html";
			return url;
		}

		function _compile(el, attrs) {
			var noForm = noFormConfig.getFormByRoute($state.current.name, $state.params.entity);
			if(attrs.scopeKey) {
				var html = el.html(),
					key = attrs.scopeKey.indexOf("{{") > -1 ? attrs.scopeKey.substr(2, attrs.scopeKey.length - 4) : attrs.scopeKey,
					scopeKey = noInfoPath.getItem(noForm, key);

				html = html.replace(/{scopeKey}/g, scopeKey);
				//console.log(html);
				el.html(html);
			}

			return _link.bind(null, noForm);
		}

		function _link(config, scope, el, attrs) {
			console.log("nrs");
		}

		return {
			restrict: "E",
			link: _link,
			templateUrl: getTemplateUrl,
			compile: _compile
		};
	}

	function NoPromptService($rootScope, $timeout) {
		this.show = function(title, message, cb, options) {
			var b = $("body"),
				cover = $("<div class=\"no-modal-container ng-hide\"></div>"),
				box = $("<no-message-box></no-message-box>"),
				header = $("<no-box-header></no-box-header>"),
				body = $("<no-box-body></no-box-body>"),
				footer = $("<div class=\"no-flex horizontal flex-center no-m-b-md\"></div>");

			header.append(title);

			body.append(message);

			box.append(header);
			box.append(body);

			if(options.showFooter) {
				if(options.showOK) footer.append("<button type=\"button\" class=\"btn btn-primary no-m-r-md\" value=\"OK\">OK</button>");
				if(options.showCancel) footer.append("<button type=\"button\" class=\"btn btn-primary\" value=\"Cancel\">Cancel</button>");
				box.append(footer);
			}

			cover.append(box);

			b.append(cover);

			box.find("button").click(function(cb, e){
				_hide();
				if(cb) cb(e);
			}.bind(null, cb));

			$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams, options){
				if($(".no-modal-container").length) {
					_hide();
				}
			    // transitionTo() promise will be rejected with
			    // a 'transition prevented' error
			});

			cover.removeClass("ng-hide");
		};

		function _hide(to) {
			if(to) {
				$timeout(function(){$(".no-modal-container").remove();}, to);
			} else {
				$(".no-modal-container").remove();
			}

		}
		this.hide = _hide;
	}


	angular.module("noinfopath.forms")
		.directive("noForm", ['$timeout', '$q', '$state', '$injector', 'noConfig', 'noFormConfig', 'noLoginService', 'noTransactionCache', 'lodash', NoFormDirective])

		.directive("noRecordStats", ["$q", "$http", "$compile", "noFormConfig", "$state", NoRecordStatsDirective])

		.directive("noGrowler", ["$timeout", NoGrowlerDirective])

		.service("noDataManager", ["$q", "$rootScope", "noLoginService", "noTransactionCache", "noParameterParser", "noDataSource", "noKendoHelpers", "noPrompt", NoDataManagerService])

		.service("noPrompt", ["$rootScope", "$timeout", NoPromptService])

		;

})(angular);

//form-service.js
(function (angular, undefined) {
	"use strict";

	/* Replacement for NoForm / NoSubmit */
	function NoFormService($rootScope, $compile, $stateParams, noNCLManager, noTransactionCache, noLoginService, $q) {
		this.save = function(ctx, scope, el, attrs) {
			var deferred = $q.defer(),
				form = el.closest("no-form[ng-form]");

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
						resp.pauseFor = 1500;
						deferred.resolve(resp);
					})
					.catch(function (err) {
						console.error(err);
						deferred.reject(err);
					});


				console.log(data);
			} else {
				scope.noGrowler.growl("error", undefined, "Form invalid!");
				deferred.resolve({ stopActionQueue: true });
			}

			return deferred.promise;
		};
	}

	angular.module("noinfopath.forms")

		.service("noFormService", ["$rootScope", "$compile", "$stateParams", "noNCLManager", "noTransactionCache", "noLoginService", "$q", NoFormService])

	;

})(angular);

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
				noActionQueue.synchronize(execQueue)
					.then(PubSub.publish.bind(PubSub, "noTabs::change", {tabKey: tabKey, tabIndex: ndx}));
			}else{
				//scope.$broadcast("")
				PubSub.publish("noTabs::change", {tabKey: tabKey, tabIndex: ndx});
			}


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
						tab.children("a").click();

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
								el.find("no-tab-panels > no-tab-panel > div").addClass("no-m-t-lg");
							}
						}

						for(var i = 0, ndx = 0; i < data.length; i++) {
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
			//console.log(ctx, el, n, o, s);
			if(n) {
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
				//scope.$watch("noNavigation." + scopeKey + ".currentNavBar", noNavigationManager.changeNavBar.bind(ctx, ctx, scope, el, ctx.component.scopeKey));
			}

		}

		function _compile(el, attrs) {
			var ctx = noFormConfig.getComponentContextByRoute($state.current.name, undefined, "noNavigation", attrs.noForm);
			//el.attr("noid", noInfoPath.createNoid());
			return _link.bind(ctx, ctx);
		}

		function _link(ctx, scope, el, attrs) {
			var bars = ctx.component.bars,
				pubID;

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
				// var target = noKendoHelpers.getGridRow(el).parent()[0];
				//
				// // create an observer instance
				// var observer = new MutationObserver(function(ctx, scope, el, mutations) {
				// 	for(var m=0; m<mutations.length;m++) {
				// 		var mutation = mutations[m];
				//
				// 		/*
				// 		*	Each removed node is retrieved from the noNavigation scope object
				// 		*	and if it has a `deregister` method, it is called and then
				// 		*	navbar that identifies with the remove node is deleted from
				// 		*	the scope object.
				// 		*/
				// 		for(var n=0; n<mutation.removedNodes.length;n++) {
				// 			var uid = noInfoPath.toScopeSafeGuid(noKendoHelpers.getGridRowUID(mutation.removedNodes[n])),
				// 				non = noInfoPath.getItem(scope, "noNavigation"),
				// 				watch = non[ctx.component.scopeKey + "_" + uid];
				//
				// 				if(watch && watch.deregister) {
				// 					watch.deregister();
				//
				// 					delete non[ctx.component.scopeKey + "_" + uid];
				// 				}
				// 		}
				//
				// 		/*
				// 		*	Each node added to the grid is recompiled using `$compile` via
				// 		*	the `noKendoHelpers.ngCompileSelectedRow` method.
				// 		*/
				// 		for(var n1=0; n1<mutation.addedNodes.length;n1++) {
				// 			var uid = noInfoPath.toScopeSafeGuid(noKendoHelpers.getGridRowUID(mutation.addedNodes[n1]));
				//
				// 			noKendoHelpers.ngCompileSelectedRow(ctx, scope, el, "noGrid");
				//
				// 			_registerWatch(ctx, scope, el, uid);
				// 		}
				// 	}
				// }.bind(ctx, ctx, scope, el));
				//
				// // configuration of the observer:
				// var config = { attributes: true, childList: true, characterData: true };
				//
				// // pass in the target node, as well as the observer options
				// observer.observe(target, config);

			} else {
				_registerWatch(ctx, scope, el);

				if(!scope.noNavigation) scope.noNavigation = {};

				if(!scope.noNavigation[ctx.component.scopeKey]) scope.noNavigation[ctx.component.scopeKey] = {};

				scope.$on("noAreaLoader::areaReady", function(ctx){
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
							noNavigationManager.changeNavBar(this, scope, el, navBarName, baridDirty);
							_changeNavBar(this, el, baridDirty, baridDirty, scope);
						}else{
							//scope.noNavigation[navBarName].currentNavBar = barid;
							noNavigationManager.changeNavBar(this, scope, el, navBarName, barid);
							_changeNavBar(this, el, barid, barid, scope);
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
				PubSub.unsubscribe(pubID);
				//if(observer) observer.disconnect();

				//stopNoNavigationWatch();
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
			//console.log("changeNavBar", arguments);
			if(barid === "^") {
				var t = noInfoPath.getItem(scope,  "noNavigation." + barkey + ".currentNavBar"),
					p = t.split(".");

				barid = p[0];
			}

			noInfoPath.setItem(scope, "noNavigation." + barkey + ".currentNavBar", barid);
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

		.run(["$rootScope", "noAreaLoader", function ($rootScope, noAreaLoader) {
			$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
				//console.log("$stateChangeSuccess");
				event.currentScope.$root.noNav = event.currentScope.$root.noNav ? event.currentScope.$root.noNav : {};
				event.currentScope.$root.noNav[fromState.name] = fromParams;

				noAreaLoader.registerArea(toState.name);
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

		.directive("noNavigation", ["$injector", "$q", "$state", "noFormConfig", "noActionQueue", "noNavigationManager", "PubSub", "noKendoHelpers", NoNavigationDirective])

		.service("noNavigationManager", ["$q", "$http", "$state", "noKendoHelpers", NoNavigationManagerService]);
})(angular);

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

				var i = el.find("INPUT, TEXTAREA, SELECT, [ngf-drop], no-lookup, no-kendo-date-picker, no-file-upload");

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

					scope.$on('no::validate', _validate.bind(null, el, fld, lbl));
					scope.$on('no::validate:reset', _resetErrors.bind(null, el, fld, lbl));


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
				scope.$watch(wk, function() {
					console.log("noValidation", this.$name, "isDirty", this.$dirty);
					pubsub.publish("no-validation::dirty-state-changed", {
						isDirty: form.$dirty,
						pure: noParameterParser.parse(form),
						form: form
					});
				}.bind(form));
			}
		};
	}]);
})(angular);

//form-config.js
(function(angular, undefined) {
	"use strict";

	/**
	 * @method NoFormConfigSync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig)
	 *
	 * `NoFormConfigSync` is a class that has multiple methods hanging off of it that assists on
	 * configuring route information from the no-forms.json file.
	 *
	 * @param
	 *
	 * |Name|Type|Description|
	 * |----|----|-----------|
	 * |$q|object|angular.js promise provider object|
	 * |$http|object|angular.js http provider object|
	 * |$rootScope|object|angular.js rootScope provider object|
	 * |$state|object|ui-router state provider object|
	 * |noDataSource|object|noInfoPath noDataSource object|
	 * |noLocalStorage|object|noInfoPath noLocalStorage object|
	 * |noConfig|object|noInfoPath noConfig object|
	 *
	 */
	 function NoFormConfigSync($q, $http, $rootScope, $state, noDataSource, noLocalStorage, noConfig) {
 		var SELF = this,
 			isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
 			dataSource,
 			noNavBarConfig,
 			cacheNavBar = false,
 			indexes = {
 				"shortName": {},
 				"route.name+routeToken": {},
 				"route.name": {}
 			},
 			nextKey = 0;

 		this.navBarNames = {
 			BASIC: "basic",
 			SEARCH: "search",
 			READONLY: "readonly",
 			WRITEABLE: "writeable",
 			CREATE: "create"
 		};


 		/**
 		 * @method saveNoFormConfig(form)
 		 *
 		 * `saveNoFormConfig` saves the noForm configuration in local storage, and adds
 		 * the configuration to the noForm index object based on the routeKey.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |form|object|An noForm object loaded from no-forms.json|
 		 *
 		 */

 		function saveNoFormConfig(form) {
 			if(!form) throw "form is a required parameter";
 			var guid = "noForm_" + nextKey++;

 			indexes.shortName[form.shortName] = guid;
 			if(form.routeToken) indexes["route.name+routeToken"][form.route.name + "+" + form.routeToken] = guid;
 			indexes["route.name"][form.route.name] = guid;
 			noLocalStorage.setItem(guid, form);
 		}

 		/**
 		 * @method getFormConfig()
 		 *
 		 * `getFormConfig` checks to see if the routes from no-forms.json have
 		 * been configured, and if it has not, configures the routes found
 		 * within no-forms.json. It also saves some indexes into local storage.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns promise
 		 */
 		function getFormConfig(url) {
 			var promise;

 			/**
 			 * `getFormConfig` checks to see if the routes in no-forms.json are
 			 * configured.
 			 */
 			if(!noConfig.current.debug && isDbPopulated) {
 				promise = $q.when(true);
 			} else {
 				promise = $q(function (resolve, reject) {
 					$rootScope.noFormConfig = {};

 					$http.get(url || "no-forms.json")
 						.then(function (resp) {
 							var forms = resp.data;

 							/**
 							 * `getFormConfig` loops through each property in no-forms.json
 							 * and saves the route configuration in local storage based on
 							 * the routeKey.
 							 */
 							for(var f in forms) {
 								var frm = forms[f];

 								if(frm.areas) {
 									var areas = frm.areas;
 									for(var na in areas) {
 										var newForm = areas[na];

 										newForm.shortName = na;

 										saveNoFormConfig(newForm);
 									}
 								} else {
 									switch(f) {
 										case "editors":
 											for(var e in frm) {
 												var editor = frm[e];

 												editor.search.shortName = "search_" + e;
 												editor.search.routeToken = e;
 												saveNoFormConfig(editor.search);

 												if(editor.edit) {
 													editor.edit.shortName = "edit_" + e;
 													editor.edit.routeToken = e;
 													saveNoFormConfig(editor.edit);
 												}

 												if(editor.detail) {
 													editor.detail.shortName = "detail_" + e;
 													editor.detail.routeToken = e;
 													saveNoFormConfig(editor.detail);
 												}
 											}
 											break;
 										case "lookups":
 											for(var g in frm) {
 												var refed = frm[g];

 												refed.shortName = "lookup_" + g;
 												refed.routeToken = g;
 												saveNoFormConfig(refed);
 											}
 											break;
 										default:
 											frm.shortName = f;
 											saveNoFormConfig(frm);
 											break;
 									}
 								}
 							}

 							noLocalStorage.setItem("noForms_index_shortName", indexes.shortName);
 							noLocalStorage.setItem("noForms_index_route.name+routeToken", indexes["route.name+routeToken"]);
 							noLocalStorage.setItem("noForms_index_route.name", indexes["route.name"]);

 							noLocalStorage.setItem("dbPopulated_NoInfoPath_dtc_v1", {
 								timestamp: new Date()
 							});

 							resolve();
 						})
 						.catch(function (err) {

 							if(isDbPopulated) {
 								resolve();
 							} else {
 								reject(err);
 							}
 						});
 				});

 			}

 			return promise;
 		}

 		/**
 		 * @method getNavBarConfig()
 		 *
 		 * `getNavBarConfig` returns a promise that will eventually provide the
 		 * navBarConfig object.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns promise
 		 */
 		function getNavBarConfig(loadNavigation) {
			if(!loadNavigation) return $q.when({});

 			/**
 			 * `getNavBarConfig` checks if the cacheNavBar flag is true, it
 			 * attempts to load the noNavBarConfig from local storage before
 			 * performing a $http.get request.
 			 */
 			if(cacheNavBar) {
 				noNavBarConfig = noLocalStorage.getItem("no-nav-bar");
 			}

 			/**
 			 * `getNavBarConfig` checks to see if noNavBarConfig was loaded from
 			 * local storage, and if it was not, it performs a $http.get request
 			 * to get the noNavBarConfig and then saves the configuration to
 			 * local storage.
 			 */
 			if(!noNavBarConfig) {
 				noNavBarConfig = $q(function (resolve, reject) {
 					$http.get("navbars/no-nav-bar.json")
 						.then(function (resp) {
 							noNavBarConfig = resp.data;
 							noLocalStorage.setItem("no-nav-bar", noNavBarConfig);
 							resolve(noNavBarConfig);
 						})
 						.catch(reject);
 				});
 			}

 			return $q.when(noNavBarConfig);
 		}

 		/**
 		 * `NoFormConfigSync` exposes noNavBarConfig as the property noNavBarRoutes
 		 */
 		Object.defineProperties(this, {
 			"noNavBarRoutes": {
 				"get": function () {
 					return noNavBarConfig;
 				}
 			}
 		});

 		/**
 		 * @method getRoute(routeKey, routeData)
 		 *
 		 * `getRoute` returns the form configuration based on the routeKey and routeData
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |routeKey|string|The key to query local storage|
 		 * |routeData|string|Route data that matches the routeKey format|
 		 *
 		 * @returns object
 		 */
 		function getRoute(routeKey, routeData) {
 			var requestInProgress = "requestInProgress",
 				indexKey = "noForms_index_" + routeKey,
 				//scopeKey = angular.isArray(routeData) ? routeData.join("").replace(/\./g, "") : routeData.replace(/\./g, ""),
 				//form = $rootScope.noFormConfig[scopeKey],
 				//isInProgress = form === requestInProgress,
 				//haveDataAlready = angular.isObject(form),
 				index = noLocalStorage.getItem(indexKey),
 				formKey = index[routeData],
 				formCfg = noLocalStorage.getItem(formKey);

 			return formCfg;
 		}

 		/**
 		 * @method navBarRoute(stateName)
 		 *
 		 * `navBarRoute` returns the route based on the stateName passed in, and
 		 * if there is no route found for the stateName, returns a default route.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |stateName|string|(Optional) A name of a state|
 		 *
 		 * @returns object
 		 */
 		function navBarRoute(state) {
 			var route = noInfoPath.getItem(state, "data.noNavBar");

 			if(!route && SELF.noNavBarRoutes) {
 				route = SELF.noNavBarRoutes[state.name];
 				route = route ? route : SELF.noNavBarRoutes[undefined];
 			}

 			return route;
 		}

 		/**
 		 * @method navBarEntityIDFromState(route, params)
 		 *
 		 * `navBarEntityIDFromState` returns the navbar id from the stateParams
 		 * passed in based on the route
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |route|object|A navBarRoute object|
 		 * |params|object|A ui-router stateParams object|
 		 *
 		 * @returns string
 		 */
 		function navBarEntityIDFromState(route, params) {
 			if(!route) throw "route is a required parameter";
 			if(!params) throw "params is a required parameter";

 			var id;

 			if(route.entityIdParam) {
 				id = params[route.entityIdParam];
 			}

 			return id;
 		}

 		/**
 		 * @method navBarNameFromState(state)
 		 *
 		 * `navBarNameFromState` returns the navbar name associated with a given
 		 * state and returns it.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |state|object|A ui-router state object|
 		 *
 		 * @returns string
 		 */
 		function navBarNameFromState(state) {
 			if(!state) throw "state is a required parameter";

 			var route = navBarRoute(state.current),
 				navBar = SELF.navBarKeyFromState(state.current),
 				id = navBarEntityIDFromState(route, state.params);

 			if(navBar === "edit") navBar = id ? "readonly" : "create";

 			return navBar;
 		}

 		/**
 		 * @method getFormByShortName(shortName) @deprecated
 		 *
 		 * `getFormByShortName` gets a form configuration based on the name of the route
 		 * passed in.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |shortName|string|Name of a route|
 		 *
 		 * @returns object
 		 */
 		function getFormByShortName(shortName) {
 			if(!shortName) throw "shortName is a required parameter";

 			return getRoute("route.name", shortName);
 		}

 		/**
 		 * @method getFormByRoute(routeName, entityName)
 		 *
 		 * `getFormByRoute` gets the route based on the routeName passed into
 		 * the function. Returns a form configuration object.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |routeName|string|The name of the route|
 		 * |entityName|string|(Optional) the entity name|
 		 *
 		 * @returns object
 		 */
 		function getFormByRoute(routeName, entityName) {
 			if(!routeName) throw "routeName is a require parameter";

 			if(entityName) { // This is here to prevent a regression.
 				return getRoute("route.name+routeToken", routeName + "+" + entityName);
 			} else {
 				return getRoute("route.name", routeName);
 			}
 		}

 		function _resolveDataSource(datasources, dsCfg) {
 			var ds;

 			if(dsCfg && dsCfg.dataProvider) {
 				ds = dsCfg;
 			} else {
 				ds = dsCfg ? datasources[dsCfg.name || dsCfg] : undefined;
 			}

 			if(!ds) return;

 			if(angular.isObject(dsCfg)) {
 				ds = angular.merge(dsCfg, ds);
 			} else {
 				ds.name = dsCfg;
 			}

 			if(!ds) throw "DataSource " + dsCfg.name + "was not found in the global datasources collection.";

 			return ds;
 		}

 		function getComponentContextByRoute(routeName, entityName, componentType, componentKey) {

 			var config = getFormByRoute($state.current.name, $state.params.entity) || {},
 				route = noInfoPath.getItem(config, "route"),
 				form = noInfoPath.getItem(config, "noForm"),
 				component = noInfoPath.getItem(config, componentKey),
 				widget = component ? component[componentType] : undefined,
 				primary = form.primaryComponent ? noInfoPath.getItem(form.noComponents, form.primaryComponent) : undefined,
 				datasources = config.noDataSources || {},
 				dsCfg;

 			if(primary) {
 				dsCfg = primary.noDataSource;
 			} else if(component) {
 				dsCfg = component.noDataSource;
 			}

 			return {
 				config: config,
 				route: route,
 				form: form,
 				component: component,
 				widget: widget,
 				primary: primary,
 				datasources: datasources,
 				datasource: _resolveDataSource(datasources, dsCfg),
 				resolveDataSource: _resolveDataSource.bind(null, datasources)
 			};
 		}

		function getComponentContextByNoid(screenName, dbName, noid) {
			var config = $rootScope.nacl.noScreens[screenName],
				route = { data: {} },
				noFormCfg = config.get(noid),
				form = noFormCfg.noComponent.noForm,
				component = noFormCfg.componentKey,
				datasources = $rootScope.nacl.noDataSources, // change to option
				dsCfg = form.noDataSource;


			return {
 				config: config,
 				route: route,
 				form: form,
 				component: component,
 				widget: undefined,
 				primary: undefined,
 				datasources: datasources,
 				datasource: datasources[dbName || "test"],
 				resolveDataSource: _resolveDataSource.bind(null, datasources)
 			};
		}

 		/**
 		 * @method whenReady()
 		 *
 		 * `whenReady` returns the navBarConfig object after ensuring that the formConfig
 		 * and the navBarConfig has been loaded.
 		 *
 		 * @param
 		 *
 		 * None
 		 *
 		 * @returns object
 		 */
 		function whenReady(url, loadNavigation) {
 			/*
 			 * `whenReady` sets a flag based on noConfig's configuration to load/save
 			 * navBar configuration in local storage.
 			 */
 			cacheNavBar = noConfig.current ? noConfig.current.noCacheNoNavBar : false;

 			return getFormConfig(url)
 				.then(getNavBarConfig.bind(null, loadNavigation))
 				.catch(function (err) {
 					console.log(err);
 				});
 		}

 		this.whenReady = whenReady;

 		this.getFormByShortName = getFormByShortName;

 		this.getFormByRoute = getFormByRoute;

 		this.getComponentContextByRoute = getComponentContextByRoute;

		this.getComponentContextByNoid = getComponentContextByNoid;

 		/**
 		 * @method navBarKeyFromState(stateName)
 		 *
 		 * `navBarKeyFromState` finds the navbar type associated with a given
 		 * state and returns it, and if there is not a navbar type, returns undefined
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |stateName|string|The name of the state to get the navBar type configured for it|
 		 *
 		 * @returns string || undefined
 		 *
 		 */
 		this.navBarKeyFromState = function (state) {
 			if(!state) throw "state is a required parameter";

 			var nbr = navBarRoute(state);
 			return nbr ? nbr.type : undefined;
 		};

 		/**
 		 * @method showNavBar(navBarName)
 		 *
 		 * `showNavBar` determines the navbar to display depending if a
 		 * navBarName has been passed into the function call, and defaults to
 		 * the navbar based on the current state if there was not.
 		 *
 		 * @param
 		 *
 		 * |Name|Type|Description|
 		 * |----|----|-----------|
 		 * |navBarName|string|(optional) The name of the navbar to be shown|
 		 *
 		 */
 		this.showNavBar = function (navBarName) {

 			var targetNavBar = navBarName ? navBarName : navBarNameFromState($state);

 			/*
 			 * `showNavBar` hides all the navbars within the template and then
 			 * shows the nav bar that matches the targetNavBar.
 			 */
 			if(!!targetNavBar) {
 				var el = angular.element("no-nav-bar");
 				el.find("[no-navbar]").addClass("ng-hide");
 				el.find("[no-navbar='" + targetNavBar + "']").removeClass("ng-hide");
 			}

 			/*
 			 * `showNavBar` puts on a protective cover over the form when the
 			 * form is Read Only mode. When the mode is Writable or Create,
 			 * it removes the cover, enabling interaction with the form
 			 * components.
 			 */
 			var route = navBarRoute($state.current);

 			if(route.covers) {
 				if(route.covers[targetNavBar]) {
 					angular.element(".no-editor-cover").removeClass("ng-hide");
 				} else {
 					angular.element(".no-editor-cover").addClass("ng-hide");
 				}
 			} else {
 				switch(targetNavBar) {
 					case this.navBarNames.READONLY:
 						angular.element(".no-editor-cover").removeClass("ng-hide");
 						break;
 					case this.navBarNames.WRITEABLE:
 					case this.navBarNames.CREATE:
 						angular.element(".no-editor-cover").addClass("ng-hide");
 						break;
 				}
 			}
 		};

 		this.btnBarChange = function (btnBarID) {
 			var toID = noInfoPath.getItem($rootScope, "noFormConfig.curBtnBar"),
 				isEditing = noInfoPath.getItem($rootScope, "noFormConfig.isEditing");

 			if(toID === "editing" && !btnBarID) {
 				toID = noInfoPath.getItem($rootScope, "noFormConfig.curTab");
 			} else {
 				toID = btnBarID ? btnBarID : "default";
 			}


 			switch(btnBarID) {
 				case "editing":
 					noInfoPath.setItem($rootScope, "noFormConfig.isEditing", true);
 					break;
 				default:
 					if(isEditing) {
 						toID = "editing";
 					}
 					break;
 			}

 			noInfoPath.setItem($rootScope, "noFormConfig.curBtnBar", toID);
 			this.showNavBar(toID);
 		};

 	}

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "$state", "noDataSource", "noLocalStorage", "noConfig", NoFormConfigSync]);

})(angular);
