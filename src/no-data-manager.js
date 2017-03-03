//data-panel.js
(function (angular, undefined) {
	"use strict";

	function NoDataManagerService($timeout, $q, $rootScope, noLoginService, noTransactionCache, noParameterParser, noDataSource, noKendoHelpers, noPrompt) {
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
					var nav = newctx.scope.noNavigation[newctx.ctx.component.scopeKey],
						navState = nav.validationState;

					if(navState) {
						if(navState.form.accept) {

							navState.form.accept(navState.form);

						} else {
							navState.form.$setUntouched();
							navState.form.$setPristine();
							navState.form.$setSubmitted();
						}
					}
				}

			}
			$timeout(function(){
				noPrompt.hide();
				resolve(ctx);

			}, 500);
		}

		function _fault(ctx, reject, err) {
			noPrompt.show(
				"Save Error", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\">Save Failed.<code>" + JSON.stringify(err) + "</code></div>",
				function(e){
					if($(e.target).attr("value") === "Cancel") {
						ctx.error = err;
						reject(ctx);
					}
				},
				{
					showCloseButton: true,
					showFooter: {
						showCancel: true,
						cancelLabel: "Close",
						showOK: false
					},
					scope: scope,
					width: "60%",
					height: "35%",
				});

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

				noPrompt.show(
					"Save in Progress",
					"<div><div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div></div>",
					null,
					{
						height: "15%"
					}
				);

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
				noPrompt.show("Deletion in Progress", "<div><div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\">Deleting " + pluralize(entityLabel, checked.length, true) + "</div><div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div></div>" , null, {height: "15%"});


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

			noPrompt.show("Confirm Deletion", "<div class=\"center-block\" style=\"font-size: 1.25em;\">" + compiledMessage + "</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block btn-callback btn-auto-hide\" value=\"delete\">Permanently Delete Selected Items</button><button type=\"button\" class=\"btn btn-info btn-block btn-callback btn-auto-hide\" value=\"remove\">Removed Selected from this Device Only</button><button type=\"button\" class=\"btn btn-default btn-block btn-callback btn-auto-hide\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>", function(e){
				switch($(e.target).attr("value")) {
					case "remove":
						_executeDeletes(scope, checked, ds);
						break;

					case "delete":
						noPrompt.show("Confirm Permanent Deletion", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\"><b class=\"text-danger\">WARNING: THIS ACTION IS NOT REVERSABLE<br/>ALL USERS WILL BE AFFECTED BY THIS ACTION</b></div><div class=\"center-block text-center\" style=\"font-size: 1.25em;\">You are about to permanently delete " + pluralize(entityLabel, checked.length, true) + ".<br/>Click OK to proceed, or Cancel to abort this operation.</div>",function(e){
								if($(e.target).attr("value") === "OK") {
									trans = noTransactionCache.beginTransaction(noLoginService.user.userId, {noDataSource: dsCfg}, scope);
									_executeDeletes(scope, checked, ds, trans);
								}
							}, {
								showCloseButton: true,
								showFooter: {
									showCancel: true,
									cancelLabel: "Cancel",
									showOK: true,
									okLabel: "OK",
									okValue: "OK",
									okAutoHide: true
								},
								scope: scope,
								width: "60%",
								height: "35%",

							});
						break;

					default:
						break;
				}

			}, {
				showCloseButton: true,
				scope: scope,
				width: "60%",
				height: "35%"
			});

		}

		this.save = _save;
		this.upsert = _upsert;
		this.undo = _undo;
		this.initSession = _initSession;
		this.beginTransaction = _initSession;
		this.cacheRead = _cacheRead;
		this.deleteSelected = _deleteSelected;
	}

	angular.module("noinfopath.forms")
		.service("noDataManager", ["$timeout", "$q", "$rootScope", "noLoginService", "noTransactionCache", "noParameterParser", "noDataSource", "noKendoHelpers", "noPrompt", NoDataManagerService])
		;
})(angular);
