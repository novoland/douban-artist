var rHOME = '^#*$',
    rCHART = '#chart(?:\/*)([^\/]*)(?:\/*)(.*)',
    rGENRE = '#genre\/([^\/]*)(?:\/*)([^\/]*)(?:\/*)(.*)',
    rTAG = '#tag\/([^\/]*)(?:\/*)([^\/]*)(?:\/*)(.*)',
    rARTIST = '#artist\/(.*)',
    rART_PLAYLIST = '#artist_playlist\/(.*)',
    rSONGS = '#songs\/([^\/]*)(?:\/*)(.*)',
    rART_ALBUM = '#artist_album\/(.*)',
    rART_BOARD = '#artist_board\/(.*)',
    rART_EVENT = '#artist_event\/(.*)',
    rART_UPDATE = '#artist_update\/(.*)',
    rPHOTOS = '#photos\/([^\/]*)(?:\/*)(.*)',
    rPHOTOS_THUMB = '#photos_thumb\/(.*)',
    rEXT_LINK = '#http(?:%3A|\:).*',
    rSEARCH = '#search(?:\/*)(.*)',
    rLABELS = '#labels',
    rDJS = '#djs',
    rLOGIN = '#login',
    rREGISTER = '#register',
    rSETTINGS = '#settings',
    rABOUT = '#about',
    rAPPS = '#apps',
    rMINE = '#mine(?:\/*)(.*)',
    rMY_ARTISTS = '#my_artists';

var onDeviceReady = function(){
    tr('ver:', DA_VER);
    check_connection();
    document.addEventListener("online", function(){
        tr('online!');
        Router.check_url();
    }, false);

    document.addEventListener("offline", function(){
        do_alert('请连接网络', '没有网络连接');
    }, false);

    if (isIDevice) {
        var userId = window.localStorage.getItem('user_id'),
            userName = window.localStorage.getItem('user_name'),
            token = window.localStorage.getItem('token'),
            expire = window.localStorage.getItem('expire');

        plugins.SocialSharing.setupAccount(userId, userName, token, expire);

        if (userId) {
            plugins.pushNotification.registerDevice({
                alert: true,
                badge: true,
                sound: true
            }, function(status) {
                $.post(API + '/register_device', {
                    device_token: status.deviceToken,
                    uid: userId,
                    app_name: APPNAME,
                    version: VERSION
                });
            });
        }

        handleRemoteNotification();
    }

    if (isAndroid) {
        document.addEventListener('backbutton', function(){
            if ($('#bottom_menu').length) {
                hide_menu();

            } else if ($('.back_link').length) {
                var href = $('.back_link')[0].href;
                if (/^javascript:/.test(href)) {
                    eval(decodeURIComponent(
                        href.split('javascript:')[1])
                    );
                } else {
                    window.location = href;
                }

            } else if (location.hash == '#login') {
                close_login();
            } else {
                exit_app();
            }
        })

        document.addEventListener("menubutton", function(){
            if ($('#bottom_menu').length) {
                hide_menu();
            } else {
                show_menu();
            }
        }, false);

        document.addEventListener("searchbutton", function(){
            if ($('.close_link').length) {
                Router.url_before_login = '#search';
                close_login();
            } else {
                location.hash = '#search';
            }
        }, false);

        document.addEventListener("startcallbutton", function(){
            var btn = $('#pause_btn');
            if (btn.is(':visible') && btn.hasClass('pause_btn')){
                player.pause();
            }
        }, false);
    }

    Router.set_routes([
        [rHOME, chartPage],
        [rCHART, chartPage],
        [rGENRE, genrePage],
        [rTAG, tagPage],
        [rARTIST, artistPage],
        [rART_PLAYLIST, artistPlayListPage],
        [rART_BOARD, artistBoardPage],
        [rART_EVENT, artistEventPage],
        [rART_ALBUM, artistAlbumPage],
        [rART_UPDATE, artistUpdatePage],
        [rPHOTOS, photosPage],
        [rPHOTOS_THUMB, photosThumbPage],
        [rEXT_LINK, extLinkHandler],
        [rSONGS, songsPage],
        [rSEARCH, searchPage],
        [rLABELS, genrePage],
        [rDJS, genrePage],
        [rMINE, minePage],
        [rMY_ARTISTS, myArtistsPage],
        [rLOGIN, loginPage],
        [rREGISTER, registerPage],
        [rSETTINGS, settingsPage],
        [rABOUT, aboutPage],
        [rAPPS, appsPage]
    ]);

    Router.set_position([
        [rCHART, {leftOf: [rARTIST, rART_PLAYLIST, rART_ALBUM, rART_BOARD, rART_EVENT, rART_UPDATE], above: [rLOGIN]}],
        [rARTIST, {rightOf: [rHOME, rCHART, rGENRE, rLABELS, rDJS, rMY_ARTISTS], leftOf: [rSONGS, rPHOTOS_THUMB], above: [rLOGIN]}],
        [rGENRE, {leftOf: [rARTIST, rART_PLAYLIST, rART_ALBUM, rART_BOARD, rART_EVENT, rART_UPDATE], rightOf: [rSEARCH]}],
        [rSONGS, {rightOf: [rARTIST, rART_PLAYLIST], above: [rLOGIN]}],
        [rPHOTOS_THUMB, {rightOf: [rART_ALBUM], leftOf: [rPHOTOS]}],
        [rPHOTOS, {rightOf: [rPHOTOS_THUMB]}],
        [rART_ALBUM, {leftOf: [rPHOTOS_THUMB, rPHOTOS]}],
        [rSEARCH, {leftOf: [rARTIST, rGENRE]}],
        [rLOGIN, {leftOf: [rREGISTER], below: [rSETTINGS, rMINE, rCHART, rARTIST, rSONGS]}],
        [rSETTINGS, {leftOf: [rAPPS, rABOUT], below: [rMINE], above: [rLOGIN]}],
        [rREGISTER, {rightOf: [rLOGIN, rMINE]}],
        [rMINE, {leftOf: [rREGISTER], above: [rSETTINGS, rLOGIN]}],
        [rMY_ARTISTS, {leftOf: [rARTIST, rART_PLAYLIST, rART_ALBUM, rART_BOARD, rART_EVENT, rART_UPDATE]}],
        [rAPPS, {rightOf: [rSETTINGS]}],
        [rABOUT, {rightOf: [rSETTINGS]}]
    ]);

    Router.set_ignore("^#http(:?%3A|\:)");

    window.artist_iscroll = null;

    var tojump = false,
    ondown = function(e){ tojump = true;},
    onmove = function(){ if(tojump){
        tojump = false;
    }},

    onup = function(){ if(tojump) {
        tojump = false;
        var hash = $(this).attr('rel');
        if (!$(this).hasClass('no_hl')) $(this).addClass('hl');
        if (hash) location.hash = hash;
    }},
    hasTouch = 'ontouchstart' in window,
    START_EV = hasTouch ? 'touchstart' : 'mousedown',
    MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
    END_EV = hasTouch ? 'touchend' : 'mouseup',
    CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup';

    /*
    $('.link').live(START_EV, ondown)
                .live(END_EV, onup)
                .live(CANCEL_EV, onup)
    */
    $(document).on(START_EV, '.link', ondown)
               .on(END_EV, '.link', onup)
               .on(CANCEL_EV, '.link', onup);

    document.addEventListener(MOVE_EV, onmove, false);

    $(document).ajaxStart(function(){
        $('.loading').show();
    }).bind("ajaxComplete", function(){
        $('.loading').hide();
    }).bind("check_url", function() {
        if(isAndroid) {
            plugins.SoftKeyBoard.hide();
        }
    })

    //$('.like_btn').live(END_EV, like_artist);
    $(document).on(END_EV, '.like_btn', like_artist);
    $(document).on(END_EV, '.share_artist', function(e) {
        var $target = $(e.target),
            aid = $target.data('id'),
            title = $target.data('title'),
            link = $target.data('link'),
            cover = $target.data('cover');

        plugins.SocialSharing.shareArtist(aid, title, link, cover, function() {
            Router.url_before_login = location.hash;
            Router.url_require_login = location.hash;
            location.hash = '#login';
        });
    });

    player.init($('#audio')[0]);
    Router.check_url();
};

