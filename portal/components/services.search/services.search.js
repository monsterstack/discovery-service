(function(angular){
    angular
        .module("dsp.components.services.search", ['ngMaterial','ngSanitize', 'dataGrid','pagination', 'ui.select'])
        .component("dspServicesSearch", {
            controller: dspServicesSearchController,
            controllerAs: "vm",
            templateUrl:"/portal/components/services.search/services.search.html"
        });

    function dspServicesSearchController($scope, $http, $window){
        let vm = this;
        let listeners = {};

        vm.$onInit = initialize($http);

        vm.display = {};

        vm.display.searchCriteria = "";
        vm.display.searchResults = [];
        vm.display.searchSubmitted = false;

        vm.display.pagination = {};
        vm.display.pagination.oneIndexedPage = 1;
        vm.display.pagination.size = 20;
        vm.display.pagination.total = 0;

        vm.display.selectedStage = "";
        vm.display.stages = [];
        vm.display.selectedRegion = "";
        vm.display.regions = [];
        vm.display.selectedStatus = "";
        vm.display.statuses = [
            "Online",
            "Offline"
        ];
        vm.display.serviceTypes = [];

        vm.events = {};
        vm.events.onSearchCriteriaChange = onSearchCriteriaChange;
        vm.events.onSearch = onSearch;
        vm.events.onFilterChange = onFilterChange;
        vm.events.onPageChange = onPageChange;
        vm.events.onItemPerPageChange = onItemPerPageChange;
        vm.events.onDocClick = onDocClick;

        function initialize($http){
            let opt = {
                types: "",
                page: 0,
                size: 10,
                stageFilter: "",
                regionFilter: "",
                statusFilter: ""
            }
            $http.get("/constants",{
                headers:{
                    "Content-Type": "application/json"
                }
            }).then(
                function successCallback(results) {
                    vm.display.stages = results.data.stageTypes;
                    vm.display.regions = results.data.regionTypes;
                },
                function errorCallback(error) {
                    console.log("error: ", error);
                }
            );
            $http.get("/api/v1/services/_types",{
                headers:{
                    "Content-Type": "application/json"
                }
            }).then(
                function successCallback(results) {
                    let typeObjArr = results.data;
                    for (let i=0; i<typeObjArr.length; i++) {
                        vm.display.serviceTypes.push(typeObjArr[i].type);
                    }
                },
                function errorCallback(error) {
                    console.log("error: ", error);
                }
            );
            search(opt, $http);
        }

        function onSearchCriteriaChange() {
            vm.display.searchSubmitted = false;
        }

        function prepareSearch(customizedOpt){
            let opt = {
                types: customizedOpt.types,
                page: customizedOpt.page,
                size: customizedOpt.size,
                stageFilter: customizedOpt.stageFilter,
                regionFilter: customizedOpt.regionFilter,
                statusFilter: customizedOpt.statusFilter
            }
            search(opt, $http);
        }

        function onSearch(){
            let opt = {
                types: vm.display.searchCriteria,
                page: 0,
                size: vm.display.pagination.size,
                stageFilter: vm.display.selectedStage,
                regionFilter: vm.display.selectedRegion,
                statusFilter: vm.display.selectedStatus
            }
            prepareSearch(opt);
        }

        function onFilterChange(){
            let opt = {
                types: vm.display.searchCriteria,
                page: 0,
                size: vm.display.pagination.size,
                stageFilter: vm.display.selectedStage,
                regionFilter: vm.display.selectedRegion,
                statusFilter: vm.display.selectedStatus
            }
            prepareSearch(opt);
        }

        function onPageChange(){
            let opt = {
                types: vm.display.searchCriteria,
                page: vm.display.pagination.oneIndexedPage - 1,
                size: vm.display.pagination.size,
                stageFilter: vm.display.selectedStage,
                regionFilter: vm.display.selectedRegion,
                statusFilter: vm.display.selectedStatus
            }
            prepareSearch(opt);
        }

        function onItemPerPageChange(){
            let opt = {
                types: vm.display.searchCriteria,
                page: 0,
                size: vm.display.pagination.size,
                stageFilter: vm.display.selectedStage,
                regionFilter: vm.display.selectedRegion,
                statusFilter: vm.display.selectedStatus
            }
            prepareSearch(opt);
        }

        function onDocClick(url){
            $window.open("https://www.google.com");
        }


        function search(opt, $http){
            console.log("searched:::::::");
            let url = '/api/v1/services?'+ 'types=' + opt.types
                    +'&page=' + opt.page + '&size=' + opt.size
                    + '&stageFilter=' + opt.stageFilter + '&regionFilter=' + opt.regionFilter + '&statusFilter=' + opt.statusFilter;
            console.log(url);
            $http.get(url,
            {
                headers:{
                    "Content-Type": "application/json"
                }
            }).then(
                function successCallback(results) {
                    vm.display.searchResults = results.data.elements;

                    vm.display.pagination.oneIndexedPage = parseInt(results.data.page.page) + 1;
                    vm.display.pagination.size = parseInt(results.data.page.size);
                    vm.display.pagination.total = parseInt(results.data.page.total);

                    vm.display.searchSubmitted = true;


                    console.log("vm.display.searchResults: ", vm.display.searchResults);
                    console.log("vm.display.pagination: ", vm.display.pagination);

                },
                function errorCallback(error) {
                    let emptyArr = [];
                    vm.display.searchResults = emptyArr;
                    console.log("error: ", error);
                }
            );
        }

        function uptimeCal(timestampArr){

        }

    }
})(angular);

