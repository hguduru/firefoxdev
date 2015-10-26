var date = require("datejs");
var storage = require("./storage.js");
var utils = require("./utils.js");
// var cookie_manager = require("./cookie_manager.js");
var pref_utils = require("./my_pref_utils.js");
// var persona = require("./persona.js");
var persona_manager = require("./persona_manager").manager();
var my_tabs = require("./my_tabs");
var performance = require("./performance.js");

var timers = require("sdk/timers.js");
var {Cc, Ci} = require("chrome");

var timer_id = -1;
var cookie_db = null;
var cookie_cache_db = null;

// TODO: emit cookie db on change events

var created = {};
var hosts_in_cache = {};

function createStatement(name, query_text, use_persistent){
    var ans = null;
    if(use_persistent && query_text)
        name = name + "$";
    if(name in created){
        return created[name];
    } else {
        var str = query_text;
        if(!query_text){
            str = name;
        }
        try {
            if(use_persistent){
                ans = cookie_db.createStatement(str);
            } else {
                ans = cookie_cache_db.createStatement(str);
            }
            if(query_text)
                created[name] = ans;
        } catch (e) {
            console.error("SQL error", query_text, e.toString(), cookie_db.lastError, cookie_db.lastErrorString);
        }
    }
    return ans;
}

function flush_changes(){
    for(var jarid in hosts_in_cache){
        for(var host in hosts_in_cache[jarid]){
            if(hosts_in_cache[jarid][host]){
                var del_host_pers = createStatement("delete_host", "DELETE FROM cookies WHERE domain = :domain AND jarid = :jarid", true);
                del_host_pers.params.domain = host;
                del_host_pers.params.jarid = jarid;
                del_host_pers.executeAsync();
                var del_storage_pers = createStatement("delete_host_storage", "DELETE FROM localstore WHERE domain = :domain AND jarid = :jarid", true);

                var changed_cookies = createStatement("changed_cookies", "SELECT * FROM cookies WHERE domain = :domain AND jarid = :jarid");
                changed_cookies.params.domain = host;
                changed_cookies.params.jarid = jarid;
                while(changed_cookies.step()){
                    var cookie = cookieFromRow(changed_cookies.row);
                    setCookie(cookie, jarid, true);
                }

                var changed_local_stores = createStatement("changed_local_storage", "SELECT * FROM localstore WHERE domain = :domain AND jarid = :jarid");
                changed_local_stores.params.jarid = jarid;
                changed_local_stores.params.domain = host;
                while(changed_local_stores.step()){
                    var store_key = {
                        "host" : changed_local_stores.row.domain,
                        "scheme" : changed_local_stores.row.scheme,
                        "port" : changed_local_stores.row.port,
                        "sessionId" : changed_local_stores.row.sessionId
                    };
                    setStorage(store_key, jarid,
                               changed_local_stores.row.key,
                               changed_local_stores.row.value, true);
                }
            }
            hosts_in_cache[jarid][host] = false;
        }
    }
}

function bring_into_cache(host, jarid){
    if(!(jarid in hosts_in_cache)){
        hosts_in_cache[jarid] = {};
    }
    hosts_in_cache[jarid][host] = false;
    var get_orig_cookies = createStatement("get_orig_cookies", "SELECT * FROM cookies WHERE domain = :domain AND jarid = :jarid", true);
    get_orig_cookies.params.domain = host;
    get_orig_cookies.params.jarid = jarid;
    while(get_orig_cookies.step()){
        var cookie = cookieFromRow(get_orig_cookies.row);
        setCookie(cookie, jarid);
    }
    var get_orig_storage = createStatement("get_orig_store", "SELECT * FROM localstore WHERE domain = :domain AND jarid = :jarid", true);
    get_orig_storage.params.domain = host;
    get_orig_storage.params.jarid = jarid;
    while(get_orig_storage.step()){
        var store_key = {
            "host" : get_orig_storage.row.domain,
            "scheme" : get_orig_storage.row.scheme,
            "port" : get_orig_storage.row.port,
            "sessionId" : get_orig_storage.row.sessionId
        };
        setStorage(store_key, jarid,
                   get_orig_storage.row.key,
                   get_orig_storage.row.value);
    }
}

