//forms.js
(function(angular, undefined){
    angular.module("noinfopath.forms")
        .directive("noForm", ['$q', '$state', 'noAppStatus', 'noIndexedDB', function($q, $state, noAppStatus, noIndexedDB){
            return {
                restrict: "A",
                controller: ["$scope", function($scope){
                    $scope.$watchCollection("coolertrial", function(newval, oldval, scope){
                        console.log(scope);
                    });
                }],
                //transclude: true,
                //scope:{},
                link: function(scope, el, attrs){
                    //if(!attrs.noForm) throw "noForm requires a value."
                    if(!attrs.noForm && !attrs.noDataSource) throw "noForm requires a noDataSource attribute."

                     //Ensure with have a propertly configured application.
                    //In this case a properly configured IndexedDB also.
                    //noAppStatus

                    function _start(){
                        var ds;

                        if(attrs.noForm !== "noData"){

                            if($state.current.data) {
                                if(!$state.current.data.noDataSources) throw "Current state is expected to have a noDataSource configuration.";
                                if(!$state.current.data.noComponents) throw "Current state is expected to have a noComponents configuration.";                          

                                var dsCfg = $state.current.data.noDataSources[attrs.noDataSource],
                                    formCfg = $state.current.data.noComponents[attrs.noComponent];

                                ds = new window.noInfoPath.noDataSource(attrs.noForm, dsCfg, $state.params),

                                window.noInfoPath.watchFiltersOnScope(attrs, dsCfg, ds, scope, $state);                     
     
                                scope.$on("noSubmit::dataReady", function(e, elm, scope){
                                    var noFormData = attrs.noDataSource ? scope[attrs.noDataSource] : null;
                                    //console.warn("TODO: Implement save form data", noFormData, this);
                                    ds.transport.upsert({data: noFormData})
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
                                        scope[attrs.noDataSource] = data;
                                        //console.log("noForm", scope);
                                    })
                                    .catch(function(err){
<<<<<<< HEAD
                                        alert(err);
                                    });
                            }.bind($state));  

                            var req = new window.noInfoPath.noDataReadRequest(ds.table, {
                                data: {
                                    "filter": {
                                        filters: ds.filter
                                    }
                                },
                                expand: ds.expand
                            });
                            ds.transport.one(req)
                                .then(function(data){
                                    scope.$root[attrs.noDataSource] = data;
                                    //console.log("noForm", scope);
                                })
                                .catch(function(err){
                                    console.error(err);
                                });                         
=======
                                        console.error(err);
                                    });                         
                            } 
>>>>>>> 49fb8f146735d7a0d7a7932f637dcff63060401b
                        }
                    }

                    _start();
                }
            }
        }])
    ;
    var noInfoPath = {};

    window.noInfoPath = angular.extend(window.noInfoPath || {}, noInfoPath);
})(angular);