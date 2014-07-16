angular.module('starter.controllers', [])

    .controller('AppCtrl', function ($scope, $location,$rootScope,$timeout,User,Modal,Utils) {
        $location.path("/chart");
        // global left menu toggle button of all first-class pages
        $rootScope.leftMenuToggler = [{
            type:'button-icon fa fa-bars',
            tap:function(e){
                $timeout(function(){$rootScope.$emit('toggleLeftMenu')});
            }
        }];

        // 一些公共方法，root scope作为event bus
        $rootScope.$on('toggleLeftMenu',function(e,toggle){
            $rootScope.sideMenuController.toggleLeft(toggle);
        });

        $rootScope.$on('toggleLike',function(e,artist){
            var loggedUser = User.getCurrentUser();
            // 没有登录
            if(!loggedUser){
                Modal.fromUrl("/login",{
                    scope:$scope,
                    focusFirstInput:true,
                    animation:'my-slide-in-up'
                });
                return;
            }else{
                // 取消喜欢
                if(artist.added == 'yes'){
                    Utils.confirm("要取消关注吗?", function(choice){
                        if (choice == Utils.confirm.OK){
                            User.likeArtist(artist,'unlike').then(null,function(msg){
                                Utils.toast("取消关注失败："+msg);
                            });
                        }
                    });
                }else{  // 喜欢
                    User.likeArtist(artist,'like').then(null,function(msg){
                        Utils.toast("关注失败："+msg);
                    });
                }
            }
        });
    })

// slide menu controller
    .controller('MenuCtrl', function ($scope, $location,$rootScope,User,Utils) {
        // register sidemenu controller to root scope
        $rootScope.sideMenuController = $scope.sideMenuController;
        $scope.menuItems = [
            {
                'name': '热门排行',
                'url': '/chart',
                'icon': 'fa-list'
            },
            {
                'name': '分类浏览',
                'url': '/search',
                'icon': 'fa-search'
            },
            {
                'name': '我喜欢的',
                'url': '/mine',
                'icon': 'fa-heart'
            }
        ];
        $scope.curMenuIndex = 0;
        $scope.selectMenuItem = function (index) {
            $scope.curMenuIndex = index;
            $scope.sideMenuController.toggleLeft();
            var menu = $scope.menuItems[index];
            $location.path(menu.url);
        };
        $scope.User = User;
        $scope.logout = function(){
            Utils.confirm("要退出登陆吗?", function(choice){
                if (choice == Utils.confirm.OK){
                    // 通常来说，Service的方法都是基于$q的，不需要自己手动apply。但是logout是个特例
                    $scope.$apply(function(){
                        User.logout();
                    });
                    Utils.toast("您已退出登陆");
                }
            });
        }
    })

    .controller('ChartCtrl', function ($scope, $location, Song, $timeout, Modal) {
        // 管理两个子tab的状态
        var refreshThreshold = 5 * 60 * 1000; // 5分钟刷新一次

        $scope.chartStatus = {
            songs: null,
            artists: null,
            songLastLoadTime: null
        };
        ;


        // tab是利用transclude来实现切换的，scope每次都会销毁和重建，无法保持状态，因此每个子tab需要的状态必须放在tabs维护
        // 或者将子tab的动作通过事件delegate到这里处理；
        // 也可以用tabs的回调：controllerChanged，判断当前切换/隐藏了哪个tab，执行对应逻辑（最强大的方式）

        // 进入“热门歌曲”tab
        $scope.$on('enterSongChart', function (e, childScope) {
            var now = new Date().getTime();
            // 没有加载过或者超过5分钟，重新加载
            if (!$scope.chartStatus.songLastLoadTime || now - $scope.chartStatus.songLastLoadTime > refreshThreshold) {
                childScope.scrollView.triggerPullToRefresh();
            }
        });

        // 进入“热门音乐人”tab
        $scope.$on('enterArtistChart', function (e, childScope) {
            var now = new Date().getTime();
            // 没有加载过或者超过5分钟，重新加载
            if (!$scope.chartStatus.artistLastLoadTime || now - $scope.chartStatus.artistLastLoadTime > refreshThreshold) {
                childScope.scrollView.triggerPullToRefresh();
            }
        });
    })


