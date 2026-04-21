const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, bold) {
  return new Paragraph({ children: [new TextRun({ text, bold: !!bold })] });
}
function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Courier New", size: 18 })]
  });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function makeCell(text, width, isHeader) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: "D5E8F0", type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: !!isHeader, size: 20 })]
    })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    columnWidths: colWidths,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => makeCell(h, colWidths[i], true))
      }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders: cellBorders,
          width: { size: colWidths[i], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun(String(cell))] })]
        }))
      }))
    ]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: "000000", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "2E74B5", font: "Arial" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "2E74B5", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullet", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
      { reference: "task1-step", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
    ]
  },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
    children: [

      // ===================== 文档一：助听器验配小程序设计 =====================
      new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "助听器验配小程序设计", bold: true, size: 48 })] }),
      pageBreak(),

      // 一、文档目标
      h1("一、文档目标"),
      p("设计杰理 JL700N 蓝牙助听器的小程序端系统，支持："),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("用户首次登录建档")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("设备绑定（蓝牙连接 SN 读取）")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("远程验配（生成唯一码、SN 二次校验）")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("自主验配（EQ 调节、一键恢复）")] }),

      // 二、业务流程
      h1("二、业务流程"),

      h2("2.1 购买渠道区分"),
      makeTable(["渠道", "路径"], [
        ["线上购买", "联系客服预约 → 远程验配 → 写入 bin"],
        ["线下购买", "门店首次验配 → 听力图写入 bin"]
      ], [3000, 6000]),

      h2("2.2 用户首次登录流程"),
      code("微信登录授权"),
      code("    ↓"),
      code("选择验配状态"),
      code("    ├── 已验配 → 读 bin 有听力图 → 填写信息(姓名/电话/门店) → 绑定设备"),
      code("    └── 未验配 → 上传听力图 → 客服引导验配 → 填写信息 → 绑定设备"),

      h2("2.3 远程验配流程"),
      makeTable(["步骤", "执行方", "动作"], [
        ["1", "用户", "点击「开始远程验配」"],
        ["2", "服务器", "生成验配唯一码（预留接口）"],
        ["3", "用户", "分享唯一码给验配师"],
        ["4", "验配师", "专业软件输入唯一码加入会话"],
        ["5", "服务器", "建立通道，同步 bin 数据（预留接口）"],
        ["6", "验配师", "远程调试，发送试听程序"],
        ["7", "用户", "确认接收"],
        ["8", "关键", "小程序读 SN 二次校验"],
        ["9", "匹配成功", "写入试听程序"],
        ["10", "匹配失败", "终止，提示设备不匹配"],
        ["11", "满意后", "验配师点击完成，程序存档"]
      ], [1200, 1800, 6000]),

      h2("2.4 自主验配功能"),
      p("• 可调参数：环境程序切换（安静/嘈杂/音乐）、基础增益调整、简易 EQ"),
      p("• 锁定参数：压缩比、多通道参数、反馈抑制等专业参数（仅验配师可调）"),
      p("• 一键恢复：回滚至最近一次专业远程验配的状态"),

      // 三、系统架构
      h1("三、系统架构"),

      h2("3.1 技术选型"),
      makeTable(["类别", "选型"], [
        ["小程序框架", "原生微信小程序"],
        ["数据存储", "微信云开发（暂用），预留迁移至自建服务器"],
        ["蓝牙通信", "微信 BLE API（wx.createBLEConnection 等）"]
      ], [3000, 6000]),

      h2("3.2 角色与数据流"),
      makeTable(["角色", "职责"], [
        ["微信用户", "小程序端，绑定助听器，发起验配"],
        ["助听器", "存储 SN、听力图 bin 数据"],
        ["验配师", "专业软件端，远程调试"],
        ["服务器", "档案存储、唯一码、会话管理（预留接口）"]
      ], [3000, 6000]),

      h2("3.3 BLE 协议（现有固件）"),
      makeTable(["命令", "功能"], [
        ["0xF8", "读全部 32KB bin"],
        ["0xA0", "读取全片信息"],
        ["0xA2", "设置音量"],
        ["0xA4", "设置模式"],
        ["0xAC", "复位 HAP"]
      ], [2000, 7000]),

      p("Bin 地址映射："),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("0x1FE0 - 序列号（16字节）")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("0x1FF0 - 型号（16字节）")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("0x1DB7 - 听力图数据")] }),

      // 四、页面结构
      h1("四、页面结构"),
      makeTable(["页面", "功能"], [
        ["启动页", "微信登录授权"],
        ["引导页", "选择「已验配」或「未验配」"],
        ["设备连接页", "蓝牙扫描选择助听器"],
        ["信息填写页", "姓名/电话/门店信息"],
        ["听力图上传页", "拍照上传（未验配路径）"],
        ["设备绑定页", "SN 绑定确认"],
        ["主功能页", "远程验配 / 自主验配 入口"],
        ["远程验配页", "生成唯一码、等待验配师"],
        ["自主验配页", "EQ 调节、一键恢复"]
      ], [3000, 6000]),

      // 五、数据模型
      h1("五、数据模型"),
      h2("5.1 用户档案"),
      code('openid: "微信用户唯一标识"'),
      code('name: "姓名"'),
      code('phone: "电话"'),
      code('store: "门店信息"'),
      code('sn: "助听器序列号"'),
      code('audiogram: { type, path }'),
      code('bindTime: "绑定时间"'),
      code('lastFittingTime: "最近验配时间"'),

      h2("5.2 设备信息"),
      code('sn: "序列号"'),
      code('model: "型号"'),
      code('materialNumber: "物料号"'),
      code('hasAudiogram: true'),
      code('audiogramData: "听力图数据"'),

      // 六、API接口预留
      h1("六、API 接口预留"),
      makeTable(["接口", "方法", "用途", "状态"], [
        ["/api/user/bind", "POST", "绑定用户-SN-听力图", "预留"],
        ["/api/user/profile", "GET", "获取用户档案", "预留"],
        ["/api/user/updateAudiogram", "POST", "更新听力图", "预留"],
        ["/api/fitting/code", "POST", "生成验配唯一码", "预留"],
        ["/api/fitting/verify", "POST", "SN 二次校验", "预留"],
        ["/api/fitting/submit", "POST", "提交验配程序", "预留"],
        ["/api/fitting/complete", "POST", "完成验配", "预留"]
      ], [2800, 1500, 3500, 1500]),

      // 七、关键安全机制
      h1("七、关键安全机制"),
      h2("SN 二次校验（远程验配）"),
      p("在写入新程序前，必须："),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("读取助听器当前 SN")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("与建档时绑定的原始 SN 比对")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("匹配成功才执行写入")] }),
      p("防欺诈：防止程序写入非绑定设备。"),

      h2("一键恢复"),
      p("用户点击后，助听器参数回滚至最近一次专业远程验配完成后的状态。"),

      // 八、技术实现要点
      h1("八、技术实现要点"),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("微信登录：wx.login() 获取 code，换 openid")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("蓝牙连接：wx.createBLEConnection() 连接设备")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("Bin 读取：通过 BLE 特征值读出 32KB bin（0xF8 命令）")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("SN 读取：从 bin 0x1FE0 地址解析序列号")] }),
      new Paragraph({ numbering: { reference: "bullet", level: 0 }, children: [new TextRun("听力图判断：解析 bin 中 0x1DB7 等地址判断是否有听力图数据")] }),

      // 九、开发顺序
      h1("九、开发顺序"),
      makeTable(["序号", "阶段"], [
        ["1", "微信登录 + 页面框架"],
        ["2", "蓝牙扫描 + 连接助听器"],
        ["3", "读 bin 数据（SN、听力图判断）"],
        ["4", "用户信息填写 + 档案存储"],
        ["5", "设备绑定"],
        ["6", "远程验配流程（预留接口）"],
        ["7", "自主验配（EQ 调节、一键恢复）"]
      ], [1200, 7800]),

      pageBreak(),

      // ===================== 文档二：助听器验配小程序实现计划 =====================
      new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "助听器验配小程序实现计划", bold: true, size: 48 })] }),

      h1("项目概述"),
      p("杰理 JL700N 蓝牙助听器的小程序端系统，支持用户首次登录建档、设备绑定、远程验配、自主验配等功能。"),
      makeTable(["属性", "内容"], [
        ["项目类型", "微信小程序（原生框架）"],
        ["技术栈", "微信小程序 + 微信云开发（暂存） + BLE 蓝牙通信"],
        ["服务对象", "助听器用户、验配师"]
      ], [3000, 6000]),

      h1("架构说明"),
      p("原生微信小程序 + 微信云开发（数据暂存）。模块化页面结构，工具函数集中管理，BLE通信封装为独立服务层，API调用统一封装预留接口。"),
      p("Tech Stack: 微信小程序原生框架、微信BLE API、微信云开发（CloudBase）、JavaScript ES6+"),

      h1("文件结构"),
      code("wechat-app/"),
      code("├── project.config.json          # 项目配置"),
      code("├── app.js                       # 小程序入口"),
      code("├── app.json                     # 全局配置"),
      code("├── app.wxss                     # 全局样式"),
      code("├── pages/"),
      code("│   ├── launch/                  # 启动页（登录授权）"),
      code("│   ├── guide/                   # 引导页（选择已/未验配）"),
      code("│   ├── device-scan/             # 设备扫描页"),
      code("│   ├── info-form/               # 信息填写页"),
      code("│   ├── audiogram-upload/        # 听力图上传页（未验配路径）"),
      code("│   ├── device-bind/             # 设备绑定页"),
      code("│   └── home/                    # 主功能页"),
      code("├── services/"),
      code("│   ├── ble-service.js           # BLE 蓝牙通信服务"),
      code("│   ├── bin-parser.js             # Bin 数据解析"),
      code("│   └── api-service.js            # API 调用（预留）"),
      code("├── utils/"),
      code("│   ├── constants.js              # 常量定义"),
      code("│   ├── storage.js                # 本地存储封装"),
      code("│   └── check-update.js           # 验配状态检查"),
      code("└── cloud/                        # 云开发暂存"),

      // Task 列表
      pageBreak(),
      h1("Task 1: 项目框架搭建"),
      p("Files: project.config.json, app.js, app.json, app.wxss"),
      p("Step 1: 创建项目目录结构"),
      code("mkdir -p wechat-app/pages/{launch,guide,device-scan,info-form,audiogram-upload,device-bind,home}"),
      code("mkdir -p wechat-app/{services,utils,cloud}"),
      p("Step 2-6: 创建配置文件和入口文件（详见 MD 原文）"),

      h1("Task 2: 启动页（微信登录授权）"),
      p("Files: pages/launch/launch.{js,json,wxml,wxss}"),
      p("功能：微信一键登录，暂不登录入口，云开发登录调用，预留接口降级处理"),


      h1("Task 3: 引导页（选择已/未验配）"),
      p("Files: pages/guide/guide.{js,json,wxml,wxss}"),
      p("功能：已验配/未验配路径分流，引导提示"),


      h1("Task 4: 工具模块（常量、BLE服务、Bin解析器）"),
      p("Files: utils/constants.js, services/ble-service.js, services/bin-parser.js"),
      p("constants: BLE UUID、地址映射、HAP模式、命令码、存储Key"),
      p("ble-service: 蓝牙适配器、搜索、连接、读写、通知、断连封装"),
      p("bin-parser: SN读取、型号读取、听力图判断、音量配置解析"),


      h1("Task 5: 设备扫描页（蓝牙扫描连接）"),
      p("Files: pages/device-scan/device-scan.{js,json,wxml,wxss}, services/api-service.js"),
      p("功能：蓝牙扫描设备列表，连接读取SN，根据hasAudiogram分流已/未验配路径"),


      h1("Task 6: 信息填写页（用户信息录入）"),
      p("Files: pages/info-form/info-form.{js,json,wxml,wxss}"),
      p("功能：姓名/电话/门店录入，SN显示与验配状态标识，API绑定调用"),


      h1("Task 7: 听力图上传页（未验配路径）"),
      p("Files: pages/audiogram-upload/audiogram-upload.{js,json,wxml,wxss}"),
      p("功能：图片选择/拍照，Cloud存储上传，API保存路径，跳转设备扫描"),


      h1("Task 8: 设备绑定页（SN绑定确认）"),
      p("Files: pages/device-bind/device-bind.{js,json,wxml,wxss}"),
      p("功能：绑定成功展示，设备信息卡片，用户信息卡片，进入首页入口"),


      h1("Task 9: 主功能页（首页）"),
      p("Files: pages/home/home.{js,json,wxml,wxss}"),
      p("功能：用户问候、设备状态卡、远程验配入口、自主验配入口、个人信息入口、设备管理入口"),

      pageBreak(),

      h1("实施自查清单"),
      makeTable(["任务", "页面/模块", "状态"], [
        ["Task 1", "项目框架", "已完成"],
        ["Task 2", "启动页", "已完成"],
        ["Task 3", "引导页", "已完成"],
        ["Task 4", "工具模块", "已完成"],
        ["Task 5", "设备扫描页", "已完成"],
        ["Task 6", "信息填写页", "已完成"],
        ["Task 7", "听力图上传页", "已完成"],
        ["Task 8", "设备绑定页", "已完成"],
        ["Task 9", "主功能页", "已完成"]
      ], [1500, 3000, 4500]),

      h1("待实现功能"),
      makeTable(["功能", "说明", "优先级"], [
        ["远程验配页", "唯一码生成、等待验配师连接", "P1"],
        ["自主验配页", "EQ调节、一键恢复", "P1"],
        ["个人信息页", "查看/修改个人信息", "P2"],
        ["设备管理页", "解绑/切换设备", "P2"],
        ["服务器对接", "实现API接口替换预留", "P1"]
      ], [2500, 4000, 1500]),

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/d/助听器验配小程序文档/助听器验配小程序文档.docx", buffer);
  console.log("Done!");
});
