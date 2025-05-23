const getAllEventData = require('getAllEventData');
const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const getCookieValues = require('getCookieValues');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const generateRandom = require('generateRandom');
const parseUrl = require('parseUrl');
const makeString = require('makeString');
const Object = require('Object');
const makeNumber = require('makeNumber');
const getTimestamp = require('getTimestamp');

/**********************************************************************************************/

const postUrl = 'https://' + (data.serverEU ? 'api-eu.mixpanel.com' : 'api.mixpanel.com');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');
const eventData = getAllEventData();

let cookieOptions = {
    domain: 'auto',
    path: '/',
    samesite: 'Lax',
    secure: true,
    'max-age': 31536000, // 1 year
    httpOnly: false
};

if (data.type === 'track') {
    sendTrackRequest();
} else if (data.type === 'alias') {
    sendAliasRequest();
} else if (data.type === 'identify') {
    sendIdentifyRequest();
} else if (data.type === 'profile-set') {
    sendSetProfileRequest();
} else if (data.type === 'profile-append') {
    sendAppendProfileRequest();
} else if (data.type === 'profile-set-once') {
    sendSetOnceProfileRequest();
} else if (data.type === 'reset') {
    cookieOptions['max-age'] = 1;
    setCookie('stape_mixpanel_distinct_id', 'empty', cookieOptions);
    setCookie('stape_mixpanel_device_id', 'empty', cookieOptions);
    data.gtmOnSuccess();
    return;
}

/**********************************************************************************************/
// Vendor related functions

function sendAppendProfileRequest() {
    const propertiesToAppend = {};
    data.userPropertiesToAppend.forEach(row => {
        if (!propertiesToAppend[row.propertyName]) {
            propertiesToAppend[row.propertyName] = [];
        }
        propertiesToAppend[row.propertyName].push(row.valueToAppend);
    });

    const profileBody = {
        '$token': data.token,
        '$distinct_id': getDistinctId(),
        '$append': propertiesToAppend
    };

    const postUrlAppend = postUrl + '/engage#profile-list-append';

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Mixpanel',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': 'Profile Append',
            'RequestMethod': 'POST',
            'RequestUrl': postUrlAppend,
            'RequestBody': profileBody,
        }));
    }

    sendHttpRequest(postUrlAppend, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Mixpanel',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': 'Profile Append',
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        if (statusCode >= 200 && statusCode < 400 && body && body === '1') {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json'}, method: 'POST'}, JSON.stringify([profileBody]));
}

function sendSetProfileRequest() {
    const userProperties = {};
    data.userPropertiesTable.forEach(row => {
        userProperties[row.userProperty] = row.value;
    });

    const profileBody = {
        '$token': data.token,
        '$distinct_id': getDistinctId(),
        '$ip': eventData.ip_override || eventData.ip,
        '$set': userProperties
    };

    const postUrlSet = postUrl + '/engage#profile-set';

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Mixpanel',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': 'Profile Set',
            'RequestMethod': 'POST',
            'RequestUrl': postUrlSet,
            'RequestBody': profileBody,
        }));
    }

    sendHttpRequest(postUrlSet, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Mixpanel',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': 'Profile Set',
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        if (statusCode >= 200 && statusCode < 400 && body && body === '1') {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json'}, method: 'POST'}, JSON.stringify([profileBody]));
}

function sendSetOnceProfileRequest() {
    const userProperties = {};
    data.userPropertiesToSetOnce.forEach(row => {
        userProperties[row.userProperty] = row.value;
    });

    const profileBody = {
        '$token': data.token,
        '$distinct_id': getDistinctId(),
        '$ip': eventData.ip_override || eventData.ip,
        '$set_once': userProperties
    };

    const postUrlSetOnce = postUrl + '/engage#profile-set-once';

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Mixpanel',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': 'Profile Set Once',
            'RequestMethod': 'POST',
            'RequestUrl': postUrlSetOnce,
            'RequestBody': profileBody,
        }));
    }

    sendHttpRequest(postUrlSetOnce, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Mixpanel',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': 'Profile Set Once',
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        if (statusCode >= 200 && statusCode < 400 && body && body === '1') {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json'}, method: 'POST'}, JSON.stringify([profileBody]));
}

function sendTrackRequest() {
    let postBody = {
        properties: {}
    };

    if (data.trackCommonData) {
        postBody = trackCommonData(postBody);
    }

    if (data.trackFromVariable && data.trackParametersObject) {
        for (let key in data.trackParametersObject) {
            postBody.properties[key] = data.trackParametersObject[key];
        }
    }

    if (data.trackParameters) {
        data.trackParameters.forEach(d => {
            postBody.properties[d.name] = d.value;
        });
    }

    if (data.trackList) {
        data.trackList.forEach(d => {
            // Check if listValues is a string and have commas
            if (typeof d.listValues === 'string' && d.listValues.indexOf(',') !== -1) {
                // Convert a string to an array of strings, removing whitespace characters and dividing by commas
                postBody.properties[d.listName] = d.listValues.split(',').map(tag => tag.trim());
            } else {
                // If it is not a comma-delimited string, assign the value of listValues unchanged
                postBody.properties[d.listName] = d.listValues;
            }
        });
    }


    if (data.trackParametersRemove) {
        data.trackParametersRemove.forEach(d => {
            Object.delete(postBody.properties, d.name);
        });
    }

    sendRequest(data.trackName, postBody);
}

function sendAliasRequest() {
    sendRequest('$create_alias', {
        properties: {
            alias: data.alias
        }
    });
}

function sendIdentifyRequest() {
    sendRequest('$identify', {
        properties: {
            '$identified_id': data.identifier,
            '$anon_id': getDistinctId()
        }
    });
}

function sendRequest(eventName, postBody) {
    postBody.event = eventName;

    if (!postBody.properties) postBody.properties = {};
    postBody.properties.token = data.token;

    if (data.type !== 'identify') {
        postBody.properties.distinct_id = getDistinctId();
        postBody.properties['$device_id'] = getDeviceId(postBody.properties.distinct_id);

        if (data.identifyAuto) setDistinctIdCookies(postBody.properties.distinct_id, postBody.properties['$device_id']);
    }

    const postUrl = 'https://' + (data.serverEU ? 'api-eu.mixpanel.com' : 'api.mixpanel.com') + '/track?verbose=1';
    postBody = [postBody];

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Mixpanel',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': eventName,
            'RequestMethod': 'POST',
            'RequestUrl': postUrl,
            'RequestBody': postBody,
        }));
    }

    sendHttpRequest(postUrl, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Mixpanel',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': eventName,
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        // Because of ?verbose=1
        let parsedBody;
        if (body) parsedBody = JSON.parse(body);

        if (statusCode >= 200 && statusCode < 400 && parsedBody && parsedBody.status === 1) {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: {'Content-Type': 'application/json'}, method: 'POST'}, JSON.stringify(postBody));
}

