// 現在アクティブなタブの情報を取得する
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  if (activeTab) {
    // スクリプトをアクティブなタブに注入して実行する
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        function: scrapeArxivMeta, // 注入する関数
      },
      (injectionResults) => {
        // エラーチェック
        if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
          showError("Could not execute script on the page.");
          return;
        }

        // 注入した関数からの返り値を取得
        const metadata = injectionResults[0].result;
        
        if (metadata && metadata.title) {
          // 取得したメタデータをポップアップに表示
          document.getElementById('title').textContent = metadata.title;
          document.getElementById('authors').textContent = metadata.authors;
          document.getElementById('abstract').textContent = metadata.abstract;
          
          document.getElementById('content').style.display = 'block';
          document.getElementById('error').style.display = 'none';

        } else {
            // arXivページだが、必要な要素が見つからなかった場合
            showError();
        }
      }
    );
  } else {
      showError("Could not find active tab.");
  }
});

/**
 * この関数はブラウザのページコンテキストで実行され、
 * DOMからメタデータを抽出して返す。
 */
function scrapeArxivMeta() {
  try {
    // 各要素のセレクタを使って情報を取得
    const title = document.querySelector('h1.title').innerText.replace('Title:', '').trim();
    
    // 著者名は複数のaタグに入っているので、全て取得して結合する
    const authorElements = document.querySelectorAll('div.authors a');
    const authors = Array.from(authorElements).map(a => a.innerText).join(', ');
    
    const abstract = document.querySelector('blockquote.abstract').innerText.replace('Abstract:', '').trim();

    // 取得した情報をオブジェクトとして返す
    return { title, authors, abstract };
  } catch (e) {
    // ページに必要な要素がなかった場合 (例: arXivのトップページなど)
    return null;
  }
}

function showError(message = "This does not seem to be a valid arXiv abstract page.") {
    const contentDiv = document.getElementById('content');
    const errorDiv = document.getElementById('error');
    if (contentDiv) contentDiv.style.display = 'none';
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}