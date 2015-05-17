//forms.js
(function(angular, undefined){
    angular.module("noinfopath.forms")

        .directive("noForm", ['$q', '$state', 'noAppStatus', 'noIndexedDB', function($q, $state, noAppStatus, noIndexedDB){
            return {
                restrict: "A",
                //controller: [function(){}],
                //transclude: true,
                //scope:{},
                link: function(scope, el, attrs){

                	console.log($state.params, $state.current.data);

            		var noFormName = attrs.noForm || "noForm",
                		noFormConfig = $state.current.data ? $state.current.data[noFormName] : undefined;

                   	if(noFormConfig){
						var _table = noIndexedDB[noFormConfig.tableName],
							req = new window.noInfoPath.noDataReadRequest($q, _table),
							_value;

						if(!noFormConfig.primaryKey) throw "noForm requires a primaryKey property.";
						 

						_value = $state.params[noFormConfig.primaryKey.name];
						if(noFormConfig.primaryKey.type === "Number"){
							_value = Number(_value);
						}

						req.addFilter(noFormConfig.primaryKey.name, "eq", _value);

						_table.noCRUD.one(req)
							.then(function(data){
								scope.$root[noFormConfig.name] = data;
								//console.log("noForm", scope);
							})
							.catch(function(err){
								console.error(err);
							});	                   		


	                    scope.$on("noSubmit::dataReady", function(e, elm, scope){
	                        var noFormData = scope[noFormConfig.name];
	                        console.warn("TODO: Implement save form data", noFormData, this);
	                    }.bind($state));                  		
                   	}

                }
            }
        }])

    ;
    var noInfoPath = {};

    window.noInfoPath = angular.extend(window.noInfoPath || {}, noInfoPath);
})(angular);

