var utils = require("utils.js");
var date = require("date.js");

// I have modified this from the original

var CookieAccessInfo=exports.CookieAccessInfo=function CookieAccessInfo(domain,path,secure,script) {
    if(this instanceof CookieAccessInfo) {
    	this.domain=domain||undefined;
    	this.path=path||"/";
    	this.secure=!!secure;
    	this.script=!!script;
    	return this;
    }
    else {
        return new CookieAccessInfo(domain,path,secure,script);
    }
};

var Cookie=exports.Cookie=function Cookie(cookiestr, defaults) {
	if(cookiestr instanceof Cookie) {
		return cookiestr;
	}
    else {
        if(this instanceof Cookie) {
            if(!defaults)
                defaults = cookiestr;
            this.name = defaults.name || null;
        	this.value = defaults.value || "";
        	this.expiration_date = defaults.expiration_date || Infinity; // means a session cookie
        	this.path = defaults.path || "/";
        	this.domain = defaults.domain || null;
        	this.secure = defaults.secure || false; //how to define?
        	this.noscript = defaults.noscript || false; //httponly
            this.creation_time = Date.now();
            this.last_accessed = Date.now();
        	if(cookiestr) {
                try {
                    cookieParse(cookiestr, this);
                } catch(e) {}
        	}
            this.rawHost = this.domain;
            if(this.domain && this.domain.indexOf("www") == 0){
                this.domain = this.domain.substring(this.domain.indexOf(".") + 1);
            }
            if(this.domain && this.domain.charAt(0) != "."){
                this.domain = "."+ this.domain;
            }
            if(this.rawHost && this.rawHost.charAt(0) == "."){
                this.rawHost = this.rawHost.substring(1);
            }
            this.expiry = this.expiration_date;
        	return this;
        }
        return new Cookie(cookiestr, defaults);
    }
};

var cookieToString=exports.cookieToString=function cookieToString(cookie) {
    if(cookie instanceof Array){
        return cookie.map(cookieToString).join(":");
    } else {
	    var str=[cookie.name+"="+cookie.value];
	    if(cookie.expiration_date !== Infinity) {
		    str.push("expires="+(date.Date.parse(cookie.expiration_date)).toGMTString());
	    }
	    if(cookie.domain) {
		    str.push("domain="+cookie.domain);
	    }
	    if(cookie.path) {
		    str.push("path="+cookie.path);
	    }
	    if(cookie.secure) {
		    str.push("secure");
	    }
	    if(cookie.noscript) {
		    str.push("httponly");
	    }
	    return str.join("; ");
    }
};

var cookieToValueString=exports.cookieToValueString = function cookieToValueString(cookie) {
    if(cookie instanceof Array){
        return cookie.map(cookieToValueString).join("; ");
    } else {
	    return cookie.name+"="+cookie.value;
    }
};

var cookie_str_splitter=/[:](?=\s*[a-zA-Z0-9_\-]+\s*[=])/g;
var cookieParse=exports.cookieParse = function cookieParse(str, cookie) {
	if(cookie instanceof Cookie) {
    	var parts=str.split(";").filter(function(value){return !!value;})
    	, pair=parts[0].match(/([^=]+)=((?:.|\n)*)/);
        if(!pair){
            return cookie;
        }
    	var key=pair[1];
    	var value=pair[2];
    	cookie.name = key;
    	cookie.value = value;
        
    	for(var i=1;i<parts.length;i++) {
    		pair=parts[i].match(/([^=]+)(?:=((?:.|\n)*))?/)
    		, key=pair[1].trim().toLowerCase()
    		, value=pair[2];
    		switch(key) {
    		case "httponly":
    			cookie.noscript = true;
    			break;
    		case "expires":
                cookie.expiration_date = value
    				? date.Date.parse(value).getTime()
    				: Infinity;
                if(isNaN(cookie.expiration_date)){
                    console.warn("cookie_date_parse", value);
                    cookie.expiration_date = Infinity;
                }
                break;
    		case "path":
    			cookie.path = value
    				? value.trim()
    				: cookie.path;
    			break;
    		case "domain":
    			cookie.domain = value
    				? value.trim()
    				: cookie.domain;
    			break;
    		case "secure":
                cookie.secure = true;
    			break;
            case "max-age":
                cookie.expiration_date = parseInt(value)
                    ? new Date(Date.now() + 1000*parseInt(value)).getTime()
                    : Infinity;
                break;
            }
    	}
        return cookie;
    }
    return cookieParse( str, new Cookie() );
};

var cookieMatches=exports.cookieMatches = function cookieMatches(access_info, cookie) {
    
	if(cookie.noscript && access_info.script
	   || cookie.secure && !access_info.secure
	   || !cookieCollidesWith(access_info, cookie)) {
        return false;
	}
    return true;
};

var cookieCollidesWith=exports.cookieCollidesWith = function cookieCollidesWith(access_info, cookie) {
    var access_is_cookie = false;
    if(access_info instanceof Cookie){
        access_is_cookie = true;
    }
    if((cookie.path && !access_info.path) || 
       (cookie.domain && !access_info.domain)) {
        return false;
	}
	if(cookie.path && access_info.path.indexOf(cookie.path) !== 0) {
		return false;
	}
	if (cookie.domain===access_info.domain) {
		return true;
	}
	else if(cookie.domain && cookie.domain.charAt(0)===".")
	{
		var wildcard=access_info.domain.indexOf(cookie.domain.slice(1));
		if(wildcard===-1 || wildcard!==access_info.domain.length-cookie.domain.length+1) {
			return false;
		}
	}
	else if(cookie.domain){
		return false;
	}
	return true;
};