var onResume = function() {
    handleRemoteNotification();
};

function handleRemoteNotification() {
    plugins.pushNotification.getPendingNotifications(function(notifications) {
        notifications = notifications.notifications;
        if (notifications.length > 0) {
            var notification = notifications[0]['UIApplicationLaunchOptionsRemoteNotificationKey'];
            if (notification === undefined) {
                notification = notifications[0];
            }
            var notiType = notification.type;
            if (notiType === undefined) {
                location.hash = '#mine/song';
            } else if (notiType & NOTI_TYPE_PUB_EVENTS > 0) {
                location.hash = '#mine/event';
            } else if (notiType & NOTI_TYPE_UPLOAD_SONGS > 0) {
                location.hash = '#mine/song';
            }
        }
    });

    plugins.pushNotification.cancelAllLocalNotifications();
}

function type_text(type){
    return type == 'dj'? 'DJ':
           type == 'label'? '厂牌':
           type == 'artist'? '音乐人': '';
}

if (isAndroid) {
    function exit_app() {
        do_confirm("退出豆瓣音乐人?", function(choice){
            if (choice == do_confirm.OK){
                window.plugins.statusBarNotification.cancel();
                navigator.app.exitApp();
            }
        })
    }
    function show_menu() {
        if ($('#bottom_menu').length) return;
        $('#footer').after($.tmpl('#tmpl_bottom_menu'));
        var menu = $('#bottom_menu'),
            h = menu.height();
        menu.css('bottom', -h)
            .css('visibility', 'visible')
            .data('busy_moving', true)
            .imove(0, -h, 200, function(){
                menu.data('busy_moving', false)
            })
    }

    $(document).bind('touching', function(e, touch_ev){
        if (!$('#bottom_menu').has(touch_ev.target).length) {
            hide_menu();
        }
    })

    function hide_menu() {
        var menu = $('#bottom_menu');
        if (!menu.length || menu.data('busy_moving')) {
            return;
        }
        menu.data('busy_moving', true)
            .imove(0, menu.height() + 9, 200, function(){
                menu.remove();
            });
    }
}

