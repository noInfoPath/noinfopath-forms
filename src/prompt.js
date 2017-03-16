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
	this.show = function(title, message, cb, inOptions) {
		var b = $("body", window.top.document),
			cover = $("<div class=\"no-modal-container ng-hide\"></div>"),
			box = $("<no-message-box></no-message-box>"),
			header = $("<no-box-header></no-box-header>"),
			body = $("<no-box-body></no-box-body>"),
			footer = $("<no-box-footer class=\"no-flex horizontal flex-center no-m-b-md no-p-t-md\"></no-box-footer>"),
			ok = $("<button type=\"button\" class=\"btn btn-primary btn-sm btn-callback no-m-r-md\"></button>"),
			cancel = $("<button type=\"button\" class=\"btn btn-primary btn-sm btn-callback btn-auto-hide\"></button>"),
			options = angular.extend({}, {scope: $rootScope}, inOptions);

		$rootScope.noPrompt = {scope: options.scope};

		header.append(title);

		body.append($compile(message)(options.scope));

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
