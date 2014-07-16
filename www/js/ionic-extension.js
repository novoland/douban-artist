angular.module('ionic.extension.stackModal', [])

// TODO 将这些逻辑放到一个directive的Controller里
    .run(['$rootScope','$route', '$location', 'TemplateLoader', '$controller', '$compile', '$routeParams', 'Modal','$animate','$timeout','Utils',
        function ($rootScope,$route, $location, TemplateLoader, $controller, $compile, $routeParams, Modal,$animate,$timeout,Utils){

        // default options
        var opts = {
            // in 的动画在new modal时指定
            defaultOutElement: 'body .pane:first-child', // 如果没有modal了，push out的元素
            outAnimation: false  // 同时进行out和in，页面稍微复杂一点性能就差很多
//        outAnimation:'my-slide-out-up'   // modal out的默认动画，在低端浏览器上很多bug
        };

        function getDefaultOutEle() {
            if (typeof opts.defaultOutElement == 'function')
                return opts.defaultOutElement;
            if (typeof opts.defaultOutElement == 'string')
                return document.querySelector(opts.defaultOutElement);
            return opts.defaultOutElement;
        }

        var modals = [];
        $rootScope.modalStack = {
            modals : modals
        };
        function getTopModal() {
            return modals.length > 0 ?
                modals[modals.length - 1] : null;
        }

        $rootScope.$on('modals.push', function (e, modal) {
            modal.show();

            var outTarget = getTopModal() && (getTopModal().el) || getDefaultOutEle();
            var outAnimation = modal.outAnimation || opts.outAnimation;
            if (outTarget && outAnimation) {
                $animate.addClass(angular.element(outTarget), outAnimation, function () {
                    outTarget.style.display = 'none';
                    // fix: tap event triggered twice at same location!!
                    outTarget.style['pointer-events'] = 'none';   // important,ugly hack
                });
            }

            modals.push(modal);
        });
        $rootScope.$on('modals.pop', function () {
            var last = getTopModal();
            // 没有modal则返回
            if(!last)
                return;
            // 先调用关闭前的callback，return false则不可关闭
            if(last.beforePop && beforePop(modal.scope) === false){
                return;
            }

            modals.pop();
            last.remove();

            var outTarget = getTopModal() && (getTopModal().el) || getDefaultOutEle();
            var outAnimation = outTarget.outAnimation || opts.outAnimation;
            if (outTarget && outAnimation) {
                outTarget.style.display = 'block';
                outTarget.style['pointer-events'] = 'none';
                $animate.removeClass(angular.element(outTarget), outAnimation, function () {
                    outTarget.style['pointer-events'] = 'auto';
                });
            }
        });

        // 菜单按钮
        // 4.2.2中，每两次按键才会触发一次该事件。solution: https://issues.apache.org/jira/browse/CB-1574?focusedCommentId=13468583&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-13468583
        document.addEventListener("menubutton", function(){
            modals.length == 0 && $timeout(function(){$rootScope.sideMenuController.toggleLeft();});
        }, false);
        // 返回按钮
        document.addEventListener("backbutton", function(){
            if(modals.length){
                $rootScope.$apply(function(){
                    $rootScope.$emit('modals.pop');
                });
            }
            else{
                $rootScope.sideMenuController.getOpenAmount()?
                    Utils.confirm("退出豆瓣音乐人?", function(choice){
                        if (choice == Utils.confirm.OK){
                            //window.plugins.statusBarNotification.cancel();
                            navigator.app.exitApp();
                        }
                    }):
                    $rootScope.$apply(function(){
                        $rootScope.sideMenuController.toggleLeft(true);
                    });
            }
        }, false);



        // enhance Modal
        Modal.fromUrl = function(url,option,cb){
            var path = url,
                match = parseRoute(path),
            // TODO redirectTo， 见angular-route.js中的updateRoute方法
            // TODO route的resolve，放在locals中
                ctrlName = match.controller,
                tplUrl = match.templateUrl,
                params = match.params,
                locals = {};

            angular.copy(params, $routeParams);
            TemplateLoader.load(tplUrl).then(function (templateString) {
                // 创建并push modal
                var modal = Modal.fromTemplate(templateString, option);
                // 如果该route声明了controller，实例化之
                if (ctrlName) {
                    // controller构造器中的参数：$template,$scope
                    locals.$template = templateString;
                    locals.$scope = modal.scope; // !! controller必须在modal的scope下实例化
                    // 实例化controller
                    $controller(ctrlName, locals);
                    // TODO contollerAs?
                    /*
                     TODO
                     在link阶段，Controller被保存(.data方法)到element上，以便共享给其他directive，及
                     实现其他directive的require校验。ngView也会手动在link函数中，将route对应的controller实例
                     保存到element上。
                     */
                }
                typeof cb == "function" && cb(modal);
                modal.scope.$emit("modals.push", modal);
            });
        };

        // utils copied from angular.js
        var urlParsingNode = document.createElement("a");

        function urlResolve(url, appBase) {
            var href = url;
            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
                href: urlParsingNode.href,
                protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
                host: urlParsingNode.host,
                search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
                hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
                hostname: urlParsingNode.hostname,
                port: urlParsingNode.port,
                pathname: (urlParsingNode.pathname.charAt(0) === '/')
                    ? urlParsingNode.pathname
                    : '/' + urlParsingNode.pathname
            };
        }

        /**
         * Tries to decode the URI component without throwing an exception.
         *
         * @private
         * @param str value potential URI component to check.
         * @returns {boolean} True if `value` can be decoded
         * with the decodeURIComponent function.
         */
        function tryDecodeURIComponent(value) {
            try {
                return decodeURIComponent(value);
            } catch (e) {
                // Ignore any invalid uri component
            }
        }

        /**
         * Parses an escaped url query string into key-value pairs.
         * @returns Object.<(string|boolean)>
         */
        function parseKeyValue(/**string*/keyValue) {
            var obj = {}, key_value, key;
            angular.forEach((keyValue || "").split('&'), function (keyValue) {
                if (keyValue) {
                    key_value = keyValue.split('=');
                    key = tryDecodeURIComponent(key_value[0]);
                    if (angular.isDefined(key)) {
                        var val = angular.isDefined(key_value[1]) ? tryDecodeURIComponent(key_value[1]) : true;
                        if (!obj[key]) {
                            obj[key] = val;
                        } else if (angular.isArray(obj[key])) {
                            obj[key].push(val);
                        } else {
                            obj[key] = [obj[key], val];
                        }
                    }
                }
            });
            return obj;
        }

        /**
         * borrowed from https://github.com/angular/angular.js/blob/master/src/ngRoute/route.js
         * @param url
         * @returns {*}
         */
        function inherit(parent, extra) {
            return angular.extend(new (angular.extend(function () {
            }, {prototype: parent}))(), extra);
        }

        function parseAppUrl(relativeUrl, locationObj, appBase) {
            var prefixed = (relativeUrl.charAt(0) !== '/');
            if (prefixed) {
                relativeUrl = '/' + relativeUrl;
            }
            var match = urlResolve(relativeUrl, appBase);
            locationObj.$$path = decodeURIComponent(prefixed && match.pathname.charAt(0) === '/' ?
                match.pathname.substring(1) : match.pathname);
            locationObj.$$search = parseKeyValue(match.search);
            locationObj.$$hash = decodeURIComponent(match.hash);

            // make sure path starts with '/';
            if (locationObj.$$path && locationObj.$$path.charAt(0) != '/') {
                locationObj.$$path = '/' + locationObj.$$path;
            }
        }

        function switchRouteMatcher(on, route) {
            var keys = route.keys,
                params = {};

            if (!route.regexp) return null;

            var m = route.regexp.exec(on);
            if (!m) return null;

            for (var i = 1, len = m.length; i < len; ++i) {
                var key = keys[i - 1];

                var val = 'string' == typeof m[i]
                    ? decodeURIComponent(m[i])
                    : m[i];

                if (key && val) {
                    params[key.name] = val;
                }
            }
            return params;
        }

        function parseRoute(path) {
            // Match a route
            var params, match,
                loc = {},
                routes = $route.routes;
            parseAppUrl(path, loc);
            angular.forEach(routes, function (route, path) {
                if (!match && (params = switchRouteMatcher(loc.$$path, route))) {
                    match = inherit(route, {
                        params: angular.extend({}, loc.$$search, params),
                        pathParams: params});
                    match.$$route = route;
                }
            });
            // No route matched; fallback to "otherwise" route
            return match || routes[null] && inherit(routes[null], {params: {}, pathParams: {}});
        }
    }])

    .directive('popModal', ['Gesture','$rootScope', function (Gesture,$rootScope) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                var handler = function (e) {
                    e.stopPropagation();
                    $rootScope.$apply(function () {
                        $rootScope.$emit('modals.pop');
                    });
                };
                // ionic中事件监听的方式。实际上是Gesture.on()的快捷方式，后者又是Hammer.js的port
                ionic.on('tap', handler, $element[0]);
//              $element[0].addEventListener("touchend",handler);
//              setTimeout(handler,2000);
//              $element.bind('click',handler);     // 对header中的button和a有点问题，快速的点击只会触发active，不会click
            }
        };
    }])

    .directive('pushUrl', ['$route', '$location', 'TemplateLoader', '$controller', '$compile', '$routeParams', 'Modal',
        function ($route, $location, TemplateLoader, $controller, $compile, $routeParams, Modal) {
            return {
                restrict: 'A',
                /**
                 * pushUrl scope  (parent)
                 *      |
                 *      +-- modal scope & controller scope (child)
                 */
                link: function ($scope, $element, $attr) {
                    function tapHandler() {
                        Modal.fromUrl($attr.pushUrl.trim(),{
                            scope: $scope,
                            animation: $attr.modalAnimation
                        });
                    }

                    ionic.on('tap', tapHandler, $element[0]);
                }
            };
        }])

    .directive('ngTap', function() {
        return function(scope, element, attrs) {
            var tapping;
            tapping = false;
            element.bind('touchstart', function(e) {
                element.addClass('active');
                tapping = true;
            });
            element.bind('touchmove', function(e) {
                element.removeClass('active');
                tapping = false;
            });
            element.bind('touchend', function(e) {
                element.removeClass('active');
                if (tapping) {
                    scope.$apply(attrs['ngTap'], element);
                }
            });
        };
    });
;