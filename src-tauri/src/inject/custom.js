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
    versionInfo.textContent = 'YTAdminUAT v1.0.0';
    versionInfo.style.cssText = `
      margin-right: 20px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    `;
    
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
    
    // 分隔符
    const separator = document.createElement('span');
    separator.textContent = '|';
    separator.style.cssText = `
      margin-right: 20px;
      opacity: 0.6;
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
    
    statusBar.appendChild(versionInfo);
    statusBar.appendChild(ipInfo);
    statusBar.appendChild(separator);
    statusBar.appendChild(pingContainer);
    
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
            'User-Agent': 'YTAdminUAT/1.0.0'
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
  console.log('  - 版本信息: 显示应用名称和版本号');
  console.log('  - IP地址: 显示用户当前的公网IP（支持VPN检测），点击可刷新');
  console.log('  - Ping监控: 实时显示网络延迟，每分钟自动更新');
  console.log('  - 颜色指示: 绿色=优秀，橙色=良好，红色=较差');
});