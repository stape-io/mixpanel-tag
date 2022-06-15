const getAllEventData = require('getAllEventData');
const JSON = require('JSON');
const sendHttpRequest = require('sendHttpRequest');
const getTimestampMillis = require('getTimestampMillis');
const setCookie = require('setCookie');
const getCookieValues = require('getCookieValues');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const getRequestHeader = require('getRequestHeader');
const generateRandom = require('generateRandom');
const parseUrl = require('parseUrl');
const makeString = require('makeString');

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
} else if (data.type === 'reset') {
    cookieOptions['max-age'] = 1;

    setCookie('stape_mixpanel_distinct_id', 'empty', cookieOptions);
    setCookie('stape_mixpanel_device_id', 'empty', cookieOptions);
    data.gtmOnSuccess();

    return;
}

function sendTrackRequest() {
    let postBody = {
        properties: {}
    };

    if (data.trackCommonData) {
        postBody = trackCommonData(postBody);
    }

    if (!data.trackFromVariable && data.trackParameters) {
        data.trackParameters.forEach(d => {
            postBody.properties[d.name] = d.value;
        });
    }

    if (data.trackFromVariable && data.trackParametersObject) {
        for (let key in data.trackParametersObject) {
            postBody.properties[key] = data.trackParametersObject[key];
        }
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

function sendRequest(eventName, postBody) {
    postBody.event = eventName;

    if (!postBody.properties) postBody.properties = {};
    postBody.properties.token = data.token;
    postBody.properties.distinct_id = getDistinctId();
    postBody.properties['$device_id'] = getDeviceId(postBody.properties.distinct_id);

    if (data.identifyAuto) setDistinctIdCookies(postBody.properties.distinct_id, postBody.properties['$device_id']);

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

        if (statusCode >= 200 && statusCode < 400) {
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

    return 's-' + getTimestampMillis() + '-' + generateRandom(100000, 999999) + '-' + generateRandom(100000, 999999);
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

    if (eventData.user_agent) postBody.properties.user_agent = eventData.user_agent;
    if (eventData.page_path) postBody.properties.path = eventData.page_path;
    if (eventData.page_location) postBody.properties['$current_url'] = eventData.page_location;
    if (eventData.screen_resolution) postBody.properties['$screen_width'] = eventData.screen_resolution.split('x')[0];
    if (eventData.screen_resolution) postBody.properties['$screen_height'] = eventData.screen_resolution.split('x')[1];
    if (eventData.page_referrer) postBody.properties['$referrer'] = eventData.page_referrer;
    if (eventData.page_referrer) postBody.properties['$referring_domain'] = parseUrl(eventData.page_referrer).hostname;

    const url = eventData.page_location || getRequestHeader('referer');
    const urlParsed = parseUrl(url);

    if (urlParsed && urlParsed.searchParams.utm_medium) postBody.properties['$utm_medium'] = urlParsed.searchParams.utm_medium;
    if (urlParsed && urlParsed.searchParams.utm_source) postBody.properties['$utm_source'] = urlParsed.searchParams.utm_source;
    if (urlParsed && urlParsed.searchParams.utm_campaign) postBody.properties['$utm_campaign'] = urlParsed.searchParams.utm_campaign;
    if (urlParsed && urlParsed.searchParams.utm_content) postBody.properties['$utm_content'] = urlParsed.searchParams.utm_content;

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

    if (postBody.properties.user_agent) {
        let os = getOS(postBody.properties.user_agent);
        let device = getDevice(postBody.properties.user_agent);
        let browser = getBrowser(postBody.properties.user_agent);

        if (os) postBody.properties['$os'] = os;
        if (device) postBody.properties['$device'] = device;
        if (browser) postBody.properties['$browser'] = browser;
    }

    let initialReferrer = getCookieValues('stape_mixpanel_initial_referrer')[0];
    if (initialReferrer) postBody.properties['$initial_referrer'] = initialReferrer;
    if (!initialReferrer) {
        postBody.properties['$initial_referrer'] = postBody.properties['$referrer'] ? postBody.properties['$referrer'] : 'direct';
        setCookie('stape_mixpanel_initial_referrer', makeString(postBody.properties['$initial_referrer']), cookieOptions);
    }

    if (postBody.properties['$initial_referrer'] && postBody.properties['$initial_referrer'] !== 'direct') postBody.properties['$initial_referring_domain'] = parseUrl(postBody.properties['$initial_referrer']).hostname;

    return postBody;
}

function getOS(user_agent) {
    if (user_agent.toLowerCase().match('windows') && user_agent.match('Phone')) return 'Windows Mobile';
    else if (user_agent.toLowerCase().match('windows')) return 'Windows';
    else if (user_agent.match('(iPhone|iPad|iPod)')) return 'iOS';
    else if (user_agent.match('Android')) return 'Android';
    else if (user_agent.match('(BlackBerry|PlayBook|BB10)')) return 'BlackBerry';
    else if (user_agent.match('Mac')) return 'Mac OS X';
    else if (user_agent.match('Linux')) return 'Linux';

    return '';
}

function getDevice(user_agent) {
    if (user_agent.match('iPad')) return 'iPad';
    else if (user_agent.match('iPod')) return 'iPod Touch';
    else if (user_agent.match('iPhone')) return 'iPhone';
    else if (user_agent.toLowerCase().match('(blackberry|playbook|bb10)')) return 'BlackBerry';
    else if (user_agent.toLowerCase().match('windows phone')) return 'Windows Phone';
    else if (user_agent.match('Android')) return 'Android';

    return '';
}

function getBrowser(user_agent) {
    if (user_agent.match('Opera Mini')) return 'Opera Mini';
    if (user_agent.match('Opera')) return 'Opera';
    if (user_agent.toLowerCase().match('(BlackBerry|PlayBook|BB10)')) return 'BlackBerry';
    if (user_agent.match('FBIOS')) return 'Facebook Mobile';
    if (user_agent.match('Chrome')) return 'Chrome';
    if (user_agent.match('CriOS')) return 'Chrome iOS';
    if (user_agent.match('Apple') && user_agent.match('Mobile')) return 'Mobile Safari';
    if (user_agent.match('Apple')) return 'Safari';
    if (user_agent.match('Android')) return 'Android Mobile';
    if (user_agent.match('Konqueror')) return 'Konqueror';
    if (user_agent.match('Firefox')) return 'Firefox';
    if (user_agent.match('MSIE') || user_agent.match('Trident')) return 'Internet Explorer';
    if (user_agent.match('Gecko')) return 'Mozilla';

    return '';
}

function getSearchEngine(referrer) {
    if (referrer.search('https?://(.*)google.([^/?]*)') === 0) return 'google';
    else if (referrer.search('https?://(.*)bing.com') === 0) return 'bing';
    else if (referrer.search('https?://(.*)yahoo.com') === 0) return 'yahoo';
    else if (referrer.search('https?://(.*)duckduckgo.com') === 0) return 'duckduckgo';

    return null;
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
