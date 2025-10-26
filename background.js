// メッセージリスナーの設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveArxivToNotion") {
    handleSaveArxivToNotion(request.metadata, sendResponse);
    return true; // 非同期処理のため
  } else if (request.action === "savePageToNotion") {
    handleSavePageToNotion(request.title, request.url, sendResponse);
    return true; // 非同期処理のため
  }
  // 他のアクションがあればここに追加
  return false; // 同期的に処理する場合はfalseを返すか、何も返さない
});

const NOTION_API_VERSION = "2025-09-03";

// --- 共通の補助関数 ---
async function getNotionConfigAndDataSourceId() {
  const config = await chrome.storage.sync.get(["notionApiKey", "notionDatabaseId"]);
  const { notionApiKey: apiKey, notionDatabaseId: dbId } = config;

  if (!apiKey || !dbId) {
    throw new Error("APIキーまたはDB IDが未設定です。");
  }

  // データソースIDを取得
  const dbInfoResponse = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Notion-Version": NOTION_API_VERSION
    }
  });

  if (!dbInfoResponse.ok) {
    const errorData = await dbInfoResponse.json();
    console.error("データベース情報取得エラー:", errorData);
    throw new Error(`DB情報取得失敗: ${errorData.message || dbInfoResponse.statusText}`);
  }

  const dbInfo = await dbInfoResponse.json();
  if (!dbInfo.data_sources || dbInfo.data_sources.length === 0) {
    console.error("データソースが見つかりません:", dbInfo);
    throw new Error("データベースにデータソースが見つかりません。");
  }

  const dataSourceId = dbInfo.data_sources[0].id;
  console.log("取得したデータソースID:", dataSourceId);

  return { apiKey, dataSourceId };
}

// --- arXivメタデータをNotionに保存 ---
async function handleSaveArxivToNotion(metadata, sendResponse) {
  try {
    const { apiKey, dataSourceId } = await getNotionConfigAndDataSourceId();

    // Notion APIリクエストボディの構築 (arXiv用)
    // 注意: Notion DBのプロパティ名と型が一致している必要がある
    const properties = {
      "Title": { // Title型プロパティ
        "title": [{ "text": { "content": metadata.title || "" } }]
      },
      "URL": { // URL型プロパティ
        "url": metadata.url || null
      },
      "Author": { // Rich Text型プロパティを推奨
        "rich_text": [{ "type": "text", "text": { "content": metadata.author || "" } }]
      },
      // Date型プロパティ (YYYY-MM-DD形式)
      "Date": metadata.date ? { "date": { "start": metadata.date } } : null,
      "Subject": { // Rich Text型 or Select型 or Text型
        //  "rich_text": [{ "type": "text", "text": { "content": metadata.subject || "" } }]
        //  Select型の場合: 
        // "select": { "name": metadata.subject || "" }
        "multi_select": [{ "name": metadata.subject || "" }]
      },
      "Abstract": { // Rich Text型プロパティを推奨
         "rich_text": [{ "type": "text", "text": { "content": metadata.abs || "" } }]
      }
    };
     // nullのプロパティを除外
    const filteredProperties = Object.entries(properties)
        .filter(([key, value]) => value !== null)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});


    const notionBody = {
      parent: { "data_source_id": dataSourceId },
      properties: filteredProperties
    };

    // fetchでNotion APIを叩く
    const createPageResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION
      },
      body: JSON.stringify(notionBody)
    });

    // 結果を判定して応答
    if (createPageResponse.ok) {
      sendResponse({ success: true });
    } else {
      const errorData = await createPageResponse.json();
      console.error("ページ作成APIエラー (arXiv):", errorData);
      sendResponse({ success: false, error: errorData.message || `Notion APIエラー (${createPageResponse.status})` });
    }

  } catch (error) {
    console.error("arXiv保存処理中のエラー:", error);
    sendResponse({ success: false, error: error.message || "不明なエラーが発生しました。" });
  }
}

// --- 通常のページ情報をNotionに保存 ---
async function handleSavePageToNotion(title, url, sendResponse) {
  try {
    const { apiKey, dataSourceId } = await getNotionConfigAndDataSourceId();

    // Notion APIリクエストボディの構築 (通常ページ用)
    const notionBody = {
      parent: { "data_source_id": dataSourceId },
      properties: {
        "Name": { // Title型プロパティ
          "title": [{ "text": { "content": title || "" } }]
        },
        "URL": { // URL型プロパティ
          "url": url || null
        }
        // 他のプロパティ（Author, Dateなど）は送信しないか、空の値を設定
      }
    };

    // fetchでNotion APIを叩く
    const createPageResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION
      },
      body: JSON.stringify(notionBody)
    });

     // 結果を判定して応答
    if (createPageResponse.ok) {
      sendResponse({ success: true });
    } else {
      const errorData = await createPageResponse.json();
      console.error("ページ作成APIエラー (通常):", errorData);
      sendResponse({ success: false, error: errorData.message || `Notion APIエラー (${createPageResponse.status})` });
    }

  } catch (error) {
    console.error("通常ページ保存処理中のエラー:", error);
    sendResponse({ success: false, error: error.message || "不明なエラーが発生しました。" });
  }
}