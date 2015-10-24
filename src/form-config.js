//form-config.js
(function(angular,undefined){
	"use strict";

	angular.module("noinfopath.forms")
		.service("noFormConfig", ["$q", "$http", "$rootScope", "noDataSource", "noLocalStorage", function($q, $http, $rootScope, noDataSource, noLocalStorage){
			var isDbPopulated = noLocalStorage.getItem("dbPopulated_NoInfoPath_dtc_v1"),
				dsConfig = {
					"dataProvider": "noIndexedDb",
					"databaseName": "NoInfoPath_dtc_v1",
					"entityName": "NoInfoPath_Forms",
					"primaryKey": "FormID"
				},
				dataSource;

			this.whenReady = function(){
				 dataSource = noDataSource.create(dsConfig, $rootScope);

				return $q(function(resolve, reject){

					$http.get("/no-forms.json")
						.then(function(resp){
							var forms = resp.data,
								promises = [];

							dataSource.entity.clear()
								.then(function(){
									for(var f in forms){
										var frm = forms[f];

										if(f === "editors"){
											for(var e in frm){
												var editor = frm[e];

												editor.search.shortName = "search_" + e;
												editor.search.routeToken = e;
												promises.push(dataSource.create(editor.search));

												editor.edit.shortName = "edit_" + e;
												editor.edit.routeToken = e;
												promises.push(dataSource.create(editor.edit));
											}
										}else{
											frm.shortName = f;
											promises.push(dataSource.create(frm));
										}
									}

									$q.all(promises)
										.then(function(){
											noLocalStorage.setItem("dbPopulated_NoInfoPath_dtc_v1", {timestamp: new Date()});
											resolve();
										})
										.catch(reject);

								});

						})
						.catch(function(err){

							if(isDbPopulated){
								resolve();
							}else{
								reject(err);
							}
						});


				});
			};

			this.getFormByShortName = function(shortName, scope){
				var form = noInfoPath.getItem(scope, shortName),
					promise;

				if(form){
					promise = $q.when(form);
				}else{
					promise = dataSource.entity
						.where("shortName")
						.equals(shortName)
						.toArray()
						.then(function(data){
							form = data.length ? data[0] : undefined;
							scope[shortName] = form;
							return form;
						});
				}


				return promise;
			};


			this.getFormByRoute = function(routeName, entityName, scope){
				var promise,
					routeKey = entityName ? routeName + entityName : routeName,
					form = scope[routeKey];

				if(form){
					promise = $q.when(form);
				}else{
					if(entityName){
						promise = dataSource.entity
							.where("[route.name+routeToken]")
							.equals([routeName, entityName])
							.toArray()
							.then(function(data){
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					}else{
						promise = dataSource.entity
							.where("route.name")
							.equals(routeName)
							.toArray()
							.then(function(data){
								form = data.length ? data[0] : undefined;
								scope[routeKey] = form;
								return form;
							});
					}

				}

				return promise;
			};
		}]);
})(angular);
