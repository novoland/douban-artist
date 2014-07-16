.PHONY: help i a ab



help:
	@echo targets: i(iphone), a(android), ab(android-build)

i:
	cp lib/ios/cordova-2.7.0.js static/phonegap.js; python static/make.py

a:
	cp lib/android/phonegap-1.1.0.js static/phonegap.js; python static/make.py

ab: a
	cd ../..; ./build.sh