var setCookie=exports.setCookie=function setCookie(cookie,cookies,collision_callback) {
    cookie = Cookie(cookie);
    //Delete the cookie if the set is past the current time
    var remove = cookie.expiration_date <= Date.now();
    if(cookie.domain in cookies){
    	var cookies_list = cookies[cookie.domain];
    	for(var i=0;i<cookies_list.length;i++) {
    		var collidable_cookie = cookies_list[i];
            if(cookieCollidesWith(cookie, collidable_cookie) &&
               cookie.name == collidable_cookie.name) {
                if(collision_callback){
                    collision_callback(cookie, collidable_cookie);
                }
                if(remove) {
    				cookies_list.splice(i,1);
    				if(cookies_list.length===0) {
    					delete cookies[cookie.domain];
    				}
                    return false;
    			}
    			else {
                    cookies_list[i]=cookie;
                    return cookie;
    			}
    		}
    	}
    	if(remove) {
            return false;
    	}
        cookies_list.push(cookie);
    	return cookie;
    }
    else if(remove){
        return false;
    }
    else {
        return cookies[cookie.domain]=[cookie];
    }
};
//returns a cookie
var getCookie=exports.getCookie=function getCookie(cookie_name,access_info,cookies) {
    var cookies_list = cookies[cookie_name];
    var cookies_ans = [];
    if (!cookies_list) return null;
    for(var i=0;i<cookies_list.length;i++) {
    	var cookie = cookies_list[i];
    	if(cookie.expiration_date <= Date.now()) {
    		if(cookies_list.length===0) {
    			delete cookies[cookie_name];
    		}
    		continue;
    	}
    	if(cookieMatches(access_info, cookie)) {
            cookie.last_accessed = Date.now();
    		cookies_ans.push(cookie);
    	}
    }
    return cookies_ans;
};
//returns a list of cookies
var getCookies=exports.getCookies = function getCookies(access_info,cookies) {
    var matches=[];
    var checkHost = utils.normalize_host(access_info.domain);
    if(checkHost.charAt(0) != ".")
        checkHost = "." + checkHost;
    while(checkHost.indexOf(".", 1) != -1){
        var ans_cookie=getCookie(checkHost,access_info,cookies);
    	if (ans_cookie) {
    		matches = matches.concat(ans_cookie);
        }
        checkHost = checkHost.substring(checkHost.indexOf(".", 1));
    }
    return matches;
};

//returns list of cookies that were set correctly. Cookies that are expired and removed are not returned.
var setCookies=exports.setCookies = function setCookies(cookies, jar) {
	cookies=Array.isArray(cookies)
		?cookies
		:cookies.split(cookie_str_splitter);
	var successful=[];
	for(var i=0;i<cookies.length;i++) {
		var cookie = Cookie(cookies[i]);
		if(setCookie(cookie,jar)) {
			successful.push(cookie);
		}
	}
	return successful;
};

var deleteSessionCookies=exports.deleteSessionCookies= function(jar){
    for(var key in jar){
        if( ! (key in jar)) continue;
        for( var i = 0; i < jar[key].length; ++i ){
            if(jar[key][i].expiration_date == Infinity ||
               jar[key][i].expiration_date <= Date.now()){
                jar[key].splice(i--,1);
            }
        }
        if(jar[key].length == 0){
            delete jar[key];
            continue;
        }
    }
};

var deleteLeastRecentOverN =
    exports.deleteLeastRecentOverN =
    function deleteLeastRecentOverN(jar, n){
        var to_delete = [];
        for(var key in jar){
            to_delete = to_delete.concat(jar[key]);
        }
        to_delete.sort(function(a,b){
            return a.last_accessed > b.last_accessed;
        });
        var delete_n = to_delete.length - n;
        if(delete_n > 0){
            utils.debug("deleting cookies", delete_n);
            for(var ind = 0; ind < delete_n; ind++){
                var cookie = to_delete[ind];
                var bucket = jar[cookie.domain];
                for(var j = 0; j < bucket.length; j++){
                    if(bucket[j] == cookie){
                        bucket.splice(j--,1);
                        if(bucket.length == 0){
                            delete jar[cookie.domain];
                        }
                        break;
                    }
                }
            }
            utils.debug("deleted cookies", delete_n);
        }
    };

var limitCookiesFromHost =
    exports.limitCookiesFromHost =
    function limitCookiesFromHost(jar, n){
        utils.debug("limiting cookies from host");
        for(var key in jar){
            if(jar[key].length > n){
                jar[key].sort(function(a,b){
                    return a.last_accessed < b.last_accessed;
                });
                utils.debug("deleted", n - jar[key].length, "from", key);
                jar[key] = jar[key].slice(0,n);
            }
        }
    };

var splitCookieString=exports.splitCookieString=function (cookie_str){
    return cookie_str.split("\n");
};
