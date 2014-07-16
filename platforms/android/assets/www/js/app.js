// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array or 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', [
        // libraries
        'ionic',
        'ionic.extension.stackModal',
        'ngAnimate',
        'ngSanitize',
        // app-specific modules
        'starter.services',
        'starter.controllers',
        'starter.directives'])

    .config(function ($compileProvider) {
        // Needed for routing to work
        // $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);
    })

    // 友盟key
    .config(function(){
        window.umappkey = '52f0968f56240ba06f34bcc0';
    })

    .config(function ($routeProvider, $locationProvider) {
        $routeProvider
            // 排行榜
            .when('/chart', {
                templateUrl: 'templates/chart.html',
                controller: 'ChartCtrl'
            })
            .when('/search', {
                templateUrl: 'templates/search.html',
                controller: 'SearchCtrl'
            })
            .when('/search-result/:q',{
                templateUrl: 'templates/search-result.html',
                controller: 'SearchResultCtrl'  
            })
            .when('/category/:by',{
                templateUrl: 'templates/category.html',
                controller: 'ByCategoryCtrl'    
            })
            .when('/artist/:artistId', {
                templateUrl: 'templates/artist.html',
                controller: 'ArtistCtrl'
            })
            .when('/playlist/:playlistId', {
                templateUrl: 'templates/playlist.html',
                controller: 'PlaylistCtrl'
            })
            .when('/login', {
                templateUrl: 'templates/login.html',
                controller: 'LoginCtrl'
            })
            .when('/comment', {
                templateUrl: 'templates/comment.html',
                controller: 'CommentCtrl'
            })
            .when('/mine',{
                templateUrl:'templates/mine.html',
                controller:'MineCtrl'
            })
            .when('/my-artist',{
                templateUrl:'templates/my-artist.html',
                controller:'MyArtistCtrl'
            })
            // if none of the above routes are met, use this fallback
            // which executes the 'AppCtrl' controller (controllers.js)
            .otherwise({
                redirectTo: '/'
            })

        // false时，有时4.2.2下是好的，不会崩溃
        // true时，无法找到templates下的模板文件，且不认templates文件中的本地图片;false可以
        $locationProvider.html5Mode(false);  // will crash android 4.2.2 if false due to this bug(? colons in URIs crash WebView): https://code.google.com/p/android/issues/detail?id=46721
    })

    // constants
    .constant('DOUBAN_CONSTANTS', {
        'API': 'http://music.douban.com/api/artist',
        'SAPI': 'https://music.douban.com/api/artist',
        'DA_VER': '1.0.5',
        'APPNAME': 'music_artist',
        'SHARE_VENDER_SINA': '2',
        'SHARE_VENDER_TENCENT': '3',
        'VERSION': 50,
        'NOTI_TYPE_UPLOAD_SONGS': 1 << 0,
        'NOTI_TYPE_PUB_EVENTS': 1 << 1
    })

    // 初始化动作
    // 播放歌曲放在这里? $rootScope.$on('player.play',song)
;

