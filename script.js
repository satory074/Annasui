document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScriptが読み込まれました");

    const iframe = document.getElementById("nicoIframe");
    const playButton = document.getElementById("playButton");
    const currentTimeDisplay = document.getElementById("currentTime");

    // iframeにメッセージを送信する関数
    function postMessageToIframe(message) {
        console.log("iframeにメッセージを送信:", message);
        iframe.contentWindow.postMessage(message, "http://127.0.0.1:8080");
    }

    // 再生/停止ボタンがクリックされたときの処理
    playButton.addEventListener("click", function () {
        console.log("ボタンがクリックされました");
        postMessageToIframe({ eventName: "playPause" });
    });

    // メッセージを受信したときの処理
    window.addEventListener("message", function (event) {
        if (event.origin === "http://127.0.0.1:8080") {
            console.log("メッセージを受信:", event.data);
            if (event.data.eventName === "currentTime") {
                currentTimeDisplay.textContent = formatTime(event.data.data.currentTime);
            }
        }
    });

    // 再生時間をフォーマットする関数
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }

    // 再生時間を取得するためのメッセージを送信
    setInterval(() => {
        postMessageToIframe({ eventName: "getCurrentTime" });
    }, 1000); // 1秒ごとに再生時間を取得

    // 新しいAPIを使用して動画再生セッションを作成する関数
    async function createDmcSession(dmcInfo) {
        const sessionRequest = {
            // dmcInfoから必要なデータを構築
            // 例: dmcInfo.session_api_templateを使用
        };

        const response = await fetch("http://api.dmc.nico:2805/sessions?_format=json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sessionRequest),
        });

        const sessionResponse = await response.json();
        return sessionResponse.data.session;
    }

    // ハートビートを送信する関数
    async function sendHeartbeat(session) {
        await fetch(`http://api.dmc.nico:2805/api/sessions/${session.id}?_format=json&_method=PUT`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(session),
        });
    }

    // ハートビートを定期的に送信
    setInterval(async () => {
        const session = await createDmcSession(dmcInfo);
        await sendHeartbeat(session);
    }, 120000); // 120秒ごとにハートビートを送信
});
