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
                    if(!attrs.noForm) throw "noForm requires a value."
                    if(!attrs.noDataSource) throw "noForm requires a noDataSource attribute."

                     //Ensure with have a propertly configured application.
                    //In this case a properly configured IndexedDB also.
                    noAppStatus.whenReady()
                        .then(_start)
                        .catch(function(err){
                            console.error(err);
                        });

                    function _start(){
                        if(!$state.current.data) throw "Current state ($state.current.data) is expected to exist.";
                        if(!$state.current.data.noDataSources) throw "Current state is expected to have a noDataSource configuration.";
                        if(!$state.current.data.noComponents) throw "Current state is expected to have a noComponents configuration.";

                        var dsCfg = $state.current.data.noDataSources[attrs.noDataSource],
                            ds = new window.noInfoPath.noDataSource(attrs.noForm, dsCfg, $state.params),
                            formCfg = $state.current.data.noComponents[attrs.noComponent];

                        window.noInfoPath.watchFiltersOnScope(attrs, dsCfg, ds, scope, $state);               		

	                    scope.$on("noSubmit::dataReady", function(e, elm, scope){
	                        var noFormData = scope[attrs.noDataSource];
	                        //console.warn("TODO: Implement save form data", noFormData, this);
	                        ds.upsert({data: noFormData})
	                        	.then(function(data){
	                        		$state.go("^.summary");
	                        	})
	                        	.catch(function(err){
	                        		alert(err);
	                        	});
	                    }.bind($state));                  		
	                                    
	                    var req = new window.noInfoPath.noDataReadRequest(ds.table, {
	                    	data: {
	                    		"filter": {
	                    			filters: ds.filter
	                    		}
	                    	}
	                    });

						ds.transport.one(req)
							.then(function(data){
								scope.$root[attrs.noDataSource] = data;
								//console.log("noForm", scope);
							})
							.catch(function(err){
								console.error(err);
							});
					}
                }
            }
        }])
    ;
    var noInfoPath = {};

    window.noInfoPath = angular.extend(window.noInfoPath || {}, noInfoPath);
})(angular);

