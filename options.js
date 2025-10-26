// 設定を保存する関数
function saveOptions() {
  const apiKey = document.getElementById('apiKey').value;
  const dbId = document.getElementById('dbId').value;
  
  chrome.storage.sync.set({
    notionApiKey: apiKey,
    notionDatabaseId: dbId
  }, () => {
    // 保存後にステータスを表示
    const status = document.getElementById('status');
    status.textContent = '保存しました。';
    setTimeout(() => {
      status.textContent = '';
    }, 1500);
  });
}

// 保存されている設定を読み込んでフォームに表示する関数
function restoreOptions() {
  chrome.storage.sync.get({
    notionApiKey: '',
    notionDatabaseId: ''
  }, (items) => {
    document.getElementById('apiKey').value = items.notionApiKey;
    document.getElementById('dbId').value = items.notionDatabaseId;
  });
}

// ページ読み込み時に設定を復元
document.addEventListener('DOMContentLoaded', restoreOptions);
// 保存ボタンにクリックイベントを追加
document.getElementById('save').addEventListener('click', saveOptions);