angular.module('starter.services', [])

    .factory('User', function (JsonpAdapter, $q,$http) {
        var msg = {
            'no_alias' : '帐号不能为空',
            'email_invalid' : '邮箱格式不正确',
            'email_provider_in_blacklist' : '该邮箱后缀暂时不能注册豆瓣帐号',
            'email_exists' : '该邮箱已被占用了',
            'mobile_invalid' : '手机格式不正确',
            'mobile_exists' : '该手机已注册过了',
            'user_domain_invalid' : '个性域名格式不正确',
            'user_domain_exists' : '该个性域名已被占用',
            'wrong_reg_type' : '错误的帐号类型',
            'captcha_incorrect' : '验证码不正确',
            'no_such_user' : '该用户不存在',
            'wrong_email' : '该用户不存在',
            'wrong_password' : '帐号和密码不匹配',
            'user_suicide' : '该用户已主动注销',
            'user_banned' : '该用户被封禁',
            'no_password' : '密码不能为空',
            'adduser_fail' : '注册用户失败',
            'verify_code_incorrect' : '激活码不正确',
            'no_confirm_code' : '激活码不正确',
            'password_too_short' : '密码太短了',
            'password_too_long' : '密码太长了',
            'unknown' : '未知原因',
            'banned_by_site' : '被小站封禁了',
            'liked_too_many' : '已经关注了太多小站'
        }

        function errMsg(err) {
            return msg[err] || err;
        }

        // constants
        var USER_KEY = 'DOUBI_USER';

        // Class
        var User = function (data) {
            angular.extend(this, data);
        };

        // static var

        // static methods
        User.getCurrentUser = function () {
            var userStr = window.localStorage[USER_KEY];
            if (!userStr)
                return null;
            return new User(JSON.parse(userStr));
        };

        /**
         *
         * @param {email,password}
         * @returns promise
         */
        User.login = function (user) {
            var deferred = $q.defer();
            JsonpAdapter.request("/login", user).then(function (data) {
                if(data['err'] != 'ok'){
                    deferred.reject(errMsg(data['err']));
                    return;
                }
                delete data.err;
                var loginedUser = new User(data);
                loginedUser.store();
                deferred.resolve(loginedUser);
                // avatar
                $http.get('http://api.douban.com/v2/user/'+String(loginedUser.user_id)).success(function(u){
                   /*
                   * u:
                   {
                    "loc_id": "108288",
                    "name": "阿北",
                    "created": "2006-01-09 21:12:47",
                    "is_banned": false,
                    "is_suicide": false,
                    "loc_name": "北京",
                    "avatar": "http://img3.douban.com/icon/u1000001-30.jpg",
                    "signature": "轻若片羽",
                    "uid": "ahbei",
                    "alt": "http://www.douban.com/people/ahbei/",
                    "desc": "",
                    "type": "user",
                    "id": "1000001",
                    "large_avatar": "http://img3.douban.com/icon/up1000001-30.jpg"
                   }
                   */
                    angular.extend(loginedUser,u);
                    loginedUser.store();
                });
            });
            return deferred.promise;
        };

        User.logout = function () {
            delete window.localStorage[USER_KEY];
            JsonpAdapter.flushCache();
        };

        User.postComment = function(artistId,comment){
            var deferred = $q.defer();
            JsonpAdapter.request("/add_message", {id:artistId,text:comment},true).then(function (data) {
                if(data['error'] != 'ok'){
                    deferred.reject(errMsg(data['err']));
                    return;
                }
                deferred.resolve();
            });
            return deferred.promise;
        }

        User.likeArtist = function(artist,action){
            var deferred = $q.defer();
            JsonpAdapter.request("/like_artist", {id:artist.id,action:action},true).then(function (data) {
                if(data['error']){
                    deferred.reject(errMsg(data['error']));
                    return;
                }
                artist.added = data['like'];
                artist.follower += (action == 'like'?1:-1);
                deferred.resolve();
            });
            return deferred.promise;
        }

        /* 我喜欢的音乐人 updates */
        User.getMineSong = function(pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/mine", {
                'kind': 'song',
                'page':pageNo}, true).then(function (data) {
                    deferred.resolve({
                        'totalPage':data.total_page,
                        'updates':data.updates
                    });
                });
            return deferred.promise;
        }
        User.getMineEvent = function(pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/mine", {
                'kind': 'event',
                'page':pageNo},true).then(function (data) {
                    deferred.resolve({
                        'totalPage':data.total_page,
                        'updates':data.updates
                    });
                });
            return deferred.promise;
        }
        User.getMinePhoto = function(pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/mine", {
                'kind': 'photo',
                'page':pageNo},true).then(function (data) {
                    deferred.resolve({
                        'totalPage':data.total_page,
                        'updates':data.updates
                    });
                });
            return deferred.promise;
        };
        User.getMyArtist = function(pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/my_artists", {'page':pageNo},true).then(function (data) {
                    deferred.resolve({
                        'totalPage':data.total_page,
                        'artists':data.artists
                    });
                });
            return deferred.promise;
        };
        // instance methods
        User.prototype.store = function () {
            window.localStorage[USER_KEY] = JSON.stringify(this);
        };

        return User;
    })

    .factory('JsonpAdapter', function ($q, DOUBAN_CONSTANTS,$injector) {
        // jsonp请求产生的defer，key是一个随机数
        var jsonpDeferred = {};
        $.setp = function (key) {
            return function (data) {
                var deferred = jsonpDeferred[key];
                deferred.resolve(data);
                // 是否需要缓存结果？
                if(deferred.shouldCache){
                    data.__t = (new Date()).getTime();
                    cache[deferred.cacheKey] = data;
                }
                delete jsonpDeferred[key];
                delete promiseInProcess[deferred.cacheKey]; // 表明promise已经处理完毕
            }
        };
        var cache = {};
        var promiseInProcess = {}; // 已经发出的，但还没拿到结果的请求
        var CACHE_EXPIRE = 60000 * 5;
        function getURL(path,data,key){
            // 设置好jsonp调用的参数。
            angular.extend(data, {
                cb: '$.setp(' + key + ')',
                app_name: DOUBAN_CONSTANTS.APPNAME,
                version: DOUBAN_CONSTANTS.VERSION
            });

            // 如果登录了，还要传user信息。
            var curUser = $injector.get('User').getCurrentUser();
            curUser && angular.extend(data,{
                'user_id':curUser.user_id,
                'token':curUser.token,
                'expire':curUser.expire
            });

            return DOUBAN_CONSTANTS.API + path + (path.indexOf('?') == -1 ? '?' : '&') + $.param(data);
        }
        return {
            request: function (path, data,noCache) {
                data = data ? data : {};
                var cacheKey = path + "::" + $.param(data);
                // 请求已发出，但未收到数据？
                if(promiseInProcess[cacheKey])
                    return promiseInProcess[cacheKey];

                var key = Math.random(),
                    deferred = $q.defer(),
                    promise = deferred.promise,
                    url = getURL(path,data,key),
                    cacheItem = cache[cacheKey];

                jsonpDeferred[key] = deferred;

                // 这个请求是否需要缓存？
                deferred.shouldCache = !noCache;
                deferred.cacheKey = cacheKey;

                // 如果经过缓存，且缓存过，且没过期：直接用缓存resolve deferred
                if(!noCache && cacheItem && (new Date()).getTime() - cacheItem.__t < CACHE_EXPIRE){
                    var deferred = jsonpDeferred[key];
                    deferred.resolve(cacheItem);
                    delete jsonpDeferred[key];
                    return promise;
                }

                // 缓存过期或没有缓存过：
                delete cache[cacheKey];
                $.getScript(url);

                // 将该promise暂存，如果立刻发起第二次请求，返回的将是这个对象。
                promiseInProcess[cacheKey] = promise;

                return promise;
            },
            flushCache:function(){
                cache = {};
            }
        };
    })
    .factory('Utils', function ($rootScope) {
        var utils = {
            // notification
            alert: function(str, title) {
                title = title || "豆瓣音乐人";
                    navigator.notification.alert(str,function(){}, title, "确定");
            },
            confirm: function(str, config, cb) {
                if (typeof config == 'function') {
                    cb = config;
                    config = {};
                }
                var title = config['title'] || '豆瓣音乐人',
                    choice = config['choice'] || '确定,取消';
                    navigator.notification.confirm(str, cb, title, choice);
            },
            // toast notification todo phonegap plugin?
            toast: function(msg){
                $rootScope.$emit('toast.show',msg);
            },

            listToEntity: function (list, constructor) {
                var r = [];
                angular.forEach(list, function (obj) {
                    r.push(new constructor(obj));
                });
                return r;
            },
            refreshAdded:function(old,neww){
                var likeIds = [];
                angular.forEach(neww, function (value, index) {
                    if(value.added == 'yes'){
                        likeIds.push(value.id);
                    }
                });
                angular.forEach(old, function (value, index) {
                    if(likeIds.indexOf(value.id)>=0){
                        value.added = 'yes';
                    }
                });
            }
        };
        utils.confirm.OK = 1;
        utils.confirm.CANCEL = 2;
        return utils;
    })
    .factory('Song', function (JsonpAdapter, $q, Utils) {
        // Class
        var Song = function (data) {
            angular.extend(this, data);
        };

        // static var

        // static methods
        /**
         * 排行榜
         *  format:
         {
             $$hashKey: "00V"
             artist: "绿色音符"
             artist_id: "152402"
             count: 28843
             id: "438469"
             length: "3:51"
             name: "阳台上的花"
             picture: "http://img3.douban.com/view/site/median/public/1265ce4361c1f0c.jpg"
             rank: 1
             src: "http://mr3.douban.com/201401062011/5c97b57d7c10c645f66e86db723ec753/view/musicianmp3/mp3/x15435089.mp3"
             widget_id: "15373095"
         }
         * @returns {*}
         */
        Song.getPopulars = function () {
            var deferred = $q.defer();
            JsonpAdapter.request("/chart",{type:'song'},true).then(function (data) {
                deferred.resolve(Utils.listToEntity(data.songs, Song));
            });
            return deferred.promise;
        };

        return Song;
    })

    .factory('Artist', function (JsonpAdapter, $q, Utils,Playlist) {
        // Class
        var Artist = function (data) {
            angular.extend(this, data);
        };

        // static var

        // static methods
        /**
         * 排行榜
         *  format:
         {
            $$hashKey: "03A"
            added: "no"
            follower: 56095
            id: "165402"
            member: "成员: "
            name: "大乔小乔"
            picture: "http://img3.douban.com/view/site/median/public/5d78d8a9f7cee99.jpg"
            rank: 1
            style: "流派: 民谣 Folk"
            type: "artist"
         }
         * @returns {*}  promise
         */
        Artist.getPopulars = function () {
            var deferred = $q.defer();
            JsonpAdapter.request("/chart",{type:'artist'},true).then(function (data) {
                deferred.resolve(Utils.listToEntity(data.artists, Artist));
            });
            return deferred.promise;
        };

        /**
         * {cover,id,title}
         * */
        Artist.getAlbums = function (artistId) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_album",{id:artistId}).then(function (data) {
                deferred.resolve(data.albums);
            });
            return deferred.promise;
        };

        /**
         * {id,title}
         */
        Artist.getPlaylist = function (artistId) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_playlist", {id: artistId}).then(function (data) {
                deferred.resolve(Utils.listToEntity(data.playlist, Playlist));
            });
            return deferred.promise;
        };


        Artist.getEvents = function (artistId) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_event", {id: artistId}).then(function (data) {
                deferred.resolve(data.events);
            });
            return deferred.promise;
        };

        /**
         *
         * {
              "picture": "http://img3.douban.com/view/site/median/public/b985c473e841f92.jpg",
              "style": "流派: 摇滚 Rock",
              "added": "no",
              "name": "旅行団",
              "member": "成员: ",
              "follower": 29884,
              "updates": [
                {
                  "kind": "song",
                  "artist_img": "http://img3.douban.com/view/site/median/public/b985c473e841f92.jpg",
                  "artist": "旅行団",
                  "title": "天后舞厅",
                  "song_id": "448407",
                  "time": "2014-01-09 12:22:28",
                  "widget_id": "10220174"   // playlist id
                },
                {
                  "kind": "event",
                  "artist_img": "http://img3.douban.com/view/site/median/public/b985c473e841f92.jpg",
                  "artist": "旅行団",
                  "url": "http://www.douban.com/event/20652645/",
                  "abstract": "2014-02-14 20:30:00\n东大街菊花园饮马池 正信智能大厦 负一层",
                  "title": "2.14-情人节特献：旅行团乐队新EP《于是我不再唱歌》全国巡演西安站",
                  "time": "2014-01-07 05:07:24",
                  "icon": "http://img3.douban.com/view/event_poster/small/public/e61a745be4f90b6.jpg"
                },
                {
                  "kind": "note",
                  "artist_img": "http://img3.douban.com/view/site/median/public/b985c473e841f92.jpg",
                  "artist": "旅行団",
                  "url": "http://site.douban.com/thelifejourney/widget/notes/376894/note/322794186/",
                  "abstract": "【在线购买】 这是旅行团成立至今最温情的一张唱片。EP包含5首歌曲，其中的三首《B...",
                  "title": "旅行团全新EP《于是我不再唱歌》现已上...",
                  "time": "2013-12-24 04:06:07"
                }
              ],
              "type": "artist",
              "id": "100058"
            }
         *
         *
         */
        Artist.getUpdates = function (artistId) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_update", {id: artistId}).then(function (data) {
                deferred.resolve(data.updates);
            });
            return deferred.promise;
        };

        /**{content,author,time,icon}*/
        Artist.getMessages = function (artistId) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_board", {id: artistId}).then(function (data) {
                deferred.resolve(data.messages);
            });
            return deferred.promise;
        };

        /**
         * {
         *  picture:
         * "added":"no",
         * "name":"红花会 Padma Family",
         * "style":"流派: 说唱 Rap",
         * "member":"成员: ",
         * "follower":5959,
         * "type":"artist",
         * "id":"144637"
         * }
         **/
        Artist.getArtistById = function (id) {
            var deferred = $q.defer();
            JsonpAdapter.request("/artist_playlist", {id: id}).then(function (data) {
                delete data.playlist;
                deferred.resolve(new Artist(data));
            });
            return deferred.promise;
        };

        Artist.search = function(keyword){
            var deferred = $q.defer();
            JsonpAdapter.request("/search", {q: keyword}).then(function (data) {
                deferred.resolve(Utils.listToEntity(data.artists,Artist));
            });
            return deferred.promise;
        };

        /**
        sortby: new / hot

        {
        "genre_name": "流行", 
        "gid": "6", 
        "type": "artist", 
        "total_page": 173, 
        "artists": []
        }

        return:
        {
          totalPage:
          artists:
        }
        */
        Artist.getByGenre = function(genreId,sortby,pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/genre", {
              'gid': genreId,
              'page':pageNo,
              'sortby':sortby}).then(function (data) {
                deferred.resolve({
                  'totalPage':data.total_page,
                  'artists':Utils.listToEntity(data.artists,Artist)
                });
            });
            return deferred.promise;
        };
        Artist.getByType = function(type,sortby,pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/genre", {
              'gid': '*',
              'type':'type',
              'page':pageNo,
              'sortby':sortby}).then(function (data) {
                deferred.resolve({
                  'totalPage':data.total_page,
                  'artists':Utils.listToEntity(data.artists,Artist)
                });
            });
            return deferred.promise;
        };
        Artist.getByTag = function(tag,sortby,pageNo){
            var deferred = $q.defer();
            JsonpAdapter.request("/tag", {
              'name': tag,
              'page':pageNo,
              'sortby':sortby}).then(function (data) {
                deferred.resolve({
                  'totalPage':data.total_page,
                  'artists':Utils.listToEntity(data.artists,Artist)
                });
            });
            return deferred.promise;
        };


        // instance methods

        return Artist;
    })

    .factory('Playlist', function (JsonpAdapter, $q, Utils,Song) {
        var Playlist = function (data) {
            angular.extend(this, data);
        };

        Playlist.getById = function(id){
            var deferred = $q.defer();
            JsonpAdapter.request("/songs", {id: id}).then(function (data) {
                deferred.resolve(new Playlist(data.playlist));
            });
            return deferred.promise;
        };

        /**
         * {
              "playlist": {
                "name": "新歌儿",
                "id": "15495820"
              },
              "artist_id": "100856",
              "artist_name": "万晓利",
              "songs": [
                {
                  "count": 27627,
                  "picture": "http:\/\/img3.douban.com\/view\/site\/median\/public\/9a5e0ecef175657.jpg",
                  "length": "6:33",
                  "name": "老狗",
                  "artist": "万晓利",
                  "artist_id": "100856",
                  "src": "http:\/\/mr3.douban.com\/201401101548\/fbd843e59d9ce5e7ce4efcd649cd0ad9\/view\/musicianmp3\/mp3\/x15449585.mp3",
                  "widget_id": "15495820",
                  "id": "439655"
                }
              ]
            }
         */
        Playlist.getSongs = function(id){
            var deferred = $q.defer();
            JsonpAdapter.request("/songs", {id: id}).then(function (data) {
                deferred.resolve(Utils.listToEntity(data.songs, Song));
            });
            return deferred.promise;
        }

        return Playlist;
    })

    .factory('Genre', function (JsonpAdapter, $q, Utils) {
        var Genre = function (data) {
            angular.extend(this, data);
        };

        /**
        Search artist api: /artist/search/q=xxx
        format:
          {
            "q": "xxx",                           // search keyword
            "total": 33,                          // result size
            "genrelist": [['id','name']],         // all genres
            "tags": [{url:'',name:'',size:3}],    // all tags
            "artists": [{                         // search result
              "member": "成员: ", 
              "picture": "http://img3.douban.com/view/site/median/public/47d79d71acddd43.jpg", 
              "style": "流派: 原声 Soundtrack", 
              "added": "no", 
              "name": "rock不是摇滚，只是石头", 
              "follower": 10, 
              "type": "artist", 
              "id": "209578"
            }...]
          }
        */

        Genre.getTags = function(){
            var deferred = $q.defer();
            JsonpAdapter.request("/search", {q: ''}).then(function (data) {
                deferred.resolve(data.tags);
            });
            return deferred.promise;
        };

        Genre.getGenres = function(){
            var deferred = $q.defer();
            JsonpAdapter.request("/search", {q: ''}).then(function (data) {
                var list = [];
                angular.forEach(data.genrelist,function(g){
                  list.push({
                    id:g[0],
                    name:g[1]
                  })
                });
                deferred.resolve(list);
            });
            return deferred.promise;
        };
        return Genre;
    })
;