function getDistinctId() {
    if (!data.identifyAuto) return data.identifyCustom;

    let mpData = getCookieValues('mp_' + data.token + '_mixpanel')[0];
    if (mpData) return JSON.parse(mpData).distinct_id;

    let distinctIdCookie = getCookieValues('stape_mixpanel_distinct_id')[0];
    if (distinctIdCookie) return distinctIdCookie;

    return UUID();
}

function getDeviceId(distinctId) {
    if (!data.identifyAuto) return data.identifyCustom;

    let mpData = getCookieValues('mp_' + data.token + '_mixpanel')[0];
    if (mpData) return JSON.parse(mpData)['$device_id'];

    let distinctIdCookie = getCookieValues('stape_mixpanel_device_id')[0];
    if (distinctIdCookie) return distinctIdCookie;

    return distinctId;
}

function setDistinctIdCookies(distinctId, deviceId) {
    setCookie('stape_mixpanel_distinct_id', makeString(distinctId), cookieOptions);
    setCookie('stape_mixpanel_device_id', makeString(deviceId), cookieOptions);
}

function trackCommonData(postBody) {
    postBody = {
        properties: {
            'ip': eventData.ip_override || eventData.ip,
            'mp_lib': 'stape',
            '$lib_version': '1.0.0',
        }
    };

    if (eventData.page_path) postBody.properties.path = eventData.page_path;
    if (eventData.page_location) postBody.properties['$current_url'] = eventData.page_location;
    if (eventData.screen_resolution) postBody.properties['$screen_width'] = eventData.screen_resolution.split('x')[0];
    if (eventData.screen_resolution) postBody.properties['$screen_height'] = eventData.screen_resolution.split('x')[1];
    if (eventData.page_referrer) postBody.properties['$referrer'] = eventData.page_referrer;
    if (eventData.page_referrer) postBody.properties['$referring_domain'] = parseUrl(eventData.page_referrer).hostname;

    const url = eventData.page_location || getRequestHeader('referer');
    const urlParsed = parseUrl(url);

    // https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript#track-utm-tags
    if (urlParsed && urlParsed.searchParams.utm_source) postBody.properties['utm_source'] = urlParsed.searchParams.utm_source;
    if (urlParsed && urlParsed.searchParams.utm_campaign) postBody.properties['utm_campaign'] = urlParsed.searchParams.utm_campaign;
    if (urlParsed && urlParsed.searchParams.utm_medium) postBody.properties['utm_medium'] = urlParsed.searchParams.utm_medium;
    if (urlParsed && urlParsed.searchParams.utm_term) postBody.properties['utm_term'] = urlParsed.searchParams.utm_term;
    if (urlParsed && urlParsed.searchParams.utm_content) postBody.properties['utm_content'] = urlParsed.searchParams.utm_content;
    if (urlParsed && urlParsed.searchParams.utm_id) postBody.properties['utm_id'] = urlParsed.searchParams.utm_id;
    if (urlParsed && urlParsed.searchParams.utm_source_platform) postBody.properties['utm_source_platform'] = urlParsed.searchParams.utm_source_platform;
    if (urlParsed && urlParsed.searchParams.utm_campaign_id) postBody.properties['utm_campaign_id'] = urlParsed.searchParams.utm_campaign_id;
    if (urlParsed && urlParsed.searchParams.utm_creative_format) postBody.properties['utm_creative_format'] = urlParsed.searchParams.utm_creative_format;
    if (urlParsed && urlParsed.searchParams.utm_marketing_tactic) postBody.properties['utm_marketing_tactic'] = urlParsed.searchParams.utm_marketing_tactic;

    if (urlParsed && urlParsed.searchParams.dclid) postBody.properties['dclid'] = urlParsed.searchParams.dclid;
    if (urlParsed && urlParsed.searchParams.fbclid) postBody.properties['fbclid'] = urlParsed.searchParams.fbclid;
    if (urlParsed && urlParsed.searchParams.gclid) postBody.properties['gclid'] = urlParsed.searchParams.gclid;
    if (urlParsed && urlParsed.searchParams.ko_click_id) postBody.properties['ko_click_id'] = urlParsed.searchParams.ko_click_id;
    if (urlParsed && urlParsed.searchParams.li_fat_id) postBody.properties['li_fat_id'] = urlParsed.searchParams.li_fat_id;
    if (urlParsed && urlParsed.searchParams.msclkid) postBody.properties['msclkid'] = urlParsed.searchParams.msclkid;
    if (urlParsed && urlParsed.searchParams.sccid) postBody.properties['sccid'] = urlParsed.searchParams.sccid;
    if (urlParsed && urlParsed.searchParams.ttclid) postBody.properties['ttclid'] = urlParsed.searchParams.ttclid;
    if (urlParsed && urlParsed.searchParams.twclid) postBody.properties['twclid'] = urlParsed.searchParams.twclid;
    if (urlParsed && urlParsed.searchParams.wbraid) postBody.properties['wbraid'] = urlParsed.searchParams.wbraid;

    if (postBody.properties['$referrer']) {
        let searchEngine = getSearchEngine(postBody.properties['$referrer']);

        if (searchEngine) {
            let searchEngineKeyword = null;

            if (urlParsed) {
                searchEngineKeyword = searchEngine !== 'yahoo' ? urlParsed.searchParams.q : urlParsed.searchParams.p;
            }

            postBody.properties['$search_engine'] = searchEngine;
            if (searchEngineKeyword) postBody.properties['mp_keyword'] = searchEngineKeyword;
        }
    }

    if (eventData.user_agent) {
        let os = getOS(eventData.user_agent);
        let device = getDevice(eventData.user_agent);
        let browser = getBrowser(eventData.user_agent);
        let browserVersion = getBrowserVersion(eventData.user_agent, browser);

        if (os) postBody.properties['$os'] = os;
        if (device) postBody.properties['$device'] = device;
        if (browser) postBody.properties['$browser'] = browser;
        if (browserVersion) postBody.properties['$browser_version'] = browserVersion;
    }

    if (!data.trackParametersRemove || !data.trackParametersRemove.some(el => el.name === '$initial_referrer')) {
        let initialReferrer = getCookieValues('stape_mixpanel_initial_referrer')[0];
        if (initialReferrer) postBody.properties['$initial_referrer'] = initialReferrer;
        if (!initialReferrer) {
            postBody.properties['$initial_referrer'] = postBody.properties['$referrer'] ? postBody.properties['$referrer'] : 'direct';
            setCookie('stape_mixpanel_initial_referrer', makeString(postBody.properties['$initial_referrer']), cookieOptions);
        }
    }

    if (postBody.properties['$initial_referrer'] && postBody.properties['$initial_referrer'] !== 'direct') postBody.properties['$initial_referring_domain'] = parseUrl(postBody.properties['$initial_referrer']).hostname;

    return postBody;
}

