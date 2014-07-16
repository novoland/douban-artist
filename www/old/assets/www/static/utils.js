document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
window.user = window.localStorage.getItem('user_name');

var tr = function(){
    if (console && console.log) console.log(
        Array.prototype.join.apply(arguments, [' '])
    )
},
itr = function(r){
    if (console && console.info) console.info(r)
},
API = 'http://music.douban.com/api/artist',
SAPI = API,//'https://music.douban.com/api/artist',
DA_VER = '1.0.5',
APPNAME = 'music_artist',
VERSION = 50, // what is this version for?
//isAndroid = (/android/gi).test(navigator.appVersion),
//isIDevice = (/iphone|ipad/gi).test(navigator.appVersion),
//isWebOS = (/webOS/gi).test(navigator.appVersion),
isAndroid = isIDevice = isWebOS = false,
SHARE_VENDER_SINA = '2',
SHARE_VENDER_TENCENT = '3',
NOTI_TYPE_UPLOAD_SONGS = 1 << 0,
NOTI_TYPE_PUB_EVENTS = 1 << 1;

(function(){
    var routes = [], _his = [], _pos, _ignore;
    window.Router = {
        set_routes : function(r) { routes = r },
        history : function(index) {
            return index <= 0 && _his.length + index - 1 >= 0 ?
                _his[_his.length + index - 1] : ''
        },
        set_ignore: function(str) {
            _ignore = new RegExp(str);
        },

        record: function(hash) {
            if(!(_ignore && _ignore.test(hash))) {
                _his[_his.length] = hash;
            }
            if (_his.length > 150) _his.slice(-100);
        },
        set_position: function(pos) {
            _pos = {};
            for (var i=0; i<pos.length; i++){
                var p = pos[i][1];
                _pos[pos[i][0]] = {
                    reLeft : new RegExp((p['leftOf'] || ['$.']).join('|')),
                    reRight : new RegExp((p['rightOf'] || ['$.']).join('|')),
                    reAbove: new RegExp((p['above'] || ['$.']).join('|')),
                    reBelow: new RegExp((p['below'] || ['$.']).join('|'))
                }
            }
        },
        get_position: function(page, lastHash) {
            return !_pos[page] ? 'center':
                _pos[page].reLeft.test(lastHash) ? 'left' :
                _pos[page].reRight.test(lastHash) ? 'right' :
                _pos[page].reAbove.test(lastHash) ? 'bottom_out' :
                _pos[page].reBelow.test(lastHash) ? 'bottom': 'center';
        },
        get_back_from: function(pattern) {
            while(_his.length) {
                var hash = _his.pop();
                console.log(hash);
                if (hash === '#login') {
                    continue;
                }
                if (!(new RegExp(pattern)).test(hash)) {
                    Router.record(location.hash);
                    location.hash = hash;
                    return;
                }
            }
        },
        check_url: function(){
            tr('==>'+ location.hash);
            try{
                $.event.trigger('check_url');
            }catch(e){

            }
            var match, re;
            Router.record(location.hash);
            for (var i=0; i<routes.length; i++){
                re = new RegExp(routes[i][0].replace('/', '\\\/'));
                match = re.exec(location.hash);
                if (match) return routes[i][1](match);
            }
        }
    }
    $(window).bind('hashchange', Router.check_url);

    var cache = {};
    $.tmpl = function(str, data){
        data = data || {};
        if (str[0] == '#') str = $(str).html();
        str = str.trim();
        var fn = cache[str] ||
        new Function("o", "var p=[];with(o){p.push('" +
         str.replace(/[\r\t\n]/g, " ")
         .replace(/'(?=[^%]*%})/g,"\t")
         .split("'").join("\\'")
         .split("\t").join("'")
         .replace(/{%=(.+?)%}/g, "',$1,'")
         .split("{%").join("');")
         .split("%}").join("p.push('")
         + "');}return p.join('');");
        return fn.apply(data, [data]);
    }

    $.getpcb = {};
    $.flush_cache = function(){ cache = {}; }
    $.setp = function(key) {
        return function(r) {
            var cb = $.getpcb[key];
            r.__t = (new Date()).getTime();
            cache[cb.cache_key] = r;
            if ($.getpcb['now'] == cb || cb.no_cancel) {
                $.event.trigger('ajaxComplete');
                cb(r);
            }
            delete $.getpcb[key];
        }
    }

    var CACHE_EXPIRE = 60000 * 5;
    $.getp = function(url, data, no_cache, cb, no_cancel){
        if (typeof data == 'function') {
            cb = data; data = {};
        } else if (typeof no_cache == 'function'){
            cb = no_cache;
            if (typeof data == 'object') {
                no_cache = false;
            } else {
                no_cache = data;
                data = {};
            }
        }
        tr(url);
        var cache_key = url + '::' + $.param(data);
        if (!no_cache && cache[cache_key]){
            if ((new Date()).getTime() - cache[cache_key].__t < CACHE_EXPIRE) {
                $.event.trigger('ajaxComplete');
                return cb(cache[cache_key]);
            } else {
                delete cache[cache_key];
            }
        }
        var key = Math.random();
        $.getpcb['now'] = $.getpcb[key] = cb;
        $.getpcb[key].no_cancel = no_cancel;
        $.getpcb[key].cache_key = cache_key;

        data = $.extend(data, {
            cb: '$.setp(' + key + ')',
            app_name: APPNAME,
            version: VERSION
        });
        if (user) {
            data = $.extend(data, {
                user_id: localStorage.getItem('user_id'),
                token:  localStorage.getItem('token'),
                expire: localStorage.getItem('expire')
            })
        }

        $.getScript(url + (url.indexOf('?')==-1?'?':'&') +
            $.param(data));
        $.event.trigger('ajaxSend');
    }

    jQuery.fn.extend({'set_tip': function(){
        if(!this.length) return;
        var o = this[0], onBlur = function(){
            if(!o.value || o.value == o.title){
                $(o).val(o.title).addClass("gray");
            }
        }
        $(o).focus(function(){
            $(o).removeClass("gray");
            if(o.value === o.title) o.value = "";
        }).blur(onBlur);

        onBlur();
        return this;
    }});

    window.Playlist = {
        list: null,
        src: null,
        make_list: function(o, src){
            var utime = (new Date()).getTime();
            Playlist.list = $.map(o.songs, function(s) {
                return {
                    icon: s.picture,
                    id: s.id,
                    title: s.name,
                    src: s.src,
                    link: '#artist/' + s.artist_id,
                    artist_id: s.artist_id,
                    artist: s.artist,
                    duration: s.length,
                    utime: utime
                }
            });
            if (src) Playlist.src = src;
        },
        refresh_list: function(){
            if (Playlist.src) {
                var f = function(o) {
                    Playlist.make_list(o);
                    player.set_playlist(Playlist.list);
                }
                if (Playlist.src == 'chart') {
                    $.getp(API + '/chart', true, f);
                } else {
                    $.getp(API + '/songs', {id: Playlist.src}, true, f);
                }
            }
        }
    }
})();

var slide_in = function(html, page, target_str, cb){
    target = $(target_str);
    if (!target.length) {tr('no target'); return }
    if (target.length > 1) {
        for(var i=0; i<target.length-1; i++) {
            $(target[i]).remove();
        }
        target = $(target[i]);
    }
    var par = target.parent(),
        last = Router.history(-1),
        from = Router.get_position(page, last),
        new_frame = $($.parseHTML(html));

    //tr(Router.history(-1), '->', page, ': ', from);

    if(from == 'center'){
        target.after(html);
        target.remove();

    } else if (from == 'right' || from == 'left') {
        var start = par.width() * (from == 'right' ? 1:-1);
        new_frame.css('left', start);
        target.after(new_frame);
        target.imove(-start, 0, 200, function(){target.remove()});
        new_frame.imove(-start, 0, 200);

    } else if (from == 'bottom') {
        new_frame.css('top', par.height()).css('height', target.height());
        target.after(new_frame);
        new_frame.imove(0, -par.height(), 200, function(){target.remove()});

    } else if (from == 'bottom_out') {
        target.before(new_frame);
        target.imove(0, par.height(), 200, function(){target.remove()});
    }
    if (cb) cb();
}

function onBodyLoad() {
    if('ontouchstart' in window) {
        if (isIDevice) {
            document.addEventListener('deviceready', onDeviceReady, false);
            document.addEventListener('resume', onResume, false);
        } else { /*android and other device*/
            $(onDeviceReady);
        }
    } else {
        $(onDeviceReady);
    }
}

function reachableCallback(reachability) {
    var networkState = reachability.code || reachability;
    var states = {};
    states[NetworkStatus.NOT_REACHABLE]                      = 'No network connection';
    states[NetworkStatus.REACHABLE_VIA_CARRIER_DATA_NETWORK] = 'Carrier data connection';
    states[NetworkStatus.REACHABLE_VIA_WIFI_NETWORK]         = 'WiFi connection';
    tr('Connection type: ' + states[networkState]);
}

function err_msg(err) {
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
    return msg[err] || err;
}

(function(){
    var m = Math,
    vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' :
        (/firefox/i).test(navigator.userAgent) ? 'Moz' :
        'opera' in window ? 'O' : '',

    // Browser capabilities
    has3d = 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix(),
    hasTouch = 'ontouchstart' in window,
    hasTransform = vendor + 'Transform' in document.documentElement.style,
    isPlaybook = (/playbook/gi).test(navigator.appVersion),
    hasTransitionEnd = isIDevice || isPlaybook,

    // Helpers
    trnOpen = 'translate' + (has3d ? '3d(' : '('),
    trnClose = has3d ? ',0)' : ')';

    // force use css tran
    hasTransitionEnd = true;
    if (isWebOS) hasTransitionEnd = false;

    window.get_trans_pos = function(elem) {
        if (!hasTransitionEnd){
            var orig_left = parseFloat($(elem).css('left')) || 0;
            var orig_top = parseFloat($(elem).css('top')) || 0;
            return {'x': orig_left,
                    'y': orig_top }
        }
        var matrix = getComputedStyle(elem, null)[vendor + 'Transform']
            .replace(/[^0-9-.,]/g, '').split(',');
        return {'x': matrix[4] * 1 || 0,
                'y': matrix[5] * 1 || 0 }
    }

    $.fn.extend({'imove': function (stopX, stopY, duration, cb){
        var that = this, elem = that[0], matrix, origX, origY;
        if(hasTransitionEnd) {
            var orig_pos = get_trans_pos(elem);
            elem.style[vendor + 'TransitionProperty'] = '-' +
                                vendor.toLowerCase() + '-transform';
            elem.style[vendor + 'TransitionDuration'] = duration + 'ms';
            elem.style[vendor + 'Transform'] = trnOpen +
                                (orig_pos.x + stopX) + 'px,' +
                                (orig_pos.y + stopY) + 'px' + trnClose;
            if (!cb) return;
            var f = function(){
                cb(); elem.removeEventListener('webkitTransitionEnd', f);
            }
            elem.addEventListener('webkitTransitionEnd', f, false);
        }
        else {
            var orig_left = parseFloat(that.css('left')) || 0;
            var orig_top = parseFloat(that.css('top')) || 0;
            that.animate({
                left: orig_left + stopX,
                top: orig_top + stopY
            }, {
                duration: duration,
                complete: cb
            })
        }
        return that;
    }});
})();

$(function(){

    window.show_player = function(){
        if (!$('#song_title').text() && $('#song_title').is(':visible')) {
            $('#player div').hide();
            $('#no_song_tip').show();
        } else if ($('#song_title').text() && $('#song_title').is(':hidden')) {
            $('#player div').show();
            $('#no_song_tip').hide();
        }

        var trans_pos = get_trans_pos($('#player')[0]);
        if ($('#nav_play').hasClass('nav_play')
                && !$('#player').data('busy')
                && trans_pos.y == 0) {

            $('#footer').css('overflow', 'visible');
            $('#player').data('busy', 1).imove(0, -55, 400, function(){
                $('#player').data('busy', 0);
                showtime = setTimeout(hide_player, 10000);
                $('#player').data('showtime_handler', showtime);
            });
            $('#nav_play')[0].className = 'nav_play_now';
        }
        var showtime = $('#player').data('showtime_handler');
        clearTimeout(showtime);
    };

    window.hide_player = function(){
        var trans_pos = get_trans_pos($('#player')[0]);
        if ($('#nav_play').hasClass('nav_play_now')
                && !$('#player').data('busy')
                && trans_pos.y == -55) {
            $('#player').data('busy', 1).imove(0, 55, 400, function(){
                $('#player').data('busy', 0);
                $('#footer').css('overflow', 'hidden');
            });
            $('#nav_play')[0].className = 'nav_play';
        }
        $('#player').data('showtime_handler', 0);
        var showtime = $('#player').data('showtime_handler');
        clearTimeout(showtime);
    };

    window.show_nav = function(id){
        $('#footer_nav li').each(function(){
            if (this.id != 'nav_play' && this.id != 'nav_split') {
                this.className = this.id == id ? id + '_now' : this.id;
            }
        })
    }

    $('#footer_nav li.nav').mouseup(function(){
        location.hash = this.id.replace('nav_', '#');
        show_nav(this.id);
    })

    $('#nav_play').mouseup(function(){
        if ($('#nav_play').hasClass('nav_play_now')) {
            hide_player();
        } else {
            show_player();
        }
    })

    var START_EV = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    document.addEventListener(START_EV, function(e){
        $.event.trigger('touching', e);
    }, false);

    var resize_timer = 0,
    do_resize = function() {
        if (resize_timer) clearTimeout(resize_timer);
        resize_timer = setTimeout(function(){
            $.event.trigger('resize_end');
        }, 500);
    }
    window.addEventListener('resize', do_resize, false);

    /*
    if (isIDevice) {
        var activate = function(e){
            player.play('static/t.mp3');
            player.pause();
            acti = true;
            document.removeEventListener(START_EV, activate);
        };
        document.addEventListener(START_EV, activate, false);
    }
    */

    window.do_alert = function(str, title) {
        title = title || "豆瓣音乐人";
        if(isAndroid || isIDevice) {
            navigator.notification.alert(str,
                function(){}, title, "确定");
        } else {
            alert(str);
        }
    }
    window.do_confirm = function(str, config, cb) {
        if (typeof config == 'function') {
            cb = config;
            config = {};
        }
        var title = config['title'] || '豆瓣音乐人',
            choice = config['choice'] || '确定,取消';

        if(isAndroid || isIDevice) {
            navigator.notification.confirm(str, cb, title, choice);
        } else {
            cb(confirm(str) ? 1 : 2);
        }
    }
    do_confirm.OK = 1;
    do_confirm.CANCEL = 2;

    window.highlight_playing = function() {
        var id = $('#player').data('now_id');
        if (id) {
            $('.song_li').removeClass('now');
            $('#song' + id).addClass('now');
        }
    }

    $(document).bind(
        'startPlay', function(e, song){
            $('#song_icon').css({background: 'url('+ song.icon + ')'});
            var $songTitle = $('#song_title');
            $songTitle.css('left', '60px');
            $songTitle.css('overflow', 'hidden');
            var reChinese = /[^u00-uff]/gi;
            if (song.title.replace(reChinese, 'rr').length > 14) {
                $songTitle.css('-webkit-marquee', 'left small infinite slide normal')
                          .css('overflow-x', '-webkit-marquee');
            } else {
                $songTitle.css('-webkit-marquee', '')
                          .css('overflow-x', '');
            }
            $songTitle.html(song.title);
            $('#song_progress').css({width: 0});
            $('#player').data('now_id', song.id).data('link', song.link);
            $('#pause_btn')[0].className = 'pause_btn';
            highlight_playing();
            if(isAndroid) {
                window.plugins.statusBarNotification.notify(song.title, "正在播放");
            }
            localStorage.setItem('current_song_icon', song.icon);
            localStorage.setItem('current_song_artist', song.artist);
            localStorage.setItem('current_artist_id', song.artist_id);
        }
    ).bind(
        'stopPlay', function(e) {
            $('#pause_btn')[0].className = 'play_btn';
            if(isAndroid) {
                window.plugins.statusBarNotification.notify("播放暂停", "");
            }
        }
    ).bind(
        'playTimeUpdate', function(e, time){
            var percent = (time.now || 0) / (time.all || 0.001) * 100 + '%';
            $('#song_progress').css({width: percent});
            if (time.now && time.all) {
                var secs = parseInt(time.all - time.now);
                if (secs < 0) secs = 0;
                var mm = parseInt(secs / 60),
                    ss = secs - mm * 60;
                $('#song_time').html('- ' +
                    (mm<10 ? '0'+mm : mm) + ':' +
                    (ss<10 ? '0'+ss : ss)
                );
            }
        }
    ).bind(
        'touching', function(e, touch_ev) {
            if ($('#nav_play').hasClass('nav_play_now') && !$('#player').data('busy')) {
                var target = touch_ev.target;
                if (target.id == 'player'
                        || target.id == 'nav_play'
                        || $('#player').has(target).length
                        || $(target).hasClass('click_to_play')
                        || $('.click_to_play').has(target).length
                        ) {
                    show_player();
                } else {
                    hide_player();
                }
            }
        }
    );

    $('#song_icon').click(function(){
        if ($('#player').data('link')){
            location.hash = $('#player').data('link');
        }
    });

    $('#next_btn').click(function(){player.play_next()});
    $('#pause_btn').click(function(){
        if(this.className == 'play_btn'){
            player.resume();
        } else {
            player.pause();
        }
    });

    $('#share_btn').click(function() {
        var player = $('#player'),
            songId = player.data('now_id'),
            songTitle = $('#song_title').html(),
            songLink = player.data('link'),
            artistId = localStorage.getItem('current_artist_id'),
            artistTitle = localStorage.getItem('current_song_artist'),
            coverImageURL = localStorage.getItem('current_song_icon');

        plugins.SocialSharing.shareSong(
            songId, songTitle, songLink,
            artistId, artistTitle, coverImageURL, function() {
                Router.url_before_login = location.hash;
                Router.url_require_login = location.hash;
                location.hash = '#login';
            }
        );
    });
});

function check_connection() {
    if (isWebOS) return;
    if (navigator.network) {
        var networkState = navigator.network.connection.type;
        var states = {};
        states[Connection.UNKNOWN]  = 'Unknown connection';
        states[Connection.ETHERNET] = 'Ethernet connection';
        states[Connection.WIFI]     = 'WiFi connection';
        states[Connection.CELL_2G]  = 'Cell 2G connection';
        states[Connection.CELL_3G]  = 'Cell 3G connection';
        states[Connection.CELL_4G]  = 'Cell 4G connection';
        states[Connection.NONE]     = 'No network connection';

        if (networkState == Connection.NONE) {
            do_alert('请连接网络', '没有网络连接');
        }
    }
}

function handleOpenURL(url) {
    // invoke from AppDelegate
    location.hash = url;
}
