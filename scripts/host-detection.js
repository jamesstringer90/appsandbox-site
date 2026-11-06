window.detectPreviewHost = function(nav) {
    const platform = String(nav.userAgentData?.platform || nav.platform || ""), ua = String(nav.userAgent || "");
    if (/Android/i.test(platform + " " + ua)) return {
        mode: "windows",
        platform: "Android",
        reason: "Android defaults to PC presentation"
    };
    const ipad = /iPad/i.test(ua) || /Mac/i.test(platform + " " + ua) && Number(nav.maxTouchPoints) > 1;
    if (ipad) return {
        mode: "mac",
        platform: "iPadOS",
        reason: "iPad defaults to Mac presentation"
    };
    if (/iPhone|iPod/i.test(platform + " " + ua)) return {
        mode: "mac",
        platform: "iOS",
        reason: "iOS defaults to Mac presentation"
    };
    if (/Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua)) return {
        mode: "mac",
        platform: "macOS",
        reason: "Detected Mac host"
    };
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return {
        mode: "windows",
        platform: "Windows",
        reason: "Detected Windows host"
    };
    return {
        mode: "windows",
        platform: /Linux/i.test(platform) ? "Linux" : "unknown",
        reason: "PC presentation fallback; manual host controls remain available"
    };
};