function getOS(userAgent) {
    if (userAgent.toLowerCase().match('windows') && userAgent.match('Phone')) return 'Windows Mobile';
    else if (userAgent.toLowerCase().match('windows')) return 'Windows';
    else if (userAgent.match('(iPhone|iPad|iPod)')) return 'iOS';
    else if (userAgent.match('Android')) return 'Android';
    else if (userAgent.match('(BlackBerry|PlayBook|BB10)')) return 'BlackBerry';
    else if (userAgent.match('Mac')) return 'Mac OS X';
    else if (userAgent.match('Linux')) return 'Linux';

    return '';
}

function getDevice(userAgent) {
    if (userAgent.match('iPad')) return 'iPad';
    else if (userAgent.match('iPod')) return 'iPod Touch';
    else if (userAgent.match('iPhone')) return 'iPhone';
    else if (userAgent.toLowerCase().match('(blackberry|playbook|bb10)')) return 'BlackBerry';
    else if (userAgent.toLowerCase().match('windows phone')) return 'Windows Phone';
    else if (userAgent.match('Android')) return 'Android';

    return '';
}

function getBrowser(userAgent) {
    if (userAgent.match('Opera Mini')) return 'Opera Mini';
    if (userAgent.match('Opera')) return 'Opera';
    if (userAgent.toLowerCase().match('(BlackBerry|PlayBook|BB10)')) return 'BlackBerry';
    if (userAgent.match('FBIOS')) return 'Facebook Mobile';
    if (userAgent.match('Chrome')) return 'Chrome';
    if (userAgent.match('CriOS')) return 'Chrome iOS';
    if (userAgent.match('Apple') && userAgent.match('Mobile')) return 'Mobile Safari';
    if (userAgent.match('Apple')) return 'Safari';
    if (userAgent.match('Android')) return 'Android Mobile';
    if (userAgent.match('Konqueror')) return 'Konqueror';
    if (userAgent.match('Firefox')) return 'Firefox';
    if (userAgent.match('MSIE') || userAgent.match('Trident')) return 'Internet Explorer';
    if (userAgent.match('Gecko')) return 'Mozilla';

    return '';
}

