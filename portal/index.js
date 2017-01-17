(function () {
    'use strict'
    angular
        .module('DiscoveryServicePortal',['ngMaterial','dsp.components.services.search'])
        .config(function($compileProvider) {
            $compileProvider.preAssignBindingsEnabled(true);
        });

})();