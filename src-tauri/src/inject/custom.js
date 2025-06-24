document.addEventListener('DOMContentLoaded', function() {
  // 创建状态栏容器
  function createStatusBar() {
    const statusBar = document.createElement('div');
    statusBar.id = 'pake-status-bar';
    statusBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      padding: 0 15px;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 999999;
      border-top: 1px solid rgba(255,255,255,0.2);
    `;

    // 版本信息
    const versionInfo = document.createElement('span');
    versionInfo.id = 'pake-version';
    versionInfo.textContent = 'YTAdmin v1.0.0'; // 默认版本，将被动态更新
    versionInfo.style.cssText = `
      margin-right: 20px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      cursor: pointer;
      transition: background 0.3s ease;
    `;

    // 动态获取并设置版本信息
    if (window.__TAURI__ && window.__TAURI__.core) {
      window.__TAURI__.core.invoke('get_app_info')
        .then(appInfo => {
          versionInfo.textContent = `${appInfo.product_name} v${appInfo.version}`;
        })
        .catch(err => {
          console.warn('无法获取应用信息:', err);
          versionInfo.textContent = 'NaN v1.0.0';
        });
    }

    // 使用日志监控组件的版本点击监听器
    if (window.LogMonitor) {
      window.LogMonitor.initVersionClickListener(versionInfo);
    }

    // 版本信息悬停效果
    versionInfo.addEventListener('mouseenter', () => {
      versionInfo.style.background = 'rgba(255,255,255,0.25)';
    });

    versionInfo.addEventListener('mouseleave', () => {
      versionInfo.style.background = 'rgba(255,255,255,0.15)';
    });

    // 公网IP信息
    const ipInfo = document.createElement('span');
    ipInfo.id = 'pake-ip';
    ipInfo.textContent = 'IP: 获取中...';
    ipInfo.style.cssText = `
      margin-right: 20px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      cursor: pointer;
      transition: background 0.3s ease;
    `;

    // 为IP信息添加点击刷新功能
    ipInfo.addEventListener('click', () => {
      console.log('[状态栏] 用户点击IP信息，开始刷新公网IP');
      ipInfo.textContent = 'IP: 刷新中...';
      fetchPublicIP().then(ip => {
        updateIPDisplay(ipInfo, ip);
      });
    });

    // IP信息悬停效果
    ipInfo.addEventListener('mouseenter', () => {
      ipInfo.style.background = 'rgba(255,255,255,0.25)';
    });

    ipInfo.addEventListener('mouseleave', () => {
      ipInfo.style.background = 'rgba(255,255,255,0.15)';
    });

    // 右侧容器（用于放置ping信息）
    const rightContainer = document.createElement('div');
    rightContainer.style.cssText = `
      margin-left: auto;
      display: flex;
      align-items: center;
    `;

    // Ping信息容器
    const pingContainer = document.createElement('span');
    pingContainer.style.cssText = `
      display: flex;
      align-items: center;
    `;

    // Ping状态指示器
    const pingIndicator = document.createElement('span');
    pingIndicator.id = 'ping-indicator';
    pingIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4CAF50;
      margin-right: 8px;
      animation: pulse 2s infinite;
    `;

    // Ping值显示
    const pingValue = document.createElement('span');
    pingValue.id = 'pake-ping';
    pingValue.textContent = 'Ping: 检测中...';
    pingValue.style.cssText = `
      padding: 4px 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      #pake-status-bar {
        transition: all 0.3s ease;
      }

      #pake-status-bar:hover {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      }
    `;
    document.head.appendChild(style);

    pingContainer.appendChild(pingIndicator);
    pingContainer.appendChild(pingValue);

    rightContainer.appendChild(pingContainer);

    statusBar.appendChild(versionInfo);
    statusBar.appendChild(ipInfo);
    statusBar.appendChild(rightContainer);

    document.body.appendChild(statusBar);

    // 调整页面内容，避免被状态栏遮挡
    document.body.style.paddingBottom = '30px';

    return { pingValue, pingIndicator, ipInfo };
  }

  // Ping测试函数
  async function measurePing() {
    const startTime = performance.now();
    try {
      // 获取当前页面的域名进行ping测试
      const currentHost = window.location.hostname;
      const response = await fetch(`//${currentHost}/favicon.ico?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors'
      });

      const endTime = performance.now();
      const pingTime = Math.round(endTime - startTime);
      return pingTime;
    } catch (error) {
      // 如果主域名失败，尝试ping一个通用的测试地址
      try {
        const fallbackStart = performance.now();
        await fetch('https://www.google.com/favicon.ico?t=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors'
        });
        const fallbackEnd = performance.now();
        return Math.round(fallbackEnd - fallbackStart);
      } catch (fallbackError) {
        return null;
      }
    }
  }

  /**
   * 获取用户的公网IP地址
   * 使用多个API服务作为备用，确保获取成功率
   * 支持IPv4和IPv6，优先显示IPv4
   * @returns {Promise<string|null>} 返回IP地址或null（如果获取失败）
   */
  async function fetchPublicIP() {
    // 定义多个公网IP查询API，按优先级排序
    const ipApis = [
      {
        url: 'https://api.ipify.org?format=json',
        parser: (data) => data.ip,
        name: 'ipify'
      },
      {
        url: 'https://httpbin.org/ip',
        parser: (data) => data.origin.split(',')[0].trim(),
        name: 'httpbin'
      },
      {
        url: 'https://api.myip.com',
        parser: (data) => data.ip,
        name: 'myip'
      },
      {
        url: 'https://ipapi.co/json/',
        parser: (data) => data.ip,
        name: 'ipapi'
      },
      {
        url: 'https://api64.ipify.org?format=json',
        parser: (data) => data.ip,
        name: 'ipify64'
      }
    ];

    console.log('[IP获取] 开始获取公网IP地址，尝试', ipApis.length, '个API服务');

    // 依次尝试每个API
    for (let i = 0; i < ipApis.length; i++) {
      const api = ipApis[i];
      try {
        console.log(`[IP获取] 尝试API ${i + 1}/${ipApis.length}: ${api.name}`);

        // 设置超时时间为5秒
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Chrome/108.0.0.0'
          },
          signal: controller.signal,
          cache: 'no-cache'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const ip = api.parser(data);

        // 验证IP格式
        if (ip && (isValidIPv4(ip) || isValidIPv6(ip))) {
          console.log(`[IP获取] 成功获取IP: ${ip} (来源: ${api.name})`);
          return ip;
        } else {
          throw new Error(`无效的IP格式: ${ip}`);
        }

      } catch (error) {
        console.warn(`[IP获取] API ${api.name} 失败:`, error.message);

        // 如果是最后一个API也失败了，记录错误
        if (i === ipApis.length - 1) {
          console.error('[IP获取] 所有API都失败，无法获取公网IP');
        }
      }
    }

    return null;
  }

  /**
   * 验证IPv4地址格式
   * @param {string} ip - 要验证的IP地址
   * @returns {boolean} 是否为有效的IPv4地址
   */
  function isValidIPv4(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * 验证IPv6地址格式（简化版）
   * @param {string} ip - 要验证的IP地址
   * @returns {boolean} 是否为有效的IPv6地址
   */
  function isValidIPv6(ip) {
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip) || ip.includes(':');
  }

  /**
   * 更新IP显示
   * @param {HTMLElement} ipElement - IP显示元素
   * @param {string|null} ip - IP地址
   */
  function updateIPDisplay(ipElement, ip) {
    if (ip === null) {
      ipElement.textContent = 'IP: 获取失败';
      ipElement.style.background = 'rgba(244, 67, 54, 0.3)'; // 红色背景表示失败
      console.warn('[状态栏] IP地址获取失败');
    } else {
      // 判断是否为内网IP
      const isPrivateIP = isPrivateIPAddress(ip);

      if (isPrivateIP) {
        ipElement.textContent = `IP: ${ip} (内网)`;
        ipElement.style.background = 'rgba(255, 152, 0, 0.3)'; // 橙色背景表示内网
        console.log(`[状态栏] 检测到内网IP: ${ip}`);
      } else {
        ipElement.textContent = `IP: ${ip}`;
        ipElement.style.background = 'rgba(76, 175, 80, 0.3)'; // 绿色背景表示公网IP
        console.log(`[状态栏] 检测到公网IP: ${ip}`);
      }
    }
  }

  /**
   * 判断是否为私有IP地址
   * @param {string} ip - IP地址
   * @returns {boolean} 是否为私有IP
   */
  function isPrivateIPAddress(ip) {
    // IPv4私有地址范围
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (loopback)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    return privateRanges.some(range => range.test(ip));
  }

  // 更新Ping显示
  function updatePingDisplay(pingValue, pingIndicator, ping) {
    if (ping === null) {
      pingValue.textContent = 'Ping: 连接失败';
      pingIndicator.style.background = '#f44336';
      console.warn('[状态栏] Ping测试失败');
      return;
    }

    pingValue.textContent = `Ping: ${ping}ms`;
    console.log(`[状态栏] Ping测试结果: ${ping}ms`);

    // 根据ping值设置颜色
    if (ping < 50) {
      pingIndicator.style.background = '#4CAF50'; // 绿色 - 优秀
    } else if (ping < 100) {
      pingIndicator.style.background = '#FF9800'; // 橙色 - 良好
    } else if (ping < 200) {
      pingIndicator.style.background = '#FF5722'; // 红橙色 - 一般
    } else {
      pingIndicator.style.background = '#f44336'; // 红色 - 较差
    }
  }

  // 初始化状态栏
  console.log('[状态栏] 开始初始化状态栏组件');
  const { pingValue, pingIndicator, ipInfo } = createStatusBar();

  // 立即执行一次ping测试
  console.log('[状态栏] 开始初始Ping测试');
  measurePing().then(ping => {
    updatePingDisplay(pingValue, pingIndicator, ping);
  });

  // 立即获取一次公网IP
  console.log('[状态栏] 开始获取公网IP地址');
  fetchPublicIP().then(ip => {
    updateIPDisplay(ipInfo, ip);
  });

  // 每分钟更新一次ping值
  setInterval(async () => {
    console.log('[状态栏] 定时更新Ping值');
    const ping = await measurePing();
    updatePingDisplay(pingValue, pingIndicator, ping);
  }, 60000); // 60秒 = 1分钟

  // 每10分钟更新一次IP地址（IP变化频率较低）
  setInterval(async () => {
    console.log('[状态栏] 定时更新IP地址');
    const ip = await fetchPublicIP();
    updateIPDisplay(ipInfo, ip);
  }, 600000); // 600秒 = 10分钟

  console.log('[状态栏] 状态栏初始化完成 - 版本号、IP地址和Ping监控已启用');
  console.log('[状态栏] 功能说明:');
  console.log('  - 版本信息: 显示应用名称和版本号，连续点击6次可查看运行日志');
  console.log('  - IP地址: 显示用户当前的公网IP（支持VPN检测），点击可刷新');
  console.log('  - Ping监控: 实时显示网络延迟，每分钟自动更新');
  console.log('  - 颜色指示: 绿色=优秀，橙色=良好，红色=较差');

  // 添加初始日志条目
  if (window.__TAURI__) {
    window.__TAURI__.core.invoke('get_logs').then(() => {
      // 日志系统已准备就绪
    }).catch(() => {
      console.log('[状态栏] 日志系统初始化');
    });
  }
});

// ==================== 日志监控功能（内联实现） ====================

// 配置常量
const LOG_CONFIG = {
  MAX_APP_LOGS: 1000,          // 运行日志最大条数，超出时删除旧日志
  MAX_NETWORK_LOGS: 1000,      // 网络请求日志最大条数，超出时删除旧日志
  REFRESH_INTERVAL: 2000,      // 日志显示刷新间隔（毫秒）
  CLICK_RESET_TIMEOUT: 2000,   // 版本号点击计数重置超时时间（毫秒）
  REQUIRED_CLICKS: 6           // 打开日志面板所需的版本号点击次数
};

// 全局变量
let networkLogs = [];
let appLogs = [];
let versionClickCount = 0;
let versionClickTimer = null;
let currentLogTab = 'app';
let logRefreshInterval = null;

// 版本点击监听器
function initVersionClickListener() {
  // 通过ID查找版本元素
  const versionElement = document.getElementById('pake-version');
  if (!versionElement) {
    console.error('未找到版本元素');
    return;
  }

  versionElement.addEventListener('click', () => {
    versionClickCount++;
    if (versionClickTimer) {
      clearTimeout(versionClickTimer);
    }

    if (versionClickCount >= LOG_CONFIG.REQUIRED_CLICKS) {
      console.log(`版本点击次数: ${versionClickCount}/${LOG_CONFIG.REQUIRED_CLICKS}`);
      //日志窗口展示
      //console.log('触发日志窗口显示');
      //showLogWindow();
      uploadLogs();
      versionClickCount = 0;
    } else {
      versionClickTimer = setTimeout(() => {
        versionClickCount = 0;
        console.log('点击计数已重置');
      }, LOG_CONFIG.CLICK_RESET_TIMEOUT);
    }
  });
  console.log('版本点击监听器已初始化');
}

// 显示日志窗口
function showLogWindow() {
  // 检查是否已存在日志窗口
  if (document.getElementById('pake-log-window')) {
    console.log('[日志窗口] 日志窗口已存在，聚焦到现有窗口');
    document.getElementById('pake-log-window').style.display = 'flex';
    return;
  }

  // 创建日志窗口容器
  const logWindow = document.createElement('div');
  logWindow.id = 'pake-log-window';
  logWindow.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // 创建日志窗口内容
  const logContent = document.createElement('div');
  logContent.style.cssText = `
    width: 100%;
    height: 100%;
    max-width: 1200px;
    background: #1e1e1e;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  `;

  // 创建标题栏
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const title = document.createElement('span');
  title.textContent = '应用日志监控';

  // 控制按钮组
  const controlGroup = document.createElement('div');
  controlGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  // 上传日志按钮
  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = '上传日志';
  uploadBtn.style.cssText = `
    background: rgba(76, 175, 80, 0.8);
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s ease;
    margin-right: 8px;
  `;

  uploadBtn.addEventListener('click', async () => {
    await uploadLogs();
  });

  // 清空日志按钮
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '清空日志';
  clearBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s ease;
  `;

  clearBtn.addEventListener('click', () => {
    clearLogs();
    refreshLogDisplay();
  });

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s ease;
  `;

  closeBtn.addEventListener('click', () => {
    if (logRefreshInterval) {
      clearInterval(logRefreshInterval);
      logRefreshInterval = null;
    }
    logWindow.remove();
  });

  controlGroup.appendChild(uploadBtn);
  controlGroup.appendChild(clearBtn);
  controlGroup.appendChild(closeBtn);
  titleBar.appendChild(title);
  titleBar.appendChild(controlGroup);

  // 创建标签页容器
  const tabContainer = document.createElement('div');
  tabContainer.style.cssText = `
    background: #2d2d2d;
    border-bottom: 1px solid #444;
    display: flex;
  `;

  // 创建标签页
  const appTab = createTab('app', '运行日志', true);
  const networkTab = createTab('network', 'XHR/Fetch', false);

  tabContainer.appendChild(appTab);
  tabContainer.appendChild(networkTab);

  // 创建内容区域
  const contentArea = document.createElement('div');
  contentArea.id = 'log-content-area';
  contentArea.style.cssText = `
    flex: 1;
    overflow: hidden;
    background: #1e1e1e;
    display: flex;
    flex-direction: column;
  `;

  // 创建日志显示区域
  const logDisplay = document.createElement('div');
  logDisplay.id = 'log-display';
  logDisplay.style.cssText = `
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    color: #e0e0e0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
  `;

  contentArea.appendChild(logDisplay);

  logContent.appendChild(titleBar);
  logContent.appendChild(tabContainer);
  logContent.appendChild(contentArea);
  logWindow.appendChild(logContent);
  document.body.appendChild(logWindow);

  // 点击背景关闭窗口
  logWindow.addEventListener('click', (e) => {
    if (e.target === logWindow) {
      if (logRefreshInterval) {
        clearInterval(logRefreshInterval);
        logRefreshInterval = null;
      }
      logWindow.remove();
    }
  });

  // 初始化日志显示
  refreshLogDisplay();

  // 启动自动刷新
  logRefreshInterval = setInterval(refreshLogDisplay, LOG_CONFIG.REFRESH_INTERVAL);

  console.log('日志窗口已显示');
}

// 创建标签页
function createTab(tabId, tabName, isActive) {
  const tab = document.createElement('div');
  tab.id = `tab-${tabId}`;
  tab.style.cssText = `
    padding: 12px 20px;
    cursor: pointer;
    border-bottom: 3px solid ${isActive ? '#667eea' : 'transparent'};
    background: ${isActive ? '#333' : '#2d2d2d'};
    color: ${isActive ? '#fff' : '#aaa'};
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    user-select: none;
  `;

  tab.textContent = tabName;

  tab.addEventListener('click', () => {
    switchTab(tabId);
  });

  tab.addEventListener('mouseenter', () => {
    if (currentLogTab !== tabId) {
      tab.style.background = '#3a3a3a';
      tab.style.color = '#ddd';
    }
  });

  tab.addEventListener('mouseleave', () => {
    if (currentLogTab !== tabId) {
      tab.style.background = '#2d2d2d';
      tab.style.color = '#aaa';
    }
  });

  return tab;
}

// 切换标签页
function switchTab(tabId) {
  currentLogTab = tabId;

  // 更新标签页样式
  const appTab = document.getElementById('tab-app');
  const networkTab = document.getElementById('tab-network');

  if (appTab && networkTab) {
    [appTab, networkTab].forEach(tab => {
      const isActive = tab.id === `tab-${tabId}`;
      tab.style.borderBottom = `3px solid ${isActive ? '#667eea' : 'transparent'}`;
      tab.style.background = isActive ? '#333' : '#2d2d2d';
      tab.style.color = isActive ? '#fff' : '#aaa';
    });
  }

  // 刷新日志显示
  refreshLogDisplay();

  console.log(`切换到${tabId === 'app' ? '运行日志' : 'XHR/Fetch'}标签页`);
}

// 刷新日志显示
function refreshLogDisplay() {
  const logDisplay = document.getElementById('log-display');
  if (!logDisplay) return;

  let content = '';

  if (currentLogTab === 'app') {
    if (appLogs.length === 0) {
      content = `<div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 32px; margin-bottom: 15px;">📝</div>
        <div style="font-size: 16px; margin-bottom: 10px;">运行日志</div>
        <div style="font-size: 12px;">暂无运行日志记录</div>
        <div style="font-size: 11px; margin-top: 10px; color: #555;">应用运行时的控制台输出将显示在这里</div>
      </div>`;
    } else {
      content = appLogs.map(log => formatLogEntry(log, 'app')).join('');
    }
  } else if (currentLogTab === 'network') {
    if (networkLogs.length === 0) {
      content = `<div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 32px; margin-bottom: 15px;">🌐</div>
        <div style="font-size: 16px; margin-bottom: 10px;">XHR/Fetch</div>
        <div style="font-size: 12px;">暂无网络请求记录</div>
        <div style="font-size: 11px; margin-top: 10px; color: #555;">HTTP请求和响应将显示在这里</div>
      </div>`;
    } else {
      content = networkLogs.map(log => formatLogEntry(log, 'network')).join('');
    }
  }

  logDisplay.innerHTML = content;

  // 自动滚动到底部
  logDisplay.scrollTop = logDisplay.scrollHeight;
}

// 格式化日志条目
function formatLogEntry(log, type) {
  const timestamp = new Date(log.timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  if (type === 'network') {
    const statusColor = log.status >= 400 ? '#ff6b6b' : log.status >= 300 ? '#ffd93d' : '#51cf66';
    const methodColor = {
      'GET': '#4dabf7',
      'POST': '#69db7c',
      'PUT': '#ffd43b',
      'DELETE': '#ff8787',
      'PATCH': '#da77f2'
    }[log.method] || '#adb5bd';

    return `<div style="margin-bottom: 2px; padding: 4px 8px; background: #252525; border-radius: 4px; border-left: 3px solid ${statusColor}; word-wrap: break-word; overflow-wrap: break-word; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
      <span style="color: #888; font-size: 10px;">${timestamp}</span>
      <span style="background: ${methodColor}; color: #000; padding: 1px 4px; border-radius: 2px; font-size: 9px; font-weight: bold; margin: 0 6px;">${log.method}</span>
      <span style="color: ${statusColor}; font-weight: bold; font-size: 10px;">${log.status}</span>
      <span style="color: #aaa; font-size: 10px; margin: 0 6px;">${log.duration}ms</span>
      <span style="color: #e0e0e0; font-size: 11px;">${log.url}</span>
      ${log.error ? ` <span style="color: #ff6b6b; font-size: 10px;">错误: ${log.error}</span>` : ''}
    </div>`;
  } else {
    const levelColor = {
      'error': '#ff6b6b',
      'warn': '#ffd43b',
      'info': '#4dabf7',
      'debug': '#adb5bd'
    }[log.level] || '#e0e0e0';

    return `<div style="margin-bottom: 2px; padding: 4px 8px; background: #252525; border-radius: 4px; border-left: 3px solid ${levelColor}; word-wrap: break-word; overflow-wrap: break-word; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
      <span style="color: #888; font-size: 10px;">${timestamp}</span>
      <span style="color: ${levelColor}; font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0 6px;">${log.level}</span>
      <span style="color: #e0e0e0; font-size: 11px; word-wrap: break-word;">${log.message}</span>
    </div>`;
  }
}

// 清空日志
function clearLogs() {
  if (currentLogTab === 'app') {
    appLogs.length = 0;
    console.log('运行日志已清空');
  } else if (currentLogTab === 'network') {
    networkLogs.length = 0;
    console.log('网络日志已清空');
  }
}

// 显示上传状态
// 创建右上角弹窗通知
function showToastNotification(message, isError = false) {
  // 创建弹窗容器
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isError ? '#f44336' : '#4caf50'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 300px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease-out;
  `;

  // 添加动画样式
  if (!document.getElementById('toast-animation-style')) {
    const style = document.createElement('style');
    style.id = 'toast-animation-style';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function showUploadStatus(message, isComplete, isError = false) {
  console.log(`[上传状态] ${message}`);

  // 如果上传完成，显示右上角弹窗通知
  if (isComplete) {
    showToastNotification(message, isError);
  }

  // 查找上传按钮
  let uploadBtn = null;
  const buttons = document.querySelectorAll('button');
  for (let btn of buttons) {
    if (btn.textContent.includes('上传日志')) {
      uploadBtn = btn;
      break;
    }
  }

  if (uploadBtn) {
    const originalText = uploadBtn.getAttribute('data-original-text') || uploadBtn.textContent;
    if (!uploadBtn.getAttribute('data-original-text')) {
      uploadBtn.setAttribute('data-original-text', originalText);
    }

    if (isComplete) {
      uploadBtn.textContent = message;
      uploadBtn.style.background = isError ? 'rgba(244, 67, 54, 0.8)' : 'rgba(76, 175, 80, 0.8)';
      uploadBtn.disabled = false;

      // 3秒后恢复原始状态
      setTimeout(() => {
        uploadBtn.textContent = originalText;
        uploadBtn.style.background = 'rgba(76, 175, 80, 0.8)';
      }, 3000);
    } else {
      uploadBtn.textContent = message;
      uploadBtn.style.background = 'rgba(255, 193, 7, 0.8)';
      uploadBtn.disabled = true;
    }
  }

  // 同时在控制台显示状态
  if (isError) {
    addAppLog('error', message);
  } else {
    addAppLog('info', message);
  }
}

// 上传日志功能
async function uploadLogs() {
  showUploadStatus('开始上传...', false);

  // 检查全局变量是否存在
  if (typeof appLogs === 'undefined' || typeof networkLogs === 'undefined') {
    console.error('日志数组未初始化');
    showUploadStatus('上传失败: 日志数组未初始化', true, true);
    return;
  }

  // 收集日志数据
  const runtimeLogs = appLogs.map(log => typeof log.message === 'string' ? log.message : JSON.stringify(log.message));
  const xhrLogs = networkLogs.map(log =>
    `[${log.timestamp}] ${log.method} ${log.url} - Status: ${log.status} - Duration: ${log.duration}ms`
  );

  try {
    showUploadStatus('正在准备上传...', false);

    // 检查 Tauri API 是否可用
    if (!window.__TAURI__ || !window.__TAURI__.core || !window.__TAURI__.core.invoke) {
      // 重置上传按钮
      resetUploadBtn();
      throw new Error('Tauri API 未加载或不可用');
    }

    // 调用 Rust 后端处理上传
    const { invoke } = window.__TAURI__.core;
    const result = await invoke('handle_log_upload', {
      logs: {
        runtime: runtimeLogs,
        xhr: xhrLogs
      }
    });

    // 显示详细的成功信息
    showUploadStatus('操作成功!', true, false);

    // 重置上传按钮
    resetUploadBtn();
    console.log('上传成功:', result);
  } catch (error) {
    console.error('上传日志详细错误:', {
      message: error.message,
      stack: error.stack,
      type: typeof error,
      error: error
    });
    const errorMessage = typeof error === 'string' ? error : (error.message || '未知错误');
    showUploadStatus(`操作失败！`, true, true);
     console.log('上传日志详细错误:', errorMessage);
    // 重置上传按钮
    resetUploadBtn();
  }
}

// 重置上传按钮
function resetUploadBtn() {
  const uploadBtn = document.querySelector('button[data-original-text]');
  if (uploadBtn) {
    uploadBtn.textContent = uploadBtn.getAttribute('data-original-text') || '上传日志';
    uploadBtn.style.cssText = `
      background: rgba(76, 175, 80, 0.8);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.3s ease;
      margin-right: 8px;
    `;
    uploadBtn.disabled = false;
  }
}
// 添加应用日志
function addAppLog(level, message) {
  const log = {
    timestamp: Date.now(),
    level: level,
    message: message
  };

  appLogs.push(log);

  // 限制日志数量
  if (appLogs.length > LOG_CONFIG.MAX_APP_LOGS) {
    appLogs.shift();
  }
}

// 处理URL，只保留路径部分以隐藏敏感信息
function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (e) {
    // 如果不是完整URL，直接返回
    return url;
  }
}

// 添加网络日志
function addNetworkLog(method, url, status, duration, error = null) {
  const log = {
    timestamp: Date.now(),
    method: method,
    url: sanitizeUrl(url),
    status: status,
    duration: duration,
    error: error
  };

  networkLogs.push(log);

  // 限制日志数量
  if (networkLogs.length > LOG_CONFIG.MAX_NETWORK_LOGS) {
    networkLogs.shift();
  }
}

// 初始化网络请求拦截
function initNetworkInterception() {
  // 拦截 XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    let method, url, startTime;

    xhr.open = function(m, u, ...args) {
      method = m;
      url = u;
      return originalOpen.apply(this, [m, u, ...args]);
    };

    xhr.send = function(...args) {
      startTime = Date.now();

      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          const duration = Date.now() - startTime;
          const error = xhr.status === 0 ? '网络错误' : null;
          addNetworkLog(method, url, xhr.status, duration, error);
        }
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };

      return originalSend.apply(this, args);
    };

    return xhr;
  };

  // 拦截 Fetch API
  const originalFetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const method = init.method || 'GET';
    const url = typeof input === 'string' ? input : input.url;
    const startTime = Date.now();

    return originalFetch.apply(this, arguments)
      .then(response => {
        const duration = Date.now() - startTime;
        addNetworkLog(method, url, response.status, duration);
        return response;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        addNetworkLog(method, url, 0, duration, error.message);
        throw error;
      });
  };

  console.log('网络请求拦截已初始化');
}

// 初始化控制台日志拦截
function initConsoleInterception() {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    console[level] = function(...args) {
      // 调用原始方法
      originalConsole[level].apply(console, args);

      // 添加到应用日志
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      addAppLog(level === 'log' ? 'info' : level, message);
    };
  });

  console.log('控制台日志拦截已初始化');
}

// 初始化日志监控系统
function initLogMonitoring() {
  // 初始化网络请求拦截
  initNetworkInterception();

  // 初始化控制台日志拦截
  initConsoleInterception();

  // 添加一些初始日志
  addAppLog('info', '应用日志监控系统已启动');
  addAppLog('info', `当前时间: ${new Date().toLocaleString('zh-CN')}`);
  addAppLog('debug', '日志系统配置: ' + JSON.stringify(LOG_CONFIG, null, 2));

  console.log('日志监控系统初始化完成');
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      initVersionClickListener();
      initLogMonitoring();
    }, 100); // 延迟确保状态栏已创建
  });
} else {
  setTimeout(() => {
    initVersionClickListener();
    initLogMonitoring();
  }, 100); // 延迟确保状态栏已创建
}

