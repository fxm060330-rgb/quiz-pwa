const { readFileSync, writeFileSync } = require("fs");
const pdf = require("pdf-parse");

const PDF_PATH = "public/data/2026官方理论题（带页脚双面打印共97页）.pdf";
const OUT_PATH = "public/data/questions.json";

const buf = readFileSync(PDF_PATH);
console.log("Parsing PDF...");
pdf(buf).then((data) => {
  const text = data.text;
  console.log(`Extracted ${text.length} chars from ${data.numpages} pages`);

  // Split by separator
  const blocks = text.split(/\n-{40,}\n/).filter((b) => {
    const t = b.trim();
    return t.length > 30 && /【第\d+题】/.test(t);
  });
  console.log(`Found ${blocks.length} question blocks`);

  const questions = [];
  for (const block of blocks) {
    const q = parseBlock(block);
    if (q) questions.push(q);
  }

  console.log(`Parsed ${questions.length} questions`);
  const single = questions.filter((q) => q.type === "single").length;
  const multi = questions.filter((q) => q.type === "multi").length;
  const judge = questions.filter((q) => q.type === "judge").length;
  console.log(`  Single: ${single}, Multi: ${multi}, Judge: ${judge}`);

  assignChapters(questions);

  writeFileSync(OUT_PATH, JSON.stringify(questions, null, 2), "utf8");
  console.log(`Done! Written ${questions.length} questions to ${OUT_PATH}`);

  // Verify a few samples
  console.log("\n=== Sample verification ===");
  console.log("Q1 (first multi):", JSON.stringify(questions[0], null, 2).slice(0, 500));
  console.log("---");
  const jq = questions.find((q) => q.type === "judge");
  console.log("Judge:", JSON.stringify(jq, null, 2).slice(0, 400));
}).catch((e) => {
  console.error("Error:", e.message);
});

function parseBlock(block) {
  const clean = block
    .replace(/第\d+页共\d+页/g, "")
    .replace(/={30,}/g, "")
    .trim();

  // Match header
  const hdrMatch = clean.match(/【第(\d+)题】\[(单选题|多选题|判断题)\]/);
  if (!hdrMatch) return null;

  const num = parseInt(hdrMatch[1]);
  const typeStr = hdrMatch[2];
  const type = typeStr === "单选题" ? "single" : typeStr === "多选题" ? "multi" : "judge";

  // Split content at known markers 【答案】, 【解析】, 【判断题】
  const answerIdx = clean.indexOf("【答案】");
  const analysisIdx = clean.indexOf("【解析】");
  const judgeHintIdx = clean.indexOf("【判断题】");

  // Body is from after header to first of: answer, analysis, judge-hint
  const bodyStart = hdrMatch.index + hdrMatch[0].length;
  let bodyEnd = clean.length;
  for (const idx of [answerIdx, analysisIdx, judgeHintIdx]) {
    if (idx > bodyStart && idx < bodyEnd) bodyEnd = idx;
  }
  let body = clean.slice(bodyStart, bodyEnd).trim();

  // Extract answer
  let answer = "";
  if (answerIdx >= 0) {
    const afterAnswer = clean.slice(answerIdx + 4).trim();
    // Answer is on the first line after 【答案】
    const nl = afterAnswer.indexOf("\n");
    answer = (nl >= 0 ? afterAnswer.slice(0, nl) : afterAnswer).trim();
  }

  // Extract analysis
  let analysis = "";
  if (analysisIdx >= 0) {
    const afterAnalysis = clean.slice(analysisIdx + 4).trim();
    // Analysis ends at separator or end of block
    analysis = afterAnalysis.replace(/\s+/g, " ").trim();
  }

  let options = [];
  let questionText = "";

  if (type === "judge") {
    options = ["正确", "错误"];
    if (answer === "T" || answer === "正确" || answer === "A") answer = "A";
    else if (answer === "F" || answer === "错误" || answer === "B") answer = "B";
    questionText = body.replace(/（\s*）/g, "").replace(/\s+/g, " ").trim();
  } else {
    // Find where options start: first line starting with A. or A、
    const lines = body.split("\n");
    const optStartLine = lines.findIndex((l) => /^\s*A[\.、]/.test(l.trim()));

    if (optStartLine >= 0) {
      questionText = lines.slice(0, optStartLine).join("").replace(/\s+/g, " ").trim();
      const optLines = lines.slice(optStartLine);

      // Group option lines: each option starts with [letter][.、]
      for (const line of optLines) {
        const m = line.trim().match(/^([A-F])[\.、]\s*(.+)/);
        if (m) {
          options.push(m[2].trim());
        } else if (options.length > 0 && line.trim()) {
          // Continuation of previous option
          options[options.length - 1] += line.trim();
        }
      }
      // Clean up option whitespace
      options = options.map((o) => o.replace(/\s+/g, " ").trim());
    } else {
      questionText = body.replace(/\s+/g, " ").trim();
    }
  }

  // Clean question text
  questionText = questionText.replace(/（\s*）/g, "").replace(/\s+/g, " ").trim();

  if (!questionText || questionText.length < 3) return null;
  if (options.length < 2) return null;
  if (!answer) return null;

  // Normalize multi-choice answer
  if (type === "multi") {
    answer = answer.replace(/[,，\s]+/g, "");
  }

  return {
    id: `q-${num}`,
    type,
    question: questionText,
    options,
    answer,
    analysis,
    chapter: "默认章节",
    difficulty: 1,
  };
}

