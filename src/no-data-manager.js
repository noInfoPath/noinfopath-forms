//data-panel.js
(function (angular, undefined) {
	"use strict";

	function NoDataManagerService($timeout, $q, $rootScope, noConfig, noLoginService, noTransactionCache, noParameterParser, noDataSource, noKendoHelpers, noPrompt) {
		function _initSession(ctx, scope) {
			console.log(ctx);
		}

		function _successful(ctx, resolve, newctx, data) {


			ctx.data = data;

			if(newctx && data) {
				if(newctx.trans){
					noTransactionCache.endTransaction(newctx.trans);
				}

				if(newctx.comp.scopeKey) {
					var model = $("[name='" + ctx.form.primaryComponent + "']").scope()[ctx.form.primaryComponent],
						newdata = data[newctx.comp.scopeKey] || data;

					if(model.update) model.update(newdata);

					//noParameterParser.update(, curData);
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

			}, 250);
		}

		function _fault(ctx, reject, data, err) {
			var msg = err.name + ": " + err.message;
			noPrompt.hide();
			noPrompt.show(
				"Save Error", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 400px; overflow: auto\">Save Failed. </br>" + (noConfig.current.debug ? "<div>" + JSON.stringify(err) + "</div>" : msg) + "</div>",
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
					scope: data.scope,
					width: "60%",
					height: "35%",
				});

		}

		function _upsert(ctx, scope, el, data, noTrans, newctx, schema) {
			return $q(function (resolve, reject) {
				var noForm = ctx.form,
					comp = noForm.noComponents[noForm.primaryComponent],
					ds = noDataSource.create(comp.noDataSource, scope);

					if(!data.commit) {
						data = new noInfoPath.data.NoDataModel(schema, data);
					}

					data.commit();

					if(data.current[comp.noDataSource.primaryKey]){
						ds.update(data.current, noTrans)
							.then(_successful.bind(null, ctx, resolve, newctx))
							.catch(_fault.bind(null, ctx, reject, newctx));
					} else {
						ds.create(data.current, noTrans)
							.then(_successful.bind(null, ctx, resolve, newctx))
							.catch(_fault.bind(null, ctx, reject, newctx));
					}

			});
		}

		function _save(ctx, scope, el, data) {
				var noForm = ctx.form,
					comp = noForm.noComponents[noForm.primaryComponent],
					noTrans = ctx.datasource.noTransaction ? noTransactionCache.beginTransaction(noLoginService.user.userId, comp, scope) : null,
					newctx = {
						ctx: ctx,
						comp: comp,
						trans: noTrans,
						scope: scope
					},
					schema = scope["noDbSchema_" + ctx.datasource.databaseName].entity(ctx.datasource.entityName),
					savedata = data ?  data : $("[name='" + ctx.form.primaryComponent + "']").scope()[ctx.form.primaryComponent]
					;



				return $q(function(resolve, reject){
					if(savedata.$valid === undefined || savedata.$valid) {
						noPrompt.show(
							"Save in Progress",
							"<div><div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div></div>",
							null,
							{
								height: "15%"
							}
						);

						if(!savedata.commit) {
							savedata = new noInfoPath.data.NoDataModel(schema, savedata);
						}


						savedata.commit();

						if(comp.noDataSource.noTransaction) {

							noTrans.upsert(savedata.current)
								.then(_successful.bind(null, ctx, resolve, newctx))
								.catch(_fault.bind(null, ctx, reject, newctx));
						} else {
							_upsert(ctx, scope, el, savedata.current, noTrans, newctx, schema);
						}
					} else {
						scope.$broadcast("no::validate");
						reject("Form is invalid.", savedata);
						noPrompt.hide();
					}
				});


		}

		function _undo(ctx, scope, el, dataKey, undoDataKey) {
			return $q(function (resolve, reject) {
				var data = $("[name='" + ctx.form.primaryComponent + "']").scope()[ctx.form.primaryComponent];

				if(data) data.undo();
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

		function _deleteSelected(ctx, scope, el, gridName, tableName, entityLabel, primaryKey, message, provider, dbName, noTransRequired) {
			var grid = scope[gridName],
				checked = grid.tbody.find("input:checkbox:checked"),
				dsCfg = {
					"dataProvider": provider || "noIndexedDb",
					"databaseName": dbName || "rmEFR2",
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

			var threeOptions =	"<div class=\"center-block\" style=\"font-size: 1.25em;\">" + compiledMessage +
								"</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block btn-callback btn-auto-hide\" value=\"delete\">Permanently Delete Selected Items</button>" +
								"<button type=\"button\" class=\"btn btn-info btn-block btn-callback btn-auto-hide\" value=\"remove\">Removed Selected from this Device Only</button><button type=\"button\" class=\"btn btn-default btn-block btn-callback btn-auto-hide\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>",
				twoOptions = "<div class=\"center-block\" style=\"font-size: 1.25em;\">" + compiledMessage +
							 "</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block btn-callback btn-auto-hide\" value=\"delete-notrans\">Permanently Delete Selected Items</button><button type=\"button\" class=\"btn btn-default btn-block btn-callback btn-auto-hide\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>";

			noPrompt.show("Confirm Deletion", noTransRequired ? twoOptions :  threeOptions, function(e){
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

					case "delete-notrans":
						noPrompt.show("Confirm Permanent Deletion", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\"><b class=\"text-danger\">WARNING: THIS ACTION IS NOT REVERSABLE<br/>ALL USERS WILL BE AFFECTED BY THIS ACTION</b></div><div class=\"center-block text-center\" style=\"font-size: 1.25em;\">You are about to permanently delete " + pluralize(entityLabel, checked.length, true) + ".<br/>Click OK to proceed, or Cancel to abort this operation.</div>",function(e){
								if($(e.target).attr("value") === "OK") {
									_executeDeletes(scope, checked, ds);
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
		.service("noDataManager", ["$timeout", "$q", "$rootScope", "noConfig", "noLoginService", "noTransactionCache", "noParameterParser", "noDataSource", "noKendoHelpers", "noPrompt", NoDataManagerService])
		;
})(angular);
