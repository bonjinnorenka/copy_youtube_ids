const onCreated = ()=>{
    console.log("submitted")
}

browser.contextMenus.create({
    id: "get-youtube-channelId",
    title: "クリックでChannelIdを取得",
    contexts: ["all"],
    documentUrlPatterns:["https://www.youtube.com/@*","https://www.youtube.com/c/*","https://www.youtube.com/channel/*","https://www.youtube.com/user/*"]
}, onCreated);
browser.contextMenus.create({
    id: "get-youtube-videoId",
    title: "クリックでVideoidを取得",
    contexts: ["all"],
    documentUrlPatterns:["https://www.youtube.com/watch*"]
}, onCreated);
browser.contextMenus.create({
    id: "get-youtube-playlistid",
    title: "クリックでplaylistidを取得",
    contexts: ["all"],
    documentUrlPatterns:["https://www.youtube.com/playlist*"]
}, onCreated);

const domParser = new DOMParser();

browser.contextMenus.onClicked.addListener(function(info, tab) {
    //console.log(tab)
    const now_url = tab.url;
    switch (info.menuItemId) {
    case "get-youtube-channelId":
        (async()=>{
            const resdata = await fetch(now_url);
            if(resdata.ok){
                const doc = domParser.parseFromString(await resdata.text(),"text/html");
                //const elems = doc.querySelector("meta");
                const elems = doc.getElementsByTagName("meta");
                console.log(elems)
                for(const ele of elems){
                    if(ele.getAttribute("property")=="og:url"){
                        const url_original = ele.getAttribute("content");
                        const channelId = url_original.match(/channel\/([A-Za-z0-9_-]+)/)[1];
                        navigator.clipboard.writeText(channelId);
                        //console.log("clipbord set to\t" + channelId);
                    }
                }
            }
        })()
        break;
    case "get-youtube-videoId":
        const params = new URLSearchParams(new URL(now_url).search);
        if(params.has("v")){
            navigator.clipboard.writeText(params.get("v"));
        }
        break;
    case "get-youtube-playlistid":
        const params_playlist = new URLSearchParams(new URL(now_url).search);
        if(params_playlist.has("list")){
            navigator.clipboard.writeText(params_playlist.get("list"));
        }
        break;
}
})

const logURL = (requestDetails)=>{
    const original_headers = requestDetails.responseHeaders;
    original_headers["Access-Control-Allow-Origin"] = "*";
    return {responseHeaders:original_headers}
}

browser.webRequest.onHeadersReceived.addListener(
    logURL,
    {urls: ["https://www.youtube.com/*"]},
    ["blocking", "responseHeaders"]
);
