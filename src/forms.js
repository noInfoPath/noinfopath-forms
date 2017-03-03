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

	/*
	*	## NoPromptService (noPrompt)
	*
	*	The noPrompt service shows and hides a UI blocking dialog box that can be customized to
	*	display any kind of information require by an application.
	*
	*	### Methods
	*
	*	#### show(title, message, cb, options)
	*
	*	Displays the prompt configuring it with the parameters and options provided.
	*
	*	##### Parameters
	*
	*	|Name|Type|Description|
	*	|----|----|-----------|
	*	|title|String|The text that is displayed in the dialog boxes header sections|
	*	|message|String|HTML or plain text that is displayed in the body of the dialog box.|
	*	|cb|Function|A callback function that noPrompt will call when any button is clicked. In order for a button to trigger the  callback it must be decorated with special CSS classes.  (See `CSS Classes` section below)|
	*	|options|Object|Allows for serveral optional setting to be provided.|
	*
	*	#### hide(to)
	*
	*	Hides the dialog box.  Hiding can be delayed by passing the `to` parameter.
	*
	*	|Name|Type|Description|
	*	|----|----|-----------|
	*	|to|Integer|The number of milliseconds to wait before closing the dialog.
	*
	*	### CSS classes
	*
	*	#### .btn-callback
	*
	*	When added to a `<button>` element causes noPrompt to execute the `callback`
	*	function if provided.  If the provided HTML `message` contains buttons other than the
	*	standard `OK` and `Cancel` buttons, adding this class will trigger the
	*	provided `callback` function.
	*
	*	#### .btn-auto-hide
	*
	*	When added to a button with the `btn-callback` class, noPrompt will
	*	call the `hide` method before executing the `callback` function.
	*
	*	#### .btn-no-auto-hide
	*
	*	When added to a button with the `btn-callback` class, prvents the call
	*	call to the `hide` method.
	*
	*	### Options
	*
	*	|Name|Type|Description|
	*	|----|----|-----------|
	*	|height|String|Any valid CSS `min-height` value.  If ommited then `10%` is used.|
	*	|scope|Object|Reference to the scope object associated with the context of the noPrompt callee.|
	*	|showFooter|Object|When provided causes the noPrompt to display the footer section. Typically this used with an `OK` and/or `Cancel` button is desired.|
	*	|showFooter.cancelLabel|String|Text to display on the button|
	*	|showFooter.okAutoHide|Boolean|Adds the `.btn-auto-hide` class to the `OK` button|
	*	|showFooter.okDisabled|Boolean|Adds the `ng-disabled` class to the `OK` button. Useful when the user must perform some activity before clicking the `OK` button.|
	*	|showFooter.okLabel|String|Text to display on the `OK` button.|
	*	|showFooter.okValue|String|Value to set on the `OK` button's `value` attribute. This useful for identifying which button was clicked during a call to the provided `callback` function.|
	*	|showFooter.showCancel|Boolean|When `true` displays the `Cancel` button in the footer.|
	*	|showFooter.showOK|Boolean|When `true` displays the `OK` button in the footer.|
	*	|showFooter.okPubSub|Object|This is useful when you want to receive direct PubSub messages from the various NoInfoPath componets that publish events.  This is different from the AngularJS Digest method.|
	*	|width|String|Any valid CSS `min-width` value.  If ommited then `60%` is used.|
	*
	*	### Examples
	*
	*	#### Simple Progress Bar
	*
	*	Displays the dialog box without the footer or any other buttons. Notice that
	*	no callback function was provided, a `null` value was passed instead.
	*
	*	```js
	*		noPrompt.show(
	*			"Deletion in Progress",
	*			"<div><div class=\"progress\"><div class=\"progress-bar progress-bar-info progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"100\" aria-valuemax=\"100\" style=\"width: 100%\"></div></div></div>",
	*			null,
	*			{
	*				height: "15%"
	*			}
	*		);
	*	```
	*
	*	#### Typical OK/Cancel Modal w/Callback Function
	*
	*	In this example the dialog box is displayed with the footer enabled and
	*	the OK and Cancel buttons visible.  It implements the `callback` function.
	*
	*	```js
	*		noPrompt.show(
	*			"Confirm Permanent Deletion", "<div class=\"center-block text-center\" style=\"font-size: 1.25em; width: 80%\"><b class=\"text-danger\">WARNING: THIS ACTION IS NOT REVERSABLE<br/>ALL USERS WILL BE AFFECTED BY THIS ACTION</b></div><div>Click OK to proceed, or Cancel to abort this operation.</div>",
	*			function(e){
	*				if($(e.target).attr("value") === "OK") {
	*					// ... do stuff if OK was clicked ...
	*				}
	*			},
	*			{
	*				showCloseButton: true,
	*				showFooter: {
	*					showCancel: true,
	*					cancelLabel: "Cancel",
	*					showOK: true,
	*					okLabel: "OK",
	*					okValue: "OK",
	*					okAutoHide: true
	*				},
	*				scope: scope,
	*				width: "60%",
	*				height: "35%",
	*			});
	*	```
	*
	*	#### Complex Messaage w/Custom Buttons.
	*
	*	In this example a more complex message is provided to `noPrompt`.
	*	It contains three custom buttons, and takes advantage of the auto hide feature.
	*	Note that the buttons all have `.btn-callback` and `.btn-auto-hide` classed added to them.
	*	```js
	*			noPrompt.show(
	*				"Confirm Deletion",
	*				"<div class=\"center-block\" style=\"font-size: 1.25em;\">Message Goes Here</div><div style=\"width: 60%\" class=\"center-block\"><button type=\"button\" class=\"btn btn-danger btn-block btn-callback btn-auto-hide\" value=\"delete\">Permanently Delete Selected Items</button><button type=\"button\" class=\"btn btn-info btn-block btn-callback btn-auto-hide\" value=\"remove\">Removed Selected from this Device Only</button><button type=\"button\" class=\"btn btn-default btn-block btn-callback btn-auto-hide\" value=\"cancel\">Cancel, Do Not Remove or Delete</button></div>",
	*				function(e){
	*					switch($(e.target).attr("value")) {
	*						case "remove":
	*							//... do stuff ...
	*							break;
	*						case "delete":
	*							//... do stuff ...
	*							break;
	*						default:
	*							break;
	*					}
	*				},
	*				{
	*					showCloseButton: true,
	*					scope: scope,
	*					width: "60%",
	*					height: "35%"
	*				}
	*			);
	*	```
	*/
	function NoPromptService($compile, $rootScope, $timeout, PubSub) {
		var pubSubId;
		this.show = function(title, message, cb, options) {
			var b = $("body", window.top.document),
				cover = $("<div class=\"no-modal-container ng-hide\"></div>"),
				box = $("<no-message-box></no-message-box>"),
				header = $("<no-box-header></no-box-header>"),
				body = $("<no-box-body></no-box-body>"),
				footer = $("<no-box-footer class=\"no-flex horizontal flex-center no-m-b-md no-p-t-md\"></no-box-footer>"),
				ok = $("<button type=\"button\" class=\"btn btn-primary btn-sm btn-callback no-m-r-md\"></button>"),
				cancel = $("<button type=\"button\" class=\"btn btn-primary btn-sm btn-callback btn-auto-hide\"></button>");

			$rootScope.noPrompt = {scope: options.scope};

			header.append(title);

			body.append($compile(message)(options.scope || $rootScope));

			box.append(header);

			box.append(body);


			if(options.showFooter) {
				if(options.showFooter.showOK) {
					ok.attr("value", options.showFooter.okValue || "ok");
					ok.text(options.showFooter.okLabel || "OK");
					if(options.showFooter.okAutoHide) {
						ok.addClass("btn-auto-hide");
					} else {
						ok.addClass("btn-no-auto-hide");
					}
					if(!!options.showFooter.okDisabled) {
						$rootScope.noPrompt.okDisable = options.showFooter.okDisabled;
						ok.attr("ng-disabled", options.showFooter.okDisabled);
					}
					footer.append($compile(ok)(options.scope || $rootScope));
				}

				if(options.showFooter.okPubSub) {
					pubSubId = PubSub.subscribe(options.showFooter.okPubSub.key, options.showFooter.okPubSub.fn);
				}

				if(options.showFooter.showCancel) {
					cancel.attr("value", "Cancel");
					cancel.text(options.showFooter.cancelLabel || "Cancel");
					footer.append(cancel);
				}


				box.append(footer);
			}

			cover.append(box);

			b.append(cover);

			box.css("min-width", options.width || "60%");
			box.css("min-height", options.height || "10%");

			box.find("button.btn-callback.btn-auto-hide").click(function(cb, e){
				_hide();
				if(cb) cb(e);
			}.bind(null, cb));

			box.find("button.btn-callback.btn-no-auto-hide").click(function(cb, e){
				if(cb) cb(e);
			}.bind(null, cb));

			$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams, options){
				if($(".no-modal-container", window.top.document).length) {
					_hide();
				}
			    // transitionTo() promise will be rejected with
			    // a 'transition prevented' error
			});

			cover.removeClass("ng-hide");


		};

		function _hide(to) {
			if(to) {
				$timeout(function(){
					$(".no-modal-container", window.top.document).remove();
					delete $rootScope.noPrompt;
					if(pubSubId) PubSub.unsubscribe(pubSubId);
					pubSubId = undefined;
				}, to);
			} else {
				$(".no-modal-container", window.top.document).remove();
				delete $rootScope.noPrompt;
				if(pubSubId) PubSub.unsubscribe(pubSubId);
				pubSubId = undefined;
			}

		}
		this.hide = _hide;
	}


	angular.module("noinfopath.forms")
		.directive("noForm", ['$timeout', '$q', '$state', '$injector', 'noConfig', 'noFormConfig', 'noLoginService', 'noTransactionCache', 'lodash', NoFormDirective])

		.directive("noRecordStats", ["$q", "$http", "$compile", "noFormConfig", "$state", NoRecordStatsDirective])

		.directive("noGrowler", ["$timeout", NoGrowlerDirective])

		.service("noDataManager", ["$timeout", "$q", "$rootScope", "noLoginService", "noTransactionCache", "noParameterParser", "noDataSource", "noKendoHelpers", "noPrompt", NoDataManagerService])

		.service("noPrompt", ["$compile", "$rootScope", "$timeout", "PubSub", NoPromptService])

		;

})(angular);
