import json

# HARファイルの読み込み
with open("./songle.jp.1.har", "r", encoding="utf-8") as f:
    har1 = json.load(f)

with open("./songle.jp.2.har", "r", encoding="utf-8") as f:
    har2 = json.load(f)


# リクエストの抽出
def extract_requests(har_data):
    requests = []
    for entry in har_data["log"]["entries"]:
        request = entry["request"]
        response = entry["response"]
        if request["method"] == "POST" or request["method"] == "GET":
            requests.append(
                {"method": request["method"], "url": request["url"], "status": response["status"], "response": response}
            )
    return requests


# 解析結果の取得
requests1 = extract_requests(har1)
requests2 = extract_requests(har2)

import ace_tools as tools

tools.display_dataframe_to_user(name="Initial Requests", dataframe=pd.DataFrame(requests1))
tools.display_dataframe_to_user(name="After Play Requests", dataframe=pd.DataFrame(requests2))
