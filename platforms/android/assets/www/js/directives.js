angular.module('starter.directives', [])

    .directive('scrollable', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                $timeout(function () {
                    $scope.scroller = new IScroll($element[0], $attrs);
                    console.log('iscroll');
                }, $attrs.initScrollDelay ? $attrs.initScrollDelay : 0);
            }
        };
    }])

/**
 * SIMPLE TAB
 * tabWrapper/tabHead/tabPane
 *
 * TODO 动画？
 *
 * 不会每次重新渲染tab的内容
 **/
    .directive('tabWrapper', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            scope: true,
            controller: function ($scope, $element, $attrs) {
                $scope.tabStatus = {
                    activeTab: null, // 当前active的tab名
                    tabs: [],     // 所有tab名
                    defaultActiveTab: $attrs.defaultActiveTab,
                    headAnimate: $attrs.tabHeadAnimate,
                    paneAnimate: $attrs.tabPaneAnimate
                };

                // public events
                // 显示某个tab
                $scope.$on('simpleTab.show', function (e, tabName) {
                    $scope.tabStatus.activeTab = tabName;
                });
            }
        };
    }])

    .directive('tabHead', ['$animate', function ($animate) {
        return {
            restrict: 'A',
            scope: true,
            require: '^tabWrapper',
            /**
             * $attr:
             *      tabName
             *      activeClass
             */
            link: function ($scope, $element, $attrs) {
                var tabStatus = $scope.tabStatus;

                $scope.tabName = $attrs.tabName;
                $scope.activeClass = $attrs.activeClass;

                tabStatus.tabs.push($scope.tabName);

                var tapHandler = function () {
                    $scope.$apply(function () {
                        tabStatus.activeTab = $scope.tabName;
                    });
                };
                ionic.on('tap', tapHandler, $element[0]);

                $scope.$watch(function () {
                    return tabStatus.activeTab;
                }, function (newV, oldV) {
                    // deactive自己
                    if (newV != $scope.tabName) {
                        $animate.removeClass($element, $scope.tabStatus.headAnimate);
                    }
                    // active自己
                    else {
                        $animate.addClass($element, $scope.tabStatus.headAnimate);
                        $scope.$emit('simpleTab.shown', $scope.tabName);
                    }
                });
            }
        };
    }])


    .directive('tabPane', ['$animate', function ($animate) {
        return {
            restrict: 'A',
            scope: true,
            require: '^tabWrapper',
            /**
             * $attr:
             *      tabName
             *      activeClass
             */
            link: function ($scope, $element, $attrs) {
                var tabStatus = $scope.tabStatus;

                $scope.tabName = $attrs.tabName;
                $scope.activeClass = $attrs.activeClass;

                $scope.$watch(function () {
                    return tabStatus.activeTab;
                }, function (newV, oldV) {
                    // deactive自己
                    // 问题在这里
                    console.log('ac',$element);
                    if (newV != $scope.tabName) {
                        $animate.removeClass($element, $scope.tabStatus.paneAnimate, function () {
                            $element[0].style.display = 'none';
                        });
                    }
                    // active自己
                    else {
                        $element[0].style.display = 'block';
                        $animate.addClass($element, $scope.tabStatus.paneAnimate, function () {
                        });
                    }
                });
                // 如果自己是默认显示的tab，显示之
                if ($scope.tabName == tabStatus.defaultActiveTab) {
                    tabStatus.activeTab = $scope.tabName;   // will trigger $watch
                }
                // register scroll view?
                if($scope.$eval($attrs.registerScroller)){
                    $scope.$watch(function(){
                        return $scope.scrollView;
                    },function(newV){
                        $scope.$emit('registerScroller',$scope.tabName,$scope.scrollView);
                    });
                }
            }
        };
    }])

    // 播放器
    .directive('player',['$rootScope','$timeout','$animate',function($rootScope,$timeout,$animate){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            templateUrl:'templates/player.html',

            // root scope是event bus。组件自己的事件emit冒泡到root，同时监听root发来的请求。
            // 客户对组件的调用/监听，都必须通过root scope。
            controller: function ($scope, $element, $attrs) {
                $scope.playerStatus = {
                    song:null, // 当前播放的歌曲
                    playlist:null, // 播放列表

                    // 播放状态
                    duration:null,   // 当前播放歌曲的总长度
                    now:null,    // 当前播放的进度
                    curIndex:null, // 当前播放第几首
                    playing:false,  // 是否正在播放
                    playerVisible:false, // 是否显示播放器

                    //
                    audio:null
                };
                var playerStatus = $scope.playerStatus;

                // 计算进度百分比
                $scope.progressPercentage = function(){
                    return (playerStatus.now || 0) / (playerStatus.duration || 0.001) * 100 + '%';
                };

                // 计算剩余时间
                $scope.timeLeft = function(){
//                    return String(playerStatus.duration) + ':' + String(playerStatus.now);
                    var duration = playerStatus.duration || 300;
                    if (playerStatus.now) {
                        var secs = parseInt(duration - playerStatus.now);
                        if (secs < 0) secs = 0;
                        var mm = parseInt(secs / 60),
                            ss = secs - mm * 60;
                        return ('- ' +
                            (mm<10 ? '0'+ mm : mm) + ':' +
                            (ss<10 ? '0'+ss : ss)
                        );
                    }
                };

                // player显示相关
                function cancelCloseTimeout(){
                    playerStatus.hidePlayerPromise && $timeout.cancel(playerStatus.hidePlayerPromise);
                }
                $element[0].addEventListener('touchstart', function(){
                    cancelCloseTimeout();
                });

                $scope.togglePlayer = function(show){
                    if(playerStatus.playerInAnimation)
                        return;
                    var player = $element.children().eq(1);
                    show = show || !playerStatus.playerVisible;
                    playerStatus.playerVisible = show;
                    playerStatus.playerInAnimation = true;
                    $animate[(show?'add':'remove')+'Class'](player, 'player-show',function(){
                        playerStatus.playerInAnimation = false;
                    });
                    cancelCloseTimeout();
                    // close player after 10s
                    if(show){
                        playerStatus.hidePlayerPromise = $timeout(function(){$scope.togglePlayer(false);},10000);
                    }
                };

                $scope.isTitleTooLong = function(){
                    var chinese = /[^u00-uff]/gi;
                    return false;
                    return playerStatus.song && playerStatus.song.name.replace(chinese, 'rr').length > 14;
                };

                // TODO 1. notification 2. 保存当前播放歌曲
                $scope.playNext = function (){
                    $scope.play(playerStatus.curIndex + 1 < playerStatus.playlist.length ?
                        playerStatus.curIndex + 1 : 0);
                };

                $scope.play = function(index){
                    index = index || 0;
                    var playlist = playerStatus.playlist;
                    if (playlist.length > index) {
                        $scope.stop();
                        playerStatus.curIndex = index;
                        playerStatus.audio.src = playlist[index].src;
//                        playerStatus.audio.src ='http://luoo.800edu.net/low/luoo/radio572/01.mp3';
                        playerStatus.audio.load();
                        playerStatus.playing = true;
                        playerStatus.song = playlist[index];
                        $scope.$emit('player.started');
                        var t = playerStatus.song.length.split(':');
                        playerStatus.duration =
                            t.length == 2 ? ((Number(t[0]) || 0) * 60 + (Number(t[1]) || 0)) : 0;
                        $timeout(function(){playerStatus.audio.play();});
                    }
                };

                $scope.pause = function(){
                    playerStatus.audio.pause();
                    // wait for 'timeupdate' events stop firing
                    $timeout(function(){
                        playerStatus.playing = false;
                        $scope.$emit("player.paused");
                    });
                };

                $scope.resume = function(){
                    $scope.playerStatus.audio.play();
                    playerStatus.playing = true;
                    $scope.$emit("player.resumed");
                };

                $scope.stop = function(){
                    playerStatus.audio.pause();
                    playerStatus.playing = false;
                    playerStatus.now = 0;
                    $scope.$emit("player.stopped");
                };

                $scope.togglePause = function(){
                    console.log(playerStatus.playing);
                    var action = $scope[playerStatus.playing?'pause':'resume'];
                    action();
                };

                // 接受其他客户调用
                $rootScope.$on('player.play',function(e,order){
                    $scope.play(order);
                });
                $rootScope.$on('player.pause',function(){
                    $scope.pause();
                });
                $rootScope.$on('player.resume',function(){
                    $scope.resume();
                });
                $rootScope.$on('player.reset',function(e,playlist,playIndex){
                    playerStatus.playlist = playlist || [];
                    $scope.stop();
                    if(typeof playIndex == 'number'){
                        $scope.play(playIndex);
                        $scope.togglePlayer(true);
                    }
                });
            },
            link: function ($scope, $element, $attrs) {
                var audio = $scope.playerStatus.audio = $element.find('audio')[0],
                    playerStatus = $scope.playerStatus;

                // audio的事件监听。
                // 一般来说，在callback中会：1) 改变组件scope内保存的状态； 2) 处理； 3) 组件$emit事件。
                audio.addEventListener('ended', function(){
                    $scope.$apply(function(){
                        $scope.$emit('player.complete');
                        playerStatus.playing = false;
                        $scope.playNext();
                    });
                });
                audio.addEventListener('loadedmetadata', function(){
                    $scope.$apply(function(){
                        // android buggy, get infinity
                        if (audio.duration && audio.duration != Infinity) playerStatus.duration = audio.duration;
                    });
                });
                audio.addEventListener('error', function(){
                    $scope.$apply(function(){
                        $scope.$emit('player.error');
                        $scope.$emit('player.complete');
                        playerStatus.playing = false;
                        $timeout( function(){
                            $scope.playNext();
                        }, 2000);
                    });
                });
                audio.addEventListener('timeupdate', function(){
                    // too fast, easily conflict with other DOM event handler (eg. ngClick)
                    //
                    $scope.$apply(function(){
                        playerStatus.now = audio.currentTime;
                        var progress = {
                            now: playerStatus.now,
                            duration: playerStatus.duration
                        };
                        if(progress.now > 0) {
                            $scope.$emit('player.timeUpdate', progress);
                            playerStatus.playing = true;
                        }
                    });
                });
            }
        };
    }])

    .directive('httpLoading',[function(){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            template:
            '<div class="spinner" id="http-spinner">'+
              '<div class="outer"><div class="inner"></div></div>'+
              ''+
            '</div>',
            link: function ($scope, $element, $attrs) {
                $(document).ajaxStart(function(){
                    $element[0].style['display'] = 'table-cell';
                }).ajaxStop(function(){ // handles multiple ajax requests perfectly!
                    $element[0].style['display'] = 'none';
                });
            }
        };
    }])
