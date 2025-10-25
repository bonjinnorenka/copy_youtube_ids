const MENU_IDS = {
    channel: "get-youtube-channelId",
    video: "get-youtube-videoId",
    playlist: "get-youtube-playlistid"
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: MENU_IDS.channel,
        title: "クリックでChannelIdを取得",
        contexts: ["page"],
        documentUrlPatterns: [
            "https://www.youtube.com/@*",
            "https://www.youtube.com/c/*",
            "https://www.youtube.com/channel/*",
            "https://www.youtube.com/user/*"
        ]
    });
    chrome.contextMenus.create({
        id: MENU_IDS.video,
        title: "クリックでVideoidを取得",
        contexts: ["page"],
        documentUrlPatterns: ["https://www.youtube.com/watch*", "https://www.youtube.com/shorts/*", "https://www.youtube.com/live/*"]
    });
    chrome.contextMenus.create({
        id: MENU_IDS.playlist,
        title: "クリックでplaylistidを取得",
        contexts: ["page"],
        documentUrlPatterns: ["https://www.youtube.com/playlist*"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || typeof tab.id !== "number") {
        return;
    }

    handleMenuClick(info.menuItemId, tab.id).catch((error) => {
        console.error("Failed to process context menu click:", error);
    });
});

async function handleMenuClick(menuItemId, tabId) {
    switch (menuItemId) {
        case MENU_IDS.channel:
            await executeCopy(tabId, copyChannelIdFromPage);
            break;
        case MENU_IDS.video:
            await executeCopy(tabId, copyVideoIdFromPage);
            break;
        case MENU_IDS.playlist:
            await executeCopy(tabId, copyPlaylistIdFromPage);
            break;
        default:
            break;
    }
}

async function executeCopy(tabId, func) {
    try {
        // DOMPurify を先に注入
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["node_modules/dompurify/dist/purify.min.js"],
            world: "MAIN"
        });

        const [result] = await chrome.scripting.executeScript({
            target: { tabId },
            func,
            world: "MAIN"
        });

        if (result && result.result && !result.result.success) {
            console.warn(result.result.message);
        }
    } catch (error) {
        console.error("Script injection failed:", error);
    }
}

async function copyChannelIdFromPage() {

    const isUC = (id) => /^UC[0-9A-Za-z_-]{22}$/.test(id);

    const readChannelId = async() => {
        try {
            const res = await fetch(window.location.href, { credentials: "same-origin" });
            if (res.ok) {
                const html = await res.text();
                
                // DOMPurify でサニタイズ
                let sanitizedHtml = html;
                if (window && window.DOMPurify) {
                    sanitizedHtml = window.DOMPurify.sanitize(html, {
                        WHOLE_DOCUMENT: true,
                        RETURN_TRUSTED_TYPE: true,
                        RETURN_DOM: false,
                        KEEP_CONTENT: true,
                        ALLOWED_TAGS: ['html','head','meta'],
                        ALLOWED_ATTR: ['property','content'],
                        ADD_ATTR: ['property','content'],
                        ADD_URI_SAFE_ATTR: ['property']
                    });
                }
                // console.log(sanitizedHtml)
                const doc = new DOMParser().parseFromString(sanitizedHtml, "text/html");
                const og = doc.querySelector('meta[property="og:url"]')?.content ?? "";
                // console.log("og: " + og)
                let m = og.match(/channel\/(UC[0-9A-Za-z_-]{22})/);
                // console.log("m: " + m[1])
                if (m && isUC(m[1])) return m[1];
                const canon = doc.querySelector('link[rel="canonical"]')?.href ?? "";
                // console.log("canon: " + canon)
                m = canon.match(/channel\/(UC[0-9A-Za-z_-]{22})/);
                // console.log("m: " + m[1])
                if (m && isUC(m[1])) return m[1];
            }
        } catch {}

        return null;
    };

    const channelId = await readChannelId();

    console.log("channelId: " + channelId)

    if (!channelId) {
        return { success: false, message: "Channel ID を検出できませんでした。" };
    }

    try {
        await navigator.clipboard.writeText(channelId);
        return { success: true, value: channelId };
    } catch (error) {
        console.error("Clipboard write failed:", error);
        return { success: false, message: "クリップボードへの書き込みに失敗しました。" };
    }
}

async function copyVideoIdFromPage() {
    const params = new URL(window.location.href).searchParams;
    const videoId =
        params.get("v") ??
        window?.ytplayer?.config?.args?.video_id ??
        window?.ytInitialPlayerResponse?.videoDetails?.videoId ??
        null;

    if (!videoId) {
        return { success: false, message: "Video ID を検出できませんでした。" };
    }

    try {
        await navigator.clipboard.writeText(videoId);
        return { success: true, value: videoId };
    } catch (error) {
        console.error("Clipboard write failed:", error);
        return { success: false, message: "クリップボードへの書き込みに失敗しました。" };
    }
}

async function copyPlaylistIdFromPage() {
    const params = new URL(window.location.href).searchParams;
    const playlistId =
        params.get("list") ??
        window?.ytInitialData?.metadata?.playlistMetadataRenderer?.playlistId ??
        null;

    if (!playlistId) {
        return { success: false, message: "Playlist ID を検出できませんでした。" };
    }

    try {
        await navigator.clipboard.writeText(playlistId);
        return { success: true, value: playlistId };
    } catch (error) {
        console.error("Clipboard write failed:", error);
        return { success: false, message: "クリップボードへの書き込みに失敗しました。" };
    }
}
