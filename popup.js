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
            document.getElementById('title').textContent = metadata.title;
            document.getElementById('author').textContent = metadata.author;
            document.getElementById('date').textContent = metadata.date;
            document.getElementById('subject').textContent = metadata.subject;
            document.getElementById('abstract').textContent = metadata.abs;

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


function scrapeArxivMeta() {
  try {
    const authorElements = document.querySelectorAll('meta[name="citation_author"]');
    const authors = Array.from(authorElements).map(el => el.content).join(', ');
    
    const meta = {    
        title: document.querySelector('meta[name="citation_title"]')?.content || document.title,
        url: document.querySelector('link[rel="canonical"]')?.href || location.href,
        date: document.querySelector('meta[name="citation_online_date"]')?.content || "",
        author: authors,
        subject: document.querySelector('.primary-subject')?.textContent || "",
        abs: document.querySelector('meta[name="citation_abstract"]')?.content || ""
    };

    // 取得した情報をオブジェクトとして返す
    return meta
  } catch (e) {
    // ページに必要な要素がなかった場合 (例: arXivのトップページなど)
    console.error("Error scraping arXiv metadata:", e);
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