function getBrowserVersion(userAgent, browser) {
    const versionRegexs = {
        'Internet Explorer Mobile': 'rv:([0-9]+(.[0-9]+)?)',
        'Microsoft Edge': 'Edge?/([0-9]+(.[0-9]+)?)',
        'Chrome': 'Chrome/([0-9]+(.[0-9]+)?)',
        'Chrome iOS': 'CriOS/([0-9]+(.[0-9]+)?)',
        'UC Browser' : '(UCBrowser|UCWEB)/([0-9]+(.[0-9]+)?)',
        'Safari': 'Version/([0-9]+(.[0-9]+)?)',
        'Mobile Safari': 'Version/([0-9]+(.[0-9]+)?)',
        'Opera': '(Opera|OPR)/([0-9]+(.[0-9]+)?)',
        'Firefox': 'Firefox/([0-9]+(.[0-9]+)?)',
        'Firefox iOS': 'FxiOS/([0-9]+(.[0-9]+)?)',
        'Konqueror': 'Konqueror:([0-9]+(.[0-9]+)?)',
        'BlackBerry': 'BlackBerry ([0-9]+(.[0-9]+)?)',
        'Android Mobile': 'android.([0-9]+(.[0-9]+)?)',
        'Samsung Internet': 'SamsungBrowser/([0-9]+(.[0-9]+)?)',
        'Internet Explorer': '(rv:|MSIE )([0-9]+(.[0-9]+)?)',
        'Mozilla': 'rv:([0-9]+(.[0-9]+)?)'
    };

    let regex = versionRegexs[browser];
    if (regex === undefined) {
        return null;
    }

    let matches = userAgent.match(regex);
    if (!matches) {
        return null;
    }

    return makeNumber(matches[matches.length - 2]);
}

function getSearchEngine(referrer) {
    if (referrer.search('https?://(.*)google.([^/?]*)') === 0) return 'google';
    else if (referrer.search('https?://(.*)bing.com') === 0) return 'bing';
    else if (referrer.search('https?://(.*)yahoo.com') === 0) return 'yahoo';
    else if (referrer.search('https?://(.*)duckduckgo.com') === 0) return 'duckduckgo';

    return null;
}

/**********************************************************************************************/
// Helpers

function random() {
    return generateRandom(1000000000000000, 10000000000000000)/10000000000000000;
}
  
function UUID() {
    function s(n) { return h((random() * (1<<(n<<2)))^getTimestamp()).slice(-n); }
    function h(n) { return (n|0).toString(16); }
    return  [
        s(4) + s(4), s(4),
        '4' + s(3),
        h(8|(random()*4)) + s(3),
        getTimestamp().toString(16).slice(-10) + s(2)
    ].join('-');
}

function determinateIsLoggingEnabled() {
    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'no') {
        return false;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}