function assure_in_cache(domain, jarid){
    if(jarid in hosts_in_cache){
        if(domain in hosts_in_cache[jarid]){
            return;
        }
    }
    var time = Date.now();
    bring_into_cache(domain, jarid);
}

function mark_changed_in_cache(domain, jarid){
    if(!(jarid in hosts_in_cache)){
        hosts_in_cache[jarid] = {};
    }
    hosts_in_cache[jarid][domain] = true;
}

function CookieAccessInfo(domain,path,secure,script) {
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

function Cookie(cookiestr, defaults) {
    if(cookiestr instanceof Cookie) {
        return cookiestr;
    } else {
        if(this instanceof Cookie) {
            this.name = defaults.value || null;
            this.value = defaults.value || "";
            this.expiration_date = defaults.expiration_date || -1; // means a session cookie
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
            if(this.domain && this.domain.indexOf("http://") == 0){
                this.domain = this.domain.substring("http://".length);
            }
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

function cookieToString(cookie){
    if(cookie instanceof Array){
        return cookie.map(cookieToString).join(":");
    } else {
        var str=[cookie.name+"="+cookie.value];
        if(cookie.expiration_date !== -1) {
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

function cookieToValueString(cookie) {
    if(cookie instanceof Array){
        var strs = cookie.map(cookieToValueString);
        var arr_sort = strs.sort(function(a, b){
            return a.length > b.length;
        });
        var ans = arr_sort.join("; ");
        return ans;
    } else {
        return cookie.name+"="+cookie.value;
    }
};

var cookie_str_splitter=/[:](?=\s*[a-zA-Z0-9_\-]+\s*[=])/g;
function cookieParse(str, cookie){
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
                    : -1;
                if(isNaN(cookie.expiration_date)){
                    console.warn("cookie_date_parse", value);
                    cookie.expiration_date = -1;
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
                    : -1;
                break;
            }
        }
        return cookie;
    }
    return cookieParse( str, new Cookie() );
};

function RowIterator(jarid){
    this.statement = createStatement("all_cookies", "SELECT * FROM cookies WHERE jarid = :jarid AND (expiration_date >= :now OR expiration_date = -1)", true);
    this.statement.params.jarid = jarid;
    this.statement.params.now = Date.now();
    this.hasMore = true;
    this.advance = true;
}

RowIterator.prototype.next = function(){
    var ans = null;
    try {
        ans = cookieFromRow(this.statement.row);
    } catch(e) {
        console.warn("Row iterator sql error", e.toString());
    }
    this.advance = true;
    return ans;
};

RowIterator.prototype.hasNext = function(){
    var ans = false;
    if(!this.advance){
        return this.hasMore;
    }
    try {
        ans = this.statement.step();
    } catch(e) {
        console.warn("Row iterator sql error", e.toString());
    }
    this.hasMore = ans;
    this.advance = false;
    if(!this.hasMore){
        this.statement.reset();
    }
    return ans;
};

function setCookie(cookie, jar, is_persistent){
    assure_in_cache(cookie.domain, jar);
    mark_changed_in_cache(cookie.domain, jar);
    var remove = false;
    if(cookie.expiration_date <= Date.now() && cookie.expiration_date != -1){
        var del_cookie_statement = createStatement("set_cookie_delete", "DELETE FROM cookies WHERE :jarid = jarid AND :name = name AND (:path GLOB path || '*') AND domain = :domain", is_persistent);
        try {
            del_cookie_statement.params.jarid = jar;
            del_cookie_statement.params.name = cookie.name;
            del_cookie_statement.params.path = cookie.path;
            del_cookie_statement.params.domain = cookie.domain;
        } catch(e){
            console.warn("Query error", e.toString(), cookie);
        }

        try {
            del_cookie_statement.executeAsync();
        } catch(e) {
            console.warn("Cookie set error", e.toString());
        } finally {
            del_cookie_statement.reset();
        }
        remove = true;
    } else {
        var set_cookie_statement = createStatement("set_cookie", "INSERT INTO cookies (jarid, name, value, expiration_date, path, domain, secure, noscript, creation_time, last_accessed, expiry, rawhost) VALUES (:jarid, :name, :value, :expiration_date, :path, :domain, :secure, :noscript, :creation_time, :last_accessed, :expiry, :rawhost)", is_persistent);
        try {
            set_cookie_statement.params.value = cookie.value;
            set_cookie_statement.params.expiration_date = cookie.expiration_date;
            set_cookie_statement.params.secure = cookie.secure ? 1 : 0;
            set_cookie_statement.params.noscript = cookie.noscript ? 1 : 0;
            set_cookie_statement.params.creation_time = cookie.creation_time;
            set_cookie_statement.params.last_accessed = cookie.last_accessed;
            set_cookie_statement.params.expiry = cookie.expiry;
            set_cookie_statement.params.rawhost = cookie.rawHost;
            set_cookie_statement.params.jarid = jar;
            set_cookie_statement.params.name = cookie.name;
            set_cookie_statement.params.path = cookie.path;
            set_cookie_statement.params.domain = cookie.domain;
        } catch(e){
            console.warn("Query error", e.toString(), cookie, jar);
        }
        try {
            set_cookie_statement.executeAsync();
        } catch(e) {
            console.warn("Cookie set error", e.toString(), cookie);
        }
    }
    return remove;
}

function cookieFromRow(row){
    var cookie = {
        "name" : row.name,
        "value" : row.value,
        "domain" : row.domain,
        "path" : row.path,
        "expiration_date" : row.expiration_date,
        "secure" : !!row.secure,
        "noscript" : !!row.noscript,
        "creation_time" : row.creation_time,
        "last_accessed" : row.last_accessed,
        "expiry" : row.expiry,
        "rawHost" : row.rawhost
    };
    return cookie;
}

function cookieFromRowAsync(row){
    var cookie = {
        "name" : row.getResultByName("name"),
        "value" : row.getResultByName("value"),
        "domain" : row.getResultByName("domain"),
        "path" : row.getResultByName("path"),
        "expiration_date" : row.getResultByName("expiration_date"),
        "secure" : !!row.getResultByName("secure"),
        "noscript" : !!row.getResultByName("noscript"),
        "creation_time" : row.getResultByName("creation_time"),
        "last_accessed" : row.getResultByName("last_accessed"),
        "expiry" : row.getResultByName("expiry"),
        "rawHost" : row.getResultByName("rawhost")
    };
    return cookie;
}

function make_get_cookie_statement(checkHost, access_info, jar, now, st){
    var key;
    if(st){
        key = "get_cookie_sync";
    } else {
        key = "get_cookie_asycn";
    }
    var get_cookie_statement = createStatement(key, "SELECT * FROM cookies WHERE domain = :domain_name AND jarid = :jar_num AND (:path_prefix GLOB path || '*') AND (noscript = 0 OR :script = 0) AND (secure = 0 OR :secure = 1) AND (expiration_date >= :now OR expiration_date = -1)");
    try {
        get_cookie_statement.params.domain_name = checkHost;
        get_cookie_statement.params.path_prefix = access_info.path;
        get_cookie_statement.params.jar_num = jar;
        get_cookie_statement.params.script = access_info.script ? 1 : 0;
        get_cookie_statement.params.secure = access_info.secure ? 1 : 0;
        get_cookie_statement.params.now = now;
    } catch(e){
        console.warn("Query error", e.toString(), jar, access_info);
    }
    return get_cookie_statement;
}

function GetHandler(cb, hosts, access_info, jar){
    this.matches = [];
    this.update_stale = false;
    this.cb = cb;
    this.completed = 0;
    this.hosts = hosts;
    this.access_info = access_info;
    this.jar = jar;
};

GetHandler.prototype.handleResult = function(resSet){
    for(var row = resSet.getNextRow(); row;
        row = resSet.getNextRow()){
        var to_add = cookieFromRowAsync(row);
        // check whether cookie is stale
        if (to_add.last_accessed <= Date.now() - 1000*60*20) {
            this.update_stale = true;
        }
        this.matches.push(to_add);
    }
};

GetHandler.prototype.handleError = function(aError){
    console.error("Get cookie error", aError// , hosts,
                  // access_info, jar
                 );
    this.cb([]);
};

GetHandler.prototype.handleCompletion = function(aReason){
    if(aReason !=
       Ci.mozIStorageStatementCallback.REASON_FINISHED){
        console.warn("Get cookie canceled or aborted",
                     aReason);
    }
    this.completed += 1;
    if(this.completed == this.hosts.length){
        this.cb(this.matches);
        if(this.update_stale){
            update_time_hosts(this.hosts, this.access_info, this.jar);
        }
    }
};

function getCookiesAsync(hosts, access_info, jar, cb){
    var matches = [];
    var now = Date.now();
    var update_stale = false;
    var completed = 0;
    if(hosts.length == 0){
        cb([]);
        return;
    }
    var handler = new GetHandler(cb, hosts, access_info, jar);
    for(var i in hosts){
        var checkHost = hosts[i];
        var get_cookie_statement = make_get_cookie_statement(checkHost,
                                                             access_info,
                                                             jar,
                                                             now,
                                                             true);
        get_cookie_statement.executeAsync(handler);
    }
}

function getCookiesSync(hosts, jar, access_info, dont_update_accessed){
    var matches=[];
    var now = Date.now();
    var update_stale = false;
    for(var i in hosts){
        var checkHost = hosts[i];
        var get_cookie_statement = make_get_cookie_statement(checkHost, access_info, jar, now, false);
        try {
            while (get_cookie_statement.step()) {
                var to_add = cookieFromRow(get_cookie_statement.row);
                // check whether cookie is stale
                if (to_add.last_accessed <= Date.now() - 1000*60*20) {
                    update_stale = true;
                }
                matches.push(to_add);
            }
        } catch(e) {
            console.warn("Cookie get error", e.toString());
        } finally {
            get_cookie_statement.reset();
        }
    }
    if(!dont_update_accessed && update_stale)
        update_time_hosts(hosts, access_info, jar);

    return matches;
}

function update_time_hosts(hosts, access_info, jar){
    var now = Date.now();
    hosts.forEach(function(checkHost){
        var update_accessed_statement = createStatement("update_timeout", "UPDATE cookies SET last_accessed = :now WHERE domain = :domain_name AND jarid = :jar_num AND (:path_prefix GLOB path || '*') AND (noscript = 0 OR :script = 0) AND (secure = 0 OR :secure = 1) AND (expiration_date >= :now OR expiration_date = -1)");
        update_accessed_statement.params.domain_name = checkHost;
        update_accessed_statement.params.path_prefix = access_info.path;
        update_accessed_statement.params.jar_num = jar;
        update_accessed_statement.params.script = access_info.script ? 1 : 0;
        update_accessed_statement.params.secure = access_info.secure ? 1 : 0;
        update_accessed_statement.params.now = now;
        update_accessed_statement.executeAsync();
    });
}

function getCookies(access_info, jar, dont_update_accessed, cb){
    var matches=[];
    var checkHost = utils.normalize_host(access_info.domain);
    if(checkHost.charAt(0) != ".")
        checkHost = "." + checkHost;
    var hosts = [];
    while(checkHost.indexOf(".", 1) != -1){
        hosts.push(checkHost);
        checkHost = checkHost.substring(checkHost.indexOf(".", 1));
        assure_in_cache(checkHost, jar);
    }
    if(cb){
        getCookiesAsync(hosts, access_info, jar, cb);
        return null;
    } else {
        return getCookiesSync(hosts, jar, access_info, dont_update_accessed);
    }
}

function getCookieStringAsync(access, jarid, cb){
    getCookies(access, jarid, false, function(cookies){
        var cookie_str = cookieToValueString(cookies);
        cb(cookie_str);
    });
}

function getCookieString(access, jarid){
    var cookies = getCookies(access, jarid);
    var cookie_str = cookieToValueString(cookies);
    return cookie_str;
}

function deleteSessionCookies(){
    var statement = createStatement("DELETE FROM cookies WHERE expiration_date = -1 OR expiration_date < :now", null, true);
    statement.params.now = Date.now();
    try {
        statement.execute();
    } catch(e){
        console.warn("Delete session cookie error", e.toString());
    } finally {
        statement.finalize();
    }
}

function deleteLeastRecent(n, conditions){
    var query = "SELECT * FROM cookies";
    if(conditions){
        query += " WHERE ";
        var conds = [];
        for(var key in conditions){
            conds.push(key+" = :"+key);
        }
        query += conds.join(" AND ") + " ";
    }
    query += " ORDER BY last_accessed ASC LIMIT :num";
    var statement = createStatement(query, null, true);
    for(var key in conditions){
        statement.params[key] = conditions[key];
    }
    statement.params.num = n;
    var to_delete = [];
    try {
        while(statement.step()){
            to_delete.push({
                name : statement.row.name,
                domain : statement.row.domain,
                jarid : statement.row.jarid,
                path : statement.row.path});
        }
    } catch(e) {
        console.warn("Delete err");
    } finally {
        statement.finalize();
    }
    to_delete.forEach(function(e){
        deleteCookie(e, null, true);
    });
}

function deleteLeastRecentOverN(jarid, num){
    var count = createStatement("Select count(*) FROM cookies WHERE jarid = :jarid", null, true);
    count.params.jarid = jarid;
    var total_num = 0;
    try {
        while(count.step()){
            total_num = count.row[count.getColumnName(0)];
        }
    } catch(e){
        console.warn("Counting error", e.toString(), count.columnCount);
    } finally {
        count.finalize();
    }
    if(total_num - num > 0){
        deleteLeastRecent(total_num - num);
    }
}

function limitStorageFromHost(jar, num){
    // TODO
    var size = createStatement("SELECT domain, LENGTH(key) + LENGTH(value) AS size FROM localstore");
    var total_size_domain = {};
    try {
        while(size.step()){
            if(!(size.row.domain in total_size_domain)){
                total_size_domain[size.row.domain] = 0;
            }
            total_size_domain[size.row.domain] += size.row.size;
        }
    } catch(e){
        console.warn("Sizing error", e.toString(), size.columnCount);
    } finally {
        size.finalize();
    }
    var del = createStatement("DELETE FROM localstore WHERE domain = :domain");
    for(var domain in total_size_domain){
        if(total_size_domain[domain] > num){
            try{
                del.params.domain = domain;
                del.execute();
            } catch(e){
                console.warn("Error deleting", domain, "from localstore");
            }
        }
    }
    del.finalize();
}

function limitCookiesFromHost(jar, num){
    var statement = createStatement("SELECT domain, Count(domain) AS num_cookies FROM cookies WHERE jarid = :jarid GROUP BY domain");
    statement.params.jarid = jar;
    var to_delete = {};
    try {
        while(statement.step()){
            var num_cookies = statement.row.num_cookies;
            if(num_cookies > num){
                to_delete[statement.row.domain] = num_cookies - num;
            }
        }
    } catch(e) {
        console.warn("Limit cookies query error", e);
    } finally {
        statement.finalize();
    }
    for(var domain in to_delete){
        deleteLeastRecent(to_delete[domain], { "domain" : domain,
                                               "jarid" : jar });
    }
}

function deleteAll(jar){
    var statement = createStatement("DELETE FROM cookies WHERE jarid = :jarid");
    var statement_per = createStatement("DELETE FROM cookies WHERE jarid = :jarid", true);
    statement.params.jarid = jar;
    statement_per.params.jarid = jar;
    try {
        statement.execute();
        statement_per.execute();
    } catch(e) {
        console.warn("Delete all cookies error", e.toString(), jar);
    } finally {
        statement.finalize();
        statement_per.finalize();
    }
    cookie_manager.emit_cookie_changed("reload");
    cookie_manager.emit_cookie_changed("cleared");
}

function cookieExists(cookie_key, jarid){
    assure_in_cache(cookie_key.domain, jarid);
    var statement = createStatement("SELECT * FROM cookies WHERE jarid = :jarid AND domain = :domain AND path = :path AND name = :name");
    statement.params.domain = cookie_key.domain;
    statement.params.path = cookie_key.path;
    statement.params.jarid = jarid;
    statement.params.name = cookie_key.name;
    var ans = false;
    try {
        statement.step();
        ans = statement.rowCount;
    } catch(e){
        console.warn("Delete cookies accessinfo error", e.toString(), cookie_key, jarid);
    } finally {
        statement.finalize();
    }
}

function deleteCookie(cookie_key, jarid, persistent){
    var delete_cookie_statement = createStatement("delete_cookie", "DELETE FROM cookies WHERE jarid = :jarid AND domain = :domain AND (path = :path OR :path IS NULL) AND (name = :name OR :name IS NULL)", persistent);

    delete_cookie_statement.params.domain = cookie_key.domain;
    delete_cookie_statement.params.path = cookie_key.path;
    delete_cookie_statement.params.jarid = jarid || cookie_key.jarid;
    delete_cookie_statement.params.name = cookie_key.name;
    try {
        delete_cookie_statement.execute();
    } catch(e){
        console.warn("Delete cookies accessinfo error", e.toString(), cookie_key, jarid);
    } finally {
        delete_cookie_statement.reset();
    }
}

exports.CookieAccessInfo = CookieAccessInfo;
exports.Cookie = Cookie;

exports.setCookie = setCookie;
exports.getCookies = getCookies;
exports.getCookieString = getCookieString;
exports.getCookieStringAsync = getCookieStringAsync;

exports.cookieIterator = RowIterator;
exports.deleteAll = deleteAll;
exports.deleteCookie = deleteCookie;

var get_all_store_statement = null;

function store_key_params(statement, store_key, jarid){
    try {
        statement.params.host = store_key.host;
        statement.params.scheme = store_key.scheme;
        statement.params.port = store_key.port;
        statement.params.jarid = jarid;
        statement.params.sessionId = store_key.sessionId;
    } catch(e){
        console.warn("store_key err", e.toString());
    }
}

function store_key_sql(both){
    return " domain = :host AND port = :port AND scheme = :scheme AND jarid = :jarid  AND " +
        (both ?
         "(sessionId = -1 OR sessionId = :sessionId)" :
         "sessionId = :sessionId");
};

function getAllLocalStorage(store_key, jarid){
    var get_all_store_statement = createStatement("get_all_storage",
                                                  "SELECT * FROM localstore WHERE "+store_key_sql(true), true);

    store_key_params(get_all_store_statement, store_key, jarid);
    var ans = {
        "session" : {},
        "local" : {}
    };
    try {
        while(get_all_store_statement.step()){
            var which = get_all_store_statement.row.sessionId == -1 ? "local" : "session";
            ans[which][get_all_store_statement.row.key] = JSON.parse(get_all_store_statement.row.value);
        }
    } catch(e){
        console.warn("Get Storage error", e.toString(), store_key, jarid);
    } finally {
        get_all_store_statement.reset();
    }
    return ans;
}

var clear_store_statement = null;

function deleteAllStorage(jar){
    var statement = createStatement("DELETE FROM localstore WHERE jarid = :jarid", true);
    var statement_per = createStatement("DELETE FROM localstore WHERE jarid = :jarid", true);
    statement.params.jarid = jar;
    statement_per.params.jarid = jar;
    try {
        statement.execute();
        statement_per.execute();
    } catch(e) {
        console.warn("Delete all cookies error", e.toString(), jar);
    } finally {
        statement.finalize();
        statement_per.finalize();
    }
}

function getStorage(store_key, jarid, key){
    // assure_in_cache(store_key.host, jarid);
    var get_store_statement = createStatement("get_store_key", "SELECT value FROM localstore WHERE "+store_key_sql(false)+" AND key = :key", true);
    store_key_params(get_store_statement, store_key, jarid);
    get_store_statement.params.key = key;
    var ans = null;
    try {
        while(get_store_statement.step()){
            ans = JSON.parse(get_store_statement.row.value);
        }
    } catch(e){
        console.warn("get store error", e.toString(), cookie_db.lastError, cookie_db.lastErrorString);
    } finally {
        get_store_statement.reset();
    }
    return ans;
}

function clearStorage(store_key, jarid){
    // assure_in_cache(store_key.host, jarid);
    // mark_changed_in_cache(store_key.host, jarid);
    var clear_store_statement = createStatement("clear_storage", "DELETE FROM localstore WHERE "+store_key_sql(false), true);
    store_key_params(clear_store_statement, store_key, jarid);
    try {
        clear_store_statement.executeAsync();
    } catch(e){
        console.warn("Clear Storage error", e.toString(), store_key, jarid);
    }
}

var set_store_statement = null;

function setStorage(store_key, jarid, key, value// , is_persistent
                   ){
                       // assure_in_cache(store_key.host, jarid);
                       // mark_changed_in_cache(store_key.host, jarid);
                       var set_store_statement = createStatement("set_storage", "INSERT INTO localstore (jarid, key, value, scheme, domain, port, sessionId) VALUES (:jarid, :key, :value, :scheme, :host, :port, :sessionId)", true);
                       store_key_params(set_store_statement, store_key, jarid);
                       set_store_statement.params.key = key;
                       set_store_statement.params.value = JSON.stringify(value);
                       try {
                           set_store_statement.executeAsync();
                       } catch(e) {
                           console.warn("Set store error", e.toString(), store_key, jarid, key, value);
                       }
                   }

var remove_store_statement = null;

function removeStorage(store_key, jarid, key){
    // assure_in_cache(store_key.host, jarid);
    // mark_changed_in_cache(store_key.host, jarid);
    var remove_store_statement = createStatement("remove_storage", "DELETE FROM localstore WHERE "+store_key_sql(false)+ " AND key = :key", true);
    store_key_params(remove_store_statement, store_key, jarid);
    remove_store_statement.params.key = key;

    try {
        remove_store_statement.executeAsync();
    } catch(e) {
        console.error("Remove store error", e.toString(), store_key, jarid, key);
    }
}

function deleteSessionStore(id){
    var statement = null;
    if(id){
        statement = createStatement("delete_session_storage", "DELETE FROM localstore WHERE sessionId = :sessionId", true);
        statement.params.sessionId = id;
    } else {
        statement = createStatement("delete_local_storage", "DELETE FROM localstore WHERE sessionId != -1", true);
    }
    try {
        statement.executeAsync();
    } catch(e) {
        console.error("Remove session store error", e.toString(), id);
    }
}
// ORDER BY key;
function getStorageKeys(store_key, jarid, arg){
    // assure_in_cache(store_key.host, jarid);
    var get_key_stmt = createStatement("get_store_num_keys", "SELECT key, value FROM localstore WHERE "+store_key_sql(false) +" LIMIT 1 OFFSET :arg", true);
    store_key_params(get_key_stmt, store_key, jarid);
    get_key_stmt.params.arg = arg;
    var ans = null;
    try {
        while(get_key_stmt.step()){
            ans = get_key_stmt.row.key;
        }
    } catch(e){
        console.warn("get key error", e.toString(), cookie_db.lastError, cookie_db.lastErrorString);
    } finally {
        get_key_stmt.reset();
    }
    return ans;
}

function getStorageLength(store_key, jarid){
    // assure_in_cache(store_key.host, jarid);
    var get_store_statement = createStatement("get_store_length", "SELECT key, value FROM localstore WHERE "+store_key_sql(false), true);
    store_key_params(get_store_statement, store_key, jarid);
    var count = 0;
    try {
        while(get_store_statement.step()){
            count += 1;
        }
    } catch(e){
        console.warn("get store error", e.toString(), cookie_db.lastError, cookie_db.lastErrorString);
    } finally {
        get_store_statement.reset();
    }
    return count;
}

exports.getStorage = getStorage;
exports.getStorageKeys = getStorageKeys;
exports.getStorageLength = getStorageLength;
exports.clearStorage = clearStorage;
exports.setStorage = setStorage;
exports.removeStorage = removeStorage;
exports.getAllLocalStorage = getAllLocalStorage;

var splitCookieString=exports.splitCookieString=function (cookie_str){
    return cookie_str.split("\n");
};

function on_persona_deleted(event){
    var type = event.subject.type;
    if(event.type == "delete"){
        var aPersona = event.subject.target;
        for(var ctx in aPersona.ctxs){
            var aCtx = aPersona.ctxs[aCtx];
            deleteAll(aCtx.cookies);
            deleteAllStorage(aCtx.id);
        }
    }
}


function cookieFromFFCookie(ffcookie){
    var ans = {
        "domain" : ffcookie.host,
        "name" : ffcookie.name,
        "path" : ffcookie.path,
        "value" : ffcookie.value,
        "secure" : ffcookie.isSecure,
        "expiration_date" : ffcookie.expires * 1000,
        "creation_time" : Math.floor(ffcookie.creationTime / 1000),
        "expiry" : ffcookie.expiry * 1000,
        "noscript" : ffcookie.isHttpOnly,
        "last_accessed" : Math.floor(ffcookie.lastAccessed / 1000),
        "rawHost" : ffcookie.rawHost
    };
    if(ffcookie.isSession){
        ans.expiration_date = -1;
    }
    if(ans.domain.charAt(0) != "."){
        ans.domain = "."+ans.domain;
    }
    return ans;
}

function do_migrate(to_persona){
    var url = utils.url_from_string(my_tabs.active_url());
    var host = url.host;
    if(host.indexOf("www") == 0)
        host = host.substring(host.indexOf(".")+1);
    var orig_host = host;
    if(host.charAt(0) != ".")
        host = "." + host;
    while(host.indexOf(".", 1) != -1){
        var update_accessed_statement = createStatement("migrate_stmt", "UPDATE cookies SET jarid = :jar WHERE domain = :domain_name AND jarid = -1");
        update_accessed_statement.params.domain_name = host;
        update_accessed_statement.params.jar = to_persona;
        update_accessed_statement.execute();
        update_accessed_statement.reset();
        host = host.substring(host.indexOf(".", 1));
    }
}
exports.do_migrate = do_migrate;

function add_migrate(cookie){
    var fromffcookie = cookieFromFFCookie(cookie);
}

exports.from_migrate = add_migrate;

exports.onload = function(){
};

exports.unload = function(){
};
