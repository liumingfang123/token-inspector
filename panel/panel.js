const includeBearerToggle = document.getElementById("include-bearer-toggle");

function extractTokensFromHAR(requests) {
  return requests.entries
    .filter((entry) =>
      entry.request.headers.some(
        (header) => header.name.toLowerCase() === "authorization"
      )
    )
    .map((entry) => {
      const url = entry.request.url;
      const authorizationHeader = entry.request.headers.find(
        (header) => header.name.toLowerCase() === "authorization"
      ).value;
      return { url, authorizationHeader };
    });
}

function displayTokens(tokens) {
  const outputContainer = document.getElementById("output-container");
  tokens.forEach((token) => {
    const container = document.createElement("div");
    container.classList.add("uk-margin")
    const card = document.createElement("div");
    card.classList.add("uk-card", "uk-card-default", "uk-card-body")

    const urlTitle = document.createElement("h6");
    urlTitle.classList.add("uk-card-title", "uk-text-default");
    urlTitle.innerText = token.url;

    const inspectButton = document.createElement("button");
    inspectButton.classList.add("uk-button", "uk-margin-right", "uk-button-primary", "uk-text-default", "uk-text-capitalize")
    inspectButton.innerText = "Inspect token in jwt.io";
    inspectButton.addEventListener("click", () => {
      const jwtInspectUrl = `https://jwt.io/?token=${encodeURIComponent(
        getToken(token)
      )}`;
      window.open(jwtInspectUrl, "_blank");
    });

    const copyButton = document.createElement("button");
    copyButton.classList.add("uk-button", "uk-button-secondary", "uk-text-default", "uk-text-capitalize")
    copyButton.innerText = "Copy token";
    copyButton.addEventListener("click", () => {
      copyToClipboard(getToken(token));
      alert("Token copied");
    });

    container.appendChild(card);
    card.appendChild(urlTitle);
    card.appendChild(inspectButton);
    card.appendChild(copyButton);
    outputContainer.appendChild(container);
  });
}

function getToken(token) {
  return includeBearerToggle.checked
    ? token.authorizationHeader
    : token.authorizationHeader.replace("Bearer ", "");
}

function copyToClipboard(text) {
  const textField = document.createElement("textarea");
  textField.innerText = text;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand("copy");
  textField.remove();
}

chrome.devtools.network.getHAR(function (requests) {
  const tokens = extractTokensFromHAR(requests);
  displayTokens(tokens);
});
