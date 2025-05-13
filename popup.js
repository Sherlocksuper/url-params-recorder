
// 函数：切换参数的启用/禁用状态
function toggleParamState(key, currentState) {
  chrome.storage.local.get(key, function (result) {
    if (chrome.runtime.lastError) {
      console.error(
        "self Error fetching item for toggle:",
        chrome.runtime.lastError
      );
      return;
    }
    const item = result[key];
    if (item && typeof item === "object") {
      item.enabled = !currentState;
      chrome.storage.local.set({ [key]: item }, function () {
        if (chrome.runtime.lastError) {
          console.error(
            "self Error updating item state:",
            chrome.runtime.lastError
          );
          return;
        }
        console.log(`self ${key} state toggled to ${item.enabled}`);
        loadSavedParams(); // 重新加载列表以反映更改
      });
    }
  });
}

// 函数：删除已保存的参数
function deleteParam(key) {
  chrome.storage.local.remove(key, function () {
    if (chrome.runtime.lastError) {
      console.error("self Error deleting item:", chrome.runtime.lastError);
      return;
    }
    console.log(`self ${key} deleted`);
    loadSavedParams(); // 重新加载列表以反映更改
  });
}

// 函数：加载并显示已保存的参数
function loadSavedParams() {
  const savedParamsListDiv = document.getElementById("savedParamsList");
  savedParamsListDiv.innerHTML = ""; // 清空现有列表

  chrome.storage.local.get(null, function (items) {
    console.log("self all items from storage", items); // 调试信息
    // 检查 items 是否为空对象，如果是，则表示没有保存任何参数
    if (Object.keys(items).length === 0) {
      savedParamsListDiv.textContent = "No parameters saved yet.";
      return;
    }

    if (chrome.runtime.lastError) {
      console.error(
        "self Error retrieving saved params:",
        chrome.runtime.lastError
      );
      savedParamsListDiv.textContent = "Error loading parameters.";
      return;
    }

    const keys = Object.keys(items);
    const ul = document.createElement("ul");
    // ul 的样式现在通过 popup.html 中的 CSS 控制

    keys.forEach(function (key) {
      const itemData = items[key];
      // 现在我们存储的是对象，包含 params 和 enabled 状态
      if (
        itemData &&
        typeof itemData === "object" &&
        typeof itemData.params === "string"
      ) {
        const li = document.createElement("li");

        const itemHeaderDiv = document.createElement("div"); // 新的父div，用于包裹路径和按钮
        itemHeaderDiv.className = "param-item-header"; // 为这个新的div添加class，方便CSS控制

        const pathStrong = document.createElement("strong");
        pathStrong.textContent = key;
        itemHeaderDiv.appendChild(pathStrong); // 将路径添加到新的父div中

        // 创建操作按钮区域
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "param-actions";

        // 创建禁用/启用按钮
        const toggleButton = document.createElement("button");
        toggleButton.textContent = itemData.enabled ? "Disable" : "Enable";
        toggleButton.classList.add("action-button", "toggle-btn");
        toggleButton.classList.toggle("enabled", itemData.enabled);
        toggleButton.classList.toggle("disabled", !itemData.enabled);
        toggleButton.addEventListener("click", function () {
          toggleParamState(key, itemData.enabled);
        });
        actionsDiv.appendChild(toggleButton);

        // 创建删除按钮
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("action-button", "delete-btn");
        deleteButton.addEventListener("click", function () {
          // 添加确认步骤，防止误删
          if (
            confirm(`Are you sure you want to delete parameters for ${key}?`)
          ) {
            deleteParam(key);
          }
        });
        actionsDiv.appendChild(deleteButton);

        itemHeaderDiv.appendChild(actionsDiv); // 将按钮区域添加到新的父div中
        li.appendChild(itemHeaderDiv); // 将新的父div添加到li中

        const paramsString = itemData.params.startsWith("?")
          ? itemData.params.substring(1)
          : itemData.params;
        if (paramsString) {
          const paramsArray = paramsString.split("&");
          const paramsUl = document.createElement("ul");
          paramsUl.className = "params-list"; // 使用CSS类进行样式化

          paramsArray.forEach((param) => {
            const paramLi = document.createElement("li");
            paramLi.textContent = param;
            paramsUl.appendChild(paramLi);
          });
          li.appendChild(paramsUl); // 参数列表直接添加到li中，位于新的父div之后
        }

        // itemHeaderDiv.appendChild(actionsDiv); // 这行已移到上面
        // li.appendChild(itemHeaderDiv); // 这行已移到上面

        // const paramsString = ... // 这部分逻辑也已移到上面，并调整了paramsUl的添加位置
        // if (paramsString) { ... }

        ul.appendChild(li);
      }
    });
    if (ul.childNodes.length > 0) {
      savedParamsListDiv.appendChild(ul);
    } else {
      savedParamsListDiv.textContent = "No parameters saved yet.";
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  loadSavedParams(); // 页面加载时加载参数列表
  const saveButton = document.getElementById("saveParams");

  saveButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        try {
          const url = new URL(currentTab.url);
          const params = url.search;
          const key = `${url.hostname}${url.pathname}`;

          if (params) {
            // 存储包含参数和启用状态的对象
            const dataToStore = { params: params, enabled: true };
            chrome.storage.local.set({ [key]: dataToStore }, function () {
              if (chrome.runtime.lastError) {
                console.error(
                  "self Error saving params:",
                  chrome.runtime.lastError
                );
                saveButton.textContent = "Save failed!";
                setTimeout(() => {
                  saveButton.textContent = "Save Parameters";
                }, 2000);
                return;
              }
              console.log("self params saved", params);
              // 可以选择性地给用户一个反馈，比如改变按钮文字或显示一条消息
              saveButton.textContent = "Parameters saved!";
              setTimeout(() => {
                saveButton.textContent = "Save Parameters";
              }, 2000);
              loadSavedParams(); // 保存成功后重新加载列表
            });
          } else {
            // 如果没有参数，也可以提示用户
            saveButton.textContent = "No parameters to save";
            setTimeout(() => {
              saveButton.textContent = "Save Parameters";
            }, 2000);
          }
        } catch (e) {
          console.error("Error processing URL: ", e);
          // 处理无效URL的情况
          saveButton.textContent = "Invalid URL";
          setTimeout(() => {
            saveButton.textContent = "Save Parameters";
          }, 2000);
        }
      } else {
        console.error("Could not get current tab URL");
      }
    });
  });
});