//    .directive('appSpinner',[function(){
//        return {
//            restrict:'E',
//            replace:true,
//            scope:true,
//            template:'',
//            link: function ($scope, $element, $attrs) {
//                var spinner = wizSpinner.create({
//
//                });
//                $(document).ajaxStart(function(){
//                    spinner.show();
//                }).ajaxStop(function(){ // handles multiple ajax requests perfectly!
//                    spinner.hide();
//                });
//            }
//        };
//    }])

    .directive('toast',['$rootScope','$timeout','$animate',function($rootScope,$timeout,$animate){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            template:'<div id="toast"><span id="toast-inner"></span></div>',
            link: function ($scope, $element, $attrs) {
                var e = $element[0];
                var inner = $element.find('span').eq(0)[0];
                $rootScope.$on('toast.show',function(event,msg){
                    $scope.t && $timeout.cancel($scope.t);
                    inner.innerHTML = msg;
                    e.style['opacity'] = 0.6;
                    e.style['-webkit-transform'] = 'translateY(0)';
                    $scope.t = $timeout(function(){
                        e.style['opacity'] = 0;
                        e.style['-webkit-transform'] = 'translateY(150px)';
                    },3000);
                });
            }
        };
    }])

    .directive('extLink',['$parse',function($parse){
       return {
            restrict:'A',
            link:function($scope,$element,$attrs){
                var url;
                var urlExpr = $parse($attrs.extLink);
                $scope.$watch(urlExpr, function(value) {
                    url = value;
                });
                ionic.on('tap', function(){
                    window.open(url, '_blank', 'location=yes');
                }, $element[0]);
            }
       };
    }])

    .directive('artistList',['$parse','$rootScope',function($parse,$rootScope){
       return {
            restrict:'E',
            replace:true,
            scope:true,
            templateUrl:"templates/artist-list.html",    // templateUrl和ngRepeat一起用时会出现bug
            link:function($scope,$element,$attrs){
                $scope.$watch($parse($attrs.data),function(value){
                    $scope.artistList = value;
                });
                $scope.toggleLike = function(artist){
                    // 传artist的原因：需要更新artist对象中的added字段，实现页面上“喜欢”状态的同步
                    $rootScope.$emit('toggleLike',artist);
                };
            }
       };
    }])


    .directive('updateList',['$parse','$rootScope',function($parse,$rootScope){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            templateUrl:"templates/update-list.html",
            link:function($scope,$element,$attrs){
                $scope.action = {
                    'note':'日记',
                    'event':'活动',
                    'topic':'讨论',
                    'song':'单曲',
                    'photo':'照片'
                };
                $scope.$watch($parse($attrs.data),function(value){
                    $scope.updateList = value;
                });
                $scope.$watch($parse($attrs.showSite),function(value){
                    $scope.showSite = value;
                });
                $scope.$watch($parse($attrs.showType),function(value){
                    $scope.showType = value;
                });
                // 过滤动态
                $scope.nonEmptyKind = function(u){return u.kind?true:false;};
                // 换行
                $scope.replaceNewLine = function (str) {
                    return str.replace(/\n/g, '<br />');
                };
                $scope.getTitleHtml = function(update){
                    return ($scope.showType?'['+ $scope.action[update.kind] +']&nbsp;':'')+ update.title;
                }
            }
        };
    }])

    .directive('eventList',['$parse','$rootScope',function($parse,$rootScope){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            templateUrl:"templates/event-list.html",
            link:function($scope,$element,$attrs){
                $scope.$watch($parse($attrs.data),function(value){
                    $scope.eventList = value;
                });
                $scope.$watch($parse($attrs.showSite),function(value){
                    $scope.showSite = value;
                });
                // 换行
                $scope.replaceNewLine = function (str) {
                    return str.replace(/\n/g, '<br />');
                };
            }
        };
    }])

    .directive('playlistList',['$parse','$rootScope',function($parse,$rootScope){
        return {
            restrict:'E',
            replace:true,
            scope:true,
            templateUrl:"templates/playlist-list.html",
            link:function($scope,$element,$attrs){
                $scope.$watch($parse($attrs.data),function(value){
                    $scope.playlistList = value;
                });
            }
        };
    }])

    .directive('sortSwitch',['$parse',function($parse){
       return {
            restrict:'E',
            replace:true,
            scope:true,
            template:
            '<span class="button butotn-icon" id="sort-switch">'+
                '<span class="button" ng-click="setSortby(\'hot\')" ng-class="{active:sortby==\'hot\'}">最热</span>'+
                '<span class="button" ng-click="setSortby(\'new\')" ng-class="{active:sortby==\'new\'}">最新</span>'+
            '</span>',
            link:function($scope,$element,$attrs){
                // child scope has only one attribute 'sortby',which will be sychronized with outer scope
                $scope.$watch($parse($attrs.sortby),function(value){
                    $scope.sortby = value;
                });
                // if 'sortby' changed, propogate new value
                $scope.setSortby = function(sortby){
                    if($scope.sortby == sortby)
                        return;
                    $scope.sortby = sortby;
                    $scope.$emit('sortSwitch.changed',sortby);
                };
            }
       };
    }])

    // 分享功能
    .directive('shareArtist',[function(){
        return {
            restrict:'A',
            link:function($scope,$element,$attrs){
                ionic.on('tap',function(){
                    var a = $scope.$eval($attrs.shareArtist);
                    window.socialmessage.send({text:getShareTxt(a)});

                },$element[0]);

                function getShareTxt(artist){
                    return '分享音乐人'+artist.name+' - 来自豆瓣音乐人 http://site.douban.com/'+artist.id;
                }
            }
        };
    }])
    .directive('shareSong',[function(){
        return {
            restrict:'A',
            link:function($scope,$element,$attrs){
                ionic.on('tap',function(){
                    var s = $scope.$eval($attrs.shareSong);
                    window.socialmessage.send({text:getShareTxt(s)});
                },$element[0]);

                function getShareTxt(song){
                    return '分享'+song.artist+'的歌曲<'+song.name+'> - 来自豆瓣音乐人 http://site.douban.com/'+song.artist_id+'/?s='+song.id;
                }
            }
        };
    }])
;