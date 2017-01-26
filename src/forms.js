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

			if(newctx.trans){
				noTransactionCache.endTransaction(newctx.trans);
			}

			if(newctx && newctx.comp.scopeKey) {
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
