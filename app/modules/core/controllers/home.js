'use strict';

/**
 * @ngdoc object
 * @name core.Controllers.HomeController
 * @description Home controller
 * @requires ng.$scope
 */
angular
    .module('core')
    .controller('HomeController', ['$scope','$location',
        function($scope, $location) {
            $scope.lastName = "";
            $scope.firstName = "";


            $scope.regUser = function () {
                console.log($scope.firstName + $scope.lastName);
                $location.path("/chat/" + $scope.firstName + "/" + $scope.lastName);
            };


        }
    ]);