function assignChapters(questions) {
  // 8 consolidated chapters for 信息通信网络运行管理员 exam
  const chapterKeywords = [
    {
      name: "职业法规与道德",
      keywords: ["职业", "道德", "操守", "爱岗", "敬业", "诚信", "法律", "法规", "条例", "治安管理", "刑法",
        "电信条例", "网络安全法", "数据安全法", "个人信息保护", "遵纪守法", "社会责任感", "社会义务"],
    },
    {
      name: "数据通信原理",
      keywords: ["数据通信", "通信系统", "串行通讯", "并行通讯", "单工", "半双工", "全双工", "传输信道",
        "比特率", "波特率", "误码率", "吞吐量", "传播延迟", "编码", "调制", "曼彻斯特", "归零码", "极性码",
        "A/D转换", "模数", "数模", "基带", "频带", "信号", "波形", "频谱", "带宽",  "时分", "频分", "码分",
        "PCM", "抽样", "量化", "差错控制", "奇偶校验", "CRC", "海明码", "纠错", "检错", "帧中继", "虚电路"],
    },
    {
      name: "网络设备与配置",
      keywords: ["交换机配置", "路由器配置", "路由表", "静态路由", "默认路由", "动态路由", "路由聚合",
        "网桥", "网关", "集线器", "中继器", "调制解调器", "网卡", "网络适配器", "VLAN", "以太网", "WLAN",
        "无线AP", "CSMA/CD", "局域网", "拓扑结构", "星型拓扑", "总线拓扑", "环型拓扑", "网状拓扑",
        "华为", "思科", "Cisco", "H3C", "命令行", "CLI", "console口", "端口聚合", "链路聚合",
        "Trunk", "VTP", "RSTP", "MSTP", "PoE", "网络管理", "网管系统", "监控", "诊断", "排错",
        "traceroute", "tracert", "ping命令", "netstat", "nslookup", "show命令", "display命令",
        "配置命令", "接口配置", "网络拓扑", "广播域", "冲突域", "生成树", "STP", "MAC地址表"],
    },
    {
      name: "网络协议",
      keywords: ["TCP协议", "UDP协议", "IP协议", "协议栈", "OSI参考模型", "HTTP协议", "FTP协议",
        "DNS协议", "DHCP协议", "ICMP协议", "ARP协议", "SMTP协议", "POP3", "SNMP协议", "Telnet协议",
        "SSH协议", "TFTP", "NTP", "LDAP", "HTTPS", "SSL", "TLS", "RIP协议", "OSPF协议", "BGP协议",
        "EIGRP", "路由协议", "TCP/IP", "三次握手", "四次挥手", "滑动窗口", "拥塞控制", "流量控制",
        "校验和", "报文", "数据包", "帧结构", "封装", "解封装", "子网掩码", "IP地址", "IPv4", "IPv6",
        "MAC地址", "VLSM", "CIDR", "NAT地址转换", "PAT", "ACL访问控制", "端口号", "套接字",
        "传输层", "网络层", "应用层", "数据链路层", "物理层", "会话层", "表示层"],
    },
    {
      name: "网络安全",
      keywords: ["安全", "保密", "加密", "防火墙", "VPN", "隧道", "PPTP", "L2TP", "IPSec", "攻击", "病毒",
        "木马", "入侵", "认证", "授权", "审计", "漏洞", "威胁", "等级保护", "涉密", "分级保护", "WEP", "WPA",
        "SSID隐藏", "MAC地址过滤", "IDS", "IPS", "DMZ", "PKI", "数字签名", "数字证书", "身份验证", "DES", "AES",
        "RSA", "哈希", "MD5", "SHA", "拒绝服务", "DoS", "DDoS", "钓鱼", "社工", "后门", "扫描", "渗透"],
    },
    {
      name: "操作系统管理",
      keywords: ["操作系统", "Linux系统", "Windows系统", "Ubuntu", "CentOS", "RedHat", "Debian",
        "进程管理", "线程", "内存管理", "文件系统", "磁盘分区", "挂载", "文件权限", "用户管理", "用户组",
        "Shell", "Bash", "systemd", "守护进程", "cron", "定时任务", "软件包管理", "apt-get", "yum",
        "rpm", "dpkg", "LVM", "NFS", "Samba", "RAID", "日志"],
    },
    {
      name: "数据库与应用",
      keywords: ["数据库", "SQL", "MySQL", "Oracle", "SQL Server", "PostgreSQL", "MongoDB", "Redis",
        "备份", "恢复", "事务", "索引", "查询", "存储过程", "触发器", "视图", "CMS", "内容管理", "WordPress",
        "Drupal", "Web服务器", "Apache", "Nginx", "IIS", "Tomcat", "中间件", "编程", "程序", "软件",
        "开发", "面向对象", "设计模式", "测试", "部署", "发布"],
    },
    {
      name: "综合知识",
      keywords: ["云计算", "虚拟化", "云平台", "SaaS", "PaaS", "IaaS", "物联网", "NB-IoT", "传感器",
        "RFID", "人工智能", "AI", "机器学习", "认知", "深度学习", "算法", "机器人", "5G", "移动通信",
        "蜂窝", "基站", "4G", "LTE", "3G", "GSM", "CDMA", "WCDMA", "电源", "UPS", "蓄电池", "功率",
        "电压", "电流", "接地", "防雷", "机房", "精密空调", "消防", "灭火", "防火", "报警", "探测器",
        "施工", "布线", "光纤", "光缆", "电缆", "双绞线", "综合布线", "弱电", "管道", "弯头", "线管",
        "应急", "预案", "容灾", "演练", "运维", "ITIL", "ISO", "标准", "规范"],
    },
  ];

  for (const q of questions) {
    let assigned = false;
    const searchText = q.question + (q.analysis || "");
    for (const ch of chapterKeywords) {
      for (const kw of ch.keywords) {
        if (searchText.includes(kw)) {
          q.chapter = ch.name;
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }
    if (!assigned) q.chapter = "综合知识";
  }

  const dist = {};
  for (const q of questions) { dist[q.chapter] = (dist[q.chapter] || 0) + 1; }
  console.log("Chapter distribution:");
  for (const [ch, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ch}: ${count}题`);
  }
}