function loginPage(){
    var html = $.tmpl('#tmpl_login');
    slide_in(html, rLOGIN, '.frame', function(){
        $('#content').css('z-index', 2).css('bottom',0);
        $('.frame').height($('#content').height());
        new iScroll('wrapper_login', {onBeforeScrollStart: null});
        var f = function(){
            var paras = { username: $('#username').val(),
                          password: $('#password').val()};
            if (!paras.username || !paras.password) {
                $('#err_info').html('用户名和密码不能为空').slideDown();
                return;
            }

            if (/[^@]+@[^@]+\.[^@]+/.test(paras.username)) {
                paras.email = paras.username;
                delete paras.username;
            }
            $.getp(SAPI + '/login', paras, function(o){
                if (o['err'] != 'ok') {
                    $('#err_info').html(err_msg(o.err) || '错误').slideDown();
                } else {
                    window.localStorage.setItem('user_id', o['user_id']);
                    window.localStorage.setItem('user_name', o['user_name']);
                    window.localStorage.setItem('token', o['token']);
                    window.localStorage.setItem('expire', o['expire']);
                    window.user = o['user_name'];
                    $.flush_cache();
                    close_login(true, function() {
                        plugins.SocialSharing.setupAccount(o['user_id'], o['user_name'], o['token'], o['expire']);
                        plugins.pushNotification.registerDevice({
                            alert: true,
                            badge: true,
                            sound: true
                        }, function(status) {
                            $.post(API + '/register_device', {
                                device_token: status.deviceToken,
                                uid: o['user_id'],
                                app_name: APPNAME,
                                version: VERSION
                            });
                        });
                    });
                }
            });
            return false;
        }
        $('#submit').one('click', f);
    });
}

function registerPage(){
    $.getp(API + '/register', true, function(o) {
        var html = $.tmpl('#tmpl_register', o);
        slide_in(html, rREGISTER, '.frame', function(){
            var f = function() {
                var paras = {
                    email: $('#email').val(),
                    password: $('#password').val(),
                    name: $('#nick').val(),
                    cap_id: $('#cap_id').val(),
                    cap_solution: $('#cap_solution').val(),
                    form_agreement: $('#agree').is(':checked')
                },
                error = null;
                if (!paras['email']){
                    error = '请输入邮箱';
                } else if (!paras['name']) {
                    error = '请为自己起一个名号';
                } else if (!paras['password']) {
                    error = '请输入密码';
                } else if (!paras['cap_solution']) {
                    error = '请输入验证码';
                } else if (!$('#agree').is(':checked')){
                    error = '请阅读并同意豆瓣的使用协议';
                }

                if (error) {
                    $('#err_info').html(error).slideDown();
                } else {
                    paras.act = 'do_reg';
                    $.getp(SAPI + '/register', paras, function(o){
                        if (o.error == 'ok') {
                            do_confirm('你的注册信息已提交，一封验证邮件已经'+
                                '发送到你的邮箱，验证后你将可以用该账号登录。'+
                                '是否前往邮箱检查邮件？',
                            {'title': '注册成功', 'choice': '是,否'},
                            function(choice){
                                if (choice == do_confirm.OK){
                                    setTimeout(function(){
                                        var url = 'http://'+ paras['email'].split('@')[1];
                                        if (isAndroid) {
                                            location.hash = '#' + url;
                                        } else if (isIDevice){
                                            location.href = url;
                                        }
                                    }, 600);
                                }
                                close_login(false);
                            })

                        } else {
                            $('#err_info').hide().html(o.error).slideDown('fast');
                            $.getp(API + '/register', true, function(r){
                                $('#cap_id').val(r.cap_id);
                                $('#cap_img').attr('src', r.cap_img);
                                $('#cap_solution').val('');
                            });
                        }
                    })
                }
            };
            setTimeout(function(){
                $('#submit').click(f);
            }, 400);
        });
    });
}

function show_logout(){
    if (user){
        do_confirm(window.localStorage.getItem('user_name') +
            ', 你要退出登录吗?',
            {title: '退出登录', choice: '是,否'},
            logout_user
        );
    }
}

