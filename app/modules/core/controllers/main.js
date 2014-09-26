angular
    .module('core')
    .controller('MainController', ['$rootScope', '$scope', '$stateParams', 'PubNub','$location',
        function($rootScope, $scope, $stateParams, PubNub, $location) {
            $scope.selectedChannel = 'SvgMgmt';
            $scope.messages = ['Welcome to ' + $scope.selectedChannel];
            $scope.userId = $stateParams.lastName + ' ' + $stateParams.firstName;
            $scope.user    ={
                lastName: $stateParams.lastName,
                firstName: $stateParams.firstName,
                position: {
                    lat:0,
                    lon:0
                }
            }
            $scope.users = [];
            $scope.userDatas = [];
            $scope.newMessage = '';
            $scope.markers = {};
            $scope.geoId;
            $scope.status=false;
            var options = {
                enableHighAccuracy: false,
                timeout: 0,
                maximumAge: 0
            };


            $scope.initialize = function() {
                var mapOptions = {
                    zoom: 11,
                    panControl: false,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };

                var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

                $scope.map = map;
                if(navigator.geolocation) {
                    //navigator.geolocation.getCurrentPosition(function(position) {
                        var pos = new google.maps.LatLng(47.795614, -122.17741400000001);

                        $scope.user.position = pos;
                        $scope.map.setCenter(pos);


//                        //Set myLocation Pin
//                        var marker = new google.maps.Marker({
//                            position: pos,
//                            map: $scope.map,
//                            title: 'My Location',
//                            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
//                        });
                    navigator.geolocation.getCurrentPosition(onPositionSuccess,onPositionError,mapOptions);
                }


            };

            $scope.addPresenceMarker = function (data) {

                console.log("svgMgmt: addPresenceMarker " + JSON.stringify(data));
                if (data.hasOwnProperty('lat') && data.hasOwnProperty('lon') ) {
                    var pos = new google.maps.LatLng(data.lat, data.lon);

                    //Set myLocation Pin
                    var marker = new google.maps.Marker({
                        position: pos,
                       // map: $scope.map,
                        title: data.lastName + ', ' + data.firstName
                        ,icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    });

                    $scope.markers[data.lastName+ data.firstName]   = marker;

                    marker.setMap($scope.map);
                    var infowindow = new google.maps.InfoWindow({
                        content: data.lastName + ', ' + data.firstName
                    });

                    google.maps.event.addListener(marker, 'click', function () {
                        infowindow.open(marker.get('map'), marker);
                    });
                }
            }


            $scope.removePresenceMarker = function (data) {
                console.log("svgMgmt: Remove PresenceMarker " + JSON.stringify(data));
                if ($scope.markers.hasOwnProperty(data.lastName + data.firstName)) {
                    var marker = $scope.markers[data.lastName + data.firstName]
                    marker.setMap(null);
                    delete $scope.markers[data.lastName + data.firstName];
                }

            }

            var  onPositionSuccess = function(position){

                console.log("svgMgmt: Position Record " + JSON.stringify(position));
                $scope.user.position.lat = position.coords.latitude;
                $scope.user.position.lon= position.coords.longitude;

                if ($rootScope.initialized) {
                    PubNub.ngState({
                        channel: $scope.selectedChannel,
                        uuid: $scope.userId,
                        state: {
                            "firstName": $scope.user.firstName,
                            "lastName": $scope.user.lastName,
                            "lat": $scope.user.position.lat,
                            "lon": $scope.user.position.lon
                        }
                    });
                }
            };


            var  onPositionError  = function (error){
                console.log('Error while getting position: ' + error)
            };


            if (!$rootScope.initialized) {

                if (navigator.geolocation) {
                    //navigator.geolocation.getCurrentPosition(onPositionSuccess,onPositionError,options )
                    $scope.geoId = navigator.geolocation.watchPosition(onPositionSuccess, onPositionError, options)
                }

                PubNub.init({subscribe_key: 'sub-c-f330b2f4-3abe-11e4-9201-02ee2ddab7fe',
                    publish_key: 'pub-c-0b185de5-8ac0-4827-8944-0c4de79fa5b7',
                    uuid: $scope.userId});
                //showMaps();

                $rootScope.initialized = true;

            }

            PubNub.ngSubscribe({
                channel: $scope.selectedChannel,
                callback: function (message) {
                    try {
                        $scope.messages.push(message);

                        $scope.$apply();
                        var mydiv = $('#textView');
                        mydiv.scrollTop(mydiv.prop('scrollHeight'));

                    }
                    catch (err) {
                        console.log(err);
                    }

                },
                restore: true,
                heartbeat: 1000,
                disconnect: function() {
                    console.log('Disconnected');
                  $scope.status=false;
                },
                connect: function() {
                  $scope.status=true;
                    console.log('Connected');
                }
            });


            // Create a publish() function in the scope
            $scope.publish = function() {
                if ($.inArray('[' + $scope.userId + '] ' +$scope.newMessage, $scope.messages) == -1) {
                    PubNub.ngPublish({
                        channel: $scope.selectedChannel,
                        message: "[" + $scope.userId + "] " + $scope.newMessage
                    });

                    $scope.newMessage = '';
                    PubNub.ngState({
                        channel: $scope.selectedChannel,
                        uuid: $scope.userId,
                        state: {
                            "firstName": $scope.user.firstName,
                            "lastName": $scope.user.lastName,
                            "lat": $scope.user.position.lat,
                            "lon": $scope.user.position.lon

                        }
                    });
                }
                else
                {
                    alert("Message already posted!");
                }
            };

            // Register for message events
            $rootScope.$on(PubNub.ngMsgEv($scope.selectedChannel), function(ngEvent, payload) {
                console.log('inside message' + JSON.stringify(payload));
                $scope.$apply(function() {
                    if ($.inArray(payload.message, $scope.messages) ==-2) {
                        $scope.messages.push(payload.message);
                    }
                });
            });

            // Register for
            $rootScope.$on(PubNub.ngPrsEv($scope.selectedChannel), function (event, payload) {
                console.log('Got a Presence Event:', JSON.stringify(payload));
                $scope.$apply(function () {
                    $scope.users = PubNub.ngListPresence($scope.selectedChannel);
                    $scope.userDatas = PubNub.ngPresenceData($scope.selectedChannel);

                    if (payload.event.action == 'join') {
                        if (payload.event.hasOwnProperty('data'))
                            $scope.addPresenceMarker(payload.event.data);
                    }
                    else if (payload.event.action=='leave'){
                        $scope.removePresenceMarker(payload.event.data);

                    }
                    else if (payload.event.action=='state-change') {
                        $scope.addPresenceMarker(payload.event.data);
                    }
                });
            });


//            // Pre-Populate the user list (optional)
//            PubNub.ngHereNow({
//                channel: $scope.selectedChannel,
//                state: true,
//                callback: function(m){
//                    console.log('Message in hereNow' + JSON.stringify(m));
//
//                }
//
//            });

            PubNub.ngHistory({
                channel: $scope.selectedChannel,
                count: 500
            });

            $scope.getChannels = function () {
                $scope.channels = PubNub.ngListChannels();
            };

            $scope.unSubscribe = function () {
                PubNub.ngUnsubscribe({channel: $scope.selectedChannel});
                //navigator.app.exitApp();
                $location.path("/");

            };


        }
    ]);