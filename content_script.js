// content_script.js
(function () {
  // 确保脚本只运行一次，或者在特定条件下运行
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  const url = new URL(window.location.href);
  const key = `${url.hostname}${url.pathname}`;

  chrome.storage.local.get([key], function (result) {
    const itemData = result[key];
    if (
      itemData &&
      typeof itemData === "object" &&
      itemData.enabled &&
      typeof itemData.params === "string"
    ) {
      console.log("self stored params found", itemData.params);
      const currentParams = url.search;
      // 检查当前URL是否已经包含了保存的参数，避免重复添加或冲突
      if (currentParams !== itemData.params) {
        // 如果当前URL没有参数，或者参数与保存的不同，则应用保存的参数
        // 为了避免无限重定向循环，我们可以检查一下是否是因为我们自己添加了参数而导致的页面重载
        // 一个简单的方法是，在跳转后，我们可以尝试在sessionStorage中设置一个标志
        const appliedFlag = `params_applied_${key}`;
        if (sessionStorage.getItem(appliedFlag) === "true") {
          console.log(
            "self params already applied in this session, skipping to avoid loop"
          );
          sessionStorage.removeItem(appliedFlag); // 清除标志，以便下次手动保存时能重新应用
          return;
        }

        // 构造新的URL
        let newUrl = `${url.origin}${url.pathname}${itemData.params}${url.hash}`;

        // 只有当新URL与当前URL不同时才跳转，防止不必要的重载
        if (window.location.href !== newUrl) {
          sessionStorage.setItem(appliedFlag, "true");
          window.location.href = newUrl;
        }
      } else {
        console.log(
          "self current params match stored params, no action needed."
        );
      }
    } else {
      console.log("self no stored params for this key", key);
    }
  });
})();