function minePage(u){
    if(!user){
        Router.url_require_login = '#mine';
        Router.url_before_login = '#mine';

        var html = $.tmpl('#tmpl_mine');
        slide_in(html, rMINE, '.frame', function() {
            new iScroll('wrapper');
        });
    } else {
        var get_updates = function(isr){
            if ($('#more_artists').html() == '没有更多内容了') {
                return;
            }
            var num = $('#update_list li.all').length;
            var page = Math.floor(num / 25);
            $.getp(API + '/mine', {
                kind: u[1],
                page: page + 1
            },
            function(o){
                o.show_site = true;
                var more_list = $.tmpl('#tmpl_update_list', o);
                $('#more_artists').before(more_list);
                if (o.total_page <= page + 1){
                    $('#more_artists').html('没有更多内容了');
                }
                isr.refresh();
            })
        }
        $.getp(API + '/mine', {kind: u[1]}, true, function(o){
            localStorage.setItem('user_avatar', o.user_avatar);
            var html = $.tmpl('#tmpl_mine', o);
            slide_in(html, rMINE, '.frame', function(){
                var myScroll = new iScroll('wrapper', {
                    useTransition: true,
                    topOffset: $('#pull_down').height() + 1,
                    onScrollMove: function() {
                        if (this.y > 5 && $('#pull_down').html() == '下拉刷新'){
                            $('#pull_down').html('松开刷新')
                        } else if (this.y < 5 && $('#pull_down').html() == '松开刷新'){
                            $('#pull_down').html('下拉刷新')
                        }
                    },
                    onScrollEnd: function(){
                         if ($('#pull_down').html() == '松开刷新') {
                             Router.check_url();
                         }
                     }
                });
                $('.sub_nav_mine li').removeClass('now');
                $('.sub_nav_mine .' + (u[1] || 'song') + '_tab').addClass('now');
                $('#header').click(function(){
                    myScroll.scrollTo(0, -($('#pull_down').height()+1), 700)
                });
                if ($('#update_list li.all').length > (o.total_page - 1)*25){
                    $('#more_artists').hide();
                    myScroll.refresh();
                }
                $('#more_artists').click(function(){
                    get_updates(myScroll)
                });
            });
        })
    }
}

function settingsPage() {
    Router.url_require_login = rSETTINGS;
    Router.url_before_login =  rSETTINGS;
    if (isIDevice) {
        plugins.SocialSharing.getShareAuthInfo(function(r){
            $.getp(API + '/get_push_settings', true, function(settings) {
                var boundVenders = [],
                    userId = localStorage.getItem('user_id'),
                    settingsBitmask = settings.settings,
                    isPushUploadSongs = settingsBitmask & NOTI_TYPE_UPLOAD_SONGS,
                    isPushPubEvents = settingsBitmask & NOTI_TYPE_PUB_EVENTS;

                for (k in r) boundVenders.push(k);

                var html = $.tmpl('#tmpl_settings', {
                    "venders": r,
                    "boundVenders": boundVenders,
                    "pushUploadSongSetting": isPushUploadSongs ? 'checked': '',
                    "pushPubEventsSetting": isPushPubEvents ? 'checked': ''
                });

                slide_in(html, rSETTINGS, '.frame', function() {
                    new iScroll('wrapper_settings');
                    $('.share_vender').delegate('.deauth', 'click', function() {
                        var self = $(this);
                        do_confirm('你要解除与' + self.data('vname') + '的绑定吗?',
                            {title: '解除绑定', choice: '是,否'},
                            function(choice) {
                                if (choice == do_confirm.OK){
                                    deAuthorize(self.data('vender'));
                                }
                            }
                        );
                    });

                    $('.share_vender').delegate('.auth', 'click', function() {
                        authorize($(this).data('vender'));
                    });

                    $('.push_setting').click(function() {
                        $(this).toggleClass('checked');
                        var isPushUploadSongs = $('#push_upload_songs').hasClass('checked'),
                            isPushPubEvents = $('#push_pub_events').hasClass('checked');

                        $.getp(API + '/sync_push_settings', {
                            'upload_songs': isPushUploadSongs,
                            'pub_events': isPushPubEvents
                        }, true, function() {
                            localStorage.setItem('push_upload_songs:' + userId, isPushUploadSongs);
                            localStorage.setItem('push_pub_events:' + userId, isPushPubEvents);
                        });
                    });
                });
            });
        });
    } else {
        var html = $.tmpl('#tmpl_settings');
        slide_in(html, rSETTINGS, '.frame', function() {
            new iScroll('wrapper_settings');
        });
    }
}

function aboutPage() {
    var html = $.tmpl('#tmpl_about');
    slide_in(html, rABOUT, '.frame', function() {
        new iScroll('wrapper_about');
        $('#add_feedback').click(function() {
            plugins.Feedback.showFeedbackPanel();
        });
    });
}

function appsPage() {
    $.getp(API + '/promote_apps?platform=ios', true, function(o) {
        var html = $.tmpl('#tmpl_apps', {apps: o});
        slide_in(html, rAPPS, '.frame', function() {
            new iScroll('wrapper_apps');
        });
    });
}

