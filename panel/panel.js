// panel.js
// 全局元素引用
const outputContainer = document.getElementById("output-container"); // 令牌展示容器
const includeBearerToggle = document.getElementById("include-bearer-toggle"); // "包含Bearer"切换开关
// 新增配置项引用
const systemApiUrl = document.getElementById("system-api-url");
const systemApiKey = document.getElementById("system-api-key");
// 处理网络请求完成事件
function handleRequestFinished(request) {
  const hasToken = request.request.headers.some((header) => {
    return header.name.toLowerCase() === "authtoken";
  });

  // 发现令牌时更新面板
  if (hasToken) {
    updatePanel();
  }
}

// 从HAR数据提取令牌信息
function extractTokensFromHAR(requests) {
  return requests.entries
      // 过滤出包含authtoken头的请求
      .filter((entry) =>
          entry.request.headers.some(
              (header) => header.name.toLowerCase() === "authtoken",
          )
      )
      // 映射为{url, authtokenHeader}对象
      .map((entry) => {
        const url = entry.request.url;
        const authorizationHeader = entry.request.headers.find(
            (header) => header.name.toLowerCase() === "authtoken"
        ).value;
        return { url, authorizationHeader };
      });
}

// 展示令牌到界面
function displayTokens(tokens) {
  const outputContainer = document.getElementById("output-container");
  tokens.forEach((token) => {
    // 创建卡片容器
    const container = document.createElement("div");
    container.classList.add("uk-margin");

    const card = document.createElement("div");
    card.classList.add("uk-card", "uk-card-default", "uk-card-body");

    // 添加URL标题
    const urlTitle = document.createElement("h6");
    urlTitle.classList.add("uk-card-title", "uk-text-default");
    urlTitle.innerText = token.url;

    // 创建检查按钮（跳转jwt.io）
    const inspectButton = document.createElement("button");
    inspectButton.classList.add(
        "uk-button", "uk-margin-right", "uk-button-primary",
        "uk-text-default", "uk-text-capitalize", "uk-margin-top"
    );
    inspectButton.innerText = "Inspect token in jwt.io";
    inspectButton.addEventListener("click", () => {
      const jwtInspectUrl = `https://jwt.io/?token=${encodeURIComponent(
        getToken(token),
      )}`;
      window.open(jwtInspectUrl, "_blank");
    });

    // 创建复制按钮
    const copyButton = document.createElement("button");
    copyButton.classList.add(
      "uk-button",
      "uk-button-secondary",
      "uk-text-default",
      "uk-text-capitalize",
      "uk-margin-top",
    );
    copyButton.innerText = "Copy token";
    copyButton.addEventListener("click", () => {
      copyToClipboard(getToken(token));
      // 显示3秒复制成功提示
      const notificationContainer = (document.getElementById(
        "notification-container",
      ).innerHTML = "Token copied successfully.");
      setTimeout(() => {
        notificationContainer.innerHTML = "";
      }, 3000);
    });
    // 创建发送按钮
    const sendButton = document.createElement("button");
    sendButton.classList.add(
        "uk-button",
        "uk-button-danger",
        "uk-text-default",
        "uk-text-capitalize",
        "uk-margin-top"
    );
    sendButton.innerText = "Send to System";
    sendButton.addEventListener("click", async () => {
      try {
        await sendTokenToSystem(getToken(token));
        showNotification("发送成功", "success");
      } catch (error) {
        showNotification(`发送失败: ${error.message}`, "danger");
      }
    });
    // 组装DOM元素
    container.appendChild(card);
    card.appendChild(urlTitle);
    card.appendChild(inspectButton);
    card.appendChild(copyButton);
    card.appendChild(sendButton); // 新增按钮
    outputContainer.appendChild(container);
  });
}
// 新增令牌发送方法
async function sendTokenToSystem(token) {
  if (!systemApiUrl.value) throw new Error("请配置API地址");

  const response = await fetch(systemApiUrl.value, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authtoken": `Bearer ${systemApiKey.value}`
    },
    body: JSON.stringify({
      token: token,
      timestamp: new Date().toISOString(),
      source: "Token Inspector"
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP错误: ${response.status}`);
  }
}
// 通用通知方法
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification-container");
  notification.innerHTML = `    <div class="uk-alert-${type}" uk-alert>
      <a class="uk-alert-close" uk-close></a>
      <p>${message}</p>
    </div>
  `;
  setTimeout(() => notification.innerHTML = "", 3000);
}
// 获取处理后的令牌（根据开关决定是否包含Bearer）
function getToken(token) {
  return includeBearerToggle.checked
    ? token.authorizationHeader
    : token.authorizationHeader.replace("Bearer ", "");
}

// 剪贴板复制功能
function copyToClipboard(text) {
  const textField = document.createElement("textarea");
  textField.innerText = text;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand("copy");
  textField.remove();
}

// 更新面板主逻辑
function updatePanel() {
  outputContainer.innerHTML = ""; // 清空容器

  chrome.devtools.network.getHAR(function (requests) {
    const includeBearerToggle = document.getElementById(
      "include-bearer-toggle",
    );
    includeBearerToggle.addEventListener("change", () => {
      document.getElementById("output-container").innerHTML = "";
      const tokens = extractTokensFromHAR(requests);
      displayTokens(tokens);
    });

    // 初始展示令牌
    const tokens = extractTokensFromHAR(requests);
    displayTokens(tokens);
  });
}

// 事件监听
chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished);

includeBearerToggle.addEventListener("change", updatePanel);

// 初始化面板
updatePanel();