// 排行榜
    .controller('ChartSongCtrl', function ($scope, $location, Song, $timeout,Utils) {

        var fetchLatest = function () {
            Song.getPopulars().then(function (songs) {
                $scope.chartStatus.songLastLoadTime = new Date().getTime();
                console.log(songs);
                $scope.$broadcast('scroll.refreshComplete');

                // 如果和上次的结果是一样的，则不刷新

                if (songs && $scope.chartStatus.songs
                    && songs.length == $scope.chartStatus.songs.length) {
                    var same = true;
                    angular.forEach($scope.chartStatus.songs, function (value, index) {
                        if (value.id != songs[index].id)
                            same = false;
                    });
                    if (same){
                        Utils.toast('已经是最新的内容了');
                        return;
                    }
                }

                //重新渲染列表是个很耗时的动作，如果不timeout，scroller的弹回会非常卡.
                //因此等弹回完毕后再重新渲染列表。
                $timeout(function () {
                    $scope.chartStatus.songs = songs;
                }, 200);
            });
        }

        $scope.onRefresh = fetchLatest;

        // timeout等待children构建好scroller。content会把scrollView放在parentScope(即当前scope)中.
        // fire tab切换事件，通知ChartCtrl刷新
        $timeout(function () {
            $scope.$emit('enterSongChart', $scope);
        }, 200);
    })
    .controller('ChartArtistCtrl', function ($scope, Artist, $timeout,Utils) {
        var fetchLatest = function () {
            Artist.getPopulars().then(function (artists) {
                $scope.chartStatus.artistLastLoadTime = new Date().getTime();
                $scope.$broadcast('scroll.refreshComplete');

                // 和上次的id是一样的，则不刷新
                if (artists && $scope.chartStatus.artists
                    && artists.length == $scope.chartStatus.artists.length) {
                    var same = true;
                    angular.forEach($scope.chartStatus.artists, function (value, index) {
                        if (value.id != artists[index].id)
                            same = false;
                    });
                    if (same){
                        Utils.toast('已经是最新的内容了');
                        return;
                    }
                }

                //重新渲染列表是个很耗时的动作，如果不timeout，scroller的弹回会非常卡.
                //因此等弹回完毕后再重新渲染列表。

                $timeout(function () {
                    $scope.chartStatus.artists = artists;
                }, 200);
            });
        }

        $scope.onRefresh = fetchLatest;

        // 登录后刷新音乐人榜单“喜欢”状态
        $scope.$on('loginSuccess',function(){
            Artist.getPopulars().then(function (artists) {
                Utils.refreshAdded($scope.chartStatus.artists,artists);
            });
        });

        // timeout等待children构建好scroller。content会把scrollView放在parentScope(即当前scope)中.
        // fire tab切换事件，通知ChartCtrl刷新
        $timeout(function () {
            $scope.$emit('enterArtistChart', $scope);
        }, 200);
    })


    // 音乐人
    .controller('ArtistCtrl', function ($scope, Artist, $routeParams, User,Modal,Utils) {
        var artOfParent = $scope.artist, // artist from parent scope
            artist = $scope.artist = {
                baseInfo: null // 基本信息
                // events / updates / playlists... key是tab的name
            },
            artistId = $routeParams.artistId;

        // 基本信息
        // 大部分时候都是从artist list弹出音乐人modal的，父scope中已经有一个artist对象了
        if(artOfParent){
            artist.baseInfo = artOfParent;
        }else{
            // 其他时候必须先根据url中的id查询得到artist
            Artist.getArtistById(artistId).then(function (data) {
                artist.baseInfo = data;
            });
        }
        // 为什么不统一用第二种方式？ 为了状态同步：如通过列表进入音乐人主页，更改了喜欢状态，第一种方式可以将该状态同步到列表页，因为
        // 二者操作的是同一个artist对象；后者则麻烦很多。

        // 切换tab选项卡，加载对应列表
        $scope.$on('simpleTab.shown', function (e, tabName) {
            $scope.currentTab = tabName;

            if (artist[tabName] == null) {
                // 加载列表
                Artist['get' + tabName.substring(0, 1).toUpperCase() + tabName.substring(1)](artistId)
                    .then(function (list) {
                        artist[tabName] = list;
                    });
            }
        });

        // 留言
        var toPostComment = $scope.toPostComment = function(){
            var loggedUser = User.getCurrentUser();
            // 没有登录
            if(!loggedUser){
                Modal.fromUrl("/login",{
                    scope:$scope,
                    focusFirstInput:true,
                    animation:'my-slide-in-up'
                });
                return;
            }
            // 登录了
            // 没有关注
            if(artist.baseInfo.added == 'no'){
                Utils.toast("需要先关注才可以留言哦");
                return;
            }
            // 关注了
            Modal.fromUrl("/comment",{scope:$scope,focusFirstInput:true});
        };

        // 登录成功，刷新音乐人喜欢状态，自动弹出评论页面
        $scope.$on('loginSuccess',function(){
            Artist.getArtistById(artistId).then(function (data) {
                artist.baseInfo.added = data.added;
                toPostComment();
            });
        });

        // 发表留言成功了，强刷留言tab
        $scope.$on('addMsgSuccess',function(){
            artist.loadStatus['messages'] = 'loading';
            // 加载列表
            Artist.getMessages(artistId).then(function (list) {
                artist['messages'] = list;
                artist.loadStatus['messages'] = 'success';
            });
        });
    })

    // 播放列表
    .controller('PlaylistCtrl',function($scope,Playlist,$routeParams){
        var playlistId = $routeParams.playlistId,
            // play which song as soon as list loaded?
            playId = $routeParams.playId;
        // 偷点懒，这里不做loading效果先
        Playlist.getById(playlistId).then(function(p){
            $scope.playlist = p;
        });
        Playlist.getSongs(playlistId).then(function(l){
            $scope.songs = l;
            // 找到请求播放的歌曲的index
            var playIndex = playId?findPlayIndex(l,playId):0;
            // play song
            $scope.$emit('player.reset',l,playIndex || 0);

            function findPlayIndex(list,songId){
                var i;
                angular.forEach(list,function(obj,index){
                    if(obj.id == songId)
                        i = index;
                });
                return i;
            }
        })
    })

    // login
    .controller('LoginCtrl',function($scope,User,Utils){
        $scope.user = {};
        $scope.submit = function(){
            User.login($scope.user).then(function(){
                $scope.$emit('modals.pop');
                $scope.$emit('loginSuccess');   // login success event
            },function(msg){
                Utils.toast(msg);
            });
        };
    })

    // 对音乐人发表评论
    .controller('CommentCtrl',function($scope,User,Utils){
        // TODO 提交后disable submit button，防止重复提交
        // 实现方式：directive 'disableWhenSubmit', require 'form' directive。
        // 首先找到submit button，为其加上图标子元素；
        // 扩展FormController,加上一个属性$submitting，watch之,true,找到type='button'，加上css 'submitting'；否则remove掉css。
        // 用户代码中，必须在提交前设置$status；完成后恢复之

        $scope.postComment = function(){
            $scope.commentForm.$submitting = false;
            User.postComment($scope.artist.baseInfo.id,$scope.comment).then(function(){
                $scope.$emit('modals.pop');
                $scope.$emit('addMsgSuccess');
            },function(msg){
                Utils.toast(msg);
            },function(){
                // TODO 不确定
                $scope.commentForm.$submitting = false;
            });
        };
    })


    // search
    .controller('SearchCtrl', function ($scope,Modal,Genre) {
        var searchStatus = $scope.searchStatus = {
            q:'',   // search keyword
            genres:null,  // all genres
            types:[{
                id:'dj',
                name:'DJ'
            },{
                id:'artist',
                name:'厂牌'
            }], // all types
            tags:null // all tags
        };

        $scope.search = function(){
            if(!searchStatus.q)
                return;
            Modal.fromUrl("/search-result/" + encodeURIComponent(searchStatus.q),{
                scope:$scope
            });
        };

        $scope.encodeURIComponent = window.encodeURIComponent;

        Genre.getTags().then(function(list){searchStatus.tags = list;});
        Genre.getGenres().then(function(list){searchStatus.genres = list;});
    })

    .controller('SearchResultCtrl',function($scope,Artist,Modal,$routeParams,Utils){
        var resultStatus = $scope.resultStatus = {
            q:'',
            artists:null,
            lastQ:''
        };
        resultStatus.q = decodeURIComponent($routeParams.q);
        $scope.search = function(){
            resultStatus.lastQ = resultStatus.q;
            Artist.search(resultStatus.q).then(function(artists){
                resultStatus.artists = artists;
                $scope.scrollView.scrollTo(0,0,true);
            });
        };
        $scope.search();

        // 登录后刷新“喜欢”状态
//        $scope.$on('loginSuccess',function(){
//            Artist.search(resultStatus.lastQ).then(function(artists){
//                Utils.refreshAdded(resultStatus.artists,artists);
//            });
//        });
    })


    // search artist by genre / type /tag
    .controller('ByCategoryCtrl',function($scope,Artist,Genre,Modal,$routeParams){
        // genre/type/tag没有getById的API，因此重用父scope(SearchCtrl的ng-repeat)中的obj
        var by = $scope.by = $routeParams.by,
            category = $scope.category = $scope[by]; // category may be: genre/type/tag

        angular.extend(category,{
            sortby:'hot',
            artists:null,
            pageNo:0,
            totalPage:-1
        });
        
        $scope.more = function(){
            category.pageNo++;
            var p;
            switch(by){
                case 'genre':
                    var genre = category;
                    p = Artist.getByGenre(genre.id,genre.sortby,genre.pageNo);
                    break;
                case 'type':
                    var type = category;
                    p = Artist.getByType(type.id,type.sortby,type.pageNo);
                    break;
                case 'tag':
                    var tag = category;
                    p = Artist.getByTag(tag.url,tag.sortby,tag.pageNo);
                    break;
            };
            p.then(function(page){
                category.artists = category.artists ? category.artists.concat(page.artists):page.artists;
                category.totalPage = page.totalPage;
            });
            return p;
        };

        $scope.more();

        $scope.$on('sortSwitch.changed',function(e,sortby){
            category.sortby = sortby;
            // reload
            category.artists = null;
            category.pageNo = 0;
            category.totalPage = -1;
            $scope.more().then(function(){
                $scope.scrollView.scrollTo(0,0,true);
            });
        });
    })

    /*mine*/
    .controller('MineCtrl',function($scope,User,$timeout,$location){
        var mine = $scope.mine={
            song:null,
            event:null,
            photo:null,
            currentTab:'',
            pageInfo:{
                song:{pageNo:0,totalPage:-1},
                event:{pageNo:0,totalPage:-1},
                photo:{pageNo:0,totalPage:-1}
            },
            scrollers:{
                // song event photo
            }
        };
        $scope.tabs = [
            {
                name:'song',
                showName:'曲库',
                icon:'fa fa-music'
            },
            {
                name:'event',
                showName:'活动',
                icon:'fa fa-calendar-o'
            },
            {
                name:'photo',
                showName:'照片',
                icon:'fa fa-picture-o'
            }
        ];
        $scope.$on('registerScroller',function(e,tabName,scroller){
            mine.scrollers[tabName] = scroller;
        });
        $scope.$on('simpleTab.shown', function (e, tabName) {
            mine.currentTab = tabName;
            if (mine[tabName] == null) {
                $timeout(function(){
                    mine.scrollers[mine.currentTab].triggerPullToRefresh();
                },200);
            }
        });
        $scope.onRefresh = function(){
            var pageInfo = mine.pageInfo[mine.currentTab];
            // reload
            mine[mine.currentTab] = null;
            pageInfo.pageNo = 0;
            pageInfo.totalPage = -1;
            $scope.more().then(function(){
                mine.scrollers[mine.currentTab].finishPullToRefresh();
            });
        };
        $scope.more = function(){
            var pageInfo = mine.pageInfo[mine.currentTab];
            pageInfo.pageNo++;
            var p = User['getMine' + mine.currentTab.substring(0, 1).toUpperCase() + mine.currentTab.substring(1)](pageInfo.pageNo);
            p.then(function(page){
                mine[mine.currentTab] = mine[mine.currentTab] ? mine[mine.currentTab].concat(page.updates):page.updates;
                pageInfo.totalPage = page.totalPage;
            });
            return p;
        };
        $scope.myArtistBtn = [{
            type:'button-positive button-text',
            content:'列表',
            tap:function(e){
                $location.path('/my-artist');
            }
        }];
        $scope.User = User;
    })

    .controller('MyArtistCtrl',function($scope,User,$timeout,$location){
        var myArtist = $scope.myArtist = {
            artists:null,
            pageNo:0,
            totalPage:-1
        };
        $scope.more = function(){
            myArtist.pageNo++;
            var p = User.getMyArtist(myArtist.pageNo);
            p.then(function(page){
                myArtist.artists = myArtist.artists ? myArtist.artists.concat(page.artists):page.artists;
                myArtist.totalPage = page.totalPage;
            });
            return p;
        };
        // 已登陆
        if(User.getCurrentUser()){
            $scope.more();
            $scope.mineBtn = [{
                type:'button-positive button-text',
                content:'动态',
                tap:function(e){
                    $location.path('/mine');
                }
            }];
        }else{
            // 未登陆
            $scope.$on('loginSuccess',function(){
                $scope.more();
                $scope.mineBtn = [{
                    type:'button-positive button-text',
                    content:'动态',
                    tap:function(e){
                        $location.path('/mine');
                    }
                }];
            });
        }
    })
;