function myArtistsPage(u){
    if(!user){
        Router.url_require_login = '#my_artists';
        Router.url_before_login =
            (!/#my_artists|#mine/.test(Router.history(-1))) ?
                Router.history(-1) :
            Router.url_before_login ?
                Router.url_before_login : '#';

        var html = $.tmpl('#tmpl_mine');
        slide_in(html, rMINE, '.frame', function(){
            setTimeout(function(){
                location.hash = '#login';
            }, 500);
        });
    } else {
        $.getp(API + '/my_artists', true, function(o) {
            var html = $.tmpl('#tmpl_my_artists', o);
            var get_more_artists = function(isr){
                if ($('#more_artists').html() == '没有更多音乐人了') {
                    return;
                }
                var num = $('#artist_list li.all').length;
                var page = Math.floor(num / 25);
                $.getp(API + '/my_artists', {
                    page: page + 1
                },
                function(o){
                    var more_list = $.tmpl('#tmpl_artist_list', o);
                    $('#more_artists').before(more_list);
                    if (o.total_page <= page + 1){
                        $('#more_artists').html('没有更多音乐人了');
                    }
                    isr.refresh();
                })
            }
            slide_in(html, rMY_ARTISTS, '.frame', function(){
                var myScroll = new iScroll('wrapper_my_art', {useTransition:true});
                $('#header').click(function(){
                    myScroll.scrollTo(0, 0, 700)
                });
                if ($('#artist_list li.all').length > (o.total_page - 1)*25){
                    $('#more_artists').hide();
                    myScroll.refresh();
                }
                $('#more_artists').click(function(){
                    get_more_artists(myScroll)
                });
            });
        })
    }
}

function artistPlayListPage(u) {
    $.getp(API + '/artist_playlist', {id: u[1]}, function(o) {
        var small_html = $.tmpl('#tmpl_artist_playlist', o);
        o.wrapper = 'wrapper_playlist';
        var f = function(){
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('.sub_nav_artist li').removeClass('now');
            $('#artist_playlist').addClass('now');
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
        }
        o.small_html = small_html;
        html = $.tmpl('#tmpl_artist_main', o);
        slide_in(html, rARTIST, '.frame', f)
    })
}

function chartPage(u){
    var do_play = function(){
        player.set_playlist(Playlist.list);
        player.play_id(u[2]);
        show_player();
    }

    /* Because people can access this link by click back button
     * from artist page, and it shouldn't play if that happens.
     * But people can't click back button to open the songs/xxx/yyy page,
     * so we needn't check history there, plus it must support
     * open-and-play from the update list.
     * */
    if (/^$|#chart/.test(Router.history(-1))
        && u[1] == 'song' && u[2] != ''
        && Playlist.list)
    {
        do_play();
        return;
    }

    $.getp(API + '/chart', {type: u[1] || 'song'}, function(o){
        if (o['songs']) {
            Playlist.make_list(o, 'chart');
        }
        var tmpl = u[1] == 'artist' ? '#tmpl_chart':'#tmpl_song_chart';
        var html = $.tmpl(tmpl, o);
        slide_in(html, rCHART, '.frame', function(){
            var myScroll = new iScroll(u[1] == 'artist' ?
                'chart_wrapper' : 'song_wrapper', {useTransition:true});
            $('#header').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
            if (/^$|#chart/.test(Router.history(-1))
                    && u[1] == 'song' && u[2] != '') {
                do_play();
            } else {
                highlight_playing();
            }
            show_nav('nav_chart');
            $('#content').css({bottom: '50px', 'z-index': 1});
        })
    })
}

function songsPage(u) {

    var do_play = function(){
        player.set_playlist(Playlist.list);
        player.play_id(u[2]);
        show_player();
    }

    if (/#songs\//.test(Router.history(-1)) && u[2] !== '' && Playlist.list)
    {
        do_play();
        return;
    }

    $.getp(API + '/songs', {id: u[1]}, function(o) {
        Playlist.make_list(o, u[1]);

        var html = $.tmpl('#tmpl_songs', o);
        slide_in(html, rSONGS, '.frame', function(){
            var myScroll = new iScroll('wrapper_songs', {useTransition: true});

            if (u[2] != '') {
                do_play();
            } else {
                highlight_playing();
            }
        })
    })
}

function artistBoardPage(u) {
    var START_EV = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    $.getp(API + '/artist_board', {id: u[1]}, true, function(o) {
        o.wrapper = 'wrapper_board';
        var small_html = $.tmpl('#tmpl_artist_board', o);
        var f = function(){
            var area = $('#msg_area');
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
            $('#artist_nav li').removeClass('now');
            $('#artist_board').addClass('now');
            area[0].addEventListener(START_EV, function(e) {
                e.stopPropagation();
            }, false);
            area.set_tip().focus(function(){
                $('#footer').css('overflow', 'hidden'); // keyboard bug
                if(!user){
                    Router.url_require_login = location.hash;
                    Router.url_before_login = location.hash;
                    location.hash = '#login';
                } else {
                    if ($('#add'+u[1]).hasClass('add')) {
                        area.blur();
                        do_alert('需要先关注才可以留言', '留言板');
                    } else {
                        $('.board_submit').show();
                    }
                }
            }).blur(function(){
                var area = $('#msg_area');
                if(!area.val() || (area.val() == area[0].title)) {
                    setTimeout(function(){
                        $('.board_submit').fadeOut('fast');
                        $('#footer').css('overflow', 'visible');
                    }, 1000);
                }
                $('.footer_nav_back').css('bottom', 0);
                $('#footer').css('bottom',0);
            }).click(function(){
                if(!isIDevice && $('#add'+u[1]).hasClass('added')) {
                    myScroll.scrollTo(0, -164, 500)
                }
            });
            $('.board_submit').click(function(){
                var area = $('#msg_area');
                if(!area.val() || (area.val() == area[0].title)) {
                    return;
                }
                if( isAndroid ) {
                    plugins.SoftKeyBoard.hide();
                }
                $.getp(API + '/add_message', {
                    text: area.val(),
                    id : u[1]
                }, true, function(o){
                    if (o['error'] != 'ok'){
                        do_alert(o['error'], '错误');
                    } else {
                        Router.check_url();
                    }
                })
            });
            $('#cancel_btn').click(function(){
                $('#message_form').hide();
            })
            $('.sub_nav_artist li').removeClass('now');
            $('#artist_board').addClass('now');
        }
        o.small_html = small_html;
        html = $.tmpl('#tmpl_artist_main', o)
        slide_in(html, rART_BOARD, '.frame', f)
    })
}

function searchPage(u) {
    $.getp(API + '/search', {q: u[1]}, function(o) {
        var html = $.tmpl('#tmpl_search', o);
        slide_in(html, rSEARCH, '.frame', function(){
            var myScroll;
            if (o.artists.length){
                myScroll = new iScroll('wrapper_search', {useTransition: true});
            } else {
                myScroll = new iScroll('wrapper_genrelist', {useTransition: true});
            }
            $('#header').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
            init_search_form(myScroll);
            show_nav('nav_search');
        })
    })
}

function init_search_form(isc){
    var txt = $('.search_input .text');
    if(txt.length > 1) txt = $(txt[1]);
    var START_EV = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    txt[0].addEventListener(START_EV, function(e) {
        e.stopPropagation();
    }, false);
    txt.set_tip().focus(function(){
        isc.disable();
        $.getp(API + '/tags', function(obj) {
            var tags = $($.tmpl('#tmpl_search_tags', obj));
            $('.frame').append(tags);
            tags.fadeIn('fast');
            txt.css({'right': 60});
            $('.search_btn').css({'right': 59});
            $('.cancel_btn').show();
        })
    });
    $('.cancel_btn').click(function(){
        $('.search_tags').remove();
        txt.css({'right': 8});
        $('.search_btn').css({'right': 7});
        $('.cancel_btn').hide();
        isc.enable();
    })
    $('.search_form').submit(function(){
        $('.search_tags').remove();
        if (txt[0].title != txt[0].value && txt[0].value != '') {
            location.hash = '#search/' + encodeURIComponent(txt.val());
        }
        return false;
    })
}

function artistUpdatePage(u) {
    $.getp(API + '/artist_update', {id: u[1]}, true, function(o) {
        o.wrapper = 'wrapper_update';
        var small_html = $.tmpl('#tmpl_artist_update', o);
        var f = function(){
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('.sub_nav_artist li').removeClass('now');
            $('#artist_update').addClass('now');
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
        }
        o.small_html = small_html;
        html = $.tmpl('#tmpl_artist_main', o)
        slide_in(html, rART_EVENT, '.frame', f)
    })
}

function artistEventPage(u) {
    $.getp(API + '/artist_event', {id: u[1]}, true, function(o) {
        o.wrapper = 'wrapper_artist_event';
        var small_html = $.tmpl('#tmpl_artist_event', o);
        var f = function(){
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('.sub_nav_artist li').removeClass('now');
            $('#artist_event').addClass('now');
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
        }
        o.small_html = small_html;
        html = $.tmpl('#tmpl_artist_main', o)
        slide_in(html, rART_EVENT, '.frame', f)
    })
}

function artistAlbumPage(u) {
    $.getp(API + '/artist_album', {id: u[1]}, function(o) {
        o.wrapper = 'wrapper_album';
        var small_html = $.tmpl('#tmpl_artist_album', o);
        var f = function(){
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('.sub_nav_artist li').removeClass('now');
            $('#artist_album').addClass('now');
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
        }
        o.small_html = small_html;
        html = $.tmpl('#tmpl_artist_main', o)
        slide_in(html, rART_ALBUM, '.frame', f)
    })
}

function photosThumbPage(u){
    var no_more = false;
    var checkMore = function(isc) {
        if (no_more) {
            return;
        }
        var nowNum = $('#photo_list_thumb li').length;
        $.getp(API + '/photos', {
            id: u[1],
            cate: 'albumcover',
            limit: 15,
            start: nowNum
        }, function(o){
            if (o.photos.length == 0){
                no_more = true;
                return;
            }
            more_html = $.tmpl('#tmpl_photo_thumb_list', o)
            $('#photo_list_thumb').append(more_html);
            isc.refresh();
            setTimeout(function(){
                if($('#wrapper_photos_thumb').height() >
                    $('#scroller_photos_thumb').height()) checkMore(isc);
            }, 200);
        })
    }

    $.getp(API + '/photos', {id: u[1], cate: 'albumcover', limit:15}, function(o){
        var html = $.tmpl('#tmpl_photos_thumb', o);
        slide_in(html, rPHOTOS_THUMB, '.frame', function(){
            var myScroll = new iScroll('wrapper_photos_thumb', {
                snap: 'li',
                useTransition: true,
                onScrollMove: function() {
                },
                onScrollEnd: function(){
                    if (!no_more && this.y <= this.maxScrollY) {
                        checkMore(this);
                    }
                }
            });
            if (o.photos.length == 0){
                no_more = true;
            }
            setTimeout(function(){
                if(!no_more && $('#wrapper_photos_thumb').height() >
                    $('#scroller_photos_thumb').height()) {
                    checkMore(myScroll);
                }
            }, 0);
        });
    })
}

$(document).bind('resize_end', function(){
    if (RegExp(rPHOTOS).test(location.hash)) {
        Router.check_url();
    }
});

function photosPage(u){
    var showInfo = function(isc){
        var i = isc.currPageX, li = $('#photo_list li:eq('+i+')');
        $('.photo_desc .desc').html(li.data('desc'));
        var desc = li.data('uploader') + ' 上传于 ' + li.data('time');
        $('.photo_desc .author').html(desc);
        if ( i + 1 == $('#photo_list li').length) {
            var start = li.data('order') + 1;
            $.getp(API + '/photos', {id: u[1], start: start}, function(o){
                if (o.photos.length) {
                    var morePhoto = $.tmpl('#tmpl_photo_list', o);
                    $('#photo_list').append(morePhoto);
                    $('#scroller_photos').width(
                        $('#wrapper_photos').width() * $('#photo_list li').length);
                    isc.refresh();
                }
            })
        }
        if ( i == 0 && li.data('order') > 0) {
            var begin = li.data('order'),
            start = begin > 9 ? begin - 10 : 0,
            limit = begin > 9 ? 10 : begin;
            $.getp(API + '/photos', {id: u[1], start:start, limit:limit}, function(o){
                var morePhoto = $.tmpl('#tmpl_photo_list', o);
                li.before(morePhoto);
                $('#scroller_photos').width(
                    $('#wrapper_photos').width() * $('#photo_list li').length);
                isc.refresh();
                isc.currPageX = o.photos.length;
                isc.scrollToElement(li[0], 0);
            });
        }
    }

    $.getp(API + '/photos', {id: u[1], photo_id: u[2]}, function(o){
        var html = $.tmpl('#tmpl_photos', o);
        slide_in(html, rPHOTOS, '.frame', function(){
            var myScroll = new iScroll('wrapper_photos', {
                snap: true,
                momentum: false,
                hScrollbar: false,
                vScrollbar: false,
                bounce: true,
                useTransition: true,
                onScrollEnd: function(){
                    showInfo(this);
                }
            });
            var all_width = $('#wrapper_photos').width() * o.photos.length;
            $('#scroller_photos').width(all_width);
            showInfo(myScroll);
            myScroll.refresh();
        })
    })
}

function artistPage(u){
    $.getp(API + '/artist_playlist', {id: u[1]}, function(o){
        o.small_html = $.tmpl('#tmpl_artist_playlist', o);
        o.wrapper = 'wrapper_home';
        var html = $.tmpl('#tmpl_artist_main', o);
        slide_in(html, rARTIST, '.frame', function(){
            var myScroll = new iScroll(o.wrapper, {useTransition: true});
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
        })
    })
}

function genrePage(u){
    u = u[0] == '#labels' ? ['', '*', 'label', ''] :
        u[0] == '#djs' ?    ['', '*', 'dj', ''] : u;

    var get_genre_artists = function(isr){
        if ($('#more_artists').html() == '没有更多内容了') {
            return;
        }
        var num = $('#artist_list li.all').length;
        var page = Math.floor(num / 25);
        $.getp(API + '/genre', {
            gid: u[1],
            type: u[2] || 'artist',
            sortby: u[3] || 'hot',
            page: page + 1
        },
        function(o){
            var more_list = $.tmpl('#tmpl_artist_list', o);
            $('#more_artists').before(more_list);
            if (o.total_page <= page + 1){
                $('#more_artists').html('没有更多内容了');
            }
            isr.refresh();
        })
    }
    $.getp(API + '/genre', {
        gid: u[1],
        type: u[2] || 'artist',
        sortby: u[3] || 'hot'
    },
    function(o){
        o.genre_name = u[2] == 'dj' ?  'DJ' :
                       u[2] == 'label' ? '厂牌' : o.genre_name;
        var html = $.tmpl('#tmpl_genre', o);
        slide_in(html, rGENRE, '.frame', function(){
            var now_tab = u[3] == 'new' ? '.sort_new': '.sort_hot';
            $('.dual_tab li').removeClass('now');
            $(now_tab).addClass('now');
            if (($('#artist_list li.all').length/25+1) >= o.total_page) {
                $('#more_artists').hide();
            }
            var myScroll = new iScroll('wrapper_genre', {
                useTransition: true
            });

            $('#more_artists').click(function(){
                get_genre_artists(myScroll)
            });
            $('#header .title').click(function(){
                myScroll.scrollTo(0, 0, 700)
            });
            init_search_form(myScroll);
            show_nav('nav_search');
        })
    })
}

function tagPage(u){
    var name = decodeURIComponent(u[1]);
    var get_tag_artists = function(isr){
        if ($('#more_artists').html() == '没有更多内容了') {
            return;
        }
        var num = $('#artist_list li.all').length;
        var page = Math.floor(num / 25);
        $.getp(API + '/tag', {
            name: name,
            type: u[2] || 'artist',
            sortby: u[3] || 'hot',
            page: page + 1
        },
        function(o){
            var more_list = $.tmpl('#tmpl_artist_list', o);
            $('#more_artists').before(more_list);
            if (o.total_page <= page + 1){
                $('#more_artists').html('没有更多内容了');
            }
            isr.refresh();
        })
    }
    $.getp(API + '/tag', {name: name, type: u[2], sortby: u[3]}, function(o){
        var html = $.tmpl('#tmpl_tag', o);
        slide_in(html, rTAG, '.frame', function(){
            var now_tab = u[3] == 'new' ? '.sort_new': '.sort_hot';
            $('.dual_tab li').removeClass('now');
            $(now_tab).addClass('now');
            var myScroll = new iScroll('wrapper_tag', {useTransition: true});
            $('#header').click(function(){
                myScroll.scrollTo(0, 0, 700);
            });
            init_search_form(myScroll);
            show_nav('nav_search');
            $('#more_artists').click(function(){
                get_tag_artists(myScroll)
            });
        })
    })
}

function extLinkHandler(u){
    var url = decodeURIComponent(u).replace(/^#/, '');
    location.hash = Router.history(0) || '#';
    if (isAndroid) {
        window.plugins.childBrowser.showWebPage(url, { showLocationBar: true });
    } else {
        window.open(url, '_blank', 'location=no,enableViewportScale=yes');
    }
}

function like_artist(e) {
    id = e.target.id.split('add')[1];
    if (user){
        if ($('#add'+id).hasClass('added')){
            do_confirm('要取消关注吗', {title: '取消关注', choice: '是,否'},
                function(choice) {
                if (choice == do_confirm.OK) {
                    $.getp(API + '/like_artist', {id: id, action: 'unlike'}, true,
                    function(o)
                    {
                        e.target.className = o['like'] == 'yes' ? 'added' : 'add';
                        $.flush_cache();
                        increse_liker(e.target, -1);
                    })
                }
            })
        } else {
            $.getp(API + '/like_artist', {id: id, action: 'like'}, true, function(o){
                e.target.className = o['like'] == 'yes' ? 'added' : 'add';
                $.flush_cache();
                if (o['like'] == 'yes') {
                    increse_liker(e.target, 1);
                }
                if (o['error']) {
                    do_alert(err_msg(o['error']), '失败');
                }
            });
        }
    } else {
        Router.url_before_login = location.hash;
        Router.url_require_login = location.hash;
        location.hash = '#login';
    }
    return false;
}

function increse_liker(target, n) {
    if (target.className != 'like_btn') {
        target = target.parentNode;
    }
    var fdiv = $(target).parent().find('.follower');
    if (fdiv.length && fdiv.html()) {
        var num = /(\d+)([^\d]*)/.exec(fdiv.html());
        if (parseInt(num[1])) {
            fdiv.html((parseInt(num[1]) + n) + num[2]);
        }
    }
}

function logout_user(choice){
    if (choice == do_confirm.OK){
        $.getp(API + '/deactivate_push_notification', {
            "uid": localStorage.getItem('user_id')
        }, true, function(r) {});
        window.user = undefined;
        window.localStorage.removeItem('user_id');
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user_name');
        window.localStorage.removeItem('expire');
        $.flush_cache();
        location.hash = '#chart';
        plugins.SocialSharing.logoutDoubanAccount();
    }
}

function close_login(login_success, callback) {
    $('#content').css({bottom: '50px', 'z-index': 1});
    if (login_success) {
        location.hash = Router.url_require_login || '#';
    } else {
        location.hash = Router.url_before_login || '#';
    }
    if (callback !== undefined) callback();
}

function confirm_login() {
    $('.login_frame #submit').click();
}

function authorize(vendorType) {
    plugins.SocialSharing.authorizeByVendor(vendorType, function(r) {
        var vendor = $('.auth[data-vender=' + vendorType + ']');
        vendor.removeClass('auth')
            .addClass('deauth')
            .find('.st_action_text').text('@' + r.userName);
    });
}

function deAuthorize(vendorType) {
    plugins.SocialSharing.deAuthorizeByVendor(vendorType, function(r) {
        var vendor = $('.deauth[data-vender=' + vendorType + ']');
        vendor.removeClass('deauth')
            .addClass('auth')
            .find('.st_action_text').text('未绑定');
    });
}
